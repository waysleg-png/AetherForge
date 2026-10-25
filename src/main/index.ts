import {
  app, BrowserWindow, crashReporter, dialog, net, powerMonitor, protocol, ipcMain,
  shell,
} from "electron";
import si from "systeminformation";
import updater from "electron-updater";
import i18n from "i18next";
import path from "node:path";
import url from "node:url";
import os from "node:os";
import fs from "node:fs/promises";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { electronApp, optimizer } from "@electron-toolkit/utils";
import {
  logger, clearGamesPlaytime, Lock, PowerSaveBlockerManager, DownloadOrchestrator, SSEClient, emulators,
} from "@main/services";

import { WindowManager } from "./services/window-manager";
import resources from "@locales";
import { TorrentService } from "./services/torrent-service";
import { DownloadManager } from "./services/download/download-manager";
import { db, gamesSublevel, levelKeys } from "./level";
import { GameShop, UserPreferences } from "@types";
import { launchGame, openClassicsGame } from "./helpers";
import { refreshPortableShortcutLauncher } from "./helpers/shortcut-launch";
import { lookupCachedPlatform } from "./events/library/get-library";
import { loadState } from "./main";
import {
  closeSteamOpenIdWindow, notifySteamConnectError, notifySteamConnected,
} from "./services/steam-integration/steam-store-session";
import {
  completeSteamOpenIdConnection, parseSteamOpenIdReturn,
} from "./services/steam-integration/steam-openid-return";
import { steamSyncOrchestrator } from "./services/steam-integration/steam-sync-orchestrator";
import {
  initializeEpicIntegration, shutdownEpicIntegration, suspendEpicPlaytime, resumeEpicPlaytime,
} from "./services/epic";

const execAsync = promisify(exec);
app.disableHardwareAcceleration();
crashReporter.start({ uploadToServer: false });

const { autoUpdater } = updater;
autoUpdater.setFeedURL({ provider: "github", owner: "waysleg-png", repo: "AetherForge" });
autoUpdater.logger = logger;

// Фикс: принудительно закрываем второй экземпляр, чтобы не висел в фоне
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  app.exit(0);
}

if (process.platform === "linux") app.commandLine.appendSwitch("ozone-platform-hint", "auto");

i18n.init({ resources, lng: "en", fallbackLng: "en", interpolation: { escapeValue: false } });

const PROTOCOL = "hydralauncher";
protocol.registerSchemesAsPrivileged([
  { scheme: "local", privileges: { supportFetchAPI: true, corsEnabled: true, stream: true } },
  { scheme: "gradient", privileges: { supportFetchAPI: true, corsEnabled: true } },
]);

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL);
}

const initializeApp = async () => {
  refreshPortableShortcutLauncher();
  // Небольшая задержка, чтобы Windows успела освободить ресурсы
  await new Promise(resolve => setTimeout(resolve, 100));

  electronApp.setAppUserModelId("gg.hydralauncher.hydra");

  protocol.handle("local", (request) => {
    const filePath = request.url.slice("local:".length);
    return net.fetch(url.pathToFileURL(decodeURI(filePath)).toString());
  });

  protocol.handle("gradient", (request) => {
    const gradientCss = decodeURIComponent(request.url.slice("gradient:".length));
    let direction = "45deg", color1 = "#4a90e2", color2 = "#7b68ee";
    if (gradientCss.startsWith("linear-gradient(") && gradientCss.endsWith(")")) {
      const content = gradientCss.slice(16, -1);
      const parts = content.split(",").map((part) => part.trim());
      if (parts.length >= 3) { direction = parts[0]; color1 = parts[1]; color2 = parts[2]; }
    }
    let x1 = "0%", y1 = "0%", x2 = "100%", y2 = "100%";
    if (direction === "to right") y2 = "0%";
    else if (direction === "to bottom") x2 = "0%";
    else if (direction === "45deg") { y1 = "100%"; y2 = "0%"; }
    else if (direction === "225deg") { x1 = "100%"; x2 = "0%"; }
    else if (direction === "315deg") { x1 = "100%"; y1 = "100%"; x2 = "0%"; y2 = "0%"; }

    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><defs><linearGradient id="grad" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0%" style="stop-color:${color1};stop-opacity:1" /><stop offset="100%" style="stop-color:${color2};stop-opacity:1" /></linearGradient></defs><rect width="100%" height="100%" fill="url(#grad)" /></svg>`;
    return new Response(svgContent, { headers: { "Content-Type": "image/svg+xml" } });
  });

  try { await loadState(); } catch (error) { logger.error("Failed to load app state", error); }
  await initializeEpicIntegration().catch(() => {});

  powerMonitor.on("suspend", suspendEpicPlaytime);
  powerMonitor.on("resume", () => {
    resumeEpicPlaytime();
    SSEClient.reconnectNow();
    DownloadOrchestrator.onNetworkStatusChanged({ online: true, switched: true });
  });

  const language = await db.get<string, string>(levelKeys.language, { valueEncoding: "utf8" }).catch(() => "en");
  if (language) i18n.changeLanguage(language);

  const deepLinkArg = process.argv.find((arg) => arg.startsWith("hydralauncher://"));
  if (!process.argv?.includes("--hidden") && !deepLinkArg?.startsWith("hydralauncher://run")) {
    WindowManager.createMainWindow({ forceBigPicture: false });
  }
  WindowManager.createSystemTray(language || "en");
  if (deepLinkArg) handleDeepLinkPath(deepLinkArg);
};

app.on("browser-window-created", (_, window) => optimizer.watchWindowShortcuts(window));
app.on("child-process-gone", (_event, details) => logger.error("Child process gone", details));
app.on("render-process-gone", (_event, _webContents, details) => logger.error("Render process gone", details));

const handleRunGame = async (shop: GameShop, objectId: string) => {
  const gameKey = levelKeys.game(shop, objectId);
  const game = await gamesSublevel.get(gameKey);
  if (!game) return;
  const userPreferences = await db.get<string, UserPreferences | null>(levelKeys.userPreferences, { valueEncoding: "json" });
  if (!userPreferences?.hideToTrayOnGameStart) WindowManager.createMainWindow();
  if (shop === "launchbox") { await openClassicsGame(shop, objectId); return; }
  if (!game.executablePath) return;
  await launchGame({ shop, objectId, executablePath: game.executablePath, launchOptions: game.launchOptions });
};

const handleDeepLinkPath = (uri?: string) => {
  if (!uri) return;
  try {
    const url = new URL(uri);
    if (url.host === "run") {
      const shop = url.searchParams.get("shop") as GameShop | null;
      const objectId = url.searchParams.get("objectId");
      if (shop && objectId) void handleRunGame(shop, objectId).catch(() => WindowManager.createMainWindow());
      return;
    }
  } catch (error) {}
};

app.on("second-instance", (_event, commandLine) => {
  const deepLink = commandLine.find((arg) => arg.startsWith("hydralauncher://"));
  if (!deepLink?.startsWith("hydralauncher://run")) {
    if (WindowManager.mainWindow) {
      if (WindowManager.mainWindow.isMinimized()) WindowManager.mainWindow.restore();
      WindowManager.mainWindow.focus();
    } else { WindowManager.createMainWindow({ forceBigPicture: false }); }
  }
  handleDeepLinkPath(deepLink);
});

app.on("open-url", (_event, url) => handleDeepLinkPath(url));
app.on("window-all-closed", () => WindowManager.clearMainWindow());

let canAppBeClosed = false;
app.on("before-quit", async (e) => {
  (app as any).isQuitting = true;
  if (!canAppBeClosed) {
    e.preventDefault();
    await shutdownEpicIntegration().catch(() => {});
    DownloadOrchestrator.cancelPendingDebridPreparations();
    PowerSaveBlockerManager.reset();
    await DownloadManager.pauseDownload().catch(() => {});
    await Promise.allSettled([
      Lock.releaseLock(), TorrentService.shutdown(), clearGamesPlaytime(), emulators.stopAllEmulatorSouvenirCaptureSessions(),
    ]);
    canAppBeClosed = true;
    app.quit();
  }
});

app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) WindowManager.createMainWindow(); });

async function getDirSize(dirPath: string): Promise<number> {
  let size = 0;
  try {
    const files = await fs.readdir(dirPath, { withFileTypes: true });
    for (const file of files) {
      const filePath = path.join(dirPath, file.name);
      if (file.isFile()) {
        try { const stats = await fs.stat(filePath); size += stats.size; } catch {}
      } else if (file.isDirectory()) { size += await getDirSize(filePath); }
    }
  } catch {}
  return size;
}

async function clearDirectory(dirPath: string): Promise<number> {
  let freedBytes = 0;
  try {
    const files = await fs.readdir(dirPath, { withFileTypes: true });
    for (const file of files) {
      const filePath = path.join(dirPath, file.name);
      try {
        if (file.isFile()) {
          const stats = await fs.stat(filePath);
          freedBytes += stats.size;
          await fs.unlink(filePath);
        } else if (file.isDirectory()) {
          freedBytes += await getDirSize(filePath);
          await fs.rm(filePath, { recursive: true, force: true });
        }
      } catch {}
    }
  } catch {}
  return freedBytes;
}

ipcMain.handle("set-auto-launch", (_event, enabled: boolean) => {
  try { app.setLoginItemSettings({ openAtLogin: enabled, path: app.getPath("exe"), args: ["--hidden"] }); return true; } catch { return false; }
});

ipcMain.handle("get-auto-launch", () => {
  return app.getLoginItemSettings().openAtLogin;
});

// --- ВЕРСИЯ ПРИЛОЖЕНИЯ (ДЛЯ UPDATE CHECKER) ---
ipcMain.handle("getVersion", () => {
  return app.getVersion();
});

ipcMain.handle("sysopt:system-stats", async () => {
  try {
    const cpuData = await si.currentLoad();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const ramPercent = Math.round(((totalMem - freeMem) / totalMem) * 100);
    const fsData = await si.fsSize();
    const systemDrive = fsData.find((drive) => drive.mount === "C:") || fsData[0];
    const diskPercent = systemDrive ? Math.round(systemDrive.use) : 0;
    return { cpu: Math.round(cpuData.currentLoad), ram: ramPercent, disk: diskPercent };
  } catch { return { cpu: 0, ram: 0, disk: 0 }; }
});

const REGISTRY_PATHS = [
  'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
  'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run',
  'HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Run'
];

ipcMain.handle("get:startup-apps", async () => {
  const apps: any[] = []; const foundNames = new Set();
  for (const regPath of REGISTRY_PATHS) {
    try {
      const { stdout } = await execAsync(`reg query "${regPath}"`);
      const lines = stdout.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && trimmed.includes('REG_SZ')) {
          const match = trimmed.match(/^(.*?)\s{2,}REG_SZ\s{2,}(.*)$/);
          if (match) {
            const name = match[1].trim(); const command = match[2].trim();
            if (!foundNames.has(name.toLowerCase())) {
              foundNames.add(name.toLowerCase());
              apps.push({ name, command, enabled: true, registryPath: regPath });
            }
          }
        }
      }
    } catch (e) {}
  }
  return apps;
});

ipcMain.handle("toggle:startup-app", async (_event, name: string, command: string, enabled: boolean) => {
  try {
    if (enabled) {
      await execAsync(`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${name}" /t REG_SZ /d "${command}" /f`);
    } else {
      for (const regPath of REGISTRY_PATHS) { try { await execAsync(`reg delete "${regPath}" /v "${name}" /f`); } catch (e) {} }
    }
    return { success: true };
  } catch { return { success: false }; }
});

ipcMain.handle("sysopt:network-stats", async () => {
  try {
    const netStats = await si.networkStats();
    let rx = 0, tx = 0;
    for (const net of netStats) {
      if (!net.iface.includes('Loopback') && net.rx_sec !== null && net.tx_sec !== null) { rx += net.rx_sec; tx += net.tx_sec; }
    }
    const nets = os.networkInterfaces();
    let ip = "Не подключено";
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === 'IPv4' && !net.internal) { ip = net.address; break; }
      }
      if (ip !== "Не подключено") break;
    }
    let ping = 0;
    try {
      const { stdout } = await execAsync('ping -n 1 1.1.1.1');
      const match = stdout.match(/(?:time|время)[=<]\s*([0-9]+)/i);
      if (match && match[1]) ping = parseInt(match[1], 10);
    } catch {}
    return { rx, tx, ip, ping };
  } catch { return { rx: 0, tx: 0, ip: "Ошибка", ping: 0 }; }
});

ipcMain.handle("sysopt:boost-step1", async () => {
  try {
    await execAsync('powercfg /setactive 8e5e7fda-e8bf-4a96-9a85-a6e23a8c635c').catch(() => {});
    await execAsync('ipconfig /flushdns').catch(() => {});
    return { success: true };
  } catch { return { success: false }; }
});

ipcMain.handle("sysopt:boost-step2", async () => {
  try {
    let freedBytes = 0;
    const dirsToClean = [
      os.tmpdir(),
      path.join(process.env.SystemRoot || "C:\\Windows", "Prefetch"),
      path.join(process.env.SystemRoot || "C:\\Windows", "Logs"),
    ];
    
    for (const dir of dirsToClean) {
      freedBytes += await clearDirectory(dir);
    }
    return { success: true, freedBytes };
  } catch { return { success: false }; }
});

const PATHS = {
  temp: os.tmpdir(),
  browser: [
    path.join(os.homedir(), "AppData", "Local", "Google", "Chrome", "User Data", "Default", "Cache"),
    path.join(os.homedir(), "AppData", "Local", "Microsoft", "Edge", "User Data", "Default", "Cache")
  ],
  logs: path.join(process.env.SystemRoot || "C:\\Windows", "Logs"),
  update: path.join(process.env.SystemRoot || "C:\\Windows", "SoftwareDistribution", "Download"),
  leftovers: path.join(process.env.SystemRoot || "C:\\Windows", "Prefetch"),
};

ipcMain.handle("sysopt:cleanup-get-sizes", async () => {
  try {
    const tempBytes = await getDirSize(PATHS.temp);
    let browserBytes = 0;
    for (const p of PATHS.browser) browserBytes += await getDirSize(p);
    
    let recycleBytes = 0;
    try {
      const { stdout } = await execAsync('powershell.exe -NoProfile -Command "(New-Object -ComObject Shell.Application).NameSpace(0xA).Items() | Measure-Object -Property Size -Sum | Select-Object -ExpandProperty Sum"');
      recycleBytes = parseInt(stdout.trim(), 10) || 0;
    } catch {}

    const logsBytes = await getDirSize(PATHS.logs);
    const updateBytes = await getDirSize(PATHS.update);
    const leftoversBytes = await getDirSize(PATHS.leftovers);

    return { temp: tempBytes, browser: browserBytes, recycle: recycleBytes, logs: logsBytes, update: updateBytes, leftovers: leftoversBytes };
  } catch { return { temp: 0, browser: 0, recycle: 0, logs: 0, update: 0, leftovers: 0 }; }
});

ipcMain.handle("sysopt:cleanup-run", async (_event, selectedCategories: string[]) => {
  try {
    let totalFreed = 0;
    const cats = selectedCategories || [];
    
    if (cats.includes("temp")) totalFreed += await clearDirectory(PATHS.temp);
    if (cats.includes("browser")) { for (const p of PATHS.browser) totalFreed += await clearDirectory(p); }
    if (cats.includes("logs")) totalFreed += await clearDirectory(PATHS.logs);
    if (cats.includes("update")) totalFreed += await clearDirectory(PATHS.update);
    if (cats.includes("leftovers")) totalFreed += await clearDirectory(PATHS.leftovers);
    
    if (cats.includes("recycle")) {
      try {
        const { stdout } = await execAsync('powershell.exe -NoProfile -Command "(New-Object -ComObject Shell.Application).NameSpace(0xA).Items() | Measure-Object -Property Size -Sum | Select-Object -ExpandProperty Sum"');
        const size = parseInt(stdout.trim(), 10) || 0;
        await execAsync('powershell.exe -NoProfile -Command "Clear-RecycleBin -Force -ErrorAction SilentlyContinue"');
        totalFreed += size; 
      } catch {}
    }

    return { success: true, freedBytes: totalFreed };
  } catch { return { success: false }; }
});

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.on("download-progress", (progressObj) => {
  WindowManager.mainWindow?.webContents.send("update-progress", {
    percent: Math.round(progressObj.percent),
    bytesPerSecond: progressObj.bytesPerSecond,
    transferred: progressObj.transferred,
    total: progressObj.total,
  });
});

autoUpdater.on("update-downloaded", (info) => {
  WindowManager.mainWindow?.webContents.send("update-downloaded", {
    version: info.version,
  });
});

autoUpdater.on("error", (err) => {
  WindowManager.mainWindow?.webContents.send("update-error", err.message);
  logger.error("Ошибка автообновления:", err);
});

ipcMain.handle("checkForUpdates", async () => {
  try {
    if (!app.isPackaged) {
      return { available: false, message: "В режиме разработки проверка недоступна" };
    }
    
    const result = await autoUpdater.checkForUpdates();
    if (result && result.updateInfo.version !== app.getVersion()) {
      return { available: true, version: result.updateInfo.version };
    }
    return { available: false };
  } catch (e: any) {
    logger.error("Ошибка проверки обновлений:", e);
    return { available: false, error: e.message };
  }
});

ipcMain.handle("restartAndInstallUpdate", () => {
  try {
    autoUpdater.quitAndInstall();
    return true;
  } catch (e) {
    logger.error("Ошибка установки обновления:", e);
    return false;
  }
});

const GAME_MODE_SERVICES = ['Spooler', 'Fax', 'WSearch'];

ipcMain.handle("sysopt:game-mode", async (_event, enable: boolean) => {
  try {
    let results = [];
    for (const service of GAME_MODE_SERVICES) {
      try {
        const command = enable ? `net stop ${service}` : `net start ${service}`;
        const { stdout } = await execAsync(command);
        results.push({ service, success: true });
      } catch (err: any) {
        results.push({ service, success: false, error: err.message });
      }
    }
    
    return { 
      success: true, 
      message: enable ? "Службы остановлены" : "Службы запущены",
      details: results 
    };
  } catch (error) {
    logger.error("Ошибка Игрового режима:", error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle("openExternal", async (_event, url: string) => {
  try {
    if (typeof url !== "string" || !url.startsWith("https://")) {
      logger.warn("Попытка открыть небезопасную ссылку:", url);
      return false;
    }
    await shell.openExternal(url);
    return true;
  } catch (error) {
    logger.error("Ошибка открытия ссылки:", error);
    return false;
  }
});

ipcMain.handle("sysopt:prepare-for-gaming", async () => {
  try {
    let totalFreed = 0;
    const systemRoot = process.env.SystemRoot || "C:\\Windows";
    const programData = process.env.ProgramData || "C:\\ProgramData";
    const localAppData = path.join(os.homedir(), "AppData", "Local");

    const gamingCaches = [
      path.join(systemRoot, "SoftwareDistribution", "Download"),
      path.join(systemRoot, "SoftwareDistribution", "DeliveryOptimization"),
      path.join(programData, "Microsoft", "Windows", "WER", "ReportArchive"),
      path.join(programData, "Microsoft", "Windows", "WER", "ReportQueue"),
      path.join(localAppData, "D3DSCache"),
      path.join(localAppData, "NVIDIA", "DXCache"),
      path.join(localAppData, "NVIDIA", "GLCache"),
      path.join(localAppData, "AMD", "DxCache"),
      path.join(localAppData, "AMD", "VkCache"),
      path.join(localAppData, "Microsoft", "Windows", "Explorer"),
    ];

    for (const cacheDir of gamingCaches) {
      try {
        totalFreed += await clearDirectory(cacheDir);
      } catch {}
    }

    for (const service of ['Spooler', 'Fax', 'WSearch']) {
      try { await execAsync(`net stop ${service}`); } catch {}
    }

    await execAsync('powercfg /setactive 8e5e7fda-e8bf-4a96-9a85-a6e23a8c635c').catch(() => {});
    await execAsync('ipconfig /flushdns').catch(() => {});

    return { success: true, freedBytes: totalFreed };
  } catch (error) {
    logger.error("Ошибка подготовки к игре:", error);
    return { success: false, error: String(error) };
  }
});

app.once("ready", initializeApp);
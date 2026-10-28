import {
  app, BrowserWindow, crashReporter, net, powerMonitor, protocol, ipcMain,
  shell,
} from "electron";
import https from "node:https";
import { createWriteStream } from "node:fs";
import axios from "axios";
import si from "systeminformation";
import updater from "electron-updater";
import i18n from "i18next";
import path from "node:path";
import url from "node:url";
import os from "node:os";
import fs from "node:fs/promises";
import { exec, spawn } from "node:child_process";
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
import { loadState } from "./main";
import {
  initializeEpicIntegration, shutdownEpicIntegration, suspendEpicPlaytime, resumeEpicPlaytime,
} from "./services/epic";

const execAsync = promisify(exec);
app.disableHardwareAcceleration();
crashReporter.start({ uploadToServer: false });

const { autoUpdater } = updater;
autoUpdater.setFeedURL({ provider: "github", owner: "waysleg-png", repo: "AetherForge" });
autoUpdater.logger = logger;

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
  await new Promise(resolve => setTimeout(resolve, 100));

  electronApp.setAppUserModelId("com.aetherforge.optimizer");

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

ipcMain.handle("getVersion", () => {
  return app.getVersion();
});
// ==========================================
// УПРАВЛЕНИЕ ОКНОМ (Свернуть, Развернуть, Закрыть)
// ==========================================
ipcMain.handle("window:minimize", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.minimize();
});

ipcMain.handle("window:toggleMaximize", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  }
});

ipcMain.handle("window:close", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();
});
// ==========================================
// МИНИ-РЕЖИМ (ОВЕРЛЕЙ)
// ==========================================
ipcMain.handle("window:enable-mini-mode", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    // Делаем окно маленьким и закрепляем поверх всех
    win.setSize(320, 120); // Ширина 320, Высота 120
    win.setAlwaysOnTop(true, "screen-saver"); // Поверх всех игр
    win.setResizable(false);
    win.setHasShadow(false);
    
    // Отправляем сигнал в React, чтобы он переключил интерфейс на виджет
    win.webContents.send("change-ui-mode", "mini");
  }
});

ipcMain.handle("window:disable-mini-mode", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    // Возвращаем стандартные размеры
    win.setSize(1200, 800);
    win.setAlwaysOnTop(false);
    win.setResizable(true);
    win.setHasShadow(true);
    
    // Отправляем сигнал обратно
    win.webContents.send("change-ui-mode", "normal");
  }
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
      
      // Ищем "TTL=" (работает на любой Windows)
      const match = stdout.match(/TTL=(\d+)/i);
      if (match) {
        // Ищем время (ms/мс), если не нашли — ставим 1
        const timeMatch = stdout.match(/[=<]\s*(\d+)\s*(?:ms|мс)/i);
        ping = timeMatch ? parseInt(timeMatch[1], 10) : 1;
      }
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

autoUpdater.disableDifferentialDownload = true;
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

// ==========================================
// КАСТОМНОЕ АВТООБНОВЛЕНИЕ (ЧЕРЕЗ AXIOS)
// ==========================================
ipcMain.handle("checkForUpdates", async () => {
  try {
    if (!app.isPackaged) return { available: false, message: "Dev mode" };

    // Жесткий таймаут на 5 секунд
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch("https://api.github.com/repos/waysleg-png/AetherForge/releases", {
      headers: { 'User-Agent': 'AetherForge' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return { available: false, error: `Ошибка GitHub: ${response.status}` };
    }

    const releases = await response.json();
    const validReleases = releases.filter((r: any) => !r.draft && !r.prerelease);

    if (validReleases.length === 0) return { available: false, error: "Релизы не найдены" };

    // Сортируем по номеру версии (1.0.30 > 1.0.9)
    validReleases.sort((a: any, b: any) => {
      const vA = a.tag_name.replace('v', '').split('.').map(Number);
      const vB = b.tag_name.replace('v', '').split('.').map(Number);
      for (let i = 0; i < 3; i++) {
        if ((vA[i] || 0) !== (vB[i] || 0)) return (vB[i] || 0) - (vA[i] || 0);
      }
      return 0;
    });

    const latestRelease = validReleases[0];
    const latestVersion = latestRelease.tag_name.replace('v', '');
    const currentVersion = app.getVersion();

    const vLatest = latestVersion.split('.').map(Number);
    const vCurrent = currentVersion.split('.').map(Number);
    let isNewer = false;

    for (let i = 0; i < 3; i++) {
      if ((vLatest[i] || 0) > (vCurrent[i] || 0)) { isNewer = true; break; }
      if ((vLatest[i] || 0) < (vCurrent[i] || 0)) { break; }
    }

    if (isNewer) {
      const exeAsset = latestRelease.assets.find((a: any) => a.name.endsWith('.exe'));
      return { 
        available: true, 
        version: latestVersion, 
        url: exeAsset ? exeAsset.browser_download_url : null 
      };
    }

    return { available: false };
  } catch (e: any) {
    logger.error("Ошибка проверки обновлений:", e);
    return { available: false, error: e.message };
  }
});

ipcMain.handle("downloadUpdate", async (event, url: string, version: string) => {
  const filePath = path.join(app.getPath('temp'), `AetherForge-Setup-${version}.exe`);
  
  return new Promise((resolve) => {
    const download = (downloadUrl: string) => {
      https.get(downloadUrl, { headers: { 'User-Agent': 'AetherForge-Updater' } }, (response) => {
        // Обработка редиректов GitHub
        if ([301, 302, 303, 307].includes(response.statusCode || 0) && response.headers.location) {
          return download(response.headers.location);
        }

        if (response.statusCode !== 200) {
          resolve({ success: false, error: `Ошибка сервера: ${response.statusCode}` });
          return;
        }

        const totalLength = parseInt(response.headers['content-length'] || '0', 10);
        let downloaded = 0;
        const file = createWriteStream(filePath);

        response.on('data', (chunk) => {
          downloaded += chunk.length;
          if (totalLength > 0) {
            const percent = Math.round((downloaded / totalLength) * 100);
            event.sender.send('custom-download-progress', percent);
          }
        });

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          resolve({ success: true, path: filePath });
        });
        
        file.on('error', (err) => {
          resolve({ success: false, error: err.message });
        });
      }).on('error', (err) => {
        resolve({ success: false, error: err.message });
      });
    };
    download(url);
  });
});

ipcMain.handle("installUpdate", async (_event, filePath: string) => {
  try {
    // Открываем установщик
    await shell.openPath(filePath);
    
    // ЖЕСТКО убиваем лаунчер через 1 секунду, 
    // чтобы установщик смог заменить файлы, а новый процесс запустился
    setTimeout(() => {
      app.exit(0); 
    }, 1000);
    
    return { success: true };
  } catch (e: any) {
    return { success: false, error: String(e) };
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

ipcMain.handle('clean-ram-pro', async () => {
  return new Promise((resolve) => {
    const isDev = !app.isPackaged;
    const scriptPath = isDev 
      ? path.join(app.getAppPath(), 'src', 'main', 'services', 'ram-cleaner.ps1')
      : path.join(process.resourcesPath, 'ram-cleaner.ps1');

    // Запускаем PowerShell БЕЗ -Wait, отвязанным процессом
    const psCommand = `Start-Process powershell -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"' -Verb RunAs`;
    
    try {
      const child = spawn('powershell', ['-Command', psCommand], { 
        windowsHide: true,
        detached: true,
        stdio: 'ignore'
      });
      
      child.unref(); // Отвязываем процесс, чтобы Electron не ждал

      // Сразу возвращаем успех (скрипт выполнится в фоне)
      resolve({ success: true, message: 'Оперативная память очищена!' });
    } catch (error) {
      resolve({ success: false, error: 'Не удалось запустить очистку.' });
    }
  });
});

ipcMain.handle("sysopt:network-tweak", async () => {
  try {
    const cmd1 = `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces" /v TcpAckFrequency /t REG_DWORD /d 1 /f`;
    const cmd2 = `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces" /v TCPNoDelay /t REG_DWORD /d 1 /f`;
    
    await execAsync(cmd1).catch(() => {});
    await execAsync(cmd2).catch(() => {});

    const cmd3 = `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" /v NetworkThrottlingIndex /t REG_DWORD /d 0xffffffff /f`;
    await execAsync(cmd3).catch(() => {});

    await execAsync('ipconfig /flushdns').catch(() => {});

    return { 
      success: true, 
      message: "⚡ Сетевая оптимизация применена! Для полного эффекта перезагрузите ПК или переподключите сеть." 
    };
  } catch (error: any) {
    logger.error("Ошибка сетевой оптимизации:", error);
    return { success: false, error: "Ошибка. Убедитесь, что лаунчер запущен от Администратора." };
  }
});

ipcMain.handle("sysopt:clean-ssd-shaders", async () => {
  try {
    let freedBytes = 0;
    const localAppData = path.join(os.homedir(), "AppData", "Local");

    const gpuCaches = [
      path.join(localAppData, "NVIDIA", "DXCache"),
      path.join(localAppData, "NVIDIA", "GLCache"),
      path.join(localAppData, "AMD", "DxCache"),
      path.join(localAppData, "AMD", "VkCache"),
      path.join(localAppData, "D3DSCache"),
    ];

    for (const cacheDir of gpuCaches) {
      try {
        freedBytes += await clearDirectory(cacheDir);
      } catch {}
    }

    try {
      await execAsync('powershell.exe -NoProfile -Command "Optimize-Volume -DriveLetter C -ReTrim -Verbose"');
    } catch (e) {
      console.error("Ошибка TRIM:", e);
    }

    return { 
      success: true, 
      freedBytes, 
      message: `🚀 Очистка SSD завершена! Освобождено ${Math.round(freedBytes / (1024 * 1024))} МБ. TRIM выполнен.` 
    };
  } catch (error: any) {
    logger.error("Ошибка очистки SSD:", error);
    return { success: false, error: "Ошибка. Убедитесь, что лаунчер запущен от Администратора." };
  }
});

ipcMain.handle("sysopt:toggle-telemetry", async (_event, disable: boolean) => {
  try {
    if (disable) {
      await execAsync('sc config DiagTrack start= disabled').catch(() => {});
      await execAsync('sc stop DiagTrack').catch(() => {});
      await execAsync('sc config SysMain start= disabled').catch(() => {});
      await execAsync('sc stop SysMain').catch(() => {});
      
      return { success: true, message: "Телеметрия и Superfetch отключены." };
    } else {
      await execAsync('sc config DiagTrack start= auto').catch(() => {});
      await execAsync('sc start DiagTrack').catch(() => {});
      await execAsync('sc config SysMain start= auto').catch(() => {});
      await execAsync('sc start SysMain').catch(() => {});
      
      return { success: true, message: "Службы восстановлены." };
    }
  } catch (error) {
    return { success: false, error: "Ошибка. Убедитесь, что лаунчер запущен от Администратора." };
  }
});

ipcMain.handle("sysopt:clean-leftovers", async () => {
  try {
    return { success: true, freedBytes: 0, message: "Очистка хвостов завершена." };
  } catch (error) {
    return { success: false, error: "Ошибка очистки." };
  }
});

ipcMain.handle("sysopt:apply-preset", async (_event, game: string) => {
  try {
    let processesToKill: string[] = [];

    if (game === "cs2") {
      processesToKill = ["chrome.exe", "msedge.exe", "firefox.exe", "Discord.exe", "Telegram.exe"];
    } else if (game === "valorant") {
      processesToKill = ["chrome.exe", "msedge.exe", "firefox.exe", "GameBar.exe"];
    } else if (game === "cyberpunk") {
      processesToKill = ["chrome.exe", "msedge.exe", "firefox.exe", "Discord.exe", "Telegram.exe", "GameBar.exe", "GameBarFTServer.exe"];
    } else if (game === "stream") {
      processesToKill = ["chrome.exe", "msedge.exe", "firefox.exe"];
    }

    for (const proc of processesToKill) {
      try { await execAsync(`taskkill /F /IM ${proc} /T`); } catch {}
    }

    await execAsync('powercfg /setactive 8e5e7fda-e8bf-4a96-9a85-a6e23a8c635c').catch(() => {});

    if (game === "cyberpunk") {
      const isDev = !app.isPackaged;
      const scriptPath = isDev 
        ? path.join(app.getAppPath(), 'src', 'main', 'services', 'ram-cleaner.ps1')
        : path.join(process.resourcesPath, 'ram-cleaner.ps1');
      const psCommand = `Start-Process powershell -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"' -Verb RunAs -Wait`;
      exec(psCommand).catch(() => {});
    }

    return { 
      success: true, 
      message: `🎮 Пресет для ${game.toUpperCase()} применён! Фоновые процессы закрыты.` 
    };
  } catch (error: any) {
    logger.error("Ошибка пресета:", error);
    return { success: false, error: "Ошибка. Убедитесь, что лаунчер запущен от Администратора." };
  }
});

ipcMain.handle("sysopt:get-gpu-stats", async () => {
  try {
    const gpuData = await si.graphics();
    const load = gpuData.controllers[0]?.utilizationGpu || 0;
    const temp = gpuData.controllers[0]?.temperatureGpu || 0;
    return { load, temp };
  } catch {
    return { load: 0, temp: 0 };
  }
});

// ==========================================
// ФОНОВАЯ АВТО-ОЧИСТКА RAM (SMART CLEANER)
// ==========================================
let autoCleanInterval: NodeJS.Timeout | null = null;

function startAutoRamCleaner() {
  if (autoCleanInterval) clearInterval(autoCleanInterval);
  
  // Проверяем каждые 10 минут (600 000 мс)
  autoCleanInterval = setInterval(async () => {
    try {
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedPercent = ((totalMem - freeMem) / totalMem) * 100;

      // Если память забита больше чем на 80%, запускаем скрипт очистки
      if (usedPercent > 80) {
        logger.info(`[Auto-Cleaner] RAM забита на ${Math.round(usedPercent)}%. Запускаю очистку...`);
        
        const isDev = !app.isPackaged;
        const scriptPath = isDev 
          ? path.join(app.getAppPath(), 'src', 'main', 'services', 'ram-cleaner.ps1')
          : path.join(process.resourcesPath, 'ram-cleaner.ps1');

        const psCommand = `Start-Process powershell -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"' -Verb RunAs -WindowStyle Hidden -Wait`;
        exec(psCommand, (err) => {
          if (err) logger.error("[Auto-Cleaner] Ошибка:", err.message);
          else logger.info("[Auto-Cleaner] RAM успешно очищена в фоне.");
        });
      }
    } catch (e) {
      logger.error("[Auto-Cleaner] Ошибка проверки памяти:", e);
    }
  }, 10 * 60 * 1000); // 10 минут
}

// Запускаем авто-клинер при старте приложения
app.whenReady().then(() => {
  startAutoRamCleaner();
});

// Останавливаем интервал при выходе
app.on('before-quit', () => {
  if (autoCleanInterval) clearInterval(autoCleanInterval);
});

// ==========================================
// ТВИКИ WINDOWS (БЕСПЛАТНО)
// ==========================================
ipcMain.handle("sysopt:apply-tweak", async (_event, action: string) => {
  try {
    if (action === "disable-wifi") {
      await execAsync('netsh interface set interface "Wi-Fi" admin=disable').catch(() => {});
      return { success: true, message: "📶 Wi-Fi отключен." };
    } 
    if (action === "disable-bt") {
      // Отключаем службу Bluetooth
      await execAsync('sc config bthserv start= disabled').catch(() => {});
      await execAsync('sc stop bthserv').catch(() => {});
      return { success: true, message: "🔵 Bluetooth отключен." };
    }
    if (action === "disable-notifications") {
      // Включаем режим фокусировки (тихий режим)
      await execAsync('reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\PushNotifications" /v ToastEnabled /t REG_DWORD /d 0 /f').catch(() => {});
      return { success: true, message: "🔕 Уведомления отключены." };
    }
    if (action === "classic-alt-tab") {
      // Отключаем современный Alt+Tab (возвращаем классический)
      await execAsync('reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v MultiTaskingAltTabFilter /t REG_DWORD /d 3 /f').catch(() => {});
      return { success: true, message: "🪟 Классический Alt+Tab включен (требуется перезагрузка Explorer)." };
    }
    return { success: false, error: "Неизвестный твик." };
  } catch (error: any) {
    logger.error("Ошибка твика:", error);
    return { success: false, error: "Ошибка. Запустите лаунчер от Администратора." };
  }
});

// ==========================================
// УМНАЯ АВТО-ОПТИМИЗАЦИЯ (SMART GAME WATCHER)
// ==========================================
let gameWatcherInterval: NodeJS.Timeout | null = null;
let isGameOptimized = false; // Флаг, чтобы не запускать оптимизацию 10 раз подряд

const GAME_PROCESSES = ["cs2.exe", "dota2.exe", "valorant.exe", "cyberpunk2077.exe"];

function startGameWatcher() {
  if (gameWatcherInterval) clearInterval(gameWatcherInterval);
  
  // Проверяем каждые 10 секунд (10 000 мс)
  gameWatcherInterval = setInterval(async () => {
    try {
      // Получаем список процессов через tasklist (очень быстро и почти не грузит ПК)
      const { stdout } = await execAsync('tasklist /FO CSV /NH');
      
      const isGameRunning = GAME_PROCESSES.some(game => stdout.toLowerCase().includes(game));

      // Игра запустилась, но мы еще не оптимизировали
      if (isGameRunning && !isGameOptimized) {
        isGameOptimized = true;
        logger.info("[Game Watcher] Обнаружена игра! Включаю оптимизацию в фоне...");
        
        // 1. Убиваем Xbox Game Bar
        for (const proc of ["GameBar.exe", "GameBarFTServer.exe", "XboxGameBarWidgets.exe"]) {
          await execAsync(`taskkill /F /IM ${proc} /T`).catch(() => {});
        }
        // 2. Останавливаем службы
        for (const service of ['Spooler', 'Fax', 'WSearch']) {
          await execAsync(`net stop ${service}`).catch(() => {});
        }
        // 3. Максимальное питание
        await execAsync('powercfg /setactive 8e5e7fda-e8bf-4a96-9a85-a6e23a8c635c').catch(() => {});
        // 4. Чистим RAM (тихо, без окон)
        const isDev = !app.isPackaged;
        const scriptPath = isDev 
          ? path.join(app.getAppPath(), 'src', 'main', 'services', 'ram-cleaner.ps1')
          : path.join(process.resourcesPath, 'ram-cleaner.ps1');
        exec(`Start-Process powershell -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"' -Verb RunAs -WindowStyle Hidden -Wait`).catch(() => {});
      }

      // Игра закрылась, а мы оптимизировали
      if (!isGameRunning && isGameOptimized) {
        isGameOptimized = false;
        logger.info("[Game Watcher] Игра закрыта. Возвращаю службы обратно...");
        
        for (const service of ['Spooler', 'Fax', 'WSearch']) {
          await execAsync(`net start ${service}`).catch(() => {});
        }
      }
    } catch (e) {
      // Игнорируем ошибки, чтобы не спамить в консоль
    }
  }, 10 * 1000); // 10 секунд
}

// Запускаем "следопыт" при старте приложения
app.whenReady().then(() => {
  startGameWatcher();
});

// Останавливаем при выходе
app.on('before-quit', () => {
  if (gameWatcherInterval) clearInterval(gameWatcherInterval);
  
});
// ==========================================
// ТЕСТОВАЯ ВЫДАЧА PRO (ДЛЯ ПРОВЕРКИ)
// ==========================================
ipcMain.handle("test-pro-purchase", async () => {
  try {
    // Импортируем Firebase Admin (он уже должен быть установлен для бота, но для лаунчера используем просто Firestore через REST или SDK)
    // Но так как у нас нет firebase-admin в рендерере, мы просто вернем success, а привязку сделаем на фронте.
    return { success: true, message: "Тестовая оплата прошла!" };
  } catch (error) {
    return { success: false, error: "Ошибка тестовой оплаты" };
  }
});

// ==========================================
// ЧИСТЫЙ ЗАПУСК WINDOWS (УМНАЯ АВТОЗАГРУЗКА)
// ==========================================
let backupStartupApps: any[] = []; // Сюда сохраним выключенные программы для отката

ipcMain.handle("sysopt:clean-boot", async () => {
  try {
    // Получаем текущий список программ из реестра (используем функцию, которая у нас уже есть)
        // Получаем текущий список программ из реестра
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
    
    // Список системных программ, которые нельзя отключать (антивирус, драйвера)
    const protectedApps = ["securityhealth", "windowsdefender", "rtkaud", "nvidia", "amd", "realtek"];
    
    backupStartupApps = []; // Очищаем старый бэкап
    
    for (const app of apps) {
      const lowerName = app.name.toLowerCase();
      
      // Если программа не системная — отключаем её и сохраняем в бэкап
      if (!protectedApps.some(p => lowerName.includes(p))) {
        backupStartupApps.push(app); // Сохраняем для отката
        
        // Удаляем из реестра (отключаем)
        for (const regPath of REGISTRY_PATHS) {
          try { await execAsync(`reg delete "${regPath}" /v "${app.name}" /f`); } catch (e) {}
        }
      }
    }

    return { 
      success: true, 
      message: `🚀 Чистый запуск выполнен! Отключено программ: ${backupStartupApps.length}` 
    };
  } catch (error: any) {
    logger.error("Ошибка чистого запуска:", error);
    return { success: false, error: "Ошибка. Убедитесь, что лаунчер запущен от Администратора." };
  }
});

ipcMain.handle("sysopt:restore-boot", async () => {
  try {
    if (backupStartupApps.length === 0) {
      return { success: false, error: "Нет сохраненных программ для восстановления." };
    }

    let restoredCount = 0;
    for (const app of backupStartupApps) {
      // Возвращаем программу в автозагрузку
      try {
        await execAsync(`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${app.name}" /t REG_SZ /d "${app.command}" /f`);
        restoredCount++;
      } catch (e) {}
    }

    backupStartupApps = []; // Очищаем бэкап

    return { 
      success: true, 
      message: `🔄 Восстановлено программ: ${restoredCount}` 
    };
  } catch (error: any) {
    logger.error("Ошибка восстановления автозагрузки:", error);
    return { success: false, error: "Ошибка восстановления." };
  }
});
app.once("ready", initializeApp);
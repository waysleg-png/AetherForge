import { db, gamesSublevel, levelKeys } from "@main/level";
import icon from "@resources/icon.png?asset";
import trayIcon from "@resources/tray-icon.png?asset";
import type { UserPreferences } from "@types";
import {
  BrowserWindow,
  Menu,
  Tray,
  app,
  nativeImage,
  nativeTheme,
  ipcMain,
} from "electron";
import path from "node:path";
import fs from "node:fs";
import http from "node:http";

interface CreateMainWindowOptions {
  forceBigPicture?: boolean;
}

export class WindowManager {
  private static mainWindowInstance: Electron.BrowserWindow | null = null;
  private static tray: Tray | null = null;
  private static localServerUrl: string | null = null;

  public static get mainWindow(): Electron.BrowserWindow | null {
    return this.mainWindowInstance;
  }

  public static clearMainWindow(): void {
    this.mainWindowInstance = null;
  }

  private static readonly DEFAULT_WINDOW_WIDTH = 1200;
  private static readonly DEFAULT_WINDOW_HEIGHT = 860;
  private static readonly MIN_WINDOW_WIDTH = 1024;
  private static readonly MIN_WINDOW_HEIGHT = 600;

  // --- ПОИСК ИКОНКИ (ЖЕСТКИЙ ПУТЬ) ---
  private static getAppIconPath(): string {
    if (app.isPackaged) {
      // Иконка точно лежит в resources/build/icon.ico
      return path.join(process.resourcesPath, "build", "icon.ico");
    }
    return icon;
  }

  private static getInitialConfig(): Electron.BrowserWindowConstructorOptions {
    return {
      width: WindowManager.DEFAULT_WINDOW_WIDTH,
      height: WindowManager.DEFAULT_WINDOW_HEIGHT,
      minWidth: WindowManager.MIN_WINDOW_WIDTH,
      minHeight: WindowManager.MIN_WINDOW_HEIGHT,
      icon: WindowManager.getAppIconPath(),
      trafficLightPosition: { x: 16, y: 16 },
      webPreferences: {
        preload: path.join(__dirname, "../preload/index.mjs"),
        sandbox: false,
        webSecurity: false,
      },
      show: true,
      frame: false,
      backgroundColor: "#05050a",
    };
  }

  public static async loadWindowURL(window: BrowserWindow, hash: string = "") {
    if (app.isPackaged) {
      await window.loadFile(path.join(__dirname, "../renderer/index.html"), { hash });
      return;
    }
    
    if (this.localServerUrl) {
      window.loadURL(`${this.localServerUrl}#/${hash}`);
    } else if (process.env["ELECTRON_RENDERER_URL"]) {
      window.loadURL(`${process.env["ELECTRON_RENDERER_URL"]}#/${hash}`);
    } else {
      window.loadFile(path.join(__dirname, "../renderer/index.html"), { hash });
    }
  }

  private static async loadMainWindowURL(hash: string = "") {
    if (this.mainWindow) {
      await this.loadWindowURL(this.mainWindow, hash);
    }
  }

  public static async createMainWindow(_options?: CreateMainWindowOptions) {
    if (this.mainWindow) return;

    // --- ЗАПУСК ЛОКАЛЬНОГО HTTP-СЕРВЕРА ---
    const server = http.createServer((req, res) => {
      let filePath = path.join(
        __dirname,
        "../renderer",
        req.url === "/" ? "index.html" : req.url!.split("?")[0]
      );

      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(__dirname, "../renderer", "index.html");
      }

      const ext = path.extname(filePath);
      const mimeTypes: Record<string, string> = {
        ".html": "text/html",
        ".js": "text/javascript",
        ".css": "text/css",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".svg": "image/svg+xml",
        ".json": "application/json",
      };

      res.writeHead(200, {
        "Content-Type": mimeTypes[ext] || "application/octet-stream",
      });
      fs.createReadStream(filePath).pipe(res);
    });

    const PORT = 3000;
    try {
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(PORT, "localhost", resolve);
      });
      WindowManager.localServerUrl = `http://localhost:${PORT}`;
    } catch (err) {
      await new Promise<void>((resolve) => server.listen(0, "localhost", resolve));
      const randomPort = (server.address() as any).port;
      WindowManager.localServerUrl = `http://localhost:${randomPort}`;
    }

    const userPreferences = await db
      .get<string, UserPreferences | null>(levelKeys.userPreferences, {
        valueEncoding: "json",
      })
      .catch(() => null);

    const mainWindow = new BrowserWindow(this.getInitialConfig());
    this.mainWindowInstance = mainWindow;

    // --- ПРИНУДИТЕЛЬНО УСТАНАВЛИВАЕМ ИКОНКУ ---
    const iconPath = this.getAppIconPath();
    if (iconPath) {
      try {
        const img = nativeImage.createFromPath(iconPath);
        if (!img.isEmpty()) {
          mainWindow.setIcon(img);
        } else {
          mainWindow.setIcon(iconPath);
        }
      } catch (e) {
        console.warn("Не удалось установить иконку окна:", e);
      }
    }

    // --- ОБРАБОТЧИКИ ДЛЯ КАСТОМНЫХ КНОПОК ОКНА ---
    ipcMain.removeHandler("minimizeMainWindow");
    ipcMain.removeHandler("toggleMaximizeMainWindow");
    ipcMain.removeHandler("closeMainWindow");
    ipcMain.removeHandler("isMainWindowMaximized");

    ipcMain.handle("minimizeMainWindow", () => {
      if (!mainWindow.isDestroyed()) mainWindow.minimize();
    });

    ipcMain.handle("toggleMaximizeMainWindow", () => {
      if (!mainWindow.isDestroyed()) {
        if (mainWindow.isMaximized()) mainWindow.unmaximize();
        else mainWindow.maximize();
      }
    });

    ipcMain.handle("closeMainWindow", () => {
      if (!mainWindow.isDestroyed()) mainWindow.close();
    });

    ipcMain.handle("isMainWindowMaximized", () => {
      return !mainWindow.isDestroyed() && mainWindow.isMaximized();
    });

    this.loadMainWindowURL("");
    mainWindow.removeMenu();

    mainWindow.on("ready-to-show", () => {
      WindowManager.mainWindow?.show();
    });

    // Скрываем в трей при закрытии (крестик)
    mainWindow.on("close", (event) => {
      if (!(app as any).isQuitting) {
        event.preventDefault();
        mainWindow.hide();
      } else {
        this.mainWindowInstance = null;
      }
    });

    // Скрываем в трей при сворачивании (минус)
    mainWindow.on("minimize", (event) => {
      event.preventDefault();
      mainWindow.hide();
    });
  }

  public static sendToAppWindows(channel: string, ...args: unknown[]) {
    const windows = [this.mainWindow];
    for (const window of windows) {
      if (!window || window.isDestroyed()) continue;
      window.webContents.send(channel, ...args);
    }
  }

  public static sendDownloadsUpdated() {
    this.sendToAppWindows("on-downloads-updated");
  }

  // --- ТРЕЙ ---
  public static async createSystemTray(language: string) {
    if (this.tray) return;

    let finalIcon: Electron.NativeImage;
    
    if (app.isPackaged) {
      // Жесткий путь к resources/build/icon.ico (тот же, что и для окна)
      const p1 = path.join(process.resourcesPath, "build", "icon.ico");
      if (fs.existsSync(p1)) {
        finalIcon = nativeImage.createFromPath(p1);
      } else {
        finalIcon = nativeImage.createFromPath(trayIcon);
      }
    } else {
      finalIcon = nativeImage.createFromPath(trayIcon);
    }

    this.tray = new Tray(finalIcon);
    this.tray.setToolTip("AetherForge");
    
    this.tray.addListener("click", () => {
      if (this.mainWindow) {
        this.mainWindow.show();
        this.mainWindow.focus();
      } else {
        this.createMainWindow();
      }
    });

    const contextMenu = Menu.buildFromTemplate([
      {
        label: language === "en" ? "Open AetherForge" : "Открыть AetherForge",
        click: () => {
          if (this.mainWindow) {
            this.mainWindow.show();
            this.mainWindow.focus();
          } else {
            this.createMainWindow();
          }
        },
      },
      { type: "separator" },
      {
        label: language === "en" ? "Quit" : "Выход",
        click: () => {
          (app as any).isQuitting = true;
          app.quit();
        },
      },
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  public static redirect(hash: string) {
    if (!this.mainWindow) this.createMainWindow();
    this.loadMainWindowURL(hash);
    if (this.mainWindow?.isMinimized()) this.mainWindow.restore();
    this.mainWindow?.focus();
  }

  public static async openBigPictureWindow() {}
  public static minimizeAuthWindow() {}
  public static closeAuthWindow() {}
  public static closeFriendsWindow() {}
  public static closeChatWindow() {}
  public static closeGameLauncherWindow() {}
  public static async createGameLauncherWindow(_shop: string, _objectId: string) {}
  public static sendAchievementToFocusedWindow(_pos: any, _ach: any) { return false; }
}
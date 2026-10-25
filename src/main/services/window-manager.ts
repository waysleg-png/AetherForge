import { db, gamesSublevel, levelKeys } from "@main/level";
import icon from "@resources/icon.png?asset";
import trayIconDark from "@resources/tray-icon-dark.png?asset";
import trayIcon from "@resources/tray-icon.png?asset";
import {
  AUTH_WINDOW_CONTENT_HEIGHT,
  AUTH_WINDOW_CONTENT_WIDTH,
  AuthPage,
  CUSTOM_WINDOW_BORDER_WIDTH,
  CUSTOM_WINDOW_TITLE_BAR_HEIGHT,
} from "@shared";
import type {
  AchievementCustomNotificationPosition,
  AchievementNotificationInfo,
  ChatWindowState,
  PendingChatFriend,
  ScreenState,
  UserFriend,
  UserPreferences,
} from "@types";
import {
  BrowserWindow,
  Menu,
  MenuItem,
  MenuItemConstructorOptions,
  Tray,
  WebContentsView,
  app,
  nativeImage,
  nativeTheme,
  screen,
  shell,
  ipcMain,
} from "electron";
import { t } from "i18next";
import { orderBy } from "lodash-es";
import path from "node:path";
import fs from "node:fs";
import http from "node:http";
import UserAgent from "user-agents";

const EMPTY_CHAT_WINDOW_STATE: ChatWindowState = {
  activeFriendId: null,
  openFriendIds: [],
};

const FRIENDS_WINDOW_SHOW_FALLBACK_MS = 400;

interface CreateMainWindowOptions {
  forceBigPicture?: boolean;
}

export class WindowManager {
  private static mainWindowInstance: Electron.BrowserWindow | null = null;
  private static gameLauncherWindowInstance: Electron.BrowserWindow | null = null;
  private static bigPicture: Electron.BrowserWindow | null = null;
  private static friendsWindow: Electron.BrowserWindow | null = null;
  private static markFriendsWindowReady: (() => void) | null = null;
  private static chatWindow: Electron.BrowserWindow | null = null;
  private static pendingChatFriends: PendingChatFriend[] = [];
  private static chatWindowState: ChatWindowState = EMPTY_CHAT_WINDOW_STATE;
  private static authWindow: Electron.BrowserWindow | null = null;
  private static deferredMainMaximize = false;
  
  private static localServerUrl: string | null = null;

  private static readonly editorWindows: Map<string, BrowserWindow> = new Map();

  public static get mainWindow(): Electron.BrowserWindow | null {
    return this.mainWindowInstance;
  }

  public static get gameLauncherWindow(): Electron.BrowserWindow | null {
    return this.gameLauncherWindowInstance;
  }

  public static clearMainWindow(): void {
    this.mainWindowInstance = null;
  }

  private static readonly DEFAULT_WINDOW_WIDTH = 1200;
  private static readonly DEFAULT_WINDOW_HEIGHT = 860;
  private static readonly MIN_WINDOW_WIDTH = 1024;
  private static readonly MIN_WINDOW_HEIGHT = 600;

  private static initialConfigInitializationMainWindow: Electron.BrowserWindowConstructorOptions = {
    width: WindowManager.DEFAULT_WINDOW_WIDTH,
    height: WindowManager.DEFAULT_WINDOW_HEIGHT,
    minWidth: WindowManager.MIN_WINDOW_WIDTH,
    minHeight: WindowManager.MIN_WINDOW_HEIGHT,
    icon,
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

  public static async loadWindowURL(window: BrowserWindow, hash: string = "") {
    if (this.localServerUrl) {
      window.loadURL(`${this.localServerUrl}#/${hash}`);
    } else if (process.env["ELECTRON_RENDERER_URL"]) {
      window.loadURL(`${process.env["ELECTRON_RENDERER_URL"]}#/${hash}`);
    } else {
      window.loadFile(path.join(__dirname, "../renderer/index.html"), {
        hash,
      });
    }
  }

  private static async loadMainWindowURL(hash: string = "") {
    if (this.mainWindow) {
      await this.loadWindowURL(this.mainWindow, hash);
    }
  }

  public static async createMainWindow(options?: CreateMainWindowOptions) {
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

    const mainWindow = new BrowserWindow(
      this.initialConfigInitializationMainWindow
    );
    this.mainWindowInstance = mainWindow;

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
    const windows = [this.mainWindow, this.bigPicture, this.friendsWindow, this.chatWindow];
    for (const window of windows) {
      if (!window || window.isDestroyed()) continue;
      window.webContents.send(channel, ...args);
    }
  }

  public static sendDownloadsUpdated() {
    this.sendToAppWindows("on-downloads-updated");
  }

  public static async createSystemTray(language: string) {
    let tray: Tray;
    if (process.platform === "win32") {
      tray = new Tray(nativeTheme.shouldUseDarkColorsForSystemIntegratedUI ? trayIcon : trayIconDark);
    } else {
      tray = new Tray(trayIcon);
    }
    tray.setToolTip("AetherForge");
    tray.addListener("click", () => {
      if (this.mainWindow) {
        this.mainWindow.show(); // Показываем окно, если оно скрыто
        this.mainWindow.focus();
      } else {
        this.createMainWindow();
      }
    });
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
  public static async createGameLauncherWindow(shop: string, objectId: string) {}
  public static sendAchievementToFocusedWindow(pos: any, ach: any) { return false; }
}
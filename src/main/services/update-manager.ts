import updater, { UpdateInfo } from "electron-updater";
import { logger } from "@main/services"; // <--- УБРАЛИ WindowManager
import { AppUpdaterEvent, UserPreferences } from "@types";
import { app, BrowserWindow } from "electron"; // <--- ДОБАВИЛИ BrowserWindow
import { publishNotificationUpdateReadyToInstall } from "@main/services/notifications";
import { db, levelKeys } from "@main/level";

const { autoUpdater } = updater;
const sendEventsForDebug = false;

// Вспомогательная функция для отправки во все окна
const sendToAllWindows = (channel: string, ...args: any[]) => {
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, ...args);
    }
  });
};

export class UpdateManager {
  private static hasNotified = false;
  private static newVersion = "";

  private static mockValuesForDebug() {
    this.sendEvent({ type: "update-available", info: { version: "3.3.1" } });
    this.sendEvent({ type: "update-downloaded" });
  }

  private static sendEvent(event: AppUpdaterEvent) {
    // ЗАМЕНИЛИ WindowManager НА sendToAllWindows
    sendToAllWindows("autoUpdaterEvent", event);
  }

  private static async isAutoInstallEnabled() {
    if (process.platform === "darwin") return false;
    if (process.platform === "win32") {
      return process.env.PORTABLE_EXECUTABLE_FILE == null;
    }

    if (process.platform === "linux") {
      const userPreferences = await db.get<string, UserPreferences | null>(
        levelKeys.userPreferences,
        {
          valueEncoding: "json",
        }
      );

      return userPreferences?.enableAutoInstall === true;
    }

    return false;
  }

  public static async checkForUpdates() {
    autoUpdater
      .removeAllListeners()
      .on("update-available", (info: UpdateInfo) => {
        this.sendEvent({ type: "update-available", info });
        this.newVersion = info.version;
      })
      .on("update-downloaded", () => {
        this.sendEvent({ type: "update-downloaded" });

        if (!this.hasNotified) {
          this.hasNotified = true;
          publishNotificationUpdateReadyToInstall(this.newVersion);
        }
      });

    const isAutoInstallAvailable = await this.isAutoInstallEnabled();

    if (app.isPackaged) {
      autoUpdater.autoDownload = isAutoInstallAvailable;
      autoUpdater.checkForUpdates().then((result) => {
        logger.log(`Check for updates result: ${result}`);
      });
    } else if (sendEventsForDebug) {
      this.mockValuesForDebug();
    }

    return isAutoInstallAvailable;
  }
}
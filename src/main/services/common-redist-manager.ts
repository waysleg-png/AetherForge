import { commonRedistPath } from "@main/constants";
import axios from "axios";
import fs from "node:fs";
import cp from "node:child_process";
import path from "node:path";
import { logger } from "./logger";
import { BrowserWindow } from "electron";
import { SystemPath } from "./system-path";
import { db, levelKeys } from "@main/level";

// Вспомогательная функция для отправки сообщений в окна
const sendToAllWindows = (channel: string, ...args: any[]) => {
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, ...args);
    }
  });
};

interface RedistCheck {
  name: string;
  check: () => boolean;
}

export class CommonRedistManager {
  private static readonly redistributables = [
    "dotNetFx40_Full_setup.exe",
    "directx_Jun2010_redist.exe",
    "oalinst.exe",
    "install.bat",
    "xnafx40_redist.msi",
    "VisualCppRedist_AIO_x86_x64.exe",
  ];
  private static readonly installationTimeout = 1000 * 60 * 5; // 5 minutes
  private static readonly installationLog = path.join(
    SystemPath.getPath("temp"),
    "common_redist_install.log"
  );

  private static readonly system32Path = process.env.SystemRoot
    ? path.join(process.env.SystemRoot, "System32")
    : "C:\\Windows\\System32";

  private static readonly systemChecks: RedistCheck[] = [
    {
      name: "Visual C++ Runtime",
      check: () => {
        const vcRuntime140 = path.join(
          CommonRedistManager.system32Path,
          "vcruntime140.dll"
        );
        const msvcp140 = path.join(
          CommonRedistManager.system32Path,
          "msvcp140.dll"
        );
        return fs.existsSync(vcRuntime140) && fs.existsSync(msvcp140);
      },
    },
    {
      name: "DirectX June 2010",
      check: () => {
        const d3dx9_43 = path.join(
          CommonRedistManager.system32Path,
          "d3dx9_43.dll"
        );
        return fs.existsSync(d3dx9_43);
      },
    },
    {
      name: "OpenAL",
      check: () => {
        const openAL = path.join(
          CommonRedistManager.system32Path,
          "OpenAL32.dll"
        );
        return fs.existsSync(openAL);
      },
    },
    {
      name: ".NET Framework 4.0",
      check: () => {
        const dotNetPath = path.join(
          process.env.SystemRoot || "C:\\Windows",
          "Microsoft.NET",
          "Framework",
          "v4.0.30319",
          "clr.dll"
        );
        return fs.existsSync(dotNetPath);
      },
    },
    {
      name: "XNA Framework 4.0",
      check: () => {
        const windowsDir = process.env.SystemRoot || "C:\\Windows";
        const xnaGacPath = path.join(
          windowsDir,
          "Microsoft.NET",
          "assembly",
          "GAC_32",
          "Microsoft.Xna.Framework"
        );
        const xnaGacPath64 = path.join(
          windowsDir,
          "Microsoft.NET",
          "assembly",
          "GAC_MSIL",
          "Microsoft.Xna.Framework"
        );
        return fs.existsSync(xnaGacPath) || fs.existsSync(xnaGacPath64);
      },
    },
  ];

  public static async installCommonRedist() {
    const abortController = new AbortController();
    const timeout = setTimeout(() => {
      abortController.abort();
      logger.error("Installation timed out");

      // Заменен WindowManager на sendToAllWindows
      sendToAllWindows("common-redist-progress", {
        log: "Installation timed out",
        complete: false,
      });
    }, this.installationTimeout);

    const installationCompleteMessage = "Installation complete";

    if (!fs.existsSync(this.installationLog)) {
      await fs.promises.writeFile(this.installationLog, "");
    }

    fs.watch(this.installationLog, { signal: abortController.signal }, () => {
      fs.readFile(this.installationLog, "utf-8", (err, data) => {
        if (err) return logger.error("Error reading log file:", err);

        logger.log("Redist log file updated:", data);

        const tail = data.split("\n").at(-2)?.trim();

        if (tail?.includes(installationCompleteMessage)) {
          clearTimeout(timeout);
          if (!abortController.signal.aborted) {
            abortController.abort();
          }
        }

        // Заменен WindowManager на sendToAllWindows
        sendToAllWindows("common-redist-progress", {
          log: tail,
          complete: tail?.includes(installationCompleteMessage),
        });
      });
    });

    cp.exec(
      path.join(commonRedistPath, "install.bat"),
      {
        windowsHide: true,
      },
      (error) => {
        if (error) {
          logger.error("Failed to run install.bat", error);
        }
      }
    );
  }

  public static async canInstallCommonRedist() {
    const missingFiles: string[] = [];

    for (const redist of this.redistributables) {
      const filePath = path.join(commonRedistPath, redist);
      const exists = fs.existsSync(filePath);

      if (!exists) {
        missingFiles.push(redist);
      }
    }

    if (missingFiles.length > 0) {
      logger.log("Missing redistributable installer files:", missingFiles);
      logger.log("CommonRedist path:", commonRedistPath);
      return false;
    }

    logger.log("All redistributable installer files present");
    return true;
  }

  public static checkSystemRedistributables(): {
    allInstalled: boolean;
    missing: string[];
  } {
    const missing: string[] = [];

    for (const redistCheck of this.systemChecks) {
      try {
        const isInstalled = redistCheck.check();
        if (!isInstalled) {
          missing.push(redistCheck.name);
        }
        logger.log(
          `System check: ${redistCheck.name} - ${isInstalled ? "installed" : "MISSING"}`
        );
      } catch (error) {
        logger.error(`Error checking ${redistCheck.name}:`, error);
        missing.push(redistCheck.name);
      }
    }

    const allInstalled = missing.length === 0;

    if (allInstalled) {
      logger.log("All system redistributables are installed");
    } else {
      logger.log("Missing system redistributables:", missing);
    }

    return { allInstalled, missing };
  }

  public static async downloadCommonRedist() {
    logger.log("Starting download of redistributables to:", commonRedistPath);

    if (!fs.existsSync(commonRedistPath)) {
      await fs.promises.mkdir(commonRedistPath, { recursive: true });
      logger.log("Created CommonRedist directory");
    }

    for (const redist of this.redistributables) {
      const filePath = path.join(commonRedistPath, redist);

      if (fs.existsSync(filePath) && redist !== "install.bat") {
        logger.log(`Skipping ${redist} - already exists`);
        continue;
      }

      logger.log(`Downloading ${redist}...`);

      const response = await axios.get(
        `https://github.com/hydralauncher/hydra-common-redist/raw/refs/heads/main/${redist}`,
        {
          responseType: "arraybuffer",
        }
      );

      await fs.promises.writeFile(filePath, response.data);
      logger.log(`Downloaded ${redist} successfully`);
    }

    logger.log("All redistributables downloaded");
  }

  public static async hasPreflightPassed(): Promise<boolean> {
    try {
      const passed = await db.get<string, boolean>(
        levelKeys.commonRedistPassed,
        { valueEncoding: "json" }
      );
      return passed === true;
    } catch {
      return false;
    }
  }

  public static async markPreflightPassed(): Promise<void> {
    await db.put(levelKeys.commonRedistPassed, true, { valueEncoding: "json" });
    logger.log("Common redistributables preflight marked as passed");
  }

  public static async resetPreflightStatus(): Promise<void> {
    try {
      await db.del(levelKeys.commonRedistPassed);
      logger.log("Common redistributables preflight status reset");
    } catch {
      // Key might not exist, ignore
    }
  }

  public static async runPreflight(): Promise<boolean> {
    logger.log("Running common redistributables preflight check");

    const alreadyPassed = await this.hasPreflightPassed();
    if (alreadyPassed) {
      logger.log("Preflight already passed, skipping checks");
      this.sendPreflightProgress("complete", null);
      return true;
    }

    this.sendPreflightProgress("checking", null);

    const canInstall = await this.canInstallCommonRedist();

    if (!canInstall) {
      logger.log("Installer files not downloaded, downloading now");
      this.sendPreflightProgress("downloading", null);

      try {
        await this.downloadCommonRedist();
        logger.log("Installer files downloaded successfully");
      } catch (error) {
        logger.error("Failed to download installer files", error);
        this.sendPreflightProgress("error", "download_failed");
        return false;
      }
    }

    const systemCheck = this.checkSystemRedistributables();

    if (systemCheck.allInstalled) {
      logger.log("All redistributables are installed on the system");
      await this.markPreflightPassed();
      this.sendPreflightProgress("complete", null);
      return true;
    }

    logger.log(
      "Some redistributables are missing on the system:",
      systemCheck.missing
    );

    logger.log("Installing common redistributables");
    this.sendPreflightProgress("installing", null);

    try {
      const success = await this.installCommonRedistForPreflight();

      if (success) {
        await this.markPreflightPassed();
        this.sendPreflightProgress("complete", null);
        logger.log("Preflight completed successfully");
        return true;
      }

      logger.error("Preflight installation did not complete successfully");
      this.sendPreflightProgress("error", "install_failed");
      return false;
    } catch (error) {
      logger.error("Preflight installation error", error);
      this.sendPreflightProgress("error", "install_failed");
      return false;
    }
  }

  private static sendPreflightProgress(
    status: "checking" | "downloading" | "installing" | "complete" | "error",
    detail: string | null
  ) {
    // Заменен WindowManager.gameLauncherWindow на sendToAllWindows
    sendToAllWindows("preflight-progress", {
      status,
      detail,
    });
  }

  private static async installCommonRedistForPreflight(): Promise<boolean> {
    return new Promise((resolve) => {
      const abortController = new AbortController();
      const timeout = setTimeout(() => {
        abortController.abort();
        logger.error("Preflight installation timed out");
        resolve(false);
      }, this.installationTimeout);

      const installationCompleteMessage = "Installation complete";

      if (!fs.existsSync(this.installationLog)) {
        fs.writeFileSync(this.installationLog, "");
      }

      fs.watch(this.installationLog, { signal: abortController.signal }, () => {
        fs.readFile(this.installationLog, "utf-8", (err, data) => {
          if (err) {
            logger.error("Error reading preflight log file:", err);
            return;
          }

          const tail = data.split("\n").at(-2)?.trim();

          if (tail) {
            this.sendPreflightProgress("installing", tail);
          }

          if (tail?.includes(installationCompleteMessage)) {
            clearTimeout(timeout);
            if (!abortController.signal.aborted) {
              abortController.abort();
            }
            resolve(true);
          }
        });
      });

      cp.exec(
        path.join(commonRedistPath, "install.bat"),
        {
          windowsHide: true,
        },
        (error) => {
          if (error) {
            logger.error("Failed to run preflight install.bat", error);
            clearTimeout(timeout);
            if (!abortController.signal.aborted) {
              abortController.abort();
            }
            resolve(false);
          }
        }
      );
    });
  }
}
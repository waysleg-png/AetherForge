import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electron", {
  // --- Управление окном ---
  minimizeMainWindow: () => ipcRenderer.invoke("window:minimize"),
  toggleMaximizeMainWindow: () => ipcRenderer.invoke("window:toggleMaximize"),
  closeMainWindow: () => ipcRenderer.invoke("window:close"),

  // --- НОВОЕ: Мини-режим ---
  enableMiniMode: () => ipcRenderer.invoke("window:enable-mini-mode"),
  disableMiniMode: () => ipcRenderer.invoke("window:disable-mini-mode"),
  onChangeUiMode: (cb: (mode: string) => void) => {
    const listener = (_e: any, mode: string) => cb(mode);
    ipcRenderer.on("change-ui-mode", listener);
    return () => ipcRenderer.removeListener("change-ui-mode", listener);
  },

  // --- Ссылки (Telegram) ---
  openExternal: (url: string) => ipcRenderer.invoke("openExternal", url),

  // --- Настройки / Автозапуск ---
  setAutoLaunch: (enabled: boolean) => ipcRenderer.invoke("set-auto-launch", enabled),
  getAutoLaunch: () => ipcRenderer.invoke("get-auto-launch"),

  // --- Версия ---
  getVersion: () => ipcRenderer.invoke("getVersion"),

  // --- Обновления (Кастомные) ---
  checkForUpdates: () => ipcRenderer.invoke("checkForUpdates"),
  downloadUpdate: (url: string, version: string) => ipcRenderer.invoke("downloadUpdate", url, version),
  installUpdate: (filePath: string) => ipcRenderer.invoke("installUpdate", filePath),
  onCustomDownloadProgress: (cb: any) => { ipcRenderer.on('custom-download-progress', (_e, p) => cb(p)); },

  // --- Система / Оптимизация ---
  getSystemStats: () => ipcRenderer.invoke("sysopt:system-stats"),
  runOptimizationStep1: () => ipcRenderer.invoke("sysopt:boost-step1"),
  runOptimizationStep2: () => ipcRenderer.invoke("sysopt:boost-step2"),
  prepareForGaming: () => ipcRenderer.invoke("sysopt:prepare-for-gaming"),
  toggleGameMode: (enable: boolean) => ipcRenderer.invoke("sysopt:game-mode", enable),

  // --- Сеть ---
  getNetworkStats: () => ipcRenderer.invoke("sysopt:network-stats"),

  // --- Очистка ---
  getCleanupSizes: () => ipcRenderer.invoke("sysopt:cleanup-get-sizes"),
  runCleanup: (cats: string[]) => ipcRenderer.invoke("sysopt:cleanup-run", cats),

  // --- Автозагрузка ---
  getStartupApps: () => ipcRenderer.invoke("get:startup-apps"),
  toggleStartupApp: (name: string, cmd: string, enabled: boolean) => ipcRenderer.invoke("toggle:startup-app", name, cmd, enabled),

  // --- PRO ФУНКЦИИ ---
  cleanRamPro: () => ipcRenderer.invoke("clean-ram-pro"),
  toggleGameModePro: (enable: boolean) => ipcRenderer.invoke("toggle-game-mode-pro", enable),
  toggleTelemetry: (disable: boolean) => ipcRenderer.invoke("sysopt:toggle-telemetry", disable),
  applyNetworkTweak: () => ipcRenderer.invoke("sysopt:network-tweak"),
  cleanSsdShaders: () => ipcRenderer.invoke("sysopt:clean-ssd-shaders"),
  applyGamePreset: (game: string) => ipcRenderer.invoke("sysopt:apply-preset", game),
  getGpuStats: () => ipcRenderer.invoke("sysopt:get-gpu-stats"),

  // --- ТВИКИ (БЕСПЛАТНО) ---
  applyTweak: (action: string) => ipcRenderer.invoke("sysopt:apply-tweak", action),

  // --- Чистый запуск ---
  cleanBoot: () => ipcRenderer.invoke("sysopt:clean-boot"),
  restoreBoot: () => ipcRenderer.invoke("sysopt:restore-boot"),
  
});
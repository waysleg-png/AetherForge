import { BrowserWindow } from "electron";

let activeRemoteLibrarySyncs = 0;

// Вспомогательная функция для отправки во все окна
const broadcastSyncState = (isSyncing: boolean) => {
  const windows = BrowserWindow.getAllWindows();
  for (const win of windows) {
    if (!win.isDestroyed()) {
      win.webContents.send("on-remote-library-sync-state", isSyncing);
    }
  }
};

// ВОЗВРАЩАЕМ ФУНКЦИЮ, КОТОРУЮ ИЩЕТ get-remote-library-sync-state.ts
export const isRemoteLibrarySyncing = (): boolean => {
  return activeRemoteLibrarySyncs > 0;
};

// Функция-обертка для отслеживания синхронизации
export const trackRemoteLibrarySync = async <T>(
  fn: () => Promise<T>
): Promise<T> => {
  activeRemoteLibrarySyncs++;
  if (activeRemoteLibrarySyncs === 1) {
    broadcastSyncState(true);
  }
  try {
    return await fn();
  } finally {
    activeRemoteLibrarySyncs--;
    if (activeRemoteLibrarySyncs === 0) {
      broadcastSyncState(false);
    }
  }
};
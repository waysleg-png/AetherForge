import { ipcMain } from "electron";

ipcMain.handle("openBigPictureWindow", async () => {
  // Динамический импорт разрывает циклическую зависимость при сборке
  const { WindowManager } = await import("@main/services");
  await WindowManager.openBigPictureWindow();
});

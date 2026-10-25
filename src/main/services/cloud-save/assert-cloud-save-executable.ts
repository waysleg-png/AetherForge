import { BrowserWindow } from "electron";
import { createCloudSaveExecutableGuard } from "./executable-path-guard";
import { gamesSublevel, levelKeys } from "@main/level";
import fs from "node:fs/promises";
import { logger } from "../logger";
import { isCloudSaveV2Eligible } from "@shared";
import type { GameShop } from "@types";

// Вспомогательная функция для отправки во все окна (вместо WindowManager)
const sendToAllWindows = (channel: string, ...args: any[]) => {
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, ...args);
    }
  });
};

// Получаем игру из базы данных
const getGame = async (objectId: string, shop: GameShop) => {
  return await gamesSublevel.get(levelKeys.game(shop, objectId));
};

// Сохраняем игру в базу данных
const saveGame = async (game: any) => {
  await gamesSublevel.put(levelKeys.game(game.shop, game.objectId), game);
};

// Проверяем, существует ли файл на диске
const pathExists = async (executablePath: string) => {
  try {
    await fs.access(executablePath);
    return true;
  } catch {
    return false;
  }
};

// Если exe-файл пропал, отправляем уведомление в интерфейс
const onExecutablePathCleared = (game: any, executablePath: string) => {
  logger.warn(`Executable path cleared for ${game.title}: ${executablePath}`);
  
  sendToAllWindows("on-cloud-save-executable-missing", {
    objectId: game.objectId,
    shop: game.shop,
    title: game.title
  });
};

// Создаем guard
const guard = createCloudSaveExecutableGuard({
  getGame,
  saveGame,
  pathExists,
  onExecutablePathCleared,
});

// Экспортируем функцию проверки (та, которая была в оригинале)
export const assertCloudSaveRuntimeAvailable = async (objectId: string, shop: GameShop) => {
  return await guard(objectId, shop);
};

// ВОЗВРАЩАЕМ ЭКСПОРТ, КОТОРЫЙ МЫ СЛУЧАЙНО УДАЛИЛИ
export const assertCloudSaveV2Eligible = (shop: GameShop, platform: string | null | undefined) => {
  if (!isCloudSaveV2Eligible(shop, platform)) {
    throw new Error("cloud_save_v2_not_eligible");
  }
};
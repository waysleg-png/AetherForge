import type { GameLauncherStatus, GameLauncherStatusPayload, GameShop } from "@types";
import { BrowserWindow } from "electron";

// Вспомогательная функция для отправки во все окна
const sendToAllWindows = (channel: string, ...args: any[]) => {
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, ...args);
    }
  });
};

// Внутреннее хранилище статусов
const activeStatuses = new Map<string, GameLauncherStatusPayload>();
const detectedGames = new Set<string>();

// ВОЗВРАЩАЕМ ФУНКЦИЮ, КОТОРУЮ ИЩЕТ get-game-launcher-statuses.ts
export const getGameLauncherStatuses = (): GameLauncherStatusPayload[] => {
  return Array.from(activeStatuses.values());
};

// Отмечаем игру как детектированную
export const markGameLauncherGameDetected = (gameKey: string) => {
  detectedGames.add(gameKey);
};

// Отправляем статус и запоминаем его
export const sendGameLauncherStatus = (status: GameLauncherStatusPayload) => {
  const shop = (status as any).shop;
  const objectId = (status as any).objectId;
  const key = shop && objectId ? `${shop}:${objectId}` : "global";
  
  activeStatuses.set(key, status);
  sendToAllWindows("game-launcher-status", status);
};

// Очищаем все статусы
export const clearGameLauncherStatuses = () => {
  activeStatuses.clear();
  detectedGames.clear();
  sendToAllWindows("clear-game-launcher-statuses");
};

// Проверяем, был ли детектирован лаунчер игры
export const wasGameLauncherGameDetected = (gameKey: string): boolean => {
  return detectedGames.has(gameKey);
};

// Оставляем синоним
export const updateGameLauncherStatus = sendGameLauncherStatus;
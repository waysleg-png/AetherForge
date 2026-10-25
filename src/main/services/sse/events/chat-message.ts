import { logger } from "@main/services/logger";
import { BrowserWindow } from "electron";
import type { ChatMessage } from "../types";

const sendToAllWindows = (channel: string, ...args: any[]) => {
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, ...args);
    }
  });
};

export const chatMessageEvent = (message: ChatMessage) => {
  try {
    sendToAllWindows("on-chat-message", message);
  } catch (error) {
    logger.error("Failed to handle chat message", error);
  }
};
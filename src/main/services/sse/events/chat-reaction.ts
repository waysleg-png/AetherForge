import type { ChatReactionSync } from "@types";
import { BrowserWindow } from "electron";

const sendToAllWindows = (channel: string, ...args: any[]) => {
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, ...args);
    }
  });
};

export const chatReactionEvent = (sync: ChatReactionSync) => {
  sendToAllWindows("on-chat-reaction", sync);
};
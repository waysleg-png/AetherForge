import type { ChatMessageRejectedSync } from "@types";
import { BrowserWindow } from "electron";

const sendToAllWindows = (channel: string, ...args: any[]) => {
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, ...args);
    }
  });
};

export const chatMessageRejectedEvent = (sync: ChatMessageRejectedSync) => {
  sendToAllWindows("on-chat-message-rejected", sync);
};
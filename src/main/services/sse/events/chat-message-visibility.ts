import type { ChatMessageVisibilitySync } from "@types";
import { BrowserWindow } from "electron";

const sendToAllWindows = (channel: string, ...args: any[]) => {
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, ...args);
    }
  });
};

export const chatMessageVisibilityEvent = (sync: ChatMessageVisibilitySync) => {
  sendToAllWindows("on-chat-message-visibility", sync);
};
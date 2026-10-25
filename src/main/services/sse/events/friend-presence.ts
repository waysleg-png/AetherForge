import type { FriendPresence } from "../../types";
import { BrowserWindow } from "electron";

const sendToAllWindows = (channel: string, ...args: any[]) => {
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, ...args);
    }
  });
};

export const friendPresenceEvent = (presence: FriendPresence) => {
  sendToAllWindows("on-friend-presence", presence);
};
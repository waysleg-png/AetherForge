import { BrowserWindow } from "electron";
import { createFriendsUpdateThrottle } from "./friends-update-throttle";

const sendToAllWindows = (channel: string, ...args: any[]) => {
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, ...args);
    }
  });
};

const broadcast = createFriendsUpdateThrottle(() => {
  sendToAllWindows("on-friends-updated");
});

export const broadcastFriendsUpdated = () => {
  broadcast();
};
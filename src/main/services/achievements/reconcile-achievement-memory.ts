import type { UpdatedUnlockedAchievements } from "@types";
import { AchievementMemoryStore } from "./achievement-memory-store";
import { mergeUnlockedAchievementLists } from "./merge-unlocked-achievements";
import { BrowserWindow } from "electron"; // Используем BrowserWindow напрямую

export const reconcileAchievementMemory = async (
  response: UpdatedUnlockedAchievements,
  current: () => boolean
) => {
  if (!current()) return;
  
  const stored = AchievementMemoryStore.get(response.shop, response.objectId);
  
  AchievementMemoryStore.set(response.shop, response.objectId, {
    achievements: stored?.achievements ?? [],
    unlockedAchievements: mergeUnlockedAchievementLists(
      response.achievements,
      stored?.unlockedAchievements ?? []
    ),
    language: stored?.language,
    catalogueValidator: stored?.catalogueValidator,
  });

  const { getUnlockedAchievements } = await import(
    "@main/events/user/get-unlocked-achievements"
  );
  
  const achievements = await getUnlockedAchievements(
    response.objectId,
    response.shop,
    true,
    current
  ).catch(() => null);

  if (achievements && current()) {
    // Вместо WindowManager.mainWindow?.webContents.send(...) делаем так:
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
      if (!win.isDestroyed()) {
        win.webContents.send(
          `on-update-achievements-${response.objectId}-${response.shop}`,
          achievements
        );
      }
    }
  }
};
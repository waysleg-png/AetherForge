import { BrowserWindow } from "electron";
import type { UserAchievement } from "@types";
import { HydraApi } from "@main/services/hydra-api";
import { AchievementMemoryStore } from "@main/services/achievements/achievement-memory-store";
import { mergeUnlockedAchievementLists } from "@main/services/achievements/merge-unlocked-achievements";
import { achievementsLogger } from "@main/services/logger";

export const getUnlockedAchievements = async (
  objectId: string,
  shop: string,
  forceRefresh = false,
  current?: () => boolean
): Promise<UserAchievement[]> => {
  if (current && !current()) return [];

  // Если нужно обновить с сервера
  if (forceRefresh) {
    try {
      const response = await HydraApi.get<{ achievements: UserAchievement[] }>(
        `/profile/games/achievements?objectId=${objectId}&shop=${shop}`
      );
      
      if (response && response.achievements) {
        const stored = AchievementMemoryStore.get(shop, objectId);
        AchievementMemoryStore.set(shop, objectId, {
          achievements: stored?.achievements ?? [],
          unlockedAchievements: mergeUnlockedAchievementLists(
            response.achievements,
            stored?.unlockedAchievements ?? []
          ),
          language: stored?.language,
          catalogueValidator: stored?.catalogueValidator,
        });

        // Отправляем обновление во все окна
        BrowserWindow.getAllWindows().forEach((win) => {
          if (!win.isDestroyed()) {
            win.webContents.send(
              `on-update-achievements-${objectId}-${shop}`,
              response.achievements
            );
          }
        });
        return response.achievements;
      }
    } catch (error) {
      achievementsLogger.error("Failed to fetch unlocked achievements", error);
    }
  }

  // Возвращаем из кэша
  const stored = AchievementMemoryStore.get(shop, objectId);
  return stored?.unlockedAchievements ?? [];
};

// ВОЗВРАЩАЕМ ФУНКЦИЮ, КОТОРУЮ ИЩЕТ get-retroachievements-achievements.ts
export const syncAndGetUnlockedAchievements = async (
  objectId: string,
  shop: string,
  current?: () => boolean
) => {
  return getUnlockedAchievements(objectId, shop, true, current);
};
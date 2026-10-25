import { gamesSublevel, db, levelKeys } from "@main/level";
import type { GameShop, UserPreferences } from "@types";

// ВОЗВРАЩАЕМ ФУНКЦИЮ БЛОКИРОВКИ
export const withAutomaticSaveProviderLock = async <T>(
  objectId: string,
  fn: () => Promise<T>
): Promise<T> => {
  return await fn();
};

// Читаем настройку из базы данных (включена ли автосинхронизация)
export const getCloudSaveAutomaticSyncMode = async () => {
  const prefs = await db
    .get<string, UserPreferences | null>(levelKeys.userPreferences, {
      valueEncoding: "json",
    })
    .catch(() => null);
  return (prefs as any)?.automaticCloudSaveSyncMode ?? false;
};

// Читаем настройку для конкретной игры
export const getCloudSaveAutomaticSyncEnabled = async (
  objectId: string,
  shop: GameShop
) => {
  const game = await gamesSublevel
    .get(levelKeys.game(shop, objectId))
    .catch(() => null);
  if (!game) return false;
  
  return game.automaticCloudSync ?? false;
};

// Сохраняем настройку для игры
export const setCloudSaveAutomaticSyncEnabled = async (
  objectId: string,
  shop: GameShop,
  enabled: boolean
) => {
  const game = await gamesSublevel
    .get(levelKeys.game(shop, objectId))
    .catch(() => null);
  if (!game) return;
  
  await gamesSublevel.put(levelKeys.game(shop, objectId), {
    ...game,
    automaticCloudSync: enabled,
  });
};

// ВОЗВРАЩАЕМ ФУНКЦИЮ ДЛЯ СТАРОЙ СИНХРОНИЗАЦИИ (которую ищет toggle-automatic-cloud-sync.ts)
export const setLegacyCloudSaveAutomaticSyncEnabled = async (
  objectId: string,
  shop: GameShop,
  enabled: boolean
) => {
  return setCloudSaveAutomaticSyncEnabled(objectId, shop, enabled);
};
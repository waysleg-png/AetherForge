import { db, levelKeys } from "@main/level";
import type { AchievementSouvenir } from "@types";
import { achievementsLogger } from "../logger";

export class AchievementSouvenirStore {
  private static getKey(shop: string, objectId: string) {
    return `souvenirs:${levelKeys.game(shop, objectId)}`;
  }

  public static async get(shop: string, objectId: string): Promise<AchievementSouvenir[]> {
    try {
      const data = await db.get<string, { souvenirs: AchievementSouvenir[] }>(
        this.getKey(shop, objectId), 
        { valueEncoding: "json" }
      );
      return data?.souvenirs ?? [];
    } catch (error) {
      return [];
    }
  }

  public static async set(shop: string, objectId: string, souvenirs: AchievementSouvenir[]) {
    try {
      await db.put(
        this.getKey(shop, objectId), 
        { souvenirs }, 
        { valueEncoding: "json" }
      );
    } catch (error) {
      achievementsLogger.error("Failed to save souvenirs", error);
    }
  }

  public static async invalidate(shop: string, objectId: string) {
    try {
      await db.del(this.getKey(shop, objectId));
    } catch (error) {
      // ignore
    }
  }
}
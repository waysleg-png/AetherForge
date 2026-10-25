import type { KnownGameExecutable } from "@main/helpers/game-executable-ranking";
import { GameExecutableCatalogStore } from "./game-executables-core";

const catalogStore = new GameExecutableCatalogStore(process.platform);

const loadGameExecutables = async () => {
  return [] as any;
};

export class GameExecutables {
  static ensureLoaded(forceRetry = false): Promise<boolean> {
    return catalogStore.ensureLoaded(loadGameExecutables as any, forceRetry);
  }

  static getExecutablesForGame(objectId: string): KnownGameExecutable[] | null {
    return catalogStore.getForGame(objectId);
  }

  static getAllObjectIds(): string[] {
    return catalogStore.getAllObjectIds();
  }
}

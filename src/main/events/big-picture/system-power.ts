import { logger } from "@main/services/logger";
import { executeSystemPowerAction } from "@main/services/system-power";
import { registerEvent } from "../register-event";

let powerActionPending = false;

registerEvent("executeSystemPowerAction", async (event, action: unknown) => {
  // Динамический импорт разрывает циклическую зависимость при сборке
  const { WindowManager } = await import("@main/services/window-manager");

  if (
    !WindowManager.isBigPictureSender(event.sender) ||
    event.senderFrame !== event.sender.mainFrame
  ) {
    throw new Error("System power actions require the Big Picture window");
  }

  if (powerActionPending) {
    throw new Error("A system power action is already pending");
  }

  powerActionPending = true;
  try {
    await executeSystemPowerAction(action);
  } catch (error) {
    logger.error("Failed to execute system power action", action, error);
    throw error;
  } finally {
    powerActionPending = false;
  }
});

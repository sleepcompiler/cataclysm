import { ClientCommand } from "@hex-strategy/shared";

// Simple Command Parser ensuring structure before passing to engine
export function parseClientCommand(data: any): ClientCommand | null {
  try {
    const parsed = typeof data === "string" ? JSON.parse(data) : data;

    if (!parsed || typeof parsed.type !== "string") {
      return null;
    }

    switch (parsed.type) {
      case "move_unit":
        if (typeof parsed.unitId === "string" && Array.isArray(parsed.path)) {
          return parsed as ClientCommand;
        }
        break;
      case "play_card":
        if (typeof parsed.cardId === "string") {
          return parsed as ClientCommand;
        }
        break;
      case "activate_quirk":
        if (typeof parsed.entityId === "string" && typeof parsed.quirkId === "string") {
          return parsed as ClientCommand;
        }
        break;
      case "end_turn":
        return parsed as ClientCommand;
    }

    return null;
  } catch (err) {
    return null;
  }
}

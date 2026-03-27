import { PlayerId, TileId, UnitId, CardId } from "./types";

/**
 * Commands sent from Client to Server.
 */

export interface MoveUnitCommand {
  type: "move_unit";
  unitId: UnitId;
  path: TileId[]; // Array of coordinates forming the path
}

export interface PlayCardCommand {
  type: "play_card";
  cardId: CardId;
  target?: TileId | UnitId; 
}

export interface EndTurnCommand {
  type: "end_turn";
}

export interface ActivateQuirkCommand {
  type: "activate_quirk";
  entityId: string;
  quirkId: string;
  target?: TileId | UnitId;
}

export type ClientCommand = MoveUnitCommand | PlayCardCommand | ActivateQuirkCommand | EndTurnCommand;

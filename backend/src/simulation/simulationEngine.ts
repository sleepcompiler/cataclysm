import { GameState, MoveUnitCommand, PlayCardCommand, ServerEvent } from "@hex-strategy/shared";
import { processMovement } from "./movementSystem";
import { startNextTurn } from "./phaseSystem";
import { processDamageAndDeath } from "./combatSystem";
import { calculateTerritory } from "../territory/territorySystem";

export class SimulationEngine {
  private state: GameState;

  constructor(initialState: GameState) {
    this.state = initialState;
  }

  public getState() {
    return this.state;
  }

  public tickMovement(actingPlayerId: string, movements: MoveUnitCommand[]): ServerEvent[] {
    const events: ServerEvent[] = [];
    this.state.phase = "movement";
    const moveEvents = processMovement(this.state, movements);
    events.push(...moveEvents);
    return events;
  }

  // resolve one player's full turn sequentially
  // combat resolves globally, territory re-calculates
  public tickTurn(
    actingPlayerId: string,
    movements: MoveUnitCommand[],
    nextPlayerId: string
  ): ServerEvent[] {
    const events: ServerEvent[] = [];

    // combat — speed-sorted initiative, resolves everything in one pass
    this.state.phase = "attack";
    const { eliminatedPlayers, events: combatEvents } = processDamageAndDeath(this.state);
    events.push(...combatEvents);

    if (eliminatedPlayers.length > 0) {
      this.state.activePlayers = this.state.activePlayers.filter(p => !eliminatedPlayers.includes(p));
    }

    // territory
    this.state.phase = "territory";
    const territoryChanges = calculateTerritory(this.state);
    if (Object.keys(territoryChanges).length > 0) {
      events.push({ type: "territory_updated", changes: territoryChanges });
    }

    // turn end marker for the log
    events.push({
      type: "turn_ended",
      playerId: actingPlayerId,
      turn: this.state.turn,
      nextPlayerId,
    });

    startNextTurn(this.state, nextPlayerId, actingPlayerId);

    // always send a full state sync at the end so both clients stay in lock-step
    events.push({
      type: "state_update",
      state: JSON.parse(JSON.stringify(this.state)),
    });

    return events;
  }
}

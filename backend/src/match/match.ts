import { ClientCommand, GameState, PlayerId, MoveUnitCommand, PlayCardCommand } from "@hex-strategy/shared";
import { SimulationEngine } from "../simulation/simulationEngine";
import { generateSymmetricMap } from "../map/mapGenerator";
import { createBuilding } from "../game/building";
import { createCardInstance, CARD_LIBRARY, STARTER_TEMPLATES, DEFAULT_DECK, STAGE_1_UNIT_TEMPLATES } from "../cards/cards";
import { calculateTerritory } from "../territory/territorySystem";
import { resolveInstantCardPlay } from "../simulation/phaseSystem";
import { resolveActiveQuirk } from "../simulation/quirkSystem";

export class Match {
  public id: string;
  public players: PlayerId[];
  private engine: SimulationEngine;

  // who's up right now
  private currentPlayerIndex: number = 0;

  // queue of what the active player submitted before hitting end turn
  private pendingCommands: ClientCommand[] = [];

  public onEventsGenerated?: (events: any[]) => void;
  public isPlayerConnected?: (playerId: string) => boolean;

  constructor(id: string, players: PlayerId[], seed: number) {
    this.id = id;
    this.players = players;

    const { tiles, startPositions } = generateSymmetricMap(players.length, seed);
    const firstPlayer = players[0];

    const state: GameState = {
      turn: 1,
      activePlayers: [...players],
      currentTurnPlayer: firstPlayer,
      map: tiles,
      units: {},
      buildings: {},
      traps: {},
      players: {},
      phase: "command",
    };

    // give everyone a cat tower and a starting hand
    players.forEach((p, index) => {
      const startPos = startPositions[index];
      const tower = createBuilding("cat_tree", p, startPos);
      // Add modifiers to the created building
      tower.modifiers = [];
      state.buildings[tower.id] = tower;

      const deckTemplates = [...DEFAULT_DECK];

      // Fisher-Yates shuffle
      for (let i = deckTemplates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deckTemplates[i], deckTemplates[j]] = [deckTemplates[j], deckTemplates[i]];
      }

      // guarantee a Stage 1 unit (kitten) so you can do something turn 1
      const starterIndex = deckTemplates.findIndex(id => STAGE_1_UNIT_TEMPLATES.includes(id));
      if (starterIndex > 4 && starterIndex !== -1) {
         [deckTemplates[0], deckTemplates[starterIndex]] = [deckTemplates[starterIndex], deckTemplates[0]];
         // shuffle the top 5 loosely so we don't always draw the kitten at draw index 0
         const r = Math.floor(Math.random() * 5);
         [deckTemplates[0], deckTemplates[r]] = [deckTemplates[r], deckTemplates[0]];
      }

      const deck = deckTemplates.map(id => createCardInstance(id));
      const hand = deck.splice(0, 5);

      // p1 starts with 1 catnip since they go first; p2 gets theirs at turn start
      state.players[p] = {
        id: p,
        hp: 20,
        maxHp: 20,
        catnip: p === firstPlayer ? 1 : 0,
        maxCatnip: 1,
        hand,
        deck,
        deckSize: deck.length,
      };
    });

    // run territory once right now so tiles around cat towers are already owned
    // otherwise p1 can't place anything on turn 1
    state.phase = "territory";
    calculateTerritory(state);
    state.phase = "command";

    // Player 1 never goes through startNextTurn before their first move, so they
    // miss the card draw that every subsequent player gets at turn start. Draw
    // one card for them here to keep hand sizes equal.
    const p1State = state.players[firstPlayer];
    if (p1State && p1State.deck.length > 0) {
      const drawn = p1State.deck.shift();
      if (drawn) p1State.hand.push(drawn);
      p1State.deckSize = p1State.deck.length;
    }

    this.engine = new SimulationEngine(state);
  }

  queueCommand(playerId: PlayerId, command: ClientCommand) {
    const state = this.engine.getState();

    // ignore commands from eliminated players
    if (!state.activePlayers.includes(playerId)) {
      console.log(`[Match] blocking command from eliminated player ${playerId}`);
      return;
    }

    // ignore anyone who isn't up
    if (playerId !== state.currentTurnPlayer) {
      console.log(`[Match] blocking command from ${playerId}, it's ${state.currentTurnPlayer}'s turn`);
      return;
    }

    if (command.type === "end_turn") {
      this.resolveTurnTick();
      return;
    }

    if (command.type === "play_card") {
      const state = this.engine.getState();
      const events = resolveInstantCardPlay(state, { playerId, cmd: command });
      if (events.length > 0 && this.onEventsGenerated) {
        events.push({ type: "state_update", state: this.getState() });
        this.onEventsGenerated(events);
      }
      return;
    }

    if (command.type === "move_unit") {
      const state = this.engine.getState();
      const events = this.engine.tickMovement(playerId, [command]);
      if (events.length > 0 && this.onEventsGenerated) {
        events.push({ type: "state_update", state: this.getState() });
        this.onEventsGenerated(events);
      }
      return;
    }

    if (command.type === "activate_quirk") {
      const state = this.engine.getState();
      const events = resolveActiveQuirk(state, { playerId, cmd: command });
      if (events.length > 0 && this.onEventsGenerated) {
        events.push({ type: "state_update", state: this.getState() });
        this.onEventsGenerated(events);
      }
      return;
    }

    this.pendingCommands.push(command);
  }

  private resolveTurnTick() {
    const state = this.engine.getState();
    const actingPlayerId = state.currentTurnPlayer;

    // next player cycles through whoever's still alive
    const activePlayers = state.activePlayers;
    const nextActiveIndex = (activePlayers.indexOf(actingPlayerId) + 1) % activePlayers.length;
    const nextPlayerId = activePlayers[nextActiveIndex];

    const movements: MoveUnitCommand[] = [];

    for (const cmd of this.pendingCommands) {
      if (cmd.type === "move_unit") movements.push(cmd);
    }

    const events = this.engine.tickTurn(actingPlayerId, movements, nextPlayerId);

    this.pendingCommands = [];
    this.currentPlayerIndex = this.players.indexOf(nextPlayerId);

    if (this.onEventsGenerated) {
      this.onEventsGenerated(events);
    }
  }

  getState(playerId?: string) {
    // deep copy so we can scrub without mutating server source of truth
    const state = JSON.parse(JSON.stringify(this.engine.getState())) as import("@hex-strategy/shared").GameState;
    if (!playerId) return state;

    // scrub enemy traps so they are invisible to the requesting player
    const scrubbedTraps: Record<string, import("@hex-strategy/shared").Trap> = {};
    for (const [id, trap] of Object.entries(state.traps)) {
      if (trap.owner === playerId) {
        scrubbedTraps[id] = trap;
      }
    }
    state.traps = scrubbedTraps;

    // scrub enemy hands and ALL hidden decks
    for (const p of Object.values(state.players)) {
      if (p.id !== playerId) {
        p.hand = p.hand.map((c, i) => ({
          ...c,
          id: `hidden_${i}`,
          templateId: "hidden",
          name: "Unknown Card",
          type: "troop",
          cost: 0,
          target: "none",
          effects: []
        }));
      }
      p.deck = []; // Never send the physical deck items over WS
    }

    return state;
  }
}

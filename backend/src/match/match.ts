import { ClientCommand, GameState, PlayerId, MoveUnitCommand, PlayCardCommand } from "@hex-strategy/shared";
import { STAGE_1_UNIT_TEMPLATES, STAGE_1_BUILDING_TEMPLATES, DEFAULT_DECK, createCardInstance } from "../cards/cards";
import { SimulationEngine } from "../simulation/simulationEngine";
import { generateSymmetricMap } from "../map/mapGenerator";
import { createBuilding } from "../game/building";
import { calculateTerritory } from "../territory/territorySystem";
import { resolveInstantCardPlay } from "../simulation/phaseSystem";
import { resolveActiveQuirk } from "../simulation/quirkSystem";
import { db } from "../db/store";
import { calcEloDeltas } from "../game/elo";

export class Match {
  public id: string;
  public matchCode: string;
  public players: { id: PlayerId, name: string }[];
  private engine: SimulationEngine;

  // who's up right now
  private currentPlayerIndex: number = 0;

  // queue of what the active player submitted before hitting end turn
  private pendingCommands: ClientCommand[] = [];

  private eventCallback?: (events: any[]) => void;
  private hasProcessedEnd: boolean = false;

  setEventCallback(cb: (events: any[]) => void) {
    this.eventCallback = cb;
  }

  private emit(events: any[]) {
    this.eventCallback?.(events);
  }

  constructor(id: string, matchCode: string, players: { id: PlayerId, name: string, deck?: string[] }[], seed: number) {
    this.id = id;
    this.matchCode = matchCode;
    this.players = players;

    const { tiles, startPositions } = generateSymmetricMap(players.length, seed);
    const firstPlayerId = players[0].id;

    const state: GameState = {
      turn: 1,
      activePlayers: players.map(p => p.id),
      currentTurnPlayer: firstPlayerId,
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
      const tower = createBuilding("cat_tree", p.id, startPos);
      // Add modifiers to the created building
      tower.modifiers = [];
      state.buildings[tower.id] = tower;

      // Use the player's custom deck or the default
      const deckTemplates = [...(p.deck ?? DEFAULT_DECK)];

      // Fisher-Yates shuffle
      for (let i = deckTemplates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deckTemplates[i], deckTemplates[j]] = [deckTemplates[j], deckTemplates[i]];
      }

      // prioritize a Stage 1 unit (kitten) so they have a unit turn 1, fallback to building
      let starterIndex = deckTemplates.findIndex(id => STAGE_1_UNIT_TEMPLATES.includes(id));
      if (starterIndex === -1) {
        starterIndex = deckTemplates.findIndex(id => STAGE_1_BUILDING_TEMPLATES.includes(id));
      }
      if (starterIndex > 4 && starterIndex !== -1) {
         [deckTemplates[0], deckTemplates[starterIndex]] = [deckTemplates[starterIndex], deckTemplates[0]];
         // shuffle the top 5 loosely so we don't always draw the kitten at draw index 0
         const r = Math.floor(Math.random() * 5);
         [deckTemplates[0], deckTemplates[r]] = [deckTemplates[r], deckTemplates[0]];
      }

      const deck = deckTemplates.map(id => createCardInstance(id));
      const hand = deck.splice(0, 5);

      // p1 starts with 1 catnip since they go first; p2 gets theirs at turn start
      state.players[p.id] = {
        id: p.id,
        name: p.name,
        hp: 20,
        maxHp: 20,
        catnip: p.id === firstPlayerId ? 1 : 0,
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
    const p1State = state.players[firstPlayerId];
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
    const playerName = this.players.find(p => p.id === playerId)?.name ?? playerId;
    if (!state.activePlayers.includes(playerId)) {
      console.log(`[Match] blocking command from eliminated player ${playerName}`);
      return;
    }

    // ignore anyone who isn't up
    if (playerId !== state.currentTurnPlayer) {
      const activeName = this.players.find(p => p.id === state.currentTurnPlayer)?.name ?? state.currentTurnPlayer;
      console.log(`[Match] blocking command from ${playerName}, it's ${activeName}'s turn`);
      return;
    }

    if (command.type === "end_turn") {
      this.resolveTurnTick();
      return;
    }

    if (command.type === "play_card") {
      const state = this.engine.getState();
      const events = resolveInstantCardPlay(state, { playerId, cmd: command });
      if (events.length > 0) {
        events.push({ type: "state_update", state: this.getState() });
        this.emit(events);
      }
      return;
    }

    if (command.type === "move_unit") {
      const state = this.engine.getState();
      const events = this.engine.tickMovement(playerId, [command]);
      if (events.length > 0) {
        events.push({ type: "state_update", state: this.getState() });
        this.emit(events);
      }
      return;
    }

    if (command.type === "activate_quirk") {
      const state = this.engine.getState();
      const events = resolveActiveQuirk(state, { playerId, cmd: command });
      if (events.length > 0) {
        events.push({ type: "state_update", state: this.getState() });
        this.emit(events);
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

    const newState = this.engine.getState();
    if (newState.activePlayers.length <= 1) {
      this.handleMatchEnd(events);
    }

    this.pendingCommands = [];
    this.currentPlayerIndex = this.players.findIndex(p => p.id === nextPlayerId);
    this.emit(events);
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

  private handleMatchEnd(events: any[]) {
    if (this.hasProcessedEnd) return;
    this.hasProcessedEnd = true;

    const state = this.engine.getState();
    const players = this.players;

    if (players.length !== 2) return;

    const pA = players[0];
    const pB = players[1];

    const ratingA = db.findOne("ratings", r => r.userId === pA.id) || {
      userId: pA.id, elo: 1200, wins: 0, losses: 0, draws: 0, lastPlayedAt: Date.now()
    };
    const ratingB = db.findOne("ratings", r => r.userId === pB.id) || {
      userId: pB.id, elo: 1200, wins: 0, losses: 0, draws: 0, lastPlayedAt: Date.now()
    };

    let result: "a" | "b" | "draw";
    if (state.activePlayers.length === 0) {
      result = "draw";
    } else {
      const winnerId = state.activePlayers[0];
      result = winnerId === pA.id ? "a" : "b";
    }

    const deltas = calcEloDeltas(ratingA.elo, ratingB.elo, result);

    const newEloA = Math.max(100, ratingA.elo + deltas.a);
    const newEloB = Math.max(100, ratingB.elo + deltas.b);

    db.upsert("ratings", r => r.userId === pA.id, {
      userId: pA.id,
      elo: newEloA,
      wins: ratingA.wins + (result === "a" ? 1 : 0),
      losses: ratingA.losses + (result === "b" ? 1 : 0),
      draws: ratingA.draws + (result === "draw" ? 1 : 0),
      lastPlayedAt: Date.now()
    });

    db.upsert("ratings", r => r.userId === pB.id, {
      userId: pB.id,
      elo: newEloB,
      wins: ratingB.wins + (result === "b" ? 1 : 0),
      losses: ratingB.losses + (result === "a" ? 1 : 0),
      draws: ratingB.draws + (result === "draw" ? 1 : 0),
      lastPlayedAt: Date.now()
    });

    db.insert("matches", {
      id: this.id,
      playerIds: [pA.id, pB.id],
      winnerId: result === "draw" ? null : (result === "a" ? pA.id : pB.id),
      eloChanges: {
        [pA.id]: deltas.a,
        [pB.id]: deltas.b
      },
      playedAt: Date.now()
    });

    console.log(`[Match] Finished. Winner: ${result}. Deltas: A(${deltas.a}), B(${deltas.b})`);

    events.push({
      type: "match_finished",
      winnerId: result === "draw" ? null : (result === "a" ? pA.id : pB.id),
      eloChanges: {
        [pA.id]: deltas.a,
        [pB.id]: deltas.b
      },
      newRatings: {
        [pA.id]: newEloA,
        [pB.id]: newEloB
      }
    });
  }
}

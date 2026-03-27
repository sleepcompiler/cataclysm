import { writable, get, derived } from "svelte/store";
import type { GameState, ClientCommand, PlayerId } from "@hex-strategy/shared";

export const gameStateStore = writable<GameState | null>(null);
export const playerCatnipStore = writable<number>(0);
export const playerIdStore = writable<PlayerId | null>("player1"); // Mock login
export const activeMatchIdStore = writable<string | null>(null);

// UI State
export const selectedCardIdStore = writable<string | null>(null);
export const selectedTileStore = writable<{q: number, r: number} | null>(null);

// Client-side prediction & UX
export const selectedUnitIdStore = writable<string | null>(null);
export const projectedCatnipStore = writable<number>(0);
export const projectedHandStore = writable<import("@hex-strategy/shared").Card[]>([]);
export const hasEndedTurnStore = writable<boolean>(false);

export interface DamagePopup {
  id: string;
  amount: number;
  q: number;
  r: number;
  timestamp: number;
}
export const damagePopupsStore = writable<DamagePopup[]>([]);

/** True when it is this client's turn to act */
export const isMyTurnStore = derived(
  [gameStateStore, playerIdStore],
  ([$state, $pid]) => {
    if (!$state || !$pid) return false;
    return $state.currentTurnPlayer === $pid;
  }
);

// ── Combat Log ──────────────────────────────────────────────────────────────
export interface CombatLogEntry {
  turn: number;
  playerId: string;
  text: string;
  /** One of the player-index colours — matches the renderer's blue/red palette */
  color: "blue" | "red" | "neutral";
  isHeader?: boolean;
}

export const combatLogStore = writable<CombatLogEntry[]>([]);

function playerColor(playerId: string): "blue" | "red" {
  // player1 = blue, everyone else = red (extend later when > 2 players)
  return playerId === "player1" ? "blue" : "red";
}

// ────────────────────────────────────────────────────────────────────────────

let socket: WebSocket | null = null;

export function connectGameServer(matchId: string, playerId: string) {
  socket = new WebSocket("ws://localhost:3001");

  socket.addEventListener("open", () => {
    console.log("Connected to match server");
    socket?.send(JSON.stringify({ type: "init", matchId, playerId }));
    activeMatchIdStore.set(matchId);
    playerIdStore.set(playerId);
  });

  socket.addEventListener("message", (event) => {
    try {
      const payload = JSON.parse(event.data);
      if (payload.type === "state_update") {
        applyStateUpdate(payload.state as GameState, playerId);
      }
      if (payload.type === "events") {
        for (const serverEvent of payload.events) {
          handleServerEvent(serverEvent, playerId);
        }
      }
    } catch (e) {
      console.error("WS Parse Error", e);
    }
  });

  socket.addEventListener("close", () => {
    console.log("Disconnected from server");
    gameStateStore.set(null);
  });
}

function applyStateUpdate(state: GameState, playerId: string) {
  gameStateStore.set(state);
  if (state.players[playerId]) {
    playerCatnipStore.set(state.players[playerId].catnip);
    projectedCatnipStore.set(state.players[playerId].catnip);
    projectedHandStore.set([...state.players[playerId].hand]);
  }
  hasEndedTurnStore.set(false);
}

function handleServerEvent(serverEvent: any, playerId: string) {
  const turn = get(gameStateStore)?.turn ?? 0;

  const push = (pid: string, text: string) => combatLogStore.update(log => [...log, {
    turn,
    playerId: pid,
    text,
    color: playerColor(pid)
  }]);

  switch (serverEvent.type) {
    case "state_update":
      applyStateUpdate(serverEvent.state as GameState, playerId);
      break;

    case "unit_moved": {
      const { playerId: pid, unitType, from, to } = serverEvent;
      push(pid, `${pid}'s ${unitType} moves to (${to.q}, ${to.r})`);
      break;
    }

    case "trap_triggered": {
      const { trapType, trapOwner, victimType, victimOwner, position } = serverEvent;
      push(victimOwner, `${victimOwner}'s ${victimType} stepped on a ${trapType} trap at (${position.q}, ${position.r})!`);
      break;
    }

    case "card_played": {
      const { playerId: pid, cardName, target } = serverEvent;
      const targetStr = target && typeof target === "object" && "q" in target
        ? ` on (${target.q}, ${target.r})`
        : "";
      push(pid, `${pid} played ${cardName}${targetStr}`);
      break;
    }

    case "card_effect_failed": {
      const { playerId: pid, cardName, reason } = serverEvent;
      push(pid, `❌ ${cardName} failed: ${reason}`);
      break;
    }

    case "damage_applied": {
      const { attackerType, attackerOwner, targetType, targetOwner, amount, remainingHp, targetPosition } = serverEvent;
      push(attackerOwner,
        `${attackerOwner}'s ${attackerType} hits ${targetOwner}'s ${targetType} for ${amount} dmg (${remainingHp} hp left)`
      );
      
      if (targetPosition) {
        damagePopupsStore.update(popups => [...popups, {
          id: `dmg_${Date.now()}_${Math.random()}`,
          amount,
          q: targetPosition.q,
          r: targetPosition.r,
          timestamp: Date.now()
        }]);
      }
      break;
    }

    case "unit_killed": {
      const { unitType, ownerId, killedBy } = serverEvent;
      push(killedBy, `💀 ${killedBy}'s unit KO'd ${ownerId}'s ${unitType}`);
      break;
    }

    case "building_destroyed": {
      const { buildingType, ownerId, destroyedBy } = serverEvent;
      const isTower = buildingType === "cat tower";
      push(destroyedBy,
        isTower
          ? `🔥 ${destroyedBy} destroyed ${ownerId}'s Cat Tower!`
          : `${destroyedBy} destroyed ${ownerId}'s ${buildingType}`
      );
      break;
    }

    case "player_eliminated": {
      const { playerId: pid } = serverEvent;
      combatLogStore.update(log => [...log, {
        turn,
        playerId: pid,
        text: `☠️ ${pid} has been eliminated!`,
        color: "neutral" as const,
        isHeader: true
      }]);
      break;
    }

    case "unit_molted": {
      const { playerId: pid, fromType, toType, position } = serverEvent;
      push(pid, `✨ ${pid}'s ${fromType} molted into ${toType}!`);
      break;
    }

    case "turn_ended": {
      const { playerId: pid, turn: t, nextPlayerId } = serverEvent;
      combatLogStore.update(log => [...log,
        { turn: t, playerId: pid, text: `${pid} ends their turn.`, color: playerColor(pid) },
        { turn: t + 1, playerId: "", text: `Turn ${t + 1}`, color: "neutral" as const, isHeader: true }
      ]);
      break;
    }
  }
}


export function sendCommand(command: ClientCommand) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(command));
  } else {
    console.warn("Socket not open, cannot send block:", command);
  }
}

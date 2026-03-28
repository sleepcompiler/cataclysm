import { writable, get, derived } from "svelte/store";
import type { GameState, ClientCommand, PlayerId } from "@hex-strategy/shared";

// ── Identity ─────────────────────────────────────────────────────────────────
// Persistent player UUID — generated once, survives refreshes, links to an
// account later when we add ranked.
function getOrCreatePlayerId(): string {
  let id = localStorage.getItem("playerId");
  if (!id) {
    id = `player_${crypto.randomUUID()}`;
    localStorage.setItem("playerId", id);
  }
  return id;
}

function getPlayerName(): string {
  return localStorage.getItem("playerName") ?? "Anon";
}

export function savePlayerName(name: string) {
  localStorage.setItem("playerName", name);
  playerNameStore.set(name);
}

export const playerNameStore = writable<string>(getPlayerName());

// ── Game State ────────────────────────────────────────────────────────────────
export const gameStateStore = writable<GameState | null>(null);
export const playerCatnipStore = writable<number>(0);
export const playerIdStore = writable<PlayerId | null>(getOrCreatePlayerId());
export const activeMatchIdStore = writable<string | null>(null);

// UI State
export const selectedCardIdStore = writable<string | null>(null);
export const selectedTileStore = writable<{q: number, r: number} | null>(null);
export const selectedUnitIdStore = writable<string | null>(null);
export const projectedCatnipStore = writable<number>(0);
export const projectedHandStore = writable<import("@hex-strategy/shared").Card[]>([]);
export const hasEndedTurnStore = writable<boolean>(false);

// ── Lobby State ───────────────────────────────────────────────────────────────
export type LobbyStatus = "idle" | "queued" | "in_private" | "in_match";
export const lobbyStatusStore = writable<LobbyStatus>("idle");
export const queuePositionStore = writable<number>(0);
export const privateCodeStore = writable<string | null>(null);
export const lobbyErrorStore = writable<string | null>(null);

// ── Combat Log ────────────────────────────────────────────────────────────────
export interface CombatLogEntry {
  turn: number;
  playerId: string;
  text: string;
  color: "blue" | "red" | "neutral";
  isHeader?: boolean;
}
export const combatLogStore = writable<CombatLogEntry[]>([]);

export interface DamagePopup {
  id: string;
  amount: number;
  q: number;
  r: number;
  timestamp: number;
}
export const damagePopupsStore = writable<DamagePopup[]>([]);

export const isMyTurnStore = derived(
  [gameStateStore, playerIdStore],
  ([$state, $pid]) => {
    if (!$state || !$pid) return false;
    return $state.currentTurnPlayer === $pid;
  }
);

// ── Socket ────────────────────────────────────────────────────────────────────
let socket: WebSocket | null = null;
let pendingMessages: string[] = []; // messages queued before socket is open

function safeSend(msg: object) {
  const json = JSON.stringify(msg);
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(json);
  } else if (socket && socket.readyState === WebSocket.CONNECTING) {
    pendingMessages.push(json);
  }
}

function playerColor(playerId: string): "blue" | "red" {
  return playerId === get(playerIdStore) ? "blue" : "red";
}

export function connectLobby() {
  if (socket && socket.readyState === WebSocket.OPEN) return;
  
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.hostname === "localhost" ? "localhost:3001" : window.location.host;
  socket = new WebSocket(`${protocol}//${host}`);

  socket.addEventListener("open", () => {
    // Send our identity right away so the server knows who we are before
    // we even join a queue — prevents anon_xxxxx IDs showing up in matches.
    socket?.send(JSON.stringify({ type: "identify", playerId: get(playerIdStore), name: get(playerNameStore) }));
    // Flush anything that was queued before the socket came up
    for (const msg of pendingMessages) socket?.send(msg);
    pendingMessages = [];
  });

  socket.addEventListener("message", (event) => {
    try {
      const payload = JSON.parse(event.data);
      handleServerMessage(payload);
    } catch (e) {
      console.error("WS parse error", e);
    }
  });

  socket.addEventListener("close", () => {
    gameStateStore.set(null);
    lobbyStatusStore.set("idle");
  });
}

function handleServerMessage(payload: any) {
  const myId = get(playerIdStore)!;

  switch (payload.type) {
    case "queue_joined":
      lobbyStatusStore.set("queued");
      queuePositionStore.set(payload.position);
      break;

    case "private_created":
      lobbyStatusStore.set("in_private");
      privateCodeStore.set(payload.code);
      break;

    case "match_found":
      lobbyStatusStore.set("in_match");
      activeMatchIdStore.set(payload.matchId);
      // The server already added us to the session when startMatch ran —
      // but we still send init so it can register our WS against our player slot.
      socket?.send(JSON.stringify({ type: "init", matchId: payload.matchId, playerId: payload.playerId }));
      break;

    case "state_update":
      applyStateUpdate(payload.state as GameState, myId);
      break;

    case "events":
      for (const ev of payload.events) handleServerEvent(ev, myId);
      break;

    case "error":
      lobbyErrorStore.set(payload.message);
      break;
  }
}

import { getSelectedDeck } from "./deckStore";

export function joinQueue() {
  lobbyErrorStore.set(null);
  connectLobby();
  safeSend({ type: "join_queue", deck: getSelectedDeck().cards });
}

export function leaveQueue() {
  socket?.send(JSON.stringify({ type: "leave_queue" }));
  lobbyStatusStore.set("idle");
}

export function createPrivateMatch() {
  lobbyErrorStore.set(null);
  connectLobby();
  safeSend({ type: "create_private", deck: getSelectedDeck().cards });
}

export function joinPrivateMatch(code: string) {
  lobbyErrorStore.set(null);
  connectLobby();
  safeSend({ type: "join_private", code, deck: getSelectedDeck().cards });
}

// ── Game state helpers (unchanged) ───────────────────────────────────────────
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

  const getPlayerName = (pid: string) => {
    const s = get(gameStateStore);
    return s?.players[pid]?.name ?? pid;
  };

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
      const { playerId: pid, unitType, to } = serverEvent;
      const name = getPlayerName(pid);
      push(pid, `${name}'s ${unitType} moves to (${to.q}, ${to.r})`);
      break;
    }
    case "trap_triggered": {
      const { trapType, victimType, victimOwner, position } = serverEvent;
      const name = getPlayerName(victimOwner);
      push(victimOwner, `${name}'s ${victimType} stepped on a ${trapType} trap at (${position.q}, ${position.r})!`);
      break;
    }
    case "card_played": {
      const { playerId: pid, cardName, target } = serverEvent;
      const name = getPlayerName(pid);
      const tgt = target && typeof target === "object" && "q" in target ? ` on (${target.q}, ${target.r})` : "";
      push(pid, `${name} played ${cardName}${tgt}`);
      break;
    }
    case "card_effect_failed": {
      const { playerId: pid, cardName, reason } = serverEvent;
      const name = getPlayerName(pid);
      push(pid, `❌ ${cardName} failed for ${name}: ${reason}`);
      break;
    }
    case "damage_applied": {
      const { attackerType, attackerOwner, targetType, targetOwner, amount, remainingHp, targetPosition } = serverEvent;
      const atkName = getPlayerName(attackerOwner);
      const tgtName = getPlayerName(targetOwner);
      push(attackerOwner, `${atkName}'s ${attackerType} hits ${tgtName}'s ${targetType} for ${amount} dmg (${remainingHp} hp left)`);
      if (targetPosition) {
        damagePopupsStore.update(p => [...p, {
          id: `dmg_${Date.now()}_${Math.random()}`,
          amount, q: targetPosition.q, r: targetPosition.r, timestamp: Date.now()
        }]);
      }
      break;
    }
    case "unit_killed": {
      const { unitType, ownerId, killedBy } = serverEvent;
      const killerName = getPlayerName(killedBy);
      const victimName = getPlayerName(ownerId);
      push(killedBy, `💀 ${killerName}'s unit KO'd ${victimName}'s ${unitType}`);
      break;
    }
    case "building_destroyed": {
      const { buildingType, ownerId, destroyedBy } = serverEvent;
      const killerName = getPlayerName(destroyedBy);
      const ownerName = getPlayerName(ownerId);
      push(destroyedBy, buildingType === "cat tower"
        ? `🔥 ${killerName} destroyed ${ownerName}'s Cat Tower!`
        : `${killerName} destroyed ${ownerName}'s ${buildingType}`);
      break;
    }
    case "player_eliminated": {
      const { playerId: pid } = serverEvent;
      const name = getPlayerName(pid);
      combatLogStore.update(log => [...log, { turn, playerId: pid, text: `☠️ ${name} has been eliminated!`, color: "neutral" as const, isHeader: true }]);
      break;
    }
    case "unit_molted": {
      const { playerId: pid, fromType, toType } = serverEvent;
      const name = getPlayerName(pid);
      push(pid, `✨ ${name}'s ${fromType} molted into ${toType}!`);
      break;
    }
    case "turn_ended": {
      const { playerId: pid, turn: t } = serverEvent;
      const name = getPlayerName(pid);
      combatLogStore.update(log => [...log,
        { turn: t, playerId: pid, text: `${name} ends their turn.`, color: playerColor(pid) },
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
    console.warn("Socket not open, cannot send:", command);
  }
}

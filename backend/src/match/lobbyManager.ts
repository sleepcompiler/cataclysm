import { WebSocket } from "ws";
import { MatchManager, generateMatchCode } from "./matchManager";

// Socket shape expected from the WS layer — playerId gets set on connection/init
interface LobbySocket extends WebSocket {
  playerId?: string;
  playerName?: string;
  deck?: string[];
}


export class LobbyManager {
  private queue: LobbySocket[] = [];
  private privatePending: Map<string, { ws: LobbySocket, deck?: string[] }> = new Map();

  constructor(private matchManager: MatchManager) {}

  joinQueue(ws: LobbySocket, deck?: string[]) {
    if (!ws.playerId) return;

    // Check if this player ID is already in the queue from another tab
    const alreadyQueuedIdx = this.queue.findIndex(s => s.playerId === ws.playerId);
    if (alreadyQueuedIdx !== -1) {
      if (this.queue[alreadyQueuedIdx] !== ws) {
        ws.send(JSON.stringify({ type: "error", message: "Already in queue in another tab" }));
        return;
      }
      // If same socket but new deck, update it
      this.queue[alreadyQueuedIdx].deck = deck;
      return;
    }

    ws.deck = deck;
    this.queue.push(ws);

    ws.send(JSON.stringify({ type: "queue_joined", position: this.queue.length }));

    // FCFS — pair up the moment we have 2 UNIQUE players
    if (this.queue.length >= 2) {
      const [a, b] = this.queue.splice(0, 2);
      this.startMatch([a, b]);
    }
  }

  leaveQueue(ws: LobbySocket) {
    this.queue = this.queue.filter(s => s !== ws);
  }

  createPrivate(ws: LobbySocket, deck?: string[]) {
    const code = generateMatchCode();
    this.privatePending.set(code, { ws, deck });
    ws.send(JSON.stringify({ type: "private_created", code }));
  }

  joinPrivate(ws: LobbySocket, code: string, deck?: string[]): boolean {
    if (!ws.playerId) return false;
    const pending = this.privatePending.get(code);

    if (!pending || pending.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    if (pending.ws.playerId === ws.playerId) {
      ws.send(JSON.stringify({ type: "error", message: "You cannot match against yourself" }));
      return true;
    }

    ws.deck = deck;
    pending.ws.deck = pending.deck;

    this.privatePending.delete(code);
    this.startMatch([pending.ws, ws], code);
    return true;
  }

  // Removes a socket from any lobby state on disconnect
  cleanup(ws: LobbySocket) {
    this.leaveQueue(ws);
    for (const [code, pending] of this.privatePending) {
      if (pending.ws === ws) this.privatePending.delete(code);
    }
  }

  private startMatch(sockets: LobbySocket[], privateCode?: string) {
    const playerConfigs = sockets.map(s => ({
      id: s.playerId ?? `anon_${Math.random().toString(36).slice(2, 7)}`,
      name: s.playerName ?? "Anon",
      deck: s.deck
    }));

    const session = this.matchManager.createMatch(playerConfigs, Date.now(), privateCode);

    sockets.forEach((s, i) => {
      const config = playerConfigs[i];
      session.addClient(config.id, s);
      s.send(JSON.stringify({
        type: "match_found",
        matchId: session.getMatchId(),
        matchCode: session.getMatchCode(),
        playerId: config.id,
      }));
    });
  }
}

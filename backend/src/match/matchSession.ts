import { WebSocket } from "ws";
import { Match } from "./match";

export class MatchSession {
  private clients: Map<string, WebSocket> = new Map();
  private spectators: Set<WebSocket> = new Set();

  constructor(private match: Match) {
    match.setEventCallback((events) => this.broadcast(events));
  }

  addClient(playerId: string, ws: WebSocket) {
    this.clients.set(playerId, ws);
  }

  removeClient(playerId: string) {
    this.clients.delete(playerId);
  }

  addSpectator(ws: WebSocket) {
    this.spectators.add(ws);
  }

  removeSpectator(ws: WebSocket) {
    this.spectators.delete(ws);
  }

  isParticipant(playerId: string): boolean {
    return this.match.players.some(p => p.id === playerId);
  }

  handleCommand(playerId: string, command: any) {
    this.match.queueCommand(playerId, command);
  }

  getMatchId() {
    return this.match.id;
  }

  getMatchCode() {
    return this.match.matchCode;
  }

  getState(playerId: string) {
    return this.match.getState(playerId);
  }

  private broadcast(events: any[]) {
    // Send to participants
    for (const ws of this.clients.values()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "events", events }));
      }
    }
    // Send to spectators
    for (const ws of this.spectators) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "events", events }));
      }
    }
  }
}

import { Match } from "./match";
import { MatchSession } from "./matchSession";
import { ClientCommand, PlayerId } from "@hex-strategy/shared";

function generateId() {
  return `match_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

export function generateMatchCode() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

export class MatchManager {
  private sessions: Map<string, MatchSession> = new Map();
  private codeToId: Map<string, string> = new Map();

  createMatch(players: { id: PlayerId, name: string, deck?: string[] }[], seed: number, providedCode?: string) {
    const code = providedCode || generateMatchCode();
    const match = new Match(generateId(), code, players, seed);
    const session = new MatchSession(match);
    
    this.sessions.set(match.id, session);
    this.codeToId.set(code, match.id);
    
    return session;
  }

  getSession(matchId: string) {
    return this.sessions.get(matchId);
  }

  getSessionByCode(code: string) {
    const id = this.codeToId.get(code.toUpperCase());
    return id ? this.sessions.get(id) : undefined;
  }

  handlePlayerAction(matchId: string, playerId: PlayerId, command: ClientCommand) {
    const session = this.sessions.get(matchId);
    if (!session) {
      console.warn(`[MatchManager] No session for ${matchId}`);
      return;
    }
    session.handleCommand(playerId, command);
  }
}

export const matchManager = new MatchManager();

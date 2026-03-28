import { Match } from "./match";
import { MatchSession } from "./matchSession";
import { ClientCommand, PlayerId } from "@hex-strategy/shared";

function generateId() {
  return `match_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

export class MatchManager {
  private sessions: Map<string, MatchSession> = new Map();

  createMatch(players: { id: PlayerId, name: string, deck?: string[] }[], seed: number) {
    const match = new Match(generateId(), players, seed);
    const session = new MatchSession(match);
    this.sessions.set(match.id, session);
    return session;
  }

  getSession(matchId: string) {
    return this.sessions.get(matchId);
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

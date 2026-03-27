import { WebSocket } from 'ws';
import { Match } from './match';
import { ClientCommand, PlayerId } from '@hex-strategy/shared';

export class MatchManager {
  private matches: Map<string, Match> = new Map();

  createMatch(players: PlayerId[], seed: number) {
    const matchId = `match_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const match = new Match(matchId, players, seed);
    this.matches.set(matchId, match);
    return match;
  }

  getMatch(id: string) {
    return this.matches.get(id);
  }

  handlePlayerAction(matchId: string, playerId: PlayerId, command: ClientCommand) {
    console.log(`[MatchManager] Routing action ${command.type} to ${matchId} for ${playerId}`);
    const match = this.matches.get(matchId);
    if (!match) {
        console.warn(`[MatchManager] Match ${matchId} not found!`);
        return;
    }

    match.queueCommand(playerId, command);
  }
}

export const matchManager = new MatchManager();

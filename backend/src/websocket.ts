import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { parseClientCommand } from "./networking/commandParser";
import { MatchManager } from "./match/matchManager";
import { LobbyManager } from "./match/lobbyManager";

interface ExtWebSocket extends WebSocket {
  playerId?: string;
  playerName?: string;
  matchId?: string;
}

export function setupWebSocketServer(server: Server, matchManager: MatchManager, lobbyManager: LobbyManager) {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws: ExtWebSocket) => {
    ws.on("message", (raw: string) => {
      let data: any;
      try {
        data = JSON.parse(raw.toString());
      } catch {
        return;
      }

      // Client stamps itself with a persistent ID before doing anything else
      if (data.type === "identify") {
        ws.playerId = data.playerId;
        ws.playerName = data.name;
        return;
      }

      // Lobby commands — handled before a match exists
      if (data.type === "join_queue") {
        lobbyManager.joinQueue(ws, data.deck);
        return;
      }
      if (data.type === "leave_queue") {
        lobbyManager.leaveQueue(ws);
        return;
      }
      if (data.type === "create_private") {
        lobbyManager.createPrivate(ws, data.deck);
        return;
      }
      if (data.type === "join_private") {
        const handledInLobby = lobbyManager.joinPrivate(ws, data.code, data.deck);
        if (handledInLobby) return;

        // If not in lobby, check if it's an active match we can rejoin or spectate
        const session = matchManager.getSessionByCode(data.code);
        if (!session) {
          ws.send(JSON.stringify({ type: "error", message: "invalid or expired code" }));
          return;
        }

        const isPlayer = session.isParticipant(ws.playerId!);
        ws.send(JSON.stringify({
          type: "match_found",
          matchId: session.getMatchId(),
          matchCode: session.getMatchCode(),
          playerId: ws.playerId,
          isSpectator: !isPlayer
        }));
        return;
      }

      // Init — client acks a match_found and registers with the session
      if (data.type === "init") {
        ws.playerId = data.playerId;
        ws.matchId = data.matchId;

        const session = matchManager.getSession(ws.matchId!);
        if (session) {
          if (data.isSpectator) {
            session.addSpectator(ws);
          } else {
            session.addClient(ws.playerId!, ws);
          }
          ws.send(JSON.stringify({ type: "state_update", state: session.getState(ws.playerId!) }));
        }
        return;
      }

      // Game command — must already be in a match
      if (!ws.playerId || !ws.matchId) return;

      const command = parseClientCommand(data);
      if (!command) return;

      matchManager.handlePlayerAction(ws.matchId, ws.playerId, command);
    });

    ws.on("close", () => {
      lobbyManager.cleanup(ws);
      if (ws.matchId && ws.playerId) {
        matchManager.getSession(ws.matchId)?.removeClient(ws.playerId);
      }
    });
  });
}

import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { parseClientCommand } from "./networking/commandParser";
import { matchManager } from "./match/matchManager";

interface ExtWebSocket extends WebSocket {
  playerId?: string;
  matchId?: string;
}

export function setupWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws: ExtWebSocket) => {
    console.log("Client connected");

    ws.on("message", (message: string) => {
      // 1. Check for initialization payload first
      try {
        const raw = JSON.parse(message.toString());
        if (!ws.playerId || !ws.matchId) {
          if (raw.type === "init") {
            ws.playerId = raw.playerId;
            ws.matchId = raw.matchId;

            const matchIdStr: string = ws.matchId || "";
            const match = matchManager.getMatch(matchIdStr);
            if (match) {
              // Ensure the match knows how to broadcast if it doesn't already
              if (!match.onEventsGenerated) {
                match.onEventsGenerated = (events) => {
                  wss.clients.forEach((c: any) => {
                    if (c.matchId === match.id && c.readyState === WebSocket.OPEN) {
                      c.send(JSON.stringify({ type: "events", events }));
                    }
                  });
                };
              }
              
              if (!match.isPlayerConnected) {
                match.isPlayerConnected = (pid: string) => {
                  let found = false;
                  wss.clients.forEach((c: any) => {
                    if (c.matchId === match.id && c.playerId === pid && c.readyState === WebSocket.OPEN) {
                       found = true;
                    }
                  });
                  return found;
                };
              }

              ws.send(JSON.stringify({ type: "state_update", state: match.getState(ws.playerId) }));
            }
          }
          return;
        }
      } catch (e) {
        // Fall back to actual valid commands if parsed normally
      }

      // 2. Must be regular command, validate it
      const parsed = parseClientCommand(message.toString());
      if (!parsed || !ws.playerId || !ws.matchId) {
        console.log("Invalid/Ignored payload or missing auth:", message.toString());
        return;
      }

      console.log(`[WS] Received valid action from ${ws.playerId}:`, parsed.type);

      // Valid game command from registered socket
      matchManager.handlePlayerAction(ws.matchId, ws.playerId, parsed);
    });

    ws.on("close", () => {
      console.log(`Client disconnected: ${ws.playerId}`);
    });
  });
}

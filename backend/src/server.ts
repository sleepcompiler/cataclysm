import express from "express";
import http from "http";
import { setupWebSocketServer } from "./websocket";
import { initializeDb } from "./db/db";
import { matchManager } from "./match/matchManager";

const app = express();
const server = http.createServer(app);

app.use(express.json());

// Basic health check
app.get("/health", (req, res) => {
  res.send({ status: "ok" });
});

setupWebSocketServer(server);

const PORT = process.env.PORT || 3001;

async function start() {
  try {
    // await initializeDb(); // Uncomment when DB is actually running
    console.log("Database initialized (mocked if commented)");
    
    // Create a mock match so the client has something to connect to
    // In a real app, this would happen via a /match/create REST endpoint or lobby system
    const match = matchManager.createMatch(["player1", "player2"], 12345);
    // Force ID for testing compatibility with App.svelte
    match.id = "match_test_123";
    matchManager["matches"].set(match.id, match);
    console.log(`Created mock match with id: ${match.id}`);

    server.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server", err);
    process.exit(1);
  }
}

start();

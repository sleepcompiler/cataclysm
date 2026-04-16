import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { setupWebSocketServer } from "./websocket";
import { MatchManager } from "./match/matchManager";
import { LobbyManager } from "./match/lobbyManager";
import { db } from "./db/store";
import { hashPassword, verifyPassword, createSession, validateSession, deleteSession, generateId } from "./auth/auth";

// ─── MIME Types ────────────────────────────────────────────────────────────────

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".mjs":  "application/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
  ".woff": "font/woff",
  ".woff2":"font/woff2",
};

const frontendDist = path.join(__dirname, "../../frontend/dist");

function serveStatic(res: http.ServerResponse, filePath: string): boolean {
  if (!fs.existsSync(filePath)) return false;
  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] ?? "application/octet-stream";
  const content = fs.readFileSync(filePath);
  res.writeHead(200, { "Content-Type": mime });
  res.end(content);
  return true;
}

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  const json = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(json);
}

function readBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      try { resolve(JSON.parse(raw)); }
      catch { reject(new Error("Invalid JSON")); }
    });
    req.on("error", reject);
  });
}

function extractToken(req: http.IncomingMessage): string | null {
  const auth = req.headers["authorization"] ?? "";
  if (auth.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

// ─── ELO ──────────────────────────────────────────────────────────────────────

const BASE_ELO = 1200;
const K = 32;

function expectedScore(a: number, b: number): number {
  return 1 / (1 + Math.pow(10, (b - a) / 400));
}

function calcEloDeltas(
  aElo: number,
  bElo: number,
  result: "a" | "b" | "draw"
): { a: number; b: number } {
  const ea = expectedScore(aElo, bElo);
  const sa = result === "a" ? 1 : result === "draw" ? 0.5 : 0;
  const da = Math.round(K * (sa - ea));
  return { a: da, b: -da };
}

// ─── Request Handler ───────────────────────────────────────────────────────────

async function handleRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse
): Promise<void> {
  const url = new URL(req.url ?? "/", `http://localhost`);
  const pathname = url.pathname;
  const method = req.method ?? "GET";

  // CORS headers for local dev
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  // ── Health ──────────────────────────────────────────────────────────────────
  if (pathname === "/health" && method === "GET") {
    sendJson(res, 200, { status: "ok" });
    return;
  }

  // ── Auth: Register ──────────────────────────────────────────────────────────
  if (pathname === "/api/register" && method === "POST") {
    let body: any;
    try { body = await readBody(req); } catch { sendJson(res, 400, { error: "Bad JSON" }); return; }

    const { username, password } = body ?? {};
    if (!username || !password || username.length < 3 || password.length < 6) {
      sendJson(res, 400, { error: "username ≥ 3 chars, password ≥ 6 chars" });
      return;
    }
    if (db.findOne("users", (u) => u.username.toLowerCase() === username.toLowerCase())) {
      sendJson(res, 409, { error: "Username already taken" });
      return;
    }
    const user = { id: generateId(), username, passwordHash: hashPassword(password), createdAt: Date.now() };
    db.insert("users", user);
    db.insert("ratings", { userId: user.id, elo: BASE_ELO, wins: 0, losses: 0, draws: 0, lastPlayedAt: Date.now() });
    const token = createSession(user.id);
    sendJson(res, 201, { token, userId: user.id, username });
    return;
  }

  // ── Auth: Login ─────────────────────────────────────────────────────────────
  if (pathname === "/api/login" && method === "POST") {
    let body: any;
    try { body = await readBody(req); } catch { sendJson(res, 400, { error: "Bad JSON" }); return; }

    const { username, password } = body ?? {};
    const user = db.findOne("users", (u) => u.username.toLowerCase() === username?.toLowerCase());
    if (!user || !verifyPassword(password, user.passwordHash)) {
      sendJson(res, 401, { error: "Invalid credentials" });
      return;
    }
    const token = createSession(user.id);
    sendJson(res, 200, { token, userId: user.id, username: user.username });
    return;
  }

  // ── Auth: Logout ────────────────────────────────────────────────────────────
  if (pathname === "/api/logout" && method === "POST") {
    const token = extractToken(req);
    if (token) deleteSession(token);
    sendJson(res, 200, { ok: true });
    return;
  }

  // ── Ladder ──────────────────────────────────────────────────────────────────
  if (pathname === "/api/ladder" && method === "GET") {
    const page = parseInt(url.searchParams.get("page") ?? "1", 10);
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 100);
    const offset = (page - 1) * limit;

    const ratings = [...db.get("ratings")]
      .sort((a, b) => b.elo - a.elo)
      .slice(offset, offset + limit)
      .map((r, i) => {
        const user = db.findOne("users", (u) => u.id === r.userId);
        return {
          rank: offset + i + 1,
          username: user?.username ?? "Unknown",
          elo: r.elo,
          wins: r.wins,
          losses: r.losses,
          draws: r.draws,
        };
      });

    sendJson(res, 200, { page, limit, ratings });
    return;
  }

  // ── Me ───────────────────────────────────────────────────────────────────────
  if (pathname === "/api/me" && method === "GET") {
    const token = extractToken(req);
    const userId = token ? validateSession(token) : null;
    if (!userId) { sendJson(res, 401, { error: "Unauthorized" }); return; }

    const user = db.findOne("users", (u) => u.id === userId);
    const rating = db.findOne("ratings", (r) => r.userId === userId);
    if (!user) { sendJson(res, 404, { error: "User not found" }); return; }
    sendJson(res, 200, { userId: user.id, username: user.username, rating });
    return;
  }

  // ── Static file serving ─────────────────────────────────────────────────────
  if (method === "GET") {
    // Try exact path in dist
    const fsPath = path.join(frontendDist, pathname);
    if (serveStatic(res, fsPath)) return;

    // SPA fallback — serve index.html for all unknown GET requests
    const indexPath = path.join(frontendDist, "index.html");
    if (serveStatic(res, indexPath)) return;
  }

  // Fallthrough — 404
  sendJson(res, 404, { error: "Not found" });
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

const matchManager = new MatchManager();
const lobbyManager = new LobbyManager(matchManager);

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((err) => {
    console.error("[server] Unhandled error:", err);
    if (!res.headersSent) sendJson(res, 500, { error: "Internal server error" });
  });
});

setupWebSocketServer(server, matchManager, lobbyManager);

const PORT = process.env.PORT ?? 3001;
server.listen(PORT, () => {
  console.log(`[server] Listening on http://localhost:${PORT}`);
});

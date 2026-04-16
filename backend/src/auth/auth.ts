import crypto from "node:crypto";

// ─── Password Hashing (native scrypt) ─────────────────────────────────────────

const SALT_BYTES = 32;
const KEY_LEN = 64;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 };

/**
 * Hash a plaintext password. Returns a single string encoding both salt and
 * hash so we can store it as one column.
 * Format: `scrypt:<hex salt>:<hex hash>`
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SALT_BYTES);
  const hash = crypto.scryptSync(password, salt, KEY_LEN, SCRYPT_PARAMS);
  return `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`;
}

/**
 * Verify a plaintext password against a stored hash string.
 * Uses `timingSafeEqual` to prevent timing attacks.
 */
export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = Buffer.from(parts[1], "hex");
  const storedHash = Buffer.from(parts[2], "hex");
  try {
    const hash = crypto.scryptSync(password, salt, KEY_LEN, SCRYPT_PARAMS);
    return crypto.timingSafeEqual(hash, storedHash);
  } catch {
    return false;
  }
}

// ─── Session Tokens ────────────────────────────────────────────────────────────

/**
 * In-memory token store. Tokens are ephemeral — they are invalidated on server
 * restart. Good enough for now; we can persist them to the JSON store if needed.
 */
const sessions = new Map<string, { userId: string; expiresAt: number }>();

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function createSession(userId: string): string {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, { userId, expiresAt: Date.now() + SESSION_TTL_MS });
  return token;
}

export function validateSession(token: string): string | null {
  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return null;
  }
  return session.userId;
}

export function deleteSession(token: string): void {
  sessions.delete(token);
}

// ─── UUID Generator ────────────────────────────────────────────────────────────

/** Native UUID v4 (no external lib needed — available in Node 14.17+). */
export function generateId(): string {
  return crypto.randomUUID();
}

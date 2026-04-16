import fs from "node:fs";
import path from "node:path";

// ─── Data Shape ────────────────────────────────────────────────────────────────

export interface UserRecord {
  id: string;         // UUID v4
  username: string;
  passwordHash: string;
  createdAt: number;  // epoch ms
}

export interface RatingRecord {
  userId: string;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
  lastPlayedAt: number; // epoch ms
}

export interface MatchRecord {
  id: string;           // UUID v4
  playerIds: string[];
  winnerId: string | null; // null for draw
  eloChanges: Record<string, number>; // userId -> delta
  playedAt: number;     // epoch ms
}

export interface DBSchema {
  users: UserRecord[];
  ratings: RatingRecord[];
  matches: MatchRecord[];
}

// ─── Default Empty Database ────────────────────────────────────────────────────

const EMPTY_DB: DBSchema = {
  users: [],
  ratings: [],
  matches: [],
};

// ─── Store Class ───────────────────────────────────────────────────────────────

export class JSONStore {
  private filePath: string;
  private tmpPath: string;
  private data: DBSchema;
  private dirty = false;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.tmpPath = filePath + ".tmp";
    this.data = this.loadSync();

    // Flush any pending writes when the process exits gracefully
    process.on("exit", () => this.flushSync());
    process.on("SIGINT", () => { this.flushSync(); process.exit(); });
    process.on("SIGTERM", () => { this.flushSync(); process.exit(); });
  }

  // ── Reads (instant — data is already in RAM) ─────────────────────────────

  get<K extends keyof DBSchema>(collection: K): DBSchema[K] {
    return this.data[collection];
  }

  findOne<K extends keyof DBSchema>(
    collection: K,
    predicate: (item: DBSchema[K][number]) => boolean
  ): DBSchema[K][number] | undefined {
    return (this.data[collection] as any[]).find(predicate) as any;
  }

  // ── Writes (mutate memory, schedule async flush) ─────────────────────────

  insert<K extends keyof DBSchema>(collection: K, item: DBSchema[K][number]): void {
    (this.data[collection] as any[]).push(item);
    this.schedule();
  }

  update<K extends keyof DBSchema>(
    collection: K,
    predicate: (item: DBSchema[K][number]) => boolean,
    updater: (item: DBSchema[K][number]) => void
  ): boolean {
    const item = (this.data[collection] as any[]).find(predicate);
    if (!item) return false;
    updater(item);
    this.schedule();
    return true;
  }

  upsert<K extends keyof DBSchema>(
    collection: K,
    predicate: (item: DBSchema[K][number]) => boolean,
    item: DBSchema[K][number]
  ): void {
    const idx = (this.data[collection] as any[]).findIndex(predicate);
    if (idx === -1) {
      (this.data[collection] as any[]).push(item);
    } else {
      (this.data[collection] as any[])[idx] = item;
    }
    this.schedule();
  }

  remove<K extends keyof DBSchema>(
    collection: K,
    predicate: (item: DBSchema[K][number]) => boolean
  ): number {
    const before = (this.data[collection] as any[]).length;
    (this.data as any)[collection] = (this.data[collection] as any[]).filter(
      (item: any) => !predicate(item)
    );
    const removed = before - (this.data[collection] as any[]).length;
    if (removed > 0) this.schedule();
    return removed;
  }

  // ── Persistence ───────────────────────────────────────────────────────────

  /**
   * Schedule an async debounced save (100ms delay).
   * All mutations within a single event-loop burst are collapsed into one write.
   */
  private schedule(): void {
    this.dirty = true;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.flushAsync(), 100);
  }

  /** Write to .tmp then atomically rename over the real file. */
  private flushAsync(): void {
    if (!this.dirty) return;
    this.dirty = false;
    this.saveTimer = null;
    const json = JSON.stringify(this.data, null, 2);
    fs.writeFile(this.tmpPath, json, "utf8", (err) => {
      if (err) {
        console.error("[store] Failed to write tmp file:", err);
        return;
      }
      fs.rename(this.tmpPath, this.filePath, (err2) => {
        if (err2) console.error("[store] Failed to rename to final file:", err2);
      });
    });
  }

  /** Synchronous flush — only called on process exit signals. */
  flushSync(): void {
    if (!this.dirty && !fs.existsSync(this.tmpPath)) return;
    const json = JSON.stringify(this.data, null, 2);
    fs.writeFileSync(this.tmpPath, json, "utf8");
    fs.renameSync(this.tmpPath, this.filePath);
    this.dirty = false;
  }

  /** Load the DB from disk. Returns an empty schema if the file doesn't exist yet. */
  private loadSync(): DBSchema {
    if (!fs.existsSync(this.filePath)) {
      console.log("[store] No existing DB file — starting with empty store.");
      return structuredClone(EMPTY_DB);
    }
    try {
      const raw = fs.readFileSync(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<DBSchema>;
      // Merge to ensure new collections added in future versions are present
      return {
        ...structuredClone(EMPTY_DB),
        ...parsed,
      };
    } catch (e) {
      console.error("[store] Failed to parse DB file — resetting to empty:", e);
      return structuredClone(EMPTY_DB);
    }
  }
}

// ─── Singleton Instance ────────────────────────────────────────────────────────

const DATA_DIR = path.join(__dirname, "../../../data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new JSONStore(path.join(DATA_DIR, "db.json"));

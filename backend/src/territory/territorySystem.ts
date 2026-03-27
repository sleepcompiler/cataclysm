import { GameState, TileId } from "@hex-strategy/shared";
import { hexDistance } from "../game/hexMath";

// how strong each thing's territorial claim is
// higher number beats lower number — building beats unit, cat tower beats everything
const CLAIM_STRENGTH = {
  cat_tree: 3,
  building: 2,
  unit: 1,
} as const;

interface TileClaim {
  owner: string;
  strength: number; // higher = harder to contest
}

export function calculateTerritory(state: GameState) {
  // best claim per tile per player
  // key = tile key, value = map of playerId -> best claim strength they have on that tile
  const claimsByTile: Record<string, Map<string, number>> = {};

  for (const key of Object.keys(state.map)) {
    claimsByTile[key] = new Map();
  }

  const pushClaim = (key: string, owner: string, strength: number) => {
    if (!claimsByTile[key]) return;
    const existing = claimsByTile[key].get(owner) ?? 0;
    if (strength > existing) claimsByTile[key].set(owner, strength);
  };

  // buildings project strong claims outward
  for (const b of Object.values(state.buildings)) {
    const strength = b.type === "cat_tree" ? CLAIM_STRENGTH.cat_tree : CLAIM_STRENGTH.building;
    const radius   = b.type === "cat_tree" ? 3 : 2;
    for (const key of Object.keys(state.map)) {
      const [q, r] = key.split(",").map(Number);
      if (hexDistance(b.position, { q, r }) <= radius) {
        pushClaim(key, b.owner, strength);
      }
    }
  }

  // units project weak claims — only 1 tile out
  for (const u of Object.values(state.units)) {
    for (const key of Object.keys(state.map)) {
      const [q, r] = key.split(",").map(Number);
      if (hexDistance(u.position, { q, r }) <= 1) {
        pushClaim(key, u.owner, CLAIM_STRENGTH.unit);
      }
    }
  }

  const resultingChanges: Record<string, string | undefined> = {};

  for (const key of Object.keys(state.map)) {
    const tile = state.map[key];
    const claims = claimsByTile[key];

    if (claims.size === 0) {
      // nobody's claiming this tile right now — it stays with whoever owns it
      // this is the sticky part: don't touch it
      continue;
    }

    if (claims.size === 1) {
      // unopposed — that player takes it outright
      const [newOwner] = claims.keys();
      if (tile.owner !== newOwner) {
        tile.owner = newOwner;
        resultingChanges[key] = newOwner;
      }
      continue;
    }

    // contested — find the strongest claim on this tile
    let bestStrength = -1;
    let bestOwner: string | undefined;
    let tie = false;

    for (const [owner, strength] of claims) {
      if (strength > bestStrength) {
        bestStrength = strength;
        bestOwner = owner;
        tie = false;
      } else if (strength === bestStrength) {
        tie = true; // two players tied
      }
    }

    if (tie) {
      // tied strength — current owner keeps it (territory is sticky)
      // if it's currently unowned, a tie means nobody takes it
      continue;
    }

    // clear winner — they take the tile
    if (tile.owner !== bestOwner) {
      tile.owner = bestOwner;
      resultingChanges[key] = bestOwner;
    }
  }

  return resultingChanges;
}

export function isTileInFriendlyTerritory(state: GameState, tileId: TileId, playerId: string): boolean {
  return state.map[`${tileId.q},${tileId.r}`]?.owner === playerId;
}

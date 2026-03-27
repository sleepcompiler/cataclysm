import { TileId, TerrainType, Tile, PlayerId } from "@hex-strategy/shared";
import { hexAdd, hexDistance, hexRange, hexRotateLeft } from "../game/hexMath";

// Simple pseudo-random number generator for deterministic seed based mapping
export class PRNG {
  private state: number;
  constructor(seed: number) {
    this.state = seed ? seed : Math.floor(Math.random() * 0xFFFFFF);
  }
  next() {
    this.state = (this.state * 1664525 + 1013904223) % 0x100000000;
    return this.state / 0x100000000;
  }
}

export function generateSymmetricMap(playerCount: number, seed: number) {
  const prng = new PRNG(seed);
  const radius = playerCount === 2 ? 7 : playerCount === 3 ? 8 : 9;
  const tiles: Record<string, Tile> = {};
  
  // 1. Generate Base Terrain Sector
  const baseSector: TileId[] = [];
  // For 6-way symmetry, we generate a wedge. For variable player count, we just generate random spots and then mirror them.
  // Actually the prompt says "rotate sector for each player".
  // A simple way is to generate water clusters, then rotate them for each player index.
  const numClusters = Math.floor(radius * 1.5);
  const waterClusters: TileId[] = [];
  for (let i = 0; i < numClusters; i++) {
    // Generate within our sector roughly
    const q = Math.floor(prng.next() * radius);
    const r = Math.floor(prng.next() * radius) - Math.floor(radius / 2);
    if (hexDistance({q:0, r:0}, {q, r}) <= radius) {
      waterClusters.push({q, r});
    }
  }

  // Determine rotations needed per player
  // 2 players: 180 degrees (3 lefts)
  // 3 players: 120 degrees (2 lefts)
  // 4 players is tricky on hex unless we do 2 and 2. 
  const rotationsPerPlayer = playerCount === 2 ? 3 : playerCount === 3 ? 2 : 1;
  const allWater: TileId[] = [];

  for (let p = 0; p < playerCount; p++) {
    for (const wc of waterClusters) {
      let rotated = { ...wc };
      for (let rot = 0; rot < p * rotationsPerPlayer; rot++) {
        rotated = hexRotateLeft(rotated);
      }
      allWater.push(rotated);
    }
  }

  // 4. Place player start positions at edges
  const startDist = radius - 1;
  const startPositions: TileId[] = [];
  for (let p = 0; p < playerCount; p++) {
    let start = { q: startDist, r: 0 }; // Right edge
    for (let rot = 0; rot < p * rotationsPerPlayer; rot++) {
      start = hexRotateLeft(start);
    }
    startPositions.push(start);
  }

  // Populate map and clear water near starts
  for (const hex of hexRange({q:0, r:0}, radius)) {
    const key = `${hex.q},${hex.r}`;
    
    // Check if near start
    let nearStart = false;
    for (const start of startPositions) {
      if (hexDistance(hex, start) <= 2) {
        nearStart = true;
      }
    }

    let isWater = allWater.some(w => w.q === hex.q && w.r === hex.r);
    if (nearStart) isWater = false;

    tiles[key] = {
      q: hex.q,
      r: hex.r,
      terrain: isWater ? "water" : "grass",
      owner: undefined,
    };
  }

  return { tiles, startPositions };
}

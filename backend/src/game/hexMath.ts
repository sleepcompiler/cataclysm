export const HEX_DIRECTIONS = [
  { q: 1, r: -1 },
  { q: 1, r: 0 },
  { q: 0, r: 1 },
  { q: -1, r: 1 },
  { q: -1, r: 0 },
  { q: 0, r: -1 },
];

export function hexAdd(a: {q: number, r: number}, b: {q: number, r: number}) {
  return { q: a.q + b.q, r: a.r + b.r };
}

export function hexSubtract(a: {q: number, r: number}, b: {q: number, r: number}) {
  return { q: a.q - b.q, r: a.r - b.r };
}

export function getNeighbors(q: number, r: number) {
  return HEX_DIRECTIONS.map(dir => hexAdd({q, r}, dir));
}

export function hexLength(hex: {q: number, r: number}) {
  return Math.max(Math.abs(hex.q), Math.abs(hex.r), Math.abs(-hex.q - hex.r));
}

export function hexDistance(a: {q: number, r: number}, b: {q: number, r: number}) {
  return hexLength(hexSubtract(a, b));
}

export function hexRange(center: {q: number, r: number}, radius: number) {
  const results = [];
  for (let q = -radius; q <= radius; q++) {
    for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) {
      results.push(hexAdd(center, { q, r }));
    }
  }
  return results;
}

// 60 degree rotation (counter-clockwise)
export function hexRotateLeft(hex: {q: number, r: number}) {
  return { q: -hex.r, r: hex.q + hex.r };
}

// 60 degree rotation (clockwise)
export function hexRotateRight(hex: {q: number, r: number}) {
  return { q: -hex.q - hex.r, r: hex.q };
}

export function getRotationForPlayer(baseHex: {q: number, r: number}, playerIndex: number, totalPlayers: number) {
  let hex = { q: baseHex.q, r: baseHex.r };
  // E.g. for 2 players, 180 degrees (3 left rotations)
  // For 3 players, 120 degrees (2 left rotations per index)
  // For 4 players, 90 degrees? Hexes natively support 60 deg rotations (6 steps). 
  // 4 players isn't perfectly symmetric on a hex grid if we rotate by 90. We usually do 2, 3, or 6 players.
  // The constraints said "Matches support 2-4 players". Let's handle 2, 3, 4.
  // We'll approximate or use specific angles.
  const rotations = totalPlayers === 2 ? 3 : totalPlayers === 3 ? 2 : 1; 
  for (let i = 0; i < playerIndex * rotations; i++) {
    hex = hexRotateLeft(hex);
  }
  return hex;
}

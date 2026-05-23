export const BASE_ELO = 1200;
export const K = 32;

export function expectedScore(a: number, b: number): number {
  return 1 / (1 + Math.pow(10, (b - a) / 400));
}

export function calcEloDeltas(
  aElo: number,
  bElo: number,
  result: "a" | "b" | "draw"
): { a: number; b: number } {
  const ea = expectedScore(aElo, bElo);
  const sa = result === "a" ? 1 : result === "draw" ? 0.5 : 0;
  const da = Math.round(K * (sa - ea));
  return { a: da, b: -da };
}

import { TileId, Tile } from "@hex-strategy/shared";

export class GameMap {
  private tiles: Record<string, Tile>;

  constructor(initialTiles: Record<string, Tile>) {
    this.tiles = initialTiles;
  }

  getTile(q: number, r: number): Tile | undefined {
    return this.tiles[`${q},${r}`];
  }

  setOwner(q: number, r: number, ownerId: string | undefined): void {
    const tile = this.getTile(q, r);
    if (tile) {
      tile.owner = ownerId;
    }
  }

  isPassable(q: number, r: number): boolean {
    const tile = this.getTile(q, r);
    return tile !== undefined && tile.terrain !== "water";
  }

  getAllTiles(): Tile[] {
    return Object.values(this.tiles);
  }
}

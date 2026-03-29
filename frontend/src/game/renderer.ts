import { HexGrid } from "./hexGrid";
import type { GameState, TileId, Card, Unit } from "@hex-strategy/shared";

// six axial neighbors — pointy top hex
const HEX_DIRS = [
  { q: 1, r: -1 }, { q: 1, r: 0 }, { q: 0, r: 1 },
  { q: -1, r: 1 }, { q: -1, r: 0 }, { q: 0, r: -1 },
];

// Sum a unit's base movement plus any active movement modifiers
function effectiveMovement(unit: Unit): number {
  const bonus = unit.modifiers?.reduce(
    (sum, m) => m.stat === "movement" ? sum + m.amount : sum, 0
  ) ?? 0;
  return unit.movement + bonus;
}

export class GameRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private grid: HexGrid;
  private state: GameState | null = null;
  private myPlayerId: string | null = null;
  private selectedTile: TileId | null = null;
  private actionQueue: {type: string, target?: TileId}[] = [];
  private selectedCard: Card | null = null;
  private selectedUnitId: string | null = null;
  // tiles the selected unit can actually walk to this turn
  private movementRange: Set<string> = new Set();
  private hoverTile: TileId | null = null;
  private isPortrait: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("no 2d context");
    this.ctx = context;
    const origin = { x: canvas.width / 2, y: canvas.height / 2 };
    this.grid = new HexGrid(40, origin);
  }

  public setState(state: GameState, playerId: string) {
    this.state = state;
    this.myPlayerId = playerId;
  }

  public setOrientation(isPortrait: boolean) {
    this.isPortrait = isPortrait;
  }

  public setActionQueue(queue: any[]) {
    this.actionQueue = queue;
  }

  public setSelectedCard(card: Card | null) {
    this.selectedCard = card;
  }

  public setSelectedUnit(unitId: string | null) {
    this.selectedUnitId = unitId;
    this.movementRange = new Set();

    if (unitId && this.state) {
      const unit = this.state.units[unitId];
      if (unit && !unit.hasMovedThisTurn) {
        this.movementRange = this.computeMovementRange(unit);
      }
    }
  }

  /** BFS outward from unit position, stopping at water/occupied-by-enemy tiles */
  private computeMovementRange(unit: Unit): Set<string> {
    if (!this.state) return new Set();

    // who's standing where
    const occupied = new Map<string, string>(); // key -> owner
    for (const u of Object.values(this.state.units)) {
      occupied.set(`${u.position.q},${u.position.r}`, u.owner);
    }
    for (const b of Object.values(this.state.buildings)) {
      occupied.set(`${b.position.q},${b.position.r}`, b.owner);
    }

    const reachable = new Set<string>();
    const range = effectiveMovement(unit);
    const queue: { q: number, r: number, stepsLeft: number }[] = [
      { q: unit.position.q, r: unit.position.r, stepsLeft: range }
    ];
    const visited = new Set<string>();
    visited.add(`${unit.position.q},${unit.position.r}`);

    while (queue.length > 0) {
      const { q, r, stepsLeft } = queue.shift()!;
      if (stepsLeft === 0) continue;

      for (const dir of HEX_DIRS) {
        const nq = q + dir.q, nr = r + dir.r;
        const key = `${nq},${nr}`;
        if (visited.has(key)) continue;
        visited.add(key);

        const tile = this.state.map[key];
        if (!tile || tile.terrain === "water") continue; // can't walk on water

        const occupant = occupied.get(key);
        if (occupant && occupant !== unit.owner) continue; // blocked by enemy

        reachable.add(key);
        queue.push({ q: nq, r: nr, stepsLeft: stepsLeft - 1 });
      }
    }

    return reachable;
  }

  /** Is a given tile a valid spawn for the current player? */
  public isValidSpawnTile(q: number, r: number): boolean {
    if (!this.state || !this.myPlayerId) return false;
    const tile = this.state.map[`${q},${r}`];
    if (!tile || tile.terrain === "water") return false;
    return tile.owner === this.myPlayerId;
  }

  /** Is a given tile in the selected unit's movement range? */
  public isInMovementRange(q: number, r: number): boolean {
    return this.movementRange.has(`${q},${r}`);
  }

  /** Returns the unit at a given tile owned by myPlayer, or null */
  public getMyUnitAt(q: number, r: number): Unit | null {
    if (!this.state || !this.myPlayerId) return null;
    return Object.values(this.state.units).find(
      u => u.owner === this.myPlayerId && u.position.q === q && u.position.r === r
    ) ?? null;
  }

  public hexToPixel(q: number, r: number) {
    const p = this.grid.hexToPixel(q, r);
    if (this.isPortrait) {
      const x1 = p.x - 600;
      const y1 = p.y - 400;
      const x2 = -y1;
      const y2 = x1;
      return { x: 400 + x2, y: 600 + y2 };
    }
    return p;
  }

  public setSelectedTile(tile: Readonly<TileId> | null) {
    this.selectedTile = tile ? { q: tile.q, r: tile.r } : null;
  }

  public setHoverTile(tile: Readonly<TileId> | null) {
    this.hoverTile = tile ? { q: tile.q, r: tile.r } : null;
  }

  public render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (!this.state) return;

    this.ctx.save();
    if (this.isPortrait) {
      this.ctx.translate(400, 600);
      this.ctx.rotate(Math.PI / 2);
      this.ctx.translate(-600, -400);
    }

    const isSpawnCard = this.selectedCard?.effects.some(
      e => e.type === "spawn_unit" || e.type === "spawn_building"
    ) ?? false;

    const isMoltCard = this.selectedCard?.effects.some(e => e.type === "molt_unit") ?? false;
    const moltsFrom = (this.selectedCard as any)?.moltsFrom as string | undefined;

    // base terrain
    for (const tile of Object.values(this.state.map)) {
      this.drawHex(tile.q, tile.r, tile.terrain === "water" ? "#add8e6" : "#90ee90");
    }

    // territory tint
    for (const tile of Object.values(this.state.map)) {
      if (tile.owner) {
        const color = tile.owner === this.myPlayerId
          ? "rgba(0, 0, 255, 0.2)"
          : "rgba(255, 0, 0, 0.2)";
        this.fillHex(tile.q, tile.r, color);
      }
    }

    // spawn zone overlay — green on friendly tiles when deploying, red on enemy/neutral
    if (isSpawnCard) {
      for (const tile of Object.values(this.state.map)) {
        if (tile.terrain === "water") continue;
        if (tile.owner === this.myPlayerId) {
          this.fillHex(tile.q, tile.r, "rgba(80, 255, 100, 0.35)");
          this.drawHex(tile.q, tile.r, "rgba(80, 255, 100, 0.8)", 2);
        } else {
          this.fillHex(tile.q, tile.r, "rgba(255, 60, 60, 0.18)");
        }
      }
    }

    // molt target overlay — purple glow on tiles that have the right unit to molt
    if (isMoltCard && moltsFrom && this.state) {
      for (const unit of Object.values(this.state.units)) {
        if (unit.owner !== this.myPlayerId || unit.type !== moltsFrom) continue;
        this.fillHex(unit.position.q, unit.position.r, "rgba(160, 80, 255, 0.40)");
        this.drawHex(unit.position.q, unit.position.r, "rgba(190, 120, 255, 0.95)", 3);
      }
    }


    // movement range overlay — show when a unit is selected
    if (this.selectedUnitId && this.movementRange.size > 0) {
      for (const key of this.movementRange) {
        const [q, r] = key.split(",").map(Number);
        this.fillHex(q, r, "rgba(255, 220, 50, 0.30)");
        this.drawHex(q, r, "rgba(255, 220, 50, 0.9)", 2);
      }
    }

    // buildings
    for (const b of Object.values(this.state.buildings)) {
      const center = this.grid.hexToPixel(b.position.q, b.position.r);
      this.ctx.fillStyle = b.owner === this.myPlayerId ? "darkblue" : "darkred";
      this.ctx.fillRect(center.x - 15, center.y - 15, 30, 30);
      this.ctx.fillStyle = "white";
      this.ctx.font = "10px sans-serif";
      this.ctx.textAlign = "center";
      const label = b.type === "cat tower" ? "CT" : b.type.substring(0, 2).toUpperCase();
      this.ctx.fillText(label, center.x, center.y + 4);
    }

    // units
    for (const u of Object.values(this.state.units)) {
      const center = this.grid.hexToPixel(u.position.q, u.position.r);
      const isSelected = u.id === this.selectedUnitId;

      // glow ring when selected
      if (isSelected) {
        this.ctx.beginPath();
        this.ctx.arc(center.x, center.y, 18, 0, Math.PI * 2);
        this.ctx.strokeStyle = "rgba(255, 220, 50, 0.9)";
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
      }

      this.ctx.beginPath();
      this.ctx.arc(center.x, center.y, 13, 0, Math.PI * 2);
      this.ctx.fillStyle = u.owner === this.myPlayerId
        ? (u.hasMovedThisTurn ? "#4466aa" : "blue")
        : (u.hasMovedThisTurn ? "#aa4444" : "red");
      this.ctx.fill();

      // initials inside (placeholder for icons)
      this.ctx.fillStyle = "white";
      this.ctx.font = "bold 11px sans-serif";
      this.ctx.textAlign = "center";
      
      const parts = u.type.split(/[_\s]/);
      const initials = parts.length > 1 
        ? parts.map(p => p[0]).join('').toUpperCase() 
        : u.type.substring(0, 2).toUpperCase();
        
      this.ctx.fillText(initials, center.x, center.y + 4);
    }

    // selected tile outline
    if (this.selectedTile) {
      this.drawHex(this.selectedTile.q, this.selectedTile.r, "yellow", 3);
    }

    // hover tile outline (for drag/targeting)
    if (this.hoverTile) {
      this.drawHex(this.hoverTile.q, this.hoverTile.r, "white", 2);
    }

    // pending actions dashes
    this.ctx.setLineDash([5, 5]);
    for (const action of this.actionQueue) {
      if (action.target) {
        this.drawHex(action.target.q, action.target.r, "magenta", 4);
      }
    }
    this.ctx.setLineDash([]);
    
    this.ctx.restore();
  }

  private drawHex(q: number, r: number, color: string, lineWidth: number = 1) {
    const corners = this.grid.hexCorners(q, r);
    this.ctx.beginPath();
    this.ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < 6; i++) this.ctx.lineTo(corners[i].x, corners[i].y);
    this.ctx.closePath();
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    this.ctx.stroke();
  }

  private fillHex(q: number, r: number, color: string) {
    const corners = this.grid.hexCorners(q, r);
    this.ctx.beginPath();
    this.ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < 6; i++) this.ctx.lineTo(corners[i].x, corners[i].y);
    this.ctx.closePath();
    this.ctx.fillStyle = color;
    this.ctx.fill();
  }
}

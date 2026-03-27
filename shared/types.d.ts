export type PlayerId = string;
export type UnitId = string;
export type BuildingId = string;
export type TrapId = string;
export type CardId = string;
export interface TileId {
    q: number;
    r: number;
}
export type TerrainType = "grass" | "water";
export interface Tile {
    q: number;
    r: number;
    terrain: TerrainType;
    owner?: PlayerId;
}
export interface Modifier {
    source: string;
    stat: "attack" | "movement" | "speed";
    amount: number;
    duration: "end_of_turn" | "permanent";
}
export interface Unit {
    id: UnitId;
    owner: PlayerId;
    type: string;
    hp: number;
    maxHp: number;
    attack: number;
    speed: number;
    movement: number;
    position: TileId;
    pendingDamage: number;
    hasMovedThisTurn: boolean;
    hasAttackedThisTurn: boolean;
    modifiers: Modifier[];
    spawnedThisTurn?: boolean;
    wasHitLastTurn?: boolean;
}
export interface Building {
    id: BuildingId;
    owner: PlayerId;
    type: string;
    hp: number;
    maxHp: number;
    speed: number;
    position: TileId;
    pendingDamage: number;
    modifiers: Modifier[];
    uses?: number;
}
export interface Trap {
    id: TrapId;
    owner: PlayerId;
    type: string;
    position: TileId;
    modifiers: Modifier[];
}
export interface PlayerState {
    id: PlayerId;
    hp: number;
    maxHp: number;
    catnip: number;
    maxCatnip: number;
    hand: Card[];
    deck: Card[];
    deckSize: number;
}
export interface GameState {
    turn: number;
    activePlayers: PlayerId[];
    currentTurnPlayer: PlayerId;
    map: Record<string, Tile>;
    units: Record<UnitId, Unit>;
    buildings: Record<BuildingId, Building>;
    traps: Record<TrapId, Trap>;
    players: Record<PlayerId, PlayerState>;
    phase: "command" | "movement" | "card" | "attack" | "damage" | "death" | "territory";
}
export type CardType = "troop" | "building" | "trap" | "instinct";
export type TargetType = "tile" | "unit" | "none";
export interface Effect {
    type: string;
    params: Record<string, any>;
}
export interface CardAbility {
    name: string;
    description: string;
}
export interface Card {
    id: CardId;
    templateId: string;
    name: string;
    description: string;
    type: CardType;
    cost: number;
    target: TargetType;
    effects: Effect[];
    moltsFrom?: string;
    ability?: CardAbility;
}

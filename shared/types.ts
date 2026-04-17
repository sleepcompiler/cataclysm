export type PlayerId = string;
export type UnitId = string;
export type BuildingId = string;
export type TrapId = string;
export type CardId = string;

// Axial coordinates for Hexes
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

export interface Attachment {
  type: string;
  hp: number;
  maxHp: number;
  isShield?: boolean;
}

export interface Unit {
  id: UnitId;
  owner: PlayerId;
  type: string;
  hp: number;
  maxHp: number;
  attack: number;
  speed: number;    // higher = attacks earlier in combat — can kill before slower units retaliate
  movement: number;
  position: TileId;
  pendingDamage: number;
  hasMovedThisTurn: boolean;
  hasAttackedThisTurn: boolean;
  modifiers: Modifier[];
  spawnedThisTurn?: boolean;
  wasHitLastTurn?: boolean;
  activeQuirks?: any[]; // Allow Okcatsu Mewta to store dynamically copied quirks
  combatPhasesSurvived?: number; // Potential Cat phase tracking
  lifetimeDamageTaken?: number; // Chainsaw cat tracking
  armedForRetaliation?: boolean; // Zenyatsu trap state
  deathCountdown?: number; // Light Nyagami curse
  burnDamage?: number; // Sasuke amaterasu
  activeAbilitiesUsedThisTurn?: number; // Throttle active skills
}

export interface Building {
  id: BuildingId;
  owner: PlayerId;
  type: string;
  hp: number;
  maxHp: number;
  speed: number;    // buildings with higher speed fire back before slower attackers land
  position: TileId;
  pendingDamage: number;
  modifiers: Modifier[];
  uses?: number;
  attachment?: Attachment;
}

export interface Trap {
  id: TrapId;
  owner: PlayerId;
  type: string;
  position: TileId;
  modifiers: Modifier[];
  sourceEntityId?: string;
}

export interface PlayerState {
  id: PlayerId;
  name: string;
  hp: number;
  maxHp: number;
  catnip: number;
  maxCatnip: number;
  shadowTokens?: number; // Potential Cat tokens
  hand: Card[];
  deck: Card[];
  deckSize: number;
  katarotDeaths?: number;
}

export interface GameState {
  turn: number;
  activePlayers: PlayerId[];
  currentTurnPlayer: PlayerId; // whose turn it is right now
  map: Record<string, Tile>; // key is `${q},${r}`
  units: Record<UnitId, Unit>;
  buildings: Record<BuildingId, Building>;
  traps: Record<TrapId, Trap>;
  players: Record<PlayerId, PlayerState>;
  phase: "command" | "movement" | "card" | "attack" | "damage" | "death" | "territory";
}

export type CardType = "troop" | "building" | "trap" | "instinct";
export type TargetType = "tile" | "unit" | "building" | "none";

export interface Effect {
  type: string;
  params: Record<string, any>;
}

export interface CardAbility {
  name: string;
  description: string;
  // trigger and effect to be defined when abilities are implemented
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
  moltsFrom?: string;  // unit type this card upgrades — play it on a tile containing that unit
  ability?: CardAbility;
  draftable?: boolean; // If false, will not appear in standard deck builders
}

export interface ActiveAbilityCommand {
  type: "use_active_ability";
  unitId: string;
  abilityId: string;
  targetHex?: { q: number; r: number };
  targetUnits?: string[];
}

import { GameState, PlayerId, Unit, Building, Card, TileId } from "./types";
export interface StateUpdateEvent {
    type: "state_update";
    state: GameState;
}
export interface UnitSpawnedEvent {
    type: "unit_spawned";
    unit: Unit;
}
export interface BuildingSpawnedEvent {
    type: "building_spawned";
    building: Building;
}
export interface UnitMovedEvent {
    type: "unit_moved";
    playerId: PlayerId;
    unitType: string;
    from: TileId;
    to: TileId;
}
export interface TrapTriggeredEvent {
    type: "trap_triggered";
    trapType: string;
    trapOwner: PlayerId;
    victimId: string;
    victimType: string;
    victimOwner: PlayerId;
    position: TileId;
}
export interface DamageAppliedEvent {
    type: "damage_applied";
    attackerType: string;
    attackerOwner: PlayerId;
    targetId: string;
    targetType: string;
    targetOwner: PlayerId;
    targetPosition: TileId;
    amount: number;
    remainingHp: number;
}
export interface UnitKilledEvent {
    type: "unit_killed";
    unitType: string;
    ownerId: PlayerId;
    killedBy: PlayerId;
}
export interface BuildingDestroyedEvent {
    type: "building_destroyed";
    buildingType: string;
    ownerId: PlayerId;
    destroyedBy: PlayerId;
}
export interface PlayerEliminatedEvent {
    type: "player_eliminated";
    playerId: PlayerId;
}
export interface TurnStartedEvent {
    type: "turn_started";
    turn: number;
    catnip: number;
}
export interface CardsDrawnEvent {
    type: "cards_drawn";
    playerId: PlayerId;
    cards: Card[];
}
export interface TerritoryUpdatedEvent {
    type: "territory_updated";
    changes: Record<string, PlayerId | undefined>;
}
export interface CardPlayedEvent {
    type: "card_played";
    playerId: PlayerId;
    cardName: string;
    target?: TileId | string;
}
export interface TurnEndedEvent {
    type: "turn_ended";
    playerId: PlayerId;
    turn: number;
    nextPlayerId: PlayerId;
}
export interface UnitMoltedEvent {
    type: "unit_molted";
    playerId: PlayerId;
    fromType: string;
    toType: string;
    position: {
        q: number;
        r: number;
    };
}
export interface QuirkActivatedEvent {
    type: "quirk_activated";
    playerId: PlayerId;
    entityId: string;
    quirkId: string;
    quirkName: string;
}
export interface CardEffectFailedEvent {
    type: "card_effect_failed";
    playerId: PlayerId;
    cardName: string;
    reason: string;
}
export type ServerEvent = StateUpdateEvent | UnitSpawnedEvent | BuildingSpawnedEvent | UnitMovedEvent | DamageAppliedEvent | UnitKilledEvent | BuildingDestroyedEvent | PlayerEliminatedEvent | TurnStartedEvent | CardsDrawnEvent | TerritoryUpdatedEvent | CardPlayedEvent | UnitMoltedEvent | TrapTriggeredEvent | QuirkActivatedEvent | CardEffectFailedEvent | TurnEndedEvent;

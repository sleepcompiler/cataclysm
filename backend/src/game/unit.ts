import { PlayerId, Unit, UnitId, TileId, UnitStats, UNIT_DICTIONARY } from "@hex-strategy/shared";



let _unitIdCounter = 0;

export function createUnit(type: string, owner: PlayerId, position: TileId): Unit {
  const stats = UNIT_DICTIONARY[type];
  if (!stats) throw new Error(`no stats for unit type: ${type}`);

  return {
    id: `u_${++_unitIdCounter}_${Date.now()}`,
    owner,
    type,
    hp: stats.hp,
    maxHp: stats.hp,
    attack: stats.attack,
    speed: stats.speed,
    movement: stats.movement,
    position,
    pendingDamage: 0,
    hasMovedThisTurn: false,
    hasAttackedThisTurn: false,
    modifiers: [],
    spawnedThisTurn: true
  };
}

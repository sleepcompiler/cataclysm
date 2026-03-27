import { PlayerId, Building, BuildingId, TileId, BuildingStats, BUILDING_DICTIONARY } from "@hex-strategy/shared";



export function createBuilding(type: string, owner: PlayerId, position: TileId): Building {
  const stats = BUILDING_DICTIONARY[type] ?? BUILDING_DICTIONARY["cat_tree"];

  return {
    id: `b_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    owner,
    type,
    hp: stats.hp,
    maxHp: stats.hp,
    speed: stats.speed,
    position,
    pendingDamage: 0,
    modifiers: [],
    uses: (stats as any).uses ?? (type === "grooming_station" ? 2 : undefined)
  };
}

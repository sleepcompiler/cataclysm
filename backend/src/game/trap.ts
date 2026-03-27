import { PlayerId, Trap, TrapId, TileId } from "@hex-strategy/shared";
import { TRAP_DICTIONARY } from "@hex-strategy/shared";

export function createTrap(type: string, owner: PlayerId, position: TileId): Trap {
  const stats = TRAP_DICTIONARY[type];
  if (!stats) throw new Error(`Unknown trap type: ${type}`);

  return {
    id: `t_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    owner,
    type,
    position,
    modifiers: []
  };
}

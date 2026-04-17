import { GameState, MoveUnitCommand } from "@hex-strategy/shared";
import { UnitMovedEvent, TrapTriggeredEvent } from "@hex-strategy/shared";
import { hexDistance, getNeighbors } from "../game/hexMath";
import { GameMap } from "../game/map";

// validate and apply moves, emit a UnitMovedEvent for each one that actually goes somewhere
export function processMovement(state: GameState, movements: MoveUnitCommand[]): (UnitMovedEvent | TrapTriggeredEvent)[] {
  const events: (UnitMovedEvent | TrapTriggeredEvent)[] = [];
  const map = new GameMap(state.map);

  const occupiedTilesByPlayer: Record<string, string> = {};
  for (const u of Object.values(state.units)) {
    occupiedTilesByPlayer[`${u.position.q},${u.position.r}`] = u.owner;
  }
  for (const b of Object.values(state.buildings)) {
    occupiedTilesByPlayer[`${b.position.q},${b.position.r}`] = b.owner;
  }

  for (const cmd of movements) {
    const unit = state.units[cmd.unitId];
    if (!unit) continue;
    
    const hasFreeMove = unit.modifiers.some(m => m.source === "quick_step_bonus");
    if (unit.hasMovedThisTurn && !hasFreeMove) continue;
    
    if (cmd.path.length <= 1) continue;

    const steps = cmd.path.length - 1;
    const movBonus = unit.modifiers?.reduce((sum, m) => m.stat === "movement" ? sum + m.amount : sum, 0) ?? 0;
    if (steps > unit.movement + movBonus) continue; // too far, server rejects it

    let validEndPos = cmd.path[0];

    for (let i = 1; i < cmd.path.length; i++) {
      const nextPos = cmd.path[i];
      const key = `${nextPos.q},${nextPos.r}`;

      if (!map.isPassable(nextPos.q, nextPos.r)) break;
      if (occupiedTilesByPlayer[key] && occupiedTilesByPlayer[key] !== unit.owner) break;

      validEndPos = nextPos;

      // Trap Evaluation
      const trapIdsOnHex = Object.keys(state.traps || {}).filter(id => {
        const t = state.traps[id];
        return t.position.q === nextPos.q && t.position.r === nextPos.r;
      });

      let movementInterrupted = false;
      for (const tId of trapIdsOnHex) {
        const trap = state.traps[tId];
        if (trap.owner === unit.owner) continue; // friendly traps don't trigger

        console.log(`[movement] ${unit.type} stepped on enemy trap ${trap.type}!`);
        
        // Interrupt movement
        movementInterrupted = true;
        
        events.push({
          type: "trap_triggered",
          trapType: trap.type,
          trapOwner: trap.owner,
          victimId: unit.id,
          victimType: unit.type,
          victimOwner: unit.owner,
          position: nextPos
        });

        // Specific Trap Effects (future generic quirk engine handles this fully)
        if (trap.type === "cucumber") {
           // stops movement, frightens unit (ends action entirely)
           unit.hasAttackedThisTurn = true; 
        } else if (trap.type.startsWith("deduction_trap")) {
           // L Gato deduction trap
           unit.hasAttackedThisTurn = true;
           const ownerState = state.players[trap.owner];
           if (ownerState) {
              ownerState.catnip += 1;
              console.log(`[movement] Trap! ${ownerState.name} gains 1 catnip.`);
           }
        }

        // trap is consumed
        delete state.traps[tId];
      }

      if (movementInterrupted) break;

      // zone of control stops movement if you step next to an enemy
      let inZoc = false;
      for (const n of getNeighbors(nextPos.q, nextPos.r)) {
        const occupant = occupiedTilesByPlayer[`${n.q},${n.r}`];
        if (occupant && occupant !== unit.owner) { inZoc = true; break; }
      }
      if (inZoc) break;
    }

    // only emit + apply if they actually moved somewhere
    if (validEndPos.q !== cmd.path[0].q || validEndPos.r !== cmd.path[0].r) {
      const from = { q: unit.position.q, r: unit.position.r };
      delete occupiedTilesByPlayer[`${from.q},${from.r}`];
      unit.position = validEndPos;
      
      if (hasFreeMove) {
        // Consume the free move bonus
        unit.modifiers = unit.modifiers.filter(m => m.source !== "quick_step_bonus");
        console.log(`[movement] ${unit.type} used Quick Step bonus move.`);
        // hasMovedThisTurn remains at its previous value (can be true or false)
      } else {
        unit.hasMovedThisTurn = true;
      }

      occupiedTilesByPlayer[`${validEndPos.q},${validEndPos.r}`] = unit.owner;

      events.push({
        type: "unit_moved",
        playerId: unit.owner,
        unitType: unit.type,
        from,
        to: validEndPos,
      });

      console.log(`[movement] ${unit.type} (${unit.owner}) moved to ${validEndPos.q},${validEndPos.r}`);
    }
  }

  return events;
}

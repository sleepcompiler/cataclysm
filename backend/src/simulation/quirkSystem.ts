import { GameState, ActivateQuirkCommand, ServerEvent, QuirkActivatedEvent, Unit, Building } from "@hex-strategy/shared";
import { UNIT_DICTIONARY, BUILDING_DICTIONARY } from "@hex-strategy/shared";
import { hexDistance } from "../game/hexMath";

export function resolveActiveQuirk(
  state: GameState,
  activation: { playerId: string, cmd: ActivateQuirkCommand }
): ServerEvent[] {
  const events: ServerEvent[] = [];
  const { playerId, cmd } = activation;
  const player = state.players[playerId];

  if (!player) return events;

  // Find the entity (unit, building, or trap)
  let entity: Unit | Building | undefined = state.units[cmd.entityId];
  let isBuilding = false;

  if (!entity) {
    entity = state.buildings[cmd.entityId];
    isBuilding = true;
  }

  if (!entity) {
    console.log(`[QuirkSystem] Entity ${cmd.entityId} not found.`);
    return events;
  }

  if (entity.owner !== playerId) {
    console.log(`[QuirkSystem] Player ${playerId} does not own entity ${cmd.entityId}`);
    return events;
  }

  // Find the quirk definition
  const dict = isBuilding ? BUILDING_DICTIONARY : UNIT_DICTIONARY;
  const stats = dict[entity.type];
  if (!stats) return events;

  const quirk = stats.quirks?.find(q => q.id === cmd.quirkId);
  if (!quirk || quirk.trigger !== "active") {
    console.log(`[QuirkSystem] Quirk ${cmd.quirkId} not found or not active on ${entity.type}`);
    return events;
  }

  // Enforce cost
  const cost = quirk.cost ?? 0;
  if (player.catnip < cost) {
    console.log(`[QuirkSystem] Player ${playerId} lacks catnip to activate ${quirk.name} (${player.catnip}/${cost})`);
    return events;
  }

  // Consume catnip
  player.catnip -= cost;

  console.log(`[QuirkSystem] ${playerId} activated ${quirk.name} on ${entity.type} for ${cost} catnip`);

  // Hardcoded logic for specific active quirks
  if (quirk.id === "deep_clean") {
    const building = entity as Building;
    if (building.uses === undefined) building.uses = 2;
    
    if (building.uses <= 0) {
      console.log(`[QuirkSystem] Grooming Station is out of uses.`);
      return events;
    }

    // Find any adjacent friendly unit to heal
    const targetUnit = Object.values(state.units).find(u => 
      u.owner === playerId && hexDistance(u.position, building.position) <= 1 && u.hp < u.maxHp
    );

    if (targetUnit) {
      targetUnit.hp = Math.min(targetUnit.hp + 5, targetUnit.maxHp);
      building.uses -= 1;
      console.log(`[QuirkSystem] Deep Cleaned ${targetUnit.type}. Uses left: ${building.uses}`);
      
      if (building.uses <= 0) {
        console.log(`[QuirkSystem] Grooming Station broke after final use.`);
        delete state.buildings[building.id];
      }
    } else {
      console.log(`[QuirkSystem] No valid adjacent unit to heal.`);
      player.catnip += cost; // Refund cost if no target found?
      return events;
    }
  }

  if (quirk.id === "quick_step") {
    const unit = entity as Unit;
    
    // 1. One use per turn check
    if (unit.modifiers.some(m => m.source === "quick_step_cooldown")) {
      console.log(`[QuirkSystem] Quick Step already used this turn by ${unit.id}`);
      return events;
    }

    // 2. Was it hit?
    if (unit.wasHitLastTurn) {
      // Add the bonus move modifier
      unit.modifiers.push({ source: "quick_step_bonus", stat: "movement", amount: 0, duration: "end_of_turn" });
      // Add a cooldown modifier to track usage
      unit.modifiers.push({ source: "quick_step_cooldown", stat: "movement", amount: 0, duration: "end_of_turn" });
      console.log(`[QuirkSystem] Quick Step activated on ${unit.type}. Bonus move granted.`);
    } else {
      console.log(`[QuirkSystem] ${unit.type} was not hit last turn. Quick Step unavailable.`);
      player.catnip += cost; // Refund cost
      return events;
    }
  }

  events.push({
    type: "quirk_activated",
    playerId,
    entityId: entity.id,
    quirkId: quirk.id,
    quirkName: quirk.name,
  });

  return events;
}

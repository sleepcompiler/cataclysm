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
      const healAmount = quirk.value || 0;
      targetUnit.hp = Math.min(targetUnit.hp + healAmount, targetUnit.maxHp);
      building.uses -= 1;
      console.log(`[QuirkSystem] Deep Cleaned ${targetUnit.type} for ${healAmount}. Uses left: ${building.uses}`);
      
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
  if (quirk.id === "death_note" || quirk.id === "death_note_accelerated") {
     const unit = entity as Unit;
     if (cmd.targetUnits && cmd.targetUnits.length > 0) {
        const target = state.units[cmd.targetUnits[0]];
        if (target) {
           const dist = hexDistance(unit.position, target.position);
           target.deathCountdown = quirk.id === "death_note" ? dist * 2 : dist * 1;
           console.log(`[QuirkSystem] Death Note applied to ${target.type} with a ${target.deathCountdown} turn countdown!`);
        }
     }
  }
  else if (quirk.id === "deduction_trap_skill" || quirk.id === "advanced_deduction_trap") {
     if (cmd.target && typeof cmd.target === "object" && 'q' in cmd.target) {
        const hex = cmd.target as {q: number, r: number};
        const type = quirk.id === "deduction_trap_skill" ? "deduction_trap_1" : "deduction_trap_2";
        
        // Remove any existing traps placed by this specific L Gato instance
        for (const tid of Object.keys(state.traps)) {
            if (state.traps[tid].sourceEntityId === entity.id) {
                delete state.traps[tid];
            }
        }
        
        const tId = `tr_${Date.now()}_${Math.random()}`;
        state.traps[tId] = {
           id: tId,
           owner: playerId,
           type: type,
           position: hex,
           modifiers: [],
           sourceEntityId: entity.id
        };
        console.log(`[QuirkSystem] L Gato placed a deduction trap at ${hex.q},${hex.r}`);
     }
  }
  else if (quirk.id === "rip_and_tear") {
     const unit = entity as Unit;
     const hpCost = Math.floor(unit.maxHp * 0.1);
     if (unit.hp > hpCost) {
         unit.hp -= hpCost;
         unit.modifiers.push({ source: "rip_and_tear", stat: "attack", amount: Math.floor(unit.attack * 0.1), duration: "permanent" });
         console.log(`[QuirkSystem] Rip and tear used. HP down by ${hpCost}, Attack bumped!`);
     }
  }
  else if (quirk.id === "amaterasu") {
     const unit = entity as Unit;
     if (cmd.targetUnits && cmd.targetUnits.length > 0) {
        const target = state.units[cmd.targetUnits[0]];
        if (target && hexDistance(unit.position, target.position) <= 3) {
           target.burnDamage = (target.burnDamage || 0) + 20;
           console.log(`[QuirkSystem] Amaterasu applied. ${target.type} takes 20 burn damage per turn!`);
        }
     }
  }
  else if (quirk.id === "amenotejikara") {
     if (cmd.targetUnits && cmd.targetUnits.length >= 2) {
        const u1 = state.units[cmd.targetUnits[0]];
        const u2 = state.units[cmd.targetUnits[1]];
        if (u1 && u2) {
           const tempPos = { ...u1.position };
           u1.position = { ...u2.position };
           u2.position = tempPos;
           console.log(`[QuirkSystem] Swapped positions of ${u1.type} and ${u2.type}!`);
        }
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

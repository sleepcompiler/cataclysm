import { GameState, Unit, Building } from "@hex-strategy/shared";
import { DamageAppliedEvent, UnitKilledEvent, BuildingDestroyedEvent, PlayerEliminatedEvent } from "@hex-strategy/shared";
import { UNIT_DICTIONARY, BUILDING_DICTIONARY } from "@hex-strategy/shared";
import { hexDistance } from "../game/hexMath";

// an attack queued up in the initiative pass
interface AttackIntent {
  attacker: Unit | Building;
  attackerIsBuilding: boolean;
  target: Unit | Building;
  targetIsBuilding: boolean;
  speed: number;
}

function getEffectiveStats(entity: Unit | Building, isBuilding: boolean) {
  let baseAtk = 0;
  let baseSpeed = 0;
  let maxHp = entity.maxHp;

  let quirks: import("@hex-strategy/shared").Quirk[] = [];

  if (isBuilding) {
    const stats = BUILDING_DICTIONARY[entity.type];
    if (stats) {
      baseSpeed = stats.speed;
      quirks = stats.quirks || [];
    }
  } else {
    const u = entity as Unit;
    const stats = UNIT_DICTIONARY[u.type];
    if (stats) {
      baseAtk = stats.attack;
      baseSpeed = stats.speed;
      quirks = stats.quirks || [];
    }
  }

  // Modifiers
  let atkBonus = 0;
  let speedBonus = 0;
  for (const m of entity.modifiers || []) {
    if (m.stat === "attack") atkBonus += m.amount;
    if (m.stat === "speed") speedBonus += m.amount;
  }

  let finalAtk = baseAtk + atkBonus;
  let finalSpeed = baseSpeed + speedBonus;

  // Combat calculation quirks
  for (const q of quirks) {
    if (q.trigger === "combat_calculation") {
      if (q.id === "desperation_strike") {
        if (entity.hp < maxHp / 3) {
          finalAtk *= 2; // double attack in red HP
        }
      }
    }
  }

  return { attack: finalAtk, speed: finalSpeed };
}

// find the first enemy unit or building adjacent to an attacker
function findTarget(
  attacker: Unit | Building,
  allUnits: Unit[],
  allBuildings: Building[],
  ownerId: string
): { target: Unit | Building, isBuilding: boolean } | null {
  const range = 1;
  const attackerPos = (attacker as any).position;

  // 1. Check for TAUNT (Scratch Posts) within range 2 of the attacker
  // if any Scratch Post is within range 1, it's the mandatory target.
  for (const b of allBuildings) {
    if (b.owner === ownerId) continue;
    if (b.hp <= 0) continue;
    if (b.type === "scratching_post" && hexDistance(attackerPos, b.position) <= 2) {
      // If we can reach it (range 1), we MUST attack it.
      if (hexDistance(attackerPos, b.position) <= range) {
        return { target: b, isBuilding: true };
      }
    }
  }

  for (const u of allUnits) {
    if (u.owner === ownerId) continue;
    if (u.hp <= 0) continue; // already dead
    if (hexDistance(attackerPos, u.position) <= range) {
      return { target: u, isBuilding: false };
    }
  }
  for (const b of allBuildings) {
    if (b.owner === ownerId) continue;
    if (b.hp <= 0) continue;
    if (hexDistance(attackerPos, b.position) <= range) {
      return { target: b, isBuilding: true };
    }
  }
  return null;
}

export function processAttacks(state: GameState) {
  // nothing to do here anymore — combat fully resolves in processDamageAndDeath via speed order
}

export function processDamageAndDeath(state: GameState): {
  eliminatedPlayers: string[];
  events: (DamageAppliedEvent | UnitKilledEvent | BuildingDestroyedEvent | PlayerEliminatedEvent)[];
} {
  const events: (DamageAppliedEvent | UnitKilledEvent | BuildingDestroyedEvent | PlayerEliminatedEvent)[] = [];
  const allUnits = Object.values(state.units);
  const allBuildings = Object.values(state.buildings);

  // --- phase 1: build the initiative list ---
  // every combatant that has an adjacant enemy gets an attack intent
  const intents: AttackIntent[] = [];

  for (const u of allUnits) {
    if (u.hasAttackedThisTurn || u.hp <= 0) continue;
    const found = findTarget(u, allUnits, allBuildings, u.owner);
    if (found) {
      intents.push({
        attacker: u,
        attackerIsBuilding: false,
        target: found.target,
        targetIsBuilding: found.isBuilding,
        speed: getEffectiveStats(u, false).speed,
      });
    }
  }

  for (const b of allBuildings) {
    if (b.hp <= 0 || getEffectiveStats(b, true).attack === 0) continue;
    // buildings retaliate against units in range
    for (const u of allUnits) {
      if (u.owner === b.owner || u.hp <= 0) continue;
      if (hexDistance(b.position, u.position) <= 1) {
        intents.push({
          attacker: b,
          attackerIsBuilding: true,
          target: u,
          targetIsBuilding: false,
          speed: getEffectiveStats(b, true).speed,
        });
        break; // one target per building per round
      }
    }
  }

  // --- phase 2: sort by speed descending, ties broken randomly (fair coin flip) ---
  intents.sort((a, b) => b.speed - a.speed || Math.random() - 0.5);

  // --- phase 3: resolve each attack immediately — fast units can kill before slow ones swing ---
  for (const intent of intents) {
    const { attacker, attackerIsBuilding, target, targetIsBuilding } = intent;

    // check both are still alive — a fast unit may have already killed this attacker
    const attackerHp = attackerIsBuilding
      ? (attacker as Building).hp
      : (attacker as Unit).hp;
    if (attackerHp <= 0) continue;
    if (target.hp <= 0) continue;

    let dmg = getEffectiveStats(attacker, attackerIsBuilding).attack;
    const attackerOwner = attacker.owner;
    const targetOwner = target.owner;

    // Apply defensive quirks (Fluffy, Lucky)
    const targetStats = targetIsBuilding ? BUILDING_DICTIONARY[(target as Building).type] : UNIT_DICTIONARY[(target as Unit).type];
    const targetQuirks = targetStats?.quirks || [];

    for (const q of targetQuirks) {
      if (q.id === "fluffy") {
        dmg = Math.max(0, dmg - 2);
        console.log(`[combat] Fluffy fur reduced damage by 2. New dmg: ${dmg}`);
      }
    }

    if (dmg > 0 && !targetIsBuilding) {
      (target as Unit).wasHitLastTurn = true;
      console.log(`[combat] ${target.type} hit! wasHitLastTurn set to true for next turn.`);
    }

    // deal damage immediately
    target.hp -= dmg;

    // Mirror quirk (Siamese)
    if (targetQuirks.some(q => q.id === "mirror") && dmg > 0) {
      const reflected = Math.floor(dmg * 0.5);
      attacker.hp -= reflected;
      console.log(`[combat] Mirror! Reflected ${reflected} damage back to ${attackerOwner}`);
    }

    if (!attackerIsBuilding) (attacker as Unit).hasAttackedThisTurn = true;

    const attackerType = attackerIsBuilding ? (attacker as Building).type : (attacker as Unit).type;
    const targetType = targetIsBuilding ? (target as Building).type : (target as Unit).type;

    console.log(`[combat spd:${intent.speed}] ${attackerOwner}'s ${attackerType} → ${targetOwner}'s ${targetType} for ${dmg} (${target.hp} hp left)`);

    events.push({
      type: "damage_applied",
      attackerType,
      attackerOwner,
      targetId: target.id,
      targetType,
      targetOwner,
      targetPosition: (target as any).position,
      amount: dmg,
      remainingHp: Math.max(0, target.hp),
    });
  }

  // --- phase 4: remove the dead ---
  for (const [id, u] of Object.entries(state.units)) {
    if (u.hp <= 0) {
      // figure out who killed it
      const killerIntent = intents.find(i => !i.targetIsBuilding && (i.target as Unit).id === id && i.target.hp <= 0);

      // Sharpness logic (Panther)
      if (killerIntent && !killerIntent.attackerIsBuilding) {
        const killer = killerIntent.attacker as Unit;
        if (UNIT_DICTIONARY[killer.type]?.quirks?.some(q => q.id === "sharpness")) {
          killer.modifiers.push({ source: "sharpness", stat: "attack", amount: 1, duration: "permanent" });
          console.log(`[combat] Panther ${killer.owner} gained +1 attack from KO`);
        }
      }

      events.push({
        type: "unit_killed",
        unitType: u.type,
        ownerId: u.owner,
        killedBy: killerIntent?.attacker.owner ?? "?",
      });
      console.log(`[combat] ${u.type} (${u.owner}) KO'd`);
      delete state.units[id];
    }
  }

  for (const [id, b] of Object.entries(state.buildings)) {
    if (b.hp <= 0) {
      const killerIntent = intents.find(i => i.targetIsBuilding && (i.target as Building).id === id && i.target.hp <= 0);
      events.push({
        type: "building_destroyed",
        buildingType: b.type,
        ownerId: b.owner,
        destroyedBy: killerIntent?.attacker.owner ?? "?",
      });
      console.log(`[combat] building ${b.type} (${b.owner}) destroyed`);
      delete state.buildings[id];
    }
  }

  // --- phase 5: cat tower gone = eliminated ---
  const eliminatedPlayers: string[] = [];
  const activeBuildings = Object.values(state.buildings);
  for (const playerId of state.activePlayers) {
    if (!activeBuildings.some(b => b.owner === playerId && b.type === "cat_tree")) {
      console.log(`[combat] ${playerId} lost their cat_tree — eliminated`);
      eliminatedPlayers.push(playerId);
      events.push({ type: "player_eliminated", playerId });
    }
  }

  return { eliminatedPlayers, events };
}

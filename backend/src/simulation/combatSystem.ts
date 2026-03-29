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
  overrideDamage?: number;
}

function getEffectiveStats(entity: Unit | Building, isBuilding: boolean) {
  let baseAtk = 0;
  let baseSpeed = 0;
  let baseRange = 1;
  let maxHp = entity.maxHp;

  let quirks: import("@hex-strategy/shared").Quirk[] = [];

  if (isBuilding) {
    const stats = BUILDING_DICTIONARY[entity.type];
    if (stats) {
      baseAtk = stats.attack || 0;
      baseSpeed = stats.speed;
      baseRange = stats.range || 0; // Buildings default to 0 range (no attack)
      quirks = stats.quirks || [];
    }
  } else {
    const u = entity as Unit;
    const stats = UNIT_DICTIONARY[u.type];
    if (stats) {
      baseAtk = stats.attack;
      baseSpeed = stats.speed;
      baseRange = stats.range || 1; // Units default to 1 range (melee)
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
          finalAtk *= (q.value || 2); 
        }
      }
    }
  }

  return { attack: finalAtk, speed: finalSpeed, range: baseRange };
}

// find the first enemy unit or building adjacent to an attacker
function findTargets(
  attacker: Unit | Building,
  allUnits: Unit[],
  allBuildings: Building[],
  ownerId: string,
  range: number,
  maxTargets: number
): { target: Unit | Building, isBuilding: boolean }[] {
  const attackerPos = (attacker as any).position;
  const targets: { target: Unit | Building, isBuilding: boolean }[] = [];

  // 1. Check for TAUNT (Scratch Posts) within range 2 of the attacker
  for (const b of allBuildings) {
    if (b.owner === ownerId) continue;
    if (b.hp <= 0) continue;
    if (b.type === "scratching_post" && hexDistance(attackerPos, b.position) <= 2) {
      if (hexDistance(attackerPos, b.position) <= range) {
        targets.push({ target: b, isBuilding: true });
        if (targets.length >= maxTargets) return targets;
      }
    }
  }

  for (const u of allUnits) {
    if (u.owner === ownerId) continue;
    if (u.hp <= 0) continue;
    if (hexDistance(attackerPos, u.position) <= range) {
      if (!targets.some(t => t.target.id === u.id)) {
        targets.push({ target: u, isBuilding: false });
        if (targets.length >= maxTargets) return targets;
      }
    }
  }
  for (const b of allBuildings) {
    if (b.owner === ownerId) continue;
    if (b.hp <= 0) continue;
    if (hexDistance(attackerPos, b.position) <= range) {
      if (!targets.some(t => t.target.id === b.id)) {
        targets.push({ target: b, isBuilding: true });
        if (targets.length >= maxTargets) return targets;
      }
    }
  }
  return targets;
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

  const getPlayerName = (pid: string) => state.players[pid]?.name ?? pid;

  // --- phase 1: build the initiative list ---
  // every combatant that has an adjacant enemy gets an attack intent
  const intents: AttackIntent[] = [];

  for (const u of allUnits) {
    if (u.hasAttackedThisTurn || u.hp <= 0) continue;
    const stats = getEffectiveStats(u, false);
    const foundList = findTargets(u, allUnits, allBuildings, u.owner, stats.range, 1);
    if (foundList.length > 0) {
      intents.push({
        attacker: u,
        attackerIsBuilding: false,
        target: foundList[0].target,
        targetIsBuilding: foundList[0].isBuilding,
        speed: stats.speed,
      });
    }
  }

  for (const b of allBuildings) {
    if (b.hp <= 0) continue;
    const stats = getEffectiveStats(b, true);
    let maxTargets = 1;
    const bStats = BUILDING_DICTIONARY[b.type];
    const mtQuirk = bStats?.quirks?.find(q => q.id === "multi_target");
    if (mtQuirk && mtQuirk.value) {
      maxTargets = mtQuirk.value;
    }

    if (stats.attack > 0 && stats.range > 0) {
      const foundList = findTargets(b, allUnits, allBuildings, b.owner, stats.range, maxTargets);
      for (const found of foundList) {
        intents.push({
          attacker: b,
          attackerIsBuilding: true,
          target: found.target,
          targetIsBuilding: found.isBuilding,
          speed: stats.speed,
        });
      }
    }

    // Attachment attacks IN ADDITION to normal attacks
    if (b.attachment && b.attachment.hp > 0) {
      if (b.attachment.type === "wizard") {
        const allTargets = findTargets(b, allUnits, allBuildings, b.owner, 2, 999);
        for (const t of allTargets) {
          intents.push({
             attacker: b,
             attackerIsBuilding: true,
             target: t.target,
             targetIsBuilding: t.isBuilding,
             speed: stats.speed,
             overrideDamage: 100
          });
        }
      } else {
        let attAtk = 0;
        let attRange = 0;
        
        if (b.attachment.type === "cannon") {
          attAtk = 200;
          attRange = 2;
        } else if (b.attachment.type === "catapult") {
          attAtk = 150;
          attRange = 4;
        }
        
        if (attAtk > 0) {
          const attTarget = findTargets(b, allUnits, allBuildings, b.owner, attRange, 1);
          if (attTarget.length > 0) {
            intents.push({
               attacker: b,
               attackerIsBuilding: true,
               target: attTarget[0].target,
               targetIsBuilding: attTarget[0].isBuilding,
               speed: stats.speed,
               overrideDamage: attAtk
            });
          }
        }
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

    let dmg = intent.overrideDamage !== undefined ? intent.overrideDamage : getEffectiveStats(attacker, attackerIsBuilding).attack;
    const attackerOwner = attacker.owner;
    const targetOwner = target.owner;

    // Apply defensive quirks (Fluffy, Lucky)
    const targetStats = targetIsBuilding ? BUILDING_DICTIONARY[(target as Building).type] : UNIT_DICTIONARY[(target as Unit).type];
    const targetQuirks = targetStats?.quirks || [];

    for (const q of targetQuirks) {
      if (q.id === "fluffy") {
        const reduction = q.value || 0;
        dmg = Math.max(0, dmg - reduction);
        console.log(`[combat] Fluffy fur reduced damage by ${reduction}. New dmg: ${dmg}`);
      }
    }

    const attackerType = attackerIsBuilding ? (attacker as Building).type : (attacker as Unit).type;
    const targetType = targetIsBuilding ? (target as Building).type : (target as Unit).type;

    if (dmg > 0 && !targetIsBuilding) {
      (target as Unit).wasHitLastTurn = true;
      console.log(`[combat] ${getPlayerName(targetOwner)}'s ${targetType} hit! wasHitLastTurn set to true for next turn.`);
    }

    // Cardboard Box — absorbs the first hit entirely, then the shield breaks
    if (!targetIsBuilding) {
      const boxIdx = (target as Unit).modifiers.findIndex(m => m.source === "cardboard_box");
      if (boxIdx !== -1 && dmg > 0) {
        (target as Unit).modifiers.splice(boxIdx, 1);
        console.log(`[combat] Cardboard Box absorbed hit on ${targetType}! Shield broken.`);
        if (!attackerIsBuilding) (attacker as Unit).hasAttackedThisTurn = true;
        events.push({
          type: "damage_applied",
          attackerType,
          attackerOwner,
          targetId: target.id,
          targetType,
          targetOwner,
          targetPosition: (target as any).position,
          amount: 0,
          remainingHp: target.hp,
        });
        continue;
      }
    }

    // deal damage immediately
    let tHp = target.hp;
    if (targetIsBuilding) {
       let tB = target as Building;
       if (tB.attachment && tB.attachment.hp > 0) {
          if (tB.attachment.isShield) {
             if (tB.attachment.hp >= dmg) {
                tB.attachment.hp -= dmg;
                dmg = 0;
                console.log(`[combat] Attachment absorbed damage. Remaining attachment HP: ${tB.attachment.hp}`);
             } else {
                dmg -= tB.attachment.hp;
                console.log(`[combat] Attachment absorbed ${tB.attachment.hp} damage and broke!`);
                tB.attachment.hp = 0;
                tB.attachment = undefined;
             }
          } else {
             // Not a shield: durability depletes as tower takes damage, but dmg still goes to tower
             tB.attachment.hp -= dmg;
             if (tB.attachment.hp <= 0) {
                console.log(`[combat] Attachment durability depleted and it broke!`);
                tB.attachment.hp = 0;
                tB.attachment = undefined;
             }
          }
       }
    }
    
    target.hp -= dmg;

    // Mirror quirk (Siamese)
    if (targetQuirks.some(q => q.id === "mirror") && dmg > 0) {
      const q = targetQuirks.find(q => q.id === "mirror")!;
      const reflected = Math.floor(dmg * (q.value || 0.5));
      attacker.hp -= reflected;
      console.log(`[combat] Mirror! Reflected ${reflected} damage back to ${getPlayerName(attackerOwner)}`);
    }

    if (!attackerIsBuilding) (attacker as Unit).hasAttackedThisTurn = true;

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
        const sharpnessQuirk = UNIT_DICTIONARY[killer.type]?.quirks?.find(q => q.id === "sharpness");
        if (sharpnessQuirk) {
          const bonus = sharpnessQuirk.value || 1;
          killer.modifiers.push({ source: "sharpness", stat: "attack", amount: bonus, duration: "permanent" });
          console.log(`[combat] Panther ${killer.owner} gained +${bonus} attack from KO`);
        }
      }

      events.push({
        type: "unit_killed",
        unitType: u.type,
        ownerId: u.owner,
        killedBy: killerIntent?.attacker.owner ?? "?",
      });
      console.log(`[combat] ${u.type} (${getPlayerName(u.owner)}) KO'd`);
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
      console.log(`[combat] building ${b.type} (${getPlayerName(b.owner)}) destroyed`);
      delete state.buildings[id];
    }
  }

  // --- phase 5: cat tower gone = eliminated ---
  const eliminatedPlayers: string[] = [];
  const activeBuildings = Object.values(state.buildings);
  for (const playerId of state.activePlayers) {
    if (!activeBuildings.some(b => b.owner === playerId && b.type === "cat_tree")) {
      console.log(`[combat] ${getPlayerName(playerId)} lost their cat_tree — eliminated`);
      eliminatedPlayers.push(playerId);
      events.push({ type: "player_eliminated", playerId });
    }
  }

  return { eliminatedPlayers, events };
}

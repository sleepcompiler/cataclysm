import { GameState, Unit, Building } from "@hex-strategy/shared";
import { DamageAppliedEvent, UnitKilledEvent, BuildingDestroyedEvent, PlayerEliminatedEvent } from "@hex-strategy/shared";
import { UNIT_DICTIONARY, BUILDING_DICTIONARY } from "@hex-strategy/shared";
import { hexDistance } from "../game/hexMath";
import { CARD_LIBRARY } from "../cards/cards";
import { createUnit } from "../game/unit";

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
      quirks = u.activeQuirks !== undefined ? u.activeQuirks : (stats.quirks || []);
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
      if (q.id === "rev_up") {
        finalAtk += (maxHp - entity.hp);
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

      const uTarget = target as Unit;
      uTarget.lifetimeDamageTaken = (uTarget.lifetimeDamageTaken || 0) + dmg;
      if (uTarget.type === "zenyatsu" && uTarget.armedForRetaliation && dmg > 0) {
          console.log(`[combat] Zenyatsu was resting and retaliates! Thunderclap applied to ${attackerType} for 80 damage!`);
          attacker.hp -= 80;
          uTarget.armedForRetaliation = false;
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
            console.log(`[combat] ${tB.attachment.type} absorbed damage. Remaining attachment HP: ${tB.attachment.hp}`);
          } else {
            dmg -= tB.attachment.hp;
            console.log(`[combat] ${tB.attachment.type} absorbed ${tB.attachment.hp} damage and broke!`);
            tB.attachment.hp = 0;
            tB.attachment = undefined;
          }
        } else {
          // Not a shield: durability depletes as tower takes damage, but dmg still goes to tower
          tB.attachment.hp -= dmg;
          if (tB.attachment.hp <= 0) {
            console.log(`[combat] ${tB.attachment.type} durability depleted and it broke!`);
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

    if (!attackerIsBuilding) {
      const u = attacker as Unit;
      u.hasAttackedThisTurn = true;
      if (dmg > 0) {
        const uQuirks = u.activeQuirks !== undefined ? u.activeQuirks : (UNIT_DICTIONARY[u.type]?.quirks || []);
        
        for (const q of uQuirks) {
            if (q.id === "curse_mark") {
                 let heal = Math.floor(dmg * (q.value || 0.5));
                 u.hp = Math.min(u.maxHp, u.hp + heal);
                 console.log(`[combat] ${u.type} lifestealed ${heal} HP!`);
            }
        }

        for (const q of uQuirks) {
          if (q.trigger === "on_attack") {
            if (q.id === "copy_ability" && !targetIsBuilding) {
               const tQuirks = (target as Unit).activeQuirks?.length ? (target as Unit).activeQuirks : (UNIT_DICTIONARY[(target as Unit).type]?.quirks || []);
               if (tQuirks && tQuirks.length > 0) {
                   u.activeQuirks = tQuirks.filter(x => x.id !== "copy_ability" && x.id !== "copy_ability_2");
                   console.log(`[combat] Okcatsu Mewta copied abilities from ${(target as Unit).type}`);
               }
            }
            if (q.id === "copy_ability_2" && !targetIsBuilding) {
               const tQuirks = (target as Unit).activeQuirks?.length ? (target as Unit).activeQuirks : (UNIT_DICTIONARY[(target as Unit).type]?.quirks || []);
               const freshQuirks = tQuirks ? tQuirks.filter(x => x.id !== "copy_ability" && x.id !== "copy_ability_2") : [];
               if (freshQuirks.length > 0) {
                   if (!u.activeQuirks) u.activeQuirks = [];
                   u.activeQuirks.push(...freshQuirks);
                   while (u.activeQuirks.length > 2) {
                       u.activeQuirks.shift();
                   }
                   console.log(`[combat] Rika Link Mode copied abilities. Active Quirks length: ${u.activeQuirks.length}`);
               }
            }
            if (q.id === "chain_lightning") {
              const nearby = Object.values(state.units).filter(n => n.owner !== attackerOwner && n.id !== target.id && hexDistance(n.position, (target as any).position) <= 1);
              for(const n of nearby) {
                 n.hp -= (q.value || 20);
                 console.log(`[combat] Chain Lightning struck ${n.type} for ${q.value||20} dmg`);
              }
            }
            if (q.id === "tongue_pull") {
               const neighbors = [{q:1,r:-1},{q:1,r:0},{q:0,r:1},{q:-1,r:1},{q:-1,r:0},{q:0,r:-1}].map(d => ({q: (attacker as any).position.q + d.q, r: (attacker as any).position.r + d.r}));
               const open = neighbors.find(n => !Object.values(state.units).some(x => x.position.q === n.q && x.position.r === n.r) && !Object.values(state.buildings).some(x => x.position.q === n.q && x.position.r === n.r) && state.map[`${n.q},${n.r}`] && state.map[`${n.q},${n.r}`].terrain !== "water");
               if (open) {
                  target.position = open as any;
                  console.log(`[combat] Toad pulled target to ${open.q},${open.r}`);
               }
            }
          }
        }
      }
    }

    console.log(`[combat spd:${intent.speed}] ${getPlayerName(attackerOwner)}'s ${attackerType} → ${getPlayerName(targetOwner)}'s ${targetType} for ${dmg} (${target.hp} hp left)`);

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
      if (u.type === "katarot" || u.type === "ss_katarot") {
         const pState = state.players[u.owner];
         if (pState) {
            pState.katarotDeaths = (pState.katarotDeaths || 0) + 1;
            console.log(`[combat] ${u.type} died. Katarot deaths for ${u.owner}: ${pState.katarotDeaths}`);
         }
      }
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
        const titanQuirk = UNIT_DICTIONARY[killer.type]?.quirks?.find(q => q.id === "titan_killer");
        if (titanQuirk) {
          killer.modifiers.push({ source: "titan_killer", stat: "attack", amount: 10, duration: "permanent" });
          killer.modifiers.push({ source: "titan_killer", stat: "speed", amount: 10, duration: "permanent" });
          console.log(`[combat] Levi ${killer.owner} gained +10 ATK/SPD from titan kill!`);
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

  // Track survivors for Potential Cat evolution
  const combatParticipants = new Set<string>();
  for (const intent of intents) {
     if (!intent.attackerIsBuilding && state.units[(intent.attacker as Unit).id]) combatParticipants.add((intent.attacker as Unit).id);
     if (!intent.targetIsBuilding && state.units[(intent.target as Unit).id]) combatParticipants.add((intent.target as Unit).id);
  }
  for (const id of combatParticipants) {
     const u = state.units[id];
     if (!u || u.hp <= 0) continue;

     // Zenkai Boost
     const stats = UNIT_DICTIONARY[u.type];
     const quirks = u.activeQuirks !== undefined ? u.activeQuirks : (stats.quirks || []);
     const zenkai = quirks.find(q => q.id === "zenkai_boost");
     if (zenkai && u.wasHitLastTurn) {
         u.maxHp += (zenkai.value || 10);
         u.hp += (zenkai.value || 10);
         u.modifiers.push({ source: "zenkai_boost", stat: "attack", amount: (zenkai.value || 10), duration: "permanent" });
         console.log(`[combat] ${u.type} survived damage and got a Zenkai boost (+${zenkai.value || 10} HP/ATK)!`);
         u.wasHitLastTurn = false;
     }

     if (u.type === "potential_cat") {
        u.combatPhasesSurvived = (u.combatPhasesSurvived || 0) + 1;
        if (u.combatPhasesSurvived >= 2) {
           console.log(`[combat] Potential Cat survived 2 combats! Molting to 10 Shadows Kitten and giving Summon Shikigami.`);
           u.combatPhasesSurvived = -999; // Prevents infinite trigger
           const p = state.players[u.owner];
           if (p) {
              const cardBase = CARD_LIBRARY["summon_shikigami"];
              if (cardBase) p.hand.push({ ...cardBase, id: `c_evo_${Date.now()}_${Math.random()}` } as any);
           }
           const newUnit = createUnit("ten_shadows_kitten", u.owner, u.position);
           newUnit.hasMovedThisTurn = u.hasMovedThisTurn;
           newUnit.hasAttackedThisTurn = u.hasAttackedThisTurn;
           delete state.units[u.id];
           state.units[newUnit.id] = newUnit;
        }
     }
     
     if (u.type === "chainsaw_cat" && (u.lifetimeDamageTaken || 0) >= u.maxHp) {
        console.log(`[combat] Chainsaw cat sustained lifetime damage >= maxHp. Pochita Molt triggers!`);
        u.lifetimeDamageTaken = 0;
        const newUnit = createUnit("demonic_chainsaw_cat", u.owner, u.position);
        newUnit.hasMovedThisTurn = u.hasMovedThisTurn;
        newUnit.hasAttackedThisTurn = u.hasAttackedThisTurn;
        delete state.units[u.id];
        state.units[newUnit.id] = newUnit;
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

import { GameState, PlayCardCommand, ServerEvent, Unit } from "@hex-strategy/shared";
import { CardPlayedEvent, UnitMoltedEvent } from "@hex-strategy/shared";
import { createUnit } from "../game/unit";
import { createBuilding } from "../game/building";
import { createTrap } from "../game/trap";
import { CARD_LIBRARY, createCardInstance } from "../cards/cards";
import { UNIT_DICTIONARY, BUILDING_DICTIONARY } from "@hex-strategy/shared";
import { hexDistance } from "../game/hexMath";

export function resolveInstantCardPlay(
  state: GameState,
  play: { playerId: string, cmd: PlayCardCommand }
): ServerEvent[] {
  const events: ServerEvent[] = [];
  
  const player = state.players[play.playerId];
    if (!player) {
      console.log(`[PhaseSystem] Invalid player: ${play.playerId}`);
      return events;
    }

    const cardIndex = player.hand.findIndex(c => c.id === play.cmd.cardId);
    if (cardIndex === -1) {
      console.log(`[PhaseSystem] Card ${play.cmd.cardId} not in hand of ${play.playerId}`);
      return events;
    }

    const card = player.hand[cardIndex];

    // Enforce catnip cost
    if (player.catnip < card.cost) {
      console.log(`[Simulation] Player ${play.playerId} tried to play ${card.name} but lacked catnip (${player.catnip}/${card.cost})`);
      return events;
    }

    // pre-validate before spending resources
    let isValidPlay = true;
    let consumesInstinct = false;

    if (play.cmd.target && typeof play.cmd.target === "object" && 'q' in play.cmd.target) {
      const hexTarget = play.cmd.target as { q: number, r: number };
      const tileKey = `${hexTarget.q},${hexTarget.r}`;
      const tile = state.map[tileKey];

      const hasSpawnEffect  = card.effects.some(e => e.type === "spawn_unit" || e.type === "spawn_building" || e.type === "spawn_trap");
      const hasMoltEffect   = card.effects.some(e => e.type === "molt_unit");

      if (hasMoltEffect) {
        // molt target? — check for a friendly unit of the right base type
        const baseType = (card as any).moltsFrom as string;
        const unitOnTile = Object.values(state.units).find(
          u => u.owner === play.playerId && u.position.q === hexTarget.q && u.position.r === hexTarget.r && u.type === baseType
        );

        if (unitOnTile) {
          if (unitOnTile.spawnedThisTurn) {
            const instinctIndex = player.hand.findIndex((c, idx) => {
               if (idx === cardIndex) return false;
               return c.templateId === "fresh_spark";
            });

            if (instinctIndex === -1) {
              console.log(`[PhaseSystem] Molt rejected: ${card.name} target was played this round. Needs Fresh Spark to rush.`);
              isValidPlay = false;
            } else {
              const catalyst = player.hand[instinctIndex];
              if (player.catnip < (card.cost + catalyst.cost)) {
                console.log(`[PhaseSystem] Molt rejected: Combined cost of ${card.name} (${card.cost}) and Fresh Spark (${catalyst.cost}) exceeds ${player.catnip} catnip.`);
                isValidPlay = false;
              } else {
                consumesInstinct = true;
                console.log(`[PhaseSystem] Fresh Spark catalyst will be used to rush molt of ${card.name}`);
              }
            }
          } else {
            isValidPlay = true;
          }
        } else {
          // Direct Spawn attempt — Molt cards CANNOT be spawned directly anymore (must use Spirit card)
          console.log(`[PhaseSystem] Direct spawn rejected: ${card.name} must be molted from a unit or pulled via Spirit.`);
          isValidPlay = false;
        }
      } else if (hasSpawnEffect) {
        // spawn target — must be friendly territory, non-water
        if (!tile || tile.terrain === "water") {
          console.log(`[PhaseSystem] Invalid spawn: tile ${tileKey} is water or doesn't exist`);
          isValidPlay = false;
        } else if (tile.owner !== play.playerId) {
          console.log(`[PhaseSystem] Invalid spawn: tile ${tileKey} not owned by ${play.playerId}`);
          isValidPlay = false;
        } else {
          // Check for exact tile emptiness (units, buildings, or traps)
          const hasOccupant = 
            Object.values(state.units).some(u => u.position.q === hexTarget.q && u.position.r === hexTarget.r) ||
            Object.values(state.buildings).some(b => b.position.q === hexTarget.q && b.position.r === hexTarget.r) ||
            Object.values(state.traps).some(t => t.position.q === hexTarget.q && t.position.r === hexTarget.r);

          if (hasOccupant) {
            console.log(`[PhaseSystem] Invalid spawn: tile ${tileKey} is already occupied`);
            isValidPlay = false;
          }
        }
      }
    } else if (card.templateId === "random_evolution") {
      const validTargets = Object.values(state.units).filter(u => 
        u.owner === play.playerId && 
        ["house_kitten", "stray_kitten", "tabby", "tom", "alley_cat"].includes(u.type)
      );
      if (validTargets.length === 0) {
        console.log(`[PhaseSystem] Random Evolution rejected: No Stage 1 or 2 cats on board.`);
        isValidPlay = false;
      }
    }

    if (!isValidPlay) {
      // Card and catnip are NOT consumed — validation runs before spending resources.
      return events;
    }

    // Spend Feed and Remove Card
    player.catnip -= card.cost;
    player.hand.splice(cardIndex, 1);

    console.log(`[PhaseSystem] ${play.playerId} pays ${card.cost} to cast ${card.name} at:`, play.cmd.target);

    // Emit log event for combat log
    events.push({
      type: "card_played",
      playerId: play.playerId,
      cardName: card.name,
      target: play.cmd.target as any
    });

    // Resolve Effects
    for (const effect of card.effects) {
      if (effect.type === "spawn_unit" && play.cmd.target && typeof play.cmd.target === "object" && 'q' in play.cmd.target) {
        console.log(`[PhaseSystem] spawning ${effect.params.unitType} at ${play.cmd.target.q},${play.cmd.target.r}`);
        const unit = createUnit(effect.params.unitType, play.playerId, play.cmd.target);
        state.units[unit.id] = unit;
      }
      else if (effect.type === "molt_unit" && play.cmd.target && typeof play.cmd.target === "object" && 'q' in play.cmd.target) {
        const hexTarget2 = play.cmd.target as { q: number, r: number };
        const baseType = (card as any).moltsFrom as string;
        
        // check for the unit again (resolution phase)
        const oldUnit = Object.values(state.units).find(
          u => u.owner === play.playerId && u.position.q === hexTarget2.q && u.position.r === hexTarget2.r && u.type === baseType
        );

        if (oldUnit) {
          // Standard Molt
          const newUnit = createUnit(effect.params.unitType, play.playerId, play.cmd.target);
          newUnit.hasMovedThisTurn = oldUnit.hasMovedThisTurn;
          newUnit.hasAttackedThisTurn = oldUnit.hasAttackedThisTurn;

          // Process on_molt quirks
          const stats = UNIT_DICTIONARY[newUnit.type];
          for (const q of stats?.quirks || []) {
            if (q.trigger === "on_molt" && q.id === "molt_frenzy") {
              newUnit.modifiers.push({ source: "molt_frenzy", stat: "attack", amount: 2, duration: "end_of_turn" });
            }
          }

          if (consumesInstinct) {
            const unitType = effect.params.unitType;
            const isStray = ["tom", "alley_cat", "lion", "panther"].includes(unitType || "");
            const isHouse = ["tabby", "siamese", "sphynx", "maine_coon", "calico"].includes(unitType || "");
            
            const instinctIndex = player.hand.findIndex(c => {
               if (oldUnit.spawnedThisTurn) {
                  return c.templateId === "fresh_spark" || (isStray && c.templateId === "stray_spirit") || (isHouse && c.templateId === "house_spirit");
               }
               return (isStray && c.templateId === "stray_spirit") || (isHouse && c.templateId === "house_spirit");
            });

            if (instinctIndex !== -1) {
              const consumed = player.hand.splice(instinctIndex, 1)[0];
              // Only charge for catalysts if they are NOT spirits (spirits are paid up front)
              const isSpirit = consumed.templateId.includes("spirit");
              if (!isSpirit) {
                player.catnip -= consumed.cost; 
                console.log(`[PhaseSystem] Consumed ${consumed.name} (${consumed.cost} catnip) to catalyst molt of ${card.name}`);
              } else {
                console.log(`[PhaseSystem] Consumed Spirit Catalyst ${consumed.name} (Pre-paid)`);
              }
            }
          }

          delete state.units[oldUnit.id];
          state.units[newUnit.id] = newUnit;
          console.log(`[PhaseSystem] ${play.playerId} molted ${baseType} → ${effect.params.unitType}`);
          events.push({
            type: "unit_molted",
            playerId: play.playerId,
            fromType: baseType,
            toType: effect.params.unitType,
            position: play.cmd.target,
          });
        } else {
          // Direct Spawn (Instinct was already consumed if necessary during validation step? No, resolution consumes)
          // Actually, we should consume the Instinct HERE to be safe, or just before resolving effects.
          if (consumesInstinct) {
            const unitType = effect.params.unitType;
            const isStray = ["tom", "alley_cat", "lion", "panther"].includes(unitType || "");
            const instinctIndex = player.hand.findIndex(c => 
              isStray ? c.templateId === "stray_spirit" : c.templateId === "house_spirit"
            );
            if (instinctIndex !== -1) {
              const consumed = player.hand.splice(instinctIndex, 1)[0];
              // Only charge for catalysts if they are NOT spirits (spirits are paid up front)
              const isSpirit = consumed.templateId.includes("spirit");
              if (!isSpirit) {
                 player.catnip -= consumed.cost; 
                 console.log(`[PhaseSystem] Consumed ${consumed.name} (${consumed.cost} catnip) for direct spawn of ${card.name}`);
              } else {
                 console.log(`[PhaseSystem] Consumed Spirit Catalyst ${consumed.name} (Pre-paid)`);
              }
            }
          }
          const unit = createUnit(effect.params.unitType, play.playerId, play.cmd.target);
          state.units[unit.id] = unit;
          console.log(`[PhaseSystem] ${play.playerId} spawned ${effect.params.unitType} directly (paired with Instinct)`);
        }
      }
      else if (effect.type === "spawn_building" && play.cmd.target && typeof play.cmd.target === "object" && 'q' in play.cmd.target) {
        console.log(`[PhaseSystem] spawning building ${effect.params.buildingType}`);
        const building = createBuilding(effect.params.buildingType, play.playerId, play.cmd.target);
        state.buildings[building.id] = building;
      }
      else if (effect.type === "spawn_trap" && play.cmd.target && typeof play.cmd.target === "object" && 'q' in play.cmd.target) {
        console.log(`[PhaseSystem] spawning trap ${effect.params.trapType}`);
        const trap = createTrap(effect.params.trapType, play.playerId, play.cmd.target);
        state.traps[trap.id] = trap;
      }
      else if (effect.type === "heal" && play.cmd.target && typeof play.cmd.target === "string") {
        const u = state.units[play.cmd.target as string];
        if (u) u.hp = Math.min(u.hp + effect.params.amount, u.maxHp);
      }
      else if (effect.type === "area_buff" && play.cmd.target && typeof play.cmd.target === "object" && 'q' in play.cmd.target) {
        const { radius, speed, movement, duration } = effect.params;
        for (const u of Object.values(state.units)) {
          if (u.owner === play.playerId && hexDistance(play.cmd.target as any, u.position) <= radius) {
            if (speed) u.modifiers.push({ source: "catnip_mist", stat: "speed", amount: speed, duration: duration === 1 ? "end_of_turn" : "permanent" });
            if (movement) u.modifiers.push({ source: "catnip_mist", stat: "movement", amount: movement, duration: duration === 1 ? "end_of_turn" : "permanent" });
          }
        }
      }
      else if (effect.type === "shield" && play.cmd.target && typeof play.cmd.target === "string") {
        const u = state.units[play.cmd.target as string];
        if (u) {
          // Implementing shield as temporary HP + visual modifier
          u.hp += effect.params.amount;
          u.modifiers.push({ source: "cardboard_box", stat: "speed", amount: 0, duration: "permanent" }); // Placeholder speed nerf/box indicator
          console.log(`[PhaseSystem] Applied shield to ${u.type}. New HP: ${u.hp}`);
        }
      }
      else if (effect.type === "lure_unit" && play.cmd.target && typeof play.cmd.target === "object" && 'q' in play.cmd.target) {
        // Find nearest enemy unit within radius and move it to target tile
        const center = play.cmd.target as any;
        let nearest: Unit | null = null;
        let minDist = effect.params.radius + 1;
        for (const u of Object.values(state.units)) {
          if (u.owner !== play.playerId) {
            const dist = hexDistance(center, u.position);
            if (dist < minDist) {
              minDist = dist;
              nearest = u;
            }
          }
        }
        if (nearest) {
          console.log(`[PhaseSystem] Laser Pointer lured ${nearest.type} to ${center.q},${center.r}`);
          nearest.position = center;
        }
      }
      else if (effect.type === "rush_molt" && play.cmd.target) {
        let u: Unit | undefined;
        if (typeof play.cmd.target === "string") {
          u = state.units[play.cmd.target];
        } else {
          const hex = play.cmd.target as { q: number, r: number };
          u = Object.values(state.units).find(unit => unit.position.q === hex.q && unit.position.r === hex.r);
        }

        if (u && u.owner === play.playerId) {
          const evoIndex = player.hand.findIndex(c => c.moltsFrom === u!.type);
          if (evoIndex !== -1) {
            const evoCard = player.hand[evoIndex];
            
            // Validate cost of hand-pulled card!
            if (player.catnip < evoCard.cost) {
              console.log(`[PhaseSystem] Fresh Spark FAILED: Not enough catnip to afford ${evoCard.name} (${player.catnip}/${evoCard.cost})`);
              events.push({ 
                type: "card_effect_failed", 
                playerId: play.playerId, 
                cardName: "Fresh Spark", 
                reason: `Not enough Catnip to afford ${evoCard.name} (needs ${evoCard.cost}).` 
              });
              return events;
            }

            // Pay for evo card
            player.catnip -= evoCard.cost;
            player.hand.splice(evoIndex, 1);
            
            const evoEffect = evoCard.effects.find(e => e.type === "molt_unit");
            if (evoEffect) {
              const newUnit = createUnit(evoEffect.params.unitType, play.playerId, u.position);
              newUnit.spawnedThisTurn = false; // Bypass spawn sickness
              delete state.units[u.id];
              state.units[newUnit.id] = newUnit;
              console.log(`[PhaseSystem] Fresh Spark molted ${u.type} -> ${evoEffect.params.unitType} (Charged ${evoCard.cost} catnip)`);
              events.push({ type: "unit_molted", playerId: play.playerId, fromType: u.type, toType: evoEffect.params.unitType, position: u.position });
            }
          }
        }
      }
      else if (effect.type === "deck_molt" && play.cmd.target) {
        let u: Unit | undefined;
        if (typeof play.cmd.target === "string") {
          u = state.units[play.cmd.target];
        } else {
          const hex = play.cmd.target as { q: number, r: number };
          u = Object.values(state.units).find(unit => unit.position.q === hex.q && unit.position.r === hex.r);
        }

        if (u && u.owner === play.playerId) {
          const line = effect.params.line;
          console.log(`[PhaseSystem] ${play.playerId} attempting ${line} Spirit evolution on ${u.type}`);

          const houseStages = ["tabby", "siamese", "sphynx", "maine_coon", "calico"];
          const strayStages = ["tom", "alley_cat", "lion", "panther"];

          const isValidSpiritEvolution = (c: import("@hex-strategy/shared").Card) => {
            const tType = c.effects.find(e => e.type === "molt_unit")?.params.unitType;
            if (!tType) return false;
            if (line === "house") return houseStages.includes(tType);
            if (line === "stray") return strayStages.includes(tType);
            return false;
          };

          // Spirit pulls a RANDOM valid Stage 2/3 card from deck (user requirement)
          const eligibleIndices = player.deck
            .map((c, i) => isValidSpiritEvolution(c) ? i : -1)
            .filter(i => i !== -1);
          
          if (eligibleIndices.length > 0) {
            const deckIndex = eligibleIndices[Math.floor(Math.random() * eligibleIndices.length)];
            const evoCard = player.deck.splice(deckIndex, 1)[0];
            const evoEffect = evoCard.effects.find(e => e.type === "molt_unit");
            if (evoEffect) {
              const newUnit = createUnit(evoEffect.params.unitType, play.playerId, u.position);
              // Note: Spirit molts do NOT remove spawn sickness (unlike Fresh Spark) 
              delete state.units[u.id];
              state.units[newUnit.id] = newUnit;
              console.log(`[PhaseSystem] ${line} Spirit pulled RANDOM ${evoEffect.params.unitType} from deck for ${u.type}`);
              events.push({ type: "unit_molted", playerId: play.playerId, fromType: u.type, toType: evoEffect.params.unitType, position: u.position });
            }
          } else {
            console.log(`[PhaseSystem] ${line} Spirit FAILED: No valid ${line} Stage 2/3 unit in deck.`);
            player.catnip += card.cost; // Refund catnip on failure 
            events.push({ 
              type: "card_effect_failed", 
              playerId: play.playerId, 
              cardName: card.name, 
              reason: `No matching ${line} evolution in deck.` 
            });
          }
        }
      }
      else if (effect.type === "random_evolution") {
        const validTargets = Object.values(state.units).filter(u => 
          u.owner === play.playerId && 
          ["house_kitten", "stray_kitten", "tabby", "tom", "alley_cat"].includes(u.type)
        );
        
        const isStage3 = (c: import("@hex-strategy/shared").Card) => {
          const finalStages = ["lion", "panther", "maine_coon", "calico", "siamese", "sphynx"];
          return finalStages.includes(c.templateId);
        };

        const handCards = player.hand.filter(isStage3);
        const deckCards = player.deck.filter(isStage3);
        const allEligibleCards = [...handCards.map(c => ({ card: c, source: "hand" })), ...deckCards.map(c => ({ card: c, source: "deck" }))];

        if (validTargets.length > 0 && allEligibleCards.length > 0) {
          const randomTarget = validTargets[Math.floor(Math.random() * validTargets.length)];
          const chosen = allEligibleCards[Math.floor(Math.random() * allEligibleCards.length)];
          
          // Consume the chosen card
          if (chosen.source === "hand") {
            const idx = player.hand.findIndex(c => c.id === chosen.card.id);
            player.hand.splice(idx, 1);
          } else {
            const idx = player.deck.findIndex(c => c.id === chosen.card.id);
            player.deck.splice(idx, 1);
          }

          const evoEffect = chosen.card.effects.find(e => e.type === "molt_unit");
          if (evoEffect) {
            const newUnit = createUnit(evoEffect.params.unitType, play.playerId, randomTarget.position);
            // newUnit.spawnedThisTurn is true by default, preserves sickness
            delete state.units[randomTarget.id];
            state.units[newUnit.id] = newUnit;
            
            console.log(`[PhaseSystem] Random Evolution molted ${randomTarget.type} into ${evoEffect.params.unitType} from ${chosen.source}`);
            events.push({ type: "unit_molted", playerId: play.playerId, fromType: randomTarget.type, toType: evoEffect.params.unitType, position: randomTarget.position });
          }
        } else {
          const reason = validTargets.length === 0 ? "No valid targets on board." : "No Stage 3 cards in hand or deck.";
          console.log(`[PhaseSystem] Random Evolution FAILED: ${reason}`);
          player.catnip += card.cost; // Refund catnip on failure (user requirement)
          events.push({ 
            type: "card_effect_failed", 
            playerId: play.playerId, 
            cardName: "Random Evolution", 
            reason 
          });
        }
      }
    }

  return events;
}

/** Start the turn for a specific player (sequential turns — only they draw + get catnip). */
export function startNextTurn(state: GameState, nextPlayerId: string, prevPlayerId: string) {
  state.turn += 1;
  state.phase = "command";
  state.currentTurnPlayer = nextPlayerId;

  // Clear expired 'end_of_turn' modifiers and reset hit flags
  for (const u of Object.values(state.units)) {
    u.modifiers = u.modifiers.filter(m => m.duration !== "end_of_turn");
    if (u.owner === prevPlayerId) {
      u.wasHitLastTurn = false;
    }
  }
  for (const b of Object.values(state.buildings)) {
    b.modifiers = b.modifiers.filter(m => m.duration !== "end_of_turn");
  }

  // Evaluate start_of_turn quirks
  for (const u of Object.values(state.units)) {
    if (u.owner !== nextPlayerId) {
      // Enemy debuffs (Sphynx)
      const stats = UNIT_DICTIONARY[u.type];
      if (stats?.quirks?.some(q => q.id === "ancient_gaze")) {
        // Find allies of the current player near this enemy Sphynx
        for (const ally of Object.values(state.units).filter(al => al.owner === nextPlayerId)) {
          if (hexDistance(u.position, ally.position) <= 2) {
            ally.modifiers.push({ source: "ancient_gaze", stat: "speed", amount: -2, duration: "end_of_turn" });
          }
        }
      }
      continue;
    }
    
    const stats = UNIT_DICTIONARY[u.type];
    for (const q of stats?.quirks || []) {
      if (q.trigger === "start_of_turn" && q.id === "territorial") {
        const enemies = Object.values(state.units).filter(en => en.owner !== u.owner && hexDistance(u.position, en.position) <= 2);
        if (enemies.length > 0) {
          u.modifiers.push({ source: "territorial", stat: "movement", amount: 1, duration: "end_of_turn" });
          console.log(`[PhaseSystem] ${u.type} triggered Territorial quirk, +1 movement`);
        }
      }
    }
  }

  const player = state.players[nextPlayerId];
  if (player) {
    player.catnip += 1;

    // Building Start-of-turn effects
    for (const b of Object.values(state.buildings)) {
      if (b.owner === nextPlayerId) {
        const bStats = BUILDING_DICTIONARY[b.type];
        if (bStats?.quirks?.some(q => q.id === "auto_catniper")) {
          player.catnip += 1;
          console.log(`[PhaseSystem] Treat Dispenser generated +1 catnip for ${nextPlayerId}`);
        }
        if (bStats?.quirks?.some(q => q.id === "refreshing_sand")) {
          for (const u of Object.values(state.units).filter(unit => unit.owner === nextPlayerId)) {
            if (hexDistance(b.position, u.position) <= 2) {
              u.modifiers.push({ source: "refreshing_sand", stat: "movement", amount: 1, duration: "end_of_turn" });
            }
          }
        }
        if (bStats?.quirks?.some(q => q.id === "auto_groom")) {
          for (const u of Object.values(state.units).filter(unit => unit.owner === nextPlayerId)) {
            if (hexDistance(b.position, u.position) <= 1) {
              u.hp = Math.min(u.hp + 2, u.maxHp);
              console.log(`[PhaseSystem] Auto Groomed ${u.type} (+2 hp)`);
            }
          }
        }
      }
    }

    // Draw 1 card if deck is not empty
    if (player.deck.length > 0) {
      const drawnCard = player.deck.shift();
      if (drawnCard) {
        player.hand.push(drawnCard);
      }
      player.deckSize = player.deck.length;
    }
  }

  // Reset ALL units' action flags for the new turn
  for (const unit of Object.values(state.units)) {
    unit.hasMovedThisTurn = false;
    unit.hasAttackedThisTurn = false;
    unit.spawnedThisTurn = false;
  }
}

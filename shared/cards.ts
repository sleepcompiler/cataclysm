import { Card } from "./types";
import { STAGE_1_UNIT_TEMPLATES, STAGE_1_BUILDING_TEMPLATES, STAGE_1_TRAP_TEMPLATES } from "./unitStats";

export const STARTER_TEMPLATES = [...STAGE_1_UNIT_TEMPLATES, ...STAGE_1_BUILDING_TEMPLATES, ...STAGE_1_TRAP_TEMPLATES];

export interface DeckFormat {
  id: string;
  name: string;
  deckSize: number;
  maxCopies: number;
  requireStage1: boolean;
}

export const STANDARD_FORMAT: DeckFormat = {
  id: "standard",
  name: "Standard",
  deckSize: 25,
  maxCopies: 3,
  requireStage1: true,
};

export const DEFAULT_DECK = [
  "potential_cat", "potential_cat", "potential_cat",
  "okcatsu_mewta", "okcatsu_mewta", "okcatsu_mewta",
  "takabas_laughter", "takabas_laughter",
  "cat_tree_cannon", "cat_tree_wizard", "cat_tree_catapult",
  "scratching_post", "cardboard_box", "treat_dispenser"
];

// Ensure DEFAULT_DECK is 25 cards
while (DEFAULT_DECK.length < 25) {
  DEFAULT_DECK.push("purr");
}

export const CARD_LIBRARY: Record<string, Omit<Card, "id">> = {

  // troops
  potential_cat: {
    templateId: "potential_cat",
    name: "Potential Cat",
    description: "Generates shadow tickets each turn it survives.",
    type: "troop",
    cost: 1,
    target: "tile",
    effects: [{ type: "spawn_unit", params: { unitType: "potential_cat" } }]
  },
  okcatsu_mewta: {
    templateId: "okcatsu_mewta",
    name: "Okcatsu Mewta",
    description: "Copies enemy abilities when he attacks them.",
    type: "troop",
    cost: 2,
    target: "tile",
    effects: [{ type: "spawn_unit", params: { unitType: "okcatsu_mewta" } }]
  },
  ten_shadows_kitten: {
    templateId: "ten_shadows_kitten",
    name: "10 Shadows Kitten",
    description: "Has reached his full potential.",
    type: "troop",
    cost: 4,
    target: "tile",
    moltsFrom: "potential_cat",
    effects: [{ type: "molt_unit", params: { unitType: "ten_shadows_kitten" } }]
  },
  katarot: {
    templateId: "katarot",
    name: "Katarot",
    description: "Loves a good fight. Spawns as Super Katarot if he dies enough.",
    type: "troop",
    cost: 1,
    target: "tile",
    effects: [{ type: "spawn_unit", params: { unitType: "katarot" } }]
  },
  levi_caterman: {
    templateId: "levi_caterman",
    name: "Levi Caterman",
    description: "Snowballs speed and attack on kill.",
    type: "troop",
    cost: 2,
    target: "tile",
    effects: [{ type: "spawn_unit", params: { unitType: "levi_caterman" } }]
  },
  sasuke_uchinya: {
    templateId: "sasuke_uchinya",
    name: "Sasuke Uchinya",
    description: "Has lifesteal.",
    type: "troop",
    cost: 2,
    target: "tile",
    effects: [{ type: "spawn_unit", params: { unitType: "sasuke_uchinya" } }]
  },
  chainsaw_cat: {
    templateId: "chainsaw_cat",
    name: "Chainsaw Cat",
    description: "Attack scales as HP falls.",
    type: "troop",
    cost: 1,
    target: "tile",
    effects: [{ type: "spawn_unit", params: { unitType: "chainsaw_cat" } }]
  },
  l_gato: {
    templateId: "l_gato",
    name: "L Gato",
    description: "Places invisible traps that end turn.",
    type: "troop",
    cost: 2,
    target: "tile",
    effects: [{ type: "spawn_unit", params: { unitType: "l_gato" } }]
  },
  light_nyagami: {
    templateId: "light_nyagami",
    name: "Light Nyagami",
    description: "Points to an enemy and gives them a countdown to death.",
    type: "troop",
    cost: 2,
    target: "tile",
    effects: [{ type: "spawn_unit", params: { unitType: "light_nyagami" } }]
  },
  zenyatsu: {
    templateId: "zenyatsu",
    name: "Zenyatsu",
    description: "Asleep, but hits hard and first when struck while still.",
    type: "troop",
    cost: 2,
    target: "tile",
    effects: [{ type: "spawn_unit", params: { unitType: "zenyatsu" } }]
  },

  // buildings 
  scratching_post: {
    templateId: "scratching_post",
    name: "Scratching Post",
    description: "Forces enemies in range to attack it until it breaks.",
    type: "building",
    cost: 2,
    target: "tile",
    effects: [{ type: "spawn_building", params: { buildingType: "scratching_post" } }]
  },
  litter_box: {
    templateId: "litter_box",
    name: "Litter Box",
    description: "Nearby allies gain +1 movement at turn start.",
    type: "building",
    cost: 1,
    target: "tile",
    effects: [{ type: "spawn_building", params: { buildingType: "litter_box" } }]
  },
  treat_dispenser: {
    templateId: "treat_dispenser",
    name: "Treat Dispenser",
    description: "generates +1 Catnip at the start of your turn.",
    type: "building",
    cost: 2,
    target: "tile",
    effects: [{ type: "spawn_building", params: { buildingType: "treat_dispenser" } }]
  },
  grooming_station: {
    templateId: "grooming_station",
    name: "Grooming Station",
    description: "Heals allies. Breaks after 2 manual uses.",
    type: "building",
    cost: 2,
    target: "tile",
    effects: [{ type: "spawn_building", params: { buildingType: "grooming_station" } }]
  },

  // traps 
  yarn_ball: {
    templateId: "yarn_ball",
    name: "Yarn Ball",
    description: "Stops enemy movement.",
    type: "trap",
    cost: 1,
    target: "tile",
    effects: [{ type: "spawn_trap", params: { trapType: "yarn_ball" } }]
  },
  cucumber: {
    templateId: "cucumber",
    name: "Cucumber Scare",
    description: "Scares an enemy, canceling their action.",
    type: "trap",
    cost: 2,
    target: "tile",
    effects: [{ type: "spawn_trap", params: { trapType: "cucumber" } }]
  },

  // instincts 
  takabas_laughter: {
    templateId: "takabas_laughter",
    name: "Takaba's Laughter",
    description: "Convince Takaba it would be funny if megumi reached his full potential. Instantly molts a 10 Shadows Kitten to Stage 3.",
    type: "instinct",
    cost: 2,
    target: "unit",
    effects: [{ type: "rush_molt", params: { targetStage: "ten_shadows_cat" } }]
  },
  rikas_collar: {
    templateId: "rikas_collar",
    name: "Rika's Collar",
    description: "Molts Okcatsu Mewta into Rika Link Mode.",
    type: "instinct",
    cost: 2,
    target: "unit",
    effects: [{ type: "rush_molt", params: { targetStage: "rika_link_mode" } }]
  },
  summon_shikigami: {
    templateId: "summon_shikigami",
    name: "Summon Shikigami",
    description: "Consumes all shadow tickets to summon a Shikigami.",
    type: "instinct",
    cost: 0,
    target: "tile",
    draftable: false,
    effects: [{ type: "summon_shikigami", params: {} }]
  },
  odm_upgrade: {
    templateId: "odm_upgrade",
    name: "ODM Upgrade",
    description: "Molts Levi Caterman into Scout Levi.",
    type: "instinct",
    cost: 2,
    target: "unit",
    effects: [{ type: "rush_molt", params: { targetStage: "scout_levi" } }]
  },
  erwins_sacrifice: {
    templateId: "erwins_sacrifice",
    name: "Erwin's Sacrifice",
    description: "Molts Scout Levi into Captain Levi.",
    type: "instinct",
    cost: 4,
    target: "unit",
    effects: [{ type: "rush_molt", params: { targetStage: "captain_levi" } }]
  },
  mangekyou_awakening: {
    templateId: "mangekyou_awakening",
    name: "Mangekyou Awakening",
    description: "Molts Sasuke into Rogue Sasuke.",
    type: "instinct",
    cost: 2,
    target: "unit",
    effects: [{ type: "rush_molt", params: { targetStage: "rogue_sasuke" } }]
  },
  six_paths_chakra: {
    templateId: "six_paths_chakra",
    name: "Six Paths Chakra",
    description: "Molts Rogue Sasuke into Shadow Hokage Sasuke.",
    type: "instinct",
    cost: 4,
    target: "unit",
    effects: [{ type: "rush_molt", params: { targetStage: "shadow_hokage_sasuke" } }]
  },
  devil_blood: {
    templateId: "devil_blood",
    name: "Devil Blood",
    description: "Molts Chainsaw Cat into Demonic Chainsaw Cat.",
    type: "instinct",
    cost: 3,
    target: "unit",
    effects: [{ type: "rush_molt", params: { targetStage: "demonic_chainsaw_cat" } }]
  },
  the_inheritance: {
    templateId: "the_inheritance",
    name: "The Inheritance",
    description: "Molts L Gato into L's Successors.",
    type: "instinct",
    cost: 3,
    target: "unit",
    effects: [{ type: "rush_molt", params: { targetStage: "ls_successors" } }]
  },
  shinigami_eyes: {
    templateId: "shinigami_eyes",
    name: "Shinigami Eyes",
    description: "Molts Light Nyagami into Kami of the New World.",
    type: "instinct",
    cost: 2,
    target: "unit",
    effects: [{ type: "rush_molt", params: { targetStage: "kami_of_new_world" } }]
  },
  adderall: {
    templateId: "adderall",
    name: "Adderall",
    description: "Molts Zenyatsu into Awakened Zenyatsu.",
    type: "instinct",
    cost: 3,
    target: "unit",
    effects: [{ type: "rush_molt", params: { targetStage: "awakened_zenyatsu" } }]
  },
  catnip_mist: {
    templateId: "catnip_mist",
    name: "Catnip Mist",
    description: "Buffs nearby units' speed and movement.",
    type: "instinct",
    cost: 2,
    target: "tile",
    effects: [{ type: "area_buff", params: { radius: 2, speed: 10, movement: 1, duration: 1 } }]
  },
  laser_pointer: {
    templateId: "laser_pointer",
    name: "Laser Pointer",
    description: "Lures enemies towards a tile.",
    type: "instinct",
    cost: 1,
    target: "tile",
    effects: [{ type: "lure_unit", params: { radius: 5 } }]
  },
  cardboard_box: {
    templateId: "cardboard_box",
    name: "Cardboard Box",
    description: "Unit hides in a box. Absorbs 1 hit, or collapses at end of turn.",
    type: "instinct",
    cost: 1,
    target: "unit",
    effects: [{ type: "shield", params: {} }]
  },
  purr: {
    templateId: "purr",
    name: "Purr",
    description: "Heals a unit for 50 HP.",
    type: "instinct",
    cost: 1,
    target: "unit",
    effects: [{ type: "heal", params: { amount: 50 } }]
  },
  hiss: {
    templateId: "hiss",
    name: "Hiss",
    description: "Pushes a unit away.",
    type: "instinct",
    cost: 3,
    target: "unit",
    effects: [{ type: "push", params: { distance: 1 } }]
  },
  cat_tree_cannon: {
    templateId: "cat_tree_cannon",
    name: "Cat Tree Cannon",
    description: "Adds a cannon attachment. Range 2, 200 damage to one unit. Acts as a 500 HP shield for the tree.",
    type: "instinct",
    cost: 5,
    target: "building",
    effects: [{ type: "equip_attachment", params: { attachmentType: "cannon", hp: 500, isShield: true } }]
  },
  cat_tree_wizard: {
    templateId: "cat_tree_wizard",
    name: "Cat Wizard",
    description: "Summons a Cat Wizard attachment. Zaps all enemies in range for 100 dmg each turn, and instantly heals the tree for 500 HP when played. Leaves after taking 800 damage.",
    type: "instinct",
    cost: 5,
    target: "building",
    effects: [{ type: "equip_attachment", params: { attachmentType: "wizard", hp: 800, isShield: false } }]
  },
  cat_tree_catapult: {
    templateId: "cat_tree_catapult",
    name: "Catapult",
    description: "Adds a catapult attachment. Range 4, 150 damage to a single unit. Acts as a 200 HP shield.",
    type: "instinct",
    cost: 4,
    target: "building",
    effects: [{ type: "equip_attachment", params: { attachmentType: "catapult", hp: 200, isShield: true } }]
  },
};

export function validateDeck(deck: string[], format: DeckFormat = STANDARD_FORMAT): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (deck.length !== format.deckSize) {
    errors.push(`Deck must have exactly ${format.deckSize} cards (current: ${deck.length}).`);
  }
  const counts: Record<string, number> = {};
  let stage1Count = 0;
  for (const id of deck) {
    if (CARD_LIBRARY[id]?.draftable === false) {
      errors.push(`Card '${CARD_LIBRARY[id]?.name || id}' cannot be drafted directly.`);
    }
    counts[id] = (counts[id] || 0) + 1;
    if (counts[id] > format.maxCopies) {
      const name = CARD_LIBRARY[id]?.name || id;
      errors.push(`Maximum ${format.maxCopies} copies of '${name}' allowed.`);
    }
    if (STAGE_1_UNIT_TEMPLATES.includes(id) || STAGE_1_BUILDING_TEMPLATES.includes(id)) {
      stage1Count++;
    }
  }
  if (format.requireStage1 && stage1Count === 0) {
    errors.push("Deck must have at least one Stage 1 unit or building for a valid turn 1 play.");
  }
  return { valid: errors.length === 0, errors };
}

import { Card } from "./types";
import { STAGE_1_UNIT_TEMPLATES, STAGE_1_BUILDING_TEMPLATES, STAGE_1_TRAP_TEMPLATES } from "./unitStats";

// molt chains:
//   house kitten → tabby → maine coon
//   house kitten → tabby → calico
//   house kitten → siamese
//   house kitten → sphynx
//   stray kitten → tom → lion
//   stray kitten → alley cat → panther

// stage 1 units (now imported from unitStats)
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
  "house_kitten", "house_kitten", "house_kitten",
  "stray_kitten", "stray_kitten", "stray_kitten",
  "tabby", "tabby", "tom", "tom", "alley_cat", "alley_cat",
  "panther", "lion", "siamese", "sphynx", "calico",
  "fresh_spark", "random_evolution",
  "cat_tree_cannon", "cat_tree_wizard", "cat_tree_catapult",
  "scratching_post", "cardboard_box"
];

// Ensure DEFAULT_DECK is 25 cards
while (DEFAULT_DECK.length < 25) {
  DEFAULT_DECK.push("purr");
}

export const CARD_LIBRARY: Record<string, Omit<Card, "id">> = {

  //  stage 1 troops (deployable) 

  house_kitten: {
    templateId: "house_kitten",
    name: "House Kitten",
    description: "hyperactive little runt. insurance companies hate him",
    type: "troop",
    cost: 1,
    target: "tile",
    effects: [{ type: "spawn_unit", params: { unitType: "house_kitten" } }]
  },
  stray_kitten: {
    templateId: "stray_kitten",
    name: "Stray Kitten",
    description: "doesn't know what a thing is but he's willing to fight it.",
    type: "troop",
    cost: 1,
    target: "tile",
    effects: [{ type: "spawn_unit", params: { unitType: "stray_kitten" } }]
  },

  //  stage 2 molts 

  tabby: {
    templateId: "tabby",
    name: "Tabby",
    description: "a house cat on his day out. not the sharpest, but he's got claws",
    type: "troop",
    cost: 1,
    target: "tile",
    moltsFrom: "house_kitten",
    effects: [{ type: "molt_unit", params: { unitType: "tabby" } }]
  },
  siamese: {
    templateId: "siamese",
    name: "Siamese",
    description: "very vocal and very mean. will scream at you if you look at her wrong.",
    type: "troop",
    cost: 2,
    target: "tile",
    moltsFrom: "house_kitten",
    effects: [{ type: "molt_unit", params: { unitType: "siamese" } }]
  },
  sphynx: {
    templateId: "sphynx",
    name: "Sphynx",
    description: "his name is larry and he knows what you did. ",
    type: "troop",
    cost: 2,
    target: "tile",
    moltsFrom: "house_kitten",
    effects: [{ type: "molt_unit", params: { unitType: "sphynx" } }]
  },
  tom: {
    templateId: "tom",
    name: "Tom Cat",
    description: "brute. does not appreciate being picked up. he doesn't bite; he punches.",
    type: "troop",
    cost: 2,
    target: "tile",
    moltsFrom: "stray_kitten",
    effects: [{ type: "molt_unit", params: { unitType: "tom" } }]
  },
  alley_cat: {
    templateId: "alley_cat",
    name: "Alley Cat",
    description: "lean mean scratching machine. will fight you for your sandwich and spit it out. ",
    type: "troop",
    cost: 2,
    target: "tile",
    moltsFrom: "stray_kitten",
    effects: [{ type: "molt_unit", params: { unitType: "alley_cat" } }]
  },




  //  stage 3 molts 

  maine_coon: {
    templateId: "maine_coon",
    name: "Maine Coon",
    description: "absolute unit. does not care for fighting, would rather nap",
    type: "troop",
    cost: 2,
    target: "tile",
    moltsFrom: "tabby",
    effects: [{ type: "molt_unit", params: { unitType: "maine_coon" } }]
  },


  calico: {
    templateId: "calico",
    name: "Calico",
    description: "Vibrant and unpredictable.",
    type: "troop",
    cost: 2,
    target: "tile",
    moltsFrom: "tabby",
    effects: [{ type: "molt_unit", params: { unitType: "calico" } }]
  },
  panther: {
    templateId: "panther",
    name: "Panther",
    description: "watches lego batman every night. dreams of being catwoman. ",
    type: "troop",
    cost: 2,
    target: "tile",
    moltsFrom: "alley_cat",
    effects: [{ type: "molt_unit", params: { unitType: "panther" } }]
  },
  lion: {
    templateId: "lion",
    name: "Lion",
    description: "the ultimate brawler. the apex predator. or so she thinks. shes just a really big orange cat. ",
    type: "troop",
    cost: 2,
    target: "tile",
    moltsFrom: "tom",
    effects: [{ type: "molt_unit", params: { unitType: "lion" } }]
  },

  //  buildings 

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

  //  traps 

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

  //   instinct cards (spells) 

  //  molt instincts 

  fresh_spark: {
    templateId: "fresh_spark",
    name: "Fresh Spark",
    description: "Allows instant molting of a unit played this turn.",
    type: "instinct",
    cost: 1,
    target: "unit",
    effects: [{ type: "rush_molt", params: {} }]
  },
  stray_spirit: {
    templateId: "stray_spirit",
    name: "Stray Spirit",
    description: "Scans your deck and pulls a random Stray line card and plays it on your kitten to molt it.",
    type: "instinct",
    cost: 3,
    target: "unit",
    effects: [{ type: "deck_molt", params: { line: "stray" } }]
  },
  house_spirit: {
    templateId: "house_spirit",
    name: "House Spirit",
    description: "Scans your deck and pulls a random House line card and plays it on your kitten to molt it.",
    type: "instinct",
    cost: 3,
    target: "unit",
    effects: [{ type: "deck_molt", params: { line: "house" } }]
  },

  random_evolution: {
    templateId: "random_evolution",
    name: "Random Evolution",
    description: "Molts a random kitten on the board into a random Stage 3 cat from your hand or deck. Consumes both cards.",
    type: "instinct",
    cost: 1,
    target: "none",
    effects: [{ type: "random_evolution", params: {} }]
  },

  //   other instincts
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

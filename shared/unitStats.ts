export interface UnitStats {
  name: string;
  description: string;
  hp: number;
  attack: number;
  speed: number;   // initiative — how early it swings
  movement: number;
  range?: number;  // default to 1 if not specified
  stage: 1 | 2 | 3;
  line: string;    // e.g. "house", "stray"
  quirks?: Quirk[];
  moltsFrom?: string;
}

export const UNIT_DICTIONARY: Record<string, UnitStats> = {
  house_kitten: {
    name: "House Kitten",
    description: "hyperactive little runt. insurance companies hate him",
    hp: 30,
    attack: 10,
    speed: 20,
    movement: 3,
    stage: 1,
    line: "house"
  },
  stray_kitten: {
    name: "Stray Kitten",
    description: "doesn't know what a thing is but he's willing to fight it.",
    hp: 20,
    attack: 15,
    speed: 21,
    movement: 4,
    stage: 1,
    line: "stray"
  },

  tabby: {
    name: "Tabby",
    description: "a house cat on his day out. not the sharpest, but he's got claws",
    hp: 50,
    attack: 20,
    speed: 15,
    movement: 2,
    stage: 2,
    line: "house",
    moltsFrom: "house_kitten"
  },
  tom: {
    name: "Tom Cat",
    description: "brute. does not appreciate being picked up. he doesn't bite; he punches.",
    hp: 70,
    attack: 30,
    speed: 14,
    movement: 2,
    stage: 2,
    line: "stray",
    moltsFrom: "stray_kitten"
  },
  alley_cat: {
    name: "Alley Cat",
    description: "lean mean scratching machine. will fight you for your sandwich and spit it out. ",
    hp: 60,
    attack: 40,
    speed: 24,
    movement: 3,
    stage: 2,
    line: "stray",
    moltsFrom: "stray_kitten",
    quirks: [
      { id: "desperation_strike", name: "Desperation", description: "Doubles attack when in red HP (less than 1/3).", trigger: "combat_calculation", value: 2 }
    ]
  },

  maine_coon: {
    name: "Maine Coon",
    description: "absolute unit. does not care for fighting, would rather nap",
    hp: 120,
    attack: 50,
    speed: 6,
    movement: 2,
    stage: 3,
    line: "house",
    moltsFrom: "tabby",
    quirks: [
      { id: "fluffy", name: "Fluffy", description: "Thick fur reduces all incoming damage by 2.", trigger: "combat_calculation", value: 2 }
    ]
  },
  panther: {
    name: "Panther",
    description: "watches lego batman every night. dreams of being catwoman. ",
    hp: 90,
    attack: 60,
    speed: 35,
    movement: 3,
    stage: 3,
    line: "stray",
    moltsFrom: "alley_cat",
    quirks: [
      { id: "sharpness", name: "Sharpness", description: "each KO permanently increases attack by 1 ", trigger: "combat_calculation", value: 1 }
    ]
  },
  lion: {
    name: "Lion",
    description: "the ultimate brawler. the apex predator. or so she thinks. shes just a really big orange cat. ",
    hp: 200,
    attack: 80,
    speed: 10,
    movement: 3,
    stage: 3,
    line: "stray",
    moltsFrom: "tom",
    quirks: [
      { id: "territorial", name: "Territorial", description: "Gains +1 Movement at the start of its turn if an enemy is within range 2.", trigger: "start_of_turn", value: 1 }
    ]
  },
  siamese: {
    name: "Siamese",
    description: "very vocal and very mean. will scream at you if you look at her wrong.",
    hp: 100,
    attack: 30,
    speed: 20,
    movement: 3,
    stage: 2,
    line: "house",
    moltsFrom: "house_kitten",
    quirks: [
      { id: "mirror", name: "Mirror", description: "Reflects 50% of damage taken back to the attacker.", trigger: "combat_calculation", value: 0.5 }
    ]
  },
  sphynx: {
    name: "Sphynx",
    description: "his name is larry and he knows what you did. ",
    hp: 70,
    attack: 20,
    speed: 18,
    movement: 3,
    stage: 2,
    line: "house",
    moltsFrom: "house_kitten",
    quirks: [
      { id: "ancient_gaze", name: "Ancient Gaze", description: "Enemies within range 2 have -2 speed.", trigger: "start_of_turn", value: -2 }
    ]
  },
  calico: {
    name: "Calico",
    description: "Vibrant and unpredictable. Can lunge forward if attacked during the previous turn.",
    hp: 90,
    attack: 40,
    speed: 23,
    movement: 3,
    stage: 3,
    line: "house",
    moltsFrom: "tabby",
    quirks: [
      { id: "quick_step", name: "Quick Step", description: "If hit last turn, perform a bonus move that does not exhaust movement for the turn.", trigger: "active", cost: 0 }
    ]
  },
};

export interface BuildingStats {
  name: string;
  description: string;
  hp: number;
  attack?: number; // Optional: buildings usually don't attack unless they are towers
  range?: number;  // Optional: range of attack/effect
  speed: number;   // defensive fire initiative — how early it shoots back
  quirks?: Quirk[];
}

export const BUILDING_DICTIONARY: Record<string, BuildingStats> = {
  cat_tree: { 
    name: "Cat Tree", 
    description: "a towering monument to feline dominance. sprays unidentified liquids at trespassers.", 
    hp: 2000, 
    attack: 25, 
    range: 2, 
    speed: 15 
  },
  scratching_post: {
    name: "Scratching Post",
    description: "Forces enemies in range to attack it until it breaks.",
    hp: 100,
    speed: 0,
    quirks: [
      { id: "taunt", name: "Taunt", description: "Cats cannot resist scratching this post if within range.", trigger: "combat_calculation" }
    ]
  },
  litter_box: {
    name: "Litter Box",
    description: "Nearby allies gain +1 movement at turn start.",
    hp: 100,
    speed: 0,
    quirks: [
      { id: "refreshing_sand", name: "Refreshing Sand", description: "Allies within range 2 gain +1 movement at the start of your turn.", trigger: "start_of_turn", value: 1 }
    ]
  },
  treat_dispenser: {
    name: "Treat Dispenser",
    description: "the make and model have been clawed out. barely functional.",
    hp: 50,
    speed: 0,
    quirks: [
      { id: "auto_catniper", name: "Auto Feeder", description: "generates +1 Catnip at the start of your turn.", trigger: "start_of_turn", value: 1 }
    ]
  },
  grooming_station: {
    name: "Grooming Station",
    description: "Heals allies. Breaks after 2 manual uses.",
    hp: 180,
    speed: 0,
    quirks: [
      { id: "auto_groom", name: "Auto Groom", description: "Heals adjacent allies for 2 HP at the end of your turn.", trigger: "start_of_turn", value: 2 },
      { id: "deep_clean", name: "Deep Clean", description: "Instantly heal a unit for 5 HP. 2 uses total.", trigger: "active", cost: 1, value: 5 }
    ]
  }
};

export interface TrapStats {
  name: string;
  description: string;
  quirks?: Quirk[];
}

export const TRAP_DICTIONARY: Record<string, TrapStats> = {
  yarn_ball: { name: "Yarn Ball", description: "A highly tangled trap. Activates when an enemy steps on it, stopping their movement immediately." },
  cucumber: { name: "Cucumber", description: "A terrifying green cylinder. Scares an enemy that approaches, canceling their action." }
};

export type QuirkTrigger = "start_of_turn" | "on_molt" | "combat_calculation" | "on_step" | "active";

export interface Quirk {
  id: string;
  name: string;
  description: string;
  trigger: QuirkTrigger;
  cost?: number; // For 'active' quirks that require catnip
  value?: number; // Magnitude of the effect
}

// Helper lists for validation and AI
export const STAGE_1_UNIT_TEMPLATES = Object.keys(UNIT_DICTIONARY).filter(id => UNIT_DICTIONARY[id].stage === 1);
export const STAGE_1_BUILDING_TEMPLATES = Object.keys(BUILDING_DICTIONARY).filter(id => id !== 'cat_tree'); // All playable buildings except the base
export const STAGE_1_TRAP_TEMPLATES = Object.keys(TRAP_DICTIONARY);
export const STAGE_2_UNIT_TEMPLATES = Object.keys(UNIT_DICTIONARY).filter(id => UNIT_DICTIONARY[id].stage === 2);
export const STAGE_3_UNIT_TEMPLATES = Object.keys(UNIT_DICTIONARY).filter(id => UNIT_DICTIONARY[id].stage === 3);

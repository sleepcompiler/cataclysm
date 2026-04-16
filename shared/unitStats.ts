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
  potential_cat: {
    name: "Potential Cat",
    description: "has the potential to rival gojo catoru",
    hp: 40,
    attack: 15,
    speed: 20,
    movement: 3,
    stage: 1,
    line: "10_shadows",
    quirks: [
      { id: "generate_shadow_ticket", name: "10 Shadows Technique", description: "Generates a shadow at the end of every turn it survives.", trigger: "end_of_turn", value: 1 },
      { id: "combat_survivor", name: "potential", description: "Evolves after participating in and surviving 2 combat phases.", trigger: "post_combat" }
    ]
  },
  ten_shadows_kitten: {
    name: "10 Shadows Kitten (Stage 2)",
    description: "has warmed up. Can summon shikigami.",
    hp: 70,
    attack: 30,
    speed: 25,
    movement: 3,
    stage: 2,
    line: "10_shadows",
    quirks: [
      { id: "generate_shadow_ticket", name: "10 Shadows Technique", description: "Generates a shadow at the end of every turn it survives.", trigger: "end_of_turn", value: 1 }
    ],
    moltsFrom: "potential_cat"
  },
  ten_shadows_cat: {
    name: "10 Shadows Cat",
    description: " Has finally reached his full potential.",
    hp: 120,
    attack: 50,
    speed: 30,
    movement: 4,
    stage: 3,
    line: "10_shadows",
    moltsFrom: "ten_shadows_kitten"
  },
  okcatsu_mewta: {
    name: "Okcatsu Mewta",
    description: "Hey guys meet my JJK OC. He is a very depressed boy who is extremely powerful. Copies enemy abilities on attack.",
    hp: 60,
    attack: 25,
    speed: 22,
    movement: 3,
    stage: 1,
    line: "copycat",
    quirks: [
      { id: "copy_ability", name: "Copy Ability", description: "Permanently copies the quirks of the target it attacks.", trigger: "on_attack" }
    ]
  },
  rika_link_mode: {
    name: "Okcatsu (Rika Link Mode)",
    description: "Full manifestation. Can copy and hold up to 2 abilities.",
    hp: 100,
    attack: 45,
    speed: 30,
    movement: 4,
    stage: 2,
    line: "copycat",
    quirks: [
      { id: "copy_ability_2", name: "Copy Ability (x2)", description: "Copies up to 2 quirks of targets attacked.", trigger: "on_attack" }
    ],
    moltsFrom: "okcatsu_mewta"
  },
  katarot: {
    name: "Katarot",
    description: "loves a good fight. hasn't seen his son in a while.",
    hp: 50,
    attack: 20,
    speed: 15,
    movement: 3,
    stage: 1,
    line: "katarot",
    quirks: [
      { id: "zenkai_boost", name: "Zenkai Boost", description: "If hit but survives combat, gain +10 Max HP and Attack permanently.", trigger: "post_combat", value: 10 }
    ]
  },
  ss_katarot: {
    name: "Super Katarot",
    description: " you know what kills you makes you stronger",
    hp: 100,
    attack: 50,
    speed: 25,
    movement: 4,
    stage: 2,
    line: "katarot",
    quirks: [
      { id: "zenkai_boost", name: "Zenkai Boost", description: "If hit but survives combat, gain +10 Max HP and Attack permanently.", trigger: "post_combat", value: 10 }
    ]
  },
  ss2_katarot: {
    name: "Super Katarot 2",
    description: "he heard you're pretty strong",
    hp: 150,
    attack: 80,
    speed: 35,
    movement: 4,
    stage: 3,
    line: "katarot",
    quirks: [
      { id: "zenkai_boost", name: "Zenkai Boost", description: "If hit but survives combat, gain +10 Max HP and Attack permanently.", trigger: "post_combat", value: 10 }
    ]
  },
  levi_caterman: {
    name: "Levi Caterman",
    description: "Cold, calculating, and ruthlessly efficient. Snowballs on every kill.",
    hp: 60,
    attack: 30,
    speed: 35,
    movement: 3,
    stage: 1,
    line: "scout",
    quirks: [
      { id: "titan_killer", name: "Fidget spinner", description: "Gains permanent +10 ATK and SPD on kill.", trigger: "post_combat" }
    ]
  },
  scout_levi: {
    name: "Scout Levi",
    description: "Equipped with ODM gear.",
    hp: 80,
    attack: 45,
    speed: 50,
    movement: 5,
    stage: 2,
    line: "scout",
    quirks: [
      { id: "titan_killer", name: "Fidget spinner", description: "Gains permanent +10 ATK and SPD on kill.", trigger: "post_combat" }
    ],
    moltsFrom: "levi_caterman"
  },
  captain_levi: {
    name: "Captain Levi",
    description: "Felinekind's strongest soldier.",
    hp: 150,
    attack: 75,
    speed: 70,
    movement: 6,
    stage: 3,
    line: "scout",
    quirks: [
      { id: "titan_killer", name: "Fidget spinner", description: "Gains permanent +10 ATK and SPD on kill.", trigger: "post_combat" },
      { id: "first_strike", name: "First Strike", description: "Always attacks first in combat regardless of speed.", trigger: "combat_calculation" }
    ],
    moltsFrom: "scout_levi"
  },
  sasuke_uchinya: {
    name: "Sasuke Uchinya",
    description: "edge lord looking for his brother. its the only thing he can talk about. ",
    hp: 55,
    attack: 35,
    speed: 25,
    movement: 3,
    stage: 1,
    line: "shinobi",
    quirks: [
      { id: "curse_mark", name: "Curse Mark", description: "Lifesteal! Heals for 50% of damage dealt.", trigger: "post_combat", value: 0.5 }
    ]
  },
  rogue_sasuke: {
    name: "Rogue Sasuke Uchinya",
    description: "Met his brother. Did not go well. ",
    hp: 80,
    attack: 50,
    speed: 30,
    movement: 4,
    stage: 2,
    line: "shinobi",
    quirks: [
      { id: "amaterasu", name: "Amaterasu", description: "Active skill. Burns a target in range 3 for 20 dmg/turn.", trigger: "active" }
    ],
    moltsFrom: "sasuke_uchinya"
  },
  shadow_hokage_sasuke: {
    name: "Rinne Sasuke Uchinya",
    description: "met his brother again. this time it went better. ",
    hp: 110,
    attack: 65,
    speed: 40,
    movement: 4,
    stage: 3,
    line: "shinobi",
    quirks: [
      { id: "amaterasu", name: "Amaterasu", description: "Active skill. Burns a target in range 3 for 20 dmg/turn.", trigger: "active" },
      { id: "amenotejikara", name: "Amenotejikara", description: "Active skill (cost 1). Swap positions of ANY 2 units.", trigger: "active", cost: 1 }
    ],
    moltsFrom: "rogue_sasuke"
  },
  chainsaw_cat: {
    name: "Chainsaw Cat",
    description: "Gains ATK as he loses HP.",
    hp: 80,
    attack: 15,
    speed: 20,
    movement: 3,
    stage: 1,
    line: "devil",
    quirks: [
      { id: "rev_up", name: "Rev Up", description: "Bonus ATK equal to missing HP.", trigger: "combat_calculation" }
    ]
  },
  demonic_chainsaw_cat: {
    name: "Demonic Chainsaw Cat",
    description: "Rev up your heart.",
    hp: 150,
    attack: 40,
    speed: 30,
    movement: 4,
    stage: 2,
    line: "devil",
    quirks: [
      { id: "rev_up", name: "Rev Up", description: "Bonus ATK equal to missing HP.", trigger: "combat_calculation" },
      { id: "rip_and_tear", name: "Rip and Tear", description: "Active skill. Spend 10% max hp for +10% max ATK (compounding).", trigger: "active", cost: 0 }
    ],
    moltsFrom: "chainsaw_cat"
  },
  l_gato: {
    name: "L Gato",
    description: "Genius detective. Places invisible deduction traps.",
    hp: 40,
    attack: 5,
    speed: 15,
    movement: 3,
    stage: 1,
    line: "detective",
    quirks: [
      { id: "deduction_trap_skill", name: "Deduction Trap", description: "Active skill. Places invisible trap ending enemy turn.", trigger: "active", cost: 0 }
    ]
  },
  ls_successors: {
    name: "L's Successors",
    description: "Near & Mello. ",
    hp: 70,
    attack: 10,
    speed: 20,
    movement: 4,
    stage: 2,
    line: "detective",
    quirks: [
      { id: "advanced_deduction_trap", name: "Checkmate Trap", description: "Active skill. Unbreakable lockdown trap.", trigger: "active", cost: 0 }
    ],
    moltsFrom: "l_gato"
  },
  light_nyagami: {
    name: "Light Nyagami",
    description: "Has a certain notebook...",
    hp: 30,
    attack: 5,
    speed: 10,
    movement: 2,
    stage: 1,
    line: "god",
    quirks: [
      { id: "death_note", name: "Death Note", description: "Active skill. Distance * 2 turn delayed instant kill.", trigger: "active", cost: 0 }
    ]
  },
  kami_of_new_world: {
    name: "Kami of the New World",
    description: "Traded half his lifespan for eyes that can see further.",
    hp: 15, // Halved intentionally visually, handled on molt dynamically
    attack: 10,
    speed: 15,
    movement: 3,
    stage: 2,
    line: "god",
    quirks: [
      { id: "death_note_accelerated", name: "Quick Judgement", description: "Active skill. Distance * 1 turn delayed kill.", trigger: "active", cost: 0 }
    ],
    moltsFrom: "light_nyagami"
  },
  zenyatsu: {
    name: "Zenyatsu",
    description: "Asleep. Don't wake him up.",
    hp: 60,
    attack: 0,
    speed: 5,
    movement: 3,
    stage: 1,
    line: "slayer",
    quirks: [
      { id: "thunderclap", name: "Thunderclap Retaliation", description: "If hasn't moved, falls asleep. If struck while asleep, retaliates with massive damage.", trigger: "post_combat" }
    ]
  },
  awakened_zenyatsu: {
    name: "Awakened Zenyatsu",
    description: "The miracle of modern medication.",
    hp: 90,
    attack: 60,
    speed: 50,
    movement: 5,
    stage: 2,
    line: "slayer",
    moltsFrom: "zenyatsu"
  },
  divine_dog_white: {
    name: "Divine Dog (White)", description: "A white shikigami dog.", hp: 50, attack: 30, speed: 25, movement: 4, stage: 2, line: "shikigami",
    quirks: [{ id: "dog_death", name: "Dog Death", description: "Can combine when parts die.", trigger: "on_death" }]
  },
  divine_dog_black: {
    name: "Divine Dog (Black)", description: "A black shikigami dog.", hp: 50, attack: 30, speed: 25, movement: 4, stage: 2, line: "shikigami",
    quirks: [{ id: "dog_death", name: "Dog Death", description: "Can combine when parts die.", trigger: "on_death" }]
  },
  divine_dog_totality: {
    name: "Divine Dog: Totality", description: "The combined form of the dogs.", hp: 120, attack: 70, speed: 30, movement: 5, stage: 3, line: "shikigami"
  },
  nue: {
    name: "Nue", description: "Bird shikigami.", hp: 60, attack: 35, speed: 35, movement: 5, stage: 2, line: "shikigami",
    quirks: [{ id: "chain_lightning", name: "Chain Lightning", description: "Lightning strikes target and chains to nearby enemies for 20 damage.", trigger: "on_attack", value: 20 }]
  },
  toad: {
    name: "Toad", description: "Frog shikigami.", hp: 80, attack: 20, speed: 15, movement: 2, stage: 2, line: "shikigami",
    quirks: [{ id: "tongue_pull", name: "Tongue Pull", description: "Pulls attacked enemy to an adjacent tile.", trigger: "on_attack" }]
  },
  serpent: {
    name: "Serpent", description: "Snake shikigami.", hp: 70, attack: 50, speed: 40, movement: 5, stage: 2, line: "shikigami",
    quirks: [{ id: "burrow", name: "Burrow", description: "Becomes untargetable for one turn.", trigger: "active", cost: 1 }]
  },
  round_deer: {
    name: "Round Deer", description: "Deer shikigami. Reduces damage taken in an aura.", hp: 90, attack: 10, speed: 10, movement: 3, stage: 2, line: "shikigami",
    quirks: [{ id: "healing_aura", name: "Healing Aura", description: "Heals allies and reduces incoming damage in 2 range.", trigger: "end_of_turn", value: 10 }]
  },
  tiger_funeral: {
    name: "Tiger Funeral", description: "Tiger shikigami.", hp: 100, attack: 55, speed: 20, movement: 3, stage: 2, line: "shikigami"
  },
  mahoraga: {
    name: "Mahoraga", description: "The absolute unit. Adapts to enemies.", hp: 300, attack: 80, speed: 10, movement: 3, stage: 3, line: "shikigami",
    quirks: [{ id: "adapt", name: "Adaptation", description: "Buffs itself at end of turn depending on strongest enemy.", trigger: "end_of_turn" }]
  }
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
    attack: 20,
    range: 2,
    speed: 15,
    quirks: [
      { id: "multi_target", name: "Multi Target", description: "Can strike up to 2 unique enemies within range.", trigger: "combat_calculation", value: 2 }
    ]
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
  cucumber: { name: "Cucumber", description: "A terrifying green cylinder. Scares an enemy that approaches, canceling their action." },
  deduction_trap_1: { name: "Deduction Trap", description: "Ends opponent turn and grants 1 Catnip.", quirks: [{ id: "l_trap_1", name: "L's Trap", description: "Ends turn.", trigger: "on_step" }] },
  deduction_trap_2: { name: "Checkmate Trap", description: "Ends opponent turn, grants 2 Catnip, and completely disables your quirks.", quirks: [{ id: "l_trap_2", name: "Near's Trap", description: "Ends turn and silences.", trigger: "on_step" }] }
};

export type QuirkTrigger = "start_of_turn" | "on_molt" | "combat_calculation" | "on_step" | "active" | "end_of_turn" | "on_attack" | "on_death" | "post_combat";

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

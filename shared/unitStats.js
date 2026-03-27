export const UNIT_DICTIONARY = {
    house_kitten: { name: "House Kitten", description: "hyperactive little runt. insurance companies hate him", hp: 3, attack: 1, speed: 6, movement: 3 },
    stray_kitten: { name: "Stray Kitten", description: "doesn't know what a thing is but he's willing to fight it.", hp: 2, attack: 2, speed: 5, movement: 4 },
    tabby: { name: "Tabby", description: "a house cat on his day out. not the sharpest, but he's got claws", hp: 5, attack: 2, speed: 4, movement: 2, moltsFrom: "house_kitten" },
    tom: { name: "Tom Cat", description: "brute. does not appreciate being picked up. he doesn't bite; he punches.", hp: 7, attack: 3, speed: 3, movement: 2, moltsFrom: "stray_kitten" },
    alley_cat: {
        name: "Alley Cat", description: "lean mean scratching machine. will fight you for your sandwich and spit it out. ", hp: 6, attack: 4, speed: 5, movement: 3, moltsFrom: "stray_kitten", quirks: [
            { id: "desperation_strike", name: "Desperation", description: "Doubles attack when in red HP (less than 1/3).", trigger: "combat_calculation" }
        ]
    },
    maine_coon: {
        name: "Maine Coon", description: "absolute unit. does not care for fighting, would rather nap", hp: 12, attack: 5, speed: 2, movement: 2, moltsFrom: "tabby", quirks: [
            { id: "fluffy", name: "Fluffy", description: "Thick fur reduces all incoming damage by 2.", trigger: "combat_calculation" }
        ]
    },
    panther: {
        name: "Panther", description: "watches lego batman every night. dreams of being catwoman. ", hp: 9, attack: 6, speed: 5, movement: 3, moltsFrom: "alley_cat", quirks: [
            { id: "sharpness", name: "Sharpness", description: "Gains +1 Attack permanently after every KO.", trigger: "combat_calculation" }
        ]
    },
    lion: {
        name: "Lion", description: "the ultimate brawler. the apex predator. or so she thinks. shes just a really big orange cat. ", hp: 20, attack: 8, speed: 4, movement: 3, moltsFrom: "tom", quirks: [
            { id: "territorial", name: "Territorial", description: "Gains +1 Movement at the start of its turn if an enemy is within range 2.", trigger: "start_of_turn" }
        ]
    },
    siamese: {
        name: "Siamese", description: "very vocal and very mean. will scream at you if you look at her wrong.", hp: 10, attack: 3, speed: 8, movement: 3, moltsFrom: "house_kitten", quirks: [
            { id: "mirror", name: "Mirror", description: "Reflects 50% of damage taken back to the attacker.", trigger: "combat_calculation" }
        ]
    },
    sphynx: {
        name: "Sphynx", description: "his name is larry and he knows what you did. ", hp: 7, attack: 2, speed: 6, movement: 3, moltsFrom: "house_kitten", quirks: [
            { id: "ancient_gaze", name: "Ancient Gaze", description: "Enemies within range 2 have -2 speed.", trigger: "start_of_turn" }
        ]
    },
    calico: { name: "Calico", description: "Vibrant and unpredictable. Can lunge forward if attacked during the previous turn.", hp: 9, attack: 4, speed: 5, movement: 3, moltsFrom: "tabby", quirks: [
            { id: "quick_step", name: "Quick Step", description: "If hit last turn, perform a bonus move that does not exhaust movement for the turn.", trigger: "active", cost: 0 }
        ] },
};
export const BUILDING_DICTIONARY = {
    cat_tree: { name: "Cat Tree", description: "a towering monument to feline dominance. sprays unidentified liquids at trespassers.", hp: 20, speed: 3 },
    scratching_post: {
        name: "Scratching Post", description: "Forces enemies in range to attack it until it breaks.", hp: 6, speed: 0, quirks: [
            { id: "taunt", name: "Taunt", description: "Enemies in range 2 MUST attack the scratching post.", trigger: "combat_calculation" }
        ]
    },
    litter_box: {
        name: "Litter Box", description: "Nearby allies gain +1 movement at turn start.", hp: 10, speed: 0, quirks: [
            { id: "refreshing_sand", name: "Refreshing Sand", description: "Allies within range 2 gain +1 movement at the start of your turn.", trigger: "start_of_turn" }
        ]
    },
    treat_dispenser: {
        name: "Treat Dispenser", description: "the make and model have been clawed out. barely functional.", hp: 3, speed: 0, quirks: [
            { id: "auto_catniper", name: "Auto Feeder", description: "generates +1 Catnip at the start of your turn.", trigger: "start_of_turn" }
        ]
    },
    grooming_station: {
        name: "Grooming Station", description: "Heals allies. Breaks after 2 manual uses.", hp: 5, speed: 0, quirks: [
            { id: "auto_groom", name: "Auto Groom", description: "Heals adjacent allies for 2 HP at the end of your turn.", trigger: "start_of_turn" },
            { id: "deep_clean", name: "Deep Clean", description: "Instantly heal a unit for 5 HP. 2 uses total.", trigger: "active", cost: 1 }
        ]
    }
};
export const TRAP_DICTIONARY = {
    yarn_ball: { name: "Yarn Ball", description: "A highly tangled trap. Activates when an enemy steps on it, stopping their movement immediately." },
    cucumber: { name: "Cucumber", description: "A terrifying green cylinder. Scares an enemy that approaches, canceling their action." }
};

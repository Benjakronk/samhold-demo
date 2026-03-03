// ---- UNIT TYPES DATA ----
// Unit type definitions for the Samhold game
// Each unit type defines costs, capabilities, and training requirements

export const UNIT_TYPES = {
  scout: {
    name: 'Scout',
    icon: '👁️',
    cost: { population: 1, materials: 2 }, // materials for basic equipment
    upkeep: { food: 1 }, // food per turn
    training: 2, // turns to train
    movement: 3, // hexes per turn
    combat: 0, // no combat ability
    abilities: ['explore'],
    description: 'Explores fog of war. Fast movement, no combat ability.'
  },
  warrior: {
    name: 'Warrior',
    icon: '⚔️',
    cost: { population: 1, materials: 8 }, // significant materials for weapons/armor
    upkeep: { food: 2 }, // higher food cost
    training: 4, // longer training for combat skills
    movement: 2, // slower than scout
    combat: 3, // combat strength
    abilities: ['combat', 'defend'],
    description: 'Defends settlements and fights external threats. Requires materials to equip.'
  },
  worker: {
    name: 'Worker',
    icon: '🔨',
    cost: { population: 1, materials: 3 }, // basic tools
    upkeep: { food: 1 },
    training: 2, // basic skills training
    movement: 1, // very slow
    combat: 0, // no combat ability
    abilities: ['build'],
    description: 'Builds improvements on hexes. Slow but essential for expansion.'
  },
  elder: {
    name: 'Elder',
    icon: '👴',
    cost: { population: 1, materials: 1 }, // minimal materials, more ceremonial
    upkeep: { food: 1 },
    training: 3, // wisdom and cultural training
    movement: 1, // slow movement
    combat: 0, // no combat ability
    abilities: ['culture'],
    description: 'Maintains cultural traditions and generates Identity. Loss is devastating to oral tradition.'
  },
  settler: {
    name: 'Settler',
    icon: '🚛',
    cost: { population: 3, materials: 15 }, // high population and material cost
    upkeep: { food: 4 }, // high food cost for multiple people
    training: 5, // extensive preparation and organization
    movement: 1, // very slow due to carrying supplies
    combat: 1, // minimal defensive capability
    abilities: ['found'],
    description: 'Founds new settlements. Expansion splits population and dilutes cohesion.'
  }
};
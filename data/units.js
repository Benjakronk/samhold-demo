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
    vision: 2, // fog of war reveal radius
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
    vision: 1,
    combat: 3, // combat strength
    abilities: ['combat', 'defend'],
    description: 'Defends settlements and fights external threats. Requires materials to equip.'
  },
  surveyor: {
    name: 'Surveyor',
    icon: '🗺️',
    cost: { population: 1, materials: 8 },
    upkeep: { food: 1 },
    training: 2,
    movement: 2,
    vision: 1,
    combat: 0,
    abilities: ['foundRegion'],
    description: 'Names and claims a region of land. Consumed on founding; the worker returns to the settlement.'
  },
  steward: {
    name: 'Steward',
    icon: '🧭',
    cost: { population: 1, materials: 5 },
    upkeep: { food: 1 },
    training: 2,
    movement: 2,
    vision: 1,
    combat: 0,
    abilities: ['tend'],
    description: 'Tends monuments and sacred sites. Activate on a building to maintain it. Moving deactivates tending.'
  },
  settler: {
    name: 'Settler',
    icon: '🏕️',
    cost: { population: 5, materials: 25 },
    upkeep: { food: 3 },
    training: 6,
    movement: 1,
    vision: 1,
    combat: 0,
    abilities: ['found'],
    description: 'Founds new settlements. Consumed on founding. New settlement starts with small territory.'
  }
};
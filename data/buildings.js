// ---- BUILDING DATA ----
// Building type definitions for the Samhold game
// Each building defines construction costs, resource bonuses, and placement restrictions

export const BUILDINGS = {
  settlement: {
    name: 'Settlement',
    icon: '🏘️',
    cost: { materials: 0 },
    buildTurns: 0,
    validTerrain: ['grassland', 'hills', 'forest', 'desert'],
    foodBonus: 0,
    materialBonus: 0,
    maxWorkers: 0,
    autoFood: 3, // settlement auto-produces food without workers
    description: 'A center of population. Extends your territory.',
    onlyStart: true
  },
  farm: {
    name: 'Farm',
    icon: '🌾',
    cost: { materials: 8 },
    buildTurns: 2,
    validTerrain: ['grassland', 'wetland'],
    foodBonus: 5,
    materialBonus: 0,
    maxWorkers: 2,
    riverFoodBonus: 2, // extra food when on river
    description: 'Cultivates the land for a steady food supply.'
  },
  lumber_camp: {
    name: 'Lumber Camp',
    icon: '🪓',
    cost: { materials: 5 },
    buildTurns: 2,
    validTerrain: ['forest'],
    foodBonus: 0,
    materialBonus: 3,
    maxWorkers: 2,
    description: 'Harvests timber from the forest.'
  },
  quarry: {
    name: 'Quarry',
    icon: '⛏️',
    cost: { materials: 10 },
    buildTurns: 4,
    validTerrain: ['hills', 'mountain'],
    foodBonus: 0,
    materialBonus: 4,
    maxWorkers: 2,
    description: 'Extracts stone and ore from the earth.'
  },
  fishing_dock: {
    name: 'Fishing Dock',
    icon: '🎣',
    cost: { materials: 6 },
    buildTurns: 2,
    validTerrain: ['grassland', 'forest', 'hills', 'desert', 'wetland'],
    requiresAdjacentWater: true, // must be next to coast or lake
    validOnRiver: true, // also buildable on any hex with a river
    foodBonus: 4,
    materialBonus: 0,
    maxWorkers: 1,
    description: 'Built on the shore to harvest fish from nearby waters.'
  },
  hunting_camp: {
    name: 'Hunting Camp',
    icon: '🏹',
    cost: { materials: 3 },
    buildTurns: 0,
    validTerrain: ['forest', 'wetland', 'grassland'],
    foodBonus: 2,
    materialBonus: 1,
    maxWorkers: 1,
    description: 'Hunts game and gathers hides. Quick to set up.'
  }
};
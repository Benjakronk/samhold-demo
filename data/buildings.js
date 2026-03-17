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
  },
  sacred_site: {
    name: 'Sacred Site',
    icon: '⛩️',
    cost: { materials: 12 },
    buildTurns: 6,
    validTerrain: ['grassland', 'hills', 'forest', 'mountain', 'desert', 'wetland'],
    foodBonus: 0,
    materialBonus: 0,
    maxWorkers: 2,
    isSocietyBuilding: true,
    bondsYield: 0.1,      // Bonds accumulated per turn per worker (fractional accumulator)
    upkeepMaterials: 1,   // materials consumed per turn per worker
    description: 'A tended sacred site. Generates Bonds while staffed, but requires materials for upkeep.'
  },
  shrine: {
    name: 'Shrine',
    icon: '🕯️',
    cost: { materials: 10 },
    buildTurns: 4,
    validTerrain: ['grassland', 'hills', 'forest', 'mountain', 'desert', 'wetland'],
    foodBonus: 0,
    materialBonus: 0,
    maxWorkers: 2,
    isSocietyBuilding: true,
    identityYield: 0.15,
    satisfactionYield: 0.05,
    upkeepMaterials: 1,
    description: 'A place of spiritual practice. Generates Identity and Satisfaction while staffed.'
  },
  monument: {
    name: 'Monument',
    icon: '🗿',
    cost: { materials: 20 },
    buildTurns: 8,
    buildWorkers: 2,       // workers needed during construction
    validTerrain: ['grassland', 'hills', 'forest', 'mountain', 'desert', 'wetland'],
    foodBonus: 0,
    materialBonus: 0,
    maxWorkers: 0,         // no workers after completion — permanent passive effect
    isSocietyBuilding: true,
    permanentIdentityBonus: 3,
    upkeepMaterials: 1,    // flat 1 material/turn regardless of state (paid from processSocietyBuildings)
    description: 'A permanent monument commemorating your history. Grants Identity +3 on completion. Requires 1 material/turn upkeep.'
  },
  meeting_hall: {
    name: 'Meeting Hall',
    icon: '🏛️',
    cost: { materials: 15 },
    buildTurns: 5,
    validTerrain: ['grassland', 'hills', 'forest'],
    foodBonus: 0,
    materialBonus: 0,
    maxWorkers: 3,
    isSocietyBuilding: true,
    legitimacyYield: 0.12,
    upkeepMaterials: 1,
    description: 'A place for governance and deliberation. Generates Legitimacy and eases governance transitions.'
  },
  watchtower: {
    name: 'Watchtower', icon: '🗼',
    cost: { materials: 12 }, buildTurns: 3,
    validTerrain: ['grassland', 'hills', 'forest', 'mountain'],
    foodBonus: 0, materialBonus: 0, maxWorkers: 1,
    visionRadius: 3,
    description: 'Provides extended vision. Must be staffed.'
  }
};
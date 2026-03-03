// ---- TERRAIN DATA ----
// Terrain type definitions for the Samhold game
// Each terrain type defines movement costs, resource yields, and visual properties

export const TERRAIN = {
  grassland: {
    name: 'Grassland',
    color: '#7aaa45',
    colorAlt: '#6d9d3e',
    food: 3,
    materials: 0,
    movement: 1,
    description: 'Fertile open plains, ideal for farming.',
    icon: '🌾',
    elevation: 1
  },
  forest: {
    name: 'Forest',
    color: '#3d7b35',
    colorAlt: '#336b2d',
    food: 1,
    materials: 3,
    movement: 2,
    description: 'Dense woodland teeming with game and timber.',
    icon: '🌲',
    elevation: 2
  },
  hills: {
    name: 'Hills',
    color: '#8a7a5a',
    colorAlt: '#7d6e50',
    food: 1,
    materials: 2,
    movement: 2,
    description: 'Rolling highlands with exposed rock and mineral deposits.',
    icon: '⛰️',
    elevation: 3
  },
  mountain: {
    name: 'Mountain',
    color: '#6a6a72',
    colorAlt: '#5e5e66',
    food: 0,
    materials: 2,
    movement: 4,
    description: 'Towering peaks, rich in ore. Nearly impassable.',
    icon: '🏔️',
    elevation: 4
  },
  coast: {
    name: 'Coast',
    color: '#5a9ab5',
    colorAlt: '#5090aa',
    food: 2,
    materials: 0,
    movement: 1,
    description: 'Where land meets the sea. Abundant shellfish and open horizons.',
    icon: '🌊',
    elevation: 0
  },
  ocean: {
    name: 'Ocean',
    color: '#2a5a8a',
    colorAlt: '#245278',
    food: 0,
    materials: 0,
    movement: 99,
    description: 'Deep open water. Impassable without seafaring technology.',
    icon: '🌊',
    elevation: -1
  },
  lake: {
    name: 'Lake',
    color: '#4a8aaa',
    colorAlt: '#4080a0',
    food: 3,
    materials: 0,
    movement: 2,
    description: 'A calm freshwater lake. Rich in fish and a source of life.',
    icon: '🐟',
    elevation: 1
  },
  desert: {
    name: 'Desert',
    color: '#c4a95a',
    colorAlt: '#b89e50',
    food: 0,
    materials: 1,
    movement: 2,
    description: 'Parched and unforgiving. Survival here demands ingenuity.',
    icon: '🏜️',
    elevation: 1
  },
  wetland: {
    name: 'Wetland',
    color: '#5a7a55',
    colorAlt: '#50704c',
    food: 2,
    materials: 1,
    movement: 3,
    description: 'Boggy marshland. Rich in wildlife, difficult to build upon.',
    icon: '🦆',
    elevation: 0
  }
};
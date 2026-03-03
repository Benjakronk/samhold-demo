// ---- MODULE LOADER ----
// Imports and exposes modular game data to the main game
// This is our incremental bridge between the monolithic and modular structure

import { TERRAIN } from '../data/terrain.js';
import { BUILDINGS } from '../data/buildings.js';
import { UNIT_TYPES } from '../data/units.js';
import { THREAT_TYPES } from '../data/threats.js';
import * as CONSTANTS from '../data/constants.js';
import { createGameState } from './core/gameState.js';
import { createRNG } from '../utils/random.js';
import {
  offsetToCube,
  cubeDistance,
  hexToPixel,
  pixelToHex,
  hexNeighbor
} from '../utils/hexMath.js';

// Make all data available globally to maintain compatibility with existing game code
window.TERRAIN = TERRAIN;
window.BUILDINGS = BUILDINGS;
window.UNIT_TYPES = UNIT_TYPES;
window.THREAT_TYPES = THREAT_TYPES;

// Export constants individually for compatibility
window.MAP_COLS = CONSTANTS.MAP_COLS;
window.MAP_ROWS = CONSTANTS.MAP_ROWS;
window.HEX_SIZE = CONSTANTS.HEX_SIZE;
window.MAP_PAD = CONSTANTS.MAP_PAD;
window.TERRITORY_RADIUS = CONSTANTS.TERRITORY_RADIUS;
window.FOOD_PER_POP = CONSTANTS.FOOD_PER_POP;
window.FOOD_PER_CHILD = CONSTANTS.FOOD_PER_CHILD;
window.WORKING_AGE_MIN = CONSTANTS.WORKING_AGE_MIN;
window.WORKING_AGE_MAX = CONSTANTS.WORKING_AGE_MAX;
window.WORKING_AGE = CONSTANTS.WORKING_AGE;
window.SEASONS = CONSTANTS.SEASONS;
window.DEV_MODE = CONSTANTS.DEV_MODE;

// Utility functions
window.createRNG = createRNG;
window.offsetToCube = offsetToCube;
window.cubeDistance = cubeDistance;
window.hexToPixel = hexToPixel;
window.pixelToHex = pixelToHex;
window.hexNeighbor = hexNeighbor;

// Game state factory
window.createGameState = createGameState;

console.log('✅ Phase 1 modules loaded: Data definitions');
console.log('📦 Available data:', {
  terrain: Object.keys(TERRAIN).length + ' types',
  buildings: Object.keys(BUILDINGS).length + ' types',
  units: Object.keys(UNIT_TYPES).length + ' types',
  threats: Object.keys(THREAT_TYPES).length + ' types'
});

// Signal that modules are ready
window.modulesReady = true;

// Initialize the game now that all modules are loaded
// The initGame function will create gameState if needed
setTimeout(() => {
  if (typeof window.initGame === 'function') {
    window.initGame(7743); // Use default seed
    console.log('🎯 Game initialized with modules');
  }
}, 100); // Small delay to ensure DOM and other scripts are ready
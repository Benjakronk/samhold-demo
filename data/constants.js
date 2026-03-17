// ---- GAME CONSTANTS ----
// Core constants and configuration values for the Samhold game

// Map configuration
export const MAP_COLS = 20;
export const MAP_ROWS = 16;
export const HEX_SIZE = 64; // pixel size of hexes (used for rendering and calculations)
export const MAP_PAD = 64; // pixel padding around map (same as HEX_SIZE)

// Territory and population
export const TERRITORY_RADIUS = 2; // hex radius for settlement territory
export const SETTLEMENT_VISION = 2; // vision radius for settlements
export const FOOD_PER_POP = 2; // food consumed per adult per turn
export const FOOD_PER_CHILD = 1; // food consumed per child per turn
export const BASE_BIRTH_RATE = 0.12; // slightly increased for better population growth dynamics

// Working age policy
export const WORKING_AGE_MIN = 6; // minimum working age allowed
export const WORKING_AGE_MAX = 16; // maximum working age allowed
export let WORKING_AGE = 12; // current working age policy (can be modified by governance)

// Season and time
export const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter'];

// Minimap dimensions (pixels)
export const MM_W = 180;
export const MM_H = 135;

// Development mode
export const DEV_MODE = true;
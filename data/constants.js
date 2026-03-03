// ---- GAME CONSTANTS ----
// Core constants and configuration values for the Samhold game

// Map configuration
export const MAP_COLS = 20;
export const MAP_ROWS = 16;
export const HEX_SIZE = 32;
export const MAP_PAD = 2; // hexes of padding around actual playable map

// Territory and population
export const TERRITORY_RADIUS = 3; // hex radius for settlement territory
export const FOOD_PER_POP = 2; // food consumed per adult per turn
export const FOOD_PER_CHILD = 1; // food consumed per child per turn

// Working age policy
export const WORKING_AGE_MIN = 6; // minimum working age allowed
export const WORKING_AGE_MAX = 16; // maximum working age allowed
export let WORKING_AGE = 12; // current working age policy (can be modified by governance)

// Season and time
export const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter'];

// Development mode
export const DEV_MODE = true;
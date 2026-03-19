// ---- GAME CONSTANTS ----
// Core constants and configuration values for the Samhold game

// Map configuration
export const MAP_COLS = 20;
export const MAP_ROWS = 16;
export const HEX_SIZE = 64; // pixel size of hexes (used for rendering and calculations)
export const MAP_PAD = 64; // pixel padding around map (same as HEX_SIZE)

// Territory and population
export const TERRITORY_RADIUS = 5; // hex radius for settlement territory
export const FOOD_PER_POP = 2; // food consumed per adult per turn
export const FOOD_PER_CHILD = 1; // food consumed per child per turn
export const BASE_BIRTH_RATE = 0.12; // slightly increased for better population growth dynamics

// Working age policy
export const WORKING_AGE_MIN = 6; // minimum working age allowed
export const WORKING_AGE_MAX = 16; // maximum working age allowed
export let WORKING_AGE = 12; // current working age policy (can be modified by governance)

// Gender and reproduction
export const REPRODUCTIVE_AGE = 14; // biological maturity floor — independent of Working Age policy
export const STRESS_BIAS_MAX = 0.03; // max sex ratio bias from stress (+/- female probability)
export const NURSING_DURATION = 3; // turns a mother nurses after birth (50% labor capacity)
export const NURSING_LABOR_PENALTY = 0.5; // effective labor multiplier while nursing
export const LABOR_INTENSITY_PENALTY_WEIGHT = 0.4; // reproductive penalty weight for high-intensity female labor
export const MILITARY_SERVICE_PENALTY_WEIGHT = 0.6; // reproductive penalty weight for female military service

// Elder aging
export const ELDER_AGE = 50; // age at which adults become elders
export const MAX_AGE = 80; // absolute maximum age (100% death)
export const FOOD_PER_ELDER = 1; // food consumed per elder per turn (half adult ration)
export const NATURAL_DEATH_BASE_RATE = 0.02; // per year of age past ELDER_AGE
export const ELDER_LEGITIMACY_BONUS = 0.08; // per elder per turn
export const ELDER_IDENTITY_BONUS = 0.05; // per elder per turn
export const ELDER_KNOWLEDGE_PER_TURN = 0.3; // knowledge gained per elder per turn

// Season and time
export const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter'];

// Minimap dimensions (pixels)
export const MM_W = 180;
export const MM_H = 135;

// Development mode
export const DEV_MODE = true;
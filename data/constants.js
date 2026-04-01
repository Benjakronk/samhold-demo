// ---- GAME CONSTANTS ----
// Core constants and configuration values for the Samhold game

// Map configuration
export const MAP_COLS = 20;
export const MAP_ROWS = 16;
export const HEX_SIZE = 64; // pixel size of hexes (used for rendering and calculations)
export const MAP_PAD = 64; // pixel padding around map (same as HEX_SIZE)

// Territory and population
export const STARTING_SETTLEMENT_RADIUS = 2; // hex radius for initial settlement territory
export const NEW_SETTLEMENT_RADIUS = 1; // hex radius for newly founded settlements
export const TERRITORY_RADIUS = 2; // backward compat alias — use STARTING_SETTLEMENT_RADIUS for new code
export const TERRITORY_GOVERNANCE_THRESHOLD = 25; // hex count before governance strain starts
export const TERRITORY_GOVERNANCE_STRAIN_LEGITIMACY = 0.02; // legitimacy drain per hex over threshold per turn
export const TERRITORY_GOVERNANCE_STRAIN_BONDS = 0.01; // bonds drain per hex over threshold per turn
export const TERRITORY_STRAIN_OFFSET_PER_WORKER = 5; // admin hall workers offset this many hexes of strain
// Cultural territory growth
export const CULTURAL_GROWTH_BASE_COST = 14; // culturalStrength needed for first expansion
export const CULTURAL_GROWTH_STEP = 6; // additional cost per already-claimed hex
export const CULTURAL_GROWTH_DECAY = 0.3; // culturalStrength lost per turn with no border activity
export const CULTURAL_GROWTH_REGION_BONUS = 1.5; // scoring multiplier for hexes in a named cultural region

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
export const ELDER_AGE = 50; // age at which adults become elders (biological threshold)
export const MAX_AGE = 80; // absolute maximum age (100% death)
export const FOOD_PER_ELDER = 1; // food consumed per retired elder per turn (half adult ration)
export const NATURAL_DEATH_BASE_RATE = 0.02; // per year of age past ELDER_AGE
export const ELDER_LEGITIMACY_BONUS = 0.08; // per retired elder per turn
export const ELDER_IDENTITY_BONUS = 0.05; // per retired elder per turn
export const ELDER_KNOWLEDGE_PER_TURN = 0.3; // knowledge gained per retired elder per turn

// Retirement age policy
export const RETIREMENT_AGE_MIN = 50; // minimum retirement age (= ELDER_AGE)
export const RETIREMENT_AGE_MAX = 80; // maximum retirement age (= MAX_AGE)
export let RETIREMENT_AGE = 60; // current retirement age policy (mutable)
export const WORKING_ELDER_DEATH_MULTIPLIER = 1.5; // death risk multiplier for elders still working
export const WORKING_ELDER_RESENTMENT = 0.03; // satisfaction drain per working elder per turn

// Season and time
export const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter'];

// Minimap dimensions (pixels)
export const MM_W = 180;
export const MM_H = 135;

// Development mode
export const DEV_MODE = true;
// ---- SOCIETAL TRUST SYSTEM ----
// Two derived trust values that drift toward baselines computed from cohesion pillars.
// Institutional Trust (legitimacy + satisfaction) → drives resistance, policy compliance.
// Interpersonal Trust (identity + bonds) → drives crime rates, limits identity/bonds growth.
// Trust values are NOT shown in the main UI — felt through downstream effects only.
// Visible in dev panel for debugging and tuning.

// Baseline weights
const INST_WEIGHTS = { legitimacy: 0.55, satisfaction: 0.45 };
const INTER_WEIGHTS = { identity: 0.4, bonds: 0.6 };

// Drift rate: linear per turn. At 0.005/turn, a -0.20 shock takes 40 turns (10 years) to recover.
const DRIFT_RATE = 0.005;

// Rate limiter thresholds for interpersonal trust on Identity/Bonds growth
const RATE_LIMIT_FLOOR = 0.3;  // below this, Identity/Bonds growth is zeroed
const RATE_LIMIT_FULL = 0.7;   // above this, no rate limiting

let gameState = null;

export function initTrust(gameStateRef) {
  gameState = gameStateRef;

  // If trust wasn't initialized (e.g. old save), compute from current pillars
  if (!gameState.trust) {
    const c = gameState.cohesion;
    const instBase = (c.legitimacy * INST_WEIGHTS.legitimacy + c.satisfaction * INST_WEIGHTS.satisfaction) / 100;
    const interBase = (c.identity * INTER_WEIGHTS.identity + c.bonds * INTER_WEIGHTS.bonds) / 100;
    gameState.trust = {
      institutional: instBase,
      interpersonal: interBase,
      institutionalBaseline: instBase,
      interpersonalBaseline: interBase,
      deviations: { institutional: 0, interpersonal: 0 }
    };
  }
}

/**
 * Recalculate baselines from current cohesion pillars.
 * Returns { institutional, interpersonal } baselines.
 */
export function calculateTrustBaselines() {
  const c = gameState.cohesion;
  return {
    institutional: (c.legitimacy * INST_WEIGHTS.legitimacy + c.satisfaction * INST_WEIGHTS.satisfaction) / 100,
    interpersonal: (c.identity * INTER_WEIGHTS.identity + c.bonds * INTER_WEIGHTS.bonds) / 100
  };
}

/**
 * Per-turn trust processing. Called after calculateCohesion() in turn processing.
 * 1. Recalculates baselines from current pillar values.
 * 2. Decays deviations linearly toward zero.
 * 3. Computes final trust = clamp(baseline + deviation, 0, 1).
 */
export function processTrust() {
  if (!gameState?.trust) return;

  const t = gameState.trust;

  // 1. Recalculate baselines
  const baselines = calculateTrustBaselines();
  t.institutionalBaseline = baselines.institutional;
  t.interpersonalBaseline = baselines.interpersonal;

  // 1b. Class system reduces interpersonal trust baseline
  const classReduction = window.getInterpersonalTrustReduction ? window.getInterpersonalTrustReduction() : 0;
  if (classReduction > 0) {
    t.interpersonalBaseline = Math.max(0, t.interpersonalBaseline - classReduction);
  }

  // 2. Decay deviations toward zero
  if (t.deviations.institutional > 0) {
    t.deviations.institutional = Math.max(0, t.deviations.institutional - DRIFT_RATE);
  } else if (t.deviations.institutional < 0) {
    t.deviations.institutional = Math.min(0, t.deviations.institutional + DRIFT_RATE);
  }

  if (t.deviations.interpersonal > 0) {
    t.deviations.interpersonal = Math.max(0, t.deviations.interpersonal - DRIFT_RATE);
  } else if (t.deviations.interpersonal < 0) {
    t.deviations.interpersonal = Math.min(0, t.deviations.interpersonal + DRIFT_RATE);
  }

  // 3. Compute final trust values
  t.institutional = Math.max(0, Math.min(1, t.institutionalBaseline + t.deviations.institutional));
  t.interpersonal = Math.max(0, Math.min(1, t.interpersonalBaseline + t.deviations.interpersonal));
}

/**
 * Apply an immediate trust deviation from an event.
 * @param {string} type - 'institutional' or 'interpersonal'
 * @param {number} amount - signed float (negative = damage, positive = building)
 */
export function applyTrustDeviation(type, amount) {
  if (!gameState?.trust || !gameState.trust.deviations) return;
  if (type !== 'institutional' && type !== 'interpersonal') return;

  gameState.trust.deviations[type] += amount;

  // Clamp deviation so final trust stays in [0, 1]
  const baseline = type === 'institutional'
    ? gameState.trust.institutionalBaseline
    : gameState.trust.interpersonalBaseline;
  const maxDev = 1 - baseline;
  const minDev = -baseline;
  gameState.trust.deviations[type] = Math.max(minDev, Math.min(maxDev, gameState.trust.deviations[type]));

  // Update the final value immediately
  gameState.trust[type] = Math.max(0, Math.min(1, baseline + gameState.trust.deviations[type]));
}

/**
 * Returns a multiplier in [0, 1] for Identity/Bonds growth rate.
 * Used by cohesion.js to limit positive growth when interpersonal trust is low.
 * Linear interpolation: 0.0 at trust <= 0.3, 1.0 at trust >= 0.7.
 */
export function getInterpersonalRateLimiter() {
  if (!gameState?.trust) return 1.0;
  const trust = gameState.trust.interpersonal;
  if (trust >= RATE_LIMIT_FULL) return 1.0;
  if (trust <= RATE_LIMIT_FLOOR) return 0.0;
  return (trust - RATE_LIMIT_FLOOR) / (RATE_LIMIT_FULL - RATE_LIMIT_FLOOR);
}

/**
 * Returns a read-only snapshot of trust state for dev panel and future consumers.
 */
export function getTrustState() {
  if (!gameState?.trust) return null;
  const t = gameState.trust;
  return {
    institutional: t.institutional,
    interpersonal: t.interpersonal,
    institutionalBaseline: t.institutionalBaseline,
    interpersonalBaseline: t.interpersonalBaseline,
    deviations: {
      institutional: t.deviations.institutional,
      interpersonal: t.deviations.interpersonal
    },
    rateLimiter: getInterpersonalRateLimiter()
  };
}

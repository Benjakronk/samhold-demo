// ---- POLICY LAG SYSTEM ----
// Policy changes take time to propagate through society.
// Three categories: directive (snap, 1-2t), behavioral (interpolated, 3-5t), cultural (interpolated, 8t).
// Sliders are provisional until committed. Committed changes enter a lag pipeline.
// gameState.governance.policies always holds the EFFECTIVE value — no downstream reads change.

let gameState = null;

// ---- CONSTANTS ----

// Base lag by category (turns)
const BASE_LAG = {
  directive: 2,
  behavioral: 3,    // default; may be overridden per-policy/direction
  cultural: 8
};

// Governance model lag multipliers
const GOV_LAG_MULTIPLIER = {
  tribalCouncil: 1.4,
  chieftain: 0.7,
  theocracy: 1.0,   // directional overrides applied separately
  monarchy: 0.85,
  militaryRule: 0.6,
  democracy: 1.2
};

// Theocracy directional overrides (replace base gov multiplier when applicable)
const THEOCRACY_DIRECTION = {
  tradition_increase: 0.75,
  tradition_decrease: 1.35,
  freedom_decrease: 0.85,   // increasing control
  freedom_increase: 1.3,    // increasing freedom
  default: 1.0
};

// Legitimacy multiplier thresholds
const LEG_MULTIPLIER = [
  { min: 80, mult: 0.8 },
  { min: 50, mult: 1.0 },
  { min: 30, mult: 1.3 },
  { min: 0,  mult: 1.6 }
];

// Magnitude multiplier thresholds
const MAG_MULTIPLIER = [
  { max: 15, mult: 0.7 },
  { max: 30, mult: 1.0 },
  { max: Infinity, mult: 1.5 }
];

// Force costs by category
const FORCE_SATISFACTION_COST = {
  directive: -3,
  behavioral: -6,
  cultural: -10
};

const FORCE_LEGITIMACY_COST = {
  tribalCouncil: -18,
  chieftain: -8,
  theocracy: -12,
  monarchy: -10,
  militaryRule: -6,
  democracy: -14
};

// ---- INIT ----

export function initPolicyLag(gameStateRef) {
  gameState = gameStateRef;

  if (!gameState.policyLag) {
    gameState.policyLag = createDefaultLagState();
  }
}

function createDefaultLagState() {
  return {
    freedom: null,
    mercy: null,
    tradition: null,
    isolation: null,
    workingAge: null,
    pending: {
      freedom: null,
      mercy: null,
      tradition: null,
      isolation: null,
      workingAge: null
    }
  };
}

// ---- POLICY CATEGORIZATION ----

/**
 * Classify a policy change into a lag category.
 * @param {string} policy - policy name
 * @param {number} magnitude - absolute change amount
 * @param {number} direction - signed (positive = increase, negative = decrease)
 * @returns {{ category: string, baseLag: number }}
 */
export function classifyPolicyChange(policy, magnitude, direction) {
  if (policy === 'workingAge') {
    return { category: 'directive', baseLag: BASE_LAG.directive };
  }

  if (policy === 'mercy') {
    return { category: 'directive', baseLag: BASE_LAG.directive };
  }

  if (policy === 'tradition') {
    return { category: 'cultural', baseLag: BASE_LAG.cultural };
  }

  if (policy === 'isolation') {
    return { category: 'behavioral', baseLag: BASE_LAG.behavioral + 1 }; // 4 turns base
  }

  if (policy === 'freedom') {
    // Freedom uses magnitude-based categorization with directional asymmetry
    if (magnitude > 30) {
      return { category: 'cultural', baseLag: BASE_LAG.cultural };
    }
    if (magnitude >= 15) {
      // Behavioral with directional asymmetry: tightening=3, loosening=5
      const baseLag = direction < 0 ? 3 : 5;
      return { category: 'behavioral', baseLag };
    }
    return { category: 'directive', baseLag: BASE_LAG.directive };
  }

  // Fallback for any new policy
  return { category: 'directive', baseLag: BASE_LAG.directive };
}

// ---- LAG CALCULATION ----

/**
 * Calculate the effective lag in turns.
 */
export function calculateEffectiveLag(policy, targetValue, startValue) {
  const magnitude = Math.abs(targetValue - startValue);
  const direction = targetValue - startValue;
  if (magnitude === 0) return 0;

  const { category, baseLag } = classifyPolicyChange(policy, magnitude, direction);

  // Governance multiplier — read from model data if available, fallback to hardcoded
  const model = gameState.governance.model;
  let govMult = window.GOVERNANCE_MODELS?.[model]?.lagMultiplier ?? GOV_LAG_MULTIPLIER[model] ?? 1.0;

  // Theocracy directional overrides
  if (model === 'theocracy') {
    govMult = getTheocracyMultiplier(policy, direction);
  }

  // Legitimacy multiplier
  const legitimacy = gameState.cohesion?.legitimacy ?? 50;
  let legMult = 1.0;
  for (const tier of LEG_MULTIPLIER) {
    if (legitimacy >= tier.min) { legMult = tier.mult; break; }
  }

  // Magnitude multiplier
  let magMult = 1.0;
  for (const tier of MAG_MULTIPLIER) {
    if (magnitude <= tier.max) { magMult = tier.mult; break; }
  }

  // Administrative Hall reduction
  const hallReduction = getAdminHallReduction();

  const raw = baseLag * govMult * legMult * magMult * (1 - hallReduction);
  return { turns: Math.max(1, Math.floor(raw)), category };
}

function getTheocracyMultiplier(policy, direction) {
  if (policy === 'tradition') {
    return direction > 0 ? THEOCRACY_DIRECTION.tradition_increase : THEOCRACY_DIRECTION.tradition_decrease;
  }
  if (policy === 'freedom') {
    return direction > 0 ? THEOCRACY_DIRECTION.freedom_increase : THEOCRACY_DIRECTION.freedom_decrease;
  }
  return THEOCRACY_DIRECTION.default;
}

/**
 * Returns 0–0.3 based on staffed Administrative Hall workers.
 * Returns 0 during governance transitions.
 */
export function getAdminHallReduction() {
  if (!gameState?.map) return 0;
  if (gameState.governance.modelChangeTimer > 0) return 0; // suspended during transitions

  let totalWorkers = 0;
  let maxWorkers = 0;
  for (let r = 0; r < window.MAP_ROWS; r++) {
    for (let c = 0; c < window.MAP_COLS; c++) {
      const hex = gameState.map[r]?.[c];
      if (hex?.building === 'admin_hall' && hex.buildProgress <= 0) {
        const bDef = window.BUILDINGS?.admin_hall;
        totalWorkers += hex.workers || 0;
        maxWorkers += bDef?.maxWorkers || 3;
      }
    }
  }
  if (maxWorkers === 0) return 0;
  return (totalWorkers / maxWorkers) * 0.3;
}

// ---- PENDING (UNCOMMITTED) CHANGES ----

/**
 * Set a provisional (uncommitted) slider position.
 * No game effect until committed.
 */
export function setPendingPolicy(policy, value) {
  if (!gameState?.policyLag) return;
  // Enforce governance-model constraints
  const constraints = window.getPolicyConstraints ? window.getPolicyConstraints(policy) : { min: 0, max: 100 };
  value = Math.max(constraints.min, Math.min(constraints.max, value));
  if (policy !== 'workingAge') {
    value = Math.max(0, Math.min(100, value));
  } else {
    value = Math.max(6, Math.min(16, value));
  }
  gameState.policyLag.pending[policy] = value;
}

/**
 * Discard an uncommitted change. Free — no cost.
 */
export function discardPendingPolicy(policy) {
  if (!gameState?.policyLag) return;
  gameState.policyLag.pending[policy] = null;
}

/**
 * Discard all uncommitted changes.
 */
export function discardAllPending() {
  if (!gameState?.policyLag) return;
  for (const key of Object.keys(gameState.policyLag.pending)) {
    gameState.policyLag.pending[key] = null;
  }
}

// ---- COMMIT ----

/**
 * Commit a pending policy change, starting its lag period.
 * If no pending value, uses current slider position.
 */
export function commitPolicyChange(policy) {
  if (!gameState?.policyLag) return;

  const pendingValue = gameState.policyLag.pending[policy];
  if (pendingValue === null || pendingValue === undefined) return;

  // Current effective value (what's in gameState.governance.policies or WORKING_AGE)
  const startValue = policy === 'workingAge'
    ? window.WORKING_AGE
    : gameState.governance.policies[policy];

  if (pendingValue === startValue) {
    // No actual change
    gameState.policyLag.pending[policy] = null;
    return;
  }

  // If there's already an active lag for this policy, do a mid-lag redirect:
  // the current effective value becomes the new start, fresh lag calculated
  const existingLag = gameState.policyLag[policy];
  const actualStart = existingLag ? getCurrentEffective(policy) : startValue;

  // Calculate lag
  const { turns, category } = calculateEffectiveLag(policy, pendingValue, actualStart);

  // Store lag state
  gameState.policyLag[policy] = {
    target: pendingValue,
    startValue: actualStart,
    category,
    lagTurns: turns,
    turnsRemaining: turns,
    resistanceExtension: 0
  };

  // Clear the pending state
  gameState.policyLag.pending[policy] = null;

  // Track change timestamp
  gameState.governance.lastChanged.policies[policy] = gameState.turn;

  // TC consensus bonus: policies committed under Tribal Council get 0.5x passive resistance pressure
  if (gameState.governance.model === 'tribalCouncil' && gameState.resistance?.tcConsensusPolicies) {
    gameState.resistance.tcConsensusPolicies[policy] = true;
  }
}

/**
 * Commit all pending changes at once.
 */
export function commitAllPending() {
  if (!gameState?.policyLag) return;
  for (const policy of Object.keys(gameState.policyLag.pending)) {
    if (gameState.policyLag.pending[policy] !== null) {
      commitPolicyChange(policy);
    }
  }
}

// ---- ABANDON (post-commit cancel) ----

/**
 * Abandon an in-progress policy change. Snaps back to startValue.
 * Costs: -6 legitimacy, institutional trust drift penalty.
 */
export function abandonPolicyChange(policy) {
  const lag = gameState?.policyLag?.[policy];
  if (!lag) return;

  // Snap effective value back to start
  if (policy === 'workingAge') {
    window.WORKING_AGE = lag.startValue;
    gameState.governance.policies.workingAge = lag.startValue;
  } else {
    gameState.governance.policies[policy] = lag.startValue;
  }

  // Clear lag
  gameState.policyLag[policy] = null;

  // Costs
  gameState.cohesion.legitimacy = Math.max(0, gameState.cohesion.legitimacy - 6);
  if (window.applyTrustDeviation) {
    window.applyTrustDeviation('institutional', -0.05);
  }
}

// ---- FORCE (immediate implementation) ----

/**
 * Force immediate implementation of a committed policy change.
 * Heavy costs: legitimacy, institutional trust, satisfaction, materials.
 */
export function forcePolicyChange(policy) {
  const lag = gameState?.policyLag?.[policy];
  if (!lag) return;

  // Apply target immediately
  if (policy === 'workingAge') {
    // Graduate cohorts if lowering working age
    const oldAge = window.WORKING_AGE;
    window.WORKING_AGE = lag.target;
    gameState.governance.policies.workingAge = lag.target;
    if (lag.target < oldAge) {
      graduateCohorts(lag.target);
    }
  } else {
    gameState.governance.policies[policy] = lag.target;
  }

  // Clear lag
  gameState.policyLag[policy] = null;

  // Costs
  const model = gameState.governance.model;
  const legCost = FORCE_LEGITIMACY_COST[model] ?? -10;
  gameState.cohesion.legitimacy = Math.max(0, gameState.cohesion.legitimacy + legCost);

  const satCost = FORCE_SATISFACTION_COST[lag.category] ?? -6;
  gameState.cohesion.satisfaction = Math.max(0, gameState.cohesion.satisfaction + satCost);

  // Institutional trust: -0.10 base, -0.20 if organized resistance active
  const trustCost = (window.isOrganizedResistance && window.isOrganizedResistance()) ? -0.20 : -0.10;
  if (window.applyTrustDeviation) {
    window.applyTrustDeviation('institutional', trustCost);
  }

  // Materials cost: ceil(population * 0.15)
  const matCost = Math.ceil(gameState.population.total * 0.15);
  gameState.resources.materials = Math.max(0, gameState.resources.materials - matCost);
}

// ---- PER-TURN PROCESSING ----

/**
 * Tick all active lag periods. Called once per turn from turnProcessing.
 * Updates effective values in gameState.governance.policies.
 */
export function processPolicyLag(report) {
  if (!gameState?.policyLag) return;

  const policies = ['freedom', 'mercy', 'tradition', 'isolation', 'workingAge'];

  for (const policy of policies) {
    const lag = gameState.policyLag[policy];
    if (!lag) continue;

    lag.turnsRemaining--;

    // Organized resistance extends lag periods (+1 turn/turn, capped at 50% of original)
    if (window.isOrganizedResistance && window.isOrganizedResistance()) {
      const maxExtension = Math.ceil(lag.lagTurns * 0.5);
      const currentExtension = lag.resistanceExtension || 0;
      if (currentExtension < maxExtension) {
        lag.turnsRemaining++;
        lag.resistanceExtension = currentExtension + 1;
        if (report) report.events.push(`⚡ Organized resistance is delaying ${capitalize(policy)} policy implementation.`);
      }
    }

    if (lag.turnsRemaining <= 0) {
      // Lag resolved — apply target
      finalizePolicyChange(policy, lag, report);
      gameState.policyLag[policy] = null;
    } else {
      // Update effective value based on category
      updateEffectiveValue(policy, lag);
    }
  }

  // Enforce governance model constraints on effective values
  enforceModelConstraints();
}

function updateEffectiveValue(policy, lag) {
  if (lag.category === 'directive') {
    // Snap: effective stays at startValue until lag resolves
    // (already there — no update needed)
    return;
  }

  // Interpolated: linear from startValue to target
  const progress = 1 - (lag.turnsRemaining / lag.lagTurns);
  const effective = lag.startValue + (lag.target - lag.startValue) * progress;

  if (policy === 'workingAge') {
    // Working age is always directive (snap), so this shouldn't fire,
    // but safeguard: round to integer
    const rounded = Math.round(effective);
    window.WORKING_AGE = rounded;
    gameState.governance.policies.workingAge = rounded;
  } else {
    gameState.governance.policies[policy] = Math.round(effective);
  }
}

function finalizePolicyChange(policy, lag, report) {
  if (policy === 'workingAge') {
    const oldAge = window.WORKING_AGE;
    window.WORKING_AGE = lag.target;
    gameState.governance.policies.workingAge = lag.target;
    if (lag.target < oldAge) {
      graduateCohorts(lag.target);
    }
    if (report) report.events.push(`📋 Working age policy change is now in effect (${lag.target}).`);
  } else {
    gameState.governance.policies[policy] = lag.target;
    const label = window.getPolicyLabel ? window.getPolicyLabel(policy, lag.target) : lag.target;
    if (report) report.events.push(`📋 ${capitalize(policy)} policy change is now in effect (${label}).`);
  }
}

function graduateCohorts(newAge) {
  if (!gameState.childCohorts) return;
  for (let i = gameState.childCohorts.length - 1; i >= 0; i--) {
    const cohort = gameState.childCohorts[i];
    if (cohort.age >= newAge) {
      gameState.population.total += cohort.count;
      gameState.population.idle += cohort.count;
      if (window.addToAdultCohort) window.addToAdultCohort(cohort.age, cohort.count);
      gameState.childCohorts.splice(i, 1);
    }
  }
}

function enforceModelConstraints() {
  // Governance models may clamp policy values (e.g., military rule: freedom ≤ 20)
  const model = gameState.governance.model;
  if (model === 'militaryRule') {
    if (gameState.governance.policies.freedom > 20) {
      gameState.governance.policies.freedom = 20;
    }
  }
  if (model === 'democracy') {
    if (gameState.governance.policies.freedom < 40) {
      gameState.governance.policies.freedom = 40;
    }
  }
}

// ---- QUERY HELPERS ----

/**
 * Get the current effective value for a policy, accounting for in-progress lag.
 * This reads from gameState.governance.policies which is always kept current.
 */
function getCurrentEffective(policy) {
  if (policy === 'workingAge') return window.WORKING_AGE;
  return gameState.governance.policies[policy];
}

/**
 * Returns full lag state for a policy (for UI display).
 */
export function getPolicyLagState(policy) {
  if (!gameState?.policyLag) return null;
  return {
    lag: gameState.policyLag[policy],
    pending: gameState.policyLag.pending?.[policy] ?? null,
    effective: getCurrentEffective(policy)
  };
}

/**
 * Returns true if any policy has an active lag or pending change.
 */
export function hasAnyPolicyActivity() {
  if (!gameState?.policyLag) return false;
  const policies = ['freedom', 'mercy', 'tradition', 'isolation', 'workingAge'];
  for (const p of policies) {
    if (gameState.policyLag[p]) return true;
    if (gameState.policyLag.pending?.[p] !== null && gameState.policyLag.pending?.[p] !== undefined) return true;
  }
  return false;
}

/**
 * Count of policies currently in lag.
 */
export function activeLagCount() {
  if (!gameState?.policyLag) return 0;
  let count = 0;
  for (const p of ['freedom', 'mercy', 'tradition', 'isolation', 'workingAge']) {
    if (gameState.policyLag[p]) count++;
  }
  return count;
}

/**
 * Count of uncommitted pending changes.
 */
export function pendingCount() {
  if (!gameState?.policyLag?.pending) return 0;
  let count = 0;
  for (const p of ['freedom', 'mercy', 'tradition', 'isolation', 'workingAge']) {
    if (gameState.policyLag.pending[p] !== null && gameState.policyLag.pending[p] !== undefined) count++;
  }
  return count;
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

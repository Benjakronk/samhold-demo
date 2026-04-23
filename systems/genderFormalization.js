// ---- GENDER FORMALIZATION ----
// Formal layer: 4 dimensions × 5 positions (-2 to +2).
// Restrictive positions are self-sustaining; egalitarian positions drift toward 0 under low legitimacy.
// Depends on: trust, resistance, cohesion, classSystem, policyLag, crime, immigration

let gameState = null;

export function initGenderFormalization(gameStateRef) {
  gameState = gameStateRef;
  if (!gameState.genderFormalization) {
    gameState.genderFormalization = createDefaultState();
  }
}

function createDefaultState() {
  return {
    active: false,
    activatedTurn: null,
    dimensions: {
      labor:       { position: 0, turnsAtPosition: 0, driftTimer: 0, lagTurnsLeft: 0 },
      military:    { position: 0, turnsAtPosition: 0, driftTimer: 0, lagTurnsLeft: 0 },
      inheritance: { position: 0, turnsAtPosition: 0, driftTimer: 0, lagTurnsLeft: 0 },
      civic:       { position: 0, turnsAtPosition: 0, driftTimer: 0, lagTurnsLeft: 0 }
    },
    dismantlementEffects: null  // { turnsRemaining }
  };
}

// ---- ACTIVATION & MOVEMENT ----

export function moveGenderDimension(dimension, direction, options = {}) {
  const gf = gameState.genderFormalization;
  const dim = gf.dimensions[dimension];
  if (!dim) return { success: false, reason: 'Invalid dimension.' };

  // Inheritance requires active class system
  if (dimension === 'inheritance') {
    const cs = gameState.classSystem;
    if (!cs || !cs.active) return { success: false, reason: 'Inheritance formalization requires an active class system.' };
  }

  const currentPos = dim.position;
  const targetPos = currentPos + direction;

  // Validate direction and bounds
  if (direction !== 1 && direction !== -1) return { success: false, reason: 'Direction must be +1 or -1.' };
  if (targetPos < -2 || targetPos > 2) return { success: false, reason: 'Already at maximum position.' };

  // Check lag (can't move while deepening transition is active)
  if (dim.lagTurnsLeft > 0) return { success: false, reason: `Position change in progress (${dim.lagTurnsLeft} turns remaining).` };

  // Determine cost type
  const isDeepening = Math.abs(targetPos) === 2 && Math.abs(currentPos) === 1;
  const isReversing = (currentPos > 0 && direction < 0) || (currentPos < 0 && direction > 0);
  const isFirstMove = !gf.active;

  // Deepening requires time at current position
  if (isDeepening) {
    const DEEPEN_TURNS = window.GENDER_DEEPEN_TURNS_REQUIRED || 4;
    if (dim.turnsAtPosition < DEEPEN_TURNS) {
      return { success: false, reason: `Must hold current position for ${DEEPEN_TURNS - dim.turnsAtPosition} more turns before deepening.` };
    }
  }

  // First activation turn check (skipped when triggered by events)
  if (isFirstMove && !options.skipCosts) {
    const MIN_TURNS = window.GENDER_MIN_TURNS || 8;
    if (gameState.turn < MIN_TURNS) {
      return { success: false, reason: `Settlement must exist for at least ${MIN_TURNS} turns.` };
    }
  }

  // Calculate costs with governance multiplier
  let baseCosts;
  if (isDeepening) {
    baseCosts = window.GENDER_MOVE_COSTS.deepen;
  } else if (isReversing) {
    baseCosts = window.GENDER_MOVE_COSTS.reverse;
  } else if (isFirstMove) {
    baseCosts = window.GENDER_MOVE_COSTS.activate;
  } else {
    baseCosts = window.GENDER_MOVE_COSTS.standard;
  }

  const adjustedCosts = getAdjustedCosts(baseCosts, dimension, direction);

  // Apply costs (skipped when triggered by events — costs are in event consequences)
  if (!options.skipCosts) {
    if (adjustedCosts.legitimacy) {
      gameState.cohesion.legitimacy = Math.max(0, gameState.cohesion.legitimacy + adjustedCosts.legitimacy);
    }
    if (adjustedCosts.satisfaction) {
      gameState.cohesion.satisfaction = Math.max(0, gameState.cohesion.satisfaction + adjustedCosts.satisfaction);
    }
    if (adjustedCosts.resistance && window.addResistancePressure) {
      window.addResistancePressure(adjustedCosts.resistance);
    }
  }

  // Activate system on first move
  if (isFirstMove) {
    gf.active = true;
    gf.activatedTurn = gameState.turn;
  }

  // Apply the move
  dim.position = targetPos;
  dim.turnsAtPosition = 0;
  dim.driftTimer = 0;

  // Deepening imposes internal lag
  if (isDeepening) {
    dim.lagTurnsLeft = window.GENDER_DEEPEN_LAG_TURNS || 4;
  }

  // Chronicle entry
  if (window.addChronicleEntry) {
    const DIMS = window.GENDER_DIMENSIONS;
    const dimDef = DIMS[dimension];
    const posLabel = dimDef.positions[String(targetPos)].label;
    if (isFirstMove) {
      window.addChronicleEntry(
        `The settlement began formalizing gender roles. ${dimDef.name} set to "${posLabel}".`,
        'governance'
      );
    } else {
      window.addChronicleEntry(
        `Gender formalization: ${dimDef.name} changed to "${posLabel}".`,
        'governance'
      );
    }
  }

  return { success: true, adjustedCosts };
}

export function dismantleGenderFormalization() {
  const gf = gameState.genderFormalization;
  if (!gf.active) return { success: false, reason: 'No gender formalization is active.' };

  const COSTS = window.GENDER_MOVE_COSTS.dismantle;

  // Apply costs
  gameState.cohesion.legitimacy = Math.max(0, gameState.cohesion.legitimacy + COSTS.legitimacy);
  if (window.addResistancePressure) window.addResistancePressure(COSTS.resistance);

  // Set transition effects
  gf.dismantlementEffects = { turnsRemaining: COSTS.transitionTurns };

  // Reset all dimensions
  for (const dim of Object.values(gf.dimensions)) {
    dim.position = 0;
    dim.turnsAtPosition = 0;
    dim.driftTimer = 0;
    dim.lagTurnsLeft = 0;
  }
  gf.active = false;

  if (window.addChronicleEntry) {
    window.addChronicleEntry(
      'All formal gender role policies were dismantled. The settlement returns to informal arrangements — but those who benefited from formalization did not accept this quietly.',
      'governance'
    );
  }

  return { success: true };
}

// ---- PER-TURN PROCESSING ----

export function processGenderFormalization(report) {
  const gf = gameState.genderFormalization;

  // Tick dismantlement effects even when inactive
  if (gf.dismantlementEffects) {
    gf.dismantlementEffects.turnsRemaining--;
    if (gf.dismantlementEffects.turnsRemaining <= 0) {
      gf.dismantlementEffects = null;
    }
  }

  if (!gf.active) return;

  // 1. Tick turnsAtPosition and lagTurnsLeft for each dimension
  for (const dim of Object.values(gf.dimensions)) {
    dim.turnsAtPosition++;
    if (dim.lagTurnsLeft > 0) dim.lagTurnsLeft--;
  }

  // 2. Apply per-turn cohesion effects
  applyCohesionEffects(report);

  // 3. Apply maintenance costs (egalitarian positions drain legitimacy)
  applyMaintenanceCosts(report);

  // 4. Process drift (egalitarian positions drift toward 0 under low legitimacy)
  processDrift(report);

  // 5. Apply resistance from excluded sex at restrictive positions
  applyExclusionResistance();
}

function applyCohesionEffects(report) {
  const EFFECTS = window.GENDER_EFFECTS;
  const GATES = window.GENDER_LEGITIMACY_GATES;
  const govModel = gameState.governance.model;

  let identityDelta = 0;
  let legitimacyDelta = 0;
  let bondsDelta = 0;

  for (const [dimKey, dim] of Object.entries(gameState.genderFormalization.dimensions)) {
    const posKey = String(dim.position);
    const effects = EFFECTS?.[dimKey]?.[posKey];
    if (!effects) continue;

    // Identity
    if (effects.identity) identityDelta += effects.identity;

    // Legitimacy (gated by governance model for restrictive positions)
    if (effects.legitimacy) {
      const gates = GATES?.[dimKey]?.[posKey];
      if (!gates || gates.includes(govModel)) {
        legitimacyDelta += effects.legitimacy;
      }
    }

    // Bonds
    if (effects.bonds) bondsDelta += effects.bonds;
  }

  if (identityDelta !== 0) {
    gameState.cohesion.identity = clamp(gameState.cohesion.identity + identityDelta, 0, 100);
  }
  if (legitimacyDelta !== 0) {
    gameState.cohesion.legitimacy = clamp(gameState.cohesion.legitimacy + legitimacyDelta, 0, 100);
  }
  if (bondsDelta !== 0) {
    gameState.cohesion.bonds = clamp(gameState.cohesion.bonds + bondsDelta, 0, 100);
  }
}

function applyMaintenanceCosts(report) {
  const EFFECTS = window.GENDER_EFFECTS;
  let maintenanceTotal = 0;

  for (const [dimKey, dim] of Object.entries(gameState.genderFormalization.dimensions)) {
    const posKey = String(dim.position);
    const effects = EFFECTS?.[dimKey]?.[posKey];
    if (effects?.maintenanceLegitimacy) {
      maintenanceTotal += effects.maintenanceLegitimacy;
    }
  }

  if (maintenanceTotal !== 0) {
    gameState.cohesion.legitimacy = clamp(gameState.cohesion.legitimacy + maintenanceTotal, 0, 100);
  }
}

function processDrift(report) {
  const THRESHOLD = window.GENDER_DRIFT_THRESHOLD || 30;
  const INTERVAL = window.GENDER_DRIFT_INTERVAL || 4;

  if (gameState.cohesion.legitimacy >= THRESHOLD) {
    // Reset all drift timers when legitimacy is above threshold
    for (const dim of Object.values(gameState.genderFormalization.dimensions)) {
      dim.driftTimer = 0;
    }
    return;
  }

  // Legitimacy below threshold — egalitarian positions drift
  for (const [dimKey, dim] of Object.entries(gameState.genderFormalization.dimensions)) {
    if (dim.position <= 0) continue; // only egalitarian positions drift

    dim.driftTimer++;
    if (dim.driftTimer >= INTERVAL) {
      dim.position--;
      dim.turnsAtPosition = 0;
      dim.driftTimer = 0;

      if (window.addChronicleEntry) {
        const DIMS = window.GENDER_DIMENSIONS;
        const dimDef = DIMS[dimKey];
        const posLabel = dimDef.positions[String(dim.position)].label;
        window.addChronicleEntry(
          `Weakened governance could no longer maintain ${dimDef.name.toLowerCase()} equality. Policy drifted to "${posLabel}".`,
          'governance'
        );
      }

      if (report) {
        report.events.push(`⚠️ ${window.GENDER_DIMENSIONS[dimKey].name} drifted toward unformalized due to low legitimacy.`);
      }
    }
  }
}

function applyExclusionResistance() {
  // Restrictive positions generate resistance from the excluded sex
  for (const dim of Object.values(gameState.genderFormalization.dimensions)) {
    if (dim.position >= 0) continue; // only restrictive positions

    // Mild restriction: +1 resistance/turn, Sharp: +2.5 resistance/turn
    const pressurePerTurn = dim.position === -2 ? 2.5 : 1.0;
    if (window.addResistancePressure) {
      window.addResistancePressure(pressurePerTurn);
    }
  }
}

// ---- CROSS-SYSTEM HOOKS ----

export function getGenderProductionMultiplier() {
  if (!gameState) return 1.0;
  const gf = gameState.genderFormalization;
  if (!gf?.active) return 1.0;

  const pos = gf.dimensions.labor.position;
  const EFFECTS = window.GENDER_EFFECTS;
  const effects = EFFECTS?.labor?.[String(pos)];
  return 1.0 + (effects?.production || 0);
}

export function getGenderTrustModifier() {
  if (!gameState) return 0;
  const gf = gameState.genderFormalization;
  if (!gf?.active) return 0;

  const EFFECTS = window.GENDER_EFFECTS;
  let total = 0;
  for (const [dimKey, dim] of Object.entries(gf.dimensions)) {
    const effects = EFFECTS?.[dimKey]?.[String(dim.position)];
    if (effects?.trustBaseline) total += effects.trustBaseline;
  }
  return total;
}

export function getGenderCohesionEffects() {
  // Returns snapshot for UI display (not application — that happens in processGenderFormalization)
  const result = { identity: 0, legitimacy: 0, satisfaction: 0, bonds: 0 };
  if (!gameState) return result;
  const gf = gameState.genderFormalization;
  if (!gf?.active) return result;

  const EFFECTS = window.GENDER_EFFECTS;
  const GATES = window.GENDER_LEGITIMACY_GATES;
  const govModel = gameState.governance.model;

  for (const [dimKey, dim] of Object.entries(gf.dimensions)) {
    const posKey = String(dim.position);
    const effects = EFFECTS?.[dimKey]?.[posKey];
    if (!effects) continue;

    if (effects.identity) result.identity += effects.identity;
    if (effects.legitimacy) {
      const gates = GATES?.[dimKey]?.[posKey];
      if (!gates || gates.includes(govModel)) {
        result.legitimacy += effects.legitimacy;
      }
    }
    // Include maintenance costs in legitimacy total
    if (effects.maintenanceLegitimacy) result.legitimacy += effects.maintenanceLegitimacy;
    if (effects.bonds) result.bonds += effects.bonds;
  }

  return result;
}

export function getGenderCrimeIdleModifier() {
  // Labor restriction can create idle population for the restricted sex
  if (!gameState) return 0;
  const gf = gameState.genderFormalization;
  if (!gf?.active) return 0;

  const pos = gf.dimensions.labor.position;
  if (pos >= 0) return 0;

  // R1: +0.05 idle ratio modifier, R2: +0.12
  return pos === -2 ? 0.12 : 0.05;
}

export function getGenderResistancePressure() {
  // Returns total per-turn resistance from all restrictive positions (for UI display)
  if (!gameState) return 0;
  const gf = gameState.genderFormalization;
  if (!gf?.active) return 0;

  let total = 0;
  for (const dim of Object.values(gf.dimensions)) {
    if (dim.position === -2) total += 2.5;
    else if (dim.position === -1) total += 1.0;
  }
  return total;
}

export function getGenderImmigrationModifier() {
  // Restrictive civic/labor positions raise integration thresholds
  if (!gameState) return 0;
  const gf = gameState.genderFormalization;
  if (!gf?.active) return 0;

  let modifier = 0;
  const laborPos = gf.dimensions.labor.position;
  const civicPos = gf.dimensions.civic.position;

  if (laborPos <= -2) modifier += 0.08;
  else if (laborPos === -1) modifier += 0.03;

  if (civicPos <= -2) modifier += 0.08;
  else if (civicPos === -1) modifier += 0.03;

  return modifier;
}

export function getGenderPolicyLagModifier() {
  // Civic E2 (mandated representation) adds +1 policy lag
  if (!gameState) return 0;
  const gf = gameState.genderFormalization;
  if (!gf?.active) return 0;
  return gf.dimensions.civic.position === 2 ? 1 : 0;
}

export function getGenderKnowledgeModifier() {
  // Returns { bonus, penalty } for knowledge generation
  if (!gameState) return { bonus: 0, penalty: 0 };
  const gf = gameState.genderFormalization;
  if (!gf?.active) return { bonus: 0, penalty: 0 };

  const EFFECTS = window.GENDER_EFFECTS;
  let bonus = 0;
  let penalty = 0;

  for (const [dimKey, dim] of Object.entries(gf.dimensions)) {
    const effects = EFFECTS?.[dimKey]?.[String(dim.position)];
    if (effects?.knowledge) bonus += effects.knowledge;
    if (effects?.knowledgePenalty) penalty += effects.knowledgePenalty;
  }

  return { bonus, penalty };
}

export function getGenderReproPenaltyModifier() {
  // Returns multiplier on military reproductive penalty (0 = eliminated, 1 = full)
  if (!gameState) return 1.0;
  const gf = gameState.genderFormalization;
  if (!gf?.active) return 1.0;

  const EFFECTS = window.GENDER_EFFECTS;
  const pos = gf.dimensions.military.position;
  const effects = EFFECTS?.military?.[String(pos)];
  return effects?.reproPenaltyMod ?? 1.0;
}

export function getGenderCrisisFlexibility() {
  // Returns fraction of workforce mobilizable in crisis (1.0 = all, 0.5 = half)
  if (!gameState) return 1.0;
  const gf = gameState.genderFormalization;
  if (!gf?.active) return 1.0;

  const EFFECTS = window.GENDER_EFFECTS;
  const pos = gf.dimensions.labor.position;
  const effects = EFFECTS?.labor?.[String(pos)];
  return effects?.crisisFlexibility ?? 1.0;
}

export function getGenderFormalizationState() {
  if (!gameState) return null;
  const gf = gameState.genderFormalization;
  const DIMS = window.GENDER_DIMENSIONS;
  const EFFECTS = window.GENDER_EFFECTS;

  const dimensions = {};
  for (const [key, dim] of Object.entries(gf.dimensions)) {
    const posKey = String(dim.position);
    dimensions[key] = {
      position: dim.position,
      turnsAtPosition: dim.turnsAtPosition,
      driftTimer: dim.driftTimer,
      lagTurnsLeft: dim.lagTurnsLeft,
      label: DIMS[key].positions[posKey]?.label || 'Unknown',
      effects: EFFECTS?.[key]?.[posKey] || {},
      canDeepen: canDeepen(key, dim),
      canMovePositive: dim.position < 2 && dim.lagTurnsLeft <= 0,
      canMoveNegative: dim.position > -2 && dim.lagTurnsLeft <= 0,
      isInheritage: key === 'inheritance',
      requiresClassSystem: key === 'inheritance'
    };
  }

  // Check inheritance gate
  if (dimensions.inheritance) {
    const cs = gameState.classSystem;
    dimensions.inheritance.classSystemActive = cs?.active || false;
    if (!cs?.active) {
      dimensions.inheritance.canMovePositive = false;
      dimensions.inheritance.canMoveNegative = false;
    }
  }

  return {
    active: gf.active,
    activatedTurn: gf.activatedTurn,
    dimensions,
    canActivate: !gf.active && gameState.turn >= (window.GENDER_MIN_TURNS || 8),
    dismantlementEffects: gf.dismantlementEffects ? { ...gf.dismantlementEffects } : null,
    currentTurn: gameState.turn,
    driftWarning: gf.active && gameState.cohesion.legitimacy < (window.GENDER_DRIFT_THRESHOLD || 30),
    cohesionEffects: getGenderCohesionEffects(),
    productionMultiplier: getGenderProductionMultiplier(),
    trustModifier: getGenderTrustModifier(),
    resistancePressure: getGenderResistancePressure()
  };
}

// ---- HELPERS ----

function canDeepen(dimKey, dim) {
  if (Math.abs(dim.position) !== 1) return false;
  if (dim.lagTurnsLeft > 0) return false;
  const required = window.GENDER_DEEPEN_TURNS_REQUIRED || 4;
  return dim.turnsAtPosition >= required;
}

function getAdjustedCosts(baseCosts, dimension, direction) {
  const govModel = gameState.governance.model;
  const mults = window.GOVERNANCE_GENDER_MULTIPLIERS?.[govModel];
  let mult = 1.0;

  if (mults) {
    // Global multiplier (chieftain: all 0.7)
    if (mults.all) mult *= mults.all;

    // Directional multipliers
    if (direction < 0 && mults.restrictive) mult *= mults.restrictive;
    if (direction > 0 && mults.egalitarian) mult *= mults.egalitarian;

    // Dimension-specific overrides
    if (mults.dimensionOverrides?.[dimension]) {
      mult *= mults.dimensionOverrides[dimension];
    }
  }

  return {
    legitimacy: Math.round((baseCosts.legitimacy || 0) * mult),
    satisfaction: Math.round((baseCosts.satisfaction || 0) * mult),
    resistance: Math.round((baseCosts.resistance || 0) * mult)
  };
}

export function getMoveCostPreview(dimension, direction) {
  if (!gameState) return null;
  const gf = gameState.genderFormalization;
  const dim = gf.dimensions[dimension];
  if (!dim) return null;

  const currentPos = dim.position;
  const targetPos = currentPos + direction;
  if (targetPos < -2 || targetPos > 2) return null;

  const isDeepening = Math.abs(targetPos) === 2 && Math.abs(currentPos) === 1;
  const isReversing = (currentPos > 0 && direction < 0) || (currentPos < 0 && direction > 0);
  const isFirstMove = !gf.active;

  let baseCosts;
  if (isDeepening) baseCosts = window.GENDER_MOVE_COSTS.deepen;
  else if (isReversing) baseCosts = window.GENDER_MOVE_COSTS.reverse;
  else if (isFirstMove) baseCosts = window.GENDER_MOVE_COSTS.activate;
  else baseCosts = window.GENDER_MOVE_COSTS.standard;

  return getAdjustedCosts(baseCosts, dimension, direction);
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

// ---- CLASS SYSTEM ----
// Formal stratification with 4 bases and 4 differential dimensions × 3 tiers.
// Privileged class as political constituency. Dismantlement mechanics.
// Depends on: trust, policyLag, resistance, crime, immigration, cohesion

let gameState = null;

export function initClassSystem(gameStateRef) {
  gameState = gameStateRef;
  if (!gameState.classSystem) {
    gameState.classSystem = {
      active: false, basis: null,
      differentials: { economic: 0, legal: 0, political: 0, social: 0 },
      privilegedCount: 0, privilegedRatio: 0,
      activatedTurn: null,
      dismantlementEffects: null, basisChangeEffects: null,
      lineageFamilies: 0, pendingDifferentials: {}
    };
  }
}

// ---- ACTIVATION ----

export function activateClassSystem(basis) {
  const cs = gameState.classSystem;
  const BASES = window.STRATIFICATION_BASES;
  const COSTS = window.ACTIVATION_COSTS;
  const MIN_TURNS = window.MIN_TURNS_FOR_ACTIVATION;

  if (cs.active) return { success: false, reason: 'Class system already active.' };
  if (!BASES[basis]) return { success: false, reason: 'Invalid stratification basis.' };
  if (gameState.turn < MIN_TURNS) return { success: false, reason: `Settlement must exist for at least ${MIN_TURNS} turns.` };

  cs.active = true;
  cs.basis = basis;
  cs.activatedTurn = gameState.turn;
  cs.differentials = { economic: 0, legal: 0, political: 0, social: 0 };
  cs.dismantlementEffects = null;
  cs.basisChangeEffects = null;
  cs.pendingDifferentials = {};

  // Set initial privileged class
  if (basis === 'lineage') {
    cs.lineageFamilies = Math.max(1, Math.floor(gameState.population.total * 0.25));
  }
  recalculatePrivilegedCount();

  // Apply activation costs
  gameState.cohesion.legitimacy = Math.max(0, gameState.cohesion.legitimacy + COSTS.legitimacy);
  gameState.cohesion.satisfaction = Math.max(0, gameState.cohesion.satisfaction + COSTS.satisfaction);
  if (window.addResistancePressure) window.addResistancePressure(COSTS.resistancePressure);

  // Chronicle
  const baseDef = BASES[basis];
  if (window.addChronicleEntry) {
    window.addChronicleEntry(
      `The settlement established a formal class system based on ${baseDef.name.toLowerCase()}. Society is now divided between the privileged and the common.`,
      'governance'
    );
  }

  return { success: true };
}

// ---- DISMANTLEMENT ----

export function dismantleClassSystem() {
  const cs = gameState.classSystem;
  const COSTS = window.DISMANTLEMENT_COSTS;

  if (!cs.active) return { success: false, reason: 'No class system is active.' };

  const formerBasis = cs.basis;

  // Apply dismantlement costs
  gameState.cohesion.legitimacy = Math.max(0, gameState.cohesion.legitimacy + COSTS.legitimacy);
  if (window.addResistancePressure) window.addResistancePressure(COSTS.resistancePressure);

  // Set temporary effects
  cs.dismantlementEffects = {
    satisfactionPenalty: COSTS.satisfactionPenalty,
    turnsRemaining: COSTS.satisfactionDuration,
    trustDriftTurnsRemaining: COSTS.trustDriftDuration
  };

  // Reset all state
  cs.active = false;
  cs.basis = null;
  cs.differentials = { economic: 0, legal: 0, political: 0, social: 0 };
  cs.privilegedCount = 0;
  cs.privilegedRatio = 0;
  cs.lineageFamilies = 0;
  cs.pendingDifferentials = {};
  cs.basisChangeEffects = null;

  if (window.addChronicleEntry) {
    window.addChronicleEntry(
      `The formal class system was dismantled. All stratification was abolished — but the former privileged class did not accept this quietly.`,
      'governance'
    );
  }

  return { success: true, formerBasis };
}

// ---- BASIS CHANGE ----

export function changeBasis(newBasis) {
  const cs = gameState.classSystem;
  const BASES = window.STRATIFICATION_BASES;
  const COSTS = window.BASIS_CHANGE_COSTS;

  if (!cs.active) return { success: false, reason: 'No class system is active.' };
  if (!BASES[newBasis]) return { success: false, reason: 'Invalid stratification basis.' };
  if (cs.basis === newBasis) return { success: false, reason: 'Already using this basis.' };

  const oldBasis = cs.basis;
  cs.basis = newBasis;

  // Reset lineage families if switching to lineage
  if (newBasis === 'lineage') {
    cs.lineageFamilies = Math.max(1, Math.floor(gameState.population.total * 0.25));
  }

  // Apply costs
  gameState.cohesion.legitimacy = Math.max(0, gameState.cohesion.legitimacy + COSTS.legitimacy);
  if (window.addResistancePressure) window.addResistancePressure(COSTS.resistancePressure);

  cs.basisChangeEffects = {
    satisfactionPenalty: COSTS.satisfactionPenalty,
    turnsRemaining: COSTS.satisfactionDuration
  };

  recalculatePrivilegedCount();

  if (window.addChronicleEntry) {
    window.addChronicleEntry(
      `The basis of stratification was changed from ${BASES[oldBasis].name.toLowerCase()} to ${BASES[newBasis].name.toLowerCase()}. The reclassification disrupted both those who gained and those who lost status.`,
      'governance'
    );
  }

  return { success: true };
}

// ---- DIFFERENTIAL TIER CHANGES ----

export function requestDifferentialChange(dimension, targetTier) {
  const cs = gameState.classSystem;
  if (!cs.active) return { success: false, reason: 'No class system active.' };

  const currentTier = cs.differentials[dimension];
  if (currentTier === undefined) return { success: false, reason: 'Invalid dimension.' };
  if (targetTier < 0 || targetTier > 2) return { success: false, reason: 'Tier must be 0, 1, or 2.' };
  if (Math.abs(targetTier - currentTier) !== 1) return { success: false, reason: 'Can only change by one tier at a time.' };

  const isIncrease = targetTier > currentTier;

  // Use policy lag formula for timing
  const lagTurns = isIncrease ? 1 : 2; // Directive (increase) = 1 turn, Behavioral (decrease) = 2 turns

  // Admin hall reduces lag
  const adminHallStaff = getAdminHallStaff();
  const effectiveLag = Math.max(1, lagTurns - Math.floor(adminHallStaff / 2));

  cs.pendingDifferentials[dimension] = {
    target: targetTier,
    turnsRemaining: effectiveLag,
    startTurn: gameState.turn,
    isIncrease
  };

  return { success: true, lagTurns: effectiveLag };
}

export function cancelDifferentialChange(dimension) {
  const cs = gameState.classSystem;
  if (cs.pendingDifferentials[dimension]) {
    delete cs.pendingDifferentials[dimension];
    return { success: true };
  }
  return { success: false, reason: 'No pending change for this dimension.' };
}

// ---- PER-TURN PROCESSING ----

export function processClassSystem(report) {
  const cs = gameState.classSystem;

  // Tick temporary effects even when class system is inactive (dismantlement aftermath)
  tickTemporaryEffects(report);

  if (!cs.active) return;

  // 1. Recalculate privileged class size
  recalculatePrivilegedCount();

  // 2. Process pending differential changes
  processPendingDifferentials(report);

  // 3. Apply differential effects to cohesion pillars
  applyDifferentialEffects(report);

  // 4. Apply governance alignment effects
  applyGovernanceAlignment();
}

function tickTemporaryEffects(report) {
  const cs = gameState.classSystem;

  // Dismantlement effects
  if (cs.dismantlementEffects) {
    if (cs.dismantlementEffects.turnsRemaining > 0) {
      gameState.cohesion.satisfaction = Math.max(0,
        gameState.cohesion.satisfaction + cs.dismantlementEffects.satisfactionPenalty / cs.dismantlementEffects.turnsRemaining
      );
      cs.dismantlementEffects.turnsRemaining--;
    }
    if (cs.dismantlementEffects.trustDriftTurnsRemaining > 0) {
      cs.dismantlementEffects.trustDriftTurnsRemaining--;
    }
    if (cs.dismantlementEffects.turnsRemaining <= 0 && cs.dismantlementEffects.trustDriftTurnsRemaining <= 0) {
      cs.dismantlementEffects = null;
    }
  }

  // Basis change effects
  if (cs.basisChangeEffects) {
    if (cs.basisChangeEffects.turnsRemaining > 0) {
      gameState.cohesion.satisfaction = Math.max(0,
        gameState.cohesion.satisfaction + cs.basisChangeEffects.satisfactionPenalty / cs.basisChangeEffects.turnsRemaining
      );
      cs.basisChangeEffects.turnsRemaining--;
    }
    if (cs.basisChangeEffects.turnsRemaining <= 0) {
      cs.basisChangeEffects = null;
    }
  }
}

function processPendingDifferentials(report) {
  const cs = gameState.classSystem;
  const toApply = [];

  for (const [dim, pending] of Object.entries(cs.pendingDifferentials)) {
    pending.turnsRemaining--;
    if (pending.turnsRemaining <= 0) {
      toApply.push({ dim, target: pending.target, isIncrease: pending.isIncrease });
    }
  }

  for (const { dim, target, isIncrease } of toApply) {
    const DIFFS = window.DIFFERENTIALS;
    const oldTier = cs.differentials[dim];
    cs.differentials[dim] = target;
    delete cs.pendingDifferentials[dim];

    const tierLabel = DIFFS[dim].tiers[target].label;
    if (report) {
      report.events.push(`⚖️ ${DIFFS[dim].name} differential changed to ${tierLabel}.`);
    }

    // Downward move triggers privileged class resistance pressure
    if (!isIncrease && window.addResistancePressure) {
      const resistanceAmount = 5 + (oldTier * 3); // Higher tier = more resistance to reduction
      window.addResistancePressure(resistanceAmount);
    }

    if (window.addChronicleEntry) {
      const direction = isIncrease ? 'increased' : 'reduced';
      window.addChronicleEntry(
        `The ${DIFFS[dim].name.toLowerCase()} differential was ${direction} to "${tierLabel}".`,
        'governance'
      );
    }
  }
}

function recalculatePrivilegedCount() {
  const cs = gameState.classSystem;
  const pop = gameState.population.total;

  switch (cs.basis) {
    case 'property': {
      // Dynamic: based on resource surplus. ~15-35% depending on prosperity
      const totalResources = gameState.resources.food + gameState.resources.materials;
      const resourcesPerCap = pop > 0 ? totalResources / pop : 0;
      // At prosperity: up to 35%. At scarcity: down to 10%.
      const ratio = Math.min(0.35, Math.max(0.10, resourcesPerCap / 50));
      cs.privilegedCount = Math.max(1, Math.floor(pop * ratio));
      break;
    }
    case 'lineage': {
      // Fixed at activation, doesn't grow with population
      cs.privilegedCount = Math.min(cs.lineageFamilies, pop);
      break;
    }
    case 'religious': {
      // Constrained by knowledge level
      const knowledge = gameState.resources.knowledge || 0;
      const maxReligious = Math.floor(knowledge * 0.3);
      cs.privilegedCount = Math.min(maxReligious, pop);
      break;
    }
    case 'military': {
      // Active military units (each unit represents some population)
      const activeUnits = (gameState.units || []).filter(u =>
        u.type === 'warrior' || u.type === 'scout'
      ).length;
      cs.privilegedCount = Math.min(activeUnits, pop);
      break;
    }
    default:
      cs.privilegedCount = 0;
  }

  cs.privilegedRatio = pop > 0 ? cs.privilegedCount / pop : 0;
}

// ---- DIFFERENTIAL EFFECTS ----

function applyDifferentialEffects(report) {
  const cs = gameState.classSystem;
  const pr = cs.privilegedRatio;
  const cr = 1 - pr; // commons ratio
  if (pr <= 0 || cr <= 0) return;

  const BASES = window.STRATIFICATION_BASES;
  const baseDef = BASES[cs.basis];

  // Sum effects across all dimensions
  let satisfactionDelta = 0;
  let identityDelta = 0;
  let legitimacyDelta = 0;
  let bondsDelta = 0;

  const dims = ['economic', 'legal', 'political', 'social'];
  for (const dim of dims) {
    const tier = cs.differentials[dim];
    if (tier === 0) continue;

    // Affinity scaling
    const isStrong = baseDef.strongDifferentials.includes(dim);
    const isWeak = baseDef.weakDifferentials.includes(dim);
    const posScale = isStrong ? window.AFFINITY_BONUS.positiveScale : isWeak ? window.AFFINITY_PENALTY.positiveScale : 1.0;
    const negScale = isStrong ? window.AFFINITY_BONUS.negativeSuppression : isWeak ? window.AFFINITY_PENALTY.negativeAmplification : 1.0;

    const effects = getDimensionEffects(dim, tier);

    satisfactionDelta += (effects.satisfactionPrivileged * pr * posScale) + (effects.satisfactionCommons * cr * negScale);
    identityDelta += (effects.identityPrivileged * pr * posScale) + (effects.identityCommons * cr * negScale);
    legitimacyDelta += effects.legitimacy * posScale;
    bondsDelta += effects.bonds * negScale;
  }

  // Apply governance alignment multiplier
  const model = gameState.governance.model;
  const alignment = baseDef.governanceAlignment[model] || 'moderate';
  const alignMult = window.ALIGNMENT_MULTIPLIERS[alignment] || 1.0;

  // Alignment amplifies positive effects, dampens negative ones
  if (legitimacyDelta > 0) legitimacyDelta *= alignMult;
  if (satisfactionDelta > 0) satisfactionDelta *= alignMult;

  // Apply to pillars
  gameState.cohesion.satisfaction = clamp(gameState.cohesion.satisfaction + satisfactionDelta, 0, 100);
  gameState.cohesion.identity = clamp(gameState.cohesion.identity + identityDelta, 0, 100);
  gameState.cohesion.legitimacy = clamp(gameState.cohesion.legitimacy + legitimacyDelta, 0, 100);
  gameState.cohesion.bonds = clamp(gameState.cohesion.bonds + bondsDelta, 0, 100);
}

function getDimensionEffects(dim, tier) {
  // Returns per-turn effects for a dimension at a given tier
  // Positive values = benefit, negative = penalty
  const effects = {
    satisfactionPrivileged: 0, satisfactionCommons: 0,
    identityPrivileged: 0, identityCommons: 0,
    legitimacy: 0, bonds: 0
  };

  switch (dim) {
    case 'economic':
      if (tier === 1) {
        effects.satisfactionPrivileged = 0.3;
        effects.satisfactionCommons = -0.5;
      } else if (tier === 2) {
        effects.satisfactionPrivileged = 0.5;
        effects.satisfactionCommons = -1.2;
      }
      break;

    case 'legal':
      if (tier === 1) {
        effects.legitimacy = 0.2;
        effects.satisfactionCommons = -1.0;
      } else if (tier === 2) {
        effects.legitimacy = 0.5;
        effects.satisfactionCommons = -3.0;
      }
      break;

    case 'political':
      if (tier === 1) {
        effects.legitimacy = 0.3;
      } else if (tier === 2) {
        effects.legitimacy = 0.6;
      }
      break;

    case 'social':
      if (tier === 1) {
        effects.identityPrivileged = 0.2;
        effects.bonds = -0.1;
      } else if (tier === 2) {
        effects.identityPrivileged = 0.4;
        effects.identityCommons = -0.2;
        effects.bonds = -0.3;
      }
      break;
  }

  return effects;
}

function applyGovernanceAlignment() {
  // Governance model alignment already handled in applyDifferentialEffects via multiplier
  // This function is a hook for future model-specific logic
}

// ---- CROSS-SYSTEM HOOKS ----

export function getClassMultiplier() {
  const cs = gameState.classSystem;
  if (!cs.active) return 1.0;

  const W = window.CRIME_MULTIPLIER_WEIGHTS;
  return 1 + (cs.differentials.economic * W.economic)
           + (cs.differentials.legal * W.legal)
           + (cs.differentials.social * W.social)
           + (cs.differentials.political * W.political);
}

export function getInterpersonalTrustReduction() {
  const cs = gameState.classSystem;
  if (!cs.active) return 0;

  let reduction = 0;
  if (cs.differentials.social === 1) reduction += 0.05;
  if (cs.differentials.social === 2) reduction += 0.15;
  if (cs.differentials.economic >= 1) reduction += 0.02;
  if (cs.differentials.legal >= 1) reduction += 0.02;

  // Dismantlement aftermath also drifts trust
  if (cs.dismantlementEffects?.trustDriftTurnsRemaining > 0) {
    reduction += 0.03;
  }

  return reduction;
}

export function getIntegrationThresholdModifier() {
  const cs = gameState.classSystem;
  if (!cs.active) return 0;

  let modifier = 0;
  // Social differential raises integration threshold
  if (cs.differentials.social === 2) modifier += 0.10;
  // Religious basis adds additional penalty
  if (cs.basis === 'religious') modifier += 0.05;

  return modifier;
}

export function getClassSystemState() {
  const cs = gameState.classSystem;
  const BASES = window.STRATIFICATION_BASES;
  const DIFFS = window.DIFFERENTIALS;

  return {
    active: cs.active,
    basis: cs.basis,
    basisDef: cs.basis ? BASES[cs.basis] : null,
    differentials: { ...cs.differentials },
    privilegedCount: cs.privilegedCount,
    privilegedRatio: cs.privilegedRatio,
    population: gameState.population.total,
    activatedTurn: cs.activatedTurn,
    canActivate: !cs.active && gameState.turn >= (window.MIN_TURNS_FOR_ACTIVATION || 8),
    dismantlementEffects: cs.dismantlementEffects ? { ...cs.dismantlementEffects } : null,
    basisChangeEffects: cs.basisChangeEffects ? { ...cs.basisChangeEffects } : null,
    pendingDifferentials: { ...cs.pendingDifferentials },
    classMultiplier: getClassMultiplier(),
    trustReduction: getInterpersonalTrustReduction(),
    lineageFamilies: cs.lineageFamilies,
    currentTurn: gameState.turn
  };
}

// ---- HELPERS ----

function getAdminHallStaff() {
  // Count staffed admin hall workers for lag reduction
  let staff = 0;
  for (let r = 0; r < window.MAP_ROWS; r++) {
    for (let c = 0; c < window.MAP_COLS; c++) {
      const hex = gameState.map?.[r]?.[c];
      if (hex?.building === 'administrativeHall' && hex.buildProgress <= 0) {
        staff += hex.workers || 0;
      }
    }
  }
  return staff;
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

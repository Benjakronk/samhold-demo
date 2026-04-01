// ---- COHESION SYSTEM ----
// Manages the four pillars of social cohesion: Identity, Legitimacy, Satisfaction, and Bonds
// Each pillar ranges from 0-100, with total cohesion calculated as a weighted average
// Lower pillars drag down total cohesion, representing how social weaknesses compound

import { GOVERNANCE_MODELS } from '../data/governance.js';
import { BUILDINGS } from '../data/buildings.js';
import { VALUE_IDENTITY_BASE, VALUE_IDENTITY_MAX } from '../data/values.js';

// Constants used by cohesion system (accessed from global scope)
// FOOD_PER_POP, FOOD_PER_CHILD, WORKING_AGE are defined in main game

/**
 * Main cohesion calculation function - calculates all four pillars and total cohesion
 * Called each turn during dawn phase processing
 */
export function calculateCohesion() {
  // Store previous values for change tracking
  const prev = {
    identity: window.gameState.cohesion.identity,
    legitimacy: window.gameState.cohesion.legitimacy,
    satisfaction: window.gameState.cohesion.satisfaction,
    bonds: window.gameState.cohesion.bonds
  };

  // Calculate each pillar
  calculateSatisfactionPillar();
  calculateIdentityPillar();
  calculateLegitimacyPillar();
  calculateBondsPillar();

  // Calculate total cohesion - lowest pillar drags others down
  const pillars = [
    window.gameState.cohesion.identity,
    window.gameState.cohesion.legitimacy,
    window.gameState.cohesion.satisfaction,
    window.gameState.cohesion.bonds
  ];

  const minPillar = Math.min(...pillars);
  const avgPillars = pillars.reduce((sum, p) => sum + p, 0) / 4;

  // Weighted average: 70% average, 30% minimum (lowest pillar has significant drag)
  window.gameState.cohesion.total = Math.round((avgPillars * 0.7) + (minPillar * 0.3));

  // Track changes for UI display (used by post-turn summary tooltips)
  window.gameState.cohesion.lastUpdate = {
    identity: window.gameState.cohesion.identity - prev.identity,
    legitimacy: window.gameState.cohesion.legitimacy - prev.legitimacy,
    satisfaction: window.gameState.cohesion.satisfaction - prev.satisfaction,
    bonds: window.gameState.cohesion.bonds - prev.bonds
  };
}

/**
 * Preview the cohesion deltas that would occur next turn, without mutating state.
 * Mirrors the actual turn order:
 *   1. traditions  (before calculateCohesion)
 *   2. oral tradition stories  (before calculateCohesion)
 *   3. society building accumulators  (before calculateCohesion)
 *   4. values passive bonus  (before calculateCohesion)
 *   5. calculateCohesion — the four pillar functions
 *   6. elder identity bonus  (after calculateCohesion)
 */
export function previewCohesionDeltas() {
  const c = window.gameState.cohesion;
  const gs = window.gameState;

  const savedPillars = {
    identity: c.identity,
    legitimacy: c.legitimacy,
    satisfaction: c.satisfaction,
    bonds: c.bonds
  };
  const savedFood = gs.resources.food;
  const savedKnowledge = gs.resources.knowledge;

  // Project food so satisfaction sees the level it will actually compute against
  if (window.calculateIncome) {
    const inc = window.calculateIncome();
    gs.resources.food = Math.max(0, savedFood + inc.netFood);
  }

  // ── 1. Tradition effects ────────────────────────────────────────────────────
  if (window.projectTraditionDeltas) {
    const trad = window.projectTraditionDeltas();
    c.identity     += trad.identity;
    c.legitimacy   += trad.legitimacy;
    c.satisfaction += trad.satisfaction;
    c.bonds        += trad.bonds;
  }

  // ── 2. Oral tradition (story completion / loss) ─────────────────────────────
  if (gs.culture) {
    const cult = gs.culture;
    const PROGRESS_PER = 0.25;  // matches STORY_PROGRESS_PER_STORYTELLER
    const CAPACITY_PER = 4;     // matches STORY_CAPACITY_PER_STORYTELLER
    const GRACE_TURNS  = 4;     // matches STORY_LOSS_GRACE_TURNS
    const BONUS        = 1;     // matches STORY_IDENTITY_BONUS
    if (cult.storytellers > 0) {
      const nextProgress = (cult.storyProgress || 0) + cult.storytellers * PROGRESS_PER;
      const completed = Math.floor(nextProgress);
      const capacity = cult.storytellers * CAPACITY_PER;
      const afterCount = (cult.stories?.length || 0) + completed;
      const fades = Math.max(0, afterCount - (capacity + 2));
      c.identity = Math.min(100, Math.max(0, c.identity + (completed - fades) * BONUS));
    } else if ((cult.turnsWithoutStoryteller || 0) >= GRACE_TURNS - 1 && (cult.stories?.length || 0) > 0) {
      c.identity = Math.max(0, c.identity - BONUS);
    }
  }

  // ── 3. Society building accumulators ────────────────────────────────────────
  if (gs.map) {
    const accumulators = { ...(gs.culture?.societyBuildingAccumulators || { identity: 0, legitimacy: 0, satisfaction: 0, bonds: 0 }) };
    if (gs.culture?.sacredSiteBondsAccumulator > 0) accumulators.bonds += gs.culture.sacredSiteBondsAccumulator;

    let upkeepLeft = gs.resources.materials;
    const isTheocracy = gs.governance?.model === 'theocracy';
    const yieldMap = { identityYield: 'identity', legitimacyYield: 'legitimacy', satisfactionYield: 'satisfaction', bondsYield: 'bonds' };

    for (const row of gs.map) {
      for (const hex of row) {
        if (!hex.building || hex.buildProgress > 0) continue;
        const bDef = BUILDINGS[hex.building];
        if (!bDef?.isSocietyBuilding) continue;

        if (hex.building === 'monument') {
          const upkeep = bDef.upkeepMaterials || 0;
          if (upkeep > 0 && upkeepLeft < upkeep) continue;
          if (upkeep > 0) upkeepLeft -= upkeep;
          const NEGLECT_INTERVAL = 8;
          const stewardTending = gs.units?.some(u => u.type === 'steward' && u.col === hex.col && u.row === hex.row && u.activeAction === 'tending_monument');
          const turnsSince = gs.turn - (hex.lastStewardTurn ?? hex.completedTurn ?? gs.turn);
          const willNeglect = !stewardTending && turnsSince >= NEGLECT_INTERVAL;
          const isNeglected = hex.monumentState === 'neglected' || willNeglect;
          if (isNeglected) {
            const drain = 0.05; // upkeep was already checked above
            accumulators.identity -= drain;
            accumulators.bonds    -= drain;
          } else {
            accumulators.identity += 0.05;
            accumulators.bonds    += 0.05;
          }
          continue;
        }

        if (hex.workers === 0) continue;
        const upkeep = (bDef.upkeepMaterials || 0) * hex.workers;
        if (upkeep > 0) {
          if (upkeepLeft >= upkeep) upkeepLeft -= upkeep;
          else continue;
        }
        for (const [yKey, pillar] of Object.entries(yieldMap)) {
          if (bDef[yKey]) {
            let amount = bDef[yKey] * hex.workers;
            if (yKey === 'identityYield' && hex.building === 'shrine' && isTheocracy) amount *= 1.5;
            accumulators[pillar] += amount;
          }
        }
      }
    }
    for (const pillar of ['identity', 'legitimacy', 'satisfaction', 'bonds']) {
      const pts = Math.floor(accumulators[pillar]);
      if (pts !== 0) c[pillar] = Math.max(0, Math.min(100, c[pillar] + pts));
    }
  }

  // ── 4. Values passive identity bonus ────────────────────────────────────────
  for (const value of (gs.values || [])) {
    const bonus = Math.min(VALUE_IDENTITY_MAX, VALUE_IDENTITY_BASE * value.strength);
    c.identity = Math.min(100, c.identity + bonus);
  }

  // ── 5. calculateCohesion — pillar functions see the pre-modified starting values ──
  calculateSatisfactionPillar();
  calculateIdentityPillar();
  calculateLegitimacyPillar();
  calculateBondsPillar();

  // ── 6. Elder identity bonus (post-calculateCohesion) ────────────────────────
  for (const unit of (gs.units || [])) {
    if (unit.type === 'elder' && unit.health >= 50) {
      c.identity = Math.min(100, c.identity + 0.5);
    }
  }

  const deltas = {
    identity:     c.identity     - savedPillars.identity,
    legitimacy:   c.legitimacy   - savedPillars.legitimacy,
    satisfaction: c.satisfaction - savedPillars.satisfaction,
    bonds:        c.bonds        - savedPillars.bonds
  };

  // Restore everything
  c.identity     = savedPillars.identity;
  c.legitimacy   = savedPillars.legitimacy;
  c.satisfaction = savedPillars.satisfaction;
  c.bonds        = savedPillars.bonds;
  gs.resources.food      = savedFood;
  gs.resources.knowledge = savedKnowledge;

  return deltas;
}

/**
 * Calculate Satisfaction pillar - measures immediate happiness and welfare
 * Driven primarily by food security, shelter, and governance policies
 * Most volatile pillar, responds quickly to changing conditions
 */
export function calculateSatisfactionPillar() {
  let satisfaction = window.gameState.cohesion.satisfaction;
  const currentModel = GOVERNANCE_MODELS[window.gameState.governance.model];
  const t = window.devToggles || {};

  // Food satisfaction - based on sustainability, not raw stockpile size
  if (t.cohFoodSecurity !== false) {
    const totalChildren = getTotalChildren();
    const totalFoodNeed = (window.gameState.population.total * window.FOOD_PER_POP) + (totalChildren * window.FOOD_PER_CHILD);
    const stockpile = window.gameState.resources.food;
    const netFood = window.calculateIncome ? window.calculateIncome().netFood : 0;
    const turnsOfFood = (netFood >= 0) ? Infinity : stockpile / Math.abs(netFood);

    if (netFood >= 0 && stockpile >= totalFoodNeed) {
      satisfaction = Math.min(80, satisfaction + 8);
    } else if (netFood >= 0) {
      satisfaction = Math.min(70, satisfaction + 4);
    } else if (turnsOfFood > 8) {
      satisfaction = Math.min(65, satisfaction + 1);
    } else if (turnsOfFood > 4) {
      satisfaction = Math.max(0, satisfaction - 4);
    } else if (turnsOfFood > 2) {
      satisfaction = Math.max(0, satisfaction - 8);
    } else {
      satisfaction = Math.max(0, satisfaction - 14);
    }
  }

  // Working Age policy effects on satisfaction
  if (t.cohWorkingAge !== false) {
    const totalChildren = getTotalChildren();
    if (totalChildren > 0) {
      const totalFoodNeed = (window.gameState.population.total * window.FOOD_PER_POP) + (totalChildren * window.FOOD_PER_CHILD);
      const isStarving = window.gameState.resources.food < totalFoodNeed;
      if (window.WORKING_AGE < 10) {
        const penalty = Math.abs(10 - window.WORKING_AGE);
        const satisfactionPenalty = isStarving ? -Math.floor(penalty / 2) : -penalty;
        satisfaction = Math.max(0, satisfaction + (satisfactionPenalty * 0.15));
      } else if (window.WORKING_AGE > 12) {
        const bonus = Math.min(4, window.WORKING_AGE - 12);
        const satisfactionBonus = Math.floor(bonus / 2) + 1;
        satisfaction = Math.min(satisfaction + (satisfactionBonus * 0.1), 85);
      }
    }
  }

  // Governance model effects on satisfaction
  if (t.cohGovernance !== false) {
    if (currentModel.effects.satisfaction.freedomBonus) {
      const freedomEffect = (window.gameState.governance.policies.freedom - 50) / 100 * currentModel.effects.satisfaction.freedomBonus;
      satisfaction = Math.max(0, Math.min(100, satisfaction + freedomEffect));
    }
    if (currentModel.effects.satisfaction.controlBonus) {
      const controlEffect = (50 - window.gameState.governance.policies.freedom) / 100 * currentModel.effects.satisfaction.controlBonus;
      satisfaction = Math.max(0, Math.min(100, satisfaction + controlEffect));
    }
    if (currentModel.effects.satisfaction.orderBonus) {
      satisfaction = Math.min(satisfaction + currentModel.effects.satisfaction.orderBonus, 90);
    }
    if (currentModel.effects.satisfaction.freedomPenalty) {
      satisfaction = Math.max(0, satisfaction + currentModel.effects.satisfaction.freedomPenalty);
    }
  }

  // Policy effects: Freedom vs Control
  if (t.cohPolicy !== false) {
    const freedomPolicy = window.gameState.governance.policies.freedom;
    if (freedomPolicy > 70) {
      satisfaction = Math.min(satisfaction + 0.5, 90);
    } else if (freedomPolicy < 30) {
      satisfaction = Math.max(satisfaction - 0.3, 0);
    }
  }

  // Shelter satisfaction
  if (t.cohShelter !== false) {
    const totalChildren = getTotalChildren();
    const totalPop = window.gameState.population.total + totalChildren;
    const shelterPoints = calculateShelterPoints();
    const shelterRatio = shelterPoints / Math.max(1, totalPop);
    if (shelterRatio >= 0.8) {
      satisfaction = Math.min(satisfaction + 3, 85);
    } else if (shelterRatio >= 0.5) {
      satisfaction = Math.min(satisfaction + 1, 70);
    } else if (shelterRatio < 0.3) {
      satisfaction = Math.max(satisfaction - 2, 0);
    }
  }

  // Monthly decay toward baseline (50)
  if (t.cohDecay !== false) {
    const decayRate = 0.8;
    if (satisfaction > 50) {
      satisfaction = Math.max(50, satisfaction - decayRate);
    } else if (satisfaction < 50) {
      satisfaction = Math.min(50, satisfaction + decayRate);
    }
  }

  window.gameState.cohesion.satisfaction = Math.max(0, Math.min(100, satisfaction));
}

/**
 * Calculate shelter points provided by all completed buildings
 * Used by satisfaction pillar to determine comfort level
 */
export function calculateShelterPoints() {
  let points = 0;
  for (let r = 0; r < window.MAP_ROWS; r++) {
    for (let c = 0; c < window.MAP_COLS; c++) {
      const hex = window.gameState.map[r][c];
      if (hex.building && hex.buildProgress === 0) {
        const building = BUILDINGS[hex.building];
        if (building) {
          // Each building provides shelter based on its type
          switch (building.name) {
            case 'Farm': points += 2; break;
            case 'Lumber Camp': points += 1; break;
            case 'Quarry': points += 1; break;
            case 'Fishing Dock': points += 3; break;
            case 'Hunting Camp': points += 1; break;
            default: points += 1; break;
          }
        }
      }
    }
  }
  return points;
}

/**
 * Calculate Identity pillar - measures cultural cohesion and shared beliefs
 * Builds slowly through knowledge accumulation and tradition
 * Affected by working age policies and governance model
 */
export function calculateIdentityPillar() {
  let identity = window.gameState.cohesion.identity;
  const currentModel = GOVERNANCE_MODELS[window.gameState.governance.model];
  const t = window.devToggles || {};

  // Base decay toward 50 (slower — identity should feel hard-won)
  if (t.cohDecay !== false) {
    const baseDecay = 0.35;
    if (identity > 50) {
      identity = Math.max(50, identity - baseDecay);
    } else if (identity < 50) {
      identity = Math.min(50, identity + 0.15);
    }
  }

  // Working Age effects on knowledge generation (which affects Identity)
  if (t.cohWorkingAge !== false) {
    const totalChildren = getTotalChildren();
    if (totalChildren > 0) {
      if (window.WORKING_AGE < 10) {
        const penalty = Math.abs(10 - window.WORKING_AGE);
        const knowledgePenalty = -Math.floor(penalty / 2);
        window.gameState.resources.knowledge = Math.max(0, window.gameState.resources.knowledge + (knowledgePenalty * 0.1));
      } else if (window.WORKING_AGE > 12) {
        const bonus = Math.min(4, window.WORKING_AGE - 12);
        window.gameState.resources.knowledge = Math.min(window.gameState.resources.knowledge + (bonus * 0.05), window.gameState.resources.knowledge * 1.01);
    }
  }
  }

  // Governance model effects on identity
  if (t.cohGovernance !== false) {
    if (currentModel.effects.identity.traditionBonus) {
      const traditionEffect = (window.gameState.governance.policies.tradition - 50) / 100 * currentModel.effects.identity.traditionBonus;
      identity = Math.max(0, Math.min(100, identity + traditionEffect));
    }
    if (currentModel.effects.identity.faithBonus) {
      identity = Math.min(identity + currentModel.effects.identity.faithBonus, 90);
    }
    if (currentModel.effects.identity.leadershipBonus) {
      identity = Math.min(identity + currentModel.effects.identity.leadershipBonus, 80);
    }
  }

  // Policy effects: Tradition vs Innovation
  if (t.cohPolicy !== false) {
    const traditionPolicy = window.gameState.governance.policies.tradition;
    if (traditionPolicy > 70) {
      identity = Math.min(identity + 0.3, 85);
    } else if (traditionPolicy < 30) {
      identity = Math.max(identity - 0.2, 20);
    }
  }

  // Knowledge accumulation boosts identity
  if (t.cohKnowledge !== false) {
    if (window.gameState.resources.knowledge >= 20) {
      identity = Math.min(identity + 0.5, 85);
    } else if (window.gameState.resources.knowledge >= 10) {
      identity = Math.min(identity + 0.2, 70);
    }
  }

  // Apply interpersonal trust rate limiter to positive growth only
  const prevIdentity = window.gameState.cohesion.identity;
  identity = Math.max(0, Math.min(100, identity));
  if (t.cohTrustLimiter !== false && identity > prevIdentity && window.getInterpersonalRateLimiter) {
    const limiter = window.getInterpersonalRateLimiter();
    identity = prevIdentity + (identity - prevIdentity) * limiter;
  }
  window.gameState.cohesion.identity = identity;
}

/**
 * Calculate Legitimacy pillar - measures acceptance of governance authority
 * Each governance model has different legitimacy sources and baselines
 * Affected by governance transitions, policies, and satisfaction levels
 */
export function calculateLegitimacyPillar() {
  let legitimacy = window.gameState.cohesion.legitimacy;
  const currentModel = GOVERNANCE_MODELS[window.gameState.governance.model];
  const t = window.devToggles || {};

  // Governance transition penalty
  if (t.cohTransitionPenalty !== false && window.gameState.governance.modelChangeTimer > 0) {
    let transitionPenalty = 5;
    if (window.gameState.map) {
      let meetingHallWorkers = 0;
      for (const row of window.gameState.map) {
        for (const hex of row) {
          if (hex.building === 'meeting_hall' && hex.buildProgress <= 0 && hex.workers > 0) {
            meetingHallWorkers += hex.workers;
          }
        }
      }
      const maxReduction = Math.floor(transitionPenalty / 2);
      transitionPenalty -= Math.min(meetingHallWorkers, maxReduction);
    }
    legitimacy = Math.max(legitimacy - transitionPenalty, 0);
    window.gameState.governance.modelChangeTimer--;
    if (window.gameState.governance.modelChangeTimer === 0) {
      window.gameState.governanceTransitionCompleted = window.gameState.governance.model;
    }
  }

  // Model-specific base decay/growth toward model's baseline
  if (t.cohDecay !== false) {
    const modelBase = currentModel.effects.legitimacy.base;
    const baseDecay = 0.5;
    if (legitimacy > modelBase) {
      legitimacy = Math.max(modelBase, legitimacy - baseDecay);
    } else if (legitimacy < modelBase) {
      legitimacy = Math.min(modelBase, legitimacy + baseDecay);
    }
  }

  // Time stability bonus
  if (t.cohTimeStability !== false && currentModel.effects.legitimacy.timeStabilityBonus && window.gameState.year >= 3) {
    legitimacy = Math.min(legitimacy + currentModel.effects.legitimacy.timeStabilityBonus, 85);
  }

  // Model-specific effects
  if (t.cohGovernance !== false) {
    if (currentModel.effects.legitimacy.traditionBonus) {
      const traditionEffect = (window.gameState.governance.policies.tradition - 50) / 100 * currentModel.effects.legitimacy.traditionBonus;
      legitimacy = Math.max(0, Math.min(100, legitimacy + traditionEffect));
    }
    if (currentModel.effects.legitimacy.identityDependency) {
      const identityEffect = (window.gameState.cohesion.identity - 50) / 100 * currentModel.effects.legitimacy.identityDependency;
      legitimacy = Math.max(0, Math.min(100, legitimacy + identityEffect));
    }
  }

  // Satisfaction dependency
  if (t.cohSatDependency !== false) {
    if (currentModel.effects.legitimacy.satisfactionDependency) {
      if (window.gameState.cohesion.satisfaction < 30) {
        legitimacy = Math.max(legitimacy - (1.5 * currentModel.effects.legitimacy.satisfactionDependency), 0);
      }
    } else {
      if (window.gameState.cohesion.satisfaction < 30) {
        legitimacy = Math.max(legitimacy - 1.5, 0);
      }
    }
  }

  // Territory governance strain
  if (t.cohTerritoryStrain !== false && window.getTerritoryGovernanceStrain) {
    const strain = window.getTerritoryGovernanceStrain();
    legitimacy -= strain.legitimacy;
  }

  window.gameState.cohesion.legitimacy = Math.max(0, Math.min(100, legitimacy));
}

/**
 * Calculate Bonds pillar - measures social connections and community strength
 * Builds slowly through time on the land and shared experiences
 * Enhanced by governance models that promote unity
 */
export function calculateBondsPillar() {
  let bonds = window.gameState.cohesion.bonds;
  const currentModel = GOVERNANCE_MODELS[window.gameState.governance.model];
  const t = window.devToggles || {};

  // Governance model effects on bonds
  if (t.cohGovernance !== false) {
    // Bonds build very slowly with time on the land
    if (window.gameState.year >= 2) {
      bonds = Math.min(bonds + 0.3, 80);
    }
    if (currentModel.effects.bonds.stabilityBonus) {
      bonds = Math.min(bonds + currentModel.effects.bonds.stabilityBonus, 85);
    }
    if (currentModel.effects.bonds.unityBonus) {
      bonds = Math.min(bonds + currentModel.effects.bonds.unityBonus, 88);
    }
    if (currentModel.effects.bonds.sharedBeliefBonus) {
      bonds = Math.min(bonds + currentModel.effects.bonds.sharedBeliefBonus, 90);
    }
  }

  // Shared hardship bonus
  if (t.cohHardship !== false) {
    if (window.gameState.cohesion.satisfaction < 40 && window.gameState.population.total > 1) {
      bonds = Math.min(bonds + 0.5, 90);
    }
  }

  // Policy effects: Tradition strengthens bonds
  if (t.cohPolicy !== false) {
    const traditionPolicy = window.gameState.governance.policies.tradition;
    if (traditionPolicy > 60) {
      bonds = Math.min(bonds + 0.2, 85);
    }
  }

  // Base decay toward 45 (bonds drift down harder than they build)
  if (t.cohDecay !== false) {
    if (bonds > 45) {
      bonds = Math.max(45, bonds - 0.2);
    } else if (bonds < 45) {
      bonds = Math.min(45, bonds + 0.05);
    }
  }

  // Territory governance strain
  if (t.cohTerritoryStrain !== false && window.getTerritoryGovernanceStrain) {
    const strain = window.getTerritoryGovernanceStrain();
    bonds -= strain.bonds;
  }

  // Apply interpersonal trust rate limiter to positive growth only
  const prevBonds = window.gameState.cohesion.bonds;
  bonds = Math.max(0, Math.min(100, bonds));
  if (t.cohTrustLimiter !== false && bonds > prevBonds && window.getInterpersonalRateLimiter) {
    const limiter = window.getInterpersonalRateLimiter();
    bonds = prevBonds + (bonds - prevBonds) * limiter;
  }
  window.gameState.cohesion.bonds = bonds;
}

/**
 * Get cohesion status and color based on total cohesion value
 * Used by UI to display appropriate status text and styling
 */
export function getCohesionStatus() {
  const total = window.gameState.cohesion.total;
  if (total >= 80) return { status: "United", color: "var(--accent-green)" };
  if (total >= 60) return { status: "Stable", color: "var(--text-gold)" };
  if (total >= 40) return { status: "Strained", color: "orange" };
  if (total >= 20) return { status: "Fractured", color: "var(--accent-red)" };
  return { status: "Collapse", color: "darkred" };
}

/**
 * Apply cohesion effects based on current total cohesion
 * Called during turn processing to apply bonuses/penalties
 * Includes emigration, productivity effects, and collapse mechanics
 */
// Remove a fraction of pipeline immigrants due to emigration.
// Stages 0/1 (least integrated) leave at full rate; stage 2 at half rate.
function applyImmigrantEmigration(rate) {
  const imm = window.gameState?.immigration;
  if (!imm) return;
  // Stages 0 and 1 at full rate, stage 2 at half rate
  const stageFractions = [rate, rate, rate * 0.5];
  for (let stage = 0; stage < 3; stage++) {
    const cohorts = imm.cohorts[stage];
    if (!cohorts) continue;
    const total = cohorts.reduce((s, c) => s + c.count, 0);
    const loss = Math.floor(total * stageFractions[stage]);
    if (loss <= 0) continue;
    // Remove oldest first
    cohorts.sort((a, b) => b.age - a.age);
    let remaining = loss;
    for (const cohort of cohorts) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, cohort.count);
      cohort.count -= take;
      remaining -= take;
    }
    imm.cohorts[stage] = cohorts.filter(c => c.count > 0);
  }
}

export function applyCohesionEffects() {
  const total = window.gameState.cohesion.total;

  // Effects based on cohesion thresholds
  if (total >= 80) {
    // United: Productivity bonus (future: applied to resource generation)
    // For now, small knowledge bonus
    window.gameState.resources.knowledge = Math.min(window.gameState.resources.knowledge + 0.5, window.gameState.resources.knowledge * 1.02);
  } else if (total < 40) {
    // Strained: Reduced productivity, some emigration risk
    // Small resource penalties
    if (Math.random() < 0.02) { // 2% chance per turn
      const emigrantLoss = Math.max(1, Math.floor(window.gameState.population.total * 0.05));
      window.gameState.population.total = Math.max(1, window.gameState.population.total - emigrantLoss);
      const idleLoss = Math.min(emigrantLoss, window.gameState.population.idle);
      window.gameState.population.idle -= idleLoss;
      if (emigrantLoss > idleLoss) window.gameState.population.employed -= (emigrantLoss - idleLoss);
      if (window.removeFromAdultCohorts) window.removeFromAdultCohorts(emigrantLoss);
      if (window.clampWorkers) window.clampWorkers();
      applyImmigrantEmigration(0.05);
    }
  }

  if (total < 20) {
    // Fractured: Serious problems
    // Higher emigration, potential building damage
    if (Math.random() < 0.05) { // 5% chance
      const emigrantLoss = Math.max(1, Math.floor(window.gameState.population.total * 0.1));
      window.gameState.population.total = Math.max(1, window.gameState.population.total - emigrantLoss);
      const idleLoss = Math.min(emigrantLoss, window.gameState.population.idle);
      window.gameState.population.idle -= idleLoss;
      if (emigrantLoss > idleLoss) window.gameState.population.employed -= (emigrantLoss - idleLoss);
      if (window.removeFromAdultCohorts) window.removeFromAdultCohorts(emigrantLoss);
      if (window.clampWorkers) window.clampWorkers();
      applyImmigrantEmigration(0.1);
    }
  }

  // Game over condition
  if (total <= 5 && window.gameState.population.total > 0) {
    // Society collapse - will trigger game over (future implementation)
    console.log("GAME OVER: Society has collapsed!");
  }
}

/**
 * Update all cohesion-related UI elements
 * Updates top bar segments, total value with status color, and sidebar detail bars
 * Shows change indicators for pillars that changed this turn
 */
export function updateCohesionDisplay() {
  const c = window.gameState.cohesion;
  const total = Math.round(c.total);
  const sum = c.identity + c.legitimacy + c.satisfaction + c.bonds;
  const status = getCohesionStatus();

  // Update top bar segments (proportional to actual values)
  if (sum > 0) {
    document.getElementById('seg-identity').style.width = (c.identity/sum*100)+'%';
    document.getElementById('seg-legitimacy').style.width = (c.legitimacy/sum*100)+'%';
    document.getElementById('seg-satisfaction').style.width = (c.satisfaction/sum*100)+'%';
    document.getElementById('seg-bonds').style.width = (c.bonds/sum*100)+'%';
  }

  // Update total value with status color
  const cohesionValueEl = document.getElementById('cohesion-value');
  cohesionValueEl.textContent = total;
  cohesionValueEl.style.color = status.color;

  // Compute projected next-turn deltas for display
  const projected = previewCohesionDeltas();

  // Format a delta for display: show 1 decimal for sub-integer, integer otherwise.
  // Returns empty string if change is negligible (< 0.05).
  const fmtDelta = d => {
    if (Math.abs(d) < 0.05) return '';
    const sign = d > 0 ? '+' : '';
    const abs = Math.abs(d);
    const str = abs >= 1 && Number.isInteger(Math.round(abs)) && abs % 1 < 0.05
      ? Math.round(d).toString()
      : (Math.round(d * 10) / 10).toFixed(1);
    return ` (${sign}${d < 0 ? '-' : ''}${str.replace('-','')})`;
  };

  // Display values as rounded integers, but keep bar widths as floats for smooth fill
  const disp = p => Math.round(c[p]);

  // Add tooltip with breakdown and projected changes
  const container = document.getElementById('cohesion-bar-container');
  container.title = `Cohesion: ${status.status} (${total}%)\nIdentity: ${disp('identity')}${fmtDelta(projected.identity)}\nLegitimacy: ${disp('legitimacy')}${fmtDelta(projected.legitimacy)}\nSatisfaction: ${disp('satisfaction')}${fmtDelta(projected.satisfaction)}\nBonds: ${disp('bonds')}${fmtDelta(projected.bonds)}`;

  // Update sidebar detail bars
  for (const p of ['identity','legitimacy','satisfaction','bonds']) {
    const barEl = document.getElementById(`bar-${p}`);
    const valEl = document.getElementById(`val-${p}`);
    if (barEl && valEl) {
      barEl.style.width = c[p]+'%';
      valEl.textContent = disp(p);

      // Show projected next-turn change
      const deltaStr = fmtDelta(projected[p]);
      if (deltaStr) {
        valEl.textContent += deltaStr;
        valEl.style.fontWeight = '700';
      } else {
        valEl.style.fontWeight = '400';
      }
    }
  }
}

/**
 * Helper function to get total children below working age
 * Used by satisfaction and identity calculations
 */
export function getTotalChildren() {
  return window.gameState.childCohorts
    .filter(cohort => cohort.age < window.WORKING_AGE)
    .reduce((sum, cohort) => sum + cohort.count, 0);
}

/**
 * Get a numeric breakdown of all influences acting on a specific cohesion pillar.
 * Returns an array of { label, value, type } where type is 'positive'|'negative'|'neutral'.
 * Does NOT mutate state — takes a snapshot, runs sub-calculations, and restores.
 */
export function getCohesionBreakdown(pillarKey) {
  const gs = window.gameState;
  const c = gs.cohesion;
  const currentModel = GOVERNANCE_MODELS[gs.governance.model];
  const items = [];

  function add(label, value) {
    if (Math.abs(value) < 0.005) return;
    items.push({ label, value: Math.round(value * 100) / 100, type: value > 0 ? 'positive' : 'negative' });
  }

  if (pillarKey === 'satisfaction') {
    const base = c.satisfaction;

    // Food security
    const totalChildren = getTotalChildren();
    const totalFoodNeed = (gs.population.total * window.FOOD_PER_POP) + (totalChildren * window.FOOD_PER_CHILD);
    const stockpile = gs.resources.food;
    const netFood = window.calculateIncome ? window.calculateIncome().netFood : 0;
    const turnsOfFood = netFood >= 0 ? Infinity : stockpile / Math.abs(netFood);
    let foodEffect = 0;
    if (netFood >= 0 && stockpile >= totalFoodNeed) foodEffect = Math.min(80, base + 8) - base;
    else if (netFood >= 0) foodEffect = Math.min(70, base + 4) - base;
    else if (turnsOfFood > 8) foodEffect = Math.min(65, base + 1) - base;
    else if (turnsOfFood > 4) foodEffect = -Math.min(base, 4);
    else if (turnsOfFood > 2) foodEffect = -Math.min(base, 8);
    else foodEffect = -Math.min(base, 14);
    add('🌾 Food security', foodEffect);

    // Working age
    if (totalChildren > 0) {
      const isStarving = stockpile < totalFoodNeed;
      if (window.WORKING_AGE < 10) {
        const penalty = Math.abs(10 - window.WORKING_AGE);
        add(`👶 Working age ${window.WORKING_AGE}`, (isStarving ? -Math.floor(penalty / 2) : -penalty) * 0.15);
      } else if (window.WORKING_AGE > 12) {
        const bonus = Math.min(4, window.WORKING_AGE - 12);
        const satBonus = Math.floor(bonus / 2) + 1;
        add(`🧒 Working age ${window.WORKING_AGE}`, satBonus * 0.1);
      }
    }

    // Governance model effects
    if (currentModel.effects.satisfaction.freedomBonus) {
      const v = (gs.governance.policies.freedom - 50) / 100 * currentModel.effects.satisfaction.freedomBonus;
      add('⚖️ Gov. freedom bonus', v);
    }
    if (currentModel.effects.satisfaction.controlBonus) {
      const v = (50 - gs.governance.policies.freedom) / 100 * currentModel.effects.satisfaction.controlBonus;
      add('⚖️ Gov. control bonus', v);
    }
    if (currentModel.effects.satisfaction.orderBonus) add('⚖️ Theocratic order', currentModel.effects.satisfaction.orderBonus);
    if (currentModel.effects.satisfaction.freedomPenalty) add('⚖️ Theocratic restriction', currentModel.effects.satisfaction.freedomPenalty);

    // Policy
    const fp = gs.governance.policies.freedom;
    if (fp > 70) add('🕊️ High freedom policy', 0.5);
    else if (fp < 30) add('⛓️ Low freedom policy', -0.3);

    // Shelter
    const totalPop = gs.population.total + totalChildren;
    const shelterPoints = window.calculateShelterPoints ? window.calculateShelterPoints() : 0;
    const shelterRatio = shelterPoints / Math.max(1, totalPop);
    if (shelterRatio >= 0.8) add(`🏠 Good shelter (${shelterPoints}/${totalPop})`, 3);
    else if (shelterRatio >= 0.5) add(`🏠 Adequate shelter (${shelterPoints}/${totalPop})`, 1);
    else if (shelterRatio < 0.3) add(`🏠 Poor shelter (${shelterPoints}/${totalPop} — build settlements)`, -2);

    // Society building satisfaction yields
    if (gs.map) {
      const shrines = gs.map.flat().filter(h => h.building === 'shrine' && h.buildProgress <= 0 && h.workers > 0);
      for (const s of shrines) {
        const bDef = BUILDINGS?.shrine;
        if (bDef?.satisfactionYield) add('🕯️ Shrine', s.workers * bDef.satisfactionYield);
      }
      const festivalGrounds = gs.map.flat().filter(h => h.building === 'festival_grounds' && h.buildProgress <= 0 && h.workers > 0);
      for (const fg of festivalGrounds) {
        const bDef = BUILDINGS?.festival_grounds;
        if (bDef?.satisfactionYield) add('🎪 Festival Grounds', fg.workers * bDef.satisfactionYield);
      }
      const markets = gs.map.flat().filter(h => h.building === 'market' && h.buildProgress <= 0 && h.workers > 0);
      for (const m of markets) {
        const bDef = BUILDINGS?.market;
        if (bDef?.satisfactionPerWorker) add('🏪 Market', m.workers * bDef.satisfactionPerWorker);
      }
    }

    // Crime drains
    if (window.getCrimeState) {
      const crime = window.getCrimeState();
      if (crime) {
        if (crime.theft > 1) add('🔓 Theft', -(crime.theft * 0.15));
        if (crime.violence > 1) add('⚔️ Violence', -(crime.violence * 0.25));
      }
    }

    // Resistance drains
    if (gs.resistance?.pressure >= 60) add('✊ Organized resistance', -0.15);
    if (gs.resistance?.pressure >= 95) add('🔥 Radical resistance', -1.0);

    // Decay
    if (base > 50) add('⏱️ Drift toward 50', -Math.min(0.8, base - 50));
    else if (base < 50) add('⏱️ Drift toward 50', Math.min(0.8, 50 - base));

  } else if (pillarKey === 'identity') {
    const base = c.identity;

    // Decay
    if (base > 50) add('⏱️ Drift toward 50', -Math.min(0.2, base - 50));
    else if (base < 50) add('⏱️ Drift toward 50', Math.min(0.2, 50 - base));

    // Working age → knowledge
    const totalChildren = getTotalChildren();
    if (totalChildren > 0 && window.WORKING_AGE < 10) add('📚 Low working age → knowledge penalty', -Math.floor(Math.abs(10 - window.WORKING_AGE) / 2) * 0.1);
    else if (totalChildren > 0 && window.WORKING_AGE > 12) add('📚 High working age → knowledge bonus', Math.min(4, window.WORKING_AGE - 12) * 0.05);

    // Governance
    if (currentModel.effects.identity.traditionBonus) {
      add('⚖️ Gov. tradition effect', (gs.governance.policies.tradition - 50) / 100 * currentModel.effects.identity.traditionBonus);
    }
    if (currentModel.effects.identity.faithBonus) add('🙏 Theocracy faith bonus', currentModel.effects.identity.faithBonus);
    if (currentModel.effects.identity.leadershipBonus) add('👑 Chieftain leadership', currentModel.effects.identity.leadershipBonus);

    // Policy
    const tp = gs.governance.policies.tradition;
    if (tp > 70) add('🌿 High tradition policy', 0.3);
    else if (tp < 30) add('⚡ Low tradition policy', -0.2);

    // Knowledge
    if (gs.resources.knowledge >= 20) add('🧠 Knowledge ≥20', 0.5);
    else if (gs.resources.knowledge >= 10) add('🧠 Knowledge ≥10', 0.2);

    // Trust rate limiter
    if (window.getInterpersonalRateLimiter) {
      const limiter = window.getInterpersonalRateLimiter();
      if (limiter < 0.95) add('🤝 Trust rate limiter', -(1 - limiter));
    }

    // Society buildings & stories (pre-pillar-calc effects)
    const storytellers = gs.culture?.storytellers ?? 0;
    if (storytellers > 0) add(`📖 ${storytellers} storyteller${storytellers > 1 ? 's' : ''}`, storytellers * 0.25);
    const sacredSites = gs.map ? gs.map.flat().filter(h => h.building === 'sacred_site' && h.buildProgress <= 0 && h.workers > 0).length : 0;
    if (sacredSites > 0) {
      const bDef = window.BUILDINGS?.sacred_site;
      add('⛩️ Sacred sites', sacredSites * (bDef?.identityYield ?? 0) * 1); // approximate
    }
    const shrines = gs.map ? gs.map.flat().filter(h => h.building === 'shrine' && h.buildProgress <= 0 && h.workers > 0) : [];
    for (const s of shrines) {
      const bDef = window.BUILDINGS?.shrine;
      if (bDef?.identityYield) add('🕯️ Shrine', s.workers * bDef.identityYield);
    }

    // Values passive bonus
    const values = gs.values?.recognized ?? [];
    if (values.length > 0) {
      let totalBonus = 0;
      for (const v of values) totalBonus += Math.min(VALUE_IDENTITY_MAX, VALUE_IDENTITY_BASE * (v.strength ?? 1));
      if (totalBonus > 0) add('💎 Shared values', totalBonus);
    }

    // Monument neglect drains (identity component)
    if (gs.map) {
      const NEGLECT_INTERVAL = 8;
      const monuments = gs.map.flat().filter(h => h.building === 'monument' && h.buildProgress <= 0);
      for (const m of monuments) {
        const stewardTending = gs.units?.some(u => u.type === 'steward' && u.col === m.col && u.row === m.row && u.activeAction === 'tending_monument');
        const turnsSince = gs.turn - (m.lastStewardTurn ?? m.completedTurn ?? gs.turn);
        const isNeglected = m.monumentState === 'neglected' || (!stewardTending && turnsSince >= NEGLECT_INTERVAL);
        if (isNeglected) {
          add('🗿 Monument neglected', -0.05);
        } else {
          add('🗿 Monument tended', 0.05);
        }
      }
    }

    // Crime drains
    if (window.getCrimeState) {
      const crime = window.getCrimeState();
      if (crime && crime.transgression > 1) add('🚫 Norm transgression', -(crime.transgression * 0.12));
    }

    // Resistance drains (radical)
    if (gs.resistance?.pressure >= 95) add('🔥 Radical resistance', -1.0);

  } else if (pillarKey === 'legitimacy') {
    const base = c.legitimacy;

    // Transition penalty
    if (gs.governance.modelChangeTimer > 0) {
      let penalty = 5;
      let mhWorkers = 0;
      if (gs.map) for (const row of gs.map) for (const hex of row) {
        if (hex.building === 'meeting_hall' && hex.buildProgress <= 0 && hex.workers > 0) mhWorkers += hex.workers;
      }
      penalty -= Math.min(mhWorkers, Math.floor(penalty / 2));
      add(`🔄 Governance transition (${gs.governance.modelChangeTimer}t left)`, -penalty);
    }

    // Model base decay
    const modelBase = currentModel.effects.legitimacy.base;
    if (base > modelBase) add(`⏱️ Drift toward ${modelBase}`, -Math.min(0.5, base - modelBase));
    else if (base < modelBase) add(`⏱️ Drift toward ${modelBase}`, Math.min(0.5, modelBase - base));

    // Time stability
    if (currentModel.effects.legitimacy.timeStabilityBonus && gs.year >= 3) {
      add('🕰️ Years of stable rule', currentModel.effects.legitimacy.timeStabilityBonus);
    }

    // Tradition bonus
    if (currentModel.effects.legitimacy.traditionBonus) {
      add('🌿 Gov. tradition effect', (gs.governance.policies.tradition - 50) / 100 * currentModel.effects.legitimacy.traditionBonus);
    }

    // Satisfaction dependency
    if (c.satisfaction < 30) {
      const dep = currentModel.effects.legitimacy.satisfactionDependency || 1;
      add('😤 Low satisfaction', -(1.5 * dep));
    }

    // Identity dependency
    if (currentModel.effects.legitimacy.identityDependency) {
      add('🙏 Identity dependency', (c.identity - 50) / 100 * currentModel.effects.legitimacy.identityDependency);
    }

    // Territory strain
    if (window.getTerritoryGovernanceStrain) {
      const strain = window.getTerritoryGovernanceStrain();
      if (strain.legitimacy > 0) add('🗺️ Territory governance strain', -strain.legitimacy);
    }

    // Meeting hall legitimacy
    const meetingHalls = gs.map ? gs.map.flat().filter(h => h.building === 'meeting_hall' && h.buildProgress <= 0 && h.workers > 0) : [];
    for (const mh of meetingHalls) {
      const bDef = window.BUILDINGS?.meeting_hall;
      if (bDef?.legitimacyYield) add('🏛️ Meeting Hall', mh.workers * bDef.legitimacyYield);
    }

    // Resistance
    if (gs.resistance?.pressure >= 60) add('✊ Organized resistance', -0.3);
    if (gs.resistance?.pressure >= 95) add('🔥 Radical resistance', -1.0);

    // Crime drains
    if (window.getCrimeState) {
      const crime = window.getCrimeState();
      if (crime && crime.transgression > 1) add('🚫 Norm transgression', -(crime.transgression * 0.08));
    }

  } else if (pillarKey === 'bonds') {
    const base = c.bonds;

    // Time growth
    if (gs.year >= 2) add('🌍 Time on the land', 0.3);

    // Governance
    if (currentModel.effects.bonds.stabilityBonus) add('🏛️ Gov. stability bonus', currentModel.effects.bonds.stabilityBonus);
    if (currentModel.effects.bonds.unityBonus) add('👑 Chieftain unity', currentModel.effects.bonds.unityBonus);
    if (currentModel.effects.bonds.sharedBeliefBonus) add('🙏 Shared faith bonds', currentModel.effects.bonds.sharedBeliefBonus);

    // Shared hardship
    if (c.satisfaction < 40 && gs.population.total > 1) add('🤝 Shared hardship', 0.5);

    // Policy
    if (gs.governance.policies.tradition > 60) add('🌿 Tradition policy', 0.2);

    // Decay
    if (base > 45) add('⏱️ Drift toward 45', -Math.min(0.1, base - 45));
    else if (base < 45) add('⏱️ Drift toward 45', Math.min(0.1, 45 - base));

    // Territory strain
    if (window.getTerritoryGovernanceStrain) {
      const strain = window.getTerritoryGovernanceStrain();
      if (strain.bonds > 0) add('🗺️ Territory governance strain', -strain.bonds);
    }

    // Trust rate limiter
    if (window.getInterpersonalRateLimiter) {
      const limiter = window.getInterpersonalRateLimiter();
      if (limiter < 0.95) add('🤝 Trust rate limiter', -(1 - limiter));
    }

    // Sacred sites
    const sacredSites = gs.map ? gs.map.flat().filter(h => h.building === 'sacred_site' && h.buildProgress <= 0 && h.workers > 0) : [];
    for (const s of sacredSites) {
      const bDef = window.BUILDINGS?.sacred_site;
      if (bDef?.bondsYield) add('⛩️ Sacred site', s.workers * bDef.bondsYield);
    }

    // Monument neglect drains (bonds component)
    if (gs.map) {
      const NEGLECT_INTERVAL = 8;
      const monuments = gs.map.flat().filter(h => h.building === 'monument' && h.buildProgress <= 0);
      for (const m of monuments) {
        const stewardTending = gs.units?.some(u => u.type === 'steward' && u.col === m.col && u.row === m.row && u.activeAction === 'tending_monument');
        const turnsSince = gs.turn - (m.lastStewardTurn ?? m.completedTurn ?? gs.turn);
        const isNeglected = m.monumentState === 'neglected' || (!stewardTending && turnsSince >= NEGLECT_INTERVAL);
        if (isNeglected) {
          add('🗿 Monument neglected', -0.05);
        } else {
          add('🗿 Monument tended', 0.05);
        }
      }
    }

    // Crime drains
    if (window.getCrimeState) {
      const crime = window.getCrimeState();
      if (crime && crime.violence > 1) add('⚔️ Violence', -(crime.violence * 0.15));
    }

    // Resistance drains (radical)
    if (gs.resistance?.pressure >= 95) add('🔥 Radical resistance', -1.0);

    // Immigration parallel society
    if (gs.immigration?.parallelSociety?.strength > 0) {
      const pss = gs.immigration.parallelSociety.strength;
      add('🏘️ Parallel society', -(pss * pss * 9));
    }
  }

  return items;
}
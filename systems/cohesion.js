// ---- COHESION SYSTEM ----
// Manages the four pillars of social cohesion: Identity, Legitimacy, Satisfaction, and Bonds
// Each pillar ranges from 0-100, with total cohesion calculated as a weighted average
// Lower pillars drag down total cohesion, representing how social weaknesses compound

import { GOVERNANCE_MODELS } from '../data/governance.js';
import { BUILDINGS } from '../data/buildings.js';

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

  // Track changes for UI display
  window.gameState.cohesion.lastUpdate = {
    identity: window.gameState.cohesion.identity - prev.identity,
    legitimacy: window.gameState.cohesion.legitimacy - prev.legitimacy,
    satisfaction: window.gameState.cohesion.satisfaction - prev.satisfaction,
    bonds: window.gameState.cohesion.bonds - prev.bonds
  };
}

/**
 * Calculate Satisfaction pillar - measures immediate happiness and welfare
 * Driven primarily by food security, shelter, and governance policies
 * Most volatile pillar, responds quickly to changing conditions
 */
export function calculateSatisfactionPillar() {
  let satisfaction = window.gameState.cohesion.satisfaction;
  const currentModel = GOVERNANCE_MODELS[window.gameState.governance.model];

  // Food satisfaction - most immediate factor
  const totalChildren = getTotalChildren();
  const totalFoodNeed = (window.gameState.population.total * window.FOOD_PER_POP) + (totalChildren * window.FOOD_PER_CHILD);
  const foodRatio = window.gameState.resources.food / Math.max(1, totalFoodNeed);

  if (foodRatio >= 1.5) {
    // Abundant food - +8 per turn toward 80
    satisfaction = Math.min(80, satisfaction + 8);
  } else if (foodRatio >= 1.2) {
    // Good surplus - +4 per turn toward 70
    satisfaction = Math.min(70, satisfaction + 4);
  } else if (foodRatio >= 1.0) {
    // Adequate - slow growth toward 60
    satisfaction = Math.min(60, satisfaction + 2);
  } else if (foodRatio >= 0.8) {
    // Shortage - moderate decline
    satisfaction = Math.max(0, satisfaction - 6);
  } else {
    // Severe shortage/starvation - rapid decline
    satisfaction = Math.max(0, satisfaction - 12);
  }

  // Working Age policy effects on satisfaction
  if (totalChildren > 0) {
    const isStarving = window.gameState.resources.food < totalFoodNeed;
    if (window.WORKING_AGE < 10) {
      // Low working age - children working
      const penalty = Math.abs(10 - window.WORKING_AGE); // 1-4 based on how far below 10
      const satisfactionPenalty = isStarving ? -Math.floor(penalty / 2) : -penalty; // Reduced penalty during starvation
      satisfaction = Math.max(0, satisfaction + (satisfactionPenalty * 0.15));
    } else if (window.WORKING_AGE > 12) {
      // High working age - protected childhood
      const bonus = Math.min(4, window.WORKING_AGE - 12); // Max bonus of 4
      const satisfactionBonus = Math.floor(bonus / 2) + 1;
      satisfaction = Math.min(satisfaction + (satisfactionBonus * 0.1), 85);
    }
  }

  // Governance model effects on satisfaction
  if (currentModel.effects.satisfaction.freedomBonus) {
    const freedomEffect = (window.gameState.governance.policies.freedom - 50) / 100 * currentModel.effects.satisfaction.freedomBonus;
    satisfaction = Math.max(0, Math.min(100, satisfaction + freedomEffect));
  }

  if (currentModel.effects.satisfaction.controlBonus) {
    const controlEffect = (50 - window.gameState.governance.policies.freedom) / 100 * currentModel.effects.satisfaction.controlBonus;
    satisfaction = Math.max(0, Math.min(100, satisfaction + controlEffect));
  }

  if (currentModel.effects.satisfaction.orderBonus) {
    // Theocracy gets order bonus regardless of freedom policy
    satisfaction = Math.min(satisfaction + currentModel.effects.satisfaction.orderBonus, 90);
  }

  if (currentModel.effects.satisfaction.freedomPenalty) {
    // Theocracy has inherent freedom penalty
    satisfaction = Math.max(0, satisfaction + currentModel.effects.satisfaction.freedomPenalty);
  }

  // Policy effects: Freedom vs Control
  const freedomPolicy = window.gameState.governance.policies.freedom;
  if (freedomPolicy > 70) {
    satisfaction = Math.min(satisfaction + 0.5, 90); // High freedom satisfaction
  } else if (freedomPolicy < 30) {
    satisfaction = Math.max(satisfaction - 0.3, 0); // Control reduces satisfaction
  }

  // Shelter satisfaction - buildings provide comfort
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

  // Monthly decay toward baseline (50)
  const decayRate = 0.8;
  if (satisfaction > 50) {
    satisfaction = Math.max(50, satisfaction - decayRate);
  } else if (satisfaction < 50) {
    satisfaction = Math.min(50, satisfaction + decayRate);
  }

  window.gameState.cohesion.satisfaction = Math.round(Math.max(0, Math.min(100, satisfaction)));
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

  // Identity builds and decays very slowly
  // Base decay toward 50
  const baseDecay = 0.2;
  if (identity > 50) {
    identity = Math.max(50, identity - baseDecay);
  } else if (identity < 50) {
    identity = Math.min(50, identity + baseDecay);
  }

  // Working Age effects on knowledge generation (which affects Identity)
  const totalChildren = getTotalChildren();
  if (totalChildren > 0) {
    if (window.WORKING_AGE < 10) {
      // Low working age - reduced knowledge generation
      const penalty = Math.abs(10 - window.WORKING_AGE); // 1-4 based on how far below 10
      const knowledgePenalty = -Math.floor(penalty / 2);
      window.gameState.resources.knowledge = Math.max(0, window.gameState.resources.knowledge + (knowledgePenalty * 0.1));
    } else if (window.WORKING_AGE > 12) {
      // High working age - knowledge bonus
      const bonus = Math.min(4, window.WORKING_AGE - 12); // Max bonus of 4
      window.gameState.resources.knowledge = Math.min(window.gameState.resources.knowledge + (bonus * 0.05), window.gameState.resources.knowledge * 1.01);
    }
  }

  // Governance model effects on identity
  if (currentModel.effects.identity.traditionBonus) {
    const traditionEffect = (window.gameState.governance.policies.tradition - 50) / 100 * currentModel.effects.identity.traditionBonus;
    identity = Math.max(0, Math.min(100, identity + traditionEffect));
  }

  if (currentModel.effects.identity.faithBonus) {
    // Theocracy gets faith-based identity bonus
    identity = Math.min(identity + currentModel.effects.identity.faithBonus, 90);
  }

  if (currentModel.effects.identity.leadershipBonus) {
    // Chieftain provides leadership-based identity
    identity = Math.min(identity + currentModel.effects.identity.leadershipBonus, 80);
  }

  // Policy effects: Tradition vs Innovation
  const traditionPolicy = window.gameState.governance.policies.tradition;
  if (traditionPolicy > 70) {
    identity = Math.min(identity + 0.3, 85); // Strong tradition boosts identity
  } else if (traditionPolicy < 30) {
    identity = Math.max(identity - 0.2, 20); // Innovation can erode traditional identity
  }

  // Knowledge accumulation boosts identity
  if (window.gameState.resources.knowledge >= 20) {
    identity = Math.min(identity + 0.5, 85);
  } else if (window.gameState.resources.knowledge >= 10) {
    identity = Math.min(identity + 0.2, 70);
  }

  window.gameState.cohesion.identity = Math.round(Math.max(0, Math.min(100, identity)));
}

/**
 * Calculate Legitimacy pillar - measures acceptance of governance authority
 * Each governance model has different legitimacy sources and baselines
 * Affected by governance transitions, policies, and satisfaction levels
 */
export function calculateLegitimacyPillar() {
  let legitimacy = window.gameState.cohesion.legitimacy;
  const currentModel = GOVERNANCE_MODELS[window.gameState.governance.model];

  // Governance transition penalty
  if (window.gameState.governance.modelChangeTimer > 0) {
    legitimacy = Math.max(legitimacy - 5, 0); // Major disruption during transition
    window.gameState.governance.modelChangeTimer--;

    // Check if transition just completed
    if (window.gameState.governance.modelChangeTimer === 0) {
      // Set flag for turn summary
      window.gameState.governanceTransitionCompleted = window.gameState.governance.model;
    }
  }

  // Model-specific base decay/growth toward model's baseline
  const modelBase = currentModel.effects.legitimacy.base;
  const baseDecay = 0.5;
  if (legitimacy > modelBase) {
    legitimacy = Math.max(modelBase, legitimacy - baseDecay);
  } else if (legitimacy < modelBase) {
    legitimacy = Math.min(modelBase, legitimacy + baseDecay);
  }

  // Model-specific effects
  if (currentModel.effects.legitimacy.timeStabilityBonus && window.gameState.year >= 3) {
    legitimacy = Math.min(legitimacy + currentModel.effects.legitimacy.timeStabilityBonus, 85);
  }

  if (currentModel.effects.legitimacy.traditionBonus) {
    const traditionEffect = (window.gameState.governance.policies.tradition - 50) / 100 * currentModel.effects.legitimacy.traditionBonus;
    legitimacy = Math.max(0, Math.min(100, legitimacy + traditionEffect));
  }

  // Satisfaction dependency (stronger for Chieftain)
  if (currentModel.effects.legitimacy.satisfactionDependency) {
    if (window.gameState.cohesion.satisfaction < 30) {
      legitimacy = Math.max(legitimacy - (1.5 * currentModel.effects.legitimacy.satisfactionDependency), 0);
    }
  } else {
    // Default satisfaction effect for models without specific dependency
    if (window.gameState.cohesion.satisfaction < 30) {
      legitimacy = Math.max(legitimacy - 1.5, 0);
    }
  }

  // Identity dependency (Theocracy relies on shared beliefs)
  if (currentModel.effects.legitimacy.identityDependency) {
    const identityEffect = (window.gameState.cohesion.identity - 50) / 100 * currentModel.effects.legitimacy.identityDependency;
    legitimacy = Math.max(0, Math.min(100, legitimacy + identityEffect));
  }

  window.gameState.cohesion.legitimacy = Math.round(Math.max(0, Math.min(100, legitimacy)));
}

/**
 * Calculate Bonds pillar - measures social connections and community strength
 * Builds slowly through time on the land and shared experiences
 * Enhanced by governance models that promote unity
 */
export function calculateBondsPillar() {
  let bonds = window.gameState.cohesion.bonds;
  const currentModel = GOVERNANCE_MODELS[window.gameState.governance.model];

  // Bonds build very slowly with time on the land
  const baseGrowth = 0.3;
  if (window.gameState.year >= 2) {
    bonds = Math.min(bonds + baseGrowth, 80);
  }

  // Governance model effects on bonds
  if (currentModel.effects.bonds.stabilityBonus) {
    bonds = Math.min(bonds + currentModel.effects.bonds.stabilityBonus, 85);
  }

  if (currentModel.effects.bonds.unityBonus) {
    // Chieftain provides unity through strong leadership
    bonds = Math.min(bonds + currentModel.effects.bonds.unityBonus, 88);
  }

  if (currentModel.effects.bonds.sharedBeliefBonus) {
    // Theocracy creates bonds through shared faith
    bonds = Math.min(bonds + currentModel.effects.bonds.sharedBeliefBonus, 90);
  }

  // Slight bonus for surviving hardships together
  if (window.gameState.cohesion.satisfaction < 40 && window.gameState.population.total > 1) {
    bonds = Math.min(bonds + 0.5, 90); // Shared hardship strengthens bonds
  }

  // Policy effects: Tradition strengthens bonds
  const traditionPolicy = window.gameState.governance.policies.tradition;
  if (traditionPolicy > 60) {
    bonds = Math.min(bonds + 0.2, 85); // Traditional societies have stronger community bonds
  }

  // Base decay toward 45 (lower than others - bonds are precious)
  const baseDecay = 0.1;
  if (bonds > 45) {
    bonds = Math.max(45, bonds - baseDecay);
  } else if (bonds < 45) {
    bonds = Math.min(45, bonds + baseDecay);
  }

  window.gameState.cohesion.bonds = Math.round(Math.max(0, Math.min(100, bonds)));
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
      // Don't report yet - will be part of turn summary later
    }
  }

  if (total < 20) {
    // Fractured: Serious problems
    // Higher emigration, potential building damage
    if (Math.random() < 0.05) { // 5% chance
      const emigrantLoss = Math.max(1, Math.floor(window.gameState.population.total * 0.1));
      window.gameState.population.total = Math.max(1, window.gameState.population.total - emigrantLoss);
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
  const total = c.total; // Use calculated total from cohesion system
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

  // Add tooltip with breakdown and status
  const container = document.getElementById('cohesion-bar-container');
  container.title = `Cohesion: ${status.status} (${total}%)\nIdentity: ${c.identity}${c.lastUpdate.identity !== 0 ? ` (${c.lastUpdate.identity > 0 ? '+' : ''}${Math.round(c.lastUpdate.identity)})` : ''}\nLegitimacy: ${c.legitimacy}${c.lastUpdate.legitimacy !== 0 ? ` (${c.lastUpdate.legitimacy > 0 ? '+' : ''}${Math.round(c.lastUpdate.legitimacy)})` : ''}\nSatisfaction: ${c.satisfaction}${c.lastUpdate.satisfaction !== 0 ? ` (${c.lastUpdate.satisfaction > 0 ? '+' : ''}${Math.round(c.lastUpdate.satisfaction)})` : ''}\nBonds: ${c.bonds}${c.lastUpdate.bonds !== 0 ? ` (${c.lastUpdate.bonds > 0 ? '+' : ''}${Math.round(c.lastUpdate.bonds)})` : ''}`;

  // Update sidebar detail bars
  for (const p of ['identity','legitimacy','satisfaction','bonds']) {
    const barEl = document.getElementById(`bar-${p}`);
    const valEl = document.getElementById(`val-${p}`);
    if (barEl && valEl) {
      barEl.style.width = c[p]+'%';
      valEl.textContent = c[p];

      // Add change indicator
      const change = c.lastUpdate[p];
      if (change !== 0) {
        valEl.textContent += ` (${change > 0 ? '+' : ''}${Math.round(change)})`;
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
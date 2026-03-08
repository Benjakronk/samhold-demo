// Turn Processing System for Samhold
// Handles all turn-based game logic including population, resources, and victory conditions
// Extracted from main game file for modular architecture

// Global references that will be set by main game
let gameState = null;
let mapDirty = null;

// Initialize turn processing system
function initTurnProcessing(gameStateRef) {
  gameState = gameStateRef;
}

// ---- CORE TURN PROCESSING ----

function processTurn() {
  const report = { events: [], foodIncome: 0, matIncome: 0, foodConsumed: 0, popChange: 0, buildingsCompleted: [], winterCost: 0, constructionWorkers: 0 };
  const inc = window.calculateIncome();

  report.foodIncome = inc.foodIncome;
  report.matIncome = inc.matIncome;
  report.foodConsumed = inc.foodConsumed;

  // Advance construction based on assigned workers
  for (let r = 0; r < window.MAP_ROWS; r++) for (let c = 0; c < window.MAP_COLS; c++) {
    const hex = gameState.map[r][c];
    if (hex.building && hex.buildProgress > 0) {
      if (hex.workers > 0) {
        hex.buildProgress = Math.max(0, hex.buildProgress - hex.workers);
        report.constructionWorkers += hex.workers;
        if (window.setMapDirty) window.setMapDirty(true);
        if (hex.buildProgress <= 0) {
          report.buildingsCompleted.push({ name: window.BUILDINGS[hex.building].name, col: c, row: r });
          report.events.push(`${window.BUILDINGS[hex.building].icon} ${window.BUILDINGS[hex.building].name} completed at (${c},${r}).`);
          // Workers stay assigned — now they work the completed building
        }
      }
    }
  }

  // Advance unit training
  for (let i = gameState.unitsInTraining.length - 1; i >= 0; i--) {
    const trainingUnit = gameState.unitsInTraining[i];
    trainingUnit.trainingProgress--;

    if (trainingUnit.trainingProgress <= 0) {
      // Training completed - create the actual unit
      const unit = window.createUnit(trainingUnit.type, trainingUnit.col, trainingUnit.row);
      if (unit) {
        const unitType = window.UNIT_TYPES[trainingUnit.type];
        report.events.push(`${unitType.icon} ${unitType.name} training completed at (${trainingUnit.col},${trainingUnit.row}).`);
      }

      // Remove from training queue
      gameState.unitsInTraining.splice(i, 1);
      if (window.setMapDirty) window.setMapDirty(true);
    }
  }

  // Apply resource income
  gameState.resources.food += inc.netFood;
  gameState.resources.materials += inc.netMat;
  if (gameState.resources.materials < 0) gameState.resources.materials = 0;

  // Winter penalty — BEFORE starvation check
  if (window.SEASONS[gameState.season] === 'Winter') {
    let baseCost = Math.ceil(gameState.population.total * 0.5);

    // Apply event-based winter food reduction modifiers
    let totalReduction = 0;
    for (const activeEvent of gameState.activeEvents || []) {
      if (activeEvent.winterEffects && activeEvent.winterEffects.winterFoodReduction) {
        totalReduction += activeEvent.winterEffects.winterFoodReduction;
      }
    }

    // Reduce winter cost (clamped to minimum of 0)
    const winterCost = Math.max(0, Math.ceil(baseCost * (1 - totalReduction)));
    gameState.resources.food -= winterCost;
    report.winterCost = winterCost;

    if (totalReduction > 0) {
      report.events.push(`❄️ Winter consumed ${winterCost} food (reduced from preparations).`);
    } else {
      report.events.push(`❄️ The cold of winter consumed ${winterCost} extra food.`);
    }
  }

  // Starvation check (now catches both normal deficit AND winter penalty)
  if (gameState.resources.food < 0) {
    const deficit = Math.abs(gameState.resources.food);
    processStarvation(deficit, report);
    gameState.resources.food = 0;
  }

  // Unit upkeep and effects
  processUnitUpkeep(report);

  // Birth system - fractional accumulator produces whole children
  processBirths(report);

  // Aging system - trigger on New Year (when NEXT season would be spring)
  const nextSeason = window.SEASONS[(gameState.season + 1) % 4];
  if (nextSeason === 'Spring') {
    processAging(report);
  }

  // Process pending events (delayed consequences)
  window.processPendingEvents();

  // Calculate cohesion system (includes Working Age effects)
  window.calculateCohesion();
  window.applyCohesionEffects();

  // Process external threats (movement and spawning)
  window.processThreats(report);
  window.checkThreatSpawning(report);

  // Process combat between units and threats
  window.processCombatPhase(report);

  // Check for events to trigger
  window.checkEventTriggers();

  // Check for governance transition completion
  if (gameState.governanceTransitionCompleted) {
    const modelName = window.GOVERNANCE_MODELS[gameState.governanceTransitionCompleted].name;
    const modelIcon = window.GOVERNANCE_MODELS[gameState.governanceTransitionCompleted].icon;
    report.events.push(`${modelIcon} Governance transition complete. Your society has fully adopted the ${modelName} system.`);
    trackGovernanceChange(); // Track for victory scoring
    delete gameState.governanceTransitionCompleted; // Clear the flag
  }

  // Seasonal flavor for the COMING season
  if (nextSeason === 'Winter') {
    report.events.push('❄️ Winter approaches — prepare your food stores.');
  } else if (nextSeason === 'Spring') {
    report.events.push('🌱 The days grow longer. Spring is coming.');
  } else if (nextSeason === 'Summer') {
    report.events.push('☀️ The warmth of summer beckons.');
  } else if (nextSeason === 'Autumn') {
    report.events.push('🍂 Autumn nears. Time to harvest and prepare.');
  }

  // Ensure workers never exceed population (after any pop changes)
  window.clampWorkers();

  // Update labor tracking from actual worker assignments
  const labInc = window.calculateIncome();
  gameState.population.employed = labInc.laborUsed;
  gameState.population.idle = Math.max(0, gameState.population.total - labInc.laborUsed);

  report.netFood = inc.netFood;
  report.netMat = inc.netMat;
  gameState.lastTurnReport = report;

  // Check for victory conditions at target turn
  checkVictoryConditions();

  return report;
}

// ---- POPULATION AND RESOURCE PROCESSING ----

function processUnitUpkeep(report) {
  let totalFoodCost = 0;
  const unitsLost = [];

  for (const unit of gameState.units) {
    const unitType = window.UNIT_TYPES[unit.type];

    // Calculate upkeep cost
    if (unitType.upkeep.food) {
      totalFoodCost += unitType.upkeep.food;
    }

    // Apply special unit effects
    if (unit.type === 'elder' && unit.health >= 50) {
      // Elders generate identity while healthy
      gameState.cohesion.identity = Math.min(100, gameState.cohesion.identity + 0.5);
    }
  }

  // Pay upkeep costs
  if (totalFoodCost > 0) {
    if (gameState.resources.food >= totalFoodCost) {
      gameState.resources.food -= totalFoodCost;
      report.events.push(`🍖 Units consumed ${totalFoodCost} food for upkeep.`);
    } else {
      // Not enough food - units suffer
      const shortage = totalFoodCost - gameState.resources.food;
      gameState.resources.food = 0;

      // Randomly affect units based on shortage
      const unitsToAffect = Math.min(shortage, gameState.units.length);
      for (let i = 0; i < unitsToAffect; i++) {
        const randomUnit = gameState.units[Math.floor(Math.random() * gameState.units.length)];
        randomUnit.health = Math.max(0, randomUnit.health - 20);

        if (randomUnit.health <= 0) {
          unitsLost.push(randomUnit);
        }
      }

      report.events.push(`⚠️ Insufficient food for unit upkeep! ${shortage} food short.`);
    }
  }

  // Remove dead units
  for (const deadUnit of unitsLost) {
    const unitType = window.UNIT_TYPES[deadUnit.type];
    gameState.units = gameState.units.filter(u => u.id !== deadUnit.id);

    // Loss of elders is especially devastating to identity
    if (deadUnit.type === 'elder') {
      gameState.cohesion.identity = Math.max(0, gameState.cohesion.identity - 15);
      report.events.push(`💔 Elder ${unitType.icon} died from starvation - oral traditions lost!`);
    } else {
      report.events.push(`💀 ${unitType.name} ${unitType.icon} died from starvation.`);
    }
  }
}

function processBirths(report) {
  // Calculate births based on population and factors
  const totalPop = gameState.population.total;
  const baseRate = 0.15; // Base birth rate per turn

  // Apply cohesion modifier to birth rate
  const cohesionStatus = window.getCohesionStatus(gameState.cohesion.total);
  let cohesionModifier = 1.0;
  switch (cohesionStatus.level) {
    case 'United': cohesionModifier = 1.2; break;
    case 'Stable': cohesionModifier = 1.0; break;
    case 'Strained': cohesionModifier = 0.8; break;
    case 'Fractured': cohesionModifier = 0.6; break;
    case 'Collapse': cohesionModifier = 0.3; break;
  }

  // Reduced birth rate during starvation
  const starvationModifier = gameState.resources.food < 0 ? 0.5 : 1.0;

  const effectiveRate = baseRate * cohesionModifier * starvationModifier;
  const expectedBirths = totalPop * effectiveRate;

  // Add to fractional accumulator
  gameState.birthAccumulator = (gameState.birthAccumulator || 0) + expectedBirths;

  // Convert whole births
  const wholeBirths = Math.floor(gameState.birthAccumulator);
  gameState.birthAccumulator -= wholeBirths;

  if (wholeBirths > 0) {
    // Add new children to age 0 cohort
    const age0Cohort = gameState.childCohorts.find(c => c.age === 0);
    if (age0Cohort) {
      age0Cohort.count += wholeBirths;
    } else {
      gameState.childCohorts.push({ age: 0, count: wholeBirths });
    }

    report.events.push(`👶 ${wholeBirths} children were born this season.`);
    report.popChange += wholeBirths;
  }
}

function processAging(report) {
  // Age all child cohorts by 1 year
  for (const cohort of gameState.childCohorts) {
    cohort.age++;
  }

  // Check for graduation to adult workforce
  const workingAge = gameState.governance.policies.workingAge;
  for (let i = gameState.childCohorts.length - 1; i >= 0; i--) {
    const cohort = gameState.childCohorts[i];
    if (cohort.age >= workingAge) {
      // Graduate to adult population
      gameState.population.total += cohort.count;
      report.events.push(`🎓 ${cohort.count} children joined the workforce.`);
      report.popChange += cohort.count;

      // Remove from child cohorts
      gameState.childCohorts.splice(i, 1);
    }
  }
}

function processStarvation(deficit, report) {
  const starvePerFood = 2; // 2 people die per 1 food deficit
  let totalDeaths = Math.min(deficit * starvePerFood, gameState.population.total);

  // Protect sole survivor
  if (gameState.population.total - totalDeaths < 1) {
    totalDeaths = Math.max(0, gameState.population.total - 1);
  }

  // Children die first (youngest first)
  let remainingDeaths = totalDeaths;
  for (let i = 0; i < gameState.childCohorts.length && remainingDeaths > 0; i++) {
    const cohort = gameState.childCohorts[i];
    const childDeaths = Math.min(remainingDeaths, cohort.count);
    cohort.count -= childDeaths;
    remainingDeaths -= childDeaths;
  }

  // Remove empty cohorts
  gameState.childCohorts = gameState.childCohorts.filter(c => c.count > 0);

  // Then adults die
  if (remainingDeaths > 0) {
    gameState.population.total -= remainingDeaths;
  }

  if (totalDeaths > 0) {
    report.events.push(`☠️ ${totalDeaths} people died from starvation.`);
    report.popChange -= totalDeaths;
  }
}

// Victory system now handled by modular victoryDefeat.js
// Just call the modular victory system
function checkVictoryConditions() {
  if (window.checkVictoryConditions) {
    window.checkVictoryConditions();
  }
}

// Delegate to modular victory system
function trackGovernanceChange() {
  if (window.trackGovernanceChange) {
    window.trackGovernanceChange();
  }
}

// Export functions for module use
export {
  initTurnProcessing,
  processTurn,
  processUnitUpkeep,
  processBirths,
  processAging,
  processStarvation,
  checkVictoryConditions,
  trackGovernanceChange
};

// For browser compatibility, attach to window if available
if (typeof window !== 'undefined') {
  window.TurnProcessing = {
    initTurnProcessing,
    processTurn,
    processUnitUpkeep,
    processBirths,
    processAging,
    processStarvation,
    checkVictoryConditions,
    trackGovernanceChange
  };
}
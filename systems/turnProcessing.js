// Turn Processing System for Samhold
// Handles all turn-based game logic including population, resources, and victory conditions
// Extracted from main game file for modular architecture

// Global references that will be set by main game
let gameState = null;
let mapDirty = null;

// Initialize turn processing system
function initTurnProcessing(gameStateRef) {
  gameState = gameStateRef;
  setupTurnEventListeners();
}

function setupTurnEventListeners() {
  document.getElementById('summary-ok').addEventListener('click', () => {
    document.getElementById('turn-summary').classList.remove('visible');

    // Process events after turn summary is closed
    if (gameState.pendingEventCheck) {
      gameState.pendingEventCheck = false;
      setTimeout(() => {
        window.EventSystem.processActiveEvents();
      }, 50);
    }
  });

  document.getElementById('end-turn-btn').addEventListener('click', () => {
    if (gameState.gameEnded) return;
    if (window.isAnyOverlayOpen()) return;

    const report = processTurn();

    // Capture current season/year for summary BEFORE advancing
    const summarySeasonName = window.SEASONS[gameState.season];
    const summaryYear = gameState.year;

    gameState.turn++;
    gameState.season = (gameState.season + 1) % 4;
    if (gameState.season === 0) gameState.year++;

    window.resetUnitMovement();
    // Recompute fog of war at turn start
    if (window.recomputeVisibility) window.recomputeVisibility();
    window.updateTurnDisplay();
    window.updateAllUI();

    if (gameState.selectedHex) window.updateSidePanel(gameState.selectedHex);
    if (window.render) window.render();
    window.showTurnSummary(report, summarySeasonName, summaryYear);

    // Show tutorial hints for early turns
    if (gameState.turn <= 15) {
      setTimeout(() => window.showTutorialHint(), 1500);
    }

    gameState.pendingEventCheck = true;
  });
}

// ---- CORE TURN PROCESSING ----

function processTurn() {
  const report = { events: [], foodIncome: 0, matIncome: 0, matUpkeep: 0, foodConsumed: 0, buildingsCompleted: [], winterCost: 0, constructionWorkers: 0, childBirths: 0, graduated: 0, adultDeaths: 0, childDeaths: 0 };
  const inc = window.calculateIncome();

  report.foodIncome = inc.foodIncome;
  report.matIncome = inc.matIncome;
  report.matUpkeep = inc.matUpkeep;
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
          const bDef = window.BUILDINGS[hex.building];
          report.buildingsCompleted.push({ name: bDef.name, col: c, row: r });
          report.events.push(`${bDef.icon} ${bDef.name} completed at (${c},${r}).`);

          // Monument: apply permanent Identity bonus, set lifecycle state, free construction workers
          if (hex.building === 'monument' && bDef.permanentIdentityBonus) {
            gameState.cohesion.identity = Math.min(100, gameState.cohesion.identity + bDef.permanentIdentityBonus);
            hex.monumentState = 'active';
            hex.lastStewardTurn = gameState.turn;
            hex.neglectTurns = 0;
            hex.completedTurn = gameState.turn;
            report.events.push(`🗿 Monument completed! Identity +${bDef.permanentIdentityBonus} (permanent).`);
            if (window.addChronicleEntry) {
              const subject = hex.monumentSubject || 'our history';
              window.addChronicleEntry(`A monument commemorating ${subject} was completed. The people feel a stronger sense of identity.`, 'cultural');
            }
            // Free construction workers — monument needs no staff
            gameState.population.employed -= hex.workers;
            gameState.population.idle += hex.workers;
            hex.workers = 0;
          }
          // Other buildings: workers stay assigned — now they work the completed building
        }
      }
    }
  }

  // Advance unit training
  for (let i = gameState.unitsInTraining.length - 1; i >= 0; i--) {
    const trainingUnit = gameState.unitsInTraining[i];
    trainingUnit.trainingProgress--;

    if (trainingUnit.trainingProgress <= 0) {
      // Training completed — population was already claimed by startUnitTraining,
      // so build the unit directly without going through createUnit (which would double-deduct).
      const unitType = window.UNIT_TYPES[trainingUnit.type];
      const unit = {
        id: gameState.nextUnitId++,
        type: trainingUnit.type,
        col: trainingUnit.col,
        row: trainingUnit.row,
        movementLeft: unitType.movement,
        health: 100,
        experience: 0,
        orders: null,
        lastDamage: 0,
        activeAction: null
      };
      gameState.units.push(unit);
      report.events.push(`${unitType.icon} ${unitType.name} training completed at (${trainingUnit.col},${trainingUnit.row}).`);

      // Remove from training queue
      gameState.unitsInTraining.splice(i, 1);
      if (window.setMapDirty) window.setMapDirty(true);
    }
  }

  // Apply food income and material income
  gameState.resources.food += inc.foodIncome;
  gameState.resources.materials += inc.netMat;
  if (gameState.resources.materials < 0) gameState.resources.materials = 0;

  // Winter penalty — applied before food consumption
  if (window.SEASONS[gameState.season] === 'Winter') {
    let baseCost = Math.ceil(gameState.population.total * 0.5);

    // Apply event-based winter food reduction modifiers
    let totalReduction = 0;
    for (const activeEvent of gameState.activeEvents || []) {
      if (activeEvent.winterEffects && activeEvent.winterEffects.winterFoodReduction) {
        totalReduction += activeEvent.winterEffects.winterFoodReduction;
      }
    }

    const winterCost = Math.max(0, Math.ceil(baseCost * (1 - totalReduction)));
    gameState.resources.food -= winterCost;
    report.winterCost = winterCost;

    if (totalReduction > 0) {
      report.events.push(`❄️ Winter consumed ${winterCost} food (reduced from preparations).`);
    } else {
      report.events.push(`❄️ The cold of winter consumed ${winterCost} extra food.`);
    }
  }

  // Priority-ordered food consumption
  const rationPriority = gameState.governance?.policies?.rationPriority ?? 'people';

  if (rationPriority === 'military') {
    // Units eat first, then population absorbs any remaining shortfall
    processUnitUpkeep(report);
    gameState.resources.food -= inc.popFoodConsumed;
    if (gameState.resources.food < 0) {
      processStarvation(Math.abs(gameState.resources.food), report);
      gameState.resources.food = 0;
    }
  } else if (rationPriority === 'equal') {
    // Proportional cuts — compare total available (stockpile + income - winter) to total needed
    const totalNeeded = inc.popFoodConsumed + inc.unitFoodUpkeep;
    const totalAvailable = gameState.resources.food; // already stockpile + income - winterCost
    if (totalAvailable >= totalNeeded) {
      // Enough for everyone
      gameState.resources.food -= totalNeeded;
    } else {
      // Shortage — split proportionally between population and units
      const shortage = totalNeeded - totalAvailable;
      gameState.resources.food = 0;
      if (totalNeeded > 0) {
        const popShortage = Math.round((inc.popFoodConsumed / totalNeeded) * shortage);
        const unitShortage = shortage - popShortage;
        if (popShortage > 0) processStarvation(popShortage, report);
        if (unitShortage > 0) processUnitStarvation(unitShortage, report);
      }
    }
  } else {
    // People first (default) — population eats, then units take from what remains
    gameState.resources.food -= inc.popFoodConsumed;
    if (gameState.resources.food < 0) {
      processStarvation(Math.abs(gameState.resources.food), report);
      gameState.resources.food = 0;
    }
    processUnitUpkeep(report);
  }

  // Birth system - fractional accumulator produces whole children
  processBirths(report);

  // Aging system - trigger on New Year (when NEXT season would be spring)
  const nextSeason = window.SEASONS[(gameState.season + 1) % 4];
  if (nextSeason === 'Spring') {
    processAging(report);
  }

  // Elder bonuses (every turn, not just New Year)
  processElderBonuses(report);

  // Process pending events (delayed consequences)
  window.processPendingEvents();

  // Process traditions (fire due traditions, pay costs, apply cohesion bonuses)
  if (window.processTraditions) window.processTraditions(report);

  // Process oral tradition (storytellers compose/lose stories)
  if (window.processStories) window.processStories(report);

  // Process society buildings (sacred sites, shrines, meeting halls — cohesion yields)
  if (window.processSocietyBuildings) window.processSocietyBuildings(report);
  else if (window.processSacredPlaces) window.processSacredPlaces(report);

  // Process named regions (strength accumulation, expansion, decay)
  if (window.processRegions) window.processRegions(report);

  // Process fortification construction
  if (window.processFortificationConstruction) window.processFortificationConstruction();

  // Process policy lag (advance in-progress policy changes, update effective values)
  if (window.processPolicyLag) window.processPolicyLag(report);

  // Process resistance (pressure generation, faction effects, promise checks)
  if (window.processResistance) window.processResistance(report);

  // Process crime (theft, violence, transgression — reads trust, feeds into resistance)
  if (window.processCrime) window.processCrime(report);

  // Process immigration (pipeline advancement, parallel society, cohort drain)
  if (window.processImmigration) window.processImmigration(report);

  // Process governance model-specific effects (monarchy succession, military decay, democracy votes)
  if (window.processGovernanceTurn) window.processGovernanceTurn(report);

  // Process shared values (crystallization, violation, bonuses)
  if (window.processValues) window.processValues(report);

  // Process class system (differential effects, privileged class recalc, temporary effects)
  if (window.processClassSystem) window.processClassSystem(report);

  // Calculate cohesion system (includes Working Age effects)
  window.calculateCohesion();
  window.applyCohesionEffects();

  // Process trust system (drifts trust toward baselines after cohesion update)
  if (window.processTrust) window.processTrust();

  // DEBUG: log food and satisfaction state after turn processing
  {
    const inc = window.calculateIncome();
    const projSatisfaction = window.previewCohesionDeltas ? window.previewCohesionDeltas() : null;
    const projFood = gameState.resources.food + inc.netFood;
    console.log(
      `[Turn ${gameState.turn}] Food: ${gameState.resources.food} (projected next: ${projFood}, Δ: ${inc.netFood > 0 ? '+' : ''}${inc.netFood})` +
      ` | Satisfaction: ${gameState.cohesion.satisfaction}` +
      (projSatisfaction ? ` (projected Δ: ${projSatisfaction.satisfaction > 0 ? '+' : ''}${Math.round(projSatisfaction.satisfaction)})` : '')
    );
  }

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
  const storytellers = gameState.culture?.storytellers ?? 0;
  gameState.population.employed = labInc.laborUsed + storytellers;
  gameState.population.idle = Math.max(0, gameState.population.total - labInc.laborUsed - storytellers);

  report.netFood = inc.netFood;
  report.netMat = inc.netMat;
  gameState.lastTurnReport = report;

  // Record notable events in the Chronicle
  if (window.recordTurnInChronicle) window.recordTurnInChronicle(report);

  // Check for victory conditions at target turn
  checkVictoryConditions();

  return report;
}

// ---- POPULATION AND RESOURCE PROCESSING ----

function processUnitUpkeep(report) {
  let totalFoodCost = 0;

  const foodPerPop = (window.FOOD_PER_POP != null) ? window.FOOD_PER_POP : 2;

  for (const unit of gameState.units) {
    const unitType = window.UNIT_TYPES[unit.type];

    // Charge population food share + unit-specific upkeep (population share moved here from
    // popFoodConsumed so that priority ordering correctly separates civilian from military food)
    totalFoodCost += (unitType.cost.population || 0) * foodPerPop + (unitType.upkeep.food || 0);

    // Apply special unit effects
    if (unit.type === 'elder' && unit.health >= 50) {
      // Elders generate identity while healthy
      gameState.cohesion.identity = Math.min(100, gameState.cohesion.identity + 0.5);
    }
  }

  // Pay upkeep costs
  let hadShortage = false;
  if (totalFoodCost > 0) {
    if (gameState.resources.food >= totalFoodCost) {
      gameState.resources.food -= totalFoodCost;
      report.events.push(`🍖 Units consumed ${totalFoodCost} food for upkeep.`);
    } else {
      hadShortage = true;
      const shortage = totalFoodCost - gameState.resources.food;
      gameState.resources.food = 0;

      // Units go hungry — lose combat effectiveness (HP)
      for (const unit of gameState.units) {
        unit.health = Math.max(0, unit.health - 10);
      }

      report.events.push(`⚠️ Insufficient food for unit upkeep! ${shortage} food short. Units are weakened.`);
    }
  }

  // Units that reached 0 HP from sustained hunger die
  const starvedUnits = gameState.units.filter(u => u.health <= 0);
  for (const unit of starvedUnits) {
    const unitType = window.UNIT_TYPES[unit.type];
    gameState.units = gameState.units.filter(u => u.id !== unit.id);
    gameState.population.employed -= unitType.cost.population;
    gameState.population.total -= unitType.cost.population;
    report.events.push(`💀 ${unitType.icon} ${unitType.name} starved to death.`);
  }

  // Passive healing — only when food was sufficient this turn
  if (!hadShortage) {
    for (const unit of gameState.units) {
      if (unit.health < 100) {
        const inTerritory = window.isInTerritory && window.isInTerritory(unit.col, unit.row);
        const healAmount = inTerritory ? 15 : 5;
        unit.health = Math.min(100, unit.health + healAmount);
      }
    }
  }
}

// Apply starvation damage to units proportional to a given food deficit (used in equal-rations mode)
function processUnitStarvation(deficit, report) {
  if (deficit <= 0 || gameState.units.length === 0) return;
  const unitsLost = [];
  const unitsToAffect = Math.min(Math.ceil(deficit), gameState.units.length);
  for (let i = 0; i < unitsToAffect; i++) {
    const randomUnit = gameState.units[Math.floor(Math.random() * gameState.units.length)];
    randomUnit.health = Math.max(0, randomUnit.health - 20);
    if (randomUnit.health <= 0 && !unitsLost.includes(randomUnit)) unitsLost.push(randomUnit);
  }
  report.events.push(`⚠️ Units suffered from shared food shortage (${deficit} food short).`);
  for (const deadUnit of unitsLost) {
    const unitType = window.UNIT_TYPES[deadUnit.type];
    gameState.units = gameState.units.filter(u => u.id !== deadUnit.id);
    gameState.population.employed -= unitType.cost.population;
    gameState.population.total -= unitType.cost.population;
    report.events.push(`💀 ${unitType.name} ${unitType.icon} died from starvation.`);
  }
}

function processBirths(report) {
  // Calculate births based on fertile-age adults (exclude elders)
  const totalPop = gameState.population.total - (gameState.population.elders || 0);
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
    report.childBirths += wholeBirths;
  }
}

function processAging(report) {
  const ELDER_AGE = window.ELDER_AGE || 50;
  const MAX_AGE = window.MAX_AGE || 80;
  const DEATH_RATE = window.NATURAL_DEATH_BASE_RATE || 0.02;

  // 1. Age all child cohorts by 1 year
  for (const cohort of gameState.childCohorts) {
    cohort.age++;
  }

  // 2. Graduate children to adult cohorts
  const workingAge = window.WORKING_AGE;
  for (let i = gameState.childCohorts.length - 1; i >= 0; i--) {
    const cohort = gameState.childCohorts[i];
    if (cohort.age >= workingAge) {
      // Add to adult cohorts
      addToAdultCohort(workingAge, cohort.count);
      gameState.population.total += cohort.count;
      gameState.population.idle += cohort.count;
      report.events.push(`🎓 ${cohort.count} children joined the workforce.`);
      report.graduated += cohort.count;

      if (window.processTraditionTrigger) window.processTraditionTrigger('graduation', report);
      gameState.childCohorts.splice(i, 1);
    }
  }

  // 3. Age all adult cohorts by 1 year
  for (const cohort of gameState.adultCohorts) {
    cohort.age++;
  }

  // 4. Natural deaths for elders
  let elderDeaths = 0;
  for (const cohort of gameState.adultCohorts) {
    if (cohort.age < ELDER_AGE) continue;
    if (cohort.count <= 0) continue;

    if (cohort.age >= MAX_AGE) {
      // All die at max age
      elderDeaths += cohort.count;
      cohort.count = 0;
      continue;
    }

    // Increasing probability: 2% per year past elder age
    const deathChance = DEATH_RATE * (cohort.age - ELDER_AGE + 1);
    const expected = cohort.count * deathChance;
    const deaths = Math.floor(expected) + (Math.random() < (expected - Math.floor(expected)) ? 1 : 0);
    const actualDeaths = Math.min(deaths, cohort.count);
    if (actualDeaths > 0) {
      cohort.count -= actualDeaths;
      elderDeaths += actualDeaths;
    }
  }

  // Remove empty adult cohorts
  gameState.adultCohorts = gameState.adultCohorts.filter(c => c.count > 0);

  // Apply elder deaths to population
  if (elderDeaths > 0) {
    gameState.population.total -= elderDeaths;
    gameState.population.idle = Math.max(0, gameState.population.idle - elderDeaths);
    report.elderDeaths = (report.elderDeaths || 0) + elderDeaths;
    report.events.push(`👴 ${elderDeaths} elder${elderDeaths !== 1 ? 's' : ''} passed away of old age.`);

    if (gameState.culture) gameState.culture.deathsOccurred = true;
    if (window.addChronicleEntry) {
      window.addChronicleEntry(
        `${elderDeaths} elder${elderDeaths !== 1 ? 's' : ''} passed away, taking their wisdom with them.`,
        'death'
      );
    }
  }

  // 5. Recompute elder count
  recomputeElderCount();
}

function addToAdultCohort(age, count) {
  if (!gameState.adultCohorts) gameState.adultCohorts = [];
  const existing = gameState.adultCohorts.find(c => c.age === age);
  if (existing) {
    existing.count += count;
  } else {
    gameState.adultCohorts.push({ age, count });
  }
}

function recomputeElderCount() {
  const ELDER_AGE = window.ELDER_AGE || 50;
  gameState.population.elders = (gameState.adultCohorts || [])
    .filter(c => c.age >= ELDER_AGE)
    .reduce((sum, c) => sum + c.count, 0);
}

function processElderBonuses(report) {
  const elders = gameState.population.elders || 0;
  if (elders <= 0) return;

  const legBonus = elders * (window.ELDER_LEGITIMACY_BONUS || 0.08);
  const idBonus = elders * (window.ELDER_IDENTITY_BONUS || 0.05);
  const knowBonus = elders * (window.ELDER_KNOWLEDGE_PER_TURN || 0.3);

  gameState.cohesion.legitimacy = Math.min(100, gameState.cohesion.legitimacy + legBonus);
  gameState.cohesion.identity = Math.min(100, gameState.cohesion.identity + idBonus);
  gameState.resources.knowledge = (gameState.resources.knowledge || 0) + knowBonus;
}

function processStarvation(deficit, report) {
  const starvePerFood = 2; // 2 people die per 1 food deficit
  let totalDeaths = Math.min(deficit * starvePerFood, gameState.population.total);

  // Track deaths for tradition unlocks
  if (totalDeaths > 0 && gameState.culture) gameState.culture.deathsOccurred = true;

  // Protect sole survivor
  if (gameState.population.total - totalDeaths < 1) {
    totalDeaths = Math.max(0, gameState.population.total - 1);
  }

  // Children die first (youngest first)
  let remainingDeaths = totalDeaths;
  const sortedByAge = [...gameState.childCohorts].sort((a, b) => a.age - b.age);
  for (const cohort of sortedByAge) {
    if (remainingDeaths <= 0) break;
    const childDeaths = Math.min(remainingDeaths, cohort.count);
    cohort.count -= childDeaths;
    report.childDeaths += childDeaths;
    remainingDeaths -= childDeaths;
    if (childDeaths > 0) {
      report.events.push(`☠️ ${childDeaths} children (age ${cohort.age}) died from starvation.`);
    }
  }
  gameState.childCohorts = gameState.childCohorts.filter(c => c.count > 0);

  // Elders die next (oldest first)
  if (remainingDeaths > 0) {
    const ELDER_AGE = window.ELDER_AGE || 50;
    const elderCohorts = (gameState.adultCohorts || [])
      .filter(c => c.age >= ELDER_AGE && c.count > 0)
      .sort((a, b) => b.age - a.age); // oldest first

    let elderStarvationDeaths = 0;
    for (const cohort of elderCohorts) {
      if (remainingDeaths <= 0) break;
      const deaths = Math.min(remainingDeaths, cohort.count);
      cohort.count -= deaths;
      elderStarvationDeaths += deaths;
      remainingDeaths -= deaths;
    }
    if (elderStarvationDeaths > 0) {
      gameState.population.total -= elderStarvationDeaths;
      gameState.population.idle = Math.max(0, gameState.population.idle - elderStarvationDeaths);
      report.elderDeaths = (report.elderDeaths || 0) + elderStarvationDeaths;
      report.events.push(`☠️ ${elderStarvationDeaths} elder${elderStarvationDeaths !== 1 ? 's' : ''} died from starvation.`);
    }
    gameState.adultCohorts = gameState.adultCohorts.filter(c => c.count > 0);
  }

  // Then working adults die — idle workers first, then employed
  if (remainingDeaths > 0) {
    const idleDeaths = Math.min(remainingDeaths, gameState.population.idle);
    const employedDeaths = remainingDeaths - idleDeaths;

    // Remove from adult cohorts (youngest working adults first)
    removeFromAdultCohorts(remainingDeaths);

    gameState.population.total -= remainingDeaths;
    gameState.population.idle = Math.max(0, gameState.population.idle - remainingDeaths);
    report.adultDeaths += remainingDeaths;
    report.events.push(`☠️ ${remainingDeaths} adults died from starvation.`);

    // When deaths fall on employed workers, units share the same per-capita risk
    if (employedDeaths > 0 && gameState.units.length > 0 && gameState.population.employed > 0) {
      const deathRate = employedDeaths / gameState.population.employed;
      for (const unit of [...gameState.units]) {
        if (Math.random() < deathRate) {
          const unitType = window.UNIT_TYPES[unit.type];
          const idx = gameState.units.indexOf(unit);
          if (idx >= 0) {
            gameState.units.splice(idx, 1);
            gameState.population.employed -= unitType.cost.population;
          }
          report.events.push(`💀 ${unitType.icon} ${unitType.name} died from starvation.`);
          if (window.addChronicleEntry) window.addChronicleEntry(`A ${unitType.name} perished in the famine.`, 'death');
        }
      }
    }
  }

  // Pipeline immigrants die last (outside core population)
  if (remainingDeaths > 0 && window.applyImmigrantStarvation) {
    const immigrantDeaths = window.applyImmigrantStarvation(remainingDeaths);
    if (immigrantDeaths > 0) {
      remainingDeaths -= immigrantDeaths;
      report.events.push(`☠️ ${immigrantDeaths} immigrant${immigrantDeaths !== 1 ? 's' : ''} in the pipeline died from starvation.`);
    }
  }

  recomputeElderCount();

  // Ensure storytellers don't exceed remaining population
  if (window.clampStorytellers) window.clampStorytellers();
}

function removeFromAdultCohorts(count) {
  // Remove from youngest working-age adults first (elders already handled)
  const ELDER_AGE = window.ELDER_AGE || 50;
  const sorted = (gameState.adultCohorts || [])
    .filter(c => c.age < ELDER_AGE && c.count > 0)
    .sort((a, b) => a.age - b.age);

  let remaining = count;
  for (const cohort of sorted) {
    if (remaining <= 0) break;
    const deaths = Math.min(remaining, cohort.count);
    cohort.count -= deaths;
    remaining -= deaths;
  }
  // If still remaining (shouldn't happen), take from any cohort
  if (remaining > 0) {
    for (const cohort of gameState.adultCohorts) {
      if (remaining <= 0) break;
      const deaths = Math.min(remaining, cohort.count);
      cohort.count -= deaths;
      remaining -= deaths;
    }
  }
  gameState.adultCohorts = gameState.adultCohorts.filter(c => c.count > 0);
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
  processUnitStarvation,
  processBirths,
  processAging,
  processStarvation,
  processElderBonuses,
  addToAdultCohort,
  removeFromAdultCohorts,
  recomputeElderCount,
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
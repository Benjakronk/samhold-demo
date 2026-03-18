// ---- IMMIGRATION SYSTEM ----
// Four-stage integration pipeline (Arrival → Resident → Participant → Integrated)
// driven by border/cultural/progressiveness policy sliders.
// Parallel society crystallizes when unintegrated cohorts exceed 18% of population.
// Trust gates pipeline advancement; hostile faction raises thresholds.

let gameState = null;

// ---- CONSTANTS ----

// Cohort definitions
const COHORTS = [
  { id: 0, label: 'Arrivals',     workforceRate: 0.40, cohesionDrag: 1.8 },
  { id: 1, label: 'Residents',    workforceRate: 0.70, cohesionDrag: 0.9 },
  { id: 2, label: 'Participants', workforceRate: 0.90, cohesionDrag: 0.3 },
  { id: 3, label: 'Integrated',   workforceRate: 1.00, cohesionDrag: 0.0 },
];

// Base advancement rates per cohort stage (0→1, 1→2, 2→3)
const BASE_ADVANCEMENT_RATES = [0.30, 0.15, 0.07];

// Trust thresholds for pipeline advancement
const TRUST_GATES = {
  arrivalToResident:     { institutional: 0.40 },   // 0→1
  residentToParticipant: { interpersonal: 0.40 },   // 1→2
  participantToIntegrated: { institutional: 0.35, interpersonal: 0.35 }, // 2→3
};

// Parallel society
const PS_CRYSTALLIZATION_THRESHOLD = 0.18; // ratio of Cohort 0+1 to total pop
const PS_DECAY_RATE = 0.03;

// Minimum turn before immigration begins
const IMMIGRATION_START_TURN = 12;

// ---- INIT ----

export function initImmigration(gameStateRef) {
  gameState = gameStateRef;

  if (!gameState.immigration) {
    gameState.immigration = {
      cohorts: [0, 0, 0, 0],    // [Arrival, Resident, Participant, Integrated]
      parallelSociety: {
        strength: 0,
        population: 0,
        childCohorts: [],        // [{age, count}] born inside PS
      },
      pressure: 0,               // calculated each turn
      lastArrivals: 0,           // for UI display
      lifetimeArrivals: 0,
      lifetimeIntegrated: 0,
      interventionActive: null,  // null | 'integration' | 'coercive' | 'containment' | 'expulsion'
      interventionTurns: 0,      // turns active
      crystallizationEvents: {}, // PSS threshold → true (fired once)
    };
  }
}

// ---- PER-TURN PROCESSING ----

export function processImmigration(report) {
  if (!gameState?.immigration) return;
  if (gameState.turn < IMMIGRATION_START_TURN) return;

  const imm = gameState.immigration;

  // 1. Calculate immigrant pressure
  imm.pressure = calculateImmigrantPressure();

  // 2. Apply border policy to get actual arrivals (derived from isolation slider: high isolation = closed borders)
  const isolation = gameState.governance?.policies?.isolation ?? 50;
  const borderOpenness = 100 - isolation;
  const arrivals = getActualArrivals(imm.pressure, borderOpenness);
  imm.lastArrivals = arrivals;

  // 3. Add arrivals to Cohort 0
  if (arrivals > 0) {
    imm.cohorts[0] += arrivals;
    imm.lifetimeArrivals += arrivals;
    if (arrivals >= 3) {
      if (report) report.events.push(`🚶 ${arrivals} immigrants arrived seeking a new life.`);
    }
  }

  // 4. Process pipeline advancement (0→1→2→3)
  processPipelineAdvancement(report);

  // 5. Transfer Cohort 3 graduates into general population
  const graduated = imm.cohorts[3];
  if (graduated > 0) {
    gameState.population.total += graduated;
    gameState.population.idle += graduated;
    imm.lifetimeIntegrated += graduated;
    imm.cohorts[3] = 0;
    if (graduated >= 2 && report) {
      report.events.push(`🤝 ${graduated} immigrants have fully integrated into the community.`);
    }
  }

  // 6. Update parallel society
  updateParallelSociety(report);

  // 7. Process PS internal births (on New Year, like normal births)
  const nextSeason = window.SEASONS[(gameState.season + 1) % 4];
  if (nextSeason === 'Spring' && imm.parallelSociety.population > 0) {
    processPSBirths();
    // Age PS children
    for (const cohort of imm.parallelSociety.childCohorts) {
      cohort.age++;
    }
    // PS children reaching working age join PS population (not main population)
    const workingAge = window.WORKING_AGE;
    for (let i = imm.parallelSociety.childCohorts.length - 1; i >= 0; i--) {
      const cohort = imm.parallelSociety.childCohorts[i];
      if (cohort.age >= workingAge) {
        imm.parallelSociety.population += cohort.count;
        imm.parallelSociety.childCohorts.splice(i, 1);
      }
    }
  }

  // 8. Apply PS effects
  applyParallelSocietyEffects();

  // 9. Apply cohort cohesion drain
  applyCohortCohesionDrain();

  // 10. Process active intervention
  if (imm.interventionActive) {
    processIntervention(report);
  }

  // 11. Check crystallization threshold events
  checkCrystallizationEvents(report);
}

// ---- IMMIGRATION PRESSURE ----

function calculateImmigrantPressure() {
  const foodPerPop = window.FOOD_PER_POP || 2;
  const foodNeeded = gameState.population.total * foodPerPop;
  const foodSurplus = gameState.resources.food - foodNeeded * 3; // surplus beyond 3 turns of reserves

  let pressure = 0;

  // Stability signals
  pressure += Math.max(0, foodSurplus / 10);
  pressure += (gameState.cohesion?.total ?? 50) * 0.15;

  // Recent starvation suppresses arrivals
  const lastReport = gameState.lastTurnReport;
  if (lastReport && (lastReport.adultDeaths > 0 || lastReport.childDeaths > 0)) {
    pressure -= 8;
  }

  // Population-based scaling (smaller communities attract less)
  if (gameState.population.total < 30) pressure *= 0.5;
  else if (gameState.population.total < 50) pressure *= 0.75;

  // Self-reinforcing: strong parallel society generates its own pull
  const ps = gameState.immigration.parallelSociety;
  if (ps.strength > 0.5) {
    pressure += Math.floor(ps.strength * 20);
  }

  // Crime suppresses immigration
  const crime = gameState.crime;
  if (crime && crime.overallSeverity > 10) {
    pressure -= crime.overallSeverity * 0.5;
  }

  return Math.max(0, Math.round(pressure));
}

function getActualArrivals(pressure, borderOpenness) {
  if (pressure <= 0) return 0;
  if (borderOpenness <= 20) return 0;
  if (borderOpenness <= 50) return Math.floor(pressure * 0.25);
  if (borderOpenness <= 80) return Math.floor(pressure * 0.70);
  return pressure;
}

// ---- PIPELINE ADVANCEMENT ----

function processPipelineAdvancement(report) {
  const imm = gameState.immigration;
  const trust = gameState.trust || {};
  const culturalOpenness = gameState.governance?.policies?.culturalOpenness ?? 50;
  const progressiveness = gameState.governance?.policies?.progressiveness ?? 50;

  // Hostile/Radical faction raises trust thresholds
  const faction = gameState.resistance?.faction;
  const trustPenalty = faction?.active
    ? (faction.disposition === 'radical' ? 0.20 : faction.disposition === 'hostile' ? 0.10 : 0)
    : 0;

  // Organized crime stalls pipeline
  const crimeStall = gameState.crime?.organizedPredation ? 0.5 : 1.0;

  // Process advancement from stage 2→3, then 1→2, then 0→1 (reverse to avoid double-counting)
  for (let stage = 2; stage >= 0; stage--) {
    if (imm.cohorts[stage] <= 0) continue;

    // Check trust gates
    if (!checkTrustGate(stage, trust, trustPenalty)) continue;

    // Calculate advancement rate
    let rate = BASE_ADVANCEMENT_RATES[stage];

    // Cultural openness: acceptance removes urgency to adapt
    rate -= (culturalOpenness / 100) * 0.10;

    // Progressiveness: active institutions pull people in (offset by tolerance)
    const integrationEffort = (progressiveness / 100) * 0.12;
    const toleranceOffset = (culturalOpenness / 100) * 0.06;
    rate += integrationEffort - toleranceOffset;

    // Cohesive society pulls newcomers in
    rate += ((gameState.cohesion?.total ?? 50) / 100) * 0.08;

    // Parallel society slows integration
    rate -= imm.parallelSociety.strength * 0.15;

    // Crime stall
    rate *= crimeStall;

    // Class system raises integration threshold (social differential, religious basis)
    const classThreshold = window.getIntegrationThresholdModifier ? window.getIntegrationThresholdModifier() : 0;
    rate -= classThreshold;

    rate = Math.max(0.01, Math.min(0.5, rate));

    // Advance a portion of the cohort
    const advancing = Math.max(1, Math.floor(imm.cohorts[stage] * rate));
    const actualAdvancing = Math.min(advancing, imm.cohorts[stage]);
    imm.cohorts[stage] -= actualAdvancing;
    imm.cohorts[stage + 1] += actualAdvancing;
  }
}

function checkTrustGate(stage, trust, penalty) {
  if (stage === 0) {
    // Arrival → Resident: institutional trust
    const threshold = TRUST_GATES.arrivalToResident.institutional + penalty;
    return (trust.institutional ?? 0.5) >= threshold;
  } else if (stage === 1) {
    // Resident → Participant: interpersonal trust
    const threshold = TRUST_GATES.residentToParticipant.interpersonal + penalty;
    return (trust.interpersonal ?? 0.5) >= threshold;
  } else if (stage === 2) {
    // Participant → Integrated: both
    const instThreshold = TRUST_GATES.participantToIntegrated.institutional + penalty;
    const interThreshold = TRUST_GATES.participantToIntegrated.interpersonal + penalty;
    return (trust.institutional ?? 0.5) >= instThreshold &&
           (trust.interpersonal ?? 0.5) >= interThreshold;
  }
  return true;
}

// ---- PARALLEL SOCIETY ----

function updateParallelSociety(report) {
  const imm = gameState.immigration;
  const ps = imm.parallelSociety;
  const totalPop = getTotalImmigrationPopulation();
  if (totalPop <= 0) return;

  const unintegrated = imm.cohorts[0] + imm.cohorts[1];
  const unintegratedRatio = unintegrated / totalPop;

  if (unintegratedRatio < PS_CRYSTALLIZATION_THRESHOLD && ps.strength > 0) {
    // Natural decay when pipeline pressure is low
    ps.strength = Math.max(0, ps.strength - PS_DECAY_RATE);
    return;
  }

  if (unintegratedRatio >= PS_CRYSTALLIZATION_THRESHOLD) {
    // Growth is quadratic and self-reinforcing
    const excess = unintegratedRatio - PS_CRYSTALLIZATION_THRESHOLD;
    const growthRate = excess * excess * 8;
    const amplifier = 1 + ps.strength * 2;
    ps.strength = Math.min(1.0, ps.strength + growthRate * amplifier * 0.01);
  }

  // Gravitational pull: strong PS diverts Arrivals
  if (ps.strength > 0 && imm.cohorts[0] > 0) {
    const gravitationalPull = ps.strength * 0.4;
    const diverted = Math.floor(imm.cohorts[0] * gravitationalPull);
    if (diverted > 0) {
      imm.cohorts[0] -= diverted;
      ps.population += diverted;
    }
  }
}

function applyParallelSocietyEffects() {
  const ps = gameState.immigration.parallelSociety;
  if (ps.strength <= 0) return;

  // Identity and Bonds drain — quadratic
  const identityDrain = ps.strength * ps.strength * 12;
  const bondsDrain = ps.strength * ps.strength * 9;
  gameState.cohesion.identity = Math.max(0, gameState.cohesion.identity - identityDrain);
  gameState.cohesion.bonds = Math.max(0, gameState.cohesion.bonds - bondsDrain);

  // Knowledge generation drain
  if (ps.strength > 0.3) {
    const knowledgeDrain = ps.strength * 0.3 * (gameState.resources.knowledge * 0.01);
    gameState.resources.knowledge = Math.max(0, gameState.resources.knowledge - knowledgeDrain);
  }
}

function processPSBirths() {
  const ps = gameState.immigration.parallelSociety;
  if (ps.population <= 0) return;

  const birthRate = 0.15 * 0.9; // slightly lower than host population
  const births = Math.floor(ps.population * birthRate);
  if (births <= 0) return;

  const age0 = ps.childCohorts.find(c => c.age === 0);
  if (age0) {
    age0.count += births;
  } else {
    ps.childCohorts.push({ age: 0, count: births });
  }
}

// ---- COHORT COHESION DRAIN ----

function applyCohortCohesionDrain() {
  const imm = gameState.immigration;
  const totalPop = getTotalImmigrationPopulation();
  if (totalPop <= 0) return;

  let identityDrain = 0;
  let bondsDrain = 0;

  for (let i = 0; i < 3; i++) {
    const cohortPop = imm.cohorts[i];
    if (cohortPop <= 0) continue;
    const ratio = cohortPop / totalPop;
    identityDrain += ratio * COHORTS[i].cohesionDrag * 8;
    bondsDrain += ratio * COHORTS[i].cohesionDrag * 5;
  }

  if (identityDrain > 0) {
    gameState.cohesion.identity = Math.max(0, gameState.cohesion.identity - identityDrain);
  }
  if (bondsDrain > 0) {
    gameState.cohesion.bonds = Math.max(0, gameState.cohesion.bonds - bondsDrain);
  }
}

// ---- INTERVENTIONS ----

export function startIntervention(type) {
  const imm = gameState.immigration;
  if (!imm) return false;
  const ps = imm.parallelSociety;

  if (type === 'expulsion') {
    // Immediate effect: remove all PS population
    const expelled = ps.population;
    const expelledChildren = ps.childCohorts.reduce((s, c) => s + c.count, 0);
    ps.population = 0;
    ps.childCohorts = [];
    ps.strength = Math.max(0, ps.strength - 0.5); // doesn't fully reset — trauma lingers

    // Catastrophic cohesion cost
    gameState.cohesion.satisfaction = Math.max(0, gameState.cohesion.satisfaction - 20);
    gameState.cohesion.bonds = Math.max(0, gameState.cohesion.bonds - 15);
    gameState.cohesion.legitimacy = Math.max(0, gameState.cohesion.legitimacy - 10);

    if (window.applyTrustDeviation) {
      window.applyTrustDeviation('interpersonal', -0.15);
      window.applyTrustDeviation('institutional', -0.10);
    }

    if (window.addChronicleEntry) {
      window.addChronicleEntry(
        `${expelled} adults and ${expelledChildren} children were expelled from the community. The act tore at the social fabric.`,
        'crisis'
      );
    }

    imm.interventionActive = null;
    return true;
  }

  // Other interventions are ongoing
  imm.interventionActive = type;
  imm.interventionTurns = 0;
  return true;
}

export function cancelIntervention() {
  if (!gameState?.immigration) return;
  gameState.immigration.interventionActive = null;
  gameState.immigration.interventionTurns = 0;
}

function processIntervention(report) {
  const imm = gameState.immigration;
  const ps = imm.parallelSociety;
  const type = imm.interventionActive;
  imm.interventionTurns++;

  const matCost = Math.ceil(gameState.population.total * 0.05);

  if (type === 'integration') {
    // Costs materials per turn
    if (gameState.resources.materials < matCost) {
      imm.interventionActive = null;
      if (report) report.events.push('📜 Integration programs collapsed due to lack of materials.');
      return;
    }
    gameState.resources.materials -= matCost;

    // Pull small % of PS back into pipeline (Cohort 2)
    const effectiveness = ps.strength <= 0.5 ? 0.08 : 0.03; // less effective at high PSS
    const reintegrated = Math.max(1, Math.floor(ps.population * effectiveness));
    if (reintegrated > 0 && ps.population > 0) {
      const actual = Math.min(reintegrated, ps.population);
      ps.population -= actual;
      imm.cohorts[2] += actual;
    }
    // PS satisfaction drops slightly
    gameState.cohesion.satisfaction = Math.max(0, gameState.cohesion.satisfaction - 0.5);

  } else if (type === 'coercive') {
    // Faster but harsher
    if (gameState.resources.materials < matCost) {
      imm.interventionActive = null;
      if (report) report.events.push('📜 Coercive assimilation ended due to lack of materials.');
      return;
    }
    gameState.resources.materials -= matCost;

    const reintegrated = Math.max(1, Math.floor(ps.population * 0.12));
    if (reintegrated > 0 && ps.population > 0) {
      const actual = Math.min(reintegrated, ps.population);
      ps.population -= actual;
      imm.cohorts[1] += actual; // Goes to Resident (not Participant — they resist)
    }
    // Heavy satisfaction penalty
    gameState.cohesion.satisfaction = Math.max(0, gameState.cohesion.satisfaction - 2);
    gameState.cohesion.bonds = Math.max(0, gameState.cohesion.bonds - 1);
    if (window.applyTrustDeviation) {
      window.applyTrustDeviation('interpersonal', -0.01);
    }

  } else if (type === 'containment') {
    // Reduces PS growth but doesn't resolve
    // No material cost, but satisfaction penalty
    gameState.cohesion.satisfaction = Math.max(0, gameState.cohesion.satisfaction - 1);
    // Slow PS strength decay
    ps.strength = Math.max(0, ps.strength - 0.005);
  }
}

// ---- CRYSTALLIZATION THRESHOLD EVENTS ----

function checkCrystallizationEvents(report) {
  const imm = gameState.immigration;
  const ps = imm.parallelSociety;
  const thresholds = [0.15, 0.30, 0.50, 0.70, 0.90];
  const messages = [
    'Distinct neighborhoods are forming. Some residents rarely venture into the wider community.',
    'A parallel market has emerged. Goods and labor move within the enclave before reaching common trade.',
    'The enclave has its own informal leaders. Your decrees reach them filtered, if at all.',
    'A generation has grown up knowing only the enclave. They do not think of themselves as yours.',
    'Two societies share your land. One answers to you. The other simply endures you.',
  ];

  for (let i = 0; i < thresholds.length; i++) {
    const key = thresholds[i].toString();
    if (ps.strength >= thresholds[i] && !imm.crystallizationEvents[key]) {
      imm.crystallizationEvents[key] = true;
      if (report) report.events.push(`🏘️ ${messages[i]}`);
      if (window.addChronicleEntry) {
        window.addChronicleEntry(messages[i], 'crisis');
      }
    }
  }
}

// ---- QUERY FUNCTIONS ----

export function getImmigrationState() {
  if (!gameState?.immigration) return null;
  const imm = gameState.immigration;
  const totalPop = getTotalImmigrationPopulation();

  return {
    cohorts: [...imm.cohorts],
    cohortLabels: COHORTS.map(c => c.label),
    cohortWorkforceRates: COHORTS.map(c => c.workforceRate),
    parallelSociety: {
      strength: imm.parallelSociety.strength,
      population: imm.parallelSociety.population,
      children: imm.parallelSociety.childCohorts.reduce((s, c) => s + c.count, 0),
    },
    pressure: imm.pressure,
    lastArrivals: imm.lastArrivals,
    lifetimeArrivals: imm.lifetimeArrivals,
    lifetimeIntegrated: imm.lifetimeIntegrated,
    interventionActive: imm.interventionActive,
    interventionTurns: imm.interventionTurns,
    totalUnintegrated: imm.cohorts[0] + imm.cohorts[1] + imm.cohorts[2],
    unintegratedRatio: totalPop > 0 ? (imm.cohorts[0] + imm.cohorts[1]) / totalPop : 0,
    pipelineTotal: imm.cohorts[0] + imm.cohorts[1] + imm.cohorts[2],
    crystallizationThreshold: PS_CRYSTALLIZATION_THRESHOLD,
  };
}

/**
 * Returns total immigrant workforce contribution (fractional adults).
 * Called by economy system to adjust effective labor.
 */
export function getImmigrantWorkforce() {
  if (!gameState?.immigration) return 0;
  const imm = gameState.immigration;
  let workforce = 0;

  // Pipeline cohorts contribute at their rate
  for (let i = 0; i < 3; i++) {
    workforce += imm.cohorts[i] * COHORTS[i].workforceRate;
  }

  // PS population contributes at reduced rate (50%)
  workforce += imm.parallelSociety.population * 0.50;

  return workforce;
}

/**
 * Returns the total food consumption of all immigrant populations.
 */
export function getImmigrantFoodConsumption() {
  if (!gameState?.immigration) return 0;
  const imm = gameState.immigration;
  const foodPerPop = window.FOOD_PER_POP || 2;
  const foodPerChild = window.FOOD_PER_CHILD || 1;

  // All cohort adults eat full food
  const cohortPop = imm.cohorts[0] + imm.cohorts[1] + imm.cohorts[2];
  // PS adults eat full food
  const psPop = imm.parallelSociety.population;
  // PS children eat child food
  const psChildren = imm.parallelSociety.childCohorts.reduce((s, c) => s + c.count, 0);

  return (cohortPop + psPop) * foodPerPop + psChildren * foodPerChild;
}

/**
 * Returns total population including all immigrant cohorts and PS.
 */
function getTotalImmigrationPopulation() {
  const basePop = gameState.population.total;
  const imm = gameState.immigration;
  const cohortPop = imm.cohorts[0] + imm.cohorts[1] + imm.cohorts[2]; // cohort 3 already in base pop
  const psPop = imm.parallelSociety.population;
  return basePop + cohortPop + psPop;
}

/**
 * Returns the loyal population (total minus PS) for hardship calculations.
 */
export function getLoyalPopulation() {
  if (!gameState?.immigration) return gameState?.population?.total ?? 0;
  return gameState.population.total; // base pop does not include PS
}

/**
 * Returns qualitative immigration climate text for Social Climate widget.
 */
export function getImmigrationClimateText() {
  if (!gameState?.immigration) return null;
  const imm = gameState.immigration;
  const ps = imm.parallelSociety;

  if (ps.strength >= 0.70) return { text: 'A parallel society dominates the community. Unity is fractured.', cls: 'danger' };
  if (ps.strength >= 0.50) return { text: 'An enclave has formed with its own leaders and economy.', cls: 'danger' };
  if (ps.strength >= 0.30) return { text: 'Unintegrated residents are clustering into separate communities.', cls: 'warning' };
  if (ps.strength >= 0.15) return { text: 'Distinct immigrant neighborhoods are forming.', cls: 'warning' };

  const pipelinePop = imm.cohorts[0] + imm.cohorts[1] + imm.cohorts[2];
  if (pipelinePop > 5) return { text: 'Newcomers are settling in. Integration is underway.', cls: '' };

  return null;
}

export { COHORTS };

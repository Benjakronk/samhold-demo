// ---- GOVERNANCE SYSTEM ----
// Manages governance models, policy changes, and their effects on society

// ---- NAME GENERATION ----

const DYNASTY_NAMES = ['Asen', 'Bjorn', 'Hild', 'Sigurd', 'Ragna', 'Thorin', 'Eira', 'Leif', 'Astrid', 'Halvar'];
const RULER_NAMES = ['Arne', 'Bjorg', 'Dag', 'Edda', 'Frey', 'Gudrun', 'Harald', 'Ingrid', 'Karl', 'Liv', 'Magnus', 'Nora', 'Olaf', 'Runa', 'Sven', 'Thora', 'Ulf', 'Vigdis'];

function randomName(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function generateRuler() {
  return {
    name: randomName(RULER_NAMES),
    quality: 0.3 + Math.random() * 0.7 // 0.3 - 1.0
  };
}

// ---- MODEL REQUIREMENTS ----

export function checkModelRequirements(modelKey) {
  const model = window.GOVERNANCE_MODELS[modelKey];
  if (!model?.requirements) return { met: true, reasons: [] };

  const gs = window.gameState;
  const reasons = [];

  if (model.requirements.minPopulation && gs.population.total < model.requirements.minPopulation) {
    reasons.push(`Need ${model.requirements.minPopulation} population (have ${gs.population.total})`);
  }
  if (model.requirements.minTurns && gs.turn < model.requirements.minTurns) {
    reasons.push(`Available after turn ${model.requirements.minTurns} (turn ${gs.turn})`);
  }
  if (model.requirements.minKnowledge && (gs.resources.knowledge ?? 0) < model.requirements.minKnowledge) {
    reasons.push(`Need ${model.requirements.minKnowledge} knowledge (have ${gs.resources.knowledge ?? 0})`);
  }
  if (model.requirements.minWarriors) {
    const warriors = gs.units.filter(u => u.type === 'warrior').length;
    if (warriors < model.requirements.minWarriors) {
      reasons.push(`Need ${model.requirements.minWarriors} warriors (have ${warriors})`);
    }
  }

  return { met: reasons.length === 0, reasons };
}

// ---- MODEL CHANGE ----

export function changeGovernanceModel(newModel) {
  if (newModel === window.gameState.governance.model) return;

  const gs = window.gameState;
  const oldModel = gs.governance.model;

  // Check requirements
  const req = checkModelRequirements(newModel);
  if (!req.met) return;

  // Meeting hall staffed workers reduce transition penalty (capped at halving)
  let meetingHallReduction = 0;
  for (let r = 0; r < window.MAP_ROWS; r++) {
    for (let c = 0; c < window.MAP_COLS; c++) {
      const hex = gs.map[r]?.[c];
      if (hex?.building === 'meeting_hall' && hex.buildProgress <= 0 && hex.workers > 0) {
        meetingHallReduction += hex.workers * 2;
      }
    }
  }
  const basePenalty = 25;
  const penalty = Math.max(Math.floor(basePenalty / 2), basePenalty - meetingHallReduction);

  gs.cohesion.legitimacy = Math.max(gs.cohesion.legitimacy - penalty, 10);

  // Leaving military rule is harder
  if (oldModel === 'militaryRule') {
    gs.cohesion.legitimacy = Math.max(gs.cohesion.legitimacy - 10, 5);
  }

  // Set transition timer
  gs.governance.modelChangeTimer = 4;

  // Change the model
  gs.governance.model = newModel;
  gs.governance.lastChanged.model = gs.turn;

  // Initialize model-specific state
  if (newModel === 'monarchy') initMonarchy();
  if (newModel === 'militaryRule') initMilitaryRule();
  if (newModel === 'democracy') initDemocracy();

  // Record in Chronicle
  if (window.addGovernanceChronicle) window.addGovernanceChronicle(oldModel, newModel);
}

// ---- MONARCHY ----

function initMonarchy() {
  const gs = window.gameState;
  const mon = gs.governance.monarchy;
  mon.dynastyName = randomName(DYNASTY_NAMES);
  mon.currentRuler = generateRuler();
  mon.currentRuler.reignStart = gs.turn;
  mon.heir = Math.random() < 0.6 ? generateRuler() : null;
  mon.dynastyAge = 0;
  mon.successionCrisisActive = false;

  if (window.addChronicleEntry) {
    window.addChronicleEntry(
      `The ${mon.dynastyName} dynasty was established under ${mon.currentRuler.name}. A new era of hereditary rule begins.`,
      'governance'
    );
  }
}

export function processMonarchyTurn(report) {
  const gs = window.gameState;
  if (gs.governance.model !== 'monarchy') return;

  const mon = gs.governance.monarchy;
  if (!mon.currentRuler) initMonarchy();

  mon.dynastyAge++;

  // Ruler quality affects legitimacy drift
  const qualityEffect = (mon.currentRuler.quality - 0.5) * 0.4; // -0.08 to +0.2
  gs.cohesion.legitimacy = Math.min(100, Math.max(0, gs.cohesion.legitimacy + qualityEffect));

  // Dynasty age provides slow legitimacy bonus (long dynasties = stability)
  if (mon.dynastyAge > 8) {
    gs.cohesion.legitimacy = Math.min(100, gs.cohesion.legitimacy + 0.1);
  }

  // Heir generation chance if no heir
  if (!mon.heir && Math.random() < 0.08) {
    mon.heir = generateRuler();
    if (report) report.events.push(`👶 An heir to the ${mon.dynastyName} dynasty has been born: ${mon.heir.name}.`);
    if (window.addChronicleEntry) {
      window.addChronicleEntry(`An heir was born to the ${mon.dynastyName} dynasty: ${mon.heir.name}.`, 'governance');
    }
  }

  // Succession check: ruler reigns for ~20 turns (5 game years), then succession fires
  const reignLength = gs.turn - (mon.currentRuler.reignStart ?? 0);
  if (reignLength >= 20 && !mon.successionCrisisActive) {
    triggerSuccession(report);
  }
}

function triggerSuccession(report) {
  const gs = window.gameState;
  const mon = gs.governance.monarchy;

  if (mon.heir) {
    // Smooth succession
    const oldRuler = mon.currentRuler.name;
    mon.currentRuler = { ...mon.heir, reignStart: gs.turn };
    mon.heir = null;
    const qualityDesc = mon.currentRuler.quality > 0.7 ? 'capable' : mon.currentRuler.quality > 0.4 ? 'uncertain' : 'weak';
    gs.cohesion.legitimacy = Math.max(0, gs.cohesion.legitimacy - 5);

    if (report) report.events.push(`👑 ${oldRuler} has passed. ${mon.currentRuler.name} of the ${mon.dynastyName} dynasty takes the throne — a ${qualityDesc} ruler.`);
    if (window.addChronicleEntry) {
      window.addChronicleEntry(`${oldRuler} passed on and ${mon.currentRuler.name} inherited the throne of the ${mon.dynastyName} dynasty. The people hold their breath.`, 'governance');
    }
  } else {
    // No heir — succession crisis
    mon.successionCrisisActive = true;
    gs.cohesion.legitimacy = Math.max(0, gs.cohesion.legitimacy - 15);
    gs.cohesion.bonds = Math.max(0, gs.cohesion.bonds - 8);

    // Resolve by generating a contested ruler
    mon.currentRuler = generateRuler();
    mon.currentRuler.reignStart = gs.turn;
    mon.currentRuler.quality = Math.max(0.1, mon.currentRuler.quality - 0.2); // contested rulers are weaker

    if (report) report.events.push(`⚠️ Succession crisis! No clear heir to the ${mon.dynastyName} dynasty. ${mon.currentRuler.name} seized the throne amid turmoil.`);
    if (window.addChronicleEntry) {
      window.addChronicleEntry(`A succession crisis tore at the ${mon.dynastyName} dynasty. ${mon.currentRuler.name} claimed the throne, but legitimacy suffered.`, 'crisis');
    }

    // Crisis resolves after a few turns
    setTimeout(() => { mon.successionCrisisActive = false; }, 0);
  }
}

// ---- MILITARY RULE ----

function initMilitaryRule() {
  const gs = window.gameState;
  const mil = gs.governance.militaryRule;
  mil.commanderStrength = 1.0;
  mil.consecutiveVictories = 0;
  mil.turnsInPower = 0;

  // Clamp freedom to max 20
  if (gs.governance.policies.freedom > 20) {
    gs.governance.policies.freedom = 20;
  }

  if (window.addChronicleEntry) {
    window.addChronicleEntry(`Military rule was imposed. The warriors now command the society.`, 'governance');
  }
}

export function processMilitaryRuleTurn(report) {
  const gs = window.gameState;
  if (gs.governance.model !== 'militaryRule') return;

  const mil = gs.governance.militaryRule;
  mil.turnsInPower++;

  // Satisfaction erodes under military rule (people don't like it)
  gs.cohesion.satisfaction = Math.max(0, gs.cohesion.satisfaction - 0.5);

  // Freedom policy clamped at 20
  if (gs.governance.policies.freedom > 20) {
    gs.governance.policies.freedom = 20;
  }

  // Commander strength decays slowly without combat victories
  if (mil.consecutiveVictories === 0 && mil.turnsInPower > 4) {
    mil.commanderStrength = Math.max(0.3, mil.commanderStrength - 0.02);
    if (mil.commanderStrength < 0.5 && report) {
      report.events.push(`⚔️ The military commander's authority is waning without recent victories.`);
    }
  }
}

export function onCombatVictory() {
  const gs = window.gameState;
  if (gs.governance.model !== 'militaryRule') return;
  gs.governance.militaryRule.consecutiveVictories++;
  gs.governance.militaryRule.commanderStrength = Math.min(1.0, gs.governance.militaryRule.commanderStrength + 0.1);
  gs.cohesion.legitimacy = Math.min(100, gs.cohesion.legitimacy + 2);
}

export function onCombatDefeat() {
  const gs = window.gameState;
  if (gs.governance.model !== 'militaryRule') return;
  gs.governance.militaryRule.consecutiveVictories = 0;
  gs.governance.militaryRule.commanderStrength = Math.max(0, gs.governance.militaryRule.commanderStrength - 0.3);
  gs.cohesion.legitimacy = Math.max(0, gs.cohesion.legitimacy - 10);
}

export function getMilitaryCombatBonuses() {
  const gs = window.gameState;
  if (gs.governance.model !== 'militaryRule') return { attack: 1, defense: 1, trainingSpeed: 1 };
  const model = window.GOVERNANCE_MODELS.militaryRule;
  return {
    attack: model.combatBonuses.unitAttack,
    defense: model.combatBonuses.unitDefense,
    trainingSpeed: model.combatBonuses.trainingSpeed
  };
}

// ---- DEMOCRACY ----

function initDemocracy() {
  const gs = window.gameState;
  const dem = gs.governance.democracy;
  dem.pendingPolicyChanges = [];
  dem.electionTimer = 8 + Math.floor(Math.random() * 5); // 8-12 turns
  dem.voterSatisfaction = gs.cohesion.satisfaction;

  // Enforce freedom minimum
  if (gs.governance.policies.freedom < 40) {
    gs.governance.policies.freedom = 40;
  }

  if (window.addChronicleEntry) {
    window.addChronicleEntry(`The people chose democracy. From now on, decisions will be made by popular vote.`, 'governance');
  }
}

export function processDemocracyTurn(report) {
  const gs = window.gameState;
  if (gs.governance.model !== 'democracy') return;

  const dem = gs.governance.democracy;

  // Note: policy change delays are now handled by the general policy lag system.
  // Democracy's lagMultiplier (1.2) in the governance model definition replaces the old
  // pendingPolicyChanges mechanism.

  // Freedom policy floor at 40
  if (gs.governance.policies.freedom < 40) {
    gs.governance.policies.freedom = 40;
  }

  // Voter satisfaction tracks cohesion satisfaction with a lag
  dem.voterSatisfaction = dem.voterSatisfaction * 0.8 + gs.cohesion.satisfaction * 0.2;

  // During famine, voter satisfaction drops faster
  if (gs.resources.food <= 0) {
    dem.voterSatisfaction = Math.max(0, dem.voterSatisfaction - 3);
  }

  // Low voter satisfaction erodes legitimacy
  if (dem.voterSatisfaction < 30) {
    gs.cohesion.legitimacy = Math.max(0, gs.cohesion.legitimacy - 0.5);
  }

  // Election timer
  dem.electionTimer--;
  if (dem.electionTimer <= 0) {
    dem.electionTimer = 8 + Math.floor(Math.random() * 5);
    // Election boosts or drops legitimacy based on voter satisfaction
    if (dem.voterSatisfaction > 50) {
      gs.cohesion.legitimacy = Math.min(100, gs.cohesion.legitimacy + 3);
      if (report) report.events.push(`🗳️ Elections held! The people renew their mandate. Legitimacy rises.`);
    } else {
      gs.cohesion.legitimacy = Math.max(0, gs.cohesion.legitimacy - 3);
      if (report) report.events.push(`🗳️ Elections held amid discontent. Support for the government wanes.`);
    }
    if (window.addChronicleEntry) {
      window.addChronicleEntry(`Elections were held. The people voiced their will.`, 'governance');
    }
  }
}

// ---- PER-TURN GOVERNANCE PROCESSING ----

export function processGovernanceTurn(report) {
  const gs = window.gameState;

  // Decrement model change timer
  if (gs.governance.modelChangeTimer > 0) {
    gs.governance.modelChangeTimer--;
  }

  // Model-specific processing
  processMonarchyTurn(report);
  processMilitaryRuleTurn(report);
  processDemocracyTurn(report);
}

// ---- POLICY CONSTRAINTS ----

export function getPolicyConstraints(policyName) {
  const model = window.GOVERNANCE_MODELS[window.gameState.governance.model];
  if (!model?.policyEffects?.[policyName]) return { min: 0, max: 100 };

  const effects = model.policyEffects[policyName];
  return {
    min: effects.minValue ?? 0,
    max: effects.maxValue ?? 100
  };
}

export function adjustPolicy(policyName, newValue) {
  // With policy lag system: slider moves set pending values, not immediate application.
  // The player must commit changes for them to enter the lag pipeline.
  if (window.setPendingPolicy) {
    window.setPendingPolicy(policyName, newValue);
  }

  // Update policy summary to show pending state
  updatePolicySummary();
}

export function getGovernanceModel() {
  return window.GOVERNANCE_MODELS[window.gameState.governance.model];
}

export function adjustWorkingAge(delta) {
  // With policy lag system: set pending rather than immediate application.
  const newAge = Math.max(6, Math.min(16, window.WORKING_AGE + delta));
  if (window.setPendingPolicy) {
    window.setPendingPolicy('workingAge', newAge);
  }

  // Update display to show pending value
  const workingAgeDisplay = document.getElementById('working-age-value');
  if (workingAgeDisplay) {
    workingAgeDisplay.textContent = newAge;
  }

  const workingAgeHeader = document.getElementById('policy-header-working-age');
  if (workingAgeHeader) {
    const ageLevel = getWorkingAgeLabel(newAge);
    workingAgeHeader.textContent = `Childhood & Labor (${ageLevel})`;
  }

  updatePolicySummary();
}

export function getPolicyLabel(policyName, value) {
  const labels = {
    freedom: ['Authoritarian', 'Regulated', 'Balanced', 'Liberal', 'Anarchic'],
    mercy: ['Ruthless', 'Strict', 'Fair', 'Lenient', 'Merciful'],
    tradition: ['Revolutionary', 'Modern', 'Balanced', 'Conservative', 'Ancient Ways'],
    isolation: ['Cosmopolitan', 'Welcoming', 'Balanced', 'Guarded', 'Isolationist'],
    culturalOpenness: ['Enforced', 'Expected', 'Moderate', 'Accepting', 'Tolerant'],
    progressiveness: ['None', 'Minimal', 'Moderate', 'Committed', 'Intensive']
  };

  if (!labels[policyName]) return 'Unknown';

  // Map 0-100 value to 5 labels (0-20, 20-40, 40-60, 60-80, 80-100)
  const index = Math.min(4, Math.floor(value / 20));
  return labels[policyName][index];
}

export function getWorkingAgeLabel(age) {
  const labels = ['Survival', 'Early Work', 'Balanced', 'Education', 'Prosperity'];
  // Map working age 6-16 to 5 labels
  const index = Math.min(4, Math.floor((age - 6) / 2));
  return labels[index];
}

export function updatePolicySummary() {
  const summaryElements = {
    freedom: document.getElementById('policy-summary-freedom'),
    mercy: document.getElementById('policy-summary-mercy'),
    tradition: document.getElementById('policy-summary-tradition'),
    isolation: document.getElementById('policy-summary-isolation'),
    workingAge: document.getElementById('policy-summary-working-age')
  };

  const lagIndicator = (policy) => {
    if (!window.gameState?.policyLag) return '';
    const lag = window.gameState.policyLag[policy];
    if (lag) return ' ⏳';
    const pending = window.gameState.policyLag.pending?.[policy];
    if (pending !== null && pending !== undefined) return ' 📝';
    return '';
  };

  if (summaryElements.freedom) {
    summaryElements.freedom.textContent = getPolicyLabel('freedom', window.gameState.governance.policies.freedom) + lagIndicator('freedom');
  }
  if (summaryElements.mercy) {
    summaryElements.mercy.textContent = getPolicyLabel('mercy', window.gameState.governance.policies.mercy) + lagIndicator('mercy');
  }
  if (summaryElements.tradition) {
    summaryElements.tradition.textContent = getPolicyLabel('tradition', window.gameState.governance.policies.tradition) + lagIndicator('tradition');
  }
  if (summaryElements.isolation) {
    summaryElements.isolation.textContent = getPolicyLabel('isolation', window.gameState.governance.policies.isolation ?? 50) + lagIndicator('isolation');
  }
  if (summaryElements.workingAge) {
    const ageLabel = getWorkingAgeLabel(window.WORKING_AGE);
    summaryElements.workingAge.textContent = `${window.WORKING_AGE} (${ageLabel})${lagIndicator('workingAge')}`;
  }
}
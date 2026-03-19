// ---- CRIME SYSTEM ----
// Three crime tracks (theft, violence, norm transgression) driven by interpersonal trust
// and material conditions. Organized predation emerges at sustained high severity.
// Justice Hall building provides detection and suppression.
// Crime rates hidden from UI without Justice Hall; dev panel always shows full state.

let gameState = null;

// ---- CONSTANTS ----

// Base generation rates per turn (before modifiers)
const BASE_RATES = {
  theft: 0.8,
  violence: 0.3,
  transgression: 0.4
};

// Material condition sensitivities
const MATERIAL_SENSITIVITY = {
  theft: 1.2,
  violence: 0.6,
  transgression: 0.2
};

// Natural decay per turn
const DECAY_RATE = 0.5;

// Organized predation threshold
const ORGANIZED_THRESHOLD = 15;
const ORGANIZED_TURNS_REQUIRED = 3;

// Effects scaling
const THEFT_FOOD_DRAIN = 0.02;        // fraction of food stockpile per severity point
const THEFT_MAT_DRAIN = 0.01;         // fraction of materials per severity point
const VIOLENCE_POP_THRESHOLD = 8;     // violence level that starts killing people
const VIOLENCE_KILL_RATE = 0.005;     // population fraction per violence point above threshold
const TRANSGRESSION_KNOWLEDGE_DRAIN = 0.1; // knowledge lost per transgression point

// Crackdown
const CRACKDOWN_SEVERITY_REDUCTION = 5;
const CRACKDOWN_COOLDOWN = 4;

// ---- INIT ----

export function initCrime(gameStateRef) {
  gameState = gameStateRef;

  if (!gameState.crime) {
    gameState.crime = {
      theft: 0,
      violence: 0,
      transgression: 0,
      overallSeverity: 0,
      organizedPredation: false,
      organizedPredationTurns: 0,
      crackdownCooldown: 0,
      lastCrimeReport: null
    };
  }
}

// ---- PER-TURN PROCESSING ----

export function processCrime(report) {
  if (!gameState?.crime) return;

  const c = gameState.crime;
  const interpersonalTrust = gameState.trust?.interpersonal ?? 0.7;

  // Material score: food insecurity + idle ratio
  const foodPerPop = (window.FOOD_PER_POP || 2);
  const foodNeeded = gameState.population.total * foodPerPop;
  const foodInsecurity = foodNeeded > 0 ? Math.max(0, 1 - gameState.resources.food / (foodNeeded * 3)) : 0;
  const baseIdleRatio = gameState.population.total > 0
    ? gameState.population.idle / gameState.population.total
    : 0;
  const genderCrimeIdleMod = window.getGenderCrimeIdleModifier ? window.getGenderCrimeIdleModifier() : 0;
  const idleRatio = Math.max(0, Math.min(1, baseIdleRatio + genderCrimeIdleMod));
  const materialScore = foodInsecurity * 0.6 + idleRatio * 0.4;

  // Mercy/Severity modifier: severity (low mercy) increases crime deterrence
  const mercy = gameState.governance?.policies?.mercy ?? 50;
  const mercySeverityMod = 1 + ((mercy - 50) / 50) * 0.3; // mercy 0 = 0.7x, mercy 100 = 1.3x

  // Tradition modifier for transgression
  const tradition = gameState.governance?.policies?.tradition ?? 50;
  const traditionMod = tradition > 70 ? 0.7 : tradition < 30 ? 1.2 : 1.0;

  // Class multiplier: formal stratification amplifies crime among commons
  const classMult = window.getClassMultiplier ? window.getClassMultiplier() : 1.0;

  // Justice Hall suppression
  const justiceReduction = getJusticeHallSuppression();

  // Organized predation multiplier
  const orgMult = c.organizedPredation ? 1.2 : 1.0;

  // Generate crime rates
  for (const track of ['theft', 'violence', 'transgression']) {
    const baseRate = BASE_RATES[track];
    const sensitivity = MATERIAL_SENSITIVITY[track];

    let rate = ((1 - interpersonalTrust) * baseRate + materialScore * sensitivity)
      * mercySeverityMod * classMult * orgMult;

    // Tradition modifier only for transgression
    if (track === 'transgression') rate *= traditionMod;

    // Apply justice hall suppression
    rate *= (1 - justiceReduction);

    // Natural decay
    const decay = DECAY_RATE * (track === 'violence' ? 0.7 : 1.0); // violence decays slower

    c[track] = Math.max(0, c[track] + rate - decay);
  }

  // Overall severity
  c.overallSeverity = c.theft + c.violence + c.transgression;

  // Check organized predation
  if (c.overallSeverity > ORGANIZED_THRESHOLD) {
    c.organizedPredationTurns++;
    if (c.organizedPredationTurns >= ORGANIZED_TURNS_REQUIRED && !c.organizedPredation) {
      c.organizedPredation = true;
      if (report) report.events.push('⚠️ Crime has organized. Theft rings and protection rackets have formed.');
      if (window.addChronicleEntry) {
        window.addChronicleEntry('Crime organized into coordinated rings. The community lives in fear.', 'crisis');
      }
    }
  } else {
    c.organizedPredationTurns = Math.max(0, c.organizedPredationTurns - 1);
    if (c.organizedPredation && c.overallSeverity < ORGANIZED_THRESHOLD * 0.5) {
      c.organizedPredation = false;
      if (report) report.events.push('📉 Organized crime has been broken up.');
    }
  }

  // Apply crime effects
  applyCrimeEffects(report);

  // Crackdown cooldown
  if (c.crackdownCooldown > 0) c.crackdownCooldown--;

  // Store report snapshot for UI
  c.lastCrimeReport = {
    theft: c.theft,
    violence: c.violence,
    transgression: c.transgression,
    overallSeverity: c.overallSeverity,
    organizedPredation: c.organizedPredation
  };
}

function applyCrimeEffects(report) {
  const c = gameState.crime;
  const mercy = gameState.governance?.policies?.mercy ?? 50;
  // Merciful societies absorb cohesion damage better
  const mercyAbsorb = 1 - (mercy / 100) * 0.25; // 1.0 at mercy=0, 0.75 at mercy=100

  // Theft: drain food and materials
  if (c.theft > 1) {
    const foodDrain = Math.floor(gameState.resources.food * THEFT_FOOD_DRAIN * c.theft);
    const matDrain = Math.floor(gameState.resources.materials * THEFT_MAT_DRAIN * c.theft);

    const effectiveFoodDrain = c.organizedPredation ? foodDrain * 2 : foodDrain;
    const effectiveMatDrain = c.organizedPredation ? matDrain * 2 : matDrain;

    if (effectiveFoodDrain > 0) gameState.resources.food = Math.max(0, gameState.resources.food - effectiveFoodDrain);
    if (effectiveMatDrain > 0) gameState.resources.materials = Math.max(0, gameState.resources.materials - effectiveMatDrain);

    // Satisfaction damage
    const satDamage = c.theft * 0.08 * mercyAbsorb;
    gameState.cohesion.satisfaction = Math.max(0, gameState.cohesion.satisfaction - satDamage);

    // Interpersonal trust damage
    if (window.applyTrustDeviation && c.theft > 3) {
      window.applyTrustDeviation('interpersonal', -0.01);
    }
  }

  // Violence: population loss at high levels, bonds + satisfaction damage
  if (c.violence > 1) {
    const satDamage = c.violence * 0.12 * mercyAbsorb;
    const bondsDamage = c.violence * 0.08 * mercyAbsorb;
    gameState.cohesion.satisfaction = Math.max(0, gameState.cohesion.satisfaction - satDamage);
    gameState.cohesion.bonds = Math.max(0, gameState.cohesion.bonds - bondsDamage);

    // Population loss at high violence
    if (c.violence > VIOLENCE_POP_THRESHOLD) {
      const excessViolence = c.violence - VIOLENCE_POP_THRESHOLD;
      const killChance = excessViolence * VIOLENCE_KILL_RATE * (c.organizedPredation ? 1.5 : 1.0);
      const deaths = Math.min(
        Math.floor(gameState.population.total * killChance),
        Math.max(0, gameState.population.total - 1) // sole survivor protection
      );
      if (deaths > 0) {
        gameState.population.total -= deaths;
        gameState.population.idle = Math.max(0, gameState.population.idle - deaths);
        if (window.removeFromAdultCohorts) window.removeFromAdultCohorts(deaths);
        if (report) report.events.push(`💀 ${deaths} ${deaths === 1 ? 'person' : 'people'} killed in violent crime.`);
        if (gameState.culture) gameState.culture.deathsOccurred = true;
        if (window.addChronicleEntry) {
          window.addChronicleEntry(`${deaths} people were killed in acts of violence. Fear grips the community.`, 'death');
        }
      }
    }

    // Interpersonal trust damage
    if (window.applyTrustDeviation && c.violence > 3) {
      window.applyTrustDeviation('interpersonal', -0.02);
    }
  }

  // Norm transgression: identity + legitimacy damage, knowledge erosion
  if (c.transgression > 1) {
    const idDamage = c.transgression * 0.06 * mercyAbsorb;
    const legDamage = c.transgression * 0.04 * mercyAbsorb;
    gameState.cohesion.identity = Math.max(0, gameState.cohesion.identity - idDamage);
    gameState.cohesion.legitimacy = Math.max(0, gameState.cohesion.legitimacy - legDamage);

    // Knowledge erosion
    const knowledgeDrain = c.transgression * TRANSGRESSION_KNOWLEDGE_DRAIN;
    gameState.resources.knowledge = Math.max(0, gameState.resources.knowledge - knowledgeDrain);
  }

  // Organized predation adds resistance pressure
  if (c.organizedPredation && window.addResistancePressure) {
    window.addResistancePressure(0.5);
  }
}

// ---- JUSTICE HALL ----

/**
 * Returns the detection level (0-3) based on staffed Justice Hall workers.
 * 1 = theft visible, 2 = +violence, 3 = all + organized predation flag
 */
export function getJusticeHallDetection() {
  if (!gameState?.map) return 0;
  let totalWorkers = 0;
  for (let r = 0; r < window.MAP_ROWS; r++) {
    for (let c = 0; c < window.MAP_COLS; c++) {
      const hex = gameState.map[r]?.[c];
      if (hex?.building === 'justice_hall' && hex.buildProgress <= 0) {
        totalWorkers += hex.workers || 0;
      }
    }
  }
  return Math.min(3, totalWorkers);
}

/**
 * Returns suppression factor (0 to ~1.05) from Justice Hall detection capacity.
 */
function getJusticeHallSuppression() {
  const detection = getJusticeHallDetection();
  return detection * 0.35; // max 1.05 at 3 workers
}

/**
 * Perform a crackdown — one-time severity reduction.
 * Costs: materials + satisfaction + trust. 4-turn cooldown.
 */
export function performCrackdown() {
  const c = gameState.crime;
  if (!c || c.crackdownCooldown > 0) return false;
  if (getJusticeHallDetection() < 1) return false;

  // Cost: materials
  const matCost = Math.ceil(gameState.population.total * 0.1);
  if (gameState.resources.materials < matCost) return false;

  gameState.resources.materials -= matCost;

  // Reduce severity
  c.theft = Math.max(0, c.theft - CRACKDOWN_SEVERITY_REDUCTION * 0.4);
  c.violence = Math.max(0, c.violence - CRACKDOWN_SEVERITY_REDUCTION * 0.3);
  c.transgression = Math.max(0, c.transgression - CRACKDOWN_SEVERITY_REDUCTION * 0.3);
  c.overallSeverity = c.theft + c.violence + c.transgression;

  // Cohesion cost
  gameState.cohesion.satisfaction = Math.max(0, gameState.cohesion.satisfaction - 3);
  if (window.applyTrustDeviation) {
    window.applyTrustDeviation('interpersonal', -0.03);
  }

  // Cooldown
  c.crackdownCooldown = CRACKDOWN_COOLDOWN;

  if (window.addChronicleEntry) {
    window.addChronicleEntry('A crackdown was ordered against criminal elements. Order was restored, but not without cost.', 'governance');
  }

  return true;
}

// ---- QUERY ----

export function getCrimeState() {
  if (!gameState?.crime) return null;
  const c = gameState.crime;
  const detection = getJusticeHallDetection();
  return {
    theft: c.theft,
    violence: c.violence,
    transgression: c.transgression,
    overallSeverity: c.overallSeverity,
    organizedPredation: c.organizedPredation,
    organizedPredationTurns: c.organizedPredationTurns,
    crackdownCooldown: c.crackdownCooldown,
    detectionLevel: detection,
    // Gated visibility: only show what detection level allows
    visibleTheft: detection >= 1 ? c.theft : null,
    visibleViolence: detection >= 2 ? c.violence : null,
    visibleTransgression: detection >= 3 ? c.transgression : null,
    visibleOrganized: detection >= 3 ? c.organizedPredation : null
  };
}

/**
 * Returns qualitative crime description for advisor dialogue / Social Climate widget.
 * Always visible (doesn't require Justice Hall).
 */
export function getCrimeClimateText() {
  if (!gameState?.crime) return null;
  const severity = gameState.crime.overallSeverity;

  if (severity < 2) return null; // too low to notice
  if (severity < 5) return { text: 'Minor disputes are becoming more common.', cls: '' };
  if (severity < 10) return { text: 'Theft and petty crime trouble the community.', cls: 'warning' };
  if (severity < 15) return { text: 'Crime is rampant. People fear for their safety.', cls: 'warning' };
  if (gameState.crime.organizedPredation) return { text: 'Organized crime has taken root. The community is terrorized.', cls: 'danger' };
  return { text: 'Violence and lawlessness threaten to tear society apart.', cls: 'danger' };
}

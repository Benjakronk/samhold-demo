// ---- RESISTANCE SYSTEM ----
// Global resistance pressure (0-100) driven by institutional trust deficit.
// The Faction: persistent named opposition with 4 dispositions.
// Resolution paths: reversal, suppression, negotiation.
// Promise registry tracks binding promises with deadlines.

let gameState = null;

// ---- CONSTANTS ----

const PRESSURE_THRESHOLDS = {
  warning: 25,
  faction: 40,
  organized: 60,
  hostile: 80,
  radical: 95
};

const DECAY_BASE = 1.5;
const GENERATION_MULTIPLIER = 2.5;
const ORGANIZED_LEGITIMACY_DRAIN = 0.3;
const RADICAL_PILLAR_DRAIN = 1.0;
const SUPPRESSION_RECURRENCE_RATE = 0.15;
const BROKEN_PROMISE_LEGITIMACY = 12;

const DISPOSITIONS = ['cooperative', 'skeptical', 'hostile', 'radical'];

const FACTION_NAMES = [
  'Voices of the Old Ways',
  'The Free Council',
  'The Dissenters',
  'Circle of the Unheard',
  'The People\'s Voice',
  'Guardians of Tradition',
  'The Opposition',
  'Seekers of Change'
];

const LEADER_NAMES = [
  'Sigrid', 'Bjorn', 'Eira', 'Torsten', 'Hild', 'Ragnvald',
  'Asa', 'Gunnar', 'Thora', 'Leif', 'Ingrid', 'Halvar'
];

// ---- INIT ----

export function initResistance(gameStateRef) {
  gameState = gameStateRef;

  if (!gameState.resistance) {
    gameState.resistance = {
      pressure: 0,
      suppressionCount: 0,
      recurrenceMultiplier: 1.0,
      faction: {
        active: false,
        name: '',
        disposition: 'cooperative',
        leader: '',
        formalInfluence: null,
        promiseRegistry: []
      },
      tcConsensusPolicies: {},
      hostileCrossed: false,
      lastWarningTurn: 0
    };
  }
}

// ---- PER-TURN PROCESSING ----

export function processResistance(report) {
  if (!gameState?.resistance) return;

  const r = gameState.resistance;
  const trust = gameState.trust?.institutional ?? 0.7;

  // 1. Generate pressure
  const baseGeneration = (1 - trust) * GENERATION_MULTIPLIER;

  // Passive pressure from in-progress policy changes
  let lagPressure = 0;
  if (gameState.policyLag) {
    for (const policy of ['freedom', 'mercy', 'tradition', 'isolation', 'workingAge']) {
      const lag = gameState.policyLag[policy];
      if (!lag) continue;
      const categoryMult = lag.category === 'cultural' ? 1.5 : 1.0;
      const tcMult = r.tcConsensusPolicies?.[policy] ? 0.5 : 1.0;
      lagPressure += 0.5 * categoryMult * tcMult;
    }
  }

  const totalGeneration = (baseGeneration + lagPressure) * r.recurrenceMultiplier;

  // 2. Calculate decay
  const trustModifier = 0.5 + trust; // 0.5 at trust=0, 1.5 at trust=1
  const dispositionIndex = DISPOSITIONS.indexOf(r.faction.disposition);
  const dispositionModifier = 1.0 - dispositionIndex * 0.15; // 1.0 cooperative, 0.55 radical
  const cohesionTotal = gameState.cohesion?.total ?? 50;
  const cohesionModifier = cohesionTotal >= 60 ? 1.2 : cohesionTotal >= 40 ? 1.0 : 0.7;

  const totalDecay = DECAY_BASE * trustModifier * dispositionModifier * cohesionModifier;

  // 3. Update pressure
  const prevPressure = r.pressure;
  r.pressure = Math.max(0, Math.min(100, r.pressure + totalGeneration - totalDecay));

  // 4. Check thresholds

  // Advisor warning (cooldown: 8 turns)
  if (r.pressure >= PRESSURE_THRESHOLDS.warning && prevPressure < PRESSURE_THRESHOLDS.warning) {
    if (gameState.turn - r.lastWarningTurn >= 8) {
      r.lastWarningTurn = gameState.turn;
      if (report) report.events.push('⚠️ Advisors warn of growing unrest among the people.');
    }
  }

  // Faction activation
  if (r.pressure >= PRESSURE_THRESHOLDS.faction && !r.faction.active) {
    activateFaction();
    if (report) report.events.push(`✊ A resistance faction has formed: "${r.faction.name}", led by ${r.faction.leader}.`);
  }

  // Organized resistance effects (continuous while above threshold)
  if (r.pressure >= PRESSURE_THRESHOLDS.organized) {
    gameState.cohesion.legitimacy = Math.max(0, gameState.cohesion.legitimacy - ORGANIZED_LEGITIMACY_DRAIN);
  }

  // Hostile threshold crossing (one-time disposition shift)
  if (r.pressure >= PRESSURE_THRESHOLDS.hostile && !r.hostileCrossed && r.faction.active) {
    r.hostileCrossed = true;
    shiftDisposition(1); // toward hostile
    if (report) report.events.push(`⚡ The ${r.faction.name} has grown hostile. Emigration is a real risk.`);
  }

  // Radical effects (continuous while above threshold)
  if (r.pressure >= PRESSURE_THRESHOLDS.radical) {
    gameState.cohesion.identity = Math.max(0, gameState.cohesion.identity - RADICAL_PILLAR_DRAIN);
    gameState.cohesion.legitimacy = Math.max(0, gameState.cohesion.legitimacy - RADICAL_PILLAR_DRAIN);
    gameState.cohesion.satisfaction = Math.max(0, gameState.cohesion.satisfaction - RADICAL_PILLAR_DRAIN);
    gameState.cohesion.bonds = Math.max(0, gameState.cohesion.bonds - RADICAL_PILLAR_DRAIN);
  }

  // Reset hostile flag when pressure drops below threshold
  if (r.pressure < PRESSURE_THRESHOLDS.hostile) {
    r.hostileCrossed = false;
  }

  // 5. Check promises
  checkPromises(report);
}

// ---- FACTION ----

function activateFaction() {
  const r = gameState.resistance;
  r.faction.active = true;
  r.faction.name = FACTION_NAMES[Math.floor(Math.random() * FACTION_NAMES.length)];
  r.faction.leader = LEADER_NAMES[Math.floor(Math.random() * LEADER_NAMES.length)];
  r.faction.disposition = 'skeptical'; // activates as skeptical, not cooperative

  if (window.addChronicleEntry) {
    window.addChronicleEntry(
      `"${r.faction.name}" has formed, voicing opposition to our leadership. ${r.faction.leader} speaks for the discontented.`,
      'crisis'
    );
  }
}

export function shiftDisposition(direction) {
  const r = gameState.resistance;
  if (!r.faction.active) return;

  const currentIndex = DISPOSITIONS.indexOf(r.faction.disposition);
  const newIndex = Math.max(0, Math.min(DISPOSITIONS.length - 1, currentIndex + direction));
  const oldDisposition = r.faction.disposition;
  r.faction.disposition = DISPOSITIONS[newIndex];

  if (oldDisposition !== r.faction.disposition && window.addChronicleEntry) {
    window.addChronicleEntry(
      `"${r.faction.name}" has grown more ${r.faction.disposition}.`,
      'crisis'
    );
  }
}

export function getDispositionLabel(disposition) {
  const labels = {
    cooperative: 'Cooperative',
    skeptical: 'Skeptical',
    hostile: 'Hostile',
    radical: 'Radical'
  };
  return labels[disposition] || disposition;
}

// ---- RESOLUTION PATHS ----

/**
 * Suppress the resistance by force.
 * Immediate pressure reduction, heavy costs, disposition shifts hostile.
 */
export function suppressResistance() {
  const r = gameState.resistance;
  if (!r.faction.active) return;

  // Immediate pressure reduction
  r.pressure = Math.max(0, r.pressure - 30);
  r.suppressionCount++;
  r.recurrenceMultiplier = 1 + r.suppressionCount * SUPPRESSION_RECURRENCE_RATE;

  // Costs
  const matCost = Math.ceil(gameState.population.total * 0.2);
  gameState.resources.materials = Math.max(0, gameState.resources.materials - matCost);
  gameState.cohesion.legitimacy = Math.max(0, gameState.cohesion.legitimacy - 8);
  gameState.cohesion.satisfaction = Math.max(0, gameState.cohesion.satisfaction - 5);

  // Trust damage
  if (window.applyTrustDeviation) {
    window.applyTrustDeviation('institutional', -0.12);
    window.applyTrustDeviation('interpersonal', -0.08);
  }

  // Disposition shifts toward hostile
  shiftDisposition(1);

  if (window.addChronicleEntry) {
    window.addChronicleEntry(
      `"${r.faction.name}" was suppressed by force. Order was restored, but at what cost?`,
      'governance'
    );
  }
}

/**
 * Negotiate with the faction. Accepts an array of concessions.
 * @param {Object} concessions - { policyReversal: string|null, resourceCost: number, formalInfluence: boolean, promise: { description, deadline, binding }|null }
 */
export function negotiateResistance(concessions) {
  const r = gameState.resistance;
  if (!r.faction.active) return;
  if (r.faction.disposition === 'radical') return; // Cannot negotiate with radicals

  // Base pressure reduction from negotiation
  let pressureReduction = 15;

  // Policy reversal concession
  if (concessions.policyReversal && window.abandonPolicyChange) {
    window.abandonPolicyChange(concessions.policyReversal);
    pressureReduction += 10;
  }

  // Resource concession
  if (concessions.resourceCost > 0) {
    gameState.resources.food = Math.max(0, gameState.resources.food - concessions.resourceCost);
    pressureReduction += 5;
  }

  // Formal influence concession
  if (concessions.formalInfluence) {
    r.faction.formalInfluence = { granted: gameState.turn };
    pressureReduction += 10;
  }

  // Promise concession
  if (concessions.promise) {
    addPromise(concessions.promise.description, concessions.promise.deadline, concessions.promise.binding);
    pressureReduction += 8;
  }

  r.pressure = Math.max(0, r.pressure - pressureReduction);

  // Disposition shifts toward cooperative
  shiftDisposition(-1);

  // Small legitimacy cost (negotiation = acknowledging the opposition)
  gameState.cohesion.legitimacy = Math.max(0, gameState.cohesion.legitimacy - 3);

  if (window.addChronicleEntry) {
    window.addChronicleEntry(
      `An accord was reached with "${r.faction.name}". Concessions were made in the name of stability.`,
      'governance'
    );
  }
}

/**
 * Reverse a contested policy to reduce pressure.
 * Higher legitimacy cost based on faction disposition.
 */
export function reverseContestedPolicy(policy) {
  const r = gameState.resistance;

  // Abandon the policy change if in lag
  if (window.abandonPolicyChange) {
    window.abandonPolicyChange(policy);
  }

  // Legitimacy cost scales with disposition
  const dispositionCosts = { cooperative: 2, skeptical: 4, hostile: 7, radical: 12 };
  const legCost = dispositionCosts[r.faction.disposition] || 4;
  gameState.cohesion.legitimacy = Math.max(0, gameState.cohesion.legitimacy - legCost);

  // Pressure reduction
  r.pressure = Math.max(0, r.pressure - 20);

  // Disposition may cool slightly
  if (r.faction.disposition !== 'cooperative') {
    shiftDisposition(-1);
  }

  if (window.addChronicleEntry) {
    window.addChronicleEntry(
      `The contested policy was reversed under pressure from "${r.faction.name}".`,
      'governance'
    );
  }
}

// ---- PROMISE REGISTRY ----

let nextPromiseId = 1;

export function addPromise(description, deadline, binding) {
  const r = gameState.resistance;
  r.faction.promiseRegistry.push({
    id: nextPromiseId++,
    description,
    deadline, // absolute turn number
    binding: binding !== false, // default to binding
    fulfilled: false
  });
}

export function fulfillPromise(promiseId) {
  const r = gameState.resistance;
  const promise = r.faction.promiseRegistry.find(p => p.id === promiseId);
  if (promise) {
    promise.fulfilled = true;
    r.pressure = Math.max(0, r.pressure - 5);
    shiftDisposition(-1);
  }
}

function checkPromises(report) {
  const r = gameState.resistance;
  if (!r.faction.active || r.faction.promiseRegistry.length === 0) return;

  for (const promise of r.faction.promiseRegistry) {
    if (promise.fulfilled) continue;
    if (gameState.turn > promise.deadline) {
      // Broken promise
      promise.fulfilled = false; // mark as broken (expired)

      if (promise.binding) {
        gameState.cohesion.legitimacy = Math.max(0, gameState.cohesion.legitimacy - BROKEN_PROMISE_LEGITIMACY);
        shiftDisposition(1);

        if (window.applyTrustDeviation) {
          window.applyTrustDeviation('institutional', -0.08);
        }

        r.pressure = Math.min(100, r.pressure + 10);

        if (report) report.events.push(`⚠️ A binding promise to "${r.faction.name}" was broken. Trust is shattered.`);
        if (window.addChronicleEntry) {
          window.addChronicleEntry(
            `We broke our promise to "${r.faction.name}": "${promise.description}". Our word means nothing now.`,
            'crisis'
          );
        }
      } else {
        // Non-binding: smaller penalty
        gameState.cohesion.legitimacy = Math.max(0, gameState.cohesion.legitimacy - 4);
        r.pressure = Math.min(100, r.pressure + 5);

        if (report) report.events.push(`⚠️ A promise to "${r.faction.name}" went unfulfilled.`);
      }

      // Mark as expired to avoid repeated processing
      promise.expired = true;
    }
  }

  // Clean up expired promises
  r.faction.promiseRegistry = r.faction.promiseRegistry.filter(p => !p.expired);
}

// ---- PRESSURE MODIFICATION (for events) ----

export function addResistancePressure(amount) {
  if (!gameState?.resistance) return;
  gameState.resistance.pressure = Math.max(0, Math.min(100, gameState.resistance.pressure + amount));
}

// ---- QUERY ----

export function getResistanceState() {
  if (!gameState?.resistance) return null;
  const r = gameState.resistance;
  return {
    pressure: r.pressure,
    suppressionCount: r.suppressionCount,
    recurrenceMultiplier: r.recurrenceMultiplier,
    faction: {
      active: r.faction.active,
      name: r.faction.name,
      disposition: r.faction.disposition,
      leader: r.faction.leader,
      formalInfluence: r.faction.formalInfluence,
      promiseCount: r.faction.promiseRegistry.length,
      promises: [...r.faction.promiseRegistry]
    },
    thresholds: PRESSURE_THRESHOLDS,
    isOrganized: r.pressure >= PRESSURE_THRESHOLDS.organized,
    isRadical: r.pressure >= PRESSURE_THRESHOLDS.radical
  };
}

export function isOrganizedResistance() {
  return (gameState?.resistance?.pressure ?? 0) >= PRESSURE_THRESHOLDS.organized;
}

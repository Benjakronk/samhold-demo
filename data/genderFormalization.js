// ---- GENDER FORMALIZATION DATA ----
// Formal layer: 4 dimensions × 5 positions (-2 to +2)
// Restrictive ← Unformalized → Egalitarian (except Inheritance: Patrilineal ← Bilateral → Matrilineal)

export const GENDER_MIN_TURNS = 8; // 2 years before activation
export const GENDER_DRIFT_THRESHOLD = 30; // legitimacy below which egalitarian positions drift
export const GENDER_DRIFT_INTERVAL = 4;   // turns below threshold before one step drift toward 0
export const GENDER_DEEPEN_TURNS_REQUIRED = 4; // turns at ±1 before moving to ±2
export const GENDER_DEEPEN_LAG_TURNS = 4;      // internal lag after deepening

export const GENDER_MOVE_COSTS = {
  activate:  { legitimacy: -5, resistance: 10 },
  standard:  { legitimacy: -5, resistance: 10 },
  deepen:    { legitimacy: -8, satisfaction: -3, resistance: 15 },
  reverse:   { legitimacy: -6, resistance: 12 },
  dismantle: { legitimacy: -12, resistance: 25, transitionTurns: 6 }
};

// Governance model multipliers on movement costs
// Values < 1 = cheaper, > 1 = more expensive
export const GOVERNANCE_GENDER_MULTIPLIERS = {
  tribalCouncil: { restrictive: 1.4, egalitarian: 0.8 },
  chieftain:     { all: 0.7 },
  theocracy:     { dimensionOverrides: { civic: 0.6 } },
  monarchy:      { dimensionOverrides: { inheritance: 0.7 } },
  democracy:     { egalitarian: 0.7, restrictive: 1.3 },
  militaryRule:  { dimensionOverrides: { military: 0.5 } }
};

// Position labels for each dimension
export const GENDER_DIMENSIONS = {
  labor: {
    name: 'Labor Roles',
    icon: '🔨',
    description: 'Codifies which labor categories are gender-designated.',
    positions: {
      '-2': { label: 'Codified Division', description: 'Gender-restricted building assignments. Strong efficiency, brittle in crisis.' },
      '-1': { label: 'Customary Roles', description: 'Informal preferences formalized. Modest efficiency bonus.' },
       '0': { label: 'Unformalized', description: 'No formal policy. Informal nursing burden operates freely.' },
       '1': { label: 'Declared Equality', description: 'Formal equal access. Requires governance effort to maintain.' },
       '2': { label: 'Enforced Equality', description: 'Mandated equal labor access. Full flexibility, high maintenance cost.' }
    }
  },
  military: {
    name: 'Military Access',
    icon: '🛡️',
    description: 'Codifies whether all adults can serve as warriors.',
    positions: {
      '-2': { label: 'Service Banned', description: 'Restricted sex cannot serve. Eliminates their reproductive penalty but halves recruitment.' },
      '-1': { label: 'Service Discouraged', description: 'Restricted sex may serve but faces social friction. Reduced reproductive penalty.' },
       '0': { label: 'Unformalized', description: 'No formal policy. Full reproductive penalty applies to all military.' },
       '1': { label: 'Open Service', description: 'Formal equal military access. Shared service builds bonds.' },
       '2': { label: 'Mandated Inclusion', description: 'Units must include both sexes. Strongest bonds, steepest demographic cost.' }
    }
  },
  inheritance: {
    name: 'Inheritance & Property',
    icon: '📜',
    description: 'Codifies how class privilege passes across generations. Requires active class system.',
    positions: {
      '-2': { label: 'Patrilineal', description: 'Male-line only inheritance. Class shrinks over generations. Strong traditional legitimacy.' },
      '-1': { label: 'Male-Preference', description: 'Male heirs preferred. Gradual demographic shift in privileged class.' },
       '0': { label: 'Bilateral', description: 'Both sexes inherit equally. Privileged class stable in composition.' },
       '1': { label: 'Female-Preference', description: 'Female heirs preferred. Gradual shift toward female-heavy privileged class.' },
       '2': { label: 'Matrilineal', description: 'Female-line only inheritance. Distinctive cultural identity. Class shrinks.' }
    }
  },
  civic: {
    name: 'Ritual & Civic Authority',
    icon: '🏛️',
    description: 'Codifies which sex can hold religious standing or speak in council.',
    positions: {
      '-2': { label: 'Exclusive Authority', description: 'Only designated sex holds office. Strong identity, severe knowledge loss.' },
      '-1': { label: 'Preferred Authority', description: 'Designated sex leads; other participates. Moderate identity/legitimacy bonus.' },
       '0': { label: 'Unformalized', description: 'No formal policy. Authority open by default.' },
       '1': { label: 'Open Authority', description: 'Both sexes in all civic roles. Builds trust and bonds.' },
       '2': { label: 'Mandated Representation', description: 'Leadership must include both sexes. Strongest fabric, slower governance.' }
    }
  }
};

// Per-turn effects by dimension and position
// Each returns: { production, trustBaseline, identity, legitimacy, satisfaction, bonds, knowledge, maintenanceLegitimacy, reproPenaltyMod, policyLagMod, crisisFlexibility }
export const GENDER_EFFECTS = {
  labor: {
    '-2': { production: 0.12, trustBaseline: -0.05, crisisFlexibility: 0.5 },
    '-1': { production: 0.05, trustBaseline: -0.02, crisisFlexibility: 0.75 },
     '0': {},
     '1': { trustBaseline: 0.01, maintenanceLegitimacy: -0.1 },
     '2': { trustBaseline: 0.03, knowledge: 0.05, maintenanceLegitimacy: -0.2 }
  },
  military: {
    '-2': { reproPenaltyMod: 0, legitimacy: 0.10 },     // eliminates repro penalty; leg only under Chieftain/MilRule (checked in code)
    '-1': { reproPenaltyMod: 0.5, legitimacy: 0.05 },   // 50% reduction; leg only under traditional gov
     '0': { reproPenaltyMod: 1.0 },
     '1': { bonds: 0.05 },
     '2': { bonds: 0.08, identity: 0.03, maintenanceLegitimacy: -0.1 }
  },
  inheritance: {
    '-2': { trustBaseline: -0.04, legitimacy: 0.08 },    // leg only under Monarchy/Chieftain
    '-1': { trustBaseline: -0.02, legitimacy: 0.04 },    // leg only under traditional gov
     '0': {},
     '1': { trustBaseline: -0.02 },
     '2': { trustBaseline: -0.04, identity: 0.05 }
  },
  civic: {
    '-2': { identity: 0.10, legitimacy: 0.06, knowledgePenalty: 0.40, trustBaseline: -0.04 },  // leg only under Theocracy/TC
    '-1': { identity: 0.05, legitimacy: 0.03, knowledgePenalty: 0.15, trustBaseline: -0.02 },
     '0': {},
     '1': { trustBaseline: 0.02, bonds: 0.02 },
     '2': { trustBaseline: 0.03, bonds: 0.04, knowledge: 0.05, maintenanceLegitimacy: -0.15, policyLagMod: 1 }
  }
};

// Which governance models grant legitimacy bonuses for specific dimension positions
export const GENDER_LEGITIMACY_GATES = {
  military: {
    '-2': ['chieftain', 'militaryRule'],
    '-1': ['chieftain', 'militaryRule', 'tribalCouncil']
  },
  inheritance: {
    '-2': ['monarchy', 'chieftain'],
    '-1': ['monarchy', 'chieftain', 'tribalCouncil']
  },
  civic: {
    '-2': ['theocracy', 'tribalCouncil'],
    '-1': ['theocracy', 'tribalCouncil']
  }
};

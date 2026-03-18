// ---- CLASS SYSTEM DATA ----
// Stratification bases, differential dimensions, affinities, and costs

export const MIN_TURNS_FOR_ACTIVATION = 8; // 2 years

export const ACTIVATION_COSTS = {
  legitimacy: -10,
  satisfaction: -8,
  resistancePressure: 15
};

export const DISMANTLEMENT_COSTS = {
  legitimacy: -20,
  resistancePressure: 25,
  satisfactionPenalty: -12,
  satisfactionDuration: 4,
  trustDriftDuration: 5
};

export const BASIS_CHANGE_COSTS = {
  legitimacy: -15,
  resistancePressure: 20,
  satisfactionPenalty: -5,
  satisfactionDuration: 3
};

export const AFFINITY_BONUS = { positiveScale: 1.25, negativeSuppression: 0.85 };
export const AFFINITY_PENALTY = { positiveScale: 0.75, negativeAmplification: 1.15 };

export const CRIME_MULTIPLIER_WEIGHTS = {
  economic: 0.2,
  legal: 0.15,
  social: 0.08,
  political: 0.05
};

export const STRATIFICATION_BASES = {
  property: {
    name: 'Property Ownership',
    icon: '💰',
    description: 'Those who hold property above a threshold gain status. Fluid and volatile — bad harvests can strip privilege.',
    governanceAlignment: {
      tribalCouncil: 'moderate',
      chieftain: 'strong',
      theocracy: 'weak'
    },
    privilegedClassType: 'dynamic',
    strongDifferentials: ['economic'],
    weakDifferentials: ['social']
  },
  lineage: {
    name: 'Lineage',
    icon: '👑',
    description: 'Founding families hold permanent status. Stable but brittle — the privileged class shrinks as a share of population over time.',
    governanceAlignment: {
      tribalCouncil: 'strong',
      chieftain: 'moderate',
      theocracy: 'moderate'
    },
    privilegedClassType: 'fixed',
    strongDifferentials: ['social', 'legal'],
    weakDifferentials: ['economic']
  },
  religious: {
    name: 'Religious Standing',
    icon: '🔮',
    description: 'Religious specialists — priests, ritual leaders — hold privileged status. Constrained by knowledge level.',
    governanceAlignment: {
      tribalCouncil: 'moderate',
      chieftain: 'weak',
      theocracy: 'strong'
    },
    privilegedClassType: 'constrained',
    strongDifferentials: ['social', 'political'],
    weakDifferentials: ['economic']
  },
  military: {
    name: 'Military Service',
    icon: '⚔️',
    description: 'Active soldiers and recent veterans hold status. Expands during conflict, contracts during peace.',
    governanceAlignment: {
      tribalCouncil: 'moderate',
      chieftain: 'strong',
      theocracy: 'weak'
    },
    privilegedClassType: 'military',
    strongDifferentials: ['legal', 'economic'],
    weakDifferentials: ['political']
  }
};

export const DIFFERENTIALS = {
  economic: {
    name: 'Economic',
    icon: '🪙',
    description: 'Resource allocation, taxation, and labor requirements.',
    tiers: [
      { label: 'Equal', description: 'No economic distinction. Classes differ in status only.' },
      { label: 'Preferential', description: 'Privileged class served first during scarcity. Commons bear slightly higher labor obligations.' },
      { label: 'Stratified', description: 'Privileged class exempt from labor rotation. +20% production. Crime among commons increased.' }
    ]
  },
  legal: {
    name: 'Legal',
    icon: '⚖️',
    description: 'Justice, dispute resolution, and policy protection.',
    tiers: [
      { label: 'Equal', description: 'No legal distinction. Justice policy applies uniformly.' },
      { label: 'Preferential', description: 'Privileged class receives lighter justice. +0.2 legitimacy/turn among privileged.' },
      { label: 'Stratified', description: 'Formal legal standing above commons. +0.5 legitimacy/turn among privileged. Resistance increased.' }
    ]
  },
  political: {
    name: 'Political',
    icon: '🏛️',
    description: 'Participation in governance and advisory access.',
    tiers: [
      { label: 'Equal', description: 'No political distinction. Governance applies equally.' },
      { label: 'Preferential', description: 'Privileged class has advisory access. +0.3 legitimacy/turn under aligned governance.' },
      { label: 'Stratified', description: 'Formal veto rights over policies affecting privileged standing. +0.6 legitimacy/turn while satisfied.' }
    ]
  },
  social: {
    name: 'Social',
    icon: '👥',
    description: 'Cultural standing, ritual access, and recognition.',
    tiers: [
      { label: 'Equal', description: 'No social distinction. Cultural identity applies uniformly.' },
      { label: 'Preferential', description: 'Distinct recognition for privileged class. Interpersonal trust baseline reduced by 0.05.' },
      { label: 'Stratified', description: 'Formal social separation. Strong identity for privileged, weakened for commons. Trust baseline −0.15.' }
    ]
  }
};

// Governance alignment multipliers
export const ALIGNMENT_MULTIPLIERS = {
  strong: 1.3,
  moderate: 1.0,
  weak: 0.7
};

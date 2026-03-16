// ---- SHARED VALUES DATA ----
// Values emerge organically from sustained policy choices.
// Each policy axis has three zones (high/mid/low), each mapping to a named value.

export const VALUE_DEFINITIONS = {
  // Freedom axis (0-100)
  freedom_high: {
    name: 'Liberty',
    icon: '🕊️',
    axis: 'freedom',
    zone: 'high',
    threshold: 70,       // slider must be >= this
    description: 'Our people believe in personal freedom and self-determination.',
    educationalNote: 'Free societies innovate but struggle with coordination.'
  },
  freedom_mid: {
    name: 'Balance',
    icon: '⚖️',
    axis: 'freedom',
    zone: 'mid',
    thresholdLow: 35,
    thresholdHigh: 65,
    description: 'Our people value a balance between individual liberty and collective order.',
    educationalNote: 'Most stable societies find a middle ground, though where that line falls is always contested.'
  },
  freedom_low: {
    name: 'Discipline',
    icon: '🛡️',
    axis: 'freedom',
    zone: 'low',
    threshold: 30,       // slider must be <= this
    description: 'Our people value order, structure, and collective duty above personal freedom.',
    educationalNote: 'Disciplined societies can mobilize quickly but may suppress dissent.'
  },

  // Mercy axis (0-100)
  mercy_high: {
    name: 'Compassion',
    icon: '💛',
    axis: 'mercy',
    zone: 'high',
    threshold: 70,
    description: 'Our people believe in forgiveness, rehabilitation, and second chances.',
    educationalNote: 'Compassionate justice preserves population but requires resources and patience.'
  },
  mercy_mid: {
    name: 'Fairness',
    icon: '⚖️',
    axis: 'mercy',
    zone: 'mid',
    thresholdLow: 35,
    thresholdHigh: 65,
    description: 'Our people believe in proportionate justice — neither cruel nor permissive.',
    educationalNote: 'Perceived fairness is one of the strongest predictors of social stability.'
  },
  mercy_low: {
    name: 'Justice',
    icon: '⚔️',
    axis: 'mercy',
    zone: 'low',
    threshold: 30,
    description: 'Our people believe in strict accountability and swift consequences.',
    educationalNote: 'Harsh justice deters but can breed resentment, especially when applied unequally.'
  },

  // Tradition axis (0-100)
  tradition_high: {
    name: 'Heritage',
    icon: '🏛️',
    axis: 'tradition',
    zone: 'high',
    threshold: 70,
    description: 'Our people revere ancestral practices and resist change.',
    educationalNote: 'Tradition preserves hard-won wisdom but can prevent necessary adaptation.'
  },
  tradition_mid: {
    name: 'Adaptability',
    icon: '🔄',
    axis: 'tradition',
    zone: 'mid',
    thresholdLow: 35,
    thresholdHigh: 65,
    description: 'Our people honor the past while embracing useful change.',
    educationalNote: 'Societies that balance tradition with openness to change tend to be the most resilient.'
  },
  tradition_low: {
    name: 'Progress',
    icon: '🔬',
    axis: 'tradition',
    zone: 'low',
    threshold: 30,
    description: 'Our people embrace innovation and view the old ways with skepticism.',
    educationalNote: 'Progressive societies gain knowledge faster but may lose cultural grounding.'
  },

  // Working Age (6-16)
  workingAge_high: {
    name: 'Protected Childhood',
    icon: '🎒',
    axis: 'workingAge',
    zone: 'high',
    threshold: 13,       // working age >= this
    description: 'Our people believe children deserve years of learning before they work.',
    educationalNote: 'Extended childhood allows education and play, but is a luxury not all societies can afford.'
  },
  workingAge_mid: {
    name: 'Balanced Upbringing',
    icon: '🌱',
    axis: 'workingAge',
    zone: 'mid',
    thresholdLow: 9,
    thresholdHigh: 12,
    description: 'Our people raise children with a mix of learning and gradual responsibility.',
    educationalNote: 'Most historical societies transitioned children to work roles between ages 8-12.'
  },
  workingAge_low: {
    name: 'Pragmatism',
    icon: '🔨',
    axis: 'workingAge',
    zone: 'low',
    threshold: 8,        // working age <= this
    description: 'Our people believe everyone must contribute as soon as they are able.',
    educationalNote: 'Child labor was universal in early societies — not from cruelty, but from necessity.'
  },

  // Ration Priority
  ration_people: {
    name: 'Civilian Protection',
    icon: '🏠',
    axis: 'rationPriority',
    zone: 'people',
    description: 'Our people believe civilians should eat before warriors.',
    educationalNote: 'Prioritizing civilians preserves the workforce but leaves the military vulnerable.'
  },
  ration_equal: {
    name: 'Equality',
    icon: '🤝',
    axis: 'rationPriority',
    zone: 'equal',
    description: 'Our people believe all members deserve equal sustenance, warrior or farmer.',
    educationalNote: 'Egalitarian distribution is philosophically compelling but can weaken both groups in a crisis.'
  },
  ration_military: {
    name: 'Military Honor',
    icon: '🗡️',
    axis: 'rationPriority',
    zone: 'military',
    description: 'Our people believe those who risk their lives in defense deserve to eat first.',
    educationalNote: 'Warrior-caste privilege exists in many societies — it ensures a strong military but breeds class resentment.'
  }
};

// How many turns a policy must stay in a zone before the value crystallizes
export const VALUE_CRYSTALLIZE_TURNS = 8;

// Identity bonus per turn from a recognized value (scales with strength)
export const VALUE_IDENTITY_BASE = 0.3;
export const VALUE_IDENTITY_MAX = 1.5;

// Violation penalties (per pillar)
export const VIOLATION_PENALTY = {
  adjacent: { identity: -5, legitimacy: -8 },   // moved to neighboring zone
  opposite: { identity: -12, legitimacy: -15 }   // moved to opposite zone
};

// Strength gained per turn after crystallization
export const VALUE_STRENGTH_PER_TURN = 0.1;

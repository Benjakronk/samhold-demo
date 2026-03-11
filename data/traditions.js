// ---- TRADITION DEFINITIONS ----
// Data-driven tradition templates. Each tradition fires at a set interval,
// costs resources, and provides cohesion bonuses. Once established,
// traditions become costly to abandon.

export const TRADITIONS = {
  the_gathering: {
    name: 'The Gathering',
    description: 'A seasonal meeting where the entire community shares news, resolves disputes, and strengthens bonds.',
    interval: 4,
    season: 'Summer',
    cost: { food: 5, materials: 0 },
    effects: { identity: 2, satisfaction: 0, bonds: 2, legitimacy: 0 },
    unlockCondition: null,
    starter: true,
    icon: '🔥'
  },
  harvest_festival: {
    name: 'Harvest Festival',
    description: 'A grand autumn celebration with feasting, music, and thanksgiving for the year\'s bounty.',
    interval: 8,
    season: 'Autumn',
    cost: { food: 15, materials: 5 },
    effects: { identity: 3, satisfaction: 5, bonds: 0, legitimacy: 0 },
    unlockCondition: 'farms_2',
    starter: false,
    icon: '🎉'
  },
  coming_of_age: {
    name: 'Coming-of-Age Ceremony',
    description: 'A sacred rite marking the transition from childhood to adulthood, recognizing a young person\'s place in the community.',
    interval: 0,
    triggerOn: 'graduation',
    cost: { food: 3, materials: 0 },
    effects: { identity: 2, satisfaction: 0, bonds: 3, legitimacy: 0 },
    unlockCondition: 'working_age_12',
    starter: false,
    icon: '🌟'
  },
  remembrance: {
    name: 'Remembrance of the Dead',
    description: 'A solemn winter gathering to honor those lost. Stories of the departed are shared, binding the living together through memory.',
    interval: 4,
    season: 'Winter',
    cost: { food: 5, materials: 0 },
    effects: { identity: 2, satisfaction: 0, bonds: 4, legitimacy: 0 },
    unlockCondition: 'deaths_occurred',
    starter: false,
    icon: '🕯️'
  },
  founding_day: {
    name: 'Founding Day',
    description: 'An annual celebration of the settlement\'s founding. Elders retell the founding story while the young listen.',
    interval: 4,
    season: 'Spring',
    cost: { food: 10, materials: 0 },
    effects: { identity: 4, satisfaction: 0, bonds: 0, legitimacy: 2 },
    unlockCondition: 'year_3',
    starter: false,
    icon: '🏛️'
  },
  river_blessing: {
    name: 'River Blessing',
    description: 'A quiet ceremony at the water\'s edge, giving thanks for the life-giving river and asking for continued bounty.',
    interval: 4,
    season: null,
    cost: { food: 3, materials: 0 },
    effects: { identity: 0, satisfaction: 2, bonds: 1, legitimacy: 0 },
    unlockCondition: 'near_river',
    starter: false,
    icon: '💧'
  }
};

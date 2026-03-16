// ---- EVENT LIBRARY ----
// Defines all possible events that can occur during gameplay

export const EVENT_LIBRARY = {
  harshWinter: {
    id: 'harshWinter',
    title: 'Harsh Winter Approaches',
    category: 'environmental',
    triggers: {
      seasons: ['autumn'],
      minTurn: 8,
      probability: 0.20,
      conditions: [
        { type: 'resource', resource: 'food', operator: '<', value: 200 }
      ]
    },
    description: 'Weather signs suggest this winter will be especially harsh. Your people look to you for guidance on how to prepare.',
    choices: [
      {
        id: 'stockpile',
        text: 'Mandate food stockpiling',
        description: 'Force all families to save extra food for the harsh months ahead',
        consequences: {
          immediate: { satisfaction: -8, legitimacy: -3 },
          winter: { winterFoodReduction: 0.3 }
        }
      },
      {
        id: 'gather',
        text: 'Organize gathering expeditions',
        description: 'Send workers to collect winter provisions from the wilderness',
        consequences: {
          immediate: { food: 25, satisfaction: 3, materials: 5 },
          requirements: { population: 15 }
        }
      },
      {
        id: 'trust',
        text: 'Trust in our resilience',
        description: 'Have faith that we will endure as we always have',
        consequences: {
          immediate: { identity: 5, bonds: 3, legitimacy: 2 },
          winter: { starvationMultiplier: 1.3 }
        }
      }
    ]
  },

  religiousSchism: {
    id: 'religiousSchism',
    title: 'Religious Disagreement',
    category: 'social',
    spiritualUnlock: true,
    triggers: {
      seasons: ['spring', 'summer', 'autumn'],
      minTurn: 12,
      probability: 0.15,
      conditions: [
        { type: 'governance', model: 'theocracy', negate: true },
        { type: 'cohesion', pillar: 'identity', operator: '>', value: 65 }
      ]
    },
    description: 'A dispute has arisen about proper rituals and beliefs. Some call for returning to older ways, while others embrace new interpretations.',
    choices: [
      {
        id: 'enforce',
        text: 'Enforce orthodox practices',
        description: 'Firmly establish which beliefs are correct',
        consequences: {
          immediate: { legitimacy: 6, identity: -4, satisfaction: -5 },
          effects: { traditionBonus: 3 }
        }
      },
      {
        id: 'allow',
        text: 'Allow diverse interpretations',
        description: 'Let people practice as they see fit',
        consequences: {
          immediate: { satisfaction: 4, identity: -2, bonds: -3 },
          effects: { freedomBonus: 2 }
        }
      },
      {
        id: 'council',
        text: 'Call a council of elders',
        description: 'Let the community decide together',
        consequences: {
          immediate: { legitimacy: 2, bonds: 4 },
          requirements: { governance: 'tribalCouncil' },
          delay: 2
        }
      }
    ]
  },

  refugeeArrival: {
    id: 'refugeeArrival',
    title: 'Refugees Seek Shelter',
    category: 'external',
    triggers: {
      seasons: ['spring', 'summer'],
      minTurn: 15,
      probability: 0.12,
      conditions: [
        { type: 'cohesion', pillar: 'satisfaction', operator: '>', value: 50 }
      ]
    },
    description: 'A small group of displaced people arrives at your borders, seeking shelter from troubles in distant lands. They look hungry and desperate.',
    choices: [
      {
        id: 'welcome',
        text: 'Welcome them warmly',
        description: 'Offer food, shelter, and full membership in our society',
        consequences: {
          immediate: { population: 4, food: -30, satisfaction: 3, bonds: 5 },
          effects: { identityDilution: true }
        }
      },
      {
        id: 'cautious',
        text: 'Accept with conditions',
        description: 'Allow them to stay but they must prove their worth',
        consequences: {
          immediate: { population: 2, food: -15, legitimacy: 2 },
          delay: 4,
          followUp: 'refugeeIntegration'
        }
      },
      {
        id: 'refuse',
        text: 'Turn them away',
        description: 'We cannot afford to feed more mouths',
        consequences: {
          immediate: { identity: -6, satisfaction: -8, legitimacy: -4 },
          effects: { isolationBonus: 2 }
        }
      }
    ]
  },

  tradeOpportunity: {
    id: 'tradeOpportunity',
    title: 'Traveling Merchants',
    category: 'economic',
    triggers: {
      seasons: ['spring', 'summer', 'autumn'],
      minTurn: 10,
      probability: 0.18,
      conditions: [
        { type: 'resource', resource: 'materials', operator: '>', value: 50 }
      ]
    },
    description: 'A group of traveling merchants has arrived, offering to trade exotic goods for your materials. Their wares could benefit your people, but at a cost.',
    choices: [
      {
        id: 'trade',
        text: 'Accept the trade',
        description: 'Exchange materials for exotic goods and knowledge',
        consequences: {
          immediate: { materials: -40, satisfaction: 6, knowledge: 8 }
        }
      },
      {
        id: 'negotiate',
        text: 'Attempt to negotiate',
        description: 'Try to get better terms through diplomacy',
        consequences: {
          immediate: { materials: -25, satisfaction: 3, knowledge: 4, legitimacy: 2 },
          requirements: { governance: 'chieftainship', negate: true }
        }
      },
      {
        id: 'decline',
        text: 'Politely decline',
        description: 'Keep our resources but miss the opportunity',
        consequences: {
          immediate: { identity: 3, satisfaction: -2 }
        }
      }
    ]
  },

  powerStruggle: {
    id: 'powerStruggle',
    title: 'Challenge to Leadership',
    category: 'governance',
    triggers: {
      seasons: ['spring', 'summer', 'autumn', 'winter'],
      minTurn: 20,
      probability: 0.12,
      conditions: [
        { type: 'cohesion', pillar: 'legitimacy', operator: '<', value: 40 },
        { type: 'population', operator: '>', value: 25 }
      ]
    },
    description: 'A charismatic rival has emerged, questioning your leadership and promising a different path for the settlement. Support is growing for their vision.',
    choices: [
      {
        id: 'confront',
        text: 'Confront them directly',
        description: 'Challenge their claims in a public forum',
        consequences: {
          immediate: { legitimacy: 8, satisfaction: -4, bonds: -5 },
          requirements: { governance: 'autocracy' }
        }
      },
      {
        id: 'compromise',
        text: 'Seek compromise',
        description: 'Offer to share power and incorporate their ideas',
        consequences: {
          immediate: { legitimacy: 3, satisfaction: 5, bonds: 2, identity: -2 },
          effects: { sharedPower: true }
        }
      },
      {
        id: 'step_down',
        text: 'Consider stepping aside',
        description: 'Perhaps new leadership is what the people need',
        consequences: {
          immediate: { legitimacy: -10, satisfaction: 3, bonds: 6, identity: 4 },
          effects: { leadershipChange: true }
        }
      }
    ]
  },

  mysteriousDisease: {
    id: 'mysteriousDisease',
    title: 'Strange Illness Spreads',
    category: 'crisis',
    spiritualUnlock: true,
    triggers: {
      seasons: ['autumn', 'winter'],
      minTurn: 12,
      probability: 0.08,
      conditions: [
        { type: 'population', operator: '>', value: 30 }
      ]
    },
    description: 'A mysterious ailment has begun affecting your people. They suffer from weakness and fever. The elders debate whether this is natural or supernatural.',
    choices: [
      {
        id: 'quarantine',
        text: 'Enforce strict quarantine',
        description: 'Isolate the sick to prevent further spread',
        consequences: {
          immediate: { satisfaction: -6, bonds: -4, legitimacy: 3 },
          effects: { diseaseContained: true }
        }
      },
      {
        id: 'herbs',
        text: 'Gather medicinal herbs',
        description: 'Send expeditions to find healing plants',
        consequences: {
          immediate: { satisfaction: 4, bonds: 2, population: -2 },
          requirements: { buildings: ['Hunting Camp'], minCount: 1 }
        }
      },
      {
        id: 'ritual',
        text: 'Perform healing rituals',
        description: 'Call upon spiritual forces for aid',
        consequences: {
          immediate: { identity: 6, satisfaction: 3, legitimacy: 2 },
          effects: { spiritualHealing: true }
        }
      }
    ]
  },

  abundantHarvest: {
    id: 'abundantHarvest',
    title: 'Exceptional Harvest',
    category: 'environmental',
    triggers: {
      seasons: ['autumn'],
      minTurn: 6,
      probability: 0.15,
      conditions: [
        { type: 'buildings', building: 'Farm', operator: '>=', value: 2 }
      ]
    },
    description: 'The harvest this season has exceeded all expectations. Your granaries overflow with grain, and your people speak of prosperity.',
    choices: [
      {
        id: 'celebrate',
        text: 'Hold a great feast',
        description: 'Celebrate our good fortune with the entire community',
        consequences: {
          immediate: { food: -30, satisfaction: 8, bonds: 6, identity: 4 }
        }
      },
      {
        id: 'store',
        text: 'Store the surplus',
        description: 'Save the extra food for leaner times',
        consequences: {
          immediate: { food: 60, satisfaction: 2, legitimacy: 3 }
        }
      },
      {
        id: 'expand',
        text: 'Plan expansion',
        description: 'Use our prosperity to grow the settlement',
        consequences: {
          immediate: { food: 20, materials: 15, satisfaction: 4 },
          effects: { expansionBonus: 2 }
        }
      }
    ]
  },

  explorerReturn: {
    id: 'explorerReturn',
    title: 'Explorer Returns with News',
    category: 'exploration',
    triggers: {
      seasons: ['spring', 'summer'],
      minTurn: 18,
      probability: 0.10,
      conditions: [
        { type: 'revealed_hexes', operator: '>', value: 150 }
      ]
    },
    description: 'One of your scouts has returned from a long journey to distant lands, bringing tales of what lies beyond your territory.',
    choices: [
      {
        id: 'new_site',
        text: 'Investigate the new site',
        description: 'Send a party to explore the promising location they described',
        consequences: {
          immediate: { satisfaction: 5, knowledge: 6, population: -2 },
          delay: 6,
          followUp: 'explorationResult'
        }
      },
      {
        id: 'trade_route',
        text: 'Establish trade contact',
        description: 'Focus on building relationships with distant settlements',
        consequences: {
          immediate: { materials: 20, satisfaction: 3, bonds: -2 },
          effects: { tradeRoute: true }
        }
      },
      {
        id: 'stay_home',
        text: 'Focus on home',
        description: 'The outside world is interesting, but we have work here',
        consequences: {
          immediate: { identity: 4, legitimacy: 2, satisfaction: -1 }
        }
      }
    ]
  },

  innovationBreakthrough: {
    id: 'innovationBreakthrough',
    title: 'Technological Discovery',
    category: 'cultural',
    triggers: {
      seasons: ['spring', 'summer', 'autumn', 'winter'],
      minTurn: 15,
      probability: 0.12,
      conditions: [
        { type: 'resource', resource: 'knowledge', operator: '>', value: 60 },
        { type: 'buildings', building: 'Lumber Camp', operator: '>=', value: 1 }
      ]
    },
    description: 'Your craftspeople have developed an improved technique that could benefit the entire settlement. The question is how to implement this advancement.',
    choices: [
      {
        id: 'share_freely',
        text: 'Share knowledge freely',
        description: 'Teach everyone the new methods immediately',
        consequences: {
          immediate: { satisfaction: 6, bonds: 4, materials: 10, legitimacy: 2 }
        }
      },
      {
        id: 'guild_control',
        text: 'Form a craft guild',
        description: 'Create a formal organization to control and refine the technique',
        consequences: {
          immediate: { materials: 5, legitimacy: 4, bonds: -2, satisfaction: -3 },
          effects: { craftGuild: true }
        }
      },
      {
        id: 'leadership_only',
        text: 'Keep it restricted',
        description: 'Only trusted leaders should control this knowledge',
        consequences: {
          immediate: { legitimacy: 6, satisfaction: -8, bonds: -6, identity: -3 },
          effects: { secretKnowledge: true }
        }
      }
    ]
  }
};
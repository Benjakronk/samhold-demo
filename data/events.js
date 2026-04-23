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
          immediate: { satisfaction: -8, legitimacy: -3, trustEffects: { institutional: -0.05 }, policyEffects: { shifts: { freedom: -8, mercy: -5 } } },
          winter: { winterFoodReduction: 0.3 }
        }
      },
      {
        id: 'gather',
        text: 'Organize gathering expeditions',
        description: 'Send workers to collect winter provisions from the wilderness',
        consequences: {
          immediate: { food: 25, satisfaction: 3, materials: 5, trustEffects: { interpersonal: 0.03 } },
          requirements: { population: 15 }
        }
      },
      {
        id: 'trust',
        text: 'Trust in our resilience',
        description: 'Have faith that we will endure as we always have',
        consequences: {
          immediate: { identity: 5, bonds: 3, legitimacy: 2, trustEffects: { interpersonal: 0.05 }, policyEffects: { shifts: { tradition: 5 } } },
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
          immediate: { legitimacy: 6, identity: -4, satisfaction: -5, trustEffects: { interpersonal: -0.08 }, policyEffects: { shifts: { tradition: 8, freedom: -6 }, locks: [{ policy: 'tradition', direction: 'min', floor: 'current', turns: 4 }] } },
          effects: { traditionBonus: 3 }
        }
      },
      {
        id: 'allow',
        text: 'Allow diverse interpretations',
        description: 'Let people practice as they see fit',
        consequences: {
          immediate: { satisfaction: 4, identity: -2, bonds: -3, trustEffects: { interpersonal: -0.05 }, policyEffects: { shifts: { freedom: 6, tradition: -5 } } },
          effects: { freedomBonus: 2 }
        }
      },
      {
        id: 'council',
        text: 'Call a council of elders',
        description: 'Let the community decide together',
        consequences: {
          immediate: { legitimacy: 2, bonds: 4, trustEffects: { interpersonal: 0.05 } },
          requirements: { governance: 'tribalCouncil' },
          delay: 2,
          delayedEffects: { identity: 3, satisfaction: 2, bonds: 3, knowledge: 2 }
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
          immediate: { population: 4, food: -30, satisfaction: 3, bonds: 5, trustEffects: { interpersonal: 0.05 }, policyEffects: { shifts: { isolation: -8 } } },
          effects: { identityDilution: true }
        }
      },
      {
        id: 'cautious',
        text: 'Accept with conditions',
        description: 'Allow them to stay but they must prove their worth',
        consequences: {
          immediate: { population: 2, food: -15, legitimacy: 2, trustEffects: { institutional: 0.03 }, policyEffects: { shifts: { isolation: -3 } } },
          delay: 4,
          followUp: 'refugeeIntegration'
        }
      },
      {
        id: 'refuse',
        text: 'Turn them away',
        description: 'We cannot afford to feed more mouths',
        consequences: {
          immediate: { identity: -6, satisfaction: -8, legitimacy: -4, trustEffects: { interpersonal: -0.10, institutional: -0.05 }, policyEffects: { shifts: { isolation: 8 } } },
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
          immediate: { materials: -40, satisfaction: 6, knowledge: 8, policyEffects: { shifts: { isolation: -5 } } }
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
          immediate: { identity: 3, satisfaction: -2, policyEffects: { shifts: { isolation: 5 } } }
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
          immediate: { legitimacy: 8, satisfaction: -4, bonds: -5, trustEffects: { institutional: -0.10 }, policyEffects: { shifts: { freedom: -8 }, locks: [{ policy: 'freedom', direction: 'max', ceiling: 'current', turns: 4 }] } },
          requirements: { governance: 'autocracy' }
        }
      },
      {
        id: 'compromise',
        text: 'Seek compromise',
        description: 'Offer to share power and incorporate their ideas',
        consequences: {
          immediate: { legitimacy: 3, satisfaction: 5, bonds: 2, identity: -2, trustEffects: { institutional: 0.05 }, policyEffects: { shifts: { freedom: 5 } } },
          effects: { sharedPower: true }
        }
      },
      {
        id: 'step_down',
        text: 'Consider stepping aside',
        description: 'Perhaps new leadership is what the people need',
        consequences: {
          immediate: { legitimacy: -10, satisfaction: 3, bonds: 6, identity: 4, trustEffects: { institutional: -0.15, interpersonal: 0.05 }, policyEffects: { shifts: { freedom: 12 } } },
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
          immediate: { satisfaction: -6, bonds: -4, legitimacy: 3, trustEffects: { interpersonal: -0.08 }, policyEffects: { shifts: { freedom: -6, mercy: -5 } } },
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
          immediate: { identity: 6, satisfaction: 3, legitimacy: 2, trustEffects: { interpersonal: 0.05 }, policyEffects: { shifts: { tradition: 5 } } },
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
          immediate: { food: -30, satisfaction: 8, bonds: 6, identity: 4, trustEffects: { interpersonal: 0.05 }, policyEffects: { shifts: { mercy: 5 } } }
        }
      },
      {
        id: 'store',
        text: 'Store the surplus',
        description: 'Save the extra food for leaner times',
        consequences: {
          immediate: { food: 60, satisfaction: 2, legitimacy: 3, trustEffects: { institutional: 0.03 } }
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
          immediate: { materials: 20, satisfaction: 3, bonds: -2, policyEffects: { shifts: { isolation: -5 } } },
          effects: { tradeRoute: true }
        }
      },
      {
        id: 'stay_home',
        text: 'Focus on home',
        description: 'The outside world is interesting, but we have work here',
        consequences: {
          immediate: { identity: 4, legitimacy: 2, satisfaction: -1, policyEffects: { shifts: { isolation: 3 } } }
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
          immediate: { satisfaction: 6, bonds: 4, materials: 10, legitimacy: 2, trustEffects: { interpersonal: 0.05 }, policyEffects: { shifts: { freedom: 5 } } }
        }
      },
      {
        id: 'guild_control',
        text: 'Form a craft guild',
        description: 'Create a formal organization to control and refine the technique',
        consequences: {
          immediate: { materials: 5, legitimacy: 4, bonds: -2, satisfaction: -3, trustEffects: { institutional: 0.03, interpersonal: -0.05 } },
          effects: { craftGuild: true }
        }
      },
      {
        id: 'leadership_only',
        text: 'Keep it restricted',
        description: 'Only trusted leaders should control this knowledge',
        consequences: {
          immediate: { legitimacy: 6, satisfaction: -8, bonds: -6, identity: -3, trustEffects: { institutional: 0.05, interpersonal: -0.10 }, policyEffects: { shifts: { freedom: -8 } } },
          effects: { secretKnowledge: true }
        }
      }
    ]
  },

  // ---- CULTURAL EVENTS ----

  traditionUnderStrain: {
    id: 'traditionUnderStrain',
    title: 'Tradition Under Strain',
    category: 'cultural',
    triggers: {
      seasons: ['spring', 'summer', 'autumn', 'winter'],
      minTurn: 12,
      probability: 0.15,
      conditions: [
        { type: 'tradition_count', operator: '>=', value: 1 },
        { type: 'resource', resource: 'food', operator: '<', value: 80 }
      ]
    },
    description: 'Food stores are dangerously low, but a cherished tradition is due soon. The elders insist it must be honored. Others say survival comes first.',
    choices: [
      {
        id: 'honor',
        text: 'Honor the tradition',
        description: 'Spend the food. Our customs define us more than full bellies.',
        consequences: {
          immediate: { food: -20, identity: 6, bonds: 4, satisfaction: -3, trustEffects: { interpersonal: 0.05 }, policyEffects: { shifts: { tradition: 5 } } }
        }
      },
      {
        id: 'skip',
        text: 'Skip it this time',
        description: 'The ancestors would understand. We must eat to survive.',
        consequences: {
          immediate: { food: 10, identity: -5, bonds: -3, legitimacy: -2, trustEffects: { interpersonal: -0.05 }, policyEffects: { shifts: { tradition: -5 } } }
        }
      },
      {
        id: 'simplify',
        text: 'Hold a simpler version',
        description: 'Adapt the tradition to use fewer resources while keeping its spirit.',
        consequences: {
          immediate: { food: -5, identity: 2, satisfaction: 2, bonds: 1 }
        }
      }
    ]
  },

  youthRebellion: {
    id: 'youthRebellion',
    title: 'Youth Question the Old Ways',
    category: 'cultural',
    triggers: {
      seasons: ['spring', 'summer'],
      minTurn: 20,
      probability: 0.12,
      conditions: [
        { type: 'tradition_count', operator: '>=', value: 2 },
        { type: 'policy', policy: 'tradition', operator: '<', value: 60 }
      ]
    },
    description: 'The younger generation openly questions your oldest traditions. "Why do we still do this?" they ask. The elders are outraged, but the youth have supporters.',
    choices: [
      {
        id: 'suppress',
        text: 'Enforce respect for tradition',
        description: 'The young must learn that traditions carry the wisdom of generations.',
        consequences: {
          immediate: { identity: 4, satisfaction: -6, legitimacy: 3, bonds: -3, trustEffects: { institutional: 0.03, interpersonal: -0.08 }, policyEffects: { shifts: { tradition: 8, freedom: -5 }, locks: [{ policy: 'tradition', direction: 'min', floor: 'current', turns: 4 }] } }
        }
      },
      {
        id: 'adapt',
        text: 'Let traditions evolve',
        description: 'Allow the youth to reshape old practices with new meaning.',
        consequences: {
          immediate: { identity: -2, satisfaction: 5, bonds: 2, knowledge: 3, trustEffects: { interpersonal: 0.03 }, policyEffects: { shifts: { tradition: -8 } } }
        }
      },
      {
        id: 'debate',
        text: 'Hold a public debate',
        description: 'Let both sides make their case before the community.',
        consequences: {
          immediate: { bonds: 4, legitimacy: 2, identity: -1, trustEffects: { interpersonal: 0.05 } },
          delay: 3,
          followUp: 'youthDebateOutcome'
        }
      }
    ]
  },

  culturalRenaissance: {
    id: 'culturalRenaissance',
    title: 'Cultural Renaissance',
    category: 'cultural',
    triggers: {
      seasons: ['spring', 'summer'],
      minTurn: 24,
      probability: 0.10,
      conditions: [
        { type: 'has_stories', operator: '>=', value: 3 },
        { type: 'cohesion', pillar: 'identity', operator: '>', value: 60 },
        { type: 'resource', resource: 'knowledge', operator: '>', value: 40 }
      ]
    },
    description: 'A flowering of creative expression sweeps through your settlement. Storytellers weave new tales, artisans create beautiful works, and songs fill the air. This could be a defining moment for your culture.',
    choices: [
      {
        id: 'invest',
        text: 'Invest in the arts',
        description: 'Dedicate resources and labor to support this cultural flowering.',
        consequences: {
          immediate: { materials: -15, food: -10, identity: 8, satisfaction: 6, bonds: 4, trustEffects: { interpersonal: 0.08 }, policyEffects: { shifts: { tradition: 5 } } }
        }
      },
      {
        id: 'redirect',
        text: 'Redirect energy to production',
        description: 'Art is lovely but we need workers in the fields.',
        consequences: {
          immediate: { materials: 10, food: 10, identity: -4, satisfaction: -5, trustEffects: { interpersonal: -0.05 }, policyEffects: { shifts: { tradition: -4 } } }
        }
      },
      {
        id: 'celebrate',
        text: 'Celebrate but stay practical',
        description: 'Enjoy the moment without committing extra resources.',
        consequences: {
          immediate: { identity: 3, satisfaction: 3, bonds: 2, policyEffects: { shifts: { tradition: 2 } } }
        }
      }
    ]
  },

  sacredPlaceThreatened: {
    id: 'sacredPlaceThreatened',
    title: 'Sacred Place Threatened',
    category: 'cultural',
    triggers: {
      seasons: ['spring', 'summer', 'autumn', 'winter'],
      minTurn: 16,
      probability: 0.10,
      conditions: [
        { type: 'has_sacred_site' },
        { type: 'threats_active', operator: '>=', value: 1 }
      ]
    },
    description: 'Raiders have been spotted near one of your sacred sites. If they reach it, the desecration could shatter your people\'s spirit. But defending it means pulling warriors from the settlement.',
    choices: [
      {
        id: 'defend',
        text: 'Defend the sacred site',
        description: 'Send warriors to protect what matters most to our identity.',
        consequences: {
          immediate: { identity: 5, bonds: 4, satisfaction: -2, trustEffects: { interpersonal: 0.05, institutional: 0.03 } },
          effects: { sacredDefenseBonus: true }
        }
      },
      {
        id: 'fortify_home',
        text: 'Protect the settlement instead',
        description: 'Our people matter more than any place. Keep the warriors here.',
        consequences: {
          immediate: { identity: -6, bonds: -4, satisfaction: 3, legitimacy: 2, trustEffects: { interpersonal: -0.08 } }
        }
      },
      {
        id: 'negotiate',
        text: 'Offer tribute to the raiders',
        description: 'Perhaps we can buy them off before they reach the site.',
        consequences: {
          immediate: { materials: -25, food: -15, identity: 2, bonds: 1, trustEffects: { institutional: -0.05 } },
          effects: { raidersAppeased: true }
        }
      }
    ]
  },

  storyAtRisk: {
    id: 'storyAtRisk',
    title: 'A Story Fades from Memory',
    category: 'cultural',
    triggers: {
      seasons: ['autumn', 'winter'],
      minTurn: 20,
      probability: 0.12,
      conditions: [
        { type: 'has_stories', operator: '>=', value: 2 }
      ]
    },
    description: 'Your eldest storyteller grows frail, and with them, knowledge of your people\'s oldest tales. Without someone to learn these stories, they will be lost forever.',
    choices: [
      {
        id: 'apprentice',
        text: 'Assign an apprentice immediately',
        description: 'Pull a worker from the fields to learn before it\'s too late.',
        consequences: {
          immediate: { identity: 4, bonds: 3, satisfaction: 2, trustEffects: { interpersonal: 0.05 } }
        }
      },
      {
        id: 'record',
        text: 'Try to write the stories down',
        description: 'An imperfect record is better than no record at all.',
        consequences: {
          immediate: { knowledge: 5, identity: 2, bonds: -1 },
          requirements: { resource: 'knowledge', minValue: 30 }
        }
      },
      {
        id: 'accept_loss',
        text: 'Accept the natural cycle',
        description: 'Stories that cannot survive are not meant to. New ones will come.',
        consequences: {
          immediate: { identity: -4, bonds: -2, satisfaction: -1, trustEffects: { interpersonal: -0.05 } }
        }
      }
    ]
  },

  // ---- GOVERNANCE EVENTS ----

  successionCrisis: {
    id: 'successionCrisis',
    title: 'Succession Crisis',
    category: 'governance',
    triggers: {
      seasons: ['spring', 'summer', 'autumn', 'winter'],
      minTurn: 24,
      probability: 0.12,
      conditions: [
        { type: 'governance', model: 'monarchy' }
      ]
    },
    description: 'The ruler has died without a clear heir. Multiple claimants vie for the throne. The court is divided, and the people grow anxious. Who will lead?',
    choices: [
      {
        id: 'eldest',
        text: 'Support the eldest claimant',
        description: 'Tradition demands the eldest take the throne. Stability through precedent.',
        consequences: {
          immediate: { legitimacy: 4, identity: 3, satisfaction: -2, bonds: -3, trustEffects: { institutional: 0.05 }, policyEffects: { shifts: { tradition: 6 }, locks: [{ policy: 'tradition', direction: 'min', floor: 'current', turns: 4 }] } },
          effects: { monarchSuccession: 'eldest' }
        }
      },
      {
        id: 'capable',
        text: 'Choose the most capable',
        description: 'The realm needs strength, not bloodline. Pick the best leader.',
        consequences: {
          immediate: { legitimacy: -3, satisfaction: 4, identity: -2, knowledge: 3, trustEffects: { institutional: -0.05 }, policyEffects: { shifts: { tradition: -5, freedom: 4 } } },
          effects: { monarchSuccession: 'capable' }
        }
      },
      {
        id: 'council_decides',
        text: 'Let the people choose',
        description: 'Open the decision to a broader council. Unprecedented, but democratic.',
        consequences: {
          immediate: { legitimacy: -5, satisfaction: 6, bonds: 5, identity: -4, trustEffects: { institutional: -0.10, interpersonal: 0.05 }, policyEffects: { shifts: { freedom: 10, tradition: -8 } } },
          effects: { monarchSuccession: 'council' }
        }
      }
    ]
  },

  corruptOfficial: {
    id: 'corruptOfficial',
    title: 'Corrupt Official Discovered',
    category: 'governance',
    triggers: {
      seasons: ['spring', 'summer', 'autumn'],
      minTurn: 18,
      probability: 0.12,
      conditions: [
        { type: 'population', operator: '>', value: 25 },
        { type: 'resource', resource: 'materials', operator: '>', value: 80 }
      ]
    },
    description: 'A trusted official has been secretly hoarding food and materials for themselves while others went without. The evidence is clear. Your people demand justice.',
    choices: [
      {
        id: 'punish',
        text: 'Punish them publicly',
        description: 'Make an example. No one is above the community\'s laws.',
        consequences: {
          immediate: { legitimacy: 6, satisfaction: 4, food: 15, materials: 10, bonds: -2, trustEffects: { institutional: 0.08, interpersonal: -0.05 }, policyEffects: { shifts: { mercy: -5 } } }
        }
      },
      {
        id: 'mercy',
        text: 'Show mercy and redistribute',
        description: 'Take back the goods but forgive the person. Everyone makes mistakes.',
        consequences: {
          immediate: { food: 15, materials: 10, satisfaction: -3, bonds: 3, legitimacy: -2, trustEffects: { institutional: -0.05, interpersonal: 0.05 }, policyEffects: { shifts: { mercy: 5 } } }
        }
      },
      {
        id: 'quiet',
        text: 'Handle it quietly',
        description: 'Remove them from power without public spectacle.',
        consequences: {
          immediate: { legitimacy: -4, satisfaction: -2, bonds: -1, trustEffects: { institutional: -0.15 } },
          effects: { corruptionUnchecked: true }
        }
      }
    ]
  },

  coupAttempt: {
    id: 'coupAttempt',
    title: 'Military Coup Attempt',
    category: 'governance',
    triggers: {
      seasons: ['spring', 'summer', 'autumn', 'winter'],
      minTurn: 20,
      probability: 0.10,
      conditions: [
        { type: 'warriors', operator: '>=', value: 2 },
        { type: 'cohesion', pillar: 'legitimacy', operator: '<', value: 35 }
      ]
    },
    description: 'Military commanders have seized key positions and demand governance changes. They claim the current leadership has failed the people. Armed warriors patrol the settlement.',
    choices: [
      {
        id: 'accept',
        text: 'Accept military rule',
        description: 'Perhaps strong hands are what we need right now.',
        consequences: {
          immediate: { legitimacy: -8, satisfaction: -5, identity: 3, trustEffects: { institutional: -0.20 }, policyEffects: { shifts: { freedom: -15, mercy: -8 }, locks: [{ policy: 'freedom', value: 20, turns: 8 }] } },
          effects: { militaryCoup: true }
        }
      },
      {
        id: 'resist',
        text: 'Rally the people to resist',
        description: 'The people must stand against those who would rule by force.',
        consequences: {
          immediate: { bonds: 6, legitimacy: 4, satisfaction: -3, population: -2, trustEffects: { institutional: 0.05, interpersonal: 0.08 }, policyEffects: { shifts: { freedom: 8 } } },
          effects: { coupResisted: true }
        }
      },
      {
        id: 'compromise',
        text: 'Negotiate shared power',
        description: 'Give the military a role in governance without full control.',
        consequences: {
          immediate: { legitimacy: -2, satisfaction: 2, bonds: -2, identity: -1, trustEffects: { institutional: -0.10 }, policyEffects: { shifts: { freedom: -5 }, pressure: [{ policy: 'freedom', target: 30, turns: 6, costPerTurn: { satisfaction: -0.5 } }] } }
        }
      }
    ]
  },

  demandsForDemocracy: {
    id: 'demandsForDemocracy',
    title: 'Demands for Democracy',
    category: 'governance',
    triggers: {
      seasons: ['spring', 'summer'],
      minTurn: 24,
      probability: 0.10,
      conditions: [
        { type: 'governance', model: 'democracy', negate: true },
        { type: 'resource', resource: 'knowledge', operator: '>', value: 40 },
        { type: 'population', operator: '>', value: 25 }
      ]
    },
    description: 'Educated citizens have begun organizing public assemblies, demanding a voice in governance. They cite the settlement\'s growing size and complexity. "The people should choose their leaders," they declare.',
    choices: [
      {
        id: 'embrace',
        text: 'Embrace democratic reform',
        description: 'The people are ready to govern themselves. Begin the transition.',
        consequences: {
          immediate: { legitimacy: -6, satisfaction: 8, bonds: 4, knowledge: 5, trustEffects: { institutional: -0.10, interpersonal: 0.05 }, policyEffects: { shifts: { freedom: 15 }, locks: [{ policy: 'freedom', direction: 'min', floor: 40, turns: 6 }] } },
          effects: { democraticReform: true }
        }
      },
      {
        id: 'partial',
        text: 'Create an advisory council',
        description: 'Give the people a voice without full authority. A compromise.',
        consequences: {
          immediate: { legitimacy: 2, satisfaction: 3, bonds: 2, trustEffects: { institutional: 0.03, interpersonal: 0.03 } }
        }
      },
      {
        id: 'suppress',
        text: 'Suppress the movement',
        description: 'This is dangerous talk that threatens stability.',
        consequences: {
          immediate: { legitimacy: 4, satisfaction: -8, bonds: -5, identity: 2, trustEffects: { institutional: 0.05, interpersonal: -0.10 }, policyEffects: { shifts: { freedom: -10 }, pressure: [{ policy: 'freedom', target: 60, turns: 8, costPerTurn: { satisfaction: -0.8, legitimacy: -0.3 } }] } }
        }
      }
    ]
  },

  popularHeroEmerges: {
    id: 'popularHeroEmerges',
    title: 'A Popular Hero Emerges',
    category: 'governance',
    triggers: {
      seasons: ['spring', 'summer', 'autumn'],
      minTurn: 16,
      probability: 0.10,
      conditions: [
        { type: 'cohesion', pillar: 'satisfaction', operator: '>', value: 55 },
        { type: 'population', operator: '>', value: 20 }
      ]
    },
    description: 'A charismatic individual has won the hearts of the people through acts of bravery and generosity. They have no formal power, but their influence grows daily. Some whisper they should lead.',
    choices: [
      {
        id: 'elevate',
        text: 'Give them a formal role',
        description: 'Channel their popularity into service. Make them an official advisor.',
        consequences: {
          immediate: { legitimacy: 5, satisfaction: 4, bonds: 3, trustEffects: { institutional: 0.05, interpersonal: 0.03 } }
        }
      },
      {
        id: 'watch',
        text: 'Watch them carefully',
        description: 'Popular heroes can become popular tyrants. Keep your distance.',
        consequences: {
          immediate: { legitimacy: -2, satisfaction: -1, trustEffects: { institutional: -0.03 } }
        }
      },
      {
        id: 'undermine',
        text: 'Quietly undermine their influence',
        description: 'No one should have this much sway outside the governance structure.',
        consequences: {
          immediate: { legitimacy: -4, satisfaction: -6, bonds: -3, identity: 2, trustEffects: { institutional: -0.08, interpersonal: -0.05 } }
        }
      }
    ]
  },

  // ---- ENVIRONMENTAL / SOCIAL EVENTS ----

  greatFlood: {
    id: 'greatFlood',
    title: 'The Great Flood',
    category: 'environmental',
    triggers: {
      seasons: ['spring'],
      minTurn: 10,
      probability: 0.10,
      conditions: [
        { type: 'buildings', building: 'Farm', operator: '>=', value: 2 }
      ]
    },
    description: 'Spring rains have swollen the rivers beyond their banks. Floodwaters rush through the lowlands, threatening farms and homes. Your people scramble to higher ground.',
    choices: [
      {
        id: 'evacuate',
        text: 'Evacuate to high ground',
        description: 'Abandon the farms and save lives. We can rebuild.',
        consequences: {
          immediate: { food: -30, materials: -15, satisfaction: 3, bonds: 5, trustEffects: { interpersonal: 0.05 } }
        }
      },
      {
        id: 'sandbag',
        text: 'Build emergency levees',
        description: 'Rally every hand to hold back the water. Risky but could save the harvest.',
        consequences: {
          immediate: { materials: -20, satisfaction: -2, bonds: 4, legitimacy: 3, trustEffects: { interpersonal: 0.05, institutional: 0.03 } },
          effects: { floodDefense: true }
        }
      },
      {
        id: 'pray',
        text: 'Perform rituals to appease the river',
        description: 'The river has a spirit. Perhaps offerings will calm it.',
        consequences: {
          immediate: { food: -40, identity: 5, bonds: 3, satisfaction: -3, trustEffects: { interpersonal: 0.03 }, policyEffects: { shifts: { tradition: 5 } } },
          effects: { spiritualFlood: true }
        }
      }
    ]
  },

  migrationWave: {
    id: 'migrationWave',
    title: 'Migration Wave',
    category: 'social',
    triggers: {
      seasons: ['spring', 'summer'],
      minTurn: 20,
      probability: 0.08,
      conditions: [
        { type: 'population', operator: '>', value: 30 },
        { type: 'policy', policy: 'isolation', operator: '<', value: 60 }
      ]
    },
    description: 'A large group of families from a distant, collapsed settlement arrives at your borders. They number nearly a quarter of your own population. They bring skills and stories, but also hunger and unfamiliar customs.',
    choices: [
      {
        id: 'welcome_all',
        text: 'Welcome them all',
        description: 'Open your arms. They are people in need, just as we once were.',
        consequences: {
          immediate: { population: 8, food: -50, identity: -6, bonds: -4, satisfaction: 3, knowledge: 5, trustEffects: { interpersonal: -0.10, institutional: 0.03 }, policyEffects: { shifts: { isolation: -10, culturalOpenness: 5 } } }
        }
      },
      {
        id: 'select',
        text: 'Accept skilled workers only',
        description: 'We can absorb some, but not all. Take those who can contribute immediately.',
        consequences: {
          immediate: { population: 3, food: -15, identity: -2, knowledge: 4, legitimacy: -3, trustEffects: { interpersonal: -0.08, institutional: -0.05 }, policyEffects: { shifts: { isolation: -3 } } }
        }
      },
      {
        id: 'refuse',
        text: 'Turn them away',
        description: 'We cannot risk our own stability. They must find another home.',
        consequences: {
          immediate: { identity: 4, satisfaction: -5, bonds: -3, legitimacy: -2, trustEffects: { interpersonal: -0.05 }, policyEffects: { shifts: { isolation: 8 } } }
        }
      }
    ]
  },

  diseaseOutbreak: {
    id: 'diseaseOutbreak',
    title: 'Disease Sweeps the Settlement',
    category: 'crisis',
    triggers: {
      seasons: ['autumn', 'winter'],
      minTurn: 14,
      probability: 0.08,
      conditions: [
        { type: 'population', operator: '>', value: 35 }
      ]
    },
    description: 'A virulent sickness spreads through your settlement. Children and elders are hit hardest. The healthy fear contact with the sick, and families barricade their doors.',
    choices: [
      {
        id: 'quarantine',
        text: 'Enforce strict quarantine',
        description: 'Separate the sick from the healthy. Harsh, but it may save lives.',
        consequences: {
          immediate: { population: -3, satisfaction: -6, bonds: -5, legitimacy: 4, trustEffects: { institutional: 0.05, interpersonal: -0.12 }, policyEffects: { shifts: { freedom: -8, mercy: -6 } } }
        }
      },
      {
        id: 'care',
        text: 'Care for everyone together',
        description: 'We will not abandon our sick. Nurse them as a community.',
        consequences: {
          immediate: { population: -5, bonds: 6, identity: 4, satisfaction: 2, trustEffects: { interpersonal: 0.08 }, policyEffects: { shifts: { mercy: 6 } } }
        }
      },
      {
        id: 'herbal',
        text: 'Send healers into the wild',
        description: 'Our knowledge of plants may hold the cure. But the healers risk themselves.',
        consequences: {
          immediate: { population: -2, knowledge: 4, satisfaction: 3, bonds: 2, trustEffects: { interpersonal: 0.03, institutional: 0.03 } },
          requirements: { resource: 'knowledge', minValue: 25 }
        }
      }
    ]
  },

  // ---- RESISTANCE EVENTS (Phase 13A-3) ----

  factionDemands: {
    id: 'factionDemands',
    title: 'The Opposition Speaks',
    category: 'governance',
    triggers: {
      minTurn: 12,
      probability: 0.25,
      conditions: [
        { type: 'custom', check: 'resistanceFactionActive' },
        { type: 'custom', check: 'resistancePressureAbove50' }
      ]
    },
    description: 'Leaders of the opposition faction have requested an audience. They demand changes — or else.',
    choices: [
      {
        id: 'negotiate',
        text: 'Hear their demands',
        description: 'Open a dialogue. You may have to make concessions, but stability might be preserved.',
        consequences: {
          immediate: { legitimacy: -3, satisfaction: 2, resistanceEffects: { pressureChange: -12, dispositionShift: -1 }, trustEffects: { institutional: 0.03 }, policyEffects: { shifts: { freedom: 3 } } }
        }
      },
      {
        id: 'suppress',
        text: 'Silence the troublemakers',
        description: 'Use force to disperse the opposition. Quick, but carries lasting consequences.',
        consequences: {
          immediate: { legitimacy: -8, satisfaction: -5, bonds: -3, resistanceEffects: { suppress: true }, trustEffects: { institutional: -0.12, interpersonal: -0.08 }, policyEffects: { shifts: { freedom: -8, mercy: -8 } } }
        }
      },
      {
        id: 'dismiss',
        text: 'Dismiss them politely',
        description: 'Acknowledge their concerns but take no action. The problem will fester.',
        consequences: {
          immediate: { legitimacy: -2, resistanceEffects: { pressureChange: 5, dispositionShift: 1 }, trustEffects: { institutional: -0.05 } }
        }
      }
    ]
  },

  organizedResistanceEscalation: {
    id: 'organizedResistanceEscalation',
    title: 'Open Defiance',
    category: 'governance',
    triggers: {
      minTurn: 16,
      probability: 0.30,
      conditions: [
        { type: 'custom', check: 'resistanceOrganized' }
      ]
    },
    description: 'The resistance has organized. Workers refuse orders, gatherers withhold surplus. The fabric of authority is tearing.',
    choices: [
      {
        id: 'concede',
        text: 'Make a public concession',
        description: 'Announce that you will reverse a recent policy. Humiliating, but effective.',
        consequences: {
          immediate: { legitimacy: -6, satisfaction: 4, resistanceEffects: { pressureChange: -20, dispositionShift: -1 }, trustEffects: { institutional: 0.05 }, policyEffects: { shifts: { freedom: 5 } } }
        }
      },
      {
        id: 'crackdown',
        text: 'Crack down on the organizers',
        description: 'Arrest the leaders and disperse their followers. This will not be forgotten.',
        consequences: {
          immediate: { legitimacy: -5, satisfaction: -8, bonds: -5, resistanceEffects: { suppress: true }, trustEffects: { institutional: -0.15, interpersonal: -0.10 }, policyEffects: { shifts: { freedom: -10, mercy: -10 }, locks: [{ policy: 'freedom', direction: 'max', ceiling: 'current', turns: 6 }] } }
        }
      },
      {
        id: 'promise',
        text: 'Promise reforms',
        description: 'Bind yourself to specific changes within a year. Breaking this promise would be devastating.',
        consequences: {
          immediate: { legitimacy: 2, satisfaction: 3, resistanceEffects: { pressureChange: -15, promise: { description: 'Promised reforms to the people', turns: 16, binding: true } }, trustEffects: { institutional: 0.05, interpersonal: 0.03 }, policyEffects: { pressure: [{ policy: 'freedom', target: 55, turns: 8, costPerTurn: { legitimacy: -0.5 } }] } }
        }
      }
    ]
  },

  radicalUprising: {
    id: 'radicalUprising',
    title: 'On the Brink',
    category: 'governance',
    triggers: {
      minTurn: 20,
      probability: 0.40,
      conditions: [
        { type: 'custom', check: 'resistanceRadical' }
      ]
    },
    description: 'The resistance has turned radical. Violence looms. Your society stands on the edge of collapse.',
    choices: [
      {
        id: 'totalConcession',
        text: 'Give them everything they want',
        description: 'Reverse all contested policies, grant formal influence, and beg for peace.',
        consequences: {
          immediate: { legitimacy: -15, satisfaction: 8, identity: -3, resistanceEffects: { pressureChange: -40, dispositionShift: -2, formalInfluence: true }, trustEffects: { institutional: -0.10, interpersonal: 0.08 }, policyEffects: { shifts: { freedom: 15 }, locks: [{ policy: 'freedom', direction: 'min', floor: 50, turns: 8 }] } }
        }
      },
      {
        id: 'finalStand',
        text: 'Crush the uprising',
        description: 'Commit all available force to end this once and for all. The cost will be enormous.',
        consequences: {
          immediate: { legitimacy: -12, satisfaction: -12, bonds: -8, materials: -20, resistanceEffects: { suppress: true }, trustEffects: { institutional: -0.20, interpersonal: -0.15 }, policyEffects: { shifts: { freedom: -15, mercy: -15 }, locks: [{ policy: 'freedom', value: 15, turns: 6 }, { policy: 'mercy', direction: 'max', ceiling: 25, turns: 6 }] } }
        }
      },
      {
        id: 'stepDown',
        text: 'Step down from power',
        description: 'Offer to change governance entirely. A fresh start — at the cost of everything you built.',
        consequences: {
          immediate: { legitimacy: -20, satisfaction: 5, identity: -5, bonds: 5, resistanceEffects: { pressureChange: -50 }, trustEffects: { institutional: -0.15, interpersonal: 0.10 }, policyEffects: { shifts: { freedom: 20 } } }
        }
      }
    ]
  },

  factionCooling: {
    id: 'factionCooling',
    title: 'Tensions Ease',
    category: 'governance',
    triggers: {
      minTurn: 12,
      probability: 0.20,
      conditions: [
        { type: 'custom', check: 'resistanceFactionActive' },
        { type: 'custom', check: 'resistancePressureBelow30' }
      ]
    },
    description: 'The opposition has quieted. Your recent actions seem to have calmed the unrest — for now.',
    choices: [
      {
        id: 'reconcile',
        text: 'Reach out to their leaders',
        description: 'Take the opportunity to build bridges while tensions are low.',
        consequences: {
          immediate: { legitimacy: 2, bonds: 3, resistanceEffects: { pressureChange: -5, dispositionShift: -1 }, trustEffects: { institutional: 0.05, interpersonal: 0.05 } }
        }
      },
      {
        id: 'ignore',
        text: 'Move on and govern',
        description: 'The crisis has passed. Focus on what matters.',
        consequences: {
          immediate: { satisfaction: 1 }
        }
      }
    ]
  },

  // ---- CRIME EVENTS ----

  crimeWave: {
    id: 'crimeWave',
    title: 'Rising Crime',
    category: 'governance',
    triggers: {
      minTurn: 10,
      probability: 0.25,
      conditions: [
        { type: 'custom', check: 'crimeOverallAbove8' }
      ]
    },
    description: 'Reports of theft and disorder have become impossible to ignore. People look to you for a response.',
    choices: [
      {
        id: 'crackdown',
        text: 'Order a crackdown',
        description: 'Use force to restore order. Effective, but heavy-handed.',
        consequences: {
          immediate: { satisfaction: -5, legitimacy: 2, trustEffects: { interpersonal: -0.03 }, crimeEffects: { severityReduction: 3 }, policyEffects: { shifts: { mercy: -6, freedom: -5 } } }
        }
      },
      {
        id: 'community',
        text: 'Organize community watches',
        description: 'Empower people to look after one another.',
        consequences: {
          immediate: { bonds: 3, identity: 1, trustEffects: { interpersonal: 0.03 }, crimeEffects: { severityReduction: 1.5 }, policyEffects: { shifts: { mercy: 3 } } }
        }
      },
      {
        id: 'ignore',
        text: 'Do nothing — people must handle it',
        description: 'Intervening could make it worse. Let the community sort itself out.',
        consequences: {
          immediate: { legitimacy: -3, satisfaction: -2 }
        }
      }
    ]
  },

  organizedCrimeConfrontation: {
    id: 'organizedCrimeConfrontation',
    title: 'Organized Crime Demands',
    category: 'governance',
    triggers: {
      minTurn: 15,
      probability: 0.30,
      conditions: [
        { type: 'custom', check: 'crimeOrganized' }
      ]
    },
    description: 'A shadowy network of criminals has sent a message: pay tribute or face consequences. They are too strong to simply ignore.',
    choices: [
      {
        id: 'pay',
        text: 'Pay the tribute',
        description: 'Buying peace with materials. It sets a dangerous precedent.',
        consequences: {
          immediate: { materials: -15, legitimacy: -5, satisfaction: 1, crimeEffects: { severityReduction: 4 }, policyEffects: { pressure: [{ policy: 'mercy', target: 60, turns: 6, costPerTurn: { legitimacy: -0.3 } }] } }
        }
      },
      {
        id: 'fight',
        text: 'Refuse and fight back',
        description: 'Rally your people against the criminals. There will be casualties.',
        consequences: {
          immediate: { satisfaction: -3, bonds: 2, identity: 3, trustEffects: { interpersonal: -0.02 }, crimeEffects: { severityReduction: 6 }, policyEffects: { shifts: { mercy: -5 } } }
        }
      },
      {
        id: 'negotiate',
        text: 'Negotiate terms',
        description: 'Find a compromise — perhaps they can be brought into legitimate roles.',
        consequences: {
          immediate: { legitimacy: -2, bonds: 1, trustEffects: { institutional: -0.03 }, crimeEffects: { severityReduction: 3 }, policyEffects: { shifts: { mercy: 4 } } }
        }
      }
    ]
  },

  justiceDebate: {
    id: 'justiceDebate',
    title: 'A Question of Justice',
    category: 'governance',
    triggers: {
      minTurn: 8,
      probability: 0.20,
      conditions: [
        { type: 'custom', check: 'crimeOverallAbove5' },
        { type: 'custom', check: 'justiceHallDetectionAbove0' }
      ]
    },
    description: 'A thief has been caught stealing food to feed their family. The Justice Hall has brought the case to you. What is the right punishment?',
    choices: [
      {
        id: 'mercy',
        text: 'Show mercy — release them with a warning',
        description: 'Compassion matters more than rules. But others may see weakness.',
        consequences: {
          immediate: { bonds: 3, legitimacy: -3, satisfaction: 1, crimeEffects: { severityReduction: -0.5 }, policyEffects: { shifts: { mercy: 8 } } }
        }
      },
      {
        id: 'punish',
        text: 'Apply the full punishment',
        description: 'The law must be upheld or it means nothing.',
        consequences: {
          immediate: { legitimacy: 3, bonds: -2, satisfaction: -2, crimeEffects: { severityReduction: 2 }, policyEffects: { shifts: { mercy: -8 } } }
        }
      },
      {
        id: 'address_root',
        text: 'Address the root cause — provide food aid',
        description: 'The crime reveals a failure of the community, not just the individual.',
        consequences: {
          immediate: { food: -20, identity: 2, bonds: 2, satisfaction: 2, crimeEffects: { severityReduction: 1 }, policyEffects: { shifts: { mercy: 5 } } }
        }
      }
    ]
  },

  // ---- IMMIGRATION EVENTS ----

  refugeesAtBorder: {
    id: 'refugeesAtBorder',
    title: 'Families Seek Refuge',
    category: 'governance',
    triggers: {
      minTurn: 14,
      probability: 0.25,
      conditions: [
        { type: 'custom', check: 'immigrationPressureHigh' },
        { type: 'custom', check: 'borderClosed' }
      ]
    },
    description: 'Families from the eastern valleys seek refuge. Word of your harvests has spread. They wait at the border, hoping to be admitted.',
    choices: [
      {
        id: 'admit',
        text: 'Open the border temporarily',
        description: 'Let them in. They need help, and we need hands.',
        consequences: {
          immediate: { bonds: 2, satisfaction: 1, legitimacy: -2, immigrationEffects: { addArrivals: 5 }, policyEffects: { shifts: { isolation: -6 } } }
        }
      },
      {
        id: 'refuse',
        text: 'Turn them away',
        description: 'We cannot afford to take on more people right now.',
        consequences: {
          immediate: { legitimacy: 1, bonds: -3, identity: 1, trustEffects: { interpersonal: -0.03 }, policyEffects: { shifts: { isolation: 5 } } }
        }
      },
      {
        id: 'selective',
        text: 'Admit the skilled workers only',
        description: 'Take those who can contribute immediately. The others must find another way.',
        consequences: {
          immediate: { satisfaction: -2, legitimacy: -1, immigrationEffects: { addArrivals: 2 }, policyEffects: { shifts: { isolation: -2 } } }
        }
      }
    ]
  },

  integrationSuccess: {
    id: 'integrationSuccess',
    title: 'A Bridge Between Worlds',
    category: 'cultural',
    triggers: {
      minTurn: 20,
      probability: 0.20,
      conditions: [
        { type: 'custom', check: 'immigrationPipelineActive' }
      ]
    },
    description: 'Newcomers who arrived years ago now organize community festivals and teach their crafts. The line between "them" and "us" is blurring.',
    choices: [
      {
        id: 'celebrate',
        text: 'Celebrate the shared culture',
        description: 'This is what integration looks like. Encourage it.',
        consequences: {
          immediate: { identity: 3, bonds: 3, satisfaction: 2, trustEffects: { interpersonal: 0.05 }, policyEffects: { shifts: { isolation: -5, tradition: -3 } } }
        }
      },
      {
        id: 'cautious',
        text: 'Acknowledge but maintain boundaries',
        description: 'Integration is welcome, but traditions must be preserved.',
        consequences: {
          immediate: { identity: 1, legitimacy: 2, policyEffects: { shifts: { tradition: 3 } } }
        }
      }
    ]
  },

  parallelSocietyFlood: {
    id: 'parallelSocietyFlood',
    title: 'The Loyalty Gap',
    category: 'governance',
    triggers: {
      minTurn: 20,
      probability: 0.30,
      conditions: [
        { type: 'custom', check: 'parallelSocietyAbove40' }
      ]
    },
    description: 'When the flood came, much of the lower district did not answer the call to rebuild. They were not hostile — they simply did not feel it was their crisis to solve.',
    choices: [
      {
        id: 'confront',
        text: 'Demand participation from all residents',
        description: 'Everyone who eats our food must share our burden.',
        consequences: {
          immediate: { legitimacy: 2, satisfaction: -4, bonds: -3, trustEffects: { interpersonal: -0.05 }, policyEffects: { shifts: { freedom: -5 }, locks: [{ policy: 'isolation', direction: 'min', floor: 'current', turns: 4 }] } }
        }
      },
      {
        id: 'accept',
        text: 'Accept the reality and work with those who respond',
        description: 'Forcing participation would create worse problems than the flood itself.',
        consequences: {
          immediate: { bonds: -2, satisfaction: -1, identity: -2, policyEffects: { shifts: { isolation: -3 } } }
        }
      },
      {
        id: 'outreach',
        text: 'Send community leaders to ask — not demand — for help',
        description: 'Build the bridge one conversation at a time.',
        consequences: {
          immediate: { bonds: 1, legitimacy: -1, trustEffects: { interpersonal: 0.03 }, policyEffects: { shifts: { isolation: -2 } } }
        }
      }
    ]
  },

  coerciveAssimilationResistance: {
    id: 'coerciveAssimilationResistance',
    title: 'Resistance to Assimilation',
    category: 'governance',
    triggers: {
      minTurn: 20,
      probability: 0.35,
      conditions: [
        { type: 'custom', check: 'coerciveInterventionActive' }
      ]
    },
    description: 'The decree was enforced in the main districts. In the eastern quarter, it was not. Enforcers report that compliance is impossible without force.',
    choices: [
      {
        id: 'escalate',
        text: 'Escalate enforcement',
        description: 'The law is the law. Exemptions breed contempt.',
        consequences: {
          immediate: { legitimacy: 2, satisfaction: -6, bonds: -4, trustEffects: { interpersonal: -0.08 }, policyEffects: { shifts: { freedom: -8, mercy: -5 }, locks: [{ policy: 'freedom', direction: 'max', ceiling: 30, turns: 4 }] } }
        }
      },
      {
        id: 'compromise',
        text: 'Allow partial exemptions',
        description: 'Meet them halfway. Enforcement everywhere else.',
        consequences: {
          immediate: { legitimacy: -2, satisfaction: -1, bonds: 1, policyEffects: { shifts: { freedom: 3 } } }
        }
      },
      {
        id: 'abandon',
        text: 'Abandon coercive assimilation',
        description: 'This approach is tearing us apart. Find another way.',
        consequences: {
          immediate: { satisfaction: 3, bonds: 2, legitimacy: -3, immigrationEffects: { cancelIntervention: true }, policyEffects: { shifts: { freedom: 5, mercy: 4 } } }
        }
      }
    ]
  },

  largeIntake: {
    id: 'largeIntake',
    title: 'Stretched Thin',
    category: 'governance',
    triggers: {
      minTurn: 14,
      probability: 0.25,
      conditions: [
        { type: 'custom', check: 'recentLargeIntake' }
      ]
    },
    description: 'The community struggles to absorb so many newcomers. Old bonds feel stretched thin. Some native-born grumble about sharing what they built.',
    choices: [
      {
        id: 'welcome',
        text: 'Reaffirm the welcome',
        description: 'We were all strangers once. Growth requires sacrifice.',
        consequences: {
          immediate: { bonds: 2, satisfaction: -2, identity: -1, trustEffects: { interpersonal: 0.02 }, policyEffects: { shifts: { isolation: -4 } } }
        }
      },
      {
        id: 'restrict',
        text: 'Slow the intake — we need time to absorb',
        description: 'Close the border until the pipeline clears.',
        consequences: {
          immediate: { satisfaction: 2, identity: 2, bonds: -1, legitimacy: -1, policyEffects: { shifts: { isolation: 6 } } }
        }
      }
    ]
  },

  // ---- CLASS/GENDER ACTIVATION EVENTS ----

  wealthDivide: {
    id: 'wealthDivide',
    title: 'The Haves and the Have-Nots',
    category: 'governance',
    triggers: {
      minTurn: 10,
      probability: 0.15,
      conditions: [
        { type: 'custom', check: 'classSystemInactive' },
        { type: 'population', operator: '>=', value: 25 },
        { type: 'resource', resource: 'materials', operator: '>', value: 60 }
      ]
    },
    description: 'As material wealth grows, it has not grown equally. Some families live in sturdy homes with full stores while others scrape by. No one planned this — but a pattern has emerged, and people have noticed. The question is whether this pattern becomes a system.',
    choices: [
      {
        id: 'formalize_property',
        text: 'Those who built their wealth should keep it — recognize property rights',
        description: 'Formalizes a class system based on property ownership. The industrious are rewarded, but a line is drawn.',
        consequences: {
          immediate: { legitimacy: -8, satisfaction: -6, identity: 3, resistance: 12, trustEffects: { institutional: -0.05, interpersonal: -0.06 }, policyEffects: { shifts: { freedom: -4 } }, classEffects: { activate: 'property', initialDifferentials: { economic: 1 } } }
        }
      },
      {
        id: 'redistribute',
        text: 'Redistribute — no one should have more while others have less',
        description: 'Take from the wealthy and spread it thin. Equality now, resentment from some.',
        consequences: {
          immediate: { satisfaction: 4, bonds: 3, legitimacy: -3, materials: -20, trustEffects: { interpersonal: 0.04 }, policyEffects: { shifts: { mercy: 5, freedom: 3 } } }
        }
      },
      {
        id: 'ignore_divide',
        text: 'Let the pattern continue — it is not our place to interfere',
        description: 'The divide deepens quietly. No cost now, but the question will return.',
        consequences: {
          immediate: { legitimacy: -2, satisfaction: -2, trustEffects: { interpersonal: -0.03 } }
        }
      }
    ]
  },

  elderLineage: {
    id: 'elderLineage',
    title: 'Blood and Standing',
    category: 'governance',
    triggers: {
      minTurn: 12,
      probability: 0.12,
      conditions: [
        { type: 'custom', check: 'classSystemInactive' },
        { type: 'population', operator: '>=', value: 30 }
      ]
    },
    description: 'The founding families — those who survived the earliest winters — have begun to carry themselves differently. Their children expect deference. Others grumble, but the founders did sacrifice more. Does shared hardship create a permanent claim to status?',
    choices: [
      {
        id: 'formalize_lineage',
        text: 'Honor the founding families — their sacrifice earned this standing',
        description: 'Formalizes a class system based on lineage. A permanent aristocracy is born.',
        consequences: {
          immediate: { identity: 5, legitimacy: -8, satisfaction: -6, resistance: 15, trustEffects: { interpersonal: -0.08 }, policyEffects: { shifts: { tradition: 6, freedom: -5 } }, classEffects: { activate: 'lineage', initialDifferentials: { social: 1 } } }
        }
      },
      {
        id: 'reject_lineage',
        text: 'We are all equal here — no family stands above another',
        description: 'Reject the claim. The founding families are displeased, but the commons breathe easier.',
        consequences: {
          immediate: { satisfaction: 4, bonds: 3, identity: -2, legitimacy: -2, trustEffects: { interpersonal: 0.04 }, policyEffects: { shifts: { freedom: 5 } } }
        }
      },
      {
        id: 'honor_informally',
        text: 'Respect the founders, but give them no formal power',
        description: 'A middle path. The founders keep social prestige without governance authority.',
        consequences: {
          immediate: { identity: 2, satisfaction: 1, bonds: -1, policyEffects: { shifts: { tradition: 3 } } }
        }
      }
    ]
  },

  priestlyAuthority: {
    id: 'priestlyAuthority',
    title: 'Keepers of the Sacred',
    category: 'governance',
    triggers: {
      minTurn: 12,
      probability: 0.12,
      conditions: [
        { type: 'custom', check: 'classSystemInactive' },
        { type: 'resource', resource: 'knowledge', operator: '>=', value: 20 },
        { type: 'buildings', building: 'shrine', operator: '>=', value: 1 }
      ]
    },
    description: 'Those who tend the shrines and interpret the old stories have begun to speak with authority beyond their station. Some see wisdom; others see ambition. If their knowledge gives them power, should that power be formalized?',
    choices: [
      {
        id: 'formalize_religious',
        text: 'The keepers of knowledge deserve a higher standing',
        description: 'Formalizes a class system based on religious authority. The learned few lead the many.',
        consequences: {
          immediate: { identity: 4, legitimacy: -8, satisfaction: -5, resistance: 12, trustEffects: { institutional: -0.04 }, policyEffects: { shifts: { tradition: 6, freedom: -4 } }, classEffects: { activate: 'religious', initialDifferentials: { political: 1 } } }
        }
      },
      {
        id: 'knowledge_for_all',
        text: 'Knowledge should be shared, not hoarded by a priestly class',
        description: 'Push back against the emerging hierarchy. Knowledge remains common property.',
        consequences: {
          immediate: { knowledge: 3, satisfaction: 3, identity: -2, trustEffects: { interpersonal: 0.03 }, policyEffects: { shifts: { tradition: -4, freedom: 4 } } }
        }
      },
      {
        id: 'defer',
        text: 'The question can wait — we have more pressing concerns',
        description: 'Sidestep the issue for now. The tension remains unresolved.',
        consequences: {
          immediate: { legitimacy: -1, trustEffects: { institutional: -0.02 } }
        }
      }
    ]
  },

  warriorPrestige: {
    id: 'warriorPrestige',
    title: 'The Shield Bearers',
    category: 'governance',
    triggers: {
      minTurn: 12,
      probability: 0.15,
      conditions: [
        { type: 'custom', check: 'classSystemInactive' },
        { type: 'warriors', operator: '>=', value: 3 },
        { type: 'threats_active', operator: '>=', value: 1 }
      ]
    },
    description: 'After another battle, the warriors return to cheering crowds. They risked their lives while others hid. Some warriors now expect preferential rations and housing. "Those who bleed for the village should eat before those who did not." The logic is hard to argue with — but where does it end?',
    choices: [
      {
        id: 'formalize_military',
        text: 'Warriors have earned a higher standing — formalize it',
        description: 'Formalizes a class system based on military service. Those who fight, rule.',
        consequences: {
          immediate: { identity: 3, legitimacy: -8, satisfaction: -5, resistance: 12, trustEffects: { institutional: -0.04, interpersonal: -0.05 }, policyEffects: { shifts: { freedom: -6, mercy: -4 } }, classEffects: { activate: 'military', initialDifferentials: { legal: 1 } } }
        }
      },
      {
        id: 'equal_sacrifice',
        text: 'Every contribution matters equally — the farmer feeds the warrior',
        description: 'Reject military privilege. The warriors are unhappy but the commons are relieved.',
        consequences: {
          immediate: { satisfaction: 3, bonds: 2, identity: -1, trustEffects: { interpersonal: 0.03 }, policyEffects: { shifts: { freedom: 4, mercy: 3 } } }
        }
      },
      {
        id: 'extra_rations',
        text: 'Give warriors extra rations, but no formal standing',
        description: 'A practical compromise. The warriors get fed, but no class line is drawn.',
        consequences: {
          immediate: { food: -15, satisfaction: 1, policyEffects: { shifts: { mercy: -2 } } }
        }
      }
    ]
  },

  laborDivision: {
    id: 'laborDivision',
    title: 'Who Does What',
    category: 'social',
    triggers: {
      minTurn: 10,
      probability: 0.12,
      conditions: [
        { type: 'custom', check: 'genderSystemInactive' },
        { type: 'population', operator: '>=', value: 20 }
      ]
    },
    description: 'An argument at the quarry: a woman was told she should not haul stone "in her condition." She was not pregnant — just a woman. The quarry foreman says heavy labor is men\'s work. She says ability should decide, not anatomy. Both have a point, and the whole village is taking sides.',
    choices: [
      {
        id: 'restrict_labor',
        text: 'The foreman is right — some work suits some bodies better',
        description: 'Formalizes gender roles in labor: women are directed away from heavy work. Efficient for reproduction, limiting for the workforce.',
        consequences: {
          immediate: { identity: 3, legitimacy: -3, satisfaction: -4, resistance: 8, bonds: -2, trustEffects: { interpersonal: -0.05 }, policyEffects: { shifts: { tradition: 5, freedom: -5 } }, genderEffects: { moves: [{ dimension: 'labor', direction: -1 }] } }
        }
      },
      {
        id: 'open_labor',
        text: 'She is right — let ability decide, not sex',
        description: 'Formalizes open labor roles. Anyone can do any work. Builds bonds but requires governance effort to maintain.',
        consequences: {
          immediate: { bonds: 3, satisfaction: 2, identity: -1, legitimacy: -3, trustEffects: { interpersonal: 0.04 }, policyEffects: { shifts: { freedom: 5, tradition: -3 } }, genderEffects: { moves: [{ dimension: 'labor', direction: 1 }] } }
        }
      },
      {
        id: 'no_ruling',
        text: 'This is not a matter for governance — people will sort it out',
        description: 'Refuse to formalize anything. The argument continues, unresolved.',
        consequences: {
          immediate: { satisfaction: -1, legitimacy: -1, trustEffects: { institutional: -0.02 } }
        }
      }
    ]
  },

  mothersSacrifice: {
    id: 'mothersSacrifice',
    title: 'The Cost of Protection',
    category: 'social',
    triggers: {
      minTurn: 14,
      probability: 0.10,
      conditions: [
        { type: 'custom', check: 'genderSystemInactive' },
        { type: 'warriors', operator: '>=', value: 2 },
        { type: 'population', operator: '>=', value: 25 }
      ]
    },
    description: 'After a raid, two mothers were among the dead — warriors who fought to protect the village. Their children are orphaned. The village mourns, and a hard question surfaces: should mothers be shielded from combat? The answer will shape your society for generations.',
    choices: [
      {
        id: 'shield_mothers',
        text: 'Mothers should not serve — our children need their mothers alive',
        description: 'Formalizes a restriction on women in military roles. Protects families but halves your potential fighting force.',
        consequences: {
          immediate: { identity: 3, satisfaction: -3, bonds: -2, legitimacy: -4, resistance: 8, trustEffects: { interpersonal: -0.04, institutional: -0.03 }, policyEffects: { shifts: { tradition: 4, freedom: -5 } }, genderEffects: { moves: [{ dimension: 'military', direction: -1 }] } }
        }
      },
      {
        id: 'honor_their_choice',
        text: 'They chose to fight — honor their sacrifice and keep the way open',
        description: 'Formalizes equal military access. Every adult can serve. The demographic cost is real but so is the strength.',
        consequences: {
          immediate: { bonds: 4, identity: 2, satisfaction: 1, legitimacy: -2, trustEffects: { interpersonal: 0.05 }, policyEffects: { shifts: { freedom: 5 } }, genderEffects: { moves: [{ dimension: 'military', direction: 1 }] } }
        }
      },
      {
        id: 'mourn_only',
        text: 'Mourn the dead and leave the question for another day',
        description: 'Grief is enough for now. No formal decision is made.',
        consequences: {
          immediate: { bonds: 1, satisfaction: -1 }
        }
      }
    ]
  },

  civicVoice: {
    id: 'civicVoice',
    title: 'Who Gets a Voice?',
    category: 'governance',
    triggers: {
      minTurn: 14,
      probability: 0.10,
      conditions: [
        { type: 'custom', check: 'genderSystemInactive' },
        { type: 'population', operator: '>=', value: 30 }
      ]
    },
    description: 'At the council meeting, a woman rose to speak on water management — she oversees the irrigation — and was told to sit down. "The council recognizes heads of families." She is a head of family, since her husband died in winter. The council fell silent. Who speaks at council is a question about who your society believes holds authority.',
    choices: [
      {
        id: 'tradition_rules',
        text: 'Council roles belong to those tradition designates',
        description: 'Formalizes restricted civic authority. Half the population is excluded from public voice.',
        consequences: {
          immediate: { identity: 4, legitimacy: 2, satisfaction: -5, bonds: -3, resistance: 10, trustEffects: { institutional: -0.05, interpersonal: -0.05 }, policyEffects: { shifts: { tradition: 6, freedom: -6 }, locks: [{ policy: 'freedom', direction: 'max', ceiling: 'current', turns: 4 }] }, genderEffects: { moves: [{ dimension: 'civic', direction: -1 }] } }
        }
      },
      {
        id: 'open_council',
        text: 'Anyone who manages part of this village should have a voice in it',
        description: 'Formalizes open civic authority. All adults may speak at council.',
        consequences: {
          immediate: { bonds: 3, satisfaction: 3, identity: -2, legitimacy: -3, trustEffects: { interpersonal: 0.05 }, policyEffects: { shifts: { freedom: 6, tradition: -4 } }, genderEffects: { moves: [{ dimension: 'civic', direction: 1 }] } }
        }
      },
      {
        id: 'exception',
        text: 'Let her speak — but make no general ruling',
        description: 'A personal exception, not a policy. The underlying tension remains.',
        consequences: {
          immediate: { satisfaction: 1, bonds: 1, trustEffects: { interpersonal: 0.02 } }
        }
      }
    ]
  },

  // ---- CLASS SYSTEM EVENTS ----

  classConflict: {
    id: 'classConflict',
    title: 'Class Tensions',
    category: 'governance',
    triggers: {
      minTurn: 12,
      probability: 0.4,
      conditions: [
        { type: 'custom', check: 'classSystemActive' },
        { type: 'custom', check: 'classHighDifferential' }
      ]
    },
    description: 'The divide between privileged and common is no longer invisible. People mutter in the streets about those who have more than they need while others go hungry.',
    choices: [
      {
        text: 'The privileged earned their position — maintain the order',
        description: 'Reaffirm the class structure. The privileged are satisfied; the commons seethe.',
        consequences: {
          immediate: { legitimacy: 3, satisfaction: -5, bonds: -2, policyEffects: { shifts: { freedom: -4 }, pressure: [{ policy: 'freedom', target: 35, turns: 6, costPerTurn: { satisfaction: -0.4 } }] } }
        }
      },
      {
        text: 'Organize public works to show the system benefits everyone',
        description: 'Spend materials on a visible project for the commons.',
        consequences: {
          immediate: { satisfaction: 3, materials: -30, bonds: 2, legitimacy: -1, policyEffects: { shifts: { mercy: 3 } } }
        }
      },
      {
        text: 'Acknowledge the tension publicly and promise review',
        description: 'Legitimacy takes a small hit now, but satisfaction recovers.',
        consequences: {
          immediate: { legitimacy: -3, satisfaction: 4, identity: -1, bonds: 1, policyEffects: { shifts: { freedom: 3 } } }
        }
      }
    ]
  },

  privilegedProtest: {
    id: 'privilegedProtest',
    title: 'Elite Resistance',
    category: 'governance',
    triggers: {
      minTurn: 10,
      probability: 0.5,
      conditions: [
        { type: 'custom', check: 'classSystemActive' },
        { type: 'custom', check: 'recentDifferentialReduction' }
      ]
    },
    description: 'The privileged class organizes against recent changes that threaten their standing. They demand their position be respected.',
    choices: [
      {
        text: 'Restore their privileges — we cannot afford this fight',
        description: 'Capitulate. The privileged class is appeased but the commons lose faith.',
        consequences: {
          immediate: { legitimacy: -5, satisfaction: -3, bonds: -2, policyEffects: { shifts: { freedom: -5 }, locks: [{ policy: 'freedom', direction: 'max', ceiling: 'current', turns: 4 }] } }
        }
      },
      {
        text: 'Hold firm — the changes stand',
        description: 'The privileged class grows resentful. Resistance pressure increases.',
        consequences: {
          immediate: { legitimacy: 2, satisfaction: 2, resistance: 10, policyEffects: { shifts: { freedom: 5 } } }
        }
      },
      {
        text: 'Negotiate a compromise — partial restoration',
        description: 'Nobody is fully satisfied but the crisis passes.',
        consequences: {
          immediate: { legitimacy: -2, satisfaction: 1, bonds: -1, resistance: 3, policyEffects: { shifts: { freedom: -2 } } }
        }
      }
    ]
  },

  socialMobilityDemand: {
    id: 'socialMobilityDemand',
    title: 'Demand for Mobility',
    category: 'governance',
    triggers: {
      minTurn: 12,
      probability: 0.35,
      conditions: [
        { type: 'custom', check: 'classSystemActive' },
        { type: 'custom', check: 'classLineageBasis' }
      ]
    },
    description: 'Common-class adults point to neighbors who work just as hard but were born into privilege. "Why should birth determine worth?"',
    choices: [
      {
        text: 'Birth is destiny — the lineage system is sacred',
        description: 'Identity strengthens for the privileged but bonds between classes wither.',
        consequences: {
          immediate: { identity: 2, bonds: -4, satisfaction: -3, policyEffects: { shifts: { tradition: 5, freedom: -4 } } }
        }
      },
      {
        text: 'Allow exceptional commoners to earn privileged status',
        description: 'A small opening. The privileged class is uneasy; the commons have hope.',
        consequences: {
          immediate: { satisfaction: 5, legitimacy: -3, bonds: 2, identity: -1, policyEffects: { shifts: { freedom: 5 } } }
        }
      },
      {
        text: 'Perhaps it is time to reconsider the basis of our class system',
        description: 'Opens the conversation about changing the stratification basis.',
        consequences: {
          immediate: { legitimacy: -2, satisfaction: 3, resistance: -5, policyEffects: { shifts: { tradition: -5, freedom: 4 } } }
        }
      }
    ]
  },

  religiousClassCrisis: {
    id: 'religiousClassCrisis',
    title: 'Crisis of Knowledge',
    category: 'governance',
    triggers: {
      minTurn: 15,
      probability: 0.4,
      conditions: [
        { type: 'custom', check: 'classSystemActive' },
        { type: 'custom', check: 'classReligiousBasis' },
        { type: 'resource', resource: 'knowledge', operator: '<', value: 15 }
      ]
    },
    description: 'Our religious leaders once commanded respect through deep wisdom. But knowledge has stagnated, and some priests can barely justify their privileged position.',
    choices: [
      {
        text: 'Faith needs no proof — the priesthood stands',
        description: 'Legitimacy from the religious class holds, but dissent grows.',
        consequences: {
          immediate: { legitimacy: 2, satisfaction: -4, identity: 1, policyEffects: { shifts: { tradition: 5 }, pressure: [{ policy: 'tradition', target: 65, turns: 6, costPerTurn: { satisfaction: -0.3 } }] } }
        }
      },
      {
        text: 'Invest in knowledge recovery — our priests must lead by wisdom',
        description: 'Costly but rebuilds the foundation of religious authority.',
        consequences: {
          immediate: { materials: -25, knowledge: 5, legitimacy: -1, satisfaction: 2, policyEffects: { shifts: { tradition: -3 } } }
        }
      },
      {
        text: 'Reduce the number of priests to match our knowledge',
        description: 'Some priests lose status. The remainder are stronger.',
        consequences: {
          immediate: { legitimacy: -4, satisfaction: 3, identity: -2, resistance: 8, policyEffects: { shifts: { tradition: -5, freedom: 3 } } }
        }
      }
    ]
  },

  militaryClassPeace: {
    id: 'militaryClassPeace',
    title: 'Warriors Without War',
    category: 'governance',
    triggers: {
      minTurn: 12,
      probability: 0.35,
      conditions: [
        { type: 'custom', check: 'classSystemActive' },
        { type: 'custom', check: 'classMilitaryBasis' },
        { type: 'custom', check: 'fewActiveThreats' }
      ]
    },
    description: 'In times of peace, the military class has little to justify its privileges. Idle warriors cost food and produce resentment among those who work the fields.',
    choices: [
      {
        text: 'Maintain the standing force — threats could return at any time',
        description: 'The warriors keep their status. The commons bear the cost.',
        consequences: {
          immediate: { satisfaction: -4, legitimacy: 1, bonds: -2, policyEffects: { shifts: { freedom: -3 }, pressure: [{ policy: 'mercy', target: 40, turns: 6, costPerTurn: { satisfaction: -0.3 } }] } }
        }
      },
      {
        text: 'Put the warriors to work on public projects',
        description: 'Military prestige drops, but material conditions improve.',
        consequences: {
          immediate: { satisfaction: 3, materials: 20, identity: -2, legitimacy: -2, policyEffects: { shifts: { freedom: 3 } } }
        }
      },
      {
        text: 'Disband some units — we do not need a military class in peace',
        description: 'Reduces the privileged class size. Former warriors rejoin the commons.',
        consequences: {
          immediate: { satisfaction: 4, legitimacy: -5, resistance: 10, policyEffects: { shifts: { freedom: 6 } } }
        }
      }
    ]
  },

  // ---- GENDER FORMALIZATION EVENTS ----

  genderLaborQuestion: {
    id: 'genderLaborQuestion',
    title: 'The Question of Women\'s Work',
    category: 'social',
    triggers: {
      minTurn: 8,
      probability: 0.15,
      conditions: [
        { type: 'population', operator: '>=', value: 20 },
        { type: 'custom', check: 'genderLaborUnformalized' },
        { type: 'custom', check: 'highNursingBurden' }
      ]
    },
    description: 'A pattern has emerged: nursing mothers tend the gardens and mend tools while others haul stone and fell timber. No one decided this — it simply happened. But now elders are debating whether to make this arrangement official. There is a difference between what happens and what is.',
    choices: [
      {
        text: 'Let customs remain customs — people can work where they choose',
        description: 'Informal patterns continue without governance sanction.',
        consequences: {
          immediate: { satisfaction: 2, bonds: 1, trustEffects: { interpersonal: 0.02 }, policyEffects: { shifts: { freedom: 3 } } }
        }
      },
      {
        text: 'Recognize these roles formally — our people have found what works',
        description: 'Codifying the pattern gives it governance weight and a modest efficiency bonus.',
        consequences: {
          immediate: { legitimacy: -3, satisfaction: -2, identity: 3, resistance: 5, trustEffects: { institutional: -0.03 }, policyEffects: { shifts: { tradition: 5, freedom: -4 } } }
        }
      },
      {
        text: 'Declare that all work is open to all — no role belongs to one sex',
        description: 'A formal commitment to equality. This requires governance effort to maintain.',
        consequences: {
          immediate: { legitimacy: -3, satisfaction: 1, bonds: 2, identity: -1, trustEffects: { interpersonal: 0.03 }, policyEffects: { shifts: { freedom: 5, tradition: -3 } } }
        }
      }
    ]
  },

  genderMilitaryTension: {
    id: 'genderMilitaryTension',
    title: 'Mothers and Warriors',
    category: 'social',
    triggers: {
      minTurn: 12,
      probability: 0.12,
      conditions: [
        { type: 'warriors', operator: '>=', value: 2 },
        { type: 'custom', check: 'highNursingBurden' },
        { type: 'custom', check: 'genderMilitaryUnformalized' }
      ]
    },
    description: 'Three nursing mothers sit by the fire while warriors drill outside. A child asks: "Why don\'t mothers fight too?" The question is simple. The answer is not. Every woman under arms is one fewer bearing children. But every warrior lost is one fewer to defend the children already born.',
    choices: [
      {
        text: 'Keep things as they are — let people choose their own path',
        description: 'No formal policy. The tension between military service and reproduction remains an individual choice.',
        consequences: {
          immediate: { satisfaction: 1, trustEffects: { interpersonal: 0.01 }, policyEffects: { shifts: { freedom: 3 } } }
        }
      },
      {
        text: 'Women should not risk themselves in battle — their work is here',
        description: 'Formally discourage female military service. Reduces the demographic cost but limits recruitment.',
        consequences: {
          immediate: { legitimacy: -4, satisfaction: -3, identity: 2, resistance: 8, trustEffects: { institutional: -0.04, interpersonal: -0.03 }, policyEffects: { shifts: { tradition: 5, freedom: -6 }, locks: [{ policy: 'freedom', direction: 'max', ceiling: 'current', turns: 4 }] } }
        }
      },
      {
        text: 'Every adult who can hold a weapon should train — we need all hands',
        description: 'Open service formally. Builds bonds through shared sacrifice but carries a demographic cost.',
        consequences: {
          immediate: { bonds: 4, identity: 1, satisfaction: -1, trustEffects: { interpersonal: 0.04 }, policyEffects: { shifts: { freedom: 5, tradition: -3 } } }
        }
      }
    ]
  },

  genderInheritanceDispute: {
    id: 'genderInheritanceDispute',
    title: 'The Inheritance Dispute',
    category: 'social',
    triggers: {
      minTurn: 16,
      probability: 0.12,
      conditions: [
        { type: 'custom', check: 'classSystemActive' },
        { type: 'custom', check: 'genderInheritanceUnformalized' }
      ]
    },
    description: 'A prominent family head has died, leaving both a son and a daughter who claim the family\'s privileged standing. The settlement has no rule for this. Whichever way the community decides will set a precedent that shapes the privileged class for generations.',
    choices: [
      {
        text: 'The son inherits — this is the natural way of our people',
        description: 'Establishes male preference in inheritance. The privileged class will gradually shift male-heavy.',
        consequences: {
          immediate: { legitimacy: 2, satisfaction: -3, identity: 1, resistance: 6, trustEffects: { interpersonal: -0.03 }, policyEffects: { shifts: { tradition: 5, freedom: -3 } } }
        }
      },
      {
        text: 'Both inherit equally — standing belongs to the family, not the sex',
        description: 'Bilateral inheritance. The privileged class maintains its sex balance.',
        consequences: {
          immediate: { satisfaction: 1, bonds: 2, trustEffects: { interpersonal: 0.02 }, policyEffects: { shifts: { freedom: 3 } } }
        }
      },
      {
        text: 'The daughter inherits — she stayed and tended the household while he left to trade',
        description: 'Establishes female preference. A distinctive but contentious choice.',
        consequences: {
          immediate: { identity: 3, satisfaction: -2, legitimacy: -1, resistance: 6, trustEffects: { interpersonal: -0.02 }, policyEffects: { shifts: { tradition: -3 } } }
        }
      }
    ]
  },

  genderCivicAuthority: {
    id: 'genderCivicAuthority',
    title: 'Who Speaks for Us?',
    category: 'governance',
    triggers: {
      minTurn: 14,
      probability: 0.10,
      conditions: [
        { type: 'population', operator: '>=', value: 40 },
        { type: 'custom', check: 'genderCivicUnformalized' },
        { type: 'custom', check: 'theocracyOrTribalCouncil' }
      ]
    },
    description: 'A dispute in council has raised an old question: who may speak with authority? Some argue that ritual knowledge and civic voice should be open to all. Others say that tradition reserves these roles — and that tradition is what holds us together.',
    choices: [
      {
        text: 'The sacred roles belong to those tradition designates — this is how it has always been',
        description: 'Formalize restricted civic authority. Strong identity and legitimacy, but half the population is excluded from leadership.',
        consequences: {
          immediate: { identity: 4, legitimacy: 2, satisfaction: -5, bonds: -2, resistance: 10, trustEffects: { institutional: -0.05, interpersonal: -0.04 }, policyEffects: { shifts: { tradition: 6, freedom: -6 }, locks: [{ policy: 'freedom', direction: 'max', ceiling: 'current', turns: 6 }] } }
        }
      },
      {
        text: 'Let ability determine who speaks, not what body they were born into',
        description: 'Open authority. Builds trust and bonds at the cost of some traditional identity.',
        consequences: {
          immediate: { bonds: 3, satisfaction: 2, identity: -2, trustEffects: { interpersonal: 0.04 }, policyEffects: { shifts: { freedom: 6, tradition: -4 } } }
        }
      },
      {
        text: 'We need not decide this now — leave it to custom',
        description: 'Defer the question. Informal patterns continue.',
        consequences: {
          immediate: { satisfaction: 1, trustEffects: { institutional: 0.01 }, policyEffects: { shifts: { freedom: 2 } } }
        }
      }
    ]
  },

  genderExcludedVoices: {
    id: 'genderExcludedVoices',
    title: 'Voices of the Excluded',
    category: 'crisis',
    triggers: {
      minTurn: 16,
      probability: 0.15,
      conditions: [
        { type: 'custom', check: 'genderSharpRestriction' }
      ]
    },
    description: 'Those excluded by formal gender restrictions have begun meeting in private. Their grievances are real: they are denied work, voice, or inheritance by law rather than by choice. The question is not whether their anger is justified — it is what you will do about it.',
    choices: [
      {
        text: 'Suppress these gatherings — the law is the law',
        description: 'Resistance drops temporarily but resentment deepens.',
        consequences: {
          immediate: { resistance: -8, satisfaction: -5, bonds: -3, trustEffects: { institutional: -0.06, interpersonal: -0.05 }, policyEffects: { shifts: { freedom: -6, mercy: -4 } } }
        }
      },
      {
        text: 'Hear their grievances and ease the restrictions one step',
        description: 'A measured response. Costs legitimacy from those who benefit from restriction, but reduces pressure.',
        consequences: {
          immediate: { resistance: -15, legitimacy: -4, satisfaction: 3, bonds: 2, trustEffects: { interpersonal: 0.04 }, policyEffects: { shifts: { freedom: 5, tradition: -3 } } }
        }
      },
      {
        text: 'Hold firm — our traditions give us strength',
        description: 'The restrictions stand. Identity holds among the included, but resistance grows.',
        consequences: {
          immediate: { resistance: 8, identity: 2, satisfaction: -3, trustEffects: { interpersonal: -0.04 }, policyEffects: { shifts: { tradition: 4, freedom: -4 }, pressure: [{ policy: 'freedom', target: 25, turns: 8, costPerTurn: { satisfaction: -0.5 } }] } }
        }
      }
    ]
  },

  genderEgalitarianDrift: {
    id: 'genderEgalitarianDrift',
    title: 'The Drift',
    category: 'crisis',
    triggers: {
      minTurn: 12,
      probability: 0.20,
      conditions: [
        { type: 'custom', check: 'genderEgalitarianDrifting' }
      ]
    },
    description: 'Your egalitarian laws exist on parchment, but in practice the old patterns are reasserting themselves. Nursing mothers drift back to lighter work. Men fill the council seats. Without strong institutions to enforce equality, biology and custom write their own rules.',
    choices: [
      {
        text: 'Invest governance resources to enforce our equality laws',
        description: 'Costs legitimacy and materials, but stabilizes egalitarian policies against drift.',
        consequences: {
          immediate: { legitimacy: 5, satisfaction: -2, materials: -15, trustEffects: { institutional: 0.04 }, policyEffects: { shifts: { freedom: 4 }, locks: [{ policy: 'freedom', direction: 'min', floor: 'current', turns: 6 }] } }
        }
      },
      {
        text: 'Accept the drift — we cannot afford to fight nature and enemies at once',
        description: 'Egalitarian formalization continues to erode. Informal patterns take over.',
        consequences: {
          immediate: { satisfaction: 2, identity: -2, trustEffects: { interpersonal: -0.02 }, policyEffects: { shifts: { tradition: 4, freedom: -3 } } }
        }
      },
      {
        text: 'Perhaps the old ways had a wisdom we did not appreciate — formalize them',
        description: 'Reverse course toward restrictive formalization. Efficient but divisive.',
        consequences: {
          immediate: { identity: 2, legitimacy: -3, satisfaction: -4, resistance: 10, bonds: -2, trustEffects: { institutional: -0.04, interpersonal: -0.05 }, policyEffects: { shifts: { tradition: 8, freedom: -8 }, locks: [{ policy: 'freedom', direction: 'max', ceiling: 30, turns: 6 }] } }
        }
      }
    ]
  },

  // ---- FOLLOW-UP EVENTS (triggered by delayed consequences) ----

  refugeeIntegration: {
    id: 'refugeeIntegration',
    title: 'Refugee Integration Update',
    category: 'social',
    triggers: { manual: true }, // only triggered as follow-up
    description: 'The refugees you accepted conditionally have been living among you for some time. Their probation period is ending, and the community must decide their fate.',
    choices: [
      {
        id: 'full_membership',
        text: 'Grant full membership',
        description: 'They have proven themselves — welcome them as equals.',
        consequences: {
          immediate: { population: 2, bonds: 6, satisfaction: 3, identity: -2, trustEffects: { interpersonal: 0.06 } }
        }
      },
      {
        id: 'extend_probation',
        text: 'Extend the probation',
        description: 'They need more time to demonstrate their commitment.',
        consequences: {
          immediate: { legitimacy: 2, satisfaction: -3, bonds: -2, trustEffects: { institutional: 0.02, interpersonal: -0.04 } }
        }
      },
      {
        id: 'expel',
        text: 'Ask them to leave',
        description: 'They have not met our conditions. It is time for them to go.',
        consequences: {
          immediate: { population: -2, identity: 3, satisfaction: -6, bonds: -4, legitimacy: -3, trustEffects: { interpersonal: -0.10 } }
        }
      }
    ]
  },

  explorationResult: {
    id: 'explorationResult',
    title: 'Exploration Party Returns',
    category: 'exploration',
    triggers: { manual: true }, // only triggered as follow-up
    description: 'The party you sent to investigate distant lands has returned. They bring news of what they found.',
    choices: [
      {
        id: 'settlement_site',
        text: 'They found a promising site',
        description: 'A fertile valley with fresh water — perfect for a new settlement.',
        consequences: {
          immediate: { population: 2, knowledge: 8, satisfaction: 5, bonds: 3, trustEffects: { interpersonal: 0.04 } }
        }
      },
      {
        id: 'resources',
        text: 'They brought back resources',
        description: 'The expedition discovered valuable resources along the way.',
        consequences: {
          immediate: { food: 30, materials: 25, knowledge: 4, satisfaction: 3 }
        }
      },
      {
        id: 'warning',
        text: 'They bring a warning',
        description: 'They encountered hostile forces gathering in the region.',
        consequences: {
          immediate: { knowledge: 10, satisfaction: -4, legitimacy: 3, bonds: 4, trustEffects: { institutional: 0.03 } }
        }
      }
    ]
  },

  youthDebateOutcome: {
    id: 'youthDebateOutcome',
    title: 'The Debate Concludes',
    category: 'cultural',
    triggers: { manual: true }, // only triggered as follow-up
    description: 'The public debate between the generations has run its course. The community has heard both sides, and a consensus is forming.',
    choices: [
      {
        id: 'compromise',
        text: 'A compromise emerges',
        description: 'Both sides agree to preserve the spirit of traditions while allowing some adaptation.',
        consequences: {
          immediate: { identity: 3, satisfaction: 4, bonds: 5, legitimacy: 3, knowledge: 2, trustEffects: { interpersonal: 0.06 } }
        }
      },
      {
        id: 'youth_win',
        text: 'The youth convince many',
        description: 'The younger generation\'s arguments resonate. Change feels inevitable.',
        consequences: {
          immediate: { identity: -3, satisfaction: 6, knowledge: 5, bonds: -2, trustEffects: { interpersonal: 0.03 }, policyEffects: { shifts: { tradition: -10 } } }
        }
      },
      {
        id: 'elders_hold',
        text: 'The elders hold firm',
        description: 'Tradition prevails — but the youth remember the debate.',
        consequences: {
          immediate: { identity: 5, legitimacy: 4, satisfaction: -4, bonds: -3, trustEffects: { interpersonal: -0.04 }, policyEffects: { shifts: { tradition: 5 } } }
        }
      }
    ]
  }
};
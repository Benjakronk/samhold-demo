// Event System for Samhold
// Extracted from main game file for modular architecture

// Constants (access from window object for compatibility)
const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];
const FOOD_PER_POP = 2;
const FOOD_PER_CHILD = 1;
let WORKING_AGE = 10;

// Event Library - All game events defined here
const EVENT_LIBRARY = {
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

// Event game state tracking
let activeEvents = [];
let eventCooldowns = {};
let pendingEvents = [];

// Helper function to access game state (using window for global access)
function getGameState() {
  return window.gameState;
}

// Helper function to access governance models
function getGovernanceModels() {
  return window.GOVERNANCE_MODELS;
}

// Helper function to access UI update function
function updateAllUI() {
  if (window.updateAllUI) {
    window.updateAllUI();
  }
}

// Helper function to get total children count
function getTotalChildren() {
  const gameState = getGameState();
  if (!gameState || !gameState.childCohorts) return 0;

  return gameState.childCohorts
    .filter(cohort => cohort.age < (window.WORKING_AGE || WORKING_AGE))
    .reduce((sum, cohort) => sum + cohort.count, 0);
}

// Event system functions
function checkEventTriggers() {
  const gameState = getGameState();
  const currentSeason = (window.SEASONS || SEASONS)[gameState.season];

  // Check each event in the library
  for (const [eventId, eventData] of Object.entries(EVENT_LIBRARY)) {
    // Skip if event is on cooldown
    if (eventCooldowns[eventId] && eventCooldowns[eventId] > gameState.turn) {
      continue;
    }

    // Check basic trigger conditions
    if (!canEventTrigger(eventData, currentSeason)) {
      continue;
    }

    // Roll for probability
    if (Math.random() < eventData.triggers.probability) {
      triggerEvent(eventData);
      // Add cooldown to prevent immediate re-trigger
      eventCooldowns[eventId] = gameState.turn + 8; // 2 years minimum between same event
      break; // Only trigger one event per turn
    }
  }
}

function canEventTrigger(eventData, currentSeason) {
  const gameState = getGameState();
  const triggers = eventData.triggers;

  // Check minimum turn requirement
  if (gameState.turn < triggers.minTurn) {
    return false;
  }

  // Check season requirement
  if (triggers.seasons && !triggers.seasons.includes(currentSeason.toLowerCase())) {
    return false;
  }

  // Check conditions
  if (triggers.conditions) {
    for (const condition of triggers.conditions) {
      if (!evaluateCondition(condition)) {
        return false;
      }
    }
  }

  return true;
}

function evaluateCondition(condition) {
  const gameState = getGameState();
  const { type, operator, value, negate } = condition;
  let result = false;

  switch (type) {
    case 'resource':
      const resourceValue = gameState.resources[condition.resource] || 0;
      result = evaluateOperator(resourceValue, operator, value);
      break;

    case 'cohesion':
      const pillarValue = gameState.cohesion[condition.pillar] || 0;
      result = evaluateOperator(pillarValue, operator, value);
      break;

    case 'governance':
      if (condition.model) {
        result = gameState.governance.model === condition.model;
      }
      break;

    case 'population':
      result = evaluateOperator(gameState.population.total, operator, value);
      break;

    case 'buildings':
      if (condition.building) {
        const buildingCount = gameState.buildings.filter(b =>
          b.type === condition.building && b.constructionTurns === 0
        ).length;
        result = evaluateOperator(buildingCount, operator, value);
      }
      break;

    case 'revealed_hexes':
      const revealedCount = gameState.revealedHexes ? gameState.revealedHexes.size : 0;
      result = evaluateOperator(revealedCount, operator, value);
      break;
  }

  return negate ? !result : result;
}

function evaluateOperator(actual, operator, expected) {
  switch (operator) {
    case '<': return actual < expected;
    case '<=': return actual <= expected;
    case '>': return actual > expected;
    case '>=': return actual >= expected;
    case '==': return actual == expected;
    case '!=': return actual != expected;
    default: return false;
  }
}

function triggerEvent(eventData) {
  activeEvents.push({
    ...eventData,
    triggeredTurn: getGameState().turn
  });
}

function showEventDialog(eventData) {
  // Ensure dialog structure exists - restore it if it was destroyed
  const eventTitle = document.getElementById('event-title');
  const eventDescription = document.getElementById('event-description');
  const choicesContainer = document.getElementById('event-choices');

  if (!eventTitle || !eventDescription || !choicesContainer) {
    // Structure was destroyed, restore it
    const eventBox = document.querySelector('#event-dialog .event-box');
    if (eventBox) {
      eventBox.innerHTML = `
        <h2 id="event-title">Event</h2>
        <div id="event-description">Something has happened...</div>
        <div id="event-choices" class="event-choices">
          <!-- Choice buttons populated by JavaScript -->
        </div>
      `;
    }
  }

  const titleElement = document.getElementById('event-title');
  const descElement = document.getElementById('event-description');
  if (titleElement) titleElement.textContent = eventData.title;
  if (descElement) descElement.textContent = eventData.description;

  const choices = document.getElementById('event-choices');
  if (choices) {
    choices.innerHTML = '';

    eventData.choices.forEach(choice => {
      const choiceElement = document.createElement('div');
      choiceElement.className = 'event-choice';
      choiceElement.innerHTML = `
        <div class="event-choice-title">${choice.text}</div>
        <div class="event-choice-desc">${choice.description}</div>
      `;

      choiceElement.onclick = () => {
        selectEventChoice(eventData, choice);
        // Don't hide dialog here - showEventResolution will display results
        // Dialog will be hidden when user clicks "Continue" on resolution screen
      };

      choices.appendChild(choiceElement);
    });
  }

  const dialog = document.getElementById('event-dialog');
  if (dialog) {
    dialog.classList.add('visible');
  }
}

function hideEventDialog() {
  const dialog = document.getElementById('event-dialog');
  if (dialog) {
    dialog.classList.remove('visible');
  }
}

function generateEventFeedback(stateBefore, consequences) {
  const gameState = getGameState();
  const feedback = [];
  const stateAfter = {
    food: gameState.resources.food,
    materials: gameState.resources.materials,
    knowledge: gameState.resources.knowledge,
    population: gameState.population.total,
    identity: gameState.cohesion.identity,
    legitimacy: gameState.cohesion.legitimacy,
    satisfaction: gameState.cohesion.satisfaction,
    bonds: gameState.cohesion.bonds
  };

  // Calculate what the base effects would have been
  const expectedEffects = consequences.immediate || {};
  const modifiers = calculateContextualModifiers(expectedEffects);

  // Check resource changes
  const foodChange = stateAfter.food - stateBefore.food;
  const materialChange = stateAfter.materials - stateBefore.materials;
  const knowledgeChange = stateAfter.knowledge - stateBefore.knowledge;
  const popChange = stateAfter.population - stateBefore.population;

  if (foodChange !== 0) {
    let msg = foodChange > 0 ? `🍞 Food increased by ${foodChange}` : `🍞 Food decreased by ${Math.abs(foodChange)}`;

    // Add context if outcome was modified
    if (expectedEffects.food && Math.abs(modifiers.resourceModifier - 1.0) > 0.1) {
      if (modifiers.resourceModifier > 1.1) {
        msg += ` (better than expected due to prosperity)`;
      } else if (modifiers.resourceModifier < 0.9) {
        msg += ` (less than expected due to hardship)`;
      }
    }
    feedback.push(msg);
  }

  if (materialChange !== 0) {
    let msg = materialChange > 0 ? `🏗️ Materials increased by ${materialChange}` : `🏗️ Materials decreased by ${Math.abs(materialChange)}`;

    if (expectedEffects.materials && Math.abs(modifiers.resourceModifier - 1.0) > 0.1) {
      if (modifiers.resourceModifier > 1.1) {
        msg += ` (better than expected due to prosperity)`;
      } else if (modifiers.resourceModifier < 0.9) {
        msg += ` (less than expected due to hardship)`;
      }
    }
    feedback.push(msg);
  }

  if (knowledgeChange !== 0) {
    let msg = knowledgeChange > 0 ? `📚 Knowledge increased by ${knowledgeChange}` : `📚 Knowledge decreased by ${Math.abs(knowledgeChange)}`;

    if (expectedEffects.knowledge && Math.abs(modifiers.resourceModifier - 1.0) > 0.1) {
      if (modifiers.resourceModifier > 1.1) {
        msg += ` (better than expected due to prosperity)`;
      } else if (modifiers.resourceModifier < 0.9) {
        msg += ` (less than expected due to hardship)`;
      }
    }
    feedback.push(msg);
  }

  if (popChange !== 0) {
    feedback.push(popChange > 0 ? `👥 Population increased by ${popChange}` : `👥 Population decreased by ${Math.abs(popChange)}`);
  }

  // Check cohesion changes with context
  const cohesionIcons = { identity: '🗿', legitimacy: '⚖️', satisfaction: '😊', bonds: '🤝' };
  ['identity', 'legitimacy', 'satisfaction', 'bonds'].forEach(pillar => {
    const change = stateAfter[pillar] - stateBefore[pillar];
    if (change !== 0) {
      const pillarName = pillar.charAt(0).toUpperCase() + pillar.slice(1);
      let msg = change > 0 ? `${cohesionIcons[pillar]} ${pillarName} increased by ${change}` : `${cohesionIcons[pillar]} ${pillarName} decreased by ${Math.abs(change)}`;

      // Add context for modified cohesion outcomes
      const modifierKey = pillar + 'Modifier';
      if (expectedEffects[pillar] && modifiers[modifierKey] && Math.abs(modifiers[modifierKey] - 1.0) > 0.1) {
        const avgCohesion = (gameState.cohesion.identity + gameState.cohesion.legitimacy +
                            gameState.cohesion.satisfaction + gameState.cohesion.bonds) / 4;

        if (modifiers[modifierKey] > 1.1) {
          if (avgCohesion > 75) {
            msg += ` (enhanced by strong unity)`;
          } else if (pillar === 'bonds' && gameState.governance?.currentModel === 'tribalCouncil') {
            msg += ` (enhanced by tribal values)`;
          } else if (pillar === 'legitimacy' && gameState.governance?.currentModel === 'autocracy') {
            msg += ` (amplified by autocratic rule)`;
          }
        } else if (modifiers[modifierKey] < 0.9) {
          if (avgCohesion < 40) {
            msg += ` (weakened by social discord)`;
          } else if (pillar === 'identity' && gameState.resources.knowledge > 70) {
            msg += ` (tempered by education)`;
          }
        }
      }
      feedback.push(msg);
    }
  });

  // Check for special effects
  if (consequences.winter) {
    feedback.push(`❄️ Winter preparations will reduce food consumption`);
  }
  if (consequences.delay) {
    feedback.push(`⏳ This choice will have further consequences in ${consequences.delay} turns`);
  }
  if (consequences.followUp) {
    feedback.push(`📜 This decision may lead to future events`);
  }

  return feedback;
}

function showEventResolution(eventTitle, choiceText, feedback) {
  const eventBox = document.querySelector('#event-dialog .event-box');
  if (eventBox) {
    eventBox.innerHTML = `
      <h2>📜 ${eventTitle}</h2>
      <div class="event-resolution">
        <p><strong>Your decision:</strong> ${choiceText}</p>
        <div class="resolution-consequences">
          <h4>Immediate consequences:</h4>
          ${feedback.length > 0 ?
            '<ul>' + feedback.map(f => `<li>${f}</li>`).join('') + '</ul>' :
            '<p>Your decision had no immediate effects, but it shapes how your people see you.</p>'
          }
        </div>
      </div>
      <button class="wf-close" onclick="closeEventResolution()">Continue</button>
    `;
  }
}

function closeEventResolution() {
  // Restore original event dialog structure
  const eventBox = document.querySelector('#event-dialog .event-box');
  if (eventBox) {
    eventBox.innerHTML = `
      <h2 id="event-title">Event</h2>
      <div id="event-description">Something has happened...</div>
      <div id="event-choices" class="event-choices">
        <!-- Choice buttons populated by JavaScript -->
      </div>
    `;
  }

  hideEventDialog();
  updateAllUI();
}

function selectEventChoice(eventData, choice) {
  const gameState = getGameState();
  // Store state before applying consequences for feedback
  const stateBefore = {
    food: gameState.resources.food,
    materials: gameState.resources.materials,
    knowledge: gameState.resources.knowledge,
    population: gameState.population.total,
    identity: gameState.cohesion.identity,
    legitimacy: gameState.cohesion.legitimacy,
    satisfaction: gameState.cohesion.satisfaction,
    bonds: gameState.cohesion.bonds
  };

  // Apply immediate consequences
  applyEventConsequences(choice.consequences);

  // Generate feedback based on actual changes
  const feedback = generateEventFeedback(stateBefore, choice.consequences);

  // Remove the event from active events
  const eventIndex = activeEvents.findIndex(e => e.id === eventData.id);
  if (eventIndex !== -1) {
    activeEvents.splice(eventIndex, 1);
  }

  // Unlock spiritual_site sacred site prereq if this event qualifies
  if (eventData.spiritualUnlock && gameState.culture) {
    gameState.culture.spiritualEventFired = true;
  }

  // Show resolution feedback before closing dialog
  showEventResolution(eventData.title, choice.text, feedback);

  // Record event outcome for next turn summary
  if (!gameState.eventOutcomesForNextSummary) {
    gameState.eventOutcomesForNextSummary = [];
  }
  gameState.eventOutcomesForNextSummary.push({
    title: eventData.title,
    choice: choice.text,
    feedback: feedback
  });
}

function applyEventConsequences(consequences) {
  const gameState = getGameState();
  if (!consequences) return;

  // Apply immediate effects
  if (consequences.immediate) {
    applyImmediateEffects(consequences.immediate);
  }

  // Store delayed/conditional effects for later processing
  if (consequences.winter) {
    gameState.eventEffects = gameState.eventEffects || {};
    gameState.eventEffects.winter = gameState.eventEffects.winter || [];
    gameState.eventEffects.winter.push(consequences.winter);
  }

  if (consequences.delay) {
    pendingEvents.push({
      turnToTrigger: gameState.turn + consequences.delay,
      effects: consequences,
      followUp: consequences.followUp
    });
  }
}

function applyImmediateEffects(effects) {
  const gameState = getGameState();
  // Calculate modifiers based on current game state
  const modifiers = calculateContextualModifiers(effects);

  // Apply resource changes with modifiers
  if (effects.food) {
    const modifiedFood = Math.floor(effects.food * modifiers.resourceModifier);
    gameState.resources.food = Math.max(0, gameState.resources.food + modifiedFood);
  }
  if (effects.materials) {
    const modifiedMaterials = Math.floor(effects.materials * modifiers.resourceModifier);
    gameState.resources.materials = Math.max(0, gameState.resources.materials + modifiedMaterials);
  }
  if (effects.knowledge) {
    const modifiedKnowledge = Math.floor(effects.knowledge * modifiers.resourceModifier);
    gameState.resources.knowledge = Math.max(0, gameState.resources.knowledge + modifiedKnowledge);
  }

  // Apply population changes (less variable)
  if (effects.population) {
    gameState.population.total = Math.max(1, gameState.population.total + effects.population);
  }

  // Apply cohesion changes with modifiers
  const cohesionChanges = ['identity', 'legitimacy', 'satisfaction', 'bonds'];
  cohesionChanges.forEach(pillar => {
    if (effects[pillar]) {
      let modifiedChange = effects[pillar];

      // Apply specific modifiers for each pillar
      if (pillar === 'satisfaction' && modifiers.satisfactionModifier !== 1) {
        modifiedChange = Math.floor(modifiedChange * modifiers.satisfactionModifier);
      } else if (pillar === 'legitimacy' && modifiers.legitimacyModifier !== 1) {
        modifiedChange = Math.floor(modifiedChange * modifiers.legitimacyModifier);
      } else if (pillar === 'bonds' && modifiers.bondsModifier !== 1) {
        modifiedChange = Math.floor(modifiedChange * modifiers.bondsModifier);
      } else if (pillar === 'identity' && modifiers.identityModifier !== 1) {
        modifiedChange = Math.floor(modifiedChange * modifiers.identityModifier);
      }

      gameState.cohesion[pillar] = Math.max(0, Math.min(100,
        gameState.cohesion[pillar] + modifiedChange
      ));
    }
  });
}

function calculateContextualModifiers(effects) {
  const gameState = getGameState();
  const modifiers = {
    resourceModifier: 1.0,
    satisfactionModifier: 1.0,
    legitimacyModifier: 1.0,
    bondsModifier: 1.0,
    identityModifier: 1.0
  };

  // Resource abundance/scarcity affects resource-related outcomes
  const foodSecurity = gameState.resources.food / Math.max(1, gameState.population.total * 2);
  const materialWealth = gameState.resources.materials / Math.max(1, gameState.population.total);

  // Abundant resources make positive resource effects better, negative effects worse
  if (effects.food > 0 || effects.materials > 0) {
    // Good times make gains easier
    if (foodSecurity > 3 && materialWealth > 5) {
      modifiers.resourceModifier = 1.3; // 30% bonus when prosperous
    } else if (foodSecurity < 1 || materialWealth < 2) {
      modifiers.resourceModifier = 0.7; // 30% penalty when struggling
    }
  }

  // Cohesion state affects social outcomes
  const avgCohesion = (gameState.cohesion.identity + gameState.cohesion.legitimacy +
                      gameState.cohesion.satisfaction + gameState.cohesion.bonds) / 4;

  // High cohesion makes positive social effects stronger, negative effects milder
  if (avgCohesion > 75) {
    // United society responds better to leadership
    modifiers.satisfactionModifier = effects.satisfaction > 0 ? 1.2 : 0.8;
    modifiers.legitimacyModifier = effects.legitimacy > 0 ? 1.2 : 0.8;
    modifiers.bondsModifier = effects.bonds > 0 ? 1.3 : 0.7;
  } else if (avgCohesion < 40) {
    // Fractured society is harder to influence positively, suffers more from negative events
    modifiers.satisfactionModifier = effects.satisfaction > 0 ? 0.7 : 1.3;
    modifiers.legitimacyModifier = effects.legitimacy > 0 ? 0.7 : 1.3;
    modifiers.bondsModifier = effects.bonds > 0 ? 0.6 : 1.4;
  }

  // Knowledge affects identity-related outcomes
  if (gameState.resources.knowledge > 70) {
    // Educated society is more resistant to identity changes
    modifiers.identityModifier = Math.abs(effects.identity) > 0 ? 0.8 : 1.0;
  } else if (gameState.resources.knowledge < 30) {
    // Less educated society is more susceptible to identity shifts
    modifiers.identityModifier = Math.abs(effects.identity) > 0 ? 1.3 : 1.0;
  }

  // Governance model affects legitimacy outcomes
  const governance = gameState.governance?.currentModel || 'tribalCouncil';
  if (governance === 'autocracy' && effects.legitimacy) {
    // Autocracy: legitimacy changes are more extreme
    modifiers.legitimacyModifier *= effects.legitimacy > 0 ? 1.2 : 1.3;
  } else if (governance === 'tribalCouncil' && effects.bonds) {
    // Tribal council: bonds changes are more significant
    modifiers.bondsModifier *= 1.2;
  }

  return modifiers;
}

function processPendingEvents() {
  const gameState = getGameState();
  // Process delayed events that should trigger this turn
  for (let i = pendingEvents.length - 1; i >= 0; i--) {
    const pending = pendingEvents[i];
    if (pending.turnToTrigger <= gameState.turn) {
      if (pending.followUp) {
        // Trigger follow-up event
        const followUpEvent = EVENT_LIBRARY[pending.followUp];
        if (followUpEvent) {
          triggerEvent(followUpEvent);
        }
      }
      pendingEvents.splice(i, 1); // Remove processed event
    }
  }
}

function processActiveEvents() {
  // Show event dialog for the first active event
  if (activeEvents.length > 0) {
    const activeEvent = activeEvents[0];
    const eventData = EVENT_LIBRARY[activeEvent.id];
    if (eventData) {
      showEventDialog(eventData);
    } else {
      console.error('Event data not found for:', activeEvent.id);
      // Remove invalid event
      activeEvents.shift();
    }
  }
}

// Reset event system for new game
function resetEventSystem() {
  activeEvents.length = 0; // Clear array in place
  Object.keys(eventCooldowns).forEach(key => delete eventCooldowns[key]); // Clear object in place
  pendingEvents.length = 0; // Clear array in place
}

// Export functions for module use
export {
  // Constants
  EVENT_LIBRARY,
  SEASONS,
  FOOD_PER_POP,
  FOOD_PER_CHILD,

  // State variables
  activeEvents,
  eventCooldowns,
  pendingEvents,

  // Core functions
  checkEventTriggers,
  canEventTrigger,
  evaluateCondition,
  evaluateOperator,
  triggerEvent,
  showEventDialog,
  hideEventDialog,
  generateEventFeedback,
  showEventResolution,
  closeEventResolution,
  selectEventChoice,
  applyEventConsequences,
  processPendingEvents,
  processActiveEvents,

  // Helper functions
  applyImmediateEffects,
  calculateContextualModifiers,
  getTotalChildren,
  resetEventSystem
};

// For browser compatibility, also attach to window if available
if (typeof window !== 'undefined') {
  window.EventSystem = {
    EVENT_LIBRARY,
    activeEvents,
    eventCooldowns,
    pendingEvents,
    checkEventTriggers,
    canEventTrigger,
    evaluateCondition,
    evaluateOperator,
    triggerEvent,
    showEventDialog,
    hideEventDialog,
    generateEventFeedback,
    showEventResolution,
    closeEventResolution,
    selectEventChoice,
    applyEventConsequences,
    processPendingEvents,
    processActiveEvents,
    applyImmediateEffects,
    calculateContextualModifiers,
    getTotalChildren,
    resetEventSystem
  };
}
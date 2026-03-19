// Event System for Samhold
// Extracted from main game file for modular architecture

// Event Library - single source of truth in data/events.js
import { EVENT_LIBRARY } from '../data/events.js';

// Constants (access from window object for compatibility)
const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];
const FOOD_PER_POP = 2;
const FOOD_PER_CHILD = 1;
let WORKING_AGE = 10;

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

    case 'buildings': {
      if (condition.building) {
        // Scan the map grid for completed buildings matching by key or display name
        let buildingCount = 0;
        const bKey = condition.building.toLowerCase().replace(/\s+/g, '_');
        for (let r = 0; r < (window.MAP_ROWS || 16); r++) {
          for (let c = 0; c < (window.MAP_COLS || 20); c++) {
            const hex = gameState.map?.[r]?.[c];
            if (!hex || !hex.building || (hex.buildProgress ?? 0) > 0) continue;
            if (hex.building === bKey || window.BUILDINGS?.[hex.building]?.name === condition.building) {
              buildingCount++;
            }
          }
        }
        result = evaluateOperator(buildingCount, operator, value);
      }
      break;
    }

    case 'revealed_hexes': {
      let revealedCount = 0;
      if (gameState.visibilityMap) {
        for (let r = 0; r < gameState.visibilityMap.length; r++) {
          for (let c = 0; c < (gameState.visibilityMap[r]?.length ?? 0); c++) {
            if (gameState.visibilityMap[r][c] > 0) revealedCount++;
          }
        }
      }
      result = evaluateOperator(revealedCount, operator, value);
      break;
    }

    case 'policy': {
      const policyValue = gameState.governance?.policies?.[condition.policy] ?? 50;
      result = evaluateOperator(policyValue, operator, value);
      break;
    }

    case 'tradition_count':
      result = evaluateOperator(gameState.traditions?.length ?? 0, operator, value);
      break;

    case 'has_stories':
      result = evaluateOperator(gameState.culture?.stories?.length ?? 0, operator, value);
      break;

    case 'has_sacred_site':
      result = gameState.culture?.sacredSiteBuilt ? Object.values(gameState.culture.sacredSiteBuilt).some(v => v) : false;
      break;

    case 'warriors': {
      const warriorCount = (gameState.units ?? []).filter(u => u.type === 'warrior').length;
      result = evaluateOperator(warriorCount, operator, value);
      break;
    }

    case 'threats_active':
      result = evaluateOperator((gameState.externalThreats ?? []).length, operator, value);
      break;

    case 'custom': {
      const r = gameState.resistance;
      switch (condition.check) {
        case 'resistanceFactionActive':
          result = r?.faction?.active === true;
          break;
        case 'resistancePressureAbove50':
          result = (r?.pressure ?? 0) > 50;
          break;
        case 'resistanceOrganized':
          result = (r?.pressure ?? 0) >= 60;
          break;
        case 'resistanceRadical':
          result = (r?.pressure ?? 0) >= 95;
          break;
        case 'resistancePressureBelow30':
          result = r?.faction?.active === true && (r?.pressure ?? 0) < 30;
          break;
        case 'crimeOverallAbove5':
          result = (gameState.crime?.overallSeverity ?? 0) > 5;
          break;
        case 'crimeOverallAbove8':
          result = (gameState.crime?.overallSeverity ?? 0) > 8;
          break;
        case 'crimeOrganized':
          result = gameState.crime?.organizedPredation === true;
          break;
        case 'justiceHallDetectionAbove0':
          result = (window.getJusticeHallDetection ? window.getJusticeHallDetection() : 0) > 0;
          break;
        case 'immigrationPressureHigh':
          result = (gameState.immigration?.pressure ?? 0) >= 5;
          break;
        case 'borderClosed':
          result = (gameState.governance?.policies?.isolation ?? 50) >= 80;
          break;
        case 'immigrationPipelineActive': {
          const imm = gameState.immigration;
          result = imm && ((window.stageTotal ? window.stageTotal(1) + window.stageTotal(2) : 0)) >= 3;
          break;
        }
        case 'parallelSocietyAbove40':
          result = (gameState.immigration?.parallelSociety?.strength ?? 0) >= 0.40;
          break;
        case 'coerciveInterventionActive':
          result = gameState.immigration?.interventionActive === 'coercive';
          break;
        case 'recentLargeIntake':
          result = (gameState.immigration?.lastArrivals ?? 0) >= 4;
          break;
        // Class system conditions
        case 'classSystemActive':
          result = gameState.classSystem?.active === true;
          break;
        case 'classHighDifferential': {
          const diffs = gameState.classSystem?.differentials;
          result = diffs && (diffs.economic + diffs.legal + diffs.political + diffs.social) >= 3;
          break;
        }
        case 'recentDifferentialReduction':
          // True if any pending differential is a decrease (tracked by recent application)
          result = gameState.classSystem?.active === true &&
            Object.values(gameState.classSystem?.pendingDifferentials || {}).some(p => !p.isIncrease);
          break;
        case 'classLineageBasis':
          result = gameState.classSystem?.basis === 'lineage';
          break;
        case 'classReligiousBasis':
          result = gameState.classSystem?.basis === 'religious';
          break;
        case 'classMilitaryBasis':
          result = gameState.classSystem?.basis === 'military';
          break;
        case 'fewActiveThreats':
          result = (gameState.externalThreats?.length ?? 0) <= 1;
          break;
        // Gender formalization event checks
        case 'genderLaborUnformalized':
          result = (gameState.genderFormalization?.dimensions?.labor?.position ?? 0) === 0;
          break;
        case 'genderMilitaryUnformalized':
          result = (gameState.genderFormalization?.dimensions?.military?.position ?? 0) === 0;
          break;
        case 'genderInheritanceUnformalized':
          result = (gameState.genderFormalization?.dimensions?.inheritance?.position ?? 0) === 0;
          break;
        case 'genderCivicUnformalized':
          result = (gameState.genderFormalization?.dimensions?.civic?.position ?? 0) === 0;
          break;
        case 'highNursingBurden': {
          const totalNursing = window.getTotalNursing ? window.getTotalNursing() : 0;
          const sexCounts = window.getAdultSexCounts ? window.getAdultSexCounts() : { female: 0 };
          result = sexCounts.female > 0 && (totalNursing / sexCounts.female) >= 0.15;
          break;
        }
        case 'theocracyOrTribalCouncil':
          result = gameState.governance.model === 'theocracy' || gameState.governance.model === 'tribalCouncil';
          break;
        case 'classSystemActive':
          result = gameState.classSystem?.active === true;
          break;
        case 'genderSharpRestriction': {
          const gf = gameState.genderFormalization;
          result = gf?.active && Object.values(gf.dimensions || {}).some(d => d.position <= -2);
          break;
        }
        case 'genderEgalitarianDrifting': {
          const gf2 = gameState.genderFormalization;
          const driftThreshold = window.GENDER_DRIFT_THRESHOLD || 30;
          result = gf2?.active &&
            gameState.cohesion.legitimacy < driftThreshold &&
            Object.values(gf2.dimensions || {}).some(d => d.position > 0 && d.driftTimer > 0);
          break;
        }
        default:
          result = false;
      }
      break;
    }
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

  // Trust effects feedback
  const trustEffects = consequences.immediate?.trustEffects;
  if (trustEffects) {
    if (trustEffects.institutional) {
      const dir = trustEffects.institutional > 0 ? 'strengthened' : 'shaken';
      feedback.push(`🏛️ Trust in institutions was ${dir}`);
    }
    if (trustEffects.interpersonal) {
      const dir = trustEffects.interpersonal > 0 ? 'strengthened' : 'damaged';
      feedback.push(`🫂 Trust between people was ${dir}`);
    }
  }

  // Resistance effects feedback
  const resistanceEffects = consequences.immediate?.resistanceEffects;
  if (resistanceEffects) {
    if (resistanceEffects.suppress) {
      feedback.push('✊ The resistance was suppressed by force');
    } else if (resistanceEffects.pressureChange) {
      const dir = resistanceEffects.pressureChange < 0 ? 'eased' : 'intensified';
      feedback.push(`✊ Political tensions ${dir}`);
    }
    if (resistanceEffects.dispositionShift) {
      const dir = resistanceEffects.dispositionShift < 0 ? 'softened' : 'hardened';
      feedback.push(`✊ The opposition's stance has ${dir}`);
    }
    if (resistanceEffects.promise) {
      feedback.push('📜 A binding promise was made to the opposition');
    }
    if (resistanceEffects.formalInfluence) {
      feedback.push('🏛️ The opposition was granted formal influence');
    }
  }

  // Immigration effects feedback
  const immigrationEffects = consequences.immediate?.immigrationEffects;
  if (immigrationEffects) {
    if (immigrationEffects.addArrivals) {
      feedback.push(`🚶 ${immigrationEffects.addArrivals} immigrants entered the community`);
    }
    if (immigrationEffects.cancelIntervention) {
      feedback.push('📜 The intervention policy was abandoned');
    }
  }

  // Crime effects feedback
  const crimeEffects = consequences.immediate?.crimeEffects;
  if (crimeEffects) {
    if (crimeEffects.severityReduction > 0) {
      feedback.push('⚖️ Crime has been reduced');
    } else if (crimeEffects.severityReduction < 0) {
      feedback.push('⚖️ Crime may worsen as a result');
    }
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
    if (effects.population > 0) {
      gameState.population.total += effects.population;
      gameState.population.idle += effects.population;
      if (window.addToAdultCohort) window.addToAdultCohort(25, effects.population);
    } else {
      const loss = Math.min(Math.abs(effects.population), gameState.population.total - 1);
      gameState.population.total -= loss;
      const idleLoss = Math.min(loss, gameState.population.idle);
      gameState.population.idle -= idleLoss;
      if (loss > idleLoss) gameState.population.employed -= (loss - idleLoss);
      if (window.removeFromAdultCohorts) window.removeFromAdultCohorts(loss);
      if (window.clampWorkers) window.clampWorkers();
    }
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

  // Apply trust deviations if specified
  if (effects.trustEffects && window.applyTrustDeviation) {
    if (effects.trustEffects.institutional) {
      window.applyTrustDeviation('institutional', effects.trustEffects.institutional);
    }
    if (effects.trustEffects.interpersonal) {
      window.applyTrustDeviation('interpersonal', effects.trustEffects.interpersonal);
    }
  }

  // Apply resistance effects if specified
  if (effects.resistanceEffects) {
    const re = effects.resistanceEffects;
    if (re.pressureChange && window.addResistancePressure) {
      window.addResistancePressure(re.pressureChange);
    }
    if (re.dispositionShift && window.shiftDisposition) {
      window.shiftDisposition(re.dispositionShift);
    }
    if (re.suppress && window.suppressResistance) {
      window.suppressResistance();
    }
    if (re.formalInfluence && gameState.resistance?.faction) {
      gameState.resistance.faction.formalInfluence = { granted: gameState.turn };
    }
    if (re.promise && window.addPromise) {
      window.addPromise(re.promise.description, gameState.turn + (re.promise.turns || 16), re.promise.binding !== false);
    }
  }

  // Apply immigration effects if specified
  if (effects.immigrationEffects) {
    const ie = effects.immigrationEffects;
    if (ie.addArrivals && gameState.immigration) {
      if (window.addImmigrantArrivals) {
        window.addImmigrantArrivals(ie.addArrivals);
      }
    }
    if (ie.cancelIntervention && gameState.immigration) {
      gameState.immigration.interventionActive = null;
      gameState.immigration.interventionTurns = 0;
    }
  }

  // Apply crime effects if specified
  if (effects.crimeEffects) {
    const ce = effects.crimeEffects;
    if (ce.severityReduction && gameState.crime) {
      const reduction = ce.severityReduction;
      // Distribute reduction across tracks proportionally
      const c = gameState.crime;
      const total = c.theft + c.violence + c.transgression;
      if (total > 0) {
        c.theft = Math.max(0, c.theft - reduction * (c.theft / total));
        c.violence = Math.max(0, c.violence - reduction * (c.violence / total));
        c.transgression = Math.max(0, c.transgression - reduction * (c.transgression / total));
        c.overallSeverity = c.theft + c.violence + c.transgression;
      }
    }
  }
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

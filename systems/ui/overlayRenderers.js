// Overlay Renderers for Samhold
// Handles rendering of workforce, units, governance, population, and game menu overlays
// Extracted from main game file for modular architecture

let gameState = null;
let governanceActiveTab = 'governance';

function initOverlayRenderers(gameStateRef) {
  gameState = gameStateRef;
}

// ---- WORKFORCE OVERLAY ----

function getWorkforceGroups() {
  const groups = new Map();

  for (let r = 0; r < window.MAP_ROWS; r++) for (let c = 0; c < window.MAP_COLS; c++) {
    if (!window.isInTerritory(c, r)) continue;
    const hex = gameState.map[r][c];
    const maxW = window.getMaxWorkers(hex);

    let key, icon, name, isConstruction = false;

    if (hex.building === 'settlement') continue;

    if (hex.building && hex.buildProgress > 0) {
      const bDef = window.BUILDINGS[hex.building];
      key = `build:${hex.building}:${hex.terrain}`;
      icon = '\u{1F528}';
      name = `${bDef.name} (building)`;
      isConstruction = true;
    } else if (hex.building && hex.buildProgress <= 0) {
      const bDef = window.BUILDINGS[hex.building];
      key = `${hex.building}:${hex.terrain}`;
      icon = bDef.icon;
      name = bDef.name;
    } else {
      key = `gather:${hex.terrain}`;
      icon = window.TERRAIN[hex.terrain]?.icon || '\u{1F33F}';
      name = `${window.TERRAIN[hex.terrain]?.name || hex.terrain} (gather)`;
    }

    if (!groups.has(key)) {
      groups.set(key, {
        key, icon, name, terrain: hex.terrain,
        hexes: [], workers: 0, maxWorkers: 0,
        food: 0, mat: 0, isConstruction
      });
    }
    const g = groups.get(key);
    g.hexes.push(hex);
    g.workers += hex.workers;
    g.maxWorkers += maxW;
    if (!isConstruction) {
      const y = window.getHexYield(hex);
      g.food += y.food;
      g.mat += y.materials;
    }
  }

  return [...groups.values()].sort((a, b) => {
    if (a.isConstruction !== b.isConstruction) return a.isConstruction ? -1 : 1;
    const aGather = a.key.startsWith('gather:');
    const bGather = b.key.startsWith('gather:');
    if (aGather !== bGather) return aGather ? 1 : -1;
    return a.name.localeCompare(b.name);
  });
}

function renderWorkforceOverlay() {
  window.switchWorkforceTab(window.getActiveWorkforceTab());
}

// ---- UNITS TAB ----

function renderUnitsTab() {
  const totalUnits = gameState.units.length;
  const totalTraining = gameState.unitsInTraining.length;
  const totalUnitPopulation = gameState.units.length;

  document.getElementById('units-summary').innerHTML =
    `Active units: <strong>${totalUnits}</strong> \u00B7 ` +
    `In training: <strong>${totalTraining}</strong> \u00B7 ` +
    `Total population used: <strong style="color:var(--text-gold)">${totalUnitPopulation}</strong>`;

  const unitsByType = new Map();
  for (const unit of gameState.units) {
    const type = unit.type;
    if (!unitsByType.has(type)) {
      unitsByType.set(type, { active: [], training: [] });
    }
    unitsByType.get(type).active.push(unit);
  }

  for (const training of gameState.unitsInTraining) {
    const type = training.type;
    if (!unitsByType.has(type)) {
      unitsByType.set(type, { active: [], training: [] });
    }
    unitsByType.get(type).training.push(training);
  }

  let html = '';

  if (unitsByType.size === 0) {
    html = '<div class="units-empty">No units yet. Train units from settlements to explore and defend your civilization.</div>';
  } else {
    for (const [type, data] of unitsByType) {
      const unitType = window.UNIT_TYPES[type];
      const activeCount = data.active.length;
      const trainingCount = data.training.length;

      html += `<div class="unit-type-group">
        <div class="unit-type-header">
          <span class="unit-type-icon">${unitType.icon}</span>
          <span class="unit-type-name">${unitType.name}</span>
          <span class="unit-type-count">Active: ${activeCount} \u00B7 Training: ${trainingCount}</span>
        </div>
        <div class="unit-type-details">${unitType.description}</div>

        <div class="unit-type-costs">
          Costs: \u{1F465}${unitType.cost.population} \u{1FAB5}${unitType.cost.materials} \u00B7
          Upkeep: \u{1F35E}${unitType.upkeep.food}/turn \u00B7
          Training: ${unitType.training} turns
        </div>`;

      if (activeCount > 0) {
        html += `<div class="unit-list">`;
        for (const unit of data.active) {
          const healthColor = unit.health > 75 ? '#5a8a4a' : unit.health > 50 ? '#c9a84c' : unit.health > 25 ? '#d4800a' : '#a94442';
          const movementInfo = unit.movementLeft < unitType.movement ? 'Moved' : `${unit.movementLeft}/${unitType.movement}`;
          html += `
            <div class="unit-item" onclick="selectAndFocusUnit(${unit.id})">
              <span class="unit-location">(${unit.col},${unit.row})</span>
              <span class="unit-health" style="color: ${healthColor}">${unit.health}%</span>
              <span class="unit-movement">${movementInfo}</span>
              <button class="unit-action-btn" onclick="event.stopPropagation(); confirmDisbandUnit(${unit.id}); renderUnitsTab();">Disband</button>
            </div>`;
        }
        html += `</div>`;
      }

      if (trainingCount > 0) {
        html += `<div class="training-list">`;
        for (const training of data.training) {
          const progress = Math.round(((training.trainingNeeded - training.trainingProgress) / training.trainingNeeded) * 100);
          html += `
            <div class="training-item">
              <span class="training-location">(${training.col},${training.row})</span>
              <span class="training-progress">${progress}%</span>
              <span class="training-remaining">${training.trainingProgress} turns left</span>
            </div>`;
        }
        html += `</div>`;
      }

      html += `</div>`;
    }
  }

  document.getElementById('units-management').innerHTML = html;

  // Also refresh train tab if its container exists in the DOM
  if (document.getElementById('units-train')) renderTrainSection();
}

// ---- QUICK-TRAIN SECTION ----

function findFreeTrainingHexes() {
  const freeHexes = [];
  for (const settlement of gameState.settlements) {
    // Check the settlement hex itself and its 6 neighbors
    const candidates = [{ col: settlement.col, row: settlement.row }];
    for (let dir = 0; dir < 6; dir++) {
      const nb = window.hexNeighbor(settlement.col, settlement.row, dir);
      if (nb.col >= 0 && nb.col < window.MAP_COLS && nb.row >= 0 && nb.row < window.MAP_ROWS) {
        candidates.push(nb);
      }
    }
    for (const pos of candidates) {
      const occupied = gameState.units.some(u => u.col === pos.col && u.row === pos.row) ||
                       gameState.unitsInTraining.some(t => t.col === pos.col && t.row === pos.row);
      if (!occupied && !freeHexes.some(h => h.col === pos.col && h.row === pos.row)) {
        freeHexes.push(pos);
      }
    }
  }
  return freeHexes;
}

export function wfInitiateTrain(unitType) {
  const unitData = window.UNIT_TYPES[unitType];
  if (!unitData) return;

  const freeHexes = findFreeTrainingHexes();
  if (freeHexes.length === 0) return;

  const bestHex = freeHexes[0]; // settlement hex is always first candidate

  window.showConfirmDialogNonDestructive(
    `Train ${unitData.name}`,
    `<p>Begin training a <strong>${unitData.name}</strong> near your settlement (${bestHex.col},${bestHex.row})?</p>
     <p><strong>Cost:</strong> 👥${unitData.cost.population} population · 🪵${unitData.cost.materials} materials</p>
     <p><strong>Training time:</strong> ${unitData.training} turns · <strong>Upkeep:</strong> 🌾${unitData.upkeep.food}/turn</p>
     <p><em>${unitData.description}</em></p>`,
    'Train',
    'Cancel',
    () => {
      if (window.startUnitTraining) {
        window.startUnitTraining(unitType, bestHex.col, bestHex.row);
        if (window.updateAllUI) window.updateAllUI();
        if (window.renderUnitsTab) window.renderUnitsTab();
        if (window.render) window.render();
      }
    }
  );
}

function renderTrainSection() {
  const container = document.getElementById('units-train');
  if (!container) return;

  const freeHexes = findFreeTrainingHexes();
  const freeCount = freeHexes.length;
  const materials = gameState.resources.materials;
  const idle = gameState.population.idle;

  let html = `<div class="wf-section-header">⚔️ Train Units</div>`;

  for (const [key, unitData] of Object.entries(window.UNIT_TYPES)) {
    const canAffordPop = idle >= unitData.cost.population;
    const canAffordMat = materials >= unitData.cost.materials;
    const hasSite = freeCount > 0;
    const enabled = canAffordPop && canAffordMat && hasSite;

    const reason = !hasSite ? 'No free training site near settlement' :
                   !canAffordPop ? `Need 👥${unitData.cost.population} idle population` :
                   !canAffordMat ? `Need 🪵${unitData.cost.materials} materials` : '';

    html += `<button class="wf-build-btn${enabled ? '' : ' disabled'}"
      ${enabled ? `onclick="wfInitiateTrain('${key}')"` : 'disabled'}>
      <span class="wf-build-icon">${unitData.icon}</span>
      <span class="wf-build-info">
        <span class="wf-build-name">${unitData.name}</span>
        <span class="wf-build-meta">👥${unitData.cost.population} 🪵${unitData.cost.materials} · ${unitData.training} turns · 🌾${unitData.upkeep.food}/turn upkeep</span>
        ${reason ? `<span class="wf-build-reason">${reason}</span>` : ''}
      </span>
    </button>`;
  }

  container.innerHTML = html;
}

function selectAndFocusUnit(unitId) {
  const unit = gameState.units.find(u => u.id === unitId);
  if (unit) {
    gameState.selectedUnit = unit;
    gameState.selectedHex = gameState.map[unit.row][unit.col];

    const worldPos = window.hexToPixel(unit.col, unit.row, window.HEX_SIZE);
    gameState.camera.x = worldPos.x;
    gameState.camera.y = worldPos.y;

    if (window.setMapDirty) window.setMapDirty(true);
    if (window.render) window.render();
    window.updateSidePanel(gameState.selectedHex);

    document.getElementById('workforce-overlay').classList.remove('visible');
  }
}

// ---- GOVERNANCE OVERLAY ----

function renderGovernanceOverlay() {
  document.querySelectorAll('.governance-tab').forEach(t => {
    t.onclick = () => window.switchGovernanceTab(t.dataset.tab);
    t.classList.toggle('active', t.dataset.tab === governanceActiveTab);
  });

  const modelsContainer = document.getElementById('governance-models');
  const currentModel = gameState.governance.model;

  modelsContainer.innerHTML = Object.entries(window.GOVERNANCE_MODELS).map(([key, model]) => {
    const isActive = key === currentModel;
    const isTransitioning = gameState.governance.modelChangeTimer > 0;
    const transitionText = isTransitioning ?
      `<div class="gov-model-transition">Transitioning... (${gameState.governance.modelChangeTimer} turns)</div>` : '';

    return `
      <div class="gov-model ${isActive ? 'active' : ''}" onclick="selectGovernanceModel('${key}')">
        <div class="gov-model-icon">${model.icon}</div>
        <div class="gov-model-name">${model.name}</div>
        <div class="gov-model-desc">${model.description}</div>
        ${transitionText}
      </div>
    `;
  }).join('');

  const detailsContainer = document.getElementById('governance-details');
  const activeModel = window.GOVERNANCE_MODELS[currentModel];

  detailsContainer.innerHTML = `
    <div class="model-detail-row"><strong>Decision Speed:</strong> ${activeModel.decisionSpeed}</div>
    <div class="model-detail-row"><strong>Legitimacy Source:</strong> ${activeModel.legitimacySource}</div>
    <div class="model-detail-row"><strong>Freedom Level:</strong> ${activeModel.freedomLevel}</div>
    <div class="model-detail-row"><strong>Fragility:</strong> ${activeModel.fragility}</div>
    <div class="model-detail-row"><strong>Best When:</strong> ${activeModel.bestWhen}</div>

    <div style="margin-top: 12px; font-weight: bold; color: var(--text-gold);">Mechanical Effects:</div>
    <div class="model-detail-row">\u2022 Base legitimacy: ${activeModel.effects.legitimacy.base}</div>
    ${activeModel.effects.legitimacy.traditionBonus ? `<div class="model-detail-row">\u2022 Tradition policy bonus: +${activeModel.effects.legitimacy.traditionBonus}x effect</div>` : ''}
    ${activeModel.effects.legitimacy.timeStabilityBonus ? `<div class="model-detail-row">\u2022 Time stability bonus: +${activeModel.effects.legitimacy.timeStabilityBonus} per turn (after year 3)</div>` : ''}
    ${activeModel.effects.legitimacy.satisfactionDependency ? `<div class="model-detail-row">\u2022 High satisfaction dependency (${activeModel.effects.legitimacy.satisfactionDependency}x effect)</div>` : ''}
    ${activeModel.effects.legitimacy.identityDependency ? `<div class="model-detail-row">\u2022 Identity dependency (${activeModel.effects.legitimacy.identityDependency}x effect)</div>` : ''}

    <div style="margin-top: 8px; font-weight: bold; color: var(--text-gold);">Policy Effectiveness:</div>
    <div class="model-detail-row">\u2022 Freedom policies: ${activeModel.policyEffects.freedom.multiplier}x effectiveness</div>
    <div class="model-detail-row">\u2022 Mercy policies: ${activeModel.policyEffects.mercy.multiplier}x effectiveness</div>
    <div class="model-detail-row">\u2022 Tradition policies: ${activeModel.policyEffects.tradition.multiplier}x effectiveness</div>
  `;

  const policyHeaders = {
    freedom: 'Freedom vs Control',
    mercy: 'Justice & Punishment',
    tradition: 'Culture & Change'
  };

  const policies = ['freedom', 'mercy', 'tradition'];
  policies.forEach(policy => {
    const slider = document.getElementById(`policy-${policy}`);
    const valueDisplay = document.getElementById(`policy-${policy}-value`);
    const header = document.getElementById(`policy-header-${policy}`);

    slider.value = gameState.governance.policies[policy];
    valueDisplay.textContent = gameState.governance.policies[policy];

    const currentLevel = window.getPolicyLabel(policy, gameState.governance.policies[policy]);
    header.textContent = `${policyHeaders[policy]} (${currentLevel})`;

    slider.oninput = (e) => {
      const newValue = parseInt(e.target.value);
      valueDisplay.textContent = newValue;
      window.adjustPolicy(policy, newValue);
      const newLevel = window.getPolicyLabel(policy, newValue);
      header.textContent = `${policyHeaders[policy]} (${newLevel})`;
    };
  });

  // Ration priority radio buttons
  const rationPriority = gameState.governance.policies.rationPriority ?? 'people';
  document.querySelectorAll('input[name="ration-priority"]').forEach(radio => {
    radio.checked = radio.value === rationPriority;
    radio.onchange = (e) => {
      gameState.governance.policies.rationPriority = e.target.value;
    };
  });

  const workingAgeSlider = document.getElementById('policy-working-age');
  const workingAgeDisplay = document.getElementById('working-age-value');
  const workingAgeHeader = document.getElementById('policy-header-working-age');

  if (workingAgeSlider) {
    workingAgeSlider.value = window.WORKING_AGE;
    workingAgeSlider.oninput = (e) => {
      window.adjustWorkingAge(parseInt(e.target.value) - window.WORKING_AGE);
    };
  }

  if (workingAgeDisplay) {
    workingAgeDisplay.textContent = window.WORKING_AGE;
  }
  if (workingAgeHeader) {
    const ageLevel = window.getWorkingAgeLabel(window.WORKING_AGE);
    workingAgeHeader.textContent = `Childhood & Labor (${ageLevel})`;
  }
}

function selectGovernanceModel(modelKey) {
  if (modelKey !== gameState.governance.model) {
    const model = window.GOVERNANCE_MODELS[modelKey];
    window.showConfirmDialogNonDestructive(
      `Change to ${model.name}?`,
      `Changing governance models causes major disruption:<br>\u2022 Legitimacy will drop significantly<br>\u2022 Takes several turns to stabilize<br>\u2022 Current model: ${window.GOVERNANCE_MODELS[gameState.governance.model].name}`,
      'Confirm Change',
      'Cancel',
      () => {
        window.changeGovernanceModel(modelKey);
        renderGovernanceOverlay();
        window.updateAllUI();
      }
    );
  }
}

// ---- POPULATION DETAILS ----

function openPopulationDetails() {
  renderPopulationDetails();
  document.getElementById('population-details-overlay').classList.add('visible');
}

function closePopulationDetails() {
  document.getElementById('population-details-overlay').classList.remove('visible');
}

function renderPopulationDetails() {
  const totalChildren = window.getTotalChildren();
  const workingAgeYouth = gameState.childCohorts
    .filter(c => c.age >= window.WORKING_AGE && c.age <= 16)
    .reduce((sum, c) => sum + c.count, 0);
  const totalAdults = gameState.population.total;
  const totalPop = totalAdults + totalChildren + workingAgeYouth;

  let html = `
    <div style="margin-bottom: 20px;">
      <div class="detail-section">
        <h3>Population Summary</h3>
        <div class="detail-row"><span>Total Population:</span><span>${totalPop}</span></div>
        <div class="detail-row"><span>\u{1F465} Adults:</span><span>${totalAdults}</span></div>
        <div class="detail-row"><span>\u{1F476} Children:</span><span>${totalChildren}</span></div>
        ${workingAgeYouth > 0 ? `<div class="detail-row"><span>\u{1F9D1} Working Age Youth:</span><span>${workingAgeYouth}</span></div>` : ''}
        <div class="detail-row">
          <span>Working Age:</span>
          <span style="display: flex; align-items: center; gap: 8px;">
            <button class="dev-btn" onclick="adjustWorkingAge(-1)" style="font-size: 12px; padding: 2px 6px;">\u2212</button>
            <span id="pop-working-age-value">${window.WORKING_AGE} years</span>
            <button class="dev-btn" onclick="adjustWorkingAge(1)" style="font-size: 12px; padding: 2px 6px;">+</button>
          </span>
        </div>
      </div>
    </div>`;

  if (gameState.childCohorts.length > 0) {
    html += `
      <div class="detail-section">
        <h3>Child Cohorts</h3>
        <div class="cohort-grid">`;

    const sortedCohorts = [...gameState.childCohorts].sort((a, b) => b.age - a.age);

    for (const cohort of sortedCohorts) {
      const yearsToWork = window.WORKING_AGE - cohort.age;
      let statusText, countLabel;

      if (cohort.age >= window.WORKING_AGE) {
        statusText = '\u{1F4BC} Working';
        countLabel = `${cohort.count} workers`;
      } else if (yearsToWork === 0) {
        statusText = '\u{1F393} Ready to work';
        countLabel = `${cohort.count} children`;
      } else if (yearsToWork === 1) {
        statusText = '\u23F3 1 year to work';
        countLabel = `${cohort.count} children`;
      } else {
        statusText = `\u23F3 ${yearsToWork} years to work`;
        countLabel = `${cohort.count} children`;
      }

      html += `
        <div class="cohort-row">
          <div class="cohort-age">Age ${cohort.age}</div>
          <div class="cohort-count">${countLabel}</div>
          <div class="cohort-status">${statusText}</div>
        </div>`;
    }

    html += `</div></div>`;
  }

  const adultFood = totalAdults * window.FOOD_PER_POP;
  const childFood = totalChildren * window.FOOD_PER_CHILD;
  const totalFood = adultFood + childFood;

  html += `
    <div class="detail-section">
      <h3>Food Consumption</h3>
      <div class="detail-row"><span>\u{1F465} Adults (${totalAdults} \u00D7 ${window.FOOD_PER_POP}):</span><span>${adultFood} \u{1F33E}</span></div>
      <div class="detail-row"><span>\u{1F476} Children (${totalChildren} \u00D7 ${window.FOOD_PER_CHILD}):</span><span>${childFood} \u{1F33E}</span></div>
      <div class="detail-row total-row"><span><strong>Total per turn:</strong></span><span><strong>${totalFood} \u{1F33E}</strong></span></div>
    </div>`;

  document.getElementById('population-details-content').innerHTML = html;
}

// ---- GAME MENU ----

function openGameMenu() {
  document.getElementById('game-menu-overlay').classList.add('visible');
}

function closeGameMenu() {
  document.getElementById('game-menu-overlay').classList.remove('visible');
}

// ---- COHESION OVERLAY ----

function pillarBarColor(val) {
  return val >= 60 ? 'var(--accent-green)' : val >= 40 ? 'var(--text-gold)' : val >= 20 ? 'orange' : 'var(--accent-red)';
}

function cohesionDriversSatisfaction() {
  const drivers = [];
  const gs = gameState;
  const c = gs.cohesion;

  const totalChildren = window.getTotalChildren ? window.getTotalChildren() : 0;
  const totalFoodNeed = (gs.population.total * (window.FOOD_PER_POP || 2)) + (totalChildren * (window.FOOD_PER_CHILD || 1));
  const stockpile = gs.resources.food;
  const netFood = window.calculateIncome ? window.calculateIncome().netFood : 0;
  const turnsOfFood = netFood >= 0 ? Infinity : stockpile / Math.abs(netFood);

  if (netFood >= 0 && stockpile >= totalFoodNeed) {
    drivers.push({ type: 'positive', text: '🌾 Food is sustainable — people feel secure' });
  } else if (netFood >= 0) {
    drivers.push({ type: 'neutral', text: '🌾 Self-sustaining but stockpile low' });
  } else if (turnsOfFood > 8) {
    drivers.push({ type: 'neutral', text: '🌾 Food draining slowly — buffer remaining' });
  } else if (turnsOfFood > 4) {
    drivers.push({ type: 'negative', text: `🌾 Food worry — ~${Math.floor(turnsOfFood)} turns remain` });
  } else if (turnsOfFood > 2) {
    drivers.push({ type: 'negative', text: `🌾 Food fear — only ~${Math.floor(turnsOfFood)} turns remain` });
  } else {
    drivers.push({ type: 'negative', text: '💀 Starvation crisis — morale collapsing' });
  }

  const totalPop = gs.population.total + totalChildren;
  const shelterPoints = window.calculateShelterPoints ? window.calculateShelterPoints() : 0;
  const shelterRatio = shelterPoints / Math.max(1, totalPop);
  if (shelterRatio >= 0.8) drivers.push({ type: 'positive', text: '🏠 Good shelter for the population' });
  else if (shelterRatio >= 0.5) drivers.push({ type: 'neutral', text: '🏠 Adequate shelter' });
  else if (shelterRatio < 0.3) drivers.push({ type: 'negative', text: '🏠 Poor shelter conditions' });

  const freedomPolicy = gs.governance.policies.freedom;
  if (freedomPolicy > 70) drivers.push({ type: 'positive', text: '🕊️ High freedom improves morale' });
  else if (freedomPolicy < 30) drivers.push({ type: 'negative', text: '⛓️ Strict control reduces satisfaction' });

  if (totalChildren > 0 && window.WORKING_AGE < 10) {
    drivers.push({ type: 'negative', text: `👶 Children working young (age ${window.WORKING_AGE})` });
  } else if (totalChildren > 0 && window.WORKING_AGE > 12) {
    drivers.push({ type: 'positive', text: `🧒 Protected childhood (age ${window.WORKING_AGE})` });
  }

  const currentModel = window.GOVERNANCE_MODELS?.[gs.governance.model];
  if (currentModel?.effects?.satisfaction?.orderBonus) {
    drivers.push({ type: 'positive', text: '⚖️ Theocracy provides order and structure' });
  }
  if (currentModel?.effects?.satisfaction?.freedomPenalty) {
    drivers.push({ type: 'negative', text: '⚖️ Theocracy restricts personal freedom' });
  }

  drivers.push({ type: 'neutral', text: '⏱️ Drifts toward baseline (50)' });
  return drivers;
}

function cohesionDriversIdentity() {
  const drivers = [];
  const gs = gameState;

  const storytellers = gs.culture?.storytellers ?? 0;
  const stories = gs.culture?.stories?.length ?? 0;
  if (storytellers > 0) {
    drivers.push({ type: 'positive', text: `📖 ${storytellers} storyteller${storytellers > 1 ? 's' : ''} preserving oral history` });
  }
  if (stories > 0) {
    drivers.push({ type: 'positive', text: `📜 ${stories} stor${stories > 1 ? 'ies' : 'y'} in the oral tradition` });
  }

  const activeTraditions = gs.traditions?.filter(t => !t.abandoned)?.length ?? 0;
  if (activeTraditions > 0) {
    drivers.push({ type: 'positive', text: `🎭 ${activeTraditions} active tradition${activeTraditions > 1 ? 's' : ''} strengthening culture` });
  }

  const namedFeatures = gs.culture?.namedFeatures?.length ?? 0;
  if (namedFeatures > 0) {
    drivers.push({ type: 'positive', text: `📌 ${namedFeatures} named landscape feature${namedFeatures > 1 ? 's' : ''}` });
  }

  const sacredSites = gs.map ? gs.map.flat().filter(h => h.building === 'sacred_site' && h.buildProgress <= 0).length : 0;
  if (sacredSites > 0) {
    drivers.push({ type: 'positive', text: `⛩️ ${sacredSites} sacred site${sacredSites > 1 ? 's' : ''} on the land` });
  }

  if (gs.resources.knowledge >= 20) {
    drivers.push({ type: 'positive', text: `🧠 Knowledge growing (${Math.floor(gs.resources.knowledge)} accumulated)` });
  } else if (gs.resources.knowledge >= 10) {
    drivers.push({ type: 'neutral', text: `🧠 Some knowledge accumulated (${Math.floor(gs.resources.knowledge)})` });
  }

  const traditionPolicy = gs.governance.policies.tradition;
  if (traditionPolicy > 70) drivers.push({ type: 'positive', text: '🌿 Strong tradition policy reinforces identity' });
  else if (traditionPolicy < 30) drivers.push({ type: 'negative', text: '⚡ Innovation policy erodes traditional identity' });

  const currentModel = window.GOVERNANCE_MODELS?.[gs.governance.model];
  if (currentModel?.effects?.identity?.faithBonus) {
    drivers.push({ type: 'positive', text: '🙏 Theocracy builds identity through shared faith' });
  }
  if (currentModel?.effects?.identity?.leadershipBonus) {
    drivers.push({ type: 'positive', text: '👑 Chieftain provides leadership identity' });
  }

  const totalChildren = window.getTotalChildren ? window.getTotalChildren() : 0;
  if (totalChildren > 0 && window.WORKING_AGE < 10) {
    drivers.push({ type: 'negative', text: '📚 Low working age reducing knowledge generation' });
  }

  drivers.push({ type: 'neutral', text: '⏱️ Drifts slowly toward baseline (50)' });
  return drivers;
}

function cohesionDriversLegitimacy() {
  const drivers = [];
  const gs = gameState;
  const c = gs.cohesion;

  const currentModel = window.GOVERNANCE_MODELS?.[gs.governance.model];
  if (currentModel) {
    drivers.push({ type: 'neutral', text: `⚖️ ${currentModel.name}: baseline ${currentModel.effects.legitimacy.base}` });
  }

  if (gs.governance.modelChangeTimer > 0) {
    drivers.push({ type: 'negative', text: `🔄 Governance transition in progress (${gs.governance.modelChangeTimer} turns remaining)` });
  }

  if (currentModel?.effects?.legitimacy?.timeStabilityBonus && gs.year >= 3) {
    drivers.push({ type: 'positive', text: '🕰️ Stability gained from years of rule' });
  }

  if (c.satisfaction < 30) {
    if (currentModel?.effects?.legitimacy?.satisfactionDependency) {
      drivers.push({ type: 'negative', text: '😤 Low satisfaction undermining authority (Chieftain is vulnerable)' });
    } else {
      drivers.push({ type: 'negative', text: '😤 Low satisfaction undermining authority' });
    }
  }

  if (currentModel?.effects?.legitimacy?.identityDependency) {
    if (c.identity >= 50) {
      drivers.push({ type: 'positive', text: '🙏 Strong identity supporting faith-based authority' });
    } else {
      drivers.push({ type: 'negative', text: '🙏 Weak identity undermining faith-based authority' });
    }
  }

  if (currentModel?.effects?.legitimacy?.traditionBonus) {
    const trad = gs.governance.policies.tradition;
    if (trad > 50) drivers.push({ type: 'positive', text: '🌿 Tradition policy reinforcing authority' });
    else if (trad < 50) drivers.push({ type: 'negative', text: '⚡ Innovation policy weakening traditional authority' });
  }

  drivers.push({ type: 'neutral', text: `⏱️ Drifts toward model baseline (${currentModel?.effects?.legitimacy?.base ?? 50})` });
  return drivers;
}

function cohesionDriversBonds() {
  const drivers = [];
  const gs = gameState;
  const c = gs.cohesion;

  if (gs.year >= 2) {
    drivers.push({ type: 'positive', text: `🌍 ${gs.year} years on this land — community roots deepen` });
  } else {
    drivers.push({ type: 'neutral', text: '🌱 Still new to this land — bonds take time to form' });
  }

  const sacredSitesWorked = gs.map ? gs.map.flat().filter(h => h.building === 'sacred_site' && h.buildProgress <= 0 && h.workers > 0).length : 0;
  if (sacredSitesWorked > 0) {
    const bDef = window.BUILDINGS?.sacred_site;
    const bondsPerTurn = sacredSitesWorked * (bDef?.bondsYield ?? 2);
    drivers.push({ type: 'positive', text: `⛩️ ${sacredSitesWorked} sacred site${sacredSitesWorked > 1 ? 's' : ''} tended (+${bondsPerTurn} Bonds/turn)` });
  }

  if (c.satisfaction < 40 && gs.population.total > 1) {
    drivers.push({ type: 'positive', text: '🤝 Shared hardship is forging stronger bonds' });
  }

  const currentModel = window.GOVERNANCE_MODELS?.[gs.governance.model];
  if (currentModel?.effects?.bonds?.stabilityBonus) {
    drivers.push({ type: 'positive', text: '🏛️ Tribal Council\'s collective decisions build community' });
  }
  if (currentModel?.effects?.bonds?.unityBonus) {
    drivers.push({ type: 'positive', text: '👑 Chieftain\'s strong leadership unifies the people' });
  }
  if (currentModel?.effects?.bonds?.sharedBeliefBonus) {
    drivers.push({ type: 'positive', text: '🙏 Shared faith creates deep community bonds' });
  }

  const traditionPolicy = gs.governance.policies.tradition;
  if (traditionPolicy > 60) {
    drivers.push({ type: 'positive', text: '🌿 Traditional values strengthen community ties' });
  }

  drivers.push({ type: 'neutral', text: '⏱️ Drifts slowly toward baseline (45)' });
  return drivers;
}

function renderCohesionOverlay() {
  const c = gameState.cohesion;
  const projected = window.previewCohesionDeltas ? window.previewCohesionDeltas() : {};
  const status = window.getCohesionStatus ? window.getCohesionStatus() : { status: 'Unknown', color: 'var(--text-gold)' };

  const pillars = [
    { key: 'identity',     name: 'Identity',     icon: '🧬', desc: 'Your people\'s sense of shared culture, belief, and belonging. Builds slowly through traditions, storytelling, and naming the land.', drivers: cohesionDriversIdentity() },
    { key: 'legitimacy',   name: 'Legitimacy',   icon: '⚖️', desc: 'How much people accept the authority and decisions of their leaders. Depends on governance model, policy choices, and stability.', drivers: cohesionDriversLegitimacy() },
    { key: 'satisfaction', name: 'Satisfaction', icon: '🌻', desc: 'Immediate wellbeing and happiness. Most volatile pillar — reacts quickly to food, shelter, and freedom.', drivers: cohesionDriversSatisfaction() },
    { key: 'bonds',        name: 'Bonds',        icon: '🤝', desc: 'The strength of community ties. Grows slowly over time. Sacred places and shared hardship both deepen bonds.', drivers: cohesionDriversBonds() }
  ];

  const pillarValues = pillars.map(p => c[p.key]);
  const minVal = Math.min(...pillarValues);
  const lowestPillar = pillars.find(p => c[p.key] === minVal);

  const fmt = d => d !== 0 ? `<span class="cohesion-delta ${d > 0 ? 'pos' : 'neg'}">${d > 0 ? '+' : ''}${Math.round(d)}</span>` : '';

  let html = `<div class="cohesion-overview">
    <div class="cohesion-total-row">
      <span class="cohesion-total-value" style="color:${status.color}">${c.total}</span>
      <span class="cohesion-total-status" style="color:${status.color}">${status.status}</span>
    </div>
    <div class="cohesion-total-desc">Total cohesion is a weighted average of four pillars (70% average, 30% minimum). The lowest pillar exerts extra drag on the whole.</div>
    ${minVal < 40 ? `<div class="cohesion-warning">⚠️ <strong>${lowestPillar.name}</strong> is your weakest pillar at ${minVal} — it is pulling the whole society down.</div>` : ''}
  </div>
  <div class="cohesion-pillars">`;

  for (const pillar of pillars) {
    const val = c[pillar.key];
    const delta = Math.round(projected[pillar.key] ?? 0);
    const isLowest = pillar.key === lowestPillar.key;

    html += `<div class="cohesion-pillar-card${isLowest ? ' lowest' : ''}">
      <div class="cohesion-pillar-header">
        <span class="cohesion-pillar-icon">${pillar.icon}</span>
        <span class="cohesion-pillar-name">${pillar.name}</span>
        <span class="cohesion-pillar-val">${val}${fmt(delta)}</span>
      </div>
      <div class="cohesion-pillar-bar-wrap">
        <div class="cohesion-pillar-bar" style="width:${val}%;background:${pillarBarColor(val)}"></div>
      </div>
      <div class="cohesion-pillar-desc">${pillar.desc}</div>
      <div class="cohesion-pillar-drivers">`;

    for (const driver of pillar.drivers) {
      html += `<div class="cohesion-driver ${driver.type}">${driver.text}</div>`;
    }

    html += `</div></div>`;
  }

  html += `</div>`;
  document.getElementById('cohesion-overlay-content').innerHTML = html;
}

export {
  initOverlayRenderers,
  getWorkforceGroups,
  renderWorkforceOverlay,
  renderUnitsTab,
  selectAndFocusUnit,
  renderGovernanceOverlay,
  selectGovernanceModel,
  openPopulationDetails,
  closePopulationDetails,
  renderPopulationDetails,
  openGameMenu,
  closeGameMenu,
  renderCohesionOverlay
};

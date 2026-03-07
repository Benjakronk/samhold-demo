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

  const workingAgeSlider = document.getElementById('policy-working-age');
  const workingAgeDisplay = document.getElementById('working-age-value');
  const workingAgeHeader = document.getElementById('policy-header-working-age');

  if (workingAgeSlider) {
    workingAgeSlider.value = window.WORKING_AGE;
    workingAgeSlider.oninput = (e) => {
      const newAge = parseInt(e.target.value);
      window.WORKING_AGE = newAge;
      workingAgeDisplay.textContent = newAge;

      const ageLevel = window.getWorkingAgeLabel(newAge);
      workingAgeHeader.textContent = `Childhood & Labor (${ageLevel})`;

      window.updatePolicySummary();
      window.updateAllUI();
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
  closeGameMenu
};

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

function getModelSpecificDetails(modelKey) {
  const gs = gameState;
  if (modelKey === 'monarchy' && gs.governance.monarchy?.currentRuler) {
    const mon = gs.governance.monarchy;
    const qualityBar = '█'.repeat(Math.round(mon.currentRuler.quality * 5)) + '░'.repeat(5 - Math.round(mon.currentRuler.quality * 5));
    return `
      <div style="margin-top: 12px; font-weight: bold; color: var(--text-gold);">Dynasty: ${mon.dynastyName}</div>
      <div class="model-detail-row">• Ruler: ${mon.currentRuler.name} (quality: ${qualityBar})</div>
      <div class="model-detail-row">• Heir: ${mon.heir ? mon.heir.name : '<span style="color:var(--accent-red)">None — succession risk!</span>'}</div>
      <div class="model-detail-row">• Dynasty age: ${mon.dynastyAge} turns</div>
      ${mon.successionCrisisActive ? '<div class="model-detail-row" style="color:var(--accent-red)">⚠️ Succession crisis active!</div>' : ''}
    `;
  }
  if (modelKey === 'militaryRule') {
    const mil = gs.governance.militaryRule;
    const strengthBar = '█'.repeat(Math.round((mil.commanderStrength ?? 1) * 5)) + '░'.repeat(5 - Math.round((mil.commanderStrength ?? 1) * 5));
    return `
      <div style="margin-top: 12px; font-weight: bold; color: var(--text-gold);">Military Command</div>
      <div class="model-detail-row">• Commander strength: ${strengthBar}</div>
      <div class="model-detail-row">• Consecutive victories: ${mil.consecutiveVictories ?? 0}</div>
      <div class="model-detail-row">• Turns in power: ${mil.turnsInPower ?? 0}</div>
      <div class="model-detail-row">• Combat bonuses: +30% attack, +20% defense</div>
      <div class="model-detail-row" style="color:orange">• Freedom locked to 20 max. Satisfaction erodes each turn.</div>
    `;
  }
  if (modelKey === 'democracy') {
    const dem = gs.governance.democracy;
    const pendingStr = (dem.pendingPolicyChanges?.length > 0)
      ? dem.pendingPolicyChanges.map(p => `${p.policy}: ${p.newValue} (${p.turnsRemaining} turns)`).join(', ')
      : 'None';
    return `
      <div style="margin-top: 12px; font-weight: bold; color: var(--text-gold);">Democratic Governance</div>
      <div class="model-detail-row">• Next election: ${dem.electionTimer ?? '?'} turns</div>
      <div class="model-detail-row">• Voter satisfaction: ${Math.round(dem.voterSatisfaction ?? 50)}</div>
      <div class="model-detail-row">• Pending votes: ${pendingStr}</div>
      <div class="model-detail-row" style="color:orange">• Freedom locked to 40 min. Major policy changes take 2 turns.</div>
    `;
  }
  return '';
}

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

    // Check requirements for locked models
    const req = window.checkModelRequirements ? window.checkModelRequirements(key) : { met: true, reasons: [] };
    const isLocked = !isActive && !req.met;
    const lockText = isLocked ? `<div class="gov-model-locked">🔒 ${req.reasons.join(', ')}</div>` : '';

    return `
      <div class="gov-model ${isActive ? 'active' : ''} ${isLocked ? 'locked' : ''}" onclick="${isLocked ? '' : `selectGovernanceModel('${key}')`}" ${isLocked ? 'title="Requirements not met"' : ''}>
        <div class="gov-model-icon">${model.icon}</div>
        <div class="gov-model-name">${model.name}</div>
        <div class="gov-model-desc">${model.description}</div>
        ${lockText}
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
    <div class="model-detail-row">\u2022 Isolation policies: ${activeModel.policyEffects.isolation?.multiplier ?? 1.0}x effectiveness</div>
    ${getModelSpecificDetails(currentModel)}
  `;

  const policyHeaders = {
    freedom: 'Freedom vs Control',
    mercy: 'Justice & Punishment',
    tradition: 'Culture & Change',
    isolation: 'Borders & Contact'
  };

  const policies = ['freedom', 'mercy', 'tradition', 'isolation'];
  policies.forEach(policy => {
    const slider = document.getElementById(`policy-${policy}`);
    const valueDisplay = document.getElementById(`policy-${policy}-value`);
    const header = document.getElementById(`policy-header-${policy}`);

    // Apply governance-model policy constraints to slider
    const constraints = window.getPolicyConstraints ? window.getPolicyConstraints(policy) : { min: 0, max: 100 };
    slider.min = constraints.min;
    slider.max = constraints.max;

    // Show pending value (if set) or effective value on the slider
    const lagState = window.getPolicyLagState ? window.getPolicyLagState(policy) : null;
    const pendingVal = lagState?.pending;
    const effectiveVal = gameState.governance.policies[policy] ?? 50;
    const displayVal = pendingVal !== null && pendingVal !== undefined ? pendingVal : effectiveVal;
    slider.value = displayVal;
    valueDisplay.textContent = displayVal;

    const currentLevel = window.getPolicyLabel(policy, effectiveVal);
    const lagNote = lagState?.lag ? ` ⏳ → ${lagState.lag.target} (${lagState.lag.turnsRemaining}t)` : '';
    header.textContent = `${policyHeaders[policy]} (${currentLevel})${lagNote}`;

    slider.oninput = (e) => {
      const newValue = parseInt(e.target.value);
      valueDisplay.textContent = newValue;
      window.adjustPolicy(policy, newValue);
      renderPolicyLagStatus(policy);
      renderPolicyBatchControls();
    };

    // Render lag status for this policy
    renderPolicyLagStatus(policy);
  });

  // Immigration policy sliders (culturalOpenness, progressiveness) — static HTML, wired like main policies
  const immigrationPolicies = ['culturalOpenness', 'progressiveness'];
  const immigrationHeaders = {
    culturalOpenness: 'Cultural Tolerance',
    progressiveness: 'Integration Effort'
  };
  immigrationPolicies.forEach(policy => {
    const slider = document.getElementById(`policy-${policy}`);
    const valueDisplay = document.getElementById(`policy-${policy}-value`);
    const header = document.getElementById(`policy-header-${policy}`);
    if (!slider || !valueDisplay) return;

    const lagState = window.getPolicyLagState ? window.getPolicyLagState(policy) : null;
    const pendingVal = lagState?.pending;
    const effectiveVal = gameState.governance.policies[policy] ?? 50;
    const displayVal = pendingVal !== null && pendingVal !== undefined ? pendingVal : effectiveVal;
    slider.value = displayVal;
    valueDisplay.textContent = displayVal;

    if (header) {
      const currentLevel = window.getPolicyLabel ? window.getPolicyLabel(policy, effectiveVal) : '';
      const lagNote = lagState?.lag ? ` ⏳ → ${lagState.lag.target} (${lagState.lag.turnsRemaining}t)` : '';
      header.textContent = `${immigrationHeaders[policy]} (${currentLevel})${lagNote}`;
    }

    slider.oninput = (e) => {
      const newValue = parseInt(e.target.value);
      valueDisplay.textContent = newValue;
      window.adjustPolicy(policy, newValue);
      renderPolicyLagStatus(policy);
      renderPolicyBatchControls();
    };

    renderPolicyLagStatus(policy);
  });

  // Ration priority radio buttons (instant — no lag)
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
    // Show pending or effective
    const waLag = window.getPolicyLagState ? window.getPolicyLagState('workingAge') : null;
    const waPending = waLag?.pending;
    const waEffective = window.WORKING_AGE;
    const waDisplay = waPending !== null && waPending !== undefined ? waPending : waEffective;
    workingAgeSlider.value = waDisplay;
    workingAgeSlider.oninput = (e) => {
      const newAge = parseInt(e.target.value);
      window.adjustWorkingAge(newAge - window.WORKING_AGE);
      renderPolicyLagStatus('workingAge');
      renderPolicyBatchControls();
    };
  }

  if (workingAgeDisplay) {
    const waLag2 = window.getPolicyLagState ? window.getPolicyLagState('workingAge') : null;
    const waDisp = waLag2?.pending !== null && waLag2?.pending !== undefined ? waLag2.pending : window.WORKING_AGE;
    workingAgeDisplay.textContent = waDisp;
  }
  if (workingAgeHeader) {
    const ageLevel = window.getWorkingAgeLabel(window.WORKING_AGE);
    const waLag3 = window.getPolicyLagState ? window.getPolicyLagState('workingAge') : null;
    const waLagNote = waLag3?.lag ? ` ⏳ → ${waLag3.lag.target} (${waLag3.lag.turnsRemaining}t)` : '';
    workingAgeHeader.textContent = `Childhood & Labor (${ageLevel})${waLagNote}`;
  }

  renderPolicyLagStatus('workingAge');
  renderPolicyBatchControls();

  // Render resistance panel content (always, so it's ready when tab is clicked)
  renderResistancePanel();

  // Render crime panel content
  renderCrimePanel();

  // Render immigration panel content
  renderImmigrationPanel();

  // Render class system panel content
  renderClassPanel();
}

function renderPolicyLagStatus(policy) {
  const el = document.getElementById(`policy-lag-${policy}`);
  if (!el) return;

  const lagState = window.getPolicyLagState ? window.getPolicyLagState(policy) : null;
  if (!lagState) { el.innerHTML = ''; return; }

  let html = '';
  const { lag, pending, effective } = lagState;

  // Show pending (uncommitted) state
  if (pending !== null && pending !== undefined && pending !== effective && (!lag || pending !== lag.target)) {
    const { category } = window.classifyPolicyChange
      ? window.classifyPolicyChange(policy, Math.abs(pending - effective), pending - effective)
      : { category: 'directive' };
    const lagCalc = window.calculateEffectiveLag
      ? window.calculateEffectiveLag(policy, pending, lag ? lag.startValue : effective)
      : { turns: '?', category };

    html += `<div class="policy-lag-row pending">
      <span class="policy-lag-text">📝 Uncommitted: ${effective} → ${pending} (${lagCalc.turns}t ${lagCalc.category})</span>
      <button class="policy-lag-btn commit" onclick="window.commitPolicyChange('${policy}'); renderGovernanceOverlay();">Commit</button>
      <button class="policy-lag-btn discard" onclick="window.discardPendingPolicy('${policy}'); renderGovernanceOverlay();">Discard</button>
    </div>`;
  }

  // Show active lag (committed, in progress)
  if (lag) {
    const progress = Math.round((1 - lag.turnsRemaining / lag.lagTurns) * 100);
    const transType = lag.category === 'directive' ? 'snap' : 'interpolating';
    html += `<div class="policy-lag-row active">
      <span class="policy-lag-text">⏳ ${lag.startValue} → ${lag.target} (${lag.turnsRemaining}t left, ${transType})</span>
      <button class="policy-lag-btn abandon" onclick="window.abandonPolicyChange('${policy}'); renderGovernanceOverlay();">Abandon</button>
      <button class="policy-lag-btn force" onclick="window.forcePolicyChange('${policy}'); renderGovernanceOverlay();">Force</button>
    </div>
    <div class="policy-lag-progress"><div class="policy-lag-progress-fill" style="width:${progress}%"></div></div>`;
  }

  el.innerHTML = html;
}

function renderPolicyBatchControls() {
  const el = document.getElementById('policy-batch-controls');
  if (!el) return;

  const pCount = window.pendingCount ? window.pendingCount() : 0;
  if (pCount === 0) { el.innerHTML = ''; return; }

  el.innerHTML = `
    <button class="policy-batch-btn commit-all" onclick="window.commitAllPending(); renderGovernanceOverlay();">Commit All (${pCount})</button>
    <button class="policy-batch-btn discard-all" onclick="window.discardAllPending(); renderGovernanceOverlay();">Discard All</button>
  `;
}

function renderResistancePanel() {
  const el = document.getElementById('resistance-panel-content');
  if (!el) return;

  const r = window.getResistanceState ? window.getResistanceState() : null;
  if (!r) { el.innerHTML = '<p style="color:var(--text-dim)">Resistance system not active.</p>'; return; }

  const thresholds = r.thresholds;
  const pct = Math.min(100, r.pressure);

  // Determine bar color
  let barColor = 'var(--text-dim)';
  if (pct >= 95) barColor = '#cc3333';
  else if (pct >= 60) barColor = '#cc6633';
  else if (pct >= 40) barColor = '#ccaa33';
  else if (pct >= 25) barColor = '#999933';

  // Pressure meter with threshold markers
  let html = '<h3>Resistance Pressure</h3>';
  html += `<div class="resistance-meter">
    <div class="resistance-meter-bar" style="width:${pct}%;background:${barColor}"></div>
    <div class="resistance-meter-mark" style="left:${thresholds.warning}%" title="Warning (${thresholds.warning})"></div>
    <div class="resistance-meter-mark" style="left:${thresholds.faction}%" title="Faction (${thresholds.faction})"></div>
    <div class="resistance-meter-mark" style="left:${thresholds.organized}%" title="Organized (${thresholds.organized})"></div>
    <div class="resistance-meter-mark" style="left:${thresholds.hostile}%" title="Hostile (${thresholds.hostile})"></div>
    <div class="resistance-meter-mark" style="left:${thresholds.radical}%" title="Radical (${thresholds.radical})"></div>
  </div>`;
  html += `<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-dim);margin-top:2px">
    <span>Calm (0)</span>
    <span>Pressure: ${Math.round(pct)}</span>
    <span>Crisis (100)</span>
  </div>`;

  // Status description
  let statusText = 'The people are content.';
  let statusCls = '';
  if (pct >= 95) { statusText = 'Radical uprising threatens the entire society.'; statusCls = 'danger'; }
  else if (pct >= 80) { statusText = 'Hostility is boiling over. Emigration is a real risk.'; statusCls = 'danger'; }
  else if (pct >= 60) { statusText = 'Organized resistance is disrupting governance. Policy implementation is slowed.'; statusCls = 'warning'; }
  else if (pct >= 40) { statusText = 'An opposition faction has formed and speaks for the discontented.'; statusCls = 'warning'; }
  else if (pct >= 25) { statusText = 'Murmurs of discontent are growing. Advisors urge attention.'; statusCls = ''; }
  html += `<div class="resistance-status ${statusCls}" style="margin:10px 0;padding:6px 8px;border-radius:4px;font-size:12px;">${statusText}</div>`;

  // Faction card
  if (r.faction.active) {
    const dispLabel = window.getDispositionLabel ? window.getDispositionLabel(r.faction.disposition) : r.faction.disposition;
    const dispCls = 'disposition-' + r.faction.disposition;
    html += `<div class="faction-card">
      <h3>The Faction</h3>
      <div class="faction-name">"${r.faction.name}"</div>
      <div class="faction-leader">Led by ${r.faction.leader}</div>
      <div class="faction-disposition ${dispCls}">Stance: ${dispLabel}</div>
      ${r.faction.formalInfluence ? '<div class="faction-influence">🏛️ Has formal influence in governance</div>' : ''}
      <div style="font-size:11px;color:var(--text-dim);margin-top:6px">
        Suppressions: ${r.suppressionCount} · Recurrence multiplier: ${r.recurrenceMultiplier.toFixed(2)}x
      </div>
    </div>`;

    // Promise registry
    if (r.faction.promises.length > 0) {
      html += '<h3 style="margin-top:12px">Promises</h3>';
      html += '<div class="promise-list">';
      for (const p of r.faction.promises) {
        const turnsLeft = p.deadline - gameState.turn;
        const urgency = turnsLeft <= 4 ? 'urgent' : turnsLeft <= 8 ? 'soon' : '';
        html += `<div class="promise-item ${urgency}">
          <span>${p.description}</span>
          <span class="promise-deadline">${turnsLeft > 0 ? turnsLeft + 't left' : 'OVERDUE'} · ${p.binding ? 'Binding' : 'Non-binding'}</span>
        </div>`;
      }
      html += '</div>';
    }
  } else {
    if (pct < 25) {
      html += '<p style="color:var(--text-dim);font-size:12px;">No organized opposition exists. Maintain trust to keep it that way.</p>';
    } else {
      html += '<p style="color:var(--text-dim);font-size:12px;">Discontent is rising but has not yet organized into a faction.</p>';
    }
  }

  el.innerHTML = html;
}

function renderCrimePanel() {
  const el = document.getElementById('crime-panel-content');
  if (!el) return;

  const crime = window.getCrimeState ? window.getCrimeState() : null;
  if (!crime) { el.innerHTML = '<p style="color:var(--text-dim)">Crime system not active.</p>'; return; }

  const detection = crime.detectionLevel;
  let html = '';

  // Detection level info
  if (detection === 0) {
    html += `<div class="crime-no-detection">
      <h3>⚖️ Crime</h3>
      <p style="color:var(--text-dim);font-size:12px;">You have no way to monitor crime. Build a <strong>Justice Hall</strong> and assign workers to detect criminal activity.</p>
    </div>`;

    // Still show qualitative climate text
    const climate = window.getCrimeClimateText ? window.getCrimeClimateText() : null;
    if (climate) {
      html += `<div class="crime-climate-hint ${climate.cls}" style="margin-top:8px;padding:6px 8px;border-radius:4px;font-size:12px;">${climate.text}</div>`;
    }
  } else {
    html += '<h3>⚖️ Crime Report</h3>';
    html += `<div style="font-size:11px;color:var(--text-dim);margin-bottom:8px">Detection level: ${detection}/3 (${detection === 1 ? 'theft only' : detection === 2 ? 'theft + violence' : 'full visibility'})</div>`;

    // Crime tracks (gated by detection)
    const tracks = [];
    if (crime.visibleTheft !== null) tracks.push({ name: 'Theft', value: crime.visibleTheft, icon: '🔓', color: '#ccaa33' });
    if (crime.visibleViolence !== null) tracks.push({ name: 'Violence', value: crime.visibleViolence, icon: '⚔️', color: '#cc6633' });
    if (crime.visibleTransgression !== null) tracks.push({ name: 'Transgression', value: crime.visibleTransgression, icon: '🚫', color: '#9966cc' });

    for (const track of tracks) {
      const pct = Math.min(100, (track.value / 20) * 100);
      html += `<div class="crime-track" style="margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px">
          <span>${track.icon} ${track.name}</span>
          <span style="color:${track.color};font-weight:bold">${track.value.toFixed(1)}</span>
        </div>
        <div style="height:6px;background:rgba(0,0,0,0.3);border-radius:3px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${track.color};transition:width 0.3s"></div>
        </div>
      </div>`;
    }

    // Overall severity
    const severity = crime.overallSeverity;
    const sevPct = Math.min(100, (severity / 30) * 100);
    let sevColor = '#666';
    if (severity >= 15) sevColor = '#cc3333';
    else if (severity >= 10) sevColor = '#cc6633';
    else if (severity >= 5) sevColor = '#ccaa33';

    html += `<div style="margin-top:12px;padding:8px;background:rgba(0,0,0,0.15);border-radius:4px">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
        <span>Overall Severity</span>
        <span style="color:${sevColor};font-weight:bold">${severity.toFixed(1)}</span>
      </div>
      <div style="height:8px;background:rgba(0,0,0,0.3);border-radius:4px;overflow:hidden">
        <div style="height:100%;width:${sevPct}%;background:${sevColor};transition:width 0.3s"></div>
      </div>
    </div>`;

    // Organized predation warning
    if (crime.visibleOrganized) {
      html += `<div class="crime-organized-warning" style="margin-top:8px;padding:6px 8px;background:rgba(200,50,50,0.15);border:1px solid rgba(200,50,50,0.3);border-radius:4px;font-size:12px;color:#cc6666">
        ⚠️ <strong>Organized Crime Active</strong> — Theft rings and protection rackets are operating. Crime effects are doubled.
      </div>`;
    }

    // Crackdown button
    if (detection >= 1) {
      const cooldown = crime.crackdownCooldown;
      const matCost = Math.ceil(gameState.population.total * 0.1);
      const canCrackdown = cooldown === 0 && gameState.resources.materials >= matCost;

      html += `<div style="margin-top:12px">
        <button class="detail-btn" ${canCrackdown ? `onclick="window.performCrackdown(); renderGovernanceOverlay();"` : 'disabled style="opacity:0.5"'}>
          🔨 Order Crackdown (🪵${matCost})
        </button>
        ${cooldown > 0 ? `<div style="font-size:11px;color:var(--text-dim);margin-top:4px">Cooldown: ${cooldown} turns remaining</div>` : ''}
        <div style="font-size:11px;color:var(--text-dim);margin-top:4px">Reduces crime severity but costs materials, satisfaction, and trust.</div>
      </div>`;
    }
  }

  el.innerHTML = html;
}

function renderImmigrationPanel() {
  const el = document.getElementById('immigration-info-content');
  if (!el) return;

  const imm = window.getImmigrationState ? window.getImmigrationState() : null;
  if (!imm) { el.innerHTML = '<p style="color:var(--text-dim)">Immigration system not active.</p>'; return; }

  let html = '<h3>🚶 Immigration</h3>';

  // Pressure & arrivals
  html += `<div style="margin-top:12px;padding:8px;background:rgba(0,0,0,0.15);border-radius:4px;font-size:12px">
    <div style="display:flex;justify-content:space-between"><span>Immigrant pressure:</span><span style="font-weight:bold">${imm.pressure}</span></div>
    <div style="display:flex;justify-content:space-between"><span>Last arrivals:</span><span style="font-weight:bold">${imm.lastArrivals}</span></div>
    <div style="display:flex;justify-content:space-between"><span>Lifetime arrivals / integrated:</span><span>${imm.lifetimeArrivals} / ${imm.lifetimeIntegrated}</span></div>
  </div>`;

  // Pipeline cohort breakdown
  const labels = ['Arrivals', 'Residents', 'Participants', 'In Integration'];
  const colors = ['#cc6644', '#ccaa33', '#6699cc', '#6cb66c'];
  const totalPipeline = imm.cohorts[0] + imm.cohorts[1] + imm.cohorts[2];

  if (totalPipeline > 0 || imm.parallelSociety.population > 0) {
    html += '<h4 style="margin-top:12px;color:var(--text-light)">Integration Pipeline</h4>';
    html += '<div class="immigration-pipeline">';
    for (let i = 0; i < 3; i++) {
      if (imm.cohorts[i] <= 0) continue;
      html += `<div class="immigration-cohort-row">
        <span style="color:${colors[i]}">${labels[i]}</span>
        <span style="font-weight:bold">${imm.cohorts[i]}</span>
        <span style="font-size:10px;color:var(--text-dim)">(${Math.round(imm.cohortWorkforceRates[i] * 100)}% workforce)</span>
      </div>`;
    }
    html += '</div>';
  }

  // Parallel Society meter
  const ps = imm.parallelSociety;
  if (ps.strength > 0.05 || ps.population > 0) {
    const psPct = Math.round(ps.strength * 100);
    let psColor = '#999';
    let psLabel = '';
    if (ps.strength >= 0.70) { psColor = '#cc3333'; psLabel = 'CRISIS'; }
    else if (ps.strength >= 0.50) { psColor = '#cc6633'; psLabel = 'SEVERE'; }
    else if (ps.strength >= 0.30) { psColor = '#ccaa33'; psLabel = 'GROWING'; }
    else if (ps.strength >= 0.15) { psColor = '#999933'; psLabel = 'FORMING'; }

    html += `<div class="immigration-ps-section" style="margin-top:12px;padding:8px;background:rgba(0,0,0,0.15);border:1px solid ${psColor}44;border-radius:4px">
      <h4 style="color:${psColor};margin:0 0 6px">🏘️ Parallel Society ${psLabel ? `— ${psLabel}` : ''}</h4>
      <div style="height:8px;background:rgba(0,0,0,0.3);border-radius:4px;overflow:hidden;margin-bottom:6px">
        <div style="height:100%;width:${psPct}%;background:${psColor};transition:width 0.3s"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-dim)">
        <span>Strength: ${psPct}%</span>
        <span>Population: ${ps.population} adults, ${ps.children} children</span>
      </div>
    </div>`;

    // Intervention panel (appears at PSS > 0.15)
    if (ps.strength >= 0.15) {
      html += '<h4 style="margin-top:12px;color:var(--text-light)">Interventions</h4>';

      const activeIntervention = imm.interventionActive;
      const matCost = Math.ceil(gameState.population.total * 0.05);
      const canAffordMat = gameState.resources.materials >= matCost;

      const interventions = [
        { id: 'integration', name: 'Integration Programs', icon: '🤝', cost: `🪵${matCost}/turn`,
          desc: 'Invest in shared institutions. Effective up to 50% PSS.', disabled: !canAffordMat },
        { id: 'coercive', name: 'Coercive Assimilation', icon: '⚡', cost: `🪵${matCost}/turn`,
          desc: 'Enforce cultural conformity. Fast but causes resentment.', disabled: !canAffordMat },
        { id: 'containment', name: 'Containment', icon: '🚧', cost: 'None',
          desc: 'Restrict PS access to resources. Buys time only.', disabled: false },
        { id: 'expulsion', name: 'Expulsion', icon: '🚫', cost: 'Catastrophic social cost',
          desc: 'Remove PS population. Last resort.', disabled: ps.population <= 0 },
      ];

      html += '<div class="immigration-interventions">';
      for (const iv of interventions) {
        const isActive = activeIntervention === iv.id;
        html += `<div class="immigration-intervention ${isActive ? 'active' : ''}" style="margin-bottom:6px;padding:6px 8px;background:rgba(0,0,0,0.1);border-radius:4px;font-size:12px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span>${iv.icon} <strong>${iv.name}</strong> <span style="color:var(--text-dim)">(${iv.cost})</span></span>
            ${isActive
              ? `<button class="detail-btn" onclick="window.cancelIntervention(); renderGovernanceOverlay();" style="font-size:11px">Cancel</button>`
              : `<button class="detail-btn" ${iv.disabled || activeIntervention ? 'disabled style="opacity:0.5;font-size:11px"' : `onclick="window.startIntervention('${iv.id}'); renderGovernanceOverlay();" style="font-size:11px"`}>Start</button>`
            }
          </div>
          <div style="font-size:10px;color:var(--text-dim);margin-top:2px">${iv.desc}</div>
          ${isActive ? `<div style="font-size:10px;color:var(--text-gold);margin-top:2px">Active for ${imm.interventionTurns} turns</div>` : ''}
        </div>`;
      }
      html += '</div>';
    }
  }

  // Unintegrated ratio warning
  if (imm.unintegratedRatio >= 0.12) {
    const pct = Math.round(imm.unintegratedRatio * 100);
    const cls = pct >= 18 ? 'danger' : 'warning';
    html += `<div class="immigration-warning ${cls}" style="margin-top:8px;padding:6px 8px;border-radius:4px;font-size:12px">
      ⚠️ ${pct}% of population is unintegrated (Arrivals + Residents). Crystallization threshold: 18%.
    </div>`;
  }

  el.innerHTML = html;

  // Render policy lag status for immigration sliders (static sliders wired in renderGovernanceOverlay)
  renderPolicyLagStatus('culturalOpenness');
  renderPolicyLagStatus('progressiveness');
}

// ---- CLASS SYSTEM PANEL ----

function renderClassPanel() {
  const el = document.getElementById('class-panel-content');
  if (!el) return;

  const state = window.getClassSystemState ? window.getClassSystemState() : null;
  if (!state) { el.innerHTML = '<p style="color:var(--text-dim)">Class system not available.</p>'; return; }

  const BASES = window.STRATIFICATION_BASES;
  const DIFFS = window.DIFFERENTIALS;
  let html = '';

  if (!state.active) {
    // Inactive state — show activation UI
    html += '<h3>⚖️ Class System</h3>';
    html += '<p style="color:var(--text-dim);font-size:12px;margin-bottom:12px">Formal stratification divides society into a privileged class and a common class. This is an active choice with lasting consequences.</p>';

    if (!state.canActivate) {
      const turnsLeft = (window.MIN_TURNS_FOR_ACTIVATION || 8) - state.currentTurn;
      html += `<div class="crime-no-detection" style="padding:12px;text-align:center">
        <p style="color:var(--text-dim)">Society needs more time to develop the institutional complexity for formal stratification.</p>
        <p style="color:var(--text-gold)">${turnsLeft > 0 ? `Available in ${turnsLeft} turns` : 'Available now'}</p>
      </div>`;
    } else {
      html += '<div style="margin-bottom:12px">';
      html += '<div style="font-weight:bold;color:var(--text-light);margin-bottom:8px">Choose a stratification basis:</div>';
      for (const [key, base] of Object.entries(BASES)) {
        const alignment = base.governanceAlignment[gameState.governance.model] || 'moderate';
        const alignColor = alignment === 'strong' ? '#6cb66c' : alignment === 'weak' ? '#cc6644' : '#ccaa33';
        html += `<div class="class-basis-option" style="margin-bottom:8px;padding:8px;background:rgba(0,0,0,0.15);border-radius:4px;cursor:pointer;border:1px solid transparent" onclick="window.confirmActivateClassSystem('${key}')">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:14px">${base.icon} <strong>${base.name}</strong></span>
            <span style="font-size:10px;color:${alignColor}">Alignment: ${alignment}</span>
          </div>
          <div style="font-size:11px;color:var(--text-dim);margin-top:4px">${base.description}</div>
        </div>`;
      }
      html += '</div>';
      html += `<div style="font-size:11px;color:var(--text-dim);padding:6px;background:rgba(0,0,0,0.1);border-radius:4px">
        <strong>Activation cost:</strong> Legitimacy −10, Satisfaction −8, Resistance +15
      </div>`;
    }

    // Show dismantlement aftermath if applicable
    if (state.dismantlementEffects) {
      const de = state.dismantlementEffects;
      html += `<div style="margin-top:12px;padding:8px;background:rgba(200,50,50,0.1);border:1px solid #cc333344;border-radius:4px;font-size:12px">
        <strong style="color:#cc6644">Dismantlement Aftermath</strong>
        ${de.turnsRemaining > 0 ? `<div>Satisfaction penalty: ${de.turnsRemaining} turns remaining</div>` : ''}
        ${de.trustDriftTurnsRemaining > 0 ? `<div>Trust drift: ${de.trustDriftTurnsRemaining} turns remaining</div>` : ''}
      </div>`;
    }

  } else {
    // Active state — show full class system UI
    const baseDef = BASES[state.basis];
    const alignment = baseDef.governanceAlignment[gameState.governance.model] || 'moderate';
    const alignColor = alignment === 'strong' ? '#6cb66c' : alignment === 'weak' ? '#cc6644' : '#ccaa33';

    html += `<h3>${baseDef.icon} Class System — ${baseDef.name}</h3>`;

    // Status bar
    html += `<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:8px;padding:6px 8px;background:rgba(0,0,0,0.15);border-radius:4px">
      <span>Privileged: <strong>${state.privilegedCount}</strong> (${Math.round(state.privilegedRatio * 100)}%)</span>
      <span>Commons: <strong>${state.population - state.privilegedCount}</strong> (${Math.round((1 - state.privilegedRatio) * 100)}%)</span>
      <span style="color:${alignColor}">Alignment: ${alignment}</span>
    </div>`;

    // Crime multiplier display
    if (state.classMultiplier > 1.0) {
      html += `<div style="font-size:11px;color:#cc6644;margin-bottom:8px">⚠️ Crime multiplier: ×${state.classMultiplier.toFixed(2)} among commons</div>`;
    }

    // Differential controls
    html += '<h4 style="color:var(--text-light);margin-top:12px;margin-bottom:8px">Differential Tiers</h4>';

    for (const [dim, def] of Object.entries(DIFFS)) {
      const tier = state.differentials[dim];
      const pending = state.pendingDifferentials[dim];
      const isStrong = baseDef.strongDifferentials.includes(dim);
      const isWeak = baseDef.weakDifferentials.includes(dim);
      const affinityLabel = isStrong ? '★ Strong' : isWeak ? '▽ Weak' : '— Neutral';
      const affinityColor = isStrong ? '#6cb66c' : isWeak ? '#cc6644' : 'var(--text-dim)';

      html += `<div class="class-differential" style="margin-bottom:10px;padding:8px;background:rgba(0,0,0,0.1);border-radius:4px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <span>${def.icon} <strong>${def.name}</strong></span>
          <span style="font-size:10px;color:${affinityColor}">${affinityLabel}</span>
        </div>
        <div class="class-tier-buttons" style="display:flex;gap:4px;margin-bottom:4px">`;

      for (let t = 0; t <= 2; t++) {
        const isActive = tier === t;
        const isPending = pending && pending.target === t;
        const canChange = !pending && Math.abs(t - tier) === 1;
        const tierDef = def.tiers[t];

        let btnClass = isActive ? 'active' : '';
        let btnStyle = `flex:1;padding:4px 6px;border-radius:3px;font-size:11px;border:1px solid;cursor:${canChange ? 'pointer' : 'default'};`;

        if (isActive) {
          btnStyle += 'background:var(--panel-header);color:var(--text-gold);border-color:var(--text-gold);';
        } else if (isPending) {
          btnStyle += 'background:rgba(200,170,50,0.2);color:#ccaa33;border-color:#ccaa33;opacity:0.8;';
        } else if (canChange) {
          btnStyle += 'background:rgba(0,0,0,0.15);color:var(--text-light);border-color:var(--text-dim);';
        } else {
          btnStyle += 'background:rgba(0,0,0,0.05);color:var(--text-dim);border-color:transparent;opacity:0.5;';
        }

        const onclick = canChange ? `onclick="window.confirmDifferentialChange('${dim}', ${t})"` : '';
        html += `<button class="class-tier-btn ${btnClass}" style="${btnStyle}" ${onclick} title="${tierDef.description}">
          ${tierDef.label}${isPending ? ' ⏳' : ''}
        </button>`;
      }

      html += '</div>';

      // Show current tier description
      html += `<div style="font-size:10px;color:var(--text-dim)">${def.tiers[tier].description}</div>`;

      // Pending change info
      if (pending) {
        html += `<div style="font-size:10px;color:#ccaa33;margin-top:4px">
          ⏳ Changing to "${def.tiers[pending.target].label}" in ${pending.turnsRemaining} turn${pending.turnsRemaining !== 1 ? 's' : ''}
          <button class="detail-btn" style="font-size:10px;margin-left:6px;padding:1px 6px" onclick="window.cancelDifferentialChange('${dim}'); renderGovernanceOverlay();">Cancel</button>
        </div>`;
      }

      html += '</div>';
    }

    // Basis change and dismantlement buttons
    html += '<div style="margin-top:16px;display:flex;gap:8px">';
    html += `<button class="detail-btn" style="flex:1;font-size:11px" onclick="window.showChangeBasisDialog()">Change Basis</button>`;
    html += `<button class="detail-btn" style="flex:1;font-size:11px;color:#cc4444;border-color:#cc444444" onclick="window.confirmDismantleClassSystem()">Dismantle</button>`;
    html += '</div>';

    // Basis change aftermath
    if (state.basisChangeEffects) {
      html += `<div style="margin-top:8px;font-size:11px;color:#ccaa33;padding:4px 8px;background:rgba(200,170,50,0.1);border-radius:4px">
        ⏳ Basis change disruption: ${state.basisChangeEffects.turnsRemaining} turns remaining
      </div>`;
    }
  }

  el.innerHTML = html;
}

function selectGovernanceModel(modelKey) {
  if (modelKey !== gameState.governance.model) {
    // Check requirements
    const req = window.checkModelRequirements ? window.checkModelRequirements(modelKey) : { met: true, reasons: [] };
    if (!req.met) return;

    const model = window.GOVERNANCE_MODELS[modelKey];
    const extraWarnings = [];
    if (gameState.governance.model === 'militaryRule') {
      extraWarnings.push('• Leaving military rule incurs additional legitimacy penalty');
    }
    if (modelKey === 'militaryRule') {
      extraWarnings.push('• Freedom will be locked to 20 max');
      extraWarnings.push('• Satisfaction will erode each turn');
    }
    if (modelKey === 'democracy') {
      extraWarnings.push('• Freedom will be locked to 40 min');
      extraWarnings.push('• Major policy changes take 2 turns to vote');
    }
    if (modelKey === 'monarchy') {
      extraWarnings.push('• Succession crises may occur if no heir exists');
    }

    const warningHtml = extraWarnings.length > 0 ? '<br>' + extraWarnings.join('<br>') : '';

    window.showConfirmDialogNonDestructive(
      `Change to ${model.name}?`,
      `Changing governance models causes major disruption:<br>\u2022 Legitimacy will drop significantly<br>\u2022 Takes several turns to stabilize<br>\u2022 Current model: ${window.GOVERNANCE_MODELS[gameState.governance.model].name}${warningHtml}`,
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
  const roundVal = v => Math.round(v);

  let html = `<div class="cohesion-overview">
    <div class="cohesion-total-row">
      <span class="cohesion-total-value" style="color:${status.color}">${c.total}</span>
      <span class="cohesion-total-status" style="color:${status.color}">${status.status}</span>
    </div>
    <div class="cohesion-total-desc">Total cohesion is a weighted average of four pillars (70% average, 30% minimum). The lowest pillar exerts extra drag on the whole.</div>
    ${minVal < 40 ? `<div class="cohesion-warning">⚠️ <strong>${lowestPillar.name}</strong> is your weakest pillar at ${roundVal(minVal)} — it is pulling the whole society down.</div>` : ''}
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
        <span class="cohesion-pillar-val">${roundVal(val)}${fmt(delta)}</span>
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

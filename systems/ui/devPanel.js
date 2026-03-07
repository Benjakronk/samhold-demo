// systems/ui/devPanel.js
// Development panel system for debugging and testing
// Contains dev tools, cheats, testing functions, and debugging utilities
// Authoritative version — replaces previous stub

let gameState = null;
let devActiveTab = 'map';
let currentSeed = 7743;
let devShowRiverVertices = false;
let devHighlightRivers = new Set();
let fogOfWarDisabled = false;

export function initDevPanel(gameStateRef) {
  gameState = gameStateRef;

  // Wire dev panel button event listeners
  const devBtn = document.getElementById('dev-btn');
  const devClose = document.getElementById('dev-close');
  const devOverlay = document.getElementById('dev-overlay');
  const devApplyLive = document.getElementById('dev-apply-live');
  const devApplyRestart = document.getElementById('dev-apply-restart');

  if (devBtn) devBtn.addEventListener('click', openDevOverlay);
  if (devClose) devClose.addEventListener('click', closeDevOverlay);
  if (devOverlay) devOverlay.addEventListener('click', (e) => {
    if (e.target === devOverlay) closeDevOverlay();
  });
  if (devApplyLive) devApplyLive.addEventListener('click', () => {
    applyDevValues();
    closeDevOverlay();
  });
  if (devApplyRestart) devApplyRestart.addEventListener('click', () => {
    applyDevValues();
    const seedEl = document.getElementById('seed-input');
    const seed = seedEl ? (parseInt(seedEl.value) || currentSeed) : currentSeed;
    const startFood = parseInt(document.getElementById('dev-start-food')?.value) || 200;
    const startMats = parseInt(document.getElementById('dev-start-mats')?.value) || 50;
    const startPop = parseInt(document.getElementById('dev-start-pop')?.value) || 25;
    closeDevOverlay();
    window.initGame(seed);
    gameState.resources.food = startFood;
    gameState.resources.materials = startMats;
    gameState.population.total = startPop;
    gameState.population.idle = startPop - gameState.population.employed;
    window.updateAllUI();
  });

  // Show dev button only in dev mode
  if (window.DEV_MODE && devBtn) {
    devBtn.style.display = '';
  }
}

export function openDevOverlay() {
  renderDevOverlay();
  document.getElementById('dev-overlay').classList.add('visible');
}

export function closeDevOverlay() {
  document.getElementById('dev-overlay').classList.remove('visible');
}

export function switchDevTab(tab) {
  devActiveTab = tab;
  document.querySelectorAll('.dev-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  renderDevTabContent();
}

export function getActiveDevTab() {
  return devActiveTab;
}

export function renderDevOverlay() {
  document.querySelectorAll('.dev-tab').forEach(t => {
    t.onclick = () => switchDevTab(t.dataset.tab);
    t.classList.toggle('active', t.dataset.tab === devActiveTab);
  });
  renderDevTabContent();
}

export function renderDevTabContent() {
  const container = document.getElementById('dev-tab-content');
  if (!container) return;
  let html = '';

  if (devActiveTab === 'map') {
    html = `<div class="dev-map-seed">
      <div class="dev-seed-current">Current seed: <strong>${currentSeed}</strong></div>
      <div class="dev-seed-row">
        <span class="dev-label" style="color:var(--text-dim);font-size:13px">New seed</span>
        <input type="number" class="seed-input" id="seed-input" value="${currentSeed}">
        <button class="seed-btn" id="seed-random">\u{1F3B2}</button>
        <button class="seed-btn" id="seed-regen">Regenerate</button>
      </div>
      <div style="font-size:11px;color:var(--text-dim);margin-top:4px">
        Change the seed and press Regenerate to create a new map. Use \u{1F3B2} for a random seed.
      </div>
    </div>
    <div class="dev-toggle-section">
      <h4 style="color:var(--text-light);margin:16px 0 8px;font-size:14px">\u{1F50D} Visibility</h4>
      <div class="dev-toggle-row">
        <button class="dev-btn ${fogOfWarDisabled ? 'active' : ''}" onclick="toggleFogOfWar()" style="width:100%;font-size:13px">
          ${fogOfWarDisabled ? '\u{1F32B}\uFE0F Enable Fog of War' : '\u{1F310} Disable Fog of War'}
        </button>
      </div>
      <div style="font-size:11px;color:var(--text-dim);margin-top:4px">
        ${fogOfWarDisabled ? 'All hexes are revealed for testing' : 'Only explored areas are visible'}
      </div>
    </div>`;
  } else if (devActiveTab === 'rivers') {
    const RIVER_COLORS = ['#3a8cc8','#c83a6e','#3ac878','#c8a03a','#8a3ac8','#3ac8c8','#c85a3a','#6e8ac8'];
    const termLabels = { coast: '\u{1F30A} Coast', lake: '\u{1F41F} Lake', merge: '\u{1F500} Merge', edge: '\u2197 Edge', none: '\u274C Dead end' };

    html = `<div>
      <div class="dev-toggle-row">
        <label for="dev-river-verts">Show river vertices</label>
        <input type="checkbox" id="dev-river-verts" ${devShowRiverVertices ? 'checked' : ''}>
      </div>
      <div class="dev-river-legend">
        <div class="dev-river-legend-item"><div class="dev-river-legend-diamond" style="background:#00ff44"></div> Source</div>
        <div class="dev-river-legend-item"><div class="dev-river-legend-dot" style="background:#ff4444"></div> Coast</div>
        <div class="dev-river-legend-item"><div class="dev-river-legend-dot" style="background:#4488ff"></div> Lake</div>
        <div class="dev-river-legend-item"><div class="dev-river-legend-tri"></div> Merge</div>
        <div class="dev-river-legend-item"><div class="dev-river-legend-dot" style="background:#ff8800"></div> Edge</div>
      </div>
      <div style="font-size:12px;color:var(--text-dim);margin-bottom:6px">
        ${gameState.rivers.length} rivers \u00B7 Check rivers to highlight them on the map
      </div>
      <div class="dev-river-list">`;

    for (const river of gameState.rivers) {
      const color = RIVER_COLORS[river.id % RIVER_COLORS.length];
      const sysLabel = river.isTributary ? 'tributary' : 'main';
      const termLabel = termLabels[river.terminusType] || river.terminusType;
      const mergeNote = river.mergedIntoRiverId >= 0 ? ` \u2192 R${river.mergedIntoRiverId}` : '';
      const checked = devHighlightRivers.has(river.id) ? 'checked' : '';
      html += `<div class="dev-river-item ${checked ? 'active' : ''}" data-river-id="${river.id}">
        <input type="checkbox" class="dev-river-check" data-river-id="${river.id}" ${checked} style="accent-color:${color};width:16px;height:16px;flex-shrink:0">
        <div class="dev-river-swatch" style="background:${color}"></div>
        <div class="dev-river-info"><strong>R${river.id}</strong> \u00B7 ${river.segments} seg \u00B7 ${termLabel}${mergeNote}</div>
        <span class="dev-river-badge">${sysLabel}</span>
      </div>`;
    }

    html += `</div></div>`;
  } else if (devActiveTab === 'economy') {
    html = `<div class="dev-grid-2col">
      <div>` +
      devGroup('\u2696\uFE0F', 'Consumption', [
        devRow('Food per pop/turn', 'dev-food-per-pop', window.FOOD_PER_POP),
      ]) + `</div><div>` +
      devGroup('\u{1F3E0}', 'Starting Conditions', [
        devRow('Starting food', 'dev-start-food', 200),
        devRow('Starting materials', 'dev-start-mats', 50),
        devRow('Starting pop', 'dev-start-pop', 25),
      ]) + `</div></div>`;
  } else if (devActiveTab === 'population') {
    html = `<div class="dev-grid-2col">
      <div>` +
      devGroup('\u{1F476}', 'Birth & Growth', [
        devRow('Base birth rate', 'dev-birth-rate', window.BASE_BIRTH_RATE || 0.10),
        devRow('Working age', 'dev-working-age', window.WORKING_AGE),
      ]) + `</div><div>` +
      devGroup('\u{1F37D}\uFE0F', 'Child Consumption', [
        devRow('Food per child/turn', 'dev-food-per-child', window.FOOD_PER_CHILD),
      ]) + `</div></div>
      <div class="dev-population-display">
        <h4>Population Editor</h4>
        <div class="dev-pop-section">
          <h5>Adults</h5>
          <div class="dev-pop-control">
            <span>Total Adults:</span>
            <button class="dev-btn" onclick="adjustAdults(-1)">\u2212</button>
            <input type="number" id="dev-adults" value="${gameState.population.total}" min="1" max="999" style="width:60px;">
            <button class="dev-btn" onclick="adjustAdults(1)">+</button>
          </div>
        </div>

        <div class="dev-pop-section">
          <h5>Child Cohorts</h5>
          <div class="dev-cohort-list" id="dev-cohort-list">
            ${generateCohortControls()}
          </div>
        </div>
      </div>`;
    setTimeout(() => {
      const birthRateEl = document.getElementById('dev-birth-rate');
      if (birthRateEl) {
        birthRateEl.value = (window.BASE_BIRTH_RATE || 0.10).toFixed(2);
      }
    }, 0);
  } else if (devActiveTab === 'governance') {
    html = `<div class="dev-grid-2col">
      <div>` +
      devGroup('\u2696\uFE0F', 'Governance Model', [
        { label: 'Current Model', content: `<span id="dev-gov-model">${window.GOVERNANCE_MODELS[gameState.governance.model].name}</span>` },
        { label: 'Transition Timer', content: `<span id="dev-gov-timer">${gameState.governance.modelChangeTimer}</span>` }
      ]) +
      devGroup('\u{1F39B}\uFE0F', 'Policy Values', [
        devRow('Freedom (0-100)', 'dev-policy-freedom', gameState.governance.policies.freedom),
        devRow('Mercy (0-100)', 'dev-policy-mercy', gameState.governance.policies.mercy),
        devRow('Tradition (0-100)', 'dev-policy-tradition', gameState.governance.policies.tradition),
      ]) + `</div><div>` +
      devGroup('\u{1F3DB}\uFE0F', 'Cohesion Effects', [
        { label: 'Identity', content: `<span id="dev-cohesion-identity">${gameState.cohesion.identity}</span>` },
        { label: 'Legitimacy', content: `<span id="dev-cohesion-legitimacy">${gameState.cohesion.legitimacy}</span>` },
        { label: 'Satisfaction', content: `<span id="dev-cohesion-satisfaction">${gameState.cohesion.satisfaction}</span>` },
        { label: 'Bonds', content: `<span id="dev-cohesion-bonds">${gameState.cohesion.bonds}</span>` },
        { label: 'Total', content: `<span id="dev-cohesion-total">${gameState.cohesion.total}</span>` }
      ]) +
      devGroup('\u{1F527}', 'Model Controls', [
        { label: 'Force Model', content: `
          <select id="dev-force-model">
            <option value="">Choose model...</option>
            ${Object.entries(window.GOVERNANCE_MODELS).map(([key, model]) =>
              `<option value="${key}">${model.name}</option>`
            ).join('')}
          </select>
          <button class="dev-btn" onclick="forceGovernanceModel()">Set</button>
        ` }
      ]) + `</div></div>`;
  } else if (devActiveTab === 'buildings') {
    html = `<div class="dev-grid-2col">`;
    for (const [key, b] of Object.entries(window.BUILDINGS)) {
      if (key === 'settlement') continue;
      html += devGroup(b.icon, b.name, [
        devRow('Mat. cost', `dev-${key}-cost`, b.cost.materials),
        devRow('Build turns', `dev-${key}-turns`, b.buildTurns),
        devRow('Food +', `dev-${key}-food`, b.foodBonus),
        devRow('Mat. +', `dev-${key}-mats`, b.materialBonus),
        devRow('Max workers', `dev-${key}-workers`, b.maxWorkers),
      ]);
    }
    html += `</div>`;
  } else if (devActiveTab === 'events') {
    html = `<div class="dev-grid-2col">
      <div>
        <h3 style="color:var(--text-gold);margin:0 0 8px">\u{1F4DC} Event Testing</h3>
        <p style="color:var(--text-dim);font-size:12px;margin:0 0 12px">Trigger events manually for testing purposes</p>

        <h4 style="color:var(--text-light);margin:8px 0 4px;font-size:14px">Available Events:</h4>
        <div style="display:flex;flex-direction:column;gap:6px">`;

    for (const [eventId, eventData] of Object.entries(window.EVENT_LIBRARY)) {
      html += `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 8px;background:rgba(0,0,0,0.2);border-radius:3px">
          <div>
            <div style="font-weight:bold;font-size:13px">${eventData.title}</div>
            <div style="color:var(--text-dim);font-size:11px">${eventData.category} \u2022 Turn ${eventData.triggers.minTurn}+</div>
          </div>
          <button class="dev-btn" onclick="devTriggerEvent('${eventId}')" style="font-size:11px;padding:3px 12px;min-width:60px">Trigger</button>
        </div>`;
    }

    html += `
        </div>
      </div>
      <div>
        <h4 style="color:var(--text-light);margin:0 0 4px;font-size:14px">Event State:</h4>
        <div style="color:var(--text-dim);font-size:12px;margin:0 0 8px">
          <div>Active Events: <span style="color:var(--text-light)">${window.EventSystem ? window.EventSystem.activeEvents.length : 0}</span></div>
          <div>Pending Events: <span style="color:var(--text-light)">${window.EventSystem ? window.EventSystem.pendingEvents.length : 0}</span></div>
          <div>Current Turn: <span style="color:var(--text-light)">${gameState.turn}</span></div>
        </div>

        <h4 style="color:var(--text-light);margin:8px 0 4px;font-size:14px">Cooldowns:</h4>
        <div style="max-height:120px;overflow-y:auto;font-size:11px">`;

    const cooldownEntries = window.EventSystem ? Object.entries(window.EventSystem.eventCooldowns) : [];
    if (cooldownEntries.length === 0) {
      html += `<div style="color:var(--text-dim)">No events on cooldown</div>`;
    } else {
      cooldownEntries.forEach(([eventId, cooldownTurn]) => {
        const event = window.EVENT_LIBRARY[eventId];
        const turnsLeft = Math.max(0, cooldownTurn - gameState.turn);
        html += `<div style="display:flex;justify-content:space-between;padding:2px 0">
          <span>${event?.title || eventId}</span>
          <span style="color:${turnsLeft > 0 ? 'var(--text-dim)' : 'var(--text-light)'}">${turnsLeft > 0 ? turnsLeft + ' turns' : 'Ready'}</span>
        </div>`;
      });
    }

    html += `
        </div>

        <div style="margin-top:12px">
          <button class="dev-btn" onclick="devClearEventCooldowns()" style="width:100%;font-size:12px">Clear All Cooldowns</button>
        </div>

        <h4 style="color:var(--text-light);margin:16px 0 4px;font-size:14px">\u{1F4A1} Tutorial Hints</h4>
        <div style="color:var(--text-dim);font-size:12px;margin:0 0 8px">
          <div>Hints Status: <span style="color:var(--text-light)">${localStorage.getItem('samhold_tutorial_disabled') === 'true' ? 'Disabled' : 'Enabled'}</span></div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <button class="dev-btn" onclick="devResetHints()" style="width:100%;font-size:12px">Reset & Enable Hints</button>
          <button class="dev-btn" onclick="devDisableHints()" style="width:100%;font-size:12px">Disable Hints</button>
          <button class="dev-btn" onclick="devTestHint()" style="width:100%;font-size:12px">Test Hint for Current Turn</button>
          <button class="dev-btn" onclick="devShowRandomHint()" style="width:100%;font-size:12px">Show Random Hint</button>
        </div>
      </div>
    </div>`;
  } else if (devActiveTab === 'units') {
    html = `<div class="dev-grid-2col">
      <div>
        <h3 style="color:var(--text-gold);margin:0 0 8px">\u2694\uFE0F Unit Testing</h3>
        <p style="color:var(--text-dim);font-size:12px;margin:0 0 12px">Create units at your settlement for testing</p>
        <h4 style="color:var(--text-light);margin:8px 0 4px;font-size:14px">Create Units:</h4>
        <div style="display:flex;flex-direction:column;gap:6px">`;

    for (const [unitKey, unitType] of Object.entries(window.UNIT_TYPES)) {
      const canAffordPop = gameState.population.idle >= unitType.cost.population;
      const canAffordMaterials = gameState.resources.materials >= unitType.cost.materials;
      const costStr = `\u{1F465}${unitType.cost.population} \u{1FAB5}${unitType.cost.materials}`;

      html += `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 8px;background:rgba(0,0,0,0.2);border-radius:3px">
          <div>
            <div style="font-weight:bold;font-size:13px">${unitType.icon} ${unitType.name}</div>
            <div style="color:var(--text-dim);font-size:11px">${costStr} \u2022 ${unitType.description}</div>
          </div>
          <button class="dev-btn" onclick="devCreateUnit('${unitKey}')"
                  style="font-size:11px;padding:3px 12px;min-width:60px;${!canAffordPop || !canAffordMaterials ? 'opacity:0.5;' : ''}">Create</button>
        </div>`;
    }

    html += `
        </div>
        <div style="margin-top:12px">
          <button class="dev-btn" onclick="devGiveResources()" style="width:100%;font-size:12px">+50 Materials +25 Population</button>
        </div>

        <h4 style="color:var(--text-light);margin:16px 0 4px;font-size:14px">Spawn Threats:</h4>
        <div style="display:flex;flex-direction:column;gap:6px">`;

    for (const [threatKey, threatType] of Object.entries(window.THREAT_TYPES)) {
      html += `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 8px;background:rgba(180,60,60,0.1);border-radius:3px">
          <div>
            <div style="font-weight:bold;font-size:13px">${threatType.icon} ${threatType.name}</div>
            <div style="color:var(--text-dim);font-size:11px">Combat: ${threatType.combat} \u2022 Movement: ${threatType.movement}</div>
          </div>
          <button class="dev-btn" onclick="devSpawnThreat('${threatKey}')" style="font-size:11px;padding:3px 12px;min-width:60px">Spawn</button>
        </div>`;
    }

    html += `
        </div>
      </div>
      <div>
        <h4 style="color:var(--text-light);margin:0 0 4px;font-size:14px">Current Units:</h4>
        <div style="color:var(--text-dim);font-size:12px;margin:0 0 8px">
          <div>Total Units: <span style="color:var(--text-light)">${gameState.units.length}</span></div>
          <div>Food Upkeep: <span style="color:var(--text-light)">${gameState.units.reduce((sum, u) => sum + window.UNIT_TYPES[u.type].upkeep.food, 0)}/turn</span></div>
          <div style="margin-top:8px;color:var(--accent-red)">Active Threats: <span style="color:var(--text-light)">${gameState.externalThreats.length}</span></div>
        </div>`;

    if (gameState.units.length > 0) {
      html += `<div style="display:flex;flex-direction:column;gap:4px;max-height:200px;overflow-y:auto">`;
      for (const unit of gameState.units) {
        const unitType = window.UNIT_TYPES[unit.type];
        const healthColor = unit.health > 75 ? '#5a8a4a' : unit.health > 50 ? '#c9a84c' : '#a94442';
        html += `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:3px 6px;background:rgba(0,0,0,0.1);border-radius:2px;font-size:11px">
            <div>${unitType.icon} ${unitType.name} @ (${unit.col},${unit.row})</div>
            <div style="display:flex;align-items:center;gap:8px">
              <span style="color:${healthColor}">${unit.health}%</span>
              <button class="dev-btn" onclick="confirmDisbandUnit(${unit.id}); renderDevTabContent();" style="font-size:10px;padding:1px 4px">\u2715</button>
            </div>
          </div>`;
      }
      html += `</div>`;
    } else {
      html += `<div style="color:var(--text-dim);font-style:italic;font-size:12px">No units created yet</div>`;
    }

    html += `
      </div>
    </div>`;
  }

  container.innerHTML = html;

  // Wire seed buttons if on map tab
  if (devActiveTab === 'map') {
    const seedRandom = document.getElementById('seed-random');
    const seedRegen = document.getElementById('seed-regen');
    if (seedRandom) seedRandom.onclick = () => {
      document.getElementById('seed-input').value = Math.floor(Math.random() * 99999);
    };
    if (seedRegen) seedRegen.onclick = () => {
      const seed = parseInt(document.getElementById('seed-input').value) || 7743;
      closeDevOverlay();
      window.initGame(seed);
    };
  }

  // Wire rivers tab
  if (devActiveTab === 'rivers') {
    const vertCheck = document.getElementById('dev-river-verts');
    if (vertCheck) vertCheck.onchange = () => {
      devShowRiverVertices = vertCheck.checked;
      if (window.setMapDirty) window.setMapDirty(true);
      if (window.render) window.render();
    };
    document.querySelectorAll('.dev-river-check').forEach(el => {
      el.onchange = () => {
        const rid = parseInt(el.dataset.riverId);
        if (el.checked) devHighlightRivers.add(rid);
        else devHighlightRivers.delete(rid);
        el.closest('.dev-river-item').classList.toggle('active', el.checked);
        if (window.setMapDirty) window.setMapDirty(true);
        if (window.render) window.render();
      };
    });
  }
}

// ---- Dev utility functions ----

export function devGroup(icon, name, rows) {
  const rowsHtml = rows.map(row => {
    if (typeof row === 'string') {
      return row;
    } else if (typeof row === 'object' && row.label && row.content) {
      return `<div class="dev-row"><span class="dev-label">${row.label}</span><div class="dev-val">${row.content}</div></div>`;
    }
    return '';
  }).join('');
  return `<div class="dev-group"><div class="dev-group-header"><span class="dev-group-icon">${icon}</span><span class="dev-group-name">${name}</span></div><div>${rowsHtml}</div></div>`;
}

export function devRow(label, id, value) {
  const step = id === 'dev-birth-rate' ? '0.01' : '1';
  const displayValue = id === 'dev-birth-rate' ? parseFloat(value).toFixed(2) : value;
  return `<div class="dev-row"><span class="dev-label">${label}</span><div class="dev-val"><button class="dev-btn" onclick="devAdjust('${id}',-1)">\u2212</button><input class="dev-input" id="${id}" type="number" value="${displayValue}" min="0" step="${step}"><button class="dev-btn" onclick="devAdjust('${id}',1)">+</button></div></div>`;
}

export function devAdjust(id, delta) {
  const el = document.getElementById(id);
  if (id === 'dev-birth-rate') {
    el.value = Math.max(0, (parseFloat(el.value || 0) + (delta * 0.01)).toFixed(2));
  } else {
    el.value = Math.max(0, parseInt(el.value || 0) + delta);
  }
}

// ---- Dev population controls ----

function generateCohortControls() {
  const allCohorts = [];
  for (let age = 15; age >= 0; age--) {
    const existing = gameState.childCohorts.find(c => c.age === age);
    const count = existing ? existing.count : 0;
    allCohorts.push({ age, count });
  }

  return allCohorts.map((cohort) => `
    <div class="dev-cohort-item">
      <span>Age ${cohort.age}:</span>
      <button class="dev-btn" onclick="adjustCohortByAge(${cohort.age}, -1)">\u2212</button>
      <input type="number" value="${cohort.count}" min="0" max="99" onchange="setCohortCountByAge(${cohort.age}, this.value)">
      <button class="dev-btn" onclick="adjustCohortByAge(${cohort.age}, 1)">+</button>
    </div>
  `).join('');
}

export function adjustAdults(delta) {
  const newTotal = Math.max(1, gameState.population.total + delta);
  gameState.population.total = newTotal;
  gameState.population.idle = Math.max(0, newTotal - gameState.population.employed);
  document.getElementById('dev-adults').value = newTotal;
  window.updateAllUI();
}

export function forceGovernanceModel() {
  const select = document.getElementById('dev-force-model');
  const newModel = select.value;
  if (newModel && newModel !== gameState.governance.model) {
    gameState.governance.model = newModel;
    gameState.governance.modelChangeTimer = 0;
    gameState.governance.lastChanged.model = gameState.turn;
    window.updateAllUI();
    renderDevTabContent();
  }
}

export function adjustCohortByAge(age, delta) {
  const existing = gameState.childCohorts.find(c => c.age === age);
  if (existing) {
    existing.count = Math.max(0, existing.count + delta);
    if (existing.count === 0) {
      const index = gameState.childCohorts.indexOf(existing);
      gameState.childCohorts.splice(index, 1);
    }
  } else if (delta > 0) {
    gameState.childCohorts.push({ age, count: delta });
  }
  refreshPopulationControls();
  window.updateAllUI();
}

export function setCohortCountByAge(age, value) {
  const count = Math.max(0, parseInt(value) || 0);
  const existing = gameState.childCohorts.find(c => c.age === age);

  if (existing) {
    existing.count = count;
    if (count === 0) {
      const index = gameState.childCohorts.indexOf(existing);
      gameState.childCohorts.splice(index, 1);
    }
  } else if (count > 0) {
    gameState.childCohorts.push({ age, count });
  }
  refreshPopulationControls();
  window.updateAllUI();
}

function refreshPopulationControls() {
  const cohortList = document.getElementById('dev-cohort-list');
  if (cohortList) {
    cohortList.innerHTML = generateCohortControls();
  }
}

// ---- Dev apply/restart ----

export function applyDevValues() {
  const foodEl = document.getElementById('dev-food-per-pop');
  if (foodEl) window.FOOD_PER_POP = parseInt(foodEl.value) || 2;

  const birthRateEl = document.getElementById('dev-birth-rate');
  if (birthRateEl) window.BASE_BIRTH_RATE = parseFloat(birthRateEl.value) || 0.10;
  const workingAgeEl = document.getElementById('dev-working-age');
  if (workingAgeEl) {
    const newAge = parseInt(workingAgeEl.value) || 10;
    window.WORKING_AGE = Math.max(6, Math.min(16, newAge));
    workingAgeEl.value = window.WORKING_AGE;
  }

  const adultsEl = document.getElementById('dev-adults');
  if (adultsEl) {
    const newTotal = Math.max(1, parseInt(adultsEl.value) || 1);
    gameState.population.total = newTotal;
    gameState.population.idle = Math.max(0, newTotal - gameState.population.employed);
  }

  const freedomEl = document.getElementById('dev-policy-freedom');
  if (freedomEl) gameState.governance.policies.freedom = Math.max(0, Math.min(100, parseInt(freedomEl.value) || 50));
  const mercyEl = document.getElementById('dev-policy-mercy');
  if (mercyEl) gameState.governance.policies.mercy = Math.max(0, Math.min(100, parseInt(mercyEl.value) || 50));
  const traditionEl = document.getElementById('dev-policy-tradition');
  if (traditionEl) gameState.governance.policies.tradition = Math.max(0, Math.min(100, parseInt(traditionEl.value) || 50));

  for (const [key, b] of Object.entries(window.BUILDINGS)) {
    if (key === 'settlement') continue;
    const v = (id) => { const el = document.getElementById(id); return el ? (parseInt(el.value) || 0) : null; };
    const cost = v(`dev-${key}-cost`); if (cost !== null) b.cost.materials = cost;
    const turns = v(`dev-${key}-turns`); if (turns !== null) b.buildTurns = turns;
    const food = v(`dev-${key}-food`); if (food !== null) b.foodBonus = food;
    const mats = v(`dev-${key}-mats`); if (mats !== null) b.materialBonus = mats;
    const workers = v(`dev-${key}-workers`); if (workers !== null) b.maxWorkers = workers;
  }
  window.updateAllUI();
  if (window.setMapDirty) window.setMapDirty(true);
  if (window.render) window.render();
}

export function applyDevValuesAndRestart() {
  applyDevValues();
  const seedEl = document.getElementById('seed-input');
  const seed = seedEl ? (parseInt(seedEl.value) || currentSeed) : currentSeed;
  closeDevOverlay();
  window.initGame(seed);
}

// ---- Dev event functions ----

export function devTriggerEvent(eventId) {
  const eventData = window.EVENT_LIBRARY[eventId];
  if (!eventData) {
    console.error('Unknown event:', eventId);
    return;
  }

  if (window.EventSystem && window.EventSystem.activeEvents.some(e => e.id === eventId)) {
    console.warn('Event already active:', eventId);
    return;
  }

  if (window.EventSystem) {
    window.EventSystem.activeEvents.push({
      id: eventId,
      triggeredTurn: gameState.turn
    });
    window.EventSystem.processActiveEvents();
  }

  console.log('Triggered event:', eventData.title);
  renderDevTabContent();
}

export function devClearEventCooldowns() {
  if (window.EventSystem) {
    window.EventSystem.eventCooldowns = {};
  }
  console.log('Cleared all event cooldowns');
  renderDevTabContent();
}

export function devCreateUnit(unitType) {
  if (!gameState.settlements[0]) {
    console.error('No settlement found for unit creation');
    return;
  }

  const settlement = gameState.settlements[0];
  const unit = window.createUnit(unitType, settlement.col, settlement.row);

  if (unit) {
    console.log(`Created ${unitType} unit at (${settlement.col}, ${settlement.row})`);
    renderDevTabContent();
    window.updateAllUI();
    if (window.render) window.render();
  } else {
    console.warn(`Failed to create ${unitType} - insufficient resources`);
  }
}

export function devGiveResources() {
  gameState.resources.materials += 50;
  gameState.population.idle += 25;
  gameState.population.total += 25;

  console.log('Gave +50 materials and +25 population');
  renderDevTabContent();
  window.updateAllUI();
  if (window.render) window.render();
}

export function devSpawnThreat(threatType) {
  const edgePos = window.findRandomMapEdge();
  const threat = window.spawnThreat(threatType, edgePos.col, edgePos.row);

  if (threat) {
    console.log(`Spawned ${threatType} threat at (${edgePos.col}, ${edgePos.row})`);
    renderDevTabContent();
    window.updateAllUI();
    if (window.render) window.render();
  } else {
    console.warn(`Failed to spawn ${threatType} threat`);
  }
}

export function devAddPopulation() {
  if (gameState?.population) {
    gameState.population.total += 10;
    gameState.population.idle += 10;
    window.updateAllUI();
    console.log('Added +10 population');
  }
}

export function devMaxCohesion() {
  if (gameState?.cohesion) {
    gameState.cohesion.identity = 100;
    gameState.cohesion.legitimacy = 100;
    gameState.cohesion.satisfaction = 100;
    gameState.cohesion.bonds = 100;
    if (window.calculateCohesion) window.calculateCohesion();
    window.updateAllUI();
    console.log('Set cohesion to maximum');
  }
}

export function devMinCohesion() {
  if (gameState?.cohesion) {
    gameState.cohesion.identity = 1;
    gameState.cohesion.legitimacy = 1;
    gameState.cohesion.satisfaction = 1;
    gameState.cohesion.bonds = 1;
    if (window.calculateCohesion) window.calculateCohesion();
    window.updateAllUI();
    console.log('Set cohesion to minimum');
  }
}

// ---- Fog of war toggle ----

export function toggleFogOfWar() {
  fogOfWarDisabled = !fogOfWarDisabled;

  if (fogOfWarDisabled) {
    for (let r = 0; r < window.MAP_ROWS; r++) {
      for (let c = 0; c < window.MAP_COLS; c++) {
        gameState.map[r][c].revealed = true;
      }
    }
  } else {
    for (let r = 0; r < window.MAP_ROWS; r++) {
      for (let c = 0; c < window.MAP_COLS; c++) {
        gameState.map[r][c].revealed = false;
      }
    }

    for (const settlement of gameState.settlements) {
      window.revealArea(settlement.col, settlement.row, 3);
    }

    for (let r = 0; r < window.MAP_ROWS; r++) {
      for (let c = 0; c < window.MAP_COLS; c++) {
        if (window.isInTerritory(c, r)) {
          gameState.map[r][c].revealed = true;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < window.MAP_ROWS && nc >= 0 && nc < window.MAP_COLS) {
                const distance = window.cubeDistance(window.offsetToCube(c, r), window.offsetToCube(nc, nr));
                if (distance <= 1) {
                  gameState.map[nr][nc].revealed = true;
                }
              }
            }
          }
        }
      }
    }

    for (const unit of gameState.units) {
      if (unit.type === 'scout') {
        window.revealArea(unit.col, unit.row, 2);
      }
    }
  }

  updateDevBadge();
  if (window.setMapDirty) window.setMapDirty(true);
  renderDevTabContent();
  if (window.render) window.render();
}

// ---- Dev badge ----

export function updateDevBadge() {
  const badge = document.getElementById('dev-badge');
  if (fogOfWarDisabled) {
    badge.textContent = 'DEV \u2014 Full map revealed';
    badge.style.display = '';
  } else {
    badge.textContent = 'DEV \u2014 Fog of war enabled';
    badge.style.display = '';
  }
}

// ---- Tutorial hint dev controls ----

export function devResetHints() {
  localStorage.removeItem('samhold_tutorial_disabled');
  renderDevTabContent();
  console.log('Tutorial hints reset and enabled');
}

export function devDisableHints() {
  localStorage.setItem('samhold_tutorial_disabled', 'true');
  renderDevTabContent();
  console.log('Tutorial hints disabled');
}

export function devTestHint() {
  window.showTutorialHint();
  console.log(`Testing tutorial hint for turn ${gameState.turn}`);
}

export function devShowRandomHint() {
  const allHints = [
    { title: "Welcome to Samhold!", content: "Your small tribe has settled in this fertile land. Click on the hexes around your settlement to explore them. Look for good spots to assign workers for food and materials.", highlight: "exploration" },
    { title: "Managing Resources", content: "Your people need 2 food per person each turn. Check your resource bars at the top - if food goes negative, people will starve. Assign workers to grassland hexes to gather food.", highlight: "resources" },
    { title: "Building Your First Farm", content: "For stable food production, build a Farm on grassland. Open the side panel (click any hex), go to the Build tab, select Farm, then click a grassland hex in your territory to place it.", highlight: "building" },
    { title: "Cohesion Matters", content: "The colored bars at the top show your society's Cohesion - how united your people are. Identity, Legitimacy, Satisfaction, and Bonds all matter. If total cohesion falls too low, your society may collapse!", highlight: "cohesion" },
    { title: "Growing Your Population", content: "Your population grows through births each season, but children take years to become workers. Keep your people fed and happy to encourage steady population growth.", highlight: "population" },
    { title: "Seasons and Planning", content: "Pay attention to the seasons! Winter requires extra food to survive the cold. Plan ahead by storing food in autumn, or your people may starve during the harsh winter months.", highlight: "seasons" },
    { title: "Governance and Policies", content: "As your society grows, you may want to change your governance model. Check the Society tab in the side panel to explore different forms of leadership and policies.", highlight: "governance" },
    { title: "Working Age Policy", content: "You have children growing up! Consider adjusting your Working Age policy in the Society panel. Lower ages provide workers faster but may reduce satisfaction and knowledge growth.", highlight: "working-age" }
  ];

  const randomHint = allHints[Math.floor(Math.random() * allHints.length)];
  window.showTutorialModal(randomHint);
  console.log(`Showing random tutorial hint: ${randomHint.title}`);
}

// ---- River visualization helpers ----

function getRiverColor(index) {
  const colors = ['#3a8cc8','#c83a6e','#3ac878','#c8a03a','#8a3ac8','#3ac8c8','#c85a3a','#6e8ac8'];
  return colors[index % colors.length];
}

export function devToggleRiverVertices(show) {
  devShowRiverVertices = show;
  if (window.setDevRenderingFlags) {
    window.setDevRenderingFlags({ showRiverVertices: show });
  }
}

export function devToggleRiver(riverId, show) {
  if (show) devHighlightRivers.add(riverId);
  else devHighlightRivers.delete(riverId);
  if (window.setDevRenderingFlags) {
    const flag = {};
    flag[`highlightRiver${riverId}`] = show;
    window.setDevRenderingFlags(flag);
  }
}

export function setCurrentSeed(seed) {
  currentSeed = seed;
}

export function getCurrentSeed() {
  return currentSeed;
}

export function isFogOfWarDisabled() {
  return fogOfWarDisabled;
}

export function getDevShowRiverVertices() {
  return devShowRiverVertices;
}

export function getDevHighlightRivers() {
  return devHighlightRivers;
}

export function devRandomizeSeed() {
  const newSeed = Math.floor(Math.random() * 999999) + 1;
  const seedInput = document.getElementById('seed-input');
  if (seedInput) {
    seedInput.value = newSeed;
  }
}

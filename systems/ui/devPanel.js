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
    const startFoodEl = document.getElementById('dev-start-food');
    const startMatsEl = document.getElementById('dev-start-mats');
    const startPopEl = document.getElementById('dev-start-pop');
    closeDevOverlay();
    gameState = window.gameState = window.initGameCore(seed);
    // Only apply Starting Conditions overrides if economy tab was active (elements exist)
    if (startFoodEl) gameState.resources.food = parseInt(startFoodEl.value) || 200;
    if (startMatsEl) gameState.resources.materials = parseInt(startMatsEl.value) || 50;
    if (startPopEl) {
      const startPop = parseInt(startPopEl.value) || 18;
      gameState.population.total = startPop;
      gameState.population.idle = startPop - gameState.population.employed;
    }
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
    const res = gameState.resources;
    html = `
    <div style="display:flex;flex-direction:column;gap:10px">

      <div class="dev-group">
        <div class="dev-group-title">🌾 Food &amp; 🪵 Materials — Live</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px">
          <div>
            <div style="font-size:11px;color:var(--text-dim);margin-bottom:3px">Food (current: ${Math.floor(res.food)})</div>
            <div style="display:flex;gap:4px">
              <input id="dev-set-food" type="number" value="${Math.floor(res.food)}" style="width:70px;font-size:12px" />
              <button class="dev-btn" onclick="devSetResource('food',document.getElementById('dev-set-food').value)">Set</button>
            </div>
            <div style="display:flex;gap:3px;margin-top:4px;flex-wrap:wrap">
              <button class="dev-btn" onclick="devAddResource('food',50)">+50</button>
              <button class="dev-btn" onclick="devAddResource('food',200)">+200</button>
              <button class="dev-btn" onclick="devAddResource('food',-50)" style="color:var(--accent-red)">−50</button>
              <button class="dev-btn" onclick="devSetResource('food',0)" style="color:var(--accent-red)">Zero</button>
            </div>
          </div>
          <div>
            <div style="font-size:11px;color:var(--text-dim);margin-bottom:3px">Materials (current: ${Math.floor(res.materials)})</div>
            <div style="display:flex;gap:4px">
              <input id="dev-set-mats" type="number" value="${Math.floor(res.materials)}" style="width:70px;font-size:12px" />
              <button class="dev-btn" onclick="devSetResource('materials',document.getElementById('dev-set-mats').value)">Set</button>
            </div>
            <div style="display:flex;gap:3px;margin-top:4px;flex-wrap:wrap">
              <button class="dev-btn" onclick="devAddResource('materials',20)">+20</button>
              <button class="dev-btn" onclick="devAddResource('materials',100)">+100</button>
              <button class="dev-btn" onclick="devAddResource('materials',-20)" style="color:var(--accent-red)">−20</button>
              <button class="dev-btn" onclick="devSetResource('materials',0)" style="color:var(--accent-red)">Zero</button>
            </div>
          </div>
        </div>
        <div style="margin-top:6px">
          <button class="dev-btn" style="width:100%" onclick="devAddResource('food',500);devAddResource('materials',200)">💰 Flood both (+500 food, +200 mats)</button>
        </div>
      </div>

      <div class="dev-group">
        <div class="dev-group-title">⚖️ Consumption Rates (Apply Live)</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px">
          ${devRow('Food per pop/turn', 'dev-food-per-pop', window.FOOD_PER_POP)}
          ${devRow('Food per child/turn', 'dev-food-per-child', window.FOOD_PER_CHILD)}
        </div>
      </div>

      <div class="dev-group">
        <div class="dev-group-title">🏠 Starting Conditions (Apply &amp; Restart)</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:6px">
          ${devRow('Starting food', 'dev-start-food', 200)}
          ${devRow('Starting mats', 'dev-start-mats', 50)}
          ${devRow('Starting pop', 'dev-start-pop', 18)}
        </div>
      </div>

    </div>`;
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
  } else if (devActiveTab === 'trust') {
    const t = window.getTrustState ? window.getTrustState() : null;
    if (t) {
      const fmtPct = v => (v * 100).toFixed(1) + '%';
      const fmtDev = v => (v >= 0 ? '+' : '') + v.toFixed(3);
      const barColor = v => v >= 0.7 ? '#5a8a4a' : v >= 0.4 ? '#c9a84c' : '#a94442';
      const barW = v => Math.round(v * 100) + '%';

      html = `<div class="dev-grid-2col">
        <div>
          <h3 style="color:var(--text-gold);margin:0 0 8px">🏛️ Institutional Trust</h3>
          <div style="background:rgba(0,0,0,0.3);border-radius:4px;padding:8px;margin-bottom:8px">
            <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
              <span>Current</span><span style="color:var(--text-light);font-weight:bold">${fmtPct(t.institutional)}</span>
            </div>
            <div style="background:rgba(0,0,0,0.4);border-radius:3px;height:12px;overflow:hidden">
              <div style="background:${barColor(t.institutional)};height:100%;width:${barW(t.institutional)};transition:width 0.3s"></div>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-dim);margin-top:6px">
              <span>Baseline: ${fmtPct(t.institutionalBaseline)}</span>
              <span>Deviation: ${fmtDev(t.deviations.institutional)}</span>
            </div>
          </div>
          <div style="font-size:11px;color:var(--text-dim)">
            <div>= legitimacy × 0.55 + satisfaction × 0.45</div>
            <div style="margin-top:4px">Drives: resistance, policy compliance</div>
          </div>
        </div>
        <div>
          <h3 style="color:var(--text-gold);margin:0 0 8px">🫂 Interpersonal Trust</h3>
          <div style="background:rgba(0,0,0,0.3);border-radius:4px;padding:8px;margin-bottom:8px">
            <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
              <span>Current</span><span style="color:var(--text-light);font-weight:bold">${fmtPct(t.interpersonal)}</span>
            </div>
            <div style="background:rgba(0,0,0,0.4);border-radius:3px;height:12px;overflow:hidden">
              <div style="background:${barColor(t.interpersonal)};height:100%;width:${barW(t.interpersonal)};transition:width 0.3s"></div>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-dim);margin-top:6px">
              <span>Baseline: ${fmtPct(t.interpersonalBaseline)}</span>
              <span>Deviation: ${fmtDev(t.deviations.interpersonal)}</span>
            </div>
          </div>
          <div style="font-size:11px;color:var(--text-dim)">
            <div>= identity × 0.4 + bonds × 0.6</div>
            <div style="margin-top:4px">Drives: crime rates, identity/bonds growth</div>
            <div style="margin-top:4px">Rate limiter: <span style="color:var(--text-light)">${(t.rateLimiter * 100).toFixed(0)}%</span>
              ${t.rateLimiter < 1 ? ' <span style="color:#c9a84c">(limiting growth)</span>' : ' <span style="color:#5a8a4a">(no limit)</span>'}
            </div>
          </div>
        </div>
      </div>
      <div style="margin-top:12px">
        <h4 style="color:var(--text-light);margin:0 0 8px;font-size:14px">🔧 Dev Controls</h4>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="dev-btn" onclick="window.applyTrustDeviation('institutional', -0.10); renderDevTabContent();" style="font-size:11px">Inst −0.10</button>
          <button class="dev-btn" onclick="window.applyTrustDeviation('institutional', 0.05); renderDevTabContent();" style="font-size:11px">Inst +0.05</button>
          <button class="dev-btn" onclick="window.applyTrustDeviation('interpersonal', -0.10); renderDevTabContent();" style="font-size:11px">Inter −0.10</button>
          <button class="dev-btn" onclick="window.applyTrustDeviation('interpersonal', 0.05); renderDevTabContent();" style="font-size:11px">Inter +0.05</button>
        </div>
        <div style="margin-top:8px;font-size:11px;color:var(--text-dim)">
          Drift rate: 0.005/turn (40 turns to recover −0.20 shock)
        </div>
      </div>`;
    } else {
      html = `<div style="color:var(--text-dim);font-style:italic">Trust system not initialized</div>`;
    }
  } else if (devActiveTab === 'policylag') {
    const pl = gameState.policyLag;
    if (pl) {
      const policies = ['freedom', 'mercy', 'tradition', 'isolation', 'workingAge'];
      const hallRed = window.getAdminHallReduction ? window.getAdminHallReduction() : 0;
      const model = gameState.governance.model;
      const govMult = window.GOVERNANCE_MODELS?.[model]?.lagMultiplier ?? 1.0;

      html = `<div>
        <h3 style="color:var(--text-gold);margin:0 0 8px">📋 Policy Lag State</h3>
        <div style="font-size:11px;color:var(--text-dim);margin-bottom:8px">
          Gov model: <span style="color:var(--text-light)">${model} (×${govMult})</span>
          &nbsp;|&nbsp; Admin Hall reduction: <span style="color:var(--text-light)">${(hallRed * 100).toFixed(0)}%</span>
          &nbsp;|&nbsp; Legitimacy: <span style="color:var(--text-light)">${Math.round(gameState.cohesion.legitimacy)}</span>
        </div>`;

      for (const p of policies) {
        const lag = pl[p];
        const pending = pl.pending?.[p];
        const effective = p === 'workingAge' ? window.WORKING_AGE : gameState.governance.policies[p];

        html += `<div style="padding:4px 8px;background:rgba(0,0,0,0.15);border-radius:3px;margin-bottom:4px;font-size:12px">
          <div style="display:flex;justify-content:space-between">
            <span style="font-weight:bold;color:var(--text-light)">${p}</span>
            <span>effective: <span style="color:var(--text-gold)">${effective}</span></span>
          </div>`;

        if (pending !== null && pending !== undefined) {
          html += `<div style="color:#c9a84c;font-size:11px">📝 Pending: → ${pending}</div>`;
        }
        if (lag) {
          const progress = Math.round((1 - lag.turnsRemaining / lag.lagTurns) * 100);
          html += `<div style="color:#6ca0dc;font-size:11px">⏳ ${lag.startValue} → ${lag.target} | ${lag.turnsRemaining}/${lag.lagTurns}t | ${lag.category} | ${progress}%</div>`;
        }
        if (!lag && (pending === null || pending === undefined)) {
          html += `<div style="color:var(--text-dim);font-size:11px">— no activity —</div>`;
        }

        html += `</div>`;
      }

      html += `</div>`;
    } else {
      html = `<div style="color:var(--text-dim);font-style:italic">Policy lag system not initialized</div>`;
    }
  } else if (devActiveTab === 'resistance') {
    const r = gameState.resistance;
    if (r) {
      const faction = r.faction;
      html = `<div>
        <h3 style="color:var(--text-gold);margin:0 0 8px">✊ Resistance State</h3>
        <div style="font-size:12px;margin-bottom:8px">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span>Pressure:</span>
            <span style="color:var(--text-gold);font-weight:bold">${r.pressure.toFixed(1)}</span>
          </div>
          <div style="height:8px;background:rgba(0,0,0,0.3);border-radius:4px;overflow:hidden;margin-bottom:6px">
            <div style="height:100%;width:${Math.min(100,r.pressure)}%;background:${r.pressure >= 60 ? '#cc6633' : r.pressure >= 25 ? '#ccaa33' : '#666'};transition:width 0.3s"></div>
          </div>
          <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px">
            <button class="dev-btn" onclick="gameState.resistance.pressure=0; renderDevTabContent();" style="font-size:11px">Set 0</button>
            <button class="dev-btn" onclick="gameState.resistance.pressure=25; renderDevTabContent();" style="font-size:11px">Set 25</button>
            <button class="dev-btn" onclick="gameState.resistance.pressure=40; renderDevTabContent();" style="font-size:11px">Set 40</button>
            <button class="dev-btn" onclick="gameState.resistance.pressure=60; renderDevTabContent();" style="font-size:11px">Set 60</button>
            <button class="dev-btn" onclick="gameState.resistance.pressure=80; renderDevTabContent();" style="font-size:11px">Set 80</button>
            <button class="dev-btn" onclick="gameState.resistance.pressure=95; renderDevTabContent();" style="font-size:11px">Set 95</button>
          </div>
        </div>

        <div style="font-size:12px;padding:6px 8px;background:rgba(0,0,0,0.15);border-radius:4px;margin-bottom:8px">
          <div>Suppression count: <strong>${r.suppressionCount}</strong></div>
          <div>Recurrence multiplier: <strong>${r.recurrenceMultiplier.toFixed(2)}×</strong></div>
        </div>

        <h4 style="color:var(--text-light);margin:8px 0 4px">Faction</h4>
        <div style="font-size:12px;padding:6px 8px;background:rgba(0,0,0,0.15);border-radius:4px;margin-bottom:8px">
          <div>Active: <strong>${faction.active ? 'Yes' : 'No'}</strong></div>
          ${faction.active ? `<div>Name: <strong>${faction.name}</strong></div>
          <div>Leader: <strong>${faction.leader}</strong></div>
          <div>Disposition: <strong>${faction.disposition}</strong></div>
          <div>Formal influence: <strong>${faction.formalInfluence ? 'Yes' : 'No'}</strong></div>
          <div>Promises: <strong>${faction.promiseRegistry.length}</strong></div>` : ''}
        </div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px">
          ${!faction.active ? `<button class="dev-btn" onclick="gameState.resistance.pressure=42; if(window.processResistance)window.processResistance({events:[]}); renderDevTabContent();" style="font-size:11px">Activate Faction</button>` : ''}
          ${faction.active ? `<button class="dev-btn" onclick="window.shiftDisposition(-1); renderDevTabContent();" style="font-size:11px">Disposition −</button>
          <button class="dev-btn" onclick="window.shiftDisposition(1); renderDevTabContent();" style="font-size:11px">Disposition +</button>
          <button class="dev-btn" onclick="window.addPromise('Dev test promise', gameState.turn+8, true); renderDevTabContent();" style="font-size:11px">Add Promise</button>` : ''}
        </div>

        <div style="font-size:11px;color:var(--text-dim);margin-top:4px">
          TC consensus policies: ${Object.keys(r.tcConsensusPolicies).filter(k => r.tcConsensusPolicies[k]).join(', ') || 'none'}
        </div>
      </div>`;
    } else {
      html = `<div style="color:var(--text-dim);font-style:italic">Resistance system not initialized</div>`;
    }
  } else if (devActiveTab === 'crime') {
    const c = gameState.crime;
    if (c) {
      const detection = window.getJusticeHallDetection ? window.getJusticeHallDetection() : 0;
      html = `<div>
        <h3 style="color:var(--text-gold);margin:0 0 8px">⚖️ Crime State</h3>
        <div style="font-size:12px;margin-bottom:8px">
          <div style="display:flex;justify-content:space-between;margin-bottom:2px"><span>Theft:</span><span style="color:#ccaa33;font-weight:bold">${c.theft.toFixed(2)}</span></div>
          <div style="display:flex;justify-content:space-between;margin-bottom:2px"><span>Violence:</span><span style="color:#cc6633;font-weight:bold">${c.violence.toFixed(2)}</span></div>
          <div style="display:flex;justify-content:space-between;margin-bottom:2px"><span>Transgression:</span><span style="color:#9966cc;font-weight:bold">${c.transgression.toFixed(2)}</span></div>
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;border-top:1px solid rgba(255,255,255,0.1);padding-top:4px"><span>Overall Severity:</span><span style="font-weight:bold">${c.overallSeverity.toFixed(2)}</span></div>
        </div>

        <div style="font-size:12px;padding:6px 8px;background:rgba(0,0,0,0.15);border-radius:4px;margin-bottom:8px">
          <div>Organized predation: <strong>${c.organizedPredation ? 'YES' : 'No'}</strong> (${c.organizedPredationTurns} turns above threshold)</div>
          <div>Crackdown cooldown: <strong>${c.crackdownCooldown}</strong></div>
          <div>Justice Hall detection: <strong>${detection}</strong>/3</div>
        </div>

        <h4 style="color:var(--text-light);margin:8px 0 4px;font-size:14px">🔧 Dev Controls</h4>
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px">
          <button class="dev-btn" onclick="gameState.crime.theft=0;gameState.crime.violence=0;gameState.crime.transgression=0;gameState.crime.overallSeverity=0;gameState.crime.organizedPredation=false;gameState.crime.organizedPredationTurns=0; renderDevTabContent();" style="font-size:11px">Reset All</button>
          <button class="dev-btn" onclick="gameState.crime.theft=8;gameState.crime.violence=4;gameState.crime.transgression=3;gameState.crime.overallSeverity=15; renderDevTabContent();" style="font-size:11px">Set High</button>
          <button class="dev-btn" onclick="gameState.crime.theft=12;gameState.crime.violence=8;gameState.crime.transgression=6;gameState.crime.overallSeverity=26;gameState.crime.organizedPredation=true;gameState.crime.organizedPredationTurns=5; renderDevTabContent();" style="font-size:11px">Set Organized</button>
        </div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px">
          <button class="dev-btn" onclick="gameState.crime.theft+=3; gameState.crime.overallSeverity=gameState.crime.theft+gameState.crime.violence+gameState.crime.transgression; renderDevTabContent();" style="font-size:11px">Theft +3</button>
          <button class="dev-btn" onclick="gameState.crime.violence+=3; gameState.crime.overallSeverity=gameState.crime.theft+gameState.crime.violence+gameState.crime.transgression; renderDevTabContent();" style="font-size:11px">Violence +3</button>
          <button class="dev-btn" onclick="gameState.crime.transgression+=3; gameState.crime.overallSeverity=gameState.crime.theft+gameState.crime.violence+gameState.crime.transgression; renderDevTabContent();" style="font-size:11px">Transgression +3</button>
          <button class="dev-btn" onclick="if(window.performCrackdown)window.performCrackdown(); renderDevTabContent();" style="font-size:11px">Crackdown</button>
        </div>

        <div style="font-size:11px;color:var(--text-dim);margin-top:4px">
          Crime is driven by low interpersonal trust and material scarcity. Justice Hall suppresses crime when staffed.
        </div>
      </div>`;
    } else {
      html = `<div style="color:var(--text-dim);font-style:italic">Crime system not initialized</div>`;
    }
  } else if (devActiveTab === 'immigration') {
    const imm = gameState.immigration;
    if (imm) {
      const ps = imm.parallelSociety;
      const totalPipeline = imm.cohorts[0] + imm.cohorts[1] + imm.cohorts[2];
      const psChildren = ps.childCohorts.reduce((s, c) => s + c.count, 0);
      html = `<div>
        <h3 style="color:var(--text-gold);margin:0 0 8px">🚶 Immigration State</h3>
        <div style="font-size:12px;margin-bottom:8px">
          <div style="display:flex;justify-content:space-between;margin-bottom:2px"><span>Pressure:</span><span style="font-weight:bold">${imm.pressure}</span></div>
          <div style="display:flex;justify-content:space-between;margin-bottom:2px"><span>Last arrivals:</span><span style="font-weight:bold">${imm.lastArrivals}</span></div>
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;border-top:1px solid rgba(255,255,255,0.1);padding-top:4px">
            <span>Pipeline total:</span><span style="font-weight:bold">${totalPipeline}</span>
          </div>
        </div>

        <div style="font-size:12px;padding:6px 8px;background:rgba(0,0,0,0.15);border-radius:4px;margin-bottom:8px">
          <div>Arrivals (C0): <strong>${imm.cohorts[0]}</strong></div>
          <div>Residents (C1): <strong>${imm.cohorts[1]}</strong></div>
          <div>Participants (C2): <strong>${imm.cohorts[2]}</strong></div>
          <div>Integrating (C3): <strong>${imm.cohorts[3]}</strong></div>
        </div>

        <div style="font-size:12px;padding:6px 8px;background:rgba(0,0,0,0.15);border-radius:4px;margin-bottom:8px">
          <div>PS Strength: <strong>${(ps.strength * 100).toFixed(1)}%</strong></div>
          <div>PS Population: <strong>${ps.population}</strong> adults, <strong>${psChildren}</strong> children</div>
          <div>Intervention: <strong>${imm.interventionActive || 'none'}</strong> (${imm.interventionTurns}t)</div>
          <div>Lifetime: <strong>${imm.lifetimeArrivals}</strong> arrived, <strong>${imm.lifetimeIntegrated}</strong> integrated</div>
        </div>

        <h4 style="color:var(--text-light);margin:8px 0 4px;font-size:14px">🔧 Dev Controls</h4>
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px">
          <button class="dev-btn" onclick="gameState.immigration.cohorts[0]+=5; renderDevTabContent();" style="font-size:11px">+5 Arrivals</button>
          <button class="dev-btn" onclick="gameState.immigration.cohorts[0]+=20; renderDevTabContent();" style="font-size:11px">+20 Arrivals</button>
          <button class="dev-btn" onclick="gameState.immigration.cohorts=[0,0,0,0]; renderDevTabContent();" style="font-size:11px">Clear Pipeline</button>
        </div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px">
          <button class="dev-btn" onclick="gameState.immigration.parallelSociety.strength=0.20; gameState.immigration.parallelSociety.population=5; renderDevTabContent();" style="font-size:11px">PS 20%</button>
          <button class="dev-btn" onclick="gameState.immigration.parallelSociety.strength=0.50; gameState.immigration.parallelSociety.population=15; renderDevTabContent();" style="font-size:11px">PS 50%</button>
          <button class="dev-btn" onclick="gameState.immigration.parallelSociety.strength=0.80; gameState.immigration.parallelSociety.population=30; renderDevTabContent();" style="font-size:11px">PS 80%</button>
          <button class="dev-btn" onclick="gameState.immigration.parallelSociety.strength=0; gameState.immigration.parallelSociety.population=0; gameState.immigration.parallelSociety.childCohorts=[]; renderDevTabContent();" style="font-size:11px">Reset PS</button>
        </div>

        <div style="font-size:11px;color:var(--text-dim);margin-top:4px">
          Immigration starts at turn 12. Pipeline gated by trust thresholds. PS crystallizes at 18% unintegrated ratio.
        </div>
      </div>`;
    } else {
      html = `<div style="color:var(--text-dim);font-style:italic">Immigration system not initialized</div>`;
    }
  } else if (devActiveTab === 'class') {
    const cs = gameState.classSystem;
    if (cs) {
      const BASES = window.STRATIFICATION_BASES;
      const basisName = cs.basis ? BASES[cs.basis]?.name : 'None';
      const d = cs.differentials;
      html = `<div>
        <h3 style="color:var(--text-gold);margin:0 0 8px">⚖️ Class System State</h3>
        <div style="font-size:12px;margin-bottom:8px">
          <div>Active: <strong style="color:${cs.active ? '#6cb66c' : '#cc6644'}">${cs.active}</strong></div>
          <div>Basis: <strong>${basisName}</strong></div>
          <div>Privileged: <strong>${cs.privilegedCount}</strong> (${Math.round(cs.privilegedRatio * 100)}%)</div>
          <div>Differentials: Econ=${d.economic} Legal=${d.legal} Polit=${d.political} Social=${d.social}</div>
          <div>Crime multiplier: <strong>${window.getClassMultiplier ? window.getClassMultiplier().toFixed(2) : '1.00'}</strong></div>
          <div>Trust reduction: <strong>${window.getInterpersonalTrustReduction ? window.getInterpersonalTrustReduction().toFixed(3) : '0'}</strong></div>
          ${cs.dismantlementEffects ? `<div style="color:#cc6644">Dismantlement aftermath: ${cs.dismantlementEffects.turnsRemaining}t sat / ${cs.dismantlementEffects.trustDriftTurnsRemaining}t trust</div>` : ''}
          ${cs.basisChangeEffects ? `<div style="color:#ccaa33">Basis change disruption: ${cs.basisChangeEffects.turnsRemaining}t</div>` : ''}
          ${Object.keys(cs.pendingDifferentials).length > 0 ? `<div style="color:#ccaa33">Pending: ${Object.entries(cs.pendingDifferentials).map(([k,v]) => `${k}→${v.target} (${v.turnsRemaining}t)`).join(', ')}</div>` : ''}
        </div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px">
          <button class="dev-btn" onclick="if(!gameState.classSystem.active){window.activateClassSystem('property');} renderDevTabContent();" style="font-size:11px">Activate (Property)</button>
          <button class="dev-btn" onclick="if(!gameState.classSystem.active){window.activateClassSystem('lineage');} renderDevTabContent();" style="font-size:11px">Activate (Lineage)</button>
          <button class="dev-btn" onclick="if(!gameState.classSystem.active){window.activateClassSystem('religious');} renderDevTabContent();" style="font-size:11px">Activate (Religious)</button>
          <button class="dev-btn" onclick="if(!gameState.classSystem.active){window.activateClassSystem('military');} renderDevTabContent();" style="font-size:11px">Activate (Military)</button>
        </div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px">
          <button class="dev-btn" onclick="if(gameState.classSystem.active){gameState.classSystem.differentials={economic:2,legal:2,political:2,social:2};} renderDevTabContent();" style="font-size:11px">Max Differentials</button>
          <button class="dev-btn" onclick="if(gameState.classSystem.active){gameState.classSystem.differentials={economic:0,legal:0,political:0,social:0};} renderDevTabContent();" style="font-size:11px">Zero Differentials</button>
          <button class="dev-btn" onclick="if(gameState.classSystem.active){window.dismantleClassSystem();} renderDevTabContent();" style="font-size:11px">Dismantle</button>
        </div>
      </div>`;
    } else {
      html = `<div style="color:var(--text-dim);font-style:italic">Class system not initialized</div>`;
    }
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
      gameState = window.gameState = window.initGameCore(seed);
    };
  }

  // Wire rivers tab
  if (devActiveTab === 'rivers') {
    const vertCheck = document.getElementById('dev-river-verts');
    if (vertCheck) vertCheck.onchange = () => {
      devShowRiverVertices = vertCheck.checked;
      if (window.setDevRenderingFlags) window.setDevRenderingFlags(devShowRiverVertices, devHighlightRivers, fogOfWarDisabled);
      if (window.setMapDirty) window.setMapDirty(true);
      if (window.render) window.render();
    };
    document.querySelectorAll('.dev-river-check').forEach(el => {
      el.onchange = () => {
        const rid = parseInt(el.dataset.riverId);
        if (el.checked) devHighlightRivers.add(rid);
        else devHighlightRivers.delete(rid);
        el.closest('.dev-river-item').classList.toggle('active', el.checked);
        if (window.setDevRenderingFlags) window.setDevRenderingFlags(devShowRiverVertices, devHighlightRivers, fogOfWarDisabled);
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
  if (foodEl) { const v = parseInt(foodEl.value); window.FOOD_PER_POP = isNaN(v) ? 2 : v; }
  const foodChildEl = document.getElementById('dev-food-per-child');
  if (foodChildEl) { const v = parseInt(foodChildEl.value); window.FOOD_PER_CHILD = isNaN(v) ? 1 : v; }

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
  gameState = window.gameState = window.initGameCore(seed);
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

export function devSetResource(key, value) {
  const v = parseFloat(value);
  if (isNaN(v)) return;
  gameState.resources[key] = Math.max(0, v);
  renderDevTabContent();
  window.updateAllUI();
}

export function devAddResource(key, amount) {
  gameState.resources[key] = Math.max(0, (gameState.resources[key] || 0) + amount);
  renderDevTabContent();
  window.updateAllUI();
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
    // Mark everything visible
    for (let r = 0; r < window.MAP_ROWS; r++) {
      for (let c = 0; c < window.MAP_COLS; c++) {
        gameState.visibilityMap[r][c] = 2;
        gameState.map[r][c].revealed = true;
      }
    }
  } else {
    // Reset all to unexplored, then recompute from current sources
    for (let r = 0; r < window.MAP_ROWS; r++) {
      for (let c = 0; c < window.MAP_COLS; c++) {
        gameState.visibilityMap[r][c] = 0;
        gameState.map[r][c].revealed = false;
      }
    }
    if (window.recomputeVisibility) window.recomputeVisibility();
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
    badge.textContent = 'DEV \u2014 Fog of war disabled';
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

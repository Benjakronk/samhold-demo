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

// System toggles for playtesting — all enabled by default
if (!window.devToggles) {
  window.devToggles = {
    // Turn processing systems
    crime: true, immigration: true, events: true, births: true, aging: true,
    resistance: true, governanceTurn: true, values: true,
    classSystem: true, genderFormalization: true,
    traditions: true, societyBuildings: true,
    // Cohesion pillar influences
    cohFoodSecurity: true, cohWorkingAge: true,
    cohGovernance: true, cohPolicy: true, cohShelter: true,
    cohDecay: true, cohKnowledge: true,
    cohTerritoryStrain: true, cohTrustLimiter: true,
    cohElderBonuses: true, cohHardship: true,
    cohSatDependency: true, cohTransitionPenalty: true,
    cohTimeStability: true,
  };
}

export function devToggleSystem(sys, enabled) {
  window.devToggles[sys] = enabled;
}

let _devPanelListenersRegistered = false;

export function initDevPanel(gameStateRef) {
  gameState = gameStateRef;

  // Wire dev panel button event listeners — only once, even if initDevPanel is called again on restart
  if (!_devPanelListenersRegistered) {
    _devPanelListenersRegistered = true;

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
  if (devApplyLive) devApplyLive.addEventListener('click', (e) => {
    e.stopPropagation();
    applyDevValues();
    renderDevTabContent();
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

  } // end _devPanelListenersRegistered guard

  // Show dev button only in dev mode (runs every init in case of restart)
  const devBtn2 = document.getElementById('dev-btn');
  if (window.DEV_MODE && devBtn2) devBtn2.style.display = '';
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
        <div class="dev-group-title">⚖️ Consumption Rates (instant)</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px">
          ${devRow('Food per adult/turn', 'dev-food-per-pop', window.FOOD_PER_POP)}
          ${devRow('Food per child/turn', 'dev-food-per-child', window.FOOD_PER_CHILD)}
          ${devRow('Food per elder/turn', 'dev-food-per-elder', window.FOOD_PER_ELDER)}
          ${devRow('Winter food per pop', 'dev-winter-food', window.WINTER_FOOD_PER_POP ?? 0.5)}
        </div>
        <div style="font-size:11px;color:var(--text-dim);margin-top:4px">Immigrants use the adult rate. Winter cost = ceil(pop × winter rate), applied once per winter turn.</div>
        <div style="margin-top:4px">
          ${devRow('Nursing income penalty', 'dev-nursing-penalty', window.NURSING_LABOR_PENALTY ?? 0.5)}
        </div>
        <div style="font-size:11px;color:var(--text-dim);margin-top:4px">0 = no penalty, 0.5 = default. Reduces food/mat income proportional to nursing mothers in workforce.</div>
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
    setTimeout(() => {
      const pairs = [
        ['dev-food-per-pop',     v => { window.FOOD_PER_POP   = parseInt(v) || 0; }],
        ['dev-food-per-child',   v => { window.FOOD_PER_CHILD  = parseInt(v) || 0; }],
        ['dev-food-per-elder',   v => { window.FOOD_PER_ELDER  = parseInt(v) || 0; }],
        ['dev-winter-food',      v => { window.WINTER_FOOD_PER_POP  = Math.max(0, parseFloat(v) || 0); }],
        ['dev-nursing-penalty',  v => { window.NURSING_LABOR_PENALTY = Math.max(0, Math.min(1, parseFloat(v) || 0)); }],
      ];
      for (const [id, apply] of pairs) {
        const el = document.getElementById(id);
        if (el) el.oninput = () => apply(el.value);
      }
    }, 0);
  } else if (devActiveTab === 'population') {
    html = `<div class="dev-grid-2col">
      <div>` +
      devGroup('\u{1F476}', 'Birth & Growth', [
        devRow('Base birth rate', 'dev-birth-rate', window.BASE_BIRTH_RATE || 0.10),
        devRow('Working age', 'dev-working-age', window.WORKING_AGE),
      ]) + `</div><div></div></div>
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
          ${(() => { const sc = window.getAdultSexCounts ? window.getAdultSexCounts() : null; return sc ? `<div style="color:var(--text-dim);font-size:12px;margin-top:4px"><span style="color:#6ca0d4">${sc.male}\u2642</span> / <span style="color:#d47ca0">${sc.female}\u2640</span></div>` : ''; })()}
        </div>

        <div class="dev-pop-section">
          <h5>Fertility & Nursing</h5>
          ${(() => {
            const fertile = window.getFertileFemaleCount ? window.getFertileFemaleCount() : 0;
            const nursing = window.getTotalNursing ? window.getTotalNursing() : 0;
            const reproAvail = window.getReproductiveAvailability ? window.getReproductiveAvailability() : 1;
            const entries = gameState.nursing || [];
            return `
              <div style="color:var(--text-dim);font-size:12px;">
                Fertile \u2640: ${fertile} | Nursing: ${nursing} | Available: ${Math.max(0, fertile - nursing)}<br>
                Repro. availability: ${Math.round(reproAvail * 100)}%<br>
                ${entries.length > 0 ? `Entries: ${entries.map(e => e.count + '\u00D7' + e.turnsLeft + 't').join(', ')}` : 'No nursing entries'}
              </div>
              <button class="dev-btn" style="margin-top:4px;font-size:11px" onclick="window.gameState.nursing=[]; window.renderDevOverlay();">Clear Nursing</button>
            `;
          })()}
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
  } else if (devActiveTab === 'cohesion') {
    const c = gameState.cohesion;
    const status = window.getCohesionStatus ? window.getCohesionStatus() : { label: '?', color: '#888' };
    const strain = window.getTerritoryGovernanceStrain ? window.getTerritoryGovernanceStrain() : { legitimacy: 0, bonds: 0 };
    const t = window.devToggles || {};

    function cohToggle(key, label) {
      const on = t[key] !== false;
      return `<label style="display:flex;align-items:center;gap:5px;font-size:11px;cursor:pointer;padding:3px 5px;background:rgba(0,0,0,0.15);border-radius:3px">
        <input type="checkbox" ${on ? 'checked' : ''} onchange="window.devToggleSystem('${key}',this.checked)">
        <span style="color:${on ? 'var(--text-light)' : 'var(--text-dim)'}">${label}</span>
      </label>`;
    }

    html = `<div>
      <h3 style="color:var(--text-gold);margin:0 0 8px">🏛️ Cohesion Pillars</h3>
      <div style="font-size:12px;margin-bottom:8px">
        Status: <strong style="color:${status.color}">${status.label}</strong> (Total: ${c.total})
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
        ${['identity','legitimacy','satisfaction','bonds'].map(p => {
          const val = Math.round(c[p]);
          const color = val >= 80 ? '#5a8a4a' : val >= 60 ? '#6ca0d4' : val >= 40 ? '#c9a84c' : '#a94442';
          return `<div style="background:rgba(0,0,0,0.2);padding:6px 8px;border-radius:4px">
            <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
              <span>${p.charAt(0).toUpperCase() + p.slice(1)}</span>
              <strong style="color:${color}">${val}</strong>
            </div>
            <div style="height:8px;background:rgba(0,0,0,0.3);border-radius:4px;overflow:hidden">
              <div style="height:100%;width:${val}%;background:${color}"></div>
            </div>
            <div style="display:flex;gap:3px;margin-top:4px;flex-wrap:wrap">
              <button class="dev-btn" onclick="devSetCohesion('${p}',0)" style="font-size:10px;color:var(--accent-red)">0</button>
              <button class="dev-btn" onclick="devSetCohesion('${p}',25)" style="font-size:10px">25</button>
              <button class="dev-btn" onclick="devSetCohesion('${p}',50)" style="font-size:10px">50</button>
              <button class="dev-btn" onclick="devSetCohesion('${p}',75)" style="font-size:10px">75</button>
              <button class="dev-btn" onclick="devSetCohesion('${p}',100)" style="font-size:10px">100</button>
              <button class="dev-btn" onclick="devAdjustCohesion('${p}',-5)" style="font-size:10px;color:var(--accent-red)">−5</button>
              <button class="dev-btn" onclick="devAdjustCohesion('${p}',5)" style="font-size:10px">+5</button>
            </div>
          </div>`;
        }).join('')}
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
        <button class="dev-btn" onclick="devMaxCohesion(); renderDevTabContent();" style="font-size:11px">💎 Max All (100)</button>
        <button class="dev-btn" onclick="devMinCohesion(); renderDevTabContent();" style="font-size:11px;color:var(--accent-red)">💀 Min All (1)</button>
        <button class="dev-btn" onclick="devSetAllCohesion(50); renderDevTabContent();" style="font-size:11px">⚖️ Balanced (50)</button>
      </div>
      <div style="font-size:11px;color:var(--text-dim);padding:4px 8px;background:rgba(0,0,0,0.15);border-radius:4px;margin-bottom:12px">
        Territory governance strain: Legitimacy −${strain.legitimacy.toFixed(2)}/t, Bonds −${strain.bonds.toFixed(2)}/t
      </div>

      <h4 style="color:var(--text-light);margin:0 0 6px;font-size:13px">🔧 System Toggles</h4>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;margin-bottom:12px">
        ${cohToggle('crime','Crime')}
        ${cohToggle('immigration','Immigration')}
        ${cohToggle('events','Random Events')}
        ${cohToggle('resistance','Resistance')}
        ${cohToggle('governanceTurn','Gov. Turn Effects')}
        ${cohToggle('values','Values')}
        ${cohToggle('traditions','Traditions')}
        ${cohToggle('societyBuildings','Society Buildings')}
        ${cohToggle('classSystem','Class System')}
        ${cohToggle('genderFormalization','Gender Formal.')}
        ${cohToggle('births','Births')}
        ${cohToggle('aging','Aging')}
      </div>

      <h4 style="color:var(--text-light);margin:0 0 6px;font-size:13px">📊 Pillar Influence Toggles</h4>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:12px">
        ${cohToggle('cohFoodSecurity','Food Security → Sat')}
        ${cohToggle('cohWorkingAge','Working Age → Sat/Know')}
        ${cohToggle('cohGovernance','Gov. Model Effects')}
        ${cohToggle('cohPolicy','Policy Effects')}
        ${cohToggle('cohShelter','Shelter → Sat')}
        ${cohToggle('cohDecay','Baseline Decay (all)')}
        ${cohToggle('cohKnowledge','Knowledge → Identity')}
        ${cohToggle('cohTerritoryStrain','Territory Strain')}
        ${cohToggle('cohTrustLimiter','Trust Rate Limiter')}
        ${cohToggle('cohElderBonuses','Elder Bonuses')}
        ${cohToggle('cohHardship','Shared Hardship → Bonds')}
        ${cohToggle('cohSatDependency','Sat. Dependency → Legit')}
        ${cohToggle('cohTransitionPenalty','Gov. Transition Penalty')}
        ${cohToggle('cohTimeStability','Time Stability → Legit')}
      </div>
      <div style="display:flex;gap:4px;margin-bottom:12px">
        <button class="dev-btn" style="font-size:11px" onclick="Object.keys(window.devToggles).forEach(k=>{window.devToggles[k]=true}); renderDevTabContent();">✅ Enable All</button>
        <button class="dev-btn" style="font-size:11px;color:var(--accent-red)" onclick="Object.keys(window.devToggles).forEach(k=>{window.devToggles[k]=false}); renderDevTabContent();">⛔ Disable All</button>
        <button class="dev-btn" style="font-size:11px" onclick="Object.keys(window.devToggles).filter(k=>k.startsWith('coh')).forEach(k=>{window.devToggles[k]=false}); renderDevTabContent();">🔇 Freeze Pillars</button>
      </div>

      <h4 style="color:var(--text-light);margin:0 0 6px;font-size:13px">⏩ Time Controls</h4>
      <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px">
        <button class="dev-btn" onclick="devAdvanceTurns(1)" style="font-size:11px">+1 Turn</button>
        <button class="dev-btn" onclick="devAdvanceTurns(4)" style="font-size:11px">+4 (1 Year)</button>
        <button class="dev-btn" onclick="devAdvanceTurns(12)" style="font-size:11px">+12 (3 Years)</button>
        <button class="dev-btn" onclick="devAdvanceTurns(20)" style="font-size:11px">+20 (5 Years)</button>
        <button class="dev-btn" onclick="devAdvanceTurns(40)" style="font-size:11px">+40 (10 Years)</button>
      </div>
      <div style="font-size:11px;color:var(--text-dim)">
        Turn ${gameState.turn} · ${window.SEASONS?.[gameState.turn % 4] || '?'} · Year ${Math.floor(gameState.turn / 4) + 1}
      </div>
    </div>`;
  } else if (devActiveTab === 'governance') {
    html = `<div class="dev-grid-2col">
      <div>` +
      devGroup('\u2696\uFE0F', 'Governance Model', [
        { label: 'Current Model', content: `<span id="dev-gov-model">${window.GOVERNANCE_MODELS[gameState.governance.model].name}</span>` },
        { label: 'Transition Timer', content: `<span id="dev-gov-timer">${gameState.governance.modelChangeTimer}</span>` }
      ]) +
      devGroup('\u{1F39B}\uFE0F', 'Policies (instant, no consequences)', [
        ...['freedom','mercy','tradition','isolation','workingAge'].map(p => {
          const cur = p === 'workingAge' ? (window.WORKING_AGE ?? 10) : (gameState.governance.policies[p] ?? 50);
          return { label: `${p} (${cur})`, content: `
            <div style="display:flex;gap:3px;flex-wrap:wrap">
              ${p === 'workingAge'
                ? [6,8,10,12,14,16].map(v => `<button class="dev-btn" onclick="devSetPolicy('${p}',${v})" style="font-size:10px${cur===v?';color:var(--text-gold)':''}">${v}</button>`).join('')
                : [0,20,40,50,60,80,100].map(v => `<button class="dev-btn" onclick="devSetPolicy('${p}',${v})" style="font-size:10px${cur===v?';color:var(--text-gold)':''}">${v}</button>`).join('')
              }
              <input type="number" id="dev-policy-${p}" value="${cur}" min="${p==='workingAge'?6:0}" max="${p==='workingAge'?16:100}" style="width:44px;font-size:11px">
              <button class="dev-btn" onclick="devSetPolicy('${p}',parseInt(document.getElementById('dev-policy-${p}').value))" style="font-size:10px">Set</button>
            </div>` };
        })
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
  } else if (devActiveTab === 'territory') {
    const territory = gameState.territory;
    const territorySize = territory ? territory.size : 0;
    const claimedSize = gameState.claimedHexes ? gameState.claimedHexes.size : 0;
    const threshold = window.TERRITORY_GOVERNANCE_THRESHOLD || 25;
    const strain = window.getTerritoryGovernanceStrain ? window.getTerritoryGovernanceStrain() : { legitimacy: 0, bonds: 0 };
    const expPoints = gameState.expansionPoints || 0;
    const adminWorkers = window.getAdminHallWorkerCount ? window.getAdminHallWorkerCount() : 0;

    html = `<div>
      <h3 style="color:var(--text-gold);margin:0 0 8px">🗺️ Territory State</h3>
      <div style="font-size:12px;margin-bottom:8px;padding:6px 8px;background:rgba(0,0,0,0.15);border-radius:4px">
        <div>Total territory: <strong>${territorySize}</strong> hexes (threshold: ${threshold})</div>
        <div>Claimed hexes: <strong>${claimedSize}</strong> (non-core)</div>
        <div>Expansion points: <strong>${expPoints.toFixed(1)}</strong></div>
        <div>Admin Hall workers: <strong>${adminWorkers}</strong> (${(adminWorkers * 0.5).toFixed(1)} pts/turn)</div>
        <div>Governance strain: Leg −${strain.legitimacy.toFixed(2)}/t, Bonds −${strain.bonds.toFixed(2)}/t</div>
      </div>

      <h4 style="color:var(--text-light);margin:8px 0 4px;font-size:14px">🏘️ Settlements</h4>`;

    for (let i = 0; i < gameState.settlements.length; i++) {
      const s = gameState.settlements[i];
      const healthPct = Math.round((s.health / s.maxHealth) * 100);
      const healthColor = healthPct > 70 ? '#5a8a4a' : healthPct > 40 ? '#c9a84c' : '#a94442';
      html += `
        <div style="padding:6px 8px;background:rgba(0,0,0,0.2);border-radius:4px;margin-bottom:6px">
          <div style="display:flex;justify-content:space-between;font-size:13px">
            <strong>${s.name || '(unnamed)'}</strong>
            <span>(${s.col}, ${s.row}) · r=${s.coreRadius}</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:4px">
            <span style="font-size:11px;color:var(--text-dim)">HP:</span>
            <div style="flex:1;height:8px;background:rgba(0,0,0,0.3);border-radius:4px;overflow:hidden">
              <div style="height:100%;width:${healthPct}%;background:${healthColor}"></div>
            </div>
            <span style="font-size:11px;color:${healthColor}">${s.health}/${s.maxHealth}</span>
          </div>
          <div style="font-size:11px;color:var(--text-dim);margin-top:2px">Cultural strength: ${(s.culturalStrength || 0).toFixed(1)}</div>
          <div style="display:flex;gap:3px;margin-top:4px;flex-wrap:wrap">
            <button class="dev-btn" onclick="devDamageSettlement(${i},20)" style="font-size:10px;color:var(--accent-red)">−20 HP</button>
            <button class="dev-btn" onclick="devDamageSettlement(${i},50)" style="font-size:10px;color:var(--accent-red)">−50 HP</button>
            <button class="dev-btn" onclick="devHealSettlement(${i})" style="font-size:10px">Full Heal</button>
            <button class="dev-btn" onclick="devSetCulturalStrength(${i},20)" style="font-size:10px">Culture=20</button>
          </div>
        </div>`;
    }

    html += `
      <h4 style="color:var(--text-light);margin:12px 0 4px;font-size:14px">🔧 Dev Controls</h4>
      <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px">
        <button class="dev-btn" onclick="devSetExpansionPoints(50)" style="font-size:11px">Set 50 pts</button>
        <button class="dev-btn" onclick="devSetExpansionPoints(200)" style="font-size:11px">Set 200 pts</button>
        <button class="dev-btn" onclick="devAddExpansionPoints(20)" style="font-size:11px">+20 pts</button>
        <button class="dev-btn" onclick="devClearClaimedHexes()" style="font-size:11px;color:var(--accent-red)">Clear Claimed</button>
      </div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px">
        <button class="dev-btn" onclick="devRunCulturalGrowth()" style="font-size:11px">Run Cultural Growth</button>
        <button class="dev-btn" onclick="devRunExpansionPoints()" style="font-size:11px">Run Expansion Pts</button>
      </div>
      <div style="font-size:11px;color:var(--text-dim);margin-top:4px">
        Territory = settlement cores + claimed hexes. Governance strain starts at ${threshold} hexes.
      </div>
    </div>`;
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
  } else if (devActiveTab === 'culture') {
    const culture = gameState.culture || {};
    const traditions = window.getActiveTraditions ? window.getActiveTraditions() : [];
    const stories = culture.stories || [];
    const storytellers = culture.storytellers || 0;
    const storyProgress = culture.storyProgress || 0;
    const storyCapacity = storytellers * 4;
    const regions = culture.namedRegions || [];
    const features = culture.namedFeatures || [];
    const accum = culture.societyBuildingAccumulators || { identity: 0, legitimacy: 0, satisfaction: 0, bonds: 0 };
    const values = gameState.values || {};
    const recognizedValues = (values.recognized || []);
    const emergingValues = (values.emerging || []);

    html = `<div class="dev-grid-2col">
      <div>
        <h3 style="color:var(--text-gold);margin:0 0 8px">🎭 Traditions</h3>
        <div style="font-size:12px;margin-bottom:8px">
          Active: <strong>${traditions.length}</strong>
        </div>`;

    if (traditions.length > 0) {
      for (const t of traditions) {
        html += `<div style="padding:3px 6px;background:rgba(0,0,0,0.15);border-radius:3px;margin-bottom:3px;font-size:11px">
          <strong>${t.customName || t.name}</strong> · ${t.timesPerformed || 0}× · every ${t.customInterval || t.interval}y · ${t.customSeason || t.season}
        </div>`;
      }
    } else {
      html += `<div style="color:var(--text-dim);font-size:11px;font-style:italic">No traditions</div>`;
    }

    html += `
        <div style="display:flex;gap:3px;margin-top:6px;flex-wrap:wrap">
          <button class="dev-btn" onclick="devEstablishRandomTradition()" style="font-size:11px">Establish Random</button>
        </div>

        <h3 style="color:var(--text-gold);margin:12px 0 8px">📖 Oral Tradition</h3>
        <div style="font-size:12px;margin-bottom:8px">
          <div>Storytellers: <strong>${storytellers}</strong></div>
          <div>Progress: <strong>${storyProgress.toFixed(2)}</strong></div>
          <div>Stories: <strong>${stories.length}</strong> / ${storyCapacity} capacity</div>
        </div>
        <div style="display:flex;gap:3px;flex-wrap:wrap">
          <button class="dev-btn" onclick="devAddStoryteller()" style="font-size:11px">+1 Storyteller</button>
          <button class="dev-btn" onclick="devRemoveStoryteller()" style="font-size:11px">−1 Storyteller</button>
          <button class="dev-btn" onclick="devForceStory()" style="font-size:11px">Force Story</button>
        </div>

        <h3 style="color:var(--text-gold);margin:12px 0 8px">💎 Shared Values</h3>
        <div style="font-size:12px">
          <div>Recognized: <strong>${recognizedValues.length}</strong></div>`;
    for (const v of recognizedValues) {
      html += `<div style="font-size:11px;padding:2px 6px;background:rgba(0,0,0,0.1);border-radius:2px;margin:2px 0">${v.name || v.id} (str: ${(v.strength || 0).toFixed(1)})</div>`;
    }
    html += `
          <div style="margin-top:4px">Emerging: <strong>${emergingValues.length}</strong></div>`;
    for (const v of emergingValues) {
      html += `<div style="font-size:11px;padding:2px 6px;background:rgba(0,0,0,0.1);border-radius:2px;margin:2px 0">${v.name || v.id} (prog: ${(v.progress || 0).toFixed(1)})</div>`;
    }
    html += `</div>
      </div>
      <div>
        <h3 style="color:var(--text-gold);margin:0 0 8px">🏛️ Society Building Accumulators</h3>
        <div style="font-size:12px;padding:6px 8px;background:rgba(0,0,0,0.15);border-radius:4px;margin-bottom:8px">
          <div>Identity: <strong>${accum.identity.toFixed(3)}</strong></div>
          <div>Legitimacy: <strong>${accum.legitimacy.toFixed(3)}</strong></div>
          <div>Satisfaction: <strong>${accum.satisfaction.toFixed(3)}</strong></div>
          <div>Bonds: <strong>${accum.bonds.toFixed(3)}</strong></div>
        </div>

        <h3 style="color:var(--text-gold);margin:8px 0 8px">🗺️ Named Features</h3>
        <div style="font-size:12px;margin-bottom:4px">
          <div>Regions: <strong>${regions.length}</strong></div>
          <div>Features (rivers/lakes/terrain): <strong>${features.length}</strong></div>
        </div>`;

    for (const r of regions) {
      html += `<div style="font-size:11px;padding:2px 6px;background:rgba(0,0,0,0.1);border-radius:2px;margin:2px 0">${r.name} (${r.hexes.length} hexes)</div>`;
    }

    html += `
        <h3 style="color:var(--text-gold);margin:12px 0 8px">⛪ Sacred Places</h3>`;
    const sacredPlaces = (culture.sacredPlaces || []);
    if (sacredPlaces.length > 0) {
      for (const sp of sacredPlaces) {
        html += `<div style="font-size:11px;padding:2px 6px;background:rgba(0,0,0,0.1);border-radius:2px;margin:2px 0">${sp.name || sp.type} @ (${sp.col},${sp.row})</div>`;
      }
    } else {
      html += `<div style="color:var(--text-dim);font-size:11px;font-style:italic">No sacred places</div>`;
    }

    html += `
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
          <div style="display:flex;gap:3px">
            <button class="dev-btn" onclick="devCreateUnit('${unitKey}')"
                    style="font-size:11px;padding:3px 8px;${!canAffordPop || !canAffordMaterials ? 'opacity:0.5;' : ''}">Create</button>
            <button class="dev-btn" onclick="devCreateUnitFree('${unitKey}')"
                    style="font-size:11px;padding:3px 8px;color:#6cb66c">Free</button>
          </div>
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
      const st = window.stageTotal || ((s) => (imm.cohorts[s] || []).reduce((a, c) => a + c.count, 0));
      const totalPipeline = st(0) + st(1) + st(2);
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
          <div>Arrivals (C0): <strong>${st(0)}</strong></div>
          <div>Residents (C1): <strong>${st(1)}</strong></div>
          <div>Participants (C2): <strong>${st(2)}</strong></div>
          <div>Integrating (C3): <strong>${st(3)}</strong></div>
        </div>

        <div style="font-size:12px;padding:6px 8px;background:rgba(0,0,0,0.15);border-radius:4px;margin-bottom:8px">
          <div>PS Strength: <strong>${(ps.strength * 100).toFixed(1)}%</strong></div>
          <div>PS Population: <strong>${ps.population}</strong> adults, <strong>${psChildren}</strong> children</div>
          <div>Intervention: <strong>${imm.interventionActive || 'none'}</strong> (${imm.interventionTurns}t)</div>
          <div>Lifetime: <strong>${imm.lifetimeArrivals}</strong> arrived, <strong>${imm.lifetimeIntegrated}</strong> integrated</div>
        </div>

        <h4 style="color:var(--text-light);margin:8px 0 4px;font-size:14px">🔧 Dev Controls</h4>
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px">
          <button class="dev-btn" onclick="if(window.addImmigrantArrivals) addImmigrantArrivals(5); renderDevTabContent();" style="font-size:11px">+5 Arrivals</button>
          <button class="dev-btn" onclick="if(window.addImmigrantArrivals) addImmigrantArrivals(20); renderDevTabContent();" style="font-size:11px">+20 Arrivals</button>
          <button class="dev-btn" onclick="gameState.immigration.cohorts=[[],[],[],[]]; renderDevTabContent();" style="font-size:11px">Clear Pipeline</button>
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
  } else if (devActiveTab === 'gender') {
    const gf = gameState.genderFormalization;
    if (gf) {
      const DIMS = window.GENDER_DIMENSIONS || {};
      let dimRows = '';
      for (const [key, dim] of Object.entries(gf.dimensions)) {
        const dimDef = DIMS[key] || {};
        const posLabel = dimDef.positions?.[String(dim.position)]?.label || dim.position;
        const posColor = dim.position < 0 ? '#cc8844' : dim.position > 0 ? '#6cb66c' : 'var(--text-dim)';
        dimRows += `<div>${dimDef.icon || ''} ${dimDef.name || key}: <strong style="color:${posColor}">${posLabel} (${dim.position})</strong> · t@pos=${dim.turnsAtPosition} · drift=${dim.driftTimer} · lag=${dim.lagTurnsLeft}</div>`;
      }
      const cohFx = window.getGenderCohesionEffects ? window.getGenderCohesionEffects() : {};
      html = `<div>
        <h3 style="color:var(--text-gold);margin:0 0 8px">Gender Formalization State</h3>
        <div style="font-size:12px;margin-bottom:8px">
          <div>Active: <strong style="color:${gf.active ? '#6cb66c' : '#cc6644'}">${gf.active}</strong></div>
          <div>Activated turn: ${gf.activatedTurn || '—'}</div>
          ${dimRows}
          <div style="margin-top:4px">Production mult: <strong>${window.getGenderProductionMultiplier ? window.getGenderProductionMultiplier().toFixed(2) : '1.00'}</strong></div>
          <div>Trust modifier: <strong>${window.getGenderTrustModifier ? window.getGenderTrustModifier().toFixed(3) : '0'}</strong></div>
          <div>Resistance/turn: <strong>${window.getGenderResistancePressure ? window.getGenderResistancePressure().toFixed(1) : '0'}</strong></div>
          <div>Cohesion/turn: Id=${(cohFx.identity||0).toFixed(2)} Leg=${(cohFx.legitimacy||0).toFixed(2)} Bon=${(cohFx.bonds||0).toFixed(2)}</div>
          <div>Drift warning: ${gf.active && gameState.cohesion.legitimacy < (window.GENDER_DRIFT_THRESHOLD || 30) ? '<span style="color:#cc6644">YES</span>' : 'No'}</div>
          ${gf.dismantlementEffects ? `<div style="color:#cc6644">Dismantlement aftermath: ${gf.dismantlementEffects.turnsRemaining}t</div>` : ''}
        </div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px">
          <button class="dev-btn" onclick="const d=gameState.genderFormalization.dimensions; for(const k of Object.keys(d)){d[k].position=-2;d[k].turnsAtPosition=99;} gameState.genderFormalization.active=true; gameState.genderFormalization.activatedTurn=gameState.genderFormalization.activatedTurn||gameState.turn; renderDevTabContent();" style="font-size:11px">All Sharp Restrictive</button>
          <button class="dev-btn" onclick="const d=gameState.genderFormalization.dimensions; for(const k of Object.keys(d)){d[k].position=2;d[k].turnsAtPosition=99;} gameState.genderFormalization.active=true; gameState.genderFormalization.activatedTurn=gameState.genderFormalization.activatedTurn||gameState.turn; renderDevTabContent();" style="font-size:11px">All Sharp Egalitarian</button>
          <button class="dev-btn" onclick="const d=gameState.genderFormalization.dimensions; for(const k of Object.keys(d)){d[k].position=0;d[k].turnsAtPosition=0;d[k].driftTimer=0;d[k].lagTurnsLeft=0;} gameState.genderFormalization.active=false; renderDevTabContent();" style="font-size:11px">Reset All</button>
        </div>
        <div style="display:flex;gap:4px;flex-wrap:wrap">
          ${Object.keys(gf.dimensions).map(k => `
            <button class="dev-btn" onclick="gameState.genderFormalization.dimensions.${k}.position=Math.max(-2,gameState.genderFormalization.dimensions.${k}.position-1); gameState.genderFormalization.active=true; gameState.genderFormalization.activatedTurn=gameState.genderFormalization.activatedTurn||gameState.turn; renderDevTabContent();" style="font-size:10px">${k} −1</button>
            <button class="dev-btn" onclick="gameState.genderFormalization.dimensions.${k}.position=Math.min(2,gameState.genderFormalization.dimensions.${k}.position+1); gameState.genderFormalization.active=true; gameState.genderFormalization.activatedTurn=gameState.genderFormalization.activatedTurn||gameState.turn; renderDevTabContent();" style="font-size:10px">${k} +1</button>
          `).join('')}
        </div>
      </div>`;
    } else {
      html = `<div style="color:var(--text-dim);font-style:italic">Gender formalization not initialized</div>`;
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

const DEV_ROW_DECIMAL_IDS = {
  'dev-birth-rate':      { step: '0.01', delta: 0.01, decimals: 2 },
  'dev-nursing-penalty': { step: '0.05', delta: 0.05, decimals: 2 },
  'dev-winter-food':     { step: '0.05', delta: 0.05, decimals: 2 },
};

export function devRow(label, id, value) {
  const dec = DEV_ROW_DECIMAL_IDS[id];
  const step = dec ? dec.step : '1';
  const displayValue = dec ? parseFloat(value).toFixed(dec.decimals) : value;
  return `<div class="dev-row"><span class="dev-label">${label}</span><div class="dev-val"><button class="dev-btn" onclick="devAdjust('${id}',-1)">\u2212</button><input class="dev-input" id="${id}" type="number" value="${displayValue}" min="0" step="${step}"><button class="dev-btn" onclick="devAdjust('${id}',1)">+</button></div></div>`;
}

export function devAdjust(id, delta) {
  const el = document.getElementById(id);
  const dec = DEV_ROW_DECIMAL_IDS[id];
  if (dec) {
    el.value = Math.max(0, (parseFloat(el.value || 0) + (delta * dec.delta)).toFixed(dec.decimals));
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
  if (delta > 0) {
    if (window.addToAdultCohort) window.addToAdultCohort(25, delta);
    gameState.population.total += delta;
    gameState.population.idle += delta;
  } else if (delta < 0) {
    const remove = Math.min(Math.abs(delta), gameState.population.total - 1);
    if (window.removeFromAdultCohorts) window.removeFromAdultCohorts(remove);
    gameState.population.total = Math.max(1, gameState.population.total - remove);
    gameState.population.idle = Math.max(0, gameState.population.total - gameState.population.employed);
  }
  if (window.recomputeElderCount) window.recomputeElderCount();
  const el = document.getElementById('dev-adults');
  if (el) el.value = gameState.population.total;
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
  const foodElderEl = document.getElementById('dev-food-per-elder');
  if (foodElderEl) { const v = parseInt(foodElderEl.value); window.FOOD_PER_ELDER = isNaN(v) ? 1 : v; }
  const winterFoodEl = document.getElementById('dev-winter-food');
  if (winterFoodEl) { const v = parseFloat(winterFoodEl.value); window.WINTER_FOOD_PER_POP = isNaN(v) ? 0.5 : Math.max(0, v); }
  const nursingPenaltyEl = document.getElementById('dev-nursing-penalty');
  if (nursingPenaltyEl) { const v = parseFloat(nursingPenaltyEl.value); window.NURSING_LABOR_PENALTY = isNaN(v) ? 0.5 : Math.max(0, Math.min(1, v)); }

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
    const delta = newTotal - gameState.population.total;
    if (delta > 0) {
      if (window.addToAdultCohort) window.addToAdultCohort(25, delta);
    } else if (delta < 0) {
      if (window.removeFromAdultCohorts) window.removeFromAdultCohorts(Math.abs(delta));
    }
    gameState.population.total = newTotal;
    gameState.population.idle = Math.max(0, newTotal - gameState.population.employed);
    if (window.recomputeElderCount) window.recomputeElderCount();
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
  if (window.addToAdultCohort) window.addToAdultCohort(25, 25);
  gameState.population.total += 25;
  gameState.population.idle += 25;
  if (window.recomputeElderCount) window.recomputeElderCount();

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
    if (window.addToAdultCohort) window.addToAdultCohort(25, 10);
    gameState.population.total += 10;
    gameState.population.idle += 10;
    if (window.recomputeElderCount) window.recomputeElderCount();
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

// ---- Policy dev controls ----

export function devSetPolicy(policy, value) {
  const v = Math.max(0, Math.min(policy === 'workingAge' ? 16 : 100, parseInt(value) || 0));
  if (policy === 'workingAge') {
    window.WORKING_AGE = Math.max(6, v);
  } else {
    gameState.governance.policies[policy] = v;
  }
  // Clear any in-progress lag for this policy so the value takes effect immediately
  if (gameState.policyLag) {
    delete gameState.policyLag[policy];
    if (gameState.policyLag.pending) delete gameState.policyLag.pending[policy];
  }
  window.updateAllUI();
  renderDevTabContent();
}

// ---- Cohesion dev controls ----

export function devSetCohesion(pillar, value) {
  if (gameState?.cohesion) {
    gameState.cohesion[pillar] = Math.max(0, Math.min(100, value));
    if (window.calculateCohesion) window.calculateCohesion();
    window.updateAllUI();
    renderDevTabContent();
  }
}

export function devAdjustCohesion(pillar, delta) {
  if (gameState?.cohesion) {
    gameState.cohesion[pillar] = Math.max(0, Math.min(100, gameState.cohesion[pillar] + delta));
    if (window.calculateCohesion) window.calculateCohesion();
    window.updateAllUI();
    renderDevTabContent();
  }
}

export function devSetAllCohesion(value) {
  if (gameState?.cohesion) {
    gameState.cohesion.identity = value;
    gameState.cohesion.legitimacy = value;
    gameState.cohesion.satisfaction = value;
    gameState.cohesion.bonds = value;
    if (window.calculateCohesion) window.calculateCohesion();
    window.updateAllUI();
  }
}

// ---- Time controls ----

export function devAdvanceTurns(count) {
  closeDevOverlay();
  let i = 0;
  function step() {
    if (i >= count) {
      window.updateAllUI();
      if (window.setMapDirty) window.setMapDirty(true);
      if (window.render) window.render();
      return;
    }
    if (window.processTurn) window.processTurn();
    i++;
    // Small delay so the UI doesn't freeze for large counts
    if (count > 4) {
      setTimeout(step, 10);
    } else {
      step();
    }
  }
  step();
}

// ---- Territory dev controls ----

export function devDamageSettlement(index, damage) {
  const s = gameState.settlements[index];
  if (!s) return;
  if (window.damageSettlement) {
    window.damageSettlement(s.col, s.row, damage);
  } else {
    s.health = Math.max(0, s.health - damage);
  }
  window.updateAllUI();
  if (window.setMapDirty) window.setMapDirty(true);
  if (window.render) window.render();
  renderDevTabContent();
}

export function devHealSettlement(index) {
  const s = gameState.settlements[index];
  if (!s) return;
  s.health = s.maxHealth;
  window.updateAllUI();
  renderDevTabContent();
}

export function devSetCulturalStrength(index, value) {
  const s = gameState.settlements[index];
  if (!s) return;
  s.culturalStrength = value;
  renderDevTabContent();
}

export function devSetExpansionPoints(value) {
  gameState.expansionPoints = value;
  window.updateAllUI();
  renderDevTabContent();
}

export function devAddExpansionPoints(value) {
  gameState.expansionPoints = (gameState.expansionPoints || 0) + value;
  window.updateAllUI();
  renderDevTabContent();
}

export function devClearClaimedHexes() {
  if (gameState.claimedHexes) gameState.claimedHexes.clear();
  if (window.recalcTerritory) window.recalcTerritory();
  window.updateAllUI();
  if (window.setMapDirty) window.setMapDirty(true);
  if (window.render) window.render();
  renderDevTabContent();
}

export function devRunCulturalGrowth() {
  if (window.processSettlementCulturalGrowth) {
    const report = { events: [] };
    window.processSettlementCulturalGrowth(report);
    if (window.recalcTerritory) window.recalcTerritory();
    window.updateAllUI();
    if (window.setMapDirty) window.setMapDirty(true);
    if (window.render) window.render();
    renderDevTabContent();
    console.log('Ran cultural growth step', report);
  }
}

export function devRunExpansionPoints() {
  if (window.processExpansionPoints) {
    const report = { events: [] };
    window.processExpansionPoints(report);
    window.updateAllUI();
    renderDevTabContent();
    console.log('Ran expansion points step', report);
  }
}

// ---- Culture dev controls ----

export function devEstablishRandomTradition() {
  const available = window.getAvailableTraditions ? window.getAvailableTraditions() : [];
  if (available.length === 0) {
    console.warn('No traditions available to establish');
    return;
  }
  const pick = available[Math.floor(Math.random() * available.length)];
  if (window.establishTradition) {
    window.establishTradition(pick.id);
    window.updateAllUI();
    renderDevTabContent();
    console.log('Established tradition:', pick.name);
  }
}

export function devAddStoryteller() {
  if (window.addStoryteller) {
    window.addStoryteller();
    window.updateAllUI();
    renderDevTabContent();
  }
}

export function devRemoveStoryteller() {
  if (window.removeStoryteller) {
    window.removeStoryteller();
    window.updateAllUI();
    renderDevTabContent();
  }
}

export function devCreateUnitFree(unitType) {
  if (!gameState.settlements[0]) {
    console.error('No settlement found for unit creation');
    return;
  }
  const settlement = gameState.settlements[0];
  const uType = window.UNIT_TYPES[unitType];
  if (!uType) return;

  // Temporarily give enough resources to create
  const origFood = gameState.resources.food;
  const origMats = gameState.resources.materials;
  const origPop = gameState.population.total;
  const origIdle = gameState.population.idle;

  gameState.resources.materials += uType.cost.materials + 1;
  gameState.population.total += uType.cost.population + 1;
  gameState.population.idle += uType.cost.population + 1;

  const unit = window.createUnit(unitType, settlement.col, settlement.row);

  // Restore original resources (createUnit already deducted)
  gameState.resources.food = origFood;
  gameState.resources.materials = origMats;
  gameState.population.total = origPop;
  gameState.population.idle = origIdle;

  if (unit) {
    console.log(`Created free ${unitType} at (${settlement.col}, ${settlement.row})`);
    renderDevTabContent();
    window.updateAllUI();
    if (window.render) window.render();
  }
}

export function devForceStory() {
  if (window.processStories) {
    // Temporarily boost progress to trigger a story
    const culture = gameState.culture;
    if (culture) {
      const oldProgress = culture.storyProgress || 0;
      culture.storyProgress = 100;
      const report = { events: [] };
      window.processStories(report);
      culture.storyProgress = oldProgress; // restore if it didn't reset
      window.updateAllUI();
      renderDevTabContent();
      console.log('Forced story creation');
    }
  }
}

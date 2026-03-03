// =====================================
// ECONOMY/WORKER SYSTEM
// =====================================
// Complete economy and worker management system for Samhold game
// Handles worker assignment, resource gathering, building operations, and workforce UI

// ---- CONSTANTS ----
let FOOD_PER_POP = 2; // food consumed per person per turn
const FOOD_PER_CHILD = 1; // children consume half rations
let WORKING_AGE = 10; // policy slider: age when children join workforce (6-16)

// ---- CORE WORKER FUNCTIONS ----

// Check if hex is in territory and workable
export function isInTerritory(col, row) {
  return window.gameState.territory.has(`${col},${row}`);
}

// Max workers a hex can support
export function getMaxWorkers(hex) {
  if (!isInTerritory(hex.col, hex.row)) return 0;
  if (hex.building) {
    const bDef = window.BUILDINGS[hex.building];
    if (hex.buildProgress > 0) return bDef.maxWorkers || 0; // construction workers
    return bDef.maxWorkers || 0;
  }
  return 1; // unimproved territory hex: 1 gatherer
}

// Calculate what a hex produces at its current worker count
export function getHexYield(hex) {
  const result = { food: 0, materials: 0 };
  if (!isInTerritory(hex.col, hex.row)) return result;

  // Settlement auto-food (no workers needed)
  if (hex.building === 'settlement' && hex.buildProgress <= 0) {
    result.food += window.BUILDINGS.settlement.autoFood || 0;
  }

  if (hex.workers <= 0) return result;

  // Under construction: workers are building, not producing
  if (hex.building && hex.buildProgress > 0) return result;

  // Terrain base yield from having any workers
  const terrain = window.TERRAIN[hex.terrain];
  result.food += terrain.food;
  result.materials += terrain.materials;

  // Fresh water bonus: +1 food for any hex with river or adjacent to lake
  if (hexHasFreshWater(hex)) result.food += 1;

  // Building bonus scaled by worker fill ratio
  if (hex.building && hex.buildProgress <= 0 && hex.building !== 'settlement') {
    const bDef = window.BUILDINGS[hex.building];
    const maxW = bDef.maxWorkers || 1;
    const ratio = Math.min(hex.workers / maxW, 1);
    result.food += Math.floor(bDef.foodBonus * ratio);
    result.materials += Math.floor(bDef.materialBonus * ratio);
    // Fresh water bonus for specific buildings (e.g. farms near river/lake)
    if (hexHasFreshWater(hex) && bDef.riverFoodBonus) {
      result.food += Math.floor(bDef.riverFoodBonus * ratio);
    }
  }

  return result;
}

// Calculate total income and resource consumption
export function calculateIncome() {
  let foodIncome = 0, matIncome = 0, laborUsed = 0, constructionWorkers = 0;

  for (let r = 0; r < window.MAP_ROWS; r++) for (let c = 0; c < window.MAP_COLS; c++) {
    if (!isInTerritory(c, r)) continue;
    const hex = window.gameState.map[r][c];
    const y = getHexYield(hex);
    foodIncome += y.food;
    matIncome += y.materials;
    laborUsed += hex.workers;
    if (hex.building && hex.buildProgress > 0) constructionWorkers += hex.workers;
  }

  // Count unit population as labor used
  const unitLaborUsed = window.gameState.units.reduce((total, unit) => {
    return total + window.UNIT_TYPES[unit.type].cost.population;
  }, 0);

  // Count units in training (they consume double food like construction workers)
  const unitsInTraining = window.gameState.unitsInTraining.reduce((total, training) => {
    return total + window.UNIT_TYPES[training.type].cost.population;
  }, 0);

  const totalChildren = getTotalChildren();
  const foodConsumed = window.gameState.population.total * FOOD_PER_POP + totalChildren * FOOD_PER_CHILD + constructionWorkers * FOOD_PER_POP + unitsInTraining * FOOD_PER_POP; // builders and trainees eat double

  return {
    foodIncome,
    matIncome,
    laborUsed: laborUsed + unitLaborUsed,
    constructionWorkers,
    unitsInTraining,
    foodConsumed,
    netFood: foodIncome - foodConsumed,
    netMat: matIncome
  };
}

// Ensure workers don't exceed population (after starvation/emigration)
export function clampWorkers() {
  let totalAssigned = 0;
  const workedHexes = [];
  for (let r = 0; r < window.MAP_ROWS; r++) for (let c = 0; c < window.MAP_COLS; c++) {
    const hex = window.gameState.map[r][c];
    if (hex.workers > 0) { totalAssigned += hex.workers; workedHexes.push(hex); }
  }
  // Remove workers from end of list until within population
  while (totalAssigned > window.gameState.population.total && workedHexes.length > 0) {
    const hex = workedHexes[workedHexes.length - 1];
    const remove = Math.min(hex.workers, totalAssigned - window.gameState.population.total);
    hex.workers -= remove;
    totalAssigned -= remove;
    if (hex.workers <= 0) workedHexes.pop();
  }
}

// Worker assignment
export function assignWorker(col, row) {
  const hex = window.gameState.map[row][col];
  const max = getMaxWorkers(hex);
  if (hex.workers >= max) return;
  if (window.gameState.population.idle <= 0) return;
  hex.workers++;
  window.gameState.population.employed++;
  window.gameState.population.idle--;
  window.mapDirty = true;
  updateAllUI();
  window.updateSidePanel(hex);
  window.render();
}

export function unassignWorker(col, row) {
  const hex = window.gameState.map[row][col];
  if (hex.workers <= 0) return;
  hex.workers--;
  window.gameState.population.employed--;
  window.gameState.population.idle++;
  window.mapDirty = true;
  updateAllUI();
  window.updateSidePanel(hex);
  window.render();
}

// ---- HELPER FUNCTIONS ----

// Check if hex has fresh water access (river OR adjacent to lake)
export function hexHasFreshWater(hex) {
  return hex.hasRiver || hexAdjacentToLake(hex);
}

// Check if hex is adjacent to lake
export function hexAdjacentToLake(hex) {
  for (let e = 0; e < 6; e++) {
    const nb = window.hexNeighbor(hex.col, hex.row, e);
    if (nb.col >= 0 && nb.col < window.MAP_COLS && nb.row >= 0 && nb.row < window.MAP_ROWS) {
      if (window.gameState.map[nb.row][nb.col].terrain === 'lake') return true;
    }
  }
  return false;
}

// Get total children count for food calculations
export function getTotalChildren() {
  return window.gameState.childCohorts
    .filter(cohort => cohort.age < WORKING_AGE)
    .reduce((sum, cohort) => sum + cohort.count, 0);
}

// Update all resource UI displays
export function updateAllUI() {
  const inc = calculateIncome();

  // Calculate winter penalty for display
  const isWinter = window.SEASONS[window.gameState.season] === 'Winter';
  const winterCost = isWinter ? Math.ceil(window.gameState.population.total * 0.5) : 0;
  const effectiveNetFood = inc.netFood - winterCost;

  document.getElementById('res-food').textContent = window.gameState.resources.food;
  document.getElementById('res-materials').textContent = window.gameState.resources.materials;
  document.getElementById('res-pop').textContent = window.gameState.population.total + getTotalChildren();
  document.getElementById('res-knowledge').textContent = window.gameState.resources.knowledge;

  // Deltas — show effective net including winter
  const df = document.getElementById('delta-food');
  df.textContent = effectiveNetFood >= 0 ? `+${effectiveNetFood}` : `${effectiveNetFood}`;
  df.className = `delta ${effectiveNetFood > 0 ? 'delta-pos' : effectiveNetFood < 0 ? 'delta-neg' : 'delta-zero'}`;
  const dm = document.getElementById('delta-materials');
  dm.textContent = inc.netMat >= 0 ? `+${inc.netMat}` : `${inc.netMat}`;
  dm.className = `delta ${inc.netMat > 0 ? 'delta-pos' : inc.netMat < 0 ? 'delta-neg' : 'delta-zero'}`;
}

// ---- WORKFORCE MANAGEMENT UI ----

// Get workforce groups for UI display
export function getWorkforceGroups() {
  const groups = new Map(); // key → { icon, name, terrain, hexes[], workers, maxWorkers, food, mat, isConstruction }

  for (let r = 0; r < window.MAP_ROWS; r++) for (let c = 0; c < window.MAP_COLS; c++) {
    if (!isInTerritory(c, r)) continue;
    const hex = window.gameState.map[r][c];
    const maxW = getMaxWorkers(hex);

    let key, icon, name, isConstruction = false;

    if (hex.building === 'settlement') continue; // skip settlements

    if (hex.building && hex.buildProgress > 0) {
      const bDef = window.BUILDINGS[hex.building];
      key = `build:${hex.building}:${hex.terrain}`;
      icon = '🔨';
      name = `${bDef.name} (building)`;
      isConstruction = true;
    } else if (hex.building && hex.buildProgress <= 0) {
      const bDef = window.BUILDINGS[hex.building];
      key = `${hex.building}:${hex.terrain}`;
      icon = bDef.icon;
      name = bDef.name;
    } else {
      key = `gather:${hex.terrain}`;
      icon = window.TERRAIN[hex.terrain]?.icon || '🌿';
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
      const y = getHexYield(hex);
      g.food += y.food;
      g.mat += y.materials;
    }
  }

  // Sort: construction first, then buildings, then gatherers
  return [...groups.values()].sort((a, b) => {
    if (a.isConstruction !== b.isConstruction) return a.isConstruction ? -1 : 1;
    const aGather = a.key.startsWith('gather:');
    const bGather = b.key.startsWith('gather:');
    if (aGather !== bGather) return aGather ? 1 : -1;
    return a.name.localeCompare(b.name);
  });
}

// Render workers tab in workforce overlay
export function renderWorkersTab() {
  const groups = getWorkforceGroups();
  const pop = window.gameState.population;

  document.getElementById('wf-summary').innerHTML =
    `Population: <strong>${pop.total}</strong> · ` +
    `Working: <strong>${pop.employed}</strong> · ` +
    `Idle: <strong style="color:${pop.idle > 5 ? '#ccaa44' : 'var(--text-light)'}">${pop.idle}</strong>`;

  const construction = groups.filter(g => g.isConstruction);
  const improved = groups.filter(g => !g.isConstruction && !g.key.startsWith('gather:'));
  const unimproved = groups.filter(g => g.key.startsWith('gather:'));

  function renderGroup(g) {
    const canAdd = g.workers < g.maxWorkers && window.gameState.population.idle > 0;
    const canRemove = g.workers > 0;

    let yieldStr;
    if (g.isConstruction) {
      yieldStr = g.workers > 0
        ? `<span class="wf-yield" style="color:var(--text-gold)">Building... (🍖×2 rations)</span>`
        : `<span class="wf-yield stalled">Stalled — assign builders</span>`;
    } else if (g.food || g.mat) {
      yieldStr = `<span class="wf-yield">${g.food ? '🌾' + g.food : ''}${g.food && g.mat ? ' ' : ''}${g.mat ? '🪵' + g.mat : ''}</span>`;
    } else {
      yieldStr = `<span class="wf-yield stalled">No workers assigned</span>`;
    }

    const hexCount = g.hexes.length;
    const terrainName = window.TERRAIN[g.terrain]?.name || g.terrain;

    return `<div class="wf-group">
      <div class="wf-group-header">
        <span class="wf-group-icon">${g.icon}</span>
        <span class="wf-group-name">${g.name}</span>
        <span class="wf-group-count">×${hexCount} on ${terrainName}</span>
      </div>
      <div class="wf-group-body">
        ${yieldStr}
        <div class="wf-workers">
          <button class="wf-btn" ${canRemove ? '' : 'disabled'} onclick="wfRemoveWorker('${g.key}')">−</button>
          <span class="wf-worker-count">${g.workers} / ${g.maxWorkers}</span>
          <button class="wf-btn" ${canAdd ? '' : 'disabled'} onclick="wfAddWorker('${g.key}')">+</button>
        </div>
      </div>
    </div>`;
  }

  function renderSection(title, items, emptyHint) {
    let html = `<div class="wf-section"><div class="wf-section-header">${title}</div>`;
    if (items.length === 0) {
      html += `<div class="wf-empty-hint">${emptyHint}</div>`;
    } else {
      for (const g of items) html += renderGroup(g);
    }
    html += `</div>`;
    return html;
  }

  let html = '';
  html += renderSection('🔨 Construction', construction, 'No active builds.');
  html += renderSection('🏠 Improved', improved, 'No buildings yet.');
  html += renderSection('🌿 Unimproved', unimproved, 'No gatherable tiles.');

  document.getElementById('wf-groups').innerHTML = html;
}

// Add worker to workforce group
export function wfAddWorker(groupKey) {
  // Find first hex in this group with a free slot
  const groups = getWorkforceGroups();
  const g = groups.find(g => g.key === groupKey);
  if (!g || window.gameState.population.idle <= 0) return;

  for (const hex of g.hexes) {
    const max = getMaxWorkers(hex);
    if (hex.workers < max) {
      hex.workers++;
      window.gameState.population.employed++;
      window.gameState.population.idle--;
      window.mapDirty = true;
      updateAllUI();
      if (window.workforceActiveTab === 'workers') renderWorkersTab();
      if (window.gameState.selectedHex) window.updateSidePanel(window.gameState.selectedHex);
      window.render();
      return;
    }
  }
}

// Remove worker from workforce group
export function wfRemoveWorker(groupKey) {
  const groups = getWorkforceGroups();
  const g = groups.find(g => g.key === groupKey);
  if (!g) return;

  // Remove from last hex that has workers
  for (let i = g.hexes.length - 1; i >= 0; i--) {
    if (g.hexes[i].workers > 0) {
      g.hexes[i].workers--;
      window.gameState.population.employed--;
      window.gameState.population.idle++;
      window.mapDirty = true;
      updateAllUI();
      if (window.workforceActiveTab === 'workers') renderWorkersTab();
      if (window.gameState.selectedHex) window.updateSidePanel(window.gameState.selectedHex);
      window.render();
      return;
    }
  }
}

// Open workforce overlay
export function openWorkforceOverlay() {
  window.renderWorkforceOverlay();
  document.getElementById('workforce-overlay').classList.add('visible');
}

// Export constants for external access
export { FOOD_PER_POP, FOOD_PER_CHILD, WORKING_AGE };
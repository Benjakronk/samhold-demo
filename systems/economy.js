// =====================================
// ECONOMY/WORKER SYSTEM
// =====================================
// Complete economy and worker management system for Samhold game
// Handles worker assignment, resource gathering, building operations, and workforce UI

// ---- CONSTANTS ----
// FOOD_PER_POP and FOOD_PER_CHILD are read from window.* so dev panel changes take effect immediately
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
    if (hex.buildProgress > 0) return bDef.buildWorkers || bDef.maxWorkers || 0; // construction workers
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

  // Society buildings produce no terrain yield — their output is cohesion, handled separately
  if (hex.building) {
    const bDef = window.BUILDINGS[hex.building];
    if (bDef?.isSocietyBuilding) return result;
  }

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
  let foodIncome = 0, matIncome = 0, matUpkeep = 0, laborUsed = 0, constructionWorkers = 0;

  for (let r = 0; r < window.MAP_ROWS; r++) for (let c = 0; c < window.MAP_COLS; c++) {
    if (!isInTerritory(c, r)) continue;
    const hex = window.gameState.map[r][c];
    const y = getHexYield(hex);
    foodIncome += y.food;
    matIncome += y.materials;
    laborUsed += hex.workers;
    if (hex.building && hex.buildProgress > 0) constructionWorkers += hex.workers;

    // Per-turn material upkeep for buildings that require it
    if (hex.building && hex.buildProgress <= 0) {
      const bDef = window.BUILDINGS[hex.building];
      if (bDef?.upkeepMaterials) {
        if (bDef.maxWorkers === 0) {
          // Worker-free buildings (monument): flat upkeep per building
          matUpkeep += bDef.upkeepMaterials;
        } else if (hex.workers > 0) {
          // Worker-staffed buildings: upkeep scales with workers
          // Steward tending a sacred site waives its upkeep
          const stewardWaiving = hex.building === 'sacred_site' &&
            (window.gameState?.units || []).some(u =>
              u.type === 'steward' && u.col === c && u.row === r && u.activeAction === 'tending_sacred_site'
            );
          if (!stewardWaiving) matUpkeep += bDef.upkeepMaterials * hex.workers;
        }
      }
    }
  }

  // Count fortification construction workers
  for (const fort of Object.values(window.gameState.fortifications || {})) {
    if (fort.buildProgress > 0 && fort.workers > 0) {
      laborUsed += fort.workers;
      constructionWorkers += fort.workers; // builders eat double food
    }
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
  const foodPerPop = (window.FOOD_PER_POP != null) ? window.FOOD_PER_POP : 2;
  const foodPerChild = (window.FOOD_PER_CHILD != null) ? window.FOOD_PER_CHILD : 1;
  const foodPerElder = (window.FOOD_PER_ELDER != null) ? window.FOOD_PER_ELDER : 1;

  // Civilian population excludes people currently serving as units
  // (their food is handled entirely in processUnitUpkeep so priority ordering works correctly)
  const unitPopulation = window.gameState.units.reduce((sum, u) => sum + window.UNIT_TYPES[u.type].cost.population, 0);
  const civilianPop = Math.max(0, window.gameState.population.total - unitPopulation);
  const elderCount = window.gameState.population.elders || 0;
  const workingAdults = Math.max(0, civilianPop - elderCount);
  // Immigrant food consumption (pipeline cohorts + PS adults + PS children)
  const immigrantFood = window.getImmigrantFoodConsumption ? window.getImmigrantFoodConsumption() : 0;

  const popFoodConsumed = workingAdults * foodPerPop + elderCount * foodPerElder + totalChildren * foodPerChild + constructionWorkers * foodPerPop + unitsInTraining * foodPerPop + immigrantFood;

  // Unit food = their population share (foodPerPop) + unit-specific upkeep
  const unitFoodUpkeep = window.gameState.units.reduce((total, unit) => {
    const unitType = window.UNIT_TYPES[unit.type];
    const upkeep = (unitType?.upkeep?.food || 0) + (unitType?.cost?.population || 0) * foodPerPop;
    return total + upkeep;
  }, 0);

  // Immigrant workforce contributes to production (they can't be assigned to hexes,
  // but provide general labor — gathering, hauling, assisting)
  const immigrantLabor = window.getImmigrantWorkforce ? window.getImmigrantWorkforce() : 0;
  const immigrantFoodBonus = Math.floor(immigrantLabor * 0.5);
  const immigrantMatBonus = Math.floor(immigrantLabor * 0.2);
  foodIncome += immigrantFoodBonus;
  matIncome += immigrantMatBonus;

  const foodConsumed = popFoodConsumed + unitFoodUpkeep;

  return {
    foodIncome,
    matIncome,
    immigrantLabor,
    immigrantFoodBonus,
    immigrantMatBonus,
    matUpkeep,
    laborUsed: laborUsed + unitLaborUsed,
    constructionWorkers,
    unitsInTraining,
    popFoodConsumed,
    unitFoodUpkeep,
    foodConsumed,
    netFood: foodIncome - foodConsumed, // total net for UI display only
    netMat: matIncome - matUpkeep
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
  if (window.setMapDirty) window.setMapDirty(true);
  if (window.updateAllUI) window.updateAllUI();
  if (window.updateSidePanel) window.updateSidePanel(hex);
  // Watchtower staffing affects vision
  if (hex.building === 'watchtower' && window.recomputeVisibility) window.recomputeVisibility();
  if (window.render) window.render();
}

export function unassignWorker(col, row) {
  const hex = window.gameState.map[row][col];
  if (hex.workers <= 0) return;
  hex.workers--;
  window.gameState.population.employed--;
  window.gameState.population.idle++;
  if (window.setMapDirty) window.setMapDirty(true);
  if (window.updateAllUI) window.updateAllUI();
  if (window.updateSidePanel) window.updateSidePanel(hex);
  // Watchtower staffing affects vision
  if (hex.building === 'watchtower' && window.recomputeVisibility) window.recomputeVisibility();
  if (window.render) window.render();
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
  console.log('Rendering workforce groups UI');
  const groups = getWorkforceGroups();
  const pop = window.gameState.population;

  const storytellers = window.gameState.culture?.storytellers ?? 0;
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
      // Check if this is a society building with cohesion yields
      const sampleHex = g.hexes[0];
      const bDef = sampleHex?.building ? window.BUILDINGS[sampleHex.building] : null;
      if (bDef?.isSocietyBuilding && g.workers > 0) {
        const parts = [];
        if (bDef.bondsYield) parts.push(`💗 Bonds`);
        if (bDef.identityYield) parts.push(`🪶 Identity`);
        if (bDef.satisfactionYield) parts.push(`😊 Satisfaction`);
        if (bDef.legitimacyYield) parts.push(`🏛️ Legitimacy`);
        yieldStr = `<span class="wf-yield">${parts.join(' · ')}</span>`;
      } else if (bDef?.isSocietyBuilding && bDef.maxWorkers === 0) {
        yieldStr = `<span class="wf-yield">🗿 Permanent effect</span>`;
      } else {
        yieldStr = `<span class="wf-yield stalled">No workers assigned</span>`;
      }
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

  // Cultural Roles section — storytellers
  const storyCapacity = storytellers * 4;
  const canAddStoryteller = pop.idle > 0;
  const canRemoveStoryteller = storytellers > 0;
  const storyCount = window.gameState.culture?.stories?.length ?? 0;
  const storytellerSection = `<div class="wf-section">
    <div class="wf-section-header">🎙️ Cultural Roles</div>
    <div class="wf-group">
      <div class="wf-group-header">
        <span class="wf-group-icon">📖</span>
        <span class="wf-group-name">Storytellers</span>
        <span class="wf-group-count">${storyCount} stor${storyCount !== 1 ? 'ies' : 'y'} preserved · capacity ${storyCapacity}</span>
      </div>
      <div class="wf-group-body">
        <span class="wf-yield">${storyCount > 0 ? `Identity +${storyCount} (from oral tradition)` : 'No stories yet — assign storytellers to begin'}</span>
        <div class="wf-workers">
          <button class="wf-btn" ${canRemoveStoryteller ? '' : 'disabled'} onclick="removeStoryteller()">−</button>
          <span class="wf-worker-count">${storytellers}</span>
          <button class="wf-btn" ${canAddStoryteller ? '' : 'disabled'} onclick="addStoryteller()">+</button>
        </div>
      </div>
    </div>
  </div>`;

  let html = storytellerSection;
  html += renderSection('🔨 Construction', construction, 'No active builds.');
  html += renderSection('🏠 Improved', improved, 'No buildings yet.');
  html += renderSection('🌿 Unimproved', unimproved, 'No gatherable tiles.');

  document.getElementById('wf-groups').innerHTML = html;

  // Also refresh build tab if its container exists in the DOM
  if (document.getElementById('wf-build')) renderBuildSection();
}

// ---- QUICK-BUILD SECTION ----

function hexAdjacentToWater(hex) {
  for (let e = 0; e < 6; e++) {
    const nb = window.hexNeighbor(hex.col, hex.row, e);
    if (nb.col >= 0 && nb.col < window.MAP_COLS && nb.row >= 0 && nb.row < window.MAP_ROWS) {
      const t = window.gameState.map[nb.row][nb.col].terrain;
      if (t === 'coast' || t === 'ocean' || t === 'lake') return true;
    }
  }
  return false;
}

function isValidHexForBuilding(hex, buildingKey) {
  const bDef = window.BUILDINGS[buildingKey];
  if (!bDef || bDef.onlyStart) return false;
  if (hex.building) return false;
  if (!window.gameState.territory.has(`${hex.col},${hex.row}`)) return false;

  const terrainValid = bDef.validTerrain.includes(hex.terrain);
  const riverValid = bDef.validOnRiver && hex.hasRiver;
  const waterAdjValid = bDef.requiresAdjacentWater && terrainValid && hexAdjacentToWater(hex);

  if (!terrainValid && !riverValid) return false;
  if (bDef.requiresAdjacentWater && !waterAdjValid && !riverValid) return false;
  return true;
}

function scoreHexForBuilding(hex, buildingKey) {
  const bDef = window.BUILDINGS[buildingKey];
  const terrain = window.TERRAIN[hex.terrain];
  const freshWater = hexHasFreshWater(hex);
  let score = (terrain.food || 0) + (terrain.materials || 0);
  if (freshWater) score += 1;
  score += (bDef.foodBonus || 0) + (bDef.materialBonus || 0);
  if (freshWater && bDef.riverFoodBonus) score += bDef.riverFoodBonus;
  return score;
}

export function findValidHexesForBuilding(buildingKey) {
  const valid = [];
  for (let r = 0; r < window.MAP_ROWS; r++) {
    for (let c = 0; c < window.MAP_COLS; c++) {
      const hex = window.gameState.map[r][c];
      if (isValidHexForBuilding(hex, buildingKey)) valid.push(hex);
    }
  }
  valid.sort((a, b) => scoreHexForBuilding(b, buildingKey) - scoreHexForBuilding(a, buildingKey));
  return valid;
}

export function wfInitiateBuild(buildingKey) {
  const bDef = window.BUILDINGS[buildingKey];
  if (!bDef) return;

  const validHexes = findValidHexesForBuilding(buildingKey);
  if (validHexes.length === 0) return;

  // Meeting hall: filter to hexes without existing MH in that settlement
  let filtered = validHexes;
  if (buildingKey === 'meeting_hall' && window.hasSettlementMeetingHall) {
    filtered = validHexes.filter(h => !window.hasSettlementMeetingHall(h.col, h.row));
    if (filtered.length === 0) return;
  }

  const bestHex = filtered[0];
  const canAfford = window.gameState.resources.materials >= bDef.cost.materials;
  if (!canAfford) return;

  let yieldStr;
  if (bDef.isSocietyBuilding) {
    // Cohesion yields
    const parts = [];
    if (bDef.identityYield) parts.push(`🪶+${(bDef.identityYield * bDef.maxWorkers).toFixed(2)} Identity`);
    if (bDef.satisfactionYield) parts.push(`😊+${(bDef.satisfactionYield * bDef.maxWorkers).toFixed(2)} Satisfaction`);
    if (bDef.legitimacyYield) parts.push(`🏛️+${(bDef.legitimacyYield * bDef.maxWorkers).toFixed(2)} Legitimacy`);
    if (bDef.bondsYield) parts.push(`💗+${(bDef.bondsYield * bDef.maxWorkers).toFixed(2)} Bonds`);
    const upkeepStr = bDef.upkeepMaterials ? ` · 🪵−${bDef.upkeepMaterials * bDef.maxWorkers}/turn upkeep` : '';
    yieldStr = parts.join(' · ') + upkeepStr;
  } else {
    const freshWater = hexHasFreshWater(bestHex);
    const maxFood = (bDef.foodBonus || 0) + (freshWater ? 1 : 0) + (freshWater && bDef.riverFoodBonus ? bDef.riverFoodBonus : 0);
    const maxMat = bDef.materialBonus || 0;
    yieldStr = [maxFood ? `🌾+${maxFood}` : '', maxMat ? `🪵+${maxMat}` : ''].filter(Boolean).join(' ');
  }

  window.showConfirmDialogNonDestructive(
    `Build ${bDef.name}`,
    `<p>Start construction of a <strong>${bDef.name}</strong> at the best available site (${bestHex.col},${bestHex.row})?</p>
     <p><strong>Cost:</strong> 🪵${bDef.cost.materials} materials · <strong>Time:</strong> ${bDef.buildTurns} turns</p>
     ${yieldStr ? `<p><strong>Max yield:</strong> ${yieldStr} (at full workers)</p>` : ''}
     <p><em>${filtered.length} valid site${filtered.length !== 1 ? 's' : ''} available</em></p>`,
    'Build',
    'Cancel',
    () => {
      window.placeBuilding(bestHex.col, bestHex.row, buildingKey);
      if (window.updateAllUI) window.updateAllUI();
      if (window.renderWorkersTab) window.renderWorkersTab();
      if (window.render) window.render();
    }
  );
}

function renderBuildSection() {
  const container = document.getElementById('wf-build');
  if (!container) return;

  const materials = window.gameState.resources.materials;
  let html = `<div class="wf-section-header">🏗️ Start Construction</div>`;
  let anyAvailable = false;

  for (const [key, bDef] of Object.entries(window.BUILDINGS)) {
    if (bDef.onlyStart) continue;
    // Sacred site and monument use custom side-panel dialogs — skip in workforce build tab
    if (key === 'sacred_site' || key === 'monument') continue;
    const validHexes = findValidHexesForBuilding(key);
    let count = validHexes.length;
    const canAfford = materials >= bDef.cost.materials;

    // Meeting hall: check 1-per-settlement limit (filter valid hexes to those without existing MH)
    let extraReason = '';
    if (key === 'meeting_hall' && count > 0 && window.hasSettlementMeetingHall) {
      const filteredHexes = validHexes.filter(h => !window.hasSettlementMeetingHall(h.col, h.row));
      count = filteredHexes.length;
      if (count === 0) extraReason = 'Already have one per settlement';
    }

    const enabled = count > 0 && canAfford;
    if (count > 0) anyAvailable = true;

    const reason = extraReason || (count === 0 ? 'No suitable terrain' : !canAfford ? `Need 🪵${bDef.cost.materials}` : '');

    html += `<button class="wf-build-btn${enabled ? '' : ' disabled'}"
      ${enabled ? `onclick="wfInitiateBuild('${key}')"` : 'disabled'}>
      <span class="wf-build-icon">${bDef.icon}</span>
      <span class="wf-build-info">
        <span class="wf-build-name">${bDef.name}</span>
        <span class="wf-build-meta">🪵${bDef.cost.materials} · ${bDef.buildTurns} turns · ${count} site${count !== 1 ? 's' : ''}</span>
        ${reason ? `<span class="wf-build-reason">${reason}</span>` : ''}
      </span>
    </button>`;
  }

  if (!anyAvailable) {
    html += `<div class="wf-empty-hint">No unimproved terrain available for construction.</div>`;
  }

  container.innerHTML = html;
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
      if (window.setMapDirty) window.setMapDirty(true);
      if (window.updateAllUI) window.updateAllUI();
      if (getActiveWorkforceTab() === 'workers' && window.renderWorkersTab) window.renderWorkersTab();
      if (window.gameState.selectedHex && window.updateSidePanel) window.updateSidePanel(window.gameState.selectedHex);
      if (window.render) window.render();
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
      if (window.setMapDirty) window.setMapDirty(true);
      if (window.updateAllUI) window.updateAllUI();
      if (getActiveWorkforceTab() === 'workers' && window.renderWorkersTab) window.renderWorkersTab();
      if (window.gameState.selectedHex && window.updateSidePanel) window.updateSidePanel(window.gameState.selectedHex);
      if (window.render) window.render();
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
export { WORKING_AGE };
// Territory & Settlement System for Samhold
// Handles territory calculation, fog of war, settlement founding, naming, and health
// Extracted from main game file for modular architecture

let gameState = null;

function initTerritory(gameStateRef) {
  gameState = gameStateRef;
}

function hexHasRiver(hex) {
  return hex.hasRiver;
}

function revealArea(cc, cr, radius) {
  for (let r = 0; r < window.MAP_ROWS; r++) {
    for (let c = 0; c < window.MAP_COLS; c++) {
      if (window.cubeDistance(window.offsetToCube(c, r), window.offsetToCube(cc, cr)) <= radius) {
        gameState.map[r][c].revealed = true;
        // Also update visibilityMap if it exists
        if (gameState.visibilityMap && gameState.visibilityMap[r]) {
          if (gameState.visibilityMap[r][c] < 2) gameState.visibilityMap[r][c] = 2;
        }
      }
    }
  }
  if (window.setMapDirty) window.setMapDirty(true);
}

// Recompute the 3-tier visibility map each turn or after unit movement.
// 0 = unexplored (never seen), 1 = revealed (seen before, dimmed), 2 = visible (active sight)
function recomputeVisibility() {
  if (!gameState.visibilityMap || !gameState.visibilityMap.length) return;

  // Skip recomputation if fog of war is disabled — everything stays at 2
  if (window.isFogOfWarDisabled && window.isFogOfWarDisabled()) return;

  const ROWS = window.MAP_ROWS;
  const COLS = window.MAP_COLS;

  // Step 1: Downgrade all visible (2) to revealed (1). Leave unexplored (0) as-is.
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (gameState.visibilityMap[r][c] === 2) {
        gameState.visibilityMap[r][c] = 1;
      }
    }
  }

  // Helper: mark hexes within radius as visible (2)
  function markVisible(centerCol, centerRow, radius) {
    const centerCube = window.offsetToCube(centerCol, centerRow);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (window.cubeDistance(window.offsetToCube(c, r), centerCube) <= radius) {
          gameState.visibilityMap[r][c] = 2;
        }
      }
    }
  }

  // Step 2a: Friendly units — each provides vision based on their type
  for (const unit of gameState.units) {
    const unitType = window.UNIT_TYPES[unit.type];
    const visionRadius = unitType?.vision ?? 1;
    markVisible(unit.col, unit.row, visionRadius);
  }

  // Step 2b: Territory hexes — mark each territory hex and 1 hex beyond it visible.
  // Iterating all territory hexes (not just settlement center) means vision correctly
  // follows territory shape, including future expansions.
  for (const key of gameState.territory) {
    const [tc, tr] = key.split(',').map(Number);
    markVisible(tc, tr, 1);
  }

  // Step 2c: Completed, staffed watchtowers — use building def's visionRadius
  const BUILDINGS = window.BUILDINGS;
  if (BUILDINGS?.watchtower) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const hex = gameState.map[r][c];
        if (hex.building === 'watchtower' && hex.buildProgress <= 0 && hex.workers > 0) {
          markVisible(c, r, BUILDINGS.watchtower.visionRadius);
        }
      }
    }
  }

  // Step 3: Sync hex.revealed for backward compat (anything >= 1 should be revealed)
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (gameState.visibilityMap[r][c] >= 1) {
        gameState.map[r][c].revealed = true;
      }
    }
  }

  if (window.setMapDirty) window.setMapDirty(true);
}

// ---- TERRITORY MODEL ----
// Territory is built from: settlement core hexes (radius) + claimed hexes (persistent Set)

function recalcTerritory() {
  gameState.territory.clear();
  // 1. Settlement core hexes — based on each settlement's coreRadius
  for (const s of gameState.settlements) {
    const radius = s.coreRadius ?? window.STARTING_SETTLEMENT_RADIUS ?? 2;
    for (let r = 0; r < window.MAP_ROWS; r++) {
      for (let c = 0; c < window.MAP_COLS; c++) {
        if (window.cubeDistance(window.offsetToCube(c, r), window.offsetToCube(s.col, s.row)) <= radius) {
          gameState.territory.add(`${c},${r}`);
        }
      }
    }
  }
  // 2. Claimed hexes — from cultural growth + hex purchases
  if (gameState.claimedHexes) {
    for (const key of gameState.claimedHexes) {
      gameState.territory.add(key);
    }
  }
}

// Returns the nearest settlement to a given hex
function getSettlementForHex(col, row) {
  let nearest = null;
  let bestDist = Infinity;
  for (const s of gameState.settlements) {
    const d = window.cubeDistance(window.offsetToCube(col, row), window.offsetToCube(s.col, s.row));
    if (d < bestDist) {
      bestDist = d;
      nearest = s;
    }
  }
  return nearest;
}

// Returns the index of the nearest settlement
function getSettlementIndexForHex(col, row) {
  let bestIdx = -1;
  let bestDist = Infinity;
  for (let i = 0; i < gameState.settlements.length; i++) {
    const s = gameState.settlements[i];
    const d = window.cubeDistance(window.offsetToCube(col, row), window.offsetToCube(s.col, s.row));
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return bestIdx;
}

// Check if a hex is a claimed hex (not part of settlement core territory)
function isClaimedHex(col, row) {
  if (!gameState.claimedHexes) return false;
  return gameState.claimedHexes.has(`${col},${row}`);
}

// Check if a hex is core settlement territory (within a settlement's coreRadius)
function isCoreHex(col, row) {
  for (const s of gameState.settlements) {
    const radius = s.coreRadius ?? window.STARTING_SETTLEMENT_RADIUS ?? 2;
    if (window.cubeDistance(window.offsetToCube(col, row), window.offsetToCube(s.col, s.row)) <= radius) {
      return true;
    }
  }
  return false;
}

// ---- SETTLEMENT FOUNDING ----

const MIN_SETTLEMENT_DISTANCE = 4;

function canFoundSettlement(col, row) {
  const hex = gameState.map[row][col];

  if (hex.terrain === 'ocean' || hex.terrain === 'lake' || hex.terrain === 'mountain') {
    return false;
  }

  if (gameState.settlements.some(s => s.col === col && s.row === row)) {
    return false;
  }

  for (const settlement of gameState.settlements) {
    const distance = window.cubeDistance(
      window.offsetToCube(col, row),
      window.offsetToCube(settlement.col, settlement.row)
    );
    if (distance < MIN_SETTLEMENT_DISTANCE) {
      return false;
    }
  }

  if (window.isInTerritory(col, row)) {
    return false;
  }

  return true;
}

function foundSettlement(col, row, name, settlerUnitId) {
  if (!canFoundSettlement(col, row)) {
    return false;
  }

  // Find the settler by explicit ID (preferred) or fall back to selectedUnit
  const settlerIndex = settlerUnitId != null
    ? gameState.units.findIndex(u => u.id === settlerUnitId)
    : gameState.selectedUnit
      ? gameState.units.findIndex(u => u.id === gameState.selectedUnit.id)
      : -1;

  if (settlerIndex >= 0) {
    const unitType = window.UNIT_TYPES[gameState.units[settlerIndex].type];
    gameState.units.splice(settlerIndex, 1);
    gameState.population.employed -= unitType.cost.population;
  }
  window.deselectUnit();

  const newRadius = window.NEW_SETTLEMENT_RADIUS ?? 1;
  gameState.map[row][col].building = 'settlement';
  gameState.map[row][col].buildProgress = 0;
  gameState.settlements.push({
    col, row,
    name: name || null,
    coreRadius: newRadius,
    culturalStrength: 0,
    health: 100,
    maxHealth: 100
  });

  recalcTerritory();

  gameState.cohesion.satisfaction = Math.min(100, gameState.cohesion.satisfaction + 10);
  gameState.cohesion.legitimacy = Math.min(100, gameState.cohesion.legitimacy + 5);
  gameState.cohesion.bonds = Math.max(0, gameState.cohesion.bonds - 8);

  // Naming grants Identity +1
  if (name) {
    gameState.cohesion.identity = Math.min(100, gameState.cohesion.identity + 1);
  }

  if (window.addChronicleEntry) {
    const nameStr = name ? `"${name}"` : 'a new settlement';
    window.addChronicleEntry(`Our people founded ${nameStr}, establishing a new home in the wilderness.`, 'founding');
  }

  if (window.recomputeVisibility) window.recomputeVisibility();
  if (window.setMapDirty) window.setMapDirty(true);
  return true;
}

function showSettlementFoundingConfirmation(col, row, settlerUnitId) {
  const hex = gameState.map[row][col];
  const terrain = window.TERRAIN[hex.terrain];

  window.showConfirmDialogNonDestructive(
    'Found Settlement',
    `<p>Found a new settlement on this ${terrain.name} hex?</p>
     <p>This will consume your Settler and create a new territory center.</p>
     <div class="tradition-customize">
       <div class="tradition-customize-row">
         <label class="tradition-customize-label" for="settlement-name-input">Name:</label>
         <input id="settlement-name-input" class="tradition-name-input" value="" placeholder="Name your settlement..." maxlength="30" />
       </div>
     </div>
     <p><strong>Effects:</strong></p>
     <p>+10 Satisfaction (excitement of expansion)<br>
     +5 Legitimacy (shows leadership strength)<br>
     -8 Bonds (physical separation weakens bonds)<br>
     +1 Identity (if named)</p>`,
    'Found',
    'Cancel',
    () => {
      const name = document.getElementById('settlement-name-input')?.value.trim() || null;
      if (foundSettlement(col, row, name, settlerUnitId)) {
        window.updateSidePanel(hex);
        if (window.render) window.render();
      }
    },
    { noBackdropDismiss: true }
  );
}

// ---- SETTLEMENT NAMING ----

function showSettlementNamingDialog(settlementIndex, callback) {
  const settlement = gameState.settlements[settlementIndex];
  if (!settlement) return;

  const isRename = !!settlement.name;
  const bonusNote = isRename ? '' : '<p><em>Naming a settlement grants Identity +1.</em></p>';

  window.showConfirmDialogNonDestructive(
    isRename ? 'Rename Settlement' : 'Name Your Settlement',
    `${bonusNote}
     <div class="tradition-customize">
       <div class="tradition-customize-row">
         <label class="tradition-customize-label" for="settlement-name-input">Name:</label>
         <input id="settlement-name-input" class="tradition-name-input" value="${settlement.name || ''}" placeholder="Enter a name..." maxlength="30" />
       </div>
     </div>`,
    isRename ? 'Rename' : 'Name',
    isRename ? 'Cancel' : 'Skip',
    () => {
      const name = document.getElementById('settlement-name-input')?.value.trim();
      if (!name) {
        if (callback) callback(null);
        return;
      }
      const wasNamed = !!settlement.name;
      settlement.name = name;
      // First naming grants Identity +1
      if (!wasNamed) {
        gameState.cohesion.identity = Math.min(100, gameState.cohesion.identity + 1);
      }
      if (window.addChronicleEntry) {
        if (wasNamed) {
          window.addChronicleEntry(`Our settlement was renamed to "${name}".`, 'cultural');
        } else {
          window.addChronicleEntry(`Our people named their home "${name}", strengthening our sense of identity.`, 'cultural');
        }
      }
      if (gameState.selectedHex) window.updateSidePanel(gameState.selectedHex);
      if (window.setMapDirty) window.setMapDirty(true);
      if (window.render) window.render();
      if (callback) callback(name);
    },
    { noBackdropDismiss: true }
  );
}

// ---- SETTLEMENT HEALTH ----

function processSettlementHealth(report) {
  for (const s of gameState.settlements) {
    if (s.health === undefined) s.health = 100;
    if (s.maxHealth === undefined) s.maxHealth = 100;
    // Regenerate +2/turn when not under active attack
    if (s.health < s.maxHealth && !s._attackedThisTurn) {
      s.health = Math.min(s.maxHealth, s.health + 2);
    }
    s._attackedThisTurn = false;
  }
}

function damageSettlement(col, row, damage) {
  const s = gameState.settlements.find(s => s.col === col && s.row === row);
  if (!s) return;
  if (s.health === undefined) s.health = 100;
  s.health = Math.max(0, s.health - damage);
  s._attackedThisTurn = true;
  if (s.health <= 0) {
    const idx = gameState.settlements.indexOf(s);
    if (idx >= 0) destroySettlement(idx);
  }
}

function destroySettlement(index, report) {
  const settlement = gameState.settlements[index];
  if (!settlement) return;

  const name = settlement.name || `Settlement at (${settlement.col},${settlement.row})`;

  // Clear building on settlement hex
  const hex = gameState.map[settlement.row][settlement.col];
  if (hex.building === 'settlement') {
    hex.building = null;
    hex.buildProgress = 0;
  }

  // Clear workers/buildings on core hexes
  const radius = settlement.coreRadius ?? 2;
  for (let r = 0; r < window.MAP_ROWS; r++) {
    for (let c = 0; c < window.MAP_COLS; c++) {
      if (window.cubeDistance(window.offsetToCube(c, r), window.offsetToCube(settlement.col, settlement.row)) <= radius) {
        const h = gameState.map[r][c];
        if (h.workers > 0) {
          gameState.population.employed -= h.workers;
          gameState.population.idle += h.workers;
          h.workers = 0;
        }
      }
    }
  }

  // Remove settlement
  gameState.settlements.splice(index, 1);

  // Orphaned claimed hexes — remove claimed hexes that are no longer adjacent to any territory
  recalcTerritory();
  if (gameState.claimedHexes) {
    const orphaned = [];
    for (const key of gameState.claimedHexes) {
      if (!isAdjacentToTerritory(key, true)) {
        orphaned.push(key);
      }
    }
    for (const key of orphaned) {
      gameState.claimedHexes.delete(key);
      const [c, r] = key.split(',').map(Number);
      const h = gameState.map[r]?.[c];
      if (h && h.workers > 0) {
        gameState.population.employed -= h.workers;
        gameState.population.idle += h.workers;
        h.workers = 0;
      }
    }
    if (orphaned.length) recalcTerritory();
  }

  // Cohesion penalties
  gameState.cohesion.identity = Math.max(0, gameState.cohesion.identity - 10);
  gameState.cohesion.legitimacy = Math.max(0, gameState.cohesion.legitimacy - 15);
  gameState.cohesion.bonds = Math.max(0, gameState.cohesion.bonds - 5);
  gameState.cohesion.satisfaction = Math.max(0, gameState.cohesion.satisfaction - 10);

  if (window.addChronicleEntry) {
    window.addChronicleEntry(`${name} was destroyed. Our people mourn the loss.`, 'crisis');
  }

  if (report) {
    report.events.push(`💥 ${name} has been destroyed!`);
  }

  // Last-settlement game over is handled by checkLossConditions in victoryDefeat.js
  // (checks settlements.length === 0 each turn)

  if (window.recomputeVisibility) window.recomputeVisibility();
  if (window.setMapDirty) window.setMapDirty(true);
}

// ---- TERRITORY FORFEITING ----

function forfeitHex(col, row) {
  const key = `${col},${row}`;
  if (!gameState.claimedHexes || !gameState.claimedHexes.has(key)) return false;
  if (isCoreHex(col, row)) return false;

  // Clear workers/building
  const hex = gameState.map[row][col];
  if (hex.workers > 0) {
    gameState.population.employed -= hex.workers;
    gameState.population.idle += hex.workers;
    hex.workers = 0;
  }
  if (hex.building && hex.building !== 'settlement') {
    // Refund materials
    const bDef = window.BUILDINGS?.[hex.building];
    if (bDef) {
      gameState.resources.materials += Math.floor((bDef.cost?.materials || 0) / 2);
    }
    hex.building = null;
    hex.buildProgress = 0;
  }

  gameState.claimedHexes.delete(key);
  recalcTerritory();

  // Identity penalty
  gameState.cohesion.identity = Math.max(0, gameState.cohesion.identity - 1);

  if (window.addChronicleEntry) {
    window.addChronicleEntry('Our people abandoned a claimed territory, pulling back our borders.', 'cultural');
  }

  if (window.recomputeVisibility) window.recomputeVisibility();
  if (window.setMapDirty) window.setMapDirty(true);
  return true;
}

function showForfeitConfirmation(col, row) {
  const hex = gameState.map[row][col];
  const terrain = window.TERRAIN?.[hex.terrain];
  const hasBuilding = hex.building && hex.building !== 'settlement';
  const hasWorkers = hex.workers > 0;

  let warning = '';
  if (hasBuilding) {
    const bDef = window.BUILDINGS?.[hex.building];
    const refund = Math.floor((bDef?.cost?.materials || 0) / 2);
    warning += `<p>The ${bDef?.name || 'building'} will be demolished (refund: ${refund} materials).</p>`;
  }
  if (hasWorkers) {
    warning += `<p>${hex.workers} worker(s) will become idle.</p>`;
  }

  window.showConfirmDialog(
    'Abandon Territory',
    `<p>Abandon this ${terrain?.name || 'hex'}?</p>
     ${warning}
     <p><strong>Identity -1</strong> (our people feel diminished)</p>`,
    'Abandon',
    'Cancel',
    () => {
      forfeitHex(col, row);
      if (gameState.selectedHex) window.updateSidePanel(gameState.selectedHex);
      if (window.render) window.render();
    }
  );
}

// ---- TERRITORY GOVERNANCE STRAIN ----
// Beyond a threshold, large territory drains legitimacy and bonds.
// Admin Hall workers offset the threshold.

function getTerritoryGovernanceStrain() {
  const threshold = window.TERRITORY_GOVERNANCE_THRESHOLD || 25;
  const strainLeg = window.TERRITORY_GOVERNANCE_STRAIN_LEGITIMACY || 0.02;
  const strainBonds = window.TERRITORY_GOVERNANCE_STRAIN_BONDS || 0.01;
  const offsetPerWorker = window.TERRITORY_STRAIN_OFFSET_PER_WORKER || 5;

  const territorySize = gameState.territory.size;
  const adminWorkers = getAdminHallWorkerCount();
  const effectiveThreshold = threshold + adminWorkers * offsetPerWorker;

  const excess = Math.max(0, territorySize - effectiveThreshold);
  return {
    legitimacy: excess * strainLeg,
    bonds: excess * strainBonds,
    territorySize,
    threshold: effectiveThreshold,
    excess
  };
}

// ---- ADMINISTRATIVE HEX PURCHASE ----
// Admin Hall workers generate expansion points; player spends them to claim hexes.

function processExpansionPoints(report) {
  // Count admin_hall workers across all territory
  let adminWorkers = 0;
  for (let r = 0; r < window.MAP_ROWS; r++) {
    for (let c = 0; c < window.MAP_COLS; c++) {
      const hex = gameState.map[r][c];
      if (hex.building === 'admin_hall' && hex.buildProgress <= 0 && hex.workers > 0) {
        if (window.isInTerritory && window.isInTerritory(c, r)) {
          adminWorkers += hex.workers;
        }
      }
    }
  }
  if (adminWorkers > 0) {
    const points = adminWorkers * 0.3;
    gameState.expansionPoints = (gameState.expansionPoints || 0) + points;
  }
}

function getAdminHallWorkerCount() {
  let count = 0;
  for (let r = 0; r < window.MAP_ROWS; r++) {
    for (let c = 0; c < window.MAP_COLS; c++) {
      const hex = gameState.map[r][c];
      if (hex.building === 'admin_hall' && hex.buildProgress <= 0 && hex.workers > 0) {
        if (window.isInTerritory && window.isInTerritory(c, r)) {
          count += hex.workers;
        }
      }
    }
  }
  return count;
}

function getHexPurchaseCost(col, row) {
  const claimedCount = gameState.claimedHexes ? gameState.claimedHexes.size : 0;
  let cost = 8 + claimedCount * 2;

  // Named cultural region discount — 50% off
  if (window.getRegionOwner) {
    const region = window.getRegionOwner(col, row);
    if (region) cost = Math.ceil(cost * 0.5);
  }

  return cost;
}

function canPurchaseHex(col, row) {
  // Must not already be territory
  if (gameState.territory.has(`${col},${row}`)) return false;

  // Must be adjacent to territory
  if (!isAdjacentToTerritoryHex(col, row)) return false;

  // Terrain check — no ocean or mountain
  const hex = gameState.map[row]?.[col];
  if (!hex || hex.terrain === 'ocean' || hex.terrain === 'mountain') return false;

  // Must have enough points
  const cost = getHexPurchaseCost(col, row);
  if ((gameState.expansionPoints || 0) < cost) return false;

  return true;
}

function purchaseHex(col, row) {
  if (!canPurchaseHex(col, row)) return false;

  const cost = getHexPurchaseCost(col, row);
  gameState.expansionPoints -= cost;
  if (!gameState.claimedHexes) gameState.claimedHexes = new Set();
  gameState.claimedHexes.add(`${col},${row}`);
  recalcTerritory();

  if (window.addChronicleEntry) {
    const terrain = window.TERRAIN?.[gameState.map[row]?.[col]?.terrain];
    window.addChronicleEntry(
      `Our administrators formally claimed new ${terrain?.name || 'territory'}, extending our borders.`,
      'cultural'
    );
  }

  if (window.recomputeVisibility) window.recomputeVisibility();
  if (window.setMapDirty) window.setMapDirty(true);
  return true;
}

function showPurchaseHexConfirmation(col, row) {
  const hex = gameState.map[row]?.[col];
  const terrain = window.TERRAIN?.[hex?.terrain];
  const cost = getHexPurchaseCost(col, row);
  const points = Math.floor(gameState.expansionPoints || 0);
  const inRegion = window.getRegionOwner ? window.getRegionOwner(col, row) : null;

  window.showConfirmDialogNonDestructive(
    'Claim Territory',
    `<p>Claim this ${terrain?.name || 'hex'} for your settlement?</p>
     <p><strong>Cost:</strong> ${cost} expansion points (you have ${points})</p>
     ${inRegion ? '<p><em>50% discount — within named region "' + inRegion.name + '"</em></p>' : ''}
     <p>The hex becomes part of your workable territory.</p>`,
    'Claim',
    'Cancel',
    () => {
      if (purchaseHex(col, row)) {
        if (window.updateSidePanel && gameState.selectedHex) window.updateSidePanel(gameState.selectedHex);
        if (window.updateAllUI) window.updateAllUI();
        if (window.render) window.render();
      }
    }
  );
}

// ---- CULTURAL TERRITORY GROWTH ----
// Each settlement accumulates culturalStrength per turn from nearby activity.
// When strength exceeds a scaling threshold, the best adjacent hex is claimed.

function processSettlementCulturalGrowth(report) {
  const BASE_COST = window.CULTURAL_GROWTH_BASE_COST || 8;
  const STEP = window.CULTURAL_GROWTH_STEP || 4;
  const DECAY = window.CULTURAL_GROWTH_DECAY || 0.3;
  const REGION_BONUS = window.CULTURAL_GROWTH_REGION_BONUS || 1.5;

  if (!gameState.claimedHexes) gameState.claimedHexes = new Set();

  for (const settlement of gameState.settlements) {
    if (settlement.culturalStrength === undefined) settlement.culturalStrength = 0;

    // Compute border hexes — territory hexes whose nearest settlement is this one
    // and that have at least one non-territory neighbor
    const borderHexes = [];
    for (const key of gameState.territory) {
      const [c, r] = key.split(',').map(Number);
      const owner = getSettlementForHex(c, r);
      if (!owner || owner.col !== settlement.col || owner.row !== settlement.row) continue;

      // Check if this hex is on the border (has at least one non-territory neighbor)
      for (let dir = 0; dir < 6; dir++) {
        const n = window.hexNeighbor(c, r, dir);
        if (n.col < 0 || n.col >= window.MAP_COLS || n.row < 0 || n.row >= window.MAP_ROWS) continue;
        if (!gameState.territory.has(`${n.col},${n.row}`)) {
          borderHexes.push({ col: c, row: r });
          break;
        }
      }
    }

    // Calculate turn activity from border hexes
    let turnActivity = 0;
    for (const bh of borderHexes) {
      const hex = gameState.map[bh.row][bh.col];
      if (hex.workers > 0) turnActivity += hex.workers;
      if (hex.building && hex.buildProgress <= 0) turnActivity += 0.5;
    }

    // Population bonus — small passive growth
    turnActivity += Math.min(5, Math.sqrt(gameState.population.total)) * 0.1;

    // Identity bonus — higher identity means stronger cultural spread
    const identityMod = (gameState.cohesion?.identity ?? 50) / 100;
    turnActivity *= (0.5 + identityMod * 0.5); // range 0.5 - 1.0

    // Count claimed hexes belonging to this settlement (for cost scaling)
    let claimedCount = 0;
    for (const key of gameState.claimedHexes) {
      const [c, r] = key.split(',').map(Number);
      const owner = getSettlementForHex(c, r);
      if (owner && owner.col === settlement.col && owner.row === settlement.row) {
        claimedCount++;
      }
    }

    if (turnActivity > 0.1) {
      settlement.culturalStrength += turnActivity;
    } else {
      // Decay when no border activity; allow going negative to trigger contraction
      const minStrength = claimedCount > 0 ? -(STEP + 1) : 0;
      settlement.culturalStrength = Math.max(minStrength, settlement.culturalStrength - DECAY);
    }

    // Check if strength exceeds threshold for next expansion
    const nextCost = BASE_COST + claimedCount * STEP;
    if (settlement.culturalStrength >= nextCost) {
      // Find the best candidate hex adjacent to this settlement's territory
      const candidate = findBestCulturalExpansionHex(settlement, REGION_BONUS);
      if (candidate) {
        gameState.claimedHexes.add(candidate);
        recalcTerritory();
        // Don't fully reset — subtract cost so excess carries forward
        settlement.culturalStrength -= nextCost;

        if (report) {
          const [cc, cr] = candidate.split(',').map(Number);
          const terrain = window.TERRAIN?.[gameState.map[cr]?.[cc]?.terrain];
          const sName = settlement.name || 'Our settlement';
          report.events.push(`🏕️ ${sName}'s cultural influence expanded into nearby ${terrain?.name || 'land'}.`);
        }
        if (window.addChronicleEntry) {
          const sName = settlement.name || 'Our settlement';
          window.addChronicleEntry(
            `The cultural influence of ${sName} grew, and our people laid claim to new territory.`,
            'cultural'
          );
        }

        if (window.recomputeVisibility) window.recomputeVisibility();
        if (window.setMapDirty) window.setMapDirty(true);
      }
    }

    // Decay / contraction — if strength drops very low and we have claimed hexes, shed the worst
    if (claimedCount > 0 && settlement.culturalStrength < -STEP) {
      const worst = findWorstCulturalHex(settlement);
      if (worst) {
        // Clear workers/building on shed hex
        const [wc, wr] = worst.split(',').map(Number);
        const wHex = gameState.map[wr]?.[wc];
        if (wHex) {
          if (wHex.workers > 0) {
            gameState.population.employed -= wHex.workers;
            gameState.population.idle += wHex.workers;
            wHex.workers = 0;
          }
        }
        gameState.claimedHexes.delete(worst);
        recalcTerritory();
        settlement.culturalStrength = 0;

        if (report) {
          const sName = settlement.name || 'Our settlement';
          report.events.push(`🗺️ ${sName}'s cultural reach contracted as activity waned.`);
        }
        if (window.setMapDirty) window.setMapDirty(true);
      }
    }
  }
}

// Find the best hex for cultural expansion — adjacent to territory, not ocean/mountain
function findBestCulturalExpansionHex(settlement, regionBonus) {
  const candidates = [];
  const sCube = window.offsetToCube(settlement.col, settlement.row);

  // Collect all non-territory hexes adjacent to this settlement's territory
  const checked = new Set();
  for (const key of gameState.territory) {
    const [c, r] = key.split(',').map(Number);
    // Only consider border hexes owned by this settlement
    const owner = getSettlementForHex(c, r);
    if (!owner || owner.col !== settlement.col || owner.row !== settlement.row) continue;

    for (let dir = 0; dir < 6; dir++) {
      const n = window.hexNeighbor(c, r, dir);
      if (n.col < 0 || n.col >= window.MAP_COLS || n.row < 0 || n.row >= window.MAP_ROWS) continue;
      const nKey = `${n.col},${n.row}`;
      if (checked.has(nKey)) continue;
      checked.add(nKey);
      if (gameState.territory.has(nKey)) continue;

      const hex = gameState.map[n.row]?.[n.col];
      if (!hex) continue;
      if (hex.terrain === 'ocean' || hex.terrain === 'mountain') continue;

      // Score: prefer closer to settlement, prefer hexes in named regions
      let score = 10 - window.cubeDistance(window.offsetToCube(n.col, n.row), sCube);

      // Named region bonus
      if (window.getRegionOwner) {
        const region = window.getRegionOwner(n.col, n.row);
        if (region) score *= regionBonus;
      }

      // Slight terrain preference — fertile terrain expands faster
      const terrain = window.TERRAIN?.[hex.terrain];
      if (terrain) {
        score += (terrain.food || 0) * 0.3 + (terrain.materials || 0) * 0.2;
      }

      // Revealed hex bonus — culture spreads to known lands
      if (hex.revealed) score += 1;

      candidates.push({ key: nKey, score });
    }
  }

  if (candidates.length === 0) return null;

  // Sort by score descending, pick best
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].key;
}

// Find the worst claimed hex to shed — farthest from settlement, least activity
function findWorstCulturalHex(settlement) {
  const sCube = window.offsetToCube(settlement.col, settlement.row);
  let worst = null;
  let worstScore = -Infinity;

  for (const key of gameState.claimedHexes) {
    const [c, r] = key.split(',').map(Number);
    const owner = getSettlementForHex(c, r);
    if (!owner || owner.col !== settlement.col || owner.row !== settlement.row) continue;

    const hex = gameState.map[r]?.[c];
    if (!hex) continue;

    // Higher score = worse (more expendable)
    let score = window.cubeDistance(window.offsetToCube(c, r), sCube); // farther = worse
    if (hex.workers === 0 && !hex.building) score += 3; // empty hex is more expendable
    if (!hex.building) score += 1;

    if (score > worstScore) {
      worstScore = score;
      worst = key;
    }
  }

  return worst;
}

// ---- HELPERS ----

// Check if a hex key is adjacent to territory (optionally excluding itself)
function isAdjacentToTerritory(hexKey, excludeSelf) {
  const [c, r] = hexKey.split(',').map(Number);
  for (let dir = 0; dir < 6; dir++) {
    const n = window.hexNeighbor(c, r, dir);
    if (n.col < 0 || n.col >= window.MAP_COLS || n.row < 0 || n.row >= window.MAP_ROWS) continue;
    const nKey = `${n.col},${n.row}`;
    if (excludeSelf && nKey === hexKey) continue;
    if (gameState.territory.has(nKey)) return true;
  }
  return false;
}

// Check if a hex is adjacent to current territory (for hex purchase/cultural growth)
function isAdjacentToTerritoryHex(col, row) {
  for (let dir = 0; dir < 6; dir++) {
    const n = window.hexNeighbor(col, row, dir);
    if (n.col < 0 || n.col >= window.MAP_COLS || n.row < 0 || n.row >= window.MAP_ROWS) continue;
    if (gameState.territory.has(`${n.col},${n.row}`)) return true;
  }
  return false;
}

export {
  initTerritory,
  hexHasRiver,
  revealArea,
  recomputeVisibility,
  recalcTerritory,
  canFoundSettlement,
  foundSettlement,
  showSettlementFoundingConfirmation,
  showSettlementNamingDialog,
  getSettlementForHex,
  getSettlementIndexForHex,
  isClaimedHex,
  isCoreHex,
  isAdjacentToTerritoryHex,
  processSettlementHealth,
  processSettlementCulturalGrowth,
  getTerritoryGovernanceStrain,
  processExpansionPoints,
  getAdminHallWorkerCount,
  getHexPurchaseCost,
  canPurchaseHex,
  purchaseHex,
  showPurchaseHexConfirmation,
  damageSettlement,
  destroySettlement,
  forfeitHex,
  showForfeitConfirmation
};

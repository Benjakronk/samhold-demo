// Unit Management System for Samhold
// Handles unit creation, training, movement, selection, and disbanding
// Extracted from main game file for modular architecture

let gameState = null;

function initUnitManagement(gameStateRef) {
  gameState = gameStateRef;
}

// ---- UNIT TRAINING ----

function startUnitTraining(type, col, row) {
  if (!window.UNIT_TYPES[type]) {
    console.error(`Unknown unit type: ${type}`);
    return null;
  }

  const unitType = window.UNIT_TYPES[type];

  if (unitType.cost.population > gameState.population.idle) {
    return null;
  }
  if (unitType.cost.materials > gameState.resources.materials) {
    return null;
  }

  const existingUnit = gameState.units.find(u => u.col === col && u.row === row);
  const existingTraining = gameState.unitsInTraining.find(t => t.col === col && t.row === row);
  if (existingUnit || existingTraining) {
    return null;
  }

  gameState.population.idle -= unitType.cost.population;
  gameState.population.employed += unitType.cost.population;
  gameState.resources.materials -= unitType.cost.materials;

  const trainingUnit = {
    type: type,
    col: col,
    row: row,
    trainingProgress: unitType.training,
    trainingNeeded: unitType.training
  };

  gameState.unitsInTraining.push(trainingUnit);
  return trainingUnit;
}

function cancelUnitTraining(col, row) {
  const trainingIndex = gameState.unitsInTraining.findIndex(t => t.col === col && t.row === row);
  if (trainingIndex === -1) {
    return false;
  }

  const training = gameState.unitsInTraining[trainingIndex];
  const unitType = window.UNIT_TYPES[training.type];

  gameState.population.employed -= unitType.cost.population;
  gameState.population.idle += unitType.cost.population;

  gameState.unitsInTraining.splice(trainingIndex, 1);

  if (window.setMapDirty) window.setMapDirty(true);
  window.updateAllUI();
  if (gameState.selectedHex) window.updateSidePanel(gameState.selectedHex);
  if (window.render) window.render();

  return true;
}

// ---- UNIT CREATION & DELETION ----

function createUnit(type, col, row) {
  if (!window.UNIT_TYPES[type]) {
    console.error(`Unknown unit type: ${type}`);
    return null;
  }

  const unitType = window.UNIT_TYPES[type];

  if (unitType.cost.population > gameState.population.idle) {
    return null;
  }
  if (unitType.cost.materials > gameState.resources.materials) {
    return null;
  }

  const existingUnit = gameState.units.find(u => u.col === col && u.row === row);
  if (existingUnit) {
    return null;
  }

  const unit = {
    id: gameState.nextUnitId++,
    type: type,
    col: col,
    row: row,
    movementLeft: unitType.movement,
    health: 100,
    experience: 0,
    orders: null,
    lastDamage: 0
  };

  gameState.population.idle -= unitType.cost.population;
  gameState.population.employed += unitType.cost.population;
  gameState.resources.materials -= unitType.cost.materials;

  gameState.units.push(unit);

  if (window.setMapDirty) window.setMapDirty(true);
  return unit;
}

function deleteUnit(unitId) {
  const unitIndex = gameState.units.findIndex(u => u.id === unitId);
  if (unitIndex === -1) return;

  const unit = gameState.units[unitIndex];
  const unitType = window.UNIT_TYPES[unit.type];

  const returnedPop = Math.floor(unitType.cost.population / 2);
  gameState.population.idle += returnedPop;
  gameState.population.employed -= unitType.cost.population;

  gameState.units.splice(unitIndex, 1);
  if (window.setMapDirty) window.setMapDirty(true);
}

// Voluntarily disband a unit — full population returns to idle workforce
function disbandUnit(unitId) {
  const unitIndex = gameState.units.findIndex(u => u.id === unitId);
  if (unitIndex === -1) return;

  const unit = gameState.units[unitIndex];
  const unitType = window.UNIT_TYPES[unit.type];

  gameState.population.employed -= unitType.cost.population;
  gameState.population.idle += unitType.cost.population;

  gameState.units.splice(unitIndex, 1);

  if (gameState.selectedUnit?.id === unitId) window.deselectUnit();
  if (window.setMapDirty) window.setMapDirty(true);
  window.updateAllUI();
  if (gameState.selectedHex) window.updateSidePanel(gameState.selectedHex);
  if (window.render) window.render();
}

// ---- UNIT QUERIES ----

function getUnitsAt(col, row) {
  return gameState.units.filter(u => u.col === col && u.row === row);
}

// ---- UNIT MOVEMENT ----

function moveUnit(unitId, targetCol, targetRow) {
  const unit = gameState.units.find(u => u.id === unitId);
  if (!unit) return false;

  const unitType = window.UNIT_TYPES[unit.type];

  if (targetCol < 0 || targetCol >= window.MAP_COLS || targetRow < 0 || targetRow >= window.MAP_ROWS) return false;

  const targetHex = gameState.map[targetRow][targetCol];

  // Use BFS to validate and get actual path cost
  const bfs = bfsMovement(unit);
  const targetKey = `${targetCol},${targetRow}`;
  if (!bfs.has(targetKey)) return false;
  const distance = bfs.get(targetKey);

  if (distance > unit.movementLeft) return false;

  // Moving deactivates any Steward tending action
  if (unit.type === 'steward' && unit.activeAction) {
    unit.activeAction = null;
  }

  unit.col = targetCol;
  unit.row = targetRow;
  unit.movementLeft -= distance;

  const visionRadius = unitType.vision ?? 1;
  window.revealArea(targetCol, targetRow, visionRadius);

  // Recompute full visibility after movement
  if (window.recomputeVisibility) window.recomputeVisibility();

  const nearbyThreats = gameState.externalThreats.filter(threat => {
    const dist = window.cubeDistance(
      window.offsetToCube(targetCol, targetRow),
      window.offsetToCube(threat.col, threat.row)
    );
    return dist <= 1;
  });

  if (unitType.combat > 0 && nearbyThreats.length > 0) {
    for (const threat of nearbyThreats) {
      const combatResult = window.initiateCombat(unit, threat);
      if (combatResult && combatResult.result !== 'no_combat') {
        console.log(`Combat initiated: ${combatResult.message}`);

        if (threat.health <= 0) {
          const index = gameState.externalThreats.indexOf(threat);
          if (index >= 0) gameState.externalThreats.splice(index, 1);
        }
        if (unit.health <= 0) {
          const index = gameState.units.indexOf(unit);
          if (index >= 0) {
            const uType = window.UNIT_TYPES[unit.type];
            gameState.units.splice(index, 1);
            gameState.population.employed -= uType.cost.population;
            gameState.population.total -= uType.cost.population;
          }
        }
      }
    }
  }

  if (window.setMapDirty) window.setMapDirty(true);
  return true;
}

function resetUnitMovement() {
  for (const unit of gameState.units) {
    const unitType = window.UNIT_TYPES[unit.type];
    unit.movementLeft = unitType.movement;
    unit.lastDamage = 0;
  }

  for (const threat of gameState.externalThreats) {
    threat.lastDamage = 0;
  }
}

// ---- UNIT SELECTION ----

function selectUnit(unitId) {
  const unit = gameState.units.find(u => u.id === unitId);
  if (unit) {
    gameState.selectedUnit = unit;
    if (window.setMapDirty) window.setMapDirty(true);
    return true;
  }
  return false;
}

function selectUnitForMovement(unitId) {
  const unit = gameState.units.find(u => u.id === unitId);
  if (unit) {
    gameState.selectedUnit = unit;
    gameState.unitInteractionMode = 'move';
    gameState.selectedHex = gameState.map[unit.row][unit.col];
    if (window.setMapDirty) window.setMapDirty(true);
    if (window.render) window.render();
  }
}

function deselectUnit() {
  gameState.selectedUnit = null;
  gameState.unitInteractionMode = null;
  if (window.setMapDirty) window.setMapDirty(true);
}

// Activate action mode for a specific unit (called from sidebar action buttons)
function activateActionMode(unitId) {
  const unit = gameState.units.find(u => u.id === unitId);
  if (!unit) return;
  gameState.selectedUnit = unit;
  gameState.unitInteractionMode = 'action';
  gameState.selectedHex = gameState.map[unit.row][unit.col];
  if (window.setMapDirty) window.setMapDirty(true);
  if (window.updateSidePanel) window.updateSidePanel(gameState.selectedHex);
  if (window.render) window.render();
}

// Set interaction mode for the currently selected unit
function setUnitMode(mode) {
  gameState.unitInteractionMode = mode;
  if (mode === null) gameState.selectedUnit = null;
  if (window.setMapDirty) window.setMapDirty(true);
  if (window.render) window.render();
}

// Returns action targets for a unit based on its type.
// Each target: { col, row, type: 'attack', threat }
function getValidActionTargets(unit) {
  const targets = [];
  if (!unit) return targets;

  // Warriors can attack adjacent threats without moving
  if (unit.type === 'warrior' && unit.movementLeft > 0) {
    for (const threat of gameState.externalThreats) {
      const dist = window.cubeDistance(
        window.offsetToCube(unit.col, unit.row),
        window.offsetToCube(threat.col, threat.row)
      );
      if (dist <= 1) {
        targets.push({ col: threat.col, row: threat.row, type: 'attack', threat });
      }
    }
  }

  return targets;
}

// Returns true if the unit has any available action targets
function hasUnitActions(unit) {
  return getValidActionTargets(unit).length > 0;
}

// Execute a unit action on a target hex (called from hex click in action mode)
function executeUnitAction(unit, col, row) {
  const targets = getValidActionTargets(unit);
  const target = targets.find(t => t.col === col && t.row === row);
  if (!target) return false;

  if (target.type === 'attack') {
    const combatResult = window.initiateCombat(unit, target.threat);
    // Attacking costs all remaining movement
    unit.movementLeft = 0;

    if (target.threat.health <= 0) {
      const idx = gameState.externalThreats.indexOf(target.threat);
      if (idx >= 0) gameState.externalThreats.splice(idx, 1);
    }
    if (unit.health <= 0) {
      const idx = gameState.units.indexOf(unit);
      if (idx >= 0) {
        const uType = window.UNIT_TYPES[unit.type];
        gameState.units.splice(idx, 1);
        gameState.population.employed -= uType.cost.population;
        gameState.population.total -= uType.cost.population;
      }
    }

    deselectUnit();
    if (window.setMapDirty) window.setMapDirty(true);
    return true;
  }

  return false;
}

// ---- MOVEMENT CALCULATION (BFS-based) ----

// BFS from unit position, respecting edge blocking (fortifications) and terrain
function getValidMoveTargets(unit) {
  if (!unit) return [];

  const bfsResult = bfsMovement(unit);
  const validTargets = [];
  for (const [key, cost] of bfsResult.entries()) {
    const [c, r] = key.split(',').map(Number);
    if (c === unit.col && r === unit.row) continue;
    validTargets.push({ col: c, row: r, cost });
  }
  return validTargets;
}

function getBlockedMoveTargets(unit) {
  const blockedTargets = [];
  const reachable = bfsMovement(unit);

  // Check hexes within raw cube distance that aren't reachable
  for (let r = 0; r < window.MAP_ROWS; r++) {
    for (let c = 0; c < window.MAP_COLS; c++) {
      if (c === unit.col && r === unit.row) continue;
      const distance = window.cubeDistance(
        window.offsetToCube(unit.col, unit.row),
        window.offsetToCube(c, r)
      );
      if (distance > unit.movementLeft || distance === 0) continue;
      if (reachable.has(`${c},${r}`)) continue;

      const targetHex = gameState.map[r][c];
      if (!canUnitEnterHex(unit, targetHex, c, r)) {
        const existingUnit = gameState.units.find(u =>
          u.id !== unit.id && u.col === c && u.row === r
        );
        blockedTargets.push({
          col: c, row: r, cost: distance,
          reason: existingUnit ? 'unit' : 'terrain'
        });
      } else {
        // Reachable terrain-wise but blocked by walls
        blockedTargets.push({ col: c, row: r, cost: distance, reason: 'wall' });
      }
    }
  }
  return blockedTargets;
}

// BFS expanding through adjacent hexes, checking edge blocking
// Returns Map of "col,row" -> cost for all reachable hexes
function bfsMovement(unit) {
  const visited = new Map(); // "col,row" -> cost
  const queue = [{ col: unit.col, row: unit.row, cost: 0 }];
  visited.set(`${unit.col},${unit.row}`, 0);

  while (queue.length > 0) {
    const current = queue.shift();
    if (current.cost >= unit.movementLeft) continue;

    for (let edge = 0; edge < 6; edge++) {
      const nb = window.hexNeighbor(current.col, current.row, edge);
      if (nb.col < 0 || nb.col >= window.MAP_COLS || nb.row < 0 || nb.row >= window.MAP_ROWS) continue;

      const newCost = current.cost + 1;
      const key = `${nb.col},${nb.row}`;

      // Skip if already found a shorter path
      if (visited.has(key) && visited.get(key) <= newCost) continue;

      // Check edge blocking (fortifications)
      if (window.isEdgeBlocked && window.isEdgeBlocked(current.col, current.row, edge, true)) continue;

      // Check terrain
      const nbHex = gameState.map[nb.row][nb.col];
      if (!canUnitEnterHex(unit, nbHex, nb.col, nb.row)) continue;

      visited.set(key, newCost);
      if (newCost < unit.movementLeft) {
        queue.push({ col: nb.col, row: nb.row, cost: newCost });
      }
    }
  }

  return visited;
}

function calculateMoveCost(unit, targetCol, targetRow) {
  // Use BFS cost if available, otherwise fallback to cube distance
  const bfs = bfsMovement(unit);
  const key = `${targetCol},${targetRow}`;
  return bfs.has(key) ? bfs.get(key) : window.cubeDistance(
    window.offsetToCube(unit.col, unit.row),
    window.offsetToCube(targetCol, targetRow)
  );
}

function canUnitEnterHex(unit, hex, targetCol, targetRow) {
  if (hex.terrain === 'ocean') return false;

  if (hex.terrain === 'mountain') {
    return unit.type === 'scout';
  }

  const existingUnit = gameState.units.find(u =>
    u.id !== unit.id && u.col === targetCol && u.row === targetRow
  );
  if (existingUnit) return false;

  return true;
}

// Export functions
export {
  initUnitManagement,
  startUnitTraining,
  cancelUnitTraining,
  createUnit,
  deleteUnit,
  disbandUnit,
  getUnitsAt,
  moveUnit,
  resetUnitMovement,
  selectUnit,
  selectUnitForMovement,
  deselectUnit,
  setUnitMode,
  activateActionMode,
  getValidMoveTargets,
  getBlockedMoveTargets,
  getValidActionTargets,
  hasUnitActions,
  executeUnitAction,
  calculateMoveCost,
  canUnitEnterHex,
  bfsMovement
};

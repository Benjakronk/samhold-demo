// Building Actions & Hex Click System for Samhold
// Handles hex click logic, building placement, and demolition
// Extracted from main game file for modular architecture

let gameState = null;

function initBuildingActions(gameStateRef) {
  gameState = gameStateRef;
}

function handleHexClick(e) {
  const cs = window.pageToCanvas(e.clientX, e.clientY);
  if (cs.x < 0 || cs.x > window.canvasW || cs.y < 0 || cs.y > window.canvasH) return;

  const w = window.screenToWorld(cs.x, cs.y), h = window.pixelToHex(w.x, w.y, window.HEX_SIZE);
  if (h.col < 0 || h.col >= window.MAP_COLS || h.row < 0 || h.row >= window.MAP_ROWS) return;

  const hex = gameState.map[h.row][h.col];
  if (!hex.revealed) {
    gameState.selectedHex = null;
    window.deselectUnit();
    window.clearSidePanel();
    if (window.render) window.render();
    return;
  }

  // Check if there's a unit at this hex that can be selected
  const unitsHere = window.getUnitsAt(h.col, h.row);

  // If we have a selected unit and clicked a valid move target
  if (gameState.selectedUnit) {
    const validTargets = window.getValidMoveTargets(gameState.selectedUnit);
    const isValidTarget = validTargets.some(t => t.col === h.col && t.row === h.row);

    if (isValidTarget) {
      // Check if this is a Settler attempting to found a settlement
      if (gameState.selectedUnit.type === 'settler' && window.canFoundSettlement(h.col, h.row)) {
        // Show settlement founding confirmation
        window.showSettlementFoundingConfirmation(h.col, h.row);
        return;
      }

      // Move the unit
      const success = window.moveUnit(gameState.selectedUnit.id, h.col, h.row);
      if (success) {
        // Update selected hex to follow the unit
        gameState.selectedHex = hex;
        window.updateSidePanel(hex);

        // Keep unit selected unless it's out of movement
        if (gameState.selectedUnit.movementLeft <= 0) {
          window.deselectUnit();
        }

        if (window.render) window.render();
        return;
      } else {
        // Movement blocked - provide feedback
        const existingUnit = gameState.units.find(u =>
          u.id !== gameState.selectedUnit.id && u.col === h.col && u.row === h.row
        );
        if (existingUnit) {
          const unitType = window.UNIT_TYPES[existingUnit.type];
          window.showTurnSummary({
            events: [`\u274C Cannot move - hex occupied by ${unitType.icon} ${unitType.name}`],
            foodIncome: 0, matIncome: 0, foodConsumed: 0, netFood: 0, netMat: 0
          }, '', 0);
        }
        return;
      }
    } else {
      // Clicked on invalid target - deselect unit
      window.deselectUnit();
    }
  } else {
    // No unit selected - check if we clicked on the same hex as currently selected (reclick behavior)
    if (gameState.selectedHex &&
        gameState.selectedHex.col === h.col &&
        gameState.selectedHex.row === h.row) {
      if (unitsHere.length > 0) {
        // Clicking on selected hex with units - activate movement for first unit
        window.selectUnitForMovement(unitsHere[0].id);
        // Don't call deselectUnit() - keep the unit selected
      } else {
        // Clicking on selected hex with no units - deselect the hex
        gameState.selectedHex = null;
        window.clearSidePanel();
        if (window.render) window.render();
        return;
      }
    } else {
      // Clicking on different hex - clear unit selection
      window.deselectUnit();
    }
  }

  // Always update hex selection and side panel
  gameState.selectedHex = hex;
  window.updateSidePanel(hex);
  if (window.render) window.render();
}

function placeBuilding(col, row, buildingKey) {
  const hex = gameState.map[row][col];
  const bDef = window.BUILDINGS[buildingKey];
  if (hex.building || !bDef) return;

  gameState.resources.materials -= bDef.cost.materials;
  hex.building = buildingKey;
  hex.buildProgress = bDef.buildTurns;

  // Existing gatherer becomes a builder/worker; clamp to max
  const existingWorkers = hex.workers;
  hex.workers = Math.min(existingWorkers, bDef.maxWorkers || 0);
  const returned = existingWorkers - hex.workers;
  if (returned > 0) {
    gameState.population.employed -= returned;
    gameState.population.idle += returned;
  }

  // Auto-assign 1 builder if construction requires workers and none assigned
  if (hex.buildProgress > 0 && hex.workers === 0 && (bDef.maxWorkers || 0) > 0 && gameState.population.idle > 0) {
    hex.workers = 1;
    gameState.population.employed++;
    gameState.population.idle--;
  }

  if (window.setMapDirty) window.setMapDirty(true);
  window.updateAllUI();
  window.updateSidePanel(hex);
  if (window.render) window.render();
}

function demolishBuilding(col, row) {
  const hex = gameState.map[row][col];
  if (!hex.building || hex.building === 'settlement') return;

  const bDef = window.BUILDINGS[hex.building];
  const isConstruction = hex.buildProgress > 0;
  const refund = isConstruction
    ? (bDef.cost.materials || 0)
    : Math.floor((bDef.cost.materials || 0) / 2);

  const title = isConstruction ? `Cancel ${bDef.name}?` : `Demolish ${bDef.name}?`;
  const workerNote = hex.workers > 0
    ? `<br>${hex.workers} worker${hex.workers > 1 ? 's' : ''} will be freed.`
    : '';
  const body = `Refund: \u{1FAB5} ${refund} materials${workerNote}`;
  const okLabel = isConstruction ? 'Cancel Build' : 'Demolish';

  window.showConfirmDialog(title, body, okLabel, 'Keep', () => {
    gameState.resources.materials += refund;

    if (hex.workers > 0) {
      gameState.population.employed -= hex.workers;
      gameState.population.idle += hex.workers;
      hex.workers = 0;
    }

    hex.building = null;
    hex.buildProgress = 0;

    if (window.setMapDirty) window.setMapDirty(true);
    window.updateAllUI();
    window.updateSidePanel(hex);
    if (window.render) window.render();
  });
}

export {
  initBuildingActions,
  handleHexClick,
  placeBuilding,
  demolishBuilding
};

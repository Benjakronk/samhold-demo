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

  const mode = gameState.unitInteractionMode;

  // ---- FORTIFY MODE: clicking an edge places a fortification ----
  if (mode === 'fortify' && window.hoveredHex && window.hoveredEdge != null) {
    const fCol = window.hoveredHex.col;
    const fRow = window.hoveredHex.row;
    const fEdge = window.hoveredEdge;

    if (window.isInTerritory(fCol, fRow) && !window.getFortification(fCol, fRow, fEdge)) {
      const nb = window.hexNeighbor(fCol, fRow, fEdge);
      if (nb.col >= 0 && nb.col < window.MAP_COLS && nb.row >= 0 && nb.row < window.MAP_ROWS) {
        window.handleFortifyClick(fCol, fRow, fEdge);
        return;
      }
    }
    // Clicked an invalid edge or outside territory — exit fortify mode
    gameState.unitInteractionMode = null;
    window.hoveredHex = null;
    window.hoveredEdge = null;
    window.updateSidePanel(hex);
    if (window.render) window.render();
    return;
  }

  // ---- ACTION MODE: clicking a valid action target executes the action ----
  if (gameState.selectedUnit && mode === 'action') {
    const actionTargets = window.getValidActionTargets(gameState.selectedUnit);
    const isActionTarget = actionTargets.some(t => t.col === h.col && t.row === h.row);

    if (isActionTarget) {
      window.executeUnitAction(gameState.selectedUnit, h.col, h.row);
      gameState.selectedHex = gameState.map[gameState.selectedUnit?.row ?? h.row]?.[gameState.selectedUnit?.col ?? h.col] ?? hex;
      window.updateSidePanel(hex);
      if (window.render) window.render();
      return;
    } else {
      // Clicked off a valid target — exit action mode but stay on unit hex
      window.setUnitMode(null);
    }
  }

  // ---- MOVE MODE: clicking a valid move target moves the unit ----
  if (gameState.selectedUnit && mode === 'move') {
    const validTargets = window.getValidMoveTargets(gameState.selectedUnit);
    const isValidTarget = validTargets.some(t => t.col === h.col && t.row === h.row);

    if (isValidTarget) {
      // Settler founding
      if (gameState.selectedUnit.type === 'settler' && window.canFoundSettlement(h.col, h.row)) {
        window.showSettlementFoundingConfirmation(h.col, h.row);
        return;
      }

      const success = window.moveUnit(gameState.selectedUnit.id, h.col, h.row);
      if (success) {
        gameState.selectedHex = hex;
        window.updateSidePanel(hex);
        if (gameState.selectedUnit && gameState.selectedUnit.movementLeft <= 0) {
          window.deselectUnit();
        }
        if (window.render) window.render();
        return;
      } else {
        const existingUnit = gameState.units.find(u =>
          u.id !== gameState.selectedUnit.id && u.col === h.col && u.row === h.row
        );
        if (existingUnit) {
          const unitType = window.UNIT_TYPES[existingUnit.type];
          window.showTurnSummary({
            events: [`\u274C Cannot move — hex occupied by ${unitType.icon} ${unitType.name}`],
            foodIncome: 0, matIncome: 0, foodConsumed: 0, netFood: 0, netMat: 0
          }, '', 0);
        }
        return;
      }
    } else if (gameState.selectedHex &&
               gameState.selectedHex.col === h.col &&
               gameState.selectedHex.row === h.row &&
               unitsHere.some(u => u.id === gameState.selectedUnit.id)) {
      // Clicked the unit's own hex while in move mode — cycle to action mode
      const hasActions = window.hasUnitActions && window.hasUnitActions(gameState.selectedUnit);
      if (hasActions) {
        window.setUnitMode('action');
        window.updateSidePanel(hex);
        return;
      } else {
        // No actions available — exit mode
        window.setUnitMode(null);
        window.updateSidePanel(hex);
        if (window.render) window.render();
        return;
      }
    } else {
      window.deselectUnit();
    }
  }

  // ---- NO MODE: re-clicking the selected hex cycles into move mode ----
  if (!gameState.selectedUnit) {
    if (gameState.selectedHex &&
        gameState.selectedHex.col === h.col &&
        gameState.selectedHex.row === h.row) {
      if (unitsHere.length > 0) {
        window.selectUnitForMovement(unitsHere[0].id);
      } else {
        gameState.selectedHex = null;
        window.clearSidePanel();
        if (window.render) window.render();
        return;
      }
    } else {
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
  // During construction, use buildWorkers if defined (e.g. monument needs builders but no post-completion staff)
  const constructionMax = hex.buildProgress > 0 ? (bDef.buildWorkers || bDef.maxWorkers || 0) : (bDef.maxWorkers || 0);
  const existingWorkers = hex.workers;
  hex.workers = Math.min(existingWorkers, constructionMax);
  const returned = existingWorkers - hex.workers;
  if (returned > 0) {
    gameState.population.employed -= returned;
    gameState.population.idle += returned;
  }

  // Auto-assign 1 builder if construction requires workers and none assigned
  if (hex.buildProgress > 0 && hex.workers === 0 && constructionMax > 0 && gameState.population.idle > 0) {
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

  // Monument-specific outrage warning
  let outrageWarning = '';
  let outrageIdentity = 0, outrageLegitiacy = 0, outragesBonds = 0;
  if (hex.building === 'monument' && !isConstruction) {
    const age = gameState.turn - (hex.completedTurn || gameState.turn);
    if (age >= 20) {
      outrageIdentity = 10; outrageLegitiacy = 7; outragesBonds = 3;
      outrageWarning = `<p style="color:var(--accent-red)">⚠️ This is an ancient monument. Destroying it will cause <strong>outrage</strong>: Identity −${outrageIdentity}, Legitimacy −${outrageLegitiacy}, Bonds −${outragesBonds}.</p>`;
    } else if (age >= 5) {
      outrageIdentity = 6; outrageLegitiacy = 4;
      outrageWarning = `<p style="color:var(--accent-red)">⚠️ Tearing down this monument will anger the community: Identity −${outrageIdentity}, Legitimacy −${outrageLegitiacy}.</p>`;
    } else if (age >= 1) {
      outrageIdentity = 3; outrageLegitiacy = 2;
      outrageWarning = `<p style="color:orange">⚠️ The people will grumble at removing this monument: Identity −${outrageIdentity}, Legitimacy −${outrageLegitiacy}.</p>`;
    }
  }

  const title = isConstruction ? `Cancel ${bDef.name}?` : `Demolish ${bDef.name}?`;
  const workerNote = hex.workers > 0
    ? `<br>${hex.workers} worker${hex.workers > 1 ? 's' : ''} will be freed.`
    : '';
  const body = `${outrageWarning}Refund: 🪵${refund} materials${workerNote}`;
  const okLabel = isConstruction ? 'Cancel Build' : 'Demolish';

  window.showConfirmDialog(title, body, okLabel, 'Keep', () => {
    gameState.resources.materials += refund;

    if (hex.workers > 0) {
      gameState.population.employed -= hex.workers;
      gameState.population.idle += hex.workers;
      hex.workers = 0;
    }

    // Apply monument demolition outrage
    if (outrageIdentity > 0) {
      gameState.cohesion.identity   = Math.max(0, gameState.cohesion.identity   - outrageIdentity);
      gameState.cohesion.legitimacy = Math.max(0, gameState.cohesion.legitimacy - outrageLegitiacy);
      if (outragesBonds > 0) gameState.cohesion.bonds = Math.max(0, gameState.cohesion.bonds - outragesBonds);
      if (window.addChronicleEntry) {
        const subject = hex.monumentSubject || 'the past';
        window.addChronicleEntry(`The monument commemorating ${subject} was torn down. The people were outraged.`, 'crisis');
      }
    }

    // Deactivate any Steward tending this monument
    for (const unit of gameState.units) {
      if (unit.type === 'steward' && unit.col === col && unit.row === row && unit.activeAction) {
        unit.activeAction = null;
      }
    }

    const wasBuildingType = hex.building;
    hex.building = null;
    hex.buildProgress = 0;
    hex.monumentState = undefined;
    hex.lastStewardTurn = undefined;
    hex.neglectTurns = undefined;
    hex.completedTurn = undefined;
    hex.monumentSubject = undefined;

    // Watchtower removal affects vision
    if (wasBuildingType === 'watchtower' && window.recomputeVisibility) window.recomputeVisibility();

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

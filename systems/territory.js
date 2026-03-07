// Territory & Settlement System for Samhold
// Handles territory calculation, fog of war, and settlement founding
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
      }
    }
  }
  if (window.setMapDirty) window.setMapDirty(true);
}

function recalcTerritory() {
  gameState.territory.clear();
  for (const s of gameState.settlements) {
    for (let r = 0; r < window.MAP_ROWS; r++) {
      for (let c = 0; c < window.MAP_COLS; c++) {
        if (window.cubeDistance(window.offsetToCube(c, r), window.offsetToCube(s.col, s.row)) <= window.TERRITORY_RADIUS) {
          gameState.territory.add(`${c},${r}`);
        }
      }
    }
  }
}

function canFoundSettlement(col, row) {
  const hex = gameState.map[row][col];

  if (hex.terrain === 'ocean' || hex.terrain === 'lake' || hex.terrain === 'mountain') {
    return false;
  }

  if (gameState.settlements.some(s => s.col === col && s.row === row)) {
    return false;
  }

  const MIN_SETTLEMENT_DISTANCE = 5;
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

function foundSettlement(col, row) {
  if (!canFoundSettlement(col, row)) {
    return false;
  }

  if (gameState.selectedUnit) {
    const index = gameState.units.findIndex(u => u.id === gameState.selectedUnit.id);
    if (index >= 0) {
      const unitType = window.UNIT_TYPES[gameState.selectedUnit.type];
      gameState.units.splice(index, 1);
      gameState.population.employed -= unitType.cost.population;
    }
    window.deselectUnit();
  }

  gameState.settlements.push({ col, row });

  recalcTerritory();

  gameState.cohesion.satisfaction = Math.min(100, gameState.cohesion.satisfaction + 10);
  gameState.cohesion.legitimacy = Math.min(100, gameState.cohesion.legitimacy + 5);
  gameState.cohesion.bonds = Math.max(0, gameState.cohesion.bonds - 8);

  if (window.setMapDirty) window.setMapDirty(true);
  return true;
}

function showSettlementFoundingConfirmation(col, row) {
  const hex = gameState.map[row][col];
  const terrain = window.TERRAIN[hex.terrain];

  window.showConfirmationDialog(
    'Found Settlement',
    `Found a new settlement on this ${terrain.name} hex?\n\n` +
    `This will consume your Settler and create a new territory center.\n\n` +
    `Effects:\n` +
    `+10 Satisfaction (excitement of expansion)\n` +
    `+5 Legitimacy (shows leadership strength)\n` +
    `-8 Bonds (physical separation weakens bonds)`,
    () => {
      if (foundSettlement(col, row)) {
        window.updateSidePanel(hex);
        if (window.render) window.render();
      }
    }
  );
}

export {
  initTerritory,
  hexHasRiver,
  revealArea,
  recalcTerritory,
  canFoundSettlement,
  foundSettlement,
  showSettlementFoundingConfirmation
};

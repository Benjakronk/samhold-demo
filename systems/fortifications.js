// ---- FORTIFICATIONS SYSTEM ----
// Manages hex-edge fortifications: palisades, walls, and gates

import { FORTIFICATIONS, WALL_INSET } from '../data/fortifications.js';
import { canonicalEdgeKey, hexNeighbor } from '../utils/hexMath.js';

let gameState = null;

export function initFortifications(gameStateRef) {
  gameState = gameStateRef;
}

// Get fortification at a specific edge
export function getFortification(col, row, edge) {
  const key = canonicalEdgeKey(col, row, edge);
  return gameState.fortifications[key] || null;
}

// Get all fortifications around a hex
export function getHexFortifications(col, row) {
  const result = [];
  for (let e = 0; e < 6; e++) {
    const fort = getFortification(col, row, e);
    if (fort) result.push({ edge: e, fort });
  }
  return result;
}

// Place a new fortification
export function placeFortification(col, row, edge, type) {
  const def = FORTIFICATIONS[type];
  if (!def) return false;

  // Validate territory
  if (!window.isInTerritory(col, row)) return false;

  // Check neighbor is valid (not off-map)
  const nb = hexNeighbor(col, row, edge);
  if (nb.col < 0 || nb.col >= window.MAP_COLS || nb.row < 0 || nb.row >= window.MAP_ROWS) return false;

  // Check no existing fort on this edge
  const key = canonicalEdgeKey(col, row, edge);
  if (gameState.fortifications[key]) return false;

  // Check cost
  if (gameState.resources.materials < def.cost.materials) return false;

  // Deduct materials
  gameState.resources.materials -= def.cost.materials;

  // Create fortification — store ownerCol/ownerRow so rendering insets toward the correct hex
  gameState.fortifications[key] = {
    type: type,
    health: def.health,
    maxHealth: def.health,
    buildProgress: def.buildTurns,
    workers: 0,
    ownerCol: col,
    ownerRow: row
  };

  // Auto-assign 1 builder if construction requires workers and idle population available
  if (def.buildTurns > 0 && def.buildWorkers > 0 && gameState.population.idle > 0) {
    gameState.fortifications[key].workers = 1;
  }

  if (window.setMapDirty) window.setMapDirty(true);
  if (window.updateAllUI) window.updateAllUI();
  return true;
}

// Upgrade palisade to wall
export function upgradeFortification(col, row, edge) {
  const key = canonicalEdgeKey(col, row, edge);
  const fort = gameState.fortifications[key];
  if (!fort || fort.type !== 'palisade' || fort.buildProgress > 0) return false;

  const wallDef = FORTIFICATIONS.wall;
  if (gameState.resources.materials < wallDef.upgradeCost.materials) return false;

  gameState.resources.materials -= wallDef.upgradeCost.materials;
  fort.type = 'wall';
  fort.health = wallDef.health;
  fort.maxHealth = wallDef.health;
  fort.buildProgress = wallDef.buildTurns;
  fort.workers = 0;

  // Auto-assign 1 builder if idle population available
  if (wallDef.buildTurns > 0 && wallDef.buildWorkers > 0 && gameState.population.idle > 0) {
    fort.workers = 1;
  }

  if (window.setMapDirty) window.setMapDirty(true);
  if (window.updateAllUI) window.updateAllUI();
  return true;
}

// Apply damage to a fortification. Returns true if destroyed.
export function damageFortification(col, row, edge, damage) {
  const key = canonicalEdgeKey(col, row, edge);
  const fort = gameState.fortifications[key];
  if (!fort) return false;

  fort.health -= damage;
  if (fort.health <= 0) {
    delete gameState.fortifications[key];
    if (window.addChronicleEntry) {
      window.addChronicleEntry(`A ${FORTIFICATIONS[fort.type]?.name || 'fortification'} was destroyed by attackers.`, 'military');
    }
    if (window.setMapDirty) window.setMapDirty(true);
    return true;
  }
  if (window.setMapDirty) window.setMapDirty(true);
  return false;
}

// Player demolishes a fortification (full refund during construction, half after)
export function demolishFortification(col, row, edge) {
  const key = canonicalEdgeKey(col, row, edge);
  const fort = gameState.fortifications[key];
  if (!fort) return false;

  const def = FORTIFICATIONS[fort.type];
  if (def) {
    const isConstruction = fort.buildProgress > 0;
    const refund = isConstruction ? def.cost.materials : Math.floor(def.cost.materials / 2);
    gameState.resources.materials += refund;
  }

  delete gameState.fortifications[key];
  if (window.setMapDirty) window.setMapDirty(true);
  if (window.updateAllUI) window.updateAllUI();
  return true;
}

// Process construction each turn — only advances if workers are assigned
export function processFortificationConstruction() {
  for (const [, fort] of Object.entries(gameState.fortifications)) {
    if (fort.buildProgress > 0 && fort.workers > 0) {
      fort.buildProgress = Math.max(0, fort.buildProgress - fort.workers);
      if (fort.buildProgress <= 0) {
        fort.workers = 0; // release builders (calculateIncome will update labor counts)
        const def = FORTIFICATIONS[fort.type];
        if (window.addChronicleEntry && def) {
          window.addChronicleEntry(`A ${def.name} fortification was completed.`, 'milestone');
        }
      }
    }
  }
}

// Assign one worker to a fortification under construction
export function assignFortWorker(col, row, edge) {
  const key = canonicalEdgeKey(col, row, edge);
  const fort = gameState.fortifications[key];
  if (!fort || fort.buildProgress <= 0) return false;
  const def = FORTIFICATIONS[fort.type];
  if (!def || fort.workers >= (def.buildWorkers || 1)) return false;
  if (gameState.population.idle <= 0) return false;

  fort.workers++;
  if (window.updateAllUI) window.updateAllUI();
  if (window.updateSidePanel && gameState.selectedHex) window.updateSidePanel(gameState.selectedHex);
  if (window.render) window.render();
  return true;
}

// Remove one worker from a fortification under construction
export function unassignFortWorker(col, row, edge) {
  const key = canonicalEdgeKey(col, row, edge);
  const fort = gameState.fortifications[key];
  if (!fort || fort.buildProgress <= 0 || fort.workers <= 0) return false;

  fort.workers--;
  if (window.updateAllUI) window.updateAllUI();
  if (window.updateSidePanel && gameState.selectedHex) window.updateSidePanel(gameState.selectedHex);
  if (window.render) window.render();
  return true;
}

// Check if an edge is blocked for movement
// Returns true if movement through this edge is blocked
export function isEdgeBlocked(col, row, edge, isFriendly) {
  const key = canonicalEdgeKey(col, row, edge);
  const fort = gameState.fortifications[key];
  if (!fort) return false;
  if (fort.buildProgress > 0) return false; // Under construction, not blocking yet

  // Gates allow friendly units through
  if (fort.type === 'gate' && isFriendly) return false;

  // Everything else blocks
  return true;
}

// Sum defense bonus from all completed forts within territory of a settlement
export function getSettlementFortificationBonus(settlementCol, settlementRow) {
  let bonus = 0;
  for (const [key, fort] of Object.entries(gameState.fortifications)) {
    if (fort.buildProgress > 0) continue;
    const def = FORTIFICATIONS[fort.type];
    if (!def) continue;

    // Parse the key to get hex coords
    const parts = key.split(',');
    const col = parseInt(parts[0]);
    const row = parseInt(parts[1]);

    const dist = window.cubeDistance(
      window.offsetToCube(col, row),
      window.offsetToCube(settlementCol, settlementRow)
    );
    if (dist <= window.TERRITORY_RADIUS) {
      bonus += def.defenseBonus;
    }
  }
  return bonus;
}

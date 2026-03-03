// ---- EXTERNAL THREATS SYSTEM ----
// Manages spawning, movement, and behavior of external threats like raiders, bandits, and warbands

export function spawnThreat(threatType, col, row) {
  if (!window.THREAT_TYPES[threatType]) {
    console.error(`Unknown threat type: ${threatType}`);
    return null;
  }

  const threatData = window.THREAT_TYPES[threatType];
  const threat = {
    id: `threat_${window.gameState.nextUnitId++}`, // reuse unit ID counter
    type: threatType,
    col: col,
    row: row,
    health: threatData.health,
    maxHealth: threatData.health,
    movementLeft: threatData.movement,
    lastDamage: 0, // for combat feedback
    target: null // will be set to nearest settlement
  };

  window.gameState.externalThreats.push(threat);
  window.mapDirty = true;
  return threat;
}

export function findRandomMapEdge() {
  // Pick a random edge of the map
  const edge = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left

  switch (edge) {
    case 0: // top
      return { col: Math.floor(Math.random() * window.MAP_COLS), row: 0 };
    case 1: // right
      return { col: window.MAP_COLS - 1, row: Math.floor(Math.random() * window.MAP_ROWS) };
    case 2: // bottom
      return { col: Math.floor(Math.random() * window.MAP_COLS), row: window.MAP_ROWS - 1 };
    case 3: // left
      return { col: 0, row: Math.floor(Math.random() * window.MAP_ROWS) };
  }
}

export function findNearestSettlement(threat) {
  if (window.gameState.settlements.length === 0) return null;

  let nearest = null;
  let nearestDistance = Infinity;

  for (const settlement of window.gameState.settlements) {
    const distance = window.cubeDistance(
      window.offsetToCube(threat.col, threat.row),
      window.offsetToCube(settlement.col, settlement.row)
    );

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = settlement;
    }
  }

  return nearest;
}

export function processThreats(report) {
  const threatsToRemove = [];

  for (const threat of window.gameState.externalThreats) {
    const threatType = window.THREAT_TYPES[threat.type];

    // Reset movement for this turn
    threat.movementLeft = threatType.movement;

    // Find target (nearest settlement)
    threat.target = findNearestSettlement(threat);

    if (threat.target) {
      // Move toward target
      const moved = moveThreatTowardTarget(threat);

      // Check if threat reached settlement
      const distanceToTarget = window.cubeDistance(
        window.offsetToCube(threat.col, threat.row),
        window.offsetToCube(threat.target.col, threat.target.row)
      );

      if (distanceToTarget <= 1) {
        // Threat reached settlement - attack it!
        attackSettlement(threat, threat.target, report);
        threatsToRemove.push(threat);
      }
    } else {
      // No settlements to target - remove threat
      threatsToRemove.push(threat);
    }
  }

  // Remove defeated or successful threats
  for (const threat of threatsToRemove) {
    const index = window.gameState.externalThreats.indexOf(threat);
    if (index >= 0) {
      window.gameState.externalThreats.splice(index, 1);
    }
  }

  window.mapDirty = true;
}

export function moveThreatTowardTarget(threat) {
  if (!threat.target || threat.movementLeft <= 0) return false;

  const threatType = window.THREAT_TYPES[threat.type];
  const targetPos = window.offsetToCube(threat.target.col, threat.target.row);
  const currentPos = window.offsetToCube(threat.col, threat.row);

  // Find best move toward target
  let bestMove = null;
  let bestDistance = window.cubeDistance(currentPos, targetPos);

  // Check all adjacent hexes
  for (let direction = 0; direction < 6; direction++) {
    const neighbor = window.hexNeighbor(threat.col, threat.row, direction);

    if (neighbor.col < 0 || neighbor.col >= window.MAP_COLS ||
        neighbor.row < 0 || neighbor.row >= window.MAP_ROWS) continue;

    const neighborHex = window.gameState.map[neighbor.row][neighbor.col];

    // Threats can't enter ocean
    if (neighborHex.terrain === 'ocean') continue;

    const neighborPos = window.offsetToCube(neighbor.col, neighbor.row);
    const distanceToTarget = window.cubeDistance(neighborPos, targetPos);

    if (distanceToTarget < bestDistance) {
      bestDistance = distanceToTarget;
      bestMove = neighbor;
    }
  }

  // Move to best position
  if (bestMove) {
    threat.col = bestMove.col;
    threat.row = bestMove.row;
    threat.movementLeft--;
    return true;
  }

  return false;
}

export function attackSettlement(threat, settlement, report) {
  const threatType = window.THREAT_TYPES[threat.type];

  // Calculate damage based on threat strength vs defenses
  const defensiveStrength = calculateDefensiveStrength(settlement);
  const attackStrength = threatType.combat;

  if (attackStrength > defensiveStrength) {
    // Successful attack
    const damage = attackStrength - defensiveStrength;
    applyRaidDamage(damage, report);

    report.events.push(`🏴‍☠️ ${threatType.name} ${threatType.icon} raided your settlement! The attack caused significant damage.`);

    // Major cohesion hit from successful raid
    window.gameState.cohesion.satisfaction = Math.max(0, window.gameState.cohesion.satisfaction - 15);
    window.gameState.cohesion.legitimacy = Math.max(0, window.gameState.cohesion.legitimacy - 10);
    window.gameState.cohesion.bonds = Math.max(0, window.gameState.cohesion.bonds - 5);
  } else {
    // Attack repelled
    report.events.push(`⚔️ ${threatType.name} ${threatType.icon} attacked your settlement but were repelled by your defenses!`);

    // Small legitimacy boost for successful defense
    window.gameState.cohesion.legitimacy = Math.min(100, window.gameState.cohesion.legitimacy + 5);
  }
}

export function calculateDefensiveStrength(settlement) {
  let strength = 0;

  // Count warriors within 2 hexes of settlement
  for (const unit of window.gameState.units) {
    if (unit.type === 'warrior') {
      const distance = window.cubeDistance(
        window.offsetToCube(unit.col, unit.row),
        window.offsetToCube(settlement.col, settlement.row)
      );

      if (distance <= 2) {
        const unitType = window.UNIT_TYPES[unit.type];
        strength += unitType.combat * (unit.health / 100); // reduced by damage
      }
    }
  }

  // Add defensive buildings bonus (future: walls, watchtowers, etc.)
  // For now, settlements provide base defense
  strength += 1; // base settlement defense

  return Math.floor(strength);
}

export function applyRaidDamage(damage, report) {
  // Raids steal resources and may kill population
  const foodLoss = Math.min(window.gameState.resources.food, damage * 20);
  const materialLoss = Math.min(window.gameState.resources.materials, damage * 10);

  window.gameState.resources.food -= foodLoss;
  window.gameState.resources.materials -= materialLoss;

  report.events.push(`💔 Raiders stole ${foodLoss} food and ${materialLoss} materials.`);

  // Severe raids may cause population loss
  if (damage >= 3 && window.gameState.population.total > 1) {
    const popLoss = Math.min(damage - 2, Math.floor(window.gameState.population.total * 0.1));
    window.gameState.population.total -= popLoss;
    window.gameState.population.idle = Math.max(0, window.gameState.population.idle - popLoss);

    report.events.push(`💀 ${popLoss} people were killed or captured in the raid.`);
  }
}

export function shouldSpawnThreat() {
  // Simple spawning logic - chance increases with time and prosperity
  if (window.gameState.turn < 15) return false; // Extended early game safety for better tutorial experience

  let spawnChance = 0.015; // Reduced base chance for better pacing

  // Increase chance based on turn number
  spawnChance += (window.gameState.turn - 15) * 0.0008; // Slightly reduced scaling

  // Increase chance if player is prosperous (attracts raiders)
  if (window.gameState.resources.food > 300) spawnChance += 0.01;
  if (window.gameState.resources.materials > 100) spawnChance += 0.01;

  // Decrease chance if there are already threats
  spawnChance -= window.gameState.externalThreats.length * 0.01;

  return Math.random() < spawnChance;
}

export function checkThreatSpawning(report) {
  if (shouldSpawnThreat()) {
    const edgePos = findRandomMapEdge();

    // Choose threat type based on turn number
    let threatType = 'raiders'; // default
    if (window.gameState.turn > 30 && Math.random() < 0.3) threatType = 'bandits';
    if (window.gameState.turn > 50 && Math.random() < 0.2) threatType = 'warband';

    const threat = spawnThreat(threatType, edgePos.col, edgePos.row);

    if (threat) {
      const threatTypeData = window.THREAT_TYPES[threatType];
      report.events.push(`⚠️ ${threatTypeData.name} ${threatTypeData.icon} spotted on the horizon! They appear hostile.`);
    }
  }
}
// ---- EXTERNAL THREATS SYSTEM ----
// Manages spawning, movement, and behavior of external threats like raiders, bandits, and warbands
// Also manages bandit camps — persistent hostile structures that spawn in the wilderness

// ---- THREAT SPAWNING ----

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
  if (window.setMapDirty) window.setMapDirty(true);
  return threat;
}

/**
 * Find a spawn location for threats.
 * Prefers fog-of-war (vis 0) or revealed (vis 1) hexes near territory.
 * Falls back to map edge if no suitable hex is found.
 */
export function findSpawnLocation() {
  const gs = window.gameState;
  const visMap = gs.visibilityMap;
  const candidates = [];

  for (let r = 0; r < window.MAP_ROWS; r++) {
    for (let c = 0; c < window.MAP_COLS; c++) {
      const hex = gs.map[r][c];
      if (hex.terrain === 'ocean' || hex.terrain === 'lake') continue;
      // Must not be actively visible (player can't see the hex)
      const vis = visMap?.[r]?.[c] ?? 0;
      if (vis >= 2) continue;
      // Must not be in territory
      if (gs.territory.has(`${c},${r}`)) continue;
      // Must not have a building, settlement, unit, or existing threat/camp on it
      if (hex.building) continue;
      if (gs.externalThreats.some(t => t.col === c && t.row === r)) continue;
      if (gs.banditCamps.some(bc => bc.col === c && bc.row === r)) continue;

      // Score: prefer hexes near territory (3-8 hex distance from nearest settlement)
      let minDist = Infinity;
      for (const s of gs.settlements) {
        const d = window.cubeDistance(
          window.offsetToCube(c, r),
          window.offsetToCube(s.col, s.row)
        );
        if (d < minDist) minDist = d;
      }

      // Sweet spot: 3-8 hexes from settlement. Too close is unfair, too far is boring.
      if (minDist >= 3 && minDist <= 8) {
        candidates.push({ col: c, row: r, dist: minDist, vis });
      }
    }
  }

  if (candidates.length > 0) {
    // Prefer fog-of-war (vis 0) over revealed (vis 1)
    const fogCandidates = candidates.filter(c => c.vis === 0);
    const pool = fogCandidates.length > 0 ? fogCandidates : candidates;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // Fallback: map edge (original behavior)
  return findRandomMapEdge();
}

export function findRandomMapEdge() {
  // Pick a random edge position, retry if ocean (cap at 20 attempts)
  for (let attempt = 0; attempt < 20; attempt++) {
    const edge = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left
    let col, row;

    switch (edge) {
      case 0: col = Math.floor(Math.random() * window.MAP_COLS); row = 0; break;
      case 1: col = window.MAP_COLS - 1; row = Math.floor(Math.random() * window.MAP_ROWS); break;
      case 2: col = Math.floor(Math.random() * window.MAP_COLS); row = window.MAP_ROWS - 1; break;
      case 3: col = 0; row = Math.floor(Math.random() * window.MAP_ROWS); break;
    }

    const hex = window.gameState?.map?.[row]?.[col];
    if (hex && hex.terrain !== 'ocean' && hex.terrain !== 'lake') {
      return { col, row };
    }
  }
  // Fallback: return any land edge hex
  for (let r = 0; r < window.MAP_ROWS; r++) {
    for (const c of [0, window.MAP_COLS - 1]) {
      const hex = window.gameState?.map?.[r]?.[c];
      if (hex && hex.terrain !== 'ocean' && hex.terrain !== 'lake') return { col: c, row: r };
    }
  }
  return { col: 0, row: 0 };
}

// ---- THREAT MOVEMENT & COMBAT ----

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

  if (window.setMapDirty) window.setMapDirty(true);
}

export function moveThreatTowardTarget(threat) {
  if (!threat.target || threat.movementLeft <= 0) return false;

  const threatType = window.THREAT_TYPES[threat.type];
  const targetPos = window.offsetToCube(threat.target.col, threat.target.row);
  const currentPos = window.offsetToCube(threat.col, threat.row);

  // Find best move toward target
  let bestMove = null;
  let bestDistance = window.cubeDistance(currentPos, targetPos);
  let bestBlockedEdge = null;
  let bestBlockedDist = Infinity;

  // Check all adjacent hexes
  for (let direction = 0; direction < 6; direction++) {
    const neighbor = window.hexNeighbor(threat.col, threat.row, direction);

    if (neighbor.col < 0 || neighbor.col >= window.MAP_COLS ||
        neighbor.row < 0 || neighbor.row >= window.MAP_ROWS) continue;

    const neighborHex = window.gameState.map[neighbor.row][neighbor.col];

    // Threats can't enter ocean or lake
    if (neighborHex.terrain === 'ocean' || neighborHex.terrain === 'lake') continue;

    // Check if edge is blocked by fortification (enemies can't pass walls/palisades)
    if (window.isEdgeBlocked && window.isEdgeBlocked(threat.col, threat.row, direction, false)) {
      // Track as potential wall-attack target
      const neighborPos = window.offsetToCube(neighbor.col, neighbor.row);
      const distanceToTarget = window.cubeDistance(neighborPos, targetPos);
      if (distanceToTarget < bestBlockedDist) {
        bestBlockedDist = distanceToTarget;
        bestBlockedEdge = direction;
      }
      continue;
    }

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
    // Check if the threat has moved onto a sacred place
    if (window.checkDesecration) window.checkDesecration(bestMove.col, bestMove.row, null);
    return true;
  }

  // No unblocked move — attack the wall blocking the path
  if (bestBlockedEdge != null && window.damageFortification) {
    const damage = threatType.combat * 10;
    const destroyed = window.damageFortification(threat.col, threat.row, bestBlockedEdge, damage);
    threat.movementLeft--;
    if (destroyed) {
      if (window.addChronicleEntry) {
        window.addChronicleEntry(`${threatType.name} breached our fortifications!`, 'military');
      }
    }
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

    // Damage settlement health
    if (window.damageSettlement) {
      window.damageSettlement(settlement.col, settlement.row, damage * 10);
    }

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

    // If fortifications helped repel the attack, they take damage from the assault
    const fortBonus = window.getSettlementFortificationBonus
      ? window.getSettlementFortificationBonus(settlement.col, settlement.row)
      : 0;
    if (fortBonus > 0 && window.damageFortification && window.hexNeighbor) {
      // Find the edge direction from threat toward settlement
      for (let dir = 0; dir < 6; dir++) {
        const neighbor = window.hexNeighbor(threat.col, threat.row, dir);
        if (neighbor.col === settlement.col && neighbor.row === settlement.row) {
          const damage = threatType.combat * 8;
          const destroyed = window.damageFortification(threat.col, threat.row, dir, damage);
          if (destroyed && window.addChronicleEntry) {
            window.addChronicleEntry(`${threatType.name} broke through our fortifications during the assault!`, 'military');
          }
          break;
        }
      }
    }
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

  // Fortification defense bonus
  if (window.getSettlementFortificationBonus) {
    strength += window.getSettlementFortificationBonus(settlement.col, settlement.row);
  }

  // Watchtower defense bonus — each staffed watchtower in territory adds 1
  for (let r = 0; r < window.MAP_ROWS; r++) {
    for (let c = 0; c < window.MAP_COLS; c++) {
      const hex = window.gameState.map[r][c];
      if (hex.building === 'watchtower' && hex.buildProgress <= 0 && hex.workers > 0) {
        if (window.isInTerritory && window.isInTerritory(c, r)) {
          strength += 1;
        }
      }
    }
  }

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
    if (window.removeFromAdultCohorts) window.removeFromAdultCohorts(popLoss);

    report.events.push(`💀 ${popLoss} people were killed or captured in the raid.`);
  }
}

// ---- THREAT SPAWNING LOGIC ----

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
    // Use new spawn location system (fog/revealed near territory) instead of map edge only
    const spawnPos = findSpawnLocation();

    // Choose threat type based on turn number
    let threatType = 'raiders'; // default
    if (window.gameState.turn > 30 && Math.random() < 0.3) threatType = 'bandits';
    if (window.gameState.turn > 50 && Math.random() < 0.2) threatType = 'warband';

    const threat = spawnThreat(threatType, spawnPos.col, spawnPos.row);

    if (threat) {
      const threatTypeData = window.THREAT_TYPES[threatType];
      // Only report if player can see the spawn hex
      const vis = window.gameState.visibilityMap?.[spawnPos.row]?.[spawnPos.col] ?? 0;
      if (vis >= 1) {
        report.events.push(`⚠️ ${threatTypeData.name} ${threatTypeData.icon} spotted in the wilderness! They appear hostile.`);
      }
      if (window.addChronicleEntry) window.addChronicleEntry(`${threatTypeData.name} were spotted approaching from the wilderness. The people brace for conflict.`, 'military');
    }
  }

  // Process bandit camp spawning and threat generation
  checkBanditCampSpawning(report);
  processBanditCamps(report);
}

// ---- BANDIT CAMPS ----

const BANDIT_CAMP_HEALTH = 150;
const BANDIT_CAMP_SPAWN_INTERVAL = 3; // spawn a threat every N turns
const BANDIT_CAMP_LOOT_FOOD = 40;
const BANDIT_CAMP_LOOT_MATERIALS = 20;

export function spawnBanditCamp(col, row) {
  const camp = {
    id: `camp_${window.gameState.nextUnitId++}`,
    col,
    row,
    health: BANDIT_CAMP_HEALTH,
    maxHealth: BANDIT_CAMP_HEALTH,
    turnSpawned: window.gameState.turn,
    lastSpawnTurn: window.gameState.turn, // when it last spawned a threat
    threatsSpawned: 0
  };

  window.gameState.banditCamps.push(camp);
  if (window.setMapDirty) window.setMapDirty(true);
  return camp;
}

/**
 * Find a valid location for a bandit camp.
 * Must be on land, outside player vision, outside territory, minimum 5 hexes from settlement.
 */
function findBanditCampLocation() {
  const gs = window.gameState;
  const visMap = gs.visibilityMap;
  const candidates = [];

  for (let r = 0; r < window.MAP_ROWS; r++) {
    for (let c = 0; c < window.MAP_COLS; c++) {
      const hex = gs.map[r][c];
      if (hex.terrain === 'ocean' || hex.terrain === 'lake' || hex.terrain === 'mountain') continue;
      const vis = visMap?.[r]?.[c] ?? 0;
      if (vis >= 2) continue; // must not be actively visible
      if (gs.territory.has(`${c},${r}`)) continue;
      if (hex.building) continue;
      if (gs.externalThreats.some(t => t.col === c && t.row === r)) continue;
      if (gs.banditCamps.some(bc => bc.col === c && bc.row === r)) continue;

      // Minimum distance 5 from any settlement
      let minDist = Infinity;
      for (const s of gs.settlements) {
        const d = window.cubeDistance(
          window.offsetToCube(c, r),
          window.offsetToCube(s.col, s.row)
        );
        if (d < minDist) minDist = d;
      }
      if (minDist < 5) continue;

      // Preferred range: 5-10 hexes from a settlement
      if (minDist <= 10) {
        candidates.push({ col: c, row: r, dist: minDist, vis });
      }
    }
  }

  if (candidates.length === 0) return null;

  // Prefer fog-of-war hexes
  const fogCandidates = candidates.filter(c => c.vis === 0);
  const pool = fogCandidates.length > 0 ? fogCandidates : candidates;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function checkBanditCampSpawning(report) {
  const gs = window.gameState;
  if (gs.turn < 20) return; // no camps before turn 20

  // Max camps: 1 per 30 population, minimum 1
  const maxCamps = Math.max(1, Math.floor((gs.population.total + getTotalChildrenForThreats()) / 30));
  if (gs.banditCamps.length >= maxCamps) return;

  // Spawn chance: 3% base, increasing slightly over time
  let chance = 0.03 + (gs.turn - 20) * 0.001;
  // Reduce chance if there are already camps
  chance -= gs.banditCamps.length * 0.02;
  if (Math.random() >= chance) return;

  const loc = findBanditCampLocation();
  if (!loc) return;

  const camp = spawnBanditCamp(loc.col, loc.row);
  if (camp) {
    // Only report if the hex is revealed (player saw this area before)
    const vis = gs.visibilityMap?.[loc.row]?.[loc.col] ?? 0;
    if (vis >= 1) {
      report.events.push(`🏕️ Reports suggest a bandit camp has been established in the wilderness!`);
    }
    if (window.addChronicleEntry) {
      window.addChronicleEntry('Rumors spread of bandits establishing a camp in the surrounding wilderness. They may pose a growing threat.', 'military');
    }
  }
}

function getTotalChildrenForThreats() {
  return window.getTotalChildren ? window.getTotalChildren() : 0;
}

export function processBanditCamps(report) {
  const gs = window.gameState;

  for (const camp of gs.banditCamps) {
    // Each camp spawns a threat every BANDIT_CAMP_SPAWN_INTERVAL turns
    if (gs.turn - camp.lastSpawnTurn >= BANDIT_CAMP_SPAWN_INTERVAL) {
      // Spawn a raider or bandit near the camp
      const spawnHex = findCampSpawnHex(camp);
      if (spawnHex) {
        const threatType = Math.random() < 0.6 ? 'raiders' : 'bandits';
        const threat = spawnThreat(threatType, spawnHex.col, spawnHex.row);
        if (threat) {
          camp.lastSpawnTurn = gs.turn;
          camp.threatsSpawned++;
          const vis = gs.visibilityMap?.[spawnHex.row]?.[spawnHex.col] ?? 0;
          if (vis >= 2) {
            const threatTypeData = window.THREAT_TYPES[threatType];
            report.events.push(`⚠️ ${threatTypeData.name} ${threatTypeData.icon} emerged from a bandit camp!`);
          }
        }
      }
    }
  }
}

/**
 * Find a hex adjacent to a bandit camp to spawn a threat on.
 */
function findCampSpawnHex(camp) {
  const options = [];
  for (let dir = 0; dir < 6; dir++) {
    const nb = window.hexNeighbor(camp.col, camp.row, dir);
    if (nb.col < 0 || nb.col >= window.MAP_COLS || nb.row < 0 || nb.row >= window.MAP_ROWS) continue;
    const hex = window.gameState.map[nb.row][nb.col];
    if (hex.terrain === 'ocean' || hex.terrain === 'lake') continue;
    // Don't stack threats
    if (window.gameState.externalThreats.some(t => t.col === nb.col && t.row === nb.row)) continue;
    options.push(nb);
  }
  if (options.length === 0) return null;
  return options[Math.floor(Math.random() * options.length)];
}

// ---- BANDIT CAMP COMBAT ----

/**
 * Check if a warrior unit can attack a bandit camp (adjacent).
 */
export function canAttackBanditCamp(unit, camp) {
  if (!unit || !camp) return false;
  const unitType = window.UNIT_TYPES[unit.type];
  if (!unitType.combat || unitType.combat <= 0) return false;
  if (unit.health <= 0) return false;
  const dist = window.cubeDistance(
    window.offsetToCube(unit.col, unit.row),
    window.offsetToCube(camp.col, camp.row)
  );
  return dist <= 1;
}

/**
 * Attack a bandit camp with a warrior unit.
 * Returns a result object similar to combat results.
 */
export function attackBanditCamp(unit, camp) {
  if (!canAttackBanditCamp(unit, camp)) return null;

  const unitType = window.UNIT_TYPES[unit.type];
  let unitCombat = unitType.combat * (unit.health / 100);

  // Military rule combat bonuses
  const milBonuses = window.getMilitaryCombatBonuses ? window.getMilitaryCombatBonuses() : null;
  if (milBonuses) unitCombat *= (1 + milBonuses.attackBonus);

  // Randomness ±25%
  unitCombat *= (0.75 + Math.random() * 0.5);

  // Camp fights back (combat 2, like raiders)
  const campCombat = 2 * (camp.health / camp.maxHealth) * (0.75 + Math.random() * 0.5);

  const damageTocamp = Math.max(5, Math.floor(unitCombat * 15));
  const damageToUnit = Math.max(3, Math.floor(campCombat * 10));

  camp.health = Math.max(0, camp.health - damageTocamp);
  unit.health = Math.max(0, unit.health - damageToUnit);
  unit.lastDamage = damageToUnit;

  if (window.setMapDirty) window.setMapDirty(true);

  if (camp.health <= 0) {
    return { result: 'camp_destroyed', damageTocamp, damageToUnit, unitHealth: unit.health };
  } else if (unit.health <= 0) {
    return { result: 'unit_defeated', damageTocamp, damageToUnit, unitHealth: unit.health };
  } else {
    return { result: 'ongoing', damageTocamp, damageToUnit, unitHealth: unit.health, campHealth: camp.health };
  }
}

/**
 * Handle camp destruction: remove camp, grant loot and cohesion.
 */
export function destroyBanditCamp(camp, attackingUnit) {
  const gs = window.gameState;
  const index = gs.banditCamps.indexOf(camp);
  if (index < 0) return;

  gs.banditCamps.splice(index, 1);

  // Loot
  gs.resources.food += BANDIT_CAMP_LOOT_FOOD;
  gs.resources.materials += BANDIT_CAMP_LOOT_MATERIALS;

  // Cohesion rewards
  gs.cohesion.legitimacy = Math.min(100, gs.cohesion.legitimacy + 8);
  gs.cohesion.satisfaction = Math.min(100, gs.cohesion.satisfaction + 5);
  gs.cohesion.bonds = Math.min(100, gs.cohesion.bonds + 3);

  // Track battle for sacred site
  if (gs.culture) gs.culture.battleOccurred = true;

  // Notify governance system of combat victory
  if (window.onCombatVictory) window.onCombatVictory();

  if (window.addChronicleEntry) {
    window.addChronicleEntry(
      `Our warriors destroyed a bandit camp in the wilderness! The people celebrated, and supplies were recovered from the ruins.`,
      'military'
    );
  }

  if (window.showNotification) {
    window.showNotification(
      `Bandit camp destroyed! +${BANDIT_CAMP_LOOT_FOOD} food, +${BANDIT_CAMP_LOOT_MATERIALS} materials`,
      'success'
    );
  }

  if (window.setMapDirty) window.setMapDirty(true);
  if (window.updateAllUI) window.updateAllUI();
}

/**
 * Get bandit camp at a given hex, if any.
 */
export function getBanditCampAt(col, row) {
  return window.gameState.banditCamps.find(c => c.col === col && c.row === row) || null;
}

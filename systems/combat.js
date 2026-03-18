// ---- COMBAT SYSTEM ----
// Manages unit vs threat combat, damage calculation, and combat resolution

export function initiateCombat(unit, threat) {
  if (!unit || !threat) return null;

  const unitType = window.UNIT_TYPES[unit.type];
  const threatType = window.THREAT_TYPES[threat.type];

  // Only units with combat ability can fight
  if (!unitType.combat || unitType.combat <= 0) {
    return {
      result: 'no_combat',
      message: `${unitType.name} cannot engage in combat.`
    };
  }

  const combatResult = resolveCombat(unit, threat);

  // Apply combat results
  unit.health = Math.max(0, unit.health - combatResult.unitDamage);
  threat.health = Math.max(0, threat.health - combatResult.threatDamage);

  // Store damage for visual feedback
  unit.lastDamage = combatResult.unitDamage;
  threat.lastDamage = combatResult.threatDamage;

  // Determine overall result
  let result;
  let message;

  if (unit.health <= 0 && threat.health <= 0) {
    result = 'mutual_destruction';
    message = `${unitType.name} and ${threatType.name} destroyed each other!`;
  } else if (unit.health <= 0) {
    result = 'unit_defeated';
    message = `${unitType.name} was defeated by ${threatType.name}!`;
  } else if (threat.health <= 0) {
    result = 'threat_defeated';
    message = `${unitType.name} defeated ${threatType.name}!`;
  } else {
    result = 'ongoing';
    message = `${unitType.name} and ${threatType.name} exchange blows!`;
  }

  return {
    result: result,
    message: message,
    unitDamage: combatResult.unitDamage,
    threatDamage: combatResult.threatDamage,
    unitHealth: unit.health,
    threatHealth: threat.health
  };
}

export function resolveCombat(unit, threat) {
  const unitType = window.UNIT_TYPES[unit.type];
  const threatType = window.THREAT_TYPES[threat.type];

  // Base combat values
  let unitCombat = unitType.combat * (unit.health / 100); // reduced by damage
  let threatCombat = threatType.combat * (threat.health / threat.maxHealth);

  // Apply military rule combat bonuses if active
  const milBonuses = window.getMilitaryCombatBonuses ? window.getMilitaryCombatBonuses() : null;
  if (milBonuses) {
    unitCombat *= (1 + milBonuses.attackBonus);
    threatCombat *= (1 - milBonuses.defenseBonus);
  }

  // Add some randomness (±25%)
  const unitRoll = 0.75 + Math.random() * 0.5;
  const threatRoll = 0.75 + Math.random() * 0.5;

  unitCombat *= unitRoll;
  threatCombat *= threatRoll;

  // Calculate damage dealt to each combatant
  const unitDamage = Math.max(5, Math.floor(threatCombat * 15)); // threat damages unit
  const threatDamage = Math.max(5, Math.floor(unitCombat * 15)); // unit damages threat

  return {
    unitDamage: unitDamage,
    threatDamage: threatDamage
  };
}

export function checkForCombatOpportunities() {
  const combatResults = [];

  // Check each threat against nearby units
  for (const threat of window.gameState.externalThreats) {
    const nearbyUnits = findUnitsInRange(threat.col, threat.row, 1);

    for (const unit of nearbyUnits) {
      const unitType = window.UNIT_TYPES[unit.type];

      // Only combat-capable units can fight
      if (unitType.combat > 0) {
        const result = initiateCombat(unit, threat);
        if (result && result.result !== 'no_combat') {
          combatResults.push(result);
        }
      }
    }
  }

  return combatResults;
}

export function findUnitsInRange(col, row, range) {
  return window.gameState.units.filter(unit => {
    const distance = window.cubeDistance(
      window.offsetToCube(col, row),
      window.offsetToCube(unit.col, unit.row)
    );
    return distance <= range && unit.health > 0;
  });
}

export function processCombatPhase(report) {
  const combatResults = checkForCombatOpportunities();
  const unitsToRemove = [];
  const threatsToRemove = [];

  for (const result of combatResults) {
    report.events.push(`⚔️ ${result.message}`);

    // Handle unit destruction
    if (result.result === 'unit_defeated' || result.result === 'mutual_destruction') {
      const deadUnit = window.gameState.units.find(u => u.health <= 0);
      if (deadUnit && !unitsToRemove.includes(deadUnit)) {
        unitsToRemove.push(deadUnit);
      }
    }

    // Handle threat destruction
    if (result.result === 'threat_defeated' || result.result === 'mutual_destruction') {
      const deadThreat = window.gameState.externalThreats.find(t => t.health <= 0);
      if (deadThreat && !threatsToRemove.includes(deadThreat)) {
        threatsToRemove.push(deadThreat);
      }
      // Track that a battle has occurred (unlocks battle_site sacred site)
      if (window.gameState.culture) window.gameState.culture.battleOccurred = true;
    }
  }

  // Remove dead units
  for (const deadUnit of unitsToRemove) {
    const index = window.gameState.units.indexOf(deadUnit);
    if (index >= 0) {
      window.gameState.units.splice(index, 1);
      const unitType = window.UNIT_TYPES[deadUnit.type];

      // Track deaths for tradition unlocks
      if (window.gameState.culture) window.gameState.culture.deathsOccurred = true;

      // Death in combat — person is gone permanently
      window.gameState.population.employed -= unitType.cost.population;
      window.gameState.population.total -= unitType.cost.population;

      // Notify governance system of combat defeat (military rule fragility)
      if (window.onCombatDefeat) window.onCombatDefeat();

      // Loss affects cohesion differently based on unit type
      if (deadUnit.type === 'elder') {
        window.gameState.cohesion.identity = Math.max(0, window.gameState.cohesion.identity - 20);
        report.events.push(`💔 The loss of the Elder devastates cultural knowledge!`);
        if (window.addChronicleEntry) window.addChronicleEntry('An Elder fell in battle. With their passing, stories and wisdom were lost that can never be recovered.', 'military');
      } else {
        window.gameState.cohesion.satisfaction = Math.max(0, window.gameState.cohesion.satisfaction - 5);
        window.gameState.cohesion.legitimacy = Math.max(0, window.gameState.cohesion.legitimacy - 3);
        if (window.addChronicleEntry) window.addChronicleEntry(`A ${unitType.name} was lost in combat. The settlement mourns.`, 'military');
      }
    }
  }

  // Remove dead threats
  for (const deadThreat of threatsToRemove) {
    const index = window.gameState.externalThreats.indexOf(deadThreat);
    if (index >= 0) {
      window.gameState.externalThreats.splice(index, 1);

      // Victory boosts morale
      window.gameState.cohesion.legitimacy = Math.min(100, window.gameState.cohesion.legitimacy + 8);
      window.gameState.cohesion.satisfaction = Math.min(100, window.gameState.cohesion.satisfaction + 5);
      const threatName = window.THREAT_TYPES[deadThreat.type]?.name || 'threat';
      if (window.addChronicleEntry) window.addChronicleEntry(`The ${threatName} were defeated. The people celebrated their defenders and felt safer in their land.`, 'military');

      // Notify governance system of combat victory (military rule commander strength)
      if (window.onCombatVictory) window.onCombatVictory();
    }
  }

  if (combatResults.length > 0) {
    if (window.setMapDirty) window.setMapDirty(true);
  }
}

export function canUnitAttackThreat(unit, threat) {
  const distance = window.cubeDistance(
    window.offsetToCube(unit.col, unit.row),
    window.offsetToCube(threat.col, threat.row)
  );

  const unitType = window.UNIT_TYPES[unit.type];
  return distance <= 1 && unitType.combat > 0 && unit.health > 0;
}
// ---- GOVERNANCE MODELS ----
// Defines different governance systems available to the player and their effects

export const GOVERNANCE_MODELS = {
  tribalCouncil: {
    name: "Tribal Council",
    icon: "🏛️",
    description: "Decisions made by council of elders",
    decisionSpeed: "Slow",
    legitimacySource: "Tradition & elders",
    freedomLevel: "High",
    fragility: "Low",
    bestWhen: "Small population, peaceful times",
    effects: {
      legitimacy: { base: 65, traditionBonus: 0.5, timeStabilityBonus: 0.2 },
      satisfaction: { freedomBonus: 0.3 },
      identity: { traditionBonus: 0.4 },
      bonds: { stabilityBonus: 0.2 }
    },
    policyEffects: {
      tradition: { multiplier: 1.5 }, // Traditional policies more effective
      freedom: { multiplier: 1.2 },   // Freedom policies align with model
      mercy: { multiplier: 1.0 },     // Neutral on mercy/severity
      isolation: { multiplier: 1.3 }  // Naturally insular small community
    },
    lagMultiplier: 1.4  // Consensus required — slowest implementation
  },
  chieftain: {
    name: "Chieftain",
    icon: "👑",
    description: "Single strong leader makes decisions",
    decisionSpeed: "Fast",
    legitimacySource: "Personal charisma & strength",
    freedomLevel: "Medium",
    fragility: "Medium",
    bestWhen: "Growing society, moderate threats",
    effects: {
      legitimacy: { base: 70, satisfactionDependency: 0.8 },
      satisfaction: { controlBonus: 0.2 },
      identity: { leadershipBonus: 0.2 },
      bonds: { unityBonus: 0.3 }
    },
    policyEffects: {
      freedom: { multiplier: 0.8 },   // Freedom less effective under personal rule
      mercy: { multiplier: 1.3 },     // Mercy/severity more impactful
      tradition: { multiplier: 0.9 }, // Slightly less traditional emphasis
      isolation: { multiplier: 1.0 }  // Neutral
    },
    lagMultiplier: 0.7  // Single ruler — directives propagate fast
  },
  theocracy: {
    name: "Theocracy",
    icon: "⛪",
    description: "Religious authority governs society",
    decisionSpeed: "Medium",
    legitimacySource: "Divine mandate & faith",
    freedomLevel: "Low",
    fragility: "Medium",
    bestWhen: "Strong shared beliefs, external threats",
    effects: {
      legitimacy: { base: 75, identityDependency: 0.6 },
      satisfaction: { orderBonus: 0.4, freedomPenalty: -0.2 },
      identity: { faithBonus: 0.6 },
      bonds: { sharedBeliefBonus: 0.4 }
    },
    policyEffects: {
      tradition: { multiplier: 1.4 },  // Strong traditional emphasis
      freedom: { multiplier: 0.6 },    // Freedom policies less effective
      mercy: { multiplier: 1.2 },      // Religious mercy/justice important
      isolation: { multiplier: 1.2 }   // Faith-based borders tend toward insularity
    },
    lagMultiplier: 1.0  // Base; directional overrides apply separately
  },
  monarchy: {
    name: "Monarchy",
    icon: "🪙",
    description: "Hereditary rule with dynastic legitimacy",
    decisionSpeed: "Fast",
    legitimacySource: "Bloodline & dynastic tradition",
    freedomLevel: "Low-Medium",
    fragility: "High (succession dependent)",
    bestWhen: "Large, stable society needing continuity",
    effects: {
      legitimacy: { base: 60, dynastyAgeBonus: 0.5, heirQualityDependency: 0.4 },
      satisfaction: { freedomPenalty: -0.1 },
      identity: { dynastyBonus: 0.3 },
      bonds: { stabilityBonus: 0.2, successionPenalty: -0.8 }
    },
    policyEffects: {
      tradition: { multiplier: 1.3 },
      freedom: { multiplier: 0.7 },
      mercy: { multiplier: 1.1 },
      isolation: { multiplier: 1.0 }
    },
    lagMultiplier: 0.85,  // Court structure — faster than council, slower than chieftain
    requirements: {
      minPopulation: 30,
      minTurns: 20
    }
  },
  militaryRule: {
    name: "Military Rule",
    icon: "⚔️",
    description: "Rule by force and martial strength",
    decisionSpeed: "Very fast",
    legitimacySource: "Force & protection from threats",
    freedomLevel: "Very low",
    fragility: "Very high",
    bestWhen: "Existential external threat",
    effects: {
      legitimacy: { base: 55, combatVictoryBonus: 1.0, combatDefeatPenalty: -2.0 },
      satisfaction: { controlBonus: 0.2, freedomPenalty: -0.4 },
      identity: { militaryBonus: 0.2 },
      bonds: { fearBonus: 0.1, unityBonus: 0.1 }
    },
    policyEffects: {
      freedom: { multiplier: 0.4, maxValue: 20 },
      mercy: { multiplier: 1.5 },
      tradition: { multiplier: 0.7 },
      isolation: { multiplier: 0.8 }
    },
    combatBonuses: {
      unitAttack: 1.3,
      unitDefense: 1.2,
      trainingSpeed: 0.5
    },
    lagMultiplier: 0.6,  // Command structure — very fast implementation
    requirements: {
      minWarriors: 2
    }
  },
  democracy: {
    name: "Democracy",
    icon: "🗳️",
    description: "Decisions made by popular vote",
    decisionSpeed: "Very slow",
    legitimacySource: "Popular mandate & participation",
    freedomLevel: "Very high",
    fragility: "Medium (fragile in famine)",
    bestWhen: "Wealthy, stable, educated society",
    effects: {
      legitimacy: { base: 70, satisfactionDependency: 1.0, knowledgeDependency: 0.4 },
      satisfaction: { freedomBonus: 0.5, participationBonus: 0.3 },
      identity: { diversityBonus: 0.1, debateBonus: 0.2 },
      bonds: { participationBonus: 0.3 }
    },
    policyEffects: {
      freedom: { multiplier: 1.4, minValue: 40 },
      mercy: { multiplier: 1.1 },
      tradition: { multiplier: 0.8 },
      isolation: { multiplier: 0.9 }
    },
    lagMultiplier: 1.2,  // Voting processes slow things down
    requirements: {
      minKnowledge: 30,
      minPopulation: 30
    }
  }
};
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
      mercy: { multiplier: 1.0 }      // Neutral on mercy/severity
    }
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
      tradition: { multiplier: 0.9 }  // Slightly less traditional emphasis
    }
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
      mercy: { multiplier: 1.2 }       // Religious mercy/justice important
    }
  }
};
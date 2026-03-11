// ---- GAME STATE FACTORY ----
// Creates and manages the central game state object

export function createGameState() {
  return {
    turn: 1,
    year: 1,
    season: 0,
    resources: {
      food: 250,
      materials: 75,
      knowledge: 8
    }, // Increased starting resources for smoother early game
    population: {
      total: 25, // adult population only (children are tracked separately)
      idle: 25,
      employed: 0 // computed from buildings
    },
    childCohorts: [], // array of {age: number, count: number} - children tracked by birth year
    birthAccumulator: 0.0, // fractional births accumulate until >= 1.0
    cohesion: {
      identity: 60,
      legitimacy: 70,
      satisfaction: 65,
      bonds: 55,
      total: 62, // calculated from pillars (initialize to reasonable value)
      lastUpdate: { identity: 0, legitimacy: 0, satisfaction: 0, bonds: 0 } // track changes for UI
    },
    governance: {
      model: 'tribalCouncil', // current governance model
      policies: {
        freedom: 50,        // 0-100: Control ←→ Freedom
        mercy: 50,          // 0-100: Severity ←→ Mercy
        tradition: 50,      // 0-100: Innovation ←→ Tradition
        // workingAge is global variable WORKING_AGE, not in policies
      },
      modelChangeTimer: 0,  // turns remaining for governance change transition
      lastChanged: { model: 0, policies: { freedom: 0, mercy: 0, tradition: 0 } } // change tracking
    },
    victoryTracking: {
      minCohesion: 62, // initialized to starting cohesion
      governanceChanges: 0,
      collapseTimer: 0 // tracks turns with extremely low cohesion
    },
    gameEnded: false, // prevents multiple end-game triggers
    map: [],
    settlements: [], // list of {col, row}
    rivers: [], // list of { id, path, reachedTerminus, mergedIntoExisting }
    riverSegmentCounts: new Map(), // segment key -> traversal count for tributary width
    selectedHex: null,
    selectedUnit: null, // currently selected unit for movement
    camera: { x: 0, y: 0, zoom: 1.0 },
    startHex: null,
    territory: new Set(), // "col,row" strings of controlled hexes
    traditions: [], // active traditions: [{ id, established, timesPerformed, lastPerformed }]
    culture: {
      deathsOccurred: false, // tracks whether any deaths have occurred (for Remembrance unlock)
      storytellers: 0,       // workers assigned to oral tradition / storytelling role
      storyProgress: 0,      // fractional accumulator — reaches 1.0 when a new story is ready
      turnsWithoutStoryteller: 0, // consecutive turns with 0 storytellers (triggers story loss after 4)
      stories: [],           // [{ id, title, description, identityBonus, turn, year, season }]
      sacredPlaces: [],      // [{ col, row, reason, name, established }]
      namedFeatures: [],     // [{ type, col, row, riverId, name }]
      sacredBondsAccumulator: 0 // fractional accumulator for passive Bonds from sacred places
    },
    chronicle: [], // narrative history log of the civilization
    lastTurnReport: null,
    units: [], // array of unit objects
    unitsInTraining: [], // array of units being trained: {type, col, row, trainingProgress, trainingNeeded}
    externalThreats: [], // array of threat objects approaching the settlement
    nextUnitId: 1 // for unique unit IDs
  };
}
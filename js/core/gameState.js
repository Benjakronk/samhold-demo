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
        isolation: 50,      // 0-100: Open Borders ←→ Sealed Borders (also drives border openness for immigration: borderOpenness = 100 - isolation)
        culturalOpenness: 50,   // 0-100: Conformity ←→ Tolerance
        progressiveness: 50,    // 0-100: Passive ←→ Active integration
        rationPriority: 'people', // 'people' | 'military' | 'equal'
        // workingAge is global variable WORKING_AGE, not in policies
      },
      modelChangeTimer: 0,  // turns remaining for governance change transition
      lastChanged: { model: 0, policies: { freedom: 0, mercy: 0, tradition: 0, isolation: 0 } }, // change tracking
      monarchy: {
        dynastyName: null,
        currentRuler: null,    // { name, quality (0-1), reignStart }
        heir: null,            // { name, quality } or null
        dynastyAge: 0,         // turns the dynasty has lasted
        successionCrisisActive: false
      },
      militaryRule: {
        commanderStrength: 1.0,
        consecutiveVictories: 0,
        turnsInPower: 0
      },
      democracy: {
        pendingPolicyChanges: [], // [{ policy, newValue, turnsRemaining }]
        electionTimer: 0,
        voterSatisfaction: 50
      }
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
    selectedUnit: null,          // currently selected unit
    unitInteractionMode: null,   // null | 'move' | 'action'
    camera: { x: 0, y: 0, zoom: 1.0 },
    startHex: null,
    territory: new Set(), // "col,row" strings of controlled hexes
    traditions: [], // active traditions: [{ id, established, timesPerformed, lastPerformed }]
    culture: {
      deathsOccurred: false,      // tracks whether any deaths have occurred
      battleOccurred: false,      // tracks whether any combat has occurred (for battle_site prereq)
      spiritualEventFired: false, // tracks whether a qualifying event has fired (for spiritual_site prereq)
      storytellers: 0,       // workers assigned to oral tradition / storytelling role
      storyProgress: 0,      // fractional accumulator — reaches 1.0 when a new story is ready
      turnsWithoutStoryteller: 0, // consecutive turns with 0 storytellers (triggers story loss after 4)
      stories: [],           // [{ id, title, description, identityBonus, turn, year, season }]
      sacredSiteBondsAccumulator: 0, // legacy — migrated into societyBuildingAccumulators
      societyBuildingAccumulators: { identity: 0, legitimacy: 0, satisfaction: 0, bonds: 0 },
      sacredSiteBuilt: {     // tracks which sacred site reasons have been built (one per reason)
        founding_site: false,
        burial_ground: false,
        battle_site: false,
        spiritual_site: false,
        natural_wonder: false
      },
      namedFeatures: [],     // [{ type, col, row, riverId, name }]
      namedRegions: [],      // [{ id, name, centerCol, centerRow, hexes: ["col,row",...], strength, foundedYear, foundedSeason }]
      nextRegionId: 1,       // auto-incrementing region ID counter
    },
    crime: {
      theft: 0,
      violence: 0,
      transgression: 0,
      overallSeverity: 0,
      organizedPredation: false,
      organizedPredationTurns: 0,
      crackdownCooldown: 0,       // turns remaining before crackdown available again
      lastCrimeReport: null       // snapshot for UI display
    },
    resistance: {
      pressure: 0,
      suppressionCount: 0,
      recurrenceMultiplier: 1.0,
      faction: {
        active: false,
        name: '',
        disposition: 'cooperative', // cooperative | skeptical | hostile | radical
        leader: '',
        formalInfluence: null,
        promiseRegistry: []  // [{ id, description, deadline, binding, fulfilled }]
      },
      tcConsensusPolicies: {},   // policy -> true for TC-consensus-passed policies
      hostileCrossed: false,     // track if 80 threshold was crossed (one-time shift)
      lastWarningTurn: 0         // cooldown for advisor warnings
    },
    policyLag: {
      freedom: null,
      mercy: null,
      tradition: null,
      isolation: null,
      culturalOpenness: null,
      progressiveness: null,
      workingAge: null,
      pending: {
        freedom: null,
        mercy: null,
        tradition: null,
        isolation: null,
        culturalOpenness: null,
        progressiveness: null,
        workingAge: null
      }
    },
    trust: {
      institutional: 0.625,        // (legitimacy*0.55 + satisfaction*0.45) / 100
      interpersonal: 0.57,         // (identity*0.4 + bonds*0.6) / 100
      institutionalBaseline: 0.625,
      interpersonalBaseline: 0.57,
      deviations: { institutional: 0, interpersonal: 0 }
    },
    values: [],    // recognized shared values: [{ id, turnsHeld, strength }]
    valueTracking: {
      freedom: { zone: null, turnsInZone: 0 },
      mercy: { zone: null, turnsInZone: 0 },
      tradition: { zone: null, turnsInZone: 0 },
      isolation: { zone: null, turnsInZone: 0 },
      workingAge: { zone: null, turnsInZone: 0 },
      rationPriority: { zone: null, turnsInZone: 0 }
    },
    immigration: {
      cohorts: [0, 0, 0, 0],    // [Arrival, Resident, Participant, Integrated]
      parallelSociety: {
        strength: 0,
        population: 0,
        childCohorts: [],        // [{age, count}] born inside PS
      },
      pressure: 0,
      lastArrivals: 0,
      lifetimeArrivals: 0,
      lifetimeIntegrated: 0,
      interventionActive: null,
      interventionTurns: 0,
      crystallizationEvents: {},
    },
    classSystem: {
      active: false,
      basis: null,              // 'property' | 'lineage' | 'religious' | 'military'
      differentials: {
        economic: 0,            // 0 = Equal, 1 = Preferential, 2 = Stratified
        legal: 0,
        political: 0,
        social: 0
      },
      privilegedCount: 0,       // recalculated each turn for dynamic bases
      privilegedRatio: 0,       // privilegedCount / population.total
      activatedTurn: null,
      dismantlementEffects: null,  // { satisfactionPenalty, turnsRemaining, trustDriftTurnsRemaining }
      basisChangeEffects: null,    // { satisfactionPenalty, turnsRemaining }
      lineageFamilies: 0,       // for lineage basis: fixed count at activation
      pendingDifferentials: {},  // dimension -> { target, turnsRemaining, startTurn }
    },
    chronicle: [], // narrative history log of the civilization
    lastTurnReport: null,
    units: [], // array of unit objects
    unitsInTraining: [], // array of units being trained: {type, col, row, trainingProgress, trainingNeeded}
    externalThreats: [], // array of threat objects approaching the settlement
    fortifications: {}, // edge key -> { type, health, buildProgress, buildTurns }
    visibilityMap: [], // 2D array: 0=unexplored, 1=revealed, 2=visible
    nextUnitId: 1 // for unique unit IDs
  };
}
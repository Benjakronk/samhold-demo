// Save/Load System for Samhold
// Extracted from main game file for modular architecture

// Global variables that will be set by main game
let gameState = null;
let getCurrentSeed = null;
let setCurrentSeed = null;

// Initialize save/load system
function initSaveLoad(gameStateRef, getCurrentSeedFunc, setCurrentSeedFunc) {
  gameState = gameStateRef;
  getCurrentSeed = getCurrentSeedFunc;
  setCurrentSeed = setCurrentSeedFunc;
}

// ---- CORE SAVE/LOAD FUNCTIONS ----

function saveGameToSlot(slotName) {
  // Prepare save data with proper Set/Map serialization
  const saveData = {
    version: 2,
    timestamp: Date.now(),
    gameState: {
      ...gameState,
      territory: Array.from(gameState.territory), // Convert Set to Array
      riverSegmentCounts: Array.from(gameState.riverSegmentCounts.entries()) // Convert Map to Array of entries
    },
    currentSeed: getCurrentSeed ? getCurrentSeed() : null
  };

  try {
    // Get existing saves
    const existingSaves = JSON.parse(localStorage.getItem('samhold_saves') || '{}');
    existingSaves[slotName] = saveData;
    localStorage.setItem('samhold_saves', JSON.stringify(existingSaves));

    // Close save/load panel and return to game menu
    document.getElementById('saveload-overlay').classList.remove('visible');
    document.getElementById('game-menu-overlay').classList.add('visible');
    refreshSaveList();
  } catch (e) {
    console.error('Failed to save game:', e.message);
  }
}

function confirmLoadGame(slotName) {
  try {
    const saves = JSON.parse(localStorage.getItem('samhold_saves') || '{}');
    const saveData = saves[slotName];

    if (!saveData) {
      console.error('Save not found:', slotName);
      return;
    }

    const turn = saveData.gameState.turn || 0;
    const season = ['Spring', 'Summer', 'Autumn', 'Winter'][saveData.gameState.season || 0];

    window.showConfirmDialogNonDestructive(
      'Load Game?',
      `Load "${slotName}"?<br>Turn ${turn} (${season})<br><br>Your current game progress will be lost.`,
      'Load Game',
      'Cancel',
      () => loadGameFromSlot(slotName)
    );
  } catch (e) {
    console.error('Error confirming load:', e.message);
  }
}

function loadGameFromSlot(slotName) {
  try {
    const saves = JSON.parse(localStorage.getItem('samhold_saves') || '{}');
    const saveData = saves[slotName];

    if (!saveData) {
      console.error('Save not found:', slotName);
      return;
    }

    // Reconstruct gameState from save data
    const loadedGameState = saveData.gameState;

    // Convert Arrays back to Sets/Maps
    if (loadedGameState.territory) {
      loadedGameState.territory = new Set(loadedGameState.territory);
    }
    if (loadedGameState.riverSegmentCounts) {
      loadedGameState.riverSegmentCounts = new Map(loadedGameState.riverSegmentCounts);
    }

    // Migrate missing fields for saves created before newer phases.
    // Without this, Object.assign won't overwrite existing session data for absent keys.
    if (!Array.isArray(loadedGameState.traditions)) loadedGameState.traditions = [];
    if (!Array.isArray(loadedGameState.chronicle)) loadedGameState.chronicle = [];
    if (!loadedGameState.governance?.policies?.rationPriority) {
      if (loadedGameState.governance?.policies) loadedGameState.governance.policies.rationPriority = 'people';
    }
    if (!Array.isArray(loadedGameState.values)) loadedGameState.values = [];
    if (!loadedGameState.valueTracking) {
      loadedGameState.valueTracking = {
        freedom: { zone: null, turnsInZone: 0 },
        mercy: { zone: null, turnsInZone: 0 },
        tradition: { zone: null, turnsInZone: 0 },
        workingAge: { zone: null, turnsInZone: 0 },
        rationPriority: { zone: null, turnsInZone: 0 }
      };
    }
    // Migrate trust state for older saves
    if (!loadedGameState.trust) {
      const c = loadedGameState.cohesion || {};
      const instBase = ((c.legitimacy || 70) * 0.55 + (c.satisfaction || 65) * 0.45) / 100;
      const interBase = ((c.identity || 60) * 0.4 + (c.bonds || 55) * 0.6) / 100;
      loadedGameState.trust = {
        institutional: instBase,
        interpersonal: interBase,
        institutionalBaseline: instBase,
        interpersonalBaseline: interBase,
        deviations: { institutional: 0, interpersonal: 0 }
      };
    }

    // Migrate policy lag state for older saves
    if (!loadedGameState.policyLag) {
      loadedGameState.policyLag = {
        freedom: null, mercy: null, tradition: null, isolation: null, workingAge: null,
        pending: { freedom: null, mercy: null, tradition: null, isolation: null, workingAge: null }
      };
    }

    // Migrate crime state for older saves
    if (!loadedGameState.crime) {
      loadedGameState.crime = {
        theft: 0, violence: 0, transgression: 0, overallSeverity: 0,
        organizedPredation: false, organizedPredationTurns: 0,
        crackdownCooldown: 0, lastCrimeReport: null
      };
    }

    // Migrate resistance state for older saves
    if (!loadedGameState.resistance) {
      loadedGameState.resistance = {
        pressure: 0, suppressionCount: 0, recurrenceMultiplier: 1.0,
        faction: { active: false, name: '', disposition: 'cooperative', leader: '', formalInfluence: null, promiseRegistry: [] },
        tcConsensusPolicies: {}, hostileCrossed: false, lastWarningTurn: 0
      };
    }

    // Migrate immigration state for older saves
    if (!loadedGameState.immigration) {
      loadedGameState.immigration = {
        cohorts: [0, 0, 0, 0],
        parallelSociety: { strength: 0, population: 0, childCohorts: [] },
        pressure: 0, lastArrivals: 0, lifetimeArrivals: 0, lifetimeIntegrated: 0,
        interventionActive: null, interventionTurns: 0, crystallizationEvents: {}
      };
    }

    // Migrate immigration policy sliders for older saves
    if (loadedGameState.governance?.policies) {
      if (loadedGameState.governance.policies.culturalOpenness === undefined) loadedGameState.governance.policies.culturalOpenness = 50;
      if (loadedGameState.governance.policies.progressiveness === undefined) loadedGameState.governance.policies.progressiveness = 50;
      // Remove deprecated borderOpenness — now derived from isolation slider
      delete loadedGameState.governance.policies.borderOpenness;
    }

    // Migrate policyLag for immigration sliders
    if (loadedGameState.policyLag) {
      if (loadedGameState.policyLag.culturalOpenness === undefined) loadedGameState.policyLag.culturalOpenness = null;
      if (loadedGameState.policyLag.progressiveness === undefined) loadedGameState.policyLag.progressiveness = null;
      // Remove deprecated borderOpenness lag
      delete loadedGameState.policyLag.borderOpenness;
      if (loadedGameState.policyLag.pending) {
        if (loadedGameState.policyLag.pending.culturalOpenness === undefined) loadedGameState.policyLag.pending.culturalOpenness = null;
        if (loadedGameState.policyLag.pending.progressiveness === undefined) loadedGameState.policyLag.pending.progressiveness = null;
        delete loadedGameState.policyLag.pending.borderOpenness;
      }
    }

    // Migrate class system for older saves
    if (!loadedGameState.classSystem) {
      loadedGameState.classSystem = {
        active: false, basis: null,
        differentials: { economic: 0, legal: 0, political: 0, social: 0 },
        privilegedCount: 0, privilegedRatio: 0,
        activatedTurn: null,
        dismantlementEffects: null, basisChangeEffects: null,
        lineageFamilies: 0, pendingDifferentials: {}
      };
    }

    // Migrate fortifications and visibilityMap for older saves
    if (!loadedGameState.fortifications) loadedGameState.fortifications = {};
    if (!loadedGameState.visibilityMap || !loadedGameState.visibilityMap.length) {
      loadedGameState.visibilityMap = [];
      const rows = loadedGameState.map?.length || window.MAP_ROWS;
      const cols = loadedGameState.map?.[0]?.length || window.MAP_COLS;
      for (let r = 0; r < rows; r++) {
        loadedGameState.visibilityMap[r] = [];
        for (let c = 0; c < cols; c++) {
          // If hex was revealed in old save, mark as revealed (1); otherwise unexplored (0)
          loadedGameState.visibilityMap[r][c] = loadedGameState.map?.[r]?.[c]?.revealed ? 1 : 0;
        }
      }
    }

    if (!loadedGameState.culture) loadedGameState.culture = {};
    const cultureDef = {
      deathsOccurred: false, battleOccurred: false, spiritualEventFired: false,
      storytellers: 0, storyProgress: 0, turnsWithoutStoryteller: 0, stories: [],
      sacredSiteBondsAccumulator: 0,
      societyBuildingAccumulators: { identity: 0, legitimacy: 0, satisfaction: 0, bonds: 0 },
      sacredSiteBuilt: { founding_site: false, burial_ground: false, battle_site: false, spiritual_site: false, natural_wonder: false },
      namedFeatures: [],
      namedRegions: [],
      nextRegionId: 1
    };
    // Migrate old sacredPlaces array — no longer used, discard silently
    if (loadedGameState.culture) {
      delete loadedGameState.culture.sacredPlaces;
      delete loadedGameState.culture.sacredBondsAccumulator;
    }
    for (const [k, v] of Object.entries(cultureDef)) {
      if (loadedGameState.culture[k] === undefined) {
        loadedGameState.culture[k] = Array.isArray(v) ? [] : v;
      }
    }

    // Apply loaded state
    Object.assign(gameState, loadedGameState);

    // Restore globals that live outside gameState
    if (gameState.governance && gameState.governance.policies && gameState.governance.policies.workingAge != null) {
      window.WORKING_AGE = gameState.governance.policies.workingAge;
    }

    // Update seed
    if (saveData.currentSeed && setCurrentSeed) {
      setCurrentSeed(saveData.currentSeed);
    }

    // Close panels and restart game rendering
    document.getElementById('saveload-overlay').classList.remove('visible');
    document.getElementById('game-menu-overlay').classList.remove('visible');

    // Update UI to reflect loaded state
    window.updateAllUI();
    if (window.setMapDirty) window.setMapDirty(true);
    window.render();

    console.log('Game loaded successfully from slot:', slotName);
  } catch (e) {
    console.error('Failed to load game:', e.message);
  }
}

// ---- UI MANAGEMENT FUNCTIONS ----

function openSaveLoadPanel() {
  window.closeGameMenu();
  showSaveLoadPanel();
}

function showSaveLoadPanel() {
  document.getElementById('saveload-overlay').classList.add('visible');
  document.getElementById('game-menu-overlay').classList.remove('visible');
  refreshSavesList();
}

function closeSaveLoadPanel() {
  document.getElementById('saveload-overlay').classList.remove('visible');
}

function switchSaveLoadTab() {} // kept for compatibility

function performSave() {
  const nameInput = document.getElementById('save-name-input');
  const saveName = nameInput.value.trim();

  if (!saveName) {
    console.error('Save name is required');
    return;
  }

  try {
    const existingSaves = JSON.parse(localStorage.getItem('samhold_saves') || '{}');

    if (existingSaves[saveName]) {
      window.showConfirmDialogNonDestructive(
        'Overwrite Save?',
        `A save named "${saveName}" already exists. Overwrite it?`,
        'Overwrite',
        'Cancel',
        () => {
          saveGameToSlot(saveName);
          nameInput.value = '';
        }
      );
    } else {
      saveGameToSlot(saveName);
      nameInput.value = '';
    }
  } catch (e) {
    console.error('Error during save:', e.message);
  }
}

function performLoad() {
  const nameInput = document.getElementById('save-name-input');
  const saveName = nameInput.value.trim();

  if (!saveName) {
    window.showAlert('No Save Selected', '<p>Click a save entry to select it, then press Load.</p>');
    return;
  }

  try {
    const saves = JSON.parse(localStorage.getItem('samhold_saves') || '{}');
    if (!saves[saveName]) {
      window.showAlert('Save Not Found', `<p>No save named "${saveName}" exists.</p>`);
      return;
    }
    confirmLoadGame(saveName);
  } catch (e) {
    console.error('Error during load:', e.message);
  }
}

// ---- LIST REFRESH FUNCTIONS ----

function refreshSavesList() {
  const saves = JSON.parse(localStorage.getItem('samhold_saves') || '{}');
  const savesList = document.getElementById('saves-list');
  savesList.innerHTML = '';

  const saveEntries = Object.entries(saves).sort((a, b) => b[1].timestamp - a[1].timestamp);

  if (saveEntries.length === 0) {
    savesList.innerHTML = '<div style="color: var(--text-dim); font-style: italic; text-align: center; padding: 20px;">No saved games</div>';
    return;
  }

  saveEntries.forEach(([name, data]) => {
    const item = document.createElement('div');
    item.className = 'save-item';

    const date = new Date(data.timestamp).toLocaleDateString();
    const time = new Date(data.timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
    const turn = data.gameState.turn || 0;
    const season = ['🌱 Spring', '☀️ Summer', '🍂 Autumn', '❄️ Winter'][data.gameState.season || 0];

    item.innerHTML = `
      <div class="save-item-content" onclick="window.populateSaveName('${name.replace(/'/g, "\\'")}')">
        <div class="save-item-name">${name}</div>
        <div class="save-item-info">
          <span>Turn ${turn} (${season})</span>
          <span>${date} ${time}</span>
        </div>
      </div>
      <button class="save-delete-btn" onclick="event.stopPropagation(); window.deleteSave('${name.replace(/'/g, "\\'")}')" title="Delete save">Delete</button>
    `;

    savesList.appendChild(item);
  });
}

function refreshLoadList() { refreshSavesList(); } // kept for compatibility

function refreshSaveList() { refreshSavesList(); }

function populateSaveName(saveName) {
  const saveNameInput = document.getElementById('save-name-input');
  if (saveNameInput) {
    saveNameInput.value = saveName;
    saveNameInput.focus();
  }
}

function deleteSave(saveName) {
  window.showConfirmDialogNonDestructive(
    'Delete Save?',
    `Delete save "${saveName}"? This cannot be undone.`,
    'Delete',
    'Cancel',
    () => {
      const saves = JSON.parse(localStorage.getItem('samhold_saves') || '{}');
      delete saves[saveName];
      localStorage.setItem('samhold_saves', JSON.stringify(saves));
      refreshSavesList();
    }
  );
}

// Export functions for module use
export {
  initSaveLoad,
  saveGameToSlot,
  confirmLoadGame,
  loadGameFromSlot,
  openSaveLoadPanel,
  showSaveLoadPanel,
  closeSaveLoadPanel,
  switchSaveLoadTab,
  performSave,
  performLoad,
  refreshSavesList,
  refreshLoadList,
  refreshSaveList,
  populateSaveName,
  deleteSave
};

// For browser compatibility, attach to window if available
if (typeof window !== 'undefined') {
  window.SaveLoad = {
    initSaveLoad,
    saveGameToSlot,
    confirmLoadGame,
    loadGameFromSlot,
    openSaveLoadPanel,
    showSaveLoadPanel,
    closeSaveLoadPanel,
    switchSaveLoadTab,
    performSave,
    refreshSavesList,
    refreshLoadList,
    refreshSaveList,
    populateSaveName,
    deleteSave
  };
}
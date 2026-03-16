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
    version: 1,
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
    if (!loadedGameState.culture) loadedGameState.culture = {};
    const cultureDef = {
      deathsOccurred: false, battleOccurred: false, spiritualEventFired: false,
      storytellers: 0, storyProgress: 0, turnsWithoutStoryteller: 0, stories: [],
      sacredSiteBondsAccumulator: 0,
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
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

    // Apply loaded state
    Object.assign(gameState, loadedGameState);

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

function openSaveLoadPanel(defaultTab = 'save') {
  window.closeGameMenu();
  showSaveLoadPanel(defaultTab);
}

function showSaveLoadPanel(defaultTab = 'save') {
  document.getElementById('saveload-overlay').classList.add('visible');
  document.getElementById('game-menu-overlay').classList.remove('visible');
  switchSaveLoadTab(defaultTab);
}

function closeSaveLoadPanel() {
  document.getElementById('saveload-overlay').classList.remove('visible');
}

function switchSaveLoadTab(tab) {
  // Remove active class from all tabs
  document.querySelectorAll('.saveload-tab').forEach(t => t.classList.remove('active'));

  // Add active class to selected tab
  const activeTab = document.querySelector(`.saveload-tab[data-tab="${tab}"]`);
  if (activeTab) activeTab.classList.add('active');

  // Show appropriate content
  const saveTab = document.getElementById('save-tab');
  const loadTab = document.getElementById('load-tab');

  if (saveTab) saveTab.style.display = tab === 'save' ? 'block' : 'none';
  if (loadTab) loadTab.style.display = tab === 'load' ? 'block' : 'none';

  if (tab === 'save') {
    refreshSaveList();
  } else if (tab === 'load') {
    refreshLoadList();
  }
}

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

function refreshLoadList() {
  const saves = JSON.parse(localStorage.getItem('samhold_saves') || '{}');
  const loadList = document.getElementById('load-saves-list');
  loadList.innerHTML = '';

  const saveEntries = Object.entries(saves).sort((a, b) => b[1].timestamp - a[1].timestamp);

  if (saveEntries.length === 0) {
    loadList.innerHTML = '<div style="color: var(--text-dim); font-style: italic; text-align: center; padding: 20px;">No saved games</div>';
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
      <div class="save-item-content" onclick="window.confirmLoadGame('${name.replace(/'/g, "\\'")}')">
        <div class="save-item-name">${name}</div>
        <div class="save-item-info">
          <span>Turn ${turn} (${season})</span>
          <span>${date} ${time}</span>
        </div>
      </div>
      <button class="save-delete-btn" onclick="event.stopPropagation(); window.deleteSave('${name.replace(/'/g, "\\'")}')" title="Delete save">Delete</button>
    `;

    loadList.appendChild(item);
  });
}

function refreshSaveList() {
  refreshSavesList();
}

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
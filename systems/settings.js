// Settings & Notifications System for Samhold
// Handles settings overlay, return to menu, notifications, and related event listeners
// Extracted from main game file for modular architecture

function openSettings() {
  window.closeGameMenu();
  document.getElementById('settings-overlay').classList.add('visible');
}

function returnToMainMenu() {
  window.closeGameMenu();
  window.showConfirmDialog(
    'Return to Main Menu?',
    'Any unsaved progress will be lost.',
    'Main Menu',
    'Cancel',
    () => {
      window.closeAllOverlays();
      showMainMenu();
    }
  );
}

function showMainMenu() {
  document.getElementById('main-menu').classList.remove('hidden');
  document.getElementById('game-ui').style.display = 'none';
  refreshMainMenuButtons();
}

function hideMainMenu() {
  document.getElementById('main-menu').classList.add('hidden');
  document.getElementById('game-ui').style.display = '';
}

function refreshMainMenuButtons() {
  try {
    const saves = JSON.parse(localStorage.getItem('samhold_saves') || '{}');
    const entries = Object.entries(saves).sort((a, b) => b[1].timestamp - a[1].timestamp);
    const continueBtn = document.getElementById('mm-continue');
    const loadBtn = document.getElementById('mm-load');
    if (entries.length > 0) {
      continueBtn.style.display = '';
      loadBtn.style.display = '';
      const latest = entries[0];
      const turn = latest[1].gameState.turn || 0;
      const season = ['Spring', 'Summer', 'Autumn', 'Winter'][latest[1].gameState.season || 0];
      continueBtn.textContent = `Continue — ${latest[0]} (Turn ${turn}, ${season})`;
      continueBtn.dataset.saveName = latest[0];
    } else {
      continueBtn.style.display = 'none';
      loadBtn.style.display = 'none';
    }
  } catch(e) {}
}

function startNewGame() {
  const seedInput = document.getElementById('mm-seed-input');
  const seed = parseInt(seedInput.value) || Math.floor(Math.random() * 999999) + 1;
  // Detach rendering state so stray render() calls during transition don't paint old game
  if (window.clearRenderingState) window.clearRenderingState();
  hideMainMenu();
  // Small delay to let game-ui become visible before canvas sizing
  setTimeout(() => {
    window.gameState = window.initGameCore(seed);
    console.log('🎯 New game started with seed:', seed);
  }, 50);
}

function continueGame() {
  const btn = document.getElementById('mm-continue');
  const saveName = btn.dataset.saveName;
  if (!saveName) return;
  // Main menu will be hidden by loadGameFromSlot after successful load
  if (!window.gameState) {
    window.gameState = window.createGameState();
  }
  if (window.initSaveLoad) {
    window.initSaveLoad(
      window.gameState,
      () => window.getCurrentSeed ? window.getCurrentSeed() : 7743,
      (newSeed) => { if (window.setCurrentSeed) window.setCurrentSeed(newSeed); }
    );
  }
  window.loadGameFromSlot(saveName);
}

function loadFromMainMenu() {
  // Don't hide main menu yet — it stays visible behind the save/load panel
  // Main menu will be hidden by loadGameFromSlot after successful load
  if (!window.gameState) {
    window.gameState = window.createGameState();
  }
  if (window.initSaveLoad) {
    window.initSaveLoad(
      window.gameState,
      () => window.getCurrentSeed ? window.getCurrentSeed() : 7743,
      (newSeed) => { if (window.setCurrentSeed) window.setCurrentSeed(newSeed); }
    );
  }
  window.showSaveLoadPanel({ loadOnly: true });
}

function openMainMenuSettings() {
  document.getElementById('settings-overlay').classList.add('visible');
}

// ---- NOTIFICATION SYSTEM ----
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;

  const colors = {
    success: '#5a8a4a',
    error: '#a94442',
    warning: '#c9a84c',
    info: '#4a7a9a'
  };

  notification.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    z-index: 1000;
    padding: 12px 16px;
    background: var(--bg-panel);
    border: 1px solid ${colors[type]};
    border-radius: 4px;
    color: var(--text-light);
    font-family: 'Nunito Sans', sans-serif;
    font-size: 14px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    animation: slideInFromRight 0.3s ease;
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOutToRight 0.3s ease forwards';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// ---- UI SCALE ----

function getMaxUIScale() {
  const maxPanelWidth = window.innerWidth * 0.35;
  const maxScale = maxPanelWidth / 300;
  const maxBarHeight = window.innerHeight * 0.3;
  const maxScaleV = maxBarHeight / 56;
  return Math.min(Math.floor(Math.min(maxScale, maxScaleV) * 100), 160);
}

function clampTopBar(uiScale) {
  const bar = document.getElementById('top-bar');
  if (!bar || !bar.offsetParent) {
    // Bar not visible yet (e.g. on main menu) — just store the scale
    document.documentElement.style.setProperty('--topbar-scale', uiScale);
    return uiScale;
  }
  let tbScale = uiScale;
  bar.style.zoom = tbScale;
  while (bar.scrollWidth > bar.clientWidth + 2 && tbScale > 0.8) {
    tbScale = Math.round((tbScale - 0.05) * 100) / 100;
    bar.style.zoom = tbScale;
  }
  document.documentElement.style.setProperty('--topbar-scale', tbScale);
  return tbScale;
}

function applyUIScale(percent) {
  const maxPercent = getMaxUIScale();
  percent = Math.max(80, Math.min(percent, maxPercent));
  const scale = percent / 100;
  document.documentElement.style.setProperty('--ui-scale', scale);
  clampTopBar(scale);
  const slider = document.getElementById('ui-scale-slider');
  slider.value = percent;
  slider.max = maxPercent;
  document.getElementById('ui-scale-val').textContent = percent + '%';
  document.getElementById('scale-up').disabled = percent >= maxPercent;
  document.getElementById('scale-down').disabled = percent <= 80;
  requestAnimationFrame(() => { window.resizeCanvas(); if (window.render) window.render(); });
  try { localStorage.setItem('samhold-ui-scale', percent); } catch(e) {}
}

// Inject CSS animations for notifications
let _settingsInitialized = false;
function initSettings() {
  if (_settingsInitialized) return;
  _settingsInitialized = true;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideInFromRight {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutToRight {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
  `;
  document.head.appendChild(style);

  // Settings close button — return to game menu or main menu depending on context
  const closeSettings = () => {
    document.getElementById('settings-overlay').classList.remove('visible');
    const mainMenu = document.getElementById('main-menu');
    if (mainMenu && !mainMenu.classList.contains('hidden')) {
      // Came from main menu — do nothing, main menu is still visible behind
    } else {
      document.getElementById('game-menu-overlay').classList.add('visible');
    }
  };

  document.getElementById('settings-close').addEventListener('click', closeSettings);

  // Settings overlay background click
  document.getElementById('settings-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('settings-overlay')) {
      closeSettings();
    }
  });

  // Save/Load Panel Event Listeners
  document.getElementById('saveload-close').addEventListener('click', () => window.closeSaveLoadPanel());

  document.getElementById('saveload-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('saveload-overlay')) {
      window.closeSaveLoadPanel();
    }
  });

  // Save input enter key support
  document.getElementById('save-name-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      window.performSave();
    }
  });

  // UI Scale controls
  document.getElementById('ui-scale-slider').addEventListener('input', (e) => {
    applyUIScale(parseInt(e.target.value));
  });

  document.getElementById('scale-up').addEventListener('click', () => {
    applyUIScale(parseInt(document.getElementById('ui-scale-slider').value) + 5);
  });

  document.getElementById('scale-down').addEventListener('click', () => {
    applyUIScale(parseInt(document.getElementById('ui-scale-slider').value) - 5);
  });

  window.addEventListener('resize', () => {
    applyUIScale(parseInt(document.getElementById('ui-scale-slider').value));
  });

  // Restore saved UI scale
  try {
    const saved = localStorage.getItem('samhold-ui-scale');
    if (saved) applyUIScale(parseInt(saved));
  } catch(e) {}

  // Advisor hint toggle state
  try {
    const hintsDisabled = localStorage.getItem('samhold_advisor_disabled') === 'true';
    document.getElementById('hints-toggle').checked = !hintsDisabled;
    if (window.setAdvisorEnabled) window.setAdvisorEnabled(!hintsDisabled);
  } catch(e) {}

  document.getElementById('hints-toggle').addEventListener('change', (e) => {
    try {
      localStorage.setItem('samhold_advisor_disabled', e.target.checked ? 'false' : 'true');
      if (window.setAdvisorEnabled) window.setAdvisorEnabled(e.target.checked);
      if (window.updateAllUI) window.updateAllUI();
    } catch(err) {}
  });
}

export {
  initSettings,
  openSettings,
  returnToMainMenu,
  showMainMenu,
  hideMainMenu,
  refreshMainMenuButtons,
  startNewGame,
  continueGame,
  loadFromMainMenu,
  openMainMenuSettings,
  showNotification,
  applyUIScale,
  getMaxUIScale,
  clampTopBar
};

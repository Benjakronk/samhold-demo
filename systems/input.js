// Input System for Samhold
// Handles mouse, keyboard, and touch interactions
// Extracted from main game file for modular architecture

// Input state variables
let isDragging = false;
let dragMoved = false;
let dragStart = { x: 0, y: 0 };
let camStart = { x: 0, y: 0 };
let minimapDragging = false;

// Global references that will be set by main game
let gameState = null;
let canvasRect = null;
let minimapCanvas = null;
let container = null;

let canvasW, canvasH;

// Initialize input system
function initInput(gameStateRef, canvasRectRef, minimapCanvasRef, containerRef, mmWidth, mmHeight, canvasWidth, canvasHeight) {
  gameState = gameStateRef;
  canvasRect = canvasRectRef;
  minimapCanvas = minimapCanvasRef;
  container = containerRef;
  canvasW = canvasWidth;
  canvasH = canvasHeight;

  setupEventListeners();
}

// ---- COORDINATE CONVERSION FUNCTIONS ----

function pageToCanvas(cx, cy) {
  return { x: cx - canvasRect.left, y: cy - canvasRect.top };
}

// ---- MINIMAP FUNCTIONS ----

// ---- MOUSE EVENT HANDLERS ----

function handleMinimapMouseDown(e) {
  minimapDragging = true;
  const r = minimapCanvas.getBoundingClientRect();
  if (window.minimapToCamera) window.minimapToCamera(e.clientX - r.left, e.clientY - r.top);
  window.render();
  e.stopPropagation();
  e.preventDefault();
}

function handleContainerMouseDown(e) {
  if (minimapDragging || !gameState || !gameState.camera) return;
  isDragging = true;
  dragMoved = false;
  dragStart = { x: e.clientX, y: e.clientY };
  camStart = { x: gameState.camera.x, y: gameState.camera.y };
}

function handleWindowMouseMove(e) {
  if (!gameState || !gameState.camera) return;

  if (minimapDragging) {
    const r = minimapCanvas.getBoundingClientRect();
    if (window.minimapToCamera) window.minimapToCamera(
      Math.max(0, Math.min(r.width, e.clientX - r.left)),
      Math.max(0, Math.min(r.height, e.clientY - r.top))
    );
    window.render();
    return;
  }

  if (isDragging) {
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMoved = true;
    gameState.camera.x = camStart.x - dx / gameState.camera.zoom;
    gameState.camera.y = camStart.y - dy / gameState.camera.zoom;
    window.render();
  }

  const cs = pageToCanvas(e.clientX, e.clientY);
  // Mouse cursor position tracking would go here if needed
}

function handleWindowMouseUp(e) {
  if (minimapDragging) {
    minimapDragging = false;
    return;
  }

  if (isDragging && !dragMoved) {
    window.handleHexClick(e);
  }

  isDragging = false;
}

function handleContainerWheel(e) {
  if (!gameState || !gameState.camera) return;
  e.preventDefault();

  const newZoom = Math.max(0.35, Math.min(2.5, gameState.camera.zoom * (e.deltaY > 0 ? 0.9 : 1.1)));
  gameState.camera.zoom = newZoom;

  document.getElementById('zoom-display').textContent = `Zoom: ${Math.round(newZoom * 100)}%`;
  window.render();
}

// ---- KEYBOARD EVENT HANDLERS ----

function handleKeyDown(e) {
  // Skip map controls if user is typing in an input field
  if (document.activeElement && (
    document.activeElement.tagName === 'INPUT' ||
    document.activeElement.tagName === 'TEXTAREA' ||
    document.activeElement.isContentEditable
  )) {
    return;
  }

  if (!gameState || !gameState.camera) return;

  const speed = 50 / gameState.camera.zoom;
  let handled = true;

  switch (e.key) {
    case 'ArrowUp':
    case 'w':
      gameState.camera.y -= speed;
      break;
    case 'ArrowDown':
    case 's':
      gameState.camera.y += speed;
      break;
    case 'ArrowLeft':
    case 'a':
      gameState.camera.x -= speed;
      break;
    case 'ArrowRight':
    case 'd':
      gameState.camera.x += speed;
      break;
    case '+':
    case '=':
      gameState.camera.zoom = Math.min(2.5, gameState.camera.zoom * 1.1);
      document.getElementById('zoom-display').textContent = `Zoom: ${Math.round(gameState.camera.zoom * 100)}%`;
      break;
    case '-':
      gameState.camera.zoom = Math.max(0.35, gameState.camera.zoom * 0.9);
      document.getElementById('zoom-display').textContent = `Zoom: ${Math.round(gameState.camera.zoom * 100)}%`;
      break;
    case 'Escape':
      if (window.deselectUnit) {
        window.deselectUnit();
      }
      break;
    case 'Enter':
      // Handle turn summary specially - close it and process events if needed
      const turnSummaryVisible = document.getElementById('turn-summary').classList.contains('visible');
      if (turnSummaryVisible) {
        // Simulate clicking the summary OK button to properly handle event processing
        const summaryOk = document.getElementById('summary-ok');
        if (summaryOk) summaryOk.click();
      }
      // Only allow Enter to progress turn if no other overlays are open
      else if (window.isAnyOverlayOpen && !window.isAnyOverlayOpen()) {
        const endTurnBtn = document.getElementById('end-turn-btn');
        if (endTurnBtn) endTurnBtn.click();
      }
      break;
    default:
      handled = false;
      break;
  }

  if (handled) {
    e.preventDefault();
    window.render();
  }
}

function handleWindowResize() {
  if (window.applyUIScale) {
    const scaleSlider = document.getElementById('ui-scale-slider');
    if (scaleSlider) {
      window.applyUIScale(parseInt(scaleSlider.value));
    }
  }
}

// ---- UI EVENT HANDLERS ----

function handleScaleUp() {
  const scaleSlider = document.getElementById('ui-scale-slider');
  if (scaleSlider && window.applyUIScale) {
    window.applyUIScale(parseInt(scaleSlider.value) + 5);
  }
}

function handleScaleDown() {
  const scaleSlider = document.getElementById('ui-scale-slider');
  if (scaleSlider && window.applyUIScale) {
    window.applyUIScale(parseInt(scaleSlider.value) - 5);
  }
}

function handleCohesionBarClick() {
  if (window.toggleSocietySection) {
    window.toggleSocietySection();
  }
}

function handlePopToggleClick() {
  if (window.togglePopulationSection) {
    window.togglePopulationSection();
  }
}

// ---- OVERLAY EVENT HANDLERS ----

function handleOverlayClose(overlayId, returnToMenuId = null) {
  return function(e) {
    if (e.target.id === overlayId) {
      document.getElementById(overlayId).classList.remove('visible');
      if (returnToMenuId) {
        document.getElementById(returnToMenuId).classList.add('visible');
      }
    }
  };
}

function handleCloseButton(overlayId, returnToMenuId = null) {
  return function() {
    document.getElementById(overlayId).classList.remove('visible');
    if (returnToMenuId) {
      document.getElementById(returnToMenuId).classList.add('visible');
    }
  };
}

// ---- EVENT LISTENER SETUP ----

function setupEventListeners() {
  // Minimap events
  if (minimapCanvas) {
    minimapCanvas.addEventListener('mousedown', handleMinimapMouseDown);
  }

  // Container events
  if (container) {
    container.addEventListener('mousedown', handleContainerMouseDown);
    container.addEventListener('wheel', handleContainerWheel);
  }

  // Window events
  window.addEventListener('mousemove', handleWindowMouseMove);
  window.addEventListener('mouseup', handleWindowMouseUp);
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('resize', handleWindowResize);

  // UI scale controls
  const scaleUpBtn = document.getElementById('scale-up');
  if (scaleUpBtn) {
    scaleUpBtn.addEventListener('click', handleScaleUp);
  }

  const scaleDownBtn = document.getElementById('scale-down');
  if (scaleDownBtn) {
    scaleDownBtn.addEventListener('click', handleScaleDown);
  }

  // Sidebar interactions
  const cohesionBar = document.getElementById('cohesion-bar-container');
  if (cohesionBar) {
    cohesionBar.addEventListener('click', handleCohesionBarClick);
  }

  const popToggle = document.getElementById('pop-toggle');
  if (popToggle) {
    popToggle.addEventListener('click', handlePopToggleClick);
  }

  // Overlay close handlers
  setupOverlayEventListeners();
}

function setupOverlayEventListeners() {
  // Workforce overlay
  const workforceClose = document.getElementById('wf-close');
  if (workforceClose) {
    workforceClose.addEventListener('click', handleCloseButton('workforce-overlay'));
  }

  const workforceOverlay = document.getElementById('workforce-overlay');
  if (workforceOverlay) {
    workforceOverlay.addEventListener('click', handleOverlayClose('workforce-overlay'));
  }

  // Governance overlay
  const governanceClose = document.getElementById('governance-close');
  if (governanceClose) {
    governanceClose.addEventListener('click', handleCloseButton('governance-overlay'));
  }

  const governanceOverlay = document.getElementById('governance-overlay');
  if (governanceOverlay) {
    governanceOverlay.addEventListener('click', handleOverlayClose('governance-overlay'));
  }

  // Population overlay
  const populationClose = document.getElementById('population-close');
  if (populationClose) {
    populationClose.addEventListener('click', function() {
      if (window.closePopulationDetails) {
        window.closePopulationDetails();
      }
    });
  }

  const populationOverlay = document.getElementById('population-details-overlay');
  if (populationOverlay) {
    populationOverlay.addEventListener('click', function(e) {
      if (e.target.id === 'population-details-overlay' && window.closePopulationDetails) {
        window.closePopulationDetails();
      }
    });
  }

  // Game menu overlay
  const gameMenuClose = document.getElementById('game-menu-close');
  if (gameMenuClose) {
    gameMenuClose.addEventListener('click', function() {
      if (window.closeGameMenu) {
        window.closeGameMenu();
      }
    });
  }

  const gameMenuOverlay = document.getElementById('game-menu-overlay');
  if (gameMenuOverlay) {
    gameMenuOverlay.addEventListener('click', function(e) {
      if (e.target.id === 'game-menu-overlay' && window.closeGameMenu) {
        window.closeGameMenu();
      }
    });
  }

  // Settings overlay
  const settingsClose = document.getElementById('settings-close');
  if (settingsClose) {
    settingsClose.addEventListener('click', handleCloseButton('settings-overlay', 'game-menu-overlay'));
  }

  const settingsOverlay = document.getElementById('settings-overlay');
  if (settingsOverlay) {
    settingsOverlay.addEventListener('click', handleOverlayClose('settings-overlay', 'game-menu-overlay'));
  }

  // Save/Load overlay
  const saveloadClose = document.getElementById('saveload-close');
  if (saveloadClose) {
    saveloadClose.addEventListener('click', function() {
      if (window.closeSaveLoadPanel) {
        window.closeSaveLoadPanel();
      }
    });
  }

  const saveloadOverlay = document.getElementById('saveload-overlay');
  if (saveloadOverlay) {
    saveloadOverlay.addEventListener('click', function(e) {
      if (e.target.id === 'saveload-overlay' && window.closeSaveLoadPanel) {
        window.closeSaveLoadPanel();
      }
    });
  }

  // Save name input
  const saveNameInput = document.getElementById('save-name-input');
  if (saveNameInput) {
    saveNameInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && window.performSave) {
        window.performSave();
      }
    });
  }

  // Dev overlay
  const devBtn = document.getElementById('dev-btn');
  if (devBtn) {
    devBtn.addEventListener('click', function() {
      if (window.openDevOverlay) {
        window.openDevOverlay();
      }
    });
  }

  const devClose = document.getElementById('dev-close');
  if (devClose) {
    devClose.addEventListener('click', function() {
      if (window.closeDevOverlay) {
        window.closeDevOverlay();
      }
    });
  }

  const devOverlay = document.getElementById('dev-overlay');
  if (devOverlay) {
    devOverlay.addEventListener('click', function(e) {
      if (e.target.id === 'dev-overlay' && window.closeDevOverlay) {
        window.closeDevOverlay();
      }
    });
  }

  const devApplyLive = document.getElementById('dev-apply-live');
  if (devApplyLive) {
    devApplyLive.addEventListener('click', function() {
      if (window.applyDevValues && window.closeDevOverlay) {
        window.applyDevValues();
        window.closeDevOverlay();
      }
    });
  }

  const devApplyRestart = document.getElementById('dev-apply-restart');
  if (devApplyRestart) {
    devApplyRestart.addEventListener('click', function() {
      if (window.applyDevValues) {
        window.applyDevValues();
        // Seed input may not be in DOM if not on map tab — use currentSeed as fallback
        const seedEl = document.getElementById('seed-input');
        const seed = seedEl ? (parseInt(seedEl.value) || window.currentSeed) : window.currentSeed;
        const startFood = parseInt(document.getElementById('dev-start-food')?.value) || 200;

        if (window.initGame) {
          window.initGame(seed, { food: startFood, materials: 50 });
        }
      }
    });
  }
}

// ---- UTILITY FUNCTIONS ----

function resetInputState() {
  isDragging = false;
  dragMoved = false;
  minimapDragging = false;
}

// Export functions for module use
export {
  initInput,
  pageToCanvas,
  handleMinimapMouseDown,
  handleContainerMouseDown,
  handleWindowMouseMove,
  handleWindowMouseUp,
  handleContainerWheel,
  handleKeyDown,
  handleWindowResize,
  handleScaleUp,
  handleScaleDown,
  handleCohesionBarClick,
  handlePopToggleClick,
  setupEventListeners,
  setupOverlayEventListeners,
  resetInputState
};

// For browser compatibility, attach to window if available
if (typeof window !== 'undefined') {
  window.Input = {
    initInput,
    pageToCanvas,
    handleMinimapMouseDown,
    handleContainerMouseDown,
    handleWindowMouseMove,
    handleWindowMouseUp,
    handleContainerWheel,
    handleKeyDown,
    handleWindowResize,
    handleScaleUp,
    handleScaleDown,
    handleCohesionBarClick,
    handlePopToggleClick,
    setupEventListeners,
    setupOverlayEventListeners,
    resetInputState
  };
}
// js/core/initGame.js
// Game initialization — creates game state, generates map, sets up all systems

import { MAP_COLS, MAP_ROWS, TERRITORY_RADIUS, DEV_MODE, MM_W, MM_H } from '../../data/constants.js';
import { TERRAIN } from '../../data/terrain.js';

export function initGameCore(seed) {
  seed = Math.floor(seed) || 7743;
  if (window.setCurrentSeed) window.setCurrentSeed(seed);

  // Create game state and expose immediately so module functions can access it
  const gameState = window.createGameState();
  window.gameState = gameState;
  console.log('🎮 Game state created in initGame');

  // Initialize modules that need gameState early (before map generation)
  if (window.initTerritory) window.initTerritory(gameState);
  if (window.initUnitManagement) window.initUnitManagement(gameState);
  if (window.initBuildingActions) window.initBuildingActions(gameState);

  // Reset game state
  gameState.turn = 1; gameState.year = 1; gameState.season = 0;
  gameState.resources = { food: 200, materials: 50, knowledge: 5 };
  gameState.population = { total: 18, idle: 18, employed: 0 };
  gameState.cohesion = {
    identity: 60,
    legitimacy: 70,
    satisfaction: 65,
    bonds: 55,
    total: 62,
    lastUpdate: { identity: 0, legitimacy: 0, satisfaction: 0, bonds: 0 }
  };
  gameState.governance = {
    model: 'tribalCouncil',
    policies: { freedom: 50, mercy: 50, tradition: 50, workingAge: window.WORKING_AGE },
    modelChangeTimer: 0,
    lastChanged: { model: 0, policies: { freedom: 0, mercy: 0, tradition: 0 } }
  };

  // Initialize with strategically interesting child cohorts
  gameState.childCohorts = [
    { age: 8, count: 3 },  // 2 years until working age (at default 10)
    { age: 6, count: 2 },  // 4 years until working age
    { age: 2, count: 2 }   // 8 years until working age
  ];
  gameState.birthAccumulator = 0.0;

  gameState.map = []; gameState.settlements = []; gameState.rivers = []; gameState.riverSegmentCounts = new Map();
  gameState.selectedHex = null; gameState.startHex = null;
  gameState.territory = new Set(); gameState.lastTurnReport = null;

  window.resizeCanvas();
  gameState.map = window.generateMap(MAP_COLS, MAP_ROWS, seed);

  // Initialize visibility map — 0=unexplored, 1=revealed, 2=visible
  gameState.visibilityMap = [];
  for (let r = 0; r < MAP_ROWS; r++) {
    gameState.visibilityMap[r] = new Array(MAP_COLS).fill(0);
  }

  // Find grassland start near center
  let sc = Math.floor(MAP_COLS / 2), sr = Math.floor(MAP_ROWS / 2);
  outer: for (let r = 0; r < 4; r++)
    for (let row = sr - r; row <= sr + r; row++)
      for (let col = sc - r; col <= sc + r; col++)
        if (row >= 0 && row < MAP_ROWS && col >= 0 && col < MAP_COLS && gameState.map[row][col].terrain === 'grassland')
          { sc = col; sr = row; break outer; }

  gameState.startHex = { col: sc, row: sr };

  // Ensure terrain diversity near start so all building types are testable
  const diversify = [
    { terrain: 'forest', dr: -1, dc: 1 },
    { terrain: 'hills', dr: -2, dc: 0 },
    { terrain: 'wetland', dr: 0, dc: -2 },
    { terrain: 'desert', dr: -1, dc: -1 },
    { terrain: 'mountain', dr: 2, dc: 1 },
  ];
  for (const d of diversify) {
    const nr = sr + d.dr, nc = sc + d.dc;
    if (nr >= 0 && nr < MAP_ROWS && nc >= 0 && nc < MAP_COLS) {
      const hex = gameState.map[nr][nc];
      if (hex.terrain === 'grassland') {
        hex.terrain = d.terrain;
        hex.variation = Math.random();
      }
    }
  }

  // Generate rivers AFTER terrain diversity is in place so sources exist
  window.generateRivers(gameState.map, MAP_COLS, MAP_ROWS, window.createRNG(seed + 1), gameState);

  // Place starting settlement
  gameState.map[sr][sc].building = 'settlement';
  gameState.map[sr][sc].buildProgress = 0;
  gameState.settlements.push({ col: sc, row: sr });
  window.recalcTerritory();

  // Auto-assign gatherers to nearby grassland hexes to give starting food income
  let autoAssigned = 0;
  const targetAssign = 10;
  for (let radius = 1; radius <= TERRITORY_RADIUS && autoAssigned < targetAssign; radius++) {
    for (let r = 0; r < MAP_ROWS && autoAssigned < targetAssign; r++) {
      for (let c = 0; c < MAP_COLS && autoAssigned < targetAssign; c++) {
        if (window.cubeDistance(window.offsetToCube(c, r), window.offsetToCube(sc, sr)) !== radius) continue;
        const hex = gameState.map[r][c];
        if (!window.isInTerritory(c, r) || hex.building) continue;
        if (TERRAIN[hex.terrain].food >= 2) {
          hex.workers = 1;
          autoAssigned++;
        }
      }
    }
  }
  gameState.population.employed = autoAssigned;
  gameState.population.idle = gameState.population.total - autoAssigned;

  // Fog of war setup
  const fogDisabled = window.isFogOfWarDisabled ? window.isFogOfWarDisabled() : false;
  if (fogDisabled) {
    // All hexes fully visible when fog disabled
    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        gameState.visibilityMap[r][c] = 2;
      }
    }
  } else {
    window.revealArea(sc, sr, 3);
    // Reveal territory hexes and one hex beyond territory boundary
    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        if (window.isInTerritory(c, r)) {
          gameState.map[r][c].revealed = true;
          if (gameState.visibilityMap[r]) gameState.visibilityMap[r][c] = Math.max(gameState.visibilityMap[r][c], 2);
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < MAP_ROWS && nc >= 0 && nc < MAP_COLS) {
                if (window.cubeDistance(window.offsetToCube(c, r), window.offsetToCube(nc, nr)) <= 1) {
                  gameState.map[nr][nc].revealed = true;
                  if (gameState.visibilityMap[nr]) gameState.visibilityMap[nr][nc] = Math.max(gameState.visibilityMap[nr][nc], 1);
                }
              }
            }
          }
        }
      }
    }
  }

  // Center camera on map
  const ms = window.getMapPixelSize();
  gameState.camera.x = ms.width / 2;
  gameState.camera.y = ms.height / 2;

  // Calculate initial cohesion values
  window.calculateCohesion();

  // ---- Initialize all module systems ----

  const canvas = document.getElementById('game-canvas');
  const minimapCanvas = document.getElementById('minimap');
  const container = document.getElementById('canvas-container');

  if (window.initSaveLoad) {
    window.initSaveLoad(
      gameState,
      () => window.getCurrentSeed ? window.getCurrentSeed() : 7743,
      (newSeed) => { if (window.setCurrentSeed) window.setCurrentSeed(newSeed); }
    );
  }

  if (window.initInput) {
    const canvasRect = canvas.getBoundingClientRect();
    window.initInput(
      gameState,
      canvasRect,
      minimapCanvas,
      container,
      MM_W,
      MM_H,
      window.canvasW,
      window.canvasH
    );
    console.log('🎮 Input system initialized');
  }

  if (window.initTurnProcessing) {
    window.initTurnProcessing(gameState);
    console.log('🎮 Turn Processing system initialized');
  }

  // Ensure proper canvas sizing before initializing rendering
  window.resizeCanvas();

  if (window.initRendering) {
    window.initRendering(gameState, canvas, window.mapCanvas, minimapCanvas, window.canvasW, window.canvasH, container.getBoundingClientRect());
    console.log('🎮 Rendering system initialized');
  }

  if (window.initSidePanel) {
    window.initSidePanel(gameState);
    console.log('🎮 Side panel system initialized');
  }

  if (window.initOverlayManager) {
    window.initOverlayManager(gameState);
    console.log('🎮 Overlay manager system initialized');
  }

  if (window.initDialogSystem) {
    window.initDialogSystem(gameState);
    console.log('🎮 Dialog system initialized');
  }

  if (window.initDevPanel) {
    window.initDevPanel(gameState);
    console.log('🎮 Dev panel system initialized');
  }

  if (window.initUIUpdates) {
    window.initUIUpdates(gameState);
    console.log('UI updates system initialized');
  }

  if (window.initOverlayRenderers) {
    window.initOverlayRenderers(gameState);
    console.log('Overlay renderers system initialized');
  }

  if (window.initVictoryDefeat) {
    window.initVictoryDefeat(gameState);
    console.log('Victory/defeat system initialized');
  }

  if (window.initTutorial) {
    window.initTutorial(gameState);
    console.log('Tutorial system initialized');
  }

  if (window.initSettings) {
    window.initSettings();
    console.log('Settings & notifications system initialized');
  }

  if (window.initChronicle) {
    window.initChronicle(gameState);
    window.addFoundingEntry();
    console.log('📜 Chronicle system initialized');
  }

  if (window.initCulture) {
    window.initCulture(gameState);
    window.establishStarterTraditions();
    console.log('🎭 Culture system initialized');
  }

  if (window.initValues) {
    window.initValues(gameState);
    console.log('🧭 Values system initialized');
  }

  if (window.initFortifications) {
    window.initFortifications(gameState);
    console.log('🛡️ Fortifications system initialized');
  }

  // Compute initial visibility from settlement + territory
  if (window.recomputeVisibility) window.recomputeVisibility();

  window.updateTurnDisplay();
  window.updateAllUI();
  if (!DEV_MODE) document.getElementById('dev-badge').style.display = 'none';
  else window.updateDevBadge();
  if (window.render) window.render();

  return gameState;
}

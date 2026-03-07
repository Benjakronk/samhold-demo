# Samhold Modular Refactoring Plan

## Goal
Transform samhold-phase7.html (9,489 lines) into maintainable modular code organized by game systems, loading from index.html with separate files for each system.

## Method
Incremental extraction - one system at a time, testing functionality after each extraction to ensure nothing breaks.

## Current Status (Updated March 7, 2026)
- Phases 1-4c Complete: All major data, core systems, rendering, and UI panel modules extracted
- Phase 5a-5i Complete: All game systems extracted. Dev panel reconciled with authoritative versions.
- Development Environment: Stable modular development workflow at http://localhost:3001
- Progress: Reduced from 9,489 lines to ~2,371 lines (~7,118 lines extracted across 33 modules)
- index.html JS: ~568 lines (canvas setup, UI scale, sidebar toggles, initGame bootstrap)
- **Status**: Near-complete. Remaining JS in index.html is bootstrap/DOM-coupled code that's appropriate to keep inline.

## Key Architecture Note
The loader (js/loader.js) imports modules and binds exports to `window.*` for compatibility.
All game logic now lives in module files. index.html contains only CSS, HTML, canvas setup, and the initGame bootstrap.

## Completed Extraction Phases

### Phase 1: Data & Utilities (COMPLETE)
1. `data/terrain.js` - Terrain type definitions
2. `data/buildings.js` - Building definitions and costs
3. `data/units.js` - Unit types and capabilities
4. `data/threats.js` - External threat definitions
5. `data/governance.js` - Governance model definitions
6. `data/events.js` - Event library and consequences
7. `data/constants.js` - Game constants and configuration
8. `utils/hexMath.js` - Hexagonal grid mathematics
9. `utils/random.js` - Seeded random number generation

### Phase 2: Self-Contained Systems (COMPLETE)
10. `systems/externalThreats.js` - AI threat spawning and behavior
11. `systems/combat.js` - Unit vs unit and unit vs threat combat
12. `systems/governance.js` - Policy management and governance effects

### Phase 3: Game Logic Systems (COMPLETE)
13. `systems/economy.js` - Resource management and territory (includes hexAdjacentToLake, hexHasFreshWater, getWorkforceGroups)
14. `systems/events.js` - Event triggering and resolution
15. `systems/cohesion.js` - Social cohesion calculation

### Phase 4a: Rendering & Core Systems (COMPLETE)
16. `systems/mapGeneration.js` - Procedural map generation
17. `systems/saveLoad.js` - Game persistence and data serialization
18. `systems/input.js` - Mouse, keyboard, and UI interaction handling
19. `systems/turnProcessing.js` - Turn progression and game loop logic
20. `systems/rendering.js` - Canvas rendering and visual output

### Phase 4b: UI/Panel System (COMPLETE)
21. `systems/ui/sidePanel.js` - Hex info, building controls
22. `systems/ui/overlayManager.js` - Overlay state management and coordination
23. `systems/ui/dialogSystem.js` - Confirmation dialogs, alerts
24. `systems/ui/devPanel.js` - Development tools and debugging utilities

### Phase 4c: Victory/Defeat (COMPLETE)
25. `systems/victoryDefeat.js` - Win/loss conditions, scoring, post-game

### Integration Layer
26. `js/loader.js` - Module import and window binding system
27. `js/core/gameState.js` - Central game state factory

---

## Phase 5: Final Extraction (IN PROGRESS)

What remains in index.html (4,797 lines):
- CSS: ~1,440 lines (lines 7-1447)
- HTML: ~350 lines (lines 1449-1796)
- JavaScript: ~2,997 lines (lines 1800-4795)

Many JS functions are duplicates of already-extracted modules (shadowing window.* bindings).
The genuinely un-extracted functions are listed below.

### Step 5a: Unit Management -> `systems/unitManagement.js` (COMPLETE)
- [x] 15 functions extracted (createUnit, deleteUnit, startUnitTraining, etc.)

### Step 5b: Territory & Settlement -> `systems/territory.js` (COMPLETE)
- [x] 7 functions extracted (revealArea, recalcTerritory, canFoundSettlement, etc.)

### Step 5c: UI Updates -> `systems/ui/uiUpdates.js` (COMPLETE)
- [x] 5 functions extracted (updateAllUI, updateCohesionDisplay, updateTurnDisplay, showTurnSummary)

### Step 5d: Overlay Renderers -> `systems/ui/overlayRenderers.js` (COMPLETE)
- [x] 12 functions extracted (renderWorkforceOverlay, renderGovernanceOverlay, etc.)

### Step 5e: Tutorial System -> `systems/tutorial.js` (COMPLETE)
- [x] 4 functions extracted (initTutorial, showTutorialHint, showTutorialModal, closeTutorial)

### Step 5f: Settings & Notifications -> `systems/settings.js` (COMPLETE)
- [x] 4 functions + event listener wiring (initSettings, openSettings, returnToMainMenu, showNotification)

### Step 5g: Building Actions & Hex Click -> `systems/buildingActions.js` (COMPLETE)
- [x] 4 functions extracted (initBuildingActions, handleHexClick, placeBuilding, demolishBuilding)
- [x] Exposed canvasW, canvasH, screenToWorld, worldToScreen on window.* for module access

### Step 5h: Canvas Setup -> fold into rendering or new module (~60 lines)
- [ ] resizeCanvas, getMapPixelSize, worldToScreen, screenToWorld
- [ ] Canvas element creation and context references
- [ ] Add to loader.js, remove from index.html

### Step 5i: Reconcile dev panel and remove duplicates (COMPLETE)
- [x] Replaced devPanel.js stub with full authoritative version from index.html
- [x] Moved ALL dev helper functions to devPanel.js (population editor, fog of war, governance, tutorial controls)
- [x] Moved dev event listener wiring to initDevPanel()
- [x] Removed confirmTrainUnit, confirmBuildBuilding duplicates
- [x] Removed ~743 lines of duplicate dev panel code from index.html
- [x] Added getCurrentSeed/setCurrentSeed accessors for save/load integration

### Step 5j: Final Cleanup (MOSTLY COMPLETE)
- [x] All major duplicates removed
- [x] Exposed remaining inline functions on window.* (applyUIScale, resizeCanvas, sidebar toggles)
- Remaining in index.html (~568 lines JS):
  - Canvas setup (resizeCanvas, getMapPixelSize, worldToScreen, screenToWorld) — DOM-coupled, appropriate inline
  - UI scale functions (getMaxUIScale, clampTopBar, applyUIScale) — depends on resizeCanvas
  - Sidebar toggle helpers — called via onclick from HTML
  - initGame bootstrap (~400 lines) — core initialization
- [ ] Optional: Further reduce initGame by extracting game state reset to a module
- [ ] Target achieved: index.html < 2,400 lines (CSS ~1,440 + HTML ~350 + JS ~568)

## Target Architecture (when complete)
- ~35 total modules with clean separation of concerns
- index.html: CSS + HTML + thin bootstrap only
- All game logic in modular files
- loader.js as the single integration point

## Success Criteria
- Game remains fully playable after each extraction
- All existing functionality preserved
- Code organized into logical, maintainable modules
- Clear separation of concerns between systems
- index.html reduced to < 2,000 lines (CSS + HTML + minimal JS glue)

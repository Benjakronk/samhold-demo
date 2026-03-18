// ---- MODULE LOADER ----
// Imports and exposes modular game data to the main game
// This is our incremental bridge between the monolithic and modular structure

import { TERRAIN } from '../data/terrain.js';
import { BUILDINGS } from '../data/buildings.js';
import { UNIT_TYPES } from '../data/units.js';
import { THREAT_TYPES } from '../data/threats.js';
import { GOVERNANCE_MODELS } from '../data/governance.js';
import { EVENT_LIBRARY } from '../data/events.js';
import * as CONSTANTS from '../data/constants.js';
import { createGameState } from './core/gameState.js';
import { initGameCore } from './core/initGame.js';
import { createRNG } from '../utils/random.js';
import {
  offsetToCube,
  cubeDistance,
  hexToPixel,
  pixelToHex,
  hexNeighbor,
  canonicalEdgeKey,
  getEdgeBetween
} from '../utils/hexMath.js';
import * as ExternalThreats from '../systems/externalThreats.js';
import * as Combat from '../systems/combat.js';
import * as Governance from '../systems/governance.js';
import * as Events from '../systems/events.js';
import * as Economy from '../systems/economy.js';
import * as Cohesion from '../systems/cohesion.js';
import * as MapGeneration from '../systems/mapGeneration.js';
import * as SaveLoad from '../systems/saveLoad.js';
import * as Input from '../systems/input.js';
import * as TurnProcessing from '../systems/turnProcessing.js';
import * as Rendering from '../systems/rendering.js';
import * as SidePanel from '../systems/ui/sidePanel.js';
import * as OverlayManager from '../systems/ui/overlayManager.js';
import * as DialogSystem from '../systems/ui/dialogSystem.js';
import * as DevPanel from '../systems/ui/devPanel.js';
import * as UIUpdates from '../systems/ui/uiUpdates.js';
import * as OverlayRenderers from '../systems/ui/overlayRenderers.js';
import * as VictoryDefeat from '../systems/victoryDefeat.js';
import * as UnitManagement from '../systems/unitManagement.js';
import * as Territory from '../systems/territory.js';
import * as Tutorial from '../systems/tutorial.js';
import * as Settings from '../systems/settings.js';
import * as BuildingActions from '../systems/buildingActions.js';
import * as Chronicle from '../systems/chronicle.js';
import * as Culture from '../systems/culture.js';
import * as Values from '../systems/values.js';
import * as Trust from '../systems/trust.js';
import * as PolicyLag from '../systems/policyLag.js';
import * as Resistance from '../systems/resistance.js';
import * as Crime from '../systems/crime.js';
import * as Immigration from '../systems/immigration.js';
import * as Fortifications from '../systems/fortifications.js';
import * as ClassSystem from '../systems/classSystem.js';
import { FORTIFICATIONS, WALL_INSET } from '../data/fortifications.js';
import {
  STRATIFICATION_BASES, DIFFERENTIALS, ACTIVATION_COSTS, DISMANTLEMENT_COSTS,
  BASIS_CHANGE_COSTS, MIN_TURNS_FOR_ACTIVATION, AFFINITY_BONUS, AFFINITY_PENALTY,
  CRIME_MULTIPLIER_WEIGHTS, ALIGNMENT_MULTIPLIERS
} from '../data/classSystem.js';

// Make all data available globally to maintain compatibility with existing game code
window.TERRAIN = TERRAIN;
window.BUILDINGS = BUILDINGS;
window.UNIT_TYPES = UNIT_TYPES;
window.THREAT_TYPES = THREAT_TYPES;
window.GOVERNANCE_MODELS = GOVERNANCE_MODELS;
window.EVENT_LIBRARY = EVENT_LIBRARY;
window.FORTIFICATIONS = FORTIFICATIONS;
window.WALL_INSET = WALL_INSET;
window.STRATIFICATION_BASES = STRATIFICATION_BASES;
window.DIFFERENTIALS = DIFFERENTIALS;
window.ACTIVATION_COSTS = ACTIVATION_COSTS;
window.DISMANTLEMENT_COSTS = DISMANTLEMENT_COSTS;
window.BASIS_CHANGE_COSTS = BASIS_CHANGE_COSTS;
window.MIN_TURNS_FOR_ACTIVATION = MIN_TURNS_FOR_ACTIVATION;
window.AFFINITY_BONUS = AFFINITY_BONUS;
window.AFFINITY_PENALTY = AFFINITY_PENALTY;
window.CRIME_MULTIPLIER_WEIGHTS = CRIME_MULTIPLIER_WEIGHTS;
window.ALIGNMENT_MULTIPLIERS = ALIGNMENT_MULTIPLIERS;

// Export constants individually for compatibility
window.MAP_COLS = CONSTANTS.MAP_COLS;
window.MAP_ROWS = CONSTANTS.MAP_ROWS;
window.HEX_SIZE = CONSTANTS.HEX_SIZE;
window.MAP_PAD = CONSTANTS.MAP_PAD;
window.TERRITORY_RADIUS = CONSTANTS.TERRITORY_RADIUS;
window.FOOD_PER_POP = CONSTANTS.FOOD_PER_POP;
window.FOOD_PER_CHILD = CONSTANTS.FOOD_PER_CHILD;
window.WORKING_AGE_MIN = CONSTANTS.WORKING_AGE_MIN;
window.WORKING_AGE_MAX = CONSTANTS.WORKING_AGE_MAX;
window.WORKING_AGE = CONSTANTS.WORKING_AGE;
window.SEASONS = CONSTANTS.SEASONS;
window.DEV_MODE = CONSTANTS.DEV_MODE;
window.BASE_BIRTH_RATE = CONSTANTS.BASE_BIRTH_RATE;
window.MM_W = CONSTANTS.MM_W;
window.MM_H = CONSTANTS.MM_H;

// Utility functions
window.createRNG = createRNG;
window.offsetToCube = offsetToCube;
window.cubeDistance = cubeDistance;
window.hexToPixel = hexToPixel;
window.pixelToHex = pixelToHex;
window.hexNeighbor = hexNeighbor;
window.canonicalEdgeKey = canonicalEdgeKey;
window.getEdgeBetween = getEdgeBetween;

// External Threats system
window.spawnThreat = ExternalThreats.spawnThreat;
window.findRandomMapEdge = ExternalThreats.findRandomMapEdge;
window.findNearestSettlement = ExternalThreats.findNearestSettlement;
window.processThreats = ExternalThreats.processThreats;
window.moveThreatTowardTarget = ExternalThreats.moveThreatTowardTarget;
window.attackSettlement = ExternalThreats.attackSettlement;
window.calculateDefensiveStrength = ExternalThreats.calculateDefensiveStrength;
window.applyRaidDamage = ExternalThreats.applyRaidDamage;
window.shouldSpawnThreat = ExternalThreats.shouldSpawnThreat;
window.checkThreatSpawning = ExternalThreats.checkThreatSpawning;

// Combat system
window.initiateCombat = Combat.initiateCombat;
window.resolveCombat = Combat.resolveCombat;
window.checkForCombatOpportunities = Combat.checkForCombatOpportunities;
window.findUnitsInRange = Combat.findUnitsInRange;
window.processCombatPhase = Combat.processCombatPhase;
window.canUnitAttackThreat = Combat.canUnitAttackThreat;

// Governance system
window.changeGovernanceModel = Governance.changeGovernanceModel;
window.adjustPolicy = Governance.adjustPolicy;
window.getGovernanceModel = Governance.getGovernanceModel;
window.adjustWorkingAge = Governance.adjustWorkingAge;
window.getPolicyLabel = Governance.getPolicyLabel;
window.getWorkingAgeLabel = Governance.getWorkingAgeLabel;
window.updatePolicySummary = Governance.updatePolicySummary;
window.checkModelRequirements = Governance.checkModelRequirements;
window.processGovernanceTurn = Governance.processGovernanceTurn;
window.getMilitaryCombatBonuses = Governance.getMilitaryCombatBonuses;
window.onCombatVictory = Governance.onCombatVictory;
window.onCombatDefeat = Governance.onCombatDefeat;
window.getPolicyConstraints = Governance.getPolicyConstraints;

// Event system
window.checkEventTriggers = Events.checkEventTriggers;
window.canEventTrigger = Events.canEventTrigger;
window.evaluateCondition = Events.evaluateCondition;
window.evaluateOperator = Events.evaluateOperator;
window.triggerEvent = Events.triggerEvent;
window.showEventDialog = Events.showEventDialog;
window.hideEventDialog = Events.hideEventDialog;
window.generateEventFeedback = Events.generateEventFeedback;
window.showEventResolution = Events.showEventResolution;
window.closeEventResolution = Events.closeEventResolution;
window.selectEventChoice = Events.selectEventChoice;
window.applyEventConsequences = Events.applyEventConsequences;
window.processPendingEvents = Events.processPendingEvents;
window.processActiveEvents = Events.processActiveEvents;
window.applyImmediateEffects = Events.applyImmediateEffects;
window.calculateContextualModifiers = Events.calculateContextualModifiers;
window.getTotalChildren = Events.getTotalChildren;
window.resetEventSystem = Events.resetEventSystem;

// Economy system
window.isInTerritory = Economy.isInTerritory;
window.getMaxWorkers = Economy.getMaxWorkers;
window.getHexYield = Economy.getHexYield;
window.calculateIncome = Economy.calculateIncome;
window.clampWorkers = Economy.clampWorkers;
window.assignWorker = Economy.assignWorker;
window.unassignWorker = Economy.unassignWorker;
window.getWorkforceGroups = Economy.getWorkforceGroups;
window.renderWorkersTab = Economy.renderWorkersTab;
window.wfAddWorker = Economy.wfAddWorker;
window.wfInitiateBuild = Economy.wfInitiateBuild;
window.findValidHexesForBuilding = Economy.findValidHexesForBuilding;
window.wfRemoveWorker = Economy.wfRemoveWorker;
window.openWorkforceOverlay = Economy.openWorkforceOverlay;
window.hexHasFreshWater = Economy.hexHasFreshWater;
window.hexAdjacentToLake = Economy.hexAdjacentToLake;

// Cohesion system
window.calculateCohesion = Cohesion.calculateCohesion;
window.calculateSatisfactionPillar = Cohesion.calculateSatisfactionPillar;
window.calculateIdentityPillar = Cohesion.calculateIdentityPillar;
window.calculateLegitimacyPillar = Cohesion.calculateLegitimacyPillar;
window.calculateBondsPillar = Cohesion.calculateBondsPillar;
window.calculateShelterPoints = Cohesion.calculateShelterPoints;
window.getCohesionStatus = Cohesion.getCohesionStatus;
window.applyCohesionEffects = Cohesion.applyCohesionEffects;
window.updateCohesionDisplay = Cohesion.updateCohesionDisplay;
window.previewCohesionDeltas = Cohesion.previewCohesionDeltas;

// Map Generation system
window.generateMap = MapGeneration.generateMap;
window.buildVertexGraph = MapGeneration.buildVertexGraph;
window.generateRivers = MapGeneration.generateRivers;
window.mkHex = MapGeneration.mkHex;
window.weightedPick = MapGeneration.weightedPick;

// Save/Load system
window.initSaveLoad = SaveLoad.initSaveLoad;
window.saveGameToSlot = SaveLoad.saveGameToSlot;
window.confirmLoadGame = SaveLoad.confirmLoadGame;
window.loadGameFromSlot = SaveLoad.loadGameFromSlot;
window.openSaveLoadPanel = SaveLoad.openSaveLoadPanel;
window.showSaveLoadPanel = SaveLoad.showSaveLoadPanel;
window.closeSaveLoadPanel = SaveLoad.closeSaveLoadPanel;
window.switchSaveLoadTab = SaveLoad.switchSaveLoadTab;
window.performSave = SaveLoad.performSave;
window.performLoad = SaveLoad.performLoad;
window.refreshSavesList = SaveLoad.refreshSavesList;
window.refreshLoadList = SaveLoad.refreshLoadList;
window.refreshSaveList = SaveLoad.refreshSaveList;
window.populateSaveName = SaveLoad.populateSaveName;
window.deleteSave = SaveLoad.deleteSave;

// Input system
window.initInput = Input.initInput;
window.pageToCanvas = Input.pageToCanvas;
window.handleMinimapMouseDown = Input.handleMinimapMouseDown;
window.handleContainerMouseDown = Input.handleContainerMouseDown;
window.handleWindowMouseMove = Input.handleWindowMouseMove;
window.handleWindowMouseUp = Input.handleWindowMouseUp;
window.handleContainerWheel = Input.handleContainerWheel;
window.handleKeyDown = Input.handleKeyDown;
window.handleWindowResize = Input.handleWindowResize;
window.handleScaleUp = Input.handleScaleUp;
window.handleScaleDown = Input.handleScaleDown;
window.handleCohesionBarClick = Input.handleCohesionBarClick;
window.handlePopToggleClick = Input.handlePopToggleClick;
window.setupEventListeners = Input.setupEventListeners;
window.setupOverlayEventListeners = Input.setupOverlayEventListeners;
window.resetInputState = Input.resetInputState;

// Turn Processing system
window.initTurnProcessing = TurnProcessing.initTurnProcessing;
window.processTurn = TurnProcessing.processTurn;
window.processUnitUpkeep = TurnProcessing.processUnitUpkeep;
window.processBirths = TurnProcessing.processBirths;
window.processAging = TurnProcessing.processAging;
window.processStarvation = TurnProcessing.processStarvation;
window.checkVictoryConditions = TurnProcessing.checkVictoryConditions;
window.calculateVictoryScores = TurnProcessing.calculateVictoryScores;
window.trackGovernanceChange = TurnProcessing.trackGovernanceChange;

// Rendering system
window.initRendering = Rendering.initRendering;
window.pageToCanvas = Rendering.pageToCanvas;
window.drawHexPath = Rendering.drawHexPath;
window.drawHexStatic = Rendering.drawHexStatic;
window.drawTerrainDetail = Rendering.drawTerrainDetail;
window.renderMapToCache = Rendering.renderMapToCache;
window.render = Rendering.render;
window.drawOverlays = Rendering.drawOverlays;
window.drawMovementRange = Rendering.drawMovementRange;
window.drawUnits = Rendering.drawUnits;
window.drawUnitsInTraining = Rendering.drawUnitsInTraining;
window.drawThreats = Rendering.drawThreats;
window.drawMinimap = Rendering.drawMinimap;
window.minimapToCamera = Rendering.minimapToCamera;
window.setDevRenderingFlags = Rendering.setDevRenderingFlags;
window.updateCanvasRect = Rendering.updateCanvasRect;
window.setMapDirty = Rendering.setMapDirty;
window.invalidateFeatureLabelCache = Rendering.invalidateFeatureLabelCache;

// Side Panel system
window.initSidePanel = SidePanel.initSidePanel;
window.updateSidePanel = SidePanel.updateSidePanel;
window.clearSidePanel = SidePanel.clearSidePanel;
window.toggleSocietySection = SidePanel.toggleSocietySection;
window.togglePopulationSection = SidePanel.togglePopulationSection;
window.toggleHexInfoSection = SidePanel.toggleHexInfoSection;
window.toggleBuildSection = SidePanel.toggleBuildSection;
window.toggleTrainingSection = SidePanel.toggleTrainingSection;
window.toggleCultureSection = SidePanel.toggleCultureSection;
window.toggleFortificationsSection = SidePanel.toggleFortificationsSection;
window.selectFortEdge = SidePanel.selectFortEdge;
window.deselectFortEdge = SidePanel.deselectFortEdge;

// Overlay Manager system
window.initOverlayManager = OverlayManager.initOverlayManager;
window.isAnyOverlayOpen = OverlayManager.isAnyOverlayOpen;
window.openOverlay = OverlayManager.openOverlay;
window.closeOverlay = OverlayManager.closeOverlay;
window.closeAllOverlays = OverlayManager.closeAllOverlays;
window.openWorkforceOverlay = OverlayManager.openWorkforceOverlay;
window.closeWorkforceOverlay = OverlayManager.closeWorkforceOverlay;
window.openGovernanceOverlay = OverlayManager.openGovernanceOverlay;
window.closeGovernanceOverlay = OverlayManager.closeGovernanceOverlay;
window.openPopulationDetailsOverlay = OverlayManager.openPopulationDetailsOverlay;
window.closePopulationDetailsOverlay = OverlayManager.closePopulationDetailsOverlay;
window.openSettingsOverlay = OverlayManager.openSettingsOverlay;
window.closeSettingsOverlay = OverlayManager.closeSettingsOverlay;
window.openGameMenuOverlay = OverlayManager.openGameMenuOverlay;
window.closeGameMenuOverlay = OverlayManager.closeGameMenuOverlay;
window.openDevOverlay = OverlayManager.openDevOverlay;
window.closeDevOverlay = OverlayManager.closeDevOverlay;
window.switchWorkforceTab = OverlayManager.switchWorkforceTab;
window.switchGovernanceTab = OverlayManager.switchGovernanceTab;
window.getActiveWorkforceTab = OverlayManager.getActiveWorkforceTab;
window.getActiveGovernanceTab = OverlayManager.getActiveGovernanceTab;
window.isOverlayOpen = OverlayManager.isOverlayOpen;
window.handleEscapeKey = OverlayManager.handleEscapeKey;
window.togglePanelsMenu = OverlayManager.togglePanelsMenu;
window.closePanelsMenu = OverlayManager.closePanelsMenu;
window.toggleFeatureLabels = OverlayManager.toggleFeatureLabels;
window.toggleRegionView = OverlayManager.toggleRegionView;
window.openCohesionOverlay = OverlayManager.openCohesionOverlay;
window.closeCohesionOverlay = OverlayManager.closeCohesionOverlay;

// Dialog System
window.initDialogSystem = DialogSystem.initDialogSystem;
window.showConfirmDialog = DialogSystem.showConfirmDialog;
window.showConfirmationDialog = DialogSystem.showConfirmationDialog;
window.showConfirmDialogNonDestructive = DialogSystem.showConfirmDialogNonDestructive;
window.confirmTrainUnit = DialogSystem.confirmTrainUnit;
window.confirmBuildBuilding = DialogSystem.confirmBuildBuilding;
window.confirmDisbandUnit = DialogSystem.confirmDisbandUnit;
window.confirmDemolishBuilding = DialogSystem.confirmDemolishBuilding;
window.confirmCancelConstruction = DialogSystem.confirmCancelConstruction;
window.showAlert = DialogSystem.showAlert;
window.closeDialog = DialogSystem.closeDialog;
window.isDialogOpen = DialogSystem.isDialogOpen;

// Dev Panel System
window.initDevPanel = DevPanel.initDevPanel;
window.openDevOverlay = DevPanel.openDevOverlay;
window.closeDevOverlay = DevPanel.closeDevOverlay;
window.renderDevOverlay = DevPanel.renderDevOverlay;
window.switchDevTab = DevPanel.switchDevTab;
window.getActiveDevTab = DevPanel.getActiveDevTab;
window.renderDevTabContent = DevPanel.renderDevTabContent;
window.devGroup = DevPanel.devGroup;
window.devRow = DevPanel.devRow;
window.devAdjust = DevPanel.devAdjust;
window.devRandomizeSeed = DevPanel.devRandomizeSeed;
window.applyDevValues = DevPanel.applyDevValues;
window.applyDevValuesAndRestart = DevPanel.applyDevValuesAndRestart;
window.devTriggerEvent = DevPanel.devTriggerEvent;
window.devClearEventCooldowns = DevPanel.devClearEventCooldowns;
window.devCreateUnit = DevPanel.devCreateUnit;
window.devGiveResources = DevPanel.devGiveResources;
window.devSetResource = DevPanel.devSetResource;
window.devAddResource = DevPanel.devAddResource;
window.devSpawnThreat = DevPanel.devSpawnThreat;
window.devAddPopulation = DevPanel.devAddPopulation;
window.devMaxCohesion = DevPanel.devMaxCohesion;
window.devMinCohesion = DevPanel.devMinCohesion;
window.updateDevBadge = DevPanel.updateDevBadge;
window.devToggleRiverVertices = DevPanel.devToggleRiverVertices;
window.devToggleRiver = DevPanel.devToggleRiver;
window.setCurrentSeed = DevPanel.setCurrentSeed;
window.getCurrentSeed = DevPanel.getCurrentSeed;
window.toggleFogOfWar = DevPanel.toggleFogOfWar;
window.adjustAdults = DevPanel.adjustAdults;
window.forceGovernanceModel = DevPanel.forceGovernanceModel;
window.adjustCohortByAge = DevPanel.adjustCohortByAge;
window.setCohortCountByAge = DevPanel.setCohortCountByAge;
window.devResetHints = DevPanel.devResetHints;
window.devDisableHints = DevPanel.devDisableHints;
window.devTestHint = DevPanel.devTestHint;
window.devShowRandomHint = DevPanel.devShowRandomHint;
window.isFogOfWarDisabled = DevPanel.isFogOfWarDisabled;
window.getDevShowRiverVertices = DevPanel.getDevShowRiverVertices;
window.getDevHighlightRivers = DevPanel.getDevHighlightRivers;

// Victory/Defeat system
window.initVictoryDefeat = VictoryDefeat.initVictoryDefeat;
window.checkVictoryConditions = VictoryDefeat.checkVictoryConditions;
window.checkLossConditions = VictoryDefeat.checkLossConditions;
window.calculateVictoryScores = VictoryDefeat.calculateVictoryScores;
window.showDefeatSummary = VictoryDefeat.showDefeatSummary;
window.getDefeatLesson = VictoryDefeat.getDefeatLesson;
window.showPostGameSummary = VictoryDefeat.showPostGameSummary;
window.generateCivilizationNarrative = VictoryDefeat.generateCivilizationNarrative;
window.countBuildingsByType = VictoryDefeat.countBuildingsByType;
window.getOverallRating = VictoryDefeat.getOverallRating;
window.trackGovernanceChange = VictoryDefeat.trackGovernanceChange;
window.updateEndTurnButton = VictoryDefeat.updateEndTurnButton;
window.closeDefeatSummary = VictoryDefeat.closeDefeatSummary;
window.continuePlay = VictoryDefeat.continuePlay;
window.restartGame = VictoryDefeat.restartGame;
window.VICTORY_TARGET_TURN = VictoryDefeat.VICTORY_TARGET_TURN;

// Unit Management system
window.initUnitManagement = UnitManagement.initUnitManagement;
window.startUnitTraining = UnitManagement.startUnitTraining;
window.cancelUnitTraining = UnitManagement.cancelUnitTraining;
window.createUnit = UnitManagement.createUnit;
window.deleteUnit = UnitManagement.deleteUnit;
window.disbandUnit = UnitManagement.disbandUnit;
window.getUnitsAt = UnitManagement.getUnitsAt;
window.moveUnit = UnitManagement.moveUnit;
window.resetUnitMovement = UnitManagement.resetUnitMovement;
window.selectUnit = UnitManagement.selectUnit;
window.selectUnitForMovement = UnitManagement.selectUnitForMovement;
window.deselectUnit = UnitManagement.deselectUnit;
window.setUnitMode = UnitManagement.setUnitMode;
window.activateActionMode = UnitManagement.activateActionMode;
window.getValidMoveTargets = UnitManagement.getValidMoveTargets;
window.getValidActionTargets = UnitManagement.getValidActionTargets;
window.hasUnitActions = UnitManagement.hasUnitActions;
window.executeUnitAction = UnitManagement.executeUnitAction;
window.getBlockedMoveTargets = UnitManagement.getBlockedMoveTargets;
window.calculateMoveCost = UnitManagement.calculateMoveCost;
window.canUnitEnterHex = UnitManagement.canUnitEnterHex;

// Overlay Renderers system
window.initOverlayRenderers = OverlayRenderers.initOverlayRenderers;
window.renderWorkforceOverlay = OverlayRenderers.renderWorkforceOverlay;
window.renderUnitsTab = OverlayRenderers.renderUnitsTab;
window.wfInitiateTrain = OverlayRenderers.wfInitiateTrain;
window.selectAndFocusUnit = OverlayRenderers.selectAndFocusUnit;
window.renderGovernanceOverlay = OverlayRenderers.renderGovernanceOverlay;
window.selectGovernanceModel = OverlayRenderers.selectGovernanceModel;
window.openPopulationDetails = OverlayRenderers.openPopulationDetails;
window.closePopulationDetails = OverlayRenderers.closePopulationDetails;
window.renderPopulationDetails = OverlayRenderers.renderPopulationDetails;
window.openGameMenu = OverlayRenderers.openGameMenu;
window.closeGameMenu = OverlayRenderers.closeGameMenu;
window.renderCohesionOverlay = OverlayRenderers.renderCohesionOverlay;

// UI Updates system
window.initUIUpdates = UIUpdates.initUIUpdates;
window.updateAllUI = UIUpdates.updateAllUI;
window.updateCohesionDisplay = UIUpdates.updateCohesionDisplay;
window.updateValuesDisplay = UIUpdates.updateValuesDisplay;
window.updateTurnDisplay = UIUpdates.updateTurnDisplay;
window.showTurnSummary = UIUpdates.showTurnSummary;

// Territory & Settlement system
window.initTerritory = Territory.initTerritory;
window.hexHasRiver = Territory.hexHasRiver;
window.revealArea = Territory.revealArea;
window.recalcTerritory = Territory.recalcTerritory;
window.canFoundSettlement = Territory.canFoundSettlement;
window.foundSettlement = Territory.foundSettlement;
window.showSettlementFoundingConfirmation = Territory.showSettlementFoundingConfirmation;
window.recomputeVisibility = Territory.recomputeVisibility;

// Fortifications system
window.initFortifications = Fortifications.initFortifications;
window.getFortification = Fortifications.getFortification;
window.getHexFortifications = Fortifications.getHexFortifications;
window.placeFortification = Fortifications.placeFortification;
window.upgradeFortification = Fortifications.upgradeFortification;
window.damageFortification = Fortifications.damageFortification;
window.demolishFortification = Fortifications.demolishFortification;
window.processFortificationConstruction = Fortifications.processFortificationConstruction;
window.isEdgeBlocked = Fortifications.isEdgeBlocked;
window.getSettlementFortificationBonus = Fortifications.getSettlementFortificationBonus;
window.assignFortWorker = Fortifications.assignFortWorker;
window.unassignFortWorker = Fortifications.unassignFortWorker;

// Fortification UI helpers (inline — too small for a module)

// Place a fortification directly from the panel hex diagram (no confirm dialog needed —
// type and cost are shown on the button before clicking).
window.buildFortAt = function(col, row, edge, type) {
  const success = window.placeFortification(col, row, edge, type);
  if (success) {
    if (window.setMapDirty) window.setMapDirty(true);
    if (window.updateAllUI) window.updateAllUI();
    const hex = window.gameState.map[row]?.[col];
    if (hex && window.updateSidePanel) window.updateSidePanel(hex);
    if (window.render) window.render();
  }
};

window.enterFortifyMode = function(col, row) {
  const gs = window.gameState;
  gs.unitInteractionMode = 'fortify';
  gs.selectedHex = gs.map[row][col];
  window.hoveredHex = null;
  window.hoveredEdge = null;
  if (window.updateSidePanel) window.updateSidePanel(gs.selectedHex);
  if (window.render) window.render();
};

window.confirmDemolishFortification = function(col, row, edge) {
  const fort = window.getFortification(col, row, edge);
  if (!fort) return;
  const def = FORTIFICATIONS[fort.type];
  const refund = Math.floor((def?.cost?.materials || 0) / 2);
  window.showConfirmDialog(
    'Demolish Fortification',
    `Demolish this ${def?.name || 'fortification'}?<br>Refunds 🪵${refund} materials.`,
    'Demolish', 'Cancel',
    () => {
      window.demolishFortification(col, row, edge);
      if (window.gameState.selectedHex) window.updateSidePanel(window.gameState.selectedHex);
      if (window.render) window.render();
    }
  );
};

window.confirmUpgradeFortification = function(col, row, edge) {
  const wallDef = FORTIFICATIONS.wall;
  const canAfford = window.gameState.resources.materials >= wallDef.upgradeCost.materials;
  if (!canAfford) {
    window.showAlert('Not Enough Materials', `<p>Upgrading to Stone Wall costs 🪵${wallDef.upgradeCost.materials} materials.</p>`);
    return;
  }
  window.showConfirmDialogNonDestructive(
    'Upgrade to Stone Wall',
    `Upgrade this palisade to a Stone Wall?<br>Cost: 🪵${wallDef.upgradeCost.materials}<br>HP: ${wallDef.health} · Defense: +${wallDef.defenseBonus}<br>Build time: ${wallDef.buildTurns} turns`,
    'Upgrade', 'Cancel',
    () => {
      window.upgradeFortification(col, row, edge);
      if (window.gameState.selectedHex) window.updateSidePanel(window.gameState.selectedHex);
      if (window.render) window.render();
    }
  );
};

// Handle fortify-mode edge click
window.handleFortifyClick = function(col, row, edge) {
  const fort = window.getFortification(col, row, edge);
  if (fort) return; // Already has fort

  if (!window.isInTerritory(col, row)) return;

  // Show type selection dialog
  let body = '<div style="display:flex;flex-direction:column;gap:8px;">';
  for (const [type, def] of Object.entries(FORTIFICATIONS)) {
    if (type === 'wall') continue; // Wall is upgrade-only
    const canAfford = window.gameState.resources.materials >= def.cost.materials;
    body += `<button class="detail-btn" style="text-align:left;padding:8px;${canAfford ? '' : 'opacity:0.5;'}"
      ${canAfford ? `onclick="window.placeFortification(${col},${row},${edge},'${type}'); window.closeDialog(); window.gameState.unitInteractionMode=null; window.hoveredHex=null; window.hoveredEdge=null; if(window.gameState.selectedHex)window.updateSidePanel(window.gameState.selectedHex); if(window.render)window.render();"` : 'disabled'}>
      ${def.icon} <strong>${def.name}</strong> · 🪵${def.cost.materials} · 🔨${def.buildTurns}t · HP ${def.health} · Def +${def.defenseBonus}<br>
      <small>${def.description}</small>
    </button>`;
  }
  body += '</div>';
  // Use a custom approach: show dialog, hide OK (choices are inline buttons)
  window.showConfirmDialogNonDestructive('Build Fortification', body, '', 'Cancel', () => {});
  // Hide the OK button since choices are inline; restore on cleanup via MutationObserver
  const okBtn = document.getElementById('confirm-ok');
  if (okBtn) {
    okBtn.style.display = 'none';
    // Restore display when dialog closes (clone-based cleanup creates a new element)
    const dialog = document.getElementById('confirm-dialog');
    const obs = new MutationObserver(() => {
      if (!dialog.classList.contains('visible')) {
        const newOk = document.getElementById('confirm-ok');
        if (newOk) newOk.style.display = '';
        obs.disconnect();
      }
    });
    obs.observe(dialog, { attributes: true, attributeFilter: ['class'] });
  }
};

// Tutorial system
window.initTutorial = Tutorial.initTutorial;
window.showTutorialHint = Tutorial.showTutorialHint;
window.showTutorialModal = Tutorial.showTutorialModal;
window.closeTutorial = Tutorial.closeTutorial;

// Settings & Notifications system
window.initSettings = Settings.initSettings;
window.openSettings = Settings.openSettings;
window.returnToMainMenu = Settings.returnToMainMenu;
window.showNotification = Settings.showNotification;
window.applyUIScale = Settings.applyUIScale;

// Chronicle system
window.initChronicle = Chronicle.initChronicle;
window.addChronicleEntry = Chronicle.addChronicleEntry;
window.recordTurnInChronicle = Chronicle.recordTurnInChronicle;
window.addGovernanceChronicle = Chronicle.addGovernanceChronicle;
window.addFoundingEntry = Chronicle.addFoundingEntry;
window.openChronicle = Chronicle.openChronicle;
window.closeChronicle = Chronicle.closeChronicle;
window.renderChronicleEntries = Chronicle.renderChronicleEntries;
window.getChronicleNarrative = Chronicle.getChronicleNarrative;

// Culture & Traditions system
window.initCulture = Culture.initCulture;
window.getScaledTraditionCost = Culture.getScaledTraditionCost;
window.switchTraditionsTab = Culture.switchTraditionsTab;
window.establishTradition = Culture.establishTradition;
window.removeTradition = Culture.removeTradition;
window.getTraditionRemovalPenalty = Culture.getTraditionRemovalPenalty;
window.processTraditions = Culture.processTraditions;
window.projectTraditionDeltas = Culture.projectTraditionDeltas;
window.processTraditionTrigger = Culture.processTraditionTrigger;
window.getAvailableTraditions = Culture.getAvailableTraditions;
window.getActiveTraditions = Culture.getActiveTraditions;
window.establishStarterTraditions = Culture.establishStarterTraditions;
window.openTraditions = Culture.openTraditions;
window.closeTraditions = Culture.closeTraditions;
window.renderTraditionsPanel = Culture.renderTraditionsPanel;
window.confirmEstablishTradition = Culture.confirmEstablishTradition;
window.confirmChangeTradition = Culture.confirmChangeTradition;
window.changeTradition = Culture.changeTradition;
window.confirmRemoveTradition = Culture.confirmRemoveTradition;
// Oral tradition / storytelling
window.addStoryteller = Culture.addStoryteller;
window.removeStoryteller = Culture.removeStoryteller;
window.processStories = Culture.processStories;
window.clampStorytellers = Culture.clampStorytellers;
window.openStories = Culture.openStories;
window.switchChronicleTab = Culture.switchChronicleTab;
window.renderStoriesPanel = Culture.renderStoriesPanel;
// Sacred sites & landscape naming
window.getSacredSiteReasonStatus = Culture.getSacredSiteReasonStatus;
window.checkDesecration = Culture.checkDesecration;
window.processSacredPlaces = Culture.processSacredPlaces;
window.processSocietyBuildings = Culture.processSocietyBuildings;
window.confirmBuildMonument = Culture.confirmBuildMonument;
window.hasSettlementMeetingHall = Culture.hasSettlementMeetingHall;
window.hasSettlementMarket = Culture.hasSettlementMarket;
window.getMonumentRestoreCost = Culture.getMonumentRestoreCost;
window.activateStewardTend = Culture.activateStewardTend;
window.deactivateStewardTend = Culture.deactivateStewardTend;
window.confirmBuildSacredSite = Culture.confirmBuildSacredSite;
window.isNameableTerrain = Culture.isNameableTerrain;
window.getNamedLake = Culture.getNamedLake;
window.getNamedFeature = Culture.getNamedFeature;
window.getNamedRiver = Culture.getNamedRiver;
window.nameFeature = Culture.nameFeature;
window.confirmNameFeature = Culture.confirmNameFeature;
window.confirmNameLake = Culture.confirmNameLake;
window.getRiversAtHex = Culture.getRiversAtHex;
window.getRiverAtHex = Culture.getRiverAtHex;
window.confirmNameRiver = Culture.confirmNameRiver;
// Region system
window.getRegionColor = Culture.getRegionColor;
window.getRegionOwner = Culture.getRegionOwner;
window.getRegionAt = Culture.getRegionAt;
window.canFoundRegion = Culture.canFoundRegion;
window.foundRegion = Culture.foundRegion;
window.showRegionFoundingConfirmation = Culture.showRegionFoundingConfirmation;
window.processRegions = Culture.processRegions;

// Values system
window.initValues = Values.initValues;
window.processValues = Values.processValues;
window.getRecognizedValues = Values.getRecognizedValues;
window.getValueTrackingStatus = Values.getValueTrackingStatus;
window.openValuesOverlay = Values.openValuesOverlay;
window.closeValuesOverlay = Values.closeValuesOverlay;
window.VALUE_DEFINITIONS = Values.VALUE_DEFINITIONS;

// Trust system
window.initTrust = Trust.initTrust;
window.processTrust = Trust.processTrust;
window.applyTrustDeviation = Trust.applyTrustDeviation;
window.getInterpersonalRateLimiter = Trust.getInterpersonalRateLimiter;
window.getTrustState = Trust.getTrustState;
window.calculateTrustBaselines = Trust.calculateTrustBaselines;

// Policy Lag system
window.initPolicyLag = PolicyLag.initPolicyLag;
window.processPolicyLag = PolicyLag.processPolicyLag;
window.setPendingPolicy = PolicyLag.setPendingPolicy;
window.discardPendingPolicy = PolicyLag.discardPendingPolicy;
window.discardAllPending = PolicyLag.discardAllPending;
window.commitPolicyChange = PolicyLag.commitPolicyChange;
window.commitAllPending = PolicyLag.commitAllPending;
window.abandonPolicyChange = PolicyLag.abandonPolicyChange;
window.forcePolicyChange = PolicyLag.forcePolicyChange;
window.getPolicyLagState = PolicyLag.getPolicyLagState;
window.hasAnyPolicyActivity = PolicyLag.hasAnyPolicyActivity;
window.activeLagCount = PolicyLag.activeLagCount;
window.pendingCount = PolicyLag.pendingCount;
window.classifyPolicyChange = PolicyLag.classifyPolicyChange;
window.calculateEffectiveLag = PolicyLag.calculateEffectiveLag;
window.getAdminHallReduction = PolicyLag.getAdminHallReduction;

// Resistance system
window.initResistance = Resistance.initResistance;
window.processResistance = Resistance.processResistance;
window.getResistanceState = Resistance.getResistanceState;
window.suppressResistance = Resistance.suppressResistance;
window.negotiateResistance = Resistance.negotiateResistance;
window.reverseContestedPolicy = Resistance.reverseContestedPolicy;
window.addResistancePressure = Resistance.addResistancePressure;
window.shiftDisposition = Resistance.shiftDisposition;
window.getDispositionLabel = Resistance.getDispositionLabel;
window.isOrganizedResistance = Resistance.isOrganizedResistance;
window.addPromise = Resistance.addPromise;
window.fulfillPromise = Resistance.fulfillPromise;

// Crime system
window.initCrime = Crime.initCrime;
window.processCrime = Crime.processCrime;
window.getCrimeState = Crime.getCrimeState;
window.getCrimeClimateText = Crime.getCrimeClimateText;
window.getJusticeHallDetection = Crime.getJusticeHallDetection;
window.performCrackdown = Crime.performCrackdown;

// Immigration system
window.initImmigration = Immigration.initImmigration;
window.processImmigration = Immigration.processImmigration;
window.getImmigrationState = Immigration.getImmigrationState;
window.getImmigrantWorkforce = Immigration.getImmigrantWorkforce;
window.getImmigrantFoodConsumption = Immigration.getImmigrantFoodConsumption;
window.getLoyalPopulation = Immigration.getLoyalPopulation;
window.getImmigrationClimateText = Immigration.getImmigrationClimateText;
window.startIntervention = Immigration.startIntervention;
window.cancelIntervention = Immigration.cancelIntervention;

// Class System
window.initClassSystem = ClassSystem.initClassSystem;
window.activateClassSystem = ClassSystem.activateClassSystem;
window.dismantleClassSystem = ClassSystem.dismantleClassSystem;
window.changeBasis = ClassSystem.changeBasis;
window.requestDifferentialChange = ClassSystem.requestDifferentialChange;
window.cancelDifferentialChange = ClassSystem.cancelDifferentialChange;
window.processClassSystem = ClassSystem.processClassSystem;
window.getClassMultiplier = ClassSystem.getClassMultiplier;
window.getInterpersonalTrustReduction = ClassSystem.getInterpersonalTrustReduction;
window.getIntegrationThresholdModifier = ClassSystem.getIntegrationThresholdModifier;
window.getClassSystemState = ClassSystem.getClassSystemState;

// Class system UI helpers (confirm dialogs for activation, differential changes, dismantlement)
window.confirmActivateClassSystem = function(basis) {
  const BASES = window.STRATIFICATION_BASES;
  const baseDef = BASES[basis];
  if (!baseDef) return;
  window.showConfirmDialog(
    `Establish ${baseDef.name} Class System?`,
    `Formalizing inequality is a major governance decision.<br><br>` +
    `${baseDef.icon} <strong>${baseDef.name}:</strong> ${baseDef.description}<br><br>` +
    `<strong>Cost:</strong> Legitimacy −10, Satisfaction −8, Resistance +15<br>` +
    `<em>This cannot be easily undone.</em>`,
    'Establish', 'Cancel',
    () => {
      const result = window.activateClassSystem(basis);
      if (result.success) {
        window.renderGovernanceOverlay();
        window.updateAllUI();
      }
    }
  );
};

window.confirmDifferentialChange = function(dimension, targetTier) {
  const DIFFS = window.DIFFERENTIALS;
  const def = DIFFS[dimension];
  const cs = window.gameState.classSystem;
  const currentTier = cs.differentials[dimension];
  const isIncrease = targetTier > currentTier;

  const confirmFn = isIncrease ? window.showConfirmDialogNonDestructive : window.showConfirmDialog;
  const verb = isIncrease ? 'Increase' : 'Reduce';
  const warning = isIncrease ? '' : '<br><br>⚠️ Reducing privilege will trigger resistance from the privileged class.';

  confirmFn(
    `${verb} ${def.name} Differential?`,
    `Change from "${def.tiers[currentTier].label}" to "${def.tiers[targetTier].label}".<br><br>` +
    `${def.tiers[targetTier].description}${warning}`,
    verb, 'Cancel',
    () => {
      const result = window.requestDifferentialChange(dimension, targetTier);
      if (result.success) {
        window.renderGovernanceOverlay();
      }
    }
  );
};

window.showChangeBasisDialog = function() {
  const BASES = window.STRATIFICATION_BASES;
  const cs = window.gameState.classSystem;
  let body = 'Changing the stratification basis reclassifies the entire population.<br><br>' +
    '<strong>Cost:</strong> Legitimacy −15, Resistance +20, Satisfaction −5 for 3 turns<br><br>';
  for (const [key, base] of Object.entries(BASES)) {
    if (key === cs.basis) continue;
    const alignment = base.governanceAlignment[window.gameState.governance.model] || 'moderate';
    body += `<button class="detail-btn" style="display:block;width:100%;text-align:left;margin-bottom:6px;padding:8px"
      onclick="window.closeDialog(); window.confirmChangeBasis('${key}')">
      ${base.icon} <strong>${base.name}</strong> <span style="color:var(--text-dim)">(${alignment})</span><br>
      <small style="color:var(--text-dim)">${base.description}</small>
    </button>`;
  }
  window.showConfirmDialog('Change Stratification Basis', body, '', 'Cancel', () => {});
  const okBtn = document.getElementById('confirm-ok');
  if (okBtn) okBtn.style.display = 'none';
};

window.confirmChangeBasis = function(newBasis) {
  const BASES = window.STRATIFICATION_BASES;
  window.showConfirmDialog(
    `Change to ${BASES[newBasis].name}?`,
    `This is a major governance event. Adults will be reclassified — some gain privilege, others lose it.<br><br>` +
    `<strong>Cost:</strong> Legitimacy −15, Resistance +20, Satisfaction −5 for 3 turns`,
    'Change Basis', 'Cancel',
    () => {
      const result = window.changeBasis(newBasis);
      if (result.success) {
        window.renderGovernanceOverlay();
        window.updateAllUI();
      }
    }
  );
};

window.confirmDismantleClassSystem = function() {
  window.showConfirmDialog(
    'Dismantle the Class System?',
    `This abolishes all formal stratification immediately.<br><br>` +
    `<strong>Costs:</strong><br>` +
    `• Legitimacy −20 (privileged class withdraws consent)<br>` +
    `• Resistance +25 (immediate spike)<br>` +
    `• Satisfaction −12 among former privileged for 4 turns<br>` +
    `• Institutional trust drift for 5 turns<br><br>` +
    `<em>This triggers the most severe resistance event in the game.</em>`,
    'Dismantle', 'Cancel',
    () => {
      const result = window.dismantleClassSystem();
      if (result.success) {
        window.renderGovernanceOverlay();
        window.updateAllUI();
      }
    }
  );
};

// Building Actions system
window.initBuildingActions = BuildingActions.initBuildingActions;
window.handleHexClick = BuildingActions.handleHexClick;
window.placeBuilding = BuildingActions.placeBuilding;
window.demolishBuilding = BuildingActions.demolishBuilding;

console.log('✅ Phase 1 & 2 modules loaded: Data, utilities, and systems');
console.log('📦 Available data:', {
  terrain: Object.keys(TERRAIN).length + ' types',
  buildings: Object.keys(BUILDINGS).length + ' types',
  units: Object.keys(UNIT_TYPES).length + ' types',
  threats: Object.keys(THREAT_TYPES).length + ' types'
});
console.log('⚔️ Systems loaded: External Threats, Combat, Governance, Events, Economy, Cohesion, Map Generation, Save/Load, Input, Turn Processing, Rendering');

// Game state factory and init
window.createGameState = createGameState;
window.initGameCore = initGameCore;

// Signal that modules are ready
window.modulesReady = true;

// Initialize the game now that all modules are loaded
setTimeout(() => {
  window.gameState = initGameCore(7743);
  console.log('🎯 Game initialized with modules');
}, 100); // Small delay to ensure DOM and other scripts are ready
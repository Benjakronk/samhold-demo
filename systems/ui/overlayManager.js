// systems/ui/overlayManager.js
// Overlay management system for game UI panels
// Handles opening, closing, and state management of overlays

let gameState = null;

export function initOverlayManager(gameStateRef) {
    gameState = gameStateRef;
    setupOverlayEventListeners();
}

// Core overlay state management
export function isAnyOverlayOpen() {
    // Check all overlays that should block turn progression
    const overlaysToCheck = [
        'game-menu-overlay',
        'workforce-overlay',
        'governance-overlay',
        'population-details-overlay',
        'settings-overlay',
        'saveload-overlay',
        'dev-overlay',
        'chronicle-overlay',
        'traditions-overlay',
        'values-overlay',
        'cohesion-overlay',
        'event-dialog',
        'confirm-dialog'
    ];

    return overlaysToCheck.some(id => {
        const el = document.getElementById(id);
        return el && el.classList.contains('visible');
    });
}

// Generic overlay open/close functions
export function openOverlay(overlayId) {
    const overlay = document.getElementById(overlayId);
    if (overlay) {
        overlay.classList.add('visible');
    }
}

export function closeOverlay(overlayId) {
    const overlay = document.getElementById(overlayId);
    if (overlay) {
        overlay.classList.remove('visible');
    }
}

export function closeAllOverlays() {
    const overlayIds = [
        'game-menu-overlay',
        'workforce-overlay',
        'governance-overlay',
        'population-details-overlay',
        'settings-overlay',
        'saveload-overlay',
        'dev-overlay',
        'chronicle-overlay',
        'traditions-overlay',
        'values-overlay',
        'cohesion-overlay',
        'event-dialog',
        'confirm-dialog'
    ];

    overlayIds.forEach(id => closeOverlay(id));
}

// Workforce overlay management
export function openWorkforceOverlay() {
    if (window.renderWorkforceOverlay) {
        window.renderWorkforceOverlay();
    }
    openOverlay('workforce-overlay');
}

export function closeWorkforceOverlay() {
    closeOverlay('workforce-overlay');
}

// Governance overlay management
export function openGovernanceOverlay() {
    if (window.renderGovernanceOverlay) {
        window.renderGovernanceOverlay();
    }
    openOverlay('governance-overlay');
}

export function closeGovernanceOverlay() {
    closeOverlay('governance-overlay');
}

// Population details overlay management
export function openPopulationDetailsOverlay() {
    if (window.renderPopulationDetails) {
        window.renderPopulationDetails();
    }
    openOverlay('population-details-overlay');
}

export function closePopulationDetailsOverlay() {
    closeOverlay('population-details-overlay');
}

// Settings overlay management
export function openSettingsOverlay() {
    if (window.renderSettingsOverlay) {
        window.renderSettingsOverlay();
    }
    openOverlay('settings-overlay');
}

export function closeSettingsOverlay() {
    closeOverlay('settings-overlay');
}

// Game menu overlay management
export function openGameMenuOverlay() {
    openOverlay('game-menu-overlay');
}

export function closeGameMenuOverlay() {
    closeOverlay('game-menu-overlay');
}

// Cohesion overlay management
export function openCohesionOverlay() {
    if (window.renderCohesionOverlay) {
        window.renderCohesionOverlay();
    }
    openOverlay('cohesion-overlay');
}

export function closeCohesionOverlay() {
    closeOverlay('cohesion-overlay');
}

// Dev overlay management
export function openDevOverlay() {
    if (window.renderDevOverlay) {
        window.renderDevOverlay();
    }
    openOverlay('dev-overlay');
}

export function closeDevOverlay() {
    closeOverlay('dev-overlay');
}

// Tab management for overlays
let workforceActiveTab = 'workers';
let governanceActiveTab = 'models';

export function switchWorkforceTab(tab) {
    console.log(`Switching workforce tab to: ${tab}`);
    workforceActiveTab = tab;
    document.querySelectorAll('.workforce-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    document.querySelectorAll('.workforce-tab-panel').forEach(p => {
        p.classList.toggle('active', p.id === tab + '-tab-panel');
    });

    // Re-render the active tab content
    if (tab === 'workers' && window.renderWorkersTab) {
        window.renderWorkersTab();
    } else if (tab === 'units' && window.renderUnitsTab) {
        window.renderUnitsTab();
    } else if (tab === 'build' && window.renderWorkersTab) {
        window.renderWorkersTab(); // renders wf-build section
    } else if (tab === 'train' && window.renderUnitsTab) {
        window.renderUnitsTab(); // renders units-train section
    }
}

export function switchGovernanceTab(tab) {
    governanceActiveTab = tab;
    document.querySelectorAll('.governance-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    document.querySelectorAll('.governance-tab-panel').forEach(p => {
        p.classList.toggle('active', p.id === tab + '-tab-panel');
    });
}

export function getActiveWorkforceTab() {
    return workforceActiveTab;
}

export function getActiveGovernanceTab() {
    return governanceActiveTab;
}

// Event listener setup for overlay interactions
let _overlayListenersRegistered = false;
function setupOverlayEventListeners() {
    if (_overlayListenersRegistered) return;
    _overlayListenersRegistered = true;
    console.log('Setting up overlay event listeners');
    // Workforce overlay event listeners
    const wfCloseBtn = document.getElementById('wf-close');
    if (wfCloseBtn) {
        wfCloseBtn.addEventListener('click', closeWorkforceOverlay);
    }

    const workforceOverlay = document.getElementById('workforce-overlay');
    if (workforceOverlay) {
        workforceOverlay.addEventListener('click', (e) => {
            if (e.target === workforceOverlay) {
                closeWorkforceOverlay();
            }
        });
    }

    // Governance overlay event listeners
    const govCloseBtn = document.getElementById('governance-close');
    if (govCloseBtn) {
        govCloseBtn.addEventListener('click', closeGovernanceOverlay);
    }

    const governanceOverlay = document.getElementById('governance-overlay');
    if (governanceOverlay) {
        governanceOverlay.addEventListener('click', (e) => {
            if (e.target === governanceOverlay) {
                closeGovernanceOverlay();
            }
        });
    }

    // Population details overlay event listeners
    const popCloseBtn = document.getElementById('population-close');
    if (popCloseBtn) {
        popCloseBtn.addEventListener('click', () => {
            if (window.closePopulationDetails) window.closePopulationDetails();
        });
    }

    const popDetailsOverlay = document.getElementById('population-details-overlay');
    if (popDetailsOverlay) {
        popDetailsOverlay.addEventListener('click', (e) => {
            if (e.target === popDetailsOverlay) {
                if (window.closePopulationDetails) window.closePopulationDetails();
            }
        });
    }

    // Game menu close button
    const gameMenuCloseBtn = document.getElementById('game-menu-close');
    if (gameMenuCloseBtn) {
        gameMenuCloseBtn.addEventListener('click', () => {
            if (window.closeGameMenu) window.closeGameMenu();
        });
    }

    // Settings overlay event listeners
    const settingsOverlay = document.getElementById('settings-overlay');
    if (settingsOverlay) {
        settingsOverlay.addEventListener('click', (e) => {
            if (e.target === settingsOverlay) {
                closeSettingsOverlay();
            }
        });
    }

    // Game menu overlay event listeners
    const gameMenuOverlay = document.getElementById('game-menu-overlay');
    if (gameMenuOverlay) {
        gameMenuOverlay.addEventListener('click', (e) => {
            if (e.target === gameMenuOverlay) {
                if (window.closeGameMenu) window.closeGameMenu();
            }
        });
    }

    // Cohesion overlay event listeners
    const cohesionCloseBtn = document.getElementById('cohesion-close');
    if (cohesionCloseBtn) {
        cohesionCloseBtn.addEventListener('click', closeCohesionOverlay);
    }
    const cohesionOverlay = document.getElementById('cohesion-overlay');
    if (cohesionOverlay) {
        cohesionOverlay.addEventListener('click', (e) => {
            if (e.target === cohesionOverlay) closeCohesionOverlay();
        });
    }

    // Values overlay event listeners
    const valuesCloseBtn = document.getElementById('values-close');
    if (valuesCloseBtn) {
        valuesCloseBtn.addEventListener('click', () => { if (window.closeValuesOverlay) window.closeValuesOverlay(); });
    }
    const valuesOverlay = document.getElementById('values-overlay');
    if (valuesOverlay) {
        valuesOverlay.addEventListener('click', (e) => {
            if (e.target === valuesOverlay && window.closeValuesOverlay) window.closeValuesOverlay();
        });
    }

    // Traditions overlay event listeners
    const traditionsOverlay = document.getElementById('traditions-overlay');
    if (traditionsOverlay) {
        traditionsOverlay.addEventListener('click', (e) => {
            if (e.target === traditionsOverlay) {
                if (window.closeTraditions) window.closeTraditions();
            }
        });
    }

    // Dev overlay event listeners
    const devOverlay = document.getElementById('dev-overlay');
    if (devOverlay) {
        devOverlay.addEventListener('click', (e) => {
            if (e.target === devOverlay) {
                closeDevOverlay();
            }
        });
    }

    // Panels dropdown: close when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#panels-menu')) closePanelsMenu();
    });

    // Workforce tab event listeners
    document.querySelectorAll('.workforce-tab').forEach(t => {
        t.addEventListener('click', () => switchWorkforceTab(t.dataset.tab));
    });

    // Governance tab event listeners
    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('.governance-tab').forEach(t => {
            t.addEventListener('click', () => switchGovernanceTab(t.dataset.tab));
        });
    });
}

// Utility function to check if a specific overlay is open
export function isOverlayOpen(overlayId) {
    const overlay = document.getElementById(overlayId);
    return overlay && overlay.classList.contains('visible');
}

// ---- PANELS DROPDOWN MENU ----

export function togglePanelsMenu() {
    document.getElementById('panels-menu')?.classList.toggle('open');
}

export function toggleFeatureLabels() {
    window.featureLabelsVisible = window.featureLabelsVisible !== false ? false : true;
    const btn = document.getElementById('labels-toggle-btn');
    if (btn) btn.classList.toggle('active', window.featureLabelsVisible !== false);
    if (window.invalidateFeatureLabelCache) window.invalidateFeatureLabelCache();
    if (window.render) window.render();
}

export function toggleRegionView() {
    window.regionViewVisible = window.regionViewVisible ? false : true;
    const btn = document.getElementById('region-toggle-btn');
    if (btn) btn.classList.toggle('active', window.regionViewVisible);
    if (window.setMapDirty) window.setMapDirty(true);
    if (window.render) window.render();
}

export function closePanelsMenu() {
    document.getElementById('panels-menu')?.classList.remove('open');
}

// Handle ESC key to close overlays
export function handleEscapeKey() {
    // Exit fortify mode if active
    if (window.gameState?.unitInteractionMode === 'fortify') {
        window.gameState.unitInteractionMode = null;
        window.hoveredHex = null;
        window.hoveredEdge = null;
        if (window.setMapDirty) window.setMapDirty(true);
        if (window.render) window.render();
        if (window.gameState.selectedHex && window.updateSidePanel) window.updateSidePanel(window.gameState.selectedHex);
        return;
    }
    if (isOverlayOpen('values-overlay')) {
        if (window.closeValuesOverlay) window.closeValuesOverlay();
    } else if (isOverlayOpen('traditions-overlay')) {
        window.closeTraditions();
    } else if (isOverlayOpen('chronicle-overlay')) {
        window.closeChronicle();
    } else if (isOverlayOpen('dev-overlay')) {
        closeDevOverlay();
    } else if (isOverlayOpen('governance-overlay')) {
        closeGovernanceOverlay();
    } else if (isOverlayOpen('workforce-overlay')) {
        closeWorkforceOverlay();
    } else if (isOverlayOpen('population-details-overlay')) {
        closePopulationDetailsOverlay();
    } else if (isOverlayOpen('cohesion-overlay')) {
        closeCohesionOverlay();
    } else if (isOverlayOpen('settings-overlay')) {
        closeSettingsOverlay();
    } else if (isOverlayOpen('game-menu-overlay')) {
        closeGameMenuOverlay();
    }
}
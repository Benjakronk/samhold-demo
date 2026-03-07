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
function setupOverlayEventListeners() {
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
    const popDetailsOverlay = document.getElementById('population-details-overlay');
    if (popDetailsOverlay) {
        popDetailsOverlay.addEventListener('click', (e) => {
            if (e.target === popDetailsOverlay) {
                closePopulationDetailsOverlay();
            }
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
                closeGameMenuOverlay();
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

// Handle ESC key to close overlays
export function handleEscapeKey() {
    if (isOverlayOpen('dev-overlay')) {
        closeDevOverlay();
    } else if (isOverlayOpen('governance-overlay')) {
        closeGovernanceOverlay();
    } else if (isOverlayOpen('workforce-overlay')) {
        closeWorkforceOverlay();
    } else if (isOverlayOpen('population-details-overlay')) {
        closePopulationDetailsOverlay();
    } else if (isOverlayOpen('settings-overlay')) {
        closeSettingsOverlay();
    } else if (isOverlayOpen('game-menu-overlay')) {
        closeGameMenuOverlay();
    }
}
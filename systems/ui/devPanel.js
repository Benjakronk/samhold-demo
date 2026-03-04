// systems/ui/devPanel.js
// Development panel system for debugging and testing
// Contains dev tools, cheats, testing functions, and debugging utilities

let gameState = null;
let devActiveTab = 'map';
let currentSeed = 7743;

export function initDevPanel(gameStateRef) {
    gameState = gameStateRef;
}

// Core dev overlay functions (these are already handled by OverlayManager but kept for reference)
export function openDevOverlay() {
    renderDevOverlay();
    if (window.openOverlay) {
        window.openOverlay('dev-overlay');
    }
}

export function closeDevOverlay() {
    if (window.closeOverlay) {
        window.closeOverlay('dev-overlay');
    }
}

// Dev tab management
export function switchDevTab(tab) {
    devActiveTab = tab;
    document.querySelectorAll('.dev-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    renderDevTabContent();
}

export function getActiveDevTab() {
    return devActiveTab;
}

// Main dev overlay rendering
export function renderDevOverlay() {
    // Ensure tab buttons are wired
    document.querySelectorAll('.dev-tab').forEach(t => {
        t.onclick = () => switchDevTab(t.dataset.tab);
        t.classList.toggle('active', t.dataset.tab === devActiveTab);
    });
    renderDevTabContent();
}

// Render content for active dev tab
export function renderDevTabContent() {
    const container = document.getElementById('dev-tab-content');
    if (!container) return;

    let html = '';

    if (devActiveTab === 'map') {
        html = generateMapTabContent();
    } else if (devActiveTab === 'rivers') {
        html = generateRiversTabContent();
    } else if (devActiveTab === 'economy') {
        html = generateEconomyTabContent();
    } else if (devActiveTab === 'population') {
        html = generatePopulationTabContent();
    } else if (devActiveTab === 'governance') {
        html = generateGovernanceTabContent();
    } else if (devActiveTab === 'buildings') {
        html = generateBuildingsTabContent();
    } else if (devActiveTab === 'events') {
        html = generateEventsTabContent();
    } else if (devActiveTab === 'units') {
        html = generateUnitsTabContent();
    }

    container.innerHTML = html;
}

// Tab content generators
function generateMapTabContent() {
    return `<div class="dev-map-seed">
        <div class="dev-seed-current">Current seed: <strong>${currentSeed}</strong></div>
        <div class="dev-seed-input">
            <input type="number" id="dev-seed-input" placeholder="Enter new seed" value="${currentSeed}">
            <button onclick="devRandomizeSeed()">Random</button>
        </div>
        <div class="dev-seed-actions">
            <button onclick="applyDevValues()">Apply</button>
            <button onclick="applyDevValuesAndRestart()">Apply & Restart</button>
        </div>
    </div>`;
}

function generateRiversTabContent() {
    return `<div class="dev-rivers">
        <div class="dev-group">
            <h4>🏞️ River Controls</h4>
            <label><input type="checkbox" onchange="devToggleRiverVertices(this.checked)"> Show vertices</label>
            <div class="dev-river-toggles">
                ${gameState?.rivers ? gameState.rivers.map((r, i) =>
                    `<label style="color: ${getRiverColor(i)}">
                        <input type="checkbox" onchange="devToggleRiver(${i}, this.checked)"> River ${i + 1}
                    </label>`
                ).join('') : ''}
            </div>
        </div>
    </div>`;
}

function generateEconomyTabContent() {
    return `<div class="dev-economy">
        ${devGroup('💰', 'Resources', [
            devRow('Food per adult', 'dev-food-per-pop', window.FOOD_PER_POP || 2),
            devRow('Food per child', 'dev-food-per-child', window.FOOD_PER_CHILD || 1)
        ])}
        <button onclick="devGiveResources()">Give Resources (+100 each)</button>
    </div>`;
}

function generatePopulationTabContent() {
    return `<div class="dev-population">
        ${devGroup('👥', 'Population Controls', [
            devRow('Starting adults', 'dev-start-pop', 18),
            devRow('Starting children', 'dev-start-children', 8)
        ])}
        <button onclick="devAddPopulation()">Add Population (+10)</button>
    </div>`;
}

function generateGovernanceTabContent() {
    return `<div class="dev-governance">
        ${devGroup('⚖️', 'Governance Controls', [])}
        <button onclick="devMaxCohesion()">Max Cohesion</button>
        <button onclick="devMinCohesion()">Min Cohesion</button>
    </div>`;
}

function generateBuildingsTabContent() {
    return `<div class="dev-buildings">
        ${devGroup('🏗️', 'Building Controls', [])}
        <button onclick="devInstantBuilding()">Instant Building</button>
        <button onclick="devFreeBuilding()">Free Building</button>
    </div>`;
}

function generateEventsTabContent() {
    if (!window.EVENT_LIBRARY) return '<p>Event system not loaded</p>';

    const events = Object.entries(window.EVENT_LIBRARY);
    const eventButtons = events.map(([id, event]) =>
        `<button onclick="devTriggerEvent('${id}')" class="dev-event-btn">${event.title}</button>`
    ).join('');

    return `<div class="dev-events">
        <h4>🎯 Event Controls</h4>
        <button onclick="devClearEventCooldowns()">Clear All Cooldowns</button>
        <div class="dev-event-list">
            ${eventButtons}
        </div>
    </div>`;
}

function generateUnitsTabContent() {
    if (!window.UNIT_TYPES) return '<p>Unit system not loaded</p>';

    const units = Object.entries(window.UNIT_TYPES);
    const unitButtons = units.map(([id, unit]) =>
        `<button onclick="devCreateUnit('${id}')" class="dev-unit-btn">${unit.icon} ${unit.name}</button>`
    ).join('');

    const threats = Object.entries(window.THREAT_TYPES || {});
    const threatButtons = threats.map(([id, threat]) =>
        `<button onclick="devSpawnThreat('${id}')" class="dev-threat-btn">${threat.icon} ${threat.name}</button>`
    ).join('');

    return `<div class="dev-units">
        <h4>⚔️ Unit Controls</h4>
        <div class="dev-unit-list">
            ${unitButtons}
        </div>
        <h4>👹 Threat Controls</h4>
        <div class="dev-threat-list">
            ${threatButtons}
        </div>
    </div>`;
}

// Dev utility functions
export function devGroup(icon, name, rows) {
    const rowHtml = rows.join('');
    return `<div class="dev-group">
        <h4>${icon} ${name}</h4>
        ${rowHtml}
    </div>`;
}

export function devRow(label, id, value) {
    return `<div class="dev-row">
        <span class="dev-label">${label}:</span>
        <input type="number" id="${id}" value="${value}" min="0" max="100" step="1">
        <button onclick="devAdjust('${id}', -1)">-</button>
        <button onclick="devAdjust('${id}', 1)">+</button>
    </div>`;
}

export function devAdjust(id, delta) {
    const input = document.getElementById(id);
    if (input) {
        const currentValue = parseInt(input.value) || 0;
        const newValue = Math.max(0, currentValue + delta);
        input.value = newValue;
    }
}

// Dev action functions
export function devRandomizeSeed() {
    const newSeed = Math.floor(Math.random() * 999999) + 1;
    const seedInput = document.getElementById('dev-seed-input');
    if (seedInput) {
        seedInput.value = newSeed;
    }
}

export function applyDevValues() {
    // Apply dev panel changes without restarting
    const seedInput = document.getElementById('dev-seed-input');
    if (seedInput) {
        currentSeed = parseInt(seedInput.value) || currentSeed;
    }

    // Apply other dev values
    const foodPerPop = document.getElementById('dev-food-per-pop');
    if (foodPerPop && window.FOOD_PER_POP !== undefined) {
        window.FOOD_PER_POP = parseInt(foodPerPop.value) || 2;
    }

    console.log('Dev values applied');
}

export function applyDevValuesAndRestart() {
    applyDevValues();
    if (window.initGame) {
        window.initGame(currentSeed);
        closeDevOverlay();
    }
}

export function devTriggerEvent(eventId) {
    if (window.triggerEvent) {
        window.triggerEvent(eventId);
        console.log(`Triggered event: ${eventId}`);
    }
}

export function devClearEventCooldowns() {
    if (gameState && gameState.eventCooldowns) {
        gameState.eventCooldowns = {};
        console.log('Event cooldowns cleared');
    }
}

export function devCreateUnit(unitType) {
    if (window.createUnit && gameState?.settlements?.length > 0) {
        const settlement = gameState.settlements[0];
        window.createUnit(unitType, settlement.col, settlement.row);
        console.log(`Created ${unitType} unit`);
    }
}

export function devGiveResources() {
    if (gameState?.resources) {
        gameState.resources.food += 100;
        gameState.resources.materials += 100;
        gameState.resources.knowledge += 100;
        if (window.updateAllUI) window.updateAllUI();
        console.log('Gave +100 resources');
    }
}

export function devSpawnThreat(threatType) {
    if (window.spawnThreat) {
        window.spawnThreat(threatType);
        console.log(`Spawned ${threatType} threat`);
    }
}

export function devAddPopulation() {
    if (gameState?.population) {
        gameState.population.total += 10;
        gameState.population.idle += 10;
        if (window.updateAllUI) window.updateAllUI();
        console.log('Added +10 population');
    }
}

export function devMaxCohesion() {
    if (gameState?.cohesion) {
        gameState.cohesion.identity = 100;
        gameState.cohesion.legitimacy = 100;
        gameState.cohesion.satisfaction = 100;
        gameState.cohesion.bonds = 100;
        if (window.calculateCohesion) window.calculateCohesion();
        if (window.updateAllUI) window.updateAllUI();
        console.log('Set cohesion to maximum');
    }
}

export function devMinCohesion() {
    if (gameState?.cohesion) {
        gameState.cohesion.identity = 1;
        gameState.cohesion.legitimacy = 1;
        gameState.cohesion.satisfaction = 1;
        gameState.cohesion.bonds = 1;
        if (window.calculateCohesion) window.calculateCohesion();
        if (window.updateAllUI) window.updateAllUI();
        console.log('Set cohesion to minimum');
    }
}

// Dev badge update
export function updateDevBadge() {
    const badge = document.getElementById('dev-badge');
    if (badge && gameState) {
        badge.textContent = `🔧 T${gameState.turn} Y${gameState.year}`;
    }
}

// River visualization helpers
function getRiverColor(index) {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffd93d', '#ff8a80'];
    return colors[index % colors.length];
}

export function devToggleRiverVertices(show) {
    if (window.setDevRenderingFlags) {
        window.setDevRenderingFlags({ showRiverVertices: show });
    }
}

export function devToggleRiver(riverId, show) {
    if (window.setDevRenderingFlags) {
        const flag = {};
        flag[`highlightRiver${riverId}`] = show;
        window.setDevRenderingFlags(flag);
    }
}

// Set current seed (used by other systems)
export function setCurrentSeed(seed) {
    currentSeed = seed;
}
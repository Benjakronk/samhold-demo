// systems/ui/sidePanel.js
// Side panel display and management system
// Extracted from original monolithic implementation

import { TERRAIN } from '../../data/terrain.js';
import { BUILDINGS } from '../../data/buildings.js';
import { UNIT_TYPES } from '../../data/units.js';
import { THREAT_TYPES } from '../../data/threats.js';
import { cubeDistance, offsetToCube } from '../../utils/hexMath.js';

let gameState = null;

export function initSidePanel(gameStateRef) {
    gameState = gameStateRef;
    // Bind helper functions to window for global access
    window.hexHasRiver = hexHasRiver;
    window.hexAdjacentToLake = hexAdjacentToLake;
    window.hexAdjacentToWater = hexAdjacentToWater;
    window.hexHasFreshWater = hexHasFreshWater;
    window.isInTerritory = isInTerritory;
    window.getHexYield = getHexYield;
    window.getMaxWorkers = getMaxWorkers;
    window.getUnitsAt = getUnitsAt;
}

export function updateSidePanel(hex) {
    const t = TERRAIN[hex.terrain];
    const riverLabel = hexHasRiver(hex) ? ' 🏞️' : '';
    document.querySelector('#hex-info-section h3').innerHTML = `${t.icon} ${t.name} (${hex.col},${hex.row})${riverLabel} <span class="section-toggle-hint">click to toggle</span>`;
    const inTerr = isInTerritory(hex.col, hex.row);
    const y = getHexYield(hex);
    const maxW = getMaxWorkers(hex);

    const hasRiver = hexHasRiver(hex);
    const nearLake = !hasRiver && hexAdjacentToLake(hex);
    const hasFreshWater = hasRiver || nearLake;
    const freshWaterStr = hasRiver ? `<div class="hex-info-row"><span class="label">River</span><span class="value" style="color:#5ab0d8">🏞️ Fresh water (+1🌾)</span></div>`
        : nearLake ? `<div class="hex-info-row"><span class="label">Lake</span><span class="value" style="color:#5ab0d8">💧 Fresh water (+1🌾)</span></div>` : '';

    let html = `
        <div class="hex-info-row"><span class="label">Terrain</span><span class="terrain-badge" style="background:${t.color}">${t.name}</span></div>
        ${freshWaterStr}
        <div class="hex-info-row"><span class="label">Base yield</span><span class="value">${t.food ? '🌾' + t.food : ''}${t.food && t.materials ? ' ' : ''}${t.materials ? '🪵' + t.materials : ''}${!t.food && !t.materials ? '—' : ''}${hasFreshWater ? ' +🌾1' : ''}</span></div>
        <div class="hex-info-row"><span class="label">Movement cost</span><span class="value">${t.movement}</span></div>
        <div class="hex-info-row"><span class="label">Territory</span><span class="value">${inTerr ? '✅ Yours' : '—'}</span></div>`;

    // Show existing building
    if (hex.building) {
        const bDef = BUILDINGS[hex.building];
        if (hex.buildProgress > 0) {
            const turnsLeft = hex.workers > 0 ? Math.ceil(hex.buildProgress / hex.workers) : '∞';
            const totalWork = bDef.buildTurns;
            const workDone = totalWork - hex.buildProgress;
            const progress = Math.round((workDone / totalWork) * 100);

            html += `<div class="building-display">
                <div class="bd-name">${bDef.icon} ${bDef.name}</div>
                <div class="bd-detail">🔨 ${hex.buildProgress} work remaining${hex.workers > 0 ? ` · ~${turnsLeft} turn${turnsLeft !== 1 ? 's' : ''}` : ' · stalled!'}</div>
                <div class="building-progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
                <button class="demolish-btn" onclick="demolishBuilding(${hex.col},${hex.row})">✕ Cancel (🪵+${bDef.cost.materials})</button>
            </div>`;
        } else {
            html += `<div class="building-display">
                <div class="bd-name">${bDef.icon} ${bDef.name}</div>`;
            if (hex.building === 'settlement') {
                html += `<div class="bd-detail">🌾+${bDef.autoFood || 0} food (community foraging)</div>`;
            } else {
                const refund = Math.floor((bDef.cost.materials || 0) / 2);
                html += `<div class="bd-detail">Bonus: ${bDef.foodBonus ? '🌾+' + bDef.foodBonus : ''}${bDef.foodBonus && bDef.materialBonus ? ' ' : ''}${bDef.materialBonus ? '🪵+' + bDef.materialBonus : ''} (at full workers)</div>
                <button class="demolish-btn" onclick="demolishBuilding(${hex.col},${hex.row})">✕ Demolish (🪵+${refund})</button>`;
            }
            html += `</div>`;
        }
    }

    // Show units on this hex
    const unitsHere = getUnitsAt(hex.col, hex.row);
    if (unitsHere.length > 0) {
        html += `<div class="units-section">
            <h4>Unit controls</h4>`;
        for (const unit of unitsHere) {
            const unitType = UNIT_TYPES[unit.type];
            const healthColor = unit.health > 75 ? '#5a8a4a' : unit.health > 50 ? '#c9a84c' : unit.health > 25 ? '#d4800a' : '#a94442';
            const movementInfo = unit.movementLeft < unitType.movement ? ` · Moved` : ` · ${unit.movementLeft}/${unitType.movement} movement`;
            const isSelected = gameState.selectedUnit && gameState.selectedUnit.id === unit.id;

            html += `
                <div class="unit-display">
                    <div class="unit-header">
                        <span class="unit-icon">${unitType.icon}</span>
                        <span class="unit-name">${unitType.name}</span>
                        <span class="unit-health" style="color: ${healthColor}">${unit.health}%</span>
                    </div>
                    <div class="unit-details">${unitType.description}${movementInfo}</div>
                    <div class="unit-controls">
                        ${isSelected ?
                            `<button class="detail-btn unit-control-btn" onclick="deselectUnit(); updateSidePanel(gameState.selectedHex); if (window.render) window.render();">✕ Cancel</button>` :
                            `<button class="detail-btn unit-control-btn" onclick="selectUnitForMovement(${unit.id}); updateSidePanel(gameState.selectedHex);">🚶 Move</button>`
                        }
                        <button class="demolish-btn unit-control-btn" onclick="confirmDisbandUnit(${unit.id}); updateSidePanel(gameState.selectedHex);">✕ Disband</button>
                    </div>
                </div>`;
        }
        html += `</div>`;
    }

    // Show units being trained on this hex
    const unitsTrainingHere = gameState.unitsInTraining.filter(t => t.col === hex.col && t.row === hex.row);
    if (unitsTrainingHere.length > 0) {
        html += `<div class="training-section">
            <h4>🔨 Units in training</h4>`;
        for (const training of unitsTrainingHere) {
            const unitType = UNIT_TYPES[training.type];
            const progress = Math.round(((training.trainingNeeded - training.trainingProgress) / training.trainingNeeded) * 100);
            const turnsLeft = training.trainingProgress;

            html += `
                <div class="training-display">
                    <div class="training-header">
                        <span class="unit-icon">${unitType.icon}</span>
                        <span class="unit-name">${unitType.name}</span>
                        <span class="training-progress">${progress}%</span>
                    </div>
                    <div class="training-details">🔨 ${turnsLeft} turn${turnsLeft !== 1 ? 's' : ''} remaining</div>
                    <div class="training-progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <button class="demolish-btn" onclick="cancelUnitTraining(${training.col}, ${training.row})">✕ Cancel Training</button>
                </div>`;
        }
        html += `</div>`;
    }

    // Show external threats on this hex
    const threatsHere = gameState.externalThreats.filter(t => t.col === hex.col && t.row === hex.row);
    if (threatsHere.length > 0) {
        html += `<div class="threats-section">
            <h4>⚠️ External Threats</h4>`;
        for (const threat of threatsHere) {
            const threatType = THREAT_TYPES[threat.type];
            const healthColor = threat.health > 75 ? '#a94442' : threat.health > 50 ? '#722b2b' : threat.health > 25 ? '#5a1f1f' : '#401515';
            const targetInfo = threat.target ? ` → targeting (${threat.target.col},${threat.target.row})` : '';
            html += `
                <div class="threat-display">
                    <div class="threat-header">
                        <span class="threat-icon">${threatType.icon}</span>
                        <span class="threat-name">${threatType.name}</span>
                        <span class="threat-health" style="color: ${healthColor}">${threat.health}/${threat.maxHealth}</span>
                    </div>
                    <div class="threat-details">Combat: ${threatType.combat} · Movement: ${threatType.movement}${targetInfo}</div>
                    <div class="threat-description">${threatType.description}</div>
                </div>`;
        }
        html += `</div>`;
    }

    // Worker assignment controls
    if (inTerr && maxW > 0) {
        const canAdd = hex.workers < maxW && gameState.population.idle > 0;
        const canRemove = hex.workers > 0;
        const isConstruction = hex.building && hex.buildProgress > 0;
        const workerLabel = isConstruction ? '🔨 Builders' : (hex.building ? '👥 Workers' : '👥 Gatherer');
        const emptyMsg = isConstruction ? 'stalled — assign builders!' : (hex.building ? 'nothing — assign workers!' : 'nothing — assign a gatherer!');

        let statusStr;
        if (isConstruction) {
            statusStr = hex.workers > 0
                ? `<span class="yield-val" style="color:var(--text-gold)">Building... (🍖×2 rations)</span>`
                : `<span class="yield-none">${emptyMsg}</span>`;
        } else {
            statusStr = (y.food || y.materials)
                ? `<span class="yield-val">${y.food ? '🌾' + y.food : ''}${y.food && y.materials ? ' ' : ''}${y.materials ? '🪵' + y.materials : ''}</span>`
                : `<span class="yield-none">${emptyMsg}</span>`;
        }

        html += `<div class="worker-section">
            <div class="worker-controls">
                <span class="worker-label">${workerLabel}</span>
                <div class="worker-btns">
                    <button class="worker-btn" ${canRemove ? '' : 'disabled'} onclick="unassignWorker(${hex.col},${hex.row})">−</button>
                    <span class="worker-count">${hex.workers} / ${maxW}</span>
                    <button class="worker-btn" ${canAdd ? '' : 'disabled'} onclick="assignWorker(${hex.col},${hex.row})">+</button>
                </div>
            </div>
            <div class="yield-row">
                <span class="yield-label">${isConstruction ? 'Progress:' : 'Producing:'}</span>
                ${statusStr}
            </div>
        </div>`;
    } else if (inTerr && hex.building === 'settlement') {
        html += `<div class="worker-section">
            <div class="yield-row">
                <span class="yield-label">Producing:</span>
                <span class="yield-val">🌾${y.food}</span>
            </div>
        </div>`;
    }

    // Show build options if in territory and no building
    if (inTerr && !hex.building) {
        let buildHtml = '';
        for (const [key, bDef] of Object.entries(BUILDINGS)) {
            if (bDef.onlyStart) continue;
            const terrainValid = bDef.validTerrain.includes(hex.terrain);
            const riverValid = bDef.validOnRiver && hexHasRiver(hex);
            const waterAdjValid = bDef.requiresAdjacentWater && hexAdjacentToWater(hex) && bDef.validTerrain.includes(hex.terrain);
            if (!terrainValid && !riverValid) continue;
            // If requiresAdjacentWater, terrain alone isn't enough — need water neighbor or river
            if (bDef.requiresAdjacentWater && !waterAdjValid && !riverValid) continue;

            const canAfford = gameState.resources.materials >= bDef.cost.materials;
            const reason = canAfford ? '' : `Need ${bDef.cost.materials} materials`;

            const freshWater = hexHasFreshWater(hex);
            const riverBase = freshWater ? 1 : 0;
            const riverBldg = freshWater && bDef.riverFoodBonus ? bDef.riverFoodBonus : 0;
            const terrFood = t.food + bDef.foodBonus + riverBase + riverBldg;
            const terrMat = t.materials + bDef.materialBonus;
            const riverTag = freshWater ? ' 💧' : '';

            buildHtml += `<button class="build-btn" ${canAfford ? '' : 'disabled'} onclick="confirmBuildBuilding(${hex.col},${hex.row},'${key}')" title="${reason}">
                <span class="b-icon">${bDef.icon}</span>
                <span class="b-info">
                    <span class="b-name">${bDef.name}</span><br>
                    <span class="b-cost">🪵${bDef.cost.materials} · 🔨${bDef.buildTurns} work · 👥${bDef.maxWorkers}</span>
                    <span class="b-yield"> → ${terrFood ? '🌾' + terrFood : ''}${terrMat ? ' 🪵' + terrMat : ''}${riverTag}</span>
                </span>
            </button>`;
        }
        if (buildHtml) {
            html += `<div class="build-section">
                <h4 onclick="toggleBuildSection()" style="cursor: pointer;">Build <span class="section-toggle-hint">click to toggle</span></h4>
                <div class="build-content collapsed" id="build-content">${buildHtml}</div>
            </div>`;
        }
    }

    // Show unit training options if in territory and on/adjacent to settlement
    const nearSettlement = gameState.settlements.some(s =>
        cubeDistance(offsetToCube(hex.col, hex.row), offsetToCube(s.col, s.row)) <= 1
    );
    if (inTerr && nearSettlement) {
        let trainHtml = '';
        for (const [key, unitType] of Object.entries(UNIT_TYPES)) {
            const canAffordPop = gameState.population.idle >= unitType.cost.population;
            const canAffordMaterials = gameState.resources.materials >= unitType.cost.materials;
            const canTrain = canAffordPop && canAffordMaterials;

            const costStr = `👥${unitType.cost.population} 🪵${unitType.cost.materials}`;
            const reason = !canAffordPop ? `Need ${unitType.cost.population} idle population` :
                        !canAffordMaterials ? `Need ${unitType.cost.materials} materials` : '';

            trainHtml += `
                <button class="build-btn${canTrain ? '' : ' disabled'}"
                        ${canTrain ? `onclick="confirmTrainUnit('${key}', ${hex.col}, ${hex.row})"` : ''}
                        ${!canTrain ? 'disabled' : ''}>
                    <div class="bb-header">
                        <span class="bb-icon">${unitType.icon}</span>
                        <span class="bb-name">${unitType.name}</span>
                        <span class="bb-cost">${costStr}</span>
                    </div>
                    <div class="bb-desc">${unitType.description}</div>
                    ${!canTrain ? `<div class="bb-reason">${reason}</div>` : ''}
                </button>`;
        }
        html += `<div class="build-section">
            <h4 onclick="toggleTrainingSection()" style="cursor: pointer;">Train Units <span class="section-toggle-hint">click to toggle</span></h4>
            <div class="training-content collapsed" id="training-content">${trainHtml}</div>
        </div>`;
    }

    // Sacred place and landscape naming (Phase 8D)
    if (inTerr) {
      const sacredPlace = window.getSacredPlace ? window.getSacredPlace(hex.col, hex.row) : null;
      const hasRiver = hexHasRiver(hex);
      const canNameTerrain = window.isNameableTerrain ? window.isNameableTerrain(hex.terrain) : false;

      // All rivers touching this hex (may be >1 at lake/ridge/junction hexes)
      const hexRivers = hasRiver && window.getRiversAtHex ? window.getRiversAtHex(hex.col, hex.row) : [];
      const namedTerrain = canNameTerrain && window.getNamedFeature ? window.getNamedFeature(hex.col, hex.row) : null;

      const reasons = { founding_site: '🏛️ Founding Site', battle_site: '⚔️ Battle Site', burial_ground: '🕯️ Burial Ground', spiritual_site: '✨ Spiritual Site', natural_wonder: '🌿 Natural Wonder' };
      let cultureHtml = `<div class="build-section culture-section">`;

      // Sacred place
      if (sacredPlace) {
        const label = sacredPlace.name ? `"${sacredPlace.name}"` : reasons[sacredPlace.reason];
        cultureHtml += `<div class="sacred-place-display">
          <span class="sacred-icon">⛩️</span>
          <span class="sacred-label">${label}</span>
          <span class="sacred-type">${reasons[sacredPlace.reason]}</span>
        </div>`;
      } else {
        cultureHtml += `<button class="build-btn" onclick="confirmDesignateSacredPlace(${hex.col},${hex.row})">
          <div class="bb-header"><span class="bb-icon">⛩️</span><span class="bb-name">Designate as Sacred</span></div>
          <div class="bb-desc">Mark this place as culturally significant. Generates passive Bonds.</div>
        </button>`;
      }

      // One entry per river touching this hex. Each river gets its own name/rename
      // control so hexes with multiple rivers (lake, ridge, junction) all work.
      for (const r of hexRivers) {
        const namedRiver = window.getNamedRiver ? window.getNamedRiver(r.id) : null;
        if (namedRiver) {
          cultureHtml += `<div class="named-feature-display">
            <span class="named-icon">🏞️</span>
            <span class="named-label">"${namedRiver.name}"</span>
            <button class="named-rename-btn" onclick="confirmNameRiver(${hex.col},${hex.row},${r.id})">Rename</button>
          </div>`;
        } else {
          cultureHtml += `<button class="build-btn" onclick="confirmNameRiver(${hex.col},${hex.row},${r.id})">
            <div class="bb-header"><span class="bb-icon">🏞️</span><span class="bb-name">Name this River</span></div>
            <div class="bb-desc">Give this river a name. It will appear on the map as it is explored. Identity +1.</div>
          </button>`;
        }
      }

      // Terrain naming (independent of river)
      if (canNameTerrain) {
        const featureLabel = hex.terrain.charAt(0).toUpperCase() + hex.terrain.slice(1);
        if (namedTerrain) {
          cultureHtml += `<div class="named-feature-display">
            <span class="named-icon">📌</span>
            <span class="named-label">"${namedTerrain.name}"</span>
            <button class="named-rename-btn" onclick="confirmNameFeature(${hex.col},${hex.row})">Rename</button>
          </div>`;
        } else {
          cultureHtml += `<button class="build-btn" onclick="confirmNameFeature(${hex.col},${hex.row})">
            <div class="bb-header"><span class="bb-icon">📌</span><span class="bb-name">Name this ${featureLabel}</span></div>
            <div class="bb-desc">Give this place a name. Naming is an act of claiming. Identity +1.</div>
          </button>`;
        }
      }

      cultureHtml += `</div>`;
      html += cultureHtml;
    }

    document.getElementById('hex-info-content').innerHTML = html;
}

export function clearSidePanel() {
    document.querySelector('#hex-info-section h3').innerHTML = 'Select a Hex <span class="section-toggle-hint">click to toggle</span>';
    document.getElementById('hex-info-content').innerHTML = '<p class="help-text">Click any hex to see details and build options. Your territory extends 3 hexes from each settlement.</p>';
}

// Helper functions - these need to be available globally
function hexHasRiver(hex) { return hex.hasRiver; }

function hexAdjacentToLake(hex) {
    if (!gameState) return false;
    const neighbors = getHexNeighbors(hex.col, hex.row);
    return neighbors.some(neighbor => gameState.map[neighbor.row] && gameState.map[neighbor.row][neighbor.col] && gameState.map[neighbor.row][neighbor.col].terrain === 'lake');
}

function hexAdjacentToWater(hex) {
    if (!gameState) return false;
    const neighbors = getHexNeighbors(hex.col, hex.row);
    return neighbors.some(neighbor => {
        const n = gameState.map[neighbor.row] && gameState.map[neighbor.row][neighbor.col];
        return n && (n.terrain === 'coast' || n.terrain === 'ocean' || n.terrain === 'lake');
    });
}

function hexHasFreshWater(hex) { return hex.hasRiver || hexAdjacentToLake(hex); }

function isInTerritory(col, row) {
    if (!gameState) return false;
    return gameState.territory.has(`${col},${row}`);
}

function getHexYield(hex) {
    const terrain = TERRAIN[hex.terrain];
    let food = terrain.food || 0;
    let materials = terrain.materials || 0;

    // Add fresh water bonus
    if (hexHasFreshWater(hex)) {
        food += 1;
    }

    // Add building bonuses
    if (hex.building && hex.buildProgress === 0) {
        const building = BUILDINGS[hex.building];
        const efficiency = building.maxWorkers > 0 ? hex.workers / building.maxWorkers : 0;
        food += Math.floor((building.foodBonus || 0) * efficiency);
        materials += Math.floor((building.materialBonus || 0) * efficiency);

        // River building bonus
        if (hexHasFreshWater(hex) && building.riverFoodBonus) {
            food += Math.floor(building.riverFoodBonus * efficiency);
        }

        // Settlement auto food
        if (hex.building === 'settlement' && building.autoFood) {
            food += building.autoFood;
        }
    }

    return { food, materials };
}

function getMaxWorkers(hex) {
    if (hex.building) {
        return BUILDINGS[hex.building].maxWorkers;
    }
    return 1; // gatherer
}

function getUnitsAt(col, row) {
    if (!gameState) return [];
    return gameState.units.filter(u => u.col === col && u.row === row);
}

function getHexNeighbors(col, row) {
    const neighbors = [];
    // Odd-r offset coordinate neighbors (simplified)
    const directions = [
        [0, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]
    ];

    for (const [dCol, dRow] of directions) {
        const newCol = col + dCol;
        const newRow = row + dRow;
        neighbors.push({col: newCol, row: newRow});
    }

    return neighbors;
}

// ---- SIDEBAR SECTION TOGGLES ----

export function toggleSocietySection() {
    const section = document.getElementById('society-section');
    section.classList.toggle('collapsed');
    document.getElementById('cohesion-bar-container').classList.toggle('active', !section.classList.contains('collapsed'));
}

export function togglePopulationSection() {
    const section = document.getElementById('labor-section');
    section.classList.toggle('collapsed');
    document.getElementById('pop-toggle').classList.toggle('active', !section.classList.contains('collapsed'));
}

export function toggleHexInfoSection() {
    const section = document.getElementById('hex-info-section');
    section.classList.toggle('collapsed');
}

export function toggleBuildSection() {
    const content = document.getElementById('build-content');
    if (content) content.classList.toggle('collapsed');
}

export function toggleTrainingSection() {
    const content = document.getElementById('training-content');
    if (content) content.classList.toggle('collapsed');
}
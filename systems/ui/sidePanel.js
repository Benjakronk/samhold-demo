// systems/ui/sidePanel.js
// Side panel display and management system
// Extracted from original monolithic implementation

import { TERRAIN } from '../../data/terrain.js';
import { BUILDINGS } from '../../data/buildings.js';
import { UNIT_TYPES } from '../../data/units.js';
import { THREAT_TYPES } from '../../data/threats.js';
import { cubeDistance, offsetToCube } from '../../utils/hexMath.js';

let gameState = null;
let _selectedFortEdge = null; // { col, row, edge } — persists across same-hex re-renders
let _fortPanelHex = null;     // tracks which hex the fort panel is showing

// ---- FORTIFICATION HEX DIAGRAM HELPERS ----

function _fortHexSVG(col, row, hexForts, selEdge) {
    const r = 36, cx = 44, cy = 44, W = 88, H = 88;
    const verts = Array.from({ length: 6 }, (_, v) => {
        const a = (60 * v - 30) * Math.PI / 180;
        return { x: (cx + r * Math.cos(a)).toFixed(2), y: (cy + r * Math.sin(a)).toFixed(2) };
    });
    const pts = verts.map(v => `${v.x},${v.y}`).join(' ');
    const FORTS = window.FORTIFICATIONS;
    const fortByEdge = {};
    for (const { edge, fort } of hexForts) fortByEdge[edge] = fort;

    let svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display:block;margin:0 auto 6px">`;
    svg += `<polygon points="${pts}" fill="rgba(40,32,24,0.75)" stroke="rgba(180,150,80,0.2)" stroke-width="1"/>`;

    for (let e = 0; e < 6; e++) {
        const v0 = verts[e], v1 = verts[(e + 1) % 6];
        const fort = fortByEdge[e];
        const def = fort ? FORTS?.[fort.type] : null;
        const isSel = selEdge && selEdge.col === col && selEdge.row === row && selEdge.edge === e;
        const color = isSel ? '#ffe080' : (def ? def.color : 'rgba(180,150,80,0.25)');
        const sw = isSel ? 6 : (fort ? 4 : 2);
        const dash = fort?.buildProgress > 0 ? '4,3' : 'none';
        const opacity = fort?.buildProgress > 0 ? 0.6 : 1.0;
        // Visual line
        svg += `<line x1="${v0.x}" y1="${v0.y}" x2="${v1.x}" y2="${v1.y}" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${dash}" opacity="${opacity}" pointer-events="none"/>`;
        // Hit area (on top)
        svg += `<line x1="${v0.x}" y1="${v0.y}" x2="${v1.x}" y2="${v1.y}" stroke="transparent" stroke-width="14" style="cursor:pointer" onclick="window.selectFortEdge(${col},${row},${e})"/>`;
    }
    svg += `</svg>`;
    return svg;
}

function _fortEdgeControls(hex, hexForts, selEdge) {
    const FORTS = window.FORTIFICATIONS;
    const edgeNames = ['East', 'SE', 'SW', 'West', 'NW', 'NE'];

    if (!selEdge || selEdge.col !== hex.col || selEdge.row !== hex.row) {
        return `<p style="text-align:center;font-size:11px;color:var(--text-dim);margin:2px 0 4px">Click an edge to place or manage fortifications</p>`;
    }

    const edge = selEdge.edge;
    const fortEntry = hexForts.find(f => f.edge === edge);
    const fort = fortEntry?.fort;
    const def = fort ? FORTS?.[fort.type] : null;

    if (!fort) {
        const mats = gameState.resources.materials;
        const canPal = mats >= (FORTS?.palisade?.cost?.materials ?? 4);
        const canGate = mats >= (FORTS?.gate?.cost?.materials ?? 8);
        return `<div class="fort-edge-controls">
            <div class="fort-edge-label">${edgeNames[edge]} — unfortified</div>
            <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px">
                <button class="detail-btn" ${canPal ? '' : 'disabled'} onclick="window.buildFortAt(${hex.col},${hex.row},${edge},'palisade')">🪵 Palisade <span style="color:var(--text-dim)">(🪵${FORTS?.palisade?.cost?.materials ?? 4})</span></button>
                <button class="detail-btn" ${canGate ? '' : 'disabled'} onclick="window.buildFortAt(${hex.col},${hex.row},${edge},'gate')">🚪 Gate <span style="color:var(--text-dim)">(🪵${FORTS?.gate?.cost?.materials ?? 8})</span></button>
            </div>
        </div>`;
    }

    if (fort.buildProgress > 0) {
        const maxW = def?.buildWorkers ?? 1;
        const wc = fort.workers ?? 0;
        const canAdd = wc < maxW && gameState.population.idle > 0;
        const statusStr = wc > 0
            ? `<span class="yield-val" style="color:var(--text-gold)">Building... (${fort.buildProgress} turn${fort.buildProgress !== 1 ? 's' : ''} left)</span>`
            : `<span class="yield-none">stalled — assign a builder!</span>`;
        return `<div class="fort-edge-controls">
            <div class="fort-edge-label">${def.icon} ${def.name} (${edgeNames[edge]})</div>
            <div class="worker-section" style="margin-top:4px">
                <div class="worker-controls">
                    <span class="worker-label">🔨 Builders</span>
                    <div class="worker-btns">
                        <button class="worker-btn" ${wc > 0 ? '' : 'disabled'} onclick="window.unassignFortWorker(${hex.col},${hex.row},${edge})">−</button>
                        <span class="worker-count">${wc} / ${maxW}</span>
                        <button class="worker-btn" ${canAdd ? '' : 'disabled'} onclick="window.assignFortWorker(${hex.col},${hex.row},${edge})">+</button>
                    </div>
                </div>
                <div class="yield-row"><span class="yield-label">Progress:</span>${statusStr}</div>
            </div>
            <button class="demolish-btn" style="margin-top:6px;width:100%" onclick="window.confirmDemolishFortification(${hex.col},${hex.row},${edge})">✕ Cancel Build</button>
        </div>`;
    }

    // Completed fort
    const canUpgrade = fort.type === 'palisade';
    const canAffordUpgrade = canUpgrade && gameState.resources.materials >= (FORTS?.wall?.upgradeCost?.materials ?? 6);
    return `<div class="fort-edge-controls">
        <div class="fort-edge-label">${def.icon} ${def.name} (${edgeNames[edge]}) — ${fort.health}/${fort.maxHealth} HP</div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px">
            ${canUpgrade ? `<button class="detail-btn" ${canAffordUpgrade ? '' : 'disabled'} onclick="window.confirmUpgradeFortification(${hex.col},${hex.row},${edge})">🧱 Upgrade to Wall <span style="color:var(--text-dim)">(🪵${FORTS?.wall?.upgradeCost?.materials ?? 6})</span></button>` : ''}
            <button class="demolish-btn" onclick="window.confirmDemolishFortification(${hex.col},${hex.row},${edge})">✕ Demolish</button>
        </div>
    </div>`;
}

export function selectFortEdge(col, row, edge) {
    _selectedFortEdge = { col, row, edge };
    const hex = gameState?.map[row]?.[col];
    if (hex) updateSidePanel(hex);
}

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
    // Reset fort edge selection when switching to a different hex
    if (!_fortPanelHex || _fortPanelHex.col !== hex.col || _fortPanelHex.row !== hex.row) {
        _selectedFortEdge = null;
    }
    _fortPanelHex = hex;

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
            } else if (bDef.isSocietyBuilding && bDef.maxWorkers === 0 && bDef.permanentIdentityBonus) {
                // Monument — permanent passive effect, no workers
                const subject = hex.monumentSubject || '';
                const refund = Math.floor((bDef.cost.materials || 0) / 2);
                html += `<div class="bd-detail">🗿 Permanent Identity +${bDef.permanentIdentityBonus}${subject ? '<br><em>Commemorating: ' + subject + '</em>' : ''}</div>
                <button class="demolish-btn" onclick="demolishBuilding(${hex.col},${hex.row})">✕ Demolish (🪵+${refund})</button>`;
            } else {
                const refund = Math.floor((bDef.cost.materials || 0) / 2);
                html += `<div class="bd-detail">Bonus: ${bDef.foodBonus ? '🌾+' + bDef.foodBonus : ''}${bDef.foodBonus && bDef.materialBonus ? ' ' : ''}${bDef.materialBonus ? '🪵+' + bDef.materialBonus : ''} (at full workers)</div>
                <button class="demolish-btn" onclick="demolishBuilding(${hex.col},${hex.row})">✕ Demolish (🪵+${refund})</button>`;
            }
            html += `</div>`;
        }
    }

    // Show fortifications on this hex's edges
    if (inTerr && window.getHexFortifications) {
        const hexForts = window.getHexFortifications(hex.col, hex.row);
        const fortInner = _fortHexSVG(hex.col, hex.row, hexForts, _selectedFortEdge)
                        + _fortEdgeControls(hex, hexForts, _selectedFortEdge);
        html += `<div class="fortifications-section build-section">
            <h4 onclick="toggleFortificationsSection()" style="cursor:pointer;">Fortifications <span class="section-toggle-hint">click to toggle</span></h4>
            <div class="fort-content collapsed" id="fort-content">${fortInner}</div>
        </div>`;
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

            // Build unit action buttons based on type and context
            let actionButtons = '';

            // Surveyor: Found Region action
            if (unit.type === 'surveyor' && window.canFoundRegion && window.canFoundRegion(unit.col, unit.row)) {
              actionButtons += `<button class="detail-btn unit-control-btn" onclick="showRegionFoundingConfirmation(${unit.col},${unit.row},${unit.id})">🗺️ Found Region</button>`;
            }

            // Steward: Tend actions based on what's on this hex
            if (unit.type === 'steward') {
              const hexHere = gameState.map[unit.row]?.[unit.col];
              const isActive = !!unit.activeAction;

              if (isActive) {
                const actionLabel = unit.activeAction === 'tending_monument' ? '🗿 Tending Monument' : '⛩️ Tending Site';
                actionButtons += `<button class="detail-btn unit-control-btn" style="color:var(--accent-green);outline:1px solid var(--accent-green)"
                  onclick="deactivateStewardTend(${unit.id})">${actionLabel} ✕ Stop</button>`;
              } else {
                if (hexHere?.building === 'monument' && hexHere.buildProgress <= 0) {
                  const isNeglected = hexHere.monumentState === 'neglected';
                  const restoreCost = window.getMonumentRestoreCost ? window.getMonumentRestoreCost(hexHere) : 5;
                  const btnLabel = isNeglected ? `🗿 Restore Monument (🪵${restoreCost})` : '🗿 Tend Monument';
                  actionButtons += `<button class="detail-btn unit-control-btn" onclick="activateStewardTend(${unit.id})">${btnLabel}</button>`;
                }
                if (hexHere?.building === 'sacred_site' && hexHere.buildProgress <= 0 && hexHere.workers > 0) {
                  actionButtons += `<button class="detail-btn unit-control-btn" onclick="activateStewardTend(${unit.id})">⛩️ Tend Sacred Site</button>`;
                }
              }
            }

            // Warrior: Attack action (when threat is adjacent)
            if (unit.type === 'warrior' && window.hasUnitActions && window.hasUnitActions(unit)) {
              const inActionMode = gameState.selectedUnit?.id === unit.id && gameState.unitInteractionMode === 'action';
              actionButtons += `<button class="detail-btn unit-control-btn" style="color:#cc6666${inActionMode ? ';outline:1px solid #cc6666' : ''}"
                onclick="activateActionMode(${unit.id})">⚔️ Attack</button>`;
            }

            const primaryBtn = isSelected && gameState.unitInteractionMode === 'action'
                ? `<button class="detail-btn" onclick="setUnitMode(null); updateSidePanel(gameState.selectedHex); if (window.render) window.render();">✕ Cancel</button>`
                : isSelected
                    ? `<button class="detail-btn" onclick="deselectUnit(); updateSidePanel(gameState.selectedHex); if (window.render) window.render();">✕ Cancel</button>`
                    : `<button class="detail-btn" onclick="selectUnitForMovement(${unit.id}); updateSidePanel(gameState.selectedHex);">🚶 Move</button>`;

            html += `
                <div class="unit-display">
                    <div class="unit-header">
                        <span class="unit-icon">${unitType.icon}</span>
                        <span class="unit-name">${unitType.name}</span>
                        <span class="unit-health" style="color: ${healthColor}">${unit.health}%</span>
                    </div>
                    <div class="unit-details">${unitType.description}${movementInfo}</div>
                    <div class="unit-controls">
                        <div class="unit-controls-primary">
                            ${primaryBtn}
                            <button class="demolish-btn" onclick="confirmDisbandUnit(${unit.id}); updateSidePanel(gameState.selectedHex);">✕ Disband</button>
                        </div>
                        ${actionButtons ? `<div class="unit-controls-actions">${actionButtons}</div>` : ''}
                    </div>
                    ${isSelected ? `<div class="unit-mode-indicator">${gameState.unitInteractionMode === 'action' ? '⚔️ Action mode — click a target' : '🚶 Move mode — click a hex'}</div>` : ''}
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
        } else if (hex.building && BUILDINGS[hex.building]?.isSocietyBuilding) {
            const bDef = BUILDINGS[hex.building];
            if (hex.workers > 0) {
                const yieldParts = [];
                if (bDef.bondsYield) yieldParts.push(`💗+${(bDef.bondsYield * hex.workers).toFixed(2)} Bonds`);
                if (bDef.identityYield) yieldParts.push(`🪶+${(bDef.identityYield * hex.workers).toFixed(2)} Identity`);
                if (bDef.satisfactionYield) yieldParts.push(`😊+${(bDef.satisfactionYield * hex.workers).toFixed(2)} Satisfaction`);
                if (bDef.legitimacyYield) yieldParts.push(`🏛️+${(bDef.legitimacyYield * hex.workers).toFixed(2)} Legitimacy`);
                const upkeepStr = bDef.upkeepMaterials ? ` · 🪵−${bDef.upkeepMaterials * hex.workers}/turn` : '';
                statusStr = `<span class="yield-val">${yieldParts.join(' · ')}/turn${upkeepStr}</span>`;
            } else if (bDef.maxWorkers === 0 && bDef.permanentIdentityBonus) {
                const subject = hex.monumentSubject || '';
                statusStr = `<span class="yield-val">🗿 Permanent Identity +${bDef.permanentIdentityBonus}${subject ? ' — ' + subject : ''}</span>`;
            } else {
                statusStr = `<span class="yield-none">${emptyMsg}</span>`;
            }
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
            if (key === 'sacred_site') continue; // handled separately below
            if (key === 'monument') continue;    // handled separately below
            if (key === 'meeting_hall') continue; // handled separately below
            const terrainValid = bDef.validTerrain.includes(hex.terrain);
            const riverValid = bDef.validOnRiver && hexHasRiver(hex);
            const waterAdjValid = bDef.requiresAdjacentWater && hexAdjacentToWater(hex) && bDef.validTerrain.includes(hex.terrain);
            if (!terrainValid && !riverValid) continue;
            // If requiresAdjacentWater, terrain alone isn't enough — need water neighbor or river
            if (bDef.requiresAdjacentWater && !waterAdjValid && !riverValid) continue;

            const canAfford = gameState.resources.materials >= bDef.cost.materials;
            const reason = canAfford ? '' : `Need ${bDef.cost.materials} materials`;

            if (bDef.isSocietyBuilding) {
                // Society buildings (shrine) — show cohesion yields
                const yieldParts = [];
                if (bDef.identityYield) yieldParts.push(`🪶+${(bDef.identityYield * bDef.maxWorkers).toFixed(2)} Identity`);
                if (bDef.satisfactionYield) yieldParts.push(`😊+${(bDef.satisfactionYield * bDef.maxWorkers).toFixed(2)} Satisfaction`);
                if (bDef.legitimacyYield) yieldParts.push(`🏛️+${(bDef.legitimacyYield * bDef.maxWorkers).toFixed(2)} Legitimacy`);
                if (bDef.bondsYield) yieldParts.push(`💗+${(bDef.bondsYield * bDef.maxWorkers).toFixed(2)} Bonds`);
                const upkeepStr = bDef.upkeepMaterials ? ` · 🪵−${bDef.upkeepMaterials * bDef.maxWorkers}/turn` : '';
                buildHtml += `<button class="build-btn" ${canAfford ? '' : 'disabled'} onclick="confirmBuildBuilding(${hex.col},${hex.row},'${key}')" title="${reason}">
                    <span class="b-icon">${bDef.icon}</span>
                    <span class="b-info">
                        <span class="b-name">${bDef.name}</span><br>
                        <span class="b-cost">🪵${bDef.cost.materials} · 🔨${bDef.buildTurns} work · 👥${bDef.maxWorkers}</span>
                        <span class="b-yield"> → ${yieldParts.join(' · ')}${upkeepStr}</span>
                    </span>
                </button>`;
            } else {
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
                        <span class="b-yield"> → ${terrFood ? '🌾' + terrFood : ''}${terrMat ? ' 🪵' + terrMat : ''}${bDef.visionRadius ? '👁️ Vision ' + bDef.visionRadius : ''}${riverTag}</span>
                    </span>
                </button>`;
            }
        }

        // Sacred site — valid terrain check, custom dialog, bonds yield display
        const sacredBDef = BUILDINGS.sacred_site;
        if (sacredBDef.validTerrain.includes(hex.terrain)) {
            const status = window.getSacredSiteReasonStatus ? window.getSacredSiteReasonStatus(hex.col, hex.row) : null;
            const anyAvailable = status && Object.values(status).some(s => s.available);
            const canAffordSacred = gameState.resources.materials >= sacredBDef.cost.materials;
            const sacredEnabled = anyAvailable && canAffordSacred;
            const sacredReason = !anyAvailable ? 'No dedications available yet' : !canAffordSacred ? `Need ${sacredBDef.cost.materials} materials` : '';
            buildHtml += `<button class="build-btn" ${sacredEnabled ? '' : 'disabled'} onclick="confirmBuildSacredSite(${hex.col},${hex.row})" title="${sacredReason}">
                <span class="b-icon">${sacredBDef.icon}</span>
                <span class="b-info">
                    <span class="b-name">${sacredBDef.name}</span><br>
                    <span class="b-cost">🪵${sacredBDef.cost.materials} · 🔨${sacredBDef.buildTurns} work · 👥${sacredBDef.maxWorkers}</span>
                    <span class="b-yield"> → 💗+${sacredBDef.bondsYield * sacredBDef.maxWorkers} Bonds/turn (slow) · 🪵−${sacredBDef.upkeepMaterials * sacredBDef.maxWorkers}/turn</span>
                </span>
            </button>`;
        }

        // Monument — custom dialog with commemoration choice
        const monumentBDef = BUILDINGS.monument;
        if (monumentBDef.validTerrain.includes(hex.terrain)) {
            const canAffordMonument = gameState.resources.materials >= monumentBDef.cost.materials;
            const monumentReason = !canAffordMonument ? `Need ${monumentBDef.cost.materials} materials` : '';
            buildHtml += `<button class="build-btn" ${canAffordMonument ? '' : 'disabled'} onclick="confirmBuildMonument(${hex.col},${hex.row})" title="${monumentReason}">
                <span class="b-icon">${monumentBDef.icon}</span>
                <span class="b-info">
                    <span class="b-name">${monumentBDef.name}</span><br>
                    <span class="b-cost">🪵${monumentBDef.cost.materials} · 🔨${monumentBDef.buildTurns} work · needs ${monumentBDef.buildWorkers || 2} builders · 🪵${monumentBDef.upkeepMaterials}/turn upkeep</span>
                    <span class="b-yield"> → 🪶 Identity +${monumentBDef.permanentIdentityBonus} (permanent, on completion)</span>
                </span>
            </button>`;
        }

        // Meeting Hall — 1 per settlement territory
        const meetingHallBDef = BUILDINGS.meeting_hall;
        if (meetingHallBDef.validTerrain.includes(hex.terrain)) {
            const hasMH = window.hasSettlementMeetingHall ? window.hasSettlementMeetingHall(hex.col, hex.row) : false;
            const canAffordMH = gameState.resources.materials >= meetingHallBDef.cost.materials;
            const mhEnabled = canAffordMH && !hasMH;
            const mhReason = hasMH ? 'Already have a Meeting Hall in this settlement' : !canAffordMH ? `Need ${meetingHallBDef.cost.materials} materials` : '';
            const mhYieldParts = [];
            if (meetingHallBDef.legitimacyYield) mhYieldParts.push(`🏛️+${(meetingHallBDef.legitimacyYield * meetingHallBDef.maxWorkers).toFixed(2)} Legitimacy`);
            const mhUpkeep = meetingHallBDef.upkeepMaterials ? ` · 🪵−${meetingHallBDef.upkeepMaterials * meetingHallBDef.maxWorkers}/turn` : '';
            buildHtml += `<button class="build-btn" ${mhEnabled ? '' : 'disabled'} onclick="confirmBuildBuilding(${hex.col},${hex.row},'meeting_hall')" title="${mhReason}">
                <span class="b-icon">${meetingHallBDef.icon}</span>
                <span class="b-info">
                    <span class="b-name">${meetingHallBDef.name}</span><br>
                    <span class="b-cost">🪵${meetingHallBDef.cost.materials} · 🔨${meetingHallBDef.buildTurns} work · 👥${meetingHallBDef.maxWorkers}</span>
                    <span class="b-yield"> → ${mhYieldParts.join(' · ')}${mhUpkeep}</span>
                    ${hasMH ? '<span class="b-yield" style="color:var(--text-dim)"> (limit: 1 per settlement)</span>' : ''}
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

    // Region membership display
    const regionOwner = window.getRegionOwner ? window.getRegionOwner(hex.col, hex.row) : null;
    if (regionOwner) {
      const regionColor = window.getRegionColor ? window.getRegionColor(regionOwner.id) : '#c8a03a';
      html += `<div class="hex-info-row"><span class="label">🗺️ Region</span><span class="value" style="color:${regionColor};font-style:italic">${regionOwner.name}</span></div>`;
    }

    // Sacred site building, river/lake naming, and culture display (Phase 8D)
    if (inTerr) {
      const hasRiver = hexHasRiver(hex);

      // All rivers touching this hex (may be >1 at lake/ridge/junction hexes)
      const hexRivers = hasRiver && window.getRiversAtHex ? window.getRiversAtHex(hex.col, hex.row) : [];

      const reasonLabels = { founding_site: '🏛️ Founding Site', battle_site: '⚔️ Battle Site', burial_ground: '🕯️ Burial Ground', spiritual_site: '✨ Spiritual Site', natural_wonder: '🌿 Natural Wonder' };
      let cultureInner = '';

      // Sacred site status display (when built and complete)
      if (hex.building === 'sacred_site' && hex.buildProgress <= 0) {
        const reasonLabel = reasonLabels[hex.sacredReason] || '⛩️ Sacred Site';
        const bDef = window.BUILDINGS?.sacred_site;
        const isWorked = hex.workers > 0;
        // Check if a Steward is tending this site
        const stewardHere = gameState.units.find(u => u.type === 'steward' && u.col === hex.col && u.row === hex.row && u.activeAction === 'tending_sacred_site');
        const tendingNote = stewardHere ? ' · 🧭 Steward tending (upkeep waived)' : '';
        cultureInner += `<div class="sacred-place-display">
          <span class="sacred-icon">⛩️</span>
          <span class="sacred-label">${reasonLabel}</span>
          <span class="sacred-type">${isWorked ? `💗+${(bDef?.bondsYield ?? 0.1) * hex.workers}/turn · 🪵−${(bDef?.upkeepMaterials ?? 1) * hex.workers}/turn${tendingNote}` : 'Unstaffed — assign keepers'}</span>
        </div>`;
      }

      // Monument status display (when built and complete)
      if (hex.building === 'monument' && hex.buildProgress <= 0) {
        const NEGLECT_INTERVAL = 8;
        const state = hex.monumentState || 'active';
        const neglectTurns = hex.neglectTurns || 0;
        const turnsSince = gameState.turn - (hex.lastStewardTurn ?? hex.completedTurn ?? gameState.turn);
        const turnsUntilNeglect = Math.max(0, NEGLECT_INTERVAL - turnsSince);
        const restoreCost = window.getMonumentRestoreCost ? window.getMonumentRestoreCost(hex) : (5 + 2 * neglectTurns);
        const stewardHere = gameState.units.find(u => u.type === 'steward' && u.col === hex.col && u.row === hex.row && u.activeAction === 'tending_monument');
        const subject = hex.monumentSubject || '';

        if (state === 'neglected') {
          cultureInner += `<div class="sacred-place-display" style="border-left:3px solid var(--accent-red)">
            <span class="sacred-icon">🗿</span>
            <span class="sacred-label" style="color:var(--accent-red)">Neglected ${neglectTurns} turn${neglectTurns !== 1 ? 's' : ''}</span>
            <span class="sacred-type" style="color:var(--accent-red)">Identity −0.05 · Bonds −0.05 / turn · Restore: 🪵${restoreCost}</span>
          </div>`;
        } else if (stewardHere) {
          cultureInner += `<div class="sacred-place-display" style="border-left:3px solid var(--accent-green)">
            <span class="sacred-icon">🗿</span>
            <span class="sacred-label">${subject ? subject : 'Monument'}</span>
            <span class="sacred-type">🧭 Steward tending · Identity +0.05 · Bonds +0.05 / turn</span>
          </div>`;
        } else {
          cultureInner += `<div class="sacred-place-display">
            <span class="sacred-icon">🗿</span>
            <span class="sacred-label">${subject ? subject : 'Monument'}</span>
            <span class="sacred-type">Identity +0.05 · Bonds +0.05 / turn · Steward needed in ~${turnsUntilNeglect} turn${turnsUntilNeglect !== 1 ? 's' : ''}</span>
          </div>`;
        }
      }

      // River naming — one entry per river touching this hex
      for (const r of hexRivers) {
        const namedRiver = window.getNamedRiver ? window.getNamedRiver(r.id) : null;
        if (namedRiver) {
          cultureInner += `<div class="named-feature-display">
            <span class="named-icon">🏞️</span>
            <span class="named-label">"${namedRiver.name}"</span>
            <button class="named-rename-btn" onclick="confirmNameRiver(${hex.col},${hex.row},${r.id})">Rename</button>
          </div>`;
        } else {
          cultureInner += `<button class="build-btn" onclick="confirmNameRiver(${hex.col},${hex.row},${r.id})">
            <div class="bb-header"><span class="bb-icon">🏞️</span><span class="bb-name">Name this River</span></div>
            <div class="bb-desc">Give this river a name. It will appear on the map as it is explored. Identity +1.</div>
          </button>`;
        }
      }

      // Lake naming
      if (hex.terrain === 'lake') {
        const namedLake = window.getNamedLake ? window.getNamedLake(hex.lakeCluster) : null;
        if (namedLake) {
          cultureInner += `<div class="named-feature-display">
            <span class="named-icon">💧</span>
            <span class="named-label">"${namedLake.name}"</span>
            <button class="named-rename-btn" onclick="confirmNameLake(${hex.col},${hex.row})">Rename</button>
          </div>`;
        } else {
          cultureInner += `<button class="build-btn" onclick="confirmNameLake(${hex.col},${hex.row})">
            <div class="bb-header"><span class="bb-icon">💧</span><span class="bb-name">Name this Lake</span></div>
            <div class="bb-desc">Give this lake a name. The name appears on all connected lake hexes. Identity +1.</div>
          </button>`;
        }
      }

      if (cultureInner) html += `<div class="build-section culture-section">
        <h4 onclick="toggleCultureSection()" style="cursor: pointer;">Culture <span class="section-toggle-hint">click to toggle</span></h4>
        <div class="culture-content collapsed" id="culture-content">${cultureInner}</div>
      </div>`;
    }

    // Snapshot open/closed state of collapsible sections before replacing innerHTML
    const collapsibleIds = ['build-content', 'training-content', 'culture-content', 'fort-content'];
    const wasOpen = {};
    for (const id of collapsibleIds) {
        const el = document.getElementById(id);
        if (el) wasOpen[id] = !el.classList.contains('collapsed');
    }

    document.getElementById('hex-info-content').innerHTML = html;

    // Restore open sections (default is collapsed, so only un-collapse the ones that were open)
    for (const id of collapsibleIds) {
        if (wasOpen[id]) {
            const el = document.getElementById(id);
            if (el) el.classList.remove('collapsed');
        }
    }
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
    // Society buildings produce no terrain yield — cohesion is handled separately
    if (hex.building && hex.buildProgress === 0) {
        const bDef = BUILDINGS[hex.building];
        if (bDef?.isSocietyBuilding) return { food: 0, materials: 0 };
    }

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
        const bDef = BUILDINGS[hex.building];
        if (hex.buildProgress > 0) return bDef.buildWorkers || bDef.maxWorkers || 0;
        return bDef.maxWorkers || 0;
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

export function toggleCultureSection() {
    const content = document.getElementById('culture-content');
    if (content) content.classList.toggle('collapsed');
}

export function toggleBuildSection() {
    const content = document.getElementById('build-content');
    if (content) content.classList.toggle('collapsed');
}

export function toggleTrainingSection() {
    const content = document.getElementById('training-content');
    if (content) content.classList.toggle('collapsed');
}

export function toggleFortificationsSection() {
    const content = document.getElementById('fort-content');
    if (content) content.classList.toggle('collapsed');
}
// systems/ui/dialogSystem.js
// Dialog and confirmation system for game UI
// Handles confirmation dialogs, alerts, and user input dialogs

let gameState = null;

export function initDialogSystem(gameStateRef) {
    gameState = gameStateRef;
    setupDialogEventListeners();
}

// Hide/show the map feature-labels overlay so it is never composited
// simultaneously with the confirm dialog. This prevents a Chrome GPU process
// crash (macOS Metal) that occurs when the overlay and the dialog compositor
// layers are both active at the same time.
function hideLabelsOverlay() {
    const ov = document.getElementById('feature-labels-overlay');
    if (ov) ov.style.display = 'none';
}
function showLabelsOverlay() {
    const ov = document.getElementById('feature-labels-overlay');
    if (ov) ov.style.display = '';
    // Invalidate label cache and re-render so labels reappear immediately.
    if (window.invalidateFeatureLabelCache) window.invalidateFeatureLabelCache();
    if (window.render) window.render();
}

// Core confirmation dialog with custom styling
export function showConfirmDialog(title, bodyHtml, okLabel, cancelLabel, onConfirm) {
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-body').innerHTML = bodyHtml;
    document.getElementById('confirm-ok').textContent = okLabel;
    document.getElementById('confirm-cancel').textContent = cancelLabel;
    const dialog = document.getElementById('confirm-dialog');
    // Hide overlay first, then wait one frame before showing the dialog.
    // This prevents the overlay removal and dialog compositor-layer creation
    // from being batched into the same Metal command flush on Skia Graphite,
    // which crashes the GPU process on Intel Mac (crbug.com/841755 area).
    hideLabelsOverlay();
    requestAnimationFrame(() => dialog.classList.add('visible'));

    const okBtn = document.getElementById('confirm-ok');
    const cancelBtn = document.getElementById('confirm-cancel');

    function cleanup() {
        dialog.classList.remove('visible');
        okBtn.replaceWith(okBtn.cloneNode(true));
        cancelBtn.replaceWith(cancelBtn.cloneNode(true));
    }

    // showLabelsOverlay() is called AFTER onConfirm() so the render it triggers
    // sees any feature names added by the confirm action (e.g. naming a hex).
    document.getElementById('confirm-ok').addEventListener('click', () => { cleanup(); onConfirm(); showLabelsOverlay(); });
    document.getElementById('confirm-cancel').addEventListener('click', () => { cleanup(); showLabelsOverlay(); });
}

// Wrapper for standard confirm dialog with default labels
export function showConfirmationDialog(title, bodyHtml, onConfirm) {
    showConfirmDialog(title, bodyHtml, 'Confirm', 'Cancel', onConfirm);
}

// Non-destructive confirmation dialog (primary style instead of danger)
// options.noBackdropDismiss: if true, clicking the backdrop will not close the dialog
export function showConfirmDialogNonDestructive(title, bodyHtml, okLabel, cancelLabel, onConfirm, options) {
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-body').innerHTML = bodyHtml;
    document.getElementById('confirm-ok').textContent = okLabel;
    document.getElementById('confirm-cancel').textContent = cancelLabel;

    // Remove danger class and add primary class
    const okBtn = document.getElementById('confirm-ok');
    okBtn.classList.remove('danger');
    okBtn.classList.add('primary');

    const dialog = document.getElementById('confirm-dialog');
    // Track whether backdrop dismiss is allowed
    dialog.dataset.noBackdropDismiss = (options && options.noBackdropDismiss) ? 'true' : '';
    // Hide overlay first, then wait one frame before showing the dialog.
    // Prevents overlay removal + dialog compositor-layer creation from
    // being batched into the same Metal flush on Skia Graphite/Intel Mac.
    hideLabelsOverlay();
    requestAnimationFrame(() => dialog.classList.add('visible'));

    const cancelBtn = document.getElementById('confirm-cancel');

    function cleanup() {
        dialog.classList.remove('visible');
        dialog.dataset.noBackdropDismiss = '';
        // Reset to default danger styling for future destructive confirmations
        okBtn.classList.remove('primary');
        okBtn.classList.add('danger');
        cancelBtn.style.display = '';
        okBtn.replaceWith(okBtn.cloneNode(true));
        cancelBtn.replaceWith(cancelBtn.cloneNode(true));
    }

    // showLabelsOverlay() is called AFTER onConfirm() so the render it triggers
    // sees any feature names added by the confirm action (e.g. naming a hex).
    document.getElementById('confirm-ok').addEventListener('click', () => { cleanup(); onConfirm(); showLabelsOverlay(); });
    document.getElementById('confirm-cancel').addEventListener('click', () => { cleanup(); showLabelsOverlay(); });
}

// Game-specific confirmation dialogs

// Confirm unit training
export function confirmTrainUnit(unitType, col, row) {
    if (!gameState) return;

    const unitData = window.UNIT_TYPES[unitType];
    if (!unitData) return;

    const popCost = unitData.cost.population;
    const materialCost = unitData.cost.materials;
    const trainingTime = unitData.training;

    showConfirmDialogNonDestructive(
        `Train ${unitData.name}`,
        `<p>Train a ${unitData.name} at this location?</p>
         <p><strong>Cost:</strong> ${popCost} population, ${materialCost} materials</p>
         <p><strong>Training time:</strong> ${trainingTime} turns</p>
         <p><em>${unitData.description}</em></p>`,
        'Train',
        'Cancel',
        () => {
            if (window.startUnitTraining) {
                window.startUnitTraining(unitType, col, row);
                if (window.updateAllUI) window.updateAllUI();
                if (window.updateSidePanel) window.updateSidePanel(window.gameState && window.gameState.selectedHex);
                if (window.render) window.render();
            }
        }
    );
}

// Confirm building construction
export function confirmBuildBuilding(col, row, buildingType) {
    if (!gameState) return;

    const buildingData = window.BUILDINGS[buildingType];
    if (!buildingData) return;

    const materialCost = buildingData.cost.materials;
    const buildTime = buildingData.buildTurns;
    const maxWorkers = buildingData.maxWorkers;

    showConfirmDialogNonDestructive(
        `Build ${buildingData.name}`,
        `<p>Build a ${buildingData.name} at this location?</p>
         <p><strong>Cost:</strong> ${materialCost} materials</p>
         <p><strong>Build time:</strong> ${buildTime} work</p>
         <p><strong>Max workers:</strong> ${maxWorkers}</p>
         <p><em>${buildingData.description || ''}</em></p>`,
        'Build',
        'Cancel',
        () => {
            if (window.placeBuilding) {
                window.placeBuilding(col, row, buildingType);
                if (window.updateAllUI) window.updateAllUI();
                if (window.updateSidePanel) window.updateSidePanel(window.gameState && window.gameState.selectedHex);
                if (window.render) window.render();
            }
        }
    );
}

// Confirm unit disbanding
export function confirmDisbandUnit(unitId) {
    if (!gameState) return;

    const unit = gameState.units.find(u => u.id === unitId);
    if (!unit) return;

    const unitData = window.UNIT_TYPES[unit.type];
    if (!unitData) return;

    showConfirmDialog(
        `Disband ${unitData.name}`,
        `<p>Are you sure you want to disband this ${unitData.name}?</p>
         <p>This unit will be permanently removed and cannot be recovered.</p>
         <p><strong>Population will return to idle pool.</strong></p>`,
        'Disband',
        'Cancel',
        () => {
            if (window.disbandUnit) {
                window.disbandUnit(unitId);
            }
        }
    );
}

// Confirm building demolition
export function confirmDemolishBuilding(col, row) {
    if (!gameState) return;

    const hex = gameState.map[row] && gameState.map[row][col];
    if (!hex || !hex.building) return;

    const buildingData = window.BUILDINGS[hex.building];
    if (!buildingData) return;

    const materialRefund = Math.floor((buildingData.cost.materials || 0) / 2);

    showConfirmDialog(
        `Demolish ${buildingData.name}`,
        `<p>Are you sure you want to demolish this ${buildingData.name}?</p>
         <p>This building will be permanently destroyed.</p>
         <p><strong>Material refund:</strong> ${materialRefund} materials</p>
         <p><strong>Workers will become idle.</strong></p>`,
        'Demolish',
        'Cancel',
        () => {
            if (window.demolishBuilding) {
                window.demolishBuilding(col, row);
            }
        }
    );
}

// Confirm construction cancellation
export function confirmCancelConstruction(col, row) {
    if (!gameState) return;

    const hex = gameState.map[row] && gameState.map[row][col];
    if (!hex || !hex.constructing) return;

    const buildingData = window.BUILDINGS[hex.constructing.type];
    if (!buildingData) return;

    const materialRefund = buildingData.cost.materials;

    showConfirmDialog(
        `Cancel Construction`,
        `<p>Cancel construction of this ${buildingData.name}?</p>
         <p>Construction progress will be lost.</p>
         <p><strong>Full material refund:</strong> ${materialRefund} materials</p>
         <p><strong>Workers will become idle.</strong></p>`,
        'Cancel Construction',
        'Keep Building',
        () => {
            if (window.cancelConstruction) {
                window.cancelConstruction(col, row);
            }
        }
    );
}

// Simple alert-style dialog
export function showAlert(title, bodyHtml) {
    showConfirmDialogNonDestructive(
        title,
        bodyHtml,
        'OK',
        '',
        () => {} // No action on OK
    );
}

// Utility function to close any open dialog
export function closeDialog() {
    const dialog = document.getElementById('confirm-dialog');
    if (dialog) {
        dialog.classList.remove('visible');
        dialog.dataset.noBackdropDismiss = '';
        showLabelsOverlay();
    }
}

// Setup event listeners for dialog system
function setupDialogEventListeners() {
    // Handle escape key to close dialogs
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeDialog();
        }
    });

    // Handle click outside dialog to close (if desired)
    const dialog = document.getElementById('confirm-dialog');
    if (dialog) {
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                // Don't dismiss if noBackdropDismiss flag is set (e.g. naming dialogs with input fields)
                if (dialog.dataset.noBackdropDismiss === 'true') return;
                // Only close on background click for non-destructive dialogs
                const okBtn = document.getElementById('confirm-ok');
                if (okBtn && okBtn.classList.contains('primary')) {
                    closeDialog();
                }
            }
        });
    }
}

// Check if dialog is currently open
export function isDialogOpen() {
    const dialog = document.getElementById('confirm-dialog');
    return dialog && dialog.classList.contains('visible');
}
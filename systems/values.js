// ---- SHARED VALUES SYSTEM ----
// Values emerge from sustained policy choices. They crystallize into recognized
// beliefs that grant Identity bonuses but penalize the player for changing course.

import {
  VALUE_DEFINITIONS, VALUE_CRYSTALLIZE_TURNS,
  VALUE_IDENTITY_BASE, VALUE_IDENTITY_MAX,
  VIOLATION_PENALTY, VALUE_STRENGTH_PER_TURN
} from '../data/values.js';

let gameState = null;

export function initValues(gameStateRef) {
  gameState = gameStateRef;
}

// ---- ZONE DETECTION ----

// Given a policy axis, return which zone the current value falls in
function getCurrentZone(axis) {
  if (axis === 'rationPriority') {
    return gameState.governance.policies.rationPriority ?? 'people';
  }

  let value;
  if (axis === 'workingAge') {
    value = window.WORKING_AGE ?? 10;
  } else {
    value = gameState.governance.policies[axis] ?? 50;
  }

  // Find which zone this value falls into
  for (const [id, def] of Object.entries(VALUE_DEFINITIONS)) {
    if (def.axis !== axis) continue;

    if (def.zone === 'high' && axis !== 'rationPriority') {
      if (axis === 'workingAge') {
        if (value >= def.threshold) return 'high';
      } else {
        if (value >= def.threshold) return 'high';
      }
    } else if (def.zone === 'low' && axis !== 'rationPriority') {
      if (axis === 'workingAge') {
        if (value <= def.threshold) return 'low';
      } else {
        if (value <= def.threshold) return 'low';
      }
    } else if (def.zone === 'mid' && axis !== 'rationPriority') {
      if (axis === 'workingAge') {
        if (value >= def.thresholdLow && value <= def.thresholdHigh) return 'mid';
      } else {
        if (value >= def.thresholdLow && value <= def.thresholdHigh) return 'mid';
      }
    }
  }

  // In the gap between zones (e.g., 31-34 or 66-69) — no zone, transitional
  return null;
}

// Get the VALUE_DEFINITIONS key for an axis+zone pair
function getValueId(axis, zone) {
  if (axis === 'rationPriority') return `ration_${zone}`;
  return `${axis}_${zone}`;
}

// ---- ZONE DISTANCE ----

const ZONE_ORDER = ['low', 'mid', 'high'];

function zoneDistance(from, to) {
  if (from === to) return 0;
  const fi = ZONE_ORDER.indexOf(from);
  const ti = ZONE_ORDER.indexOf(to);
  if (fi === -1 || ti === -1) return 2; // ration priority: any change is "opposite"
  return Math.abs(fi - ti); // 1 = adjacent, 2 = opposite
}

// ---- CORE PROCESSING ----

export function processValues(report) {
  if (!gameState.valueTracking) return;

  const axes = ['freedom', 'mercy', 'tradition', 'isolation', 'workingAge', 'rationPriority'];

  for (const axis of axes) {
    const tracking = gameState.valueTracking[axis];
    if (!tracking) continue;

    const currentZone = getCurrentZone(axis);

    if (currentZone === null) {
      // In transitional gap — don't accumulate, don't reset
      continue;
    }

    if (currentZone === tracking.zone) {
      // Still in the same zone — accumulate
      tracking.turnsInZone++;
    } else {
      // Zone changed
      const previousZone = tracking.zone;

      if (previousZone !== null) {
        // Check if we're violating a recognized value
        const oldValueId = getValueId(axis, previousZone);
        const existingValue = gameState.values.find(v => v.id === oldValueId);

        if (existingValue) {
          // Violation! Apply penalties
          applyViolation(existingValue, previousZone, currentZone, report);
          // Remove the old value
          gameState.values = gameState.values.filter(v => v.id !== oldValueId);
        }
      }

      // Start tracking new zone
      tracking.zone = currentZone;
      tracking.turnsInZone = 1;
    }

    // Check for crystallization
    const valueId = getValueId(axis, currentZone);
    const alreadyRecognized = gameState.values.some(v => v.id === valueId);

    if (!alreadyRecognized && tracking.turnsInZone >= VALUE_CRYSTALLIZE_TURNS) {
      crystallizeValue(valueId, report);
    }

    // Strengthen existing values
    const activeValue = gameState.values.find(v => v.id === valueId);
    if (activeValue) {
      activeValue.turnsHeld++;
      activeValue.strength = Math.min(10, activeValue.strength + VALUE_STRENGTH_PER_TURN);
    }
  }

  // Apply passive Identity bonus from all active values
  applyValueBonuses();
}

function crystallizeValue(valueId, report) {
  const def = VALUE_DEFINITIONS[valueId];
  if (!def) return;

  const value = {
    id: valueId,
    turnsHeld: 0,
    strength: 1.0
  };

  gameState.values.push(value);

  const msg = `${def.icon} "${def.name}" has become a recognized value of our people.`;
  report.events.push(msg);

  if (window.addChronicleEntry) {
    window.addChronicleEntry(
      `The people have come to hold "${def.name}" as a shared value. ${def.description}`,
      'cultural'
    );
  }
}

function applyViolation(value, fromZone, toZone, report) {
  const def = VALUE_DEFINITIONS[value.id];
  if (!def) return;

  const dist = zoneDistance(fromZone, toZone);
  const penaltyType = dist >= 2 ? 'opposite' : 'adjacent';
  const basePenalty = VIOLATION_PENALTY[penaltyType];

  // Scale penalty with how long the value was held
  const strengthScale = Math.min(value.strength, 5) / 2; // 0.5x at strength 1, 2.5x at strength 5+
  const identityPenalty = Math.round(basePenalty.identity * strengthScale);
  const legitimacyPenalty = Math.round(basePenalty.legitimacy * strengthScale);

  gameState.cohesion.identity = Math.max(0, gameState.cohesion.identity + identityPenalty);
  gameState.cohesion.legitimacy = Math.max(0, gameState.cohesion.legitimacy + legitimacyPenalty);

  const severity = penaltyType === 'opposite' ? 'a fundamental betrayal' : 'a difficult shift';
  const msg = `${def.icon} Our value of "${def.name}" has been abandoned — ${severity} for our people. (Identity ${identityPenalty}, Legitimacy ${legitimacyPenalty})`;
  report.events.push(msg);

  if (window.addChronicleEntry) {
    window.addChronicleEntry(
      `The people's long-held value of "${def.name}" was abandoned. What was once a pillar of identity became a source of confusion and grief.`,
      'cultural'
    );
  }
}

function applyValueBonuses() {
  for (const value of gameState.values) {
    const bonus = Math.min(VALUE_IDENTITY_MAX, VALUE_IDENTITY_BASE * value.strength);
    gameState.cohesion.identity = Math.min(100, gameState.cohesion.identity + bonus);
  }
}

// ---- PUBLIC QUERIES ----

// Get all currently recognized values with their definitions
export function getRecognizedValues() {
  return gameState.values.map(v => ({
    ...v,
    def: VALUE_DEFINITIONS[v.id]
  })).filter(v => v.def);
}

// Get tracking status for all axes (for UI display of progress toward crystallization)
export function getValueTrackingStatus() {
  const status = [];
  const axes = ['freedom', 'mercy', 'tradition', 'isolation', 'workingAge', 'rationPriority'];

  for (const axis of axes) {
    const tracking = gameState.valueTracking[axis];
    if (!tracking || !tracking.zone) continue;

    const valueId = getValueId(axis, tracking.zone);
    const alreadyRecognized = gameState.values.some(v => v.id === valueId);

    if (!alreadyRecognized && tracking.turnsInZone > 0) {
      const def = VALUE_DEFINITIONS[valueId];
      if (def) {
        status.push({
          axis,
          zone: tracking.zone,
          turnsInZone: tracking.turnsInZone,
          turnsNeeded: VALUE_CRYSTALLIZE_TURNS,
          progress: tracking.turnsInZone / VALUE_CRYSTALLIZE_TURNS,
          def
        });
      }
    }
  }

  return status;
}

// ---- OVERLAY UI ----

export function openValuesOverlay() {
  renderValuesPanel();
  const overlay = document.getElementById('values-overlay');
  if (overlay) overlay.classList.add('visible');
}

export function closeValuesOverlay() {
  const overlay = document.getElementById('values-overlay');
  if (overlay) overlay.classList.remove('visible');
}

function renderValuesPanel() {
  const el = document.getElementById('values-panel-content');
  if (!el) return;

  const recognized = getRecognizedValues();
  const tracking = getValueTrackingStatus();

  let html = '';

  // Recognized values
  if (recognized.length > 0) {
    html += '<div class="vp-section-header">Recognized Values</div>';
    for (const v of recognized) {
      const strengthPips = Math.min(5, Math.round(v.strength));
      const pips = '●'.repeat(strengthPips) + '○'.repeat(5 - strengthPips);
      const axisLabel = v.def.axis === 'rationPriority' ? 'Ration Priority'
        : v.def.axis === 'workingAge' ? 'Working Age'
        : v.def.axis.charAt(0).toUpperCase() + v.def.axis.slice(1);

      html += `<div class="vp-value-card">
        <div class="vp-value-header">
          <span class="vp-value-icon">${v.def.icon}</span>
          <span class="vp-value-name">${v.def.name}</span>
          <span class="vp-value-axis">${axisLabel}</span>
          <span class="vp-value-pips">${pips}</span>
        </div>
        <div class="vp-value-desc">${v.def.description}</div>
        <div class="vp-value-edu">${v.def.educationalNote}</div>
        <div class="vp-value-meta">Held for ${v.turnsHeld} turn${v.turnsHeld !== 1 ? 's' : ''} · Strength ${v.strength.toFixed(1)}</div>
      </div>`;
    }
  } else {
    html += '<div class="vp-section-header">Recognized Values</div>';
    html += '<div class="vp-empty">No values have crystallized yet. Maintain consistent policies and your people will develop shared beliefs.</div>';
  }

  // Emerging values
  if (tracking.length > 0) {
    html += '<div class="vp-section-header" style="margin-top:16px;">Emerging Values</div>';
    for (const t of tracking) {
      const pct = Math.round(t.progress * 100);
      html += `<div class="vp-value-card emerging">
        <div class="vp-value-header">
          <span class="vp-value-icon">${t.def.icon}</span>
          <span class="vp-value-name">${t.def.name}</span>
          <span class="vp-value-progress">${t.turnsInZone} / ${t.turnsNeeded} turns</span>
        </div>
        <div class="vp-progress-bar"><div class="vp-progress-fill" style="width:${pct}%"></div></div>
        <div class="vp-value-desc">${t.def.description}</div>
      </div>`;
    }
  }

  // Educational footer
  html += `<div class="vp-footer">
    <div class="vp-footer-title">How Values Work</div>
    <div class="vp-footer-text">When a policy stays in the same range for ${VALUE_CRYSTALLIZE_TURNS} turns, it crystallizes into a shared value. Values grant a passive Identity bonus that grows over time. Changing course abandons the value — the penalty scales with how deeply held it was and how far you shifted.</div>
  </div>`;

  el.innerHTML = html;
}

export { VALUE_DEFINITIONS };

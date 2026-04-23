// Advisor System for Samhold
// Context-sensitive hint engine replacing the old tutorial system
// Evaluates hints against game state each turn, prioritizes, and surfaces non-intrusively

import { ADVISOR_HINTS } from '../data/advisorHints.js';

let gameState = null;

function initAdvisor(gs) {
  gameState = gs;
  if (!gameState.advisor) {
    gameState.advisor = {
      shownHints: {},       // hintId → turn last shown
      dismissedHints: {},   // hintId → true (one-time or manually dismissed)
      activeAdvisories: [], // current active hint IDs
      enabled: true         // master toggle
    };
  }
}

/**
 * Evaluate all advisor hints against current game state.
 * Called at end of processTurn(). Stores prioritized active list.
 */
function evaluateAdvisorHints() {
  if (!gameState || !gameState.advisor?.enabled) return;

  const turn = gameState.turn;
  const active = [];

  for (const hint of ADVISOR_HINTS) {
    // Skip dismissed one-time hints
    if (gameState.advisor.dismissedHints[hint.id]) continue;

    // Skip if on cooldown
    const lastShown = gameState.advisor.shownHints[hint.id];
    if (lastShown && hint.cooldown > 0 && (turn - lastShown) < hint.cooldown) continue;

    // Skip if one-time and already shown
    if (hint.oneTime && lastShown) continue;

    // Evaluate conditions
    let conditionsMet = true;
    if (hint.conditions) {
      for (const condition of hint.conditions) {
        if (!window.evaluateCondition(condition)) {
          conditionsMet = false;
          break;
        }
      }
    }

    if (conditionsMet) {
      active.push(hint.id);
    }
  }

  // Sort by priority (highest first), take top entries
  active.sort((a, b) => {
    const hintA = getHintById(a);
    const hintB = getHintById(b);
    return (hintB?.priority || 0) - (hintA?.priority || 0);
  });

  // Keep top 5 active
  gameState.advisor.activeAdvisories = active.slice(0, 5);

  // Mark shown
  for (const id of gameState.advisor.activeAdvisories) {
    gameState.advisor.shownHints[id] = turn;
  }
}

/**
 * Get full hint objects for currently active advisories.
 * Returns array of hint data objects.
 */
function getActiveAdvisories() {
  if (!gameState?.advisor?.enabled) return [];
  return (gameState.advisor.activeAdvisories || [])
    .map(id => getHintById(id))
    .filter(Boolean);
}

/**
 * Get top 1-3 advisories for turn summary header.
 */
function getAdvisorSummary() {
  const advisories = getActiveAdvisories();
  return advisories
    .filter(h => h.summaryLine && !h.modal)
    .slice(0, 3);
}

/**
 * Get the modal hint for this turn (if any — only turn 1 welcome).
 */
function getModalHint() {
  const advisories = getActiveAdvisories();
  return advisories.find(h => h.modal) || null;
}

/**
 * Dismiss a specific advisory. For oneTime hints, permanently.
 * For repeating hints, just removes from current active list.
 */
function dismissAdvisory(id) {
  if (!gameState?.advisor) return;
  const hint = getHintById(id);
  if (hint?.oneTime) {
    gameState.advisor.dismissedHints[id] = true;
  }
  gameState.advisor.activeAdvisories = (gameState.advisor.activeAdvisories || [])
    .filter(hId => hId !== id);
}

/**
 * Toggle advisor on/off.
 */
function setAdvisorEnabled(enabled) {
  if (gameState?.advisor) {
    gameState.advisor.enabled = enabled;
  }
}

/**
 * Check if advisor is enabled.
 */
function isAdvisorEnabled() {
  return gameState?.advisor?.enabled !== false;
}

/**
 * Reset all advisor state (for dev panel).
 */
function resetAdvisorState() {
  if (gameState?.advisor) {
    gameState.advisor.shownHints = {};
    gameState.advisor.dismissedHints = {};
    gameState.advisor.activeAdvisories = [];
  }
}

// ---- Internal helpers ----

function getHintById(id) {
  return ADVISOR_HINTS.find(h => h.id === id) || null;
}

export {
  initAdvisor,
  evaluateAdvisorHints,
  getActiveAdvisories,
  getAdvisorSummary,
  getModalHint,
  dismissAdvisory,
  setAdvisorEnabled,
  isAdvisorEnabled,
  resetAdvisorState,
  ADVISOR_HINTS
};

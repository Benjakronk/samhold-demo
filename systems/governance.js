// ---- GOVERNANCE SYSTEM ----
// Manages governance models, policy changes, and their effects on society

export function changeGovernanceModel(newModel) {
  if (newModel === window.gameState.governance.model) return;

  // Major legitimacy hit for changing governance
  window.gameState.cohesion.legitimacy = Math.max(window.gameState.cohesion.legitimacy - 25, 10);

  // Set transition timer (takes several turns to stabilize)
  window.gameState.governance.modelChangeTimer = 4;

  // Change the model
  window.gameState.governance.model = newModel;

  // Track the change
  window.gameState.governance.lastChanged.model = window.gameState.turn;
}

export function adjustPolicy(policyName, newValue) {
  const oldValue = window.gameState.governance.policies[policyName];
  window.gameState.governance.policies[policyName] = Math.max(0, Math.min(100, newValue));

  // Track policy changes
  window.gameState.governance.lastChanged.policies[policyName] = window.gameState.turn;

  // Small legitimacy cost for major policy swings
  const change = Math.abs(newValue - oldValue);
  if (change > 30) {
    window.gameState.cohesion.legitimacy = Math.max(window.gameState.cohesion.legitimacy - 3, 0);
  }

  // Update policy summary
  updatePolicySummary();
}

export function getGovernanceModel() {
  return window.GOVERNANCE_MODELS[window.gameState.governance.model];
}

export function adjustWorkingAge(delta) {
  const newAge = Math.max(6, Math.min(16, window.WORKING_AGE + delta));
  window.WORKING_AGE = newAge;

  // Update display if in governance panel
  const workingAgeDisplay = document.getElementById('working-age-value');
  if (workingAgeDisplay) {
    workingAgeDisplay.textContent = newAge;
  }

  // Update governance header if in governance panel
  const workingAgeHeader = document.getElementById('policy-header-working-age');
  if (workingAgeHeader) {
    const ageLevel = getWorkingAgeLabel(newAge);
    workingAgeHeader.textContent = `Childhood & Labor (${ageLevel})`;
  }

  // Update display if in population panel
  const popWorkingAgeDisplay = document.getElementById('pop-working-age-value');
  if (popWorkingAgeDisplay) {
    popWorkingAgeDisplay.textContent = newAge;
  }

  // Update policy summary
  updatePolicySummary();

  // Update UI and recalculate cohesion
  window.updateAllUI();
}

export function getPolicyLabel(policyName, value) {
  const labels = {
    freedom: ['Authoritarian', 'Regulated', 'Balanced', 'Liberal', 'Anarchic'],
    mercy: ['Ruthless', 'Strict', 'Fair', 'Lenient', 'Merciful'],
    tradition: ['Revolutionary', 'Modern', 'Balanced', 'Conservative', 'Ancient Ways']
  };

  if (!labels[policyName]) return 'Unknown';

  // Map 0-100 value to 5 labels (0-20, 20-40, 40-60, 60-80, 80-100)
  const index = Math.min(4, Math.floor(value / 20));
  return labels[policyName][index];
}

export function getWorkingAgeLabel(age) {
  const labels = ['Survival', 'Early Work', 'Balanced', 'Education', 'Prosperity'];
  // Map working age 6-16 to 5 labels
  const index = Math.min(4, Math.floor((age - 6) / 2));
  return labels[index];
}

export function updatePolicySummary() {
  const summaryElements = {
    freedom: document.getElementById('policy-summary-freedom'),
    mercy: document.getElementById('policy-summary-mercy'),
    tradition: document.getElementById('policy-summary-tradition'),
    workingAge: document.getElementById('policy-summary-working-age')
  };

  if (summaryElements.freedom) {
    summaryElements.freedom.textContent = getPolicyLabel('freedom', window.gameState.governance.policies.freedom);
  }
  if (summaryElements.mercy) {
    summaryElements.mercy.textContent = getPolicyLabel('mercy', window.gameState.governance.policies.mercy);
  }
  if (summaryElements.tradition) {
    summaryElements.tradition.textContent = getPolicyLabel('tradition', window.gameState.governance.policies.tradition);
  }
  if (summaryElements.workingAge) {
    const ageLabel = getWorkingAgeLabel(window.WORKING_AGE);
    summaryElements.workingAge.textContent = `${window.WORKING_AGE} (${ageLabel})`;
  }
}
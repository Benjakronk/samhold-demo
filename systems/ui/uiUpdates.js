// UI Updates System for Samhold
// Handles resource display, cohesion display, turn display, and turn summary
// Extracted from main game file for modular architecture

let gameState = null;

function initUIUpdates(gameStateRef) {
  gameState = gameStateRef;
}

function updateAllUI() {
  const inc = window.calculateIncome();

  const isWinter = window.SEASONS[gameState.season] === 'Winter';
  const winterCost = isWinter ? Math.ceil(gameState.population.total * 0.5) : 0;
  const effectiveNetFood = inc.netFood - winterCost;

  document.getElementById('res-food').textContent = gameState.resources.food;
  document.getElementById('res-materials').textContent = gameState.resources.materials;
  document.getElementById('res-pop').textContent = gameState.population.total + window.getTotalChildren();
  document.getElementById('res-knowledge').textContent = Math.floor(gameState.resources.knowledge);

  const df = document.getElementById('delta-food');
  df.textContent = effectiveNetFood >= 0 ? `+${effectiveNetFood}` : `${effectiveNetFood}`;
  df.className = `delta ${effectiveNetFood > 0 ? 'delta-pos' : effectiveNetFood < 0 ? 'delta-neg' : 'delta-zero'}`;
  const dm = document.getElementById('delta-materials');
  dm.textContent = inc.netMat >= 0 ? `+${inc.netMat}` : `${inc.netMat}`;
  dm.className = `delta ${inc.netMat > 0 ? 'delta-pos' : inc.netMat < 0 ? 'delta-neg' : 'delta-zero'}`;

  const storytellers = gameState.culture?.storytellers ?? 0;
  gameState.population.employed = inc.laborUsed + storytellers;
  gameState.population.idle = Math.max(0, gameState.population.total - inc.laborUsed - storytellers);
  const idleWarn = gameState.population.idle > 5 ? ' \u26A0\uFE0F' : '';
  document.getElementById('pop-display').textContent = `\u{1F465} ${gameState.population.total} adults \u00B7 \u{1F476} ${window.getTotalChildren()} children`;

  const idleColor = gameState.population.idle > 5 ? '#ccaa44' : 'var(--text-light)';
  const winterRow = isWinter
    ? `<div class="hex-info-row"><span class="label">\u2744\uFE0F Winter penalty</span><span class="value" style="color:#6699cc">\u2212${winterCost}</span></div>`
    : '';
  const nextIsWinter = window.SEASONS[(gameState.season + 1) % 4] === 'Winter';
  const winterWarning = nextIsWinter
    ? `<div class="hex-info-row"><span class="label">\u26A0\uFE0F Winter next</span><span class="value" style="color:#6699cc">\u2212${Math.ceil(gameState.population.total * 0.5)} food</span></div>`
    : '';
  const constructionRow = inc.constructionWorkers > 0
    ? `<div class="hex-info-row"><span class="label">\u{1F528} Builder rations (\u00D72)</span><span class="value" style="color:#cc8844">\u2212${inc.constructionWorkers * window.FOOD_PER_POP} extra</span></div>`
    : '';
  const trainingRow = inc.unitsInTraining > 0
    ? `<div class="hex-info-row"><span class="label">\u2694\uFE0F Training rations (\u00D72)</span><span class="value" style="color:#cc8844">\u2212${inc.unitsInTraining * window.FOOD_PER_POP} extra</span></div>`
    : '';
  const totalChildren = window.getTotalChildren();

  const nextGraduation = gameState.childCohorts
    .filter(c => c.age < window.WORKING_AGE)
    .sort((a, b) => b.age - a.age)[0];
  const graduationInfo = nextGraduation
    ? `<div class="hex-info-row"><span class="label">\u23F3 Next workers in</span><span class="value">${window.WORKING_AGE - nextGraduation.age} years (${nextGraduation.count})</span></div>`
    : '';

  const unitPopulation = gameState.units.reduce((total, unit) => {
    return total + window.UNIT_TYPES[unit.type].cost.population;
  }, 0);
  const buildingWorkers = inc.laborUsed - unitPopulation;

  document.getElementById('labor-content').innerHTML = `
    <div class="hex-info-row"><span class="label">\u{1F465} Adults</span><span class="value">${gameState.population.total}</span></div>
    <div class="hex-info-row"><span class="label">\u{1F476} Children</span><span class="value">${totalChildren}</span></div>
    ${graduationInfo}
    <div class="hex-info-row"><span class="label">Workers assigned</span><span class="value">${gameState.population.employed}</span></div>
    <div class="hex-info-row" style="margin-left:16px;"><span class="label">\u2022 Stationary</span><span class="value">${buildingWorkers}</span></div>
    <div class="hex-info-row" style="margin-left:16px;"><span class="label">\u2022 Units</span><span class="value">${unitPopulation}</span></div>
    <div class="hex-info-row"><span class="label">Idle</span><span class="value" style="color:${idleColor}">${gameState.population.idle}${idleWarn}</span></div>
    <div class="hex-info-row"><span class="label">Food per turn</span><span class="value" style="color:${inc.netFood >= 0 ? '#6cb66c' : '#cc6666'}">${inc.netFood >= 0 ? '+' : ''}${inc.netFood}</span></div>
    ${constructionRow}
    ${trainingRow}
    <div class="hex-info-row" style="padding-top:8px;">
      <button class="detail-btn" onclick="openPopulationDetails()">\u{1F4CA} Population Details</button>
    </div>
    ${winterRow}
    ${winterWarning}
    <div class="hex-info-row"><span class="label">Materials per turn</span><span class="value" style="color:${inc.netMat >= 0 ? '#6cb66c' : '#cc6666'}">${inc.netMat >= 0 ? '+' : ''}${inc.netMat}</span></div>
    <button class="manage-workers-btn" onclick="openWorkforceOverlay()">\u{1F465} Manage Workers</button>
  `;

  updateCohesionDisplay();
  updateValuesDisplay();
  window.updatePolicySummary();
}

function updateCohesionDisplay() {
  const c = gameState.cohesion;
  const total = c.total;
  const sum = c.identity + c.legitimacy + c.satisfaction + c.bonds;
  const status = window.getCohesionStatus();

  if (sum > 0) {
    document.getElementById('seg-identity').style.width = (c.identity/sum*100)+'%';
    document.getElementById('seg-legitimacy').style.width = (c.legitimacy/sum*100)+'%';
    document.getElementById('seg-satisfaction').style.width = (c.satisfaction/sum*100)+'%';
    document.getElementById('seg-bonds').style.width = (c.bonds/sum*100)+'%';
  }

  const cohesionValueEl = document.getElementById('cohesion-value');
  cohesionValueEl.textContent = total;
  cohesionValueEl.style.color = status.color;

  // Compute projected next-turn deltas
  const projected = window.previewCohesionDeltas ? window.previewCohesionDeltas() : c.lastUpdate;
  const fmt = (d) => d !== 0 ? ` (${d > 0 ? '+' : ''}${Math.round(d)})` : '';

  const container = document.getElementById('cohesion-bar-container');
  container.title = `Cohesion: ${status.status} (${total}%)\nIdentity: ${c.identity}${fmt(projected.identity)}\nLegitimacy: ${c.legitimacy}${fmt(projected.legitimacy)}\nSatisfaction: ${c.satisfaction}${fmt(projected.satisfaction)}\nBonds: ${c.bonds}${fmt(projected.bonds)}`;

  for (const p of ['identity','legitimacy','satisfaction','bonds']) {
    const barEl = document.getElementById(`bar-${p}`);
    const valEl = document.getElementById(`val-${p}`);
    if (barEl && valEl) {
      barEl.style.width = c[p]+'%';
      valEl.textContent = c[p];

      const change = projected[p];
      if (change !== 0) {
        valEl.textContent += ` (${change > 0 ? '+' : ''}${Math.round(change)})`;
        valEl.style.fontWeight = '700';
      } else {
        valEl.style.fontWeight = '400';
      }
    }
  }
}

function updateValuesDisplay() {
  const el = document.getElementById('values-display');
  if (!el) return;

  const recognized = window.getRecognizedValues ? window.getRecognizedValues() : [];
  const tracking = window.getValueTrackingStatus ? window.getValueTrackingStatus() : [];

  if (recognized.length === 0 && tracking.length === 0) {
    el.innerHTML = '';
    return;
  }

  let html = '<div class="values-container">';
  html += '<div class="values-header">Shared Values</div>';

  for (const v of recognized) {
    const strengthPips = Math.min(5, Math.round(v.strength));
    const pips = '●'.repeat(strengthPips) + '○'.repeat(5 - strengthPips);
    html += `<div class="value-item recognized" title="${v.def.description}">
      <span class="value-icon">${v.def.icon}</span>
      <span class="value-name">${v.def.name}</span>
      <span class="value-strength">${pips}</span>
    </div>`;
  }

  for (const t of tracking) {
    const pct = Math.round(t.progress * 100);
    html += `<div class="value-item emerging" title="${t.def.description} (${t.turnsInZone}/${t.turnsNeeded} turns)">
      <span class="value-icon" style="opacity:0.5">${t.def.icon}</span>
      <span class="value-name" style="opacity:0.6">${t.def.name}</span>
      <div class="value-progress-bar"><div class="value-progress-fill" style="width:${pct}%"></div></div>
    </div>`;
  }

  html += '</div>';
  el.innerHTML = html;
}

function updateTurnDisplay() {
  document.getElementById('turn-display').textContent = `Year ${gameState.year} \u2014 ${window.SEASONS[gameState.season]}`;
}

function showTurnSummary(report, seasonName, year) {
  const el = document.getElementById('turn-summary');
  document.getElementById('summary-title').textContent = `End of ${seasonName}, Year ${year}`;

  let html = `
    <div class="summary-row"><span class="s-label">\u{1F33E} Food harvested</span><span class="s-val delta-pos">+${report.foodIncome}</span></div>
    <div class="summary-row"><span class="s-label">\u{1F37D}\uFE0F Food consumed</span><span class="s-val delta-neg">-${report.foodConsumed}</span></div>
    <div class="summary-row"><span class="s-label">\u{1FAB5} Materials gathered</span><span class="s-val delta-pos">+${report.matIncome}</span></div>
    ${report.matUpkeep ? `<div class="summary-row"><span class="s-label">🪵 Materials consumed</span><span class="s-val delta-neg">-${report.matUpkeep}</span></div>` : ''}
    <hr class="summary-divider">
    <div class="summary-row"><span class="s-label">\u{1F4E6} Food stockpile</span><span class="s-val">${gameState.resources.food}</span></div>
    <div class="summary-row"><span class="s-label">\u{1F4E6} Materials stockpile</span><span class="s-val">${gameState.resources.materials}</span></div>
    <div class="summary-row"><span class="s-label">\u{1F465} Adults</span><span class="s-val">${gameState.population.total}${(() => { const d = (report.graduated||0) - (report.adultDeaths||0); return d > 0 ? ' <span class="delta-pos">(+' + d + ')</span>' : d < 0 ? ' <span class="delta-neg">(' + d + ')</span>' : ''; })()}</span></div>
    <div class="summary-row"><span class="s-label">\u{1F476} Children</span><span class="s-val">${window.getTotalChildren()}${(() => { const d = (report.childBirths||0) - (report.childDeaths||0) - (report.graduated||0); return d > 0 ? ' <span class="delta-pos">(+' + d + ')</span>' : d < 0 ? ' <span class="delta-neg">(' + d + ')</span>' : ''; })()}</span></div>
  `;

  const allEvents = [...report.events];
  if (gameState.eventOutcomesForNextSummary && gameState.eventOutcomesForNextSummary.length > 0) {
    gameState.eventOutcomesForNextSummary.forEach(outcome => {
      const feedbackText = outcome.feedback.length > 0 ?
        outcome.feedback.join(', ') :
        'Your choice shaped how your people see you';
      allEvents.push(`\u{1F4DC} ${outcome.title}: ${outcome.choice} (${feedbackText})`);
    });
    gameState.eventOutcomesForNextSummary = [];
  }

  if (allEvents.length > 0) {
    html += `<hr class="summary-divider"><div class="summary-chronicle">${allEvents.join('<br>')}</div>`;
  }

  document.getElementById('summary-content').innerHTML = html;
  el.classList.add('visible');
}

export {
  initUIUpdates,
  updateAllUI,
  updateCohesionDisplay,
  updateValuesDisplay,
  updateTurnDisplay,
  showTurnSummary
};

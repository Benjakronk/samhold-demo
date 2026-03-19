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
  const elderCount = gameState.population.elders || 0;
  const elderSuffix = elderCount > 0 ? ` \u00B7 \u{1F9D3} ${elderCount} elders` : '';
  document.getElementById('pop-display').textContent = `\u{1F465} ${gameState.population.total} adults${elderSuffix} \u00B7 \u{1F476} ${window.getTotalChildren()} children`;

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

  const sexCounts = window.getAdultSexCounts ? window.getAdultSexCounts() : null;
  const sexSuffix = sexCounts ? ` <span style="color:#6ca0d4;font-size:11px">${sexCounts.male}\u2642</span><span style="color:#d47ca0;font-size:11px">${sexCounts.female}\u2640</span>` : '';
  const nursingCount = window.getTotalNursing ? window.getTotalNursing() : 0;
  const nursingRow = nursingCount > 0 ? `<div class="hex-info-row"><span class="label">\u{1F931} Nursing</span><span class="value">${nursingCount} (50% labor)</span></div>` : '';

  document.getElementById('labor-content').innerHTML = `
    <div class="hex-info-row"><span class="label">\u{1F465} Adults</span><span class="value">${gameState.population.total}${elderCount > 0 ? ` (${elderCount} elders)` : ''} ${sexSuffix}</span></div>
    <div class="hex-info-row"><span class="label">\u{1F476} Children</span><span class="value">${totalChildren}</span></div>
    ${nursingRow}
    ${graduationInfo}
    <div class="hex-info-row"><span class="label">Workers assigned</span><span class="value">${gameState.population.employed}</span></div>
    <div class="hex-info-row" style="margin-left:16px;"><span class="label">\u2022 Stationary</span><span class="value">${buildingWorkers}</span></div>
    <div class="hex-info-row" style="margin-left:16px;"><span class="label">\u2022 Units</span><span class="value">${unitPopulation}</span></div>
    <div class="hex-info-row"><span class="label">Idle</span><span class="value" style="color:${idleColor}">${gameState.population.idle}${idleWarn}</span></div>
    <div class="hex-info-row"><span class="label">Food per turn</span><span class="value" style="color:${inc.netFood >= 0 ? '#6cb66c' : '#cc6666'}">${inc.netFood >= 0 ? '+' : ''}${inc.netFood}</span></div>
    ${constructionRow}
    ${trainingRow}
    ${inc.nursingProductionPenalty > 0 ? `<div class="hex-info-row"><span class="label">\u{1F931} Nursing penalty</span><span class="value" style="color:#cc8844">\u2212${inc.nursingProductionPenalty}% output</span></div>` : ''}
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
  const total = Math.round(c.total);
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

  // Show 1 decimal for sub-integer changes; suppress if negligible (< 0.05)
  const fmtDelta = d => {
    if (Math.abs(d) < 0.05) return '';
    const sign = d > 0 ? '+' : '-';
    const abs = Math.abs(d);
    const str = abs % 1 < 0.05 ? Math.round(abs).toString() : (Math.round(abs * 10) / 10).toFixed(1);
    return ` (${sign}${str})`;
  };
  const disp = p => Math.round(c[p]);

  const container = document.getElementById('cohesion-bar-container');
  container.title = `Cohesion: ${status.status} (${total}%)\nIdentity: ${disp('identity')}${fmtDelta(projected.identity)}\nLegitimacy: ${disp('legitimacy')}${fmtDelta(projected.legitimacy)}\nSatisfaction: ${disp('satisfaction')}${fmtDelta(projected.satisfaction)}\nBonds: ${disp('bonds')}${fmtDelta(projected.bonds)}`;

  for (const p of ['identity','legitimacy','satisfaction','bonds']) {
    const barEl = document.getElementById(`bar-${p}`);
    const valEl = document.getElementById(`val-${p}`);
    if (barEl && valEl) {
      barEl.style.width = c[p]+'%';
      valEl.textContent = disp(p);

      const deltaStr = fmtDelta(projected[p]);
      if (deltaStr) {
        valEl.textContent += deltaStr;
        valEl.style.fontWeight = '700';
      } else {
        valEl.style.fontWeight = '400';
      }
    }
  }

  updateTrustClimate();
}

function updateTrustClimate() {
  const el = document.getElementById('trust-climate');
  if (!el) return;
  const t = window.getTrustState ? window.getTrustState() : null;
  if (!t) { el.innerHTML = ''; return; }

  const instLine = _instClimateText(t.institutional);
  const interLine = _interClimateText(t.interpersonal);
  const limitNote = (t.rateLimiter < 0.75)
    ? { text: 'Social wounds are slowing cultural growth.', cls: 'warning' }
    : null;

  let html = '<div class="trust-climate-box">';
  html += '<div class="trust-climate-label">Social Climate</div>';
  html += `<div class="trust-climate-line ${instLine.cls}">🏛️ ${instLine.text}</div>`;
  html += `<div class="trust-climate-line ${interLine.cls}">🫂 ${interLine.text}</div>`;
  if (limitNote) {
    html += `<div class="trust-climate-line ${limitNote.cls}" style="margin-top:3px;font-style:italic">${limitNote.text}</div>`;
  }

  // Resistance warning
  const resistance = window.getResistanceState ? window.getResistanceState() : null;
  if (resistance && resistance.pressure >= 25) {
    const rLine = _resistanceClimateText(resistance);
    html += `<div class="trust-climate-line ${rLine.cls}" style="margin-top:3px">✊ ${rLine.text}</div>`;
  }

  // Crime warning
  const crimeClimate = window.getCrimeClimateText ? window.getCrimeClimateText() : null;
  if (crimeClimate) {
    html += `<div class="trust-climate-line ${crimeClimate.cls}" style="margin-top:3px">⚖️ ${crimeClimate.text}</div>`;
  }

  // Immigration warning
  const immClimate = window.getImmigrationClimateText ? window.getImmigrationClimateText() : null;
  if (immClimate) {
    html += `<div class="trust-climate-line ${immClimate.cls}" style="margin-top:3px">🚶 ${immClimate.text}</div>`;
  }

  // Class system warning
  const classState = window.getClassSystemState ? window.getClassSystemState() : null;
  if (classState?.active) {
    const totalDiff = classState.differentials.economic + classState.differentials.legal + classState.differentials.political + classState.differentials.social;
    if (totalDiff >= 6) {
      html += `<div class="trust-climate-line danger" style="margin-top:3px">⚖️ Extreme inequality strains all social bonds.</div>`;
    } else if (totalDiff >= 3) {
      html += `<div class="trust-climate-line warning" style="margin-top:3px">⚖️ Class divisions generate resentment among commons.</div>`;
    } else if (totalDiff > 0) {
      html += `<div class="trust-climate-line" style="margin-top:3px">⚖️ Formal stratification is in effect.</div>`;
    }
  }

  html += '</div>';

  el.innerHTML = html;
}

function _instClimateText(v) {
  if (v >= 0.75) return { text: 'Your authority is trusted and respected.', cls: 'good' };
  if (v >= 0.55) return { text: 'Most accept the decisions made in their name.', cls: '' };
  if (v >= 0.35) return { text: 'Doubts about leadership are quietly spreading.', cls: 'warning' };
  return { text: 'Many openly question the right of anyone to rule.', cls: 'danger' };
}

function _interClimateText(v) {
  if (v >= 0.75) return { text: 'Neighbors help one another without being asked.', cls: 'good' };
  if (v >= 0.50) return { text: 'People cooperate, though not without wariness.', cls: '' };
  if (v >= 0.30) return { text: 'Social tensions make cooperation difficult.', cls: 'warning' };
  return { text: 'The community has turned inward — strangers are feared.', cls: 'danger' };
}

function _resistanceClimateText(r) {
  if (r.pressure >= 95) return { text: 'Open revolt threatens to destroy everything.', cls: 'danger' };
  if (r.pressure >= 80) return { text: `"${r.faction.name}" grows hostile — people speak of leaving.`, cls: 'danger' };
  if (r.pressure >= 60) return { text: `Organized resistance is disrupting governance.`, cls: 'warning' };
  if (r.pressure >= 40) return { text: `"${r.faction.name}" speaks for the discontented.`, cls: 'warning' };
  return { text: 'Murmurs of discontent can be heard among the people.', cls: '' };
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
    <div class="summary-row"><span class="s-label">\u{1F465} Adults</span><span class="s-val">${gameState.population.total}${(() => { const d = (report.graduated||0) - (report.adultDeaths||0) - (report.elderDeaths||0); return d > 0 ? ' <span class="delta-pos">(+' + d + ')</span>' : d < 0 ? ' <span class="delta-neg">(' + d + ')</span>' : ''; })()}</span></div>
    ${(gameState.population.elders || 0) > 0 ? `<div class="summary-row"><span class="s-label">\u{1F9D3} Elders</span><span class="s-val">${gameState.population.elders}${report.elderDeaths ? ' <span class="delta-neg">(-' + report.elderDeaths + ' passed)</span>' : ''}</span></div>` : ''}
    <div class="summary-row"><span class="s-label">\u{1F476} Children</span><span class="s-val">${window.getTotalChildren()}${(() => { const d = (report.childBirths||0) - (report.childDeaths||0) - (report.graduated||0); return d > 0 ? ' <span class="delta-pos">(+' + d + ')</span>' : d < 0 ? ' <span class="delta-neg">(' + d + ')</span>' : ''; })()}</span></div>
    ${report.nursingCount > 0 ? `<div class="summary-row"><span class="s-label">\u{1F931} Nursing mothers</span><span class="s-val">${report.nursingCount} <span style="color:var(--text-dim)">(50% labor)</span></span></div>` : ''}
  `;

  // Immigration summary row
  const immState = window.getImmigrationState ? window.getImmigrationState() : null;
  if (immState && (immState.lastArrivals > 0 || immState.pipelineTotal > 0)) {
    const arrivalText = immState.lastArrivals > 0 ? `<span class="delta-pos">+${immState.lastArrivals} arrived</span>` : '';
    html += `<div class="summary-row"><span class="s-label">\u{1F6B6} Immigrants in pipeline</span><span class="s-val">${immState.pipelineTotal} ${arrivalText}</span></div>`;
    if (immState.parallelSociety.population > 0) {
      html += `<div class="summary-row"><span class="s-label">\u{1F3D8}\uFE0F Parallel society</span><span class="s-val" style="color:#cc6644">${immState.parallelSociety.population} (${Math.round(immState.parallelSociety.strength * 100)}%)</span></div>`;
    }
  }

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

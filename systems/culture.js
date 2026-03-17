// ---- CULTURE SYSTEM ----
// Manages traditions, rituals, and cultural practices.
// Traditions fire at intervals, cost resources, and provide cohesion bonuses.
// Once established, traditions become costly to abandon — teaching that
// cultural practices serve structural functions beyond their surface meaning.

import { TRADITIONS } from '../data/traditions.js';

let gameState = null;

export function initCulture(gameStateRef) {
  gameState = gameStateRef;

  // Set up event listeners for traditions panel buttons
  const closeBtn = document.getElementById('traditions-close');
  if (closeBtn) closeBtn.addEventListener('click', closeTraditions);

  document.querySelectorAll('.traditions-tab').forEach(t => {
    t.addEventListener('click', () => switchTraditionsTab(t.dataset.tab));
  });

  console.log('🎭 Culture system initialized');
}

// ---- TRADITION MANAGEMENT ----

// Returns the player's custom name for a tradition, or falls back to the template name.
function traditionDisplayName(tradition) {
  return tradition.customName || TRADITIONS[tradition.id]?.name || tradition.id;
}

// Returns the effective season for a tradition instance.
// customSeason=undefined → use template default; null → any season; string → specific season.
function traditionEffectiveSeason(tradition, template) {
  return tradition.customSeason !== undefined ? tradition.customSeason : template.season;
}

// Returns the effective interval (in turns) for a tradition instance.
// customInterval=undefined → use template default.
function traditionEffectiveInterval(tradition, template) {
  return tradition.customInterval !== undefined ? tradition.customInterval : template.interval;
}

// Builds a human-readable schedule string. 4 turns = 1 year.
function formatScheduleString(tradition, template) {
  if (template.triggerOn === 'graduation') return 'On coming-of-age';
  if (template.triggerOn) return `On ${template.triggerOn}`;

  const effectiveSeason = traditionEffectiveSeason(tradition, template);
  const turns = traditionEffectiveInterval(tradition, template);
  const years = turns / 4;
  const yearStr = years === 1 ? 'every year' : `every ${years} years`;

  return effectiveSeason ? `${yearStr} (${effectiveSeason})` : yearStr;
}

export function establishTradition(traditionId, customName, customSeason, customInterval) {
  const template = TRADITIONS[traditionId];
  if (!template) return false;

  // Check not already active
  if (gameState.traditions.some(t => t.id === traditionId)) return false;

  const tradition = {
    id: traditionId,
    established: gameState.turn,
    timesPerformed: 0,
    lastPerformed: 0,
    customName: customName || null,
    customSeason: customSeason !== undefined ? customSeason : undefined,
    customInterval: customInterval !== undefined ? customInterval : undefined
  };

  gameState.traditions.push(tradition);

  // Small initial Identity boost for establishing a tradition
  gameState.cohesion.identity = Math.min(100, gameState.cohesion.identity + 2);

  // Chronicle entry
  const displayName = traditionDisplayName(tradition);
  if (window.addChronicleEntry) {
    window.addChronicleEntry(
      `The people established a new tradition: ${displayName}. ${template.description}`,
      'cultural'
    );
  }

  if (window.updateAllUI) window.updateAllUI();
  return true;
}

export function removeTradition(traditionId) {
  const index = gameState.traditions.findIndex(t => t.id === traditionId);
  if (index === -1) return false;

  const tradition = gameState.traditions[index];
  const template = TRADITIONS[traditionId];
  const penalty = getTraditionRemovalPenalty(tradition);

  // Apply penalties
  gameState.cohesion.identity = Math.max(0, gameState.cohesion.identity - penalty.identity);
  gameState.cohesion.legitimacy = Math.max(0, gameState.cohesion.legitimacy - penalty.legitimacy);

  // Remove
  gameState.traditions.splice(index, 1);

  // Chronicle entry
  const displayName = traditionDisplayName(tradition);
  if (window.addChronicleEntry) {
    window.addChronicleEntry(
      `The tradition of ${displayName} was abandoned after being observed ${tradition.timesPerformed} times. ` +
      `Some feel a piece of the community's identity was lost.`,
      'cultural'
    );
  }

  if (window.updateAllUI) window.updateAllUI();
  return true;
}

// Returns the Tradition policy multiplier for cohesion bonuses when a tradition fires.
// High Tradition (100): up to 1.5× for well-established traditions.
// High Innovation (0): 0.6× — traditions give less but are easier to abandon.
// Balanced (50): 1.0×.
function getTraditionBonusMultiplier(tradition) {
  const traditionPolicy = (gameState.governance?.policies?.tradition ?? 50);
  const baseMultiplier = 0.6 + 0.4 * (traditionPolicy / 100); // 0.6 at 0, 1.0 at 100

  // High Tradition also rewards longevity: +2% per timesPerformed, capped at +50%
  const longevityBonus = (traditionPolicy >= 60)
    ? Math.min(0.5, tradition.timesPerformed * 0.02)
    : 0;

  return baseMultiplier + longevityBonus;
}

export function getTraditionRemovalPenalty(tradition) {
  // Policy modifier: High Tradition = harsher penalties; High Innovation = softer
  const traditionPolicy = (gameState.governance?.policies?.tradition ?? 50);
  const penaltyMultiplier = 0.5 + (traditionPolicy / 100); // 0.5 at Innovation, 1.0 at balanced, 1.5 at Tradition

  // Identity penalty: -3 per time performed, capped at -20, scaled by policy
  const identityPenalty = Math.round(Math.min(20, tradition.timesPerformed * 3) * penaltyMultiplier);
  // Legitimacy penalty: -5 base, +1 per time performed, capped at -15, scaled by policy
  const legitimacyPenalty = Math.round(Math.min(15, 5 + tradition.timesPerformed) * penaltyMultiplier);

  return { identity: identityPenalty, legitimacy: legitimacyPenalty };
}

// Returns projected cohesion deltas from traditions that will fire next turn.
// Mirrors the logic in processTraditions/fireTradition without side effects.
export function projectTraditionDeltas() {
  const deltas = { identity: 0, legitimacy: 0, satisfaction: 0, bonds: 0 };
  if (!gameState.traditions.length) return deltas;

  const inc = window.calculateIncome ? window.calculateIncome() : { netFood: 0, netMat: 0 };
  let foodLeft = Math.max(0, gameState.resources.food + inc.netFood);
  let matLeft  = Math.max(0, gameState.resources.materials + inc.netMat);

  for (const tradition of gameState.traditions) {
    const template = TRADITIONS[tradition.id];
    if (!template || template.triggerOn) continue;
    if (!isTraditionDue(tradition, template)) continue;

    const foodCost = getScaledTraditionCost(template.cost.food || 0);
    const matCost  = getScaledTraditionCost(template.cost.materials || 0);

    if (foodLeft >= foodCost && matLeft >= matCost) {
      foodLeft -= foodCost;
      matLeft  -= matCost;
      const mult = getTraditionBonusMultiplier(tradition);
      for (const [pillar, amount] of Object.entries(template.effects)) {
        if (amount && deltas[pillar] !== undefined) {
          deltas[pillar] += Math.round(amount * mult * 10) / 10;
        }
      }
    } else {
      // Tradition will be missed — apply the skip penalty
      deltas.bonds    -= 2;
      deltas.identity -= 1;
    }
  }

  return deltas;
}

// ---- TRADITION PROCESSING (called each turn) ----

export function processTraditions(report) {
  for (const tradition of gameState.traditions) {
    const template = TRADITIONS[tradition.id];
    if (!template) continue;

    // Apply drift to all interval-based traditions (not event-triggered)
    if (!template.triggerOn) {
      processTraditionDrift(tradition, template, report);
    }

    // Skip event-triggered traditions (they fire from processTraditionTrigger)
    if (template.triggerOn) continue;

    // Check if this tradition is due to fire
    if (!isTraditionDue(tradition, template)) continue;

    fireTradition(tradition, template, report);
  }
}

// Tradition drift: well-established traditions gradually erode Legitimacy as
// younger generations experience them as obligation rather than meaning.
// Worsened by Innovation policy; suppressed at full Tradition policy.
function processTraditionDrift(tradition, template, report) {
  // Drift only sets in after 5+ observances and 20+ turns since establishment
  if (tradition.timesPerformed < 5) return;
  if (gameState.turn - tradition.established < 20) return;

  const traditionPolicy = (gameState.governance && gameState.governance.policies)
    ? (gameState.governance.policies.tradition ?? 50)
    : 50;

  // At tradition=100 (Ancient Ways): no drift. At tradition=0 (Revolutionary): 2× drift.
  const driftMultiplier = 2 * (1 - traditionPolicy / 100);
  if (driftMultiplier <= 0) return;

  const baseDrift = 0.2; // Legitimacy lost per turn per drifting tradition
  const driftAmount = baseDrift * driftMultiplier;

  // Accumulate fractional drift; only apply once a whole point accumulates
  tradition.driftAccumulator = (tradition.driftAccumulator || 0) + driftAmount;
  if (tradition.driftAccumulator >= 1) {
    const loss = Math.floor(tradition.driftAccumulator);
    tradition.driftAccumulator -= loss;
    gameState.cohesion.legitimacy = Math.max(0, gameState.cohesion.legitimacy - loss);
    report.events.push(`⏳ ${traditionDisplayName(tradition)} feels like obligation to some — Legitimacy −${loss}.`);
  }
}

function isTraditionDue(tradition, template) {
  if (template.interval <= 0) return false;

  // Use player's custom season if set, otherwise template default
  const effectiveSeason = traditionEffectiveSeason(tradition, template);
  if (effectiveSeason) {
    const currentSeason = window.SEASONS[gameState.season];
    if (currentSeason !== effectiveSeason) return false;
  }

  // Check interval: has enough time passed since last performance?
  const turnsSince = gameState.turn - tradition.lastPerformed;
  return turnsSince >= traditionEffectiveInterval(tradition, template);
}

// Scale tradition cost by population. Reference population = 20 (starting conditions).
// Costs never go below the template base, and scale linearly above it.
export function getScaledTraditionCost(baseCost) {
  if (!baseCost) return 0;
  const pop = gameState.population.total || 20;
  return Math.max(baseCost, Math.round(baseCost * pop / 20));
}

function fireTradition(tradition, template, report) {
  const displayName = traditionDisplayName(tradition);
  const foodCost = getScaledTraditionCost(template.cost.food || 0);
  const matCost = getScaledTraditionCost(template.cost.materials || 0);

  // Check if we can afford it
  const canAffordFood = gameState.resources.food >= foodCost;
  const canAffordMat = gameState.resources.materials >= matCost;

  if (!canAffordFood || !canAffordMat) {
    // Can't afford — tradition is skipped
    report.events.push(`${template.icon} ${displayName} could not be held — insufficient resources.`);

    // Missing a tradition hurts cohesion
    gameState.cohesion.bonds = Math.max(0, gameState.cohesion.bonds - 2);
    gameState.cohesion.identity = Math.max(0, gameState.cohesion.identity - 1);

    if (window.addChronicleEntry) {
      window.addChronicleEntry(
        `${displayName} could not be observed this season due to scarce resources. The people felt the absence keenly.`,
        'cultural'
      );
    }
    return;
  }

  // Pay costs
  gameState.resources.food -= foodCost;
  gameState.resources.materials -= matCost;

  // Apply cohesion effects (scaled by Tradition/Innovation policy)
  const bonusMultiplier = getTraditionBonusMultiplier(tradition);
  for (const [pillar, amount] of Object.entries(template.effects)) {
    if (amount && gameState.cohesion[pillar] !== undefined) {
      const scaledAmount = Math.round(amount * bonusMultiplier * 10) / 10; // keep one decimal
      gameState.cohesion[pillar] = Math.min(100, gameState.cohesion[pillar] + scaledAmount);
    }
  }

  // Update tradition tracking
  tradition.timesPerformed++;
  tradition.lastPerformed = gameState.turn;

  // Report (show actual scaled values)
  const effectStr = Object.entries(template.effects)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => {
      const scaled = Math.round(v * bonusMultiplier * 10) / 10;
      return `${k} +${scaled}`;
    })
    .join(', ');
  report.events.push(`${template.icon} ${displayName} was observed! (${effectStr})`);

  // Chronicle entry
  if (window.addChronicleEntry) {
    const ordinal = tradition.timesPerformed === 1 ? 'first' :
                    tradition.timesPerformed === 2 ? 'second' :
                    tradition.timesPerformed === 3 ? 'third' :
                    `${tradition.timesPerformed}th`;
    window.addChronicleEntry(
      `${displayName} was observed for the ${ordinal} time. The community gathered and their bonds grew stronger.`,
      'cultural'
    );
  }
}

// Fire event-triggered traditions (e.g., Coming-of-Age on graduation)
export function processTraditionTrigger(triggerType, report) {
  for (const tradition of gameState.traditions) {
    const template = TRADITIONS[tradition.id];
    if (!template || template.triggerOn !== triggerType) continue;

    fireTradition(tradition, template, report);
  }
}

// ---- UNLOCK CONDITIONS ----

export function getAvailableTraditions() {
  const available = [];
  for (const [id, template] of Object.entries(TRADITIONS)) {
    if (template.starter) continue; // starter is auto-established
    if (gameState.traditions.some(t => t.id === id)) continue; // already active
    if (checkUnlockCondition(template.unlockCondition)) {
      available.push({ id, ...template });
    }
  }
  return available;
}

export function getActiveTraditions() {
  return gameState.traditions.map(t => ({
    ...t,
    template: TRADITIONS[t.id]
  }));
}

function checkUnlockCondition(condition) {
  if (!condition) return true;

  switch (condition) {
    case 'farms_2': {
      let farmCount = 0;
      for (let r = 0; r < window.MAP_ROWS; r++) {
        for (let c = 0; c < window.MAP_COLS; c++) {
          const hex = gameState.map[r][c];
          if (hex.building === 'farm' && hex.buildProgress <= 0) farmCount++;
        }
      }
      return farmCount >= 2;
    }
    case 'working_age_12':
      return window.WORKING_AGE >= 12;
    case 'deaths_occurred':
      return gameState.culture.deathsOccurred || false;
    case 'year_3':
      return gameState.year >= 3;
    case 'near_river': {
      // Check if any settlement hex has a river
      return gameState.settlements.some(s => {
        const hex = gameState.map[s.row]?.[s.col];
        return hex && hex.hasRiver;
      });
    }
    default:
      return false;
  }
}

// Establish starter traditions at game start
export function establishStarterTraditions() {
  for (const [id, template] of Object.entries(TRADITIONS)) {
    if (template.starter) {
      const tradition = {
        id: id,
        established: gameState.turn,
        timesPerformed: 0,
        lastPerformed: 0
      };
      gameState.traditions.push(tradition);

      if (window.addChronicleEntry) {
        window.addChronicleEntry(
          `From the earliest days, the people held ${template.name} — ${template.description}`,
          'founding'
        );
      }
    }
  }
}

// ---- UI ----

export function openTraditions() {
  const overlay = document.getElementById('traditions-overlay');
  if (overlay) {
    renderTraditionsPanel();
    overlay.classList.add('visible');
  }
}

export function closeTraditions() {
  const overlay = document.getElementById('traditions-overlay');
  if (overlay) overlay.classList.remove('visible');
}

export function switchTraditionsTab(tab) {
  document.querySelectorAll('.traditions-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.traditions-tab-panel').forEach(p => p.classList.toggle('active', p.id === `traditions-${tab}-panel`));
}

// Formats effect string for a tradition, optionally applying the policy bonus multiplier.
// If a tradition instance is provided, shows scaled values with the raw value in parentheses when different.
function formatEffectString(template, tradition, capitalize) {
  const multiplier = tradition ? getTraditionBonusMultiplier(tradition) : 1;
  return Object.entries(template.effects)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => {
      const label = capitalize ? k.charAt(0).toUpperCase() + k.slice(1) : k;
      const scaled = Math.round(v * multiplier * 10) / 10;
      if (scaled !== v) {
        return `${label} +${scaled} <span class="tradition-cost-note">(base ${v})</span>`;
      }
      return `${label} +${v}`;
    })
    .join(', ');
}

// Returns a small HTML status string indicating drift state for a tradition instance.
function getDriftStatusHtml(tradition) {
  const template = TRADITIONS[tradition.id];
  if (!template || template.triggerOn) return '';
  if (tradition.timesPerformed < 5 || gameState.turn - tradition.established < 20) return '';

  const traditionPolicy = (gameState.governance && gameState.governance.policies)
    ? (gameState.governance.policies.tradition ?? 50)
    : 50;
  const driftMultiplier = 2 * (1 - traditionPolicy / 100);

  if (driftMultiplier <= 0) return ` · <span class="tradition-drift-suppressed">No drift (Ancient Ways)</span>`;
  const baseDrift = 0.2;
  const rate = (baseDrift * driftMultiplier).toFixed(2);
  return ` · <span class="tradition-drifting">⏳ Drifting (−${rate} Legitimacy/turn)</span>`;
}

export function renderTraditionsPanel() {
  renderSummaryTab();
  renderCalendarTab();
  renderEstablishTab();
}

function renderSummaryTab() {
  const panel = document.getElementById('traditions-summary-panel');
  if (!panel) return;

  const active = getActiveTraditions();
  const traditionPolicy = (gameState.governance?.policies?.tradition ?? 50);
  const policyLabel = traditionPolicy >= 70 ? 'Ancient Ways' : traditionPolicy <= 30 ? 'Revolutionary' : 'Balanced';
  const baseMultiplier = 0.6 + 0.4 * (traditionPolicy / 100);
  const penaltyMult = 0.5 + (traditionPolicy / 100);

  let html = `<div class="traditions-summary-scroll">`;
  html += `<div class="tradition-policy-banner">
    <strong>Policy:</strong> ${policyLabel} (${traditionPolicy}%) ·
    Bonuses ×${baseMultiplier.toFixed(1)} ·
    Penalties ×${penaltyMult.toFixed(1)}
  </div>`;

  if (active.length === 0) {
    html += `<div class="traditions-empty">No traditions established yet.</div>`;
  } else {
    for (const t of active) {
      const template = t.template;
      if (!template) continue;

      const displayName = t.customName || template.name;
      const effectStr = formatEffectString(template, t, true);

      const scaledFood = getScaledTraditionCost(template.cost.food || 0);
      const scaledMat = getScaledTraditionCost(template.cost.materials || 0);
      const costParts = [scaledFood ? `🌾${scaledFood}` : '', scaledMat ? `🪵${scaledMat}` : ''].filter(Boolean);
      const scaledNote = (scaledFood !== (template.cost.food || 0) || scaledMat !== (template.cost.materials || 0))
        ? ` <span class="tradition-cost-note">(scales with pop)</span>` : '';
      const costStr = costParts.join(' ') || 'Free';

      const scheduleStr = formatScheduleString(t, template);

      const penalty = getTraditionRemovalPenalty(t);
      const penaltyStr = `Identity −${penalty.identity}, Legitimacy −${penalty.legitimacy}`;

      html += `<div class="tradition-card active">
        <div class="tradition-header">
          <span class="tradition-icon">${template.icon}</span>
          <span class="tradition-name">${displayName}</span>
          <span class="tradition-schedule">${scheduleStr}</span>
        </div>
        <div class="tradition-desc">${template.description}</div>
        <div class="tradition-stats">
          <span class="tradition-cost">Cost: ${costStr}${scaledNote}</span>
          <span class="tradition-effects">${effectStr}</span>
        </div>
        <div class="tradition-meta">
          Observed ${t.timesPerformed} time${t.timesPerformed !== 1 ? 's' : ''} · Established turn ${t.established}
          ${getDriftStatusHtml(t)}
        </div>
        <div class="tradition-actions">
          <button class="tradition-change-btn" onclick="confirmChangeTradition('${t.id}')">
            Change (${penaltyStr})
          </button>
          <button class="tradition-remove-btn" onclick="confirmRemoveTradition('${t.id}')">
            Abandon (${penaltyStr})
          </button>
        </div>
      </div>`;
    }
  }

  html += `</div>`;
  panel.innerHTML = html;
}

function renderCalendarTab() {
  const panel = document.getElementById('traditions-calendar-panel');
  if (!panel) return;

  const active = getActiveTraditions();
  const seasons = ['Spring', 'Summer', 'Autumn', 'Winter'];
  const seasonMeta = {
    Spring: { icon: '🌱', cls: 'spring' },
    Summer: { icon: '☀️', cls: 'summer' },
    Autumn: { icon: '🍂', cls: 'autumn' },
    Winter: { icon: '❄️', cls: 'winter' }
  };

  // Bucket traditions by effective season
  const bySeason = { Spring: [], Summer: [], Autumn: [], Winter: [] };
  const other = [];
  for (const t of active) {
    const template = t.template;
    if (!template) continue;
    if (template.triggerOn) { other.push(t); continue; }
    const effectiveSeason = traditionEffectiveSeason(t, template);
    if (effectiveSeason && bySeason[effectiveSeason]) {
      bySeason[effectiveSeason].push(t);
    } else {
      other.push(t);
    }
  }

  let html = `<div class="traditions-calendar"><div class="traditions-calendar-seasons">`;

  for (const season of seasons) {
    const { icon, cls } = seasonMeta[season];
    const traditions = bySeason[season];
    html += `<div class="traditions-season-col">
      <div class="traditions-season-header ${cls}">${icon} ${season}</div>
      <div class="traditions-season-body">`;

    if (traditions.length === 0) {
      html += `<div class="tradition-cal-empty">No traditions</div>`;
    } else {
      for (const t of traditions) {
        const template = t.template;
        const displayName = t.customName || template.name;
        const effectStr = formatEffectString(template, t, false);
        const scaledFood = getScaledTraditionCost(template.cost.food || 0);
        const scaledMat = getScaledTraditionCost(template.cost.materials || 0);
        const costParts = [scaledFood ? `🌾${scaledFood}` : '', scaledMat ? `🪵${scaledMat}` : ''].filter(Boolean);
        const costStr = costParts.join(' ') || 'Free';
        html += `<div class="tradition-cal-card">
          <div class="tradition-cal-name">${template.icon} ${displayName}</div>
          <div class="tradition-cal-cost">${costStr}</div>
          <div class="tradition-cal-effects">${effectStr}</div>
        </div>`;
      }
    }

    html += `</div></div>`;
  }

  html += `</div>`; // end .traditions-calendar-seasons

  // Other traditions (event-triggered or unscheduled)
  if (other.length > 0) {
    html += `<div class="traditions-other-section">
      <div class="traditions-section-header">Other Traditions</div>
      <div class="traditions-other-cards">`;
    for (const t of other) {
      const template = t.template;
      const displayName = t.customName || template.name;
      const effectStr = formatEffectString(template, t, false);
      const triggerStr = formatScheduleString(t, template);
      html += `<div class="tradition-other-card">
        <div class="tradition-other-name">${template.icon} ${displayName}</div>
        <div class="tradition-other-trigger">${triggerStr}</div>
        <div class="tradition-other-effects">${effectStr}</div>
      </div>`;
    }
    html += `</div></div>`;
  }

  html += `</div>`; // end .traditions-calendar
  panel.innerHTML = html;
}

function renderEstablishTab() {
  const panel = document.getElementById('traditions-establish-panel');
  if (!panel) return;

  const available = getAvailableTraditions();
  let html = `<div class="traditions-establish-scroll">`;

  if (available.length === 0) {
    html += `<div class="traditions-empty">No new traditions available. Grow your settlement to unlock more.</div>`;
  } else {
    // Show what benefits would look like for a newly established tradition (0 timesPerformed)
    const previewTradition = { timesPerformed: 0 };
    for (const t of available) {
      const effectStr = formatEffectString(t, previewTradition, true);

      const currentFood = getScaledTraditionCost(t.cost.food || 0);
      const currentMat = getScaledTraditionCost(t.cost.materials || 0);
      const costParts = [currentFood ? `🌾${currentFood}` : '', currentMat ? `🪵${currentMat}` : ''].filter(Boolean);
      const costStr = (costParts.join(' ') || 'Free') + ' per observance';
      const costNote = (t.cost.food || t.cost.materials) ? ` <span class="tradition-cost-note">(scales with pop)</span>` : '';

      const defaultYears = (t.interval || 4) / 4;
      const scheduleStr = t.triggerOn
        ? formatScheduleString({}, t)
        : t.season
          ? `Every ${defaultYears === 1 ? 'year' : `${defaultYears} years`} in ${t.season} (customizable)`
          : 'You choose season & frequency';

      html += `<div class="tradition-card available">
        <div class="tradition-header">
          <span class="tradition-icon">${t.icon}</span>
          <span class="tradition-name">${t.name}</span>
          <span class="tradition-schedule">${scheduleStr}</span>
        </div>
        <div class="tradition-desc">${t.description}</div>
        <div class="tradition-stats">
          <span class="tradition-cost">Cost: ${costStr}${costNote}</span>
          <span class="tradition-effects">${effectStr}</span>
        </div>
        <div class="tradition-actions">
          <button class="tradition-establish-btn" onclick="confirmEstablishTradition('${t.id}')">
            Establish Tradition
          </button>
        </div>
      </div>`;
    }
  }

  html += `</div>`;
  panel.innerHTML = html;
}

export function confirmEstablishTradition(traditionId) {
  const template = TRADITIONS[traditionId];
  if (!template) return;

  const scaledFood = getScaledTraditionCost(template.cost.food || 0);
  const scaledMat = getScaledTraditionCost(template.cost.materials || 0);
  const costParts = [
    scaledFood ? `🌾${scaledFood} food` : '',
    scaledMat ? `🪵${scaledMat} materials` : ''
  ].filter(Boolean);
  const costStr = costParts.join(', ') || 'None';
  const scalesNote = (template.cost.food || template.cost.materials)
    ? ' <em style="font-size:11px">(increases as your population grows)</em>' : '';

  const effectStr = formatEffectString(template, { timesPerformed: 0 }, true);

  const seasonAndIntervalSelectors = !template.triggerOn ? `
    <div class="tradition-customize-row">
      <label class="tradition-customize-label" for="tradition-custom-season">Observed in:</label>
      <select id="tradition-custom-season" class="tradition-season-select">
        ${!template.season ? '<option value="" disabled selected>— choose a season —</option>' : ''}
        <option value="Spring" ${template.season === 'Spring' ? 'selected' : ''}>Spring</option>
        <option value="Summer" ${template.season === 'Summer' ? 'selected' : ''}>Summer</option>
        <option value="Autumn" ${template.season === 'Autumn' ? 'selected' : ''}>Autumn</option>
        <option value="Winter" ${template.season === 'Winter' ? 'selected' : ''}>Winter</option>
      </select>
    </div>
    <div class="tradition-customize-row">
      <label class="tradition-customize-label" for="tradition-custom-interval">How often:</label>
      <select id="tradition-custom-interval" class="tradition-season-select">
        <option value="4"  ${template.interval === 4  ? 'selected' : ''}>Every year</option>
        <option value="8"  ${template.interval === 8  ? 'selected' : ''}>Every 2 years</option>
        <option value="12" ${template.interval === 12 ? 'selected' : ''}>Every 3 years</option>
        <option value="16" ${template.interval === 16 ? 'selected' : ''}>Every 4 years</option>
      </select>
    </div>` : '';

  window.showConfirmDialogNonDestructive(
    `Establish Tradition`,
    `<p>${template.description}</p>
     <div class="tradition-customize">
       <div class="tradition-customize-row">
         <label class="tradition-customize-label" for="tradition-custom-name">Name:</label>
         <input id="tradition-custom-name" class="tradition-name-input" value="${template.name}" maxlength="50" />
       </div>
       ${seasonAndIntervalSelectors}
     </div>
     <p><strong>Recurring cost:</strong> ${costStr} each observance${scalesNote}</p>
     <p><strong>Benefits:</strong> ${effectStr}</p>
     <p><em>Once established, changing or abandoning a tradition will damage your society's Identity and Legitimacy.</em></p>`,
    'Establish',
    'Cancel',
    () => {
      const nameInput = document.getElementById('tradition-custom-name');
      const seasonInput = document.getElementById('tradition-custom-season');
      const intervalInput = document.getElementById('tradition-custom-interval');
      const customName = nameInput?.value.trim() || null;
      const customSeason = seasonInput ? (seasonInput.value || null) : undefined;
      const customInterval = intervalInput ? parseInt(intervalInput.value, 10) : undefined;

      // Require a season selection for interval-based traditions
      if (seasonInput && !seasonInput.value) {
        window.showAlert('Choose a Season', '<p>Every tradition must be observed in a specific season. Choose when your people will hold this practice.</p>');
        return;
      }

      establishTradition(traditionId, customName, customSeason, customInterval);
      renderTraditionsPanel();
    }
  );
}

export function confirmChangeTradition(traditionId) {
  const tradition = gameState.traditions.find(t => t.id === traditionId);
  const template = TRADITIONS[traditionId];
  if (!tradition || !template) return;

  // Don't show change dialog for event-triggered traditions (no timing to change)
  const currentName = tradition.customName || template.name;
  const currentSeason = traditionEffectiveSeason(tradition, template);
  const currentInterval = traditionEffectiveInterval(tradition, template);
  const penalty = getTraditionRemovalPenalty(tradition);

  const timingSelectors = !template.triggerOn ? `
    <div class="tradition-customize-row">
      <label class="tradition-customize-label" for="tradition-change-season">Observed in:</label>
      <select id="tradition-change-season" class="tradition-season-select">
        <option value="Spring" ${currentSeason === 'Spring' ? 'selected' : ''}>Spring</option>
        <option value="Summer" ${currentSeason === 'Summer' ? 'selected' : ''}>Summer</option>
        <option value="Autumn" ${currentSeason === 'Autumn' ? 'selected' : ''}>Autumn</option>
        <option value="Winter" ${currentSeason === 'Winter' ? 'selected' : ''}>Winter</option>
      </select>
    </div>
    <div class="tradition-customize-row">
      <label class="tradition-customize-label" for="tradition-change-interval">How often:</label>
      <select id="tradition-change-interval" class="tradition-season-select">
        <option value="4"  ${currentInterval === 4  ? 'selected' : ''}>Every year</option>
        <option value="8"  ${currentInterval === 8  ? 'selected' : ''}>Every 2 years</option>
        <option value="12" ${currentInterval === 12 ? 'selected' : ''}>Every 3 years</option>
        <option value="16" ${currentInterval === 16 ? 'selected' : ''}>Every 4 years</option>
      </select>
    </div>` : '';

  window.showConfirmDialog(
    `Change ${currentName}`,
    `<p>Change the name or timing of this tradition?</p>
     <div class="tradition-customize">
       <div class="tradition-customize-row">
         <label class="tradition-customize-label" for="tradition-change-name">Name:</label>
         <input id="tradition-change-name" class="tradition-name-input" value="${currentName}" maxlength="50" />
       </div>
       ${timingSelectors}
     </div>
     <p style="color:#cc6644"><strong>Penalty:</strong> Identity −${penalty.identity}, Legitimacy −${penalty.legitimacy}</p>
     <p><em>Disrupting an established practice is a social act. The community will feel the change.</em></p>`,
    'Change Tradition',
    'Cancel',
    () => {
      const nameInput = document.getElementById('tradition-change-name');
      const seasonInput = document.getElementById('tradition-change-season');
      const intervalInput = document.getElementById('tradition-change-interval');
      const newName = nameInput?.value.trim() || null;
      const newSeason = seasonInput ? (seasonInput.value || null) : undefined;
      const newInterval = intervalInput ? parseInt(intervalInput.value, 10) : undefined;

      // Only apply penalty if something actually changed
      const nameChanged = newName !== currentName && newName !== template.name;
      const seasonChanged = seasonInput && newSeason !== currentSeason;
      const intervalChanged = intervalInput && newInterval !== currentInterval;
      if (!nameChanged && !seasonChanged && !intervalChanged) return;

      changeTradition(traditionId, newName, newSeason, newInterval);
      renderTraditionsPanel();
    }
  );
}

export function changeTradition(traditionId, newName, newSeason, newInterval) {
  const tradition = gameState.traditions.find(t => t.id === traditionId);
  const template = TRADITIONS[traditionId];
  if (!tradition || !template) return false;

  const oldName = traditionDisplayName(tradition);
  const penalty = getTraditionRemovalPenalty(tradition);

  // Apply cohesion penalty (same as abandonment — disruption is disruption)
  gameState.cohesion.identity = Math.max(0, gameState.cohesion.identity - penalty.identity);
  gameState.cohesion.legitimacy = Math.max(0, gameState.cohesion.legitimacy - penalty.legitimacy);

  // Apply changes
  tradition.customName = newName || null;
  if (newSeason !== undefined) tradition.customSeason = newSeason;
  if (newInterval !== undefined) tradition.customInterval = newInterval;

  const newDisplayName = traditionDisplayName(tradition);

  if (window.addChronicleEntry) {
    window.addChronicleEntry(
      `The tradition once known as ${oldName} was reshaped into ${newDisplayName}. Some welcomed the change; others mourned what was lost.`,
      'cultural'
    );
  }

  if (window.updateAllUI) window.updateAllUI();
  return true;
}

export function confirmRemoveTradition(traditionId) {
  const tradition = gameState.traditions.find(t => t.id === traditionId);
  const template = TRADITIONS[traditionId];
  if (!tradition || !template) return;

  const penalty = getTraditionRemovalPenalty(tradition);

  const displayName = traditionDisplayName(tradition);
  window.showConfirmDialog(
    `Abandon ${displayName}`,
    `<p>Abandon the tradition of <strong>${displayName}</strong>?</p>
     <p>It has been observed <strong>${tradition.timesPerformed}</strong> time${tradition.timesPerformed !== 1 ? 's' : ''}.</p>
     <p style="color:#cc6644"><strong>Penalty:</strong> Identity −${penalty.identity}, Legitimacy −${penalty.legitimacy}</p>
     <p><em>The people will feel the loss of this tradition deeply.</em></p>`,
    'Abandon',
    'Keep',
    () => {
      removeTradition(traditionId);
      renderTraditionsPanel();
    }
  );
}

// ============================================================
// ---- ORAL TRADITION & STORYTELLING (Phase 8C) ----
// ============================================================
// Storytellers are workers assigned to cultural memory. Each turn they
// accumulate story progress. When it tips over, a story is "composed" from
// recent Chronicle events. Stories give permanent Identity bonuses.
// If storytellers disappear for 4+ turns, the oldest stories begin to fade.

const STORY_PROGRESS_PER_STORYTELLER = 0.25; // 1 storyteller = 1 story per 4 turns
const STORY_CAPACITY_PER_STORYTELLER  = 4;    // 1 storyteller maintains 4 stories
const STORY_LOSS_GRACE_TURNS          = 4;    // turns without storyteller before loss begins
const STORY_IDENTITY_BONUS            = 1;    // Identity boost per story composed

// Add/remove storyteller — immediately updates population.idle
export function addStoryteller() {
  const c = gameState.culture;
  if (gameState.population.idle <= 0) return false;
  c.storytellers++;
  gameState.population.employed++;
  gameState.population.idle--;
  if (window.renderWorkersTab) window.renderWorkersTab();
  if (window.updateAllUI) window.updateAllUI();
  return true;
}

export function removeStoryteller() {
  const c = gameState.culture;
  if (c.storytellers <= 0) return false;
  c.storytellers--;
  gameState.population.employed--;
  gameState.population.idle++;
  if (window.renderWorkersTab) window.renderWorkersTab();
  if (window.updateAllUI) window.updateAllUI();
  return true;
}

// Called each turn from processTurn (dusk phase)
export function processStories(report) {
  const c = gameState.culture;

  if (c.storytellers > 0) {
    c.turnsWithoutStoryteller = 0;

    // Accumulate story progress
    c.storyProgress += c.storytellers * STORY_PROGRESS_PER_STORYTELLER;

    // Each full point of progress = one new story composed
    while (c.storyProgress >= 1) {
      c.storyProgress -= 1;
      const story = composeStory();
      c.stories.push(story);

      // Permanent Identity boost
      gameState.cohesion.identity = Math.min(100, gameState.cohesion.identity + STORY_IDENTITY_BONUS);

      report.events.push(`📖 A new story was composed: "${story.title}" (Identity +${STORY_IDENTITY_BONUS})`);

      if (window.addChronicleEntry) {
        window.addChronicleEntry(
          `The storytellers preserved a new account: "${story.title}." It will be passed down to future generations.`,
          'cultural'
        );
      }
    }

    // If stories exceed capacity, excess ones begin to fade (oldest first)
    const capacity = c.storytellers * STORY_CAPACITY_PER_STORYTELLER;
    while (c.stories.length > capacity + 2) { // +2 buffer before fade kicks in
      const lost = c.stories.shift(); // oldest first
      gameState.cohesion.identity = Math.max(0, gameState.cohesion.identity - STORY_IDENTITY_BONUS);
      report.events.push(`😔 "${lost.title}" has faded — too many stories for your storytellers to maintain (Identity −${STORY_IDENTITY_BONUS})`);
      if (window.addChronicleEntry) {
        window.addChronicleEntry(
          `The story of "${lost.title}" has been forgotten — there are not enough storytellers to keep all the old accounts alive.`,
          'cultural'
        );
      }
    }

  } else {
    // No storytellers — stories start fading after grace period
    c.turnsWithoutStoryteller++;

    if (c.turnsWithoutStoryteller >= STORY_LOSS_GRACE_TURNS && c.stories.length > 0) {
      const lost = c.stories.shift();
      gameState.cohesion.identity = Math.max(0, gameState.cohesion.identity - STORY_IDENTITY_BONUS);
      report.events.push(`😔 "${lost.title}" is being forgotten — no storytellers to keep it alive (Identity −${STORY_IDENTITY_BONUS})`);
      if (window.addChronicleEntry) {
        window.addChronicleEntry(
          `With no storytellers to tend the oral tradition, the story of "${lost.title}" begins to fade from memory.`,
          'cultural'
        );
      }
    }
  }
}

// Generate a story object, drawing title and description from recent Chronicle entries
function composeStory() {
  const chronicle = gameState.chronicle || [];
  const recentTurn = gameState.turn;
  const SEASONS_ARR = ['Spring', 'Summer', 'Autumn', 'Winter'];
  const currentSeason = SEASONS_ARR[gameState.season];

  // Look at recent entries (last 12 turns), prefer meaningful categories
  const recent = chronicle.filter(e => recentTurn - e.turn <= 12);
  const preferred = ['crisis', 'military', 'milestone'];
  let sourceEntry = null;
  for (const cat of preferred) {
    sourceEntry = recent.find(e => e.category === cat);
    if (sourceEntry) break;
  }
  if (!sourceEntry) sourceEntry = recent.find(e => e.category === 'cultural');

  if (sourceEntry) {
    return {
      id: `story_${recentTurn}_${Math.floor(Math.random() * 1000)}`,
      ...storyFromEntry(sourceEntry),
      identityBonus: STORY_IDENTITY_BONUS,
      turn: recentTurn,
      year: gameState.year,
      season: currentSeason
    };
  }

  // Generic fallback
  return {
    id: `story_${recentTurn}`,
    title: `Tales of Year ${gameState.year}`,
    description: `Stories from the ${currentSeason.toLowerCase()} of Year ${gameState.year}, passed down to those who came after.`,
    identityBonus: STORY_IDENTITY_BONUS,
    turn: recentTurn,
    year: gameState.year,
    season: currentSeason
  };
}

// Build a story title and description from a Chronicle entry
function storyFromEntry(entry) {
  const t = entry.text.toLowerCase();
  if (entry.category === 'crisis') {
    if (t.includes('famine') || t.includes('starvat') || t.includes('hunger') || t.includes('starv')) {
      return { title: `The Great Hunger of Year ${entry.year}`, description: `A story of the famine that tested our people's endurance, and how they survived.` };
    }
    if (t.includes('flood') || t.includes('water')) {
      return { title: `The Year of the Waters`, description: `A story of the great flood that swept through our land, and of those who rebuilt after.` };
    }
    if (t.includes('winter') || t.includes('cold')) {
      return { title: `The Long Winter of Year ${entry.year}`, description: `A story of a bitter winter that consumed our stores and hardened those who endured it.` };
    }
    return { title: `The ${entry.season} of Hardship, Year ${entry.year}`, description: `A story of the crisis that befell our people, and of the resilience they found within themselves.` };
  }
  if (entry.category === 'military') {
    if (t.includes('defeat') || t.includes('fell') || t.includes('lost') || t.includes('died') || t.includes('death')) {
      return { title: `The Sacrifice, Year ${entry.year}`, description: `A story of those who gave their lives defending the settlement. Their names are remembered.` };
    }
    if (t.includes('drove') || t.includes('victory') || t.includes('repelled') || t.includes('defeated') || t.includes('stood firm')) {
      return { title: `The Day We Stood Firm`, description: `A story of the battle our people fought and won, passed down as proof that we cannot be broken.` };
    }
    return { title: `The ${entry.season} Battle, Year ${entry.year}`, description: `A story of the conflict that shaped our settlement's understanding of its own strength.` };
  }
  if (entry.category === 'milestone') {
    if (t.includes('born') || t.includes('children') || t.includes('birth')) {
      return { title: `The Birth of a New Generation`, description: `A story of the children born in this season — the future of everything the settlement has built.` };
    }
    if (t.includes('came of age') || t.includes('graduation')) {
      return { title: `The Coming of Age, Year ${entry.year}`, description: `A story of the young people who stepped into the responsibilities of adulthood, and what they inherited.` };
    }
    if (t.includes('complet') || t.includes('built') || t.includes('new')) {
      return { title: `The Building of Our Home`, description: `A story of what our hands made together — a monument to collective effort.` };
    }
  }
  return { title: `Tales of Year ${entry.year}`, description: `Stories from Year ${entry.year}, ${entry.season}: ${entry.text.substring(0, 100)}...` };
}

// Clamp storytellers to population — called when population drops
export function clampStorytellers() {
  const c = gameState.culture;
  if (!c) return;
  const excess = c.storytellers - gameState.population.total;
  if (excess > 0) {
    c.storytellers -= excess;
    // idle is recalculated in turnProcessing, no need to adjust here
  }
}

// ---- STORIES UI ----

export function openStories() {
  renderStoriesPanel();
  const overlay = document.getElementById('chronicle-overlay');
  if (overlay) {
    overlay.classList.add('visible');
    // Switch to stories tab
    const storyTab = document.querySelector('.chronicle-tab[data-tab="stories"]');
    if (storyTab) {
      document.querySelectorAll('.chronicle-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.chronicle-tab-panel').forEach(p => p.classList.remove('active'));
      storyTab.classList.add('active');
      document.getElementById('chronicle-stories-panel')?.classList.add('active');
    }
  }
}

export function switchChronicleTab(tab) {
  document.querySelectorAll('.chronicle-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.chronicle-tab-panel').forEach(p => p.classList.toggle('active', p.id === `chronicle-${tab}-panel`));
  if (tab === 'stories') renderStoriesPanel();
  if (tab === 'log' && window.renderChronicleEntries) window.renderChronicleEntries();
}

export function renderStoriesPanel() {
  const panel = document.getElementById('chronicle-stories-panel');
  if (!panel) return;

  const c = gameState.culture;
  const stories = c?.stories || [];
  const storytellers = c?.storytellers ?? 0;
  const capacity = storytellers * STORY_CAPACITY_PER_STORYTELLER;
  const turnsLeft = Math.max(0, STORY_LOSS_GRACE_TURNS - (c?.turnsWithoutStoryteller || 0));

  let html = `<div class="stories-scroll">`;

  // Status banner
  if (storytellers === 0 && stories.length > 0) {
    const warning = turnsLeft > 0
      ? `No storytellers — stories will begin fading in ${turnsLeft} turn${turnsLeft !== 1 ? 's' : ''}.`
      : `No storytellers — oldest stories are fading each turn.`;
    html += `<div class="stories-status warning">⚠️ ${warning}</div>`;
  } else if (storytellers > 0) {
    const progressPct = Math.round((c.storyProgress || 0) * 100);
    const overCapacity = stories.length > capacity;
    const status = overCapacity
      ? `${storytellers} storyteller${storytellers !== 1 ? 's' : ''} · ${stories.length}/${capacity} stories (over capacity — oldest fading)`
      : `${storytellers} storyteller${storytellers !== 1 ? 's' : ''} · ${stories.length}/${capacity} stories · Next story: ${progressPct}% composed`;
    html += `<div class="stories-status${overCapacity ? ' warning' : ''}">📖 ${status}</div>`;
  } else {
    html += `<div class="stories-status empty">Assign storytellers in Workforce Management to begin preserving your society's history.</div>`;
  }

  // Story identity total
  if (stories.length > 0) {
    html += `<div class="stories-identity-total">Oral tradition provides: Identity +${stories.length * STORY_IDENTITY_BONUS} (${stories.length} stor${stories.length !== 1 ? 'ies' : 'y'})</div>`;
  }

  // Story list
  if (stories.length === 0) {
    html += `<div class="stories-empty">No stories yet. Assign storytellers and let time pass — they will draw from your Chronicle to compose your society's oral history.</div>`;
  } else {
    // Show newest first
    for (let i = stories.length - 1; i >= 0; i--) {
      const s = stories[i];
      const isAtRisk = storytellers === 0 || (storytellers > 0 && stories.length > capacity && i === 0);
      html += `<div class="story-card${isAtRisk ? ' at-risk' : ''}">
        <div class="story-title">📖 ${s.title}</div>
        <div class="story-desc">${s.description}</div>
        <div class="story-meta">Composed Year ${s.year}, ${s.season} · Identity +${s.identityBonus}</div>
        ${isAtRisk ? '<div class="story-risk">⚠️ At risk of being forgotten</div>' : ''}
      </div>`;
    }
  }

  html += `</div>`;
  panel.innerHTML = html;
}

// ============================================================
// ---- SACRED PLACES & LANDSCAPE NAMING (Phase 8D) ----
// ============================================================

const SACRED_REASONS = {
  founding_site:  { label: 'Founding Site',  icon: '🏛️', desc: 'Where our people first settled.' },
  battle_site:    { label: 'Battle Site',     icon: '⚔️', desc: 'Where blood was shed in defense of our home.' },
  burial_ground:  { label: 'Burial Ground',   icon: '🕯️', desc: 'Where our dead are laid to rest.' },
  spiritual_site: { label: 'Spiritual Site',  icon: '✨', desc: 'A place of reverence and reflection.' },
  natural_wonder: { label: 'Natural Wonder',  icon: '🌿', desc: 'A place of awe-inspiring natural beauty.' }
};

const NAMEABLE_TERRAIN = new Set(['mountain', 'forest', 'hills', 'lake', 'wetland', 'desert']);
const NATURAL_WONDER_TERRAIN = new Set(['mountain', 'lake']);

// ---- SACRED SITES (building) ----

// Returns { reason, available, reason: string } for each sacred site reason.
// available = can be built (prereq met and not yet built).
// lockedReason = human-readable explanation if not available.
export function getSacredSiteReasonStatus(col, row) {
  const hex = gameState.map[row]?.[col];
  const built = gameState.culture.sacredSiteBuilt || {};
  const c = gameState.culture;

  const hexHasRiver = !!(hex?.riverIds?.length || hex?.hasRiver);
  const hexIsNaturalWonder = hex && (NATURAL_WONDER_TERRAIN.has(hex.terrain) || hexHasRiver);

  return {
    founding_site: {
      available: !built.founding_site,
      lockedReason: built.founding_site ? 'Already built' : null
    },
    burial_ground: {
      available: !built.burial_ground && !!(c.deathsOccurred),
      lockedReason: built.burial_ground ? 'Already built' : !c.deathsOccurred ? 'No deaths have occurred yet' : null
    },
    battle_site: {
      available: !built.battle_site && !!(c.battleOccurred),
      lockedReason: built.battle_site ? 'Already built' : !c.battleOccurred ? 'No battles have been fought yet' : null
    },
    spiritual_site: {
      available: !built.spiritual_site && !!(c.spiritualEventFired),
      lockedReason: built.spiritual_site ? 'Already built' : !c.spiritualEventFired ? 'No spiritual event has occurred yet' : null
    },
    natural_wonder: {
      available: !built.natural_wonder && hexIsNaturalWonder,
      lockedReason: built.natural_wonder ? 'Already built' : !hexIsNaturalWonder ? 'Requires a mountain, lake, or river hex' : null
    }
  };
}

// Called from externalThreats when a threat moves onto a hex
export function checkDesecration(col, row, report) {
  const hex = gameState.map[row]?.[col];
  if (!hex || hex.building !== 'sacred_site' || hex.buildProgress > 0) return;

  const reason = hex.sacredReason || 'spiritual_site';
  const reasonDef = SACRED_REASONS[reason];
  const label = `the ${reasonDef.label.toLowerCase()}`;

  gameState.cohesion.bonds      = Math.max(0, gameState.cohesion.bonds      - 15);
  gameState.cohesion.identity   = Math.max(0, gameState.cohesion.identity   - 10);
  gameState.cohesion.legitimacy = Math.max(0, gameState.cohesion.legitimacy -  5);

  // Free the worker and remove the building
  if (hex.workers > 0) {
    gameState.population.employed -= hex.workers;
    gameState.population.idle += hex.workers;
    hex.workers = 0;
  }
  hex.building = null;
  hex.buildProgress = 0;
  hex.sacredReason = null;

  if (report) report.events.push(`💔 ${reasonDef.icon} ${label} has been desecrated by an enemy! Bonds −15, Identity −10, Legitimacy −5.`);
  if (window.addChronicleEntry) {
    window.addChronicleEntry(
      `Enemies overran ${label}. A sacred place was desecrated — a wound to the community's soul that will not heal quickly.`,
      'crisis'
    );
  }
  if (window.setMapDirty) window.setMapDirty(true);
}

// Per-turn Bonds from worked sacred sites + material upkeep
// Legacy wrapper — kept for backward compatibility
export function processSacredPlaces(report) {
  processSocietyBuildings(report);
}

/**
 * Unified processor for all society buildings (sacred site, shrine, monument, meeting hall).
 * Data-driven: any building with isSocietyBuilding and *Yield fields is handled automatically.
 */
export function processSocietyBuildings(report) {
  // Ensure accumulators exist (migration safety)
  if (!gameState.culture.societyBuildingAccumulators) {
    gameState.culture.societyBuildingAccumulators = { identity: 0, legitimacy: 0, satisfaction: 0, bonds: 0 };
  }
  // Migrate legacy accumulator
  if (gameState.culture.sacredSiteBondsAccumulator > 0) {
    gameState.culture.societyBuildingAccumulators.bonds += gameState.culture.sacredSiteBondsAccumulator;
    gameState.culture.sacredSiteBondsAccumulator = 0;
  }

  const accum = gameState.culture.societyBuildingAccumulators;
  let sitesUnfunded = 0;
  const isTheocracy = gameState.governance?.model === 'theocracy';
  const yieldKeys = ['identityYield', 'legitimacyYield', 'satisfactionYield', 'bondsYield'];
  const pillarMap = { identityYield: 'identity', legitimacyYield: 'legitimacy', satisfactionYield: 'satisfaction', bondsYield: 'bonds' };

  // Build a lookup of steward positions and active actions for fast reference
  const stewardTending = {}; // "col,row" -> actionType
  for (const unit of gameState.units) {
    if (unit.type === 'steward' && unit.activeAction) {
      stewardTending[`${unit.col},${unit.row}`] = unit.activeAction;
    }
  }

  for (let r = 0; r < window.MAP_ROWS; r++) {
    for (let c = 0; c < window.MAP_COLS; c++) {
      const hex = gameState.map[r][c];
      if (!hex.building || hex.buildProgress > 0) continue;
      const bDef = window.BUILDINGS[hex.building];
      if (!bDef?.isSocietyBuilding) continue;

      const hexKey = `${c},${r}`;
      const stewardAction = stewardTending[hexKey];

      // ---- MONUMENT: worker-free, lifecycle-based ----
      if (hex.building === 'monument') {
        const NEGLECT_INTERVAL = 8; // turns before neglect without a steward
        const stewardPresent = stewardAction === 'tending_monument';

        // Pay flat per-turn upkeep regardless of state
        const upkeep = bDef.upkeepMaterials || 0;
        let canAffordUpkeep = true;
        if (upkeep > 0) {
          if (gameState.resources.materials >= upkeep) {
            gameState.resources.materials -= upkeep;
          } else {
            canAffordUpkeep = false;
            sitesUnfunded++;
            if (report) report.events.push(`⚠️ Not enough materials for monument upkeep (need 🪵${upkeep}).`);
          }
        }

        if (stewardPresent) {
          hex.lastStewardTurn = gameState.turn;
          hex.monumentState = 'active';
          hex.neglectTurns = 0;
        } else {
          // No steward — check if maintenance interval has passed
          const turnsSinceAttention = gameState.turn - (hex.lastStewardTurn ?? hex.completedTurn ?? 0);
          if (hex.monumentState !== 'neglected' && turnsSinceAttention > NEGLECT_INTERVAL) {
            hex.monumentState = 'neglected';
            hex.neglectTurns = 0;
            if (report) report.events.push(`🗿 A monument is falling into neglect. Send a Steward to restore it.`);
          }
        }

        // Apply yields based on current state
        if (hex.monumentState === 'neglected') {
          hex.neglectTurns = (hex.neglectTurns || 0) + 1;
          // Neglected + can't afford upkeep = double drain
          const drain = canAffordUpkeep ? 0.05 : 0.10;
          accum.identity -= drain;
          accum.bonds    -= drain;
          if (hex.neglectTurns % 4 === 0 && report) {
            const restoreCost = getMonumentRestoreCost(hex);
            const doubleNote = !canAffordUpkeep ? ' Unpaid upkeep compounds the decay.' : '';
            report.events.push(`⚠️ Monument neglected for ${hex.neglectTurns} turns — morale suffers.${doubleNote} Restoration now costs 🪵${restoreCost}.`);
            gameState.cohesion.legitimacy = Math.max(0, gameState.cohesion.legitimacy - 1);
          }
        } else if (canAffordUpkeep) {
          accum.identity += 0.05;
          accum.bonds    += 0.05;
        }
        continue; // monuments handled — don't fall through to worker logic below
      }

      // ---- WORKER-STAFFED SOCIETY BUILDINGS (shrine, meeting_hall, sacred_site) ----
      if (hex.workers === 0) continue;

      // Sacred site: steward tending waives material upkeep
      const isSacredSite = hex.building === 'sacred_site';
      const stewardWaivingUpkeep = isSacredSite && stewardAction === 'tending_sacred_site';

      // Check upkeep affordability
      const upkeep = (bDef.upkeepMaterials || 0) * hex.workers;
      if (upkeep > 0 && !stewardWaivingUpkeep) {
        if (gameState.resources.materials >= upkeep) {
          gameState.resources.materials -= upkeep;
        } else {
          sitesUnfunded++;
          continue;
        }
      }

      // Accumulate all *Yield fields
      for (const yKey of yieldKeys) {
        if (bDef[yKey]) {
          let amount = bDef[yKey] * hex.workers;
          if (yKey === 'identityYield' && hex.building === 'shrine' && isTheocracy) {
            amount *= 1.5;
          }
          accum[pillarMap[yKey]] += amount;
        }
      }
    }
  }

  // Clamp accumulators to prevent runaway negatives from going below -1
  for (const pillar of Object.keys(accum)) {
    if (accum[pillar] < -1) accum[pillar] = -1;
  }

  // Apply integer portions of each accumulator to cohesion pillars
  const pillarNames = { identity: 'Identity', legitimacy: 'Legitimacy', satisfaction: 'Satisfaction', bonds: 'Bonds' };
  const pillarIcons = { identity: '🕯️', legitimacy: '🏛️', satisfaction: '😊', bonds: '💗' };
  const gains = {};
  const losses = {};

  for (const pillar of Object.keys(pillarNames)) {
    if (accum[pillar] >= 1) {
      const gained = Math.floor(accum[pillar]);
      accum[pillar] -= gained;
      gameState.cohesion[pillar] = Math.min(100, gameState.cohesion[pillar] + gained);
      gains[pillar] = gained;
    } else if (accum[pillar] <= -1) {
      const lost = Math.floor(Math.abs(accum[pillar]));
      accum[pillar] += lost;
      gameState.cohesion[pillar] = Math.max(0, gameState.cohesion[pillar] - lost);
      losses[pillar] = lost;
    }
  }

  if (Object.keys(gains).length > 0 && report) {
    const parts = Object.entries(gains).map(([p, v]) => `${pillarNames[p]} +${v}`);
    report.events.push(`${pillarIcons[Object.keys(gains)[0]]} Society buildings tended. ${parts.join(', ')}.`);
  }
  if (Object.keys(losses).length > 0 && report) {
    const parts = Object.entries(losses).map(([p, v]) => `${pillarNames[p]} −${v}`);
    report.events.push(`🗿 Neglected monuments drag on cohesion. ${parts.join(', ')}.`);
  }

  if (sitesUnfunded > 0 && report) {
    report.events.push(`⚠️ ${sitesUnfunded} society building${sitesUnfunded > 1 ? 's' : ''} — not enough materials for upkeep.`);
  }
}

/**
 * Calculate the material cost to restore a neglected monument.
 */
export function getMonumentRestoreCost(hex) {
  return 5 + 2 * (hex.neglectTurns || 0);
}

/**
 * Activate a Steward's tending action on its current hex.
 * Handles restoration payment for neglected monuments.
 */
export function activateStewardTend(unitId) {
  const unit = gameState.units.find(u => u.id === unitId);
  if (!unit || unit.type !== 'steward') return;

  const hex = gameState.map[unit.row]?.[unit.col];
  if (!hex) return;

  const bDef = window.BUILDINGS[hex.building];

  if (hex.building === 'monument' && hex.buildProgress <= 0) {
    // For neglected monuments: pay restoration cost first
    if (hex.monumentState === 'neglected') {
      const cost = getMonumentRestoreCost(hex);
      if (gameState.resources.materials < cost) {
        window.showAlert('Cannot Restore', `<p>Restoring this monument requires 🪵${cost} materials. You have ${gameState.resources.materials}.</p>`);
        return;
      }
      gameState.resources.materials -= cost;
      hex.monumentState = 'active';
      hex.neglectTurns = 0;
      hex.lastStewardTurn = gameState.turn;
      if (window.addChronicleEntry) window.addChronicleEntry('A Steward restored a neglected monument to its former glory.', 'cultural');
    }
    unit.activeAction = 'tending_monument';
    hex.lastStewardTurn = gameState.turn;
    if (window.updateAllUI) window.updateAllUI();
    if (window.updateSidePanel && gameState.selectedHex) window.updateSidePanel(gameState.selectedHex);
    if (window.render) window.render();

  } else if (hex.building === 'sacred_site' && hex.buildProgress <= 0) {
    unit.activeAction = 'tending_sacred_site';
    if (window.updateAllUI) window.updateAllUI();
    if (window.updateSidePanel && gameState.selectedHex) window.updateSidePanel(gameState.selectedHex);
    if (window.render) window.render();

  } else {
    return; // nothing to tend here
  }
}

/**
 * Deactivate a Steward's current tending action.
 */
export function deactivateStewardTend(unitId) {
  const unit = gameState.units.find(u => u.id === unitId);
  if (!unit) return;
  unit.activeAction = null;
  if (window.updateAllUI) window.updateAllUI();
  if (window.updateSidePanel && gameState.selectedHex) window.updateSidePanel(gameState.selectedHex);
  if (window.render) window.render();
}

/**
 * Check if a settlement's territory already has a meeting hall.
 */
export function hasSettlementMeetingHall(col, row) {
  // Find the nearest settlement to this hex
  let nearestSettlement = null;
  let nearestDist = Infinity;
  for (const s of gameState.settlements) {
    const d = window.cubeDistance(window.offsetToCube(col, row), window.offsetToCube(s.col, s.row));
    if (d < nearestDist) {
      nearestDist = d;
      nearestSettlement = s;
    }
  }
  if (!nearestSettlement) return false;

  // Check all hexes in that settlement's territory radius for a meeting hall
  for (let r = 0; r < window.MAP_ROWS; r++) {
    for (let c = 0; c < window.MAP_COLS; c++) {
      const hex = gameState.map[r][c];
      if (hex.building !== 'meeting_hall') continue;
      // Check if this meeting hall is in the same settlement's territory
      const d = window.cubeDistance(window.offsetToCube(c, r), window.offsetToCube(nearestSettlement.col, nearestSettlement.row));
      if (d <= window.TERRITORY_RADIUS) return true;
    }
  }
  return false;
}

/**
 * Monument commemoration dialog — lets the player choose what to commemorate.
 */
export function confirmBuildMonument(col, row) {
  const hex = gameState.map[row]?.[col];
  if (!hex || hex.building) return;

  const bDef = window.BUILDINGS.monument;
  const canAfford = gameState.resources.materials >= bDef.cost.materials;
  if (!canAfford) return;

  // Preset commemoration categories
  const categories = [
    { value: 'founding', label: '🏛️ Our Founding' },
    { value: 'ancestors', label: '👴 Our Ancestors' },
    { value: 'survival', label: '🔥 Survival & Resilience' },
    { value: 'unity', label: '🤝 Community Unity' },
    { value: 'nature', label: '🌿 The Natural World' },
    { value: 'victory', label: '⚔️ A Great Victory' },
  ];

  // Add recent Chronicle entries as options
  const recentEntries = (gameState.chronicle || []).slice(-10).reverse();
  const chronicleOptions = recentEntries.map((entry, i) => {
    const label = entry.text.length > 40 ? entry.text.substring(0, 40) + '…' : entry.text;
    return `<option value="chronicle_${i}">📜 ${label}</option>`;
  });

  const categoryOptions = categories.map(c => `<option value="${c.value}">${c.label}</option>`);

  const body = `<p>Build a <strong>Monument</strong> at (${col},${row})?</p>
    <p><strong>Cost:</strong> 🪵${bDef.cost.materials} materials · <strong>Time:</strong> ${bDef.buildTurns} turns (needs ${bDef.buildWorkers || 2} builders)</p>
    <p><strong>Effect:</strong> Identity +${bDef.permanentIdentityBonus} on completion (permanent, no workers needed)</p>
    <p style="margin-top:8px"><strong>Commemorate:</strong></p>
    <select id="monument-subject" style="width:100%;padding:6px;margin-top:4px;background:var(--panel-bg);color:var(--text-light);border:1px solid var(--border-color);border-radius:4px">
      ${categoryOptions.join('')}
      ${chronicleOptions.length > 0 ? '<option disabled>── Recent Events ──</option>' + chronicleOptions.join('') : ''}
    </select>`;

  window.showConfirmDialogNonDestructive(
    'Build Monument',
    body,
    'Build',
    'Cancel',
    () => {
      const selectEl = document.getElementById('monument-subject');
      const subject = selectEl ? selectEl.value : 'founding';

      // Resolve subject label for display
      let subjectLabel;
      if (subject.startsWith('chronicle_')) {
        const idx = parseInt(subject.replace('chronicle_', ''));
        subjectLabel = recentEntries[idx]?.text || 'A historic event';
      } else {
        subjectLabel = categories.find(c => c.value === subject)?.label || subject;
      }

      window.placeBuilding(col, row, 'monument');
      hex.monumentSubject = subjectLabel;

      if (window.addChronicleEntry) {
        window.addChronicleEntry(`Construction began on a monument commemorating ${subjectLabel}.`, 'cultural');
      }

      if (window.updateAllUI) window.updateAllUI();
      if (window.renderWorkersTab) window.renderWorkersTab();
      if (window.render) window.render();
      if (gameState.selectedHex) window.updateSidePanel(gameState.selectedHex);
    }
  );
}

export function confirmBuildSacredSite(col, row) {
  const hex = gameState.map[row]?.[col];
  if (!hex || hex.building) return;

  const bDef = window.BUILDINGS.sacred_site;
  const status = getSacredSiteReasonStatus(col, row);
  const canAfford = gameState.resources.materials >= bDef.cost.materials;

  const reasonRows = Object.entries(SACRED_REASONS).map(([key, def]) => {
    const s = status[key];
    return `<option value="${key}" ${s.available ? '' : 'disabled'}>${def.icon} ${def.label}</option>`;
  });

  const lockedNotes = Object.entries(SACRED_REASONS)
    .filter(([k]) => !status[k].available)
    .map(([k, def]) => `<li>${def.icon} ${def.label}: ${status[k].lockedReason}</li>`)
    .join('');

  // Select first available reason by default
  const firstAvailable = Object.keys(SACRED_REASONS).find(k => status[k].available);

  if (!firstAvailable) {
    window.showConfirmDialogNonDestructive(
      'Build Sacred Site',
      `<p>No sacred site dedications are currently available.</p>
       <ul style="margin:0.5em 0 0 1em;font-size:0.93em;">${lockedNotes}</ul>`,
      'OK', null, null
    );
    return;
  }

  window.showConfirmDialogNonDestructive(
    'Build Sacred Site',
    `<p>Construct a tended sacred site on this hex. When staffed, it generates <strong>Bonds +${bDef.bondsYield}/turn</strong> but consumes <strong>🪵${bDef.upkeepMaterials} material/turn</strong>.</p>
     <p><strong>Cost:</strong> 🪵${bDef.cost.materials} materials &nbsp;·&nbsp; <strong>Time:</strong> ${bDef.buildTurns} turns</p>
     <div class="tradition-customize">
       <div class="tradition-customize-row">
         <label class="tradition-customize-label" for="sacred-reason">Dedication:</label>
         <select id="sacred-reason" class="tradition-season-select">${reasonRows.join('')}</select>
       </div>
     </div>
     ${lockedNotes ? `<p style="font-size:0.88em;color:var(--text-dim);margin-top:4px">Locked: <ul style="margin:2px 0 0 1em;">${lockedNotes}</ul></p>` : ''}
     ${!canAfford ? `<p style="color:var(--text-danger)">⚠️ Not enough materials (need ${bDef.cost.materials}, have ${gameState.resources.materials}).</p>` : ''}`,
    'Build',
    'Cancel',
    () => {
      if (gameState.resources.materials < bDef.cost.materials) return;
      const reason = document.getElementById('sacred-reason')?.value || firstAvailable;
      if (!status[reason]?.available) return;

      // Mark this reason as built
      if (!gameState.culture.sacredSiteBuilt) gameState.culture.sacredSiteBuilt = {};
      gameState.culture.sacredSiteBuilt[reason] = true;

      window.placeBuilding(col, row, 'sacred_site');
      hex.sacredReason = reason;

      const reasonDef = SACRED_REASONS[reason];
      if (window.addChronicleEntry) {
        window.addChronicleEntry(
          `Construction began on a sacred site dedicated as a ${reasonDef.label.toLowerCase()}. ${reasonDef.desc}`,
          'cultural'
        );
      }
      if (gameState.selectedHex) window.updateSidePanel(gameState.selectedHex);
    }
  );
}

// ---- LANDSCAPE NAMING ----

export function isNameableTerrain(terrain) {
  return NAMEABLE_TERRAIN.has(terrain);
}

export function getNamedLake(clusterId) {
  return gameState.culture.namedFeatures.find(f => f.type === 'lake' && f.lakeCluster === clusterId) || null;
}

export function getNamedFeature(col, row) {
  // Lake features are stored by cluster ID, not by hex. Delegate to cluster lookup.
  const hex = gameState.map[row]?.[col];
  if (hex?.terrain === 'lake' && hex.lakeCluster != null && hex.lakeCluster >= 0) {
    return getNamedLake(hex.lakeCluster);
  }
  return gameState.culture.namedFeatures.find(f => f.col === col && f.row === row && f.type !== 'river') || null;
}

export function getNamedRiver(riverId) {
  return gameState.culture.namedFeatures.find(f => f.type === 'river' && f.riverId === riverId) || null;
}

export function nameFeature(col, row, name, type, riverId) {
  // Use != null (not truthiness) so riverId=0 is treated as a valid river ID.
  let existing;
  let lakeCluster = null;
  if (type === 'lake') {
    lakeCluster = gameState.map[row]?.[col]?.lakeCluster ?? null;
    existing = lakeCluster != null ? getNamedLake(lakeCluster) : getNamedFeature(col, row);
  } else if (riverId != null) {
    existing = getNamedRiver(riverId);
  } else {
    existing = getNamedFeature(col, row);
  }
  const isRename = !!existing;

  if (existing) {
    existing.name = name;
  } else {
    const entry = { type, col, row, riverId: riverId != null ? riverId : null, name };
    if (lakeCluster != null) entry.lakeCluster = lakeCluster;
    gameState.culture.namedFeatures.push(entry);
    gameState.cohesion.identity = Math.min(100, gameState.cohesion.identity + 1);
  }

  const featureLabel = type === 'river' ? 'river' : type;
  if (window.addChronicleEntry) {
    window.addChronicleEntry(
      isRename
        ? `The ${featureLabel} was renamed "${name}." Names bind a people to their land.`
        : `The people gave a name to the ${featureLabel}: "${name}." What is named is claimed. What is claimed is home. (Identity +1)`,
      'cultural'
    );
  }

  if (window.setMapDirty) window.setMapDirty(true);
  if (window.updateAllUI) window.updateAllUI();
}

// Find ALL rivers passing through or touching the given hex.
// Returns an array (may be empty). Handles the multi-river case: a hex can share
// edges with two different rivers (e.g. a lake terminus hex, or a ridge source hex).
export function getRiversAtHex(col, row) {
  const rivers = gameState.rivers || [];
  const found = new Map(); // id → river, deduplicated

  const hex = gameState.map[row]?.[col];

  // Primary: riverIds index stored on the hex during generation.
  if (hex?.riverIds?.length) {
    for (const id of hex.riverIds) {
      const river = rivers.find(r => r.id === id);
      if (river) found.set(river.id, river);
    }
  }

  // Secondary: check all 6 neighbours' riverIds for border-hex edge cases.
  if (hex?.hasRiver && window.hexNeighbor) {
    for (let e = 0; e < 6; e++) {
      const nb = window.hexNeighbor(col, row, e);
      if (!nb) continue;
      const nbHex = gameState.map[nb.row]?.[nb.col];
      if (!nbHex?.riverIds?.length) continue;
      for (const id of nbHex.riverIds) {
        if (!found.has(id)) {
          const river = rivers.find(r => r.id === id);
          if (river) found.set(river.id, river);
        }
      }
    }
  }

  // Tertiary: vertex proximity fallback for saves without riverIds.
  if (found.size === 0) {
    const hp = window.hexToPixel(col, row, window.HEX_SIZE);
    const threshold = window.HEX_SIZE * 2.0;
    for (const river of rivers) {
      for (const v of river.path) {
        if (Math.hypot(v.x - hp.x, v.y - hp.y) <= threshold) {
          found.set(river.id, river);
          break;
        }
      }
    }
  }

  return [...found.values()];
}

// Convenience: return the first river at a hex, or null. Used by legacy call sites.
export function getRiverAtHex(col, row) {
  const all = getRiversAtHex(col, row);
  return all.length > 0 ? all[0] : null;
}

// Name or rename the terrain feature at this hex (not the river).
// Lakes delegate to confirmNameLake so the whole cluster is named together.
export function confirmNameFeature(col, row) {
  const hex = gameState.map[row]?.[col];
  if (!hex || !isNameableTerrain(hex.terrain)) return;

  if (hex.terrain === 'lake') {
    confirmNameLake(col, row);
    return;
  }

  const featureLabel = hex.terrain.charAt(0).toUpperCase() + hex.terrain.slice(1);
  const existing = getNamedFeature(col, row);
  const isRename = !!existing;
  const bonusNote = isRename ? '' : '<p><em>Naming grants a one-time Identity +1. Names appear on the map.</em></p>';

  window.showConfirmDialogNonDestructive(
    `${isRename ? 'Rename' : 'Name'} this ${featureLabel}`,
    `${bonusNote}
     <div class="tradition-customize">
       <div class="tradition-customize-row">
         <label class="tradition-customize-label" for="feature-name">Name:</label>
         <input id="feature-name" class="tradition-name-input" value="${existing?.name || ''}" placeholder="Enter a name..." maxlength="40" />
       </div>
     </div>`,
    isRename ? 'Rename' : 'Name',
    'Cancel',
    () => {
      const name = document.getElementById('feature-name')?.value.trim();
      if (!name) return;
      nameFeature(col, row, name, hex.terrain, null);
      if (gameState.selectedHex) window.updateSidePanel(gameState.selectedHex);
      if (window.render) window.render();
    }
  );
}

// Name or rename a lake cluster. All hexes in the same connected lake share this name.
export function confirmNameLake(col, row) {
  const hex = gameState.map[row]?.[col];
  if (!hex || hex.terrain !== 'lake') return;

  const clusterId = hex.lakeCluster;
  const existing = clusterId != null ? getNamedLake(clusterId) : null;
  const isRename = !!existing;
  const bonusNote = isRename ? '' : '<p><em>Naming grants a one-time Identity +1. The name appears on all connected lake hexes as they are explored.</em></p>';

  window.showConfirmDialogNonDestructive(
    `${isRename ? 'Rename' : 'Name'} this Lake`,
    `${bonusNote}
     <div class="tradition-customize">
       <div class="tradition-customize-row">
         <label class="tradition-customize-label" for="feature-name">Name:</label>
         <input id="feature-name" class="tradition-name-input" value="${existing?.name || ''}" placeholder="Enter a name..." maxlength="40" />
       </div>
     </div>`,
    isRename ? 'Rename' : 'Name',
    'Cancel',
    () => {
      const name = document.getElementById('feature-name')?.value.trim();
      if (!name) return;
      nameFeature(col, row, name, 'lake', null);
      if (gameState.selectedHex) window.updateSidePanel(gameState.selectedHex);
      if (window.render) window.render();
    }
  );
}

// Name or rename a river. riverId is required — the side panel passes it explicitly
// so that hexes with multiple rivers each get their own button.
export function confirmNameRiver(col, row, riverId) {
  const river = (gameState.rivers || []).find(r => r.id === riverId);
  if (!river) return;

  const existing = getNamedRiver(river.id);
  const isRename = !!existing;
  const bonusNote = isRename ? '' : '<p><em>Naming a river grants a one-time Identity +1. The name appears along the river as it is explored.</em></p>';

  window.showConfirmDialogNonDestructive(
    isRename ? 'Rename this River' : 'Name this River',
    `${bonusNote}
     <div class="tradition-customize">
       <div class="tradition-customize-row">
         <label class="tradition-customize-label" for="feature-name">Name:</label>
         <input id="feature-name" class="tradition-name-input" value="${existing?.name || ''}" placeholder="Enter a name..." maxlength="40" />
       </div>
     </div>`,
    isRename ? 'Rename' : 'Name',
    'Cancel',
    () => {
      const name = document.getElementById('feature-name')?.value.trim();
      if (!name) return;
      nameFeature(col, row, name, 'river', river.id);
      if (gameState.selectedHex) window.updateSidePanel(gameState.selectedHex);
      if (window.render) window.render();
    }
  );
}

// ---- REGION SYSTEM ----

const MIN_REGION_DISTANCE = 4;  // minimum cubeDistance between region centers
const REGION_BASE_RADIUS = 1;   // starting radius (7 hexes)
const REGION_MAX_RADIUS = 3;    // max expansion (37 hexes)
const REGION_STRENGTH_DECAY = 0.5; // strength lost per turn with no activity
// Strength cost for each additional hex beyond the initial 7:
// hex N costs BASE + (N-1)*STEP
const REGION_EXPANSION_BASE = 10;
const REGION_EXPANSION_STEP = 5;

// Unique colors for region overlays (low-opacity washes)
const REGION_COLORS = [
  '#c8a03a', '#3a8cc8', '#c83a6e', '#3ac878',
  '#8a3ac8', '#3ac8c8', '#c85a3a', '#6e8ac8',
  '#a0c83a', '#c83aa0'
];

export function getRegionColor(regionId) {
  return REGION_COLORS[(regionId - 1) % REGION_COLORS.length];
}

// Get all hex keys within a given radius of a center hex
function getHexesInRadius(centerCol, centerRow, radius) {
  const hexes = [];
  const centerCube = window.offsetToCube(centerCol, centerRow);
  for (let r = 0; r < window.MAP_ROWS; r++) {
    for (let c = 0; c < window.MAP_COLS; c++) {
      const cube = window.offsetToCube(c, r);
      if (window.cubeDistance(centerCube, cube) <= radius) {
        const hex = gameState.map[r]?.[c];
        if (hex && hex.terrain !== 'ocean') {
          hexes.push(`${c},${r}`);
        }
      }
    }
  }
  return hexes;
}

// Returns the region that this hex is part of (strongest claim wins)
export function getRegionOwner(col, row) {
  const key = `${col},${row}`;
  let best = null;
  let bestStrength = -1;
  for (const region of (gameState.culture?.namedRegions || [])) {
    if (region.hexes.includes(key) && region.strength > bestStrength) {
      best = region;
      bestStrength = region.strength;
    }
  }
  return best;
}

// Returns the region centered exactly at this hex
export function getRegionAt(col, row) {
  return (gameState.culture?.namedRegions || []).find(
    r => r.centerCol === col && r.centerRow === row
  ) || null;
}

// Check if a region can be founded at the given hex
export function canFoundRegion(col, row) {
  const hex = gameState.map[row]?.[col];
  if (!hex || !hex.revealed) return false;
  if (hex.terrain === 'ocean' || hex.terrain === 'lake' || hex.terrain === 'coast') return false;
  if (!window.isInTerritory(col, row)) return false;

  // Check minimum distance from all existing region centers
  const centerCube = window.offsetToCube(col, row);
  for (const region of (gameState.culture?.namedRegions || [])) {
    const rCube = window.offsetToCube(region.centerCol, region.centerRow);
    if (window.cubeDistance(centerCube, rCube) < MIN_REGION_DISTANCE) {
      return false;
    }
  }
  return true;
}

// Found a new region — called after surveyor is consumed
export function foundRegion(col, row, name) {
  const hexes = getHexesInRadius(col, row, REGION_BASE_RADIUS);
  const region = {
    id: gameState.culture.nextRegionId++,
    name: name,
    centerCol: col,
    centerRow: row,
    hexes: hexes,
    strength: 0,
    foundedYear: gameState.year,
    foundedSeason: gameState.season
  };
  gameState.culture.namedRegions.push(region);

  // Identity bonus for naming
  gameState.cohesion.identity = Math.min(100, gameState.cohesion.identity + 2);

  if (window.addChronicleEntry) {
    window.addChronicleEntry(
      `The people named these lands "${name}." What is named is claimed. What is claimed is home. (Identity +2)`,
      'cultural'
    );
  }

  if (window.setMapDirty) window.setMapDirty(true);
  if (window.updateAllUI) window.updateAllUI();
  return region;
}

// Show the region founding confirmation dialog
export function showRegionFoundingConfirmation(col, row, unitId) {
  const hex = gameState.map[row]?.[col];
  if (!hex) return;

  // Find the unit by ID (passed from the action button)
  const unit = gameState.units.find(u => u.id === unitId);
  if (!unit || unit.type !== 'surveyor') return;

  window.showConfirmDialogNonDestructive(
    '🗺️ Name this Region',
    `<p><em>Your surveyor will claim this land and its surroundings. The region starts with 7 hexes and grows through activity.</em></p>
     <p><em>Founding grants Identity +2.</em></p>
     <div class="tradition-customize">
       <div class="tradition-customize-row">
         <label class="tradition-customize-label" for="region-name">Name:</label>
         <input id="region-name" class="tradition-name-input" value="" placeholder="Enter a name..." maxlength="40" />
       </div>
     </div>`,
    'Found Region',
    'Cancel',
    () => {
      const name = document.getElementById('region-name')?.value.trim();
      if (!name) return;

      // Consume the surveyor unit — return population to idle
      const unitType = window.UNIT_TYPES[unit.type];
      const index = gameState.units.findIndex(u => u.id === unit.id);
      if (index >= 0) {
        gameState.units.splice(index, 1);
        gameState.population.employed -= unitType.cost.population;
        gameState.population.idle += unitType.cost.population;
      }
      if (gameState.selectedUnit?.id === unit.id) {
        window.deselectUnit();
      }

      foundRegion(col, row, name);
      if (gameState.selectedHex) window.updateSidePanel(gameState.selectedHex);
      if (window.render) window.render();
    }
  );
}

// Per-turn region processing: strength accumulation, expansion, decay, competition
export function processRegions(report) {
  const regions = gameState.culture?.namedRegions;
  if (!regions || regions.length === 0) return;

  for (const region of regions) {
    let turnActivity = 0;

    // Scan hexes in region for activity
    for (const key of region.hexes) {
      const [c, r] = key.split(',').map(Number);
      const hex = gameState.map[r]?.[c];
      if (!hex) continue;

      // Workers on hex
      if (hex.workers > 0) {
        turnActivity += hex.workers;
      }

      // Completed buildings
      if (hex.building && hex.buildProgress <= 0) {
        turnActivity += 0.5;
      }

      // Sacred site workers get extra weight
      if (hex.building === 'sacred_site' && hex.buildProgress <= 0 && hex.workers > 0) {
        turnActivity += hex.workers * 0.5; // +0.5 extra per sacred site worker
      }
    }

    // Passive existence bonus
    turnActivity += 0.1;

    // Apply strength change
    if (turnActivity > 0.1) {
      // Active region — gain strength
      region.strength += turnActivity;
    } else {
      // Inactive region — decay
      region.strength = Math.max(0, region.strength - REGION_STRENGTH_DECAY);
    }

    // Check for expansion
    const baseHexCount = getHexesInRadius(region.centerCol, region.centerRow, REGION_BASE_RADIUS).length;
    const extraHexes = region.hexes.length - baseHexCount;
    const nextExpansionCost = REGION_EXPANSION_BASE + extraHexes * REGION_EXPANSION_STEP;

    // Can we expand? (strength must exceed cumulative cost of all extra hexes + next one)
    const cumulativeCost = getCumulativeExpansionCost(extraHexes + 1);
    const maxRadius3Hexes = getHexesInRadius(region.centerCol, region.centerRow, REGION_MAX_RADIUS);

    if (region.strength >= cumulativeCost && region.hexes.length < maxRadius3Hexes.length) {
      // Find best candidate hex to add
      const candidate = findBestExpansionHex(region, maxRadius3Hexes);
      if (candidate) {
        region.hexes.push(candidate);
        if (window.setMapDirty) window.setMapDirty(true);

        if (report) {
          report.events.push(`🗺️ ${region.name} grows. Your people's connection to the land deepens.`);
        }
        if (window.addChronicleEntry) {
          window.addChronicleEntry(
            `The region known as "${region.name}" expanded as the people's presence grew.`,
            'cultural'
          );
        }
      }
    }

    // Check for contraction (strength too low to maintain extra hexes)
    if (extraHexes > 0) {
      const maintainCost = getCumulativeExpansionCost(extraHexes);
      if (region.strength < maintainCost * 0.5) {
        // Shed outermost hex (farthest from center, then least activity)
        const shed = findWorstHex(region);
        if (shed) {
          region.hexes = region.hexes.filter(h => h !== shed);
          if (window.setMapDirty) window.setMapDirty(true);

          if (report) {
            report.events.push(`🗺️ The memory of the outer ${region.name} fades as the people turn away.`);
          }
          if (window.addChronicleEntry) {
            window.addChronicleEntry(
              `The edges of "${region.name}" contracted as activity waned.`,
              'cultural'
            );
          }
        }
      }
    }
  }

  // Resolve contested hexes — remove hex from weaker region if two regions both claim it
  resolveContestedHexes(regions);
}

function getCumulativeExpansionCost(n) {
  // Cost for n extra hexes: sum of (BASE + i*STEP) for i=0..n-1
  if (n <= 0) return 0;
  return n * REGION_EXPANSION_BASE + REGION_EXPANSION_STEP * n * (n - 1) / 2;
}

function findBestExpansionHex(region, maxHexes) {
  const regionSet = new Set(region.hexes);
  const candidates = [];

  for (const key of maxHexes) {
    if (regionSet.has(key)) continue;

    const [c, r] = key.split(',').map(Number);
    const hex = gameState.map[r]?.[c];
    if (!hex || hex.terrain === 'ocean') continue;

    // Must be adjacent to at least one existing region hex
    let adjacent = false;
    for (let e = 0; e < 6; e++) {
      const nb = window.hexNeighbor(c, r, e);
      if (regionSet.has(`${nb.col},${nb.row}`)) {
        adjacent = true;
        break;
      }
    }
    if (!adjacent) continue;

    // Score: workers + buildings + proximity to center
    let score = 0;
    if (hex.workers > 0) score += hex.workers * 3;
    if (hex.building && hex.buildProgress <= 0) score += 2;
    // Slight preference for closer hexes
    const dist = window.cubeDistance(
      window.offsetToCube(c, r),
      window.offsetToCube(region.centerCol, region.centerRow)
    );
    score -= dist * 0.5;

    candidates.push({ key, score });
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].key;
}

function findWorstHex(region) {
  const baseHexes = new Set(getHexesInRadius(region.centerCol, region.centerRow, REGION_BASE_RADIUS));
  let worst = null;
  let worstScore = Infinity;

  for (const key of region.hexes) {
    if (baseHexes.has(key)) continue; // Never shed base hexes

    const [c, r] = key.split(',').map(Number);
    const hex = gameState.map[r]?.[c];
    const dist = window.cubeDistance(
      window.offsetToCube(c, r),
      window.offsetToCube(region.centerCol, region.centerRow)
    );

    // Score: distance from center (higher = more likely to shed), minus activity
    let score = dist * 2;
    if (hex && hex.workers > 0) score -= hex.workers * 3;
    if (hex && hex.building && hex.buildProgress <= 0) score -= 2;

    // We want to shed the hex with the HIGHEST score (farthest, least active)
    // But we're tracking worstScore as the one to shed, so we want max score
    if (worst === null || score > worstScore) {
      worst = key;
      worstScore = score;
    }
  }
  return worst;
}

function resolveContestedHexes(regions) {
  // Build a map of hex -> [regions claiming it]
  const hexClaims = new Map();
  for (const region of regions) {
    for (const key of region.hexes) {
      if (!hexClaims.has(key)) hexClaims.set(key, []);
      hexClaims.get(key).push(region);
    }
  }

  // For contested hexes, keep only in the strongest region
  for (const [key, claimants] of hexClaims) {
    if (claimants.length <= 1) continue;

    // Sort by strength descending
    claimants.sort((a, b) => b.strength - a.strength);
    const winner = claimants[0];

    // Base hexes (radius 1) can never be removed — skip those
    for (let i = 1; i < claimants.length; i++) {
      const loser = claimants[i];
      const baseHexes = new Set(getHexesInRadius(loser.centerCol, loser.centerRow, REGION_BASE_RADIUS));
      if (!baseHexes.has(key)) {
        loser.hexes = loser.hexes.filter(h => h !== key);
      }
    }
  }
}

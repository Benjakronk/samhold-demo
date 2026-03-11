// ---- CHRONICLE SYSTEM ----
// A narrative log of the society's history. Records significant events,
// choices, crises, and milestones in story-like language.
// The Chronicle is infrastructure for the cultural systems that follow.

let gameState = null;

const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];

export function initChronicle(gameStateRef) {
  gameState = gameStateRef;

  // Initialize chronicle array if not present (e.g. fresh game)
  if (!gameState.chronicle) {
    gameState.chronicle = [];
  }

  // Set up close button
  const closeBtn = document.getElementById('chronicle-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => window.closeChronicle());
  }

  // Background click to close
  const overlay = document.getElementById('chronicle-overlay');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) window.closeChronicle();
    });
  }

  // Filter buttons
  const filterContainer = document.getElementById('chronicle-filters');
  if (filterContainer) {
    filterContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.chronicle-filter');
      if (!btn) return;
      btn.classList.toggle('active');
      renderChronicleEntries();
    });
  }
}

// ---- ENTRY MANAGEMENT ----

/**
 * Add a Chronicle entry.
 * @param {string} text - The narrative text
 * @param {string} category - One of: founding, event, cultural, governance, crisis, milestone, death, military
 */
export function addChronicleEntry(text, category = 'event') {
  if (!gameState) return;
  if (!gameState.chronicle) gameState.chronicle = [];

  gameState.chronicle.push({
    turn: gameState.turn,
    year: gameState.year,
    season: SEASONS[gameState.season],
    text,
    category
  });
}

/**
 * Generate Chronicle entries from a completed turn report.
 * Called after processTurn() finishes, translating mechanical events into narrative.
 */
export function recordTurnInChronicle(report) {
  if (!gameState || !report) return;

  const season = SEASONS[gameState.season];
  const year = gameState.year;

  // Buildings completed
  for (const bld of report.buildingsCompleted) {
    addChronicleEntry(
      `A new ${bld.name} was completed, expanding our settlement's capabilities.`,
      'milestone'
    );
  }

  // Starvation deaths
  if (report.childDeaths > 0 || report.adultDeaths > 0) {
    const totalDeaths = report.childDeaths + report.adultDeaths;
    if (report.childDeaths > 0 && report.adultDeaths > 0) {
      addChronicleEntry(
        `Famine claimed ${totalDeaths} lives — ${report.childDeaths} children and ${report.adultDeaths} adults perished. The survivors carry this grief forward.`,
        'crisis'
      );
    } else if (report.childDeaths > 0) {
      addChronicleEntry(
        `${report.childDeaths} children were lost to starvation. The youngest paid the price of scarcity.`,
        'crisis'
      );
    } else {
      addChronicleEntry(
        `${report.adultDeaths} adults died of starvation. The settlement grows quieter.`,
        'crisis'
      );
    }
  }

  // Births
  if (report.childBirths > 0) {
    // Only chronicle notable births (3+ or first ever)
    const isFirst = gameState.chronicle && !gameState.chronicle.some(e => e.text.includes('born'));
    if (report.childBirths >= 3 || isFirst) {
      addChronicleEntry(
        `${report.childBirths} children were born this ${season.toLowerCase()}${isFirst ? ' — the first generation of our settlement' : ', a sign of growth'}.`,
        'milestone'
      );
    }
  }

  // Graduation
  if (report.graduated > 0) {
    addChronicleEntry(
      `${report.graduated} young people came of age and joined the workforce. A new generation takes its place.`,
      'milestone'
    );
  }

  // Winter hardship
  if (report.winterCost > 0 && report.winterCost > gameState.population.total) {
    addChronicleEntry(
      `A bitter winter consumed ${report.winterCost} food from our stores. The cold tested our resolve.`,
      'crisis'
    );
  }

  // Governance transition completed (check report events for the governance message)
  // This is handled separately via addGovernanceChronicle

  // Event outcomes from last turn
  if (gameState.eventOutcomesForNextSummary && gameState.eventOutcomesForNextSummary.length > 0) {
    for (const outcome of gameState.eventOutcomesForNextSummary) {
      addChronicleEntry(
        `${outcome.title} — The people chose to "${outcome.choice}."`,
        'event'
      );
    }
  }
}

/**
 * Record a governance model change in the Chronicle.
 */
export function addGovernanceChronicle(oldModelKey, newModelKey) {
  const oldName = window.GOVERNANCE_MODELS[oldModelKey]?.name || oldModelKey;
  const newName = window.GOVERNANCE_MODELS[newModelKey]?.name || newModelKey;
  addChronicleEntry(
    `A great change swept through the settlement. The ${oldName} was dissolved, and a ${newName} rose to take its place. The transition shook the foundations of authority.`,
    'governance'
  );
}

/**
 * Record the founding entry at game start.
 */
export function addFoundingEntry() {
  if (!gameState) return;
  addChronicleEntry(
    'A small band of settlers arrived at an untamed land and established their first settlement. The story of our people begins here.',
    'founding'
  );
}

// ---- UI RENDERING ----

const CATEGORY_LABELS = {
  founding: { label: 'Founding', icon: '🏠', color: 'var(--text-gold)' },
  event: { label: 'Event', icon: '📜', color: 'var(--text-light)' },
  cultural: { label: 'Culture', icon: '🎭', color: 'var(--pillar-identity)' },
  governance: { label: 'Governance', icon: '⚖️', color: 'var(--pillar-legitimacy)' },
  crisis: { label: 'Crisis', icon: '⚠️', color: 'var(--accent-red)' },
  milestone: { label: 'Milestone', icon: '🏛️', color: 'var(--accent-green)' },
  death: { label: 'Death', icon: '💀', color: '#888' },
  military: { label: 'Military', icon: '⚔️', color: '#c47' }
};

export function openChronicle() {
  // Ensure we're on the log tab
  document.querySelectorAll('.chronicle-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === 'log'));
  document.querySelectorAll('.chronicle-tab-panel').forEach(p => p.classList.toggle('active', p.id === 'chronicle-log-panel'));
  renderChronicleEntries();
  const overlay = document.getElementById('chronicle-overlay');
  if (overlay) overlay.classList.add('visible');
}

export function closeChronicle() {
  const overlay = document.getElementById('chronicle-overlay');
  if (overlay) overlay.classList.remove('visible');
}

export function renderChronicleEntries() {
  const content = document.getElementById('chronicle-entries');
  if (!content || !gameState) return;

  const entries = gameState.chronicle || [];

  // Get active filters
  const filterContainer = document.getElementById('chronicle-filters');
  const activeFilters = filterContainer
    ? Array.from(filterContainer.querySelectorAll('.chronicle-filter.active')).map(btn => btn.dataset.category)
    : [];
  const filterAll = activeFilters.length === 0;

  // Filter entries
  const filtered = filterAll ? entries : entries.filter(e => activeFilters.includes(e.category));

  if (filtered.length === 0) {
    content.innerHTML = '<div class="chronicle-empty">The chronicle is empty. Your story has yet to be written.</div>';
    return;
  }

  // Group by year
  const byYear = {};
  for (const entry of filtered) {
    const key = entry.year;
    if (!byYear[key]) byYear[key] = [];
    byYear[key].push(entry);
  }

  // Render newest first
  const years = Object.keys(byYear).sort((a, b) => b - a);
  let html = '';

  for (const year of years) {
    html += `<div class="chronicle-year-group">`;
    html += `<div class="chronicle-year-header">Year ${year}</div>`;

    for (const entry of byYear[year].reverse()) {
      const cat = CATEGORY_LABELS[entry.category] || CATEGORY_LABELS.event;
      html += `<div class="chronicle-entry">
        <div class="chronicle-entry-meta">
          <span class="chronicle-entry-time">${entry.season}</span>
          <span class="chronicle-entry-badge" style="color:${cat.color}">${cat.icon} ${cat.label}</span>
        </div>
        <div class="chronicle-entry-text">${entry.text}</div>
      </div>`;
    }

    html += `</div>`;
  }

  content.innerHTML = html;
}

/**
 * Get a short narrative summary of the civilization for post-game.
 */
export function getChronicleNarrative() {
  if (!gameState || !gameState.chronicle) return '';

  const crises = gameState.chronicle.filter(e => e.category === 'crisis').length;
  const milestones = gameState.chronicle.filter(e => e.category === 'milestone').length;
  const govChanges = gameState.chronicle.filter(e => e.category === 'governance').length;

  const parts = [];
  parts.push(`Over ${gameState.year} years, the chronicle recorded ${gameState.chronicle.length} entries.`);
  if (milestones > 0) parts.push(`${milestones} milestones marked the society's growth.`);
  if (crises > 0) parts.push(`${crises} crises tested the people's resolve.`);
  if (govChanges > 0) parts.push(`${govChanges} changes in governance reshaped how they were led.`);

  return parts.join(' ');
}

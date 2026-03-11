// Settings & Notifications System for Samhold
// Handles settings overlay, return to menu, notifications, and related event listeners
// Extracted from main game file for modular architecture

function openSettings() {
  window.closeGameMenu();
  document.getElementById('settings-overlay').classList.add('visible');
}

function returnToMainMenu() {
  // Placeholder for future implementation
  window.closeGameMenu();
}

// ---- NOTIFICATION SYSTEM ----
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;

  const colors = {
    success: '#5a8a4a',
    error: '#a94442',
    warning: '#c9a84c',
    info: '#4a7a9a'
  };

  notification.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    z-index: 1000;
    padding: 12px 16px;
    background: var(--bg-panel);
    border: 1px solid ${colors[type]};
    border-radius: 4px;
    color: var(--text-light);
    font-family: 'Nunito Sans', sans-serif;
    font-size: 14px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    animation: slideInFromRight 0.3s ease;
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOutToRight 0.3s ease forwards';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// ---- UI SCALE ----

function getMaxUIScale() {
  const maxPanelWidth = window.innerWidth * 0.35;
  const maxScale = maxPanelWidth / 300;
  const maxBarHeight = window.innerHeight * 0.3;
  const maxScaleV = maxBarHeight / 56;
  return Math.min(Math.floor(Math.min(maxScale, maxScaleV) * 100), 160);
}

function clampTopBar(uiScale) {
  const bar = document.getElementById('top-bar');
  let tbScale = uiScale;
  bar.style.zoom = tbScale;
  while (bar.scrollWidth > bar.clientWidth + 2 && tbScale > 0.8) {
    tbScale = Math.round((tbScale - 0.05) * 100) / 100;
    bar.style.zoom = tbScale;
  }
  document.documentElement.style.setProperty('--topbar-scale', tbScale);
  return tbScale;
}

function applyUIScale(percent) {
  const maxPercent = getMaxUIScale();
  percent = Math.max(80, Math.min(percent, maxPercent));
  const scale = percent / 100;
  document.documentElement.style.setProperty('--ui-scale', scale);
  clampTopBar(scale);
  const slider = document.getElementById('ui-scale-slider');
  slider.value = percent;
  slider.max = maxPercent;
  document.getElementById('ui-scale-val').textContent = percent + '%';
  document.getElementById('scale-up').disabled = percent >= maxPercent;
  document.getElementById('scale-down').disabled = percent <= 80;
  requestAnimationFrame(() => { window.resizeCanvas(); if (window.render) window.render(); });
  try { localStorage.setItem('samhold-ui-scale', percent); } catch(e) {}
}

// Inject CSS animations for notifications
function initSettings() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideInFromRight {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutToRight {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
  `;
  document.head.appendChild(style);

  // Settings close button
  document.getElementById('settings-close').addEventListener('click', () => {
    document.getElementById('settings-overlay').classList.remove('visible');
    document.getElementById('game-menu-overlay').classList.add('visible');
  });

  // Settings overlay background click
  document.getElementById('settings-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('settings-overlay')) {
      document.getElementById('settings-overlay').classList.remove('visible');
      document.getElementById('game-menu-overlay').classList.add('visible');
    }
  });

  // Save/Load Panel Event Listeners
  document.getElementById('saveload-close').addEventListener('click', () => window.closeSaveLoadPanel());

  document.getElementById('saveload-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('saveload-overlay')) {
      window.closeSaveLoadPanel();
    }
  });

  // Save input enter key support
  document.getElementById('save-name-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      window.performSave();
    }
  });

  // UI Scale controls
  document.getElementById('ui-scale-slider').addEventListener('input', (e) => {
    applyUIScale(parseInt(e.target.value));
  });

  document.getElementById('scale-up').addEventListener('click', () => {
    applyUIScale(parseInt(document.getElementById('ui-scale-slider').value) + 5);
  });

  document.getElementById('scale-down').addEventListener('click', () => {
    applyUIScale(parseInt(document.getElementById('ui-scale-slider').value) - 5);
  });

  window.addEventListener('resize', () => {
    applyUIScale(parseInt(document.getElementById('ui-scale-slider').value));
  });

  // Restore saved UI scale
  try {
    const saved = localStorage.getItem('samhold-ui-scale');
    if (saved) applyUIScale(parseInt(saved));
  } catch(e) {}

  // Hint toggle state
  try {
    const hintsDisabled = localStorage.getItem('samhold_tutorial_disabled') === 'true';
    document.getElementById('hints-toggle').checked = !hintsDisabled;
  } catch(e) {}

  document.getElementById('hints-toggle').addEventListener('change', (e) => {
    try {
      localStorage.setItem('samhold_tutorial_disabled', e.target.checked ? 'false' : 'true');
    } catch(err) {}
  });
}

export {
  initSettings,
  openSettings,
  returnToMainMenu,
  showNotification,
  applyUIScale,
  getMaxUIScale,
  clampTopBar
};

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

  // Tab switching
  document.querySelectorAll('.saveload-tab').forEach(t => {
    t.onclick = () => window.switchSaveLoadTab(t.dataset.tab);
  });

  // Save input enter key support
  document.getElementById('save-name-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      window.performSave();
    }
  });
}

export {
  initSettings,
  openSettings,
  returnToMainMenu,
  showNotification
};

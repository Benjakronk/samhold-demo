// Tutorial System for Samhold
// Handles tutorial hints and modal display for new players
// Extracted from main game file for modular architecture

let gameState = null;

function initTutorial(gameStateRef) {
  gameState = gameStateRef;
}

function showTutorialHint() {
  const turn = gameState.turn;
  let hintText = null;

  // Tutorial hints for first several turns
  switch (turn) {
    case 1:
      hintText = {
        title: "Welcome to Samhold!",
        content: "Your small tribe has settled in this fertile land. Click on the hexes around your settlement to explore them. Look for good spots to assign workers for food and materials.",
        highlight: "exploration",
      };
      console.log("DEBUG: hintText 1 displayed");
      break;

    case 2:
      hintText = {
        title: "Managing Resources",
        content: "Your people need 2 food per person each turn. Check your resource bars at the top - if food goes negative, people will starve. Assign workers to grassland hexes to gather food.",
        highlight: "resources"
      };
      console.log("DEBUG: hintText 2 displayed");
      break;

    case 3:
      hintText = {
        title: "Winter Is Coming",
        content: "Winter arrives next turn! Your people will need extra food to survive the cold months. Make sure you have a surplus stored — winter can cost additional food beyond normal consumption. Consider building a Farm on grassland for stable food production.",
        highlight: "seasons"
      };
      break;

    case 5:
      hintText = {
        title: "Cohesion Matters",
        content: "The colored bars at the top show your society's Cohesion - how united your people are. Identity, Legitimacy, Satisfaction, and Bonds all matter. If total cohesion falls too low, your society may collapse!",
        highlight: "cohesion"
      };
      break;

    case 8:
      if (gameState.childCohorts.length === 0) {
        hintText = {
          title: "Growing Your Population",
          content: "Your population grows through births each season, but children take years to become workers. Keep your people fed and happy to encourage steady population growth.",
          highlight: "population"
        };
      }
      break;

    case 12:
      hintText = {
        title: "New Arrivals",
        content: "As word of your settlement spreads, immigrants may begin arriving. Check the Immigration tab in the Governance panel to manage newcomers. They go through integration stages before becoming full members of your society.",
        highlight: "immigration"
      };
      break;

    case 15:
      if (gameState.governance.model === 'tribalCouncil') {
        hintText = {
          title: "Governance and Policies",
          content: "As your society grows, you may want to change your governance model. Check the Society tab in the side panel to explore different forms of leadership and policies.",
          highlight: "governance"
        };
      }
      break;

    case 18:
      if (gameState.childCohorts.length > 0) {
        hintText = {
          title: "Working Age Policy",
          content: "You have children growing up! Consider adjusting your Working Age policy in the Society panel. Lower ages provide workers faster but may reduce satisfaction and knowledge growth.",
          highlight: "working-age"
        };
      }
      break;
  }

  if (hintText) {
    showTutorialModal(hintText);
  }
}

function showTutorialModal(hint) {
  // Check if player has disabled tutorial hints
  if (localStorage.getItem('samhold_tutorial_disabled') === 'true') {
    return;
  }

  const overlay = document.createElement('div');
  overlay.id = 'tutorial-overlay';
  overlay.innerHTML = `
    <div class="tutorial-dialog">
      <div class="tutorial-header">
        <h3>${hint.title}</h3>
        <button class="tutorial-close" onclick="closeTutorial()">&times;</button>
      </div>
      <div class="tutorial-content">
        <div class="tutorial-icon">\u{1F4A1}</div>
        <div class="tutorial-text">${hint.content}</div>
      </div>
      <div class="tutorial-actions">
        <label class="tutorial-disable">
          <input type="checkbox" id="tutorial-disable-check"> Don't show more hints
        </label>
        <button onclick="closeTutorial()" class="tutorial-ok">Got it!</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Add event listener for disable checkbox
  document.getElementById('tutorial-disable-check').addEventListener('change', function() {
    if (this.checked) {
      localStorage.setItem('samhold_tutorial_disabled', 'true');
    } else {
      localStorage.removeItem('samhold_tutorial_disabled');
    }
  });
}

function closeTutorial() {
  const overlay = document.getElementById('tutorial-overlay');
  if (overlay) {
    overlay.remove();
  }
}

export {
  initTutorial,
  showTutorialHint,
  showTutorialModal,
  closeTutorial
};

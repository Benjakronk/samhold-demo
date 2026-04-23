// Policy Wizard — first-turn narrative policy setup
// Presents 4 scenario-based questions to establish founding policies
// Choices apply instantly (no policy lag) since these are founding decisions
// Each policy has multiple scenario variants chosen at random per game

let gameState = null;
let wizardCallback = null;
let currentStep = 0;
let accumulated = {}; // policy -> value, written on finish
let pendingChoice = null; // current step's selection, committed on Continue
let selectedQuestions = null; // randomized per game

// ---- SCENARIO DATA ----
// Each policy has 3 scenario variants. One is chosen at random per game.
// Choices within each scenario are ordered low→high for the policy value.

const FREEDOM_SCENARIOS = [
  {
    title: 'The First Dispute',
    narrative: 'Two families argue over who may fish from the river bend. One claims they found it first; the other says the river belongs to everyone. The elders look to you.',
    choices: [
      { text: 'All resources belong to the community', description: 'Nothing is private. The group allocates as it sees fit.', value: 15, flavor: 'Total control. Efficient, perhaps — but who watches the watchers?' },
      { text: 'The elders will decide such matters', description: 'Disputes are settled by the council. Order before freedom.', value: 35, flavor: 'A murmur of acceptance — structure brings safety, but also constraint.' },
      { text: 'Whoever works the land, keeps it', description: 'A middle path — effort earns rights, but the community sets limits.', value: 50, flavor: 'A pragmatic compromise. Neither fully free nor fully controlled.' },
      { text: 'The river is shared by all — freely', description: 'No one owns the land. All may use it as they wish.', value: 75, flavor: 'Your people nod — freedom, but also uncertainty about who decides.' }
    ]
  },
  {
    title: 'The Hilltop',
    narrative: 'A family has built a shelter on the best hilltop in your territory — the one with a clear view for miles. Others grumble: "That vantage belongs to all of us, not one family."',
    choices: [
      { text: 'No one may claim land without the council\'s say', description: 'Every plot, every shelter — all placement is decided collectively.', value: 15, flavor: 'Order prevails. But the family tears down their shelter in silence.' },
      { text: 'The council assigns the best spots', description: 'Key locations are managed for the common good. Others may settle freely.', value: 35, flavor: 'The hilltop becomes a watchtower for all. The family is moved — but compensated.' },
      { text: 'First come, first served — but share the view', description: 'The family keeps the spot. But they must allow others access.', value: 55, flavor: 'A tense peace. Property with obligations — the beginning of something complex.' },
      { text: 'They built it, they keep it', description: 'If you want a hilltop, find your own. Initiative is rewarded.', value: 80, flavor: 'The ambitious are emboldened. The slow learners grow resentful.' }
    ]
  },
  {
    title: 'The Gathering',
    narrative: 'It is time to decide how the daily work is organized. Some want a single plan made each morning by the elders. Others prefer each family to decide for themselves what to do.',
    choices: [
      { text: 'The elders assign all tasks at dawn', description: 'Coordinated effort. Everyone knows their role. No wasted labor.', value: 20, flavor: 'The settlement runs like a single body. But some hands itch for autonomy.' },
      { text: 'General duties are assigned; details left to families', description: 'A framework of expectations, with room for personal choice.', value: 45, flavor: 'Structure where it matters, freedom where it doesn\'t. For now, it holds.' },
      { text: 'Each family decides their own work', description: 'Freedom to choose — and freedom to fail. No one is told what to do.', value: 75, flavor: 'Energy and chaos in equal measure. Some thrive; others drift.' }
    ]
  }
];

const MERCY_SCENARIOS = [
  {
    title: 'The Stolen Food',
    narrative: 'A young man is caught stealing dried fish from the storehouse. His family is hungry — his mother is ill and cannot gather. The people demand you set a precedent.',
    choices: [
      { text: 'Punish him publicly as a warning', description: 'Harsh, but clear. No one will steal again.', value: 20, flavor: 'Fear is effective. But fear has a cost measured in bonds broken.' },
      { text: 'He must work to repay what he took', description: 'A proportional response — justice, but not cruelty.', value: 50, flavor: 'Fair enough. The debt is repaid, the lesson taught.' },
      { text: 'Forgive him — and help his family', description: 'Compassion over punishment. The community will provide.', value: 80, flavor: 'Mercy wins hearts, but some wonder if others will follow his example.' }
    ]
  },
  {
    title: 'The Broken Tool',
    narrative: 'A worker carelessly broke the settlement\'s best axe — one that took days to craft. The toolmaker is furious and demands the worker be banned from using shared tools for a season.',
    choices: [
      { text: 'Ban him and make an example', description: 'Carelessness has consequences. Others will be more careful.', value: 20, flavor: 'The worker sits idle for weeks, watching others. The tools stay sharp — but resentment builds.' },
      { text: 'He replaces what he broke', description: 'Proportional justice. Fix the harm, move on.', value: 50, flavor: 'He spends three days crafting a new axe. Rough, but functional. The matter is closed.' },
      { text: 'Accidents happen — help him learn', description: 'The toolmaker teaches him proper handling. No punishment.', value: 80, flavor: 'The worker becomes the toolmaker\'s apprentice. But others grow less careful with shared goods.' }
    ]
  },
  {
    title: 'The Night Watch',
    narrative: 'A man assigned to night watch fell asleep, and a fox got into the food stores. The damage was small — a few fish lost — but the principle looms large.',
    choices: [
      { text: 'Double his watch shifts as punishment', description: 'Failure on duty must be met with discipline.', value: 15, flavor: 'He endures the extra shifts in grim silence. No one sleeps on watch again — for a while.' },
      { text: 'He replaces the lost food from his own share', description: 'Make good the damage, nothing more.', value: 45, flavor: 'A hungry week for him. The ledger balances.' },
      { text: 'Let it go — it was a fox, not a raid', description: 'Perspective matters. Save severity for what truly threatens.', value: 70, flavor: 'Some nod at your wisdom. Others mutter that standards are slipping already.' },
      { text: 'Thank him for his other nights of service', description: 'One mistake does not erase dedication. Acknowledge the good.', value: 85, flavor: 'The man is moved. He volunteers for extra watch. But is this kindness or naivety?' }
    ]
  }
];

const TRADITION_SCENARIOS = [
  {
    title: 'The Strange Fruit',
    narrative: 'A scout returns with seeds from an unknown plant found beyond your territory. Some elders insist your ancestors thrived on proven crops. Younger voices want to experiment.',
    choices: [
      { text: 'Plant the new seeds — we must adapt', description: 'Innovation and risk. The unknown might save you, or fail you.', value: 20, flavor: 'Progress demands courage. The old ways were new once, too.' },
      { text: 'Plant a small test plot alongside our crops', description: 'Cautious innovation — honor the old while testing the new.', value: 50, flavor: 'A careful balance. Neither reckless nor rigid.' },
      { text: 'Keep our proven ways', description: 'Your ancestors survived for generations. Trust their wisdom.', value: 80, flavor: 'Tradition is the memory of a people. It kept you alive this long.' }
    ]
  },
  {
    title: 'The New Shelter',
    narrative: 'A young builder proposes a new design for shelters — lighter, faster to build, but untested against winter storms. The older builders shake their heads. "We know what works."',
    choices: [
      { text: 'Build the new design', description: 'If it works, everyone benefits. If it fails — a hard lesson.', value: 20, flavor: 'The first new shelter goes up in half the time. Now all eyes watch the horizon for storms.' },
      { text: 'Build one new, keep the rest traditional', description: 'Test the idea without betting everything on it.', value: 50, flavor: 'Wisdom, perhaps. Or the slow death of boldness by committee.' },
      { text: 'Follow the proven design', description: 'Your shelters have weathered every storm so far.', value: 80, flavor: 'The builder\'s shoulders sag. But when the first storm hits, no one regrets strong walls.' }
    ]
  },
  {
    title: 'The Old Song',
    narrative: 'Around the fire, a young woman sings a melody no one has heard before — her own creation. An elder interrupts: "That is not how the song goes. Sing it properly, or not at all."',
    choices: [
      { text: '"Sing what moves you"', description: 'Art belongs to the living, not the dead. Let new voices rise.', value: 15, flavor: 'The melody is beautiful. Something old stirs in the elders\' eyes — is it admiration, or loss?' },
      { text: '"Sing the old song first, then your own"', description: 'Honor what came before. Then add to it.', value: 50, flavor: 'Two songs around the fire tonight. The past and the future, side by side.' },
      { text: '"The old songs bind us — sing them as they were"', description: 'Tradition is identity. Change the songs, change who you are.', value: 85, flavor: 'The young woman falls silent. The old song rises, familiar and whole. But something was lost tonight.' }
    ]
  }
];

const WORKING_AGE_SCENARIOS = [
  {
    title: 'The Children at the River',
    narrative: 'Dawn breaks and the children play by the water while adults work the fields. A mother speaks up: "My daughter is strong for her age. She could carry water." Another replies: "Let them be children a while longer."',
    choices: [
      { text: '"Every hand is needed — even the young ones"', description: 'Children as young as 6 begin light work. More hands, but childhood cut short.', value: 6, flavor: 'Survival demands sacrifice. Throughout history, children worked as soon as they could walk.' },
      { text: '"Old enough to learn a trade, old enough to contribute"', description: 'Children begin working around 10. A balance of youth and necessity.', value: 10, flavor: 'A common compromise across many early societies.' },
      { text: '"Children should learn before they labor"', description: 'Working age set to 14. More time for growth, fewer workers now.', value: 14, flavor: 'An investment in the future — but the present demands food on the table.' },
      { text: '"Let childhood last — the adults will manage"', description: 'Only those 16 and older work. A luxury few early societies could afford.', value: 16, flavor: 'A bold choice. Your workforce will be smaller, but your children will thank you.' }
    ]
  },
  {
    title: 'The Apprentice\'s Question',
    narrative: 'The toolmaker wants an apprentice. The best candidate is 8 years old — quick hands, sharp eyes. Her parents are torn: she could learn a valuable trade, or she could have a few more years of play.',
    choices: [
      { text: '"She should start now — talent waits for no one"', description: 'Young children learn trades early. The settlement gains skilled hands sooner.', value: 6, flavor: 'She takes to the work with frightening speed. But she never quite learns how to play.' },
      { text: '"Let her begin when she\'s a bit older"', description: 'Around age 10, children are ready for real responsibility.', value: 10, flavor: 'She watches the toolmaker from afar for two more years — then surpasses every expectation.' },
      { text: '"There\'s time yet — let her grow first"', description: 'Childhood until 14. She\'ll be stronger and wiser when she starts.', value: 14, flavor: 'When she finally picks up the tools, her hands are sure and her mind is clear.' },
      { text: '"Childhood is not a luxury — it is a right"', description: 'No work until 16. Let them be children, fully and completely.', value: 16, flavor: 'The other settlements have more hands. Yours has something harder to measure.' }
    ]
  },
  {
    title: 'The Harvest Shortfall',
    narrative: 'The harvest is smaller than expected. As adults work longer hours, the older children watch from the edge of the fields. A father says: "They could help carry the grain, at least." A teacher replies: "And who will teach them to count it?"',
    choices: [
      { text: '"Put them to work — we need every pair of hands"', description: 'From age 6, children contribute to the settlement\'s survival.', value: 6, flavor: 'The grain comes in faster. But the counting lessons stop, and nobody notices — yet.' },
      { text: '"The older ones can help — but keep the young ones learning"', description: 'Children around 10 begin contributing. Younger ones are protected.', value: 10, flavor: 'A line drawn in the dirt. Old enough to carry grain, young enough to ask why it grows.' },
      { text: '"Tighten our belts instead"', description: 'Adults bear the burden. Children continue learning until 14.', value: 14, flavor: 'Hungry weeks follow. But the children learn to read the sky for rain, and one day that will matter more.' },
      { text: '"The children are our future — do not spend them on today"', description: 'Full childhood until 16, even when times are hard.', value: 16, flavor: 'Some call it foolish. Others call it the bravest thing your people ever did.' }
    ]
  }
];

// Map policy key → scenario pool
const SCENARIO_POOLS = {
  freedom: FREEDOM_SCENARIOS,
  mercy: MERCY_SCENARIOS,
  tradition: TRADITION_SCENARIOS,
  workingAge: WORKING_AGE_SCENARIOS
};

const POLICY_ORDER = ['freedom', 'mercy', 'tradition', 'workingAge'];

function initPolicyWizard(gs) {
  gameState = gs;
}

/**
 * Pick one random scenario per policy for this game session.
 */
function selectRandomScenarios() {
  selectedQuestions = POLICY_ORDER.map(policy => {
    const pool = SCENARIO_POOLS[policy];
    const scenario = pool[Math.floor(Math.random() * pool.length)];
    return { policy, ...scenario };
  });
}

/**
 * Show the policy wizard. Calls callback() when finished or skipped.
 */
function showPolicyWizard(callback) {
  wizardCallback = callback || (() => {});
  currentStep = 0;
  accumulated = {};
  pendingChoice = null;
  selectRandomScenarios();

  const overlay = document.getElementById('policy-wizard-overlay');
  if (!overlay) {
    wizardCallback();
    return;
  }

  overlay.classList.add('visible');
  renderWizardStep(0);
}

function renderWizardStep(stepIndex) {
  const question = selectedQuestions[stepIndex];
  if (!question) {
    finishWizard();
    return;
  }

  document.getElementById('wizard-step-indicator').textContent =
    `${stepIndex + 1} / ${selectedQuestions.length}`;
  document.getElementById('wizard-title').textContent = question.title;
  document.getElementById('wizard-narrative').textContent = question.narrative;

  const choicesEl = document.getElementById('wizard-choices');
  choicesEl.style.display = '';
  choicesEl.innerHTML = '';

  for (let i = 0; i < question.choices.length; i++) {
    const choice = question.choices[i];
    const btn = document.createElement('button');
    btn.className = 'event-choice';
    btn.innerHTML = `
      <div class="event-choice-title">${choice.text}</div>
      <div class="event-choice-desc">${choice.description}</div>
    `;
    btn.addEventListener('click', () => selectWizardChoice(stepIndex, i));
    choicesEl.appendChild(btn);
  }

  // Reset state for new step
  pendingChoice = null;
  const flavorEl = document.getElementById('wizard-flavor');
  if (flavorEl) { flavorEl.textContent = ''; flavorEl.style.display = 'none'; }
  const contBtn = document.getElementById('wizard-continue');
  if (contBtn) contBtn.style.display = 'none';
  const skipBtn = document.getElementById('wizard-skip');
  if (skipBtn) skipBtn.style.display = '';
}

function selectWizardChoice(stepIndex, choiceIndex) {
  const question = selectedQuestions[stepIndex];
  const choice = question.choices[choiceIndex];

  // Stage the choice (not committed until Continue)
  pendingChoice = { policy: question.policy, value: choice.value };

  // Highlight selected choice (allow re-selection)
  const choicesEl = document.getElementById('wizard-choices');
  const buttons = choicesEl.querySelectorAll('.event-choice');
  buttons.forEach((btn, i) => {
    btn.classList.toggle('wizard-selected', i === choiceIndex);
  });

  // Show flavor text and continue button
  const flavorEl = document.getElementById('wizard-flavor');
  flavorEl.textContent = choice.flavor;
  flavorEl.style.display = '';

  const contBtn = document.getElementById('wizard-continue');
  contBtn.style.display = '';
}

function advanceWizard() {
  // Commit the pending choice
  if (pendingChoice) {
    accumulated[pendingChoice.policy] = pendingChoice.value;
    pendingChoice = null;
  }

  currentStep++;
  if (currentStep >= selectedQuestions.length) {
    finishWizard();
  } else {
    renderWizardStep(currentStep);
  }
}

function finishWizard() {
  // Apply all accumulated choices to gameState
  for (const [policy, value] of Object.entries(accumulated)) {
    if (policy === 'workingAge') {
      window.WORKING_AGE = value;
      if (gameState.governance?.policies) {
        gameState.governance.policies.workingAge = value;
      }
    } else {
      if (gameState.governance?.policies) {
        gameState.governance.policies[policy] = value;
      }
    }
  }

  hideWizard();
  if (wizardCallback) wizardCallback();
}

function skipPolicyWizard() {
  accumulated = {};
  hideWizard();
  if (wizardCallback) wizardCallback();
}

function hideWizard() {
  const overlay = document.getElementById('policy-wizard-overlay');
  if (overlay) overlay.classList.remove('visible');
}

export {
  initPolicyWizard,
  showPolicyWizard,
  skipPolicyWizard,
  advanceWizard,
  SCENARIO_POOLS,
  POLICY_ORDER
};

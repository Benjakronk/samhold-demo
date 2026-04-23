// Advisor Hints — data definitions for the context-sensitive advisor system
// Each hint uses the event system's condition pattern (evaluateCondition)

export const ADVISOR_HINTS = [
  // ===== INTRODUCTION (oneTime: true) =====
  {
    id: 'welcome',
    category: 'introduction',
    priority: 100,
    oneTime: true,
    cooldown: 0,
    conditions: [{ type: 'custom', check: 'turnEquals', value: 1 }],
    title: 'Welcome to Samhold!',
    content: 'Your small tribe has settled in this fertile land. Click on the hexes around your settlement to explore them. Look for good spots to assign workers for food and materials.',
    summaryLine: null, // shown as modal, not in summary
    icon: '💡',
    modal: true // special flag: show as blocking modal on turn 1
  },
  {
    id: 'resource_management',
    category: 'introduction',
    priority: 95,
    oneTime: true,
    cooldown: 0,
    conditions: [{ type: 'custom', check: 'turnEquals', value: 2 }],
    title: 'Managing Resources',
    content: 'Your people need 2 food per person each turn. Check your resource bars at the top — if food goes negative, people will starve. Assign workers to grassland hexes to gather food.',
    summaryLine: 'Learn to manage your resources wisely.',
    icon: '🌾'
  },
  {
    id: 'winter_warning_intro',
    category: 'introduction',
    priority: 90,
    oneTime: true,
    cooldown: 0,
    conditions: [{ type: 'custom', check: 'firstWinterApproaching' }],
    title: 'Winter Is Coming',
    content: 'Winter arrives soon! Your people need extra food to survive the cold months. Make sure you have a surplus stored. Consider building a Farm on grassland for stable food production.',
    summaryLine: 'Winter is approaching — stockpile food!',
    icon: '❄️'
  },
  {
    id: 'cohesion_intro',
    category: 'introduction',
    priority: 70,
    oneTime: true,
    cooldown: 0,
    conditions: [
      { type: 'custom', check: 'turnAtLeast', value: 5 },
      { type: 'custom', check: 'anyPillarChangedSignificantly' }
    ],
    title: 'Cohesion Matters',
    content: 'The colored bars at the top show your society\'s Cohesion — how united your people are. Identity, Legitimacy, Satisfaction, and Bonds all matter. If total cohesion falls too low, your society may collapse!',
    summaryLine: 'Your society\'s cohesion is shifting. Keep an eye on it.',
    icon: '🫂'
  },
  {
    id: 'population_growth',
    category: 'introduction',
    priority: 60,
    oneTime: true,
    cooldown: 0,
    conditions: [{ type: 'custom', check: 'childrenExist' }],
    title: 'Growing Your Population',
    content: 'Your population grows through births each season, but children take years to become workers. Keep your people fed and happy to encourage steady population growth.',
    summaryLine: 'Children are being born! They\'ll join the workforce when they come of age.',
    icon: '👶'
  },
  {
    id: 'first_building',
    category: 'introduction',
    priority: 65,
    oneTime: true,
    cooldown: 0,
    conditions: [{ type: 'custom', check: 'anyBuildingCompleted' }],
    title: 'Building Complete',
    content: 'Your first building is operational! Buildings provide steady yields when staffed with workers. Open the Workforce panel to manage worker assignments across your territory.',
    summaryLine: 'Your first building is complete — assign workers to it.',
    icon: '🏗️'
  },
  {
    id: 'immigration_intro',
    category: 'introduction',
    priority: 70,
    oneTime: true,
    cooldown: 0,
    conditions: [
      { type: 'custom', check: 'turnAtLeast', value: 12 },
      { type: 'custom', check: 'immigrantsArriving' }
    ],
    title: 'New Arrivals',
    content: 'Immigrants are arriving at your settlement. They go through integration stages before becoming full members. Check the Immigration tab in the Governance panel to manage newcomers.',
    summaryLine: 'Immigrants have arrived — manage their integration.',
    icon: '🚶'
  },
  {
    id: 'governance_intro',
    category: 'introduction',
    priority: 55,
    oneTime: true,
    cooldown: 0,
    conditions: [
      { type: 'population', operator: '>', value: 15 },
      { type: 'governance', model: 'tribalCouncil' }
    ],
    title: 'Governance Options',
    content: 'As your society grows, you may want to change your governance model. Check the Governance panel to explore different forms of leadership and policies. Each model has trade-offs.',
    summaryLine: 'Your society is large enough to consider new governance models.',
    icon: '⚖️'
  },
  {
    id: 'working_age_intro',
    category: 'introduction',
    priority: 50,
    oneTime: true,
    cooldown: 0,
    conditions: [
      { type: 'custom', check: 'childrenExist' },
      { type: 'custom', check: 'turnAtLeast', value: 18 }
    ],
    title: 'Working Age Policy',
    content: 'You have children growing up. Consider adjusting your Working Age policy in the Governance panel. Lower ages provide workers faster but may reduce satisfaction and knowledge growth.',
    summaryLine: 'Consider your Working Age policy as children grow.',
    icon: '🧒'
  },
  {
    id: 'crime_intro',
    category: 'introduction',
    priority: 65,
    oneTime: true,
    cooldown: 0,
    conditions: [
      { type: 'custom', check: 'crimeEmerging' },
      { type: 'custom', check: 'noJusticeHall' }
    ],
    title: 'Crime Emerging',
    content: 'Criminal activity is beginning in your settlement. Low trust and material scarcity drive crime. A Justice Hall lets you detect and suppress it — but consider the underlying causes too.',
    summaryLine: 'Crime is emerging — consider building a Justice Hall.',
    icon: '⚖️'
  },
  {
    id: 'resistance_intro',
    category: 'introduction',
    priority: 65,
    oneTime: true,
    cooldown: 0,
    conditions: [{ type: 'custom', check: 'resistancePressureAbove25' }],
    title: 'Resistance Stirring',
    content: 'Discontent is building among your people. Check the Resistance tab in the Governance panel. You can negotiate, suppress, or address the root causes through policy changes.',
    summaryLine: 'Resistance pressure is building among your people.',
    icon: '✊'
  },
  {
    id: 'traditions_intro',
    category: 'introduction',
    priority: 50,
    oneTime: true,
    cooldown: 0,
    conditions: [
      { type: 'custom', check: 'turnAtLeast', value: 10 },
      { type: 'tradition_count', operator: '==', value: 0 }
    ],
    title: 'Traditions',
    content: 'Your people have no traditions yet. Establishing rituals and celebrations strengthens Identity and Bonds. Open the Traditions panel to create your first tradition.',
    summaryLine: 'Consider establishing your first tradition.',
    icon: '🎭'
  },
  {
    id: 'values_intro',
    category: 'introduction',
    priority: 55,
    oneTime: true,
    cooldown: 0,
    conditions: [{ type: 'custom', check: 'firstValueRecognized' }],
    title: 'A Value Crystallizes',
    content: 'Your society has developed its first shared value! Values emerge from sustained policy choices and strengthen Identity. But abandoning them later will carry a cost.',
    summaryLine: 'Your first shared value has crystallized.',
    icon: '🧭'
  },
  {
    id: 'sacred_places_intro',
    category: 'introduction',
    priority: 45,
    oneTime: true,
    cooldown: 0,
    conditions: [{ type: 'custom', check: 'turnAtLeast', value: 8 }],
    title: 'Sacred Places',
    content: 'You can name rivers, lakes, and regions on your map — each naming strengthens your people\'s Identity. Click on rivers or use the region tools to claim the landscape as your own.',
    summaryLine: 'Name the landscape to strengthen Identity.',
    icon: '🏔️'
  },
  {
    id: 'threats_intro',
    category: 'introduction',
    priority: 75,
    oneTime: true,
    cooldown: 0,
    conditions: [{ type: 'threats_active', operator: '>', value: 0 }],
    title: 'Threats Approaching',
    content: 'An external threat has appeared! Train warriors to defend your settlements, or build fortifications along the borders. Undefended settlements will take damage.',
    summaryLine: 'An external threat is approaching — prepare defenses!',
    icon: '⚔️'
  },

  // ===== WARNING (repeating) =====
  {
    id: 'food_critically_low',
    category: 'warning',
    priority: 95,
    oneTime: false,
    cooldown: 4,
    conditions: [{ type: 'custom', check: 'foodStockpileLow' }],
    title: 'Food Running Low',
    content: 'Your food stores are dangerously low. Assign more workers to farms or grassland hexes immediately.',
    summaryLine: 'Food stores critically low!',
    icon: '⚠️'
  },
  {
    id: 'food_net_negative',
    category: 'warning',
    priority: 90,
    oneTime: false,
    cooldown: 6,
    conditions: [{ type: 'custom', check: 'foodNetNegative' }],
    title: 'Losing Food Each Turn',
    content: 'You are consuming more food than you produce. Without changes, starvation will follow. Build farms, assign gatherers, or reduce population costs.',
    summaryLine: 'Food production is negative — starvation imminent.',
    icon: '⚠️'
  },
  {
    id: 'cohesion_crisis',
    category: 'warning',
    priority: 90,
    oneTime: false,
    cooldown: 6,
    conditions: [{ type: 'custom', check: 'anyPillarBelow25' }],
    title: 'Cohesion Crisis',
    content: 'One of your cohesion pillars is dangerously low. Society buildings (Shrines, Meeting Halls), traditions, and storytelling can help restore stability.',
    summaryLine: 'A cohesion pillar is critically low!',
    icon: '⚠️'
  },
  {
    id: 'cohesion_collapse_imminent',
    category: 'warning',
    priority: 98,
    oneTime: false,
    cooldown: 3,
    conditions: [{ type: 'cohesion', pillar: 'total', operator: '<', value: 20 }],
    title: 'Society Collapsing',
    content: 'Your society is on the brink of collapse! If total cohesion remains this low for 3 turns, you will lose the game. Take emergency action.',
    summaryLine: 'CRITICAL: Society on brink of collapse!',
    icon: '🚨'
  },
  {
    id: 'resistance_escalating',
    category: 'warning',
    priority: 85,
    oneTime: false,
    cooldown: 8,
    conditions: [{ type: 'custom', check: 'resistanceOrganized' }],
    title: 'Organized Resistance',
    content: 'Resistance has become organized and is actively disrupting governance. Consider negotiation, policy changes, or — at a cost — suppression.',
    summaryLine: 'Organized resistance is disrupting governance.',
    icon: '✊'
  },
  {
    id: 'crime_organized',
    category: 'warning',
    priority: 80,
    oneTime: false,
    cooldown: 8,
    conditions: [{ type: 'custom', check: 'crimeOrganized' }],
    title: 'Organized Crime',
    content: 'Organized predation has emerged — crime is self-reinforcing and doubling its damage. A Justice Hall crackdown or addressing root causes (trust, material scarcity) is urgently needed.',
    summaryLine: 'Organized crime is devastating your society.',
    icon: '🔪'
  },
  {
    id: 'parallel_society_growing',
    category: 'warning',
    priority: 80,
    oneTime: false,
    cooldown: 8,
    conditions: [{ type: 'custom', check: 'parallelSocietyAbove30' }],
    title: 'Parallel Society Growing',
    content: 'A parallel society has formed and is growing. It drains Identity and Bonds. Check the Immigration tab for intervention options.',
    summaryLine: 'Parallel society is growing — consider intervention.',
    icon: '🏘️'
  },
  {
    id: 'population_declining',
    category: 'warning',
    priority: 75,
    oneTime: false,
    cooldown: 4,
    conditions: [{ type: 'custom', check: 'populationDeclining' }],
    title: 'Population Declining',
    content: 'Your population decreased this turn. Deaths from starvation, old age, violence, or combat are outpacing births.',
    summaryLine: 'Population is declining.',
    icon: '📉'
  },
  {
    id: 'starvation_occurred',
    category: 'warning',
    priority: 92,
    oneTime: false,
    cooldown: 4,
    conditions: [{ type: 'custom', check: 'starvationOccurred' }],
    title: 'People Starving',
    content: 'Your people are starving to death. This is an emergency. Assign workers to food production immediately.',
    summaryLine: 'STARVATION: People are dying from hunger!',
    icon: '☠️'
  },
  {
    id: 'winter_low_food',
    category: 'warning',
    priority: 85,
    oneTime: false,
    cooldown: 4,
    conditions: [{ type: 'custom', check: 'winterApproachingLowFood' }],
    title: 'Winter Approaching, Low Food',
    content: 'Winter is coming and your food reserves may not last. You need roughly 6 food per person to weather the cold safely.',
    summaryLine: 'Winter approaches with insufficient food reserves.',
    icon: '❄️'
  },
  {
    id: 'no_idle_workers',
    category: 'warning',
    priority: 60,
    oneTime: false,
    cooldown: 8,
    conditions: [{ type: 'custom', check: 'idleWorkersZero' }],
    title: 'No Idle Workers',
    content: 'All workers are assigned. You cannot build or expand without idle workers. Wait for population growth, or reassign existing workers.',
    summaryLine: 'No idle workers available.',
    icon: '👷'
  },
  {
    id: 'threat_no_defenders',
    category: 'warning',
    priority: 88,
    oneTime: false,
    cooldown: 4,
    conditions: [
      { type: 'threats_active', operator: '>', value: 0 },
      { type: 'warriors', operator: '==', value: 0 }
    ],
    title: 'Undefended!',
    content: 'Threats are active but you have no warriors. Train warriors urgently or your settlements will take damage.',
    summaryLine: 'Threats approaching with no defenders!',
    icon: '🛡️'
  },
  {
    id: 'governance_strain_high',
    category: 'warning',
    priority: 70,
    oneTime: false,
    cooldown: 8,
    conditions: [{ type: 'custom', check: 'governanceStrainHigh' }],
    title: 'Governance Strain',
    content: 'Your territory has grown beyond what your governance can comfortably manage. Legitimacy is under pressure. Consider Admin Halls or adjusting your expansion.',
    summaryLine: 'Governance strain from large territory.',
    icon: '🏛️'
  },
  {
    id: 'monument_neglected',
    category: 'warning',
    priority: 55,
    oneTime: false,
    cooldown: 12,
    conditions: [{ type: 'custom', check: 'monumentNeglected' }],
    title: 'Monument Neglected',
    content: 'A monument is neglected and draining Identity and Bonds. Assign a Steward to tend it, or pay the restoration cost.',
    summaryLine: 'A neglected monument is eroding cohesion.',
    icon: '🗿'
  },
  {
    id: 'legitimacy_very_low',
    category: 'warning',
    priority: 85,
    oneTime: false,
    cooldown: 6,
    conditions: [{ type: 'cohesion', pillar: 'legitimacy', operator: '<', value: 15 }],
    title: 'Legitimacy Crisis',
    content: 'Your authority is barely recognized. Meeting Halls, fair policy, and stable governance can rebuild Legitimacy. Without it, resistance and collapse are likely.',
    summaryLine: 'Legitimacy dangerously low.',
    icon: '⚠️'
  },

  // ===== OBSERVATION (educational) =====
  {
    id: 'traditions_identity',
    category: 'observation',
    priority: 40,
    oneTime: false,
    cooldown: 16,
    conditions: [
      { type: 'tradition_count', operator: '>', value: 0 },
      { type: 'custom', check: 'identityRising' }
    ],
    title: 'Traditions Strengthen Identity',
    content: 'Your traditions are helping build a shared sense of who your people are. Festival Grounds amplify this effect. In real societies, rituals create collective memory and belonging.',
    summaryLine: 'Traditions are strengthening your identity.',
    icon: '🎭'
  },
  {
    id: 'class_resentment',
    category: 'observation',
    priority: 45,
    oneTime: false,
    cooldown: 16,
    conditions: [
      { type: 'custom', check: 'classSystemActive' },
      { type: 'custom', check: 'satisfactionDeclining' }
    ],
    title: 'Stratification Breeds Resentment',
    content: 'Your class system is generating resentment among the unprivileged. This mirrors real historical patterns — inequality always has social costs, though elites may benefit.',
    summaryLine: 'Class divisions are eroding satisfaction.',
    icon: '⚖️'
  },
  {
    id: 'immigration_integration',
    category: 'observation',
    priority: 35,
    oneTime: false,
    cooldown: 20,
    conditions: [{ type: 'custom', check: 'immigrationPipelineActive' }],
    title: 'Integration in Progress',
    content: 'Immigrants are advancing through integration stages. Each stage increases their workforce contribution. Cultural openness and active programs speed this up — but the balance is delicate.',
    summaryLine: 'Immigrants are integrating into your society.',
    icon: '🚶'
  },
  {
    id: 'gender_workforce_limit',
    category: 'observation',
    priority: 45,
    oneTime: false,
    cooldown: 16,
    conditions: [{ type: 'custom', check: 'genderRestrictingWorkforce' }],
    title: 'Gender Restrictions Limiting Workforce',
    content: 'Restrictive labor roles are excluding part of your population from full participation. This reduces economic output but may serve other social goals your people value.',
    summaryLine: 'Gender restrictions are limiting your workforce.',
    icon: '⚧'
  },
  {
    id: 'elders_wisdom',
    category: 'observation',
    priority: 30,
    oneTime: false,
    cooldown: 20,
    conditions: [
      { type: 'custom', check: 'eldersContributing' }
    ],
    title: 'Elders Share Wisdom',
    content: 'Your retired elders are contributing Legitimacy, Identity, and Knowledge passively. In many real societies, elder wisdom is a crucial stabilizing force.',
    summaryLine: 'Elders are contributing wisdom to your society.',
    icon: '🧓'
  },
  {
    id: 'policy_lag_observe',
    category: 'observation',
    priority: 40,
    oneTime: false,
    cooldown: 12,
    conditions: [{ type: 'custom', check: 'activeLagCountHigh' }],
    title: 'Policies Propagating Slowly',
    content: 'Multiple policy changes are still propagating. Cultural changes take longest. An Administrative Hall can reduce lag. Real governance faces similar implementation delays.',
    summaryLine: 'Policy changes are still taking effect.',
    icon: '📜'
  },
  {
    id: 'trust_recovering',
    category: 'observation',
    priority: 35,
    oneTime: false,
    cooldown: 16,
    conditions: [{ type: 'custom', check: 'trustRecovering' }],
    title: 'Trust Rebuilding',
    content: 'Social trust is slowly recovering after a crisis. Trust takes much longer to build than to destroy — a pattern seen throughout human history.',
    summaryLine: 'Social trust is slowly rebuilding.',
    icon: '🤝'
  },
  {
    id: 'values_constraining',
    category: 'observation',
    priority: 50,
    oneTime: false,
    cooldown: 12,
    conditions: [{ type: 'custom', check: 'valueViolationRecent' }],
    title: 'Values Constraining Policy',
    content: 'A recent policy change violated your people\'s shared values. This weakened cohesion. Values are both a strength and a constraint — they define who your people are.',
    summaryLine: 'Policy changes are clashing with shared values.',
    icon: '🧭'
  },
  {
    id: 'nursing_labor',
    category: 'observation',
    priority: 35,
    oneTime: false,
    cooldown: 16,
    conditions: [{ type: 'custom', check: 'highNursingBurden' }],
    title: 'Nursing Mothers Reducing Labor',
    content: 'Many mothers are nursing, reducing your effective workforce by their 50% labor penalty. This is a natural demographic cost of population growth.',
    summaryLine: 'Nursing mothers are reducing labor capacity.',
    icon: '🤱'
  },
  {
    id: 'winter_varies',
    category: 'observation',
    priority: 30,
    oneTime: false,
    cooldown: 40,
    conditions: [{ type: 'custom', check: 'harshWinterOccurred' }],
    title: 'Harsh Winter',
    content: 'Winter severity varies from year to year. Some winters are mild, others devastating. Building food surpluses in good years protects against the lean ones.',
    summaryLine: 'A harsh winter tested your food reserves.',
    icon: '❄️'
  },
  {
    id: 'democracy_slow',
    category: 'observation',
    priority: 40,
    oneTime: false,
    cooldown: 16,
    conditions: [
      { type: 'governance', model: 'democracy' },
      { type: 'custom', check: 'activeLagCountHigh' }
    ],
    title: 'Democracy Slows Decisions',
    content: 'Democratic governance adds deliberation time to major policy changes. This protects against hasty decisions but slows response to crises. A real trade-off societies navigate.',
    summaryLine: 'Democratic processes are slowing policy changes.',
    icon: '🗳️'
  },
  {
    id: 'military_rule_erosion',
    category: 'observation',
    priority: 45,
    oneTime: false,
    cooldown: 12,
    conditions: [
      { type: 'governance', model: 'militaryRule' },
      { type: 'custom', check: 'satisfactionDeclining' }
    ],
    title: 'Military Rule Eroding Satisfaction',
    content: 'Military rule\'s inherent restrictions are steadily eroding satisfaction. Authoritarian regimes face this dilemma: strength through force versus consent of the governed.',
    summaryLine: 'Military rule is eroding satisfaction.',
    icon: '⚔️'
  },

  // ===== TIP (actionable) =====
  {
    id: 'tip_build_farm',
    category: 'tip',
    priority: 60,
    oneTime: false,
    cooldown: 12,
    conditions: [
      { type: 'custom', check: 'foodNetNegative' },
      { type: 'custom', check: 'noFarms' }
    ],
    title: 'Build a Farm',
    content: 'Farms provide reliable food production. Open the Workforce panel\'s Build tab and place a Farm on grassland. One farmer produces more food than a gatherer.',
    summaryLine: 'Consider building a Farm for stable food.',
    icon: '🌾'
  },
  {
    id: 'tip_justice_hall',
    category: 'tip',
    priority: 55,
    oneTime: false,
    cooldown: 12,
    conditions: [
      { type: 'custom', check: 'crimeAbove3' },
      { type: 'custom', check: 'noJusticeHall' }
    ],
    title: 'Build a Justice Hall',
    content: 'Crime is rising but you can\'t detect its full extent without a Justice Hall. Build one to gain visibility and the ability to crack down when needed.',
    summaryLine: 'A Justice Hall would help you manage crime.',
    icon: '⚖️'
  },
  {
    id: 'tip_storytellers',
    category: 'tip',
    priority: 40,
    oneTime: false,
    cooldown: 16,
    conditions: [
      { type: 'has_stories', operator: '==', value: 0 },
      { type: 'custom', check: 'idleAbove2' },
      { type: 'custom', check: 'turnAtLeast', value: 10 }
    ],
    title: 'Assign Storytellers',
    content: 'Storytellers preserve your history as Oral Tradition, granting permanent Identity bonuses. Assign them in the Workforce panel\'s Cultural Roles section.',
    summaryLine: 'Assign storytellers to preserve your history.',
    icon: '📖'
  },
  {
    id: 'tip_train_warriors',
    category: 'tip',
    priority: 65,
    oneTime: false,
    cooldown: 8,
    conditions: [
      { type: 'threats_active', operator: '>', value: 0 },
      { type: 'warriors', operator: '==', value: 0 }
    ],
    title: 'Train Warriors',
    content: 'You face threats but have no warriors. Open the Workforce panel\'s Train tab to begin training a warrior. They require population and food upkeep.',
    summaryLine: 'Train warriors to defend against threats.',
    icon: '⚔️'
  },
  {
    id: 'tip_meeting_hall',
    category: 'tip',
    priority: 50,
    oneTime: false,
    cooldown: 12,
    conditions: [{ type: 'custom', check: 'governanceTransitionPending' }],
    title: 'Build a Meeting Hall',
    content: 'A Meeting Hall\'s workers reduce the legitimacy penalty during governance transitions. Build one before changing your governance model.',
    summaryLine: 'A Meeting Hall would ease governance transitions.',
    icon: '🏛️'
  },
  {
    id: 'tip_explore',
    category: 'tip',
    priority: 45,
    oneTime: false,
    cooldown: 12,
    conditions: [
      { type: 'custom', check: 'lowExploration' },
      { type: 'custom', check: 'noScouts' }
    ],
    title: 'Explore with a Scout',
    content: 'Much of the map remains hidden. Train a Scout to reveal terrain and find strategic locations. Scouts move farther and see more than other units.',
    summaryLine: 'Train a scout to explore the unknown.',
    icon: '🔭'
  },
  {
    id: 'tip_traditions',
    category: 'tip',
    priority: 40,
    oneTime: false,
    cooldown: 16,
    conditions: [
      { type: 'tradition_count', operator: '==', value: 0 },
      { type: 'custom', check: 'turnAtLeast', value: 10 }
    ],
    title: 'Establish a Tradition',
    content: 'Traditions strengthen Identity and Bonds when they fire each year. Open the Traditions panel to establish your first one.',
    summaryLine: 'Establish traditions to strengthen cohesion.',
    icon: '🎭'
  },
  {
    id: 'tip_shrine',
    category: 'tip',
    priority: 45,
    oneTime: false,
    cooldown: 16,
    conditions: [{ type: 'custom', check: 'identityLowestPillarNoShrine' }],
    title: 'Build a Shrine',
    content: 'Identity is your weakest pillar. A Shrine produces Identity when staffed. It\'s the most direct way to shore up cultural cohesion.',
    summaryLine: 'Build a Shrine to boost Identity.',
    icon: '🕯️'
  }
];

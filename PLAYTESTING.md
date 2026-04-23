# Samhold Playtesting Checklist

Use this during playtesting sessions. Check off items as you verify them. Note bugs, balance issues, and UX friction in the margins or in a separate notes section at the bottom.

**Dev panel:** Open with the wrench button. Use Cohesion tab time controls to fast-forward. Use fog-of-war toggle and free unit creation for targeted testing.

**Notes:**
- Apply & restart does not reset everything in the current game, so when the player advances from "turn one" after applying and restarting, lots of bugs appear.
- UI overhaul needed:
- Many buttons are too small for their content.
- Many input fields are white instead of keeping to the game's aesthetic.

---

## Session 1: Core Loop & Early Game

### First Load & Setup
- [OK] Game loads without console errors
- [OK] Settlement naming dialog appears on first turn

**Notes:** Clicking anywhere dismisses the dialog, but only clicking one of the buttons should do that.

- [??] Naming the settlement grants Identity +1

**Notes:** Naming the settlement immediately upon the first turn prompt increases identity by 1. Skipping the naming in the dialog that shows up on the first turn, and then naming the settlment by navigating to building-display for the settlement and clicking the rename button will not give the +1 to identity immediately, but will on advancing to the next turn. It does not show up in the delta for identity either when the naming bonus is applied on turn advancement instead of immediately upon naming the settlement. Renaming gives the identity bonus on unnamed settlements only, working as intended.

- [OK] Settlement name appears on the map

- [??] Starting territory is radius 2 around settlement

**Notes:** Starting territory radius is correctly 2, and vision extends 1 radius out from the territory borders, and the next hex out from that is unexplored. I would like the initial settlement to reveal an additional 1 radius out, so there is a revealed borderland before unexplored territory, making for a smoother transition.

- [NO] Tutorial hint appears on turn 1

**Notes:** Set up two console.logs to test. "Welcome to Samhold!" never appears, and the console log test shows it is never presented. The first hint to appear for the player is the "Managing Resources" hint, which appears after advancing from turn 1, and it appears in the console log. It appears on top of the turn summary dialog, disturbing the player while he is reading the turn summary.

- [??] Starting resources feel reasonable (food, materials, population)

**Notes:** This is hard to say for certain at this point in time, and will need further tuning.

### Map & Navigation
- [OK] Hex map renders correctly (no visual glitches, terrain colors correct)
- [OK] Camera: drag-pan, scroll-zoom, WASD and arrow keys all work
- [OK] Minimap renders and click-navigation works
- [OK] Fog of war: unexplored hexes hidden, revealed hexes dimmed, visible hexes bright
- [??] Feature labels (rivers, lakes, regions, settlements) render without overlap

**Notes:** Labels render. When they would overlap while zooming out, one label renders while the other disappears, before reappearing when zooming back in. 
I would prefer that the labels behaved in a way where overlapping labels stop growing or reposition slightly when zooming out to not overlap. Maybe their size while fully zoomed out is too big as well.

- [??] Labels stay readable at different zoom levels

**Notes:** See previous note. One label disappears when overlapping with another. Otherwise, they stay readable at all zoom levels.

### Basic Economy (Turns 1-8)
- [OK] Clicking a territory hex shows side panel with terrain info
- [OK] Can assign a gatherer to an unimproved hex (max 1)
- [OK] Workers produce food/materials as expected
- [OK] Turn processing: Dawn (income) then Dusk (consumption) works
- [??] Food consumption: 2/adult, 1/child, 1/elder — verify in turn summary

**Notes:** Elders are counted as adults, but have their own number represented which misleads the player to think more adults should eat 2 food than actually do. Elders, while adults, should not be counted in the number of adults in the breakdown of population, for clarity.

- [??] Winter penalty: extra food consumed in winter turns

**Notes:** New players need a warning hint either when the first fall or winter turn begins, telling them about the winter penalty system. The hint about seasons comes too late currently. The player should be informed so he can react to winter approaching.

- [OK] Season/year tracking correct (4 turns = 1 year)
- [??] Turn summary popup shows meaningful information

**Notes:** On turns with very many things happening, or later in the game, the turn summary becomes quite messy and harder to read. A player can easily be overwhelmed by all the information. Consider as part of an advisor system to allow the player to filter the different types of information he sees, and make it more easily digestible.

- [OK] Resource bars in top bar update correctly

### Building Construction
- [OK] Can open Build tab in workforce overlay
- [OK] Building placement respects valid terrain restrictions
- [OK] Building placement restricted to territory
- [OK] Construction costs materials correctly
- [OK] Construction progress advances each turn (requires worker)
- [OK] Completed building shows correct icon on map
- [OK] Worker assignment to buildings respects maxWorkers
- [OK] Yield scales with worker fill ratio
- [OK] Demolishing a building refunds materials and removes workers

### Specific Buildings — Quick Check
- [OK] Farm: builds on grassland/wetland, food yield, river bonus
- [OK] Lumber Camp: builds on forest only, material yield
- [OK] Quarry: builds on hills/mountain, material yield
- [OK] Fishing Dock: requires adjacent water or river hex
- [OK] Hunting Camp: instant build (0 turns), food + material yield
- [OK] Watchtower: extends vision when staffed

---

## Session 2: Population & Cohesion

### Population Growth
- [OK] Births occur each turn
- [OK] Birth rate scales with fertile female count
- [OK] Children appear in child cohorts with correct age
- [??] Children graduate to adults at Working Age

**Notes:** If the player changes nothing in the working age policy, this works as intended. Changing the working age policy down to an age that would absorb several cohorts of children into the workforce, and then setting it back up will not revert these cohorts to being children again. The test: Starting a new game, spending one turn changing to a working age of 6, and then one turn changing it to 16. The result: Two cohorts of age 6 and 8 appear in the adult cohorts section, refering to the members of the cohorts as adults. This persists after working age is increased. A further note here is that children should consume 1 food until they turn 12, and then start consuming the full adult ration regardless of whether they work, to mimic puberty. This gives a small incentive for child labor, since a young child consumes less food it has a higher output when producing food, and a small penalty for keeping older children out of the workforce, and will lead to more interesting player dilemmas.

- [OK] Demographic pyramid displays correctly (male/female split)
- [??] Nursing: births create nursing entries, decrement each turn

**Notes:** It is hard to track this since all are lumped into a single number in population info, so the player can't see how many finish in one, two or. three turns.

- [OK] Nursing mothers reduce effective labor capacity
- [OK] Population summary in sidebar shows fertility section

### Aging & Elders
- [OK] Cohorts age each New Year
- [OK] Adults become elders at age 50 (reduced food, passive bonuses)
- [OK] Natural death probability for elders works (2% per year above 50)
- [??] Instant death at age 80

**Notes:** There should be a way to increase life expectancy.

- [OK] Elder count displayed correctly

### Starvation
- [OK] Starvation occurs when food < 0 at end of turn
- [OK] Starvation ordering: children (youngest) then elders (oldest) then working adults
- [OK] Deaths reduce population.total correctly
- [OK] Chronicle records starvation events
- [??] Sole survivor protection: cannot die to starvation at pop 1

**Notes:** The last person starving should be a possible loss condition.

### Cohesion Pillars
- [OK] Identity: responds to knowledge, traditions, values, shared history
- [OK] Legitimacy: responds to governance model, stability, policy consistency
- [??] Satisfaction: responds to food security, shelter, freedom policy

**Notes:** The shelter score is practically invisible to the player except through looking in the cohesion panel, where it is only mentioned. There is little explanation available for the player regarding this. Also, there should probably bee a building type dedicated to increasing the shelter score, while most other building only give minimal shelter score.

- [OK] Bonds: responds to time on land, shared hardship, traditions
- [OK] Lowest pillar drags others down (verify with dev panel)
- [OK] Cohesion total displayed correctly in top bar
- [OK] Status thresholds correct: United 80+, Stable 60-79, Strained 40-59, Fractured 20-39, Collapse 0-19
- [OK] Cohesion effects: low cohesion causes emigration, productivity loss

### Cohesion Collapse
- [??] At cohesion <= 5 for 3+ turns: game over triggers

**Notes:** Currently next to impossible to get to this state playing normally. Only able to do this by using the dev panel. No unrecoverable spirals guideline may have created a situation where loss through lack of cohesion is hard to achieve, but it should be harder to keep society together than this.

- [OK] Loss screen shows educational feedback
- [OK] Dev panel: set all cohesion to 1, advance 3 turns — verify defeat

---

## Session 3: Governance & Policies

### Governance Models
Test each model (use dev panel "Force Model" to switch):
- [OK] Tribal Council: no special restrictions, TC consensus bonus on policies
- [OK] Chieftain: verify policy controls, legitimacy effects
- [OK] Theocracy: verify religion-related bonuses (shrine 1.5x identity)
- [NO] Monarchy: dynasty tracking, ruler quality, heir generation, succession
- [NO] Military Rule: freedom locked <=20, satisfaction erodes, combat bonuses
- [NO] Democracy: freedom locked >=40, voting delays, elections

**Notes:** Several issues with the three added government forms. We need to dedicate a lot of time to work on the governance system.

### Governance Transitions
- [OK] Switching governance model causes temporary legitimacy penalty
- [??] Meeting Hall staffed workers reduce transition penalty (capped at halving)

**Notes:** It'd hard for the player to verify the penalty reduction, as he has to look up and compare himself. The confirm transition dialog should have more detailed information about the penalties, now it just has general information.

- [OK] Transition timer resets on change
- [OK] Chronicle records governance changes

### Policy Sliders
- [OK] Freedom vs Control slider works and has visible effects
- [OK] Mercy vs Severity slider works
- [OK] Tradition vs Innovation slider works
- [OK] Isolation vs Openness slider works
- [OK] Working Age slider (6-16) works, affects child graduation age
- [OK] Ration Priority (People First / Military First / Equal) works

### Policy Lag (Phase 13A-2)
- [OK] Policy changes don't take effect instantly
- [OK] Directive policies: fast (1-2 turns)
- [OK] Behavioral policies: medium (3-5 turns interpolated)
- [OK] Cultural policies: slow (8 turns interpolated)
- [??] Commit/discard/abandon/force model works

**Notes:** Commit should have a dialog summarizing the policy changes and any cohesion penalties for initiating the change. Abandoning and forcing should have confirm dialogs showing the player a detailed summary of the immediate consequences. Also, the resulting penalty happens on advancing to the next turn, but it does not show in the cohesion pillar deltas. It should either apply immediately or show up in the deltas if it happens on transition.

- [OK] Administrative Hall reduces lag (up to 30%)
- [??] Force costs: legitimacy + satisfaction + trust + materials

**Notes:** See previous note on commit/discard/abandon/force.

- [OK] Dev panel Policy Lag tab shows correct state

---

## Session 4: Society & Culture

### Society Buildings
- [??] Shrine: Identity + Satisfaction yield, theocracy bonus

**Notes:** Staffing changes yield values for the building, as intended, but these don't seem to actually apply. Deltas for identity and satisfaction don't update correctly when staffing/unstaffing workers from the shrine. Identity delta does change, but not by the amount in the yield per worker. In my test the identity delta was -0.2 with an unstaffed shrine, not changing on staffing until advancing the turn, then jumping to + 0.8 with one worker, but not changing when assigning the second worker. Satisfaction delta is not changing at all by changing the amount of workers in the shrine. I tried turning off crime, food security influencing satisfaction and setting all food consumption to 0, then advancing 10 turns without building a shrine, reloading and then building a shrine with the same settings in the dev panel. This resulted in identical scores on identity and satisfaction after 8 turns where the shrine should have influenced the pillars. Not setting anything in the dev panel, but changing starting food to 2000 in initgame.js (making food a non-concern for testing this), and then advancing 10 turns without a shrine, and building a shrine on the second go, resulted in no difference in identity and satisfaction after 8 turns of shrine being staffed by 2 workers, which should have resulted in more identity and satisfaction.

- [??] Monument: 2 workers during construction, 0 after, permanent Identity +3

**Notes:** Monument count and total bonuses for them should show up in the cohesion details panel.

- [??] Monument neglect: triggers after 8 turns without Steward, drains identity/bonds

**Notes:** Neglect triggers. Hard to verify if the identity/bonds drain is happening without better controls in the dev panel for testing this. The neglected monument drains across the players lands should also show up in the social cohesion panel. Neglected status and corresponding drains + materials needed to restore should appear in the building-display for the monument once neglect happens.

- [OK] Monument demolish: outrage penalties scale with monument age
- [OK] Meeting Hall: Legitimacy yield, 1 per settlement, reduces governance transition penalty
- [??] Festival Grounds: Satisfaction yield, amplifies tradition bonuses

**Notes:** Traditions enhance like intended. Festival grounds seems to have the same issues regarding the deltas and actual yield for satisfaction as shrine.

- [??] Market: material yield + satisfaction, 1 per settlement

**Notes:** Does not show satisfaction yield in building-display. Satisfaction delta does not update with staffing/unstaffing. Otherwise, feels a little underpowered for its limit to one per settlement.

- [??] Administrative Hall: Legitimacy yield, reduces policy lag, generates expansion points

**Notes:** Again, legitimacy delta is not updated. Hard to verify if legitimacy yields are actually applied. Policy lag is reduced as intended. Expansion points work as intended.

- [OK] Justice Hall: crime detection + suppression

**Notes:** Detection works. Suppression thruogh crackdown works. It is not clear to the player whether justice hall also suppresses crime while staffed. If it does, this needs to be communicated.

- [??] Sacred Site: Bonds yield, material upkeep

**Notes:** Same issue as previous buildings with yields pertaining to cohesion pillars. Material cost while staffed is correctly applied and shows up in the materials delta when assigning/unassigning workers.

- [NO] All society buildings: fractional accumulators work (integer portions apply each turn)

**Notes:** I can't verify that they work. Tests have been inconclusive. Fractional accumulators do not seem to work, or at least are not properly communicated to the player.

### Traditions (Phase 8B)
- [OK] Can establish traditions from the Traditions overlay
- [OK] Tradition fires at the correct interval and season
- [OK] Costs scale with population
- [OK] Cohesion bonuses scale with Tradition policy
- [OK] Festival Grounds amplifies tradition bonuses
- [OK] Abandoning/changing traditions causes penalties scaled by timesPerformed
- [OK] Tradition drift: long traditions erode Legitimacy with Innovation policy
- [OK] Customizable: name, season, interval at establishment

### Oral Tradition (Phase 8C)
- [OK] Can assign storytellers in Workforce overlay (Cultural Roles)
- [OK] Story progress accumulates each turn with storytellers
- [??] Stories compose from recent Chronicle entries

**Notes:** There should be a mechanism to avoid composing a story from the same entry more than once.

- [OK] Each story grants permanent Identity +1
- [OK] Story capacity = storytellers x 4; excess stories fade
- [OK] 4-turn grace period before fading when storytellers drop to 0
- [OK] Stories visible in Chronicle overlay's "Oral Tradition" tab

### Sacred Places (Phase 8D)
- [??] Sacred sites generate passive Bonds

**Notes** Like previously stated, does not properly display in delta while yield is fractional. At this point, I made the yield 1 whole point in Bonds, and this did show up and looks to work as indended. When yield is fractional, at least the display is buggy, and I can't verify the fractional amount is actually being added to the cohesion pillar score. It might just be that the player is confused by the delta not displaying correctly.

- [OK] River/lake/region naming works via dialog
- [OK] Each naming grants Identity +1
- [OK] Map labels appear for named features
- [OK] Named regions: can found and name cultural regions
- [??] Regions grow/contract based on activity

**Notes:** Haven't verified region contraction.

### Shared Values (Phase 8E)
- [OK] Values emerge after 8 turns sustained in a policy zone
- [OK] Violation penalties scale with strength and zone distance
- [OK] Passive Identity bonus grows with value strength
- [OK] Values overlay shows recognized/emerging values
- [OK] Sidebar widget shows strength pips and progress bars

---

## Session 5: Trust, Resistance, Crime

### Societal Trust (Phase 13A-1)
- [OK] Social Climate widget in Society sidebar shows qualitative phrases
- [OK] Institutional trust derived from legitimacy + satisfaction
- [OK] Interpersonal trust derived from identity + bonds
- [??] Trust deviations from events decay at 0.005/turn

**Notes:** Make sure this change isn't rounded up or down so it doesn't apply correctly.

- [OK] Low interpersonal trust rate-limits Identity/Bonds growth
- [OK] Dev panel Trust tab shows full numeric state

**Notes:** Maybe having all three of the Meeting Hall, Administrative Hall and Justice Hall buildings staffed can reveal the full numeric state of trust, or at least surface more detailed trust information to the player, mirroring how these buildings provide different perspectives on the population, and having them all provides a more complete picture of the social climate.

### Resistance (Phase 13A-3)

**Notes:** While testing, I exited the governance panel in the resistance tab, and when reentering the governance panel, the active panel is still the resistance tab, but the highlighted tab in the tab row is the governance tab.

- [OK] Resistance pressure rises from low institutional trust
- [OK] In-progress policy lag contributes to pressure
- [OK] At pressure 40: faction activates with name and leader
- [OK] Faction dispositions cycle: Cooperative > Skeptical > Hostile > Radical
- [??] At pressure 60: organized resistance drains legitimacy, extends policy lag

**Notes:** The policy lag is extended, but exactly how much is not communicated to the player. At resistance 60<, bonds and identity should also be negatively affected, reflecting how organized resistance strains the social fabric.

- [??] At pressure 95: all pillars drain -1/turn

**Notes:** Is not in the displayed deltas for cohesion pillars. Also, more information on this should be avaliable to the player from the resistance tab.

- [NO] Resolution paths work: reversal, suppression, negotiation

**Notes:** While testing this, attempting to change the Borders and Contact policy, moving the slider sets the value to undefined, and advancing the turn displays the policy-isolation-value as NaN. Also, there is no UI wired up to allow the player to interact with the resolution path logic.

- [NO] Negotiation promises: binding, have deadlines, breaking costs legitimacy

**Notes:** No UI for this. Player can't interact with these features.

- [??] Governance overlay Resistance tab: pressure meter, faction card, promise list

**Notes:** Backend functions exist, but the player still has no access to this.

- [OK] TC consensus bonus: Tribal Council policies get 0.5x passive pressure

**General notes:** The player needs more information. about the faction, who they are and what their motivations are. The player should also be able to learn from this information how to actively manage the resistance. Resistance pressure should have a delta displayed, telling the player what to expect next turn.

### Crime (Phase 13A-4)

**Notes:** The cohesion pillar breakdowns need to display crime related drains when the player has a staffed justice hall.

- [OK] Three tracks (theft, violence, transgression) visible with Justice Hall detection
- [OK] Crime driven by low interpersonal trust and material scarcity
- [OK] Theft drains food/materials + satisfaction
- [OK] Violence damages satisfaction/bonds, kills population above threshold 8

**Notes:** Doesn't show up in the deltas for cohesion.

- [OK] Transgression erodes identity/legitimacy/knowledge

**Notes:** Doesn't show up in the deltas for cohesion.

- [OK] Organized predation at severity >15 for 3+ turns: doubled effects
- [OK] Justice Hall detection levels: 1=theft, 2=+violence, 3=all visible
- [OK] Crackdown action: reduces severity, costs materials/satisfaction/trust, 4-turn cooldown

**Notes:** The player should have more options to actively handle crime.

- [OK] Mercy/Severity policy modifies both generation and damage absorption

**Notes:** The player will need more information about how this works.

---

## Session 6: Immigration & Stratification

### Immigration (Phase 13A-5)

**General notes:** Immigration was reworked while testing, from the old model where immigrants generated bonus food and materials, to the new where immigrants work unworked hexes.

- [OK] Immigration starts at turn 12

**Notes:** The player needs a hint about this when immigration begins, and a thorough tutorial on how immigration works.

- [OK] Arrivals based on food surplus, cohesion, population
- [OK] Four-stage pipeline: Arrival (40%) > Resident (70%) > Participant (90%) > Integrated (100%)
- [OK] Pipeline cohorts are age-tracked (age each year, can die)
- [OK] Border Openness derived from 100 - isolation policy
- [??] Cultural Openness + Progressiveness sliders govern advancement

**Notes:** The sliders are there, but committing changes and then advancing the turn timer will not progress the turn timer for the change to take place. Forcing the policy change works.

- [OK] Trust gates: institutional for stage 0>1, interpersonal for 1>2, both for 2>3
- [OK] Immigrant workforce gathers from unoccupied territory hexes at integration-stage efficiency (Arrivals 40%, Residents 70%, Participants 90%). Capped by available empty hexes.
- [OK] Governance overlay Immigration tab: 3 sliders, pipeline, PS meter, interventions

**General notes:** The immigration system is very opaque to the player in game currently. The immigration policy sliders in the immigration tab render their tooltips too close to other elements, so it messes with legibiliity.

### Parallel Society
- [OK] Crystallizes when unintegrated > 18% of population
- [OK] Quadratic self-reinforcing growth once crystallized
- [OK] Diverts new arrivals, internal births within PS
- [OK] Permanent drain on Identity/Bonds/knowledge
- [OK] Four interventions: integration programs, coercive assimilation, containment, expulsion

**Notes:** Buttons to activate interventions are different widths.

- [OK] 5 crystallization threshold events at PSS 0.15/0.30/0.50/0.70/0.90

### Class System (Phase 13A-6)

**General notes:** The only real mechanically-implemented incentive is the legitimacy-per-turn gain, offset by crime and trust penalties. The production bonus described in the data for economic stratification was never wired into economy.js, so there's currently no economic reason to choose that basis over another. The penalties for stratification as they stand now seem to outweigh the bonuses too much for the player to rationally choose to stratify. Also, increasing differentials do not have enough incentives either.

- [OK] Governance overlay Class tab works
- [OK] Activation requires 8+ turns, costs legitimacy/satisfaction/resistance
- [OK] 4 bases: Property, Lineage, Religious, Military
- [OK] 4 differential dimensions x 3 tiers each
- [OK] Differentials change one tier at a time with internal lag
- [OK] Crime multiplier scales with differentials
- [OK] Interpersonal trust reduced by social/economic differential
- [OK] Immigration thresholds raised by social differential
- [OK] Basis change and dismantlement carry heavy costs
- [OK] Governance alignment modifies differential effectiveness

### Gender Formalization (Phase 14C)
- [OK] Governance overlay Gender Roles tab works
- [OK] Activation requires 8+ turns
- [OK] 4 dimensions x 5 positions each (-2 to +2)
- [OK] Restrictive positions self-sustain and generate resistance from excluded sex
- [OK] Egalitarian positions have legitimacy maintenance costs
- [OK] Egalitarian positions drift toward 0 when legitimacy < 30
- [OK] Deepening (+-1 to +-2) requires 4 turns at current position
- [OK] Cross-system hooks: economy production, trust, crime, immigration, policy lag, reproduction
- [OK] Governance cost multipliers vary by model

**General notes:** Class system and gender roles need to be taught to the player.

---

## Session 7: Territory & Military

### Territory Expansion (Phase 15)
- [OK] Starting territory: radius 2 around settlement
- [OK] Settlement hex shows "Territory center" info (no food yield)
- [OK] Settlement side panel shows name, rename button, health bar, expansion points

### Cultural Growth (Phase 15B)
- [OK] Territory expands organically near active borders
- [OK] Workers and buildings near border drive cultural strength
- [OK] Population and Identity level boost growth
- [OK] Named cultural regions give expansion scoring bonus
- [OK] Growth slows as more hexes are claimed (scaling threshold)
- [OK] Low activity causes outermost claimed hexes to decay

### Admin Hall Hex Purchase (Phase 15C)
- [OK] Admin Hall workers generate expansion points (0.5/worker/turn)
- [OK] Can click non-territory hex adjacent to territory to claim
- [OK] Cost: 8 base + 2 per claimed hex, 50% off in named regions
- [OK] "Claim Territory" button appears in side panel
- [OK] Claimed hex becomes part of territory immediately

### Governance Strain (Phase 15E)
- [OK] Beyond 25 hexes: legitimacy and bonds drain per turn
- [OK] Admin Hall workers offset strain (5 hexes per worker)
- [OK] Strain values shown in dev panel Territory tab

### Territory Forfeit (Phase 15E)
- [OK] Can abandon claimed (non-core) hexes
- [OK] Confirmation dialog warns about workers/buildings on hex
- [OK] Forfeiting costs Identity -1
- [OK] Workers and buildings on forfeited hex are removed

### Settler & New Settlements (Phase 15D)
- [OK] Settler trainable (pop 5, mat 25, 6 turns)
- [??] Settler can found new settlement (minimum distance enforced)

**Notes:** The found settlement action should be like other unit actions, accessible through an action button in the unit-display in the sidebar. Otherwise the settling action overrides the movement, so the settler can't move.

- [OK] Settlement naming dialog appears at founding
- [OK] New settlement starts with core radius 1
- [OK] Settler consumed on founding
- [OK] New settlement extends territory

### Settlement Health (Phase 15D)
- [OK] Settlements have 100 HP, regenerate +2/turn
- [OK] Threat raids damage settlement health
- [OK] At health 0: settlement destroyed
- [OK] Destruction: buildings/workers cleared, orphaned claimed hexes decay
- [??] Losing last settlement = game over

**Notes:** This loss state should trigger immediately upon losing the last settlement, not after 3 turns.

- [OK] Chronicle records settlement destruction

### Units & Combat
- [OK] Scout: movement 3, vision 2, can explore
- [OK] Warrior: combat capable, passive healing in territory
- [OK] Worker: can build fortifications
- [NO] Elder: passive bonuses

**Notes:** Not implemented at this stage.

- [OK] Steward: movement 2, tends monuments and sacred sites
- [OK] Settler: founds settlements
- [OK] Fog of war: units reveal hexes within vision radius
- [??] External threats spawn and path toward settlement

**Notes:** Threats need a rework. They should be able to spawn in fog of war and revealed territory where the player does not have vision, and not only at the edge of the map. Currently, threats can spawn in the ocean, not being able to move. A bandit camp building should be implemented, spawning in fog of war and revealed territory where the player does not have vision. It should have palisades on five sides and a gate on the sixth, and it should spawn threats at a higher rate while it persists. A player eliminating it would gain some materials and food, maybe gain a legitimacy and satisfaction bonus.

- [OK] Combat resolution works (attack/defense, HP, death)
- [OK] Unit death reduces population
- [OK] Disband returns full population to idle
- [OK] Unit upkeep: food consumption per turn
- [OK] Ration priority affects starvation ordering

### External Threats
- [??] Threats spawn from map edges

**Notes:** See previous note about threat spawning.

- [??] Threats navigate toward settlement

**Notes:** They sometimes spawn in ocean hexes, and can't move.

- [OK] Threat raids damage settlement + steal resources
- [OK] Defeated threats grant chronicle entries
- [OK] Military Rule: combat bonuses (+30% attack, +20% defense)

---

## Session 8: Events, Chronicle, UI

### Events
- [OK] Events trigger based on conditions (resource, cohesion, governance, population, etc.)
- [OK] Event modal displays correctly with choices
- [OK] Choices have visible consequences
- [OK] Cooldowns prevent repeat firing
- [OK] Trust effects apply from event consequences
- [OK] Dev panel: can trigger any event manually, clear cooldowns

**Notes:** I can't see the delayed consequences that sometimes are warned about (this choice will have further consequences in 2 turns). The event system will need a large overhaul before we add lots of more events. One idea I want is for events to affect policies and traditions. Currently, there is no policy change when a policy based event turns up, but the events should force changes based on the player's choice. This gives much weight to the decisions that also become urgent, since the player must decide then and there.

### Chronicle (Phase 8A)
- [OK] Chronicle records: founding, births, deaths, buildings, starvation, governance changes, combat
- [OK] Entries grouped by year
- [OK] Filterable by category
- [OK] Accessible from sidebar Society section
- [OK] Persists across save/load

### Save/Load
- [OK] Save game works (creates downloadable save file)
- [OK] Load game restores full state

**Notes:** As far as I can see, this is correct.

- [OK] claimedHexes serializes as Array, deserializes to Set
- [OK] Settlement fields (name, coreRadius, health, culturalStrength) survive save/load
- [OK] All system states survive save/load (trust, resistance, crime, immigration, class, gender, values, traditions, stories)

**Notes:** As far as I can see, this is correct.

- [OK] Old saves (version < 3) migrate gracefully

### Tutorial Hints
- [??] Hints appear at appropriate turns (1, 2, 3, 5, 8, 12, 15, 18)

**Notes:** As previously noted, the system needs an overhaul.

- [??] Hint content is helpful and accurate

**Notes:** Some hints display inaccurate information.

- [OK] Hints can be disabled via settings
- [OK] Hints don't block gameplay

### UI & Overlays
- [OK] All overlays open/close correctly (ESC, backdrop click, Done button)
- [OK] Workforce overlay: Workers, Build, Units, Train tabs all work
- [OK] Governance overlay: all tabs (Governance, Policies, Resistance, Crime, Immigration, Class, Gender)
- [OK] Population overlay: demographic pyramid, cohort details
- [OK] Traditions overlay: Summary, Calendar, Establish tabs
- [OK] Chronicle overlay: History Log, Oral Tradition tabs
- [OK] Values overlay: recognized/emerging values

**Notes:** There should be a small amount of randomness to the timing of the value crystallization, so not all values crystallize at the same time. It feels unnatural, and it also creates an overwhelming amount of information on the turns it happens. When the player changes a single policy out of the crystallized value's range, that value is desynchronized with the others, which sort of fixes it, but if the player chooses not to change policies from the default, all values progress at the same pace.

- [OK] Settings panel: UI scale works, scales correctly (including settings panel itself)
- [OK] Panels dropdown menu in top bar works
- [OK] Sidebar: terrain info, building info, unit info all display correctly
- [OK] No overlapping map labels at any zoom level

### Victory & Defeat
- [OK] Scoring covers 6 dimensions
- [??] Loss: population extinction triggers defeat

**Notes:** Logic is there but essentially this can't happen in the game's current state.

- [OK] Loss: prolonged cohesion collapse (<=5 for 3+ turns) triggers defeat
- [OK] Loss: total settlement loss triggers defeat
- [OK] Post-game summary shows educational feedback

---

## Balance Notes

Use this section to record balance observations during playtesting.

**Impoertant note:** For testing, the turn limit has been set to 50. The final game's standard mode will need a significantly longer turn horizon.

### Economy
- [OK] Are starting resources sufficient to survive the first year?
- [OK] Is food production vs consumption balanced for early game?
- [OK] Do building costs feel proportional to their value?
- [OK] Is material income sufficient to build buildings at a reasonable pace?
- [OK] Does winter feel meaningfully harder without being punishing?

**Notes:** Winter should be variably harsher.

### Population
- [OK] Is the birth rate reasonable (not too fast, not too slow)?
- [OK] Does Working Age policy feel like a meaningful trade-off?
- [OK] Do elders feel valuable (bonuses) without being a burden?
- [OK] Is starvation recovery possible without spiraling?

### Cohesion
- [??] Do pillars drift at reasonable speeds?

**Notes:** The speeds need to be calibrated for a significantly longer standard game.

- [OK] Is cohesion collapse avoidable with attentive play?
- [OK] Does the lowest-pillar drag mechanic create interesting pressure?
- [NO] Are society building yields appropriately tuned?

**Notes:** The more volatile pillars, legitimacy and satisfaction, feel more appropriately tuned than the other two, which feel like they grow much too quickly. It should feel difficult and meaningful to build identity and bonds.

### Territory
- [??] Is cultural growth speed reasonable?

**Notes:** It is too quick currently.

- [??] Is expansion point generation balanced?

**Notes:** Also feels a little too quick.

- [OK] Does governance strain create a meaningful expansion ceiling?

**Notes:** This is very hard for the player to keep track of.

- [OK] Is the settler cost (5 pop, 25 mat) appropriate?
- [OK] Does territory size feel manageable?

### Governance
- [OK] Do governance transitions feel consequential?
- [OK] Are policy effects noticeable and educational?
- [OK] Is policy lag too slow or too fast?

**Notes:** The exponential lag with large changes is interesting.

- [OK] Does each governance model feel distinct?

**Notes:** Governance should be expanded upon further at a later stage.

### Social Systems
- [OK] Does resistance pressure build at a reasonable rate?

**Notes:** It is difficult for the player to understand how and why it builds.

- [OK] Is crime suppression (Justice Hall) effective enough?
- [OK] Does immigration create interesting decisions?

**Notes:** The player needs more ready access to interact with the immigration system.

- [OK] Does the class system have visible effects on other systems?
- [OK] Does gender formalization create meaningful trade-offs?

### Pacing
- [OK] How many turns before the game feels "established"?

**Notes:** Too much of the other systems need some work before I can meaningfully assess this. 50 turns to game end feel way too short.

- [OK] Is there enough to do in the early game?

**Notes:** Bordering on overwhelmingly too much to do early game.

- [OK] When does the midgame become interesting?

**Notes:** Managing food with a limited workforce while attempting to build cohesion and protect the society from outside and inside threats is interesting.

- [OK] Is there a point where the game feels stale or solved?

**Notes:** Currently the game doesn't feel very challenging to survive.

- [OK] Do events fire at good intervals?

---

## UX Notes

The game needs a main menu.

---

## Educational Value Notes

Did the game teach the intended concepts? What worked, what didn't?

**Notes:** The game does include intended concepts. The delivery and tutorial is not up to par for the concepts to land. The game has become very complex, and most in the target audience will not have the patience to learn to play without a very good tutorial system that teaches each system before the player is sent off to lead their own society. A tutorial scenario suite, as well as a better hint system with an advisor system on top is needed.
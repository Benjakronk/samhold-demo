# Cohesion Calculation Reference

**Source file:** `systems/cohesion.js`
**Last updated:** Phase 9 (Society Buildings + delta accuracy fixes)

---

## Overview

Cohesion represents social health. It is stored as four independent **pillars**, each ranging 0–100. A fifth value, `total`, is derived from them and used for game-state thresholds and UI display.

All four pillar values are stored as **floats** between turns. The UI always rounds them to integers for display, but the underlying values carry fractional precision so small per-turn forces accumulate correctly.

### The four pillars

| Pillar | What it represents | Natural baseline |
|---|---|---|
| **Identity** | Shared culture, beliefs, sense of who "we" are | Decays toward 50 |
| **Legitimacy** | Acceptance of whoever is governing | Decays toward the current model's base (65/70/75) |
| **Satisfaction** | Immediate welfare — food, shelter, freedom | Decays toward 50 |
| **Bonds** | Community ties built through shared time and hardship | Decays toward 45 |

### Total cohesion formula

```
total = round( avg(pillars) × 0.7 + min(pillars) × 0.3 )
```

The lowest pillar has outsized drag. A society with three pillars at 90 and one at 20 scores `(67.5 × 0.7) + (20 × 0.3) = 53`, not 67.5.

### Thresholds

| Total | Status | Color |
|---|---|---|
| 80–100 | United | Green |
| 60–79 | Stable | Gold |
| 40–59 | Strained | Orange |
| 20–39 | Fractured | Red |
| 0–19 | Collapse | Dark red |

---

## Turn order — what modifies cohesion and when

Every turn, cohesion is modified by several systems in a fixed sequence. **Order matters**: steps 1–4 change the raw pillar values before `calculateCohesion` recalculates them, which affects how the decay-toward-baseline mechanic interacts with those changes.

```
1. processTraditions()        — bonuses when traditions fire; drift erodes Legitimacy
2. processStories()           — oral tradition story completions: Identity ±1 per story
3. processSocietyBuildings()  — fractional accumulator overflow → integer pillar points
4. processValues()            — passive Identity bonus per recognized value
5. calculateCohesion()        — recalculates all four pillars from current starting values
6. Elder unit bonus           — each healthy Elder: Identity +0.5 (outside calculateCohesion)
```

`calculateCohesion()` does **not** add a fixed delta — it recalculates each pillar as a function of its current value plus governance, policy, food state, etc. Steps 1–4 affect what "current value" those functions see.

---

## `calculateCohesion()` — the main recalculation

Called in step 5. Runs the four pillar functions in order, then computes `total`, then records `lastUpdate` (the per-pillar float delta from this turn's recalculation).

```js
calculateSatisfactionPillar();
calculateIdentityPillar();
calculateLegitimacyPillar();
calculateBondsPillar();
total = round( avg × 0.7 + min × 0.3 )
lastUpdate = { identity: new - prev, ... }   // floats; used as fallback in uiUpdates.js
```

---

## Pillar functions

Each pillar function reads `gameState.cohesion.<pillar>` as a starting float, applies a series of adjustments, clamps to [0, 100], and writes the result back. They do **not** round — float precision is preserved.

### Satisfaction

Most volatile pillar. Driven primarily by food security.

**Food logic** (based on `turnsOfFood = stockpile / |netFood|`):

| Condition | Change per turn |
|---|---|
| Sustainable income AND stockpile ≥ need | +8, cap 80 |
| Sustainable income, low stockpile | +4, cap 70 |
| Draining but > 8 turns left | +1, cap 65 |
| 4–8 turns left | −4 |
| 2–4 turns left | −8 |
| Under 2 turns / starving | −14 |

**Working Age modifier** (only when children exist):
- Age < 10: penalty = `(10 - age)` → satisfaction −`penalty × 0.15` (halved during starvation)
- Age > 12: bonus = `min(4, age - 12)` → satisfaction +`(floor(bonus/2) + 1) × 0.1`, cap 85

**Governance model modifiers:**

| Model | Effect |
|---|---|
| Tribal Council | `freedomBonus: 0.3` → `(freedom - 50) / 100 × 0.3` added |
| Chieftain | `controlBonus: 0.2` → `(50 - freedom) / 100 × 0.2` added |
| Theocracy | `orderBonus: 0.4` (flat, always), `freedomPenalty: -0.2` (flat, always) |

**Freedom policy direct effect:**
- freedom > 70: +0.5, cap 90
- freedom < 30: −0.3

**Shelter** (sum of building shelter points / total population):
- ratio ≥ 0.8: +3, cap 85
- ratio ≥ 0.5: +1, cap 70
- ratio < 0.3: −2

Building shelter values: Farm = 2, Fishing Dock = 3, all others = 1.

**Decay toward 50:** ±0.8 per turn, never crosses 50.

---

### Identity

Slowest-moving pillar. Represents shared culture and beliefs.

**Decay toward 50:** ±0.2 per turn, never crosses 50.

**Knowledge resource side-effect** (modifies `gameState.resources.knowledge`):
- Working Age < 10 and children exist: `knowledge -= floor((10 - age) / 2) × 0.1`
- Working Age > 12 and children exist: `knowledge += min(4, age - 12) × 0.05`, cap at `knowledge × 1.01`

**Governance model modifiers:**

| Model | Effect |
|---|---|
| Tribal Council | `traditionBonus: 0.4` → `(tradition - 50) / 100 × 0.4` added |
| Chieftain | `leadershipBonus: 0.2` flat, cap 80 |
| Theocracy | `faithBonus: 0.6` flat, cap 90 |

**Tradition policy direct effect:**
- tradition > 70: +0.3, cap 85
- tradition < 30: −0.2, floor 20

**Knowledge thresholds:**
- knowledge ≥ 20: +0.5, cap 85
- knowledge ≥ 10: +0.2, cap 70

---

### Legitimacy

Measures acceptance of governance. Each model has its own baseline it decays toward.

**Governance transition penalty** (when `modelChangeTimer > 0`):
- Base penalty: −5 per turn
- Staffed Meeting Hall workers reduce penalty: −1 per worker, capped at halving (max −2 reduction)
- `modelChangeTimer` is decremented here each turn

**Decay toward model base** (±0.5 per turn, never crosses base):

| Model | Legitimacy base |
|---|---|
| Tribal Council | 65 |
| Chieftain | 70 |
| Theocracy | 75 |

**Model-specific effects:**

| Model | Effect |
|---|---|
| Tribal Council | `timeStabilityBonus: 0.2` from year 3 onward, cap 85; `traditionBonus: 0.5` → `(tradition - 50) / 100 × 0.5` |
| Chieftain | `satisfactionDependency: 0.8` → if satisfaction < 30: −`1.5 × 0.8` = −1.2 |
| Theocracy | `identityDependency: 0.6` → `(identity - 50) / 100 × 0.6` added |

**Default satisfaction effect** (all models without explicit `satisfactionDependency`):
- if satisfaction < 30: −1.5

---

### Bonds

Slowest natural growth. Represents accumulated community ties.

**Base growth** (from year 2 onward): +0.3, cap 80.

**Governance model modifiers:**

| Model | Effect |
|---|---|
| Tribal Council | `stabilityBonus: 0.2`, cap 85 |
| Chieftain | `unityBonus: 0.3`, cap 88 |
| Theocracy | `sharedBeliefBonus: 0.4`, cap 90 |

**Shared hardship:** if satisfaction < 40 and population > 1: +0.5, cap 90.

**Tradition policy:** if tradition > 60: +0.2, cap 85.

**Decay toward 45:** ±0.1 per turn, never crosses 45.

---

## Sources of cohesion change outside `calculateCohesion`

These bypass the pillar functions entirely and write directly to `gameState.cohesion.*`.

### Traditions (`processTraditions`)
- **Firing:** bonuses defined per tradition; typically Bonds/Identity/Legitimacy/Satisfaction ±1–3
- **Missing a due tradition:** Bonds −2, Identity −1
- **Drift:** long-established traditions erode Legitimacy each turn (accumulator-based)
- **Abandonment/change penalty:** scales with `timesPerformed` and Tradition policy

### Oral tradition (`processStories`)
- Storytellers accumulate `storyProgress` at 0.25/storyteller/turn
- Each whole point: one story composed → **Identity +1**
- Stories can also fade if over capacity: **Identity −1** per fade
- No storytellers after grace period (4 turns): **Identity −1** per turn until stories gone

### Society buildings (`processSocietyBuildings`)
Fractional yields accumulate in `gameState.culture.societyBuildingAccumulators`. When any accumulator reaches a whole number, the integer portion is applied to the corresponding pillar.

| Building | Yield per worker per turn | Notes |
|---|---|---|
| Shrine | Identity +0.15, Satisfaction +0.05 | Theocracy: identity yield ×1.5 |
| Meeting Hall | Legitimacy +0.12 | — |
| Sacred Site | Bonds +varies | Type-dependent |
| Monument | Identity +0.05, Bonds +0.05 | Passive; no workers needed |
| Monument (neglected) | Identity −0.05, Bonds −0.05 | Doubles if upkeep also unpaid |

All society buildings require upkeep materials. If unaffordable, their yield is skipped.

### Values (`processValues` → `applyValueBonuses`)
Each recognized value adds identity per turn: `min(1.5, 0.3 × strength)`. Strength grows by `VALUE_STRENGTH_PER_TURN` each turn it's held, max 10. A value at full strength contributes **+1.5 Identity/turn**.

### Elders (unit processing, post-`calculateCohesion`)
Each Elder unit with health ≥ 50 adds **Identity +0.5** directly, after all other calculations.

### Monument completion (construction)
One-time **Identity +3** when a monument's build completes. This bonus persists even if the monument is later demolished.

### Demolishing a monument (building actions)
Outrage scales with monument age (`gameState.turn - hex.completedTurn`):

| Monument age | Identity | Legitimacy | Bonds |
|---|---|---|---|
| 1–4 turns | −3 | −2 | — |
| 5–19 turns | −6 | −4 | — |
| 20+ turns | −10 | −7 | −3 |

### Events
Event choices can apply arbitrary cohesion deltas. Defined in `data/events.js`; not enumerated here.

### Cohesion effects on the world (`applyCohesionEffects`)
After `calculateCohesion` each turn:
- total ≥ 80 (United): `knowledge += 0.5` (small bonus)
- total < 40 (Strained): 2% chance of emigration (−5% population)
- total < 20 (Fractured): 5% chance of emigration (−10% population)

---

## `previewCohesionDeltas()` — the UI projection

Called on every sidebar render to show next-turn delta annotations. Returns `{ identity, legitimacy, satisfaction, bonds }` as floats. **Does not mutate permanent state.**

Mirrors the actual turn order exactly:
1. Save pillars, food, knowledge
2. Project food: `food = max(0, food + netFood)`
3. Apply tradition deltas (from `projectTraditionDeltas()`) to pillar values
4. Apply oral tradition story completion/loss projection
5. Apply society building accumulator overflow projection
6. Apply values passive identity bonus
7. Run the four pillar functions (calculateCohesion equivalent)
8. Apply elder identity bonus projection
9. Compute deltas from saved values
10. Restore everything

Resources saved and restored: `food`, `knowledge` (knowledge is a side-effect of `calculateIdentityPillar`).

**Delta display format:** values < 0.05 suppressed; sub-integer shown with 1 decimal (e.g. `+0.3`); integer shown without decimal (e.g. `+2`).

---

## `gameState.cohesion` shape

```js
{
  identity:     float,   // 0–100, stored as float
  legitimacy:   float,   // 0–100, stored as float
  satisfaction: float,   // 0–100, stored as float
  bonds:        float,   // 0–100, stored as float
  total:        int,     // derived, Math.round of weighted formula
  lastUpdate: {          // float deltas from the most recent calculateCohesion call
    identity:     float,
    legitimacy:   float,
    satisfaction: float,
    bonds:        float
  }
}
```

---

## Common misconceptions

**"The pillar values are integers."** No — they are stored as floats. The UI rounds them for display (`Math.round(c.identity)`), but the stored value carries fractional precision. A shrine with 2 workers contributes +0.30 identity per turn to the accumulator; this accumulates to a whole point over several turns.

**"calculateCohesion adds a fixed increment each turn."** No — it recalculates from the current value each turn, applying decay-toward-baseline and governance/policy bonuses. This means the same forces produce smaller and smaller net changes as the pillar approaches its natural equilibrium.

**"The delta shown in the sidebar is only from calculateCohesion."** No — it includes traditions, oral tradition, society buildings, values bonuses, and elder bonuses. If the displayed delta seems large, values and elders are often the biggest contributors at mid-game.

**"Demolishing a monument removes the Identity bonus."** No — the permanent +3 from monument completion is not revoked on demolish. Only the ongoing passive yield stops.

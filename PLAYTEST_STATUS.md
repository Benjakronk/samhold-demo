# Playtest Remediation Status

Last updated: 2026-04-05

## Overview

Two rounds of playtesting have been completed. The first produced the original remediation plan (Tiers 1–5). The second (a 400-turn game) caught additional runtime bugs and exposed mid/late-game pacing issues. All critical fixes are complete. This document tracks what's done, what remains, and what emerged from the second playtest.

---

## Tier 1 — Broken (7/7 DONE)

| # | Issue | Status |
|---|-------|--------|
| 1.1 | Society building yields invisible | **DONE** — fractional yields shown in `getCohesionBreakdown()` for all society buildings |
| 1.2 | Governance tab highlight desync | **DONE** — duplicate variable removed, reads from `overlayManager` via `getActiveGovernanceTab()` |
| 1.3 | Resistance resolution UI missing | **DONE** — Suppress/Negotiate/Reverse buttons in `renderResistancePanel()` |
| 1.4 | Threat spawning on ocean | **DONE** — `findRandomMapEdge()` retries up to 20× avoiding ocean/lake |
| 1.5 | Tutorial turn 1 hint never appears | **DONE** — fires after settlement naming callback, not during turn processing |
| 1.6 | Monarchy succession crisis 0 duration | **DONE** — uses `successionCrisisTurnsRemaining` counter, 3 turns |
| 1.7 | Military combat bonuses never applied | **DONE** — `getMilitaryCombatBonuses()` returns correct field names, combat.js calls it |

## Tier 2 — Incomplete (9/9 DONE)

| # | Issue | Status |
|---|-------|--------|
| 2.1 | Resistance pressure delta not shown | **DONE** — `projectResistanceDelta()` displayed in resistance tab |
| 2.2 | Resistance effects missing from cohesion breakdown | **DONE** — drain entries for all affected pillars at 60+ and 95+ thresholds |
| 2.3 | Society building satisfaction missing from breakdown | **DONE** — shrine, festival grounds, market satisfaction all in breakdown |
| 2.4 | Monument neglect not in building display | **DONE** — neglect status, drain amounts, restore cost in side panel |
| 2.5 | Market satisfaction yield not shown | **DONE** — satisfaction per worker shown in building display |
| 2.6 | Policy confirm dialogs missing | **DONE** — `confirmCommitPolicy/AbandonPolicy/ForcePolicy` with cost breakdowns |
| 2.7 | Settlement naming dismissible by backdrop | **DONE** — `noBackdropDismiss: true` on naming/founding dialogs |
| 2.8 | Market satisfaction yield in display | **DONE** — same as 2.5 |
| 2.9 | Democracy force costs not previewed | **DONE** — force button shows full cost breakdown |

## Tier 3 — UX/Communication (9/10 DONE, 0 PARTIAL, 1 DEFERRED)

| # | Issue | Status |
|---|-------|--------|
| 3.1 | Elder food breakdown misleading | **DONE** — working elders vs retired elders split in turn summary + sidebar |
| 3.2 | Winter warning needs early hint | **DONE** — "Winter Is Coming" hint fires on turn 3 (first autumn) |
| 3.3 | Turn summary overwhelming | **DEFERRED** — awaiting advisor system design |
| 3.4 | Shelter score invisible | **DONE** — shelter explanation in cohesion breakdown |
| 3.5 | Nursing breakdown not detailed | **DONE** — per-batch completion times shown |
| 3.6 | Governance transition penalty detail | **DONE** — confirm dialog shows base penalty, Meeting Hall worker reduction, and military exit penalty |
| 3.7 | Resistance faction needs context | **DONE** — expanded motivation text in faction card |
| 3.8 | Justice Hall suppression unclear | **DONE** — detection level + passive suppression %/turn in building display |
| 3.9 | Governance strain hard to track | **DONE** — strain shown in settlement panel |
| 3.10 | Immigration system opaque | **DONE** — turn 12 hint verified present; policy description overlap fixed (margin-top -8px→2px) |

## Tier 4 — Balance (7/10 DONE, 3 DEFERRED)

| # | Issue | Status |
|---|-------|--------|
| 4.1 | Identity/Bonds grow too quickly | **DONE** — identity decays at 0.35 above 50, bonds grow only 0.05 upward |
| 4.2 | Cultural growth too fast | **DONE** — base cost 8→14, step 4→6 |
| 4.3 | Expansion point generation too fast | **DONE** — 0.5→0.3 per worker/turn |
| 4.4 | Cohesion collapse nearly impossible | **DEFERRED** — "no spirals" policy removed; needs dedicated tuning pass |
| 4.5 | Class system incentives | **DONE** — `getClassProductionMultiplier()` wired into economy.js |
| 4.6 | Population extinction nearly impossible | **DEFERRED** — needs disease events, harsher winters |
| 4.7 | Value crystallization simultaneous | **DONE** — ±2 turn `crystallizeOffset` randomness |
| 4.8 | Variable winter severity | **DONE** — `winterSeverity` (0.7–1.3×) generated each year, applied to all winter cost calculations, labeled in turn summary |
| 4.9 | Turn limit too short | **DONE** — 50→400 turns |
| 4.10 | Sole survivor should be loss condition | **DEFERRED** — design philosophy changed to allow spirals |

## Tier 5 — Design Requests (ALL DEFERRED)

All Tier 5 items are deferred to the main roadmap. See plan for details.

---

## Second Playtest: Additional Bugs Fixed

These emerged during the 400-turn playtest, beyond the original plan:

| # | Issue | Status |
|---|-------|--------|
| B.1 | Settler not consumed when founding settlement | **DONE** — explicit `settlerUnitId` passed through dialog chain |
| B.2 | Material delta showing wrong value (crime/tradition drains invisible) | **DONE** — `projectedMatDrains` + `projectedFoodDrains` include all sources |
| B.3 | Warrior health NaN after combat under Military Rule | **DONE** — field name mismatch fixed, null guard when not military rule |
| B.4 | Retirement not pulling workers off jobs | **DONE** — `releaseWorkersFromHexes()` on birthday + policy change |
| B.5 | Raising retirement age doesn't add workers | **DONE** — newly-eligible elders added to `population.idle` |
| B.6 | Bandits repelled with no damage to anything | **DONE** — base defense removed (was 1, made bandits immune); fortification damage on repel |
| B.7 | Retirement age labels flipped (50="No Rest") | **DONE** — reversed to 50="Honored Elders", 80="No Rest" |
| B.8 | Retired elders assignable as workers in workforce panel | **DONE** — `getAssignableIdle()` consolidated as single source of truth |
| B.9 | Workforce panel idle count differs from sidebar | **DONE** — workforce panel uses `getAssignableIdle()` for display + buttons |
| B.10 | Food/material breakdowns incomplete | **DONE** — all drains (crime, traditions, immigration) in sidebar, top bar, click breakdown, and turn summary |
| B.11 | Top bar food delta disagrees with sidebar | **DONE** — sidebar shows `effectiveNetFood` (after winter + drains), not raw `netFood` |
| B.12 | Storytellers not reduced when population drops | **DONE** — `clampWorkers()` now also clamps storytellers |
| B.13 | Retired elders as storytellers (intentional) | **DONE** — kept as feature; "retired eligible" note in workforce panel |

---

## Remaining Work

### All Pre-Playtest Fixes Complete

R.1 (governance transition dialog), R.2 (variable winter severity), and R.3 (immigration tooltip + hint) are now done.

### Deferred to Balance Pass (Post-Roadmap)

These require a dedicated playtest-and-tune session with the new "stakes matter" design philosophy:

- **4.4: Make cohesion collapse achievable** — remove/weaken recovery floors, make low cohesion stickier
- **4.6: Make population extinction possible** — disease events, famine escalation, aggressive threats
- **4.10: Sole survivor as loss condition** — remove protection or convert to countdown
- **Late-game pacing** — diagnosed as content drought, pending advisor/event/threat roadmap features

### Deferred to Roadmap Features (Tier 5)

Priority order (unchanged):
1. Advisor/tutorial system overhaul
2. Event system enhancements (policy forcing, delayed consequences)
3. Threat system rework (bandit camps, fog-of-war spawning)
4. Child food scaling at puberty
5. Everything else (shelter building, life expectancy, story dedup, main menu, etc.)

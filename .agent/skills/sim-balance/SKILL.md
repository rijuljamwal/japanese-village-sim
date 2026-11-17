---
name: sim-balance
description: How to test and tune the night guard, thief, and chase simulation so both captures and escapes happen and nothing gets stuck.
---

# Simulation Balance

Use after any change to guards, thieves, detection, or chase code.

## Steps
1. Make sure the game supports `?seed=N&fast=1&headless=1` and `window.__sim`.
2. Run `node tools/sim_test.js 30` (30 nights, different seeds).
3. Read the report. Targets:
   - capture rate between 35 and 65 percent
   - at least one robbery on most nights, no night with more than the
     configured maximum thieves
   - guards spot a thief on most robberies but not all
   - no characters stuck, walking through walls, or overlapping for a long time
   - chases last a believable time (about 5 to 25 in-game seconds)
4. If capture rate is too high or too low, change ONLY numbers in
   `src/config.js` (thief speed bursts, guard stamina loss, detection chance,
   number of guards, shortcut chance). Rerun.
5. Keep the same seeds when comparing before and after, then run 30 NEW seeds
   to confirm.
6. Also watch one night visually in the browser at 1x, 2x, and 4x speed and
   confirm the story is readable: sneak, rob, spot, shout, chase, outcome,
   morning reaction.
7. Report the final numbers to the user.


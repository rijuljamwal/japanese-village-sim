---
name: visual-qa
description: How to check the running game against the reference images and fix differences until it matches.
---

# Visual QA

Run this after every visual change, and before reporting anything finished.

## Steps
1. Start the game and open it in the built-in browser at the base scale.
2. Take screenshots: day, dusk, night, and a close crop of a character group.
3. Run `python tools/compare.py <screenshot> <matching reference>` for each.
4. Read the score and the list of differences. Look at the side-by-side and
   the heat map yourself.
5. Check pixel-perfect rendering: image smoothing is off, scale is an integer,
   sprites are at whole-pixel positions, no blurry edges when zoomed in.
6. Check layout: characters stand on the ground line, correct size relative to
   houses, correct draw order, nothing floating or cut off.
7. Check night: strong contrast, warm glows at lanterns and windows, thieves
   darker than villagers, guard light cones visible.
8. Fix the biggest differences first. Repeat from step 2.
9. Stop when every compare score passes the threshold, or after 5 rounds.
   If you stop at 5 rounds, report what still differs.

## Report format
Give the user: the screenshots, the scores, what you fixed, what is still
different, and what assets (if any) the user needs to provide.


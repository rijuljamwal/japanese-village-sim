# Japanese Pixel-Art Village Simulation

A relaxing, non-interactive side-view pixel-art simulation of a traditional Edo-period Japanese countryside village with an authentic day/night cycle, living village schedules, lantern-lit night watchmen patrols, and unpredictable thief robberies and chases.

## Overview

- **Camera & Style:** Fixed stage-like side view in crisp 16-bit pixel art (480x270 base resolution scaled 4x).
- **Day Life:** Farmers work the paddies, merchants trade at stalls, villagers chat with speech bubbles, and festivals with taiko drummers and dancers take place at the shrine.
- **Night Life:** Villagers sleep behind glowing paper windows. Watchmen guards patrol with swaying lanterns and light cones. Thieves sneak in from the shadows to burglarize houses.
- **Dynamic Chases & Outcomes:** When spotted, guards sound the alert and pursue thieves. Outcomes are simulation-driven (stamina, speed bursts, obstacles, cornering): captured thieves are jailed in the guardhouse cage until morning; escaping thieves disappear into the mist.
- **Morning Aftermath:** Robbed villagers express frustration, assess stolen loot, and resume daily routines.

## How to Run

1. Open `index.html` directly in any modern web browser, or serve locally with any static web server:
   ```bash
   # Using Python
   python -m http.server 8000
   ```
2. Navigate to `http://localhost:8000` in your browser.
3. Use the on-screen clock and simulation speed controls (Pause, 1x, 2x, 4x) to watch the village life unfold. Press `L` to toggle the event log.

# Japanese Pixel-Art Village Simulation (Full HD)

A relaxing, autonomous, non-interactive pixel-art simulation of a cozy winter Japanese countryside village. Featuring a seamless 4-phase day/night cycle, living autonomous villagers with real-world physics and daily routines, lantern-lit night watchmen patrols, and dynamic thief robberies, pursuits, and captures.

Repository: [https://github.com/rijuljamwal/japanese-village-sim](https://github.com/rijuljamwal/japanese-village-sim)

---

## 🌟 Key Features

- **Full HD Visuals (1920x1080):** High-definition hand-crafted pixel art running at 1920x1080 native canvas resolution. Characters are rendered with razor-sharp 80x140 sprites with smooth outlines, detailed textures (knitted scarves, ushanka hats, steaming mugs, hammers), and authentic animations.
- **Physical Obstacle Collisions:** Rigid-body collision boxes around every building (West Cottage, North Manor, East Cottage, Blacksmith Forge, Market Stall, Fenced Garden, Central Campfire, and Frozen River). Characters, guards, and thieves physically collide with structures and navigate along cleared snow trails—never clipping or walking through houses.
- **Soft-Body Social Physics & Avoidance Steering:** Villagers and guards possess personal collision radii and predictive avoidance steering (deflecting laterally to pass on the right), preventing agents from ghosting through each other.
- **Real-World Interactions & Stations:**
  - **Farmer Woman (Aoi):** Tends winter leeks and cabbage beds in the fenced garden.
  - **Blacksmith Elder (Daiki):** Forges iron horseshoe on the anvil (producing glowing orange sparks!) and warms by the furnace.
  - **Merchant Woman (Hana):** Operates the market stall, displaying winter produce.
  - **Children (Kenji & Ren):** Play in the snow, run across the bridge, and deposit dynamic footprints.
  - **Grandmother (Chiyo):** Carries warm tea mugs between cottages and the campfire.
  - **Hunter (Kenta):** Guards the frozen river bridge and watches the perimeter.
  - **Midday & Dusk Campfire Feasts:** Villagers gather around the central campfire to warm up, sit on log benches, eat roast chicken, and drink steaming hot tea.
  - **Dynamic Social Dialogue:** Villagers pause to greet each other on the trails with Japanese-inspired winter speech bubbles.
- **Atmospheric 4-Phase Day/Night Cycle:**
  - **Morning (07:00 - 11:00):** Gentle dawn light, awakening village routines.
  - **Day (11:00 - 17:00):** Clear daylight, active work stations, midday campfire gathering.
  - **Dusk (17:00 - 19:00):** Warm golden twilight, dinner feast, chimney smoke billowing into the evening sky.
  - **Night (19:00 - 05:00):** Villagers sleep behind glowing amber shoji windows. Three watchmen guards patrol sectors with sweeping lantern vision cones. Stealthy thieves sneak in to burglarize cottages.
- **Night Guard Pursuits & Captures:** Guards spot thieves with lantern cones, shout the alert, and chase thieves across the snowy plaza. Guards tackle thieves on contact, bind them with ropes, and escort them to the village cage. Escaping thieves flee across the frozen bridge.
- **Environmental Particles:** Falling snowflakes with gentle wind drift, billowing chimney smoke plumes, and glowing anvil sparks.

---

## 🎮 How to Run

1. Open `index.html` directly in any modern web browser, or launch a local web server:
   ```bash
   python -m http.server 8000
   ```
2. Navigate to `http://localhost:8000` in your web browser.
3. **Controls:**
   - **Simulation Speed:** Click the top-right HUD buttons (`⏸`, `1x`, `2x`, `4x`) to adjust playback speed.
   - **Event Log:** Press `L` on your keyboard to toggle the on-screen Village Event Log.
   - **Debug URL Parameters:** Jump to any time of day by adding URL parameters (e.g., `http://localhost:8000/?hour=22&speed=2` for night chase testing).

---

## 🧪 Verification & Tooling

The project includes an automated QA and testing suite in `tools/`:

- **Asset Validation (`tools/validate_assets.py`):**
  Checks all sprites for correct naming conventions, frame counts, dimensions, binary transparency, and palette match.
  ```bash
  python tools/validate_assets.py
  ```
- **Visual QA Comparison (`tools/compare.py`):**
  Automated SSIM, histogram correlation, and edge structure comparison against the master reference art.
  ```bash
  python tools/compare.py screenshot_hd_day.png reference/01_full_village_winter_scene.jpg
  ```
- **Headless Simulation Tester (`tools/sim_test.js`):**
  Runs 30 Monte Carlo simulated nights to verify chase balance (target capture rate 35% - 65%).
  ```bash
  node tools/sim_test.js
  ```

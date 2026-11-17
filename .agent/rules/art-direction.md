# Project Rules: Japanese Pixel-Art Village Simulation (Day + Night)

## What this project is
A NON-INTERACTIVE simulation that runs entirely on its own. The user only
watches. No player controls, no score. Single fixed side-view camera of a
Japanese countryside village in pixel art.

By DAY: villagers farm, trade, talk, and hold festivals.
By NIGHT: guards patrol the village; thieves sneak in to rob houses; guards
chase them. Sometimes the thief escapes, sometimes the thief is captured.

We are building this FROM SCRATCH in an empty project.

## TECH RULES
1. Build with plain HTML5 Canvas + JavaScript (no framework needed) so it runs
   by opening index.html in a browser or via a tiny local server. Only use
   another approach if it is clearly better, and explain why first.
2. Keep files separate:
   - index.html
   - src/config.js          (ALL tunable numbers)
   - src/assets.js          (loading images and sprite sheets)
   - src/time.js            (clock, day/night cycle)
   - src/villager.js        (villager behavior)
   - src/guard.js           (guard behavior)
   - src/thief.js           (thief behavior)
   - src/events.js          (festival, robbery, chase events)
   - src/world.js           (houses, doors, locations, waypoints)
   - src/render.js          (drawing, layers, lighting)
   - src/main.js            (game loop)
3. Code must be commented and structured so a non-programmer can follow it.

## ART RULES (highest priority)
1. NEVER draw characters, buildings, scenery, or props using code shapes,
   rectangles, circles, gradients, or emoji. ALWAYS load image files from
   `assets/`. (The only allowed code drawing: the darkness overlay and
   soft light glows for night lighting, see Lighting Rules.)
2. If an asset is missing, do NOT invent a drawing. Show a clearly labeled
   temporary placeholder box and add the missing file to `MISSING_ASSETS.md`.
   Tell the user exactly which file is needed, with name, size, and frames.
3. The visual target is the images in `reference/`. They are the source of
   truth. If the running game does not match them, the game is wrong.
4. Pixel-perfect rendering:
   - Base resolution 480x270, scaled by an integer factor (4x for 1080p).
   - Nearest-neighbor only. Disable image smoothing
     (`imageSmoothingEnabled = false`, CSS `image-rendering: pixelated`).
   - Draw at whole-pixel positions only (round x and y).
   - Never stretch, blur, or non-uniformly scale an asset.
5. Characters face RIGHT in their files. Flip horizontally in code for left.
6. Sprite sheets are horizontal strips named `name_action_Nf_WxH.png`
   (example: `guard_run_6f_32x48.png`). Read frame count and size from the
   file name.

## LIGHTING RULES (night)
- Use the pre-made background variants (day, dusk, night, morning) and
  crossfade between them smoothly over about 60 to 90 in-game minutes.
- At night, add a dark blue translucent overlay over characters so they
  match the night background.
- Lanterns carried by guards, hanging lanterns, window glow, and the
  guardhouse emit a soft warm light glow (use the glow sprite from
  `assets/effects/`). Characters near a light source are drawn brighter
  (no overlay darkening within the glow area).
- Thieves are harder to see: draw them darker, and only fully visible when
  inside a light glow or the moonlit open street.
- A guard's lantern has a light cone in front of him. A thief entering the
  cone is SPOTTED (see Detection).

## SIMULATION RULES

### Time
- One full day lasts a configurable number of real minutes (default 12
  real minutes = 24 in-game hours).
- Phases (in-game time):
  - 05:00 to 07:00 Dawn
  - 07:00 to 17:00 Day
  - 17:00 to 19:00 Dusk
  - 19:00 to 05:00 Night
- Show a small clock and pause / 1x / 2x / 4x speed buttons. These are the
  ONLY UI.

### Villagers (daytime)
- Each villager is an independent agent with: type, home house, current
  state, daily schedule, speed, and personality (chatty or quiet).
- States: idle, walk, farm, plant, carry, trade, talk, sit, festival_dance,
  drum, sleep, scared.
- Day rhythm: dawn leave homes, morning farming and carrying, midday market
  and talking and resting, evening return home, lanterns light up.
- Festival: scheduled every few in-game days at the shrine. Drummers play,
  others dance, lanterns glow, fireworks at night.
- When two villagers meet, they may stop, show a speech bubble, talk for a
  few seconds, then continue.
- At night, villagers go indoors and sleep (disappear into their house door
  with a short fade, and a lit window shows they are home). A few may walk
  with lanterns early in the evening.
- Add small random pauses and speed variation so movement feels alive.

### Guards (night)
- 3 to 4 guards (configurable). They spawn from the guardhouse at dusk and
  return at dawn.
- Each guard has a patrol route of waypoints along the village (guardhouse,
  houses, market, shrine, bridge). Routes overlap but start at different
  points so the village is not always evenly covered.
- Guard states: stand_watch, patrol, alert, shout, chase, catch, escort,
  frustrated, return_to_post.
- Patrol: walk slowly with the lantern, pause now and then to stand watch,
  sometimes look left and right.
- Guards do not see everything: they only detect a thief inside their light
  cone or very close to them (see Detection). This is what makes escapes
  possible.

### Thieves (night)
- 0 to 2 thieves can be active at once (configurable). A thief appears at
  the village edge (left or right side, or from the stream side) some time
  after 21:00, with a random delay.
- Thief states: sneak, hide, approach_house, rob, loot, flee, climb,
  escape, struggle, captured.
- Robbery sequence (state machine):
  1. SNEAK in from the edge, crouching, staying in dark areas and avoiding
     lantern light when possible.
  2. Choose a target house (prefer houses far from any guard's current
     position).
  3. HIDE briefly near the house if a guard is close, then continue.
  4. APPROACH_HOUSE and ROB: the door changes to "slightly open with light",
     the thief goes inside (fades through the door), spends 4 to 8 seconds
     inside, then comes out with the sack.
  5. A robbed house gets a persistent "robbed" marker (door left open or
     broken; a dropped item on the ground).
  6. Thief may rob a second house (probability in config) or leave.
  7. Thief heads to an escape point (village edge or river bank).

### Detection
- A guard spots a thief if the thief is within the lantern cone and within
  the detection distance, OR within a very short distance of the guard
  regardless of direction.
- Detection has a random chance per second (so guards sometimes miss it).
- Villagers who are asleep do not detect anything. Awake villagers (wake-up
  chance when a house is robbed) may shout, which alerts the closest guard.
- When spotted: guard goes ALERT (red exclamation bubble), SHOUTS (alerts
  nearby guards and rings the alarm drum if near it), then CHASES.

### Chase and outcome
- Thief runs toward the nearest escape point. Guards run after the thief.
  Speeds are close; small random bursts of speed make the outcome
  uncertain.
- Chase outcome is decided by the simulation, NOT scripted. Use these
  factors (all weights in config.js):
  - speed difference and random bursts,
  - number of guards chasing (more guards raise the catch chance),
  - whether another guard is positioned ahead of the thief (can block the
    way and corner him),
  - obstacles: the thief may jump over a fence or climb a roof edge
    (shortcut, but a random chance to stumble),
  - distance to the escape point,
  - stamina: both lose stamina over time; a tired guard drops out.
- Target balance: about 50 percent of thieves are captured and about 50
  percent escape (configurable).
- CAPTURED: the catching guard plays the catch animation, the thief plays
  captured, guards escort him (rope) to the guardhouse, he is placed in the
  prison cage or stocks. He stays until morning (or a configurable number of
  hours), then is led away off the screen edge.
- ESCAPED: the thief reaches the edge and leaves with a smoke puff. The
  guards play the frustrated animation, then return to patrol, with higher
  alertness for a while (shorter patrol pauses, wider detection).
- Stolen loot: if the thief is captured, the stolen sack is dropped and
  returned to the house; if he escapes, the house stays marked as robbed
  until morning.

### Morning aftermath
- Next morning, villagers who were robbed come outside, show a sad or angry
  speech bubble, and talk with neighbors and the nearest guard.
- Villagers near a captured thief in the cage may stop and look at him.
- Village slowly returns to normal day routine. Clear the robbed markers
  after a configurable time.

### Depth and layering
- Draw order: sky, far mountains, mid village, then characters sorted by y
  position (lower y drawn in front), then foreground ground and props, then
  night overlay and glows, then clock UI.

### Extras (include if time permits)
- Soft ambient sound (crickets, temple bell at dusk, festival drum, footsteps
  on dirt) using files from `assets/audio/` if the user adds them; otherwise
  skip silently.
- A small, unobtrusive event log in the corner (toggle with a key) showing
  lines like "Thief spotted near the market" or "Guard Kenta captured the
  thief" so the user can follow the story. Off by default.

## TOOL RULES
- Use the tools described in `.agent/skills/` (pixel-art-pipeline,
  visual-qa, sim-balance) for all art processing, checking, and testing.
- Generate art ONLY with the connected image tool (MCP). Always pass the
  images in `reference/` and the approved master characters as style
  references. Always use the exact Style Block from the project guide.
- Every generated image MUST go through the pipeline scripts in `tools/`
  (palette lock, nearest-neighbor downscale, background removal, frame
  alignment, validation) BEFORE it is placed in `assets/`. Never copy a raw
  AI image into `assets/`.
- Run `python tools/validate_assets.py` after adding or changing any asset.
  Fix every error it reports.
- Run `python tools/compare.py` after every visual change. A change is not
  done until the score passes the threshold in config.
- Maximum 3 regeneration attempts per asset. After that, stop, save the best
  attempt in `assets/_review/`, and ask the user to choose or adjust.
- Never overwrite an approved asset. Save new versions as `name_v2.png` and
  ask the user before replacing.
- Never print or commit API keys. Keys live only in the MCP config or a
  `.env` file listed in `.gitignore`.

## SELF-CHECK RULE (mandatory)
After EVERY visual change:
1. Run the game.
2. Take a screenshot.
3. Compare it against the images in `reference/`.
4. List the differences in color, style, scale, and layout.
5. Fix them. Repeat until it matches closely.
Also test the night simulation: fast-forward to night (4x speed) and verify
that guards patrol, a thief appears, a robbery happens, and both outcomes
(capture and escape) can occur. Do not report a task finished until this
loop is done.

## CONFIG RULE
All numbers go in `src/config.js`: day length, speeds, number of guards and
thieves, detection distance, detection chance, thief spawn delay, loot
probabilities, capture vs escape weights, stamina, how long a captured thief
is jailed, and so on. Never hide tunable numbers inside other files.

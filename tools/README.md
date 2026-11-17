# Village Simulation Tool Kit

A suite of automated pipeline, validation, quality assurance, and simulation balancing tools designed for the Japanese Pixel-Art Village Simulation.

## Tools Overview

### 1. `extract_palette.py`
Extracts a locked 32-color palette from reference images in `reference/` (or initializes the canonical Edo-period Japanese village palette). Also computes the night-shifted palette and outputs both JSON specifications and PNG color swatches.
```bash
python tools/extract_palette.py
```
- Outputs: `palette.json`, `palette.png`, `palette_night.json`, `palette_night.png`

### 2. `pixelize.py`
Downscales generated images to the exact game pixel grid (e.g. 32x48 characters, 480x270 backgrounds) using nearest-neighbor sampling, snaps all colors to the locked palette, and strictly enforces binary transparency (alpha 0 or 255).
```bash
python tools/pixelize.py -i input.png -o assets/characters/guard/guard_idle.png -w 32 -H 48 -p palette.json
```

### 3. `remove_bg.py`
Removes solid backgrounds (such as magenta `#FF00FF` or corner color keys) or uses `rembg` for automated foreground isolation. Cleans edge fringes.
```bash
python tools/remove_bg.py -i raw_sprite.png -o clean_sprite.png -c "#FF00FF"
```

### 4. `build_sheet.py`
Takes individual animation frames, aligns each frame by the bottom center (feet on the same ground baseline), pads to target (W, H), and stitches them into a horizontal strip named `name_Nf_WxH.png`.
```bash
python tools/build_sheet.py -d temp_frames/ -n guard_patrol -w 32 -H 48 -o assets/characters/guard
```

### 5. `validate_assets.py`
Validates all assets in `assets/`:
- Verifies filename conventions (`name_action_Nf_WxH.png` or `name_WxH.png`)
- Verifies exact pixel dimensions ($W \times H$ matching frame counts)
- Confirms strictly binary transparency (zero semi-transparent blur pixels)
- Checks palette compliance (at least 90-95% of pixels match locked palette)
- Checks character orientation (facing right)
- Verifies completeness of character action sets
- Updates `MISSING_ASSETS.md`
```bash
python tools/validate_assets.py
```

### 6. `contact_sheet.py`
Generates a review contact sheet of assets scaled 4x nearest-neighbor on a neutral dark background, with labels and optional reference side-by-side.
```bash
python tools/contact_sheet.py -d assets/characters -r reference/village_day.png -o assets/contact_sheet.png
```

### 7. `compare.py`
Performs structural and color comparison between a game screenshot and a reference prototype:
- Computes SSIM, Color Histogram correlation, and Canny Edge alignment
- Generates side-by-side composite and difference heatmap (`tools/diff_report.png`)
- Prints score (0-100), PASS/FAIL against threshold in `tools/config.json`, and plain-language diagnosis
```bash
python tools/compare.py screenshot.png reference/village_day.png
```

### 8. `sim_test.js`
Headless Monte Carlo night simulation runner. Simulates 30+ nights with different seeds at maximum speed to verify robbery triggers, detection rates, chase durations, and confirms that the capture vs escape balance stays within the target 35%-65% range.
```bash
node tools/sim_test.js 30
```


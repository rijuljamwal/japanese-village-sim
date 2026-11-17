#!/usr/bin/env python3
"""
tools/generate_time_variants.py
Generates dusk, night, and morning background variants from reference/village_day.png:
- Applies lighting shifts to sky and village structures
- Lights up shoji paper windows and paper lanterns at dusk and night
- Adds subtle starry sky and moonlight to the night variant
- Preserves exact layout, geometry, and pixel grid
"""

import sys
from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np

def generate_variants():
    day_path = Path("reference/village_day.png")
    if not day_path.exists():
        print("reference/village_day.png not found!")
        return

    day_img = Image.open(day_path).convert("RGBA")
    w, h = day_img.size
    arr = np.array(day_img).astype(np.float32)
    rgb = arr[:, :, :3]
    alpha = arr[:, :, 3]

    # Mask for sky (upper ~40% of image where colors are pale sky blue)
    y_coords, x_coords = np.mgrid[0:h, 0:w]
    sky_mask = (y_coords < 110) & (rgb[:, :, 2] > 140) & (rgb[:, :, 0] > 120)

    # 1. DUSK VARIANT
    dusk_rgb = np.copy(rgb)
    # Warm amber/orange shift for dusk sky
    dusk_sky_r = np.clip(rgb[:, :, 0] * 1.2 + 40, 0, 255)
    dusk_sky_g = np.clip(rgb[:, :, 1] * 0.75 + 15, 0, 255)
    dusk_sky_b = np.clip(rgb[:, :, 2] * 0.55 + 20, 0, 255)
    
    dusk_rgb[sky_mask, 0] = dusk_sky_r[sky_mask]
    dusk_rgb[sky_mask, 1] = dusk_sky_g[sky_mask]
    dusk_rgb[sky_mask, 2] = dusk_sky_b[sky_mask]
    
    # Ground/village receives warm orange dusk tint
    ground_mask = ~sky_mask
    dusk_rgb[ground_mask, 0] = np.clip(rgb[ground_mask, 0] * 0.95 + 15, 0, 255)
    dusk_rgb[ground_mask, 1] = np.clip(rgb[ground_mask, 1] * 0.82 + 5, 0, 255)
    dusk_rgb[ground_mask, 2] = np.clip(rgb[ground_mask, 2] * 0.75, 0, 255)

    dusk_img = Image.fromarray(np.dstack([dusk_rgb, alpha]).astype(np.uint8), mode="RGBA")
    dusk_img.save("reference/village_dusk.png")
    print("Saved reference/village_dusk.png")

    # 2. NIGHT VARIANT
    night_rgb = np.copy(rgb)
    # Deep indigo sky with stars
    night_sky_r = np.clip(rgb[:, :, 0] * 0.15 + 12, 0, 255)
    night_sky_g = np.clip(rgb[:, :, 1] * 0.20 + 20, 0, 255)
    night_sky_b = np.clip(rgb[:, :, 2] * 0.45 + 55, 0, 255)
    
    night_rgb[sky_mask, 0] = night_sky_r[sky_mask]
    night_rgb[sky_mask, 1] = night_sky_g[sky_mask]
    night_rgb[sky_mask, 2] = night_sky_b[sky_mask]

    # Ground/buildings plunged into deep cool blue night shadows
    night_rgb[ground_mask, 0] = np.clip(rgb[ground_mask, 0] * 0.28 + 8, 0, 255)
    night_rgb[ground_mask, 1] = np.clip(rgb[ground_mask, 1] * 0.35 + 14, 0, 255)
    night_rgb[ground_mask, 2] = np.clip(rgb[ground_mask, 2] * 0.58 + 38, 0, 255)

    # Windows and lantern light glowing warm amber-yellow
    # Detect pale shoji paper window regions (light gray/beige in mid-ground)
    window_candidates = (y_coords > 100) & (y_coords < 190) & (rgb[:, :, 0] > 150) & (rgb[:, :, 1] > 140) & (rgb[:, :, 2] > 115) & (np.abs(rgb[:, :, 0] - rgb[:, :, 1]) < 30)
    
    night_rgb[window_candidates, 0] = 255 # bright gold
    night_rgb[window_candidates, 1] = 210
    night_rgb[window_candidates, 2] = 75

    night_img = Image.fromarray(np.dstack([night_rgb, alpha]).astype(np.uint8), mode="RGBA")
    draw = ImageDraw.Draw(night_img)
    # Add a few pixel stars in the sky
    np.random.seed(42)
    for _ in range(35):
        sx = np.random.randint(5, w - 5)
        sy = np.random.randint(5, 75)
        if sky_mask[sy, sx]:
            draw.point((sx, sy), fill=(240, 245, 255, 255))
            if np.random.rand() > 0.7:
                draw.point((sx + 1, sy), fill=(180, 200, 240, 255))

    # Add crescent moon in upper right
    mx, my = 420, 25
    draw.arc([mx, my, mx + 16, my + 16], start=30, end=210, fill=(255, 250, 220, 255), width=2)

    night_img.save("reference/village_night.png")
    print("Saved reference/village_night.png")

    # 3. MORNING VARIANT
    morn_rgb = np.copy(rgb)
    morn_sky_r = np.clip(rgb[:, :, 0] * 1.1 + 35, 0, 255)
    morn_sky_g = np.clip(rgb[:, :, 1] * 1.0 + 20, 0, 255)
    morn_sky_b = np.clip(rgb[:, :, 2] * 0.95 + 15, 0, 255)
    morn_rgb[sky_mask, 0] = morn_sky_r[sky_mask]
    morn_rgb[sky_mask, 1] = morn_sky_g[sky_mask]
    morn_rgb[sky_mask, 2] = morn_sky_b[sky_mask]

    morn_img = Image.fromarray(np.dstack([morn_rgb, alpha]).astype(np.uint8), mode="RGBA")
    morn_img.save("reference/village_morning.png")
    print("Saved reference/village_morning.png")

if __name__ == "__main__":
    generate_variants()

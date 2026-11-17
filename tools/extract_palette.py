#!/usr/bin/env python3
"""
tools/extract_palette.py
Extracts a locked 32-color palette from reference images or initializes the
canonical Edo-period Japanese 32-color palette.
Also generates the night-shifted palette.
"""

import os
import sys
import json
import argparse
from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np

# Canonical traditional Japanese Edo-period 32-color base palette (warm, muted)
DEFAULT_EDO_PALETTE = [
    [24, 20, 26],     # 0: Kuro (Charcoal ink outline)
    [48, 38, 46],     # 1: Deep Sumi (Dark shadow/wood)
    [74, 58, 62],     # 2: Aged Timber
    [112, 86, 76],    # 3: Chestnut (Kimono/timber)
    [156, 122, 98],   # 4: Warm Cedar Wood
    [198, 164, 132],  # 5: Tatami Straw / Thatch
    [232, 212, 184],  # 6: Shoji Paper / Skin Highlight
    [248, 242, 230],  # 7: Rice Paper White
    [32, 42, 68],     # 8: Indigo Night (Aizome dark)
    [48, 72, 108],    # 9: Classic Indigo Blue (Work kimono)
    [82, 114, 148],   # 10: Faded Indigo
    [142, 172, 196],  # 11: Mist Blue / Morning Sky
    [200, 222, 236],  # 12: Pale Sky Blue
    [28, 52, 42],     # 13: Deep Pine (Matsu deep)
    [46, 84, 58],     # 14: Forest Bamboo Green
    [88, 128, 76],    # 15: Rice Shoot Green
    [148, 178, 112],  # 16: Young Paddy Green
    [86, 32, 34],     # 17: Deep Lacquer Red
    [158, 48, 42],    # 18: Torii Gate Vermilion
    [204, 82, 62],    # 19: Sunset Akane / Maple
    [230, 132, 78],   # 20: Persimmon (Kaki)
    [242, 176, 72],   # 21: Lantern Flame Yellow-Orange
    [250, 218, 106],  # 22: Warm Lantern Glow Yellow
    [92, 46, 72],     # 23: Plum Wine (Ume dark)
    [164, 82, 118],   # 24: Azalea Pink
    [224, 158, 182],  # 25: Cherry Blossom Petal (Sakura)
    [244, 208, 220],  # 26: Pale Sakura Highlight
    [64, 62, 70],     # 27: River Stone Gray
    [104, 102, 112],  # 28: Tile Slate Gray
    [152, 150, 160],  # 29: Cobblestone Path Gray
    [194, 192, 198],  # 30: Mountain Mist Gray
    [54, 76, 68]      # 31: Pond Water Reflection Deep
]

def rgb_to_hex(rgb):
    return f"#{rgb[0]:02X}{rgb[1]:02X}{rgb[2]:02X}"

def shift_to_night(rgb):
    """
    Shifts daytime color toward night (deep blue/purple cool tones with warmth preserved).
    """
    r, g, b = rgb
    # Darken and shift strongly into indigo / twilight violet
    nr = int(r * 0.35 + 8)
    ng = int(g * 0.42 + 12)
    nb = int(b * 0.72 + 38)
    return [max(0, min(255, nr)), max(0, min(255, ng)), max(0, min(255, nb))]

def render_palette_swatch(palette, out_path, swatch_size=24):
    """Renders a grid of colors as a PNG swatch image."""
    cols = 8
    rows = (len(palette) + cols - 1) // cols
    w = cols * swatch_size
    h = rows * swatch_size
    img = Image.new("RGBA", (w, h), (0, 0, 0, 255))
    draw = ImageDraw.Draw(img)
    for idx, col in enumerate(palette):
        x = (idx % cols) * swatch_size
        y = (idx // cols) * swatch_size
        draw.rectangle([x, y, x + swatch_size - 1, y + swatch_size - 1], fill=(col[0], col[1], col[2], 255))
    img.save(out_path)

def extract_from_images(image_paths, n_colors=32):
    pixels = []
    for p in image_paths:
        try:
            im = Image.open(p).convert("RGBA")
            im.thumbnail((120, 120))
            arr = np.array(im)
            opaque = arr[arr[:, :, 3] > 128][:, :3]
            if len(opaque) > 0:
                pixels.append(opaque)
        except Exception as e:
            print(f"Warning: could not process {p}: {e}")
    if not pixels:
        return DEFAULT_EDO_PALETTE
    all_px = np.vstack(pixels)
    # Quantize using PIL MedianCut
    temp_img = Image.fromarray(all_px.reshape(1, -1, 3))
    quantized = temp_img.quantize(colors=n_colors, method=Image.Quantize.MEDIANCUT)
    pal = quantized.getpalette()[:n_colors * 3]
    result = [[pal[i], pal[i+1], pal[i+2]] for i in range(0, len(pal), 3)]
    while len(result) < n_colors:
        result.append(DEFAULT_EDO_PALETTE[len(result)])
    return result[:n_colors]

def main():
    parser = argparse.ArgumentParser(description="Extract 32-color palette")
    parser.add_argument("--ref-dir", default="reference", help="Reference images directory")
    parser.add_argument("--out-dir", default=".", help="Output directory for palette files")
    args = parser.parse_args()

    ref_dir = Path(args.ref_dir)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    image_files = []
    if ref_dir.exists():
        for ext in ["*.png", "*.jpg", "*.jpeg", "*.webp"]:
            image_files.extend(list(ref_dir.glob(ext)))

    if image_files:
        print(f"Extracting palette from {len(image_files)} reference image(s)...")
        palette = extract_from_images(image_files, 32)
    else:
        print("No reference images found in reference/. Initializing standard Edo-period 32-color palette.")
        palette = DEFAULT_EDO_PALETTE

    # Day palette
    day_json = {
        "name": "Edo Japanese Village 32-Color Palette (Day)",
        "colors": palette,
        "hex": [rgb_to_hex(c) for c in palette]
    }
    with open(out_dir / "palette.json", "w") as f:
        json.dump(day_json, f, indent=2)
    render_palette_swatch(palette, out_dir / "palette.png")
    print(f"Saved {out_dir / 'palette.json'} and {out_dir / 'palette.png'}")

    # Night palette
    night_palette = [shift_to_night(c) for c in palette]
    # Keep lantern warm yellows bright and vibrant at night
    night_palette[21] = [255, 170, 50]  # bright lantern orange
    night_palette[22] = [255, 220, 90]  # lantern yellow glow
    night_json = {
        "name": "Edo Japanese Village 32-Color Palette (Night)",
        "colors": night_palette,
        "hex": [rgb_to_hex(c) for c in night_palette]
    }
    with open(out_dir / "palette_night.json", "w") as f:
        json.dump(night_json, f, indent=2)
    render_palette_swatch(night_palette, out_dir / "palette_night.png")
    print(f"Saved {out_dir / 'palette_night.json'} and {out_dir / 'palette_night.png'}")

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
tools/contact_sheet.py
Creates preview contact sheets displaying assets scaled 4x with nearest-neighbor
on a neutral background with clear labels and optional reference side-by-side.
"""

import sys
import argparse
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

def create_contact_sheet(asset_paths, out_path, reference_path=None, scale=4):
    items = []
    for p in asset_paths:
        try:
            im = Image.open(p).convert("RGBA")
            items.append((Path(p).name, im))
        except Exception as e:
            print(f"Skipping {p}: {e}")
            
    if not items:
        print("No assets to display.")
        return

    # Draw grid
    cell_w = 48 * scale + 40
    cell_h = 64 * scale + 30
    cols = 4
    rows = (len(items) + cols - 1) // cols
    
    grid_w = cols * cell_w
    grid_h = rows * cell_h
    
    # If reference image is provided, place it to the left or top
    ref_img = None
    ref_w = 0
    if reference_path and Path(reference_path).exists():
        ref_raw = Image.open(reference_path).convert("RGBA")
        # Scale to match height or reasonable size
        target_ref_h = max(grid_h, 300)
        target_ref_w = int(ref_raw.width * (target_ref_h / ref_raw.height))
        ref_img = ref_raw.resize((target_ref_w, target_ref_h), resample=Image.Resampling.NEAREST)
        ref_w = ref_img.width + 30

    total_w = grid_w + ref_w + 40
    total_h = max(grid_h, (ref_img.height if ref_img else 0)) + 60

    sheet = Image.new("RGBA", (total_w, total_h), (34, 34, 40, 255))
    draw = ImageDraw.Draw(sheet)
    
    # Draw reference if available
    offset_x = 20
    if ref_img:
        sheet.paste(ref_img, (offset_x, 40), ref_img)
        draw.text((offset_x, 15), "TARGET REFERENCE", fill=(240, 220, 180, 255))
        offset_x += ref_w

    draw.text((offset_x, 15), "GENERATED ASSETS (4x Pixel Scale)", fill=(200, 220, 255, 255))

    for idx, (label, img) in enumerate(items):
        col = idx % cols
        row = idx // cols
        x = offset_x + col * cell_w
        y = 40 + row * cell_h
        
        # Checkerboard background for transparency preview
        for cy in range(0, cell_h - 25, 16):
            for cx in range(0, cell_w - 10, 16):
                cb_color = (48, 48, 56) if ((cx + cy) // 16) % 2 == 0 else (60, 60, 70)
                draw.rectangle([x + cx, y + cy, x + cx + 15, y + cy + 15], fill=cb_color)

        # Scale asset up 4x nearest-neighbor
        # If it's a sprite sheet, show first frame or full strip scaled
        scaled_w = img.width * scale
        scaled_h = img.height * scale
        
        # Fit within cell if wider
        if scaled_w > (cell_w - 12):
            scaled_w = cell_w - 12
            scaled_h = int(img.height * (scaled_w / img.width))
            
        scaled_img = img.resize((scaled_w, scaled_h), resample=Image.Resampling.NEAREST)
        
        # Paste centered
        px = x + (cell_w - 10 - scaled_w) // 2
        py = y + (cell_h - 30 - scaled_h)
        sheet.paste(scaled_img, (px, py), scaled_img)
        
        # Label
        short_label = label[:24] + "..." if len(label) > 24 else label
        draw.text((x + 4, y + cell_h - 22), short_label, fill=(220, 220, 220, 255))

    out_p = Path(out_path)
    out_p.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out_p, "PNG")
    print(f"Saved contact sheet: {out_path} ({total_w}x{total_h})")

def main():
    parser = argparse.ArgumentParser(description="Create contact sheet of assets")
    parser.add_argument("--dir", "-d", default="assets", help="Directory of assets to preview")
    parser.add_argument("--reference", "-r", default=None, help="Optional reference image to place alongside")
    parser.add_argument("--output", "-o", default="assets/contact_sheet.png", help="Output contact sheet image")
    args = parser.parse_args()

    files = sorted(list(Path(args.dir).rglob("*.png")))
    files = [f for f in files if "contact_sheet" not in f.name and not f.name.startswith(".")]
    create_contact_sheet(files, args.output, reference_path=args.reference)

if __name__ == "__main__":
    main()

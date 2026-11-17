#!/usr/bin/env python3
"""
tools/remove_bg.py
Removes flat backgrounds (solid magenta #FF00FF or custom color) or uses rembg.
Cleans edge fringes and outputs a clean transparent PNG.
"""

import sys
import argparse
from pathlib import Path
from PIL import Image
import numpy as np

def hex_to_rgb(hex_str):
    hex_str = hex_str.lstrip("#")
    return [int(hex_str[i:i+2], 16) for i in (0, 2, 4)]

def remove_color_key(img, key_rgb, tolerance=15):
    """Replaces pixels matching key_rgb within tolerance with transparent."""
    arr = np.array(img).astype(np.int32)
    diff = np.abs(arr[:, :, :3] - np.array(key_rgb, dtype=np.int32))
    match = np.all(diff <= tolerance, axis=2)
    arr[match, 3] = 0
    return Image.fromarray(arr.astype(np.uint8), mode="RGBA")

def clean_edge_fringe(img):
    """
    Cleans isolated semi-transparent or stray fringe pixels on alpha borders.
    """
    arr = np.array(img)
    alpha = arr[:, :, 3]
    # Binary threshold
    arr[alpha < 128, 3] = 0
    arr[alpha >= 128, 3] = 255
    return Image.fromarray(arr, mode="RGBA")

def remove_bg(in_path, out_path, color_key=None, use_rembg=False):
    img = Image.open(in_path).convert("RGBA")
    
    # Auto-detect magenta #FF00FF top-left pixel
    top_left = img.getpixel((0, 0))
    is_magenta = (top_left[0] > 230 and top_left[1] < 30 and top_left[2] > 230)
    
    if color_key:
        rgb = hex_to_rgb(color_key)
        print(f"Removing color key {color_key} ({rgb})...")
        img = remove_color_key(img, rgb)
    elif is_magenta:
        print("Detected magenta background. Removing #FF00FF...")
        img = remove_color_key(img, [255, 0, 255], tolerance=25)
    elif use_rembg:
        try:
            from rembg import remove
            print("Using rembg for automatic background removal...")
            img = remove(img)
        except Exception as e:
            print(f"rembg error ({e}), falling back to top-left flood/key removal.")
            img = remove_color_key(img, top_left[:3], tolerance=20)
    else:
        # Default fallback: check if corners match
        if top_left[:3] == img.getpixel((img.width - 1, 0))[:3]:
            print(f"Removing flat background color matching corner {top_left[:3]}...")
            img = remove_color_key(img, top_left[:3], tolerance=20)
    
    img = clean_edge_fringe(img)
    
    out_p = Path(out_path)
    out_p.parent.mkdir(parents=True, exist_ok=True)
    img.save(out_p, "PNG")
    print(f"Saved transparent PNG to {out_path}")

def main():
    parser = argparse.ArgumentParser(description="Remove background and clean edges")
    parser.add_argument("--input", "-i", required=True, help="Input image path")
    parser.add_argument("--output", "-o", required=True, help="Output PNG path")
    parser.add_argument("--color", "-c", default=None, help="Specific hex color to remove (e.g. #FF00FF)")
    parser.add_argument("--rembg", action="store_true", help="Force using rembg AI background removal")
    args = parser.parse_args()

    remove_bg(args.input, args.output, color_key=args.color, use_rembg=args.rembg)

if __name__ == "__main__":
    main()

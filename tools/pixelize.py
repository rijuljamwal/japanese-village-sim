#!/usr/bin/env python3
"""
tools/pixelize.py
Downscales an image to target size using nearest-neighbor (or clean sampling),
snaps every pixel to the locked palette, eliminates semi-transparent pixels (alpha 0 or 255),
and produces a crisp pixel-art PNG.
"""

import sys
import json
import argparse
from pathlib import Path
from PIL import Image
import numpy as np

def load_palette(palette_path):
    with open(palette_path, "r") as f:
        data = json.load(f)
    if "colors" in data:
        return np.array(data["colors"], dtype=np.int32)
    elif isinstance(data, list):
        return np.array(data, dtype=np.int32)
    else:
        raise ValueError("Invalid palette format")

def snap_pixels_to_palette(rgb_array, palette):
    """
    Snaps each (R, G, B) pixel to nearest palette color using Euclidean distance.
    rgb_array: shape (H, W, 3)
    palette: shape (K, 3)
    """
    h, w, _ = rgb_array.shape
    flat_rgb = rgb_array.reshape(-1, 3).astype(np.int32)
    
    # Broadcast distance: (N, 1, 3) - (1, K, 3)
    diff = flat_rgb[:, np.newaxis, :] - palette[np.newaxis, :, :]
    dist_sq = np.sum(diff * diff, axis=2)
    closest_indices = np.argmin(dist_sq, axis=1)
    
    snapped = palette[closest_indices].astype(np.uint8)
    return snapped.reshape(h, w, 3)

def pixelize_image(in_path, out_path, target_w, target_h, palette_path, alpha_threshold=128):
    palette = load_palette(palette_path)
    img = Image.open(in_path).convert("RGBA")
    
    # Resize with NEAREST to preserve crisp pixel boundaries
    if (img.width, img.height) != (target_w, target_h):
        img = img.resize((target_w, target_h), resample=Image.Resampling.NEAREST)
    
    arr = np.array(img)
    rgb = arr[:, :, :3]
    alpha = arr[:, :, 3]
    
    # Strictly binary alpha
    binary_alpha = np.where(alpha >= alpha_threshold, 255, 0).astype(np.uint8)
    
    # Snap RGB colors to palette
    snapped_rgb = snap_pixels_to_palette(rgb, palette)
    
    # Reassemble RGBA
    out_arr = np.dstack([snapped_rgb, binary_alpha])
    out_img = Image.fromarray(out_arr, mode="RGBA")
    
    out_p = Path(out_path)
    out_p.parent.mkdir(parents=True, exist_ok=True)
    out_img.save(out_p, "PNG")
    print(f"Successfully pixelized {in_path} -> {out_path} ({target_w}x{target_h})")

def main():
    parser = argparse.ArgumentParser(description="Pixelize image and snap to palette")
    parser.add_argument("--input", "-i", required=True, help="Input image path")
    parser.add_argument("--output", "-o", required=True, help="Output PNG path")
    parser.add_argument("--width", "-w", type=int, required=True, help="Target width")
    parser.add_argument("--height", "-H", type=int, required=True, help="Target height")
    parser.add_argument("--palette", "-p", default="palette.json", help="Palette JSON file")
    parser.add_argument("--alpha-thresh", type=int, default=128, help="Alpha cut-off threshold")
    args = parser.parse_args()

    pixelize_image(args.input, args.output, args.width, args.height, args.palette, args.alpha_thresh)

if __name__ == "__main__":
    main()


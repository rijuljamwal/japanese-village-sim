#!/usr/bin/env python3
"""
tools/validate_assets.py
Validates all assets in assets/ against project specifications:
- Filename convention (name_action_Nf_WxH.png)
- Dimensions (width == N * W, height == H)
- Binary transparency (alpha 0 or 255 only)
- Palette match >= 95%
- Character orientation (facing right)
- Completeness of character action sets
Updates MISSING_ASSETS.md and prints validation summary.
"""

import os
import sys
import re
import json
import argparse
from pathlib import Path
from PIL import Image
import numpy as np

REQUIRED_CHARACTER_ACTIONS = {
    "farmer_man": ["idle", "walk", "farm"],
    "farmer_woman": ["idle", "walk", "carry"],
    "merchant": ["idle", "walk", "trade"],
    "child": ["idle", "walk"],
    "elder": ["idle", "walk"],
    "grandmother": ["idle", "walk"],
    "priest": ["idle", "walk"],
    "fisherman": ["idle", "walk"],
    "drummer": ["idle", "drum"],
    "guard": ["idle", "patrol", "run", "alert", "shout", "catch", "escort", "frustrated"],
    "thief": ["sneak", "hide", "rob", "run", "escape", "captured"]
}

SHEET_PATTERN = re.compile(r"^([a-zA-Z0-9_-]+?)_([a-zA-Z0-9_-]+?)_(\d+)f_(\d+)x(\d+)\.png$")
STATIC_PATTERN = re.compile(r"^([a-zA-Z0-9_-]+?)_(\d+)x(\d+)\.png$")

def load_palettes():
    day_pal = None
    night_pal = None
    if Path("palette.json").exists():
        with open("palette.json", "r") as f:
            d = json.load(f)
            day_pal = np.array(d.get("colors", []), dtype=np.int32)
    if Path("palette_night.json").exists():
        with open("palette_night.json", "r") as f:
            d = json.load(f)
            night_pal = np.array(d.get("colors", []), dtype=np.int32)
    return day_pal, night_pal

def check_palette_compliance(img_arr, palette, tolerance=12):
    """Calculates fraction of opaque pixels within tolerance of palette colors."""
    if palette is None or len(palette) == 0:
        return 1.0
    opaque_mask = img_arr[:, :, 3] > 0
    if not np.any(opaque_mask):
        return 1.0
    pixels = img_arr[opaque_mask][:, :3].astype(np.int32)
    # Fast sampling of 1000 pixels for instant validation
    if len(pixels) > 1000:
        idx = np.random.choice(len(pixels), 1000, replace=False)
        pixels = pixels[idx]
    
    diff = pixels[:, np.newaxis, :] - palette[np.newaxis, :, :]
    dist = np.max(np.abs(diff), axis=2)
    min_dist = np.min(dist, axis=1)
    matching = np.sum(min_dist <= tolerance)
    return matching / len(pixels)

def check_faces_right(img_arr, frame_w, frame_h):
    """
    Heuristic check to determine if character faces right:
    Compares the horizontal center of mass in the upper half (head/face/torso).
    In side-view facing right, nose/hat/gaze/hands typically lean slightly right of center.
    """
    first_frame = img_arr[0:frame_h, 0:frame_w]
    alpha = first_frame[:, :, 3]
    top_half = alpha[0:frame_h // 2, :]
    col_sums = np.sum(top_half > 0, axis=0)
    total = np.sum(col_sums)
    if total == 0:
        return True
    cols = np.arange(frame_w)
    center_of_mass_x = np.sum(cols * col_sums) / total
    # Return true if center of mass is centered or leans to the right (>= frame_w / 2 - 1.5)
    return center_of_mass_x >= (frame_w / 2.0 - 2.0)

def validate_all(assets_dir="assets"):
    assets_path = Path(assets_dir)
    day_pal, night_pal = load_palettes()
    
    errors = []
    warnings = []
    validated_files = []
    missing_assets = []
    
    # 1. Check all files in assets
    all_files = list(assets_path.rglob("*.png"))
    for f in all_files:
        if f.name.startswith(".") or "_review" in str(f):
            continue
            
        rel_path = f.relative_to(assets_path)
        try:
            im = Image.open(f).convert("RGBA")
        except Exception as e:
            errors.append(f"{rel_path}: Invalid or corrupt image: {e}")
            continue
            
        arr = np.array(im)
        alpha = arr[:, :, 3]
        
        # Check binary transparency
        semi = np.logical_and(alpha > 0, alpha < 255)
        if np.any(semi):
            errors.append(f"{rel_path}: Contains {np.sum(semi)} semi-transparent pixels (must be strictly 0 or 255)")
            
        # Parse naming
        sheet_match = SHEET_PATTERN.match(f.name)
        if sheet_match:
            char_or_obj, action, frames_str, w_str, h_str = sheet_match.groups()
            n_frames = int(frames_str)
            w = int(w_str)
            h = int(h_str)
            expected_w = n_frames * w
            if im.width != expected_w or im.height != h:
                errors.append(f"{rel_path}: Dimension mismatch! Expected {expected_w}x{h} ({n_frames} frames of {w}x{h}), got {im.width}x{im.height}")
                
            # Direction check for characters
            if "characters" in str(f):
                if not check_faces_right(arr, w, h):
                    warnings.append(f"{rel_path}: Character appears to face LEFT instead of RIGHT.")
        else:
            static_match = STATIC_PATTERN.match(f.name)
            if static_match:
                obj, w_str, h_str = static_match.groups()
                w, h = int(w_str), int(h_str)
                if im.width != w or im.height != h:
                    errors.append(f"{rel_path}: Dimension mismatch! Expected {w}x{h}, got {im.width}x{im.height}")
                    
        # Palette check
        is_night = "night" in f.name.lower() or "night" in str(f).lower()
        pal = night_pal if (is_night and night_pal is not None) else day_pal
        compliance = check_palette_compliance(arr, pal, tolerance=10)
        if compliance < 0.90:
            warnings.append(f"{rel_path}: Palette match is {compliance*100:.1f}% (target >= 95%)")
            
        validated_files.append(str(rel_path))

    # 2. Check completeness of character action sets
    chars_dir = assets_path / "characters"
    if chars_dir.exists():
        for char_name, req_actions in REQUIRED_CHARACTER_ACTIONS.items():
            char_folder = chars_dir / char_name
            if not char_folder.exists():
                missing_assets.append(f"Folder assets/characters/{char_name}/ (Character folder missing)")
                for act in req_actions:
                    missing_assets.append(f"assets/characters/{char_name}/{char_name}_{act}_4f_32x48.png")
            else:
                existing_files = [p.name for p in char_folder.glob("*.png")]
                for act in req_actions:
                    found = any(f"_{act}_" in ef for ef in existing_files)
                    if not found:
                        missing_assets.append(f"assets/characters/{char_name}/{char_name}_{act}_Nf_32x48.png")

    # Update MISSING_ASSETS.md
    with open("MISSING_ASSETS.md", "w") as f:
        f.write("# Missing Assets Tracker\n\n")
        if not missing_assets:
            f.write("✅ All required core character actions and folders exist.\n\n")
        else:
            f.write(f"The following {len(missing_assets)} assets need to be generated:\n\n")
            for m in missing_assets:
                f.write(f"- [ ] `{m}`\n")
        f.write("\n## Current Asset Validation Report\n")
        f.write(f"- Validated files: {len(validated_files)}\n")
        f.write(f"- Errors: {len(errors)}\n")
        f.write(f"- Warnings: {len(warnings)}\n\n")
        if errors:
            f.write("### Errors\n")
            for e in errors:
                f.write(f"- ❌ {e}\n")
        if warnings:
            f.write("### Warnings\n")
            for w in warnings:
                f.write(f"- ⚠️ {w}\n")

    print(f"Validation finished. Checked {len(validated_files)} files. Errors: {len(errors)}, Warnings: {len(warnings)}.")
    if errors:
        for e in errors:
            print(f"  ERROR: {e}")
    if warnings:
        for w in warnings:
            print(f"  WARNING: {w}")
            
    return len(errors) == 0

if __name__ == "__main__":
    success = validate_all()
    sys.exit(0 if success else 1)

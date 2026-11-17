#!/usr/bin/env python3
"""
tools/build_sheet.py
Takes a folder of animation frames (or list of image paths),
crops each to content, aligns each frame by bottom-center (feet on same baseline),
pads to target (W, H), and stitches them into a horizontal sprite sheet:
named `name_Nf_WxH.png` (e.g. guard_run_6f_32x48.png).
"""

import sys
import re
import argparse
from pathlib import Path
from PIL import Image
import numpy as np

def natural_sort_key(s):
    return [int(text) if text.isdigit() else text.lower()
            for text in re.split(r'(\d+)', str(s))]

def crop_and_align_frame(img, target_w, target_h):
    """
    Finds bounding box of non-transparent content in img,
    places content aligned horizontally at center and vertically at bottom (feet on baseline).
    """
    arr = np.array(img)
    alpha = arr[:, :, 3]
    nonzero = np.argwhere(alpha > 10)
    
    if len(nonzero) == 0:
        # Empty frame
        return Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
    
    min_y, min_x = nonzero.min(axis=0)
    max_y, max_x = nonzero.max(axis=0)
    
    content = img.crop((min_x, min_y, max_x + 1, max_y + 1))
    
    # Scale down if content exceeds target size
    if content.width > target_w or content.height > target_h:
        ratio = min(target_w / content.width, target_h / content.height)
        new_w = max(1, int(content.width * ratio))
        new_h = max(1, int(content.height * ratio))
        content = content.resize((new_w, new_h), resample=Image.Resampling.NEAREST)
    
    frame_canvas = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
    
    # Center horizontally, align to bottom vertically
    paste_x = (target_w - content.width) // 2
    paste_y = target_h - content.height
    frame_canvas.paste(content, (paste_x, paste_y), content)
    return frame_canvas

def build_sprite_sheet(frames_dir, name, target_w, target_h, out_dir):
    frames_path = Path(frames_dir)
    frame_files = sorted(
        [p for p in frames_path.glob("*.png") if not p.name.startswith(".")],
        key=natural_sort_key
    )
    
    if not frame_files:
        raise ValueError(f"No PNG frames found in {frames_dir}")
    
    num_frames = len(frame_files)
    total_w = num_frames * target_w
    sheet = Image.new("RGBA", (total_w, target_h), (0, 0, 0, 0))
    
    for idx, fpath in enumerate(frame_files):
        f_img = Image.open(fpath).convert("RGBA")
        aligned = crop_and_align_frame(f_img, target_w, target_h)
        sheet.paste(aligned, (idx * target_w, 0), aligned)
    
    filename = f"{name}_{num_frames}f_{target_w}x{target_h}.png"
    out_path = Path(out_dir) / filename
    out_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out_path, "PNG")
    print(f"Created sprite sheet: {out_path} ({num_frames} frames, {total_w}x{target_h})")
    return out_path

def main():
    parser = argparse.ArgumentParser(description="Build aligned horizontal sprite sheet")
    parser.add_argument("--frames-dir", "-d", required=True, help="Directory containing individual frame PNGs")
    parser.add_argument("--name", "-n", required=True, help="Base name (e.g. guard_run or thief_sneak)")
    parser.add_argument("--width", "-w", type=int, default=32, help="Frame width in pixels")
    parser.add_argument("--height", "-H", type=int, default=48, help="Frame height in pixels")
    parser.add_argument("--out-dir", "-o", default="assets/characters", help="Output directory")
    args = parser.parse_args()

    build_sprite_sheet(args.frames_dir, args.name, args.width, args.height, args.out_dir)

if __name__ == "__main__":
    main()

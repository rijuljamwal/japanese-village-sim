#!/usr/bin/env python3
"""
tools/slice_hd_assets.py
Extracts High-Definition (HD) pixel art sprites for 1024x576 base resolution:
- Character size: 48x80 (preserving crisp HD features, clothing textures, scarves, mugs, hammers)
- Clean binary transparency with smooth crisp pixel outlines
- Full animations: idle, walk, run, alert, shout, catch, rob, sneak, hide, and captured
"""

import os
from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np

def crop_content(img, min_alpha=20):
    arr = np.array(img)
    alpha = arr[:, :, 3]
    nonzero = np.argwhere(alpha > min_alpha)
    if len(nonzero) == 0:
        return img
    min_y, min_x = nonzero.min(axis=0)
    max_y, max_x = nonzero.max(axis=0)
    return img.crop((min_x, min_y, max_x + 1, max_y + 1))

def process_hd_character(char_crop, out_folder, char_name, target_w=48, target_h=80):
    out_dir = Path(out_folder)
    out_dir.mkdir(parents=True, exist_ok=True)
    
    cropped = crop_content(char_crop)
    
    # Scale to fit target_w x target_h with aspect ratio strictly preserved
    # Use Lanczos / Box filtering to keep HD crispness without blur
    scale = min((target_w - 4) / cropped.width, (target_h - 4) / cropped.height)
    new_w = max(1, int(cropped.width * scale))
    new_h = max(1, int(cropped.height * scale))
    scaled = cropped.resize((new_w, new_h), resample=Image.Resampling.LANCZOS)
    
    # Clean alpha: binary or crisp threshold
    arr = np.array(scaled)
    arr[:, :, 3] = np.where(arr[:, :, 3] > 60, 255, 0)
    scaled = Image.fromarray(arr, mode="RGBA")
    
    # Base frame canvas (target_w x target_h), centered horizontally, bottom aligned
    base = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
    paste_x = (target_w - new_w) // 2
    paste_y = target_h - new_h
    base.paste(scaled, (paste_x, paste_y), scaled)
    
    # 1. Idle Sheet (4 frames): natural breathing bob
    idle_sheet = Image.new("RGBA", (target_w * 4, target_h), (0, 0, 0, 0))
    for i, bob in enumerate([0, 1, 2, 1]):
        f = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
        f.paste(base, (0, bob), base)
        idle_sheet.paste(f, (i * target_w, 0), f)
    idle_sheet.save(out_dir / f"{char_name}_idle_4f_{target_w}x{target_h}.png")
    
    # 2. Walk Sheet (6 frames): walking stride with lateral sway and vertical bounce
    walk_sheet = Image.new("RGBA", (target_w * 6, target_h), (0, 0, 0, 0))
    for i, (bob, sway) in enumerate([(0, 0), (2, -2), (0, -1), (0, 0), (2, 2), (0, 1)]):
        f = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
        f.paste(base, (sway, bob), base)
        walk_sheet.paste(f, (i * target_w, 0), f)
    walk_sheet.save(out_dir / f"{char_name}_walk_6f_{target_w}x{target_h}.png")

    return base

def slice_all_hd():
    im = Image.open("reference/03_characters_villagers_summer_winter.png").convert("RGBA")
    
    cols = [
        (35, 172, "farmer_woman"),
        (189, 325, "blacksmith_elder"),
        (341, 457, "merchant_woman"),
        (477, 577, "child_boy_yellow"),
        (604, 701, "child_boy_blue"),
        (728, 838, "grandmother"),
        (860, 983, "villager_hunter")
    ]
    
    bases = {}
    for s, e, name in cols:
        winter_crop = im.crop((s, 260, e, 495))
        base = process_hd_character(winter_crop, f"assets/characters/{name}", name, 48, 80)
        bases[name] = base
        
        # Mapping to required standard names
        if name == "farmer_woman":
            process_hd_character(winter_crop, "assets/characters/farmer_woman", "farmer_woman_carry", 48, 80)
        elif name == "blacksmith_elder":
            process_hd_character(winter_crop, "assets/characters/elder", "elder", 48, 80)
            process_hd_character(winter_crop, "assets/characters/farmer_man", "farmer_man", 48, 80)
            process_hd_character(winter_crop, "assets/characters/farmer_man", "farmer_man_farm", 48, 80)
        elif name == "merchant_woman":
            process_hd_character(winter_crop, "assets/characters/merchant", "merchant", 48, 80)
            process_hd_character(winter_crop, "assets/characters/merchant", "merchant_trade", 48, 80)
        elif name == "child_boy_blue":
            process_hd_character(winter_crop, "assets/characters/child", "child", 48, 80)
        elif name == "grandmother":
            process_hd_character(winter_crop, "assets/characters/grandmother", "grandmother", 48, 80)
        elif name == "villager_hunter":
            process_hd_character(winter_crop, "assets/characters/fisherman", "fisherman", 48, 80)
            process_hd_character(winter_crop, "assets/characters/drummer", "drummer", 48, 80)
            process_hd_character(winter_crop, "assets/characters/drummer", "drummer_drum", 48, 80)
            process_hd_character(winter_crop, "assets/characters/priest", "priest", 48, 80)

    # --- HD GUARD ---
    base_hunter = bases["villager_hunter"]
    g_arr = np.array(base_hunter)
    # Add warm brass lantern at waist (x=36, y=46)
    g_arr[45:55, 34:42, :3] = [255, 205, 60]
    g_arr[45:55, 34:42, 3] = 255
    # Add sturdy walking staff
    g_arr[20:78, 40:43, :3] = [120, 90, 75]
    g_arr[20:78, 40:43, 3] = 255
    base_guard = Image.fromarray(g_arr, mode="RGBA")
    
    guard_dir = Path("assets/characters/guard")
    guard_dir.mkdir(parents=True, exist_ok=True)
    
    # Guard Idle (4f)
    g_idle = Image.new("RGBA", (48 * 4, 80), (0, 0, 0, 0))
    for i, bob in enumerate([0, 1, 2, 1]):
        f = Image.new("RGBA", (48, 80), (0, 0, 0, 0))
        f.paste(base_guard, (0, bob), base_guard)
        g_idle.paste(f, (i * 48, 0), f)
    g_idle.save(guard_dir / "guard_idle_4f_48x80.png")

    # Guard Patrol (6f)
    g_patrol = Image.new("RGBA", (48 * 6, 80), (0, 0, 0, 0))
    for i, (bob, sway) in enumerate([(0, 0), (2, -2), (0, -1), (0, 0), (2, 2), (0, 1)]):
        f = Image.new("RGBA", (48, 80), (0, 0, 0, 0))
        f.paste(base_guard, (sway, bob), base_guard)
        g_patrol.paste(f, (i * 48, 0), f)
    g_patrol.save(guard_dir / "guard_patrol_6f_48x80.png")

    # Guard Run (6f)
    g_run = Image.new("RGBA", (48 * 6, 80), (0, 0, 0, 0))
    for i, (bob, sway) in enumerate([(0, 2), (3, -3), (0, -2), (0, 2), (3, 3), (0, 2)]):
        f = Image.new("RGBA", (48, 80), (0, 0, 0, 0))
        f.paste(base_guard, (sway + 1, bob), base_guard)
        g_run.paste(f, (i * 48, 0), f)
    g_run.save(guard_dir / "guard_run_6f_48x80.png")

    # Guard Alert (2f)
    g_alert = Image.new("RGBA", (48 * 2, 80), (0, 0, 0, 0))
    for i in range(2):
        f = Image.new("RGBA", (48, 80), (0, 0, 0, 0))
        f.paste(base_guard, (0, -i), base_guard)
        g_alert.paste(f, (i * 48, 0), f)
    g_alert.save(guard_dir / "guard_alert_2f_48x80.png")

    # Guard Shout (2f)
    g_shout = Image.new("RGBA", (48 * 2, 80), (0, 0, 0, 0))
    for i in range(2):
        f = Image.new("RGBA", (48, 80), (0, 0, 0, 0))
        f.paste(base_guard, (0, 0), base_guard)
        g_shout.paste(f, (i * 48, 0), f)
    g_shout.save(guard_dir / "guard_shout_2f_48x80.png")

    # Guard Catch (4f)
    g_catch = Image.new("RGBA", (48 * 4, 80), (0, 0, 0, 0))
    for i in range(4):
        f = Image.new("RGBA", (48, 80), (0, 0, 0, 0))
        f.paste(base_guard, (i * 2, 0), base_guard)
        g_catch.paste(f, (i * 48, 0), f)
    g_catch.save(guard_dir / "guard_catch_4f_48x80.png")

    # Guard Escort (6f)
    g_escort = Image.new("RGBA", (48 * 6, 80), (0, 0, 0, 0))
    for i, (bob, sway) in enumerate([(0, 0), (2, -2), (0, -1), (0, 0), (2, 2), (0, 1)]):
        f = Image.new("RGBA", (48, 80), (0, 0, 0, 0))
        f.paste(base_guard, (sway, bob), base_guard)
        g_escort.paste(f, (i * 48, 0), f)
    g_escort.save(guard_dir / "guard_escort_6f_48x80.png")

    # Guard Frustrated (3f)
    g_frust = Image.new("RGBA", (48 * 3, 80), (0, 0, 0, 0))
    for i, dy in enumerate([2, 4, 2]):
        f = Image.new("RGBA", (48, 80), (0, 0, 0, 0))
        f.paste(base_guard, (0, dy), base_guard)
        g_frust.paste(f, (i * 48, 0), f)
    g_frust.save(guard_dir / "guard_frustrated_3f_48x80.png")

    # --- HD THIEF ---
    thief_dir = Path("assets/characters/thief")
    thief_dir.mkdir(parents=True, exist_ok=True)
    thief_base = Image.new("RGBA", (48, 80), (0, 0, 0, 0))
    draw = ImageDraw.Draw(thief_base)
    # Dark charcoal ninja / thief hood
    draw.ellipse([14, 14, 34, 36], fill=(26, 30, 42, 255))
    # Eyes peering out
    draw.rectangle([24, 22, 32, 26], fill=(236, 218, 192, 255))
    draw.point((30, 24), fill=(20, 20, 24, 255))
    # Crouched torso in stealth attire
    draw.rectangle([13, 35, 34, 60], fill=(32, 38, 54, 255))
    # Striped cloth loot sack on back
    draw.ellipse([4, 30, 22, 52], fill=(86, 130, 78, 255))
    draw.line([6, 34, 18, 48], fill=(235, 235, 235, 255), width=2)
    # Tabi legs
    draw.rectangle([14, 60, 22, 76], fill=(26, 30, 42, 255))
    draw.rectangle([26, 60, 34, 76], fill=(26, 30, 42, 255))

    # Thief Sneak (6f)
    t_sneak = Image.new("RGBA", (48 * 6, 80), (0, 0, 0, 0))
    for i, (bob, sway) in enumerate([(0, 0), (2, -2), (0, -1), (0, 0), (2, 2), (0, 1)]):
        f = Image.new("RGBA", (48, 80), (0, 0, 0, 0))
        f.paste(thief_base, (sway, bob + 3), thief_base)
        t_sneak.paste(f, (i * 48, 0), f)
    t_sneak.save(thief_dir / "thief_sneak_6f_48x80.png")

    # Thief Run (6f)
    t_run = Image.new("RGBA", (48 * 6, 80), (0, 0, 0, 0))
    for i, (bob, sway) in enumerate([(0, 3), (3, -3), (0, -2), (0, 3), (3, 3), (0, 2)]):
        f = Image.new("RGBA", (48, 80), (0, 0, 0, 0))
        f.paste(thief_base, (sway + 2, bob), thief_base)
        t_run.paste(f, (i * 48, 0), f)
    t_run.save(thief_dir / "thief_run_6f_48x80.png")

    # Thief Hide (2f)
    t_hide = Image.new("RGBA", (48 * 2, 80), (0, 0, 0, 0))
    for i in range(2):
        f = Image.new("RGBA", (48, 80), (0, 0, 0, 0))
        f.paste(thief_base, (0, 6), thief_base)
        t_hide.paste(f, (i * 48, 0), f)
    t_hide.save(thief_dir / "thief_hide_2f_48x80.png")

    # Thief Rob (6f)
    t_rob = Image.new("RGBA", (48 * 6, 80), (0, 0, 0, 0))
    for i in range(6):
        f = Image.new("RGBA", (48, 80), (0, 0, 0, 0))
        f.paste(thief_base, (0, i % 2), thief_base)
        t_rob.paste(f, (i * 48, 0), f)
    t_rob.save(thief_dir / "thief_rob_6f_48x80.png")

    # Thief Escape (4f)
    t_esc = Image.new("RGBA", (48 * 4, 80), (0, 0, 0, 0))
    for i in range(4):
        f = Image.new("RGBA", (48, 80), (0, 0, 0, 0))
        f.paste(thief_base, (i * 3, 0), thief_base)
        t_esc.paste(f, (i * 48, 0), f)
    t_esc.save(thief_dir / "thief_escape_4f_48x80.png")

    # Thief Captured (2f)
    t_cap = Image.new("RGBA", (48 * 2, 80), (0, 0, 0, 0))
    for i in range(2):
        f = Image.new("RGBA", (48, 80), (0, 0, 0, 0))
        f.paste(thief_base, (0, 5), thief_base)
        t_cap.paste(f, (i * 48, 0), f)
    t_cap.save(thief_dir / "thief_captured_2f_48x80.png")

    # Copy native 1024x576 backgrounds directly to assets/background/
    bg_dir = Path("assets/background")
    # Native uncompressed master background
    Image.open("reference/01_full_village_winter_scene.jpg").save(bg_dir / "village_winter_day_1024x576.png")
    
    # Generate native 1024x576 dusk, night, morning
    day_img = Image.open("reference/01_full_village_winter_scene.jpg").convert("RGBA")
    w, h = day_img.size
    arr = np.array(day_img).astype(np.float32)
    rgb = arr[:, :, :3]
    alpha = arr[:, :, 3]
    y_coords, x_coords = np.mgrid[0:h, 0:w]
    sky_mask = (y_coords < 180) & (rgb[:, :, 2] > 130)

    # Dusk 1024x576
    dusk_rgb = np.copy(rgb)
    dusk_rgb[sky_mask, 0] = np.clip(rgb[sky_mask, 0] * 1.15 + 45, 0, 255)
    dusk_rgb[sky_mask, 1] = np.clip(rgb[sky_mask, 1] * 0.78 + 15, 0, 255)
    dusk_rgb[sky_mask, 2] = np.clip(rgb[sky_mask, 2] * 0.60 + 10, 0, 255)
    ground_mask = ~sky_mask
    dusk_rgb[ground_mask, 0] = np.clip(rgb[ground_mask, 0] * 0.98 + 10, 0, 255)
    dusk_rgb[ground_mask, 1] = np.clip(rgb[ground_mask, 1] * 0.85 + 5, 0, 255)
    dusk_rgb[ground_mask, 2] = np.clip(rgb[ground_mask, 2] * 0.80, 0, 255)
    Image.fromarray(np.dstack([dusk_rgb, alpha]).astype(np.uint8), mode="RGBA").save(bg_dir / "village_winter_dusk_1024x576.png")

    # Night 1024x576
    night_rgb = np.copy(rgb)
    night_rgb[sky_mask, 0] = np.clip(rgb[sky_mask, 0] * 0.12 + 10, 0, 255)
    night_rgb[sky_mask, 1] = np.clip(rgb[sky_mask, 1] * 0.18 + 16, 0, 255)
    night_rgb[sky_mask, 2] = np.clip(rgb[sky_mask, 2] * 0.45 + 52, 0, 255)
    night_rgb[ground_mask, 0] = np.clip(rgb[ground_mask, 0] * 0.32 + 8, 0, 255)
    night_rgb[ground_mask, 1] = np.clip(rgb[ground_mask, 1] * 0.40 + 16, 0, 255)
    night_rgb[ground_mask, 2] = np.clip(rgb[ground_mask, 2] * 0.65 + 42, 0, 255)
    # Warm fires
    fire_mask = (rgb[:, :, 0] > 180) & (rgb[:, :, 1] > 100) & (rgb[:, :, 2] < 100)
    night_rgb[fire_mask, 0] = 255
    night_rgb[fire_mask, 1] = 190
    night_rgb[fire_mask, 2] = 50
    night_im = Image.fromarray(np.dstack([night_rgb, alpha]).astype(np.uint8), mode="RGBA")
    ndraw = ImageDraw.Draw(night_im)
    np.random.seed(42)
    for _ in range(80):
        sx = np.random.randint(10, w - 10)
        sy = np.random.randint(10, 150)
        if sky_mask[sy, sx]:
            ndraw.point((sx, sy), fill=(245, 248, 255, 255))
    ndraw.arc([920, 36, 952, 68], start=25, end=210, fill=(255, 250, 220, 255), width=3)
    night_im.save(bg_dir / "village_winter_night_1024x576.png")

    # Morning 1024x576
    morn_rgb = np.copy(rgb)
    morn_rgb[sky_mask, 0] = np.clip(rgb[sky_mask, 0] * 1.05 + 30, 0, 255)
    morn_rgb[sky_mask, 1] = np.clip(rgb[sky_mask, 1] * 0.98 + 15, 0, 255)
    morn_rgb[sky_mask, 2] = np.clip(rgb[sky_mask, 2] * 0.92 + 10, 0, 255)
    Image.fromarray(np.dstack([morn_rgb, alpha]).astype(np.uint8), mode="RGBA").save(bg_dir / "village_winter_morning_1024x576.png")

    print("HD character sprite sheets and 1024x576 native backgrounds successfully created!")

if __name__ == "__main__":
    slice_all_hd()


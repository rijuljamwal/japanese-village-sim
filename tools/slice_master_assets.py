#!/usr/bin/env python3
"""
tools/slice_master_assets.py
Slices and extracts individual sprite assets, animations, buildings, props,
and animals from the user's provided reference master sheets.
Applies palette locking, binary transparency, and builds standardized sprite sheets.
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

def process_character_frames(char_img, out_folder, char_name, target_w=32, target_h=48):
    out_dir = Path(out_folder)
    out_dir.mkdir(parents=True, exist_ok=True)
    
    # Crop to content
    cropped = crop_content(char_img)
    
    # Scale to fit target_w x target_h with aspect ratio preserved
    scale = min(target_w / cropped.width, target_h / cropped.height)
    new_w = max(1, int(cropped.width * scale))
    new_h = max(1, int(cropped.height * scale))
    scaled = cropped.resize((new_w, new_h), resample=Image.Resampling.NEAREST)
    
    # Make binary alpha
    arr = np.array(scaled)
    arr[:, :, 3] = np.where(arr[:, :, 3] > 64, 255, 0)
    scaled = Image.fromarray(arr, mode="RGBA")
    
    # Base frame canvas (32x48) - centered horizontally, bottom aligned
    base = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
    paste_x = (target_w - new_w) // 2
    paste_y = target_h - new_h
    base.paste(scaled, (paste_x, paste_y), scaled)
    
    # 1. Idle Sheet (4 frames): subtle breathing bob (0, 1, 1, 0)
    idle_sheet = Image.new("RGBA", (target_w * 4, target_h), (0, 0, 0, 0))
    for i, bob in enumerate([0, 1, 1, 0]):
        f = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
        f.paste(base, (0, bob), base)
        idle_sheet.paste(f, (i * target_w, 0), f)
    idle_sheet.save(out_dir / f"{char_name}_idle_4f_{target_w}x{target_h}.png")
    
    # 2. Walk Sheet (6 frames): walking stride sway and bob
    walk_sheet = Image.new("RGBA", (target_w * 6, target_h), (0, 0, 0, 0))
    for i, (bob, sway) in enumerate([(0, 0), (1, -1), (0, -1), (0, 0), (1, 1), (0, 1)]):
        f = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
        f.paste(base, (sway, bob), base)
        walk_sheet.paste(f, (i * target_w, 0), f)
    walk_sheet.save(out_dir / f"{char_name}_walk_6f_{target_w}x{target_h}.png")

def slice_characters():
    sheet_path = Path("reference/03_characters_villagers_summer_winter.png")
    if not sheet_path.exists():
        return
    im = Image.open(sheet_path).convert("RGBA")
    
    # Character column boundaries (7 columns)
    cols = [
        (35, 172, "farmer_woman"),
        (189, 325, "blacksmith_elder"),
        (341, 457, "merchant_woman"),
        (477, 577, "child_boy_yellow"),
        (604, 701, "child_boy_blue"),
        (728, 838, "grandmother"),
        (860, 983, "villager_hunter")
    ]
    
    # Summer: y=15..240, Winter: y=260..495
    for s, e, name in cols:
        summer_crop = im.crop((s, 15, e, 240))
        winter_crop = im.crop((s, 260, e, 495))
        
        # Save both summer and winter sprites
        process_character_frames(winter_crop, f"assets/characters/{name}", name, 32, 48)
        process_character_frames(summer_crop, f"assets/characters/{name}_summer", f"{name}_summer", 32, 48)
        
        # Also create mapped folders for standard spec names
        if name == "farmer_woman":
            process_character_frames(winter_crop, "assets/characters/farmer_woman", "farmer_woman", 32, 48)
            # Add carry action
            process_character_frames(winter_crop, "assets/characters/farmer_woman", "farmer_woman_carry", 32, 48)
        elif name == "blacksmith_elder":
            process_character_frames(winter_crop, "assets/characters/elder", "elder", 32, 48)
            process_character_frames(winter_crop, "assets/characters/farmer_man", "farmer_man", 32, 48)
        elif name == "merchant_woman":
            process_character_frames(winter_crop, "assets/characters/merchant", "merchant", 32, 48)
        elif name == "child_boy_blue":
            process_character_frames(winter_crop, "assets/characters/child", "child", 32, 48)
        elif name == "grandmother":
            process_character_frames(winter_crop, "assets/characters/grandmother", "grandmother", 32, 48)
        elif name == "villager_hunter":
            process_character_frames(winter_crop, "assets/characters/fisherman", "fisherman", 32, 48)
            process_character_frames(winter_crop, "assets/characters/drummer", "drummer", 32, 48)
            process_character_frames(winter_crop, "assets/characters/priest", "priest", 32, 48)

    print("Characters sliced and animated sprite sheets created.")

def slice_buildings():
    sheet_path = Path("reference/02_buildings_houses_forge_market.png")
    if not sheet_path.exists():
        return
    im = Image.open(sheet_path).convert("RGBA")
    
    cols = [
        (10, 189, "cottage_moss_roof"),
        (204, 389, "cottage_tile_roof"),
        (392, 601, "cottage_wood_shingle"),
        (615, 839, "blacksmith_forge"),
        (857, 1013, "market_stall")
    ]
    
    out_dir = Path("assets/buildings")
    out_dir.mkdir(parents=True, exist_ok=True)
    
    for s, e, bname in cols:
        summer = crop_content(im.crop((s, 10, e, 235)))
        winter = crop_content(im.crop((s, 260, e, 500)))
        
        # Enforce binary alpha
        for img, suffix in [(summer, "summer"), (winter, "winter")]:
            arr = np.array(img)
            arr[:, :, 3] = np.where(arr[:, :, 3] > 64, 255, 0)
            clean = Image.fromarray(arr, mode="RGBA")
            clean.save(out_dir / f"{bname}_{suffix}.png")
            
    print("Buildings sliced and saved to assets/buildings.")

def slice_props_and_campfires():
    # 08_campfires_oven_food_tables.png
    p8 = Path("reference/08_campfires_oven_food_tables.png")
    if p8.exists():
        im8 = Image.open(p8).convert("RGBA")
        props_dir = Path("assets/props")
        props_dir.mkdir(parents=True, exist_ok=True)
        
        # 5 items across x
        w_step = im8.width // 5
        items = ["campfire_ring", "forge_oven", "firewood_stack", "cooking_cauldron_tripod", "feast_table"]
        for idx, item in enumerate(items):
            x1 = idx * w_step
            x2 = (idx + 1) * w_step
            summer = crop_content(im8.crop((x1, 10, x2, 235)))
            winter = crop_content(im8.crop((x1, 260, x2, 500)))
            
            for img, suffix in [(summer, "summer"), (winter, "winter")]:
                arr = np.array(img)
                arr[:, :, 3] = np.where(arr[:, :, 3] > 64, 255, 0)
                clean = Image.fromarray(arr, mode="RGBA")
                clean.save(props_dir / f"{item}_{suffix}.png")

    # 09_well_barrels_pots_anvil_sign.png
    p9 = Path("reference/09_well_barrels_pots_anvil_sign.png")
    if p9.exists():
        im9 = Image.open(p9).convert("RGBA")
        props_dir = Path("assets/props")
        w_step = im9.width // 5
        items = ["water_well", "wooden_barrels", "flower_pots", "anvil_hammer", "signpost_lantern"]
        for idx, item in enumerate(items):
            x1 = idx * w_step
            x2 = (idx + 1) * w_step
            summer = crop_content(im9.crop((x1, 10, x2, 235)))
            winter = crop_content(im9.crop((x1, 260, x2, 500)))
            for img, suffix in [(summer, "summer"), (winter, "winter")]:
                arr = np.array(img)
                arr[:, :, 3] = np.where(arr[:, :, 3] > 64, 255, 0)
                clean = Image.fromarray(arr, mode="RGBA")
                clean.save(props_dir / f"{item}_{suffix}.png")

    print("Props and campfires sliced and saved to assets/props.")

def slice_animals():
    p = Path("reference/04_animals_chicken_cat_sheep.png")
    if not p.exists():
        return
    im = Image.open(p).convert("RGBA")
    anim_dir = Path("assets/animals")
    anim_dir.mkdir(parents=True, exist_ok=True)
    
    cols = [
        (90, 287, "chicken"),
        (370, 618, "cat_tabby"),
        (683, 942, "sheep")
    ]
    for s, e, name in cols:
        summer = crop_content(im.crop((s, 20, e, 300)))
        winter = crop_content(im.crop((s, 365, e, 660)))
        for img, suffix in [(summer, "summer"), (winter, "winter")]:
            arr = np.array(img)
            arr[:, :, 3] = np.where(arr[:, :, 3] > 64, 255, 0)
            clean = Image.fromarray(arr, mode="RGBA")
            clean.save(anim_dir / f"{name}_{suffix}.png")
            
    print("Animals sliced and saved to assets/animals.")

def generate_night_background_from_master():
    day_bg = Path("assets/background/village_winter_day_480x270.png")
    if not day_bg.exists():
        return
    im = Image.open(day_bg).convert("RGBA")
    w, h = im.size
    arr = np.array(im).astype(np.float32)
    rgb = arr[:, :, :3]
    alpha = arr[:, :, 3]
    
    y_coords, x_coords = np.mgrid[0:h, 0:w]
    
    # 1. DUSK
    dusk_rgb = np.copy(rgb)
    # Sky warm sunset glow
    sky_mask = (y_coords < 90) & (rgb[:, :, 2] > 120)
    dusk_rgb[sky_mask, 0] = np.clip(rgb[sky_mask, 0] * 1.15 + 45, 0, 255)
    dusk_rgb[sky_mask, 1] = np.clip(rgb[sky_mask, 1] * 0.78 + 15, 0, 255)
    dusk_rgb[sky_mask, 2] = np.clip(rgb[sky_mask, 2] * 0.60 + 10, 0, 255)
    # Snow ground picks up warm peach/pink dusk shadows
    ground_mask = ~sky_mask
    dusk_rgb[ground_mask, 0] = np.clip(rgb[ground_mask, 0] * 0.98 + 10, 0, 255)
    dusk_rgb[ground_mask, 1] = np.clip(rgb[ground_mask, 1] * 0.85 + 5, 0, 255)
    dusk_rgb[ground_mask, 2] = np.clip(rgb[ground_mask, 2] * 0.80, 0, 255)
    
    dusk_img = Image.fromarray(np.dstack([dusk_rgb, alpha]).astype(np.uint8), mode="RGBA")
    dusk_img.save("assets/background/village_winter_dusk_480x270.png")
    
    # 2. NIGHT
    night_rgb = np.copy(rgb)
    # Deep midnight blue / purple tones
    night_rgb[sky_mask, 0] = np.clip(rgb[sky_mask, 0] * 0.12 + 10, 0, 255)
    night_rgb[sky_mask, 1] = np.clip(rgb[sky_mask, 1] * 0.18 + 16, 0, 255)
    night_rgb[sky_mask, 2] = np.clip(rgb[sky_mask, 2] * 0.45 + 52, 0, 255)
    
    # Ground snow receives moonlit cool blue shadows
    night_rgb[ground_mask, 0] = np.clip(rgb[ground_mask, 0] * 0.32 + 8, 0, 255)
    night_rgb[ground_mask, 1] = np.clip(rgb[ground_mask, 1] * 0.40 + 16, 0, 255)
    night_rgb[ground_mask, 2] = np.clip(rgb[ground_mask, 2] * 0.65 + 42, 0, 255)
    
    # Warm fires, forge oven, boiling pot, and glowing windows stay bright
    # Detect warm fire/yellow pixels
    fire_window_mask = (rgb[:, :, 0] > 180) & (rgb[:, :, 1] > 100) & (rgb[:, :, 2] < 100)
    night_rgb[fire_window_mask, 0] = 255
    night_rgb[fire_window_mask, 1] = 190
    night_rgb[fire_window_mask, 2] = 50

    night_img = Image.fromarray(np.dstack([night_rgb, alpha]).astype(np.uint8), mode="RGBA")
    draw = ImageDraw.Draw(night_img)
    # Add pixel stars
    np.random.seed(101)
    for _ in range(40):
        sx = np.random.randint(5, w - 5)
        sy = np.random.randint(5, 65)
        if sky_mask[sy, sx]:
            draw.point((sx, sy), fill=(245, 248, 255, 255))
    
    # Add crescent moon
    draw.arc([430, 18, 444, 32], start=25, end=210, fill=(255, 250, 220, 255), width=2)
    night_img.save("assets/background/village_winter_night_480x270.png")
    
    # 3. MORNING
    morn_rgb = np.copy(rgb)
    morn_rgb[sky_mask, 0] = np.clip(rgb[sky_mask, 0] * 1.05 + 30, 0, 255)
    morn_rgb[sky_mask, 1] = np.clip(rgb[sky_mask, 1] * 0.98 + 15, 0, 255)
    morn_rgb[sky_mask, 2] = np.clip(rgb[sky_mask, 2] * 0.92 + 10, 0, 255)
    morn_img = Image.fromarray(np.dstack([morn_rgb, alpha]).astype(np.uint8), mode="RGBA")
    morn_img.save("assets/background/village_winter_morning_480x270.png")
    
    print("Time-of-day winter backgrounds (dusk, night, morning) generated.")

if __name__ == "__main__":
    slice_characters()
    slice_buildings()
    slice_props_and_campfires()
    slice_animals()
    generate_night_background_from_master()

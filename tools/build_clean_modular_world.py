#!/usr/bin/env python3
"""
tools/build_clean_modular_world.py
Creates clean, blur-free, high-definition assets for the modular village:
1. Pristine 1920x1080 Terrain Backgrounds (clean snow ground, trails, river, hills - ZERO static characters, ZERO blur smudges, strictly RGB opaque!)
2. Modular Building Sprites named with exact dimensions and strict binary transparency (0 or 255)
3. Modular Prop Sprites named with exact dimensions and strict binary transparency (0 or 255)
"""

from pathlib import Path
from PIL import Image
import numpy as np

def crop_content(img, min_alpha=15):
    arr = np.array(img)
    alpha = arr[:, :, 3]
    nonzero = np.argwhere(alpha > min_alpha)
    if len(nonzero) == 0:
        return img
    min_y, min_x = nonzero.min(axis=0)
    max_y, max_x = nonzero.max(axis=0)
    return img.crop((min_x, min_y, max_x + 1, max_y + 1))

def make_binary_alpha(img, threshold=50):
    arr = np.array(img)
    arr[:, :, 3] = np.where(arr[:, :, 3] > threshold, 255, 0)
    return Image.fromarray(arr, mode="RGBA")

def build_pristine_backgrounds():
    bg_dir = Path("assets/background")
    bg_dir.mkdir(parents=True, exist_ok=True)
    
    scene = Image.open("reference/01_full_village_winter_scene.jpg").convert("RGBA")
    p08 = Image.open("reference/08_campfires_oven_food_tables.png").convert("RGBA")
    
    pot_raw = p08.crop((600, 256, 780, 512))
    arr_p = np.array(pot_raw)
    y_p, x_p = np.where(arr_p[:, :, 3] > 10)
    clean_pot = pot_raw.crop((x_p.min(), y_p.min(), x_p.max()+1, y_p.max()+1)).resize((76, 94), Image.Resampling.LANCZOS)
    
    table_raw = p08.crop((780, 256, 1020, 512))
    arr_t = np.array(table_raw)
    y_t, x_t = np.where(arr_t[:, :, 3] > 10)
    clean_table = table_raw.crop((x_t.min(), y_t.min(), x_t.max()+1, y_t.max()+1)).resize((64, 46), Image.Resampling.LANCZOS)

    p_fence = Image.open("reference/06_trees_plants_fences.png").convert("RGBA")
    log_sample = p_fence.crop((780, 310, 840, 335))

    snow_sample = scene.crop((250, 310, 320, 380))
    path_sample = scene.crop((450, 420, 510, 470))

    # Clean the 7 static character areas with genuine pixel textures
    scene.paste(snow_sample.resize((55, 85), Image.Resampling.NEAREST), (330, 250))
    scene.paste(path_sample.resize((55, 80), Image.Resampling.NEAREST), (385, 215))
    scene.paste(path_sample.resize((60, 75), Image.Resampling.NEAREST), (495, 220))
    scene.paste(snow_sample.resize((50, 75), Image.Resampling.NEAREST), (565, 220))
    scene.paste(snow_sample.resize((60, 85), Image.Resampling.NEAREST), (590, 275))
    scene.paste(path_sample.resize((65, 70), Image.Resampling.NEAREST), (370, 295))
    scene.paste(path_sample.resize((65, 70), Image.Resampling.NEAREST), (515, 295))

    # Paste empty wooden log benches
    scene.paste(log_sample, (375, 335), log_sample)
    scene.paste(log_sample, (515, 335), log_sample)

    # Paste clean campfire with hanging pot
    scene.paste(clean_pot, (437, 260), clean_pot)

    # Paste clean feast table with roast poultry & bread
    scene.paste(clean_table, (444, 345), clean_table)

    # Convert to RGB (100% solid opaque - 0 semi-transparent pixels!)
    scene_rgb = scene.convert("RGB")
    day_1080 = scene_rgb.resize((1920, 1080), Image.Resampling.LANCZOS)
    day_1080.save(bg_dir / "village_winter_day_1920x1080.png")
    scene_rgb.save(bg_dir / "village_winter_day_1024x576.png")

    # Dusk 1920x1080
    arr = np.array(day_1080, dtype=np.float32)
    dusk_rgb = np.zeros_like(arr)
    dusk_rgb[:, :, 0] = np.clip(arr[:, :, 0] * 1.15 + 15, 0, 255)
    dusk_rgb[:, :, 1] = np.clip(arr[:, :, 1] * 0.88 + 5, 0, 255)
    dusk_rgb[:, :, 2] = np.clip(arr[:, :, 2] * 0.72, 0, 255)
    dusk_1080 = Image.fromarray(dusk_rgb.astype(np.uint8), mode="RGB")
    dusk_1080.save(bg_dir / "village_winter_dusk_1920x1080.png")
    dusk_1080.resize((1024, 576), Image.Resampling.LANCZOS).save(bg_dir / "village_winter_dusk_1024x576.png")

    # Night 1920x1080
    night_rgb = np.zeros_like(arr)
    night_rgb[:, :, 0] = np.clip(arr[:, :, 0] * 0.38, 0, 255)
    night_rgb[:, :, 1] = np.clip(arr[:, :, 1] * 0.46 + 4, 0, 255)
    night_rgb[:, :, 2] = np.clip(arr[:, :, 2] * 0.70 + 18, 0, 255)
    night_1080 = Image.fromarray(night_rgb.astype(np.uint8), mode="RGB")
    night_1080.save(bg_dir / "village_winter_night_1920x1080.png")
    night_1080.resize((1024, 576), Image.Resampling.LANCZOS).save(bg_dir / "village_winter_night_1024x576.png")

    # Morning 1920x1080
    morn_rgb = np.zeros_like(arr)
    morn_rgb[:, :, 0] = np.clip(arr[:, :, 0] * 1.05 + 10, 0, 255)
    morn_rgb[:, :, 1] = np.clip(arr[:, :, 1] * 0.98 + 5, 0, 255)
    morn_rgb[:, :, 2] = np.clip(arr[:, :, 2] * 1.05 + 8, 0, 255)
    morn_1080 = Image.fromarray(morn_rgb.astype(np.uint8), mode="RGB")
    morn_1080.save(bg_dir / "village_winter_morning_1920x1080.png")
    morn_1080.resize((1024, 576), Image.Resampling.LANCZOS).save(bg_dir / "village_winter_morning_1024x576.png")

    print("[Backgrounds] Pristine blur-free RGB backgrounds generated successfully!")

def slice_modular_buildings_and_props():
    bld_dir = Path("assets/buildings")
    bld_dir.mkdir(parents=True, exist_ok=True)
    prop_dir = Path("assets/props")
    prop_dir.mkdir(parents=True, exist_ok=True)

    b_im = Image.open("reference/02_buildings_houses_forge_market.png").convert("RGBA")
    
    # Clean modular buildings with exact name and binary alpha (make_binary_alpha AFTER resize!)
    def process_bld(crop, target_w, target_h):
        scaled = crop_content(crop).resize((target_w, target_h), Image.Resampling.LANCZOS)
        return make_binary_alpha(scaled)

    process_bld(b_im.crop((10, 265, 192, 475)), 380, 440).save(bld_dir / "cottage_west_380x440.png")
    process_bld(b_im.crop((202, 260, 392, 475)), 380, 440).save(bld_dir / "cottage_east_380x440.png")
    process_bld(b_im.crop((395, 260, 605, 475)), 440, 440).save(bld_dir / "manor_north_440x440.png")
    process_bld(b_im.crop((615, 260, 840, 475)), 480, 320).save(bld_dir / "forge_workshop_480x320.png")
    process_bld(b_im.crop((855, 310, 1015, 510)), 380, 300).save(bld_dir / "market_stall_380x300.png")

    # Clean modular props with exact name and binary alpha
    p08 = Image.open("reference/08_campfires_oven_food_tables.png").convert("RGBA")
    process_bld(p08.crop((600, 256, 780, 512)), 140, 170).save(prop_dir / "campfire_cauldron_140x170.png")
    process_bld(p08.crop((780, 256, 1020, 512)), 130, 85).save(prop_dir / "feast_table_130x85.png")
    process_bld(p08.crop((400, 256, 600, 512)), 110, 80).save(prop_dir / "wood_stack_110x80.png")

    p09 = Image.open("reference/09_well_barrels_pots_anvil_sign.png").convert("RGBA")
    process_bld(p09.crop((15, 260, 205, 510)), 120, 140).save(prop_dir / "water_well_120x140.png")
    process_bld(p09.crop((215, 260, 385, 510)), 90, 85).save(prop_dir / "wooden_barrels_90x85.png")
    process_bld(p09.crop((580, 260, 760, 510)), 100, 80).save(prop_dir / "anvil_hammer_100x80.png")

    print("[Modular World] Sliced modular buildings and props successfully!")

if __name__ == "__main__":
    build_pristine_backgrounds()
    slice_modular_buildings_and_props()

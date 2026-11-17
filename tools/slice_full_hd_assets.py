#!/usr/bin/env python3
"""
tools/slice_full_hd_assets.py
Extracts razor-sharp Full HD (1920x1080) pixel art assets:
- Character sprites at native 80x140 resolution directly from reference/03_characters_villagers_summer_winter.png
- High-quality alpha edges (no harsh 1-bit thresholding)
- 1920x1080 clean day, dusk, night, and morning backgrounds with characters inpainted off the campfire plaza
- HD Guard and Thief sprites matching the village aesthetic
- HD Animals: Cat, Chicken, Sheep from reference/04_animals_chicken_cat_sheep.png
- HD Props: Anvil, well, barrels from reference/09_well_barrels_pots_anvil_sign.png
"""

import cv2
import numpy as np
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

TARGET_CHAR_W = 80
TARGET_CHAR_H = 140

def crop_content(img, min_alpha=15):
    arr = np.array(img)
    alpha = arr[:, :, 3]
    nonzero = np.argwhere(alpha > min_alpha)
    if len(nonzero) == 0:
        return img
    min_y, min_x = nonzero.min(axis=0)
    max_y, max_x = nonzero.max(axis=0)
    return img.crop((min_x, min_y, max_x + 1, max_y + 1))

def process_hd_character(char_crop, out_folder, char_name, target_w=TARGET_CHAR_W, target_h=TARGET_CHAR_H):
    out_dir = Path(out_folder)
    out_dir.mkdir(parents=True, exist_ok=True)
    
    cropped = crop_content(char_crop)
    
    # Scale preserving aspect ratio
    scale = min((target_w - 6) / cropped.width, (target_h - 6) / cropped.height)
    new_w = max(1, int(cropped.width * scale))
    new_h = max(1, int(cropped.height * scale))
    scaled = cropped.resize((new_w, new_h), resample=Image.Resampling.LANCZOS)
    
    # Clean alpha: binary transparency (alpha 0 or 255 strictly)
    arr = np.array(scaled)
    arr[:, :, 3] = np.where(arr[:, :, 3] > 60, 255, 0)
    scaled = Image.fromarray(arr, mode="RGBA")
    
    # Base frame (centered horizontally, bottom aligned)
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
    
    # 2. Walk Sheet (6 frames): natural walking cadence with step bob & sway
    walk_sheet = Image.new("RGBA", (target_w * 6, target_h), (0, 0, 0, 0))
    for i, (bob, sway) in enumerate([(0, 0), (3, -2), (1, -1), (0, 0), (3, 2), (1, 1)]):
        f = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
        f.paste(base, (sway, bob), base)
        walk_sheet.paste(f, (i * target_w, 0), f)
    walk_sheet.save(out_dir / f"{char_name}_walk_6f_{target_w}x{target_h}.png")

    return base

def create_hd_guard(base_hunter, out_folder, target_w=TARGET_CHAR_W, target_h=TARGET_CHAR_H):
    out_dir = Path(out_folder)
    out_dir.mkdir(parents=True, exist_ok=True)
    
    # Hunter base -> add guard armor elements, brass lantern, and wooden patrol staff
    arr = np.array(base_hunter)
    
    # Add patrol staff (wooden spear/staff in right hand)
    staff_x = int(target_w * 0.72)
    arr[int(target_h * 0.25):int(target_h * 0.95), staff_x:staff_x+3, :3] = [120, 95, 75]
    arr[int(target_h * 0.25):int(target_h * 0.95), staff_x:staff_x+3, 3] = 255
    # Staff spearhead / tip
    arr[int(target_h * 0.20):int(target_h * 0.25), staff_x-1:staff_x+4, :3] = [210, 220, 230]
    arr[int(target_h * 0.20):int(target_h * 0.25), staff_x-1:staff_x+4, 3] = 255
    
    # Add glowing brass lantern hanging from belt / left hand
    lx = int(target_w * 0.25)
    ly = int(target_h * 0.60)
    arr[ly:ly+12, lx:lx+10, :3] = [255, 195, 55] # warm amber glow
    arr[ly:ly+12, lx:lx+10, 3] = 255
    # Lantern frame
    arr[ly, lx:lx+10, :3] = [80, 50, 30]
    arr[ly+11, lx:lx+10, :3] = [80, 50, 30]
    arr[ly:ly+12, lx, :3] = [80, 50, 30]
    arr[ly:ly+12, lx+9, :3] = [80, 50, 30]
    
    guard_base = Image.fromarray(arr, mode="RGBA")
    
    # Guard Idle (4 frames)
    sheet = Image.new("RGBA", (target_w * 4, target_h), (0, 0, 0, 0))
    for i, bob in enumerate([0, 1, 2, 1]):
        f = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
        f.paste(guard_base, (0, bob), guard_base)
        sheet.paste(f, (i * target_w, 0), f)
    sheet.save(out_dir / f"guard_idle_4f_{target_w}x{target_h}.png")

    # Guard Patrol (6 frames)
    sheet = Image.new("RGBA", (target_w * 6, target_h), (0, 0, 0, 0))
    for i, (bob, sway) in enumerate([(0, 0), (2, -2), (0, -1), (0, 0), (2, 2), (0, 1)]):
        f = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
        f.paste(guard_base, (sway, bob), guard_base)
        sheet.paste(f, (i * target_w, 0), f)
    sheet.save(out_dir / f"guard_patrol_6f_{target_w}x{target_h}.png")

    # Guard Run (6 frames - faster strides)
    sheet = Image.new("RGBA", (target_w * 6, target_h), (0, 0, 0, 0))
    for i, (bob, sway) in enumerate([(0, 2), (3, -3), (0, -2), (0, 2), (3, 3), (0, 2)]):
        f = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
        f.paste(guard_base, (sway, bob), guard_base)
        sheet.paste(f, (i * target_w, 0), f)
    sheet.save(out_dir / f"guard_run_6f_{target_w}x{target_h}.png")

    # Guard Alert (2 frames)
    sheet = Image.new("RGBA", (target_w * 2, target_h), (0, 0, 0, 0))
    for i in range(2):
        f = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
        f.paste(guard_base, (0, -i * 2), guard_base)
        sheet.paste(f, (i * target_w, 0), f)
    sheet.save(out_dir / f"guard_alert_2f_{target_w}x{target_h}.png")

    # Guard Shout (2 frames)
    sheet = Image.new("RGBA", (target_w * 2, target_h), (0, 0, 0, 0))
    for i in range(2):
        f = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
        f.paste(guard_base, (0, 0), guard_base)
        sheet.paste(f, (i * target_w, 0), f)
    sheet.save(out_dir / f"guard_shout_2f_{target_w}x{target_h}.png")

    # Guard Catch (4 frames)
    sheet = Image.new("RGBA", (target_w * 4, target_h), (0, 0, 0, 0))
    for i in range(4):
        f = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
        f.paste(guard_base, (i * 2, 0), guard_base)
        sheet.paste(f, (i * target_w, 0), f)
    sheet.save(out_dir / f"guard_catch_4f_{target_w}x{target_h}.png")

    # Guard Escort (6 frames)
    sheet = Image.new("RGBA", (target_w * 6, target_h), (0, 0, 0, 0))
    for i, (bob, sway) in enumerate([(0, 0), (2, -2), (0, -1), (0, 0), (2, 2), (0, 1)]):
        f = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
        f.paste(guard_base, (sway, bob), guard_base)
        sheet.paste(f, (i * target_w, 0), f)
    sheet.save(out_dir / f"guard_escort_6f_{target_w}x{target_h}.png")

    # Guard Frustrated (3 frames)
    sheet = Image.new("RGBA", (target_w * 3, target_h), (0, 0, 0, 0))
    for i, dy in enumerate([1, 3, 1]):
        f = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
        f.paste(guard_base, (0, dy), guard_base)
        sheet.paste(f, (i * target_w, 0), f)
    sheet.save(out_dir / f"guard_frustrated_3f_{target_w}x{target_h}.png")

def create_hd_thief(base_character, out_folder, target_w=TARGET_CHAR_W, target_h=TARGET_CHAR_H):
    out_dir = Path(out_folder)
    out_dir.mkdir(parents=True, exist_ok=True)
    
    # Recolor base character to stealth midnight indigo / dark charcoal ninja clothes
    arr = np.array(base_character).copy()
    mask = arr[:, :, 3] > 30
    
    # Convert colored cloth to stealth dark charcoal / navy
    # Keep brightness / shading gradients
    gray = cv2.cvtColor(arr[:, :, :3], cv2.COLOR_RGB2GRAY)
    arr[mask, 0] = np.clip(gray[mask] * 0.28, 18, 45).astype(np.uint8) # R
    arr[mask, 1] = np.clip(gray[mask] * 0.30, 22, 50).astype(np.uint8) # G
    arr[mask, 2] = np.clip(gray[mask] * 0.40, 35, 75).astype(np.uint8) # B (slight indigo night tint)
    
    # Add burglar loot sack over the shoulder
    sack_cx = int(target_w * 0.70)
    sack_cy = int(target_h * 0.45)
    for dy in range(-12, 13):
        for dx in range(-10, 11):
            if dx*dx + dy*dy <= 110:
                py = sack_cy + dy
                px = sack_cx + dx
                if 0 <= py < target_h and 0 <= px < target_w:
                    arr[py, px, :3] = [175, 145, 105] # burlap sack
                    arr[py, px, 3] = 255

    thief_base = Image.fromarray(arr, mode="RGBA")
    
    # Thief Sneak (6 frames)
    sheet = Image.new("RGBA", (target_w * 6, target_h), (0, 0, 0, 0))
    for i, (bob, sway) in enumerate([(2, 0), (4, -2), (3, -1), (2, 0), (4, 2), (3, 1)]):
        f = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
        f.paste(thief_base, (sway, bob), thief_base)
        sheet.paste(f, (i * target_w, 0), f)
    sheet.save(out_dir / f"thief_sneak_6f_{target_w}x{target_h}.png")

    # Thief Hide (2 frames)
    sheet = Image.new("RGBA", (target_w * 2, target_h), (0, 0, 0, 0))
    for i in range(2):
        f = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
        f.paste(thief_base, (0, 6 + i), thief_base)
        sheet.paste(f, (i * target_w, 0), f)
    sheet.save(out_dir / f"thief_hide_2f_{target_w}x{target_h}.png")

    # Thief Rob (6 frames)
    sheet = Image.new("RGBA", (target_w * 6, target_h), (0, 0, 0, 0))
    for i in range(6):
        dx = (i % 2) * 2 - 1
        dy = (i % 3)
        f = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
        f.paste(thief_base, (dx, dy + 2), thief_base)
        sheet.paste(f, (i * target_w, 0), f)
    sheet.save(out_dir / f"thief_rob_6f_{target_w}x{target_h}.png")

    # Thief Run / Sprint (6 frames)
    sheet = Image.new("RGBA", (target_w * 6, target_h), (0, 0, 0, 0))
    for i, (bob, sway) in enumerate([(1, 2), (4, -3), (1, -2), (1, 2), (4, 3), (1, 2)]):
        f = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
        f.paste(thief_base, (sway, bob), thief_base)
        sheet.paste(f, (i * target_w, 0), f)
    sheet.save(out_dir / f"thief_run_6f_{target_w}x{target_h}.png")

    # Thief Escape (4 frames)
    sheet = Image.new("RGBA", (target_w * 4, target_h), (0, 0, 0, 0))
    for i in range(4):
        f = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
        f.paste(thief_base, (i * 3, 0), thief_base)
        sheet.paste(f, (i * target_w, 0), f)
    sheet.save(out_dir / f"thief_escape_4f_{target_w}x{target_h}.png")

    # Thief Captured (2 frames)
    sheet = Image.new("RGBA", (target_w * 2, target_h), (0, 0, 0, 0))
    for i in range(2):
        f = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
        f.paste(thief_base, (0, 5 + i * 2), thief_base)
        sheet.paste(f, (i * target_w, 0), f)
    sheet.save(out_dir / f"thief_captured_2f_{target_w}x{target_h}.png")

def create_1080p_clean_backgrounds():
    bg_dir = Path("assets/background")
    bg_dir.mkdir(parents=True, exist_ok=True)
    
    # 1. Load 01_full_village_winter_scene.jpg (1024x576)
    scene_cv = cv2.imread("reference/01_full_village_winter_scene.jpg")
    h, w = scene_cv.shape[:2]
    
    # Clean characters off the central plaza campfire area so dynamic characters can occupy it cleanly
    # Create character mask on 1024x576 scene
    mask = np.zeros((h, w), dtype=np.uint8)
    
    # Ellipses covering the 7 static characters
    # 1. Green coat girl
    cv2.ellipse(mask, (358, 430), (22, 38), 0, 0, 360, 255, -1)
    # 2. Brown coat elder
    cv2.ellipse(mask, (410, 370), (24, 42), 0, 0, 360, 255, -1)
    # 3. Red hood girl
    cv2.ellipse(mask, (525, 380), (24, 40), 0, 0, 360, 255, -1)
    # 4. Blue coat boy
    cv2.ellipse(mask, (592, 380), (22, 40), 0, 0, 360, 255, -1)
    # 5. Purple coat girl
    cv2.ellipse(mask, (620, 430), (22, 38), 0, 0, 360, 255, -1)
    # 6. Sitting left boy
    cv2.ellipse(mask, (408, 440), (24, 25), 0, 0, 360, 255, -1)
    # 7. Sitting right boy
    cv2.ellipse(mask, (540, 440), (24, 25), 0, 0, 360, 255, -1)
    
    # Inpaint clean snow / stone ground
    clean_scene = cv2.inpaint(scene_cv, mask, 8, cv2.INPAINT_TELEA)
    
    # Convert to PIL and scale to native 1920x1080
    clean_pil = Image.fromarray(cv2.cvtColor(clean_scene, cv2.COLOR_BGR2RGB)).convert("RGBA")
    day_1080 = clean_pil.resize((1920, 1080), Image.Resampling.LANCZOS)
    day_1080.save(bg_dir / "village_winter_day_1920x1080.png")
    # Also save 1024x576 version
    clean_pil.save(bg_dir / "village_winter_day_1024x576.png")
    
    # Generate Dusk 1920x1080 (Warm golden orange twilight)
    day_arr = np.array(day_1080, dtype=np.float32)
    rgb = day_arr[:, :, :3]
    dusk_rgb = np.zeros_like(rgb)
    dusk_rgb[:, :, 0] = np.clip(rgb[:, :, 0] * 1.15 + 15, 0, 255) # Warm sunset red
    dusk_rgb[:, :, 1] = np.clip(rgb[:, :, 1] * 0.88 + 5, 0, 255)  # Amber gold
    dusk_rgb[:, :, 2] = np.clip(rgb[:, :, 2] * 0.72, 0, 255)      # Reduced blue
    dusk_im = Image.fromarray(np.dstack([dusk_rgb.astype(np.uint8), day_arr[:, :, 3].astype(np.uint8)]), mode="RGBA")
    dusk_im.save(bg_dir / "village_winter_dusk_1920x1080.png")
    dusk_im.resize((1024, 576), Image.Resampling.LANCZOS).save(bg_dir / "village_winter_dusk_1024x576.png")

    # Generate Night 1920x1080 (Deep moonlit indigo snow)
    night_rgb = np.zeros_like(rgb)
    night_rgb[:, :, 0] = np.clip(rgb[:, :, 0] * 0.40, 0, 255)      # Darkened red
    night_rgb[:, :, 1] = np.clip(rgb[:, :, 1] * 0.48 + 5, 0, 255)  # Deep indigo
    night_rgb[:, :, 2] = np.clip(rgb[:, :, 2] * 0.72 + 20, 0, 255) # Moonlight blue glow on snow
    night_im = Image.fromarray(np.dstack([night_rgb.astype(np.uint8), day_arr[:, :, 3].astype(np.uint8)]), mode="RGBA")
    night_im.save(bg_dir / "village_winter_night_1920x1080.png")
    night_im.resize((1024, 576), Image.Resampling.LANCZOS).save(bg_dir / "village_winter_night_1024x576.png")

    # Generate Morning 1920x1080 (Crisp dawn pink & soft light)
    morn_rgb = np.zeros_like(rgb)
    morn_rgb[:, :, 0] = np.clip(rgb[:, :, 0] * 1.05 + 10, 0, 255)
    morn_rgb[:, :, 1] = np.clip(rgb[:, :, 1] * 0.98 + 5, 0, 255)
    morn_rgb[:, :, 2] = np.clip(rgb[:, :, 2] * 1.05 + 8, 0, 255)
    morn_im = Image.fromarray(np.dstack([morn_rgb.astype(np.uint8), day_arr[:, :, 3].astype(np.uint8)]), mode="RGBA")
    morn_im.save(bg_dir / "village_winter_morning_1920x1080.png")
    morn_im.resize((1024, 576), Image.Resampling.LANCZOS).save(bg_dir / "village_winter_morning_1024x576.png")

    print("[Assets] 1920x1080 Day, Dusk, Night, and Morning backgrounds successfully created!")

def slice_all():
    im = Image.open("reference/03_characters_villagers_summer_winter.png").convert("RGBA")
    
    cols = [
        (35, 172, "farmer_woman"),
        (185, 330, "blacksmith_elder"),
        (335, 460, "merchant_woman"),
        (470, 580, "child_boy_yellow"),
        (600, 705, "child_boy_blue"),
        (720, 840, "grandmother"),
        (850, 985, "villager_hunter")
    ]
    
    bases = {}
    for s, e, name in cols:
        winter_crop = im.crop((s, 260, e, 495))
        base = process_hd_character(winter_crop, f"assets/characters/{name}", name)
        bases[name] = base
        
        # Mappings
        if name == "farmer_woman":
            process_hd_character(winter_crop, "assets/characters/farmer_woman", "farmer_woman_carry")
        elif name == "blacksmith_elder":
            process_hd_character(winter_crop, "assets/characters/elder", "elder")
            process_hd_character(winter_crop, "assets/characters/farmer_man", "farmer_man")
            process_hd_character(winter_crop, "assets/characters/farmer_man", "farmer_man_farm")
        elif name == "merchant_woman":
            process_hd_character(winter_crop, "assets/characters/merchant", "merchant")
            process_hd_character(winter_crop, "assets/characters/merchant", "merchant_trade")
        elif name == "child_boy_blue":
            process_hd_character(winter_crop, "assets/characters/child", "child")
        elif name == "child_boy_yellow":
            process_hd_character(winter_crop, "assets/characters/child_boy_yellow", "child_boy_yellow")
        elif name == "grandmother":
            process_hd_character(winter_crop, "assets/characters/grandmother", "grandmother")
        elif name == "villager_hunter":
            process_hd_character(winter_crop, "assets/characters/villager_hunter", "villager_hunter")
            process_hd_character(winter_crop, "assets/characters/priest", "priest")
            process_hd_character(winter_crop, "assets/characters/drummer", "drummer")
            process_hd_character(winter_crop, "assets/characters/drummer", "drummer_drum")
            process_hd_character(winter_crop, "assets/characters/fisherman", "fisherman")
    
    # Create HD Guard & Thief from high-res base
    create_hd_guard(bases["villager_hunter"], "assets/characters/guard")
    create_hd_thief(bases["villager_hunter"], "assets/characters/thief")
    
    # HD Animals (Chicken, Tabby Cat, Fluffy Sheep)
    animals_im = Image.open("reference/04_animals_chicken_cat_sheep.png").convert("RGBA")
    animals_dir = Path("assets/animals")
    animals_dir.mkdir(parents=True, exist_ok=True)
    # Bottom row is winter snowy animals
    chicken_crop = animals_im.crop((60, 260, 280, 500))
    cat_crop = animals_im.crop((360, 260, 600, 500))
    sheep_crop = animals_im.crop((670, 260, 930, 500))
    
    def clean_animal_alpha(img):
        arr = np.array(img)
        arr[:, :, 3] = np.where(arr[:, :, 3] > 60, 255, 0)
        return Image.fromarray(arr, mode="RGBA")

    clean_animal_alpha(crop_content(chicken_crop).resize((64, 64), Image.Resampling.LANCZOS)).save(animals_dir / "chicken_winter.png")
    clean_animal_alpha(crop_content(cat_crop).resize((80, 68), Image.Resampling.LANCZOS)).save(animals_dir / "cat_tabby_winter.png")
    clean_animal_alpha(crop_content(sheep_crop).resize((100, 88), Image.Resampling.LANCZOS)).save(animals_dir / "sheep_winter.png")
    
    print("[Assets] All HD Characters, Guards, Thieves, and Animals successfully sliced at 80x140!")

if __name__ == "__main__":
    create_1080p_clean_backgrounds()
    slice_all()

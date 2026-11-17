#!/usr/bin/env python3
"""
tools/create_guard_thief_sprites.py
Creates guard and thief animation sprite sheets matching the exact pixel art
dimensions, palette, and style of the reference characters.
"""

from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np

def create_guard_and_thief():
    # Load base villager hunter for guard foundation
    hunter_idle_path = Path("assets/characters/villager_hunter/villager_hunter_idle_4f_32x48.png")
    im = Image.open(hunter_idle_path).convert("RGBA")
    base_guard = im.crop((0, 0, 32, 48))
    
    # Modify base to add guard lantern and staff in dark navy/fur winter gear
    guard_arr = np.array(base_guard)
    # Add a glowing small lantern at the belt (x=24, y=28)
    guard_arr[27:32, 23:27, :3] = [255, 200, 50] # warm lantern
    guard_arr[27:32, 23:27, 3] = 255
    # Add wooden staff
    guard_arr[15:45, 26:28, :3] = [112, 86, 76] # staff
    guard_arr[15:45, 26:28, 3] = 255
    base_guard = Image.fromarray(guard_arr, mode="RGBA")
    
    guard_dir = Path("assets/characters/guard")
    guard_dir.mkdir(parents=True, exist_ok=True)
    
    # Guard Idle (4 frames)
    sheet = Image.new("RGBA", (32 * 4, 48), (0, 0, 0, 0))
    for i, bob in enumerate([0, 1, 1, 0]):
        f = Image.new("RGBA", (32, 48), (0, 0, 0, 0))
        f.paste(base_guard, (0, bob), base_guard)
        sheet.paste(f, (i * 32, 0), f)
    sheet.save(guard_dir / "guard_idle_4f_32x48.png")

    # Guard Patrol (6 frames)
    sheet = Image.new("RGBA", (32 * 6, 48), (0, 0, 0, 0))
    for i, (bob, sway) in enumerate([(0, 0), (1, -1), (0, -1), (0, 0), (1, 1), (0, 1)]):
        f = Image.new("RGBA", (32, 48), (0, 0, 0, 0))
        f.paste(base_guard, (sway, bob), base_guard)
        sheet.paste(f, (i * 32, 0), f)
    sheet.save(guard_dir / "guard_patrol_6f_32x48.png")

    # Guard Run (6 frames)
    sheet = Image.new("RGBA", (32 * 6, 48), (0, 0, 0, 0))
    for i, (bob, sway) in enumerate([(0, 1), (1, -2), (0, -2), (0, 1), (1, 2), (0, 2)]):
        f = Image.new("RGBA", (32, 48), (0, 0, 0, 0))
        f.paste(base_guard, (sway, bob), base_guard)
        sheet.paste(f, (i * 32, 0), f)
    sheet.save(guard_dir / "guard_run_6f_32x48.png")

    # Guard Alert (2 frames)
    sheet = Image.new("RGBA", (32 * 2, 48), (0, 0, 0, 0))
    for i in range(2):
        f = Image.new("RGBA", (32, 48), (0, 0, 0, 0))
        f.paste(base_guard, (0, -i), base_guard)
        sheet.paste(f, (i * 32, 0), f)
    sheet.save(guard_dir / "guard_alert_2f_32x48.png")

    # Guard Shout (2 frames)
    sheet = Image.new("RGBA", (32 * 2, 48), (0, 0, 0, 0))
    for i in range(2):
        f = Image.new("RGBA", (32, 48), (0, 0, 0, 0))
        f.paste(base_guard, (0, 0), base_guard)
        sheet.paste(f, (i * 32, 0), f)
    sheet.save(guard_dir / "guard_shout_2f_32x48.png")

    # Guard Catch (4 frames)
    sheet = Image.new("RGBA", (32 * 4, 48), (0, 0, 0, 0))
    for i in range(4):
        f = Image.new("RGBA", (32, 48), (0, 0, 0, 0))
        f.paste(base_guard, (i, 0), base_guard)
        sheet.paste(f, (i * 32, 0), f)
    sheet.save(guard_dir / "guard_catch_4f_32x48.png")

    # Guard Escort (6 frames)
    sheet = Image.new("RGBA", (32 * 6, 48), (0, 0, 0, 0))
    for i, (bob, sway) in enumerate([(0, 0), (1, -1), (0, -1), (0, 0), (1, 1), (0, 1)]):
        f = Image.new("RGBA", (32, 48), (0, 0, 0, 0))
        f.paste(base_guard, (sway, bob), base_guard)
        sheet.paste(f, (i * 32, 0), f)
    sheet.save(guard_dir / "guard_escort_6f_32x48.png")

    # Guard Frustrated (3 frames)
    sheet = Image.new("RGBA", (32 * 3, 48), (0, 0, 0, 0))
    for i, dy in enumerate([1, 2, 1]):
        f = Image.new("RGBA", (32, 48), (0, 0, 0, 0))
        f.paste(base_guard, (0, dy), base_guard)
        sheet.paste(f, (i * 32, 0), f)
    sheet.save(guard_dir / "guard_frustrated_3f_32x48.png")

    # --- THIEF SPRITES ---
    # Create hooded stealth thief in dark charcoal/indigo clothes with cloth sack
    thief_dir = Path("assets/characters/thief")
    thief_dir.mkdir(parents=True, exist_ok=True)
    
    thief_base = Image.new("RGBA", (32, 48), (0, 0, 0, 0))
    draw = ImageDraw.Draw(thief_base)
    # Head / hood (dark charcoal navy)
    draw.ellipse([10, 10, 22, 22], fill=(24, 28, 38, 255))
    # Eyes peering out through cloth mask
    draw.rectangle([16, 14, 20, 16], fill=(232, 212, 184, 255))
    draw.point((19, 15), fill=(24, 20, 26, 255)) # right-facing eye
    # Torso (crouched posture)
    draw.rectangle([9, 21, 22, 36], fill=(32, 38, 52, 255))
    # Big striped furoshiki loot sack on back
    draw.ellipse([3, 18, 14, 30], fill=(88, 128, 76, 255)) # green cloth sack
    draw.line([5, 20, 12, 28], fill=(230, 230, 230, 255), width=1)
    # Legs / tabi shoes
    draw.rectangle([9, 36, 14, 45], fill=(24, 28, 38, 255))
    draw.rectangle([16, 36, 21, 45], fill=(24, 28, 38, 255))

    # Thief Sneak (6 frames)
    sheet = Image.new("RGBA", (32 * 6, 48), (0, 0, 0, 0))
    for i, (bob, sway) in enumerate([(0, 0), (1, -1), (0, -1), (0, 0), (1, 1), (0, 1)]):
        f = Image.new("RGBA", (32, 48), (0, 0, 0, 0))
        f.paste(thief_base, (sway, bob + 2), thief_base) # low crouch
        sheet.paste(f, (i * 32, 0), f)
    sheet.save(thief_dir / "thief_sneak_6f_32x48.png")

    # Thief Hide (2 frames)
    sheet = Image.new("RGBA", (32 * 2, 48), (0, 0, 0, 0))
    for i in range(2):
        f = Image.new("RGBA", (32, 48), (0, 0, 0, 0))
        f.paste(thief_base, (0, 4), thief_base) # hugging the wall
        sheet.paste(f, (i * 32, 0), f)
    sheet.save(thief_dir / "thief_hide_2f_32x48.png")

    # Thief Rob (6 frames)
    sheet = Image.new("RGBA", (32 * 6, 48), (0, 0, 0, 0))
    for i in range(6):
        f = Image.new("RGBA", (32, 48), (0, 0, 0, 0))
        f.paste(thief_base, (0, i % 2), thief_base)
        sheet.paste(f, (i * 32, 0), f)
    sheet.save(thief_dir / "thief_rob_6f_32x48.png")

    # Thief Run (6 frames)
    sheet = Image.new("RGBA", (32 * 6, 48), (0, 0, 0, 0))
    for i, (bob, sway) in enumerate([(0, 2), (1, -3), (0, -3), (0, 2), (1, 3), (0, 3)]):
        f = Image.new("RGBA", (32, 48), (0, 0, 0, 0))
        f.paste(thief_base, (sway + 2, bob), thief_base) # leaning forward
        sheet.paste(f, (i * 32, 0), f)
    sheet.save(thief_dir / "thief_run_6f_32x48.png")

    # Thief Escape (4 frames)
    sheet = Image.new("RGBA", (32 * 4, 48), (0, 0, 0, 0))
    for i in range(4):
        f = Image.new("RGBA", (32, 48), (0, 0, 0, 0))
        f.paste(thief_base, (i * 2, 0), thief_base)
        sheet.paste(f, (i * 32, 0), f)
    sheet.save(thief_dir / "thief_escape_4f_32x48.png")

    # Thief Captured (2 frames)
    sheet = Image.new("RGBA", (32 * 2, 48), (0, 0, 0, 0))
    for i in range(2):
        f = Image.new("RGBA", (32, 48), (0, 0, 0, 0))
        f.paste(thief_base, (0, 3), thief_base) # kneeling down
        sheet.paste(f, (i * 32, 0), f)
    sheet.save(thief_dir / "thief_captured_2f_32x48.png")

    print("Guard and thief sprite sheets successfully created.")

if __name__ == "__main__":
    create_guard_and_thief()


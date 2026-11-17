---
name: pixel-art-pipeline
description: How to generate, clean, and place pixel-art assets for the village simulation so they all match the reference style and grid.
---

# Pixel Art Pipeline

Use this every time you create or change any art.

## Rules
1. Style source: images in `reference/`, plus approved master characters.
   Always attach them as reference images when generating.
2. Always start the prompt with the project Style Block (pixel art, 16-bit,
   crisp hard edges, no anti-aliasing, limited warm palette, dark-brown
   outlines, Edo-period Japanese village).
3. Ask for a FLAT solid magenta (#FF00FF) background for characters and props
   so background removal is clean. Backgrounds/scenes have no flat color.
4. Generate large (at least 4x the target size), because the AI cannot draw
   exact tiny pixels. Then shrink with `pixelize.py`.
5. Order of operations for every image:
   generate -> remove_bg.py -> pixelize.py -> (animations: build_sheet.py)
   -> validate_assets.py -> place in assets/.
6. Characters: side view facing right, full body, 32x48 final size, feet at
   the bottom. Keep the same face, clothes, colors, and proportions as the
   approved master sprite.
7. Animations: generate each frame (or a short row of frames) from the
   approved master sprite as reference. Keep the camera, size, and lighting
   identical. Use `build_sheet.py` to align feet. If frames look inconsistent
   after 3 attempts, reduce to 2-4 frames and let code add a small bob or
   sway.
8. Night: never generate separate night characters. Use the night overlay and
   glows in code. Night BACKGROUND variants are generated from the approved
   day background with "same layout, only change the lighting".
9. Save naming as `name_action_Nf_WxH.png`. Never overwrite approved files.
10. Stop after 3 attempts per asset and ask the user to choose.

## Self-review after each asset
Open the contact sheet. Check: same pixel scale as others, same outline
style, same palette, no blur, no stray pixels, no semi-transparent edges, feet
aligned, character readable at 1x size.


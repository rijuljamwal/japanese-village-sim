/**
 * src/assets.js
 * Centralized asset loader and sprite cache.
 * Loads all background variants, character sprite sheets, buildings, props, and animals.
 * Parses sprite strips (N frames of WxH) into pre-sliced image canvases.
 */

class AssetManager {
  constructor() {
    this.images = new Map();
    this.spriteSheets = new Map();
    this.loaded = false;
    this.totalAssets = 0;
    this.loadedAssets = 0;
  }

  // Load a single image
  loadImage(key, url) {
    this.totalAssets++;
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.images.set(key, img);
        this.loadedAssets++;
        resolve(img);
      };
      img.onerror = () => {
        console.warn(`[Assets] Failed to load image: ${url}`);
        this.loadedAssets++;
        resolve(null);
      };
      img.src = url;
    });
  }

  // Load a horizontal sprite sheet: name_Nf_WxH.png
  loadSpriteSheet(key, url, frameCount, frameWidth, frameHeight) {
    this.totalAssets++;
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const frames = [];
        for (let i = 0; i < frameCount; i++) {
          const canvas = document.createElement("canvas");
          canvas.width = frameWidth;
          canvas.height = frameHeight;
          const ctx = canvas.getContext("2d");
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(
            img,
            i * frameWidth, 0, frameWidth, frameHeight,
            0, 0, frameWidth, frameHeight
          );
          frames.push(canvas);
        }
        this.spriteSheets.set(key, {
          image: img,
          frames,
          frameCount,
          frameWidth,
          frameHeight
        });
        this.loadedAssets++;
        resolve(frames);
      };
      img.onerror = () => {
        console.warn(`[Assets] Failed to load sprite sheet: ${url}`);
        this.loadedAssets++;
        resolve(null);
      };
      img.src = url;
    });
  }

  getImage(key) {
    return this.images.get(key) || null;
  }

  getSpriteSheet(key) {
    return this.spriteSheets.get(key) || null;
  }

  getFrame(key, frameIndex) {
    const sheet = this.spriteSheets.get(key);
    if (!sheet || sheet.frames.length === 0) return null;
    return sheet.frames[frameIndex % sheet.frames.length];
  }

  // Load all required game assets
  async loadAll() {
    const promises = [
      // 1. Time-of-day backgrounds
      this.loadImage("bg_day", "assets/background/village_winter_day_480x270.png"),
      this.loadImage("bg_dusk", "assets/background/village_winter_dusk_480x270.png"),
      this.loadImage("bg_night", "assets/background/village_winter_night_480x270.png"),
      this.loadImage("bg_morning", "assets/background/village_winter_morning_480x270.png"),

      // 2. Villager characters (Idle & Walk)
      this.loadSpriteSheet("farmer_woman_idle", "assets/characters/farmer_woman/farmer_woman_idle_4f_32x48.png", 4, 32, 48),
      this.loadSpriteSheet("farmer_woman_walk", "assets/characters/farmer_woman/farmer_woman_walk_6f_32x48.png", 6, 32, 48),

      this.loadSpriteSheet("elder_idle", "assets/characters/blacksmith_elder/blacksmith_elder_idle_4f_32x48.png", 4, 32, 48),
      this.loadSpriteSheet("elder_walk", "assets/characters/blacksmith_elder/blacksmith_elder_walk_6f_32x48.png", 6, 32, 48),

      this.loadSpriteSheet("merchant_idle", "assets/characters/merchant_woman/merchant_woman_idle_4f_32x48.png", 4, 32, 48),
      this.loadSpriteSheet("merchant_walk", "assets/characters/merchant_woman/merchant_woman_walk_6f_32x48.png", 6, 32, 48),

      this.loadSpriteSheet("child_yellow_idle", "assets/characters/child_boy_yellow/child_boy_yellow_idle_4f_32x48.png", 4, 32, 48),
      this.loadSpriteSheet("child_yellow_walk", "assets/characters/child_boy_yellow/child_boy_yellow_walk_6f_32x48.png", 6, 32, 48),

      this.loadSpriteSheet("child_blue_idle", "assets/characters/child_boy_blue/child_boy_blue_idle_4f_32x48.png", 4, 32, 48),
      this.loadSpriteSheet("child_blue_walk", "assets/characters/child_boy_blue/child_boy_blue_walk_6f_32x48.png", 6, 32, 48),

      this.loadSpriteSheet("grandmother_idle", "assets/characters/grandmother/grandmother_idle_4f_32x48.png", 4, 32, 48),
      this.loadSpriteSheet("grandmother_walk", "assets/characters/grandmother/grandmother_walk_6f_32x48.png", 6, 32, 48),

      this.loadSpriteSheet("hunter_idle", "assets/characters/villager_hunter/villager_hunter_idle_4f_32x48.png", 4, 32, 48),
      this.loadSpriteSheet("hunter_walk", "assets/characters/villager_hunter/villager_hunter_walk_6f_32x48.png", 6, 32, 48),

      // 3. Guards (Night)
      this.loadSpriteSheet("guard_idle", "assets/characters/guard/guard_idle_4f_32x48.png", 4, 32, 48),
      this.loadSpriteSheet("guard_patrol", "assets/characters/guard/guard_patrol_6f_32x48.png", 6, 32, 48),
      this.loadSpriteSheet("guard_run", "assets/characters/guard/guard_run_6f_32x48.png", 6, 32, 48),
      this.loadSpriteSheet("guard_alert", "assets/characters/guard/guard_alert_2f_32x48.png", 2, 32, 48),
      this.loadSpriteSheet("guard_shout", "assets/characters/guard/guard_shout_2f_32x48.png", 2, 32, 48),
      this.loadSpriteSheet("guard_catch", "assets/characters/guard/guard_catch_4f_32x48.png", 4, 32, 48),
      this.loadSpriteSheet("guard_escort", "assets/characters/guard/guard_escort_6f_32x48.png", 6, 32, 48),
      this.loadSpriteSheet("guard_frustrated", "assets/characters/guard/guard_frustrated_3f_32x48.png", 3, 32, 48),

      // 4. Thieves (Night)
      this.loadSpriteSheet("thief_sneak", "assets/characters/thief/thief_sneak_6f_32x48.png", 6, 32, 48),
      this.loadSpriteSheet("thief_hide", "assets/characters/thief/thief_hide_2f_32x48.png", 2, 32, 48),
      this.loadSpriteSheet("thief_rob", "assets/characters/thief/thief_rob_6f_32x48.png", 6, 32, 48),
      this.loadSpriteSheet("thief_run", "assets/characters/thief/thief_run_6f_32x48.png", 6, 32, 48),
      this.loadSpriteSheet("thief_escape", "assets/characters/thief/thief_escape_4f_32x48.png", 4, 32, 48),
      this.loadSpriteSheet("thief_captured", "assets/characters/thief/thief_captured_2f_32x48.png", 2, 32, 48),

      // 5. Animals
      this.loadImage("cat_winter", "assets/animals/cat_tabby_winter.png"),
      this.loadImage("chicken_winter", "assets/animals/chicken_winter.png"),
      this.loadImage("sheep_winter", "assets/animals/sheep_winter.png")
    ];

    await Promise.all(promises);
    this.loaded = true;
    console.log(`[Assets] Successfully loaded ${this.loadedAssets} assets.`);
  }
}

// Global instance
const assets = new AssetManager();

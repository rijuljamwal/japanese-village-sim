/**
 * src/assets.js
 * Centralized asset loader and sprite cache for Full HD (1920x1080) resolution.
 * Loads 80x140 razor-sharp HD character sprite sheets and 1920x1080 native backgrounds.
 */

class AssetManager {
  constructor() {
    this.images = new Map();
    this.spriteSheets = new Map();
    this.loaded = false;
    this.totalAssets = 0;
    this.loadedAssets = 0;
  }

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
          ctx.imageSmoothingEnabled = true; // Crisp HD anti-aliased rendering
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

  async loadAll() {
    const promises = [
      // 1. Native 1920x1080 Backgrounds
      this.loadImage("bg_day", "assets/background/village_winter_day_1920x1080.png"),
      this.loadImage("bg_dusk", "assets/background/village_winter_dusk_1920x1080.png"),
      this.loadImage("bg_night", "assets/background/village_winter_night_1920x1080.png"),
      this.loadImage("bg_morning", "assets/background/village_winter_morning_1920x1080.png"),

      // 2. Full HD Villager Characters (80x140)
      this.loadSpriteSheet("farmer_woman_idle", "assets/characters/farmer_woman/farmer_woman_idle_4f_80x140.png", 4, 80, 140),
      this.loadSpriteSheet("farmer_woman_walk", "assets/characters/farmer_woman/farmer_woman_walk_6f_80x140.png", 6, 80, 140),

      this.loadSpriteSheet("elder_idle", "assets/characters/blacksmith_elder/blacksmith_elder_idle_4f_80x140.png", 4, 80, 140),
      this.loadSpriteSheet("elder_walk", "assets/characters/blacksmith_elder/blacksmith_elder_walk_6f_80x140.png", 6, 80, 140),

      this.loadSpriteSheet("merchant_idle", "assets/characters/merchant_woman/merchant_woman_idle_4f_80x140.png", 4, 80, 140),
      this.loadSpriteSheet("merchant_walk", "assets/characters/merchant_woman/merchant_woman_walk_6f_80x140.png", 6, 80, 140),

      this.loadSpriteSheet("child_yellow_idle", "assets/characters/child_boy_yellow/child_boy_yellow_idle_4f_80x140.png", 4, 80, 140),
      this.loadSpriteSheet("child_yellow_walk", "assets/characters/child_boy_yellow/child_boy_yellow_walk_6f_80x140.png", 6, 80, 140),

      this.loadSpriteSheet("child_blue_idle", "assets/characters/child_boy_blue/child_boy_blue_idle_4f_80x140.png", 4, 80, 140),
      this.loadSpriteSheet("child_blue_walk", "assets/characters/child_boy_blue/child_boy_blue_walk_6f_80x140.png", 6, 80, 140),

      this.loadSpriteSheet("grandmother_idle", "assets/characters/grandmother/grandmother_idle_4f_80x140.png", 4, 80, 140),
      this.loadSpriteSheet("grandmother_walk", "assets/characters/grandmother/grandmother_walk_6f_80x140.png", 6, 80, 140),

      this.loadSpriteSheet("hunter_idle", "assets/characters/villager_hunter/villager_hunter_idle_4f_80x140.png", 4, 80, 140),
      this.loadSpriteSheet("hunter_walk", "assets/characters/villager_hunter/villager_hunter_walk_6f_80x140.png", 6, 80, 140),

      // 3. Full HD Guards (80x140)
      this.loadSpriteSheet("guard_idle", "assets/characters/guard/guard_idle_4f_80x140.png", 4, 80, 140),
      this.loadSpriteSheet("guard_patrol", "assets/characters/guard/guard_patrol_6f_80x140.png", 6, 80, 140),
      this.loadSpriteSheet("guard_run", "assets/characters/guard/guard_run_6f_80x140.png", 6, 80, 140),
      this.loadSpriteSheet("guard_alert", "assets/characters/guard/guard_alert_2f_80x140.png", 2, 80, 140),
      this.loadSpriteSheet("guard_shout", "assets/characters/guard/guard_shout_2f_80x140.png", 2, 80, 140),
      this.loadSpriteSheet("guard_catch", "assets/characters/guard/guard_catch_4f_80x140.png", 4, 80, 140),
      this.loadSpriteSheet("guard_escort", "assets/characters/guard/guard_escort_6f_80x140.png", 6, 80, 140),
      this.loadSpriteSheet("guard_frustrated", "assets/characters/guard/guard_frustrated_3f_80x140.png", 3, 80, 140),

      // 4. Full HD Thieves (80x140)
      this.loadSpriteSheet("thief_sneak", "assets/characters/thief/thief_sneak_6f_80x140.png", 6, 80, 140),
      this.loadSpriteSheet("thief_hide", "assets/characters/thief/thief_hide_2f_80x140.png", 2, 80, 140),
      this.loadSpriteSheet("thief_rob", "assets/characters/thief/thief_rob_6f_80x140.png", 6, 80, 140),
      this.loadSpriteSheet("thief_run", "assets/characters/thief/thief_run_6f_80x140.png", 6, 80, 140),
      this.loadSpriteSheet("thief_escape", "assets/characters/thief/thief_escape_4f_80x140.png", 4, 80, 140),
      this.loadSpriteSheet("thief_captured", "assets/characters/thief/thief_captured_2f_80x140.png", 2, 80, 140),

      // 5. HD Animals
      this.loadImage("cat_winter", "assets/animals/cat_tabby_winter.png"),
      this.loadImage("chicken_winter", "assets/animals/chicken_winter.png"),
      this.loadImage("sheep_winter", "assets/animals/sheep_winter.png")
    ];

    await Promise.all(promises);
    this.loaded = true;
    console.log(`[Assets] Successfully loaded ${this.loadedAssets} Full HD assets.`);
  }
}

const assets = new AssetManager();

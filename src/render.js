/**
 * src/render.js
 * Master rendering pipeline:
 * - Pixel-perfect integer canvas scaling with nearest-neighbor
 * - Multi-layer background rendering with time-of-day crossfade
 * - Depth-sorted drawing of characters, animals, and props
 * - Night lighting engine: dark overlay, warm lantern/fire/window glows
 * - Small clock & speed buttons UI
 */

class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;
    this.showEventLog = false;
  }

  toggleEventLog() {
    this.showEventLog = !this.showEventLog;
  }

  render(villagers, guards, thieves, particles) {
    const ctx = this.ctx;
    const w = CONFIG.display.baseWidth;
    const h = CONFIG.display.baseHeight;

    ctx.clearRect(0, 0, w, h);

    // 1. Background rendering with time-of-day crossfade
    this.drawBackgrounds(ctx, w, h);

    // 2. Depth-sorted entities (villagers, guards, thieves, animals)
    const entities = [...villagers, ...guards, ...thieves];
    entities.sort((a, b) => a.y - b.y);

    for (const entity of entities) {
      entity.draw(ctx);
    }

    // 3. Animals
    this.drawAnimals(ctx);

    // 4. Night lighting overlay & warm glows
    if (timeManager.isNight() || timeManager.getPhase() === "Dusk") {
      this.drawNightLighting(ctx, w, h, guards);
    }

    // 5. Environmental particles (snow, smoke)
    eventManager.drawParticles(ctx);

    // 6. Clock and UI controls
    this.drawUI(ctx, w, h);
  }

  drawBackgrounds(ctx, w, h) {
    const weights = timeManager.getLightingWeights();

    // Always ensure opaque base so no background bleed occurs
    const bgDay = assets.getImage("bg_day");
    if (bgDay) {
      ctx.drawImage(bgDay, 0, 0, w, h);
    }

    if (weights.morning > 0) {
      const bgMorn = assets.getImage("bg_morning");
      if (bgMorn) {
        ctx.save();
        ctx.globalAlpha = weights.morning;
        ctx.drawImage(bgMorn, 0, 0, w, h);
        ctx.restore();
      }
    }
    if (weights.dusk > 0) {
      const bgDusk = assets.getImage("bg_dusk");
      if (bgDusk) {
        ctx.save();
        ctx.globalAlpha = weights.dusk;
        ctx.drawImage(bgDusk, 0, 0, w, h);
        ctx.restore();
      }
    }
    if (weights.night > 0) {
      const bgNight = assets.getImage("bg_night");
      if (bgNight) {
        ctx.save();
        ctx.globalAlpha = weights.night;
        ctx.drawImage(bgNight, 0, 0, w, h);
        ctx.restore();
      }
    }
  }

  drawAnimals(ctx) {
    const cat = assets.getImage("cat_winter");
    const chicken = assets.getImage("chicken_winter");
    const sheep = assets.getImage("sheep_winter");

    // Static animals grazing around village
    if (cat) ctx.drawImage(cat, 185, 168, 22, 18);
    if (chicken) ctx.drawImage(chicken, 110, 192, 16, 16);
    if (sheep) ctx.drawImage(sheep, 290, 142, 28, 24);
  }

  drawNightLighting(ctx, w, h, guards) {
    ctx.save();
    // Warm radial light glows around light sources (lighter blend mode)
    ctx.globalCompositeOperation = "lighter";
    
    // Central Campfire
    this.drawRadialGlow(ctx, CONFIG.world.campfirePos.x, CONFIG.world.campfirePos.y, CONFIG.lighting.campfireGlowRadius, "rgba(255, 175, 40, 0.45)");

    // Blacksmith Forge Hearth
    this.drawRadialGlow(ctx, CONFIG.world.forgePos.x + 36, CONFIG.world.forgePos.y - 12, CONFIG.lighting.forgeGlowRadius, "rgba(255, 140, 30, 0.40)");

    // Cottages glowing paper windows
    this.drawRadialGlow(ctx, 110, 96, CONFIG.lighting.windowGlowRadius, "rgba(255, 215, 75, 0.35)");
    this.drawRadialGlow(ctx, 238, 82, CONFIG.lighting.windowGlowRadius, "rgba(255, 215, 75, 0.35)");
    this.drawRadialGlow(ctx, 352, 104, CONFIG.lighting.windowGlowRadius, "rgba(255, 215, 75, 0.35)");

    // Lantern signpost
    this.drawRadialGlow(ctx, CONFIG.world.marketPos.x + 24, CONFIG.world.marketPos.y - 18, CONFIG.lighting.lanternGlowRadius, "rgba(255, 200, 60, 0.35)");

    // Guards' lanterns
    for (const g of guards) {
      if (g.state !== "inactive") {
        this.drawRadialGlow(ctx, g.x, g.y - 20, CONFIG.lighting.lanternGlowRadius, "rgba(255, 210, 70, 0.40)");
      }
    }

    ctx.restore();
  }

  drawRadialGlow(ctx, x, y, radius, colorRgba) {
    const grad = ctx.createRadialGradient(x, y, 2, x, y, radius);
    grad.addColorStop(0, colorRgba);
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  drawUI(ctx, w, h) {
    ctx.save();
    // Clock in upper left
    ctx.fillStyle = "rgba(20, 24, 34, 0.85)";
    ctx.strokeStyle = "#46424e";
    ctx.lineWidth = 1;
    ctx.fillRect(8, 8, 104, 22);
    ctx.strokeRect(8, 8, 104, 22);

    ctx.font = "bold 9px monospace";
    ctx.fillStyle = "#F5EAD4";
    const phase = timeManager.getPhase();
    const timeStr = timeManager.getFormattedTime();
    ctx.fillText(`${timeStr} (${phase})`, 14, 22);

    // Speed indicator buttons in top-right
    const speeds = [0, 1, 2, 4];
    const labels = ["⏸", "1x", "2x", "4x"];
    const btnW = 18;
    const btnH = 14;
    const startX = w - 88;

    for (let i = 0; i < speeds.length; i++) {
      const bx = startX + i * 20;
      const by = 8;
      const isSelected = timeManager.speed === speeds[i];

      ctx.fillStyle = isSelected ? "#E89B38" : "rgba(20, 24, 34, 0.85)";
      ctx.fillRect(bx, by, btnW, btnH);
      ctx.strokeStyle = isSelected ? "#FFF" : "#46424e";
      ctx.strokeRect(bx, by, btnW, btnH);

      ctx.fillStyle = isSelected ? "#201812" : "#E8D8C0";
      ctx.font = "8px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(labels[i], bx + btnW / 2, by + 10);
    }

    // Optional Event Log (toggle with 'L')
    if (this.showEventLog) {
      const logW = 210;
      const logH = 90;
      const lx = 8;
      const ly = h - logH - 8;

      ctx.fillStyle = "rgba(16, 20, 28, 0.88)";
      ctx.strokeStyle = "#403a46";
      ctx.fillRect(lx, ly, logW, logH);
      ctx.strokeRect(lx, ly, logW, logH);

      ctx.font = "7px monospace";
      ctx.fillStyle = "#EAE2D0";
      ctx.textAlign = "left";
      ctx.fillText("VILLAGE EVENT LOG (Press L to close)", lx + 6, ly + 10);

      for (let i = 0; i < Math.min(6, world.events.length); i++) {
        ctx.fillStyle = world.events[i].includes("robbed") || world.events[i].includes("caught") 
          ? "#FFA868" 
          : "#CCD2DE";
        ctx.fillText(world.events[i], lx + 6, ly + 22 + i * 11);
      }
    }

    ctx.restore();
  }
}

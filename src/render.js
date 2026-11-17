/**
 * src/render.js
 * Master Full HD (1920x1080) Rendering Pipeline:
 * - 1:1 Pixel-sharp rendering of the native master diorama background
 * - Real-time footprint tracks in snow with progressive decay
 * - Depth-sorted drawing of HD characters, guards, thieves, and animals
 * - Atmospheric night lighting with sweeping guard lantern cones & warm radial light glows
 * - Crisp HUD clock and speed controls
 */

class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = true; // High quality rendering
    this.showEventLog = false;
  }

  toggleEventLog() {
    this.showEventLog = !this.showEventLog;
  }

  render(villagers, guards, thieves, particles) {
    const ctx = this.ctx;
    const w = CONFIG.display.baseWidth;  // 1920
    const h = CONFIG.display.baseHeight; // 1080

    ctx.clearRect(0, 0, w, h);

    // 1. Native 1920x1080 Background with Day/Dusk/Night/Morning crossfade
    this.drawBackgrounds(ctx, w, h);

    // 2. Dynamic snow footprint trails
    this.drawFootprints(ctx);

    // 3. Animals
    this.drawAnimals(ctx);

    // 4. Depth-sorted Entities (Y-sorting: characters lower on screen drawn in front)
    const entities = [...villagers, ...guards, ...thieves];
    entities.sort((a, b) => a.y - b.y);

    for (const entity of entities) {
      entity.draw(ctx);
    }

    // 5. Atmospheric Night Lighting & Lantern Cones
    if (timeManager.isNight() || timeManager.getPhase() === "Dusk") {
      this.drawNightLighting(ctx, w, h, guards);
    }

    // 6. Environmental particles (falling snow, chimney smoke, anvil sparks)
    eventManager.drawParticles(ctx);

    // 7. HUD: Clock and Speed UI
    this.drawUI(ctx, w, h);
  }

  drawBackgrounds(ctx, w, h) {
    const weights = timeManager.getLightingWeights();

    // Solid base day
    const bgDay = assets.getImage("bg_day");
    if (bgDay) ctx.drawImage(bgDay, 0, 0, w, h);

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

  drawFootprints(ctx) {
    ctx.save();
    for (const fp of world.footprints) {
      ctx.fillStyle = `rgba(150, 165, 195, ${fp.alpha})`;
      ctx.beginPath();
      ctx.ellipse(Math.round(fp.x), Math.round(fp.y), 5.5, 3.2, fp.angle, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawAnimals(ctx) {
    const cat = assets.getImage("cat_winter");
    const chicken = assets.getImage("chicken_winter");
    const sheep = assets.getImage("sheep_winter");

    // Static animals at key cozy spots in 1920x1080 coordinates
    if (cat) ctx.drawImage(cat, 740, 650, 70, 58); // Tabby cat warming by campfire log
    if (chicken) ctx.drawImage(chicken, 420, 740, 52, 52); // Chicken pecking snow near forge
    if (sheep) ctx.drawImage(sheep, 1140, 520, 90, 78); // Fluffy sheep grazing near east trail
  }

  drawNightLighting(ctx, w, h, guards) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    // Central Campfire Warm Glow
    this.drawRadialGlow(ctx, 890, 610, CONFIG.lighting.campfireGlowRadius, "rgba(255, 160, 45, 0.50)");

    // Blacksmith Forge Hearth Glow
    this.drawRadialGlow(ctx, 410, 880, CONFIG.lighting.forgeGlowRadius, "rgba(255, 135, 30, 0.45)");

    // Cottages glowing shoji windows (warm amber)
    this.drawRadialGlow(ctx, 442, 420, CONFIG.lighting.windowGlowRadius, "rgba(255, 215, 80, 0.40)");
    this.drawRadialGlow(ctx, 926, 360, CONFIG.lighting.windowGlowRadius, "rgba(255, 215, 80, 0.40)");
    this.drawRadialGlow(ctx, 1350, 440, CONFIG.lighting.windowGlowRadius, "rgba(255, 215, 80, 0.40)");

    // Market Stall Lantern
    this.drawRadialGlow(ctx, 1120, 850, CONFIG.lighting.lanternGlowRadius, "rgba(255, 195, 60, 0.40)");

    // Guards' Lantern Light Cones and Surrounding Glow
    for (const g of guards) {
      if (g.state !== "inactive") {
        const lx = g.x + (g.facingRight ? 18 : -18);
        const ly = g.y - 65;

        // Radial lantern glow
        this.drawRadialGlow(ctx, lx, ly, CONFIG.lighting.lanternGlowRadius, "rgba(255, 210, 70, 0.45)");

        // Directional Light Cone
        this.drawGuardLightCone(ctx, lx, ly, g.facingRight ? 0 : Math.PI);
      }
    }

    ctx.restore();
  }

  drawGuardLightCone(ctx, x, y, directionAngle) {
    const coneLen = CONFIG.lighting.guardLightConeLength; // 260
    const halfAngle = (CONFIG.lighting.guardLightConeAngle * Math.PI) / 180 / 2;

    const startAngle = directionAngle - halfAngle;
    const endAngle = directionAngle + halfAngle;

    const grad = ctx.createRadialGradient(x, y, 10, x, y, coneLen);
    grad.addColorStop(0, "rgba(255, 225, 120, 0.45)");
    grad.addColorStop(0.7, "rgba(255, 200, 70, 0.22)");
    grad.addColorStop(1, "rgba(255, 180, 40, 0)");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, coneLen, startAngle, endAngle);
    ctx.closePath();
    ctx.fill();
  }

  drawRadialGlow(ctx, x, y, radius, colorRgba) {
    const grad = ctx.createRadialGradient(x, y, 8, x, y, radius);
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
    ctx.fillStyle = "rgba(18, 22, 34, 0.90)";
    ctx.strokeStyle = "#484452";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(24, 24, 220, 46, 6);
    ctx.fill();
    ctx.stroke();

    ctx.font = "bold 18px monospace";
    ctx.fillStyle = "#F6ECD8";
    const phase = timeManager.getPhase();
    const timeStr = timeManager.getFormattedTime();
    ctx.fillText(`🕒 ${timeStr} (${phase})`, 38, 54);

    // Speed indicator buttons in top-right
    const speeds = [0, 1, 2, 4];
    const labels = ["⏸", "1x", "2x", "4x"];
    const btnW = 44;
    const btnH = 36;
    const startX = w - 210;

    for (let i = 0; i < speeds.length; i++) {
      const bx = startX + i * 48;
      const by = 24;
      const isSelected = timeManager.speed === speeds[i];

      ctx.fillStyle = isSelected ? "#E89B38" : "rgba(18, 22, 34, 0.90)";
      ctx.beginPath();
      ctx.roundRect(bx, by, btnW, btnH, 5);
      ctx.fill();

      ctx.strokeStyle = isSelected ? "#FFF" : "#484452";
      ctx.stroke();

      ctx.fillStyle = isSelected ? "#201812" : "#E8D8C0";
      ctx.font = "bold 15px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(labels[i], bx + btnW / 2, by + btnH / 2);
    }

    // Event Log (toggle with 'L')
    if (this.showEventLog) {
      const logW = 460;
      const logH = 200;
      const lx = 24;
      const ly = h - logH - 24;

      ctx.fillStyle = "rgba(14, 18, 28, 0.94)";
      ctx.strokeStyle = "#423c4a";
      ctx.beginPath();
      ctx.roundRect(lx, ly, logW, logH, 6);
      ctx.fill();
      ctx.stroke();

      ctx.font = "bold 14px monospace";
      ctx.fillStyle = "#F0E8D8";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("📜 VILLAGE EVENT LOG (Press 'L' to toggle)", lx + 14, ly + 14);

      ctx.font = "13px monospace";
      for (let i = 0; i < Math.min(8, world.events.length); i++) {
        ctx.fillStyle = world.events[i].includes("robbed") || world.events[i].includes("caught") 
          ? "#FFA868" 
          : "#CCD2DE";
        ctx.fillText(world.events[i], lx + 14, ly + 40 + i * 19);
      }
    }

    ctx.restore();
  }
}

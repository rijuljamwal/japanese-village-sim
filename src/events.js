/**
 * src/events.js
 * Event orchestration and atmospheric particles:
 * - Night thief spawns between 21:00 and 02:30
 * - Regular village shrine festival with fireworks and dancing
 * - Particle systems: falling snowflakes, chimney smoke plumes, campfire embers
 */

class EventManager {
  constructor() {
    this.thieves = [];
    this.particles = [];
    this.thiefIdCounter = 1;
    this.lastSpawnHour = -1;
    this.snowflakes = [];
    
    // Initialize ambient snowflakes
    for (let i = 0; i < 45; i++) {
      this.snowflakes.push({
        x: Math.random() * 480,
        y: Math.random() * 270,
        speedY: 10 + Math.random() * 20,
        speedX: -5 + Math.random() * 10,
        size: Math.random() > 0.6 ? 2 : 1
      });
    }
  }

  update(dt, currentHour, isNight, guards) {
    // 1. Particle systems update
    for (const flake of this.snowflakes) {
      flake.y += flake.speedY * dt;
      flake.x += flake.speedX * dt;
      if (flake.y > 270) {
        flake.y = -5;
        flake.x = Math.random() * 480;
      }
      if (flake.x > 485) flake.x = -5;
      if (flake.x < -5) flake.x = 485;
    }

    // Chimney smoke particles from cottage chimneys
    if (Math.random() < 0.25) {
      const chimneys = [
        { x: 124, y: 72 },
        { x: 268, y: 56 },
        { x: 372, y: 82 },
        { x: 64, y: 168 } // forge chimney
      ];
      const c = chimneys[Math.floor(Math.random() * chimneys.length)];
      this.particles.push({
        type: "smoke",
        x: c.x,
        y: c.y,
        vx: 2 + Math.random() * 4,
        vy: -12 - Math.random() * 8,
        radius: 2 + Math.random() * 2,
        alpha: 0.65,
        life: 2.5
      });
    }

    // Update active particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.alpha = Math.max(0, p.life / 2.5);
      p.radius += dt * 1.5;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // 2. Thief spawn check at night (between 21:00 and 02:30)
    const isSpawnWindow = (currentHour >= 21.0 || currentHour < 2.5);
    if (isNight && isSpawnWindow) {
      const activeCount = this.thieves.filter((t) => t.active).length;
      if (activeCount < CONFIG.thieves.maxActive) {
        // Random spawn chance every simulated 30 minutes
        if (Math.floor(currentHour * 2) !== this.lastSpawnHour && Math.random() < 0.55) {
          this.lastSpawnHour = Math.floor(currentHour * 2);
          this.spawnThief();
        }
      }
    }

    // Update active thieves
    for (const thief of this.thieves) {
      thief.update(dt, guards);
    }
  }

  spawnThief() {
    const side = Math.random() > 0.5 ? "left" : "right";
    const targetHouseId = 1 + Math.floor(Math.random() * CONFIG.world.houses.length);
    const thief = new Thief(this.thiefIdCounter++, side, targetHouseId);
    this.thieves.push(thief);
    world.logEvent(`A shadowy thief appeared from the ${side} village outskirts!`);
  }

  drawParticles(ctx) {
    ctx.save();
    // Draw falling snow
    ctx.fillStyle = "rgba(245, 248, 255, 0.85)";
    for (const flake of this.snowflakes) {
      ctx.fillRect(Math.round(flake.x), Math.round(flake.y), flake.size, flake.size);
    }

    // Draw chimney smoke puffs
    for (const p of this.particles) {
      if (p.type === "smoke") {
        ctx.fillStyle = `rgba(220, 225, 235, ${p.alpha * 0.45})`;
        ctx.beginPath();
        ctx.arc(Math.round(p.x), Math.round(p.y), p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

// Global instance
const eventManager = new EventManager();

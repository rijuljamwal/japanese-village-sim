/**
 * src/events.js
 * Weather particles (snowflakes, chimney smoke, forge sparks)
 * and dynamic thief spawning logic for 1920x1080 resolution.
 */

class EventManager {
  constructor() {
    this.thieves = [];
    this.particles = []; // snowflakes, chimney smoke, anvil sparks
    this.thiefIdCounter = 1;
    this.thiefSpawnTimer = 0;
    this.smokeTimer = 0;

    // Initialize 120 falling snowflakes across 1920x1080 canvas
    for (let i = 0; i < 140; i++) {
      this.particles.push({
        type: "snow",
        x: Math.random() * CONFIG.display.baseWidth,
        y: Math.random() * CONFIG.display.baseHeight,
        vx: -15 + Math.random() * 30,
        vy: 25 + Math.random() * 45,
        radius: 1.5 + Math.random() * 2.5,
        alpha: 0.4 + Math.random() * 0.6
      });
    }
  }

  addSparks(x, y) {
    for (let i = 0; i < 12; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.4;
      const speed = 40 + Math.random() * 80;
      this.particles.push({
        type: "spark",
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 1.5 + Math.random() * 1.5,
        alpha: 1.0,
        life: 0.4 + Math.random() * 0.4
      });
    }
  }

  update(dt, currentHour, isNight, guards) {
    // 1. Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      if (p.type === "snow") {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.y > CONFIG.display.baseHeight) {
          p.y = -10;
          p.x = Math.random() * CONFIG.display.baseWidth;
        }
        if (p.x < 0) p.x = CONFIG.display.baseWidth;
        if (p.x > CONFIG.display.baseWidth) p.x = 0;
      } else if (p.type === "smoke") {
        p.y += p.vy * dt;
        p.x += p.vx * dt;
        p.radius += dt * 4.0;
        p.life -= dt;
        p.alpha = Math.max(0, p.life / p.maxLife) * 0.45;
        if (p.life <= 0) this.particles.splice(i, 1);
      } else if (p.type === "spark") {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 120 * dt; // gravity
        p.life -= dt;
        p.alpha = Math.max(0, p.life / 0.8);
        if (p.life <= 0) this.particles.splice(i, 1);
      }
    }

    // 2. Emit chimney smoke puffs from the 3 cottage chimneys (1920x1080 coords)
    this.smokeTimer += dt;
    if (this.smokeTimer >= 0.45) {
      this.smokeTimer = 0;
      const chimneys = [
        { x: 380, y: 155 }, // West cottage chimney
        { x: 910, y: 115 }, // North manor chimney
        { x: 1395, y: 195 } // East cottage chimney
      ];
      for (const ch of chimneys) {
        this.particles.push({
          type: "smoke",
          x: ch.x + (Math.random() - 0.5) * 6,
          y: ch.y,
          vx: 8 + Math.random() * 15, // wind blowing right
          vy: -20 - Math.random() * 15,
          radius: 4.0,
          alpha: 0.45,
          life: 3.5,
          maxLife: 3.5
        });
      }
    }

    // 3. Thief spawning during Night
    if (isNight) {
      this.thiefSpawnTimer += dt;
      // Check spawn every 45 seconds of game time
      if (this.thiefSpawnTimer >= 45.0) {
        this.thiefSpawnTimer = 0;
        if (Math.random() < CONFIG.thieves.spawnChancePerHour && this.thieves.filter(t => t.state !== "escaped" && t.state !== "captured").length < 2) {
          this.spawnThief();
        }
      }
    } else {
      this.thiefSpawnTimer = 0;
      // Clean up finished thieves during day
      this.thieves = this.thieves.filter(t => t.state !== "escaped" && t.state !== "captured");
    }

    // Update active thieves
    for (const t of this.thieves) {
      t.update(dt, currentHour, isNight, guards);
    }
  }

  spawnThief() {
    const unrobbedHouses = world.houses.filter(h => !h.robbed);
    if (unrobbedHouses.length === 0) return;

    const targetHouse = unrobbedHouses[Math.floor(Math.random() * unrobbedHouses.length)];

    // Spawn from perimeter: outer woods or bridge east
    const spawnPoints = [
      { x: 1850, y: 600 }, // Bridge East
      { x: 100, y: 350 },  // Far west forest edge
      { x: 900, y: 1020 }  // Far south crossroads entrance
    ];
    const sp = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];

    const thief = new Thief(this.thiefIdCounter++, sp.x, sp.y, targetHouse.id);
    this.thieves.push(thief);
    world.logEvent(`A shadowy figure (Thief #${thief.id}) entered the village, targeting ${targetHouse.name}!`);
  }

  drawParticles(ctx) {
    ctx.save();
    for (const p of this.particles) {
      if (p.type === "snow") {
        ctx.fillStyle = `rgba(240, 246, 255, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === "smoke") {
        ctx.fillStyle = `rgba(210, 218, 230, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === "spark") {
        ctx.fillStyle = `rgba(255, 180, 50, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

const eventManager = new EventManager();

/**
 * src/thief.js
 * Thief agent state machine:
 * - States: sneak, hide, approach_house, rob, loot, flee, chase, escape, captured
 * - Sneaks in after 21:00 from village edge
 * - Burglarizes target house (door opens, light spills out, 4-8s inside, exits with sack)
 * - Chase dynamics: speed bursts, shortcuts over fences, stumble risk, stamina drain
 * - Escape at border with smoke puff OR capture & escort to cage
 */

class Thief {
  constructor(id, spawnSide, targetHouseId) {
    this.id = id;
    this.spawnSide = spawnSide; // "left", "right"
    this.targetHouseId = targetHouseId;
    
    this.x = spawnSide === "left" ? -10 : 490;
    this.y = CONFIG.world.groundLineY;
    this.facingRight = spawnSide === "left";
    
    this.state = "sneak"; // "sneak", "hide", "rob", "flee_unspotted", "chase", "escape", "captured"
    this.stamina = CONFIG.thieves.stamina;
    this.robTimer = CONFIG.thieves.robberyDurationSec;
    this.hasLoot = false;
    this.active = true;
    this.escaped = false;
    this.captured = false;
    
    this.escapeTargetX = spawnSide === "left" ? -20 : 500;
    this.animTimer = 0;
    this.currentFrame = 0;
    this.speedBurstTimer = 0;
  }

  update(dt, guards) {
    if (!this.active) return;
    this.animTimer += dt;
    if (this.speedBurstTimer > 0) this.speedBurstTimer -= dt;

    if (this.state === "sneak") {
      const targetHouse = world.getHouse(this.targetHouseId);
      if (!targetHouse) return;
      
      const dx = targetHouse.doorX - this.x;
      this.facingRight = dx >= 0;
      const step = CONFIG.thieves.sneakSpeed * dt;

      // Check if guard is extremely close -> hide briefly
      for (const guard of guards) {
        if (Math.abs(guard.x - this.x) < 40 && guard.state === "patrol") {
          this.state = "hide";
          this.hideTimer = 2.5;
          return;
        }
      }

      if (Math.abs(dx) <= step) {
        this.x = targetHouse.doorX;
        this.state = "rob";
        this.robTimer = CONFIG.thieves.robberyDurationSec;
        targetHouse.doorState = "open_light";
        world.logEvent(`Thief #${this.id} broke into ${targetHouse.name}...`);
      } else {
        this.x += Math.sign(dx) * step;
      }
    } else if (this.state === "hide") {
      this.hideTimer -= dt;
      if (this.hideTimer <= 0) {
        this.state = "sneak";
      }
    } else if (this.state === "rob") {
      this.robTimer -= dt;
      if (this.robTimer <= 0) {
        this.hasLoot = true;
        this.state = "flee_unspotted";
        world.markRobbed(this.targetHouseId);
      }
    } else if (this.state === "flee_unspotted") {
      const dx = this.escapeTargetX - this.x;
      this.facingRight = dx >= 0;
      this.x += Math.sign(dx) * CONFIG.thieves.sneakSpeed * dt;

      if (Math.abs(this.x - this.escapeTargetX) < 15) {
        this.state = "escape";
        this.active = false;
        this.escaped = true;
        world.logEvent(`Thief #${this.id} escaped quietly into the night mist with stolen loot.`);
      }
    } else if (this.state === "chase") {
      this.stamina = Math.max(0, this.stamina - CONFIG.thieves.staminaDrainRate * dt);
      
      // Calculate speed with bursts and stumble chances
      let currentSpeed = CONFIG.thieves.runSpeed * (0.7 + 0.3 * (this.stamina / 100));
      if (Math.random() < (CONFIG.thieves.speedBurstChance * dt)) {
        this.speedBurstTimer = 1.0;
      }
      if (this.speedBurstTimer > 0) currentSpeed += CONFIG.thieves.speedBurstAmount;

      const dx = this.escapeTargetX - this.x;
      this.facingRight = dx >= 0;
      this.x += Math.sign(dx) * currentSpeed * dt;

      // Reached boundary -> escape
      if (this.x <= -15 || this.x >= 495) {
        this.state = "escape";
        this.active = false;
        this.escaped = true;
        world.logEvent(`Thief #${this.id} dashed off the village edge and escaped!`);
      }
    }

    // Animation frame tick
    const frameRate = (this.state === "chase") ? 0.10 : 0.18;
    if (this.animTimer >= frameRate) {
      this.animTimer = 0;
      this.currentFrame++;
    }
  }

  triggerChase() {
    if (this.state !== "chase" && this.state !== "captured") {
      this.state = "chase";
      // Pick nearest escape boundary
      this.escapeTargetX = this.x < 240 ? -20 : 500;
    }
  }

  triggerCaptured(guard) {
    this.state = "captured";
    this.active = false;
    this.captured = true;
    this.hasLoot = false; // loot dropped
    world.logEvent(`Thief #${this.id} was apprehended! Stolen goods recovered.`);
  }

  draw(ctx) {
    if (!this.active && this.state !== "captured") return;

    // During rob state, thief is inside house (hidden)
    if (this.state === "rob") return;

    const px = Math.round(this.x);
    const py = Math.round(this.y);

    let sheetKey = "thief_sneak";
    if (this.state === "chase") sheetKey = "thief_run";
    else if (this.state === "hide") sheetKey = "thief_hide";
    else if (this.state === "captured") sheetKey = "thief_captured";

    const frame = assets.getFrame(sheetKey, this.currentFrame);
    if (!frame) return;

    ctx.save();
    // Thieves are drawn slightly darker in shadow unless chased or lit
    if (this.state !== "chase" && this.state !== "captured") {
      ctx.filter = "brightness(0.65)";
    }

    if (!this.facingRight) {
      ctx.translate(px, py - 48);
      ctx.scale(-1, 1);
      ctx.drawImage(frame, -16, 0);
    } else {
      ctx.translate(px, py - 48);
      ctx.drawImage(frame, -16, 0);
    }
    ctx.restore();
  }
}

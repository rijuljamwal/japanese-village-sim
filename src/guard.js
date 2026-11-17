/**
 * src/guard.js
 * Night guard agent behaviors and patrol state machine:
 * - States: stand_watch, patrol, alert, shout, chase, catch, escort, frustrated, return_to_post
 * - Emerges from guardhouse at dusk (19:00), patrols waypoints with lantern light cone
 * - Spotting checks: inside lantern cone or proximity
 * - Pursues thief, loses stamina; escorts captured thief to cage
 */

class Guard {
  constructor(id, name, waypoints, startX, startY) {
    this.id = id;
    this.name = name;
    this.waypoints = waypoints;
    this.currentWaypointIdx = 0;
    
    this.x = startX;
    this.y = startY;
    this.targetX = startX;
    this.facingRight = true;
    
    this.state = "inactive"; // "inactive", "patrol", "stand_watch", "alert", "shout", "chase", "catch", "escort", "frustrated"
    this.stamina = CONFIG.guards.stamina;
    this.stateTimer = 0;
    this.animTimer = 0;
    this.currentFrame = 0;
    
    this.chasingTarget = null; // Reference to thief object
    this.escortingTarget = null;
    this.alertBubble = null;
  }

  update(dt, currentHour, isNight, activeThieves) {
    this.animTimer += dt;
    if (this.alertBubble) {
      this.alertBubble.timer -= dt;
      if (this.alertBubble.timer <= 0) this.alertBubble = null;
    }

    // Active hours: 19:00 - 05:00
    if (!isNight) {
      if (this.state !== "inactive") {
        this.state = "inactive";
        this.x = CONFIG.world.guardhousePos.x;
        this.y = CONFIG.world.groundLineY;
      }
      return;
    } else {
      if (this.state === "inactive") {
        this.state = "patrol";
        this.x = CONFIG.world.guardhousePos.x;
        this.targetX = this.waypoints[this.currentWaypointIdx];
        this.stamina = CONFIG.guards.stamina;
      }
    }

    // State machine
    if (this.state === "stand_watch") {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        this.state = "patrol";
        this.currentWaypointIdx = (this.currentWaypointIdx + 1) % this.waypoints.length;
        this.targetX = this.waypoints[this.currentWaypointIdx];
      }
    } else if (this.state === "patrol") {
      const dx = this.targetX - this.x;
      this.facingRight = dx >= 0;
      const step = CONFIG.guards.patrolSpeed * dt;
      
      if (Math.abs(dx) <= step) {
        this.x = this.targetX;
        this.state = "stand_watch";
        this.stateTimer = 3.0 + Math.random() * 4.0;
      } else {
        this.x += Math.sign(dx) * step;
      }

      // Detection check against active thieves
      for (const thief of activeThieves) {
        if (thief.active && thief.state !== "captured" && thief.state !== "escaped") {
          const dist = Math.abs(thief.x - this.x);
          const inCone = (this.facingRight ? (thief.x > this.x) : (thief.x < this.x)) && (dist <= CONFIG.guards.detectionDistance);
          const inProximity = dist <= CONFIG.guards.proximityDetectionDist;

          if (inProximity || (inCone && Math.random() < (CONFIG.guards.detectionChancePerSec * dt))) {
            this.triggerAlert(thief);
            break;
          }
        }
      }
    } else if (this.state === "alert") {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        this.state = "chase";
      }
    } else if (this.state === "chase") {
      if (!this.chasingTarget || !this.chasingTarget.active || this.chasingTarget.escaped) {
        this.state = "frustrated";
        this.stateTimer = 3.5;
        this.chasingTarget = null;
        return;
      }

      // Stamina drain
      this.stamina = Math.max(0, this.stamina - CONFIG.guards.staminaDrainRate * dt);
      const speedFactor = 0.65 + 0.35 * (this.stamina / 100);
      const chaseSpeed = CONFIG.guards.chaseSpeed * speedFactor;

      const dx = this.chasingTarget.x - this.x;
      this.facingRight = dx >= 0;
      this.x += Math.sign(dx) * chaseSpeed * dt;

      // Catch check
      if (Math.abs(this.x - this.chasingTarget.x) <= CONFIG.guards.catchDistance) {
        this.state = "catch";
        this.stateTimer = 1.2;
        this.chasingTarget.triggerCaptured(this);
        world.logEvent(`${this.name} tackled and caught Thief #${this.chasingTarget.id}!`);
      } else if (this.stamina <= 5) {
        // Guard drops out exhausted
        this.state = "frustrated";
        this.stateTimer = 4.0;
        this.chasingTarget = null;
      }
    } else if (this.state === "catch") {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0 && this.chasingTarget) {
        this.state = "escort";
        this.escortingTarget = this.chasingTarget;
        this.targetX = CONFIG.world.guardhousePos.x;
      }
    } else if (this.state === "escort") {
      const dx = this.targetX - this.x;
      this.facingRight = dx >= 0;
      const step = CONFIG.guards.escortSpeed * dt;
      
      if (Math.abs(dx) <= step) {
        this.x = this.targetX;
        if (this.escortingTarget) {
          world.jailThief(this.escortingTarget);
          this.escortingTarget = null;
        }
        this.state = "stand_watch";
        this.stateTimer = 4.0;
      } else {
        this.x += Math.sign(dx) * step;
        if (this.escortingTarget) {
          this.escortingTarget.x = this.x - (this.facingRight ? 16 : -16);
        }
      }
    } else if (this.state === "frustrated") {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        this.state = "patrol";
        this.stamina = CONFIG.guards.stamina;
      }
    }

    // Animation frame tick
    const frameRate = (this.state === "chase" || this.state === "patrol") ? 0.12 : 0.22;
    if (this.animTimer >= frameRate) {
      this.animTimer = 0;
      this.currentFrame++;
    }
  }

  triggerAlert(thief) {
    this.state = "alert";
    this.stateTimer = 0.8; // pause with exclamation mark
    this.chasingTarget = thief;
    this.alertBubble = { icon: "❗", timer: 1.5 };
    world.logEvent(`${this.name} spotted a thief near x=${Math.round(this.x)}!`);
    thief.triggerChase();
  }

  draw(ctx) {
    if (this.state === "inactive") return;

    const px = Math.round(this.x);
    const py = Math.round(this.y);

    let sheetKey = "guard_patrol";
    if (this.state === "chase") sheetKey = "guard_run";
    else if (this.state === "stand_watch") sheetKey = "guard_idle";
    else if (this.state === "alert") sheetKey = "guard_alert";
    else if (this.state === "catch") sheetKey = "guard_catch";
    else if (this.state === "escort") sheetKey = "guard_escort";
    else if (this.state === "frustrated") sheetKey = "guard_frustrated";

    const frame = assets.getFrame(sheetKey, this.currentFrame);
    if (!frame) return;

    // Draw lantern light cone ahead of guard
    this.drawLightCone(ctx, px, py - 20);

    ctx.save();
    if (!this.facingRight) {
      ctx.translate(px, py - 48);
      ctx.scale(-1, 1);
      ctx.drawImage(frame, -16, 0);
    } else {
      ctx.translate(px, py - 48);
      ctx.drawImage(frame, -16, 0);
    }
    ctx.restore();

    // Alert bubble
    if (this.alertBubble) {
      ctx.save();
      ctx.font = "bold 14px sans-serif";
      ctx.fillStyle = "#FF2222";
      ctx.textAlign = "center";
      ctx.fillText(this.alertBubble.icon, px, py - 52);
      ctx.restore();
    }
  }

  drawLightCone(ctx, x, y) {
    ctx.save();
    const coneLen = CONFIG.lighting.guardLightConeLength;
    const dir = this.facingRight ? 1 : -1;
    
    const grad = ctx.createRadialGradient(x, y, 4, x + dir * coneLen * 0.7, y, coneLen);
    grad.addColorStop(0, "rgba(255, 230, 140, 0.40)");
    grad.addColorStop(0.6, "rgba(255, 210, 80, 0.15)");
    grad.addColorStop(1, "rgba(255, 200, 50, 0)");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + dir * coneLen, y - 24);
    ctx.lineTo(x + dir * coneLen, y + 24);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

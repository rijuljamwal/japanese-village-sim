/**
 * src/thief.js
 * Thief agent with Full HD (80x140) rendering, stealth navigation,
 * house break-ins, pursuit evasion physics, and border escape dynamics.
 */

class Thief {
  constructor(id, startX, startY, targetHouseId) {
    this.id = id;
    this.x = startX;
    this.y = startY;
    this.vx = 0;
    this.vy = 0;
    this.radius = 26;
    this.facingRight = true;

    this.targetHouseId = targetHouseId;
    this.hasLoot = false;
    this.state = "sneak"; // "sneak", "hide", "rob", "run", "captured", "escaped"
    this.stateTimer = 0;
    this.animTimer = 0;
    this.currentFrame = 0;
    this.footstepTimer = 0;

    this.path = [];
    this.speechBubble = null;
    this.speed = CONFIG.thieves.sneakSpeed;

    // Route to target house
    const startNode = world.getNearestNavNode(this.x, this.y);
    const doorNode = this.targetHouseId === 1 ? "west_door" : (this.targetHouseId === 2 ? "north_door" : "east_door");
    this.path = world.findPath(startNode, doorNode);
  }

  update(dt, currentHour, isNight, guards) {
    this.animTimer += dt;
    this.footstepTimer += dt;

    if (this.speechBubble) {
      this.speechBubble.timer -= dt;
      if (this.speechBubble.timer <= 0) this.speechBubble = null;
    }

    if (this.state === "escaped" || this.state === "captured") {
      this.vx = 0;
      this.vy = 0;
      return;
    }

    // State machine
    if (this.state === "rob") {
      this.vx = 0;
      this.vy = 0;
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        this.hasLoot = true;
        world.markRobbed(this.targetHouseId);
        this.speechBubble = { text: "Got the loot! Time to vanish...", timer: 2.5 };
        this.state = "run";
        // Escape towards wooden bridge or forest edge
        this.path = world.findPath(world.getNearestNavNode(this.x, this.y), "bridge_east");
      }
    } else if (this.state === "hide") {
      this.vx = 0;
      this.vy = 0;
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        this.state = "sneak";
      }
    } else if (this.state === "sneak" || this.state === "run") {
      const moveSpeed = this.state === "run" ? CONFIG.thieves.sprintSpeed : CONFIG.thieves.sneakSpeed;

      if (this.path.length > 0) {
        const nextNode = world.navNodes.get(this.path[0]);
        if (nextNode) {
          const dx = nextNode.x - this.x;
          const dy = nextNode.y - this.y;
          const dist = Math.hypot(dx, dy);

          if (dist < 18) {
            this.path.shift();
          } else {
            this.facingRight = dx >= 0;
            this.vx = (dx / dist) * moveSpeed;
            this.vy = (dy / dist) * moveSpeed;

            this.x += this.vx * dt;
            this.y += this.vy * dt;

            if (this.footstepTimer >= 0.32) {
              this.footstepTimer = 0;
              world.addFootprint(this.x, this.y, Math.atan2(dy, dx));
            }
          }
        }
      } else {
        // Reached end of path
        if (this.state === "sneak" && !this.hasLoot) {
          // Arrived at target door -> begin break-in
          this.state = "rob";
          this.stateTimer = CONFIG.thieves.robDurationSec;
          this.speechBubble = { text: "Picking the lock...", timer: 2.5 };
        } else if (this.hasLoot || this.state === "run") {
          // Reached perimeter -> escaped!
          this.state = "escaped";
          world.logEvent(`Thief #${this.id} successfully escaped across the frozen bridge with stolen goods!`);
        }
      }

      // Check if thief reached map boundary during sprint
      if (this.state === "run" && (this.x >= 1850 || this.x <= 40 || this.y >= 1040 || this.y <= 180)) {
        this.state = "escaped";
        world.logEvent(`Thief #${this.id} disappeared into the night shadows!`);
      }
    }

    // Solid obstacle collisions (cannot run through cottages or fences)
    world.resolveObstacleCollision(this, this.radius);

    // Frame timing
    const frameRate = this.state === "run" ? 0.10 : 0.18;
    if (this.animTimer >= frameRate) {
      this.animTimer = 0;
      this.currentFrame++;
    }
  }

  onSpottedByGuard(guard) {
    if (this.state === "captured" || this.state === "escaped") return;
    this.state = "run";
    this.speechBubble = { text: "Blast, the guard! RUN!", timer: 2.0 };
    // Sprint away from guard towards bridge
    this.path = world.findPath(world.getNearestNavNode(this.x, this.y), "bridge_east");
  }

  onCaught() {
    this.state = "captured";
    this.speechBubble = { text: "Ack! Let go of me!", timer: 3.0 };
  }

  draw(ctx) {
    if (this.state === "escaped") return;

    const px = Math.round(this.x);
    const py = Math.round(this.y);

    let sheetKey = "thief_sneak";
    if (this.state === "run") sheetKey = "thief_run";
    else if (this.state === "rob") sheetKey = "thief_rob";
    else if (this.state === "hide") sheetKey = "thief_hide";
    else if (this.state === "captured") sheetKey = "thief_captured";

    const frame = assets.getFrame(sheetKey, this.currentFrame);
    if (!frame) return;

    const w = CONFIG.thieves.spriteWidth;  // 80
    const h = CONFIG.thieves.spriteHeight; // 140

    ctx.save();
    if (!this.facingRight) {
      ctx.translate(px, py - h);
      ctx.scale(-1, 1);
      ctx.drawImage(frame, -w / 2, 0);
    } else {
      ctx.translate(px, py - h);
      ctx.drawImage(frame, -w / 2, 0);
    }
    ctx.restore();

    if (this.speechBubble) {
      this.drawSpeechBubble(ctx, px, py - h - 12, this.speechBubble.text);
    }
  }

  drawSpeechBubble(ctx, x, y, text) {
    ctx.save();
    ctx.font = "bold 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    const textW = ctx.measureText(text).width;
    const boxW = textW + 18;
    const boxH = 26;

    ctx.fillStyle = "rgba(18, 14, 28, 0.96)";
    ctx.strokeStyle = "#b03030";
    ctx.lineWidth = 1.8;

    const bx = x - boxW / 2;
    const by = y - boxH;
    ctx.beginPath();
    ctx.roundRect(bx, by, boxW, boxH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#ffb0b0";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, by + boxH / 2);
    ctx.restore();
  }
}

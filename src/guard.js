/**
 * src/guard.js
 * Night Guard agent with Full HD (80x140) rendering,
 * lantern vision cone, patrol routing, pursuit physics, physical tackle & escort.
 */

class Guard {
  constructor(id, name, patrolRouteNodes, startX, startY) {
    this.id = id;
    this.name = name;
    this.patrolRouteNodes = patrolRouteNodes;
    this.patrolIndex = 0;
    
    this.x = startX;
    this.y = startY;
    this.vx = 0;
    this.vy = 0;
    this.radius = 28;
    this.facingRight = true;
    
    this.state = "inactive"; // "inactive", "patrol", "alert", "chase", "catch", "escort", "frustrated"
    this.stateTimer = 0;
    this.animTimer = 0;
    this.currentFrame = 0;
    this.footstepTimer = 0;
    
    this.path = [];
    this.targetThief = null;
    this.speechBubble = null;
    this.lightConeAngle = 0; // Direction of lantern cone
    this.speed = CONFIG.guards.patrolSpeed;
  }

  update(dt, currentHour, isNight, allThieves) {
    this.animTimer += dt;
    this.footstepTimer += dt;

    if (this.speechBubble) {
      this.speechBubble.timer -= dt;
      if (this.speechBubble.timer <= 0) this.speechBubble = null;
    }

    // Guard schedule: Active strictly during night (19:00 - 05:00)
    if (!isNight) {
      this.state = "inactive";
      this.targetThief = null;
      return;
    }

    if (this.state === "inactive") {
      this.state = "patrol";
      this.patrolIndex = 0;
      this.assignNextPatrolNode();
    }

    // Check vision cone against active thieves
    if (this.state === "patrol" || this.state === "alert") {
      for (const thief of allThieves) {
        if (thief.state === "escaped" || thief.state === "captured") continue;
        if (this.canSeeThief(thief)) {
          this.triggerAlert(thief);
          break;
        }
      }
    }

    // State machine
    if (this.state === "alert") {
      this.vx = 0;
      this.vy = 0;
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        this.state = "chase";
        this.speechBubble = { text: "HALT! IN THE NAME OF THE VILLAGE!", timer: 3.0 };
      }
    } else if (this.state === "chase") {
      if (!this.targetThief || this.targetThief.state === "escaped") {
        this.state = "frustrated";
        this.stateTimer = 3.0;
        this.speechBubble = { text: "Curse it! The thief slipped away!", timer: 3.0 };
        this.targetThief = null;
      } else {
        const dx = this.targetThief.x - this.x;
        const dy = this.targetThief.y - this.y;
        const dist = Math.hypot(dx, dy);

        this.facingRight = dx >= 0;
        this.lightConeAngle = Math.atan2(dy, dx);

        if (dist <= CONFIG.guards.catchDistance) {
          // Physical tackle and capture!
          this.catchThief(this.targetThief);
        } else {
          // Sprint towards thief
          const dirX = dx / dist;
          const dirY = dy / dist;
          this.vx = dirX * CONFIG.guards.runSpeed;
          this.vy = dirY * CONFIG.guards.runSpeed;

          this.x += this.vx * dt;
          this.y += this.vy * dt;

          if (this.footstepTimer >= 0.28) {
            this.footstepTimer = 0;
            world.addFootprint(this.x, this.y, Math.atan2(dy, dx));
          }
        }
      }
    } else if (this.state === "catch") {
      this.vx = 0;
      this.vy = 0;
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        this.state = "escort";
        this.speechBubble = { text: "Caught red-handed! Off to the cage!", timer: 4.0 };
        // Lead to plaza cage
        this.path = world.findPath(world.getNearestNavNode(this.x, this.y), "plaza");
      }
    } else if (this.state === "escort") {
      if (this.path.length > 0) {
        const nextNode = world.navNodes.get(this.path[0]);
        if (nextNode) {
          const dx = nextNode.x - this.x;
          const dy = nextNode.y - this.y;
          const dist = Math.hypot(dx, dy);

          if (dist < 15) {
            this.path.shift();
          } else {
            this.facingRight = dx >= 0;
            this.lightConeAngle = Math.atan2(dy, dx);
            this.vx = (dx / dist) * CONFIG.guards.patrolSpeed;
            this.vy = (dy / dist) * CONFIG.guards.patrolSpeed;

            this.x += this.vx * dt;
            this.y += this.vy * dt;

            // Thief is tethered and pulled behind guard
            if (this.targetThief) {
              const dragX = this.x - (this.facingRight ? 45 : -45);
              const dragY = this.y;
              this.targetThief.x += (dragX - this.targetThief.x) * 0.15;
              this.targetThief.y += (dragY - this.targetThief.y) * 0.15;
            }
          }
        }
      } else {
        // Reached cage -> lock thief up
        if (this.targetThief) {
          world.jailThief(this.targetThief);
          this.targetThief = null;
        }
        this.state = "patrol";
        this.assignNextPatrolNode();
      }
    } else if (this.state === "frustrated") {
      this.vx = 0;
      this.vy = 0;
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        this.state = "patrol";
        this.assignNextPatrolNode();
      }
    } else if (this.state === "patrol") {
      if (this.path.length > 0) {
        const nextNode = world.navNodes.get(this.path[0]);
        if (nextNode) {
          const dx = nextNode.x - this.x;
          const dy = nextNode.y - this.y;
          const dist = Math.hypot(dx, dy);

          if (dist < 15) {
            this.path.shift();
          } else {
            this.facingRight = dx >= 0;
            this.lightConeAngle = Math.atan2(dy, dx);
            this.vx = (dx / dist) * CONFIG.guards.patrolSpeed;
            this.vy = (dy / dist) * CONFIG.guards.patrolSpeed;

            this.x += this.vx * dt;
            this.y += this.vy * dt;

            if (this.footstepTimer >= 0.38) {
              this.footstepTimer = 0;
              world.addFootprint(this.x, this.y, Math.atan2(dy, dx));
            }
          }
        }
      } else {
        this.assignNextPatrolNode();
      }
    }

    // Solid obstacle collision resolution against houses and fences
    world.resolveObstacleCollision(this, this.radius);

    // Animation frame timing
    const frameRate = (this.state === "chase" || this.state === "patrol") ? 0.12 : 0.22;
    if (this.animTimer >= frameRate) {
      this.animTimer = 0;
      this.currentFrame++;
    }
  }

  assignNextPatrolNode() {
    this.patrolIndex = (this.patrolIndex + 1) % this.patrolRouteNodes.length;
    const targetNode = this.patrolRouteNodes[this.patrolIndex];
    const startNode = world.getNearestNavNode(this.x, this.y);
    this.path = world.findPath(startNode, targetNode);
  }

  canSeeThief(thief) {
    if (thief.state === "hide") return false;

    const dx = thief.x - this.x;
    const dy = thief.y - (this.y - 40); // Lantern height
    const dist = Math.hypot(dx, dy);

    if (dist > CONFIG.lighting.guardLightConeLength) return false;

    // Check angle relative to facing direction
    const angleToThief = Math.atan2(dy, dx);
    const facingAngle = this.facingRight ? 0 : Math.PI;
    let angleDiff = Math.abs(angleToThief - facingAngle);
    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

    const halfCone = (CONFIG.lighting.guardLightConeAngle * Math.PI) / 180 / 2;
    return angleDiff <= halfCone;
  }

  triggerAlert(thief) {
    this.state = "alert";
    this.stateTimer = 1.0;
    this.targetThief = thief;
    this.speechBubble = { text: "SHHH! WHO GOES THERE?!", timer: 2.0 };
    thief.onSpottedByGuard(this);
    world.logEvent(`${this.name} spotted a suspicious prowler near ${thief.targetHouseId ? 'Cottage #' + thief.targetHouseId : 'the plaza'}!`);
  }

  catchThief(thief) {
    this.state = "catch";
    this.stateTimer = 1.8;
    this.targetThief = thief;
    thief.onCaught();
    this.speechBubble = { text: "GOTCHA! Yield quietly!", timer: 2.5 };
    world.logEvent(`${this.name} tackled and captured Thief #${thief.id}!`);
  }

  draw(ctx) {
    if (this.state === "inactive") return;

    const px = Math.round(this.x);
    const py = Math.round(this.y);

    let sheetKey = "guard_idle";
    if (this.state === "patrol") sheetKey = "guard_patrol";
    else if (this.state === "chase") sheetKey = "guard_run";
    else if (this.state === "alert") sheetKey = "guard_alert";
    else if (this.state === "catch") sheetKey = "guard_catch";
    else if (this.state === "escort") sheetKey = "guard_escort";
    else if (this.state === "frustrated") sheetKey = "guard_frustrated";

    const frame = assets.getFrame(sheetKey, this.currentFrame);
    if (!frame) return;

    const w = CONFIG.guards.spriteWidth;  // 80
    const h = CONFIG.guards.spriteHeight; // 140

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

    ctx.fillStyle = "rgba(22, 28, 45, 0.96)";
    ctx.strokeStyle = "#e89b38";
    ctx.lineWidth = 1.8;

    const bx = x - boxW / 2;
    const by = y - boxH;
    ctx.beginPath();
    ctx.roundRect(bx, by, boxW, boxH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#ffdd88";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, by + boxH / 2);
    ctx.restore();
  }
}

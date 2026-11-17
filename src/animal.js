/**
 * src/animal.js
 * Autonomous living animals (Tabby Cat, Winter Chicken, Fluffy Sheep)
 * with independent AI behaviors, states, soft-body physics, and zero character overlap.
 */

class Animal {
  constructor(id, type, name, spriteKey, startX, startY, radius, bounds) {
    this.id = id;
    this.type = type; // "cat", "chicken", "sheep"
    this.name = name;
    this.spriteKey = spriteKey;
    
    this.x = startX;
    this.y = startY;
    this.vx = 0;
    this.vy = 0;
    this.radius = radius;
    this.facingRight = true;
    this.bounds = bounds; // { minX, maxX, minY, maxY } roaming bounds
    
    this.state = "idle";
    this.stateTimer = 2.0 + Math.random() * 3.0;
    this.speechBubble = null;
    this.targetX = startX;
    this.targetY = startY;
    this.speed = type === "cat" ? 35 : (type === "chicken" ? 28 : 20);
  }

  update(dt, currentHour, isNight, allAgents) {
    if (this.speechBubble) {
      this.speechBubble.timer -= dt;
      if (this.speechBubble.timer <= 0) this.speechBubble = null;
    }

    this.stateTimer -= dt;

    if (this.state === "wander") {
      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 10 || this.stateTimer <= 0) {
        this.state = "idle";
        this.vx = 0;
        this.vy = 0;
        this.stateTimer = 3.0 + Math.random() * 4.0;
      } else {
        this.facingRight = dx >= 0;
        this.vx = (dx / dist) * this.speed;
        this.vy = (dy / dist) * this.speed;

        this.x += this.vx * dt;
        this.y += this.vy * dt;
      }
    } else if (this.state === "idle") {
      this.vx = 0;
      this.vy = 0;
      if (this.stateTimer <= 0) {
        if (Math.random() < 0.65) {
          // Choose a new wander spot inside roaming bounds
          this.state = "wander";
          this.targetX = this.bounds.minX + Math.random() * (this.bounds.maxX - this.bounds.minX);
          this.targetY = this.bounds.minY + Math.random() * (this.bounds.maxY - this.bounds.minY);
          this.stateTimer = 4.0 + Math.random() * 3.0;
        } else {
          // Special idle action
          this.state = "special";
          this.stateTimer = 3.5 + Math.random() * 3.0;
          if (this.type === "cat") {
            this.speechBubble = { text: Math.random() < 0.5 ? "Nya~ 🐱" : "Purrr...", timer: 2.5 };
          } else if (this.type === "chicken") {
            this.speechBubble = { text: "Bok bok! 🐔", timer: 2.0 };
          } else if (this.type === "sheep") {
            this.speechBubble = { text: "Baaa~ 🐑", timer: 2.5 };
          }
        }
      }
    } else if (this.state === "special") {
      this.vx = 0;
      this.vy = 0;
      if (this.stateTimer <= 0) {
        this.state = "idle";
        this.stateTimer = 2.0 + Math.random() * 3.0;
      }
    }

    // Physical separation from all characters and other animals
    for (const other of allAgents) {
      if (other === this) continue;
      world.resolveAgentPhysics(this, other);
    }

    // Solid obstacle collisions
    world.resolveObstacleCollision(this, this.radius);
  }

  draw(ctx) {
    const img = assets.getImage(this.spriteKey);
    if (!img) return;

    const px = Math.round(this.x);
    const py = Math.round(this.y);

    let w = 70;
    let h = 58;
    if (this.type === "chicken") { w = 48; h = 48; }
    else if (this.type === "sheep") { w = 85; h = 75; }

    ctx.save();
    if (!this.facingRight) {
      ctx.translate(px, py - h);
      ctx.scale(-1, 1);
      ctx.drawImage(img, -w / 2, 0, w, h);
    } else {
      ctx.translate(px, py - h);
      ctx.drawImage(img, -w / 2, 0, w, h);
    }
    ctx.restore();

    if (this.speechBubble) {
      this.drawSpeechBubble(ctx, px, py - h - 10, this.speechBubble.text);
    }
  }

  drawSpeechBubble(ctx, x, y, text) {
    ctx.save();
    ctx.font = "bold 12px sans-serif";
    const textW = ctx.measureText(text).width;
    const boxW = textW + 16;
    const boxH = 22;

    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.strokeStyle = "#403028";
    ctx.lineWidth = 1.5;

    const bx = x - boxW / 2;
    const by = y - boxH;
    ctx.beginPath();
    ctx.roundRect(bx, by, boxW, boxH, 5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#201812";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, by + boxH / 2);
    ctx.restore();
  }
}

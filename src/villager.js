/**
 * src/villager.js
 * Villager agent behaviors and daily life state machine:
 * - States: idle, walk, farm, carry, trade, talk, sit, sleep, scared, upset
 * - Day schedule: dawn exit house, midday chores & market chatter, dusk return indoors
 * - Speech bubbles when meeting other villagers
 * - Morning reactions if robbed the previous night
 */

class Villager {
  constructor(id, type, name, spritePrefix, homeHouseId, startX, startY) {
    this.id = id;
    this.type = type;
    this.name = name;
    this.spritePrefix = spritePrefix; // e.g. "farmer_woman", "elder", "merchant"
    this.homeHouseId = homeHouseId;
    
    this.x = startX;
    this.y = startY;
    this.targetX = startX;
    this.facingRight = true;
    
    this.state = "idle"; // "idle", "walk", "talk", "sleep", "scared", "upset"
    this.stateTimer = 2.0;
    this.animTimer = 0;
    this.currentFrame = 0;
    
    this.isAsleep = false;
    this.speechBubble = null; // { text: "...", timer: 3.0 }
    this.chatPartner = null;
    this.speed = CONFIG.villagers.walkSpeed * (0.85 + Math.random() * 0.3);
  }

  update(dt, currentHour, isNight) {
    this.animTimer += dt;
    if (this.speechBubble) {
      this.speechBubble.timer -= dt;
      if (this.speechBubble.timer <= 0) this.speechBubble = null;
    }

    // Daily schedule state shifts
    if (isNight) {
      if (!this.isAsleep) {
        // Head home to sleep
        const home = world.getHouse(this.homeHouseId);
        if (home && Math.abs(this.x - home.doorX) > 4) {
          this.targetX = home.doorX;
          this.state = "walk";
        } else {
          this.state = "sleep";
          this.isAsleep = true;
        }
      }
      return;
    } else {
      // Daytime: wake up and emerge from home
      if (this.isAsleep) {
        this.isAsleep = false;
        this.state = "idle";
        this.stateTimer = 2.0;
        
        // Morning aftermath reaction if robbed
        const home = world.getHouse(this.homeHouseId);
        if (home && home.robbed) {
          this.state = "upset";
          this.speechBubble = { text: "💢 My house was robbed!", timer: 5.0 };
        }
      }
    }

    // Active state machine
    if (this.state === "talk") {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        this.state = "idle";
        this.stateTimer = 2.0 + Math.random() * 4.0;
        this.chatPartner = null;
        this.speechBubble = null;
      }
    } else if (this.state === "walk") {
      const dx = this.targetX - this.x;
      this.facingRight = dx >= 0;
      const step = this.speed * dt;
      
      if (Math.abs(dx) <= step) {
        this.x = this.targetX;
        this.state = "idle";
        this.stateTimer = CONFIG.villagers.pauseMinSec + Math.random() * (CONFIG.villagers.pauseMaxSec - CONFIG.villagers.pauseMinSec);
      } else {
        this.x += Math.sign(dx) * step;
      }
    } else if (this.state === "idle") {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        // Pick new destination: market, campfire, farm, or neighbour house
        const destinations = [110, 160, 236, 280, 334, 380, 70];
        this.targetX = destinations[Math.floor(Math.random() * destinations.length)] + (Math.random() * 20 - 10);
        this.state = "walk";
      }
    } else if (this.state === "upset") {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        this.state = "walk";
        this.targetX = 236; // gather at campfire to talk with neighbors
      }
    }

    // Frame animation counter
    const frameRate = this.state === "walk" ? 0.14 : 0.25;
    if (this.animTimer >= frameRate) {
      this.animTimer = 0;
      this.currentFrame++;
    }
  }

  // Draw villager at whole-pixel positions
  draw(ctx) {
    if (this.isAsleep) return; // indoors sleeping

    const px = Math.round(this.x);
    const py = Math.round(this.y);

    const sheetKey = this.state === "walk" 
      ? `${this.spritePrefix}_walk` 
      : `${this.spritePrefix}_idle`;
      
    const frame = assets.getFrame(sheetKey, this.currentFrame);
    if (!frame) return;

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

    // Draw speech bubble
    if (this.speechBubble) {
      this.drawSpeechBubble(ctx, px, py - 52, this.speechBubble.text);
    }
  }

  drawSpeechBubble(ctx, x, y, text) {
    ctx.save();
    ctx.font = "8px sans-serif";
    const textW = ctx.measureText(text).width;
    const pad = 4;
    const boxW = textW + pad * 2;
    const boxH = 12;

    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.strokeStyle = "#302622";
    ctx.lineWidth = 1;
    ctx.fillRect(x - boxW / 2, y - boxH, boxW, boxH);
    ctx.strokeRect(x - boxW / 2, y - boxH, boxW, boxH);

    ctx.fillStyle = "#221a14";
    ctx.textAlign = "center";
    ctx.fillText(text, x, y - 3);
    ctx.restore();
  }
}

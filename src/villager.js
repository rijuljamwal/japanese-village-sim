/**
 * src/villager.js
 * Villager agent with Full HD (80x140) rendering, real-world physics,
 * avoidance steering, social interactions, station jobs, and campfire gatherings.
 */

class Villager {
  constructor(id, type, name, spritePrefix, homeHouseId, startX, startY, role) {
    this.id = id;
    this.type = type;
    this.name = name;
    this.spritePrefix = spritePrefix;
    this.homeHouseId = homeHouseId;
    this.role = role || "villager"; // "farmer", "blacksmith", "merchant", "child", "elder", "hunter"
    
    this.x = startX;
    this.y = startY;
    this.vx = 0;
    this.vy = 0;
    this.radius = CONFIG.villagers.collisionRadius;
    this.facingRight = true;
    
    this.state = "idle"; // "idle", "walk", "work", "sit", "talk", "sleep", "upset"
    this.stateTimer = 2.0;
    this.animTimer = 0;
    this.currentFrame = 0;
    this.footstepTimer = 0;
    this.workTimer = 0;
    
    this.path = [];
    this.targetNodeId = null;
    this.isAsleep = false;
    this.speechBubble = null;
    this.chatPartner = null;
    this.speed = CONFIG.villagers.walkSpeed * (0.90 + Math.random() * 0.2);
  }

  setDestination(targetNodeId) {
    const startNode = world.getNearestNavNode(this.x, this.y);
    this.path = world.findPath(startNode, targetNodeId);
    this.targetNodeId = targetNodeId;
    this.state = "walk";
  }

  update(dt, currentHour, isNight, allAgents) {
    this.animTimer += dt;
    this.footstepTimer += dt;

    if (this.speechBubble) {
      this.speechBubble.timer -= dt;
      if (this.speechBubble.timer <= 0) this.speechBubble = null;
    }

    // Day / Night Schedule
    if (isNight) {
      if (!this.isAsleep) {
        const home = world.getHouse(this.homeHouseId);
        if (home && Math.hypot(this.x - home.doorX, this.y - home.doorY) > 20) {
          if (this.path.length === 0) {
            const doorNode = this.homeHouseId === 1 ? "west_door" : (this.homeHouseId === 2 ? "north_door" : "east_door");
            this.setDestination(doorNode);
          }
        } else {
          this.state = "sleep";
          this.isAsleep = true;
          this.vx = 0;
          this.vy = 0;
        }
      }
      return;
    } else {
      if (this.isAsleep) {
        this.isAsleep = false;
        this.state = "idle";
        this.stateTimer = 2.0;
        const home = world.getHouse(this.homeHouseId);
        if (home && home.robbed) {
          this.state = "upset";
          this.speechBubble = { text: "💢 Oh no! My cottage was robbed in the night!", timer: 6.0 };
        }
      }
    }

    // Real-World Character-to-Character Physics & Social Interaction
    for (const other of allAgents) {
      if (other === this || other.isAsleep) continue;

      // Soft-body physical separation
      const collided = world.resolveAgentPhysics(this, other);

      // Social greetings when crossing paths on a trail
      if (collided && this.state === "walk" && other.state === "walk" && !this.chatPartner && !other.chatPartner) {
        if (Math.random() < CONFIG.villagers.chatterChance) {
          this.startConversation(other);
        }
      }
    }

    // State Machine
    if (this.state === "talk") {
      this.vx = 0;
      this.vy = 0;
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        this.state = "idle";
        this.stateTimer = 2.0 + Math.random() * 3.0;
        this.chatPartner = null;
        this.speechBubble = null;
      }
    } else if (this.state === "work") {
      this.vx = 0;
      this.vy = 0;
      this.stateTimer -= dt;
      this.workTimer += dt;
      
      // Blacksmith sparks at forge
      if (this.role === "blacksmith" && this.workTimer >= 0.7) {
        this.workTimer = 0;
        if (typeof eventManager !== "undefined") {
          eventManager.addSparks(this.x + (this.facingRight ? 35 : -35), this.y - 45);
        }
      }

      if (this.stateTimer <= 0) {
        this.state = "idle";
        this.stateTimer = 2.5;
      }
    } else if (this.state === "sit") {
      this.vx = 0;
      this.vy = 0;
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        this.state = "idle";
        this.stateTimer = 2.0;
      }
    } else if (this.state === "walk") {
      if (this.path.length > 0) {
        const nextNode = world.navNodes.get(this.path[0]);
        if (nextNode) {
          const dx = nextNode.x - this.x;
          const dy = nextNode.y - this.y;
          const dist = Math.hypot(dx, dy);

          if (dist < 15) {
            this.path.shift(); // Arrived at waypoint
          } else {
            this.facingRight = dx >= 0;
            const dirX = dx / dist;
            const dirY = dy / dist;

            // Predictive avoidance steering around nearby walking agents
            const { steerX, steerY } = world.computeAvoidanceSteering(this, allAgents);

            this.vx = dirX * this.speed + steerX;
            this.vy = dirY * this.speed + steerY;

            this.x += this.vx * dt;
            this.y += this.vy * dt;

            // Deposit realistic footprint in the snow
            if (this.footstepTimer >= 0.35) {
              this.footstepTimer = 0;
              world.addFootprint(this.x, this.y, Math.atan2(dy, dx));
            }
          }
        }
      } else {
        // Destination reached -> trigger station work or rest
        this.onReachedDestination(currentHour);
      }
    } else if (this.state === "idle") {
      this.vx = 0;
      this.vy = 0;
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        this.chooseNextActivity(currentHour);
      }
    } else if (this.state === "upset") {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        this.setDestination("plaza");
      }
    }

    // Solid obstacle collision resolution against houses, fences, forge, market, campfire
    world.resolveObstacleCollision(this, this.radius);

    // Animation frame timing
    const frameRate = this.state === "walk" ? 0.12 : 0.22;
    if (this.animTimer >= frameRate) {
      this.animTimer = 0;
      this.currentFrame++;
    }
  }

  onReachedDestination(currentHour) {
    this.vx = 0;
    this.vy = 0;

    // Check if at station
    if (this.targetNodeId === "forge_anvil") {
      this.state = "work";
      this.stateTimer = 8.0 + Math.random() * 6.0;
      this.speechBubble = { text: "Forging steel horseshoe...", timer: 3.5 };
    } else if (this.targetNodeId === "garden_gate") {
      this.state = "work";
      this.stateTimer = 7.0 + Math.random() * 5.0;
      this.speechBubble = { text: "Tending winter leeks...", timer: 3.5 };
    } else if (this.targetNodeId === "market_plaza") {
      this.state = "work";
      this.stateTimer = 9.0 + Math.random() * 5.0;
      this.speechBubble = { text: "Fresh winter produce!", timer: 3.5 };
    } else if (this.targetNodeId === "bench_left" || this.targetNodeId === "bench_right") {
      this.state = "sit";
      this.stateTimer = 10.0 + Math.random() * 8.0;
      this.speechBubble = { text: "Mmm, warm campfire...", timer: 3.5 };
    } else {
      this.state = "idle";
      this.stateTimer = 3.0 + Math.random() * 4.0;
    }
  }

  chooseNextActivity(currentHour) {
    // Campfire feast time during midday (12:00-13:30) or evening dusk (17:00-18:30)
    const isMealTime = (currentHour >= 12.0 && currentHour <= 13.5) || (currentHour >= 17.0 && currentHour <= 18.5);

    if (isMealTime) {
      if (this.role === "child") {
        this.setDestination(Math.random() < 0.5 ? "bench_left" : "bench_right");
      } else {
        this.setDestination("plaza");
      }
      return;
    }

    // Role-specific daytime stations
    if (this.role === "farmer" && Math.random() < 0.65) {
      this.setDestination("garden_gate");
    } else if (this.role === "blacksmith" && Math.random() < 0.65) {
      this.setDestination("forge_anvil");
    } else if (this.role === "merchant" && Math.random() < 0.65) {
      this.setDestination("market_plaza");
    } else if (this.role === "hunter" && Math.random() < 0.65) {
      this.setDestination(Math.random() < 0.5 ? "bridge_west" : "bridge_east");
    } else {
      // General village stroll destinations
      const choices = ["plaza", "west_trail", "north_trail", "east_trail", "south_crossroads", "forge_plaza", "market_plaza", "bridge_west"];
      const randDest = choices[Math.floor(Math.random() * choices.length)];
      this.setDestination(randDest);
    }
  }

  startConversation(other) {
    this.state = "talk";
    other.state = "talk";
    this.stateTimer = CONFIG.villagers.chatterDurationSeconds;
    other.stateTimer = CONFIG.villagers.chatterDurationSeconds;
    this.chatPartner = other;
    other.chatPartner = this;

    // Face each other
    this.facingRight = other.x >= this.x;
    other.facingRight = this.x >= other.x;

    const greetings = [
      "Konnichiwa! Cold winter today!",
      "The snow is falling softly...",
      "Hot tea at the hearth smells wonderful!",
      "Stay warm by the campfire!",
      "Keep an eye out for night thieves!",
      "The winter leeks are crisp under the frost.",
      "The river has frozen solid over the stones."
    ];
    const pick = greetings[Math.floor(Math.random() * greetings.length)];
    this.speechBubble = { text: pick, timer: 3.5 };
  }

  draw(ctx) {
    if (this.isAsleep) return;

    const px = Math.round(this.x);
    const py = Math.round(this.y);

    const sheetKey = this.state === "walk" 
      ? `${this.spritePrefix}_walk` 
      : `${this.spritePrefix}_idle`;
      
    const frame = assets.getFrame(sheetKey, this.currentFrame);
    if (!frame) return;

    const w = CONFIG.villagers.spriteWidth;  // 80
    const h = CONFIG.villagers.spriteHeight; // 140

    ctx.save();
    // Anchor feet baseline at py, centered horizontally
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
      this.drawSpeechBubble(ctx, px, py - h - 10, this.speechBubble.text);
    }
  }

  drawSpeechBubble(ctx, x, y, text) {
    ctx.save();
    ctx.font = "bold 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    const textW = ctx.measureText(text).width;
    const boxW = textW + 18;
    const boxH = 26;

    ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
    ctx.strokeStyle = "#2e2420";
    ctx.lineWidth = 1.8;

    // Rounded speech bubble
    const bx = x - boxW / 2;
    const by = y - boxH;
    ctx.beginPath();
    ctx.roundRect(bx, by, boxW, boxH, 6);
    ctx.fill();
    ctx.stroke();

    // Small pointer triangle
    ctx.beginPath();
    ctx.moveTo(x - 5, by + boxH);
    ctx.lineTo(x, by + boxH + 6);
    ctx.lineTo(x + 5, by + boxH);
    ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#1e1610";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, by + boxH / 2);
    ctx.restore();
  }
}

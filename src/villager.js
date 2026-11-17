/**
 * src/villager.js
 * Villager agent with realistic human walking physics (acceleration, deceleration, avoidance steering),
 * purpose-driven station schedules, quick natural passing conversations (no long freezes),
 * and depth-sorted campfire gatherings.
 */

class Villager {
  constructor(id, type, name, spritePrefix, homeHouseId, startX, startY, role) {
    this.id = id;
    this.type = type;
    this.name = name;
    this.spritePrefix = spritePrefix;
    this.homeHouseId = homeHouseId;
    this.role = role || "villager";
    
    this.x = startX;
    this.y = startY;
    this.vx = 0;
    this.vy = 0;
    this.targetVx = 0;
    this.targetVy = 0;
    this.radius = CONFIG.villagers.collisionRadius || 26;
    this.facingRight = true;
    
    this.state = "idle"; // "idle", "walk", "work", "sit", "talk", "sleep", "upset"
    this.stateTimer = 1.5 + Math.random() * 2.0;
    this.animTimer = 0;
    this.currentFrame = 0;
    this.footstepTimer = 0;
    this.workTimer = 0;
    this.chatCooldown = 5.0 + Math.random() * 10.0; // Cooldown between conversations
    
    this.path = [];
    this.targetNodeId = null;
    this.isAsleep = false;
    this.speechBubble = null;
    this.chatPartner = null;
    this.speed = (CONFIG.villagers.walkSpeed || 72) * (0.92 + Math.random() * 0.16);
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

    if (this.chatCooldown > 0) this.chatCooldown -= dt;

    if (this.speechBubble) {
      this.speechBubble.timer -= dt;
      if (this.speechBubble.timer <= 0) this.speechBubble = null;
    }

    // Day / Night Schedule
    if (isNight) {
      if (!this.isAsleep) {
        const home = world.getHouse(this.homeHouseId);
        if (home && Math.hypot(this.x - home.doorX, this.y - home.doorY) > 25) {
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
          this.speechBubble = { text: "💢 Oh no! My cottage was robbed in the night!", timer: 5.0 };
        }
      }
    }

    // Soft-body physics with other agents (Villagers, Guards, Animals)
    for (const other of allAgents) {
      if (other === this || other.isAsleep) continue;

      const collided = world.resolveAgentPhysics(this, other);

      // Quick natural passing greeting (Only if cooldown expired and not already talking)
      if (collided && this.state === "walk" && other.state === "walk" && !this.chatPartner && !other.chatPartner) {
        if (this.chatCooldown <= 0 && other.chatCooldown <= 0 && Math.random() < 0.35) {
          this.startConversation(other);
        }
      }
    }

    // State Machine
    if (this.state === "talk") {
      this.targetVx = 0;
      this.targetVy = 0;
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        this.state = "walk"; // Resume walking immediately
        this.chatPartner = null;
        this.speechBubble = null;
        this.chatCooldown = 20.0; // 20s cooldown before talking again
      }
    } else if (this.state === "work") {
      this.targetVx = 0;
      this.targetVy = 0;
      this.stateTimer -= dt;
      this.workTimer += dt;
      
      // Blacksmith hammering sparks at forge
      if (this.role === "blacksmith" && this.workTimer >= 0.8) {
        this.workTimer = 0;
        if (typeof eventManager !== "undefined") {
          eventManager.addSparks(this.x + (this.facingRight ? 35 : -35), this.y - 45);
        }
      }

      if (this.stateTimer <= 0) {
        this.state = "idle";
        this.stateTimer = 2.0 + Math.random() * 2.0;
      }
    } else if (this.state === "sit") {
      this.targetVx = 0;
      this.targetVy = 0;
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

          if (dist < 18) {
            this.path.shift(); // Reached waypoint
          } else {
            this.facingRight = dx >= 0;
            const dirX = dx / dist;
            const dirY = dy / dist;

            // Lateral sidewalk avoidance steering around oncoming walkers
            const { steerX, steerY } = world.computeAvoidanceSteering(this, allAgents, 65);

            this.targetVx = dirX * this.speed + steerX;
            this.targetVy = dirY * this.speed + steerY;

            // Footprints in snow
            if (this.footstepTimer >= 0.38) {
              this.footstepTimer = 0;
              world.addFootprint(this.x, this.y, Math.atan2(dy, dx));
            }
          }
        }
      } else {
        // Path complete -> start station work or rest
        this.onReachedDestination(currentHour);
      }
    } else if (this.state === "idle") {
      this.targetVx = 0;
      this.targetVy = 0;
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

    // Realistic human acceleration / deceleration physics (smooth ease-in and ease-out)
    const accelRate = 7.0;
    this.vx += (this.targetVx - this.vx) * Math.min(1.0, accelRate * dt);
    this.vy += (this.targetVy - this.vy) * Math.min(1.0, accelRate * dt);

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Solid obstacle collisions (houses, fences, campfire, river)
    world.resolveObstacleCollision(this, this.radius);

    // Animation frame timing
    const isMoving = Math.hypot(this.vx, this.vy) > 5;
    const frameRate = isMoving ? 0.13 : 0.24;
    if (this.animTimer >= frameRate) {
      this.animTimer = 0;
      this.currentFrame++;
    }
  }

  onReachedDestination(currentHour) {
    this.targetVx = 0;
    this.targetVy = 0;

    if (this.targetNodeId === "forge_anvil") {
      this.state = "work";
      this.stateTimer = 9.0 + Math.random() * 5.0;
      this.speechBubble = { text: "Forging horseshoe... 🔨", timer: 3.0 };
    } else if (this.targetNodeId === "garden_gate") {
      this.state = "work";
      this.stateTimer = 8.0 + Math.random() * 4.0;
      this.speechBubble = { text: "Weeding cabbage patch... 🥬", timer: 3.0 };
    } else if (this.targetNodeId === "market_plaza") {
      this.state = "work";
      this.stateTimer = 10.0 + Math.random() * 6.0;
      this.speechBubble = { text: "Fresh sweet potatoes!", timer: 3.0 };
    } else if (this.targetNodeId === "bench_left" || this.targetNodeId === "bench_right") {
      this.state = "sit";
      this.stateTimer = 12.0 + Math.random() * 8.0;
      this.speechBubble = { text: "Warm tea by the fire...", timer: 3.0 };
    } else {
      this.state = "idle";
      this.stateTimer = 2.5 + Math.random() * 3.0;
    }
  }

  chooseNextActivity(currentHour) {
    const isMealTime = (currentHour >= 12.0 && currentHour <= 13.5) || (currentHour >= 17.0 && currentHour <= 18.5);

    if (isMealTime) {
      if (this.role === "child") {
        this.setDestination(Math.random() < 0.5 ? "bench_left" : "bench_right");
      } else {
        this.setDestination("plaza");
      }
      return;
    }

    if (this.role === "farmer" && Math.random() < 0.60) {
      this.setDestination("garden_gate");
    } else if (this.role === "blacksmith" && Math.random() < 0.60) {
      this.setDestination("forge_anvil");
    } else if (this.role === "merchant" && Math.random() < 0.60) {
      this.setDestination("market_plaza");
    } else if (this.role === "hunter" && Math.random() < 0.60) {
      this.setDestination(Math.random() < 0.5 ? "bridge_west" : "bridge_east");
    } else {
      const choices = ["plaza", "west_trail", "north_trail", "east_trail", "south_crossroads", "forge_plaza", "market_plaza", "bridge_west"];
      const randDest = choices[Math.floor(Math.random() * choices.length)];
      this.setDestination(randDest);
    }
  }

  startConversation(other) {
    this.state = "talk";
    other.state = "talk";
    this.stateTimer = 1.8; // Quick natural 1.8s greeting (no long freeze)
    other.stateTimer = 1.8;
    this.chatPartner = other;
    other.chatPartner = this;
    this.chatCooldown = 18.0;
    other.chatCooldown = 18.0;

    // Face each other
    this.facingRight = other.x >= this.x;
    other.facingRight = this.x >= other.x;

    const greetings = [
      "Ohayo! Cold winter day!",
      "The snow is falling softly...",
      "Hot tea at the hearth smells nice!",
      "Stay warm by the fire!",
      "Watch out for night thieves!",
      "The winter leeks are sweet this year."
    ];
    const pick = greetings[Math.floor(Math.random() * greetings.length)];
    this.speechBubble = { text: pick, timer: 2.5 };
  }

  draw(ctx) {
    if (this.isAsleep) return;

    const px = Math.round(this.x);
    const py = Math.round(this.y);

    const isMoving = Math.hypot(this.vx, this.vy) > 5;
    const sheetKey = (this.state === "walk" && isMoving)
      ? `${this.spritePrefix}_walk` 
      : `${this.spritePrefix}_idle`;
      
    const frame = assets.getFrame(sheetKey, this.currentFrame);
    if (!frame) return;

    const w = CONFIG.villagers.spriteWidth || 80;
    const h = CONFIG.villagers.spriteHeight || 140;

    ctx.save();
    // Subtle walking tilt into direction of motion for natural gait
    if (isMoving) {
      const tiltAngle = (this.vx / this.speed) * 0.04;
      ctx.translate(px, py);
      ctx.rotate(tiltAngle);
      ctx.translate(-px, -py);
    }

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

    const bx = x - boxW / 2;
    const by = y - boxH;
    ctx.beginPath();
    ctx.roundRect(bx, by, boxW, boxH, 6);
    ctx.fill();
    ctx.stroke();

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

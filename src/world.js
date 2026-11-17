/**
 * src/world.js
 * World state manager with solid rigid-body obstacle collisions,
 * agent-to-agent soft-body physics, avoidance steering,
 * trail navigation graph, dynamic snow footprint tracks, and robbery tracking.
 */

class WorldManager {
  constructor(config) {
    this.config = config;
    this.obstacles = config.obstacles;
    this.navNodes = new Map();
    for (const node of config.navNodes) {
      this.navNodes.set(node.id, node);
    }

    this.houses = config.houses.map((h) => ({
      ...h,
      doorState: "closed",
      robbed: false
    }));

    this.events = [];
    this.jailedThieves = [];
    this.robbedHousesCount = 0;
    this.footprints = []; // { x, y, angle, alpha, life }
  }

  logEvent(text) {
    const timeStr = typeof timeManager !== "undefined" ? timeManager.getFormattedTime() : "";
    const entry = `[${timeStr}] ${text}`;
    this.events.unshift(entry);
    if (this.events.length > 50) this.events.pop();
    console.log(`[Event] ${entry}`);
  }

  getHouse(id) {
    return this.houses.find((h) => h.id === id) || null;
  }

  // Add footprint in snow
  addFootprint(x, y, angle) {
    this.footprints.push({
      x,
      y,
      angle,
      alpha: 0.65,
      life: 22.0 // fades over 22 in-game seconds
    });
    if (this.footprints.length > 250) this.footprints.shift();
  }

  updateFootprints(dt) {
    for (let i = this.footprints.length - 1; i >= 0; i--) {
      const fp = this.footprints[i];
      fp.life -= dt;
      fp.alpha = Math.max(0, fp.life / 22.0) * 0.65;
      if (fp.life <= 0) {
        this.footprints.splice(i, 1);
      }
    }
  }

  // Solid physical collision check against world obstacles (AABB vs circle)
  // Ensures agents NEVER clip or pass through houses, walls, fences, or forge
  resolveObstacleCollision(agent, radius = 28) {
    const feetX = agent.x;
    const feetY = agent.y;

    for (const obs of this.obstacles) {
      // Find closest point on obstacle AABB to feet position
      const clampX = Math.max(obs.x, Math.min(feetX, obs.x + obs.w));
      const clampY = Math.max(obs.y, Math.min(feetY, obs.y + obs.h));

      const dx = feetX - clampX;
      const dy = feetY - clampY;
      const distSq = dx * dx + dy * dy;

      if (distSq < radius * radius) {
        const dist = Math.sqrt(distSq);
        if (dist === 0) {
          // If deeply inside, push out to the nearest edge
          const leftDist = Math.abs(feetX - obs.x);
          const rightDist = Math.abs(feetX - (obs.x + obs.w));
          const topDist = Math.abs(feetY - obs.y);
          const bottomDist = Math.abs(feetY - (obs.y + obs.h));
          const minDist = Math.min(leftDist, rightDist, topDist, bottomDist);

          if (minDist === bottomDist) agent.y = obs.y + obs.h + radius;
          else if (minDist === topDist) agent.y = obs.y - radius;
          else if (minDist === rightDist) agent.x = obs.x + obs.w + radius;
          else agent.x = obs.x - radius;
        } else {
          // Push out smoothly along penetration normal
          const overlap = radius - dist;
          agent.x += (dx / dist) * overlap;
          agent.y += (dy / dist) * overlap;
        }
      }
    }

    // World screen bounds
    agent.x = Math.max(20, Math.min(agent.x, CONFIG.display.baseWidth - 20));
    agent.y = Math.max(180, Math.min(agent.y, CONFIG.display.baseHeight - 30));
  }

  // Agent-to-Agent Soft-Body Physics
  // Pushes agents apart when personal spaces overlap so they never ghost through each other
  resolveAgentPhysics(agentA, agentB) {
    if (!agentA || !agentB || agentA === agentB) return false;
    if (agentA.isAsleep || agentB.isAsleep) return false;

    const dx = agentA.x - agentB.x;
    const dy = agentA.y - agentB.y;
    const dist = Math.hypot(dx, dy);
    const minDist = agentA.radius + agentB.radius;

    if (dist < minDist && dist > 0.001) {
      const overlap = minDist - dist;
      const nx = dx / dist;
      const ny = dy / dist;

      const pushX = nx * overlap * 0.5;
      const pushY = ny * overlap * 0.5;

      agentA.x += pushX;
      agentA.y += pushY;
      agentB.x -= pushX;
      agentB.y -= pushY;

      return true; // Collision occurred
    }
    return false;
  }

  // Predictive Avoidance Steering (Real-World Walking Physics)
  // When agents approach head-on on a trail, they steer right to pass each other smoothly
  computeAvoidanceSteering(agent, otherAgents, lookAheadDist = 65) {
    let steerX = 0;
    let steerY = 0;

    for (const other of otherAgents) {
      if (other === agent || other.isAsleep) continue;

      const dx = other.x - agent.x;
      const dy = other.y - agent.y;
      const dist = Math.hypot(dx, dy);

      if (dist < lookAheadDist && dist > 1) {
        // Lateral perpendicular vector (deflect to the right of path)
        const perpX = -dy / dist;
        const perpY = dx / dist;

        const weight = (lookAheadDist - dist) / lookAheadDist;
        steerX += perpX * weight * 35.0;
        steerY += perpY * weight * 35.0;
      }
    }

    return { steerX, steerY };
  }

  // Find shortest path between two nav nodes using BFS
  findPath(startId, targetId) {
    if (startId === targetId) return [targetId];
    const queue = [[startId]];
    const visited = new Set([startId]);

    while (queue.length > 0) {
      const path = queue.shift();
      const current = path[path.length - 1];

      if (current === targetId) return path;

      const node = this.navNodes.get(current);
      if (!node) continue;

      for (const neighborId of node.neighbors) {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push([...path, neighborId]);
        }
      }
    }
    return [targetId];
  }

  getNearestNavNode(x, y) {
    let nearest = null;
    let minDist = Infinity;
    for (const [id, node] of this.navNodes) {
      const d = Math.hypot(node.x - x, node.y - y);
      if (d < minDist) {
        minDist = d;
        nearest = id;
      }
    }
    return nearest || "plaza";
  }

  markRobbed(houseId) {
    const h = this.getHouse(houseId);
    if (h) {
      h.robbed = true;
      h.doorState = "open";
      this.robbedHousesCount++;
      this.logEvent(`${h.name} was broken into and robbed!`);
    }
  }

  clearMorningAftermath() {
    for (const h of this.houses) {
      if (h.robbed) {
        h.robbed = false;
        h.doorState = "closed";
      }
    }
    this.jailedThieves = [];
    this.logEvent("Dawn breaks. Village starts a new peaceful day.");
  }

  jailThief(thief) {
    this.jailedThieves.push({
      id: thief.id,
      jailHour: timeManager.currentHour,
      thiefObj: thief
    });
    this.logEvent(`Thief #${thief.id} apprehended and locked in the village cage!`);
  }
}

const world = new WorldManager(CONFIG);

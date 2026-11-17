/**
 * src/world.js
 * World state representation:
 * - Houses, doors (closed, open with light, robbed marker)
 * - Navigation waypoints for villagers and night guards
 * - Guardhouse prison cage and stocks
 * - Event logging buffer
 */

class WorldManager {
  constructor(config) {
    this.config = config.world;
    this.houses = this.config.houses.map((h) => ({
      ...h,
      doorState: "closed", // "closed", "open_light", "open", "broken"
      robbed: false,
      stolenLoot: null
    }));
    this.events = [];
    this.jailedThieves = [];
    this.robbedHousesCount = 0;
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

  // Get nearest house to coordinate x
  getNearestHouse(x) {
    let nearest = null;
    let minDist = Infinity;
    for (const h of this.houses) {
      const d = Math.abs(h.doorX - x);
      if (d < minDist) {
        minDist = d;
        nearest = h;
      }
    }
    return nearest;
  }

  // Mark house as robbed
  markRobbed(houseId) {
    const h = this.getHouse(houseId);
    if (h) {
      h.robbed = true;
      h.doorState = "open";
      this.robbedHousesCount++;
      this.logEvent(`${h.name} was robbed!`);
    }
  }

  // Morning reset of robbed markers
  clearMorningAftermath() {
    for (const h of this.houses) {
      if (h.robbed) {
        h.robbed = false;
        h.doorState = "closed";
      }
    }
    this.jailedThieves = [];
    this.logEvent("Village starts a new day. Robbed markers cleared.");
  }

  // Put captured thief into guardhouse cage
  jailThief(thief) {
    this.jailedThieves.push({
      id: thief.id,
      jailHour: timeManager.currentHour,
      thiefObj: thief
    });
    this.logEvent(`Thief #${thief.id} locked in the guardhouse cage.`);
  }
}

// Global instance
const world = new WorldManager(CONFIG);

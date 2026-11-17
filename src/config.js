/**
 * src/config.js
 * Master configuration file for Japanese Pixel-Art Village Simulation.
 * Native Full HD Resolution: 1920x1080
 * Complete physics, collision obstacles, nav trails, and real-world interactions.
 */

const CONFIG = {
  // Display & Rendering
  display: {
    baseWidth: 1920,
    baseHeight: 1080,
    scale: 1,
    pixelated: false
  },

  // Time & Cycle
  time: {
    dayDurationMinutes: 12, // 12 real minutes = 24 in-game hours
    startHour: 7.0,         // Start in the morning at 07:00
    phases: {
      dawn: { start: 5.0, end: 7.0, name: "Dawn" },
      day: { start: 7.0, end: 17.0, name: "Day" },
      dusk: { start: 17.0, end: 19.0, name: "Dusk" },
      night: { start: 19.0, end: 5.0, name: "Night" }
    },
    speeds: [0, 1, 2, 4],
    defaultSpeed: 1
  },

  // Lighting & Night Atmos
  lighting: {
    crossfadeDurationMinutes: 60,
    lanternGlowRadius: 120,
    windowGlowRadius: 100,
    campfireGlowRadius: 180,
    forgeGlowRadius: 160,
    guardLightConeAngle: 45,
    guardLightConeLength: 260
  },

  // Physical Obstacles (AABB boxes that characters, guards, and thieves physically collide with)
  obstacles: [
    // 1. West Cottage (Upper Left)
    { id: "house_west", x: 230, y: 150, w: 390, h: 460 },
    // 2. North Manor (Upper Center)
    { id: "house_north", x: 690, y: 110, w: 460, h: 460 },
    // 3. East Cottage (Upper Right)
    { id: "house_east", x: 1180, y: 180, w: 390, h: 460 },
    // 4. Fenced Garden (Middle Left)
    { id: "garden_fence", x: 75, y: 480, w: 350, h: 280 },
    // 5. Blacksmith Forge (Bottom Left)
    { id: "forge_building", x: 80, y: 760, w: 480, h: 300 },
    // 6. Market Stall (Bottom Right)
    { id: "market_stall", x: 1070, y: 770, w: 380, h: 290 },
    // 7. Central Campfire & Feast Table (Plaza Center)
    { id: "campfire_ring", x: 830, y: 550, w: 140, h: 120 },
    { id: "feast_table", x: 840, y: 670, w: 120, h: 75 },
    // 8. Frozen River Bank Top (Above Wooden Bridge)
    { id: "river_top", x: 1500, y: 0, w: 420, h: 520 },
    // 9. Frozen River Bank Bottom (Below Wooden Bridge)
    { id: "river_bottom", x: 1510, y: 680, w: 410, h: 400 }
  ],

  // Trail Network Navigation Nodes (along the cleared footprint paths)
  navNodes: [
    { id: "plaza", x: 910, y: 640, neighbors: ["west_trail", "north_trail", "east_trail", "south_crossroads", "bench_left", "bench_right", "bridge_west"] },
    { id: "bench_left", x: 760, y: 670, neighbors: ["plaza", "west_trail"] },
    { id: "bench_right", x: 1020, y: 670, neighbors: ["plaza", "east_trail"] },
    { id: "west_trail", x: 618, y: 525, neighbors: ["plaza", "west_door", "south_crossroads", "garden_gate", "bench_left"] },
    { id: "west_door", x: 442, y: 480, neighbors: ["west_trail"] },
    { id: "north_trail", x: 918, y: 480, neighbors: ["plaza", "north_door"] },
    { id: "north_door", x: 926, y: 420, neighbors: ["north_trail"] },
    { id: "east_trail", x: 1256, y: 540, neighbors: ["plaza", "east_door", "bridge_west", "bench_right"] },
    { id: "east_door", x: 1350, y: 505, neighbors: ["east_trail"] },
    { id: "south_crossroads", x: 890, y: 860, neighbors: ["plaza", "forge_plaza", "market_plaza", "west_trail"] },
    { id: "forge_plaza", x: 628, y: 880, neighbors: ["south_crossroads", "forge_anvil"] },
    { id: "forge_anvil", x: 390, y: 880, neighbors: ["forge_plaza"] },
    { id: "market_plaza", x: 1030, y: 880, neighbors: ["south_crossroads"] },
    { id: "garden_gate", x: 425, y: 600, neighbors: ["west_trail"] },
    { id: "bridge_west", x: 1460, y: 600, neighbors: ["plaza", "east_trail", "bridge_east"] },
    { id: "bridge_east", x: 1800, y: 600, neighbors: ["bridge_west"] }
  ],

  // Houses metadata
  houses: [
    { id: 1, name: "West Cottage", doorX: 442, doorY: 480, windowX: 442, windowY: 430, robbed: false },
    { id: 2, name: "North Manor", doorX: 926, doorY: 420, windowX: 926, windowY: 370, robbed: false },
    { id: 3, name: "East Cottage", doorX: 1350, doorY: 505, windowX: 1350, windowY: 450, robbed: false }
  ],

  // Villagers (Full HD Settings)
  villagers: {
    count: 7,
    spriteWidth: 80,
    spriteHeight: 140,
    collisionRadius: 28,
    walkSpeed: 72,               // pixels per second in 1920x1080
    chatterDurationSeconds: 4.5,
    chatterChance: 0.65,
    repulsionStrength: 150.0,    // Solid push force separating agents on collision
    avoidanceDistance: 70.0      // Distance to start steering aside
  },

  // Night Guards (Full HD Settings)
  guards: {
    count: 3,
    spriteWidth: 80,
    spriteHeight: 140,
    patrolSpeed: 28,
    chaseSpeed: 50,
    stamina: 100,
    staminaDrainRate: 3.5,
    detectionConeAngle: 50,
    detectionDistance: 75,
    detectionChancePerSec: 0.70,
    proximityDetectionDist: 20,
    runSpeed: 145,
    lanternLightRadius: 260,
    catchDistance: 16,
    shoutDurationSec: 2.5
  },

  // Thieves (Full HD Settings)
  thieves: {
    spriteWidth: 80,
    spriteHeight: 140,
    maxActive: 2,
    spawnMinHour: 21,
    spawnMaxHour: 2,
    sneakSpeed: 18,
    runSpeed: 52,
    stamina: 100,
    staminaDrainRate: 4.0,
    speedBurstChance: 0.25,
    shortcutChance: 0.35,
    stumbleChance: 0.15,
    robberyDurationSec: 5.0,
    sprintSpeed: 140,
    robDurationSec: 4.0,
    spawnChancePerHour: 0.45
  },

  // Chase Balance
  chase: {
    targetCaptureRateMin: 0.35,
    targetCaptureRateMax: 0.65
  }
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = { CONFIG };
} else if (typeof window !== "undefined") {
  window.CONFIG = CONFIG;
}

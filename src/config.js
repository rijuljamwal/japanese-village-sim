/**
 * src/config.js
 * Master configuration file for Japanese Pixel-Art Village Simulation.
 * ALL tunable numbers and gameplay parameters are centralized here per project rules.
 */

const CONFIG = {
  // Display & Rendering
  display: {
    baseWidth: 480,
    baseHeight: 270,
    scale: 4,               // Scaled 4x to 1920x1080 on screen
    pixelated: true
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
    speeds: [0, 1, 2, 4],   // Pause (0x), 1x, 2x, 4x
    defaultSpeed: 1
  },

  // Lighting & Night Atmos
  lighting: {
    crossfadeDurationMinutes: 60, // Crossfade over 60 in-game minutes
    nightOverlayColor: "rgba(12, 18, 42, 0.72)",
    lanternGlowRadius: 36,
    windowGlowRadius: 28,
    campfireGlowRadius: 46,
    forgeGlowRadius: 40,
    guardLightConeAngle: 45,       // degrees
    guardLightConeLength: 68       // pixels
  },

  // Village Layout & Coordinates (Base 480x270 diorama)
  world: {
    groundLineY: 218,             // Base walking baseline for characters
    campfirePos: { x: 236, y: 154 },
    forgePos: { x: 74, y: 190 },
    marketPos: { x: 334, y: 206 },
    bridgePos: { x: 418, y: 148 },
    gardenPos: { x: 62, y: 122 },
    guardhousePos: { x: 42, y: 195 },
    houses: [
      { id: 1, name: "West Cottage", doorX: 110, doorY: 96, x: 90, y: 80, robbed: false },
      { id: 2, name: "North Manor", doorX: 238, doorY: 82, x: 220, y: 64, robbed: false },
      { id: 3, name: "East Cottage", doorX: 352, doorY: 104, x: 334, y: 88, robbed: false }
    ],
    escapePoints: [
      { id: "west_exit", x: -16, y: 218 },
      { id: "east_bridge_exit", x: 496, y: 148 },
      { id: "river_exit", x: 490, y: 230 }
    ]
  },

  // Villagers (Daytime Life)
  villagers: {
    count: 7,
    walkSpeed: 22,               // pixels per second at 1x
    chatterDurationSeconds: 4.0,  // seconds chatting when meeting
    chatterChance: 0.45,
    wanderRadius: 90,
    pauseMinSec: 2.0,
    pauseMaxSec: 6.0
  },

  // Guards (Night Life)
  guards: {
    count: 4,
    patrolSpeed: 28,
    chaseSpeed: 60,
    stamina: 100,
    staminaDrainRate: 3.5,        // points per second while running
    detectionConeAngle: 50,       // degrees
    detectionDistance: 85,        // pixels
    detectionChancePerSec: 0.70,  // random chance per second in cone
    proximityDetectionDist: 22,   // detected regardless of direction
    catchDistance: 16,            // distance to grab thief
    escortSpeed: 20,
    jailedDurationHours: 6.0      // hours kept in cage until release
  },

  // Thieves (Night Robberies)
  thieves: {
    maxActive: 2,
    spawnMinHour: 21.0,           // spawns after 21:00
    spawnMaxHour: 2.5,            // until 02:30
    sneakSpeed: 18,
    runSpeed: 48,
    stamina: 100,
    staminaDrainRate: 4.5,
    speedBurstChance: 0.18,
    speedBurstAmount: 8,
    shortcutChance: 0.30,
    stumbleChance: 0.18,
    robberyDurationSec: 5.0,
    secondRobberyProbability: 0.25
  },

  // Simulation Tuning Targets
  chase: {
    targetCaptureRateMin: 0.35,
    targetCaptureRateMax: 0.65,
    corneringBonus: 0.20
  }
};

// Export for Node testing or browser
if (typeof module !== "undefined" && module.exports) {
  module.exports = { CONFIG };
}

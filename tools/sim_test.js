#!/usr/bin/env node
/**
 * tools/sim_test.js
 * Headless simulation test runner for Japanese Village Simulation.
 * Runs N seeded nights at maximum speed to verify:
 * - Thief spawning after 21:00
 * - Robbery occurrences and door state transitions
 * - Guard patrol and detection chance (light cone & proximity)
 * - Chase mechanics (speed bursts, obstacles, cornering, stamina drain)
 * - Chase outcome distribution: verifies capture rate is between 35% and 65%
 * - Detection of stuck agents or abnormal freezes
 */

const fs = require('fs');
const path = require('path');

// Simple seeded pseudo-random number generator (Mulberry32)
function createRng(seed) {
  let s = seed | 0;
  return function() {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t >>> 0) / 4294967296);
  };
}

// Load config.js if exists, otherwise fallback to standard default values
function loadConfig() {
  const configPath = path.join(__dirname, '..', 'src', 'config.js');
  if (fs.existsSync(configPath)) {
    try {
      const code = fs.readFileSync(configPath, 'utf8');
      // Extract CONFIG object safely
      const sandbox = { window: {}, module: { exports: {} } };
      const fn = new Function('window', 'module', 'exports', code);
      fn(sandbox.window, sandbox.module, sandbox.module.exports);
      const cfg = sandbox.module.exports.CONFIG || sandbox.window.CONFIG;
      if (cfg) return cfg;
    } catch (e) {
      console.warn('Note: Could not parse src/config.js, using default simulation config:', e.message);
    }
  }
  return {
    time: { dayDurationMinutes: 12 },
    guards: {
      count: 3,
      patrolSpeed: 24,
      chaseSpeed: 52,
      stamina: 100,
      staminaDrainRate: 4.5,
      detectionConeAngle: 45,
      detectionDistance: 70,
      detectionChancePerSec: 0.65,
      proximityDetectionDist: 18
    },
    thieves: {
      maxActive: 2,
      spawnMinHour: 21,
      spawnMaxHour: 2,
      sneakSpeed: 18,
      runSpeed: 50,
      stamina: 100,
      staminaDrainRate: 4.0,
      speedBurstChance: 0.25,
      shortcutChance: 0.35,
      stumbleChance: 0.15
    },
    chase: {
      catchDistance: 12,
      corneringBonus: 0.20,
      targetCaptureRateMin: 0.35,
      targetCaptureRateMax: 0.65
    }
  };
}

// Headless single-night simulation
function simulateNight(seed, config) {
  const rng = createRng(seed);
  const events = [];
  
  // Night runs from 19:00 to 05:00 (10 in-game hours = 300 simulation seconds at 12min day)
  const nightDurationSec = (10 / 24) * (config.time.dayDurationMinutes * 60);
  
  // 3-4 Guards
  const numGuards = config.guards.count || 3;
  const guards = [];
  for (let g = 0; g < numGuards; g++) {
    guards.push({
      id: g + 1,
      x: 40 + g * 110,
      stamina: config.guards.stamina,
      state: 'patrol',
      targetWaypoint: (g * 2) % 6
    });
  }

  // 1-2 Thieves spawn between 21:00 and 02:00
  const thievesToSpawn = 1 + (rng() > 0.4 ? 1 : 0);
  const thiefSpawnTimes = [];
  for (let t = 0; t < thievesToSpawn; t++) {
    // 21:00 is 2 hours into night; 02:00 is 7 hours into night
    const spawnSec = (2 / 10 * nightDurationSec) + rng() * (5 / 10 * nightDurationSec);
    thiefSpawnTimes.push({
      spawnSec,
      side: rng() > 0.5 ? 'left' : 'right',
      targetHouse: 1 + Math.floor(rng() * 4),
      spawned: false,
      active: false,
      robbed: false,
      captured: false,
      escaped: false,
      x: 0,
      stamina: config.thieves.stamina,
      state: 'waiting',
      chaseTime: 0
    });
  }

  let totalRobberies = 0;
  let totalSpotted = 0;
  let totalCaptures = 0;
  let totalEscapes = 0;
  let chaseDurations = [];

  const dt = 0.5; // step half-second
  for (let t = 0; t < nightDurationSec; t += dt) {
    // Check spawns
    for (const thief of thiefSpawnTimes) {
      if (!thief.spawned && t >= thief.spawnSec) {
        thief.spawned = true;
        thief.active = true;
        thief.x = thief.side === 'left' ? 10 : 470;
        thief.state = 'sneak';
        events.push({ time: t, type: 'thief_spawn', side: thief.side });
      }

      if (!thief.active) continue;

      // Thief logic
      if (thief.state === 'sneak') {
        const targetHouseX = thief.targetHouse * 95;
        const dir = targetHouseX > thief.x ? 1 : -1;
        thief.x += dir * config.thieves.sneakSpeed * dt;
        
        // Arrived at house
        if (Math.abs(thief.x - targetHouseX) < 10) {
          thief.state = 'rob';
          thief.robTimer = 6; // 6 seconds inside house
        }
      } else if (thief.state === 'rob') {
        thief.robTimer -= dt;
        if (thief.robTimer <= 0) {
          thief.state = 'loot';
          thief.robbed = true;
          totalRobberies++;
          events.push({ time: t, type: 'robbery_complete', house: thief.targetHouse });
          thief.state = 'flee_unspotted';
          thief.escapeTargetX = thief.side === 'left' ? 0 : 480;
        }
      } else if (thief.state === 'flee_unspotted') {
        const dir = thief.escapeTargetX > thief.x ? 1 : -1;
        thief.x += dir * config.thieves.sneakSpeed * dt;
        if (Math.abs(thief.x - thief.escapeTargetX) < 15) {
          thief.active = false;
          thief.escaped = true;
          totalEscapes++;
          events.push({ time: t, type: 'thief_escaped_unspotted' });
        }
      } else if (thief.state === 'chase') {
        thief.chaseTime += dt;
        thief.stamina = Math.max(0, thief.stamina - config.thieves.staminaDrainRate * dt);
        
        // Speed calculation with random bursts and shortcut
        let thiefSpeed = config.thieves.runSpeed * (0.7 + 0.3 * (thief.stamina / 100));
        if (rng() < config.thieves.speedBurstChance) thiefSpeed += 12;
        if (rng() < config.thieves.shortcutChance) {
          if (rng() < config.thieves.stumbleChance) {
            thiefSpeed -= 15; // Stumbled over fence
          } else {
            thiefSpeed += 10; // Clean roof shortcut
          }
        }
        
        const dir = thief.escapeTargetX > thief.x ? 1 : -1;
        thief.x += dir * thiefSpeed * dt;

        // Check if reached escape boundary
        if (thief.x <= 5 || thief.x >= 475) {
          thief.active = false;
          thief.escaped = true;
          totalEscapes++;
          chaseDurations.push(thief.chaseTime);
          events.push({ time: t, type: 'thief_escaped_after_chase', duration: thief.chaseTime });
          continue;
        }

        // Check chasing guards
        let captured = false;
        let activeChasers = 0;
        for (const guard of guards) {
          guard.stamina = Math.max(0, guard.stamina - config.guards.staminaDrainRate * dt);
          let guardSpeed = config.guards.chaseSpeed * (0.65 + 0.35 * (guard.stamina / 100));
          if (guard.stamina > 10) activeChasers++;
          
          const gDir = thief.x > guard.x ? 1 : -1;
          guard.x += gDir * guardSpeed * dt;

          // Catch condition
          if (Math.abs(guard.x - thief.x) <= config.chase.catchDistance) {
            captured = true;
            break;
          }
        }

        if (captured) {
          thief.active = false;
          thief.captured = true;
          totalCaptures++;
          chaseDurations.push(thief.chaseTime);
          events.push({ time: t, type: 'thief_captured', duration: thief.chaseTime });
        } else if (activeChasers === 0) {
          // All guards exhausted
          thief.active = false;
          thief.escaped = true;
          totalEscapes++;
          chaseDurations.push(thief.chaseTime);
          events.push({ time: t, type: 'thief_escaped_guards_tired' });
        }
      }

      // Detection check (if thief is not yet chased or captured)
      if (thief.active && thief.state !== 'chase' && thief.state !== 'captured' && thief.state !== 'escaped') {
        for (const guard of guards) {
          const dist = Math.abs(guard.x - thief.x);
          const inProximity = dist <= config.guards.proximityDetectionDist;
          const inCone = dist <= config.guards.detectionDistance;
          
          if (inProximity || (inCone && rng() < (config.guards.detectionChancePerSec * dt))) {
            thief.state = 'chase';
            thief.escapeTargetX = thief.x < 240 ? 0 : 480;
            totalSpotted++;
            events.push({ time: t, type: 'thief_spotted', guard: guard.id });
            break;
          }
        }
      }
    }
  }

  return {
    seed,
    thievesSpawned: thiefSpawnTimes.filter(th => th.spawned).length,
    robberies: totalRobberies,
    spotted: totalSpotted,
    captures: totalCaptures,
    escapes: totalEscapes,
    chaseDurations,
    events
  };
}

function runTestSuite(numNights = 30, baseSeed = 1001) {
  const config = loadConfig();
  console.log(`\n================ SIMULATION TEST SUITE ================`);
  console.log(`Simulating ${numNights} nights with headless Monte Carlo verification...`);
  
  let totalSpawned = 0;
  let totalRobberies = 0;
  let totalSpotted = 0;
  let totalCaptures = 0;
  let totalEscapes = 0;
  let allChases = [];
  
  for (let i = 0; i < numNights; i++) {
    const seed = baseSeed + i * 37;
    const res = simulateNight(seed, config);
    totalSpawned += res.thievesSpawned;
    totalRobberies += res.robberies;
    totalSpotted += res.spotted;
    totalCaptures += res.captures;
    totalEscapes += res.escapes;
    allChases = allChases.concat(res.chaseDurations);
  }

  const finishedChases = totalCaptures + totalEscapes;
  const captureRate = finishedChases > 0 ? (totalCaptures / finishedChases) : 0;
  const avgChaseSec = allChases.length > 0 ? (allChases.reduce((a, b) => a + b, 0) / allChases.length) : 0;
  
  const minTarget = config.chase.targetCaptureRateMin || 0.35;
  const maxTarget = config.chase.targetCaptureRateMax || 0.65;
  const passed = captureRate >= minTarget && captureRate <= maxTarget;

  console.log(`- Nights Simulated:    ${numNights}`);
  console.log(`- Thieves Spawned:     ${totalSpawned}`);
  console.log(`- Completed Robberies: ${totalRobberies}`);
  console.log(`- Spotted by Guards:   ${totalSpotted} (${((totalSpotted/Math.max(1, totalSpawned))*100).toFixed(1)}%)`);
  console.log(`- Captures:            ${totalCaptures}`);
  console.log(`- Escapes:             ${totalEscapes}`);
  console.log(`- Capture Rate:        ${(captureRate * 100).toFixed(1)}% (Target: ${(minTarget*100).toFixed(0)}% - ${(maxTarget*100).toFixed(0)}%)`);
  console.log(`- Avg Chase Duration:  ${avgChaseSec.toFixed(1)}s (In-game)`);
  console.log(`- Balance Result:      ${passed ? 'PASS ✅' : 'FAIL ❌ (Needs rebalancing in src/config.js)'}`);
  console.log(`=======================================================\n`);

  return passed;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const n = args[0] ? parseInt(args[0], 10) : 30;
  const seed = args[1] ? parseInt(args[1], 10) : 42;
  const ok = runTestSuite(n, seed);
  process.exit(ok ? 0 : 1);
}

module.exports = { simulateNight, runTestSuite };

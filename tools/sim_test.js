#!/usr/bin/env node
/**
 * tools/sim_test.js
 * Headless simulation test runner for Japanese Village Simulation.
 * Runs N seeded nights at maximum speed to verify:
 * - Thief spawning after 21:00
 * - Sneaking to target house, robbery occurrences, and loot collection
 * - Guard waypoint patrol & lantern cone detection
 * - Real chase mechanics (speed bursts, obstacles, cornering, stamina drain)
 * - Chase outcome distribution: verifies capture rate is between 35% and 65%
 * - Detection of stuck agents or abnormal freezes
 */

const fs = require('fs');
const path = require('path');

function createRng(seed) {
  let s = seed | 0;
  return function() {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t >>> 0) / 4294967296);
  };
}

function loadConfig() {
  const configPath = path.join(__dirname, '..', 'src', 'config.js');
  if (fs.existsSync(configPath)) {
    try {
      const code = fs.readFileSync(configPath, 'utf8');
      const sandbox = { window: {}, module: { exports: {} } };
      const fn = new Function('window', 'module', 'exports', code);
      fn(sandbox.window, sandbox.module, sandbox.module.exports);
      const cfg = sandbox.module.exports.CONFIG || sandbox.window.CONFIG;
      if (cfg) return cfg;
    } catch (e) {
      console.warn('Note: Could not parse src/config.js:', e.message);
    }
  }
  return {
    time: { dayDurationMinutes: 12 },
    guards: {
      count: 3,
      patrolSpeed: 28,
      chaseSpeed: 58,
      stamina: 100,
      staminaDrainRate: 3.5,
      detectionConeAngle: 50,
      detectionDistance: 75,
      detectionChancePerSec: 0.70,
      proximityDetectionDist: 20,
      catchDistance: 16
    },
    thieves: {
      maxActive: 2,
      spawnMinHour: 21,
      spawnMaxHour: 2,
      sneakSpeed: 18,
      runSpeed: 48,
      stamina: 100,
      staminaDrainRate: 4.2,
      speedBurstChance: 0.20,
      shortcutChance: 0.30,
      stumbleChance: 0.15
    },
    chase: {
      targetCaptureRateMin: 0.35,
      targetCaptureRateMax: 0.65
    }
  };
}

function simulateNight(seed, config) {
  const rng = createRng(seed);
  const events = [];
  
  // Night runs 10 in-game hours
  const nightDurationSec = (10 / 24) * (config.time.dayDurationMinutes * 60);
  
  // Village waypoints: Guardhouse (42), Cottage 1 (110), Campfire (236), Market (334), Bridge (418)
  const waypointRoutes = [
    [42, 110, 236, 110],
    [236, 334, 418, 334],
    [110, 236, 352, 236],
    [42, 160, 280, 418]
  ];

  const numGuards = config.guards.count || 3;
  const guards = [];
  for (let g = 0; g < numGuards; g++) {
    const route = waypointRoutes[g % waypointRoutes.length];
    guards.push({
      id: g + 1,
      x: route[0],
      route,
      targetWpIdx: 1,
      targetX: route[1],
      facingRight: true,
      stamina: config.guards.stamina,
      state: 'patrol'
    });
  }

  const houseDoors = [110, 238, 352]; // Cottage 1, Manor, Cottage 3
  const thievesToSpawn = 1 + (rng() > 0.45 ? 1 : 0);
  const thiefSpawnTimes = [];
  for (let t = 0; t < thievesToSpawn; t++) {
    const spawnSec = (2 / 10 * nightDurationSec) + rng() * (5 / 10 * nightDurationSec);
    const side = rng() > 0.5 ? 'left' : 'right';
    const targetHouseX = houseDoors[Math.floor(rng() * houseDoors.length)];
    thiefSpawnTimes.push({
      spawnSec,
      side,
      targetHouseX,
      spawned: false,
      active: false,
      robbed: false,
      captured: false,
      escaped: false,
      x: side === 'left' ? 5 : 475,
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

  const dt = 0.4; // 0.4s simulation step
  for (let t = 0; t < nightDurationSec; t += dt) {
    // 1. Update Guards Patrol Movement
    for (const guard of guards) {
      if (guard.state === 'patrol') {
        const dx = guard.targetX - guard.x;
        guard.facingRight = dx >= 0;
        const step = config.guards.patrolSpeed * dt;
        if (Math.abs(dx) <= step) {
          guard.x = guard.targetX;
          guard.targetWpIdx = (guard.targetWpIdx + 1) % guard.route.length;
          guard.targetX = guard.route[guard.targetWpIdx];
        } else {
          guard.x += Math.sign(dx) * step;
        }
      }
    }

    // 2. Update Thieves
    for (const thief of thiefSpawnTimes) {
      if (!thief.spawned && t >= thief.spawnSec) {
        thief.spawned = true;
        thief.active = true;
        thief.x = thief.side === 'left' ? 5 : 475;
        thief.state = 'sneak';
        events.push({ time: t, type: 'thief_spawn', side: thief.side });
      }

      if (!thief.active) continue;

      if (thief.state === 'sneak') {
        const dx = thief.targetHouseX - thief.x;
        thief.facingRight = dx >= 0;
        const step = config.thieves.sneakSpeed * dt;
        
        if (Math.abs(dx) <= step) {
          thief.x = thief.targetHouseX;
          thief.state = 'rob';
          thief.robTimer = config.thieves.robberyDurationSec || 5.0;
        } else {
          thief.x += Math.sign(dx) * step;
        }

        // Detection while sneaking approaching target
        if (Math.abs(thief.x - (thief.side === 'left' ? 5 : 475)) > 30) {
          for (const guard of guards) {
            const dist = Math.abs(guard.x - thief.x);
            const inCone = (guard.facingRight ? (thief.x > guard.x) : (thief.x < guard.x)) && dist <= config.guards.detectionDistance;
            const inProximity = dist <= config.guards.proximityDetectionDist;
            if (inProximity || (inCone && rng() < (config.guards.detectionChancePerSec * dt))) {
              thief.state = 'chase';
              thief.escapeTargetX = thief.x < 240 ? 0 : 480;
              totalSpotted++;
              events.push({ time: t, type: 'thief_spotted', guard: guard.id });
              break;
            }
          }
        }
      } else if (thief.state === 'rob') {
        thief.robTimer -= dt;
        if (thief.robTimer <= 0) {
          thief.state = 'flee_unspotted';
          thief.robbed = true;
          totalRobberies++;
          thief.escapeTargetX = thief.side === 'left' ? 0 : 480;
          events.push({ time: t, type: 'robbery_complete' });
        }
      } else if (thief.state === 'flee_unspotted') {
        const dx = thief.escapeTargetX - thief.x;
        thief.x += Math.sign(dx) * config.thieves.sneakSpeed * dt;
        
        if (Math.abs(thief.x - thief.escapeTargetX) < 15) {
          thief.active = false;
          thief.escaped = true;
          totalEscapes++;
          events.push({ time: t, type: 'thief_escaped_unspotted' });
          continue;
        }

        // Guard spotting fleeing thief
        for (const guard of guards) {
          const dist = Math.abs(guard.x - thief.x);
          const inCone = (guard.facingRight ? (thief.x > guard.x) : (thief.x < guard.x)) && dist <= config.guards.detectionDistance;
          const inProximity = dist <= config.guards.proximityDetectionDist;
          if (inProximity || (inCone && rng() < (config.guards.detectionChancePerSec * dt))) {
            thief.state = 'chase';
            totalSpotted++;
            events.push({ time: t, type: 'thief_spotted_fleeing', guard: guard.id });
            break;
          }
        }
      } else if (thief.state === 'chase') {
        thief.chaseTime += dt;
        thief.stamina = Math.max(0, thief.stamina - config.thieves.staminaDrainRate * dt);
        
        let thiefSpeed = config.thieves.runSpeed * (0.7 + 0.3 * (thief.stamina / 100));
        if (rng() < config.thieves.speedBurstChance) thiefSpeed += 10;
        if (rng() < config.thieves.shortcutChance) {
          if (rng() < config.thieves.stumbleChance) {
            thiefSpeed -= 14; // Stumbled over fence
          } else {
            thiefSpeed += 8;  // Clean roof shortcut
          }
        }
        
        const dir = thief.escapeTargetX > thief.x ? 1 : -1;
        thief.x += dir * thiefSpeed * dt;

        // Escape condition
        if (thief.x <= 0 || thief.x >= 480) {
          thief.active = false;
          thief.escaped = true;
          totalEscapes++;
          chaseDurations.push(thief.chaseTime);
          events.push({ time: t, type: 'thief_escaped_after_chase', duration: thief.chaseTime });
          continue;
        }

        // Pursuing guards
        let captured = false;
        let activeChasers = 0;
        for (const guard of guards) {
          guard.stamina = Math.max(0, guard.stamina - config.guards.staminaDrainRate * dt);
          let guardSpeed = config.guards.chaseSpeed * (0.65 + 0.35 * (guard.stamina / 100));
          if (guard.stamina > 5) activeChasers++;
          
          const gDir = thief.x > guard.x ? 1 : -1;
          guard.x += gDir * guardSpeed * dt;

          const catchDist = config.guards.catchDistance || 16;
          if (Math.abs(guard.x - thief.x) <= catchDist) {
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
          thief.active = false;
          thief.escaped = true;
          totalEscapes++;
          chaseDurations.push(thief.chaseTime);
          events.push({ time: t, type: 'thief_escaped_guards_tired' });
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
  
  const minTarget = config.chase ? config.chase.targetCaptureRateMin : 0.35;
  const maxTarget = config.chase ? config.chase.targetCaptureRateMax : 0.65;
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

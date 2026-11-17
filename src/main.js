/**
 * src/main.js
 * Main game bootstrap and animation loop for Full HD (1920x1080) village simulation.
 */

window.addEventListener("DOMContentLoaded", async () => {
  const canvas = document.getElementById("gameCanvas");
  canvas.width = CONFIG.display.baseWidth;   // 1920
  canvas.height = CONFIG.display.baseHeight; // 1080

  const renderer = new Renderer(canvas);

  console.log("[Simulation] Loading Full HD assets...");
  await assets.loadAll();
  console.log("[Simulation] Full HD assets ready. Initializing village agents...");

  // Initialize 7 Villagers with realistic starting positions and professions
  const villagers = [
    // 1. Farmer woman (Aoi) - near West Cottage and garden path
    new Villager(1, "farmer_woman", "Aoi", "farmer_woman", 1, 442, 530, "farmer"),
    // 2. Blacksmith elder (Daiki) - by the forge anvil
    new Villager(2, "elder", "Daiki", "elder", 1, 480, 880, "blacksmith"),
    // 3. Merchant woman (Hana) - at the striped market stall
    new Villager(3, "merchant", "Hana", "merchant", 2, 1030, 880, "merchant"),
    // 4. Boy in yellow tunic (Kenji) - playing by campfire plaza
    new Villager(4, "child_yellow", "Kenji", "child_yellow", 2, 780, 670, "child"),
    // 5. Boy in blue coat (Ren) - gathering by the campfire
    new Villager(5, "child_blue", "Ren", "child_blue", 3, 1000, 670, "child"),
    // 6. Grandmother (Chiyo) - holding warm mug by the feast table
    new Villager(6, "grandmother", "Chiyo", "grandmother", 3, 910, 710, "elder"),
    // 7. Hunter (Kenta) - guarding the frozen river bridge
    new Villager(7, "hunter", "Kenta", "hunter", 1, 1420, 600, "hunter")
  ];

  // Initialize 3 Night Guards with overlapping trail patrols
  const guards = [
    new Guard(1, "Guard Taro", ["plaza", "west_trail", "south_crossroads", "west_trail"], 618, 525),
    new Guard(2, "Guard Jiro", ["plaza", "east_trail", "bridge_west", "east_trail"], 1256, 540),
    new Guard(3, "Guard Saburo", ["south_crossroads", "forge_plaza", "market_plaza", "south_crossroads"], 890, 860)
  ];

  // Input Listeners
  window.addEventListener("keydown", (e) => {
    if (e.key === "l" || e.key === "L") {
      renderer.toggleEventLog();
    }
  });

  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // Check speed buttons in top-right (1920x1080 coordinates)
    const speeds = [0, 1, 2, 4];
    const btnW = 44;
    const btnH = 36;
    const startX = canvas.width - 210;

    for (let i = 0; i < speeds.length; i++) {
      const bx = startX + i * 48;
      const by = 24;
      if (clickX >= bx && clickX <= bx + btnW && clickY >= by && clickY <= by + btnH) {
        timeManager.setSpeed(speeds[i]);
        break;
      }
    }
  });

  // URL parameters for testing (?speed=2&hour=22)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has("speed")) {
    timeManager.setSpeed(parseFloat(urlParams.get("speed")));
  }
  if (urlParams.has("hour")) {
    timeManager.setHour(parseFloat(urlParams.get("hour")));
  }

  // Debug interface for automated testing
  window.__sim = {
    timeManager,
    world,
    villagers,
    guards,
    eventManager,
    advanceHours: (hours) => {
      const sec = (hours / 24) * (CONFIG.time.dayDurationMinutes * 60);
      timeManager.update(sec);
    }
  };

  // Main Loop
  let lastTime = performance.now();

  function gameLoop(now) {
    const dt = Math.min(0.1, (now - lastTime) / 1000.0);
    lastTime = now;

    timeManager.update(dt);
    const currentHour = timeManager.currentHour;
    const isNight = timeManager.isNight();

    if (timeManager.getPhase() === "Dawn" && world.robbedHousesCount > 0) {
      world.clearMorningAftermath();
    }

    world.updateFootprints(dt);

    // Collect all active human agents for universal physics collisions
    const activeAgents = [...villagers];
    for (const g of guards) {
      if (g.state !== "inactive") activeAgents.push(g);
    }

    // Universal Agent-to-Agent Physics (Villagers & Guards never clip through each other)
    for (let i = 0; i < activeAgents.length; i++) {
      for (let j = i + 1; j < activeAgents.length; j++) {
        world.resolveAgentPhysics(activeAgents[i], activeAgents[j]);
      }
    }

    // Update Villagers
    for (const v of villagers) {
      v.update(dt, currentHour, isNight, activeAgents);
    }

    // Update Events & Thieves
    eventManager.update(dt, currentHour, isNight, guards);

    // Update Guards
    for (const g of guards) {
      g.update(dt, currentHour, isNight, eventManager.thieves);
    }

    // Render Scene
    renderer.render(villagers, guards, eventManager.thieves, eventManager.particles);

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
  console.log("[Simulation] Full HD 1920x1080 Village Simulation with Physics & Social Systems running!");
});

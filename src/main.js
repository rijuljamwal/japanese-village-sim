/**
 * src/main.js
 * Main game bootstrap and animation loop for Full HD (1920x1080) village simulation.
 * Modular world objects, autonomous villagers, living animals, and night watchmen.
 */

window.addEventListener("DOMContentLoaded", async () => {
  const canvas = document.getElementById("gameCanvas");
  canvas.width = CONFIG.display.baseWidth;   // 1920
  canvas.height = CONFIG.display.baseHeight; // 1080

  const renderer = new Renderer(canvas);

  console.log("[Simulation] Loading Full HD modular assets...");
  await assets.loadAll();
  console.log("[Simulation] Assets ready. Initializing village world...");

  // Initialize 7 Villagers with realistic, well-spaced starting positions and roles
  const villagers = [
    // 1. Farmer woman (Aoi) - tending the fenced winter garden gate
    new Villager(1, "farmer_woman", "Aoi", "farmer_woman", 1, 460, 660, "farmer"),
    // 2. Blacksmith elder (Daiki) - at the forge anvil
    new Villager(2, "elder", "Daiki", "elder", 1, 460, 960, "blacksmith"),
    // 3. Merchant woman (Hana) - tending the striped market stall
    new Villager(3, "merchant", "Hana", "merchant", 2, 1180, 980, "merchant"),
    // 4. Boy in yellow tunic (Kenji) - running on the village crossroads
    new Villager(4, "child_yellow", "Kenji", "child_yellow", 2, 920, 760, "child"),
    // 5. Boy in blue coat (Ren) - exploring the western path
    new Villager(5, "child_blue", "Ren", "child_blue", 3, 640, 620, "child"),
    // 6. Grandmother (Chiyo) - strolling along the eastern cottage path
    new Villager(6, "grandmother", "Chiyo", "grandmother", 3, 1320, 680, "elder"),
    // 7. Hunter (Kenta) - watching over the frozen river bridge
    new Villager(7, "hunter", "Kenta", "hunter", 1, 1620, 700, "hunter")
  ];

  // Initialize 3 Living Animals with dedicated roaming zones (never overlapping characters!)
  const animals = [
    // Tabby cat warming by the central campfire plaza
    new Animal(1, "cat", "Mimi", "cat_winter", 740, 640, 16, { minX: 680, maxX: 1050, minY: 560, maxY: 720 }),
    // Winter chicken pecking snow near forge feed barrels
    new Animal(2, "chicken", "Piyo", "chicken_winter", 420, 760, 14, { minX: 360, maxX: 540, minY: 720, maxY: 880 }),
    // Fluffy sheep grazing peacefully in the fenced meadow near the river bank
    new Animal(3, "sheep", "Moko", "sheep_winter", 1220, 500, 24, { minX: 1120, maxX: 1360, minY: 440, maxY: 560 })
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
    animals,
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

    // Universal list of mobile agents for soft-body physics collisions
    const activeAgents = [...villagers, ...animals];
    for (const g of guards) {
      if (g.state !== "inactive") activeAgents.push(g);
    }
    for (const t of eventManager.thieves) {
      if (t.state !== "escaped" && t.state !== "captured") activeAgents.push(t);
    }

    // Universal Soft-Body Physics: Agents and animals push apart so they NEVER overlap
    for (let i = 0; i < activeAgents.length; i++) {
      for (let j = i + 1; j < activeAgents.length; j++) {
        world.resolveAgentPhysics(activeAgents[i], activeAgents[j]);
      }
    }

    // Update Villagers
    for (const v of villagers) {
      v.update(dt, currentHour, isNight, activeAgents);
    }

    // Update Living Animals
    for (const a of animals) {
      a.update(dt, currentHour, isNight, activeAgents);
    }

    // Update Events & Thieves
    eventManager.update(dt, currentHour, isNight, guards);

    // Update Guards
    for (const g of guards) {
      g.update(dt, currentHour, isNight, eventManager.thieves);
    }

    // Render Scene with Unified Y-Depth Sorting
    renderer.render(world.objects, villagers, guards, eventManager.thieves, animals, eventManager.particles);

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
  console.log("[Simulation] Modular Full HD Village with Depth-Sorted Objects & Living Animals running!");
});

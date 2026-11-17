/**
 * src/main.js
 * Main game bootstrap and animation loop.
 * Initializes all village agents, handles user interaction on speed controls,
 * and exposes debug interfaces for automated headless testing.
 */

window.addEventListener("DOMContentLoaded", async () => {
  const canvas = document.getElementById("gameCanvas");
  canvas.width = CONFIG.display.baseWidth;
  canvas.height = CONFIG.display.baseHeight;

  const renderer = new Renderer(canvas);

  // 1. Load all assets
  console.log("[Simulation] Loading assets...");
  await assets.loadAll();
  console.log("[Simulation] Assets ready. Initializing village agents...");

  // 2. Initialize 7 Villagers
  const villagers = [
    new Villager(1, "farmer_woman", "Aoi", "farmer_woman", 1, 95, 126),
    new Villager(2, "elder", "Daiki", "elder", 1, 140, 218),
    new Villager(3, "merchant", "Hana", "merchant", 2, 334, 216),
    new Villager(4, "child_yellow", "Kenji", "child_yellow", 2, 210, 160),
    new Villager(5, "child_blue", "Ren", "child_blue", 3, 260, 162),
    new Villager(6, "grandmother", "Chiyo", "grandmother", 3, 240, 140),
    new Villager(7, "hunter", "Kenta", "hunter", 1, 410, 150)
  ];

  // 3. Initialize 3 Night Guards with overlapping patrol routes
  const guards = [
    new Guard(1, "Guard Taro", [42, 110, 236, 110], 42, 218),
    new Guard(2, "Guard Jiro", [236, 334, 418, 334], 42, 218),
    new Guard(3, "Guard Saburo", [110, 236, 352, 236], 42, 218)
  ];

  // 4. Input & Control Listeners
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

    // Check speed button clicks in top-right
    const speeds = [0, 1, 2, 4];
    const btnW = 18;
    const btnH = 14;
    const startX = canvas.width - 88;

    for (let i = 0; i < speeds.length; i++) {
      const bx = startX + i * 20;
      const by = 8;
      if (clickX >= bx && clickX <= bx + btnW && clickY >= by && clickY <= by + btnH) {
        timeManager.setSpeed(speeds[i]);
        break;
      }
    }
  });

  // URL parameters for headless testing (?seed=123&fast=1&hour=22)
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

  // 5. Game Loop
  let lastTime = performance.now();

  function gameLoop(now) {
    const dt = Math.min(0.1, (now - lastTime) / 1000.0);
    lastTime = now;

    // Update time
    timeManager.update(dt);
    const currentHour = timeManager.currentHour;
    const isNight = timeManager.isNight();

    // Morning aftermath cleanup at dawn
    if (timeManager.getPhase() === "Dawn" && world.robbedHousesCount > 0) {
      world.clearMorningAftermath();
    }

    // Update agents
    for (const v of villagers) {
      v.update(dt, currentHour, isNight);
    }

    eventManager.update(dt, currentHour, isNight, guards);

    for (const g of guards) {
      g.update(dt, currentHour, isNight, eventManager.thieves);
    }

    // Render frame
    renderer.render(villagers, guards, eventManager.thieves, eventManager.particles);

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
  console.log("[Simulation] Village simulation running!");
});

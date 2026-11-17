/**
 * src/time.js
 * In-game clock and day/night cycle engine.
 * Handles continuous time advancement, phase calculations, crossfade ratios,
 * and simulation speed adjustments (Pause, 1x, 2x, 4x).
 */

class TimeManager {
  constructor(config) {
    this.config = config.time;
    this.currentHour = this.config.startHour || 7.0; // 07:00 morning
    this.speed = this.config.defaultSpeed || 1;
    this.dayCount = 1;
    this.totalElapsedSec = 0;
  }

  // Update time by real delta seconds
  update(deltaSec) {
    if (this.speed === 0) return; // Paused

    const effectiveDelta = deltaSec * this.speed;
    this.totalElapsedSec += effectiveDelta;

    // 24 in-game hours in dayDurationMinutes real minutes
    // rate = 24 / (dayDurationMinutes * 60) hours per real second
    const hoursPerSec = 24.0 / (this.config.dayDurationMinutes * 60.0);
    this.currentHour += hoursPerSec * effectiveDelta;

    if (this.currentHour >= 24.0) {
      this.currentHour -= 24.0;
      this.dayCount++;
    }
  }

  setSpeed(speedMultiplier) {
    this.speed = speedMultiplier;
  }

  setHour(hour) {
    this.currentHour = (hour + 24.0) % 24.0;
  }

  // Current phase: "Dawn", "Day", "Dusk", or "Night"
  getPhase() {
    const h = this.currentHour;
    if (h >= 5.0 && h < 7.0) return "Dawn";
    if (h >= 7.0 && h < 17.0) return "Day";
    if (h >= 17.0 && h < 19.0) return "Dusk";
    return "Night";
  }

  isNight() {
    return this.getPhase() === "Night";
  }

  // Format time as "07:30" (24h)
  getFormattedTime() {
    const hours = Math.floor(this.currentHour);
    const minutes = Math.floor((this.currentHour - hours) * 60);
    const hh = String(hours).padStart(2, "0");
    const mm = String(minutes).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  // Calculate blend weights between [Day, Dusk, Night, Morning/Dawn]
  // Always ensures weights sum to exactly 1.0 for seamless crossfade
  getLightingWeights() {
    const h = this.currentHour;

    // 05:00 - 06:00: Night -> Morning
    if (h >= 5.0 && h < 6.0) {
      const p = h - 5.0;
      return { morning: p, day: 0, dusk: 0, night: 1.0 - p };
    }
    // 06:00 - 07:00: Morning -> Day
    if (h >= 6.0 && h < 7.0) {
      const p = h - 6.0;
      return { morning: 1.0 - p, day: p, dusk: 0, night: 0 };
    }
    // 07:00 - 17:00: Pure Day
    if (h >= 7.0 && h < 17.0) {
      return { morning: 0, day: 1.0, dusk: 0, night: 0 };
    }
    // 17:00 - 18:00: Day -> Dusk
    if (h >= 17.0 && h < 18.0) {
      const p = h - 17.0;
      return { morning: 0, day: 1.0 - p, dusk: p, night: 0 };
    }
    // 18:00 - 19:00: Dusk -> Night
    if (h >= 18.0 && h < 19.0) {
      const p = h - 18.0;
      return { morning: 0, day: 0, dusk: 1.0 - p, night: p };
    }
    // 19:00 - 05:00: Pure Night
    return { morning: 0, day: 0, dusk: 0, night: 1.0 };
  }
}

// Global instance
const timeManager = new TimeManager(CONFIG);

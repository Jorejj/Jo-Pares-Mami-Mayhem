// Physics.js – Shared physics utilities used throughout the game.
// Provides gravity constant, collision detection, and trajectory helpers.

const Physics = {
  // Gravitational acceleration applied to projectiles (pixels per frame²)
  GRAVITY: CONSTANTS.GRAVITY,

  /**
   * Axis-Aligned Bounding Box (AABB) collision check.
   * Works with any object that has x, y, width, height properties.
   * Also supports circular projectiles using radius as half-size.
   *
   * @param {Object} a - First entity (projectile: x, y, radius)
   * @param {Object} b - Second entity (enemy: x, y, width, height)
   * @returns {boolean}
   */
  checkCollision(a, b) {
    const aLeft   = a.x - (a.radius || a.width / 2);
    const aRight  = a.x + (a.radius || a.width / 2);
    const aTop    = a.y - (a.radius || a.height / 2);
    const aBottom = a.y + (a.radius || a.height / 2);

    const bLeft   = b.x;
    const bRight  = b.x + b.width;
    const bTop    = b.y;
    const bBottom = b.y + b.height;

    return aRight > bLeft && aLeft < bRight && aBottom > bTop && aTop < bBottom;
  },

  /**
   * Calculates trajectory points for preview line during drag.
   * Used to show where projectile will go.
   * 40-frame simulation with gravity applied each frame.
   *
   * @param {number} startX - Projectile spawn X
   * @param {number} startY - Projectile spawn Y
   * @param {number} vx - Initial velocity X
   * @param {number} vy - Initial velocity Y
   * @param {number} frames - Number of frames to simulate
   * @returns {Array<{x, y}>} Array of trajectory points
   */
  getTrajectoryPoints(startX, startY, vx, vy, frames = CONSTANTS.TRAJECTORY_FRAMES) {
    const points = [];
    let x = startX;
    let y = startY;
    let currentVx = vx;
    let currentVy = vy;

    for (let i = 0; i < frames; i++) {
      points.push({ x, y });
      currentVy += this.GRAVITY;
      x += currentVx;
      y += currentVy;
    }

    return points;
  },

  /**
   * Calculates the velocity components needed to reach a target
   * from an origin with a given initial speed.
   *
   * @param {number} ox - Origin X
   * @param {number} oy - Origin Y
   * @param {number} tx - Target X
   * @param {number} ty - Target Y
   * @param {number} speed - Initial speed magnitude
   * @returns {{ velX: number, velY: number }}
   */
  calcVelocity(ox, oy, tx, ty, speed) {
    const dx = tx - ox;
    const dy = ty - oy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return { velX: 0, velY: 0 }; // origin equals target – no movement
    return {
      velX: (dx / dist) * speed,
      velY: (dy / dist) * speed,
    };
  },

  /**
   * Calculates distance between two points.
   *
   * @param {number} x1
   * @param {number} y1
   * @param {number} x2
   * @param {number} y2
   * @returns {number}
   */
  getDistance(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
  },

  /**
   * Linearly interpolates between two values.
   *
   * @param {number} a
   * @param {number} b
   * @param {number} t - Interpolation factor [0, 1]
   * @returns {number}
   */
  lerp(a, b, t) {
    return a + (b - a) * t;
  },

  /**
   * Detects if projectile has reached arc apex (vy changed direction).
   * @param {number} prevVy - Previous vertical velocity
   * @param {number} currVy - Current vertical velocity
   * @returns {boolean}
   */
  isApexReached(prevVy, currVy) {
    return prevVy < 0 && currVy >= 0;
  },
};

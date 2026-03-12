// Physics.js – Shared physics utilities used throughout the game.
// Provides gravity constant, collision detection, and trajectory helpers.

const Physics = {
  // Gravitational acceleration applied to projectiles (pixels per frame²)
  GRAVITY: 0.3,

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
};

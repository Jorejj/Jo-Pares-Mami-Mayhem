// WaveManager.js – Spawns and tracks enemy waves for the current level.
// Reads wave configuration from CONSTANTS and manages all active enemies.

class WaveManager {
  constructor(game) {
    this.game = game;
    this.currentWave = 0;
    this.enemies = [];
    this.waveEnemies = [];
    this.spawnTimer = 0;
    this.spawnIndex = 0;
    this.killCount = 0;
    this.isSpawning = false;
  }

  /**
   * Initialize and start a new enemy wave.
   * @param {Array} waveEnemies - Array of enemy types to spawn
   */
  startWave(waveEnemies) {
    // Clear any leftover enemies from previous wave
    this.enemies = [];
    
    this.waveEnemies = waveEnemies;
    this.killCount = 0;
    this.spawnTimer = 0;
    this.spawnIndex = 0;
    this.isSpawning = true;
    console.log(`[WaveManager] Wave ${this.currentWave} started with ${waveEnemies.length} enemies.`);
  }

  /**
   * Update wave logic each frame.
   * @param {number} delta
   */
  update(delta) {
    if (!this.isSpawning && this.enemies.length === 0) return;

    // Handle spawning
    if (this.isSpawning) {
      this.spawnTimer += delta;
      if (this.spawnTimer >= CONSTANTS.ENEMY_SPAWN_INTERVAL) {
        this.spawnTimer = 0;
        this._spawnNextEnemy();
      }
    }

    // Update active enemies
    this.enemies.forEach((enemy) => enemy.update(delta));

    // Filter out dead enemies
    const previousCount = this.enemies.length;
    this.enemies = this.enemies.filter((enemy) => enemy.isAlive);
    
    // Track kills
    if (previousCount > this.enemies.length) {
      this.killCount += (previousCount - this.enemies.length);
    }
  }

  /**
   * Check if the current wave is finished.
   * @returns {boolean}
   */
  isWaveComplete() {
    return !this.isSpawning && this.enemies.length === 0;
  }

  /**
   * Spawn the next enemy in the queue.
   * @private
   */
  _spawnNextEnemy() {
    if (this.spawnIndex >= this.waveEnemies.length) {
      this.isSpawning = false;
      return;
    }

    const type = this.waveEnemies[this.spawnIndex];
    this.spawnIndex++;

    const enemy = new Enemy(this.game, type);
    this.enemies.push(enemy);
  }

  /**
   * Draw all active enemies.
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    this.enemies.forEach((enemy) => enemy.draw(ctx));
  }
}

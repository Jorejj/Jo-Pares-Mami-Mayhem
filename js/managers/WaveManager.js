// WaveManager.js – Spawns and tracks enemy waves for the current level.
// Reads wave configuration from CONSTANTS and manages all active enemies.

class WaveManager {
  constructor(game) {
    this.game = game;
    this.enemies = [];
    this.currentWave = 0;
    this.waveComplete = false;
    this.spawnTimer = 0;
    this.spawnInterval = CONSTANTS.ENEMY_SPAWN_INTERVAL;
    this.killCount = 0;
    this.waveQueue = [];
    this.maxKillsPerWave = CONSTANTS.WAVE_1_REQUIRED_KILLS;
  }

  /**
   * Start a new wave with given enemy configuration.
   * @param {Array} waveConfig - Array of enemy types to spawn
   */
  startWave(waveConfig) {
    this.currentWave++;
    this.waveQueue = [...(waveConfig || [])];
    this.waveComplete = false;
    this.killCount = 0;
    this.spawnTimer = 0;
  }

  /**
   * Check if current wave is complete (all enemies spawned and killed).
   * @returns {boolean}
   */
  isWaveComplete() {
    return this.waveComplete;
  }

  /**
   * Update wave state each frame.
   * - Spawn enemies on interval
   * - Update active enemies
   * - Track kills
   * - Detect wave completion
   * @param {number} delta - Time delta in ms
   */
  update(delta) {
    if (!this.game.player) return;

    // Spawn queued enemies on interval
    if (this.waveQueue && this.waveQueue.length > 0) {
      this.spawnTimer += delta;
      if (this.spawnTimer >= this.spawnInterval) {
        this.spawnTimer = 0;
        const enemyType = this.waveQueue.shift();
        this.spawnEnemy(enemyType || 'gangster');
      }
    }

    // Update all active enemies
    this.enemies.forEach((enemy) => {
      enemy.update(delta);

      // Check if enemy can attack player
      if (enemy.isNearPlayer() && enemy.canAttack()) {
        this.game.player.takeDamage(CONSTANTS.PLAYER_DAMAGE_ON_HIT);
        enemy.recordAttack();

        if (this.game.player.isDead()) {
          this.game.currentState = CONSTANTS.STATES.GAMEOVER;
        }
      }
    });

    // Remove dead enemies and track kills
    this.enemies = this.enemies.filter((enemy) => {
      if (!enemy.isAlive) {
        // Award Kita
        this.game.player.addKita(enemy.kitaReward);
        this.killCount++;

        // Check if wave is cleared
        if (this.killCount >= this.maxKillsPerWave && this.waveQueue.length === 0) {
          this.waveComplete = true;
        }
        return false;
      }
      return true;
    });

    // Auto-complete wave if all enemies killed and no more to spawn
    if ((!this.waveQueue || this.waveQueue.length === 0) && this.enemies.length === 0) {
      this.waveComplete = true;
    }
  }

  /**
   * Spawn a single enemy of given type.
   * @param {string} type - Enemy type (e.g., 'gangster', 'cockroach', 'boss_kap')
   */
  spawnEnemy(type) {
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


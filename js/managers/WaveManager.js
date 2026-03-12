// WaveManager.js – Spawns and tracks enemy waves for the current level.
// Reads wave configuration from CONSTANTS and manages all active enemies.

class WaveManager {
  constructor(game) {
    this.game = game;
    this.enemies = [];
    this.currentWave = 0;
    this.waveComplete = false;
    this.spawnTimer = 0;
    this.spawnInterval = 2000; // ms between enemy spawns
    this.killCount = 0;
  }

  startWave(waveConfig) {
    this.currentWave++;
    this.waveQueue = [...waveConfig];
    this.waveComplete = false;
    this.spawnTimer = 0;
  }

  update(delta) {
    // Spawn queued enemies on interval
    if (this.waveQueue && this.waveQueue.length > 0) {
      this.spawnTimer += delta;
      if (this.spawnTimer >= this.spawnInterval) {
        this.spawnTimer = 0;
        const enemyType = this.waveQueue.shift();
        this.spawnEnemy(enemyType);
      }
    }

    // Update all active enemies
    this.enemies.forEach((enemy) => enemy.update(delta));

    // Remove dead enemies and award Kita
    this.enemies = this.enemies.filter((enemy) => {
      if (!enemy.isAlive) {
        this.game.saveManager.state.kita += enemy.kitaReward;
        this.killCount++;
        return false;
      }
      return true;
    });

    // Check if wave is cleared
    if ((!this.waveQueue || this.waveQueue.length === 0) && this.enemies.length === 0) {
      this.waveComplete = true;
    }
  }

  spawnEnemy(type) {
    const enemy = new Enemy(this.game, type);
    this.enemies.push(enemy);
  }

  draw(ctx) {
    this.enemies.forEach((enemy) => enemy.draw(ctx));
  }
}

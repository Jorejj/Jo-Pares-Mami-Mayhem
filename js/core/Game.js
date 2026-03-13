// Game.js – Core game engine managing FSM state, game loop, and entity coordination.
// Merged from Case Study (gameplay logic) + Jo-Pares-Mami-Mayhem (architecture).

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // ===== MANAGERS & LOADERS =====
    this.assetLoader = new AssetLoader();
    this.inputHandler = new InputHandler(canvas);
    this.saveManager = new SaveManager();

    // ===== ENTITIES =====
    this.player = new Player(this);
    this.levelManager = new LevelManager(this);
    this.waveManager = new WaveManager(this);
    this.shopManager = new ShopManager(this);
    this.uiManager = new UIManager(this);

    // ===== FSM STATE =====
    this.currentState = CONSTANTS.STATES.MAIN_MENU;
    this.currentDifficulty = null;

    // ===== GAME LOOP =====
    this.isRunning = false;
    this.lastTimestamp = 0;
    this.gameFrame = 0;

    // ===== INPUT DEBOUNCING =====
    this.lastKeyPressState = {};

    this._bindFSMInput();

    // ===== CATAPULT LISTENER (PLACEHOLDER) =====
    // TODO: Integrate with Player._fire() method when drag release detected
    window.addEventListener('fireProjectile', (e) => {
      // Placeholder: Actual firing logic is in Player._fire()
      console.log('[Game] fireProjectile event received (placeholder)');
    });

    // ===== PARES SPLIT LISTENER (PLACEHOLDER) =====
    // TODO: Handle Pares apex splitting via Physics.isApexReached()
    window.addEventListener('spawnParesSplit', (e) => {
      // Placeholder: Actual split logic is in Projectile._splitAtApex()
      console.log('[Game] spawnParesSplit event received (placeholder)');
    });
  }

  /**
   * Bind keyboard FSM state transition input.
   * Handles main menu, difficulty, prologue, arsenal, victory, shop, gameover screens.
   * @private
   */
  _bindFSMInput() {
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();

      // Debounce key repeats
      if (this.lastKeyPressState[key]) return;
      this.lastKeyPressState[key] = true;

      // ===== MAIN_MENU =====
      if (this.currentState === CONSTANTS.STATES.MAIN_MENU) {
        if (key === '1') {
          this.currentState = CONSTANTS.STATES.DIFFICULTY_SELECT;
        } else if (key === '2') {
          alert('Load Game not yet implemented.');
        } else if (key === '3') {
          alert('Thanks for playing!');
          location.reload();
        }
      }

      // ===== DIFFICULTY_SELECT =====
      else if (this.currentState === CONSTANTS.STATES.DIFFICULTY_SELECT) {
        if (key === 'e') {
          this.currentDifficulty = CONSTANTS.DIFFICULTY.easy;
          this.currentState = CONSTANTS.STATES.PROLOGUE;
        } else if (key === 'm') {
          this.currentDifficulty = CONSTANTS.DIFFICULTY.medium;
          this.currentState = CONSTANTS.STATES.PROLOGUE;
        } else if (key === 'h') {
          this.currentDifficulty = CONSTANTS.DIFFICULTY.hard;
          this.currentState = CONSTANTS.STATES.PROLOGUE;
        }
      }

      // ===== PROLOGUE =====
      else if (this.currentState === CONSTANTS.STATES.PROLOGUE) {
        if (key === ' ' || key === 'enter') {
          this.uiManager.prologueIndex++;
          if (this.uiManager.prologueIndex >= CONSTANTS.PROLOGUE_LINES.length) {
            this.currentState = CONSTANTS.STATES.ARSENAL_SELECT;
            // Initialize wave
            this.waveManager.startWave(this._getWaveEnemies());
          }
        }
      }

      // ===== ARSENAL_SELECT =====
      else if (this.currentState === CONSTANTS.STATES.ARSENAL_SELECT) {
        if (key === '1') {
          this.player.selectWeapon('mami');
        } else if (key === '2' && this.player.arsenal['pares'].unlocked) {
          this.player.selectWeapon('pares');
        } else if (key === '3' && this.player.arsenal['rice'].unlocked) {
          this.player.selectWeapon('rice');
        }

        if (key === 'enter') {
          this.currentState = CONSTANTS.STATES.PLAYING;
        }
      }

      // ===== PLAYING =====
      else if (this.currentState === CONSTANTS.STATES.PLAYING) {
        if (key === '4' && this.player.arsenal['CHILI_SAUCE'].isUnlocked) {
           // Assuming WaveManager holds your active enemies
           this.waveManager.enemies.forEach(e => e.applyBurn(300));
           this.player.triggerCooldown("CHILI_SAUCE");
        }
        if (key === '5' && this.player.arsenal['CALAMANSI'].isUnlocked) {
           this.waveManager.enemies.forEach(e => e.applySlow(300, 0.4));
           this.player.triggerCooldown("CALAMANSI");
        }
      }

      // ===== VICTORY =====
      else if (this.currentState === CONSTANTS.STATES.VICTORY) {
        if (key === 'enter') {
          this.currentState = CONSTANTS.STATES.SHOP;
          this.shopManager.open();
        }
      }

      // ===== SHOP =====
      else if (this.currentState === CONSTANTS.STATES.SHOP) {
        if (key === '1') {
          this.shopManager.handleWeaponSelection(1);
        } else if (key === '2') {
          this.shopManager.handleWeaponSelection(2);
        } else if (key === '3') {
          this.shopManager.handleWeaponSelection(3);
        }

        if (key === 'enter') {
          this.shopManager.close();
          this.currentState = CONSTANTS.STATES.ARSENAL_SELECT;
          this.waveManager.currentWave++;
          this.waveManager.startWave(this._getWaveEnemies());
        }
      }

      // ===== GAMEOVER =====
      else if (this.currentState === CONSTANTS.STATES.GAMEOVER) {
        if (key === 'r') {
          location.reload();
        }
      }
    });

    // Reset debounce on key up
    window.addEventListener('keyup', (e) => {
      this.lastKeyPressState[e.key.toLowerCase()] = false;
    });
  }

  /**
   * Get enemy wave configuration based on current wave/level.
   * @private
   * @returns {Array} Array of enemy types to spawn
   */
  _getWaveEnemies() {
    // Simple wave progression: spawn 5-10 enemies per wave of basic type
    const waveNum = this.waveManager.currentWave;
    const enemyCount = Math.min(5 + Math.floor(waveNum / 2), 15);
    const enemies = [];

    for (let i = 0; i < enemyCount; i++) {
      enemies.push('gangster');
    }

    // Add some variation in later waves
    if (waveNum > 3) {
      for (let i = 0; i < Math.floor(waveNum / 3); i++) {
        enemies[Math.floor(Math.random() * enemies.length)] = 'cockroach';
      }
    }

    return enemies;
  }

  /**
   * Start the game (called from main.js).
   */
  start() {
    this.assetLoader.loadAll(() => {
      this.saveManager.load();
      this.levelManager.init();
      this.isRunning = true;
      requestAnimationFrame((ts) => this.loop(ts));
    });
  }

  /**
   * Main game loop (called via requestAnimationFrame).
   * @param {number} timestamp - High-resolution timestamp
   */
  loop(timestamp) {
    if (!this.isRunning) return;

    // Cap delta to 100ms to avoid large jumps on first frame or after tab focus
    const delta = this.lastTimestamp === 0 ? 16 : Math.min(timestamp - this.lastTimestamp, 100);
    this.lastTimestamp = timestamp;

    this.update(delta);
    this.draw();

    requestAnimationFrame((ts) => this.loop(ts));
  }

  /**
   * Update game state each frame based on current FSM state.
   * @param {number} delta - Time delta in ms
   */
  update(delta) {
    this.gameFrame++;

    // Update entities and managers
    if (this.player) this.player.update(delta);
    if (this.waveManager) this.waveManager.update(delta);
    if (this.levelManager) this.levelManager.update(delta);
    if (this.shopManager) this.shopManager.update(delta);
    if (this.uiManager) this.uiManager.update(delta);

    // ===== STATE-SPECIFIC LOGIC =====
    if (this.currentState === CONSTANTS.STATES.PLAYING) {
      this._updatePlaying();
    } else if (this.currentState === CONSTANTS.STATES.VICTORY) {
      if (this.waveManager.isWaveComplete()) {
        // Already in VICTORY state
      }
    }
  }

  /**
   * Update logic specific to PLAYING state.
   * Checks wave completion and death conditions.
   * @private
   */
  _updatePlaying() {
    // Check if player is dead
    if (this.player.isDead()) {
      this.currentState = CONSTANTS.STATES.GAMEOVER;
      return;
    }

    // Update projectiles managed by Player.js
    // (This is now handled by Player.update() which manages this.projectiles)
    // The collision detection is handled in Player.update() against waveManager.enemies
    
    // Check if wave is complete
    if (this.waveManager.isWaveComplete()) {
      this.currentState = CONSTANTS.STATES.VICTORY;
    }
  }

  /**
   * Draw current frame based on FSM state.
   */
  draw() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw background
    this.levelManager.draw(this.ctx);

    // Draw gameplay elements (only during PLAYING state)
    if (this.currentState === CONSTANTS.STATES.PLAYING) {
      if (this.player) this.player.draw(this.ctx);
      if (this.waveManager) this.waveManager.draw(this.ctx);
      // (Projectiles are drawn by Player.draw() which manages them internally)
    }

    // Draw UI overlay (state-specific screens and HUD)
    if (this.uiManager) this.uiManager.draw(this.ctx);
  }
}


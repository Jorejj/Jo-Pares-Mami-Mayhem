// Game.js – Core game engine managing FSM state, game loop, and entity coordination.
// Merged from Case Study (gameplay logic) + Jo-Pares-Mami-Mayhem (architecture).

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

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
    window.addEventListener("fireProjectile", (e) => {
      console.log("[Game] fireProjectile event received");
    });

    window.addEventListener("spawnParesSplit", (e) => {
      console.log("[Game] spawnParesSplit event received");
    });
  }

  /**
   * Bind keyboard FSM state transition input.
   * @private
   */
  _bindFSMInput() {
    window.addEventListener("keydown", (e) => {
      const key = e.key.toLowerCase();

      // Debounce key repeats
      if (this.lastKeyPressState[key]) return;
      this.lastKeyPressState[key] = true;

      // Handle In-Game Tutorial Input (Space/Enter to advance)
      if (this.uiManager.showInGameTutorial && (key === ' ' || key === 'enter')) {
        this.uiManager.tutorialIndex++;
        if (this.uiManager.tutorialIndex >= CONSTANTS.TUTORIAL_STEPS.length) {
          this.uiManager.showInGameTutorial = false;
          // Persist that tutorial has been completed
          this.saveManager.state.hasSeenTutorial = true;
          this.saveManager.save();
        }
        return;
      }

      // ===== MAIN_MENU =====
      if (this.currentState === CONSTANTS.STATES.MAIN_MENU) {
        if (key === "1") {
          this.currentState = CONSTANTS.STATES.DIFFICULTY_SELECT;
        } else if (key === "2") {
          alert("Load Game not yet implemented.");
        } else if (key === "3") {
          alert("Thanks for playing!");
          location.reload();
        }
      }

      // ===== DIFFICULTY_SELECT =====
      else if (this.currentState === CONSTANTS.STATES.DIFFICULTY_SELECT) {
        if (key === "e") {
          this.currentDifficulty = CONSTANTS.DIFFICULTY.easy;
          this.currentState = CONSTANTS.STATES.PROLOGUE;
        } else if (key === "m") {
          this.currentDifficulty = CONSTANTS.DIFFICULTY.medium;
          this.currentState = CONSTANTS.STATES.PROLOGUE;
        } else if (key === "h") {
          this.currentDifficulty = CONSTANTS.DIFFICULTY.hard;
          this.currentState = CONSTANTS.STATES.PROLOGUE;
        }
      }

      // ===== PROLOGUE =====
      else if (this.currentState === CONSTANTS.STATES.PROLOGUE) {
        if (key === " " || key === "enter") {
          this.uiManager.prologueIndex++;
          if (this.uiManager.prologueIndex >= CONSTANTS.PROLOGUE_LINES.length) {
            // Jump straight to Arsenal Select (In-Game Tutorial will trigger in Wave 1)
            this.currentState = CONSTANTS.STATES.ARSENAL_SELECT;
            this.waveManager.startWave(this._getWaveEnemies());
          }
        }
      }

      // ===== ARSENAL_SELECT =====
      else if (this.currentState === CONSTANTS.STATES.ARSENAL_SELECT) {
        if (key === "1") {
          this.player.selectWeapon("mami");
        } else if (key === "2" && this.player.arsenal["pares"].unlocked) {
          this.player.selectWeapon("pares");
        } else if (key === "3" && this.player.arsenal["rice"].unlocked) {
          this.player.selectWeapon("rice");
        }

        if (key === "enter") {
          this.currentState = CONSTANTS.STATES.PLAYING;
          
          // Trigger Tutorial if it's the very first wave and player hasn't seen it
          if (this.waveManager.currentWave === 1 && !this.saveManager.state.hasSeenTutorial) {
            this.uiManager.showInGameTutorial = true;
            this.uiManager.tutorialIndex = 0;
          }
        }
      }

      // ===== PLAYING =====
      else if (this.currentState === CONSTANTS.STATES.PLAYING) {
        if (this.uiManager.showInGameTutorial) return; // Prevent playing while tutorial is on

        if (key === 'p') {
          this.uiManager._togglePause();
        }
      }

      // ===== VICTORY =====
      else if (this.currentState === CONSTANTS.STATES.VICTORY) {
        if (key === "enter") {
          this.currentState = CONSTANTS.STATES.SHOP;
          this.shopManager.open();
        }
      }

      // ===== SHOP =====
      else if (this.currentState === CONSTANTS.STATES.SHOP) {
        if (key >= "1" && key <= "5") {
          this.shopManager.handleSelection(parseInt(key));
        }

        if (key === "enter") {
          this.shopManager.close();
          this.currentState = CONSTANTS.STATES.ARSENAL_SELECT;
          this.waveManager.startWave(this._getWaveEnemies());
        }
      }

      // ===== GAMEOVER =====
      else if (this.currentState === CONSTANTS.STATES.GAMEOVER) {
        if (key === "r") {
          location.reload();
        }
      }
    });

    // Reset debounce on key up
    window.addEventListener("keyup", (e) => {
      this.lastKeyPressState[e.key.toLowerCase()] = false;
    });
  }

  /**
   * Get enemy wave configuration based on current wave/level.
   * @private
   * @returns {Array} Array of enemy types to spawn
   */
  _getWaveEnemies() {
    const waveNum = this.waveManager.currentWave;
    const enemyCount = Math.min(5 + waveNum / 2, 15);
    const enemies = [];

    // The full pool of all your custom enemies
    const enemyPool = [
      "gangster",
      "cockroach",
      "dog",
      "jbhotdog",
      "bikejor",
      "kitboard",
      "rex",
      "newDaga1",
      "ian",
    ];

    for (let i = 0; i < enemyCount; i++) {
      const randomEnemy =
        enemyPool[Math.floor(Math.random() * enemyPool.length)];
      enemies.push(randomEnemy);
    }
    return enemies;
  }

  /**
   * Start the game.
   */
  start() {
    this.assetLoader.loadAll(() => {
      this.saveManager.load();
      this.levelManager.init();
      this.isRunning = true;
      requestAnimationFrame((ts) => this.loop(ts));
    });
  }

  loadSavedGame() {
    this.saveManager.load();
    const state = this.saveManager.state;
    
    // Sync Player
    this.player.syncWithSave(state);
    
    // Sync Wave
    this.waveManager.currentWave = state.currentLevel || 1;
    
    // Restore exact state
    const savedState = state.currentGameState || CONSTANTS.STATES.SHOP;
    this.currentState = savedState;

    if (savedState === CONSTANTS.STATES.SHOP) {
      this.shopManager.open();
    } else if (savedState === CONSTANTS.STATES.PLAYING) {
      this.waveManager.startWave(this._getWaveEnemies());
    }
  }

  /**
   * Main game loop.
   */
  loop(timestamp) {
    if (!this.isRunning) return;
    const delta =
      this.lastTimestamp === 0
        ? 16
        : Math.min(timestamp - this.lastTimestamp, 100);
    this.lastTimestamp = timestamp;

    this.update(delta);
    this.draw();

    requestAnimationFrame((ts) => this.loop(ts));
  }

  /**
   * Update game state each frame.
   */
  update(delta) {
    this.gameFrame++;

    // Update managers (UI always updates for prologue timer)
    if (this.uiManager) this.uiManager.update(delta);

    // PAUSE GAMEPLAY during In-Game Tutorial or Manual Pause
    if ((this.uiManager.showInGameTutorial || this.uiManager.isPaused) && this.currentState === CONSTANTS.STATES.PLAYING) {
      return; 
    }

    if (this.player) this.player.update(delta);
    if (this.waveManager) this.waveManager.update(delta);
    if (this.levelManager) this.levelManager.update(delta);
    if (this.shopManager) this.shopManager.update(delta);

    // ===== STATE-SPECIFIC LOGIC =====
    if (this.currentState === CONSTANTS.STATES.PLAYING) {
      this._updatePlaying();
    }
  }

  /**
   * Update logic specific to PLAYING state.
   */
  _updatePlaying() {
    if (this.player.isDead()) {
      this.currentState = CONSTANTS.STATES.GAMEOVER;
      return;
    }

    // Update projectiles managed by Player.js
    // (This is now handled by Player.update() which manages this.projectiles)
    // The collision detection is handled in Player.update() against waveManager.enemies

    // Check if wave is complete
    if (this.waveManager.isWaveComplete()) {
      this.waveManager.currentWave++; // Increment here so Save knows we are on the NEXT wave
      this.currentState = CONSTANTS.STATES.VICTORY;
    }
  }

  /**
   * Draw current frame.
   */
  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw background
    this.levelManager.draw(this.ctx);

    // Draw gameplay elements
    if (this.currentState === CONSTANTS.STATES.PLAYING || this.currentState === CONSTANTS.STATES.ARSENAL_SELECT) {
      if (this.player) this.player.draw(this.ctx);
      if (this.currentState === CONSTANTS.STATES.PLAYING && this.waveManager) {
        this.waveManager.draw(this.ctx);
      }
    }

    // Draw UI overlay
    if (this.uiManager) this.uiManager.draw(this.ctx);
  }
}

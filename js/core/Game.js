// Game.js – Core game engine managing FSM state, game loop, and entity coordination.

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

    window.addEventListener("fireProjectile", (e) => {
      console.log("[Game] fireProjectile event received");
    });

    window.addEventListener("spawnParesSplit", (e) => {
      console.log("[Game] spawnParesSplit event received");
    });
  }

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
          
          if (this.waveManager.currentWave === 1 && !this.saveManager.state.hasSeenTutorial) {
            this.uiManager.showInGameTutorial = true;
            this.uiManager.tutorialIndex = 0;
          }
        }
      }

      // ===== PLAYING =====
      else if (this.currentState === CONSTANTS.STATES.PLAYING) {
        if (this.uiManager.showInGameTutorial) return;

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

    window.addEventListener("keyup", (e) => {
      this.lastKeyPressState[e.key.toLowerCase()] = false;
    });
  }

  /**
   * Get enemy wave configuration based on current wave/level.
   * @private
   */
  _getWaveEnemies() {
    // Read the actual stage level from the LevelManager
    const level = this.levelManager.currentLevel;
    const enemies = [];

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

    // --- BOSS STAGE LOGIC ---
    if (level === 5) {
      // Spawn 15 normal enemies first
      for (let i = 0; i < 15; i++) {
        const randomEnemy = enemyPool[Math.floor(Math.random() * enemyPool.length)];
        enemies.push(randomEnemy);
      }
      
      // Add the Boss Inspector at the end!
      enemies.push('boss_kap');
      
      return enemies;
    }

    // --- NORMAL STAGE LOGIC ---
    // Make the waves gradually longer as you level up
    const enemyCount = Math.min(5 + Math.floor(level * 1.5), 20);

    for (let i = 0; i < enemyCount; i++) {
      const randomEnemy = enemyPool[Math.floor(Math.random() * enemyPool.length)];
      enemies.push(randomEnemy);
    }
    
    return enemies;
  }

  start() {
    this.uiManager._drawSunburst(this.ctx, '#ffcc00', '#ffb300');
    
    this.assetLoader.loadAll(() => {
      this.saveManager.load();
      this.levelManager.init();
      
      this.currentState = CONSTANTS.STATES.MAIN_MENU;
      
      this.isRunning = true;
      requestAnimationFrame((ts) => this.loop(ts));
    });
  }

  loadSavedGame() {
    this.saveManager.load();
    const state = this.saveManager.state;
    
    this.player.syncWithSave(state);
    this.waveManager.currentWave = state.currentLevel || 1;
    
    const savedState = state.currentGameState || CONSTANTS.STATES.SHOP;
    this.currentState = savedState;

    if (savedState === CONSTANTS.STATES.SHOP) {
      this.shopManager.open();
    } else if (savedState === CONSTANTS.STATES.PLAYING) {
      this.waveManager.startWave(this._getWaveEnemies());
    }
  }

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

  update(delta) {
    this.gameFrame++;

    // --- NEW: AMBIENT BACKGROUND NOISE ---
    const bgm = this.assetLoader?.audio?.bgm_street; // Or use bgm_traffic, bgm_crowd, etc!
    if (bgm) {

      if (this.currentState === CONSTANTS.STATES.PLAYING || this.currentState === CONSTANTS.STATES.SHOP || this.currentState === CONSTANTS.STATES.ARSENAL_SELECT) {
        if (bgm.paused) {
          bgm.loop = true;
          bgm.volume = 0.3; 
          bgm.play().catch(e => {});
        }
      } else {
        bgm.pause(); 
      }
    }

    if (this.uiManager) this.uiManager.update(delta);

    if ((this.uiManager.showInGameTutorial || this.uiManager.isPaused) && this.currentState === CONSTANTS.STATES.PLAYING) {
      return; 
    }

    if (this.player) this.player.update(delta);
    if (this.waveManager) this.waveManager.update(delta);
    if (this.levelManager) this.levelManager.update(delta);
    if (this.shopManager) this.shopManager.update(delta);

    if (this.currentState === CONSTANTS.STATES.PLAYING) {
      this._updatePlaying();
    }
  }

  _updatePlaying() {
    if (this.player.isDead()) {
      this.currentState = CONSTANTS.STATES.GAMEOVER;
      return;
    }

    // --- WAVE COMPLETION LOGIC ---
    if (this.waveManager.isWaveComplete()) {
      this.levelManager.advance(); // This changes the background for the next wave!
      this.waveManager.currentWave = this.levelManager.currentLevel; // Sync wave counter with stage number
      
      // --- NEW: AUTO-SAVE AFTER WAVE ---
      this.saveManager.save();
      
      this.currentState = CONSTANTS.STATES.VICTORY;
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.levelManager.draw(this.ctx);

    if (this.currentState === CONSTANTS.STATES.PLAYING || this.currentState === CONSTANTS.STATES.ARSENAL_SELECT) {
      if (this.player) this.player.draw(this.ctx);
      if (this.currentState === CONSTANTS.STATES.PLAYING && this.waveManager) {
        this.waveManager.draw(this.ctx);
      }
    }

    if (this.uiManager) this.uiManager.draw(this.ctx);
  }
}
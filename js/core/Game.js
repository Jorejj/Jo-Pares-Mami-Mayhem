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
    
    // ===== STAGE MANAGER (Data-driven level/story config) =====
    this.stageManager = new StageManager(this);

    // ===== FSM STATE =====
    this.currentState = CONSTANTS.STATES.MAIN_MENU;
    this.currentDifficulty = null;
    
    // --- Story Cutscene Tracking ---
    this.isPlayingStoryAfter = false; // Tracks if we're playing post-level story
    
    // --- AUDIO TRACKING ---
    this.currentBgmKey = null;
    this.currentBgmTrack = null;

    // ===== GAME LOOP =====
    this.isRunning = false;
    this.lastTimestamp = 0;
    this.gameFrame = 0;

    // ===== INPUT DEBOUNCING =====
    this.lastKeyPressState = {};

    this._bindFSMInput();
  }

  // =================================================================
  // --- NEW: MASTER SAVE FUNCTION ---
  // This ensures ALL data is packed up before writing to local storage!
  // =================================================================
  saveCurrentState() {
    const state = this.saveManager.state;
    
    // 1. Save Player Stats
    state.kita = this.player.kita;
    state.currentLevel = this.waveManager.currentWave;
    state.currentGameState = this.currentState;
    
    // 2. Save Weapons, Levels, and AMMO
    state.weaponLevels = {};
    state.weaponUnlocks = {};
    state.weaponAmmo = {}; // New: Track Ammo!
    
    for (const [key, data] of Object.entries(this.player.arsenal)) {
      state.weaponLevels[key] = data.level;
      state.weaponUnlocks[key] = data.unlocked;
      state.weaponAmmo[key] = data.usesLeft;
    }
    
    // 3. Save Specials
    state.specialsData = {};
    for (const [key, data] of Object.entries(this.player.specials)) {
      state.specialsData[key] = {
        unlocked: data.unlocked,
        timeSinceLastFire: data.timeSinceLastFire
      };
    }

    // 4. Write to Local Storage
    this.saveManager.save();
    console.log("[Game] Progress successfully saved!", state);
  }

  _bindFSMInput() {
    window.addEventListener("keydown", (e) => {
      const key = e.key.toLowerCase();

      if (this.lastKeyPressState[key]) return;
      this.lastKeyPressState[key] = true;

      if (this.uiManager.showInGameTutorial && (key === ' ' || key === 'enter')) {
        this.uiManager.tutorialIndex++;
        if (this.uiManager.tutorialIndex >= CONSTANTS.TUTORIAL_STEPS.length) {
          this.uiManager.showInGameTutorial = false;
          this.saveManager.state.hasSeenTutorial = true;
          this.saveCurrentState(); // Use new save method
        }
        return;
      }

      if (this.currentState === CONSTANTS.STATES.MAIN_MENU) {
        if (key === "1") this.currentState = CONSTANTS.STATES.DIFFICULTY_SELECT;
        else if (key === "2") alert("Load Game not yet implemented.");
        else if (key === "3") location.reload();
      }
      else if (this.currentState === CONSTANTS.STATES.DIFFICULTY_SELECT) {
        if (key === "e") { this.currentDifficulty = CONSTANTS.DIFFICULTY.easy; this._startStoryOrLevel(); }
        else if (key === "m") { this.currentDifficulty = CONSTANTS.DIFFICULTY.medium; this._startStoryOrLevel(); }
        else if (key === "h") { this.currentDifficulty = CONSTANTS.DIFFICULTY.hard; this._startStoryOrLevel(); }
      }
      else if (this.currentState === CONSTANTS.STATES.STORY_CUTSCENE || this.currentState === CONSTANTS.STATES.PROLOGUE) {
        if (key === " " || key === "enter") {
          this._advanceStoryCutscene();
        }
      }
      else if (this.currentState === CONSTANTS.STATES.PLAYING) {
        if (this.uiManager.showInGameTutorial) return;
        
        // Allow weapon switching during gameplay
        if (key === "1") this.player.selectWeapon("mami");
        else if (key === "2" && this.player.arsenal["pares"].unlocked) this.player.selectWeapon("pares");
        else if (key === "3" && this.player.arsenal["rice"].unlocked) this.player.selectWeapon("rice");
        
        if (key === 'p') this.uiManager._togglePause();
      }
      else if (this.currentState === CONSTANTS.STATES.VICTORY) {
        if (key === "enter") {
          this.currentState = CONSTANTS.STATES.SHOP;
          this.shopManager.open();
        }
      }
      else if (this.currentState === CONSTANTS.STATES.SHOP) {
        if (key >= "1" && key <= "5") this.shopManager.handleSelection(parseInt(key));

        if (key === "enter") {
          this._finishShoppingAndStartNextLevel();
        }
      }
      else if (this.currentState === CONSTANTS.STATES.GAMEOVER) {
        if (key === "r") location.reload();
      }
    });

    window.addEventListener("keyup", (e) => {
      this.lastKeyPressState[e.key.toLowerCase()] = false;
    });
  }

  /**
   * Start story cutscene or skip directly to level if no story exists
   */
  _startStoryOrLevel() {
    const currentLevel = this.levelManager.currentLevel;
    
    if (this.stageManager.hasStoryBefore(currentLevel)) {
      this.stageManager.startStoryBefore(currentLevel);
      this.isPlayingStoryAfter = false;
      this.currentState = CONSTANTS.STATES.STORY_CUTSCENE;
      this.uiManager.prologueIndex = 0;
      this.uiManager.prologueCharIndex = 0;
      this.uiManager.prologueFade = 0;
    } else {
      this._startLevel();
    }
  }

  /**
   * Advance dialogue in story cutscene
   */
  _advanceStoryCutscene() {
    const hasMore = this.stageManager.advanceDialogue();
    this.uiManager.prologueIndex = this.stageManager.currentDialogueIndex;
    this.uiManager.prologueCharIndex = 0;
    this.uiManager.prologueFade = 0;
    
    if (!hasMore) {
      // Cutscene complete
      if (this.isPlayingStoryAfter) {
        // After-level story is done, go to shop
        this.currentState = CONSTANTS.STATES.SHOP;
        this.shopManager.open();
      } else {
        // Before-level story is done, start the level
        this._startLevel();
      }
    }
  }

  /**
   * Start the actual gameplay level
   */
  _startLevel() {
    this.currentState = CONSTANTS.STATES.PLAYING;
    const waveEnemies = this.stageManager.getWaveEnemies(this.levelManager.currentLevel);
    console.log('[Game._startLevel] Level:', this.levelManager.currentLevel, 'Enemies:', waveEnemies);
    this.waveManager.startWave(waveEnemies);
    this.player.resetAmmo();
  }

  /**
   * Finish shopping and check if next level has story before it
   */
  _finishShoppingAndStartNextLevel() {
    this.shopManager.close();
    
    const currentLevel = this.levelManager.currentLevel;
    
    // Check if next level has a story before it
    if (this.stageManager.hasStoryBefore(currentLevel)) {
      this.stageManager.startStoryBefore(currentLevel);
      this.isPlayingStoryAfter = false;
      this.currentState = CONSTANTS.STATES.STORY_CUTSCENE;
      this.uiManager.prologueIndex = 0;
      this.uiManager.prologueCharIndex = 0;
      this.uiManager.prologueFade = 0;
    } else {
      this._startLevel();
    }
  }

  _getWaveEnemies() {
    // Now uses StageManager for data-driven wave configuration
    return this.stageManager.getWaveEnemies(this.levelManager.currentLevel);
  }

  _getWaveEnemiesLegacy() {
    const level = this.levelManager.currentLevel;
    const enemies = [];
    const enemyPool = ["gangster", "cockroach", "dog", "jbhotdog", "bikejor", "kitboard", "rex", "newDaga1", "ian"];

    if (level === 5) {
      for (let i = 0; i < 15; i++) enemies.push(enemyPool[Math.floor(Math.random() * enemyPool.length)]);
      enemies.push('boss_kap');
      return enemies;
    }

    const enemyCount = Math.min(5 + Math.floor(level * 1.5), 20);
    for (let i = 0; i < enemyCount; i++) {
      enemies.push(enemyPool[Math.floor(Math.random() * enemyPool.length)]);
    }
    return enemies;
  }

  /**
   * Start game with loading screen integration
   * @param {Function} onProgress - Called with (loaded, total) during loading
   * @param {Function} onComplete - Called when loading is complete
   */
  startWithLoadingScreen(onProgress, onComplete) {
    this.assetLoader.loadAll(
      () => {
        // Loading complete
        this.saveManager.load();
        this.levelManager.init();
        this.currentState = CONSTANTS.STATES.MAIN_MENU;
        this.isRunning = true;
        
        // Hide loading screen
        if (onComplete) onComplete();
        
        // Start game loop
        requestAnimationFrame((ts) => this.loop(ts));
      },
      onProgress
    );
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
    
    // Sync player stats and ammo
    this.player.syncWithSave(state);
    
    this.waveManager.currentWave = state.currentLevel || 1;
    this.levelManager.currentLevel = state.currentLevel || 1; // Keep LevelManager synced
    
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
    const delta = this.lastTimestamp === 0 ? 16 : Math.min(timestamp - this.lastTimestamp, 100);
    this.lastTimestamp = timestamp;

    this.update(delta);
    this.draw();
    requestAnimationFrame((ts) => this.loop(ts));
  }

  _updateAudio() {
    const isActiveState = (
      this.currentState === CONSTANTS.STATES.PLAYING || 
      this.currentState === CONSTANTS.STATES.SHOP || 
      this.currentState === CONSTANTS.STATES.ARSENAL_SELECT
    );

    if (!isActiveState) {
      if (this.currentBgmTrack) this.currentBgmTrack.pause();
      return;
    }

    const levelData = this.levelManager.getLevelData();
    const targetBgmKey = levelData.bgm;

    if (this.currentBgmKey !== targetBgmKey) {
      if (this.currentBgmTrack) {
        this.currentBgmTrack.pause();
        this.currentBgmTrack.currentTime = 0; 
      }
      this.currentBgmKey = targetBgmKey;
      this.currentBgmTrack = this.assetLoader?.audio?.[targetBgmKey];

      if (this.currentBgmTrack) {
        this.currentBgmTrack.loop = true;
        this.currentBgmTrack.volume = 0.3; 
        const p = this.currentBgmTrack.play();
        if (p && p.catch) p.catch(() => {});
      }
    } else if (this.currentBgmTrack && this.currentBgmTrack.paused) {
      const p = this.currentBgmTrack.play();
      if (p && p.catch) p.catch(() => {});
    }
  }

  update(delta) {
    this.gameFrame++;
    this._updateAudio();
    if (this.uiManager) this.uiManager.update(delta);
    if ((this.uiManager.showInGameTutorial || this.uiManager.isPaused || this.uiManager.showDynamicTutorial) && this.currentState === CONSTANTS.STATES.PLAYING) return;

    if (this.player) this.player.update(delta);
    if (this.waveManager) this.waveManager.update(delta);
    if (this.levelManager) this.levelManager.update(delta);
    if (this.shopManager) this.shopManager.update(delta);

    if (this.currentState === CONSTANTS.STATES.PLAYING) this._updatePlaying();
    
    // Debug: Log state every 60 frames
    if (this.gameFrame % 60 === 0) {
      console.log('[Game.update] State:', this.currentState, 'Enemies:', this.waveManager.enemyPool.getActiveCount());
    }
  }

  _updatePlaying() {
    if (this.player.isDead()) {
      this.currentState = CONSTANTS.STATES.GAMEOVER;
      return;
    }

    if (this.waveManager.isWaveComplete()) {
      // Get the completed level BEFORE advancing
      const completedLevel = this.levelManager.currentLevel;
      
      this.levelManager.advance(); 
      this.waveManager.currentWave = this.levelManager.currentLevel; 
      
      // Save progress
      this.saveCurrentState();
      
      // Check if completed level has storyAfter
      if (this.stageManager.hasStoryAfter(completedLevel)) {
        this.stageManager.startStoryAfter(completedLevel);
        this.isPlayingStoryAfter = true;
        this.currentState = CONSTANTS.STATES.STORY_CUTSCENE;
        this.uiManager.prologueIndex = 0;
        this.uiManager.prologueCharIndex = 0;
        this.uiManager.prologueFade = 0;
      } else {
        // No story after, go directly to victory/shop
        this.currentState = CONSTANTS.STATES.VICTORY;
      }
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.levelManager.draw(this.ctx);

    if (this.currentState === CONSTANTS.STATES.PLAYING) {
      if (this.player) this.player.draw(this.ctx);
      if (this.waveManager) this.waveManager.draw(this.ctx);
    }

    if (this.uiManager) this.uiManager.draw(this.ctx);
  }
}
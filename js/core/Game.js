// Game.js – Core game engine managing FSM state, game loop, and entity coordination.

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    this.assetLoader = new AssetLoader();
    this.inputHandler = new InputHandler(canvas);
    this.saveManager = new SaveManager();

    this.player = new Player(this);
    this.levelManager = new LevelManager(this);
    this.waveManager = new WaveManager(this);
    this.shopManager = new ShopManager(this);
    this.uiManager = new UIManager(this);
    
    // ===== STAGE MANAGER (Data-driven level/story config) =====
    this.stageManager = new StageManager(this);

    this.currentState = CONSTANTS.STATES.MAIN_MENU;
    this.currentDifficulty = null;
    
    // --- Story Cutscene Tracking ---
    this.isPlayingStoryAfter = false; // Tracks if we're playing post-level story
    
    // --- AUDIO TRACKING ---
    this.currentBgmKey = null;
    this.currentBgmTrack = null;

    this.isRunning = false;
    this.lastTimestamp = 0;
    this.gameFrame = 0;

    this.lastKeyPressState = {};
    this.enemyProjectiles = [];
    
    this._bindFSMInput();
    this._bindGlobalUI(); 
  }

  // --- NEW: TRUE FRESH START MEMORY WIPE ---
  startNewGame(difficulty) {
      this.saveManager.reset();
      
      // Place a temporary flag in local storage, then force a hard reload of the browser tab!
      // This is the safest way to guarantee active memory and Wave variables are 100% wiped clean.
      localStorage.setItem('pendingNewGame', difficulty);
      location.reload(); 
  }
  // --- NEW: UNIVERSAL QUIT FUNCTION ---
  quitGame() {
      window.close(); 
      setTimeout(() => {
          alert("Game Saved! Thanks for playing. You can now close this browser tab.");
      }, 200);
  }

// --- GLOBAL UI AUDIO (SUPER BULLETPROOF) ---
  _bindGlobalUI() {
    document.addEventListener('mouseover', (e) => {
        if (e.target && e.target.closest && e.target.closest('button')) {
            const btn = e.target.closest('button');
            if (btn !== this._lastHoveredBtn) {
                const audio = this.assetLoader?.audio?.sfx_button_hover;
                if (audio) { 
                    audio.currentTime = 0; 
                    audio.volume = 0.3; 
                    // Safely catches errors if the audio file is completely missing!
                    const p = audio.play(); 
                    if (p && p.catch) p.catch(()=>{}); 
                }
                this._lastHoveredBtn = btn;
            }
        } else {
            this._lastHoveredBtn = null;
        }
    });

 document.addEventListener('click', (e) => {
        // 1. Play pause sounds
        if (e.target && (e.target.id === 'btn-pause-toggle' || e.target.id === 'btn-resume')) {
            const sfx = this.assetLoader?.audio?.sfx_pause_menu;
            if (sfx) { 
                sfx.currentTime = 0; 
                sfx.volume = 0.8; 
                const p = sfx.play(); 
                if (p && p.catch) p.catch(()=>{}); 
            }
        }
        
        // --- NEW: Listen for the Quit button click! ---
        // *Note: Change 'btn-quit' if your HTML button has a different ID!
        if (e.target && e.target.id === 'btn-quit') {
            this.quitGame();
        }
    });
  }
  saveCurrentState() {
    const state = this.saveManager.state;
    state.kita = this.player.kita;
    state.currentLevel = this.waveManager.currentWave;
    state.currentGameState = this.currentState;
    
    state.weaponLevels = {};
    state.weaponUnlocks = {};
    state.weaponAmmo = {}; 
    for (const [key, data] of Object.entries(this.player.arsenal)) {
      state.weaponLevels[key] = data.level;
      state.weaponUnlocks[key] = data.unlocked;
      state.weaponAmmo[key] = data.usesLeft;
    }
    
    state.specialsData = {};
    for (const [key, data] of Object.entries(this.player.specials)) {
      state.specialsData[key] = { unlocked: data.unlocked, timeSinceLastFire: data.timeSinceLastFire };
    }

    this.saveManager.save();
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
          this.saveCurrentState(); 
        }
        return;
      }

      if (this.currentState === CONSTANTS.STATES.MAIN_MENU) {
        if (key === "1") this.currentState = CONSTANTS.STATES.DIFFICULTY_SELECT;
        else if (key === "2") this.loadSavedGame(); 
        
        // --- NEW: QUIT BUTTON LOGIC ---
       else if (key === "3") {
            this.quitGame();
        }
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
        else if (key === "2") this.player.selectWeapon("pares");
        else if (key === "3") this.player.selectWeapon("rice");

        if (key === "enter") {
          this.currentState = CONSTANTS.STATES.PLAYING;
          this.player.resetAmmo();
        }
      }
      else if (this.currentState === CONSTANTS.STATES.PLAYING) {
        if (this.uiManager.showInGameTutorial) return;
        if (key === 'p') {
            this.uiManager._togglePause();
            const sfx = this.assetLoader?.audio?.sfx_pause_menu;
            if (sfx) { sfx.currentTime = 0; sfx.volume = 0.8; sfx.play().catch(()=>{}); }
        }
      }
      else if (this.currentState === CONSTANTS.STATES.VICTORY) {
        // Disabled "Enter" key here since it transitions automatically now!
      }
      else if (this.currentState === CONSTANTS.STATES.SHOP) {
        if (key >= "1" && key <= "6") this.shopManager.handleSelection(parseInt(key)); 

        if (key === "enter") {
          this._finishShoppingAndStartNextLevel();
        }
      }
      else if (this.currentState === CONSTANTS.STATES.GAMEOVER) {
        if (key === "r") location.reload();
        else if (key === "2") this.loadSavedGame(); 
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
    
    let enemyPool = [];
    let bossKey = null;

    if (level <= 5) {
      enemyPool = ["cockroach", "newDaga1", "gangster", "dog"];
      bossKey = "boss_kap";
    } else if (level <= 10) {
      enemyPool = ["fmteacher", "bikejor", "jbhotdog", "kitboard", "rex"];
      bossKey = "ian";
    } else {
      enemyPool = ["blonde", "asbula", "willie", "fmbad", "fmteacher", "angryfm"];
      bossKey = "boss_final";
    }

    const isBossLevel = (level % 5 === 0);
    const enemyCount = Math.min(5 + Math.floor(level * 2), 30);

    for (let i = 0; i < enemyCount; i++) {
      enemies.push(enemyPool[Math.floor(Math.random() * enemyPool.length)]);
    }
    if (isBossLevel) enemies.push(bossKey);
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
      
      // --- FIXED: CHECK IF WE ARE RECOVERING FROM A NEW GAME WIPE ---
      const pendingNewGameDiff = localStorage.getItem('pendingNewGame');
      if (pendingNewGameDiff) {
          localStorage.removeItem('pendingNewGame');
          this.currentDifficulty = pendingNewGameDiff;
          this.currentState = CONSTANTS.STATES.PROLOGUE;
          this.player.hp = this.player.maxHp; // Guarantee full HP
      } else {
          this.currentState = CONSTANTS.STATES.MAIN_MENU;
      }
      
      this.isRunning = true;
      requestAnimationFrame((ts) => this.loop(ts));
    });
  }

  loadSavedGame() {
    this.saveManager.load();
    const state = this.saveManager.state;
    
    const loadedLevel = state.currentLevel || 1;
    this.levelManager.currentLevel = loadedLevel;
    this.waveManager.currentWave = loadedLevel;
    this.player.syncWithSave(state);
    
    this.player.hp = this.player.maxHp;
    this.player.isDead = () => { return this.player.hp <= 0; }; 
    
    let targetState = state.currentGameState;
    if (targetState === CONSTANTS.STATES.GAMEOVER || targetState === CONSTANTS.STATES.VICTORY) {
        targetState = CONSTANTS.STATES.ARSENAL_SELECT; 
    }
    
    this.currentState = targetState;

    if (this.currentState === CONSTANTS.STATES.SHOP) {
      this.shopManager.open();
    } else {
      this.currentState = CONSTANTS.STATES.ARSENAL_SELECT;
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

    if (this.currentState === CONSTANTS.STATES.PLAYING) {
        this._updatePlaying();
    }
    
    // --- FAST AUTO-TRANSITION TO SHOP! ---
    if (this.currentState === CONSTANTS.STATES.VICTORY) {
        if (this.victoryTimer === undefined) this.victoryTimer = 0;
        this.victoryTimer += delta;
        
        // Opens the shop after 1.5 seconds!
        if (this.victoryTimer > 1500) {
            this.victoryTimer = 0; 
            this.currentState = CONSTANTS.STATES.SHOP;
            this.shopManager.open();
        }
    }
  }

_updatePlaying() {
    if (this.player.isDead()) {
      this.currentState = CONSTANTS.STATES.GAMEOVER;
      
      const sfx = this.assetLoader?.audio?.sfx_defeat;
      if (sfx) { 
          sfx.currentTime = 0; 
          sfx.volume = 1.0; 
          const p = sfx.play(); 
          if (p && p.catch) p.catch(()=>{}); 
      }
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
      // --- FIXED: INSTANTLY REFILL AMMO HERE ---
      this.player.resetAmmo(); 
      
      this.saveCurrentState(); // Now it saves with full ammo!
      
      this.currentState = CONSTANTS.STATES.VICTORY;
      this.victoryTimer = 0; 
      
      const sfx = this.assetLoader?.audio?.sfx_victory;
      if (sfx) { 
          sfx.currentTime = 0; 
          sfx.volume = 1.0; 
          const p = sfx.play(); 
          if (p && p.catch) p.catch(()=>{}); 
      }
    }

    if (this.waveManager.isWaveComplete()) {
      this.levelManager.advance(); 
      this.waveManager.currentWave = this.levelManager.currentLevel; 
      
      this.saveCurrentState();
      
      this.currentState = CONSTANTS.STATES.VICTORY;
      this.victoryTimer = 0; 
      
      const sfx = this.assetLoader?.audio?.sfx_victory;
      if (sfx) { 
          sfx.currentTime = 0; 
          sfx.volume = 1.0; 
          // FIXED: Safely checks if a Promise exists before catching!
          const p = sfx.play(); 
          if (p && p.catch) p.catch(()=>{}); 
      }
    }
  }
  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.levelManager.draw(this.ctx);
    
    if (this.enemyProjectiles) {
        this.enemyProjectiles.forEach(ep => ep.draw(this.ctx));
    }

    if (this.currentState === CONSTANTS.STATES.PLAYING) {
      if (this.player) this.player.draw(this.ctx);
      if (this.waveManager) this.waveManager.draw(this.ctx);
    }

    if (this.uiManager) this.uiManager.draw(this.ctx);
  }
}
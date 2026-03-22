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
    this.currentDifficultyKey = null;
    
    // --- Story Cutscene Tracking ---
    this.isPlayingStoryAfter = false; 
    
    this.currentBgmKey = null;
    this.currentBgmTrack = null;

    this.isRunning = false;
    this.lastTimestamp = 0;
    this.gameFrame = 0;

    this.lastKeyPressState = {};
    this.enemyProjectiles = [];
    
    this._bindFSMInput();
    this._bindGlobalUI(); 

    document.addEventListener('click', () => {
        if (this.currentBgmTrack && this.currentBgmTrack.paused) {
            const p = this.currentBgmTrack.play();
            if (p && p.catch) p.catch(()=>{});
        }
    }, { once: true });
  }

  // --- TRUE FRESH START MEMORY WIPE ---
  startNewGame(difficultyKey) {
      this.saveManager.reset();
      localStorage.setItem('pendingNewGame', difficultyKey);
      location.reload(); 
  }

  // --- UNIVERSAL QUIT FUNCTION ---
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
        if (e.target && (e.target.id === 'btn-pause-toggle' || e.target.id === 'btn-resume')) {
            const sfx = this.assetLoader?.audio?.sfx_pause_menu;
            if (sfx) { 
                sfx.currentTime = 0; 
                sfx.volume = 0.8; 
                const p = sfx.play(); 
                if (p && p.catch) p.catch(()=>{}); 
            }
        }
        
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
    state.difficultyKey = this.currentDifficultyKey || state.difficultyKey || 'medium';
    
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
        else if (key === "3") this.quitGame();
      }
      else if (this.currentState === CONSTANTS.STATES.DIFFICULTY_SELECT) {
        if (key === "e") { this.startNewGame('easy'); }
        else if (key === "m") { this.startNewGame('medium'); }
        else if (key === "h") { this.startNewGame('hard'); }
      }
      else if (this.currentState === CONSTANTS.STATES.STORY_CUTSCENE || this.currentState === CONSTANTS.STATES.PROLOGUE) {
        if (key === " " || key === "enter") {
          this._advanceStoryCutscene();
        }
      }
      else if (this.currentState === CONSTANTS.STATES.ARSENAL_SELECT) {
        if (key === "1") this.player.selectWeapon("mami");
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

  _startStoryOrLevel() {
    const currentLevel = this.levelManager.currentLevel;
    const shouldPlayGlobalPrologue = currentLevel === 1 && !this.saveManager.state.hasSeenPrologue;

    if (shouldPlayGlobalPrologue) {
      this.stageManager.startGlobalPrologue();
      this.saveManager.state.hasSeenPrologue = true;
      this.isPlayingStoryAfter = false;
      this.currentState = CONSTANTS.STATES.STORY_CUTSCENE;
      this.uiManager.prologueIndex = 0;
      this.uiManager.prologueCharIndex = 0;
      this.uiManager.prologueFade = 0;
      this.saveCurrentState();
    } else if (this.stageManager.hasStoryBefore(currentLevel)) {
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

_advanceStoryCutscene() {
    const hasMore = this.stageManager.advanceDialogue();
    this.uiManager.prologueIndex = this.stageManager.currentDialogueIndex;
    this.uiManager.prologueCharIndex = 0;
    this.uiManager.prologueFade = 0;
    
    if (!hasMore) {
      if (this.isPlayingStoryAfter) {
        // --- FIXED: CHECK IF IT'S THE FINAL LEVEL ---
        if (this.levelManager.currentLevel >= this.levelManager.maxLevel) {
            // GAME BEATEN! Go to Main Menu instead of the Shop.
            this.currentState = CONSTANTS.STATES.MAIN_MENU;
            this.waveManager.clearAllEnemies();
            this.player.projectilePool.releaseAll();
            
            // Stop the music so the Main Menu BGM can take over
            if (this.currentBgmTrack) {
                this.currentBgmTrack.pause();
                this.currentBgmTrack.currentTime = 0;
            }
        } else {
            // Normal progression: Go to the Shop
            this.currentState = CONSTANTS.STATES.SHOP;
            this.shopManager.open();
        }
      } else {
        this._startLevel();
      }
    }
  }

  _startLevel() {
    this.currentState = CONSTANTS.STATES.PLAYING;
    const waveEnemies = this.stageManager.getWaveEnemies(this.levelManager.currentLevel);
    this.waveManager.startWave(waveEnemies);
    this.player.resetAmmo();
  }

  _finishShoppingAndStartNextLevel() {
    this.shopManager.close();
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

  _getWaveEnemies() {
    return this.stageManager.getWaveEnemies(this.levelManager.currentLevel);
  }

  startWithLoadingScreen(onProgress, onComplete) {
    this.assetLoader.loadAll(
      () => {
        this.saveManager.load();
        this.levelManager.init();
        
        // --- CHECK IF WE ARE RECOVERING FROM A NEW GAME WIPE ---
        const pendingNewGameDiff = localStorage.getItem('pendingNewGame');
        if (pendingNewGameDiff) {
            localStorage.removeItem('pendingNewGame');
            this.currentDifficultyKey = pendingNewGameDiff;
            this.currentDifficulty = CONSTANTS.DIFFICULTY[pendingNewGameDiff];
            this.levelManager.currentDifficulty = this.currentDifficulty;
            this._startStoryOrLevel();
            this.player.hp = this.player.maxHp; 
        } else {
            this.currentState = CONSTANTS.STATES.MAIN_MENU;
        }
        
        this.isRunning = true;
        if (onComplete) onComplete();
        requestAnimationFrame((ts) => this.loop(ts));
      },
      onProgress
    );
  }

  loadSavedGame() {
    this.saveManager.load();
    const state = this.saveManager.state;
    
    const loadedLevel = Math.max(1, Math.min(CONSTANTS.TOTAL_LEVELS, state.currentLevel || 1));
    this.levelManager.currentLevel = loadedLevel;
    this.waveManager.currentWave = loadedLevel;
    const savedDifficultyKey = (state.difficultyKey && CONSTANTS.DIFFICULTY[state.difficultyKey])
      ? state.difficultyKey
      : 'medium';
    this.currentDifficultyKey = savedDifficultyKey;
    this.currentDifficulty = CONSTANTS.DIFFICULTY[savedDifficultyKey] || CONSTANTS.DIFFICULTY.medium;
    this.levelManager.currentDifficulty = this.currentDifficulty;
    this.player.syncWithSave(state);
    
    this.player.hp = this.player.maxHp;
    this.player.isDead = () => { return this.player.hp <= 0; }; 
    
    if (state.currentGameState === CONSTANTS.STATES.SHOP) {
      this.currentState = CONSTANTS.STATES.SHOP;
      this.shopManager.open();
    } else {
      // Resume directly to active gameplay so HUD and enemies appear immediately.
      this.currentState = CONSTANTS.STATES.PLAYING;
      this.waveManager.startWave(this._getWaveEnemies());
      this.shopManager.close();
      this.stageManager.resetDialogue();
      this.isPlayingStoryAfter = false;
      this.uiManager.prologueIndex = 0;
      this.uiManager.prologueCharIndex = 0;
      this.uiManager.prologueFade = 0;
      this.player.resetAmmo();
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
    // 1. We added MAIN_MENU and DIFFICULTY_SELECT to the active states
    const isActiveState = (
      this.currentState === CONSTANTS.STATES.PLAYING || 
      this.currentState === CONSTANTS.STATES.SHOP || 
      this.currentState === CONSTANTS.STATES.ARSENAL_SELECT ||
      this.currentState === CONSTANTS.STATES.MAIN_MENU ||
      this.currentState === CONSTANTS.STATES.DIFFICULTY_SELECT
    );

    if (!isActiveState) {
      if (this.currentBgmTrack) this.currentBgmTrack.pause();
      return;
    }

    // 2. Check which track we should be playing
    let targetBgmKey = null;
    if (this.currentState === CONSTANTS.STATES.MAIN_MENU || this.currentState === CONSTANTS.STATES.DIFFICULTY_SELECT) {
      targetBgmKey = 'bgm_main_menu'; // Play the new menu music!
    } else {
      const levelData = this.levelManager.getLevelData();
      targetBgmKey = levelData.bgm; // Play normal level music
    }

    // 3. Handle changing the tracks
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
        if (p && p.catch) p.catch(() => {
            // If the browser blocks autoplay upon opening the tab, don't crash.
            // Just wait for the user to click something.
        });
      }
    } else if (this.currentBgmTrack && this.currentBgmTrack.paused) {
      // If the track is paused (likely blocked by browser), try to play it again
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
      
      this.player.resetAmmo(); 
      this.saveCurrentState();
      
      if (this.stageManager.hasStoryAfter(completedLevel)) {
        this.stageManager.startStoryAfter(completedLevel);
        this.isPlayingStoryAfter = true;
        this.currentState = CONSTANTS.STATES.STORY_CUTSCENE;
        this.uiManager.prologueIndex = 0;
        this.uiManager.prologueCharIndex = 0;
        this.uiManager.prologueFade = 0;
      } else {
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
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.levelManager.draw(this.ctx);
    
    if (this.enemyProjectiles) {
        this.enemyProjectiles.forEach(ep => ep.draw(this.ctx));
    }

    if (this.currentState === CONSTANTS.STATES.PLAYING || this.currentState === CONSTANTS.STATES.ARSENAL_SELECT) {
      if (this.player) this.player.draw(this.ctx);
      if (this.currentState === CONSTANTS.STATES.PLAYING && this.waveManager) {
        this.waveManager.draw(this.ctx);
      }
    }

    if (this.uiManager) this.uiManager.draw(this.ctx);
  }
}

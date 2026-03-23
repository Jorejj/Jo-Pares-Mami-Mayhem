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
    
    // --- Overlay / Cinematic Tracking ---
    this.overlayTimer = 0;
    this.overlayType = null; // 'WAVE_START', 'BOSS_WARNING', 'LEVEL_COMPLETE'
    this.overlayText = "";
    this.overlaySubtext = "";
    
    // --- Story Voice Tracking ---
    this.currentVoiceTrack = null;
    
    // --- Boss Defeat Delay Tracking ---
    this.bossDefeatTimer = 0;
    
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
    // === BLOCK AUTO-SAVE IN GOD MODE ===
    if (window.isSecretMenuJumped) {
        console.log("[SaveManager] Auto-save blocked: Secret Menu / God Mode active.");
        return;
    }

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
        if (key === "n") this.currentState = CONSTANTS.STATES.DIFFICULTY_SELECT;
        else if (key === "l") this.loadSavedGame(); 
        else if (key === "q") this.quitGame();
      }
      else if (this.bossDefeatTimer > 0 && (key === " " || key === "enter")) {
        this._finishBossDefeatDelay();
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
        // Keep mouse interaction for shop, but remove number shortcuts to stay consistent.
        if (key === "enter") {
          this._finishShoppingAndStartNextLevel();
        }
      }
      else if (this.currentState === CONSTANTS.STATES.GAMEOVER) {
        if (key === "r") location.reload();
        else if (key === "l") this.loadSavedGame(); 
      }
    });

    window.addEventListener("keyup", (e) => {
      this.lastKeyPressState[e.key.toLowerCase()] = false;
    });
  }

  _stopVoice() {
    if (this.currentVoiceTrack) {
      this.currentVoiceTrack.pause();
      this.currentVoiceTrack.currentTime = 0;
      this.currentVoiceTrack = null;
    }
  }

  _playVoice(audioKey) {
    this._stopVoice();
    if (!audioKey) return;
    
    const voice = this.assetLoader?.audio?.[audioKey];
    if (voice) {
      this.currentVoiceTrack = voice;
      voice.volume = this.uiManager.masterVolume * this.uiManager.sfxVolume;
      const p = voice.play();
      if (p && p.catch) p.catch(()=>{});
    }
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
      
      // Play first voice line
      const dialogue = this.stageManager.getCurrentDialogue();
      if (dialogue) this._playVoice(dialogue.audioKey);
      
      this.saveCurrentState();
    } else if (this.stageManager.hasStoryBefore(currentLevel)) {
      this.stageManager.startStoryBefore(currentLevel);
      this.isPlayingStoryAfter = false;
      this.currentState = CONSTANTS.STATES.STORY_CUTSCENE;
      this.uiManager.prologueIndex = 0;
      this.uiManager.prologueCharIndex = 0;
      this.uiManager.prologueFade = 0;
      
      // Play first voice line
      const dialogue = this.stageManager.getCurrentDialogue();
      if (dialogue) this._playVoice(dialogue.audioKey);
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
      this._stopVoice(); // Stop voice when cutscene ends
      if (this.isPlayingStoryAfter) {
        // --- FIXED: CHECK IF IT'S THE FINAL LEVEL ---
        if (this.levelManager.currentLevel >= this.levelManager.maxLevel) {
            // GAME BEATEN! Show Win Overlay + Special Audio
            this._showOverlay('GAME_COMPLETE', "CONGRATULATIONS!", "YOU SAVED THE FAMILY LEGACY!", 8000);
            
            // Play Final Win Audio
            const winSfx = this.assetLoader?.audio?.bgm_win_game;
            if (winSfx) {
                if (this.currentBgmTrack) this.currentBgmTrack.pause();
                winSfx.currentTime = 0;
                winSfx.volume = 0.8;
                winSfx.play().catch(()=>{});
            }

            this.currentState = CONSTANTS.STATES.MAIN_MENU;
            this.waveManager.clearAllEnemies();
            this.player.projectilePool.releaseAll();
            
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
    } else {
      // Play next voice line
      const dialogue = this.stageManager.getCurrentDialogue();
      if (dialogue) this._playVoice(dialogue.audioKey);
    }
  }

  _finishBossDefeatDelay() {
    this.bossDefeatTimer = 0;
    const completedLevel = this.levelManager.currentLevel;

    // Stop all possible boss defeat SFX
    const defeatKeys = ['sfx_kap_defeat', 'sfx_ian_defeat', 'sfx_malupiton_defeat'];
    defeatKeys.forEach(key => {
        const audio = this.assetLoader?.audio?.[key];
        if (audio) { audio.pause(); audio.currentTime = 0; }
    });

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
      
      // Play first voice line of aftermath
      const dialogue = this.stageManager.getCurrentDialogue();
      if (dialogue) this._playVoice(dialogue.audioKey);
    } else {
      this.currentState = CONSTANTS.STATES.SHOP;
      this.shopManager.open();
    }
  }

  _showOverlay(type, text, subtext = "", duration = 2500) {
    this.overlayType = type;
    this.overlayText = text;
    this.overlaySubtext = subtext;
    this.overlayTimer = duration;

    // Trigger Warning SFX for bosses
    if (type === 'BOSS_WARNING') {
        const sfx = this.assetLoader?.audio?.sfx_locked; // Use a 'warning' style sound
        if (sfx) { sfx.currentTime = 0; sfx.volume = 0.8; sfx.play().catch(()=>{}); }
    }
  }

  _startLevel() {
    this.currentState = CONSTANTS.STATES.PLAYING;
    const currentLevel = this.levelManager.currentLevel;
    const waveEnemies = this.stageManager.getWaveEnemies(currentLevel);
    this.waveManager.startWave(waveEnemies);
    this.player.resetAmmo();

    // Show Level Start Overlay
    const isBoss = currentLevel % 5 === 0;
    if (isBoss) {
        let bossName = "UNKNOWN BOSS";
        if (currentLevel === 5) bossName = "INSPECTOR KAP NIÑO";
        else if (currentLevel === 10) bossName = "VLOGGER IAN";
        else if (currentLevel === 15) bossName = "THE MASTERMIND";
        this._showOverlay('BOSS_WARNING', "WARNING!", `BOSS DETECTED: ${bossName}`, 3500);
    } else {
        this._showOverlay('WAVE_START', `LEVEL ${currentLevel}`, "READY? DEFEND THE CART!", 2000);
    }
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

      // Play first voice line
      const dialogue = this.stageManager.getCurrentDialogue();
      if (dialogue) this._playVoice(dialogue.audioKey);
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
    // 1. Check if Secret Menu is open or Story Cutscene is playing - if so, silence everything and return
    if ((window.secretMenu && window.secretMenu.isMenuOpen) || this.currentState === CONSTANTS.STATES.STORY_CUTSCENE) {
      if (this.currentBgmTrack) this.currentBgmTrack.pause();
      return;
    }

    // 2. We added MAIN_MENU and DIFFICULTY_SELECT to the active states
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

    // 3. Check which track we should be playing
    let targetBgmKey = null;
    
    // Block main menu music if we've jumped
    if (window.isSecretMenuJumped && (this.currentState === CONSTANTS.STATES.MAIN_MENU || this.currentState === CONSTANTS.STATES.DIFFICULTY_SELECT)) {
        targetBgmKey = null; 
    } else if (this.currentState === CONSTANTS.STATES.MAIN_MENU || this.currentState === CONSTANTS.STATES.DIFFICULTY_SELECT) {
      targetBgmKey = 'bgm_main_menu'; 
    } else if (this.currentState === CONSTANTS.STATES.PLAYING || this.currentState === CONSTANTS.STATES.ARSENAL_SELECT) {
      // MISSION MUSIC: Only play when actually inside the stage or selecting gear
      const levelData = this.levelManager.getLevelData();
      targetBgmKey = levelData.bgm; 
    } else {
      // For SHOP, VICTORY, etc. - stay silent or maintain current track pause
      targetBgmKey = null;
    }

    // 4. Handle changing the tracks
    if (this.currentBgmKey !== targetBgmKey) {
      if (this.currentBgmTrack) {
        this.currentBgmTrack.pause();
        this.currentBgmTrack.currentTime = 0; 
      }
      
      this.currentBgmKey = targetBgmKey;
      this.currentBgmTrack = targetBgmKey ? this.assetLoader?.audio?.[targetBgmKey] : null;

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
    
    // --- Cinematic Overlay Timing ---
    if (this.overlayTimer > 0) {
        this.overlayTimer -= delta;
        if (this.overlayTimer <= 0) {
            this.overlayType = null;
            // If it was the final victory, we might want to stay on the win screen 
            // but the drawing logic will handle that.
        }
    }

    // --- Boss Defeat Delay Handling ---
    if (this.bossDefeatTimer > 0) {
        this.bossDefeatTimer -= delta;
        if (this.currentBgmTrack) this.currentBgmTrack.pause();
        
        // Handle Boss Defeat SFX specifically (Stop after 5s)
        const completedLevel = this.levelManager.currentLevel;
        let defeatSfx = null;
        if (completedLevel === 5) defeatSfx = this.assetLoader?.audio?.sfx_kap_defeat;
        else if (completedLevel === 10) defeatSfx = this.assetLoader?.audio?.sfx_ian_defeat;
        else if (completedLevel === 15) defeatSfx = this.assetLoader?.audio?.sfx_malupiton_defeat;

        if (this.bossDefeatTimer <= 0) {
            if (defeatSfx) {
                defeatSfx.pause();
                defeatSfx.currentTime = 0;
            }
            this._finishBossDefeatDelay();
            return;
        }
        
        // Still update visuals but pause logic
        if (this.player) this.player.update(delta);
        if (this.waveManager) this.waveManager.update(delta);
        if (this.uiManager) this.uiManager.update(delta);
        return;
    }

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
      const completedLevel = this.levelManager.currentLevel;
      const isBossLevel = (completedLevel % 5 === 0);

      // Trigger 5-second delay for boss levels
      if (isBossLevel && this.bossDefeatTimer <= 0) {
          this.bossDefeatTimer = 5000;
          if (this.currentBgmTrack) this.currentBgmTrack.pause();

          // Trigger the Defeat Music/Voiceline
          let defeatSfx = null;
          if (completedLevel === 5) defeatSfx = this.assetLoader?.audio?.bgm_kap_defeat;
          else if (completedLevel === 10) defeatSfx = this.assetLoader?.audio?.bgm_ian_defeat;
          else if (completedLevel === 15) defeatSfx = this.assetLoader?.audio?.bgm_malupiton_defeat;

          if (defeatSfx) {
              defeatSfx.currentTime = 0;
              defeatSfx.volume = 0.8;
              const p = defeatSfx.play();
              if (p && p.catch) p.catch(()=>{});
          }
          return;
      }
      
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

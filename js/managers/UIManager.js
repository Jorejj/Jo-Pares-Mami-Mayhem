// UIManager.js – Renders HUD on canvas and manages HTML UI screens.

class UIManager {
  constructor(game) {
    this.game = game;
    this.prologueIndex = 0;
    this.prologueTimer = 0;
    this.prologueCharIndex = 0;
    this.prologueTypingTimer = 0;
    this.prologueFade = 1.0;
    this.tutorialIndex = 0;
    this.showInGameTutorial = false;
    this.isSettingsOpen = false;
    this.isPaused = false;
    
    // NEW: Tutorial system
    this.wasPausedBeforeSettings = false;
    this.showStaticTutorial = false;
    this.staticTutorialIndex = 0;
    this.showDynamicTutorial = false;
    this.dynamicTutorialStep = 0;
    
    // NEW: Audio settings
    this.masterVolume = 0.5;
    this.bgmVolume = 0.5;
    this.sfxVolume = 0.5;

    // === FEATURE 1: Tutorial Arrow ===
    this.tutorialArrowX = 0;
    this.tutorialArrowY = 0;
    this.tutorialArrowAngle = 0;

    // === FEATURE 2 & 3: Home Button + Confirmation Modal ===
    this.isConfirmingHome = false;
    this.confirmHomeSource = null;
    
    this._setupHtmlButtons();
  }

  _setupHtmlButtons() {
    const actions = {
      'btn-new-game': () => { 
        this.game.saveManager.reset(); 
        this.game.waveManager.currentWave = 1; 
        this.game.currentState = CONSTANTS.STATES.DIFFICULTY_SELECT; 
      },
      'btn-load-game': () => { this.game.loadSavedGame(); },
      'btn-quit': () => location.reload(),
      'btn-diff-easy': () => this._startNewGame('easy'),
      'btn-diff-medium': () => this._startNewGame('medium'),
      'btn-diff-hard': () => this._startNewGame('hard'),
      'btn-tut-next': () => this._advanceTutorial(),
      'btn-visit-shop': () => { this.game.currentState = CONSTANTS.STATES.SHOP; this.game.shopManager.open(); },
      'btn-shop-mami': () => { this.game.shopManager.handleSelection(1); this._updateShopUI(); },
      'btn-shop-pares': () => { this.game.shopManager.handleSelection(2); this._updateShopUI(); },
      'btn-shop-rice': () => { this.game.shopManager.handleSelection(3); this._updateShopUI(); },
      'btn-shop-calamansi': () => { this.game.shopManager.handleSelection(4); this._updateShopUI(); },
      'btn-shop-chili': () => { this.game.shopManager.handleSelection(5); this._updateShopUI(); },
      'btn-shop-garlic': () => { this.game.shopManager.handleSelection(6); this._updateShopUI(); },
      'btn-shop-done': () => this._finishShopping(),
      'btn-restart': () => location.reload(),
      
      'btn-pause-toggle': () => { this._togglePause(); },
      'btn-resume': () => { this._togglePause(); },
      'btn-pause-home': () => { this.isPaused = false; this.game.currentState = CONSTANTS.STATES.MAIN_MENU; },

      'btn-settings-open': () => { 
        if (this.game.currentState === CONSTANTS.STATES.PLAYING) {
          this.wasPausedBeforeSettings = this.isPaused;
          this.isPaused = true;
        }
        this.isSettingsOpen = true; 
      },
      'btn-settings-close': () => { 
        this.isSettingsOpen = false;
        if (this.game.currentState === CONSTANTS.STATES.PLAYING && !this.wasPausedBeforeSettings) {
          this.isPaused = false;
        }
        this.wasPausedBeforeSettings = false;
      },
      'btn-settings-x': () => { 
        this.isSettingsOpen = false;
        if (this.game.currentState === CONSTANTS.STATES.PLAYING && !this.wasPausedBeforeSettings) {
          this.isPaused = false;
        }
        this.wasPausedBeforeSettings = false;
      },
      'btn-back-home': () => { 
        this.isSettingsOpen = false;
        this.game.currentState = CONSTANTS.STATES.MAIN_MENU;
      },
      'btn-save-game': () => { 
        this.game.saveCurrentState(); 
        alert("Game Saved Successfully!"); 
      },
      'btn-reset-save': () => { 
        if(confirm("Reset all data? This cannot be undone.")) { 
          this.game.saveManager.reset(); location.reload(); 
        } 
      },
      
      // NEW: Settings and tutorial buttons
      'btn-settings-menu': () => this._openSettings(),
      'btn-howtoplay-menu': () => this._openStaticTutorial(),
      'btn-static-tut-next': () => this._advanceStaticTutorial(),
      'btn-static-tut-close': () => this._closeStaticTutorial(),
      'btn-reset-audio-defaults': () => this._resetAudioDefaults(),
      'btn-settings-close-home': () => this._closeSettings(),
      'btn-clear-save': () => {
        if (confirm("Clear all save data? This cannot be undone!")) {
          this.game.saveManager.reset();
          alert("Save data cleared!");
        }
      },
      'btn-howtoplay-settings': () => this._openDynamicTutorialFromSettings(),
      'btn-settings-quit-home': () => { this.isConfirmingHome = true; this.confirmHomeSource = 'settings'; },
      'btn-dynamic-tut-next': () => this._advanceDynamicTutorial(),
      'btn-dynamic-tut-gotit': () => this._closeDynamicTutorial()
    };

    for (const [id, action] of Object.entries(actions)) {
      const btn = document.getElementById(id);
      if (btn) btn.onclick = (e) => { e.preventDefault(); action(); };
    }

    // OLD: Single global volume slider (keep for compatibility)
    const slider = document.getElementById('slider-volume');
    if (slider) {
      slider.oninput = (e) => {
        const vol = parseFloat(e.target.value);
        this._updateGlobalVolume(vol);
      };
    }
    
    // NEW: Separate volume sliders
    const masterSlider = document.getElementById('slider-volume-master');
    if (masterSlider) {
      masterSlider.oninput = (e) => {
        this.masterVolume = parseFloat(e.target.value);
        this._updateAllVolumes();
      };
    }
    
    const bgmSlider = document.getElementById('slider-volume-bgm');
    if (bgmSlider) {
      bgmSlider.oninput = (e) => {
        this.bgmVolume = parseFloat(e.target.value);
        this._updateAllVolumes();
      };
    }
    
    const sfxSlider = document.getElementById('slider-volume-sfx');
    if (sfxSlider) {
      sfxSlider.oninput = (e) => {
        this.sfxVolume = parseFloat(e.target.value);
        this._updateAllVolumes();
      };
    }

    this.game.canvas.addEventListener('click', (e) => {
      // FEATURE 3: Handle Confirmation Modal clicks (highest priority)
      if (this.isConfirmingHome) {
        const rect = this.game.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Modal box centered at canvas center
        const modalW = 400;
        const modalH = 250;
        const modalX = (this.game.canvas.width - modalW) / 2;
        const modalY = (this.game.canvas.height - modalH) / 2;

        // YES button: bottom-left of modal
        const yesX = modalX + 50;
        const yesY = modalY + 190;
        const yesBtnW = 140;
        const yesBtnH = 40;

        // NO button: bottom-right of modal
        const noX = modalX + 210;
        const noY = modalY + 190;
        const noBtnW = 140;
        const noBtnH = 40;

        // Click detection with bounding box
        if (x >= yesX && x < yesX + yesBtnW && y >= yesY && y < yesY + yesBtnH) {
          // YES clicked - return to home
          this.isConfirmingHome = false;
          this.game.saveManager.reset();
          this.game.currentState = CONSTANTS.STATES.MAIN_MENU;
          this.isSettingsOpen = false;
          this.isPaused = false;
          this.wasPausedBeforeSettings = false;
          return;
        }

        if (x >= noX && x < noX + noBtnW && y >= noY && y < noY + noBtnH) {
          // NO clicked - close modal, stay in settings
          this.isConfirmingHome = false;
          return;
        }
      }

      // FEATURE 2 & 3: Handle "Back to Home" button in Settings
      if (this.isSettingsOpen && this.game.currentState !== CONSTANTS.STATES.MAIN_MENU) {
        const rect = this.game.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // "Back to Home" button in Settings (when in-game)
        const backHomeX = (this.game.canvas.width - 200) / 2;
        const backHomeY = 450;
        const btnW = 200;
        const btnH = 50;

        if (x >= backHomeX && x < backHomeX + btnW && y >= backHomeY && y < backHomeY + btnH) {
          this.isConfirmingHome = true;
          this.confirmHomeSource = 'settings';
          return;
        }
      }

      // Original behavior: advance prologue on canvas click
      if (this.game.currentState === CONSTANTS.STATES.PROLOGUE) {
        const rect = this.game.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Check SKIP button first
        if (this._prologueSkipBtnBounds) {
          const bounds = this._prologueSkipBtnBounds;
          if (x >= bounds.x && x < bounds.x + bounds.w && y >= bounds.y && y < bounds.y + bounds.h) {
            this._skipPrologue();
            return;
          }
        }

        // Default: advance to next prologue step
        this._advancePrologue();
      }
    });
  }

  _updateGlobalVolume(vol) {
    if (!this.game.assetLoader || !this.game.assetLoader.audio) return;
    Object.values(this.game.assetLoader.audio).forEach(audio => {
      if (audio instanceof Audio) audio.volume = vol;
    });
  }
  
  _updateAllVolumes() {
    if (!this.game.assetLoader || !this.game.assetLoader.audio) return;
    
    Object.entries(this.game.assetLoader.audio).forEach(([key, audio]) => {
      if (audio instanceof Audio) {
        if (key.startsWith('bgm_')) {
          audio.volume = this.masterVolume * this.bgmVolume;
        } else if (key.startsWith('sfx_')) {
          audio.volume = this.masterVolume * this.sfxVolume;
        } else {
          audio.volume = this.masterVolume;
        }
      }
    });
  }
  
  _resetAudioDefaults() {
    this.masterVolume = 0.5;
    this.bgmVolume = 0.5;
    this.sfxVolume = 0.5;
    
    const masterSlider = document.getElementById('slider-volume-master');
    const bgmSlider = document.getElementById('slider-volume-bgm');
    const sfxSlider = document.getElementById('slider-volume-sfx');
    
    if (masterSlider) masterSlider.value = 0.5;
    if (bgmSlider) bgmSlider.value = 0.5;
    if (sfxSlider) sfxSlider.value = 0.5;
    
    this._updateAllVolumes();
  }
  
  _openSettings() {
    if (this.game.currentState === CONSTANTS.STATES.PLAYING) {
      this.wasPausedBeforeSettings = this.isPaused;
      this.isPaused = true;
    }
    this.isSettingsOpen = true;
  }
  
  _closeSettings() {
    this.isSettingsOpen = false;
    if (this.game.currentState === CONSTANTS.STATES.PLAYING && !this.wasPausedBeforeSettings) {
      this.isPaused = false;
    }
    this.wasPausedBeforeSettings = false;
  }
  
  _openStaticTutorial() {
    this.showStaticTutorial = true;
    this.staticTutorialIndex = 0;
    this._updateStaticTutorialContent();
  }
  
  _closeStaticTutorial() {
    this.showStaticTutorial = false;
    this.staticTutorialIndex = 0;
  }
  
  _advanceStaticTutorial() {
    this.staticTutorialIndex++;
    if (this.staticTutorialIndex >= CONSTANTS.TUTORIAL_STEPS.length) {
      this._closeStaticTutorial();
    } else {
      this._updateStaticTutorialContent();
    }
  }
  
  _updateStaticTutorialContent() {
    const step = CONSTANTS.TUTORIAL_STEPS[this.staticTutorialIndex];
    if (!step) return;
    
    const titleEl = document.getElementById('static-tut-title');
    const textEl = document.getElementById('static-tut-text');
    const imageEl = document.getElementById('static-tut-image');
    const nextBtn = document.getElementById('btn-static-tut-next');
    
    if (titleEl) titleEl.innerText = step.title || '';
    if (textEl) textEl.innerText = (step.text || '').toUpperCase();
    
    // NEW: Use the asset loader to get the actual image
    if (imageEl && step.image) {
      const imageSrc = this.game.assetLoader.images[step.image];
      if (imageSrc) {
        imageEl.src = imageSrc.src || '';
      }
    }
    
    if (nextBtn) {
      const isLastStep = this.staticTutorialIndex >= CONSTANTS.TUTORIAL_STEPS.length - 1;
      nextBtn.innerText = isLastStep ? 'CLOSE' : 'NEXT';
    }
  }
  
  _openDynamicTutorialFromHome() {
    // From main menu, always show dynamic tutorial
    this.dynamicTutorialStep = 0;
    const overlay = document.getElementById('dynamic-tutorial-overlay');
    if (overlay) {
      overlay.querySelectorAll('.tutorial-highlight').forEach(el => el.remove());
      overlay.querySelectorAll('.tutorial-tooltip').forEach(el => el.remove());
    }
    
    this.showDynamicTutorial = true;
    this._updateDynamicTutorialContent();
  }

  _openDynamicTutorialFromSettings() {
    if (this.game.currentState === CONSTANTS.STATES.PLAYING) {
      this.isSettingsOpen = false;
      this.isPaused = true;
      
      // Reset tutorial step to 0 and clear any leftover elements
      this.dynamicTutorialStep = 0;
      const overlay = document.getElementById('dynamic-tutorial-overlay');
      if (overlay) {
        overlay.querySelectorAll('.tutorial-highlight').forEach(el => el.remove());
        overlay.querySelectorAll('.tutorial-tooltip').forEach(el => el.remove());
      }
      
      this.showDynamicTutorial = true;
      this._updateDynamicTutorialContent();
    } else {
      this._openDynamicTutorialFromHome();
    }
  }
  
  _closeDynamicTutorial() {
    this.showDynamicTutorial = false;
    this.dynamicTutorialStep = 0;
    
    // Clear ALL highlight and tooltip elements from the overlay
    const overlay = document.getElementById('dynamic-tutorial-overlay');
    if (overlay) {
      overlay.querySelectorAll('.tutorial-highlight').forEach(el => el.remove());
      overlay.querySelectorAll('.tutorial-tooltip').forEach(el => el.remove());
    }
    
    if (this.game.currentState === CONSTANTS.STATES.PLAYING && !this.wasPausedBeforeSettings) {
      this.isPaused = false;
    }
    this.wasPausedBeforeSettings = false;
  }
  
  _advanceDynamicTutorial() {
    this.dynamicTutorialStep++;
    this._updateDynamicTutorialContent();
  }
  
  _updateDynamicTutorialContent() {
    // Apply exact step-by-step rendering
    this._renderDynamicTutorialStep(this.dynamicTutorialStep);
  }

  _renderDynamicTutorialStep(stepIndex) {
    // Define exact 4-step tutorial sequence with hardcoded coordinates
    const tutorialSteps = [
      {
        // Step 1: Arsenal (3x2 Grid - Weapons + Specials)
        highlight: { top: '150px', left: '10px', width: '230px', height: '160px' },
        tooltip: { top: '320px', left: '10px' },
        text: "Your Arsenal! Press 1-3 for ammo, 4-6 for special attacks!",
        buttonText: 'NEXT'
      },
      {
        // Step 2: HUD (Health & Kita)
        highlight: { top: '10px', left: '10px', width: '220px', height: '130px' },
        tooltip: { top: '150px', left: '250px' },
        text: "Keep an eye on Jo's HP, your Kita, and Wave stats here!",
        buttonText: 'NEXT'
      },
      {
        // Step 3: Jo (Catapult)
        highlight: { top: '400px', left: '20px', width: '250px', height: '300px' },
        tooltip: { top: '300px', left: '290px' },
        text: "Click, drag back from Jo, and release to sling hot food at enemies!",
        buttonText: 'NEXT'
      },
      {
        // Step 4: Enemy Spawn Area
        highlight: { top: '200px', left: '1100px', width: '150px', height: '450px' },
        tooltip: { top: '350px', left: '750px' },
        text: "Enemies will spawn from this side! Don't let them reach your cart!",
        buttonText: 'GOT IT!'
      }
    ];

    // Get overlay elements
    const overlay = document.getElementById('dynamic-tutorial-overlay');
    if (!overlay) return;

    // Clear ALL previous highlights and tooltips (not just one)
    overlay.querySelectorAll('.tutorial-highlight').forEach(el => el.remove());
    overlay.querySelectorAll('.tutorial-tooltip').forEach(el => el.remove());

    // If we've exceeded steps, close tutorial
    if (stepIndex >= tutorialSteps.length) {
      this._closeDynamicTutorial();
      return;
    }

    const step = tutorialSteps[stepIndex];

    // Create highlight box
    const highlight = document.createElement('div');
    highlight.className = 'tutorial-highlight';
    Object.assign(highlight.style, step.highlight);
    overlay.appendChild(highlight);

    // NOTE: Tooltips removed to prevent blocking modal box

    // Update button text and visibility
    const nextBtn = document.getElementById('btn-dynamic-tut-next');
    const gotitBtn = document.getElementById('btn-dynamic-tut-gotit');
    const messageEl = document.getElementById('dynamic-tut-message');

    if (messageEl) messageEl.textContent = step.text.toUpperCase();

    if (step.buttonText === 'GOT IT!') {
      if (nextBtn) nextBtn.classList.add('hidden');
      if (gotitBtn) gotitBtn.classList.remove('hidden');
    } else {
      if (nextBtn) {
        nextBtn.classList.remove('hidden');
        nextBtn.textContent = step.buttonText;
      }
      if (gotitBtn) gotitBtn.classList.add('hidden');
    }
  }

  _startNewGame(diffKey) {
    this.game.currentDifficulty = CONSTANTS.DIFFICULTY[diffKey];
    this.game.currentState = CONSTANTS.STATES.PROLOGUE;
    this.prologueIndex = 0;
    this.prologueTimer = 0;
  }

  _advancePrologue() {
    this.prologueIndex++;
    this.prologueTimer = 0;
    this.prologueCharIndex = 0;
    this.prologueTypingTimer = 0;
    this.prologueFade = 0; 
    
    if (this.prologueIndex >= CONSTANTS.PROLOGUE_LINES.length) {
      this._startPlaying();
    }
  }

  _skipPrologue() {
    this._startPlaying();
  }

  _advanceTutorial() {
    this.tutorialIndex++;
    if (this.tutorialIndex >= CONSTANTS.TUTORIAL_STEPS.length) {
      this.showInGameTutorial = false;
      this.game.saveManager.state.hasSeenTutorial = true;
      this.game.saveCurrentState();
    }
  }

  _finishShopping() {
    this.game.shopManager.close();
    this._startPlaying();
  }

  _startPlaying() {
    this.game.currentState = CONSTANTS.STATES.PLAYING;
    this.game.waveManager.startWave(this.game._getWaveEnemies());
    // Tutorial removed - only triggers from "HOW TO PLAY" button
  }

  _updateTutorialArrow(delta) {
    if (!this.showDynamicTutorial && !this.showInGameTutorial) return;

    // Dialog box position (from HTML: bottom: 50px, left: 50%)
    const dialogX = this.game.canvas.width / 2;      // centered
    const dialogY = this.game.canvas.height - 50;    // bottom: 50px

    let targetX = this.game.canvas.width / 2;
    let targetY = 350;

    switch (this.dynamicTutorialStep || 0) {
      case 0:
        // Arsenal (3x2 Grid: left: 10px, top: 150px, width: 230px, height: 160px)
        targetX = 10 + 115;   // 10 + (230/2)
        targetY = 150 + 80;   // 150 + (160/2)
        break;
      case 1:
        // HUD (Health & Kita: left: 10px, top: 10px, width: 220px, height: 130px)
        targetX = 10 + 110;   // 10 + (220/2)
        targetY = 10 + 65;    // 10 + (130/2)
        break;
      case 2:
        // Jo/Catapult (Left side: left: 20px, top: 400px, width: 250px, height: 300px)
        targetX = 20 + 125;   // 20 + (250/2)
        targetY = 400 + 150;  // 400 + (300/2)
        break;
      case 3:
        // Enemy Spawn Area (Right: left: 1100px, top: 200px, width: 150px, height: 450px)
        targetX = 1100 + 75;   // 1100 + (150/2)
        targetY = 200 + 225;   // 200 + (450/2)
        break;
    }

    const dx = targetX - dialogX;
    const dy = targetY - dialogY;

    this.tutorialArrowAngle = Math.atan2(dy, dx);

    const pulse = Math.sin(Date.now() * 0.005) * 10;
    const distance = Math.sqrt(dx * dx + dy * dy) * 0.5;

    this.tutorialArrowX = dialogX + Math.cos(this.tutorialArrowAngle) * (distance + pulse);
    this.tutorialArrowY = dialogY + Math.sin(this.tutorialArrowAngle) * (distance + pulse);
  }

  update(delta) {
    const state = this.game.currentState;
    
    // NEW: Update tutorial arrow animation
    this._updateTutorialArrow(delta);
    
    // Screen visibility
    this._showScreen('screen-main-menu', state === CONSTANTS.STATES.MAIN_MENU && !this.isSettingsOpen);
    this._showScreen('screen-difficulty', state === CONSTANTS.STATES.DIFFICULTY_SELECT && !this.isSettingsOpen);
    this._showScreen('screen-tutorial', this.showInGameTutorial && !this.isSettingsOpen);
    this._showScreen('screen-victory', state === CONSTANTS.STATES.VICTORY && !this.isSettingsOpen);
    this._showScreen('screen-shop', state === CONSTANTS.STATES.SHOP && !this.isSettingsOpen);
    this._showScreen('screen-gameover', state === CONSTANTS.STATES.GAMEOVER && !this.isSettingsOpen);
    this._showScreen('screen-settings', this.isSettingsOpen && !this.isConfirmingHome);
    this._showScreen('screen-pause', this.isPaused && !this.isSettingsOpen && !this.showDynamicTutorial);
    
    // NEW: Tutorial screens
    this._showScreen('screen-static-tutorial', this.showStaticTutorial);
    this._showScreen('dynamic-tutorial-overlay', this.showDynamicTutorial);

    if (state === CONSTANTS.STATES.MAIN_MENU) {
      const loadBtn = document.getElementById('btn-load-game');
      if (loadBtn) {
        const hasSave = localStorage.getItem(this.game.saveManager._key);
        loadBtn.disabled = !hasSave;
        loadBtn.style.opacity = hasSave ? "1" : "0.5";
        loadBtn.style.cursor = hasSave ? "pointer" : "not-allowed";
      }
    }

    const settingsContainer = document.getElementById('settings-btn-container');
    if (settingsContainer) {
      const showContainer = (
        state === CONSTANTS.STATES.PLAYING || 
        state === CONSTANTS.STATES.SHOP ||
        state === CONSTANTS.STATES.VICTORY ||
        state === CONSTANTS.STATES.GAMEOVER
      );
      
      if (showContainer) settingsContainer.classList.remove('hidden');
      else settingsContainer.classList.add('hidden');

      const pauseBtn = document.getElementById('btn-pause-toggle');
      if (pauseBtn) {
        if (state === CONSTANTS.STATES.PLAYING) pauseBtn.classList.remove('hidden');
        else pauseBtn.classList.add('hidden');
      }
    }
    
    // NEW: Context-aware settings buttons
    const homeButtons = document.getElementById('settings-home-buttons');
    const playingButtons = document.getElementById('settings-playing-buttons');
    
    if (homeButtons) {
      if (state === CONSTANTS.STATES.MAIN_MENU) {
        homeButtons.classList.remove('hidden');
      } else {
        homeButtons.classList.add('hidden');
      }
    }
    
    if (playingButtons) {
      if (state === CONSTANTS.STATES.PLAYING || state === CONSTANTS.STATES.SHOP || 
          state === CONSTANTS.STATES.VICTORY || state === CONSTANTS.STATES.GAMEOVER) {
        playingButtons.classList.remove('hidden');
      } else {
        playingButtons.classList.add('hidden');
      }
    }

    if (state === CONSTANTS.STATES.SHOP) this._updateShopUI();
    if (state === CONSTANTS.STATES.VICTORY) {
        const stats = document.getElementById('victory-stats');
        if (stats) stats.innerText = `KITA EARNED: ${CONSTANTS.CURRENCY_SYMBOL}${this.game.player.kita}`;
    }

    if (this.showInGameTutorial) {
      const step = CONSTANTS.TUTORIAL_STEPS[this.tutorialIndex];
      if (step) {
        document.getElementById('tut-title').innerText = step.title;
        document.getElementById('tut-text').innerText = step.text.toUpperCase();
      }
    }

    if (state === CONSTANTS.STATES.PROLOGUE && !this.isSettingsOpen) {
      this.prologueTimer += delta;
      
      const fullText = CONSTANTS.PROLOGUE_LINES[this.prologueIndex] || "";
      if (this.prologueCharIndex < fullText.length) {
        this.prologueTypingTimer += delta;
        if (this.prologueTypingTimer > 30) {
          this.prologueCharIndex++;
          this.prologueTypingTimer = 0;
        }
      }

      if (this.prologueFade < 1.0) {
        this.prologueFade += delta * 0.002; 
        if (this.prologueFade > 1.0) this.prologueFade = 1.0;
      }

      if (this.prologueTimer > 5000 && this.prologueCharIndex >= fullText.length) { 
        this._advancePrologue(); 
      }
    }
  }

  _showScreen(id, visible) {
    const el = document.getElementById(id);
    if (el) {
      if (visible) el.classList.remove('hidden');
      else el.classList.add('hidden');
    }
  }

  _updateShopUI() {
    const player = this.game.player;
    const shop = this.game.shopManager;
    const shopKitaEl = document.getElementById('shop-kita');
    if (shopKitaEl) shopKitaEl.innerText = `${CONSTANTS.CURRENCY_SYMBOL}${player.kita}`;

    // Update Weapons [1, 2, 3]
    ['mami', 'pares', 'rice'].forEach((w, index) => {
      const btn = document.getElementById(`btn-shop-${w}`);
      if (!btn) return;
      const weapon = player.arsenal[w];
      const upgradeCost = shop.getUpgradeCost(w);
      const isMax = weapon.level >= CONSTANTS.MAX_WEAPON_LEVEL;

      let content = `<span class="item-name">[${index + 1}] ${w.toUpperCase()}</span>`;
      if (!weapon.unlocked) {
        content += `<span class="item-price">UNLOCK: ${CONSTANTS.CURRENCY_SYMBOL}${weapon.baseCost}</span>`;
        btn.disabled = player.kita < weapon.baseCost;
      } else if (isMax) {
        content += `<span class="item-price">LVL: ${weapon.level} (MAX)</span>`;
        btn.disabled = true;
      } else {
        content += `<span class="item-price">LVL: ${weapon.level} ➔ ${weapon.level + 1} | COST: ${CONSTANTS.CURRENCY_SYMBOL}${upgradeCost}</span>`;
        btn.disabled = player.kita < upgradeCost;
      }
      btn.innerHTML = content;
    });

    // --- NEW: Update Specials [4, 5, 6] ---
    ['calamansi', 'chili', 'garlic'].forEach((s, index) => {
      const btn = document.getElementById(`btn-shop-${s}`);
      if (!btn) return; // Note: Ensure you add <button id="btn-shop-garlic"> to your HTML!
      const special = player.specials[s];
      const cost = special.baseCost;
      const keyMap = ['4', '5', '6'];

      let content = `<span class="item-name">[${keyMap[index]}] ${s.toUpperCase()}</span>`;
      if (!special.unlocked) {
        content += `<span class="item-price">UNLOCK: ${CONSTANTS.CURRENCY_SYMBOL}${cost}</span>`;
        btn.disabled = player.kita < cost;
      } else {
        content += `<span class="item-price" style="color:#f39c12">UNLOCKED!</span>`;
        btn.disabled = true;
      }
      btn.innerHTML = content;
    });
  }

  draw(ctx) {
    const state = this.game.currentState;
    switch (state) {
      case CONSTANTS.STATES.MAIN_MENU: this._drawSunburst(ctx, '#ffcc00', '#ffb300'); break;
      case CONSTANTS.STATES.DIFFICULTY_SELECT: this._drawSunburst(ctx, '#3498db', '#2980b9'); break;
      case CONSTANTS.STATES.PROLOGUE: this._drawPrologue(ctx); break;
      case CONSTANTS.STATES.PLAYING: 
        this._drawPlayingHUD(ctx); 
        if (this.showInGameTutorial) this._drawInGameTutorialOverlay(ctx);
        break;
      case CONSTANTS.STATES.VICTORY: this._drawSunburst(ctx, '#2ecc71', '#27ae60'); break;
      case CONSTANTS.STATES.SHOP: this._drawSunburst(ctx, '#e67e22', '#d35400'); break;
      case CONSTANTS.STATES.GAMEOVER: this._drawSunburst(ctx, '#e74c3c', '#c0392b'); break;
    }

    if (this.isSettingsOpen) {
      this._drawSettingsHomeButton(ctx);
    }
    
    // Draw arrow BEFORE confirmation modal so it's visible
    this._drawTutorialArrow(ctx);
    
    // Draw confirmation modal LAST (highest z-index)
    this._drawConfirmationModal(ctx);
  }

  _drawTutorialArrow(ctx) {
    if (!this.showDynamicTutorial && !this.showInGameTutorial) {
      return;
    }

    const x = this.tutorialArrowX;
    const y = this.tutorialArrowY;
    const angle = this.tutorialArrowAngle;
    const shaftLength = 100;
    const arrowHeadSize = 18;

    // Animated glow intensity - MUCH BRIGHTER
    const glowPulse = Math.sin(Date.now() * 0.008) * 0.2 + 0.8;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // === BRIGHT GLOW LAYERS - Hugging the arrow ===
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Outer glow layer 1 - BRIGHT
    ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.strokeStyle = `rgba(255, 215, 0, ${0.6 * glowPulse})`;
    ctx.lineWidth = 20;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(shaftLength, 0);
    ctx.stroke();

    // Outer glow layer 2 - EVEN BRIGHTER
    ctx.strokeStyle = `rgba(255, 230, 0, ${0.5 * glowPulse})`;
    ctx.lineWidth = 28;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(shaftLength, 0);
    ctx.stroke();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // === MAIN SHAFT - Gold with black outline ===
    // Black outline
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(shaftLength, 0);
    ctx.stroke();

    // Gold inner line - BRIGHT
    ctx.strokeStyle = '#ffed4e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(shaftLength, 0);
    ctx.stroke();

    // === ANIMATED PULSE WAVE ===
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.6 * glowPulse})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(shaftLength, 0);
    ctx.stroke();
    ctx.setLineDash([]);

    // === ARROWHEAD - Bright glow + Shadow + Main ===
    // Arrowhead outer glow - BRIGHT
    ctx.fillStyle = `rgba(255, 215, 0, ${0.4 * glowPulse})`;
    ctx.beginPath();
    ctx.moveTo(shaftLength + 4, 0);
    ctx.lineTo(shaftLength - arrowHeadSize + 4, -arrowHeadSize - 4);
    ctx.lineTo(shaftLength - arrowHeadSize + 4, arrowHeadSize + 4);
    ctx.closePath();
    ctx.fill();

    // Arrowhead shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.moveTo(shaftLength + 2, 2);
    ctx.lineTo(shaftLength - arrowHeadSize + 2, -arrowHeadSize + 2);
    ctx.lineTo(shaftLength - arrowHeadSize + 2, arrowHeadSize + 2);
    ctx.closePath();
    ctx.fill();

    // Main arrowhead (bright gold)
    ctx.fillStyle = '#ffed4e';
    ctx.beginPath();
    ctx.moveTo(shaftLength, 0);
    ctx.lineTo(shaftLength - arrowHeadSize, -arrowHeadSize);
    ctx.lineTo(shaftLength - arrowHeadSize, arrowHeadSize);
    ctx.closePath();
    ctx.fill();

    // Arrowhead outline
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Arrowhead highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.moveTo(shaftLength - 2, -3);
    ctx.lineTo(shaftLength - arrowHeadSize + 4, -arrowHeadSize + 6);
    ctx.lineTo(shaftLength - arrowHeadSize + 3, -arrowHeadSize + 2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // === BRIGHT CENTER CORE ===
    const centerGlowAlpha = (Math.sin(Date.now() * 0.01) + 1) * 0.4;
    ctx.fillStyle = `rgba(255, 255, 150, ${centerGlowAlpha})`;
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffff99';
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawConfirmationModal(ctx) {
    if (!this.isConfirmingHome) return;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, this.game.canvas.width, this.game.canvas.height);

    const modalW = 400;
    const modalH = 250;
    const modalX = (this.game.canvas.width - modalW) / 2;
    const modalY = (this.game.canvas.height - modalH) / 2;

    this._drawComicBox(ctx, modalX, modalY, modalW, modalH, '#fff', '#000');

    ctx.fillStyle = '#e74c3c';
    ctx.font = 'bold 24px "Comic Sans MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CONFIRM RETURN HOME?', this.game.canvas.width / 2, modalY + 40);

    ctx.fillStyle = '#000';
    ctx.font = '16px "Comic Sans MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Unsaved progress will be lost.', this.game.canvas.width / 2, modalY + 90);
    ctx.fillText('Jo will be reset to level 1.', this.game.canvas.width / 2, modalY + 120);

    const yesX = modalX + 50;
    const yesY = modalY + 190;
    const yesBtnW = 140;
    const yesBtnH = 40;
    
    this._drawComicBox(ctx, yesX, yesY, yesBtnW, yesBtnH, '#2ecc71', '#27ae60');
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px "Comic Sans MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('YES', yesX + yesBtnW / 2, yesY + yesBtnH / 2);

    const noX = modalX + 210;
    const noY = modalY + 190;
    const noBtnW = 140;
    const noBtnH = 40;
    
    this._drawComicBox(ctx, noX, noY, noBtnW, noBtnH, '#e74c3c', '#c0392b');
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px "Comic Sans MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('NO', noX + noBtnW / 2, noY + noBtnH / 2);
  }

  _drawSettingsHomeButton(ctx) {
    if (!this.isSettingsOpen || this.game.currentState === CONSTANTS.STATES.MAIN_MENU) return;

    const btnX = (this.game.canvas.width - 200) / 2;
    const btnY = 450;
    const btnW = 200;
    const btnH = 50;

    this._drawComicBox(ctx, btnX, btnY, btnW, btnH, '#e74c3c', '#c0392b');
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px "Comic Sans MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BACK TO HOME', btnX + btnW / 2, btnY + btnH / 2);
  }

  _drawSunburst(ctx, color1, color2) {
    ctx.fillStyle = color1;
    ctx.fillRect(0, 0, this.game.canvas.width, this.game.canvas.height);
    ctx.save(); ctx.translate(this.game.canvas.width / 2, this.game.canvas.height / 2);
    ctx.fillStyle = color2;
    for (let i = 0; i < 16; i++) {
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.arc(0, 0, Math.max(this.game.canvas.width, this.game.canvas.height), (i * 2 * Math.PI) / 16, ((i + 0.5) * 2 * Math.PI) / 16);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawPrologue(ctx) {
    const grad = ctx.createRadialGradient(this.game.canvas.width/2, this.game.canvas.height/2, 100, this.game.canvas.width/2, this.game.canvas.height/2, 800);
    grad.addColorStop(0, '#f4f4f0');
    grad.addColorStop(1, '#d1d1ca');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.game.canvas.width, this.game.canvas.height);

    ctx.fillStyle = 'rgba(0,0,0,0.03)';
    for(let i=0; i<this.game.canvas.width; i+=20) {
      for(let j=0; j<this.game.canvas.height; j+=20) {
        ctx.beginPath(); ctx.arc(i, j, 2, 0, Math.PI*2); ctx.fill();
      }
    }

    const lines = CONSTANTS.PROLOGUE_LINES;
    const maxIndex = Math.min(this.prologueIndex, lines.length - 1);
    
    const vignette = ctx.createRadialGradient(this.game.canvas.width/2, this.game.canvas.height/2, 300, this.game.canvas.width/2, this.game.canvas.height/2, 1000);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, this.game.canvas.width, this.game.canvas.height);

    this._drawComicText(ctx, "THE STORY OF JO", this.game.canvas.width / 2, 70, 64, '#f1c40f');
    
    const panelW = 1000; 
    const panelH = 550;
    const x = this.game.canvas.width / 2 - panelW / 2;
    const y = this.game.canvas.height / 2 - panelH / 2 + 20;
    
    this._drawComicBox(ctx, x, y, panelW, panelH, '#fff');
    
    ctx.save();
    ctx.globalAlpha = this.prologueFade; 
    
    const storyImage = this.game.assetLoader.images[`story${maxIndex + 1}`];
    if (storyImage && storyImage.complete) {
      const imgAreaW = panelW - 40;
      const imgAreaH = panelH * 0.7 - 20;
      const imgX = x + 20;
      const imgY = y + 20;
      
      const scale = Math.min(imgAreaW / storyImage.width, imgAreaH / storyImage.height);
      const drawW = storyImage.width * scale; 
      const drawH = storyImage.height * scale;
      
      ctx.drawImage(storyImage, imgX + (imgAreaW - drawW) / 2, imgY + (imgAreaH - drawH) / 2, drawW, drawH);
    }
    ctx.restore();
    
    const textAreaY = y + panelH * 0.7 + 10;
    const textAreaH = panelH * 0.3 - 30;
    ctx.fillStyle = '#fffae6';
    ctx.fillRect(x + 20, textAreaY, panelW - 40, textAreaH);
    ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
    ctx.strokeRect(x + 20, textAreaY, panelW - 40, textAreaH);
    
    ctx.fillStyle = '#000';
    ctx.font = 'bold 24px "Comic Sans MS", sans-serif';
    ctx.textAlign = 'center';
    const displayedText = lines[maxIndex].toUpperCase().slice(0, this.prologueCharIndex);
    this._wrapText(ctx, displayedText, this.game.canvas.width / 2, textAreaY + textAreaH / 2, panelW - 100, 32);
    
    const pulse = Math.sin(this.game.gameFrame / 18) * 5;
    this._drawComicBox(ctx, this.game.canvas.width / 2 - 250 - pulse/2, this.game.canvas.height - 65 - pulse/2, 500 + pulse, 50 + pulse, '#e74c3c');
    ctx.fillStyle = '#fff'; ctx.font = 'bold 22px "Comic Sans MS", sans-serif';
    ctx.fillText('CLICK ANYWHERE TO CONTINUE', this.game.canvas.width / 2, this.game.canvas.height - 32);

    // === SKIP BUTTON ===
    const skipBtnW = 120;
    const skipBtnH = 45;
    const skipBtnX = this.game.canvas.width - skipBtnW - 20;
    const skipBtnY = 20;

    this._drawComicBox(ctx, skipBtnX, skipBtnY, skipBtnW, skipBtnH, '#3498db', '#2980b9');
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px "Comic Sans MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SKIP', skipBtnX + skipBtnW / 2, skipBtnY + skipBtnH / 2);

    // Store skip button bounds for click detection
    this._prologueSkipBtnBounds = { x: skipBtnX, y: skipBtnY, w: skipBtnW, h: skipBtnH };
  }

_drawPlayingHUD(ctx) {
    // --- 1. Player Stats Box (Top Left) ---
    this._drawComicBox(ctx, 10, 10, 220, 130, '#fff', '#000');
    ctx.fillStyle = '#000'; ctx.font = 'bold 18px "Comic Sans MS", sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    
    ctx.fillText(`JO HP: ${Math.floor(this.game.player.hp)}/${this.game.player.maxHp}`, 20, 20);
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(20, 40, 180 * (Math.max(0, this.game.player.hp) / this.game.player.maxHp), 10);
    ctx.strokeRect(20, 40, 180, 10);
    
    ctx.fillStyle = '#000';
    ctx.fillText(`KITA: ${CONSTANTS.CURRENCY_SYMBOL}${Math.floor(this.game.player.kita)}`, 20, 60);
    ctx.fillText(`WAVE: ${this.game.waveManager.currentWave}`, 20, 80);
    
    const kills = this.game.waveManager.killCount;
    const total = this.game.waveManager.waveEnemies.length;
    ctx.fillText(`KILLS: ${kills}/${total}`, 20, 100);

    // --- 2. Stage Name (Top Center) ---
    const levelData = this.game.levelManager.getLevelData();
    if (levelData) {
      ctx.textAlign = 'center';
      this._drawComicText(ctx, levelData.label.toUpperCase(), this.game.canvas.width / 2, 35, 28, '#f1c40f');
    }
    
    // --- 3. ARSENAL HUD (3x2 Grid: Weapons + Specials) ---
    const player = this.game.player;
    const weapons = ['mami', 'pares', 'rice'];
    const specialKeys = ['calamansi', 'chili', 'garlic'];
    const wSheet = this.game.assetLoader?.images?.projectilesSheet;
    const specSheet = this.game.assetLoader?.images?.specialsSheet;
    
    const boxSize = 70;
    const spacing = 5;
    const startX = 10;
    const startY = 150;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Draw Weapons (slots 1-3, first row)
    weapons.forEach((weaponKey, index) => {
      const weaponData = player.arsenal[weaponKey];
      const isSelected = player.selectedWeapon === weaponKey;
      const isLocked = !weaponData.unlocked;
      const cdPercent = player.getWeaponCooldownPercent(weaponKey);
      const hasAmmo = weaponData.isInfinite || weaponData.usesLeft > 0;

      const currentX = startX + (index * (boxSize + spacing));

      let bgColor = isSelected ? '#fffdf0' : '#ffffff';
      let borderColor = isSelected ? '#f1c40f' : '#000';
      if (isLocked) bgColor = '#dddddd';
      
      ctx.fillStyle = '#000'; ctx.fillRect(currentX + 4, startY + 4, boxSize, boxSize); 
      ctx.fillStyle = bgColor; ctx.fillRect(currentX, startY, boxSize, boxSize);
      ctx.strokeStyle = borderColor; ctx.lineWidth = isSelected ? 4 : 2; ctx.strokeRect(currentX, startY, boxSize, boxSize);

      ctx.fillStyle = '#000';
      ctx.font = 'bold 12px "Comic Sans MS", sans-serif';
      ctx.fillText(`[${index + 1}]`, currentX + 12, startY + 12);

      if (isLocked) {
        ctx.fillStyle = '#7f8c8d';
        ctx.font = 'bold 14px "Comic Sans MS", sans-serif';
        ctx.fillText("LOCKED", currentX + boxSize / 2, startY + boxSize / 2);
      } else {
        if (wSheet && wSheet.complete && wSheet.width > 0) {
          const typeMap = { 'mami': 0, 'pares': 1, 'rice': 2 }; 
          const row = typeMap[weaponKey] !== undefined ? typeMap[weaponKey] : 0;
          const col = Math.min(weaponData.level - 1, 4);

          const fw = wSheet.width / 5;
          const fh = wSheet.height / 3;

          const sx = col * fw;
          const sy = row * fh;
          
          if (cdPercent < 100 || !hasAmmo) ctx.globalAlpha = 0.4;
          const drawSize = 48; 
          ctx.drawImage(wSheet, sx, sy, fw, fh, currentX + (boxSize - drawSize)/2, startY + (boxSize - drawSize)/2 - 2, drawSize, drawSize);
          ctx.globalAlpha = 1.0;
        }

        const barHeight = 6;
        const barY = startY + boxSize - barHeight;
        ctx.fillStyle = cdPercent >= 100 ? '#2ecc71' : '#e74c3c';
        ctx.fillRect(currentX, barY, boxSize * (cdPercent / 100), barHeight);
        
        if (!weaponData.isInfinite) {
          ctx.fillStyle = hasAmmo ? '#000' : '#e74c3c';
          ctx.font = 'bold 12px "Comic Sans MS", sans-serif';
          ctx.fillText(`${weaponData.usesLeft}/${weaponData.maxUses}`, currentX + boxSize - 18, startY + 12); 
        }
      }
    });

    // Draw Specials (slots 4-6, second row below weapons)
    const sBoxSize = boxSize; 
    const sSpacing = spacing;
    const sStartX = startX;
    const sStartY = startY + boxSize + 10; // Position below weapons

    specialKeys.forEach((specKey, index) => {
      const specialData = player.specials[specKey];
      const isLocked = !specialData.unlocked;
      const cdPercent = player.getSpecialCooldownPercent(specKey);
      
      const currentX = sStartX + (index * (sBoxSize + sSpacing));

      let bgColor = '#ffffff';
      let borderColor = '#f1c40f'; // Gold border for specials
      if (isLocked) { bgColor = '#dddddd'; borderColor = '#000'; }
      
      ctx.fillStyle = '#000'; ctx.fillRect(currentX + 4, sStartY + 4, sBoxSize, sBoxSize); 
      ctx.fillStyle = bgColor; ctx.fillRect(currentX, sStartY, sBoxSize, sBoxSize);
      ctx.strokeStyle = borderColor; ctx.lineWidth = 2; ctx.strokeRect(currentX, sStartY, sBoxSize, sBoxSize);

      // Keybind Number [4], [5], [6]
      ctx.fillStyle = '#000';
      ctx.font = 'bold 12px "Comic Sans MS", sans-serif';
      ctx.fillText(`[${index + 4}]`, currentX + 12, sStartY + 12);

      if (isLocked) {
        ctx.fillStyle = '#7f8c8d';
        ctx.font = 'bold 14px "Comic Sans MS", sans-serif';
        ctx.fillText("LOCKED", currentX + sBoxSize / 2, sStartY + sBoxSize / 2);
      } else {
        // Draw the Special Sprite
        if (specSheet && specSheet.complete && specSheet.width > 0) {
          const typeMap = { 'calamansi': 0, 'chili': 1, 'garlic': 2 }; 
          const row = typeMap[specKey] !== undefined ? typeMap[specKey] : 0;
          const col = 4; // Always use the final frame (index 4)

          const fw = specSheet.width / 5;
          const fh = specSheet.height / 3;

          const sx = col * fw;
          const sy = row * fh;
          
          if (cdPercent < 100) ctx.globalAlpha = 0.4;
          const drawSize = 48; 
          ctx.drawImage(specSheet, sx, sy, fw, fh, currentX + (sBoxSize - drawSize)/2, sStartY + (sBoxSize - drawSize)/2 - 2, drawSize, drawSize);
          ctx.globalAlpha = 1.0;
        }

        // Draw Cooldown Bar at bottom of box
        const barHeight = 6;
        const barY = sStartY + sBoxSize - barHeight;
        ctx.fillStyle = cdPercent >= 100 ? '#f1c40f' : '#e74c3c';
        ctx.fillRect(currentX, barY, sBoxSize * (cdPercent / 100), barHeight);

        // Draw 'READY' text inside
        if (cdPercent >= 100) {
          const pulse = Math.abs(Math.sin(this.game.gameFrame / 10)) * 0.5 + 0.5;
          ctx.fillStyle = `rgba(241, 196, 15, ${pulse})`;
          ctx.font = 'bold 12px "Comic Sans MS", sans-serif';
          ctx.fillText("READY", currentX + sBoxSize - 22, sStartY + 12);
        }
      }
    });
  }

  _drawInGameTutorialOverlay(ctx) {
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, this.game.canvas.width, this.game.canvas.height); ctx.restore();
  }

  _drawComicText(ctx, text, x, y, fontSize, fillColor) {
    ctx.font = `900 italic ${fontSize}px "Comic Sans MS", sans-serif`;
    ctx.textAlign = 'center'; ctx.fillStyle = '#000';
    ctx.fillText(text, x + 4, y + 4); ctx.fillStyle = fillColor; ctx.fillText(text, x, y);
  }

  _drawComicBox(ctx, x, y, w, h, bgColor = '#fff', borderColor = '#000') {
    ctx.fillStyle = '#000'; ctx.fillRect(x + 6, y + 6, w, h);
    ctx.fillStyle = bgColor; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = borderColor; ctx.lineWidth = 4; ctx.strokeRect(x, y, w, h);
  }

  _wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    const lines = [];

    for (let n = 0; n < words.length; n++) {
      let word = words[n];
      let testLine = line + word + ' ';
      let metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && n > 0) {
        lines.push(line); line = word + ' ';
      } else {
        let wordMetrics = ctx.measureText(word);
        if (wordMetrics.width > maxWidth) {
          if (line.length > 0) { lines.push(line); line = ''; }
          let chars = word.split(''); let charLine = '';
          for (let c = 0; c < chars.length; c++) {
            let testCharLine = charLine + chars[c];
            if (ctx.measureText(testCharLine).width > maxWidth) { lines.push(charLine); charLine = chars[c]; } 
            else { charLine = testCharLine; }
          }
          line = charLine + ' ';
        } else { line = testLine; }
      }
    }
    lines.push(line);
    
    const startY = y - ((lines.length - 1) * lineHeight) / 2;
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i].trim(), x, startY + i * lineHeight);
    }
  }

  _togglePause() {
    if (this.game.currentState !== CONSTANTS.STATES.PLAYING) return;
    this.isPaused = !this.isPaused;
    const btn = document.getElementById('btn-pause-toggle');
    if (btn) btn.innerText = this.isPaused ? '▶️' : '⏸️';
  }

  _drawShop(ctx) { }
}
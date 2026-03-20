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
    this._setupHtmlButtons();
  }

  _setupHtmlButtons() {
    const actions = {
      'btn-new-game': () => { 
        this.game.saveManager.reset(); // Reset to fresh state
        this.game.waveManager.currentWave = 1; // RESET TO WAVE 1
        this.game.currentState = CONSTANTS.STATES.DIFFICULTY_SELECT; 
      },
      'btn-load-game': () => { this.game.loadSavedGame(); },
      'btn-quit': () => location.reload(),
      'btn-diff-easy': () => this._startNewGame('easy'),
      'btn-diff-medium': () => this._startNewGame('medium'),
      'btn-diff-hard': () => this._startNewGame('hard'),
      'btn-mami': () => this.game.player.selectWeapon('mami'),
      'btn-pares': () => this.game.player.selectWeapon('pares'),
      'btn-rice': () => this.game.player.selectWeapon('rice'),
      'btn-tut-next': () => this._advanceTutorial(),
      'btn-visit-shop': () => { this.game.currentState = CONSTANTS.STATES.SHOP; this.game.shopManager.open(); },
      'btn-shop-mami': () => { this.game.shopManager.handleSelection(1); this._updateShopUI(); },
      'btn-shop-pares': () => { this.game.shopManager.handleSelection(2); this._updateShopUI(); },
      'btn-shop-rice': () => { this.game.shopManager.handleSelection(3); this._updateShopUI(); },
      'btn-shop-calamansi': () => { this.game.shopManager.handleSelection(4); this._updateShopUI(); },
      'btn-shop-chili': () => { this.game.shopManager.handleSelection(5); this._updateShopUI(); },
      'btn-shop-done': () => this._finishShopping(),
      'btn-restart': () => location.reload(),
      
      // Pause Controls
      'btn-pause-toggle': () => { this._togglePause(); },
      'btn-resume': () => { this._togglePause(); },
      'btn-pause-home': () => { this.isPaused = false; this.game.currentState = CONSTANTS.STATES.MAIN_MENU; },

      // Settings Controls
      'btn-settings-open': () => { this.isSettingsOpen = true; },
      'btn-settings-close': () => { this.isSettingsOpen = false; },
      'btn-settings-x': () => { this.isSettingsOpen = false; },
      'btn-back-home': () => { 
        this.isSettingsOpen = false;
        this.game.currentState = CONSTANTS.STATES.MAIN_MENU;
      },
      'btn-save-game': () => { 
        this.game.saveManager.state.kita = this.game.player.kita;
        this.game.saveManager.state.currentLevel = this.game.waveManager.currentWave;
        this.game.saveManager.state.currentGameState = this.game.currentState;
        this.game.saveManager.state.hasSeenTutorial = this.game.saveManager.state.hasSeenTutorial;
        
        // Save weapon levels AND unlocks
        this.game.saveManager.state.weaponLevels = {};
        this.game.saveManager.state.weaponUnlocks = {};
        for(const [key, data] of Object.entries(this.game.player.arsenal)) {
          this.game.saveManager.state.weaponLevels[key] = data.level;
          this.game.saveManager.state.weaponUnlocks[key] = data.unlocked;
        }
        
        // Save specials
        this.game.saveManager.state.specialUnlocks = {};
        for(const [key, data] of Object.entries(this.game.player.specials)) {
          this.game.saveManager.state.specialUnlocks[key] = data.unlocked;
        }
        this.game.saveManager.save(); 
        alert("Game Saved!"); 
      },
      'btn-reset-save': () => { if(confirm("Reset all data? This cannot be undone.")) { this.game.saveManager.reset(); location.reload(); } }
    };

    for (const [id, action] of Object.entries(actions)) {
      const btn = document.getElementById(id);
      if (btn) btn.onclick = (e) => { e.preventDefault(); action(); };
    }

    const slider = document.getElementById('slider-volume');
    if (slider) {
      slider.oninput = (e) => {
        const vol = parseFloat(e.target.value);
        this._updateGlobalVolume(vol);
      };
    }

    this.game.canvas.addEventListener('click', () => {
      if (this.game.currentState === CONSTANTS.STATES.PROLOGUE) this._advancePrologue();
    });
  }

  _updateGlobalVolume(vol) {
    if (!this.game.assetLoader || !this.game.assetLoader.audio) return;
    Object.values(this.game.assetLoader.audio).forEach(audio => {
      if (audio instanceof Audio) audio.volume = vol;
    });
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

  _advanceTutorial() {
    this.tutorialIndex++;
    if (this.tutorialIndex >= CONSTANTS.TUTORIAL_STEPS.length) {
      this.showInGameTutorial = false;
      this.game.saveManager.state.hasSeenTutorial = true;
      this.game.saveManager.save();
    }
  }

  _finishShopping() {
    this.game.shopManager.close();
    this._startPlaying();
  }

  _startPlaying() {
    this.game.currentState = CONSTANTS.STATES.PLAYING;
    this.game.waveManager.startWave(this.game._getWaveEnemies());
    if (this.game.waveManager.currentWave === 1 && !this.game.saveManager.state.hasSeenTutorial) {
      this.showInGameTutorial = true;
      this.tutorialIndex = 0;
    }
  }

  update(delta) {
    const state = this.game.currentState;
    this._showScreen('screen-main-menu', state === CONSTANTS.STATES.MAIN_MENU && !this.isSettingsOpen);
    this._showScreen('screen-difficulty', state === CONSTANTS.STATES.DIFFICULTY_SELECT && !this.isSettingsOpen);
    this._showScreen('hud-panel', state === CONSTANTS.STATES.PLAYING && !this.isSettingsOpen);
    this._showScreen('screen-tutorial', this.showInGameTutorial && !this.isSettingsOpen);
    this._showScreen('screen-victory', state === CONSTANTS.STATES.VICTORY && !this.isSettingsOpen);
    this._showScreen('screen-shop', state === CONSTANTS.STATES.SHOP && !this.isSettingsOpen);
    this._showScreen('screen-gameover', state === CONSTANTS.STATES.GAMEOVER && !this.isSettingsOpen);
    this._showScreen('screen-settings', this.isSettingsOpen);
    this._showScreen('screen-pause', this.isPaused && !this.isSettingsOpen);

    // Update Load Game button state
    if (state === CONSTANTS.STATES.MAIN_MENU) {
      const loadBtn = document.getElementById('btn-load-game');
      if (loadBtn) {
        const hasSave = localStorage.getItem(this.game.saveManager._key);
        loadBtn.disabled = !hasSave;
        loadBtn.style.opacity = hasSave ? "1" : "0.5";
        loadBtn.style.cursor = hasSave ? "pointer" : "not-allowed";
      }
    }

    // Show/Hide Pause/Settings buttons based on state
    const settingsContainer = document.getElementById('settings-btn-container');
    if (settingsContainer) {
      // Show during PLAYING, SHOP, VICTORY, GAMEOVER
      const showContainer = (
        state === CONSTANTS.STATES.PLAYING || 
        state === CONSTANTS.STATES.SHOP ||
        state === CONSTANTS.STATES.VICTORY ||
        state === CONSTANTS.STATES.GAMEOVER
      );
      
      if (showContainer) settingsContainer.classList.remove('hidden');
      else settingsContainer.classList.add('hidden');

      // Within the container, only show PAUSE button during actual PLAYING state
      const pauseBtn = document.getElementById('btn-pause-toggle');
      if (pauseBtn) {
        if (state === CONSTANTS.STATES.PLAYING) pauseBtn.classList.remove('hidden');
        else pauseBtn.classList.add('hidden');
      }
    }

    if (state === CONSTANTS.STATES.PLAYING) this._updateHUDButtons();
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
      
      // --- TYPING EFFECT ---
      const fullText = CONSTANTS.PROLOGUE_LINES[this.prologueIndex] || "";
      if (this.prologueCharIndex < fullText.length) {
        this.prologueTypingTimer += delta;
        if (this.prologueTypingTimer > 30) {
          this.prologueCharIndex++;
          this.prologueTypingTimer = 0;
        }
      }

      // --- FADE EFFECT ---
      if (this.prologueFade < 1.0) {
        this.prologueFade += delta * 0.002; // Fade in over 500ms
        if (this.prologueFade > 1.0) this.prologueFade = 1.0;
      }

      // Auto-advance after 5s ONLY if typing is done
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

  _updateHUDButtons() {
    const player = this.game.player;
    ['mami', 'pares', 'rice'].forEach(w => {
      const btn = document.getElementById(`btn-${w}`);
      if (!btn) return;
      btn.className = 'game-btn';
      if (!player.arsenal[w].unlocked) btn.classList.add('locked');
      if (player.selectedWeapon === w) btn.classList.add('selected');
      const cd = player.getWeaponCooldownPercent(w);
      btn.style.opacity = cd < 100 ? "0.6" : "1.0";
    });
  }

  _updateShopUI() {
    const player = this.game.player;
    const shop = this.game.shopManager;
    const shopKitaEl = document.getElementById('shop-kita');
    if (shopKitaEl) shopKitaEl.innerText = `${CONSTANTS.CURRENCY_SYMBOL}${player.kita}`;

    // Update Weapons
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

    // Update Specials
    ['calamansi', 'chili'].forEach((s, index) => {
      const btn = document.getElementById(`btn-shop-${s}`);
      if (!btn) return;
      const special = player.specials[s];
      const cost = special.baseCost;
      const key = index === 0 ? '4' : '5';

      let content = `<span class="item-name">[${key}] ${s.toUpperCase()}</span>`;
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
    // 1. Comic-Style Background (Radial Gradient + Halftone pattern)
    const grad = ctx.createRadialGradient(this.game.canvas.width/2, this.game.canvas.height/2, 100, this.game.canvas.width/2, this.game.canvas.height/2, 800);
    grad.addColorStop(0, '#f4f4f0');
    grad.addColorStop(1, '#d1d1ca');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.game.canvas.width, this.game.canvas.height);

    // Subtle Halftone Pattern
    ctx.fillStyle = 'rgba(0,0,0,0.03)';
    for(let i=0; i<this.game.canvas.width; i+=20) {
      for(let j=0; j<this.game.canvas.height; j+=20) {
        ctx.beginPath(); ctx.arc(i, j, 2, 0, Math.PI*2); ctx.fill();
      }
    }

    const lines = CONSTANTS.PROLOGUE_LINES;
    const maxIndex = Math.min(this.prologueIndex, lines.length - 1);
    
    // 2. Cinematic Vignette
    const vignette = ctx.createRadialGradient(this.game.canvas.width/2, this.game.canvas.height/2, 300, this.game.canvas.width/2, this.game.canvas.height/2, 1000);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, this.game.canvas.width, this.game.canvas.height);

    // Draw Title
    this._drawComicText(ctx, "THE STORY OF JO", this.game.canvas.width / 2, 70, 64, '#f1c40f');
    
    // Larger Panel for better visibility (1000x550)
    const panelW = 1000; 
    const panelH = 550;
    const x = this.game.canvas.width / 2 - panelW / 2;
    const y = this.game.canvas.height / 2 - panelH / 2 + 20;
    
    this._drawComicBox(ctx, x, y, panelW, panelH, '#fff');
    
    ctx.save();
    ctx.globalAlpha = this.prologueFade; // SMOOTH FADE IN
    
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
    
    // Text background box
    const textAreaY = y + panelH * 0.7 + 10;
    const textAreaH = panelH * 0.3 - 30;
    ctx.fillStyle = '#fffae6';
    ctx.fillRect(x + 20, textAreaY, panelW - 40, textAreaH);
    ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
    ctx.strokeRect(x + 20, textAreaY, panelW - 40, textAreaH);
    
    // Story Text (TYPED OUT)
    ctx.fillStyle = '#000';
    ctx.font = 'bold 24px "Comic Sans MS", sans-serif';
    ctx.textAlign = 'center';
    const displayedText = lines[maxIndex].toUpperCase().slice(0, this.prologueCharIndex);
    this._wrapText(ctx, displayedText, this.game.canvas.width / 2, textAreaY + textAreaH / 2, panelW - 100, 32);
    
    // Interaction prompt (Pulsing)
    const pulse = Math.sin(this.game.gameFrame / 18) * 5;
    this._drawComicBox(ctx, this.game.canvas.width / 2 - 250 - pulse/2, this.game.canvas.height - 65 - pulse/2, 500 + pulse, 50 + pulse, '#e74c3c');
    ctx.fillStyle = '#fff'; ctx.font = 'bold 22px "Comic Sans MS", sans-serif';
    ctx.fillText('CLICK ANYWHERE TO CONTINUE', this.game.canvas.width / 2, this.game.canvas.height - 32);
  }

  _drawPlayingHUD(ctx) {
    this._drawComicBox(ctx, 10, 10, 220, 130, '#fff', '#000');
    ctx.fillStyle = '#000'; ctx.font = 'bold 18px "Comic Sans MS", sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    
    // Health Info
    ctx.fillText(`JO HP: ${Math.floor(this.game.player.hp)}/${this.game.player.maxHp}`, 20, 20);
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(20, 40, 180 * (Math.max(0, this.game.player.hp) / this.game.player.maxHp), 10);
    ctx.strokeRect(20, 40, 180, 10);
    
    // Stats Info
    ctx.fillStyle = '#000';
    ctx.fillText(`KITA: ${CONSTANTS.CURRENCY_SYMBOL}${Math.floor(this.game.player.kita)}`, 20, 60);
    ctx.fillText(`WAVE: ${this.game.waveManager.currentWave}`, 20, 80);
    
    // Kill Count Info
    const kills = this.game.waveManager.killCount;
    const total = this.game.waveManager.waveEnemies.length;
    ctx.fillText(`KILLS: ${kills}/${total}`, 20, 100);

    const levelData = this.game.levelManager.getLevelData();
    if (levelData) {
      ctx.textAlign = 'center';
      this._drawComicText(ctx, levelData.label.toUpperCase(), this.game.canvas.width / 2, 35, 28, '#f1c40f');
    }
    
    ctx.textAlign = 'left'; ctx.font = 'bold 14px "Comic Sans MS", sans-serif';
    const weapon = this.game.player.selectedWeapon.toUpperCase();
    const cd = this.game.player.getWeaponCooldownPercent(this.game.player.selectedWeapon);
    ctx.fillText(`${weapon}: ${cd >= 100 ? 'READY' : 'RELOADING...'}`, 240, 90);
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
        lines.push(line);
        line = word + ' ';
      } else {
        // If a single word is wider than maxWidth, split it character by character
        let wordMetrics = ctx.measureText(word);
        if (wordMetrics.width > maxWidth) {
          // Finish the current line first if there is any
          if (line.length > 0) {
            lines.push(line);
            line = '';
          }
          // Split the long word
          let chars = word.split('');
          let charLine = '';
          for (let c = 0; c < chars.length; c++) {
            let testCharLine = charLine + chars[c];
            if (ctx.measureText(testCharLine).width > maxWidth) {
              lines.push(charLine);
              charLine = chars[c];
            } else {
              charLine = testCharLine;
            }
          }
          line = charLine + ' ';
        } else {
          line = testLine;
        }
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

  _drawShop(ctx) { /* Handled by HTML overlay */ }
}

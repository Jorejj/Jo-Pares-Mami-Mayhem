// UIManager.js – Renders HUD on canvas and manages HTML UI screens.

class UIManager {
  constructor(game) {
    this.game = game;
    this.prologueIndex = 0;
    this.prologueTimer = 0;
    this.tutorialIndex = 0;
    this.showInGameTutorial = false;
    this.isSettingsOpen = false;
    this._setupHtmlButtons();
  }

  _setupHtmlButtons() {
    const actions = {
      'btn-new-game': () => { this.game.currentState = CONSTANTS.STATES.DIFFICULTY_SELECT; },
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
      'btn-shop-mami': () => { this.game.shopManager.handleWeaponSelection(1); this._updateShopUI(); },
      'btn-shop-pares': () => { this.game.shopManager.handleWeaponSelection(2); this._updateShopUI(); },
      'btn-shop-rice': () => { this.game.shopManager.handleWeaponSelection(3); this._updateShopUI(); },
      'btn-shop-done': () => this._finishShopping(),
      'btn-restart': () => location.reload(),
      
      // Settings Controls
      'btn-settings-open': () => { this.isSettingsOpen = true; },
      'btn-settings-close': () => { this.isSettingsOpen = false; },
      'btn-settings-x': () => { this.isSettingsOpen = false; },
      'btn-back-home': () => { 
        if(confirm("Return to Main Menu? Unsaved progress will be lost.")) {
          this.isSettingsOpen = false;
          this.game.currentState = CONSTANTS.STATES.MAIN_MENU;
        }
      },
      'btn-save-game': () => { 
        this.game.saveManager.state.kita = this.game.player.kita;
        this.game.saveManager.state.currentLevel = this.game.waveManager.currentWave;
        // Save weapon levels
        for(const [key, data] of Object.entries(this.game.player.arsenal)) {
          this.game.saveManager.state.weaponLevels[key] = data.level;
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
    this.game.waveManager.currentWave++;
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
      if (this.prologueTimer > 5000) { this._advancePrologue(); this.prologueTimer = 0; }
    }
  }

  _showScreen(id, visible) {
    const el = document.getElementById(id);
    if (el) el.style.display = visible ? 'flex' : 'none';
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
    if (shopKitaEl) shopKitaEl.innerText = `KITA: ${CONSTANTS.CURRENCY_SYMBOL}${player.kita}`;
    ['mami', 'pares', 'rice'].forEach(w => {
      const btn = document.getElementById(`btn-shop-${w}`);
      if (!btn) return;
      const weapon = player.arsenal[w];
      const upgradeCost = shop.getUpgradeCost(w);
      const isMax = weapon.level >= CONSTANTS.MAX_WEAPON_LEVEL;
      if (!weapon.unlocked) {
        btn.innerHTML = `${w.toUpperCase()} - UNLOCK: ${CONSTANTS.CURRENCY_SYMBOL}${weapon.baseCost}`;
        btn.disabled = player.kita < weapon.baseCost;
      } else if (isMax) {
        btn.innerHTML = `${w.toUpperCase()} - LVL: ${weapon.level} (MAX)`;
        btn.disabled = true;
      } else {
        btn.innerHTML = `${w.toUpperCase()} - LVL: ${weapon.level} -> ${weapon.level+1} | COST: ${CONSTANTS.CURRENCY_SYMBOL}${upgradeCost}`;
        btn.disabled = player.kita < upgradeCost;
      }
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
    ctx.fillStyle = '#f4f4f0';
    ctx.fillRect(0, 0, this.game.canvas.width, this.game.canvas.height);
    const lines = CONSTANTS.PROLOGUE_LINES;
    const maxIndex = Math.min(this.prologueIndex, lines.length - 1);
    this._drawComicText(ctx, "THE STORY OF JO", this.game.canvas.width / 2, 60, 54, '#f1c40f');
    const panelW = 800; const panelH = 400;
    const x = this.game.canvas.width/2 - panelW/2;
    const y = this.game.canvas.height/2 - panelH/2 - 20;
    this._drawComicBox(ctx, x, y, panelW, panelH, '#fff');
    const storyImage = this.game.assetLoader.images[`story${maxIndex + 1}`];
    if (storyImage && storyImage.complete) {
      ctx.save(); ctx.beginPath(); ctx.rect(x + 10, y + 10, panelW - 20, panelH * 0.75 - 10); ctx.clip();
      const scale = Math.max((panelW - 20) / storyImage.width, (panelH * 0.75 - 10) / storyImage.height);
      const drawW = storyImage.width * scale; const drawH = storyImage.height * scale;
      ctx.drawImage(storyImage, x + 10 + (panelW - 20 - drawW) / 2, y + 10 + (panelH * 0.75 - 10 - drawH) / 2, drawW, drawH);
      ctx.restore();
    }
    ctx.fillStyle = '#fffae6';
    ctx.fillRect(x + 10, y + panelH * 0.75 + 5, panelW - 20, panelH * 0.25 - 15);
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
    ctx.strokeRect(x + 10, y + panelH * 0.75 + 5, panelW - 20, panelH * 0.25 - 15);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 20px "Comic Sans MS", sans-serif';
    ctx.textAlign = 'center';
    this._wrapText(ctx, lines[maxIndex].toUpperCase(), this.game.canvas.width / 2, y + panelH * 0.87, panelW - 60, 28);
    this._drawComicBox(ctx, this.game.canvas.width / 2 - 200, this.game.canvas.height - 70, 400, 45, '#e74c3c');
    ctx.fillStyle = '#fff'; ctx.font = 'bold 20px "Comic Sans MS", sans-serif';
    ctx.fillText('CLICK ANYWHERE TO CONTINUE', this.game.canvas.width / 2, this.game.canvas.height - 40);
  }

  _drawPlayingHUD(ctx) {
    this._drawComicBox(ctx, 10, 10, 220, 120, '#fff', '#000');
    ctx.fillStyle = '#000'; ctx.font = 'bold 18px "Comic Sans MS", sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(`JO HP: ${Math.floor(this.game.player.hp)}/${this.game.player.maxHp}`, 20, 20);
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(20, 40, 180 * (Math.max(0, this.game.player.hp) / this.game.player.maxHp), 10);
    ctx.strokeRect(20, 40, 180, 10);
    ctx.fillStyle = '#000';
    ctx.fillText(`KITA: ${CONSTANTS.CURRENCY_SYMBOL}${this.game.player.kita}`, 20, 60);
    ctx.fillText(`WAVE: ${this.game.waveManager.currentWave}`, 20, 80);
    const requiredKills = (this.game.waveManager.currentWave === 1) ? CONSTANTS.WAVE_1_REQUIRED_KILLS : 10;
    ctx.fillText(`KILLS: ${this.game.waveManager.killCount}/${requiredKills}`, 20, 100);
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
    const words = text.split(' '); let line = ''; const lines = [];
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' '; const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) { lines.push(line); line = words[n] + ' '; } else { line = testLine; }
    }
    lines.push(line); const startY = y - ((lines.length - 1) * lineHeight) / 2;
    for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], x, startY + i * lineHeight);
  }

  _drawShop(ctx) { /* Handled by HTML overlay */ }
}

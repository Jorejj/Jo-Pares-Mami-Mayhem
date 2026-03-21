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
      // Added Garlic [6] to Shop interactions
      'btn-shop-mami': () => { this.game.shopManager.handleSelection(1); this._updateShopUI(); },
      'btn-shop-pares': () => { this.game.shopManager.handleSelection(2); this._updateShopUI(); },
      'btn-shop-rice': () => { this.game.shopManager.handleSelection(3); this._updateShopUI(); },
      'btn-shop-calamansi': () => { this.game.shopManager.handleSelection(4); this._updateShopUI(); },
      'btn-shop-chili': () => { this.game.shopManager.handleSelection(5); this._updateShopUI(); },
      'btn-shop-garlic': () => { this.game.shopManager.handleSelection(6); this._updateShopUI(); }, // NEW
      'btn-shop-done': () => this._finishShopping(),
      'btn-restart': () => location.reload(),
      
      'btn-pause-toggle': () => { this._togglePause(); },
      'btn-resume': () => { this._togglePause(); },
      'btn-pause-home': () => { this.isPaused = false; this.game.currentState = CONSTANTS.STATES.MAIN_MENU; },

      'btn-settings-open': () => { this.isSettingsOpen = true; },
      'btn-settings-close': () => { this.isSettingsOpen = false; },
      'btn-settings-x': () => { this.isSettingsOpen = false; },
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
      }
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
    
    // --- 3. Dynamic Weapon HUD ---
    const player = this.game.player;
    const weapons = ['mami', 'pares', 'rice'];
    const wSheet = this.game.assetLoader?.images?.projectilesSheet;
    
    const boxSize = 70;
    const spacing = 5;
    const startX = 10;
    const startY = 150;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

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

    // =========================================================
    // --- 4. UPDATED: SPECIALS HUD (MOVED BELOW WEAPONS) ---
    // =========================================================
    const specialKeys = ['calamansi', 'chili', 'garlic'];
    const specSheet = this.game.assetLoader?.images?.specialsSheet;
    
    // Position it directly under the Weapons HUD
    const sBoxSize = 70; 
    const sSpacing = 5;
    const sStartX = 10;
    const sStartY = 150 + boxSize + 10; // startY of weapons + boxSize + 10px margin

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
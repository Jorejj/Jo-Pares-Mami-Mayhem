// UIManager.js – Renders all UI elements based on current game state.
// Handles FSM state rendering: Main Menu, Difficulty Select, Prologue, Arsenal Select,Playing HUD, Victory, Shop, Game Over.

class UIManager {
  constructor(game) {
    this.game = game;
    this.prologueIndex = 0;
    this.prologueTimer = 0;
  }

  /**
   * Update UI state each frame.
   * - Advance prologue text on timer
   * @param {number} delta
   */
  update(delta) {
    if (this.game.currentState === CONSTANTS.STATES.PROLOGUE) {
      this.prologueTimer += delta;
      if (this.prologueTimer > 4000) {
        this.prologueIndex++;
        this.prologueTimer = 0;
      }
    }
  }

  /**
   * Main draw dispatcher based on current game state.
   */
  draw(ctx) {
    const state = this.game.currentState;
    switch (state) {
      case CONSTANTS.STATES.MAIN_MENU: this._drawMainMenu(ctx); break;
      case CONSTANTS.STATES.DIFFICULTY_SELECT: this._drawDifficultySelect(ctx); break;
      case CONSTANTS.STATES.PROLOGUE: this._drawPrologue(ctx); break;
      case CONSTANTS.STATES.ARSENAL_SELECT: this._drawArsenalSelect(ctx); break;
      case CONSTANTS.STATES.PLAYING: this._drawPlayingHUD(ctx); break;
      case CONSTANTS.STATES.VICTORY: this._drawVictory(ctx); break;
      case CONSTANTS.STATES.SHOP: this._drawShop(ctx); break;
      case CONSTANTS.STATES.GAMEOVER: this._drawGameOver(ctx); break;
    }
  }

  _drawSunburst(ctx, color1, color2) {
    ctx.fillStyle = color1;
    ctx.fillRect(0, 0, this.game.canvas.width, this.game.canvas.height);
    ctx.save();
    ctx.translate(this.game.canvas.width / 2, this.game.canvas.height / 2);
    ctx.fillStyle = color2;
    const rays = 16;
    for (let i = 0; i < rays; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, Math.max(this.game.canvas.width, this.game.canvas.height), (i * 2 * Math.PI) / rays, ((i + 0.5) * 2 * Math.PI) / rays);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawComicText(ctx, text, x, y, fontSize, fillColor, outlineColor = '#000') {
    ctx.font = `900 italic ${fontSize}px "Comic Sans MS", "Impact", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = outlineColor;
    ctx.fillText(text, x + 4, y + 4);
    ctx.lineWidth = 4;
    ctx.strokeStyle = outlineColor;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = fillColor;
    ctx.fillText(text, x, y);
  }

  _drawComicBox(ctx, x, y, w, h, bgColor = '#fff', borderColor = '#000') {
    ctx.fillStyle = '#000';
    ctx.fillRect(x + 6, y + 6, w, h);
    ctx.fillStyle = bgColor;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 4;
    ctx.strokeRect(x, y, w, h);
  }

  _drawMainMenu(ctx) {
    this._drawSunburst(ctx, '#ffcc00', '#ffb300');
    this._drawComicText(ctx, "JO'S PARES MAMI: MAYHEM", this.game.canvas.width / 2, 150, 64, '#e74c3c');
    const menuOptions = [
      { text: '[1] NEW GAME', y: 300 },
      { text: '[2] LOAD GAME', y: 380 },
      { text: '[3] QUIT', y: 460 }
    ];
    ctx.font = 'bold 32px "Comic Sans MS", "Impact", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    menuOptions.forEach(opt => {
      this._drawComicBox(ctx, this.game.canvas.width / 2 - 150, opt.y - 35, 300, 70, '#fff');
      ctx.fillStyle = '#000';
      ctx.fillText(opt.text, this.game.canvas.width / 2, opt.y);
    });
    this._drawComicBox(ctx, this.game.canvas.width / 2 - 250, this.game.canvas.height - 60, 500, 40, '#fff');
    ctx.fillStyle = '#000';
    ctx.font = 'bold 18px "Comic Sans MS", "Impact", sans-serif';
    ctx.fillText('USE KEYBOARD NUMPAD TO SELECT', this.game.canvas.width / 2, this.game.canvas.height - 40);
    ctx.textBaseline = 'alphabetic';
  }

  _drawDifficultySelect(ctx) {
    this._drawSunburst(ctx, '#3498db', '#2980b9');
    this._drawComicText(ctx, "SELECT DIFFICULTY", this.game.canvas.width / 2, 150, 64, '#f1c40f');
    const diffOptions = [
      { text: '[E] EASY', y: 300, color: '#2ecc71' },
      { text: '[M] MEDIUM', y: 380, color: '#f39c12' },
      { text: '[H] HARD', y: 460, color: '#e74c3c' }
    ];
    ctx.font = 'bold 32px "Comic Sans MS", "Impact", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    diffOptions.forEach(opt => {
      this._drawComicBox(ctx, this.game.canvas.width / 2 - 150, opt.y - 35, 300, 70, opt.color);
      ctx.fillStyle = '#000';
      ctx.fillText(opt.text, this.game.canvas.width / 2, opt.y);
    });
    const diffText = this.game.currentDifficulty ? `CURRENT: ${this.game.currentDifficulty.label}` : 'CURRENT: NONE';
    this._drawComicBox(ctx, this.game.canvas.width / 2 - 200, this.game.canvas.height - 60, 400, 40, '#fff');
    ctx.fillStyle = '#000';
    ctx.font = 'bold 20px "Comic Sans MS", "Impact", sans-serif';
    ctx.fillText(diffText, this.game.canvas.width / 2, this.game.canvas.height - 40);
    ctx.textBaseline = 'alphabetic';
  }

  /**
   * Draw prologue with dynamic images related to the story.
   */
  _drawPrologue(ctx) {
    ctx.fillStyle = '#f4f4f0';
    ctx.fillRect(0, 0, this.game.canvas.width, this.game.canvas.height);

    const lines = CONSTANTS.PROLOGUE_LINES;
    const maxIndex = Math.min(this.prologueIndex, lines.length);
    
    const cols = 4;
    const rows = 2;
    const panelWidth = 280;
    const panelHeight = 260;
    const gapX = (this.game.canvas.width - (cols * panelWidth)) / (cols + 1);
    const gapY = (this.game.canvas.height - 120 - (rows * panelHeight)) / (rows + 1);
    
    this._drawComicText(ctx, "THE STORY OF JO", this.game.canvas.width / 2, 45, 48, '#f1c40f');

    ctx.textBaseline = 'middle';

    for (let i = 0; i <= maxIndex; i++) {
      if (i >= lines.length) break;

      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = gapX + col * (panelWidth + gapX);
      const y = 70 + gapY + row * (panelHeight + gapY);
      
      this._drawComicBox(ctx, x, y, panelWidth, panelHeight, '#fff');
      
      // Determine which image to show based on story point
      let storyImage = null;
      let label = "NARRATOR:";
      
      if (i < 2) {
        storyImage = this.game.assetLoader.images.story_caloocan;
      } else if (i < 5) {
        storyImage = this.game.assetLoader.images.story_villains;
        label = "VILLAIN:";
      } else {
        storyImage = this.game.assetLoader.images.story_jo_sad;
        label = "JO:";
      }

      if (storyImage && storyImage.complete) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x + 5, y + 5, panelWidth - 10, panelHeight / 2 - 10);
        ctx.clip();
        
        // Fill logic for various aspect ratios
        const scale = Math.max(panelWidth / storyImage.width, (panelHeight / 2) / storyImage.height);
        const drawW = storyImage.width * scale;
        const drawH = storyImage.height * scale;
        ctx.drawImage(storyImage, x + (panelWidth - drawW) / 2, y + (panelHeight / 2 - drawH) / 2, drawW, drawH);
        
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 5, y + 5, panelWidth - 10, panelHeight / 2 - 10);
        ctx.restore();
      }
      
      // Dialogue/Caption bubble
      ctx.fillStyle = '#fffae6';
      const bubbleY = y + panelHeight / 2 + 10;
      const bubbleH = panelHeight / 2 - 20;
      ctx.fillRect(x + 10, bubbleY, panelWidth - 20, bubbleH);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 10, bubbleY, panelWidth - 20, bubbleH);
      
      // Text centered in the bubble
      ctx.fillStyle = '#000';
      ctx.font = 'bold 15px "Comic Sans MS", "Impact", sans-serif';
      ctx.textAlign = 'center';
      const text = lines[i].toUpperCase();
      // Centering Y: Start of bubble + half bubble height
      this._wrapText(ctx, text, x + panelWidth / 2, bubbleY + bubbleH / 2, panelWidth - 50, 20);
    }
    
    ctx.textBaseline = 'alphabetic';

    if (this.prologueIndex >= lines.length) {
      this._drawComicBox(ctx, this.game.canvas.width / 2 - 200, this.game.canvas.height - 60, 400, 45, '#e74c3c');
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 22px "Comic Sans MS", "Impact", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PRESS [SPACE] TO START!', this.game.canvas.width / 2, this.game.canvas.height - 30);
    } else {
      this._drawComicBox(ctx, this.game.canvas.width / 2 - 200, this.game.canvas.height - 60, 400, 45, '#bdc3c7');
      ctx.fillStyle = '#000';
      ctx.font = 'bold 18px "Comic Sans MS", "Impact", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('LOADING STORY... (PRESS SPACE TO SKIP)', this.game.canvas.width / 2, this.game.canvas.height - 32);
    }
  }

  _wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    const lines = [];
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        lines.push(line);
        line = words[n] + ' ';
      } else {
        line = testLine;
      }
    }
    lines.push(line);
    const startY = y - ((lines.length - 1) * lineHeight) / 2;
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], x, startY + i * lineHeight);
    }
  }

  _drawArsenalSelect(ctx) {
    this._drawSunburst(ctx, '#9b59b6', '#8e44ad');
    this._drawComicText(ctx, `WAVE ${this.game.waveManager.currentWave}: SELECT ARSENAL`, this.game.canvas.width / 2, 80, 54, '#f1c40f');
    ctx.textAlign = 'left';
    const weaponList = [{ key: 'mami', num: '1' }, { key: 'pares', num: '2' }, { key: 'rice', num: '3' }];
    let y = 200;
    for (const w of weaponList) {
      const weapon = this.game.player.arsenal[w.key];
      const isSelected = this.game.player.selectedWeapon === w.key;
      const status = weapon.unlocked ? 'UNLOCKED' : 'LOCKED';
      const weaponName = w.key.toUpperCase();
      const bgColor = isSelected ? '#2ecc71' : (weapon.unlocked ? '#fff' : '#95a5a6');
      this._drawComicBox(ctx, this.game.canvas.width / 2 - 300, y - 40, 600, 70, bgColor);
      ctx.fillStyle = '#000';
      ctx.font = 'bold 24px "Comic Sans MS", "Impact", sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(`[${w.num}] ${weaponName} (${status})`, this.game.canvas.width / 2 - 270, y - 5);
      ctx.textAlign = 'right';
      ctx.fillText(`LVL: ${weapon.level} | DMG: ${weapon.damage}`, this.game.canvas.width / 2 + 270, y - 5);
      ctx.textAlign = 'left';
      y += 100;
    }
    ctx.textBaseline = 'alphabetic';
    this._drawComicBox(ctx, this.game.canvas.width / 2 - 250, this.game.canvas.height - 80, 500, 50, '#e74c3c');
    ctx.font = 'bold 22px "Comic Sans MS", "Impact", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.fillText('PRESS [ENTER] TO START MAYHEM!', this.game.canvas.width / 2, this.game.canvas.height - 47);
  }

  _drawPlayingHUD(ctx) {
    this._drawComicBox(ctx, 10, 10, 220, 120, '#fff', '#000');
    ctx.fillStyle = '#000';
    ctx.font = 'bold 18px "Comic Sans MS", "Impact", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`JO HP: ${Math.floor(this.game.player.hp)}/${this.game.player.maxHp}`, 20, 20);
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(20, 40, 180 * (Math.max(0, this.game.player.hp) / this.game.player.maxHp), 10);
    ctx.strokeRect(20, 40, 180, 10);
    ctx.fillStyle = '#000';
    ctx.fillText(`KITA: ${CONSTANTS.CURRENCY_SYMBOL}${this.game.player.kita}`, 20, 60);
    ctx.fillText(`WAVE: ${this.game.waveManager.currentWave}`, 20, 80);
    ctx.fillText(`KILLS: ${this.game.waveManager.killCount}/${CONSTANTS.WAVE_1_REQUIRED_KILLS}`, 20, 100);
    const levelData = this.game.levelManager.getLevelData();
    const locText = levelData.label.toUpperCase();
    ctx.font = 'bold 28px "Comic Sans MS", "Impact", sans-serif';
    const textWidth = ctx.measureText(locText).width;
    this._drawComicBox(ctx, this.game.canvas.width / 2 - textWidth / 2 - 20, 10, textWidth + 40, 50, '#f1c40f', '#000');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000';
    ctx.fillText(locText, this.game.canvas.width / 2, 35);
    this._drawComicBox(ctx, this.game.canvas.width / 2 - 250, this.game.canvas.height - 60, 500, 50, '#34495e');
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px "Comic Sans MS", "Impact", sans-serif';
    ctx.textAlign = 'center';
    const weapon = this.game.player.arsenal[this.game.player.selectedWeapon];
    const cooldownPercent = this.game.player.getWeaponCooldownPercent(this.game.player.selectedWeapon);
    const weaponStatus = cooldownPercent >= 100 ? 'READY TO FIRE!' : `RELOADING: ${Math.ceil((100 - cooldownPercent))}%`;
    const weaponName = this.game.player.selectedWeapon.toUpperCase();
    ctx.fillText(`EQUIPPED: ${weaponName} | ${weaponStatus}`, this.game.canvas.width / 2, this.game.canvas.height - 35);
    this._drawWeaponTray(ctx);
    ctx.textBaseline = 'alphabetic';
  }

  _drawWeaponTray(ctx) {
    const weapons = ['mami', 'pares', 'rice'];
    const trayY = this.game.canvas.height - 160;
    const slotSize = 80;
    const gap = 20;
    const totalWidth = weapons.length * (slotSize + gap) - gap;
    const startX = (this.game.canvas.width - totalWidth) / 2;
    weapons.forEach((weapon, i) => {
      const x = startX + i * (slotSize + gap);
      const isSelected = this.game.player.selectedWeapon === weapon;
      const weaponData = this.game.player.arsenal[weapon];
      const bgColor = isSelected ? '#f1c40f' : '#ecf0f1';
      this._drawComicBox(ctx, x, trayY, slotSize, slotSize, bgColor);
      ctx.fillStyle = weaponData.unlocked ? '#000' : '#7f8c8d';
      ctx.font = '900 16px "Comic Sans MS", "Impact", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(weapon.toUpperCase(), x + slotSize / 2, trayY + 25);
      if (weaponData.unlocked) {
        ctx.font = 'bold 12px "Comic Sans MS", "Impact", sans-serif';
        ctx.fillText(`LVL ${weaponData.level}`, x + slotSize / 2, trayY + 45);
        ctx.fillText(`${weaponData.damage} DMG`, x + slotSize / 2, trayY + 65);
      } else {
        ctx.font = 'bold 14px "Comic Sans MS", "Impact", sans-serif';
        ctx.fillText('LOCKED', x + slotSize / 2, trayY + 50);
      }
    });
  }

  _drawVictory(ctx) {
    this._drawSunburst(ctx, '#2ecc71', '#27ae60');
    this._drawComicText(ctx, "WAVE CLEARED!", this.game.canvas.width / 2, 200, 80, '#f1c40f');
    ctx.font = 'bold 36px "Comic Sans MS", "Impact", sans-serif';
    ctx.textAlign = 'center';
    this._drawComicBox(ctx, this.game.canvas.width / 2 - 200, 300, 400, 80, '#fff');
    ctx.fillStyle = '#000';
    ctx.textBaseline = 'middle';
    ctx.fillText(`KITA EARNED: ${CONSTANTS.CURRENCY_SYMBOL}${this.game.player.kita}`, this.game.canvas.width / 2, 340);
    this._drawComicBox(ctx, this.game.canvas.width / 2 - 250, 450, 500, 60, '#e74c3c');
    ctx.fillStyle = '#fff';
    ctx.fillText('PRESS [ENTER] TO VISIT SHOP', this.game.canvas.width / 2, 480);
    ctx.textBaseline = 'alphabetic';
  }

  _drawShop(ctx) { this.game.shopManager.draw(ctx); }

  _drawGameOver(ctx) {
    this._drawSunburst(ctx, '#e74c3c', '#c0392b');
    this._drawComicText(ctx, "GAME OVER!", this.game.canvas.width / 2, 200, 100, '#000', '#fff');
    ctx.font = 'bold 36px "Comic Sans MS", "Impact", sans-serif';
    ctx.textAlign = 'center';
    this._drawComicBox(ctx, this.game.canvas.width / 2 - 200, 350, 400, 80, '#fff');
    ctx.fillStyle = '#000';
    ctx.textBaseline = 'middle';
    ctx.fillText(`FINAL KITA: ${CONSTANTS.CURRENCY_SYMBOL}${this.game.player.kita}`, this.game.canvas.width / 2, 390);
    this._drawComicBox(ctx, this.game.canvas.width / 2 - 150, 500, 300, 60, '#f1c40f');
    ctx.fillStyle = '#000';
    ctx.fillText('PRESS [R] TO RESTART', this.game.canvas.width / 2, 530);
    ctx.textBaseline = 'alphabetic';
  }
}

// Projectiles.js – Defines all food projectiles Jo can launch from his catapult.
// Projectile physics are handled by Physics.js; this class manages state, collision, and rendering.
// Special behaviors: Mami (standard), Pares (splits at 1500ms), Rice (splash radius on impact)

const PROJECTILE_CONFIG = {
  mami:  { baseDamage: 25, radius: 5,  color: '#FFD700' },
  pares: { baseDamage: 40, radius: 7,  color: '#FF6B35' },
  cola:  { baseDamage: 20, radius: 5,  color: '#8B4513' }, 
  rice:  { baseDamage: 15, radius: 4,  color: '#90EE90', splashRadius: 80 },
};

class Projectile {
  constructor(game, x, y, velX, velY, type, damage, level = 1) {
    this.game = game;
    this.type = type;
    this.level = level;

    const config = PROJECTILE_CONFIG[type] || PROJECTILE_CONFIG.mami;
    this.radius = config.radius;
    this.color = config.color;
    this.damage = damage;
    this.splashRadius = config.splashRadius || 0;

    this.x = x;
    this.y = y;

    // Velocity (pixels per frame)
    this.velX = velX;
    this.velY = velY;
    this.prevVelY = this.velY;

    this.isActive = true;
    this.hasHit = false;
    this.hasSplit = false; // Track Pares split
    
    // --- NEW: LIFETIME TIMER FOR PARES SPLIT ---
    this.lifetime = 0;

    // Dynamic visual sizing based on weapon type
    if (type === 'mami') { this.width = 45; this.height = 45; }
    else if (type === 'pares' || type === 'pares_split') { this.width = 50; this.height = 50; }
    else if (type === 'rice') { this.width = 55; this.height = 55; }
    else { this.width = 45; this.height = 45; }
    
    this.rotation = 0;
  }

  /**
   * Called when projectile hits something.
   * Special behavior per projectile type.
   * @param {Enemy} enemy - Enemy the projectile hit
   */
  onHit(enemy) {
    if (this.type === 'rice') {
      this._applySplashDamage(enemy);
      const audio = this.game.assetLoader?.audio?.sfx_rice_sizzle; 
      if (audio) { audio.currentTime = 0; const p = audio.play(); if (p && p.catch) p.catch(()=>{}); }
    } else {
      const audio = this.game.assetLoader?.audio?.sfx_mami_impact; 
      if (audio) { audio.currentTime = 0; const p = audio.play(); if (p && p.catch) p.catch(()=>{}); }
    }
    this.hasHit = true;
  }

  /**
   * Apply splash damage to all enemies in radius of impact.
   * Used by Rice projectile type.
   * @private
   */
  _applySplashDamage(impactEnemy) {
    const enemies = (this.game.waveManager && this.game.waveManager.enemies) || [];
    const currentRadius = this.splashRadius + (this.level * 10);
    
    enemies.forEach(enemy => {
      if (!enemy.isAlive) return;

      const dist = Physics.getDistance(
        this.x, this.y,
        enemy.x + enemy.width / 2, enemy.y + enemy.height / 2
      );

      if (dist <= currentRadius) {
        // Splash damage is 60% of normal
        const splashDamage = Math.ceil(this.damage * 0.6);
        enemy.takeDamage(splashDamage);
      }
    });
  }

  /**
   * Update projectile state each frame.
   * - Apply physics (gravity)
   * - Check bounds
   * - Special logic per type
   * @param {number} delta - Time delta in ms
   */
  update(delta) {
    if (!this.isActive) return;

    this.prevVelY = this.velY;
    this.x += this.velX;
    this.y += this.velY;

    // Apply gravity
    this.velY += CONSTANTS.GRAVITY;
    this.rotation += 0.1; // Spin the projectile
    
    // --- INCREASE LIFETIME TIMER ---
    this.lifetime += delta;

    // ===== SPECIAL BEHAVIOR: TIME-BASED PARES SPLIT =====
    // Now it waits exactly 300ms (0.3 seconds) to detonate mid-air!
    if (this.type === 'pares' && !this.hasSplit && this.lifetime >= 300) {
        this.hasSplit = true;
        this.isActive = false; // Destroy main bowl

        const audio = this.game.assetLoader?.audio?.sfx_pares_split; 
        if (audio) { audio.currentTime = 0; const p = audio.play(); if (p && p.catch) p.catch(()=>{}); }

        // Dynamic Scaling: Lvl 1 = 2 splits, Lvl 5 = 6 splits
        const numSplits = this.level + 1;
        
        for (let i = 0; i < numSplits; i++) {
            const spreadAngle = (i - (numSplits - 1) / 2) * 1.5; 
            const newVx = this.velX + spreadAngle; 
            const newVy = -3; // Pop upwards slightly
            
            const splitProj = new Projectile(
                this.game, this.x, this.y, newVx, newVy, 'pares_split', this.damage, this.level
            );
            
            this.game.player.projectiles.push(splitProj);
        }
        return; // Stop updating this dead projectile
    }

    // ===== SPECIAL BEHAVIOR: RICE AURA =====
    if (this.type === 'rice' && this.splashRadius > 0 && this.game.gameFrame % 5 === 0) {
      const enemies = (this.game.waveManager && this.game.waveManager.enemies) || [];
      const burnDamageScaling = [2, 4, 8, 12, 16];
      const tickDamage = burnDamageScaling[this.level - 1] || 2;
      const currentRadius = this.splashRadius + (this.level * 10);

      for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        if (!enemy.isAlive || enemy.state === 'dead') continue;

        const dist = Physics.getDistance(this.x, this.y, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);

        if (dist <= currentRadius) {
          if (!enemy.burnActive || enemy.burnDuration < 500) {
            enemy.applyBurnStatus(2000, tickDamage);
          }
        }
      }
    }

    // ===== BOUNDS CHECK & MISS SOUND =====
    const canvas = this.game.canvas;
    if (this.x > canvas.width + 50 || this.x < -50 || this.y > canvas.height + 50) {
      this.isActive = false;

      // --- NEW: MISS GROUND SOUND ---
      // Only play the miss sound if it didn't hit an enemy AND didn't split into smaller Pares bowls!
      if (!this.hasHit && !this.hasSplit) {
        const missAudio = this.game.assetLoader?.audio?.sfx_miss_ground;
        if (missAudio) { 
          missAudio.currentTime = 0; 
          missAudio.volume = (this.game.uiManager?.masterVolume || 1) * (this.game.uiManager?.sfxVolume || 1); 
          const p = missAudio.play(); 
          if (p && p.catch) p.catch(()=>{}); 
        }
      }
    }
  } // <-- This bracket ends the update(delta) function

  /**
   * Draw projectile on canvas using dynamic Sprite Sheet Math.
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    if (!this.isActive) return;

    const sheet = this.game.assetLoader?.images?.projectilesSheet;
    
    if (sheet && sheet.complete && sheet.width > 0) {
      const cols = 5;
      const rows = 3;
      
      const frameW = sheet.width / cols;
      const frameH = sheet.height / rows;

      // Map weapon type to row ('pares_split' uses 'pares' image)
      const typeToRowMap = {
        'mami': 0,  
        'pares': 1, 
        'pares_split': 1, 
        'rice': 2   
      };

      let row = typeToRowMap[this.type];
      if (row === undefined) row = 0; 

      // Map level to column (0 to 4)
      const col = Math.min(Math.max(0, this.level - 1), 4);

      const sx = col * frameW;
      const sy = row * frameH;

      // Make split pieces smaller than main bowl
      const drawW = this.type === 'pares_split' ? this.width * 0.6 : this.width;
      const drawH = this.type === 'pares_split' ? this.height * 0.6 : this.height;

      ctx.save();
      ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
      ctx.rotate(this.rotation); 
      
      ctx.drawImage(sheet, sx, sy, frameW, frameH, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

    } else {
      // Fallback Circle
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + (this.level * 2), 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // --- RESTORED RICE AURA GRAPHICS ---
    if (this.type === 'rice' && this.splashRadius > 0) {
      const currentRadius = this.splashRadius + (this.level * 10);
      
      // 1. Outer Glow
      const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, currentRadius);
      gradient.addColorStop(0, 'rgba(255, 100, 0, 0.3)');
      gradient.addColorStop(0.5, 'rgba(255, 200, 0, 0.1)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(this.x, this.y, currentRadius, 0, Math.PI * 2);
      ctx.fill();

      // 2. Dashed Border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(this.x, this.y, currentRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]); 

      // 3. Steam Particles
      if (this.game.gameFrame % 5 === 0) {
        for (let i = 0; i < 3; i++) {
          const offsetX = (Math.random() - 0.5) * (currentRadius * 0.8);
          const offsetY = (Math.random() - 0.5) * (currentRadius * 0.8);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.beginPath();
          ctx.arc(this.x + offsetX, this.y + offsetY - (this.game.gameFrame % 20), 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
}
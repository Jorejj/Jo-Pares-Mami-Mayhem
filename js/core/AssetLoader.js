// AssetLoader.js – Preloads all images and audio required by the game.
// Calls onProgress callback during loading and onComplete when finished.

class AssetLoader {
  constructor() {
    this.images = {};
    this.audio = {};
    this._total = 0;
    this._loaded = 0;
    this._onComplete = null;
    this._onProgress = null;
  }

  /**
   * Load all game assets
   * @param {Function} onComplete - Called when all assets are loaded
   * @param {Function} onProgress - Called with (loaded, total) as assets load
   */
  loadAll(onComplete, onProgress = null) {
    this._onComplete = onComplete;
    this._onProgress = onProgress;

    const imageSources = {
      // Backgrounds
      bg_monumento: 'assets/backgrounds/monumento.jpg',
      bg_bagong_barrio: 'assets/backgrounds/bagongBarrio.jpg',
      bg_c3: 'assets/backgrounds/c3.png',
      bg_sangandaan: 'assets/backgrounds/sangandaan.jpg',
      bg_intramuros: 'assets/backgrounds/INTRAMUROS.png',
      bg_guadalupe: 'assets/backgrounds/guadalupe.jpg',
      bg_legazpi: 'assets/backgrounds/legazpiVillage.jpg',
      bg_bagumbong: 'assets/backgrounds/bagumbong.png',
      bg_quiapo: 'assets/backgrounds/quiapo.png',
      bg_chinatown: 'assets/backgrounds/chinatown.png',
      bg_luneta: 'assets/backgrounds/luneta.png',
      bg_baywalk: 'assets/backgrounds/baywalk.png',
      bg_ayalaAvenue: 'assets/backgrounds/ayalaAvenue.png',
      bg_poblacion: 'assets/backgrounds/poblacion.png',
      bg_malacanang: 'assets/backgrounds/malacanang.jpg',

      // Sprites
      player: 'assets/animations/jo1.png', // <-- Updated to PNG with transparency
      jo_cart: 'assets/animations/jo/jo-cart.png',
      //player_hold: 'assets/animations/jo/Jo Catapult.png',
      jo_portrait: 'assets/sprites/cartniJO.jpg',
      catapult: 'assets/sprites/catapult.png',
      enemy_gangster: 'assets/animations/gangster.png',
      enemy_cockroach: 'assets/animations/ipis.png',
      enemy_dog: 'assets/animations/dog.png',
      enemy_jbhotdog: 'assets/animations/jbhotdog.png',
      enemy_bikejor: 'assets/animations/bikejor.png',
      enemy_kitboard: 'assets/animations/kitboard.png',
      enemy_rex: 'assets/animations/rex.png',
      enemy_rat: 'assets/animations/enemy/rat.png',
      enemy_student: 'assets/animations/jbhotdog.png',
      boss_vlogger: 'assets/animations/boss_vlogger.png',
      boss_kap: 'assets/animations/boss/boss1_kap.png',
      boss1_proj: 'assets/animations/boss/boss1_proj.png',
      newDaga1: 'assets/animations/newDaga1.png',
      ian: 'assets/animations/ian.png',
      chair: 'assets/animations/chair.png',
      table: 'assets/animations/table.png',
      sack: 'assets/animations/sack.png',
      sack2: 'assets/animations/sack2.png',
      enemy_fmteacher: 'assets/animations/fmteacher.png',
      enemy_blonde: 'assets/animations/blonde.png',
      enemy_asbula: 'assets/animations/asbula.png',
      enemy_willie: 'assets/animations/willie.png',
      enemy_fmbad: 'assets/animations/fmbad.png',
      enemy_angryfm: 'assets/animations/angryfm.png',
      boss_mastermind: 'assets/animations/malupiton.png',

      // Story/Prologue Assets
      story1: 'assets/story/story1.png',
      story2: 'assets/story/story2.png',
      story3: 'assets/story/story3.png',
      story4: 'assets/story/story4.png',
      story5: 'assets/story/story5.png',
      story6: 'assets/story/story6.png',
      story7: 'assets/story/story7.png',
      story8: 'assets/story/story8.png',
      story_caloocan: 'assets/animations/enemy/Gemini_Generated_Image_vjuv9gvjuv9gvjuv.png',
      story_villains: 'assets/animations/enemy/Gemini_Generated_Image_z5q5nez5q5nez5q5 (1).png',
      story_jo_sad: 'assets/sprites/cartniJO.jpg',

      // Projectiles
      projectilesSheet: 'assets/projectiles.png',
      specialsSheet: 'assets/specials.png',
      proj_mami: 'assets/sprites/proj_mami.png',
      proj_pares: 'assets/sprites/proj_pares.png',
      proj_cola: 'assets/sprites/proj_cola.png',
      proj_rice: 'assets/sprites/proj_rice.png',

      // UI
      ui_hud: 'assets/ui/hud.png',
      ui_shop: 'assets/ui/shop.png',
      ui_coin: 'assets/ui/coin.png',

      // Tutorial
      tutorial_arsenal: 'assets/ui/Tutorial/Arsenal.png',
      tutorial_hud: 'assets/ui/Tutorial/HUD.png',
      tutorial_catapult: 'assets/ui/Tutorial/Catapult.gif',
      tutorial_enemy: 'assets/ui/Tutorial/Enemy.gif',
    };

const audioSources = {
      // Ambiance / Background
      bgm_traffic: 'assets/audio/trafficnoises.mp3',
      bgm_street: 'assets/audio/streetnoise.mp3',
      bgm_crowd: 'assets/audio/talking crowd.mp3',
      bgm_vendors: 'assets/audio/streetvendors.mp3',
      bgm_makati: 'assets/audio/makati.mp3',
      bgm_people: 'assets/audio/peopletalking.mp3',

      // Jo & UI
      sfx_money: 'assets/audio/moneyget.mp3',
      sfx_stir: 'assets/audio/potstriing.mp3',
      sfx_miss_ground: 'assets/audio/Miss Ground Hit.wav',
      sfx_slingshot: 'assets/audio/Slingshot.wav',
      sfx_jo_damage: 'assets/audio/Taking damage.wav',
      // --- UI & PROGRESSION SFX ---
      sfx_burn_tick: 'assets/audio/UI/BurningTick.wav',
      sfx_cash_register: 'assets/audio/UI/CashRegister.wav',
      sfx_locked: 'assets/audio/UI/Locked.wav',
      sfx_pause_menu: 'assets/audio/UI/PauseMenu.wav',
      sfx_button_hover: 'assets/audio/UI/ButtonHover.wav',
      sfx_defeat: 'assets/audio/UI/Defeat.wav', 
      sfx_victory: 'assets/audio/UI/VictoryTriumph.wav',


      // --- ANIMAL DEATHS ---
      sfx_animal_cockroach: 'assets/audio/AnimalsDeath/Cockroach.wav',
      sfx_animal_dog: 'assets/audio/AnimalsDeath/Dog.wav',
      sfx_animal_rat: 'assets/audio/AnimalsDeath/Rats.wav',
      
      // --- FEMALE AUDIO ---
      sfx_deathsoundfm: 'assets/audio/deathsoundfm.mp3', // (or .wav if you converted them)
      sfx_deathsoundfm2: 'assets/audio/deathsoundfm2.mp3',
      sfx_deathsoundfm3: 'assets/audio/deathsoundfm3.mp3',
      sfx_fmattack: 'assets/audio/fmattack.mp3',
      sfx_fmattack1: 'assets/audio/fmattack1.mp3',

      // Male Death Sounds
      sfx_deathman1: 'assets/audio/deathman1.mp3',
      sfx_deathsound: 'assets/audio/deathsound.mp3',
      sfx_deathsound1: 'assets/audio/deathsound1.mp3',
      sfx_deathsoundmale: 'assets/audio/deathsoundmale.mp3',
      sfx_deathsoundmale2: 'assets/audio/deathsoundmale2.mp3',
      sfx_mandeath2: 'assets/audio/mandeath2.mp3',

      // Female Death Sounds
      sfx_deathsoundfm: 'assets/audio/deathsoundfm.mp3',
      sfx_deathsoundfm2: 'assets/audio/deathsoundfm2.mp3',
      sfx_deathsoundfm3: 'assets/audio/deathsoundfm3.mp3',

      // Attack Sounds
      sfx_attack_bite: 'assets/audio/Bite.wav', 
      sfx_attack_slash: 'assets/audio/attack-slash.mp3',
      sfx_attack_blunt: 'assets/audio/attack-blunt.mp3',
      sfx_attack_drill: 'assets/audio/dentist-drill.mp3',
      sfx_attack_shutup: 'assets/audio/shut-up_2.mp3',
      sfx_attack_punch: 'assets/audio/Punch.mp3', // Default punch for unlisted enemies

      // Movement & Voice Placeholders
      sfx_footstep: 'assets/audio/footsteps.mp3',
      sfx_animal_death: 'assets/audio/animal_death_placeholder.mp3', // PLACEHOLDER
      sfx_enemy_voice: 'assets/audio/voice_placeholder.mp3',         // PLACEHOLDER

        // Projectile Sounds
      sfx_pares_split: 'assets/audio/Impacts/Pares Split.wav',
      sfx_mami_impact: 'assets/audio/Impacts/Mami Impact.wav',
      sfx_rice_sizzle: 'assets/audio/Impacts/Rice Sizzle.wav',
    };

    const imageEntries = Object.entries(imageSources);
    const audioEntries = Object.entries(audioSources);
    this._total = imageEntries.length + audioEntries.length;

    if (this._total === 0) {
      this._onComplete();
      return;
    }

    // --- UPDATED IMAGE LOADING LOGIC ---
    imageEntries.forEach(([key, src]) => {
      const img = new Image();
      img.onload = () => this._onAssetLoaded();
      
      // Fallback: If image fails to load, create a pink square placeholder
      img.onerror = () => {
        console.warn(`[AssetLoader] Missing image: ${src}. Using pink fallback.`);
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 50; 
        tempCanvas.height = 50;
        const tCtx = tempCanvas.getContext('2d');
        
        // Draw magenta box
        tCtx.fillStyle = '#ff00ff';
        tCtx.fillRect(0, 0, 50, 50);
        
        // Add text label to box
        tCtx.fillStyle = 'white';
        tCtx.font = '10px Arial';
        tCtx.fillText(key.substring(0, 8), 5, 25); 

        const fallbackImg = new Image();
        fallbackImg.src = tempCanvas.toDataURL();
        
        this.images[key] = fallbackImg; // Replace the broken image
        this._onAssetLoaded();
      };
      
      img.src = src;
      this.images[key] = img;
    });

    // --- UPDATED AUDIO LOADING LOGIC ---
    audioEntries.forEach(([key, src]) => {
      const audio = new Audio();
      audio.addEventListener('canplaythrough', () => this._onAssetLoaded(), { once: true });
      
      // Fallback: If audio fails, replace with a dummy object so .play() doesn't crash the game
      audio.addEventListener('error', () => {
        console.warn(`[AssetLoader] Missing audio: ${src}. Skipping safely.`);
        this.audio[key] = { 
            play: () => {}, 
            pause: () => {}, 
            currentTime: 0 
        };
        this._onAssetLoaded();
      }, { once: true });

      audio.src = src;
      this.audio[key] = audio;
    });
  }

  _onAssetLoaded() {
    this._loaded++;
    
    // Call progress callback if provided
    if (this._onProgress) {
      this._onProgress(this._loaded, this._total);
    }
    
    if (this._loaded >= this._total && this._onComplete) {
      this._onComplete();
    }
  }

  /**
   * Get loading progress as percentage (0-100)
   */
  getProgress() {
    if (this._total === 0) return 100;
    return Math.round((this._loaded / this._total) * 100);
  }

  /**
   * Get loading status
   */
  getStatus() {
    return {
      loaded: this._loaded,
      total: this._total,
      percent: this.getProgress()
    };
  }
}
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
      boss_ian: 'assets/animations/boss/boss2_ian.png',
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
      boss_mastermind: 'assets/animations/boss/boss3_malu.png',
      boss3_proj: 'assets/animations/boss/boss3_proj.png',
      boss3_aura: 'assets/animations/boss/boss3_aura.png',
      jo_reload: 'assets/animations/jo-reload.png',
      jo_reload2: 'assets/animations/jo-reload (2).png',

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

      // New Story Sets
      story_prologue_1: 'assets/story/Prologue/Prologue 1.png',
      story_prologue_2: 'assets/story/Prologue/Prologue 2.png',
      story_prologue_3: 'assets/story/Prologue/Prologue 3.png',
      story_prologue_4: 'assets/story/Prologue/Prologue 4.png',
      story_prologue_5: 'assets/story/Prologue/Prologue 5.png',
      story_prologue_6: 'assets/story/Prologue/Prologue 6.png',

      story_manila_1: 'assets/story/Manila/Manila 1.png',
      story_manila_2: 'assets/story/Manila/Manila 2.png',
      story_manila_3: 'assets/story/Manila/Manila 3.png',

      story_makati_1: 'assets/story/Makati/Makati 1.png',
      story_makati_2: 'assets/story/Makati/Makati 2.png',
      story_makati_3: 'assets/story/Makati/Makati 3.png',

      story_boss1_open_1: 'assets/story/Boss 1 Open/BossKap1.png',
      story_boss1_open_2: 'assets/story/Boss 1 Open/BossKap2.png',
      story_boss1_open_3: 'assets/story/Boss 1 Open/BossKap3.png',

      story_boss2_open_1: 'assets/story/Boss 2 Open/BossIan1.png',
      story_boss2_open_2: 'assets/story/Boss 2 Open/BossIan2.png',
      story_boss2_open_3: 'assets/story/Boss 2 Open/BossIan3.png',

      story_boss3_open_1: 'assets/story/Boss 3 Open/BossMalu1.png',
      story_boss3_open_2: 'assets/story/Boss 3 Open/BossMalu2.png',
      story_boss3_open_3: 'assets/story/Boss 3 Open/BossMalu3.png',

      story_ending_1: 'assets/story/Ending/Ending 1.png',
      story_ending_2: 'assets/story/Ending/Ending.png',
      story_ending_3: 'assets/story/Ending/Ending 3.png',
      story_ending_4: 'assets/story/Ending/Ending 4.png',
      story_ending_5: 'assets/story/Ending/Ending 5.png',
      story_ending_6: 'assets/story/Ending/Ending 6.png',

      story_thanks: 'assets/story/Ending/Thanks.png',

      //gifs
      story_boss1_open: 'assets/story/boss1.gif',
      story_manila: 'assets/story/manila.gif',

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
            // Inside your imageSources:
      effect_fire: 'assets/animations/fire.png', // <-- ADD THIS LINE!
      effect_slow: 'assets/animations/slow.png',

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

      bgm_main_menu: 'assets/audio/UI/MainMusic.mp3',

      // Jo & UI
      sfx_money: 'assets/audio/moneyget.mp3',
      sfx_stir: 'assets/audio/potstriing.mp3',
      sfx_miss_ground: 'assets/audio/Impacts/Miss Ground Hit.wav',
      sfx_slingshot: 'assets/audio/Impacts/Slingshot.wav',
      sfx_jo_damage: 'assets/audio/Impacts/Taking damage.wav',
      // --- UI & PROGRESSION SFX ---
      sfx_burn_tick: 'assets/audio/UI/BurningTick.wav',
      sfx_cash_register: 'assets/audio/UI/CashRegister.wav',
      sfx_locked: 'assets/audio/UI/Locked.wav',
      sfx_warning: 'assets/audio/warning_beep.mp3',
      sfx_pause_menu: 'assets/audio/UI/PauseMenu.wav',
      sfx_button_hover: 'assets/audio/UI/ButtonHover.wav',
      sfx_defeat: 'assets/audio/UI/Defeat.wav', 
      sfx_victory: 'assets/audio/UI/VictoryTriumph.wav',
      bgm_win_game: 'assets/audio/win_game1.mp3',
      sfx_stun: 'assets/audio/UI/PauseMenu.wav',
      sfx_summon: 'assets/audio/UI/ButtonHover.wav',

      // --- BOSS: KAP ---
      sfx_kap_attack: 'assets/audio/KAP/kap_attack.mp3',
      sfx_kap_attack1: 'assets/audio/KAP/kap_attack1.mp3',
      sfx_kap_attack2: 'assets/audio/KAP/kap_attack2.mp3',
      bgm_kap_background: 'assets/audio/KAP/kap_background.mp3',
      sfx_kap_block: 'assets/audio/KAP/kap_block.mp3',
      sfx_kap_break_pen: 'assets/audio/KAP/kap_break_pen.mp3',
      sfx_kap_defeat: 'assets/audio/KAP/kap_defeat.mp3',
      sfx_kap_intro: 'assets/audio/KAP/kap_intro.mp3',
      sfx_kap_pain: 'assets/audio/KAP/kap_pain.mp3',
      sfx_kap_walk: 'assets/audio/KAP/kap_walk.mp3',
      sfx_kap_write: 'assets/audio/KAP/kap_write.mp3',

      // --- BOSS: IAN ---
      sfx_ian_attack: 'assets/audio/IAN/ian_attack.mp3',
      bgm_ian_background: 'assets/audio/IAN/ian_background.mp3',
      sfx_ian_defeat: 'assets/audio/IAN/ian_defeat.mp3',
      sfx_ian_pain: 'assets/audio/IAN/ian_pain.mp3',
      sfx_ian_walk: 'assets/audio/IAN/ian_walk.mp3',
      sfx_ian_win: 'assets/audio/IAN/ian_win.mp3',

      // --- BOSS: MALUPITON ---
      sfx_malupiton_attack: 'assets/audio/MALUPITON/malupiton_attack.mp3',
      sfx_malupiton_attack2: 'assets/audio/MALUPITON/malupiton_attack2.mp3',
      sfx_malupiton_attack_w_scream: 'assets/audio/MALUPITON/malupiton_attack_w_scream.mp3',
      bgm_malupiton_background: 'assets/audio/MALUPITON/malupiton_background.mp3',
      sfx_malupiton_defeat: 'assets/audio/MALUPITON/malupiton_defeat.mp3',
      sfx_malupiton_defeat1: 'assets/audio/MALUPITON/malupiton_defeat1.mp3',
      sfx_malupiton_intro: 'assets/audio/MALUPITON/malupiton_intro.mp3',
      sfx_malupiton_pain: 'assets/audio/MALUPITON/malupiton_pain.mp3',
      sfx_malupiton_scream: 'assets/audio/MALUPITON/malupiton_scream.mp3',
      sfx_malupiton_walk: 'assets/audio/MALUPITON/malupiton_walk.mp3',
      sfx_malupiton_win: 'assets/audio/MALUPITON/malupiton_win.mp3',
      sfx_malupiton_win_voiceline: 'assets/audio/MALUPITON/malupiton_win_voiceline.mp3',


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
      sfx_attack_bite: 'assets/audio/Melee/Bite.wav', 
      sfx_attack_slash: 'assets/audio/Melee/Slash.wav',
      sfx_attack_blunt: 'assets/audio/Melee/Blunt.wav',
      sfx_attack_drill: 'assets/audio/Melee/Drill.wav',
      sfx_attack_shutup: 'assets/audio/Melee/ShutUp.wav',
      sfx_attack_punch: 'assets/audio/Melee/punch.mp3', // Default punch for unlisted enemies

      // Movement & Voice Placeholders
      sfx_footstep: 'assets/audio/footsteps.mp3',
      sfx_animal_death: 'assets/audio/animal_death_placeholder.mp3', // PLACEHOLDER
      sfx_enemy_voice: 'assets/audio/voice_placeholder.mp3',         // PLACEHOLDER

        // Projectile Sounds
      sfx_pares_split: 'assets/audio/Impacts/Pares Split.wav',
      sfx_mami_impact: 'assets/audio/Impacts/Mami Impact.wav',
      sfx_rice_sizzle: 'assets/audio/Impacts/Rice Sizzle.wav',
      sfx_sticky: 'assets/audio/ui/stickysound.wav',
      sfx_click: 'assets/audio/click_buttons.mp3',

      // --- VOICE PROLOGUES ---
      v_prologue_1: 'assets/audio/voice_prologue/v_prologue_1.mp3',
      v_prologue_2: 'assets/audio/voice_prologue/v_prologue_2.mp3',
      v_prologue_3: 'assets/audio/voice_prologue/v_prologue_3.mp3',
      v_prologue_4: 'assets/audio/voice_prologue/v_prologue_4.mp3',
      v_prologue_5: 'assets/audio/voice_prologue/v_prologue_5.mp3',
      v_prologue_6: 'assets/audio/voice_prologue/v_prologue_6.mp3',

      v_boss1_before_1: 'assets/audio/voice_prologue/v_boss1_before_1.mp3',
      v_boss1_before_2: 'assets/audio/voice_prologue/v_boss1_before_2.mp3',
      v_boss1_before_3: 'assets/audio/voice_prologue/v_boss1_before_3.mp3',
      v_boss1_after_1: 'assets/audio/voice_prologue/v_boss1_after_1.mp3',
      v_boss1_after_2: 'assets/audio/voice_prologue/v_boss1_after_2.mp3',
      v_boss1_after_3: 'assets/audio/voice_prologue/v_boss1_after_3.mp3',

      v_boss2_before_1: 'assets/audio/voice_prologue/v_boss2_before_1.mp3',
      v_boss2_before_2: 'assets/audio/voice_prologue/v_boss2_before_2.mp3',
      v_boss2_before_3: 'assets/audio/voice_prologue/v_boss2_before_3.mp3',
      v_boss2_after_1: 'assets/audio/voice_prologue/v_boss2_after_1.mp3',
      v_boss2_after_2: 'assets/audio/voice_prologue/v_boss2_after_2.mp3',
      v_boss2_after_3: 'assets/audio/voice_prologue/v_boss2_after_3.mp3',

      v_boss3_before_1: 'assets/audio/voice_prologue/v_boss3_before_1.mp3',
      v_boss3_before_2: 'assets/audio/voice_prologue/v_boss3_before_2.mp3',
      v_boss3_before_3: 'assets/audio/voice_prologue/v_boss3_before_3.mp3',
      
      v_ending_1: 'assets/audio/voice_prologue/v_ending_1.mp3',
      v_ending_2: 'assets/audio/voice_prologue/v_ending_2.mp3',
      v_ending_3: 'assets/audio/voice_prologue/v_ending_3.mp3',
      v_ending_4: 'assets/audio/voice_prologue/v_ending_4.mp3',
      v_ending_5: 'assets/audio/voice_prologue/v_ending_5.mp3',
      v_ending_6: 'assets/audio/voice_prologue/v_ending_6.mp3',
      v_ending_7: 'assets/audio/voice_prologue/v_ending_7.mp3',
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

    // --- UPDATED AUDIO LOADING LOGIC (Supports .mp3 / .wav Auto-Fallback) ---
    audioEntries.forEach(([key, src]) => {
      const audio = new Audio();
      
      const onCanPlay = () => this._onAssetLoaded();
      
      const onError = () => {
        // If the primary source fails, try the alternative extension (.mp3 <-> .wav)
        let altSrc = null;
        if (src.endsWith('.mp3')) altSrc = src.replace('.mp3', '.wav');
        else if (src.endsWith('.wav')) altSrc = src.replace('.wav', '.mp3');

        if (altSrc) {
            console.log(`[AssetLoader] Retrying ${key} with alternative format: ${altSrc}`);
            const altAudio = new Audio();
            
            altAudio.addEventListener('canplaythrough', () => {
                this.audio[key] = altAudio; // Replace the original entry with the working one
                this._onAssetLoaded();
            }, { once: true });
            
            altAudio.addEventListener('error', () => {
                // Both formats failed: Use a dummy object to prevent crashes
                console.warn(`[AssetLoader] Missing audio: ${key} (Tried .mp3 and .wav). Skipping safely.`);
                this.audio[key] = { play: () => {}, pause: () => {}, currentTime: 0 };
                this._onAssetLoaded();
            }, { once: true });
            
            altAudio.src = altSrc;
        } else {
            // No alternative extension to try
            console.warn(`[AssetLoader] Missing audio: ${src}. Skipping safely.`);
            this.audio[key] = { play: () => {}, pause: () => {}, currentTime: 0 };
            this._onAssetLoaded();
        }
      };

      audio.addEventListener('canplaythrough', onCanPlay, { once: true });
      audio.addEventListener('error', onError, { once: true });

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

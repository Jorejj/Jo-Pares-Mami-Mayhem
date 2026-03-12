// AssetLoader.js – Preloads all images and audio required by the game.
// Calls the provided callback once every asset has finished loading.

class AssetLoader {
  constructor() {
    this.images = {};
    this.audio = {};
    this._total = 0;
    this._loaded = 0;
    this._onComplete = null;
  }

  loadAll(onComplete) {
    this._onComplete = onComplete;

    const imageSources = {
      // Backgrounds
      bg_caloocan: 'assets/backgrounds/caloocan.png',
      bg_intramuros: 'assets/backgrounds/intramuros.png',
      bg_quiapo: 'assets/backgrounds/quiapo.png',
      bg_binondo: 'assets/backgrounds/binondo.png',
      bg_makati: 'assets/backgrounds/makati.png',

      // Sprites
      player: 'assets/sprites/jo.png',
      catapult: 'assets/sprites/catapult.png',
      enemy_gangster: 'assets/sprites/enemy_gangster.png',
      enemy_cockroach: 'assets/sprites/enemy_cockroach.png',
      enemy_rat: 'assets/sprites/enemy_rat.png',
      enemy_dog: 'assets/sprites/enemy_dog.png',
      boss_inspector: 'assets/sprites/boss_inspector.png',
      boss_vlogger: 'assets/sprites/boss_vlogger.png',

      // Projectiles
      proj_mami: 'assets/sprites/proj_mami.png',
      proj_pares: 'assets/sprites/proj_pares.png',
      proj_cola: 'assets/sprites/proj_cola.png',
      proj_rice: 'assets/sprites/proj_rice.png',

      // UI
      ui_hud: 'assets/ui/hud.png',
      ui_shop: 'assets/ui/shop.png',
      ui_coin: 'assets/ui/coin.png',
    };

    const audioSources = {
      bgm_act1: 'assets/audio/bgm_act1.mp3',
      bgm_act2: 'assets/audio/bgm_act2.mp3',
      bgm_act3: 'assets/audio/bgm_act3.mp3',
      sfx_launch: 'assets/audio/sfx_launch.mp3',
      sfx_hit: 'assets/audio/sfx_hit.mp3',
      sfx_coin: 'assets/audio/sfx_coin.mp3',
    };

    const imageEntries = Object.entries(imageSources);
    const audioEntries = Object.entries(audioSources);
    this._total = imageEntries.length + audioEntries.length;

    if (this._total === 0) {
      this._onComplete();
      return;
    }

    imageEntries.forEach(([key, src]) => {
      const img = new Image();
      img.onload = () => this._onAssetLoaded();
      img.onerror = () => this._onAssetLoaded(); // skip missing files gracefully
      img.src = src;
      this.images[key] = img;
    });

    audioEntries.forEach(([key, src]) => {
      const audio = new Audio();
      audio.addEventListener('canplaythrough', () => this._onAssetLoaded(), { once: true });
      audio.addEventListener('error', () => this._onAssetLoaded(), { once: true });
      audio.src = src;
      this.audio[key] = audio;
    });
  }

  _onAssetLoaded() {
    this._loaded++;
    if (this._loaded >= this._total && this._onComplete) {
      this._onComplete();
    }
  }
}

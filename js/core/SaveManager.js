// SaveManager.js – Handles persisting and restoring game state via localStorage.
// Stores player progress: current level, earned Kita, and weapon upgrade levels.

class SaveManager {
  constructor() {
    this._key = 'joParesMamiSave';
    this.state = this._defaultState();
  }

  _defaultState() {
    return {
      currentLevel: 1,
      kita: 0,
      hasSeenTutorial: false,
      hasSeenPrologue: false,
      difficultyKey: 'medium',
      currentGameState: 'MAIN_MENU',
      weaponLevels: {
        mami: 1,
        pares: 1,
        cola: 1,
        rice: 1,
      },
      weaponUnlocks: {
        mami: true,
        pares: false,
        rice: false,
      },
      weaponAmmo: { // Track Ammo usage!
        pares: 5,
        rice: 3
      },
      specialUnlocks: {
        calamansi: false,
        chili: false,
        garlic: false
      },
      audioSettings: {
        master: 0.5,
        bgm: 0.5,
        sfx: 0.5
      }
    };
  }

  load() {
    try {
      const raw = localStorage.getItem(this._key);
      if (raw) {
        this.state = Object.assign(this._defaultState(), JSON.parse(raw));
        console.log("[SaveManager] Game Loaded Successfully:", this.state);
      }
    } catch (e) {
      console.warn('SaveManager: failed to load save data.', e);
      this.state = this._defaultState();
    }
  }

  save() {
    try {
      localStorage.setItem(this._key, JSON.stringify(this.state));
    } catch (e) {
      console.warn('SaveManager: failed to write save data.', e);
    }
  }

  reset() {
    this.state = this._defaultState();
    localStorage.removeItem(this._key);
  }
}

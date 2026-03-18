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
      weaponLevels: {
        mami: 1,
        pares: 1,
        cola: 1,
        rice: 1,
      },
    };
  }

  load() {
    try {
      const raw = localStorage.getItem(this._key);
      if (raw) {
        this.state = Object.assign(this._defaultState(), JSON.parse(raw));
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

// StageManager.js – Data-driven level configuration and story control.
// Manages all 15 levels with their wave configs, backgrounds, BGM, and story dialogues.

class StageManager {
  constructor(game) {
    this.game = game;
    
    // Current story state for cutscenes
    this.currentDialogueIndex = 0;
    this.currentDialogueArray = [];
    this.isPlayingStoryBefore = true; // true = before level, false = after level
    
    // Master configuration for all 15 levels
    this.levelConfigs = this._initLevelConfigs();
  }

  _initLevelConfigs() {
    return [
      // ========== ACT 1: CALOOCAN ==========
      {
        levelNumber: 1,
        actNumber: 1,
        locationLabel: 'Monumento Rumble',
        bgKey: 'bg_monumento',
        bgmKey: 'bgm_traffic',
        waveConfig: {
          enemyPool: ['cockroach', 'gangster'],
          baseCount: 5,
          scaling: 0
        },
        storyBefore: null,
        storyAfter: null
      },
      {
        levelNumber: 2,
        actNumber: 1,
        locationLabel: 'Bagong Barrio Brawl',
        bgKey: 'bg_bagong_barrio',
        bgmKey: 'bgm_street',
        waveConfig: {
          enemyPool: ['cockroach', 'gangster', 'dog'],
          baseCount: 6,
          scaling: 1
        },
        storyBefore: null,
        storyAfter: null
      },
      {
        levelNumber: 3,
        actNumber: 1,
        locationLabel: 'C3 Chaos',
        bgKey: 'bg_c3',
        bgmKey: 'bgm_traffic',
        waveConfig: {
          enemyPool: ['cockroach', 'gangster', 'dog', 'newDaga1'],
          baseCount: 7,
          scaling: 1
        },
        storyBefore: null,
        storyAfter: null
      },
      {
        levelNumber: 4,
        actNumber: 1,
        locationLabel: 'Sangandaan Slap',
        bgKey: 'bg_sangandaan',
        bgmKey: 'bgm_vendors',
        waveConfig: {
          enemyPool: ['cockroach', 'gangster', 'dog', 'newDaga1'],
          baseCount: 8,
          scaling: 2
        },
        storyBefore: null,
        storyAfter: null
      },
      {
        levelNumber: 5,
        actNumber: 1,
        locationLabel: 'Boss: Inspector Kap Nino',
        bgKey: 'bg_bagumbong',
        bgmKey: 'bgm_crowd',
        waveConfig: {
          enemyPool: ['cockroach', 'gangster', 'dog', 'newDaga1'],
          baseCount: 15,
          scaling: 0,
          boss: 'boss_kap'
        },
        storyBefore: [
          { speaker: 'Kap Nino', text: 'So ikaw pala yung batang pasaway sa distrito ko.', imageKey: 'story_boss1_open_1' },
          { speaker: 'Kap Nino', text: 'Isang utos ko lang, tiklop ang kariton mo. Walang makakalusot sa akin.', imageKey: 'story_boss1_open_2' },
          { speaker: 'Jo', text: 'Hindi ako hihinto. Para ito kay Papa at sa pangalan namin.', imageKey: 'story_boss1_open_3' }
        ],
        storyAfter: [
          { speaker: 'Jo', text: 'Isa na lang. Sa Maynila ko haharapin ang vlogger na sumira sa amin.', imageKey: 'story_manila_1' },
          { speaker: 'Narrator', text: 'Sa gitna ng ingay ng lungsod, kumalat ang balitang dumarating si Jo.', imageKey: 'story_manila_2' },
          { speaker: 'Narrator', text: 'At sa bawat kanto ng Maynila, papalapit ang susunod na banggaan.', imageKey: 'story_manila_3' }
        ]
      },

      // ========== ACT 2: MANILA ==========
      {
        levelNumber: 6,
        actNumber: 2,
        locationLabel: 'Manila Takeover',
        bgKey: 'bg_intramuros',
        bgmKey: 'bgm_people',
        waveConfig: {
          enemyPool: ['jbhotdog', 'bikejor'],
          baseCount: 10,
          scaling: 2
        },
        storyBefore: null,
        storyAfter: null
      },
      {
        levelNumber: 7,
        actNumber: 2,
        locationLabel: 'Quiapo Mayhem',
        bgKey: 'bg_intramuros',
        bgmKey: 'bgm_vendors',
        waveConfig: {
          enemyPool: ['jbhotdog', 'bikejor', 'kitboard'],
          baseCount: 11,
          scaling: 2
        },
        storyBefore: null,
        storyAfter: null
      },
      {
        levelNumber: 8,
        actNumber: 2,
        locationLabel: 'Intramuros Impact',
        bgKey: 'bg_intramuros',
        bgmKey: 'bgm_street',
        waveConfig: {
          enemyPool: ['jbhotdog', 'bikejor', 'kitboard', 'fmteacher'],
          baseCount: 12,
          scaling: 2
        },
        storyBefore: null,
        storyAfter: null
      },
      {
        levelNumber: 9,
        actNumber: 2,
        locationLabel: 'Binondo Brawl',
        bgKey: 'bg_intramuros',
        bgmKey: 'bgm_people',
        waveConfig: {
          enemyPool: ['jbhotdog', 'bikejor', 'kitboard', 'fmteacher', 'rex'],
          baseCount: 13,
          scaling: 3
        },
        storyBefore: null,
        storyAfter: null
      },
      {
        levelNumber: 10,
        actNumber: 2,
        locationLabel: 'Boss: Vlogger Ian',
        bgKey: 'bg_intramuros',
        bgmKey: 'bgm_crowd',
        waveConfig: {
          enemyPool: ['jbhotdog', 'bikejor', 'kitboard', 'fmteacher', 'rex'],
          baseCount: 15,
          scaling: 0,
            boss: 'boss_ian'
        },
        storyBefore: [
          { speaker: 'Vlogger Ian', text: 'Perfect timing! Live na live tayo, mga beshie!', imageKey: 'story_boss2_open_1' },
          { speaker: 'Jo', text: 'Hindi content ang kasinungalingan mo. Buhay namin ang sinira mo.', imageKey: 'story_boss2_open_2' },
          { speaker: 'Vlogger Ian', text: 'Then survive this stream. Followers, salubungin n\'yo siya!', imageKey: 'story_boss2_open_3' }
        ],
        storyAfter: [
          { speaker: 'Vlogger Ian', text: 'Teka! May mas mataas pa sa akin... nasa Makati ang nag-utos!', imageKey: 'story_makati_1' },
          { speaker: 'Jo', text: 'Kung siya ang utak nito, doon ko ito tatapusin.', imageKey: 'story_makati_2' },
          { speaker: 'Narrator', text: 'Sa mga tore ng Makati, naghihintay ang pinakamatinding laban.', imageKey: 'story_makati_3' }
        ]
      },

      // ========== ACT 3: MAKATI ==========
      {
        levelNumber: 11,
        actNumber: 3,
        locationLabel: 'Guadalupe Gridlock',
        bgKey: 'bg_guadalupe',
        bgmKey: 'bgm_traffic',
        waveConfig: {
          enemyPool: ['blonde', 'asbula'],
          baseCount: 14,
          scaling: 3
        },
        storyBefore: null,
        storyAfter: null
      },
      {
        levelNumber: 12,
        actNumber: 3,
        locationLabel: 'Poblacion Party',
        bgKey: 'bg_guadalupe',
        bgmKey: 'bgm_people',
        waveConfig: {
          enemyPool: ['blonde', 'asbula', 'willie'],
          baseCount: 15,
          scaling: 3
        },
        storyBefore: null,
        storyAfter: null
      },
      {
        levelNumber: 13,
        actNumber: 3,
        locationLabel: 'Legazpi Village Loot',
        bgKey: 'bg_legazpi',
        bgmKey: 'bgm_makati',
        waveConfig: {
          enemyPool: ['blonde', 'asbula', 'willie', 'fmbad'],
          baseCount: 16,
          scaling: 4
        },
        storyBefore: null,
        storyAfter: null
      },
      {
        levelNumber: 14,
        actNumber: 3,
        locationLabel: 'Makati Campaign',
        bgKey: 'bg_legazpi',
        bgmKey: 'bgm_makati',
        waveConfig: {
          enemyPool: ['blonde', 'asbula', 'willie', 'fmbad', 'angryfm'],
          baseCount: 18,
          scaling: 4
        },
        storyBefore: null,
        storyAfter: null,
      },
      {
        levelNumber: 15,
        actNumber: 3,
        locationLabel: 'Boss: The Mastermind',
        bgKey: 'bg_legazpi',
        bgmKey: 'bgm_crowd',
        waveConfig: {
          enemyPool: ['blonde', 'asbula', 'willie', 'fmbad', 'angryfm'],
          baseCount: 20,
          scaling: 0,
          boss: 'boss_final'
        },
        storyBefore: [
          { speaker: 'Mastermind', text: 'Sa wakas, nandito ka na. Ako ang pumatay sa negosyo ng ama mo.', imageKey: 'story_boss3_open_1' },
          { speaker: 'Mastermind', text: 'Masyadong masarap ang pares ninyo. Delikado sa imperyo ko.', imageKey: 'story_boss3_open_2' },
          { speaker: 'Jo', text: 'Ginawa mo \'yon dahil sa pera? Dito na matatapos ang lahat.', imageKey: 'story_boss3_open_3' }
        ],
        storyAfter: [
          { speaker: 'Narrator', text: 'Pagbagsak ng Mastermind, lumabas ang buong katotohanan.', imageKey: 'story_ending_1' },
          { speaker: 'Narrator', text: 'Isa-isang tumigil ang kasinungalingan nang makita ng lahat ang ebidensya.', imageKey: 'story_ending_2' },
          { speaker: 'Narrator', text: 'Nalinis ang pangalan ng pamilya ni Jo at muling bumukas ang paresan.', imageKey: 'story_ending_3' },
          { speaker: 'Narrator', text: 'Bumalik ang mga suki, at muling umusok ang sabaw sa kariton.', imageKey: 'story_ending_4' },
          { speaker: 'Jo', text: 'Pa, bawi na tayo. Simula ulit, mas matatag na.', imageKey: 'story_ending_5' },
          { speaker: 'Narrator', text: 'Wakas ng laban. Simula ng bagong alamat.', imageKey: 'story_ending_6' },

          { speaker: '', text: 'Thank you for playing!', imageKey: 'story_thanks' }
        ]
      }
    ];
  }

  getLevelConfig(level) {
    return this.levelConfigs[level - 1] || this.levelConfigs[0];
  }

  getCurrentLevelConfig() {
    const currentLevel = this.game.levelManager?.currentLevel || 1;
    return this.getLevelConfig(currentLevel);
  }

  getWaveEnemies(level) {
    const config = this.getLevelConfig(level);
    const { waveConfig } = config;
    const enemies = [];

    const enemyCount = waveConfig.baseCount + (waveConfig.scaling * (level - 1));
    const cappedCount = Math.min(enemyCount, 25); 

    for (let i = 0; i < cappedCount; i++) {
      const randomIndex = Math.floor(Math.random() * waveConfig.enemyPool.length);
      enemies.push(waveConfig.enemyPool[randomIndex]);
    }

    if (waveConfig.boss) {
      enemies.push(waveConfig.boss);
    }

    return enemies;
  }

  hasStoryBefore(level) {
    const config = this.getLevelConfig(level);
    return config.storyBefore && config.storyBefore.length > 0;
  }

  hasStoryAfter(level) {
    const config = this.getLevelConfig(level);
    return config.storyAfter && config.storyAfter.length > 0;
  }

  startStoryBefore(level) {
    const config = this.getLevelConfig(level);
    if (config.storyBefore && config.storyBefore.length > 0) {
      this.currentDialogueArray = config.storyBefore;
      this.currentDialogueIndex = 0;
      this.isPlayingStoryBefore = true;
      return true;
    }
    return false;
  }

  startGlobalPrologue() {
    this.currentDialogueArray = [
      { speaker: 'Narrator', text: 'Habang papalapit ang laban, bumalik sa isip ni Jo ang simula ng lahat.', imageKey: 'story_prologue_1' },
      { speaker: 'Narrator', text: 'Masaya pa noon ang paresan at buo ang pangarap nilang mag-ama.', imageKey: 'story_prologue_2' },
      { speaker: 'Narrator', text: 'Isang pekeng kwento ang sumira sa pangalan ng pamilya nila.', imageKey: 'story_prologue_3' },
      { speaker: 'Narrator', text: 'Nang mapasara ang puwesto, halos sumuko na ang lahat.', imageKey: 'story_prologue_4' },
      { speaker: 'Narrator', text: 'Pero hindi pumayag si Jo na matapos doon ang pangarap nila.', imageKey: 'story_prologue_5' },
      { speaker: 'Jo', text: 'Para sa pamilya namin, lalaban ako hanggang dulo.', imageKey: 'story_prologue_6' }
    ];
    this.currentDialogueIndex = 0;
    this.isPlayingStoryBefore = true;
    return true;
  }

  startStoryAfter(level) {
    const config = this.getLevelConfig(level);
    if (config.storyAfter && config.storyAfter.length > 0) {
      this.currentDialogueArray = config.storyAfter;
      this.currentDialogueIndex = 0;
      this.isPlayingStoryBefore = false;
      return true;
    }
    return false;
  }

  getCurrentDialogue() {
    if (this.currentDialogueIndex < this.currentDialogueArray.length) {
      return this.currentDialogueArray[this.currentDialogueIndex];
    }
    return null;
  }

  advanceDialogue() {
    this.currentDialogueIndex++;
    return this.currentDialogueIndex < this.currentDialogueArray.length;
  }

  isCutsceneComplete() {
    return this.currentDialogueIndex >= this.currentDialogueArray.length;
  }

  resetDialogue() {
    this.currentDialogueIndex = 0;
    this.currentDialogueArray = [];
  }
}

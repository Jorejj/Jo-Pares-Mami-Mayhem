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
        storyBefore: [
          { speaker: 'Narrator', text: 'Jo and his father ran the legendary paresan in Caloocan...', imageKey: 'story1' },
          { speaker: 'Narrator', text: 'Famous for sabaw that could cure heartbreak.', imageKey: 'story2' },
          { speaker: 'Narrator', text: 'But a jealous inspector and a clout-chasing vlogger...', imageKey: 'story3' },
          { speaker: 'Narrator', text: 'Filmed a fake video claiming the secret ingredient was "magic".', imageKey: 'story4' },
          { speaker: 'Narrator', text: 'The viral video caused an outcry. The government shut them down.', imageKey: 'story5' },
          { speaker: 'Narrator', text: "Jo's father hung up his apron, truly heartbroken.", imageKey: 'story6' },
          { speaker: 'Narrator', text: 'But Jo couldn\'t let go of the dream. He grabbed his heavy-duty ladle.', imageKey: 'story7' },
          { speaker: 'Jo', text: 'I swear to cook my way back to the top!', imageKey: 'story8' }
        ],
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
        storyAfter: [
          { speaker: 'Jo', text: 'I can feel someone watching me...', imageKey: 'story_caloocan' }
        ]
      },
      {
        levelNumber: 5,
        actNumber: 1,
        locationLabel: 'Boss: Inspector Kap Nino',
        bgKey: 'bg_monumento',
        bgmKey: 'bgm_crowd',
        waveConfig: {
          enemyPool: ['cockroach', 'gangster', 'dog', 'newDaga1'],
          baseCount: 15,
          scaling: 0,
          boss: 'boss_kap'
        },
        storyBefore: [
          { speaker: '???', text: 'So you\'re the one causing trouble in my barangay!', imageKey: 'story_villains' },
          { speaker: 'Kap Nino', text: 'I am Kap Nino! I shut down your father\'s stall, and now I\'ll shut YOU down!', imageKey: 'story_villains' },
          { speaker: 'Jo', text: 'You! You\'re the one who ruined everything!', imageKey: 'story_jo_sad' }
        ],
        storyAfter: [
          { speaker: 'Jo', text: 'One down. The vlogger is next. Time to take my fight to Manila!', imageKey: 'story8' }
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
        storyBefore: [
          { speaker: 'Narrator', text: 'Jo arrives in the heart of Manila, seeking justice.', imageKey: 'story_caloocan' }
        ],
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
        storyAfter: [
          { speaker: 'Jo', text: 'I can sense her presence nearby...', imageKey: 'story_caloocan' }
        ]
      },
      {
        levelNumber: 10,
        actNumber: 2,
        locationLabel: 'Boss: Vlogger Diwata',
        bgKey: 'bg_intramuros',
        bgmKey: 'bgm_crowd',
        waveConfig: {
          enemyPool: ['jbhotdog', 'bikejor', 'kitboard', 'fmteacher', 'rex'],
          baseCount: 15,
          scaling: 0,
          boss: 'ian'
        },
        storyBefore: [
          { speaker: 'Diwata', text: 'OMG! It\'s that paresan boy! This is gonna go VIRAL!', imageKey: 'story_villains' },
          { speaker: 'Jo', text: 'Your lies ruined my family!', imageKey: 'story_jo_sad' },
          { speaker: 'Diwata', text: 'Lies? Sweetie, I call it CONTENT! Now let\'s see if you can handle my followers!', imageKey: 'story_villains' }
        ],
        storyAfter: [
          { speaker: 'Diwata', text: 'Wait... I was just following orders! The Mastermind... he\'s in Makati!', imageKey: 'story_villains' },
          { speaker: 'Jo', text: 'A mastermind? Then that\'s where I\'m headed next!', imageKey: 'story8' }
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
        storyBefore: [
          { speaker: 'Narrator', text: 'Jo pushes into the rich districts of Makati, searching for the truth.', imageKey: 'story_caloocan' }
        ],
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
        storyAfter: [
          { speaker: 'Jo', text: 'The tower is just ahead... Time to end this!', imageKey: 'story8' }
        ]
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
          { speaker: '???', text: 'So you finally made it here, Jo.', imageKey: 'story_villains' },
          { speaker: 'Mastermind', text: 'Your father\'s pares was too good. It was hurting my business empire!', imageKey: 'story_villains' },
          { speaker: 'Mastermind', text: 'So I had to... remove the competition. Nothing personal.', imageKey: 'story_villains' },
          { speaker: 'Jo', text: 'You destroyed my family for MONEY?! This ends NOW!', imageKey: 'story_jo_sad' }
        ],
        storyAfter: [
          { speaker: 'Narrator', text: 'With the mastermind defeated, the truth was revealed to the public.', imageKey: 'story8' },
          { speaker: 'Narrator', text: 'Jo\'s father\'s name was cleared. The paresan could finally reopen!', imageKey: 'story1' },
          { speaker: 'Jo', text: 'We did it, Papa. We\'re back on top!', imageKey: 'story8' },
          { speaker: 'Narrator', text: 'THE END... or is it? Stay tuned for DLC!', imageKey: 'story8' }
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
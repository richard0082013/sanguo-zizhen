export const BOARD_PATH = [
  { col: 6, row: 1 },
  { col: 5, row: 1 },
  { col: 4, row: 1 },
  { col: 4, row: 2 },
  { col: 4, row: 3 },
  { col: 3, row: 3 },
  { col: 2, row: 3 },
  { col: 2, row: 2 },
  { col: 2, row: 1 },
  { col: 1, row: 1 },
  { col: 0, row: 1 },
];

export const GAME_CONFIG = {
  canvasWidth: 450,
  canvasHeight: 800,

  gridCols: 7,
  gridRows: 5,
  cellSize: 54,

  opponentBoardY: 0,
  riverY: 318,
  riverHeight: 30,
  playerBoardY: 348,
  hudY: 680,
  hudHeight: 120,

  boardScale: 1,
  opponentBoardScale: 1,

  adouColumnWidth: 60,

  playerGridStartX: 65,
  playerGridStartY: 380,

  opponentGridStartX: 65,
  opponentGridStartY: 30,

  playerAdouX: 32,
  playerAdouY: 461,

  opponentAdouX: 32,
  opponentAdouY: 111,

  pathCells: BOARD_PATH,

  assets: {
    backgrounds: {
      parchment: `${import.meta.env.BASE_URL}assets/backgrounds/parchment.png`,
      river: `${import.meta.env.BASE_URL}assets/backgrounds/river.png`,
    },
    adou: `${import.meta.env.BASE_URL}assets/backgrounds/adou.png`,
    tiles: {
      white: `${import.meta.env.BASE_URL}assets/tiles/tile_white.png`,
      green: `${import.meta.env.BASE_URL}assets/tiles/tile_green.png`,
      blue: `${import.meta.env.BASE_URL}assets/tiles/tile_blue.png`,
      purple: `${import.meta.env.BASE_URL}assets/tiles/tile_purple.png`,
      gold: `${import.meta.env.BASE_URL}assets/tiles/tile_gold.png`,
      generalFrame: `${import.meta.env.BASE_URL}assets/tiles/tile_general_frame.png`,
    },
    enemies: {
      soldier: `${import.meta.env.BASE_URL}assets/enemies/enemy_soldier.png`,
      cavalry: `${import.meta.env.BASE_URL}assets/enemies/enemy_cavalry.png`,
      shield: `${import.meta.env.BASE_URL}assets/enemies/enemy_shield.png`,
      mage: `${import.meta.env.BASE_URL}assets/enemies/enemy_mage.png`,
      elite: `${import.meta.env.BASE_URL}assets/enemies/enemy_elite.png`,
      boss: `${import.meta.env.BASE_URL}assets/enemies/enemy_boss.png`,
    },
    generals: {
      zhaoyun: `${import.meta.env.BASE_URL}assets/generals/general_zhaoyun.png`,
      zhangfei: `${import.meta.env.BASE_URL}assets/generals/general_zhangfei.png`,
      guanyu: `${import.meta.env.BASE_URL}assets/generals/general_guanyu.png`,
      huangzhong: `${import.meta.env.BASE_URL}assets/generals/general_huangzhong.png`,
      zhugeliang: `${import.meta.env.BASE_URL}assets/generals/general_zhugeliang.png`,
      liubei: `${import.meta.env.BASE_URL}assets/generals/general_liubei.png`,
      caocao: `${import.meta.env.BASE_URL}assets/generals/general_caocao.png`,
      dianwei: `${import.meta.env.BASE_URL}assets/generals/general_dianwei.png`,
      xiahoudun: `${import.meta.env.BASE_URL}assets/generals/general_xiahoudun.png`,
      zhouyu: `${import.meta.env.BASE_URL}assets/generals/general_zhouyu.png`,
      sunshangxiang: `${import.meta.env.BASE_URL}assets/generals/general_sunshangxiang.png`,
      lvbu: `${import.meta.env.BASE_URL}assets/generals/general_lvbu.png`,
    },
    vfx: {
      fireDragon: `${import.meta.env.BASE_URL}assets/vfx/vfx_fire_dragon.png`,
      flameBurst: `${import.meta.env.BASE_URL}assets/vfx/vfx_flame_burst.png`,
      inkSplash: `${import.meta.env.BASE_URL}assets/vfx/vfx_ink_splash.png`,
      lightning: `${import.meta.env.BASE_URL}assets/vfx/vfx_lightning.png`,
      slash: `${import.meta.env.BASE_URL}assets/vfx/vfx_slash.png`,
    },
    ui: {
      button: `${import.meta.env.BASE_URL}assets/ui/ui_button.png`,
      mantou: `${import.meta.env.BASE_URL}assets/ui/ui_mantou.png`,
      heart: `${import.meta.env.BASE_URL}assets/ui/ui_heart.png`,
    },
  },

  holdingSlots: 5,

  // Two opening recruits cost 10 + 11; a third needs earned income.
  initialBuns: 30,
  bunsCapacity: Number.MAX_SAFE_INTEGER,
  incomePerSecond: 0,
  waveClearBonus: 6,
  weaponRecruitChance: 0.65,
  namePartnerChance: 0.65,
  baseRecruitCost: 10,
  recruitCostIncrement: 1,
  maxRecruitCost: 24,

  adouLives: 3,

  waveDelay: 6000,
  betweenWaveDelay: 2500,

  recruitWeights: {
    sword: 25,
    spear: 40,
    bow: 20,
    cavalry: 15,
    general: 18,
    shovel: 1,
  },

  levelColors: {
    1: '#946027',
    2: '#7cb342',
    3: '#42a5f5',
    4: '#ab47bc',
    5: '#ffd15b',
  },

  levelBorderColors: {
    1: '#d0d0c8',
    2: '#558b2f',
    3: '#1976d2',
    4: '#7b1fa2',
    5: '#e65100',
  },

  maps: {
    desert: {
      name: '长坂坡',
      cellColor: '#8d6e4c',
      cellBorder: '#6d4e2c',
      pathColor: '#c4a882',
      pathBorder: '#a48862',
      bgColor: '#5c4a3a',
      bgPattern: '#4a3828',
    },
    lotus: {
      name: '云梦泽',
      cellColor: '#d4a5b8',
      cellBorder: '#b48598',
      pathColor: '#f8f0f4',
      pathBorder: '#e8d0d4',
      bgColor: '#c8a0b0',
      bgPattern: '#b890a0',
    },
    grassland: {
      name: '巨鹿',
      cellColor: '#8faa6e',
      cellBorder: '#6f8a4e',
      pathColor: '#a0b8c8',
      pathBorder: '#8098a8',
      bgColor: '#7a9a5e',
      bgPattern: '#6a8a4e',
    },
  },

  colors: {
    background: '#2a2218',
    hudBg: '#1a1810',
    hudBorder: '#4a4030',

    inkBlack: '#1a1a1a',
    inkRed: '#c41e3a',
    inkGold: '#d4a537',
    parchment: '#f4e8d0',

    damageNormal: '#1a1a1a',
    damageCrit: '#c41e3a',
    heal: '#4caf50',

    dangerRed: '#ff0000',

    buttonBg: '#8b4513',
    buttonBorder: '#5c2e0a',
    buttonText: '#f4e8d0',

    heartFull: '#e53935',
    heartEmpty: '#4a4a4a',

    shu: '#cc4444',
    wei: '#4477cc',
    wu: '#44aa44',
    qun: '#aa44aa',
  },

  typography: {
    brush: '"Ma Shan Zheng", "ZCOOL XiaoWei", "KaiTi", "STKaiti", serif',
    ui: '"ZCOOL XiaoWei", "Noto Sans SC", "Microsoft YaHei", sans-serif',
  },

  animation: {
    tileSnapDuration: 120,
    mergeDuration: 200,
    projectileSpeed: 280,
    damageNumberDuration: 600,
    deathPuffDuration: 300,
    bunFlyDuration: 400,
  },
};

export const GAME_CONFIG = {
  canvasWidth: 390,
  canvasHeight: 844,

  gridCols: 7,
  gridRows: 5,
  cellSize: 44,

  playerBoardY: 460,
  opponentBoardY: 70,
  boardScale: 1,
  opponentBoardScale: 0.85,

  playerGridStartX: 70,
  playerGridStartY: 480,

  opponentGridStartX: 85,
  opponentGridStartY: 90,

  playerAdouX: 28,
  playerAdouY: 545,

  opponentAdouX: 45,
  opponentAdouY: 155,

  playerPathCells: [
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
  ],

  opponentPathCells: [
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
  ],

  holdingSlots: 5,

  initialBuns: 30,
  baseRecruitCost: 10,
  recruitCostIncrement: 2,
  maxRecruitCost: 50,

  adouLives: 3,

  waveDelay: 2000,
  betweenWaveDelay: 1500,

  recruitWeights: {
    sword: 25,
    spear: 25,
    bow: 20,
    cavalry: 15,
    general: 10,
    shovel: 5,
  },

  levelColors: {
    1: '#f5f5f0',
    2: '#7cb342',
    3: '#42a5f5',
    4: '#ab47bc',
    5: '#ff9800',
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
    brush: '"KaiTi", "STKaiti", "Noto Serif SC", serif',
    ui: '"Noto Sans SC", "Microsoft YaHei", sans-serif',
  },

  animation: {
    tileSnapDuration: 120,
    mergeDuration: 200,
    projectileSpeed: 600,
    damageNumberDuration: 600,
    deathPuffDuration: 300,
    bunFlyDuration: 400,
  },
};

export const GAME_CONFIG = {
  canvasWidth: 400,
  canvasHeight: 720,

  gridCols: 5,
  gridRows: 3,
  cellSize: 60,
  gridStartX: 50,
  gridStartY: 380,

  initialBuns: 30,
  baseRecruitCost: 10,
  recruitCostIncrement: 2,
  maxRecruitCost: 50,

  initialUnlockedCells: 5,
  maxCells: 15,

  adouLives: 3,
  adouX: 200,
  adouY: 550,

  pathPoints: [
    { x: 0, y: 200 },
    { x: 50, y: 200 },
    { x: 350, y: 200 },
    { x: 350, y: 300 },
    { x: 50, y: 300 },
    { x: 50, y: 370 },
    { x: 350, y: 370 },
    { x: 350, y: 470 },
    { x: 200, y: 470 },
    { x: 200, y: 550 },
  ],

  waveDelay: 5000,
  betweenWaveDelay: 3000,

  recruitWeights: {
    sword: 25,
    spear: 25,
    bow: 20,
    cavalry: 15,
    general: 10,
    shovel: 5,
  },

  colors: {
    background: '#1a1a2e',
    grid: '#16213e',
    gridBorder: '#0f3460',
    cellUnlocked: '#1f4068',
    cellLocked: '#0a0a0a',
    path: '#2d4a22',
    pathBorder: '#1e3a14',
    adou: '#FFD700',
    ui: '#e94560',
    text: '#eee',
    buns: '#f5a623',
  },
};

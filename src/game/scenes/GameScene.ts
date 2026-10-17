import Phaser from 'phaser';
import { BattleEngine } from '../logic/BattleEngine';
import { GAME_CONFIG } from '../config/gameConfig';
import { TILE_CONFIGS, SHOVEL_CONFIG } from '../config/tiles';
import { GENERALS } from '../config/generals';
import { VFXManager } from '../vfx/VFXManager';
import { TextureGenerator } from '../vfx/TextureGenerator';
import type { TileState, EnemyState, GridPosition, GameEvent, Position } from '../logic/types';

interface TileSprite {
  container: Phaser.GameObjects.Container;
  id: string;
  slotIndex?: number;
}

interface EnemySprite {
  container: Phaser.GameObjects.Container;
  healthBar: Phaser.GameObjects.Graphics;
  healthBg: Phaser.GameObjects.Graphics;
  charText: Phaser.GameObjects.Text;
  id: string;
}

type GamePhase = 'start' | 'playing' | 'result';

const CURRENT_MAP = GAME_CONFIG.maps.desert;

export class GameScene extends Phaser.Scene {
  private engine!: BattleEngine;
  private vfx!: VFXManager;
  private textureGen!: TextureGenerator;
  private phase: GamePhase = 'start';
  private debugMode: boolean = false;

  private playerCells: Phaser.GameObjects.Container[] = [];
  private opponentCells: Phaser.GameObjects.Container[] = [];

  private tileSprites: Map<string, TileSprite> = new Map();
  private opponentTileSprites: Map<string, TileSprite> = new Map();
  private enemySprites: Map<string, EnemySprite> = new Map();
  private opponentEnemySprites: Map<string, EnemySprite> = new Map();
  private projectileSprites: Map<string, Phaser.GameObjects.Container> = new Map();

  private holdingSlotContainers: Phaser.GameObjects.Container[] = [];
  private playerAdou!: Phaser.GameObjects.Container;
  private opponentAdou!: Phaser.GameObjects.Container;
  private playerHearts: (Phaser.GameObjects.Image | Phaser.GameObjects.Graphics)[] = [];
  private opponentHearts: (Phaser.GameObjects.Image | Phaser.GameObjects.Graphics)[] = [];

  private waveText!: Phaser.GameObjects.Text;
  private bunsText!: Phaser.GameObjects.Text;
  private recruitButton!: Phaser.GameObjects.Container;

  private startScreen!: Phaser.GameObjects.Container;
  private resultScreen!: Phaser.GameObjects.Container;
  private dangerWarning!: Phaser.GameObjects.Text;

  private draggingTile: TileSprite | null = null;
  private dragOrigin: Position | null = null;
  private dragLine!: Phaser.GameObjects.Graphics;
  private highlightedCells: Phaser.GameObjects.Graphics[] = [];

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.debugMode = new URLSearchParams(window.location.search).get('debug') === '1';

    this.textureGen = new TextureGenerator(this);
    this.textureGen.generateAll();

    this.vfx = new VFXManager({ scene: this });

    this.createBackground();
    this.createRiver();
    this.createOpponentBoard();
    this.createPlayerBoard();
    this.createHUD();
    this.createStartScreen();
    this.createResultScreen();

    this.dragLine = this.add.graphics();
    this.dragLine.setDepth(500);

    const cssPosition = (position: Position): Position => {
      const bounds = this.game.canvas.getBoundingClientRect();
      return { x: position.x * bounds.width / GAME_CONFIG.canvasWidth,
        y: position.y * bounds.height / GAME_CONFIG.canvasHeight };
    };
    window.__test = {
      placeableCells: () => this.engine.getState().player.cells.filter(c => !c.isPath).map(c => ({ ...c.position })),
      state: () => JSON.parse(JSON.stringify(this.engine.getState())),
      slotPos: (i) => cssPosition(this.holdingSlotContainers[i]),
      cellPos: (row, col) => cssPosition(this.getTileWorldPosition({ row, col }, false)),
      triggerFire: () => this.vfx.fireDragon(this.getPathWorldPositions(false), 2000),
      recruitPos: () => cssPosition(this.recruitButton),
      start: () => this.startGame(),
    };
    this.showStartScreen();

    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);

    if (this.debugMode) {
      this.createDebugControls();
    }
  }

  private createDebugControls(): void {
    const panelX = GAME_CONFIG.canvasWidth - 110;
    const panelY = GAME_CONFIG.riverY + GAME_CONFIG.riverHeight + 10;

    const debugPanel = this.add.container(panelX, panelY);
    debugPanel.setDepth(2000);

    const bg = this.add.rectangle(0, 0, 100, 180, 0x000000, 0.85);
    bg.setOrigin(0, 0);
    bg.setStrokeStyle(2, 0xffff00);

    const title = this.add.text(50, 8, 'DEBUG', {
      fontSize: '12px',
      color: '#ff0',
    });
    title.setOrigin(0.5, 0);

    const btnFireDragon = this.createDebugButton(5, 30, '🔥 Fire', () => {
      const pathPoints = this.getPathWorldPositions(false);
      this.vfx.fireDragon(pathPoints, 2000);
    });

    const btnArrowRain = this.createDebugButton(5, 55, '🏹 Arrow', () => {
      const cx = GAME_CONFIG.playerGridStartX + 150;
      const cy = GAME_CONFIG.playerGridStartY + 100;
      this.vfx.arrowRain(cx, cy, 80, 20);
    });

    const btnShockwave = this.createDebugButton(5, 80, '💥 Shock', () => {
      const cx = GAME_CONFIG.playerGridStartX + 150;
      const cy = GAME_CONFIG.playerGridStartY + 100;
      this.vfx.shockwaveRoar(cx, cy, 120);
    });

    const btnSlash = this.createDebugButton(5, 105, '⚔️ Slash', () => {
      const cx = GAME_CONFIG.playerGridStartX + 150;
      const cy = GAME_CONFIG.playerGridStartY + 100;
      this.vfx.crescentSlash({ x: cx, y: cy }, 0, 100);
    });

    const btnSpawnGeneral = this.createDebugButton(5, 130, '👤 General', () => {
      this.debugSpawnGeneral();
    });

    const btnLightning = this.createDebugButton(5, 155, '⚡ Chain', () => {
      const points = [
        { x: GAME_CONFIG.playerGridStartX + 50, y: GAME_CONFIG.playerGridStartY + 50 },
        { x: GAME_CONFIG.playerGridStartX + 150, y: GAME_CONFIG.playerGridStartY + 80 },
        { x: GAME_CONFIG.playerGridStartX + 250, y: GAME_CONFIG.playerGridStartY + 60 },
      ];
      this.vfx.lightningChain(points, 0x66ccff);
    });

    debugPanel.add([bg, title, btnFireDragon, btnArrowRain, btnShockwave, btnSlash, btnSpawnGeneral, btnLightning]);
  }

  private createDebugButton(x: number, y: number, text: string, callback: () => void): Phaser.GameObjects.Text {
    const btn = this.add.text(x, y, text, {
      fontSize: '11px',
      color: '#fff',
      backgroundColor: '#663300',
      padding: { x: 6, y: 4 },
    });
    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => {
      btn.setBackgroundColor('#884400');
      callback();
      this.time.delayedCall(200, () => btn.setBackgroundColor('#663300'));
    });
    btn.on('pointerover', () => btn.setBackgroundColor('#885500'));
    btn.on('pointerout', () => btn.setBackgroundColor('#663300'));
    return btn;
  }

  private debugSpawnGeneral(): void {
    const state = this.engine.getState();
    const general = GENERALS[Math.floor(Math.random() * GENERALS.length)];
    const chars = general.chars;

    chars.forEach((char, i) => {
      const tile: TileState = {
        id: `debug_tile_${Date.now()}_${i}`,
        type: 'general',
        char,
        level: 1,
        position: null,
        generalId: general.id,
        lastAttackTime: 0,
        attackSpeedBuff: 0,
        damageBuff: 0,
        isStunned: false,
        stunnedUntil: 0,
      };

      const emptySlotIndex = state.player.holdingSlots.findIndex((s) => s === null);
      if (emptySlotIndex >= 0) {
        state.player.tiles.push(tile);
        state.player.holdingSlots[emptySlotIndex] = tile;
        this.createHoldingSlotTile(emptySlotIndex);
      }
    });
  }

  private createBackground(): void {
    if (this.textures.exists('bg_parchment')) {
      const bg = this.add.image(0, 0, 'bg_parchment');
      bg.setOrigin(0, 0);
      bg.setDisplaySize(GAME_CONFIG.canvasWidth, GAME_CONFIG.canvasHeight);
      bg.setDepth(0);
    } else {
      const g = this.add.graphics();
      g.setDepth(0);
      g.fillStyle(0xd4c4a8);
      g.fillRect(0, 0, GAME_CONFIG.canvasWidth, GAME_CONFIG.canvasHeight);

      g.fillStyle(0xc8b898, 0.3);
      for (let y = 0; y < GAME_CONFIG.canvasHeight; y += 6) {
        g.fillRect(0, y, GAME_CONFIG.canvasWidth, 3);
      }
    }
  }

  private createRiver(): void {
    const riverY = GAME_CONFIG.riverY;
    const riverH = GAME_CONFIG.riverHeight;

    if (this.textures.exists('bg_river')) {
      const river = this.add.image(0, riverY, 'bg_river');
      river.setOrigin(0, 0);
      river.setDisplaySize(GAME_CONFIG.canvasWidth, riverH);
      river.setDepth(5);
    } else {
      const g = this.add.graphics();
      g.setDepth(5);
      g.fillStyle(0x3a7a9a);
      g.fillRect(0, riverY, GAME_CONFIG.canvasWidth, riverH);

      g.lineStyle(2, 0x5aaacc, 0.5);
      for (let i = 0; i < 5; i++) {
        g.beginPath();
        g.moveTo(0, riverY + 8 + i * 7);
        for (let x = 0; x < GAME_CONFIG.canvasWidth; x += 30) {
          g.lineTo(x + 15, riverY + 8 + i * 7 + Math.sin(x * 0.05) * 3);
        }
        g.strokePath();
      }
    }

    const dividerTop = this.add.graphics();
    dividerTop.setDepth(6);
    dividerTop.fillStyle(0x5a4a3a, 1);
    dividerTop.fillRect(0, riverY - 3, GAME_CONFIG.canvasWidth, 6);
    dividerTop.fillRect(0, riverY + riverH - 3, GAME_CONFIG.canvasWidth, 6);
  }

  private createOpponentBoard(): void {
    const { opponentGridStartX, opponentGridStartY, cellSize, opponentBoardScale, gridCols, gridRows, opponentPathCells } = GAME_CONFIG;
    const scaledSize = cellSize * opponentBoardScale;
    const pathSet = new Set(opponentPathCells.map((p) => `${p.col},${p.row}`));

    this.opponentAdou = this.createAdou(GAME_CONFIG.opponentAdouX, GAME_CONFIG.opponentAdouY, true);

    this.opponentHearts = [];
    for (let i = 0; i < GAME_CONFIG.adouLives; i++) {
      const heart = this.createHeart(GAME_CONFIG.opponentAdouX - 15 + i * 16, GAME_CONFIG.opponentAdouY + 50, 0.5);
      this.opponentHearts.push(heart);
    }

    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        const x = opponentGridStartX + col * scaledSize;
        const y = opponentGridStartY + row * scaledSize;
        const isPath = pathSet.has(`${col},${row}`);

        const cellContainer = this.add.container(x, y);
        cellContainer.setDepth(10);

        if (isPath) {
          const pathCell = this.createPathCell(scaledSize);
          cellContainer.add(pathCell);
        } else {
          const gridCell = this.createGridCell(scaledSize);
          cellContainer.add(gridCell);
        }

        this.opponentCells.push(cellContainer);
      }
    }
  }

  private createPlayerBoard(): void {
    const { playerGridStartX, playerGridStartY, cellSize, gridCols, gridRows, playerPathCells } = GAME_CONFIG;
    const pathSet = new Set(playerPathCells.map((p) => `${p.col},${p.row}`));

    this.playerAdou = this.createAdou(GAME_CONFIG.playerAdouX, GAME_CONFIG.playerAdouY, false);

    this.playerHearts = [];
    for (let i = 0; i < GAME_CONFIG.adouLives; i++) {
      const heart = this.createHeart(GAME_CONFIG.playerAdouX - 18 + i * 20, GAME_CONFIG.playerAdouY + 55, 0.7);
      this.playerHearts.push(heart);
    }

    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        const x = playerGridStartX + col * cellSize;
        const y = playerGridStartY + row * cellSize;
        const isPath = pathSet.has(`${col},${row}`);

        const cellContainer = this.add.container(x, y);
        cellContainer.setDepth(10);
        cellContainer.setData('col', col);
        cellContainer.setData('row', row);
        cellContainer.setData('isPath', isPath);

        if (isPath) {
          const pathCell = this.createPathCell(cellSize);
          cellContainer.add(pathCell);
        } else {
          const gridCell = this.createGridCell(cellSize);
          cellContainer.add(gridCell);
        }

        this.playerCells.push(cellContainer);
      }
    }
  }

  private createPathCell(size: number): Phaser.GameObjects.Graphics {
    const g = this.add.graphics();

    const gradient = g;
    g.fillStyle(0x8b7050);
    g.fillRect(0, 0, size, size);

    g.fillStyle(0x705840, 0.5);
    for (let i = 0; i < 8; i++) {
      const px = Math.random() * size;
      const py = Math.random() * size;
      g.fillCircle(px, py, Math.random() * 3 + 1);
    }

    g.lineStyle(1, 0x604030, 0.5);
    g.strokeRect(0, 0, size, size);

    return g;
  }

  private createGridCell(size: number): Phaser.GameObjects.Graphics {
    const g = this.add.graphics();

    g.fillStyle(0xc4a070);
    g.fillRect(0, 0, size, size);

    g.lineStyle(2, 0x8a6a4a);
    g.strokeRect(1, 1, size - 2, size - 2);

    g.lineStyle(1, 0xd4b490);
    g.strokeRect(3, 3, size - 6, size - 6);

    return g;
  }

  private createAdou(x: number, y: number, isOpponent: boolean): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    container.setDepth(15);

    const scale = 0.6;

    if (this.textures.exists('adou')) {
      const sprite = this.add.image(0, 0, 'adou');
      sprite.setScale(scale);
      sprite.setOrigin(0.5, 0.5);
      container.add(sprite);
    } else {
      const basket = this.add.graphics();
      basket.fillStyle(0x8b6914);
      basket.fillEllipse(0, 15 * scale, 44 * scale, 24 * scale);
      basket.fillStyle(0xffd4b8);
      basket.fillCircle(0, -12 * scale, 12 * scale);
      container.add(basket);
    }

    const label = this.add.text(0, 40 * scale, '斗', {
      fontFamily: GAME_CONFIG.typography.brush,
      fontSize: `${18 * scale}px`,
      color: '#f4e8d0',
      stroke: '#3a2a1a',
      strokeThickness: 2,
    });
    label.setOrigin(0.5);
    container.add(label);

    return container;
  }

  private createHeart(x: number, y: number, scale: number): Phaser.GameObjects.Image | Phaser.GameObjects.Graphics {
    if (this.textures.exists('ui_heart')) {
      const heart = this.add.image(x, y, 'ui_heart');
      heart.setScale(scale);
      heart.setDepth(16);
      return heart;
    }

    const g = this.add.graphics();
    g.setPosition(x, y);
    g.setDepth(16);
    g.setScale(scale);

    g.fillStyle(0xe53935);
    g.fillCircle(6, 6, 6);
    g.fillCircle(14, 6, 6);
    g.fillTriangle(0, 8, 20, 8, 10, 20);

    g.fillStyle(0xffffff, 0.4);
    g.fillCircle(5, 5, 2);

    return g;
  }

  private createHUD(): void {
    const hudY = GAME_CONFIG.hudY;

    const hudBg = this.add.graphics();
    hudBg.setDepth(50);
    hudBg.fillStyle(0x2a2218);
    hudBg.fillRect(0, hudY, GAME_CONFIG.canvasWidth, GAME_CONFIG.hudHeight);

    hudBg.fillStyle(0x4a3828);
    hudBg.fillRect(0, hudY, GAME_CONFIG.canvasWidth, 4);

    const campLabel = this.add.text(15, hudY + 15, '营', {
      fontFamily: GAME_CONFIG.typography.brush,
      fontSize: '28px',
      color: '#d4a537',
      stroke: '#1a1a1a',
      strokeThickness: 2,
    });
    campLabel.setDepth(51);

    this.holdingSlotContainers = [];
    const slotSize = 46;
    const slotGap = 6;
    const totalSlotsWidth = GAME_CONFIG.holdingSlots * slotSize + (GAME_CONFIG.holdingSlots - 1) * slotGap;
    const slotStartX = (GAME_CONFIG.canvasWidth - totalSlotsWidth) / 2;
    const slotY = hudY + 12;

    for (let i = 0; i < GAME_CONFIG.holdingSlots; i++) {
      const slotX = slotStartX + i * (slotSize + slotGap);

      const slotBg = this.add.graphics();
      slotBg.setDepth(51);
      slotBg.fillStyle(0x4a3828);
      slotBg.fillRoundedRect(slotX, slotY, slotSize, slotSize, 5);
      slotBg.lineStyle(2, 0x6a5848);
      slotBg.strokeRoundedRect(slotX, slotY, slotSize, slotSize, 5);

      const slotContainer = this.add.container(slotX + slotSize / 2, slotY + slotSize / 2);
      slotContainer.setDepth(52);
      this.holdingSlotContainers.push(slotContainer);
    }

    this.recruitButton = this.add.container(GAME_CONFIG.canvasWidth / 2, hudY + 92);
    this.recruitButton.setDepth(51);

    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x8b4513);
    btnBg.fillRoundedRect(-70, -18, 140, 36, 6);
    btnBg.lineStyle(2, 0xd4a537);
    btnBg.strokeRoundedRect(-70, -18, 140, 36, 6);

    const btnText = this.add.text(-25, 0, '征兵', {
      fontFamily: GAME_CONFIG.typography.brush,
      fontSize: '22px',
      color: '#f4e8d0',
    });
    btnText.setOrigin(0.5);

    const bunIcon = this.add.text(20, 0, '🥟', {
      fontSize: '14px',
    });
    bunIcon.setOrigin(0.5);

    this.bunsText = this.add.text(38, 0, '30', {
      fontFamily: GAME_CONFIG.typography.ui,
      fontSize: '16px',
      color: '#d4a537',
    });
    this.bunsText.setOrigin(0, 0.5);

    this.recruitButton.add([btnBg, btnText, bunIcon, this.bunsText]);
    this.recruitButton.setSize(140, 36);
    this.recruitButton.setInteractive({ useHandCursor: true });
    this.recruitButton.on('pointerdown', () => this.onRecruitClicked());

    this.waveText = this.add.text(GAME_CONFIG.canvasWidth - 10, hudY + 5, '第1波', {
      fontFamily: GAME_CONFIG.typography.brush,
      fontSize: '18px',
      color: '#a09080',
    });
    this.waveText.setOrigin(1, 0);
    this.waveText.setDepth(51);
  }

  private createStartScreen(): void {
    this.startScreen = this.add.container(0, 0);
    this.startScreen.setDepth(1000);

    const overlay = this.add.rectangle(
      GAME_CONFIG.canvasWidth / 2,
      GAME_CONFIG.canvasHeight / 2,
      GAME_CONFIG.canvasWidth,
      GAME_CONFIG.canvasHeight,
      0x1a1810,
      0.9
    );

    const title = this.add.text(GAME_CONFIG.canvasWidth / 2, GAME_CONFIG.canvasHeight * 0.3, '三国字阵', {
      fontFamily: GAME_CONFIG.typography.brush,
      fontSize: '56px',
      color: '#f4e8d0',
      stroke: '#8b4513',
      strokeThickness: 4,
    });
    title.setOrigin(0.5);

    const subtitle = this.add.text(GAME_CONFIG.canvasWidth / 2, GAME_CONFIG.canvasHeight * 0.38, '文字合成塔防', {
      fontFamily: GAME_CONFIG.typography.ui,
      fontSize: '22px',
      color: '#d4a537',
    });
    subtitle.setOrigin(0.5);

    const startBtnContainer = this.add.container(GAME_CONFIG.canvasWidth / 2, GAME_CONFIG.canvasHeight * 0.55);

    const startBtnBg = this.add.graphics();
    startBtnBg.fillStyle(0xc41e3a);
    startBtnBg.fillRoundedRect(-80, -30, 160, 60, 10);
    startBtnBg.lineStyle(3, 0xffd700);
    startBtnBg.strokeRoundedRect(-80, -30, 160, 60, 10);

    const startBtnText = this.add.text(0, 0, '开战', {
      fontFamily: GAME_CONFIG.typography.brush,
      fontSize: '32px',
      color: '#fff',
    });
    startBtnText.setOrigin(0.5);

    startBtnContainer.add([startBtnBg, startBtnText]);
    startBtnContainer.setSize(160, 60);
    startBtnContainer.setInteractive({ useHandCursor: true });
    startBtnContainer.on('pointerdown', () => this.startGame());

    const instructions = this.add.text(GAME_CONFIG.canvasWidth / 2, GAME_CONFIG.canvasHeight * 0.72,
      '征兵获得棋子，拖放到棋盘上\n相同棋子合并可升级\n集齐武将名字激活必杀技\n守护阿斗，击退敌军！', {
        fontFamily: GAME_CONFIG.typography.ui,
        fontSize: '16px',
        color: '#a09080',
        align: 'center',
        lineSpacing: 8,
      });
    instructions.setOrigin(0.5);

    this.startScreen.add([overlay, title, subtitle, startBtnContainer, instructions]);
  }

  private createResultScreen(): void {
    this.resultScreen = this.add.container(0, 0);
    this.resultScreen.setDepth(1000);
    this.resultScreen.setVisible(false);

    const overlay = this.add.rectangle(
      GAME_CONFIG.canvasWidth / 2,
      GAME_CONFIG.canvasHeight / 2,
      GAME_CONFIG.canvasWidth,
      GAME_CONFIG.canvasHeight,
      0x000000,
      0.85
    );

    this.resultScreen.add([overlay]);
  }

  private showStartScreen(): void {
    this.phase = 'start';
    this.startScreen.setVisible(true);
  }

  private startGame(): void {
    this.phase = 'playing';
    this.startScreen.setVisible(false);
    this.engine = new BattleEngine(Date.now());
    this.engine.addEventListener((event: GameEvent) => this.handleGameEvent(event));

    this.showAnnouncement('布阵！征兵迎敌');
    this.time.delayedCall(GAME_CONFIG.waveDelay, () => {
      this.engine.startNextWave();
    });
  }

  update(_time: number, delta: number): void {
    if (this.phase !== 'playing') return;

    this.engine.update(delta);
    this.updateSprites();
  }

  private updateSprites(): void {
    const state = this.engine.getState();

    this.updateEnemies(state.enemies, false);
    this.updateEnemies(state.opponentEnemies, true);

    this.updateTiles(state.player.tiles, false);
    this.updateTiles(state.opponent.tiles, true);

    this.updateProjectiles([...state.projectiles, ...state.opponentProjectiles]);

    this.updateUI(state);
  }

  private updateEnemies(enemies: EnemyState[], isOpponent: boolean): void {
    const spriteMap = isOpponent ? this.opponentEnemySprites : this.enemySprites;

    enemies.forEach((enemy) => {
      let sprite = spriteMap.get(enemy.id);

      if (!sprite) {
        sprite = this.createEnemySprite(enemy, isOpponent);
        spriteMap.set(enemy.id, sprite);
      }

      const worldPos = this.getEnemyWorldPosition(enemy, isOpponent);
      const scale = isOpponent ? GAME_CONFIG.opponentBoardScale : 1;
      const size = (enemy.isBoss ? 64 : 40) * scale;

      const bobOffset = Math.sin(this.time.now * 0.008 + enemy.pathIndex * 2) * 3;
      const squash = 1 + Math.sin(this.time.now * 0.01 + enemy.pathIndex) * 0.05;
      sprite.container.setPosition(worldPos.x, worldPos.y + bobOffset);
      sprite.container.setScale(squash, 1 / squash);

      const healthPercent = enemy.health / enemy.maxHealth;
      sprite.healthBar.clear();
      sprite.healthBg.clear();
      sprite.healthBg.fillStyle(0x333333);
      sprite.healthBg.fillRect(-size / 2, -size / 2 - 8, size, 6);
      sprite.healthBar.fillStyle(healthPercent > 0.3 ? 0x4caf50 : 0xf44336);
      sprite.healthBar.fillRect(-size / 2 + 1, -size / 2 - 7, (size - 2) * healthPercent, 4);
    });

    spriteMap.forEach((sprite, id) => {
      if (!enemies.find((e) => e.id === id)) {
        this.vfx.inkSplat(sprite.container.x, sprite.container.y);
        sprite.container.destroy();
        spriteMap.delete(id);
      }
    });
  }

  private createEnemySprite(enemy: EnemyState, isOpponent: boolean): EnemySprite {
    const container = this.add.container(0, 0);
    container.setDepth(100);

    const scale = isOpponent ? GAME_CONFIG.opponentBoardScale : 1;
    const size = (enemy.isBoss ? 64 : 40) * scale;

    const enemyTextureMap: Record<string, string> = {
      soldier: 'enemy_soldier',
      archer: 'enemy_soldier',
      cavalry: 'enemy_cavalry',
      shield: 'enemy_shield',
      mage: 'enemy_mage',
      elite: 'enemy_elite',
    };

    const textureKey = enemy.isBoss ? 'enemy_boss' : (enemyTextureMap[enemy.type] || 'enemy_soldier');

    if (this.textures.exists(textureKey)) {
      const sprite = this.add.image(0, 0, textureKey);
      sprite.setDisplaySize(size, size);
      container.add(sprite);
    } else {
      const body = this.add.graphics();
      const color = enemy.isBoss ? 0xaa4444 : Phaser.Display.Color.HexStringToColor(enemy.color).color;
      body.fillStyle(color);
      body.fillCircle(0, 0, size / 2);
      body.lineStyle(2, 0x111111);
      body.strokeCircle(0, 0, size / 2);
      container.add(body);
    }

    const charText = this.add.text(0, size / 2 + 4, enemy.char, {
      fontFamily: GAME_CONFIG.typography.brush,
      fontSize: `${12 * scale}px`,
      color: '#fff',
      stroke: '#000',
      strokeThickness: 2,
    });
    charText.setOrigin(0.5, 0);
    container.add(charText);

    const healthBg = this.add.graphics();
    healthBg.fillStyle(0x333333);
    healthBg.fillRect(-size / 2, -size / 2 - 8, size, 6);
    container.add(healthBg);

    const healthBar = this.add.graphics();
    healthBar.fillStyle(0x4caf50);
    healthBar.fillRect(-size / 2 + 1, -size / 2 - 7, size - 2, 4);
    container.add(healthBar);

    return { container, healthBar, healthBg, charText, id: enemy.id };
  }

  private getEnemyWorldPosition(enemy: EnemyState, isOpponent: boolean): Position {
    const pathCells = isOpponent ? GAME_CONFIG.opponentPathCells : GAME_CONFIG.playerPathCells;
    const startX = isOpponent ? GAME_CONFIG.opponentGridStartX : GAME_CONFIG.playerGridStartX;
    const startY = isOpponent ? GAME_CONFIG.opponentGridStartY : GAME_CONFIG.playerGridStartY;
    const scale = isOpponent ? GAME_CONFIG.opponentBoardScale : GAME_CONFIG.boardScale;
    const cellSize = GAME_CONFIG.cellSize * scale;

    const pathIndex = Math.floor(enemy.pathIndex);
    const progress = enemy.pathProgress;

    if (pathIndex >= pathCells.length - 1) {
      const lastCell = pathCells[pathCells.length - 1];
      return {
        x: startX + lastCell.col * cellSize + cellSize / 2,
        y: startY + lastCell.row * cellSize + cellSize / 2,
      };
    }

    const currentCell = pathCells[pathIndex];
    const nextCell = pathCells[pathIndex + 1];

    const currentX = startX + currentCell.col * cellSize + cellSize / 2;
    const currentY = startY + currentCell.row * cellSize + cellSize / 2;
    const nextX = startX + nextCell.col * cellSize + cellSize / 2;
    const nextY = startY + nextCell.row * cellSize + cellSize / 2;

    return {
      x: currentX + (nextX - currentX) * progress,
      y: currentY + (nextY - currentY) * progress,
    };
  }

  private updateTiles(tiles: TileState[], isOpponent: boolean): void {
    const spriteMap = isOpponent ? this.opponentTileSprites : this.tileSprites;

    tiles.forEach((tile) => {
      if (!tile.position) return;

      let sprite = spriteMap.get(tile.id);
      if (!sprite) {
        sprite = this.createTileSprite(tile, isOpponent);
        spriteMap.set(tile.id, sprite);
      }

      const worldPos = this.getTileWorldPosition(tile.position, isOpponent);
      if (this.draggingTile?.id !== tile.id) sprite.container.setPosition(worldPos.x, worldPos.y);
    });

    spriteMap.forEach((sprite, id) => {
      const tile = tiles.find((t) => t.id === id);
      if (!tile) {
        if (!this.draggingTile || this.draggingTile.id !== id) {
          sprite.container.destroy();
          spriteMap.delete(id);
        }
      }
    });
  }

  private createTileSprite(tile: TileState, isOpponent: boolean): TileSprite {
    const scale = isOpponent ? GAME_CONFIG.opponentBoardScale : 1;
    const size = (GAME_CONFIG.cellSize - 4) * scale;

    const container = this.add.container(0, 0);
    container.setDepth(100);

    const tileTextures: Record<number, string> = {
      1: 'tile_white',
      2: 'tile_green',
      3: 'tile_blue',
      4: 'tile_purple',
      5: 'tile_gold',
    };

    const textureKey = tileTextures[tile.level] || 'tile_white';
    const isGeneral = tile.type === 'general' && tile.generalId;

    if (this.textures.exists(textureKey)) {
      const tileImg = this.add.image(0, 0, isGeneral ? 'tile_general_frame' : textureKey);
      tileImg.setDisplaySize(size, size);
      container.add(tileImg);

      if (isGeneral) {
        const generalKey = `general_${tile.generalId}`;
        if (this.textures.exists(generalKey)) {
          const portrait = this.add.image(0, -4, generalKey);
          portrait.setDisplaySize(size * 0.7, size * 0.7);
          container.add(portrait);
        }
      }
    } else {
      const bg = this.add.graphics();
      bg.fillStyle(0xf8f4e8);
      bg.fillRoundedRect(-size / 2, -size / 2, size, size, 4);
      bg.lineStyle(2, 0xc8c0b0);
      bg.strokeRoundedRect(-size / 2, -size / 2, size, size, 4);
      container.add(bg);
    }

    const charText = this.add.text(0, isGeneral ? 12 : 0, tile.char, {
      fontFamily: GAME_CONFIG.typography.brush,
      fontSize: `${isGeneral ? 14 : 24}px`,
      color: '#1a1a1a',
      stroke: '#fff',
      strokeThickness: 2,
    });
    charText.setOrigin(0.5);
    container.add(charText);

    if (tile.level > 1 && !isGeneral) {
      const levelText = this.add.text(size / 2 - 4, size / 2 - 4, `${tile.level}`, {
        fontFamily: GAME_CONFIG.typography.ui,
        fontSize: `${10 * scale}px`,
        color: '#fff',
        stroke: '#000',
        strokeThickness: 2,
      });
      levelText.setOrigin(1, 1);
      container.add(levelText);
    }

    container.setSize(size, size);

    return { container, id: tile.id };
  }

  private getTileWorldPosition(gridPos: GridPosition, isOpponent: boolean): Position {
    const startX = isOpponent ? GAME_CONFIG.opponentGridStartX : GAME_CONFIG.playerGridStartX;
    const startY = isOpponent ? GAME_CONFIG.opponentGridStartY : GAME_CONFIG.playerGridStartY;
    const scale = isOpponent ? GAME_CONFIG.opponentBoardScale : GAME_CONFIG.boardScale;
    const cellSize = GAME_CONFIG.cellSize * scale;

    return {
      x: startX + gridPos.col * cellSize + cellSize / 2,
      y: startY + gridPos.row * cellSize + cellSize / 2,
    };
  }

  private updateProjectiles(projectiles: any[]): void {
    projectiles.forEach((proj) => {
      let sprite = this.projectileSprites.get(proj.id);

      if (!sprite) {
        sprite = this.createProjectileSprite(proj);
        this.projectileSprites.set(proj.id, sprite);
      }

      sprite.setPosition(proj.position.x, proj.position.y);

      const angle = Phaser.Math.Angle.Between(
        proj.position.x, proj.position.y,
        proj.targetPosition.x, proj.targetPosition.y
      );
      sprite.setRotation(angle);
    });

    this.projectileSprites.forEach((sprite, id) => {
      if (!projectiles.find((p) => p.id === id)) {
        this.vfx.createImpactSpark(sprite.x, sprite.y, 0xffcc00);
        sprite.destroy();
        this.projectileSprites.delete(id);
      }
    });
  }

  private createProjectileSprite(proj: any): Phaser.GameObjects.Container {
    const container = this.add.container(proj.position.x, proj.position.y);
    container.setDepth(150);

    const g = this.add.graphics();

    if (proj.tileType === 'bow') {
      g.fillStyle(0xfff3a0);
      g.lineStyle(13, 0xffdd77, 0.3);
      g.lineBetween(-28, 0, 12, 0);
      g.fillRect(-24, -2, 36, 4);
      g.fillStyle(0xffee66);
      g.fillTriangle(18, 0, 6, -7, 6, 7);
    } else {
      g.fillStyle(0xffaa00);
      g.fillCircle(0, 0, 5);
      g.fillStyle(0xffff00, 0.5);
      g.fillCircle(-1, -1, 3);
    }

    container.add(g);
    return container;
  }

  private updateUI(state: any): void {
    this.bunsText.setText(`${state.player.buns}`);

    for (let i = 0; i < this.playerHearts.length; i++) {
      this.playerHearts[i].setAlpha(i < state.player.adouLives ? 1 : 0.3);
    }

    for (let i = 0; i < this.opponentHearts.length; i++) {
      this.opponentHearts[i].setAlpha(i < state.opponent.adouLives ? 1 : 0.3);
    }
  }

  private handleGameEvent(event: GameEvent): void {
    switch (event.type) {
      case 'WAVE_STARTED':
        this.waveText.setText(`第${event.waveNumber}波`);
        this.showAnnouncement(`第${event.waveNumber}波`);
        break;

      case 'ENEMY_KILLED':
        this.onEnemyKilled(event.enemyId, event.reward, event.isOpponent, event.position);
        break;

      case 'ENEMY_REACHED_END':
        this.onEnemyReachedEnd(event.isOpponent);
        break;

      case 'PROJECTILE_HIT':
        this.vfx.inkSplat(event.position.x, event.position.y);
        this.showDamageNumber(event.position.x, event.position.y, event.damage, false);
        break;

      case 'TILE_ATTACK':
        if (!event.isRanged) {
          this.showAttackEffect(event.fromPos, event.toPos, event.tileType);
        }
        if (event.level && event.level >= 3) {
          this.vfx.highLevelAttack(event.fromPos, event.toPos, event.level, event.tileType || 'sword');
        }
        break;

      case 'RECRUIT':
        if (!event.isOpponent) {
          this.createHoldingSlotTile(event.slotIndex);
        }
        break;

      case 'TILES_MERGED':
        if (!event.isOpponent) {
          this.onTilesMerged(event.tile1Id, event.tile2Id, event.newTileId);
        }
        break;

      case 'BOSS_SPAWN':
        this.showDangerWarning();
        break;

      case 'GAME_OVER':
        this.showResult(event.winner);
        break;

      case 'GENERAL_SKILL_USED':
        this.vfx.generalSkillEffect(event.generalId, this.getPathWorldPositions(event.isOpponent)[0], this.getPathWorldPositions(event.isOpponent));
        break;

      case 'GENERAL_ACTIVATED':
        if (!event.isOpponent) {
          const general = GENERALS.find((g) => g.id === event.generalId);
          if (general) {
            this.showAnnouncement(`${general.name}激活！`);
            const pathPoints = this.getPathWorldPositions(false);
            const centerX = GAME_CONFIG.playerGridStartX + (GAME_CONFIG.gridCols * GAME_CONFIG.cellSize) / 2;
            const centerY = GAME_CONFIG.playerGridStartY + (GAME_CONFIG.gridRows * GAME_CONFIG.cellSize) / 2;
            this.vfx.generalSkillEffect(event.generalId, { x: centerX, y: centerY }, pathPoints);
          }
        }
        break;
    }
  }

  private getPathWorldPositions(isOpponent: boolean): Position[] {
    const pathCells = isOpponent ? GAME_CONFIG.opponentPathCells : GAME_CONFIG.playerPathCells;
    const startX = isOpponent ? GAME_CONFIG.opponentGridStartX : GAME_CONFIG.playerGridStartX;
    const startY = isOpponent ? GAME_CONFIG.opponentGridStartY : GAME_CONFIG.playerGridStartY;
    const scale = isOpponent ? GAME_CONFIG.opponentBoardScale : GAME_CONFIG.boardScale;
    const cellSize = GAME_CONFIG.cellSize * scale;

    return pathCells.map((cell) => ({
      x: startX + cell.col * cellSize + cellSize / 2,
      y: startY + cell.row * cellSize + cellSize / 2,
    }));
  }

  private onEnemyKilled(enemyId: string, reward: number, isOpponent: boolean, position: Position): void {
    this.showDamageNumber(position.x, position.y, reward, true);
    this.vfx.inkSplat(position.x, position.y);
    if (!isOpponent) {
      const bun = this.textures.exists('ui_mantou')
        ? this.add.image(position.x, position.y, 'ui_mantou').setDisplaySize(32, 32)
        : this.add.text(position.x, position.y, '包子', { fontSize: '20px', color: '#fff4cc' });
      bun.setOrigin(0.5).setDepth(650);
      const target = this.bunsText.getWorldTransformMatrix();
      this.tweens.add({ targets: bun, x: target.tx, y: target.ty, scaleX: bun.scaleX * 0.5, scaleY: bun.scaleY * 0.5,
        duration: 650, ease: 'Cubic.easeIn', onComplete: () => bun.destroy() });
    }
  }

  private onEnemyReachedEnd(isOpponent: boolean): void {
    const target = isOpponent ? this.opponentAdou : this.playerAdou;

    this.cameras.main.shake(200, 0.01);

    this.tweens.add({
      targets: target,
      x: target.x + 5,
      duration: 50,
      yoyo: true,
      repeat: 3,
    });
  }

  private onTilesMerged(tile1Id: string, tile2Id: string, newTileId: string): void {
    const sprite1 = this.tileSprites.get(tile1Id);
    const sprite2 = this.tileSprites.get(tile2Id);

    if (sprite1 && sprite2) {
      const x = sprite2.container.x;
      const y = sprite2.container.y;

      this.vfx.levelUpGlow(x, y, 2);

      sprite1.container.destroy();
      this.tileSprites.delete(tile1Id);
    }
  }

  private showAttackEffect(from: Position, to: Position, tileType: string): void {
    const shot = this.add.circle(from.x, from.y, 7, 0xffd36a).setDepth(180);
    shot.setStrokeStyle(3, 0x76351a);
    this.tweens.add({ targets: shot, x: to.x, y: to.y, duration: 320,
      onComplete: () => shot.destroy() });
    const g = this.add.graphics();
    g.setDepth(120);

    g.lineStyle(3, 0xffaa00, 0.8);
    g.beginPath();
    g.moveTo(from.x, from.y);
    g.lineTo(to.x, to.y);
    g.strokePath();

    this.tweens.add({
      targets: g,
      alpha: 0,
      duration: 350,
      onComplete: () => g.destroy(),
    });

    this.vfx.createImpactSpark(to.x, to.y, 0xffcc00);
  }

  private showDamageNumber(x: number, y: number, amount: number, isReward: boolean): void {
    const text = this.add.text(x, y, isReward ? `+${amount}` : `-${amount}`, {
      fontFamily: GAME_CONFIG.typography.brush,
      fontSize: '26px',
      color: isReward ? '#4caf50' : '#ff4444',
      stroke: '#000',
      strokeThickness: 2,
    });
    text.setOrigin(0.5);
    text.setDepth(200);

    this.tweens.add({
      targets: text,
      y: y - 40,
      alpha: 0,
      duration: 1100,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  private showAnnouncement(message: string): void {
    const text = this.add.text(GAME_CONFIG.canvasWidth / 2, GAME_CONFIG.canvasHeight / 2, message, {
      fontFamily: GAME_CONFIG.typography.brush,
      fontSize: '36px',
      color: '#f4e8d0',
      stroke: '#8b4513',
      strokeThickness: 4,
    });
    text.setOrigin(0.5);
    text.setDepth(500);
    text.setAlpha(0);
    text.setScale(0.5);

    this.tweens.add({
      targets: text,
      alpha: 1,
      scale: 1,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: text,
          alpha: 0,
          y: text.y - 50,
          delay: 800,
          duration: 400,
          onComplete: () => text.destroy(),
        });
      },
    });
  }

  private showDangerWarning(): void {
    const warning = this.add.text(GAME_CONFIG.canvasWidth / 2, GAME_CONFIG.canvasHeight / 2, '⚠ BOSS来袭 ⚠', {
      fontFamily: GAME_CONFIG.typography.brush,
      fontSize: '32px',
      color: '#ff4444',
      stroke: '#000',
      strokeThickness: 4,
    });
    warning.setOrigin(0.5);
    warning.setDepth(500);

    this.tweens.add({
      targets: warning,
      alpha: 0,
      scale: 1.5,
      duration: 1000,
      onComplete: () => warning.destroy(),
    });

    this.cameras.main.shake(500, 0.005);
  }

  private showResult(winner: string): void {
    this.phase = 'result';

    const isVictory = winner === 'player';

    const overlay = this.add.rectangle(
      GAME_CONFIG.canvasWidth / 2,
      GAME_CONFIG.canvasHeight / 2,
      GAME_CONFIG.canvasWidth,
      GAME_CONFIG.canvasHeight,
      0x000000,
      0.85
    );
    overlay.setDepth(900);

    const resultText = this.add.text(
      GAME_CONFIG.canvasWidth / 2,
      GAME_CONFIG.canvasHeight * 0.35,
      isVictory ? '胜利！' : '失败...',
      {
        fontFamily: GAME_CONFIG.typography.brush,
        fontSize: '48px',
        color: isVictory ? '#ffd700' : '#888',
        stroke: '#000',
        strokeThickness: 4,
      }
    );
    resultText.setOrigin(0.5);
    resultText.setDepth(901);

    const restartBtn = this.add.container(GAME_CONFIG.canvasWidth / 2, GAME_CONFIG.canvasHeight * 0.55);
    restartBtn.setDepth(901);

    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x8b4513);
    btnBg.fillRoundedRect(-70, -25, 140, 50, 8);
    btnBg.lineStyle(2, 0xd4a537);
    btnBg.strokeRoundedRect(-70, -25, 140, 50, 8);

    const btnText = this.add.text(0, 0, '再来一局', {
      fontFamily: GAME_CONFIG.typography.brush,
      fontSize: '22px',
      color: '#f4e8d0',
    });
    btnText.setOrigin(0.5);

    restartBtn.add([btnBg, btnText]);
    restartBtn.setSize(140, 50);
    restartBtn.setInteractive({ useHandCursor: true });
    restartBtn.on('pointerdown', () => {
      this.scene.restart();
    });
  }

  private onRecruitClicked(): void {
    if (this.phase !== 'playing') return;

    const tile = this.engine.recruit(false);
    if (tile) {
      this.bunsText.setText(`${this.engine.getState().player.buns}`);
    }
  }

  private createHoldingSlotTile(slotIndex: number): void {
    const state = this.engine.getState();
    const tile = state.player.holdingSlots[slotIndex];
    if (!tile) return;

    const container = this.holdingSlotContainers[slotIndex];
    if (!container) return;

    const sprite = this.createTileSprite(tile, false);
    sprite.container.setPosition(container.x, container.y);
    sprite.slotIndex = slotIndex;
    this.tileSprites.set(tile.id, sprite);

    sprite.container.setScale(0);
    this.tweens.add({
      targets: sprite.container,
      scale: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.phase !== 'playing') return;

    const state = this.engine.getState();

    for (let i = 0; i < this.holdingSlotContainers.length; i++) {
      const slotContainer = this.holdingSlotContainers[i];
      const tile = state.player.holdingSlots[i];

      if (!tile) continue;

      const sprite = this.tileSprites.get(tile.id);
      if (!sprite) continue;

      const bounds = sprite.container.getBounds();
      if (bounds.contains(pointer.x, pointer.y)) {
        this.draggingTile = sprite;
        this.dragOrigin = { x: sprite.container.x, y: sprite.container.y };
        this.tweens.killTweensOf(sprite.container);
        sprite.container.setDepth(600).setScale(1.18);
        return;
      }
    }

    for (const [id, sprite] of this.tileSprites) {
      const tile = state.player.tiles.find((t) => t.id === id);
      if (!tile || !tile.position) continue;

      const bounds = sprite.container.getBounds();
      if (bounds.contains(pointer.x, pointer.y)) {
        this.draggingTile = sprite;
        this.dragOrigin = { x: sprite.container.x, y: sprite.container.y };
        this.tweens.killTweensOf(sprite.container);
        sprite.container.setDepth(600).setScale(1.18);
        return;
      }
    }
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.draggingTile || !this.dragOrigin) return;

    this.draggingTile.container.setPosition(pointer.x, pointer.y);

    this.dragLine.clear();
    this.dragLine.lineStyle(2, 0xd4a537, 0.6);

    const dashLength = 8;
    const gapLength = 6;
    const dx = pointer.x - this.dragOrigin.x;
    const dy = pointer.y - this.dragOrigin.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    let drawn = 0;
    while (drawn < dist) {
      const startX = this.dragOrigin.x + Math.cos(angle) * drawn;
      const startY = this.dragOrigin.y + Math.sin(angle) * drawn;
      const endDist = Math.min(drawn + dashLength, dist);
      const endX = this.dragOrigin.x + Math.cos(angle) * endDist;
      const endY = this.dragOrigin.y + Math.sin(angle) * endDist;

      this.dragLine.beginPath();
      this.dragLine.moveTo(startX, startY);
      this.dragLine.lineTo(endX, endY);
      this.dragLine.strokePath();

      drawn += dashLength + gapLength;
    }

    this.clearHighlights();
    this.highlightValidCells(pointer);
  }

  private highlightValidCells(pointer: Phaser.Input.Pointer): void {
    const state = this.engine.getState();
    const draggingTile = state.player.tiles.find((t) => t.id === this.draggingTile?.id) ||
      state.player.holdingSlots.find((t) => t?.id === this.draggingTile?.id);

    if (!draggingTile) return;

    this.playerCells.forEach((cellContainer) => {
      const col = cellContainer.getData('col');
      const row = cellContainer.getData('row');
      const isPath = cellContainer.getData('isPath');

      if (isPath) return;

      const cell = state.player.cells.find((c) => c.position.col === col && c.position.row === row);
      if (!cell || !cell.isUnlocked) return;

      const cellX = GAME_CONFIG.playerGridStartX + col * GAME_CONFIG.cellSize;
      const cellY = GAME_CONFIG.playerGridStartY + row * GAME_CONFIG.cellSize;
      const cellSize = GAME_CONFIG.cellSize;

      const highlight = this.add.graphics();
      highlight.setDepth(110);
      const hovered = pointer.x >= cellX && pointer.x < cellX + cellSize && pointer.y >= cellY && pointer.y < cellY + cellSize;
      highlight.setAlpha(hovered ? 1 : 0.35);

      if (cell.tileId) {
        const existingTile = state.player.tiles.find((t) => t.id === cell.tileId);
        if (existingTile && existingTile.id !== draggingTile.id && existingTile.char === draggingTile.char && existingTile.type === draggingTile.type && existingTile.level === draggingTile.level && existingTile.level < 5) {
          highlight.fillStyle(0x4caf50, 0.4);
          highlight.fillRect(cellX, cellY, cellSize, cellSize);
          highlight.lineStyle(3, 0x4caf50);
          highlight.strokeRect(cellX, cellY, cellSize, cellSize);
        }
      } else {
        highlight.fillStyle(0xffd700, 0.2);
        highlight.fillRect(cellX, cellY, cellSize, cellSize);
        highlight.lineStyle(2, 0xffd700, 0.6);
        highlight.strokeRect(cellX, cellY, cellSize, cellSize);
      }

      this.highlightedCells.push(highlight);
    });
  }

  private clearHighlights(): void {
    this.highlightedCells.forEach((h) => h.destroy());
    this.highlightedCells = [];
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (!this.draggingTile || !this.dragOrigin) return;

    this.draggingTile.container.setScale(1).setDepth(100);
    this.dragLine.clear();
    this.clearHighlights();

    const gridPos = this.screenToGrid(pointer.x, pointer.y);
    const state = this.engine.getState();

    if (gridPos) {
      const cell = state.player.cells.find(
        (c) => c.position.col === gridPos.col && c.position.row === gridPos.row
      );

      if (cell && cell.isUnlocked && !cell.isPath) {
        const existingTile = cell.tileId ? state.player.tiles.find((t) => t.id === cell.tileId) : null;
        const draggingTileData = state.player.tiles.find((t) => t.id === this.draggingTile!.id) ||
          state.player.holdingSlots.find((t) => t?.id === this.draggingTile!.id);

        if (existingTile && draggingTileData &&
          existingTile.char === draggingTileData.char &&
          existingTile.type === draggingTileData.type &&
          existingTile.level === draggingTileData.level &&
          existingTile.level < 5 &&
          existingTile.id !== draggingTileData.id) {

          const success = this.engine.mergeTiles(draggingTileData.id, existingTile.id, false);
          if (success) {
            this.draggingTile.container.destroy();
            this.tileSprites.delete(this.draggingTile.id);
            this.draggingTile = null;
            this.dragOrigin = null;
            return;
          }
        }

        if (!cell.tileId) {
          const success = this.engine.placeTile(this.draggingTile.id, gridPos, false);
          if (success) {
            this.draggingTile.container.setDepth(100);
            this.draggingTile = null;
            this.dragOrigin = null;
            return;
          }
        }
      }
    }

    this.tweens.add({
      targets: this.draggingTile.container,
      x: this.dragOrigin.x,
      y: this.dragOrigin.y,
      duration: 150,
      ease: 'Back.easeOut',
      onComplete: () => {
        if (this.draggingTile) {
          this.draggingTile.container.setDepth(100);
        }
      },
    });

    this.draggingTile = null;
    this.dragOrigin = null;
  }

  private screenToGrid(x: number, y: number): GridPosition | null {
    const { playerGridStartX, playerGridStartY, cellSize, gridCols, gridRows } = GAME_CONFIG;

    const col = Math.floor((x - playerGridStartX) / cellSize);
    const row = Math.floor((y - playerGridStartY) / cellSize);

    if (col >= 0 && col < gridCols && row >= 0 && row < gridRows) {
      return { col, row };
    }

    return null;
  }
}

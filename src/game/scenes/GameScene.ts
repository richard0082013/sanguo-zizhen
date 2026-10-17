import Phaser from 'phaser';
import { BattleEngine } from '../logic/BattleEngine';
import { GAME_CONFIG } from '../config/gameConfig';
import { TILE_CONFIGS, SHOVEL_CONFIG, MAX_TILE_LEVEL } from '../config/tiles';
import { GENERALS } from '../config/generals';
import { VFXManager } from '../vfx/VFXManager';
import type { TileState, EnemyState, GridPosition, GameEvent, Position } from '../logic/types';

interface TileSprite {
  container: Phaser.GameObjects.Container;
  id: string;
  slotIndex?: number;
}

interface EnemySprite {
  container: Phaser.GameObjects.Container;
  healthBar: Phaser.GameObjects.Rectangle;
  id: string;
}

type GamePhase = 'start' | 'playing' | 'result';

const CURRENT_MAP = GAME_CONFIG.maps.desert;

export class GameScene extends Phaser.Scene {
  private engine!: BattleEngine;
  private vfx!: VFXManager;
  private phase: GamePhase = 'start';

  private playerCells: Phaser.GameObjects.Rectangle[] = [];
  private opponentCells: Phaser.GameObjects.Rectangle[] = [];

  private tileSprites: Map<string, TileSprite> = new Map();
  private opponentTileSprites: Map<string, TileSprite> = new Map();
  private enemySprites: Map<string, EnemySprite> = new Map();
  private opponentEnemySprites: Map<string, EnemySprite> = new Map();
  private projectileSprites: Map<string, Phaser.GameObjects.Container> = new Map();

  private holdingSlotContainers: Phaser.GameObjects.Container[] = [];
  private playerAdou!: Phaser.GameObjects.Container;
  private opponentAdou!: Phaser.GameObjects.Container;
  private playerHearts: Phaser.GameObjects.Text[] = [];
  private opponentHearts: Phaser.GameObjects.Text[] = [];

  private waveText!: Phaser.GameObjects.Text;
  private mapNameText!: Phaser.GameObjects.Text;
  private bunsText!: Phaser.GameObjects.Text;
  private recruitButton!: Phaser.GameObjects.Container;

  private startScreen!: Phaser.GameObjects.Container;
  private resultScreen!: Phaser.GameObjects.Container;
  private dangerWarning!: Phaser.GameObjects.Text;

  private draggingTile: TileSprite | null = null;
  private dragOrigin: Position | null = null;
  private dragLine!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.vfx = new VFXManager({ scene: this });

    this.createBackground();
    this.createStartScreen();
    this.createGameElements();
    this.createResultScreen();

    this.dragLine = this.add.graphics();
    this.dragLine.setDepth(150);

    this.showStartScreen();

    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
  }

  private createBackground(): void {
    const g = this.add.graphics();

    g.fillStyle(Phaser.Display.Color.HexStringToColor(CURRENT_MAP.bgColor).color);
    g.fillRect(0, 0, GAME_CONFIG.canvasWidth, GAME_CONFIG.canvasHeight);

    for (let y = 0; y < GAME_CONFIG.canvasHeight; y += 8) {
      g.fillStyle(Phaser.Display.Color.HexStringToColor(CURRENT_MAP.bgPattern).color, 0.3);
      g.fillRect(0, y, GAME_CONFIG.canvasWidth, 4);
    }

    g.fillStyle(0x1a1810, 1);
    g.fillRect(0, GAME_CONFIG.canvasHeight - 130, GAME_CONFIG.canvasWidth, 130);
  }

  private createStartScreen(): void {
    this.startScreen = this.add.container(0, 0);
    this.startScreen.setDepth(1000);

    const overlay = this.add.rectangle(
      GAME_CONFIG.canvasWidth / 2,
      GAME_CONFIG.canvasHeight / 2,
      GAME_CONFIG.canvasWidth,
      GAME_CONFIG.canvasHeight,
      0x000000,
      0.8
    );

    const title = this.add.text(GAME_CONFIG.canvasWidth / 2, 280, '三国字阵', {
      fontFamily: GAME_CONFIG.typography.brush,
      fontSize: '52px',
      color: '#f4e8d0',
      stroke: '#1a1a1a',
      strokeThickness: 6,
    });
    title.setOrigin(0.5);

    const subtitle = this.add.text(GAME_CONFIG.canvasWidth / 2, 350, '文字合成塔防', {
      fontFamily: GAME_CONFIG.typography.ui,
      fontSize: '18px',
      color: '#a09080',
    });
    subtitle.setOrigin(0.5);

    const startBtn = this.createButton(GAME_CONFIG.canvasWidth / 2, 480, '开始游戏', () => {
      this.startGame();
    });

    this.startScreen.add([overlay, title, subtitle, startBtn]);
  }

  private createButton(x: number, y: number, text: string, callback: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(0x8b4513, 1);
    bg.fillRoundedRect(-70, -25, 140, 50, 8);
    bg.lineStyle(3, 0x5c2e0a);
    bg.strokeRoundedRect(-70, -25, 140, 50, 8);

    const label = this.add.text(0, 0, text, {
      fontFamily: GAME_CONFIG.typography.ui,
      fontSize: '20px',
      color: '#f4e8d0',
    });
    label.setOrigin(0.5);

    container.add([bg, label]);
    container.setSize(140, 50);
    container.setInteractive();

    container.on('pointerdown', () => {
      this.tweens.add({
        targets: container,
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 50,
        yoyo: true,
        onComplete: callback,
      });
    });

    return container;
  }

  private createGameElements(): void {
    this.createOpponentBoard();
    this.createRiverDivider();
    this.createPlayerBoard();
    this.createHUD();
    this.createDangerWarning();
  }

  private createOpponentBoard(): void {
    const { opponentGridStartX, opponentGridStartY, cellSize, opponentBoardScale, gridCols, gridRows, opponentPathCells } = GAME_CONFIG;
    const scaledSize = cellSize * opponentBoardScale;
    const pathSet = new Set(opponentPathCells.map((p) => `${p.col},${p.row}`));

    this.opponentAdou = this.createAdou(GAME_CONFIG.opponentAdouX, GAME_CONFIG.opponentAdouY, true);

    this.opponentHearts = [];
    for (let i = 0; i < GAME_CONFIG.adouLives; i++) {
      const heart = this.add.text(GAME_CONFIG.opponentAdouX - 10 + i * 14, GAME_CONFIG.opponentAdouY - 30, '❤', {
        fontSize: '12px',
        color: '#e53935',
      });
      heart.setOrigin(0.5);
      this.opponentHearts.push(heart);
    }

    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        const x = opponentGridStartX + col * scaledSize;
        const y = opponentGridStartY + row * scaledSize;
        const isPath = pathSet.has(`${col},${row}`);

        const cell = this.add.rectangle(
          x + scaledSize / 2,
          y + scaledSize / 2,
          scaledSize - 1,
          scaledSize - 1,
          Phaser.Display.Color.HexStringToColor(isPath ? CURRENT_MAP.pathColor : CURRENT_MAP.cellColor).color
        );

        if (!isPath) {
          cell.setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(CURRENT_MAP.cellBorder).color);
        }

        cell.setData('cellPos', { col, row });
        cell.setData('isOpponent', true);
        cell.setData('isPath', isPath);
        this.opponentCells.push(cell);
      }
    }
  }

  private createRiverDivider(): void {
    const y = 295;
    const g = this.add.graphics();

    g.fillStyle(0x4a6a8a, 0.6);
    g.fillRect(0, y - 8, GAME_CONFIG.canvasWidth, 16);

    g.lineStyle(2, 0x6a8aaa, 0.8);
    g.lineBetween(0, y - 8, GAME_CONFIG.canvasWidth, y - 8);
    g.lineBetween(0, y + 8, GAME_CONFIG.canvasWidth, y + 8);

    for (let x = 0; x < GAME_CONFIG.canvasWidth; x += 30) {
      g.lineStyle(1, 0x8aaaca, 0.4);
      g.lineBetween(x, y - 5, x + 15, y + 5);
    }
  }

  private createPlayerBoard(): void {
    const { playerGridStartX, playerGridStartY, cellSize, gridCols, gridRows, playerPathCells } = GAME_CONFIG;
    const pathSet = new Set(playerPathCells.map((p) => `${p.col},${p.row}`));

    this.playerAdou = this.createAdou(GAME_CONFIG.playerAdouX, GAME_CONFIG.playerAdouY, false);

    this.playerHearts = [];
    for (let i = 0; i < GAME_CONFIG.adouLives; i++) {
      const heart = this.add.text(GAME_CONFIG.playerAdouX - 15 + i * 18, GAME_CONFIG.playerAdouY - 45, '❤', {
        fontSize: '16px',
        color: '#e53935',
      });
      heart.setOrigin(0.5);
      this.playerHearts.push(heart);
    }

    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        const x = playerGridStartX + col * cellSize;
        const y = playerGridStartY + row * cellSize;
        const isPath = pathSet.has(`${col},${row}`);

        const cell = this.add.rectangle(
          x + cellSize / 2,
          y + cellSize / 2,
          cellSize - 2,
          cellSize - 2,
          Phaser.Display.Color.HexStringToColor(isPath ? CURRENT_MAP.pathColor : CURRENT_MAP.cellColor).color
        );

        if (!isPath) {
          cell.setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(CURRENT_MAP.cellBorder).color);
        }

        cell.setData('cellPos', { col, row });
        cell.setData('isOpponent', false);
        cell.setData('isPath', isPath);
        this.playerCells.push(cell);
      }
    }
  }

  private createAdou(x: number, y: number, isSmall: boolean): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const size = isSmall ? 35 : 50;

    const basket = this.add.graphics();
    basket.fillStyle(0xc9a227, 1);
    basket.fillRoundedRect(-size / 2, -size / 2, size, size, 6);
    basket.lineStyle(2, 0x8a7017);
    basket.strokeRoundedRect(-size / 2, -size / 2, size, size, 6);

    const text = this.add.text(0, 0, '斗', {
      fontFamily: GAME_CONFIG.typography.brush,
      fontSize: isSmall ? '20px' : '28px',
      color: '#8b0000',
    });
    text.setOrigin(0.5);

    container.add([basket, text]);
    return container;
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

  private createHUD(): void {
    this.mapNameText = this.add.text(GAME_CONFIG.canvasWidth / 2, 20, CURRENT_MAP.name, {
      fontFamily: GAME_CONFIG.typography.brush,
      fontSize: '22px',
      color: '#f4e8d0',
      stroke: '#1a1a1a',
      strokeThickness: 3,
    });
    this.mapNameText.setOrigin(0.5);

    this.waveText = this.add.text(GAME_CONFIG.canvasWidth / 2, 45, '第1波', {
      fontFamily: GAME_CONFIG.typography.ui,
      fontSize: '14px',
      color: '#d4a537',
    });
    this.waveText.setOrigin(0.5);

    const campIcon = this.add.graphics();
    campIcon.fillStyle(0x5c4a3a, 1);
    campIcon.fillRoundedRect(8, GAME_CONFIG.canvasHeight - 118, 40, 40, 6);
    campIcon.lineStyle(2, 0x3a2a1a);
    campIcon.strokeRoundedRect(8, GAME_CONFIG.canvasHeight - 118, 40, 40, 6);

    const campText = this.add.text(28, GAME_CONFIG.canvasHeight - 98, '营', {
      fontFamily: GAME_CONFIG.typography.brush,
      fontSize: '24px',
      color: '#f4e8d0',
    });
    campText.setOrigin(0.5);

    const slotStartX = 58;
    const slotY = GAME_CONFIG.canvasHeight - 98;
    const slotWidth = 48;
    const slotGap = 4;

    for (let i = 0; i < GAME_CONFIG.holdingSlots; i++) {
      const slotX = slotStartX + i * (slotWidth + slotGap);

      const slotBg = this.add.graphics();
      slotBg.fillStyle(0x3a3028, 1);
      slotBg.fillRoundedRect(slotX, slotY - 24, slotWidth, slotWidth, 4);
      slotBg.lineStyle(1, 0x5a5048);
      slotBg.strokeRoundedRect(slotX, slotY - 24, slotWidth, slotWidth, 4);

      const container = this.add.container(slotX + slotWidth / 2, slotY);
      container.setData('slotIndex', i);
      this.holdingSlotContainers.push(container);
    }

    this.recruitButton = this.add.container(GAME_CONFIG.canvasWidth / 2, GAME_CONFIG.canvasHeight - 35);

    const recruitBg = this.add.graphics();
    recruitBg.fillStyle(0x8b4513, 1);
    recruitBg.fillRoundedRect(-55, -22, 110, 44, 8);
    recruitBg.lineStyle(2, 0x5c2e0a);
    recruitBg.strokeRoundedRect(-55, -22, 110, 44, 8);

    const bunIcon = this.add.text(-35, 0, '🍞', { fontSize: '18px' });
    bunIcon.setOrigin(0.5);

    const recruitLabel = this.add.text(0, -5, '征兵', {
      fontFamily: GAME_CONFIG.typography.ui,
      fontSize: '16px',
      color: '#f4e8d0',
    });
    recruitLabel.setOrigin(0.5);

    this.bunsText = this.add.text(0, 12, '10', {
      fontFamily: GAME_CONFIG.typography.ui,
      fontSize: '12px',
      color: '#d4a537',
    });
    this.bunsText.setOrigin(0.5);

    this.recruitButton.add([recruitBg, bunIcon, recruitLabel, this.bunsText]);
    this.recruitButton.setSize(110, 44);
    this.recruitButton.setInteractive();
    this.recruitButton.on('pointerdown', () => this.onRecruitClick());

    const bunsDisplay = this.add.container(GAME_CONFIG.canvasWidth - 50, GAME_CONFIG.canvasHeight - 35);
    const bunsBg = this.add.graphics();
    bunsBg.fillStyle(0x3a3028, 0.8);
    bunsBg.fillRoundedRect(-30, -15, 60, 30, 6);

    const bunsIcon = this.add.text(-15, 0, '🍞', { fontSize: '14px' });
    bunsIcon.setOrigin(0.5);

    this.bunsText = this.add.text(10, 0, '30', {
      fontFamily: GAME_CONFIG.typography.ui,
      fontSize: '14px',
      color: '#d4a537',
    });
    this.bunsText.setOrigin(0.5);

    bunsDisplay.add([bunsBg, bunsIcon, this.bunsText]);
  }

  private createDangerWarning(): void {
    this.dangerWarning = this.add.text(GAME_CONFIG.canvasWidth / 2, 400, '危', {
      fontFamily: GAME_CONFIG.typography.brush,
      fontSize: '80px',
      color: '#ff0000',
      stroke: '#000000',
      strokeThickness: 6,
    });
    this.dangerWarning.setOrigin(0.5);
    this.dangerWarning.setAlpha(0);
    this.dangerWarning.setDepth(500);
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

    const resultTitle = this.add.text(GAME_CONFIG.canvasWidth / 2, 350, '', {
      fontFamily: GAME_CONFIG.typography.brush,
      fontSize: '48px',
      color: '#f4e8d0',
      stroke: '#1a1a1a',
      strokeThickness: 4,
    });
    resultTitle.setOrigin(0.5);
    resultTitle.setData('type', 'title');

    const restartBtn = this.createButton(GAME_CONFIG.canvasWidth / 2, 480, '再来一局', () => {
      this.scene.restart();
    });

    this.resultScreen.add([overlay, resultTitle, restartBtn]);
  }

  private showStartScreen(): void {
    this.phase = 'start';
    this.startScreen.setVisible(true);
  }

  private startGame(): void {
    const seed = Date.now();
    this.engine = new BattleEngine(seed);
    this.engine.addEventListener(this.handleGameEvent.bind(this));

    this.phase = 'playing';
    this.startScreen.setVisible(false);

    this.tileSprites.clear();
    this.opponentTileSprites.clear();
    this.enemySprites.clear();
    this.opponentEnemySprites.clear();
    this.projectileSprites.clear();

    this.time.delayedCall(500, () => {
      this.engine.startNextWave();
    });
  }

  private handleGameEvent(event: GameEvent): void {
    switch (event.type) {
      case 'WAVE_STARTED':
        this.waveText.setText(`第${event.waveNumber}波`);
        break;

      case 'ENEMY_KILLED':
        this.onEnemyKilled(event.enemyId, event.reward, event.isOpponent, event.position);
        break;

      case 'ENEMY_REACHED_END':
        this.onEnemyReachedEnd(event.isOpponent);
        break;

      case 'PROJECTILE_HIT':
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
      duration: 150,
      ease: 'Back.easeOut',
    });
  }

  private createTileSprite(tile: TileState, isOpponent: boolean): TileSprite {
    const size = isOpponent ? 32 : 42;

    const container = this.add.container(0, 0);
    container.setDepth(100);

    const levelColor = GAME_CONFIG.levelColors[tile.level as keyof typeof GAME_CONFIG.levelColors] || GAME_CONFIG.levelColors[1];
    const borderColor = GAME_CONFIG.levelBorderColors[tile.level as keyof typeof GAME_CONFIG.levelBorderColors] || GAME_CONFIG.levelBorderColors[1];

    const shadow = this.add.rectangle(2, 2, size, size, 0x000000, 0.3);

    const bg = this.add.rectangle(0, 0, size, size, Phaser.Display.Color.HexStringToColor(levelColor).color);
    bg.setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(borderColor).color);

    let textColor = '#1a1a1a';
    if (tile.type === 'general') {
      const general = GENERALS.find((g) => g.chars.includes(tile.char));
      if (general) {
        textColor = GAME_CONFIG.colors[general.faction] || '#1a1a1a';
      }
    }

    const text = this.add.text(0, 0, tile.char, {
      fontFamily: GAME_CONFIG.typography.brush,
      fontSize: isOpponent ? '18px' : '24px',
      color: textColor,
    });
    text.setOrigin(0.5);

    const levelBadge = this.add.text(size / 2 - 6, -size / 2 + 6, `${tile.level}`, {
      fontFamily: GAME_CONFIG.typography.ui,
      fontSize: '10px',
      color: '#1a1a1a',
    });
    levelBadge.setOrigin(0.5);

    container.add([shadow, bg, text, levelBadge]);
    container.setSize(size, size);
    container.setInteractive();
    container.setData('tileId', tile.id);

    return { container, id: tile.id };
  }

  private onEnemyKilled(enemyId: string, reward: number, isOpponent: boolean, position: Position): void {
    const sprites = isOpponent ? this.opponentEnemySprites : this.enemySprites;
    const sprite = sprites.get(enemyId);

    if (sprite) {
      this.createDeathPuff(sprite.container.x, sprite.container.y);
      this.flyBunToCounter(sprite.container.x, sprite.container.y, isOpponent);

      sprite.container.destroy();
      sprites.delete(enemyId);
    }
  }

  private createDeathPuff(x: number, y: number): void {
    const puff = this.add.graphics();
    puff.fillStyle(0x1a1a1a, 0.8);
    puff.fillCircle(x, y, 15);
    puff.setDepth(200);

    this.tweens.add({
      targets: puff,
      alpha: 0,
      scale: 2,
      duration: GAME_CONFIG.animation.deathPuffDuration,
      onComplete: () => puff.destroy(),
    });
  }

  private flyBunToCounter(fromX: number, fromY: number, isOpponent: boolean): void {
    if (isOpponent) return;

    const bun = this.add.text(fromX, fromY, '🍞', { fontSize: '16px' });
    bun.setOrigin(0.5);
    bun.setDepth(300);

    const targetX = GAME_CONFIG.canvasWidth - 50;
    const targetY = GAME_CONFIG.canvasHeight - 35;

    this.tweens.add({
      targets: bun,
      x: targetX,
      y: targetY,
      scale: 0.5,
      duration: GAME_CONFIG.animation.bunFlyDuration,
      ease: 'Quad.easeIn',
      onComplete: () => bun.destroy(),
    });
  }

  private onEnemyReachedEnd(isOpponent: boolean): void {
    const adou = isOpponent ? this.opponentAdou : this.playerAdou;
    const hearts = isOpponent ? this.opponentHearts : this.playerHearts;

    this.tweens.add({
      targets: adou,
      x: adou.x + 8,
      duration: 40,
      yoyo: true,
      repeat: 4,
    });

    const state = this.engine.getState();
    const lives = isOpponent ? state.opponent.adouLives : state.player.adouLives;

    hearts.forEach((heart, i) => {
      if (i >= lives) {
        heart.setText('♡');
        heart.setColor('#4a4a4a');
      }
    });

    if (!isOpponent) {
      this.cameras.main.shake(150, 0.01);
    }
  }

  private showDamageNumber(x: number, y: number, damage: number, isCrit: boolean): void {
    const color = isCrit ? GAME_CONFIG.colors.damageCrit : GAME_CONFIG.colors.damageNormal;
    const text = this.add.text(x, y, `-${damage}`, {
      fontFamily: GAME_CONFIG.typography.ui,
      fontSize: isCrit ? '18px' : '14px',
      color: color,
      stroke: '#ffffff',
      strokeThickness: 2,
    });
    text.setOrigin(0.5);
    text.setDepth(400);

    this.tweens.add({
      targets: text,
      y: y - 30,
      alpha: 0,
      duration: GAME_CONFIG.animation.damageNumberDuration,
      ease: 'Quad.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  private showAttackEffect(from: Position, to: Position, tileType: string): void {
    const g = this.add.graphics();
    g.setDepth(150);

    if (tileType === 'sword') {
      g.lineStyle(3, 0x333333, 0.8);
    } else if (tileType === 'spear') {
      g.lineStyle(2, 0x666666, 0.8);
    } else {
      g.lineStyle(2, 0x444444, 0.6);
    }

    g.lineBetween(from.x, from.y, to.x, to.y);

    this.tweens.add({
      targets: g,
      alpha: 0,
      duration: 100,
      onComplete: () => g.destroy(),
    });
  }

  private onTilesMerged(tile1Id: string, tile2Id: string, newTileId: string): void {
    const sprite1 = this.tileSprites.get(tile1Id);
    const sprite2 = this.tileSprites.get(tile2Id);

    const targetPos = sprite1?.container ? { x: sprite1.container.x, y: sprite1.container.y } : null;

    [sprite1, sprite2].forEach((s) => {
      if (s) {
        s.container.destroy();
        this.tileSprites.delete(s.id);
      }
    });

    const state = this.engine.getState();
    const newTile = state.player.tiles.find((t) => t.id === newTileId);

    if (newTile && targetPos) {
      const sprite = this.createTileSprite(newTile, false);

      if (newTile.position) {
        const pos = this.engine.gridToWorld(newTile.position, false);
        sprite.container.setPosition(pos.x, pos.y);
      } else {
        sprite.container.setPosition(targetPos.x, targetPos.y);
      }

      this.tileSprites.set(newTileId, sprite);

      sprite.container.setScale(0);
      this.tweens.add({
        targets: sprite.container,
        scale: 1,
        duration: 200,
        ease: 'Back.easeOut',
      });

      this.createMergeFlash(sprite.container.x, sprite.container.y);
    }
  }

  private createMergeFlash(x: number, y: number): void {
    const flash = this.add.graphics();
    flash.fillStyle(0xffffff, 0.8);
    flash.fillCircle(x, y, 30);
    flash.setDepth(200);

    this.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 1.5,
      duration: 200,
      onComplete: () => flash.destroy(),
    });
  }

  private showDangerWarning(): void {
    this.dangerWarning.setAlpha(1);
    this.tweens.add({
      targets: this.dangerWarning,
      alpha: 0,
      duration: 200,
      yoyo: true,
      repeat: 3,
    });
  }

  private showAnnouncement(text: string): void {
    const announcement = this.add.text(GAME_CONFIG.canvasWidth / 2, 400, text, {
      fontFamily: GAME_CONFIG.typography.brush,
      fontSize: '28px',
      color: '#f4e8d0',
      stroke: '#1a1a1a',
      strokeThickness: 4,
    });
    announcement.setOrigin(0.5);
    announcement.setDepth(500);

    this.tweens.add({
      targets: announcement,
      y: 350,
      alpha: 0,
      duration: 1500,
      ease: 'Quad.easeOut',
      onComplete: () => announcement.destroy(),
    });
  }

  private showResult(winner: 'player' | 'opponent' | 'draw'): void {
    this.phase = 'result';

    const title = this.resultScreen.list.find((obj) => obj.getData('type') === 'title') as Phaser.GameObjects.Text;

    if (winner === 'player') {
      title.setText('胜利！');
      title.setColor('#4caf50');
    } else if (winner === 'opponent') {
      title.setText('失败');
      title.setColor('#f44336');
    } else {
      title.setText('平局');
      title.setColor('#ff9800');
    }

    this.resultScreen.setVisible(true);
  }

  private onRecruitClick(): void {
    if (this.phase !== 'playing') return;

    const tile = this.engine.recruit(false);
    if (!tile) {
      this.showAnnouncement('馒头不足或槽位已满');
    }
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.phase !== 'playing') return;

    for (const [id, sprite] of this.tileSprites) {
      const bounds = sprite.container.getBounds();
      if (bounds.contains(pointer.x, pointer.y)) {
        this.draggingTile = sprite;
        this.dragOrigin = { x: sprite.container.x, y: sprite.container.y };
        sprite.container.setDepth(200);
        return;
      }
    }
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.draggingTile || !this.dragOrigin) return;

    this.draggingTile.container.setPosition(pointer.x, pointer.y);

    this.dragLine.clear();
    this.dragLine.lineStyle(2, 0x888888, 0.5);
    this.dragLine.lineBetween(this.dragOrigin.x, this.dragOrigin.y, pointer.x, pointer.y);
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (!this.draggingTile || !this.dragOrigin) return;

    this.dragLine.clear();

    const state = this.engine.getState();
    const draggedTileState = state.player.tiles.find((t) => t.id === this.draggingTile!.id);

    let handled = false;

    for (const [id, sprite] of this.tileSprites) {
      if (id === this.draggingTile.id) continue;

      const bounds = sprite.container.getBounds();
      if (bounds.contains(pointer.x, pointer.y)) {
        const targetTileState = state.player.tiles.find((t) => t.id === id);
        if (
          draggedTileState &&
          targetTileState &&
          draggedTileState.type === targetTileState.type &&
          draggedTileState.char === targetTileState.char &&
          draggedTileState.level === targetTileState.level &&
          draggedTileState.level < MAX_TILE_LEVEL
        ) {
          this.engine.mergeTiles(draggedTileState.id, targetTileState.id, false);
          handled = true;
        }
        break;
      }
    }

    if (!handled) {
      for (const cell of this.playerCells) {
        if (cell.getData('isPath')) continue;

        const bounds = cell.getBounds();
        if (bounds.contains(pointer.x, pointer.y)) {
          const pos = cell.getData('cellPos') as GridPosition;
          const cellState = state.player.cells.find(
            (c) => c.position.col === pos.col && c.position.row === pos.row
          );

          if (cellState && !cellState.tileId && !cellState.isPath && draggedTileState) {
            const success = this.engine.placeTile(draggedTileState.id, pos, false);
            if (success) {
              const worldPos = this.engine.gridToWorld(pos, false);

              if (this.draggingTile.slotIndex !== undefined) {
                const slotIdx = state.player.holdingSlots.findIndex((s) => s === null);
              }

              this.tweens.add({
                targets: this.draggingTile.container,
                x: worldPos.x,
                y: worldPos.y,
                duration: GAME_CONFIG.animation.tileSnapDuration,
                ease: 'Back.easeOut',
              });

              this.draggingTile.slotIndex = undefined;
              handled = true;
            }
          }
          break;
        }
      }
    }

    if (!handled) {
      this.tweens.add({
        targets: this.draggingTile.container,
        x: this.dragOrigin.x,
        y: this.dragOrigin.y,
        duration: 150,
        ease: 'Quad.easeOut',
      });
    }

    this.draggingTile.container.setDepth(100);
    this.draggingTile = null;
    this.dragOrigin = null;
  }

  update(_time: number, delta: number): void {
    if (this.phase !== 'playing' || !this.engine) return;

    this.engine.update(delta);
    this.updateUI();
    this.updateEnemySprites(false);
    this.updateEnemySprites(true);
    this.updateProjectileSprites();
    this.updateOpponentTiles();
  }

  private updateUI(): void {
    const state = this.engine.getState();
    this.bunsText.setText(`${state.player.buns}`);
  }

  private updateEnemySprites(isOpponent: boolean): void {
    const state = this.engine.getState();
    const enemies = isOpponent ? state.opponentEnemies : state.enemies;
    const sprites = isOpponent ? this.opponentEnemySprites : this.enemySprites;

    const existingIds = new Set(enemies.map((e) => e.id));

    sprites.forEach((sprite, id) => {
      if (!existingIds.has(id)) {
        sprite.container.destroy();
        sprites.delete(id);
      }
    });

    enemies.forEach((enemy) => {
      let sprite = sprites.get(enemy.id);

      if (!sprite) {
        sprite = this.createEnemySprite(enemy, isOpponent);
        sprites.set(enemy.id, sprite);
      }

      sprite.container.setPosition(enemy.position.x, enemy.position.y);

      const healthPct = Math.max(0, enemy.health / enemy.maxHealth);
      sprite.healthBar.setScale(healthPct, 1);
    });
  }

  private createEnemySprite(enemy: EnemyState, isOpponent: boolean): EnemySprite {
    const scale = isOpponent ? GAME_CONFIG.opponentBoardScale : 1;
    const size = (enemy.isBoss ? 36 : 24) * scale;

    const container = this.add.container(enemy.position.x, enemy.position.y);
    container.setDepth(50);

    const bg = this.add.rectangle(0, 0, size, size, Phaser.Display.Color.HexStringToColor(enemy.color).color);
    bg.setStrokeStyle(1, 0x000000);

    const text = this.add.text(0, 0, enemy.char, {
      fontFamily: GAME_CONFIG.typography.brush,
      fontSize: `${Math.floor((enemy.isBoss ? 20 : 14) * scale)}px`,
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 1,
    });
    text.setOrigin(0.5);

    const healthBarBg = this.add.rectangle(0, -size / 2 - 4, size, 3, 0x333333);
    const healthBar = this.add.rectangle(0, -size / 2 - 4, size, 3, 0x4caf50);

    container.add([bg, text, healthBarBg, healthBar]);

    return { container, healthBar, id: enemy.id };
  }

  private updateProjectileSprites(): void {
    const state = this.engine.getState();
    const allProjectiles = [...state.projectiles, ...state.opponentProjectiles];

    const existingIds = new Set(allProjectiles.map((p) => p.id));

    this.projectileSprites.forEach((sprite, id) => {
      if (!existingIds.has(id)) {
        sprite.destroy();
        this.projectileSprites.delete(id);
      }
    });

    allProjectiles.forEach((proj) => {
      let sprite = this.projectileSprites.get(proj.id);

      if (!sprite) {
        sprite = this.createProjectileSprite(proj.tileType);
        this.projectileSprites.set(proj.id, sprite);
      }

      sprite.setPosition(proj.position.x, proj.position.y);
    });
  }

  private createProjectileSprite(tileType?: string): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);
    container.setDepth(75);

    let g = this.add.graphics();

    if (tileType === 'bow') {
      g.fillStyle(0x8b4513, 1);
      g.fillTriangle(0, -6, -3, 6, 3, 6);
    } else {
      g.fillStyle(0x333333, 1);
      g.fillCircle(0, 0, 4);
    }

    container.add(g);
    return container;
  }

  private updateOpponentTiles(): void {
    const state = this.engine.getState();

    state.opponent.tiles.forEach((tile) => {
      if (!tile.position) return;

      let sprite = this.opponentTileSprites.get(tile.id);
      if (!sprite) {
        sprite = this.createTileSprite(tile, true);
        const pos = this.engine.gridToWorld(tile.position, true);
        sprite.container.setPosition(pos.x, pos.y);
        this.opponentTileSprites.set(tile.id, sprite);
      }
    });

    const placedIds = new Set(state.opponent.tiles.filter((t) => t.position).map((t) => t.id));
    this.opponentTileSprites.forEach((sprite, id) => {
      if (!placedIds.has(id)) {
        sprite.container.destroy();
        this.opponentTileSprites.delete(id);
      }
    });
  }
}

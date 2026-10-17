import Phaser from 'phaser';
import { BattleEngine } from '../logic/BattleEngine';
import { GAME_CONFIG } from '../config/gameConfig';
import { TILE_CONFIGS, SHOVEL_CONFIG, MAX_TILE_LEVEL } from '../config/tiles';
import { GENERALS } from '../config/generals';
import type { TileState, EnemyState, GridPosition, GameEvent } from '../logic/types';

interface TileSprite {
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Rectangle;
  text: Phaser.GameObjects.Text;
  levelText: Phaser.GameObjects.Text;
  id: string;
}

interface EnemySprite {
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Rectangle;
  text: Phaser.GameObjects.Text;
  healthBar: Phaser.GameObjects.Rectangle;
  healthBarBg: Phaser.GameObjects.Rectangle;
  id: string;
}

interface ProjectileSprite {
  circle: Phaser.GameObjects.Arc;
  id: string;
}

export class GameScene extends Phaser.Scene {
  private engine!: BattleEngine;
  private cellGraphics: Phaser.GameObjects.Rectangle[] = [];
  private pathGraphics!: Phaser.GameObjects.Graphics;
  private tileSprites: Map<string, TileSprite> = new Map();
  private enemySprites: Map<string, EnemySprite> = new Map();
  private projectileSprites: Map<string, ProjectileSprite> = new Map();

  private bunsText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private opponentLivesText!: Phaser.GameObjects.Text;
  private recruitButton!: Phaser.GameObjects.Container;
  private recruitCostText!: Phaser.GameObjects.Text;
  private startWaveButton!: Phaser.GameObjects.Container;
  private pendingTileSprite: TileSprite | null = null;
  private messageText!: Phaser.GameObjects.Text;
  private gameOverContainer!: Phaser.GameObjects.Container;

  private adouSprite!: Phaser.GameObjects.Container;
  private opponentAdouSprite!: Phaser.GameObjects.Container;

  private dragStartPos: { x: number; y: number } | null = null;
  private draggingTile: TileSprite | null = null;
  private selectedTileForMerge: TileSprite | null = null;

  private activatedGeneralsText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    const seed = Date.now();
    this.engine = new BattleEngine(seed);

    this.engine.addEventListener(this.handleGameEvent.bind(this));

    this.createBackground();
    this.createPath();
    this.createGrid();
    this.createAdou();
    this.createUI();
    this.createGameOverUI();

    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
  }

  private createBackground(): void {
    this.cameras.main.setBackgroundColor(GAME_CONFIG.colors.background);

    const title = this.add.text(
      GAME_CONFIG.canvasWidth / 2,
      30,
      '三国字阵',
      {
        fontSize: '28px',
        fontFamily: 'Arial, sans-serif',
        color: '#FFD700',
        fontStyle: 'bold',
      }
    );
    title.setOrigin(0.5);
  }

  private createPath(): void {
    this.pathGraphics = this.add.graphics();
    this.pathGraphics.lineStyle(8, 0x2d4a22);
    this.pathGraphics.fillStyle(0x1e3a14);

    const points = GAME_CONFIG.pathPoints;
    this.pathGraphics.beginPath();
    this.pathGraphics.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      this.pathGraphics.lineTo(points[i].x, points[i].y);
    }

    this.pathGraphics.strokePath();

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      this.pathGraphics.fillRect(
        Math.min(p1.x, p2.x) - 4,
        Math.min(p1.y, p2.y) - 4,
        Math.abs(p2.x - p1.x) + 8,
        Math.abs(p2.y - p1.y) + 8
      );
    }
  }

  private createGrid(): void {
    const state = this.engine.getState();
    const { gridStartX, gridStartY, cellSize } = GAME_CONFIG;

    state.player.cells.forEach((cell) => {
      const x = gridStartX + cell.position.col * cellSize;
      const y = gridStartY + cell.position.row * cellSize;

      const rect = this.add.rectangle(
        x + cellSize / 2,
        y + cellSize / 2,
        cellSize - 4,
        cellSize - 4,
        cell.isUnlocked
          ? Phaser.Display.Color.HexStringToColor(GAME_CONFIG.colors.cellUnlocked).color
          : Phaser.Display.Color.HexStringToColor(GAME_CONFIG.colors.cellLocked).color
      );
      rect.setStrokeStyle(
        2,
        Phaser.Display.Color.HexStringToColor(GAME_CONFIG.colors.gridBorder).color
      );
      rect.setData('cellPos', cell.position);

      this.cellGraphics.push(rect);
    });
  }

  private createAdou(): void {
    const createAdouSprite = (x: number, y: number, label: string) => {
      const container = this.add.container(x, y);

      const bg = this.add.rectangle(0, 0, 50, 50, 0xffd700);
      bg.setStrokeStyle(3, 0xff8c00);

      const text = this.add.text(0, 0, '斗', {
        fontSize: '32px',
        fontFamily: 'Arial, sans-serif',
        color: '#8B0000',
        fontStyle: 'bold',
      });
      text.setOrigin(0.5);

      const labelText = this.add.text(0, 35, label, {
        fontSize: '12px',
        fontFamily: 'Arial, sans-serif',
        color: '#FFD700',
      });
      labelText.setOrigin(0.5);

      container.add([bg, text, labelText]);
      return container;
    };

    this.adouSprite = createAdouSprite(GAME_CONFIG.adouX, GAME_CONFIG.adouY, '我方阿斗');
    this.opponentAdouSprite = createAdouSprite(GAME_CONFIG.adouX, 100, '敌方阿斗');
  }

  private createUI(): void {
    const uiY = 640;

    this.bunsText = this.add.text(20, uiY, '馒头: 30', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: GAME_CONFIG.colors.buns,
      fontStyle: 'bold',
    });

    this.waveText = this.add.text(GAME_CONFIG.canvasWidth / 2, 60, '波次: 0/13', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: GAME_CONFIG.colors.text,
    });
    this.waveText.setOrigin(0.5);

    this.livesText = this.add.text(20, uiY + 25, '生命: ❤❤❤', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#FF6B6B',
    });

    this.opponentLivesText = this.add.text(GAME_CONFIG.canvasWidth - 120, 60, '敌方: ❤❤❤', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#FF6B6B',
    });

    const recruitBg = this.add.rectangle(0, 0, 100, 45, 0xe94560);
    recruitBg.setStrokeStyle(2, 0xffffff);
    const recruitText = this.add.text(0, -8, '征兵', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#fff',
      fontStyle: 'bold',
    });
    recruitText.setOrigin(0.5);
    this.recruitCostText = this.add.text(0, 10, '花费: 10', {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      color: '#fff',
    });
    this.recruitCostText.setOrigin(0.5);

    this.recruitButton = this.add.container(80, 700, [
      recruitBg,
      recruitText,
      this.recruitCostText,
    ]);
    this.recruitButton.setSize(100, 45);
    this.recruitButton.setInteractive();
    this.recruitButton.on('pointerdown', this.onRecruitClick, this);

    const startBg = this.add.rectangle(0, 0, 100, 45, 0x228b22);
    startBg.setStrokeStyle(2, 0xffffff);
    const startText = this.add.text(0, 0, '开始波次', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#fff',
      fontStyle: 'bold',
    });
    startText.setOrigin(0.5);

    this.startWaveButton = this.add.container(320, 700, [startBg, startText]);
    this.startWaveButton.setSize(100, 45);
    this.startWaveButton.setInteractive();
    this.startWaveButton.on('pointerdown', this.onStartWaveClick, this);

    this.messageText = this.add.text(
      GAME_CONFIG.canvasWidth / 2,
      GAME_CONFIG.canvasHeight / 2 - 100,
      '',
      {
        fontSize: '24px',
        fontFamily: 'Arial, sans-serif',
        color: '#FFD700',
        fontStyle: 'bold',
        stroke: '#000',
        strokeThickness: 4,
      }
    );
    this.messageText.setOrigin(0.5);
    this.messageText.setAlpha(0);

    this.activatedGeneralsText = this.add.text(200, uiY, '', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#98FB98',
    });
  }

  private createGameOverUI(): void {
    this.gameOverContainer = this.add.container(
      GAME_CONFIG.canvasWidth / 2,
      GAME_CONFIG.canvasHeight / 2
    );

    const bg = this.add.rectangle(0, 0, 300, 200, 0x000000, 0.8);
    bg.setStrokeStyle(3, 0xffd700);

    const titleText = this.add.text(0, -60, '游戏结束', {
      fontSize: '32px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFD700',
      fontStyle: 'bold',
    });
    titleText.setOrigin(0.5);

    const resultText = this.add.text(0, 0, '', {
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif',
      color: '#fff',
    });
    resultText.setOrigin(0.5);
    resultText.setData('type', 'result');

    const restartBg = this.add.rectangle(0, 60, 120, 40, 0xe94560);
    restartBg.setStrokeStyle(2, 0xffffff);
    restartBg.setInteractive();
    restartBg.on('pointerdown', this.onRestartClick, this);

    const restartText = this.add.text(0, 60, '再来一局', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#fff',
      fontStyle: 'bold',
    });
    restartText.setOrigin(0.5);

    this.gameOverContainer.add([bg, titleText, resultText, restartBg, restartText]);
    this.gameOverContainer.setVisible(false);
    this.gameOverContainer.setDepth(1000);
  }

  private onRecruitClick(): void {
    const state = this.engine.getState();
    if (state.player.pendingTile) {
      this.showMessage('请先放置当前字牌');
      return;
    }

    const tile = this.engine.recruit(false);
    if (tile) {
      this.createPendingTileSprite(tile);
    } else {
      this.showMessage('馒头不足!');
    }
  }

  private onStartWaveClick(): void {
    const success = this.engine.startNextWave();
    if (!success) {
      const state = this.engine.getState();
      if (state.isWaveActive) {
        this.showMessage('波次进行中...');
      } else if (state.currentWave >= 13) {
        this.showMessage('已完成所有波次!');
      }
    }
  }

  private onRestartClick(): void {
    this.scene.restart();
  }

  private createPendingTileSprite(tile: TileState): void {
    if (this.pendingTileSprite) {
      this.pendingTileSprite.container.destroy();
    }

    const x = GAME_CONFIG.canvasWidth / 2;
    const y = 580;

    const sprite = this.createTileSprite(tile, x, y);
    sprite.container.setData('tileId', tile.id);
    sprite.container.setData('isPending', true);

    this.pendingTileSprite = sprite;
    this.tileSprites.set(tile.id, sprite);

    const typeLabel =
      tile.type === 'shovel'
        ? '铲子 - 点击锁定格解锁'
        : tile.type === 'general'
        ? '武将字'
        : TILE_CONFIGS[tile.type]?.name || '';

    this.showMessage(`获得: ${tile.char} (${typeLabel})`);
  }

  private createTileSprite(tile: TileState, x: number, y: number): TileSprite {
    const container = this.add.container(x, y);
    const size = GAME_CONFIG.cellSize - 8;

    let color = '#666';
    if (tile.type === 'shovel') {
      color = SHOVEL_CONFIG.color;
    } else if (tile.type === 'general') {
      color = '#9400D3';
    } else {
      color = TILE_CONFIGS[tile.type]?.color || '#666';
    }

    const bg = this.add.rectangle(
      0,
      0,
      size,
      size,
      Phaser.Display.Color.HexStringToColor(color).color
    );
    bg.setStrokeStyle(2, 0xffffff);

    const text = this.add.text(0, 0, tile.char, {
      fontSize: '28px',
      fontFamily: 'Arial, sans-serif',
      color: '#fff',
      fontStyle: 'bold',
    });
    text.setOrigin(0.5);

    const levelText = this.add.text(size / 2 - 8, -size / 2 + 8, `${tile.level}`, {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFD700',
      fontStyle: 'bold',
    });
    levelText.setOrigin(0.5);

    if (tile.type === 'shovel') {
      levelText.setVisible(false);
    }

    container.add([bg, text, levelText]);
    container.setSize(size, size);
    container.setInteractive();

    return {
      container,
      background: bg,
      text,
      levelText,
      id: tile.id,
    };
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    const state = this.engine.getState();

    const cellClicked = this.cellGraphics.find((cell) => {
      const bounds = cell.getBounds();
      return bounds.contains(pointer.x, pointer.y);
    });

    if (cellClicked && this.pendingTileSprite) {
      const cellPos = cellClicked.getData('cellPos') as GridPosition;
      const pendingTile = state.player.pendingTile;

      if (pendingTile) {
        if (pendingTile.type === 'shovel') {
          const cell = state.player.cells.find(
            (c) => c.position.col === cellPos.col && c.position.row === cellPos.row
          );
          if (cell && !cell.isUnlocked) {
            const success = this.engine.unlockCell(cellPos, false);
            if (success) {
              this.updateCellGraphics(cellPos, true);
              this.pendingTileSprite.container.destroy();
              this.pendingTileSprite = null;
              this.tileSprites.delete(pendingTile.id);
              this.showMessage('解锁成功!');
            }
          } else {
            this.showMessage('请选择锁定的格子');
          }
          return;
        }

        const cell = state.player.cells.find(
          (c) => c.position.col === cellPos.col && c.position.row === cellPos.row
        );

        if (cell && cell.isUnlocked && !cell.tileId) {
          const success = this.engine.placeTile(pendingTile.id, cellPos, false);
          if (success) {
            const x =
              GAME_CONFIG.gridStartX +
              cellPos.col * GAME_CONFIG.cellSize +
              GAME_CONFIG.cellSize / 2;
            const y =
              GAME_CONFIG.gridStartY +
              cellPos.row * GAME_CONFIG.cellSize +
              GAME_CONFIG.cellSize / 2;

            this.pendingTileSprite.container.setPosition(x, y);
            this.pendingTileSprite.container.setData('isPending', false);
            this.pendingTileSprite = null;
          }
        }
      }
      return;
    }

    this.tileSprites.forEach((sprite) => {
      const bounds = sprite.container.getBounds();
      if (bounds.contains(pointer.x, pointer.y)) {
        const isPending = sprite.container.getData('isPending');
        if (!isPending) {
          const tile = state.player.tiles.find((t) => t.id === sprite.id);
          if (tile && tile.position) {
            if (this.selectedTileForMerge) {
              const selectedTile = state.player.tiles.find(
                (t) => t.id === this.selectedTileForMerge!.id
              );
              if (
                selectedTile &&
                selectedTile.type === tile.type &&
                selectedTile.char === tile.char &&
                selectedTile.level === tile.level &&
                selectedTile.level < MAX_TILE_LEVEL &&
                selectedTile.id !== tile.id
              ) {
                const newTile = this.engine.mergeTiles(selectedTile.id, tile.id, false);
                if (newTile) {
                  this.showMessage(`合成成功! 等级 ${newTile.level}`);
                }
              }
              this.selectedTileForMerge.background.setStrokeStyle(2, 0xffffff);
              this.selectedTileForMerge = null;
            } else {
              this.selectedTileForMerge = sprite;
              sprite.background.setStrokeStyle(3, 0x00ff00);
            }
          }
        }
      }
    });
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.draggingTile) {
      this.draggingTile.container.setPosition(pointer.x, pointer.y);
    }
  }

  private onPointerUp(_pointer: Phaser.Input.Pointer): void {
    this.draggingTile = null;
  }

  private updateCellGraphics(pos: GridPosition, isUnlocked: boolean): void {
    const cell = this.cellGraphics.find((c) => {
      const cellPos = c.getData('cellPos') as GridPosition;
      return cellPos.col === pos.col && cellPos.row === pos.row;
    });

    if (cell) {
      cell.setFillStyle(
        isUnlocked
          ? Phaser.Display.Color.HexStringToColor(GAME_CONFIG.colors.cellUnlocked).color
          : Phaser.Display.Color.HexStringToColor(GAME_CONFIG.colors.cellLocked).color
      );
    }
  }

  private handleGameEvent(event: GameEvent): void {
    switch (event.type) {
      case 'WAVE_STARTED':
        this.showMessage(`第 ${event.waveNumber} 波开始!`);
        break;

      case 'WAVE_COMPLETED':
        this.showMessage(`第 ${event.waveNumber} 波完成!`);
        break;

      case 'ENEMY_KILLED':
        if (!event.isOpponent) {
          this.showFloatingText('+' + event.reward, GAME_CONFIG.colors.buns);
        }
        break;

      case 'GENERAL_ACTIVATED':
        if (!event.isOpponent) {
          const general = GENERALS.find((g) => g.id === event.generalId);
          if (general) {
            this.showMessage(`${general.name} 激活! ${general.skillName}`);
          }
        }
        break;

      case 'GAME_OVER':
        this.showGameOver(event.winner);
        break;

      case 'TILES_MERGED':
        if (!event.isOpponent) {
          this.handleTilesMerged(event.tile1Id, event.tile2Id, event.newTileId);
        }
        break;
    }
  }

  private handleTilesMerged(tile1Id: string, tile2Id: string, newTileId: string): void {
    const sprite1 = this.tileSprites.get(tile1Id);
    const sprite2 = this.tileSprites.get(tile2Id);

    if (sprite1) {
      sprite1.container.destroy();
      this.tileSprites.delete(tile1Id);
    }
    if (sprite2) {
      sprite2.container.destroy();
      this.tileSprites.delete(tile2Id);
    }

    const state = this.engine.getState();
    const newTile = state.player.tiles.find((t) => t.id === newTileId);
    if (newTile && newTile.position) {
      const x =
        GAME_CONFIG.gridStartX +
        newTile.position.col * GAME_CONFIG.cellSize +
        GAME_CONFIG.cellSize / 2;
      const y =
        GAME_CONFIG.gridStartY +
        newTile.position.row * GAME_CONFIG.cellSize +
        GAME_CONFIG.cellSize / 2;

      const sprite = this.createTileSprite(newTile, x, y);
      sprite.container.setData('tileId', newTile.id);
      this.tileSprites.set(newTile.id, sprite);
    }
  }

  private showMessage(text: string): void {
    this.messageText.setText(text);
    this.messageText.setAlpha(1);

    this.tweens.add({
      targets: this.messageText,
      alpha: 0,
      duration: 2000,
      ease: 'Power2',
    });
  }

  private showFloatingText(text: string, color: string): void {
    const floatText = this.add.text(
      GAME_CONFIG.canvasWidth / 2,
      GAME_CONFIG.canvasHeight / 2,
      text,
      {
        fontSize: '20px',
        fontFamily: 'Arial, sans-serif',
        color: color,
        fontStyle: 'bold',
      }
    );
    floatText.setOrigin(0.5);

    this.tweens.add({
      targets: floatText,
      y: floatText.y - 50,
      alpha: 0,
      duration: 1000,
      onComplete: () => floatText.destroy(),
    });
  }

  private showGameOver(winner: 'player' | 'opponent'): void {
    const resultText = this.gameOverContainer.list.find(
      (obj) => obj.getData('type') === 'result'
    ) as Phaser.GameObjects.Text;

    if (resultText) {
      resultText.setText(winner === 'player' ? '胜利!' : '失败...');
      resultText.setColor(winner === 'player' ? '#00FF00' : '#FF0000');
    }

    this.gameOverContainer.setVisible(true);
  }

  update(_time: number, delta: number): void {
    this.engine.update(delta);
    this.updateUI();
    this.updateEnemySprites();
    this.updateProjectileSprites();
    this.updateTileSprites();
  }

  private updateUI(): void {
    const state = this.engine.getState();

    this.bunsText.setText(`馒头: ${state.player.buns}`);
    this.waveText.setText(`波次: ${state.currentWave}/13`);
    this.recruitCostText.setText(`花费: ${state.player.recruitCost}`);

    const playerHearts = '❤'.repeat(Math.max(0, state.player.adouLives));
    const emptyHearts = '♡'.repeat(Math.max(0, GAME_CONFIG.adouLives - state.player.adouLives));
    this.livesText.setText(`生命: ${playerHearts}${emptyHearts}`);

    const oppHearts = '❤'.repeat(Math.max(0, state.opponent.adouLives));
    const oppEmpty = '♡'.repeat(Math.max(0, GAME_CONFIG.adouLives - state.opponent.adouLives));
    this.opponentLivesText.setText(`敌方: ${oppHearts}${oppEmpty}`);

    const activeGenerals = state.player.activeGenerals
      .filter((ag) => ag.isActive)
      .map((ag) => {
        const general = GENERALS.find((g) => g.id === ag.generalId);
        return general?.name || '';
      })
      .join(' ');

    this.activatedGeneralsText.setText(activeGenerals ? `激活: ${activeGenerals}` : '');
  }

  private updateEnemySprites(): void {
    const state = this.engine.getState();

    const allEnemies = [...state.enemies, ...state.opponentEnemies];
    const existingIds = new Set(allEnemies.map((e) => e.id));

    this.enemySprites.forEach((sprite, id) => {
      if (!existingIds.has(id)) {
        sprite.container.destroy();
        this.enemySprites.delete(id);
      }
    });

    allEnemies.forEach((enemy) => {
      let sprite = this.enemySprites.get(enemy.id);

      if (!sprite) {
        sprite = this.createEnemySprite(enemy);
        this.enemySprites.set(enemy.id, sprite);
      }

      sprite.container.setPosition(enemy.position.x, enemy.position.y);

      const healthPercent = enemy.health / enemy.maxHealth;
      sprite.healthBar.setScale(healthPercent, 1);
    });
  }

  private createEnemySprite(enemy: EnemyState): EnemySprite {
    const container = this.add.container(enemy.position.x, enemy.position.y);
    const size = enemy.isBoss ? 40 : 30;

    const bg = this.add.rectangle(
      0,
      0,
      size,
      size,
      Phaser.Display.Color.HexStringToColor(enemy.color).color
    );
    bg.setStrokeStyle(2, 0x000000);

    const text = this.add.text(0, 0, enemy.char, {
      fontSize: enemy.isBoss ? '24px' : '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#fff',
      fontStyle: 'bold',
    });
    text.setOrigin(0.5);

    const healthBarBg = this.add.rectangle(0, -size / 2 - 8, size, 6, 0x333333);
    const healthBar = this.add.rectangle(0, -size / 2 - 8, size, 6, 0x00ff00);
    healthBar.setOrigin(0.5);
    healthBarBg.setOrigin(0.5);

    container.add([bg, text, healthBarBg, healthBar]);

    return {
      container,
      background: bg,
      text,
      healthBar,
      healthBarBg,
      id: enemy.id,
    };
  }

  private updateProjectileSprites(): void {
    const state = this.engine.getState();

    const allProjectiles = [...state.projectiles, ...state.opponentProjectiles];
    const existingIds = new Set(allProjectiles.map((p) => p.id));

    this.projectileSprites.forEach((sprite, id) => {
      if (!existingIds.has(id)) {
        sprite.circle.destroy();
        this.projectileSprites.delete(id);
      }
    });

    allProjectiles.forEach((proj) => {
      let sprite = this.projectileSprites.get(proj.id);

      if (!sprite) {
        const circle = this.add.circle(proj.position.x, proj.position.y, 4, 0xffff00);
        sprite = { circle, id: proj.id };
        this.projectileSprites.set(proj.id, sprite);
      }

      sprite.circle.setPosition(proj.position.x, proj.position.y);
    });
  }

  private updateTileSprites(): void {
    const state = this.engine.getState();

    state.player.tiles.forEach((tile) => {
      const sprite = this.tileSprites.get(tile.id);
      if (sprite) {
        sprite.levelText.setText(`${tile.level}`);

        if (tile.isStunned) {
          sprite.background.setFillStyle(0x555555);
        } else {
          let color = '#666';
          if (tile.type === 'shovel') {
            color = SHOVEL_CONFIG.color;
          } else if (tile.type === 'general') {
            color = '#9400D3';
          } else {
            color = TILE_CONFIGS[tile.type]?.color || '#666';
          }
          sprite.background.setFillStyle(
            Phaser.Display.Color.HexStringToColor(color).color
          );
        }

        if (tile.generalId) {
          sprite.background.setStrokeStyle(3, 0xffd700);
        }
      }
    });
  }
}

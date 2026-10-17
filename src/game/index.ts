import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { GAME_CONFIG } from './config/gameConfig';

export function createGame(parent: string | HTMLElement): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.WEBGL,
    width: GAME_CONFIG.canvasWidth,
    height: GAME_CONFIG.canvasHeight,
    parent,
    backgroundColor: GAME_CONFIG.colors.background,
    scene: [BootScene, GameScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_CONFIG.canvasWidth,
      height: GAME_CONFIG.canvasHeight,
    },
    render: {
      pixelArt: false,
      antialias: true,
      roundPixels: false,
    },
    input: {
      activePointers: 3,
      touch: {
        capture: true,
      },
    },
    fps: {
      target: 60,
      forceSetTimeOut: false,
    },
  };

  const game = new Phaser.Game(config);
  window.__game = game;
  return game;
}

 declare global {
  interface Window {
    __game: Phaser.Game;
    __test: { myTiles(): {id: string; row: number; col: number; type: string; char: string; level: number}[]; setGold(amount: number): void; placeableCells(): {row: number; col: number}[]; state(): any; slotPos(i: number): { x: number; y: number }; cellPos(row: number, col: number): { x: number; y: number }; triggerFire(): void; recruitPos(): { x: number; y: number }; start(): void };
  }
}

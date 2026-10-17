import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { GAME_CONFIG } from './config/gameConfig';

export function createGame(parent: string | HTMLElement): Phaser.Game {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: GAME_CONFIG.canvasWidth,
    height: GAME_CONFIG.canvasHeight,
    parent,
    backgroundColor: GAME_CONFIG.colors.background,
    scene: [BootScene, GameScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
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

  if (dpr > 1) {
    game.canvas.style.width = `${GAME_CONFIG.canvasWidth}px`;
    game.canvas.style.height = `${GAME_CONFIG.canvasHeight}px`;
  }

  return game;
}

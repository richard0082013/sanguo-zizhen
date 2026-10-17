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
      min: {
        width: GAME_CONFIG.canvasWidth * 0.5,
        height: GAME_CONFIG.canvasHeight * 0.5,
      },
      max: {
        width: GAME_CONFIG.canvasWidth * 2,
        height: GAME_CONFIG.canvasHeight * 2,
      },
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

  return new Phaser.Game(config);
}

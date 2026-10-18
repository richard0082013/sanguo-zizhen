import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { GAME_CONFIG } from './config/gameConfig';

export function createGame(parent: string | HTMLElement): Phaser.Game {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const element = typeof parent === 'string' ? document.getElementById(parent)! : parent;
  const backingSize = () => {
    const fit = Math.min(element.clientWidth / GAME_CONFIG.canvasWidth,
      element.clientHeight / GAME_CONFIG.canvasHeight);
    return { width: Math.round(GAME_CONFIG.canvasWidth * fit * dpr),
      height: Math.round(GAME_CONFIG.canvasHeight * fit * dpr) };
  };
  const size = backingSize();
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.WEBGL,
    width: size.width,
    height: size.height,
    parent,
    backgroundColor: GAME_CONFIG.colors.background,
    scene: [BootScene, GameScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: size.width,
      height: size.height,
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
  const resize = () => {
    const next = backingSize();
    game.scale.resize(next.width, next.height);
  };
  window.addEventListener('resize', resize);
  game.events.once(Phaser.Core.Events.DESTROY, () => window.removeEventListener('resize', resize));
  window.__game = game;
  return game;
}

 declare global {
  interface Window {
    __game: Phaser.Game;
    __test: { myTiles(): {id: string; row: number; col: number; type: string; char: string; level: number}[]; placeableCells(): {row: number; col: number}[]; state(): any; slotPos(i: number): { x: number; y: number }; cellPos(row: number, col: number): { x: number; y: number }; triggerFire(): void; recruitPos(): { x: number; y: number }; start(): void };
  }
}

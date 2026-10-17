import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    const assets = GAME_CONFIG.assets;

    this.load.image('bg_parchment', assets.backgrounds.parchment);
    this.load.image('bg_river', assets.backgrounds.river);
    this.load.image('adou', assets.adou);

    this.load.image('tile_white', assets.tiles.white);
    this.load.image('tile_green', assets.tiles.green);
    this.load.image('tile_blue', assets.tiles.blue);
    this.load.image('tile_purple', assets.tiles.purple);
    this.load.image('tile_gold', assets.tiles.gold);
    this.load.image('tile_general_frame', assets.tiles.generalFrame);

    this.load.image('enemy_soldier', assets.enemies.soldier);
    this.load.image('enemy_cavalry', assets.enemies.cavalry);
    this.load.image('enemy_shield', assets.enemies.shield);
    this.load.image('enemy_mage', assets.enemies.mage);
    this.load.image('enemy_elite', assets.enemies.elite);
    this.load.image('enemy_boss', assets.enemies.boss);

    Object.entries(assets.generals).forEach(([key, path]) => {
      this.load.image(`general_${key}`, path);
    });

    this.load.image('vfx_fire_dragon', assets.vfx.fireDragon);
    this.load.image('vfx_flame_burst', assets.vfx.flameBurst);
    this.load.image('vfx_ink_splash', assets.vfx.inkSplash);
    this.load.image('vfx_lightning', assets.vfx.lightning);
    this.load.image('vfx_slash', assets.vfx.slash);

    this.load.image('ui_button', assets.ui.button);
    this.load.image('ui_mantou', assets.ui.mantou);
    this.load.image('ui_heart', assets.ui.heart);
  }

  create(): void {
    this.scene.start('GameScene');
  }
}

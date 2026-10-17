import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';

export class TextureGenerator {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  generateAll(): void {
    this.createGlowTextures();
    this.createParchmentTexture();
    this.createPathTexture();
    this.createRiverTexture();
    this.createCellTexture();
    this.createTileTextures();
    this.createAdouTexture();
    this.createEnemyTextures();
    this.createHeartTexture();
  }

  private createGlowTextures(): void {
    for (const [key, color] of [['fire_glow', '255,255,255'], ['smoke_glow', '65,53,48']]) {
      if (this.scene.textures.exists(key)) continue;
      const canvas = this.scene.textures.createCanvas(key, 64, 64)!;
      const ctx = canvas.getContext();
      const glow = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      glow.addColorStop(0, `rgba(${color},1)`);
      glow.addColorStop(0.25, `rgba(${color},0.7)`);
      glow.addColorStop(0.6, `rgba(${color},0.2)`);
      glow.addColorStop(1, `rgba(${color},0)`);
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, 64, 64);
      canvas.refresh();
    }
  }

  private createParchmentTexture(): void {
    const width = GAME_CONFIG.canvasWidth;
    const height = GAME_CONFIG.canvasHeight;
    const canvas = this.scene.textures.createCanvas('parchment', width, height);
    if (!canvas) return;
    const ctx = canvas.getContext();

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#d4c4a8');
    gradient.addColorStop(0.3, '#e8dcc8');
    gradient.addColorStop(0.5, '#f4e8d4');
    gradient.addColorStop(0.7, '#e8dcc8');
    gradient.addColorStop(1, '#c8b898');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.globalAlpha = 0.15;
    for (let i = 0; i < 800; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = Math.random() * 3 + 1;
      ctx.fillStyle = Math.random() > 0.5 ? '#8b7355' : '#a08060';
      ctx.fillRect(x, y, size, size);
    }

    ctx.globalAlpha = 0.08;
    for (let i = 0; i < 30; i++) {
      ctx.strokeStyle = '#6b5344';
      ctx.lineWidth = Math.random() * 2 + 0.5;
      ctx.beginPath();
      const startX = Math.random() * width;
      const startY = Math.random() * height;
      ctx.moveTo(startX, startY);
      ctx.lineTo(startX + (Math.random() - 0.5) * 100, startY + (Math.random() - 0.5) * 100);
      ctx.stroke();
    }

    ctx.globalAlpha = 0.1;
    ctx.fillStyle = '#5a4a3a';
    ctx.fillRect(0, 0, width, 8);
    ctx.fillRect(0, height - 8, width, 8);
    ctx.fillRect(0, 0, 8, height);
    ctx.fillRect(width - 8, 0, 8, height);

    ctx.globalAlpha = 1;
    canvas.refresh();
  }

  private createPathTexture(): void {
    const size = GAME_CONFIG.cellSize;
    const canvas = this.scene.textures.createCanvas('path_cell', size, size);
    if (!canvas) return;
    const ctx = canvas.getContext();

    ctx.fillStyle = '#a57a4d';
    ctx.fillRect(0, 0, size, size);
    // Fine sand, gravel and worn ruts, rather than large circular spots.
    for (let i = 0; i < 850; i++) {
      ctx.globalAlpha = 0.12 + Math.random() * 0.2;
      ctx.fillStyle = Math.random() > 0.45 ? '#503723' : '#f1d3a0';
      ctx.fillRect(Math.random() * size, Math.random() * size, Math.random() * 1.5 + 0.3, 0.7);
    }
    ctx.globalAlpha = 0.13;
    ctx.strokeStyle = '#59402c';
    ctx.lineWidth = 1;
    for (let i = 0; i < 7; i++) {
      const y = 7 + i * 7;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(18, y - 3, 36, y + 3, size, y - 1);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    canvas.refresh();
  }

  private createRiverTexture(): void {
    const width = GAME_CONFIG.canvasWidth;
    const height = GAME_CONFIG.riverHeight;
    const canvas = this.scene.textures.createCanvas('river', width, height);
    if (!canvas) return;
    const ctx = canvas.getContext();

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#2a5a7a');
    gradient.addColorStop(0.3, '#3a7a9a');
    gradient.addColorStop(0.5, '#4a8aaa');
    gradient.addColorStop(0.7, '#3a7a9a');
    gradient.addColorStop(1, '#2a5a7a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = '#5aaacc';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const y = 5 + i * 5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x < width; x += 20) {
        ctx.lineTo(x + 10, y + Math.sin(x * 0.1) * 3);
        ctx.lineTo(x + 20, y);
      }
      ctx.stroke();
    }

    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      ctx.beginPath();
      ctx.arc(x, y, Math.random() * 2 + 1, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#1a3a5a';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, width, height);

    ctx.globalAlpha = 1;
    canvas.refresh();
  }

  private createCellTexture(): void {
    const size = GAME_CONFIG.cellSize;
    const canvas = this.scene.textures.createCanvas('grid_cell', size, size);
    if (!canvas) return;
    const ctx = canvas.getContext();

    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#c4a070');
    gradient.addColorStop(0.5, '#b89060');
    gradient.addColorStop(1, '#a88050');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    ctx.globalAlpha = 0.2;
    for (let i = 0; i < 10; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      ctx.fillStyle = '#8a6a4a';
      ctx.fillRect(x, y, 2, 2);
    }

    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#7a5a3a';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, size - 2, size - 2);

    ctx.strokeStyle = '#d4b490';
    ctx.lineWidth = 1;
    ctx.strokeRect(3, 3, size - 6, size - 6);

    canvas.refresh();
  }

  private createTileTextures(): void {
    const levelColors: Record<number, { bg: string; border: string; shadow: string }> = {
      1: { bg: '#f8f4e8', border: '#c8c0b0', shadow: '#a8a090' },
      2: { bg: '#90c878', border: '#608848', shadow: '#406828' },
      3: { bg: '#70a8d8', border: '#4878a8', shadow: '#285888' },
      4: { bg: '#b888c8', border: '#8858a8', shadow: '#683888' },
      5: { bg: '#f8c040', border: '#c89020', shadow: '#a87010' },
    };

    for (let level = 1; level <= 5; level++) {
      this.createMahjongTile(level, levelColors[level]);
    }
  }

  private createMahjongTile(level: number, colors: { bg: string; border: string; shadow: string }): void {
    const size = GAME_CONFIG.cellSize - 4;
    const canvas = this.scene.textures.createCanvas(`tile_${level}`, size, size);
    if (!canvas) return;
    const ctx = canvas.getContext();

    ctx.fillStyle = colors.shadow;
    ctx.fillRect(3, 3, size - 3, size - 3);

    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, colors.bg);
    gradient.addColorStop(0.5, this.lightenColor(colors.bg, 20));
    gradient.addColorStop(1, this.darkenColor(colors.bg, 10));
    ctx.fillStyle = gradient;

    const r = 4;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(size - r, 0);
    ctx.quadraticCurveTo(size, 0, size, r);
    ctx.lineTo(size, size - r);
    ctx.quadraticCurveTo(size, size, size - r, size);
    ctx.lineTo(r, size);
    ctx.quadraticCurveTo(0, size, 0, size - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.fill();

    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.strokeStyle = this.lightenColor(colors.bg, 30);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(4, 2);
    ctx.lineTo(size - 4, 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(2, 4);
    ctx.lineTo(2, size - 4);
    ctx.stroke();

    canvas.refresh();
  }

  private createAdouTexture(): void {
    const width = 50;
    const height = 60;
    const canvas = this.scene.textures.createCanvas('adou', width, height);
    if (!canvas) return;
    const ctx = canvas.getContext();

    ctx.fillStyle = '#8b6914';
    ctx.beginPath();
    ctx.ellipse(width / 2, height - 15, 22, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5a4510';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#c4a060';
    ctx.beginPath();
    ctx.moveTo(8, height - 20);
    ctx.quadraticCurveTo(width / 2, height - 35, width - 8, height - 20);
    ctx.lineTo(width - 5, height - 8);
    ctx.lineTo(5, height - 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#8b6914';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = '#a08040';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(10 + i * 7, height - 18);
      ctx.lineTo(12 + i * 7, height - 28);
      ctx.stroke();
    }

    ctx.fillStyle = '#ffd4b8';
    ctx.beginPath();
    ctx.arc(width / 2, 18, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d4a088';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(width / 2 - 5, 15, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(width / 2 + 5, 15, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffb8a0';
    ctx.beginPath();
    ctx.arc(width / 2 - 9, 20, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(width / 2 + 9, 20, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#d4a088';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(width / 2, 22, 3, 0, Math.PI);
    ctx.stroke();

    ctx.fillStyle = '#3a2a1a';
    ctx.beginPath();
    ctx.ellipse(width / 2, 6, 12, 5, 0, Math.PI, Math.PI * 2);
    ctx.fill();

    canvas.refresh();
  }

  private createEnemyTextures(): void {
    const types = ['soldier', 'archer', 'cavalry', 'elite', 'boss'];
    const colors: Record<string, string> = {
      soldier: '#c44',
      archer: '#4a4',
      cavalry: '#44a',
      elite: '#a4a',
      boss: '#a44',
    };

    types.forEach((type) => {
      this.createEnemyTexture(type, colors[type]);
    });
  }

  private createEnemyTexture(type: string, color: string): void {
    const size = type === 'boss' ? 40 : 32;
    const canvas = this.scene.textures.createCanvas(`enemy_${type}`, size, size);
    if (!canvas) return;
    const ctx = canvas.getContext();

    ctx.fillStyle = this.darkenColor(color, 30);
    ctx.beginPath();
    ctx.arc(size / 2 + 2, size / 2 + 2, size / 2 - 4, 0, Math.PI * 2);
    ctx.fill();

    const gradient = ctx.createRadialGradient(
      size / 2 - 4, size / 2 - 4, 0,
      size / 2, size / 2, size / 2 - 2
    );
    gradient.addColorStop(0, this.lightenColor(color, 30));
    gradient.addColorStop(0.7, color);
    gradient.addColorStop(1, this.darkenColor(color, 20));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = this.darkenColor(color, 40);
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#1a1a1a';
    const eyeY = size / 2 - 2;
    ctx.beginPath();
    ctx.arc(size / 2 - 4, eyeY, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(size / 2 + 4, eyeY, 2, 0, Math.PI * 2);
    ctx.fill();

    if (type === 'boss') {
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.moveTo(size / 2, 2);
      ctx.lineTo(size / 2 - 6, 10);
      ctx.lineTo(size / 2 - 3, 10);
      ctx.lineTo(size / 2, 6);
      ctx.lineTo(size / 2 + 3, 10);
      ctx.lineTo(size / 2 + 6, 10);
      ctx.closePath();
      ctx.fill();
    }

    canvas.refresh();
  }

  private createHeartTexture(): void {
    const size = 20;
    const canvas = this.scene.textures.createCanvas('heart', size, size);
    if (!canvas) return;
    const ctx = canvas.getContext();

    ctx.fillStyle = '#e53935';
    ctx.beginPath();
    ctx.moveTo(size / 2, size - 3);
    ctx.bezierCurveTo(size / 2 - 8, size - 8, 2, size / 2 - 2, 2, size / 3);
    ctx.bezierCurveTo(2, 3, size / 2, 3, size / 2, 7);
    ctx.bezierCurveTo(size / 2, 3, size - 2, 3, size - 2, size / 3);
    ctx.bezierCurveTo(size - 2, size / 2 - 2, size / 2 + 8, size - 8, size / 2, size - 3);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.ellipse(size / 2 - 3, size / 3 + 2, 2, 3, -0.3, 0, Math.PI * 2);
    ctx.fill();

    canvas.refresh();
  }

  private lightenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, ((num >> 16) & 0xff) + Math.round(2.55 * percent));
    const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(2.55 * percent));
    const b = Math.min(255, (num & 0xff) + Math.round(2.55 * percent));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }

  private darkenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, ((num >> 16) & 0xff) - Math.round(2.55 * percent));
    const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(2.55 * percent));
    const b = Math.max(0, (num & 0xff) - Math.round(2.55 * percent));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }
}

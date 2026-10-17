import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';
import type { Position } from '../logic/types';

export interface VFXConfig {
  scene: Phaser.Scene;
}

export class VFXManager {
  private scene: Phaser.Scene;
  private particlePools: Map<string, Phaser.GameObjects.Particles.ParticleEmitter[]> = new Map();
  private activeEffects: Phaser.GameObjects.GameObject[] = [];

  constructor(config: VFXConfig) {
    this.scene = config.scene;
    this.createParticleTextures();
  }

  private createParticleTextures(): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });

    g.fillStyle(0xffffff);
    g.fillCircle(16, 16, 16);
    g.generateTexture('particle_circle', 32, 32);
    g.clear();

    g.fillStyle(0xffffff);
    g.fillTriangle(16, 0, 0, 32, 32, 32);
    g.generateTexture('particle_triangle', 32, 32);
    g.clear();

    const flameGradient = this.scene.textures.createCanvas('particle_flame', 32, 32);
    if (flameGradient) {
      const ctx = flameGradient.getContext();
      const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      gradient.addColorStop(0, 'rgba(255, 255, 200, 1)');
      gradient.addColorStop(0.3, 'rgba(255, 180, 50, 1)');
      gradient.addColorStop(0.6, 'rgba(255, 100, 20, 0.8)');
      gradient.addColorStop(1, 'rgba(200, 50, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 32, 32);
      flameGradient.refresh();
    }

    const sparkTexture = this.scene.textures.createCanvas('particle_spark', 16, 16);
    if (sparkTexture) {
      const sparkCtx = sparkTexture.getContext();
      const grad = sparkCtx.createRadialGradient(8, 8, 0, 8, 8, 8);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.5, 'rgba(255, 220, 100, 0.8)');
      grad.addColorStop(1, 'rgba(255, 150, 0, 0)');
      sparkCtx.fillStyle = grad;
      sparkCtx.fillRect(0, 0, 16, 16);
      sparkTexture.refresh();
    }

    const lightningTexture = this.scene.textures.createCanvas('particle_lightning', 8, 32);
    if (lightningTexture) {
      const lightCtx = lightningTexture.getContext();
      lightCtx.strokeStyle = 'rgba(150, 200, 255, 1)';
      lightCtx.lineWidth = 2;
      lightCtx.beginPath();
      lightCtx.moveTo(4, 0);
      lightCtx.lineTo(2, 10);
      lightCtx.lineTo(6, 15);
      lightCtx.lineTo(3, 25);
      lightCtx.lineTo(5, 32);
      lightCtx.stroke();
      lightningTexture.refresh();
    }

    g.destroy();
  }

  fireDragon(pathPoints: Position[], duration: number = 1500): void {
    if (pathPoints.length < 2) return;
    const lengths = pathPoints.slice(1).map((p, i) => Phaser.Math.Distance.Between(p.x, p.y, pathPoints[i].x, pathPoints[i].y));
    const total = lengths.reduce((a, b) => a + b, 0);
    const sample = (distance: number): Position => {
      distance = Phaser.Math.Clamp(distance, 0, total);
      for (let i = 0; i < lengths.length; i++) {
        if (distance <= lengths[i]) return {
          x: Phaser.Math.Linear(pathPoints[i].x, pathPoints[i+1].x, distance / lengths[i]),
          y: Phaser.Math.Linear(pathPoints[i].y, pathPoints[i+1].y, distance / lengths[i]),
        };
        distance -= lengths[i];
      }
      return pathPoints[pathPoints.length-1];
    };
    const body = Array.from({ length: 20 }, (_, i) => this.scene.add.image(0, 0, 'particle_flame')
      .setDepth(305 - i * 0.1).setBlendMode(Phaser.BlendModes.ADD)
      .setTint(i % 2 ? 0xffa522 : 0xff5010).setDisplaySize(35-i*0.8, 29-i*0.6));
    const head = this.scene.add.container(0, 0).setDepth(310).setName('fireDragonHead');
    head.add(this.scene.add.image(0, 0, 'particle_flame').setDisplaySize(65, 55).setBlendMode(Phaser.BlendModes.ADD));
    const face = this.scene.add.graphics();
    face.fillStyle(0xffa328).fillEllipse(0, 0, 32, 23);
    face.fillStyle(0xffde70).fillTriangle(8, -8, 30, -3, 12, 6);
    face.fillStyle(0x9e2d12).fillTriangle(8, 4, 27, 6, 10, 12);
    face.lineStyle(3, 0xffe9a0).lineBetween(-7,-7,-16,-23).lineBetween(-16,-23,-4,-17);
    face.lineBetween(-8,7,-18,21).lineBetween(-18,21,-5,16);
    face.fillStyle(0x49150c).fillEllipse(7,-5,8,5);
    face.fillStyle(0xffffff).fillCircle(9,-6,2);
    face.lineStyle(2, 0xffed99).lineBetween(20,-1,34,-12).lineBetween(20,7,35,16);
    head.add(face);
    const embers = this.scene.add.particles(0, 0, 'particle_flame', {
      lifespan: 600, frequency: 12, quantity: 3, speed: { min: 20, max: 85 },
      scale: { start: 0.22, end: 0 }, blendMode: Phaser.BlendModes.ADD,
      tint: [0xff5522, 0xffcc55],
    }).setDepth(308).startFollow(head);
    const progress = { value: 0 };
    this.scene.tweens.add({
      targets: progress, value: total + 190, duration, ease: 'Linear',
      onUpdate: () => {
        const p = sample(progress.value), next = sample(progress.value + 3), prev = sample(progress.value - 3);
        const angle = Phaser.Math.Angle.Between(prev.x, prev.y, next.x, next.y);
        head.setPosition(p.x, p.y).setRotation(angle).setVisible(progress.value <= total);
        body.forEach((segment, i) => {
          const d = progress.value - (i+1)*9;
          const q = sample(d), r = sample(d+3);
          const direction = Phaser.Math.Angle.Between(q.x,q.y,r.x,r.y);
          const wave = Math.sin(i*0.65 + progress.value*0.045)*6;
          segment.setPosition(q.x-Math.sin(direction)*wave,q.y+Math.cos(direction)*wave)
            .setRotation(direction).setVisible(d >= 0 && d <= total);
        });
      },
      onComplete: () => {
        body.forEach(s => s.destroy()); head.destroy(); embers.stop();
        this.scene.time.delayedCall(700, () => embers.destroy());
      },
    });
  }

  private createFireBurst(x: number, y: number, count: number): void {
    const emitter = this.scene.add.particles(x, y, 'particle_flame', {
      speed: { min: 50, max: 150 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 300,
      blendMode: Phaser.BlendModes.ADD,
      quantity: count,
      emitting: false,
      tint: [0xff6600, 0xff3300, 0xffcc00],
    });
    emitter.setDepth(250);
    emitter.explode();

    this.scene.time.delayedCall(400, () => emitter.destroy());
  }

  flameJet(from: Position, to: Position, duration: number = 800): void {
    const angle = Phaser.Math.Angle.Between(from.x, from.y, to.x, to.y);
    const distance = Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y);

    const emitter = this.scene.add.particles(from.x, from.y, 'particle_flame', {
      speed: { min: 200, max: 400 },
      angle: { min: Phaser.Math.RadToDeg(angle) - 15, max: Phaser.Math.RadToDeg(angle) + 15 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: { min: 200, max: 400 },
      blendMode: Phaser.BlendModes.ADD,
      frequency: 10,
      quantity: 5,
      tint: [0xff6600, 0xff4400, 0xffaa00, 0xff2200],
    });
    emitter.setDepth(280);

    this.scene.time.delayedCall(duration, () => {
      emitter.stop();
      this.scene.time.delayedCall(500, () => emitter.destroy());
    });
  }

  lightningChain(points: Position[], color: number = 0x66ccff): void {
    const graphics = this.scene.add.graphics();
    graphics.setDepth(290);

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];

      this.drawLightningBolt(graphics, { x: p1.x, y: p1.y - 150 }, p1, color, 8);
      this.drawLightningBolt(graphics, p1, p2, color, 8);

      const spark = this.scene.add.particles(p2.x, p2.y, 'particle_spark', {
        speed: { min: 50, max: 100 },
        scale: { start: 0.6, end: 0 },
        alpha: { start: 1, end: 0 },
        lifespan: 200,
        blendMode: Phaser.BlendModes.ADD,
        quantity: 5,
        emitting: false,
        tint: color,
      });
      spark.setDepth(295);
      spark.explode();
      this.scene.time.delayedCall(300, () => spark.destroy());
    }

    this.scene.tweens.add({
      targets: graphics,
      alpha: 0,
      duration: 550,
      onComplete: () => graphics.destroy(),
    });
  }

  private drawLightningBolt(
    graphics: Phaser.GameObjects.Graphics,
    from: Position,
    to: Position,
    color: number,
    segments: number
  ): void {
    const points: Position[] = [from];

    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      const baseX = from.x + (to.x - from.x) * t;
      const baseY = from.y + (to.y - from.y) * t;
      const offset = (Math.random() - 0.5) * 20;
      const perpX = -(to.y - from.y);
      const perpY = to.x - from.x;
      const len = Math.sqrt(perpX * perpX + perpY * perpY);

      points.push({
        x: baseX + (perpX / len) * offset,
        y: baseY + (perpY / len) * offset,
      });
    }
    points.push(to);

    graphics.lineStyle(18, color, 0.25);
    graphics.beginPath();
    graphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      graphics.lineTo(points[i].x, points[i].y);
    }
    graphics.strokePath();

    graphics.lineStyle(5, 0xeeffff, 1);
    graphics.beginPath();
    graphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      graphics.lineTo(points[i].x, points[i].y);
    }
    graphics.strokePath();
  }

  arrowRain(centerX: number, centerY: number, radius: number, count: number = 20): void {
    for (let i = 0; i < count; i++) {
      const delay = Math.random() * 500;
      const targetX = centerX + (Math.random() - 0.5) * radius * 2;
      const targetY = centerY + (Math.random() - 0.5) * radius * 2;
      const startX = targetX + (Math.random() - 0.5) * 50;
      const startY = targetY - 150 - Math.random() * 50;

      this.scene.time.delayedCall(delay, () => {
        const arrow = this.scene.add.container(startX, startY);

        const shaft = this.scene.add.graphics();
        shaft.fillStyle(0x8b4513, 1);
        shaft.fillRect(-1, -12, 2, 24);

        const head = this.scene.add.graphics();
        head.fillStyle(0x444444, 1);
        head.fillTriangle(0, -16, -4, -8, 4, -8);

        const feather = this.scene.add.graphics();
        feather.fillStyle(0xeeeeee, 0.8);
        feather.fillTriangle(-3, 10, 0, 6, 0, 14);
        feather.fillTriangle(3, 10, 0, 6, 0, 14);

        arrow.add([shaft, head, feather]);
        arrow.setDepth(270).setScale(1.8);

        const angle = Phaser.Math.Angle.Between(startX, startY, targetX, targetY);
        arrow.setRotation(angle + Math.PI / 2);

        this.scene.tweens.add({
          targets: arrow,
          x: targetX,
          y: targetY,
          duration: 200,
          ease: 'Quad.easeIn',
          onComplete: () => {
            this.createImpactSpark(targetX, targetY, 0xffcc00);
            arrow.destroy();
          },
        });
      });
    }
  }

  shockwaveRoar(x: number, y: number, maxRadius: number = 120): void {
    const ring = this.scene.add.graphics();
    ring.setDepth(260);

    let currentRadius = 20;
    const expandSpeed = 400;

    const update = this.scene.time.addEvent({
      delay: 16,
      callback: () => {
        currentRadius += expandSpeed * 0.016;

        ring.clear();
        const alpha = Math.max(0, 1 - currentRadius / maxRadius);
        ring.lineStyle(8 * alpha + 2, 0xffcc00, alpha);
        ring.strokeCircle(x, y, currentRadius);

        ring.lineStyle(4 * alpha + 1, 0xffffff, alpha * 0.5);
        ring.strokeCircle(x, y, currentRadius * 0.9);

        if (currentRadius >= maxRadius) {
          update.destroy();
          ring.destroy();
        }
      },
      loop: true,
    });

    const textEffect = this.scene.add.text(x, y - 30, '喝！', {
      fontFamily: GAME_CONFIG.typography.brush,
      fontSize: '32px',
      color: '#ffcc00',
      stroke: '#000000',
      strokeThickness: 4,
    });
    textEffect.setOrigin(0.5);
    textEffect.setDepth(265);
    textEffect.setAlpha(0);

    this.scene.tweens.add({
      targets: textEffect,
      alpha: 1,
      y: y - 60,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: textEffect,
          alpha: 0,
          y: y - 80,
          duration: 400,
          onComplete: () => textEffect.destroy(),
        });
      },
    });
  }

  crescentSlash(from: Position, angle: number, radius: number = 100): void {
    const slash = this.scene.add.graphics();
    slash.setDepth(275);
    slash.setPosition(from.x, from.y);

    const startAngle = angle - Math.PI / 3;
    const endAngle = angle + Math.PI / 3;

    let progress = 0;
    const duration = 200;

    const trail = this.scene.add.graphics();
    trail.setDepth(270);

    const update = this.scene.time.addEvent({
      delay: 16,
      callback: () => {
        progress += 16 / duration;

        slash.clear();
        trail.clear();

        if (progress <= 1) {
          const currentAngle = startAngle + (endAngle - startAngle) * progress;

          slash.lineStyle(6, 0xffffff, 1);
          slash.beginPath();
          slash.arc(from.x, from.y, radius, startAngle, currentAngle, false);
          slash.strokePath();

          slash.lineStyle(3, 0x88ccff, 0.8);
          slash.beginPath();
          slash.arc(from.x, from.y, radius * 0.95, startAngle, currentAngle, false);
          slash.strokePath();

          trail.lineStyle(10, 0x4488ff, 0.3);
          trail.beginPath();
          trail.arc(from.x, from.y, radius, startAngle, currentAngle, false);
          trail.strokePath();
        } else {
          const fadeProgress = (progress - 1) * 2;
          const alpha = Math.max(0, 1 - fadeProgress);

          slash.lineStyle(6, 0xffffff, alpha);
          slash.beginPath();
          slash.arc(from.x, from.y, radius, startAngle, endAngle, false);
          slash.strokePath();

          if (alpha <= 0) {
            update.destroy();
            slash.destroy();
            trail.destroy();
          }
        }
      },
      loop: true,
    });

    for (let i = 0; i < 10; i++) {
      const sparkAngle = startAngle + (endAngle - startAngle) * (i / 10);
      const sparkX = from.x + Math.cos(sparkAngle) * radius;
      const sparkY = from.y + Math.sin(sparkAngle) * radius;

      this.scene.time.delayedCall(i * 20, () => {
        this.createImpactSpark(sparkX, sparkY, 0x88ccff);
      });
    }
  }

  chargeAttack(from: Position, to: Position, callback?: () => void): void {
    const charger = this.scene.add.container(from.x, from.y);

    const blur = this.scene.add.graphics();
    blur.fillStyle(0xffcc00, 0.3);
    blur.fillCircle(0, 0, 25);

    const core = this.scene.add.graphics();
    core.fillStyle(0xffffff, 1);
    core.fillCircle(0, 0, 10);

    charger.add([blur, core]);
    charger.setDepth(280);

    const trail = this.scene.add.particles(from.x, from.y, 'particle_spark', {
      speed: { min: 10, max: 30 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 200,
      blendMode: Phaser.BlendModes.ADD,
      frequency: 20,
      tint: 0xffcc00,
    });
    trail.startFollow(charger);
    trail.setDepth(275);

    const duration = 150;

    this.scene.tweens.add({
      targets: charger,
      x: to.x,
      y: to.y,
      duration: duration,
      ease: 'Quad.easeIn',
      onComplete: () => {
        trail.stop();
        this.createImpactBurst(to.x, to.y, 0xffcc00);
        charger.destroy();
        this.scene.time.delayedCall(300, () => trail.destroy());
        if (callback) callback();
      },
    });
  }

  createImpactSpark(x: number, y: number, color: number): void {
    const flash = this.scene.add.image(x, y, 'fire_glow').setTint(color)
      .setScale(0.65).setBlendMode(Phaser.BlendModes.ADD).setDepth(299);
    this.scene.tweens.add({ targets: flash, alpha: 0, scale: 0.1, duration: 220, onComplete: () => flash.destroy() });
    const spark = this.scene.add.particles(x, y, 'particle_spark', {
      speed: { min: 30, max: 80 },
      scale: { start: 0.4, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 150,
      blendMode: Phaser.BlendModes.ADD,
      quantity: 4,
      emitting: false,
      tint: color,
    });
    spark.setDepth(300);
    spark.explode();
    this.scene.time.delayedCall(200, () => spark.destroy());
  }

  createImpactBurst(x: number, y: number, color: number): void {
    const burst = this.scene.add.particles(x, y, 'particle_circle', {
      speed: { min: 80, max: 200 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 300,
      blendMode: Phaser.BlendModes.ADD,
      quantity: 12,
      emitting: false,
      tint: color,
    });
    burst.setDepth(300);
    burst.explode();
    this.scene.time.delayedCall(400, () => burst.destroy());
  }

  inkSplat(x: number, y: number): void {
    const splat = this.scene.add.graphics();
    splat.setDepth(200);

    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 2 + Math.random() * 7;
      const size = 1 + Math.random() * 3;
      const px = x + Math.cos(angle) * dist;
      const py = y + Math.sin(angle) * dist;

      splat.fillStyle(0x1a1a1a, 0.35);
      splat.fillCircle(px, py, size);
    }

    this.scene.tweens.add({
      targets: splat,
      alpha: 0,
      duration: 300,
      onComplete: () => splat.destroy(),
    });
  }

  levelUpGlow(x: number, y: number, level: number): void {
    const colors: Record<number, number> = {
      2: 0x7cb342,
      3: 0x42a5f5,
      4: 0xab47bc,
      5: 0xff9800,
    };

    const color = colors[level] || 0xffffff;

    const ring = this.scene.add.graphics();
    ring.setDepth(250);

    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 400,
      ease: 'Quad.easeOut',
      onUpdate: (tween) => {
        const progress = tween.getValue() ?? 0;
        const radius = 20 + progress * 30;
        const alpha = 1 - progress;

        ring.clear();
        ring.lineStyle(3, color, alpha);
        ring.strokeCircle(x, y, radius);
        ring.lineStyle(6, 0xffffff, alpha * 0.5);
        ring.strokeCircle(x, y, radius * 0.9);
      },
      onComplete: () => ring.destroy(),
    });

    const sparks = this.scene.add.particles(x, y, 'particle_spark', {
      speed: { min: 50, max: 120 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 400,
      blendMode: Phaser.BlendModes.ADD,
      quantity: 8,
      emitting: false,
      tint: [color, 0xffffff],
    });
    sparks.setDepth(255);
    sparks.explode();
    this.scene.time.delayedCall(500, () => sparks.destroy());
  }

  highLevelAttack(from: Position, to: Position, level: number, tileType: string): void {
    if (level >= 4) {
      if (tileType === 'bow') {
        this.arrowRain(to.x, to.y, 40, 8);
      } else if (tileType === 'sword') {
        const angle = Phaser.Math.Angle.Between(from.x, from.y, to.x, to.y);
        this.crescentSlash(from, angle, 60);
      } else if (tileType === 'spear') {
        this.chargeAttack(from, to);
      } else if (tileType === 'cavalry') {
        this.chargeAttack(from, to, () => {
          this.createImpactBurst(to.x, to.y, 0xffcc00);
        });
      }
    } else if (level >= 3) {
      const color = level === 3 ? 0x42a5f5 : 0xab47bc;
      this.createImpactSpark(to.x, to.y, color);
    }
  }

  generalSkillEffect(generalId: string, position: Position, pathPoints?: Position[]): void {
    switch (generalId) {
      case 'zhugeliang':
      case 'zhouyu':
        if (pathPoints && pathPoints.length > 0) {
          this.fireDragon(pathPoints, 1500);
        } else {
          this.flameJet(position, { x: position.x + 100, y: position.y }, 1000);
        }
        break;

      case 'zhangfei':
        this.shockwaveRoar(position.x, position.y, 150);
        break;

      case 'guanyu':
        this.crescentSlash(position, 0, 120);
        break;

      case 'huangzhong':
        this.arrowRain(position.x + 80, position.y, 100, 25);
        break;

      case 'zhaoyun':
        this.chargeAttack(
          position,
          { x: position.x + 150, y: position.y },
          () => this.createImpactBurst(position.x + 150, position.y, 0xffffff)
        );
        break;

      case 'dianwei':
        this.shockwaveRoar(position.x, position.y, 100);
        this.scene.time.delayedCall(200, () => {
          this.shockwaveRoar(position.x, position.y, 80);
        });
        break;

      case 'caocao':
        this.levelUpGlow(position.x, position.y, 5);
        break;

      case 'lvbu':
        this.crescentSlash(position, -Math.PI / 4, 100);
        this.scene.time.delayedCall(150, () => {
          this.crescentSlash(position, Math.PI / 4, 100);
        });
        break;

      default:
        this.createImpactBurst(position.x, position.y, 0xffcc00);
    }
  }

  destroy(): void {
    this.particlePools.forEach((pool) => {
      pool.forEach((emitter) => emitter.destroy());
    });
    this.particlePools.clear();
    this.activeEffects.forEach((effect) => effect.destroy());
    this.activeEffects = [];
  }
}

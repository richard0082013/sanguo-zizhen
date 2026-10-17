import type { EnemyType, BossConfig } from './enemies';
import { BOSSES } from './enemies';

export interface WaveEnemy {
  type: EnemyType;
  count: number;
  delay: number;
  healthMultiplier?: number;
}

export interface WaveConfig {
  id: number;
  enemies: WaveEnemy[];
  spawnInterval: number;
  boss?: BossConfig;
  isBossWave: boolean;
}

export const WAVES: WaveConfig[] = [
  {
    id: 1,
    enemies: [{ type: 'infantry', count: 12, delay: 0 }],
    spawnInterval: 500,
    isBossWave: false,
  },
  {
    id: 2,
    enemies: [
      { type: 'infantry', count: 8, delay: 0 },
      { type: 'cavalry', count: 4, delay: 2000 },
    ],
    spawnInterval: 500,
    isBossWave: false,
  },
  {
    id: 3,
    enemies: [
      { type: 'infantry', count: 6, delay: 0 },
      { type: 'cavalry', count: 3, delay: 1500 },
    ],
    spawnInterval: 500,
    isBossWave: false,
  },
  {
    id: 4,
    enemies: [
      { type: 'infantry', count: 5, delay: 0 },
      { type: 'shield', count: 2, delay: 2000 },
      { type: 'cavalry', count: 3, delay: 3000 },
    ],
    spawnInterval: 500,
    isBossWave: false,
  },
  {
    id: 5,
    enemies: [
      { type: 'infantry', count: 6, delay: 0 },
      { type: 'shield', count: 3, delay: 1500 },
      { type: 'mage', count: 1, delay: 3000 },
    ],
    spawnInterval: 500,
    isBossWave: false,
  },
  {
    id: 6,
    enemies: [{ type: 'infantry', count: 10, delay: 0 }],
    spawnInterval: 500,
    boss: BOSSES[0],
    isBossWave: true,
  },
  {
    id: 7,
    enemies: [
      { type: 'infantry', count: 8, delay: 0, healthMultiplier: 1.2 },
      { type: 'cavalry', count: 4, delay: 2000 },
      { type: 'shield', count: 3, delay: 3000 },
    ],
    spawnInterval: 500,
    isBossWave: false,
  },
  {
    id: 8,
    enemies: [
      { type: 'shield', count: 4, delay: 0, healthMultiplier: 1.3 },
      { type: 'mage', count: 2, delay: 2000 },
      { type: 'elite', count: 2, delay: 4000 },
    ],
    spawnInterval: 500,
    isBossWave: false,
  },
  {
    id: 9,
    enemies: [
      { type: 'cavalry', count: 6, delay: 0, healthMultiplier: 1.3 },
      { type: 'infantry', count: 6, delay: 1500 },
      { type: 'mage', count: 2, delay: 3000 },
    ],
    spawnInterval: 500,
    isBossWave: false,
  },
  {
    id: 10,
    enemies: [
      { type: 'infantry', count: 8, delay: 0, healthMultiplier: 1.5 },
      { type: 'shield', count: 4, delay: 2000 },
      { type: 'elite', count: 2, delay: 4000 },
    ],
    spawnInterval: 500,
    isBossWave: false,
  },
  {
    id: 11,
    enemies: [
      { type: 'cavalry', count: 8, delay: 0, healthMultiplier: 1.5 },
      { type: 'shield', count: 5, delay: 1500 },
      { type: 'mage', count: 3, delay: 3000 },
      { type: 'elite', count: 2, delay: 5000 },
    ],
    spawnInterval: 500,
    isBossWave: false,
  },
  {
    id: 12,
    enemies: [
      { type: 'infantry', count: 8, delay: 0, healthMultiplier: 1.8 },
      { type: 'cavalry', count: 6, delay: 2000 },
      { type: 'shield', count: 4, delay: 3000 },
      { type: 'elite', count: 2, delay: 5000 },
    ],
    spawnInterval: 500,
    isBossWave: false,
  },
  {
    id: 13,
    enemies: [{ type: 'infantry', count: 10, delay: 0 }],
    spawnInterval: 500,
    boss: BOSSES[1],
    isBossWave: true,
  },
];

export function getWaveById(id: number): WaveConfig | undefined {
  return WAVES.find((w) => w.id === id);
}

export const TOTAL_WAVES = WAVES.length;

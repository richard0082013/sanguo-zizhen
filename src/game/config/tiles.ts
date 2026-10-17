import { GENERALS } from './generals';
export type TileType = 'sword' | 'spear' | 'bow' | 'cavalry' | 'general' | 'shovel';

export interface TileConfig {
  type: TileType;
  char: string;
  name: string;
  color: string;
  attackRange: number;
  attackSpeed: number;
  baseDamage: number;
  isRanged: boolean;
}

export const TILE_CONFIGS: Record<Exclude<TileType, 'general' | 'shovel'>, TileConfig> = {
  sword: {
    type: 'sword',
    char: '刀',
    name: '刀兵',
    color: '#CD5C5C',
    attackRange: 75,
    attackSpeed: 1000,
    baseDamage: 40,
    isRanged: false,
  },
  spear: {
    type: 'spear',
    char: '枪',
    name: '枪兵',
    color: '#4682B4',
    attackRange: 110,
    attackSpeed: 1200,
    baseDamage: 44,
    isRanged: false,
  },
  bow: {
    type: 'bow',
    char: '弓',
    name: '弓兵',
    color: '#228B22',
    attackRange: 150,
    attackSpeed: 1500,
    baseDamage: 40,
    isRanged: true,
  },
  cavalry: {
    type: 'cavalry',
    char: '骑',
    name: '骑兵',
    color: '#DAA520',
    attackRange: 75,
    attackSpeed: 800,
    baseDamage: 48,
    isRanged: false,
  },
};

export const SHOVEL_CONFIG = {
  type: 'shovel' as const,
  char: '铲',
  name: '铲子',
  color: '#8B8B00',
};

export const MAX_TILE_LEVEL = 5;

export function getLevelMultiplier(level: number): number {
  return Math.pow(1.8, level - 1);
}

export function getTileDamage(type: Exclude<TileType, 'general' | 'shovel'>, level: number): number {
  return Math.floor(TILE_CONFIGS[type].baseDamage * getLevelMultiplier(level));
}

export function getTileAttackSpeed(
  type: Exclude<TileType, 'general' | 'shovel'>,
  level: number
): number {
  return Math.floor(TILE_CONFIGS[type].attackSpeed / (1 + (level - 1) * 0.1));
}

// Range stays tied to the weapon class at every soldier tier.
export function getTileRange(type: TileType, generalId?: string): number {
  if (type === 'general') return GENERALS.find(g => g.id === generalId)?.attackRange ?? 0;
  return type === 'shovel' ? 0 : TILE_CONFIGS[type].attackRange;
}

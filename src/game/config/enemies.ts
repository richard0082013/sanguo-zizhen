export type EnemyType = 'infantry' | 'cavalry' | 'shield' | 'mage' | 'elite' | 'boss';

export interface EnemyConfig {
  type: EnemyType;
  name: string;
  char: string;
  health: number;
  speed: number;
  damage: number;
  rangedResist: number;
  meleeResist: number;
  reward: number;
  color: string;
  specialAbility?: EnemyAbility;
}

export interface EnemyAbility {
  type: 'heal' | 'speed' | 'stun' | 'shield';
  radius?: number;
  value?: number;
  duration?: number;
  cooldown?: number;
}

export const ENEMIES: Record<EnemyType, EnemyConfig> = {
  infantry: {
    type: 'infantry',
    name: '步兵',
    char: '兵',
    health: 100,
    speed: 24,
    damage: 1,
    rangedResist: 0,
    meleeResist: 0,
    reward: 2,
    color: '#8B4513',
  },
  cavalry: {
    type: 'cavalry',
    name: '轻骑',
    char: '骑',
    health: 60,
    speed: 40,
    damage: 1,
    rangedResist: 0,
    meleeResist: 0,
    reward: 2,
    color: '#4169E1',
  },
  shield: {
    type: 'shield',
    name: '盾兵',
    char: '盾',
    health: 150,
    speed: 30,
    damage: 1,
    rangedResist: 0.5,
    meleeResist: 0,
    reward: 2,
    color: '#708090',
  },
  mage: {
    type: 'mage',
    name: '术士',
    char: '术',
    health: 80,
    speed: 35,
    damage: 1,
    rangedResist: 0,
    meleeResist: 0.3,
    reward: 3,
    color: '#9932CC',
    specialAbility: {
      type: 'heal',
      radius: 60,
      value: 10,
      cooldown: 3000,
    },
  },
  elite: {
    type: 'elite',
    name: '精英',
    char: '将',
    health: 300,
    speed: 35,
    damage: 2,
    rangedResist: 0.2,
    meleeResist: 0.2,
    reward: 5,
    color: '#FFD700',
  },
  boss: {
    type: 'boss',
    name: 'BOSS',
    char: '王',
    health: 1000,
    speed: 25,
    damage: 3,
    rangedResist: 0.3,
    meleeResist: 0.3,
    reward: 16,
    color: '#FF0000',
    specialAbility: {
      type: 'stun',
      radius: 100,
      duration: 1500,
      cooldown: 8000,
    },
  },
};

export interface BossConfig {
  id: string;
  name: string;
  char: string;
  health: number;
  speed: number;
  abilityName: string;
  ability: EnemyAbility;
  color: string;
}

export const BOSSES: BossConfig[] = [
  {
    id: 'zhangliang',
    name: '张梁',
    char: '梁',
    health: 800,
    speed: 30,
    abilityName: '摄魂',
    ability: {
      type: 'stun',
      radius: 120,
      duration: 1500,
      cooldown: 6000,
    },
    color: '#8B0000',
  },
  {
    id: 'dongzhuo',
    name: '董卓',
    char: '卓',
    health: 1500,
    speed: 20,
    abilityName: '暴虐',
    ability: {
      type: 'shield',
      value: 200,
      cooldown: 10000,
    },
    color: '#4B0082',
  },
];

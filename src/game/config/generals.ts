export type Faction = 'shu' | 'wei' | 'wu' | 'qun';

export interface GeneralConfig {
  id: string;
  name: string;
  chars: string[];
  faction: Faction;
  role: string;
  skillName: string;
  skillDescription: string;
  cooldown: number;
  attackRange: number;
  skillEffect: GeneralSkillEffect;
}

export interface GeneralSkillEffect {
  type: 'damage' | 'stun' | 'buff' | 'economy' | 'aoe' | 'burn' | 'taunt' | 'summon';
  damage?: number;
  duration?: number;
  radius?: number;
  buffType?: 'attackSpeed' | 'damage';
  buffValue?: number;
  bonusBuns?: number;
  piercing?: boolean;
}

export const GENERALS: GeneralConfig[] = [
  {
    id: 'zhaoyun',
    attackRange: 110,
    name: '赵云',
    chars: ['赵', '云'],
    faction: 'shu',
    role: 'single-target',
    skillName: '七进七出',
    skillDescription: '冲刺穿透路径,沿途造成伤害',
    cooldown: 8000,
    skillEffect: {
      type: 'damage',
      damage: 150,
      piercing: true,
    },
  },
  {
    id: 'zhangfei',
    attackRange: 90,
    name: '张飞',
    chars: ['张', '飞'],
    faction: 'shu',
    role: 'control',
    skillName: '当阳喝',
    skillDescription: '范围眩晕1.5秒',
    cooldown: 10000,
    skillEffect: {
      type: 'stun',
      duration: 1500,
      radius: 120,
    },
  },
  {
    id: 'guanyu',
    attackRange: 100,
    name: '关羽',
    chars: ['关', '羽'],
    faction: 'shu',
    role: 'burst',
    skillName: '青龙斩',
    skillDescription: '前方扇形高伤害,斩杀低血敌人',
    cooldown: 7000,
    skillEffect: {
      type: 'aoe',
      damage: 200,
      radius: 100,
    },
  },
  {
    id: 'huangzhong',
    attackRange: 240,
    name: '黄忠',
    chars: ['黄', '忠'],
    faction: 'shu',
    role: 'ranged',
    skillName: '百步穿杨',
    skillDescription: '全屏随机多箭',
    cooldown: 6000,
    skillEffect: {
      type: 'damage',
      damage: 80,
    },
  },
  {
    id: 'liubei',
    attackRange: 105,
    name: '刘备',
    chars: ['刘', '备'],
    faction: 'shu',
    role: 'support',
    skillName: '仁德',
    skillDescription: '相邻单位攻速+20%',
    cooldown: 12000,
    skillEffect: {
      type: 'buff',
      buffType: 'attackSpeed',
      buffValue: 0.2,
      duration: 5000,
      radius: 80,
    },
  },
  {
    id: 'zhugeliang',
    attackRange: 220,
    name: '诸葛亮',
    chars: ['诸', '葛', '亮'],
    faction: 'shu',
    role: 'mage',
    skillName: '借东风',
    skillDescription: '东风雷阵连锁轰击',
    cooldown: 10000,
    skillEffect: {
      type: 'burn',
      damage: 30,
      duration: 3000,
      radius: 60,
    },
  },
  {
    id: 'caocao',
    attackRange: 140,
    name: '曹操',
    chars: ['曹', '操'],
    faction: 'wei',
    role: 'economy',
    skillName: '虎豹援军',
    skillDescription: '召唤虎豹骑突击敌军',
    cooldown: 8500,
    skillEffect: {
      type: 'summon',
      damage: 85,
      bonusBuns: 5,
    },
  },
  {
    id: 'dianwei',
    attackRange: 80,
    name: '典韦',
    chars: ['典', '韦'],
    faction: 'wei',
    role: 'tank',
    skillName: '古之恶来',
    skillDescription: '嘲讽并减速周围敌人',
    cooldown: 9000,
    skillEffect: {
      type: 'taunt',
      duration: 2000,
      radius: 80,
    },
  },
  {
    id: 'xiahoudun',
    attackRange: 85,
    name: '夏侯惇',
    chars: ['夏', '侯', '惇'],
    faction: 'wei',
    role: 'counter',
    skillName: '拔矢啖睛',
    skillDescription: '被控时免疫并反伤',
    cooldown: 8500,
    skillEffect: {
      type: 'damage',
      damage: 100,
    },
  },
  {
    id: 'zhouyu',
    attackRange: 200,
    name: '周瑜',
    chars: ['周', '瑜'],
    faction: 'wu',
    role: 'mage',
    skillName: '火攻',
    skillDescription: '引燃敌人,可蔓延',
    cooldown: 8000,
    skillEffect: {
      type: 'burn',
      damage: 40,
      duration: 4000,
      radius: 50,
    },
  },
  {
    id: 'sunshangxiang',
    attackRange: 230,
    name: '孙尚香',
    chars: ['孙', '尚', '香'],
    faction: 'wu',
    role: 'ranged',
    skillName: '弓腰姬',
    skillDescription: '攻速随连击递增',
    cooldown: 8500,
    skillEffect: {
      type: 'buff',
      buffType: 'attackSpeed',
      buffValue: 0.1,
    },
  },
  {
    id: 'lvbu',
    attackRange: 115,
    name: '吕布',
    chars: ['吕', '布'],
    faction: 'qun',
    role: 'dps',
    skillName: '无双',
    skillDescription: '超高伤害,占2格,不吃羁绊',
    cooldown: 6000,
    skillEffect: {
      type: 'damage',
      damage: 300,
      radius: 60,
    },
  },
];

export function getGeneralById(id: string): GeneralConfig | undefined {
  return GENERALS.find((g) => g.id === id);
}

export function getGeneralByChars(chars: string[]): GeneralConfig | undefined {
  return GENERALS.find(
    (g) => g.chars.length === chars.length && g.chars.every((c, i) => c === chars[i])
  );
}

export function getAllGeneralChars(): string[] {
  const charSet = new Set<string>();
  GENERALS.forEach((g) => g.chars.forEach((c) => charSet.add(c)));
  return Array.from(charSet);
}

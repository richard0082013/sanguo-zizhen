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
  skillEffect: GeneralSkillEffect;
}

export interface GeneralSkillEffect {
  type: 'damage' | 'stun' | 'buff' | 'economy' | 'aoe' | 'burn' | 'taunt';
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
    name: '诸葛亮',
    chars: ['诸', '葛', '亮'],
    faction: 'shu',
    role: 'mage',
    skillName: '借东风',
    skillDescription: '路径段落持续火焰',
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
    name: '曹操',
    chars: ['曹', '操'],
    faction: 'wei',
    role: 'economy',
    skillName: '挟天子',
    skillDescription: '每波额外获得馒头',
    cooldown: 0,
    skillEffect: {
      type: 'economy',
      bonusBuns: 5,
    },
  },
  {
    id: 'dianwei',
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
    name: '夏侯惇',
    chars: ['夏', '侯', '惇'],
    faction: 'wei',
    role: 'counter',
    skillName: '拔矢啖睛',
    skillDescription: '被控时免疫并反伤',
    cooldown: 0,
    skillEffect: {
      type: 'damage',
      damage: 100,
    },
  },
  {
    id: 'zhouyu',
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
    name: '孙尚香',
    chars: ['孙', '尚', '香'],
    faction: 'wu',
    role: 'ranged',
    skillName: '弓腰姬',
    skillDescription: '攻速随连击递增',
    cooldown: 0,
    skillEffect: {
      type: 'buff',
      buffType: 'attackSpeed',
      buffValue: 0.1,
    },
  },
  {
    id: 'lvbu',
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

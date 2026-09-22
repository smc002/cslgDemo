import type { Building, Campaign } from './campaign';

export const CITY_MAX_LEVEL = 10;
export const CITY_STAGES = [1, 4, 8] as const;
export type CityKind =
  | 'hq'
  | 'power'
  | 'comms'
  | 'medical'
  | 'factory'
  | 'research'
  | 'barracks'
  | 'armory'
  | 'drone'
  | 'warehouse'
  | 'garage'
  | 'workshop';
export type SupportKind = Exclude<CityKind, 'workshop' | 'factory'>;
export type CityMeta = {
  id: CityKind;
  name: string;
  role: string;
  live: boolean;
  unlock: number;
  cost: number;
  x: number;
  y: number;
  width: number;
  height: number;
  stages: [string, string, string];
  plan: string;
};
// Coordinates are normalized to the scene, excluding the global HUD and navigation.
export const CITY_BUILDINGS: CityMeta[] = [
  {
    id: 'hq',
    name: '指挥部',
    role: '统筹基地建设',
    live: true,
    unlock: 1,
    cost: 150,
    x: 29,
    y: 23,
    width: 45,
    height: 22,
    stages: ['临时指挥所', '加固指挥部', '战术指挥中心'],
    plan: '提升所有已开放设施的等级上限。',
  },
  {
    id: 'power',
    name: '能源站',
    role: '缩短生产周期',
    live: true,
    unlock: 2,
    cost: 100,
    x: 80,
    y: 21,
    width: 34,
    height: 17,
    stages: ['应急供电站', '混合能源站', '智能微电网'],
    plan: '每级缩短生产周期 2%，最高 20%。',
  },
  {
    id: 'comms',
    name: '通讯中心',
    role: '求救信号与任务',
    live: false,
    unlock: 2,
    cost: 0,
    x: 15,
    y: 39,
    width: 32,
    height: 18,
    stages: ['应急电台', '中继通讯站', '战术情报中心'],
    plan: '规划：基础求救信号 → 多线任务 → 禁区情报。',
  },
  {
    id: 'medical',
    name: '医疗站',
    role: '队员救治与恢复',
    live: false,
    unlock: 2,
    cost: 0,
    x: 44,
    y: 38,
    width: 34,
    height: 16,
    stages: ['野战医疗站', '防护医疗所', '再生医疗中心'],
    plan: '规划：基础救治 → 批量治疗 → 恢复强化。',
  },
  {
    id: 'factory',
    name: '黑金弹工厂',
    role: '为猎场供应弹药',
    live: true,
    unlock: 1,
    cost: 100,
    x: 81,
    y: 42,
    width: 37,
    height: 21,
    stages: ['修复弹药线', '装甲军工厂', '自动军械厂'],
    plan: '每批基础产量为 15 × 等级，初始周期 45 秒。',
  },
  {
    id: 'research',
    name: '研究所',
    role: '提升生产效率',
    live: true,
    unlock: 3,
    cost: 120,
    x: 16,
    y: 56,
    width: 30,
    height: 18,
    stages: ['样本研究室', '应用研究所', '禁区科技中心'],
    plan: '建成后生产量 +5%，每级再 +5%，最高 +50%。',
  },
  {
    id: 'barracks',
    name: '兵营',
    role: '队员驻扎与训练',
    live: false,
    unlock: 2,
    cost: 0,
    x: 46,
    y: 53,
    width: 34,
    height: 17,
    stages: ['集装箱营房', '加固训练营', '精锐驻防营'],
    plan: '规划：驻扎 → 训练席位 → 专项训练。',
  },
  {
    id: 'armory',
    name: '武器改装所',
    role: '武器与配件改装',
    live: false,
    unlock: 3,
    cost: 0,
    x: 82,
    y: 58,
    width: 33,
    height: 18,
    stages: ['维修工作台', '武器改装所', '精密军械中心'],
    plan: '规划：基础维修 → 配件装配 → 高级改装。',
  },
  {
    id: 'drone',
    name: '无人机库',
    role: '禁区侦察与派遣',
    live: false,
    unlock: 4,
    cost: 0,
    x: 17,
    y: 73,
    width: 35,
    height: 19,
    stages: ['临时停机棚', '侦察无人机库', '蜂群调度站'],
    plan: '规划：单机侦察 → 多队派遣 → 高阶区域探索。',
  },
  {
    id: 'warehouse',
    name: '物资仓库',
    role: '增加离线储量',
    live: true,
    unlock: 2,
    cost: 80,
    x: 47,
    y: 65,
    width: 33,
    height: 15,
    stages: ['物资堆场', '防护仓库', '自动物流库'],
    plan: '基础可存 20 批；每级增加 2 批，最高 40 批。',
  },
  {
    id: 'garage',
    name: '车辆维修站',
    role: '载具维修与改装',
    live: false,
    unlock: 4,
    cost: 0,
    x: 82,
    y: 72,
    width: 33,
    height: 17,
    stages: ['抢修车棚', '装甲维修站', '战术载具中心'],
    plan: '规划：抢修 → 装甲改装 → 战术模块。',
  },
  {
    id: 'workshop',
    name: '材料回收站',
    role: '回收废料产出建材',
    live: true,
    unlock: 1,
    cost: 100,
    x: 46,
    y: 78,
    width: 30,
    height: 15,
    stages: ['废料回收点', '机械回收站', '自动分拣中心'],
    plan: '每批基础产量为 10 × 等级，初始周期 30 秒。',
  },
];
export const cityMeta = (kind: CityKind) =>
  CITY_BUILDINGS.find((b) => b.id === kind)!;
export const cityStage = (level: number) =>
  level >= 8 ? 2 : level >= 4 ? 1 : 0;
export const cityArt = (kind: CityKind, level: number) =>
  `/assets/city-v08/${kind}-${cityStage(level)}.png`;
export function freshFacilities(now = 0): Record<SupportKind, Building> {
  return Object.fromEntries(
    CITY_BUILDINGS.filter((b) => b.id !== 'workshop' && b.id !== 'factory').map(
      (b) => [b.id, { level: b.id === 'hq' ? 1 : 0, collectedAt: now }],
    ),
  ) as Record<SupportKind, Building>;
}
export function cityBuilding(d: Campaign, kind: CityKind): Building {
  return kind === 'workshop' || kind === 'factory'
    ? d.city[kind]
    : d.city.facilities[kind];
}
export const cityCapacity = (d: Campaign) =>
  20 + 2 * cityBuilding(d, 'warehouse').level;
export const citySpeed = (d: Campaign) =>
  1 - 0.02 * cityBuilding(d, 'power').level;
export const cityYield = (d: Campaign) =>
  1 + 0.05 * cityBuilding(d, 'research').level;
export const cityCost = (d: Campaign, kind: CityKind) =>
  cityMeta(kind).cost * (cityBuilding(d, kind).level + 1);
export function cityUpgradeBlock(d: Campaign, kind: CityKind) {
  const meta = cityMeta(kind),
    b = cityBuilding(d, kind),
    hq = cityBuilding(d, 'hq').level;
  if (!d.city.unlocked) return '完成搜刮第 2 关后开放';
  if (!meta.live) return '专属玩法筹备中';
  if (b.level >= CITY_MAX_LEVEL) return '已满级';
  if (hq < meta.unlock) return `指挥部 Lv.${meta.unlock} 解锁`;
  if (kind !== 'hq' && b.level >= hq) return `先升级指挥部至 Lv.${b.level + 1}`;
  if (d.city.materials < cityCost(d, kind))
    return `还需 ${cityCost(d, kind) - d.city.materials} 建材`;
  return '';
}
export function cityEffect(d: Campaign, kind: CityKind, next = false) {
  const level = Math.min(
    CITY_MAX_LEVEL,
    cityBuilding(d, kind).level + (next ? 1 : 0),
  );
  switch (kind) {
    case 'hq':
      return `建筑等级上限 Lv.${level}`;
    case 'power':
      return `生产周期缩短 ${level * 2}%`;
    case 'warehouse':
      return `最多储存 ${20 + level * 2} 批物资`;
    case 'research':
      return `两座生产设施产量 +${level * 5}%`;
    case 'workshop':
      return `每批 ${Math.floor(level * 10 * cityYield(d))} 建材`;
    case 'factory':
      return `每批 ${Math.floor(level * 15 * cityYield(d))} 黑金弹`;
    default:
      return cityMeta(kind).plan;
  }
}

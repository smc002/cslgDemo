export type RecruitRarity = 'blue' | 'purple' | 'orange';
export type Quality = RecruitRarity | 'red';
export const QUALITIES: Quality[] = ['blue', 'purple', 'orange', 'red'];
export const QUALITY_NAMES = {
  blue: '蓝色',
  purple: '紫色',
  orange: '橙色',
  red: '红色',
};
export const QUALITY_COLORS = {
  blue: '#63caff',
  purple: '#c398ff',
  orange: '#ffc25e',
  red: '#ff7079',
};
function hero(
  id: string,
  index: number,
  name: string,
  rarity: RecruitRarity,
  role: string,
  art: string,
) {
  return {
    id,
    index,
    name,
    rarity,
    role,
    art,
    title: role,
    quote: '守住这条路，把希望带回基地。',
    grade: rarity === 'blue' ? 'R' : rarity === 'purple' ? 'SR' : 'SSR',
    color: QUALITY_COLORS[rarity],
  };
}
export const RECRUIT_HEROES = [
  hero('shield', 0, '铁壁队长', 'blue', '坦克', '/assets/recruit/shield.png'),
  hero('medic', 1, '医疗兵', 'blue', '治疗', '/assets/recruit/medic.png'),
  hero('drone', 2, '无人机手', 'blue', '输出', '/assets/recruit/drone.png'),
  hero(
    'samurai',
    3,
    '大刀战士',
    'purple',
    '坦克',
    '/assets/recruit/samurai.png',
  ),
  hero('guitar', 4, '吉他手', 'purple', '治疗', '/assets/recruit/guitar.png'),
  hero('assassin', 5, '暗影刺客', 'orange', '输出', ''),
  hero('minigun', 6, '重机枪手', 'orange', '坦克', ''),
  hero('priest', 7, '牧师', 'orange', '治疗', ''),
  hero('sniper', 8, '狙击手', 'purple', '输出', '/assets/recruit/sniper.png'),
];
export type RecruitId = string;
export type RecruitSave = {
  spent: number;
  owned: Record<string, number>;
  last: string[];
};
export const freshRecruit = (): RecruitSave => ({
  spent: 0,
  owned: Object.fromEntries(RECRUIT_HEROES.map((h) => [h.id, 0])),
  last: [],
});
export function rollOrangeHero(random = Math.random): string {
  const p = RECRUIT_HEROES.filter((h) => h.rarity === 'orange');
  return p[Math.min(p.length - 1, Math.floor(random() * p.length))].id;
}
export function rollHero(random = Math.random) {
  const n = random(),
    r = n < 0.7 ? 'blue' : n < 0.95 ? 'purple' : 'orange';
  const pool = RECRUIT_HEROES.filter((h) => h.rarity === r);
  const f =
    r === 'blue'
      ? n / 0.7
      : r === 'purple'
        ? (n - 0.7) / 0.25
        : (n - 0.95) / 0.05;
  return pool[Math.min(pool.length - 1, Math.floor(f * pool.length))].id;
}
export function ticketBalance(d: {
  ticketsEarned: number;
  recruit: RecruitSave;
}) {
  return Math.max(0, d.ticketsEarned - d.recruit.spent);
}
export function drawHeroes(
  d: { ticketsEarned: number; recruit: RecruitSave },
  count: number,
  random = Math.random,
) {
  if (![1, 10].includes(count) || ticketBalance(d) < count) return null;
  const ids = Array.from({ length: count }, () => rollHero(random));
  d.recruit.spent += count;
  ids.forEach((id) => d.recruit.owned[id]++);
  d.recruit.last = ids;
  return ids;
}

import { BALANCE, stageWaves } from './balance';

export type Element = 'ice' | 'fire';
export const ELEMENT_START_STAGE = 2;
export const ELEMENT_INTRO_SEEN = 'elements-intro';
export const ELEMENT_DAMAGE = 1.3;
export const ELEMENT_DEFENSE = 0.8;
// Healers (1, 4, 7) deliberately stay neutral. The initial recruit supplies ice.
export const HERO_ELEMENTS: readonly (Element | undefined)[] = [
  undefined, undefined, 'fire', 'ice', undefined, undefined, 'fire', undefined, 'ice',
];
export const ELEMENT_NAMES = { ice: '冰', fire: '火' } as const;
export const ELEMENT_COLORS = { ice: '#71dcff', fire: '#ff963f' } as const;
export const heroElement = (hero: number, stage: number) =>
  stage >= ELEMENT_START_STAGE ? HERO_ELEMENTS[hero] : undefined;
export const opposite = (element: Element): Element => element === 'ice' ? 'fire' : 'ice';
export const counters = (a?: Element, b?: Element) => !!a && !!b && a !== b;

export function elementalDamage(source: { hero: number; element?: Element }, target: { hero: number; element?: Element }) {
  if (!counters(source.element, target.element)) return 1;
  if (source.hero >= 0 && target.hero < 0) return ELEMENT_DAMAGE;
  if (source.hero < 0 && target.hero >= 0) return ELEMENT_DEFENSE;
  return 1;
}
export const stageLanes = (stage: number) => stage > BALANCE.thirdLane ? [0, 1, 2] : stage >= ELEMENT_START_STAGE ? [0, 1] : [1];

/** This same deterministic roster drives BOTH the preview and actual wave spawning. */
export function enemyWave(stage: number, lane: number, section: number) {
  const wave = (stage - 1) * BALANCE.wavesPerStage + section;
  const count = stage === 2 ? 3 : Math.min(7, 4 + Math.floor(wave / 2));
  const pattern = stage === 2 ? lane : (stage + lane) % 4;
  return Array.from({ length: count }, (_, n) => {
    const element: Element | undefined = stage < 2 ? undefined
      : pattern === 0 ? 'ice' : pattern === 1 ? 'fire'
      : pattern === 2 ? ((n + section) % 2 ? 'ice' : 'fire')
      : n === 0 ? undefined : n % 2 ? 'ice' : 'fire';
    return { kind: n === 0 ? 2 : n % 2, element };
  });
}
export function laneForecast(stage: number, lane: number) {
  if (!stageLanes(stage).includes(lane)) return [];
  const groups: { kind: number; element?: Element; count: number }[] = [];
  for (let section = 1; section <= stageWaves(stage); section++)
    for (const enemy of enemyWave(stage, lane, section)) {
      const group = groups.find(g => g.kind === enemy.kind && g.element === enemy.element);
      if (group) group.count++;
      else groups.push({ ...enemy, count: 1 });
    }
  return groups;
}
export function laneCoverage(stage: number, lane: number, lineup: number[]) {
  const enemies = [...new Set(laneForecast(stage, lane).map(e => e.element).filter((e): e is Element => !!e))];
  const heroes = lineup.slice(lane * 3, lane * 3 + 3).filter(h => h >= 0);
  const covered = enemies.filter(e => heroes.some(h => counters(heroElement(h, stage), e)));
  return { enemies, covered, complete: enemies.length > 0 && enemies.length === covered.length };
}
export function emptyCombatLanes(stage: number, lineup: number[]) {
  if (stage < ELEMENT_START_STAGE) return [];
  return stageLanes(stage).filter(lane => !lineup.slice(lane * 3, lane * 3 + 3).some(h => h >= 0 && ![1, 4, 7].includes(h)));
}

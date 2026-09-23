import type { Campaign } from './campaign';
import { cityMeta, nextCitySite } from './city';
import { pendingStory } from './prologue';

export type StrongGuideStep = {
  id: string;
  mode: string;
  target: string;
  text: string;
  roaming?: boolean;
};
export function strongGuideStep(d: Campaign): StrongGuideStep | undefined {
  if (!d.prologue.enabled || pendingStory(d)) return;
  const skipped = (id: string) => d.prologue.seen.includes(`guide-skip-${id}`);
  if (d.bestStage === 0 && d.tutorial === 0 && !skipped('start'))
    return {
      id: 'start',
      mode: 'merged',
      target: 'start-scavenge',
      text: '点击「开始搜刮」，小队向前出发',
    };
  if (d.bestStage >= 1 && d.hunt.economy.spentAmmo === 0 && !skipped('fire'))
    return {
      id: 'fire',
      mode: 'hunt',
      target: 'hunt-fire',
      text: '点击场内任意位置开火，按住可以连射',
      roaming: true,
    };
  if (
    d.hunt.expedition.points >= 200 &&
    !d.prologue.rewards.includes('recruit') &&
    !skipped('recruit')
  )
    return {
      id: 'recruit',
      mode: 'recruit',
      target: 'first-recruit',
      text: '点击招募，消耗 1 张券联络大刀战士',
    };
  if (d.city.unlocked && !d.city.factory.level) {
    const site = nextCitySite(d);
    if (site && !skipped(`build-${site}`))
      return {
        id: `build-${site}`,
        mode: 'city',
        target: `city-site-${site}`,
        text: `点击空地，建造${cityMeta(site).name}`,
      };
  }
}

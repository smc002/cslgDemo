import type { FX } from './simulation';
import { functional } from '../lib/hunt-economy';

/** Presentation only: never writes to the simulation or pays another reward. */
export function groupKillRewards(effects: FX[]): FX[] {
  const groups: FX[] = [];
  for (const e of effects) {
    if (e.kind !== 'kill' || e.points <= 0) continue;
    const special = functional(e.species);
    const group = groups.find(
      (g) =>
        functional(g.species) === special &&
        Math.abs(g.age - e.age) <= 0.3 &&
        Math.hypot(g.x - e.x, g.y - e.y) < 105,
    );
    if (group) group.points += e.points;
    else groups.push({ ...e });
  }
  // Keep every total, but merge crowded areas into the closest visible card.
  while (groups.length > 4) {
    const last = groups.pop()!;
    const sameTier = groups.filter(
      (g) => functional(g.species) === functional(last.species),
    );
    const closest = (sameTier.length ? sameTier : groups).reduce((a, b) =>
      Math.hypot(a.x - last.x, a.y - last.y) <
      Math.hypot(b.x - last.x, b.y - last.y)
        ? a
        : b,
    );
    closest.points += last.points;
  }
  return groups;
}

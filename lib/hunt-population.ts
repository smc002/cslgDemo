import { functional } from './hunt-economy';

export const SPECIAL_POPULATION = {
  maxShare: 0.25,
  maxSpecial: 5,
  maxPerFunctional: 2,
} as const;

type Actor = { kind: number };
const ordinaryPerSpecial =
  (1 - SPECIAL_POPULATION.maxShare) / SPECIAL_POPULATION.maxShare;
export const specialZombie = (kind: number) =>
  functional(kind) || kind === 9 || kind === 12;

/** Includes actors still walking in from an edge, so entry cannot bypass caps. */
export function specialPopulation(actors: readonly Actor[]) {
  const byKind: Record<number, number> = {};
  let ordinary = 0;
  let special = 0;
  for (const actor of actors) {
    if (specialZombie(actor.kind)) {
      special++;
      byKind[actor.kind] = (byKind[actor.kind] ?? 0) + 1;
    } else if (actor.kind >= 0 && actor.kind <= 3) ordinary++;
  }
  // S/(O+S) <= 1/4 is exactly S <= O/3; ordinary population is unchanged
  // when considering one additional special entrant.
  const capacity = Math.min(
    SPECIAL_POPULATION.maxSpecial,
    Math.floor(ordinary / ordinaryPerSpecial),
  );
  return {
    ordinary,
    special,
    total: actors.length,
    ratio: actors.length ? special / actors.length : 0,
    capacity,
    byKind,
    overLimit:
      special > capacity ||
      Object.entries(byKind).some(
        ([kind, count]) =>
          functional(Number(kind)) &&
          count > SPECIAL_POPULATION.maxPerFunctional,
      ),
  };
}

export function specialSpawnBlock(
  actors: readonly Actor[],
  kind: number,
): 'total' | 'ratio' | 'kind' | null {
  if (!specialZombie(kind)) return null;
  const state = specialPopulation(actors);
  if (state.special >= SPECIAL_POPULATION.maxSpecial) return 'total';
  if (state.special >= state.capacity) return 'ratio';
  if (
    functional(kind) &&
    (state.byKind[kind] ?? 0) >= SPECIAL_POPULATION.maxPerFunctional
  )
    return 'kind';
  return null;
}

/** Restore the ordinary backdrop gradually without flooding old crowded saves. */
export function needsOrdinaryReinforcement(actors: readonly Actor[]) {
  const state = specialPopulation(actors);
  return (
    state.ordinary <
    Math.ceil(
      Math.min(state.special, SPECIAL_POPULATION.maxSpecial) *
        ordinaryPerSpecial,
    )
  );
}

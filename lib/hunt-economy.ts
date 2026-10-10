/** All money is integer milli-points. This ledger is never exposed in player UI. */
export const ECONOMY = {
  version: 1,
  unit: 1000,
  ordinaryYield: 5080,
  rewardCoefficient: 3,
  // Former immediate shot XP now funds the shared special-encounter pool.
  // Applied once per spent round, outside the event-frequency coefficient.
  shotCorePerAmmo: 1,
  checkSeconds: 0.5,
  // An expensive pending target may admit two cheap encounters while saving.
  // The hard bound prevents cheap targets from starving weapon pickups.
  maxInterludes: 2,
  interludeMaxBudget: 260,
  courierAmmo: 1000,
  // 20% of the 2 x 5.08 baseline core value funds ammunition returns.
  // Ordinary kill value and the fixed refund stay intact when event funding increases.
  ammoReturnPerSpent: 2032,
} as const;
export const FUNCTIONAL = [4, 5, 6, 7, 8, 10, 11] as const;
// Emphasize scatter encounters and the shotgun pickup while retaining variety.
export const EVENT_WEIGHTS: Record<number, number> = {
  4: 1,
  5: 2,
  6: 8,
  7: 2,
  8: 2,
  10: 2,
  11: 12,
};
// Trial budgets include the monster's own points. Free-fire budgets use the
// first conditional-on-activation benchmark; real player hit data must calibrate them.
export const EVENT_BUDGET: Record<number, number> = {
  4: 2700,
  5: 180,
  6: 260,
  7: 240,
  8: 140,
  10: 1250,
  11: 1750,
};
export const functional = (kind: number) =>
  FUNCTIONAL.includes(kind as (typeof FUNCTIONAL)[number]);
export type EconomyActor = {
  id: number;
  kind: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  hit: number;
  seed: number;
  hitsLeft?: number;
  frozen?: number;
  eventId?: number;
  entry?: { x: number; y: number; vx: number; vy: number; side: number };
  patrol?: { speed: number; heading: number; turnAt: number; turns: number };
};
export type EconomyBullet = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  bounces: number;
  bonus: boolean;
  room: number;
  age: number;
  generation?: number;
  ignoreId?: number;
  chainDepth?: number;
  eventId?: number;
  receiptId?: number;
  shotId?: number;
};
export type RewardEvent = {
  id: number;
  kind: number;
  room: number;
  initial: number;
  left: number;
  paid: number;
  blocked: boolean;
  state: 'world' | 'stored' | 'active' | 'draining';
};
export type EconomySave = {
  version: 1;
  available: number;
  injected: number;
  compensation: number;
  migration: number;
  paid: number;
  spentAmmo: number;
  ammoReturnFunding: number;
  serial: number;
  shotSerial: number;
  nextKind: number | null;
  nextInterludes: number;
  checkLeft: number;
  events: Record<number, RewardEvent>;
  receipts: Record<number, { cost: number }>;
  runtime: {
    id: number;
    zombies: EconomyActor[];
    bullets: EconomyBullet[];
    spawnClock: number;
    intro: number;
  } | null;
  metrics: Record<
    number,
    {
      spawned: number;
      settled: number;
      budget: number;
      paid: number;
      refunded: number;
      capped: number;
    }
  >;
};
export const freshEconomy = (): EconomySave => ({
  version: 1,
  available: 0,
  injected: 0,
  compensation: 0,
  migration: 0,
  paid: 0,
  spentAmmo: 0,
  ammoReturnFunding: 0,
  serial: 0,
  shotSerial: 0,
  nextKind: null,
  nextInterludes: 0,
  checkLeft: ECONOMY.checkSeconds,
  events: {},
  receipts: {},
  runtime: null,
  metrics: {},
});
const int = (n: unknown, fallback = 0) =>
  typeof n === 'number' && Number.isSafeInteger(n) && n >= 0 ? n : fallback;
const multiplier = (n: unknown) =>
  [1, 5, 20, 100].includes(Number(n)) ? Number(n) : 1;

function weightedKind(choices: number[], random: () => number) {
  if (!choices.length) return null;
  const total = choices.reduce((sum, kind) => sum + EVENT_WEIGHTS[kind], 0);
  const value = random();
  let roll =
    (Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0) * total;
  for (const kind of choices) {
    roll -= EVENT_WEIGHTS[kind];
    if (roll < 0) return kind;
  }
  return choices.at(-1)!;
}

/**
 * Pick only funded encounters. A pending expensive candidate stays in place;
 * at most two cheap interludes can spend funds before it must finish saving.
 * Call commitRewardEncounter only after a successful spawn/reservation.
 */
export function selectRewardEncounter(
  e: EconomySave,
  room: number,
  eligibleKinds: readonly number[],
  random: () => number,
): number | null {
  const choices = [...new Set(eligibleKinds)].filter(functional);
  if (e.nextKind === null || !choices.includes(e.nextKind)) {
    e.nextKind = weightedKind(choices, random);
    e.nextInterludes = 0;
  }
  if (e.nextKind === null) return null;
  const cost = (kind: number) =>
    EVENT_BUDGET[kind] * multiplier(room) * ECONOMY.unit;
  if (e.available >= cost(e.nextKind)) return e.nextKind;
  if (int(e.nextInterludes) >= ECONOMY.maxInterludes) return null;
  // Wait until all cheap types are affordable so low-cost ice does not win
  // every interlude merely by reaching its funding threshold first.
  if (
    e.available <
    ECONOMY.interludeMaxBudget * multiplier(room) * ECONOMY.unit
  )
    return null;
  return weightedKind(
    choices.filter(
      (kind) =>
        kind !== e.nextKind &&
        EVENT_BUDGET[kind] <= ECONOMY.interludeMaxBudget &&
        e.available >= cost(kind),
    ),
    random,
  );
}

export function commitRewardEncounter(e: EconomySave, kind: number) {
  if (kind === e.nextKind) {
    e.nextKind = null;
    e.nextInterludes = 0;
  } else if (functional(kind) && e.nextKind !== null) {
    e.nextInterludes = Math.min(
      ECONOMY.maxInterludes,
      int(e.nextInterludes) + 1,
    );
  }
}

export function reserve(
  e: EconomySave,
  kind: number,
  room: number,
  legacy = false,
) {
  const amount = (EVENT_BUDGET[kind] ?? 0) * multiplier(room) * ECONOMY.unit;
  if (!amount || (!legacy && e.available < amount)) return null;
  if (legacy) e.migration += amount;
  else e.available -= amount;
  const id = ++e.serial;
  const event: RewardEvent = {
    id,
    kind,
    room: multiplier(room),
    initial: amount,
    left: amount,
    paid: 0,
    blocked: false,
    state: 'world',
  };
  e.events[id] = event;
  const stats = (e.metrics[kind] ??= {
    spawned: 0,
    settled: 0,
    budget: 0,
    paid: 0,
    refunded: 0,
    capped: 0,
  });
  stats.spawned++;
  stats.budget += amount;
  return event;
}
export function payEvent(
  e: EconomySave,
  id: number | undefined,
  points: number,
) {
  const event = id === undefined ? undefined : e.events[id];
  if (!event || event.blocked || !Number.isSafeInteger(points) || points < 0)
    return false;
  const cost = points * ECONOMY.unit;
  if (cost > event.left) {
    event.blocked = true;
    e.metrics[event.kind].capped++;
    return false;
  }
  event.left -= cost;
  event.paid += cost;
  e.paid += cost;
  e.metrics[event.kind].paid += cost;
  return true;
}
export function refundEvent(e: EconomySave, id: number) {
  const event = e.events[id];
  if (!event) return;
  e.available += event.left;
  const stats = e.metrics[event.kind];
  stats.settled++;
  stats.refunded += event.left;
  delete e.events[id];
}
export function receipt(e: EconomySave, cost: number) {
  if (!Number.isSafeInteger(cost) || cost <= 0)
    throw Error('Invalid paid ammunition');
  const deposit =
    cost *
    (ECONOMY.ordinaryYield * ECONOMY.rewardCoefficient +
      ECONOMY.shotCorePerAmmo * ECONOMY.unit);
  const ammoFunding = cost * ECONOMY.ammoReturnPerSpent;
  e.available += deposit - ammoFunding;
  e.ammoReturnFunding = (e.ammoReturnFunding ?? 0) + ammoFunding;
  e.injected += deposit;
  e.spentAmmo += cost;
  const id = ++e.shotSerial;
  e.receipts[id] = { cost };
  return id;
}
export function consumeReceipt(
  e: EconomySave,
  id: number | undefined,
  compensate: boolean,
) {
  if (id === undefined || !e.receipts[id]) return;
  if (compensate) {
    const amount = e.receipts[id].cost * ECONOMY.ordinaryYield;
    e.available += amount;
    e.compensation += amount;
  }
  delete e.receipts[id];
}
export function auditEconomy(e: EconomySave) {
  const reserved = Object.values(e.events).reduce((n, v) => n + v.left, 0);
  return {
    available: e.available,
    reserved,
    paid: e.paid,
    injected: e.injected,
    compensation: e.compensation,
    migration: e.migration,
    ammoReturnFunding: e.ammoReturnFunding ?? 0,
    difference:
      e.available +
      reserved +
      e.paid +
      (e.ammoReturnFunding ?? 0) -
      e.injected -
      e.compensation -
      e.migration,
  };
}
/** Malformed runtime is discarded; reservations without owners are refunded by the simulation. */
export function parseEconomy(raw: unknown): EconomySave | null {
  if (!raw || typeof raw !== 'object' || (raw as EconomySave).version !== 1)
    return null;
  const r = raw as EconomySave,
    e = freshEconomy();
  for (const key of [
    'available',
    'injected',
    'compensation',
    'migration',
    'paid',
    'spentAmmo',
    'ammoReturnFunding',
    'serial',
    'shotSerial',
  ] as const)
    e[key] = int(r[key]);
  e.checkLeft =
    typeof r.checkLeft === 'number' && Number.isFinite(r.checkLeft)
      ? Math.max(0, Math.min(ECONOMY.checkSeconds, r.checkLeft))
      : ECONOMY.checkSeconds;
  e.nextKind = functional(r.nextKind ?? -1) ? r.nextKind : null;
  e.nextInterludes =
    e.nextKind === null
      ? 0
      : Math.min(ECONOMY.maxInterludes, int(r.nextInterludes));
  for (const rawEvent of Object.values(r.events ?? {})) {
    if (
      !rawEvent ||
      !functional(rawEvent.kind) ||
      !int(rawEvent.id) ||
      !['world', 'stored', 'active', 'draining'].includes(rawEvent.state)
    )
      continue;
    const initial = int(rawEvent.initial),
      paid = Math.min(initial, int(rawEvent.paid));
    const event = {
      ...rawEvent,
      room: multiplier(rawEvent.room),
      initial,
      paid,
      left: Math.min(initial - paid, int(rawEvent.left)),
      blocked: !!rawEvent.blocked,
    };
    e.events[event.id] = event;
    e.serial = Math.max(e.serial, event.id);
  }
  for (const [key, value] of Object.entries(r.receipts ?? {}))
    if (int(Number(key)) && int(value?.cost)) {
      e.receipts[Number(key)] = { cost: int(value.cost) };
      e.shotSerial = Math.max(e.shotSerial, Number(key));
    }
  for (const kind of FUNCTIONAL) {
    const stats = r.metrics?.[kind];
    e.metrics[kind] = {
      spawned: int(stats?.spawned),
      settled: int(stats?.settled),
      budget: int(stats?.budget),
      paid: int(stats?.paid),
      refunded: int(stats?.refunded),
      capped: int(stats?.capped),
    };
  }
  const runtime = r.runtime;
  const position = (v: EconomyActor | EconomyBullet) =>
    v &&
    int(v.id) > 0 &&
    [v.x, v.y, v.vx, v.vy, v.age].every(Number.isFinite) &&
    v.age >= 0;
  if (
    runtime &&
    Array.isArray(runtime.zombies) &&
    Array.isArray(runtime.bullets)
  ) {
    e.runtime = {
      id: int(runtime.id),
      spawnClock: Math.max(0, Math.min(1, Number(runtime.spawnClock) || 0)),
      intro: Math.max(0, Math.min(1.15, Number(runtime.intro) || 0)),
      zombies: runtime.zombies.filter(
        (z) =>
          position(z) &&
          Number.isInteger(z.kind) &&
          z.kind >= 0 &&
          z.kind <= 12 &&
          (!functional(z.kind) || !!e.events[z.eventId ?? -1]),
      ),
      bullets: runtime.bullets.filter(
        (b) =>
          position(b) &&
          [1, 5, 20, 100].includes(b.room) &&
          b.bounces >= 0 &&
          b.bounces <= 2 &&
          (b.eventId !== undefined
            ? !!e.events[b.eventId]
            : !!e.receipts[b.receiptId ?? -1]),
      ),
    };
  }
  return e;
}

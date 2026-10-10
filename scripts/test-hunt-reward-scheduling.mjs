import assert from 'node:assert/strict';
import { build } from 'esbuild';

await build({
  entryPoints: ['lib/hunt-economy.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: '.test-cache/reward-scheduling.mjs',
});
const {
  ECONOMY,
  FUNCTIONAL,
  EVENT_WEIGHTS,
  EVENT_BUDGET,
  freshEconomy,
  receipt,
  reserve,
  payEvent,
  refundEvent,
  auditEconomy,
  parseEconomy,
  selectRewardEncounter,
  commitRewardEncounter,
} = await import('../.test-cache/reward-scheduling.mjs');

function settle(e, kind, room) {
  const event = reserve(e, kind, room);
  assert.ok(event, 'only funded encounters may spawn');
  commitRewardEncounter(e, kind);
  assert.ok(payEvent(e, event.id, event.left / ECONOMY.unit));
  refundEvent(e, event.id);
  assert.equal(auditEconomy(e).difference, 0);
}

for (const room of [1, 5, 20, 100]) {
  const e = freshEconomy();
  e.nextKind = 11;
  for (let i = 0; i < 100; i++) receipt(e, room);
  assert.equal(
    e.injected,
    100 * room * 16240,
    'funding per paid ammo unchanged',
  );
  assert.equal(
    e.ammoReturnFunding,
    100 * room * 2032,
    'ammo allocation unchanged',
  );
  assert.equal(e.available, 100 * room * 14208);
  for (let i = 0; i < 2; i++) {
    const kind = selectRewardEncounter(e, room, FUNCTIONAL, () => 0.5);
    assert.ok(EVENT_BUDGET[kind] <= 260);
    settle(e, kind, room);
    assert.equal(
      e.nextKind,
      11,
      'shotgun candidate is retained during interludes',
    );
    assert.equal(e.nextInterludes, i + 1);
  }
  assert.equal(
    selectRewardEncounter(e, room, FUNCTIONAL, () => 0),
    null,
    'after two interludes affordable cheap targets cannot starve the shotgun',
  );
  const restored = parseEconomy(JSON.parse(JSON.stringify(e)));
  assert.equal(restored.nextInterludes, 2);
  assert.equal(
    selectRewardEncounter(restored, room, FUNCTIONAL, () => 0),
    null,
  );
  while (e.available < EVENT_BUDGET[11] * room * ECONOMY.unit) receipt(e, room);
  assert.equal(
    selectRewardEncounter(e, room, FUNCTIONAL, () => 0),
    11,
  );
  settle(e, 11, room);
  assert.equal(e.nextKind, null);
  assert.equal(e.nextInterludes, 0);
  assert.equal(
    auditEconomy(parseEconomy(JSON.parse(JSON.stringify(e)))).difference,
    0,
  );
}

const oldSave = { ...freshEconomy(), nextKind: 11 };
delete oldSave.nextInterludes;
assert.equal(parseEconomy(oldSave).nextInterludes, 0, 'old saves migrate');
const blocked = freshEconomy();
blocked.nextKind = 11;
blocked.nextInterludes = 2;
assert.equal(
  selectRewardEncounter(blocked, 1, [6], () => 0),
  null,
);
assert.equal(blocked.nextKind, 6, 'ineligible weapon candidate is replaced');
assert.equal(blocked.nextInterludes, 0);
assert.equal(
  selectRewardEncounter(blocked, 1, [], () => 0),
  null,
);
assert.equal(blocked.nextKind, null);

function sample(upgraded) {
  const counts = { all: 0, scatter: 0, shotgun: 0, injected: 0, paid: 0 };
  const oldWeights = { 4: 1, 5: 2, 6: 4, 7: 2, 8: 2, 10: 2, 11: 4 };
  for (let seed = 1; seed <= 20; seed++) {
    let rng = seed;
    const random = () =>
      (rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0) / 4294967296;
    const e = freshEconomy();
    for (let tick = 1; tick <= 2400; tick++) {
      receipt(e, 1);
      if (tick % (upgraded ? 2 : 4)) continue;
      let kind;
      if (upgraded) kind = selectRewardEncounter(e, 1, FUNCTIONAL, random);
      else {
        if (e.nextKind === null) {
          let roll = random() * 17;
          e.nextKind = FUNCTIONAL.at(-1);
          for (const candidate of FUNCTIONAL) {
            roll -= oldWeights[candidate];
            if (roll < 0) {
              e.nextKind = candidate;
              break;
            }
          }
        }
        kind =
          e.available >= EVENT_BUDGET[e.nextKind] * ECONOMY.unit
            ? e.nextKind
            : null;
      }
      if (kind === null) continue;
      settle(e, kind, 1);
      counts.all++;
      if (kind === 6) counts.scatter++;
      if (kind === 11) counts.shotgun++;
    }
    counts.injected += e.injected;
    counts.paid += e.paid;
    assert.equal(auditEconomy(e).difference, 0);
  }
  return counts;
}
const before = sample(false);
const configuredShotgunWeight = EVENT_WEIGHTS[11];
const comparisons = [8, 12, 16].map((weight) => {
  EVENT_WEIGHTS[11] = weight;
  return { weight, ...sample(true) };
});
EVENT_WEIGHTS[11] = configuredShotgunWeight;
const after = comparisons.find((sample) => sample.weight === configuredShotgunWeight);
console.log('Fixed funding weight comparison:', { before, comparisons });
assert.equal(
  before.injected,
  after.injected,
  'frequency adjustment never increases funding',
);
assert.ok(after.all > before.all);
assert.ok(after.scatter > before.scatter);
assert.ok(after.shotgun > before.shotgun * 1.2);
assert.equal(ECONOMY.checkSeconds, 0.5);
assert.equal(EVENT_WEIGHTS[6], 8);
assert.equal(EVENT_WEIGHTS[11], 12);
console.log(
  'PASS fixed funding, bounded interludes, guaranteed candidate priority, room scaling and save migration',
);
console.log('20 seeded, 10-minute, full-budget-consumption runs:', {
  before,
  after,
});

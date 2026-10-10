import assert from 'node:assert/strict';
import { build } from 'esbuild';
await build({
  stdin: {
    contents:
      "export { HuntGame } from './hunt/simulation'; export * from './lib/hunt-economy';",
    resolveDir: process.cwd(),
    loader: 'ts',
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: '.test-cache/reward-frequency.mjs',
});
const {
  HuntGame,
  ECONOMY,
  EVENT_WEIGHTS,
  receipt,
  payEvent,
  refundEvent,
  auditEconomy,
  parseEconomy,
} = await import('../.test-cache/reward-frequency.mjs');
const currentWeights = { ...EVENT_WEIGHTS };
function sample(legacy) {
  ECONOMY.rewardCoefficient = legacy ? 1 : 3;
  ECONOMY.checkSeconds = legacy ? 3 : 1;
  Object.keys(EVENT_WEIGHTS).forEach(
    (kind) => (EVENT_WEIGHTS[kind] = legacy ? 1 : currentWeights[kind]),
  );
  const totals = { all: 0, scatter: 0, shotgun: 0 };
  for (let seed = 1; seed <= 20; seed++) {
    let rng = seed;
    const g = new HuntGame(
      { ammo: () => 100000, spend: () => true, save: () => {} },
      undefined,
      () => (rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0) / 4294967296,
    );
    g.save.expedition.stage = 2;
    const e = g.save.economy;
    // Ten minutes at 4 paid shots/second. Consume the full reserved award for
    // each encounter, so frequency cannot be inflated by recycling unused funds.
    for (let tick = 0; tick < 2400; tick++) {
      receipt(e, 1);
      g.checkRewards(0.25);
      for (const event of Object.values(e.events)) {
        assert.ok(payEvent(e, event.id, event.left / ECONOMY.unit));
        totals.all++;
        if (event.kind === 6) totals.scatter++;
        if (event.kind === 11) totals.shotgun++;
        g.zombies = g.zombies.filter((z) => z.eventId !== event.id);
        refundEvent(e, event.id);
      }
    }
    assert.equal(auditEconomy(e).difference, 0);
    assert.equal(
      auditEconomy(parseEconomy(JSON.parse(JSON.stringify(e)))).difference,
      0,
    );
  }
  return totals;
}
const before = sample(true),
  after = sample(false);
for (const kind of ['all', 'scatter', 'shotgun'])
  assert.ok(
    after[kind] > before[kind] * 2,
    `${kind} meaningfully more frequent`,
  );
console.log('PASS funded encounter frequency over 20 deterministic runs:', {
  before,
  after,
});
const g = new HuntGame({ ammo: () => 100, spend: () => true, save: () => {} });
g.save.economy.available = 0;
g.checkRewards(2);
assert.equal(
  Object.keys(g.save.economy.events).length,
  0,
  'no unfunded rewards',
);
g.save.weapons.shotgun = 1;
assert.equal(g.eligible(10), false);
assert.equal(g.eligible(11), false);
assert.equal(g.eligible(7), false);
assert.equal(g.eligible(8), false);
console.log(
  'PASS budget conservation, reload, weapon-slot exclusion and sector unlocks',
);

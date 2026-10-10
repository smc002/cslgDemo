import assert from 'node:assert/strict';
import { build } from 'esbuild';
await build({
  stdin: {
    contents:
      "export { HuntGame, SPECIES } from './hunt/simulation'; export * from './lib/hunt-economy';",
    resolveDir: process.cwd(),
    loader: 'ts',
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: '.test-cache/shot-core-redistribution.mjs',
});
const {
  HuntGame,
  SPECIES,
  ECONOMY,
  receipt,
  freshEconomy,
  reserve,
  refundEvent,
  parseEconomy,
  auditEconomy,
} = await import('../.test-cache/shot-core-redistribution.mjs');

for (const room of [1, 5, 20, 100]) {
  let ammo = 10000;
  const g = new HuntGame({
    ammo: () => ammo,
    spend: (n) => {
      if (ammo < n) return false;
      ammo -= n;
      return true;
    },
    save: () => {},
  });
  g.active = true;
  g.save.room = room;
  g.zombies = [];
  assert.ok(g.fire());
  assert.equal(ammo, 10000 - room);
  assert.equal(g.save.xp, 0, 'empty shots award no XP');
  assert.equal(
    g.save.expedition.points,
    0,
    'empty shots award no core progress',
  );
  assert.equal(g.progressFlash, 0, 'no shot progress pulse');
  assert.ok(
    g.effects.every((e) => e.kind !== 'xp'),
    'no shot reward float',
  );
  const e = g.save.economy;
  const priorFunding =
    room *
    (ECONOMY.ordinaryYield * ECONOMY.rewardCoefficient -
      ECONOMY.ammoReturnPerSpent);
  assert.equal(
    e.available - priorFunding,
    room * 1000,
    'exact former reward added once, not multiplied by frequency coefficient',
  );
  assert.equal(auditEconomy(e).difference, 0);
  const restored = parseEconomy(JSON.parse(JSON.stringify(e)));
  assert.equal(restored.available, e.available);
  assert.equal(auditEconomy(restored).difference, 0);
  ammo = 0;
  assert.equal(g.fire(), false);
  assert.equal(
    e.available,
    restored.available,
    'failed shots do not fund rewards',
  );

  // Pool reserves fund an actual special kill and return unused funds safely.
  for (let i = 0; i < 20; i++) receipt(e, room);
  const event = reserve(e, 6, room);
  assert.ok(event);
  const z = {
    id: 9000,
    kind: 6,
    x: 200,
    y: 300,
    vx: 0,
    vy: 1,
    age: 1,
    hit: 0,
    seed: 0,
    eventId: event.id,
  };
  g.zombies.push(z);
  const bullet = { ...g.bullets[0], room };
  g.kill(z, bullet);
  const cores = SPECIES[6].points * room;
  assert.equal(g.save.expedition.points, cores, 'cores arrive on special kill');
  assert.equal(e.metrics[6].paid, cores * 1000);
  g.kill(z, bullet);
  assert.equal(g.save.expedition.points, cores, 'no duplicate reward');
  refundEvent(e, event.id);
  assert.equal(auditEconomy(e).difference, 0);
}

for (const kind of ['bonus', 'shotgun', 'laser']) {
  const g = new HuntGame({
    ammo: () => 0,
    spend: () => {
      throw Error('free shot spent ammo');
    },
    save: () => {},
  });
  g.active = true;
  g.zombies = [];
  const event = reserve(
    g.save.economy,
    kind === 'bonus' ? 4 : kind === 'shotgun' ? 11 : 10,
    1,
    true,
  );
  if (kind === 'bonus')
    g.save.bonus = {
      left: 15,
      ammo: 100,
      room: 1,
      points: 0,
      eventId: event.id,
    };
  else g.save.weapons.active = { kind, left: 10, room: 1, eventId: event.id };
  const before = g.save.economy.injected;
  assert.ok(g.fire());
  assert.equal(
    g.save.economy.injected,
    before,
    'free shots cannot recursively fund the pool',
  );
  assert.equal(g.save.expedition.points, 0);
  assert.equal(auditEconomy(g.save.economy).difference, 0);
}

// Legacy ledgers retain their old funding; no retroactive duplicate reward.
const old = freshEconomy();
old.available = 13208;
old.injected = 15240;
old.ammoReturnFunding = 2032;
old.spentAmmo = 1;
const loaded = parseEconomy(JSON.parse(JSON.stringify(old)));
assert.equal(loaded.available, 13208);
receipt(loaded, 1);
assert.equal(loaded.available, 13208 + 14208);
assert.equal(auditEconomy(loaded).difference, 0);
console.log(
  'PASS paid/free/failed shots, all room multipliers, special kill settlement, reload and legacy ledger conservation',
);

import assert from 'node:assert/strict';
import { build } from 'esbuild';
await build({
  entryPoints: [
    'hunt/simulation.ts',
    'hunt/zombie-patrol.ts',
    'lib/hunt-economy.ts',
  ],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outbase: '.',
  outdir: '.test-cache/patrol',
});
const { HuntGame, SPECIES } =
  await import('../.test-cache/patrol/hunt/simulation.js');
const { steerPatrol } =
  await import('../.test-cache/patrol/hunt/zombie-patrol.js');
const { reserve, FUNCTIONAL, auditEconomy } =
  await import('../.test-cache/patrol/lib/hunt-economy.js');
const actors = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  kind: 0,
  x: 230 + (i % 4) * 8,
  y: 250 + Math.floor(i / 4) * 8,
  vx: 25,
  vy: 0,
  age: 0,
  hit: 0,
  seed: i / 13,
}));
const spacing = () =>
  actors.reduce(
    (sum, z) =>
      sum +
      Math.min(
        ...actors
          .filter((o) => o !== z)
          .map((o) => Math.hypot(o.x - z.x, o.y - z.y)),
      ),
    0,
  ) / actors.length;
const before = spacing();
for (let frame = 0; frame < 600; frame++)
  for (const z of actors) {
    const x = z.x,
      y = z.y,
      a = Math.atan2(z.vy, z.vx);
    steerPatrol(z, actors, 1 / 60, 25, () => 21);
    const speed = Math.hypot(z.vx, z.vy);
    assert.ok(speed >= 20 && speed <= 30, 'speed remains within +/-20%');
    const turn = Math.atan2(
      Math.sin(Math.atan2(z.vy, z.vx) - a),
      Math.cos(Math.atan2(z.vy, z.vx) - a),
    );
    assert.ok(Math.abs(turn) <= 1.15 / 60 + 1e-8, 'turning remains smooth');
    z.x += z.vx / 60;
    z.y += z.vy / 60;
    z.age += 1 / 60;
    assert.ok(
      Math.hypot(z.x - x, z.y - y) <= 0.5 + 1e-8,
      'no separation teleport',
    );
  }
assert.ok(spacing() > before * 3, 'parallel tightly packed wave disperses');
assert.ok(
  new Set(actors.map((z) => z.patrol.turnAt.toFixed(1))).size > 8,
  'independent turn clocks',
);
assert.ok(
  new Set(actors.map((z) => Math.atan2(z.vy, z.vx).toFixed(1))).size > 5,
  'different final headings',
);
const io = { ammo: () => 99999, spend: () => true, save: () => {} };
const g = new HuntGame(io, undefined, () => 0.01);
g.active = true;
g.spawnClock = 999;
g.save.economy.checkLeft = 999;
g.zombies = [structuredClone(actors[0])];
g.zombies[0].frozen = 1;
const frozen = { x: g.zombies[0].x, y: g.zombies[0].y };
g.advance(0.05);
assert.deepEqual(
  { x: g.zombies[0].x, y: g.zombies[0].y },
  frozen,
  'freeze still stops displacement',
);
g.persist();
const restored = new HuntGame(io, g.save, () => 0.01);
assert.deepEqual(
  restored.zombies[0].patrol,
  g.zombies[0].patrol,
  'patrol choices survive reload',
);
for (const kind of FUNCTIONAL) {
  const demo = new HuntGame(io, undefined, () => 0.01);
  demo.zombies = [];
  for (let i = 0; i < 12; i++) demo.spawn(0);
  demo.save.economy.available = demo.save.economy.injected = 10000000;
  assert.equal(demo.save.expedition.stage, 0);
  assert.ok(demo.unlocked(kind));
  demo.spawn(kind);
  assert.ok(
    demo.zombies.some((z) => z.kind === kind),
    `first field admits kind ${kind}`,
  );
}
for (const [kind, name] of [
  [10, 'laser'],
  [11, 'shotgun'],
]) {
  const demo = new HuntGame(io, undefined, () => 0.01);
  demo.active = true;
  demo.zombies = [];
  demo.arrivalAge = null;
  const event = reserve(demo.save.economy, kind, 1, true);
  const target = {
    id: 999,
    kind,
    x: 300,
    y: 340,
    vx: 0,
    vy: 0,
    age: 0,
    hit: 0,
    seed: 0.4,
    eventId: event.id,
  };
  demo.zombies = [target];
  demo.hitTarget(target, {
    id: 1,
    x: 300,
    y: 340,
    vx: 0,
    vy: -760,
    age: 0,
    bounces: 0,
    bonus: false,
    room: 1,
  });
  assert.equal(demo.save.weapons[name], 1);
  assert.equal(demo.snapshot().weaponPickup.kind, name);
  assert.equal(demo.paused, false, 'pickup never pauses combat');
  assert.ok(demo.activateWeapon(name));
  assert.equal(demo.weaponPickup, null);
  assert.equal(demo.save.weapons.active.left, 20);
  assert.equal(demo.save.weapons[name], 0);
  assert.equal(
    demo.activateWeapon(name),
    false,
    'one pickup cannot be activated twice',
  );
  assert.equal(auditEconomy(demo.save.economy).difference, 0);
}
console.log(
  `PASS individual speed, smooth staggered turns, separation (${before.toFixed(1)} -> ${spacing().toFixed(1)}), freeze/reload, all first-field kinds and weapon pickup/activation`,
);

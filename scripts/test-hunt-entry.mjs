import assert from 'node:assert/strict';
import { build } from 'esbuild';

await build({
  entryPoints: ['hunt/simulation.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: '.test-cache/hunt-entry.mjs',
});
const { HuntGame, COURIER_KIND, SPECIES } =
  await import('../.test-cache/hunt-entry.mjs');
const io = { ammo: () => 99999, spend: () => true, save: () => {} };
function setup(random = 0.99) {
  const g = new HuntGame(io, undefined, () => random);
  g.active = true;
  g.zombies = [];
  g.spawnClock = 999;
  g.save.economy.checkLeft = 999;
  g.setViewportTop(183);
  return g;
}
function walkIn(g, z) {
  let previous = { x: z.x, y: z.y };
  const speed = Math.hypot(z.entry.vx, z.entry.vy);
  const frames =
    Math.ceil((Math.hypot(z.entry.x - z.x, z.entry.y - z.y) / speed) * 60) + 2;
  for (let i = 0; i < frames && z.entry; i++) {
    g.advance(1 / 60);
    assert.ok(g.zombies.includes(z), 'offscreen entrant must not be culled');
    assert.ok(
      Math.hypot(z.x - previous.x, z.y - previous.y) <= speed / 60 + 1e-8,
      'entry must use normal patrol speed, never accelerate or teleport',
    );
    previous = { x: z.x, y: z.y };
  }
  assert.equal(z.entry, undefined, 'entry completes');
  assert.ok(z.x > 0 && z.x < 600 && z.y > g.visibleTop && z.y < 560);
}
for (const random of [0.1, 0.5, 0.99]) {
  for (const flags of [
    [false, false],
    [false, true],
    [true, false],
  ]) {
    const g = setup(random);
    g.spawn(3, ...flags);
    const z = g.zombies[0];
    assert.ok(
      z.x < 0 || z.x > 600 || z.y < g.visibleTop,
      'all spawn callers start outside',
    );
    const initial = { x: z.x, y: z.y };
    g.paused = true;
    g.advance(0.05);
    assert.deepEqual({ x: z.x, y: z.y }, initial);
    g.paused = false;
    walkIn(g, z);
    assert.ok(
      Math.hypot(z.vx, z.vy) >= SPECIES[3].speed * 0.8 &&
        Math.hypot(z.vx, z.vy) <= SPECIES[3].speed * 1.2,
      'individual cruise speed stays within the normal variation band',
    );
  }
}
console.log(
  'PASS initial waves, replacements and periodic spawns walk in from all three edges without culling or teleporting',
);

for (const kind of [COURIER_KIND, 12]) {
  const g = setup();
  // A fresh special admission requires three ordinary actors under the 25% cap.
  for (let i = 0; i < 3; i++) g.spawn(0);
  if (kind === COURIER_KIND) {
    g.save.courier.queued = 1;
    g.ensureCourier();
  } else {
    g.save.ammoCarrier.rooms[1].spent = 100;
    g.ensureAmmoCarrier();
  }
  const z = g.zombies.find((z) => z.kind === kind);
  assert.ok(z?.entry, 'special target also enters');
  g.advance(1 / 60);
  g.persist();
  const restored = new HuntGame(io, g.save, () => 0.99);
  const restoredZ = restored.zombies.find((a) => a.id === z.id);
  assert.deepEqual(
    restoredZ.entry,
    z.entry,
    'reload retains the destination and cruise velocity',
  );
  assert.equal(restoredZ.x, z.x);
  assert.equal(restoredZ.y, z.y);
  restored.active = true;
  restored.visibleTop = g.visibleTop;
  restored.spawnClock = 999;
  // Old saved entrants must also lose the former 90-unit entry boost.
  const heading = Math.atan2(restoredZ.vy, restoredZ.vx);
  restoredZ.vx = Math.cos(heading) * 90;
  restoredZ.vy = Math.sin(heading) * 90;
  walkIn(restored, restoredZ);
}
console.log(
  'PASS courier and ammo carrier enter smoothly and reload mid-entry without being snapped into patrol bounds',
);

const fresh = new HuntGame(io, undefined, () => 0.99);
fresh.setViewportTop(240);
for (const z of fresh.zombies) {
  assert.ok(
    z.y < 240 && z.entry.y > 240,
    'first canvas measurement aligns unseen entrants to the viewport',
  );
}
console.log(
  'PASS constructor entrants adapt to short-screen viewport before the first frame',
);

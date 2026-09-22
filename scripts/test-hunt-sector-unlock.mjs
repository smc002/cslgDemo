import assert from 'node:assert/strict';
import { build } from 'esbuild';

await build({
  entryPoints: ['hunt/simulation.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: '.test-cache/hunt-sector-unlock.mjs',
});
const { HuntGame, STAGES, TRANSITION_SECONDS } =
  await import('../.test-cache/hunt-sector-unlock.mjs');

for (const restored of [false, true]) {
  let ammo = 20000,
    saved;
  const io = {
    ammo: () => ammo,
    spend: (n) => {
      ammo -= n;
      return true;
    },
    save: (s) => {
      saved = structuredClone(s);
    },
  };
  let g = new HuntGame(io, undefined, () => 0.99);
  g.active = true;
  g.intro = 0;
  g.spawnClock = 999;
  g.save.economy.checkLeft = 999;
  g.zombies = [
    {
      id: 700,
      kind: 0,
      x: 100,
      y: 200,
      vx: 10,
      vy: 0,
      age: 0,
      seed: 0,
      hit: 0,
    },
  ];
  g.save.expedition.points = STAGES[1].need - 1;
  g.press(550, 100);
  // Reach the threshold while firing, or reload a save already above it.
  g.save.expedition.points++;
  g.persist();
  if (restored) {
    g = new HuntGame(io, saved, () => 0.99);
    g.setActive(true);
    g.press(550, 100);
  }
  assert.equal(g.sceneReady, true);
  for (let i = 0; i < 60; i++) g.advance(1 / 60);
  assert.ok(
    g.zombies.find((z) => z.id === 700).x > 109,
    'unlocked arena must continue moving',
  );
  assert.equal(
    g.fired,
    4,
    'continuous fire must survive reaching/restoring an unlock',
  );
  assert.equal(ammo, 19996, 'only actual shots consume ammo');
  assert.equal(
    g.save.expedition.stage,
    0,
    'unlock does not force a transition',
  );
  assert.equal(g.selectRoom(5), true, 'multipliers remain usable');
  assert.equal(g.selectRoom(1), true);
  assert.equal(g.startTransition(), true);
  assert.equal(g.startTransition(), false, 'cannot start twice');
  assert.equal(g.fire(), false, 'actual transition still blocks shooting');
  const frozenX = g.zombies.find((z) => z.id === 700).x;
  for (let i = 0; i < 12; i++) g.advance(1 / 60);
  assert.equal(
    g.zombies.find((z) => z.id === 700).x,
    frozenX,
    'movement suspended during cinematic',
  );
  for (let i = 0; i < Math.ceil(TRANSITION_SECONDS * 60); i++)
    g.advance(1 / 60);
  assert.equal(g.save.expedition.stage, 1);
  assert.equal(g.save.expedition.transition, null);
  assert.ok(g.zombies.length > 0, 'next sector repopulates');
  assert.equal(g.fire(), true, 'combat resumes after transition');
  console.log(
    'PASS unlock keeps movement and firing; explicit transition completes',
    restored ? 'after refresh' : 'during combat',
  );
}

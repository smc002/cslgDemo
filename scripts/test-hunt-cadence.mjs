import assert from 'node:assert/strict';
import { build } from 'esbuild';
await build({
  entryPoints: ['hunt/simulation.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: '.test-cache/hunt-cadence.mjs',
});
const { HuntGame } = await import('../.test-cache/hunt-cadence.mjs');
function setup() {
  let ammo = 10000;
  const g = new HuntGame(
    {
      ammo: () => ammo,
      spend: (n) => {
        ammo -= n;
        return true;
      },
      save: () => {},
    },
    undefined,
    () => 0.99,
  );
  g.active = true;
  g.zombies = [];
  g.spawnClock = 999;
  g.save.economy.checkLeft = 999;
  return { g, ammo: () => ammo };
}
for (const repeated of [false, true]) {
  const { g, ammo } = setup();
  g.press(300, 220);
  for (let i = 0; i < 300; i++) {
    if (repeated) g.press(300 + Math.sin(i) * 100, 220);
    g.advance(1 / 60);
  }
  assert.equal(g.fired, 20);
  assert.equal(ammo(), 9980);
  g.release();
  for (let i = 0; i < 60; i++) g.advance(1 / 60);
  assert.equal(g.fired, 20);
  console.log(
    'PASS ordinary 4 shots/sec for 5 sec, aim updates cannot accelerate, release stops',
    repeated,
  );
}
const { g } = setup();
g.press(300, 200);
g.paused = true;
for (let i = 0; i < 120; i++) {
  g.press(350, 230);
  g.advance(1 / 60);
}
assert.equal(g.fired, 0);
g.paused = false;
for (let i = 0; i < 60; i++) g.advance(1 / 60);
assert.equal(g.fired, 4);
console.log('PASS pause and resume preserve fire cadence');

// A touch can begin and end between animation frames; retain exactly one shot.
{
  const { g, ammo } = setup();
  g.press(280, 210);
  g.release(true);
  g.advance(1 / 60);
  assert.equal(g.fired, 1);
  for (let i = 0; i < 120; i++) g.advance(1 / 60);
  assert.equal(g.fired, 1);
  assert.equal(ammo(), 9999);
  console.log('PASS quick tap fires once, does not start auto fire');
}
{
  const { g } = setup();
  for (let i = 0; i < 300; i++) {
    g.press(280, 210);
    g.release(true);
    g.advance(1 / 60);
  }
  assert.equal(g.fired, 20);
  g.release();
  for (let i = 0; i < 60; i++) g.advance(1 / 60);
  assert.equal(g.fired, 20);
  console.log(
    'PASS fast repeated taps obey 4/sec cooldown; cancellation clears queued shot',
  );
}

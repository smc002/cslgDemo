import { build } from 'esbuild';
import assert from 'node:assert/strict';
await build({
  entryPoints: ['merged/simulation.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: '.test-cache/animation.mjs',
});
const { MergedBattle } = await import('../.test-cache/animation.mjs');
const run = (g, t) => {
  for (let i = 0; i < Math.ceil(t * 60); i++) g.advance(1 / 60);
};
for (const id of [0, 1, 2, 3, 8]) {
  const g = new MergedBattle();
  g.start();
  g.heroes.forEach((h) => {
    h.cd = 999;
    if (h.hero !== id) h.hp = 0;
  });
  const hero = g.heroes.find((h) => h.hero === id);
  hero.cd = 0;
  const foe = g.enemies.find((e) => e.lane === hero.lane);
  g.enemies = [foe];
  Object.assign(foe, {
    x: hero.x,
    y: hero.y - 35,
    hp: 1000,
    maxHp: 1000,
    stun: 999,
  });
  run(g, 1 / 60);
  assert.ok(hero.animation);
  assert.equal(foe.hp, 1000, 'no damage on windup');
  g.paused = true;
  const snapshot = JSON.stringify(g.snapshot());
  run(g, 1);
  assert.equal(JSON.stringify(g.snapshot()), snapshot);
  g.paused = false;
  const expected = { 0: 27, 1: 12, 2: 26, 3: 37, 8: 83 }[id];
  run(g, 0.6);
  assert.equal(1000 - foe.hp, expected, 'exactly one impact after windup');
  hero.cd = 999;
  run(g, 0.5);
  assert.equal(1000 - foe.hp, expected, 'no duplicate impact');
  hero.animation = undefined;
  hero.cd = 0;
  run(g, 1 / 60);
  hero.hp = 0;
  const hp = foe.hp;
  run(g, 1);
  assert.equal(foe.hp, hp, 'death cancels pending impact');
  assert.ok(hero.age > 0.9);
  console.log('PASS windup, pause, single impact and death cancellation', id);
}
// Campaign economy coverage lives in test-loop.mjs (stage rewards replace wave tickets).

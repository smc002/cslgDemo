import { build } from 'esbuild';
import assert from 'node:assert/strict';
await build({
  entryPoints: ['merged/simulation.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: '.test-cache/reinforcement.mjs',
});
const { MergedBattle, combatLane } =
  await import('../.test-cache/reinforcement.mjs');
const run = (g, n) => {
  for (let i = 0; i < n * 60; i++) g.advance(1 / 60);
};
{
  const g = new MergedBattle();
  g.start();
  g.enemies = g.enemies.filter((e) => e.lane !== 0);
  g.enemies.forEach((e) => {
    e.hp = e.maxHp = 100000;
    e.stun = 999;
  });
  g.heroes.forEach((h) => (h.cd = 999));
  const h = g.heroes.find((h) => h.hero === 2),
    x = h.x;
  h.cd = 0;
  run(g, 0.25);
  assert.equal(combatLane(h), 1);
  assert.equal(h.lane, 0);
  assert.ok(h.x > x && h.x < x + 120, 'walk rather than teleport');
  assert.equal(g.damage[2], 0, 'no firing while transferring');
  run(g, 4);
  assert.ok(g.damage[2] > 0, 'arrival permits cross-lane damage');
  const target = g.enemies.find((e) => e.lane === 1);
  assert.ok(target.hp < 100000);
  const medic = g.heroes.find((h) => h.hero === 1),
    ally = g.heroes.find((h) => h.hero === 3);
  ally.hp = 10;
  medic.cd = 0;
  run(g, 1.5);
  assert.ok(ally.hp > 10, 'support heals new frontline');
  g.enemies.forEach((e) => (e.hp = 0));
  run(g, 3);
  assert.ok(g.wave >= 2);
  assert.equal(combatLane(h), h.lane);
  assert.ok(
    Math.abs(h.x - h.homeX) < 2,
    'returns to original formation for next wave',
  );
  console.log(
    'PASS clear lane → visible support → attack/heal → next-wave return',
  );
}
{
  const g = new MergedBattle();
  g.start();
  g.heroes.filter((h) => h.lane === 0).forEach((h) => (h.hp = 0));
  g.heroes.forEach((h) => (h.cd = 999));
  g.enemies.forEach((e) => {
    e.hp = e.maxHp = 100000;
  });
  const z = g.enemies.find((e) => e.lane === 0),
    x = z.x;
  run(g, 2);
  assert.notEqual(combatLane(z), 0);
  assert.ok(z.hp > 0 && z.x !== x);
  assert.ok(g.heroes.find((h) => h.id === z.target)?.lane !== 0);
  assert.ok(
    g.enemies.every((e) => e.target !== 6),
    'assassin never gets targeted',
  );
  g.heroes.filter((h) => h.hero !== 5).forEach((h) => (h.hp = 0));
  run(g, 0.1);
  assert.equal(g.phase, 'defeat');
  console.log(
    'PASS wiped lane → zombie transfer, no deletion, assassin does not stall defeat',
  );
}
{
  const g = new MergedBattle();
  g.start();
  g.enemies = g.enemies.filter((e) => e.lane !== 0);
  g.enemies.forEach((e) => (e.stun = 999));
  run(g, 0.2);
  const h = g.heroes.find((h) => h.hero === 2);
  g.enemies.filter((e) => combatLane(e) === 1).forEach((e) => (e.hp = 0));
  run(g, 0.1);
  assert.equal(
    combatLane(h),
    2,
    'retarget if destination clears while walking',
  );
  g.paused = true;
  const before = JSON.stringify(g.snapshot());
  run(g, 2);
  assert.equal(JSON.stringify(g.snapshot()), before);
  console.log('PASS transfer retarget and pause');
}

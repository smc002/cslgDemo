import { build } from 'esbuild';
import assert from 'node:assert/strict';
await build({
  entryPoints: ['merged/simulation.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: '.test-cache/assassin-duel.mjs',
});
const { MergedBattle, combatLane, bossSlamArea } =
  await import('../.test-cache/assassin-duel.mjs');
const run = (g, seconds) => {
  for (let i = 0; i < Math.round(seconds * 60); i++) g.advance(1 / 60);
};
function setup() {
  const g = new MergedBattle();
  g.start();
  g.heroes.forEach((h) => {
    h.cd = 999;
  });
  const h = g.heroes.find((h) => h.hero === 5);
  g.enemies = g.enemies.filter((z) => z.lane === h.lane);
  g.enemies.forEach((z) => {
    z.hp = z.maxHp = 10000;
  });
  run(g, 1 / 60);
  return { g, h, z: g.enemies.find((z) => z.id === h.target) };
}
{
  const { g, h, z } = setup(),
    x = z.x,
    y = z.y,
    hx = h.x,
    hy = h.y,
    hp = h.hp,
    zhp = z.hp;
  run(g, 1.5);
  assert.equal(z.target, h.id);
  assert.equal(h.target, z.id);
  assert.ok(h.hp < hp && z.hp < zhp, 'both sides deal damage');
  assert.equal(z.x, x);
  assert.equal(z.y, y);
  assert.equal(h.x, hx);
  assert.equal(h.y, hy);
  assert.ok(
    g.enemies.filter((e) => e !== z).every((e) => e.target !== h.id),
    'other enemies do not join the duel',
  );
  g.paused = true;
  const frozen = JSON.stringify(g.snapshot());
  run(g, 1);
  assert.equal(JSON.stringify(g.snapshot()), frozen);
  g.paused = false;
  z.x += 45;
  z.y += 25;
  h.cd = 999;
  z.cd = 999;
  run(g, 1);
  assert.ok(
    Math.hypot(h.x - z.x, h.y - z.y) <= 43.5,
    'displacement closes to melee distance without running in circles',
  );
  g.heroes
    .filter((p) => p.lane === h.lane && p !== h)
    .forEach((p) => (p.hp = 0));
  run(g, 0.1);
  assert.equal(
    combatLane(z),
    combatLane(h),
    'locked foe stays despite the front line falling',
  );
  assert.equal(z.target, h.id);
  h.hp = 0;
  run(g, 0.1);
  assert.notEqual(z.target, h.id, 'assassin death releases the foe');
}
{
  const { g, h, z } = setup();
  z.hp = 0;
  run(g, 0.1);
  assert.notEqual(h.target, z.id, 'dead target releases the assassin');
  const next = g.enemies.find((e) => e.id === h.target);
  assert.ok(next && next.target === h.id, 'next flash establishes a new duel');
  g.enemies.forEach((e) => (e.hp = 0));
  run(g, 0.1);
  assert.equal(h.target, 0, 'wave completion clears the target');
}
{
  // A boss must be able to retaliate behind itself; its telegraph does not track during windup.
  const { g, h, z } = setup();
  z.boss = true;
  z.cd = 0;
  run(g, 1 / 60);
  const area = bossSlamArea(z);
  assert.equal(area.x, h.x);
  assert.equal(area.y, h.y);
  const hp = h.hp;
  run(g, 1.3);
  assert.ok(h.hp < hp, 'boss retaliation hits its duelling assassin');
}
{
  const g = new MergedBattle();
  g.start();
  g.heroes = g.heroes.filter((h) => [1, 2, 4].includes(h.hero));
  const z = g.enemies[0];
  g.enemies = [z];
  Object.assign(z, {
    boss: true,
    x: 195,
    y: 270,
    cd: 0,
    hp: 100000,
    maxHp: 100000,
  });
  const positions = [
    [0, 70],
    [70, 0],
    [70, 70],
  ];
  for (const [i, h] of g.heroes.entries()) {
    h.x = 195 + positions[i][0];
    h.y = 343.5 + positions[i][1];
    h.cd = 999;
    h.combatLane = 0;
  }
  const hp = g.heroes.map((h) => h.hp);
  run(g, 1 / 60);
  const area = bossSlamArea(z);
  assert.equal(area.radius, 80);
  z.x += 10;
  assert.deepEqual(bossSlamArea(z), area, 'windup area remains fixed');
  run(g, 1.1);
  assert.deepEqual(
    g.heroes.map((h) => h.hp),
    hp,
    'no damage before impact',
  );
  run(g, 0.2);
  assert.ok(
    g.heroes[0].hp < hp[0] && g.heroes[1].hp < hp[1],
    'circle contains axis points',
  );
  assert.equal(
    g.heroes[2].hp,
    hp[2],
    'bounding-box corner is outside the circle',
  );
  const after = g.heroes.map((h) => h.hp);
  run(g, 0.3);
  assert.deepEqual(
    g.heroes.map((h) => h.hp),
    after,
    'no repeated damage during recovery',
  );
}
console.log(
  'PASS assassin mutual combat, stable melee, displacement, death/retarget/pause/lane cleanup, boss retaliation and circular damage bounds',
);

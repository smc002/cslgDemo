import assert from 'node:assert/strict';
import fs from 'node:fs';
import { build } from 'esbuild';
await build({
  entryPoints: ['shared/toy-art.ts', 'merged/simulation.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outdir: '.test-cache/toy-animation',
});
const A = await import('../.test-cache/toy-animation/shared/toy-art.js');
const { MergedBattle, SLOTS, ROAD_BOUNDS } =
  await import('../.test-cache/toy-animation/merged/simulation.js');
assert.equal(A.TOY_SCALE, 1.26);
assert.equal(Object.keys(A.TOY_ANIMATIONS).length, 22);
for (const id of [...A.HERO_ART.map((h) => h[0]), ...A.ZOMBIE_ART]) {
  const art = A.TOY_ANIMATIONS[id];
  assert.equal(art.facing, id.startsWith('hero-') ? 'back' : 'front');
  assert.ok(
    fs.statSync('public/assets/toy-v1/animations/' + art.sheet).size > 10000,
  );
  assert.deepEqual(
    [0, 0.125, 0.25, 0.375].map((time) =>
      A.toyFrame(id, { moving: true, time }),
    ),
    [0, 1, 2, 3],
  );
  assert.deepEqual(
    [0, 0.25, 0.5, 0.75].map((attackProgress) =>
      A.toyFrame(id, { moving: true, attackProgress }),
    ),
    [4, 5, 6, 7],
  );
  assert.equal(
    A.toyFrame(id, { moving: true, death: 0.2, attackProgress: 0.5 }),
    art.idle,
  );
}
assert.equal(SLOTS[2].y, 585);
assert.equal(SLOTS[0].x, 101);
assert.equal(SLOTS[6].x, 289);
for (const stage of [1, 4, 10]) {
  const g = new MergedBattle();
  g.configure(stage, [0, 1, 2, 3, 4, 5, 6, 7, 8], Array(9).fill(4));
  g.start();
  // Exercise walking, teleport, shove, cross-lane reinforcements and marching.
  g.heroes[0].x = -50;
  g.enemies[0].x = 450;
  for (let i = 0; i < 18000 && !['cleared', 'defeat'].includes(g.phase); i++) {
    g.advance(1 / 60);
    for (const u of [...g.heroes, ...g.enemies])
      assert.ok(
        u.x >= ROAD_BOUNDS.left && u.x <= ROAD_BOUNDS.right,
        'road bounds ' + stage + ' ' + u.id,
      );
  }
  assert.ok(['cleared', 'defeat'].includes(g.phase));
}
console.log(
  'PASS 22 authored walk/attack clips, rear-view heroes, 10% scale, deployment and all-unit road bounds',
);

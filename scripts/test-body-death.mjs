import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import { build } from 'esbuild';
await build({
  entryPoints: [
    'hunt/body-death-vfx.ts',
    'hunt/ammo-return-vfx.ts',
    'hunt/simulation.ts',
  ],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outbase: '.',
  outdir: '.test-cache/body-death',
});
const { bodyDeathPose, deathStyle, drawBodyDeath } =
  await import('../.test-cache/body-death/hunt/body-death-vfx.js');
const { AMMO_DEATH_HOLD, ammoFlightTiming, AMMO_PARTICLES, drawAmmoDeath } =
  await import('../.test-cache/body-death/hunt/ammo-return-vfx.js');
const { HuntGame } =
  await import('../.test-cache/body-death/hunt/simulation.js');
for (let kind = 0; kind < 13; kind++) {
  assert.equal(bodyDeathPose(kind, 0).frame, 0);
  assert.equal(bodyDeathPose(kind, 0.26).frame, 1);
  assert.equal(bodyDeathPose(kind, 0.62).frame, 2);
  assert.equal(bodyDeathPose(kind, 1.36), null);
  for (const age of [-1, NaN, Infinity])
    assert.equal(bodyDeathPose(kind, age), null);
  let previous = 0;
  for (let t = 0; t < 1.36; t += 0.01) {
    const pose = bodyDeathPose(kind, t);
    if (!pose) continue;
    assert.ok(pose.frame >= previous);
    previous = pose.frame;
    assert.ok(pose.alpha >= 0 && pose.alpha <= 1);
  }
  const hashes = [];
  for (let frame = 0; frame < 3; frame++) {
    const file = `public/assets/hunt/body-death-v1/${kind}-${frame}.png`;
    const { data, info } = await sharp(file)
      .raw()
      .toBuffer({ resolveWithObject: true });
    assert.equal(info.width, 512);
    assert.equal(info.height, 512);
    assert.equal(info.channels, 4);
    let visible = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 0) visible++;
    assert.ok(
      visible > 3000 && visible < 180000,
      `transparent complete pose ${kind}/${frame}`,
    );
    for (let x = 0; x < 512; x++)
      assert.equal(data[x * 4 + 3], 0, 'clear top gutter');
    hashes.push((await fs.readFile(file)).toString('base64'));
  }
  assert.equal(
    new Set(hashes).size,
    3,
    'three distinct authored poses per identity',
  );
}
assert.equal(deathStyle(0), 'side');
assert.equal(deathStyle(2), 'back');
assert.equal(deathStyle(3), 'heavy');
assert.equal(deathStyle(9), 'heavy');
const calls = [];
const ctx = new Proxy(
  { globalAlpha: 1 },
  {
    get: (target, key) =>
      key in target
        ? target[key]
        : (...args) => {
            calls.push([key, ...args]);
          },
  },
);
const art = Array.from({ length: 13 }, (_, kind) =>
  Array.from({ length: 3 }, (_, frame) => ({
    complete: true,
    naturalWidth: 512,
    kind,
    frame,
  })),
);
drawBodyDeath(ctx, art, 0, 200, 300, 0.62, 61, 1, true);
assert.ok(calls.some((c) => c[0] === 'drawImage' && c[1].frame === 2));
assert.ok(
  !calls.some((c) => c[0] === 'rotate'),
  'poses are not rotated standing cards',
);
for (const c of calls.filter((c) => c[0] === 'scale'))
  assert.equal(Math.abs(c[1]), Math.abs(c[2]), 'no flattening');
assert.equal(AMMO_DEATH_HOLD, 0.5);
assert.ok(
  Array.from({ length: AMMO_PARTICLES }, (_, i) => ammoFlightTiming(i)).some(
    (t) => t.arrival <= AMMO_DEATH_HOLD,
  ),
  'ammo still reaches inventory during hold',
);
calls.length = 0;
drawAmmoDeath(
  ctx,
  { frames: [], props: [] },
  { age: 1.12, x: 200, y: 300, facing: 'S' },
  1,
  121,
  art,
);
assert.ok(
  calls.some(
    (c) => c[0] === 'drawImage' && c[1].kind === 12 && c[1].frame === 2,
  ),
  'black-gold joins whole-body fall after hold',
);
const g = new HuntGame(
  { ammo: () => 99999, spend: () => true, save: () => {} },
  undefined,
  () => 0.99,
);
g.active = true;
g.zombies = [];
g.spawnClock = 999;
g.save.economy.checkLeft = 999;
g.effects = [
  {
    id: 99,
    kind: 'kill',
    species: 3,
    x: 100,
    y: 300,
    age: 0.54,
    life: 1.35,
    seed: 0,
    angle: 0,
    points: 400,
  },
];
g.advance(0.02);
assert.ok(g.shake > 0, 'heavy impact on the landing frame');
console.log(
  'PASS 39 transparent distinct poses, A/B/C timing, uniform scale, no portrait rotation, black-gold hold/flight and heavy landing',
);

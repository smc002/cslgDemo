import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import sharp from 'sharp';

await build({
  entryPoints: [
    'hunt/simulation.ts',
    'hunt/view.ts',
    'hunt/vehicle-rig.ts',
    'hunt/zombie-animation.ts',
    'lib/core-rewards.ts',
  ],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outbase: '.',
  outdir: '.test-cache/hunt-production',
});
const { coreRewardProgress } =
  await import('../.test-cache/hunt-production/lib/core-rewards.js');
const { vehicleMuzzle, VEHICLE_RIG, arenaViewportOffset } =
  await import('../.test-cache/hunt-production/hunt/vehicle-rig.js');
const { zombieFrame } =
  await import('../.test-cache/hunt-production/hunt/zombie-animation.js');
const { HuntGame, ARENA, SPECIES } =
  await import('../.test-cache/hunt-production/hunt/simulation.js');
const { HuntView } =
  await import('../.test-cache/hunt-production/hunt/view.js');

for (const level of [1, 2, 3, 8, 22, 120]) {
  for (const xp of [0, 199, level * 200 - 1]) {
    const points = level * (level - 1) * 100 + xp;
    const p = coreRewardProgress(level, xp, points);
    assert.ok(p.checkpoints.length <= 3);
    assert.equal(
      Math.floor((points + p.remaining) / 200) - Math.floor(points / 200),
      1,
    );
    for (const node of p.checkpoints) {
      assert.equal(node.threshold % 200, 0);
      assert.equal(node.reached, points >= node.threshold);
      assert.ok(node.ratio > 0 && node.ratio <= 1);
    }
  }
}
assert.ok(
  coreRewardProgress(3, 500, 0).checkpoints.every(
    (node) => node.threshold > 0 && !node.reached,
  ),
);
console.log(
  'PASS milestones match paid thresholds at low/high levels and reject impossible historical rewards',
);

const pixelDx =
  (VEHICLE_RIG.muzzle[0] - VEHICLE_RIG.turretPivot[0]) *
  VEHICLE_RIG.turretScale;
const pixelDy =
  (VEHICLE_RIG.muzzle[1] - VEHICLE_RIG.turretPivot[1]) *
  VEHICLE_RIG.turretScale;
for (let degrees = 0; degrees < 360; degrees += 15) {
  const a = (degrees * Math.PI) / 180;
  const target = {
    x: ARENA.gunX + Math.cos(a) * 450,
    y: ARENA.gunY + Math.sin(a) * 450,
  };
  const muzzle = vehicleMuzzle(ARENA.gunX, ARENA.gunY, target);
  const drawX =
    ARENA.gunX +
    pixelDx * Math.cos(muzzle.rotation) -
    pixelDy * Math.sin(muzzle.rotation);
  const drawY =
    ARENA.gunY +
    pixelDx * Math.sin(muzzle.rotation) +
    pixelDy * Math.cos(muzzle.rotation);
  assert.ok(Math.hypot(drawX - muzzle.x, drawY - muzzle.y) < 1e-8);
  const headingError = Math.atan2(
    Math.sin(Math.atan2(muzzle.y - ARENA.gunY, muzzle.x - ARENA.gunX) - a),
    Math.cos(Math.atan2(muzzle.y - ARENA.gunY, muzzle.x - ARENA.gunX) - a),
  );
  assert.ok(Math.abs(headingError) < 1e-8);
  const g = new HuntGame(
    { ammo: () => 9999, spend: () => true, save: () => {} },
    undefined,
    () => 0.99,
  );
  g.active = true;
  g.aim = target;
  g.zombies = [];
  assert.ok(g.fire());
  assert.ok(Math.hypot(g.bullets[0].x - drawX, g.bullets[0].y - drawY) < 1e-8);
  const flash = g.effects.find((fx) => fx.kind === 'shot');
  assert.ok(Math.hypot(flash.x - drawX, flash.y - drawY) < 1e-8);
}
for (const height of [430, 600, 850, 1100]) {
  const offset = arenaViewportOffset(height);
  assert.ok(
    ARENA.gunY +
      (810 - VEHICLE_RIG.chassisPivot[1]) * VEHICLE_RIG.chassisScale +
      offset <
      height,
  );
}
console.log(
  'PASS 24 aim directions align pixels, projectiles and muzzle flashes; car remains above controls',
);

const game = new HuntGame(
  { ammo: () => 10000, spend: () => true, save: () => {} },
  undefined,
  () => 0.99,
);
game.active = true;
game.zombies = [];
game.spawnClock = 999;
game.save.economy.checkLeft = 999;
for (let kind = 0; kind < 9; kind++) {
  const z = {
    id: 100 + kind,
    kind,
    x: 300,
    y: 710,
    vx: 10,
    vy: 20,
    age: 0,
    seed: 0.1,
    hit: 0,
  };
  game.zombies.push(z);
}
for (let i = 0; i < 120; i++) game.advance(1 / 60);
for (const z of game.zombies) {
  const margin = Math.max(SPECIES[z.kind].radius, SPECIES[z.kind].size * 0.6);
  assert.ok(
    z.x <= ARENA.platform.left - margin ||
      z.x >= ARENA.platform.right + margin ||
      z.y <= ARENA.platform.top - margin,
  );
}
console.log(
  'PASS enemies starting inside the safe deck are displaced to an exposed edge and stay outside',
);

// Keep the original atlas as a compatibility regression; the active directional
// manifest and all current sprite cells are checked by test-hunt-directions.mjs.
const manifest = JSON.parse(
  await readFile('public/assets/hunt/zombies-v1/manifest.json', 'utf8'),
);
assert.equal(Object.keys(manifest.kinds).length, SPECIES.length);
for (const [name, a] of Object.entries(manifest.archetypes)) {
  const image = sharp(`public/assets/hunt/zombies-v1/${a.atlas}`);
  const meta = await image.metadata();
  assert.equal(meta.width, 1280);
  assert.equal(meta.height, 640);
  assert.ok(meta.hasAlpha);
  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const alpha = (x, y) => data[(y * info.width + x) * 4 + 3];
  for (let frame = 0; frame < 8; frame++) {
    for (let q = 0; q < 320; q++) {
      const x = (frame % 4) * 320,
        y = Math.floor(frame / 4) * 320;
      assert.equal(alpha(x + q, y), 0, `${name} top edge`);
      assert.equal(alpha(x + q, y + 319), 0, `${name} bottom edge`);
      assert.equal(alpha(x, y + q), 0, `${name} left edge`);
      assert.equal(alpha(x + 319, y + q), 0, `${name} right edge`);
    }
  }
  assert.deepEqual(
    [0, 0.13, 0.26, 0.39].map((time) => zombieFrame(a.clips.walk, time)),
    [0, 1, 2, 3],
  );
  assert.deepEqual(
    [0, 0.3, 0.9].map((ratio) => zombieFrame(a.clips.hit, ratio, true)),
    [4, 5, 6],
  );
  assert.equal(zombieFrame(a.clips.hit, 10), 6, 'hit cannot loop');
  assert.equal(zombieFrame(a.clips.walk, 0.51), 0, 'walk wraps');
}
console.log(
  'PASS all 12 kinds resolve to transparent atlases; movement loops and hit poses complete without looping',
);

// Exercise the actual renderer's clock and frame selection without a browser.
const renderer = Object.create(HuntView.prototype);
const calls = [];
renderer.ctx = {
  save() {},
  restore() {},
  drawImage(...args) {
    calls.push(args);
  },
  filter: 'none',
};
renderer.zombieClocks = new Map();
renderer.art = {
  zombieAnimation: {
    manifest,
    sheets: Object.fromEntries(
      Object.keys(manifest.archetypes).map((key) => [key, { id: key }]),
    ),
  },
};
const actor = {
  id: 1,
  kind: 0,
  x: 300,
  y: 250,
  age: 0,
  seed: 0,
  hit: 0,
  frozen: 0,
  vx: 0,
  vy: 25,
};
const drawFrame = () => {
  assert.ok(renderer.animatedZombie(actor, 61));
  const call = calls.at(-1);
  return call[1] / 320 + (call[2] / 320) * 4;
};
assert.equal(drawFrame(), 0);
actor.age = 0.07;
drawFrame();
actor.age = 0.14;
assert.equal(drawFrame(), 1);
assert.equal(drawFrame(), 1, 'paused simulation cannot advance the walk');
actor.frozen = 3;
actor.age = 0.24;
assert.equal(drawFrame(), 1, 'frozen actor holds the same pose');
actor.frozen = 0;
actor.hit = 0.13;
actor.age = 0.25;
assert.equal(drawFrame(), 4);
actor.hit = 0.08;
actor.age = 0.3;
assert.equal(drawFrame(), 5);
actor.hit = 0.001;
actor.age = 0.38;
assert.equal(drawFrame(), 6);
actor.hit = 0;
actor.age = 0.39;
assert.equal(drawFrame(), 1, 'walk resumes its prior clock after recovery');
actor.hit = 0.13;
actor.age = 0.4;
assert.equal(drawFrame(), 4, 'a fresh hit restarts the reaction exactly once');
renderer.zombieSprite(5, 75);
assert.equal(
  calls.at(-1)[0].id,
  'explosive',
  'death fade must not swap back to an old zombie identity',
);
renderer.game = {
  courierVictory: { age: 0.2, x: 300, y: 350 },
  save: { courier: { reveal: null } },
};
renderer.ctx = new Proxy(renderer.ctx, {
  get(target, key) {
    return key in target ? target[key] : () => {};
  },
});
calls.length = 0;
renderer.courierVictory();
assert.equal(calls.length, 16);
assert.ok(
  calls.every((call) => call[0].id === 'armored'),
  'courier defeat chunks retain the same animated armor identity',
);
console.log(
  'PASS actual renderer move-hit-move, pause, freeze, repeated-hit and new-art death fade',
);

const short = new HuntGame(
  { ammo: () => 10000, spend: () => true, save: () => {} },
  undefined,
  () => 0.1,
);
short.visibleTop = 183;
short.zombies = [];
short.spawn(0, false, true);
assert.ok(short.zombies[0].y - SPECIES[0].size * 0.6 >= short.visibleTop);
console.log(
  'PASS short-screen edge spawns enter within the visible battlefield',
);

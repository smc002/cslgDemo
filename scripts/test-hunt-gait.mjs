import assert from 'node:assert/strict';
import { build } from 'esbuild';

await build({
  entryPoints: ['hunt/zombie-gait.ts', 'hunt/zombie-animation.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outdir: '.test-cache/hunt-gait',
});
const { zombieGaitRig, zombieGaitPose, zombieLegStrips, zombieStep } =
  await import('../.test-cache/hunt-gait/zombie-gait.js');
const { advanceZombieClock, zombieFilter, zombieHitFlash } =
  await import('../.test-cache/hunt-gait/zombie-animation.js');
for (const name of ['normal', 'armored', 'explosive', 'giant'])
  for (const facing of ['S', 'SE', 'E', 'NE', 'N']) {
    const rig = zombieGaitRig(name, facing);
    const poses = [];
    for (let f = 0; f <= 120; f++) {
      const pose = zombieGaitPose(rig, facing, (f / 120) * rig.cycle);
      poses.push(pose);
      rig.legs.forEach((leg, i) => {
        for (const strip of zombieLegStrips(leg, pose.feet[i], pose.body)) {
          assert.ok(Object.values(strip).every(Number.isFinite));
          assert.ok(strip.bottom > strip.top);
          assert.ok(
            strip.scaleY > 0.25,
            `${name}/${facing} knee folded inside-out`,
          );
        }
      });
    }
    for (let i = 0; i < 2; i++) {
      assert.ok(
        Math.hypot(
          poses[0].feet[i].x - poses[120].feet[i].x,
          poses[0].feet[i].y - poses[120].feet[i].y,
        ) < 1e-9,
        'seamless loop',
      );
      const unique = new Set(
        poses.slice(0, 120).map((p) => JSON.stringify(p.feet[i])),
      );
      assert.ok(
        unique.size > 100,
        `${name}/${facing} does not repeat four poses`,
      );
      const ys = poses.map((p) => p.feet[i].y);
      assert.ok(
        Math.max(...ys) - Math.min(...ys) >= rig.lift,
        `${name}/${facing} must lift both feet`,
      );
      for (let frame = 1; frame < poses.length; frame++)
        assert.ok(
          Math.hypot(
            poses[frame].feet[i].x - poses[frame - 1].feet[i].x,
            poses[frame].feet[i].y - poses[frame - 1].feet[i].y,
          ) < 2,
          'no frame teleport',
        );
    }
    const still = zombieGaitPose(rig, facing, 0.4, false);
    assert.ok(still.feet.every((p) => Math.abs(p.x) + Math.abs(p.y) === 0));
  }
for (const phase of [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6])
  assert.ok(zombieStep(phase).lift < 1e-12, 'planted phase');
assert.ok(zombieStep(0.8).lift > 0.99, 'swing phase raises the foot');
let clock = advanceZombieClock(
  undefined,
  { age: 0, seed: 0.21, vx: 20, vy: 0, hit: 0.13 },
  1,
);
const initial = clock.walk;
for (let i = 1; i <= 60; i++)
  clock = advanceZombieClock(
    clock,
    { age: i / 60, seed: 0.21, vx: 20, vy: 0, hit: 0.13 },
    1,
  );
assert.ok(
  Math.abs(clock.walk - initial - 1) < 1e-9,
  'one second of sustained fire retains one second of locomotion',
);
const frozen = advanceZombieClock(
  clock,
  { age: 1.05, seed: 0.21, vx: -20, vy: 0, hit: 0.13, frozen: 1 },
  1,
);
assert.equal(frozen.walk, clock.walk);
assert.equal(frozen.facing, clock.facing);
assert.equal(zombieHitFlash(0.13), 1);
assert.equal(zombieHitFlash(0), 0);
assert.equal(zombieFilter('', false, 0.13), 'contrast(0) brightness(2)');
assert.equal(zombieFilter(), 'none');
assert.ok(
  zombieFilter('sepia(.7)', true, 0.13).endsWith('contrast(0) brightness(2)'),
  'flash is applied after tint and freeze',
);
console.log(
  'PASS all 20 rigs: smooth cyclic steps, two-foot lift, planted contact, no inverted joints, stop/freeze and sustained-hit continuity',
);

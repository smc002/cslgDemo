import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { build } from 'esbuild';

await build({
  entryPoints: ['hunt/zombie-animation.ts', 'hunt/view.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outbase: '.',
  outdir: '.test-cache/hunt-directions',
});
const { zombieFacing, zombieDirection, zombieFrame, advanceZombieClock } =
  await import('../.test-cache/hunt-directions/hunt/zombie-animation.js');
const { HuntView } =
  await import('../.test-cache/hunt-directions/hunt/view.js');
const art = JSON.parse(await readFile('public/assets/hunt/art.json', 'utf8'));
const manifestPath = path.join('public', art.zombieAnimation);
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const native = ['S', 'SE', 'E', 'NE', 'N'];
const directions = {
  S: [0, 25, 0, false],
  SE: [25, 25, 1, false],
  E: [25, 0, 2, false],
  NE: [25, -25, 3, false],
  N: [0, -25, 4, false],
  NW: [-25, -25, 3, true],
  W: [-25, 0, 2, true],
  SW: [-25, 25, 1, true],
};
assert.equal(Object.keys(manifest.kinds).length, 13);
for (const [facing, [vx, vy]] of Object.entries(directions))
  assert.equal(zombieFacing(vx, vy), facing);
for (const degrees of [21, 23, 29])
  assert.equal(
    zombieFacing(
      Math.cos((degrees * Math.PI) / 180),
      Math.sin((degrees * Math.PI) / 180),
      'E',
    ),
    'E',
  );
assert.equal(
  zombieFacing(
    Math.cos((31 * Math.PI) / 180),
    Math.sin((31 * Math.PI) / 180),
    'E',
  ),
  'SE',
);
assert.equal(zombieFacing(0, 0, 'NW'), 'NW');
assert.equal(
  zombieFacing(0.5, Math.sqrt(3) / 2),
  'SE',
  'initial facing uses the nearest view before hysteresis',
);
assert.equal(zombieFacing(NaN, 0, 'N'), 'N');
let state = { age: 1, walk: 0.32, facing: 'W' };
for (const interruption of [{ frozen: 1 }]) {
  const next = advanceZombieClock(
    state,
    { age: 1.05, seed: 0, vx: 25, vy: 0, hit: 0, ...interruption },
    1,
  );
  assert.equal(next.facing, 'W');
  assert.equal(next.walk, 0.32);
}
assert.equal(
  advanceZombieClock(state, { age: 1.05, seed: 0, vx: 25, vy: 0, hit: 0 }, 1)
    .facing,
  'E',
);
assert.equal(
  advanceZombieClock(state, { age: 1, seed: 0, vx: -25, vy: 0, hit: 0 }, 1)
    .walk,
  0.32,
);
assert.equal(
  advanceZombieClock(state, { age: 0, seed: 0, vx: 0, vy: -25, hit: 0 }, 1)
    .facing,
  'N',
);
console.log(
  'PASS eight velocity directions, boundary hysteresis, flash continuity/freeze locks and clock reset',
);

for (const [name, a] of Object.entries(manifest.archetypes)) {
  // The carrier has 10 columns with authored defeat frames and is covered by
  // test-ammo-carrier.mjs; preserve all existing gait regressions below.
  if (name === 'ammoCarrier') continue;
  assert.deepEqual(Object.keys(a.directions), native);
  const { data, info } = await sharp(
    path.join(path.dirname(manifestPath), a.atlas),
  )
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  assert.equal(info.width, 2560);
  assert.equal(info.height, 1600);
  assert.equal(info.channels, 4);
  for (let frame = 0; frame < 40; frame++) {
    let visible = 0;
    const left = (frame % 8) * 320,
      top = Math.floor(frame / 8) * 320;
    for (let y = 0; y < 320; y++)
      for (let x = 0; x < 320; x++) {
        const alpha = data[((top + y) * info.width + left + x) * 4 + 3];
        visible += alpha > 0 ? 1 : 0;
        if (x < 4 || x >= 316 || y < 4 || y >= 316)
          assert.equal(alpha, 0, `${name} frame ${frame} clipped`);
      }
    assert.ok(visible > 1000, `${name} frame ${frame} is empty`);
  }
  for (const [direction, clips] of Object.entries(a.directions)) {
    const row = native.indexOf(direction);
    const trace = 'docs/art/hunt-zombies-v3';
    const maskPath =
      name === 'normal'
        ? `${trace}/normal/fixed-lower-${direction}.png`
        : name === 'armored'
          ? `${trace}/armored/fixedlower-${direction}.png`
          : `${trace}/heavy/${name}-fixed-masks.png`;
    let maskImage = sharp(maskPath);
    if (name === 'giant' || name === 'explosive')
      maskImage = maskImage.extract({
        left: row * 320,
        top: 0,
        width: 320,
        height: 320,
      });
    const mask = await maskImage.removeAlpha().greyscale().raw().toBuffer();
    let lockedVisible = 0;
    for (let y = 0; y < 320; y++)
      for (let x = 0; x < 320; x++) {
        if (mask[y * 320 + x] < 128) continue;
        const origin = ((row * 320 + y) * info.width + 4 * 320 + x) * 4;
        if (data[origin + 3] > 0) lockedVisible++;
        for (const column of [5, 6, 7]) {
          const target = ((row * 320 + y) * info.width + column * 320 + x) * 4;
          for (let channel = 0; channel < 4; channel++)
            assert.equal(
              data[target + channel],
              data[origin + channel],
              `${name} ${direction} fixed lower body`,
            );
        }
      }
    assert.ok(
      lockedVisible > 1000,
      `${name} ${direction} fixed mask too small`,
    );
    assert.deepEqual(
      clips.walk.frames,
      [0, 1, 2, 3].map((i) => row * 8 + i),
    );
    assert.deepEqual(
      clips.hit.frames,
      [4, 5, 6].map((i) => row * 8 + i),
    );
    assert.deepEqual(clips.idle.frames, [row * 8 + 7]);
    let time = 0;
    for (let i = 0; i < 4; i++) {
      assert.equal(
        zombieFrame(clips.walk, time + clips.walk.durations[i] / 2),
        row * 8 + i,
      );
      time += clips.walk.durations[i];
    }
    assert.equal(zombieFrame(clips.walk, time + 0.001), row * 8);
    assert.equal(zombieFrame(clips.hit, 50), row * 8 + 6);
  }
  for (const [facing, [, , row, mirror]] of Object.entries(directions)) {
    const d = zombieDirection(a, facing);
    assert.equal(d.mirror, mirror);
    assert.equal(d.clips.walk.frames[0], row * 8);
  }
}
console.log(
  'PASS 160 transparent frame cells, authored views, uneven step timing and mirrored left views',
);

const renderer = Object.create(HuntView.prototype),
  calls = [],
  scales = [];
renderer.ctx = new Proxy(
  {
    save() {},
    restore() {},
    drawImage(...args) {
      calls.push(args);
    },
    scale(...args) {
      scales.push(args);
    },
  },
  { get: (o, k) => (k in o ? o[k] : () => {}) },
);
let gaitSample;
renderer.zombieGait = {
  draw(c, sheet, name, facing, frame, columns, seconds, moving) {
    gaitSample = { name, facing, seconds, moving, filter: c.filter };
    c.drawImage(
      sheet,
      (frame % columns) * 320,
      Math.floor(frame / columns) * 320,
    );
    return true;
  },
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
const draw = (actor) => {
  calls.length = 0;
  scales.length = 0;
  assert.ok(renderer.animatedZombie(actor, 75));
  const call = calls.at(-1);
  return {
    frame: call[1] / 320 + (call[2] / 320) * 8,
    sheet: call[0].id,
    mirror: scales.some((s) => s[0] === -1),
  };
};
for (let kind = 0; kind < 12; kind++)
  for (const [facing, [vx, vy, row, mirror]] of Object.entries(directions)) {
    renderer.zombieClocks.clear();
    const actor = {
      id: kind,
      kind,
      x: 300,
      y: 250,
      age: 0,
      seed: 0,
      hit: 0,
      frozen: 0,
      vx,
      vy,
    };
    assert.deepEqual(draw(actor), {
      frame: row * 8 + 7,
      sheet: manifest.kinds[kind].archetype,
      mirror,
    });
    for (const [age, hit] of [
      [0.05, 0.13],
      [0.1, 0.08],
      [0.15, 0.001],
      [0.16, 0],
      [0.2, 0.13],
    ]) {
      const before = renderer.zombieClocks.get(kind).walk;
      actor.age = age;
      actor.hit = hit;
      assert.equal(
        draw(actor).frame,
        row * 8 + 7,
        'same rig source during damage',
      );
      assert.ok(gaitSample.seconds > before, 'repeated hits never pause feet');
      assert.equal(gaitSample.filter.includes('contrast('), hit > 0);
    }
    actor.frozen = 1;
    actor.vx = -vx;
    actor.vy = -vy;
    actor.age = 0.25;
    const frozenTime = gaitSample.seconds;
    assert.equal(draw(actor).frame, row * 8 + 7);
    assert.equal(gaitSample.seconds, frozenTime);
    assert.equal(gaitSample.facing, native[row]);
    actor.frozen = 0;
    actor.age = 0.3;
    draw(actor);
    assert.equal(
      renderer.zombieClocks.get(kind).facing,
      zombieFacing(-vx, -vy),
      'damage does not lock facing',
    );
    calls.length = 0;
    scales.length = 0;
    renderer.zombieSprite(kind, 75, facing);
    const death = calls.at(-1);
    assert.equal(death[1] / 320 + (death[2] / 320) * 8, row * 8 + 7);
    assert.equal(
      scales.some((s) => s[0] === -1),
      mirror,
    );
  }
renderer.game = {
  courierVictory: { age: 0.2, x: 300, y: 350, facing: 'N' },
  save: { courier: { reveal: null } },
};
calls.length = 0;
renderer.courierVictory();
assert.equal(calls.length, 16);
assert.ok(calls.every((c) => c[0].id === 'armored' && c[2] >= 1280));
console.log(
  'PASS actual renderer: all 12 kinds × 8 views, move-hit-move, freeze, death fade and rear-facing courier fragments',
);

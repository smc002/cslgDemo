import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import sharp from 'sharp';
await build({
  entryPoints: ['hunt/ammo-return-vfx.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: '.test-cache/ammo-return-vfx.mjs',
});
const {
  ammoParticle,
  AMMO_PARTICLES,
  AMMO_RETURN_SECONDS,
  AMMO_DEATH_HOLD,
  AMMO_FIRST_BATCH,
  AMMO_FINAL_ARRIVAL,
  ammoFlightTiming,
  ammoArrivalPulse,
  drawAmmoDeath,
} = await import('../.test-cache/ammo-return-vfx.mjs');
const manifest = JSON.parse(
  await readFile('public/assets/hunt/ammo-return-v1/manifest.json', 'utf8'),
);
for (const file of [...manifest.frames, ...manifest.props]) {
  const image = sharp(`public/assets/hunt/ammo-return-v1/${file}`);
  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const meta = await image.metadata();
  assert.ok(meta.hasAlpha);
  for (let x = 0; x < info.width; x++) {
    assert.equal(data[x * 4 + 3], 0, `${file} top gutter`);
    assert.equal(
      data[((info.height - 1) * info.width + x) * 4 + 3],
      0,
      `${file} bottom gutter`,
    );
  }
  for (let y = 0; y < info.height; y++) {
    assert.equal(data[y * info.width * 4 + 3], 0, `${file} left gutter`);
    assert.equal(
      data[(y * info.width + info.width - 1) * 4 + 3],
      0,
      `${file} right gutter`,
    );
  }
  if (file.startsWith('death'))
    assert.deepEqual([info.width, info.height], [512, 512]);
}
for (const scale of [0.3, 0.7, 1.5]) {
  for (let i = 0; i < AMMO_PARTICLES; i++) {
    const p = (age) => ammoParticle(age, i, 250, 250, 35, 740, scale);
    assert.equal(p(0).alpha, 0);
    const { start, arrival } = ammoFlightTiming(i);
    const before = p(start - 1e-6),
      after = p(start + 1e-6);
    assert.ok(
      Math.hypot(after.x - before.x, after.y - before.y) < 0.001,
      'no jump when return starts',
    );
    const end = p(arrival);
    assert.ok(
      Math.hypot(end.x - 35, end.y - 740) < 1e-6,
      'arrives at real HUD target',
    );
    assert.equal(end.alpha, 0, 'particle disappears on actual arrival');
    assert.equal(p(AMMO_RETURN_SECONDS).alpha, 0);
    assert.deepEqual(
      p(0.8),
      p(0.8),
      'pure simulation-clock animation pauses exactly',
    );
  }
}
assert.equal(AMMO_DEATH_HOLD, 0.5);
assert.equal(AMMO_RETURN_SECONDS, 2.1);
assert.equal(AMMO_FIRST_BATCH, 3);
assert.equal(AMMO_PARTICLES, 8);
for (let i = 0; i < AMMO_PARTICLES; i++) {
  const { start, arrival } = ammoFlightTiming(i);
  assert.equal(start < AMMO_DEATH_HOLD, i < AMMO_FIRST_BATCH);
  assert.ok(
    ammoArrivalPulse(arrival) > 0,
    'HUD pulses at each particle arrival',
  );
  const p = (age) => ammoParticle(age, i, 250, 250, 35, 740, 1);
  assert.ok(p(arrival - 1e-6).alpha > 0, 'not hidden before arrival');
  assert.equal(p(arrival).alpha, 0);
  if (i >= AMMO_FIRST_BATCH)
    assert.equal(
      p(AMMO_DEATH_HOLD).returning,
      false,
      'second batch waits for death release',
    );
}
assert.ok(AMMO_FINAL_ARRIVAL >= 1.2 && AMMO_FINAL_ARRIVAL <= 1.3);
assert.equal(AMMO_FINAL_ARRIVAL, ammoFlightTiming(AMMO_PARTICLES - 1).arrival);
assert.equal(ammoArrivalPulse(ammoFlightTiming(0).arrival - 1e-6), 0);
assert.equal(
  ammoArrivalPulse(AMMO_FINAL_ARRIVAL),
  1,
  'last particle triggers full inventory accent',
);
assert.equal(ammoArrivalPulse(AMMO_FINAL_ARRIVAL + 0.301), 0);
for (let age = -0.1; age <= AMMO_RETURN_SECONDS; age += 0.01) {
  const pulse = ammoArrivalPulse(age);
  assert.ok(pulse >= 0 && pulse <= 1);
  assert.equal(
    pulse,
    ammoArrivalPulse(age),
    'HUD timing also pauses with simulation',
  );
}
const frames = manifest.frames.map((name) => ({
  name,
  width: 512,
  height: 512,
}));
const calls = [];
const c = new Proxy(
  { globalAlpha: 1, drawImage: (...args) => calls.push(args[0]), createRadialGradient: () => ({ addColorStop() {} }) },
  { get: (target, key) => target[key] ?? (() => {}) },
);
const props = manifest.props.map((name) => ({ name, width: 256, height: 256 }));
for (const [age, expected] of [
  [0.05, 0],
  [0.49, 0],
  [0.7, 1],
  [0.9, 2],
  [1.1, 3],
]) {
  calls.length = 0;
  drawAmmoDeath(c, { frames, props }, { age, x: 0, y: 0, facing: 'S' }, 1, 121);
  assert.ok(calls.includes(frames[expected]));
}
const actorCalls = [];
c.drawImage = (...args) => {
  if (frames.includes(args[0])) actorCalls.push({ args, filter: c.filter });
};
for (const age of [0.1, 0.49])
  drawAmmoDeath(c, { frames, props }, { age, x: 0, y: 0, facing: 'S' }, 1, 121);
assert.deepEqual(
  actorCalls[0],
  actorCalls[1],
  'same pose, size, position and edge glow throughout 0.5-second hold',
);
assert.match(actorCalls[0].filter, /drop-shadow/);
assert.ok(ammoParticle(0.36, 0, 250, 250, 35, 740, 1).returning);
assert.notDeepEqual(
  ammoParticle(0.36, 0, 250, 250, 35, 740, 1),
  ammoParticle(0.4, 0, 250, 250, 35, 740, 1),
  'ammunition moves while body holds',
);
assert.equal(
  ammoParticle(AMMO_DEATH_HOLD, 0, 250, 250, 35, 740, 1).alpha,
  0,
  'first ammunition reaches inventory during hold',
);
c.drawImage = (...args) => calls.push(args[0]);
calls.length = 0;
drawAmmoDeath(
  c,
  { frames, props },
  { age: 1.8, x: 0, y: 0, facing: 'S' },
  1,
  121,
);
assert.ok(
  !calls.some((image) => frames.includes(image)),
  'death never loops or revives',
);
console.log(
  'PASS 10 transparent isolated assets; aligned poses; two return batches at 3 scales; arrival-driven HUD pulse; 0.5s hold and 2.1s non-looping death',
);

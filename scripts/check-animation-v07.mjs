import sharp from 'sharp';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { build } from 'esbuild';
const reports = [];
for (const hero of ['shield', 'medic', 'drone']) {
  const root = `public/assets/animations/${hero}`;
  const mask = await sharp(`${root}/fixed-lower-mask.png`)
    .greyscale()
    .removeAlpha()
    .raw()
    .toBuffer();
  assert.equal(mask.length, 384 * 384);
  const base = await sharp(`${root}/idle.png`).ensureAlpha().raw().toBuffer();
  const visibleLocked = mask.reduce(
    (n, a, i) => n + (a > 0 && base[i * 4 + 3] > 64 ? 1 : 0),
    0,
  );
  assert.ok(
    visibleLocked > 3000,
    'mask must cover visible legs, not only empty canvas',
  );
  let checked = 0;
  for (const clip of ['attack', 'skill']) {
    const { data, info } = await sharp(`${root}/${clip}.png`)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    for (let frame = 0; frame < 4; frame++)
      for (let y = 0; y < 384; y++)
        for (let x = 0; x < 384; x++) {
          const i = y * 384 + x;
          if (!mask[i]) continue;
          for (let c = 0; c < 4; c++)
            assert.equal(
              data[(y * info.width + frame * 384 + x) * 4 + c],
              base[i * 4 + c],
              `${hero} ${clip} frame${frame} lower body differs`,
            );
          checked++;
        }
  }
  assert.ok(
    checked > 200000,
    'the comparison mask must include a real lower-body area',
  );
  reports.push({
    hero,
    visibleLockedPixels: visibleLocked,
    lowerBodyPixelComparisons: checked,
    identical: true,
  });
}
await build({
  entryPoints: ['shared/hero-animation.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: '.test-cache/aim-check.mjs',
});
const { sniperAim, poseClip } = await import('../.test-cache/aim-check.mjs');
let maximum = 0;
for (const radius of [100, 200, 400])
  for (let angle = -180; angle < 180; angle++) {
    const rad = (angle * Math.PI) / 180,
      aim = sniperAim(
        195,
        450,
        195 + Math.cos(rad) * radius,
        450 + Math.sin(rad) * radius,
      );
    assert.ok(aim.clip.startsWith('aim-'));
    maximum = Math.max(maximum, aim.error);
    assert.ok(Number.isFinite(poseClip(8, aim.clip).frames[2].muzzleX));
  }
assert.ok(maximum < 27, `direction coverage gap ${maximum}`);
reports.push({
  sniperSourceDirections: 8,
  mirroring: true,
  sampledAngles: 1080,
  maxResidualDegrees: maximum,
});
fs.writeFileSync(
  'docs/animation-v07-validation.json',
  JSON.stringify(reports, null, 2),
);
console.log(JSON.stringify(reports, null, 2));

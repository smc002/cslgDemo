// Deterministic atlas repair: preserve source pixels, separate silhouettes, add an apron.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const source = 'public/assets/hunt/zombies.png';
const output = 'public/assets/hunt/zombies-isolated.png';
const { data, info } = await sharp(source)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
assert.equal(info.width, 1254);
assert.equal(info.height, 1254);
const labels = new Int32Array(info.width * info.height).fill(-1);
const components = [];
for (let start = 0; start < labels.length; start++) {
  if (labels[start] >= 0 || !data[start * 4 + 3]) continue;
  const pixels = [start],
    id = components.length;
  labels[start] = id;
  let left = info.width,
    top = info.height,
    right = 0,
    bottom = 0;
  for (let i = 0; i < pixels.length; i++) {
    const p = pixels[i],
      x = p % info.width,
      y = Math.floor(p / info.width);
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x);
    bottom = Math.max(bottom, y);
    for (const next of [
      x > 0 ? p - 1 : -1,
      x < info.width - 1 ? p + 1 : -1,
      y > 0 ? p - info.width : -1,
      y < info.height - 1 ? p + info.width : -1,
    ]) {
      if (next >= 0 && labels[next] < 0 && data[next * 4 + 3]) {
        labels[next] = id;
        pixels.push(next);
      }
    }
  }
  components.push({ id, pixels, left, top, right, bottom });
}
const bodies = components.filter((c) => c.pixels.length > 10000);
assert.equal(bodies.length, 9, 'Review new art before regenerating its atlas');
for (const body of bodies) {
  body.col = Math.round(((body.left + body.right) / 2 - 209) / 418);
  body.row = Math.round(((body.top + body.bottom) / 2 - 209) / 418);
  body.kind = body.row * 3 + body.col;
}
assert.equal(new Set(bodies.map((b) => b.kind)).size, 9);
const cell = 512,
  apron = 47,
  width = cell * 3;
const repaired = Buffer.alloc(width * width * 4);
const counts = Array(9).fill(0);
for (const component of components) {
  // Detached antialiasing islands stay with the nearest complete silhouette.
  const x = (component.left + component.right) / 2;
  const y = (component.top + component.bottom) / 2;
  const distance = (b) =>
    Math.hypot(
      Math.max(b.left - x, 0, x - b.right),
      Math.max(b.top - y, 0, y - b.bottom),
    );
  const body = bodies.includes(component)
    ? component
    : [...bodies].sort((a, b) => distance(a) - distance(b))[0];
  for (const p of component.pixels) {
    const sx = p % info.width,
      sy = Math.floor(p / info.width);
    const x = sx - body.col * 418 + apron,
      y = sy - body.row * 418 + apron;
    assert.ok(
      x >= 2 && x < cell - 2 && y >= 2 && y < cell - 2,
      `kind ${body.kind}: transparent sampling gutter`,
    );
    const dest = ((body.row * cell + y) * width + body.col * cell + x) * 4;
    data.copy(repaired, dest, p * 4, p * 4 + 4);
    counts[body.kind]++;
  }
}
assert.equal(
  counts.reduce((a, b) => a + b, 0),
  components.reduce((n, c) => n + c.pixels.length, 0),
);
await sharp(repaired, { raw: { width, height: width, channels: 4 } })
  .png()
  .toFile(output);
await mkdir('docs/zombie-crop-evidence', { recursive: true });
const tiles = [];
for (let kind = 0; kind < 9; kind++) {
  const col = kind % 3,
    row = Math.floor(kind / 3);
  // Match the actual draw coordinates/scale: the new apron extends beyond the old box.
  for (let variant = 0; variant < 2; variant++) {
    const size = variant ? 512 : 418;
    const image = await sharp(variant ? output : source)
      .extract({ left: col * size, top: row * size, width: size, height: size })
      .resize(variant ? 196 : 160, variant ? 196 : 160)
      .png()
      .toBuffer();
    tiles.push({
      input: image,
      left: col * 440 + variant * 220 + (variant ? 12 : 30),
      top: row * 250 + (variant ? 36 : 54),
    });
    const label = `<svg width="220" height="30"><text x="12" y="22" fill="#263342" font-size="17">${kind} · ${variant ? 'FIXED' : 'BEFORE'}</text></svg>`;
    tiles.push({
      input: Buffer.from(label),
      left: col * 440 + variant * 220,
      top: row * 250 + 5,
    });
  }
}
await sharp({
  create: { width: 1320, height: 750, channels: 4, background: '#eee1bc' },
})
  .composite(tiles)
  .png()
  .toFile('docs/zombie-crop-evidence/zombies-before-after.png');
await writeFile(
  'docs/zombie-crop-evidence/alpha-audit.json',
  JSON.stringify(
    {
      source,
      output,
      sourceSize: 1254,
      cell,
      apron,
      bodies: bodies
        .sort((a, b) => a.kind - b.kind)
      .map(({ pixels, id: _id, ...b }) => ({
          ...b,
          connectedPixels: pixels.length,
          preservedPixels: counts[b.kind],
        })),
      preservedPixels: counts.reduce((a, b) => a + b, 0),
      zeroDiscardedPixels: true,
      transparentGutter: true,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  'PASS: all nine silhouettes isolated; every nontransparent source pixel retained; transparent gutters verified.',
);

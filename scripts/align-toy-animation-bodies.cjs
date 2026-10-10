// Measure translation of the torso, not the alternating support foot.
/* oxlint-disable typescript/no-require-imports -- CommonJS asset build script. */
// Only sprite origin metadata changes; authored limb poses remain untouched.
const fs = require('node:fs');
const sharp = require('C:/Users/hy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const metaPath = 'shared/toy-animation-data.json';
const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
const report = {};
function bounds(data, width, index) {
  const ox = (index % 4) * 256,
    oy = Math.floor(index / 4) * 256;
  let left = 256,
    right = 0,
    top = 256,
    bottom = 0;
  for (let y = 0; y < 256; y++)
    for (let x = 0; x < 256; x++)
      if (data[((oy + y) * width + ox + x) * 4 + 3] > 200) {
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
  return { left, right, top, bottom };
}
function register(data, width, reference, target, box) {
  const pixels = [];
  const offset = (i) => [(i % 4) * 256, Math.floor(i / 4) * 256];
  const [rx, ry] = offset(reference),
    [tx, ty] = offset(target);
  for (let y = Math.ceil(box[1]); y < box[3]; y += 2)
    for (let x = Math.ceil(box[0]); x < box[2]; x += 2) {
      const p = ((ry + y) * width + rx + x) * 4;
      if (data[p + 3] > 220)
        pixels.push([x, y, data[p], data[p + 1], data[p + 2]]);
    }
  function score(dx, dy) {
    let error = 0;
    for (const [x, y, r, g, b] of pixels) {
      if (x + dx < 0 || x + dx >= 256 || y + dy < 0 || y + dy >= 256) {
        error += 50000;
        continue;
      }
      const p = ((ty + y + dy) * width + tx + x + dx) * 4;
      error += Math.min(
        50000,
        (data[p] - r) ** 2 +
          (data[p + 1] - g) ** 2 +
          (data[p + 2] - b) ** 2 +
          (255 - data[p + 3]) ** 2,
      );
    }
    return error / pixels.length;
  }
  let best = { dx: 0, dy: 0, error: Infinity };
  for (let dy = -30; dy <= 30; dy += 3)
    for (let dx = -66; dx <= 66; dx += 3) {
      const error = score(dx, dy);
      if (error < best.error) best = { dx, dy, error };
    }
  const coarse = best;
  for (let dy = coarse.dy - 3; dy <= coarse.dy + 3; dy++)
    for (let dx = coarse.dx - 3; dx <= coarse.dx + 3; dx++) {
      const error = score(dx, dy);
      if (error < best.error) best = { dx, dy, error };
    }
  return best;
}
(async () => {
  for (const [id, art] of Object.entries(metadata)) {
    const { data, info } = await sharp(
      'public/assets/toy-v1/animations/' + art.sheet,
    )
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const b = bounds(data, info.width, 0),
      w = b.right - b.left,
      h = b.bottom - b.top;
    const region = {
      'zombie-giant': [0.48, 0.08, 0.74, 0.34],
      'zombie-courier': [0.3, 0.23, 0.56, 0.43],
      'zombie-armored': [0.3, 0.28, 0.73, 0.55],
    }[id] ?? [0.34, 0.25, 0.69, 0.65];
    const box = [
      b.left + w * region[0],
      b.top + h * region[1],
      b.left + w * region[2],
      b.top + h * region[3],
    ];
    const shifts = Array.from({ length: 8 }, (_, i) =>
      register(data, info.width, 0, i, box),
    );
    // Align the walk loop to its stationary recovery pose, avoiding a start/stop jump.
    const base = shifts[7];
    art.frameAnchors = shifts.map((s, i) =>
      i < 4 ? [128 + s.dx - base.dx, 248 + s.dy - base.dy] : [128, 248],
    );
    art.alignment = 'torso-registered walk, recovery pose reference';
    let radius = 0;
    for (let i = 0; i < 8; i++) {
      const b = bounds(data, info.width, i),
        a = art.frameAnchors[i];
      radius = Math.max(radius, a[0] - b.left, b.right - a[0]);
    }
    art.halfWidth = radius;
    report[id] = {
      shifts,
      frameAnchors: art.frameAnchors,
      walkDriftBefore: {
        x:
          Math.max(...shifts.slice(0, 4).map((s) => s.dx)) -
          Math.min(...shifts.slice(0, 4).map((s) => s.dx)),
        y:
          Math.max(...shifts.slice(0, 4).map((s) => s.dy)) -
          Math.min(...shifts.slice(0, 4).map((s) => s.dy)),
      },
    };
  }
  fs.mkdirSync('outputs/toy-animation-v2', { recursive: true });
  fs.writeFileSync(
    'outputs/toy-animation-v2/body-alignment.json',
    JSON.stringify(report, null, 2),
  );
  if (!process.argv.includes('--check'))
    fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2) + '\n');
  console.log(
    JSON.stringify(
      Object.fromEntries(
        Object.entries(report).map(([id, r]) => [id, r.walkDriftBefore]),
      ),
      null,
      2,
    ),
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

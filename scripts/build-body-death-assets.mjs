import fs from 'node:fs/promises';
import sharp from 'sharp';
const groups = [
  ['ordinary', [0, 1, 2, 4]],
  ['elemental', [5, 6, 7, 8]],
  ['heavy', [3, 9]],
  ['weapons', [10, 11, 12]],
];
const destination = 'public/assets/hunt/body-death-v1';
await fs.mkdir(destination, { recursive: true });
const records = [];
// Extract each independently authored pose. Main-component bounds exclude tiny
// remnants from adjacent rows in the supplied sheets; no limbs are warped.
function mainBounds(data, w, h) {
  const seen = new Uint8Array(w * h),
    parts = [];
  for (let p = 0; p < w * h; p++) {
    if (seen[p] || data[p * 4 + 3] < 64) continue;
    const queue = [p];
    seen[p] = 1;
    let left = w,
      top = h,
      right = 0,
      bottom = 0;
    for (let q = 0; q < queue.length; q++) {
      const i = queue[q],
        x = i % w,
        y = Math.floor(i / w);
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      for (const next of [
        x > 0 ? i - 1 : -1,
        x < w - 1 ? i + 1 : -1,
        y > 0 ? i - w : -1,
        y < h - 1 ? i + w : -1,
      ]) {
        if (next >= 0 && !seen[next] && data[next * 4 + 3] >= 64) {
          seen[next] = 1;
          queue.push(next);
        }
      }
    }
    parts.push({ left, top, right, bottom, area: queue.length });
  }
  parts.sort((a, b) => b.area - a.area);
  if (!parts[0]) throw Error('Empty death pose');
  const b = { ...parts[0] };
  for (const p of parts.slice(1)) {
    const dx = Math.max(0, b.left - p.right, p.left - b.right),
      dy = Math.max(0, b.top - p.bottom, p.top - b.bottom);
    if (p.area > 80 && Math.hypot(dx, dy) < 20) {
      b.left = Math.min(b.left, p.left);
      b.right = Math.max(b.right, p.right);
      b.top = Math.min(b.top, p.top);
      b.bottom = Math.max(b.bottom, p.bottom);
    }
  }
  return {
    left: Math.max(0, b.left - 2),
    top: Math.max(0, b.top - 2),
    width: Math.min(w, b.right + 3) - Math.max(0, b.left - 2),
    height: Math.min(h, b.bottom + 3) - Math.max(0, b.top - 2),
  };
}
for (const [name, kinds] of groups) {
  const file = `docs/body-death-v1/source/${name}.png`;
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const poses = kinds.map(() => []);
  for (let col = 0; col < 3; col++) {
    const left = Math.floor((col * info.width) / 3),
      right = Math.floor(((col + 1) * info.width) / 3);
    const counts = Array.from({ length: info.height }, (_, y) => {
      let count = 0;
      for (let x = left; x < right; x++)
        if (data[(y * info.width + x) * 4 + 3] > 96) count++;
      return count;
    });
    const cuts = [0];
    for (let k = 1; k < kinds.length; k++) {
      const low = Math.floor(((k - 0.2) * info.height) / kinds.length),
        high = Math.floor(((k + 0.2) * info.height) / kinds.length);
      let best = low;
      for (let y = low; y < high; y++) if (counts[y] < counts[best]) best = y;
      cuts.push(best);
    }
    cuts.push(info.height);
    for (let row = 0; row < kinds.length; row++) {
      const cell = await sharp(file)
        .extract({
          left,
          top: cuts[row],
          width: right - left,
          height: cuts[row + 1] - cuts[row],
        })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const bounds = mainBounds(cell.data, cell.info.width, cell.info.height);
      const pose = await sharp(cell.data, { raw: cell.info })
        .extract(bounds)
        .png()
        .toBuffer();
      poses[row].push({ pose, bounds });
    }
  }
  for (let row = 0; row < kinds.length; row++) {
    const entries = poses[row];
    // ONE scale per identity preserves body volume between standing and lying.
    const ratio = Math.min(
      376 / entries[0].bounds.height,
      460 / Math.max(...entries.map((p) => p.bounds.width)),
      410 / Math.max(...entries.map((p) => p.bounds.height)),
    );
    for (let frame = 0; frame < 3; frame++) {
      const { pose, bounds } = entries[frame];
      const width = Math.round(bounds.width * ratio),
        height = Math.round(bounds.height * ratio);
      const output = `${destination}/${kinds[row]}-${frame}.png`;
      await sharp({
        create: {
          width: 512,
          height: 512,
          channels: 4,
          background: '#00000000',
        },
      })
        .composite([
          {
            input: await sharp(pose).resize(width, height).toBuffer(),
            left: Math.round(256 - width / 2),
            top: 448 - height,
          },
        ])
        .png()
        .toFile(output);
      records.push({
        kind: kinds[row],
        frame,
        source: name,
        width,
        height,
        ratio,
      });
    }
  }
}
await fs.writeFile(
  `${destination}/manifest.json`,
  JSON.stringify(
    { cell: 512, anchor: [256, 448], standingHeight: 376, frames: records },
    null,
    2,
  ),
);
console.log(`Packed ${records.length} authored death poses`);

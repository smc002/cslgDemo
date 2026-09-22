import sharp from 'sharp';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

const root = 'public/assets/animations',
  source = `${root}/source-v07`,
  cell = 384,
  anchorX = 192,
  anchorY = 364;
const blank = () => Buffer.alloc(cell * cell * 4);

// Isolate connected bodies rather than cutting through limbs at equal grid boundaries.
async function bodies(file, count, cols = 4) {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const visited = new Uint8Array(info.width * info.height),
    parts = [];
  for (let p = 0; p < visited.length; p++) {
    if (visited[p] || data[p * 4 + 3] <= 64) continue;
    const points = [p];
    visited[p] = 1;
    let l = info.width,
      t = info.height,
      r = 0,
      b = 0;
    for (let j = 0; j < points.length; j++) {
      const q = points[j],
        x = q % info.width,
        y = Math.floor(q / info.width);
      l = Math.min(l, x);
      r = Math.max(r, x);
      t = Math.min(t, y);
      b = Math.max(b, y);
      for (const n of [
        x ? q - 1 : -1,
        x < info.width - 1 ? q + 1 : -1,
        y ? q - info.width : -1,
        y < info.height - 1 ? q + info.width : -1,
      ])
        if (n >= 0 && !visited[n] && data[n * 4 + 3] > 64) {
          visited[n] = 1;
          points.push(n);
        }
    }
    if (points.length > 5000) parts.push({ points, l, t, r, b });
  }
  assert.equal(parts.length, count, `${file} body count`);
  parts.sort((a, b) => a.t + a.b - (b.t + b.b));
  const ordered = [];
  for (let i = 0; i < count; i += cols)
    ordered.push(...parts.slice(i, i + cols).sort((a, b) => a.l - b.l));
  return ordered.map((p) => {
    const w = p.r - p.l + 1,
      h = p.b - p.t + 1,
      raw = Buffer.alloc(w * h * 4);
    for (const q of p.points) {
      const x = (q % info.width) - p.l,
        y = Math.floor(q / info.width) - p.t,
        at = (y * w + x) * 4;
      data.copy(raw, at, q * 4, q * 4 + 3);
      raw[at + 3] = Math.min(255, Math.round((data[q * 4 + 3] * 255) / 253));
    }
    let sum = 0,
      weight = 0;
    for (let y = Math.floor(h * 0.91); y < h; y++)
      for (let x = 0; x < w; x++) {
        const a = raw[(y * w + x) * 4 + 3];
        sum += x * a;
        weight += a;
      }
    return { ...p, w, h, raw, footX: sum / weight };
  });
}
async function normalize(p, scale, offsetX = 0) {
  const w = Math.round(p.w * scale),
    h = Math.round(p.h * scale),
    x = Math.round(anchorX - p.footX * scale + offsetX),
    y = anchorY - h;
  assert.ok(
    x >= 0 && x + w <= cell && y >= 0,
    `frame exceeds padded cell ${[x, y, w, h]}`,
  );
  const image = await sharp(p.raw, {
    raw: { width: p.w, height: p.h, channels: 4 },
  })
    .resize(w, h)
    .raw()
    .toBuffer();
  const raw = blank();
  for (let row = 0; row < h; row++)
    image.copy(raw, ((y + row) * cell + x) * 4, row * w * 4, (row + 1) * w * 4);
  return { raw, x, y, w, h, scale, p };
}
function lockLower(frame, base, mask) {
  const raw = Buffer.from(frame.raw);
  for (let i = 0; i < cell * cell; i++)
    if (mask[i])
      for (let c = 0; c < 4; c++) raw[i * 4 + c] = base.raw[i * 4 + c];
  return { ...frame, raw };
}
async function sheet(folder, name, frames) {
  const width = frames.length * cell;
  await sharp({
    create: { width, height: cell, channels: 4, background: '#00000000' },
  })
    .composite(
      await Promise.all(
        frames.map(async (f, i) => ({
          input: await sharp(f.raw, {
            raw: { width: cell, height: cell, channels: 4 },
          })
            .png()
            .toBuffer(),
          left: i * cell,
          top: 0,
        })),
      ),
    )
    .png()
    .toFile(`${root}/${folder}/${name}.png`);
}
function metadata(name, frames, scale, muzzles, angle) {
  return {
    name,
    pixelsPerUnit: 290 / 3.2,
    sheetWidth: frames.length * cell,
    sheetHeight: cell,
    impactFrame: 2,
    ...(angle !== undefined ? { aimAngle: angle } : {}),
    frames: frames.map((f, i) => ({
      x: i * cell,
      y: 0,
      w: cell,
      h: cell,
      anchorX,
      anchorY,
      duration: 0.16,
      visibleHeight: 290,
      muzzleX: muzzles ? f.x + (muzzles[i][0] - f.p.l) * scale : anchorX,
      muzzleY: muzzles ? f.y + (muzzles[i][1] - f.p.t) * scale : anchorY - 160,
    })),
  };
}

const report = [];
for (const hero of ['shield', 'medic', 'drone']) {
  const poses = await bodies(`${source}/${hero}-raw.png`, 8),
    scale = 290 / poses[0].h;
  const frames = await Promise.all(poses.map((p) => normalize(p, scale)));
  const base = frames[0],
    mask = new Uint8Array(cell * cell),
    cut = { shield: 330, medic: 329, drone: 337 }[hero];
  for (let y = 0; y < cell; y++)
    for (let x = 0; x < cell; x++) {
      const sx = (x - base.x) / scale + base.p.l,
        sy = (y - base.y) / scale + base.p.t;
      // Preserve the shield and baton below the belt while freezing the actual hips/legs.
      const fixed =
        sy >= cut &&
        (hero !== 'shield' ||
          sy >= 412 ||
          (sx >= 83 && sx <= Math.min(294, 265 + (sy - 330) * 0.35)));
      if (fixed) mask[y * cell + x] = 255;
    }
  const locked = frames.map((f) => lockLower(f, base, mask));
  const meta = JSON.parse(await readFile(`${root}/${hero}/clips.json`, 'utf8'));
  const muzzle =
    hero === 'medic'
      ? [
          [351, 169],
          [752, 48],
          [1121, 38],
          [351, 169],
          [329, 646],
          [737, 645],
          [1114, 644],
          [351, 169],
        ]
      : null;
  const definitions = [
    ['idle', [0]],
    ['attack', [0, 1, 2, 0]],
    ['skill', [4, 5, 6, 0]],
  ];
  for (const [name, indices] of definitions) {
    const selected = indices.map((i) => locked[i]);
    await sheet(hero, name, selected);
    const clip = metadata(
      name,
      selected,
      scale,
      muzzle && indices.map((i) => muzzle[i]),
    );
    meta.clips = meta.clips.filter((c) => c.name !== name);
    meta.clips.push(clip);
  }
  await sharp(mask, { raw: { width: cell, height: cell, channels: 1 } })
    .png()
    .toFile(`${root}/${hero}/fixed-lower-mask.png`);
  await writeFile(`${root}/${hero}/clips.json`, JSON.stringify(meta));
  await writeFile(
    `shared/animation-data/${hero}.json`,
    JSON.stringify(meta, null, 2),
  );
  const entry = {
    hero,
    scale,
    anchor: [anchorX, anchorY],
    fixedSource: 0,
    sourceBounds: poses.map((p) => [p.l, p.t, p.r, p.b]),
    cutSourceY: cut,
    lockedPixels: mask.filter(Boolean).length,
  };
  report.push(entry);
  console.log('LOCKED', entry.hero, entry.lockedPixels);
}

// Sniper five measured directions; per-row lower-body source and one scale for the whole sheet.
const sniper = await bodies(`${source}/sniper-directional-raw.png`, 20),
  measure = JSON.parse(
    await readFile(`${source}/sniper-barrel-review.json`, 'utf8'),
  );
const meta = JSON.parse(
  await readFile('shared/animation-data/sniper.json', 'utf8'),
);
meta.clips = meta.clips.filter((c) => !c.name.startsWith('aim-'));
// Normalize by actual body rather than top-of-gun height. Upright old sprites are290; crouch body ~205.
const scale = 1;
for (let row = 0; row < 5; row++) {
  const poses = sniper.slice(row * 4, row * 4 + 4),
    frames = await Promise.all(poses.map((p) => normalize(p, scale)));
  const name = ['aim-n', 'aim-ne', 'aim-e', 'aim-sse', 'aim-s'][row];
  // For frontal shots the gun overlaps the knees; preserve its foreground pixels rather than cutting it off.
  // Use a stable complete lower pose for N/NE/E. S/SSE retain generated whole frames until a separate gun layer exists.
  const base = frames[0],
    mask = new Uint8Array(cell * cell);
  if (row < 3) {
    const cutY = base.y + base.h * 0.72;
    for (let y = Math.ceil(cutY); y < cell; y++)
      mask.fill(255, y * cell, (y + 1) * cell);
  }
  const fixed = frames.map((f) => lockLower(f, base, mask));
  fixed[3] = fixed[0];
  await sheet('sniper', name, fixed);
  const measurements = measure.slice(row * 4, row * 4 + 4);
  measurements[3] = measurements[0];
  const clip = metadata(
    name,
    fixed,
    scale,
    measurements.map((m) => m.approxMuzzle),
    measurements[2].barrelAngleDeg,
  );
  // A crouched sprite occupies less vertical room than a standing sprite; preserve world proportions.
  clip.pixelsPerUnit = 290 / 3.2;
  meta.clips.push(clip);
  report.push({
    hero: 'sniper',
    clip: name,
    angle: clip.aimAngle,
    sourceBounds: poses.map((p) => [p.l, p.t, p.r, p.b]),
    lowerLocked: row < 3,
  });
}
{
  const poses = await bodies(`${source}/sniper-se-raw.png`, 4),
    seScale = 220 / poses[0].h;
  const frames = await Promise.all(poses.map((p) => normalize(p, seScale)));
  const measured = JSON.parse(
    await readFile(`${source}/sniper-se-barrel-review.json`, 'utf8'),
  );
  const mask = new Uint8Array(cell * cell);
  for (let y = Math.ceil(frames[0].y + frames[0].h * 0.76); y < cell; y++)
    mask.fill(255, y * cell, (y + 1) * cell);
  const fixed = frames.map((f) => lockLower(f, frames[0], mask));
  fixed[3] = fixed[0];
  measured[3] = measured[0];
  await sheet('sniper', 'aim-se', fixed);
  const clip = metadata(
    'aim-se',
    fixed,
    seScale,
    measured.map((m) => m.approxMuzzle),
    measured[2].barrelAngleDeg,
  );
  meta.clips.push(clip);
  report.push({
    hero: 'sniper',
    clip: 'aim-se',
    scale: seScale,
    angle: clip.aimAngle,
    lowerLocked: true,
  });
}
{
  const all = await bodies(`${source}/sniper-upper-diagonals-raw.png`, 8),
    upperScale = 0.73;
  const measured = JSON.parse(
    await readFile(
      `${source}/sniper-upper-diagonals-barrel-review.json`,
      'utf8',
    ),
  );
  for (let row = 0; row < 2; row++) {
    const poses = all.slice(row * 4, row * 4 + 4),
      frames = await Promise.all(poses.map((p) => normalize(p, upperScale)));
    const mask = new Uint8Array(cell * cell);
    for (let y = Math.ceil(frames[0].y + frames[0].h * 0.76); y < cell; y++)
      mask.fill(255, y * cell, (y + 1) * cell);
    const fixed = frames.map((f) => lockLower(f, frames[0], mask));
    fixed[3] = fixed[0];
    const m = measured.slice(row * 4, row * 4 + 4);
    m[3] = m[0];
    const name = row === 0 ? 'aim-nne' : 'aim-ene';
    await sheet('sniper', name, fixed);
    const clip = metadata(
      name,
      fixed,
      upperScale,
      m.map((m) => m.approxMuzzle),
      m[2].barrelAngleDeg,
    );
    meta.clips.push(clip);
    report.push({
      hero: 'sniper',
      clip: name,
      scale: upperScale,
      angle: clip.aimAngle,
      lowerLocked: true,
    });
  }
}
await writeFile(`${root}/sniper/clips.json`, JSON.stringify(meta));
await writeFile(
  'shared/animation-data/sniper.json',
  JSON.stringify(meta, null, 2),
);
await writeFile(`${source}/processing.json`, JSON.stringify(report, null, 2));

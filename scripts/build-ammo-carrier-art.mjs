import sharp from 'sharp';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
const root = 'docs/art/ammo-carrier-v1',
  output = 'public/assets/hunt/ammo-carrier-v1',
  C = 320;
const directions = ['S', 'SE', 'E', 'NE', 'N'];
async function source(name, cols) {
  const { data, info } = await sharp(`${root}/${name}-source.png`)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const seen = new Uint8Array(info.width * info.height),
    parts = [];
  for (let p = 0; p < seen.length; p++) {
    if (seen[p] || data[p * 4 + 3] < 70) continue;
    const pts = [p];
    seen[p] = 1;
    let l = info.width,
      t = info.height,
      r = 0,
      b = 0;
    for (let i = 0; i < pts.length; i++) {
      const q = pts[i],
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
        if (n >= 0 && !seen[n] && data[n * 4 + 3] >= 70) {
          seen[n] = 1;
          pts.push(n);
        }
    }
    if (pts.length > 1000) parts.push({ pts, l, t, r, b });
  }
  assert.equal(
    parts.length,
    cols * 5,
    `${name}: expected full independent silhouettes`,
  );
  parts.sort((a, b) => a.b - b.b);
  const poses = [];
  for (let row = 0; row < 5; row++)
    poses.push(
      ...parts.slice(row * cols, (row + 1) * cols).sort((a, b) => a.l - b.l),
    );
  // One scale per source sheet, not per pose. Collapsing bodies remain smaller.
  const standing = poses.filter((_, i) => name === 'walk' || i % cols < 3);
  const height = Math.max(...standing.map((p) => p.b - p.t + 1));
  return { name, data, info, poses, cols, scale: 236 / height };
}
const walk = await source('walk', 4),
  actions = await source('actions', 6),
  frames = [],
  mapping = [];
for (const src of [walk, actions])
  src.scale = 236 / (src.poses[0].b - src.poses[0].t + 1);
for (let row = 0; row < 5; row++)
  for (let col = 0; col < 10; col++) {
    const src = col < 4 ? walk : actions,
      p = src.poses[row * src.cols + (col < 4 ? col : col - 4)];
    const w = p.r - p.l + 1,
      h = p.b - p.t + 1,
      raw = Buffer.alloc(w * h * 4);
    // Keep the silhouette's own connected pixels; do not bring adjacent cells in.
    for (const q of p.pts) {
      const i =
        ((Math.floor(q / src.info.width) - p.t) * w +
          (q % src.info.width) -
          p.l) *
        4;
      src.data.copy(raw, i, q * 4, q * 4 + 4);
    }
    let footL = w,
      footR = 0;
    for (let y = Math.floor(h * 0.9); y < h; y++)
      for (let x = 0; x < w; x++)
        if (raw[(y * w + x) * 4 + 3] > 100) {
          footL = Math.min(footL, x);
          footR = Math.max(footR, x);
        }
    const dw = Math.round(w * src.scale),
      dh = Math.round(h * src.scale);
    // A fallen pose uses the cell centre; standing poses share their boot anchor.
    const centre = col >= 7 ? w / 2 : (footL + footR + 1) / 2;
    const dx = Math.round(160 - centre * src.scale),
      dy = 296 - dh;
    assert.ok(
      dx >= 6 && dx + dw <= 314 && dy >= 6 && dy + dh <= 314,
      `${row}/${col} safe margins`,
    );
    const scaled = await sharp(raw, {
        raw: { width: w, height: h, channels: 4 },
      })
        .resize(dw, dh)
        .raw()
        .toBuffer(),
      tile = Buffer.alloc(C * C * 4);
    for (let y = 0; y < dh; y++)
      scaled.copy(tile, ((dy + y) * C + dx) * 4, y * dw * 4, (y + 1) * dw * 4);
    frames.push(tile);
    mapping.push({
      frame: row * 10 + col,
      source: src.name,
      sourceBounds: [p.l, p.t, p.r + 1, p.b + 1],
      pixelScale: src.scale,
      placement: [dx, dy, dw, dh],
    });
  }
// Fix the complete lower half including dangling hands. Only head/upper crate
// flinch varies; this avoids cuts across hands or doubled boots at the seam.
for (let row = 0; row < 5; row++)
  for (const col of [5, 6]) {
    const base = frames[row * 10 + 4],
      target = frames[row * 10 + col];
    base.copy(target, 194 * C * 4, 194 * C * 4);
  }
const pngs = await Promise.all(
  frames.map((raw) =>
    sharp(raw, { raw: { width: C, height: C, channels: 4 } })
      .png()
      .toBuffer(),
  ),
);
await sharp({
  create: {
    width: C * 10,
    height: C * 5,
    channels: 4,
    background: '#00000000',
  },
})
  .composite(
    pngs.map((input, i) => ({
      input,
      left: (i % 10) * C,
      top: Math.floor(i / 10) * C,
    })),
  )
  .png()
  .toFile(`${output}/carrier.png`);
await writeFile(`${output}/portrait.png`, pngs[4]);
const part = {
  atlas: '../ammo-carrier-v1/carrier.png',
  visibleHeight: 236,
  columns: 10,
  rows: 5,
  authoredHit: true,
  directions: {},
};
for (let row = 0; row < 5; row++) {
  const n = row * 10;
  part.directions[directions[row]] = {
    walk: {
      frames: [n, n + 1, n + 2, n + 3],
      durations: [0.23, 0.15, 0.25, 0.17],
      loop: true,
    },
    idle: { frames: [n + 4], durations: [1], loop: true },
    hit: {
      frames: [n + 4, n + 5, n + 6],
      durations: [0.02, 0.065, 0.045],
      loop: false,
    },
    death: {
      frames: [n + 7, n + 8, n + 9],
      durations: [0.16, 0.2, 0.75],
      loop: false,
    },
  };
}
await writeFile(
  `${root}/mapping.json`,
  JSON.stringify(
    {
      sourceSizes: {
        walk: [walk.info.width, walk.info.height],
        actions: [actions.info.width, actions.info.height],
      },
      scales: { walk: walk.scale, actions: actions.scale },
      cell: C,
      anchor: { foot: [160, 296] },
      fixedLower: { sourceColumn: 4, targetColumns: [5, 6], startY: 194 },
      mapping,
    },
    null,
    2,
  ),
);
await writeFile(`${root}/archetype.json`, JSON.stringify(part, null, 2));
const manifestFile = 'public/assets/hunt/zombies-v3/manifest.json';
const manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
manifest.archetypes.ammoCarrier = part;
manifest.kinds['12'] = {
  archetype: 'ammoCarrier',
  filter: '',
  sharedAnimation: false,
  playbackRate: 1,
};
await writeFile(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
const labels = [
  '迈步 L',
  '拖脚',
  '迈步 R',
  '拖脚',
  '准备',
  '受击',
  '恢复',
  '开箱',
  '倒下',
  '结束',
];
const bg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="3200" height="1600"><rect width="100%" height="100%" fill="#d8d5c5"/><g font-family="Microsoft YaHei" font-size="20" fill="#34534b">${frames.map((_, i) => `<path d="M${(i % 10) * C} ${Math.floor(i / 10) * C + 296}h320" stroke="#4c9b91"/><text x="${(i % 10) * C + 8}" y="${Math.floor(i / 10) * C + 25}">${directions[Math.floor(i / 10)]} · ${labels[i % 10]}</text>`).join('')}</g></svg>`,
);
const contact = await sharp(bg)
  .composite([{ input: `${output}/carrier.png` }])
  .png()
  .toBuffer();
await sharp(contact).resize(1600, 800).png().toFile(`${root}/contact.png`);
const overlay = [];
for (let row = 0; row < 5; row++)
  for (const col of [4, 5]) {
    const raw = Buffer.from(frames[row * 10 + col]);
    for (let i = 3; i < raw.length; i += 4) raw[i] = Math.round(raw[i] * 0.5);
    overlay.push({
      input: await sharp(raw, { raw: { width: C, height: C, channels: 4 } })
        .png()
        .toBuffer(),
      left: row * C,
      top: 0,
    });
  }
await sharp({
  create: { width: 1600, height: 320, channels: 4, background: '#c3cbbb' },
})
  .composite(overlay)
  .png()
  .toFile(`${root}/hit-overlay.png`);
// Export a review loop of the exact frames at enlarged and game display sizes.
const gifFrames = [];
const fw = 1000,
  fh = 440;
for (let tick = 0; tick < 40; tick++) {
  const t = tick * 0.08,
    overlays = [];
  for (let row = 0; row < 5; row++) {
    let col =
      t < 1.6
        ? [0, 0, 1, 2, 2, 3, 3, 0, 1, 2][tick % 10]
        : t < 1.84
          ? [4, 5, 6][Math.min(2, Math.floor((t - 1.6) / 0.08))]
          : t < 2.08
            ? 0
            : t < 2.24
              ? 7
              : t < 2.48
                ? 8
                : 9;
    const buf = pngs[row * 10 + col];
    overlays.push({
      input: await sharp(buf).resize(192, 192).png().toBuffer(),
      left: row * 200 + 4,
      top: 24,
    });
    overlays.push({
      input: await sharp(buf).resize(130, 130).png().toBuffer(),
      left: row * 200 + 35,
      top: 254,
    });
  }
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="440"><rect width="100%" height="100%" fill="#ddd5bd"/><g fill="#30534b" font-size="18" font-family="Microsoft YaHei">${directions.map((d, i) => `<text x="${i * 200 + 16}" y="25">${d}</text>`).join('')}<text x="20" y="243">上：放大 · 下：猎场尺寸 · 拖步 → 受击 → 恢复 → 击破</text></g></svg>`,
  );
  gifFrames.push(
    await sharp(svg).composite(overlays).ensureAlpha().raw().toBuffer(),
  );
}
await sharp(Buffer.concat(gifFrames), {
  raw: {
    width: fw,
    height: fh * gifFrames.length,
    channels: 4,
    pageHeight: fh,
  },
})
  .gif({ delay: gifFrames.map(() => 80), loop: 0 })
  .toFile(`${root}/animation-review.gif`);
console.log(
  'Built 50 frames, five authored directions, fixed lower hit pixels, portrait and review artifacts.',
);

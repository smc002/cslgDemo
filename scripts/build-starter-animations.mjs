import sharp from 'sharp';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

// Alpha components, not equal-grid crops: generated limbs and drones cross cell edges.
for (const hero of ['shield', 'medic', 'drone']) {
  const { data, info } = await sharp(
    `public/assets/animations/starter-source/${hero}-sheet.png`,
  )
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const labels = new Int32Array(info.width * info.height).fill(-1),
    components = [];
  for (let start = 0; start < labels.length; start++) {
    if (labels[start] >= 0 || !data[start * 4 + 3]) continue;
    const c = {
      id: components.length,
      pixels: [start],
      left: info.width,
      top: info.height,
      right: 0,
      bottom: 0,
    };
    labels[start] = c.id;
    for (let n = 0; n < c.pixels.length; n++) {
      const p = c.pixels[n],
        x = p % info.width,
        y = Math.floor(p / info.width);
      c.left = Math.min(c.left, x);
      c.right = Math.max(c.right, x);
      c.top = Math.min(c.top, y);
      c.bottom = Math.max(c.bottom, y);
      for (const next of [
        x > 0 ? p - 1 : -1,
        x < info.width - 1 ? p + 1 : -1,
        y > 0 ? p - info.width : -1,
        y < info.height - 1 ? p + info.width : -1,
      ]) {
        if (next >= 0 && labels[next] < 0 && data[next * 4 + 3]) {
          labels[next] = c.id;
          c.pixels.push(next);
        }
      }
    }
    components.push(c);
  }
  // The medic's frame 5 boot and frame 9 hair have a one-pixel alpha bridge.
  // Split at their row boundary, preserving pixels on both sides.
  if (hero === 'medic') {
    const joined = components.find(
      (c) => c.bottom - c.top > 400 && c.left > 280 && c.right < 565,
    );
    if (joined) {
      components.splice(components.indexOf(joined), 1);
      for (const pixels of [
        joined.pixels.filter((p) => Math.floor(p / info.width) < 558),
        joined.pixels.filter((p) => Math.floor(p / info.width) >= 558),
      ]) {
        const c = {
          pixels,
          left: info.width,
          top: info.height,
          right: 0,
          bottom: 0,
        };
        for (const p of pixels) {
          const x = p % info.width,
            y = Math.floor(p / info.width);
          c.left = Math.min(c.left, x);
          c.right = Math.max(c.right, x);
          c.top = Math.min(c.top, y);
          c.bottom = Math.max(c.bottom, y);
        }
        components.push(c);
      }
    }
  }
  if (hero === 'drone') {
    for (const joined of [...components].filter(
      (c) => c.bottom - c.top > 400,
    )) {
      components.splice(components.indexOf(joined), 1);
      const rows = [0, 285, 562, 835, 1111, info.height];
      for (let row = 0; row < 5; row++) {
        const pixels = joined.pixels.filter(
          (p) =>
            Math.floor(p / info.width) >= rows[row] &&
            Math.floor(p / info.width) < rows[row + 1],
        );
        if (!pixels.length) continue;
        const c = {
          pixels,
          left: info.width,
          top: info.height,
          right: 0,
          bottom: 0,
        };
        for (const p of pixels) {
          const x = p % info.width,
            y = Math.floor(p / info.width);
          c.left = Math.min(c.left, x);
          c.right = Math.max(c.right, x);
          c.top = Math.min(c.top, y);
          c.bottom = Math.max(c.bottom, y);
        }
        components.push(c);
      }
    }
  }
  const bodies = components.filter((c) => c.pixels.length > 5000);
  if (bodies.length !== 20)
    console.log(
      hero,
      bodies.map((c) => ({
        n: c.pixels.length,
        b: [c.left, c.top, c.right, c.bottom],
      })),
    );
  assert.equal(
    bodies.length,
    20,
    `${hero}: review distinct silhouettes before slicing`,
  );
  for (const c of bodies) {
    c.frame =
      Math.floor((c.top + c.bottom) / 2 / (info.height / 5)) * 4 +
      Math.min(3, Math.floor((c.left + c.right) / 2 / (info.width / 4)));
    c.all = [];
  }
  assert.equal(new Set(bodies.map((c) => c.frame)).size, 20);
  for (const c of components) {
    const cx = (c.left + c.right) / 2,
      cy = (c.top + c.bottom) / 2;
    const distance = (b) =>
      Math.hypot(
        Math.max(b.left - cx, 0, cx - b.right),
        Math.max(b.top - cy, 0, cy - b.bottom),
      );
    const b = bodies.includes(c)
      ? c
      : [...bodies].sort((a, b) => distance(a) - distance(b))[0];
    b.all.push(...c.pixels);
  }
  bodies.sort((a, b) => a.frame - b.frame);
  const poses = [];
  for (const b of bodies) {
    let left = info.width,
      top = info.height,
      right = 0,
      bottom = 0;
    for (const p of b.all) {
      if (data[p * 4 + 3] < 32) continue;
      const x = p % info.width,
        y = Math.floor(p / info.width);
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
    const w = right - left + 1,
      h = bottom - top + 1,
      buffer = Buffer.alloc(w * h * 4);
    for (const p of b.all) {
      const x = p % info.width,
        y = Math.floor(p / info.width);
      if (x < left || x > right || y < top || y > bottom) continue;
      data.copy(buffer, ((y - top) * w + x - left) * 4, p * 4, p * 4 + 4);
    }
    let sum = 0,
      count = 0;
    // Use the head/cap centroid to remove generated lateral registration drift in walking.
    for (let y = 0; y < h * 0.38; y++)
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4,
          [r, g, bl, a] = buffer.subarray(i, i + 4);
        const match =
          hero === 'shield'
            ? r > 110 && r > g * 1.08 && g > bl * 1.15
            : hero === 'medic'
              ? r > 100 && r > g * 1.6 && r > bl * 1.3
              : r > 130 && r > g * 1.2 && g > bl * 1.4;
        if (a > 160 && match) {
          sum += x;
          count++;
        }
      }
    const head = count > 20 ? sum / count : w * 0.5;
    poses.push({
      buffer,
      w,
      h,
      head,
      bounds: [left, top, right + 1, bottom + 1],
    });
  }
  const standing = [...poses.slice(0, 8).map((p) => p.h)].sort(
    (a, b) => a - b,
  )[4];
  const scale = 290 / standing,
    cell = 384,
    anchorX = 192,
    anchorY = 364;
  const normalized = [];
  for (let i = 0; i < 20; i++) {
    const p = poses[i],
      walk = i < 8;
    const s = walk ? 290 / p.h : scale;
    const width = Math.round(p.w * s),
      height = Math.round(p.h * s);
    // Walking uses fixed head X + sole Y; attacks/death use a stable body center and global scale.
    let x = Math.round(anchorX - (i < 16 ? p.head : p.w * 0.53) * s),
      y = anchorY - height;
    x = Math.max(4, Math.min(cell - width - 4, x));
    assert.ok(
      width <= cell - 8 && height <= cell - 8,
      `${hero} frame ${i} requires larger cell`,
    );
    const tile = await sharp({
      create: {
        width: cell,
        height: cell,
        channels: 4,
        background: '#00000000',
      },
    })
      .composite([
        {
          input: await sharp(p.buffer, {
            raw: { width: p.w, height: p.h, channels: 4 },
          })
            .resize(width, height)
            .png()
            .toBuffer(),
          left: x,
          top: y,
        },
      ])
      .png()
      .toBuffer();
    normalized.push({ tile, width, height, x, y });
  }
  const clips = [];
  for (const [name, indices] of [
    ['idle', [0]],
    ['walk', [0, 1, 2, 3, 4, 5, 6, 7]],
    ['attack', [8, 9, 10, 11]],
    ['skill', [12, 13, 14, 15]],
    ['death', [16, 17, 18, 19]],
  ]) {
    const cols = Math.min(4, indices.length),
      rows = Math.ceil(indices.length / cols),
      out = `public/assets/animations/${hero}`;
    await mkdir(out, { recursive: true });
    await sharp({
      create: {
        width: cols * cell,
        height: rows * cell,
        channels: 4,
        background: '#00000000',
      },
    })
      .composite(
        indices.map((i, n) => ({
          input: normalized[i].tile,
          left: (n % cols) * cell,
          top: Math.floor(n / cols) * cell,
        })),
      )
      .png()
      .toFile(`${out}/${name}.png`);
    clips.push({
      name,
      pixelsPerUnit: 290 / 3.2,
      sheetWidth: cols * cell,
      sheetHeight: rows * cell,
      impactFrame: 2,
      frames: indices.map((i, n) => ({
        x: (n % cols) * cell,
        y: Math.floor(n / cols) * cell,
        w: cell,
        h: cell,
        anchorX,
        anchorY,
        duration:
          name === 'walk'
            ? 0.11
            : name === 'death'
              ? [0.2, 0.2, 0.25, 0.7][n]
              : 0.16,
        visibleHeight: normalized[i].height,
        muzzleX:
          hero === 'medic'
            ? normalized[i].x + normalized[i].width * 0.88
            : anchorX,
        muzzleY: normalized[i].y + normalized[i].height * 0.32,
      })),
    });
  }
  const result = { clips };
  await writeFile(
    `shared/animation-data/${hero}.json`,
    JSON.stringify(result, null, 2),
  );
  await writeFile(
    `public/assets/animations/${hero}/clips.json`,
    JSON.stringify(result),
  );
  await writeFile(
    `public/assets/animations/${hero}/slicing.json`,
    JSON.stringify(
      {
        sourceSize: [info.width, info.height],
        sourceAlpha: components.reduce((s, c) => s + c.pixels.length, 0),
        assignedAlpha: bodies.reduce((s, b) => s + b.all.length, 0),
        registration:
          'Walk: head X / ground sole Y. Other actions: global scale and stable ground pivot.',
        frames: poses.map((p, i) => ({
          bounds: p.bounds,
          head: p.head,
          ...Object.fromEntries(
            Object.entries(normalized[i]).filter(([k]) => k !== 'tile'),
          ),
        })),
      },
      null,
      2,
    ),
  );
  console.log(
    'Generated',
    hero,
    '20 poses / idle + 4 clips; all source alpha pixels assigned',
  );
}

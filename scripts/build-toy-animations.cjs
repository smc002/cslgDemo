// Packs ImageGen-authored frames without synthesizing or deforming any pose.
/* oxlint-disable typescript/no-require-imports -- CommonJS asset build script. */
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('C:/Users/hy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const extractPoses = require('./toy-animation-components.cjs');
const root = path.resolve('public/assets/toy-v1/animations');
(async () => {
  const metadata = {};
  for (const file of fs
    .readdirSync(root)
    .filter((f) => f.endsWith('-source.png'))) {
    const id = file.replace('-source.png', '');
    const input = path.join(root, file);
    const { data, info } = await sharp(input)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const frames = [];
    const isolated = ['zombie-giant', 'hero-tank'].includes(id)
      ? extractPoses(data, info)
      : null;
    for (let i = 0; i < 8; i++) {
      const pixels = isolated?.[i] ?? data;
      const x = isolated ? 0 : Math.round(((i % 4) * info.width) / 4),
        y = isolated ? 0 : Math.round((Math.floor(i / 4) * info.height) / 2);
      const w = isolated
          ? info.width
          : Math.round((((i % 4) + 1) * info.width) / 4) - x,
        h = isolated
          ? info.height
          : Math.round(((Math.floor(i / 4) + 1) * info.height) / 2) - y;
      let l = w,
        t = h,
        r = 0,
        b = 0;
      for (let yy = 0; yy < h; yy++)
        for (let xx = 0; xx < w; xx++)
          if (pixels[((y + yy) * info.width + x + xx) * 4 + 3] > 100) {
            l = Math.min(l, xx);
            r = Math.max(r, xx);
            t = Math.min(t, yy);
            b = Math.max(b, yy);
          }
      if (r - l < 40 || b - t < 80)
        throw Error('Missing frame ' + id + ' ' + i);
      // Initial packing origin only. Runtime walk origins are registered to the torso below.
      let mass = 0,
        sum = 0;
      for (let yy = Math.max(t, b - 12); yy <= b; yy++)
        for (
          let xx = isolated ? l : Math.floor(w * 0.18);
          xx < (isolated ? r + 1 : w * 0.82);
          xx++
        ) {
          const a = pixels[((y + yy) * info.width + x + xx) * 4 + 3];
          if (a > 180) {
            sum += xx * a;
            mass += a;
          }
        }
      const footX = mass ? sum / mass : w / 2;
      frames.push({
        x,
        y,
        w,
        h,
        l,
        t,
        r,
        b,
        footX,
        footY: b,
        bodyHeight: b - t,
      });
    }
    const heights = frames
      .slice(0, 4)
      .map((f) => f.bodyHeight)
      .sort((a, b) => a - b);
    const bodyHeight = (heights[1] + heights[2]) / 2;
    const scale = Math.min(
      210 / bodyHeight,
      ...frames.map((f) =>
        Math.min(
          240 / (f.b - f.t + 1),
          118 / Math.max(f.footX - f.l, f.r - f.footX),
        ),
      ),
    );
    const composites = [];
    for (let i = 0; i < 8; i++) {
      const f = frames[i],
        w = Math.max(1, Math.round((f.r - f.l + 1) * scale)),
        h = Math.max(1, Math.round((f.b - f.t + 1) * scale));
      const source = isolated
        ? sharp(isolated[i], { raw: info })
        : sharp(input);
      const buffer = await source
        .extract({
          left: f.x + f.l,
          top: f.y + f.t,
          width: f.r - f.l + 1,
          height: f.b - f.t + 1,
        })
        .resize(w, h)
        .png()
        .toBuffer();
      composites.push({
        input: buffer,
        left: (i % 4) * 256 + 128 - Math.round((f.footX - f.l) * scale),
        top: Math.floor(i / 4) * 256 + 248 - h,
      });
    }
    await sharp({
      create: {
        width: 1024,
        height: 512,
        channels: 4,
        background: '#00000000',
      },
    })
      .composite(composites)
      .png()
      .toFile(path.join(root, id + '.png'));
    metadata[id] = {
      sheet: id + '.png',
      cell: 256,
      anchorX: 128,
      anchorY: 248,
      bodyHeight: bodyHeight * scale,
      halfWidth:
        Math.max(...frames.map((f) => Math.max(f.footX - f.l, f.r - f.footX))) *
        scale,
      facing: id.startsWith('hero-') ? 'back' : 'front',
      walk: [0, 1, 2, 3],
      attack: [4, 5, 6, 7],
      idle: 7,
      sourceWidth: info.width,
      sourceHeight: info.height,
    };
    console.log(id + ' 8 authored frames');
  }
  fs.writeFileSync(
    'shared/toy-animation-data.json',
    JSON.stringify(metadata, null, 2) + '\n',
  );
  require('node:child_process').execFileSync(
    process.execPath,
    ['scripts/align-toy-animation-bodies.cjs'],
    { stdio: 'inherit' },
  );
  const manifestPath = 'public/assets/toy-v1/manifest.json';
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  for (const id of Object.keys(metadata)) {
    const asset = manifest.assets.find(
      (a) => a.file === 'animations/' + id + '.png',
    );
    if (!asset) throw Error('Missing manifest entry: ' + id);
    const bytes = fs.readFileSync(path.join(root, id + '.png'));
    asset.bytes = bytes.length;
    asset.sha256 = require('node:crypto')
      .createHash('sha256')
      .update(bytes)
      .digest('hex');
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

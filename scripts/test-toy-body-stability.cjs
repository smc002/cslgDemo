/* oxlint-disable typescript/no-require-imports -- CommonJS browser regression script. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { build } = require('esbuild');
const {
  chromium,
} = require('C:/Users/hy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const sharp = require('C:/Users/hy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const metadata = require('../shared/toy-animation-data.json');
const out = 'outputs/toy-animation-v2';
const regions = {
  'zombie-giant': [0.48, 0.08, 0.74, 0.34],
  'zombie-courier': [0.3, 0.23, 0.56, 0.43],
  'zombie-armored': [0.3, 0.28, 0.73, 0.55],
};
// Independently locate the stationary head in actual ToyRenderer canvas pixels.
function displacement(reference, target, box) {
  let best = { x: 0, y: 0, error: Infinity };
  const gray = (buffer, p) =>
    buffer[p] * 0.299 + buffer[p + 1] * 0.587 + buffer[p + 2] * 0.114;
  for (let dy = -8; dy <= 8; dy++)
    for (let dx = -60; dx <= 60; dx++) {
      let error = 0,
        count = 0;
      for (let y = Math.ceil(box[1]); y < box[3]; y += 2)
        for (let x = Math.ceil(box[0]); x < box[2]; x += 2) {
          const p = (y * 512 + x) * 4,
            q = ((y + dy) * 512 + x + dx) * 4;
          if (reference[p + 3] < 240) continue;
          error += Math.min(
            10000,
            (gray(reference, p) - gray(target, q)) ** 2 +
              (255 - target[q + 3]) ** 2,
          );
          count++;
        }
      assert.ok(count > 30, 'landmark patch must contain visible pixels');
      error /= count;
      if (error < best.error) best = { x: dx, y: dy, error };
    }
  return best;
}
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const bundle = await build({
    entryPoints: ['shared/toy-art.ts'],
    bundle: true,
    format: 'iife',
    globalName: 'ToyQA',
    write: false,
  });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 1080, height: 1100 },
    });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('http://localhost:3010/art-review/stability');
    await page.getByRole('button', { name: '暂停', exact: true }).click();
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    const report = {};
    for (const [id, region] of Object.entries(regions)) {
      const encoded = await page.evaluate(async (id) => {
        const renderer = new ToyQA.ToyRenderer();
        await renderer.load([id]);
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');
        return [0, 1, 2, 3, 7].map((frame) => {
          ctx.clearRect(0, 0, 512, 400);
          renderer.draw(
            ctx,
            id,
            256,
            340,
            ToyQA.TOY_ANIMATIONS[id].bodyHeight,
            frame === 7 ? {} : { moving: true, time: frame / 8 },
          );
          return canvas.toDataURL().split(',')[1];
        });
      }, id);
      const rendered = await Promise.all(
        encoded.map((png) =>
          sharp(Buffer.from(png, 'base64')).raw().toBuffer(),
        ),
      );
      assert.equal(
        new Set(encoded.slice(0, 4)).size,
        4,
        'walking must retain four different authored poses',
      );
      const raw = await sharp(
        'public/assets/toy-v1/animations/' + metadata[id].sheet,
      )
        .raw()
        .toBuffer();
      let left = 256,
        right = 0,
        top = 256,
        bottom = 0;
      for (let y = 0; y < 256; y++)
        for (let x = 0; x < 256; x++)
          if (raw[(y * 1024 + x) * 4 + 3] > 200) {
            left = Math.min(left, x);
            right = Math.max(right, x);
            top = Math.min(top, y);
            bottom = Math.max(bottom, y);
          }
      const [ax, ay] = metadata[id].frameAnchors[0];
      const box = [
        left + (right - left) * region[0] + 256 - ax,
        top + (bottom - top) * region[1] + 340 - ay,
        left + (right - left) * region[2] + 256 - ax,
        top + (bottom - top) * region[3] + 340 - ay,
      ];
      report[id] = rendered
        .slice(1)
        .map((target) => displacement(rendered[0], target, box));
      for (const delta of report[id])
        assert.ok(
          Math.abs(delta.x) <= 2 && Math.abs(delta.y) <= 2,
          id + ' visible body drift ' + JSON.stringify(delta),
        );
    }
    for (const frame of [1, 2, 3, 4]) {
      await page
        .getByRole('button', { name: `第 ${frame} 帧`, exact: true })
        .click();
      await page.waitForTimeout(150);
      await page.screenshot({
        path: `${out}/stability-${frame}.png`,
        fullPage: true,
      });
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      out + '/stability-test.json',
      JSON.stringify(report, null, 2),
    );
    console.log(
      'PASS actual ToyRenderer pixels: giant/courier/armored walk and idle body drift <= 2 px; four distinct walking poses; browser error-free',
    );
    console.log(JSON.stringify(report));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

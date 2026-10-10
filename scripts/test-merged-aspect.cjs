/* oxlint-disable typescript/no-require-imports -- Browser rendering regression. */
const {
  chromium,
} = require('C:/Users/hy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { build } = require('esbuild');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const base = process.argv[2] || 'http://localhost:3010';
(async () => {
  await build({
    entryPoints: ['lib/campaign.ts'],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile: '.test-cache/aspect-campaign.cjs',
  });
  const C = require('../.test-cache/aspect-campaign.cjs');
  const d = C.freshCampaign();
  d.bestStage = 6;
  d.tutorial = 20;
  d.prologue.enabled = false;
  d.prologue.rewards.push('recruit');
  for (const id of Object.keys(d.recruit.owned)) d.recruit.owned[id] = 1;
  d.lineup = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const browser = await chromium.launch({ headless: true });
  const results = [],
    errors = [];
  fs.mkdirSync('outputs/merged-aspect', { recursive: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 481, height: 820 },
      deviceScaleFactor: 1,
    });
    await context.addInitScript((s) => {
      localStorage.setItem('mori.demo.campaign.v2', JSON.stringify(s));
      window.actorScales = [];
      // oxlint-disable-next-line typescript/unbound-method -- Rebound with original.apply(this, args) below.
      const original = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage = function (...args) {
        if (args[0]?.src?.includes('/toy-v1/animations/')) {
          const m = this.getTransform(),
            rect = this.canvas.getBoundingClientRect();
          window.actorScales.push({
            id: args[0].src.split('/').pop(),
            sx: (Math.hypot(m.a, m.b) * rect.width) / this.canvas.width,
            sy: (Math.hypot(m.c, m.d) * rect.height) / this.canvas.height,
            cellX: args[7],
            cellY: args[8],
          });
          if (window.actorScales.length > 300) window.actorScales.shift();
        }
        return original.apply(this, args);
      };
    }, d);
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(base + '/#merged');
    await page.getByRole('button', { name: '开始搜刮', exact: true }).click();
    await page.waitForTimeout(1600);
    await page.evaluate(() => window.moriMerged.pause(true));
    for (const [width, height] of [
      [481, 820],
      [438, 900],
      [390, 844],
      [375, 667],
      [430, 1100],
      [900, 550],
    ]) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(250);
      await page.evaluate(() => {
        window.actorScales = [];
      });
      await page.waitForTimeout(150);
      const draws = await page.evaluate(() => window.actorScales);
      assert.ok(
        draws.some((x) => x.id.startsWith('hero-')) &&
          draws.some((x) => x.id.startsWith('zombie-')),
        'both teams actually rendered',
      );
      const deviation = Math.max(
        ...draws.map((x) => Math.abs((x.sx * x.cellX) / (x.sy * x.cellY) - 1)),
      );
      assert.ok(
        deviation < 0.005,
        `${width}x${height}: sprite scale mismatch ${deviation}`,
      );
      results.push({ width, height, deviation });
      await page.screenshot({
        path: `outputs/merged-aspect/battle-${width}x${height}.png`,
      });
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      'outputs/merged-aspect/qa.json',
      JSON.stringify({ base, results, errors }, null, 2),
    );
    console.log(JSON.stringify({ base, results, errors }));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

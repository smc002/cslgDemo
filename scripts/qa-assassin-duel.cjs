/* oxlint-disable typescript/no-require-imports -- CommonJS browser QA script. */
const { build } = require('esbuild');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const {
  chromium,
} = require('C:/Users/hy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
  const bundle = await build({
    stdin: {
      contents:
        "export {MergedBattle,bossSlamArea} from './merged/simulation';export {MergedView} from './merged/view';",
      resolveDir: process.cwd(),
    },
    bundle: true,
    format: 'iife',
    globalName: 'DuelQA',
    write: false,
  });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 430, height: 800 },
      deviceScaleFactor: 1,
    });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.route('**/__duel_qa__', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;background:#14382e"></body></html>',
      }),
    );
    await page.goto('http://localhost:3010/__duel_qa__');
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    await page.evaluate(async () => {
      document.body.innerHTML =
        '<main style="width:390px;margin:auto"><canvas width="390" height="752" style="width:390px;height:752px"></canvas></main>';
      const g = new DuelQA.MergedBattle();
      g.start();
      g.paused = true;
      const boss = g.enemies[0];
      g.enemies = [boss];
      g.heroes = [];
      Object.assign(boss, {
        boss: true,
        x: 195,
        y: 260,
        bossSlamX: 195,
        bossSlamY: 333.5,
        bossCharge: undefined,
        bossRecovery: 0,
      });
      const view = new DuelQA.MergedView(
        document.querySelector('canvas'),
        g,
        () => {},
      );
      await view.init();
      view.draw();
      window.duelReview = { g, view, boss };
    });
    const result = await page.evaluate(() => {
      const { view, boss } = window.duelReview,
        c = document.querySelector('canvas').getContext('2d');
      const sample = (x, y) => Array.from(c.getImageData(x, y, 1, 1).data);
      // Includes the battle display offset of 40 pixels.
      const baseCorner = sample(265, 443),
        baseInside = sample(195, 438);
      boss.bossCharge = 0.65;
      view.draw();
      return {
        baseCorner,
        corner: sample(265, 443),
        baseInside,
        inside: sample(195, 438),
        area: DuelQA.bossSlamArea(boss),
        width: c.canvas.width,
        height: c.canvas.height,
      };
    });
    fs.mkdirSync('outputs/assassin-duel', { recursive: true });
    await page.screenshot({ path: 'outputs/assassin-duel/slam-charge.png' });
    console.log(result);
    assert.deepEqual(
      result.corner,
      result.baseCorner,
      'circle bounding-box corner stays unpainted',
    );
    assert.notDeepEqual(
      result.inside,
      result.baseInside,
      'inside circle has warning colour',
    );
    await page.evaluate(() => {
      const { view, boss } = window.duelReview;
      boss.bossCharge = undefined;
      boss.bossRecovery = 0.5;
      view.draw();
    });
    await page.screenshot({ path: 'outputs/assassin-duel/slam-impact.png' });
    await page.evaluate(() => {
      const { view, g } = window.duelReview;
      g.reset();
      g.start();
      g.heroes.forEach((h) => (h.cd = 999));
      g.enemies.forEach((z) => {
        z.hp = z.maxHp = 10000;
      });
      g.advance(1 / 60);
      g.advance(0.1);
      g.paused = true;
      view.draw();
    });
    await page.screenshot({ path: 'outputs/assassin-duel/duel.png' });
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      'outputs/assassin-duel/qa.json',
      JSON.stringify({ errors, ...result }, null, 2),
    );
    console.log(
      'PASS actual MergedView warning pixels: circle interior coloured, square corner untouched; charge/impact/duel screenshots; no browser errors',
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

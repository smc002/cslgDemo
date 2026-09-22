// Set PLAYWRIGHT_MODULE to a Playwright module path when using the bundled runtime.
import assert from 'node:assert/strict';
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE ?? 'playwright'
);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1220, height: 1080 },
    deviceScaleFactor: 1,
  });
  await page.goto('http://localhost:3010/assets/hunt/art.json');
  const result = await page.evaluate(async () => {
    const { HuntView } = await import('/hunt/view.ts?crop-audit=1');
    const { COURIER_RULES } = await import('/lib/hunt-save.ts');
    const manifest = await fetch('/assets/hunt/art.json').then((r) => r.json());
    const load = (url) =>
      new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = url;
      });
    const [zombies, weapons, courier] = await Promise.all(
      [manifest.zombies, manifest.weapons, manifest.courier].map(load),
    );
    document.body.innerHTML =
      '<canvas id="crop-audit" width="1200" height="1020"></canvas>';
    document.body.style.cssText = 'margin:0;background:#eee1bc';
    const ctx = document.querySelector('canvas').getContext('2d');
    ctx.fillStyle = '#eee1bc';
    ctx.fillRect(0, 0, 1200, 1020);
    const view = Object.create(HuntView.prototype);
    view.ctx = ctx;
    view.art = {
      zombies,
      weapons,
      courier,
      atlas: true,
      rows: 3,
      zombiePadding: manifest.zombiePadding,
    };
    const calls = [],
      drawImage = ctx.drawImage.bind(ctx);
    ctx.drawImage = (...args) => {
      calls.push(args.slice(1));
      drawImage(...args);
    };
    for (const [i, kind] of [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11].entries()) {
      const x = (i % 4) * 300,
        y = Math.floor(i / 4) * 250;
      ctx.save();
      ctx.translate(x + 150, y + 140);
      view.zombieSprite(kind, 160);
      ctx.restore();
      ctx.fillStyle = '#263342';
      ctx.font = '18px sans-serif';
      ctx.fillText(`kind ${kind}`, x + 20, y + 24);
    }
    for (let broken = 0; broken < 4; broken++) {
      view.game = {
        save: {
          courier: {
            active: {
              armorHits: broken * COURIER_RULES.hitsPerPlate,
              bundle: 1,
            },
          },
        },
      };
      view.courier({ x: broken * 300 + 150, y: 895, age: 0, hit: 0 });
      ctx.fillStyle = '#263342';
      ctx.fillText(`courier stage ${broken}`, broken * 300 + 20, 780);
    }
    return { manifest, calls };
  });
  assert.equal(result.manifest.zombiePadding, 47);
  assert.equal(result.calls.length, 15);
  for (let i = 0; i < 9; i++) {
    const [, , sw, sh, dx, dy, dw, dh] = result.calls[i];
    assert.equal(sw, 512);
    assert.equal(sh, 512);
    assert.ok(Math.abs(dw / sw - 160 / 418) < 1e-10);
    assert.ok(Math.abs(dh / sh - 184 / 418) < 1e-10);
    assert.ok(Math.abs(dx + (47 * 160) / 418 + 80) < 1e-10);
    assert.ok(Math.abs(dy + (47 * 184) / 418 + 96) < 1e-10);
  }
  await page
    .locator('#crop-audit')
    .screenshot({
      path: 'docs/zombie-crop-evidence/browser-canvas-all-sprites.png',
    });
  console.log(
    'PASS: browser Canvas renders all 9 atlas zombies, 2 weapon zombies and 4 courier states; atlas scale and pivots preserved.',
  );
} finally {
  await browser.close();
}

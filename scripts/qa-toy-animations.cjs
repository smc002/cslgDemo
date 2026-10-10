const {
  chromium,
} = require('C:/Users/hy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { build } = require('esbuild');
const fs = require('node:fs');
const out = 'E:/cslgDemo/outputs/toy-animation-v2/';
(async () => {
  fs.mkdirSync(out, { recursive: true });
  await build({
    entryPoints: ['lib/campaign.ts'],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile: out + 'campaign.cjs',
  });
  const C = require(out + 'campaign.cjs');
  const b = await chromium.launch({ headless: true });
  const context = await b.newContext({
    viewport: { width: 438, height: 900 },
    deviceScaleFactor: 1,
  });
  const state = C.freshCampaign();
  state.bestStage = 6;
  state.tutorial = 20;
  state.prologue.enabled = false;
  state.prologue.seen = [
    'arrival',
    'ammo',
    'signal',
    'city',
    'factory',
    'three',
    'elite',
    'training',
    'boss',
    'ending',
    'guide-skip-recruit',
  ];
  state.city.unlocked = true;
  state.city.factory.level = 1;
  state.city.workshop.level = 1;
  state.ammo = 1000;
  for (const id of [
    'shield',
    'medic',
    'drone',
    'samurai',
    'guitar',
    'assassin',
    'minigun',
    'priest',
    'sniper',
  ])
    state.recruit.owned[id] = 1;
  state.lineup = [3, 4, 5, 0, 1, 2, 6, 7, 8];
  await context.addInitScript(
    (s) => localStorage.setItem('mori.demo.campaign.v2', JSON.stringify(s)),
    state,
  );
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (r) => {
    if (r.status() >= 400) errors.push(r.status() + ' ' + r.url());
  });
  await page.goto('http://localhost:3010/#merged');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: out + 'deployment.png' });
  for (const [width, height] of [
    [390, 844],
    [375, 667],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(350);
    const overlap = await page.evaluate(() => {
      const top = document
        .querySelector('.merged-prep-controls')
        .getBoundingClientRect().top;
      return [...document.querySelectorAll('.merged-deploy-slots span')].some(
        (s) => s.getBoundingClientRect().bottom > top,
      );
    });
    if (overlap)
      throw Error(
        'Deployment label overlapped controls at ' + width + 'x' + height,
      );
    await page.screenshot({ path: out + 'deployment-' + width + '.png' });
  }
  await page.setViewportSize({ width: 438, height: 900 });
  await page.getByRole('button', { name: '开始搜刮', exact: true }).click();
  await page.waitForTimeout(5000);
  await page.screenshot({ path: out + 'battle.png' });
  await page.goto('http://localhost:3010/art-review');
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: '行走', exact: true }).click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: out + 'walk-gallery.png', fullPage: true });
  await page.getByRole('button', { name: '攻击', exact: true }).click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: out + 'attack-gallery.png', fullPage: true });
  const frames = [];
  for (let i = 0; i < 4; i++) {
    frames.push(
      await page
        .locator('canvas')
        .first()
        .evaluate((c) => c.toDataURL()),
    );
    await page.waitForTimeout(130);
  }
  if (new Set(frames).size < 3) throw Error('Attack frames did not advance');
  await page.goto('http://localhost:3010/#hunt');
  await page.waitForTimeout(1800);
  await page.screenshot({ path: out + 'hunt.png' });
  fs.writeFileSync(
    out + 'qa.json',
    JSON.stringify(
      { errors, distinctAttackFrames: new Set(frames).size },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({ errors, distinctAttackFrames: new Set(frames).size }),
  );
  await b.close();
  if (errors.length) process.exit(1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

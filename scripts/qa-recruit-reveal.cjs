/* oxlint-disable typescript/no-require-imports -- CommonJS browser regression script. */
const { build } = require('esbuild');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const {
  chromium,
} = require('C:/Users/hy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
  fs.mkdirSync('outputs/recruit-reveal', { recursive: true });
  await build({
    entryPoints: ['lib/campaign.ts'],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile: '.test-cache/recruit-campaign.cjs',
  });
  const C = require('../.test-cache/recruit-campaign.cjs');
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
    });
    const d = C.freshCampaign();
    d.bestStage = 6;
    d.tutorial = 20;
    d.prologue.enabled = false;
    d.prologue.rewards.push('recruit');
    d.ticketsEarned = 30;
    d.city.unlocked = true;
    await context.addInitScript((s) => {
      if (!localStorage.getItem('mori.demo.campaign.v2'))
        localStorage.setItem('mori.demo.campaign.v2', JSON.stringify(s));
    }, d);
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('http://localhost:3010/#recruit');
    const draw = page.getByRole('button', {
      name: '招募一次 · 1券',
      exact: true,
    });
    await draw.waitFor({ state: 'visible' });
    // Two clicks in the same event task must still charge once.
    await draw.evaluate((button) => {
      button.click();
      button.click();
    });
    const dialog = page.locator('.summon-dialog');
    await dialog.waitFor({ state: 'visible' });
    await page.waitForTimeout(180);
    await page.screenshot({ path: 'outputs/recruit-reveal/signal.png' });
    await page.waitForFunction(
      () =>
        document.querySelector('.summon-dialog')?.getAttribute('data-phase') ===
        '1',
    );
    await page.screenshot({ path: 'outputs/recruit-reveal/charge.png' });
    await page.waitForFunction(
      () =>
        document.querySelector('.summon-dialog')?.getAttribute('data-phase') ===
        '2',
    );
    await page.waitForTimeout(450);
    await page.screenshot({ path: 'outputs/recruit-reveal/arrival.png' });
    await page
      .getByRole('button', { name: '确定', exact: true })
      .waitFor({ state: 'visible' });
    const saved = () =>
      page.evaluate(() =>
        JSON.parse(localStorage.getItem('mori.demo.campaign.v2')),
      );
    assert.equal((await saved()).recruit.spent, 1, 'one draw charged once');
    const train = page.getByRole('button', { name: '前往培养', exact: true }),
      confirm = page.getByRole('button', { name: '确定', exact: true });
    assert.ok(
      (await train.boundingBox()).x < (await confirm.boundingBox()).x,
      'train left, confirm right',
    );
    await page.waitForFunction(
      () => document.activeElement?.textContent === '确定',
    );
    await page.screenshot({ path: 'outputs/recruit-reveal/single-result.png' });
    await confirm.click();
    await dialog.waitFor({ state: 'detached' });
    assert.equal(
      await page
        .getByRole('tab', { name: '英雄招募', exact: true })
        .getAttribute('aria-selected'),
      'true',
    );
    await page.setViewportSize({ width: 375, height: 667 });
    await page
      .getByRole('button', { name: '招募十次 · 10券', exact: true })
      .click();
    await page.getByRole('button', { name: '跳过动画', exact: false }).click();
    await page.waitForTimeout(2000);
    assert.equal(
      await dialog.getAttribute('data-phase'),
      '3',
      'skip cannot be undone by pending phase timers',
    );
    assert.equal(await page.locator('.summon-card').count(), 10);
    const layout = await dialog.evaluate((el) => ({
      width: el.clientWidth,
      scroll: el.scrollWidth,
      left: el.scrollLeft,
    }));
    assert.ok(
      layout.scroll <= layout.width + 1 && layout.left === 0,
      'no horizontal overflow or clipped cards',
    );
    assert.equal((await saved()).recruit.spent, 11);
    const ten = (await saved()).recruit.last;
    assert.equal(ten.length, 10);
    const bounds = await train.boundingBox();
    assert.ok(
      bounds.y >= 0 && bounds.y + bounds.height <= 667,
      'actions fit short phone viewport',
    );
    await page.screenshot({ path: 'outputs/recruit-reveal/ten-result.png' });
    await train.click();
    await dialog.waitFor({ state: 'detached' });
    assert.equal(
      await page
        .getByRole('tab', { name: '查看培养', exact: true })
        .getAttribute('aria-selected'),
      'true',
    );
    await page.getByRole('tab', { name: '英雄招募', exact: true }).click();
    await draw.click();
    await dialog.waitFor({ state: 'visible' });
    const beforeReload = await saved();
    assert.equal(beforeReload.recruit.spent, 12);
    await page.reload();
    await draw.waitFor({ state: 'visible' });
    assert.deepEqual(
      (await saved()).recruit,
      beforeReload.recruit,
      'reload during reveal preserves exactly the saved draw',
    );
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await draw.click();
    await confirm.waitFor({ state: 'visible', timeout: 1200 });
    assert.equal(await dialog.getAttribute('data-phase'), '3');
    await confirm.click();
    assert.deepEqual(errors, []);
    console.log(
      'PASS reveal stages; single/ten results; one charge on double click; skip; left training/right confirm; 375x667 actions; focus; reload persistence; reduced motion; no browser errors',
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

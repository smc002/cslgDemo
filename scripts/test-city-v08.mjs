import { build } from 'esbuild';
import assert from 'node:assert/strict';
await build({
  entryPoints: ['lib/campaign.ts', 'lib/city.ts', 'city/popover-position.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outbase: '.',
  outdir: '.test-cache/city-v08',
});
const C = await import('../.test-cache/city-v08/lib/campaign.js');
const B = await import('../.test-cache/city-v08/lib/city.js');
const { positionCityPopover } =
  await import('../.test-cache/city-v08/city/popover-position.js');
const start = 1_800_000_000_000;
const fresh = () => {
  const d = C.freshCampaign();
  C.completeStage(d, 1, start);
  C.completeStage(d, 2, start);
  return d;
};
let d = fresh();
assert.equal(B.CITY_BUILDINGS.length, 12);
assert.equal(C.buildCity(d, 'factory', start), true);
assert.equal(C.production(d, 'factory', start + 45000).amount, 15);
assert.equal(C.production(d, 'workshop', start + 86400000).amount, 200);
assert.equal(C.buildCity(d, 'factory', start), false);
assert.equal(B.cityUpgradeBlock(d, 'factory'), '先升级指挥部至 Lv.2');
// Legacy progress and money survive loading, without accidentally enabling planned mechanics.
const legacy = JSON.parse(JSON.stringify(d));
delete legacy.city.facilities;
legacy.city.workshop.level = 8;
legacy.city.materials = 456;
const migrated = C.parseCampaign(JSON.stringify(legacy));
assert.equal(migrated.city.facilities.hq.level, 8);
assert.equal(migrated.city.materials, 456);
assert.equal(migrated.city.workshop.level, 8);
assert.equal(migrated.city.facilities.research.level, 0);
console.log('PASS old saves, starter economy, HQ gate');
// All six live buildings reach the cap, persist, and reject duplicate upgrades at cap.
d = fresh();
d.city.materials = 1e7;
for (let lv = 2; lv <= 10; lv++)
  assert.equal(C.buildCity(d, 'hq', start), true);
for (const meta of B.CITY_BUILDINGS.filter((x) => x.live && x.id !== 'hq')) {
  while (B.cityBuilding(d, meta.id).level < 10)
    assert.equal(C.buildCity(d, meta.id, start), true);
  const before = d.city.materials;
  assert.equal(C.buildCity(d, meta.id, start), false);
  assert.equal(d.city.materials, before);
}
assert.equal(B.cityCapacity(d), 40);
assert.equal(B.citySpeed(d), 0.8);
assert.equal(B.cityYield(d), 1.5);
assert.equal(C.production(d, 'workshop', start + 86400000).amount, 6000);
assert.equal(C.production(d, 'factory', start + 86400000).amount, 9000);
assert.equal(C.collectCity(d, 'factory', start + 86400000), true);
assert.equal(C.collectCity(d, 'factory', start + 86400000), false);
// Use a present timestamp for the parser's intentional future-time guard.
for (const producer of ['workshop', 'factory'])
  d.city[producer].collectedAt = Date.now();
const reloaded = C.parseCampaign(JSON.stringify(d));
for (const meta of B.CITY_BUILDINGS.filter((x) => x.live))
  assert.equal(B.cityBuilding(reloaded, meta.id).level, 10);
const before = JSON.stringify(d);
for (const meta of B.CITY_BUILDINGS.filter((x) => !x.live))
  assert.equal(C.buildCity(d, meta.id, start), false);
assert.equal(JSON.stringify(d), before);
console.log(
  'PASS all live upgrades, caps, persistence, real modifiers, planned facilities cannot charge',
);
// A bonus upgrade pays out the OLD rate, retains fractional progress and cannot replay earnings.
d = fresh();
d.city.materials = 10000;
C.buildCity(d, 'factory', start);
C.buildCity(d, 'hq', start);
const oldMaterials = d.city.materials,
  oldAmmo = d.ammo;
assert.equal(C.buildCity(d, 'power', start + 45000), true);
assert.equal(d.city.materials, oldMaterials + 10 - 100);
assert.equal(d.ammo, oldAmmo + 15);
assert.equal(C.production(d, 'workshop', start + 45000).next, 15);
assert.equal(C.production(d, 'workshop', start + 59700).amount, 10);
assert.equal(C.production(d, 'factory', start + 89100).amount, 15);
assert.equal(C.production(d, 'workshop', start - 100).amount, 0);
console.log(
  'PASS rate transition, offline settlement, fractional batch continuity',
);
// Every representative screen/edge anchors a panel INSIDE the city viewport.
for (const viewport of [
  { width: 320, height: 420 },
  { width: 390, height: 682 },
  { width: 480, height: 760 },
  { width: 280, height: 260 },
]) {
  for (const [x, y] of [
    [0, 0],
    [0.5, 0],
    [1, 0],
    [0, 0.5],
    [0.5, 0.5],
    [1, 0.5],
    [0, 1],
    [0.5, 1],
    [1, 1],
  ]) {
    const a = {
      left: x * (viewport.width - 65),
      top: y * (viewport.height - 80),
      width: 65,
      height: 80,
    };
    const p = positionCityPopover(a, { width: 280, height: 230 }, viewport);
    assert.ok(p.left >= 8 && p.top >= 8);
    assert.ok(p.left + p.width <= viewport.width - 8 + 0.01);
    assert.ok(p.top + Math.min(230, p.maxHeight) <= viewport.height - 8 + 0.01);
    // The panel points at the target and stays immediately adjacent whenever a side fits.
    if (p.side === 'bottom' && a.top + a.height + 242 <= viewport.height - 8)
      assert.equal(p.top, a.top + a.height + 12);
    if (p.side === 'top' && a.top >= 250) assert.equal(p.top, a.top - 242);
  }
}
const top = positionCityPopover(
  { left: 90, top: 25, width: 80, height: 70 },
  { width: 260, height: 230 },
  { width: 390, height: 680 },
);
const bottom = positionCityPopover(
  { left: 190, top: 520, width: 80, height: 80 },
  { width: 260, height: 230 },
  { width: 390, height: 680 },
);
assert.equal(top.side, 'bottom');
assert.equal(bottom.side, 'top');
assert.notEqual(top.top, bottom.top);
console.log(
  'PASS adjacent popover positions, four edges, small screens, never fixed bottom',
);

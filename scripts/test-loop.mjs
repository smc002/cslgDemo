import { build } from 'esbuild';
import assert from 'node:assert/strict';
await build({
  entryPoints: [
    'lib/campaign.ts',
    'lib/recruit.ts',
    'merged/simulation.ts',
    'hunt/simulation.ts',
  ],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outbase: '.',
  outdir: '.test-cache/loop',
});
const C = await import('../.test-cache/loop/lib/campaign.js'),
  R = await import('../.test-cache/loop/lib/recruit.js');
const { MergedBattle } =
  await import('../.test-cache/loop/merged/simulation.js');
const { HuntGame } = await import('../.test-cache/loop/hunt/simulation.js');
let d = C.freshCampaign();
assert.equal(C.slotsUnlocked(d), 3);
assert.equal(d.ammo, 0);
assert.equal(d.recruit.owned.shield, 1);
const g = new MergedBattle();
g.configure(
  1,
  d.lineup,
  R.RECRUIT_HEROES.map((h) => C.heroPower(d, h.index)),
);
assert.equal(g.heroes.length, 3);
g.start();
assert.ok(g.enemies.every((e) => e.lane === 1));
for (
  let i = 0;
  i < 600 * 60 && g.phase !== 'cleared' && g.phase !== 'defeat';
  i++
)
  g.advance(1 / 60);
assert.equal(g.phase, 'cleared');
assert.equal(g.wave, 3);
assert.ok(C.completeStage(d, 1));
assert.equal(d.ammo, 120);
assert.equal(C.completeStage(d, 1), false);
assert.equal(C.completeStage(d, 3), false);
console.log(
  'PASS actual three-wave first stage',
  g.time.toFixed(1),
  'seconds, reward exactly once',
);
let pending = 0;
const hunt = new HuntGame(
  {
    ammo: () => d.ammo - pending,
    spend: (n) => {
      if (d.ammo - pending < n) return false;
      pending += n;
      return true;
    },
    save: (h) => {
      assert.ok(C.saveHunt(d, h));
      d.ammo -= pending;
      pending = 0;
    },
    ownsHero: (id) => d.recruit.owned[id] > 0,
  },
  d.hunt,
  () => 0.1,
);
hunt.active = true;
hunt.press(300, 220);
for (let i = 0; i < 5 * 60; i++) hunt.advance(1 / 60);
hunt.release();
hunt.persist();
assert.equal(d.hunt.economy.spentAmmo, 20);
assert.equal(d.ammo, 100);
assert.ok(d.hunt.expedition.points > 0);
assert.equal(d.hunt.courier.completed, 0);
hunt.addPoints(620);
hunt.persist();
const tickets = d.ticketsEarned,
  core = d.hunt.expedition.points;
assert.equal(tickets, Math.floor(core / 200));
assert.ok(d.hunt.level >= 3);
hunt.persist();
assert.equal(d.ticketsEarned, tickets);
console.log('PASS inventory debit, core growth and ticket receipt replay');
const before = d.recruit.owned.samurai;
const result = R.drawHeroes(d, 1, () => 0.72);
assert.equal(result[0], 'samurai');
assert.equal(d.recruit.owned.samurai, before + 1);
assert.equal(R.ticketBalance(d), tickets - 1);
d.lineup[3] = 3;
assert.ok(C.validLineup(d, d.lineup));
g.configure(
  2,
  d.lineup,
  R.RECRUIT_HEROES.map((h) => C.heroPower(d, h.index)),
);
assert.equal(g.heroes[0].hero, 3);
assert.ok(g.heroes[0].maxHp > 440);
console.log('PASS recruited hero is deployable with shared level');
const now = 1000000;
C.completeStage(d, 2, now);
assert.equal(C.slotsUnlocked(d), 6);
assert.equal(d.city.materials, 200);
assert.ok(C.buildCity(d, 'hq', now));
assert.ok(C.buildCity(d, 'workshop', now));
assert.equal(d.city.materials, 100);
assert.ok(C.buildCity(d, 'factory', now));
assert.equal(d.city.materials, 0);
assert.equal(C.production(d, 'factory', now + 45000).amount, 15);
assert.ok(C.collectCity(d, 'factory', now + 45000));
assert.equal(C.collectCity(d, 'factory', now + 45000), false);
assert.equal(C.production(d, 'workshop', now + 86400000).amount, 200);
assert.ok(C.collectCity(d, 'workshop', now + 86400000));
assert.equal(C.production(d, 'workshop', now + 86400000).amount, 0);
assert.equal(C.production(d, 'factory', now - 100).amount, 0);
console.log('PASS city bootstrap, production, cap and duplicate claim');
C.completeStage(d, 3);
C.completeStage(d, 4);
assert.equal(C.slotsUnlocked(d), 9);
assert.equal(d.lineup.filter((n) => n >= 0).length, 9);
d.recruit.owned.minigun = 13;
for (let i = 0; i < 3; i++) assert.ok(C.promoteHero(d, 'minigun'));
assert.equal(C.growthOf(d, 'minigun').quality, 'red');
for (let i = 0; i < 2; i++) assert.ok(C.promoteHero(d, 'minigun'));
assert.equal(C.promoteHero(d, 'minigun'), false);
assert.equal(d.hunt.level, C.parseCampaign(JSON.stringify(d)).hunt.level);
const restored = C.parseCampaign(JSON.stringify(d));
assert.deepEqual(restored.lineup, d.lineup);
assert.deepEqual(restored.growth, d.growth);
assert.equal(restored.ammo, d.ammo);
console.log('PASS nine slots, initial orange -> red cap, save roundtrip');
d.ammo = 0;
assert.ok(C.emergencySupply(d, now));
d.ammo = 0;
assert.equal(C.emergencySupply(d, now + 1000), false);
assert.ok(C.emergencySupply(d, now + 180000));
d.ammo = 0;
assert.ok(C.emergencySupply(d, now + 360000));
d.ammo = 0;
assert.equal(C.emergencySupply(d, now + 540000), false);
console.log('PASS emergency cooldown and lifetime count');
const reward = structuredClone(d.hunt);
reward.courier.completed++;
reward.courier.reveal = {
  serial: reward.courier.completed,
  hero: 'priest',
  heroes: ['priest'],
};
const count = d.recruit.owned.priest;
assert.ok(C.saveHunt(d, reward));
assert.equal(d.recruit.owned.priest, count + 1);
assert.ok(C.saveHunt(d, structuredClone(reward)));
assert.equal(d.recruit.owned.priest, count + 1);
console.log('PASS courier reward commit once');

const courierSave = C.freshCampaign();
courierSave.ammo = 1100;
let spentPending = 0;
const courierGame = new HuntGame(
  {
    ammo: () => courierSave.ammo - spentPending,
    spend: (n) => {
      if (courierSave.ammo - spentPending < n) return false;
      spentPending += n;
      return true;
    },
    save: (h) => {
      assert.ok(C.saveHunt(courierSave, h));
      courierSave.ammo -= spentPending;
      spentPending = 0;
    },
    ownsHero: (id) => courierSave.recruit.owned[id] > 0,
  },
  courierSave.hunt,
  () => 0.99,
);
courierGame.active = true;
for (let i = 0; i < 1000; i++) assert.ok(courierGame.fire());
courierGame.persist();
assert.equal(courierSave.hunt.economy.spentAmmo, 1000);
assert.equal(courierSave.ammo, 100);
assert.ok(
  courierSave.hunt.courier.active || courierSave.hunt.courier.queued > 0,
);
assert.equal(courierSave.hunt.courier.completed, 0);
assert.equal(
  courierSave.recruit.owned.priest +
    courierSave.recruit.owned.minigun +
    courierSave.recruit.owned.assassin,
  0,
);
console.log(
  'PASS actual 1000 inventory shots grant challenge eligibility, not an automatic orange hero',
);

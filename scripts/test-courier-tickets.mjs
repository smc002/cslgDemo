import assert from 'node:assert/strict';
import { build } from 'esbuild';

await build({
  entryPoints: ['lib/campaign.ts', 'lib/recruit.ts', 'hunt/simulation.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outbase: '.',
  outdir: '.test-cache/courier-tickets',
});
const C = await import('../.test-cache/courier-tickets/lib/campaign.js');
const R = await import('../.test-cache/courier-tickets/lib/recruit.js');
const { HuntGame, COURIER_KIND, courierScale } =
  await import('../.test-cache/courier-tickets/hunt/simulation.js');

for (const queued of [1, 6]) {
  let d = C.freshCampaign();
  d.ammo = 9999;
  d.hunt.courier.queued = queued;
  const owned = structuredClone(d.recruit.owned);
  const io = {
    ammo: () => d.ammo,
    spend: () => true,
    save: (h) => assert.ok(C.saveHunt(d, h)),
  };
  const g = new HuntGame(io, d.hunt, () => 0.99);
  g.active = true;
  const z = g.zombies.find((z) => z.kind === COURIER_KIND);
  assert.ok(z);
  const bundle = g.save.courier.active.bundle;
  const hits = (18 + 20) * courierScale(bundle);
  for (let i = 0; i < hits; i++) g.hitCourier(z, { bonus: false });
  const tickets = queued * 10;
  // Armor plates also grant core tickets; courier itself supplies exactly ten per bundle.
  assert.equal(d.hunt.courier.reveal.tickets, tickets);
  assert.equal(d.ticketsEarned, tickets + Math.floor((300 * queued) / 200));
  assert.deepEqual(
    d.recruit.owned,
    owned,
    'no hero is granted before recruitment',
  );
  const earned = d.ticketsEarned;
  g.persist();
  assert.equal(d.ticketsEarned, earned, 'same encounter cannot pay twice');
  for (let i = 0; i < 100; i++) g.advance(0.05);
  assert.equal(g.courierVictory, null);
  assert.equal(
    g.save.courier.reveal.tickets,
    tickets,
    'dialog waits for explicit choice',
  );
  d = C.parseCampaign(JSON.stringify(d));
  assert.equal(
    d.hunt.courier.reveal.tickets,
    tickets,
    'reload preserves reward dialog',
  );
  assert.equal(d.ticketsEarned, earned, 'reload never awards again');
  const restored = new HuntGame(io, d.hunt, () => 0.99);
  restored.dismissCourierReward();
  restored.dismissCourierReward();
  assert.equal(d.hunt.courier.reveal, null);
  assert.equal(d.hunt.courier.lastReward.tickets, tickets);
  assert.equal(
    d.ticketsEarned,
    earned,
    'both dismiss and repeat dismiss are idempotent',
  );
  assert.ok(
    R.drawHeroes(d, 10, () => 0.5),
    'ten-draw is available immediately',
  );
  assert.equal(d.recruit.spent, 10);
  d = C.parseCampaign(JSON.stringify(d));
  assert.equal(d.hunt.courier.lastReward.tickets, tickets);
}
console.log(
  'PASS normal and bundled courier kills grant usable ten-draw tickets once; animation, reload and later choice preserve rewards',
);

const legacy = C.freshCampaign();
const h = structuredClone(legacy.hunt);
h.courier.completed = 1;
h.courier.reveal = { serial: 1, hero: 'priest', heroes: ['priest'] };
assert.ok(C.saveHunt(legacy, h));
const migrated = C.parseCampaign(JSON.stringify(legacy));
assert.equal(migrated.recruit.owned.priest, 1);
assert.equal(migrated.hunt.courier.reveal.hero, 'priest');
assert.equal(
  migrated.ticketsEarned,
  0,
  'old hero rewards are preserved, not repaid',
);
assert.ok(C.saveHunt(migrated, structuredClone(migrated.hunt)));
assert.equal(migrated.recruit.owned.priest, 1);
console.log(
  'PASS old already-earned hero rewards survive migration without duplicate heroes or tickets',
);

for (const tickets of [-10, 0, 9, 10.5, Infinity, NaN]) {
  const d = C.freshCampaign();
  const invalid = structuredClone(d.hunt);
  invalid.courier.completed = 1;
  invalid.courier.reveal = { serial: 1, tickets };
  assert.equal(C.saveHunt(d, invalid), false);
  assert.equal(d.ticketsEarned, 0);
}
console.log('PASS malformed courier payouts are rejected');

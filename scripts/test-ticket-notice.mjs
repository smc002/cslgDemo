import assert from 'node:assert/strict';
import { build } from 'esbuild';

await build({
  entryPoints: ['lib/campaign.ts', 'lib/recruit.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outbase: '.',
  outdir: '.test-cache/ticket-notice',
});

const storage = new Map();
const handlers = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
};
globalThis.window = {
  location: { search: '' },
  addEventListener: (event, fn) => handlers.set(event, fn),
};

const { campaign, freshCampaign, saveHunt, KEY } =
  await import('../.test-cache/ticket-notice/lib/campaign.js');
const { drawHeroes } = await import('../.test-cache/ticket-notice/lib/recruit.js');
const saved = freshCampaign();
saved.ticketsEarned = 12;
localStorage.setItem(KEY, JSON.stringify(saved));
const gains = [];
const unsubscribe = campaign.subscribeTicketRewards((amount) => gains.push(amount));
campaign.init();
campaign.claim();
assert.equal(campaign.read().ticketsEarned, 12);
assert.deepEqual(gains, [], 'loading existing tickets must not show a new reward');

campaign.update((d) => {
  const h = structuredClone(d.hunt);
  h.expedition.points = 200;
  h.level = 2;
  assert.equal(saveHunt(d, h), true);
});
assert.deepEqual(gains, [1], 'core milestone produces a ticket reward even when level-up changes notice');
campaign.update((d) => { assert.equal(saveHunt(d, structuredClone(d.hunt)), true); });
campaign.update((d) => { assert.equal(drawHeroes(d, 10, () => 0.2).length, 10); });
assert.deepEqual(gains, [1], 'repeated commits and spending tickets do not replay a reward');

const remote = structuredClone(campaign.read());
remote.ticketsEarned += 20;
handlers.get('storage')({ key: KEY, newValue: JSON.stringify(remote) });
campaign.update(() => {});
assert.deepEqual(gains, [1], 'storage sync and subsequent ordinary updates do not replay remote rewards');

campaign.update((d) => { d.ticketsEarned += 10; });
campaign.update((d) => { d.ticketsEarned += 2; });
assert.deepEqual(gains, [1, 10, 2], 'consecutive rewards are independently delivered to the floating display');
campaign.reset();
assert.deepEqual(gains, [1, 10, 2], 'reset does not announce negative rewards');
campaign.update((d) => { d.ticketsEarned += 1; });
assert.deepEqual(gains, [1, 10, 2, 1], 'the first reward in a reset game is shown');

localStorage.setItem('mori.demo.lease.v2', JSON.stringify({ owner: 'other-tab', until: Date.now() + 10000 }));
assert.equal(campaign.update((d) => { d.ticketsEarned += 10; }), false);
assert.deepEqual(gains, [1, 10, 2, 1], 'rejected writes must not display a reward');
campaign.claim(true);
unsubscribe();
campaign.update((d) => { d.ticketsEarned += 1; });
assert.deepEqual(gains, [1, 10, 2, 1], 'unmounted displays receive no further events');
console.log('PASS ticket reward notices: real core milestone, local gains, spend, save loading/sync, reset, ownership, unsubscribe');

const formalSave = localStorage.getItem(KEY);
window.location.search = '?rewards=preview';
const preview = await import('../.test-cache/ticket-notice/lib/campaign.js?reward-preview');
assert.equal(preview.KEY, 'mori.demo.rewards.preview.v1');
preview.campaign.init();
preview.campaign.claim();
preview.campaign.reset();
preview.campaign.update((d) => { d.ticketsEarned += 10; });
assert.equal(localStorage.getItem(KEY), formalSave, 'reward preview cannot modify the formal game save');
assert.ok(localStorage.getItem('mori.demo.rewards.preview.v1.lease'), 'reward preview has its own lease');
console.log('PASS reward preview save and lease isolation');

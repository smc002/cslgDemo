import assert from 'node:assert/strict';
import { build } from 'esbuild';
await build({
  entryPoints: ['lib/campaign.ts', 'lib/prologue.ts', 'lib/strong-guide.ts'],
  bundle: true, platform: 'node', format: 'esm', outbase: '.',
  outdir: '.test-cache/prologue-reminders',
});
const C = await import('../.test-cache/prologue-reminders/lib/campaign.js');
const P = await import('../.test-cache/prologue-reminders/lib/prologue.js');
const G = await import('../.test-cache/prologue-reminders/lib/strong-guide.js');
const outside = ['merged', 'city', 'recruit'];
const d = C.freshCampaign();
for (const mode of outside) {
  assert.equal(P.shouldShowPrologueStory(d, mode), true, 'automatic story outside hunt');
  assert.equal(G.shouldShowStrongGuide(d, mode), false, 'story takes priority over guide');
}
assert.equal(P.prologueTaskAttention(d, 'hunt'), true);
assert.equal(P.shouldShowPrologueStory(d, 'hunt'), false);
assert.equal(P.shouldShowPrologueStory(d, 'hunt', 'arrival'), true);
d.bestStage = 1;
d.prologue.seen.push('arrival');
assert.equal(P.prologueTaskNotice(d).storyId, 'ammo');
assert.equal(P.shouldShowPrologueStory(d, 'hunt', 'arrival'), false, 'no chapter chaining in hunt');
assert.equal(P.shouldShowPrologueStory(d, 'merged', 'arrival'), true, 'automatic next chapter outside hunt');
d.prologue.seen.push('ammo');
const collect = P.prologueTaskNotice(d);
assert.equal(P.prologueTaskAttention(d, 'hunt', collect.key), false);
assert.equal(P.prologueTaskAttention(d, 'city', collect.key), true);
d.hunt.expedition.points = 100;
assert.equal(P.prologueTaskNotice(d).key, collect.key, 'per-shot progress is not a new task');
assert.equal(G.strongGuideStep(d).id, 'fire');
assert.equal(G.shouldShowStrongGuide(d, 'hunt'), false, 'firing never gets a blocking guide');
for (const mode of outside) {
  assert.equal(G.shouldShowStrongGuide(d, mode), true, 'automatic navigation guide outside hunt');
}
d.hunt.expedition.points = 200;
d.ticketsEarned = 1;
assert.equal(P.prologueTaskNotice(d).storyId, 'signal');
assert.equal(P.prologueTaskAttention(d, 'hunt', collect.key), true, 'new task starts reminder');
assert.equal(P.shouldShowPrologueStory(d, 'hunt'), false);
assert.equal(P.shouldShowPrologueStory(d, 'hunt', 'signal'), true, 'task click opens current story');
for (const mode of outside) {
  assert.equal(P.shouldShowPrologueStory(d, mode), true, 'leaving hunt restores automatic popup');
}
d.prologue.seen.push('signal');
d.hunt.economy.spentAmmo = 1;
assert.equal(P.prologueTaskNotice(d).mode, 'recruit');
assert.equal(G.shouldShowStrongGuide(d, 'hunt'), false);
assert.equal(G.shouldShowStrongGuide(d, 'recruit'), true);
assert.equal(G.shouldShowStrongGuide(d, 'city'), true, 'off-target navigation guide restored');
d.prologue.rewards.push('recruit');
d.bestStage = 2;
d.city.unlocked = true;
d.city.facilities.hq.level = 0;
d.city.workshop.level = 0;
d.city.factory.level = 0;
d.prologue.seen.push('city');
const hq = P.prologueTaskNotice(d);
d.city.facilities.hq.level = 1;
assert.notEqual(P.prologueTaskNotice(d).key, hq.key);
assert.equal(P.prologueTaskAttention(d, 'hunt', hq.key), true);
assert.equal(G.shouldShowStrongGuide(d, 'hunt'), false);
assert.equal(G.shouldShowStrongGuide(d, 'city'), true, 'next building is guided automatically outside hunt');
d.prologue.seen.push('ending');
assert.equal(P.prologueTaskNotice(d), undefined);
const old = C.freshCampaign();
old.prologue.enabled = false;
for (const mode of ['hunt', ...outside]) {
  assert.equal(P.shouldShowPrologueStory(old, mode, 'arrival'), false);
  assert.equal(G.shouldShowStrongGuide(old, mode), false);
}
console.log('PASS hunt-only deferral, explicit hunt communications, automatic outside stories/guides, task updates and legacy saves');

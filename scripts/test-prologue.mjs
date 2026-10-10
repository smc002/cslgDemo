import { build } from 'esbuild';
import assert from 'node:assert/strict';
await build({
  entryPoints: [
    'lib/campaign.ts',
    'lib/prologue.ts',
    'lib/strong-guide.ts',
    'lib/city.ts',
    'lib/recruit.ts',
    'hunt/simulation.ts',
    'merged/simulation.ts',
  ],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outbase: '.',
  outdir: '.test-cache/prologue',
});
const C = await import('../.test-cache/prologue/lib/campaign.js');
const P = await import('../.test-cache/prologue/lib/prologue.js');
const G = await import('../.test-cache/prologue/lib/strong-guide.js');
const B = await import('../.test-cache/prologue/lib/city.js');
const { MergedBattle, HEROES: battleHeroes } =
  await import('../.test-cache/prologue/merged/simulation.js');
const { RECRUIT_HEROES } =
  await import('../.test-cache/prologue/lib/recruit.js');
const { HEROES: huntHeroes } =
  await import('../.test-cache/prologue/hunt/simulation.js');
for (const story of P.STORIES) {
  const identity = P.storyIdentity(story),
    hero = RECRUIT_HEROES[story.hero];
  assert.equal(identity.name, hero.name);
  assert.equal(
    identity.portrait,
    hero.art,
    'story and recruitment share the same file',
  );
  assert.equal(identity.name, battleHeroes[story.hero].name);
  assert.equal(identity.name, huntHeroes[story.hero]);
  assert.ok(!/阿栓|维修员|路锥|护栏|举盾/.test(story.text));
}
const timeline = C.freshCampaign();
const assertAvailable = (id) => {
  const story = P.STORIES.find((s) => s.id === id);
  assert.ok(story.ready(timeline));
  assert.ok(
    timeline.recruit.owned[RECRUIT_HEROES[story.hero].id] > 0,
    `${id} speaker has already joined`,
  );
};
assertAvailable('arrival');
C.completeStage(timeline, 1);
assertAvailable('ammo');
timeline.hunt.expedition.points = 200;
timeline.ticketsEarned = 1;
assertAvailable('signal');
P.storyRecruit(timeline);
C.completeStage(timeline, 2);
assertAvailable('city');
for (const kind of ['hq', 'workshop', 'factory'])
  assert.ok(C.buildCity(timeline, kind));
assertAvailable('factory');
for (let stage = 3; stage <= 10; stage++) {
  C.completeStage(timeline, stage);
  const id = { 4: 'three', 5: 'elite', 6: 'training', 9: 'boss', 10: 'ending' }[
    stage
  ];
  if (id) assertAvailable(id);
}
console.log(
  'PASS shared story/recruit/battle/hunt identities; every speaker has joined at its story milestone',
);
const d = C.freshCampaign();
assert.deepEqual(C.unlockedSlotIndices(d), [3, 4, 5]);
assert.deepEqual(d.lineup, [-1, -1, -1, 0, 1, 2, -1, -1, -1]);
assert.ok(C.validLineup(d, d.lineup));
assert.equal(C.validLineup(d, [0, 1, 2, -1, -1, -1, -1, -1, -1]), false);
C.autoLineup(d);
assert.deepEqual(d.lineup.slice(3, 6), [0, 1, 2]);
const oldCenterMigration = structuredClone(d);
oldCenterMigration.lineup = [2, 0, 1, -1, -1, -1, -1, -1, -1];
assert.deepEqual(
  C.parseCampaign(JSON.stringify(oldCenterMigration)).lineup,
  [-1, -1, -1, 2, 0, 1, -1, -1, -1],
);

assert.equal(P.pendingStory(d).id, 'arrival');
assert.equal(
  G.strongGuideStep(d),
  undefined,
  'story takes priority over input guide',
);
assert.ok(P.battleGate(d));
d.prologue.seen.push('arrival');
assert.equal(G.strongGuideStep(d).id, 'start');
const skipped = structuredClone(d);
skipped.prologue.seen.push('guide-skip-start');
assert.equal(
  G.strongGuideStep(C.parseCampaign(JSON.stringify(skipped))),
  undefined,
);
d.tutorial = 1;
assert.equal(G.strongGuideStep(d), undefined);
assert.equal(P.battleGate(d), '');
C.completeStage(d, 1);
d.prologue.seen.push('ammo');
assert.equal(G.strongGuideStep(d).id, 'fire');
assert.equal(G.strongGuideStep(d).roaming, true);
d.hunt.economy.spentAmmo = 1;
assert.equal(G.strongGuideStep(d), undefined, 'real shot ends hand guide');
assert.ok(P.battleGate(d));
d.hunt.expedition.points = 200;
d.ticketsEarned = 1;
d.prologue.seen.push('signal');
assert.equal(G.strongGuideStep(d).id, 'recruit');
assert.deepEqual(P.storyRecruit(d), ['samurai']);
assert.equal(P.storyRecruit(d), null);
assert.equal(d.recruit.spent, 1);
assert.equal(P.battleGate(d), '');
C.completeStage(d, 2);
assert.equal(d.recruit.owned.samurai, 1);
assert.equal(C.slotsUnlocked(d), 6);
assert.deepEqual(C.unlockedSlotIndices(d), [3, 4, 5, 0, 1, 2]);
assert.deepEqual(
  d.lineup.slice(3, 6),
  [0, 1, 2],
  'original team stays in center after auto deployment',
);
assert.deepEqual(C.parseCampaign(JSON.stringify(d)).lineup, d.lineup);
assert.ok(d.lineup.slice(0, 3).every((n) => n >= 0));
assert.deepEqual(d.lineup.slice(6), [-1, -1, -1]);
d.prologue.seen.push('city');
assert.equal(G.strongGuideStep(d).id, 'build-hq');
assert.deepEqual(
  B.visibleCityBuildings(d).map((x) => x.id),
  ['hq'],
);
assert.ok(P.battleGate(d));
const ammo = d.ammo;
assert.equal(d.city.materials, 200);
assert.equal(d.city.facilities.hq.level, 0);
assert.equal(d.city.workshop.level, 0);
assert.equal(
  C.parseCampaign(JSON.stringify(d)).city.facilities.hq.level,
  0,
  'empty city survives reload',
);
assert.equal(C.buildCity(d, 'factory', 10000), false);
assert.ok(C.buildCity(d, 'hq', 10000));
assert.equal(G.strongGuideStep(d).id, 'build-workshop');
assert.deepEqual(
  B.visibleCityBuildings(d).map((x) => x.id),
  ['hq', 'workshop'],
);
assert.equal(d.city.materials, 200);
assert.ok(C.buildCity(d, 'workshop', 10000));
assert.equal(G.strongGuideStep(d).id, 'build-factory');
assert.equal(B.visibleCityBuildings(d).length, 3);
assert.equal(d.city.materials, 100);
assert.ok(C.buildCity(d, 'factory', 10000));
assert.equal(d.city.materials, 0);
assert.equal(d.ammo, ammo + 150);
assert.equal(
  P.rewardOnce(d, 'factory', () => (d.ammo += 150)),
  false,
);
d.prologue.seen.push('factory');
assert.equal(G.strongGuideStep(d), undefined);
assert.ok(
  B.visibleCityBuildings(d).every((x) => x.live),
  'planned facilities never appear as constructed',
);
assert.equal(P.battleGate(d), '');
C.completeStage(d, 3);
C.completeStage(d, 4);
assert.equal(C.slotsUnlocked(d), 9);
assert.deepEqual(C.unlockedSlotIndices(d), [3, 4, 5, 0, 1, 2, 6, 7, 8]);
const before = d.ammo;
C.completeStage(d, 5);
assert.equal(d.ammo - before, 180 + 150);
assert.equal(C.completeStage(d, 5), false);
C.completeStage(d, 6);
assert.equal(d.recruit.owned.shield, 2);
assert.ok(C.promoteHero(d, 'shield'));
const saved = C.parseCampaign(JSON.stringify(d));
assert.deepEqual(saved.prologue, d.prologue);
const old = structuredClone(d);
delete old.prologue;
const migrated = C.parseCampaign(JSON.stringify(old));
assert.equal(migrated.prologue.enabled, false);
assert.equal(P.battleGate(migrated), '');
assert.deepEqual(migrated.recruit, d.recruit);
console.log(
  'PASS tutorial gates, fixed paid recruit, rewards once, two/three lanes, training and old save migration',
);

const g = new MergedBattle();
g.configure(10, [0, 1, 2, 3, 4, 5, 6, 7, 8], Array(9).fill(4));
g.wave = 30;
g.start();
assert.equal(g.enemies.filter((e) => e.boss).length, 1);
const boss = g.enemies.find((e) => e.boss);
assert.equal(boss.lane, 1);
// Test the ordinary forward slam; assassin-directed retaliation has its own test.
g.heroes.find((h) => h.hero === 5).hp = 0;
g.enemies = [boss];
boss.hp = boss.maxHp = 100000;
boss.cd = 0;
for (const h of g.heroes) {
  h.cd = 100;
  h.stun = 100;
  h.x = boss.x;
  h.y = boss.y + 45;
  h.combatLane = 1;
}
const tank = g.heroes[0],
  startHp = tank.hp;
g.advance(1 / 60);
assert.ok(boss.bossCharge > 1);
for (let i = 0; i < 60; i++) g.advance(1 / 60);
assert.equal(tank.hp, startHp, 'windup must not damage early');
for (let i = 0; i < 16; i++) g.advance(1 / 60);
assert.ok(tank.hp < startHp, 'impact damages once');
const afterImpact = tank.hp;
for (let i = 0; i < 20; i++) g.advance(1 / 60);
assert.equal(tank.hp, afterImpact, 'recovery must not repeat damage');
console.log(
  'PASS single center boss, telegraph before impact, one hit during recovery',
);

for (const power of [2, 3, 4]) {
  const battle = new MergedBattle();
  battle.configure(10, [0, 1, 2, 3, 4, 5, 6, 7, 8], Array(9).fill(power));
  battle.start();
  for (
    let i = 0;
    i < 36000 && !['cleared', 'defeat'].includes(battle.phase);
    i++
  )
    battle.advance(1 / 60);
  assert.ok(
    ['cleared', 'defeat'].includes(battle.phase),
    'battle must terminate',
  );
  if (power === 4) assert.equal(battle.phase, 'cleared');
  console.log(
    `Stage 10 power ${power}: ${battle.phase}, ${battle.time.toFixed(1)} seconds`,
  );
}
globalThis.window = {
  location: { search: '?prologue=preview' },
  addEventListener() {},
};
const original = JSON.stringify(d),
  storage = new Map([['mori.demo.campaign.v2', original]]);
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
};
const preview =
  await import('../.test-cache/prologue/lib/campaign.js?preview-test');
assert.equal(preview.KEY, 'mori.demo.prologue.preview.v1');
preview.campaign.init();
preview.campaign.claim();
preview.campaign.reset();
assert.equal(storage.get('mori.demo.campaign.v2'), original);
assert.equal(preview.campaign.read().bestStage, 0);
assert.ok(storage.has(preview.KEY));
delete globalThis.window;
delete globalThis.localStorage;
console.log('PASS isolated preview reset leaves original save untouched');

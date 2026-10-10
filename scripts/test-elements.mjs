import assert from 'node:assert/strict';
import { build } from 'esbuild';
await build({ entryPoints: ['lib/elements.ts', 'lib/campaign.ts', 'merged/simulation.ts'], bundle: true, platform: 'node', format: 'esm', outbase: '.', outdir: '.test-cache/elements' });
const E = await import('../.test-cache/elements/lib/elements.js');
const C = await import('../.test-cache/elements/lib/campaign.js');
const { MergedBattle } = await import('../.test-cache/elements/merged/simulation.js');
const step = g => g.advance(1 / 60);
const hero = element => ({ hero: 2, element });
const zombie = element => ({ hero: -1, element });
for (const element of ['ice', 'fire']) {
  const other = E.opposite(element);
  assert.equal(E.elementalDamage(hero(element), zombie(other)), 1.3);
  assert.equal(E.elementalDamage(zombie(other), hero(element)), 0.8);
  assert.equal(E.elementalDamage(hero(element), zombie(element)), 1);
  assert.equal(E.elementalDamage(hero(element), zombie(undefined)), 1);
  assert.equal(E.elementalDamage(zombie(element), hero(undefined)), 1);
}
for (const healer of [1, 4, 7]) assert.equal(E.heroElement(healer, 10), undefined);
assert.equal(E.heroElement(2, 1), undefined);
assert.equal(E.heroElement(2, 2), 'fire');
assert.equal(E.heroElement(3, 2), 'ice');
const save = C.freshCampaign();
assert.deepEqual(C.unlockedSlotIndices(save), [3, 4, 5]);
C.completeStage(save, 1);
assert.deepEqual(C.unlockedSlotIndices(save), [3, 4, 5, 0, 1, 2]);
save.recruit.owned.samurai = 1;
save.hunt.level = 2;
const lineup = [0, -1, 2, 3, 1, -1, -1, -1, -1];
assert.ok(C.validLineup(save, lineup));
assert.ok(E.laneCoverage(2, 0, lineup).complete);
assert.ok(E.laneCoverage(2, 1, lineup).complete);
assert.deepEqual(E.emptyCombatLanes(2, lineup), []);
assert.deepEqual(E.emptyCombatLanes(2, [-1, 1, -1, 0, -1, 2, -1, -1, -1]), [0]);
assert.equal(E.laneCoverage(3, 0, [2, -1, -1, 0, 1, 3, -1, -1, -1]).complete, false, 'one element only covers part of mixed lane');

// All waves must agree with the advertised enemy kinds, elements and counts.
for (const stage of [2, 3, 4, 5, 10]) {
  const g = new MergedBattle();
  g.configure(stage, [0, 1, 2, 3, 4, 5, 6, 7, 8], Array(9).fill(2));
  const actual = [[], [], []];
  for (let section = 1; section <= 3; section++) {
    g.wave = (stage - 1) * 3 + section;
    g.enemies = []; g.phase = 'prep'; g.start();
    for (const z of g.enemies) actual[z.lane].push({ kind: z.kind, element: z.element });
  }
  for (const lane of E.stageLanes(stage)) {
    const forecast = E.laneForecast(stage, lane);
    assert.equal(actual[lane].length, forecast.reduce((n, e) => n + e.count, 0));
    for (const e of forecast) assert.equal(actual[lane].filter(z => z.kind === e.kind && z.element === e.element).length, e.count);
  }
}

// Verify modifiers in the actual damage path, including an enemy source and stacking with power.
const damageGame = new MergedBattle();
damageGame.configure(2, lineup, Array(9).fill(1)); damageGame.start();
const fireHero = damageGame.heroes.find(h => h.hero === 2);
const iceEnemy = damageGame.enemies.find(z => z.element === 'ice');
fireHero.hp = fireHero.maxHp = 1000; iceEnemy.hp = iceEnemy.maxHp = 1000;
damageGame.hurt(iceEnemy, 100, fireHero);
assert.equal(iceEnemy.hp, 870);
assert.equal(damageGame.effects.at(-1).counter, true);
damageGame.hurt(fireHero, 100, iceEnemy);
assert.equal(fireHero.hp, 1000 - 100 * (0.65 + 2 * 0.09) * 0.8);
assert.ok(damageGame.damage.every(Number.isFinite));

// A second-stage player has only the initial team and paid story recruit. This setup must be viable.
const battle = new MergedBattle();
battle.configure(2, lineup, Array.from({ length: 9 }, (_, i) => C.heroPower(save, i)));
battle.start();
for (let i = 0; i < 180 * 60 && !['cleared', 'defeat'].includes(battle.phase); i++) step(battle);
assert.equal(battle.phase, 'cleared', `two-lane tutorial must be winnable by four available heroes (${battle.time}s)`);
assert.equal(battle.waveInStage, 3);
console.log(`PASS element damage/defense, healer exclusion, stage-two lane unlock, forecast/spawn parity, mixed coverage, four-hero second stage (${battle.time.toFixed(1)}s)`);

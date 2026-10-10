import assert from 'node:assert/strict';
import { build } from 'esbuild';
await build({
  entryPoints: ['hunt/reward-groups.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: '.test-cache/reward-groups.mjs',
});
const { groupKillRewards } = await import('../.test-cache/reward-groups.mjs');
const effects = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  kind: 'kill',
  species: i % 2 ? 6 : 0,
  x: (i % 5) * 120,
  y: Math.floor(i / 5) * 130,
  age: i / 100,
  life: 1.35,
  points: i + 1,
  angle: 0,
  seed: 0.5,
}));
const original = structuredClone(effects);
const grouped = groupKillRewards(effects);
assert.ok(grouped.length <= 4);
assert.equal(
  grouped.reduce((n, e) => n + e.points, 0),
  210,
);
assert.deepEqual(
  effects,
  original,
  'presentation grouping must not alter payout inputs',
);
const neighbors = [
  { ...effects[0], points: 10 },
  { ...effects[0], id: 30, x: 20, points: 20 },
];
assert.equal(groupKillRewards(neighbors).length, 1);
assert.equal(groupKillRewards(neighbors)[0].points, 30);
assert.equal(
  groupKillRewards([{ ...effects[0], kind: 'hit', points: 100 }]).length,
  0,
);
console.log(
  'PASS reward grouping: bounded cards, conserved totals, immutable inputs, non-kill exclusion',
);

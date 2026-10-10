import assert from 'node:assert/strict';
import { build } from 'esbuild';
await build({
  entryPoints: ['hunt/overlay-layout.ts', 'lib/core-rewards.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outbase: '.',
  outdir: '.test-cache/presentation',
});
const { CombatOverlayLayout, overlaps, jackpotTitle, comboRect } =
  await import('../.test-cache/presentation/hunt/overlay-layout.js');
const { ticketRewardSource, coreRewardProgress } =
  await import('../.test-cache/presentation/lib/core-rewards.js');
for (const top of [0, 150, 260, 340]) {
  const layout = new CombatOverlayLayout(top);
  layout.reserve({ x: 290, y: 390, w: 205, h: 212 });
  layout.reserve({ ...jackpotTitle(top), w: 432, h: 126 });
  const c = comboRect(top);
  const placements = [];
  for (const [x, y, w, h] of [
    [c.x, c.y, c.w, c.h],
    [240, top + 52, 250, 82],
    [290, 380, 126, 38],
    [430, 235, 224, 54],
    ...[1, 2, 3, 4, 5].map((i) => [210 + i * 20, 250, 100, 36]),
  ]) {
    const box = layout.place(x, y, w, h);
    if (!box) continue;
    assert.ok(box.x - box.w / 2 >= 8 && box.x + box.w / 2 <= 592);
    assert.ok(box.y - box.h / 2 >= top + 8 && box.y + box.h / 2 <= 620);
    placements.push(box);
  }
  for (const box of placements)
    for (const other of layout.occupied)
      if (box !== other)
        assert.equal(
          overlaps(box, other),
          false,
          'no labels over other cards or focused subject',
        );
}
const middle = ticketRewardSource({ level: 3, xp: 390, points: 990 }, 1010, 1);
assert.deepEqual(middle, {
  core: { amount: 1, level: 3, xp: 400, points: 1000, threshold: 1000 },
  other: 0,
});
assert.equal(
  coreRewardProgress(middle.core.level, middle.core.xp, middle.core.points).cap,
  600,
);
const rollover = ticketRewardSource({ level: 1, xp: 190, points: 190 }, 850, 4);
assert.equal(rollover.core.xp, 200);
assert.equal(rollover.core.level, 1);
assert.equal(rollover.core.amount, 4);
assert.deepEqual(
  ticketRewardSource({ level: 2, xp: 20, points: 220 }, 230, 10),
  { other: 10 },
);
assert.deepEqual(
  ticketRewardSource({ level: 2, xp: 190, points: 390 }, 410, 11),
  {
    core: { amount: 1, level: 2, xp: 200, points: 400, threshold: 400 },
    other: 10,
  },
);
assert.deepEqual(
  ticketRewardSource({ level: 2, xp: 190, points: 390 }, 410, 0),
  { other: 0 },
);
assert.deepEqual(ticketRewardSource({ level: 2, xp: 190, points: 390 }, 0, 0), {
  other: 0,
});
console.log(
  'PASS collision-free callouts in tall/short views; exact intermediate node, level rollover, multi-award, mixed courier/core, no duplicate reward',
);

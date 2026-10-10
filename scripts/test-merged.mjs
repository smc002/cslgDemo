import fs from 'node:fs';
import { build } from 'esbuild';
import assert from 'node:assert/strict';
fs.mkdirSync('.test-cache/merged', { recursive: true });
await build({
  entryPoints: ['merged/simulation.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: '.test-cache/merged/simulation.mjs',
});
const { MergedBattle, HEROES } =
  await import('../.test-cache/merged/simulation.mjs');
const run = (g, t) => {
  for (let i = 0; i < t * 60; i++) g.advance(1 / 60);
};
let passed = 0;
const test = (name, f) => {
  f();
  console.log('PASS', name);
  passed++;
};
test('九个独立英雄、布阵冻结与真实交换分路', () => {
  const g = new MergedBattle();
  run(g, 2);
  assert.equal(g.time, 0);
  assert.equal(g.heroes.length, 9);
  assert.equal(new Set(HEROES.map((h) => h.name)).size, 9);
  const lineup = [...g.lineup];
  [lineup[0], lineup[4]] = [lineup[4], lineup[0]];
  assert.ok(g.setLineup(lineup));
  assert.equal(g.heroes[0].hero, 4);
  assert.equal(g.heroes[0].lane, 0);
  assert.equal(g.heroes[4].hero, 0);
  assert.equal(g.heroes[4].lane, 1);
  assert.equal(g.setLineup(Array(9).fill(0)), false);
  g.start();
  assert.equal(g.setLineup(lineup), false);
});
test('刺客开场闪到敌后，仅被闪袭目标与其对战', () => {
  const g = new MergedBattle();
  g.start();
  const assassin = g.heroes.find((h) => h.hero === 5);
  const originY = assassin.y;
  const originX = assassin.x;
  run(g, 1 / 60);
  assert.ok(assassin.y < originY - 100);
  const foe = g.enemies.find((e) => e.id === assassin.target);
  assert.equal(foe.lane, assassin.lane);
  assert.ok(assassin.y < foe.y);
  assert.equal(foe.target, assassin.id);
  const blink = g.effects.find((e) => e.kind === 'blink');
  assert.ok(blink, 'teleport records a dual-end effect');
  assert.equal(blink.x, originX);
  assert.equal(blink.y, originY - 20);
  assert.equal(blink.tx, assassin.x);
  assert.equal(blink.ty, assassin.y - 20);
  run(g, 0.4);
  assert.ok(
    g.effects.includes(blink),
    'portals remain visible during the shortened animation',
  );
  run(g, 0.3);
  assert.ok(
    !g.effects.includes(blink),
    'portals expire after their full lifetime',
  );
  for (let i = 0; i < 1200; i++) {
    g.advance(1 / 60);
    assert.ok(
      g.enemies
        .filter((e) => e.hp > 0)
        .every((e) => e.target !== assassin.id || e.id === assassin.target),
    );
  }
  assert.ok(g.uses[5] > 0 && g.damage[5] > 0);
  g.heroes
    .filter((h) => h.lane === assassin.lane && h.hero !== 5)
    .forEach((h) => (h.hp = 0));
  run(g, 0.5);
  assert.ok(
    g.enemies
      .filter((e) => e.hp > 0)
      .every((e) => e.target !== assassin.id || e.id === assassin.target),
  );
});

test('特效两倍播放，吉他手不变；屏外目标不闪现，推进后仍在安全区', () => {
  const g = new MergedBattle();
  g.start();
  g.effects.push(
    ...['music', 'blade'].map((kind) => ({
      kind,
      playbackRate: kind === 'music' ? 1 : 2,
      x: 0,
      y: 0,
      tx: 0,
      ty: 0,
      age: 0,
      amount: 0,
      lane: 0,
    })),
  );
  const [music, blade] = g.effects;
  run(g, 0.2);
  assert.ok(Math.abs(music.age - 0.2) < 0.001);
  assert.ok(Math.abs(blade.age - 0.4) < 0.001);
  const assassin = g.heroes.find((h) => h.hero === 5);
  for (const e of g.enemies.filter((e) => e.lane === assassin.lane)) e.y = -300;
  assassin.target = 0;
  const uses = g.uses[5];
  run(g, 0.3);
  assert.equal(assassin.target, 0);
  assert.equal(g.uses[5], uses);
  for (const lane of [0, 1, 2]) {
    const b = new MergedBattle();
    const lineup = [...b.lineup];
    [lineup[5], lineup[lane * 3 + 2]] = [lineup[lane * 3 + 2], lineup[5]];
    b.setLineup(lineup);
    b.visibleBounds.top = 240;
    b.visibleBounds.bottom = 630;
    b.start();
    for (let n = 0; n < 120 * 60; n++) {
      b.advance(1 / 60);
      const h = b.heroes.find((h) => h.hero === 5);
      const screenY = h.y + b.camera + 40;
      if (h.hp > 0) assert.ok(screenY >= 240 - 0.001 && screenY <= 630 + 0.001);
      assert.ok(h.x >= 30 && h.x <= 360);
      assert.ok(
        b.enemies
          .filter((e) => e.hp > 0)
          .every((e) => e.target !== h.id || e.id === h.target),
      );
    }
    assert.ok(b.wave > 3);
  }
});
test('斩击、穿透和子弹均不能伤害邻路敌人', () => {
  for (const hero of [0, 2, 3, 6, 8]) {
    const g = new MergedBattle();
    g.start();
    g.heroes.forEach((h) => {
      h.cd = 999;
      if (h.hero === 5) h.hp = 0;
    });
    const h = g.heroes.find((h) => h.hero === hero);
    h.cd = 0;
    const same = g.enemies.find((e) => e.lane === h.lane),
      other = g.enemies.find((e) => e.lane !== h.lane);
    g.enemies = [same, other];
    for (const e of g.enemies) {
      e.x = h.x;
      e.y = h.y - 35;
      e.stun = 999;
      e.hp = e.maxHp = 1000;
    }
    run(g, 0.9);
    assert.ok(same.hp < 1000, `hero ${hero} hits own lane`);
    assert.equal(other.hp, 1000, `hero ${hero} excludes other lane`);
  }
});
test('治疗不跨路，满血医疗兵会攻击，死亡目标不能复活', () => {
  for (const hero of [1, 4, 7]) {
    const g = new MergedBattle();
    g.start();
    g.heroes.forEach((h) => (h.cd = 999));
    g.enemies.forEach((e) => (e.stun = 999));
    const h = g.heroes.find((h) => h.hero === hero);
    h.cd = 0;
    const same = g.heroes.find((p) => p.lane === h.lane && p !== h),
      other = g.heroes.find((p) => p.lane !== h.lane);
    same.hp = 10;
    other.hp = 1;
    run(g, 1);
    assert.ok(same.hp > 10);
    assert.equal(other.hp, 1);
    same.hp = 0;
    h.cd = 0;
    run(g, 1);
    assert.equal(same.hp, 0);
  }
  const g = new MergedBattle();
  g.start();
  run(g, 1.3);
  assert.ok(g.damage[1] > 0);
});
test('九人技能均触发，共享地图连续推进，实体数量有界', () => {
  const g = new MergedBattle();
  g.start();
  run(g, 180);
  console.log(
    'MATCH',
    JSON.stringify({
      wave: g.wave,
      phase: g.phase,
      distance: g.distance,
      kills: g.kills,
      healed: g.healed,
      uses: g.uses,
    }),
  );
  assert.ok(g.wave > 3 && g.camera > 260);
  assert.notEqual(g.phase, 'defeat');
  assert.ok(g.uses.every((n) => n > 0));
  assert.ok(g.healed > 0);
  assert.ok(g.enemies.length <= 21);
  assert.ok(g.shots.length < 100 && g.effects.length < 200);
});
test('暂停隐藏冻结、四倍速、失败与重开', () => {
  const g = new MergedBattle();
  g.start();
  g.speed = 4;
  run(g, 1);
  assert.ok(Math.abs(g.time - 4) < 0.01);
  g.paused = true;
  const before = JSON.stringify(g.snapshot());
  run(g, 1);
  assert.equal(JSON.stringify(g.snapshot()), before);
  g.paused = false;
  g.active = false;
  const time = g.time;
  run(g, 1);
  assert.equal(g.time, time);
  g.active = true;
  g.heroes.filter((h) => h.hero !== 5).forEach((h) => (h.hp = 0));
  run(g, 3);
  assert.equal(g.phase, 'defeat');
  g.reset();
  assert.equal(g.phase, 'prep');
  assert.equal(g.wave, 1);
  assert.equal(g.camera, 0);
});
test('序幕首战两节结束，第二关仍三节且保留原敌人难度索引', () => {
  const g = new MergedBattle();
  for (const stage of [1, 2]) {
    g.configure(stage, [-1, -1, -1, 0, 1, 2, -1, -1, -1], Array(9).fill(1));
    g.start();
    const count = stage === 1 ? 2 : 3;
    assert.equal(g.wave, (stage - 1) * 3 + 1);
    assert.equal(g.snapshot().totalWaves, count);
    for (let section = 1; section <= count; section++) {
      assert.equal(g.phase, 'battle');
      assert.equal(g.snapshot().waveInStage, section);
      g.enemies.forEach((enemy) => { enemy.hp = 0; });
      run(g, 0.1);
      assert.equal(g.phase, section === count ? 'cleared' : 'march');
      if (section < count) run(g, 2.5);
    }
    run(g, 3);
    assert.equal(g.phase, 'cleared');
    assert.equal(g.waveInStage, count, 'no extra wave after completion');
  }
});
console.log(JSON.stringify({ passed }));

import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
await build({
  entryPoints: [
    'hunt/simulation.ts',
    'hunt/view.ts',
    'lib/campaign.ts',
    'lib/ammo-carrier.ts',
    'lib/hunt-economy.ts',
  ],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outbase: '.',
  outdir: '.test-cache/ammo-carrier',
});
const C = await import('../.test-cache/ammo-carrier/lib/campaign.js');
const A = await import('../.test-cache/ammo-carrier/lib/ammo-carrier.js');
const E = await import('../.test-cache/ammo-carrier/lib/hunt-economy.js');
const { HuntGame } =
  await import('../.test-cache/ammo-carrier/hunt/simulation.js');
const { HuntView } = await import('../.test-cache/ammo-carrier/hunt/view.js');
function setup(room = 1) {
  let d = C.freshCampaign(),
    pending = 0;
  d.ammo = 1000000;
  d.hunt.room = room;
  const io = {
    ammo: () => d.ammo - pending,
    spend: (n) => {
      if (d.ammo - pending < n) return false;
      pending += n;
      return true;
    },
    save: (h) => {
      const cost = pending;
      assert.ok(d.ammo >= cost);
      assert.ok(C.saveHunt(d, h), 'atomic inventory/save commit');
      d.ammo -= cost;
      pending = 0;
    },
  };
  let g = new HuntGame(io, d.hunt, () => 0.99);
  const quiet = () => {
    g.active = true;
    g.intro = 0;
    g.spawnClock = 999;
    g.save.economy.checkLeft = 999;
    g.save.courier.cooldown = 30;
  };
  quiet();
  return {
    get g() {
      return g;
    },
    get d() {
      return d;
    },
    reload() {
      g.persist();
      d = C.parseCampaign(JSON.stringify(d));
      g = new HuntGame(io, d.hunt, () => 0.99);
      quiet();
    },
    earn(n = 100) {
      for (let i = 0; i < n; i++) assert.ok(g.fire());
      g.release();
      g.bullets = [];
      g.advance(0.016);
    },
    carrier() {
      return g.zombies.find((z) => z.kind === 12);
    },
  };
}
let shot = 100000;
function hit(s, id = ++shot) {
  const z = s.carrier();
  assert.ok(z);
  s.g.hitTarget(z, {
    id,
    shotId: id,
    room: s.g.effectiveRoom,
    bonus: false,
    vx: 0,
    vy: -800,
    x: z.x,
    y: z.y,
    age: 0,
    bounces: 0,
  });
}
for (const room of A.AMMO_ROOMS) {
  const s = setup(room);
  s.earn(99);
  assert.equal(s.carrier(), undefined);
  s.earn(1);
  assert.ok(s.carrier());
  assert.equal(s.g.save.ammoCarrier.active.room, room);
  assert.equal(s.g.save.ammoCarrier.active.refundAmount, 20 * room);
  const selectedRoom = room === 1 ? 100 : 1;
  assert.equal(s.g.selectRoom(selectedRoom), true);
  assert.equal(s.g.effectiveRoom, selectedRoom);
  assert.equal(s.g.save.ammoCarrier.active.refundAmount, 20 * room);
  const ammo = s.d.ammo,
    core = s.d.hunt.expedition.points,
    spent = s.d.hunt.economy.spentAmmo;
  const same = ++shot;
  hit(s, same);
  hit(s, same);
  hit(s, same);
  assert.equal(s.carrier().hitsLeft, 2, 'same root shot only damages once');
  s.reload();
  assert.equal(
    s.g.save.room,
    selectedRoom,
    'reload preserves player multiplier',
  );
  assert.equal(s.g.effectiveRoom, selectedRoom);
  assert.equal(s.g.save.ammoCarrier.active.refundAmount, 20 * room);
  assert.equal(s.carrier().hitsLeft, 2);
  hit(s, same);
  assert.equal(s.carrier().hitsLeft, 2, 'dedup survives reload');
  hit(s);
  hit(s);
  assert.equal(s.carrier(), undefined);
  assert.equal(s.d.ammo, ammo + 20 * room);
  assert.equal(s.d.hunt.expedition.points, core, 'carrier does not award core');
  assert.equal(s.d.hunt.economy.spentAmmo, spent, 'refund is not spending');
  assert.equal(E.auditEconomy(s.d.hunt.economy).difference, 0);
  const settled = structuredClone(s.d.hunt);
  assert.ok(C.saveHunt(s.d, settled));
  assert.equal(s.d.ammo, ammo + 20 * room, 'repeated commit no duplicate');
  s.reload();
  assert.equal(s.carrier(), undefined);
  assert.equal(s.d.ammo, ammo + 20 * room);
  const rollback = structuredClone(settled);
  rollback.ammoCarrier.rooms[room].claimed = 0;
  assert.equal(C.saveHunt(s.d, rollback), false);
}
console.log(
  'PASS all four multipliers: exact threshold, fixed spawn reward, free multiplier switching, unique hits, atomic refund, reload and replay',
);
{
  const s = setup();
  s.earn(50);
  assert.ok(s.g.selectRoom(5));
  s.earn(99);
  assert.equal(s.carrier(), undefined);
  assert.ok(s.g.selectRoom(1));
  s.earn(50);
  assert.equal(s.g.save.ammoCarrier.active.room, 1);
  assert.equal(s.g.save.ammoCarrier.rooms[5].spent, 495);
  hit(s);
  hit(s);
  hit(s);
  assert.ok(s.g.selectRoom(5));
  s.earn(1);
  assert.equal(s.g.save.ammoCarrier.active.room, 5);
}
{
  const s = setup(100);
  s.earn();
  const core = s.g.save.expedition.points;
  const event = E.reserve(s.g.save.economy, 11, 1, true);
  s.g.grantWeapon('shotgun', event.id);
  s.g.persist();
  assert.ok(s.g.activateWeapon('shotgun'));
  assert.equal(s.g.effectiveRoom, 1, 'cross-multiplier weapon is allowed');
  assert.equal(s.g.save.ammoCarrier.active.refundAmount, 2000);
  const before = s.d.ammo,
    spent = A.carrierSpent(s.g.save.ammoCarrier);
  for (let volley = 0; volley < 3; volley++) {
    s.g.bullets = [];
    assert.ok(s.g.fire());
    const pellets = [...s.g.bullets];
    assert.equal(pellets.length, 7);
    const target = s.carrier();
    for (const b of pellets) s.g.hitTarget(target, b);
    if (volley < 2) assert.equal(s.carrier().hitsLeft, 2 - volley);
  }
  assert.equal(s.d.ammo, before + 2000);
  assert.equal(A.carrierSpent(s.g.save.ammoCarrier), spent);
  assert.equal(s.g.save.expedition.points, core);
  assert.equal(A.carrierQueued(s.g.save.ammoCarrier, 1), 0);
}
console.log(
  'PASS independent room progress and actual 7-pellet free shotgun volleys',
);
{
  const s = setup(100);
  s.earn();
  assert.ok(s.g.selectRoom(1));
  s.g.zombies = [s.carrier()];
  const ammo = s.d.ammo,
    spent = s.d.hunt.economy.spentAmmo;
  for (let i = 0; i < 900 && s.carrier(); i++) {
    const z = s.carrier();
    s.g.press(z.x, z.y);
    s.g.advance(1 / 60);
  }
  s.g.release();
  assert.equal(
    s.carrier(),
    undefined,
    'real moving projectiles must defeat target',
  );
  assert.equal(s.d.hunt.ammoCarrier.rooms[100].claimed, 1);
  assert.equal(s.d.hunt.ammoCarrier.rooms[100].spent, 10000);
  assert.equal(
    s.d.hunt.ammoCarrier.rooms[1].spent,
    s.d.hunt.economy.spentAmmo - spent,
    'finishing shots accrue progress at the selected multiplier',
  );
  assert.equal(
    s.d.ammo,
    ammo - (s.d.hunt.economy.spentAmmo - spent) + 2000,
    'real shot debits and refund commit together',
  );
}
{
  const s = setup();
  s.earn(300);
  const before = s.d.ammo;
  for (let i = 0; i < 3; i++) {
    assert.ok(s.carrier());
    hit(s);
    hit(s);
    hit(s);
    s.g.advance(0.016);
    s.reload();
  }
  assert.equal(s.carrier(), undefined);
  assert.equal(s.d.ammo, before + 60);
  assert.equal(s.g.save.ammoCarrier.serial, 3);
}
console.log(
  'PASS moving bullet collision, paid-shot refund balance and queued consecutive claims',
);
{
  const s = setup();
  s.earn();
  const z = s.carrier();
  s.g.spawn(5, true);
  const explosive = s.g.zombies.find((x) => x.kind === 5);
  assert.ok(explosive);
  explosive.x = z.x + 5;
  explosive.y = z.y;
  s.g.kill(explosive, {
    id: ++shot,
    shotId: shot,
    room: 1,
    bonus: false,
    vx: 0,
    vy: -800,
  });
  assert.equal(
    z.hitsLeft,
    2,
    'one explosion three damage attempts is one carrier hit',
  );
  s.d.ammo = 0;
  s.g.release();
  s.g.zombies = [z];
  s.g.bullets = [];
  s.g.pendingBullets = [];
  for (let i = 0; i < 3600; i++) s.g.advance(1 / 60);
  assert.ok(s.carrier(), 'carrier remains past ordinary 55 second despawn');
  assert.ok(z.x >= 70 && z.x <= 530 && z.y >= 180 && z.y <= 510);
  s.reload();
  assert.equal(s.carrier().hitsLeft, 2);
  s.g.save.expedition.points = 10000;
  assert.equal(s.g.startTransition(), false);
  const pos = [s.carrier().x, s.carrier().y];
  s.g.paused = true;
  s.g.advance(1);
  assert.deepEqual([s.carrier().x, s.carrier().y], pos);
}
{
  const s = setup();
  s.g.save.courier.active = {
    armorHits: 0,
    bodyHits: 0,
    x: 300,
    y: 345,
    bundle: 1,
  };
  s.earn();
  assert.equal(s.carrier(), undefined);
  assert.equal(A.carrierQueued(s.g.save.ammoCarrier, 1), 1);
  s.g.save.courier.active = null;
  s.g.zombies = s.g.zombies.filter((z) => z.kind !== 9);
  s.g.advance(0.016);
  assert.ok(s.carrier());
  s.g.save.courier.queued = 1;
  s.g.advance(0.016);
  assert.equal(s.g.save.courier.active, null, 'courier waits for carrier');
}
console.log(
  'PASS chain dedup, no-timeout persistence, empty ammo, pause and encounter scheduling',
);
{
  const d = C.freshCampaign();
  delete d.hunt.ammoCarrier;
  delete d.hunt.economy.ammoReturnFunding;
  d.hunt.economy.spentAmmo = 5000;
  const parsed = C.parseCampaign(JSON.stringify(d));
  assert.equal(A.carrierSpent(parsed.hunt.ammoCarrier), 0);
  assert.equal(
    A.carrierQueued(parsed.hunt.ammoCarrier, 1),
    0,
    'no retroactive old-save grants',
  );
  const e = E.freshEconomy();
  for (let i = 0; i < 100; i++) E.receipt(e, 1);
  assert.equal(e.ammoReturnFunding, 20 * E.ECONOMY.ordinaryYield * 2);
  assert.equal(E.auditEconomy(e).difference, 0);
  const budget = e.available + e.ammoReturnFunding;
  assert.equal(budget, 100 * E.ECONOMY.ordinaryYield);
  assert.equal(
    E.auditEconomy(E.parseEconomy(JSON.parse(JSON.stringify(e)))).difference,
    0,
  );
}
console.log(
  'PASS migration and conserved event/core-equivalent ammunition budget',
);
{
  const s = setup(100);
  s.earn();
  assert.ok(s.g.selectRoom(1));
  const legacy = structuredClone(s.d);
  delete legacy.hunt.ammoCarrier.active.refundAmount;
  const restored = C.parseCampaign(JSON.stringify(legacy));
  assert.equal(restored.hunt.ammoCarrier.active.refundAmount, 2000);
  assert.equal(restored.hunt.room, 1);
  const forged = structuredClone(s.d.hunt);
  forged.ammoCarrier.active.refundAmount = 200000;
  const before = s.d.ammo;
  assert.equal(C.saveHunt(s.d, forged), false, 'cannot rewrite active reward');
  assert.equal(s.d.ammo, before);
  s.reload();
  assert.equal(s.g.save.ammoCarrier.active.refundAmount, 2000);
  assert.equal(s.g.effectiveRoom, 1);
  hit(s);
  hit(s);
  hit(s);
  assert.equal(s.d.ammo, before + 2000);
  assert.equal(
    s.g.effects.findLast((fx) => fx.kind === 'ammoReturn')?.points,
    2000,
    'reward flight displays the stored amount',
  );
}
console.log('PASS legacy active reward migration and immutable reward commits');
const manifest = JSON.parse(
  await readFile('public/assets/hunt/zombies-v3/manifest.json', 'utf8'),
);
assert.equal(Object.keys(manifest.kinds).length, 13);
const a = manifest.archetypes.ammoCarrier;
const { data, info } = await sharp(
  'public/assets/hunt/ammo-carrier-v1/carrier.png',
)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
assert.equal(info.width, 3200);
assert.equal(info.height, 1600);
const tile = (frame) => {
  const b = Buffer.alloc(320 * 320 * 4);
  for (let y = 0; y < 320; y++)
    data.copy(
      b,
      y * 320 * 4,
      ((Math.floor(frame / 10) * 320 + y) * info.width + (frame % 10) * 320) *
        4,
      ((Math.floor(frame / 10) * 320 + y) * info.width +
        (frame % 10) * 320 +
        320) *
        4,
    );
  return b;
};
for (let row = 0; row < 5; row++) {
  for (let col = 0; col < 10; col++) {
    const t = tile(row * 10 + col);
    let count = 0;
    for (let y = 0; y < 320; y++)
      for (let x = 0; x < 320; x++) {
        const alpha = t[(y * 320 + x) * 4 + 3];
        count += alpha > 0;
        if (x < 4 || x >= 316 || y < 4 || y >= 316)
          assert.equal(alpha, 0, 'transparent margins');
      }
    assert.ok(count > 1500);
  }
  for (const c of [5, 6])
    assert.deepEqual(
      tile(row * 10 + 4).subarray(194 * 320 * 4),
      tile(row * 10 + c).subarray(194 * 320 * 4),
    );
  assert.notDeepEqual(
    tile(row * 10),
    tile(row * 10 + 2),
    'alternating walk poses',
  );
}
const calls = [],
  scales = [];
const renderer = Object.create(HuntView.prototype);
renderer.ctx = new Proxy(
  {
    drawImage: (...args) => calls.push(args),
    scale: (...args) => scales.push(args),
    createRadialGradient: () => ({ addColorStop() {} }),
  },
  { get: (o, k) => (k in o ? o[k] : () => {}) },
);
renderer.zombieClocks = new Map();
renderer.art = {
  zombieAnimation: { manifest, sheets: { ammoCarrier: { id: 'carrier' } } },
};
renderer.game = setup().g;
const dirs = [
  ['S', 0, 18, 0, false],
  ['SE', 12, 12, 1, false],
  ['E', 18, 0, 2, false],
  ['NE', 12, -12, 3, false],
  ['N', 0, -18, 4, false],
  ['NW', -12, -12, 3, true],
  ['W', -18, 0, 2, true],
  ['SW', -12, 12, 1, true],
];
for (const [facing, vx, vy, row, mirror] of dirs) {
  const z = {
    id: 99,
    kind: 12,
    x: 200,
    y: 300,
    age: 0,
    seed: 0,
    hit: 0,
    frozen: 0,
    vx,
    vy,
  };
  renderer.zombieClocks.clear();
  calls.length = 0;
  scales.length = 0;
  assert.ok(renderer.animatedZombie(z, 86));
  let c = calls.at(-1);
  assert.equal(c[1] / 320 + (c[2] / 320) * 10, row * 10);
  assert.equal(
    scales.some((s) => s[0] === -1),
    mirror,
  );
  z.hit = 0.06;
  z.age = 0.1;
  renderer.animatedZombie(z, 86);
  c = calls.at(-1);
  assert.equal(c[1] / 320 + (c[2] / 320) * 10, row * 10 + 5);
  z.hit = 0;
  z.age = 0.2;
  renderer.animatedZombie(z, 86);
  z.frozen = 1;
  const before = renderer.zombieClocks.get(99).walk;
  z.age = 0.3;
  renderer.animatedZombie(z, 86);
  assert.equal(renderer.zombieClocks.get(99).walk, before);
  for (const age of [0.05, 0.25, 0.6, 1.4]) {
    calls.length = 0;
    renderer.effect({
      id: 1,
      kind: 'ammoReturn',
      species: 12,
      x: 200,
      y: 300,
      age,
      life: 1.5,
      points: 20,
      seed: 0,
      angle: 0,
      facing,
    });
    c = calls.at(-1);
    assert.equal(
      c[1] / 320 + (c[2] / 320) * 10,
      row * 10 + (age < 0.16 ? 7 : age < 0.36 ? 8 : 9),
    );
  }
}
console.log(
  'PASS 50 alpha-safe frames, fixed legs/hands, 8-direction production renderer, hit, freeze and non-looping death',
);

import assert from 'node:assert/strict';
import { build } from 'esbuild';

await build({
  stdin: {
    contents:
      "export { HuntGame } from './hunt/simulation'; export * from './lib/hunt-economy'; export * from './lib/hunt-population'; export { carrierQueued } from './lib/ammo-carrier';",
    resolveDir: process.cwd(),
    loader: 'ts',
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: '.test-cache/hunt-special-population.mjs',
});
const {
  HuntGame,
  receipt,
  reserve,
  auditEconomy,
  specialPopulation,
  specialSpawnBlock,
  specialZombie,
  carrierQueued,
} = await import('../.test-cache/hunt-special-population.mjs');
const io = { ammo: () => 1000000, spend: () => true, save: () => {} };
function game() {
  const g = new HuntGame(io, undefined, () => 0.5);
  g.save.expedition.stage = 2;
  receipt(g.save.economy, 100000);
  return g;
}
function fill(g) {
  for (const kind of [6, 6, 5, 5, 8]) g.spawn(kind);
  assert.equal(specialPopulation(g.zombies).special, 5);
}
function depart(g, kind) {
  const index = g.zombies.findIndex((z) => z.kind === kind);
  assert.ok(index >= 0);
  g.zombies.splice(index, 1);
  g.settleEvents();
}

const g = game();
g.spawn(6);
g.spawn(6);
const funds = g.save.economy.available,
  serial = g.save.economy.serial;
g.spawn(6);
assert.equal(g.zombies.filter((z) => z.kind === 6).length, 2);
assert.equal(g.save.economy.available, funds);
assert.equal(
  g.save.economy.serial,
  serial,
  'blocked spawn never reserves an event',
);
g.save.economy.nextKind = 6;
g.save.economy.nextInterludes = 1;
g.checkRewards(1);
assert.equal(
  g.save.economy.nextKind,
  6,
  'same-kind cap does not redraw the candidate',
);
assert.equal(g.save.economy.nextInterludes, 1);
assert.equal(g.save.economy.available, funds);

const ratio = game();
ratio.zombies = ratio.zombies.slice(0, 6);
ratio.spawn(6);
ratio.spawn(5);
assert.equal(specialPopulation(ratio.zombies).ratio, 0.25);
assert.equal(specialSpawnBlock(ratio.zombies, 8), 'ratio');
const ratioBudget = ratio.save.economy.available;
ratio.spawn(8);
assert.equal(ratio.save.economy.available, ratioBudget);
for (let i = 0; i < 3; i++) ratio.spawn(0);
ratio.spawn(8);
assert.equal(specialPopulation(ratio.zombies).ratio, 0.25);
assert.ok(
  ratio.zombies.every((z) => z.entry),
  'offscreen entrants count toward capacity',
);

const full = game();
fill(full);
for (let i = 0; i < 30; i++) full.spawn(0);
full.save.economy.nextKind = 11;
const before = structuredClone(full.save.economy);
full.checkRewards(1);
full.spawn(7);
assert.equal(
  specialPopulation(full.zombies).special,
  5,
  'hard cap survives a large ordinary crowd',
);
assert.equal(full.save.economy.nextKind, 11);
assert.equal(full.save.economy.available, before.available);
assert.equal(full.save.economy.serial, before.serial);
assert.deepEqual(full.save.economy.events, before.events);
assert.equal(auditEconomy(full.save.economy).difference, 0);
depart(full, 8);
full.checkRewards(1);
assert.equal(
  full.zombies.filter((z) => z.kind === 11).length,
  1,
  'waiting candidate admits when a slot opens',
);
assert.equal(full.save.economy.nextKind, null);
assert.equal(full.save.economy.serial, before.serial + 1);
assert.equal(auditEconomy(full.save.economy).difference, 0);

const courier = game();
fill(courier);
courier.save.courier.queued = 1;
courier.ensureCourier();
assert.equal(courier.save.courier.queued, 1);
assert.equal(courier.save.courier.active, null);
depart(courier, 8);
courier.ensureCourier();
courier.ensureCourier();
assert.equal(courier.save.courier.queued, 0);
assert.equal(courier.zombies.filter((z) => z.kind === 9).length, 1);
assert.equal(specialPopulation(courier.zombies).special, 5);

const carrier = game();
fill(carrier);
carrier.save.ammoCarrier.rooms[1].spent = 100;
carrier.ensureAmmoCarrier();
assert.equal(carrierQueued(carrier.save.ammoCarrier, 1), 1);
assert.equal(carrier.save.ammoCarrier.active, null);
assert.equal(carrier.save.ammoCarrier.serial, 0);
depart(carrier, 8);
carrier.ensureAmmoCarrier();
carrier.ensureAmmoCarrier();
assert.equal(carrier.zombies.filter((z) => z.kind === 12).length, 1);
assert.equal(carrier.save.ammoCarrier.serial, 1);
assert.equal(carrier.save.ammoCarrier.active.refundAmount, 20);
assert.equal(carrierQueued(carrier.save.ammoCarrier, 1), 0);

const bonus = game();
bonus.spawn(4);
const target = bonus.zombies.find((z) => z.kind === 4);
const initialOrdinary = specialPopulation(bonus.zombies).ordinary;
bonus.kill(target, { room: 1, bonus: false, vx: 0, vy: -1 });
assert.ok(bonus.save.bonus);
assert.equal(specialPopulation(bonus.zombies).ordinary, initialOrdinary + 8);
assert.ok(
  bonus.zombies
    .filter((z) => z.id > target.id)
    .every((z) => !specialZombie(z.kind)),
);
assert.equal(auditEconomy(bonus.save.economy).difference, 0);

// Construct a real funded old save with thirty scatter actors. Restoring must
// retain every reservation, never erase earned targets to enforce a new cap.
const old = game();
old.zombies = [];
for (let i = 0; i < 30; i++) {
  const event = reserve(old.save.economy, 6, 1);
  old.zombies.push({
    id: 1000 + i,
    kind: 6,
    x: 300,
    y: 300,
    vx: 1,
    vy: 0,
    age: 10,
    hit: 0,
    seed: 0.5,
    hitsLeft: 6,
    eventId: event.id,
  });
}
old.save.economy.nextKind = 11;
old.persist();
const oldFunds = old.save.economy.available;
const restored = new HuntGame(io, old.save, () => 0.5);
assert.equal(specialPopulation(restored.zombies).special, 30);
assert.equal(restored.save.economy.available, oldFunds);
assert.equal(Object.keys(restored.save.economy.events).length, 30);
restored.active = true;
restored.spawnClock = 0;
restored.advance(0.06);
assert.equal(
  specialPopulation(restored.zombies).ordinary,
  1,
  'ordinary refill bypasses the old crowded total',
);
assert.equal(
  specialPopulation(restored.zombies).special,
  30,
  'existing targets do not disappear',
);
assert.equal(restored.save.economy.nextKind, 11);
assert.equal(restored.save.economy.available, oldFunds);
for (const z of restored.zombies) if (z.kind === 6) z.age = 54.99;
restored.advance(0.06);
assert.equal(
  specialPopulation(restored.zombies).special,
  0,
  'old targets leave through their existing lifetime',
);
assert.equal(Object.keys(restored.save.economy.events).length, 0);
assert.equal(
  auditEconomy(restored.save.economy).difference,
  0,
  'unused legacy reservations refund exactly once',
);

const existingCourier = structuredClone(old.save);
existingCourier.courier.active = {
  armorHits: 7,
  bodyHits: 0,
  x: 300,
  y: 345,
  bundle: 1,
};
existingCourier.courier.queued = 2;
const activeRestored = new HuntGame(io, existingCourier, () => 0.5);
assert.equal(activeRestored.zombies.filter((z) => z.kind === 9).length, 1);
assert.equal(activeRestored.save.courier.active.armorHits, 7);
assert.equal(
  activeRestored.save.courier.queued,
  2,
  'restoring an active claim is not a new admission',
);
activeRestored.ensureCourier();
assert.equal(activeRestored.zombies.filter((z) => z.kind === 9).length, 1);

const existingCarrier = structuredClone(old.save);
existingCarrier.ammoCarrier.rooms[1].spent = 100;
existingCarrier.ammoCarrier.serial = 1;
existingCarrier.ammoCarrier.active = {
  serial: 1,
  room: 1,
  refundAmount: 20,
  hits: [8001],
  x: 100,
  y: 310,
  vx: 16,
  vy: 8,
};
const carrierRestored = new HuntGame(io, existingCarrier, () => 0.5);
carrierRestored.ensureAmmoCarrier();
assert.equal(carrierRestored.zombies.filter((z) => z.kind === 12).length, 1);
assert.equal(carrierRestored.save.ammoCarrier.serial, 1);
assert.deepEqual(carrierRestored.save.ammoCarrier.active.hits, [8001]);
assert.equal(carrierRestored.save.ammoCarrier.active.refundAmount, 20);
assert.equal(auditEconomy(carrierRestored.save.economy).difference, 0);

console.log(
  'PASS special admission ratio/hard/per-kind caps, funded candidate preservation, queued rewards, bonus ordinary refill, legacy crowd convergence and conservation',
);

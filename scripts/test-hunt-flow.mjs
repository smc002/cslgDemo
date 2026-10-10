import assert from 'node:assert/strict';
import { build } from 'esbuild';
await build({
  entryPoints: [
    'hunt/simulation.ts',
    'hunt/arrival-vfx.ts',
    'lib/hunt-save.ts',
  ],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outbase: '.',
  outdir: '.test-cache/hunt-flow',
});
const { HuntGame, SPAWN_WEIGHTS, COURIER_KIND, STAGES } =
  await import('../.test-cache/hunt-flow/hunt/simulation.js');
const { huntArrivalFrame, arrivalCamera, HUNT_ARRIVAL_SECONDS } =
  await import('../.test-cache/hunt-flow/hunt/arrival-vfx.js');
const { freshHunt, prepareHuntEconomy } =
  await import('../.test-cache/hunt-flow/lib/hunt-save.js');
let spent = 0,
  saved;
const g = new HuntGame(
  {
    ammo: () => 10000,
    spend: (n) => {
      spent += n;
      return true;
    },
    save: (h) => {
      saved = structuredClone(h);
    },
  },
  freshHunt(),
  () => 0.5,
);
g.active = true;
assert.ok(g.beginFirstEntry());
g.press(300, 250);
assert.equal(g.fire(), false);
const actors = structuredClone(g.zombies);
for (let i = 0; i < 20; i++) g.advance(0.05);
assert.deepEqual(
  g.zombies,
  actors,
  'entry must not silently move or reward targets',
);
assert.equal(spent, 0);
assert.equal(
  huntArrivalFrame(0.5).zoom,
  huntArrivalFrame(1.8).zoom,
  'drive finishes before zoom',
);
assert.equal(huntArrivalFrame(2.7).vehicleOffset, 0);
assert.ok(huntArrivalFrame(3.6).zoom > huntArrivalFrame(2.7).zoom);
for (const height of [500, 800, 1000, 1200]) {
  const end = arrivalCamera(HUNT_ARRIVAL_SECONDS, height);
  assert.equal(end.zoom, 1);
  assert.equal(end.translateX, 0);
  assert.equal(end.translateY, 0, 'camera joins the live arena with no position jump');
  const far = arrivalCamera(0, height);
  const groundHeight = Math.max(900, height);
  const top = 800 - (height + groundHeight) / 2 - groundHeight * 0.24;
  assert.ok(top * far.zoom + far.translateY <= 800 - height + 1e-8);
  assert.ok((top + groundHeight * 2) * far.zoom + far.translateY >= 800 - 1e-8,
    'overview covers tall and short screens without empty bands');
}
g.paused = true;
const at = g.arrivalAge;
g.advance(0.05);
assert.equal(g.arrivalAge, at);
g.paused = false;
for (let i = 0; i < Math.ceil(HUNT_ARRIVAL_SECONDS / 0.05); i++) g.advance(0.05);
assert.equal(g.arrivalAge, null);
assert.ok(saved.arrivalSeen);
const restored = new HuntGame(
  { ammo: () => 10000, spend: () => true, save: () => {} },
  saved,
);
assert.equal(
  restored.beginFirstEntry(),
  false,
  'completed first visit cannot replay after reload',
);
const old = freshHunt();
delete old.arrivalSeen;
old.economy.spentAmmo = 5;
prepareHuntEconomy(old);
assert.equal(old.arrivalSeen, true);
g.save.courier.completed = 1;
g.save.courier.reveal = { serial: 1, tickets: 10 };
g.courierVictory = { x: 300, y: 300, age: 0, duration: 3.2 };
g.press(300, 200);
assert.ok(g.firing);
assert.ok(g.fire(), 'ticket reward must not block shots');
const fired = g.fired;
for (let i = 0; i < 10; i++) g.advance(0.05);
assert.ok(g.fired > fired, 'held fire continues through the jackpot');
g.dismissCourierReward(true);
assert.ok(g.firing, 'background acknowledgment preserves held fire');
assert.equal(g.save.courier.lastReward.tickets, 10);
assert.deepEqual(SPAWN_WEIGHTS, [70, 20, 7, 3]);
console.log(
  'PASS first-entry drive/zoom, pause, no spending, persisted once-only playback, legacy migration, non-blocking ticket rewards, ordinary composition',
);

// Reaching a sector threshold is optional navigation, not a combat/spawn pause.
const waitingSave = freshHunt();
waitingSave.arrivalSeen = true;
waitingSave.expedition.points = STAGES[1].need;
const waiting = new HuntGame(
  { ammo: () => 10000, spend: () => true, save: () => {} },
  waitingSave,
  () => 0.5,
);
waiting.active = true;
assert.ok(waiting.sceneReady, 'player can choose to leave but has not done so');
assert.equal(waiting.save.ammoCarrier.active, null);
waiting.save.courier.queued = 1;
waiting.advance(0.05);
assert.ok(
  waiting.zombies.some((z) => z.kind === COURIER_KIND),
  'queued courier enters while the player keeps fighting in the current sector',
);
assert.equal(waiting.save.courier.queued, 0);
assert.ok(waiting.save.courier.active);
assert.equal(waiting.save.expedition.transition, null);

const travelling = new HuntGame(
  { ammo: () => 10000, spend: () => true, save: () => {} },
  waitingSave,
  () => 0.5,
);
travelling.active = true;
assert.ok(travelling.startTransition());
travelling.save.courier.queued = 1;
for (let i = 0; i < 20; i++) travelling.advance(0.05);
assert.ok(travelling.save.expedition.transition);
assert.equal(travelling.save.courier.active, null);
assert.equal(
  travelling.save.courier.queued,
  1,
  'actual transition retains pending courier',
);
assert.ok(
  !travelling.zombies.some((z) => z.kind === COURIER_KIND),
  'courier cannot enter during actual sector travel',
);
console.log(
  'PASS queued courier spawns at optional sector threshold, stays queued during actual transition',
);

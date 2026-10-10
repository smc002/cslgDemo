import assert from 'node:assert/strict';
import { build } from 'esbuild';
await build({
  entryPoints: ['hunt/reward-vfx.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: '.test-cache/reward-vfx.js',
});
const { drawSpecialBurst, drawCoreFlight, drawJackpot } =
  await import('../.test-cache/reward-vfx.js');
const image = { complete: true, naturalWidth: 256, naturalHeight: 256 };
function mock() {
  const ops = [],
    stack = [];
  const state = { globalAlpha: 0.7, font: '12px sans-serif' };
  const c = new Proxy(state, {
    get(o, k) {
      if (k in o) return o[k];
      if (k === 'save')
        return () => {
          stack.push({ ...state });
          ops.push(['save']);
        };
      if (k === 'restore')
        return () => {
          assert.ok(stack.length);
          Object.assign(state, stack.pop());
          ops.push(['restore']);
        };
      if (k === 'measureText')
        return (text) => ({
          width:
            String(text).length *
            parseFloat(state.font.match(/[\d.]+px/)?.[0] || '12'),
        });
      if (k === 'createRadialGradient' || k === 'createLinearGradient')
        return (...args) => {
          assert.ok(args.every(Number.isFinite));
          return { addColorStop() {} };
        };
      return (...args) => {
        for (const arg of args)
          if (typeof arg === 'number')
            assert.ok(Number.isFinite(arg), `${String(k)} bad arg`);
        ops.push([k, ...args]);
      };
    },
    set(o, k, v) {
      if (k === 'globalAlpha')
        assert.ok(Number.isFinite(v) && v >= 0 && v <= 1);
      o[k] = v;
      return true;
    },
  });
  return {
    c,
    ops,
    check() {
      assert.equal(stack.length, 0);
      assert.equal(state.globalAlpha, 0.7);
    },
  };
}
const art = { core: image, ticket: image, jackpotPlaque: image };
for (const a of [{}, art])
  for (const age of [
    -1, 0, 0.05, 0.16, 0.42, 0.6, 0.9, 1.1, 1.2, 2, 3, 3.2, 5,
  ]) {
    const m = mock();
    drawSpecialBurst(m.c, a, 20, 700, age, 42, 0.7);
    drawCoreFlight(m.c, a, 20, 700, 300, 0, age, true, 42);
    drawJackpot(m.c, a, {
      x: 20,
      y: 700,
      age,
      duration: 3.2,
      tickets: 1234567890,
      scale: 0.7,
    });
    m.check();
  }
let m = mock();
drawSpecialBurst(m.c, art, 300, 200, 0.6, 42);
assert.equal(m.ops.filter((x) => x[0] === 'drawImage').length, 6);
m.check();
m = mock();
drawCoreFlight(m.c, art, 300, 300, 300, 0, 0.6, false, 42);
assert.equal(m.ops.filter((x) => x[0] === 'drawImage').length, 3);
m.check();
m = mock();
drawCoreFlight(m.c, art, 300, 300, 300, 0, 0.6, true, 42);
assert.equal(m.ops.filter((x) => x[0] === 'drawImage').length, 5);
m.check();
m = mock();
drawJackpot(m.c, art, {
  x: 300,
  y: 300,
  age: 0.8,
  duration: 3.2,
  tickets: 20,
  scale: 1,
});
assert.equal(m.ops.filter((x) => x[0] === 'drawImage').length, 11);
assert.ok(m.ops.some((x) => x[0] === 'fillText' && x[1] === '招募券 ×20'));
assert.ok(
  m.ops.some((x) => x[0] === 'fillText' && x[1] === '可进行2次十连招募'),
);
m.check();
const n = mock();
drawJackpot(n.c, art, {
  x: 300,
  y: 300,
  age: 0.8,
  duration: 3.2,
  tickets: 20,
  scale: 1,
});
assert.deepEqual(m.ops, n.ops);
console.log(
  'PASS reward VFX: bounded counts, deterministic clocks, fallback/art paths, finite geometry, balanced canvas state, real payout text',
);

// Replay Canvas transforms to check the actual drawn sprite corners, not formulas.
function imageBounds(ops) {
  const stack = [],
    bounds = [];
  let matrix = [1, 0, 0, 1, 0, 0];
  for (const [op, ...args] of ops) {
    const [a, b, c, d, e, f] = matrix;
    if (op === 'save') stack.push([...matrix]);
    else if (op === 'restore') matrix = stack.pop();
    else if (op === 'translate')
      matrix = [
        a,
        b,
        c,
        d,
        e + a * args[0] + c * args[1],
        f + b * args[0] + d * args[1],
      ];
    else if (op === 'scale')
      matrix = [a * args[0], b * args[0], c * args[1], d * args[1], e, f];
    else if (op === 'rotate') {
      const cos = Math.cos(args[0]),
        sin = Math.sin(args[0]);
      matrix = [
        a * cos + c * sin,
        b * cos + d * sin,
        c * cos - a * sin,
        d * cos - b * sin,
        e,
        f,
      ];
    } else if (op === 'drawImage') {
      const [image, x, y, w, h] = args;
      const corners = [
        [x, y],
        [x + w, y],
        [x, y + h],
        [x + w, y + h],
      ].map(([px, py]) => [a * px + c * py + e, b * px + d * py + f]);
      bounds.push({ image, top: Math.min(...corners.map((p) => p[1])) });
    }
  }
  return bounds;
}
for (const visibleTop of [0, 186, 240]) {
  for (const age of [0.45, 0.65, 0.8, 1.1, 1.5]) {
    const ticket = { complete: true, naturalWidth: 256, naturalHeight: 320 };
    const plaque = { complete: true, naturalWidth: 800, naturalHeight: 220 };
    const frame = mock();
    drawJackpot(
      frame.c,
      { ticket, jackpotPlaque: plaque },
      {
        x: 300,
        y: visibleTop + 1,
        age,
        duration: 3.2,
        tickets: 10,
        scale: 1,
        visibleTop,
      },
    );
    const bounds = imageBounds(frame.ops);
    assert.ok(bounds.some((b) => b.image === plaque));
    for (const box of bounds)
      assert.ok(
        box.top >= visibleTop,
        `${box.image === ticket ? 'ticket' : 'plaque'} clips at top ${visibleTop}, age ${age}: ${box.top}`,
      );
    frame.check();
  }
}
console.log(
  'PASS jackpot stays inside short viewport: plaque pop, rotated fan tickets and collection arc',
);

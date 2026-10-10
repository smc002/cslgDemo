import type { EconomyActor } from '../lib/hunt-economy';

// Independent from combat RNG: steering never changes hit/reward rolls.
const noise = (z: EconomyActor, salt: number) => {
  const n = Math.sin(z.id * 127.1 + z.seed * 311.7 + salt * 74.7) * 43758.5453;
  return n - Math.floor(n);
};
export function preparePatrol(z: EconomyActor, baseSpeed: number) {
  if (!z.patrol || !Object.values(z.patrol).every(Number.isFinite)) {
    z.patrol = {
      speed: baseSpeed * (0.86 + noise(z, 1) * 0.28),
      heading: Math.atan2(z.vy, z.vx),
      turnAt: z.age + 2.4 + noise(z, 2) * 3.4,
      turns: 0,
    };
  }
  return z.patrol;
}
export function patrolSpeed(z: EconomyActor, baseSpeed: number) {
  const p = preparePatrol(z, baseSpeed);
  return (
    p.speed * (1 + 0.04 * Math.sin(z.age * 0.7 + noise(z, 3) * Math.PI * 2))
  );
}

/** Smooth independent turns and local separation, without pushing/teleporting actors. */
export function steerPatrol(
  z: EconomyActor,
  neighbours: EconomyActor[],
  dt: number,
  baseSpeed: number,
  radius: (actor: EconomyActor) => number,
) {
  const p = preparePatrol(z, baseSpeed);
  if (z.age >= p.turnAt) {
    p.turns++;
    p.heading += (noise(z, 10 + p.turns * 2) - 0.5) * 2.6;
    p.turnAt = z.age + 2.4 + noise(z, 11 + p.turns * 2) * 3.4;
  }
  let x = Math.cos(p.heading),
    y = Math.sin(p.heading);
  for (const other of neighbours) {
    if (other.id === z.id || other.entry) continue;
    let dx = z.x - other.x,
      dy = z.y - other.y;
    const distance = Math.hypot(dx, dy);
    const gap = radius(z) + radius(other) + 24;
    if (distance >= gap) continue;
    if (distance < 0.01) {
      // Deterministic opposite escape directions, even for coincident actors.
      dx = z.id > other.id ? 1 : -1;
      dy = 0;
    }
    const length = Math.hypot(dx, dy);
    const force = 2.4 * (1 - distance / gap);
    x += (dx / length) * force;
    y += (dy / length) * force;
  }
  const current = Math.atan2(z.vy, z.vx);
  const wanted = Math.atan2(y, x);
  const delta = Math.atan2(
    Math.sin(wanted - current),
    Math.cos(wanted - current),
  );
  const angle = current + Math.max(-dt * 1.15, Math.min(dt * 1.15, delta));
  const speed = patrolSpeed(z, baseSpeed);
  z.vx = Math.cos(angle) * speed;
  z.vy = Math.sin(angle) * speed;
}

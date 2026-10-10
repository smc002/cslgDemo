import manifest from '../shared/ammo-return-data.json';
import type { FX } from './simulation';
import { drawBodyDeath, type BodyDeathArt } from './body-death-vfx';
import { TOY_SCALE } from '../shared/toy-art';

export const AMMO_RETURN_ROOT = '/assets/hunt/ammo-return-v1/';
export const AMMO_RETURN_SECONDS = 2.1;
export const AMMO_DEATH_HOLD = 0.5;
export const AMMO_FLIGHT_START = 0.18;
export const AMMO_FLIGHT_STAGGER = 0.035;
export const AMMO_FLIGHT_DURATION = 0.3;
export const AMMO_PARTICLES = 8;
export const AMMO_FIRST_BATCH = 3;
const SECOND_FLIGHT_START = 0.54;
const SECOND_FLIGHT_STAGGER = 0.07;
const SECOND_FLIGHT_DURATION = 0.43;

/** Both rendering and HUD feedback use this simulation-clock schedule. */
export function ammoFlightTiming(index: number) {
  const firstBatch = index < AMMO_FIRST_BATCH;
  const start = firstBatch
    ? AMMO_FLIGHT_START + index * AMMO_FLIGHT_STAGGER
    : SECOND_FLIGHT_START + (index - AMMO_FIRST_BATCH) * SECOND_FLIGHT_STAGGER;
  const duration = firstBatch ? AMMO_FLIGHT_DURATION : SECOND_FLIGHT_DURATION;
  return { start, duration, arrival: start + duration };
}

export const AMMO_FINAL_ARRIVAL = ammoFlightTiming(AMMO_PARTICLES - 1).arrival;

/** Visual feedback only: never credits ammunition or advances the effect clock. */
export function ammoArrivalPulse(age: number) {
  let pulse = 0;
  for (let i = 0; i < AMMO_PARTICLES; i++) {
    const elapsed = age - ammoFlightTiming(i).arrival;
    const finalParticle = i === AMMO_PARTICLES - 1;
    const duration = finalParticle ? 0.3 : 0.16;
    if (elapsed >= 0 && elapsed < duration) {
      const strength = finalParticle ? 1 : 0.65;
      pulse = Math.max(pulse, strength * (1 - elapsed / duration) ** 2);
    }
  }
  return pulse;
}
export type AmmoReturnArt = {
  frames: HTMLImageElement[];
  props: HTMLImageElement[];
};
const clamp = (t: number) => Math.max(0, Math.min(1, t));

export async function loadAmmoReturnArt(
  load: (url: string) => Promise<HTMLImageElement>,
): Promise<AmmoReturnArt> {
  const [frames, props] = await Promise.all([
    Promise.all(manifest.frames.map((name) => load(AMMO_RETURN_ROOT + name))),
    Promise.all(manifest.props.map((name) => load(AMMO_RETURN_ROOT + name))),
  ]);
  return { frames, props };
}

function sprite(
  c: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  angle = 0,
) {
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  c.drawImage(
    image,
    -width / 2,
    (-width * image.height) / image.width / 2,
    width,
    (width * image.height) / image.width,
  );
  c.restore();
}

export function drawAmmoDeath(
  c: CanvasRenderingContext2D,
  art: AmmoReturnArt,
  e: FX,
  scale: number,
  bodyHeight: number,
  bodyDeaths?: BodyDeathArt,
) {
  const age = e.age;
  if (
    age >= AMMO_DEATH_HOLD &&
    bodyDeaths &&
    drawBodyDeath(
      c,
      bodyDeaths,
      12,
      e.x,
      e.y,
      age - AMMO_DEATH_HOLD,
      bodyHeight / (1.12 * TOY_SCALE),
      scale,
      e.facing?.includes('W'),
      TOY_SCALE,
    )
  )
    return;
  // Only the actor pauses. Particles keep using the unmodified effect clock.
  const poseAge = Math.max(0, age - AMMO_DEATH_HOLD);
  c.save();
  c.translate(e.x, e.y);
  c.scale(scale, scale);
  // A local contrast pool separates the held body from the crowd; no full-screen flash.
  if (age < 1.1) {
    c.save();
    c.globalAlpha *= Math.min(1, (1.1 - age) / 0.3);
    const pool = c.createRadialGradient(0, -45, 24, 0, -45, 125);
    pool.addColorStop(0, '#08121bcb');
    pool.addColorStop(0.58, '#101c2488');
    pool.addColorStop(1, '#101c2400');
    c.fillStyle = pool;
    c.fillRect(-125, -170, 250, 250);
    c.strokeStyle = '#f8d878';
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(0, 28, 55, 18, 0, 0, Math.PI * 2);
    c.stroke();
    c.restore();
  }
  // Four authored poses, fixed ground anchor, short overlap hides pose cuts.
  const times = [0, 0.12, 0.28, 0.48];
  const frame = times.findLastIndex((time) => poseAge >= time);
  const fade = 1 - clamp((poseAge - 0.65) / 0.42);
  const emphasis = 1.18 - 0.18 * clamp(poseAge / 0.24);
  const imageScale = (bodyHeight / manifest.bodyHeight) * emphasis;
  const drawFrame = (index: number, opacity: number) => {
    c.save();
    c.globalAlpha *= fade * opacity;
    if (e.facing?.includes('W')) c.scale(-1, 1);
    if (age < AMMO_DEATH_HOLD) {
      c.filter =
        'drop-shadow(0px 0px 2px #fffde4) drop-shadow(0px 0px 4px #ffe26c) drop-shadow(0px 0px 8px #f7a51b)';
    }
    c.drawImage(
      art.frames[index],
      -manifest.anchor[0] * imageScale,
      86 * 0.37 - manifest.anchor[1] * imageScale,
      manifest.frameSize * imageScale,
      manifest.frameSize * imageScale,
    );
    c.restore();
  };
  if (frame >= 0 && fade > 0) {
    const blend = frame === 0 ? 1 : clamp((poseAge - times[frame]) / 0.045);
    if (blend < 1) drawFrame(frame - 1, 1 - blend);
    drawFrame(frame, blend);
  }
  if (age >= 0.1 && age < 0.85) {
    const t = (age - 0.1) / 0.75;
    c.save();
    c.globalAlpha = (1 - t) * 0.85;
    c.strokeStyle = '#ffbd35';
    c.lineWidth = 5 * (1 - t) + 1;
    c.beginPath();
    c.ellipse(0, 20, 20 + t * 100, 8 + t * 30, 0, 0, Math.PI * 2);
    c.stroke();
    c.restore();
  }
  // Dust stays low and translucent, leaving the collectible ammunition clear.
  if (poseAge > 0.18 && poseAge < 1.15) {
    const t = clamp((poseAge - 0.18) / 0.97);
    c.save();
    c.globalAlpha = Math.min(0.7, t * 7) * (1 - t);
    for (let i = 0; i < 3; i++)
      sprite(
        c,
        art.props[5],
        (i - 1) * (18 + 32 * t),
        22,
        45 + 45 * t,
        (i - 1) * 0.12,
      );
    c.restore();
  }
  if (age > 0.1 && age < 1.05) {
    const t = age - 0.1;
    c.save();
    c.globalAlpha = 1 - clamp((t - 0.5) / 0.45);
    for (let i = 0; i < 5; i++) {
      const direction = (i - 2) / 2;
      sprite(
        c,
        art.props[i === 0 ? 3 : 4],
        direction * 88 * t,
        -92 - (75 + (i % 2) * 30) * t + 140 * t * t,
        i === 0 ? 33 : 15 + (i % 2) * 5,
        direction * (0.3 + t * 7),
      );
    }
    c.restore();
  }
  if (age < 0.25) {
    c.save();
    c.globalAlpha = 1 - age / 0.25;
    c.translate(-38, -103);
    for (const [radius, color] of [
      [26, '#dc741b'],
      [20, '#ffc33b'],
      [12, '#ffffce'],
    ] as const) {
      c.fillStyle = color;
      c.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = (i * Math.PI) / 8;
        const r = (i % 2 ? 0.3 : 1) * radius * (1 + age);
        if (i) c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        else c.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      c.closePath();
      c.fill();
    }
    c.restore();
  }
  c.restore();
}

/** Ejection -> brief suspension -> curved return. Pure simulation-clock timing. */
export function ammoParticle(
  age: number,
  index: number,
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  scale: number,
) {
  const start = 0.02 + index * 0.008;
  const elapsed = age - start;
  const fan = (index - 3.5) / 3.5;
  const ex = sx + fan * 86 * scale;
  const ey = sy - (38 + (index % 3) * 16) * scale;
  const { start: flightStart, duration, arrival } = ammoFlightTiming(index);
  const progress = age >= arrival ? 1 : clamp((age - flightStart) / duration);
  if (age < flightStart) {
    const u = clamp(elapsed / 0.12);
    return {
      x: sx + (ex - sx) * u,
      y: sy + (ey - sy) * u - Math.sin(u * Math.PI) * 30 * scale,
      angle: fan * (0.25 + u * 0.6),
      alpha: elapsed < 0 ? 0 : 1,
      returning: false,
      progress: 0,
    };
  }
  const u = progress * progress;
  return {
    x: ex + (tx - ex) * u + Math.sin(u * Math.PI) * fan * 42 * scale,
    y: ey + (ty - ey) * u - Math.sin(u * Math.PI) * 70 * scale,
    angle: fan * 0.8 * (1 - u) + u * -0.4,
    alpha: progress >= 1 ? 0 : 1,
    returning: true,
    progress,
  };
}

export function drawAmmoParticles(
  c: CanvasRenderingContext2D,
  art: AmmoReturnArt,
  e: FX,
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  scale: number,
) {
  for (let i = 0; i < AMMO_PARTICLES; i++) {
    const p = ammoParticle(e.age, i, sx, sy, tx, ty, scale);
    if (!p.alpha) continue;
    c.save();
    if (p.returning) {
      const tail = ammoParticle(
        Math.max(0, e.age - 0.075),
        i,
        sx,
        sy,
        tx,
        ty,
        scale,
      );
      c.lineCap = 'round';
      c.strokeStyle = '#f7aa2690';
      c.lineWidth = 5 * scale;
      c.beginPath();
      c.moveTo(tail.x, tail.y);
      c.lineTo(p.x, p.y);
      c.stroke();
      c.strokeStyle = '#fff4b3';
      c.lineWidth = 1.8 * scale;
      c.stroke();
    }
    sprite(
      c,
      art.props[i % 3],
      p.x,
      p.y,
      (i % 3 === 0 ? 20 : 27) * scale * (1 - p.progress * 0.22),
      p.angle,
    );
    c.restore();
  }
}

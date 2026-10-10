import type { Bullet } from './simulation';
import type { CombatArt } from './combat-art';

// Scheme B: solid silhouettes stay readable on the warm ground at phone scale.
// All sizes are arena units (600 units across), independent of device DPR.
export const MUZZLE_FLASH_SECONDS = 0.095;
export const RECOIL_SECONDS = 0.12;

export function shotRecoil(age: number) {
  if (age < 0 || age >= RECOIL_SECONDS) return 0;
  return 4 * (1 - age / RECOIL_SECONDS) ** 2;
}

export function drawProjectile(c: CanvasRenderingContext2D, b: Bullet) {
  const split = !!b.generation;
  const size = b.bonus ? 1.18 : split ? 0.82 : 1;
  const edge = split ? '#4e205e' : '#713b16';
  const orange = split ? '#c982ff' : '#ff9f17';
  c.save();
  c.translate(b.x, b.y);
  c.rotate(Math.atan2(b.vy, b.vx));
  c.scale(size, size);

  // The round nose ends at the collision position; the short trail stays behind.
  // No additive blend: it would wash the silhouette out against the sand.
  const trail = c.createLinearGradient(-49, 0, -12, 0);
  trail.addColorStop(0, split ? '#b260ff00' : '#ff941800');
  trail.addColorStop(0.65, split ? '#b260ff85' : '#ff941895');
  trail.addColorStop(1, orange);
  c.fillStyle = trail;
  c.beginPath();
  c.moveTo(-49, 0);
  c.lineTo(-15, -5);
  c.lineTo(-10, 0);
  c.lineTo(-15, 5);
  c.closePath();
  c.fill();
  c.fillStyle = '#fff1a9';
  c.beginPath();
  c.moveTo(-36, 0);
  c.lineTo(-16, -2.5);
  c.lineTo(-16, 2.5);
  c.closePath();
  c.fill();

  c.fillStyle = edge;
  c.beginPath();
  c.roundRect(-21, -5.5, 21, 11, 5.5);
  c.fill();
  c.fillStyle = orange;
  c.beginPath();
  c.roundRect(-19.5, -4, 18, 8, 4);
  c.fill();
  c.fillStyle = split ? '#f6eaff' : '#ffffce';
  c.beginPath();
  c.roundRect(-18, -2.7, 15, 5.4, 2.7);
  c.fill();
  c.fillStyle = '#ffffed';
  c.beginPath();
  c.roundRect(-16.5, -2.3, 12.5, 2.7, 1.35);
  c.fill();
  c.restore();
}

function star(c: CanvasRenderingContext2D, radius: number, seed: number) {
  c.beginPath();
  for (let i = 0; i < 14; i++) {
    const angle = (i * Math.PI) / 7;
    const r = radius * (i % 2 ? 0.34 : 0.8 + Math.sin(i * 5 + seed) * 0.2);
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i) c.lineTo(x, y);
    else c.moveTo(x, y);
  }
  c.closePath();
  c.fill();
}

export function drawMuzzleFlash(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  age: number,
  seed: number,
) {
  if (age < 0 || age >= MUZZLE_FLASH_SECONDS) return;
  const t = age / MUZZLE_FLASH_SECONDS;
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  c.translate(13, 0);
  c.globalAlpha *= Math.min(1, (1 - t) * 2.5);
  const pulse = 1 - t * 0.35;
  c.scale(pulse * 1.12, pulse);
  c.fillStyle = '#d8600c';
  star(c, 29, seed);
  c.fillStyle = '#ffa51b';
  star(c, 26, seed);
  c.fillStyle = '#ffe968';
  star(c, 20, seed);
  c.fillStyle = '#ffffe8';
  star(c, 13, seed);
  c.restore();
}

export function drawHitSpark(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  progress: number,
  seed: number,
  bounce = false,
) {
  if (progress < 0 || progress >= 1) return;
  c.save();
  c.translate(x, y);
  c.rotate(seed * Math.PI * 2);
  c.globalAlpha *= Math.min(1, (1 - progress) * 2);
  const size = (bounce ? 11 : 23) * (1 - progress * 0.55);
  c.fillStyle = '#cb610e';
  star(c, size, seed);
  c.fillStyle = '#ffc62c';
  star(c, size * 0.85, seed);
  c.fillStyle = '#ffffdc';
  star(c, size * 0.57, seed);
  c.lineCap = 'round';
  for (let i = 0; i < (bounce ? 2 : 3); i++) {
    const a = (i * Math.PI * 2) / 3 + 0.3;
    const distance = size * 0.8 + progress * 26;
    c.beginPath();
    c.moveTo(Math.cos(a) * distance, Math.sin(a) * distance);
    c.lineTo(Math.cos(a) * (distance + 5), Math.sin(a) * (distance + 5));
    c.strokeStyle = '#c65b10';
    c.lineWidth = 5 * (1 - progress * 0.65);
    c.stroke();
    c.strokeStyle = '#fff2ac';
    c.lineWidth = 2.5 * (1 - progress * 0.65);
    c.stroke();
  }
  c.restore();
}

export const hitMaterial = (kind: number) =>
  [2, 6, 9, 10, 11, 12].includes(kind) ? 'metal' : 'body';

export function drawMaterialHit(
  c: CanvasRenderingContext2D,
  art: CombatArt | undefined,
  x: number,
  y: number,
  progress: number,
  species: number,
  angle: number,
  seed: number,
) {
  if (progress < 0 || progress >= 1) return;
  const material = hitMaterial(species);
  const frame = Math.min(3, Math.floor(progress * 4));
  const image = art?.[material][frame];
  if (!image) {
    drawHitSpark(c, x, y, progress, seed);
    return;
  }
  const size = material === 'metal' ? 105 : 83;
  c.save();
  c.translate(x, y);
  // Metal spray follows the incoming bullet; body dust remains upright.
  if (material === 'metal') c.rotate(angle + Math.PI / 6);
  c.globalAlpha *= Math.min(1, (1 - progress) * 3);
  c.drawImage(image, -size * 0.44, -size * 0.5, size, size);
  c.restore();
}

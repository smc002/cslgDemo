export type WeaponStateArt = {
  leftPlate?: HTMLImageElement;
  rightPlate?: HTMLImageElement;
  amberCoil?: HTMLImageElement;
  cyanCoil?: HTMLImageElement;
};

type WeaponKind = 'shotgun' | 'laser';
const FONT = '"Microsoft YaHei", sans-serif';
const finite = (...values: number[]) => values.every(Number.isFinite);
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const ease = (value: number) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};
const palette = (kind: WeaponKind) =>
  kind === 'shotgun'
    ? { light: '#ffcf79', color: '#ff9b42', glow: '#ed8336', label: '散弹' }
    : { light: '#d8ffff', color: '#63e9ed', glow: '#40d9ed', label: '激光' };

function validImage(image?: HTMLImageElement): image is HTMLImageElement {
  return !!image?.complete && image.naturalWidth > 0 && image.naturalHeight > 0;
}

function plateFallback(c: CanvasRenderingContext2D, color: string) {
  c.fillStyle = '#263438';
  c.strokeStyle = '#68706a';
  c.lineWidth = 1.3;
  c.beginPath();
  c.roundRect(-10, -18, 20, 36, 4);
  c.fill();
  c.stroke();
  c.fillStyle = color;
  for (let i = -1; i <= 1; i++) c.fillRect(-6, i * 8 - 2, 12, 3);
}

/**
 * Draw after the turret sprite in its translated/rotated pivot coordinates.
 * All times are seconds. Elapsed deploys over 0.35s; ending retracts over 0.4s.
 */
export function drawWeaponAttachments(
  c: CanvasRenderingContext2D,
  art: WeaponStateArt,
  kind: WeaponKind,
  elapsed: number,
  remaining: number,
  ending = 0,
) {
  if (
    !finite(elapsed, remaining, ending) ||
    (kind !== 'shotgun' && kind !== 'laser') ||
    (remaining <= 0 && ending <= 0)
  )
    return;
  const start = ease(elapsed / 0.35);
  const finish = ease(ending / 0.4);
  const deploy = start * (1 - finish);
  if (deploy <= 0) return;
  const colors = palette(kind);
  const pulse = 0.88 + Math.sin(Math.max(0, elapsed) * 5) * 0.12;
  c.save();
  c.globalAlpha *= Math.min(1, deploy * 3) * (1 - finish);

  // Side plates expand from the receiver while staying behind the muzzle.
  for (const side of [-1, 1]) {
    const image = side < 0 ? art.leftPlate : art.rightPlate;
    c.save();
    c.translate(side * (14 + deploy * 9), -33 + (1 - deploy) * 9);
    c.rotate(side * deploy * 0.12);
    c.scale(0.75 + deploy * 0.25, 0.85 + deploy * 0.15);
    if (validImage(image)) {
      const height = Math.max(
        16,
        Math.min(48, (25 * image.naturalHeight) / image.naturalWidth),
      );
      c.drawImage(image, -12.5, -height / 2, 25, height);
    } else plateFallback(c, colors.color);
    // Small consistent powered trim keeps either plate readable on pale ground.
    c.globalAlpha *= pulse * 0.65;
    c.strokeStyle = colors.color;
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(side * 8, -10);
    c.lineTo(side * 8, 10);
    c.stroke();
    c.restore();
  }

  c.save();
  c.translate(0, -42 + (1 - deploy) * 7);
  c.scale(0.75 + deploy * 0.25, 0.75 + deploy * 0.25);
  c.shadowColor = colors.glow;
  c.shadowBlur = 5 * pulse;
  const coil = kind === 'shotgun' ? art.amberCoil : art.cyanCoil;
  if (validImage(coil)) {
    const height = Math.max(
      12,
      Math.min(34, (28 * coil.naturalHeight) / coil.naturalWidth),
    );
    c.drawImage(coil, -14, -height / 2, 28, height);
  } else {
    c.fillStyle = '#1a2c30';
    c.strokeStyle = colors.color;
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(0, 0, 13, 8, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.strokeStyle = colors.light;
    c.lineWidth = 2.4;
    for (let i = -1; i <= 1; i++) {
      c.beginPath();
      c.moveTo(-8, i * 4);
      c.lineTo(8, i * 4);
      c.stroke();
    }
  }
  c.shadowBlur = 0;
  c.globalAlpha *= pulse * 0.8;
  c.fillStyle = colors.light;
  c.beginPath();
  c.ellipse(0, 0, 4, 2, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();
  c.restore();
}

/** Draw in arena coordinates. x/y is the center of the 92 x 29 status plaque. */
export function drawWeaponGauge(
  c: CanvasRenderingContext2D,
  kind: WeaponKind,
  x: number,
  y: number,
  remaining: number,
  total: number,
  ending = 0,
) {
  if (
    !finite(x, y, remaining, total, ending) ||
    total <= 0 ||
    (kind !== 'shotgun' && kind !== 'laser') ||
    (remaining <= 0 && ending <= 0) ||
    ending >= 0.4
  )
    return;
  const colors = palette(kind);
  const fraction = clamp(remaining / total);
  const seconds = Math.ceil(Math.max(0, Math.min(remaining, total)));
  c.save();
  c.translate(x, y);
  c.globalAlpha *= 1 - ease(ending / 0.4);
  c.fillStyle = '#102127e8';
  c.strokeStyle = colors.color;
  c.lineWidth = 1;
  c.beginPath();
  c.roundRect(-46, -14.5, 92, 29, 6);
  c.fill();
  c.stroke();
  c.font = `bold 15px ${FONT}`;
  c.fillStyle = colors.light;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(`${colors.label} ${seconds}s`, 0, -3, 80);
  c.fillStyle = '#48504c';
  c.fillRect(-36, 7, 72, 3);
  c.fillStyle = colors.color;
  c.fillRect(-36, 7, 72 * fraction, 3);
  c.restore();
}

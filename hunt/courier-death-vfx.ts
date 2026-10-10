import metadata from '../shared/courier-death-data.json';
import { TOY_SCALE } from '../shared/toy-art';

export const COURIER_FALL_AT = 0.28;
export const COURIER_FADE_AT = 1.1;
export const COURIER_DEATH_END = 1.5;
export function courierDeathPose(age: number) {
  if (!Number.isFinite(age) || age < 0 || age >= COURIER_DEATH_END) return null;
  return {
    frame: age < COURIER_FALL_AT ? 0 : 1,
    alpha:
      1 -
      Math.max(
        0,
        (age - COURIER_FADE_AT) / (COURIER_DEATH_END - COURIER_FADE_AT),
      ),
  };
}

/** Two articulated poses share the living actor's foot anchor and physical scale. */
export function drawCourierDeath(
  c: CanvasRenderingContext2D,
  frames: (HTMLImageElement | undefined)[],
  x: number,
  y: number,
  age: number,
  size: number,
  scale = 1,
  left = false,
) {
  const pose = courierDeathPose(age);
  if (!pose) return true;
  const image = frames[pose.frame];
  if (!image?.complete || !image.naturalWidth) return false;
  const s = (size * 1.12 * TOY_SCALE * scale) / metadata.standingHeight;
  c.save();
  c.globalAlpha *= pose.alpha;
  c.translate(x, y + size * 0.37 * scale);
  c.scale(left ? -s : s, s);
  c.fillStyle = '#352a2550';
  c.beginPath();
  c.ellipse(0, -5, pose.frame ? 180 : 115, 20, 0, 0, Math.PI * 2);
  c.fill();
  c.drawImage(
    image,
    -metadata.anchor[0],
    -metadata.anchor[1],
    metadata.frameSize,
    metadata.frameSize,
  );
  c.restore();
  return true;
}

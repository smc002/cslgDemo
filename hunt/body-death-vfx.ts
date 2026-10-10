/** Authored articulated poses, kept whole: no pixel breakup or body deformation. */
export const BODY_DEATH_ROOT = '/assets/hunt/body-death-v1/';
export const BODY_DEATH_CELL = 512;
export const BODY_DEATH_HEIGHT = 376;
export type BodyDeathArt = (HTMLImageElement | undefined)[][];
export type DeathStyle = 'side' | 'back' | 'heavy';
export const deathStyle = (kind: number): DeathStyle =>
  kind === 3 || kind === 9 ? 'heavy' : kind < 2 ? 'side' : 'back';
export function bodyDeathPose(kind: number, age: number) {
  const style = deathStyle(kind);
  const times =
    style === 'heavy'
      ? [0, 0.23, 0.55]
      : style === 'side'
        ? [0, 0.14, 0.32]
        : [0, 0.18, 0.4];
  const fadeAt = style === 'heavy' ? 1 : style === 'side' ? 0.66 : 0.82;
  const end = style === 'heavy' ? 1.35 : style === 'side' ? 1 : 1.2;
  if (!Number.isFinite(age) || age < 0 || age >= end) return null;
  const frame = age < times[1] ? 0 : age < times[2] ? 1 : 2;
  return {
    style,
    frame,
    blend: 1,
    alpha: 1 - Math.max(0, (age - fadeAt) / (end - fadeAt)),
    landedAt: times[2],
  };
}
export async function loadBodyDeathArt(
  load: (url: string) => Promise<HTMLImageElement>,
): Promise<BodyDeathArt> {
  return Promise.all(
    Array.from({ length: 13 }, (_, kind) =>
      Promise.all(
        [0, 1, 2].map((frame) =>
          load(`${BODY_DEATH_ROOT}${kind}-${frame}.png`).catch(() => undefined),
        ),
      ),
    ),
  );
}
export function drawBodyDeath(
  c: CanvasRenderingContext2D,
  art: BodyDeathArt,
  kind: number,
  x: number,
  y: number,
  age: number,
  size: number,
  worldScale = 1,
  left = false,
  toyScale = 1.26,
) {
  const pose = bodyDeathPose(kind, age);
  if (!pose) return true;
  const frames = art[kind];
  if (!frames?.every((image) => image?.complete && image.naturalWidth))
    return false;
  const scale = (size * 1.12 * toyScale * worldScale) / BODY_DEATH_HEIGHT;
  c.save();
  c.translate(x, y + size * 0.37 * worldScale);
  c.scale(left ? -scale : scale, scale);
  c.globalAlpha *= pose.alpha;
  c.fillStyle = '#30281d44';
  c.beginPath();
  c.ellipse(0, -5, pose.frame === 2 ? 182 : 90, 18, 0, 0, Math.PI * 2);
  c.fill();
  const paint = (frame: number, alpha: number) => {
    c.save();
    c.globalAlpha *= alpha;
    c.drawImage(frames[frame]!, -256, -448, BODY_DEATH_CELL, BODY_DEATH_CELL);
    c.restore();
  };
  if (pose.frame > 0 && pose.blend < 1) paint(pose.frame - 1, 1 - pose.blend);
  paint(pose.frame, pose.blend);
  // A low dust puff at actual ground contact. Never covers the torso or reward.
  const dustAge = age - pose.landedAt;
  if (dustAge >= 0 && dustAge < 0.38) {
    const t = dustAge / 0.38;
    c.globalAlpha *= 0.22 * (1 - t);
    c.fillStyle = '#cdb384';
    for (let i = 0; i < 5; i++) {
      c.beginPath();
      c.ellipse(
        (i - 2) * (38 + t * 29),
        -5 - t * 12,
        26 + t * 18,
        9 + t * 8,
        0,
        0,
        Math.PI * 2,
      );
      c.fill();
    }
  }
  c.restore();
  return true;
}

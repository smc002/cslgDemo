import sniper from './animation-data/sniper.json';
import warrior from './animation-data/warrior.json';
import shield from './animation-data/shield.json';
import medic from './animation-data/medic.json';
import drone from './animation-data/drone.json';
export type PoseFrame = {
  x: number;
  y: number;
  w: number;
  h: number;
  anchorX: number;
  anchorY: number;
  duration: number;
  visibleHeight: number;
  muzzleX: number;
  muzzleY: number;
};
export type PoseClip = {
  name: string;
  pixelsPerUnit: number;
  sheetWidth?: number;
  sheetHeight?: number;
  impactFrame?: number;
  /** Measured barrel axis in screen degrees for the unmirrored sprite. */
  aimAngle?: number;
  frames: PoseFrame[];
};
export type HeroAnimation = {
  clip: string;
  elapsed: number;
  target: number;
  hit: boolean;
};
export const animations: Record<number, { folder: string; clips: PoseClip[] }> =
  {
    0: { folder: 'shield', clips: shield.clips },
    1: { folder: 'medic', clips: medic.clips },
    2: { folder: 'drone', clips: drone.clips },
    3: { folder: 'warrior', clips: warrior.clips },
    8: { folder: 'sniper', clips: sniper.clips },
  };
export function poseClip(hero: number, name: string) {
  return animations[hero]?.clips.find((c) => c.name === name);
}
export function sniperAim(x: number, y: number, tx: number, ty: number) {
  let best = { clip: 'crouch', facingLeft: tx < x, error: Infinity };
  for (const clip of animations[8].clips) {
    if (clip.aimAngle === undefined) continue;
    const frame = clip.frames[clip.impactFrame ?? 1];
    const scale = 52 / (3.2 * clip.pixelsPerUnit);
    for (const facingLeft of [false, true]) {
      const mx =
        x + (frame.muzzleX - frame.anchorX) * scale * (facingLeft ? -1 : 1);
      const my = y + (frame.muzzleY - frame.anchorY) * scale;
      const targetAngle = (Math.atan2(ty - my, tx - mx) * 180) / Math.PI;
      const barrel = facingLeft ? 180 - clip.aimAngle : clip.aimAngle;
      const error = Math.abs(((targetAngle - barrel + 540) % 360) - 180);
      if (error < best.error) best = { clip: clip.name, facingLeft, error };
    }
  }
  return best;
}
export function actionDuration(hero: number, name: string) {
  return (
    (poseClip(hero, name)?.frames.reduce((s, f) => s + f.duration, 0) ?? 0) /
    1.8
  );
}
export function actionImpact(hero: number, name: string) {
  const clip = poseClip(hero, name);
  return (
    (clip?.frames
      .slice(0, clip.impactFrame ?? (name === 'slam' ? 5 : 4))
      .reduce((s, f) => s + f.duration, 0) ?? 0) / 1.8
  );
}
export function poseAt(hero: number, name: string, time: number, loop = false) {
  const clip = poseClip(hero, name);
  if (!clip) return null;
  const duration = clip.frames.reduce((s, f) => s + f.duration, 0);
  let t = loop ? time % duration : time,
    index = clip.frames.length - 1;
  for (let i = 0; i < clip.frames.length; i++) {
    if (t < clip.frames[i].duration) {
      index = i;
      break;
    }
    t -= clip.frames[i].duration;
  }
  return { clip, index, frame: clip.frames[index] };
}

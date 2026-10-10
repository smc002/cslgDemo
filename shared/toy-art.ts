import metadata from './toy-art-data.json';
import animationData from './toy-animation-data.json';

/** World sprites reduced 10% from the approved 1.40; UI portraits retain their size. */
export const TOY_SCALE = 1.26;
export const TOY_ROOT = '/assets/toy-v1/';
export const HERO_ART = [
  ['hero-tank', '胖雷'],
  ['hero-medic', '仟手'],
  ['hero-energy', '贾伟思'],
  ['hero-cyborg', 'T-100'],
  ['hero-robot', '大白'],
  ['hero-assassin', '梨'],
  ['hero-fire', '琴'],
  ['hero-priest', '陆尼艾'],
  ['hero-frost', '霜华'],
] as const;
export const ZOMBIE_ART = [
  'zombie-normal',
  'zombie-runner',
  'zombie-armored',
  'zombie-giant',
  'zombie-reward',
  'zombie-explosive',
  'zombie-scatter',
  'zombie-electric',
  'zombie-ice',
  'zombie-courier',
  'zombie-prism',
  'zombie-shotgun',
  'zombie-gold',
] as const;
export const ZOMBIE_NAMES = [
  '普通僵尸',
  '奔跑者',
  '装甲僵尸',
  '巨型僵尸',
  '奖励僵尸',
  '爆炸僵尸',
  '散射僵尸',
  '电弧僵尸',
  '冰冻僵尸',
  '装甲运钞僵尸',
  '棱镜工程僵尸',
  '散弹工程僵尸',
  '黑金僵尸',
] as const;
export type ToyMeta = {
  width: number;
  height: number;
  bounds: number[];
  facingLeft?: boolean;
  emitter?: number[];
};
export const TOY_META = metadata as Record<string, ToyMeta>;
export const heroImage = (hero: number) =>
  TOY_ROOT + HERO_ART[hero][0] + '.png';
export const heroHeight = (hero: number) =>
  ([0, 3, 6].includes(hero) ? 61 : 52) * TOY_SCALE;
/** Back-view release sockets in units of visible body height. */
export function heroEmitter(hero: number, _left = false) {
  const sockets = [
    [0.12, -0.82],
    [0.22, -0.57],
    [0.25, -0.82],
    [0.21, -0.78],
    [0.19, -0.85],
    [0.2, -0.65],
    [0.14, -0.88],
    [0.3, -0.88],
    [0.2, -0.84],
  ];
  return {
    x: sockets[hero][0] * heroHeight(hero),
    y: sockets[hero][1] * heroHeight(hero),
  };
}

export type ToyPose = {
  time?: number;
  moving?: boolean;
  attack?: number;
  /** Normalized action clock, sampled against the actual impact event. */
  attackProgress?: number;
  left?: boolean;
  death?: number;
  hit?: number;
  frozen?: boolean;
};
export type ToyAnimation = {
  sheet: string;
  cell: number;
  anchorX: number;
  anchorY: number;
  bodyHeight: number;
  halfWidth: number;
  facing: string;
  walk: number[];
  attack: number[];
  idle: number;
  frameAnchors?: number[][];
};
export const TOY_ANIMATIONS = animationData as Record<string, ToyAnimation>;
const sources = new Map<string, Promise<HTMLImageElement>>();
export function toyFrame(id: string, pose: ToyPose = {}) {
  const art = TOY_ANIMATIONS[id];
  if (!art) throw Error('Missing authored animation: ' + id);
  if (pose.death !== undefined) return art.idle;
  if (pose.attackProgress !== undefined || (pose.attack ?? 0) > 0) {
    const progress = pose.attackProgress ?? ((pose.time ?? 0) % 0.48) / 0.48;
    return art.attack[Math.min(3, Math.max(0, Math.floor(progress * 4)))];
  }
  if (pose.moving)
    return art.walk[Math.floor(Math.max(0, pose.time ?? 0) * 8) % 4];
  return art.idle;
}
/** Draw separately authored poses. No slicing, bending or squash of a static portrait. */
export class ToyRenderer {
  private ready = new Map<string, HTMLImageElement>();
  async load(ids: readonly string[]) {
    await Promise.all(
      ids.map(async (id) => {
        let pending = sources.get(id);
        if (!pending) {
          const image = new Image();
          image.src = TOY_ROOT + 'animations/' + TOY_ANIMATIONS[id].sheet;
          pending = image.decode().then(() => image);
          sources.set(id, pending);
          pending.catch(() => sources.delete(id));
        }
        this.ready.set(id, await pending);
      }),
    );
  }
  draw(
    c: CanvasRenderingContext2D,
    id: string,
    x: number,
    foot: number,
    height: number,
    pose: ToyPose = {},
  ) {
    const image = this.ready.get(id);
    if (!image) return false;
    const art = TOY_ANIMATIONS[id],
      index = toyFrame(id, pose),
      scale = height / art.bodyHeight;
    const anchor = art.frameAnchors?.[index] ?? [art.anchorX, art.anchorY];
    c.save();
    c.translate(x, foot);
    // Heroes always face north with their backs to the player. Never mirror asymmetrical gear.
    if (art.facing !== 'back' && pose.left) c.scale(-1, 1);
    if (pose.death !== undefined)
      c.globalAlpha *= Math.max(0, 1 - pose.death / 0.8);
    if (pose.hit) c.filter = 'brightness(1.6)';
    if (pose.frozen) c.filter = 'saturate(.45) brightness(1.12)';
    c.drawImage(
      image,
      (index % 4) * art.cell,
      Math.floor(index / 4) * art.cell,
      art.cell,
      art.cell,
      -anchor[0] * scale,
      -anchor[1] * scale,
      art.cell * scale,
      art.cell * scale,
    );
    c.restore();
    return true;
  }
}

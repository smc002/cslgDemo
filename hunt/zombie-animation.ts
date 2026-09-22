export type ZombieClip = {
  frames: number[];
  fps?: number;
  durations?: number[];
  loop?: boolean;
};
export type ZombieFacing = 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW' | 'N' | 'NE';
export type ZombieClips = {
  idle: ZombieClip;
  walk: ZombieClip;
  hit: ZombieClip;
};
export type ZombieArchetype = {
  atlas: string;
  visibleHeight: number;
  columns?: number;
  rows?: number;
  clips?: ZombieClips;
  directions?: Partial<Record<ZombieFacing, ZombieClips>>;
};
export type ZombieClock = { age: number; walk: number; facing: ZombieFacing };
export type ZombieAnimationManifest = {
  version: number;
  cell: number;
  anchor: { foot: [number, number]; pelvis?: [number, number] };
  archetypes: Record<string, ZombieArchetype>;
  kinds: Record<
    string,
    { archetype: string; filter?: string; fps?: number; playbackRate?: number }
  >;
};

const FACINGS: ZombieFacing[] = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
const MIRRORS: Partial<Record<ZombieFacing, ZombieFacing>> = {
  SW: 'SE',
  W: 'E',
  NW: 'NE',
};

/** Hysteresis avoids flipping views when movement skims a 22.5-degree boundary. */
export function zombieFacing(
  vx: number,
  vy: number,
  previous?: ZombieFacing,
): ZombieFacing {
  if (!Number.isFinite(vx) || !Number.isFinite(vy) || Math.hypot(vx, vy) < 0.01)
    return previous ?? 'S';
  const angle = Math.atan2(vy, vx);
  if (previous) {
    const previousAngle = (FACINGS.indexOf(previous) * Math.PI) / 4;
    const difference = Math.atan2(
      Math.sin(angle - previousAngle),
      Math.cos(angle - previousAngle),
    );
    if (Math.abs(difference) <= Math.PI / 6) return previous;
  }
  return FACINGS[(Math.round(angle / (Math.PI / 4)) + 8) % 8];
}

export function zombieDirection(art: ZombieArchetype, facing: ZombieFacing) {
  const native = art.directions?.[facing];
  if (native) return { clips: native, mirror: false, source: facing };
  const mirror = MIRRORS[facing];
  if (mirror && art.directions?.[mirror])
    return { clips: art.directions[mirror]!, mirror: true, source: mirror };
  const clips = art.directions?.S ?? art.clips;
  if (!clips) throw Error(`僵尸缺少 ${facing} 方向动作`);
  return { clips, mirror: false, source: 'S' as ZombieFacing };
}

export function advanceZombieClock(
  previous: ZombieClock | undefined,
  actor: {
    age: number;
    seed: number;
    vx: number;
    vy: number;
    hit: number;
    frozen?: number;
  },
  playbackRate: number,
): ZombieClock {
  const current =
    !previous || previous.age > actor.age
      ? {
          age: actor.age,
          walk: actor.seed * 2,
          facing: zombieFacing(actor.vx, actor.vy),
        }
      : { ...previous };
  const elapsed = Math.max(0, Math.min(0.1, actor.age - current.age));
  // Reaction and freeze retain the facing captured before the interruption.
  if (!actor.frozen && actor.hit <= 0) {
    current.facing = zombieFacing(actor.vx, actor.vy, current.facing);
    if (Math.hypot(actor.vx, actor.vy) > 0.01)
      current.walk += elapsed * playbackRate;
  }
  current.age = actor.age;
  return current;
}

/** A hit uses all its authored poses within the existing reaction interval. */
export function zombieFrame(
  clip: ZombieClip,
  seconds: number,
  normalized = false,
) {
  if (!clip.frames.length) return 0;
  const durations =
    clip.durations ?? clip.frames.map(() => 1 / (clip.fps ?? 8));
  const total = durations.reduce((sum, value) => sum + value, 0);
  let elapsed = normalized
    ? Math.max(0, Math.min(0.999999, seconds)) * total
    : Math.max(0, seconds);
  if (clip.loop) elapsed %= total;
  for (let i = 0; i < clip.frames.length; i++) {
    if (elapsed < durations[i]) return clip.frames[i];
    elapsed -= durations[i];
  }
  return clip.frames[clip.frames.length - 1];
}

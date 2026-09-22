// hunt/zombie-animation.ts
var FACINGS = ["E", "SE", "S", "SW", "W", "NW", "N", "NE"];
var MIRRORS = {
  SW: "SE",
  W: "E",
  NW: "NE"
};
function zombieFacing(vx, vy, previous) {
  if (!Number.isFinite(vx) || !Number.isFinite(vy) || Math.hypot(vx, vy) < 0.01)
    return previous ?? "S";
  const angle = Math.atan2(vy, vx);
  if (previous) {
    const previousAngle = FACINGS.indexOf(previous) * Math.PI / 4;
    const difference = Math.atan2(
      Math.sin(angle - previousAngle),
      Math.cos(angle - previousAngle)
    );
    if (Math.abs(difference) <= Math.PI / 6) return previous;
  }
  return FACINGS[(Math.round(angle / (Math.PI / 4)) + 8) % 8];
}
function zombieDirection(art, facing) {
  const native = art.directions?.[facing];
  if (native) return { clips: native, mirror: false, source: facing };
  const mirror = MIRRORS[facing];
  if (mirror && art.directions?.[mirror])
    return { clips: art.directions[mirror], mirror: true, source: mirror };
  const clips = art.directions?.S ?? art.clips;
  if (!clips) throw Error(`\u50F5\u5C38\u7F3A\u5C11 ${facing} \u65B9\u5411\u52A8\u4F5C`);
  return { clips, mirror: false, source: "S" };
}
function advanceZombieClock(previous, actor, playbackRate) {
  const current = !previous || previous.age > actor.age ? {
    age: actor.age,
    walk: actor.seed * 2,
    facing: zombieFacing(actor.vx, actor.vy)
  } : { ...previous };
  const elapsed = Math.max(0, Math.min(0.1, actor.age - current.age));
  if (!actor.frozen && actor.hit <= 0) {
    current.facing = zombieFacing(actor.vx, actor.vy, current.facing);
    if (Math.hypot(actor.vx, actor.vy) > 0.01)
      current.walk += elapsed * playbackRate;
  }
  current.age = actor.age;
  return current;
}
function zombieFrame(clip, seconds, normalized = false) {
  if (!clip.frames.length) return 0;
  const durations = clip.durations ?? clip.frames.map(() => 1 / (clip.fps ?? 8));
  const total = durations.reduce((sum, value) => sum + value, 0);
  let elapsed = normalized ? Math.max(0, Math.min(0.999999, seconds)) * total : Math.max(0, seconds);
  if (clip.loop) elapsed %= total;
  for (let i = 0; i < clip.frames.length; i++) {
    if (elapsed < durations[i]) return clip.frames[i];
    elapsed -= durations[i];
  }
  return clip.frames[clip.frames.length - 1];
}
export {
  advanceZombieClock,
  zombieDirection,
  zombieFacing,
  zombieFrame
};

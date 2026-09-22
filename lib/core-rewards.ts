import { BALANCE } from './balance';

/** Ticket milestones share the exact cumulative thresholds used by saveHunt. */
export function coreRewardProgress(level: number, xp: number, points: number) {
  const step = BALANCE.corePerTicket;
  const cap = Math.max(1, level) * 200;
  const base = points - xp;
  const first = Math.max(step, (Math.floor(base / step) + 1) * step);
  const count = Math.max(0, Math.floor((base + cap - first) / step) + 1);
  // Three illustrated checkpoints keep the full-level bar readable at high levels.
  // They are sampled milestones, not a separate reward schedule.
  const indices = [
    ...new Set([Math.ceil(count / 3), Math.ceil((count * 2) / 3), count]),
  ].filter((n) => n > 0);
  const checkpoints = indices.map((n) => {
    const threshold = first + (n - 1) * step;
    return {
      threshold,
      xp: threshold - base,
      ratio: (threshold - base) / cap,
      reached: points >= threshold,
    };
  });
  return {
    cap,
    checkpoints,
    remaining: step - (points % step),
    next: (Math.floor(points / step) + 1) * step,
    step,
  };
}

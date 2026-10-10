import { BALANCE } from './balance';

export type CoreAward = {
  amount: number;
  level: number;
  xp: number;
  points: number;
  threshold: number;
};
export type TicketRewardSource = { core?: CoreAward; other: number };

/** Snapshot the crossed node before a level-up replaces the visible bar. */
export function ticketRewardSource(
  before: { level: number; xp: number; points: number },
  points: number,
  gained: number,
): TicketRewardSource {
  const step = BALANCE.corePerTicket;
  const amount = Math.min(
    gained,
    Math.max(0, Math.floor(points / step) - Math.floor(before.points / step)),
  );
  if (!amount) return { other: gained };
  const threshold = (Math.floor(before.points / step) + 1) * step;
  return {
    core: {
      amount,
      level: before.level,
      xp: threshold - (before.points - before.xp),
      points: threshold,
      threshold,
    },
    other: gained - amount,
  };
}

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

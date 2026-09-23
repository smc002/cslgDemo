/** Inventory ammunition rewards are separate from the core-points event ledger. */
export const AMMO_CARRIER = {
  kind: 12,
  shots: 100,
  refund: 20,
  hits: 3,
} as const;
export const AMMO_ROOMS = [1, 5, 20, 100] as const;
export type AmmoCarrierSave = {
  version: 1;
  serial: number;
  rooms: Record<number, { spent: number; claimed: number }>;
  active: {
    serial: number;
    room: number;
    /** Fixed when this carrier spawns; independent of the current firing room. */
    refundAmount: number;
    hits: number[];
    x: number;
    y: number;
    vx: number;
    vy: number;
  } | null;
};
export const freshAmmoCarrier = (): AmmoCarrierSave => ({
  version: 1,
  serial: 0,
  rooms: Object.fromEntries(
    AMMO_ROOMS.map((m) => [m, { spent: 0, claimed: 0 }]),
  ),
  active: null,
});
const integer = (v: unknown) =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= 0
    ? Math.min(v, 1e12)
    : 0;
export function carrierQueued(s: AmmoCarrierSave, room: number) {
  const r = s.rooms[room];
  return r
    ? Math.max(
        0,
        Math.floor(r.spent / (AMMO_CARRIER.shots * room)) -
          r.claimed -
          (s.active?.room === room ? 1 : 0),
      )
    : 0;
}
export function carrierRefunded(s: AmmoCarrierSave) {
  return AMMO_ROOMS.reduce(
    (n, m) => n + s.rooms[m].claimed * AMMO_CARRIER.refund * m,
    0,
  );
}
export function carrierSpent(s: AmmoCarrierSave) {
  return AMMO_ROOMS.reduce((n, m) => n + s.rooms[m].spent, 0);
}
export function parseAmmoCarrier(raw: unknown): AmmoCarrierSave {
  const s = freshAmmoCarrier(),
    r = raw as Partial<AmmoCarrierSave> | null;
  if (!r || r.version !== 1) return s;
  s.serial = integer(r.serial);
  for (const m of AMMO_ROOMS) {
    const spent = integer(r.rooms?.[m]?.spent);
    s.rooms[m] = {
      spent,
      claimed: Math.min(
        integer(r.rooms?.[m]?.claimed),
        Math.floor(spent / (AMMO_CARRIER.shots * m)),
      ),
    };
  }
  const a = r.active;
  if (
    a &&
    AMMO_ROOMS.includes(a.room as (typeof AMMO_ROOMS)[number]) &&
    carrierQueued(s, a.room) > 0 &&
    integer(a.serial) > 0
  ) {
    s.serial = Math.max(s.serial, integer(a.serial));
    s.active = {
      serial: integer(a.serial),
      room: a.room,
      // Migrate older saves and reject inflated rewards using the earned tier.
      refundAmount: AMMO_CARRIER.refund * a.room,
      hits: [
        ...new Set(
          Array.isArray(a.hits) ? a.hits.filter((id) => integer(id) > 0) : [],
        ),
      ].slice(0, AMMO_CARRIER.hits - 1),
      x: Number.isFinite(a.x) ? Math.max(70, Math.min(530, a.x)) : 100,
      y: Number.isFinite(a.y) ? Math.max(180, Math.min(510, a.y)) : 310,
      vx: Number.isFinite(a.vx) && Math.abs(a.vx) <= 18 ? a.vx : 16,
      vy: Number.isFinite(a.vy) && Math.abs(a.vy) <= 18 ? a.vy : 8,
    };
  }
  return s;
}
/** Reject rollback and fabricated claims before changing the shared inventory. */
export function carrierCommitDelta(
  previous: AmmoCarrierSave,
  next: AmmoCarrierSave,
  newSpent: number,
): number | null {
  const earned = carrierSpent(next) - carrierSpent(previous);
  if (earned < 0 || earned > newSpent || next.serial < previous.serial)
    return null;
  if (
    next.active &&
    (next.active.refundAmount !== AMMO_CARRIER.refund * next.active.room ||
      (previous.active &&
        (next.active.serial !== previous.active.serial ||
          next.active.room !== previous.active.room ||
          next.active.refundAmount !==
            (previous.active.refundAmount ??
              AMMO_CARRIER.refund * previous.active.room))))
  )
    return null;
  let claims = 0;
  for (const m of AMMO_ROOMS) {
    const a = previous.rooms[m],
      b = next.rooms[m];
    if (
      !b ||
      !Number.isSafeInteger(b.spent) ||
      !Number.isSafeInteger(b.claimed) ||
      b.spent < a.spent ||
      b.claimed < a.claimed ||
      b.claimed > Math.floor(b.spent / (AMMO_CARRIER.shots * m))
    )
      return null;
    const added = b.claimed - a.claimed;
    if (
      added > 0 &&
      (added !== 1 ||
        previous.active?.room !== m ||
        next.active !== null ||
        previous.active.serial !== next.serial)
    )
      return null;
    claims += added;
  }
  if (claims > 1) return null;
  if (!claims) return 0;
  const amount =
    previous.active!.refundAmount ??
    AMMO_CARRIER.refund * previous.active!.room;
  return amount === carrierRefunded(next) - carrierRefunded(previous)
    ? amount
    : null;
}

import {
  freshRecruit,
  RECRUIT_HEROES,
  type RecruitSave,
  type RecruitId,
} from './recruit';
import {
  ECONOMY,
  freshEconomy,
  parseEconomy,
  reserve,
  type EconomySave,
} from './hunt-economy';
import {
  AMMO_CARRIER,
  freshAmmoCarrier,
  parseAmmoCarrier,
  carrierCommitDelta,
  type AmmoCarrierSave,
} from './ammo-carrier';
export const COURIER_RULES = {
  threshold: ECONOMY.courierAmmo,
  plates: 3,
  hitsPerPlate: 6,
  platePoints: 100,
  pity: 20,
  chance: 0.08,
  cooldown: 30,
} as const;
export type WeaponKind = 'laser' | 'shotgun';
export type ExpeditionSave = {
  stage: number;
  points: number;
  transition: { target: number; age: number } | null;
};
export type WeaponSave = {
  laser: number;
  shotgun: number;
  stored?: Partial<Record<WeaponKind, { eventId: number; room: number }>>;
  active: {
    kind: WeaponKind;
    left: number;
    room: number;
    eventId?: number;
  } | null;
};
export type CourierReward = {
  serial: number;
  hero: RecruitId;
  heroes?: RecruitId[];
  newHeroes?: RecruitId[];
};
export const freshExpedition = (): ExpeditionSave => ({
  stage: 0,
  points: 0,
  transition: null,
});
export const freshWeapons = (): WeaponSave => ({
  laser: 0,
  shotgun: 0,
  active: null,
});
export type CourierSave = {
  progress: number;
  queued: number;
  completed: number;
  cooldown: number;
  active: {
    armorHits: number;
    bodyHits: number;
    x: number;
    y: number;
    bundle?: number;
  } | null;
  reveal: CourierReward | null;
  lastReward?: CourierReward | null;
};
export const freshCourier = (): CourierSave => ({
  progress: 0,
  queued: 0,
  completed: 0,
  cooldown: 0,
  active: null,
  reveal: null,
});
/** Device-local campaign shared by battle, reward modes and recruitment. */
export const CAMPAIGN_KEY = 'mori-campaign-v1';
export type HuntSave = {
  level: number;
  xp: number;
  kills: number;
  scrap: number;
  crates: number[];
  room: number;
  bonus: {
    left: number;
    ammo: number;
    room: number;
    points: number;
    eventId?: number;
  } | null;
  courier: CourierSave;
  expedition: ExpeditionSave;
  weapons: WeaponSave;
  economy: EconomySave;
  ammoCarrier: AmmoCarrierSave;
};
export type Campaign = {
  version: 1;
  ammo: number;
  hunt: HuntSave;
  recruit: RecruitSave;
};
export const freshHunt = (): HuntSave => ({
  level: 1,
  xp: 0,
  kills: 0,
  scrap: 0,
  crates: [0, 0, 0, 0],
  room: 1,
  bonus: null,
  courier: freshCourier(),
  expedition: freshExpedition(),
  weapons: freshWeapons(),
  economy: freshEconomy(),
  ammoCarrier: freshAmmoCarrier(),
});
/** Only old pre-ledger saves receive one-off funding for already earned skills. */
export function prepareHuntEconomy(h: HuntSave) {
  h.ammoCarrier ??= freshAmmoCarrier();
  if (h.ammoCarrier.active)
    h.ammoCarrier.active.refundAmount ??=
      AMMO_CARRIER.refund * h.ammoCarrier.active.room;
  const legacy = !h.economy;
  h.economy ??= freshEconomy();
  h.weapons.stored ??= {};
  if (legacy)
    h.courier.progress = Math.floor(
      (Math.min(4999, h.courier.progress) / 5000) * COURIER_RULES.threshold,
    );
  const linked = new Set<number>();
  const link = (kind: number, room: number, id?: number) => {
    const event =
      h.economy.events[id ?? -1] ??
      (legacy ? reserve(h.economy, kind, room, true) : null);
    if (
      !event ||
      event.kind !== kind ||
      linked.has(event.id) ||
      event.blocked ||
      event.left <= 0
    )
      return null;
    linked.add(event.id);
    return event;
  };
  for (const kind of ['laser', 'shotgun'] as const) {
    if (!h.weapons[kind]) {
      delete h.weapons.stored[kind];
      continue;
    }
    const stored = h.weapons.stored[kind],
      event = link(
        kind === 'laser' ? 10 : 11,
        stored?.room ?? h.room,
        stored?.eventId,
      );
    if (event) {
      event.state = 'stored';
      h.weapons.stored[kind] = { eventId: event.id, room: event.room };
    } else {
      h.weapons[kind] = 0;
      delete h.weapons.stored[kind];
    }
  }
  if (h.weapons.active) {
    const a = h.weapons.active,
      event = link(a.kind === 'laser' ? 10 : 11, a.room, a.eventId);
    if (event) {
      event.state = 'active';
      a.eventId = event.id;
      a.room = event.room;
    } else h.weapons.active = null;
  }
  if (h.bonus) {
    const event = link(4, h.bonus.room, h.bonus.eventId);
    if (event) {
      event.state = 'active';
      h.bonus.eventId = event.id;
      h.bonus.room = event.room;
    } else h.bonus = null;
  }
}
export const freshCampaign = (): Campaign => ({
  version: 1,
  ammo: 20,
  hunt: freshHunt(),
  recruit: freshRecruit(),
});
const finiteInt = (x: unknown, fallback = 0, max = 1e12) =>
  typeof x === 'number' && Number.isFinite(x)
    ? Math.max(0, Math.min(max, Math.floor(x)))
    : fallback;
function parseCourier(raw: unknown, legacy = false): CourierSave {
  const c = raw as Partial<CourierSave> | null;
  if (!c || typeof c !== 'object') return freshCourier();
  const completed = finiteInt(c.completed);
  const validOrange = (id: unknown) =>
    RECRUIT_HEROES.some((h) => h.id === id && h.rarity === 'orange');
  const reveal =
    c.reveal &&
    c.reveal.serial === completed &&
    completed > 0 &&
    RECRUIT_HEROES.some((h) => h.id === c.reveal?.hero && h.rarity === 'orange')
      ? {
          serial: completed,
          hero: c.reveal.hero,
          heroes:
            Array.isArray(c.reveal.heroes) &&
            c.reveal.heroes.length &&
            c.reveal.heroes.every(validOrange)
              ? c.reveal.heroes
              : [c.reveal.hero],
          newHeroes: Array.isArray(c.reveal.newHeroes)
            ? [...new Set(c.reveal.newHeroes.filter(validOrange))]
            : [],
        }
      : null;
  const bundle = Math.max(1, finiteInt(c.active?.bundle, 1));
  const durability = bundle > 1 ? 3 : 1;
  return {
    progress: finiteInt(
      c.progress,
      0,
      (legacy ? 5000 : COURIER_RULES.threshold) - 1,
    ),
    queued: finiteInt(c.queued),
    completed,
    cooldown: Math.max(0, Math.min(30, Number(c.cooldown) || 0)),
    reveal,
    ...(c.lastReward &&
    c.lastReward.serial === completed &&
    validOrange(c.lastReward.hero)
      ? {
          lastReward: {
            ...c.lastReward,
            heroes:
              Array.isArray(c.lastReward.heroes) &&
              c.lastReward.heroes.every(validOrange)
                ? c.lastReward.heroes
                : [c.lastReward.hero],
            newHeroes: [],
          },
        }
      : {}),
    active:
      !reveal && c.active && typeof c.active === 'object'
        ? {
            armorHits: finiteInt(
              c.active.armorHits,
              0,
              COURIER_RULES.plates * COURIER_RULES.hitsPerPlate * durability,
            ),
            bodyHits: finiteInt(
              c.active.bodyHits,
              0,
              COURIER_RULES.pity * durability - 1,
            ),
            bundle,
            x: Math.max(190, finiteInt(c.active.x, 300, 410)),
            y: Math.max(300, finiteInt(c.active.y, 345, 390)),
          }
        : null,
  };
}
/** Commit the encounter and its hero together, before the acquisition dialog opens. */
export function saveHunt(d: Campaign, h: HuntSave) {
  if (
    h.economy.spentAmmo < d.hunt.economy.spentAmmo ||
    h.economy.paid < d.hunt.economy.paid ||
    h.expedition.points < d.hunt.expedition.points
  )
    return false;
  const ammoRefund = carrierCommitDelta(
    d.hunt.ammoCarrier ?? freshAmmoCarrier(),
    h.ammoCarrier ?? freshAmmoCarrier(),
    h.economy.spentAmmo - d.hunt.economy.spentAmmo,
  );
  if (ammoRefund === null) return false;
  const previous = d.hunt.courier.completed;
  if (h.courier.completed < previous) return false;
  if (h.courier.completed > previous) {
    const reward = h.courier.reveal;
    if (
      h.courier.completed !== previous + 1 ||
      !reward ||
      reward.serial !== h.courier.completed ||
      !RECRUIT_HEROES.some(
        (hero) => hero.id === reward.hero && hero.rarity === 'orange',
      )
    )
      return false;
    const heroes = reward.heroes ?? [reward.hero];
    if (
      !heroes.length ||
      !heroes.every((id) =>
        RECRUIT_HEROES.some(
          (hero) => hero.id === id && hero.rarity === 'orange',
        ),
      )
    )
      return false;
    reward.newHeroes = [
      ...new Set(heroes.filter((id) => !d.recruit.owned[id])),
    ];
    for (const id of heroes) d.recruit.owned[id]++;
  }
  d.ammo += ammoRefund;
  // Do not retain the simulation's mutable object as the committed snapshot.
  d.hunt = structuredClone(h);
  return true;
}
export function parseCampaign(raw: string | null): Campaign {
  try {
    const d = JSON.parse(raw ?? 'null');
    if (d?.version !== 1 || !d.hunt) return freshCampaign();
    const h = d.hunt,
      level = Math.max(1, finiteInt(h.level, 1, 1e6));
    const room = [1, 5, 20, 100].includes(h.room) ? h.room : 1;
    const bonus =
      h.bonus &&
      [1, 5, 20, 100].includes(h.bonus.room) &&
      h.bonus.left > 0 &&
      h.bonus.ammo > 0
        ? {
            left: Math.min(15, Number(h.bonus.left) || 0),
            ammo: finiteInt(h.bonus.ammo, 0, 100),
            room: h.bonus.room,
            points: finiteInt(h.bonus.points),
            eventId: finiteInt(h.bonus.eventId) || undefined,
          }
        : null;
    const result: Campaign = {
      version: 1,
      ammo: finiteInt(d.ammo, 20),
      recruit: {
        spent: finiteInt(d.recruit?.spent),
        owned: Object.fromEntries(
          RECRUIT_HEROES.map((hero) => [
            hero.id,
            finiteInt(d.recruit?.owned?.[hero.id]),
          ]),
        ) as RecruitSave['owned'],
        last: Array.isArray(d.recruit?.last)
          ? d.recruit.last
              .filter((id: unknown) => RECRUIT_HEROES.some((h) => h.id === id))
              .slice(0, 10)
          : [],
      },
      hunt: {
        ammoCarrier: parseAmmoCarrier(h.ammoCarrier),
        economy: (parseEconomy(h.economy) ??
          (h.economy ? freshEconomy() : null)) as EconomySave,
        level,
        xp: Math.min(finiteInt(h.xp), level * 200 - 1),
        kills: finiteInt(h.kills),
        scrap: finiteInt(h.scrap),
        crates: Array.from({ length: 4 }, (_, i) => finiteInt(h.crates?.[i])),
        room,
        bonus,
        courier: parseCourier(h.courier, !h.economy),
        expedition: {
          stage: finiteInt(h.expedition?.stage, 0, 2),
          points: finiteInt(h.expedition?.points),
          // Replay the departure safely after a refresh, never repeat rewards.
          transition:
            h.expedition?.transition &&
            h.expedition.transition.target ===
              finiteInt(h.expedition?.stage, 0, 2) + 1 &&
            h.expedition.transition.target <= 2
              ? { target: h.expedition.transition.target, age: 0 }
              : null,
        },
        weapons: {
          laser: finiteInt(h.weapons?.laser, 0, 1),
          shotgun: finiteInt(h.weapons?.shotgun, 0, 1),
          stored: Object.fromEntries(
            ['laser', 'shotgun']
              .filter(
                (kind) =>
                  h.weapons?.stored?.[kind] &&
                  [1, 5, 20, 100].includes(h.weapons.stored[kind].room),
              )
              .map((kind) => [
                kind,
                {
                  eventId: finiteInt(h.weapons.stored[kind].eventId),
                  room: h.weapons.stored[kind].room,
                },
              ]),
          ),
          active:
            h.weapons?.active &&
            ['laser', 'shotgun'].includes(h.weapons.active.kind) &&
            h.weapons.active.left > 0 &&
            [1, 5, 20, 100].includes(h.weapons.active.room)
              ? {
                  kind: h.weapons.active.kind,
                  left: Math.min(20, h.weapons.active.left),
                  room: h.weapons.active.room,
                  eventId: finiteInt(h.weapons.active.eventId) || undefined,
                }
              : null,
        },
      },
    };
    prepareHuntEconomy(result.hunt);
    return result;
  } catch {
    return freshCampaign();
  }
}

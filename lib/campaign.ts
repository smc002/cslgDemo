import {
  freshRecruit,
  RECRUIT_HEROES,
  QUALITIES,
  type RecruitSave,
  type Quality,
} from './recruit';
import {
  freshHunt,
  parseCampaign as parseLegacyHunt,
  saveHunt as commitHunt,
  type HuntSave,
} from './hunt-save';
import { BALANCE, stageAmmo } from './balance';
import {
  freshFacilities,
  cityBuilding,
  cityCapacity,
  citySpeed,
  cityYield,
  cityCost,
  cityUpgradeBlock,
  type CityKind,
  type SupportKind,
} from './city';
export { freshHunt } from './hunt-save';
export type Growth = { quality: Quality; stars: number; used: number };
export type Building = { level: number; collectedAt: number };
export type Campaign = {
  version: 2;
  bestWave: number;
  bestStage: number;
  ammo: number;
  ticketsEarned: number;
  recruit: RecruitSave;
  hunt: HuntSave;
  growth: Record<string, Growth>;
  lineup: number[];
  city: {
    unlocked: boolean;
    materials: number;
    workshop: Building;
    factory: Building;
    facilities: Record<SupportKind, Building>;
  };
  emergency: { used: number; nextAt: number };
  tutorial: number;
  notice: string;
  revision: number;
};
export const KEY = 'mori.demo.campaign.v2';
const LEASE = 'mori.demo.lease.v2';
export const freshCampaign = (): Campaign => {
  const recruit = freshRecruit();
  ['shield', 'medic', 'drone'].forEach((id) => (recruit.owned[id] = 1));
  return {
    version: 2,
    bestWave: 0,
    bestStage: 0,
    ammo: 0,
    ticketsEarned: 0,
    recruit,
    hunt: freshHunt(),
    growth: {},
    lineup: [0, 1, 2, -1, -1, -1, -1, -1, -1],
    city: {
      unlocked: false,
      materials: 0,
      workshop: { level: 0, collectedAt: 0 },
      factory: { level: 0, collectedAt: 0 },
      facilities: freshFacilities(),
    },
    emergency: { used: 0, nextAt: 0 },
    tutorial: 0,
    notice: '先遣队已集结。布置坦克、治疗和输出，夺回第一批黑金弹。',
    revision: 0,
  };
};
const integer = (n: unknown, fallback = 0) =>
  typeof n === 'number' && Number.isSafeInteger(n) && n >= 0
    ? Math.min(n, 1e9)
    : fallback;
export const slotsUnlocked = (d: Campaign) =>
  d.bestStage >= BALANCE.thirdLane
    ? 9
    : d.bestStage >= BALANCE.secondLane
      ? 6
      : 3;
export const growthOf = (d: Campaign, id: string): Growth =>
  d.growth[id] ?? {
    quality: RECRUIT_HEROES.find((h) => h.id === id)?.rarity ?? 'blue',
    stars: 1,
    used: 0,
  };
export function heroPower(d: Campaign, index: number) {
  const h = RECRUIT_HEROES[index],
    g = growthOf(d, h.id);
  return (
    (1 + (d.hunt.level - 1) * 0.16) *
    (1 + QUALITIES.indexOf(g.quality) * 0.18 + (g.stars - 1) * 0.1)
  );
}
export function validLineup(d: Campaign, value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === 9 &&
    value.every(
      (n, i) =>
        Number.isInteger(n) &&
        n >= -1 &&
        n < 9 &&
        (i < slotsUnlocked(d)
          ? n < 0 || d.recruit.owned[RECRUIT_HEROES[n].id] > 0
          : n === -1),
    ) &&
    new Set(value.filter((n) => n >= 0)).size ===
      value.filter((n) => n >= 0).length
  );
}
export function autoLineup(d: Campaign) {
  const list = RECRUIT_HEROES.filter((h) => d.recruit.owned[h.id] > 0);
  const next = Array(9).fill(-1);
  for (let i = 0; i < slotsUnlocked(d); i++) {
    const role = ['坦克', '治疗', '输出'][i % 3];
    const h = list.find((h) => h.role === role && !next.includes(h.index));
    if (h) next[i] = h.index;
  }
  d.lineup = next;
}
export function parseCampaign(raw: string | null): Campaign {
  try {
    const v = JSON.parse(raw ?? 'null');
    if (v?.version !== 2) return freshCampaign();
    const d = freshCampaign();
    d.bestStage = integer(v.bestStage);
    d.bestWave = d.bestStage * 3;
    d.ammo = integer(v.ammo);
    d.ticketsEarned = integer(v.ticketsEarned);
    const legacy = parseLegacyHunt(
      JSON.stringify({
        version: 1,
        ammo: d.ammo,
        recruit: v.recruit,
        hunt: v.hunt,
      }),
    );
    d.recruit = legacy.recruit;
    d.hunt = legacy.hunt;
    d.recruit.spent = Math.min(d.ticketsEarned, d.recruit.spent);
    for (const h of RECRUIT_HEROES) {
      const g = v.growth?.[h.id];
      if (g)
        d.growth[h.id] = {
          quality:
            QUALITIES.includes(g.quality) &&
            QUALITIES.indexOf(g.quality) >= QUALITIES.indexOf(h.rarity)
              ? g.quality
              : h.rarity,
          stars: Math.max(1, Math.min(3, integer(g.stars, 1))),
          used: Math.min(
            Math.max(0, d.recruit.owned[h.id] - 1),
            integer(g.used),
          ),
        };
    }
    d.city = {
      unlocked: d.bestStage >= BALANCE.cityUnlock,
      materials: integer(v.city?.materials),
      workshop: {
        level: Math.min(10, integer(v.city?.workshop?.level)),
        collectedAt: Math.min(
          Date.now(),
          Number(v.city?.workshop?.collectedAt) || Date.now(),
        ),
      },
      factory: {
        level: Math.min(10, integer(v.city?.factory?.level)),
        collectedAt: Math.min(
          Date.now(),
          Number(v.city?.factory?.collectedAt) || Date.now(),
        ),
      },
      facilities: freshFacilities(),
    };
    for (const kind of Object.keys(d.city.facilities) as SupportKind[]) {
      const previous = v.city?.facilities?.[kind];
      d.city.facilities[kind].level = Math.min(
        10,
        integer(previous?.level, kind === 'hq' ? 1 : 0),
      );
    }
    // Preserve existing production levels on migration; never downgrade an old base.
    d.city.facilities.hq.level = Math.max(
      1,
      d.city.facilities.hq.level,
      d.city.workshop.level,
      d.city.factory.level,
    );
    d.emergency = {
      used: Math.min(3, integer(v.emergency?.used)),
      nextAt: Math.max(0, Number(v.emergency?.nextAt) || 0),
    };
    d.tutorial = integer(v.tutorial);
    d.notice = typeof v.notice === 'string' ? v.notice.slice(0, 220) : '';
    d.revision = integer(v.revision);
    if (validLineup(d, v.lineup)) d.lineup = v.lineup;
    else autoLineup(d);
    return d;
  } catch {
    return freshCampaign();
  }
}
export function completeStage(d: Campaign, stage: number, now = Date.now()) {
  if (!Number.isSafeInteger(stage) || stage !== d.bestStage + 1) return false;
  d.bestStage = stage;
  d.bestWave = stage * 3;
  d.ammo += stageAmmo(stage);
  d.notice = `第 ${stage} 关首通 · 黑金弹 +${stageAmmo(stage)}`;
  if (stage === 1) d.notice += '。禁区猎场已开放，前往猎场开火提升全队等级。';
  if (stage === 2) {
    ['samurai', 'guitar', 'assassin'].forEach((id) => d.recruit.owned[id]++);
    d.city = {
      unlocked: true,
      materials: 100,
      workshop: { level: 1, collectedAt: now },
      factory: { level: 0, collectedAt: now },
      facilities: freshFacilities(now),
    };
    d.notice += '。第二路与内城开放，三名援军抵达；工坊修复，建材 +100。';
    autoLineup(d);
  }
  if (stage === 4) {
    ['minigun', 'priest', 'sniper'].forEach((id) => d.recruit.owned[id]++);
    autoLineup(d);
    d.notice += '。第三路开放，三名援军抵达。';
  }
  return true;
}
export function saveHunt(d: Campaign, h: HuntSave) {
  const before = Math.floor(d.hunt.expedition.points / BALANCE.corePerTicket),
    level = d.hunt.level;
  const adapter = {
    version: 1 as const,
    ammo: d.ammo,
    recruit: d.recruit,
    hunt: d.hunt,
  };
  if (!commitHunt(adapter, h)) return false;
  d.hunt = adapter.hunt;
  d.recruit = adapter.recruit;
  const tickets =
    Math.floor(h.expedition.points / BALANCE.corePerTicket) - before;
  if (tickets > 0) {
    d.ticketsEarned += tickets;
    d.notice = `能量核心阶段奖励 · 抽卡券 +${tickets}`;
  }
  if (h.level > level)
    d.notice = `全队提升至 Lv.${h.level}！${tickets > 0 ? `抽卡券 +${tickets}，已自动到账。` : '所有已拥有与新招募英雄共享等级。'}`;
  return true;
}
export function promoteHero(d: Campaign, id: string) {
  if (!d.recruit.owned[id]) return false;
  const g = { ...growthOf(d, id) },
    rank = QUALITIES.indexOf(g.quality);
  if (g.stars === 3 && rank === 3) return false;
  const cost = g.stars === 3 ? 3 : g.stars;
  if (d.recruit.owned[id] - 1 - g.used < cost) return false;
  g.used += cost;
  if (g.stars === 3) {
    g.quality = QUALITIES[rank + 1];
    g.stars = 1;
  } else g.stars++;
  d.growth[id] = g;
  d.notice = `${RECRUIT_HEROES.find((h) => h.id === id)?.name}培养成功`;
  return true;
}
export function production(
  d: Campaign,
  kind: 'workshop' | 'factory',
  now = Date.now(),
) {
  const b = d.city[kind],
    period =
      (kind === 'workshop' ? BALANCE.workshopPeriod : BALANCE.factoryPeriod) *
      1000 *
      citySpeed(d);
  if (!d.city.unlocked || !b.level)
    return { amount: 0, cycles: 0, period, next: 0 };
  const cycles = Math.min(
    cityCapacity(d),
    Math.max(0, Math.floor((now - b.collectedAt) / period)),
  );
  return {
    amount:
      cycles *
      Math.floor(b.level * (kind === 'workshop' ? 10 : 15) * cityYield(d)),
    cycles,
    period,
    next: Math.ceil(
      Math.max(0, period - (Math.max(0, now - b.collectedAt) % period)) / 1000,
    ),
  };
}
export function collectCity(
  d: Campaign,
  kind: 'workshop' | 'factory',
  now = Date.now(),
) {
  const p = production(d, kind, now);
  if (!p.amount) return false;
  if (kind === 'workshop') d.city.materials += p.amount;
  else d.ammo += p.amount;
  const b = d.city[kind];
  b.collectedAt = now - (Math.max(0, now - b.collectedAt) % p.period);
  return true;
}
export function buildCity(d: Campaign, kind: CityKind, now = Date.now()) {
  const b = cityBuilding(d, kind),
    cost = cityCost(d, kind);
  if (cityUpgradeBlock(d, kind)) return false;
  const fractions: Partial<Record<'workshop' | 'factory', number>> = {};
  // Settle production at the old rate before changing global production bonuses.
  if (kind === 'power' || kind === 'research' || kind === 'warehouse') {
    for (const producer of ['workshop', 'factory'] as const) {
      collectCity(d, producer, now);
      const period = production(d, producer, now).period;
      fractions[producer] =
        (Math.max(0, now - d.city[producer].collectedAt) % period) / period;
    }
  } else if (kind === 'workshop' || kind === 'factory')
    collectCity(d, kind, now);
  d.city.materials -= cost;
  b.level++;
  b.collectedAt = now;
  for (const producer of ['workshop', 'factory'] as const) {
    if (fractions[producer] !== undefined)
      d.city[producer].collectedAt =
        now - fractions[producer]! * production(d, producer, now).period;
  }
  return true;
}
export function emergencySupply(d: Campaign, now = Date.now()) {
  if (
    d.bestStage < 1 ||
    d.ammo >= 5 ||
    d.emergency.used >= 3 ||
    now < d.emergency.nextAt
  )
    return false;
  d.ammo += 80;
  d.emergency.used++;
  d.emergency.nextAt = now + BALANCE.emergencyCooldown;
  d.notice = '应急补给抵达 · 黑金弹 +80';
  return true;
}
let data = freshCampaign(),
  initialized = false;
const listeners = new Set<() => void>(),
  owner = `${Date.now()}-${Math.random()}`;
const emit = () => listeners.forEach((f) => f());
export const campaign = {
  init() {
    if (initialized || typeof window === 'undefined') return;
    initialized = true;
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) {
        const old = localStorage.getItem('mori.demo.campaign.v1');
        if (old) localStorage.setItem('mori.demo.campaign.v1.backup', old);
      }
      data = parseCampaign(raw);
    } catch {}
    window.addEventListener('storage', (e) => {
      if (e.key === KEY) {
        data = parseCampaign(e.newValue);
        emit();
      }
    });
  },
  read() {
    return data;
  },
  owns() {
    if (typeof window === 'undefined') return true;
    try {
      const l = JSON.parse(localStorage.getItem(LEASE) ?? 'null');
      return !l || l.owner === owner || l.until < Date.now();
    } catch {
      return true;
    }
  },
  claim(force = false) {
    if (!force && !this.owns()) return false;
    try {
      localStorage.setItem(
        LEASE,
        JSON.stringify({ owner, until: Date.now() + 10000 }),
      );
    } catch {}
    return true;
  },
  releaseLease() {
    if (this.owns())
      try {
        localStorage.removeItem(LEASE);
      } catch {}
  },
  update(fn: (d: Campaign) => void) {
    this.init();
    if (!this.owns()) return false;
    const next = structuredClone(data);
    fn(next);
    next.revision++;
    data = next;
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {}
    emit();
    return true;
  },
  completeStage(stage: number) {
    if (stage > data.bestStage)
      this.update((d) => {
        completeStage(d, stage);
      });
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  reset() {
    this.update((d) => Object.assign(d, freshCampaign()));
  },
};

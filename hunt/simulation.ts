import {
  HERO_ART,
  ZOMBIE_NAMES,
  TOY_META,
  TOY_SCALE,
  ZOMBIE_ART,
} from '../shared/toy-art';
import {
  freshHunt,
  freshCourier,
  COURIER_RULES,
  freshExpedition,
  freshWeapons,
  prepareHuntEconomy,
  type WeaponKind,
  type HuntSave,
} from '../lib/hunt-save';
import { type RecruitId } from '../lib/recruit';
import { vehicleMuzzle, PLATFORM_RIG } from './vehicle-rig';
import { zombieFacing, type ZombieFacing } from './zombie-animation';
import { HUNT_ARRIVAL_SECONDS } from './arrival-vfx';
import { preparePatrol, patrolSpeed, steerPatrol } from './zombie-patrol';
import { AMMO_CARRIER, carrierQueued } from '../lib/ammo-carrier';
import {
  specialPopulation,
  specialSpawnBlock,
  needsOrdinaryReinforcement,
} from '../lib/hunt-population';
import {
  ECONOMY,
  FUNCTIONAL,
  selectRewardEncounter,
  commitRewardEncounter,
  functional,
  reserve,
  payEvent,
  refundEvent,
  receipt,
  consumeReceipt,
  auditEconomy,
  type EconomyActor,
  type EconomyBullet,
} from '../lib/hunt-economy';
export const COURIER_KIND = 9;
export const COURIER_VICTORY_SECONDS = 3.2;
export const STAGES = [
  { name: '基地外围', need: 0, unlock: '全部特殊僵尸 · 演示猎场' },
  { name: '冰封补给站', need: 10000, unlock: '冰封补给站 · 全种类遭遇' },
  { name: '废弃变电站', need: 30000, unlock: '废弃变电站 · 全种类遭遇' },
] as const;
export const WEAPON_NAMES = { laser: '激光枪', shotgun: '散弹枪' };
export const TRANSITION_SECONDS = 6.8;
export const courierScale = (bundle = 1) => (bundle > 1 ? 3 : 1);

export const ARENA = {
  w: 600,
  h: 800,
  gunX: 300,
  gunY: 650,
  platform: PLATFORM_RIG.bounds,
};
export const SCATTER_HITS = 6;
// Functional targets are funded separately; this pool contains ordinary targets only.
export const SPAWN_WEIGHTS = [70, 20, 7, 3];
export const ROOMS = [
  { m: 1, need: 1, name: '巡逻区' },
  { m: 5, need: 500, name: '封锁区' },
  { m: 20, need: 2000, name: '危险区' },
  { m: 100, need: 10000, name: '禁区' },
];
export const SPECIES = [
  {
    name: ZOMBIE_NAMES[0],
    p: 0.4,
    points: 10,
    radius: 21,
    size: 61,
    speed: 25,
    color: '#c6e474',
  },
  {
    name: ZOMBIE_NAMES[1],
    p: 0.2,
    points: 25,
    radius: 18,
    size: 58,
    speed: 44,
    color: '#83ddd2',
  },
  {
    name: ZOMBIE_NAMES[2],
    p: 0.08,
    points: 80,
    radius: 27,
    size: 78,
    speed: 19,
    color: '#bec9dc',
  },
  {
    name: ZOMBIE_NAMES[3],
    p: 0.02,
    points: 400,
    radius: 39,
    size: 114,
    speed: 13,
    color: '#f7a65a',
  },
  {
    name: ZOMBIE_NAMES[4],
    p: 0.06,
    points: 50,
    radius: 27,
    size: 84,
    speed: 22,
    color: '#ffdc5f',
  },
  {
    name: ZOMBIE_NAMES[5],
    p: 0.12,
    points: 100,
    radius: 25,
    size: 75,
    speed: 24,
    color: '#ff804e',
  },
  {
    name: ZOMBIE_NAMES[6],
    p: 0,
    points: 120,
    radius: 27,
    size: 79,
    speed: 21,
    color: '#c484ff',
  },
  {
    name: ZOMBIE_NAMES[7],
    p: 0.1,
    points: 120,
    radius: 24,
    size: 73,
    speed: 27,
    color: '#43dedb',
  },
  {
    name: ZOMBIE_NAMES[8],
    p: 0.15,
    points: 90,
    radius: 25,
    size: 74,
    speed: 22,
    color: '#8be5ff',
  },
  {
    name: ZOMBIE_NAMES[9],
    p: COURIER_RULES.chance,
    points: 0,
    radius: 49,
    size: 158,
    speed: 14,
    color: '#ffb04e',
  },
  {
    name: ZOMBIE_NAMES[10],
    p: 0.12,
    points: 100,
    radius: 27,
    size: 83,
    speed: 22,
    color: '#5deaff',
  },
  {
    name: ZOMBIE_NAMES[11],
    p: 0.12,
    points: 100,
    radius: 28,
    size: 85,
    speed: 21,
    color: '#ffae70',
  },
  {
    name: ZOMBIE_NAMES[12],
    p: 0,
    points: 0,
    radius: 27,
    size: 86,
    speed: 18,
    color: '#f3cc64',
  },
] as const;
export const SPECIAL_LABELS = [
  '',
  '',
  '',
  '',
  '奖励',
  '爆炸',
  '散射',
  '电弧',
  '冰冻',
  '',
  '激光技能',
  '散弹技能',
  '返弹',
];
export const HEROES = HERO_ART.map(([, name]) => name);
export const PRIZES = ['零件箱', '英雄经验箱', '补给券', '稀有物资箱'];
export type Zombie = EconomyActor;
export type Bullet = EconomyBullet;
export type FX = {
  id: number;
  actorId?: number;
  facing?: ZombieFacing;
  kind:
    | 'hit'
    | 'kill'
    | 'shot'
    | 'bounce'
    | 'blast'
    | 'scatter'
    | 'arc'
    | 'freeze'
    | 'armorBreak'
    | 'courierArrival'
    | 'laser'
    | 'weapon'
    | 'ammoReturn'
    | 'specialEntry';
  x: number;
  y: number;
  age: number;
  life: number;
  species: number;
  points: number;
  angle: number;
  seed: number;
  endX?: number;
  endY?: number;
};
export type PrizeEvent = { id: number; level: number; node: number };
export type HeroEvent = {
  id: number;
  hero: string;
  level: number;
  age: number;
};
export type HuntIO = {
  ammo: () => number;
  spend: (n: number) => boolean;
  save: (h: HuntSave) => void;
  ownsHero?: (id: RecruitId) => boolean;
};

export function segmentHit(
  x: number,
  y: number,
  dx: number,
  dy: number,
  cx: number,
  cy: number,
  r: number,
) {
  const ox = x - cx,
    oy = y - cy,
    c = ox * ox + oy * oy - r * r;
  if (c <= 0) return 0;
  const a = dx * dx + dy * dy;
  if (!a) return null;
  const b = 2 * (ox * dx + oy * dy),
    discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;
  const t = (-b - Math.sqrt(discriminant)) / (2 * a);
  return t >= 0 && t <= 1 ? t : null;
}

export class HuntGame {
  save: HuntSave;
  zombies: Zombie[] = [];
  bullets: Bullet[] = [];
  effects: FX[] = [];
  prizes: PrizeEvent[] = [];
  heroes: HeroEvent[] = [];
  heroQueue: { hero: string; level: number }[] = [];
  time = 0;
  firing = false;
  active = false;
  paused = false;
  aim = { x: 300, y: 250 };
  visibleTop = 0;
  zombieScale = 1;
  intro = 0;
  arrivalAge: number | null = null;
  finale = 0;
  finalePoints = 0;
  combo = 0;
  comboLife = 0;
  shake = 0;
  progressFlash = 0;
  prizeAge = 0;
  heroClock = 0;
  lastHeroLevel = 1;
  hits = 0;
  fired = 0;
  dry = false;
  armorBreaks = 0;
  courierVictory: {
    actorId?: number;
    facing?: ZombieFacing;
    x: number;
    y: number;
    age: number;
    duration: number;
  } | null = null;
  private id = 0;
  weaponNotice: { text: string; left: number } | null = null;
  weaponPickup: { kind: WeaponKind; eventId: number; left: number } | null =
    null;
  weaponEnding: { kind: WeaponKind; age: number } | null = null;
  private noticedEntrants = new Set<number>();
  private shotClock = 0;
  private tapQueued = false;
  private spawnClock = 0.25;
  private updating = false;
  private persistPending = false;
  private persistClock = 0;
  private pendingBullets: Bullet[] = [];
  private pendingReplacements = 0;
  private carrierSettledThisTick = false;
  constructor(
    public io: HuntIO,
    saved = freshHunt(),
    private random: () => number = Math.random,
  ) {
    this.save = structuredClone(saved);
    this.save.courier ??= freshCourier();
    this.save.courier.cooldown ??= 0;
    this.save.expedition ??= freshExpedition();
    this.save.weapons ??= freshWeapons();
    if (this.save.courier.reveal) this.save.courier.reveal.newHeroes ??= [];
    this.lastHeroLevel = saved.level;
    prepareHuntEconomy(this.save);
    this.hydrateArena();
    this.ensureCourier();
    this.ensureAmmoCarrier();
  }
  restoreSave(saved: HuntSave) {
    this.arrivalAge = null;
    this.courierVictory = null;
    this.weaponEnding = null;
    this.weaponPickup = null;
    this.noticedEntrants.clear();
    this.effects = [];
    this.carrierSettledThisTick = false;
    this.save = structuredClone(saved);
    this.save.courier ??= freshCourier();
    this.save.courier.cooldown ??= 0;
    this.save.expedition ??= freshExpedition();
    this.save.weapons ??= freshWeapons();
    if (this.save.courier.reveal) this.save.courier.reveal.newHeroes ??= [];
    prepareHuntEconomy(this.save);
    this.hydrateArena();
    this.pendingBullets = [];
    this.release();
    this.ensureCourier();
    this.ensureAmmoCarrier();
  }
  beginFirstEntry() {
    if (
      this.save.arrivalSeen ||
      this.arrivalAge !== null ||
      this.save.courier.reveal ||
      this.save.expedition.transition
    )
      return false;
    this.arrivalAge = 0;
    this.release();
    return true;
  }
  get courierBlocksCombat() {
    return !!this.save.courier.reveal && !this.save.courier.reveal.tickets;
  }
  private hydrateArena() {
    const runtime = this.save.economy.runtime;
    this.intro = 0;
    this.zombies = [];
    this.bullets = [];
    this.pendingBullets = [];
    this.pendingReplacements = 0;
    if (runtime) {
      this.id = Math.max(
        runtime.id,
        ...runtime.zombies.map((z) => z.id),
        ...runtime.bullets.map((b) => b.id),
        0,
      );
      this.zombies = structuredClone(runtime.zombies);
      this.bullets = structuredClone(runtime.bullets);
      this.spawnClock = runtime.spawnClock;
      this.intro = runtime.intro;
    } else for (let i = 0; i < 17; i++) this.spawn(undefined, true);
    let carrierRestored = false;
    this.zombies = this.zombies.filter((z) => {
      if (z.kind !== AMMO_CARRIER.kind)
        return z.kind !== COURIER_KIND || !!this.save.courier.active;
      const a = this.save.ammoCarrier.active;
      if (!a || carrierRestored) return false;
      carrierRestored = true;
      Object.assign(z, {
        x: a.x,
        y: a.y,
        vx: a.vx,
        vy: a.vy,
        hitsLeft: AMMO_CARRIER.hits - a.hits.length,
      });
      return true;
    });
    this.id = Math.max(this.id, ...(this.save.ammoCarrier.active?.hits ?? []));
    this.settleEvents();
  }
  get effectiveRoom() {
    return (
      this.save.weapons.active?.room ?? this.save.bonus?.room ?? this.save.room
    );
  }
  private eligible(kind: number) {
    if (!this.unlocked(kind)) return false;
    if (kind === 4)
      return !Object.values(this.save.economy.events).some((e) => e.kind === 4);
    if (kind === 10 || kind === 11)
      return (
        !this.save.weapons.laser &&
        !this.save.weapons.shotgun &&
        !this.save.weapons.active &&
        !Object.values(this.save.economy.events).some(
          (e) => e.kind === 10 || e.kind === 11,
        )
      );
    return true;
  }
  private checkRewards(dt: number) {
    const e = this.save.economy;
    e.checkLeft -= dt;
    if (e.checkLeft > 0) return;
    e.checkLeft = ECONOMY.checkSeconds;
    const population = specialPopulation(this.zombies);
    // Capacity is separate from eligibility: do not redraw a funded pending
    // candidate, consume an interlude or reserve its money while the field is full.
    if (
      population.special >= population.capacity ||
      (e.nextKind !== null && specialSpawnBlock(this.zombies, e.nextKind))
    )
      return;
    const kind = selectRewardEncounter(
      e,
      this.effectiveRoom,
      FUNCTIONAL.filter((k) => this.eligible(k)),
      this.random,
    );
    if (kind !== null) {
      const count = this.zombies.length;
      this.spawn(kind, false, true);
      if (this.zombies.length > count) commitRewardEncounter(e, kind);
    }
  }
  private settleEvents() {
    const e = this.save.economy;
    const activeWeapon = this.save.weapons.active;
    if (
      activeWeapon &&
      (!e.events[activeWeapon.eventId ?? -1] ||
        e.events[activeWeapon.eventId!].blocked ||
        e.events[activeWeapon.eventId!].left === 0)
    )
      this.endWeapon();
    const bonus = this.save.bonus;
    if (
      bonus &&
      (!e.events[bonus.eventId ?? -1] ||
        e.events[bonus.eventId!].blocked ||
        e.events[bonus.eventId!].left === 0)
    )
      this.endBonus();
    this.zombies = this.zombies.filter(
      (z) =>
        !functional(z.kind) ||
        (!!e.events[z.eventId ?? -1] && !e.events[z.eventId!].blocked),
    );
    const alive = (b: Bullet) =>
      b.eventId === undefined ||
      (!!e.events[b.eventId] && !e.events[b.eventId].blocked);
    this.bullets = this.bullets.filter(alive);
    this.pendingBullets = this.pendingBullets.filter(alive);
    const owned = new Set<number>();
    for (const obj of [
      ...this.zombies,
      ...this.bullets,
      ...this.pendingBullets,
    ])
      if (obj.eventId !== undefined) owned.add(obj.eventId);
    for (const slot of Object.values(this.save.weapons.stored ?? {}))
      if (slot) owned.add(slot.eventId);
    if (this.save.weapons.active?.eventId)
      owned.add(this.save.weapons.active.eventId);
    if (this.save.bonus?.eventId) owned.add(this.save.bonus.eventId);
    for (const event of Object.values(e.events))
      if (!owned.has(event.id)) refundEvent(e, event.id);
    const receipts = new Set(
      [...this.bullets, ...this.pendingBullets].map((b) => b.receiptId),
    );
    for (const id of Object.keys(e.receipts))
      if (!receipts.has(Number(id))) delete e.receipts[Number(id)];
  }
  private endWeapon() {
    const weapon = this.save.weapons.active;
    if (!weapon) return;
    this.weaponEnding = { kind: weapon.kind, age: 0.001 };
    const e = this.save.economy.events[weapon.eventId ?? -1];
    if (e) e.state = 'draining';
    this.save.weapons.active = null;
    this.release();
    this.weaponNotice = {
      text: `技能结束 · 已恢复 ×${this.effectiveRoom} · 松手再开火`,
      left: 2.5,
    };
  }
  private ensureCourier() {
    const c = this.save.courier;
    if (c.reveal || this.zombies.some((z) => z.kind === COURIER_KIND)) return;
    const fresh = !c.active;
    // An active claim restored without its runtime actor is already earned;
    // restore it even in an old overcrowded save. Only fresh admissions wait.
    if (!c.active) {
      if (
        c.queued <= 0 ||
        this.save.ammoCarrier.active ||
        c.cooldown > 0 ||
        this.save.expedition.transition ||
        specialSpawnBlock(this.zombies, COURIER_KIND)
      )
        return;
      const bundle = c.queued > 5 ? c.queued : 1;
      c.queued -= bundle;
      c.active = { armorHits: 0, bodyHits: 0, x: 300, y: 345, bundle };
    }
    const zombie: Zombie = {
      id: ++this.id,
      kind: COURIER_KIND,
      x: c.active.x,
      y: c.active.y,
      vx: SPECIES[COURIER_KIND].speed,
      vy: 0,
      age: 0,
      hit: 0,
      seed: this.random(),
      frozen: 0,
    };
    if (fresh) this.enterFromEdge(zombie, 2);
    this.zombies.push(zombie);
    c.active.x = zombie.x;
    c.active.y = zombie.y;
    if (fresh) this.fx('courierArrival', c.active.x, c.active.y, COURIER_KIND);
    this.persist();
  }
  private ensureAmmoCarrier() {
    const s = this.save.ammoCarrier;
    if (
      this.carrierSettledThisTick ||
      this.zombies.some((z) => z.kind === AMMO_CARRIER.kind)
    )
      return;
    const fresh = !s.active;
    // Restoring an existing carrier must not lose its earned refund or hits.
    if (!s.active) {
      if (
        this.save.bonus ||
        this.save.weapons.active ||
        this.save.courier.active ||
        this.save.courier.reveal ||
        this.save.expedition.transition ||
        this.intro > 0 ||
        carrierQueued(s, this.save.room) <= 0 ||
        specialSpawnBlock(this.zombies, AMMO_CARRIER.kind)
      )
        return;
      s.active = {
        serial: ++s.serial,
        room: this.save.room,
        refundAmount: AMMO_CARRIER.refund * this.save.room,
        hits: [],
        x: 100,
        y: Math.min(440, Math.max(310, this.visibleTop + 75)),
        vx: 16,
        vy: 8,
      };
      this.weaponNotice = {
        text: `黑金背弹僵尸出现 · 击破返还 ${s.active.refundAmount} 黑金弹`,
        left: 3,
      };
    }
    const zombie: Zombie = {
      id: ++this.id,
      kind: AMMO_CARRIER.kind,
      x: s.active.x,
      y: s.active.y,
      vx: s.active.vx,
      vy: s.active.vy,
      age: 0,
      hit: 0,
      seed: this.random(),
      frozen: 0,
      hitsLeft: AMMO_CARRIER.hits - s.active.hits.length,
    };
    if (fresh) this.enterFromEdge(zombie, 0);
    this.zombies.push(zombie);
    Object.assign(s.active, {
      x: zombie.x,
      y: zombie.y,
      vx: zombie.vx,
      vy: zombie.vy,
    });
    this.persist();
  }
  private hitAmmoCarrier(z: Zombie, b: Bullet) {
    const s = this.save.ammoCarrier,
      a = s.active,
      shot = b.shotId ?? b.id;
    if (!a || a.hits.includes(shot)) return;
    a.hits.push(shot);
    z.hitsLeft = AMMO_CARRIER.hits - a.hits.length;
    if (z.hitsLeft > 0) {
      this.fx('hit', z.x, z.y, AMMO_CARRIER.kind);
      this.persist();
      return;
    }
    const amount = a.refundAmount;
    s.rooms[a.room].claimed++;
    s.active = null;
    this.carrierSettledThisTick = true;
    this.zombies.splice(this.zombies.indexOf(z), 1);
    this.save.kills++;
    this.fx('ammoReturn', z.x, z.y, AMMO_CARRIER.kind, amount);
    const fx = this.effects[this.effects.length - 1];
    fx.life = 2.1;
    this.shake = Math.max(this.shake, 4);
    fx.actorId = z.id;
    fx.facing = zombieFacing(z.vx, z.vy);
    this.weaponNotice = { text: `黑金弹 +${amount} · 已存入弹药库`, left: 3 };
    this.dry = false;
    // saveHunt applies the claim delta and the inventory change in one commit.
    this.persist();
  }
  dismissCourierReward(preserveCombat = false) {
    if (!this.save.courier.reveal) return;
    this.save.courier.lastReward = structuredClone(this.save.courier.reveal);
    this.weaponNotice = {
      text: this.save.courier.reveal.tickets
        ? `抽奖券 +${this.save.courier.reveal.tickets} 已到账 · 可前往英雄页抽奖`
        : `橙色英雄 ×${this.save.courier.reveal.heroes?.length ?? 1} 已入库 · 可一键查看`,
      left: 3,
    };
    this.courierVictory = null;
    this.save.courier.reveal = null;
    this.save.courier.cooldown = COURIER_RULES.cooldown;
    if (!preserveCombat) {
      this.bullets = [];
      this.pendingBullets = [];
      this.release();
    }
    this.settleEvents();
    this.ensureCourier();
    this.persist();
  }
  skipCourierVictory() {
    this.courierVictory = null;
    this.release();
  }
  unlocked(kind: number) {
    return Number.isInteger(kind) && kind >= 0 && kind < SPECIES.length;
  }
  get sceneReady() {
    const e = this.save.expedition;
    return (
      !e.transition &&
      e.stage < 2 &&
      e.points >= STAGES[e.stage + 1].need &&
      !this.save.courier.active &&
      !this.save.ammoCarrier.active &&
      !this.save.courier.reveal
    );
  }
  startTransition() {
    if (!this.sceneReady) return false;
    this.release();
    this.bullets = [];
    this.pendingBullets = [];
    this.pendingReplacements = 0;
    this.prizes = [];
    this.heroes = [];
    this.heroQueue = [];
    this.save.expedition.transition = {
      target: this.save.expedition.stage + 1,
      age: 0,
    };
    this.persist();
    return true;
  }
  activateWeapon(kind: WeaponKind) {
    const weapons = this.save.weapons;
    const slot = weapons.stored?.[kind];
    if (
      !this.active ||
      this.paused ||
      weapons.active ||
      !weapons[kind] ||
      !slot ||
      !this.save.economy.events[slot.eventId] ||
      this.courierBlocksCombat ||
      this.arrivalAge !== null ||
      this.save.expedition.transition
    )
      return false;
    weapons[kind] = 0;
    if (this.weaponPickup?.kind === kind) this.weaponPickup = null;
    delete weapons.stored![kind];
    weapons.active = {
      kind,
      left: 20,
      room: slot.room,
      eventId: slot.eventId,
    };
    this.weaponEnding = null;
    this.save.economy.events[slot.eventId].state = 'active';
    this.release();
    this.dry = false;
    this.weaponNotice = {
      text: `${WEAPON_NAMES[kind]}就绪 · 自动切换 ×${slot.room}`,
      left: 2.4,
    };
    this.fx('weapon', ARENA.gunX, ARENA.gunY, kind === 'laser' ? 10 : 11);
    this.persist();
    return true;
  }
  private grantWeapon(kind: WeaponKind, eventId: number) {
    const event = this.save.economy.events[eventId];
    if (!event || this.save.weapons[kind]) return;
    this.save.weapons[kind] = 1;
    this.save.weapons.stored ??= {};
    this.save.weapons.stored[kind] = { eventId, room: event.room };
    event.state = 'stored';
    this.weaponPickup = { kind, eventId, left: 5 };
    this.weaponNotice = {
      text: `获得 ×${event.room} ${WEAPON_NAMES[kind]}！点击技能启用`,
      left: 3,
    };
  }
  private targetRadius(z: Zombie) {
    return (
      SPECIES[z.kind].radius *
      (z.kind === COURIER_KIND && (this.save.courier.active?.bundle ?? 1) > 1
        ? 1.4
        : 1)
    );
  }
  private hitCourier(z: Zombie, b: Bullet) {
    const c = this.save.courier,
      target = c.active;
    if (!target || c.reveal) return;
    const bundle = target.bundle ?? 1;
    const durability = courierScale(bundle);
    const perPlate = COURIER_RULES.hitsPerPlate * durability;
    const armorMax = COURIER_RULES.plates * perPlate;
    if (target.armorHits < armorMax) {
      target.armorHits++;
      if (target.armorHits % perPlate === 0) {
        const points = COURIER_RULES.platePoints * bundle;
        this.addPoints(points, false);
        this.fx(
          'armorBreak',
          z.x,
          z.y,
          COURIER_KIND,
          points,
          target.armorHits / perPlate,
        );
        this.armorBreaks++;
        this.shake = Math.max(this.shake, 7);
        this.progressFlash = 0.5;
      } else this.fx('hit', z.x, z.y, COURIER_KIND);
      this.persist();
      return;
    }
    target.bodyHits++;
    const chance = Math.min(1, COURIER_RULES.chance * (b.bonus ? 5 : 1));
    if (
      target.bodyHits >= COURIER_RULES.pity * durability ||
      this.random() < chance
    ) {
      this.zombies.splice(this.zombies.indexOf(z), 1);
      this.save.kills++;
      c.completed++;
      c.active = null;
      c.reveal = {
        serial: c.completed,
        tickets: COURIER_RULES.ticketsPerBundle * bundle,
      };
      this.courierVictory = {
        actorId: z.id,
        facing: zombieFacing(z.vx, z.vy),
        x: z.x,
        y: z.y,
        age: 0,
        duration: COURIER_VICTORY_SECONDS,
      };
      this.shake = 10;
    } else this.fx('hit', z.x, z.y, COURIER_KIND);
    this.persist();
  }
  persist() {
    if (this.updating) {
      this.persistPending = true;
      return;
    }
    this.save.economy.runtime = {
      id: this.id,
      zombies: structuredClone(this.zombies),
      bullets: structuredClone([...this.bullets, ...this.pendingBullets]),
      spawnClock: this.spawnClock,
      intro: this.intro,
    };
    this.io.save(structuredClone(this.save));
  }
  setActive(value: boolean) {
    this.active = value;
    this.release();
    this.persist();
  }
  release(finishTap = false) {
    this.firing = false;
    if (!finishTap) this.tapQueued = false;
  }
  press(x: number, y: number) {
    this.aim = { x, y };
    if (
      !this.active ||
      this.paused ||
      this.intro > 0 ||
      this.arrivalAge !== null ||
      this.save.expedition.transition ||
      this.courierBlocksCombat
    )
      return;
    // Repeated aim/auto-fire updates must not reset an in-flight shot cooldown.
    const wasFiring = this.firing;
    this.firing = true;
    this.dry = false;
    if (!wasFiring) this.tapQueued = true;
  }
  selectRoom(m: number) {
    const r = ROOMS.find((r) => r.m === m);
    if (
      !r ||
      this.save.bonus ||
      this.save.weapons.active ||
      this.save.expedition.transition ||
      this.courierBlocksCombat ||
      this.arrivalAge !== null ||
      this.io.ammo() < r.need
    )
      return false;
    this.save.room = m;
    this.release();
    this.dry = false;
    this.persist();
    return true;
  }
  spawn(kind?: number, _inside = false, _atEdge = false) {
    if (kind === AMMO_CARRIER.kind) {
      this.ensureAmmoCarrier();
      return;
    }
    if (kind === COURIER_KIND) {
      this.ensureCourier();
      return;
    }
    if (
      kind === 4 &&
      (this.save.bonus || this.zombies.some((z) => z.kind === 4))
    )
      return;
    let roll = this.random() * SPAWN_WEIGHTS.reduce((a, b) => a + b, 0);
    if (kind === undefined) {
      kind = 0;
      while (kind < SPAWN_WEIGHTS.length - 1 && roll >= SPAWN_WEIGHTS[kind]) {
        roll -= SPAWN_WEIGHTS[kind++];
      }
    }
    if (!this.unlocked(kind)) kind = 0;
    let eventId: number | undefined;
    if (functional(kind)) {
      if (!this.eligible(kind) || specialSpawnBlock(this.zombies, kind)) return;
      const event = reserve(this.save.economy, kind, this.effectiveRoom);
      if (!event) return;
      eventId = event.id;
    }
    const zombie: Zombie = {
      id: ++this.id,
      kind,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      age: 0,
      hit: 0,
      seed: this.random(),
      hitsLeft: kind === 6 ? SCATTER_HITS : undefined,
      frozen: 0,
      eventId,
    };
    this.enterFromEdge(zombie);
    this.zombies.push(zombie);
  }
  /** Spawn the entire silhouette outside the viewport, including at 150% scale. */
  private enterFromEdge(z: Zombie, side = Math.floor(this.random() * 3)) {
    const species = SPECIES[z.kind];
    const bounds = TOY_META[ZOMBIE_ART[z.kind]].bounds;
    const bundle =
      z.kind === COURIER_KIND && (this.save.courier.active?.bundle ?? 1) > 1
        ? 1.4
        : 1;
    const height = species.size * 1.12 * TOY_SCALE * 1.5 * bundle;
    const halfWidth =
      (height * (bounds[2] - bounds[0])) / (bounds[3] - bounds[1]) / 2 + 14;
    const top = Math.max(120, this.visibleTop + 95);
    let laneY = top + this.random() * Math.max(0, 440 - top);
    let laneX = 100 + this.random() * 400;
    // Prefer a visible gap at the same edge. Only the entry lane changes;
    // patrol and arrival speeds remain identical, including special targets.
    const neighbours = this.zombies.filter(
      (other) => other.entry?.side === side,
    );
    const gap = (value: number) =>
      neighbours.length
        ? Math.min(
            ...neighbours.map((other) =>
              Math.abs(value - (side === 2 ? other.entry!.x : other.entry!.y)),
            ),
          )
        : Infinity;
    const original = side === 2 ? laneX : laneY;
    if (gap(original) < 60) {
      const low = side === 2 ? 75 : top,
        high = side === 2 ? 525 : 440;
      const choices = Array.from(
        { length: 6 },
        (_, i) => low + ((high - low) * i) / 5,
      );
      const best = choices.reduce((a, b) => (gap(a) >= gap(b) ? a : b));
      if (side === 2) laneX = best;
      else laneY = best;
    }
    const special = z.kind === COURIER_KIND || z.kind === AMMO_CARRIER.kind;
    const targetX = special
      ? z.x
      : side === 0
        ? halfWidth + 16
        : side === 1
          ? 600 - halfWidth - 16
          : laneX;
    const targetY = special ? Math.max(top, z.y) : side === 2 ? top : laneY;
    // Broad, independent inward headings instead of a shared convergence point.
    const cruiseAngle =
      side === 0
        ? (this.random() - 0.5) * 1.8
        : side === 1
          ? Math.PI + (this.random() - 0.5) * 1.8
          : Math.PI / 2 + (this.random() - 0.5) * 1.9;
    const cruiseSpeed = special
      ? Math.hypot(z.vx, z.vy)
      : patrolSpeed(z, species.speed);
    if (!special) preparePatrol(z, species.speed).heading = cruiseAngle;
    z.entry = {
      x: targetX,
      y: targetY,
      vx: special ? z.vx : Math.cos(cruiseAngle) * cruiseSpeed,
      vy: special ? z.vy : Math.sin(cruiseAngle) * cruiseSpeed,
      side,
    };
    z.x = side === 0 ? -halfWidth : side === 1 ? 600 + halfWidth : targetX;
    z.y =
      side === 2
        ? this.visibleTop - species.size * 0.37 * 1.5 * bundle - 16
        : targetY;
    const angle = Math.atan2(targetY - z.y, targetX - z.x);
    const speed = Math.hypot(z.entry.vx, z.entry.vy);
    z.vx = Math.cos(angle) * speed;
    z.vy = Math.sin(angle) * speed;
  }
  setViewportTop(top: number) {
    const delta = top - this.visibleTop;
    this.visibleTop = top;
    // Constructor spawns precede the first canvas measurement. Move those still
    // unadvanced entrants with the viewport, never teleport active enemies.
    for (const z of this.zombies) {
      if (!z.entry || z.age !== 0) continue;
      z.y = z.entry.side === 2 ? z.y + delta : Math.min(440, z.y + delta);
      z.entry.y = Math.min(440, z.entry.y + delta);
    }
  }
  private keepOutsidePlatform(z: Zombie) {
    const footprint = Math.max(
      SPECIES[z.kind].radius,
      SPECIES[z.kind].size *
        0.6 *
        (z.kind === COURIER_KIND && (this.save.courier.active?.bundle ?? 1) > 1
          ? 1.4
          : 1),
    );
    const left = ARENA.platform.left - footprint,
      right = ARENA.platform.right + footprint,
      top = ARENA.platform.top - footprint;
    if (z.x <= left || z.x >= right || z.y <= top) return;
    // The elevated platform continues to the screen's bottom edge. Enemies
    // approach its three exposed sides, never step onto the deck or car rear.
    const nearest = Math.min(z.x - left, right - z.x, z.y - top);
    const speed = Math.hypot(z.vx, z.vy) || SPECIES[z.kind].speed;
    if (nearest === z.y - top) {
      z.y = top;
      if (z.vy > 0) {
        z.vy = 0;
        z.vx = (z.vx >= 0 ? 1 : -1) * speed;
      }
    } else {
      const onLeft = nearest === z.x - left;
      z.x = onLeft ? left : right;
      if (onLeft ? z.vx > 0 : z.vx < 0) {
        z.vx = 0;
        z.vy = -speed;
      }
    }
    if (z.patrol) z.patrol.heading = Math.atan2(z.vy, z.vx);
  }
  private fx(
    kind: FX['kind'],
    x: number,
    y: number,
    species = 0,
    points = 0,
    angle = 0,
  ) {
    this.effects.push({
      id: ++this.id,
      kind,
      x,
      y,
      species,
      points,
      angle,
      age: 0,
      life:
        kind === 'specialEntry'
          ? 0.65
          : kind === 'weapon'
            ? 0.8
            : kind === 'laser'
              ? 0.26
              : kind === 'armorBreak' || kind === 'courierArrival'
                ? 1.4
                : kind === 'kill'
                  ? 1.35
                  : ['blast', 'freeze', 'scatter'].includes(kind)
                    ? 0.8
                    : kind === 'arc'
                      ? 0.42
                      : kind === 'hit'
                        ? 0.28
                        : 0.12,
      seed: this.random(),
    });
  }
  fire() {
    if (
      !this.active ||
      this.paused ||
      this.intro > 0 ||
      this.arrivalAge !== null ||
      this.save.expedition.transition ||
      this.courierBlocksCombat
    )
      return false;
    const weapon = this.save.weapons.active;
    const bonus = weapon ? null : this.save.bonus,
      room = weapon?.room ?? bonus?.room ?? this.save.room;
    if (weapon) {
      if (weapon.left <= 0) return false;
    } else if (bonus) {
      if (bonus.ammo <= 0) return false;
      bonus.ammo--;
    } else if (!this.io.spend(room)) {
      this.dry = true;
      this.release();
      return false;
    }
    let receiptId: number | undefined;
    if (!bonus && !weapon) {
      receiptId = receipt(this.save.economy, room);
      this.save.ammoCarrier.rooms[room].spent += room;
      const total = this.save.courier.progress + room;
      this.save.courier.queued += Math.floor(total / COURIER_RULES.threshold);
      this.save.courier.progress = total % COURIER_RULES.threshold;
    }
    const muzzle = vehicleMuzzle(ARENA.gunX, ARENA.gunY, this.aim);
    const angle = muzzle.angle;
    const base: Bullet = {
      id: ++this.id,
      x: muzzle.x,
      y: muzzle.y,
      vx: Math.cos(angle) * 830,
      vy: Math.sin(angle) * 830,
      age: 0,
      bounces: 0,
      bonus: !!bonus,
      room,
      receiptId,
      eventId: weapon?.eventId ?? bonus?.eventId,
    };
    base.shotId = base.id;
    if (weapon?.kind === 'laser') {
      const dx = Math.cos(angle) * 1100,
        dy = Math.sin(angle) * 1100;
      const targets = this.zombies
        .filter(
          (z) =>
            segmentHit(
              base.x,
              base.y,
              dx,
              dy,
              z.x,
              z.y,
              this.targetRadius(z) + 8,
            ) !== null,
        )
        .sort(
          (a, b) =>
            Math.hypot(a.x - base.x, a.y - base.y) -
              Math.hypot(b.x - base.x, b.y - base.y) || a.id - b.id,
        );
      this.fx('laser', base.x, base.y, 10, 0, angle);
      const beam = this.effects[this.effects.length - 1];
      beam.endX = base.x + dx;
      beam.endY = base.y + dy;
      for (const z of targets) this.hitTarget(z, base, false);
    } else if (weapon?.kind === 'shotgun') {
      for (let i = 0; i < 7; i++) {
        const a = angle + (i - 3) * 0.115;
        this.bullets.push({
          ...base,
          id: ++this.id,
          vx: Math.cos(a) * 830,
          vy: Math.sin(a) * 830,
        });
      }
      this.fx('scatter', base.x, base.y, 11);
      this.shake = Math.max(this.shake, 2.5);
    } else this.bullets.push(base);
    this.fx('shot', muzzle.x, muzzle.y, 0, 0, angle);
    this.fired++;
    if (bonus && bonus.ammo === 0) this.endBonus();
    this.persist();
    return true;
  }
  private endBonus() {
    if (!this.save.bonus) return;
    const event = this.save.economy.events[this.save.bonus.eventId ?? -1];
    if (event) event.state = 'draining';
    this.finalePoints = this.save.bonus.points;
    this.finale = 2.2;
    this.save.bonus = null;
    this.release();
    this.weaponNotice = {
      text: `奖励结束 · 已恢复 ×${this.effectiveRoom} · 松手再开火`,
      left: 2.5,
    };
  }
  private kill(z: Zombie, bullet: Bullet) {
    if (z.kind === AMMO_CARRIER.kind) return;
    const index = this.zombies.indexOf(z);
    if (index < 0) return;
    const points = SPECIES[z.kind].points * bullet.room;
    const eventId = functional(z.kind) ? z.eventId : bullet.eventId;
    if (
      (functional(z.kind) || bullet.eventId !== undefined) &&
      !payEvent(this.save.economy, eventId, points)
    )
      return;
    // Missing funding must never turn an untagged free attack into ordinary income.
    if (
      !functional(z.kind) &&
      bullet.eventId === undefined &&
      (bullet.bonus || (bullet.generation ?? 0) > 0)
    )
      return;
    const event = this.save.economy.events[z.eventId ?? -1];
    if (event) event.state = 'draining';
    this.zombies.splice(index, 1);
    this.pendingReplacements++;
    this.save.kills++;
    this.save.scrap += points;
    this.addPoints(points);
    if (bullet.bonus) {
      if (this.save.bonus) this.save.bonus.points += points;
      else if (this.finale > 0) this.finalePoints += points;
    }
    this.fx('kill', z.x, z.y, z.kind, points, Math.atan2(bullet.vy, bullet.vx));
    this.effects[this.effects.length - 1].actorId = z.id;
    this.effects[this.effects.length - 1].facing = zombieFacing(z.vx, z.vy);
    this.fx(
      'hit',
      z.x,
      z.y - SPECIES[z.kind].size * 0.35,
      z.kind,
      0,
      Math.atan2(bullet.vy, bullet.vx),
    );
    this.combo++;
    this.comboLife = 2;
    this.shake = Math.min(5, this.shake + (functional(z.kind) ? 3 : 0.35));
    this.progressFlash = 0.5;
    if (z.kind === 10 || z.kind === 11)
      this.grantWeapon(z.kind === 10 ? 'laser' : 'shotgun', z.eventId!);
    if (z.kind === 4 && !this.save.bonus && event) {
      this.save.bonus = {
        left: 15,
        ammo: 100,
        room: event.room,
        points: 0,
        eventId: event.id,
      };
      event.state = 'active';
      this.weaponNotice = {
        text: `奖励时间 · 自动切换 ×${event.room}`,
        left: 2.5,
      };
      this.intro = 1.15;
      this.shotClock = 0;
      this.shake = 12;
      for (let i = 0; i < 8; i++) this.spawn(undefined, true);
    }
    const depth = bullet.chainDepth ?? 0;
    if (z.kind === 8) {
      this.fx('freeze', z.x, z.y, 8);
      for (const target of this.zombies)
        if (Math.hypot(target.x - z.x, target.y - z.y) <= 175)
          target.frozen = 4;
    }
    if (depth < 2 && (z.kind === 5 || z.kind === 7)) {
      const secondary = {
        ...bullet,
        receiptId: undefined,
        eventId: z.eventId,
        chainDepth: depth + 1,
      };
      const targets = this.zombies
        .filter(
          (target) =>
            Math.hypot(target.x - z.x, target.y - z.y) <=
            (z.kind === 5 ? 155 : 230),
        )
        .sort(
          (a, b) =>
            Math.hypot(a.x - z.x, a.y - z.y) -
              Math.hypot(b.x - z.x, b.y - z.y) || a.id - b.id,
        );
      if (z.kind === 5) {
        this.fx('blast', z.x, z.y, 5);
        this.shake = Math.max(this.shake, 9);
      }
      for (const target of z.kind === 7 ? targets.slice(0, 4) : targets) {
        if (z.kind === 7) {
          this.fx('arc', z.x, z.y, 7);
          const fx = this.effects[this.effects.length - 1];
          fx.endX = target.x;
          fx.endY = target.y;
        }
        for (
          let i = 0;
          i < (z.kind === 5 ? 3 : 2) && this.zombies.includes(target);
          i++
        )
          this.hitTarget(target, secondary, false);
      }
    }
    this.persist();
  }
  private hitTarget(z: Zombie, b: Bullet, physical = true) {
    if (!this.zombies.includes(z) || this.courierBlocksCombat) return;
    if (
      b.eventId !== undefined &&
      (!this.save.economy.events[b.eventId] ||
        this.save.economy.events[b.eventId].blocked ||
        this.save.economy.events[b.eventId].left <= 0)
    )
      return;
    if (physical && b.receiptId !== undefined)
      consumeReceipt(
        this.save.economy,
        b.receiptId,
        functional(z.kind) ||
          z.kind === COURIER_KIND ||
          z.kind === AMMO_CARRIER.kind,
      );
    if (functional(z.kind) && !this.save.economy.events[z.eventId ?? -1])
      return;
    this.hits++;
    z.hit = 0.13;
    if (z.kind === COURIER_KIND) {
      this.hitCourier(z, b);
      return;
    }
    if (z.kind === AMMO_CARRIER.kind) {
      this.hitAmmoCarrier(z, b);
      return;
    }
    if (z.kind === 6) {
      z.hitsLeft = Math.max(0, (z.hitsLeft ?? SCATTER_HITS) - 1);
      if (physical && (b.generation ?? 0) === 0) {
        const heading = Math.atan2(b.vy, b.vx);
        for (let i = 0; i < 5; i++) {
          const a = heading + (i - 2) * 0.36,
            offset = SPECIES[z.kind].radius + 8;
          this.pendingBullets.push({
            id: ++this.id,
            x: z.x + Math.cos(a) * offset,
            y: z.y + Math.sin(a) * offset,
            vx: Math.cos(a) * 760,
            vy: Math.sin(a) * 760,
            bounces: 0,
            bonus: b.bonus,
            room: b.room,
            age: 0,
            generation: 1,
            shotId: b.shotId ?? b.id,
            ignoreId: z.id,
            chainDepth: b.chainDepth,
            eventId: z.eventId,
          });
        }
        this.fx('scatter', z.x, z.y, 6);
      }
      if (z.hitsLeft === 0) this.kill(z, b);
      else
        this.fx(
          'hit',
          z.x,
          z.y - SPECIES[z.kind].size * 0.35,
          6,
          0,
          Math.atan2(b.vy, b.vx),
        );
      return;
    }
    const p = Math.min(1, SPECIES[z.kind].p * (b.bonus ? 5 : 1));
    if (this.random() < p) this.kill(z, b);
    else
      this.fx(
        'hit',
        z.x,
        z.y - SPECIES[z.kind].size * 0.35,
        z.kind,
        0,
        Math.atan2(b.vy, b.vx),
      );
  }
  addPoints(points: number, _courierEligible = true) {
    if (!Number.isSafeInteger(points) || points <= 0) return;
    this.save.expedition.points += points;
    let remaining = points;
    while (remaining > 0) {
      const level = this.save.level,
        cap = level * 200,
        before = this.save.xp;
      const take = Math.min(remaining, cap - before);
      this.save.xp += take;
      remaining -= take;
      for (let node = 1; node <= 4; node++)
        if (before < (cap * node) / 4 && this.save.xp >= (cap * node) / 4) {
          this.save.crates[node - 1]++;
          this.prizes.push({ id: ++this.id, level, node: node - 1 });
        }
      if (this.save.xp >= cap) {
        this.save.xp = 0;
        this.save.level++;
        for (const hero of HEROES)
          this.heroQueue.push({ hero, level: this.save.level });
      }
    }
  }
  private moveBullet(b: Bullet, dt: number) {
    if (this.courierBlocksCombat) return false;
    const top = this.visibleTop + 10;
    if (b.y < top) {
      b.y = top;
      if (b.vy < 0) b.vy *= -1;
    }
    let remaining = dt;
    for (let pass = 0; pass < 4 && remaining > 0.000001; pass++) {
      let edge = remaining,
        axis: 'x' | 'y' | null = null;
      const tx =
        b.vx > 0 ? (590 - b.x) / b.vx : b.vx < 0 ? (10 - b.x) / b.vx : Infinity;
      const ty =
        b.vy > 0
          ? (790 - b.y) / b.vy
          : b.vy < 0
            ? (top - b.y) / b.vy
            : Infinity;
      if (tx >= 0 && tx <= edge) {
        edge = tx;
        axis = 'x';
      }
      if (ty >= 0 && ty <= edge) {
        edge = ty;
        axis = 'y';
      }
      const dx = b.vx * edge,
        dy = b.vy * edge;
      let first: Zombie | null = null,
        best = Infinity;
      for (const z of this.zombies) {
        if (z.id === b.ignoreId) continue;
        const t = segmentHit(b.x, b.y, dx, dy, z.x, z.y, this.targetRadius(z));
        if (t !== null && t < best) {
          best = t;
          first = z;
        }
      }
      if (first) {
        this.hitTarget(first, b);
        return false;
      }
      b.x += dx;
      b.y += dy;
      remaining -= edge;
      if (axis) {
        if (b.bounces >= 2) return false;
        b.bounces++;
        b[axis === 'x' ? 'vx' : 'vy'] *= -1;
        this.fx('bounce', b.x, b.y);
        b.x = Math.max(10.001, Math.min(589.999, b.x));
        b.y = Math.max(top + 0.001, Math.min(789.999, b.y));
      } else break;
    }
    b.age += dt;
    return b.age < 5;
  }
  advance(dt: number) {
    this.updating = true;
    try {
      this.tick(dt);
    } finally {
      this.updating = false;
      if (this.persistPending) {
        this.persistPending = false;
        this.persist();
      }
    }
  }
  private tick(dt: number) {
    if (!this.active || this.paused || dt <= 0) return;
    this.carrierSettledThisTick = false;
    dt = Math.min(dt, 0.06);
    if (this.arrivalAge !== null) {
      this.arrivalAge += dt;
      if (this.arrivalAge >= HUNT_ARRIVAL_SECONDS) {
        this.arrivalAge = null;
        this.save.arrivalSeen = true;
        this.persist();
      }
      return;
    }
    if (this.save.courier.reveal) {
      if (this.courierVictory) {
        this.courierVictory.age += dt;
        if (this.courierVictory.age >= this.courierVictory.duration) {
          this.courierVictory = null;
          this.shake = 0;
        }
      }
      if (
        !this.courierVictory &&
        !this.save.courier.reveal.tickets &&
        this.save.courier.reveal.newHeroes?.length === 0
      )
        this.dismissCourierReward();
      if (this.courierBlocksCombat) return;
    }
    const expedition = this.save.expedition;
    if (expedition.transition) {
      const t = expedition.transition;
      const before = t.age;
      t.age += dt;
      if (before < 0.55 && t.age >= 0.55) {
        // Cinematic destruction bypasses kills, points, skills and replacement spawning.
        this.zombies = [];
        this.bullets = [];
        this.pendingBullets = [];
        this.settleEvents();
        this.persist();
        this.effects = [];
      }
      if (t.age >= TRANSITION_SECONDS) {
        expedition.stage = t.target;
        expedition.transition = null;
        this.effects = [];
        this.release();
        for (let i = 0; i < 20; i++) this.spawn(undefined, true);
        this.ensureCourier();
        this.persist();
      }
      return;
    }
    // Unlocking the next sector is an option, not a pause. Only the explicit
    // transition above suspends combat; this also keeps restored saves playable.
    this.save.courier.cooldown = Math.max(0, this.save.courier.cooldown - dt);
    if (this.weaponNotice) {
      this.weaponNotice.left -= dt;
      if (this.weaponNotice.left <= 0) this.weaponNotice = null;
    }
    if (this.weaponPickup) {
      this.weaponPickup.left -= dt;
      if (this.weaponPickup.left <= 0) this.weaponPickup = null;
    }
    this.time += dt;
    if (this.weaponEnding) {
      this.weaponEnding.age += dt;
      if (this.weaponEnding.age >= 0.4) this.weaponEnding = null;
    }
    this.effects.forEach((e) => {
      if (e.kind === 'kill' && e.species === 3 && e.age < .55 && e.age + dt >= .55)
        this.shake = Math.max(this.shake, 3.2);
      e.age += dt;
    });
    this.effects = this.effects.filter((e) => e.age < e.life);
    this.shake = Math.max(0, this.shake - dt * 32);
    this.progressFlash = Math.max(0, this.progressFlash - dt);
    this.finale = Math.max(0, this.finale - dt);
    this.comboLife -= dt;
    if (this.comboLife <= 0) this.combo = 0;
    this.heroes.forEach((h) => (h.age += dt));
    this.heroes = this.heroes.filter((h) => h.age < 3);
    this.heroClock -= dt;
    if (this.heroQueue.length && this.heroClock <= 0) {
      this.heroes.push({ ...this.heroQueue.shift()!, id: ++this.id, age: 0 });
      this.heroes = this.heroes.slice(-5);
      this.heroClock = this.heroQueue.length > 45 ? 0.07 : 0.19;
    }
    if (this.intro > 0) {
      this.intro = Math.max(0, this.intro - dt);
      return;
    }
    if (this.prizes.length) {
      this.prizeAge += dt;
      if (this.prizeAge > (this.prizes.length > 8 ? 0.6 : 1.25)) {
        this.prizes.shift();
        this.prizeAge = 0;
      }
    }
    if (this.save.weapons.active) {
      this.save.weapons.active.left -= dt;
      if (this.save.weapons.active.left <= 0) {
        this.endWeapon();
        this.persist();
      }
    } else if (this.save.bonus) {
      this.save.bonus.left -= dt;
      if (this.save.bonus.left <= 0) this.endBonus();
    }
    this.checkRewards(dt);
    this.spawnClock -= dt;
    if (this.spawnClock <= 0) {
      if (
        this.zombies.length < (this.save.bonus ? 40 : 29) ||
        needsOrdinaryReinforcement(this.zombies)
      )
        this.spawn();
      this.spawnClock = this.save.bonus ? 0.23 : 0.65;
    }
    for (const z of this.zombies) {
      const frozen = (z.frozen ?? 0) > 0;
      z.frozen = Math.max(0, (z.frozen ?? 0) - dt);
      // Recompute from the normal patrol velocity, including entrants restored
      // from older saves that still contain the previous accelerated velocity.
      if (z.entry) {
        const dx = z.entry.x - z.x;
        const dy = z.entry.y - z.y;
        const distance = Math.hypot(dx, dy);
        const speed = Math.hypot(z.entry.vx, z.entry.vy);
        z.vx = distance > 0 ? (dx / distance) * speed : 0;
        z.vy = distance > 0 ? (dy / distance) * speed : 0;
      }
      if (!frozen) {
        if (
          !z.entry &&
          z.kind !== COURIER_KIND &&
          z.kind !== AMMO_CARRIER.kind &&
          Math.hypot(z.vx, z.vy) > 0
        ) {
          steerPatrol(
            z,
            this.zombies,
            dt,
            SPECIES[z.kind].speed,
            (actor) =>
              SPECIES[actor.kind].radius * Math.min(1.4, this.zombieScale),
          );
        }
        if (
          z.entry &&
          Math.hypot(z.entry.x - z.x, z.entry.y - z.y) <=
            Math.hypot(z.vx, z.vy) * dt
        ) {
          const entry = z.entry;
          z.x = entry.x;
          z.y = entry.y;
          z.vx = entry.vx;
          z.vy = entry.vy;
          delete z.entry;
        } else {
          z.x += z.vx * dt;
          z.y += z.vy * dt;
        }
      }
      if (z.kind === COURIER_KIND) {
        if (!z.entry) {
          z.x = Math.max(190, Math.min(410, z.x));
          if (z.x <= 190 || z.x >= 410) z.vx *= -1;
        }
        if (this.save.courier.active) {
          this.save.courier.active.x = z.x;
          this.save.courier.active.y = z.y;
        }
      }
      if (z.kind === AMMO_CARRIER.kind && this.save.ammoCarrier.active) {
        const top = Math.min(440, Math.max(180, this.visibleTop + 70));
        if (!z.entry) {
          z.x = Math.max(70, Math.min(530, z.x));
          z.y = Math.max(top, Math.min(510, z.y));
          if (z.x <= 70) z.vx = Math.abs(z.vx);
          if (z.x >= 530) z.vx = -Math.abs(z.vx);
          if (z.y <= top) z.vy = Math.abs(z.vy);
          if (z.y >= 510) z.vy = -Math.abs(z.vy);
        }
        Object.assign(this.save.ammoCarrier.active, {
          x: z.x,
          y: z.y,
          vx: z.vx,
          vy: z.vy,
        });
      }
      if (!z.entry) this.keepOutsidePlatform(z);
      z.age += dt;
      z.hit = Math.max(0, z.hit - dt);
      if (
        z.entry &&
        (functional(z.kind) || z.kind === AMMO_CARRIER.kind) &&
        !this.noticedEntrants.has(z.id) &&
        z.x > 12 &&
        z.x < 588 &&
        z.y > this.visibleTop + 25
      ) {
        this.noticedEntrants.add(z.id);
        this.fx(
          'specialEntry',
          z.x,
          Math.max(this.visibleTop + 60, z.y - SPECIES[z.kind].size),
          z.kind,
        );
      }
    }
    const liveEntrants = new Set(this.zombies.map((z) => z.id));
    for (const id of this.noticedEntrants)
      if (!liveEntrants.has(id)) this.noticedEntrants.delete(id);
    this.zombies = this.zombies.filter(
      (z) =>
        !!z.entry ||
        z.kind === COURIER_KIND ||
        z.kind === AMMO_CARRIER.kind ||
        (z.x > -90 &&
          z.x < 690 &&
          z.y > this.visibleTop - 90 &&
          z.y < 790 &&
          z.age < 55),
    );
    this.shotClock = Math.max(0, this.shotClock) - dt;
    if (this.firing || this.tapQueued) {
      if (this.shotClock <= 0) {
        this.tapQueued = false;
        this.fire();
        this.shotClock +=
          1 /
          (this.save.weapons.active
            ? this.save.weapons.active.kind === 'shotgun'
              ? 2
              : 4
            : this.save.bonus
              ? 12
              : 4);
      }
    }
    this.bullets = this.bullets.filter((b) => this.moveBullet(b, dt));
    this.bullets.push(...this.pendingBullets);
    this.pendingBullets = [];
    // Finish all hits and chain reactions first, then replenish in this same frame.
    // New arrivals must not become targets of the explosion that spawned them.
    for (let i = 0; i < this.pendingReplacements; i++)
      this.spawn(undefined, false, true);
    this.pendingReplacements = 0;
    this.settleEvents();
    this.ensureCourier();
    this.ensureAmmoCarrier();
    if (
      !this.save.bonus &&
      this.finale > 0 &&
      this.bullets.some((b) => b.bonus)
    )
      this.finale = Math.max(this.finale, 1.2);
    this.persistClock += dt;
    if (this.persistClock >= 0.4) {
      this.persistClock = 0;
      this.persist();
    }
  }
  snapshot() {
    return {
      ...structuredClone(this.save),
      ammo: this.io.ammo(),
      effectiveRoom: this.effectiveRoom,
      accounting: auditEconomy(this.save.economy),
      zombies: this.zombies.length,
      bullets: this.bullets.length,
      fired: this.fired,
      armorBreaks: this.armorBreaks,
      courierVictory: this.courierVictory ? { ...this.courierVictory } : null,
      sceneReady: this.sceneReady,
      weaponNotice: this.weaponNotice ? { ...this.weaponNotice } : null,
      weaponPickup: this.weaponPickup ? { ...this.weaponPickup } : null,
      hits: this.hits,
      active: this.active,
      paused: this.paused,
      intro: this.intro,
      arrivalAge: this.arrivalAge,
      dry: this.dry,
      combo: this.combo,
      prize: this.prizes[0] ?? null,
      queuedHeroes: this.heroQueue.length,
      visibleHeroes: this.heroes.length,
      heroMessages: this.heroes.map((h) => ({ ...h })),
      progressFlash: this.progressFlash,
      finale: this.finale,
      finalePoints: this.finalePoints,
    };
  }
}

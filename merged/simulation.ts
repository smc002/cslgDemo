import { BALANCE, stageWaves } from '../lib/balance';
import { heroElement, enemyWave, elementalDamage, type Element } from '../lib/elements';
import {
  heroEmitter,
  heroHeight,
  HERO_ART,
  ZOMBIE_ART,
  TOY_ANIMATIONS,
  TOY_SCALE,
} from '../shared/toy-art';
import {
  actionDuration,
  actionImpact,
  sniperAim,
  type HeroAnimation,
} from '../shared/hero-animation';
export const COLORS = ['#68cfff', '#b8e67e', '#ffbd76'];
export const BATTLE_OFFSET_Y = 40;
export const HEROES = [
  {
    name: HERO_ART[0][1],
    role: 'tank',
    hp: 410,
    color: '#61cbff',
    skill: '重锤震退',
    tip: '近身锤击与防护力场，承受伤害降低。',
  },
  {
    name: HERO_ART[1][1],
    role: 'healer',
    hp: 175,
    color: '#67ffb1',
    skill: '医疗脉冲',
    tip: '优先向当前战线低血量队友发射医疗脉冲，全员满血才攻击。',
  },
  {
    name: HERO_ART[2][1],
    role: 'damage',
    hp: 185,
    color: '#4fe5ff',
    skill: '双重能量炮',
    tip: '臂炮连续发出两束能量，攻击当前战线敌人。',
  },
  {
    name: HERO_ART[3][1],
    role: 'tank',
    hp: 440,
    color: '#ff9855',
    skill: '机械震荡',
    tip: '主动上前，以机械震荡冲击当前战线附近多个敌人。',
  },
  {
    name: HERO_ART[4][1],
    role: 'healer',
    hp: 185,
    color: '#f386ff',
    skill: '医疗力场',
    tip: '医疗力场治疗附近当前战线队友，同时震伤当前战线敌人。',
  },
  {
    name: HERO_ART[5][1],
    role: 'damage',
    hp: 160,
    color: '#c69aff',
    skill: '双刃突袭',
    tip: '闪到当前战线敌人背后，与该目标相互锁定近战；其余敌人仍攻击正面队伍。',
  },
  {
    name: HERO_ART[6][1],
    role: 'tank',
    hp: 470,
    color: '#ffd265',
    skill: '烈焰压制',
    tip: '重装承伤，连续射出密集火焰弹。',
  },
  {
    name: HERO_ART[7][1],
    role: 'healer',
    hp: 170,
    color: '#fff0a1',
    skill: '引导之光',
    tip: '以圣光治疗当前战线最危险队友，满血时降下惩戒光柱。',
  },
  {
    name: HERO_ART[8][1],
    role: 'damage',
    hp: 165,
    color: '#a9e8ff',
    skill: '穿透冰棱',
    tip: '凝聚后射出高伤冰棱，穿透当前战线射线上的敌人。',
  },
] as const;
export const LANE_SPACING = 94;
export const ROAD_BOUNDS = { left: 80, right: 310 };
export const SLOTS = Array.from({ length: 9 }, (_, i) => ({
  lane: Math.floor(i / 3),
  x:
    101 +
    Math.floor(i / 3) * LANE_SPACING +
    (i % 3 === 1 ? -12 : i % 3 === 2 ? 12 : 0),
  y: [433, 510, 585][i % 3],
}));
export type Unit = {
  id: number;
  hero: number;
  lane: number;
  /** Deployment lane stays immutable; combatLane follows a reinforcement. */
  combatLane?: number;
  reinforcing?: boolean;
  kind: number;
  element?: Element;
  boss?: boolean;
  bossCharge?: number;
  bossRecovery?: number;
  /** Ground telegraph is fixed at windup start and shared with hit detection. */
  bossSlamX?: number;
  bossSlamY?: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  homeX: number;
  homeY: number;
  cd: number;
  attack: number;
  hit: number;
  moving: boolean;
  age: number;
  target: number;
  stun: number;
  animation?: HeroAnimation;
  facingLeft?: boolean;
  aimClip?: string;
};
export type FxKind =
  | 'shield'
  | 'blade'
  | 'music'
  | 'blink'
  | 'stab'
  | 'holy'
  | 'sniper'
  | 'hit'
  | 'heal';
export const effectLifetime = (kind: FxKind) =>
  kind === 'blink'
    ? 1.35
    : ['shield', 'music', 'holy', 'sniper'].includes(kind)
      ? 1.05
      : 0.8;
export type Effect = {
  counter?: boolean;
  playbackRate: number;
  kind: FxKind;
  x: number;
  y: number;
  tx: number;
  ty: number;
  age: number;
  amount: number;
  lane: number;
};
export type Shot = {
  x: number;
  y: number;
  px: number;
  py: number;
  target: number;
  source: number;
  lane: number;
  kind: 'medic' | 'drone' | 'minigun';
  heal: boolean;
  damage: number;
  age: number;
};
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);
export const combatLane = (u: Unit) => u.combatLane ?? u.lane;
export const BOSS_SLAM_RADIUS = 80;
export const bossSlamArea = (boss: Unit) => ({
  x: boss.bossSlamX ?? boss.x,
  y: boss.bossSlamY ?? boss.y + 73.5,
  radius: BOSS_SLAM_RADIUS,
});
export class MergedBattle {
  heroes: Unit[] = [];
  enemies: Unit[] = [];
  shots: Shot[] = [];
  effects: Effect[] = [];
  lineup = HEROES.map((_, i) => i);
  deploymentSlots = SLOTS.map((p) => ({ ...p }));
  fitDeployment(bottom: number) {
    if (this.phase !== 'prep') return;
    const offset = Math.min(0, bottom - SLOTS[2].y);
    this.deploymentSlots = SLOTS.map((p) => ({ ...p, y: p.y + offset }));
    for (const h of this.heroes) {
      const p = this.deploymentSlots[this.lineup.indexOf(h.hero)];
      h.y = h.homeY = p.y;
    }
  }
  phase: 'prep' | 'battle' | 'march' | 'defeat' | 'cleared' = 'prep';
  campaignMode = false;
  stage = 1;
  power = Array(9).fill(1) as number[];
  configure(stage: number, lineup: number[], power: number[]) {
    this.campaignMode = true;
    this.stage = stage;
    this.lineup = [...lineup];
    this.power = [...power];
    this.reset();
  }
  refreshPower(power: number[]) {
    this.power = [...power];
    for (const h of this.heroes) {
      const hp = HEROES[h.hero].hp * this.power[h.hero];
      h.hp = h.hp > 0 ? (hp * h.hp) / h.maxHp : 0;
      h.maxHp = hp;
    }
  }
  time = 0;
  wave = 1;
  get waveInStage() {
    return ((this.wave - 1) % BALANCE.wavesPerStage) + 1;
  }
  get totalWaves() {
    return stageWaves(this.stage);
  }
  kills = 0;
  healed = 0;
  active = true;
  paused = false;
  speed = 1;
  camera = 0;
  // Foot-point bounds in screen coordinates, including clearance for sprite and HUD.
  visibleBounds = { ...ROAD_BOUNDS, top: 220, bottom: 650 };
  distance = 0;
  march = 0;
  uses = Array(9).fill(0) as number[];
  damage = Array(9).fill(0) as number[];
  lost = [false, false, false];
  private serial = 9;
  private accumulator = 0;
  constructor() {
    this.reset();
  }
  reset() {
    this.phase = 'prep';
    this.time = 0;
    // Retain the original later-stage wave indices and enemy difficulty.
    this.wave = this.campaignMode ? (this.stage - 1) * BALANCE.wavesPerStage + 1 : 1;
    this.kills = 0;
    this.healed = 0;
    this.paused = false;
    this.speed = 1;
    this.camera = 0;
    this.distance = 0;
    this.march = 0;
    this.uses = Array(9).fill(0);
    this.damage = Array(9).fill(0);
    this.lost = [false, false, false];
    this.serial = 9;
    this.accumulator = 0;
    this.enemies = [];
    this.shots = [];
    this.effects = [];
    this.heroes = this.lineup.flatMap((hero, slot) => {
      if (hero < 0) return [];
      const p = this.deploymentSlots[slot],
        hp = HEROES[hero].hp * this.power[hero];
      return [
        {
          id: hero + 1,
          hero,
          lane: p.lane,
          kind: 0,
          element: this.campaignMode ? heroElement(hero, this.stage) : undefined,
          x: p.x,
          y: p.y,
          homeX: p.x,
          homeY: p.y,
          hp,
          maxHp: hp,
          cd: 0.3 + slot * 0.06,
          attack: 0,
          hit: 0,
          moving: false,
          age: 0,
          target: 0,
          stun: 0,
        },
      ];
    });
  }
  setLineup(value: unknown) {
    if (
      this.phase !== 'prep' ||
      !Array.isArray(value) ||
      value.length !== 9 ||
      new Set(value.filter((n) => n >= 0)).size !==
        value.filter((n) => n >= 0).length ||
      value.some((n) => !Number.isInteger(n) || n < -1 || n > 8)
    )
      return false;
    this.lineup = [...value];
    this.reset();
    return true;
  }
  start() {
    if (this.phase === 'prep' && this.heroes.some((h) => h.hero !== 5)) {
      this.phase = 'battle';
      this.spawn();
    }
  }
  private spawn() {
    for (const h of this.heroes) {
      h.combatLane = h.lane;
      h.reinforcing = false;
    }
    for (let lane = 0; lane < 3; lane++)
      if (
        (!this.lost[lane] && this.heroes.some((h) => h.lane === lane)) ||
        (this.campaignMode &&
          this.stage === 10 &&
          this.wave % 3 === 0 &&
          lane === 1)
      )
        for (let n = 0; n < (this.campaignMode ? enemyWave(this.stage, lane, this.waveInStage).length : Math.min(7, 4 + Math.floor(this.wave / 2))); n++) {
          const boss =
            this.campaignMode &&
            this.stage % 5 === 0 &&
            this.wave % 3 === 0 &&
            n === 0 &&
            (this.stage !== 10 || lane === 1);
          const kind = n === 0 ? 2 : n % 2;
          const element = this.campaignMode ? enemyWave(this.stage, lane, this.waveInStage)[n].element : undefined;
          const hp = Math.round(
            (kind === 2 ? 220 : kind === 1 ? 112 : 85) *
              (1 + Math.min(this.wave, 30) * 0.07) *
              (1 + lane * 0.1) *
              (boss ? 2.5 : 1) *
              (this.campaignMode ? 0.52 + this.stage * 0.12 : 1),
          );
          const x = 101 + lane * LANE_SPACING + (n % 2 ? 12 : -12),
            y = 270 - n * 32 - this.distance;
          this.enemies.push({
            id: ++this.serial,
            hero: -1,
            lane,
            kind,
            element,
            boss: boss && this.stage === 10,
            x,
            y,
            homeX: x,
            homeY: y,
            hp,
            maxHp: hp,
            cd: 0.6,
            attack: 0,
            hit: 0,
            moving: false,
            age: 0,
            target: 0,
            stun: 0,
          });
        }
  }
  advance(dt: number) {
    if (this.active && !this.paused && this.phase === 'defeat') {
      for (const h of this.heroes)
        if (h.hp <= 0) h.age += Math.max(0, Math.min(dt, 0.1)) * this.speed;
      return;
    }
    if (
      !this.active ||
      this.paused ||
      !['battle', 'march'].includes(this.phase)
    )
      return;
    this.accumulator += Math.max(0, Math.min(dt, 0.1)) * this.speed;
    while (this.accumulator >= 1 / 60) {
      this.step(1 / 60);
      this.keepUnitsOnRoad();
      this.keepAssassinVisible();
      this.accumulator -= 1 / 60;
      if (this.phase === 'defeat') break;
    }
  }
  private walk(h: Unit, x: number, y: number, speed: number, dt: number) {
    x = Math.max(ROAD_BOUNDS.left, Math.min(ROAD_BOUNDS.right, x));
    const d = Math.hypot(x - h.x, y - h.y);
    if (d < 0.5) return;
    const step = Math.min(d, speed * dt);
    if (Math.abs(x - h.x) > 2) h.facingLeft = x < h.x;
    h.x += ((x - h.x) / d) * step;
    h.y += ((y - h.y) / d) * step;
    h.moving = true;
  }
  private keepUnitsOnRoad() {
    for (const u of [...this.heroes, ...this.enemies]) {
      // Large enemies need extra shoulder clearance; all displacement paths use this guard.
      const id =
        u.hero >= 0
          ? HERO_ART[u.hero][0]
          : ZOMBIE_ART[u.boss ? 3 : ([0, 2, 3][u.kind] ?? 0)];
      const height =
        u.hero >= 0
          ? heroHeight(u.hero)
          : (u.boss ? 104 : u.kind === 2 ? 57 : 40) * TOY_SCALE;
      const art = TOY_ANIMATIONS[id];
      const radius = (art.halfWidth / art.bodyHeight) * height;
      u.x = Math.max(
        Math.max(ROAD_BOUNDS.left, 58 + radius),
        Math.min(Math.min(ROAD_BOUNDS.right, 332 - radius), u.x),
      );
    }
  }
  private keepAssassinVisible() {
    const h = this.heroes.find((u) => u.hero === 5 && u.hp > 0);
    if (!h) return;
    const b = this.visibleBounds,
      offset = this.camera + BATTLE_OFFSET_Y;
    h.x = Math.max(b.left, Math.min(b.right, h.x));
    h.y = Math.max(b.top - offset, Math.min(b.bottom - offset, h.y));
  }
  private fx(kind: FxKind, h: Unit, target: Unit = h, amount = 0) {
    this.effects.push({
      playbackRate: h.hero === 4 ? 1 : 2,
      kind,
      x: h.x,
      y: h.y - 20,
      tx: target.x,
      ty: target.y - 20,
      age: 0,
      amount,
      lane: h.lane,
      counter: kind === 'hit' && h.hero >= 0 && target.hero < 0 && elementalDamage(h, target) > 1,
    });
  }
  private hurt(target: Unit, amount: number, source?: Unit) {
    // Target selection determines eligibility. Already fired projectiles retain their target.
    if (target.hp <= 0) return;
    if (source && source.hero >= 0) amount *= this.power[source.hero];
    else if (this.campaignMode) amount *= 0.65 + this.stage * 0.09;
    if (source) amount *= elementalDamage(source, target);
    const n = Math.min(target.hp, amount);
    target.hp -= n;
    target.hit = 0.16;
    if (source && source.hero >= 0) {
      this.damage[source.hero] += n;
      this.fx('hit', source, target, n);
    }
    if (target.hp <= 0 && target.hero < 0) this.kills++;
  }
  private heal(h: Unit, target: Unit, amount: number) {
    if (target.hp <= 0) return;
    amount *= this.power[h.hero];
    const n = Math.min(amount, target.maxHp - target.hp);
    if (n <= 0) return;
    target.hp += n;
    this.healed += n;
    this.fx('heal', h, target, n);
  }
  private shoot(
    h: Unit,
    target: Unit,
    kind: Shot['kind'],
    damage: number,
    heal = false,
    offset = 0,
  ) {
    const emitter = heroEmitter(h.hero, !!h.facingLeft);
    const x = h.x + emitter.x + (kind === 'drone' ? offset * 0.12 : 0),
      y = h.y + emitter.y;
    this.shots.push({
      x,
      y,
      px: x,
      py: y,
      target: target.id,
      source: h.id,
      lane: h.lane,
      kind,
      heal,
      damage,
      age: 0,
    });
    h.attack = 0.15;
  }
  private skill(h: Unit, foes: Unit[], dt: number) {
    if (h.animation) return;
    let foe = foes.sort((a, b) => distance(h, a) - distance(h, b))[0];
    if (h.hero === 5) {
      const b = this.visibleBounds,
        offset = this.camera + BATTLE_OFFSET_Y;
      const visible = foes.filter(
        (e) =>
          e.y - 34 + offset >= b.top &&
          e.y - 30 + offset <= b.bottom &&
          e.x + 17 >= b.left &&
          e.x + 17 <= b.right,
      );
      const old = visible.find((e) => e.id === h.target);
      foe = old ?? visible.sort((a, b) => a.y - b.y)[0];
      if (!foe) {
        h.target = 0;
        return;
      }
      if (foe) {
        if (h.target !== foe.id) {
          const origin = { x: h.x, y: h.y };
          h.x = foe.x + 17;
          h.y = foe.y - 34;
          h.target = foe.id;
          this.effects.push({
            playbackRate: 2,
            kind: 'blink',
            x: origin.x,
            y: origin.y - 20,
            tx: h.x,
            ty: h.y - 20,
            age: 0,
            amount: 0,
            lane: h.lane,
          });
          h.cd = 0.12;
        } else if (distance(h, foe) > 43) {
          // Close only when displaced out of melee range. Do not chase a moving
          // offset behind a foe that is now approaching us to fight back.
          const d = distance(h, foe);
          this.walk(
            h,
            foe.x + ((h.x - foe.x) / d) * 38,
            foe.y + ((h.y - foe.y) / d) * 38,
            95,
            dt,
          );
        }
      }
    } else if ((h.hero === 0 || h.hero === 3) && foe) {
      if (distance(h, foe) > 45)
        this.walk(
          h,
          foe.x,
          Math.max(h.homeY - this.distance - 100, foe.y + 39),
          42,
          dt,
        );
    }
    if (h.cd > 0) return;
    const friends = this.heroes.filter(
      (u) => combatLane(u) === combatLane(h) && u.hp > 0,
    );
    const injured = friends
      .filter((u) => u.hp < u.maxHp)
      .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    if (h.hero === 1) {
      if (injured) {
        h.animation = {
          clip: 'skill',
          elapsed: 0,
          target: injured.id,
          hit: false,
        };
        if (Math.abs(injured.x - h.x) > 12) h.facingLeft = injured.x < h.x;
        h.cd = 0.85;
      } else if (foe) {
        h.animation = {
          clip: 'attack',
          elapsed: 0,
          target: foe.id,
          hit: false,
        };
        if (Math.abs(foe.x - h.x) > 12) h.facingLeft = foe.x < h.x;
        h.cd = 1.05;
      } else return;
    } else if (h.hero === 4) {
      if (!foe && !injured) return;
      this.fx('music', h);
      for (const f of friends) if (distance(h, f) < 165) this.heal(h, f, 29);
      if (foe) {
        this.fx('music', h, foe);
        this.hurt(foe, 16, h);
      }
      h.cd = 1.7;
    } else if (h.hero === 7) {
      if (injured) {
        this.fx('holy', h, injured);
        this.heal(h, injured, 59);
      } else if (foe) {
        this.fx('holy', h, foe);
        this.hurt(foe, 23, h);
      } else return;
      h.cd = 1.7;
    } else if (!foe) return;
    else if (h.hero === 0) {
      if (distance(h, foe) > 65) return;
      h.animation = {
        clip: this.uses[0] % 3 === 2 ? 'skill' : 'attack',
        elapsed: 0,
        target: foe.id,
        hit: false,
      };
      if (Math.abs(foe.x - h.x) > 12) h.facingLeft = foe.x < h.x;
      h.cd = 1.3;
    } else if (h.hero === 3) {
      if (distance(h, foe) > 70) return;
      const clip = this.uses[h.hero] % 3 === 2 ? 'slam' : 'slash';
      h.animation = { clip, elapsed: 0, target: foe.id, hit: false };
      if (Math.abs(foe.x - h.x) > 8) h.facingLeft = foe.x < h.x;
      h.cd = Math.max(1.1, actionDuration(h.hero, clip) + 0.08);
    } else if (h.hero === 2) {
      h.animation = {
        clip: this.uses[2] % 4 === 0 ? 'skill' : 'attack',
        elapsed: 0,
        target: foe.id,
        hit: false,
      };
      if (Math.abs(foe.x - h.x) > 12) h.facingLeft = foe.x < h.x;
      h.cd = 0.72;
    } else if (h.hero === 5) {
      if (distance(h, foe) > 55) return;
      this.fx('stab', h, foe);
      this.hurt(foe, 33, h);
      h.cd = 0.65;
    } else if (h.hero === 6) {
      if (distance(h, foe) > 370) return;
      this.shoot(h, foe, 'minigun', 7);
      h.cd = 0.16;
    } else if (h.hero === 8) {
      // Aim at the upper torso. Feet are not a useful aim point for a long rifle at short range.
      const aim = sniperAim(
        h.x,
        h.y,
        foe.x,
        foe.y - (foe.kind === 2 ? 42 : 30),
      );
      h.aimClip = aim.clip;
      h.animation = { clip: aim.clip, elapsed: 0, target: foe.id, hit: false };
      h.facingLeft = aim.facingLeft;
      h.cd = 2.7;
    }
    h.attack = 0.22;
    this.uses[h.hero]++;
  }
  private animate(h: Unit, dt: number) {
    const a = h.animation;
    if (!a) return;
    if (h.hp <= 0) {
      h.animation = undefined;
      return;
    }
    a.elapsed += dt;
    if (!a.hit && a.elapsed >= actionImpact(h.hero, a.clip)) {
      a.hit = true;
      const foes = this.enemies.filter(
        (e) => e.hp > 0 && combatLane(e) === combatLane(h),
      );
      const foe = foes.find((e) => e.id === a.target);
      if (h.hero === 0) {
        this.fx('shield', h, foe ?? h);
        for (const e of foes)
          if (distance(h, e) < 75) {
            this.hurt(e, 27, h);
            e.stun = 0.65;
          }
      } else if (h.hero === 1) {
        const injured = this.heroes
          .filter(
            (u) =>
              u.hp > 0 && u.hp < u.maxHp && combatLane(u) === combatLane(h),
          )
          .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
        const target =
          injured ??
          foe ??
          foes.sort((a, b) => distance(h, a) - distance(h, b))[0];
        if (target)
          this.shoot(h, target, 'medic', injured ? 32 : 12, !!injured);
      } else if (h.hero === 2) {
        if (foe) {
          this.shoot(h, foe, 'drone', 13, false, -20);
          this.shoot(h, foe, 'drone', 13, false, 20);
        }
      } else if (h.hero === 3) {
        this.fx('blade', h, foe ?? h, a.clip === 'slam' ? 1 : 0);
        for (const e of foes)
          if (distance(h, e) < 90) this.hurt(e, a.clip === 'slam' ? 55 : 37, h);
      } else if (foe) {
        this.fx('sniper', h, foe);
        const emitter = heroEmitter(h.hero, !!h.facingLeft);
        const fx = this.effects[this.effects.length - 1];
        fx.ty = foe.y - (foe.kind === 2 ? 42 : 30);
        fx.x = h.x + emitter.x;
        fx.y = h.y + emitter.y;
        const dx = fx.tx - fx.x,
          dy = fx.ty - fx.y,
          length = Math.hypot(dx, dy) || 1;
        for (const e of foes) {
          const ex = e.x - fx.x,
            ey = e.y - 20 - fx.y;
          const along = (ex * dx + ey * dy) / length;
          const lateral = Math.abs(ex * dy - ey * dx) / length;
          if (e === foe || (along > 0 && along < length + 180 && lateral < 22))
            this.hurt(e, e === foe ? 83 : 48, h);
        }
      }
    }
    if (a.elapsed >= actionDuration(h.hero, a.clip)) h.animation = undefined;
  }
  private step(dt: number) {
    this.time += dt;
    for (const u of [...this.heroes, ...this.enemies]) {
      u.cd -= dt;
      u.attack = Math.max(0, u.attack - dt * (u.hero === 4 ? 1 : 2));
      u.hit = Math.max(0, u.hit - dt * 2);
      u.stun = Math.max(0, u.stun - dt);
      u.moving = false;
      if (u.hp <= 0) u.age += dt;
      this.animate(u, dt);
    }
    for (const e of this.effects) e.age += dt * e.playbackRate;
    this.effects = this.effects.filter((e) => e.age < effectLifetime(e.kind));
    if (this.phase === 'march') {
      this.march += dt;
      const f = Math.min(1, this.march / 2.4),
        travel = this.distance + f * 130;
      for (const h of this.heroes)
        if (h.hp > 0 && !h.animation)
          this.walk(h, h.homeX, h.homeY - travel, 180, dt);
      this.camera = travel;
      if (f >= 1) {
        this.distance += 130;
        this.camera = this.distance;
        this.march = 0;
        this.wave++;
        this.phase = 'battle';
        this.spawn();
      }
      return;
    }
    for (let lane = 0; lane < 3; lane++)
      this.lost[lane] = !this.heroes.some(
        (h) => h.lane === lane && h.hp > 0 && h.hero !== 5,
      );
    if (this.lost.every(Boolean)) {
      this.phase = 'defeat';
      return;
    }
    // Resolve zombie destination first, then let cleared teams reinforce the remaining fronts.
    // Decisions persist until that front clears; they do not flip every frame by nearest target.
    const live = this.heroes.filter((h) => h.hp > 0);
    const duelOpponent = (z: Unit) =>
      live.find(
        (h) =>
          h.hero === 5 && h.target === z.id && combatLane(h) === combatLane(z),
      );
    for (const z of this.enemies.filter((e) => e.hp > 0)) {
      if (z.boss || duelOpponent(z)) continue;
      if (!live.some((h) => h.hero !== 5 && combatLane(h) === combatLane(z))) {
        const target = live
          .filter((h) => h.hero !== 5)
          .sort((a, b) => distance(z, a) - distance(z, b))[0];
        if (target) z.combatLane = combatLane(target);
      }
    }
    for (const h of live) {
      if (
        !h.animation &&
        !this.enemies.some((e) => e.hp > 0 && combatLane(e) === combatLane(h))
      ) {
        const target = this.enemies
          .filter((e) => e.hp > 0)
          .sort(
            (a, b) =>
              Math.abs(combatLane(a) - h.lane) -
                Math.abs(combatLane(b) - h.lane) ||
              combatLane(a) - combatLane(b) ||
              distance(h, a) - distance(h, b),
          )[0];
        if (target) {
          h.combatLane = combatLane(target);
          h.reinforcing = true;
          h.target = 0;
        }
      }
      const foes = this.enemies.filter(
        (e) => combatLane(e) === combatLane(h) && e.hp > 0,
      );
      // Reinforcements visibly cross the ground before firing. Melee then approaches normally.
      const supportX = Math.max(
        ROAD_BOUNDS.left,
        Math.min(
          ROAD_BOUNDS.right,
          h.homeX +
            (combatLane(h) - h.lane) * LANE_SPACING +
            (h.lane - combatLane(h)) * 16,
        ),
      );
      if (
        foes.length &&
        h.hero !== 5 &&
        !h.animation &&
        h.reinforcing &&
        Math.abs(h.x - supportX) > 8
      ) {
        this.walk(h, supportX, h.homeY - this.distance - 30, 88, dt);
        continue;
      }
      h.reinforcing = false;
      this.skill(h, foes, dt);
      if (!foes.length && !h.animation)
        this.walk(h, h.homeX, h.homeY - this.distance - 30, 45, dt);
    }
    for (const z of this.enemies.filter((e) => e.hp > 0)) {
      const targets = this.heroes
        .filter(
          (h) => h.hp > 0 && combatLane(h) === combatLane(z) && h.hero !== 5,
        )
        .sort((a, b) => distance(z, a) - distance(z, b));
      const duelist = duelOpponent(z);
      const target = duelist ?? targets[0];
      z.target = target?.id ?? 0;
      if (target && Math.abs(target.x - z.x) > 2) z.facingLeft = target.x < z.x;
      if (z.boss) {
        if ((z.bossRecovery ?? 0) > 0) {
          z.bossRecovery = Math.max(0, z.bossRecovery! - dt);
          continue;
        }
        if (z.bossCharge !== undefined) {
          z.bossCharge -= dt;
          if (z.bossCharge <= 0) {
            const area = bossSlamArea(z);
            for (const h of this.heroes.filter(
              (h) =>
                h.hp > 0 &&
                (h.hero !== 5 || h === duelist) &&
                distance(h, area) <= area.radius,
            )) {
              this.hurt(
                h,
                42 * (h.hero === 0 ? 0.55 : h.hero === 6 ? 0.65 : 1),
                z,
              );
              this.fx('hit', z, h);
            }
            z.bossCharge = undefined;
            z.bossRecovery = 0.55;
            z.cd = 2.4;
          }
        } else if (z.cd <= 0 && target && distance(z, target) < 190) {
          z.bossSlamX = duelist ? duelist.x : z.x;
          z.bossSlamY = duelist ? duelist.y : z.y + 73.5;
          z.bossCharge = 1.2;
        }
        continue;
      }
      if (z.stun > 0) continue;
      if (!target) {
        // Only assassins remain: defeat is handled above; never silently delete survivors.
        continue;
      }
      if (distance(z, target) > 43)
        this.walk(z, target.x, target.y, z.kind === 2 ? 19 : 27, dt);
      else if (z.cd <= 0) {
        const reduction =
          target.hero === 0 ? 0.55 : target.hero === 6 ? 0.65 : 1;
        this.hurt(target, (z.kind === 2 ? 18 : 10) * reduction, z);
        z.cd = 1;
        z.attack = 0.2;
      }
    }
    for (const s of this.shots) {
      s.age += dt;
      s.px = s.x;
      s.py = s.y;
      const h = this.heroes.find((h) => h.id === s.source),
        target = [...this.heroes, ...this.enemies].find(
          (u) => u.id === s.target && u.hp > 0,
        );
      if (!target || !h) {
        s.age = 9;
        continue;
      }
      const dx = target.x - s.x,
        dy = target.y - 22 - s.y,
        d = Math.hypot(dx, dy),
        step = (s.heal ? 640 : 1040) * dt;
      if (d < step + 4) {
        if (s.heal) this.heal(h, target, s.damage);
        else this.hurt(target, s.damage, h);
        s.age = 9;
      } else {
        s.x += (dx / d) * step;
        s.y += (dy / d) * step;
      }
    }
    this.shots = this.shots.filter((s) => s.age < 2);
    this.enemies = this.enemies.filter(
      (e) => e.hp > 0 || e.age < (e.boss ? 1 : 0.4),
    );
    if (!this.enemies.some((e) => e.hp > 0)) {
      this.phase =
        this.campaignMode && this.waveInStage >= this.totalWaves ? 'cleared' : 'march';
      this.march = 0;
      this.shots = [];
      for (const h of this.heroes) h.target = 0;
    }
  }
  snapshot() {
    return {
      phase: this.phase,
      time: +this.time.toFixed(2),
      wave: this.wave,
      waveInStage: this.waveInStage,
      totalWaves: this.totalWaves,
      kills: this.kills,
      healed: Math.round(this.healed),
      paused: this.paused,
      speed: this.speed,
      active: this.active,
      distance: Math.round(this.camera),
      camera: this.camera,
      battleOffsetY: BATTLE_OFFSET_Y,
      visibleBounds: { ...this.visibleBounds },
      lineup: [...this.lineup],
      deploymentSlots: this.deploymentSlots.map((p) => ({ ...p })),
      survivors: this.heroes.filter((h) => h.hp > 0).length,
      uses: [...this.uses],
      damage: [...this.damage],
      projectiles: this.shots.length,
      heroes: this.heroes.map((h) => ({ ...h })),
      enemies: this.enemies.map((e) => ({
        id: e.id,
        kind: e.kind,
        element: e.element,
        lane: e.lane,
        combatLane: combatLane(e),
        target: e.target,
        x: e.x,
        y: e.y,
        hp: e.hp,
      })),
      lanes: [0, 1, 2].map((lane) => ({
        alive: this.heroes.filter((h) => h.lane === lane && h.hp > 0).length,
        enemies: this.enemies.filter((e) => combatLane(e) === lane && e.hp > 0)
          .length,
        supporting: this.heroes.filter(
          (h) => h.lane === lane && h.hp > 0 && combatLane(h) !== lane,
        ).length,
        lost: this.lost[lane],
        balanced: ['tank', 'healer', 'damage'].every((role) =>
          this.heroes.some(
            (h) => h.lane === lane && HEROES[h.hero].role === role,
          ),
        ),
      })),
    };
  }
}

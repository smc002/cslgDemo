import { ToyRenderer, ZOMBIE_ART, TOY_SCALE } from '../shared/toy-art';
import {
  ARENA,
  HuntGame,
  SPECIES,
  COURIER_KIND,
  STAGES,
  courierScale,
  type FX,
  type Zombie,
} from './simulation';
import { COURIER_RULES } from '../lib/hunt-save';
import { AMMO_CARRIER } from '../lib/ammo-carrier';
import { auditCombatFrame } from './combat-audit';
import {
  loadAmmoReturnArt,
  drawAmmoDeath,
  drawAmmoParticles,
  ammoArrivalPulse,
  AMMO_FINAL_ARRIVAL,
  type AmmoReturnArt,
} from './ammo-return-vfx';
import {
  drawProjectile,
  drawMuzzleFlash,
  drawHitSpark,
  drawMaterialHit,
  shotRecoil,
} from './combat-vfx';
import { loadCombatArt, type CombatArt } from './combat-art';
import { functional } from '../lib/hunt-economy';
import {
  drawSpecialFoot,
  drawSpecialBadge,
  specialMarkerStyle,
} from './special-markers';
import { drawWeaponAttachments, drawWeaponGauge } from './weapon-state-vfx';
import { drawSpecialBurst, drawCoreFlight, drawJackpot } from './reward-vfx';
import { groupKillRewards } from './reward-groups';
import {
  CombatOverlayLayout,
  comboRect,
  jackpotTitle,
  type OverlayRect,
} from './overlay-layout';
import { drawCourierDeath, courierDeathPose } from './courier-death-vfx';
import { arrivalCamera, featherArrivalGround } from './arrival-vfx';
import {
  loadBodyDeathArt,
  drawBodyDeath,
  type BodyDeathArt,
} from './body-death-vfx';
import {
  advanceZombieClock,
  type ZombieClock,
  type ZombieFacing,
} from './zombie-animation';
import {
  vehicleMuzzle,
  VEHICLE_RIG,
  PLATFORM_RIG,
  arenaViewportOffset,
} from './vehicle-rig';
const FONT = '"Arial Black", "Microsoft YaHei", sans-serif';
export type HuntArt = {
  ground: HTMLImageElement;
  overview: HTMLImageElement;
  arrivalGround: HTMLCanvasElement;
  chassis: HTMLImageElement;
  turret: HTMLImageElement;
  platform: HTMLImageElement;
  ammoIcon: HTMLImageElement;
  ammoReturn: AmmoReturnArt;
  combat?: CombatArt;
  bodyDeaths?: BodyDeathArt;
  scenes: HTMLImageElement[];
};
export class HuntView {
  /** Isolated review controls can hold a render frame without advancing the simulation. */
  arrivalReviewAge?: number;
  private ctx: CanvasRenderingContext2D;
  private toy = new ToyRenderer();
  private art?: HuntArt;
  private observer: ResizeObserver;
  private frame = 0;
  private last = 0;
  private disposed = false;
  private syncClock = 0;
  private displayScale = 1;
  private deviceRatio = 0;
  private zombieClocks = new Map<number, ZombieClock>();
  private ammoFlightLayer?: HTMLCanvasElement;
  constructor(
    private canvas: HTMLCanvasElement,
    public game: HuntGame,
    private sync: () => void,
  ) {
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    if (!this.ctx) throw Error('需要支持 Canvas 2D 的浏览器');
    this.observer = new ResizeObserver(() => {
      this.resize();
      this.draw();
    });
    this.observer.observe(canvas);
    this.resize();
  }
  async init() {
    const load = (url: string) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => reject(Error('美术载入失败'));
        i.src = url;
      });
    const manifest = (await fetch('/assets/hunt/art.json?v=toy-v1', {
      cache: 'no-store',
    }).then((r) => {
      if (!r.ok) throw Error('美术清单载入失败');
      return r.json();
    })) as {
      ground: string;
      overview: string;
      chassis: string;
      turret: string;
      platform: string;
      scenes: string[];
    };
    const [
      ground,
      overview,
      chassis,
      turret,
      platform,
      ammoIcon,
      scenes,
      ammoReturn,
      combat,
      bodyDeaths,
    ] = await Promise.all([
      load(manifest.ground),
      load(manifest.overview),
      load(manifest.chassis),
      load(manifest.turret),
      load(manifest.platform),
      load('/assets/loop/black-gold-ammo.png'),
      Promise.all(manifest.scenes.map(load)),
      loadAmmoReturnArt(load),
      loadCombatArt(load),
      loadBodyDeathArt(load),
      this.toy.load(ZOMBIE_ART),
    ]);
    if (this.disposed) return;
    this.art = {
      ground,
      overview,
      arrivalGround: featherArrivalGround(ground),
      chassis,
      turret,
      platform,
      ammoIcon,
      scenes,
      ammoReturn,
      combat,
      bodyDeaths,
    };
    this.draw();
    this.start();
  }
  private resize() {
    const r = this.canvas.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return;
    this.game.setViewportTop(
      Math.max(0, -arenaViewportOffset((r.height / r.width) * ARENA.w)),
    );
    this.deviceRatio = window.devicePixelRatio || 1;
    // Supersample narrow 1x displays too; cap the surface to avoid excessive GPU memory.
    const d = Math.min(
      Math.max(2, this.deviceRatio),
      3,
      Math.sqrt(4_000_000 / (r.width * r.height)),
    );
    this.displayScale = r.width / ARENA.w;
    const width = Math.max(1, Math.round(r.width * d));
    const height = Math.max(1, Math.round(r.height * d));
    if (this.canvas.width !== width) this.canvas.width = width;
    if (this.canvas.height !== height) this.canvas.height = height;
  }
  start() {
    if (!this.art || this.disposed) return;
    cancelAnimationFrame(this.frame);
    this.last = performance.now();
    this.frame = requestAnimationFrame(this.loop);
  }
  stop() {
    cancelAnimationFrame(this.frame);
    this.game.release();
    this.draw();
  }
  private loop = (now: number) => {
    if (this.disposed) return;
    const dt = Math.min(0.06, (now - this.last) / 1000);
    this.last = now;
    if (this.arrivalReviewAge === undefined) this.game.advance(dt);
    this.draw();
    this.syncClock += dt;
    if (this.syncClock > 0.05) {
      this.syncClock = 0;
      this.sync();
    }
    if (this.game.active) this.frame = requestAnimationFrame(this.loop);
  };
  point(clientX: number, clientY: number) {
    const r = this.canvas.getBoundingClientRect();
    const offset = arenaViewportOffset((r.height / r.width) * ARENA.w);
    return {
      x: ((clientX - r.left) / r.width) * ARENA.w,
      y: ((clientY - r.top) / r.width) * ARENA.w - offset,
    };
  }
  private text(
    t: string,
    x: number,
    y: number,
    size: number,
    color: string,
    stroke = 5,
    maxWidth = Infinity,
  ) {
    const c = this.ctx;
    // Keep small world-space labels legible after fitting into a portrait frame.
    c.font = `900 ${Math.max(size, 11 / this.displayScale)}px ${FONT}`;
    const measured = c.measureText(t).width;
    if (measured > maxWidth)
      c.font = `900 ${(Math.max(size, 11 / this.displayScale) * maxWidth) / measured}px ${FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineJoin = 'round';
    c.strokeStyle = '#172321';
    c.lineWidth = stroke;
    if (stroke > 0) c.strokeText(t, x, y);
    c.fillStyle = color;
    c.fillText(t, x, y);
  }
  private burst(
    x: number,
    y: number,
    radius: number,
    points: number,
    rotation: number,
    color: string,
  ) {
    const c = this.ctx;
    c.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const a = (i / points) * Math.PI + rotation,
        r = i % 2 ? radius * 0.42 : radius;
      const px = x + Math.cos(a) * r,
        py = y + Math.sin(a) * r;
      if (i) c.lineTo(px, py);
      else c.moveTo(px, py);
    }
    c.closePath();
    c.fillStyle = color;
    c.fill();
  }
  private zombieSprite(kind: number, size: number, facing: ZombieFacing = 'S') {
    size *= this.game?.zombieScale ?? 1;
    this.toy.draw(
      this.ctx,
      ZOMBIE_ART[kind],
      0,
      size * 0.37,
      size * 1.12 * TOY_SCALE,
      { left: facing.includes('W') },
    );
  }
  private animatedZombie(z: Zombie, size: number) {
    const clock = advanceZombieClock(this.zombieClocks.get(z.id), z, 1);
    this.zombieClocks.set(z.id, clock);
    return this.toy.draw(
      this.ctx,
      ZOMBIE_ART[z.kind],
      0,
      size * 0.37,
      size * 1.12 * TOY_SCALE,
      {
        time: clock.walk,
        moving: Math.hypot(z.vx, z.vy) >= 0.01,
        left: clock.facing.includes('W'),
        frozen: !!z.frozen,
        hit: z.hit,
      },
    );
  }
  private zombie(z: Zombie) {
    if (!this.art) return;
    if (z.kind === COURIER_KIND) {
      this.courier(z);
      return;
    }
    const c = this.ctx,
      s = SPECIES[z.kind];
    c.save();
    c.translate(z.x, z.y);
    c.scale(this.game.zombieScale, this.game.zombieScale);
    c.fillStyle = '#09141160';
    c.beginPath();
    c.ellipse(
      7,
      s.size * 0.3,
      s.size * 0.31,
      s.size * 0.13,
      -0.3,
      0,
      Math.PI * 2,
    );
    c.fill();
    if (z.kind === 4) {
      const pulse = 1 + Math.sin(this.game.time * 6) * 0.1;
      const glow = c.createRadialGradient(0, 0, 8, 0, 0, s.size * 0.7 * pulse);
      glow.addColorStop(0, '#ffcc5480');
      glow.addColorStop(1, '#ffce4400');
      c.fillStyle = glow;
      c.fillRect(-90, -90, 180, 180);
      c.strokeStyle = '#ffda65';
      c.lineWidth = 2;
      c.setLineDash([6, 8]);
      c.beginPath();
      c.ellipse(0, 25, 37, 14, 0, 0, Math.PI * 2);
      c.stroke();
      c.setLineDash([]);
    }
    drawSpecialFoot(c, z.kind, 0, 0, s.size, this.game.time);
    const marker = specialMarkerStyle(z.kind);
    if (marker) c.filter = `drop-shadow(0px 0px 2px ${marker.outline})`;
    else if (z.hit > 0) c.filter = 'brightness(1.28)';
    this.animatedZombie(z, s.size);
    c.filter = 'none';
    if (z.kind === AMMO_CARRIER.kind) {
      const a = this.game.save.ammoCarrier.active;
      this.text(
        a ? `+${a.refundAmount}` : '返弹',
        0,
        s.size * 0.38 + 20,
        14,
        '#ffe18a',
        4,
      );
      for (let i = 0; i < AMMO_CARRIER.hits; i++) {
        c.fillStyle = i < (a?.hits.length ?? 0) ? '#554b36' : '#f6cc5b';
        c.fillRect(-22 + i * 16, s.size * 0.38, 12, 5);
      }
    }
    if ((z.frozen ?? 0) > 0) {
      c.fillStyle = '#76dfff38';
      c.strokeStyle = '#d1fcff';
      c.lineWidth = 2;
      c.beginPath();
      c.ellipse(0, 0, s.size * 0.4, s.size * 0.5, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      this.text('❄', s.size * 0.34, -s.size * 0.4, 21, '#eaffff', 2);
    }
    c.restore();
  }
  private courier(z: Zombie) {
    const c = this.ctx,
      state = this.game.save.courier.active;
    if (!state) return;
    const broken = Math.floor(
      state.armorHits /
        (COURIER_RULES.hitsPerPlate * courierScale(state.bundle)),
    );
    c.save();
    c.translate(z.x, z.y);
    c.scale(this.game.zombieScale, this.game.zombieScale);
    if ((state.bundle ?? 1) > 1) c.scale(1.4, 1.4);
    c.fillStyle = '#13243160';
    c.beginPath();
    c.ellipse(0, 61, 65, 20, 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = broken === 3 ? '#ffac4d' : '#63dcf0';
    c.lineWidth = 3;
    c.beginPath();
    c.ellipse(0, 60, 71, 24, 0, 0, Math.PI * 2);
    c.stroke();
    this.animatedZombie(z, SPECIES[z.kind].size);
    c.restore();
  }
  private courierLabel(_z: Zombie, box: OverlayRect) {
    const c = this.ctx,
      state = this.game.save.courier.active;
    if (!state) return;
    const broken = Math.floor(
      state.armorHits /
        (COURIER_RULES.hitsPerPlate * courierScale(state.bundle)),
    );
    c.save();
    c.translate(box.x, box.y);
    c.fillStyle = '#142b43f2';
    c.strokeStyle = '#ffbf68';
    c.lineWidth = 1.5;
    c.beginPath();
    c.roundRect(-box.w / 2, -box.h / 2, box.w, box.h, 8);
    c.fill();
    c.stroke();
    this.text(
      '运钞 · 抽奖券 ×' + (state.bundle ?? 1) * 10,
      0,
      -10,
      17,
      '#ffe4a3',
      0,
      204,
    );
    this.text(
      broken < 3
        ? '装甲 ' + Math.max(0, 3 - broken) + '/3'
        : '装甲已破 · 集中火力',
      0,
      12,
      13,
      '#c4edff',
      0,
    );
    c.restore();
  }
  private effect(e: FX) {
    const c = this.ctx,
      t = e.age / e.life;
    c.save();
    if (e.kind === 'specialEntry') {
      // Entry shares the placed actor badge; no duplicate text plate.
    } else if (e.kind === 'laser') {
      c.globalAlpha = Math.min(1, (1 - t) * 2);
      c.lineCap = 'round';
      c.shadowColor = '#00ddff';
      c.shadowBlur = 25;
      for (const [width, color] of [
        [27, '#009bcf50'],
        [13, '#3ae5ff'],
        [4, '#f1ffff'],
      ] as const) {
        c.strokeStyle = color;
        c.lineWidth = width * (1 - t * 0.4);
        c.beginPath();
        c.moveTo(e.x, e.y);
        c.lineTo(e.endX!, e.endY!);
        c.stroke();
      }
    } else if (e.kind === 'weapon') {
      c.globalAlpha = 1 - t;
      c.strokeStyle = e.species === 10 ? '#45edff' : '#ffb65a';
      c.lineWidth = 7 * (1 - t);
      c.beginPath();
      c.arc(e.x, e.y, 35 + t * 110, 0, Math.PI * 2);
      c.stroke();
    } else if (e.kind === 'armorBreak') {
      c.globalAlpha = Math.min(1, (1 - t) * 4);
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3 + e.seed;
        c.save();
        c.translate(
          e.x + Math.cos(a) * t * 115,
          e.y + Math.sin(a) * t * 75 + t * t * 100,
        );
        c.rotate(a + t * 6);
        c.fillStyle = i % 2 ? '#9fb7cd' : '#e0eef5';
        c.strokeStyle = '#203343';
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(-9, -13);
        c.lineTo(12, -6);
        c.lineTo(5, 12);
        c.lineTo(-12, 5);
        c.closePath();
        c.fill();
        c.stroke();
        c.restore();
      }
      const u = Math.min(1, Math.max(0, (t - 0.15) / 0.75));
      for (let i = 0; i < 3; i++) {
        const x = e.x + (300 - e.x) * u + Math.sin(u * Math.PI) * (i - 1) * 33;
        const y = e.y + (82 - e.y) * u - Math.sin(u * Math.PI) * 50;
        c.fillStyle = '#5cd7f2';
        c.strokeStyle = '#e9fcff';
        c.lineWidth = 2;
        c.fillRect(x - 6, y - 6, 12, 12);
        c.strokeRect(x - 6, y - 6, 12, 12);
      }
    } else if (e.kind === 'ammoReturn') {
      if (this.art?.ammoReturn) {
        drawAmmoDeath(
          c,
          this.art.ammoReturn,
          e,
          this.game.zombieScale,
          SPECIES[AMMO_CARRIER.kind].size * 1.12 * TOY_SCALE,
          this.art.bodyDeaths,
        );
        if (
          !this.canvas
            .closest('.hunt-page')
            ?.querySelector('[data-hunt-ammo-inventory] img')
        )
          drawAmmoParticles(
            c,
            this.art.ammoReturn,
            e,
            e.x,
            e.y - 95 * this.game.zombieScale,
            45,
            775,
            this.game.zombieScale,
          );
      } else {
        this.toy.draw(
          c,
          ZOMBIE_ART[AMMO_CARRIER.kind],
          e.x,
          e.y + SPECIES[AMMO_CARRIER.kind].size * 0.37 * this.game.zombieScale,
          SPECIES[AMMO_CARRIER.kind].size *
            1.12 *
            TOY_SCALE *
            this.game.zombieScale,
          { death: e.age, left: e.facing?.includes('W') },
        );
      }
    } else if (e.kind === 'courierArrival') {
      // The stable courier callout replaces the duplicate arrival sentence.
    } else if (e.kind === 'scatter' && e.species === 11) {
      c.globalAlpha = 1 - t;
      c.strokeStyle = '#ffba62';
      c.lineWidth = 5 * (1 - t);
      const heading = Math.atan2(
        this.game.aim.y - ARENA.gunY,
        this.game.aim.x - ARENA.gunX,
      );
      for (let i = 0; i < 7; i++) {
        const a = heading + (i - 3) * 0.115;
        c.beginPath();
        c.moveTo(e.x + Math.cos(a) * 10, e.y + Math.sin(a) * 10);
        c.lineTo(
          e.x + Math.cos(a) * (35 + t * 90),
          e.y + Math.sin(a) * (35 + t * 90),
        );
        c.stroke();
      }
    } else if (
      e.kind === 'blast' ||
      e.kind === 'freeze' ||
      e.kind === 'scatter'
    ) {
      const radius =
        (e.kind === 'blast' ? 155 : e.kind === 'freeze' ? 175 : 60) *
        Math.min(1, t * 3);
      c.globalAlpha = 1 - t;
      c.strokeStyle =
        e.kind === 'blast'
          ? '#ff9238'
          : e.kind === 'freeze'
            ? '#73edff'
            : '#d398ff';
      c.lineWidth = (1 - t) * 12 + 2;
      c.fillStyle =
        e.kind === 'blast'
          ? '#ffae374a'
          : e.kind === 'freeze'
            ? '#8cefff4a'
            : '#c582ff33';
      c.beginPath();
      c.arc(e.x, e.y, radius, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + e.seed;
        this.burst(
          e.x + Math.cos(a) * radius,
          e.y + Math.sin(a) * radius,
          (1 - t) * 10,
          4,
          a,
          e.kind === 'freeze'
            ? '#e5ffff'
            : e.kind === 'scatter'
              ? '#e5c5ff'
              : '#fff27b',
        );
      }
      if (e.kind !== 'scatter')
        this.text(
          e.kind === 'blast' ? '连环爆破!' : '冻结!',
          e.x,
          e.y - 35 - t * 35,
          24,
          e.kind === 'freeze' ? '#ddfcff' : '#fff2ae',
          5,
        );
    } else if (e.kind === 'arc') {
      const tx = e.endX ?? e.x,
        ty = e.endY ?? e.y;
      c.globalAlpha = 1 - t;
      c.strokeStyle = '#23d9e5';
      c.shadowColor = '#35f1ff';
      c.shadowBlur = 14;
      c.lineWidth = 7;
      c.beginPath();
      for (let i = 0; i <= 9; i++) {
        const u = i / 9,
          jitter =
            i === 0 || i === 9
              ? 0
              : Math.sin(i * 12 + e.seed * 30 + t * 35) * 14;
        const x = e.x + (tx - e.x) * u + jitter,
          y = e.y + (ty - e.y) * u - jitter;
        if (i) c.lineTo(x, y);
        else c.moveTo(x, y);
      }
      c.stroke();
      c.shadowBlur = 0;
      c.lineWidth = 2;
      c.strokeStyle = '#e8ffff';
      c.stroke();
    } else if (e.kind === 'shot') {
      // Follow the visible barrel while aiming; only the newest flash is drawn.
      const muzzle = vehicleMuzzle(ARENA.gunX, ARENA.gunY, this.game.aim);
      const recoil = shotRecoil(e.age);
      drawMuzzleFlash(
        c,
        muzzle.x - Math.cos(muzzle.angle) * recoil,
        muzzle.y - Math.sin(muzzle.angle) * recoil,
        muzzle.angle,
        e.age,
        e.seed,
      );
    } else if (e.kind === 'hit') {
      drawMaterialHit(
        c,
        this.art?.combat,
        e.x,
        e.y,
        t,
        e.species,
        e.angle,
        e.seed,
      );
    } else if (e.kind === 'bounce') {
      drawHitSpark(c, e.x, e.y, t, e.seed, true);
    } else if (e.kind === 'kill') {
      const special = functional(e.species);
      if (special)
        drawSpecialBurst(
          c,
          this.art?.combat ?? {},
          e.x,
          e.y - 24,
          e.age,
          e.seed,
          Math.min(1.1, this.game.zombieScale),
        );
      // Production HUD flights are drawn on the page overlay; review canvas has a safe local endpoint.
      if (
        !this.canvas
          .closest('.mori-gameplay-shell')
          ?.querySelector('.core-energy-track')
      )
        drawCoreFlight(
          c,
          this.art?.combat ?? {},
          e.x,
          e.y - 20,
          300,
          Math.max(this.game.visibleTop + 28, 42),
          e.age,
          special,
          e.seed,
        );
    }
    c.restore();
  }
  private score(e: FX, box: OverlayRect) {
    const c = this.ctx,
      special = functional(e.species),
      t = e.age / e.life;
    const { x, y } = box;
    const pop =
      Math.min(1, e.age / 0.09) *
      (1 + Math.sin(Math.min(1, e.age / 0.22) * Math.PI) * 0.12);
    c.save();
    c.translate(x, y);
    c.scale(pop, pop);
    c.globalAlpha = Math.min(1, (1 - t) * 4);
    if (special) {
      const plaque = this.art?.combat?.specialPlaque;
      if (plaque) c.drawImage(plaque, -108, -31, 216, 62);
      else {
        c.fillStyle = '#32164bea';
        c.beginPath();
        c.roundRect(-108, -31, 216, 62, 12);
        c.fill();
      }
      this.text('特殊击破', 0, -13, 18, '#fff1ff', 3);
      this.text(
        `+${e.points.toLocaleString()} 能源核心`,
        0,
        14,
        17,
        '#afffed',
        4,
        204,
      );
    } else
      this.text(`+${e.points.toLocaleString()}`, 0, 0, 21, '#d8ffe9', 3, 110);
    c.restore();
  }
  private courierDeath() {
    const v = this.game.courierVictory;
    if (!v) return;
    const c = this.ctx;
    if (
      this.art?.bodyDeaths &&
      drawBodyDeath(
        c,
        this.art.bodyDeaths,
        COURIER_KIND,
        v.x,
        v.y,
        v.age,
        SPECIES[COURIER_KIND].size,
        this.game.zombieScale,
        v.facing?.includes('W'),
        TOY_SCALE,
      )
    )
      return;
    if (
      drawCourierDeath(
        c,
        this.art?.combat?.courierDeath ?? [],
        v.x,
        v.y,
        v.age,
        SPECIES[COURIER_KIND].size,
        this.game.zombieScale,
        v.facing?.includes('W'),
      )
    )
      return;
    // Missing optional art falls back to a short fade, never a rotated standing card.
    const pose = courierDeathPose(v.age);
    if (!pose) return;
    c.save();
    c.globalAlpha *= pose.alpha * Math.max(0, 1 - v.age / 0.4);
    c.translate(v.x, v.y);
    this.zombieSprite(
      COURIER_KIND,
      SPECIES[COURIER_KIND].size,
      v.facing ?? 'S',
    );
    c.restore();
  }
  private courierVictory() {
    const v = this.game.courierVictory,
      c = this.ctx;
    if (!v) return;
    const tickets = this.game.save.courier.reveal?.tickets;
    if (tickets) {
      drawJackpot(c, this.art?.combat ?? {}, {
        ...v,
        tickets,
        scale: this.game.zombieScale,
        visibleTop: this.overlayTop(),
      });
      return;
    }
    const t = v.age,
      clamp = (n: number) => Math.max(0, Math.min(1, n));
    const reveal = clamp((t - 0.55) / 0.55),
      ending = clamp((t - 2.88) / 0.32);
    c.save();
    c.fillStyle = `rgba(7,18,37,${clamp(t * 3) * 0.78})`;
    c.fillRect(0, 0, 600, 800);
    // One impact flash, followed by wide rings; no glitter particle field.
    if (t < 0.22) {
      c.fillStyle = `rgba(255,245,216,${(1 - t / 0.22) * 0.65})`;
      c.fillRect(0, 0, 600, 800);
    }
    for (let i = 0; i < 3; i++) {
      const u = clamp((t - i * 0.1) / 0.8);
      if (u <= 0 || u >= 1) continue;
      c.globalAlpha = 1 - u;
      c.strokeStyle = i % 2 ? '#8ef7ff' : '#ffbf64';
      c.lineWidth = 18 * (1 - u) + 2;
      c.beginPath();
      c.ellipse(v.x, v.y, 30 + u * 490, 18 + u * 300, 0, 0, Math.PI * 2);
      c.stroke();
    }
    c.globalAlpha = 1;
    if (t > 0.4) {
      const x = v.x + (300 - v.x) * reveal,
        y = v.y + 30 + (305 - v.y - 30) * reveal;
      c.save();
      c.globalAlpha = clamp((t - 0.4) / 0.3) * (1 - ending * 0.4);
      const beam = c.createLinearGradient(x - 85, 0, x + 85, 0);
      beam.addColorStop(0, '#ff983000');
      beam.addColorStop(0.4, '#ffa84a50');
      beam.addColorStop(0.5, '#fff1bfc0');
      beam.addColorStop(0.6, '#ffa84a50');
      beam.addColorStop(1, '#ff983000');
      c.fillStyle = beam;
      c.fillRect(x - 85, 0, 170, y + 80);
      for (let i = 0; i < 10; i++) {
        const angle = (i * Math.PI) / 5 + t * 0.11;
        c.fillStyle = i % 2 ? '#ffc26525' : '#fff3c511';
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x + Math.cos(angle) * 680, y + Math.sin(angle) * 680);
        c.lineTo(
          x + Math.cos(angle + 0.13) * 680,
          y + Math.sin(angle + 0.13) * 680,
        );
        c.closePath();
        c.fill();
      }
      const pulse = 1 + Math.sin(Math.min(1, reveal) * Math.PI) * 0.16;
      c.translate(x, y + Math.sin(t * 3) * 4);
      c.scale(pulse, pulse);
      c.rotate(-0.07 * (1 - reveal));
      c.shadowColor = '#ff9d2f';
      c.shadowBlur = 45;
      c.fillStyle = '#ffb447';
      c.strokeStyle = '#fff3c5';
      c.lineWidth = 4;
      c.beginPath();
      c.roundRect(-72, -88, 144, 180, 14);
      c.fill();
      c.stroke();
      c.shadowBlur = 0;
      c.fillStyle = '#17324b';
      c.beginPath();
      c.roundRect(-61, -77, 122, 158, 8);
      c.fill();
      this.text(
        this.game.save.courier.reveal?.tickets
          ? `×${this.game.save.courier.reveal.tickets}`
          : 'SSR',
        0,
        -26,
        51,
        '#ffc96a',
        0,
      );
      this.text(
        this.game.save.courier.reveal?.tickets ? '抽奖券' : '英雄信标',
        0,
        25,
        23,
        '#fff1cf',
        0,
      );
      c.strokeStyle = '#82f0fa';
      c.lineWidth = 4;
      for (let i = 0; i < 3; i++) {
        const r = 12 + i * 8;
        c.beginPath();
        c.arc(0, 72, r, Math.PI * 1.15, Math.PI * 1.85);
        c.stroke();
      }
      c.restore();
    }
    if (t > 1.05) {
      const u = clamp((t - 1.05) / 0.25),
        scale = 1 + Math.sin(u * Math.PI) * 0.18;
      c.save();
      c.globalAlpha = u;
      c.translate(300, 452);
      c.scale(scale, scale);
      c.rotate(-0.045);
      c.fillStyle = '#ef8527';
      c.strokeStyle = '#ffe3a5';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(-230, -39);
      c.lineTo(236, -48);
      c.lineTo(219, 40);
      c.lineTo(-238, 49);
      c.closePath();
      c.fill();
      c.stroke();
      this.text(
        this.game.save.courier.reveal?.tickets ? '十连抽到手！' : '橙将降临！',
        0,
        0,
        48,
        '#fff6db',
        7,
      );
      c.restore();
      this.text(
        this.game.save.courier.reveal?.tickets
          ? `抽奖券 ×${this.game.save.courier.reveal.tickets}`
          : `随机橙色英雄 ×${this.game.save.courier.reveal?.heroes?.length ?? 1}`,
        300,
        530,
        25,
        '#ffd38a',
        3,
      );
      this.text(
        this.game.save.courier.reveal?.tickets
          ? '已到账 · 可前往英雄进行十连抽'
          : '信号已接入 · 正在迎接新伙伴',
        300,
        568,
        16,
        '#d7f4fa',
        3,
      );
    }
    c.restore();
  }
  private drawAmmoFlights() {
    const page =
      this.canvas.closest('.mori-gameplay-shell') ??
      this.canvas.closest('.hunt-page');
    const inventory = page?.querySelector('[data-hunt-ammo-inventory] img');
    const coreTarget = page?.querySelector('.core-energy-track');
    const art = this.art?.ammoReturn;
    const effects = this.game.effects.filter(
      (e) => e.kind === 'ammoReturn' || e.kind === 'kill',
    );
    if (!page || (!inventory && !coreTarget) || !art || !effects.length) {
      if (this.ammoFlightLayer) this.ammoFlightLayer.style.display = 'none';
      return;
    }
    if (!this.ammoFlightLayer) {
      this.ammoFlightLayer = document.createElement('canvas');
      this.ammoFlightLayer.setAttribute('aria-hidden', 'true');
      Object.assign(this.ammoFlightLayer.style, {
        position: 'absolute',
        inset: '0',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: '40',
      });
      page.appendChild(this.ammoFlightLayer);
    }
    const layer = this.ammoFlightLayer;
    layer.style.display = 'block';
    const pr = page.getBoundingClientRect(),
      cr = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.max(1, Math.round(pr.width * dpr)),
      height = Math.max(1, Math.round(pr.height * dpr));
    if (layer.width !== width) layer.width = width;
    if (layer.height !== height) layer.height = height;
    const c = layer.getContext('2d')!;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, pr.width, pr.height);
    const scale = cr.width / ARENA.w,
      offset = arenaViewportOffset(cr.height / scale);
    for (const e of effects) {
      const target = (
        e.kind === 'ammoReturn' ? inventory : coreTarget
      )?.getBoundingClientRect();
      if (!target || !target.width || !target.height) continue;
      const tx = target.left - pr.left + target.width / 2,
        ty = target.top - pr.top + target.height / 2;
      const sx = cr.left - pr.left + e.x * scale;
      const sy =
        cr.top -
        pr.top +
        (e.y +
          offset -
          (e.kind === 'ammoReturn' ? 95 : 30) * this.game.zombieScale) *
          scale;
      if (e.kind === 'kill') {
        // Draw in arena-sized coordinates for equal particle sizes on narrow phones.
        c.save();
        c.scale(scale, scale);
        drawCoreFlight(
          c,
          this.art?.combat ?? {},
          sx / scale,
          sy / scale,
          tx / scale,
          ty / scale,
          e.age,
          functional(e.species),
          e.seed,
        );
        c.restore();
        if (e.age > 0.85 && e.age < 1.25) {
          c.save();
          c.globalAlpha = Math.sin(((e.age - 0.85) / 0.4) * Math.PI) * 0.7;
          c.strokeStyle = '#9cffe4';
          c.lineWidth = 2;
          c.beginPath();
          c.roundRect(
            target.left - pr.left - 2,
            target.top - pr.top - 2,
            target.width + 4,
            target.height + 4,
            8,
          );
          c.stroke();
          c.restore();
        }
        continue;
      }
      drawAmmoParticles(
        c,
        art,
        e,
        sx,
        sy,
        tx,
        ty,
        scale * this.game.zombieScale,
      );
      const pulse = ammoArrivalPulse(e.age);
      if (pulse > 0) {
        c.save();
        c.globalAlpha = pulse;
        c.strokeStyle = '#ffe395';
        c.lineWidth = 2.5;
        const box =
          inventory
            ?.closest('[data-hunt-ammo-inventory]')
            ?.getBoundingClientRect() ?? target;
        c.beginPath();
        c.roundRect(
          box.left - pr.left - 2,
          box.top - pr.top - 2,
          box.width + 4,
          box.height + 4,
          12,
        );
        c.stroke();
        if (this.art?.ammoIcon) {
          const size = target.width * (1 + pulse * 0.12);
          c.drawImage(
            this.art.ammoIcon,
            tx - size / 2,
            ty - size / 2,
            size,
            size,
          );
        }
        c.restore();
      }
      if (e.age >= AMMO_FINAL_ARRIVAL) {
        const u = (e.age - AMMO_FINAL_ARRIVAL) / 0.7;
        c.save();
        c.globalAlpha = Math.max(0, 1 - u);
        c.font = '900 20px "Microsoft YaHei", sans-serif';
        c.textAlign = 'left';
        c.lineJoin = 'round';
        c.lineWidth = 4;
        c.strokeStyle = '#704207';
        const text = '+' + e.points.toLocaleString();
        c.strokeText(text, tx + 18, ty - 22 - u * 12);
        c.fillStyle = '#fff1a0';
        c.fillText(text, tx + 18, ty - 22 - u * 12);
        c.restore();
      }
    }
  }
  private overlayTop() {
    const coreAward = this.canvas
      .closest('.mori-gameplay-shell')
      ?.querySelector('[data-core-award="active"]');
    // Ticket release is a CSS-sized HUD animation, independent of arena zoom.
    return this.game.visibleTop + (coreAward ? 110 / this.displayScale : 0);
  }
  private drawCallouts() {
    const c = this.ctx,
      g = this.game;
    const top = this.overlayTop();
    const layout = new CombatOverlayLayout(top);
    // Subject protection takes priority over every floating label.
    for (const e of g.effects)
      if (e.kind === 'ammoReturn' && e.age < 1.15)
        layout.reserve({
          x: e.x,
          y: e.y - 48 * g.zombieScale,
          w: 205 * g.zombieScale,
          h: 212 * g.zombieScale,
        });
    if (g.courierVictory && g.courierVictory.age < 1.2)
      layout.reserve({
        x: g.courierVictory.x,
        y: g.courierVictory.y - 50,
        w: 220,
        h: 210,
      });
    if (g.courierVictory) {
      const title = jackpotTitle(top);
      layout.reserve({ ...title, w: 432, h: 126 });
    }
    if (g.save.weapons.active || g.weaponEnding)
      layout.reserve({ x: 417, y: 604, w: 192, h: 42 });
    if (g.combo > 1 && g.comboLife > 0) {
      const preferred = comboRect(top);
      const box = layout.place(
        preferred.x,
        preferred.y,
        preferred.w,
        preferred.h,
      );
      if (box) {
        c.save();
        c.translate(box.x, box.y);
        c.fillStyle = '#21322ccd';
        c.beginPath();
        c.roundRect(-44, -31, 88, 62, 10);
        c.fill();
        this.text(`${g.combo}`, 0, -9, 30, '#ffdc72', 3, 78);
        this.text('连杀', 0, 20, 14, '#fff4ce', 2);
        c.restore();
      }
    }
    const ammo = g.effects.filter((e) => e.kind === 'ammoReturn');
    for (const e of ammo) {
      const box = layout.place(e.x, e.y - 185 * g.zombieScale, 228, 42);
      if (box) {
        c.save();
        c.globalAlpha = Math.min(1, e.age * 8, (e.life - e.age) * 3);
        c.fillStyle = '#261e11e8';
        c.strokeStyle = '#e8bd59';
        c.lineWidth = 1.5;
        c.beginPath();
        c.roundRect(box.x - 114, box.y - 21, 228, 42, 10);
        c.fill();
        c.stroke();
        this.text(`黑金回收 +${e.points}`, box.x, box.y, 23, '#ffe596', 3, 212);
        c.restore();
      }
    }
    const rewards = groupKillRewards(g.effects);
    const special = rewards.filter((e) => functional(e.species));
    const ordinary = rewards.filter((e) => !functional(e.species));
    // A single special card and a single ordinary total are easier to read during chains.
    for (const group of [special, ordinary]) {
      if (!group.length) continue;
      const e = {
        ...group[0],
        points: group.reduce((sum, item) => sum + item.points, 0),
      };
      const isSpecial = functional(e.species);
      const box = layout.place(
        isSpecial ? 240 : e.x,
        isSpecial ? top + 52 : e.y + 32 - e.age * 18,
        isSpecial ? 250 : 126,
        isSpecial ? 82 : 38,
      );
      if (box) this.score(e, box);
    }
    for (const e of g.effects
      .filter((e) => e.kind === 'armorBreak')
      .slice(-1)) {
      const box = layout.place(e.x, e.y - 115, 235, 44);
      if (box)
        this.text(`装甲击破 · +${e.points}`, box.x, box.y, 20, '#d8faff', 4);
    }
    for (const z of [...g.zombies].sort((a, b) => a.id - b.id)) {
      if (z.kind === COURIER_KIND) {
        const box = layout.place(z.x, z.y - 205 * g.zombieScale, 224, 54, true);
        if (box) this.courierLabel(z, box);
        continue;
      }
      const style = specialMarkerStyle(z.kind);
      if (!style) continue;
      const scale = Math.min(1.05, Math.max(0.9, g.zombieScale));
      const size = SPECIES[z.kind].size;
      const preferredY =
        z.y - (size * (1.12 * TOY_SCALE - 0.37) + 15) * g.zombieScale;
      const box = layout.place(
        z.x,
        preferredY,
        (style.label.length * 16 + 33) * scale,
        (z.kind === 6 ? 36 : 30) * scale,
        true,
      );
      if (!box) continue;
      if (Math.hypot(box.x - z.x, box.y - preferredY) > 18) {
        c.save();
        c.strokeStyle = style.color + '88';
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(box.x, box.y + box.h / 2);
        c.lineTo(z.x, preferredY + 20);
        c.stroke();
        c.restore();
      }
      drawSpecialBadge(
        c,
        z.kind,
        box.x,
        box.y + (size * (1.12 * TOY_SCALE - 0.37) + 15) * scale,
        size,
        g.time,
        z.hitsLeft,
        scale,
      );
    }
  }
  draw() {
    // Browser zoom / moving between monitors may change DPR without a CSS resize.
    if (this.deviceRatio !== (window.devicePixelRatio || 1)) this.resize();
    const c = this.ctx,
      g = this.game,
      art = this.art;
    this.drawAmmoFlights();
    const live = new Set(g.zombies.map((z) => z.id));
    for (const effect of g.effects)
      if (effect.actorId !== undefined) live.add(effect.actorId);
    if (g.courierVictory?.actorId !== undefined)
      live.add(g.courierVictory.actorId);
    for (const id of this.zombieClocks.keys())
      if (!live.has(id)) this.zombieClocks.delete(id);
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = 'high';
    // Preserve sprite proportions while the arena fills the portrait screen.
    const scaleToScreen = this.canvas.width / ARENA.w;
    const viewportHeight = this.canvas.height / scaleToScreen;
    const viewportOffset = arenaViewportOffset(viewportHeight);
    const arrivalAge = this.arrivalReviewAge ?? g.arrivalAge;
    const arrival = arrivalCamera(arrivalAge, viewportHeight);
    c.setTransform(
      scaleToScreen,
      0,
      0,
      scaleToScreen,
      0,
      viewportOffset * scaleToScreen,
    );
    c.fillStyle = '#c4dca4';
    c.fillRect(0, -viewportOffset, 600, viewportHeight);
    if (!art) return;
    c.save();
    c.translate(arrival.translateX, arrival.translateY);
    c.scale(arrival.zoom, arrival.zoom);
    if (g.courierVictory && g.courierVictory.age < 0.5) {
      const t = g.courierVictory.age,
        power = (1 - t / 0.5) * 14;
      c.translate(Math.sin(t * 103) * power, Math.cos(t * 87) * power * 0.6);
    } else if (g.shake && !g.courierVictory)
      c.translate(
        Math.sin(g.time * 97) * g.shake,
        Math.cos(g.time * 71) * g.shake * 0.6,
      );
    const transition = g.save.expedition.transition;
    const stage =
      transition && transition.age > 3.5
        ? transition.target
        : g.save.expedition.stage;
    const ground =
      stage > 0 ? (art.scenes?.[stage - 1] ?? art.ground) : art.ground;
    const scale = Math.max(600 / ground.width, viewportHeight / ground.height);
    const w = ground.width * scale,
      h = ground.height * scale;
    const groundX = (600 - w) / 2;
    const groundY = -viewportOffset + (viewportHeight - h) / 2;
    if (arrivalAge !== null && arrival.cameraProgress < 1) {
      // The generated overview places this exact arena at x=25%, y=12%, size=50%.
      c.drawImage(
        art.overview,
        groundX - w / 2,
        groundY - h * 0.24,
        w * 2,
        h * 2,
      );
      c.drawImage(art.arrivalGround, groundX, groundY, w, h);
      c.globalAlpha = Math.max(0, (arrival.cameraProgress - 0.55) / 0.45);
    }
    c.drawImage(ground, groundX, groundY, w, h);
    c.globalAlpha = 1;
    c.fillStyle = '#31402f14';
    // Cover the entire overview too; a close-view-sized tint creates a visible rectangle.
    c.fillRect(groundX - w / 2, groundY - h * 0.24, w * 2, h * 2);
    const vignette = c.createRadialGradient(300, 380, 160, 300, 380, 490);
    vignette.addColorStop(0, '#06181000');
    vignette.addColorStop(1, '#50826925');
    c.fillStyle = vignette;
    c.fillRect(groundX - w / 2, groundY - h * 0.24, w * 2, h * 2);
    if (g.save.bonus) {
      c.fillStyle = '#ffae1914';
      c.fillRect(0, 0, 600, 800);
      c.strokeStyle = `rgba(255,190,54,${0.5 + Math.sin(g.time * 8) * 0.15})`;
      c.lineWidth = 6;
      c.strokeRect(5, 5, 590, 790);
    }
    const muzzle = vehicleMuzzle(ARENA.gunX, ARENA.gunY, g.aim);
    const a = muzzle.angle;
    c.save();
    c.globalAlpha = arrivalAge !== null ? 0 : g.firing ? 0.25 : 0.12;
    c.strokeStyle = '#fff5c6';
    c.setLineDash([6, 11]);
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(muzzle.x, muzzle.y);
    c.lineTo(ARENA.gunX + Math.cos(a) * 1000, ARENA.gunY + Math.sin(a) * 1000);
    c.stroke();
    c.restore();
    if (art.platform) {
      const rig = PLATFORM_RIG;
      c.drawImage(
        art.platform,
        rig.anchor.x - rig.pixelAnchor[0] * rig.scale,
        rig.anchor.y - rig.pixelAnchor[1] * rig.scale,
        art.platform.width * rig.scale,
        art.platform.height * rig.scale,
      );
    }
    if (arrivalAge === null) {
      for (const e of g.effects)
        if (e.kind === 'kill') {
          const drawn =
            art.bodyDeaths &&
            drawBodyDeath(
              c,
              art.bodyDeaths,
              e.species,
              e.x,
              e.y,
              e.age,
              SPECIES[e.species].size,
              g.zombieScale,
              e.facing?.includes('W'),
              TOY_SCALE,
            );
          if (!drawn && e.age < 0.25) {
            c.save();
            c.globalAlpha *= 1 - e.age / 0.25;
            this.toy.draw(
              c,
              ZOMBIE_ART[e.species],
              e.x,
              e.y + SPECIES[e.species].size * 0.37 * g.zombieScale,
              SPECIES[e.species].size * 1.12 * TOY_SCALE * g.zombieScale,
              { left: e.facing?.includes('W') },
            );
            c.restore();
          }
        }
      this.courierDeath();
    }
    if (arrivalAge === null)
      [...g.zombies].sort((a, b) => a.y - b.y).forEach((z) => this.zombie(z));
    for (const b of g.bullets) drawProjectile(c, b);
    const latestShot = g.effects.findLast((e) => e.kind === 'shot');
    c.save();
    const drive = transition
      ? Math.max(0, Math.min(1, (transition.age - 1.45) / 1.6))
      : 0;
    const arriving = transition && transition.age > 3.5;
    c.translate(
      ARENA.gunX,
      ARENA.gunY - (arriving ? 0 : drive * 850) + arrival.vehicleOffset,
    );
    if (arrival.driving) {
      c.save();
      c.globalAlpha = 0.3;
      c.strokeStyle = '#574e3a';
      c.lineWidth = 13;
      for (const side of [-1, 1]) {
        c.beginPath();
        c.moveTo(side * 48, 50);
        c.lineTo(side * 48, 170);
        c.stroke();
      }
      c.fillStyle = '#e5cc94';
      for (let i = 0; i < 6; i++) {
        const t = ((arrivalAge ?? 0) * 2 + i / 6) % 1;
        c.globalAlpha = 0.23 * (1 - t);
        c.beginPath();
        c.ellipse(
          (i % 2 ? 1 : -1) * (50 + t * 24),
          75 + t * 85,
          9 + t * 22,
          6 + t * 12,
          0,
          0,
          Math.PI * 2,
        );
        c.fill();
      }
      c.restore();
      c.translate(0, Math.sin((arrivalAge ?? 0) * 38) * 0.8);
    }
    c.fillStyle = '#0b171985';
    c.beginPath();
    c.ellipse(0, 40, 72, 53, 0, 0, Math.PI * 2);
    c.fill();
    if (art.chassis && art.turret) {
      const rig = VEHICLE_RIG;
      c.drawImage(
        art.chassis,
        -rig.chassisPivot[0] * rig.chassisScale,
        -rig.chassisPivot[1] * rig.chassisScale,
        art.chassis.width * rig.chassisScale,
        art.chassis.height * rig.chassisScale,
      );
      c.save();
      const recoil = transition ? 0 : shotRecoil(latestShot?.age ?? 1);
      c.translate(-Math.cos(a) * recoil, -Math.sin(a) * recoil);
      c.rotate(
        transition || arrivalAge !== null
          ? vehicleMuzzle(0, 0, { x: 0, y: -1 }).rotation
          : muzzle.rotation,
      );
      const weapon = g.save.weapons.active;
      if (weapon) {
        c.shadowColor = weapon.kind === 'laser' ? '#00ddff' : '#ff973d';
        c.shadowBlur = 12;
      }
      c.drawImage(
        art.turret,
        -rig.turretPivot[0] * rig.turretScale,
        -rig.turretPivot[1] * rig.turretScale,
        art.turret.width * rig.turretScale,
        art.turret.height * rig.turretScale,
      );
      const ending = g.weaponEnding;
      if (weapon || ending)
        drawWeaponAttachments(
          c,
          art.combat ?? {},
          weapon?.kind ?? ending!.kind,
          weapon ? 20 - weapon.left : 20,
          weapon?.left ?? 0,
          weapon ? 0 : ending!.age,
        );
      c.restore();
    }
    c.restore();
    for (const e of g.effects)
      if (e.kind !== 'ammoReturn' && (e.kind !== 'shot' || e === latestShot))
        this.effect(e);
    for (const e of g.effects) if (e.kind === 'ammoReturn') this.effect(e);
    const activeWeapon = g.save.weapons.active;
    if (activeWeapon || g.weaponEnding)
      drawWeaponGauge(
        c,
        activeWeapon?.kind ?? g.weaponEnding!.kind,
        417,
        604,
        activeWeapon?.left ?? 0,
        20,
        activeWeapon ? 0 : g.weaponEnding!.age,
      );
    if (g.firing) {
      c.strokeStyle = '#fff1b8';
      c.lineWidth = 2;
      c.beginPath();
      c.arc(g.aim.x, g.aim.y, 17, 0, Math.PI * 2);
      c.stroke();
    }
    c.restore();
    this.courierVictory();
    if (arrivalAge === null) this.drawCallouts();
    this.sceneTransition();
    auditCombatFrame(this.canvas, g);
  }
  private sceneTransition() {
    const t = this.game.save.expedition.transition;
    if (!t) return;
    const c = this.ctx,
      age = t.age;
    c.save();
    if (age < 1.65) {
      // Staggered artillery impacts: large shock rings and chunky smoke bursts.
      for (let i = 0; i < 12; i++) {
        const elapsed = age - i * 0.07;
        if (elapsed < 0 || elapsed > 0.95) continue;
        const x = 65 + ((i * 173) % 480),
          y = 160 + ((i * 131) % 425);
        c.globalAlpha = Math.min(1, (0.95 - elapsed) * 2.4);
        c.strokeStyle = '#fff1c2';
        c.lineWidth = 6;
        c.beginPath();
        c.moveTo(x - 110, y - 300);
        c.lineTo(x, y);
        c.stroke();
        this.burst(x, y, 30 + elapsed * 170, 9, i, '#e88436');
        this.burst(x, y, 20 + elapsed * 105, 7, i + 0.3, '#fff3c1');
        c.strokeStyle = '#edfaff';
        c.lineWidth = 3;
        c.beginPath();
        c.arc(x, y, 35 + elapsed * 210, 0, Math.PI * 2);
        c.stroke();
      }
      c.globalAlpha = 1;
      this.text('炮火掩护 · 全区肃清', 300, 365, 32, '#fff5d6', 6);
      this.text('转场清场不获得能源核心或掉落', 300, 409, 16, '#fff5d6', 3);
    }
    if (age >= 1.65 && age < 3.15) {
      this.text('车队出发！', 300, 355, 36, '#fff5d6', 5);
      c.strokeStyle = '#d6ece699';
      c.lineWidth = 3;
      for (let i = 0; i < 14; i++) {
        const y = ((age * 700 + i * 79) % 850) - 50;
        const x = i % 2 ? 35 + i * 6 : 565 - i * 6;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x, y + 85);
        c.stroke();
      }
    }
    const blackout =
      age < 3.5
        ? Math.max(0, Math.min(1, (age - 2.9) / 0.45))
        : Math.max(0, 1 - (age - 3.9) / 0.75);
    c.fillStyle = `rgba(6,16,30,${blackout})`;
    c.fillRect(0, 0, 600, 800);
    if (age > 4.05) {
      const u = Math.min(1, (age - 4.05) / 0.6);
      const fade = Math.min(1, (6.8 - age) / 0.5);
      c.globalAlpha = fade;
      const color = t.target === 1 ? '#78f0ff' : '#b49cff';
      c.shadowColor = color;
      c.shadowBlur = 28;
      c.fillStyle = color;
      const travel = 400 * (1 - Math.pow(1 - u, 3));
      c.fillRect(-100 + travel - 170, 341, 180, 8);
      c.fillRect(700 - travel - 10, 371, 180, 8);
      if (u > 0.75) {
        c.shadowBlur = 0;
        c.fillStyle = '#10283ce8';
        c.fillRect(0, 308, 600, 132);
        c.fillStyle = color;
        c.fillRect(50, 308, 500, 3);
        c.fillRect(50, 437, 500, 3);
        this.text(`SECTOR 0${t.target + 1}`, 300, 332, 14, color, 0);
        this.text(STAGES[t.target].name, 300, 376, 43, '#f6fffa', 5);
        this.text(STAGES[t.target].unlock, 300, 418, 19, color, 0);
      }
    }
    c.restore();
  }
  dispose() {
    this.disposed = true;
    this.ammoFlightLayer?.remove();

    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
  }
}

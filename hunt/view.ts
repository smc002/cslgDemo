import {
  ARENA,
  HuntGame,
  SPECIES,
  SPECIAL_LABELS,
  SCATTER_HITS,
  COURIER_KIND,
  STAGES,
  courierScale,
  type FX,
  type Zombie,
} from './simulation';
import { COURIER_RULES } from '../lib/hunt-save';
import {
  zombieFrame,
  zombieDirection,
  advanceZombieClock,
  type ZombieAnimationManifest,
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
  zombies: HTMLImageElement;
  gunner: HTMLImageElement;
  atlas: boolean;
  rows?: number;
  zombiePadding?: number;
  supportSheet?: boolean;
  courier?: HTMLImageElement;
  vehicle?: HTMLImageElement;
  chassis?: HTMLImageElement;
  turret?: HTMLImageElement;
  platform?: HTMLImageElement;
  weapons?: HTMLImageElement;
  scenes?: HTMLImageElement[];
  zombieAnimation?: {
    manifest: ZombieAnimationManifest;
    sheets: Record<string, HTMLImageElement>;
  };
};
export class HuntView {
  private ctx: CanvasRenderingContext2D;
  private art?: HuntArt;
  private observer: ResizeObserver;
  private frame = 0;
  private last = 0;
  private disposed = false;
  private syncClock = 0;
  private displayScale = 1;
  private deviceRatio = 0;
  private zombieClocks = new Map<number, ZombieClock>();
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
    const manifest = (await fetch('/assets/hunt/art.json?v=cartoon2', {
      cache: 'no-store',
    }).then((r) => {
      if (!r.ok) throw Error('美术清单载入失败');
      return r.json();
    })) as {
      ground: string;
      zombies: string;
      gunner: string;
      atlas: boolean;
      rows?: number;
      zombiePadding?: number;
      supportSheet?: boolean;
      courier: string;
      vehicle: string;
      chassis?: string;
      turret?: string;
      platform?: string;
      weapons: string;
      scenes: string[];
      zombieAnimation?: string;
    };
    const [ground, zombies, gunner, courier, vehicle, weapons, ...scenes] =
      await Promise.all([
        load(manifest.ground),
        load(manifest.zombies),
        load(manifest.gunner),
        load(manifest.courier),
        load(manifest.vehicle),
        load(manifest.weapons),
        ...manifest.scenes.map(load),
      ]);
    const [chassis, turret, platform] = await Promise.all([
      manifest.chassis ? load(manifest.chassis) : undefined,
      manifest.turret ? load(manifest.turret) : undefined,
      manifest.platform ? load(manifest.platform) : undefined,
    ]);
    let zombieAnimation: HuntArt['zombieAnimation'];
    if (manifest.zombieAnimation) {
      const animation: ZombieAnimationManifest = await fetch(
        manifest.zombieAnimation,
      ).then((r) => {
        if (!r.ok) throw Error('僵尸动画清单载入失败');
        return r.json();
      });
      const base = new URL(manifest.zombieAnimation, window.location.href);
      const entries = await Promise.all(
        Object.entries(animation.archetypes).map(
          async ([id, value]) =>
            [id, await load(new URL(value.atlas, base).href)] as const,
        ),
      );
      zombieAnimation = {
        manifest: animation,
        sheets: Object.fromEntries(entries),
      };
    }
    if (this.disposed) return;
    this.art = {
      ground,
      zombies,
      gunner,
      courier,
      vehicle,
      chassis,
      turret,
      platform,
      weapons,
      scenes,
      zombieAnimation,
      atlas: manifest.atlas,
      rows: manifest.rows ?? 3,
      zombiePadding: manifest.zombiePadding ?? 0,
      supportSheet: manifest.supportSheet ?? true,
    };
    this.draw();
    this.start();
  }
  private resize() {
    const r = this.canvas.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return;
    this.game.visibleTop = Math.max(
      0,
      -arenaViewportOffset((r.height / r.width) * ARENA.w),
    );
    this.deviceRatio = window.devicePixelRatio || 1;
    // Supersample narrow 1x displays too; cap the surface to avoid excessive GPU memory.
    const d = Math.min(
      Math.max(2, this.deviceRatio),
      3,
      Math.sqrt(4_000_000 / (r.width * r.height)),
    );
    this.displayScale = Math.min(r.width / ARENA.w, r.height / ARENA.h);
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
    this.game.advance(dt);
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
  ) {
    const c = this.ctx;
    // Keep small world-space labels legible after fitting into a portrait frame.
    c.font = `900 ${Math.max(size, 11 / this.displayScale)}px ${FONT}`;
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
    const art = this.art!;
    const animation = art.zombieAnimation;
    const definition = animation?.manifest.kinds[String(kind)];
    const archetype =
      definition && animation?.manifest.archetypes[definition.archetype];
    const sheet = definition && animation?.sheets[definition.archetype];
    if (animation && definition && archetype && sheet) {
      const direction = zombieDirection(archetype, facing);
      const index = direction.clips.idle.frames[0];
      const columns = archetype.columns ?? 4;
      const { cell, anchor } = animation.manifest;
      const scale = (size * 1.12) / archetype.visibleHeight;
      this.ctx.save();
      this.ctx.filter = definition.filter || 'none';
      if (direction.mirror) this.ctx.scale(-1, 1);
      // Defeated enemies retain their new identity during the existing fade.
      this.ctx.drawImage(
        sheet,
        (index % columns) * cell,
        Math.floor(index / columns) * cell,
        cell,
        cell,
        -anchor.foot[0] * scale,
        size * 0.37 - anchor.foot[1] * scale,
        cell * scale,
        cell * scale,
      );
      this.ctx.restore();
      return;
    }
    const weapon = kind >= 10 && !!art.weapons;
    const source = weapon ? art.weapons! : art.zombies;
    const columns = weapon ? 2 : 3;
    const index = weapon ? kind - 10 : kind;
    const w = source.width / columns;
    const h = source.height / (weapon ? 1 : (art.rows ?? 3));
    // The isolated atlas adds transparent padding around the original 418px
    // cells. Compensate in destination space to preserve size and position.
    const padding = weapon ? 0 : (art.zombiePadding ?? 0);
    const scaleX = size / (w - padding * 2);
    const scaleY = (size * 1.15) / (h - padding * 2);
    this.ctx.drawImage(
      source,
      (index % columns) * w,
      Math.floor(index / columns) * h,
      w,
      h,
      -size / 2 - padding * scaleX,
      -size * 0.6 - padding * scaleY,
      w * scaleX,
      h * scaleY,
    );
  }
  private animatedZombie(z: Zombie, size: number) {
    const animation = this.art?.zombieAnimation;
    if (!animation) return false;
    const kind = animation.manifest.kinds[String(z.kind)];
    const archetype = kind && animation.manifest.archetypes[kind.archetype];
    const source = kind && animation.sheets[kind.archetype];
    if (!archetype || !source) return false;
    const legacyFps = archetype.clips?.walk.fps ?? 8;
    const playbackRate = archetype.directions
      ? (kind.playbackRate ?? 1)
      : (kind.fps ?? legacyFps) / legacyFps;
    const clock = advanceZombieClock(
      this.zombieClocks.get(z.id),
      z,
      playbackRate,
    );
    this.zombieClocks.set(z.id, clock);
    const hit = z.hit > 0;
    const direction = zombieDirection(archetype, clock.facing);
    const clip = hit
      ? direction.clips.hit
      : Math.hypot(z.vx, z.vy) < 0.01
        ? direction.clips.idle
        : direction.clips.walk;
    const index = zombieFrame(clip, hit ? 1 - z.hit / 0.13 : clock.walk, hit);
    const { cell, anchor } = animation.manifest;
    const scale = (size * 1.12) / archetype.visibleHeight;
    const c = this.ctx;
    c.save();
    if (direction.mirror) c.scale(-1, 1);
    c.filter =
      [
        kind.filter,
        z.frozen ? 'brightness(1.12) saturate(.55)' : '',
        z.hit > 0.09 ? 'brightness(1.3)' : '',
      ]
        .filter(Boolean)
        .join(' ') || 'none';
    c.drawImage(
      source,
      (index % (archetype.columns ?? 4)) * cell,
      Math.floor(index / (archetype.columns ?? 4)) * cell,
      cell,
      cell,
      -anchor.foot[0] * scale,
      size * 0.37 - anchor.foot[1] * scale,
      cell * scale,
      cell * scale,
    );
    c.restore();
    return true;
  }
  private zombie(z: Zombie) {
    if (!this.art) return;
    if (z.kind === COURIER_KIND) {
      this.courier(z);
      return;
    }
    const c = this.ctx,
      s = SPECIES[z.kind],
      bob =
        (z.frozen ?? 0) > 0
          ? 0
          : Math.sin(z.age * (z.kind === 1 ? 14 : 8) + z.seed * 20);
    c.save();
    c.translate(z.x, z.y);
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
    const animated = this.animatedZombie(z, s.size);
    if (!animated) {
      c.rotate(bob * 0.025);
      c.translate(0, bob * 1.5);
      if ((z.frozen ?? 0) > 0) c.filter = 'brightness(1.2) saturate(.5)';
      if (z.hit > 0) c.filter = 'brightness(1.7)';
    }
    if (animated) {
      // Authored limb motion replaces the legacy whole-sprite wobble.
    } else if ((z.kind >= 10 && this.art.weapons) || this.art.atlas) {
      this.zombieSprite(z.kind, s.size);
    } else {
      if (z.kind === 1) c.filter = 'hue-rotate(45deg)';
      if (z.kind === 2) c.filter = 'saturate(.25)';
      if (z.kind === 3) c.filter = 'hue-rotate(280deg)';
      if (z.kind === 4) c.filter = 'sepia(1) saturate(3)';
      c.drawImage(
        this.art.zombies,
        -s.size / 2,
        -s.size * 0.6,
        s.size,
        s.size * 1.15,
      );
    }
    c.filter = 'none';
    if (z.kind === 4)
      this.text('奖励', 0, -s.size * 0.82 - 8, 17, '#ffe977', 4);
    if (z.kind === 3)
      this.text('巨型', 0, -s.size * 0.82 - 8, 14, '#ffb968', 4);
    if (z.kind >= 5)
      this.text(
        z.kind === 6
          ? `散射 ${z.hitsLeft ?? SCATTER_HITS}/${SCATTER_HITS}`
          : SPECIAL_LABELS[z.kind],
        0,
        -s.size * 0.82 - 8,
        13,
        s.color,
        4,
      );
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
    const art = this.art?.courier,
      c = this.ctx,
      state = this.game.save.courier.active;
    if (!art || !state) return;
    const broken = Math.floor(
      state.armorHits /
        (COURIER_RULES.hitsPerPlate * courierScale(state.bundle)),
    );
    c.save();
    c.translate(z.x, z.y);
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
    const w = art.width / 2,
      h = art.height / 2;
    c.save();
    if (!this.animatedZombie(z, SPECIES[z.kind].size)) {
      c.translate(
        z.hit > 0 ? Math.sin(z.hit * 70) * 4 : 0,
        Math.sin(z.age * 5) * 1.5,
      );
      if (z.hit > 0) c.filter = 'brightness(1.5)';
      c.drawImage(
        art,
        (broken % 2) * w,
        Math.floor(broken / 2) * h + 65,
        w,
        h - 65,
        -100,
        -107,
        200,
        199,
      );
    }
    c.restore();
    c.restore();
  }
  private courierLabel(z: Zombie) {
    const c = this.ctx,
      state = this.game.save.courier.active;
    if (!state) return;
    const perPlate = COURIER_RULES.hitsPerPlate * courierScale(state.bundle);
    const broken = Math.floor(state.armorHits / perPlate);
    c.save();
    c.translate(z.x, z.y);
    if ((state.bundle ?? 1) > 1) c.scale(1.18, 1.18);
    c.fillStyle = '#142b43f2';
    c.strokeStyle = '#ffbf68';
    c.lineWidth = 2;
    c.beginPath();
    c.roundRect(-106, -159, 212, 45, 10);
    c.fill();
    c.stroke();
    this.text(
      (state.bundle ?? 1) > 1 ? '巨型装甲运钞僵尸' : '装甲运钞僵尸',
      0,
      -146,
      20,
      '#f8f9e9',
      0,
    );
    this.text(
      `击杀必得 · 橙色英雄 ×${state.bundle ?? 1}`,
      0,
      -127,
      13,
      '#ffc16b',
      0,
    );
    if (broken < 3) {
      for (let i = 0; i < 3; i++) {
        const x = (i - 1) * 46,
          gone = i < broken;
        const remaining = gone
          ? 0
          : i === broken
            ? perPlate - (state.armorHits % perPlate)
            : perPlate;
        c.fillStyle = gone ? '#2b3943df' : i === broken ? '#27b5d7' : '#576b83';
        c.strokeStyle = gone ? '#8b9caa' : '#ddf7ff';
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(x - 20, -20);
        c.lineTo(x + 20, -20);
        c.lineTo(x + 18, 8);
        c.lineTo(x, 19);
        c.lineTo(x - 18, 8);
        c.closePath();
        c.fill();
        c.stroke();
        this.text(
          gone ? '破' : '甲',
          x,
          -2,
          gone ? 22 : 27,
          gone ? '#a7bfbd' : '#fff',
          2,
        );
      }
    } else {
      const left =
        COURIER_RULES.pity * courierScale(state.bundle) - state.bodyHits;
      c.fillStyle = '#122c42f5';
      c.strokeStyle = left <= 5 ? '#ffb955' : '#78edf8';
      c.lineWidth = 2;
      c.beginPath();
      c.roundRect(-108, 79, 216, 51, 9);
      c.fill();
      c.stroke();
      this.text('装甲已破', 0, 94, 21, '#ffe0a0', 0);
      this.text('集中火力！', 0, 116, 14, '#cff6ff', 0);
    }
    c.restore();
  }
  private effect(e: FX) {
    const c = this.ctx,
      t = e.age / e.life,
      big = e.species >= 2,
      s = big ? 1.6 : 1;
    c.save();
    if (e.kind === 'laser') {
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
      this.text(
        e.angle === 3 ? '装甲全破！' : `第${e.angle}片击破！`,
        e.x,
        e.y - 58 - t * 38,
        23,
        '#e1fcff',
        5,
      );
      this.text(
        `+${e.points.toLocaleString()} 能源核心`,
        e.x,
        e.y - 25 - t * 38,
        29,
        '#fff5ca',
        5,
      );
    } else if (e.kind === 'courierArrival') {
      c.globalAlpha = Math.min(1, (1 - t) * 3);
      this.text(
        '装甲运钞僵尸出现！',
        e.x,
        e.y + 112 - t * 24,
        21,
        '#ffe1a0',
        5,
      );
    } else if (e.kind === 'xp') {
      c.globalAlpha = Math.min(1, (1 - t) * 3);
      this.text(
        `射击 +${e.points} 能源核心`,
        e.x + 67,
        e.y - t * 24,
        13,
        '#ecffb8',
        3,
      );
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
      this.text(
        e.kind === 'blast'
          ? '连环爆破!'
          : e.kind === 'freeze'
            ? '冻结!'
            : '散射!',
        e.x,
        e.y - 35 - t * 35,
        24,
        e.kind === 'freeze'
          ? '#ddfcff'
          : e.kind === 'scatter'
            ? '#edcbff'
            : '#fff2ae',
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
      c.translate(e.x, e.y);
      c.rotate(e.angle);
      c.globalAlpha = 1 - t;
      this.burst(
        10,
        0,
        (22 + t * 20) * (this.game.save.bonus ? 1.4 : 1),
        5,
        0,
        '#ffb527',
      );
      this.burst(5, 0, 14, 4, 0.3, '#fff5ba');
    } else if (e.kind === 'hit' || e.kind === 'bounce') {
      c.globalAlpha = 1 - t;
      this.burst(e.x, e.y, 10 + 18 * t, 4, e.seed * 4, '#ffe3a1');
    } else {
      if (t < 0.24 && this.art?.atlas) {
        const size = SPECIES[e.species].size;
        c.save();
        c.globalAlpha = 1 - t / 0.24;
        c.translate(
          e.x + Math.cos(e.angle) * t * 100,
          e.y + Math.sin(e.angle) * t * 100,
        );
        c.rotate(Math.sin(e.seed * 12) * t * 2.5);
        c.scale(1 + t, Math.max(0.1, 1 - t * 2));
        this.zombieSprite(
          e.species,
          size,
          (e.actorId !== undefined
            ? this.zombieClocks.get(e.actorId)?.facing
            : undefined) ??
            e.facing ??
            'S',
        );
        c.restore();
      }
      if (t < 0.3) {
        c.globalAlpha = 1 - t / 0.3;
        this.burst(e.x, e.y, (24 + t * 220) * s, 9, e.seed * 7, '#ffbc38');
        this.burst(e.x, e.y, (18 + t * 170) * s, 7, e.seed * 6, '#fff4c0');
        c.strokeStyle = '#fff0b2';
        c.lineWidth = 4 * (1 - t);
        c.beginPath();
        c.arc(e.x, e.y, (18 + t * 180) * s, 0, Math.PI * 2);
        c.stroke();
      }
      c.globalAlpha = Math.max(0, 1 - t * 1.2);
      for (let i = 0; i < (big ? 18 : 10); i++) {
        const a = i * 2.399 + e.seed * 11,
          speed = (32 + (i % 5) * 13) * s,
          d = Math.sin((Math.min(1, t * 1.6) * Math.PI) / 2) * speed;
        const x = e.x + Math.cos(a) * d,
          y = e.y + Math.sin(a) * d + t * t * 40;
        c.save();
        c.translate(x, y);
        c.rotate(a + t * 8);
        c.fillStyle = i % 3 ? '#ffd967' : '#95c75d';
        c.strokeStyle = '#29372c';
        c.lineWidth = 2;
        c.fillRect(-3, -3, 7, 7);
        c.strokeRect(-3, -3, 7, 7);
        c.restore();
      }
      // Only the glow travels. The real score was already credited by the simulation.
      if (t > 0.25) {
        const u = Math.min(1, (t - 0.25) / 0.65),
          eased = u * u;
        for (let i = 0; i < 5; i++) {
          const x =
              e.x + (300 - e.x) * eased + Math.sin(u * Math.PI) * (i - 2) * 22,
            y = e.y + (82 - e.y) * eased - Math.sin(u * Math.PI) * 75;
          c.globalAlpha = 1 - Math.max(0, (u - 0.8) * 5);
          c.fillStyle = '#ffe27a';
          c.shadowColor = '#ffac1b';
          c.shadowBlur = 12;
          c.beginPath();
          c.arc(x, y, 3.5 + (i % 2), 0, Math.PI * 2);
          c.fill();
        }
      }
    }
    c.restore();
  }
  private score(e: FX) {
    const c = this.ctx,
      t = e.age / e.life,
      big = e.species >= 2;
    const x = Math.max(100, Math.min(500, e.x + Math.sin(e.id * 2.4) * 23)),
      y = Math.max(143, Math.min(640, e.y - 22 - t * 76));
    const pop =
      t < 0.12
        ? 0.55 + (t / 0.12) * 0.7
        : 1 + Math.max(0, 0.25 - (t - 0.12) * 2);
    c.save();
    c.translate(x, y);
    c.scale(pop, pop);
    c.rotate(e.id % 2 ? -0.055 : 0.045);
    c.globalAlpha = Math.min(1, (1 - t) * 5);
    if (big) {
      c.fillStyle = e.species >= 3 ? '#e68b1de8' : '#253831e8';
      c.strokeStyle = '#ffdb6c';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(-91, -25);
      c.lineTo(94, -29);
      c.lineTo(83, 23);
      c.lineTo(-95, 29);
      c.closePath();
      c.fill();
      c.stroke();
    }
    this.text(
      `+${e.points.toLocaleString()}`,
      0,
      0,
      big ? 35 : 28,
      big ? '#fff2a1' : '#fff1b5',
      5,
    );
    this.text('能源核心', 0, 28, 12, '#fff5ce', 3);
    c.restore();
  }
  private courierVictory() {
    const animation = this.art?.zombieAnimation;
    const kind = animation?.manifest.kinds[String(COURIER_KIND)];
    const archetype = kind && animation?.manifest.archetypes[kind.archetype];
    const sheet = kind && animation?.sheets[kind.archetype];
    const v = this.game.courierVictory,
      art = sheet ?? this.art?.courier,
      c = this.ctx;
    if (!v || !art) return;
    const facing =
      (v.actorId !== undefined
        ? this.zombieClocks.get(v.actorId)?.facing
        : undefined) ??
      v.facing ??
      'S';
    const direction = archetype
      ? zombieDirection(archetype, facing)
      : undefined;
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
    // Break apart the actual defeated sprite into large, readable armor chunks.
    if (t < 1.05) {
      const u = clamp((t - 0.1) / 0.95);
      const cell = animation?.manifest.cell ?? 320;
      const index = direction?.clips.idle.frames[0] ?? 7;
      const columns = archetype?.columns ?? 4;
      const frame = sheet
        ? {
            x: (index % columns) * cell,
            y: Math.floor(index / columns) * cell,
            w: cell,
            h: cell,
          }
        : {
            x: art.width / 2,
            y: art.height / 2 + 65,
            w: art.width / 2,
            h: art.height / 2 - 65,
          };
      const scale = archetype
        ? (SPECIES[COURIER_KIND].size * 1.12) / archetype.visibleHeight
        : 1;
      const width = sheet ? cell * scale : 200;
      const height = sheet ? cell * scale : 200;
      const left = sheet ? -animation!.manifest.anchor.foot[0] * scale : -100;
      const top = sheet
        ? SPECIES[COURIER_KIND].size * 0.37 -
          animation!.manifest.anchor.foot[1] * scale
        : -107;
      for (let row = 0; row < 4; row++)
        for (let col = 0; col < 4; col++) {
          const dx = (col - 1.5) * 120 * u,
            dy = (row - 1.5) * 70 * u + u * u * 140;
          c.save();
          c.globalAlpha = 1 - u;
          c.translate(
            v.x +
              (direction?.mirror
                ? -(left + ((col + 0.5) * width) / 4 + dx)
                : left + ((col + 0.5) * width) / 4 + dx),
            v.y + top + ((row + 0.5) * height) / 4 + dy,
          );
          c.rotate((col - 1.5) * u * 1.7);
          if (direction?.mirror) c.scale(-1, 1);
          c.filter =
            [sheet ? kind?.filter : '', t < 0.18 ? 'brightness(2)' : '']
              .filter(Boolean)
              .join(' ') || 'none';
          c.drawImage(
            art,
            frame.x + (col * frame.w) / 4,
            frame.y + (row * frame.h) / 4,
            frame.w / 4,
            frame.h / 4,
            -width / 8,
            -height / 8,
            width / 4,
            height / 4,
          );
          c.restore();
        }
    }
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
      this.text('SSR', 0, -26, 51, '#ffc96a', 0);
      this.text('英雄信标', 0, 25, 23, '#fff1cf', 0);
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
      this.text('橙将降临！', 0, 0, 52, '#fff6db', 7);
      c.restore();
      this.text(
        `随机橙色英雄 ×${this.game.save.courier.reveal?.heroes?.length ?? 1}`,
        300,
        530,
        25,
        '#ffd38a',
        3,
      );
      this.text('信号已接入 · 正在迎接新伙伴', 300, 568, 16, '#d7f4fa', 3);
    }
    c.restore();
  }
  draw() {
    // Browser zoom / moving between monitors may change DPR without a CSS resize.
    if (this.deviceRatio !== (window.devicePixelRatio || 1)) this.resize();
    const c = this.ctx,
      g = this.game,
      art = this.art;
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
    c.drawImage(
      ground,
      (600 - w) / 2,
      -viewportOffset + (viewportHeight - h) / 2,
      w,
      h,
    );
    c.fillStyle = '#fff3be08';
    c.fillRect(0, -viewportOffset, 600, viewportHeight);
    const vignette = c.createRadialGradient(300, 380, 160, 300, 380, 490);
    vignette.addColorStop(0, '#06181000');
    vignette.addColorStop(1, '#50826925');
    c.fillStyle = vignette;
    c.fillRect(0, 0, 600, 800);
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
    c.globalAlpha = g.firing ? 0.25 : 0.12;
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
    [...g.zombies].sort((a, b) => a.y - b.y).forEach((z) => this.zombie(z));
    if (art.supportSheet && !art.chassis && !transition) {
      const cell = art.gunner.width / 2;
      c.drawImage(
        art.gunner,
        cell,
        0,
        cell,
        art.gunner.height,
        ARENA.gunX - 90,
        ARENA.gunY - 90,
        180,
        180,
      );
    }
    for (const b of g.bullets) {
      const len = b.bonus ? 33 : 23,
        n = Math.hypot(b.vx, b.vy);
      c.save();
      c.lineCap = 'round';
      c.strokeStyle = b.generation
        ? '#c170ff'
        : b.bonus
          ? '#ff9c1f'
          : '#ffce57';
      c.shadowColor = '#ffab22';
      c.shadowBlur = b.bonus ? 18 : 9;
      c.lineWidth = b.bonus ? 6 : 4;
      c.beginPath();
      c.moveTo(b.x - (b.vx / n) * len, b.y - (b.vy / n) * len);
      c.lineTo(b.x, b.y);
      c.stroke();
      c.shadowBlur = 0;
      c.strokeStyle = '#fff7d7';
      c.lineWidth = 2;
      c.stroke();
      c.restore();
    }
    c.save();
    const drive = transition
      ? Math.max(0, Math.min(1, (transition.age - 1.45) / 1.6))
      : 0;
    const arriving = transition && transition.age > 3.5;
    c.translate(ARENA.gunX, ARENA.gunY - (arriving ? 0 : drive * 850));
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
      c.rotate(
        transition
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
      c.restore();
    } else if (art.vehicle) {
      const cell = art.vehicle.width / 2;
      const weapon = g.save.weapons.active;
      c.drawImage(
        art.vehicle,
        0,
        0,
        cell,
        art.vehicle.height,
        -63,
        -70,
        126,
        140,
      );
      c.save();
      c.rotate(transition ? 0 : a + Math.PI / 2);
      if (weapon) {
        c.shadowColor = weapon.kind === 'laser' ? '#00ddff' : '#ff973d';
        c.shadowBlur = 18;
      }
      c.drawImage(
        art.vehicle,
        cell,
        0,
        cell,
        art.vehicle.height,
        -48,
        -48,
        96,
        96,
      );
      c.restore();
    } else {
      c.rotate(a + Math.PI / 2);
      c.drawImage(
        art.gunner,
        art.supportSheet ? 0 : art.gunner.width * 0.205,
        0,
        art.supportSheet ? art.gunner.width / 2 : art.gunner.width * 0.59,
        art.gunner.height,
        -52,
        -52,
        104,
        104,
      );
    }
    c.restore();
    if (!transition && !art.chassis)
      this.text(
        '装甲车 · 安全区',
        ARENA.gunX,
        ARENA.gunY + 76,
        12,
        '#efffd9',
        3,
      );
    for (const e of g.effects) this.effect(e);
    for (const e of g.effects) if (e.kind === 'kill') this.score(e);
    for (const z of g.zombies)
      if (z.kind === COURIER_KIND) this.courierLabel(z);
    if (g.firing) {
      c.strokeStyle = '#fff1b8';
      c.lineWidth = 2;
      c.beginPath();
      c.arc(g.aim.x, g.aim.y, 17, 0, Math.PI * 2);
      c.stroke();
    }
    c.restore();
    if (g.combo > 1 && g.comboLife > 0) {
      c.save();
      c.translate(493, 172);
      c.rotate(-0.1);
      this.text(`${g.combo}`, 0, 0, 42, '#ffda61', 6);
      this.text('连杀!', 0, 33, 17, '#fff4cc', 4);
      c.restore();
    }
    this.courierVictory();
    this.sceneTransition();
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
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
  }
}

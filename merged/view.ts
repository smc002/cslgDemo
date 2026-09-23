import { animations, poseAt } from '../shared/hero-animation';
import {
  MergedBattle,
  HEROES,
  COLORS,
  effectLifetime,
  BATTLE_OFFSET_Y,
  type Unit,
  type Effect,
} from './simulation';
import { HERO_FRAMES } from './frames';
import { REAR_FRAMES } from '@/shared/sprite-frames';
export class MergedView {
  private c: CanvasRenderingContext2D;
  private poseSheets = new Map<string, HTMLImageElement>();
  private ground?: HTMLImageElement;
  private bossAtlas?: HTMLImageElement;
  private atlas?: HTMLImageElement;
  private zombies?: HTMLImageElement;
  private silhouettes = new Map<string, HTMLCanvasElement>();
  private observer: ResizeObserver;
  private raf = 0;
  private last = 0;
  private timer = 0;
  private disposed = false;
  ready = false;
  constructor(
    private canvas: HTMLCanvasElement,
    public game: MergedBattle,
    private sync: () => void,
  ) {
    this.c = canvas.getContext('2d', { alpha: false })!;
    this.observer = new ResizeObserver(() => {
      this.resize();
      this.draw();
    });
    this.observer.observe(canvas);
    this.resize();
  }
  private resize() {
    const r = this.canvas.getBoundingClientRect(),
      d = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.round(r.width * d));
    this.canvas.height = Math.max(1, Math.round(r.height * d));
    this.updateBounds();
  }
  private updateBounds() {
    const frame = this.canvas.getBoundingClientRect();
    if (!frame.height) return;
    const parent = this.canvas.parentElement;
    const lanes = parent
      ?.querySelector('.merged-lanes')
      ?.getBoundingClientRect();
    const controls = parent
      ?.querySelector('.merged-battle-controls')
      ?.getBoundingClientRect();
    const bottom = controls
      ? ((controls.top - frame.top) / frame.height) * 752 - 14
      : 650;
    this.game.visibleBounds = {
      left: 30,
      right: 360,
      top: Math.min(
        bottom - 100,
        Math.max(
          220,
          lanes ? ((lanes.bottom - frame.top) / frame.height) * 752 + 66 : 220,
        ),
      ),
      bottom,
    };
  }
  async init() {
    const load = (src: string) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => reject(Error(src));
        i.src = src;
      });
    const [ground, atlas, zombies] = await Promise.all([
      load('/assets/merged/background-readable.png'),
      load('/assets/merged/heroes.png'),
      load('/assets/portrait/characters.png'),
    ]);
    await Promise.all(
      Object.values(animations).flatMap((hero) =>
        hero.clips.map(async (clip) => {
          const image = await load(
            `/assets/animations/${hero.folder}/${clip.name}.png`,
          );
          this.poseSheets.set(`${hero.folder}/${clip.name}`, image);
        }),
      ),
    );
    this.bossAtlas = await load('/assets/prologue-v1/boss/boss-actions.png');
    if (this.disposed) return;
    this.ground = ground;
    this.atlas = atlas;
    this.zombies = zombies;
    this.ready = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }
  private loop = (now: number) => {
    if (this.disposed) return;
    const dt = Math.min(0.06, (now - this.last) / 1000);
    this.last = now;
    if (!document.hidden) this.game.advance(dt);
    if (this.game.active) this.draw();
    this.timer += dt;
    if (this.timer > 0.12 && this.game.active) {
      this.updateBounds();
      this.sync();
      this.timer = 0;
    }
    this.raf = requestAnimationFrame(this.loop);
  };
  draw() {
    if (!this.ready) return;
    const c = this.c,
      g = this.game;
    c.setTransform(
      this.canvas.width / 390,
      0,
      0,
      this.canvas.width > this.canvas.height
        ? this.canvas.width / 390
        : this.canvas.height / 752,
      0,
      this.canvas.width > this.canvas.height
        ? (-300 * this.canvas.width) / 390
        : 0,
    );
    const offset = g.phase === 'prep' ? 0 : BATTLE_OFFSET_Y;
    const scroll = (g.camera + offset) % 752;
    // Every combat stage shares the advancing street and camera. Camp gates
    // belong to the story cards, so they never hide movement between waves.
    c.drawImage(this.ground!, 0, scroll, 390, 752);
    c.drawImage(this.ground!, 0, scroll - 752, 390, 752);
    c.save();
    c.translate(0, g.camera + offset);
    for (const boss of g.enemies.filter((e) => e.boss && e.hp > 0)) {
      if (boss.bossCharge !== undefined || (boss.bossRecovery ?? 0) > 0.35) {
        const impact = boss.bossCharge === undefined;
        c.fillStyle = impact ? '#fff1a8b0' : '#ff65334d';
        c.strokeStyle = impact ? '#ffcf64' : '#ff522a';
        c.lineWidth = impact ? 5 : 2;
        c.fillRect(boss.x - 62, boss.y - 8, 124, 163);
        c.strokeRect(boss.x - 62, boss.y - 8, 124, 163);
        c.fillStyle = '#8a2d20';
        c.font = 'bold 12px sans-serif';
        c.textAlign = 'center';
        c.fillText(impact ? '重砸！' : '举盾蓄力', boss.x, boss.y + 140);
      }
    }
    for (const u of [...g.heroes, ...g.enemies].sort((a, b) => a.y - b.y))
      this.unit(u);
    for (const s of g.shots) {
      c.save();
      c.strokeStyle = s.heal
        ? '#71ffab'
        : s.kind === 'drone'
          ? '#63edff'
          : s.kind === 'minigun'
            ? '#ffb943'
            : '#ffec99';
      c.shadowColor = c.strokeStyle;
      c.shadowBlur = 14;
      c.lineWidth = s.kind === 'minigun' ? 3.5 : 4;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(s.x - (s.x - s.px) * 1.5, s.y - (s.y - s.py) * 1.5);
      c.lineTo(s.x, s.y);
      c.stroke();
      c.strokeStyle = '#fffde6';
      c.lineWidth = 1.2;
      c.stroke();
      c.fillStyle = '#fffde6';
      c.beginPath();
      c.arc(s.x, s.y, 2.2, 0, Math.PI * 2);
      c.fill();
      if (s.heal) {
        c.lineWidth = 2;
        this.cross(s.x, s.y, 5);
      }
      c.restore();
    }
    for (const e of g.effects) this.effect(e);
    // Health and role markers remain legible above bright combat effects.
    for (const u of [...g.heroes, ...g.enemies])
      if (u.hp > 0) this.unitLabel(u);
    c.restore();
  }
  private sprite(z: boolean, index: number) {
    const key = `${z}:${index}`;
    if (this.silhouettes.has(key)) return this.silhouettes.get(key)!;
    const f = z ? REAR_FRAMES[9 + index] : HERO_FRAMES[index];
    const mask = document.createElement('canvas');
    mask.width = f.w + 16;
    mask.height = f.h + 16;
    const m = mask.getContext('2d')!;
    m.drawImage(
      z ? this.zombies! : this.atlas!,
      f.x,
      f.y,
      f.w,
      f.h,
      8,
      8,
      f.w,
      f.h,
    );
    m.globalCompositeOperation = 'source-in';
    m.fillStyle = z ? '#fff1d4' : '#fff9e7';
    m.fillRect(0, 0, mask.width, mask.height);
    const result = document.createElement('canvas');
    result.width = mask.width;
    result.height = mask.height;
    const r = result.getContext('2d')!;
    const radius = f.h / (z ? 65 : 52);
    for (let n = 0; n < 8; n++) {
      const a = (n * Math.PI) / 4;
      r.drawImage(mask, Math.cos(a) * radius, Math.sin(a) * radius);
    }
    r.drawImage(
      z ? this.zombies! : this.atlas!,
      f.x,
      f.y,
      f.w,
      f.h,
      8,
      8,
      f.w,
      f.h,
    );
    this.silhouettes.set(key, result);
    return result;
  }
  private cross(x: number, y: number, r: number) {
    const c = this.c;
    c.beginPath();
    c.moveTo(x - r, y);
    c.lineTo(x + r, y);
    c.moveTo(x, y - r);
    c.lineTo(x, y + r);
    c.stroke();
  }
  private unit(u: Unit) {
    if (u.boss && this.bossAtlas) {
      const c = this.c;
      const frame =
        u.hp <= 0
          ? 7
          : u.bossCharge !== undefined
            ? u.bossCharge > 0.9
              ? 3
              : 4
            : (u.bossRecovery ?? 0) > 0.35
              ? 5
              : (u.bossRecovery ?? 0) > 0
                ? 6
                : 0;
      c.save();
      c.globalAlpha = u.hp <= 0 ? Math.max(0, 1 - u.age) : 1;
      c.drawImage(
        this.bossAtlas,
        (frame % 4) * 512,
        Math.floor(frame / 4) * 512,
        512,
        512,
        u.x - 64,
        u.y - 114,
        128,
        128,
      );
      if (u.hp > 0) {
        c.fillStyle = '#58302a';
        c.font = 'bold 12px sans-serif';
        c.textAlign = 'center';
        c.fillText('破门王', u.x, u.y - 120);
      }
      c.restore();
      return;
    }
    if (u.hp <= 0 && u.age > 0.4 && !animations[u.hero]) return;
    const c = this.c,
      z = u.hero < 0,
      f = z ? REAR_FRAMES[9 + u.kind] : HERO_FRAMES[u.hero],
      cfg = z ? null : HEROES[u.hero];
    const h = z ? (u.kind === 2 ? 57 : 40) : cfg!.role === 'tank' ? 61 : 52,
      w = (h * f.w) / f.h;
    c.save();
    c.globalAlpha =
      u.hp <= 0 && !animations[u.hero] ? Math.max(0, 1 - u.age / 0.4) : 1;
    c.fillStyle = '#26312e55';
    c.beginPath();
    c.ellipse(u.x + 2, u.y + 1, w * 0.35, 5, 0, 0, Math.PI * 2);
    c.fill();
    if (!z && u.hp > 0) {
      c.strokeStyle = COLORS[u.lane];
      c.fillStyle = COLORS[u.lane] + '50';
      c.lineWidth = 2;
      c.beginPath();
      c.ellipse(u.x, u.y, w * 0.4, 6, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    }
    c.save();
    c.translate(u.x, u.y);
    const library = animations[u.hero];
    if (library) {
      const clip =
        u.hp <= 0
          ? 'death'
          : (u.animation?.clip ??
            (u.moving
              ? 'walk'
              : u.hero <= 2
                ? 'idle'
                : u.hero === 3
                  ? 'slash'
                  : (u.aimClip ?? 'crouch')));
      const time =
        u.hp <= 0
          ? u.age
          : u.animation
            ? u.animation.elapsed * 1.8
            : u.moving
              ? this.game.time + u.id * 0.13
              : 0;
      const pose = poseAt(u.hero, clip, time, clip === 'walk')!;
      const sheet = this.poseSheets.get(`${library.folder}/${clip}`);
      const scale = h / (3.2 * pose.clip.pixelsPerUnit),
        p = pose.frame;
      if (u.facingLeft) c.scale(-1, 1);
      if (u.hit > 0) c.filter = 'brightness(1.25)';
      c.shadowColor = '#fff5d9';
      c.shadowBlur = 2;
      if (sheet)
        c.drawImage(
          sheet,
          p.x,
          p.y,
          p.w,
          p.h,
          -p.anchorX * scale,
          -p.anchorY * scale,
          p.w * scale,
          p.h * scale,
        );
    } else {
      c.rotate(
        u.moving
          ? Math.sin(this.game.time * 13 + u.id) * 0.035
          : u.attack > 0
            ? 0.025
            : 0,
      );
      if (u.hit > 0) c.filter = 'brightness(1.25)';
      c.drawImage(
        this.sprite(z, z ? u.kind : u.hero),
        ((-f.footX - 8) * h) / f.h,
        ((-f.footY - 8) * h) / f.h,
        w + (16 * h) / f.h,
        h + (16 * h) / f.h,
      );
    }
    c.restore();
    if (u.hero === 2 && u.hp > 0)
      for (let n = 0; n < 2; n++) {
        const angle = this.game.time * 4 + n * Math.PI,
          x = u.x + Math.cos(angle) * 24,
          y = u.y - 38 + Math.sin(angle) * 6;
        c.save();
        c.translate(x, y);
        c.fillStyle = '#173946';
        c.strokeStyle = '#72ecff';
        c.lineWidth = 1.3;
        c.beginPath();
        c.roundRect(-5, -3, 10, 7, 2);
        c.fill();
        c.stroke();
        c.fillStyle = '#b1f8ff';
        c.fillRect(-2, -1, 4, 2);
        for (const dx of [-7, 7]) {
          c.beginPath();
          c.ellipse(
            dx,
            0,
            5,
            2 + Math.sin(this.game.time * 50) * 0.6,
            0,
            0,
            Math.PI * 2,
          );
          c.stroke();
        }
        c.restore();
      }
    if (u.hero === 6 && u.attack > 0) {
      c.strokeStyle = '#fff3a0';
      c.lineWidth = 2.5;
      c.shadowColor = '#ffbb55';
      c.shadowBlur = 16;
      for (let n = 0; n < 6; n++) {
        const a = (n * Math.PI) / 3 + this.game.time * 5;
        c.beginPath();
        c.moveTo(u.x + 16 + Math.cos(a) * 3, u.y - 38 + Math.sin(a) * 3);
        c.lineTo(u.x + 16 + Math.cos(a) * 10, u.y - 38 + Math.sin(a) * 10);
        c.stroke();
      }
      this.cross(u.x + 16, u.y - 38, 6);
    }
    c.restore();
  }
  private unitLabel(u: Unit) {
    const c = this.c,
      z = u.hero < 0,
      cfg = z ? null : HEROES[u.hero];
    const h = u.boss
      ? 104
      : z
        ? u.kind === 2
          ? 57
          : 40
        : cfg!.role === 'tank'
          ? 61
          : 52;
    c.save();
    const bw = u.boss ? 70 : z ? 25 : 34,
      y = u.y - h - 6;
    c.fillStyle = '#173a30';
    c.fillRect(u.x - bw / 2 - 1, y - 1, bw + 2, 6);
    c.fillStyle = z ? '#e87962' : '#a2ed78';
    c.fillRect(u.x - bw / 2, y, (bw * u.hp) / u.maxHp, 4);
    if (!z) {
      c.fillStyle = cfg!.color;
      c.font = 'bold 9px sans-serif';
      c.textAlign = 'center';
      c.strokeStyle = '#173a30';
      c.lineWidth = 3;
      const icon =
        cfg!.role === 'healer' ? '+' : cfg!.role === 'tank' ? '◆' : '✦';
      c.strokeText(icon, u.x - bw / 2 - 6, y + 4);
      c.fillText(icon, u.x - bw / 2 - 6, y + 4);
    }
    c.restore();
  }
  private effect(e: Effect) {
    const c = this.c,
      t = e.age / effectLifetime(e.kind);
    c.save();
    c.globalAlpha = Math.pow(1 - t, 0.7);
    c.lineCap = 'round';
    c.lineWidth = 2;
    const palette = {
      shield: '#70d7ff',
      blade: '#ffaf67',
      music: '#f396ff',
      blink: '#b394ff',
      stab: '#bfa0ff',
      holy: '#fff0ac',
      sniper: '#cbf6ff',
      hit: '#fff1c1',
      heal: '#8effb6',
    };
    c.strokeStyle = palette[e.kind];
    c.fillStyle = palette[e.kind];
    c.shadowColor = palette[e.kind];
    c.shadowBlur = 7;
    if (e.kind === 'blade' && e.amount === 1) {
      c.lineWidth = 4 * (1 - t) + 1;
      c.beginPath();
      c.ellipse(e.tx, e.ty + 18, 12 + t * 46, 5 + t * 17, 0, 0, Math.PI * 2);
      c.stroke();
    }
    if (e.kind === 'shield') {
      c.lineWidth = 8;
      c.beginPath();
      c.arc(e.x, e.y, 29 + t * 32, -Math.PI, 0);
      c.stroke();
      c.strokeStyle = '#e3fbff';
      c.lineWidth = 2.5;
      c.stroke();
      c.fillStyle = '#52bfffff';
      c.globalAlpha *= 0.22;
      c.beginPath();
      c.arc(e.x, e.y, 36, 0, Math.PI * 2);
      c.fill();
      c.globalAlpha = Math.pow(1 - t, 0.7);
      c.fillStyle = '#237dac99';
      c.strokeStyle = '#b5f4ff';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(e.x - 13, e.y - 19);
      c.lineTo(e.x + 13, e.y - 19);
      c.lineTo(e.x + 10, e.y - 2);
      c.lineTo(e.x, e.y + 8);
      c.lineTo(e.x - 10, e.y - 2);
      c.closePath();
      c.fill();
      c.stroke();
    } else if (e.kind === 'blade' || e.kind === 'stab') {
      const blade = e.kind === 'blade',
        r = blade ? 49 : 28,
        start = -0.3 + Math.PI * t,
        end = 2.9 + Math.PI * t;
      c.lineWidth = blade ? 10 : 5;
      c.beginPath();
      c.arc(e.tx, e.ty, r * (0.55 + t), start, end);
      c.stroke();
      c.strokeStyle = '#fff8df';
      c.lineWidth = blade ? 3 : 1.7;
      c.stroke();
      c.strokeStyle = palette[e.kind];
      for (let n = 0; n < 6; n++) {
        const a = n * 1.05 + t * 3;
        c.beginPath();
        c.moveTo(
          e.tx + Math.cos(a) * (9 + t * 24),
          e.ty + Math.sin(a) * (9 + t * 24),
        );
        c.lineTo(
          e.tx + Math.cos(a) * (17 + t * 33),
          e.ty + Math.sin(a) * (17 + t * 33),
        );
        c.stroke();
      }
      if (!blade) {
        c.lineWidth = 4;
        c.beginPath();
        c.moveTo(e.tx - 18, e.ty - 19 + t * 8);
        c.lineTo(e.tx + 17, e.ty + 14);
        c.moveTo(e.tx + 18, e.ty - 19);
        c.lineTo(e.tx - 17, e.ty + 14);
        c.stroke();
      }
    } else if (e.kind === 'music') {
      c.lineWidth = 3.5;
      for (let n = 0; n < 3; n++) {
        c.beginPath();
        c.ellipse(
          e.x,
          e.y + 10,
          18 + t * 42 + n * 7,
          8 + t * 18 + n * 3,
          0,
          0,
          Math.PI * 2,
        );
        c.stroke();
      }
      c.font = 'bold 24px sans-serif';
      c.fillText('♪', e.x - 30 - t * 15, e.y - 22 - t * 24);
      c.fillText('♫', e.x + 20 + t * 15, e.y - t * 35);
      if (e.x !== e.tx || e.y !== e.ty) {
        c.setLineDash([5, 8]);
        c.beginPath();
        c.moveTo(e.x, e.y);
        c.lineTo(e.tx, e.ty);
        c.stroke();
      }
    } else if (e.kind === 'blink') {
      // One event records the exact departure and actual landing point.
      const points = [
        [e.x, e.y],
        [e.tx, e.ty],
      ];
      for (let endpoint = 0; endpoint < 2; endpoint++) {
        const [x, y] = points[endpoint],
          radius = 26 + t * 20;
        const glow = c.createRadialGradient(x, y, 3, x, y, 55);
        glow.addColorStop(0, '#f4c8ff55');
        glow.addColorStop(0.45, '#934eff35');
        glow.addColorStop(1, '#6438b900');
        c.fillStyle = glow;
        c.fillRect(x - 55, y - 55, 110, 110);
        c.strokeStyle = '#a95fff';
        c.lineWidth = 5;
        c.beginPath();
        c.ellipse(x, y + 18, radius, 10 + t * 8, 0, 0, Math.PI * 2);
        c.stroke();
        c.strokeStyle = '#f5d6ff';
        c.lineWidth = 1.7;
        c.stroke();
        c.strokeStyle = '#bc7aff';
        c.lineWidth = 3;
        c.beginPath();
        c.ellipse(
          x,
          y - 4,
          16 + t * 5,
          31 + t * 9,
          0,
          -Math.PI / 2 + t * 4,
          Math.PI * 1.3 + t * 4,
        );
        c.stroke();
        for (let n = 0; n < 12; n++) {
          const a = (n * Math.PI) / 6 + t * (endpoint ? 3 : -3),
            r = 12 + t * 31;
          c.fillStyle = n % 3 ? '#dba5ff' : '#fff0ff';
          c.beginPath();
          c.arc(
            x + Math.cos(a) * r,
            y + Math.sin(a) * r * 0.8,
            2 + (1 - t) * 1.5,
            0,
            Math.PI * 2,
          );
          c.fill();
        }
        c.strokeStyle = '#fff0ff';
        c.lineWidth = 3;
        this.cross(x, y - 4, 9 * (1 - t) + 3);
      }
      c.globalAlpha = (1 - t) * 0.45;
      c.strokeStyle = '#d6a2ff';
      c.lineWidth = 3;
      c.setLineDash([9, 8]);
      c.lineDashOffset = -e.age * 45;
      c.beginPath();
      c.moveTo(e.x, e.y);
      c.quadraticCurveTo((e.x + e.tx) / 2 + 24, (e.y + e.ty) / 2, e.tx, e.ty);
      c.stroke();
      c.setLineDash([]);
      const f = HERO_FRAMES[5],
        h = 52,
        w = (h * f.w) / f.h;
      c.globalAlpha = (1 - t) * 0.5;
      c.filter = 'brightness(1.7) sepia(.4)';
      c.drawImage(
        this.atlas!,
        f.x,
        f.y,
        f.w,
        f.h,
        e.x - (f.footX * h) / f.h,
        e.y + 20 - (f.footY * h) / f.h,
        w,
        h,
      );
    } else if (e.kind === 'holy') {
      const gradient = c.createLinearGradient(
        e.tx,
        e.ty - 140,
        e.tx,
        e.ty + 12,
      );
      gradient.addColorStop(0, '#fff0a100');
      gradient.addColorStop(0.7, '#f5d86966');
      gradient.addColorStop(1, '#fffbdadf');
      c.fillStyle = gradient;
      c.fillRect(e.tx - 18, e.ty - 140, 36, 158);
      c.fillStyle = '#fff9db';
      c.fillRect(e.tx - 3, e.ty - 66, 6, 82);
      c.lineWidth = 3;
      this.cross(e.tx, e.ty - 8, 14);
      c.beginPath();
      c.ellipse(e.tx, e.ty + 20, 26 + t * 15, 10, 0, 0, Math.PI * 2);
      c.stroke();
    } else if (e.kind === 'sniper') {
      const dx = e.tx - e.x,
        dy = e.ty - e.y,
        length = Math.hypot(dx, dy) || 1;
      c.lineWidth = t < 0.3 ? 9 : 4;
      c.beginPath();
      c.moveTo(e.x, e.y);
      // Extend along the actual shot ray, not a fixed vertical offset.
      c.lineTo(e.tx + (dx / length) * 160, e.ty + (dy / length) * 160);
      c.stroke();
      c.strokeStyle = '#ffffff';
      c.lineWidth = t < 0.3 ? 3 : 1;
      c.stroke();
      c.beginPath();
      c.arc(e.tx, e.ty, 15 + t * 11, 0, Math.PI * 2);
      c.stroke();
      this.cross(e.tx, e.ty, 22);
    } else {
      c.font =
        e.kind === 'heal' ? 'bold 14px sans-serif' : 'bold 12px sans-serif';
      c.textAlign = 'center';
      c.shadowBlur = 0;
      c.strokeStyle = '#234032';
      c.lineWidth = 2;
      const text = (e.kind === 'heal' ? '+' : '−') + Math.round(e.amount),
        y = e.ty - t * 26;
      c.strokeText(text, e.tx, y);
      c.fillText(text, e.tx, y);
      if (e.kind === 'heal') {
        c.strokeStyle = palette.heal;
        c.lineWidth = 3;
        this.cross(e.tx - 16, y - 10, 6);
        c.beginPath();
        c.ellipse(e.tx, e.ty + 20, 14 + t * 10, 6, 0, 0, Math.PI * 2);
        c.stroke();
      }
    }
    c.restore();
  }
  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.observer.disconnect();
    this.poseSheets.clear();
    this.silhouettes.clear();
  }
}

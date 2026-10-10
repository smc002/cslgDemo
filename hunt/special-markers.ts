import { TOY_SCALE } from '../shared/toy-art';

export type SpecialMarkerStyle = {
  color: string;
  outline: string;
  label: string;
};

const STYLES: Readonly<Record<number, SpecialMarkerStyle>> = {
  4: { color: '#ffcf62', outline: '#fff0bd', label: '奖励' },
  5: { color: '#ff995d', outline: '#ffe0ba', label: '爆炸' },
  6: { color: '#c991ff', outline: '#edd5ff', label: '散射' },
  7: { color: '#59e3ed', outline: '#d2ffff', label: '电弧' },
  8: { color: '#a4dfff', outline: '#edfbff', label: '冰冻' },
  10: { color: '#5ef1ef', outline: '#d3fffa', label: '激光' },
  11: { color: '#ffac64', outline: '#ffe8c9', label: '散弹' },
  12: { color: '#eec65e', outline: '#fff2bf', label: '黑金返弹' },
};

export const specialMarkerStyle = (kind: number): SpecialMarkerStyle | null =>
  STYLES[kind] ?? null;

const TAU = Math.PI * 2;
const FONT = '"Microsoft YaHei", sans-serif';
const finite = (...values: number[]) => values.every(Number.isFinite);

/** Draw a compact geometric symbol at the current origin, with a 7-unit radius. */
function symbol(c: CanvasRenderingContext2D, kind: number) {
  c.lineWidth = 1.7;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  if (kind === 4 || kind === 12) {
    // A diamond identifies reward; the cartridge surround identifies black gold.
    c.moveTo(0, -6);
    c.lineTo(5, 0);
    c.lineTo(0, 6);
    c.lineTo(-5, 0);
    c.closePath();
    c.stroke();
    if (kind === 12) {
      c.beginPath();
      c.moveTo(-7, -4);
      c.lineTo(-7, 6);
      c.lineTo(7, 6);
      c.lineTo(7, -4);
      c.stroke();
    }
  } else if (kind === 5) {
    for (let i = 0; i < 12; i++) {
      const angle = (i * TAU) / 12 - Math.PI / 2;
      const r = i % 2 ? 3 : 7;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.closePath();
    c.fill();
  } else if (kind === 6 || kind === 11) {
    for (let i = -1; i <= 1; i++) {
      c.moveTo(i * 2, 5);
      c.lineTo(i * 6, -5);
    }
    c.stroke();
    if (kind === 6) {
      for (let i = -1; i <= 1; i++) {
        c.beginPath();
        c.arc(i * 6, -5, 1.5, 0, TAU);
        c.fill();
      }
    } else {
      c.fillRect(-3, 4, 6, 3);
    }
  } else if (kind === 7) {
    c.moveTo(2, -7);
    c.lineTo(-5, 1);
    c.lineTo(0, 1);
    c.lineTo(-2, 7);
    c.lineTo(5, -1);
    c.lineTo(0, -1);
    c.closePath();
    c.fill();
  } else if (kind === 8) {
    for (let i = 0; i < 6; i++) {
      const a = (i * TAU) / 6;
      const x = Math.cos(a),
        y = Math.sin(a);
      c.moveTo(0, 0);
      c.lineTo(x * 7, y * 7);
      c.moveTo(x * 5 - y * 2, y * 5 + x * 2);
      c.lineTo(x * 4, y * 4);
      c.lineTo(x * 5 + y * 2, y * 5 - x * 2);
    }
    c.stroke();
  } else if (kind === 10) {
    c.moveTo(-7, 0);
    c.lineTo(7, 0);
    c.moveTo(-6, -4);
    c.lineTo(4, -4);
    c.moveTo(-6, 4);
    c.lineTo(4, 4);
    c.moveTo(4, -3);
    c.lineTo(7, 0);
    c.lineTo(4, 3);
    c.stroke();
  }
}

/** Call before the sprite, at the unscaled actor anchor (not the sprite center). */
export function drawSpecialFoot(
  c: CanvasRenderingContext2D,
  kind: number,
  x: number,
  y: number,
  size: number,
  time: number,
  scale = 1,
) {
  const style = specialMarkerStyle(kind);
  if (!style || !finite(x, y, size, time, scale) || size <= 0 || scale <= 0)
    return;
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  const pulse = 0.8 + Math.sin(time * 2.5 + kind) * 0.12;
  c.globalAlpha *= pulse;
  c.strokeStyle = style.color;
  c.lineWidth = 1.6;
  c.beginPath();
  c.ellipse(0, size * 0.3, size * 0.43, size * 0.14, 0, 0, TAU);
  c.stroke();
  c.globalAlpha *= 0.4;
  c.lineWidth = 3;
  c.beginPath();
  c.ellipse(0, size * 0.3, size * 0.43, size * 0.14, 0, 0.2, 1.1);
  c.stroke();
  c.beginPath();
  c.ellipse(
    0,
    size * 0.3,
    size * 0.43,
    size * 0.14,
    0,
    Math.PI + 0.2,
    Math.PI + 1.1,
  );
  c.stroke();
  c.restore();
}

/** Call after the sprite. Remaining is the scatter target's unspent hit count. */
export function drawSpecialBadge(
  c: CanvasRenderingContext2D,
  kind: number,
  x: number,
  y: number,
  size: number,
  time: number,
  remaining?: number,
  scale = 1,
) {
  const style = specialMarkerStyle(kind);
  if (!style || !finite(x, y, size, time, scale) || size <= 0 || scale <= 0)
    return;
  const hasRemaining =
    kind === 6 && remaining !== undefined && Number.isFinite(remaining);
  const count = hasRemaining
    ? Math.min(6, Math.max(0, Math.floor(remaining!)))
    : 0;
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  c.translate(0, -size * (1.12 * TOY_SCALE - 0.37) - 15);
  c.font = `bold 15px ${FONT}`;
  const width = Math.ceil(c.measureText(style.label).width) + 31;
  c.fillStyle = '#111f24e8';
  c.strokeStyle = style.color;
  c.lineWidth = 1;
  c.beginPath();
  c.roundRect(-width / 2, -13, width, hasRemaining ? 32 : 26, 6);
  c.fill();
  c.stroke();
  c.save();
  c.translate(-width / 2 + 12, 0);
  c.fillStyle = style.color;
  symbol(c, kind);
  c.restore();
  c.fillStyle = style.outline;
  c.textAlign = 'left';
  c.textBaseline = 'middle';
  c.fillText(style.label, -width / 2 + 24, 0);
  if (hasRemaining) {
    for (let i = 0; i < 6; i++) {
      c.fillStyle = i < count ? style.color : '#65707b';
      c.beginPath();
      c.arc((i - 2.5) * 6, 12, 1.7, 0, TAU);
      c.fill();
    }
  }
  c.restore();
}

/** Progress 0..1 covers the 0.65s entry cue. Input x/y is the actor anchor. */
export function drawSpecialEntry(
  c: CanvasRenderingContext2D,
  kind: number,
  x: number,
  y: number,
  progress: number,
) {
  const style = specialMarkerStyle(kind);
  if (!style || !finite(x, y, progress) || progress <= 0 || progress >= 1)
    return;
  // The hunt arena uses a fixed 600 x 800 world coordinate space.
  const px = Math.min(538, Math.max(62, x));
  const py = Math.min(738, Math.max(32, y - 44));
  const edge = Math.min(x, 600 - x, y, 800 - y);
  const angle =
    edge === x
      ? 0
      : edge === 600 - x
        ? Math.PI
        : edge === y
          ? Math.PI / 2
          : -Math.PI / 2;
  c.save();
  c.translate(px, py);
  c.globalAlpha *= Math.min(1, progress / 0.15, (1 - progress) / 0.3);
  c.font = `bold 15px ${FONT}`;
  const width = c.measureText(style.label).width + 40;
  c.fillStyle = '#11232aea';
  c.strokeStyle = style.color;
  c.lineWidth = 1.4;
  c.beginPath();
  c.roundRect(-width / 2, -14, width, 28, 8);
  c.fill();
  c.stroke();
  c.save();
  c.translate(-width / 2 + 13, 0);
  c.rotate(angle);
  c.translate(Math.sin(progress * Math.PI) * 2, 0);
  c.strokeStyle = style.outline;
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(-4, -5);
  c.lineTo(1, 0);
  c.lineTo(-4, 5);
  c.moveTo(1, -5);
  c.lineTo(6, 0);
  c.lineTo(1, 5);
  c.stroke();
  c.restore();
  c.fillStyle = style.outline;
  c.textAlign = 'left';
  c.textBaseline = 'middle';
  c.fillText(style.label, -width / 2 + 29, 0);
  c.restore();
}

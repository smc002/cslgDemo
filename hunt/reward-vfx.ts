import { jackpotTitle } from './overlay-layout';
/** Reward presentation only. All timing is supplied by the simulation clock. */
export type RewardArt = {
  core?: HTMLImageElement;
  ticket?: HTMLImageElement;
  specialPlaque?: HTMLImageElement;
  jackpotPlaque?: HTMLImageElement;
};

const TAU = Math.PI * 2;
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const ease = (v: number) => 1 - (1 - clamp(v)) ** 3;
const noise = (seed: number, i: number) => {
  const value = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
  return value - Math.floor(value);
};
const usable = (image?: HTMLImageElement): image is HTMLImageElement =>
  !!image && image.complete && image.naturalWidth > 0;

function sprite(
  c: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  angle = 0,
) {
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  const height = (width * image.naturalHeight) / image.naturalWidth;
  c.drawImage(image, -width / 2, -height / 2, width, height);
  c.restore();
}

function crystal(
  c: CanvasRenderingContext2D,
  art: RewardArt,
  x: number,
  y: number,
  size: number,
  angle: number,
) {
  if (usable(art.core)) {
    sprite(c, art.core, x, y, size, angle);
    return;
  }
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  c.fillStyle = '#ac78ff';
  c.strokeStyle = '#f4e6ff';
  c.lineWidth = 1.7;
  c.beginPath();
  c.moveTo(0, -size * 0.6);
  c.lineTo(size * 0.38, 0);
  c.lineTo(0, size * 0.6);
  c.lineTo(-size * 0.38, 0);
  c.closePath();
  c.fill();
  c.stroke();
  c.restore();
}

function ticket(
  c: CanvasRenderingContext2D,
  art: RewardArt,
  x: number,
  y: number,
  width: number,
  angle: number,
) {
  if (usable(art.ticket)) {
    sprite(c, art.ticket, x, y, width, angle);
    return;
  }
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  c.fillStyle = '#1c6685';
  c.strokeStyle = '#ffdb74';
  c.lineWidth = 3;
  c.beginPath();
  c.roundRect(-width / 2, -width * 0.32, width, width * 0.64, 5);
  c.fill();
  c.stroke();
  c.strokeStyle = '#c6f3ff';
  c.lineWidth = 1.5;
  c.strokeRect(-width * 0.37, -width * 0.22, width * 0.74, width * 0.44);
  c.fillStyle = '#ffdf8b';
  c.beginPath();
  c.moveTo(0, -width * 0.16);
  c.lineTo(width * 0.12, 0);
  c.lineTo(0, width * 0.16);
  c.lineTo(-width * 0.12, 0);
  c.closePath();
  c.fill();
  c.restore();
}

function label(
  c: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  maxWidth: number,
  color: string,
) {
  c.font = `900 ${size}px system-ui, sans-serif`;
  const width = c.measureText(text).width;
  if (width > maxWidth)
    c.font = `900 ${Math.max(1, (size * maxWidth) / width)}px system-ui, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.lineJoin = 'round';
  c.lineWidth = 3;
  c.strokeStyle = '#252329';
  c.strokeText(text, x, y);
  c.fillStyle = color;
  c.fillText(text, x, y);
}

/** Local purple kill accent, bounded to six fragments and a 65–95 px ring. */
export function drawSpecialBurst(
  c: CanvasRenderingContext2D,
  art: RewardArt,
  x: number,
  y: number,
  age: number,
  seed: number,
  scale = 1,
) {
  if (!Number.isFinite(age) || age < 0 || age >= 1.2) return;
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  const phase = clamp(age / 0.7);
  const fade = 1 - clamp((age - 0.35) / 0.85);
  const radius = 65 + 30 * ease(phase);
  c.globalAlpha *= fade * 0.85;
  c.strokeStyle = '#b17aff';
  c.lineWidth = 4 * (1 - phase) + 1;
  c.beginPath();
  c.ellipse(0, 6, radius, radius * 0.45, 0, 0, TAU);
  c.stroke();
  for (let i = 0; i < 6; i++) {
    const theta = (i * TAU) / 6 + noise(seed, i) * 0.5;
    const distance = 18 + ease(age / 0.85) * (45 + noise(seed, i + 8) * 35);
    const px = Math.cos(theta) * distance;
    const py =
      Math.sin(theta) * distance * 0.6 -
      Math.sin(clamp(age / 1.2) * Math.PI) * 22;
    crystal(c, art, px, py, 10 + noise(seed, i + 13) * 5, theta + age * 2);
  }
  if (age < 0.16) {
    c.globalAlpha *= 1 - age / 0.16;
    c.fillStyle = '#fff8ff';
    c.beginPath();
    c.arc(0, -8, 9 + 25 * clamp(age / 0.16), 0, TAU);
    c.fill();
    c.fillRect(-43, -10, 86, 4);
  }
  c.restore();
}

/** Three ordinary or five special crystals, travelling in staggered batches. */
export function drawCoreFlight(
  c: CanvasRenderingContext2D,
  art: RewardArt,
  x: number,
  y: number,
  tx: number,
  ty: number,
  age: number,
  special: boolean,
  seed = 0,
) {
  if (!Number.isFinite(age) || age < 0 || age > 1.35) return;
  c.save();
  const count = special ? 5 : 3;
  for (let i = 0; i < count; i++) {
    const start = 0.25 + i * 0.075;
    const duration = 0.55;
    const elapsed = age - start;
    if (elapsed < -0.2 || elapsed > duration + 0.16) continue;
    const p = clamp(elapsed / duration);
    const angle = -Math.PI + ((i + 0.5) / count) * Math.PI;
    const sx = x + Math.cos(angle) * (special ? 30 : 20);
    const sy = y - 8 + Math.sin(angle) * 22;
    const bend = (noise(seed, i) - 0.5) * 110;
    const cpX = (sx + tx) / 2 + bend;
    const cpY = Math.min(sy, ty) - 60;
    const u = p * p;
    const px = (1 - u) ** 2 * sx + 2 * (1 - u) * u * cpX + u * u * tx;
    const py = (1 - u) ** 2 * sy + 2 * (1 - u) * u * cpY + u * u * ty;
    c.save();
    if (elapsed > duration) {
      const arrival = clamp((elapsed - duration) / 0.16);
      c.globalAlpha *= (1 - arrival) * 0.65;
      c.strokeStyle = '#dec1ff';
      c.lineWidth = 2;
      c.beginPath();
      c.arc(tx, ty, 4 + arrival * 12, 0, TAU);
      c.stroke();
    } else {
      c.globalAlpha *= elapsed < 0 ? clamp(1 + elapsed / 0.2) : 1;
      if (p > 0) {
        c.strokeStyle = '#c09aff';
        c.lineWidth = 2;
        c.beginPath();
        const tail = Math.max(0, u - 0.09);
        c.moveTo(
          (1 - tail) ** 2 * sx + 2 * (1 - tail) * tail * cpX + tail * tail * tx,
          (1 - tail) ** 2 * sy + 2 * (1 - tail) * tail * cpY + tail * tail * ty,
        );
        c.lineTo(px, py);
        c.stroke();
      }
      crystal(
        c,
        art,
        px,
        py,
        (special ? 19 : 14) * (1 - p * 0.2),
        0.15 + i * 0.55 + p * 1.5,
      );
    }
    c.restore();
  }
  c.restore();
}

export type JackpotFrame = {
  x: number;
  y: number;
  age: number;
  duration: number;
  tickets: number;
  scale: number;
  visibleTop?: number;
};

/** Three-second jackpot overlay in the arena's 600 × 800 logical coordinates. */
export function drawJackpot(
  c: CanvasRenderingContext2D,
  art: RewardArt,
  frame: JackpotFrame,
) {
  const { x, y, age, duration, scale } = frame;
  if (!Number.isFinite(age) || age < 0 || age >= duration || duration <= 0)
    return;
  const tickets = Math.max(0, Math.floor(frame.tickets));
  const ending = 1 - clamp((age - (duration - 0.25)) / 0.25);
  c.save();
  c.globalAlpha *= ending;
  // Only the edges dim, and never by more than 25%; the arena stays legible.
  const vignette = c.createRadialGradient(300, 320, 110, 300, 350, 530);
  vignette.addColorStop(0, '#06132300');
  vignette.addColorStop(1, `rgba(6,19,35,${0.25 * clamp(age / 0.25)})`);
  c.fillStyle = vignette;
  c.fillRect(0, 0, 600, 800);

  if (age < 0.38) {
    const p = age / 0.38;
    c.save();
    c.globalAlpha *= 1 - p;
    const glow = c.createRadialGradient(
      x,
      y,
      0,
      x,
      y,
      (45 + 85 * ease(p)) * scale,
    );
    glow.addColorStop(0, '#fff9de');
    glow.addColorStop(0.25, '#ffe08ba8');
    glow.addColorStop(1, '#ffbd3600');
    c.fillStyle = glow;
    c.beginPath();
    c.arc(x, y, (45 + 85 * ease(p)) * scale, 0, TAU);
    c.fill();
    c.restore();
  }
  // Exactly six hand-shaped pieces of the broken cash case.
  if (age < 1.15) {
    for (let i = 0; i < 6; i++) {
      const theta = (i * TAU) / 6 - 0.6;
      const p = clamp(age / 1.15);
      const d = ease(p) * (55 + noise(19, i) * 70) * scale;
      c.save();
      c.globalAlpha *= 1 - clamp((age - 0.5) / 0.65);
      c.translate(
        x + Math.cos(theta) * d,
        y + Math.sin(theta) * d * 0.55 - Math.sin(p * Math.PI) * 58 * scale,
      );
      c.rotate(theta + p * 3);
      c.scale(scale, scale);
      c.fillStyle = i % 2 ? '#d49b38' : '#38404a';
      c.strokeStyle = '#ffe098';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(-12, -6);
      c.lineTo(9, -10);
      c.lineTo(15, 2);
      c.lineTo(-5, 9);
      c.closePath();
      c.fill();
      c.stroke();
      c.restore();
    }
  }

  const visibleTop = frame.visibleTop ?? 0;
  const { x: titleX, y: titleY } = jackpotTitle(visibleTop);
  const ticketAspect = usable(art.ticket)
    ? art.ticket.naturalHeight / art.ticket.naturalWidth
    : 0.64;
  // Account for both sprite height and rotation, including the collection arc.
  const ticketSafeHalf = 30 * Math.hypot(1, ticketAspect) + 4;
  // Fixed visual count. Actual payout text below always uses the real reward.
  for (let i = 0; i < 10; i++) {
    const delay = 0.16 + i * 0.025;
    if (age < delay) continue;
    const scatter = ease((age - delay) / 0.55);
    const theta = -Math.PI + 0.18 + (i / 9) * (Math.PI - 0.36);
    const fanX = Math.max(
      42,
      Math.min(558, x + Math.cos(theta) * (92 + (i % 2) * 20) * scale),
    );
    const fanY = Math.max(
      Math.max(80, visibleTop + ticketSafeHalf),
      y + Math.sin(theta) * (105 + (i % 3) * 12) * scale - 10,
    );
    const sx = x + (fanX - x) * scatter;
    const sy = y + (fanY - y) * scatter;
    const collectStart = 0.95 + i * 0.055;
    const collect = ease((age - collectStart) / 0.7);
    if (collect >= 1) continue;
    const px = sx + (titleX - sx) * collect;
    const width = (48 + 12 * scatter) * (1 - collect * 0.5);
    const angle = (theta + Math.PI / 2) * 0.35 * (1 - collect);
    const halfHeight =
      (width / 2) *
      (Math.abs(Math.sin(angle)) + ticketAspect * Math.abs(Math.cos(angle)));
    const py = Math.max(
      visibleTop + halfHeight + 4,
      sy + (titleY - sy) * collect - Math.sin(collect * Math.PI) * 35,
    );
    c.save();
    c.globalAlpha *=
      clamp((age - delay) / 0.1) * (1 - clamp((collect - 0.85) / 0.15));
    ticket(c, art, px, py, width, angle);
    c.restore();
  }

  if (age >= 0.42) {
    c.save();
    const reveal = clamp((age - 0.42) / 0.32);
    c.globalAlpha *= reveal;
    c.translate(titleX, titleY);
    const pop = 1 + Math.sin(reveal * Math.PI) * 0.06;
    c.scale(pop, pop);
    if (usable(art.jackpotPlaque)) {
      // Fixed 400×110 target keeps a generated plate from covering the arena.
      c.drawImage(art.jackpotPlaque, -200, -55, 400, 110);
    } else {
      const gold = c.createLinearGradient(0, -55, 0, 55);
      gold.addColorStop(0, '#4d3e24');
      gold.addColorStop(1, '#172a31');
      c.fillStyle = gold;
      c.strokeStyle = '#ffd474';
      c.lineWidth = 4;
      c.beginPath();
      c.roundRect(-200, -55, 400, 110, 18);
      c.fill();
      c.stroke();
    }
    label(c, '运钞大奖', 0, -33, 17, 320, '#fff1c1');
    label(
      c,
      `招募券 ×${tickets.toLocaleString('zh-CN')}`,
      0,
      0,
      37,
      350,
      '#ffe18a',
    );
    const draws = Math.floor(tickets / 10);
    label(
      c,
      draws > 0
        ? `可进行${draws.toLocaleString('zh-CN')}次十连招募`
        : '每10张开启一次十连招募',
      0,
      35,
      17,
      330,
      '#e1f6ff',
    );
    c.restore();
  }
  c.restore();
}

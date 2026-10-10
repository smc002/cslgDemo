/** Small opaque blocks sampled from the actual character art, prepared once per species. */
export type DeathPixel = { x: number; y: number; size: number; color: string };
export type PixelDeathSprite = { pixels: DeathPixel[]; height: number };
export const PIXEL_DEATH_SECONDS = 0.72;

export function sampleDeathPixels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  cell: number,
): DeathPixel[] {
  const pixels: DeathPixel[] = [];
  for (let y = 0; y < height; y += cell)
    for (let x = 0; x < width; x += cell) {
      let alpha = 0, red = 0, green = 0, blue = 0, count = 0;
      for (let py = y; py < Math.min(y + cell, height); py++)
        for (let px = x; px < Math.min(x + cell, width); px++) {
          const i = (py * width + px) * 4, a = data[i + 3] / 255;
          alpha += a;
          red += data[i] * a;
          green += data[i + 1] * a;
          blue += data[i + 2] * a;
          count++;
        }
      if (alpha < count * 0.14) continue;
      pixels.push({
        x: x + cell / 2 - width / 2,
        y: y + cell / 2 - height / 2,
        size: cell * Math.max(0.65, Math.sqrt(alpha / count)),
        color: `rgb(${Math.round(red / alpha)},${Math.round(green / alpha)},${Math.round(blue / alpha)})`,
      });
    }
  return pixels;
}

export function captureDeathSprite(
  height: number,
  paint: (ctx: CanvasRenderingContext2D) => void,
): PixelDeathSprite {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = Math.ceil(height * 2.4);
  const c = canvas.getContext('2d', { willReadFrequently: true })!;
  c.translate(canvas.width / 2, canvas.height / 2);
  paint(c);
  const cell = Math.max(6, Math.ceil(canvas.width / 18));
  const data = c.getImageData(0, 0, canvas.width, canvas.height).data;
  return { height, pixels: sampleDeathPixels(data, canvas.width, canvas.height, cell) };
}

const random = (seed: number, i: number) => {
  const n = Math.sin(seed * 17.23 + i * 59.79) * 43758.5453;
  return n - Math.floor(n);
};

/** Equal x/y size: fragments burst and fall; the character is never squashed. */
export function deathPixelFrame(
  pixel: DeathPixel, index: number, height: number,
  age: number, seed: number, angle: number, left: boolean,
) {
  if (age < 0 || age >= PIXEL_DEATH_SECONDS || !Number.isFinite(age)) return null;
  const t = Math.max(0, age - 0.035);
  const nx = pixel.x * (left ? -1 : 1);
  const direction = Math.atan2(pixel.y - height * 0.06, nx) + (random(seed, index) - 0.5) * 0.8;
  const speed = height * (0.7 + random(seed, index + 31) * 1.1);
  return {
    x: nx + Math.cos(direction) * speed * t + Math.cos(angle) * 22 * t,
    y: pixel.y + Math.sin(direction) * speed * t - height * 0.4 * t + height * 1.7 * t * t,
    size: pixel.size * Math.max(0.25, 1 - Math.max(0, age - 0.36) * 1.8),
    alpha: Math.min(1, (PIXEL_DEATH_SECONDS - age) / 0.28),
  };
}

export function drawPixelDeath(
  c: CanvasRenderingContext2D, sprite: PixelDeathSprite | undefined,
  x: number, y: number, age: number, seed: number, angle: number,
  scale: number, left = false,
) {
  if (!sprite || age < 0 || age >= PIXEL_DEATH_SECONDS) return;
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  for (let i = 0; i < sprite.pixels.length; i++) {
    const pixel = sprite.pixels[i];
    const p = deathPixelFrame(pixel, i, sprite.height, age, seed, angle, left);
    if (!p) continue;
    c.globalAlpha = p.alpha;
    c.fillStyle = pixel.color;
    c.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    // One bright top edge keeps the chunky fragments readable on sand.
    c.fillStyle = age < 0.09 ? '#fff7d9b0' : '#fff7d94a';
    c.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, Math.min(1.3, p.size * 0.2));
  }
  c.restore();
}

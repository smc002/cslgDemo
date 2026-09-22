import { readFile, mkdir } from 'node:fs/promises';
import sharp from 'sharp';
import { build } from 'esbuild';

await build({
  entryPoints: ['hunt/zombie-animation.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: '.test-cache/direction-review.js',
});
const { zombieDirection, zombieFrame } =
  await import('../.test-cache/direction-review.js');
const base = 'public/assets/hunt/zombies-v3/';
const manifest = JSON.parse(await readFile(base + 'manifest.json', 'utf8'));
const facings = ['S', 'SE', 'E', 'NE', 'N', 'NW', 'W', 'SW'];
const names = ['normal', 'armored', 'explosive', 'giant'];
const labels = {
  normal: '游荡者',
  armored: '装甲僵尸',
  explosive: '爆炸僵尸',
  giant: '巨型僵尸',
};
const width = 1024,
  height = 616,
  tile = 128;
const background = Buffer.from(
  `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#e7ddc3"/><text x="20" y="29" font-size="19" font-family="Microsoft YaHei" fill="#284541">僵尸拖步 · 八方向动作</text>${facings.map((d, i) => `<text x="${i * tile + 64}" y="57" text-anchor="middle" font-size="15" fill="#284541">${d}</text>`).join('')}${names.map((name, row) => `<text x="14" y="${84 + row * 134}" font-size="13" font-family="Microsoft YaHei" fill="#566457">${labels[name]}</text>${facings.map((_, column) => `<path d="M${column * tile + 22} ${190 + row * 134}h84" stroke="#91a78c"/>`).join('')}`).join('')}</svg>`,
);
const cache = new Map();
async function cell(name, index, mirror) {
  const key = `${name}/${index}/${mirror}`;
  if (cache.has(key)) return cache.get(key);
  let sprite = sharp(base + manifest.archetypes[name].atlas).extract({
    left: (index % 8) * 320,
    top: Math.floor(index / 8) * 320,
    width: 320,
    height: 320,
  });
  if (mirror) sprite = sprite.flop();
  const buffer = await sprite.resize(tile, tile).png().toBuffer();
  cache.set(key, buffer);
  return buffer;
}
const frames = [];
for (let i = 0; i < 30; i++) {
  const overlays = [];
  for (let row = 0; row < 4; row++)
    for (let column = 0; column < 8; column++) {
      const name = names[row],
        direction = zombieDirection(manifest.archetypes[name], facings[column]);
      const frame = zombieFrame(direction.clips.walk, i * 0.08);
      overlays.push({
        input: await cell(name, frame, direction.mirror),
        left: column * tile,
        top: 72 + row * 134,
      });
    }
  frames.push(
    await sharp(background).composite(overlays).ensureAlpha().raw().toBuffer(),
  );
}
await mkdir('docs/art/hunt-zombies-v3', { recursive: true });
await sharp(frames[0], { raw: { width, height, channels: 4 } })
  .png()
  .toFile('docs/art/hunt-zombies-v3/eight-directions.png');
await sharp(Buffer.concat(frames), {
  raw: {
    width,
    height: height * frames.length,
    channels: 4,
    pageHeight: height,
  },
})
  .gif({ delay: frames.map(() => 80), loop: 0 })
  .toFile('docs/art/hunt-zombies-v3/eight-directions.gif');
console.log(
  'Rendered authored frame animation at 80 ms intervals; five source views + three mirrored views.',
);

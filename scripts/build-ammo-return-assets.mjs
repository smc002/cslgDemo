import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';

const source = 'docs/art/ammo-return-v1';
const output = 'public/assets/hunt/ammo-return-v1';
await mkdir(output, { recursive: true });
// Measured transparent gutters in the generated atlas; rows are not uniform.
const cells = [
  { left: 0, top: 0, width: 651, height: 755 },
  { left: 651, top: 0, width: 603, height: 755 },
  { left: 0, top: 755, width: 651, height: 499 },
  { left: 651, top: 755, width: 603, height: 499 },
];
let bodyHeight = 0;
for (let i = 0; i < cells.length; i++) {
  const crop = await sharp(`${source}/death-source.png`).extract(cells[i]).png().toBuffer();
  const trimmed = await sharp(crop).trim().png().toBuffer();
  const meta = await sharp(trimmed).metadata();
  const { data, info } = await sharp(trimmed).resize({ width: Math.round(meta.width * 0.62) }).png().toBuffer({ resolveWithObject: true });
  if (i === 0) bodyHeight = info.height;
  await sharp({ create: { width: 512, height: 512, channels: 4, background: '#00000000' } })
    .composite([{ input: data, left: Math.round(256 - info.width / 2), top: 448 - info.height }])
    .png().toFile(`${output}/death-${i}.png`);
}
const names = ['cartridge-0', 'cartridge-1', 'cartridge-2', 'lid', 'corner', 'dust'];
for (let i = 0; i < names.length; i++) {
  const crop = await sharp(`${source}/props-source.png`)
    .extract({ left: (i % 3) * 512, top: Math.floor(i / 3) * 512, width: 512, height: 512 }).png().toBuffer();
  await sharp(crop).trim().resize(224, 224, { fit: 'inside' }).extend({ top: 16, bottom: 16, left: 16, right: 16, background: '#00000000' })
    .png().toFile(`${output}/${names[i]}.png`);
}
await writeFile(`${output}/manifest.json`, JSON.stringify({ frameSize: 512, anchor: [256, 448], bodyHeight, frames: ['death-0.png', 'death-1.png', 'death-2.png', 'death-3.png'], props: names.map(n => `${n}.png`) }, null, 2));
await writeFile('shared/ammo-return-data.json', JSON.stringify({ frameSize: 512, anchor: [256, 448], bodyHeight, frames: ['death-0.png', 'death-1.png', 'death-2.png', 'death-3.png'], props: names.map(n => `${n}.png`) }, null, 2));
console.log(`Built 4 aligned death poses and 6 transparent particles; body height ${bodyHeight}px`);

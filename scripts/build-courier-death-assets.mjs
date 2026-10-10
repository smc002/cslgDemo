import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
const source = 'docs/art/courier-death-v1/death-source.png';
const output = 'public/assets/hunt/courier-death-v1';
await mkdir(output, { recursive: true });
const { width, height } = await sharp(source).metadata();
const cell = Math.floor(width / 2);
const crops = await Promise.all(
  [0, 1].map(async (i) => {
    const tile = await sharp(source)
      .extract({ left: i * cell, top: 0, width: cell, height })
      .png()
      .toBuffer();
    return sharp(tile).trim({ threshold: 5 }).png().toBuffer();
  }),
);
const sizes = await Promise.all(crops.map((c) => sharp(c).metadata()));
// Keep the generated physical scale identical in both poses, with one ground anchor.
const scale = Math.min(
  440 / Math.max(...sizes.map((s) => s.width)),
  390 / Math.max(...sizes.map((s) => s.height)),
);
const frames = [];
for (let i = 0; i < 2; i++) {
  const w = Math.round(sizes[i].width * scale),
    h = Math.round(sizes[i].height * scale);
  const body = await sharp(crops[i]).resize(w, h).png().toBuffer();
  const name = `death-${i}.png`;
  await sharp({
    create: { width: 512, height: 512, channels: 4, background: '#00000000' },
  })
    .composite([{ input: body, left: Math.round(256 - w / 2), top: 448 - h }])
    .png()
    .toFile(`${output}/${name}`);
  frames.push(name);
}
const metadata = {
  frameSize: 512,
  anchor: [256, 448],
  standingHeight: Math.round((sizes[0].height * scale) / 0.78),
  frames,
};
await writeFile(`${output}/manifest.json`, JSON.stringify(metadata, null, 2));
await writeFile(
  'shared/courier-death-data.json',
  JSON.stringify(metadata, null, 2),
);
console.log(metadata);

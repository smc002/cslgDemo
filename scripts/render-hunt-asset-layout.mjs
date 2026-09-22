import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { build } from 'esbuild';
await build({
  entryPoints: ['hunt/vehicle-rig.ts', 'hunt/simulation.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outbase: '.',
  outdir: '.test-cache/hunt-layout',
});
const { VEHICLE_RIG: car, PLATFORM_RIG: deck } =
  await import('../.test-cache/hunt-layout/hunt/vehicle-rig.js');
const { ARENA } = await import('../.test-cache/hunt-layout/hunt/simulation.js');
const scale = 3,
  origin = { x: 150, y: 520 };
const layers = [];
async function sprite(file, pixelScale, anchor, world) {
  const meta = await sharp(file).metadata();
  layers.push({
    input: await sharp(file)
      .resize(
        Math.round(meta.width * pixelScale * scale),
        Math.round(meta.height * pixelScale * scale),
      )
      .png()
      .toBuffer(),
    left: Math.round((world.x - anchor[0] * pixelScale - origin.x) * scale),
    top: Math.round((world.y - anchor[1] * pixelScale - origin.y) * scale),
  });
}
await sprite(
  'public/assets/hunt/platform-v1/platform.png',
  deck.scale,
  deck.pixelAnchor,
  deck.anchor,
);
await sprite(
  'public/assets/hunt/vehicle-v1/chassis.png',
  car.chassisScale,
  car.chassisPivot,
  { x: ARENA.gunX, y: ARENA.gunY },
);
await sprite(
  'public/assets/hunt/vehicle-v1/turret.png',
  car.turretScale,
  car.turretPivot,
  { x: ARENA.gunX, y: ARENA.gunY },
);
await mkdir('outputs/hunt-production-v1', { recursive: true });
await sharp({
  create: { width: 900, height: 900, channels: 4, background: '#d8cba5' },
})
  .composite(layers)
  .png()
  .toFile('outputs/hunt-production-v1/platform-vehicle-layout.png');
console.log(
  'Rendered asset layout using production rig coordinates (no UI; not a gameplay screenshot).',
);

import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
import sharp from 'sharp';

await build({
  entryPoints: ['hunt/zombie-gait.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: '.test-cache/gait-review.js',
});
const { zombieGaitRig, zombieGaitPose, zombieLegStrips } =
  await import('../.test-cache/gait-review.js');
const manifest = JSON.parse(
  await readFile('public/assets/hunt/zombies-v3/manifest.json', 'utf8'),
);
const names = ['normal', 'armored', 'explosive', 'giant'];
const directions = ['S', 'SE', 'E', 'NE', 'N'];
const path = (points) => `M${points.map((p) => p.join(',')).join('L')}Z`;
const images = new Map();
for (const name of names)
  for (const facing of directions) {
    const art = manifest.archetypes[name],
      frame = art.directions[facing].idle.frames[0];
    images.set(
      `${name}/${facing}`,
      'data:image/png;base64,' +
        (
          await sharp(`public/assets/hunt/zombies-v3/${name}.png`)
            .extract({
              left: (frame % 8) * 320,
              top: Math.floor(frame / 8) * 320,
              width: 320,
              height: 320,
            })
            .png()
            .toBuffer()
        ).toString('base64'),
    );
  }
function sprite(name, facing, seconds, id) {
  const rig = zombieGaitRig(name, facing),
    pose = zombieGaitPose(rig, facing, seconds);
  const img = `<image href="${images.get(`${name}/${facing}`)}" width="320" height="320"/>`;
  let defs = `<clipPath id="b${id}"><path clip-rule="evenodd" d="M0,0H320V320H0Z${rig.legs.map((l) => path(l.outline)).join('')}"/></clipPath>`;
  const legs = rig.legs
    .map((l, i) => {
      defs += `<clipPath id="l${id}-${i}"><path d="${path(l.outline)}"/></clipPath>`;
      return zombieLegStrips(l, pose.feet[i], pose.body)
        .map((s, j) => {
          defs += `<clipPath id="s${id}-${i}-${j}"><rect x="0" y="${s.top}" width="320" height="${Math.min(320 - s.top, s.bottom - s.top + 0.4)}"/></clipPath>`;
          const matrix = `1 0 ${s.shear} ${s.scaleY} ${s.x - s.shear * s.top} ${s.y + s.top * (1 - s.scaleY)}`;
          return `<g transform="matrix(${matrix})"><g clip-path="url(#s${id}-${i}-${j})"><g clip-path="url(#l${id}-${i})">${img}</g></g></g>`;
        })
        .join('');
    })
    .join('');
  return `<defs>${defs}</defs>${legs}<g transform="translate(${pose.body.x} ${pose.body.y})" clip-path="url(#b${id})">${img}</g>`;
}
await mkdir('docs/art/hunt-zombies-v4', { recursive: true });
const width = 1280,
  height = 680,
  frames = [];
for (let f = 0; f < 24; f++) {
  let markup = `<rect width="100%" height="100%" fill="#ded5bc"/>`;
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 8; c++) {
      const facing = ['S','SE','E','NE','N','NW','W','SW'][c],
        source = ({NW:'NE',W:'E',SW:'SE'})[facing] ?? facing,
        name = names[r],
        rig = zombieGaitRig(name, source);
      markup += `<g transform="translate(${c * 160} ${r * 170})"><text x="8" y="15" font-size="12">${name} ${facing}</text><path d="M12 157H148" stroke="#91a28b"/><g transform="${c >= 5 ? 'translate(160 0) scale(-.5 .5)' : 'scale(.5)'}">${sprite(name, source, (f / 24) * rig.cycle, `${r}-${c}`)}</g></g>`;
    }
  frames.push(
    await sharp(
      Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${markup}</svg>`,
      ),
    )
      .ensureAlpha()
      .raw()
      .toBuffer(),
  );
}
await sharp(frames[0], { raw: { width, height, channels: 4 } })
  .png()
  .toFile('docs/art/hunt-zombies-v4/gait-review.png');
await sharp(Buffer.concat(frames), {
  raw: {
    width,
    height: height * frames.length,
    channels: 4,
    pageHeight: height,
  },
})
  .gif({ delay: 50, loop: 0 })
  .toFile('docs/art/hunt-zombies-v4/gait-review.gif');
let film = '';
for (let r = 0; r < 4; r++)
  for (let c = 0; c < 8; c++) {
    const name = names[r],
      rig = zombieGaitRig(name, 'E');
    film += `<g transform="translate(${c * 160} ${r * 170})"><text x="8" y="15" font-size="12">${name} ${c}/8</text><g transform="scale(.5)">${sprite(name, 'E', (c / 8) * rig.cycle, `${r}-${c}`)}</g></g>`;
  }
await sharp(
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="680"><rect width="100%" height="100%" fill="#ded5bc"/>${film}</svg>`,
  ),
)
  .png()
  .toFile('docs/art/hunt-zombies-v4/side-steps.png');
await writeFile(
  'docs/art/hunt-zombies-v4/README.md',
  `# 连续步态与受击闪白\n\n复用 v3 原图的五个站姿视角，左侧三向镜像。通过 hunt/zombie-gait.ts 分离两腿，以髋、膝、踝连续变形，脚掌保持刚性；60% 支撑、40% 抬脚回摆。全身只叠加轻微重心起伏。四种基础形象覆盖全部 12 种僵尸。\n\n命中只改变颜色，0.13 秒内恢复，不切换 hit 图、不暂停步态、不锁朝向。冻结仍暂停时钟。\n\n游戏与 public/animation-preview/hunt.html 共用 Canvas 渲染器。此目录的 PNG/GIF 使用同一几何函数经 SVG 离线渲染，用于检查肢体边缘和迈步姿势；不是浏览器实测截图。GIF 仅以 20 fps 展示一个循环，游戏按 requestAnimationFrame 连续采样。\n\n重建：node scripts/build-hunt-animation-preview.mjs；node scripts/render-hunt-gait-review.mjs。\n`,
);
console.log(
  'Wrote continuous gait contact sheet, side-step strip and 24-frame review GIF.',
);

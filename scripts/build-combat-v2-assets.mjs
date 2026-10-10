import sharp from 'sharp';
import { readFile, mkdir, copyFile, writeFile, access } from 'node:fs/promises';
const sources = JSON.parse(await readFile('docs/combat-vfx-upgrade/asset-sources.json', 'utf8'));
const root = 'public/assets/hunt/combat-v2';
await mkdir(root, { recursive: true });
await mkdir('docs/combat-vfx-upgrade/source', { recursive: true });
const manifest = { version: 2, assets: {} };
async function save(name, input, size, trim = true) {
  let p = sharp(input);
  if (trim) p = p.trim({ threshold: 5 });
  const output = await p.resize(size, size, { fit: 'inside', withoutEnlargement: true }).png().toBuffer();
  const meta = await sharp(output).metadata();
  if (!meta.hasAlpha) throw Error(name + ' missing alpha');
  const stats = await sharp(output).stats();
  if (stats.channels[3].min !== 0) throw Error(name + ' has no transparent pixels');
  await writeFile(`${root}/${name}.png`, output);
  manifest.assets[name] = { file: name + '.png', width: meta.width, height: meta.height };
}
for (const [key, generatedSource] of Object.entries(sources)) {
  const source = `docs/combat-vfx-upgrade/source/${key}.png`;
  try { await access(source); }
  catch { await copyFile(generatedSource, source); }
  if (key.endsWith('-sheet') || key === 'weapon-kit') {
    const { width, height } = await sharp(source).metadata();
    const cw = Math.floor(width / 2), ch = Math.floor(height / 2);
    for (let i = 0; i < 4; i++) {
      const tile = await sharp(source).extract({ left: i % 2 * cw, top: Math.floor(i / 2) * ch, width: cw, height: ch }).png().toBuffer();
      const name = key === 'weapon-kit' ? ['left-plate','right-plate','amber-coil','cyan-coil'][i] : key.replace('-sheet','') + '-' + i;
      await save(name, tile, key === 'weapon-kit' ? 192 : 256, key === 'weapon-kit');
    }
  } else await save(key, source, key.includes('plaque') ? 768 : 256);
}
await writeFile(`${root}/manifest.json`, JSON.stringify(manifest, null, 2));
console.log(manifest);

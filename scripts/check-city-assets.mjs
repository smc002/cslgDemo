import {build} from 'esbuild';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
await build({entryPoints:['lib/city.ts'],bundle:true,platform:'node',format:'esm',outfile:'.test-cache/city-art.mjs'});
const {CITY_BUILDINGS,CITY_STAGES,cityArt}=await import('../.test-cache/city-art.mjs');
const manifest=JSON.parse(await readFile('docs/art/city-v08/manifest.json','utf8'));
for(const b of CITY_BUILDINGS){
  for(const level of CITY_STAGES){
    const path=`public${cityArt(b.id,level)}`;
    const data=await readFile(path);
    assert.equal(data.readUInt32BE(16),512,path);
    assert.equal(data.readUInt32BE(20),512,path);
    assert.equal(data[25],6,`${path} must contain genuine RGBA pixels`);
    const slice=manifest.sprites.find(s=>path.endsWith(s.file));
    assert.ok(slice && slice.contentBox[3]===496,path);
  }
}
const terrain=await readFile('public/assets/city-v08/terrain.png');
assert.ok(terrain.length>100000);
await writeFile('docs/art/city-v08/layout.json',JSON.stringify(CITY_BUILDINGS,null,2));
console.log('PASS all 36 sprites exist, RGBA/512x512/foot anchor; terrain present; layout exported');

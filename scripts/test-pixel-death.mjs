import assert from 'node:assert/strict';
import { build } from 'esbuild';
await build({entryPoints:['hunt/pixel-death-vfx.ts'],bundle:true,platform:'node',format:'esm',outfile:'.test-cache/pixel-death.mjs'});
const {sampleDeathPixels,deathPixelFrame,drawPixelDeath,PIXEL_DEATH_SECONDS}=await import('../.test-cache/pixel-death.mjs');
const rgba=new Uint8ClampedArray(8*8*4);
for(let y=0;y<4;y++)for(let x=0;x<4;x++){const i=(y*8+x)*4;rgba.set([30,120,60,255],i);}
const pixels=sampleDeathPixels(rgba,8,8,4);
assert.equal(pixels.length,1,'transparent background must not generate particles');
assert.equal(pixels[0].color,'rgb(30,120,60)','fragments inherit the actual sprite palette');
const a=deathPixelFrame(pixels[0],0,80,0,0.5,0,false);
const flipped=deathPixelFrame(pixels[0],0,80,0,0.5,0,true);
assert.equal(a.x,-flipped.x);
assert.equal(a.y,flipped.y);
assert.equal(deathPixelFrame(pixels[0],0,80,PIXEL_DEATH_SECONDS,0.5,0,false),null);
let depth=0,draws=0;
const ctx={save(){depth++},restore(){depth--},translate(x,y){assert.ok(Number.isFinite(x+y))},scale(x,y){assert.equal(x,y,'no flattened character transform')},fillRect(x,y,w,h){assert.ok(Number.isFinite(x+y+w+h));assert.ok(w>0&&h>0);draws++}};
for(const age of [0,.12,.32,.6,.719,.72])for(const scale of [.6,1,1.8])for(const left of [true,false]){
  drawPixelDeath(ctx,{pixels,height:80},200,300,age,.2,-Math.PI/2,scale,left);
  assert.equal(depth,0);
}
assert.ok(draws>0);
const f=deathPixelFrame(pixels[0],0,80,.32,.5,0,false);
assert.deepEqual(f,deathPixelFrame(pixels[0],0,80,.32,.5,0,false),'frame sampling must be deterministic');
assert.ok(Math.hypot(f.x-a.x,f.y-a.y)>5,'fragments separate visibly');
console.log('PASS pixel death: alpha mask, source colors, mirrored origin, deterministic burst, lifetime and no squash transforms');

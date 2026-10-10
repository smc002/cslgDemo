import assert from 'node:assert/strict';
import {build} from 'esbuild';
import sharp from 'sharp';
await build({entryPoints:['hunt/courier-death-vfx.ts'],bundle:true,platform:'node',format:'esm',outfile:'.test-cache/courier-death-vfx.mjs'});
const {courierDeathPose,drawCourierDeath}=await import('../.test-cache/courier-death-vfx.mjs');
const pixels=[];
for(let i=0;i<2;i++){
  const {data,info}=await sharp(`public/assets/hunt/courier-death-v1/death-${i}.png`).raw().toBuffer({resolveWithObject:true});
  assert.equal(info.channels,4); assert.equal(info.width,512); assert.equal(info.height,512);
  for(let x=0;x<512;x++){assert.equal(data[x*4+3],0);assert.equal(data[((511*512)+x)*4+3],0);}
  pixels.push(data);
}
assert.notDeepEqual(pixels[0],pixels[1],'poses must be distinct assets');
assert.equal(courierDeathPose(.18).frame,0);
assert.equal(courierDeathPose(.6).frame,1);
assert.equal(courierDeathPose(1).alpha,1,'body remains legible before fade');
assert.equal(courierDeathPose(1.5),null,'death does not loop');
assert.equal(courierDeathPose(NaN),null);
const frames=[{complete:true,naturalWidth:512},{complete:true,naturalWidth:512}];
let stack=0,draws=[];
const c={globalAlpha:1,save(){stack++},restore(){stack--},translate(...a){assert.ok(a.every(Number.isFinite))},scale(...a){assert.ok(a.every(Number.isFinite))},beginPath(){},ellipse(...a){assert.equal(a.length,7)},fill(){},drawImage(image,...a){assert.ok(a.every(Number.isFinite));draws.push(image)},rotate(){assert.fail('death must articulate instead of rotate standing sprite')}};
for(const scale of [.65,1,1.5])for(const left of [false,true])for(const age of [.18,.6,1.2]){c.globalAlpha=1;assert.equal(drawCourierDeath(c,frames,300,370,age,158,scale,left),true);assert.equal(stack,0);}
assert.ok(draws.includes(frames[0])&&draws.includes(frames[1]));
assert.equal(drawCourierDeath(c,[],300,370,.18,158),false,'missing art safely falls back');
console.log('PASS courier death: two alpha assets, stable anchors, pose timing, non-looping fade, both facings and three scales, no rotation, fallback');

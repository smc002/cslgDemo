import sharp from 'file:///E:/cslgDemo/node_modules/sharp/lib/index.js';
import {readFile,writeFile} from 'node:fs/promises';
const root='C:/Users/hy/.codex/art-work/hunt-zombies-v1',cell=320,names=['normal','armored','explosive','giant'];
const comps=[],overlays=[],small=[],report=[];
for(let row=0;row<4;row++){
 const name=names[row],file=`${root}/${name}.png`,meta=JSON.parse(await readFile(`${root}/${name}-slicing.json`,'utf8'));
 const pic=await sharp(file).png().toBuffer();comps.push({input:pic,left:0,top:row*640});
 const raw=await sharp(file).ensureAlpha().raw().toBuffer();
 for(let f=4;f<=6;f++){
  const frame=await sharp(file).extract({left:(f%4)*320,top:320,width:320,height:320}).ensureAlpha().raw().toBuffer();
  for(let i=3;i<frame.length;i+=4)frame[i]=Math.round(frame[i]*.42);
  overlays.push({input:await sharp(frame,{raw:{width:320,height:320,channels:4}}).png().toBuffer(),left:row*320,top:0});
 }
 for(let f=0;f<7;f++)small.push({input:await sharp(file).extract({left:(f%4)*320,top:Math.floor(f/4)*320,width:320,height:320}).resize(112,112).png().toBuffer(),left:f*128+8,top:row*128+8});
 report.push({name,...meta.checks,oneScaleAcrossActions:meta.scale,foot:meta.anchor.foot,pelvis:meta.anchor.pelvis,fixedSource:4,manualSourceReview:true,manualBakedAtlasReview:true});
}
const backdrop=(w,h)=>Buffer.from(`<svg width="${w}" height="${h}"><defs><pattern id="c" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="#b9c4c8"/><rect width="20" height="20" fill="#dce3e5"/><rect x="20" y="20" width="20" height="20" fill="#dce3e5"/></pattern></defs><rect width="100%" height="100%" fill="url(#c)"/></svg>`);
const lines=Buffer.from(`<svg width="1280" height="2560">${names.map((n,r)=>[0,1].map(k=>`<path d="M0 ${r*640+k*320+296} H1280" stroke="#ed2763" stroke-width="1"/><path d="M160 ${r*640+k*320} V${r*640+k*320+320} M480 ${r*640+k*320} V${r*640+k*320+320} M800 ${r*640+k*320} V${r*640+k*320+320} M1120 ${r*640+k*320} V${r*640+k*320+320}" stroke="#2c779b" stroke-width="1"/>`).join('')).join('')}</svg>`);
await sharp(backdrop(1280,2560)).composite([...comps,{input:lines,left:0,top:0}]).png().toFile(`${root}/qa-contact.png`);
await sharp(backdrop(1280,320)).composite(overlays).png().toFile(`${root}/qa-hit-overlay.png`);
await sharp(backdrop(896,512)).composite(small).png().toFile(`${root}/qa-game-size.png`);
await writeFile(`${root}/validation.json`,JSON.stringify({generatedWith:'built-in image_gen',date:'2026-09-22',runtimeChecksPending:'Main agent must verify move-hit-move, pause, speed, death interruption in actual renderer.',archetypes:report},null,2));

import sharp from 'file:///E:/cslgDemo/node_modules/sharp/lib/index.js';
import { readFile, writeFile } from 'node:fs/promises';
const root='C:/Users/hy/.codex/art-work/hunt-zombies-v2-explosive';
const file=`${root}/explosive.png`;
const bg=(w,h)=>Buffer.from(`<svg width="${w}" height="${h}"><defs><pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="#b9c4c8"/><rect width="20" height="20" fill="#dce3e5"/><rect x="20" y="20" width="20" height="20" fill="#dce3e5"/></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/></svg>`);
const overlays=[],small=[];
for(let f=0;f<8;f++){
 const p=sharp(file).extract({left:(f%4)*320,top:Math.floor(f/4)*320,width:320,height:320});
 small.push({input:await p.clone().resize(112,112).png().toBuffer(),left:f*112,top:0});
 if(f>=4&&f<=6){const raw=await p.ensureAlpha().raw().toBuffer();for(let i=3;i<raw.length;i+=4)raw[i]=Math.round(raw[i]*.42);overlays.push({input:await sharp(raw,{raw:{width:320,height:320,channels:4}}).png().toBuffer(),left:0,top:0})}
}
await sharp(bg(1280,640)).composite([{input:await sharp(file).png().toBuffer(),left:0,top:0}]).png().toFile(`${root}/qa-contact.png`);
await sharp(bg(320,320)).composite(overlays).png().toFile(`${root}/qa-hit-overlay.png`);
await sharp(bg(896,112)).composite(small).png().toFile(`${root}/qa-game-size.png`);
const slicing=JSON.parse(await readFile(`${root}/explosive-slicing.json`,'utf8'));
await writeFile(`${root}/validation.json`,JSON.stringify({date:'2026-09-22',edit:'All 16 hands are matching charcoal gloves; upper arms remain green.',generatedWith:'built-in image_gen precise-object-edit',manualSourceReview:{eightPoses:true,sixteenMatchingGloves:true,canisterPreserved:true,clothingIdentityPreserved:true,poseSequencePreserved:true},checks:slicing.checks,scale:slicing.scale,anchor:slicing.anchor},null,2));

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
let sharp;try{sharp=require('sharp')}catch{sharp=require('E:/cslgDemo/node_modules/sharp')}
const root=path.dirname(fileURLToPath(import.meta.url)),cell=320,anchorX=160,anchorY=296;
const configs={
 normal:{centers:[204,585,955,1340,204,584,967,1356],seam:821,legHalf:61,sideEnds:858},
 armored:{centers:[207,572,967,1341,195,578,962,1346],seam:808,legHalf:60,sideEnds:862},
 explosive:{centers:[211,575,965,1340,216,576,970,1343],seam:841,legHalf:61,sideEnds:882},
 giant:{centers:[218,589,956,1347,210,594,964,1343],seam:791,legHalf:65,sideEnds:880},
};
const names=process.argv.slice(2).length?process.argv.slice(2):Object.keys(configs);
const result={version:1,cell,columns:4,rows:2,anchor:{foot:[anchorX,anchorY]},archetypes:{},kinds:{}};
try{Object.assign(result,JSON.parse(await readFile(path.join(root,'manifest.json'),'utf8')))}catch{}
for(const name of names){
 const cfg=configs[name],{data,info}=await sharp(path.join(root,`${name}-source.png`)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const seen=new Uint8Array(info.width*info.height),parts=[];
 for(let start=0;start<seen.length;start++){
  if(seen[start]||data[start*4+3]<=64)continue;
  const pts=[start];seen[start]=1;let l=info.width,t=info.height,r=0,b=0;
  for(let n=0;n<pts.length;n++){const p=pts[n],x=p%info.width,y=Math.floor(p/info.width);l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);for(const q of [x?p-1:-1,x<info.width-1?p+1:-1,y?p-info.width:-1,y<info.height-1?p+info.width:-1])if(q>=0&&!seen[q]&&data[q*4+3]>64){seen[q]=1;pts.push(q)}}
  if(pts.length>1000)parts.push({pts,l,t,r,b});
 }
 assert.equal(parts.length,8,`${name}: eight separate full bodies`);
 parts.sort((a,b)=>(a.t+a.b)-(b.t+b.b));
 const poses=[...parts.slice(0,4).sort((a,b)=>a.l-b.l),...parts.slice(4).sort((a,b)=>a.l-b.l)];
 // One scale per identity, across both actions; no independent frame stretching.
 const scale=236/(poses[4].b-poses[4].t+1),frames=[],mapping=[];
 for(let f=0;f<8;f++){
  const p=poses[f],w=p.r-p.l+1,h=p.b-p.t+1,raw=Buffer.alloc(w*h*4);
  for(const q of p.pts){const x=q%info.width-p.l,y=Math.floor(q/info.width)-p.t,at=(y*w+x)*4;data.copy(raw,at,q*4,q*4+4);raw[at+3]=Math.min(255,Math.round(raw[at+3]*255/254))}
  const dw=Math.round(w*scale),dh=Math.round(h*scale),dx=Math.round(anchorX-(cfg.centers[f]-p.l)*scale),dy=anchorY-dh;
  assert.ok(dx>=4&&dx+dw<cell-4&&dy>=4,`${name} ${f} fits padded cell`);
  const scaled=await sharp(raw,{raw:{width:w,height:h,channels:4}}).resize(dw,dh).raw().toBuffer();
  const tile=Buffer.alloc(cell*cell*4);for(let y=0;y<dh;y++)scaled.copy(tile,((dy+y)*cell+dx)*4,y*dw*4,(y+1)*dw*4);
  frames.push(tile);mapping.push({frame:f,bounds:[p.l,p.t,p.r+1,p.b+1],sourceCenterX:cfg.centers[f],sourceSoleY:p.b+1,scale,placement:[dx,dy,dw,dh],sourceAlphaPixels:p.pts.length});
 }
 const seamY=Math.round(anchorY-(poses[4].b+1-cfg.seam)*scale),sideEndY=Math.round(anchorY-(poses[4].b+1-cfg.sideEnds)*scale),mask=new Uint8Array(cell*cell);
 // Anatomical central pelvis/legs mask. Outside it, low hanging hands remain from each real source pose.
 // Below the hands the full row is fixed, removing any generated alternate boot residuals.
 for(let y=seamY;y<cell;y++)for(let x=0;x<cell;x++)if(y>=sideEndY||Math.abs(x-anchorX)<=Math.min(cfg.legHalf,45+(y-seamY)*.5))mask[y*cell+x]=255;
 for(const f of [5,6,7])for(let p=0;p<mask.length;p++)if(mask[p])frames[4].copy(frames[f],p*4,p*4,p*4+4);
 const pngs=await Promise.all(frames.map(raw=>sharp(raw,{raw:{width:cell,height:cell,channels:4}}).png().toBuffer()));
 await sharp({create:{width:cell*4,height:cell*2,channels:4,background:'#00000000'}}).composite(pngs.map((input,i)=>({input,left:(i%4)*cell,top:Math.floor(i/4)*cell}))).png().toFile(path.join(root,`${name}.png`));
 await sharp(mask,{raw:{width:cell,height:cell,channels:1}}).png().toFile(path.join(root,`${name}-fixed-lower-mask.png`));
 let fixedMismatch=0,edgeAlpha=0;const walkLowerDifferences=[];
 for(const f of [5,6,7])for(let p=0;p<mask.length;p++)if(mask[p])for(let c=0;c<4;c++)fixedMismatch+=Number(frames[f][p*4+c]!==frames[4][p*4+c]);
 for(const raw of frames)for(let y=0;y<cell;y++)for(let x=0;x<cell;x++)if(x<4||x>=cell-4||y<4||y>=cell-4)edgeAlpha+=raw[(y*cell+x)*4+3];
 for(let f=1;f<4;f++){let n=0;for(let p=230*cell;p<cell*cell;p++)for(let c=0;c<4;c++)n+=Number(frames[f][p*4+c]!==frames[f-1][p*4+c]);walkLowerDifferences.push(n)}
 assert.equal(fixedMismatch,0);assert.equal(edgeAlpha,0);assert.ok(walkLowerDifferences.every(n=>n>1000));
 const meta={atlas:`${name}.png`,visibleHeight:236,displayHeight:236,anchor:{foot:[160,296],pelvis:[160,seamY]},clips:{idle:{frames:[0],durations:[1],loop:true},walk:{frames:[0,1,2,3],fps:8,durations:[.125,.125,.125,.125],loop:true},hit:{frames:[4,5,6],durations:[.06,.10,.12],loop:false,impactFrame:1}},direction:'front-down',mirrorAllowed:true,rotateBody:false};
 result.archetypes[name]=meta;
 const trace={name,source:`${name}-source.png`,sourceSize:[info.width,info.height],scale,canvas:[cell,cell],anchor:meta.anchor,lowerBodySourceFrame:4,sourceSeamY:cfg.seam,mask:{seamY,topHalfWidth:45,widenPerPixel:.5,centralHalfWidth:cfg.legHalf,fullWidthFromY:sideEndY},mapping,checks:{fixedLowerMismatchBytes:fixedMismatch,edgeAlpha,walkLowerDifferences,frames:8,alpha:true},review:'Source walk alternates leg contact and lifting; hit has distinct prepared/recoil/recovery upper body. Fixed lower body is baked from source 4; inspect checkerboard contact sheet and overlay.'};
 await writeFile(path.join(root,`${name}-slicing.json`),JSON.stringify(trace,null,2));
 console.log(name,JSON.stringify({scale,seamY,sideEndY,checks:trace.checks}));
}
const mapping=[['normal',''],['normal','hue-rotate(35deg)'],['armored',''],['giant',''],['normal','sepia(.65) saturate(1.7)'],['explosive',''],['explosive','hue-rotate(260deg)'],['armored','hue-rotate(325deg) saturate(1.5)'],['normal','hue-rotate(80deg) saturate(.65) brightness(1.2)'],['armored','sepia(.85) saturate(1.8)'],['armored','hue-rotate(330deg) saturate(1.4)'],['armored','sepia(.7) saturate(1.8)']];
mapping.forEach(([archetype,filter],kind)=>result.kinds[kind]={archetype,filter,sharedAnimation:![0,2,3,5].includes(kind),fps:kind===1?11:kind===3?5:kind===2||kind===9?6:8});
await writeFile(path.join(root,'manifest.json'),JSON.stringify(result,null,2));

import sharp from 'file:///E:/cslgDemo/node_modules/sharp/lib/index.js';
import {components} from './inspect.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const root='C:/Users/hy/.codex/art-work/hunt-zombies-v3-normal',cell=320,dirs=['S','SE','E','NE','N'];
const mapping=[],frames=Array(40),sourceSets={};
for(const [kind,cols] of [['walk',4],['hit',3]]){
const source=await components(root+'/'+kind+'-source.png');const {data,info}=source;
assert.equal(source.parts.length,cols*5);
source.parts.sort((a,b)=>(a.t+a.b)-(b.t+b.b));
const poses=[];for(let row=0;row<5;row++)poses.push(...source.parts.slice(row*cols,(row+1)*cols).sort((a,b)=>a.l-b.l));
const scale=236/(poses[0].b-poses[0].t+1);
sourceSets[kind]={size:[info.width,info.height],scale};
for(let f=0;f<poses.length;f++){
 const row=Math.floor(f/cols),col=f%cols,p=poses[f],out=row*8+(kind==='walk'?col:col+4);
 const l=p.l-2,t=p.t-2,w=p.r-p.l+5,h=p.b-p.t+5,raw=Buffer.alloc(w*h*4),keep=new Uint8Array(w*h);
 for(const q of p.pts){let x=q%info.width-l,y=Math.floor(q/info.width)-t;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(x+dx>=0&&x+dx<w&&y+dy>=0&&y+dy<h)keep[(y+dy)*w+x+dx]=1;}
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(keep[y*w+x]){let q=((y+t)*info.width+x+l)*4,at=(y*w+x)*4;data.copy(raw,at,q,q+4);raw[at+3]=Math.min(255,Math.round(raw[at+3]*255/254));}
 const feet=p.pts.filter(q=>Math.floor(q/info.width)>p.b-(p.b-p.t)*.13).map(q=>q%info.width);
 const center=(Math.min(...feet)+Math.max(...feet))/2;
 const dw=Math.round(w*scale),dh=Math.round(h*scale),dx=Math.round(160-(center-l)*scale),dy=Math.round(296-(p.b+1-t)*scale);
 assert.ok(dx>=4&&dx+dw<316&&dy>=4&&dy+dh<316);
 const scaled=await sharp(raw,{raw:{width:w,height:h,channels:4}}).resize(dw,dh).raw().toBuffer(),tile=Buffer.alloc(cell*cell*4);
 for(let y=0;y<dh;y++)scaled.copy(tile,((dy+y)*cell+dx)*4,y*dw*4,(y+1)*dw*4);
 frames[out]=tile;mapping.push({frame:out,direction:dirs[row],action:kind,sourceFrame:f,bounds:[l,t,l+w,t+h],sourceFoot:[center,p.b+1],scale,placement:[dx,dy,dw,dh]});
 }
}
for(let row=0;row<5;row++)frames[row*8+7]=Buffer.from(frames[row*8+4]);
await fs.writeFile(root+'/frames-raw.bin',Buffer.concat(frames));
async function atlas(rawframes,file){const pngs=await Promise.all(rawframes.map(raw=>sharp(raw,{raw:{width:cell,height:cell,channels:4}}).png().toBuffer()));await sharp({create:{width:cell*8,height:cell*5,channels:4,background:'#00000000'}}).composite(pngs.map((input,i)=>({input,left:(i%8)*cell,top:Math.floor(i/8)*cell}))).png().toFile(root+'/'+file);}
await atlas(frames,'qa-before-fixed.png');
await sharp(root+'/qa-before-fixed.png').resize(1280,800).flatten({background:'#ccc5b3'}).png().toFile(root+'/qa-before-small.png');
await fs.writeFile(root+'/crop-mapping.json',JSON.stringify({sourceSets,mapping},null,2));
console.log(JSON.stringify(sourceSets));
// Anatomical masks fix visible pelvis/shorts and all knees/feet while leaving the
// union of each pose's low-hanging hand silhouettes outside the replaced region.
const configs=[
 {seam:217,anatomicalArmsExcluded:true,outlinePadding:4},
 {seam:216,anatomicalArmsExcluded:true,outlinePadding:4},
 {seam:210,anatomicalArmsExcluded:true,outlinePadding:4},
 {seam:211,anatomicalArmsExcluded:true,outlinePadding:4},
 {seam:210,anatomicalArmsExcluded:true,outlinePadding:4}
];
const checks=[],maskPngs=[];
for(let row=0;row<5;row++){
 const cfg=configs[row],base=row*8+4,mask=new Uint8Array(cell*cell);
 const arms=new Uint8Array(cell*cell);
 for(const col of [4,5,6]){
  const raw=frames[row*8+col],seen=new Uint8Array(cell*cell);
  const green=p=>{const at=p*4,r=raw[at],g=raw[at+1],b=raw[at+2];return raw[at+3]>=64&&g>40&&g>r*1.04&&g>b*1.2};
  for(let start=175*cell;start<266*cell;start++){
   if(seen[start]||!green(start))continue;
   const pts=[start];seen[start]=1;let top=320,bottom=0;
   for(let n=0;n<pts.length;n++){const p=pts[n],x=p%cell,y=Math.floor(p/cell);top=Math.min(top,y);bottom=Math.max(bottom,y);for(const q of [x?p-1:-1,x<319?p+1:-1,y>175?p-cell:-1,y<265?p+cell:-1])if(q>=0&&!seen[q]&&green(q)){seen[q]=1;pts.push(q)}}
   if(pts.length>30&&top<cfg.seam-8&&bottom>cfg.seam+8)for(const p of pts){let x=p%cell,y=Math.floor(p/cell);for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++)if(x+dx>=0&&x+dx<320&&y+dy>=0&&y+dy<320)arms[(y+dy)*cell+x+dx]=255}
  }
 }
 for(let y=cfg.seam;y<cell;y++)for(let x=0;x<cell;x++)if(!arms[y*cell+x])mask[y*cell+x]=255;
 for(const col of [5,6,7])for(let p=0;p<mask.length;p++)if(mask[p])frames[base].copy(frames[row*8+col],p*4,p*4,p*4+4);
 for(const col of [5,6]){
  const raw=frames[row*8+col],seen=new Uint8Array(cell*cell);
  for(let start=0;start<seen.length;start++){
   if(seen[start]||raw[start*4+3]<=8)continue;
   const pts=[start];seen[start]=1;
   for(let n=0;n<pts.length;n++){const p=pts[n],x=p%cell,y=Math.floor(p/cell);for(const q of [x?p-1:-1,x<319?p+1:-1,y?p-cell:-1,y<319?p+cell:-1])if(q>=0&&!seen[q]&&raw[q*4+3]>8){seen[q]=1;pts.push(q)}}
   if(pts.length<40)for(const p of pts)if(!mask[p])raw.fill(0,p*4,p*4+4);
  }
 }
 const png=await sharp(mask,{raw:{width:cell,height:cell,channels:1}}).png().toBuffer();
 await fs.writeFile(root+'/fixed-lower-'+dirs[row]+'.png',png);maskPngs.push(png);
 let mismatch=0,edgeAlpha=0;const walkLowerDifferences=[];
 for(const col of [5,6,7])for(let p=0;p<mask.length;p++)if(mask[p])for(let c=0;c<4;c++)mismatch+=Number(frames[row*8+col][p*4+c]!==frames[base][p*4+c]);
 for(let col=0;col<8;col++)for(let y=0;y<cell;y++)for(let x=0;x<cell;x++)if(x<4||x>=316||y<4||y>=316)edgeAlpha+=frames[row*8+col][(y*cell+x)*4+3];
 for(let col=1;col<4;col++){let n=0;for(let p=238*cell;p<cell*cell;p++)for(let c=0;c<4;c++)n+=Number(frames[row*8+col][p*4+c]!==frames[row*8+col-1][p*4+c]);walkLowerDifferences.push(n)}
 assert.equal(mismatch,0);assert.equal(edgeAlpha,0);assert.ok(walkLowerDifferences.every(n=>n>1000));
 checks.push({direction:dirs[row],fixedLowerSourceFrame:base,mask:cfg,fixedLowerMismatchBytes:mismatch,edgeAlpha,walkLowerDifferences});
}
await atlas(frames,'normal.png');
await sharp(root+'/normal.png').flatten({background:'#d1c9b6'}).png().toFile(root+'/qa-contact.png');
await sharp(root+'/normal.png').resize(1280,800).flatten({background:'#d1c9b6'}).png().toFile(root+'/qa-game-size.png');
await sharp(root+'/normal.png').extract({left:1280,top:0,width:960,height:1600}).flatten({background:'#d1c9b6'}).png().toFile(root+'/qa-hit-fixed.png');
const meta={atlas:'normal.png',visibleHeight:236,displayHeight:236,columns:8,rows:5,cell:320,anchor:{foot:[160,296]},mirrorAllowed:true,rotateBody:false,directions:{}};
for(let row=0;row<5;row++){let start=row*8;meta.directions[dirs[row]]={walk:{frames:[0,1,2,3].map(n=>n+start),durations:[.20,.11,.22,.15],fps:6,loop:true},hit:{frames:[4,5,6].map(n=>n+start),durations:[.05,.10,.13],loop:false,impactFrame:1},idle:{frames:[7+start],durations:[1],loop:true}}}
await fs.writeFile(root+'/part.json',JSON.stringify(meta,null,2));
await fs.writeFile(root+'/validation.json',JSON.stringify({cell:[320,320],atlas:[2560,1600],frames:40,trueAlpha:true,uniformScales:sourceSets,checks,visualReview:'Five authored body views verified: front, front-right, right profile, rear-right, full back. Walk has low staggered contact, relaxed wrists, no raised-knee athletic running. Hit lower-body masks exclude low hanging hands; exposed core pelvis and complete knees/feet are copied from row prepare. Runtime verification remains with integrating task.'},null,2));
console.log(JSON.stringify(checks));

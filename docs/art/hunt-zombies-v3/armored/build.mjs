import sharp from 'file:///E:/cslgDemo/node_modules/sharp/lib/index.js';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {partsOf} from './inspect.mjs';
const root=path.dirname(fileURLToPath(import.meta.url)),cell=320,dirs=['S','SE','E','NE','N'];
const sources={walk:await partsOf(path.join(root,'armored-walk-source.png'),4),hit:await partsOf(path.join(root,'armored-hit-source.png'),3)};
assert.equal(sources.walk.poses.length,20);assert.equal(sources.hit.poses.length,15);
const commonScale=236/((sources.hit.poses[0].b-sources.hit.poses[0].t+1)*384/(sources.hit.info.height/5));
const centers={walk:[151,426,704,982,149,431,704,982,135,416,691,977,148,425,708,987,153,431,706,987],hit:[168,497,804,171,507,803,158,493,789,163,493,803,171,493,807]};
const frames=[],mapping=[];
for(let row=0;row<5;row++)for(let col=0;col<8;col++){
 const action=col<4?'walk':'hit',idx=row*(action==='walk'?4:3)+(col<4?col:col===7?0:col-4);
 const {poses,data,info}=sources[action],p=poses[idx],w=p.r-p.l+1,h=p.b-p.t+1;
 const normalization=384/(info.height/5),scale=normalization*commonScale,raw=Buffer.alloc(w*h*4);
 for(const q of p.pts){const x=q%info.width-p.l,y=Math.floor(q/info.width)-p.t;data.copy(raw,(y*w+x)*4,q*4,q*4+4)}
 const dw=Math.round(w*scale),dh=Math.round(h*scale),dx=Math.round(160-(centers[action][idx]-p.l)*scale),dy=296-dh;
 assert.ok(dx>=4&&dx+dw<=316&&dy>=4);
 const scaled=await sharp(raw,{raw:{width:w,height:h,channels:4}}).resize(dw,dh).raw().toBuffer(),tile=Buffer.alloc(cell*cell*4);
 for(let y=0;y<dh;y++)scaled.copy(tile,((dy+y)*cell+dx)*4,y*dw*4,(y+1)*dw*4);
 frames.push(tile);mapping.push({frame:row*8+col,direction:dirs[row],action,sourceIndex:idx,sourceBounds:[p.l,p.t,p.r+1,p.b+1],sourceCenterX:centers[action][idx],sheetNormalization:normalization,commonScale,effectiveScale:scale,placement:[dx,dy,dw,dh]});
}
// Masks are anatomical polygons under the chest armor hem, excluding dangling hands.
const polygons=[[[129,208],[191,208],[199,237],[211,252],[109,252],[119,234]],[[138,210],[195,210],[198,252],[104,252],[116,238],[135,236]],[[119,222],[152,225],[165,245],[201,251],[202,263],[101,263],[104,244]],[[118,218],[194,218],[194,245],[203,257],[103,257],[106,237]],[[111,205],[208,205],[211,240],[214,244],[103,244],[107,233]]];
const fullFrom=[252,252,263,257,244];
function inside(x,y,poly){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [xi,yi]=poly[i],[xj,yj]=poly[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)yes=!yes}return yes}
const masks=[];
for(let row=0;row<5;row++){
 const mask=Buffer.alloc(cell*cell);for(let y=0;y<cell;y++)for(let x=0;x<cell;x++)if(y>=fullFrom[row]||inside(x,y,polygons[row]))mask[y*cell+x]=255;
 masks.push(mask);
 for(const col of [5,6,7])for(let p=0;p<mask.length;p++)if(mask[p])frames[row*8+4].copy(frames[row*8+col],p*4,p*4,p*4+4);
 await sharp(mask,{raw:{width:cell,height:cell,channels:1}}).png().toFile(path.join(root,`fixedlower-${dirs[row]}.png`));
}
const pngs=await Promise.all(frames.map(raw=>sharp(raw,{raw:{width:cell,height:cell,channels:4}}).png().toBuffer()));
await sharp({create:{width:2560,height:1600,channels:4,background:'#00000000'}}).composite(pngs.map((input,i)=>({input,left:i%8*cell,top:Math.floor(i/8)*cell}))).png().toFile(path.join(root,'armored.png'));
for(let row=0;row<5;row++)await sharp({create:{width:960,height:320,channels:4,background:'#29313b'}}).composite([4,5,6].map((col,i)=>({input:pngs[row*8+col],left:i*320,top:0}))).png().toFile(path.join(root,`qa-${dirs[row].toLowerCase()}-hit.png`));
const checks={frameCount:40,sourceBodyCounts:{walk:20,hit:15},fixedLowerMismatchBytes:[],boundaryAlpha:0,walkChangedBytes:[]};
for(let row=0;row<5;row++){let mismatch=0;for(const col of [5,6,7])for(let p=0;p<cell*cell;p++)if(masks[row][p])for(let c=0;c<4;c++)mismatch+=Number(frames[row*8+4][p*4+c]!==frames[row*8+col][p*4+c]);checks.fixedLowerMismatchBytes.push(mismatch);for(let col=1;col<4;col++){let n=0;for(let p=220*cell*4;p<cell*cell*4;p++)n+=Number(frames[row*8+col][p]!==frames[row*8+col-1][p]);checks.walkChangedBytes.push(n)}}
for(const raw of frames)for(let y=0;y<cell;y++)for(let x=0;x<cell;x++)if(x<4||x>=316||y<4||y>=316)checks.boundaryAlpha+=raw[(y*cell+x)*4+3];
assert.equal(checks.boundaryAlpha,0);assert.ok(checks.fixedLowerMismatchBytes.every(n=>n===0));assert.ok(checks.walkChangedBytes.every(n=>n>1000));
const directions={};dirs.forEach((dir,row)=>{const o=row*8;directions[dir]={walk:{frames:[o,o+1,o+2,o+3],durations:[.24,.13,.27,.16],fps:5,loop:true},hit:{frames:[o+4,o+5,o+6],durations:[.05,.10,.13],impactFrame:1,loop:false},idle:{frames:[o+7],durations:[1],loop:true}}});
await fs.writeFile(path.join(root,'part.json'),JSON.stringify({atlas:'armored.png',visibleHeight:236,columns:8,rows:5,cell:320,anchor:{foot:[160,296]},directions,mirrorAllowed:true,rotateBody:false},null,2));
await fs.writeFile(path.join(root,'slicing.json'),JSON.stringify({commonScale,normalization:'Source sheets normalized once to 384px cells based on sheet height, then same common atlas scale applied to every frame. No per-pose bbox scaling.',mapping,fixedLower:{sourceFrames:[4,12,20,28,36],polygons,fullFrom},checks},null,2));
await fs.writeFile(path.join(root,'checks.json'),JSON.stringify(checks,null,2));
// Contact review at 50%: neutral backing, foot/pelvis guides, labels outside each figure.
const bg=Buffer.from(`<svg width="2560" height="1600"><rect width="2560" height="1600" fill="#29313b"/>${frames.map((_,i)=>{const x=i%8*320,y=Math.floor(i/8)*320;return `<path d="M${x},${y+296}h320" stroke="#62cdb5" stroke-width="1"/><path d="M${x+160},${y+195}v101" stroke="#6f8192" stroke-width="1"/><text x="${x+8}" y="${y+22}" fill="white" font-size="16">${dirs[Math.floor(i/8)]} ${i%8<4?'walk':i%8===7?'idle':'hit'} ${i%8}</text>`}).join('')}</svg>`);
const contact=await sharp(bg).composite(pngs.map((input,i)=>({input,left:i%8*320,top:Math.floor(i/8)*320}))).png().toBuffer();
await sharp(contact).resize(1280,800).png().toFile(path.join(root,'qa-contact.png'));
const overlays=[];for(let row=0;row<5;row++){const overlay=Buffer.alloc(cell*cell*4);for(let p=0;p<cell*cell;p++){const a=frames[row*8+4],b=frames[row*8+5];overlay[p*4]=a[p*4];overlay[p*4+1]=b[p*4+1];overlay[p*4+2]=b[p*4+2];overlay[p*4+3]=Math.max(a[p*4+3],b[p*4+3])}overlays.push(await sharp(overlay,{raw:{width:cell,height:cell,channels:4}}).png().toBuffer())}
await sharp({create:{width:1600,height:320,channels:4,background:'#29313b'}}).composite(overlays.map((input,i)=>({input,left:i*320,top:0}))).png().toFile(path.join(root,'qa-hit-overlay.png'));
console.log(JSON.stringify(checks));

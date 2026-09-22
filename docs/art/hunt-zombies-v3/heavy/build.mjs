import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),sharp=require('E:/cslgDemo/node_modules/sharp');
const root=path.dirname(fileURLToPath(import.meta.url)),C=320,dirs=['S','SE','E','NE','N'];
async function source(name,action,cols,rows=5){
 const {data,info}=await sharp(path.join(root,`${name}-${action}-source.png`)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const seen=new Uint8Array(info.width*info.height),parts=[];
 for(let p=0;p<seen.length;p++){
  if(seen[p]||data[p*4+3]<80)continue;
  const pts=[p];seen[p]=1;let l=info.width,t=info.height,r=0,b=0;
  for(let i=0;i<pts.length;i++){const q=pts[i],x=q%info.width,y=Math.floor(q/info.width);l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);for(const n of [x?q-1:-1,x<info.width-1?q+1:-1,y?q-info.width:-1,y<info.height-1?q+info.width:-1])if(n>=0&&!seen[n]&&data[n*4+3]>=80){seen[n]=1;pts.push(n)}}
  if(pts.length>1200)parts.push({pts,l,t,r,b});
 }
 assert.equal(parts.length,cols*rows,`${name} ${action} full bodies`);
 parts.sort((a,b)=>(a.t+a.b)-(b.t+b.b));const poses=[];
 for(let row=0;row<rows;row++)poses.push(...parts.slice(row*cols,(row+1)*cols).sort((a,b)=>a.l-b.l));
 return {data,info,poses,cols,cellSize:info.width/cols};
}
function hitMask(name,dir,x,y){
 if(name==='explosive'&&dir===1)return y>=236||(y>=208&&x>=99&&x<146)||(y>=224&&x>191);
 // Anatomical polygons leave hanging hands free. Full-width area begins below hands.
 const g=[{y:194,l:127,r:211,full:270},{y:202,l:127,r:200,full:273},{y:201,l:95,r:151,full:273},{y:204,l:101,r:177,full:277},{y:204,l:106,r:213,full:270}];
 // On side/back explosives the long tank remains free; only visible trousers and boots lock.
 const e=[{y:235,l:122,r:198,full:268},{y:244,l:126,r:189,full:273},{y:247,l:115,r:177,full:277},{y:255,l:116,r:187,full:279},{y:246,l:127,r:194,full:274}];
 const q=(name==='giant'?g:e)[dir];return y>=q.full||(y>=q.y&&x>=q.l&&x<=q.r);
}
for(const name of process.argv.slice(2)){
 const walk=await source(name,'walk',4),hit=await source(name,'hit',3);
 const se=name==='explosive'?await source(name,'hit-SE',3,1):null;
 if(se)se.cellSize*=.91; // Single strip framing normalization, same for all 3 authored poses.
 const scale=236/((walk.poses[0].b-walk.poses[0].t+1)/walk.cellSize),frames=[],mapping=[];
 for(let row=0;row<5;row++)for(let col=0;col<7;col++){
  const src=col<4?walk:(se&&row===1?se:hit),p=src.poses[(src===se?0:row)*src.cols+(col<4?col:col-4)],s=scale/src.cellSize,w=p.r-p.l+1,h=p.b-p.t+1,raw=Buffer.alloc(w*h*4);
  for(const q of p.pts){const x=q%src.info.width-p.l,y=Math.floor(q/src.info.width)-p.t,at=(y*w+x)*4;src.data.copy(raw,at,q*4,q*4+4);raw[at+3]=Math.min(255,Math.round(raw[at+3]*255/254))}
  // Origin from lower boot region, not whole silhouette (arms/tank shift silhouette center).
  let footL=w,footR=0;
  for(let y=Math.floor(h*.88);y<h;y++)for(let x=0;x<w;x++)if(raw[(y*w+x)*4+3]>100){footL=Math.min(footL,x);footR=Math.max(footR,x)}
  const dw=Math.round(w*s),dh=Math.round(h*s),dx=Math.round(160-(footL+footR+1)*s/2),dy=296-dh;
  assert.ok(dx>=4&&dx+dw<=316&&dy>=4,`${name} ${row},${col} margin`);
  const scaled=await sharp(raw,{raw:{width:w,height:h,channels:4}}).resize(dw,dh).raw().toBuffer(),tile=Buffer.alloc(C*C*4);
  for(let y=0;y<dh;y++)scaled.copy(tile,((dy+y)*C+dx)*4,y*dw*4,(y+1)*dw*4);
  frames[row*8+col]=tile;mapping.push({frame:row*8+col,source:col<4?'walk':src===se?'hit-SE':'hit',sourceBounds:[p.l,p.t,p.r+1,p.b+1],sourceCellSize:src.cellSize,normalizedScale:scale,pixelScale:s,placement:[dx,dy,dw,dh],footCenterSourceX:p.l+(footL+footR+1)/2,sourceSoleY:p.b+1});
 }
 const masks=[],checks=[];
 for(let row=0;row<5;row++){
  const mask=Buffer.alloc(C*C);for(let y=0;y<C;y++)for(let x=0;x<C;x++)if(hitMask(name,row,x,y))mask[y*C+x]=255;
  for(const c of [5,6])for(let p=0;p<C*C;p++)if(mask[p])frames[row*8+4].copy(frames[row*8+c],p*4,p*4,p*4+4);
  frames[row*8+7]=Buffer.from(frames[row*8+4]);
  let mismatch=0,edgeAlpha=0;for(const col of [5,6,7])for(let p=0;p<C*C;p++)if(mask[p])for(let k=0;k<4;k++)mismatch+=+(frames[row*8+col][p*4+k]!==frames[row*8+4][p*4+k]);
  for(let col=0;col<8;col++)for(let y=0;y<C;y++)for(let x=0;x<C;x++)if(x<4||x>=316||y<4||y>=316)edgeAlpha+=frames[row*8+col][(y*C+x)*4+3];
  assert.equal(mismatch,0);assert.equal(edgeAlpha,0);checks.push({direction:dirs[row],fixedLowerMismatchBytes:mismatch,edgeAlpha});
  masks.push(await sharp(mask,{raw:{width:C,height:C,channels:1}}).png().toBuffer());
 }
 const pngs=await Promise.all(frames.map(raw=>sharp(raw,{raw:{width:C,height:C,channels:4}}).png().toBuffer()));
 await sharp({create:{width:C*8,height:C*5,channels:4,background:'#00000000'}}).composite(pngs.map((input,i)=>({input,left:i%8*C,top:Math.floor(i/8)*C}))).png().toFile(path.join(root,`${name}.png`));
 await sharp({create:{width:C*5,height:C,channels:4,background:'#00000000'}}).composite(masks.map((input,i)=>({input,left:i*C,top:0}))).png().toFile(path.join(root,`${name}-fixed-masks.png`));
 const metadata={atlas:`${name}.png`,visibleHeight:236,columns:8,rows:5,cell:320,anchor:{foot:[160,296]},directions:{}};
 for(let row=0;row<5;row++){const o=row*8;metadata.directions[dirs[row]]={walk:{frames:[o,o+1,o+2,o+3],durations:name==='giant'?[.28,.15,.30,.17]:[.20,.12,.23,.15],fps:name==='giant'?4.4:5.7,loop:true},hit:{frames:[o+4,o+5,o+6],durations:[.05,.10,.13],loop:false,impactFrame:1},idle:{frames:[o+7],durations:[1],loop:true}}}
 await writeFile(path.join(root,`${name}-part.json`),JSON.stringify(metadata,null,2));
 await writeFile(path.join(root,`${name}-mapping.json`),JSON.stringify({normalizedScale:scale,sourceSizes:{walk:[walk.info.width,walk.info.height],hit:[hit.info.width,hit.info.height]},mapping,lowerBodySource:'hit prepare col0 in each direction',maskFile:`${name}-fixed-masks.png`,checks},null,2));
 const bg=Buffer.from(`<svg width="2560" height="1600"><defs><pattern id="p" width="32" height="32" patternUnits="userSpaceOnUse"><rect width="32" height="32" fill="#414751"/><path d="M0 0h16v16H0zM16 16h16v16H16z" fill="#4e555f"/></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/>${frames.map((_,i)=>`<path d="M${i%8*C} ${Math.floor(i/8)*C+296}h320" stroke="#49d6aa"/>`).join('')}</svg>`);
 const contact=await sharp(bg).composite([{input:path.join(root,`${name}.png`)}]).png().toBuffer();await sharp(contact).resize(1600,1000).png().toFile(path.join(root,`${name}-qa-contact.png`));
 const overlays=[];for(let row=0;row<5;row++){
  const raw=Buffer.from(frames[row*8+4]);for(let p=0;p<C*C;p++)raw[p*4+3]=Math.round(raw[p*4+3]*.5);
  const next=Buffer.from(frames[row*8+5]);for(let p=0;p<C*C;p++)next[p*4+3]=Math.round(next[p*4+3]*.5);
  overlays.push({input:await sharp(raw,{raw:{width:C,height:C,channels:4}}).composite([{input:await sharp(next,{raw:{width:C,height:C,channels:4}}).png().toBuffer()}]).png().toBuffer(),left:row*C,top:0});
 }
 await sharp({create:{width:C*5,height:C,channels:4,background:'#424950'}}).composite(overlays).png().toFile(path.join(root,`${name}-qa-hit-overlay.png`));
 console.log(name,JSON.stringify({normalizedScale:scale,checks}));
}

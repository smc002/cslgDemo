import sharp from 'file:///E:/cslgDemo/node_modules/sharp/lib/index.js';
import fs from 'node:fs/promises';
export async function partsOf(file,cols){
 const {data,info}=await sharp(await fs.readFile(file)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const seen=new Uint8Array(info.width*info.height),parts=[];
 for(let p=0;p<seen.length;p++){
  if(seen[p]||data[p*4+3]<=64)continue;
  const pts=[p];seen[p]=1;let l=info.width,t=info.height,r=0,b=0;
  for(let i=0;i<pts.length;i++){const q=pts[i],x=q%info.width,y=Math.floor(q/info.width);l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);for(const v of [x?q-1:-1,x<info.width-1?q+1:-1,y?q-info.width:-1,y<info.height-1?q+info.width:-1])if(v>=0&&!seen[v]&&data[v*4+3]>64){seen[v]=1;pts.push(v)}}
  if(pts.length>1000)parts.push({pts,l,t,r,b});
 }
 parts.sort((a,b)=>(a.t+a.b)-(b.t+b.b));const poses=[];
 for(let r=0;r<5;r++)poses.push(...parts.slice(r*cols,(r+1)*cols).sort((a,b)=>a.l-b.l));
 return {poses,data,info};
}
for(const [name,cols] of [['walk',4],['hit',3]]){const {poses,info}=await partsOf(new URL(`armored-${name}-source.png`,import.meta.url),cols);console.log(name,JSON.stringify({size:[info.width,info.height],parts:poses.map(p=>[p.l,p.t,p.r,p.b])}))}

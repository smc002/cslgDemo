import sharp from 'file:///E:/cslgDemo/node_modules/sharp/lib/index.js';
import fs from 'node:fs/promises';
export async function components(file) {
const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const seen=new Uint8Array(info.width*info.height),parts=[];
for(let start=0;start<seen.length;start++){
 if(seen[start]||data[start*4+3]<=64)continue;
 const pts=[start];seen[start]=1;let l=info.width,t=info.height,r=0,b=0;
 for(let n=0;n<pts.length;n++){const p=pts[n],x=p%info.width,y=Math.floor(p/info.width);l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);for(const q of [x?p-1:-1,x<info.width-1?p+1:-1,y?p-info.width:-1,y<info.height-1?p+info.width:-1])if(q>=0&&!seen[q]&&data[q*4+3]>64){seen[q]=1;pts.push(q)}}
 if(pts.length>1000)parts.push({pts,l,t,r,b});
}
return {data,info,parts};
}
if(process.argv[2]){const {info,parts}=await components(process.argv[2]);console.log(JSON.stringify({info,parts:parts.map(({pts,...p})=>({...p,pixels:pts.length}))},null,2));}

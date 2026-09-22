import sharp from 'file:///E:/cslgDemo/node_modules/sharp/lib/index.js';
for(const name of process.argv.slice(2)) {
 const {data,info}=await sharp(`C:/Users/hy/.codex/art-work/hunt-zombies-v1/${name}-source.png`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const seen=new Uint8Array(info.width*info.height), comps=[];
 for(let i=0;i<seen.length;i++){
  if(seen[i]||data[i*4+3]<100)continue;
  const pts=[i];seen[i]=1;let l=info.width,t=info.height,r=0,b=0;
  for(let n=0;n<pts.length;n++){const p=pts[n],x=p%info.width,y=Math.floor(p/info.width);l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);for(const q of [x?p-1:-1,x<info.width-1?p+1:-1,y?p-info.width:-1,y<info.height-1?p+info.width:-1])if(q>=0&&!seen[q]&&data[q*4+3]>=100){seen[q]=1;pts.push(q)}}
  if(pts.length>1000)comps.push({n:pts.length,l,t,r,b});
 }
 console.log(name,JSON.stringify(comps));
}

import sharp from 'file:///E:/cslgDemo/node_modules/sharp/lib/index.js';
import fs from 'node:fs/promises';
const root='C:/Users/hy/.codex/art-work/hunt-zombies-v3-normal',dirs=['S','SE','E','NE','N'];
const atlas=await sharp(root+'/normal.png').ensureAlpha().raw().toBuffer();
const tiles=[];
for(let row=0;row<5;row++){
 const extract=col=>{const raw=Buffer.alloc(320*320*4);for(let y=0;y<320;y++)atlas.copy(raw,y*320*4,((row*320+y)*2560+col*320)*4,((row*320+y)*2560+(col+1)*320)*4);return raw};
 const base=extract(4);
 for(let col=0;col<3;col++){
  const raw=col===0?base:extract(col===1?5:6);
  const merged=Buffer.alloc(raw.length);
  for(let p=0;p<320*320;p++){const a=base[p*4+3]/255,b=raw[p*4+3]/255;for(let c=0;c<3;c++)merged[p*4+c]=Math.round((base[p*4+c]*a+raw[p*4+c]*b)/Math.max(.001,a+b));merged[p*4+3]=Math.round(Math.max(a,b)*255)}
  const image=await sharp(merged,{raw:{width:320,height:320,channels:4}}).png().toBuffer();
  tiles.push({input:image,left:col*320,top:row*320});
 }
}
const guides=Buffer.from('<svg width="960" height="1600">'+dirs.map((d,row)=>'<g><path d="M0 '+(row*320+296)+' H960" stroke="#ff5555" stroke-width="1"/><text x="10" y="'+(row*320+25)+'" font-size="18" fill="#eee">'+d+'</text></g>').join('')+'</svg>');
await sharp({create:{width:960,height:1600,channels:4,background:'#343a35'}}).composite([...tiles,{input:guides}]).png().toFile(root+'/qa-hit-overlay.png');

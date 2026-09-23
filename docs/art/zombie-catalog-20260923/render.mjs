// Render a documentation contact sheet from the current game atlas and color mapping.
import sharp from 'sharp';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
const out = 'docs/art/zombie-catalog-20260923';
await mkdir(out, { recursive: true });
const manifest = JSON.parse(await readFile('public/assets/hunt/zombies-v3/manifest.json', 'utf8'));
const source = await readFile('hunt/simulation.ts', 'utf8');
const names = [...source.split('export const SPECIES = [')[1].split('] as const;')[0].matchAll(/name: '([^']+)'/g)].map(x => x[1]);
const roles = ['基础目标','高速目标','重甲目标','大型高收益目标','限时奖励射击','范围爆炸','受击分裂弹','连锁电弧','范围冻结','橙色英雄挑战','激光技能掉落','散弹技能掉落'];
const bases = {normal:'游荡者形象',armored:'装甲形象',explosive:'背罐形象',giant:'巨型形象'};
const esc = s => s.replaceAll('&','&amp;').replaceAll('<','&lt;');
function matrix(type,v) {
  if(type==='brightness') return [[v,0,0],[0,v,0],[0,0,v]];
  if(type==='sepia') return [[1-.607*v,.769*v,.189*v],[.349*v,1-.314*v,.168*v],[.272*v,.534*v,1-.869*v]];
  if(type==='saturate') return [[.213+.787*v,.715-.715*v,.072-.072*v],[.213-.213*v,.715+.285*v,.072-.072*v],[.213-.213*v,.715-.715*v,.072+.928*v]];
  const c=Math.cos(v*Math.PI/180),s=Math.sin(v*Math.PI/180);
  return [[.213+.787*c-.213*s,.715-.715*c-.715*s,.072-.072*c+.928*s],[.213-.213*c+.143*s,.715+.285*c+.140*s,.072-.072*c-.283*s],[.213-.213*c-.787*s,.715-.715*c+.715*s,.072+.928*c+.072*s]];
}
const overlays=[]; let cards='';
for(let i=0;i<names.length;i++) {
  const def=manifest.kinds[i], a=manifest.archetypes[def.archetype], frame=a.directions.S.idle.frames[0];
  let buf=await sharp('public/assets/hunt/zombies-v3/'+a.atlas).extract({left:frame%a.columns*320,top:Math.floor(frame/a.columns)*320,width:320,height:320}).png().toBuffer();
  for(const m of (def.filter||'').matchAll(/([a-z-]+)\(([^)]+)\)/g)) buf=await sharp(buf).recomb(matrix(m[1],parseFloat(m[2]))).png().toBuffer();
  await writeFile(`${out}/hunt-${i}.png`,buf);
  const x=24+i%4*294,y=100+Math.floor(i/4)*324;
  overlays.push({input:await sharp(buf).resize(232,232).png().toBuffer(),left:x+24,top:y+35});
  cards+=`<rect x="${x}" y="${y}" width="282" height="312" rx="14" fill="#fffdf5"/><text x="${x+16}" y="${y+29}" font-size="20" font-weight="bold">${i.toString().padStart(2,'0')} · ${esc(names[i])}</text><text x="${x+16}" y="${y+278}" font-size="16">${roles[i]}</text><text x="${x+16}" y="${y+300}" font-size="13" fill="#687064">${bases[def.archetype]}${def.sharedAnimation?' · 共用 / 换色':' · 基础原型'}</text>`;
}
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1224" height="1110"><rect width="100%" height="100%" fill="#ebe6d7"/><g font-family="Microsoft YaHei" fill="#263e38"><text x="24" y="41" font-size="29" font-weight="bold">禁区猎场 · 当前 12 类僵尸</text><text x="24" y="74" font-size="17">按当前动画清单取正面准备帧与换色；统一展示尺寸，不表示战斗内体型比例。</text>${cards}<text x="24" y="1090" font-size="14">2026-09-23 · 4 套基础形象 / 12 个玩法类别 · 不含场上标签、光圈与临时战斗特效</text></g></svg>`;
await sharp(Buffer.from(svg)).composite(overlays).png().toFile(`${out}/hunt-current.png`);
const frames=[{left:69,top:1123,width:241,height:280},{left:427,top:1112,width:221,height:291},{left:717,top:1086,width:341,height:323}];
const fieldNames=['普通感染者（整理名）','工人感染者（整理名）','壮硕感染者（整理名）'];
const fieldOverlays=[];let fieldCards='';
for(let i=0;i<3;i++) {
  const buf=await sharp('public/assets/portrait/characters.png').extract(frames[i]).png().toBuffer();
  await writeFile(`${out}/scavenge-${i}.png`,buf);
  fieldOverlays.push({input:await sharp(buf).resize(240,240,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer(),left:30+i*300,top:110});
  fieldCards+=`<text x="${30+i*300}" y="95" font-size="18">${i} · ${fieldNames[i]}</text>`;
}
await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="930" height="390"><rect width="100%" height="100%" fill="#ebe6d7"/><g font-family="Microsoft YaHei" fill="#263e38"><text x="24" y="40" font-size="28" font-weight="bold">搜刮战斗 · 当前 3 种敌人形象</text>${fieldCards}<text x="24" y="375" font-size="15">首领节点复用壮硕感染者形象并强化生命值，未发现独立首领立绘。</text></g></svg>`)).composite(fieldOverlays).png().toFile(`${out}/scavenge-current.png`);
console.log(`Rendered ${names.length} hunt types and ${frames.length} scavenge types.`);

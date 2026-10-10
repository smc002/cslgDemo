import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root = new URL('./', import.meta.url);
const spreadsheet = 'SIbksyvr2hG1K6t4Ccuc0JoQn7f';
const sheet = 'db8130';
const base = `https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/${spreadsheet}`;
const briefs = JSON.parse(await fs.readFile(new URL('briefs.json',root),'utf8'));
const original = JSON.parse(await fs.readFile(new URL('sheet-before.json',root),'utf8')).data.valueRange.values;
const env = Object.fromEntries((await fs.readFile('.feishu.env','utf8')).split(/\r?\n/).filter(x=>/^[A-Z_]+=/.test(x)).map(x=>[x.slice(0,x.indexOf('=')),x.slice(x.indexOf('=')+1).trim()]));
const now = new Date();
const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
assert.equal(env.FEISHU_DAILY_AUTH_DATE,today,'Daily user authorization required');
assert.ok(env.FEISHU_USER_ACCESS_TOKEN && Number(env.FEISHU_USER_TOKEN_EXPIRES_AT)>Date.now()/1000+60,'User token must be valid');
const headers = {Authorization:`Bearer ${env.FEISHU_USER_ACCESS_TOKEN}`,'Content-Type':'application/json; charset=utf-8'};
async function api(suffix,method='GET',body) {
  const res = await fetch(base+suffix,{method,headers,body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(60000)});
  const j = await res.json();
  if(!res.ok || j.code!==0) throw new Error(`${method} ${suffix}: HTTP ${res.status}, ${j.code}, ${j.msg}`);
  return j;
}
const read = async range => (await api(`/values/${sheet}!${range}`)).data.valueRange.values;
const logPath = new URL('publish-log.json',root);
let log;
try {log=JSON.parse(await fs.readFile(logPath,'utf8'));} catch {log=[];}
const mode=process.argv[2]??'verify';
if(mode==='publish') {
  const values=await read('A1:T80');
  assert.equal(values[11][6],'新版');
  for(const b of briefs) {
    const r=values[b.row-1];
    assert.deepEqual(r.slice(1,4),[b.name,b.size,b.faction],`Row mapping ${b.row}`);
    assert.ok(r[4]===original[b.row-1][4] || r[4]===b.description,`Description modified externally: E${b.row}`);
    const old=log.find(x=>x.row===b.row);
    assert.ok(!r[6] || r[6].fileToken===old?.fileToken,`New image cell modified externally: G${b.row}`);
    await fs.access(new URL(b.file,root));
  }
  await api('/values','PUT',{valueRange:{range:`${sheet}!E13:E25`,values:briefs.map(b=>[b.description])}});
  console.log('Descriptions written: E13:E25');
  // Change only the zombie rows and the new image column for readable concept cards.
  for(const [majorDimension,startIndex,endIndex,fixedSize] of [['ROWS',12,25,330],['COLUMNS',6,7,330]]) {
    await api('/dimension_range','PUT',{dimension:{sheetId:sheet,majorDimension,startIndex,endIndex},dimensionProperties:{fixedSize}});
  }
  for(const b of briefs) {
    const old=log.find(x=>x.row===b.row);
    if(old && values[b.row-1][6]?.fileToken===old.fileToken) {console.log(`Already verified G${b.row}: ${b.name}`);continue;}
    const bytes=await fs.readFile(new URL(b.file,root));
    const result=await api('/values_image','POST',{range:`${sheet}!G${b.row}:G${b.row}`,image:Array.from(bytes),name:b.file});
    const cell=(await read(`G${b.row}:G${b.row}`))[0][0];
    assert.equal(cell.type,'embed-image');
    assert.ok(cell.fileToken);
    const entry={row:b.row,name:b.name,file:b.file,sha256:createHash('sha256').update(bytes).digest('hex'),fileToken:cell.fileToken,revision:result.data.revision,range:result.data.updateRange,uploadedAt:new Date().toISOString()};
    log=log.filter(x=>x.row!==b.row);log.push(entry);
    await fs.writeFile(logPath,JSON.stringify(log,null,2));
    console.log(`Uploaded and verified G${b.row}: ${b.name}`);
  }
}
const after=await api(`/values/${sheet}!A1:T80`);
await fs.writeFile(new URL('sheet-after.json',root),JSON.stringify(after,null,2));
const values=after.data.valueRange.values;
function stable(v) {
  if(Array.isArray(v))return v.map(stable);
  if(v && typeof v==='object')return Object.fromEntries(Object.entries(v).filter(([k])=>k!=='link').map(([k,x])=>[k,stable(x)]));
  return v??null;
}
for(let r=0;r<80;r++) for(let c=0;c<20;c++) {
  if(r>=12 && r<=24 && [4,6].includes(c))continue;
  assert.deepEqual(stable(values[r]?.[c]),stable(original[r]?.[c]),`Unrelated cell changed at row ${r+1}, col ${c+1}`);
}
for(const b of briefs) {
  assert.equal(values[b.row-1][4],b.description,`Description E${b.row}`);
  assert.equal(values[b.row-1][6]?.fileToken,log.find(x=>x.row===b.row)?.fileToken,`Image G${b.row}`);
  assert.equal(values[b.row-1][6]?.type,'embed-image');
}
assert.equal(new Set(log.map(x=>x.fileToken)).size,13);
console.log('VERIFIED: 13 descriptions, 13 distinct embedded images, all other cell contents preserved.');

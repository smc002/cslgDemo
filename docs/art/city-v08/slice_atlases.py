"""Reproducible alpha-preserving component slicing of generated 4x3 atlases.
Only crop/alpha-mask/resize/paste operations; no artwork redrawn.
"""
from PIL import Image, ImageFilter, ImageDraw
from pathlib import Path
from collections import deque
import numpy as np
import json

ROOT=Path(__file__).parent
SOURCE=ROOT
OUTPUT=ROOT.parents[2]/'public'/'assets'/'city-v08'
OUTPUT.mkdir(parents=True,exist_ok=True)
FILES=['atlas-0.png','atlas-1.png','atlas-2.png']
IDS=['hq','power','comms','medical','factory','research','barracks','armory','drone','warehouse','garage','workshop']
manifest={'generator':'built-in image_gen','spriteSize':[512,512],'anchor':[0.5,0.96875],'terrainSize':[938,1677],'notes':['Genuine generated alpha retained. Major connected alpha components isolated with a 3px mask expansion.','Tier 0 and 1 are close in complexity; tier 2 adds practical solar panels, lighting and armor.','No AI re-drawing during slicing.'],'sprites':[]}

def components(alpha):
 mask=alpha>40; h,w=mask.shape
 labels=np.zeros((h,w),dtype=np.int32); result=[]; idx=0
 for y,x in zip(*np.where(mask)):
  if labels[y,x]:continue
  idx+=1;q=deque([(y,x)]);labels[y,x]=idx;n=0;sx=sy=0
  while q:
   yy,xx=q.popleft();n+=1;sx+=xx;sy+=yy
   for dy,dx in ((-1,0),(1,0),(0,-1),(0,1)):
    ny,nx=yy+dy,xx+dx
    if 0<=ny<h and 0<=nx<w and mask[ny,nx] and not labels[ny,nx]:
     labels[ny,nx]=idx;q.append((ny,nx))
  if n>5000:result.append((idx,n,sx/n,sy/n))
 assert len(result)==12,len(result)
 return labels,sorted(result,key=lambda a:(int(a[3]//(h/3)),a[2]))

for tier,name in enumerate(FILES):
 image=Image.open(SOURCE/name).convert('RGBA'); a=np.array(image.getchannel('A'))
 labels,comps=components(a)
 sheet=Image.new('RGB',(1024,800),(188,184,158)); draw=ImageDraw.Draw(sheet)
 for index,(label,n,cx,cy) in enumerate(comps):
  ident=IDS[index]
  mask=Image.fromarray((labels==label).astype('uint8')*255).filter(ImageFilter.MaxFilter(7))
  valid=np.array(mask)>0
  isolated=image.copy(); isolated.putalpha(Image.fromarray(np.where(valid,a,0).astype('uint8')))
  box=isolated.getbbox(); cropped=isolated.crop(box)
  ratio=min(480/cropped.width,480/cropped.height)
  size=(round(cropped.width*ratio),round(cropped.height*ratio))
  cropped=cropped.resize(size,Image.Resampling.LANCZOS)
  sprite=Image.new('RGBA',(512,512)); left=(512-size[0])//2;top=496-size[1]
  sprite.alpha_composite(cropped,(left,top)); sprite.save(OUTPUT/f'{ident}-{tier}.png')
  thumb=sprite.resize((256,256),Image.Resampling.LANCZOS)
  px=(index%4)*256;py=(index//4)*266
  sheet.paste(thumb,(px,py),thumb);draw.text((px+6,py+249),f'{ident}-{tier}',fill=(30,40,40))
  manifest['sprites'].append({'id':ident,'tier':tier,'file':f'{ident}-{tier}.png','sourceBox':box,'contentBox':[left,top,left+size[0],top+size[1]],'opaquePixels':n})
 sheet.save(ROOT/f'contact-{tier}.jpg',quality=92)
(ROOT/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print(f'Rebuilt 36 sprites at {OUTPUT}; contact sheets and manifest at {ROOT}. Terrain is retained unchanged.')

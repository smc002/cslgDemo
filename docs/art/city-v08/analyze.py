from PIL import Image
from pathlib import Path
import numpy as np
from collections import deque
root=Path('C:/Users/hy/.codex/generated_images/01a0c769-0be2-7371-87d4-e20dbf141028')
for p in root.glob('*.png'):
 im=Image.open(p)
 if im.mode!='RGBA': continue
 a=np.array(im.getchannel('A'))
 mask=a>40
 labels=np.zeros(mask.shape,dtype=np.int32)
 comps=[]; idx=0
 h,w=mask.shape
 for y,x in zip(*np.where(mask)):
  if labels[y,x]:continue
  idx+=1; q=deque([(y,x)]);labels[y,x]=idx;size=0; minx=maxx=x;miny=maxy=y
  while q:
   yy,xx=q.popleft();size+=1
   minx=min(minx,xx);maxx=max(maxx,xx);miny=min(miny,yy);maxy=max(maxy,yy)
   for dy,dx in ((-1,0),(1,0),(0,-1),(0,1)):
    ny,nx=yy+dy,xx+dx
    if 0<=ny<h and 0<=nx<w and mask[ny,nx] and not labels[ny,nx]:
     labels[ny,nx]=idx;q.append((ny,nx))
  comps.append((size,idx,(int(minx),int(miny),int(maxx+1),int(maxy+1))))
 comps.sort(reverse=True)
 print(p.name,comps[:16])
 np.save(str(p)+'.labels.npy',labels)

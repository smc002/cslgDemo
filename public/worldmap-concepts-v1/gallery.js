const viewer=document.getElementById('viewer');let opener;
document.querySelectorAll('.zoom').forEach(button=>button.addEventListener('click',()=>{opener=button;document.getElementById('caption').textContent=button.dataset.caption;document.getElementById('full-image').src=button.dataset.image;document.getElementById('full-image').alt=button.dataset.caption;document.getElementById('original').href=button.dataset.image;viewer.showModal();}));
document.getElementById('close').addEventListener('click',()=>viewer.close());
viewer.addEventListener('close',()=>opener?.focus());
viewer.addEventListener('click',event=>{if(event.target===viewer){const r=viewer.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)viewer.close();}});

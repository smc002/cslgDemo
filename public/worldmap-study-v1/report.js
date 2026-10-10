const filters = [...document.querySelectorAll('[data-filter]')];
filters.forEach(button => button.addEventListener('click', () => {
 const game=button.dataset.filter; let shown=0;
 document.querySelectorAll('.reference').forEach(card=>{card.hidden=game!=='all'&&card.dataset.game!==game;if(!card.hidden)shown++;});
 filters.forEach(b=>{const active=b===button;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
 document.getElementById('filter-count').textContent='显示 '+shown+' 组';
}));
const planButtons=[...document.querySelectorAll('[data-plan-filter]')];
planButtons.forEach(button=>button.addEventListener('click',()=>{
 const chosen=button.dataset.planFilter;
 document.querySelectorAll('.plan').forEach(plan=>{plan.hidden=chosen!=='all'&&plan.dataset.plan!==chosen;});
 document.querySelector('.plans').classList.toggle('single',chosen!=='all');
 planButtons.forEach(b=>{const active=b===button;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
}));
const dialog=document.getElementById('image-dialog');
let trigger;
document.querySelectorAll('.image-open').forEach(button=>button.addEventListener('click',()=>{
 trigger=button;document.getElementById('dialog-image').src=button.dataset.image;
 document.getElementById('dialog-image').alt=button.dataset.caption;
 document.getElementById('dialog-caption').textContent=button.dataset.caption;
 document.getElementById('dialog-source').href=button.dataset.source;
 dialog.showModal();
}));
document.getElementById('close-dialog').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
dialog.addEventListener('close',()=>trigger?.focus());


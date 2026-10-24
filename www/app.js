(()=>{
'use strict';
/* ================= داده‌ها ================= */
const KEY='acc_mgr_v1',CK='acc_cfg_v1';
const COLL=['cats','products','invoices','lots','outs','imgs'];
const fix=d=>{if(!d||typeof d!=='object')d={};COLL.forEach(k=>{if(!Array.isArray(d[k]))d[k]=[]});if(!d.tomb||typeof d.tomb!=='object')d.tomb={};return d};
let DB;try{DB=fix(JSON.parse(localStorage.getItem(KEY)))}catch(e){DB=fix(null)}
let CFG={url:'',key:'',user:''};
try{CFG=Object.assign(CFG,JSON.parse(localStorage.getItem(CK)))}catch(e){}
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const touch=o=>{o.u=Date.now();return o};
const $=(s,r)=>(r||document).querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function merge(a,b){
  const r={tomb:Object.assign({},a.tomb||{},b.tomb||{})};
  for(const k of COLL){
    const m=new Map();
    for(const x of [].concat(a[k]||[],b[k]||[])){
      if(!x||!x.id||r.tomb[x.id])continue;
      const o=m.get(x.id);
      if(!o||(x.u||0)>(o.u||0))m.set(x.id,x);
    }
    r[k]=[...m.values()];
  }
  return r;
}
function migrate(){
  COLL.forEach(k=>DB[k].forEach(x=>{if(x.u==null)x.u=0}));
  DB.invoices.forEach(v=>{
    const used=new Set(v.items.map(i=>i.lotId).filter(Boolean));
    v.items.forEach(i=>{if(!i.lotId){const l=DB.lots.find(x=>x.invId===v.id&&x.pid===i.pid&&!used.has(x.id));if(l){i.lotId=l.id;used.add(l.id)}}});
  });
}
/* موجودی هر فاکتور و بهای تمام‌شده هر خروج، همیشه از روی «اول‌وارد اول‌خارج» محاسبه می‌شود */
function recompute(){
  const by={};
  DB.lots.forEach(l=>{l.rem=l.qty;(by[l.pid]=by[l.pid]||[]).push(l)});
  for(const k in by)by[k].sort((a,b)=>a.dk-b.dk||a.ts-b.ts||(a.id<b.id?-1:1));
  const outs=[...DB.outs].sort((a,b)=>a.ts-b.ts||(a.id<b.id?-1:1));
  for(const o of outs){
    let need=o.q,cost=0;const L=by[o.pid]||[];
    for(const l of L){if(!need)break;if(l.rem<=0)continue;const t=Math.min(l.rem,need);l.rem-=t;need-=t;cost+=t*l.buy}
    if(need){cost+=need*(L.length?L[L.length-1].buy:0);o.over=need}else delete o.over;
    o.cost=cost;
  }
}
migrate();recompute();
function del(coll,id){DB[coll]=DB[coll].filter(x=>x.id!==id);DB.tomb[id]=Date.now()}
function save(){
  recompute();
  try{localStorage.setItem(KEY,JSON.stringify(DB))}catch(e){toast('خطا در ذخیره‌سازی',1)}
  scheduleSync();
}

/* ================= آیکن‌ها ================= */
const IC={
 stock:'<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
 in:'<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 21h16"/>',
 out:'<path d="M12 17V5"/><path d="M7 10l5-5 5 5"/><path d="M4 21h16"/>',
 def:'<path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.3"/>',
 rep:'<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/>',
 back:'<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>',
 set:'<path d="M4 7h9"/><path d="M17 7h3"/><circle cx="15" cy="7" r="2"/><path d="M4 17h3"/><path d="M11 17h9"/><circle cx="9" cy="17" r="2"/>',
 scan:'<path d="M4 8V5a1 1 0 0 1 1-1h3"/><path d="M16 4h3a1 1 0 0 1 1 1v3"/><path d="M20 16v3a1 1 0 0 1-1 1h-3"/><path d="M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M4 12h16"/>',
 copy:'<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
 trash:'<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"/><path d="M9 7V4h6v3"/>',
 edit:'<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 undo:'<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
 pct:'<path d="M19 5L5 19"/><circle cx="7" cy="7" r="2"/><circle cx="17" cy="17" r="2"/>',
 img:'<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 8"/>',
 cloud:'<path d="M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 9.5 4.3 4.3 0 0 1 17.5 18H7z"/>',
 gen:'<path d="M20 11a8 8 0 0 0-14-4M4 5v4h4"/><path d="M4 13a8 8 0 0 0 14 4M20 19v-4h-4"/>'
};
const ico=(n,s)=>`<svg class="i" viewBox="0 0 24 24"${s?` style="width:${s}px;height:${s}px"`:''}>${IC[n]}</svg>`;

/* ================= ارقام و تاریخ شمسی ================= */
const P='۰۱۲۳۴۵۶۷۸۹',AR='٠١٢٣٤٥٦٧٨٩';
const fa=s=>String(s).replace(/\d/g,d=>P[d]);
const digits=s=>String(s==null?'':s).replace(/[۰-۹]/g,d=>P.indexOf(d)).replace(/[٠-٩]/g,d=>AR.indexOf(d));
const en=s=>digits(s).replace(/٫/g,'.').replace(/[−–]/g,'-').replace(/[,٬،\s]/g,'');
const num=v=>{const t=en(v);if(t==='')return NaN;const n=Number(t);return isFinite(n)?n:NaN};
const nf=n=>Math.round(n).toLocaleString('en-US');
const fmt=n=>fa(nf(n));
const norm=s=>digits(s).toLowerCase().replace(/ي/g,'ی').replace(/ك/g,'ک').trim();
const MN=['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
const pad=n=>String(n).padStart(2,'0');
function g2j(gy,gm,gd){
  const gdm=[0,31,59,90,120,151,181,212,243,273,304,334];
  const gy2=gm>2?gy+1:gy;
  let days=355666+365*gy+~~((gy2+3)/4)-~~((gy2+99)/100)+~~((gy2+399)/400)+gd+gdm[gm-1];
  let jy=-1595+33*~~(days/12053);days%=12053;
  jy+=4*~~(days/1461);days%=1461;
  if(days>365){jy+=~~((days-1)/365);days=(days-1)%365}
  const jm=days<186?1+~~(days/31):7+~~((days-186)/30);
  const jd=1+(days<186?days%31:(days-186)%30);
  return [jy,jm,jd];
}
const today=()=>{const d=new Date();const [y,m,dd]=g2j(d.getFullYear(),d.getMonth()+1,d.getDate());return y*10000+m*100+dd};
const dY=k=>Math.floor(k/10000),dM=k=>Math.floor(k/100)%100,dD=k=>k%100;
const dstr=k=>fa(dY(k)+'/'+pad(dM(k))+'/'+pad(dD(k)));
function parseD(s){
  const m=digits(s).trim().match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
  if(!m)return null;
  const y=+m[1],mo=+m[2],d=+m[3];
  if(mo<1||mo>12||d<1||d>(mo<=6?31:30))return null;
  return y*10000+mo*100+d;
}

/* ================= ابزارهای داده ================= */
const cat=id=>DB.cats.find(c=>c.id===id);
const prod=id=>DB.products.find(p=>p.id===id);
const lotsOf=pid=>DB.lots.filter(l=>l.pid===pid);
const stock=pid=>lotsOf(pid).reduce((s,l)=>s+l.rem,0);
const byNew=(a,b)=>b.dk-a.dk||b.ts-a.ts;
function setSell(p,v){if(p.sell!==v){p.sell=v;(p.sellHist=p.sellHist||[]).unshift({p:v,dk:today()})}touch(p)}
function findP(q){
  const s=norm(q);if(!s)return [];
  return DB.products.filter(p=>norm(p.name).includes(s)||norm(p.code).includes(s)||(p.barcode&&norm(p.barcode).includes(s)));
}
function nextCode(){
  const n=DB.products.map(p=>+p.code).filter(x=>Number.isInteger(x)&&x>0);
  return String(n.length?Math.max(...n)+1:1001);
}
function allYears(){
  const s=new Set([dY(today())]);
  DB.lots.forEach(l=>s.add(dY(l.dk)));DB.outs.forEach(o=>s.add(dY(o.dk)));
  return [...s].sort((a,b)=>b-a);
}
function agg(lo,hi){
  let i=0,o=0,c=0,ni=0,no=0;
  for(const l of DB.lots)if(l.dk>=lo&&l.dk<=hi){i+=l.qty*l.buy;ni+=l.qty}
  for(const x of DB.outs)if(x.dk>=lo&&x.dk<=hi){o+=x.q*x.unit;c+=x.cost;no+=x.q}
  return {i,o,p:o-c,ni,no};
}
const outCode=o=>o.code||((prod(o.pid)||{}).code)||'';

/* ================= پیام، پنجره، اسکن ================= */
let tt;
function toast(m,err){const t=$('#toast');t.textContent=m;t.className='show'+(err?' err':'');clearTimeout(tt);tt=setTimeout(()=>t.className='',2400)}
const MD=$('#modal');
function modal(html){
  const o=document.createElement('div');o.className='ov';
  const b=document.createElement('div');b.className='box';b.innerHTML=html;
  o.appendChild(b);MD.appendChild(o);
  o.addEventListener('click',e=>{if(e.target===o)o.remove()});
  return b;
}
const closeModal=b=>{const o=b?b.parentElement:MD.lastElementChild;if(o)o.remove()};
const ask=msg=>new Promise(res=>{
  const b=modal(`<p class="q">${msg}</p><div class="row"><button class="btn pink" data-r="0">خیر</button><button class="btn cyan" data-r="1">بلی</button></div>`);
  b.addEventListener('click',e=>{const t=e.target.closest('[data-r]');if(t){closeModal(b);res(t.dataset.r==='1')}});
  b.parentElement.addEventListener('click',e=>{if(e.target===b.parentElement)res(false)});
});
function copyText(t){
  const fb=()=>{const x=document.createElement('textarea');x.value=t;document.body.appendChild(x);x.select();try{document.execCommand('copy');toast('کپی شد')}catch(e){toast('کپی ممکن نشد',1)}x.remove()};
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(()=>toast('کپی شد'),fb);else fb();
}
async function scan(cb){
  if(typeof Html5Qrcode==='undefined'){toast('اسکنر در دسترس نیست',1);return}
  const b=modal('<h3>اسکن بارکد</h3><div id="reader"></div><button class="btn pink wide" id="scx">بستن</button>');
  const h=new Html5Qrcode('reader');let done=false;
  const stop=async()=>{try{await h.stop();h.clear()}catch(e){}};
  $('#scx',b).onclick=async()=>{await stop();closeModal(b)};
  try{
    await h.start({facingMode:'environment'},{fps:10,qrbox:{width:260,height:160}},async txt=>{
      if(done)return;done=true;await stop();closeModal(b);cb(txt);
    },()=>{});
  }catch(e){closeModal(b);toast('دسترسی به دوربین ممکن نشد. اجازه دوربین را بررسی کنید',1)}
}

/* ================= عکس فاکتور (IndexedDB) ================= */
const idb=(()=>{
  let p;
  const open=()=>p||(p=new Promise((res,rej)=>{const r=indexedDB.open('accimg',1);r.onupgradeneeded=()=>r.result.createObjectStore('i');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}));
  const tx=async(m,f)=>{const d=await open();return new Promise((res,rej)=>{const t=d.transaction('i',m);const r=f(t.objectStore('i'));t.oncomplete=()=>res(r.result);t.onerror=()=>rej(t.error)})};
  return {get:k=>tx('readonly',s=>s.get(k)),put:(k,v)=>tx('readwrite',s=>s.put(v,k)),del:k=>tx('readwrite',s=>s.delete(k)),keys:()=>tx('readonly',s=>s.getAllKeys())};
})();
function shrink(file){
  return new Promise((res,rej)=>{
    const fr=new FileReader();
    fr.onload=()=>{const im=new Image();im.onload=()=>{
      const s=Math.min(1,1600/Math.max(im.width,im.height));
      const c=document.createElement('canvas');c.width=Math.round(im.width*s);c.height=Math.round(im.height*s);
      c.getContext('2d').drawImage(im,0,0,c.width,c.height);res(c.toDataURL('image/jpeg',.75));
    };im.onerror=rej;im.src=fr.result};
    fr.onerror=rej;fr.readAsDataURL(file);
  });
}
async function addPhotos(files,inv){
  let n=0;
  for(const f of files){
    try{const data=await shrink(f);const id=uid();await idb.put(id,data);DB.imgs.push(touch({id,inv,ts:Date.now()}));n++}catch(e){}
  }
  if(n){save();toast(fa(n)+' عکس اضافه شد')}else toast('عکس خوانده نشد',1);
}
function fillThumbs(root){
  root.querySelectorAll('img[data-img]').forEach(im=>{idb.get(im.dataset.img).then(d=>{if(d)im.src=d}).catch(()=>{})});
}

/* ================= همگام‌سازی با سرور ================= */
let syncing=false,pending=false,tmr;
const setSt=s=>{const d=$('#sd');if(d)d.className='sd '+s};
const normUrl=u=>{u=u.trim().replace(/\/+$/,'');return u&&!/^https?:\/\//i.test(u)?'http://'+u:u};
async function api(method,path,body){
  const f=fetch(CFG.url+path,{method,headers:{'Content-Type':'application/json','x-key':CFG.key},body:body?JSON.stringify(body):undefined})
    .then(r=>{if(r.status===401)throw new Error('کلید دسترسی اشتباه است');if(!r.ok)throw new Error('خطای سرور '+r.status);return r.json()});
  const to=new Promise((_,rej)=>setTimeout(()=>rej(new Error('پاسخی از سرور نیامد')),25000));
  return Promise.race([f,to]);
}
function scheduleSync(){if(!CFG.url)return;clearTimeout(tmr);tmr=setTimeout(()=>syncNow(),1200)}
async function syncImgs(){
  const have=new Set(await idb.keys());
  const srv=new Set((await api('GET','/api/imgs')).ids);
  const meta=new Set(DB.imgs.map(m=>m.id));
  for(const k of have)if(!meta.has(k))await idb.del(k);
  for(const m of DB.imgs){
    if(!have.has(m.id)&&srv.has(m.id)){const r=await api('GET','/api/img/'+m.id);if(r&&r.data)await idb.put(m.id,r.data)}
    else if(have.has(m.id)&&!srv.has(m.id)){await api('PUT','/api/img/'+m.id,{data:await idb.get(m.id)})}
  }
}
async function syncNow(manual){
  if(!CFG.url)return;
  if(syncing){pending=true;return}
  syncing=true;setSt('busy');
  try{
    const r=await api('POST','/api/sync',{db:DB,user:CFG.user});
    const before=JSON.stringify(DB);
    DB=fix(merge(DB,r.db));migrate();recompute();
    const changed=JSON.stringify(DB)!==before;
    localStorage.setItem(KEY,JSON.stringify(DB));
    await syncImgs();
    setSt('ok');
    if(changed)softRender();
    if(manual)toast('همگام‌سازی انجام شد');
  }catch(e){setSt('err');if(manual)toast('خطا: '+e.message,1)}
  syncing=false;
  if(pending){pending=false;scheduleSync()}
}
function softRender(){
  const a=document.activeElement;
  if(MD.children.length||(a&&/INPUT|SELECT|TEXTAREA/.test(a.tagName)))return;
  render(true);
}
setInterval(()=>{if(document.visibilityState==='visible')syncNow()},25000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')syncNow()});

/* ================= نماها ================= */
const S={q:'',rt:'all',ry:null,rm:null,rf:null,rto:null,draft:null,editPid:null,defCat:null};
const route=()=>location.hash.replace(/^#\/?/,'').split('/').filter(Boolean);
const empty=t=>`<p class="empty">${t}</p>`;

function prow(p){
  return `<div class="item" data-a="open" data-id="${p.id}"><div class="grow"><b>${esc(p.name)}</b><small>کد: ${esc(fa(p.code))}${cat(p.cat)?' | '+esc(cat(p.cat).name):''}</small></div><div class="st">${fa(stock(p.id))} عدد</div></div>`;
}
function stockBody(q){
  if(q.trim()){const l=findP(q);return l.length?l.map(prow).join(''):empty('کالایی پیدا نشد')}
  if(!DB.cats.length)return empty('ابتدا از بخش «تعریف» دسته‌بندی بسازید');
  return `<div class="grid">${DB.cats.map((c,i)=>{
    const ps=DB.products.filter(p=>p.cat===c.id);
    const tot=ps.reduce((s,p)=>s+stock(p.id),0);
    return `<div class="sq c${i%4}" data-a="openCat" data-id="${c.id}"><b>${esc(c.name)}</b><small>${fa(ps.length)} کالا</small><small>${fa(tot)} موجودی</small></div>`;
  }).join('')}</div>`;
}
const vStock=()=>`<div class="sbar"><input id="sq" placeholder="جستجو: نام کالا یا کد کالا" value="${esc(S.q)}"><button class="ic" data-a="scanSearch">${ico('scan')}</button></div>
<button class="btn wide yellow" data-a="pctCats">${ico('pct')} تغییر درصدی قیمت فروش کالاها</button>
<div id="sres" style="margin-top:12px">${stockBody(S.q)}</div>`;

function vCat(id){
  const c=cat(id);if(!c)return empty('دسته‌بندی پیدا نشد');
  const ps=DB.products.filter(p=>p.cat===id);
  if(!ps.length)return empty('در این دسته‌بندی کالایی تعریف نشده');
  return `<div class="row"><button class="btn pink" data-a="selAll">انتخاب همه</button><button class="btn yellow" data-a="pctSel">${ico('pct',20)} افزایش قیمت انتخابی‌ها</button></div>`+
  ps.map(p=>`<div class="item"><input type="checkbox" class="ck" value="${p.id}"><div class="grow" data-a="open" data-id="${p.id}"><b>${esc(p.name)}</b><small>کد: ${esc(fa(p.code))} | فروش: ${p.sell!=null?fmt(p.sell):'—'}</small></div><div class="st">${fa(stock(p.id))} عدد</div></div>`).join('');
}

function vProd(id){
  const p=prod(id);if(!p)return empty('کالا پیدا نشد');
  const L=lotsOf(id).sort(byNew);
  const dates=[...new Set(L.map(l=>l.dk))];
  const sells=p.sellHist||[];
  const more=(arr,f)=>arr.length>1?`<details><summary>بیشتر</summary><div>${arr.slice(1).map(f).join('')}</div></details>`:'';
  const box=(t,main,extra)=>`<div class="card"><h4>${t}</h4><div class="val">${main}</div>${extra||''}</div>`;
  const lotRow=l=>`<div class="${l.rem?'':'lot z'}"><b>فاکتور ${esc(fa(l.inv))}</b> <small style="display:inline">${dstr(l.dk)}</small><small>ورودی ${fa(l.qty)} عدد | باقی‌مانده ${fa(l.rem)} عدد${l.rem?'':' (تمام شده)'}</small><small>قیمت خرید: ${fmt(l.buy)} تومان</small></div>`;
  return `<div class="card"><div class="item" style="border:0;box-shadow:none;padding:0;margin:0;background:none"><div class="grow"><b style="font-size:19px">${esc(p.name)}</b><small>کد: ${esc(fa(p.code))}${p.barcode?' | بارکد: '+esc(fa(p.barcode)):''}</small></div>
  <button class="ic sm" data-a="copy" data-t="${esc(p.name)}">${ico('copy')}</button><button class="ic sm" data-a="google" data-t="${esc(p.name)}">${ico('search')}</button></div></div>`+
  box('تاریخ ورود',dates.length?dstr(dates[0]):'—',more(dates,d=>`<div>${dstr(d)}</div>`))+
  box('تعداد موجودی',fa(stock(id))+' عدد')+
  `<div class="card"><h4>قیمت خرید (به تفکیک فاکتور)</h4>${L.length?lotRow(L[0]):'—'}${more(L,lotRow)}</div>`+
  box('قیمت فروش',p.sell!=null?fmt(p.sell)+' تومان':'—',more(sells,s=>`<div>${fmt(s.p)} تومان — ${dstr(s.dk)}</div>`))+
  `<div class="row"><button class="btn pink" data-a="exitP" data-id="${id}" ${stock(id)?'':'disabled'}>خروج کالا</button><button class="btn cyan" data-a="editSell" data-id="${id}" ${p.sell!=null?'':'disabled'}>اصلاح قیمت فروش</button></div>`;
}

function vIn(){
  const inv=[...DB.invoices].sort(byNew);
  return `<button class="btn wide green" data-a="newInv">${ico('plus')} افزودن فاکتور</button>`+
  (inv.length?inv.map(v=>`<div class="item" data-a="invView" data-id="${v.id}"><div class="grow"><b>فاکتور ${esc(fa(v.num))}</b><small>${dstr(v.dk)} | ${fa(v.items.length)} قلم</small></div><div class="st"><small>جمع خرید</small>${fmt(v.items.reduce((s,i)=>s+i.qty*i.buy,0))}</div></div>`).join(''):empty('هنوز فاکتوری ثبت نشده'));
}
function vDraft(){
  const d=S.draft,ed=!!d.edit;
  const tot=d.items.reduce((s,i)=>s+i.qty*i.buy,0);
  return `<div class="card"><div class="item" style="border:0;box-shadow:none;padding:0;margin:0;background:none"><div class="grow"><h4 style="margin:0">${ed?'اصلاح فاکتور':'فاکتور'} شماره ${esc(fa(d.num))}</h4><small>تاریخ ورود: ${dstr(d.dk)}</small></div><button class="ic sm" data-a="editHead">${ico('edit')}</button></div></div>
  <button class="btn wide cyan" data-a="addItem">${ico('plus')} اضافه کردن کالا</button>`+
  (d.items.length?d.items.map((i,n)=>`<div class="item"><div class="grow" data-a="editItem" data-i="${n}"><b>${esc(i.name)}</b><small>${fa(i.qty)} عدد | خرید ${fmt(i.buy)} | فروش ${fmt(i.sell)}</small></div><button class="ic sm" data-a="editItem" data-i="${n}">${ico('edit')}</button><button class="ic sm" data-a="delItem" data-i="${n}">${ico('trash')}</button></div>`).join('')+`<div class="card"><div class="m"><span>جمع خرید فاکتور</span><b class="cy">${fmt(tot)} تومان</b></div></div>`:empty('کالایی به فاکتور اضافه نشده'))+
  `<div class="row"><button class="btn pink" data-a="cancelInv">${ed?'انصراف':'لغو فاکتور'}</button><button class="btn green" data-a="commitInv">${ed?'ثبت اصلاحات':'ورود فاکتور'}</button></div>`;
}

function vDef(){
  const chips=DB.cats.map(c=>`<span class="chip">${esc(c.name)}</span>`).join('');
  const ep=S.editPid?prod(S.editPid):null;
  const dc=S.defCat&&cat(S.defCat)?S.defCat:'';
  let form=`<select id="fc" ${ep?'disabled':''}><option value="">انتخاب دسته‌بندی...</option>${DB.cats.map(c=>`<option value="${c.id}" ${c.id===dc?'selected':''}>${esc(c.name)}</option>`).join('')}</select>`;
  if(dc){
    form+=`<label>کد کالا</label><div class="sbar"><input id="fcode" value="${esc(ep?ep.code:nextCode())}"><button class="ic" data-a="autoCode">${ico('gen')}</button></div>
    <label>بارکد کالا</label><div class="sbar"><input id="fbar" inputmode="numeric" value="${esc(ep&&ep.barcode||'')}"><button class="ic" data-a="scanBar">${ico('scan')}</button></div>
    <label>نام کالا</label><input id="fname" value="${esc(ep?ep.name:'')}">
    <div class="row">${ep?'<button class="btn pink" data-a="cancelEdit">انصراف</button>':''}<button class="btn cyan" data-a="saveProd">${ep?'ذخیره تغییرات':'ثبت کالا'}</button></div>`;
  }
  const list=dc?DB.products.filter(p=>p.cat===dc).map(p=>`<div class="item"><div class="grow"><b>${esc(p.name)}</b><small>کد: ${esc(fa(p.code))}${p.barcode?' | بارکد: '+esc(fa(p.barcode)):''}</small></div><button class="ic sm" data-a="editProd" data-id="${p.id}">${ico('edit')}</button><button class="ic sm" data-a="delProd" data-id="${p.id}">${ico('trash')}</button></div>`).join(''):'';
  return `<div class="card"><h4>دسته‌بندی‌ها</h4>${chips||empty('هنوز دسته‌بندی ندارید')}
  <label style="margin-top:10px">نام دسته‌بندی جدید</label>
  <div class="sbar"><input id="ncat" placeholder="مثلاً کابل"><button class="ic" data-a="addCat">${ico('plus')}</button></div>
  <button class="btn wide pink" data-a="delCats">${ico('trash',20)} حذف دسته‌بندی</button></div>
  <div class="card"><h4>${ep?'ویرایش کالا':'تعریف کالا'}</h4>${form}</div>
  ${list?`<h4 style="margin:16px 4px 8px;color:var(--a1)">کالاهای این دسته</h4>${list}`:''}`;
}

function vOut(r){
  const y=+r[1],m=+r[2],d=+r[3];
  const sumO=a=>a.reduce((s,o)=>s+o.q*o.unit,0);
  const st=a=>`<div class="st"><small>جمع خروجی</small>${fmt(sumO(a))}</div>`;
  if(!y){
    const ys=[...new Set(DB.outs.map(o=>dY(o.dk)))].sort((a,b)=>b-a);
    let h=ys.length?ys.map(v=>{const a=DB.outs.filter(o=>dY(o.dk)===v);return `<div class="item" data-a="go" data-h="#/out/${v}"><div class="grow"><b>سال ${fa(v)}</b><small>${fa(a.length)} خروج</small></div>${st(a)}</div>`}).join(''):empty('هنوز خروجی ثبت نشده');
    const t=today(),to=DB.outs.filter(o=>o.dk===t).sort((a,b)=>b.ts-a.ts);
    h+=`<div class="card" style="margin-top:16px"><h4>فروش امروز — ${dstr(t)}</h4>`+(to.length?`<div class="m"><span>جمع خروجی امروز</span><b class="cy">${fmt(sumO(to))} تومان</b></div>`+to.map(x=>`<div class="lot"><b>${esc(x.name)}</b><small>کد ${esc(fa(outCode(x)))} | ${fa(x.q)} عدد × ${fmt(x.unit)} | ${esc(x.cust||'مشتری آزاد')}</small></div>`).join(''):`<small>امروز هنوز فروشی ثبت نشده</small>`)+`</div>`;
    return h;
  }
  if(!m){
    const o=DB.outs.filter(x=>dY(x.dk)===y);let h='';
    for(let i=1;i<=12;i++){const a=o.filter(x=>dM(x.dk)===i);if(a.length)h+=`<div class="item" data-a="go" data-h="#/out/${y}/${i}"><div class="grow"><b>${MN[i-1]}</b><small>${fa(a.length)} خروج</small></div>${st(a)}</div>`}
    return h||empty('خروجی‌ای در این سال نیست');
  }
  if(!d){
    const o=DB.outs.filter(x=>dY(x.dk)===y&&dM(x.dk)===m);let h='';
    for(let i=31;i>=1;i--){const a=o.filter(x=>dD(x.dk)===i);if(a.length)h+=`<div class="item" data-a="go" data-h="#/out/${y}/${m}/${i}"><div class="grow"><b>${fa(i)} ${MN[m-1]}</b><small>${fa(a.length)} خروج</small></div>${st(a)}</div>`}
    return h||empty('خروجی‌ای در این ماه نیست');
  }
  const k=y*10000+m*100+d;
  const o=DB.outs.filter(x=>x.dk===k).sort((a,b)=>b.ts-a.ts);
  return o.length?`<div class="card"><div class="m"><span>جمع خروجی این روز</span><b class="cy">${fmt(sumO(o))} تومان</b></div></div>`+o.map(x=>`<div class="item"><div class="grow"><b>${esc(x.name)}</b><small>کد کالا: ${esc(fa(outCode(x)))}</small><small>${fa(x.q)} عدد × ${fmt(x.unit)} | مشتری: ${esc(x.cust||'مشتری آزاد')}</small></div><div class="st"><small>جمع</small>${fmt(x.q*x.unit)}</div><button class="ic sm" data-a="undoOut" data-id="${x.id}">${ico('undo')}</button></div>`).join('')+`<small class="empty" style="display:block">دکمه برگشت، خروج را لغو و کالا را به موجودی برمی‌گرداند</small>`:empty('خروجی‌ای در این روز نیست');
}

function vRep(){
  const ys=allYears();
  if(!S.ry)S.ry=dY(today());if(!S.rm)S.rm=dM(today());
  if(!S.rf)S.rf=dstr(today());if(!S.rto)S.rto=dstr(today());
  const mc=(t,a,showIn)=>`<div class="card"><h4>${t}</h4>${showIn?`<div class="m"><span>جمع ورودی (خرید)</span><b class="cy">${fmt(a.i)}</b></div>`:''}<div class="m"><span>جمع خروجی (فروش)</span><b class="pk">${fmt(a.o)}</b></div><div class="m"><span>سود فروش</span><b class="${a.p<0?'rd':'gr'}">${fmt(a.p)}</b></div></div>`;
  const ysel=`<select id="ry">${ys.map(y=>`<option value="${y}" ${y===S.ry?'selected':''}>${fa(y)}</option>`).join('')}</select>`;
  const msel=`<select id="rm">${MN.map((n,i)=>`<option value="${i+1}" ${i+1===S.rm?'selected':''}>${n}</option>`).join('')}</select>`;
  const tab=(k,t)=>`<button class="${S.rt===k?'on':''}" data-a="rtab" data-k="${k}">${t}</button>`;
  let h=`<div class="tabs">${tab('all','از ابتدا')}${tab('y','سالیانه')}${tab('m','ماهانه')}${tab('d','روزانه')}${tab('r','بازه زمانی')}${tab('f','فاکتور فیزیکی')}</div>`;
  if(S.rt==='all'){
    const a=agg(0,99999999),stV=DB.lots.reduce((s,l)=>s+l.rem*l.buy,0),stQ=a.ni-a.no;
    h+=`<div class="card"><h4>گزارش از ابتدا تاکنون</h4>
    <div class="m"><span>جمع ورود</span><b class="cy">${fa(a.ni)} عدد</b></div><div class="m"><span>مبلغ خرید</span><b>${fmt(a.i)}</b></div>
    <div class="m" style="margin-top:8px"><span>جمع خروج</span><b class="pk">${fa(a.no)} عدد</b></div><div class="m"><span>مبلغ فروش</span><b>${fmt(a.o)}</b></div>
    <div class="m" style="margin-top:8px"><span>جمع موجودی (ورود − خروج)</span><b class="cy">${fa(stQ)} عدد</b></div><div class="m"><span>ارزش موجودی به قیمت خرید</span><b>${fmt(stV)}</b></div>
    <div class="m" style="margin-top:8px"><span>جمع سود</span><b class="${a.p<0?'rd':'gr'}">${fmt(a.p)}</b></div></div>`;
  }else if(S.rt==='y'){
    h+=ys.map(y=>mc('سال '+fa(y),agg(y*10000+101,y*10000+1231),true)).join('');
  }else if(S.rt==='m'){
    h+=ysel;let n=0;
    for(let m=1;m<=12;m++){const a=agg(S.ry*10000+m*100+1,S.ry*10000+m*100+31);if(a.i||a.o){n++;h+=mc(MN[m-1]+' '+fa(S.ry),a,false)}}
    if(!n)h+=empty('گزارشی برای این سال نیست');
  }else if(S.rt==='d'){
    h+=`<div class="row">${ysel}${msel}</div>`;let n=0;
    for(let d=31;d>=1;d--){const k=S.ry*10000+S.rm*100+d;const a=agg(k,k);if(a.o){n++;h+=mc(fa(d)+' '+MN[S.rm-1],a,false)}}
    if(!n)h+=empty('گزارشی برای این ماه نیست');
  }else if(S.rt==='r'){
    h+=`<label>از تاریخ</label><input id="rf" value="${esc(S.rf)}" inputmode="numeric"><label>تا تاریخ</label><input id="rto" value="${esc(S.rto)}" inputmode="numeric"><button class="btn wide cyan" data-a="rrange">نمایش گزارش</button>`;
    const lo=parseD(S.rf),hi=parseD(S.rto);
    if(lo&&hi)h+=mc('از '+dstr(lo)+' تا '+dstr(hi),agg(lo,hi),true);
  }else{
    const inv=[...DB.invoices].sort(byNew);
    h+=inv.length?inv.map(v=>{const n=DB.imgs.filter(m=>m.inv===v.id).length;return `<div class="item" data-a="photos" data-id="${v.id}"><div class="grow"><b>فاکتور ${esc(fa(v.num))}</b><small>${dstr(v.dk)}</small></div><div class="st">${ico('img',20)}<small>${fa(n)} عکس</small></div></div>`}).join(''):empty('ابتدا یک فاکتور ورود ثبت کنید');
  }
  return h;
}

/* ================= مسیریابی ================= */
function render(keep){
  const r=route(),k=r[0]||'stock';let h='',t='',tab=k;
  const y0=window.scrollY;
  if(k==='in'&&r[1]==='new'&&!S.draft){location.replace('#/in');return}
  if(k==='stock'){t='موجودی';h=vStock()}
  else if(k==='cat'){const c=cat(r[1]);t=c?c.name:'دسته‌بندی';h=vCat(r[1]);tab='stock'}
  else if(k==='p'){t='جزئیات کالا';h=vProd(r[1]);tab='stock'}
  else if(k==='in'){if(r[1]==='new'){t=S.draft.edit?'اصلاح فاکتور':'فاکتور جدید';h=vDraft()}else{t='ورود کالا';h=vIn()}}
  else if(k==='def'){t='تعریف کالا';h=vDef()}
  else if(k==='out'){t=r[3]?`خروجی ${fa(r[3])} ${MN[r[2]-1]||''}`:r[2]?`خروجی ${MN[r[2]-1]||''} ${fa(r[1])}`:r[1]?`خروجی سال ${fa(r[1])}`:'خروجی';h=vOut(r)}
  else if(k==='rep'){t='گزارش مالی';h=vRep()}
  else{location.replace('#/stock');return}
  $('#title').textContent=t;$('#view').innerHTML=h;
  document.querySelectorAll('#nav a').forEach(a=>a.classList.toggle('on',a.dataset.t===tab));
  const b=$('#back');
  if(r.length>1){b.innerHTML=`<button class="ic" data-a="back">${ico('back')}</button>`}else b.innerHTML='<img src="logo.png" alt="">';
  window.scrollTo(0,keep===true?y0:0);
}

/* ================= عملیات ================= */
function applyPct(ids,v,b){
  let n=0;
  ids.forEach(id=>{const p=prod(id);if(p&&p.sell!=null){setSell(p,Math.round(p.sell*(1+v/100)));n++}});
  save();closeModal(b);render();toast(`قیمت فروش ${fa(n)} کالا تغییر کرد`);
}
function pctModal(ids,label){
  const b=modal(`<h3>تغییر درصدی قیمت فروش</h3><p class="q">${label}</p><input id="pv" inputmode="decimal" placeholder="مثلاً ۱۰   (برای کاهش: -۱۰)"><div class="row"><button class="btn pink" data-a="close">انصراف</button><button class="btn cyan" id="pok">تایید</button></div>`);
  $('#pok',b).onclick=async()=>{
    const v=num($('#pv',b).value);
    if(isNaN(v)||v<=-100){toast('درصد نامعتبر است',1);return}
    if(!await ask(`قیمت فروش ${fa(ids.length)} کالا ${fa(v)} درصد تغییر کند؟ آیا مطمئن هستید؟`))return;
    applyPct(ids,v,b);
  };
}
function pctCatsModal(){
  if(!DB.cats.length){toast('دسته‌بندی وجود ندارد',1);return}
  const b=modal(`<h3>تغییر درصدی قیمت فروش</h3>
  <label class="chk"><input type="checkbox" id="pall"> انتخاب همه دسته‌بندی‌ها</label>
  ${DB.cats.map(c=>`<label class="chk"><input type="checkbox" class="pc" value="${c.id}"> ${esc(c.name)} <small style="display:inline">(${fa(DB.products.filter(p=>p.cat===c.id).length)} کالا)</small></label>`).join('')}
  <label>درصد تغییر</label><input id="pv" inputmode="decimal" placeholder="مثلاً ۱۰   (برای کاهش: -۱۰)">
  <div class="row"><button class="btn pink" data-a="close">انصراف</button><button class="btn cyan" id="pok">تایید</button></div>`);
  $('#pall',b).onchange=e=>b.querySelectorAll('.pc').forEach(x=>x.checked=e.target.checked);
  $('#pok',b).onclick=async()=>{
    const cs=[...b.querySelectorAll('.pc:checked')].map(x=>x.value);
    if(!cs.length){toast('حداقل یک دسته‌بندی را انتخاب کنید',1);return}
    const v=num($('#pv',b).value);
    if(isNaN(v)||v<=-100){toast('درصد نامعتبر است',1);return}
    const ids=DB.products.filter(p=>cs.includes(p.cat)).map(p=>p.id);
    if(!ids.length){toast('کالایی در دسته‌های انتخابی نیست',1);return}
    if(!await ask(`قیمت فروش ${fa(ids.length)} کالا در ${fa(cs.length)} دسته‌بندی ${fa(v)} درصد تغییر کند؟ آیا مطمئن هستید؟`))return;
    applyPct(ids,v,b);
  };
}
function delCatsModal(){
  const b=modal(`<h3>حذف دسته‌بندی</h3>${DB.cats.length?DB.cats.map(c=>`<div class="item"><div class="grow"><b>${esc(c.name)}</b><small>${fa(DB.products.filter(p=>p.cat===c.id).length)} کالا</small></div><button class="ic sm" data-a="delCat" data-id="${c.id}">${ico('trash')}</button></div>`).join(''):empty('دسته‌بندی‌ای وجود ندارد')}<button class="btn pink wide" data-a="close">بستن</button>`);
  return b;
}
function itemForm(box,p,init,onOk){
  box.innerHTML=`<h3>${esc(p.name)}</h3><small>کد: ${esc(fa(p.code))}</small>
  <label>تعداد کالا</label><input id="iq" inputmode="numeric" value="${init.qty}">
  <label>قیمت خرید (تومان)</label><input class="money" id="ib" inputmode="numeric" value="${init.buy!==''?nf(init.buy):''}">
  <label>قیمت فروش (تومان)</label><input class="money" id="is" inputmode="numeric" value="${init.sell!==''?nf(init.sell):''}">
  <div class="row"><button class="btn pink" data-a="close">انصراف</button><button class="btn cyan" id="iok">تایید</button></div>`;
  $('#iok',box).onclick=()=>{
    const q=num($('#iq',box).value),b=num($('#ib',box).value),s=num($('#is',box).value);
    if(!(q>0)||!Number.isInteger(q)){toast('تعداد نامعتبر است',1);return}
    if(isNaN(b)||b<0||isNaN(s)||s<0){toast('قیمت خرید و فروش را وارد کنید',1);return}
    onOk(q,b,s);closeModal(box);render();
  };
}
function fillA(){
  const q=$('#aq').value,box=$('#ares');
  const l=q.trim()?findP(q):[];
  box.innerHTML=q.trim()?(l.length?l.map(p=>`<div class="item" data-a="pickItem" data-id="${p.id}"><div class="grow"><b>${esc(p.name)}</b><small>کد: ${esc(fa(p.code))}</small></div></div>`).join(''):empty('کالایی پیدا نشد؛ ابتدا در بخش «تعریف» آن را بسازید')):'';
}
async function exportData(){
  const s=JSON.stringify(DB),name='backup-'+today()+'.json';
  const C=window.Capacitor&&window.Capacitor.Plugins;
  try{
    if(C&&C.Filesystem&&C.Share){
      const r=await C.Filesystem.writeFile({path:name,data:s,directory:'CACHE',encoding:'utf8'});
      await C.Share.share({title:'پشتیبان اطلاعات',url:r.uri,dialogTitle:'ذخیره یا ارسال فایل پشتیبان'});
      return;
    }
  }catch(e){}
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([s],{type:'application/json'}));a.download=name;a.click();
}
function importFile(f){
  if(!f)return;
  const r=new FileReader();
  r.onload=async()=>{
    try{
      const d=JSON.parse(r.result);
      if(!d||!Array.isArray(d.cats)||!Array.isArray(d.products)||!Array.isArray(d.lots)||!Array.isArray(d.outs)||!Array.isArray(d.invoices))throw 0;
      if(!await ask('تمام اطلاعات فعلی با فایل پشتیبان جایگزین می‌شود. مطمئن هستید؟'))return;
      DB=fix(d);migrate();save();MD.innerHTML='';render();toast('اطلاعات بازیابی شد');
    }catch(e){toast('فایل پشتیبان معتبر نیست',1)}
  };
  r.readAsText(f);
}
function photosModal(id){
  const v=DB.invoices.find(x=>x.id===id);if(!v)return;
  const ims=DB.imgs.filter(m=>m.inv===id).sort((a,b)=>a.ts-b.ts);
  const b=modal(`<h3>فاکتور ${esc(fa(v.num))}</h3><small>${dstr(v.dk)}</small>
  ${ims.length?`<div class="thumbs">${ims.map(m=>`<img data-img="${m.id}" data-a="viewImg" data-id="${m.id}" data-inv="${id}" alt="">`).join('')}</div>`:empty('هنوز عکسی از فاکتور فیزیکی اضافه نشده')}
  <label class="btn wide green">${ico('img')} افزودن عکس فاکتور<input type="file" id="pfile" data-inv="${id}" accept="image/*" multiple style="display:none"></label>
  <button class="btn wide pink" data-a="close">بستن</button>`);
  fillThumbs(b);
}

const ACT={
  back(){history.length>1?history.back():(location.hash='#/stock')},
  close(d,t){closeModal(t.closest('.box'))},
  go(d){location.hash=d.h},
  open(d){location.hash='#/p/'+d.id},
  openCat(d){location.hash='#/cat/'+d.id},
  copy(d){copyText(d.t)},
  google(d){window.open('https://www.google.com/search?q='+encodeURIComponent(d.t),'_blank')},
  scanSearch(){scan(t=>{S.q=t;$('#sq').value=t;$('#sres').innerHTML=stockBody(t)})},
  pctCats(){pctCatsModal()},
  selAll(){const c=[...document.querySelectorAll('.ck')],on=c.some(x=>!x.checked);c.forEach(x=>x.checked=on)},
  pctSel(){
    const ids=[...document.querySelectorAll('.ck:checked')].map(x=>x.value);
    if(!ids.length){toast('ابتدا کالاها را انتخاب کنید',1);return}
    pctModal(ids,`${fa(ids.length)} کالای انتخاب‌شده`);
  },
  exitP(d){
    const p=prod(d.id),st=stock(d.id);
    const b=modal(`<h3>خروج کالا</h3><b>${esc(p.name)}</b><small>موجودی: ${fa(st)} عدد</small>
    <label>تعداد خروج</label><input id="eq" inputmode="numeric" value="1">
    <label>قیمت نهایی فروش (هر عدد - تومان)</label><input class="money" id="ep" inputmode="numeric" value="${p.sell!=null?nf(p.sell):''}">
    <label>تاریخ خروج</label><input id="ed" inputmode="numeric" value="${dstr(today())}">
    <label>نام و نام خانوادگی مشتری</label><input id="ec" value="مشتری آزاد">
    <div class="row"><button class="btn pink" data-a="close">انصراف</button><button class="btn cyan" id="eok">تایید</button></div>`);
    $('#eok',b).onclick=()=>{
      const q=num($('#eq',b).value),u=num($('#ep',b).value),dk=parseD($('#ed',b).value);
      if(!(q>0)||!Number.isInteger(q)||q>st){toast('تعداد خروج نامعتبر است',1);return}
      if(isNaN(u)||u<0){toast('قیمت فروش را وارد کنید',1);return}
      if(!dk){toast('تاریخ را مثل ۱۴۰۵/۰۸/۰۱ وارد کنید',1);return}
      const cust=$('#ec',b).value.trim()||'مشتری آزاد';
      DB.outs.push(touch({id:uid(),pid:d.id,name:p.name,code:p.code,cat:cat(p.cat)?cat(p.cat).name:'',q,unit:u,cost:0,dk,ts:Date.now(),cust,by:CFG.user||''}));
      save();closeModal(b);render();toast('کالا به بخش خروجی رفت');
    };
  },
  editSell(d){
    const p=prod(d.id);
    const b=modal(`<h3>اصلاح قیمت فروش</h3><b>${esc(p.name)}</b><label>قیمت فروش جدید (تومان)</label><input class="money" id="np" inputmode="numeric" value="${nf(p.sell)}">
    <div class="row"><button class="btn pink" data-a="close">انصراف</button><button class="btn cyan" id="nok">تایید</button></div>`);
    $('#nok',b).onclick=async()=>{
      const v=num($('#np',b).value);
      if(isNaN(v)||v<0){toast('قیمت نامعتبر است',1);return}
      if(!await ask('آیا از تغییر قیمت مطمئن هستید؟'))return;
      setSell(p,v);save();closeModal(b);render();toast('قیمت فروش تغییر کرد');
    };
  },
  newInv(){
    const b=modal(`<h3>افزودن فاکتور</h3><label>شماره فاکتور</label><input id="inum" inputmode="numeric"><label>تاریخ ورود</label><input id="idate" inputmode="numeric" value="${dstr(today())}">
    <div class="row"><button class="btn pink" data-a="close">انصراف</button><button class="btn cyan" id="iok">ادامه</button></div>`);
    $('#iok',b).onclick=()=>{
      const n=digits($('#inum',b).value).trim(),dk=parseD($('#idate',b).value);
      if(!n){toast('شماره فاکتور را وارد کنید',1);return}
      if(!dk){toast('تاریخ را مثل ۱۴۰۵/۰۸/۰۱ وارد کنید',1);return}
      S.draft={num:n,dk,items:[]};closeModal(b);location.hash='#/in/new';
    };
  },
  editHead(){
    const d=S.draft;
    const b=modal(`<h3>شماره و تاریخ فاکتور</h3><label>شماره فاکتور</label><input id="inum" inputmode="numeric" value="${esc(d.num)}"><label>تاریخ ورود</label><input id="idate" inputmode="numeric" value="${dstr(d.dk)}">
    <div class="row"><button class="btn pink" data-a="close">انصراف</button><button class="btn cyan" id="iok">تایید</button></div>`);
    $('#iok',b).onclick=()=>{
      const n=digits($('#inum',b).value).trim(),dk=parseD($('#idate',b).value);
      if(!n||!dk){toast('شماره یا تاریخ نامعتبر است',1);return}
      d.num=n;d.dk=dk;closeModal(b);render();
    };
  },
  invView(d){
    const v=DB.invoices.find(x=>x.id===d.id);if(!v)return;
    modal(`<h3>فاکتور ${esc(fa(v.num))}</h3><small>${dstr(v.dk)}</small>`+v.items.map(i=>`<div class="item"><div class="grow"><b>${esc(i.name)}</b><small>${fa(i.qty)} عدد | خرید ${fmt(i.buy)} | فروش ${fmt(i.sell)}</small></div></div>`).join('')+`<button class="btn wide cyan" data-a="editInv" data-id="${v.id}">${ico('edit',20)} اصلاح فاکتور</button><button class="btn pink wide" data-a="close">بستن</button>`);
  },
  editInv(d,t){
    const v=DB.invoices.find(x=>x.id===d.id);if(!v)return;
    S.draft={edit:v.id,num:v.num,dk:v.dk,items:v.items.map(i=>Object.assign({},i))};
    closeModal(t.closest('.box'));location.hash='#/in/new';
  },
  addItem(){
    modal(`<h3>اضافه کردن کالا</h3><div class="sbar"><input id="aq" placeholder="نام کالا یا کد کالا"><button class="ic" data-a="scanAdd">${ico('scan')}</button></div><div id="ares"></div><button class="btn pink wide" data-a="close">بستن</button>`);
    $('#aq').focus();
  },
  scanAdd(){
    scan(t=>{
      $('#aq').value=t;fillA();
      const ex=DB.products.filter(p=>p.barcode&&norm(p.barcode)===norm(t));
      if(ex.length===1)ACT.pickItem({id:ex[0].id},$('#aq'));
      else if(!findP(t).length)toast('کالایی با این بارکد تعریف نشده',1);
    });
  },
  pickItem(d,t){
    const p=prod(d.id),L=lotsOf(d.id).sort(byNew);
    itemForm(t.closest('.box'),p,{qty:1,buy:L.length?L[0].buy:'',sell:p.sell!=null?p.sell:''},
      (q,b,s)=>S.draft.items.push({pid:d.id,name:p.name,qty:q,buy:b,sell:s}));
  },
  editItem(d){
    const i=S.draft.items[+d.i],p=prod(i.pid)||{name:i.name,code:''};
    const b=modal('');
    itemForm(b,p,{qty:i.qty,buy:i.buy,sell:i.sell},(q,bb,s)=>{i.qty=q;i.buy=bb;i.sell=s});
  },
  delItem(d){S.draft.items.splice(+d.i,1);render()},
  async cancelInv(){if(await ask(S.draft.edit?'از اصلاح فاکتور انصراف می‌دهید؟':'فاکتور لغو شود؟ اطلاعات واردشده حذف می‌شود.')){S.draft=null;location.hash='#/in'}},
  async commitInv(){
    const d=S.draft;
    if(!d.items.length){toast('ابتدا کالا اضافه کنید',1);return}
    if(!await ask(d.edit?'آیا از اصلاح فاکتور مطمئن هستید؟':'آیا از ورود فاکتور مطمئن هستید؟'))return;
    if(!d.edit){
      const id=uid(),ts=Date.now(),items=d.items.map(i=>Object.assign({},i,{lotId:uid()}));
      DB.invoices.push(touch({id,num:d.num,dk:d.dk,ts,items,by:CFG.user||''}));
      items.forEach(i=>{
        DB.lots.push(touch({id:i.lotId,pid:i.pid,invId:id,inv:d.num,dk:d.dk,ts,qty:i.qty,rem:i.qty,buy:i.buy,sell:i.sell}));
        const p=prod(i.pid);if(p)setSell(p,i.sell);
      });
      save();S.draft=null;toast('فاکتور وارد شد');location.hash='#/in';return;
    }
    const v=DB.invoices.find(x=>x.id===d.edit);
    const keep=new Set(d.items.filter(i=>i.lotId).map(i=>i.lotId));
    const mine=DB.lots.filter(l=>l.invId===v.id);
    const pids=new Set([...mine.map(l=>l.pid),...d.items.map(i=>i.pid)]);
    for(const pid of pids){
      const others=DB.lots.filter(l=>l.pid===pid&&l.invId!==v.id).reduce((s,l)=>s+l.qty,0);
      const mineQ=d.items.filter(i=>i.pid===pid).reduce((s,i)=>s+i.qty,0);
      const outQ=DB.outs.filter(o=>o.pid===pid).reduce((s,o)=>s+o.q,0);
      if(others+mineQ<outQ){const p=prod(pid);toast(`تعداد «${p?p.name:''}» کمتر از تعداد خروج‌شده می‌شود؛ این تغییر ممکن نیست`,1);return}
    }
    mine.filter(l=>!keep.has(l.id)).forEach(l=>del('lots',l.id));
    d.items.forEach(i=>{
      const l=i.lotId&&DB.lots.find(x=>x.id===i.lotId);
      if(l){l.qty=i.qty;l.buy=i.buy;l.sell=i.sell;l.dk=d.dk;l.inv=d.num;touch(l)}
      else{i.lotId=uid();DB.lots.push(touch({id:i.lotId,pid:i.pid,invId:v.id,inv:d.num,dk:d.dk,ts:v.ts,qty:i.qty,rem:i.qty,buy:i.buy,sell:i.sell}))}
    });
    v.num=d.num;v.dk=d.dk;v.items=d.items.map(i=>Object.assign({},i));touch(v);
    save();S.draft=null;toast('فاکتور اصلاح شد');location.hash='#/in';
  },
  addCat(){
    const n=$('#ncat').value.trim();
    if(!n){toast('نام دسته‌بندی را وارد کنید',1);return}
    if(DB.cats.some(c=>norm(c.name)===norm(n))){toast('این دسته‌بندی وجود دارد',1);return}
    const c=touch({id:uid(),name:n});DB.cats.push(c);S.defCat=c.id;S.editPid=null;save();render();
  },
  delCats(){delCatsModal()},
  async delCat(d){
    const ps=DB.products.filter(p=>p.cat===d.id);
    if(ps.some(p=>stock(p.id)>0)){toast('این دسته‌بندی موجودی دارد و قابل حذف نیست',1);return}
    if(!await ask(`دسته‌بندی «${esc(cat(d.id).name)}»${ps.length?' و '+fa(ps.length)+' کالای بدون موجودی آن':''} حذف شود؟`))return;
    ps.forEach(p=>del('products',p.id));del('cats',d.id);
    if(S.defCat===d.id)S.defCat=null;
    save();closeModal();delCatsModal();render();
  },
  autoCode(){$('#fcode').value=nextCode()},
  scanBar(){scan(t=>{$('#fbar').value=t})},
  saveProd(){
    const code=digits($('#fcode').value).trim(),bar=digits($('#fbar').value).trim(),name=$('#fname').value.trim();
    if(!code||!name){toast('کد و نام کالا الزامی است',1);return}
    const me=S.editPid;
    if(DB.products.some(p=>p.id!==me&&norm(p.code)===norm(code))){toast('این کد قبلاً استفاده شده',1);return}
    if(bar&&DB.products.some(p=>p.id!==me&&p.barcode&&norm(p.barcode)===norm(bar))){toast('این بارکد قبلاً استفاده شده',1);return}
    if(me){const p=prod(me);p.code=code;p.barcode=bar;p.name=name;touch(p);toast('تغییرات ذخیره شد')}
    else{DB.products.push(touch({id:uid(),cat:S.defCat,code,barcode:bar,name,sell:null,sellHist:[]}));toast('کالا ثبت شد')}
    S.editPid=null;save();render();
  },
  editProd(d){const p=prod(d.id);S.editPid=d.id;S.defCat=p.cat;render()},
  cancelEdit(){S.editPid=null;render()},
  async delProd(d){
    if(stock(d.id)>0){toast('این کالا موجودی دارد و قابل حذف نیست',1);return}
    if(!await ask('این کالا حذف شود؟'))return;
    del('products',d.id);save();render();
  },
  async undoOut(d){
    if(!await ask('این خروج لغو شود و کالا به موجودی برگردد؟'))return;
    del('outs',d.id);save();render();toast('خروج لغو شد');
  },
  rtab(d){S.rt=d.k;render()},
  rrange(){S.rf=$('#rf').value;S.rto=$('#rto').value;if(!parseD(S.rf)||!parseD(S.rto))toast('تاریخ‌ها را مثل ۱۴۰۵/۰۸/۰۱ وارد کنید',1);render()},
  photos(d){photosModal(d.id)},
  async viewImg(d){
    const data=await idb.get(d.id);
    const b=modal(`${data?`<img class="full" src="${data}" alt="">`:empty('این عکس هنوز از سرور دریافت نشده')}<div class="row"><button class="btn pink" data-a="close">بستن</button><button class="btn pink" id="dimg">${ico('trash',20)} حذف عکس</button></div>`);
    $('#dimg',b).onclick=async()=>{
      if(!await ask('این عکس حذف شود؟'))return;
      del('imgs',d.id);try{await idb.del(d.id)}catch(e){}save();closeModal(b);closeModal();photosModal(d.inv);render(true);
    };
  },
  settings(){
    modal(`<img class="logo-s" src="logo.png" alt=""><h3 style="text-align:center">تنظیمات</h3>
    <h5>اتصال به سرور</h5>
    <p class="q" style="font-size:14px;margin:0">با اتصال به سرور، همکاران شما هم با همین اطلاعات به‌صورت آنلاین کار می‌کنند.</p>
    <label>آدرس سرور</label><input id="cu" dir="ltr" placeholder="http://123.45.67.89:3100" value="${esc(CFG.url)}">
    <label>کلید دسترسی</label><input id="ck" dir="ltr" value="${esc(CFG.key)}">
    <label>نام شما (برای ثبت در خروجی‌ها)</label><input id="cn" value="${esc(CFG.user)}">
    <div class="row"><button class="btn pink" data-a="disc">قطع اتصال</button><button class="btn cyan" data-a="conn">${ico('cloud',20)} ذخیره و اتصال</button></div>
    <h5>پشتیبان‌گیری</h5>
    <button class="btn wide pink" data-a="doExport">گرفتن فایل پشتیبان</button>
    <label class="btn wide pink">بازیابی از فایل پشتیبان<input type="file" id="ifile" accept=".json,application/json" style="display:none"></label>
    <button class="btn wide cyan" data-a="close" style="margin-top:12px">بستن</button>`);
  },
  conn(d,t){
    const b=t.closest('.box');
    CFG={url:normUrl($('#cu',b).value),key:$('#ck',b).value.trim(),user:$('#cn',b).value.trim()};
    localStorage.setItem(CK,JSON.stringify(CFG));
    if(!CFG.url||!CFG.key){toast('آدرس سرور و کلید دسترسی را وارد کنید',1);return}
    syncNow(true);
  },
  disc(d,t){
    CFG.url='';CFG.key='';localStorage.setItem(CK,JSON.stringify(CFG));
    setSt('off');closeModal(t.closest('.box'));toast('اتصال قطع شد؛ اطلاعات روی همین گوشی باقی می‌ماند');
  },
  doExport(){exportData()}
};
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-a]');if(!t)return;
  const f=ACT[t.dataset.a];if(f)f(t.dataset,t,e);
});
document.addEventListener('input',e=>{
  const el=e.target,id=el.id;
  if(el.classList.contains('money')){const r=en(el.value).replace(/[^\d]/g,'');el.value=r?Number(r).toLocaleString('en-US'):''}
  else if(id==='sq'){S.q=el.value;$('#sres').innerHTML=stockBody(S.q)}
  else if(id==='aq')fillA();
});
document.addEventListener('change',async e=>{
  const el=e.target,id=el.id;
  if(id==='ry'){S.ry=+el.value;render()}
  else if(id==='rm'){S.rm=+el.value;render()}
  else if(id==='fc'){S.defCat=el.value;S.editPid=null;render()}
  else if(id==='ifile'){importFile(el.files[0])}
  else if(id==='pfile'){
    const inv=el.dataset.inv,files=[...el.files];
    await addPhotos(files,inv);closeModal(el.closest('.box'));photosModal(inv);render(true);
  }
});
window.addEventListener('hashchange',()=>render());

/* ================= شروع ================= */
$('#nav').innerHTML=[['def','تعریف'],['in','ورود'],['stock','موجودی'],['out','خروجی'],['rep','گزارش']].map(([k,t])=>`<a href="#/${k}" data-t="${k}">${ico(k)}${t}</a>`).join('');
$('#setb').innerHTML=ico('set')+'<span class="sd" id="sd"></span>';
try{
  const C=window.Capacitor&&window.Capacitor.Plugins;
  if(C&&C.StatusBar){C.StatusBar.setBackgroundColor({color:'#557782'});C.StatusBar.setStyle({style:'DARK'})}
}catch(e){}
render();
if(CFG.url){setSt('busy');syncNow()}
})();

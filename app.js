/* יחוס משפחת לייטנער – canvas tree (Nov 8 2026 redesign): one canvas, virtualized drawing, detail sheet, zoom viewer. No libraries. */
"use strict";
const D=window.YDATA; const P=D.people, UP=D.up||{}, LM=D.linkm||{};
const ROOT=D.root||"alter";
const cv=document.getElementById("cv"), cx=cv.getContext("2d");
const C={card:"#fffaf0",cardMes:"#fbf4e2",edge:"#d8c6a1",ink:"#24180a",ink2:"#5d4a30",date:"#6b5636",gold:"#a8803c",lineX:"rgba(176,86,63,.55)",sel:"#b08d57"};
const BRC={L:"#7a4b2a",Y:"#7b7436",W:"#2f6b55",S:"#2d5f8a",R:"#a0532f",M:"#5a4a8c",T:"#8c2f3d",H:"#6e5a1f"};
const bc=id=>BRC[(P[id]&&P[id].br)||"L"]||BRC.L;
const MKC={ok:["#5b7a3a","✓"],alt:["#2f6b55","א"],inf:["#c08a2b","≈"],unv:["#a33","?"]};
const RAB=/^(הגה"ק|הגה"צ|הרה"ק|הרה"צ|הגאון|הרב |הרבני|רבי |רבנו|רבינו|האדמו"ר|מרן|הקדוש|רב |ר' .*(אב"ד|רב ))|אב"ד|אדמו"ר|בעל ה|זצ"ל|זי"ע|הי"ד|ראש ישיבה|דיין|מגיד/;
const W=250,H=112,GX=24,RH=190,SIBW=W+14;
const MKN={ok:"באשטעטיגט פון א מקור",alt:"פון אלטר אליין",inf:"אָפּגעלערנט פון מקורות (נישט גלייך געשריבן)",unv:"נישט באשטעטיגט (פון אן אילן / מסורה)"};
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
/* ---------- layout: tidy ancestor tree with contours (root at bottom) ---------- */
const N={}; // id -> {x,y,dep,ch(child in spanning tree),sib:[]}
const kids={}; for(const c in UP){ for(const p of UP[c]||[]) if(p&&P[p]) (kids[p]=kids[p]||[]).push(c); }
const sibsOf={}; for(const id in P){ const a=P[id].sibof; if(a&&P[a]) (sibsOf[a]=sibsOf[a]||[]).push(id); }
const tparents={}; const extra=[]; // extra = cross links (pedigree collapse)
(function span(){ const seen=new Set([ROOT]); let q=[ROOT]; N[ROOT]={dep:0};
  while(q.length){ const nq=[]; for(const id of q){ const u=UP[id]||[]; tparents[id]=[];
      for(let k=0;k<2;k++){ const p=u[k]; if(!p||!P[p]) continue; if(seen.has(p)){ extra.push([id,p]); continue; } seen.add(p); N[p]={dep:N[id].dep+1,ch:id}; tparents[id].push(p); nq.push(p);} }
    q=nq; } })();
// layered layout (Nov 8 redesign): each generation is one row; parents sit over their child, rows packed tight with
// isotonic regression (pool-adjacent-violators) so nothing overlaps and nothing drifts further than it must.
const PITCH=W+GX;
function packRow(items){ // items: [{id,t}] sorted by t -> x
  const n=items.length; const blk=[]; // blocks of {sum,cnt,start}
  for(let i=0;i<n;i++){ let b={sum:items[i].t-i*PITCH,cnt:1,start:i}; blk.push(b);
    while(blk.length>1){ const a=blk[blk.length-2], c=blk[blk.length-1]; if(a.sum/a.cnt<=c.sum/c.cnt) break; a.sum+=c.sum; a.cnt+=c.cnt; blk.pop(); } }
  for(const b of blk){ const q=b.sum/b.cnt; for(let k=b.start;k<b.start+b.cnt;k++) N[items[k].id].x=q+k*PITCH; } }
(function layered(){ N[ROOT].x=0; N[ROOT].y=0; let row=[ROOT]; let d=0;
  while(row.length){ const items=[]; let seq=0;
    for(const id of row){ const n=N[id]; const ps=tparents[id]||[]; const u=UP[id]||[]; n.po=ps.map(p=>[p,0]);
      const fa=ps.includes(u[0])?u[0]:null, mo=ps.includes(u[1])?u[1]:null; const two=fa&&mo;
      const add=(p,t,side)=>{ items.push({id:p,t,seq:seq++}); (sibsOf[p]||[]).forEach((sb,k)=>{ N[sb]={dep:d+1,sibof:p}; items.push({id:sb,t:t+side*(k+1)*PITCH,seq:seq++}); }); };
      if(mo) add(mo,two?n.x-PITCH/2:n.x,-1); if(fa) add(fa,two?n.x+PITCH/2:n.x,1); }
    items.sort((a,b)=>a.t-b.t||a.seq-b.seq); packRow(items); d++;
    for(const it of items){ N[it.id].y=-d*RH; N[it.id].dep=d; }
    row=items.filter(it=>!N[it.id].sibof).map(it=>it.id); } })();
for(const a in sibsOf){ if(N[a]&&N[a].dep===0) sibsOf[a].forEach((sb,k)=>{ N[sb]={x:N[a].x-(k+1)*PITCH,y:0,dep:0,sibof:a}; }); }
const ids=Object.keys(N); const rows={}; let maxDep=0;
for(const id of ids){ const n=N[id]; (rows[n.dep]=rows[n.dep]||[]).push(id); if(n.dep>maxDep) maxDep=n.dep; }
for(const d in rows) rows[d].sort((a,b)=>N[a].x-N[b].x);
let minX=1e9,maxX=-1e9; for(const id of ids){ minX=Math.min(minX,N[id].x-W/2); maxX=Math.max(maxX,N[id].x+W/2); }
/* ---------- text prep (wrapped once, world units) ---------- */
const FN='700 16.5px FRL, "Frank Ruhl Libre", serif', FD='400 12.5px FRL, "Frank Ruhl Libre", serif', FT='italic 400 12.5px FRL, "Frank Ruhl Libre", serif';
function wrap(t,font,maxw,maxl){ cx.font=font; const w=String(t).split(/\s+/); const out=[]; let cur="";
  for(const x of w){ const tr=cur?cur+" "+x:x; if(cx.measureText(tr).width<=maxw) cur=tr; else { if(cur) out.push(cur); cur=x; if(out.length===maxl) break; } }
  if(out.length<maxl&&cur) out.push(cur); if(out.length>maxl) out.length=maxl;
  if(out.length===maxl&&w.join(" ").length>out.join(" ").length+1){ let s=out[maxl-1]; while(s.length>1&&cx.measureText(s+"…").width>maxw) s=s.slice(0,-1); out[maxl-1]=s+"…"; }
  return out; }
const TX={}; function txt(id){ if(TX[id]) return TX[id]; const p=P[id]; const por=por_(id); const tw=por?W-103:W-39;  // keeps text clear of the mark circle and the portrait
  const fit=t=>{ cx.font=FD; if(cx.measureText(t).width<=tw-14) return t; let q=t; while(q.length>2&&cx.measureText(q+"…").width>tw-14) q=q.slice(0,-1); return q+"…"; };
  const fitT=t=>{ cx.font=FT; let q=t; if(cx.measureText(q).width<=tw-14) return q; while(q.length>2&&cx.measureText(q+"…").width>tw-14) q=q.slice(0,-1); return q+"…"; };
  const tl=(p.t||"").replace(/^לויט מסורה( · )?/,""); const rab=RAB.test(p.n||"")||RAB.test(tl);
  return TX[id]={nm:wrap(p.n,FN,tw-6,2),dt:p.d?fit(p.d):"",ti:tl?fitT(tl):"",rab,dtl:1e9,dtc:fit,por}; }
function meds(id){ const p=P[id]; if(p.media) return p.media.map(m=>({f:m.f,k:(m.k||"x")[0],cap:m.cap,cr:m.cr,u:m.u}));
  return (p.md||[]).map((m,i)=>({f:m[0],k:m[1],det:i})); }
function por_(id){ const m=meds(id).find(x=>x.k==="p"); return m||null; }
const isURI=f=>/^data:|\//.test(f)&&!/^[mtz]\//.test(f);
const SRC=(f,tier)=>f.startsWith("data:")?f:/^[mtz]\//.test(f)?tier+f.slice(1):f.includes("/")?f:tier+"/"+f+".jpg";
/* ---------- view state ---------- */
let s=0.9,tx=0,ty=0,dpr=Math.min(2,window.devicePixelRatio||1),vw=0,vh=0,dirty=true,sel=null;
function resize(){ vw=innerWidth; vh=innerHeight; cv.width=Math.round(vw*dpr); cv.height=Math.round(vh*dpr); dirty=true; }
addEventListener("resize",resize); resize();
const clampS=v=>Math.max(0.025,Math.min(3,v));
function req(){ dirty=true; }
/* ---------- images on cards ---------- */
const IMG={}; function img(src){ let o=IMG[src]; if(o) return o.ok?o.im:null; o=IMG[src]={im:new Image(),ok:false}; o.im.decoding="async"; o.im.onload=()=>{o.ok=true;req();}; o.im.src=src; return null; }
/* ---------- draw ---------- */
function rr(x,y,w,h,r){ cx.beginPath(); cx.moveTo(x+r,y); cx.arcTo(x+w,y,x+w,y+h,r); cx.arcTo(x+w,y+h,x,y+h,r); cx.arcTo(x,y+h,x,y,r); cx.arcTo(x,y,x+w,y,r); cx.closePath(); }
function markAt(x,y,m,r){ const k=MKC[m]||MKC.unv; cx.beginPath(); cx.arc(x,y,r,0,7); cx.fillStyle=k[0]; cx.fill();
  cx.fillStyle="#fff"; cx.font='700 '+(r*1.25)+'px system-ui, Roboto, sans-serif'; cx.textAlign="center"; cx.textBaseline="middle"; cx.fillText(k[1],x,y+0.5); }
function crest(x,y,r){ cx.beginPath(); cx.moveTo(x,y-r); cx.lineTo(x+r*0.75,y); cx.lineTo(x,y+r); cx.lineTo(x-r*0.75,y); cx.closePath(); cx.fillStyle=C.gold; cx.fill(); }
function draw(){
  dirty=false; cx.setTransform(dpr,0,0,dpr,0,0); cx.clearRect(0,0,vw,vh);
  const x0=(-tx)/s, x1=(vw-tx)/s, y0=(-ty)/s, y1=(vh-ty)/s;
  const d0=Math.max(0,Math.floor(-y1/RH)-1), d1=Math.min(maxDep,Math.ceil(-y0/RH)+1);
  // gentle generation bands (screen space) + generation numbers
  cx.font='500 11px FRL, serif'; cx.textAlign="right"; cx.textBaseline="middle";
  const step=s<0.08?10:s<0.2?5:1;
  for(let d=d0;d<=d1;d++){ const top=(-d*RH-(RH-H)/2)*s+ty, bot=top+RH*s; if(bot<0||top>vh) continue;
    if(d%2===1){ cx.fillStyle="rgba(150,110,50,.055)"; cx.fillRect(0,top,vw,RH*s); }
    if(d%step===0&&d>0&&s>0.05){ cx.fillStyle="rgba(110,80,35,.55)"; cx.fillText("דור "+d,vw-8,top+11); } }
  cx.setTransform(dpr*s,0,0,dpr*s,dpr*tx,dpr*ty);
  // curved connectors in the parent's family colour
  const lw=Math.max(1.5,1/s); cx.lineWidth=lw; cx.globalAlpha=s<0.1?0.5:0.7;
  for(let d=Math.max(0,d0-1);d<=d1;d++){ const row=rows[d]; if(!row) continue;
    for(const id of row){ const n=N[id]; if(!n.po||!n.po.length) continue;
      for(const [p] of n.po){ const q=N[p]; if(Math.max(q.x,n.x)<x0-W||Math.min(q.x,n.x)>x1+W) continue;
        const ya=n.y, yb=q.y+H, ym=(ya+yb)/2; cx.strokeStyle=bc(p); cx.beginPath(); cx.moveTo(n.x,ya); cx.bezierCurveTo(n.x,ym,q.x,ym,q.x,yb); cx.stroke(); } } }
  cx.globalAlpha=1;
  if(s>0.12){ cx.strokeStyle=C.lineX; cx.lineWidth=Math.max(1.2,1/s); cx.setLineDash([7,5]); cx.beginPath();
    for(const [c,p] of extra){ const a=N[c],b=N[p]; if(!a||!b) continue; if(Math.max(a.x,b.x)<x0||Math.min(a.x,b.x)>x1||Math.max(a.y,b.y)<y0-H||Math.min(a.y,b.y)>y1) continue;
      cx.moveTo(a.x,a.y); cx.bezierCurveTo(a.x,a.y-RH*.6,b.x,b.y+H+RH*.4,b.x,b.y+H); }
    cx.stroke(); cx.setLineDash([]); }
  const lod=s*W; let drawn=0;
  for(let d=d0;d<=d1;d++){ const row=rows[d]; if(!row) continue;
    let lo=0,hi=row.length; while(lo<hi){ const m=(lo+hi)>>1; if(N[row[m]].x+W/2<x0) lo=m+1; else hi=m; }
    for(let i=lo;i<row.length;i++){ const id=row[i], n=N[id]; if(n.x-W/2>x1) break; drawn++; card(id,n,lod); } }
  return drawn; }
function card(id,n,lod){ const p=P[id], x=n.x-W/2, y=n.y, m=p.m||"unv", mes=p.mes, root=id===ROOT, col=bc(id);
  if(lod<34){ cx.fillStyle=C.card; cx.fillRect(x,y,W,H); cx.fillStyle=col; cx.fillRect(x,y,W,14); if(id===sel){cx.strokeStyle=C.sel;cx.lineWidth=3/s;cx.strokeRect(x,y,W,H);} return; }
  cx.fillStyle="rgba(80,55,20,.10)"; rr(x+1,y+3,W,H,10); cx.fill();   // soft shadow (no blur)
  rr(x,y,W,H,10); cx.fillStyle=mes?C.cardMes:root?"#fffdf5":C.card; cx.fill();
  cx.lineWidth=Math.max(1,0.9/s); cx.strokeStyle=id===sel?C.sel:root?C.gold:C.edge; if(mes) cx.setLineDash([5,4]); cx.stroke(); cx.setLineDash([]);
  if(id===sel||root){ cx.lineWidth=Math.max(2,2/s); cx.strokeStyle=C.sel; rr(x-2,y-2,W+4,H+4,12); cx.stroke(); }
  // family-colour top edge
  cx.save(); rr(x,y,W,H,10); cx.clip(); cx.fillStyle=col; cx.fillRect(x,y,W,root?7:5); cx.restore();
  if(lod<75){ cx.fillStyle=C.ink; cx.font='700 34px FRL, serif'; cx.textAlign="center"; cx.textBaseline="middle"; cx.direction="rtl"; const t=txt(id).nm[0]||""; cx.fillText(t.length>11?t.slice(0,11)+"…":t,n.x,y+H/2+3); cx.direction="ltr"; markAt(x+16,y+20,m,10); return; }
  const T=txt(id); let rx=x+W-13;
  if(T.por){ const R=27, pcx=x+W-13-R, pcy=y+14+R+4;
    if(lod>105){ const im=img(SRC(T.por.f,"m")); cx.save(); cx.beginPath(); cx.arc(pcx,pcy,R,0,7); cx.closePath(); cx.clip();
      if(im){ const r=Math.max(2*R/im.width,2*R/im.height); cx.drawImage(im,pcx-im.width*r/2,pcy-R-(im.height*r-2*R)*0.2,im.width*r,im.height*r); } else { cx.fillStyle="#efe5cf"; cx.fill(); }
      cx.restore(); cx.beginPath(); cx.arc(pcx,pcy,R,0,7); cx.lineWidth=Math.max(1.2,1/s); cx.strokeStyle=col; cx.stroke(); }
    rx=x+W-13-2*R-10; }
  cx.direction="rtl"; cx.textAlign="right"; cx.textBaseline="alphabetic";
  let yy=y+28; if(T.rab&&!mes){ crest(rx-4,yy-6,4.2); }
  cx.fillStyle=C.ink; cx.font=FN; const off=T.rab&&!mes?12:0;
  T.nm.forEach((l,k)=>{ cx.fillText(l,rx-(k===0?off:0),yy); yy+=20; });
  if(mes){ cx.font='600 11.5px FRL, serif'; cx.fillStyle=C.gold; cx.fillText("לויט מסורה",rx,yy+1); yy+=17; }
  else if(T.ti){ cx.font=FT; cx.fillStyle=T.rab?C.gold:C.ink2; cx.fillText(T.ti,rx,yy+1); yy+=17; }
  if(T.dt){ cx.font=FD; cx.fillStyle=C.date; cx.fillText(T.dt,rx,Math.min(yy+2,y+H-10)); }
  cx.direction="ltr";
  markAt(x+18,y+21,m,10.5); }
let raf=0; function loop(){ raf=requestAnimationFrame(loop); if(inertia()) dirty=true; if(dirty) draw(); }
/* ---------- gestures: pan with inertia, pinch, wheel, tap, double-tap ---------- */
const ptr=new Map(); let vx=0,vy=0,lastT=0,moved=0,pinch=null,downAt=0,lastTap=0,anim=null;
function inertia(){ if(anim) return anim(); if(ptr.size||(Math.abs(vx)<0.02&&Math.abs(vy)<0.02)) return false; const now=performance.now(), dt=Math.min(40,now-lastT); lastT=now; tx+=vx*dt; ty+=vy*dt; const f=Math.pow(0.94,dt/16); vx*=f; vy*=f; return true; }
cv.addEventListener("pointerdown",e=>{ cv.setPointerCapture(e.pointerId); ptr.set(e.pointerId,{x:e.clientX,y:e.clientY}); vx=vy=0; anim=null; moved=0; downAt=performance.now(); lastT=downAt;
  if(ptr.size===2){ const [a,b]=[...ptr.values()]; pinch={d:Math.hypot(a.x-b.x,a.y-b.y),mx:(a.x+b.x)/2,my:(a.y+b.y)/2,s0:s}; } },{passive:true});
cv.addEventListener("pointermove",e=>{ const o=ptr.get(e.pointerId); if(!o) return; const nx=e.clientX, ny=e.clientY;
  if(ptr.size===1){ const dx=nx-o.x, dy=ny-o.y; tx+=dx; ty+=dy; moved+=Math.abs(dx)+Math.abs(dy); const now=performance.now(), dt=Math.max(1,now-lastT); vx=0.8*dx/dt+0.2*vx; vy=0.8*dy/dt+0.2*vy; lastT=now; }
  o.x=nx; o.y=ny;
  if(ptr.size===2&&pinch){ const [a,b]=[...ptr.values()]; const d=Math.hypot(a.x-b.x,a.y-b.y), mx=(a.x+b.x)/2, my=(a.y+b.y)/2;
    const ns=clampS(pinch.s0*d/pinch.d); const wx=(pinch.mx-tx)/s, wy=(pinch.my-ty)/s; s=ns; tx=mx-wx*s; ty=my-wy*s; pinch.mx=mx; pinch.my=my; moved+=99; }
  dirty=true; },{passive:true});
function up(e){ const had=ptr.has(e.pointerId); ptr.delete(e.pointerId); if(ptr.size<2) pinch=null; if(ptr.size===1){ vx=vy=0; }
  if(!had||ptr.size) return; const now=performance.now(); if(now-lastT>60){ vx=vy=0; } lastT=now;
  if(moved<10&&now-downAt<500){ vx=vy=0; const id=hit(e.clientX,e.clientY);
    if(id){ openSheet(id); } else if(now-lastTap<320){ zoomTo(e.clientX,e.clientY,Math.min(3,s*2.2)); } lastTap=now; } }
cv.addEventListener("pointerup",up,{passive:true}); cv.addEventListener("pointercancel",up,{passive:true});
cv.addEventListener("wheel",e=>{ e.preventDefault(); const f=Math.exp(-e.deltaY*(e.ctrlKey?0.01:0.0018)); const ns=clampS(s*f); const wx=(e.clientX-tx)/s, wy=(e.clientY-ty)/s; s=ns; tx=e.clientX-wx*s; ty=e.clientY-wy*s; dirty=true; },{passive:false});
function hit(sx,sy){ const wx=(sx-tx)/s, wy=(sy-ty)/s; const d=Math.round(-(wy-H/2)/RH); const row=rows[d]; if(!row) return null; if(wy<-d*RH-6||wy>-d*RH+H+6) return null;
  for(const id of row){ const n=N[id]; if(wx>=n.x-W/2-4&&wx<=n.x+W/2+4) return id; } return null; }
function animTo(ns,ntx,nty,ms){ const s0=s,x0=tx,y0=ty,t0=performance.now(); vx=vy=0;
  anim=()=>{ let k=Math.min(1,(performance.now()-t0)/ms); k=1-Math.pow(1-k,3); s=s0+(ns-s0)*k; tx=x0+(ntx-x0)*k; ty=y0+(nty-y0)*k; if(k>=1) anim=null; return true; }; }
function zoomTo(sx,sy,ns){ const wx=(sx-tx)/s, wy=(sy-ty)/s; animTo(ns,sx-wx*ns,sy-wy*ns,380); }
function focus(id,ns){ const n=N[id]; if(!n) return; ns=ns||Math.max(s,0.75); const sheetUp=document.getElementById("sheet").classList.contains("on")&&vw<820;
  animTo(ns,vw/2-n.x*ns,(sheetUp?vh*0.2:vh*0.55)-(n.y+H/2)*ns,600); }
function home(){ const n=N[ROOT]; const ns=Math.min(1,vw/(2*PITCH+30)); s=ns; tx=vw/2-n.x*s; ty=vh*0.78-(n.y+H/2)*s; dirty=true; }
document.getElementById("home").onclick=()=>{ const n=N[ROOT]; const ns=Math.min(1,vw/(2*PITCH+30)); animTo(ns,vw/2-n.x*ns,vh*0.78-(n.y+H/2)*ns,650); };
/* ---------- detail sheet ---------- */
const DET={}; const nch=D.nch||32;
function bucket(id){ let h=5381; for(let i=0;i<id.length;i++) h=(Math.imul(h,33)+id.charCodeAt(i))>>>0; return h%nch; }
function details(id){ const p=P[id]; if(p.x!==undefined||p.src!==undefined||p.media) return Promise.resolve(p);
  const b=bucket(id); if(!DET[b]) DET[b]=fetch("d/"+String(b).padStart(2,"0")+".json").then(r=>r.json()).catch(()=>({}));
  return DET[b].then(c=>Object.assign({},p,c[id]||{})); }
const sheet=document.getElementById("sheet"), sb=document.getElementById("sb");
const nameLink=id=>P[id]?`<a href="#" data-go="${esc(id)}">${esc(P[id].n)}</a>`:"";
let curMed=[];
function openSheet(id){ sel=id; dirty=true; const p=P[id]; sheet.style.setProperty("--bc",bc(id));
  sb.innerHTML=head(id,p)+`<div class="ld">…</div>`; sheet.classList.add("on"); sheet.setAttribute("aria-hidden","false"); sheet.scrollTop=0;
  if(vw<820){ const n=N[id]; const yS=(n.y+H/2)*s+ty; if(yS>vh*0.3) animTo(s,tx,ty-(yS-vh*0.2),420); }
  details(id).then(q=>{ if(sel!==id) return; sb.innerHTML=head(id,q)+body(id,q); wire(id); }); }
function head(id,p){ const m=p.m||"unv"; return (p.mes?`<div class="mesl">לויט מסורה</div>`:"")+`<h1>${esc(p.n)}</h1>`+(p.t&&p.t!=="לויט מסורה"?`<p class="ti">${esc(p.t.replace(/^לויט מסורה · /,""))}</p>`:"")+
  ((p.d||p.pl)?`<p class="meta">${esc([p.d,p.pl].filter(Boolean).join(" · "))}</p>`:"")+`<div class="mark"><span class="dot ${m}">${(MKC[m]||MKC.unv)[1]}</span>${esc(MKN[m]||"")}</div>`; }
function body(id,p){ let h=""; const u=UP[id]||[];
  const ms=(p.media||[]).length?p.media.map(x=>({f:x.f,cap:x.cap,cr:x.cr,u:x.u})):[]; curMed=ms;
  if(ms.length) h+=`<div class="gal">`+ms.map((x,i)=>`<figure data-i="${i}"><img loading="lazy" decoding="async" src="${esc(SRC(x.f,"t"))}" alt=""><figcaption>${esc(x.cap||"")}</figcaption></figure>`).join("")+`</div><div class="gn">${ms.length>1?ms.length+" בילדער · ":""}טאפ פאר פולער גרייס</div>`;
  h+=`<div class="fam">`; if(u[0]&&P[u[0]]) h+=`<div><b>טאטע</b><span>${nameLink(u[0])}</span></div>`; if(u[1]&&P[u[1]]) h+=`<div><b>מאמע</b><span>${nameLink(u[1])}</span></div>`;
  const ks=(kids[id]||[]).filter(c=>P[c]); if(ks.length) h+=`<div><b>קינדער</b><span>${ks.map(nameLink).join(" · ")}</span></div>`;
  const sp=[]; for(const c of ks){ const cu=UP[c]||[]; const o=cu[0]===id?cu[1]:cu[0]; if(o&&P[o]&&!sp.includes(o)) sp.push(o); } if(sp.length) h+=`<div><b>זיווג</b><span>${sp.map(nameLink).join(" · ")}</span></div>`;
  if(p.sibof&&P[p.sibof]) h+=`<div><b>געשוויסטער</b><span>${nameLink(p.sibof)}</span></div>`; const ss=(sibsOf[id]||[]); if(ss.length) h+=`<div><b>געשוויסטער</b><span>${ss.map(nameLink).join(" · ")}</span></div>`;
  h+=`</div>`;
  const lm=LM[id]; if(lm&&lm[1]) h+=`<p class="note2">${esc(lm[1])}</p>`;
  if(p.inhw) h+=`<p class="note2">${esc(p.inhw)}</p>`;
  if(p.x) h+=`<div class="tx">${esc(p.x)}</div>`;
  if(p.src) h+=`<div class="src">${esc(p.src)}</div>`;
  if((p.links||[]).length) h+=`<div class="lk">`+p.links.map(l=>`<a href="${esc(l.u)}" target="_blank" rel="noopener">${esc(l.t||"מקור")} ↗</a>`).join("")+`</div>`;
  return h; }
function wire(id){ sb.querySelectorAll("[data-go]").forEach(a=>a.onclick=ev=>{ ev.preventDefault(); const t=a.dataset.go; if(N[t]) focus(t); openSheet(t); });
  sb.querySelectorAll(".gal figure").forEach(f=>f.onclick=()=>openZoom(+f.dataset.i)); }
function closeSheet(){ sheet.classList.remove("on"); sheet.setAttribute("aria-hidden","true"); sel=null; dirty=true; }
document.getElementById("sx").onclick=closeSheet;
(function sheetDrag(){ let y0=null,dy=0; const g=document.getElementById("grab");
  sheet.addEventListener("touchstart",e=>{ if(sheet.scrollTop>0) return; y0=e.touches[0].clientY; dy=0; },{passive:true});
  sheet.addEventListener("touchmove",e=>{ if(y0==null) return; dy=e.touches[0].clientY-y0; if(dy>0&&sheet.scrollTop<=0){ sheet.style.transition="none"; sheet.style.transform=`translateY(${dy}px)`; } },{passive:true});
  sheet.addEventListener("touchend",()=>{ if(y0==null) return; sheet.style.transition=""; sheet.style.transform=""; if(dy>90) closeSheet(); y0=null; },{passive:true}); })();
/* ---------- zoom viewer: pinch, double-tap, pan, swipe, close ---------- */
const zv=document.getElementById("zv"), zi=document.getElementById("zi"), zst=document.getElementById("zst");
let zI=0,zs=1,zx=0,zy=0,zb=1,iw=1,ih=1;
function zApply(){ zi.style.transform=`translate3d(${zx}px,${zy}px,0) scale(${zs})`; }
function zFit(){ const W_=innerWidth,H_=innerHeight; zb=Math.min(W_/iw,H_/ih); zs=zb; zx=(W_-iw*zs)/2; zy=(H_-ih*zs)/2; zApply(); }
function openZoom(i){ zI=(i+curMed.length)%curMed.length; const m=curMed[zI]; zv.classList.add("on"); zv.setAttribute("aria-hidden","false");
  document.getElementById("zc").textContent=(m.cap||"")+(m.cr?" — "+m.cr:""); document.getElementById("zn").textContent=curMed.length>1?(zI+1)+" / "+curMed.length:"";
  const t=SRC(m.f,"t"); zi.onload=null; zi.src=t; const go=()=>{ iw=zi.naturalWidth||1; ih=zi.naturalHeight||1; zFit(); }; if(zi.complete) go(); else zi.onload=go;
  const full=SRC(m.f,"z"); if(full!==t){ const im=new Image(); im.onload=()=>{ if(curMed[zI]!==m||!im.naturalWidth) return; const go2=()=>{ const f=iw/im.naturalWidth; iw=im.naturalWidth; ih=im.naturalHeight; zs*=f; zb*=f; zApply(); }; zi.onload=null; zi.src=full; if(zi.complete) go2(); else zi.onload=go2; }; im.src=full; } }
function closeZoom(){ zv.classList.remove("on"); zv.setAttribute("aria-hidden","true"); }
document.getElementById("zx").onclick=closeZoom;
(function zg(){ const zp=new Map(); let pz=null,sx0=0,sy0=0,t0=0,mv=0,lastTap=0,swipe=0;
  const clamp=()=>{ const W_=innerWidth,H_=innerHeight, w=iw*zs, h=ih*zs; zx=w<=W_?(W_-w)/2:Math.min(0,Math.max(W_-w,zx)); zy=h<=H_?(H_-h)/2:Math.min(0,Math.max(H_-h,zy)); };
  zst.addEventListener("pointerdown",e=>{ zst.setPointerCapture(e.pointerId); zp.set(e.pointerId,{x:e.clientX,y:e.clientY}); zi.style.transition="none";
    if(zp.size===1){ sx0=e.clientX; sy0=e.clientY; t0=performance.now(); mv=0; swipe=0; }
    if(zp.size===2){ const [a,b]=[...zp.values()]; pz={d:Math.hypot(a.x-b.x,a.y-b.y),s0:zs,mx:(a.x+b.x)/2,my:(a.y+b.y)/2}; } },{passive:true});
  zst.addEventListener("pointermove",e=>{ const o=zp.get(e.pointerId); if(!o) return; const dx=e.clientX-o.x, dy=e.clientY-o.y; o.x=e.clientX; o.y=e.clientY; mv+=Math.abs(dx)+Math.abs(dy);
    if(zp.size===2&&pz){ const [a,b]=[...zp.values()]; const d=Math.hypot(a.x-b.x,a.y-b.y), mx=(a.x+b.x)/2, my=(a.y+b.y)/2; const ns=Math.max(zb*0.8,Math.min(zb*8,pz.s0*d/pz.d));
      const wx=(pz.mx-zx)/zs, wy=(pz.my-zy)/zs; zs=ns; zx=mx-wx*zs; zy=my-wy*zs; pz.mx=mx; pz.my=my; zApply(); return; }
    if(zp.size===1){ if(zs<=zb*1.02){ swipe=e.clientX-sx0; const sv=e.clientY-sy0; if(Math.abs(sv)>Math.abs(swipe)&&sv>0){ zi.style.transform=`translate3d(${zx}px,${zy+sv}px,0) scale(${zs})`; zv.style.background=`rgba(0,0,0,${Math.max(.3,1-sv/400)})`; } else zi.style.transform=`translate3d(${zx+swipe}px,${zy}px,0) scale(${zs})`; }
      else { zx+=dx; zy+=dy; zApply(); } } },{passive:true});
  const end=e=>{ if(!zp.has(e.pointerId)) return; zp.delete(e.pointerId); if(zp.size<2) pz=null; if(zp.size) return;
    const dt=performance.now()-t0, dX=e.clientX-sx0, dY=e.clientY-sy0; zv.style.background="";
    if(mv<10&&dt<300){ const now=performance.now(); if(now-lastTap<300){ zi.style.transition="transform .25s ease"; if(zs>zb*1.05){ zFit(); } else { const ns=zb*2.6; const wx=(e.clientX-zx)/zs, wy=(e.clientY-zy)/zs; zs=ns; zx=e.clientX-wx*zs; zy=e.clientY-wy*zs; clamp(); zApply(); } lastTap=0; return; } lastTap=now; return; }
    if(zs<=zb*1.02){ if(dY>110&&Math.abs(dY)>Math.abs(dX)){ closeZoom(); zApply(); return; }
      if(Math.abs(dX)>70&&curMed.length>1){ openZoom(zI+(dX<0?1:-1)); return; } zi.style.transition="transform .2s ease"; zFit(); return; }
    zi.style.transition="transform .18s ease"; clamp(); zApply(); };
  zst.addEventListener("pointerup",end,{passive:true}); zst.addEventListener("pointercancel",end,{passive:true});
  zst.addEventListener("wheel",e=>{ e.preventDefault(); const ns=Math.max(zb,Math.min(zb*8,zs*Math.exp(-e.deltaY*0.002))); const wx=(e.clientX-zx)/zs, wy=(e.clientY-zy)/zs; zs=ns; zx=e.clientX-wx*zs; zy=e.clientY-wy*zs; zApply(); },{passive:false});
  addEventListener("resize",()=>{ if(zv.classList.contains("on")) zFit(); }); })();
addEventListener("keydown",e=>{ if(e.key==="Escape"){ if(zv.classList.contains("on")) closeZoom(); else closeSheet(); } else if(zv.classList.contains("on")&&(e.key==="ArrowLeft"||e.key==="ArrowRight")) openZoom(zI+(e.key==="ArrowLeft"?1:-1)); });
/* ---------- start: centred on Alter at a readable zoom ---------- */
home(); loop();
(function fromHash(){ const h=decodeURIComponent(location.hash.slice(1)); if(!h) return; const [id,z]=h.split("/"); if(!P[id]) return; if(N[id]) focus(id,Math.max(0.75,s)); openSheet(id);
  if(z&&z[0]==="z") details(id).then(()=>setTimeout(()=>openZoom(+z.slice(1)||0),120)); })();
if(document.fonts&&document.fonts.load){ document.fonts.load(FN).then(()=>{ for(const k in TX) delete TX[k]; dirty=true; }); }
window.__yt={N,rows,maxDep,draw,s:()=>s,focus,openSheet,openZoom,home};

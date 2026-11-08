/* יחוס משפחת לייטנער – canvas tree (Nov 8 2026 redesign): one canvas, virtualized drawing, detail sheet, zoom viewer. No libraries. */
"use strict";
const D=window.YDATA; const P=D.people, UP=D.up||{}, LM=D.linkm||{};
const ROOT=D.root||"alter";
/* settings (Alter Nov 8 6:27 PM): by default only the direct line up (parents, grandparents and higher); siblings behind ⚙ */
const SETK="yichus_settings_v1"; const SET=(()=>{ let o={}; try{ o=JSON.parse(localStorage.getItem(SETK)||"{}")||{}; }catch(e){} return {sibs:!!o.sibs}; })();
function saveSet(){ try{ localStorage.setItem(SETK,JSON.stringify(SET)); }catch(e){} }
const cv=document.getElementById("cv"), cx=cv.getContext("2d");
const C={card:"#fffaf0",cardMes:"#fbf4e2",edge:"#d8c6a1",ink:"#24180a",ink2:"#5d4a30",date:"#6b5636",gold:"#a8803c",lineX:"rgba(176,86,63,.28)",sel:"#b08d57"};
const BRC={L:"#7a4b2a",Y:"#7b7436",W:"#2f6b55",S:"#2d5f8a",R:"#a0532f",M:"#5a4a8c",T:"#8c2f3d",H:"#6e5a1f",K:"#0e7f8a",V:"#55606f",G:"#7d5a78"};
const bc=id=>BRC[(P[id]&&P[id].br)||"L"]||BRC.L;
const MKC={ok:["#5b7a3a","✓"],alt:["#2f6b55","א"],inf:["#c08a2b","≈"],unv:["#a33","?"]};
const RAB=/^(הגה"ק|הגה"צ|הרה"ק|הרה"צ|הגאון|הרב |הרבני|רבי |רבנו|רבינו|האדמו"ר|מרן|הקדוש|רב |ר' .*(אב"ד|רב ))|אב"ד|אדמו"ר|בעל ה|זצ"ל|זי"ע|הי"ד|ראש ישיבה|דיין|מגיד/;
const W=250,H=158,GX=90,GG=150,RH=H+240,SIBW=W+GX;  // Alter 12:53: much more room so every line can be followed  // Alter 11:05: the first site's spacing (card 250 wide, 120 between generations, 34–40 between cards)
const MKN={ok:"באשטעטיגט פון א מקור",alt:"פון אלטר אליין",inf:"אָפּגעלערנט פון מקורות (נישט גלייך געשריבן)",unv:"נישט באשטעטיגט (פון אן אילן / מסורה)"};
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
/* ---------- layout: tidy ancestor tree with contours (root at bottom) ---------- */
const N={}; // id -> {x,y,dep,ch(child in spanning tree),sib:[]}
const kids={}; for(const c in UP){ for(const p of UP[c]||[]) if(p&&P[p]) (kids[p]=kids[p]||[]).push(c); }
const SIBALL={}; for(const id in P){ const a=P[id].sibof; if(a&&P[a]) (SIBALL[a]=SIBALL[a]||[]).push(id); }
const sibsOf=SET.sibs?SIBALL:{};  // hidden siblings take no room: the layout re-flows without them
const tparents={}; const extra=[]; // extra = cross links (pedigree collapse)
(function span(){ const seen=new Set([ROOT]); let q=[ROOT]; N[ROOT]={dep:0};
  while(q.length){ const nq=[]; for(const id of q){ const u=UP[id]||[]; tparents[id]=[];
      for(let k=0;k<2;k++){ const p=u[k]; if(!p||!P[p]) continue; if(seen.has(p)){ extra.push([id,p]); continue; } seen.add(p); N[p]={dep:N[id].dep+1,ch:id}; tparents[id].push(p); nq.push(p);} }
    q=nq; } })();
// subtree-centred layout (Alter 12:53 + root 17:55): each couple sits directly above its child; contours keep every
// subtree apart (GX inside a family, GX+GG between families), so lines run straight and never cross or pass behind a card.
const PITCH=W+GX;
function lay(id){
  // Alter's mother (Tarim line, Nov 8 evening): she sits right beside his father (father stays directly above Alter);
  // her own line goes up from her card and runs out past the father's tree in the lane just above her row.
  if(id===ROOT){ const u0=UP[id]||[], ps0=tparents[id]||[];
    if(u0[0]&&u0[1]&&ps0.includes(u0[0])&&ps0.includes(u0[1])){
      const cF=lay(u0[0]), cM=lay(u0[1]); const offM=Math.min(-PITCH, cF.l[0]-GX-cM.r[0]); let dl=0;
      for(let d=1;d<Math.min(cF.l.length,cM.r.length);d++) dl=Math.min(dl, cF.l[d]-(GX+GG)-cM.r[d]-offM);
      N[u0[1]].po=(N[u0[1]].po||[]).map(([p,o])=>[p,o+dl]); N[u0[1]].lof=0.3;
      N[id].sw=0; N[id].po=[[u0[1],offM],[u0[0],0]];
      const res={l:[-W/2],r:[W/2]}; const L=Math.max(cF.l.length,cM.l.length);
      for(let d=0;d<L;d++){ const sh=d===0?offM:offM+dl; const fl=cF.l[d], ml=cM.l[d], fr=cF.r[d], mr=cM.r[d];
        res.l.push(Math.min(fl==null?1e12:fl, ml==null?1e12:ml+sh)); res.r.push(Math.max(fr==null?-1e12:fr, mr==null?-1e12:mr+sh)); }
      return res; } }
  const ps=tparents[id]||[]; const u=UP[id]||[]; const ns=(sibsOf[id]||[]).length;
  const own={l:[-W/2-(u[1]===id?0:0)], r:[W/2]};
  // siblings sit beside the anchor, on the side away from its spouse: extend the anchor's own contour
  const sw=ns*SIBW; N[id].sw=sw;
  if(!ps.length){ N[id].po=[]; return {l:[-W/2-sw], r:[W/2]}; }
  const fa=ps.includes(u[0])?u[0]:null, mo=ps.includes(u[1])?u[1]:null;
  const ord=[mo,fa].filter(Boolean); const cs=ord.map(lay); const off=[0];
  let acc={l:cs[0].l.slice(),r:cs[0].r.slice()};
  for(let k=1;k<cs.length;k++){ const c=cs[k]; let sh=-1e12; const m=Math.min(acc.r.length,c.l.length);
    for(let d=0;d<m;d++) sh=Math.max(sh,acc.r[d]-c.l[d]+(d===0?GX:GX+GG)); if(sh<-1e11) sh=W+GX;
    off.push(sh); const L=Math.max(acc.l.length,c.l.length); const nl=[],nr=[];
    for(let d=0;d<L;d++){ const al=acc.l[d], cl=c.l[d]; nl.push(al==null?cl+sh:cl==null?al:Math.min(al,cl+sh)); const ar=acc.r[d], cr=c.r[d]; nr.push(ar==null?cr+sh:cr==null?ar:Math.max(ar,cr+sh)); }
    acc={l:nl,r:nr}; }
  const mid=(off[0]+off[off.length-1])/2;
  N[id].po=ord.map((p,k)=>[p,off[k]-mid]);
  const res={l:[-W/2-sw],r:[W/2]}; for(let d=0;d<acc.l.length;d++){ res.l.push(acc.l[d]-mid); res.r.push(acc.r[d]-mid); }
  return res; }
lay(ROOT);
(function place(){ const st=[[ROOT,0]]; while(st.length){ const [id,x]=st.pop(); const n=N[id]; n.x=x; n.y=-n.dep*RH; for(const [p,o] of n.po||[]) st.push([p,x+o]); } })();
for(const a in sibsOf){ if(!N[a]||N[a].sibof) continue; sibsOf[a].forEach((sb,k)=>{ N[sb]={x:N[a].x-(k+1)*SIBW,y:N[a].y,dep:N[a].dep,sibof:a}; }); }
// Alter's own family (Alter 12:55): his wife beside him (to his left), their children one row below, centred under the couple
const FAM=D.fam||null, KIDS=[]; let minDep=0;
if(FAM&&N[ROOT]){ const a=N[ROOT]; const sp=FAM.sp&&P[FAM.sp]?FAM.sp:null; if(sp) N[sp]={x:a.x-PITCH,y:a.y,dep:0,spof:ROOT,po:[]};
  const ks=(FAM.kids||[]).filter(k=>P[k]); const mx=sp?a.x-PITCH/2:a.x;
  ks.forEach((k,i)=>{ N[k]={x:mx+(i-(ks.length-1)/2)*PITCH,y:a.y+RH,dep:-1,po:[],kid:1}; KIDS.push(k); }); if(ks.length) minDep=-1; }
const ids=Object.keys(N); const rows={}; let maxDep=0;
for(const id of ids){ const n=N[id]; (rows[n.dep]=rows[n.dep]||[]).push(id); if(n.dep>maxDep) maxDep=n.dep; }
for(const d in rows) rows[d].sort((a,b)=>N[a].x-N[b].x);
let minX=1e9,maxX=-1e9; for(const id of ids){ minX=Math.min(minX,N[id].x-W/2); maxX=Math.max(maxX,N[id].x+W/2); }
/* ---------- each person once (Alter Nov 8 1:43 PM): an ancestor reached through several lines is ONE card; every
   further line of descent is routed into that card as its own clean orthogonal path (child -> lane -> free column
   between cards -> lane under the parent -> up). Only when the parent is very far across the tree does the child get a
   small dashed "זעה אויבן ⟵" stub that flies to the real card. ---------- */
const GAP=RH-H, XM=24, STUBX=PITCH*60; const XR=[], STUBS=[], SIBL=[];
function freeAt(x,dlo,dhi){ for(let d=dlo;d<=dhi;d++){ const row=rows[d]; if(!row) continue; let lo=0,hi=row.length;
    while(lo<hi){ const m=(lo+hi)>>1; if(N[row[m]].x+W/2+XM<x) lo=m+1; else hi=m; }
    if(lo<row.length&&N[row[lo]].x-W/2-XM<=x) return false; } return true; }
(function routes(){ const used={}, intoP={}; const TR={}; const COLS=[];
  const trackFree=(key,t,xa,xb)=>{ const L=TR[key+'|'+t]; if(!L) return true; for(const [a,b] of L) if(xa<b+14&&xb>a-14) return false; return true; };
  const take=(key,t,xa,xb)=>{ (TR[key+'|'+t]=TR[key+'|'+t]||[]).push([xa,xb]); };
  const findT=(key,xa,xb)=>{ for(let t=0;t<9;t++) if(trackFree(key,t,Math.min(xa,xb),Math.max(xa,xb))) return t; return -1; };
  const colFree=(x,ya,yb)=>{ const y0_=Math.min(ya,yb), y1_=Math.max(ya,yb); for(const c of COLS) if(Math.abs(c[0]-x)<7&&y0_<c[2]+10&&y1_>c[1]-10) return false; return true; };
  const ord=extra.map((e,k)=>k).filter(k=>N[extra[k][0]]&&N[extra[k][1]]).sort((i,j)=>{ const A=extra[i],B=extra[j]; return Math.abs(N[A[1]].x-N[A[0]].x)-Math.abs(N[B[1]].x-N[B[0]].x); });
  for(const k of ord){ const [c,p]=extra[k]; const n=N[c], q=N[p]; const dc=n.dep, dp=q.dep;
    const side=q.x>=n.x?1:-1; const u=used[c]||0; const sx=n.x+side*(40+u*30);
    const ip=intoP[p]||0; const ex=q.x-side*(26+ip*16);   // enter the parent's bottom beside its own line
    let pts=null, tk=[];
    if(Math.abs(ex-sx)>STUBX){ STUBS.push({c,p}); continue; }
    if(dp===dc+1){ const key='g'+dc+'B'; const t=findT(key,sx,ex); if(t>=0){ const ly=q.y+H+58+t*5.5; if(colFree(sx,n.y,ly)){ pts=[[sx,n.y],[sx,ly],[ex,ly],[ex,q.y+H]]; tk=[[key,t,sx,ex]]; } } }
    else { const dlo=dp>dc?dc+1:dp, dhi=dp>dc?dp-1:dc; const kA='g'+dc+'A', kB='g'+(dp-1)+'B';
      const lo=Math.min(sx,ex)-PITCH*3, hi=Math.max(sx,ex)+PITCH*3; const cand=[ex,sx];
      for(let d=dlo;d<=dhi;d++){ const row=rows[d]; if(!row) continue; let i0=0,i1=row.length; while(i0<i1){ const m=(i0+i1)>>1; if(N[row[m]].x<lo-W) i0=m+1; else i1=m; }
        for(let i=i0;i<row.length;i++){ const x=N[row[i]].x; if(x>hi+W) break; for(let o=0;o<5;o++) cand.push(x-W/2-XM-4-o*8, x+W/2+XM+4+o*8); } }
      cand.sort((x,y)=>(Math.abs(x-sx)+Math.abs(ex-x)+Math.abs(x-ex)*0.05)-(Math.abs(y-sx)+Math.abs(ex-y)+Math.abs(y-ex)*0.05));
      for(const xv of cand){ if(xv<lo||xv>hi) continue; if(!freeAt(xv,dlo,dhi)) continue;
        const tA=findT(kA,sx,xv), tB=findT(kB,xv,ex); if(tA<0||tB<0) continue;
        const l1=n.y-58-tA*5.5, l2=q.y+H+58+tB*5.5; if(!colFree(xv,l1,l2)) continue;
        pts=[[sx,n.y],[sx,l1],[xv,l1],[xv,l2],[ex,l2],[ex,q.y+H]]; tk=[[kA,tA,sx,xv],[kB,tB,xv,ex]]; COLS.push([xv,Math.min(l1,l2),Math.max(l1,l2)]); break; } }
    if(!pts){ STUBS.push({c,p}); continue; }
    used[c]=u+1; intoP[p]=ip+1; for(const [key,t,xa,xb] of tk) take(key,t,Math.min(xa,xb),Math.max(xa,xb));
    let x0=1e18,x1=-1e18,y0=1e18,y1=-1e18; for(const [x,y] of pts){ x0=Math.min(x0,x); x1=Math.max(x1,x); y0=Math.min(y0,y); y1=Math.max(y1,y); }
    XR.push({c,p,pts,x0,x1,y0,y1}); }
  // place each stub on the child's top edge where no line leaves the card
  const occ={}; for(const r of XR){ (occ[r.c]=occ[r.c]||[]).push(r.pts[0][0]-N[r.c].x); }
  for(const t of STUBS){ const n=N[t.c]; const o=(occ[t.c]=occ[t.c]||[]); if(n.po&&n.po.length) o.push(0);
    const w=140; let best=null; for(const cxo of [-82,82,-45,45,0]){ if(o.some(x=>Math.abs(x-cxo)<w/2+10)) continue; best=cxo; break; }
    if(best==null) best=-82; t.x=n.x+best; t.w=w; t.h=42; t.y=n.y-50; o.push(best-w/2+8,best,best+w/2-8); }
  for(const id in N){ const n=N[id]; if(!n.sibof) continue; const a_=N[n.sibof]; if(!a_) continue;
    const has=(a_.po&&a_.po.length)||XR.some(r=>r.c===n.sibof)||STUBS.some(t=>t.c===n.sibof); if(has) SIBL.push([id,n.sibof]); }
})();
function poly(pts,r){ cx.beginPath(); cx.moveTo(pts[0][0],pts[0][1]);
  for(let i=1;i<pts.length-1;i++){ const [ax,ay]=pts[i-1],[bx,by]=pts[i],[ccx,ccy]=pts[i+1]; const rr_=Math.min(r,Math.hypot(bx-ax,by-ay)/2,Math.hypot(ccx-bx,ccy-by)/2); if(rr_<1) cx.lineTo(bx,by); else cx.arcTo(bx,by,ccx,ccy,rr_); }
  const e=pts[pts.length-1]; cx.lineTo(e[0],e[1]); cx.stroke(); }
/* ---------- text prep (wrapped once, world units) ---------- */
const FN='700 17px FRL, "Frank Ruhl Libre", serif', FD='400 13px FRL, "Frank Ruhl Libre", serif', FT='italic 400 13.5px FRL, "Frank Ruhl Libre", serif';
function wrap(t,font,maxw,maxl){ cx.font=font; const w=String(t).split(/\s+/); const out=[]; let cur="";
  for(const x of w){ const tr=cur?cur+" "+x:x; if(cx.measureText(tr).width<=maxw) cur=tr; else { if(cur) out.push(cur); cur=x; if(out.length===maxl) break; } }
  if(out.length<maxl&&cur) out.push(cur); if(out.length>maxl) out.length=maxl;
  if(out.length===maxl&&w.join(" ").length>out.join(" ").length+1){ let s=out[maxl-1]; while(s.length>1&&cx.measureText(s+"…").width>maxw) s=s.slice(0,-1); out[maxl-1]=s+"…"; }
  return out; }
function wrapAll(t,font,maxw){ cx.font=font; const w=String(t).split(/\s+/); const out=[]; let cur="";
  for(const x of w){ const tr=cur?cur+" "+x:x; if(!cur||cx.measureText(tr).width<=maxw) cur=tr; else { out.push(cur); cur=x; } } if(cur) out.push(cur); return out; }
function fitName(t,sizes,maxw,maxl,weight){ let best=null; for(const z of sizes){ const f=weight+" "+z+'px FRL, "Frank Ruhl Libre", serif'; const ls=wrapAll(t,f,maxw); best={f,ls,z}; if(ls.length<=maxl){ cx.font=f; if(ls.every(l=>cx.measureText(l).width<=maxw)) return best; } } return best; }
const TX={}; function txt(id){ if(TX[id]) return TX[id]; const p=P[id]; const por=por_(id); const tw=por?W-109:W-39;  // keeps text clear of the mark circle and the portrait
  const fit=t=>{ cx.font=FD; if(cx.measureText(t).width<=tw-14) return t; let q=t; while(q.length>2&&cx.measureText(q+"…").width>tw-14) q=q.slice(0,-1); return q+"…"; };
  const fitT=t=>{ cx.font=FT; let q=t; if(cx.measureText(q).width<=tw-14) return q; while(q.length>2&&cx.measureText(q+"…").width>tw-14) q=q.slice(0,-1); return q+"…"; };
  const tl=(p.t||"").replace(/^לויט מסורה( · )?/,""); const rab=RAB.test(p.n||"")||RAB.test(tl);
  const til=tl?wrap(tl,FT,tw-14,2):[];
  const NM=fitName(p.n,[17,15.5,14],tw-6,3,"700"); const MID=fitName(p.n,[32,28,25,22],W-40,3,"700");
  return TX[id]={nm:NM.ls,nmf:NM.f,nmz:NM.z,mid:MID,dt:p.d?fit(p.d):"",pl:p.pl?fit(p.pl):"",ti:til,rab,dtl:1e9,dtc:fit,por}; }
function meds(id){ const p=P[id]; if(p.media) return p.media.map(m=>({f:m.f,k:(m.k||"x")[0],cap:m.cap,cr:m.cr,u:m.u}));
  return (p.md||[]).map((m,i)=>({f:m[0],k:m[1],det:i})); }
function por_(id){ const m=meds(id).find(x=>x.k==="p"); return m||null; }
const isURI=f=>/^data:|\//.test(f)&&!/^[mtz]\//.test(f);
const AB=/\.sites\.tab\.bot$/.test(location.hostname)?"https://handyequip5003.github.io/leitner-yichus/":"";  // tab.bot copy reads pictures + detail chunks from the GitHub Pages copy
const SRC=(f,tier)=>f.startsWith("data:")?f:AB+(/^[mtz]\//.test(f)?tier+f.slice(1):f.includes("/")?f:tier+"/"+f+".jpg");
/* ---------- what's new (Alter 12:51): highlights what the last publish added ---------- */
const LN=D.lastNew||null; const NEWS=LN?Object.keys(LN.ids).filter(k=>P[k]&&N[k]):[]; const NEWSET=new Set(NEWS); let wnOn=false, wnI=-1;
NEWS.sort((a,b)=>(N[a]?N[a].dep:0)-(N[b]?N[b].dep:0));
/* ---------- view state ---------- */
let s=0.9,tx=0,ty=0,dpr=Math.min(2,window.devicePixelRatio||1),vw=0,vh=0,dirty=true,sel=null;
function resize(){ vw=innerWidth; vh=innerHeight; cv.width=Math.round(vw*dpr); cv.height=Math.round(vh*dpr); dirty=true; }
addEventListener("resize",resize); resize();
const clampS=v=>Math.max(0.006,Math.min(3,v));
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
  const d0=Math.max(minDep,Math.floor(-y1/RH)-1), d1=Math.min(maxDep,Math.ceil(-y0/RH)+1);
  // gentle generation bands (screen space) + generation numbers
  cx.font='500 11px FRL, serif'; cx.textAlign="right"; cx.textBaseline="middle";
  const step=s<0.08?10:s<0.2?5:1;
  for(let d=d0;d<=d1;d++){ const top=(-d*RH-(RH-H)/2)*s+ty, bot=top+RH*s; if(bot<0||top>vh) continue;
    if(d%2===1){ cx.fillStyle="rgba(150,110,50,.055)"; cx.fillRect(0,top,vw,RH*s); }
    if(d%step===0&&d>0&&s>0.05){ cx.fillStyle="rgba(110,80,35,.55)"; cx.fillText("דור "+d,vw-8,top+11); } }
  cx.setTransform(dpr*s,0,0,dpr*s,dpr*tx,dpr*ty);
  // connectors: child top -> mid-gap -> across -> up to the parent; family colour of the parent; the tapped card's links bold
  const gapTop=RH-H, rad=16, lw=Math.max(2.2,1.2/s);
  const link=(n,q,p,bold)=>{ const ya=n.y, yb=q.y+H, lane=n.y-gapTop*(n.lof||0.5); cx.strokeStyle=bc(p); cx.lineWidth=bold?lw*2.4:lw; cx.beginPath(); cx.moveTo(n.x,ya);
    if(Math.abs(q.x-n.x)<1) cx.lineTo(q.x,yb);
    else { const sg=q.x>n.x?1:-1, r=Math.min(rad,Math.abs(q.x-n.x)/2); cx.lineTo(n.x,lane+r); cx.quadraticCurveTo(n.x,lane,n.x+sg*r,lane); cx.lineTo(q.x-sg*r,lane); cx.quadraticCurveTo(q.x,lane,q.x,lane-r); cx.lineTo(q.x,yb); }
    cx.stroke(); };
  // a child of Alter's family: up to the lane, across to the middle of the couple, up to the marriage line
  const kidLink=(k,bold)=>{ const h=N[ROOT], w=FAM.sp&&N[FAM.sp]; const xm=w?(h.x+w.x)/2:h.x, ym=w?h.y+H/2+4:h.y+H; link(N[k],{x:xm,y:ym-H},ROOT,bold); };
  cx.lineJoin="round"; cx.lineCap="round"; cx.globalAlpha=s<0.1?0.6:0.85;
  for(let d=Math.max(minDep,d0-1);d<=d1;d++){ const row=rows[d]; if(!row) continue;
    for(const id of row){ const n=N[id]; if(!n.po||!n.po.length) continue;
      for(const [p] of n.po){ const q=N[p]; if(Math.max(q.x,n.x)<x0-W||Math.min(q.x,n.x)>x1+W) continue; link(n,q,p,false); } } }
  // further lines of descent into the one card (each person once) + sibling brackets
  for(const r of XR){ if(r.x1<x0-W||r.x0>x1+W||r.y1<y0-H||r.y0>y1+H) continue; cx.strokeStyle=bc(r.p); cx.lineWidth=lw; poly(r.pts,rad); }
  for(const [sb,an] of SIBL){ const n2=N[sb],a3=N[an]; if(Math.max(n2.x,a3.x)<x0-W||Math.min(n2.x,a3.x)>x1+W) continue; cx.strokeStyle=bc(an); cx.lineWidth=lw*0.8; cx.setLineDash([2,0]); poly([[n2.x,n2.y],[n2.x,n2.y-GAP/2],[a3.x,a3.y-GAP/2]],rad); }
  if(FAM&&FAM.sp&&N[FAM.sp]){ const h=N[ROOT], w=N[FAM.sp], ym=h.y+H/2, xa=Math.min(h.x,w.x)+W/2, xb=Math.max(h.x,w.x)-W/2; cx.strokeStyle=C.gold; cx.lineWidth=lw;
    cx.beginPath(); cx.moveTo(xa,ym-4); cx.lineTo(xb,ym-4); cx.moveTo(xa,ym+4); cx.lineTo(xb,ym+4); cx.stroke(); }
  for(const k of KIDS) kidLink(k,false);
  cx.globalAlpha=1;
  if(sel&&N[sel]){ const n=N[sel]; for(const [p] of n.po||[]) link(n,N[p],p,true); if(n.ch&&N[n.ch]) link(N[n.ch],n,sel,true);
    for(const k of KIDS) if(sel===k||sel===ROOT||(FAM&&sel===FAM.sp)) kidLink(k,true);
    for(const r of XR){ if(r.c===sel||r.p===sel){ cx.strokeStyle=bc(r.p); cx.lineWidth=lw*2.4; poly(r.pts,rad); } }
    for(const [sb,an] of SIBL){ if(sb===sel||an===sel){ const n2=N[sb],a3=N[an]; cx.strokeStyle=bc(an); cx.lineWidth=lw*1.8; poly([[n2.x,n2.y],[n2.x,n2.y-GAP/2],[a3.x,a3.y-GAP/2]],rad); } } }
  const lod=s*W; let drawn=0;
  for(let d=d0;d<=d1;d++){ const row=rows[d]; if(!row) continue;
    let lo=0,hi=row.length; while(lo<hi){ const m=(lo+hi)>>1; if(N[row[m]].x+W/2<x0) lo=m+1; else hi=m; }
    for(let i=lo;i<row.length;i++){ const id=row[i], n=N[id]; if(n.x-W/2>x1) break; drawn++; card(id,n,lod); } }
  // dashed stubs for the rare far-away second line: tap flies to the one real card
  if(STUBS.length&&lod>=20){ for(const t of STUBS){ if(t.x+t.w/2<x0||t.x-t.w/2>x1||t.y+t.h<y0||t.y>y1) continue;
      cx.save(); cx.setLineDash([6,5]); cx.lineWidth=Math.max(1.6,1.2/s); cx.strokeStyle=bc(t.p); cx.fillStyle="rgba(255,250,240,.96)"; rr(t.x-t.w/2,t.y,t.w,t.h,10); cx.fill(); cx.stroke(); cx.setLineDash([]);
      cx.fillStyle=C.ink; cx.textAlign="center"; cx.textBaseline="middle"; cx.direction="rtl"; cx.font='700 13px FRL, "Frank Ruhl Libre", serif'; cx.fillText("זעה אויבן ⟵",t.x,t.y+14);
      let fs=11.5; const nm=P[t.p].n; cx.font='400 '+fs+'px FRL, serif'; while(cx.measureText(nm).width>t.w-12&&fs>7){ fs-=0.5; cx.font='400 '+fs+'px FRL, serif'; } cx.fillStyle=C.ink2; cx.fillText(nm,t.x,t.y+32); cx.restore(); } }
  return drawn; }
function card(id,n,lod){ const p=P[id], x=n.x-W/2, y=n.y, m=p.m||"unv", mes=p.mes, root=id===ROOT, col=bc(id);
  const hl=wnOn&&NEWSET.has(id);
  if(hl){ cx.save(); cx.shadowColor="rgba(214,170,60,.9)"; cx.shadowBlur=28*Math.min(1,s*2)+6; cx.fillStyle="rgba(230,190,90,.55)"; rr(x-10,y-10,W+20,H+20,16); cx.fill(); cx.restore();
    cx.lineWidth=Math.max(3,3/s); cx.strokeStyle="#c9a35c"; rr(x-7,y-7,W+14,H+14,14); cx.stroke(); }
  if(lod<34){ cx.fillStyle=C.card; cx.fillRect(x,y,W,H); cx.fillStyle=col; cx.fillRect(x,y,W,14); if(id===sel){cx.strokeStyle=C.sel;cx.lineWidth=3/s;cx.strokeRect(x,y,W,H);} return; }
  cx.fillStyle="rgba(80,55,20,.10)"; rr(x+1,y+3,W,H,10); cx.fill();   // soft shadow (no blur)
  rr(x,y,W,H,10); cx.fillStyle=mes?C.cardMes:root?"#fffdf5":C.card; cx.fill();
  cx.lineWidth=Math.max(1,0.9/s); cx.strokeStyle=id===sel?C.sel:root?C.gold:C.edge; if(mes) cx.setLineDash([5,4]); cx.stroke(); cx.setLineDash([]);
  if(id===sel||root){ cx.lineWidth=Math.max(2,2/s); cx.strokeStyle=C.sel; rr(x-2,y-2,W+4,H+4,12); cx.stroke(); }
  // family-colour top edge
  cx.save(); rr(x,y,W,H,10); cx.clip(); cx.fillStyle=col; cx.fillRect(x,y,W,root?7:5); cx.restore();
  if(lod<140){ const M=txt(id).mid; cx.fillStyle=C.ink; cx.font=M.f; cx.textAlign="center"; cx.textBaseline="middle"; cx.direction="rtl";
    const lh=M.z*1.12, n0=M.ls.length; let yy=y+H/2+6-(n0-1)*lh/2; for(const l of M.ls){ cx.fillText(l,n.x,yy); yy+=lh; } cx.direction="ltr"; markAt(x+16,y+20,m,10); if(hl) newBadge(x+W-6,y-14,1.8); return; }
  const T=txt(id); let rx=x+W-13;
  if(T.por){ const R=30, pcx=x+W-13-R, pcy=y+16+R+4;
    if(lod>105){ const im=img(SRC(T.por.f,"m")); cx.save(); cx.beginPath(); cx.arc(pcx,pcy,R,0,7); cx.closePath(); cx.clip();
      if(im){ const r=Math.max(2*R/im.width,2*R/im.height); cx.drawImage(im,pcx-im.width*r/2,pcy-R-(im.height*r-2*R)*0.2,im.width*r,im.height*r); } else { cx.fillStyle="#efe5cf"; cx.fill(); }
      cx.restore(); cx.beginPath(); cx.arc(pcx,pcy,R,0,7); cx.lineWidth=Math.max(1.2,1/s); cx.strokeStyle=col; cx.stroke(); }
    rx=x+W-13-2*R-10; }
  cx.direction="rtl"; cx.textAlign="right"; cx.textBaseline="alphabetic";
  let yy=y+30; if(T.rab&&!mes){ crest(rx-4,yy-6,4.4); }
  cx.fillStyle=C.ink; cx.font=T.nmf; const off=T.rab&&!mes?12:0; const nlh=T.nmz*1.22;
  T.nm.forEach((l,k)=>{ cx.fillText(l,rx-(k===0?off:0),yy); yy+=nlh; });
  yy+=2;
  if(mes){ cx.font='600 12.5px FRL, serif'; cx.fillStyle=C.gold; cx.fillText("לויט מסורה",rx,yy); yy+=18; }
  else if(T.ti.length){ cx.font=FT; cx.fillStyle=T.rab?C.gold:C.ink2; for(const l of T.ti){ if(yy>y+H-30) break; cx.fillText(l,rx,yy); yy+=17; } }
  cx.font=FD; cx.fillStyle=C.date;
  const lines=[T.pl,T.dt].filter(Boolean); let yb=y+H-12-(lines.length-1)*17; yb=Math.max(yb,yy+2);
  for(const l of lines){ if(yb>y+H-8) break; cx.fillText(l,rx,yb); yb+=17; }
  cx.direction="ltr";
  markAt(x+18,y+21,m,10.5); if(hl) newBadge(x+W-8,y-6,1); }
function newBadge(xr,yt,k){ const w=46*k,h=22*k; cx.fillStyle="#b08d57"; rr(xr-w,yt,w,h,h/2); cx.fill(); cx.fillStyle="#fff"; cx.font="700 "+(13*k)+"px FRL, serif"; cx.textAlign="center"; cx.textBaseline="middle"; cx.direction="rtl"; cx.fillText("נייַ",xr-w/2,yt+h/2+1); cx.direction="ltr"; }
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
    const st=hitStub(e.clientX,e.clientY); if(st){ openSheet(st.p); focus(st.p,Math.max(s,0.6)); } else if(id){ openSheet(id); } else if(now-lastTap<320){ zoomTo(e.clientX,e.clientY,Math.min(3,s*2.2)); } lastTap=now; } }
cv.addEventListener("pointerup",up,{passive:true}); cv.addEventListener("pointercancel",up,{passive:true});
cv.addEventListener("wheel",e=>{ e.preventDefault(); const f=Math.exp(-e.deltaY*(e.ctrlKey?0.01:0.0018)); const ns=clampS(s*f); const wx=(e.clientX-tx)/s, wy=(e.clientY-ty)/s; s=ns; tx=e.clientX-wx*s; ty=e.clientY-wy*s; dirty=true; },{passive:false});
function hitStub(sx,sy){ const wx=(sx-tx)/s, wy=(sy-ty)/s; for(const t of STUBS) if(wx>=t.x-t.w/2-4&&wx<=t.x+t.w/2+4&&wy>=t.y-4&&wy<=t.y+t.h+4) return t; return null; }
function hit(sx,sy){ const wx=(sx-tx)/s, wy=(sy-ty)/s; const d=Math.round(-(wy-H/2)/RH); const row=rows[d]; if(!row) return null; if(wy<-d*RH-6||wy>-d*RH+H+6) return null;
  for(const id of row){ const n=N[id]; if(wx>=n.x-W/2-4&&wx<=n.x+W/2+4) return id; } return null; }
function animTo(ns,ntx,nty,ms){ const s0=s,x0=tx,y0=ty,t0=performance.now(); vx=vy=0;
  anim=()=>{ let k=Math.min(1,(performance.now()-t0)/ms); k=1-Math.pow(1-k,3); s=s0+(ns-s0)*k; tx=x0+(ntx-x0)*k; ty=y0+(nty-y0)*k; if(k>=1) anim=null; return true; }; }
function zoomTo(sx,sy,ns){ const wx=(sx-tx)/s, wy=(sy-ty)/s; animTo(ns,sx-wx*ns,sy-wy*ns,380); }
function focus(id,ns){ const n=N[id]; if(!n) return; ns=ns||Math.max(s,0.75); const sheetUp=document.getElementById("sheet").classList.contains("on")&&vw<820;
  animTo(ns,vw/2-n.x*ns,(sheetUp?vh*0.2:vh*0.55)-(n.y+H/2)*ns,600); }
function homeV(){ const n=N[ROOT]; const ns=Math.min(1,vw/(2*PITCH+30)); const cxw=KIDS.length&&FAM.sp&&N[FAM.sp]?n.x-PITCH/2:n.x; return [ns,vw/2-cxw*ns,(KIDS.length?vh*0.5:vh*0.78)-(n.y+H/2)*ns]; }
function home(){ [s,tx,ty]=homeV(); dirty=true; }
document.getElementById("home").onclick=()=>{ const [ns,a,b]=homeV(); animTo(ns,a,b,650); };
/* ---------- detail sheet ---------- */
const DET={}; const nch=D.nch||32;
function bucket(id){ let h=5381; for(let i=0;i<id.length;i++) h=(Math.imul(h,33)+id.charCodeAt(i))>>>0; return h%nch; }
function details(id){ const p=P[id]; if(p.x!==undefined||p.src!==undefined||p.media) return Promise.resolve(p);
  const b=bucket(id); if(!DET[b]) DET[b]=fetch(AB+"d/"+String(b).padStart(2,"0")+".json?v="+(window.YV||"")).then(r=>r.json()).catch(()=>({}));
  return DET[b].then(c=>Object.assign({},p,c[id]||{})); }
const sheet=document.getElementById("sheet"), sb=document.getElementById("sb");
const nameLink=id=>P[id]?`<a href="#" data-go="${esc(id)}">${esc(P[id].n)}</a>`:"";
let curMed=[];
function openSheet(id){ sel=id; dirty=true; const p=P[id]; sheet.style.setProperty("--bc",bc(id));
  sb.innerHTML=head(id,p)+`<div class="ld">…</div>`; sheet.classList.add("on"); sheet.setAttribute("aria-hidden","false"); sheet.scrollTop=0;
  if(vw<820&&N[id]){ const n=N[id]; const yS=(n.y+H/2)*s+ty; if(yS>vh*0.3) animTo(s,tx,ty-(yS-vh*0.2),420); }
  details(id).then(q=>{ if(sel!==id) return; sb.innerHTML=head(id,q)+body(id,q); wire(id); }); }
function head(id,p){ const m=p.m||"unv"; return (!N[id]&&P[id]&&P[id].sibof?`<p class="hidn">דער קארטל איז באהאלטן אינעם בוים (געשוויסטער ווערן נישט געוויזן). <button type="button" data-sibon>ווייז געשוויסטער</button></p>`:"")+(p.mes?`<div class="mesl">לויט מסורה</div>`:"")+`<h1>${esc(p.n)}</h1>`+(p.t&&p.t!=="לויט מסורה"?`<p class="ti">${esc(p.t.replace(/^לויט מסורה · /,""))}</p>`:"")+
  ((p.d||p.pl)?`<p class="meta">${esc([p.d,p.pl].filter(Boolean).join(" · "))}</p>`:"")+`<div class="mark"><span class="dot ${m}">${(MKC[m]||MKC.unv)[1]}</span>${esc(MKN[m]||"")}</div>`; }
function body(id,p){ let h=""; const u=UP[id]||[];
  const ms=(p.media||[]).length?p.media.map(x=>({f:x.f,cap:x.cap,cr:x.cr,u:x.u})):[]; curMed=ms;
  const NP=new Set(((LN&&LN.ids[id]&&LN.ids[id].p)||[])); const isNP=f=>wnOn&&(NP.has(f)||NP.has(String(f).replace(/^m\//,"").replace(/\.jpg$/,"")));
  if(ms.length) h+=`<div class="gal">`+ms.map((x,i)=>`<figure data-i="${i}" class="${isNP(x.f)?"nw":""}">${isNP(x.f)?'<span class="nwb">נייַ</span>':""}<img loading="lazy" decoding="async" src="${esc(SRC(x.f,"t"))}" alt=""><figcaption>${esc(x.cap||"")}</figcaption></figure>`).join("")+`</div><div class="gn">${ms.length>1?ms.length+" בילדער · ":""}טאפ פאר פולער גרייס</div>`;
  h+=`<div class="fam">`; if(u[0]&&P[u[0]]) h+=`<div><b>טאטע</b><span>${nameLink(u[0])}</span></div>`; if(u[1]&&P[u[1]]) h+=`<div><b>מאמע</b><span>${nameLink(u[1])}</span></div>`;
  const ks=(kids[id]||[]).filter(c=>P[c]); if(ks.length) h+=`<div><b>קינדער</b><span>${ks.map(nameLink).join(" · ")}</span></div>`;
  const sp=[]; for(const c of ks){ const cu=UP[c]||[]; const o=cu[0]===id?cu[1]:cu[0]; if(o&&P[o]&&!sp.includes(o)) sp.push(o); } if(sp.length) h+=`<div><b>זיווג</b><span>${sp.map(nameLink).join(" · ")}</span></div>`;
  if(p.sibof&&P[p.sibof]) h+=`<div><b>געשוויסטער</b><span>${nameLink(p.sibof)}</span></div>`; const ss=(SIBALL[id]||[]); if(ss.length) h+=`<div><b>געשוויסטער</b><span>${ss.map(nameLink).join(" · ")}</span></div>`;
  h+=`</div>`;
  const lm=LM[id]; if(lm&&lm[1]) h+=`<p class="note2">${esc(lm[1])}</p>`;
  if(p.inhw) h+=`<p class="note2">${esc(p.inhw)}</p>`;
  const NI=LN&&LN.ids[id]; const nf=new Set(((NI&&NI.f)||[]).map(t=>t.trim()));
  if(NI&&wnOn) h=`<p class="note2" style="color:#8a6a2c"><span class="nwb">נייַ</span> ${NI.c?"א נייַער קאַרטל · ":""}${(NI.f||[]).length} נייַע פאַקטן${(NI.p||[]).length?" · "+NI.p.length+" נייַע בילדער":""} (<bdi dir="ltr">${esc(LN.date)}</bdi>)</p>`+h;
  if(p.x) h+=`<div class="tx">`+p.x.split("\n").filter(l=>l.trim()).map(l=>{ const isN=wnOn&&nf.has(l.trim()); return `<div class="ln${isN?" nw":""}">${isN?'<span class="nwb">נייַ</span>':""}${esc(l)}</div>`; }).join("")+`</div>`;
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
/* what's new controls */
(function(){ const bt=document.getElementById("wn"), bar=document.getElementById("wnb"), t=document.getElementById("wnt");
  if(!LN||!NEWS.length) return; bt.hidden=false; const ni=LN.n_items||NEWS.length; document.getElementById("wnc").textContent=ni;
  const lab=()=>{ t.textContent=(wnI>=0?(wnI+1)+" / "+NEWS.length+" · ":"")+ni+" נייַע זאַכן אין "+NEWS.length+" קאַרטלעך"; };
  const go=k=>{ wnI=(k+NEWS.length)%NEWS.length; const id=NEWS[wnI]; sel=id; if(N[id]) focus(id,Math.max(s,0.75)); lab(); dirty=true; };
  bt.onclick=()=>{ wnOn=!wnOn; bt.classList.toggle("on",wnOn); bar.hidden=!wnOn; wnI=-1; lab(); dirty=true; if(wnOn) go(0); if(sheet.classList.contains("on")&&sel) openSheet(sel); };
  document.getElementById("wnn").onclick=()=>go(wnI+1); document.getElementById("wnp").onclick=()=>go(wnI-1);
  t.onclick=()=>{ if(wnI>=0) openSheet(NEWS[wnI]); };
  window.__ywn=()=>bt.onclick(); })();

/* ---------- settings panel ⚙ (Alter Nov 8 6:27 PM) ---------- */
(function(){ const bt=document.getElementById("gear"), pn=document.getElementById("setp"); if(!bt||!pn) return;
  const NSIB=new Set([].concat(...Object.values(SIBALL)).filter(x=>!(x in tparents))).size;
  const ck=document.getElementById("s_sibs"); ck.checked=SET.sibs; document.getElementById("s_sibn").textContent=NSIB;
  const open=v=>{ pn.hidden=!v; bt.classList.toggle("on",v); };
  bt.onclick=()=>open(pn.hidden); document.getElementById("setx").onclick=()=>open(false);
  const apply=v=>{ SET.sibs=v; saveSet(); const h=sel?"#"+encodeURIComponent(sel):""; history.replaceState(null,"",location.pathname+location.search+h); location.reload(); };
  ck.onchange=()=>apply(ck.checked);
  sb.addEventListener("click",e=>{ if(e.target.closest("[data-sibon]")){ e.preventDefault(); apply(true); } });
  window.__yset=apply; })();
/* ---------- start: centred on Alter at a readable zoom ---------- */
home(); loop();
(function fromHash(){ const h=decodeURIComponent(location.hash.slice(1)); if(!h) return; const [id,z]=h.split("/"); if(!P[id]) return; if(N[id]) focus(id,Math.max(0.75,s)); openSheet(id);
  if(z&&z[0]==="z") details(id).then(()=>setTimeout(()=>openZoom(+z.slice(1)||0),120)); })();
if(document.fonts&&document.fonts.load){ document.fonts.load(FN).then(()=>{ for(const k in TX) delete TX[k]; dirty=true; }); }
window.__yt={N,rows,maxDep,draw,s:()=>s,focus,openSheet,openZoom,home};

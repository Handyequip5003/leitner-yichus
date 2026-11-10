/* יחוס – canvas tree (Nov 8 2026 redesign): one canvas, virtualized drawing, detail sheet, zoom viewer. No libraries. */
"use strict";
const D=window.YDATA; const P=D.people, UP=D.up||{}, LM=D.linkm||{};
const ROOT=D.root||"alter";
/* marriage line colour (Alter Nov 8 7:20 PM: "another color"): double line + ⚭ rings */
const MARRIAGE_COLOR="#7B2D3A";
/* side pills (Alter Nov 8 7:08 PM): jump to the 4 grandparents on each side.
   from: "root" = Alter, "wife" = his wife. path: 0 = father, 1 = mother (from → parent → grandparent). id: set to fix a card directly; alt: ids tried if the path has no card yet; name: else the one card whose name holds this word.
   label: pill text (a bare "זיידע"/"באבע" gets the card's family name added). rel: the small second line. A slot not yet in the data shows grey "נאך נישט באקאנט". */
const PILLS=[
  {g:"די פיר משפחות", from:"root", items:[
    {path:[0,0], label:"משפחת ראבינאוויטש",  rel:"טאטע'ס טאטע"},
    {path:[0,1], label:"משפחת קרישעווסקי",   rel:"טאטע'ס מאמע"},
    {path:[1,0], label:"משפחת מענדלאוויטש", rel:"מאמע'ס טאטע", alt:["mendel_avraham"], name:"מענדלאוויטש"},
    {path:[1,1], label:"משפחת ווייס",         rel:"מאמע'ס מאמע"} ]} ];
/* settings (Alter Nov 8 6:27 PM): by default only the direct line up (parents, grandparents and higher); siblings behind ⚙ */
const SETK="yichus_settings_v1"; const SET=(()=>{ let o={}; try{ o=JSON.parse(localStorage.getItem(SETK)||"{}")||{}; }catch(e){} return {sibs:!!o.sibs, see:!!o.see}; })();  // SEEABOVE_TOGGLE_V1: see = "זעה אויבן" lines
function saveSet(){ try{ localStorage.setItem(SETK,JSON.stringify(SET)); }catch(e){} }
const cv=document.getElementById("cv"); let cx=cv.getContext("2d");
const C={card:"#fffaf0",cardMes:"#fbf4e2",edge:"#d8c6a1",ink:"#24180a",ink2:"#5d4a30",date:"#6b5636",gold:"#a8803c",mar:MARRIAGE_COLOR,lineX:"rgba(176,86,63,.28)",sel:"#b08d57"};
/* FAMCOLORS_V1 (Alter 8:35 PM Nov 8 "Make all familys a complete other color and a light backround of there color ... if there is 1 for 2 family make half and half blanded in").
   One clearly different colour per family (maroon #7B2D3A = marriage lines and amber #B07A0E = "זעה אויבן" stay reserved).
   L לייטנער brown · W וואגשאהל forest green · R רובין orange · M מייזליש purple · T טייטלבוים red · H האלבערשטאם lime · S שפירא blue · Y מאיער olive
   K טארים teal · V וויינבערגער slate · G שווארץ charcoal · B ראבינאוויטש raspberry · Z קרישעווסקי orchid · N מענדלאוויטש indigo · X ווייס sky blue */
const BRC={L:"#6d4321",W:"#1b6e2a",R:"#e65c00",M:"#6a1b9a",T:"#c62828",H:"#7cb342",S:"#1565c0",Y:"#9e9d24",K:"#00897b",V:"#78909c",G:"#2b2b2b",B:"#d81b60",Z:"#ba68c8",N:"#283593",X:"#29b6f6"};
/* ווייס (the שוויגער's mother's side) was drawn with the מענדלאוויטש letter: give מרים ווייס and her own line up their own family X */
(function weissFam(){ const w0="weiss_miriam"; if(!P[w0]||P[w0].br!=="N") return; const seen=new Set(), st=[w0];
  while(st.length){ const id=st.pop(); if(seen.has(id)||!P[id]||P[id].br!=="N") continue; seen.add(id); P[id].br="X"; for(const u of (UP[id]||[])) if(u) st.push(u); }
  for(const id in P){ const q=P[id]; if(q.br==="N"&&q.sibof&&seen.has(q.sibof)) q.br="X"; } })();
const bc=id=>BRC[(P[id]&&P[id].br)||"L"]||BRC.L;
/* LINECOLORS_V1 (Alter 10:04 PM Nov 8: "change the married simple and double line to the color of the team they belong"): lines take the family colour;
   a light family colour is darkened a little for lines only, so it stays visible on the parchment. */
const LCC={}; const lcol=h=>{ if(LCC[h]) return LCC[h]; const c=[1,3,5].map(i=>parseInt(h.substr(i,2),16)); const lum=(0.2126*c[0]+0.7152*c[1]+0.0722*c[2])/255;
  const k=lum>0.42?0.62:lum>0.3?0.8:1; return LCC[h]="#"+c.map(v=>Math.round(v*k).toString(16).padStart(2,"0")).join(""); };
const lc=id=>lcol(bc(id));
const TINT={}; (function(){ const bg=[255,250,240]; for(const k in BRC){ const h=BRC[k], c=[1,3,5].map(i=>parseInt(h.substr(i,2),16)), a=k==="G"||k==="V"?0.16:0.22;
  TINT[k]="rgb("+c.map((v,i)=>Math.round(bg[i]*(1-a)+v*a)).join(",")+")"; } })();
const tint=id=>TINT[(P[id]&&P[id].br)||"L"]||TINT.L;
/* two families: a mother (UP[child][1]) whose family letter differs from her husband's (UP[child][0]), and Alter's wife vs Alter.
   TWO[id] = husband's family letter; her own family keeps the right half (where the name starts), his the left half. */
const TWO={}, TWOH={}; (function(){ for(const c in UP){ const u=UP[c]||[], f=u[0], m=u[1]; if(f&&m&&P[f]&&P[m]&&P[f].br&&P[m].br&&P[f].br!==P[m].br){ TWO[m]=P[f].br; TWOH[m]=f; } }
  const sp=D.fam&&D.fam.sp; if(sp&&P[sp]&&P[ROOT]&&P[sp].br!==P[ROOT].br){ TWO[sp]=P[ROOT].br; TWOH[sp]=ROOT; } })();
function cardBg(id,x){ const o=TWO[id]; if(!o||!TINT[o]) return tint(id);
  /* SPLITSIDE_V1 (Alter 10:06 PM Nov 8: "brown should be closer to me on my wife"): the husband's colour on the half of her card that faces his card, hers on the far half */
  const hb=TWOH[id], hr=!!(hb&&typeof N!=="undefined"&&N[hb]&&N[id]&&N[hb].x>N[id].x), a0=hr?tint(id):TINT[o], a1=hr?TINT[o]:tint(id);
  const g=cx.createLinearGradient(x,0,x+W,0); g.addColorStop(0,a0); g.addColorStop(0.38,a0); g.addColorStop(0.62,a1); g.addColorStop(1,a1); return g; }
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
    q=nq; }
  // WIFE_LINE_V1 (Alter Nov 8 6:56 PM: his father-in-law): the wife's own direct line goes up from her card
  const sp0=D.fam&&D.fam.sp&&P[D.fam.sp]?D.fam.sp:null;
  if(sp0&&!seen.has(sp0)){ seen.add(sp0); N[sp0]={dep:0}; q=[sp0];
    while(q.length){ const nq=[]; for(const id of q){ const u=UP[id]||[]; tparents[id]=[];
        for(let k=0;k<2;k++){ const p=u[k]; if(!p||!P[p]) continue; if(seen.has(p)){ extra.push([id,p]); continue; } seen.add(p); N[p]={dep:N[id].dep+1,ch:id}; tparents[id].push(p); nq.push(p);} }
      q=nq; } } })();
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
  // marriage lines (Alter Nov 8 7:01 PM): a father's siblings stand on his far side, so nothing sits between husband and wife
  const ch_=N[id].ch, sR=!!(ch_&&(UP[ch_]||[])[0]===id&&(tparents[ch_]||[]).length===2); N[id].sside=sR?1:-1;
  const own0=()=>sR?{l:[-W/2],r:[W/2+sw]}:{l:[-W/2-sw],r:[W/2]};
  if(!ps.length){ N[id].po=[]; return own0(); }
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
  const res=own0(); for(let d=0;d<acc.l.length;d++){ res.l.push(acc.l[d]-mid); res.r.push(acc.r[d]-mid); }
  return res; }
const MAINC=lay(ROOT);
(function place(){ const st=[[ROOT,0]]; while(st.length){ const [id,x]=st.pop(); const n=N[id]; n.x=x; n.y=-n.dep*RH; for(const [p,o] of n.po||[]) st.push([p,x+o]); } })();
// the wife's line (WIFE_LINE_V1): she stays beside Alter; her ancestors run out past the left edge of Alter's tree, in the lane just above her row
(function wifeLine(){ const sp=D.fam&&D.fam.sp&&P[D.fam.sp]?D.fam.sp:null; if(!sp||!N[sp]||!(tparents[sp]||[]).length) return;
  const cW=lay(sp); let dl=0; const x0=N[ROOT].x-PITCH;
  for(let d=1;d<cW.r.length&&d<MAINC.l.length;d++) dl=Math.min(dl, MAINC.l[d]-(GX+GG)-cW.r[d]+PITCH);
  N[sp].po=(N[sp].po||[]).map(([p,o])=>[p,o+dl]); N[sp].lof=0.3; N[sp].sw=0;
  const st=[[sp,x0]]; while(st.length){ const [id,x]=st.pop(); const n=N[id]; n.x=x; n.y=-n.dep*RH; for(const [p,o] of n.po||[]) st.push([p,x+o]); } })();
for(const a in sibsOf){ if(!N[a]||N[a].sibof) continue; sibsOf[a].forEach((sb,k)=>{ N[sb]={x:N[a].x+(N[a].sside||-1)*(k+1)*SIBW,y:N[a].y,dep:N[a].dep,sibof:a}; }); }
// Alter's own family (Alter 12:55): his wife beside him (to his left), their children one row below, centred under the couple
const FAM=D.fam||null, KIDS=[]; let minDep=0;
if(FAM&&N[ROOT]){ const a=N[ROOT]; const sp=FAM.sp&&P[FAM.sp]?FAM.sp:null; if(sp){ if(N[sp]&&N[sp].po&&N[sp].po.length){ N[sp].spof=ROOT; N[sp].x=a.x-PITCH; N[sp].y=a.y; } else N[sp]={x:a.x-PITCH,y:a.y,dep:0,spof:ROOT,po:[]}; }
  const ks=(FAM.kids||[]).filter(k=>P[k]); const mx=sp?a.x-PITCH/2:a.x;
  ks.forEach((k,i)=>{ N[k]={x:mx+(i-(ks.length-1)/2)*PITCH,y:a.y+RH,dep:-1,po:[],kid:1}; KIDS.push(k); }); if(ks.length) minDep=-1; }
const ids=Object.keys(N); const rows={}; let maxDep=0; for(const id of ids) N[id].id=id;  // LINECOLORS_V1: a node knows its card
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
/* ---------- marriage lines (Alter Nov 8 7:01 PM: "all couples make a line resembling married in between them") ----------
   every husband and wife on the canvas get a gold double line between their two cards at mid height, with the ⚭ rings,
   and their child's line comes up into the middle of it. A couple whose cards are not side by side (a second wife, or a
   person drawn once elsewhere): a short double line leaves the card above the child and the line runs on to the spouse. */
const MAR=[], MARC={}, MIX={};
function rowClear(d,xa,xb,a,b){ const row=rows[d]; if(!row) return true; let lo=0,hi=row.length; while(lo<hi){ const m=(lo+hi)>>1; if(N[row[m]].x+W/2<=xa) lo=m+1; else hi=m; }
  for(let i=lo;i<row.length;i++){ const id=row[i]; if(N[id].x-W/2>=xb) break; if(id!==a&&id!==b) return false; } return true; }
(function marriages(){ const seen=new Set();
  if(FAM&&FAM.sp&&N[FAM.sp]&&N[ROOT]){ const h=N[ROOT], w=N[FAM.sp]; seen.add(ROOT+'|'+FAM.sp); MAR.push({f:ROOT,m:FAM.sp,y:h.y+H/2,xa:Math.min(h.x,w.x)+W/2,xb:Math.max(h.x,w.x)-W/2,d:0}); }
  for(const c in UP){ const u=UP[c]||[]; const f=u[0], m=u[1]; if(!f||!m||!N[f]||!N[m]||!N[c]||N[c].sibof||N[c].kid||N[c].spof) continue;
    const F=N[f], M=N[m], k=f+'|'+m, tp=tparents[c]||[];
    if(F.dep===M.dep){ const L=F.x<M.x?F:M, R=F.x<M.x?M:F, xa=L.x+W/2, xb=R.x-W/2;
      if(xb>xa&&rowClear(F.dep,xa,xb,f,m)){ if(!seen.has(k)){ seen.add(k); MAR.push({f,m,y:F.y+H/2,xa,xb,d:F.dep}); }
        if(tp.length===2||(tp.length===1&&F.dep===N[c].dep+1)) MARC[c]={x:(xa+xb)/2,y:F.y+H/2,f}; continue; } }
    if(tp.length===1){ const t=tp[0], o=t===f?m:f; if(N[o].sibof) continue; const T=N[t], sd=N[o].x>=T.x?1:-1, jx=T.x+sd*(W/2+GX/2), je=T.x+sd*W/2;
      MIX[c]={t,o,jx,jy:T.y+H/2}; MARC[c]={x:jx,y:T.y+H/2,f};
      if(!seen.has(k)){ seen.add(k); MAR.push({f,m,y:T.y+H/2,xa:Math.min(jx,je),xb:Math.max(jx,je),d:T.dep,stub:1}); } } } })();
(function routes(){ const used={}, intoP={}; const TR={}; const COLS=[];
  const trackFree=(key,t,xa,xb)=>{ const L=TR[key+'|'+t]; if(!L) return true; for(const [a,b] of L) if(xa<b+14&&xb>a-14) return false; return true; };
  const take=(key,t,xa,xb)=>{ (TR[key+'|'+t]=TR[key+'|'+t]||[]).push([xa,xb]); };
  const findT=(key,xa,xb)=>{ for(let t=0;t<9;t++) if(trackFree(key,t,Math.min(xa,xb),Math.max(xa,xb))) return t; return -1; };
  const colFree=(x,ya,yb)=>{ const y0_=Math.min(ya,yb), y1_=Math.max(ya,yb); for(const c of COLS) if(Math.abs(c[0]-x)<7&&y0_<c[2]+10&&y1_>c[1]-10) return false; return true; };
  const ord=extra.map((e,k)=>k).filter(k=>N[extra[k][0]]&&N[extra[k][1]]).sort((i,j)=>{ const A=extra[i],B=extra[j]; return Math.abs(N[A[1]].x-N[A[0]].x)-Math.abs(N[B[1]].x-N[B[0]].x); });
  const COUP={}; { const MK={}; for(const r of MAR) if(!r.stub) MK[r.f+'|'+r.m]=r;  // REROUTE1_V1: child of a side-by-side couple, both drawn elsewhere -> one line into the marriage line
    for(const c in UP){ const u=UP[c]||[]; const f=u[0], m=u[1]; if(!f||!m||!N[f]||!N[m]||!N[c]||N[c].sibof||N[c].kid||N[c].spof||(tparents[c]||[]).length) continue;
      const r=MK[f+'|'+m]; if(r) COUP[c]={x:(r.xa+r.xb)/2,y:r.y,f,m}; } }
  const FIRSTP={}, ANCH=[];  // REROUTE1B: a second parent's link starts beside the first parent, never at the child's card
  for(const k of ord){ const [c,p]=extra[k]; const cp=COUP[c]; if(cp&&p!==cp.f) continue; const n=N[c], q=N[p]; const dc=n.dep, dp=q.dep;
    const mx=MIX[c]&&MIX[c].o===p?MIX[c]:null; if(!mx&&MARC[c]&&(UP[c]||[]).includes(p)) continue;  // the marriage line already joins them
    if(!mx&&!cp&&FIRSTP[c]&&FIRSTP[c]!==p){ ANCH.push({c,p,a:FIRSTP[c]}); continue; }  // REROUTE1B
    const side=(cp?cp.x:q.x)>=(mx?mx.jx:n.x)?1:-1; const u=used[c]||0; const sx=mx?mx.jx:n.x+side*(40+u*30), sy0=mx?mx.jy:n.y;
    const ip=intoP[p]||0; const ex=cp?cp.x:q.x-side*(26+ip*16); const ey=cp?cp.y:q.y+H;   // enter the parent's bottom beside its own line
    let pts=null, tk=[];
    if(Math.abs(ex-sx)>STUBX){ if(mx) ANCH.push({c,p,a:mx.t}); else { STUBS.push({c,p,cp}); FIRSTP[c]=FIRSTP[c]||p; } continue; }
    if(dp===dc+1){ const key='g'+dc+'B'; const t=findT(key,sx,ex); if(t>=0){ const ly=q.y+H+58+t*5.5; if(colFree(sx,sy0,ly)){ pts=[[sx,sy0],[sx,ly],[ex,ly],[ex,ey]]; tk=[[key,t,sx,ex]]; } } }
    else { const dlo=dp>dc?dc+1:dp, dhi=dp>dc?dp-1:dc; const kA='g'+dc+'A', kB='g'+(dp-1)+'B';
      const lo=Math.min(sx,ex)-PITCH*3, hi=Math.max(sx,ex)+PITCH*3; const cand=[ex,sx];
      for(let d=dlo;d<=dhi;d++){ const row=rows[d]; if(!row) continue; let i0=0,i1=row.length; while(i0<i1){ const m=(i0+i1)>>1; if(N[row[m]].x<lo-W) i0=m+1; else i1=m; }
        for(let i=i0;i<row.length;i++){ const x=N[row[i]].x; if(x>hi+W) break; for(let o=0;o<5;o++) cand.push(x-W/2-XM-4-o*8, x+W/2+XM+4+o*8); } }
      cand.sort((x,y)=>(Math.abs(x-sx)+Math.abs(ex-x)+Math.abs(x-ex)*0.05)-(Math.abs(y-sx)+Math.abs(ex-y)+Math.abs(y-ex)*0.05));
      for(const xv of cand){ if(xv<lo||xv>hi) continue; if(!freeAt(xv,dlo,dhi)) continue;
        const tA=findT(kA,sx,xv), tB=findT(kB,xv,ex); if(tA<0||tB<0) continue;
        const l1=n.y-58-tA*5.5, l2=q.y+H+58+tB*5.5; if(!colFree(xv,l1,l2)) continue;
        pts=[[sx,sy0],[sx,l1],[xv,l1],[xv,l2],[ex,l2],[ex,ey]]; tk=[[kA,tA,sx,xv],[kB,tB,xv,ex]]; COLS.push([xv,Math.min(l1,l2),Math.max(l1,l2)]); break; } }
    if(!pts){ if(mx) ANCH.push({c,p,a:mx.t}); else { STUBS.push({c,p,cp}); FIRSTP[c]=FIRSTP[c]||p; } continue; }
    used[c]=u+1; if(!cp) intoP[p]=ip+1; FIRSTP[c]=FIRSTP[c]||p; for(const [key,t,xa,xb] of tk) take(key,t,Math.min(xa,xb),Math.max(xa,xb));
    let x0=1e18,x1=-1e18,y0=1e18,y1=-1e18; for(const [x,y] of pts){ x0=Math.min(x0,x); x1=Math.max(x1,x); y0=Math.min(y0,y); y1=Math.max(y1,y); }
    XR.push({c,p,pts,x0,x1,y0,y1,mix:mx?1:0}); }
  // place each stub on the child's top edge where no line leaves the card
  for(const z of ANCH) if(N[z.a]&&N[z.p]) STUBS.push({c:z.c,p:z.p,a:z.a});  // REROUTE1B: stub sits on the first parent's card
  const occ={}; for(const r of XR){ if(r.mix) continue; (occ[r.c]=occ[r.c]||[]).push(r.pts[0][0]-N[r.c].x); }
  for(const t of STUBS){ const ak=t.a||t.c, n=N[ak]; const o=(occ[ak]=occ[ak]||[]); if(n.po&&n.po.length) o.push(0);
    const w=140; let best=null; for(const cxo of [-82,82,-45,45,0]){ if(o.some(x=>Math.abs(x-cxo)<w/2+10)) continue; best=cxo; break; }
    if(best==null) best=-82; t.x=n.x+best; t.w=w; t.h=42; t.y=n.y-50; o.push(best-w/2+8,best,best+w/2-8); }
  for(const id in N){ const n=N[id]; if(!n.sibof) continue; const a_=N[n.sibof]; if(!a_) continue;
    const has=(a_.po&&a_.po.length)||XR.some(r=>r.c===n.sibof)||STUBS.some(t=>t.c===n.sibof); if(has) SIBL.push([id,n.sibof]); }
})();
/* SEEABOVE_V1 (Alter Nov 8 7:56 PM: "a different line going from there to the person that its up there"): every
   "זעה אויבן" stub gets its own dashed amber line with an arrowhead into the one real card. It runs in its own tracks
   just under the row above (clear of the parent lines' tracks), crosses rows in a free column between cards, and is
   drawn behind the cards, so it never covers a name. Tapping the stub flies to the real card, which glows.
   Patch: tasks/b04117ac-a7ad-437b-8b0d-d3a6e5e7d8cf/seeabove_patch.py (idempotent). */
const SEE_COLOR="#B07A0E"; const SEEL=[]; let SEESEL=null;
(function seeRoutes(){ const TRK={}; const hw=(d,t)=>-d*RH-GAP+18+t*5;  // track t in the gap above row d, just under the row above
  const free=(d,t,a,b)=>{ const L=TRK[d+'|'+t]; if(!L) return true; for(const [u,v] of L) if(a<v+40&&b>u-40) return false; return true; };
  const pick=(d,a,b)=>{ const lo=Math.min(a,b), hi=Math.max(a,b); let t=0; for(;t<8;t++) if(free(d,t,lo,hi)) break; if(t===8) t=SEEL.length%8; (TRK[d+'|'+t]=TRK[d+'|'+t]||[]).push([lo,hi]); return t; };
  const col=(xa,dlo,dhi)=>{ if(freeAt(xa,dlo,dhi)) return xa; for(let k=1;k<300;k++) for(const sg of [1,-1]){ const x=xa+sg*k*12; if(freeAt(x,dlo,dhi)) return x; } return xa; };
  for(const t of STUBS){ const n=N[t.a||t.c], q=N[t.p]; if(!n||!q||t.x==null) continue; const dc=n.dep, dp=q.dep;  // REROUTE1B: t.a
    t.lab=dp>dc?"זעה אויבן ⟵":dp===dc?"זעה אויף דער זייט ⟵":"זעה אונטן ⟵";
    const sx=t.x, sy=t.y, up=dp>dc, sg=q.x>sx?-1:1, ex=t.cp&&up?t.cp.x:q.x+sg*62, ey=up?q.y+H:q.y;  // REROUTE1_V1: a couple's stub points into the middle of the couple
    const dA=dc, dB=up?dp-1:dp; let pts;   // gap above the child's row -> gap beside the parent (under it when higher, over it otherwise)
    if(dA===dB){ const y=hw(dA,pick(dA,sx,ex)); pts=[[sx,sy],[sx,y],[ex,y],[ex,ey]]; }
    else { const xv=col(ex+sg*(W/2+XM+40),Math.min(dA,dB)+1,Math.max(dA,dB)); const ya=hw(dA,pick(dA,sx,xv)), yb=hw(dB,pick(dB,xv,ex));
      pts=[[sx,sy],[sx,ya],[xv,ya],[xv,yb],[ex,yb],[ex,ey]]; }
    let x0=1e18,x1=-1e18,y0=1e18,y1=-1e18; for(const [x,y] of pts){ x0=Math.min(x0,x); x1=Math.max(x1,x); y0=Math.min(y0,y); y1=Math.max(y1,y); }
    const r={c:t.c,p:t.p,pts,x0,x1,y0,y1}; SEEL.push(r); t.r=r; } })();
function seeDraw(x0,x1,y0,y1,lw,bold){ if(!SEEL.length||!SET.see) return; const pad=60/s, a=Math.min(60,Math.max(12,10/s)); let on=false;
  for(const r of SEEL){ if(r.x1<x0-pad||r.x0>x1+pad||r.y1<y0-pad||r.y0>y1+pad) continue;
    const hi=!!sel&&(r.c===sel||r.p===sel); if(bold&&!hi) continue;
    if(!on){ on=true; cx.save(); cx.strokeStyle=SEE_COLOR; cx.fillStyle=SEE_COLOR; cx.setLineDash([Math.max(12,9/s),Math.max(8,6/s)]); if(!bold&&s*W<20) cx.globalAlpha*=0.7; }
    cx.lineWidth=bold?Math.max(lw*1.7,3.5/s):Math.max(1.8,lw*0.75); poly(r.pts,22);
    const e=r.pts[r.pts.length-1], f=r.pts[r.pts.length-2], dy=Math.sign(e[1]-f[1])||1;
    if(e[0]<x0-a||e[0]>x1+a||e[1]<y0-a||e[1]>y1+a) continue;
    cx.beginPath(); cx.moveTo(e[0],e[1]); cx.lineTo(e[0]-a*0.62,e[1]-dy*a*1.15); cx.lineTo(e[0]+a*0.62,e[1]-dy*a*1.15); cx.closePath(); cx.fill(); }
  if(on) cx.restore(); }
function seeJump(t){ const sh=document.getElementById("sheet"); if(sh&&sh.classList.contains("on")&&typeof closeSheet==="function") closeSheet();
  const n=N[t.p]; if(!n) return; sel=t.p; SEESEL=t.r||null; PULSE=null; vx=vy=0;
  const s0=s, s1=Math.max(0.6,Math.min(1,s<0.6?0.75:s)), cxs=vw/2, cys=vh*0.45;
  const wa=(cxs-tx)/s0, wb=(cys-ty)/s0, wc=n.x+W/2-W/2, wd=n.y+H/2, dist=Math.hypot(wc-wa,wd-wb);
  const bump=Math.max(0,dist*1.15/vw-(1/s0+1/s1)/2), ms=dist*s0<vw*1.5?700:1700, t0=performance.now();
  anim=()=>{ const k0=Math.min(1,(performance.now()-t0)/ms), k=k0<0.5?4*k0*k0*k0:1-Math.pow(-2*k0+2,3)/2;
    s=1/((1-k)/s0+k/s1+bump*Math.sin(Math.PI*k)); const wx=wa+(wc-wa)*k, wy=wb+(wd-wb)*k; tx=cxs-wx*s; ty=cys-wy*s;
    if(k0>=1){ anim=null; PULSE={id:t.p,t0:performance.now()}; } dirty=true; return true; }; dirty=true; }
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
/* CLEANFACE_V1 (Alter 10:59 PM Nov 8): the closed card shows plain facts, no inline marks or source words; the circle on top carries the certainty. The opened card labels each unverified fact and names whose tree it came from. */
const CF_SW=/(?:געני|Geni|מייהעריטעדזש|MyHeritage|אילן|מצבה|באום|דזשואיש-גען|JewishGen|SSA|בוים|ביימער)/, CF_SRC=/^(?:דער |די |א |אן )?(?:געני|Geni|מייהעריטעדזש|MyHeritage|אילן|מצבה|SSA|דזשואיש-גען|JewishGen)$/;
function CF(t){ if(!t) return t; let s=String(t).replace(/בוימער/g,"ביימער"); s=s.replace(/(^|·\s*)[❓≈?✓]?\s*(?:געני|Geni|מייהעריטעדזש|MyHeritage)\s*:\s*/g,"$1"); s=s.replace(/\s*[–-]\s*[❓≈?]\s*(?:לויט|בלויז)\s[^·]*/g,""); s=s.replace(/\(([^()]*)\)/g,(m,c)=>{ const c2=c.replace(/[❓≈✓?]/g,"").replace(/\s+/g," ").trim(); if(!c2||/^(?:לויט|בלויז)(?:\s|$)/.test(c2)||(CF_SW.test(c2)&&!/\d/.test(c2))) return ""; const it=c2.split(/\s*[,;]\s*/).filter(z=>z&&!CF_SRC.test(z)); return it.length?"("+it.join(", ")+")":""; }); s=s.replace(/\s*[–-]?\s*(?:געני|Geni|MyHeritage|מייהעריטעדזש)\s*[❓≈?✓](?=\s*(?:·|$))/g,""); s=s.replace(/[❓≈✓?]/g,""); return s.replace(/\s+([,;·)])/g,"$1").replace(/\(\s+/g,"(").replace(/\s{2,}/g," ").replace(/(?:\s*·\s*){2,}/g," · ").replace(/^[\s·,;]+|[\s·,;]+$/g,"").trim(); }
function CFT(t){ if(!t) return t; return String(t).split(" · ").filter(x=>!/^\s*(?:[❓≈?✓]|לויט\s|בלויז\s)/.test(x)).map(CF).filter(Boolean).join(" · "); }
const VB=(q)=>`<span class="vb ${q?"q":"a"}">${q?"נישט באשטעטיגט":"בערך"}</span>`;
function HL(t){ return esc(String(t||"").replace(/בוימער/g,"ביימער")).replace(/❓\s*(?:בלויז\s*)?(?:געני|Geni)/g,VB(1)+" לויט געני").replace(/❓/g,VB(1)); }
function OWN(x){ const m=String(x||"").match(/די (?:בוימער|ביימער):\s*([^\n]+)/); if(!m) return ""; let r=m[1].trim(), more=0; const k=r.match(/\s*און נאך (\d+)\s*$/); if(k){ more=+k[1]; r=r.slice(0,k.index); } const a=r.split(/,\s+/).map(z=>z.trim()).filter(Boolean); if(!a.length) return ""; if(a.length===1&&!more) return "לויט דעם בוים פון "+a[0]; const sh=a.slice(0,3), rest=a.length-sh.length+more; return "לויט די ביימער פון "+sh.join(", ")+(rest?" און נאך "+rest:""); }
function VL(l,own){ const t0=String(l).replace(/בוימער/g,"ביימער"), t=t0.trim(); const q=/❓/.test(t), a=!q&&/^(?:•\s*)?≈/.test(t); if(!q&&!a) return esc(t0);
  const b=/^•\s*/.test(t)?"• ":""; const r=t.replace(/^•\s*/,"").replace(/^[❓≈]\s*/,""); const mh=/מייהעריטעדזש|MyHeritage/.test(r), g=/געני|Geni/.test(r); let who="";
  if(mh&&!/(?:דער|דעם) בוים פון|די (?:בוימער|ביימער):/.test(r)&&own) who=own; else if(g&&!mh&&!/^(?:געני|Geni)/.test(r)) who="לויט געני";
  return esc(b)+VB(q)+" "+esc(r).replace(/❓/g,"")+(who?` <span class="vw">(${esc(who)})</span>`:""); }
const TX={}; function txt(id){ if(TX[id]) return TX[id]; const p=P[id]; const por=por_(id);
  // NOCUT_V1 (Alter Nov 8 7:57 PM "What is this cut off?"): nothing on a card is cut with "…". Text flows around the portrait
  // (narrow beside it, full width under it); when it still does not fit, the card's fonts step down until it does.
  const tl0=(p.t||"").replace(/^לויט מסורה( · )?/,""); const rab=RAB.test(p.n||"")||RAB.test(tl0); const tl=CFT(tl0), pn=CF(p.n); const mes=!!p.mes, cr=rab&&!mes;
  const PB=84, MB=34;  // portrait bottom, mark-circle bottom (card units)
  const rxAt=yb=>(por&&yb-15<PB)?W-83:W-13;
  const wAt=(yb,k)=>rxAt(yb)-(yb-15<MB?34:13)-(k?12:0);
  const wrapV=(t,font,y0,lh,first)=>{ cx.font=font; const w=String(t||"").split(/\s+/).filter(Boolean); const out=[]; let cur="", yb=y0;
    for(const x of w){ const tr=cur?cur+" "+x:x; if(!cur||cx.measureText(tr).width<=wAt(yb,first&&!out.length)) cur=tr; else { out.push([cur,yb]); cur=x; yb+=lh; }
      while(cx.measureText(cur).width>wAt(yb,first&&!out.length)&&cur.length>1){ let k=cur.length-1; while(k>1&&cx.measureText(cur.slice(0,k)).width>wAt(yb,first&&!out.length)) k--; out.push([cur.slice(0,k),yb]); cur=cur.slice(k); yb+=lh; } }  // a word wider than the card (a link) breaks inside
    if(cur) out.push([cur,yb]); return out; };
  let R=null;
  for(const f of [1,0.94,0.88,0.82,0.76,0.7,0.64,0.58,0.52]){ const out=[];
    let nm=[], nz=17*f, nf="";
    for(const z0 of [17,15.5,14]){ nz=z0*f; nf='700 '+nz+'px FRL, "Frank Ruhl Libre", serif'; nm=wrapV(pn,nf,13+nz,nz*1.22,cr); if(nm.length<=3) break; }
    nm.forEach(([t,yb],k)=>out.push({t,yb,f:nf,c:0,k:k===0&&cr}));
    let yy=nm.length?nm[nm.length-1][1]+nz*1.22+2:30; const lh=17*f;
    const FTf='italic 400 '+(13.5*f)+'px FRL, "Frank Ruhl Libre", serif', FDf='400 '+(13*f)+'px FRL, "Frank Ruhl Libre", serif';
    if(mes){ out.push({t:"לויט מסורה",yb:yy,f:'600 '+(12.5*f)+'px FRL, serif',c:2}); yy+=18*f; }
    else if(tl){ const ls=wrapV(tl,FTf,yy,lh); for(const [t,yb] of ls) out.push({t,yb,f:FTf,c:rab?2:1}); yy+=ls.length*lh; }
    const bl=[]; let yb=yy+2;
    for(const t of [CF(p.pl),CF(p.d)]){ if(!t) continue; const ls=wrapV(t,FDf,yb,lh); for(const [u,v] of ls) bl.push({t:u,yb:v,f:FDf,c:3}); yb+=ls.length*lh; }
    const all=out.concat(bl), lastb=all.length?all[all.length-1].yb:30; let ok=lastb<=H-9;
    if(ok) for(const o of all){ cx.font=o.f; if(cx.measureText(o.t).width>wAt(o.yb,o.k)+0.5){ ok=false; break; } }
    if(ok||f<0.53){ if(bl.length){ const sh=Math.max(0,(H-12)-lastb); for(const o of bl) o.yb+=sh; }
      for(const o of all) o.rx=rxAt(o.yb); R={L:all,fs:f,ok}; break; } }
  return TX[id]={L:R.L,fs:R.fs,ok:R.ok,rab,cr,por}; }
/* LATESTPIC_V1 (Alter 2:43 PM Nov 9): the card front shows the latest dated picture of the person; order is set at build by latestpic_patch.py (publish2.py); all other pictures stay in the opened card */
function meds(id){ const p=P[id]; if(p.media) return p.media.map(m=>({f:m.f,k:(m.k||"x")[0],cap:m.cap,cr:m.cr,u:m.u}));
  return (p.md||[]).map((m,i)=>({f:m[0],k:m[1],det:i})); }
function por_(id){ const m=meds(id).find(x=>x.k==="p"); return m||null; }
const isURI=f=>/^data:|\//.test(f)&&!/^[mtz]\//.test(f);
const AB="../";  /* LIBBY: pictures from the main folder; d/ + yz.json are answered decrypted by libby.js */  // tab.bot copy reads pictures + detail chunks from the GitHub Pages copy
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
  const gapTop=RH-H, rad=16, lw=Math.max(2.2,1.2/s), mo=Math.min(11,Math.max(4.5,2.4/s));
  const link=(n,q,p,bold)=>{ const ya=n.y, yb=q.y+H, lane=n.y-gapTop*(n.lof||0.5); cx.strokeStyle=n.id?lc(n.id):lc(p); /* LINECOLORS_V1: the child's family colour; LINEFIX1_V1 */ cx.lineWidth=bold?lw*2.4:lw; cx.beginPath(); cx.moveTo(n.x,ya);
    if(Math.abs(q.x-n.x)<1) cx.lineTo(q.x,yb);
    else { const sg=q.x>n.x?1:-1, r=Math.min(rad,Math.abs(q.x-n.x)/2); cx.lineTo(n.x,lane+r); cx.quadraticCurveTo(n.x,lane,n.x+sg*r,lane); cx.lineTo(q.x-sg*r,lane); cx.quadraticCurveTo(q.x,lane,q.x,lane-r); cx.lineTo(q.x,yb); }
    cx.stroke(); };
  // a child of Alter's family: up to the lane, across to the middle of the couple, up to the marriage line
  // marriage: gold double line between husband and wife + the ⚭ rings (in the gap between the two cards)
  const ring=(x,y)=>{ const r=Math.min(18,Math.max(9,5/s)), o=r*0.5; cx.lineWidth=Math.max(2,lw*0.9); cx.strokeStyle=C.mar; cx.fillStyle=C.card;
    cx.beginPath(); cx.arc(x-o,y,r,0,7); cx.fill(); cx.beginPath(); cx.arc(x+o,y,r,0,7); cx.fill(); cx.beginPath(); cx.arc(x-o,y,r,0,7); cx.stroke(); cx.beginPath(); cx.arc(x+o,y,r,0,7); cx.stroke(); };
  const marLines=(only)=>{ const lod_=s*W; cx.strokeStyle=C.gold;
    for(const g of MAR){ if(only&&g.f!==only&&g.m!==only) continue; if(g.xb<x0-40||g.xa>x1+40||g.y<y0-H||g.y>y1+H) continue;
      { const F=N[g.f], M=N[g.m], cf=lc(g.f), cm=lc(g.m); if(cf===cm||!F||!M) cx.strokeStyle=cf; else { const gr=cx.createLinearGradient(g.xa,0,g.xb,0); const fl=F.x<=M.x; gr.addColorStop(0,fl?cf:cm); gr.addColorStop(1,fl?cm:cf); cx.strokeStyle=gr; } }  // LINECOLORS_V1: his colour blending into hers
      cx.lineWidth=(only?2.2:1)*Math.max(2,lw*0.9); cx.beginPath(); cx.moveTo(g.xa,g.y-mo); cx.lineTo(g.xb,g.y-mo); cx.moveTo(g.xa,g.y+mo); cx.lineTo(g.xb,g.y+mo); cx.stroke();
      if(lod_<22) continue; const L=g.xb-g.xa;
      if(g.stub){ ring((g.xa+g.xb)/2,g.y); continue; }
      ring((g.xa+g.xb)/2,g.y); if(L>900){ ring(g.xa+70,g.y); ring(g.xb-70,g.y); }
      if(L>7000){ const st=3200, a0=Math.max(g.xa+st,Math.floor((x0-g.xa)/st)*st+g.xa), a1=Math.min(g.xb-st,x1+st); for(let xr=a0;xr<=a1;xr+=st) if(Math.abs(xr-(g.xa+g.xb)/2)>st/2) ring(xr,g.y); } } };
  const kidLink=(k,bold)=>{ const h=N[ROOT], w=FAM.sp&&N[FAM.sp]; const xm=w?(h.x+w.x)/2:h.x, ym=w?h.y+H/2+4:h.y+H; link(N[k],{x:xm,y:ym-H},ROOT,bold); };
  cx.lineJoin="round"; cx.lineCap="round"; cx.globalAlpha=s<0.1?0.6:0.85;
  for(let d=Math.max(minDep,d0-1);d<=d1;d++){ const row=rows[d]; if(!row) continue;
    for(const id of row){ const n=N[id]; if(!n.po||!n.po.length) continue;
      const mc=MARC[id]; if(mc){ if(Math.max(mc.x,n.x)<x0-W||Math.min(mc.x,n.x)>x1+W) continue; link(n,{x:mc.x,y:mc.y+mo-H},mc.f,false); continue; }
      for(const [p] of n.po){ const q=N[p]; if(Math.max(q.x,n.x)<x0-W||Math.min(q.x,n.x)>x1+W) continue; link(n,q,p,false); } } }
  // further lines of descent into the one card (each person once) + sibling brackets
  for(const r of XR){ if(r.x1<x0-W||r.x0>x1+W||r.y1<y0-H||r.y0>y1+H) continue; cx.strokeStyle=lc(r.c); cx.lineWidth=lw; poly(r.pts,rad); }  // LINECOLORS_V1
  seeDraw(x0,x1,y0,y1,lw,false);  // SEEABOVE_V1
  for(const [sb,an] of SIBL){ const n2=N[sb],a3=N[an]; if(Math.max(n2.x,a3.x)<x0-W||Math.min(n2.x,a3.x)>x1+W) continue; cx.strokeStyle=bc(an); cx.lineWidth=lw*0.8; cx.setLineDash([2,0]); poly([[n2.x,n2.y],[n2.x,n2.y-GAP/2],[a3.x,a3.y-GAP/2]],rad); }
  marLines(false);
  for(const k of KIDS) kidLink(k,false);
  cx.globalAlpha=1;
  if(sel&&N[sel]){ const n=N[sel]; const up1=cid=>{ const cn=N[cid], mc=MARC[cid]; if(mc) link(cn,{x:mc.x,y:mc.y+mo-H},mc.f,true); else for(const [p] of cn.po||[]) link(cn,N[p],p,true); };
    up1(sel); if(n.ch&&N[n.ch]){ if(MARC[n.ch]) up1(n.ch); else link(N[n.ch],n,sel,true); } marLines(sel);
    for(const k of KIDS) if(sel===k||sel===ROOT||(FAM&&sel===FAM.sp)) kidLink(k,true);
    for(const r of XR){ if(r.c===sel||r.p===sel){ cx.strokeStyle=lc(r.c); cx.lineWidth=lw*2.4; poly(r.pts,rad); } }
    for(const [sb,an] of SIBL){ if(sb===sel||an===sel){ const n2=N[sb],a3=N[an]; cx.strokeStyle=bc(an); cx.lineWidth=lw*1.8; poly([[n2.x,n2.y],[n2.x,n2.y-GAP/2],[a3.x,a3.y-GAP/2]],rad); } } }
  seeDraw(x0,x1,y0,y1,lw,true);  // SEEABOVE_V1: the tapped card's "see above" lines, bold
  const lod=s*W; let drawn=0; sprUse++; sprMiss=0; sprT=performance.now()+(ptr.size||anim?7:14);
  for(let d=d0;d<=d1;d++){ const row=rows[d]; if(!row) continue;
    let lo=0,hi=row.length; while(lo<hi){ const m=(lo+hi)>>1; if(N[row[m]].x+W/2<x0) lo=m+1; else hi=m; }
    for(let i=lo;i<row.length;i++){ const id=row[i], n=N[id]; if(n.x-W/2>x1) break; drawn++; if(lod>=FULLD) card(id,n,lod); else cardS(id,n,lod); } }
  if(sprMiss) dirty=true;
  if(PULSE) pulse();
  // dashed stubs for the rare far-away second line: tap flies to the one real card
  if(STUBS.length&&lod>=20){ for(const t of STUBS){ if(t.x+t.w/2<x0||t.x-t.w/2>x1||t.y+t.h<y0||t.y>y1) continue;
      cx.save(); cx.setLineDash([6,5]); cx.lineWidth=Math.max(1.6,1.2/s); cx.strokeStyle=bc(t.p); cx.fillStyle="rgba(255,250,240,.96)"; rr(t.x-t.w/2,t.y,t.w,t.h,10); cx.fill(); cx.stroke(); cx.setLineDash([]);
      cx.fillStyle=C.ink; cx.textAlign="center"; cx.textBaseline="middle"; cx.direction="rtl"; cx.font='700 13px FRL, "Frank Ruhl Libre", serif'; cx.fillText(t.lab||"זעה אויבן ⟵",t.x,t.y+14);
      let fs=11.5; const nm=P[t.p].n; cx.font='400 '+fs+'px FRL, serif'; while(cx.measureText(nm).width>t.w-12&&fs>7){ fs-=0.5; cx.font='400 '+fs+'px FRL, serif'; } cx.fillStyle=C.ink2; cx.fillText(nm,t.x,t.y+32); cx.restore(); } }
  return drawn; }
function card(id,n,lod){ const p=P[id], x=n.x-W/2, y=n.y, m=p.m||"unv", mes=p.mes, root=id===ROOT, col=bc(id);
  const hl=wnOn&&NEWSET.has(id);
  if(hl){ cx.save(); cx.shadowColor="rgba(214,170,60,.9)"; cx.shadowBlur=28*Math.min(1,s*2)+6; cx.fillStyle="rgba(230,190,90,.55)"; rr(x-10,y-10,W+20,H+20,16); cx.fill(); cx.restore();
    cx.lineWidth=Math.max(3,3/s); cx.strokeStyle="#c9a35c"; rr(x-7,y-7,W+14,H+14,14); cx.stroke(); }
  cx.fillStyle="rgba(80,55,20,.10)"; rr(x+1,y+3,W,H,10); cx.fill();   // soft shadow (no blur)
  rr(x,y,W,H,10); cx.fillStyle=cardBg(id,x); cx.fill();
  cx.lineWidth=Math.max(1,0.9/s); cx.strokeStyle=id===sel?C.sel:root?C.gold:C.edge; if(mes) cx.setLineDash([5,4]); cx.stroke(); cx.setLineDash([]);
  if(id===sel||root){ cx.lineWidth=Math.max(2,2/s); cx.strokeStyle=C.sel; rr(x-2,y-2,W+4,H+4,12); cx.stroke(); }
  // family-colour top edge
  cx.save(); rr(x,y,W,H,10); cx.clip(); cx.fillStyle=col; cx.fillRect(x,y,W,root?7:5); cx.restore();
  const T=txt(id); let rx=x+W-13;
  if(T.por){ const R=30, pcx=x+W-13-R, pcy=y+16+R+4;
    { const im=img(SRC(T.por.f,"m")); cx.save(); cx.beginPath(); cx.arc(pcx,pcy,R,0,7); cx.closePath(); cx.clip();
      if(im){ const r=Math.max(2*R/im.width,2*R/im.height); cx.drawImage(im,pcx-im.width*r/2,pcy-R-(im.height*r-2*R)*0.2,im.width*r,im.height*r); } else { cx.fillStyle="#efe5cf"; cx.fill(); }
      cx.restore(); cx.beginPath(); cx.arc(pcx,pcy,R,0,7); cx.lineWidth=Math.max(1.2,1/s); cx.strokeStyle=col; cx.stroke(); }
    rx=x+W-13-2*R-10; }
  cx.direction="rtl"; cx.textAlign="right"; cx.textBaseline="alphabetic";
  { const CL=[C.ink,C.ink2,C.gold,C.date]; if(T.cr&&T.L.length){ const o=T.L[0]; crest(x+o.rx-4,y+o.yb-6,4.4*Math.max(0.8,T.fs)); }
    for(const o of T.L){ cx.font=o.f; cx.fillStyle=CL[o.c]; cx.fillText(o.t,x+o.rx-(o.k?12:0),y+o.yb); } }  // NOCUT_V1
  cx.direction="ltr";
  markAt(x+18,y+21,m,10.5); if(hl) newBadge(x+W-8,y-6,1); }
/* ---------- full cards at every zoom (Alter Nov 8 7:08 PM): below FULLD (card width on screen, css px) each card is its own
   full drawing kept as a small bitmap and scaled — same content, just smaller. Bitmaps are made on demand (a time budget per frame),
   pre-made when idle, and dropped least-recently-used past SPMAX bytes. ---------- */
const FULLD=90, SPB=[24,32,48,64,96,128,192], SPR=new Map(), SPMAX=56e6, SPAD=8; let sprBytes=0, sprUse=0, sprT=0, sprMiss=0;
function sprB(dw){ for(const b of SPB) if(b>=dw) return b; return SPB[SPB.length-1]; }
function sprMake(id,B){ const n=N[id], k=B/W, cw=Math.ceil((W+2*SPAD)*k), ch=Math.ceil((H+2*SPAD)*k);
  const cvs=document.createElement("canvas"); cvs.width=cw; cvs.height=ch; const g=cvs.getContext("2d");
  const o={c:cvs,w:cw/k,h:ch/k,pend:null,u:sprUse,b:cw*ch*4};
  const sv=cx, ss=s, ssel=sel, swn=wnOn; cx=g; s=k/dpr; sel=null; wnOn=false;
  try{ g.setTransform(k,0,0,k,(SPAD-(n.x-W/2))*k,(SPAD-n.y)*k); card(id,n,999);
    const T=txt(id); if(T.por){ const src=SRC(T.por.f,"m"); if(!(IMG[src]&&IMG[src].ok)) o.pend=src; } }
  finally{ cx=sv; s=ss; sel=ssel; wnOn=swn; }
  const key=id+"|"+B, old=SPR.get(key); if(old) sprBytes-=old.b; SPR.set(key,o); sprBytes+=o.b; if(sprBytes>SPMAX) sprTrim(); return o; }
function sprTrim(){ const e=[...SPR.entries()].sort((p,q)=>p[1].u-q[1].u); for(const [k,o] of e){ if(sprBytes<SPMAX*0.7) break; if(o.u>=sprUse) continue; SPR.delete(k); sprBytes-=o.b; } }
function sprAny(id,B){ let best=null, bd=1e9; for(const b of SPB){ const o=SPR.get(id+"|"+b); if(o){ const d=b>=B?b-B:(B-b)*3; if(d<bd){ bd=d; best=o; } } } return best; }
function cardS(id,n,lod){ const x=n.x-W/2, y=n.y, B=sprB(lod*dpr); let o=SPR.get(id+"|"+B);
  const stale=o&&o.pend&&IMG[o.pend]&&IMG[o.pend].ok;
  if(!o||stale){ if(performance.now()<sprT) o=sprMake(id,B); else { sprMiss++; if(!o) o=sprAny(id,B); } }
  const hl=wnOn&&NEWSET.has(id);
  if(hl){ cx.save(); cx.shadowColor="rgba(214,170,60,.9)"; cx.shadowBlur=28*Math.min(1,s*2)+6; cx.fillStyle="rgba(230,190,90,.55)"; rr(x-10,y-10,W+20,H+20,16); cx.fill(); cx.restore();
    cx.lineWidth=Math.max(3,3/s); cx.strokeStyle="#c9a35c"; rr(x-7,y-7,W+14,H+14,14); cx.stroke(); }
  if(o){ o.u=sprUse; cx.drawImage(o.c,x-SPAD,y-SPAD,o.w,o.h); }
  else { cx.fillStyle=cardBg(id,x); cx.fillRect(x,y,W,H); cx.fillStyle=bc(id); cx.fillRect(x,y,W,14); }
  if(id===sel){ cx.lineWidth=Math.max(2,2/s); cx.strokeStyle=C.sel; rr(x-2,y-2,W+4,H+4,12); cx.stroke(); }
  if(hl) newBadge(x+W-6,y-14,1.8); }
let warmed=false;
function sprWarm(){ const ids=Object.keys(N); let i=0; const B=sprB(28*dpr);
  const step=()=>{ const end=performance.now()+8; while(i<ids.length&&performance.now()<end){ const id=ids[i++]; if(!SPR.has(id+"|"+B)) sprMake(id,B); } if(i<ids.length) sched(); };
  const sched=()=>{ if(window.requestIdleCallback) requestIdleCallback(step,{timeout:3000}); else setTimeout(step,40); };
  setTimeout(sched,700); }
/* ---------- side pills: jump to each grandparent ---------- */
let PULSE=null;
function pulse(){ const n=N[PULSE.id], k=(performance.now()-PULSE.t0)/2600; if(!n||k>=1){ PULSE=null; dirty=true; return; }
  const a=Math.max(0,Math.sin(k*Math.PI*3))*(1-k*0.5), x=n.x-W/2, y=n.y, gr=10+18*a;
  cx.save(); cx.globalAlpha=0.35+0.65*a; cx.shadowColor="rgba(240,180,40,.95)"; cx.shadowBlur=24; cx.lineWidth=Math.max(5,4/s); cx.strokeStyle="#e8a91c";
  rr(x-gr,y-gr,W+2*gr,H+2*gr,14+gr*0.4); cx.stroke(); cx.restore(); dirty=true; }
function pillId(grp,it){ if(it.id) return N[it.id]?it.id:null; let id=grp.from==="wife"?(FAM&&FAM.sp):ROOT;
  for(const k of it.path){ if(!id) break; const u=UP[id]||[]; id=u[k]||null; } if(id&&N[id]) return id;
  for(const a of it.alt||[]) if(N[a]) return a;
  if(it.name){ const m=Object.keys(N).filter(k=>String(P[k].n||"").includes(it.name)); if(m.length===1) return m[0]; } return null; }
function pillName(it,id){ let l=it.label||(it.path[it.path.length-1]?"באבע":"זיידע"); if(!id||/\s/.test(l)) return l;
  const nm=String(P[id].n||"").split(/\s[–-]\s/)[0].replace(/\s*(שליט"א|ע"ה|ז"ל|זצ"ל|זצוק"ל|הי"ד|נ"ע)\s*/g," ").trim().split(/\s+/); return l+" "+(nm[nm.length-1]||""); }
function pillJump(id){ const sh=document.getElementById("sheet"); if(sh&&sh.classList.contains("on")&&typeof closeSheet==="function") closeSheet();
  sel=id; const n=N[id]; const ns=Math.max(0.6,Math.min(1,s<0.6?0.75:s)); const pb=document.getElementById("pills"), pr=pb&&!pb.classList.contains("shut")?pb.getBoundingClientRect().right:0, cxs=pr&&vw<900?(vw+pr)/2:vw/2;
  animTo(ns,cxs-n.x*ns,vh*0.45-(n.y+H/2)*ns,Math.min(1400,700+Math.hypot(vw/2-n.x*s-tx,vh/2-n.y*s-ty)*0.15));
  PULSE={id,t0:performance.now()}; dirty=true; }
(function pills(){ const box=document.createElement("div"); box.id="pills"; box.setAttribute("dir","rtl");
  const PK="yichus_pills_v1"; let shut=false; try{ shut=localStorage.getItem(PK)==="0"; }catch(e){}
  const tog=document.createElement("button"); tog.className="pltog"; tog.type="button";
  const body=document.createElement("div"); body.className="plbody";
  const setShut=v=>{ shut=v; box.classList.toggle("shut",v); tog.textContent=v?"זיידעס ›":"‹ באהאלט"; tog.title=v?"ווייז די זיידעס און באבעס":"באהאלט"; try{ localStorage.setItem(PK,v?"0":"1"); }catch(e){} };
  tog.onclick=()=>setShut(!shut);
  for(const grp of PILLS){ const h=document.createElement("div"); h.className="plh"; h.textContent=grp.g; body.appendChild(h);
    for(const it of grp.items){ const id=pillId(grp,it); const b=document.createElement("button"); b.type="button"; b.className="pill"+(id?"":" unk");
      const t1=document.createElement("b"); t1.textContent=pillName(it,id); b.appendChild(t1);
      if(!id){ const t2=document.createElement("small"); t2.textContent="נאך נישט באקאנט"; b.appendChild(t2); }
      if(id){ b.style.setProperty("--pc",bc(id)); b.title=(it.rel?it.rel+" · ":"")+P[id].n; b.onclick=()=>pillJump(id); } else { b.disabled=true; b.title=(it.rel||"")+" · נאך נישט באקאנט"; }
      body.appendChild(b); } }
  box.appendChild(tog); box.appendChild(body); document.body.appendChild(box); setShut(shut); })();
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
    const st=hitStub(e.clientX,e.clientY); if(st){ seeJump(st); } else if(id){ openSheet(id); } else if(now-lastTap<320){ zoomTo(e.clientX,e.clientY,Math.min(3,s*2.2)); } lastTap=now; } }
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
function head(id,p){ const m=p.m||"unv"; return (!N[id]&&P[id]&&P[id].sibof?`<p class="hidn">דער קארטל איז באהאלטן אינעם בוים (געשוויסטער ווערן נישט געוויזן). <button type="button" data-sibon>ווייז געשוויסטער</button></p>`:"")+(p.mes?`<div class="mesl">לויט מסורה</div>`:"")+`<h1>${esc(p.n)}</h1>`+(p.t&&p.t!=="לויט מסורה"?`<p class="ti">${HL(p.t.replace(/^לויט מסורה · /,""))}</p>`:"")+
  ((p.d||p.pl)?`<p class="meta">${HL([p.d,p.pl].filter(Boolean).join(" · "))}</p>`:"")+`<div class="mark"><span class="dot ${m}">${(MKC[m]||MKC.unv)[1]}</span>${esc(MKN[m]||"")}</div>`; }
function body(id,p){ let h=""; const u=UP[id]||[];
  const ms=(p.media||[]).length?p.media.map(x=>({f:x.f,cap:x.cap,cr:x.cr,u:x.u})):[]; curMed=ms;
  const NP=new Set(((LN&&LN.ids[id]&&LN.ids[id].p)||[])); const isNP=f=>wnOn&&(NP.has(f)||NP.has(String(f).replace(/^m\//,"").replace(/\.jpg$/,"")));
  if(ms.length) h+=`<div class="gal">`+ms.map((x,i)=>`<figure data-i="${i}" class="${isNP(x.f)?"nw":""}">${isNP(x.f)?'<span class="nwb">נייַ</span>':""}<img loading="lazy" decoding="async" src="${esc(SRC(x.f,"t"))}" alt=""><figcaption>${esc(x.cap||"")}</figcaption></figure>`).join("")+`</div>${ms.length>1?`<div class="gn">${ms.length} בילדער</div>`:""}`;
  h+=`<div class="fam">`; if(u[0]&&P[u[0]]) h+=`<div><b>טאטע</b><span>${nameLink(u[0])}</span></div>`; if(u[1]&&P[u[1]]) h+=`<div><b>מאמע</b><span>${nameLink(u[1])}</span></div>`;
  const ks=(kids[id]||[]).filter(c=>P[c]); if(ks.length) h+=`<div><b>קינדער</b><span>${ks.map(nameLink).join(" · ")}</span></div>`;
  const sp=[]; for(const c of ks){ const cu=UP[c]||[]; const o=cu[0]===id?cu[1]:cu[0]; if(o&&P[o]&&!sp.includes(o)) sp.push(o); } if(sp.length) h+=`<div><b>זיווג</b><span>${sp.map(nameLink).join(" · ")}</span></div>`;
  if(p.sibof&&P[p.sibof]) h+=`<div><b>געשוויסטער</b><span>${nameLink(p.sibof)}</span></div>`; const ss=(SIBALL[id]||[]); if(ss.length) h+=`<div><b>געשוויסטער</b><span>${ss.map(nameLink).join(" · ")}</span></div>`;
  h+=`</div>`;
  const lm=LM[id]; if(lm&&lm[1]) h+=`<p class="note2">${esc(lm[1])}</p>`;
  if(p.inhw) h+=`<p class="note2">${esc(p.inhw)}</p>`;
  const NI=LN&&LN.ids[id]; const nf=new Set(((NI&&NI.f)||[]).map(t=>t.trim()));
  if(NI&&wnOn) h=`<p class="note2" style="color:#8a6a2c"><span class="nwb">נייַ</span> ${NI.c?"א נייַער קאַרטל · ":""}${(NI.f||[]).length} נייַע פאַקטן${(NI.p||[]).length?" · "+NI.p.length+" נייַע בילדער":""} (<bdi dir="ltr">${esc(LN.date)}</bdi>)</p>`+h;
  if(p.x){ const own=OWN(p.x); h+=`<div class="tx">`+p.x.split("\n").filter(l=>l.trim()).map(l=>{ const isN=wnOn&&nf.has(l.trim()); return `<div class="ln${isN?" nw":""}">${isN?'<span class="nwb">נייַ</span>':""}${VL(l,own)}</div>`; }).join("")+`</div>`; }
  if(p.src) h+=`<div class="src">${HL(p.src)}</div>`;
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
  document.getElementById("zc").textContent=(m.cap||"")+(m.cr?" — "+m.cr:""); document.getElementById("zn").textContent=curMed.length>1?(zI+1)+" / "+curMed.length:""; zv.classList.toggle("zmany",curMed.length>1);
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
/* PICSGRID_V1: arrow buttons in the big view + wheel scrolls horizontal strips (Alter Nov 9) */
(function(){ const mk=(id,t,lab,d)=>{ const b=document.createElement("button"); b.id=id; b.type="button"; b.className="znav"; b.textContent=t; b.setAttribute("aria-label",lab); b.onclick=ev=>{ ev.stopPropagation(); if(curMed.length>1) openZoom(zI+d); }; zv.appendChild(b); };
  mk("znx","‹","קומענדיקע בילד",1); mk("znp","›","פריערדיקע בילד",-1);
  document.addEventListener("wheel",e=>{ if(e.ctrlKey) return; let el=e.target; const d=(Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY)*(e.deltaMode===1?16:1); if(!d) return;
    while(el&&el.nodeType===1&&el!==document.body){ if(el.scrollWidth>el.clientWidth+2){ const cs=getComputedStyle(el); const ox=cs.overflowX; if((ox==="auto"||ox==="scroll")&&el.scrollHeight<=el.clientHeight+2){ const rtl=cs.direction==="rtl"; const b0=el.scrollLeft; el.scrollLeft+=(rtl&&Math.abs(e.deltaX)<=Math.abs(e.deltaY))?-d:d; if(el.scrollLeft!==b0){ e.preventDefault(); return; } } } el=el.parentElement; } },{passive:false}); })();
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
  { const lb=document.createElement("label"); lb.className="sw"; lb.innerHTML='<input type="checkbox" id="s_see"><span class="tg"></span><span class="stl">ליניעס צו \'זעה אויבן\'<small>א געשטריכלטע ליניע פון יעדן \'זעה אויבן\' ביז צום קארטל פון דער מענטש (<span id="s_seen"></span> ליניעס)</small></span>';
    pn.appendChild(lb); const c2=lb.querySelector("input"); c2.checked=!!SET.see; lb.querySelector("#s_seen").textContent=SEEL.length;
    c2.onchange=()=>{ SET.see=c2.checked; saveSet(); dirty=true; }; }  // SEEABOVE_TOGGLE_V1
  { /* STATS_V1 (Alter 9:57 PM Nov 8): how many people, how many with a face picture, how many with a known kever – counted from the data at page load */
    const ids=Object.keys(P).filter(id=>!P[id].sibof), n=ids.length, hasQ=ids.some(id=>P[id].q);
    const cnt=ch=>ids.filter(id=>{ const p=P[id]; if(hasQ) return (p.q||"").includes(ch); const md=p.md||[]; return ch==="i"?md.length>0:md.some(m=>m[1]===(ch==="f"?"p":"k")); }).length;
    const pc=k=>n?" ("+(Math.round(k*1000/n)/10)+"%)":"";
    const nf=cnt("f"), nk=cnt("k"), ni=cnt("i"), fm=v=>v.toLocaleString("en-US");
    const row=(a,b,c)=>`<div style="display:flex;justify-content:space-between;gap:10px;padding:5px 0;border-top:1px solid rgba(0,0,0,.08)"><span>${a}</span><span style="white-space:nowrap;font-weight:700">${b}<small style="font-weight:400;opacity:.75">${c||""}</small></span></div>`;
    const bx=document.createElement("div"); bx.id="s_stats"; bx.style.cssText="margin:12px 0 4px;padding:10px 12px;border-radius:12px;background:rgba(120,100,60,.08);font-size:15px;line-height:1.35";
    bx.innerHTML=`<b style="display:block;margin-bottom:4px">סטאטיסטיק</b>`+row("סך הכל מענטשן",fm(n))+row("מיט א פנים (א בילד פון דעם מענטש)",fm(nf),pc(nf))+row("מיט א באקאנטן קבר",fm(nk),pc(nk))+row("מיט עפעס א בילד",fm(ni),pc(ni))+/* STATS_V2 */(()=>{ const mk=id=>{ const m=P[id].m||"unv"; return MKC[m]?m:"unv"; }, c={ok:0,inf:0,unv:0,alt:0}; ids.forEach(id=>c[mk(id)]++); return `<div style="margin-top:6px"></div>`+row("זיכער (✓)",fm(c.ok),pc(c.ok))+row("בערך (≈)",fm(c.inf),pc(c.inf))+row("נישט באשטעטיגט (?)",fm(c.unv),pc(c.unv))+row("פון אלטר אליין (א)",fm(c.alt),pc(c.alt)); })()+
      `<small style="display:block;margin-top:6px;opacity:.7">די צאלן רעכענען זיך אויס פון אלע קארטלעך יעדעס מאל ווען דער בלאט עפנט זיך (אחוץ די געשוויסטער)</small>`;
    pn.appendChild(bx); }  // STATS_V1
  window.__yset=apply; })();
/* ---------- start: centred on Alter at a readable zoom ---------- */
home(); loop();
(function fromHash(){ const h=decodeURIComponent(location.hash.slice(1)); if(!h) return; const [id,z]=h.split("/"); if(!P[id]) return; if(N[id]) focus(id,Math.max(0.75,s)); openSheet(id);
  if(z&&z[0]==="z") details(id).then(()=>setTimeout(()=>openZoom(+z.slice(1)||0),120)); })();
if(document.fonts&&document.fonts.load){ document.fonts.load(FN).then(()=>{ for(const k in TX) delete TX[k]; SPR.clear(); sprBytes=0; dirty=true; sprWarm(); }); }
window.__yt={N,rows,maxDep,draw,s:()=>s,focus,openSheet,openZoom,home};

/* YAHRZEIT_V1 (Alter 12:36 PM Nov 9 "I should see in setting evrey yortzeit"): ⚙ → "יאָרצייטן" — every yahrzeit on the site (yz.json, built by yahrzeit_patch.py --index), upcoming first from today's Hebrew date */
(function(){
  const pn=document.getElementById("setp"), gear=document.getElementById("gear"); if(!pn||document.getElementById("yzb")) return;
  /* Hebrew calendar (Reingold/Dershowitz), days counted as RD */
  const EP=-1373427, lp=y=>((7*y+1)%19)<7;
  const el=y=>{ const m=Math.floor((235*y-234)/19), pa=12084+13753*m; let d=m*29+Math.floor(pa/25920); if((3*(d+1))%7<3) d++; return d; };
  const dl=y=>{ const a=el(y-1), b=el(y), c=el(y+1); return c-b===356?2:(b-a===382?1:0); };
  const NY=y=>EP+el(y)+dl(y), DY=y=>NY(y+1)-NY(y);
  const LD=(m,y)=>([2,4,6,10,13].includes(m)||(m===12&&!lp(y))||(m===8&&![355,385].includes(DY(y)))||(m===9&&[353,383].includes(DY(y))))?29:30;
  const LM=y=>lp(y)?13:12;
  const FX=(y,m,d)=>{ let r=NY(y)+d-1; if(m<7){ for(let i=7;i<=LM(y);i++) r+=LD(i,y); for(let i=1;i<m;i++) r+=LD(i,y); } else { for(let i=7;i<m;i++) r+=LD(i,y); } return r; };
  const HF=rd=>{ let y=Math.floor((rd-EP)/(35975351/98496)); while(NY(y+1)<=rd) y++; while(NY(y)>rd) y--; let m=rd<FX(y,1,1)?7:1; while(rd>FX(y,m,LD(m,y))) m++; return [y,m,rd-FX(y,m,1)+1]; };
  const RD=dt=>Math.floor(Date.UTC(dt.getFullYear(),dt.getMonth(),dt.getDate())/864e5)+719163;
  const HN=n=>{ let o=""; for(const [v,c] of [[400,"ת"],[300,"ש"],[200,"ר"],[100,"ק"],[90,"צ"],[80,"פ"],[70,"ע"],[60,"ס"],[50,"נ"],[40,"מ"],[30,"ל"],[20,"כ"],[10,"י"],[9,"ט"],[8,"ח"],[7,"ז"],[6,"ו"],[5,"ה"],[4,"ד"],[3,"ג"],[2,"ב"],[1,"א"]]) while(n>=v){ o+=c; n-=v; }
    o=o.replace(/יה$/,"טו").replace(/יו$/,"טז"); return o.length===1?o+"'":o.slice(0,-1)+'"'+o.slice(-1); };
  const MN={1:"ניסן",2:"אייר",3:"סיון",4:"תמוז",5:"אב",6:"אלול",7:"תשרי",8:"חשון",9:"כסלו",10:"טבת",11:"שבט",12:"אדר",13:"אדר ב'"};
  const mnY=(m,y)=>m===12&&lp(y)?"אדר א'":MN[m];
  const LIV=/שליט["״]א|(^|[^א-ת])נ["״]י([^א-ת]|$)|שיחי|שתחי|לאוי["״]ט/;
  /* the month this yahrzeit falls in, in Hebrew year y. Plain Adar in a leap year → אדר א' (רמ"א; many keep אדר ב' too); recorded אדר א'/ב' in a plain year → אדר */
  const mOf=(e,y)=>{ if(e.m===13) return lp(y)?13:12; return e.m; };
  const occ=(e,y)=>{ const m=mOf(e,y); return FX(y,m,Math.min(e.d,LD(m,y))); };
  const recLab=e=>HN(e.d)+" "+(e.m===13?"אדר ב'":e.a===11?"אדר א'":MN[e.m]);
  const bt=document.createElement("button"); bt.id="yzb"; bt.type="button"; bt.innerHTML='<span>🕯️ יאָרצייטן</span><small>אלע יאָרצייטן פון אלע קארטלעך, די נאָענטסטע צו ערשט</small>';
  const st=pn.querySelector("#s_stats"); if(st) pn.insertBefore(bt,st); else pn.appendChild(bt);
  const ov=document.createElement("div"); ov.id="yzp"; ov.hidden=true; ov.setAttribute("role","dialog"); ov.setAttribute("aria-label","יאָרצייטן");
  ov.innerHTML='<div class="yzh"><b>יאָרצייטן</b><button id="yzx" aria-label="צומאכן">✕</button></div><div id="yzt"></div><input id="yzq" type="search" placeholder="זוך א נאָמען…" autocomplete="off"><label class="yzc"><input type="checkbox" id="yzcv" checked> ווייז אויך ≈ פון א ציווילער דאטע</label><div id="yzl"><p class="yzm">לאָדט…</p></div>';
  document.body.appendChild(ov);
  let E=null, built=false;
  const T0=RD(new Date()), [TY,TM,TD]=HF(T0);
  const close=()=>{ ov.hidden=true; };
  document.getElementById("yzx").onclick=close;
  document.addEventListener("keydown",ev=>{ if(ev.key==="Escape"&&!ov.hidden) close(); });
  const esc=t=>String(t).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const nm=id=>String((P[id]&&P[id].n)||"");
  function rows(){
    const q=document.getElementById("yzq").value.trim(), cv=document.getElementById("yzcv").checked;
    const L=[]; for(const e of E){ if(!P[e.i]||LIV.test(nm(e.i)+" "+(P[e.i].t||""))) continue; if(!cv&&/c/.test(e.f||"")) continue; if(q&&!nm(e.i).includes(q)) continue;
      let y=TY, r=occ(e,y); if(r<T0){ y++; r=occ(e,y); } L.push({e,r,y,k:r-T0}); }
    L.sort((a,b)=>a.k-b.k||nm(a.e.i).localeCompare(nm(b.e.i),"he"));
    const fl=e=>{ const f=e.f||"", o=[]; if(f.includes("c")) o.push("≈ (פון דער ציווילער דאטע)"); else if(f.includes("a")) o.push("≈ (בערך)");
      if(f.includes("x")) o.push("(עטלעכע דאטעס אויפן קארטל)"); if(f.includes("l")) o.push("(לויט דער לוויה)"); if(f.includes("n")) o.push("(פון די נאָטיצן)");
      if(e.m===12&&e.a!==11&&lp(TY)) o.push("(אין א שנה מעוברת: אדר א\'; אסאך האלטן אויך אדר ב\')"); return o.join(" "); };
    const when=k=>k===0?"היינט":k===1?"מאָרגן":"אין "+k+" טעג";
    const row=o=>{ const e=o.e; return '<button class="yzr" data-id="'+esc(e.i)+'"><i style="background:'+bc(e.i)+'"></i><span class="yzd">'+recLab(e)+'</span><span class="yzn">'+esc(nm(e.i))+(e.y?' <small>'+HN(e.y%1000)+'</small>':'')+(fl(e)?'<small class="yzf">'+fl(e)+'</small>':'')+'</span><span class="yzw">'+(o.k<=30?when(o.k):"")+'</span></button>'; };
    let h=""; const td=L.filter(o=>o.k===0), wk=L.filter(o=>o.k>0&&o.k<=7), rest=L.filter(o=>o.k>7);
    if(!q){ h+='<h4 class="yzs">היינט</h4>'+(td.length?td.map(row).join(""):'<p class="yzm">היינט איז נישטא קיין יאָרצייט אויפן בוים</p>');
      h+='<h4 class="yzs">די וואך <small>(די קומענדיגע 7 טעג)</small></h4>'+(wk.length?wk.map(row).join(""):'<p class="yzm">נישטא</p>'); }
    let cur=""; for(const o of (q?L:rest)){ const [hy,hm]=HF(o.r); const g=mnY(hm,hy)+" "+HN(hy%1000); if(g!==cur){ cur=g; h+='<h4>'+g+'</h4>'; } h+=row(o); }
    if(!L.length) h+='<p class="yzm">גארנישט געפונען</p>';
    const np=new Set(L.map(o=>o.e.i)).size;
    document.getElementById("yzt").innerHTML='היינט: <b>'+HN(TD)+" "+mnY(TM,TY)+" "+HN(TY%1000)+'</b> · '+L.length+' יאָרצייטן פון '+np+' מענטשן';
    document.getElementById("yzl").innerHTML=h; }
  document.getElementById("yzq").oninput=()=>{ if(E) rows(); };
  document.getElementById("yzcv").onchange=()=>{ if(E) rows(); };
  document.getElementById("yzl").addEventListener("click",ev=>{ const b=ev.target.closest(".yzr"); if(!b) return; const id=b.dataset.id; if(!P[id]) return;
    close(); pn.hidden=true; if(gear) gear.classList.remove("on");
    if(typeof N!=="undefined"&&N[id]) focus(id,Math.max(s,0.75)); openSheet(id); });
  bt.onclick=()=>{ ov.hidden=false; if(E){ rows(); return; }
    const gj=u=>fetch(u+"yz.json?v="+(window.YV||"")).then(r=>{ if(!r.ok) throw 0; return r.json(); });
    gj("").catch(()=>AB?gj(AB):Promise.reject()).then(j=>{ E=(j&&j.e)||[]; rows(); })
      .catch(()=>{ document.getElementById("yzl").innerHTML='<p class="yzm">די ליסטע האט זיך נישט געלאָדט. פרובירט נאכאמאל (מען דארף אינטערנעט).</p>'; }); };
  window.__yz={HF,FX,RD,open:()=>bt.onclick()};
})();
/* /YAHRZEIT_V1 */

/* LEGEND_V1 (Alter 8:48 PM Nov 9 "In setting put 1 line to click to view the lists"): ⚙ → "🎨 וואס מיינען די קאלירן" — what every colour, circle and line on the tree means; family colours read from BRC/TINT, circles from MKC */
(function(){
  const pn=document.getElementById("setp"); if(!pn||document.getElementById("lgb")) return;
  const FN={L:"לייטנער",W:"וואגשאהל",R:"רובין",M:"מייזליש",T:"טייטלבוים",H:"האלבערשטאם",S:"שפירא",Y:"מאיער",K:"טארים",V:"וויינבערגער",G:"שווארץ",B:"ראבינאוויטש",Z:"קרישעווסקי",N:"מענדלאוויטש",X:"ווייס"};
  const bt=document.createElement("button"); bt.id="lgb"; bt.type="button"; bt.innerHTML='<span>🎨 וואס מיינען די קאלירן</span><small>די קאלירן פון די משפחות, די קרייזלעך און די ליניעס</small>';
  const yb=document.getElementById("yzb"), st=pn.querySelector("#s_stats");
  if(yb&&yb.parentNode===pn) pn.insertBefore(bt,yb.nextSibling); else if(st) pn.insertBefore(bt,st); else pn.appendChild(bt);
  const ov=document.createElement("div"); ov.id="lgp"; ov.hidden=true; ov.setAttribute("role","dialog"); ov.setAttribute("aria-label","וואס מיינען די קאלירן");
  ov.innerHTML='<div class="yzh"><b>וואס מיינען די קאלירן</b><button id="lgx" aria-label="צומאכן">✕</button></div><div id="lgl"></div>';
  document.body.appendChild(ov);
  const tn=k=>(typeof TINT!=="undefined"&&TINT[k])||"#fffaf0", gd=(typeof C!=="undefined"&&C.gold)||"#a8803c", mr=(typeof C!=="undefined"&&C.mar)||"#7B2D3A", sc=(typeof SEE_COLOR!=="undefined"&&SEE_COLOR)||"#B07A0E";
  const lcx=h=>(typeof lcol==="function"?lcol(h):h);
  const card=(bg,top,ex)=>'<span class="lgc" style="background:'+bg+';border-top-color:'+top+(ex?';'+ex:'')+'"></span>';
  const row=(sw,t,sm)=>'<div class="lgr">'+sw+'<span class="lgt">'+t+(sm?'<small>'+sm+'</small>':'')+'</span></div>';
  function build(){
    let h='<h4>די משפחות</h4><p class="lgm">יעדער קארטל איז געפארבט אין דעם קאליר פון דער משפחה צו וועלכער ער געהערט: א ליכטיגער הינטערגרונט, און א פולער קאליר אויבן אויפן ראנד.</p>';
    h+='<div class="lgfam">'; for(const k in BRC) h+='<div class="lgf">'+card(tn(k),BRC[k])+'<span>'+(FN[k]||("משפחה "+k))+'</span></div>'; h+='</div>';
    const ks=Object.keys(BRC), a=ks[0]||"L", b=ks[1]||a, ca=lcx(BRC[a]), cb=lcx(BRC[b]);
    h+=row(card('linear-gradient(90deg,'+tn(b)+' 0 38%,'+tn(a)+' 62% 100%)',BRC[a]),'א קארטל פון צוויי משפחות','ווען א פרוי פון איין משפחה האט חתונה געהאט אין אן אנדער משפחה, איז איר קארטל צעטיילט אין צוויי קאלירן: די העלפט וואס קוקט צו איר מאן איז אין זיין משפחה\'ס קאליר, די אנדערע העלפט אין איר אייגענעם קאליר.');
    h+='<h4>די קרייזלעך אויבן אויפן קארטל</h4><p class="lgm">ווי זיכער מען איז אין דעם וואס שטייט אויפן קארטל.</p>';
    const MK=(typeof MKC!=="undefined"&&MKC)||{};
    const dot=m=>{ const k=MK[m]||["#a33","?"]; return '<span class="lgd" style="background:'+k[0]+'">'+k[1]+'</span>'; };
    h+=row(dot("ok"),'באשטעטיגט פון א רעקארד אדער מצבה')+row(dot("inf"),'בערך / נאענטע פאסונג','אפגעלערנט פון מקורות, נישט גלייך געשריבן')+row(dot("unv"),'פון א בוים, נישט באשטעטיגט','פון אן אילן פון אנדערע אדער פון א מסורה')+row(dot("alt"),'פון אלטר לייטנער','וואס אלטר אליין האט געגעבן');
    h+='<h4>אין אן אפענעם קארטל</h4>';
    h+=row('<span class="vb q">נישט באשטעטיגט</span>','א רויטער צייכן','די זאך איז נאך נישט באשטעטיגט (למשל, נאר פון א בוים אויף געני)')+row('<span class="vb a">בערך</span>','א געלבלעכער צייכן','די זאך איז בערך, נישט גענוי');
    h+=row('<span class="lgms" style="color:'+gd+'">לויט מסורה</span>','לויט מסורה','וואס די משפחה דערציילט, נישט פון א געשריבענעם מקור. אזא קארטל האט אויפן בוים א געשטריכלטן ראנד.');
    const svg=(w,inner)=>'<svg class="lgs" viewBox="0 0 '+w+' 30" width="'+w+'" height="30" aria-hidden="true">'+inner+'</svg>';
    h+='<h4>די ליניעס</h4>';
    const ringS='<circle cx="39" cy="15" r="8" fill="#fffaf0" stroke="'+mr+'" stroke-width="2.2"/><circle cx="49" cy="15" r="8" fill="#fffaf0" stroke="'+mr+'" stroke-width="2.2"/><circle cx="39" cy="15" r="8" fill="none" stroke="'+mr+'" stroke-width="2.2"/>';
    h+=row(svg(88,'<defs><linearGradient id="lgg" x1="0" x2="1"><stop offset="0" stop-color="'+ca+'"/><stop offset="1" stop-color="'+cb+'"/></linearGradient></defs><path d="M2 10H86M2 20H86" stroke="url(#lgg)" stroke-width="3" fill="none"/>'+ringS),
      'א טאפלטע ליניע מיט ⚭ = חתונה','צווישן מאן און ווייב. יעדער עק פון דער ליניע איז אין דעם קאליר פון דעם וואס שטייט דארט: זיין קאליר ביי אים, איר קאליר ביי איר.');
    h+=row(svg(88,'<path d="M86 4V15H2V28" stroke="'+ca+'" stroke-width="3" fill="none" stroke-linejoin="round"/>'),'די ליניע פון א קינד צו די עלטערן','אין דעם קאליר פון דער משפחה פון דעם קינד. ווען מען טאפט א קארטל, ווערן זיינע ליניעס דיק.');
    h+=row(svg(88,'<path d="M84 26V14H14" stroke="'+sc+'" stroke-width="3" stroke-dasharray="9 6" fill="none"/><path d="M14 6L3 14L14 22Z" fill="'+sc+'"/>'),'א געלבלעכע געשטריכלטע ליניע = "זעה אויבן"','דער זעלבער מענטש איז אויך געוויזן אויף אן אנדער ארט אויפן בוים; די ליניע ווייזט אהין. געווענליך איז עס אויסגעלאשן; מען צינדט עס אן דא אין ⚙ ("ליניעס צו \'זעה אויבן\'").');
    h+=row('<span class="lgstub" style="border-color:'+BRC[a]+'">זעה אויבן ⟵</span>','א קליין געשטריכלט קעסטל "זעה אויבן"','דער מענטש שטייט שוין אויף אן אנדער ארט אויפן בוים. טאפט עס, און מען פליט צום קארטל.');
    h+='<h4>נאך צייכנס</h4>';
    h+=row('<span class="lgdia" style="background:'+gd+'"></span>','א גאלדענער ♦ פארן נאמען = א רב','א רב, א גאון, אן אדמו"ר אדער א דיין.');
    h+=row('<span class="lgband"><i></i><i></i><b>דור 3</b></span>','"דור" שטרייפן','יעדער דור איז א שטרייף איבערן גאנצן בוים; איינס פון צוויי איז א ביסל טונקעלער. "דור 1" זענען די עלטערן, "דור 2" די זיידעס און באבעס, און אזוי ווייטער ארויף.');
    h+=row(card(tn("L"),BRC.L||"#6d4321",'border-color:'+gd+';box-shadow:0 0 0 2px #b08d57;border-top-width:7px'),'אלטר\'ס אייגענער קארטל','א גאלדענע ראם און א ברייטערער קאליר אויבן. א קארטל וואס מען האט אנגעטאפט באקומט אויך א גאלדענע ראם.');
    h+=row('<span class="lgph" style="border-color:'+BRC[b]+'"></span>','א בילד אין א קרייזל','דער ראנד פון דעם בילד איז אין דעם קאליר פון דער משפחה.');
    h+=row('<span class="lgnew">נייַ</span>','"נייַ" מיט א גאלדענעם שיין','ווען "וואָס איז נייַ" איז אן, שיינען די קארטלעך וואס זענען לעצטנס צוגעקומען אדער געטוישט געווארן.');
    document.getElementById("lgl").innerHTML=h; }
  const close=()=>{ ov.hidden=true; };
  document.getElementById("lgx").onclick=close;
  ov.addEventListener("click",ev=>{ if(ev.target===ov) close(); });
  document.addEventListener("keydown",ev=>{ if(ev.key==="Escape"&&!ov.hidden) close(); });
  let done=false; bt.onclick=()=>{ if(!done){ try{ build(); }catch(e){ document.getElementById("lgl").innerHTML='<p class="lgm">'+String(e)+'</p>'; } done=true; } ov.hidden=false; document.getElementById("lgl").scrollTop=0; };
  window.__lg={open:()=>bt.onclick()};
})();
/* /LEGEND_V1 */

/* SEARCH_V1 (Alter 9:54 PM Nov 9 "add a search icon next to the settings that I can search anything"; 9:55 PM "make it a real smart search, the best search bar possible") — worker 16a4bfd2.
   🔍 beside ⚙ opens a search panel. Searches names (main, alternate, maiden), titles, places, dates, notes, sources and picture captions.
   Detail text comes from sidx.json (built at publish time by search_patch.py --index; on the PIN site it is answered decrypted by libby.js).
   Smart parts: niqqud/final letters/spaces ignored, Yiddish/Latin spelling variants, typos, Hebrew <-> Latin sound match, place and name synonyms,
   relations (קינדער פון X, בת X, son of X, A בן B), years and ranges (1916, תרע"ו, 1880s, 1880-1890), yahrzeit dates (ט"ו כסלו), titles (רבי פון סאטמאר).
   Living people: name only. */
(function(){
  if(document.getElementById("srb")) return;
  const gear=document.getElementById("gear"), pn=document.getElementById("setp");
  const $=id=>document.getElementById(id);
  const esc=t=>String(t).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  /* ---------- normalising ---------- */
  const LIGA={"\u05f0":"וו","\u05f1":"וי","\u05f2":"יי"}, FINL={"ך":"כ","ם":"מ","ן":"נ","ף":"פ","ץ":"צ"}, SPEC={"ß":"ss","ł":"l","Ł":"l","ø":"o","Ø":"o","æ":"ae","œ":"oe","đ":"d","ı":"i"};
  const QCH=/["'`\u05f3\u05f4\u2018\u2019\u201c\u201d\u201e]/g;
  function prep(s){ s=String(s||"").replace(/[\u0591-\u05bd\u05bf-\u05c7]/g,"").replace(/[\u05f0-\u05f2]/g,c=>LIGA[c]).replace(/[ךםןףץ]/g,c=>FINL[c]).replace(/[ßłŁøØæœđı]/g,c=>SPEC[c]);
    return s.normalize("NFD").toLowerCase().replace(/[\u0300-\u036f]/g,"").replace(QCH,""); }
  function nz(s){ return prep(s).replace(/[^a-z0-9\u05d0-\u05ea]/g,""); }
  /* the same, but words stay apart (a space between them): the loose forms and the notes use it, so a match cannot run across two words */
  function nzK(s){ return prep(s).replace(/[^a-z0-9\u05d0-\u05ea]+/g," ").trim(); }
  const NZC=new Map(); const nzc=c=>{ let v=NZC.get(c); if(v===undefined){ v=nz(c); if(!v&&!QCH.test(c)&&!/[\u0591-\u05c7\u0300-\u036f]/.test(c)) v=" "; QCH.lastIndex=0; NZC.set(c,v); } return v; };
  /* normalised text with a map back to the original positions (only for highlighting a few rows); sp: keep word gaps */
  function nzMap(s,sp){ s=String(s||""); const o=[], m=[]; for(let i=0;i<s.length;i++){ const p=nzc(s[i]); if(p===" "){ if(sp&&o.length&&o[o.length-1]!==" "){ o.push(" "); m.push(i); } continue; } for(const ch of p){ o.push(ch); m.push(i); } } return [o.join(""),m]; }
  const LR=[["w","v"],["vitsch","viz"],["vitch","viz"],["vich","viz"],["vics","viz"],["vicz","viz"],["sch","s"],["sz","s"],["cz","c"],["tz","z"],["ts","z"],["ph","f"],["ck","k"],["y","i"],["j","i"],["ei","ai"],["ey","ai"],
    ["וו","ו"],["יי","י"],["טש","צ"],["ע","א"],["ש","ס"],["א",""]];
  function lz(s){ for(const [a,b] of LR) s=s.split(a).join(b); return s.replace(/(.)\1+/g,"$1"); }
  function lzMap(s,m){ let a=s.split(""), mm=m.slice();
    for(const [x,y] of LR){ if(s.indexOf(x)<0) continue; const na=[], nm=[]; let i=0; while(i<a.length){ let hit=true; for(let k=0;k<x.length;k++) if(a[i+k]!==x[k]){ hit=false; break; }
        if(hit){ for(const ch of y){ na.push(ch); nm.push(mm[i]); } i+=x.length; } else { na.push(a[i]); nm.push(mm[i]); i++; } }
      a=na; mm=nm; s=a.join(""); }
    const fa=[], fm=[]; for(let i=0;i<a.length;i++){ if(i&&a[i]===a[i-1]) continue; fa.push(a[i]); fm.push(mm[i]); } return [fa.join(""),fm]; }
  /* sound key, the same for Hebrew letters and Latin letters, so Akiva = עקיבא, Schlesinger = שלעזינגער */
  const HK={"ב":"B","ג":"G","ד":"D","ז":"S","ח":"K","ט":"T","כ":"K","ל":"L","מ":"M","נ":"N","ס":"S","פ":"P","צ":"S","ק":"K","ר":"R","ש":"S","ת":"T"};
  const LK={b:"B",v:"B",w:"B",f:"P",p:"P",d:"D",g:"G",k:"K",q:"K",x:"K",l:"L",m:"M",n:"N",r:"R",s:"S",z:"S",t:"T"};
  function pk(w){ if(!w) return ""; let o=""; let i=0;
    if(/[\u05d0-\u05ea]/.test(w[0])){ if(w[0]==="א"||w[0]==="ע") { o="_"; i=1; } else if(w[0]==="י"){ o="Y"; i=1; } else if(w[0]==="ה"){ o="K"; i=1; }
      for(;i<w.length;i++){ const c=w[i];
        if(c==="ו"){ if(w[i+1]==="ו"){ o+="B"; i++; } continue; }
        if(c==="ט"&&w[i+1]==="ש"){ o+="S"; i++; continue; }
        const k=HK[c]; if(k) o+=k; } }
    else { if("aeiou".includes(w[0])){ o="_"; i=1; } else if(w[0]==="y"||w[0]==="j"){ o="Y"; i=1; } else if(w[0]==="h"){ o="K"; i=1; }
      for(;i<w.length;i++){ const c=w[i], n=w[i+1]||"";
        if(c==="s"&&n==="c"&&w[i+2]==="h"){ o+="S"; i+=2; continue; }
        if((c==="s"&&(n==="h"||n==="z"))||(c==="t"&&(n==="z"||n==="s"))||(c==="c"&&n==="z")||(c==="z"&&n==="s")){ o+="S"; i++; continue; }
        if((c==="c"||c==="k")&&n==="h"){ o+="K"; i++; continue; }
        if(c==="c"&&n==="k"){ o+="K"; i++; continue; }
        if(c==="p"&&n==="h"){ o+="P"; i++; continue; }
        if(c==="t"&&n==="h"){ o+="T"; i++; continue; }
        if(c==="c"){ o+=("eiy".includes(n)?"S":"K"); continue; }
        const k=LK[c]; if(k) o+=k; } }
    return o.replace(/(.)\1+/g,"$1"); }
  function ed(a,b,mx){ const la=a.length, lb=b.length; if(Math.abs(la-lb)>mx) return mx+1; let pr=new Array(lb+1); for(let j=0;j<=lb;j++) pr[j]=j;
    for(let i=1;i<=la;i++){ const cu=[i]; let best=i; for(let j=1;j<=lb;j++){ const v=Math.min(pr[j]+1,cu[j-1]+1,pr[j-1]+(a[i-1]===b[j-1]?0:1)); cu.push(v); if(v<best) best=v; }
      if(best>mx) return mx+1; pr=cu; } return pr[lb]; }
  /* ---------- synonyms: places, families, given names (Hebrew / Yiddish / Latin forms) ---------- */
  const SYN=[
   ["גרויסווארדיין","ווארדיין","נאגיוואראד","נאדיוואראד","אראדעא","oradea","nagyvarad","grosswardein","wardein","varad"],
   ["סאטמאר","satmar","szatmar","szatmarnemeti","satumare"],["סיגעט","sighet","sziget","maramarossziget","sighetumarmatiei"],
   ["קאשוי","קאשא","kosice","kassa","kaschau"],["מאלדאווא","מילדוי","moldava","szepsi","moldavanadbodvou"],["קלויזנבורג","קלוזש","cluj","kolozsvar","klausenburg"],
   ["מאראשוואשארהעלי","טרגו מורעש","targumures","marosvasarhely"],["פרעשבורג","פרשבורג","pressburg","bratislava","pozsony"],["קראקא","קראקע","krakow","cracow","krakau"],
   ["לעמבערג","למברג","לבוב","lemberg","lwow","lviv","lvov"],["טארנא","טארנוב","tarnow"],["ראצפערט","ujfeherto"],["נירעדהאז","nyiregyhaza"],["ראדאמישלא","radomysl"],
   ["לאנצהוט","לאנצעט","lancut"],["באלאשדיארמאט","balassagyarmat"],["ביאליסטאק","bialystok"],["ריישא","rzeszow"],["אויהעל","אוהעל","אויהל","ujhely","satoraljaujhely"],
   ["ווישניצא","וויזשניץ","vizhnitz","viznitz","vyzhnytsia"],["קשאנוב","chrzanow"],["ווילנא","ווילנע","vilna","vilnius","wilno"],["פראנקפורט","frankfurt"],["ווין","vienna","wien"],
   ["פראג","prague","praha","prag"],["ירושלים","jerusalem"],["צפת","safed","tzfat"],["וויליאמסבורג","williamsburg"],["מאנסי","monsey"],["מאנרא","קרית יואל","monroe","kiryasjoel"],
   ["ברוקלין","brooklyn"],["ניו יארק","נוי יארק","newyork"],["צאנז","sanz","nowysacz","sandz"],["באבאוו","bobov","bobowa"],["בעלזא","belz"],["מונקאטש","munkacs","mukachevo","munkatsch"],
   ["אוישוויץ","אושוויץ","auschwitz","oswiecim"],["בודאפעסט","budapest"],["דעברעצין","debrecen"],["גאלאנטא","galanta"],["שאראש פאטאק","sarospatak"],["טאשנאד","tasnad"],
   ["זערינד","zerind"],["פוטנאק","putnok"],["אייזנשטאט","eisenstadt"],["פרעמישלא","פשעמישל","przemysl"],["דזשיקוב","dzikow"],["ראפשיץ","ropczyce"],["ליזענסק","ליזשענסק","lezajsk"],
   ["בערעגסאז","beregszasz","berehove"],["הר הזיתים","mountofolives"],["ברגן בעלזן","bergenbelsen"],["אונגארן","hungary","ungarn","magyarorszag"],["גאליציע","galicia","galizien"],
   ["רומעניע","romania","rumania"],["סלאוואקיי","slovakia"],["אמעריקע","america","usa"],
   ["לייטנער","leitner","lajtner","laitner"],["וואגשאהל","וואגשאל","ווגשאל","wagschal","wagshal"],["רובין","rubin"],["מייזליש","מייזעלס","meisels","meisel"],["טייטלבוים","teitelbaum"],
   ["האלבערשטאם","halberstam"],["שפירא","שפירו","shapira","spira","shapiro","spiro"],["מאיער","מייער","meyer","mayer","maier"],["טארים","tarim"],["וויינבערגער","weinberger"],
   ["שווארץ","schwartz","schwarz"],["ראבינאוויטש","רבינוביץ","rabinowitz","rabinovits","rabinovich","rabinowicz","rabinovitch"],["קרישעווסקי","krishevsky","kryszewski"],
   ["מענדלאוויטש","mendlowitz","mendelowitz","mendelovits","mendlovits"],["ווייס","weiss","weisz","vajsz"],["וויינפעלד","weinfeld","vajnfeld"],["גערטנער","גארטנער","gertner","gartner","gaertner"],
   ["טאננבוים","טאנענבוים","tannenbaum","tanenbaum"],["ערליך","ehrlich","erlich"],["בלוי","blau"],["שלעזינגער","schlesinger"],["לנדא","לאנדא","landau","landa"],["סופר","sofer","schreiber"],
   ["פרידמאן","friedmann","friedman"],["האמערשלאג","hammerschlag"],["הורוויץ","הורוביץ","horowitz","horovitz","hurwitz"],["לאזאר","lazar"],
   ["מרדכי","mordechai","mordecai","marton","martin"],["חיה","העלענע","chaya","helen","helene"],["אברהם","abraham","avraham","avrohom"],["יצחק","yitzchak","isaac","izsak","itzik"],
   ["יעקב","yaakov","jacob","jakab","jakob","yankev"],["משה","moshe","moses","mozes"],["ישראל","yisroel","israel","izrael","izidor"],["שמואל","שמיל","shmuel","samuel","shmiel"],
   ["שרה","sara","sarah"],["לאה","leah","lea"],["רחל","rachel","rahel"],["מרים","miriam","mirjam"],["יוסף","yosef","joseph","jozsef","josef"],["דוד","david","dovid"],
   ["ליבא","liba","libby"],["עקיבא","akiva","akiba"],["פרומעט","פרימעט","frimet","frumet"],["חנה","chana","hanna","anna"],["אסתר","esther","eszter"],["אהרן","אהרון","aharon","aaron","aron"],
   ["צבי","הירש","הערש","zvi","tzvi","hirsch","hersh"],["אריה","לייב","לייביש","aryeh","leib","leibush"],["דב","בער","dov","ber"],["זאב","וואלף","וועלוול","zev","wolf","velvel"],["שלמה","shlomo","solomon","salamon"]];
  const SYNI=new Map(); SYN.forEach((g,gi)=>{ for(const w of g){ const a=nz(w); SYNI.set(a,gi); SYNI.set(lz(a),gi); } });
  const SYNZ=SYN.map(g=>[...new Set(g.map(nz))]);
  /* ---------- query words ---------- */
  const STOP=new Set(["פון","דער","די","דעם","און","אין","of","the","von","de","der","die","and","in","from","at","to","a","an"].map(nz));
  const TITL=new Set(["ר","רב","רבי","הרב","הרבנית","רבנית","מרת","מ","הגאון","הגהק","הגהצ","הרהק","הרהצ","הקדוש","האדמור","אדמור","רבינו","רבנו","מרן","זצל","זל","זיע","עה","הייד","נע","זצוקל","שליטא","ני","reb","rabbi","rebbe","rav","rabbiner","rebbetzin","mrs","mr","r","dr","rabbinic"].map(nz));
  const RABT=new Set(["רב","רבי","הרב","הגאון","הגהק","הגהצ","הרהק","הרהצ","האדמור","אדמור","רבינו","רבנו","מרן","אבד","דיין","מגיד","rabbi","rebbe","rav","rabbiner","רבנים","רבייס","rebbes","rabbis"].map(nz));
  const RABQ=/^(הגה["״]ק|הגה["״]צ|הרה["״]ק|הרה["״]צ|הגאון|הרב |רבי |רבנו|רבינו|האדמו["״]ר|מרן|הקדוש|רב )|אב["״]ד|אבד["״]ק|אדמו["״]ר|ראש ישיבה|דיין|מגיד|(^|\s)רב (אין|פון|ב|ד)|זי["״]ע|רבי פון|רעבי/;
  const FEMT=new Set(["מרת","הרבנית","רבנית","rebbetzin","mrs"].map(nz)), FAMT=new Set(["משפחת","משפחה","family","familie","פאמיליע"].map(nz));
  const RELW=[ /* [words before X (normalised, joined with space)], kind */
    [["קינדער","פון"],"kids"],[["קינד","פון"],"kids"],[["זין","פון"],"kids"],[["טעכטער","פון"],"kids"],[["children","of"],"kids"],[["kids","of"],"kids"],[["son","of"],"kids"],[["sons","of"],"kids"],[["daughter","of"],"kids"],[["daughters","of"],"kids"],
    [["זון","פון"],"kids"],[["טאכטער","פון"],"kids"],[["בן"],"kids"],[["בת"],"kids"],[["בר"],"kids"],[["בני"],"kids"],[["בנות"],"kids"],
    [["עלטערן","פון"],"par"],[["טאטע","פון"],"par"],[["מאמע","פון"],"par"],[["parents","of"],"par"],[["father","of"],"par"],[["mother","of"],"par"],
    [["ווייב","פון"],"sp"],[["מאן","פון"],"sp"],[["wife","of"],"sp"],[["husband","of"],"sp"],[["spouse","of"],"sp"],[["married","to"],"sp"],[["אשת"],"sp"],
    [["געשוויסטער","פון"],"sib"],[["ברודער","פון"],"sib"],[["שוועסטער","פון"],"sib"],[["siblings","of"],"sib"],[["brother","of"],"sib"],[["sister","of"],"sib"],
    [["אייניקלעך","פון"],"gkids"],[["grandchildren","of"],"gkids"],[["זיידע","פון"],"gpar"],[["באבע","פון"],"gpar"],[["grandparents","of"],"gpar"],[["grandfather","of"],"gpar"],[["grandmother","of"],"gpar"]
  ].map(([w,k])=>[w.map(nz),k]);
  const RELN={kids:"די קינדער פון",par:"די עלטערן פון",sp:"דער מאן אדער די ווייב פון",sib:"די געשוויסטער פון",gkids:"די אייניקלעך פון",gpar:"די זיידעס און באבעס פון"};
  /* Hebrew numbers, years, months */
  const GV={"א":1,"ב":2,"ג":3,"ד":4,"ה":5,"ו":6,"ז":7,"ח":8,"ט":9,"י":10,"כ":20,"ל":30,"מ":40,"נ":50,"ס":60,"ע":70,"פ":80,"צ":90,"ק":100,"ר":200,"ש":300,"ת":400};
  function gem(w){ let v=0, last=1e9; for(const c of w){ const g=GV[c]; if(!g) return -1; if(g>last&&!(last===9&&(g===6||g===7))) return -1; v+=g; last=g; } return v; }
  function hebYear(raw){ let w=String(raw).replace(/^ה['׳]?/,""); if(!/["״]/.test(w)&&!/^ת/.test(nz(w))) return 0; const n=nz(w); if(!/^ת/.test(n)||n.length<2||n.length>5) return 0; const v=gem(n); return v>=400&&v<1000?5000+v:0; }
  const MONTHS=[["ניסן",[1]],["אייר",[2]],["איר",[2]],["סיון",[3]],["סיוון",[3]],["תמוז",[4]],["אב",[5]],["מנחםאב",[5]],["אלול",[6]],["תשרי",[7]],["חשון",[8]],["חשוון",[8]],["מרחשון",[8]],["מרחשוון",[8]],["כסלו",[9]],["כסליו",[9]],["טבת",[10]],["שבט",[11]],["אדר",[12,13]],["אדרא",[12]],["אדרב",[13]],["אדרשני",[13]]].map(([a,b])=>[nz(a),b]);
  const MONM=new Map(MONTHS);
  /* ---------- the index ---------- */
  const LIV=/שליט["״]א|(^|[^א-ת])נ["״]י([^א-ת]|$)|שיחי|שתחי|לאוי["״]ט/;
  const isLiv=id=>LIV.test(String(P[id].n||"")+" "+String(P[id].t||""));
  const HF=["n","a","t","pl","d"], BF=["x","s","c"];
  const FW={n:100,a:85,t:45,pl:45,d:40,x:22,s:16,c:14};
  const FWHY={n:"נאָמען",a:"אנדער נאָמען",t:"באשרייבונג",pl:"ארט",d:"דאטעס",x:"נאָטיץ",s:"מקור",c:"בילד",m:"מיידן-נאָמען",y:"יאָר",z:"יאָרצייט",r:"קרובים",f:"ענליכער נאָמען",k:"ענליכער קלאַנג",o:"ענליכער שרייבונג"};
  const YRX=/(^|[^0-9])(1[0-9]{3}|20[0-3][0-9])(?![0-9])/g, HYRX=/(^|[^א-ת])(?:ה['׳])?(ת[א-ת]{0,2}["״][א-ת])(?![א-ת])/g;
  function years(t,set,hs){ if(!t) return; let m; YRX.lastIndex=0; while((m=YRX.exec(t))) set.add(+m[2]); HYRX.lastIndex=0; while((m=HYRX.exec(t))){ const v=gem(nz(m[2])); if(v>=400) hs.add(5000+v); } }
  const IX=[]; const BYID=new Map(); let VOC=null, VOCL=null, VOCK=null, VOCN=[], BODY=false, SIDX=null, YZ=null;
  function splitName(n){ n=String(n||""); const alt=[]; let main=n.replace(/\(([^)]*)\)/g,(_,x)=>{ alt.push(x); return " "; });
    const lb=main.match(/\s(לבית|געבוירענע|née|nee|geb\.?)\s.*$/); let maid=""; if(lb){ maid=lb[0]; main=main.slice(0,lb.index); }
    return [main.replace(/\s+/g," ").trim(), alt.join(" · "), maid.trim()]; }
  function mk(id){ const p=P[id], liv=isLiv(id); const [mn,al,md]=splitName(p.n);
    const F={n:mn, a:[al,md].filter(Boolean).join(" · "), t:liv?"":(p.t||""), pl:liv?"":(p.pl||""), d:liv?"":(p.d||"")};
    const r={id, liv, F, maid:md, hz:"", hl:"", ho:[], hlo:[], bz:"", bl:"", bo:[], blo:[], B:null, Y:new Set(), YB:new Set(), H:new Set(), HB:new Set(), nw:[], nmz:nz(mn.replace(/^(ר['׳]?|רבי|הרב|הרבנית|מרת|הגה"ק|הרה"ק)\s+/,"").replace(/\s+(הי["״]ד|ז["״]ל|זצ["״]ל|זי["״]ע|ע["״]ה|נ["״]ע)\s*$/,""))};
    let a=[], b=[]; for(const f of HF){ const z=nz(F[f]), l=lz(nzK(F[f])); r.ho.push(a.join("|").length+(a.length?1:0)); r.hlo.push(b.join("|").length+(b.length?1:0)); a.push(z); b.push(l); }
    r.hz=a.join("|"); r.hl=b.join("|");
    r.nw=mn.split(/[\s\-–־,]+/).map(nz).filter(Boolean);
    if(!liv){ years(F.d,r.Y,r.H); years(F.t,r.Y,r.H); years(F.pl,r.Y,r.H); }
    r.maidz=md?nz(md):""; if(p.md&&p.md.length) r.pic=1; return r; }
  function addBody(r,row){ if(r.liv||!row) return; const B={x:row[0]||"", s:row[1]||"", c:row[2]||""}; r.B=B;
    let a=[], b=[]; for(const f of BF){ const z=nzK(B[f]), l=lz(z); r.bo.push(a.join("|").length+(a.length?1:0)); r.blo.push(b.join("|").length+(b.length?1:0)); a.push(z); b.push(l); }
    r.bz=a.join("|"); r.bl=b.join("|"); years(B.x,r.YB,r.HB); years(B.s,r.YB,r.HB); }
  function fieldAt(offs,flds,pos){ let k=0; for(let i=0;i<offs.length;i++) if(offs[i]<=pos) k=i; return flds[k]; }
  /* vocabulary: every word in names, titles and places (+ Latin words of the notes), for typos and sound matches */
  function addVoc(w,orig,id,f){ if(w.length<2||/^[0-9]+$/.test(w)) return; let v=VOC.get(w); if(!v){ v={w,o:orig,l:lz(w),k:pk(w),ids:new Map(),n:0,pl:f==="pl"}; VOC.set(w,v); } if(!v.ids.has(id)||FW[f]>FW[v.ids.get(id)]) v.ids.set(id,f); v.n++; if(f==="pl") v.pl=true; }
  function buildVoc(){ VOC=new Map();
    for(const r of IX){ for(const f of ["n","a","t","pl"]){ const t=r.F[f]; if(!t) continue; for(const o of t.split(/[\s,·:;()\[\]\/←–\-־"„“”']+/)){ const w=nz(o); if(w) addVoc(w,o.replace(/^[\s"„“”'(]+|[\s"„“”'),.:;]+$/g,""),r.id,f); } }
      if(r.B&&!r.liv){ for(const f of BF){ const t=r.B[f]; if(!t) continue; const L=t.match(/[A-Za-zÀ-žÁ-ű][A-Za-zÀ-ž'’\-]{2,}/g); if(L) for(const o of L){ if(o[0]!==o[0].toUpperCase()) continue; const w=nz(o); if(w.length>=3) addVoc(w,o,r.id,f); } } } }
    for(const r of IX){ if(!r.F.pl) continue; for(const seg of r.F.pl.split(/\s*(?:←|\/|,|·|–|\(|\))\s*/)){ const s=seg.replace(/^קבורה:\s*/,"").replace(/[≈?]/g,"").trim(); const w=nz(s); if(w.length>=3&&s.length<30) addVoc(w,s,r.id,"pl"); } }
    VOCL=[...VOC.values()]; VOCK=new Map(); VOCN=[]; for(const v of VOCL){ let a=VOCK.get(v.k); if(!a) VOCK.set(v.k,a=[]); a.push(v); const n=v.l.length; (VOCN[n]=VOCN[n]||[]).push(v); } }
  function buildCore(){ IX.length=0; BYID.clear(); for(const id in P){ const r=mk(id); IX.push(r); BYID.set(id,r); } buildVoc(); }
  /* relations */
  let KIDS=null, SPO=null;
  function rel(){ if(KIDS) return; KIDS={}; SPO={};
    for(const c in UP){ const u=UP[c]||[]; for(const x of u) if(x){ (KIDS[x]=KIDS[x]||new Set()).add(c); } if(u[0]&&u[1]){ (SPO[u[0]]=SPO[u[0]]||new Set()).add(u[1]); (SPO[u[1]]=SPO[u[1]]||new Set()).add(u[0]); } }
    if(typeof MAR!=="undefined") for(const g of MAR){ if(g.f&&g.m){ (SPO[g.f]=SPO[g.f]||new Set()).add(g.m); (SPO[g.m]=SPO[g.m]||new Set()).add(g.f); } }
    if(typeof FAM!=="undefined"&&FAM&&FAM.sp){ (SPO[ROOT]=SPO[ROOT]||new Set()).add(FAM.sp); (SPO[FAM.sp]=SPO[FAM.sp]||new Set()).add(ROOT); } }
  function relOf(id,k){ rel(); const out=new Set(), add=x=>{ if(x&&P[x]&&x!==id) out.add(x); };
    if(k==="kids"){ for(const c of (KIDS[id]||[])){ add(c); for(const x of (P[c].sibs||[])) add(x); } for(const k2 in P){ const so=P[k2].sibof; if(so&&KIDS[id]&&KIDS[id].has(so)) add(k2); } }
    else if(k==="par"){ for(const u of (UP[id]||[])) add(u); if(P[id].sibof) for(const u of (UP[P[id].sibof]||[])) add(u); }
    else if(k==="sp"){ for(const x of (SPO[id]||[])) add(x); }
    else if(k==="sib"){ const ps=(UP[id]||[]).filter(Boolean); for(const pp of ps) for(const c of (KIDS[pp]||[])) add(c); for(const x of (P[id].sibs||[])) add(x); if(P[id].sibof){ add(P[id].sibof); for(const x of (P[P[id].sibof].sibs||[])) add(x); }
      for(const k2 in P) if(P[k2].sibof===id) add(k2); }
    else if(k==="gkids"){ for(const c of (KIDS[id]||[])) for(const g of (KIDS[c]||[])) add(g); }
    else if(k==="gpar"){ for(const u of (UP[id]||[])) if(u) for(const g of (UP[u]||[])) add(g); }
    return [...out]; }
  /* ---------- searching ---------- */
  function tokens(q){ const raw=q.replace(/[,;!?]/g," ").split(/\s+/).filter(Boolean); return raw.map(o=>({o,z:nz(o)})).filter(t=>t.z); }
  function alts(t){ const z=t.z, L=lz(z), A=[{s:z,ts:1,w:"all",why:null}]; const seen=new Set([z]); t.L=L;
    if(t.dt){ for(const s of [t.dd+" "+t.dm, t.dd+" ב"+t.dm, t.dd+" ל"+t.dm, t.dd+" לחודש "+t.dm, t.dd+"ב"+t.dm, t.dd+"ל"+t.dm, t.dd+"לחודש"+t.dm]) A.push({s,ts:1,w:"all",why:null}); for(const a of A) a.l=""; t.A=A; return A; }
    const gi=SYNI.has(z)?SYNI.get(z):(SYNI.has(L)?SYNI.get(L):-1); if(gi>=0) for(const w of SYNZ[gi]) if(!seen.has(w)){ seen.add(w); A.push({s:w,ts:0.95,w:"all",why:null}); }
    if(/^[\u05d0-\u05ea]/.test(z)&&z.length>=5){ if(/^[מבלוהד]/.test(z)) A.push({s:z.slice(1),ts:0.8,w:"all",why:null}); if(/ער$/.test(z)) A.push({s:z.slice(0,-2),ts:0.85,w:"all",why:null}); if(/^[מבלוהד]/.test(z)&&/ער$/.test(z)) A.push({s:z.slice(1,-2),ts:0.75,w:"all",why:null}); }
    if(/^[a-z]/.test(z)&&z.length>=5&&/(s|er|es)$/.test(z)) A.push({s:z.replace(/(s|er|es)$/,""),ts:0.8,w:"all",why:null});
    for(const a of A) a.l=lz(a.s); t.A=A; return A; }
  function vocAlts(t){ /* typos and sound: words of the vocabulary that are close */ const z=t.z, L=t.L, K=pk(z), out=[]; if(z.length<3||!VOCL) return out;
    const mx=z.length>=8?2:z.length>=5?1:0, heb=/^[\u05d0-\u05ea]/.test(z), ok=heb||/[aeiouy]/.test(z), seen=new Set([z]);
    if(ok) for(const v of (VOCK.get(K)||[])){ if(seen.has(v.w)) continue; const cross=heb!==/^[\u05d0-\u05ea]/.test(v.w);
      if(Math.abs(v.w.length-z.length)<=3&&(K.length>=3||(cross&&K.length===2&&z.length>=4&&v.w.length<=z.length+1))){ out.push([v,cross?0.72:0.62,"k"]); seen.add(v.w); } }
    if(mx) for(let n=Math.max(0,L.length-mx);n<=L.length+mx;n++) for(const v of (VOCN[n]||[])){ if(seen.has(v.w)) continue; if(ed(v.l,L,mx)<=mx){ out.push([v,0.6,"f"]); seen.add(v.w); } }
    if(ok&&K.length>=5) for(const [k2,arr] of VOCK){ if(k2[0]!==K[0]||Math.abs(k2.length-K.length)>1||k2===K) continue; if(ed(k2,K,1)>1) continue; for(const v of arr){ if(seen.has(v.w)||Math.abs(v.w.length-z.length)>3) continue; out.push([v,0.5,"k"]); seen.add(v.w); } }
    out.sort((a,b)=>b[1]-a[1]||b[0].n-a[0].n); return out.slice(0,24); }
  /* a match in spaced text: [position, starts a word]; a match inside a word only counts for 5+ letters */
  function wsFind(h,s){ let i=h.indexOf(s), mid=-1, n=0; while(i>=0&&n<40){ const c=i?h[i-1]:" "; if(c===" "||c==="|") return [i,1]; if(mid<0) mid=i; i=h.indexOf(s,i+1); n++; } return (mid>=0&&s.length>=5)?[mid,0]:null; }
  let LB=false;
  function scoreTok(r,t,A,VA){ let best=null; const put=(sc,f,why,s,hay)=>{ if(!best||sc>best.sc) best={sc,f,why,s,hay}; };
    for(const a of A){ const s=a.s; if(!s) continue;
      let i=r.hz.indexOf(s); if(i>=0){ const f=fieldAt(r.ho,HF,i); let sc=FW[f]; if(f==="n"){ if(r.nw.includes(s)) sc=100; else if(r.nw.some(w=>w.startsWith(s))) sc=85; else sc=70; }
        let why=f; if(f==="a"&&r.maidz&&r.maidz.includes(s)){ why="m"; sc=95; } put(sc*a.ts,f,why,s,"h"); }
      if(r.bz&&(!best||best.sc<FW.x)){ const w=wsFind(r.bz,s); if(w){ const f=fieldAt(r.bo,BF,w[0]); put(FW[f]*a.ts*(w[1]?1:0.6),f,f,s,"b"); } }
      if(!t.yr&&(!best||best.sc<50)){ const l=a.l; if(l&&l.length>=4){ let w=wsFind(r.hl,l); if(w&&w[1]){ const f=fieldAt(r.hlo,HF,w[0]); put(FW[f]*0.8*a.ts,f,"o",l,"hl"); } else if(LB&&a.ts===1&&r.bl&&(w=wsFind(r.bl,l))&&w[1]){ const f=fieldAt(r.blo,BF,w[0]); put(FW[f]*0.75*a.ts,f,"o",l,"bl"); } } } }
    if(VA&&(!best||best.sc<60)) for(const [v,ts,why] of VA){ const f=v.ids.get(r.id); if(f){ put(FW[f]*ts,f,why,v.w,f==="x"||f==="s"||f==="c"?"b":"h"); break; } }
    if(t.yr){ const [y0,y1]=t.yr.g, [h0,h1]=t.yr.h; const inS=(S,a,b)=>{ for(const y of S) if(y>=a&&y<=b) return true; return false; };
      if(inS(r.Y,y0,y1)||inS(r.H,h0,h1)) put(30,"d","y",null,null); else if(inS(r.YB,y0,y1)||inS(r.HB,h0,h1)) put(15,"x","y",null,null); }
    return best; }
  function yearTok(t){ let m;
    const G=(a,b)=>({g:[a,b],h:[a+3760,b+3761]});
    if((m=t.o.match(/^(\d{3})0(?:s|'s|er|ער|ער יאָרן)$/i))) return G(+m[1]*10,+m[1]*10+9);
    if((m=t.o.match(/^(\d{3})[x?]$/i))) return G(+m[1]*10,+m[1]*10+9);
    if((m=t.o.match(/^(\d{4})\s*[-–]\s*(\d{2,4})$/))){ let b=+m[2]; if(m[2].length===2) b=Math.floor(+m[1]/100)*100+b; return G(Math.min(+m[1],b),Math.max(+m[1],b)); }
    if((m=t.o.match(/^(1[0-9]{3}|20[0-3][0-9])$/))) return G(+m[1],+m[1]);
    const hy=hebYear(t.o); if(hy) return {g:[hy-3761,hy-3760],h:[hy,hy]}; return null; }
  function dayTok(o){ const z=nz(o); if(/^[0-9]{1,2}$/.test(z)){ const v=+z; return v>=1&&v<=30?v:0; } if(!/^[\u05d0-\u05ea]{1,2}$/.test(z)) return 0; if(z.length===2&&!/["״'׳]/.test(o)&&!(z==="טו"||z==="טז")) return 0; const v=gem(z); return v>=1&&v<=30?v:0; }
  function search(q){ const t0=performance.now(); let T=tokens(q); const flags={rab:false,fem:false,fam:false};
    const out={people:[],places:[],srcs:[],fams:[],rel:[],q,ms:0,dym:null,partial:false};
    if(!T.length) return out;
    /* relations: "קינדער פון X", "בת X", "son of X"; "A בן B" */
    const Z=T.map(t=>t.z); let relK=null, relX=null, relA=null;
    for(const [ws,k] of RELW){ for(let i=0;i+ws.length<=Z.length;i++){ let ok=true; for(let j=0;j<ws.length;j++) if(Z[i+j]!==ws[j]){ ok=false; break; } if(!ok) continue;
        const after=T.slice(i+ws.length), before=T.slice(0,i); if(!after.length) continue;
        if(i===0){ relK=k; relX=after; } else if(k==="kids"&&ws.length<=2){ relK="childOf"; relA=before; relX=after; }
        if(relK){ for(let j=0;j<ws.length;j++) T[i+j].rel=1; } break; } if(relK) break; }
    /* yahrzeit date "ט"ו כסלו" */
    let yzd=null; for(let i=0;i+1<T.length;i++){ const d=dayTok(T[i].o); let mz=T[i+1].z.replace(/^(ב|ל|ד)(?=[\u05d0-\u05ea]{3})/,""); if(mz==="חודש"&&T[i+2]) mz=T[i+2].z; if(T[i+2]&&/^(א|ב|שני|ראשון)$/.test(T[i+2].z)&&mz==="אדר") mz=mz+({"שני":"ב","ראשון":"א"}[T[i+2].z]||T[i+2].z);
      const ms=MONM.get(mz)||MONM.get(T[i+1].z); if(d&&ms){ yzd={d,ms,i}; T[i].rel=1; T[i+1].rel=1; T.push({o:T[i].o+" "+T[i+1].o,z:T[i].z+mz,dt:1,dd:T[i].z,dm:mz}); break; } }
    /* drop titles / stop words, remember what they ask for */
    const keep=[]; for(const t of T){ if(t.rel) continue; if(RABT.has(t.z)) flags.rab=true; if(FEMT.has(t.z)) flags.fem=true; if(FAMT.has(t.z)){ flags.fam=true; continue; } if(TITL.has(t.z)||STOP.has(t.z)) continue; if(t.z.length<2&&!/^[0-9]$/.test(t.z)) continue; keep.push(t); }
    const sTok=keep.length?keep:T.filter(t=>t.z.length>=2);
    for(const t of sTok){ t.yr=yearTok(t); alts(t); t.VA=(t.yr||t.dt||t.z.length<3)?null:vocAlts(t); }
    const scoreAll=(TT,need)=>{ const R=[]; for(const r of IX){ let tot=0, n=0, hits=[]; for(const t of TT){ const b=scoreTok(r,t,t.A,t.VA); if(b){ tot+=b.sc; n++; hits.push(b); } }
        if(n<need||!n) continue; R.push({r,sc:tot,n,hits}); } return R; };
    let R=[];
    if(relK&&relX){ const XT=relX.filter(t=>!TITL.has(t.z)&&!STOP.has(t.z)); for(const t of XT){ t.yr=null; alts(t); t.VA=vocAlts(t); }
      const nameOnly=L=>{ const o=L.filter(x=>x.hits.every(h=>h.f==="n"||h.f==="a")); return o.length?o:L; };
      let XR=nameOnly(scoreAll(XT,XT.length)); XR.sort((a,b)=>b.sc-a.sc); const top=XR.length?XR[0].sc:0; XR=XR.filter(x=>x.sc>=top*0.85).slice(0,4);
      if(relK==="childOf"&&relA){ const AT=relA.filter(t=>!TITL.has(t.z)&&!STOP.has(t.z)); for(const t of AT){ t.yr=null; alts(t); t.VA=vocAlts(t); }
        let AR=nameOnly(scoreAll(AT,AT.length)); const xs=new Set(scoreAll(XT,XT.length).filter(x=>x.hits.every(h=>h.f==="n"||h.f==="a")).map(x=>x.r.id));
        for(const a of AR){ const u=(UP[a.r.id]||[]).concat(P[a.r.id].sibof?(UP[P[a.r.id].sibof]||[]):[]); const pp=u.find(x=>x&&xs.has(x)); if(pp) out.rel.push({id:a.r.id,sc:a.sc+200,why:"בן/בת פון "+P[pp].n}); }
        out.rel.sort((a,b)=>b.sc-a.sc); }
      else for(const x of XR){ const ids=relOf(x.r.id,relK); out.rel.push({hd:RELN[relK]+" "+P[x.r.id].n, of:x.r.id, ids}); } }
    if(yzd&&YZ){ const ids=[]; for(const e of YZ){ if(!P[e.i]||e.d!==yzd.d||!yzd.ms.includes(e.m)) continue; if(BYID.get(e.i)&&BYID.get(e.i).liv) continue; ids.push(e.i); }
      out.rel.unshift({hd:"יאָרצייט "+T[yzd.i].o+" "+T[yzd.i+1].o, ids:[...new Set(ids)], yz:1}); }
    LB=false; R=scoreAll(sTok,sTok.length); if(R.length<10){ LB=true; R=scoreAll(sTok,sTok.length); }
    if(!R.length&&sTok.length>1){ R=scoreAll(sTok,Math.max(1,sTok.length-1)); out.partial=R.length>0; } LB=false;
    const qn=nz(keep.map(t=>t.o).join(" "));
    for(const x of R){ const r=x.r; if(qn&&r.nmz===qn) x.sc+=300; else if(qn&&r.nmz.startsWith(qn)) x.sc+=60;
      if(flags.rab){ if(x.hits.every(h=>!/^[kfo]$/.test(h.why))&&RABQ.test(String(P[r.id].n||"")+" · "+r.F.t)&&!/^(מרת|הרבנית|רבנית)/.test(String(P[r.id].n||""))) x.sc+=80; else x.sc-=20; }
      if(flags.fem&&/^(מרת|הרבנית|רבנית)|לבית/.test(String(P[r.id].n||""))) x.sc+=30;
      if(typeof N!=="undefined"&&N[r.id]) x.sc+=4; if(r.pic) x.sc+=2; if(P[r.id].m==="ok") x.sc+=1; }
    R.sort((a,b)=>b.sc-a.sc||String(P[a.r.id].n).length-String(P[b.r.id].n).length);
    for(const x of R){ const f=x.hits.reduce((a,b)=>b.sc>a.sc?b:a,x.hits[0]); x.best=f; if(f.f==="s"||f.f==="c") out.srcs.push(x); else out.people.push(x); }
    /* places */
    if(VOCL&&sTok.length){ const PL=[]; for(const v of VOCL){ if(!v.pl) continue; let ok=true, sc=0; for(const t of sTok){ const hit=t.A.some(a=>v.w.includes(a.s)||(a.l&&a.l.length>=4&&v.l.includes(a.l))); if(hit){ sc+=v.w===t.z?3:2; } else { ok=false; break; } } if(ok) PL.push([v,sc]); }
      PL.sort((a,b)=>b[1]-a[1]||b[0].n-a[0].n); const seenG=new Set();
      for(const [v] of PL){ const gi=SYNI.has(v.w)?SYNI.get(v.w):-1; const key=gi>=0?"g"+gi:v.w; if(seenG.has(key)) continue; seenG.add(key); out.places.push(v); if(out.places.length>=4) break; } }
    /* family pills */
    if(typeof PILLS!=="undefined"&&sTok.length===1){ const t=sTok[0]; for(const g of PILLS) for(const it of g.items){ const lab=String(it.label||""); const fz=nz(lab.replace(/^משפחת\s*/,"")); if(!fz) continue;
        if(t.A.some(a=>fz.includes(a.s)||a.s.includes(fz))||(t.z.length>=4&&pk(t.z)===pk(fz))){ let id=null; try{ id=pillId(g,it); }catch(e){} if(id) out.fams.push({lab,rel:it.rel,id}); } } }
    if(!out.people.length&&!out.srcs.length&&!out.rel.length&&!out.places.length) out.dym=didYouMean(sTok);
    out.ms=performance.now()-t0; out.tok=sTok; return out; }
  function didYouMean(TT){ if(!VOCL) return null; const parts=[]; let changed=false;
    for(const t of TT){ if(t.yr){ parts.push(t.o); continue; } let best=null, bd=9; const L=lz(t.z), K=pk(t.z);
      const ok=/^[\u05d0-\u05ea]/.test(t.z)||/[aeiouy]/.test(t.z);
      for(const v of VOCL){ if(Math.abs(v.l.length-L.length)>3) continue; const d=Math.min(ed(v.l,L,3), ok&&K.length>=3&&v.k===K?1:9); if(d<bd||(d===bd&&best&&v.n>best.n)){ bd=d; best=v; } }
      if(best&&bd<=Math.max(1,Math.floor(t.z.length/3))){ parts.push(best.o||best.w); if(best.w!==t.z) changed=true; } else parts.push(t.o); }
    return changed?parts.join(" "):null; }
  /* ---------- showing ---------- */
  function mark(text,toks){ text=String(text||""); if(!text) return ""; const [zs,zm]=nzMap(text); const [ls,lm]=lzMap(zs,zm); const R=[];
    for(const t of (toks||[])){ for(const a of (t.A||[])){ const s=a.s; if(!s||s.length<2) continue; let i=zs.indexOf(s); while(i>=0&&R.length<12){ R.push([zm[i],zm[i+s.length-1]]); i=zs.indexOf(s,i+s.length); }
        if(R.length) continue; const l=lz(s); if(l.length>=4){ i=ls.indexOf(l); if(i>=0) R.push([lm[i],lm[i+l.length-1]]); } } }
    return R; }
  function hl(text,R){ text=String(text||""); if(!R||!R.length) return esc(text); R=R.slice().sort((a,b)=>a[0]-b[0]); let o="", p=0;
    for(const [a,b0] of R){ let b=b0; if(a<p) continue; while(b+1<text.length&&/[\u0591-\u05c7]/.test(text[b+1])) b++; o+=esc(text.slice(p,a))+"<mark>"+esc(text.slice(a,b+1))+"</mark>"; p=b+1; } return o+esc(text.slice(p)); }
  function window_(text,toks,len){ text=String(text||"").replace(/\s*\n\s*/g," · ").replace(/•\s*/g,""); const R=mark(text,toks);
    if(!R.length) return esc(text.length>len?text.slice(0,len)+"…":text);
    const c=R.slice().sort((a,b)=>a[0]-b[0])[0][0]; let a=Math.max(0,c-Math.floor(len*0.35)), b=Math.min(text.length,a+len);
    if(a>0){ const sp=text.lastIndexOf(" ",a+8); if(sp>a-12&&sp>=0) a=sp+1; } if(b<text.length){ const sp=text.indexOf(" ",b-8); if(sp>0&&sp<b+12) b=sp; }
    const seg=text.slice(a,b), R2=R.filter(x=>x[0]>=a&&x[1]<b).map(x=>[x[0]-a,x[1]-a]); return (a>0?"…":"")+hl(seg,R2)+(b<text.length?"…":""); }
  function dates(id){ const r=BYID.get(id); if(!r||r.liv) return ""; const d=String(P[id].d||""); if(!d) return "";
    const pick=s=>{ const m=s.match(/≈?\s*(1[0-9]{3}|20[0-3][0-9])/)||s.match(/(?:^|[^א-ת])(ת[א-ת]{0,2}["״][א-ת])(?![א-ת])/); return m?(m[0].trim().replace(/^[^≈0-9ת]+/,"")):""; };
    const sides=d.split(/\s[–-]\s/); let o=""; if(sides.length>=2){ const a=pick(sides[0]), b=pick(sides.slice(1).join(" ")); if(a||b) o=(a||"?")+" – "+(b||"?"); } else { const a=pick(d); if(a) o=(/נפטר|אומגעקומען|נהרג|פטירה|נלב/.test(d)?"† ":"")+a; }
    if(!o) o=d.length>34?d.slice(0,34)+"…":d; return o; }
  const curTok={v:[]};
  function row(id,why,snipHtml,cls,hits){ const p=P[id], r=BYID.get(id); if(!p) return ""; const ex=(hits||[]).filter(h=>h&&h.s).map(h=>({A:[{s:h.s}]})); const R=mark(p.n,curTok.v.concat(ex)); const dt=dates(id);
    return '<button class="srr'+(cls?" "+cls:"")+'" data-id="'+esc(id)+'"><i style="background:'+bc(id)+'"></i><span class="srn"><b>'+hl(p.n,R)+'</b>'+(dt?'<small class="srdt">'+esc(dt)+'</small>':"")+
      (why?'<small class="srwhy">געפונען אין: '+why+'</small>':"")+(snipHtml&&!(r&&r.liv)?'<span class="srsn">'+snipHtml+'</span>':"")+'</span></button>'; }
  function whyOf(x){ const b=x.best; let w=FWHY[b.why]||FWHY[b.f]||""; if(b.why==="f"||b.why==="k"||b.why==="o"){ const v=VOC&&VOC.get(b.s); w=FWHY[b.why]+(v&&v.o?' ("'+esc(v.o)+'")':"")+" · "+FWHY[b.f]; } if(b.why==="y") w=FWHY.y+" ("+FWHY[b.f]+")"; return w; }
  function snipOf(x){ const r=x.r, b=x.best; if(r.liv) return ""; const f=b.f; if(f==="n") return "";
    let txt=(f==="x"||f==="s"||f==="c")?(r.B?r.B[f]:""):r.F[f]; if(!txt) return "";
    let toks=curTok.v; if(b.why==="f"||b.why==="k") toks=[{A:[{s:b.s}]}];
    if(b.why==="y"){ const yr=x.hits.find(h=>h.why==="y"); const tk=curTok.v.find(t=>t.yr); if(tk){ const ys=[]; for(let y=tk.yr.g[0];y<=tk.yr.g[1]&&ys.length<12;y++) ys.push({s:String(y)}); toks=toks.concat([{A:ys}]); } }
    return window_(txt,toks,f==="x"||f==="s"||f==="c"?120:90); }
  let LIMIT=40, lastQ="", lastRes=null;
  function render(res){ const L=$("srl"); curTok.v=res.tok||[]; let h="";
    if(res.dym) h+='<p class="srm">גארנישט געפונען. <a href="#" class="srdym" data-q="'+esc(res.dym)+'">מיינסטו: <b>'+esc(res.dym)+'</b>?</a></p>';
    const sug=suggest(res.q); if(sug.length) h+='<p class="srsug">פארשלאגן: '+sug.map(s=>'<a href="#" data-q="'+esc(s[0])+'">'+esc(s[1])+'</a>').join(" · ")+'</p>';
    if(res.fams.length){ h+='<h4>משפחות</h4>'; for(const f of res.fams) h+='<button class="srr srf" data-pill="'+esc(f.id)+'"><i style="background:'+bc(f.id)+'"></i><span class="srn"><b>'+esc(f.lab)+'</b><small class="srdt">'+esc(f.rel||"")+'</small><small class="srwhy">גיי צו דער משפחה אויפן בוים</small></span></button>'; }
    for(const g of res.rel){ if(g.hd){ h+='<h4>'+esc(g.hd)+' <small>('+g.ids.length+')</small></h4>'; if(!g.ids.length) h+='<p class="srm">'+(g.yz?"אויפן בוים איז נישטא קיין יאָרצייט אויף דעם טאג":"נישטא אויפן בוים")+'</p>'; for(const id of g.ids.slice(0,60)) h+=row(id,g.yz?"יאָרצייט":"קרובים",""); } }
    const cr=res.rel.filter(g=>!g.hd); if(cr.length){ h+='<h4>קרובים</h4>'; for(const x of cr.slice(0,40)) h+=row(x.id,esc(x.why),""); }
    if(res.people.length){ h+='<h4>אנשים <small>('+res.people.length+(res.partial?", נישט אלע ווערטער":"")+')</small></h4>'; for(const x of res.people.slice(0,LIMIT)) h+=row(x.r.id,whyOf(x),snipOf(x),"",x.hits);
      if(res.people.length>LIMIT) h+='<button class="srmore" type="button">ווייז נאך '+Math.min(40,res.people.length-LIMIT)+' פון '+(res.people.length-LIMIT)+'</button>'; }
    if(res.places.length){ h+='<h4>ערטער</h4>'; for(const v of res.places) h+='<button class="srr srp" data-q="'+esc(v.o||v.w)+'"><i class="srpin">📍</i><span class="srn"><b>'+hl(v.o||v.w,mark(v.o||v.w,curTok.v))+'</b><small class="srwhy">'+v.ids.size+' קארטלעך – טאפט צו זען אלע</small></span></button>'; }
    if(res.srcs.length){ h+='<h4>קוואַלן <small>('+res.srcs.length+')</small></h4>'; for(const x of res.srcs.slice(0,30)) h+=row(x.r.id,whyOf(x),snipOf(x),"",x.hits); }
    if(!h) h='<p class="srm">גארנישט געפונען'+(BODY?"":" (די נאָטיצן לאָדן זיך נאך)")+'</p>';
    L.innerHTML=h; }
  function suggest(q){ if(!VOCL) return []; const T=q.trim().split(/\s+/); const last=T[T.length-1]||""; const z=nz(last); if(z.length<2||/^[0-9]/.test(z)) return []; const L=lz(z);
    const c=[]; for(const v of VOCL){ if(v.w===z||v.w.length<=z.length) continue; if(v.w.startsWith(z)||v.l.startsWith(L)) c.push(v); }
    c.sort((a,b)=>b.ids.size-a.ids.size); const pre=T.slice(0,-1).join(" "); const seen=new Set(); const out=[];
    for(const v of c){ const o=v.o||v.w; if(seen.has(nz(o))) continue; seen.add(nz(o)); out.push([(pre?pre+" ":"")+o,o]); if(out.length>=4) break; } return out; }
  /* recent searches */
  const RK="yichus_search_recent_v1";
  const recent=()=>{ try{ return JSON.parse(localStorage.getItem(RK)||"[]")||[]; }catch(e){ return []; } };
  const remember=q=>{ q=q.trim(); if(q.length<2) return; let a=recent().filter(x=>x!==q); a.unshift(q); a=a.slice(0,8); try{ localStorage.setItem(RK,JSON.stringify(a)); }catch(e){} };
  function srHome(){ const a=recent(); let h="";
    if(a.length){ h+='<h4>לעצטע זוכונגען <a href="#" class="srclr">מעק אויס</a></h4>'; for(const q of a) h+='<button class="srr srrec" data-q="'+esc(q)+'"><i class="srpin">🕘</i><span class="srn">'+esc(q)+'</span></button>'; }
    h+='<h4>וואס מען קען זוכן</h4>';
    const EX=[["לייטנער","א נאָמען, אויף אידיש אדער לאטייניש (Leitner, Akiva Schlesinger)"],["Oradea","אן ארט, אין יעדע שפראך (גרויסווארדיין, Nagyvárad)"],['תרע"ו',"א יאָר, אידיש אדער לועזיש, אדער א צייט (1916, 1880s)"],['ט"ו כסלו',"א יאָרצייט"],["קינדער פון מארטאן","קרובים: קינדער פון, בת, ווייב פון, עלטערן פון"],["רבי פון סאטמאר","רבנים פון א שטאָט"]];
    for(const [q,d] of EX) h+='<button class="srr srex" data-q="'+esc(q)+'"><i class="srpin">🔎</i><span class="srn"><b>'+esc(q)+'</b><small class="srwhy">'+esc(d)+'</small></span></button>';
    $("srl").innerHTML=h; }
  /* ---------- loading ---------- */
  let loading=null;
  function status(){ const st=$("srs"); if(!st) return; st.textContent=IX.length.toLocaleString("en-US")+" קארטלעך"+(BODY?" · אלע נאָטיצן, קוואַלן און בילדער":" · מען לאָדט די נאָטיצן און קוואַלן…"); }
  function load(){ if(loading) return loading; buildCore(); status();
    const gj=(u,f)=>fetch(u+f+"?v="+(window.YV||"")).then(r=>{ if(!r.ok) throw 0; return r.json(); });
    const get=f=>gj("",f).catch(()=>AB?gj(AB,f):Promise.reject());
    get("yz.json").then(j=>{ YZ=(j&&j.e)||[]; }).catch(()=>{});
    loading=get("sidx.json").then(j=>new Promise(res=>{ SIDX=(j&&j.e)||{}; const ids=Object.keys(SIDX); let i=0;
        const step=()=>{ const end=performance.now()+12; while(i<ids.length&&performance.now()<end){ const r=BYID.get(ids[i]); if(r) addBody(r,SIDX[ids[i]]); i++; }
          if(i<ids.length) setTimeout(step,0); else { BODY=true; buildVoc(); status(); res(); } };
        step(); }))
      .catch(()=>{ const st=$("srs"); if(st) st.textContent=IX.length+" קארטלעך · די נאָטיצן האבן זיך נישט געלאָדט (נאר נעמען, ערטער און דאטעס)"; });
    loading.then(()=>{ if(!ov.hidden&&$("srq").value.trim()) run(true); });
    return loading; }
  /* ---------- the panel ---------- */
  const bt=document.createElement("button"); bt.id="srb"; bt.type="button"; bt.setAttribute("aria-label","זוכן");
  bt.innerHTML='<svg viewBox="0 0 24 24" width="19" height="19"><circle cx="10.4" cy="10.4" r="6.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M15 15l5.3 5.3" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>';
  if(gear&&gear.parentNode) gear.parentNode.insertBefore(bt,gear.nextSibling); else document.body.appendChild(bt);
  const ov=document.createElement("div"); ov.id="srp"; ov.hidden=true; ov.setAttribute("role","dialog"); ov.setAttribute("aria-label","זוכן");
  ov.innerHTML='<div class="yzh"><b>זוכן</b><button id="srx" type="button" aria-label="צומאכן">✕</button></div>'+
    '<div class="srw"><input id="srq" type="search" enterkeyhint="search" placeholder="זוך אלעס: נאָמען, שטאָט, יאָר, ספר…" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" dir="auto"><button id="src" type="button" aria-label="אויסמעקן" hidden>⌫</button></div>'+
    '<div id="srs" class="srst"></div><div id="srl"></div>';
  document.body.appendChild(ov);
  const inp=$("srq");
  let pushed=false, skipPop=false;
  function open(){ ov.hidden=false; if(pn&&!pn.hidden){ pn.hidden=true; if(gear) gear.classList.remove("on"); } bt.classList.add("on");
    if(!pushed){ try{ history.pushState({ysr:1},""); pushed=true; }catch(e){} }
    load(); if(!inp.value.trim()) srHome(); else run(true); setTimeout(()=>{ try{ inp.focus({preventScroll:true}); }catch(e){ inp.focus(); } },30); }
  function close(fromPop){ if(ov.hidden) return; ov.hidden=true; bt.classList.remove("on"); try{ inp.blur(); }catch(e){}
    if(pushed&&!fromPop){ pushed=false; skipPop=true; try{ history.back(); }catch(e){ skipPop=false; } } else pushed=false; }
  window.addEventListener("popstate",()=>{ if(skipPop){ skipPop=false; return; } if(!ov.hidden){ pushed=false; close(true); } });
  bt.onclick=()=>{ if(ov.hidden) open(); else close(); };
  $("srx").onclick=()=>close();
  ov.addEventListener("click",ev=>{ if(ev.target===ov) close(); });
  document.addEventListener("keydown",ev=>{ if(ev.key==="Escape"&&!ov.hidden){ ev.preventDefault(); close(); } });
  let tm=null;
  function run(now){ const q=inp.value; $("src").hidden=!q; LIMIT=40; if(!q.trim()){ srHome(); return; } if(!IX.length) buildCore();
    const go=()=>{ lastQ=q; lastRes=search(q); render(lastRes); $("srl").scrollTop=0; window.__srLast=lastRes; };
    clearTimeout(tm); if(now) go(); else tm=setTimeout(go,130); }
  inp.addEventListener("input",()=>run(false));
  inp.addEventListener("keydown",ev=>{ if(ev.key==="Enter"){ ev.preventDefault(); run(true); remember(inp.value); try{ inp.blur(); }catch(e){} } });
  $("src").onclick=()=>{ inp.value=""; run(true); inp.focus(); };
  function jump(id){ if(!P[id]) return; remember(inp.value); close(); if(pn){ pn.hidden=true; if(gear) gear.classList.remove("on"); }
    const tgt=(typeof N!=="undefined"&&N[id])?id:((P[id].sibof&&typeof N!=="undefined"&&N[P[id].sibof])?P[id].sibof:null);
    if(tgt){ focus(tgt,Math.max(s,0.75)); PULSE={id:tgt,t0:performance.now()}; }
    openSheet(id); dirty=true; }
  $("srl").addEventListener("click",ev=>{ const a=ev.target.closest("[data-q]"); if(a){ ev.preventDefault(); inp.value=a.dataset.q; run(true); if(!a.classList.contains("srrec")&&!a.classList.contains("srex")) remember(inp.value); return; }
    if(ev.target.closest(".srclr")){ ev.preventDefault(); try{ localStorage.removeItem(RK); }catch(e){} srHome(); return; }
    if(ev.target.closest(".srmore")){ LIMIT+=40; if(lastRes) render(lastRes); return; }
    const f=ev.target.closest("[data-pill]"); if(f){ remember(inp.value); close(); if(pn) pn.hidden=true; const id=f.dataset.pill; if(typeof N!=="undefined"&&N[id]) pillJump(id); return; }
    const b=ev.target.closest(".srr[data-id]"); if(b) jump(b.dataset.id); });
  window.__sr={open, close, search:q=>{ if(!IX.length) buildCore(); return search(q); }, load, nz, lz, pk, ready:()=>BODY, jump, stat:()=>({voc:VOCL&&VOCL.length,keys:VOCK&&VOCK.size,cards:IX.length})};
})();
/* /SEARCH_V1 */

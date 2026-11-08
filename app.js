(function(){
"use strict";
const D=window.YDATA, P=D.people, UP=D.up, NOTES=D.notes||{};
const W=250, WR=300, G=40, GAP=34, GAPG=60, VCH=120, CHIPW=210;
const BR={L:["לייטנער","--L"],Y:["מאיר (די מאמע פון ר' חנינא אברהם)","--Y"],W:["וואגשאהל","--W"],S:["שפירא (לאנצהוט – דינוב)","--S"],R:["רובין – ראפשיץ – ליזשענסק","--R"],M:["מייזליש","--M"],T:["טייטלבוים","--T"],H:["האלבערשטאם (צאנז)","--H"]};
const MK={ok:["✓","באשטעטיגט פון א מקור"],alt:["א","פון אלטר אליין"],inf:["≈","אָפּגעלערנט פון מקורות (נישט גלייך געשריבן)"],unv:["?","נישט באשטעטיגט"]};
const HEB=["","א","ב","ג","ד","ה","ו","ז","ח","ט","י","י\"א","י\"ב","י\"ג","י\"ד","ט\"ו","ט\"ז","י\"ז","י\"ח","י\"ט","כ","כ\"א","כ\"ב","כ\"ג","כ\"ד","כ\"ה"];
const GENW=["","טאטע","זיידע","עלטער-זיידע"];
const css=getComputedStyle(document.documentElement);
const col=b=>css.getPropertyValue((BR[b]||BR.L)[1]).trim()||"#7a4b2a";
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const world=document.getElementById("world"), svg=document.getElementById("lines"), vp=document.getElementById("vp");
const childrenOf={}; // parent person -> [children persons in tree]
for(const c in UP){const u=UP[c]; for(const p of u) if(p&&P[p]) (childrenOf[p]=childrenOf[p]||[]).push(c);}
function ukey(c){const u=UP[c]; if(!u) return null; const f=u[0]&&P[u[0]]?u[0]:null, m=u[1]&&P[u[1]]?u[1]:null; if(!f&&!m) return null; return (f||"-")+"|"+(m||"-");}
// ---------- build DAG: every person once ----------
const inTree=new Set(); (function walk(p){ if(!p||!P[p]||inTree.has(p)) return; inTree.add(p); const u=UP[p]; if(u){ walk(u[0]); walk(u[1]); } })(D.root);
const par=c=>{ const u=UP[c]||[]; return [u[0]&&P[u[0]]&&inTree.has(u[0])?u[0]:null, u[1]&&P[u[1]]&&inTree.has(u[1])?u[1]:null]; };
const partners={}, male=new Set(), female=new Set();
for(const c of inTree){ const [f,m]=par(c); if(f) male.add(f); if(m) female.add(m); if(f&&m){ (partners[f]=partners[f]||new Set()).add(m); (partners[m]=partners[m]||new Set()).add(f);} }
const nodes=[], unitOf={}, personNode={};
function mkUnit(ids){ const n={type:"unit",persons:ids,kidsE:[],upE:[]}; nodes.push(n); for(const p of ids){ unitOf[p]=n; personNode[p]=n; } return n; }
// components in DFS order from root (so the initial order is the old tree's order)
const seenP=new Set(); const order0=[];
(function dfs(p){ if(!p||seenP.has(p)) return; seenP.add(p); order0.push(p); const [f,m]=par(p); dfs(m); dfs(f); })(D.root);
for(const p of order0){ if(unitOf[p]) continue;
  const comp=[]; const st=[p]; const vis=new Set([p]); while(st.length){ const q=st.pop(); comp.push(q); for(const r of (partners[q]||[])) if(!vis.has(r)){ vis.add(r); st.push(r);} }
  let ids;
  if(comp.length===1) ids=comp;
  else if(comp.length===2){ const [x,y]=comp; ids = (male.has(x)&&!male.has(y))? [y,x] : (male.has(y)&&!male.has(x))? [x,y] : [x,y]; }
  else { const hub=comp.slice().sort((x,y)=>(partners[y]||new Set()).size-(partners[x]||new Set()).size)[0]; const rest=comp.filter(x=>x!==hub); const L=rest.slice(0,Math.ceil(rest.length/2)), R=rest.slice(Math.ceil(rest.length/2)); ids=[...L,hub,...R]; }
  mkUnit(ids); }
// edges: one per child (child card -> parents' anchor)
const edges=[];
for(const c of inTree){ const [f,m]=par(c); if(!f&&!m) continue; const pu=unitOf[f||m]; const e={c,f,m,pu,cu:unitOf[c]}; edges.push(e); pu.kidsE.push(e); unitOf[c].upE.push(e); }
// notes as chips above their person
for(const p of inTree){ for(const t of (NOTES[p]||[])){ const n={type:"note",text:t,persons:[],kidsE:[],upE:[]}; nodes.push(n); const e={c:p,note:true,pu:n,cu:unitOf[p]}; edges.push(e); n.kidsE.push(e); unitOf[p].upE.push(e);} }
// layers: longest path from the root (parents always above every child)
const rootN=unitOf[D.root];
const depthMemo=new Map();
function depthOf(n){ if(depthMemo.has(n)) return depthMemo.get(n); depthMemo.set(n,0); let d=0; for(const e of n.kidsE) d=Math.max(d,depthOf(e.cu)+1); if(n===rootN) d=0; depthMemo.set(n,d); return d; }
for(const n of nodes) n.depth=depthOf(n);
// fix-point (memo guard above can under-count in rare orders)
for(let it=0; it<6; it++){ let ch=false; for(const n of nodes){ let d=0; for(const e of n.kidsE) d=Math.max(d,e.cu.depth+1); if(n!==rootN&&d!==n.depth){ n.depth=d; ch=true; } } if(!ch) break; }
// ---------- DOM cards ----------
function cardHTML(id){
  const p=P[id], m=p.m||"inf", med=p.media||[];
  const por=med.find(x=>x.k==="portrait"); const rest=med.filter(x=>x!==por);
  let h=`<div class="mk ${m}" title="${esc(MK[m][1])}">${MK[m][0]}</div>`;
  if(por) h+=`<img class="pt" loading="lazy" src="${esc(por.f.replace(/\.jpg$/,"_t.jpg"))}" alt="">`;
  h+=`<div class="nm">${esc(p.n)}</div>`;
  if(p.t) h+=`<div class="ti">${esc(p.t)}</div>`;
  if(p.pl) h+=`<div class="pl">${esc(p.pl)}</div>`;
  if(p.d) h+=`<div class="dt">${esc(p.d)}</div>`;
  if(p.s) h+=`<div class="sf"><b>ספרים:</b> ${esc(p.s)}</div>`;
  if(rest.length){ h+=`<div class="th">`+rest.slice(0,4).map(x=>`<img loading="lazy" src="${esc(x.f.replace(/\.jpg$/,"_t.jpg"))}" alt="">`).join("")+(rest.length>4?`<span>+${rest.length-4}</span>`:"")+`</div>`; }
  return h;
}
const el={};
for(const n of nodes){
  if(n.type==="unit"){ n.els=n.persons.map(id=>{const d=document.createElement("div"); d.className="p"+(P[id].m==="unv"?" unv":"")+(P[id].inh?" inh":"")+(id===D.root?" root":""); d.dataset.id=id; d.style.setProperty("--bc",col(P[id].br)); d.innerHTML=cardHTML(id); world.appendChild(d); el[id]=d; return d;});
    n.infs=[]; for(let i=0;i<n.persons.length-1;i++){ const s_=document.createElement("div"); s_.className="inf8"; s_.textContent="∞"; world.appendChild(s_); n.infs.push(s_); } }
  else { const d=document.createElement("div"); d.className="chip "+n.type; d.textContent=n.text; world.appendChild(d); n.els=[d]; }
}
// ---------- measure & layout (layered DAG, crossing reduction, isotonic x) ----------
function pw(id){return id===D.root?WR:W;}
function nodeW(n){ if(n.type!=="unit") return CHIPW; return n.persons.reduce((s_,id)=>s_+pw(id),0)+G*(n.persons.length-1); }
function personOff(n,id){ let x=-nodeW(n)/2; for(const q of n.persons){ if(q===id) return x+pw(q)/2; x+=pw(q)+G; } return 0; }
function anchorOff(n,e){ if(n.type!=="unit") return 0; if(e.f&&e.m){ return (personOff(n,e.f)+personOff(n,e.m))/2; } return personOff(n,e.f||e.m); }
let maxDepth=0; for(const n of nodes) maxDepth=Math.max(maxDepth,n.depth);
const layers=[]; for(let d=0; d<=maxDepth; d++) layers.push([]);
{ const seen=new Set(); const q=[rootN]; seen.add(rootN); while(q.length){ const n=q.shift(); layers[n.depth].push(n); const ups=[]; for(const id of n.persons){ for(const e of unitOf[id].upE) if(e.cu===n&&e.c===id) ups.push(e.pu); } for(const u of ups) if(!seen.has(u)){ seen.add(u); q.push(u);} }
  for(const n of nodes) if(!seen.has(n)) layers[n.depth].push(n); }
function pack(){ for(const L of layers){ let x=0; for(const n of L){ const w=nodeW(n); n.x=x+w/2; x+=w+GAPG; } } }
const childX=(n)=>{ const xs=[]; for(const e of n.kidsE){ xs.push(e.cu.x+(e.cu.type==="unit"?personOff(e.cu,e.c):0) - anchorOff(n,e)); } return xs; };
const parentX=(n)=>{ const xs=[]; for(const e of n.upE){ xs.push(e.pu.x+anchorOff(e.pu,e) - (n.type==="unit"?personOff(n,e.c):0)); } return xs; };
const avg=a=>a.length?a.reduce((s_,v)=>s_+v,0)/a.length:null;
function sweep(){ for(let d=1; d<=maxDepth; d++){ const L=layers[d]; L.forEach((n,i)=>{ const b=avg(childX(n)); n.bc=b==null?(n.x):b; n.oi=i; }); L.sort((a_,b_)=>a_.bc-b_.bc||a_.oi-b_.oi); let x=0; for(const n of L){ const w=nodeW(n); n.x=x+w/2; x+=w+GAPG; } }
  for(let d=maxDepth-1; d>=1; d--){ const L=layers[d]; L.forEach((n,i)=>{ const b=avg(parentX(n)); n.bc=b==null?n.x:b; n.oi=i; }); L.sort((a_,b_)=>a_.bc-b_.bc||a_.oi-b_.oi); let x=0; for(const n of L){ const w=nodeW(n); n.x=x+w/2; x+=w+GAPG; } } }
function flipUnits(){ for(const n of nodes){ if(n.type!=="unit"||n.persons.length<2) continue;
    const px=id=>{ const e=unitOf[id].upE.find(e_=>e_.c===id&&!e_.note); return e? e.pu.x+anchorOff(e.pu,e) : null; };
    if(n.persons.length===2){ const [a_,b_]=n.persons; const xa=px(a_), xb=px(b_); if(xa!=null&&xb!=null&&xa>xb) n.persons=[b_,a_]; else if(xa!=null&&xb==null&&xa>n.x) n.persons=[b_,a_]; else if(xb!=null&&xa==null&&xb<n.x) n.persons=[b_,a_]; } } }
function iso(L){ // place layer L at desired n.dx keeping order and gaps: isotonic regression (pool adjacent violators)
  const k=L.length; if(!k) return; const sft=[0]; for(let i=1;i<k;i++) sft.push(sft[i-1]+nodeW(L[i-1])/2+nodeW(L[i])/2+(L[i-1].type==="unit"&&L[i].type==="unit"?GAPG:GAP));
  const y=L.map((n,i)=>n.dx-sft[i]); const blocks=[]; for(let i=0;i<k;i++){ blocks.push({s:y[i],c:1,i0:i,i1:i}); while(blocks.length>1&&blocks[blocks.length-2].s/blocks[blocks.length-2].c>blocks[blocks.length-1].s/blocks[blocks.length-1].c){ const b2=blocks.pop(), b1=blocks.pop(); blocks.push({s:b1.s+b2.s,c:b1.c+b2.c,i0:b1.i0,i1:b2.i1}); } }
  for(const b of blocks){ const v=b.s/b.c; for(let i=b.i0;i<=b.i1;i++) L[i].x=v+sft[i]; } }
function relax(rounds){ for(let r=0;r<rounds;r++){ const down=r%2===0;
    const seq = down? [...Array(maxDepth+1).keys()].reverse() : [...Array(maxDepth+1).keys()];
    for(const d of seq){ const L=layers[d]; for(const n of L){ const a1=childX(n), a2=parentX(n); const w1=down?1:2, w2=down?2:1; let s_=0,c_=0; for(const v of a1){s_+=v*w1;c_+=w1;} for(const v of a2){s_+=v*w2;c_+=w2;} n.dx=c_?s_/c_:n.x; } iso(L); } } }
pack(); for(let i=0;i<10;i++){ sweep(); flipUnits(); }
for(const L of layers){ for(const n of L) n.dx=n.x; iso(L); } relax(24);
function heights(){ const rh=new Array(maxDepth+1).fill(0); for(const n of nodes) for(const e of n.els) rh[n.depth]=Math.max(rh[n.depth],e.offsetHeight); return rh; }
let BOX={};
function layout(){
  const rh=heights(); const top=new Array(maxDepth+1); let y=0;
  const TITLEH=470; y=TITLEH;
  for(let d=maxDepth; d>=0; d--){ top[d]=y; y+=rh[d]+VCH; }
  const bottom=y-VCH;
  let minX=Infinity,maxX=-Infinity;
  for(const n of nodes){ const w=nodeW(n); minX=Math.min(minX,n.x-w/2); maxX=Math.max(maxX,n.x+w/2); }
  const MARG=130; const ox=-minX+MARG; const worldW=maxX-minX+2*MARG;
  for(const n of nodes){ const w=nodeW(n); let left=n.x-w/2+ox; const t=top[n.depth];
    if(n.type==="unit"){ n.persons.forEach((id,i)=>{ const e=el[id]; e.style.left=left+"px"; e.style.top=t+"px"; left+=pw(id)+G; });
      (n.infs||[]).forEach((s_,i)=>{ const a_=el[n.persons[i]]; s_.style.left=(parseFloat(a_.style.left)+pw(n.persons[i])+G/2-18)+"px"; s_.style.top=(t+18)+"px"; }); }
    else { n.els[0].style.left=left+"px"; n.els[0].style.top=t+"px"; } }
  // lines
  let paths=[];
  const dashed=(e)=>{ const c=P[e.c]; if(c&&(c.m==="unv"||c.inh==="unv")) return true; const ps=[e.f,e.m].filter(Boolean); return ps.length&&ps.every(i=>P[i].m==="unv"); };
  const segs=[];
  for(const e of edges){ const n=e.pu; let x1,y1;
    if(n.type!=="unit"){ const d_=n.els[0]; x1=d_.offsetLeft+d_.offsetWidth/2; y1=d_.offsetTop+d_.offsetHeight; }
    else if(e.f&&e.m){ const a_=el[e.f], b_=el[e.m]; const adj=Math.abs(n.persons.indexOf(e.f)-n.persons.indexOf(e.m))===1;
      if(adj){ const L_=a_.offsetLeft<b_.offsetLeft?a_:b_, R_=L_===a_?b_:a_; x1=(L_.offsetLeft+L_.offsetWidth+R_.offsetLeft)/2; y1=top[n.depth]+48; } else { x1=(a_.offsetLeft+a_.offsetWidth/2+b_.offsetLeft+b_.offsetWidth/2)/2; y1=top[n.depth]+rh[n.depth]; } }
    else { const a_=el[e.f||e.m]; x1=a_.offsetLeft+a_.offsetWidth/2; y1=a_.offsetTop+a_.offsetHeight; }
    const ce=el[e.c]; const x2=ce.offsetLeft+ce.offsetWidth/2, y2=ce.offsetTop; const span=n.depth-e.cu.depth;
    const cls = e.note? "nt" : (dashed(e)?"dz":((D.linkm||{})[e.c]?"li":"ln"));
    segs.push({e,x1,y1,x2,y2,span,cls,key:(n.type==="unit"?n.persons.join(","):"note"+edges.indexOf(e))+"@"+Math.round(x1)}); }
  // tracks: in each gap, every parent-anchor gets its own horizontal track (a "bus"), packed so non-overlapping buses share a track
  const gapOf=sg=>sg.span<=1? sg.e.cu.depth : sg.e.pu.depth-1;
  const groups={}; for(const sg of segs){ const g=gapOf(sg)+"|"+sg.key; (groups[g]=groups[g]||{d:gapOf(sg),items:[],lo:Infinity,hi:-Infinity}); const G_=groups[g]; G_.items.push(sg); const xs=sg.span<=1?[sg.x1,sg.x2]:[sg.x1,sg.x1]; G_.lo=Math.min(G_.lo,...xs)-6; G_.hi=Math.max(G_.hi,...xs)+6; }
  const byGap={}; for(const k in groups){ const G_=groups[k]; (byGap[G_.d]=byGap[G_.d]||[]).push(G_); }
  for(const d in byGap){ const gs=byGap[d].sort((p_,q_)=>p_.lo-q_.lo); const ends=[]; for(const G_ of gs){ let t=ends.findIndex(x=>x<G_.lo); if(t<0){ t=ends.length; ends.push(G_.hi);} else ends[t]=G_.hi; G_.t=t; } const nt=ends.length;
    const y0=top[+d]-VCH+14, y1_=top[+d]-14; for(const G_ of gs){ G_.y = nt<=1? (y0+y1_)/2 : y0+(y1_-y0)*G_.t/(nt-1); for(const sg of G_.items) sg.ych=G_.y; } }
  for(const sg of segs){ const {x1,y1,x2,y2,span,cls}=sg;
    if(span<=1){ paths.push(`<path class="${cls}" d="M${x1},${y1} V${sg.ych} H${x2} V${y2}"/>`); }
    else { const yb=sg.ych; const ych=top[sg.e.cu.depth]-VCH/2; paths.push(`<path class="${cls} lg" d="M${x1},${y1} V${yb} C${x1},${(yb+ych)/2} ${x2},${(yb+ych)/2} ${x2},${ych} V${y2}"/>`); } }
  // generation labels
  const gl=[]; for(let d=0; d<=maxDepth; d++){ const yy=top[d]+Math.min(rh[d],150)/2-30;
    const lab = d===0? `<b>★</b><i>אלטר</i>` : `<b>${HEB[d]||d}</b><i>דור ${d}${GENW[d]?" · "+GENW[d]:""}</i>`;
    gl.push(`<div class="gen" style="left:20px;top:${yy}px">${lab}</div><div class="gen" style="left:${worldW-106}px;top:${yy}px">${lab}</div>`);
    if(d<maxDepth) gl.push(`<div class="genrule" style="left:110px;width:${worldW-220}px;top:${top[d]-VCH/2}px"></div>`); }
  let extra=document.getElementById("extra"); if(!extra){ extra=document.createElement("div"); extra.id="extra"; world.appendChild(extra); }
  const rootX=rootN.x+ox;
  const unplaced=(D.unplaced||[]).length? `<div class="box" style="left:${rootX+300}px;top:${top[0]-10}px"><h3>נאך נישט אריינגעשטעלט אינעם באום</h3><ul>${D.unplaced.map(u=>`<li>${esc(u.n)}</li>`).join("")}</ul></div>`:"";
  extra.innerHTML=`<div id="title" style="left:${worldW/2-900}px;width:1800px;top:40px"><div class="orn">❦</div><h1>יחוס משפחת לייטנער</h1><div class="s1">פון ר' אלטר יעקב יצחק לייטנער נ"י – ${maxDepth} דורות ארויף</div><div class="s2">לייטנער · מאיר · וואגשאהל · שפירא · רובין · מייזליש · טייטלבוים · האלבערשטאם</div></div>`+
    gl.join("")+
    `<div class="box" style="left:${rootX-860}px;top:${top[0]-10}px"><h3>וואס איז נאך אפן</h3><ul>${(D.open||[]).map(o=>`<li>${esc(o)}</li>`).join("")}</ul></div>`+unplaced;
  const worldH=bottom+60;
  svg.setAttribute("width",worldW); svg.setAttribute("height",worldH); svg.setAttribute("viewBox",`0 0 ${worldW} ${worldH}`);
  svg.innerHTML=`<style>.lg{stroke-opacity:.75;stroke-width:1.4}.ln{fill:none;stroke:#a4814e;stroke-width:1.7}.dz{fill:none;stroke:#b0563f;stroke-width:1.6;stroke-dasharray:7 5}.nt{fill:none;stroke:#b8a07a;stroke-width:1.2;stroke-dasharray:3 4}.li{fill:none;stroke:#c08a2b;stroke-width:2;stroke-dasharray:10 4 2 4}</style>`+paths.join("");
  world.style.width=worldW+"px"; world.style.height=worldH+"px";
  BOX={w:worldW,h:worldH};
}
// ---------- pan / zoom ----------
let s=1,tx=0,ty=0; const apply=()=>{world.style.transform=`translate(${tx}px,${ty}px) scale(${s})`;};
const clampS=v=>Math.max(0.03,Math.min(2.6,v));
function zoomAt(cx,cy,f){ const ns=clampS(s*f); const wx=(cx-tx)/s, wy=(cy-ty)/s; s=ns; tx=cx-wx*s; ty=cy-wy*s; apply(); }
let anim=null;
function animTo(ns,ntx,nty,ms=550){ cancelAnimationFrame(anim); const s0=s,x0=tx,y0=ty,t0=performance.now();
  const step=t=>{ let k=Math.min(1,(t-t0)/ms); k=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2; s=s0+(ns-s0)*k; tx=x0+(ntx-x0)*k; ty=y0+(nty-y0)*k; apply(); if(k<1) anim=requestAnimationFrame(step); }; anim=requestAnimationFrame(step); }
const barH=()=>document.getElementById("bar").offsetHeight;
function fit(instant){ const vw=innerWidth, vh=innerHeight-barH(); const ns=Math.min(vw/BOX.w, vh/BOX.h)*0.97;
  const ntx=(vw-BOX.w*ns)/2, nty=barH()+(vh-BOX.h*ns)/2; if(instant){s=ns;tx=ntx;ty=nty;apply();} else animTo(ns,ntx,nty); }
function focusEl(e,ns){ if(!e) return; ns=ns||Math.max(s,innerWidth<760?0.85:1); const cx=e.offsetLeft+e.offsetWidth/2, cy=e.offsetTop+e.offsetHeight/2;
  const vw=innerWidth, vh=innerHeight; const py = innerWidth<760 && !document.getElementById("panel").hidden ? (barH()+(vh*0.28-barH())/2+40) : (barH()+(vh-barH())/2);
  const px = innerWidth>=760 && !document.getElementById("panel").hidden ? (vw-440)/2 : vw/2;
  animTo(ns, px-cx*ns, py-cy*ns); }
const ptrs=new Map(); let st=null, pinch=null;
vp.addEventListener("pointerdown",e=>{ vp.setPointerCapture(e.pointerId); ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  cancelAnimationFrame(anim);
  if(ptrs.size===1){ st={x:e.clientX,y:e.clientY,tx,ty,t:performance.now(),moved:false,target:e.target}; }
  else if(ptrs.size===2){ const [a,b]=[...ptrs.values()]; pinch={d:Math.hypot(a.x-b.x,a.y-b.y),mx:(a.x+b.x)/2,my:(a.y+b.y)/2,s,tx,ty}; if(st) st.moved=true; } });
vp.addEventListener("pointermove",e=>{ if(!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(ptrs.size===1&&st){ const dx=e.clientX-st.x, dy=e.clientY-st.y; if(Math.abs(dx)+Math.abs(dy)>7){ st.moved=true; vp.classList.add("drag"); } if(st.moved){ tx=st.tx+dx; ty=st.ty+dy; apply(); } }
  else if(ptrs.size===2&&pinch){ const [a,b]=[...ptrs.values()]; const d=Math.hypot(a.x-b.x,a.y-b.y), mx=(a.x+b.x)/2, my=(a.y+b.y)/2;
    const ns=clampS(pinch.s*d/pinch.d); const wx=(pinch.mx-pinch.tx)/pinch.s, wy=(pinch.my-pinch.ty)/pinch.s; s=ns; tx=mx-wx*s; ty=my-wy*s; apply(); } });
function up(e){ if(!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId); vp.classList.remove("drag");
  if(ptrs.size===0){ if(st&&!st.moved&&performance.now()-st.t<700) tap(st.target); st=null; pinch=null; }
  else if(ptrs.size===1){ const [a]=[...ptrs.values()]; st={x:a.x,y:a.y,tx,ty,t:0,moved:true}; pinch=null; } }
vp.addEventListener("pointerup",up); vp.addEventListener("pointercancel",up);
vp.addEventListener("wheel",e=>{ e.preventDefault(); cancelAnimationFrame(anim); const k=e.ctrlKey?0.012:0.0016; zoomAt(e.clientX,e.clientY,Math.exp(-e.deltaY*k)); },{passive:false});
document.getElementById("bFit").onclick=()=>fit();
document.getElementById("bIn").onclick=()=>zoomAt(innerWidth/2,innerHeight/2,1.5);
document.getElementById("bOut").onclick=()=>zoomAt(innerWidth/2,innerHeight/2,1/1.5);
window.__yx={openPanel:(i)=>openPanel(i),focus:(i,z)=>focusEl(el[i],z)};
document.getElementById("bAlter").onclick=()=>focusEl(el[D.root],innerWidth<760?0.7:1);
// ---------- panel ----------
let sel=null;
function tap(t){ const c=t.closest&&t.closest(".p"); if(c){ openPanel(c.dataset.id); return; }
  const ch=t.closest&&t.closest(".chip.ref"); if(ch&&ch.onclickTarget){ const tg=ch.onclickTarget; const e=tg.els[tg.els.length-1]; focusEl(e,Math.max(s,0.8)); flash(tg.els); return; }
  closePanel(); }
function flash(els){ els.forEach(e=>{e.classList.add("sel"); setTimeout(()=>e.classList.remove("sel"),1800);}); }
const nameLink=id=>`<a data-go="${esc(id)}">${esc(P[id].n)}</a>`;
function openPanel(id){ const p=P[id]; if(!p) return; if(sel) el[sel]&&el[sel].classList.remove("sel"); sel=id; el[id]&&el[id].classList.add("sel");
  const m=p.m||"inf"; const u=UP[id]||[]; const kids=(childrenOf[id]||[]).filter(c=>P[c]);
  let h=`<div class="hd" style="--bc:${col(p.br)}"><h2>${esc(p.n)}</h2>${p.t?`<div class="ti">${esc(p.t)}</div>`:""}<div class="badge"><span class="mk ${m}" style="background:${m==="ok"?"#5b7a3a":m==="alt"?"#2f6b55":m==="inf"?"#c08a2b":"#a33"}">${MK[m][0]}</span>${esc(MK[m][1])}</div></div>`;
  h+=`<dl>`; if(p.pl) h+=`<dt>ארט</dt><dd>${esc(p.pl)}</dd>`; if(p.d) h+=`<dt>דאטעס</dt><dd>${esc(p.d)}</dd>`; if(p.s) h+=`<dt>ספרים</dt><dd>${esc(p.s)}</dd>`;
  h+=`<dt>משפחה</dt><dd>${esc((BR[p.br]||BR.L)[0])}</dd>`;
  if(u[0]&&P[u[0]]) h+=`<dt>טאטע</dt><dd class="rel">${nameLink(u[0])}</dd>`; if(u[1]&&P[u[1]]) h+=`<dt>מאמע</dt><dd class="rel">${nameLink(u[1])}</dd>`; if(p.inh) h+=`<dt>⚠</dt><dd style="font-size:14px;color:#8a3a12">${p.inh==="unv"?"דער גאנצער צווייג איבער דעם שטייט אויף א '?' שורה ווייטער אונטן: ":"דער צווייג איבער דעם שטייט אויף א '≈' (אפגעלערנטע) שורה ווייטער אונטן: "}${esc(p.inhw||"")}</dd>`; const lm=(D.linkm||{})[id]; if(lm) h+=`<dt>≈</dt><dd style="font-size:14px;color:#8a5a12">${esc(lm[1])}</dd>`;
  const sp=[]; for(const c of kids){ const cu=UP[c]; const o=cu[0]===id?cu[1]:cu[0]; if(o&&P[o]&&!sp.includes(o)) sp.push(o);} if(sp.length) h+=`<dt>∞</dt><dd class="rel">${sp.map(nameLink).join(" · ")}</dd>`;
  if(kids.length) h+=`<dt>קינד</dt><dd class="rel">${kids.map(nameLink).join(" · ")}</dd>`; if(p.sibof&&P[p.sibof]){ const an=P[p.sibof]; const par=(UP[p.sibof]||[]).filter(q=>q&&P[q]); h+=`<dt>געשוויסטער</dt><dd class="rel">${nameLink(p.sibof)}${(p.sibs||[]).length?"":""}</dd>`; if(par.length) h+=`<dt>עלטערן</dt><dd class="rel">${par.map(nameLink).join(" · ")}</dd>`; const os=(an.sibs||[]).filter(s=>s!==id&&P[s]); if(os.length) h+=`<dt>נאך געשוויסטער</dt><dd class="rel" style="font-size:14px">${os.map(nameLink).join(" · ")}</dd>`; }
  if((p.sibs||[]).length) h+=`<dt>געשוויסטער</dt><dd class="rel" style="font-size:14px">${p.sibs.filter(s=>P[s]).map(nameLink).join(" · ")}</dd>`;
  h+=`</dl>`;
  if(p.x) h+=`<div class="x">${esc(p.x)}</div>`;
  if(p.src) h+=`<div class="src"><b>מקור</b>${esc(p.src)}</div>`;
  if((p.links||[]).length) h+=`<div class="lk">`+p.links.map(l=>`<a href="${esc(l.u)}" target="_blank" rel="noopener">${esc(l.t)} ↗</a>`).join("")+`</div>`;
  const med=p.media||[]; if(med.length) h+=`<div class="gal">`+med.map((x,i)=>`<figure data-i="${i}"><img loading="lazy" src="${esc(x.f.replace(/\.jpg$/,"_t.jpg"))}" alt=""><figcaption>${esc(x.cap)}</figcaption></figure>`).join("")+`</div>`;
  const pb=document.getElementById("pB"); pb.innerHTML=h; const pn=document.getElementById("panel"); pn.hidden=false; pn.scrollTop=0;
  pb.querySelectorAll("[data-go]").forEach(a=>a.onclick=()=>{ const t=a.dataset.go; openPanel(t); focusEl(el[t]); });
  pb.querySelectorAll(".gal figure").forEach(f=>f.onclick=()=>openLB(id,+f.dataset.i));
  focusEl(el[id]); }
function closePanel(){ document.getElementById("panel").hidden=true; if(sel&&el[sel]) el[sel].classList.remove("sel"); sel=null; }
document.getElementById("pX").onclick=closePanel;
// ---------- lightbox ----------
let lbId=null, lbI=0;
function openLB(id,i){ lbId=id; lbI=i; const m=P[id].media[i]; const lb=document.getElementById("lb");
  document.getElementById("lbI").src=m.f; document.getElementById("lbC").innerHTML=`${esc(m.cap)}<br><small>${esc(m.cr||"")}${m.u?` · <a href="${esc(m.u)}" target="_blank" rel="noopener">מקור ↗</a>`:""}</small>`;
  const n=P[id].media.length; document.getElementById("lbP").style.display=n>1?"":"none"; document.getElementById("lbN").style.display=n>1?"":"none"; lb.hidden=false; }
document.getElementById("lbX").onclick=()=>document.getElementById("lb").hidden=true;
document.getElementById("lb").addEventListener("click",e=>{ if(e.target.id==="lb") e.currentTarget.hidden=true; });
document.getElementById("lbN").onclick=()=>{const n=P[lbId].media.length; openLB(lbId,(lbI+1)%n);};
document.getElementById("lbP").onclick=()=>{const n=P[lbId].media.length; openLB(lbId,(lbI-1+n)%n);};
addEventListener("keydown",e=>{ if(e.key==="Escape"){ document.getElementById("lb").hidden=true; closePanel(); document.getElementById("search").hidden=true; } });
// ---------- search ----------
const norm=t=>String(t||"").replace(/[\u0591-\u05C7"'״׳()\-–·,.]/g,"").replace(/\s+/g," ").trim();
document.getElementById("bSearch").onclick=()=>{ const s_=document.getElementById("search"); s_.hidden=!s_.hidden; if(!s_.hidden) document.getElementById("q").focus(); };
document.getElementById("q").addEventListener("input",e=>{ const q=norm(e.target.value); const res=document.getElementById("res"); if(q.length<2){res.innerHTML="";return;}
  const hits=Object.keys(P).filter(id=>el[id]&&norm([P[id].n,P[id].t,P[id].pl,P[id].s].join(" ")).includes(q)).slice(0,12);
  res.innerHTML=hits.map(id=>`<div data-id="${esc(id)}">${esc(P[id].n)}${P[id].t?` – <small>${esc(P[id].t)}</small>`:""}</div>`).join("")||"<div>נישט געטראפן</div>";
  res.querySelectorAll("[data-id]").forEach(d=>d.onclick=()=>{ document.getElementById("search").hidden=true; openPanel(d.dataset.id); }); });
// ---------- legend ----------
const lg=document.getElementById("legend");
document.getElementById("lgB").innerHTML=`<div style="margin-bottom:4px">אלטר איז אונטן; יעדער שורה ארויף איז א דור העכער. ביי א פארפאלק: דער מאן רעכטס, ∞ די ווייב לינקס; די עלטערן פון יעדן שטייען גלייך איבער אים/איר.</div>`+
  Object.entries(BR).map(([k,v])=>`<div class="lgr"><i style="background:${col(k)}"></i>${esc(v[0])}</div>`).join("")+
  `<div style="margin-top:6px"></div>`+Object.entries(MK).map(([k,v])=>`<div class="lgr"><span class="mk ${k}" style="background:${k==="ok"?"#5b7a3a":k==="alt"?"#2f6b55":k==="inf"?"#c08a2b":"#a33"}">${v[0]}</span>${esc(v[1])}</div>`).join("")+
  `<div class="lgr"><svg width="26" height="6"><path d="M0,3 H26" stroke="#b0563f" stroke-width="2" stroke-dasharray="6 4"/></svg>א פארבינדונג וואס איז נאך נישט באשטעטיגט</div><div class="lgr"><svg width="26" height="6"><path d="M0,3 H26" stroke="#c08a2b" stroke-width="2" stroke-dasharray="8 3 2 3"/></svg>א פארבינדונג וואס איז אָפּגעלערנט (≈)</div><div class="lgr" style="margin-top:4px">טאפ אויף א נאמען: מקור, לינקס, בילדער פון ספרים, צייטונגען און מצבות.</div>`;
document.getElementById("lgT").onclick=()=>lg.classList.toggle("open");
// ---------- go ----------
function start(){ layout(); fit(true); if(innerWidth<760) setTimeout(()=>{ const r=el[D.root]; const ns=0.42; const cx=r.offsetLeft+r.offsetWidth/2, cy=r.offsetTop+r.offsetHeight; animTo(ns, innerWidth/2-cx*ns, innerHeight-150-cy*ns, 1100); },1500); setTimeout(()=>{const h=document.getElementById("hint"); h.style.opacity=0;},7000); }
if(document.fonts&&document.fonts.ready) document.fonts.ready.then(()=>{ start(); }); else addEventListener("load",start);
let rt; addEventListener("resize",()=>{clearTimeout(rt); rt=setTimeout(()=>fit(true),200);});
window.__yc={fit,openPanel,focusEl,el,nodes,get state(){return {s,tx,ty,BOX};}};
})();


/* מסורה section (Nov 8): chains above the tree, every link with its mark; tradition, clearly labeled */
(function(){
  var M=(window.YDATA||{}).masorah; if(!M||!M.chains) return;
  var bar=document.querySelector('#bar .btns'); if(!bar) return;
  var b=document.createElement('button'); b.id='bMas'; b.className='wide'; b.title='מסורה'; b.textContent='📜 מסורה'; bar.appendChild(b);
  function e(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function mk(m){m=String(m||''); var c=m.indexOf('✓')>=0?'ok':(m.indexOf('≈')>=0?'inf':'unv'); var t=m.indexOf('✓')>=0?'✓':(m.indexOf('≈')>=0?'≈':'❓'); return '<span class="mk '+c+'">'+t+'</span>';}
  function render(){
    var h='<div class="hd"><b>'+e(M.meta&&M.meta.title||'מסורה')+'</b></div>';
    h+='<p class="note">דאס איז <b>מסורה</b> – אלטע יחוס-קייטן ווי זיי ווערן איבערגעגעבן. נישט אלעס איז באוויזן; יעדער לינק האט זיין צייכן און מקור. דורות וואס פעלן ווערן געוויזן ווי א לאך.</p>';
    var L=(M.meta&&M.meta.legend)||{}; h+='<p class="note">'+Object.keys(L).map(function(k){return (k==='gap'?'<b>…</b>':mk(k))+' '+e(L[k]);}).join(' · ')+'</p>';
    M.chains.forEach(function(c){
      h+='<details class="mas"><summary><b>'+e(c.name)+'</b></summary>';
      if(c.site_path&&c.site_path.length) h+='<p class="note">אויפן באום: '+c.site_path.map(function(s){return e(s.n)+' '+mk(s.mark);}).join(' ← ')+'</p>';
      if(c.join) h+='<p class="note">גייט ווייטער מיט: '+e(c.join.chain||'')+' '+e(c.join.at||'')+'</p>';
      (c.nodes||[]).forEach(function(n){
        if(n.gap){h+='<div class="src" style="text-align:center">— '+e(n.gap===true?'דורות חסרים':n.gap)+' —</div>'; if(!n.n) return;}
        h+='<div class="src">'+mk(n.mark)+' <b>'+e(n.n)+'</b>'+(n.t?' – '+e(n.t):'');
        if(n.quote) h+='<br>'+e(n.quote);
        if(n.src) h+='<br><small>'+(n.url?'<a href="'+e(n.url)+'" target="_blank" rel="noopener">'+e(n.src)+'</a>':e(n.src))+'</small>';
        if(n.parent_note) h+='<br><small>'+e(n.parent_note)+'</small>';
        if(n.note) h+='<br><small>'+e(n.note)+'</small>';
        h+='</div>';
      });
      h+='</details>';
    });
    if(M.meta&&M.meta.notes&&M.meta.notes.length) h+='<details class="mas"><summary>באמערקונגען</summary>'+M.meta.notes.map(function(x){return '<p class="note">'+e(x)+'</p>';}).join('')+'</details>';
    return h;
  }
  b.addEventListener('click',function(){var p=document.getElementById('panel'),pb=document.getElementById('pB'); if(!p||!pb) return; pb.innerHTML=render(); p.hidden=false; pb.scrollTop=0;});
})();

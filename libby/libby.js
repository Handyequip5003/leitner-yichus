/* LIBBY SITE lock (built by build_libby.py — do not edit by hand): PIN screen, WebCrypto PBKDF2-SHA256 -> AES-256-GCM,
   decrypts x/c.bin into window.YDATA, serves d/NN.json + yz.json from x/*.bin, then loads app.js. Key remembered in localStorage. */
(function(){ "use strict";
const V=window.YV||"", LK="libby_key_v1", te=new TextDecoder();
const $=id=>document.getElementById(id);
const b64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0)), u8b64=u=>{ let s=""; for(let i=0;i<u.length;i++) s+=String.fromCharCode(u[i]); return btoa(s); };
let KEY=null, META=null; const CACHE={};
function bin(n){ return fetch("x/"+n+".bin?v="+V,{cache:"no-cache"}).then(r=>{ if(!r.ok) throw new Error("net "+r.status); return r.arrayBuffer(); }); }
function dec(buf,k){ const u=new Uint8Array(buf); return crypto.subtle.decrypt({name:"AES-GCM",iv:u.slice(0,12)},k||KEY,u.slice(12)).then(p=>te.decode(p)); }
function derive(pin){ return crypto.subtle.importKey("raw",new TextEncoder().encode(pin),"PBKDF2",false,["deriveKey"])
  .then(b=>crypto.subtle.deriveKey({name:"PBKDF2",hash:"SHA-256",salt:b64(META.s),iterations:META.it},b,{name:"AES-GCM",length:256},true,["decrypt"])); }
function imp(raw){ return crypto.subtle.importKey("raw",b64(raw),{name:"AES-GCM"},true,["decrypt"]); }
/* the app asks for d/NN.json and yz.json: answer them from the encrypted copies, never from the network */
const of=window.fetch.bind(window);
window.fetch=function(u,o){ const s=String(u&&u.url||u); let m=s.match(/(?:^|\/)d\/(\d\d)\.json/), n=m?m[1]:(/(?:^|\/)yz\.json/.test(s)?"y":null);
  if(!n||!KEY) return of(u,o);
  const p=CACHE[n]||(CACHE[n]=bin(n).then(b=>dec(b)));
  return p.then(t=>new Response(t,{status:200,headers:{"Content-Type":"application/json"}}),e=>{ delete CACHE[n]; throw e; }); };
function boot(core){ window.YDATA=JSON.parse(core); $("lk").remove(); document.body.classList.remove("locked");
  const s=document.createElement("script"); s.src="app.js?v="+V; s.onload=addOut; document.body.appendChild(s); }
function addOut(){ const p=$("setp"); if(!p||$("lbo")) return; const b=document.createElement("button"); b.id="lbo"; b.type="button"; b.textContent="ארויסגיין";
  b.style.cssText="display:block;margin:14px auto 4px;padding:8px 22px;border-radius:18px;border:1px solid #b08d57;background:#fffaf0;color:#5d4a30;font:inherit;font-size:15px;cursor:pointer";
  b.onclick=()=>{ try{ localStorage.removeItem(LK); }catch(e){} location.replace(location.pathname); }; p.appendChild(b); }
function err(t){ const e=$("lke"); e.textContent=t; e.hidden=false; }
function tryPin(){ const pin=$("lkp").value.trim(); if(!pin){ $("lkp").focus(); return; } $("lkb").disabled=true; $("lke").hidden=true; $("lkw").hidden=false;
  let k; derive(pin).then(x=>{ k=x; return bin("c"); }).then(b=>dec(b,k)).then(core=>{ KEY=k;
      return crypto.subtle.exportKey("raw",k).then(r=>{ try{ localStorage.setItem(LK,JSON.stringify({s:META.s,k:u8b64(new Uint8Array(r))})); }catch(e){} return core; }); })
    .then(boot,e=>{ $("lkb").disabled=false; $("lkw").hidden=true; const net=/net|fetch|Failed/i.test(String(e&&e.message||e));
      err(net?"דער בוים האט זיך נישט געלאָדט – פרובירט נאכאמאל":"אומריכטיג PIN"); $("lkp").select(); }); }
function showLock(){ document.body.classList.add("locked"); $("lk").hidden=false; $("lkp").focus();
  $("lkb").onclick=tryPin; $("lkp").addEventListener("keydown",e=>{ if(e.key==="Enter") tryPin(); }); }
if(!(window.crypto&&crypto.subtle)){ document.addEventListener("DOMContentLoaded",()=>{ showLock(); err("דער בלעטערער קען נישט עפענען – עפנט עס אין Chrome"); }); return; }
fetch("x/k.json?v="+V,{cache:"no-cache"}).then(r=>r.json()).then(m=>{ META=m; let st=null; try{ st=JSON.parse(localStorage.getItem(LK)||"null"); }catch(e){}
  if(st&&st.s===m.s&&st.k) return imp(st.k).then(k=>bin("c").then(b=>dec(b,k)).then(core=>{ KEY=k; boot(core); }))
      .catch(()=>{ try{ localStorage.removeItem(LK); }catch(e){} showLock(); });
  showLock(); }).catch(()=>{ showLock(); err("דער בוים האט זיך נישט געלאָדט – פרובירט נאכאמאל"); });
})();

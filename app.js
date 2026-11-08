
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

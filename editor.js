/* A local-first editor. No credentials, remote writes, trackers or dependencies. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const parser = new DOMParser();
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const storageKey = 'material-prompts-editor-v1:' + location.pathname;
  let files = {}, site, baseline, history = [], timer, savedDraft, dirty = false, rendering = false;
  const sections = {hero:'.hero', institution:'.institution', about:'#about', programme:'#programme', who:'#who', organisers:'#organisers', participate:'#participate', acknowledgements:'.acknowledgements'};
  const mime = name => /\.css$/.test(name)?'text/css':/\.svg$/.test(name)?'image/svg+xml':/\.png$/.test(name)?'image/png':/\.webp$/.test(name)?'image/webp':/\.jpg$|\.jpeg$/.test(name)?'image/jpeg':'application/octet-stream';
  function bytes(base64) { return Uint8Array.from(atob(base64), c=>c.charCodeAt(0)); }
  function base64(data) { let s=''; for(let i=0;i<data.length;i+=32768) s+=String.fromCharCode(...data.subarray(i,i+32768)); return btoa(s); }
  function read(name) { if(!files[name]) throw Error('Missing file: '+name); return dec.decode(bytes(files[name])); }
  function write(name,text) { files[name]=base64(enc.encode(text)); }
  function status(text,error=false) { $('status').textContent=text; $('status').classList.toggle('error',error); }
  function applyWorkshopUpdates(){
    site.querySelector('.hero .button')?.remove();
    const prompts=site.querySelector('.prompts');
    if(prompts){const paragraphs=[...prompts.querySelectorAll('li')].filter(n=>n.textContent.trim()).map(n=>{const p=site.createElement('p');p.innerHTML=n.innerHTML;return p;});prompts.replaceWith(...paragraphs);}
    const institution=site.querySelector('.institution');if(institution)institution.hidden=!institution.textContent.trim();
    const introduction=site.querySelector('#participate .join-grid > div > p:not(.eyebrow)');
    if(introduction)introduction.innerHTML=introduction.innerHTML.replace('prompts below via the link','prompts in the application form').replace('prompts below','prompts in the application form');
    site.querySelectorAll('.acknowledgements-copy p').forEach(p=>{if(!p.textContent.trim())p.remove();});
    if(!site.querySelector('.country-acknowledgement')&&!site.querySelector('[data-country-merged]')){const wrapper=site.createElement('div');wrapper.innerHTML="    <section class=\"country-acknowledgement\" aria-labelledby=\"country-title\">\n      <h2 id=\"country-title\">Acknowledgement of Country</h2>\n      <div><p>We acknowledge the Yugarabul, Yuggera, Jagera and Turrbal peoples, the Traditional Custodians of the lands in Brisbane where this workshop was conceived, and the Kaurna people, the Traditional Custodians of the lands in Adelaide where we will gather.</p><p>We honour their enduring relationships with Country and pay our respects to Elders past and present. We extend that respect to all Aboriginal and Torres Strait Islander peoples participating in this workshop.</p></div>\n    </section>\n";site.querySelector('.footer-bottom').before(wrapper.firstElementChild);}
    const country=site.querySelector('.country-acknowledgement');
    const acknowledgementCopy=site.querySelector('.acknowledgements-copy');
    if(country&&acknowledgementCopy){
      country.querySelectorAll('p').forEach(p=>{if(p.textContent.trim())acknowledgementCopy.append(p);});
      country.remove();acknowledgementCopy.setAttribute('data-country-merged','true');
    }
  }
  function html() { return '<!doctype html>\n'+site.documentElement.outerHTML+'\n'; }
  function snapshot() { return {html:html(), files:{...files}, at:new Date().toISOString()}; }
  function remember() { history.push(snapshot()); if(history.length>25)history.shift(); $('undo').disabled=false; }
  function safeURL(value) { return /^(https?:\/\/|mailto:|#)/i.test(value.trim()) && !/[\u0000-\u001f]/.test(value); }
  function cleanRich(value) {
    const box=document.createElement('div'); box.innerHTML=value;
    for(const el of [...box.querySelectorAll('*')]) {
      if(!['A','SPAN','STRONG','B','EM','I','BR'].includes(el.tagName)) { el.replaceWith(...el.childNodes); continue; }
      for(const a of [...el.attributes]) if(!['href','class','aria-hidden'].includes(a.name))el.removeAttribute(a.name);
      if(el.tagName==='A' && !safeURL(el.getAttribute('href')||''))el.removeAttribute('href');
    }
    return box.innerHTML;
  }
  function changed() {
    dirty=true;const institution=site.querySelector('.institution');if(institution)institution.hidden=!institution.textContent.trim(); clearTimeout(timer);
    timer=setTimeout(()=>{render(); saveDraft();},200);
  }
  function saveDraft() {
    try { localStorage.setItem(storageKey,JSON.stringify(snapshot())); status('Draft saved on this browser. Download and upload to GitHub to publish.'); }
    catch { status('Browser storage is unavailable or full. Download your website before closing this page.',true); }
  }
  function render(section) {
    const copy=site.cloneNode(true);
    copy.querySelectorAll('script').forEach(x=>x.remove());
    copy.querySelectorAll('*').forEach(el=>[...el.attributes].filter(a=>a.name.startsWith('on')).forEach(a=>el.removeAttribute(a.name)));
    copy.querySelectorAll('link[rel=stylesheet]').forEach(link=>{ const style=copy.createElement('style');style.textContent=read(link.getAttribute('href'));link.replaceWith(style); });
    copy.querySelectorAll('img').forEach(img=>{const name=img.getAttribute('src');if(files[name])img.src='data:'+mime(name)+';base64,'+files[name];});
    copy.querySelectorAll('link[rel=icon]').forEach(x=>x.remove());
    let scroll=0; try {scroll=$('preview').contentWindow.scrollY;}catch{}
    $('preview').onload=()=>{
      const frame=$('preview');
      frame.contentDocument.addEventListener('click',e=>{if(e.target.closest('a'))e.preventDefault();});
      if(section && sections[section]) frame.contentDocument.querySelector(sections[section])?.scrollIntoView();
      else frame.contentWindow.scrollTo(0,scroll);
      rendering=false;
    };
    rendering=true; $('preview').srcdoc='<!doctype html>\n'+copy.documentElement.outerHTML;
  }
  function field(label,value,update,opts={}) {
    const box=document.createElement('div');box.className='field';
    const id='field-'+$('fields').querySelectorAll('.field').length;
    const title=document.createElement('label');title.textContent=label;title.htmlFor=id;box.append(title);
    const input=document.createElement(opts.rich?'div':opts.multiline?'textarea':'input');input.id=id;input.setAttribute('aria-label',label);
    if(opts.rich){input.className='rich';input.contentEditable='true';input.setAttribute('role','textbox');input.setAttribute('aria-multiline','true');input.innerHTML=value;}
    else{if(input.tagName==='INPUT')input.type=opts.type||'text';input.value=value;}
    let focused=false;
    input.addEventListener('focus',()=>{if(!focused){remember();focused=true;}});
    input.addEventListener('blur',()=>{focused=false;});
    input.addEventListener('input',()=>{
      const v=opts.rich?cleanRich(input.innerHTML):input.value;
      if(opts.validate&&!opts.validate(v)){input.setCustomValidity?.('Enter a complete https:// link, a mailto: address or a #section link.');input.reportValidity?.();return;}
      input.setCustomValidity?.('');update(v);changed();
    });
    if(opts.rich){
      input.addEventListener('click',e=>{if(e.target.closest('a'))e.preventDefault();});
      input.addEventListener('paste',e=>{e.preventDefault();const t=e.clipboardData.getData('text/plain');const sel=window.getSelection();if(!sel.rangeCount)return;const range=sel.getRangeAt(0);range.deleteContents();const n=document.createTextNode(t);range.insertNode(n);range.setStartAfter(n);range.collapse(true);sel.removeAllRanges();sel.addRange(range);input.dispatchEvent(new Event('input'));});
      input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();const sel=window.getSelection();if(!sel.rangeCount)return;const r=sel.getRangeAt(0);r.deleteContents();const br=document.createElement('br');r.insertNode(br);r.setStartAfter(br);r.collapse(true);sel.removeAllRanges();sel.addRange(r);input.dispatchEvent(new Event('input'));}});
    }
    box.append(input);
    if(opts.note){const note=document.createElement('small');note.textContent=opts.note;box.append(note);}
    $('fields').append(box);return input;
  }
  function plain(label,selectors) {
    const nodes=selectors.flatMap(s=>[...site.querySelectorAll(s)]);
    if(!nodes.length)return;
    field(label,nodes[0].textContent,v=>nodes.forEach(n=>n.textContent=v));
  }
  function title(text){const h=document.createElement('h2');h.className='group-title';h.textContent=text;$('fields').append(h);}
  function detailFields(){
    title('Key information');
    plain('Workshop date',['.facts div:nth-child(2) dd','.join-details div:nth-child(3) dd']);
    plain('Application deadline',['.facts div:nth-child(3) dd','.join-details div:nth-child(1) dd']);
    plain('Participant notifications',['.join-details div:nth-child(2) dd']);
    plain('Workshop format',['.facts div:nth-child(1) dd']);
    const location=site.querySelector('.join-details div:nth-child(4) dd');
    field('Venue and room',location.innerHTML,v=>location.innerHTML=v,{rich:true});
    title('Application & contact');
    field('Application form URL',site.querySelector('.button').getAttribute('href'),v=>site.querySelectorAll('.button').forEach(a=>a.setAttribute('href',v.trim())),{validate:safeURL,note:'Updates the application button in the participation section.'});
    const contact=site.querySelector('a[href^="mailto:"]');
    field('Contact email',contact.getAttribute('href').slice(7),v=>{site.querySelectorAll('a[href^="mailto:"]').forEach(a=>{a.setAttribute('href','mailto:'+v.trim());if(a.textContent.includes('@'))a.textContent=v.trim();});},{type:'email',note:'Updates all contact email links.'});
    title('Browser & search information');
    field('Page title',site.title,v=>site.title=v);
    const description=site.querySelector('meta[name=description]');field('Page description',description.content,v=>description.content=v,{multiline:true});
  }
  function sectionFields(key){
    const root=site.querySelector(sections[key]);
    const nodes=[...root.querySelectorAll('h1,h2,h3,p,li,dt,dd,th,td,a.button,.footer-bottom span,.footer-bottom a')].filter(n=>!n.parentElement.closest('p,li,td,th,dd'));
    nodes.forEach((node,i)=>{
      let label={H1:'Main title',H2:'Section heading',H3:'Heading',P:'Text',LI:'Application prompt',DT:'Detail label',DD:'Detail',TH:'Time / column label',TD:'Programme activity',A:'Button / link label',SPAN:'Footer text'}[node.tagName]||'Text';
      if(node.classList.contains('eyebrow'))label='Section label';
      if(node.classList.contains('affiliation'))label='Affiliation';
      if(node.classList.contains('image-credit'))label='Photo credit';
      if(node.closest('.people article'))label=node.closest('article').querySelector('h3').textContent+' — '+label;
      field(label,node.innerHTML,v=>node.innerHTML=v,{rich:true});
    });
    if(key==='hero')photoFields();
  }
  function photoFields(){
    title('Main photograph');const img=site.querySelector('.hero-image');
    const box=document.createElement('div');box.className='field';const label=document.createElement('label');label.htmlFor='photo-file';label.textContent='Replace photo';box.append(label);
    const input=document.createElement('input');input.id='photo-file';input.type='file';input.accept='image/jpeg,image/png,image/webp';box.append(input);
    const note=document.createElement('small');note.textContent='JPG, PNG or WebP, up to 15 MB. Large photos are resized for the web. Update the photo credit above too.';box.append(note);$('fields').append(box);
    input.addEventListener('change',async()=>{
      const f=input.files[0];if(!f)return;
      if(!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>15*1024*1024){status('Choose a JPG, PNG or WebP photo smaller than 15 MB.',true);return;}
      try{
        const bitmap=await createImageBitmap(f);const canvas=document.createElement('canvas');const scale=Math.min(1,2000/Math.max(bitmap.width,bitmap.height));canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
        remember();files['assets/robotic-fabrication.jpg']=canvas.toDataURL('image/jpeg',.88).split(',')[1];img.src='assets/robotic-fabrication.jpg';img.width=canvas.width;img.height=canvas.height;changed();
      }catch{status('That image could not be opened. Try another JPG or PNG.',true);}
    });
    field('Photo description for accessibility',img.alt,v=>img.alt=v);
  }
  function linkFields(){
    const note=document.createElement('p');note.className='publish-hint';note.textContent='Use Dates, links & page information to update the application button. Links below can be edited individually.';$('fields').append(note);
    [...site.querySelectorAll('a[href]')].forEach(a=>field(a.textContent.trim()||'Link',a.getAttribute('href'),v=>a.setAttribute('href',v.trim()),{validate:safeURL}));
  }
  function buildFields(){
    $('fields').replaceChildren();const key=$('section').value;
    if(key==='details')detailFields();else if(key==='links')linkFields();else sectionFields(key);
  }
  function restore(snap){if(snap.files['assets/robotic-fabrication.jpg'])files['assets/robotic-fabrication.jpg']=snap.files['assets/robotic-fabrication.jpg'];site=parser.parseFromString(snap.html,'text/html');applyWorkshopUpdates();buildFields();render($('section').value);dirty=true;saveDraft();}
  // ZIP 'store' format: no network library required, UTF-8 file names, standard CRC32.
  function crc(data){let c=0xffffffff;for(const b of data){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
  function zip(entries){
    const pieces=[],central=[];let offset=0,centralSize=0;
    for(const [name,data] of entries){const n=enc.encode(name),sum=crc(data);const h=new Uint8Array(30+n.length),v=new DataView(h.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(12,33,true);v.setUint32(14,sum,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,n.length,true);h.set(n,30);pieces.push(h,data);
      const c=new Uint8Array(46+n.length),w=new DataView(c.buffer);w.setUint32(0,0x02014b50,true);w.setUint16(4,20,true);w.setUint16(6,20,true);w.setUint16(8,0x800,true);w.setUint16(14,33,true);w.setUint32(16,sum,true);w.setUint32(20,data.length,true);w.setUint32(24,data.length,true);w.setUint16(28,n.length,true);w.setUint32(42,offset,true);c.set(n,46);central.push(c);centralSize+=c.length;offset+=h.length+data.length;
    }
    const end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,entries.length,true);v.setUint16(10,entries.length,true);v.setUint32(12,centralSize,true);v.setUint32(16,offset,true);return new Blob([...pieces,...central,end],{type:'application/zip'});
  }
  function download(){
    for(const input of document.querySelectorAll('#fields input')){if(!input.checkValidity()){input.reportValidity();return;}}
    clearTimeout(timer);
    try{
      write('index.html',html());const bundle={...files};delete bundle['editor-data.js'];
      const seed='window.MATERIAL_EDITOR_FILES = '+JSON.stringify(bundle)+';\n';
      const entries=Object.entries(bundle).map(([n,b])=>[n,bytes(b)]);entries.push(['editor-data.js',enc.encode(seed)]);
      const blob=zip(entries),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='material-prompts-site.zip';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);dirty=false;saveDraft();status('ZIP downloaded. Extract it, then upload the files and assets folder to GitHub to publish.');
    }catch(e){status('Could not download: '+e.message,true);}
  }
  async function load(){
    try{
      files={...window.MATERIAL_EDITOR_FILES};
      if(!files['index.html'])throw Error('editor-data.js is missing. Extract the entire ZIP before opening the editor.');
      if(location.protocol!=='file:'){
        const results=await Promise.all(Object.keys(files).map(async name=>{const response=await fetch(name,{cache:'no-store'});if(!response.ok)throw Error(name+' could not be loaded ('+response.status+'). Upload the full website package.');return[name,base64(new Uint8Array(await response.arrayBuffer()))];}));files=Object.fromEntries(results);
      }
      site=parser.parseFromString(read('index.html'),'text/html');applyWorkshopUpdates();baseline=snapshot();
      try {const raw=localStorage.getItem(storageKey);if(raw){savedDraft=JSON.parse(raw);if(savedDraft.html!==html() || savedDraft.files['assets/robotic-fabrication.jpg']!==files['assets/robotic-fabrication.jpg'])$('draft-banner').hidden=false;}}catch{}
      buildFields();render();$('section').disabled=false;$('download').disabled=false;status('Ready. Changes stay in this browser until you download and publish.');
    }catch(e){status(e.message,true);$('fields').textContent='The editor could not open the website. Check the message below.';}
  }
  $('section').addEventListener('change',()=>{clearTimeout(timer);buildFields();render($('section').value);if(dirty)saveDraft();});
  $('undo').addEventListener('click',()=>{const previous=history.pop();if(previous)restore(previous);$('undo').disabled=!history.length;});
  $('download').addEventListener('click',download);
  $('restore').addEventListener('click',()=>{remember();restore(savedDraft);$('draft-banner').hidden=true;});
  $('discard').addEventListener('click',()=>{if(confirm('Discard the saved browser draft? The published website will not change.')){localStorage.removeItem(storageKey);$('draft-banner').hidden=true;status('Saved draft discarded. Editing the current website.');}});
  function resizePreview(){const stage=$('preview-stage');const mobile=$('preview').classList.contains('mobile');const width=mobile?390:1200;const scale=Math.min(1,stage.clientWidth/width);const frame=$('preview');frame.style.width=width+'px';frame.style.height=Math.max(500,stage.clientHeight/scale)+'px';frame.style.transform='scale('+scale+')';frame.style.left=Math.max(0,(stage.clientWidth-width*scale)/2)+'px';}
  new ResizeObserver(resizePreview).observe($('preview-stage'));
  for(const mode of ['desktop','mobile'])$(mode).addEventListener('click',()=>{$('preview').classList.toggle('mobile',mode==='mobile');$('desktop').setAttribute('aria-pressed',String(mode==='desktop'));$('mobile').setAttribute('aria-pressed',String(mode==='mobile'));resizePreview();});
  window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
  load();
})();

import {test,beforeEach,afterEach} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {JSDOM} from 'jsdom'
import {storageKey} from '../dist/engine.mjs'
const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8')
let dom,win,doc,serial=0,copied
const q=s=>doc.querySelector(s)
const click=(action,filter='')=>{
  const b=q('[data-action="'+action+'"]'+filter)
  assert.ok(b,'Missing control '+action+' '+filter);b.click()
}
const named=(key,value)=>'[data-'+key+'="'+value+'"]'
function input(sel,value,type='input'){
  const el=q(sel);assert.ok(el,sel);el.value=value
  el.dispatchEvent(new win.Event(type,{bubbles:true}))
}
const saved=()=>JSON.parse(win.localStorage.getItem(storageKey))
const tick=()=>new Promise(resolve=>setImmediate(resolve))
async function start(snapshot){
  dom=new JSDOM(html,{url:'https://example.test/character-scene-prompt-workshop/',pretendToBeVisual:true})
  win=dom.window;doc=win.document
  Object.assign(globalThis,{window:win,document:doc})
  win.scrollTo=()=>{}
  win.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')}
  win.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new win.Event('close'))}
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{writeText:async s=>{copied=s}}}})
  if(snapshot!==undefined)win.localStorage.setItem(storageKey,snapshot)
  await import('../dist/app.mjs?case='+ ++serial)
}
beforeEach(async()=>{copied=null;await start()})
afterEach(()=>dom.window.close())
test('all accordion buttons preserve output and input modes through close, exclusion and reopen',()=>{
  const text=q('#prompt-value').textContent
  for(const b of doc.querySelectorAll('.acc-head')){
    const before=b.getAttribute('aria-expanded');b.click();assert.notEqual(b.getAttribute('aria-expanded'),before);b.click()
  }
  assert.equal(q('#prompt-value').textContent,text)
  const raw='  <lora:myOC:0.8>\n杏の花 '
  click('mode',named('id','body')+named('value','raw'));input('[data-key="raw"]',raw)
  click('mode',named('id','body')+named('value','off'));assert.ok(!q('#prompt-value').textContent.includes('myOC'))
  click('mode',named('id','body')+named('value','raw'));click('accordion',named('id','body'));click('accordion',named('id','body'))
  assert.equal(q('[data-key="raw"]').value,raw);assert.ok(q('#prompt-value').textContent.includes(raw))
})
test('character save, clothing variants, duplicate, confirmed recall and independent scene',()=>{
  click('accordion',named('id','outfit'));click('variants');click('add-variant');input('#record-name','冬服');click('confirm')
  click('save-char');input('#record-name','ノア');click('confirm')
  const before=saved().draft.sections.camera
  input('[data-key="name"]','編集中');click('library');click('duplicate');assert.equal(saved().characters.length,2)
  click('load-record',named('id',saved().characters[1].id));click('close')
  assert.equal(saved().draft.name,'編集中')
  click('load-record',named('id',saved().characters[1].id));click('confirm')
  assert.equal(saved().draft.name,'ノア');assert.deepEqual(saved().draft.sections.camera,before);assert.equal(saved().draft.variants[0].name,'冬服')
})
test('preset gallery previews affected fields, allows cancel and protects locked scene settings',()=>{
  click('accordion',named('id','bg'));click('toggle-lock',named('id','bg'))
  const bg=saved().draft.sections.bg
  click('all-presets');assert.equal(q('dialog').querySelectorAll('.preset-card').length,12)
  q('dialog [data-id="p09"]').click();assert.ok(q('.change-list'));click('close')
  assert.equal(saved().draft.preset,'p01')
  click('preset',named('id','p03'));click('confirm')
  assert.equal(saved().draft.preset,'p03');assert.deepEqual(saved().draft.sections.bg,bg)
  click('next');click('confirm');assert.equal(saved().draft.sceneNo,2);assert.deepEqual(saved().draft.sections.bg,bg);assert.equal(saved().draft.name,'レイ')
})
test('reset confirmation, cancel, undo and protected saved records',()=>{
  click('mode',named('id','body')+named('value','raw'));input('[data-key="raw"]','test phrase')
  click('save-scene');input('#record-name','シーンA');click('confirm')
  const d=saved().draft
  click('reset-section',named('id','body'));assert.equal(saved().draft.sections.body.raw,'')
  click('undo');assert.deepEqual(saved().draft,d)
  for(const type of ['reset-scene','reset-all']){
    click(type);assert.ok(q('dialog').open);click('close');assert.deepEqual(saved().draft,d)
    click(type);click('confirm');assert.equal(saved().scenes.length,1)
    if(type==='reset-all')assert.equal(saved().draft.name,'')
    else{assert.equal(saved().draft.name,'レイ');assert.deepEqual(saved().draft.sections.bg.values,{})}
    click('undo');assert.deepEqual(saved().draft,d)
  }
})
test('seven formats and both copy entry points use current output and report success',async()=>{
  for(const opt of [...q('[data-key="format"]').options]){
    input('[data-key="format"]',opt.value,'change');const text=q('#prompt-value').textContent
    click('copy-all');await tick();assert.equal(copied,text);assert.match(q('#toast').textContent,/コピーしました/)
  }
  click('out-tab',named('id','section'));click('copy-section',named('id','body'));await tick()
  assert.match(copied,/キャラクター素体/);assert.ok(!copied.includes('衣装'))
})
test('live camera warnings, reset of optional angle, section exclusion',()=>{
  click('accordion',named('id','camera'));click('camera-choice',named('id','face'))
  click('accordion',named('id','pose'));input('[data-section="pose"][data-field="stance"]','kneel','change')
  assert.match(q('#warnings').textContent,/足元/);assert.equal(saved().draft.sections.camera.values.shot,'face')
  click('camera-tab',named('id','angle'));click('camera-choice',named('id','dutch'));assert.match(q('#prompt-value').textContent,/Dutch angle/)
  click('camera-clear');assert.ok(!q('#prompt-value').textContent.includes('Dutch angle'))
  click('mode',named('id','pose')+named('value','off'));assert.ok(!q('#warnings').textContent.includes('足元'))
})
test('scene duplication, custom preset, combined raw text and original Japanese preserved',()=>{
  click('combined');input('#combined-value','<lora:myOC:1>\n日本語');q('#combined-on').checked=true;click('confirm')
  assert.match(q('#warnings').textContent,/一括入力/);assert.ok(q('#prompt-value').textContent.startsWith('<lora:myOC:1>\n日本語'))
  click('save-scene');input('#record-name','温室');click('confirm')
  click('all-presets');click('save-preset');input('#record-name','窓の光');click('confirm')
  click('library');click('lib-tab',named('id','scenes'));click('duplicate')
  assert.equal(saved().scenes.length,2);assert.equal(saved().customPresets.length,1)
  click('lib-tab',named('id','customPresets'));click('load-record');click('confirm')
  assert.equal(saved().draft.sceneName,'窓の光')
})
test('reopening stored draft restores text, open sections and chosen format',async()=>{
  click('accordion',named('id','camera'));click('mode',named('id','camera')+named('value','raw'))
  input('[data-section="camera"][data-key="raw"]','from a doorway');input('[data-key="format"]','md','change')
  const snapshot=win.localStorage.getItem(storageKey);dom.window.close();await start(snapshot)
  assert.equal(q('[data-section="camera"][data-key="raw"]').value,'from a doorway');assert.equal(q('[data-key="format"]').value,'md')
  assert.match(q('#prompt-value').textContent,/## カメラ・構図\nfrom a doorway/)
})
test('invalid JSON, valid import, confirm cancel and storage corruption handling',async()=>{
  click('accordion',named('id','camera'))
  const snapshot=JSON.stringify(saved())
  async function pick(text){
    const file=q('#importfile');Object.defineProperty(file,'files',{configurable:true,value:[{text:async()=>text}]})
    file.dispatchEvent(new win.Event('change',{bubbles:true}));await tick()
  }
  await pick('{broken');assert.match(q('#modal-title').textContent,/失敗/);click('close');assert.equal(JSON.stringify(saved()),snapshot)
  const incoming=JSON.parse(snapshot);incoming.draft.name='移行後'
  await pick(JSON.stringify(incoming));click('close');assert.equal(JSON.stringify(saved()),snapshot)
  await pick(JSON.stringify(incoming));click('confirm');assert.equal(saved().draft.name,'移行後')
  dom.window.close();await start('damaged');assert.match(q('#save-error').textContent,/自動保存を停止/)
  input('[data-key="name"]','退避用');assert.equal(win.localStorage.getItem(storageKey),'damaged')
})

test('imported personal presets only display trusted local illustration sources',async()=>{
  click('accordion',named('id','body'))
  const imported=saved()
  imported.customPresets.push({id:'mine',name:'<カスタム>',values:{emotion:{face:'smile'}},image:'https://example.invalid/untrusted-image.webp'})
  dom.window.close();await start(JSON.stringify(imported));click('all-presets')
  const personal=q('dialog [data-id="mine"]')
  assert.equal(personal.querySelector('img'),null)
  assert.ok(personal.textContent.includes('<カスタム>'))
})

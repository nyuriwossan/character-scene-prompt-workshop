import test from 'node:test'
import assert from 'node:assert/strict'
import {sections,sceneIds,fixedIds,presets,formats} from '../dist/catalog.mjs'
import {clone,blankDraft,newStore,generate,warnings,captureCharacter,restoreCharacter,resetScene,resetSection,applyPreset,presetTargets,snapshotPreset,collectGroups,readStore,persist,decode,storageKey} from '../dist/engine.mjs'
const demo=()=>newStore().draft
const raw='  <lora:My OC:0.85>, (amber eyes:1.2)\n春の窓  '
test('all seven sections retain values, direct text and locks when collapsed or disabled',()=>{
  for(const {id} of sections){
    const d=demo(),s=d.sections[id],before=generate(d)
    s.open=!s.open;assert.equal(generate(d),before)
    s.mode='raw';s.raw=raw
    assert.equal(generate(d,'tags',id),raw)
    const values=clone(s.values),lock=s.locked
    s.mode='off'
    for(const format of Object.keys(formats))assert.equal(generate(d,format,id),'')
    s.mode='preset';assert.deepEqual(s.values,values);assert.equal(s.locked,lock)
    s.mode='raw';assert.equal(s.raw,raw)
  }
})
test('every blank format is empty, all enabled formats respect raw strings',()=>{
  for(const f of Object.keys(formats)){
    const d=blankDraft()
    assert.equal(generate(d,f),'')
    d.sections.style.mode='raw';d.sections.style.raw=raw
    assert.ok(generate(d,f).includes(raw))
    d.sections.style.mode='off';assert.equal(generate(d,f),'')
  }
})
test('seven output formats, targeted wording and ordering',()=>{
  const d=demo()
  assert.equal(Object.keys(formats).length,7)
  assert.match(generate(d,'tags'),/^young man, silver hair/)
  assert.match(generate(d,'sdxl'),/^solo, young man,/)
  assert.match(generate(d,'novel'),/^1boy, young man,/)
  assert.match(generate(d,'prose'),/The face shows a gentle smile\./)
  assert.match(generate(d,'tsubaki'),/Frame the scene as an upper-body portrait\./)
  assert.ok(generate(d,'tsubaki').indexOf('Frame the scene')<generate(d,'tsubaki').indexOf('The face shows'))
  assert.match(generate(d,'md'),/^## キャラクター素体\n/)
  assert.match(generate(d,'ja'),/【キャラクター素体】\n青年、銀髪/)
})
test('all twelve presets have valid options and preserve fixed settings and manual text',()=>{
  for(const p of presets){
    const d=demo(),char=captureCharacter(d)
    d.sections.bg.locked=true;d.sections.pose.raw=raw
    const bg=clone(d.sections.bg)
    applyPreset(d,p)
    assert.deepEqual(captureCharacter(d),char);assert.deepEqual(d.sections.bg,bg)
    assert.equal(d.sections.pose.raw,raw)
    assert.equal(decode(JSON.stringify({...newStore(),draft:d})).draft.preset,p.id)
  }
  assert.equal(presets.length,12)
})
test('presets preview precise changed sections and skip all locked',()=>{
  const d=demo();d.sections.camera.locked=true
  assert.deepEqual(presetTargets(d,presets[1]),['emotion','pose','bg'])
  for(const i of sceneIds)d.sections[i].locked=true
  const before=clone(d);applyPreset(d,presets[2]);assert.deepEqual(d,before)
})
test('character capture and restore separate from scene; independent variants, duplicates',()=>{
  const d=demo();d.memo='雨の日';d.combined=raw;d.useCombined=true
  d.variants.push({name:'旅装',section:clone(d.sections.outfit)})
  const char=captureCharacter(d),copy=clone(char),next=demo()
  applyPreset(next,presets[8]);const scene=clone(next.sections.bg)
  copy.sections.outfit.values.clothes='coat'
  assert.notDeepEqual(copy.sections.outfit,char.sections.outfit)
  restoreCharacter(next,char)
  assert.deepEqual(captureCharacter(next),char);assert.deepEqual(next.sections.bg,scene)
  next.variants[0].name='別名';assert.equal(char.variants[0].name,'旅装')
})
test('next scene keeps character and locked scene sections',()=>{
  const d=demo(),char=captureCharacter(d);d.sections.bg.locked=true
  const bg=clone(d.sections.bg)
  resetScene(d,true);assert.equal(d.sceneNo,2);assert.deepEqual(captureCharacter(d),char)
  assert.deepEqual(d.sections.bg,bg);assert.deepEqual(d.sections.camera.values,{})
})
test('three resets have exact scope and can restore snapshot',()=>{
  const store=newStore(),d=store.draft,original=clone(d),char=captureCharacter(d)
  d.sections.bg.mode='raw';d.sections.bg.raw=raw
  const undo=clone(d);resetSection(d,'bg')
  assert.equal(d.sections.bg.raw,'');assert.deepEqual(d.sections.body,original.sections.body)
  store.draft=clone(undo);assert.equal(store.draft.sections.bg.raw,raw)
  resetScene(d);assert.deepEqual(captureCharacter(d),char)
  for(const k of sceneIds)assert.equal(generate(d,'tags',k),'')
  store.characters.push({id:'c',data:char,name:'a',date:'2026-01-01'})
  store.scenes.push({id:'s',data:original,name:'b',date:'2026-01-01'})
  store.customPresets.push(snapshotPreset(original,'mine','私の場面'))
  store.draft=blankDraft();assert.equal(generate(store.draft),'')
  assert.equal(decode(JSON.stringify(store)).customPresets.length,1)
})
test('conflict warnings never overwrite choices',()=>{
  const d=demo();d.sections.camera.values.shot='face';d.sections.pose.values.stance='kneel'
  d.sections.camera.values.pov='pov';d.sections.camera.values.target='hero'
  d.sections.emotion.values={face:'wide',gaze:'closed'}
  const original=clone(d)
  assert.ok(warnings(d).some(t=>t.includes('足元')));assert.ok(warnings(d).some(t=>t.includes('正面像')))
  assert.ok(warnings(d).some(t=>t.includes('視線')));assert.deepEqual(d,original)
  d.sections.pose.mode='off';assert.ok(!warnings(d).some(t=>t.includes('足元')))
})
test('camera angle wins, background-only and raw background remain available',()=>{
  const d=demo();d.sections.bg.values.view='high'
  assert.ok(warnings(d).some(t=>t.includes('優先')))
  assert.ok(!generate(d).includes('high-angle view'))
  d.sections.camera.mode='off';assert.ok(generate(d).includes('high-angle view'))
  d.sections.camera.mode='preset';d.sections.bg.mode='raw';d.sections.bg.raw='high-angle view'
  assert.ok(generate(d).includes('high-angle view'))
})
test('combined overlap shown, disabled combined preserved and excluded',()=>{
  const d=demo();d.combined=raw;d.useCombined=true
  assert.ok(warnings(d).some(t=>t.includes('一括入力')));assert.ok(warnings(d).some(t=>t.includes('日本語')))
  assert.equal(collectGroups(d)[0].items[0].raw,raw)
  d.useCombined=false;assert.ok(!generate(d).includes(raw));assert.equal(d.combined,raw)
})
test('lossless JSON roundtrip and corrupted, unknown or incomplete payload rejection',()=>{
  const store=newStore();store.draft.sections.style.extra=raw
  const snapshot=JSON.stringify(store);assert.deepEqual(decode(snapshot),store)
  for(const value of ['{','null','{}','[]',JSON.stringify({...store,schemaVersion:90})])assert.throws(()=>decode(value))
  for(const mutate of [s=>delete s.draft.sections.camera,s=>s.draft.sections.pose.mode='hide',s=>s.draft.sections.pose.values={bad:'yes'},s=>s.characters=[{}],s=>s.scenes=[{data:[],id:'a'}],s=>s.draft.variants=[{}],s=>s.draft.format='toString']){
    const bad=clone(store);mutate(bad);assert.throws(()=>decode(JSON.stringify(bad)))
  }
  assert.deepEqual(JSON.stringify(store),snapshot)
})
test('storage denial and quota errors are recoverable without modifying previous data',()=>{
  const m=new Map(),storage={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)}
  assert.equal(readStore(storage).error,'')
  const store=newStore();assert.equal(persist(storage,store),'')
  assert.deepEqual(readStore(storage).data,store)
  m.set(storageKey,'broken text');assert.ok(readStore(storage).error);assert.equal(m.get(storageKey),'broken text')
  assert.ok(persist({setItem(){throw Error('QuotaExceededError')}},store));assert.ok(readStore(undefined).error)
})


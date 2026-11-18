import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {byId, formats, presets} from '../dist/catalog.mjs'
import {faceField, placeField, placeWarnings} from '../dist/scene-options.mjs'
import {applyPreset, blankDraft, clone, decode, generate, newStore, resetScene, resetSection, restoreCharacter, warnings} from '../dist/engine.mjs'

const legacyText = await readFile(new URL('./fixtures/v1-workshop.json',import.meta.url),'utf8')
const EnglishTags = ['tags','sdxl','novel','md']
const EnglishProse = ['prose','tsubaki']
const oldFaces = 'smile beam relief blush avert wry lower teary cry tearsmile glare shout anger wide fluster stun neutral knowing taunt wist tense'.split(' ')
const oldPlaces = 'garden glass library window street forest plain'.split(' ')

test('v1.0 draft, saved scene, character and custom preset keep their IDs, names and verbatim text', () => {
  const store=decode(legacyText)
  assert.deepEqual(store,JSON.parse(legacyText))
  assert.equal(store.schemaVersion,1)
  for(const d of [store.draft,store.scenes[0].data]){
    assert.equal(d.name,'レイ')
    assert.equal(d.sections.camera.values.shot,'bust')
    assert.match(generate(d),/upper body shot/)
    assert.doesNotMatch(generate(d),/bust shot/i)
    d.sections.camera.mode='raw'
    for(const format of Object.keys(formats)) assert.ok(generate(d,format,'camera').includes('  bust shot, <lora:my-oc:0.8>\n'))
  }
  const d=blankDraft();restoreCharacter(d,store.characters[0].data);applyPreset(d,store.customPresets[0])
  assert.equal(d.name,'レイ');assert.equal(d.sections.camera.values.shot,'bust')
  assert.ok(generate(d,'tsubaki').includes('an upper-body portrait'))
})

test('all seven formats and all twelve built-in scenes use the new shot wording',()=>{
  assert.equal(presets.length,12)
  for(const p of presets){
    const d=blankDraft();applyPreset(d,p)
    for(const format of Object.keys(formats)) assert.doesNotMatch(generate(d,format),/bust shot/i,p.name)
    assert.equal(d.sections.camera.values.shot,p.values.camera.shot)
    d.sections.camera.values={shot:'bust'}
    for(const format of EnglishTags)assert.ok(generate(d,format,'camera').includes('upper body shot'))
    for(const format of EnglishProse)assert.equal(generate(d,format,'camera'),'Frame the scene as an upper-body portrait.')
    assert.match(generate(d,'ja','camera'),/胸上/)
  }
})

test('categorized dictionaries have stable unique IDs and labels, nonempty English and valid category references',()=>{
  for(const field of [faceField,placeField]){
    const ids=Object.keys(field.options)
    assert.equal(new Set(ids).size,ids.length)
    assert.equal(new Set(field.categories.map(c=>c.id)).size,field.categories.length)
    const labels=new Set(), tags=new Set()
    for(const [id,o] of Object.entries(field.options)){
      assert.match(id,/^[a-z][a-zA-Z0-9]*$/)
      assert.ok(o.ja.trim()&&o.tag.trim()&&o.prose.trim(),id)
      assert.doesNotMatch(o.tag+o.prose,/[ぁ-んァ-ヶ一-龯]/,id)
      const label=o.ja.split(' · ').at(-1)
      assert.ok(!labels.has(label)&&!tags.has(o.tag),id);labels.add(label);tags.add(o.tag)
      const c=field.categories.find(c=>c.id===o.category)
      assert.ok(c,id)
      if(c.children.length)assert.ok(c.children.some(s=>s.id===o.subcategory),id)
      else assert.equal(o.subcategory,'')
    }
    for(const c of field.categories){
      assert.equal(new Set(c.children.map(s=>s.id)).size,c.children.length)
      for(const child of c.children) assert.ok(Object.values(field.options).some(o=>o.category===c.id&&o.subcategory===child.id))
    }
  }
  assert.equal(oldFaces.every(k=>Object.hasOwn(faceField.options,k)),true)
  assert.equal(oldPlaces.every(k=>Object.hasOwn(placeField.options,k)),true)
  assert.equal(Object.keys(faceField.options).length-oldFaces.length,18)
  assert.equal(Object.keys(placeField.options).length,120)
  const expected={modernJapan:[10,12,10,9,8,10],westernFantasy:[8,6,6,6,4],desertFantasy:[8,6,6,4],other:[2,3,1,1]}
  assert.deepEqual(placeField.categories.map(c=>c.id),Object.keys(expected))
  for(const c of placeField.categories){
    assert.deepEqual(c.children.map(sub=>Object.values(placeField.options).filter(o=>o.category===c.id&&o.subcategory===sub.id).length),expected[c.id])
  }
  const japanese=Object.values(placeField.options).filter(o=>o.category==='modernJapan')
  assert.deepEqual(placeField.categories[0].children.map(g=>japanese.filter(o=>o.subcategory===g.id).length),[10,12,10,9,8,10])
  assert.deepEqual(faceField.categories.map(c=>Object.values(faceField.options).filter(o=>o.category===c.id).length),[3,7,4,3,7,5,5,5])
})

test('all place and face options generate only their tag or the complete natural sentence and round-trip',()=>{
  for(const [section,field] of [['bg',placeField],['emotion',faceField]]){
    for(const [id,o] of Object.entries(field.options)){
      const store=newStore(false),d=store.draft
      d.sections[section].values[field.id]=id
      for(const format of EnglishTags)assert.equal(generate(d,format),format==='md'?'## '+byId[section].label+'\n'+o.tag:o.tag)
      for(const format of EnglishProse)assert.equal(generate(d,format),field.lead+o.prose+'.')
      assert.equal(generate(d,'ja'),'【'+byId[section].label+'】\n'+o.ja)
      assert.equal(decode(JSON.stringify(store)).draft.sections[section].values[field.id],id)
      d.sections[section].mode='off'
      for(const format of Object.keys(formats))assert.equal(generate(d,format),'')
    }
  }
})

test('place-specific warnings respond only to explicit preset conditions and leave all settings intact',()=>{
  for(const rule of placeWarnings){
    for(const place of rule.places){
      assert.ok(Object.hasOwn(placeField.options,place))
      for(const value of rule.values){
        assert.ok(byId.bg.fields.find(f=>f.id===rule.field).options[value])
        const d=blankDraft();d.sections.bg.values={place,[rule.field]:value}
        const before=clone(d)
        assert.ok(warnings(d).some(w=>w.includes(rule.message)))
        assert.deepEqual(d,before)
        for(const mode of ['raw','off']){d.sections.bg.mode=mode;assert.deepEqual(warnings(d),[])}
      }
    }
  }
  const d=blankDraft();d.sections.bg.values={place:'jpClassroom'};assert.deepEqual(warnings(d),[])
  assert.equal(generate(d),'modern Japanese classroom')
  d.sections.bg.values={place:'jpFireworks',time:'night'};assert.deepEqual(warnings(d),[])
})

test('anonymous first scene generates immediately; scene creation and every reset keep a blank name blank',()=>{
  const d=newStore().draft
  assert.equal(d.name,'');assert.ok(generate(d).length>0)
  resetScene(d,true);assert.equal(d.name,'')
  resetScene(d);assert.equal(d.name,'')
  resetSection(d,'body');assert.equal(d.name,'')
  assert.equal(blankDraft().name,'')
})

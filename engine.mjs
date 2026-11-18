import {sections, byId, fixedIds, sceneIds, presets, formats} from './catalog.mjs'
export const clone = value => JSON.parse(JSON.stringify(value))
export const schemaVersion = 1
export const storageKey = 'character-scene-prompt-workshop:v1'
export const newSection = id => ({mode:'preset',raw:'',extra:'',values:{},open:false,locked:fixedIds.includes(id)})
export function blankDraft(){
  return {name:'',memo:'',combined:'',useCombined:false,variants:[],sceneName:'',sceneNo:1,preset:'',format:'tags',sections:Object.fromEntries(sections.map(({id})=>[id,newSection(id)]))}
}
export function newStore(example=true){
  const draft=blankDraft()
  if(example){
    draft.name='レイ'
    draft.sections.body.values={subject:'man',hair:'silver',cut:'layer',eyes:'teal'}
    draft.sections.outfit.values={clothes:'jacket'}
    draft.sections.style.values={medium:'otome'}
    applyPreset(draft,presets[0])
    draft.sections.body.open=true
  }
  return {schemaVersion,draft,characters:[],scenes:[],customPresets:[]}
}
export function presetTargets(draft,preset){
  return sceneIds.filter(id=>preset.values[id]&&!draft.sections[id].locked)
}
export function applyPreset(draft,preset){
  const targets=presetTargets(draft,preset)
  if(!targets.length)return
  for(const id of targets){
    const section=draft.sections[id]
    section.values={...preset.values[id]}
    section.mode='preset'
  }
  draft.preset=preset.id
  draft.sceneName=preset.name
}
export function resetScene(draft, next=false){
  for(const id of sceneIds){
    if(next&&draft.sections[id].locked)continue
    draft.sections[id]={...newSection(id),open:draft.sections[id].open}
  }
  draft.sceneName='';draft.preset=''
  if(next)draft.sceneNo+=1
}
export function resetSection(draft,id){
  draft.sections[id]={...newSection(id),open:draft.sections[id].open,locked:draft.sections[id].locked}
  if(id==='body'){draft.name='';draft.memo=''}
  if(sceneIds.includes(id))draft.preset=''
}
export function captureCharacter(draft){
  return {name:draft.name,memo:draft.memo,combined:draft.combined,useCombined:draft.useCombined,variants:clone(draft.variants),sections:Object.fromEntries(fixedIds.map(id=>[id,clone(draft.sections[id])]))}
}
export function restoreCharacter(draft,character){
  Object.assign(draft,{name:character.name,memo:character.memo,combined:character.combined,useCombined:character.useCombined,variants:clone(character.variants)})
  for(const id of fixedIds)draft.sections[id]=clone(character.sections[id])
}
const activeValue=(d,id,key)=>d.sections[id].mode==='preset'?d.sections[id].values[key]:''
export function warnings(draft){
  const issues=[],v=(s,k)=>activeValue(draft,s,k)
  const face=v('emotion','face'),gaze=v('emotion','gaze'),shot=v('camera','shot')
  if((gaze==='closed'&&['wide','glare','avert','lower'].includes(face))||(face==='lower'&&['up','viewer'].includes(gaze))||(face==='avert'&&gaze==='viewer'))issues.push('表情と視線の向きが競合しています。目の開き方と視線をご確認ください。')
  if(['macro','face','bust'].includes(shot)&&['tiptoe','kneel'].includes(v('pose','stance')))issues.push('この撮影距離では足元が画面外になります。膝上や全身の構図も検討できます。')
  if(['face','macro'].includes(shot)&&['reach','flowers','clasp'].includes(v('pose','hands')))issues.push('顔のアップでは手の動作が画面に収まりにくくなります。')
  if(['pov','hand'].includes(v('camera','pov'))&&v('camera','target')==='hero')issues.push('主人公視点と主人公自身の正面像が同時に指定されています。')
  if(v('bg','view')&&v('camera','angle'))issues.push('背景にも視点があります。出力にはカメラのアングルを優先します。')
  if(draft.useCombined&&draft.combined.trim()){
    const used=fixedIds.filter(id=>draft.sections[id].mode!=='off'&&sectionItems(draft,id).length)
    if(used.length)issues.push('一括入力と「'+used.map(id=>byId[id].label).join('」「')+'」を併用中です。重複する個別設定は「使用しない」で除外できます。')
  }
  if(collectGroups(draft).some(g=>g.items.some(i=>i.raw&&/[ぁ-んァ-ヶ一-龯]/.test(i.raw))))issues.push('直接入力の日本語は原文のまま出力します。')
  return issues
}
function sectionItems(draft,id){
  const section=draft.sections[id]
  if(section.mode==='off')return []
  if(section.mode==='raw')return section.raw.trim()?[{raw:section.raw}]:[]
  const items=[]
  for(const field of byId[id].fields){
    const key=section.values[field.id],opt=field.options[key]
    if(!opt||(id==='bg'&&field.id==='view'&&activeValue(draft,'camera','angle')))continue
    items.push({tag:opt.tag,ja:opt.ja,prose:field.lead+opt.prose+'.',field:field.id,key})
  }
  if(section.extra.trim())items.push({raw:section.extra})
  return items
}
export function collectGroups(draft){
  const groups=[]
  if(draft.useCombined&&draft.combined.trim())groups.push({id:'combined',label:'キャラ一括入力',items:[{raw:draft.combined}]})
  for(const {id,label} of sections){
    const items=sectionItems(draft,id)
    if(items.length)groups.push({id,label,items})
  }
  return groups
}
export function generate(draft,format=draft.format,only=''){
  let groups=collectGroups(draft).filter(g=>!only||only===g.id)
  const natural=['prose','tsubaki'].includes(format)
  const orders={sdxl:['combined','body','outfit','emotion','pose','camera','bg','style'],tsubaki:['combined','body','outfit','camera','pose','emotion','bg','style'],novel:['combined','body','outfit','pose','emotion','bg','camera','style']}
  if(orders[format])groups=groups.sort((a,b)=>orders[format].indexOf(a.id)-orders[format].indexOf(b.id))
  const seen=new Set(), blocks=[]
  for(const g of groups){
    const parts=[]
    for(const item of g.items){
      if('raw' in item){parts.push(item.raw);continue}
      if(seen.has(item.tag))continue
      seen.add(item.tag)
      let tag=item.tag
      if(format==='novel'&&item.field==='subject'&&item.key!=='person')tag=item.key==='man'?'1boy, young man':'1girl, young woman'
      if(format==='sdxl'&&item.field==='pov'&&item.key==='pov')tag='POV shot, first-person perspective'
      if(format==='sdxl'&&item.field==='subject')tag='solo, '+tag
      parts.push(format==='ja'?item.ja:natural?item.prose:tag)
    }
    if(!parts.length)continue
    if(format==='md')blocks.push('## '+g.label+'\n'+parts.join(', '))
    else if(format==='ja')blocks.push('【'+g.label+'】\n'+parts.join('、'))
    else blocks.push(parts.join(natural?' ':', '))
  }
  return blocks.join(['ja','md','tsubaki'].includes(format)?'\n\n':natural?' ':', ')
}
export const summary=(d,id)=>{
  const s=d.sections[id]
  if(s.mode==='off')return '使用しない'
  if(s.mode==='raw')return s.raw.trim()||'直接入力'
  return byId[id].fields.map(f=>f.options[s.values[f.id]]?.ja.split(' · ').at(-1)).filter(Boolean).join(' / ')||'未設定'
}
export const snapshotPreset=(draft,id,name)=>({id,name,tone:'マイプリセット',values:Object.fromEntries(sceneIds.filter(k=>draft.sections[k].mode==='preset').map(k=>[k,clone(draft.sections[k].values)]))})
// Validate every editable and saved record before replacing persistent data.
const obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)
const str=v=>typeof v==='string'
const validValues=(id,values)=>obj(values)&&Object.entries(values).every(([key,v])=>{
  const field=byId[id].fields.find(f=>f.id===key)
  return field&&str(v)&&(v===''||Object.hasOwn(field.options,v))
})
const validSection=(id,s)=>obj(s)&&['off','raw','preset'].includes(s.mode)&&str(s.raw)&&str(s.extra)&&typeof s.open==='boolean'&&typeof s.locked==='boolean'&&validValues(id,s.values)
const validCharacter=c=>obj(c)&&[c.name,c.memo,c.combined].every(str)&&typeof c.useCombined==='boolean'&&Array.isArray(c.variants)&&c.variants.every(v=>obj(v)&&str(v.name)&&validSection('outfit',v.section))&&obj(c.sections)&&fixedIds.every(id=>validSection(id,c.sections[id]))
const validDraft=d=>validCharacter(d)&&str(d.sceneName)&&str(d.preset)&&Number.isSafeInteger(d.sceneNo)&&d.sceneNo>0&&Object.hasOwn(formats,d.format)&&sections.every(s=>validSection(s.id,d.sections[s.id]))
function records(values,check){
  return Array.isArray(values)&&values.every(v=>obj(v)&&str(v.id)&&v.id.length>0&&str(v.name)&&str(v.date)&&check(v.data))&&new Set(values.map(v=>v.id)).size===values.length
}
export function decode(text){
  let s
  try{s=JSON.parse(text)}catch{throw Error('JSONの形式を読み取れません。')}
  if(!obj(s)||s.schemaVersion!==schemaVersion)throw Error('対応していない保存形式またはバージョンです。')
  if(!validDraft(s.draft)||!records(s.characters,validCharacter)||!records(s.scenes,validDraft)||!Array.isArray(s.customPresets)||!s.customPresets.every(p=>obj(p)&&str(p.id)&&str(p.name)&&obj(p.values)&&Object.entries(p.values).every(([id,v])=>sceneIds.includes(id)&&validValues(id,v)))||new Set(s.customPresets.map(p=>p.id)).size!==s.customPresets.length||s.customPresets.some(p=>presets.some(base=>base.id===p.id)))throw Error('保存データに不足または不正な設定があります。')
  return s
}
export function readStore(storage){
  try{const raw=storage.getItem(storageKey);return {data:raw===null?newStore():decode(raw),error:''}}
  catch(e){return {data:newStore(),error:'下書きを開けません。元の保存内容を保護するため、自動保存を停止しました。データ管理で復旧できます。'}}
}
export function persist(storage,data){
  try{storage.setItem(storageKey,JSON.stringify(data));return ''}
  catch{return 'ブラウザに保存できません。空き容量・保存設定を確認するか、JSONを書き出してください。'}
}


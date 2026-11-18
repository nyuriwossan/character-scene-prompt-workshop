import {sections,byId,sceneIds,fixedIds,presets,formats} from './catalog.mjs'
import {icon} from './icons.mjs'
import {clone,blankDraft,resetSection,resetScene,captureCharacter,restoreCharacter,applyPreset,presetTargets,generate,collectGroups,warnings,summary,snapshotPreset,decode,storageKey,readStore,persist} from './engine.mjs'

const $=q=>document.querySelector(q)
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const attr=esc
const pad=n=>String(n).padStart(2,'0')
const id=()=>crypto.randomUUID?.()||'id-'+Date.now().toString(36)+Math.random().toString(36).slice(2)
const countLabel=(n,txt)=>'<span class="count">'+n+' '+txt+'</span>'
const opts=(items,current,blank='')=>(blank?'<option value="">'+blank+'</option>':'')+Object.entries(items).map(([k,v])=>'<option value="'+attr(k)+'"'+(k===current?' selected':'')+'>'+esc(v)+'</option>').join('')
const button=(act,label,ic='',cls='btn',extra='')=>'<button type="button" class="'+cls+'" data-action="'+act+'" '+extra+'>'+(ic?icon(ic,16):'')+label+'</button>'
const modal=$('#modal')
let storage
try{storage=window.localStorage}catch{}
const loaded=readStore(storage)
let store=loaded.data, saveIssue=loaded.error, paused=!!loaded.error, page='editor',libTab='characters',outputTab='full',cameraTab='shot',undo=null,callback=null,toastTimer
const draft=()=>store.draft
const everyPreset=()=>[...presets,...store.customPresets]
const notice=(s,canUndo=false)=>{
  const t=$('#toast')
  t.innerHTML=icon('check',17)+'<span>'+esc(s)+'</span>'+(canUndo?button('undo','元に戻す','','toast-link'):'')
  t.classList.add('show')
  clearTimeout(toastTimer)
  toastTimer=setTimeout(()=>t.classList.remove('show'),canUndo?9500:3400)
}
function persistNow(){
  if(!paused)saveIssue=persist(storage,store)
  renderStatus()
  return !saveIssue
}
function renderStatus(){
  const slot=$('#save-status')
  if(slot){slot.innerHTML='<i class="dot"></i>'+(saveIssue?'保存を要確認':'自動保存済み');slot.classList.toggle('error',!!saveIssue)}
  const err=$('#save-error')
  if(err)err.innerHTML=saveIssue?'<div class="warning">'+icon('alert')+'<span>'+esc(saveIssue)+'</span>'+button('data','データ管理','','link')+'</div>':''
}
function showDialog(title,body,actions='',wide=false){
  modal.className=wide?'wide':''
  modal.innerHTML='<div class="modal-head"><h2 id="modal-title">'+title+'</h2>'+button('close','', 'x','icon-btn','aria-label="閉じる"')+'</div><div class="modal-body">'+body+'</div>'+(actions?'<div class="modal-actions">'+actions+'</div>':'')
  if(!modal.open)modal.showModal()
  modal.scrollTop=0
}
function closeDialog(){modal.close();callback=null}
function confirmDialog(title,body,label,fn,danger=false){
  callback=fn
  showDialog(title,body,button('close','キャンセル')+button('confirm',label,'',danger?'btn danger':'btn primary'))
}
function nameDialog(title,initial,fn,desc=''){
  confirmDialog(title,(desc?'<p>'+desc+'</p>':'')+'<label class="field">名前<input id="record-name" maxlength="160" value="'+attr(initial)+'" autocomplete="off" required></label>', '保存する',()=>{
    const value=$('#record-name').value.trim()
    if(!value){$('#record-name').setCustomValidity('名前を入力してください');$('#record-name').reportValidity();return false}
    fn(value)
  })
  $('#record-name').focus();$('#record-name').select()
}
function remember(){undo=clone(draft())}
function updateAll(){persistNow();render()}
function changedMessage(msg,withUndo=false){notice(saveIssue?msg+'（ブラウザ保存は未完了）':msg,withUndo)}
function nav(){
  $('#brandmark').innerHTML='<img src="./assets/mark.svg" alt="">'
  $('#nav').innerHTML=button('editor','編集室','editor','nav-btn '+(page==='editor'?'active':''),(page==='editor'?'aria-current="page"':''))+button('library','ライブラリ','library','nav-btn '+(page==='library'?'active':''),(page==='library'?'aria-current="page"':''))+'<span class="nav-line"></span>'+button('guide','<span>使い方</span>','help','nav-help','aria-label="使い方"')
}
function hero(){
  return '<section class="hero" aria-label="シーン編集室"><div class="hero-copy"><div class="eyebrow"><i></i> SCENE WORKSPACE</div><h1>シーン編集室</h1><p>キャラクターを固定して、物語の一場面を組み立てよう。</p><div class="hero-meta"><span>'+icon('clap',14)+' SCENE '+pad(draft().sceneNo)+'</span><i></i><span>'+icon('user',14)+' '+esc(draft().name||'名前未設定')+'</span></div></div><div class="frame-corners" aria-hidden="true"><i></i><i></i><i></i><i></i></div></section>'
}
function presetCard(p,index){
  const active=draft().preset===p.id
  const image=presets.find(original=>original.id===p.id)?.image
  return '<button class="preset-card '+(active?'selected':'')+'" data-action="preset" data-id="'+attr(p.id)+'" aria-pressed="'+active+'"><span class="still">'+(image?'<img src="'+image+'" alt="" draggable="false">':'<span class="custom-still">'+icon('clap',30)+'</span>')+'<span class="cut">CUT '+pad(index+1)+'</span>'+(active?'<span class="chosen">'+icon('check',12)+'</span>':'')+'</span><span class="preset-name">'+esc(p.name)+'</span></button>'
}
function gallery(){
  return '<section class="panel gallery"><div class="panel-heading"><div class="heading-group"><span class="tile">'+icon('film',20)+'</span><h2>場面プリセット</h2>'+countLabel(everyPreset().length,'')+'</div>'+button('all-presets','すべて見る '+icon('right',13),'','link')+'</div><div class="preset-grid">'+presets.slice(0,4).map(presetCard).join('')+'</div></section>'
}
function shotDiagram(value,type){
  const zoom={macro:2.4,face:1.7,bust:1.13,waist:.82,knee:.66,full:.55,wide:.37}
  const y={macro:-11,face:-4,bust:4,waist:6,knee:5,full:4,wide:9}
  const isShot=type==='shot',scale=isShot?zoom[value]:.65
  const line={eye:'M4 17h18',high:'m5 4 17 13',low:'m4 31 18-12',top:'m24 1 0 14',ultra:'m12 34 10-19',dutch:'m2 21 20-7'}
  return '<svg class="diagram" viewBox="0 0 58 37" aria-hidden="true"><defs><clipPath id="crop-'+type+value+'"><rect x="1" y="1" width="56" height="35" rx="2"/></clipPath></defs><g clip-path="url(#crop-'+type+value+')"><path d="M0 27h58" stroke="currentColor" opacity=".2"/><g transform="translate('+(isShot?29:36)+' '+(isShot?y[value]:4)+') scale('+scale+')"><circle cy="8" r="6.5" fill="currentColor" opacity=".83"/><path d="M-4 15l-7 3-4 17 5 1 3-12 1 15-2 18h5L0 41l3 16h5L6 39l1-15 3 12 5-1-4-17-7-3z" fill="currentColor" opacity=".7"/></g>'+(!isShot?'<path d="'+line[value]+'" stroke="#da634e" stroke-width="2.3" stroke-linecap="round"/>':'')+'</g></svg>'
}
function cameraControls(s){
  const fields=byId.camera.fields
  const primary=fields.find(f=>f.id===cameraTab)
  const tabs=['shot','angle'].map(k=>button('camera-tab',fields.find(f=>f.id===k).label,'','mini-tab '+(k===cameraTab?'selected':''),'data-id="'+k+'" aria-pressed="'+(k===cameraTab)+'"')).join('')
  const tiles=Object.entries(primary.options).map(([k,v])=>'<button type="button" data-action="camera-choice" data-id="'+k+'" class="camera-choice '+(s.values[cameraTab]===k?'selected':'')+'" aria-pressed="'+(s.values[cameraTab]===k)+'">'+shotDiagram(k,cameraTab)+'<span>'+esc(v.ja.split('（')[0])+'</span></button>').join('')
  return '<div class="camera-tools"><div class="camera-tabs">'+tabs+button('camera-clear','指定を外す','','subtle')+'</div><div class="camera-options">'+tiles+'</div></div><div class="fields">'+fields.slice(2).map(f=>selectField('camera',f)).join('')+'</div>'
}
// A restored scene or newly applied preset owns a new values object. Its picker
// therefore opens at the saved option, even if the previous scene used the same ID.
const pickerViews = new WeakMap()
const pageSize = 12
const shortLabel = option => option.ja.split(' · ').at(-1)
const categoryLabels = categories => Object.fromEntries(categories.map(item => [item.id,item.label]))

function pickerContext(section, fieldId) {
  const field = byId[section].fields.find(f => f.id === fieldId)
  const values = draft().sections[section].values
  const selected = values[fieldId] || ''
  if (!pickerViews.has(values)) pickerViews.set(values, new Map())
  const views = pickerViews.get(values)
  if (!views.has(fieldId)) {
    const option = field.options[selected]
    views.set(fieldId, {category:option?.category || '', subcategory:option?.subcategory || '', search:'', page:0})
  }
  return {section,field,selected,view:views.get(fieldId)}
}

function pickerResults({section,field,selected,view}) {
  const query = view.search.normalize('NFKC').trim().toLowerCase()
  const matches = Object.entries(field.options).filter(([,option]) => {
    if (view.category && view.category !== option.category) return false
    if (view.subcategory && view.subcategory !== option.subcategory) return false
    return (option.ja+' '+option.tag).normalize('NFKC').toLowerCase().includes(query)
  })
  const data = 'data-section="'+section+'" data-field="'+field.id+'"'
  const offset = view.page * pageSize
  const choices = matches.slice(offset,offset+pageSize).map(([key,option]) =>
    button('pick-value',esc(shortLabel(option)),'','small-btn picker-choice',data+' data-value="'+key+'" aria-pressed="'+(selected===key)+'"')
  ).join('')
  let pager = ''
  if (matches.length > pageSize) {
    const last = Math.ceil(matches.length/pageSize)-1
    const nav = (step,label,disabled) => button('pick-page',label,'','small-btn',data+' data-step="'+step+'"'+(disabled?' disabled':''))
    pager = '<div class="picker-pager">'+nav(-1,'前へ',view.page===0)+'<span>'+ (view.page+1)+' / '+(last+1)+'</span>'+nav(1,'次へ',view.page===last)+'</div>'
  }
  return '<div class="picker-choices">'+(choices||'<span class="muted">一致する候補がありません。</span>')+'</div>'+pager
}

const pickerData = (section,field) => 'data-section="'+section+'" data-field="'+field.id+'"'
function pickerFilter(label,key,options,data) {
  return '<label class="field">'+label+'<select data-key="'+key+'" '+data+'>'+options+'</select></label>'
}
function secondaryFilter({section,field,view}) {
  const data = pickerData(section,field)
  const category = field.categories.find(c=>c.id===view.category)
  if (!category) return '<label class="field">候補を検索<input type="search" data-key="pick-search" '+data+' value="'+attr(view.search)+'" placeholder="日本語名・英語タグ"></label>'
  if (category.children.length) return pickerFilter('小分類','pick-subcategory',opts(categoryLabels(category.children),view.subcategory),data)
  return ''
}
function categoryPicker(section, field) {
  const context = pickerContext(section,field.id)
  const {selected,view} = context
  const data = pickerData(section,field)
  const top = pickerFilter(field.label+'カテゴリ','pick-category',opts(categoryLabels(field.categories),view.category,'すべて'),data)
  const clear = button('pick-value','指定なし','','small-btn picker-choice',data+' data-value="" aria-pressed="'+(!selected)+'"')
  const current = selected ? shortLabel(field.options[selected]) : '指定なし'
  return '<fieldset class="category-picker"><legend>'+field.label+'</legend><div class="picker-filters">'+top+secondaryFilter(context)+'</div><div class="picker-current"><span>選択中：<strong>'+esc(current)+'</strong></span>'+clear+'</div><div class="picker-results">'+pickerResults(context)+'</div></fieldset>'
}

function chooseValue(section, field, value, picker) {
  if ((draft().sections[section].values[field] || '') === value) return
  draft().sections[section].values[field] = value
  if (sceneIds.includes(section)) draft().preset = ''
  // A select can still own its native popup during change. Keep it mounted.
  if (picker) {
    for (const choice of picker.querySelectorAll('[data-action="pick-value"]')) {
      choice.setAttribute('aria-pressed',String(choice.dataset.value===value))
    }
    const option = pickerContext(section,field).field.options[value]
    picker.querySelector('.picker-current strong').textContent = option ? shortLabel(option) : '指定なし'
  }
  const card = $('.gallery .preset-card.selected')
  if (card && !draft().preset) {
    card.classList.remove('selected')
    card.setAttribute('aria-pressed','false')
    card.querySelector('.chosen')?.remove()
  }
  persistNow()
  liveOutput()
}

function selectField(id,f){
  if (f.categories) return categoryPicker(id,f)
  return '<label class="field">'+f.label+'<select data-key="value" data-section="'+id+'" data-field="'+f.id+'">'+opts(Object.fromEntries(Object.entries(f.options).map(([k,v])=>[k,v.ja])),draft().sections[id].values[f.id],'指定なし')+'</select></label>'
}
function characterTools(){
  return '<div class="char-fields"><label class="field">キャラクター名<input data-key="name" placeholder="キャラクター名を入力" value="'+attr(draft().name)+'"></label><label class="field">メモ<input data-key="memo" placeholder="性格や設定など" value="'+attr(draft().memo)+'"></label></div>'
}
function sectionBody(id){
  const d=draft(),s=d.sections[id]
  const modes={preset:'プリセット',raw:'直接入力',off:'使用しない'}
  const modeBar='<div class="modes" aria-label="'+byId[id].label+' 入力モード">'+Object.entries(modes).map(([k,v])=>button('mode',v,'','mode '+(s.mode===k?'on':''),'aria-pressed="'+(s.mode===k)+'" data-id="'+id+'" data-value="'+k+'"')).join('')+'</div>'
  let controls=''
  if(s.mode==='preset'){
    controls=id==='camera'?cameraControls(s):'<div class="fields">'+byId[id].fields.map(f=>selectField(id,f)).join('')+'</div>'
    if(id==='style')controls+='<label class="field spaced">LoRA・追加タグ<textarea rows="2" data-key="extra" data-section="style" placeholder="LoRAの構文や品質タグをそのまま貼り付け">'+esc(s.extra)+'</textarea></label>'
  }else if(s.mode==='raw')controls='<label class="field">直接入力したプロンプト<textarea data-key="raw" data-section="'+id+'" rows="'+(id==='bg'?6:3)+'" placeholder="英語プロンプトをそのまま貼り付け">'+esc(s.raw)+'</textarea></label>'
  else controls='<p class="off-note">'+icon('check',15)+'この項目は出力から除外しています。入力内容は保持されます。</p>'
  let extras=''
  if(id==='body')extras='<div class="inline-tools">'+button('combined','既存プロンプトを一括入力','stack','small-btn')+button('save-char','キャラを保存','save','small-btn')+'</div>'
  if(id==='outfit')extras='<div class="inline-tools">'+button('variants','衣装差分（'+d.variants.length+'）','shirt','small-btn')+'</div>'
  return '<div class="section-body">'+(id==='body'?characterTools():'')+modeBar+controls+extras+'<div class="section-actions">'+button('toggle-lock',s.locked?'固定中':'設定を固定',s.locked?'lock':'unlock','subtle','data-id="'+id+'" aria-pressed="'+s.locked+'"')+button('reset-section','項目リセット','refresh','subtle','data-id="'+id+'" title="'+(id==='body'?'名前・メモ・素体の入力を初期化します。一括入力は維持します。':'この項目の選択値・直接入力を初期化します。')+'"')+'</div></div>'
}
function accordion(s,i){
  const d=draft().sections[s.id]
  return '<article class="accordion '+(d.open?'open':'')+'"><button class="acc-head" data-action="accordion" data-id="'+s.id+'" aria-expanded="'+d.open+'" aria-controls="fields-'+s.id+'"><span class="sec-num">'+pad(i+1)+'</span><span class="sec-icon">'+icon(s.icon,20)+'</span><span class="acc-label">'+s.label+'</span>'+(d.locked?'<span class="lock-label">'+icon('lock',12)+'<span>固定</span></span>':d.mode==='off'?'<span class="lock-label">除外</span>':'')+'<span class="chev">'+icon('down',16)+'</span></button><div id="fields-'+s.id+'"'+(!d.open?' hidden':'')+'>'+(d.open?sectionBody(s.id):'')+'</div></article>'
}
function editing(){
  return '<section class="panel edit-panel"><div class="panel-heading"><div class="heading-group"><span class="tile">'+icon('sliders',19)+'</span><h2>シーン設定</h2></div>'+button('next','次の挿絵を作る','plus','small-btn')+'</div><div class="section-list">'+sections.map(accordion).join('')+'</div></section><div class="maintenance">'+button('reset-scene','シーンリセット','refresh','subtle')+button('reset-all','全入力リセット','bin','subtle danger-text')+button('undo','元に戻す','','subtle',undo?'':'disabled')+'</div>'
}
function outputPanel(){
  return '<aside class="output-col" id="prompt-panel" tabindex="-1"><section class="panel output"><div class="panel-heading"><div class="heading-group"><span class="tile">'+icon('code',20)+'</span><h2>プロンプト出力</h2></div><span class="live"><i></i>LIVE</span></div><div class="output-inner"><label class="field output-format">出力形式<select data-key="format">'+opts(formats,draft().format)+'</select></label><div class="output-tabs">'+button('out-tab','全文プレビュー','','tab '+(outputTab==='full'?'active':''),'data-id="full" aria-pressed="'+(outputTab==='full')+'"')+button('out-tab','セクション別','','tab '+(outputTab==='section'?'active':''),'data-id="section" aria-pressed="'+(outputTab==='section')+'"')+'</div><div id="output-text"></div><div class="out-actions">'+button('copy-all','全文をコピー','copy','btn primary copy-btn')+button('save-scene','シーンを保存','save','btn save-btn')+'</div></div></section><div id="warnings"></div><section class="quick-char"><div><span class="tiny-icon">'+icon('lock',16)+'</span><strong>キャラクター設定</strong></div><p id="character-summary"></p>'+button('char-manager','キャラを管理 '+icon('right',12),'','link')+'</section></aside>'
}
function liveOutput(){
  if(!$('#output-text'))return
  const txt=generate(draft()),groups=collectGroups(draft())
  const inner=outputTab==='full'?'<pre id="prompt-value">'+esc(txt||'設定を選ぶと、ここにプロンプトが表示されます。')+'</pre>':groups.map(g=>'<div class="output-group"><div><strong>'+esc(g.label)+'</strong>'+button('copy-section','','copy','icon-btn','aria-label="'+esc(g.label)+'をコピー" data-id="'+attr(g.id)+'"')+'</div><pre>'+esc(generate(draft(),draft().format,g.id))+'</pre></div>').join('')||'<p>出力する項目がありません。</p>'
  $('#output-text').innerHTML='<div class="paper"><div class="paper-top"><span class="paper-dot"></span> PROMPT PREVIEW</div><div class="paper-text" tabindex="0" aria-label="プロンプトのプレビュー">'+inner+'</div><div class="paper-foot">'+Array.from(txt).length+' 文字</div></div>'
  $('.copy-btn').disabled=!txt
  $('#warnings').innerHTML=warnings(draft()).map(t=>'<div class="warning">'+icon('alert',16)+'<span>'+esc(t)+'</span></div>').join('')
  $('#character-summary').textContent=(draft().name||'名前未設定')+'　/　'+summary(draft(),'body')
}
function editor(){
  return hero()+'<div class="workspace-status"><span class="current-scene"><i class="tiny-square"></i> 編集中 <b>'+esc(draft().sceneName||'新しいシーン')+'</b></span><a class="mobile-output" href="#prompt-panel">出力へ ↓</a><button id="save-status" data-action="data"></button></div><div id="save-error"></div><div class="workspace-grid"><div class="edit-col">'+gallery()+editing()+'</div>'+outputPanel()+'</div>'
}
function library(){
  const names={characters:'キャラクター',scenes:'シーン',customPresets:'マイプリセット'}
  const items=store[libTab]
  const cards=items.map(rec=>'<article class="record"><span class="tile">'+icon(libTab==='characters'?'user':libTab==='scenes'?'clap':'film')+'</span><div class="record-main"><h3>'+esc(rec.name)+'</h3><p>'+esc(libTab==='customPresets'?'場面プリセット':(rec.data.name||'名前未設定')+' · '+(rec.date||'').slice(0,10))+'</p></div>'+button('load-record','呼び出す','','small-btn','data-id="'+attr(rec.id)+'"')+(libTab!=='customPresets'?button('duplicate','複製','copy','small-btn','data-id="'+attr(rec.id)+'"'):'')+'</article>').join('')
  return '<div class="library-title"><div class="eyebrow"><i></i> LIBRARY</div><h1>ライブラリ</h1><p>保存したキャラクターとシーンから制作を再開できます。</p></div><div class="panel lib-panel"><div class="lib-tabs">'+Object.entries(names).map(([k,label])=>button('lib-tab',label+' <span>'+store[k].length+'</span>','','tab '+(k===libTab?'active':''),'data-id="'+k+'"')).join('')+'</div>'+(cards||'<div class="empty">'+icon('folder',34)+'<h3>保存済みの'+names[libTab]+'はありません</h3><p>編集中の設定をここに保存できます。</p></div>')+'<div class="inline-tools">'+button(libTab==='characters'?'save-char':libTab==='scenes'?'save-scene':'save-preset','現在の'+names[libTab]+'を保存','plus','btn primary')+button('editor','編集室へ戻る','editor')+'</div></div>'
}
function render(){
  const focus=document.activeElement
  const focusData=focus?.closest('#workspace')?Object.entries(focus.dataset):[]
  nav()
  $('#workspace').innerHTML=page==='editor'?editor():library()
  renderStatus();liveOutput()
  if(focusData.length){
    const target=[...document.querySelectorAll('#workspace button,#workspace select,#workspace input,#workspace textarea')].find(el=>el.tagName===focus.tagName&&focusData.every(([k,v])=>el.dataset[k]===v))
    if(target)target.focus({preventScroll:true})
  }
}
function openAllPresets(){
  showDialog('場面プリセット','<p>場面を選ぶと、適用する設定を確認できます。</p><div class="preset-grid modal-grid">'+everyPreset().map(presetCard).join('')+'</div>',button('save-preset','現在の選択をプリセットに保存','plus','btn'),true)
}
function proposePreset(p){
  const targets=presetTargets(draft(),p),locked=Object.keys(p.values).filter(k=>draft().sections[k].locked)
  const changes=targets.map(k=>'<li><strong>'+byId[k].label+'</strong><span>'+esc(summary(draft(),k))+' → '+esc(byId[k].fields.map(f=>f.options[p.values[k][f.id]]?.ja.split(' · ').at(-1)).filter(Boolean).join(' / ')||'未設定')+'</span></li>').join('')
  if(!targets.length){showDialog('固定中の設定','<p>このプリセットの変更対象はすべて固定されています。シーン設定で固定を解除すると適用できます。</p>',button('close','閉じる'));return}
  confirmDialog('「'+esc(p.name)+'」を適用','<p>以下の項目をプリセットの値に切り替えます。直接入力した文章は、直接入力モードに戻すと使えます。</p><ul class="change-list">'+changes+'</ul><p class="muted">維持する設定：キャラクター素体・衣装・画風'+(locked.length?'、'+locked.map(k=>byId[k].label).join('・'):'')+'</p>','適用する',()=>{remember();applyPreset(draft(),p);page='editor';updateAll();changedMessage('場面プリセットを適用しました',true)})
}
async function copyText(value){
  if(!value){notice('コピーする内容がありません');return}
  let ok=false
  try{await navigator.clipboard.writeText(value);ok=true}catch{
    const ta=document.createElement('textarea');ta.value=value;ta.className='copy-fallback';document.body.append(ta);ta.select()
    try{ok=document.execCommand('copy')}catch{}ta.remove()
  }
  if(ok){notice('クリップボードにコピーしました');return}
  showDialog('プロンプトをコピー','<p>テキストを選択してコピーしてください。</p><textarea id="manual-copy" rows="8" readonly>'+esc(value)+'</textarea>',button('close','閉じる'));$('#manual-copy').select()
}
function guide(){
  showDialog('工房の使い方','<ol class="guide"><li><strong>キャラクターを用意する</strong><p>素体・衣装・画風を設定し、「キャラを保存」を選びます。手持ちの英文は直接入力や一括入力に貼り付けられます。</p></li><li><strong>場面を組み立てる</strong><p>場面プリセットを選び、変更内容を確認して適用します。表情や撮影距離はあとから変更できます。固定した項目は次の挿絵にも引き継ぎます。</p></li><li><strong>プロンプトを使う</strong><p>出力形式を選び、全文またはセクション別にコピーして画像生成ツールに貼り付けます。「シーンを保存」でこの一場面を残せます。</p></li></ol><div class="note">入力はこのブラウザに保存されます。別の端末に引き継ぐときは、データ管理でJSONを書き出してください。</div>',button('close','編集に戻る','','btn primary')+'<a class="btn" href="./README.md" download>README</a>')
}
function dataDialog(){
  showDialog('データ管理','<p>下書き・キャラクター・シーン・マイプリセットをひとつのJSONにまとめて移せます。</p><div class="data-stats"><span>キャラクター <b>'+store.characters.length+'</b></span><span>シーン <b>'+store.scenes.length+'</b></span><span>プリセット <b>'+store.customPresets.length+'</b></span></div><div class="inline-tools">'+button('export','JSONを書き出す','download')+button('import','JSONを読み込む','upload')+'</div>'+(saveIssue?'<div class="warning">'+esc(saveIssue)+'</div>':'')+(paused?'<div class="inline-tools">'+button('export-original','元の保存内容を退避','download')+button('resume','自動保存を再開','','btn danger')+'</div>':''),button('close','閉じる'))
}
function download(content,filename){
  const url=URL.createObjectURL(new Blob([content],{type:'application/json;charset=utf-8'}))
  const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500)
}
function saveRecord(kind){
  const char=kind==='characters'
  nameDialog(char?'キャラクターを保存':'シーンを保存',(char?draft().name:draft().sceneName)||(char?'新しいキャラクター':'シーン '+pad(draft().sceneNo)),name=>{
    if(char)draft().name=name;else draft().sceneName=name
    store[kind].unshift({id:id(),name,date:new Date().toISOString(),data:char?captureCharacter(draft()):clone(draft())})
    updateAll();changedMessage(char?'キャラクターをライブラリに追加しました':'シーンをライブラリに追加しました')
  },char?'名前・メモ・素体・衣装差分・画風・一括入力を、新しいキャラクター記録として保存します。':'キャラクターを含む、編集中の一場面を新しい記録として保存します。')
}
function showVariants(){
  showDialog('衣装差分','<p>編集中のキャラクターに、衣装の組み合わせや直接入力文を登録します。</p>'+(draft().variants.length?draft().variants.map((v,i)=>'<div class="variant"><strong>'+esc(v.name)+'</strong>'+button('use-variant','選択','','small-btn','data-index="'+i+'"')+'</div>').join(''):'<p class="note">登録した衣装差分がここに表示されます。</p>'),button('add-variant','現在の衣装を登録','plus','btn primary'))
}
function go(p){page=p;render();window.scrollTo({top:0,behavior:'instant'})}

document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-action]')
  if(!b||b.disabled)return
  const a=b.dataset.action,k=b.dataset.id,d=draft(),s=d.sections[k]
  e.preventDefault()
  switch(a){
    case 'editor':go('editor');break
    case 'library':go('library');break
    case 'guide':guide();break
    case 'data':dataDialog();break
    case 'close':closeDialog();break
    case 'confirm':{
      const fn=callback
      if(fn&&fn()!==false&&callback===fn)closeDialog()
      break
    }
    case 'accordion':{
      s.open=!s.open
      const article=b.closest('.accordion'),body=document.getElementById('fields-'+k)
      b.setAttribute('aria-expanded',s.open)
      article.classList.toggle('open',s.open)
      body.hidden=!s.open;body.innerHTML=s.open?sectionBody(k):''
      persistNow();break
    }
    case 'mode':s.mode=b.dataset.value;if(sceneIds.includes(k))d.preset='';updateAll();break
    case 'toggle-lock':s.locked=!s.locked;updateAll();break
    case 'pick-value':
      chooseValue(b.dataset.section,b.dataset.field,b.dataset.value,b.closest('.category-picker'));break
    case 'pick-page':{
      const context=pickerContext(b.dataset.section,b.dataset.field)
      context.view.page+=Number(b.dataset.step)
      const results=b.closest('.picker-results')
      results.innerHTML=pickerResults(context)
      results.querySelector('.picker-choice')?.focus({preventScroll:true})
      break
    }
    case 'camera-tab':cameraTab=k;render();break
    case 'camera-choice':d.sections.camera.values[cameraTab]=k;d.preset='';updateAll();break
    case 'camera-clear':delete d.sections.camera.values[cameraTab];d.preset='';updateAll();break
    case 'all-presets':openAllPresets();break
    case 'preset':proposePreset(everyPreset().find(p=>p.id===k));break
    case 'out-tab':outputTab=k;render();break
    case 'copy-all':await copyText(generate(d));break
    case 'copy-section':await copyText(generate(d,d.format,k));break
    case 'save-char':saveRecord('characters');break
    case 'save-scene':saveRecord('scenes');break
    case 'save-preset':{
      const active=sceneIds.filter(i=>d.sections[i].mode==='preset')
      if(!active.length){showDialog('場面プリセット','<p>登録するには、シーン項目をひとつ以上プリセットモードにしてください。</p>',button('close','閉じる'));break}
      nameDialog('場面プリセットを保存',d.sceneName||'新しい場面',name=>{
        store.customPresets.push(snapshotPreset(d,id(),name));updateAll();changedMessage('場面プリセットを追加しました')
      },'プリセットモードの選択値（'+active.map(i=>byId[i].label).join('、')+'）を保存します。直接入力を含む場面全体は「シーンを保存」で残せます。')
      break
    }
    case 'lib-tab':libTab=k;render();break
    case 'char-manager':libTab='characters';go('library');break
    case 'load-record':{
      const rec=store[libTab].find(r=>r.id===k)
      if(libTab==='customPresets'){proposePreset(rec);break}
      const char=libTab==='characters'
      confirmDialog('「'+esc(rec.name)+'」を呼び出す','<p>'+(char?'編集中のキャラクター名・メモ・素体・衣装・画風・一括入力を、この記録に切り替えます。現在のシーン設定を引き継ぎます。':'編集中のキャラクターとシーン全体を、この記録に切り替えます。')+'保存済みの記録は保持されます。</p>','呼び出す',()=>{
        remember();if(char)restoreCharacter(d,rec.data);else store.draft=clone(rec.data)
        persistNow();go('editor');changedMessage('設定を呼び出しました',true)
      });break
    }
    case 'duplicate':{
      const src=store[libTab].find(r=>r.id===k),rec=clone(src)
      rec.id=id();rec.name=src.name+'（複製）';rec.date=new Date().toISOString()
      if(libTab==='characters')rec.data.name=rec.name;else rec.data.sceneName=rec.name
      store[libTab].unshift(rec);updateAll();changedMessage('記録を複製しました');break
    }
    case 'combined':{
      confirmDialog('既存プロンプトを一括入力','<p>素体・衣装・画風をまとめたプロンプトを原文のまま追加します。同時に使う個別項目は出力欄で確認できます。</p><label class="check-row"><input id="combined-on" type="checkbox" '+(d.useCombined?'checked':'')+'>一括入力を出力に含める</label><label class="field">一括プロンプト<textarea id="combined-value" rows="6" placeholder="キャラクター・衣装・LoRAなど">'+esc(d.combined)+'</textarea></label>','設定を反映',()=>{
        remember();d.combined=$('#combined-value').value;d.useCombined=$('#combined-on').checked;updateAll();changedMessage('一括入力の設定を反映しました',true)
      });break
    }
    case 'variants':showVariants();break
    case 'add-variant':nameDialog('衣装差分を登録','衣装 '+(d.variants.length+1),name=>{
      d.variants.push({name,section:clone(d.sections.outfit)});updateAll();changedMessage('衣装差分を登録しました')
    });break
    case 'use-variant':{
      const v=d.variants[Number(b.dataset.index)]
      confirmDialog('「'+esc(v.name)+'」を着用','<p>現在の衣装設定と直接入力を登録時の内容に切り替えます。ほかの項目は引き継ぎます。</p>','着用する',()=>{
        remember();d.sections.outfit={...clone(v.section),open:d.sections.outfit.open,locked:d.sections.outfit.locked};updateAll();changedMessage('衣装を切り替えました',true)
      });break
    }
    case 'next':{
      const cleared=sceneIds.filter(i=>!d.sections[i].locked).map(i=>byId[i].label)
      confirmDialog('キャラを固定して次の挿絵へ','<p>キャラクターの素体・衣装・画風・一括入力と、固定中のシーン項目を引き継ぎます。</p><p>新しく設定する項目：'+(cleared.join('、')||'なし')+'。</p><p class="muted">現在の場面をライブラリに残す場合は、先に「シーンを保存」を使ってください。</p>','次の挿絵を作る',()=>{
        remember();resetScene(d,true);updateAll();changedMessage('シーン '+pad(d.sceneNo)+' を作成しました',true)
      });break
    }
    case 'reset-section':
      remember();resetSection(d,k);updateAll();changedMessage(byId[k].label+'をリセットしました',true);break
    case 'reset-scene':
      confirmDialog('シーン設定をリセット','<p>表情・ポーズ・カメラ・背景の設定と直接入力、シーン名を初期化します。これらの項目の固定も解除されます。</p><p>キャラクターの名前・素体・衣装・画風・一括入力と、保存済みの記録は保持します。</p>','シーンをリセット',()=>{
        remember();resetScene(d);updateAll();changedMessage('シーン設定をリセットしました',true)
      },true);break
    case 'reset-all':
      confirmDialog('全入力をリセット','<p>編集中のキャラクター・衣装差分・シーン・一括入力・直接入力をすべて初期化します。</p><p>ライブラリに保存したキャラクター・シーン・プリセットは保持します。</p>','全入力をリセット',()=>{
        remember();store.draft=blankDraft();updateAll();changedMessage('全入力をリセットしました',true)
      },true);break
    case 'undo':
      if(undo){store.draft=undo;undo=null;updateAll();changedMessage('直前の操作を取り消しました')}break
    case 'export':download(JSON.stringify(store,null,2),'character-scene-workshop.json');notice('JSONを書き出しました');break
    case 'export-original':
      try{const raw=storage.getItem(storageKey);if(raw!==null)download(raw,'workshop-original-backup.json');else notice('元の保存内容がありません')}catch{notice('元の保存内容を読み出せません')}break
    case 'resume':
      confirmDialog('自動保存を再開','<p>ブラウザ内の読み取れなかった保存内容を、現在の編集内容で置き換えます。必要に応じて先に元の内容を退避してください。</p>','再開する',()=>{paused=false;updateAll();changedMessage('自動保存の再開を試みました')},true);break
    case 'import':$('#importfile').value='';$('#importfile').click();break
  }
})
document.addEventListener('input',e=>{
  const el=e.target,k=el.dataset.key,d=draft()
  if(el.id==='record-name'){el.setCustomValidity('');return}
  if(k==='pick-search'){
    const context=pickerContext(el.dataset.section,el.dataset.field)
    context.view.search=el.value;context.view.page=0
    el.closest('.category-picker').querySelector('.picker-results').innerHTML=pickerResults(context)
    return
  }
  if(!k||el.tagName==='SELECT')return
  if(k==='name'||k==='memo')d[k]=el.value
  else if(k==='raw'||k==='extra')d.sections[el.dataset.section][k]=el.value
  else return
  if(k==='name'&&$('.hero-meta span:last-child'))$('.hero-meta span:last-child').innerHTML=icon('user',14)+' '+esc(el.value||'名前未設定')
  persistNow();liveOutput()
})
document.addEventListener('change',async e=>{
  const el=e.target,d=draft(),k=el.dataset.key
  if(k==='pick-category'||k==='pick-subcategory'){
    const context=pickerContext(el.dataset.section,el.dataset.field)
    const {field,view}=context
    if(k==='pick-category'){
      view.category=el.value
      view.subcategory=field.categories.find(c=>c.id===el.value)?.children[0]?.id || ''
    }else view.subcategory=el.value
    view.page=0;view.search=''
    const picker=el.closest('.category-picker')
    // Keep the native select and its focus alive while the menu closes.
    if(k==='pick-category'){
      const label=el.closest('label')
      label.nextElementSibling?.remove()
      label.insertAdjacentHTML('afterend',secondaryFilter(context))
    }
    picker.querySelector('.picker-results').innerHTML=pickerResults(context)
  }else if(k==='value')chooseValue(el.dataset.section,el.dataset.field,el.value)
  else if(k==='format'){d.format=el.value;persistNow();liveOutput()}
  else if(el.id==='importfile'&&el.files.length){
    try{
      const incoming=decode(await el.files[0].text())
      confirmDialog('JSONから復元','<p>下書きとライブラリを読み込んだ内容で置き換えます。現在の記録が必要な場合は、先にJSONを書き出してください。</p><p>読み込み内容：キャラクター '+incoming.characters.length+' 件、シーン '+incoming.scenes.length+' 件、マイプリセット '+incoming.customPresets.length+' 件。</p>','置き換えて復元',()=>{
        const result=persist(storage,incoming)
        if(result){showDialog('復元を保存できません','<p>'+esc(result)+'</p>',button('close','閉じる'));callback=null;return false}
        store=incoming;paused=false;saveIssue='';undo=null;go('editor');notice('JSONから復元しました')
      },true)
    }catch(err){showDialog('読み込みに失敗しました','<p>'+esc(err.message)+'</p><p>現在の下書きとライブラリは保持されています。</p>',button('close','閉じる'))}
  }
})
modal.addEventListener('click',e=>{if(e.target===modal){const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog()}})
modal.addEventListener('close',()=>{if(!modal.open)callback=null})
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='record-name'){e.preventDefault();modal.querySelector('[data-action="confirm"]').click()}})
render()

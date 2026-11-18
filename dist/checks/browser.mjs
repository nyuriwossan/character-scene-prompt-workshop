const run=document.querySelector('#run'),frame=document.querySelector('iframe'),results=document.querySelector('#results')
const base=new URL('../',location.href).href
const key='character-scene-prompt-workshop:v1'
let failures=0,n=0,w,doc
const read=()=>JSON.parse(w.localStorage.getItem(key))
const q=s=>doc.querySelector(s)
const act=(name,extra='')=>{const b=q('[data-action="'+name+'"]'+extra);if(!b)throw Error('操作が見つかりません '+name);b.click()}
const check=(pass,label)=>{if(!pass)throw Error(label)}
const value=(selector,v,event='input')=>{const node=q(selector);node.value=v;node.dispatchEvent(new w.Event(event,{bubbles:true}))}
const visibleDialog=()=>q('dialog').open
const checkLayout=()=>{check(doc.documentElement.scrollWidth<=w.innerWidth,'横スクロールが発生');check(w.innerWidth===390,'390px幅に不一致')}
const tick=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))
async function scenario(label,fn){
  try{await fn();n++;results.textContent+='✓ '+label+'\n'}
  catch(e){failures++;results.textContent+='× '+label+' — '+e.message+'\n';throw e}
}
async function fixture(){
  const res=await fetch(base+'index.html')
  if(!res.ok)throw Error('index.html '+res.status)
  const html=await res.text()
  // Isolate all writes and clipboard actions from the visitor's real browser data.
  const setup='<base href="'+base+'"><script>const entries=new Map();Object.defineProperty(window,"localStorage",{value:{getItem:k=>entries.get(k)??null,setItem:(k,v)=>entries.set(k,v)}});Object.defineProperty(navigator,"clipboard",{value:{writeText:async s=>window.testCopy=s}});<\/script>'
  await new Promise(resolve=>{frame.onload=resolve;frame.srcdoc=html.replace('<head>','<head>'+setup)})
  w=frame.contentWindow;doc=frame.contentDocument
  if(!q('.hero'))throw Error('アプリを起動できません')
}
run.addEventListener('click',async()=>{
  run.disabled=true;results.textContent='';failures=0;n=0
  try{
    frame.style.width='390px';await fixture();await tick()
    await scenario('390px幅での画像表示・横幅・縦スクロール',async()=>{
      checkLayout();check([...doc.querySelectorAll('.still img')].every(i=>i.complete&&i.naturalWidth>0),'サムネイル欠落')
      q('.copy-btn').scrollIntoView({block:'center'});await tick()
      const rect=q('.copy-btn').getBoundingClientRect()
      check(w.scrollY>0&&q('.copy-btn').contains(doc.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2)),'ボタンが隠れている')
      w.scrollTo(0,0)
    })
    await scenario('390px幅で背景・表情を選択し、別カテゴリの閲覧中も出力を保持',async()=>{
      const name=q('[data-key="name"]')
      check(name.value===''&&name.placeholder==='キャラクター名を入力','初期キャラクター名が不正')
      check(q('#prompt-value').textContent.includes('upper body shot'),'初期構図が不正')
      act('accordion','[data-id="bg"]');act('accordion','[data-id="emotion"]')
      const filter=(section,level)=>'[data-section="'+section+'"][data-key="pick-'+level+'"]'
      value(filter('bg','category'),'modernJapan','change')
      value(filter('bg','subcategory'),'streets','change')
      const target='[data-action="pick-value"][data-value="jpTicketGates"]'
      q(target).scrollIntoView({block:'center'});await tick()
      const bounds=q(target).getBoundingClientRect()
      check(q(target).contains(doc.elementFromPoint(bounds.x+bounds.width/2,bounds.y+bounds.height/2)),'背景候補をタップできません')
      q(target).click()
      value(filter('emotion','category'),'sulky','change')
      act('pick-value','[data-value="puffedCheeks"]')
      const out=q('#prompt-value').textContent
      check(out.includes('Japanese station ticket gates')&&out.includes('puffed cheeks'),'選択値が出力に反映されません')
      value(filter('bg','category'),'','change')
      value(filter('bg','search'),'教室')
      value(filter('emotion','category'),'confused','change')
      check(q('#fields-bg .picker-choices').children.length===2,'日本語検索が不正')
      check(q('#fields-bg .picker-current').textContent.includes('駅の改札'),'選択中の背景が不明')
      check(q('#prompt-value').textContent===out,'絞り込みで出力が変化')
      checkLayout()
    })
    await fixture();await tick()
    await scenario('全7パネルの開閉で出力を維持',()=>{
      const out=q('#prompt-value').textContent
      for(const b of doc.querySelectorAll('.acc-head')){
        const before=b.getAttribute('aria-expanded');b.click();check(b.getAttribute('aria-expanded')!==before,'開閉失敗');b.click()
      }
      check(out===q('#prompt-value').textContent,'開閉で出力が変化')
    })
    await scenario('直接入力・除外・再有効化・パネル再表示',()=>{
      act('mode','[data-id="body"][data-value="raw"]');value('[data-key="raw"]','<lora:original:0.8>  silver hair')
      act('mode','[data-id="body"][data-value="off"]');check(!q('#prompt-value').textContent.includes('lora:'),'除外失敗')
      act('mode','[data-id="body"][data-value="raw"]');act('accordion','[data-id="body"]');act('accordion','[data-id="body"]')
      check(q('[data-key="raw"]').value==='<lora:original:0.8>  silver hair','入力消失')
    })
    await scenario('キャラを保存・複製・呼び出し',()=>{
      act('save-char');value('#record-name','保存用キャラ');act('confirm')
      value('[data-key="name"]','編集中');act('library');act('duplicate');check(read().characters.length===2,'複製失敗')
      act('load-record','[data-id="'+read().characters[1].id+'"]');act('confirm')
      check(read().draft.name==='保存用キャラ','復元失敗')
    })
    await scenario('全場面一覧・確認キャンセル・固定付きプリセット適用',()=>{
      act('accordion','[data-id="bg"]');act('toggle-lock','[data-id="bg"]')
      const saved=JSON.stringify(read().draft.sections.bg)
      act('all-presets');check(q('dialog').querySelectorAll('.preset-card').length===12,'一覧不足')
      q('dialog [data-id="p09"]').click();check(visibleDialog(),'確認なし');act('close')
      check(read().draft.preset==='p01','キャンセル失敗')
      act('preset','[data-id="p03"]');act('confirm')
      check(read().draft.preset==='p03'&&JSON.stringify(read().draft.sections.bg)===saved,'固定・適用失敗')
    })
    await scenario('全形式の切替・全文およびセクションコピー',async()=>{
      const sel=q('[data-key="format"]')
      for(const opt of sel.options){value('[data-key="format"]',opt.value,'change');check(q('#prompt-value').textContent.includes('<lora:original:0.8>  silver hair'),'原文が変化')}
      await q('.copy-btn').click();await tick();check(w.testCopy===q('#prompt-value').textContent,'全文コピー不一致')
      act('out-tab','[data-id="section"]');act('copy-section','[data-id="body"]');await tick();check(w.testCopy.includes('lora:original'),'部分コピー不一致')
      act('out-tab','[data-id="full"]')
    })
    await scenario('カメラ図解の選択・矛盾警告・390pxでのモーダル',()=>{
      act('accordion','[data-id="camera"]');act('camera-choice','[data-id="face"]')
      act('accordion','[data-id="pose"]');value('[data-section="pose"][data-field="stance"]','kneel','change')
      check(q('#warnings').textContent.includes('足元'),'矛盾未検出');checkLayout()
      act('all-presets');check(q('dialog').getBoundingClientRect().width<=390,'ダイアログの幅');act('close')
    })
    await scenario('項目・シーン・全入力リセットの確認・取消・復元',()=>{
      const d=JSON.stringify(read().draft);act('reset-section','[data-id="body"]')
      check(read().draft.sections.body.raw==='','項目初期化失敗');act('undo');check(JSON.stringify(read().draft)===d,'項目復元失敗')
      for(const action of ['reset-scene','reset-all']){
        act(action);check(visibleDialog(),'確認なし');act('close');check(JSON.stringify(read().draft)===d,'キャンセル失敗')
        act(action);act('confirm');check(read().characters.length===2,'保存済み記録を喪失')
        if(action==='reset-scene')check(read().draft.name==='保存用キャラ'&&Object.keys(read().draft.sections.pose.values).length===0,'対象不一致')
        else check(!read().draft.name,'全初期化失敗')
        act('undo');check(JSON.stringify(read().draft)===d,'復元失敗')
      }
    })
    await scenario('次の挿絵・シーン保存および複製',()=>{
      act('save-scene');value('#record-name','挿絵A');act('confirm')
      const before=read().draft;act('next');act('confirm');const after=read().draft
      check(after.sceneNo===2&&before.name===after.name&&after.sections.body.raw===before.sections.body.raw&&after.sections.bg.locked,'引き継ぎ失敗')
      act('library');act('lib-tab','[data-id="scenes"]');act('duplicate');check(read().scenes.length===2,'シーン複製失敗')
      act('load-record');act('confirm');check(read().draft.sceneNo===1,'シーン復元失敗')
    })
    await scenario('JSON読込の異常処理・正常復元',async()=>{
      const snapshot=read()
      async function pick(payload){
        const f=new w.DataTransfer();f.items.add(new w.File([payload],'test.json',{type:'application/json'}))
        const el=q('#importfile');el.files=f.files;el.dispatchEvent(new w.Event('change',{bubbles:true}))
        for(let i=0;i<100&&!visibleDialog();i++)await tick()
      }
      await pick('{broken');check(q('#modal-title').textContent.includes('失敗'),'不正データを受理');act('close')
      check(JSON.stringify(read())===JSON.stringify(snapshot),'不正JSONで既存データを破損')
      snapshot.draft.name='JSONから復元';await pick(JSON.stringify(snapshot));act('confirm')
      check(read().draft.name==='JSONから復元','JSON復元失敗')
    })
    await scenario('1280px幅の編集室とプレビューの表示',async()=>{
      frame.style.width='1280px';await tick()
      check(doc.documentElement.scrollWidth<=w.innerWidth,'PC横はみ出し')
      check(q('.output-col').getBoundingClientRect().x>q('.edit-col').getBoundingClientRect().x,'PCの二段組が崩れた')
    })
  }catch(e){if(!failures){results.textContent+='× '+e.message+'\n';failures++}}
  finally{results.textContent+='\n'+n+'件成功 / '+failures+'件失敗';run.disabled=false}
})


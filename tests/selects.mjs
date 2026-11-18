// Exercise browser input, including Chromium's native popup. Never assign select.value.
import assert from 'node:assert/strict'
import {chromium,webkit,devices} from 'playwright'
import {generate,warnings,storageKey} from '../dist/engine.mjs'

async function audit(engine,width,url) {
  const browser=await engine.launch({executablePath:engine===chromium?process.env.CHROMIUM_EXECUTABLE_PATH:undefined})
  try {
    const page=await browser.newPage({...devices['iPhone 13'],viewport:{width,height:780}})
    await page.goto(url)
    const closed=page.locator('.acc-head[aria-expanded="false"]')
    while(await closed.count())await closed.first().tap()
    await page.evaluate(()=>{
      window.selectEvents={changes:0,touches:0,focusCalls:0}
      document.addEventListener('change',e=>{if(e.target.matches('select')&&e.isTrusted)window.selectEvents.changes++},true)
      document.addEventListener('touchend',e=>{if(e.target.matches('select')&&e.isTrusted)window.selectEvents.touches++},true)
      const focus=HTMLElement.prototype.focus
      HTMLElement.prototype.focus=function(...args){
        if(this.matches('select'))window.selectEvents.focusCalls++
        return focus.apply(this,args)
      }
    })
    let operations=0
    async function select(control,key,to){
      const handle=await control.elementHandle()
      const before=await handle.evaluate(el=>({value:el.value,events:{...window.selectEvents}}))
      await control.tap()
      if(engine===chromium) assert.ok(await handle.evaluate(el=>el.matches(':open')),'popup opens on one tap')
      if(key)await page.keyboard.press(key)
      await page.keyboard.press('Enter')
      const result=await handle.evaluate((el,storageKey)=>({
        value:el.value,connected:el.isConnected,open:el.matches(':open'),events:{...window.selectEvents},
        draft:JSON.parse(localStorage.getItem(storageKey)).draft,
        output:document.querySelector('#prompt-value').textContent,
        warnings:[...document.querySelectorAll('#warnings .warning span')].map(n=>n.textContent),
        data:{...el.dataset}
      }),storageKey)
      assert.equal(result.connected,true)
      assert.equal(result.open,false)
      assert.equal(result.value,to,JSON.stringify(result.data)+' '+key)
      assert.equal(result.events.focusCalls,before.events.focusCalls)
      assert.equal(result.events.changes-before.events.changes,Number(before.value!==to))
      assert.equal(result.events.touches-before.events.touches,1)
      const {data,draft}=result
      if(data.key==='value')assert.equal(draft.sections[data.section].values[data.field]||'',to)
      if(data.key==='format')assert.equal(draft.format,to)
      assert.equal(result.output,generate(draft)||'設定を選ぶと、ここにプロンプトが表示されます。')
      assert.deepEqual(result.warnings,warnings(draft))
      await handle.dispose()
      operations++
    }
    async function cycle(control){
      const values=await control.locator('option').evaluateAll(opts=>opts.map(o=>o.value))
      const a=values.at(-1)
      await select(control,'End',a)
      await select(control,null,a)
      await select(control,'ArrowUp',values.at(-2))
      await select(control,'ArrowUp',values.at(-3))
      await select(control,'End',a)
      if(values[0]==='')await select(control,'Home','')
    }
    const ordinary=await page.locator('select[data-key="value"]').all()
    for(const control of ordinary)await cycle(control)
    await cycle(page.locator('select[data-key="format"]'))
    await cycle(page.locator('select[data-section="emotion"][data-key="pick-category"]'))
    const major=page.locator('select[data-section="bg"][data-key="pick-category"]')
    await cycle(major)
    for(const majorId of await major.locator('option').evaluateAll(opts=>opts.slice(1).map(o=>o.value))){
      await select(major,'ArrowDown',majorId)
      await cycle(page.locator('select[data-key="pick-subcategory"]'))
    }
    // Move directly between neighboring fields, leaving a real value in each for reload.
    for(const control of ordinary){
      const last=await control.locator('option').last().getAttribute('value')
      await select(control,'End',last)
    }
    const saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).draft,storageKey)
    await page.reload()
    for(const el of await page.locator('select[data-key="value"]').all()){
      const data=await el.evaluate(e=>e.dataset)
      assert.equal(await el.inputValue(),saved.sections[data.section].values[data.field]||'')
    }
    assert.equal(await page.locator('[data-key="format"]').inputValue(),saved.format)
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width)
    console.log(engine.name(),width+'px',ordinary.length+' ordinary fields, format, both categories, four subcategory lists;',operations+' single-tap selections passed')
  }finally{await browser.close()}
}

const url=process.argv[2]||'http://127.0.0.1:8080/'
await Promise.all([chromium,webkit].map(async engine=>{
  for(const width of [390,360])await audit(engine,width,url)
}))

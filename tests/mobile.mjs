// Run against a served dist/ or the deployed Pages URL in fresh browser contexts.
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {chromium, webkit, devices} from 'playwright'
import {storageKey} from '../dist/engine.mjs'
import {placeField, faceField} from '../dist/scene-options.mjs'

const base = process.argv[2] || 'http://127.0.0.1:8080/'
for (const engine of [chromium, webkit]) {
  const executablePath = engine === chromium ? process.env.CHROMIUM_EXECUTABLE_PATH : undefined
  const browser = await engine.launch({executablePath})
  try {
    for (const width of [390,360]) {
      const context = await browser.newContext({...devices['iPhone 13'], viewport:{width,height:780}, locale:'ja-JP'})
      const page = await context.newPage()
      const errors=[]
      page.on('pageerror', error=>errors.push(error.message))
      await page.addInitScript(key=>{
        window.events={clicks:0,touches:0,writes:0}
        for(const [event,count] of [['click','clicks'],['touchend','touches']]){
          document.addEventListener(event,e=>{
            if(e.isTrusted && e.target.closest('[data-action="pick-value"]')) window.events[count]++
          },true)
        }
        const setItem=Storage.prototype.setItem
        Storage.prototype.setItem=function(k,v){
          setItem.call(this,k,v)
          if(k===key) window.events.writes++
        }
      },storageKey)
      await page.goto(base)
      const action=(name,extra='')=>page.locator('[data-action="'+name+'"]'+extra).first()
      const filter=(section,key)=>page.locator('[data-section="'+section+'"][data-key="pick-'+key+'"]')
      for(const section of ['emotion','bg']) await action('accordion','[data-id="'+section+'"]').tap()
      const output=page.locator('#prompt-value')
      async function browse(section,key,value){
        const control=filter(section,key)
        const original=await control.elementHandle()
        await control.focus()
        const before=await output.textContent()
        await control.selectOption(value)
        assert.ok(await original.evaluate(el=>el.isConnected && document.activeElement===el))
        assert.equal(await output.textContent(),before)
      }
      async function pick(section,id,repeat=false){
        const field=section==='bg'?placeField:faceField
        const choice=action('pick-value','[data-section="'+section+'"][data-value="'+id+'"]')
        const original=await choice.elementHandle()
        const before=await page.evaluate(()=>window.events)
        await choice.tap()
        assert.ok(await original.evaluate(el=>el.isConnected && el.getAttribute('aria-pressed')==='true'))
        assert.equal(await page.locator('#fields-'+section+' .picker-current strong').textContent(),field.options[id].ja.split(' · ').at(-1))
        assert.ok((await output.textContent()).includes(field.options[id].tag))
        const stored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),storageKey)
        assert.equal(stored.draft.sections[section].values[field.id],id)
        assert.deepEqual(await page.evaluate(()=>window.events),{clicks:before.clicks+1,touches:before.touches+1,writes:before.writes+(repeat?0:1)})
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width)
      }
      await browse('emotion','category','confused');await pick('emotion','puzzled')
      await browse('emotion','category','sulky');await pick('emotion','pout');await pick('emotion','pout',true)
      await browse('bg','category','modernJapan');await pick('bg','jpAfterSchool')
      await browse('bg','category','westernFantasy');await browse('bg','subcategory','magic');await pick('bg','wfCavern')
      await browse('bg','category','desertFantasy');await browse('bg','subcategory','journey');await pick('bg','dfCamp')
      await action('save-scene').tap()
      await page.locator('#record-name').fill('砂漠の野営地')
      await action('confirm').tap()
      await page.reload()
      assert.equal(await filter('bg','category').inputValue(),'desertFantasy')
      assert.equal(await filter('bg','subcategory').inputValue(),'journey')
      await pick('bg','dfOasis')
      await action('library').tap();await action('lib-tab','[data-id="scenes"]').tap()
      await action('load-record').tap();await action('confirm').tap()
      assert.equal(await filter('bg','subcategory').inputValue(),'journey')
      assert.ok((await output.textContent()).includes(placeField.options.dfCamp.tag))
      // Exercise the same JSON file a visitor can export and import.
      await action('data').tap()
      const [download]=await Promise.all([page.waitForEvent('download'),action('export').tap()])
      const backup=await readFile(await download.path())
      assert.equal(JSON.parse(backup).scenes[0].data.sections.bg.values.place,'dfCamp')
      await page.locator('dialog [data-action="close"]').first().tap()
      await action('reset-section','[data-id="bg"]').tap()
      await action('undo').tap()
      assert.ok((await output.textContent()).includes(placeField.options.dfCamp.tag))
      await pick('bg','dfOasis')
      await page.locator('#importfile').setInputFiles({name:'scene.json',mimeType:'application/json',buffer:backup})
      await action('confirm').tap()
      assert.equal(await filter('bg','subcategory').inputValue(),'journey')
      assert.ok((await output.textContent()).includes(placeField.options.dfCamp.tag))
      await browse('bg','category','modernJapan');await pick('bg','jpAfterSchool')
      const button=action('pick-value','[data-value="jpClassroom"]')
      await button.focus();await button.press('Enter')
      assert.ok(await button.evaluate(el=>el===document.activeElement && el.getAttribute('aria-pressed')==='true'))
      assert.deepEqual(errors,[])
      console.log(engine.name(),width+'px — first taps, focus, autosave, restore and layout passed')
      await context.close()
    }
  } finally {await browser.close()}
}

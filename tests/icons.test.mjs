import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
const root=new URL('../dist/',import.meta.url)
const base=new URL('https://nyuriwossan.github.io/character-scene-prompt-workshop/')
const pngSize=bytes=>{
  assert.equal(bytes.subarray(1,4).toString('latin1'),'PNG')
  return [bytes.readUInt32BE(16),bytes.readUInt32BE(20)]
}
test('Home-screen icons and manifest stay inside the GitHub Pages subpath',async()=>{
  const html=await readFile(new URL('index.html',root),'utf8')
  const links=Object.fromEntries([...html.matchAll(/<link rel="(icon|apple-touch-icon|manifest)"[^>]*href="([^"]+)"/g)].map(m=>[m[2],m[1]]))
  for(const [href,rel] of Object.entries(links)){
    assert.ok(href.startsWith('./'),rel+' must use a relative path: '+href)
    assert.ok(new URL(href,base).pathname.startsWith(base.pathname))
  }
  for(const href of ['./icons/favicon.ico','./icons/favicon-32x32.png','./icons/favicon-16x16.png','./icons/apple-touch-icon.png','./manifest.webmanifest']) assert.ok(href in links,href)
  assert.deepEqual(pngSize(await readFile(new URL('icons/apple-touch-icon.png',root))),[180,180])
  for(const n of [16,32]) assert.deepEqual(pngSize(await readFile(new URL(`icons/favicon-${n}x${n}.png`,root))),[n,n])
  const ico=await readFile(new URL('icons/favicon.ico',root))
  assert.equal(ico.readUInt16LE(2),1);assert.ok(ico.readUInt16LE(4)>=2)

  const manifestUrl=new URL('manifest.webmanifest',base)
  const manifest=JSON.parse(await readFile(new URL('manifest.webmanifest',root),'utf8'))
  for(const key of ['name','short_name','icons','start_url','display','background_color','theme_color']) assert.ok(manifest[key],key)
  assert.equal(manifest.display,'standalone')
  for(const key of ['start_url','scope','id']) assert.equal(new URL(manifest[key],manifestUrl).href,base.href,key)
  assert.match(html,new RegExp(`<meta name="theme-color" content="${manifest.theme_color}">`))
  const purposes=new Set()
  for(const icon of manifest.icons){
    const url=new URL(icon.src,manifestUrl)
    assert.ok(url.pathname.startsWith(base.pathname),icon.src)
    const [w,h]=pngSize(await readFile(fileURLToPath(new URL(url.pathname.slice(base.pathname.length),root))))
    assert.equal(icon.sizes,`${w}x${h}`,icon.src)
    purposes.add(icon.purpose)
  }
  assert.ok(manifest.icons.some(i=>i.sizes==='192x192'&&i.purpose==='any'))
  assert.ok(manifest.icons.some(i=>i.sizes==='512x512'&&i.purpose==='any'))
  assert.ok(purposes.has('maskable'))
})

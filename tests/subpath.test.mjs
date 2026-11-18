import test from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import {readFile} from 'node:fs/promises'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {presets} from '../dist/catalog.mjs'
const root=fileURLToPath(new URL('../dist/',import.meta.url))
test('Page and every runtime dependency resolve under a GitHub Pages repository subpath',async()=>{
  const prefix='/character-scene-prompt-workshop/'
  const server=createServer(async(req,res)=>{
    if(!req.url.startsWith(prefix)){res.writeHead(404).end();return}
    try{res.end(await readFile(join(root,req.url.slice(prefix.length)||'index.html')))}
    catch{res.writeHead(404).end()}
  })
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
  try{
    const base='http://127.0.0.1:'+server.address().port+prefix
    const html=await(await fetch(base)).text()
    const deps=[...html.matchAll(/(?:src|href)="(\.\/[^"]+)"/g)].map(m=>m[1]).filter(p=>!p.endsWith('.zip'))
    for(const filename of ['app.mjs','engine.mjs','catalog.mjs']){
      const code=await readFile(join(root,filename),'utf8')
      deps.push(...[...code.matchAll(/from '(\.\/[^']+)'/g)].map(m=>m[1]))
    }
    deps.push('./assets/hero.webp',...presets.map(p=>p.image),'./checks/','./checks/browser.mjs')
    for(const asset of new Set(deps)){
      const url=new URL(asset.endsWith('/')?asset+'index.html':asset,base)
      assert.ok(url.pathname.startsWith(prefix))
      const response=await fetch(url);assert.equal(response.status,200,url.pathname)
      assert.ok((await response.arrayBuffer()).byteLength>0)
    }
    assert.equal((await fetch(new URL('/assets/hero.webp',base))).status,404)
  }finally{await new Promise(resolve=>server.close(resolve))}
})


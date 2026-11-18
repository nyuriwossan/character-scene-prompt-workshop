import {newStore,generate,blankDraft,applyPreset,warnings} from '../dist/engine.mjs'
import {presets} from '../dist/catalog.mjs'
const d=newStore().draft
const parts=['# プロンプト出力例','以下は付属の出力エンジンで生成した例です。']
function example(name,draft,format){
  parts.push('## '+name,'~~~text\n'+generate(draft,format)+'\n~~~')
}
example('温室で振り返る人物・汎用英語タグ',d,'tags')
applyPreset(d,presets[2])
example('同じ人物が手を差し伸べる・PixAI Tsubaki系',d,'tsubaki')
example('同じ場面・NovelAI向け',d,'novel')
d.sections.bg.values={place:'jpAfterSchool'}
d.sections.emotion.values={face:'puzzled',gaze:'viewer'}
d.sections.camera.values={shot:'bust'}
example('放課後の教室で戸惑う・英語自然文',d,'prose')
const free=blankDraft()
free.sections.body.mode='raw';free.sections.body.raw='adult traveler, auburn hair, <lora:my_traveler:0.8>'
free.sections.bg.mode='off';free.sections.style.mode='off'
free.sections.emotion.values={face:'tearsmile',gaze:'away'}
example('既存LoRAを使い、背景と画風を除外・PixAI SDXL系',free,'sdxl')
free.sections.pose.values={stance:'kneel'};free.sections.camera.values={shot:'face'}
parts.push('## 組み合わせの確認',...warnings(free))
process.stdout.write(parts.join('\n\n')+'\n')


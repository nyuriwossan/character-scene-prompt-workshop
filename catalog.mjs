// Each option has an independent Japanese label, English tag, and prose fragment.
function field(id, label, rows, lead = '') {
  return {id, label, lead, options: Object.fromEntries(rows.split('\n').map(line => {
    const [key, ja, tag, prose = tag] = line.split('|')
    return [key, {ja, tag, prose}]
  }))}
}
const f = field
export const sections = [
  {id:'body', label:'キャラクター素体', icon:'user', fixed:true, fields:[
    f('subject','人物',`man|青年|young man|a young man
woman|女性|young woman|a young woman
person|人物|person|a person`,'The subject is '),
    f('hair','髪色',`silver|銀髪|silver hair
black|黒髪|black hair
brown|栗色の髪|chestnut hair
blond|金髪|blond hair
blue|青髪|blue hair`,'The character has '),
    f('cut','髪型',`layer|短いレイヤーヘア|short layered hair
long|長い髪|long flowing hair
wave|ゆるいウェーブ|soft wavy hair
tied|結んだ髪|tied-back hair`,'The hairstyle features '),
    f('eyes','瞳の色',`teal|青緑の瞳|teal eyes
amber|琥珀色の瞳|amber eyes
blue|青い瞳|blue eyes
gray|灰色の瞳|gray eyes
brown|茶色の瞳|brown eyes`,'The character has ')]},
  {id:'outfit',label:'衣装・装飾品',icon:'shirt',fixed:true,fields:[
    f('clothes','基本衣装',`jacket|黒のテーラードジャケット|black tailored jacket|a black tailored jacket
shirt|白いシャツ|white linen shirt|a white linen shirt
knit|柔らかなニット|soft knit sweater|a soft knit sweater
dress|イブニングドレス|evening dress|an evening dress
coat|ロングコート|long wool coat|a long wool coat
uniform|騎士の正装|ceremonial knight uniform|a ceremonial knight uniform`,'The character wears '),
    f('accessory','装飾品',`pin|襟元のブローチ|collar brooch|a brooch at the collar
earring|銀の耳飾り|silver earring|a silver earring
ribbon|リボン|silk ribbon|a silk ribbon`,'The look includes ')]},
  {id:'emotion',label:'表情・感情・視線',icon:'smile',fields:[
    f('face','表情',`smile|喜び · 微笑み|gentle smile|a gentle smile
beam|喜び · 満面の笑顔|beaming smile|a beaming smile
relief|喜び · 安堵|relieved expression|an expression of relief
blush|照れ · 頬を染める|blushing cheeks|a shy blush
avert|照れ · 目を逸らす|bashful averted eyes|a bashful, averted look
wry|照れ · 困った笑顔|awkward smile|an awkward smile
lower|悲しみ · 伏し目|downcast eyes|a downcast expression
teary|悲しみ · 涙ぐむ|tearful eyes|eyes bright with tears
cry|悲しみ · 泣く|crying|tears rolling down the cheeks
tearsmile|悲しみ · 泣き笑い|tearful smile|a smile through tears
glare|怒り · 睨む|angry glare|an angry glare
shout|怒り · 怒鳴る|shouting in anger|anger breaking into a shout
anger|怒り · 静かな怒り|restrained anger|barely restrained anger
wide|驚き · 目を見開く|wide-open eyes|eyes wide with surprise
fluster|驚き · 動揺|flustered expression|a flustered expression
stun|驚き · 呆然|stunned expression|a stunned expression
neutral|その他 · 無表情|neutral expression|a neutral expression
knowing|その他 · 余裕の笑み|knowing smile|a knowing smile
taunt|その他 · 挑発|taunting smile|a taunting smile
wist|その他 · 切なさ|wistful expression|a wistful expression
tense|その他 · 緊張|nervous smile|a nervous smile`,'The face shows '),
    f('gaze','視線',`viewer|カメラを見る|looking at viewer|directed toward the viewer
other|相手を見る|looking at the other person|directed toward the other person
away|目を逸らす|looking away|turned aside
down|伏し目|looking down|lowered
up|見上げる|looking up|lifted upward
closed|目を閉じる|closed eyes|hidden behind closed eyelids`,'The gaze is ')]},
  {id:'pose',label:'ポーズ・動作',icon:'pose',fields:[
    f('stance','基本姿勢',`stand|立つ|standing|stands still
sit|椅子に座る|seated on a chair|sits on a chair
kneel|跪く|kneeling|kneels on the ground
lean|窓辺に寄りかかる|leaning against a window frame|leans against a window frame
tiptoe|つま先立ち|standing on tiptoe|stands on tiptoe`,'The character '),
    f('motion','身体の動作',`turn|振り返る|looking back over shoulder|looks back over one shoulder
close|覗き込む|leaning toward viewer|leans closer to the viewer
bow|俯く|head bowed|bows their head
lookup|顔を上げる|head tilted upward|tilts their face upward
still|立ち尽くす|holding completely still|holds completely still`,'The character '),
    f('hands','手の動作',`reach|手を差し伸べる|outstretched hand toward viewer|reaches one hand toward the viewer
cheek|頬に手を添える|hand resting against cheek|rests one hand against their cheek
chest|胸元を押さえる|hand held to chest|holds one hand to their chest
flowers|花束を差し出す|offering a bouquet|offers a bouquet to the viewer
wall|壁に手をつく|palm against wall|places a palm against the wall
clasp|手を握りしめる|clasped hands|clasps both hands`,'The character ')]},
  {id:'camera',label:'カメラ・構図',icon:'focus',fields:[
    f('shot','撮影距離',`macro|超アップ|extreme close-up|an extreme close-up
face|顔アップ|facial close-up|a facial close-up
bust|胸上|bust shot|a bust shot
waist|腰上|waist-up shot|a waist-up shot
knee|膝上|knee-up shot|a knee-up shot
full|全身|full-body shot|a full-body shot
wide|遠景|long shot|a long shot`,'Frame the scene as '),
    f('angle','アングル',`eye|アイレベル|eye-level angle|at eye level
high|ハイアングル（俯瞰）|high-angle view|from a high angle
low|ローアングル（煽り）|low-angle view|from a low angle
top|真上から|overhead view|from directly above
ultra|超ローアングル|extreme low angle|from an extremely low angle
dutch|ダッチアングル|Dutch angle|with the camera tilted to one side`,'View the scene '),
    f('direction','撮影方向',`front|正面|front view|faces the subject directly
three|斜め45度|three-quarter view|views the subject at a three-quarter angle
side|横顔|profile view|captures the subject in profile
rear3|斜め後ろ|rear three-quarter view|looks toward the subject from diagonally behind
rear|背後|rear view|faces the subject from behind`,'The camera '),
    f('pov','視点',`third|第三者視点|third-person perspective|an outside observer
pov|主人公視点（POV）|protagonist POV|the protagonist
shoulder|相手の肩越し|over-the-shoulder shot|an observer looking over a shoulder
hand|主人公の手だけ映す|first-person view with only the protagonist’s hand in frame|the protagonist, with only their hand visible in the frame`,'The viewpoint belongs to '),
    f('layout','画面内の配置',`center|中央|centered composition|in the center
left|左寄せ|subject on left|on the left
right|右寄せ|subject on right|on the right
diagonal|斜め配置|diagonal composition|along a diagonal
foreground|手前の物体を大きく|oversized foreground object|behind a large foreground object
blur|前景をぼかす|blurred foreground|behind a softly blurred foreground
space|背景を広く見せる|expansive background|against an expansive background`,'Place the subject '),
    f('target','画面に映す対象',`character|キャラクター|featured character|the featured character
hero|主人公自身の正面|frontal view of the protagonist|the protagonist seen from the front`,'The image shows ')]},
  {id:'bg',label:'背景・照明',icon:'sun',fields:[
    f('place','背景',`garden|屋外 · 庭園|flower garden|a flower garden
glass|室内 · 温室|glass conservatory|a glass conservatory
library|室内 · 書斎|quiet library|a quiet library
window|室内 · 窓辺|tall arched window|a room with a tall arched window
street|屋外 · 石畳の道|cobblestone street|a cobblestone street
forest|幻想 · 星明かりの森|starlit enchanted forest|an enchanted forest lit by stars
plain|シンプル · 無地|plain backdrop|a plain backdrop`,'The setting is '),
    f('light','照明',`sun|木漏れ日|dappled sunlight
rim|輪郭を照らす光|warm rim lighting
soft|拡散光|soft diffused light
moon|月明かり|cool moonlight
lamp|灯火|warm lamplight`,'The scene is lit by '),
    f('time','時間帯',`morning|朝|early morning
day|昼|midday
dusk|夕暮れ|dusk
night|夜|night`,'The time is '),
    f('weather','天候',`clear|晴れ|clear skies
rain|雨|falling rain
mist|霧|light mist
snow|雪|falling snow`,'The weather brings '),
    f('view','背景の視点',`eye|目の高さ|eye-level angle|at eye level
high|高い位置|high-angle view|from a high angle
low|低い位置|low-angle view|from a low angle`,'View the setting ')]},
  {id:'style',label:'画風・品質・LoRA関連',icon:'brush',fixed:true,fields:[
    f('medium','画風',`otome|乙女ゲーム風|otome game event CG|an otome game event illustration
water|水彩|watercolor illustration|a watercolor painting
anime|アニメ塗り|cel-shaded anime illustration|a cel-shaded anime illustration
oil|油彩|oil painting|an oil painting`,'Render the scene as '),
    f('finish','仕上げ',`detail|繊細な描き込み|fine details|fine details
soft|柔らかな筆致|soft brushwork|soft brushwork
film|フィルム調|subtle film grain|subtle film grain`,'Finish with ')]}
]
export const byId = Object.fromEntries(sections.map(s => [s.id,s]))
export const fixedIds = sections.filter(s=>s.fixed).map(s=>s.id)
export const sceneIds = sections.filter(s=>!s.fixed).map(s=>s.id)
export const formats = {tags:'汎用英語タグ',prose:'英語自然文',sdxl:'PixAI SDXL系',tsubaki:'PixAI Tsubaki系',novel:'NovelAI向け',md:'Markdown構造形式',ja:'日本語設定一覧'}
const makeScene = (id, name, tone, face, gaze, stance, motion, hands, shot, angle, direction, pov, layout, place, light, time, weather) => ({
  id, name,tone, image:'./assets/'+id+'.webp', values:{
    emotion:{face,gaze},pose:{stance,motion,hands},camera:{shot,angle,direction,pov,layout},bg:{place,light,time,weather}
  }
})
export const presets = [
  makeScene('p01','振り返って微笑む','穏やか','smile','viewer','stand','turn','','bust','eye','rear3','third','center','glass','sun','day',''),
  makeScene('p02','覗き込まれる','親密','knowing','viewer','stand','close','','face','low','front','pov','center','library','lamp','dusk',''),
  makeScene('p03','手を差し伸べられる','ときめき','smile','viewer','stand','','reach','waist','low','three','pov','foreground','garden','rim','dusk',''),
  makeScene('p04','跪いて見上げる','誓い','tense','up','kneel','lookup','chest','knee','high','three','pov','center','glass','soft','morning',''),
  makeScene('p05','涙をこらえて微笑む','切なさ','tearsmile','viewer','stand','','','face','eye','three','pov','right','window','soft','dusk',''),
  makeScene('p06','俯いて泣く','悲しみ','cry','down','sit','bow','cheek','bust','high','side','third','left','library','lamp','night',''),
  makeScene('p07','窓辺で物思いにふける','静寂','wist','away','lean','','','waist','eye','side','third','left','window','rim','dusk',''),
  makeScene('p08','恥ずかしそうに目を逸らす','照れ','blush','away','stand','','cheek','bust','eye','three','pov','center','garden','soft','morning',''),
  makeScene('p09','雨の中で立ち尽くす','雨音','stun','down','stand','still','','wide','eye','front','third','space','street','soft','dusk','rain'),
  makeScene('p10','背中越しに振り返る','余韻','wist','viewer','stand','turn','','waist','eye','rear3','third','right','street','rim','dusk',''),
  makeScene('p11','花束を差し出す','祝福','beam','viewer','stand','','flowers','waist','eye','three','pov','center','garden','sun','day',''),
  makeScene('p12','告白直前の緊張した表情','告白','tense','away','stand','','clasp','bust','eye','three','pov','left','forest','moon','night','')
]


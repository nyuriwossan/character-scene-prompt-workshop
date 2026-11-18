// Categories index the picker; only ja, tag and prose enter the output engine.
// Rows: stable ID | Japanese label | tag | phrase following the field's lead.
function groupedField(id, label, lead, groups) {
  const options = {}
  const categories = groups.map(group => {
    const leaves = group.children ?? [group]
    for (const leaf of leaves) {
      for (const row of leaf.rows.trim().split('\n')) {
        const [key, ja, tag, prose] = row.split('|')
        if (!key || !ja || !tag || !prose || Object.hasOwn(options, key)) {
          throw new Error(`Invalid option in ${id}: ${key}`)
        }
        options[key] = {ja, tag, prose, category: group.id, subcategory: group.children ? leaf.id : ''}
      }
    }
    return {id: group.id, label: group.label, children: (group.children ?? []).map(({id, label}) => ({id, label}))}
  })
  return {id, label, lead, options, categories}
}
const group = (id, label, rows) => ({id, label, rows})

export const faceField = groupedField('face', '表情', 'The face shows ', [
  group('joy', '喜び', `smile|喜び · 微笑み|gentle smile|a gentle smile
beam|喜び · 満面の笑顔|beaming smile|a beaming smile
relief|喜び · 安堵|relieved expression|an expression of relief`),
  group('shy', '照れ', `blush|照れ · 頬を染める|blushing cheeks|a shy blush
avert|照れ · 目を逸らす|bashful averted eyes|a bashful, averted look
wry|照れ · 困った笑顔|awkward smile|an awkward smile
bashfulSmile|恥ずかしそうに微笑む|bashful smile|a bashful smile
shySmile|はにかむ|shy smile|a small, shy smile
deepBlush|真っ赤になって照れる|deep blush|a deep blush spreading across both cheeks
hideFace|顔を手で隠して照れる|covering face in embarrassment|a blush partly concealed behind raised hands`),
  group('sad', '悲しみ', `lower|悲しみ · 伏し目|downcast eyes|a downcast expression
teary|悲しみ · 涙ぐむ|tearful eyes|eyes bright with tears
cry|悲しみ · 泣く|crying|tears rolling down the cheeks
tearsmile|悲しみ · 泣き笑い|tearful smile|a smile through tears`),
  group('angry', '怒り', `glare|怒り · 睨む|angry glare|an angry glare
shout|怒り · 怒鳴る|shouting in anger|anger breaking into a shout
anger|怒り · 静かな怒り|restrained anger|barely restrained anger`),
  group('surprise', '驚き', `wide|驚き · 目を見開く|wide-open eyes|eyes wide with surprise
fluster|驚き · 動揺|flustered expression|a flustered expression
stun|驚き · 呆然|stunned expression|a stunned expression
startled|不意を突かれて驚く|startled expression|a startled expression
gasp|息をのむ|gasping in surprise|surprise, with lips parted in a gasp
pleasantSurprise|嬉しい驚き|pleasantly surprised expression|a look of delighted surprise
disbelief|信じられない様子|look of disbelief|a look of disbelief`),
  group('confused', '困惑', `perplexed|困惑する|perplexed expression|a perplexed frown
puzzled|戸惑う|puzzled expression|a puzzled look
uncertain|どうしていいか分からない|uncertain expression|uncertainty about what to do
hesitant|返答に詰まる|hesitant expression|hesitation, as if searching for a reply
uncomfortable|気まずそうにする|visibly uncomfortable expression|visible discomfort`),
  group('sulky', 'いじける', `sulking|いじける|sulking|a sulky expression
pout|拗ねる|pouty expression|a petulant pout
puffedCheeks|頬をふくらませる|puffed cheeks|cheeks puffed out in a pout
displeased|不満そうな顔|displeased expression|a look of displeasure
sullen|むっつり黙り込む|sullen expression|sullen silence, with lips pressed together`),
  group('other', 'その他', `neutral|その他 · 無表情|neutral expression|a neutral expression
knowing|その他 · 余裕の笑み|knowing smile|a knowing smile
taunt|その他 · 挑発|taunting smile|a taunting smile
wist|その他 · 切なさ|wistful expression|a wistful expression
tense|その他 · 緊張|nervous smile|a nervous smile`)
])

export const placeField = groupedField('place', '背景', 'The setting is ', [
  {id: 'modernJapan', label: '現代日本', children: [
    group('school', '学校・青春', `jpClassroom|日本の教室|modern Japanese classroom|a classroom in a modern Japanese school
jpAfterSchool|放課後の教室|empty Japanese classroom after school|an empty Japanese classroom after school
jpSchoolCorridor|学校の廊下|Japanese school corridor|a corridor in a Japanese school
jpStairwell|階段の踊り場|Japanese school stairwell landing|a stairwell landing in a Japanese school
jpSchoolRoof|学校の屋上|Japanese school rooftop|the rooftop of a Japanese school
jpSchoolLibrary|学校の図書室|Japanese school library|the library of a Japanese school
jpInfirmary|保健室|Japanese school infirmary|the infirmary of a Japanese school
jpShoeLockers|昇降口・下駄箱|Japanese school entrance with shoe lockers|the entrance hall of a Japanese school, lined with shoe lockers
jpSchoolCourtyard|学校の中庭|Japanese school courtyard|a courtyard within a Japanese school
jpGym|体育館|Japanese school gymnasium|a Japanese school gymnasium`),
    group('streets', '街並み・交通', `jpResidentialStreet|日本の住宅街|quiet Japanese residential street|a quiet residential street in Japan
jpAlley|細い路地|narrow Japanese urban alley|a narrow alley in a Japanese city
jpShoppingStreet|商店街|Japanese shopping street|a Japanese shopping street lined with small stores
jpPlatform|駅のホーム|Japanese railway platform|a station platform in Japan
jpTicketGates|駅の改札|Japanese station ticket gates|the ticket gate area of a Japanese train station
jpStationPlaza|駅前広場|Japanese station plaza|the plaza outside a Japanese train station
jpCrosswalk|横断歩道|Japanese urban crosswalk|a crosswalk on a Japanese city street
jpFootbridge|歩道橋|Japanese pedestrian overpass|a pedestrian bridge over a Japanese street
jpStorefront|コンビニ前|Japanese convenience store exterior|the area just outside a Japanese convenience store
jpVendingStreet|自動販売機のある道|Japanese street with vending machines|a Japanese street lined with vending machines
jpPromenade|川沿いの遊歩道|Japanese riverside promenade|a riverside promenade in Japan
jpDowntown|繁華街|Japanese downtown entertainment district|the downtown entertainment district of a Japanese city`),
    group('outings', 'デート・お出かけ', `jpCafeWindow|カフェの窓際席|window seat in a Japanese cafe|a window seat in a Japanese café
jpFamilyRestaurant|ファミリーレストラン|Japanese family restaurant interior|the dining area of a Japanese family restaurant
jpBookstore|書店|modern Japanese bookstore|a modern Japanese bookstore
jpMall|ショッピングモール|Japanese shopping mall interior|the interior of a Japanese shopping mall
jpCinema|映画館ロビー|Japanese cinema lobby|the lobby of a Japanese cinema
jpAquarium|水族館|aquarium exhibition hall in Japan|an exhibition hall in a Japanese aquarium
jpAmusementPark|遊園地|Japanese amusement park|an amusement park in Japan
jpFerrisWheel|観覧車の前|plaza beside a Ferris wheel|a plaza at the foot of a Ferris wheel in Japan
jpParkBench|公園のベンチ|bench in a Japanese public park|a bench in a Japanese public park
jpBotanicalGarden|植物園|Japanese botanical garden|a botanical garden in Japan`),
    group('home', '住居・日常', `jpApartment|一人暮らしの部屋|small modern Japanese apartment room|a room in a small Japanese apartment for one
jpLivingRoom|リビング|modern Japanese living room|a modern Japanese living room
jpTatami|和室|Japanese tatami room|a traditional Japanese room with tatami flooring
jpGenkan|玄関|genkan in a Japanese home|the genkan, or entryway, of a Japanese home
jpKitchen|ダイニングキッチン|Japanese kitchen with dining area|a modern Japanese kitchen with an adjoining dining area
jpBedroom|寝室|modern Japanese bedroom|a bedroom in a modern Japanese home
jpBalcony|ベランダ|Japanese apartment balcony|the balcony of a Japanese apartment
jpApartmentHall|マンションの廊下|Japanese apartment building corridor|a corridor in a Japanese apartment building
jpSharedRoom|シェアハウスの共有室|common room in a Japanese shared house|the common room of a shared house in Japan`),
    group('work', '仕事・公共施設', `jpOffice|オフィス|modern Japanese office|a modern office in Japan
jpMeetingRoom|会議室|Japanese corporate meeting room|a meeting room in a Japanese office
jpElevator|エレベーター|modern elevator interior|the interior of an elevator in a modern Japanese building
jpWaitingRoom|病院の待合室|Japanese hospital waiting room|the waiting room of a Japanese hospital
jpHospitalRoom|病室|modern Japanese hospital room|a patient room in a modern Japanese hospital
jpConvenienceStore|コンビニ店内|Japanese convenience store interior|the interior of a Japanese convenience store
jpHotelLobby|ホテルのロビー|Japanese city hotel lobby|the lobby of a city hotel in Japan
jpPrivateDining|レストランの個室|private dining room in a Japanese restaurant|a private dining room in a Japanese restaurant`),
    group('seasonal', '季節・行事', `jpCherryStreet|桜並木|Japanese street lined with cherry blossoms|a Japanese street lined with cherry trees in bloom
jpRainyStreet|雨の街路|rain-soaked Japanese city street|a rain-soaked street in a Japanese city
jpFestivalStalls|夏祭りの屋台|Japanese summer festival food stalls|a row of food stalls at a Japanese summer festival
jpFireworks|花火大会の河川敷|Japanese riverside fireworks festival|a riverbank in Japan during a fireworks festival
jpAutumnAvenue|紅葉の並木道|Japanese avenue with autumn foliage|a tree-lined avenue in Japan filled with autumn foliage
jpWinterLights|冬のイルミネーション|Japanese street with winter illuminations|a Japanese street decorated with winter illuminations
jpShrinePath|神社の参道|Japanese shrine approach|the approach to a Japanese shrine
jpShrineCourt|神社の境内|Japanese shrine courtyard|the courtyard of a Japanese shrine
jpHotSpringTown|温泉街|Japanese hot spring town street|a street in a Japanese hot spring town
jpRyokan|旅館の廊下|traditional Japanese ryokan corridor|a corridor inside a traditional Japanese inn`)
  ]},
  {id: 'westernFantasy', label: '西洋ファンタジー', children: [
    group('court', '王城・宮廷', `wfGrandHall|王城の大広間|grand hall of a fantasy castle|the great hall of a royal castle
wfThrone|玉座の間|medieval fantasy throne room|a vaulted throne room in a medieval castle
wfGallery|王宮の回廊|ornate royal palace corridor|an ornate corridor in a royal palace
wfChamber|王族の私室（西洋王城）|private royal castle chamber|a private chamber in the royal wing of a castle
wfBallroom|舞踏会場|grand fantasy ballroom|a grand ballroom with a wide parquet floor
wfTower|城の塔の階段|spiral staircase inside a castle tower|a spiral staircase winding up a castle tower
wfCourtyard|城の中庭|medieval castle courtyard|a courtyard enclosed by medieval castle walls
wfBalcony|城のバルコニー|royal castle balcony|a stone balcony projecting from a royal castle`),
    group('town', '街・建築', `wfCobbles|中世風の石畳の街|medieval fantasy cobblestone street|a cobbled street in a medieval fantasy town
wfSquare|城下町の広場|medieval castle town square|a town square beneath the walls of a castle
wfMarket|中世風の市場|medieval fantasy marketplace|a medieval marketplace lined with wooden stalls
wfBridge|古い石橋|ancient stone bridge|an old stone bridge spanning a river
wfGuild|冒険者ギルド|fantasy adventurers’ guild hall|the timber-framed hall of an adventurers’ guild
wfTavern|中世風の酒場|medieval fantasy tavern interior|the common room of a medieval tavern`),
    group('wilds', '自然・冒険', `wfForest|魔法の森|enchanted fantasy forest|an enchanted forest of ancient, twisting trees
wfMeadow|幻想的な花畑|fantasy wildflower meadow|a meadow carpeted with otherworldly wildflowers
wfLake|霧の湖畔|misty fantasy lakeshore|a lakeshore edged with banks of mist
wfRuins|古代遺跡|ancient fantasy ruins|a ruined complex of ancient stone arches
wfPass|山岳の峠|mountain pass in a fantasy kingdom|a narrow pass between the mountains of a fantasy kingdom
wfFalls|滝のある渓谷|fantasy valley with a waterfall|a steep valley with a waterfall spilling over its cliffs`),
    group('magic', '魔法・神秘', `wfAcademy|魔法学院|fantasy magic academy|an academy of magic with connected towers
wfArchive|魔導書の書庫|ancient arcane library|an ancient library with shelves of spellbooks
wfWorkshop|錬金術師の工房|alchemist’s workshop|an alchemist’s workshop with glass vessels on a workbench
wfAltar|魔法の祭壇|arcane stone altar|a stone altar inscribed with arcane symbols
wfCavern|水晶洞窟|glowing crystal cavern|a cavern lined with luminous crystals
wfObservatory|魔法学院の天文台|magic academy observatory|a domed observatory at an academy of magic`),
    group('sanctuary', '教会・聖域', `wfCathedral|荘厳な大聖堂|grand Gothic fantasy cathedral|a grand Gothic cathedral with soaring pointed arches
wfCloister|修道院の回廊|medieval monastery cloister|a covered cloister around a monastery garden
wfChapel|ステンドグラスの礼拝堂|chapel with stained glass windows|a small chapel with stained glass windows
wfSpring|聖なる泉|sacred spring in a fantasy sanctuary|a sacred spring within a woodland sanctuary`)
  ]},
  {id: 'desertFantasy', label: 'アラビアン・砂漠ファンタジー', children: [
    group('palace', '王宮・建築', `dfCourt|砂漠王宮の中庭|courtyard of a desert fantasy palace|a courtyard enclosed by the arcades of a desert palace
dfArcade|アーチ状の回廊|ornate arched palace corridor|a palace corridor framed by a succession of carved arches
dfTiles|幾何学模様の広間|grand hall with geometric tile patterns|a grand hall paved with tiles in geometric patterns
dfGarden|噴水のある宮殿庭園|palace garden with a central fountain|a walled palace garden arranged around a central fountain
dfTerrace|王宮の屋上テラス|rooftop terrace of a desert palace|a broad rooftop terrace on a desert palace
dfChamber|王族の私室（砂漠王宮）|private chamber in a desert palace|a private royal chamber with a carved screen in a desert palace
dfDome|ドーム天井の大広間|grand palace hall with a domed ceiling|a grand palace hall beneath a high dome
dfLattice|格子窓のある部屋|palace room with ornate lattice windows|a palace room with intricately carved lattice windows`),
    group('bazaar', '街・市場', `dfBazaar|賑やかなバザール|bustling fantasy desert bazaar|a bustling bazaar in a desert city
dfSouk|スークの路地|narrow alley in a souk|a narrow alley between the stalls of a souk
dfSpice|香辛料店|spice stall in a bazaar|a bazaar stall with mounds of spices in shallow baskets
dfTextiles|織物商の店|textile shop in a desert bazaar|a textile shop with bolts of colorful fabric
dfGate|砂漠都市の城門|monumental gate of a desert city|a monumental gate in the walls of a desert city
dfRoof|砂漠都市の屋上|rooftop overlooking a desert city|a flat rooftop above the winding streets of a desert city`),
    group('journey', '砂漠・旅', `dfDunes|広大な砂丘|vast rolling desert dunes|a vast expanse of rolling sand dunes
dfOasis|オアシス|lush oasis surrounded by desert dunes|a palm-fringed oasis surrounded by dunes
dfRocks|砂漠の岩山|rugged desert rock formations|a cluster of rugged rock formations rising from the desert
dfRoute|隊商の通る道|ancient caravan route through the desert|an ancient caravan route winding through the desert
dfCamp|砂漠の野営地|caravan campsite in the desert|a caravan campsite with canvas tents in the desert
dfCave|岩窟の入口|cave entrance in desert cliffs|a cave entrance at the base of desert cliffs`),
    group('mystic', '神秘・幻想', `dfTemple|砂漠の古代神殿|ancient temple in a fantasy desert|an ancient stone temple rising from the desert sands
dfLamps|魔法のランプが並ぶ部屋|chamber filled with enchanted lamps|a chamber lined with shelves of enchanted lamps
dfWaterway|地下水路の遺跡|ruined underground waterway|a ruined underground waterway with stone channels
dfFountain|青いタイルの神秘的な泉|enchanted fountain with blue mosaic tiles|an enchanted fountain lined with blue mosaic tiles`)
  ]},
  {id: 'other', label: 'その他の背景', children: [
    group('outdoor', '屋外', `garden|屋外 · 庭園|flower garden|a flower garden
street|屋外 · 石畳の道|cobblestone street|a cobblestone street`),
    group('indoor', '室内', `glass|室内 · 温室|glass conservatory|a glass conservatory
library|室内 · 書斎|quiet library|a quiet library
window|室内 · 窓辺|tall arched window|a room with a tall arched window`),
    group('fantasy', '幻想', `forest|幻想 · 星明かりの森|starlit enchanted forest|an enchanted forest lit by stars`),
    group('simple', 'シンプル', `plain|シンプル · 無地|plain backdrop|a plain backdrop`)
  ]}
])

// Advisory only. An omitted value or a free-text background never activates a rule.
export const placeWarnings = [
  {places:['jpAfterSchool'], field:'time', values:['morning'], message:'朝が選ばれています。授業後の場面に合う時間帯かご確認ください。'},
  {places:['jpFireworks','jpWinterLights','forest'], field:'time', values:['morning','day'], message:'日中の明るさでは、背景に含まれる光が見えにくくなります。時間帯をご確認ください。'},
  {places:['jpFireworks','jpWinterLights','forest'], field:'light', values:['sun'], message:'木漏れ日が選ばれています。背景に含まれる夜の光と合わせて、意図した照明かご確認ください。'},
  {places:['jpFestivalStalls'], field:'weather', values:['snow'], message:'降雪が選ばれています。意図した季節の組み合わせかご確認ください。'}
]

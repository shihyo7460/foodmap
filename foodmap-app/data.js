// 推薦店家資料（座標為大約位置，可在 App 裡拖曳修正）
const CATS = {
  ramen:{label:"拉麵",k:"麵"}, nabe:{label:"鍋物",k:"鍋"}, kona:{label:"粉物",k:"粉"},
  kushi:{label:"串炸",k:"串"}, washoku:{label:"和食",k:"和"}, yoshoku:{label:"洋食",k:"洋"},
  night:{label:"屋台・夜晚",k:"夜"}, market:{label:"市場",k:"市"}, sweet:{label:"甜點咖啡",k:"甜"},
  other:{label:"其他",k:"食"}
};
const CITIES = {
  fukuoka:{name:"福岡",
    landmarks:[["博多站",33.5897,130.4207],["天神",33.5913,130.3990],["中洲川端",33.5946,130.4064],["祇園站",33.5930,130.4135]],
    rivers:[[[33.6005,130.4052],[33.5960,130.4058],[33.5920,130.4048],[33.5880,130.4040],[33.5835,130.4032]]]},
  osaka:{name:"大阪",
    landmarks:[["大阪站・梅田",34.7025,135.4959],["心齋橋",34.6750,135.5010],["難波",34.6664,135.5000],["日本橋",34.6667,135.5060],["通天閣",34.6525,135.5063],["天王寺",34.6466,135.5133]],
    rivers:[[[34.6693,135.4950],[34.6689,135.5000],[34.6690,135.5050],[34.6700,135.5090]]]},
  kyoto:{name:"京都",
    landmarks:[["京都站",34.9858,135.7588],["河原町",35.0037,135.7690],["祇園",35.0036,135.7720],["八坂神社",35.0037,135.7785],["南禪寺",35.0113,135.7943],["出町柳",35.0302,135.7728],["嵐山",35.0094,135.6668],["伏見稻荷",34.9671,135.7727]],
    rivers:[[[35.0400,135.7740],[35.0300,135.7720],[35.0150,135.7712],[35.0050,135.7716],[34.9950,135.7695],[34.9800,135.7665],[34.9680,135.7640]],[[35.0200,135.6650],[35.0130,135.6720],[35.0050,135.6800]]]}
};
// 推薦店家（座標為大約位置，營業時間與公休請出發前再確認）
const PLACES = [
 // 福岡
 {id:"fk-ichiran",city:"fukuoka",name:"一蘭 總本店",jp:"一蘭 本社総本店",cat:"ramen",area:"中洲",lat:33.5926,lng:130.4069,price:"¥",desc:"一蘭的發源地，24 小時營業。總本店有限定的屋台風座位和醬滷叉燒。",tip:"深夜去人比較少，吃完可以順便逛中洲屋台。"},
 {id:"fk-nagahamaya",city:"fukuoka",name:"元祖長濱屋",jp:"元祖長浜屋",cat:"ramen",area:"長濱",lat:33.5951,lng:130.3920,price:"¥",desc:"長濱拉麵的元祖，菜單只有一種拉麵，極細麵可以「替玉」加麵，價格很親民。",tip:"點餐時可以說麵的硬度：かため（偏硬）是在地人常點的。"},
 {id:"fk-ikkousha",city:"fukuoka",name:"博多一幸舍 總本店",jp:"博多一幸舎 総本店",cat:"ramen",area:"博多站",lat:33.5878,lng:130.4175,price:"¥",desc:"泡系豚骨湯頭，湯面有一層細緻泡沫，濃郁但順口。",tip:"離博多站走路約 5 分鐘，抵達或離開福岡那天很好安排。"},
 {id:"fk-shinshin",city:"fukuoka",name:"博多拉麵 Shin-Shin 天神本店",jp:"博多らーめん ShinShin 天神本店",cat:"ramen",area:"天神",lat:33.5897,lng:130.3962,price:"¥",desc:"湯頭濃郁但後味清爽，在地人也常吃的人氣店。",tip:"晚上常排隊，可以避開用餐尖峰。"},
 {id:"fk-rakutenchi",city:"fukuoka",name:"元祖牛腸鍋 樂天地 天神總本店",jp:"元祖もつ鍋 楽天地 天神総本店",cat:"nabe",area:"天神",lat:33.5908,lng:130.4010,price:"¥¥",desc:"開業約 50 年的牛腸鍋專賣店，韭菜高麗菜堆成小山，最後加麵收尾。",tip:"店很大，兩個人臨時去通常也有位子。"},
 {id:"fk-nagano",city:"fukuoka",name:"水炊鍋 長野",jp:"水たき長野",cat:"nabe",area:"博多・対馬小路",lat:33.5985,lng:130.4108,price:"¥¥",desc:"老字號雞肉水炊鍋，先喝一口白濁雞湯再開始吃肉，冬天特別適合。",tip:"人氣很高，建議先預約。"},
 {id:"fk-mentaiju",city:"fukuoka",name:"元祖博多明太重",jp:"元祖博多めんたい重",cat:"washoku",area:"中洲",lat:33.5918,lng:130.4035,price:"¥¥",desc:"一整條明太子鋪在白飯上的「明太重」，日本第一間明太子料理專賣店。",tip:"早上就開門，早餐時段排隊比較短。"},
 {id:"fk-yoshizuka",city:"fukuoka",name:"吉塚鰻魚屋",jp:"吉塚うなぎ屋",cat:"washoku",area:"中洲",lat:33.5937,lng:130.4062,price:"¥¥¥",desc:"百年鰻魚老舖，醬汁甜香，鰻魚飯份量很實在。",tip:"適合安排一頓吃好一點的約會晚餐。"},
 {id:"fk-yatai",city:"fukuoka",name:"中洲屋台街",jp:"中洲屋台",cat:"night",area:"中洲・那珂川旁",lat:33.5912,lng:130.4050,price:"¥¥",desc:"傍晚後沿著那珂川出現的路邊攤，拉麵、關東煮、烤串都有，福岡最有氣氛的夜晚。",tip:"大約 18 點後陸續開，天候不佳可能休息。一攤坐一下就換下一攤。"},
 {id:"fk-tetsunabe",city:"fukuoka",name:"博多祇園 鐵鍋煎餃",jp:"博多祇園鉄なべ",cat:"night",area:"祇園",lat:33.5925,lng:130.4125,price:"¥",desc:"整個鐵鍋端上桌的一口煎餃，皮脆一口一個，配啤酒剛好。",tip:"小店座位不多，晚餐尖峰可能要等。"},
 {id:"fk-yanagibashi",city:"fukuoka",name:"柳橋連合市場",jp:"柳橋連合市場",cat:"market",area:"渡邊通",lat:33.5862,lng:130.4048,price:"¥¥",desc:"被稱為「博多的廚房」的小市場，有海鮮丼和現炸魚板。",tip:"早上到中午最熱鬧，週日很多店休息。"},
 {id:"fk-suzukake",city:"fukuoka",name:"鈴懸 本店",jp:"鈴懸 本店",cat:"sweet",area:"上川端",lat:33.5938,lng:130.4078,price:"¥¥",desc:"福岡人送禮常選的和菓子老舖，鈴鐺造型的「鈴乃最中」很可愛。",tip:"可以買回台灣當伴手禮。"},
 // 大阪
 {id:"os-kukuru",city:"osaka",name:"章魚燒 道頓堀くくる 本店",jp:"道頓堀くくる 本店",cat:"kona",area:"道頓堀",lat:34.6687,lng:135.5027,price:"¥",desc:"章魚塊很大，內餡軟嫩濃郁。8 顆大約 800–960 日圓。",tip:"旁邊就是道頓堀運河，邊走邊吃很方便。"},
 {id:"os-wanaka",city:"osaka",name:"章魚燒 わなか 千日前本店",jp:"たこ焼道楽 わなか 千日前本店",cat:"kona",area:"千日前",lat:34.6652,lng:135.5032,price:"¥",desc:"外皮酥脆、中心像奶油一樣滑順，8 顆大約 650 日圓。",tip:"可以和くくる各買一盒比較看看兩人喜歡哪家。"},
 {id:"os-mizuno",city:"osaka",name:"美津の 大阪燒",jp:"美津の",cat:"kona",area:"道頓堀",lat:34.6686,lng:135.5013,price:"¥¥",desc:"米其林必比登推薦的大阪燒老店，招牌山藥燒口感很鬆軟。",tip:"排隊很長，盡量開店前或下午去。"},
 {id:"os-kiji",city:"osaka",name:"きじ 大阪燒（梅田藍天大廈）",jp:"お好み焼き きじ 梅田スカイビル",cat:"kona",area:"梅田",lat:34.7053,lng:135.4903,price:"¥",desc:"藏在梅田藍天大廈地下美食街的懷舊大阪燒，老闆很親切。",tip:"可以和空中庭園展望台排在同一天，看完夜景再吃。"},
 {id:"os-daruma",city:"osaka",name:"串炸だるま 新世界總本店",jp:"串かつだるま 新世界総本店",cat:"kushi",area:"新世界",lat:34.6522,lng:135.5060,price:"¥¥",desc:"大阪串炸的代表店，醬汁大家共用，所以規矩是「禁止沾兩次」。",tip:"高麗菜免費吃到飽，可以用高麗菜舀醬。"},
 {id:"os-yaekatsu",city:"osaka",name:"八重勝",jp:"八重勝",cat:"kushi",area:"新世界・ジャンジャン橫丁",lat:34.6500,lng:135.5056,price:"¥",desc:"在地人也排隊的串炸老店，麵衣薄脆，土手燒（味噌燉牛筋）也很推。",tip:"吧台座位，翻桌快，排隊通常不會太久。"},
 {id:"os-kuromon",city:"osaka",name:"黑門市場",jp:"黒門市場",cat:"market",area:"日本橋",lat:34.6658,lng:135.5067,price:"¥¥",desc:"兩百年歷史的「大阪人的廚房」，生蠔、海鮮、和牛串、水果都能現買現吃。",tip:"很多店傍晚就收，建議白天去。"},
 {id:"os-jiyuken",city:"osaka",name:"自由軒 難波本店",jp:"自由軒 難波本店",cat:"yoshoku",area:"難波",lat:34.6662,lng:135.5028,price:"¥",desc:"1910 年創業，咖哩和飯先拌好、中間打一顆生蛋的「名物咖哩」。",tip:"桌上的醬汁淋一點會更好吃。"},
 {id:"os-hokkyokusei",city:"osaka",name:"北極星 心齋橋本店",jp:"北極星 心斎橋本店",cat:"yoshoku",area:"心齋橋",lat:34.6718,lng:135.4990,price:"¥¥",desc:"號稱蛋包飯發源店，在老宅裡吃，日式座位很有氣氛。",tip:"逛心齋橋逛累了正好來吃午餐。"},
 {id:"os-kinryu",city:"osaka",name:"金龍拉麵 道頓堀店",jp:"金龍ラーメン 道頓堀店",cat:"ramen",area:"道頓堀",lat:34.6689,lng:135.5020,price:"¥",desc:"招牌巨龍很好認，泡菜、韭菜、蒜泥免費自己加。",tip:"宵夜時段的好選擇。"},
 {id:"os-rikuro",city:"osaka",name:"老爺爺起司蛋糕 難波本店",jp:"りくろーおじさんの店 なんば本店",cat:"sweet",area:"難波",lat:34.6655,lng:135.5013,price:"¥",desc:"剛出爐會烙上大叔印記的輕乳酪蛋糕，鬆軟到會晃。",tip:"剛出爐時店員會搖鈴，可以等熱的。"},
 {id:"os-chitose",city:"osaka",name:"千とせ 肉吸",jp:"千とせ 本店",cat:"washoku",area:"難波千日前",lat:34.6643,lng:135.5036,price:"¥",desc:"「肉吸」的發源店：不加麵的牛肉烏龍湯，配一碗生蛋拌飯。",tip:"份量不大，很適合當逛街中間的小吃。"},
 {id:"os-kanidoraku",city:"osaka",name:"蟹道樂 道頓堀本店",jp:"かに道楽 道頓堀本店",cat:"washoku",area:"道頓堀",lat:34.6688,lng:135.5030,price:"¥¥¥",desc:"會動的大螃蟹招牌，螃蟹套餐適合兩人吃一頓好的。",tip:"晚餐建議先預約。"},
 // 京都
 {id:"ky-nishiki",city:"kyoto",name:"錦市場",jp:"錦市場",cat:"market",area:"四條河原町",lat:35.0050,lng:135.7648,price:"¥",desc:"約 400 公尺、140 多家店的「京都的廚房」，玉子燒、豆乳甜甜圈、醃漬物一攤接一攤吃。",tip:"多數店大約 10 點到 17 點營業，太早或太晚都會撲空。在店門口吃完再走。"},
 {id:"ky-daiichiasahi",city:"kyoto",name:"本家第一旭 たかばし本店",jp:"本家 第一旭 たかばし本店",cat:"ramen",area:"京都站",lat:34.9862,lng:135.7628,price:"¥",desc:"醬油豚骨湯頭配大量蔥花，早上就開，離京都站很近。",tip:"隔壁的新福菜館也很有名，可以二選一。"},
 {id:"ky-inoichi",city:"kyoto",name:"麵屋 猪一",jp:"麺屋 猪一",cat:"ramen",area:"四條河原町",lat:35.0039,lng:135.7671,price:"¥¥",desc:"米其林必比登推薦的高湯系拉麵，清澈湯頭很細緻。",tip:"和錦市場在同一區，可以排在一起。"},
 {id:"ky-junsei",city:"kyoto",name:"南禪寺 順正 湯豆腐",jp:"南禅寺 順正",cat:"washoku",area:"南禪寺",lat:35.0105,lng:135.7905,price:"¥¥¥",desc:"在庭園裡吃湯豆腐會席，適合放慢步調的約會午餐。",tip:"吃完走去南禪寺水路閣拍照。"},
 {id:"ky-endo",city:"kyoto",name:"祇園 天婦羅 八坂圓堂",jp:"八坂圓堂",cat:"washoku",area:"東山",lat:34.9993,lng:135.7792,price:"¥¥¥",desc:"京都風天婦羅老舖，用京野菜炸得清爽，午餐套餐比較好入手。",tip:"建議預約。"},
 {id:"ky-kaneyo",city:"kyoto",name:"京極かねよ 鰻魚飯",jp:"京極かねよ",cat:"washoku",area:"新京極",lat:35.0068,lng:135.7685,price:"¥¥",desc:"鰻魚飯上蓋一大片厚玉子燒的「錦糸丼」，京都才有的吃法。",tip:"大正時代的老建築，門口很好拍。"},
 {id:"ky-tsujiri",city:"kyoto",name:"祇園辻利 本店",jp:"祇園辻利 祇園本店",cat:"sweet",area:"祇園",lat:35.0037,lng:135.7743,price:"¥",desc:"宇治茶老舖，抹茶霜淇淋濃到微苦。",tip:"逛祇園、花見小路時順路。"},
 {id:"ky-tsujiri-saryo",city:"kyoto",name:"茶寮都路里 祇園本店",jp:"茶寮都路里 祇園本店",cat:"sweet",area:"祇園",lat:35.0036,lng:135.7738,price:"¥¥",desc:"抹茶聖代名店，配料一層一層，很適合兩人分一份。",tip:"假日下午排隊較長。"},
 {id:"ky-futaba",city:"kyoto",name:"出町ふたば 豆餅",jp:"出町ふたば",cat:"sweet",area:"出町柳",lat:35.0297,lng:135.7702,price:"¥",desc:"名物豆餅：Q 軟麻糬包紅豆餡和鹹香豌豆，常大排長龍。",tip:"當天吃完最好吃，買了可以去旁邊鴨川三角洲坐著吃。"},
 {id:"ky-arabica",city:"kyoto",name:"% Arabica 京都東山",jp:"% ARABICA 京都 東山",cat:"sweet",area:"東山・八坂塔",lat:34.9985,lng:135.7795,price:"¥",desc:"八坂通上的人氣咖啡，拿鐵配古都街景很好拍。",tip:"和清水寺、二年坂排在同一個早上。"},
 {id:"ky-hirokawa",city:"kyoto",name:"嵐山 廣川 鰻魚飯",jp:"うなぎ 廣川",cat:"washoku",area:"嵐山",lat:35.0158,lng:135.6758,price:"¥¥¥",desc:"嵐山知名鰻魚飯，炭火炙烤，外皮香脆、肉質軟嫩。",tip:"一定要先預約，排嵐山那天的午餐剛好。"},
 {id:"ky-nezameya",city:"kyoto",name:"祢ざめ家 豆皮壽司",jp:"祢ざめ家",cat:"washoku",area:"伏見稻荷",lat:34.9670,lng:135.7712,price:"¥",desc:"稻荷參道上的老店，豆皮壽司和豆皮烏龍麵，爬完千本鳥居剛好吃。",tip:"份量小，可以多點一兩樣分著吃。"},
 {id:"ky-pontocho",city:"kyoto",name:"先斗町",jp:"先斗町",cat:"night",area:"鴨川旁",lat:35.0055,lng:135.7710,price:"¥¥",desc:"鴨川旁的窄石板巷，晚上燈籠亮起來很浪漫，小酒館和串燒店很多。",tip:"夏天（約 5–9 月）有臨河的「川床」座位。"}
];


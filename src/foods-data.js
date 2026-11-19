// 自動生成：日本食品標準成分表（八訂）増補2023年（文部科学省, 2026年3月27日更新Excel）から転記。
// per100g は「可食部100gあたり」。単位 kcal / g。estimatedValue=true は表で( )付きの推定値。
// state: raw=調理前の重量で量る / cooked=調理後の重量で量る / as_sold=売っている状態のまま
// allergens はアプリが料理の一般的な材料から付けた目安。市販品・学食の実際の原材料とは違うことがある。
export const FOODS = [
  {
    "id": "rice_cooked",
    "code": "01088",
    "name": "ごはん（精白米・炊いた後）",
    "officialName": "こめ ［水稲めし］ 精白米 うるち米",
    "state": "cooked",
    "allergens": [],
    "per100g": {
      "kcal": 156.0,
      "protein": 2.5,
      "fat": 0.3,
      "carb": 37.1
    },
    "estimatedValue": false
  },
  {
    "id": "rice_raw",
    "code": "01083",
    "name": "精白米（炊く前の生米）",
    "officialName": "こめ ［水稲穀粒］ 精白米 うるち米",
    "state": "raw",
    "allergens": [],
    "per100g": {
      "kcal": 342.0,
      "protein": 6.1,
      "fat": 0.9,
      "carb": 77.6
    },
    "estimatedValue": false
  },
  {
    "id": "bread",
    "code": "01026",
    "name": "食パン",
    "officialName": "こむぎ ［パン類］ 角形食パン 食パン",
    "state": "as_sold",
    "allergens": [
      "小麦",
      "乳"
    ],
    "per100g": {
      "kcal": 248.0,
      "protein": 8.9,
      "fat": 4.1,
      "carb": 46.4
    },
    "estimatedValue": false
  },
  {
    "id": "udon_boiled",
    "code": "01039",
    "name": "うどん（ゆで）",
    "officialName": "こむぎ ［うどん・そうめん類］ うどん ゆで",
    "state": "cooked",
    "allergens": [
      "小麦"
    ],
    "per100g": {
      "kcal": 95.0,
      "protein": 2.6,
      "fat": 0.4,
      "carb": 21.6
    },
    "estimatedValue": false
  },
  {
    "id": "pasta_boiled",
    "code": "01064",
    "name": "スパゲッティ（ゆで）",
    "officialName": "こむぎ ［マカロニ・スパゲッティ類］ マカロニ・スパゲッティ ゆで",
    "state": "cooked",
    "allergens": [
      "小麦"
    ],
    "per100g": {
      "kcal": 150.0,
      "protein": 5.8,
      "fat": 0.9,
      "carb": 32.2
    },
    "estimatedValue": false
  },
  {
    "id": "soba_boiled",
    "code": "01128",
    "name": "そば（ゆで）",
    "officialName": "そば そば ゆで",
    "state": "cooked",
    "allergens": [
      "そば",
      "小麦"
    ],
    "per100g": {
      "kcal": 130.0,
      "protein": 4.8,
      "fat": 1.0,
      "carb": 26.0
    },
    "estimatedValue": false
  },
  {
    "id": "oatmeal",
    "code": "01004",
    "name": "オートミール",
    "officialName": "えんばく オートミール",
    "state": "raw",
    "allergens": [],
    "per100g": {
      "kcal": 350.0,
      "protein": 13.7,
      "fat": 5.7,
      "carb": 69.1
    },
    "estimatedValue": false
  },
  {
    "id": "egg_raw",
    "code": "12004",
    "name": "鶏卵（生）",
    "officialName": "鶏卵 全卵 生",
    "state": "raw",
    "allergens": [
      "卵"
    ],
    "per100g": {
      "kcal": 142.0,
      "protein": 12.2,
      "fat": 10.2,
      "carb": 0.4
    },
    "estimatedValue": false
  },
  {
    "id": "egg_boiled",
    "code": "12005",
    "name": "ゆで卵",
    "officialName": "鶏卵 全卵 ゆで",
    "state": "cooked",
    "allergens": [
      "卵"
    ],
    "per100g": {
      "kcal": 134.0,
      "protein": 12.5,
      "fat": 10.4,
      "carb": 0.3
    },
    "estimatedValue": false
  },
  {
    "id": "chicken_breast_raw",
    "code": "11220",
    "name": "鶏むね肉 皮なし（生）",
    "officialName": "＜鳥肉類＞ にわとり ［若どり・主品目］ むね 皮なし 生",
    "state": "raw",
    "allergens": [
      "鶏肉"
    ],
    "per100g": {
      "kcal": 105.0,
      "protein": 23.3,
      "fat": 1.9,
      "carb": 0.1
    },
    "estimatedValue": false
  },
  {
    "id": "chicken_breast_grilled",
    "code": "11288",
    "name": "鶏むね肉 皮なし（焼き）",
    "officialName": "＜鳥肉類＞ にわとり ［若どり・主品目］ むね 皮なし 焼き",
    "state": "cooked",
    "allergens": [
      "鶏肉"
    ],
    "per100g": {
      "kcal": 177.0,
      "protein": 38.8,
      "fat": 3.3,
      "carb": 0.1
    },
    "estimatedValue": false
  },
  {
    "id": "chicken_thigh_raw",
    "code": "11221",
    "name": "鶏もも肉 皮つき（生）",
    "officialName": "＜鳥肉類＞ にわとり ［若どり・主品目］ もも 皮つき 生",
    "state": "raw",
    "allergens": [
      "鶏肉"
    ],
    "per100g": {
      "kcal": 190.0,
      "protein": 16.6,
      "fat": 14.2,
      "carb": 0.0
    },
    "estimatedValue": false
  },
  {
    "id": "sasami_raw",
    "code": "11227",
    "name": "ささみ（生）",
    "officialName": "＜鳥肉類＞ にわとり ［若どり・副品目］ ささみ 生",
    "state": "raw",
    "allergens": [
      "鶏肉"
    ],
    "per100g": {
      "kcal": 98.0,
      "protein": 23.9,
      "fat": 0.8,
      "carb": 0.1
    },
    "estimatedValue": false
  },
  {
    "id": "chicken_mince_raw",
    "code": "11230",
    "name": "鶏ひき肉（生）",
    "officialName": "＜鳥肉類＞ にわとり ［二次品目］ ひき肉 生",
    "state": "raw",
    "allergens": [
      "鶏肉"
    ],
    "per100g": {
      "kcal": 171.0,
      "protein": 17.5,
      "fat": 12.0,
      "carb": 0.0
    },
    "estimatedValue": false
  },
  {
    "id": "pork_leg_raw",
    "code": "11131",
    "name": "豚もも肉 皮下脂肪なし（生）",
    "officialName": "＜畜肉類＞ ぶた ［大型種肉］ もも 皮下脂肪なし 生",
    "state": "raw",
    "allergens": [
      "豚肉"
    ],
    "per100g": {
      "kcal": 138.0,
      "protein": 21.5,
      "fat": 6.0,
      "carb": 0.2
    },
    "estimatedValue": false
  },
  {
    "id": "pork_mince_raw",
    "code": "11163",
    "name": "豚ひき肉（生）",
    "officialName": "＜畜肉類＞ ぶた ［ひき肉］ 生",
    "state": "raw",
    "allergens": [
      "豚肉"
    ],
    "per100g": {
      "kcal": 209.0,
      "protein": 17.7,
      "fat": 17.2,
      "carb": 0.1
    },
    "estimatedValue": false
  },
  {
    "id": "beef_leg_raw",
    "code": "11077",
    "name": "輸入牛もも 赤肉（生）",
    "officialName": "＜畜肉類＞ うし ［輸入牛肉］ もも 赤肉 生",
    "state": "raw",
    "allergens": [
      "牛肉"
    ],
    "per100g": {
      "kcal": 117.0,
      "protein": 21.2,
      "fat": 4.3,
      "carb": 0.4
    },
    "estimatedValue": false
  },
  {
    "id": "tofu_firm",
    "code": "04032",
    "name": "木綿豆腐",
    "officialName": "だいず ［豆腐・油揚げ類］ 木綿豆腐",
    "state": "as_sold",
    "allergens": [
      "大豆"
    ],
    "per100g": {
      "kcal": 73.0,
      "protein": 7.0,
      "fat": 4.9,
      "carb": 1.5
    },
    "estimatedValue": false
  },
  {
    "id": "tofu_silken",
    "code": "04033",
    "name": "絹ごし豆腐",
    "officialName": "だいず ［豆腐・油揚げ類］ 絹ごし豆腐",
    "state": "as_sold",
    "allergens": [
      "大豆"
    ],
    "per100g": {
      "kcal": 56.0,
      "protein": 5.3,
      "fat": 3.5,
      "carb": 2.0
    },
    "estimatedValue": false
  },
  {
    "id": "natto",
    "code": "04046",
    "name": "納豆",
    "officialName": "だいず ［納豆類］ 糸引き納豆",
    "state": "as_sold",
    "allergens": [
      "大豆"
    ],
    "per100g": {
      "kcal": 184.0,
      "protein": 16.5,
      "fat": 10.0,
      "carb": 12.1
    },
    "estimatedValue": false
  },
  {
    "id": "soymilk",
    "code": "04052",
    "name": "豆乳",
    "officialName": "だいず ［その他］ 豆乳 豆乳",
    "state": "as_sold",
    "allergens": [
      "大豆"
    ],
    "per100g": {
      "kcal": 43.0,
      "protein": 3.6,
      "fat": 2.8,
      "carb": 2.3
    },
    "estimatedValue": false
  },
  {
    "id": "milk",
    "code": "13003",
    "name": "牛乳",
    "officialName": "＜牛乳及び乳製品＞ （液状乳類） 普通牛乳",
    "state": "as_sold",
    "allergens": [
      "乳"
    ],
    "per100g": {
      "kcal": 61.0,
      "protein": 3.3,
      "fat": 3.8,
      "carb": 4.8
    },
    "estimatedValue": false
  },
  {
    "id": "yogurt_plain",
    "code": "13025",
    "name": "ヨーグルト（無糖）",
    "officialName": "＜牛乳及び乳製品＞ （発酵乳・乳酸菌飲料） ヨーグルト 全脂無糖",
    "state": "as_sold",
    "allergens": [
      "乳"
    ],
    "per100g": {
      "kcal": 56.0,
      "protein": 3.6,
      "fat": 3.0,
      "carb": 4.9
    },
    "estimatedValue": false
  },
  {
    "id": "cheese_process",
    "code": "13040",
    "name": "プロセスチーズ",
    "officialName": "＜牛乳及び乳製品＞ （チーズ類） プロセスチーズ",
    "state": "as_sold",
    "allergens": [
      "乳"
    ],
    "per100g": {
      "kcal": 313.0,
      "protein": 22.7,
      "fat": 26.0,
      "carb": 1.3
    },
    "estimatedValue": false
  },
  {
    "id": "tuna_can_water",
    "code": "10260",
    "name": "ツナ缶（水煮・ライト）",
    "officialName": "＜魚類＞ （まぐろ類） 缶詰 水煮 フレーク ライト",
    "state": "as_sold",
    "allergens": [],
    "per100g": {
      "kcal": 70.0,
      "protein": 16.0,
      "fat": 0.7,
      "carb": 0.2
    },
    "estimatedValue": false
  },
  {
    "id": "saba_can_water",
    "code": "10164",
    "name": "さば缶（水煮）",
    "officialName": "＜魚類＞ （さば類） 缶詰 水煮",
    "state": "as_sold",
    "allergens": [
      "さば"
    ],
    "per100g": {
      "kcal": 174.0,
      "protein": 20.9,
      "fat": 10.7,
      "carb": 0.2
    },
    "estimatedValue": false
  },
  {
    "id": "salmon_raw",
    "code": "10134",
    "name": "鮭（しろさけ・生）",
    "officialName": "＜魚類＞ （さけ・ます類） しろさけ 生",
    "state": "raw",
    "allergens": [
      "さけ"
    ],
    "per100g": {
      "kcal": 124.0,
      "protein": 22.3,
      "fat": 4.1,
      "carb": 0.1
    },
    "estimatedValue": false
  },
  {
    "id": "salmon_salted",
    "code": "10139",
    "name": "塩ざけ",
    "officialName": "＜魚類＞ （さけ・ます類） しろさけ 塩ざけ",
    "state": "raw",
    "allergens": [
      "さけ"
    ],
    "per100g": {
      "kcal": 183.0,
      "protein": 22.4,
      "fat": 11.1,
      "carb": 0.1
    },
    "estimatedValue": false
  },
  {
    "id": "fish_sausage",
    "code": "10388",
    "name": "魚肉ソーセージ",
    "officialName": "＜水産練り製品＞ 魚肉ソーセージ",
    "state": "as_sold",
    "allergens": [],
    "per100g": {
      "kcal": 158.0,
      "protein": 11.5,
      "fat": 7.2,
      "carb": 12.6
    },
    "estimatedValue": false
  },
  {
    "id": "chikuwa",
    "code": "10381",
    "name": "焼き竹輪",
    "officialName": "＜水産練り製品＞ 焼き竹輪",
    "state": "as_sold",
    "allergens": [],
    "per100g": {
      "kcal": 107.0,
      "protein": 13.2,
      "fat": 0.4,
      "carb": 13.3
    },
    "estimatedValue": false
  },
  {
    "id": "ham",
    "code": "11176",
    "name": "ロースハム",
    "officialName": "＜畜肉類＞ ぶた ［ハム類］ ロースハム ロースハム",
    "state": "as_sold",
    "allergens": [
      "豚肉"
    ],
    "per100g": {
      "kcal": 211.0,
      "protein": 18.6,
      "fat": 14.5,
      "carb": 2.0
    },
    "estimatedValue": false
  },
  {
    "id": "yakitori_can",
    "code": "11237",
    "name": "焼き鳥缶詰",
    "officialName": "＜鳥肉類＞ にわとり ［その他］ 焼き鳥缶詰",
    "state": "as_sold",
    "allergens": [
      "鶏肉"
    ],
    "per100g": {
      "kcal": 173.0,
      "protein": 18.4,
      "fat": 7.8,
      "carb": 8.2
    },
    "estimatedValue": false
  },
  {
    "id": "banana",
    "code": "07107",
    "name": "バナナ",
    "officialName": "バナナ 生",
    "state": "raw",
    "allergens": [
      "バナナ"
    ],
    "per100g": {
      "kcal": 93.0,
      "protein": 1.1,
      "fat": 0.2,
      "carb": 22.5
    },
    "estimatedValue": false
  },
  {
    "id": "apple",
    "code": "07148",
    "name": "りんご（皮なし）",
    "officialName": "りんご 皮なし 生",
    "state": "raw",
    "allergens": [
      "りんご"
    ],
    "per100g": {
      "kcal": 53.0,
      "protein": 0.1,
      "fat": 0.2,
      "carb": 15.5
    },
    "estimatedValue": false
  },
  {
    "id": "broccoli_boiled",
    "code": "06264",
    "name": "ブロッコリー（ゆで）",
    "officialName": "ブロッコリー 花序 ゆで",
    "state": "cooked",
    "allergens": [],
    "per100g": {
      "kcal": 30.0,
      "protein": 3.9,
      "fat": 0.4,
      "carb": 5.2
    },
    "estimatedValue": false
  },
  {
    "id": "cabbage_raw",
    "code": "06061",
    "name": "キャベツ（生）",
    "officialName": "（キャベツ類） キャベツ 結球葉 生",
    "state": "raw",
    "allergens": [],
    "per100g": {
      "kcal": 23.0,
      "protein": 1.2,
      "fat": 0.1,
      "carb": 5.2
    },
    "estimatedValue": false
  },
  {
    "id": "moyashi_raw",
    "code": "06291",
    "name": "もやし（緑豆・生）",
    "officialName": "（もやし類） りょくとうもやし 生",
    "state": "raw",
    "allergens": [],
    "per100g": {
      "kcal": 15.0,
      "protein": 1.8,
      "fat": 0.1,
      "carb": 2.4
    },
    "estimatedValue": false
  },
  {
    "id": "tomato",
    "code": "06182",
    "name": "トマト（生）",
    "officialName": "（トマト類） 赤色トマト 果実 生",
    "state": "raw",
    "allergens": [],
    "per100g": {
      "kcal": 20.0,
      "protein": 0.7,
      "fat": 0.1,
      "carb": 4.7
    },
    "estimatedValue": false
  },
  {
    "id": "onion_raw",
    "code": "06153",
    "name": "たまねぎ（生）",
    "officialName": "（たまねぎ類） たまねぎ りん茎 生",
    "state": "raw",
    "allergens": [],
    "per100g": {
      "kcal": 33.0,
      "protein": 1.0,
      "fat": 0.1,
      "carb": 8.4
    },
    "estimatedValue": false
  },
  {
    "id": "mixveg_frozen",
    "code": "06382",
    "name": "ミックスベジタブル（冷凍）",
    "officialName": "（その他） ミックスベジタブル 冷凍",
    "state": "as_sold",
    "allergens": [],
    "per100g": {
      "kcal": 67.0,
      "protein": 3.0,
      "fat": 0.7,
      "carb": 15.1
    },
    "estimatedValue": false
  },
  {
    "id": "shimeji_raw",
    "code": "08016",
    "name": "ぶなしめじ（生）",
    "officialName": "（しめじ類） ぶなしめじ 生",
    "state": "raw",
    "allergens": [],
    "per100g": {
      "kcal": 26.0,
      "protein": 2.7,
      "fat": 0.5,
      "carb": 4.8
    },
    "estimatedValue": false
  },
  {
    "id": "oil",
    "code": "14006",
    "name": "サラダ油（調合油）",
    "officialName": "（植物油脂類） 調合油",
    "state": "as_sold",
    "allergens": [],
    "per100g": {
      "kcal": 886.0,
      "protein": 0.0,
      "fat": 100.0,
      "carb": 0.0
    },
    "estimatedValue": false
  },
  {
    "id": "miso",
    "code": "17045",
    "name": "みそ（淡色辛みそ）",
    "officialName": "＜調味料類＞ （みそ類） 米みそ 淡色辛みそ",
    "state": "as_sold",
    "allergens": [
      "大豆"
    ],
    "per100g": {
      "kcal": 182.0,
      "protein": 12.5,
      "fat": 6.0,
      "carb": 21.9
    },
    "estimatedValue": false
  },
  {
    "id": "pasta_dry",
    "code": "01063",
    "name": "スパゲッティ（乾麺・ゆでる前）",
    "officialName": "こむぎ ［マカロニ・スパゲッティ類］ マカロニ・スパゲッティ 乾",
    "state": "raw",
    "allergens": [
      "小麦"
    ],
    "per100g": {
      "kcal": 347.0,
      "protein": 12.9,
      "fat": 1.8,
      "carb": 73.1
    },
    "estimatedValue": false
  },
  {
    "id": "carrot_raw",
    "code": "06214",
    "name": "にんじん（皮なし・生）",
    "officialName": "（にんじん類） にんじん 根 皮なし 生",
    "state": "raw",
    "allergens": [],
    "per100g": {
      "kcal": 32.0,
      "protein": 0.7,
      "fat": 0.2,
      "carb": 8.8
    },
    "estimatedValue": false
  },
  {
    "id": "tomato_can",
    "code": "06184",
    "name": "トマト缶（ホール・食塩無添加）",
    "officialName": "（トマト類） 加工品 ホール 食塩無添加",
    "state": "as_sold",
    "allergens": [],
    "per100g": {
      "kcal": 21.0,
      "protein": 0.9,
      "fat": 0.2,
      "carb": 4.4
    },
    "estimatedValue": false
  },
  {
    "id": "spinach_frozen",
    "code": "06372",
    "name": "冷凍ほうれんそう（ゆで）",
    "officialName": "ほうれんそう 葉 冷凍 ゆで",
    "state": "cooked",
    "allergens": [],
    "per100g": {
      "kcal": 26.0,
      "protein": 3.7,
      "fat": 0.5,
      "carb": 4.3
    },
    "estimatedValue": false
  },
  {
    "id": "ketchup",
    "code": "17036",
    "name": "トマトケチャップ",
    "officialName": "＜調味料類＞ （トマト加工品類） トマトケチャップ",
    "state": "as_sold",
    "allergens": [],
    "per100g": {
      "kcal": 116.0,
      "protein": 1.6,
      "fat": 0.2,
      "carb": 27.6
    },
    "estimatedValue": false
  },
  {
    "id": "curry_roux",
    "code": "17051",
    "name": "カレールウ",
    "officialName": "＜調味料類＞ （ルウ類） カレールウ",
    "state": "as_sold",
    "allergens": [
      "小麦",
      "乳"
    ],
    "per100g": {
      "kcal": 474.0,
      "protein": 6.5,
      "fat": 34.1,
      "carb": 44.7
    },
    "estimatedValue": false
  },
  {
    "id": "oyakodon_topping",
    "code": "18030",
    "name": "親子丼の具",
    "officialName": "和風料理 煮物類 親子丼の具",
    "state": "cooked",
    "allergens": [
      "鶏肉",
      "卵",
      "小麦",
      "大豆"
    ],
    "per100g": {
      "kcal": 101.0,
      "protein": 8.4,
      "fat": 5.2,
      "carb": 5.6
    },
    "estimatedValue": true
  },
  {
    "id": "gyudon_topping",
    "code": "18031",
    "name": "牛丼の具",
    "officialName": "和風料理 煮物類 牛飯の具",
    "state": "cooked",
    "allergens": [
      "牛肉",
      "小麦",
      "大豆"
    ],
    "per100g": {
      "kcal": 122.0,
      "protein": 4.1,
      "fat": 9.4,
      "carb": 6.4
    },
    "estimatedValue": true
  },
  {
    "id": "chicken_curry",
    "code": "18040",
    "name": "チキンカレー（ルウ部分）",
    "officialName": "洋風料理 カレー類 チキンカレー",
    "state": "cooked",
    "allergens": [
      "鶏肉",
      "小麦",
      "乳"
    ],
    "per100g": {
      "kcal": 131.0,
      "protein": 5.6,
      "fat": 8.8,
      "carb": 8.4
    },
    "estimatedValue": true
  },
  {
    "id": "karaage",
    "code": "18054",
    "name": "鶏のから揚げ",
    "officialName": "和風料理 その他 とりから揚げ",
    "state": "cooked",
    "allergens": [
      "鶏肉",
      "小麦",
      "大豆"
    ],
    "per100g": {
      "kcal": 204.0,
      "protein": 15.6,
      "fat": 10.1,
      "carb": 16.1
    },
    "estimatedValue": false
  },
  {
    "id": "mapo_tofu",
    "code": "18049",
    "name": "麻婆豆腐",
    "officialName": "中国料理 菜類 麻婆豆腐",
    "state": "cooked",
    "allergens": [
      "大豆",
      "豚肉",
      "小麦"
    ],
    "per100g": {
      "kcal": 104.0,
      "protein": 7.8,
      "fat": 6.8,
      "carb": 3.8
    },
    "estimatedValue": true
  },
  {
    "id": "chicken_hamburg",
    "code": "18051",
    "name": "チキンハンバーグ",
    "officialName": "洋風料理 ハンバーグステーキ類 チキンハンバーグ",
    "state": "cooked",
    "allergens": [
      "鶏肉",
      "小麦",
      "卵"
    ],
    "per100g": {
      "kcal": 171.0,
      "protein": 12.6,
      "fat": 10.2,
      "carb": 8.5
    },
    "estimatedValue": true
  },
  {
    "id": "fried_rice",
    "code": "18057",
    "name": "チャーハン",
    "officialName": "中国料理 菜類 チャーハン",
    "state": "cooked",
    "allergens": [
      "卵",
      "豚肉",
      "小麦",
      "大豆"
    ],
    "per100g": {
      "kcal": 206.0,
      "protein": 5.0,
      "fat": 5.2,
      "carb": 33.3
    },
    "estimatedValue": false
  },
  {
    "id": "tonjiru",
    "code": "18028",
    "name": "豚汁",
    "officialName": "和風料理 汁物類 とん汁",
    "state": "cooked",
    "allergens": [
      "豚肉",
      "大豆"
    ],
    "per100g": {
      "kcal": 26.0,
      "protein": 1.5,
      "fat": 1.5,
      "carb": 2.0
    },
    "estimatedValue": true
  },
  {
    "id": "happosai",
    "code": "18048",
    "name": "八宝菜",
    "officialName": "中国料理 菜類 八宝菜",
    "state": "cooked",
    "allergens": [
      "豚肉",
      "えび",
      "いか",
      "小麦",
      "大豆"
    ],
    "per100g": {
      "kcal": 64.0,
      "protein": 5.8,
      "fat": 3.2,
      "carb": 3.8
    },
    "estimatedValue": true
  },
  {
    "id": "namul",
    "code": "18039",
    "name": "もやしのナムル",
    "officialName": "韓国料理 和え物類 もやしのナムル",
    "state": "cooked",
    "allergens": [
      "ごま"
    ],
    "per100g": {
      "kcal": 70.0,
      "protein": 3.1,
      "fat": 4.5,
      "carb": 5.7
    },
    "estimatedValue": true
  },
  {
    "id": "nikujaga",
    "code": "18036",
    "name": "肉じゃが",
    "officialName": "和風料理 煮物類 肉じゃが",
    "state": "cooked",
    "allergens": [
      "牛肉",
      "小麦",
      "大豆"
    ],
    "per100g": {
      "kcal": 78.0,
      "protein": 4.3,
      "fat": 1.3,
      "carb": 13.0
    },
    "estimatedValue": true
  }
];

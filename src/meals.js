// 食事候補（ルールベース）。栄養は成分表の値 × 分量で計算し、価格はアプリの仮定値。
import { FOOD_BY_ID, mealNutrients, addNutrients, dayTotals, zeroNutrients } from './nutrition.js';

export const PLACES = { cook: '自炊', cafeteria: '学食', conveni: 'コンビニ' };
/** 最初からある場所。自分で場所を足すこともできる（state.placesCustom） */
export const BUILTIN_PLACES = Object.entries(PLACES).map(([id, name]) => ({ id, name, kind: id, builtin: true }));
export const PLACE_KINDS = {
  cook: '自炊',
  cafeteria: '学食・社食',
  conveni: 'コンビニ',
  eatout: '外食（チェーン店・定食屋など）',
  super: 'スーパー・惣菜',
  other: 'その他（実家・バイト先のまかないなど）',
};
/** 原材料を自分で確かめにくい種類の場所 */
export const KIND_NEEDS_CHECK = new Set(['cafeteria', 'conveni', 'eatout', 'super']);
export const SLOTS = { breakfast: '朝', lunch: '昼', dinner: '夕', snack: '間食' };
export const SLOT_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'];

const f = (foodId, grams, display) => ({ basis: 'food', foodId, grams, display });
// 生のまま食べる品目（サラダ・果物など）。苦手な食材を「生のときだけ」と登録したときに使う
const fRaw = (foodId, grams, display) => ({ ...f(foodId, grams, display), eatenRaw: true });

// priceYen はアプリの仮定値（地域・店で大きく違う）。needsIngredientCheck は原材料を自分で確かめられない料理。
// 分量（grams）は「よくある1人前」をアプリが仮定した値。実際の商品ラベルや計量で直して記録できる。
export const MEAL_TEMPLATES = [
  // ---- 自炊
  {
    id: 'cook_chicken_rice',
    name: '鶏むね肉のソテー＋ごはん＋ブロッコリー',
    place: 'cook',
    slots: ['lunch', 'dinner'],
    priceYen: 380,
    items: [
      f('chicken_breast_raw', 150, '鶏むね肉 皮なし 150g（焼く前に量る）'),
      f('oil', 5, 'サラダ油 小さじ1強 5g'),
      f('rice_cooked', 200, 'ごはん 200g（炊いた後）'),
      f('broccoli_boiled', 80, 'ブロッコリー 80g（ゆでた後）'),
    ],
    extraAllergens: [],
  },
  {
    id: 'cook_tkg_natto',
    name: '卵かけごはん＋納豆＋豆腐のみそ汁',
    place: 'cook',
    slots: ['breakfast', 'lunch', 'dinner'],
    priceYen: 200,
    items: [
      f('rice_cooked', 200, 'ごはん 200g（炊いた後）'),
      f('egg_raw', 50, '卵 1個 50g（殻を除く）'),
      f('natto', 45, '納豆 1パック 45g'),
      f('tofu_silken', 75, '絹ごし豆腐 1/4丁 75g'),
      f('miso', 12, 'みそ 大さじ2/3 12g'),
    ],
    extraAllergens: ['大豆'],
  },
  {
    id: 'cook_pork_stirfry',
    name: '豚もも肉と野菜の炒め＋ごはん（生米から炊く）',
    place: 'cook',
    slots: ['lunch', 'dinner'],
    priceYen: 350,
    items: [
      f('pork_leg_raw', 120, '豚もも肉 120g（炒める前に量る）'),
      f('cabbage_raw', 100, 'キャベツ 100g'),
      f('moyashi_raw', 100, 'もやし 1/2袋 100g'),
      f('oil', 6, 'サラダ油 6g'),
      f('rice_raw', 90, '生米 90g（炊く前に量る。炊くと約2.1〜2.3倍）'),
    ],
    extraAllergens: [],
  },
  {
    id: 'cook_salmon_teishoku',
    name: '焼き鮭定食（鮭＋ごはん＋豚汁）',
    place: 'cook',
    slots: ['breakfast', 'dinner'],
    priceYen: 420,
    items: [
      f('salmon_raw', 100, '鮭 1切れ 100g（焼く前に量る）'),
      f('rice_cooked', 200, 'ごはん 200g（炊いた後）'),
      f('tonjiru', 200, '豚汁 200g'),
    ],
    extraAllergens: [],
  },
  {
    id: 'cook_oatmeal',
    name: 'オートミール（牛乳）＋バナナ',
    place: 'cook',
    slots: ['breakfast', 'snack'],
    priceYen: 150,
    items: [
      f('oatmeal', 40, 'オートミール 40g（乾いた状態で量る）'),
      f('milk', 200, '牛乳 200g'),
      fRaw('banana', 100, 'バナナ 1本 100g（皮を除く）'),
    ],
    extraAllergens: [],
  },
  {
    id: 'cook_tuna_pasta',
    name: 'ツナとトマトのパスタ＋ゆで卵',
    place: 'cook',
    slots: ['lunch', 'dinner'],
    priceYen: 330,
    items: [
      f('pasta_boiled', 240, 'スパゲッティ 240g（ゆでた後。乾麺なら約100g）'),
      f('tuna_can_water', 70, 'ツナ缶（水煮）1缶 70g'),
      f('tomato', 150, 'トマト 1個 150g（つぶしてソースにし、加熱する）'),
      f('oil', 5, 'サラダ油 5g'),
      f('egg_boiled', 50, 'ゆで卵 1個 50g'),
    ],
    extraAllergens: [],
  },
  {
    id: 'cook_soboro_don',
    name: '鶏そぼろと豆腐の丼',
    place: 'cook',
    slots: ['lunch', 'dinner'],
    priceYen: 300,
    items: [
      f('chicken_mince_raw', 100, '鶏ひき肉 100g（炒める前）'),
      f('tofu_firm', 100, '木綿豆腐 1/3丁 100g'),
      f('rice_cooked', 220, 'ごはん 220g（炊いた後）'),
      f('oil', 4, 'サラダ油 4g'),
    ],
    extraAllergens: ['小麦', '大豆'], // しょうゆで味つけする想定
  },
  // ---- 学食
  {
    id: 'caf_oyakodon',
    name: '親子丼（並）',
    place: 'cafeteria',
    slots: ['lunch', 'dinner'],
    priceYen: 400,
    needsIngredientCheck: true,
    items: [f('rice_cooked', 250, 'ごはん 250g（仮定）'), f('oyakodon_topping', 200, '親子丼の具 200g（仮定）')],
    extraAllergens: [],
  },
  {
    id: 'caf_karaage',
    name: '唐揚げ定食（ごはん・豚汁・キャベツ）',
    place: 'cafeteria',
    slots: ['lunch', 'dinner'],
    priceYen: 500,
    needsIngredientCheck: true,
    items: [
      f('karaage', 150, '鶏のから揚げ 150g（仮定）'),
      f('rice_cooked', 200, 'ごはん 200g（仮定）'),
      f('tonjiru', 180, '豚汁 180g（仮定）'),
      fRaw('cabbage_raw', 50, '千切りキャベツ 50g（仮定）'),
    ],
    extraAllergens: [],
  },
  {
    id: 'caf_curry',
    name: 'チキンカレー（並）＋ゆで卵トッピング',
    place: 'cafeteria',
    slots: ['lunch', 'dinner'],
    priceYen: 430,
    needsIngredientCheck: true,
    items: [
      f('rice_cooked', 250, 'ごはん 250g（仮定）'),
      f('chicken_curry', 200, 'カレー 200g（仮定）'),
      f('egg_boiled', 50, 'ゆで卵 1個 50g'),
    ],
    extraAllergens: [],
  },
  {
    id: 'caf_mapo',
    name: '麻婆豆腐定食＋小鉢（ナムル）',
    place: 'cafeteria',
    slots: ['lunch', 'dinner'],
    priceYen: 450,
    needsIngredientCheck: true,
    items: [
      f('mapo_tofu', 220, '麻婆豆腐 220g（仮定）'),
      f('rice_cooked', 200, 'ごはん 200g（仮定）'),
      f('namul', 60, 'もやしのナムル 60g（仮定）'),
    ],
    extraAllergens: [],
  },
  {
    id: 'caf_udon_egg',
    name: 'かけうどん＋卵＋竹輪',
    place: 'cafeteria',
    slots: ['breakfast', 'lunch'],
    priceYen: 330,
    needsIngredientCheck: true,
    items: [
      f('udon_boiled', 250, 'うどん 250g（ゆで、仮定）'),
      f('egg_raw', 50, '卵 1個 50g'),
      f('chikuwa', 30, '竹輪 1本 30g（仮定）'),
    ],
    extraAllergens: ['小麦', '大豆'],
  },
  {
    id: 'caf_gyudon',
    name: '牛丼（並）＋冷ややっこ',
    place: 'cafeteria',
    slots: ['lunch', 'dinner'],
    priceYen: 420,
    needsIngredientCheck: true,
    items: [
      f('rice_cooked', 250, 'ごはん 250g（仮定）'),
      f('gyudon_topping', 150, '牛丼の具 150g（仮定）'),
      fRaw('tofu_silken', 100, '冷ややっこ 100g（仮定）'),
    ],
    extraAllergens: [],
  },
  // ---- コンビニ
  {
    id: 'cvs_onigiri_egg_milk',
    name: 'おにぎり2個＋ゆで卵2個＋牛乳',
    place: 'conveni',
    slots: ['breakfast', 'lunch', 'dinner'],
    priceYen: 560,
    needsIngredientCheck: true,
    items: [
      f('rice_cooked', 200, 'おにぎり2個分のごはん 200g（1個100gと仮定・具は含めない）'),
      f('egg_boiled', 100, 'ゆで卵 2個 100g'),
      f('milk', 200, '牛乳 200ml 相当 200g'),
    ],
    extraAllergens: [],
  },
  {
    id: 'cvs_saba_rice',
    name: 'パックごはん＋さば缶（水煮）＋カット野菜',
    place: 'conveni',
    slots: ['lunch', 'dinner'],
    priceYen: 520,
    needsIngredientCheck: true,
    items: [
      f('rice_cooked', 180, 'パックごはん 180g（仮定）'),
      f('saba_can_water', 150, 'さば水煮缶 1缶 中身150g（仮定）'),
      fRaw('cabbage_raw', 100, 'カット野菜（キャベツ）100g'),
    ],
    extraAllergens: [],
  },
  {
    id: 'cvs_karaage_onigiri',
    name: 'から揚げ（5個入り程度）＋おにぎり1個＋サラダ',
    place: 'conveni',
    slots: ['lunch', 'dinner'],
    priceYen: 550,
    needsIngredientCheck: true,
    items: [
      f('karaage', 120, 'から揚げ 120g（仮定）'),
      f('rice_cooked', 100, 'おにぎり1個分のごはん 100g（仮定）'),
      fRaw('cabbage_raw', 80, 'サラダ（キャベツ）80g'),
    ],
    extraAllergens: [],
  },
  {
    id: 'cvs_yakitori_tofu',
    name: '焼き鳥缶＋豆腐＋おにぎり1個',
    place: 'conveni',
    slots: ['lunch', 'dinner'],
    priceYen: 480,
    needsIngredientCheck: true,
    items: [
      f('yakitori_can', 70, '焼き鳥缶 1缶 70g（仮定）'),
      f('tofu_silken', 150, '絹ごし豆腐 1パック 150g（仮定）'),
      f('rice_cooked', 100, 'おにぎり1個分のごはん 100g（仮定）'),
    ],
    extraAllergens: ['小麦'],
  },
  {
    id: 'cvs_sandwich',
    name: 'ハムチーズサンド相当＋牛乳',
    place: 'conveni',
    slots: ['breakfast', 'lunch'],
    priceYen: 450,
    needsIngredientCheck: true,
    items: [
      f('bread', 90, '食パン 90g（6枚切り1.5枚相当、仮定）'),
      f('ham', 30, 'ハム 30g（仮定）'),
      f('cheese_process', 18, 'チーズ 18g（仮定）'),
      f('milk', 200, '牛乳 200g'),
    ],
    extraAllergens: [],
  },
  {
    id: 'cvs_yogurt_banana_sausage',
    name: 'ヨーグルト＋バナナ＋魚肉ソーセージ',
    place: 'conveni',
    slots: ['breakfast', 'snack'],
    priceYen: 380,
    needsIngredientCheck: true,
    items: [
      f('yogurt_plain', 200, '無糖ヨーグルト 200g'),
      fRaw('banana', 100, 'バナナ 1本 100g'),
      f('fish_sausage', 70, '魚肉ソーセージ 1本 70g（仮定）'),
    ],
    extraAllergens: [],
  },
  {
    id: 'cvs_oyakodon_bento',
    name: '親子丼のお弁当',
    place: 'conveni',
    slots: ['lunch', 'dinner'],
    priceYen: 550,
    needsIngredientCheck: true,
    items: [f('rice_cooked', 230, 'ごはん 230g（仮定）'), f('oyakodon_topping', 180, '親子丼の具 180g（仮定）')],
    extraAllergens: [],
  },
  {
    id: 'cvs_soymilk_onigiri',
    name: 'おにぎり1個＋豆乳＋竹輪',
    place: 'conveni',
    slots: ['breakfast', 'snack'],
    priceYen: 360,
    needsIngredientCheck: true,
    items: [
      f('rice_cooked', 100, 'おにぎり1個分のごはん 100g（仮定）'),
      f('soymilk', 200, '豆乳 200ml 相当 200g'),
      f('chikuwa', 60, '竹輪 2本 60g（仮定）'),
    ],
    extraAllergens: [],
  },
];

export const TEMPLATE_BY_ID = Object.fromEntries(MEAL_TEMPLATES.map((t) => [t.id, t]));

// データに付けてあるアレルゲン名の一覧。これに当たる語はタグで判定し、名前の部分一致は使わない（豆乳≠乳）
const KNOWN_ALLERGENS = new Set([
  ...Object.values(FOOD_BY_ID).flatMap((f) => f.allergens),
  ...MEAL_TEMPLATES.flatMap((t) => t.extraAllergens ?? []),
]);

/** 料理に含まれうるアレルゲン（食品データ + 料理側の追加） */
export function mealAllergens(template) {
  const s = new Set(template.extraAllergens ?? []);
  for (const it of template.items) {
    for (const a of FOOD_BY_ID[it.foodId]?.allergens ?? []) s.add(a);
  }
  return [...s];
}

const norm = (s) => String(s ?? '').trim().toLowerCase();

// 入力ゆれを表示義務の名前に寄せる（例：たまご → 卵）
const ALLERGEN_SYNONYMS = {
  たまご: '卵', 玉子: '卵', 鶏卵: '卵', こむぎ: '小麦', 牛乳: '乳', 乳製品: '乳', ミルク: '乳',
  ピーナッツ: '落花生', らっかせい: '落花生', 海老: 'えび', エビ: 'えび', 蟹: 'かに', カニ: 'かに',
  胡桃: 'くるみ', クルミ: 'くるみ', 蕎麦: 'そば', ソバ: 'そば', だいず: '大豆', 鮭: 'さけ', サケ: 'さけ',
  鯖: 'さば', サバ: 'さば', 胡麻: 'ごま', ゴマ: 'ごま', イカ: 'いか', 烏賊: 'いか',
};
export function normalizeAllergen(word) {
  const w = String(word ?? '').trim();
  return norm(ALLERGEN_SYNONYMS[w] ?? w);
}

/** アレルギー・苦手な食材による除外理由（なければ null） */
export function exclusionReason(template, { allergies = [], dislikes = [] }) {
  const allergens = mealAllergens(template).map(norm);
  const names = [template.name, ...template.items.map((i) => `${i.display} ${FOOD_BY_ID[i.foodId]?.name ?? ''}`)].map(norm);
  for (const a of allergies.map(normalizeAllergen).filter(Boolean)) {
    const byTag = allergens.some((x) => x === a);
    const byName = !KNOWN_ALLERGENS.has(a) && names.some((n) => n.includes(a));
    if (byTag || byName) {
      return { kind: 'allergy', word: a };
    }
  }
  for (const d of dislikes.map(normalizeDislike).filter((x) => x.word)) {
    const w = norm(d.word);
    if (d.scope === 'raw') {
      // 生のときだけ苦手：生で食べる品目だけを見る（ケチャップ・ソース・煮込みはOK）
      const rawHit = template.items.some(
        (i) => i.eatenRaw && norm(`${i.display} ${FOOD_BY_ID[i.foodId]?.name ?? ''}`).includes(w),
      );
      if (rawHit) return { kind: 'dislike', word: `生の${d.word}` };
    } else {
      const words = [w, ...(PROCESSED_FORMS[d.word] ?? []).map(norm)];
      if (names.some((n) => words.some((x) => n.includes(x)))) return { kind: 'dislike', word: d.word };
    }
  }
  return null;
}

// 「すべて苦手」のときに、加工品の名前でも避ける語（例：トマト → ケチャップ）
const PROCESSED_FORMS = { トマト: ['ケチャップ'] };

/**
 * 苦手な食材の登録。{ word, scope: 'raw'（生のときだけ）| 'all'（加熱・加工品もすべて） }
 * 文字列でも受け付ける：「生トマト」「生のトマト」「トマト（生）」は生のときだけ、それ以外はすべて
 */
export function normalizeDislike(d) {
  if (d && typeof d === 'object') return { word: String(d.word ?? '').trim(), scope: d.scope === 'raw' ? 'raw' : 'all' };
  const s = String(d ?? '').trim();
  const m = s.match(/^生の?(.+)$/) ?? s.match(/^(.+?)[（(]生[)）]$/);
  return m ? { word: m[1].trim(), scope: 'raw' } : { word: s, scope: 'all' };
}

/**
 * 自分で登録したメニューを、候補（テンプレート）と同じ形にする。
 * menu: { id, placeId, name, priceYen, slots[], items[], allergens[], needsIngredientCheck }
 */
export function menuToTemplate(menu) {
  const items = menu.items ?? [];
  return {
    id: menu.id,
    name: menu.name,
    place: menu.placeId,
    slots: menu.slots?.length ? menu.slots : ['breakfast', 'lunch', 'dinner', 'snack'],
    priceYen: menu.priceYen ?? null,
    priceIsExact: menu.priceYen != null,
    items,
    extraAllergens: menu.allergens ?? [],
    needsIngredientCheck: !!menu.needsIngredientCheck,
    user: true,
    nutritionUnknown: !items.length || items.every((i) => i.basis === 'unknown'),
  };
}

/** 候補の母集団：アプリの例（場所ごとに非表示にできる）＋ 自分で登録したメニュー */
export function candidatePool({ menus = [], hideBuiltin = {} } = {}) {
  return [...MEAL_TEMPLATES.filter((t) => !hideBuiltin[t.place]), ...menus.map(menuToTemplate)];
}

/** 似ている料理（アプリの例）を量の倍率つきでコピーして、メニューの品目にする */
export function itemsFromTemplate(templateId, scale = 1) {
  const t = TEMPLATE_BY_ID[templateId];
  if (!t) return [];
  return t.items.map((i) => ({
    ...i,
    grams: i.grams * scale,
    display: scale === 1 ? i.display : `${i.display}×${scale}`,
  }));
}

/** テンプレートから食事記録を作る（記録時にコピーするので、後でテンプレートが変わっても記録は変わらない） */
export function recordFromTemplate(template, slot, extra = {}) {
  return {
    id: extra.id ?? `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    slot,
    place: template.place,
    source: 'suggested',
    templateId: template.id,
    name: template.name,
    priceYen: template.priceYen,
    priceIsEstimate: !template.priceIsExact,
    items: template.items.map((i) => ({ ...i })),
    allergens: mealAllergens(template),
    needsIngredientCheck: !!template.needsIngredientCheck,
    ...extra,
  };
}

/**
 * 残りの食事の候補を出す。
 * ctx: { slot, places[], budgetYen|null, eatenRecords[], remainingSlots, targets(computeDailyTargets), perMealProtein|null,
 *        allergies[], dislikes[] }
 */
export function suggestMeals(ctx) {
  const eaten = dayTotals(ctx.eatenRecords).total;
  const remainingSlots = Math.max(1, ctx.remainingSlots ?? 1);
  const kcalTarget = ctx.targets?.energy?.value ?? null;
  const proteinTarget = ctx.targets?.protein?.value ?? null;
  const perMealKcal = kcalTarget != null ? Math.max(0, kcalTarget - eaten.kcal) / remainingSlots : null;
  const perMealProtein =
    proteinTarget != null ? Math.max(0, proteinTarget - eaten.protein) / remainingSlots : (ctx.perMealProtein ?? null);

  const out = [];
  const excluded = [];
  for (const t of ctx.pool ?? MEAL_TEMPLATES) {
    if (!t.slots.includes(ctx.slot)) continue;
    if (ctx.places?.length && !ctx.places.includes(t.place)) continue;
    const ex = exclusionReason(t, ctx);
    if (ex) {
      excluded.push({ template: t, reason: ex });
      continue;
    }
    if (ctx.budgetYen != null && t.priceYen != null && t.priceYen > ctx.budgetYen) continue;
    const n = mealNutrients(t).total;
    let score = 0;
    const reasons = [];
    if (t.user) {
      score += 0.3; // アプリ独自：自分で登録した実際のメニューを少し優先
      reasons.push('自分で登録したメニュー');
    }
    if (t.nutritionUnknown) {
      reasons.push('栄養は未登録のため、たんぱく質などでは比べていません');
      out.push({ template: t, nutrients: n, nutritionUnknown: true, priceYen: t.priceYen, allergens: mealAllergens(t),
        needsIngredientCheck: !!t.needsIngredientCheck, projectedDay: addNutrients(eaten, n), reasons, score: score - 0.6 });
      continue;
    }
    if (perMealProtein != null && perMealProtein > 0) {
      score -= Math.abs(n.protein - perMealProtein) / perMealProtein;
      reasons.push(`たんぱく質 約${Math.round(n.protein)}g：この食事の目安 約${Math.round(perMealProtein)}g に対して`);
    } else {
      score += Math.min(n.protein, 30) / 30; // アプリ独自：目安がないときは 30g までたんぱく質が多いほど上位
      reasons.push(`たんぱく質 約${Math.round(n.protein)}g`);
    }
    if (perMealKcal != null && perMealKcal > 0) {
      score -= (0.5 * Math.abs(n.kcal - perMealKcal)) / perMealKcal;
      reasons.push(`エネルギー 約${Math.round(n.kcal)}kcal：残りの目安 約${Math.round(perMealKcal)}kcal/食`);
    }
    if (ctx.budgetYen != null && t.priceYen != null) {
      reasons.push(`予算${ctx.budgetYen}円以内（${t.priceIsExact ? '' : '概算'}${t.priceYen}円）`);
      score += 0.1 * (1 - t.priceYen / ctx.budgetYen);
    }
    out.push({
      template: t,
      nutrients: n,
      priceYen: t.priceYen,
      allergens: mealAllergens(t),
      needsIngredientCheck: !!t.needsIngredientCheck,
      projectedDay: addNutrients(eaten, n),
      reasons,
      score,
    });
  }
  out.sort((a, b) => b.score - a.score);
  return { candidates: out, excluded, eaten, perMealKcal, perMealProtein };
}

/**
 * 「選択中の候補」を含めた見込み。実績（確定済み）とは別に返す。
 * 同じ枠の候補を差し替えても、各枠1つだけ数えるので二重計上にならない。
 */
export function projectedDay(eatenRecords, selectedBySlot = {}, lookup = TEMPLATE_BY_ID) {
  const actual = dayTotals(eatenRecords).total;
  let projected = { ...actual };
  const recordedSlots = new Set(eatenRecords.map((m) => m.slot));
  for (const [slot, templateId] of Object.entries(selectedBySlot)) {
    if (recordedSlots.has(slot)) continue; // すでに食べた枠の候補は数えない
    const t = lookup[templateId];
    if (t) projected = addNutrients(projected, mealNutrients(t).total);
  }
  return { actual, projected };
}

export { zeroNutrients };

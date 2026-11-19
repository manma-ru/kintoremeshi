// 家の在庫・作り置き・料理の記録・2週間分の買い出しリスト。
// 在庫は「買い出しを終えたとき」と「作ったとき」に自動で増減するので、毎日自分で数える必要はない。
import { RECIPES, RECIPE_BY_ID, SEASONINGS, BUY_INFO, BUY_ALIAS, PREPARED_DAYS, SEASONING_BUY } from './recipes.js';
import { recipeToTemplate, exclusionReason, recordFromTemplate } from './meals.js';
import { FOOD_BY_ID, mealNutrients } from './nutrition.js';

export const WHERE_LABEL = { fridge: '冷蔵', freezer: '冷凍', room: '常温' };
export const RICE_PORTION_G = 75; // 1食分の生米(g)。アプリの仮定：茶碗1杯ほど

export function defaultKitchen() {
  return {
    equipment: {}, // key -> true（ある）| false（ない）| 未回答
    seasonings: {}, // key -> true | false | 未回答
    homeMeals: null, // { breakfast, lunch, dinner }：1週間に家で食べる回数（未回答は null）
    intervalDays: 14,
    pantry: [], // [{ id, kind:'food'|'prepared', foodId?, grams?, recipeId?, portions?, where, addedOn, useBy, useByEstimated }]
    shopping: null,
    cookLog: [], // [{ date, recipeId, servings }]
  };
}

const newId = (p) => `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

export function addDaysStr(date, n) {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(y, m - 1, d + n);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

const buyKey = (foodId) => BUY_ALIAS[foodId] ?? foodId;
/** レシピ名から「（作り置き…）」を外した名前 */
const baseName = (name) => name.replace(/（作り置き[^）]*）/, '');

// ---------------------------------------------------------------- 在庫

/** 在庫に食材を入れる。期限を入れなければ、置き場所ごとの目安日数から推定（推定と分かるように印をつける） */
export function addPantry(kitchen, { foodId, grams, where, date, useBy = null }) {
  const info = BUY_INFO[foodId];
  const w = where ?? info?.where ?? 'fridge';
  const days = w === 'freezer' && info?.where !== 'freezer' ? 30 : (info?.days ?? 7);
  const item = {
    id: newId('pt'),
    kind: 'food',
    foodId,
    grams,
    where: w,
    addedOn: date,
    useBy: useBy ?? addDaysStr(date, days),
    useByEstimated: !useBy,
  };
  kitchen.pantry.push(item);
  return item;
}

export function pantryGrams(kitchen, foodId) {
  return kitchen.pantry.filter((p) => p.kind === 'food' && p.foodId === foodId).reduce((a, p) => a + p.grams, 0);
}

/** 期限の近いものから使う。足りない分は返す（在庫を登録していなかっただけのこともあるので、エラーにはしない） */
export function consumeFood(kitchen, foodId, grams) {
  let need = grams;
  const items = kitchen.pantry
    .filter((p) => p.kind === 'food' && p.foodId === foodId)
    .sort((a, b) => (a.useBy ?? '').localeCompare(b.useBy ?? ''));
  for (const p of items) {
    if (need <= 0) break;
    const use = Math.min(p.grams, need);
    p.grams -= use;
    need -= use;
  }
  kitchen.pantry = kitchen.pantry.filter((p) => !(p.kind === 'food' && p.grams <= 0.0001));
  return Math.max(0, need);
}

export function preparedItems(kitchen) {
  return kitchen.pantry.filter((p) => p.kind === 'prepared' && p.portions > 0);
}

function frozenRiceItem(kitchen) {
  return preparedItems(kitchen)
    .filter((p) => p.recipeId === 'cook_rice_batch')
    .sort((a, b) => a.useBy.localeCompare(b.useBy))[0];
}

/** ごはん1食分：冷凍ごはんがあればそれを使い、なければ生米から（パックごはんの人はパックを1個） */
function consumeRice(kitchen, item) {
  if (item.foodId === 'rice_cooked') return consumeFood(kitchen, 'rice_cooked', item.grams);
  const frozen = frozenRiceItem(kitchen);
  if (frozen) {
    frozen.portions -= 1;
    kitchen.pantry = kitchen.pantry.filter((p) => !(p.kind === 'prepared' && p.portions <= 0));
    return 0;
  }
  return consumeFood(kitchen, 'rice_raw', item.grams);
}

/** 期限が近い（今日から days 日以内）・過ぎたもの */
export function expiringSoon(kitchen, today, days = 2) {
  const limit = addDaysStr(today, days);
  return kitchen.pantry.filter((p) => p.useBy && p.useBy <= limit).sort((a, b) => a.useBy.localeCompare(b.useBy));
}

// ---------------------------------------------------------------- 作れるか

/** 家にあるもので作れるか（ごはん・調味料は別に見る）。missing は足りない食材 */
export function canMake(kitchen, template) {
  const missing = [];
  for (const it of template.items) {
    if (it.basis !== 'food' || it.rice) continue;
    const key = buyKey(it.foodId);
    const have = pantryGrams(kitchen, key) + (it.foodId === 'egg_boiled' ? boiledEggGrams(kitchen) : 0);
    if (have + 0.001 < it.grams) missing.push({ foodId: key, needG: it.grams, haveG: have });
  }
  const recipe = RECIPE_BY_ID[template.recipeId];
  const seasoningsMissing = (recipe?.seasonings ?? []).filter((s) => kitchen.seasonings[s.key] === false).map((s) => s.key);
  return { ok: missing.length === 0, missing, seasoningsMissing };
}

function boiledEggGrams(kitchen) {
  return preparedItems(kitchen)
    .filter((p) => p.recipeId === 'cook_boiled_eggs')
    .reduce((a, p) => a + p.portions * 100, 0);
}

// ---------------------------------------------------------------- 作る・食べる

/**
 * レシピを作った。材料を在庫から引き、食べなかった分は作り置きとして在庫に入れる。
 * eatNow>0 なら、その場で食べた1食を食事記録にする（mealRecords に追加して返す）。
 */
export function cookRecipe(kitchen, { date, recipeId, servings, eatNow = 1, slot = null, store = 'fridge' }) {
  const recipe = RECIPE_BY_ID[recipeId];
  const n = servings ?? recipe.servings;
  const shortages = [];
  for (const it of recipe.ingredients) {
    let need = it.grams * n;
    if (it.foodId === 'egg_boiled') {
      // ゆで卵は作り置きから使う
      const eggs = preparedItems(kitchen).find((p) => p.recipeId === 'cook_boiled_eggs');
      if (eggs) {
        const use = Math.min(eggs.portions, Math.ceil(need / 100));
        eggs.portions -= use;
        need -= use * 100;
      }
      if (need > 0) need = consumeFood(kitchen, 'egg_raw', need);
    } else {
      need = consumeFood(kitchen, it.foodId, need);
    }
    if (need > 0) shortages.push({ foodId: it.foodId, grams: need });
  }
  kitchen.pantry = kitchen.pantry.filter((p) => !(p.kind === 'prepared' && p.portions <= 0));
  kitchen.cookLog.push({ date, recipeId, servings: n });

  const eat = recipe.prepOnly ? 0 : Math.min(eatNow, n);
  const left = n - eat;
  let prepared = null;
  if (left > 0) {
    const where = recipe.id === 'cook_rice_batch' ? 'freezer' : store;
    prepared = {
      id: newId('pp'),
      kind: 'prepared',
      recipeId,
      portions: left,
      where,
      addedOn: date,
      useBy: addDaysStr(date, PREPARED_DAYS[where] ?? PREPARED_DAYS.fridge),
      useByEstimated: true,
    };
    kitchen.pantry.push(prepared);
  }
  let record = null;
  if (eat > 0) record = mealRecordForRecipe(kitchen, recipe, slot, { cooked: true });
  return { record, prepared, shortages };
}

/** 作り置きを1食食べた */
export function eatPrepared(kitchen, { pantryId, slot }) {
  const p = kitchen.pantry.find((x) => x.id === pantryId);
  if (!p || p.portions <= 0) return null;
  p.portions -= 1;
  const recipe = RECIPE_BY_ID[p.recipeId];
  const record = mealRecordForRecipe(kitchen, recipe, slot, { fromPrepared: true });
  kitchen.pantry = kitchen.pantry.filter((x) => !(x.kind === 'prepared' && x.portions <= 0));
  return record;
}

function mealRecordForRecipe(kitchen, recipe, slot, extra) {
  const t = recipeToTemplate(recipe, kitchen) ?? recipeToTemplate(recipe, {});
  const riceItem = t.items.find((i) => i.rice);
  if (riceItem) consumeRice(kitchen, riceItem);
  return recordFromTemplate(t, slot, { priceIsEstimate: true, ...extra, name: extra.fromPrepared ? `${baseName(t.name)}（作り置き）` : t.name });
}

/** 作り置きを、今日の候補と同じ形にする（材料費は買ったときに払っているので0円） */
export function preparedTemplates(kitchen) {
  return preparedItems(kitchen)
    .filter((p) => !RECIPE_BY_ID[p.recipeId]?.prepOnly && RECIPE_BY_ID[p.recipeId]?.slots.length)
    .map((p) => {
      const t = recipeToTemplate(RECIPE_BY_ID[p.recipeId], kitchen) ?? recipeToTemplate(RECIPE_BY_ID[p.recipeId], {});
      return {
        ...t,
        id: `prep:${p.id}`,
        pantryId: p.id,
        prepared: true,
        name: `作り置き：${baseName(t.name)}（残り${p.portions}食・${WHERE_LABEL[p.where]}）`,
        priceYen: 0,
        priceIsExact: true,
        useBy: p.useBy,
      };
    });
}

// ---------------------------------------------------------------- 料理レベル

/** スキルは「そのスキルを使うレシピを3回作った」で身についたとする（アプリ独自：くり返しが上達の基本） */
export const SKILL_MASTER_COUNT = 3;

export function skillProgress(cookLog) {
  const counts = {};
  for (const c of cookLog) for (const s of RECIPE_BY_ID[c.recipeId]?.skills ?? []) counts[s] = (counts[s] ?? 0) + 1;
  return counts;
}

/** 料理レベル：そのレベルのレシピを2回以上作ったら、次のレベルに挑戦できる（アプリ独自） */
export function cookingLevel(cookLog) {
  let level = 1;
  for (let L = 1; L <= 4; L += 1) {
    const n = cookLog.filter((c) => RECIPE_BY_ID[c.recipeId]?.level === L).length;
    if (n >= 2) level = Math.min(4, L + 1);
    else break;
  }
  return level;
}

/** 次に挑戦するとよいレシピ（今のレベルで、まだ身についていないスキルを含むもの） */
export function nextChallenge(kitchen, excludeIds = []) {
  const level = cookingLevel(kitchen.cookLog);
  const counts = skillProgress(kitchen.cookLog);
  const ok = RECIPES.filter((r) => !excludeIds.includes(r.id) && r.level <= level && !r.needs.some((n) => kitchen.equipment[n] === false));
  const fresh = ok.filter((r) => r.skills.some((s) => (counts[s] ?? 0) < SKILL_MASTER_COUNT));
  return (fresh.length ? fresh : ok).sort((a, b) => b.level - a.level)[0] ?? null;
}

// ---------------------------------------------------------------- 買い出しリスト

/**
 * 次の買い出しまで（intervalDays 日）の自炊の予定と、買うものを作る。
 * opts: { allergies, dislikes, startDate }
 */
export function buildShoppingPlan(kitchen, { allergies = [], dislikes = [], startDate }) {
  const hm = kitchen.homeMeals;
  if (!hm) return { error: '家で食べる回数（1週間あたり）を先に入れてください。' };
  const weeks = Math.max(1, Math.round((kitchen.intervalDays ?? 14) / 7));
  const level = cookingLevel(kitchen.cookLog);
  const allowed = RECIPES.filter((r) => !r.prepOnly)
    .map((r) => ({ r, t: recipeToTemplate(r, kitchen) }))
    .filter(({ t }) => t && !exclusionReason(t, { allergies, dislikes }))
    .filter(({ r }) => r.level <= level + 1);
  const notes = [];

  // 主菜（昼・夜）：たんぱく質が多い・作り置きできる・今のレベル＋1までを優先し、4品にしぼる（食材を使い回してムダを減らす）
  const mainNeed = (hm.lunch ?? 0) + (hm.dinner ?? 0);
  const mains = allowed
    // 家で食べる枠（昼・夜のうち回数が1以上のもの）に向いたレシピだけ
    .filter(({ r }) => r.slots.some((s) => (s === 'lunch' && hm.lunch > 0) || (s === 'dinner' && hm.dinner > 0)))
    .map(({ r, t }) => {
      const p = mealNutrients({ items: t.items.filter((i) => !i.rice) }).total.protein;
      const challenge = r.level === level + 1;
      return { r, t, score: Math.min(p, 35) / 35 + (r.servings > 1 ? 0.5 : 0) + (challenge ? 0.3 : 0) - (r.level > level ? 0.2 : 0) };
    })
    .sort((a, b) => b.score - a.score);
  // 品数：2食に1品くらい、最大4品（食材を使い回してムダを減らす）
  const want = Math.min(4, Math.max(1, Math.ceil(mainNeed / 2)));
  const cookedIds = new Set(kitchen.cookLog.map((c) => c.recipeId));
  // まず今のレベル以下から。足りなければ1つ上のレベルで補う（まだ作ったことのない上のレベルは「挑戦」で1品まで）
  const picked = mains.filter((m) => m.r.level <= level).slice(0, want);
  let challenges = 0;
  for (const m of mains.filter((x) => x.r.level === level + 1)) {
    if (picked.length >= want) break;
    if (!cookedIds.has(m.r.id)) {
      if (challenges >= 1) continue;
      challenges += 1;
      m.challenge = true;
    }
    picked.push(m);
  }
  // それでも足りないとき（レベル1でレシピが少ない）は、1つ上のレベルをもう1品まで足す
  for (const m of mains.filter((x) => x.r.level === level + 1 && !picked.includes(x))) {
    if (picked.length >= Math.min(want, 2)) break;
    picked.push(m);
  }
  const breakfastNeed = hm.breakfast ?? 0;
  const breakfasts = allowed.filter(({ r }) => r.slots.includes('breakfast') && r.level <= 1).slice(0, 2);

  // 週ごとに割り当て：傷みやすい食材を使うレシピは1週目だけ
  const isShort = (r) => r.ingredients.some((i) => BUY_INFO[buyKey(i.foodId)]?.shelf === 'short');
  const schedule = [];
  const servingsByRecipe = {};
  for (let w = 1; w <= weeks; w += 1) {
    const usable = picked.filter(({ r }) => w === 1 || !isShort(r));
    const list = usable.length ? usable : picked;
    let left = mainNeed;
    const weekPlan = [];
    let i = 0;
    while (left > 0 && list.length) {
      const { r } = list[i % list.length];
      const n = Math.min(r.servings, left);
      weekPlan.push({ recipeId: r.id, servings: n, meals: 'main' });
      servingsByRecipe[r.id] = (servingsByRecipe[r.id] ?? 0) + n;
      left -= n;
      i += 1;
    }
    let b = breakfastNeed;
    let j = 0;
    while (b > 0 && breakfasts.length) {
      const { r } = breakfasts[j % breakfasts.length];
      weekPlan.push({ recipeId: r.id, servings: 1, meals: 'breakfast' });
      servingsByRecipe[r.id] = (servingsByRecipe[r.id] ?? 0) + 1;
      b -= 1;
      j += 1;
    }
    schedule.push({ week: w, plan: mergePlan(weekPlan) });
  }
  if (picked.some(({ r }) => isShort(r)) && weeks > 1) notes.push('もやし・豆腐など傷みやすい食材を使う主菜は1週目に入れています。');
  if (weeks > 1) {
    const shortIn2 = new Set();
    for (const p of schedule.slice(1).flatMap((w) => w.plan)) {
      for (const i of RECIPE_BY_ID[p.recipeId].ingredients) if (BUY_INFO[buyKey(i.foodId)]?.shelf === 'short') shortIn2.add(FOOD_BY_ID[i.foodId]?.name);
    }
    if (shortIn2.size)
      notes.push(`2週目にも${[...shortIn2].join('・')}を使います。傷みやすいので、途中で買い足すか、冷凍できるもの（バナナはむいて冷凍）は冷凍してください。`);
  }
  const challenge = picked.find((m) => m.challenge);
  if (challenge) notes.push(`今回の挑戦レシピ：${challenge.r.name}（${challenge.r.point}）`);

  // 必要な量（g）
  const needG = {};
  let riceMeals = 0;
  for (const [id, n] of Object.entries(servingsByRecipe)) {
    const r = RECIPE_BY_ID[id];
    for (const it of r.ingredients) needG[buyKey(it.foodId)] = (needG[buyKey(it.foodId)] ?? 0) + it.grams * n;
    if (r.withRice) riceMeals += n;
  }
  const riceByCooker = kitchen.equipment.ricecooker !== false;
  if (riceMeals) {
    if (riceByCooker) needG.rice_raw = (needG.rice_raw ?? 0) + riceMeals * RICE_PORTION_G;
    else needG.rice_cooked = (needG.rice_cooked ?? 0) + riceMeals * 180;
  }

  // 在庫を引いて、売っている単位に直す
  const items = [];
  for (const [foodId, g] of Object.entries(needG)) {
    let have = pantryGrams(kitchen, foodId);
    if (foodId === 'rice_raw') have += (frozenRiceItem(kitchen) ? preparedItems(kitchen).filter((p) => p.recipeId === 'cook_rice_batch').reduce((a, p) => a + p.portions, 0) : 0) * RICE_PORTION_G;
    if (foodId === 'egg_raw') have += boiledEggGrams(kitchen);
    const short = g - have;
    if (short <= 0.5) continue;
    const info = BUY_INFO[foodId];
    if (!info) {
      items.push({ id: newId('si'), foodId, name: FOOD_BY_ID[foodId]?.name ?? foodId, needG: short, count: null, priceYen: null, section: 'その他', checked: false });
      continue;
    }
    const count = Math.ceil(short / info.pack[0]);
    items.push({
      id: newId('si'),
      foodId,
      name: info.pack[1],
      needG: short,
      haveG: have,
      count,
      packG: info.pack[0],
      priceYen: count * info.priceYen,
      section: info.section,
      tip: info.tip ?? '',
      where: info.where,
      shelf: info.shelf,
      checked: false,
    });
  }
  // 調味料：「ない」と答えたもの＋未回答のもの（未回答は「持っていなければ」）
  const seasoningKeys = new Set(Object.keys(servingsByRecipe).flatMap((id) => RECIPE_BY_ID[id].seasonings.map((s) => s.key)));
  for (const key of seasoningKeys) {
    const has = kitchen.seasonings[key];
    if (has === true) continue;
    items.push({
      id: newId('si'),
      seasoningKey: key,
      name: SEASONINGS[key].name,
      optional: has === undefined,
      count: 1,
      priceYen: SEASONING_BUY.priceYen,
      section: '調味料',
      tip: has === undefined ? '持っているか未回答。持っていなければ買う' : '',
      checked: false,
    });
  }
  const sectionOrder = ['野菜・果物', '肉・魚', '卵・乳・大豆', '冷凍食品', '主食・乾物・缶詰', '調味料', 'その他'];
  items.sort((a, b) => sectionOrder.indexOf(a.section) - sectionOrder.indexOf(b.section));
  const totalYen = items.filter((i) => !i.optional).reduce((a, i) => a + (i.priceYen ?? 0), 0);
  if (riceMeals && riceByCooker) notes.push(`ごはんは${riceMeals}食分。2合ずつ炊いて冷凍すると楽です（「ごはんをまとめて炊いて冷凍」）。`);
  return { createdOn: startDate, weeks, schedule, items, totalYen, notes, level };
}

function mergePlan(list) {
  const m = new Map();
  for (const p of list) {
    const k = `${p.recipeId}:${p.meals}`;
    const cur = m.get(k);
    if (cur) cur.servings += p.servings;
    else m.set(k, { ...p });
  }
  return [...m.values()];
}

/** 買い物を終えた：チェックしたものを在庫へ（肉・魚は冷凍、調味料は「ある」に） */
export function completeShopping(kitchen, date) {
  const sh = kitchen.shopping;
  if (!sh) return [];
  const added = [];
  for (const it of sh.items.filter((i) => i.checked)) {
    if (it.seasoningKey) {
      kitchen.seasonings[it.seasoningKey] = true;
      continue;
    }
    if (it.foodId && it.count) added.push(addPantry(kitchen, { foodId: it.foodId, grams: it.count * it.packG, date }));
    else if (it.foodId && it.needG) added.push(addPantry(kitchen, { foodId: it.foodId, grams: it.needG, date }));
  }
  sh.completedOn = date;
  kitchen.lastShoppingOn = date;
  return added;
}

/** 料理の候補に足す情報：家で作れるか・足りない食材 */
export function pantryHint(kitchen, template) {
  if (!template.recipeId || template.prepared) return null;
  return canMake(kitchen, template);
}

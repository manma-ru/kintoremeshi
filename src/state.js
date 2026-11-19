// アプリの状態（端末の localStorage に保存）と、状態を変える操作。
// 「普段の設定」(profile) と「その日だけの変更」(overrides[date]) は別々に持つ。
// 「予定」(planSnapshot) と「実績」(actual) も別々に持つ。
import { buildWeekPlan, buildSession, DOW_KEYS, EXERCISE_BY_ID } from './training.js';
import { TEMPLATE_BY_ID, recordFromTemplate, SLOT_ORDER, BUILTIN_PLACES, menuToTemplate, candidatePool, KIND_NEEDS_CHECK, recipeToTemplate } from './meals.js';
import { defaultKitchen, preparedTemplates, cookRecipe, eatPrepared } from './kitchen.js';
import { RECIPES } from './recipes.js';

// 保存場所の名前。アプリ名を変えても、これまでのデータを読めるように古い名前のままにしている
export const STORAGE_KEY = 'kintore-meshi/v1';

export function defaultState() {
  return {
    version: 1,
    profile: {
      setupDone: false,
      setupDate: null, // 使い始めた日（振り返りで、これより前は数えない）
      training: {
        goal: 'undecided', // muscle | tone | habit | strength | undecided
        priority: '', // hypertrophy | strength | habit | ''（空なら目標から決める）
        experience: 'none', // none | beginner | intermediate
        equipment: { home: [], gym: [] },
        increments: { dumbbell: 1, barbell: 2.5, machine: 2.5 },
        days: Object.fromEntries(DOW_KEYS.map((k) => [k, { on: false, minutes: 30, place: 'home' }])),
      },
      food: {
        budgetPerDayYen: null,
        places: ['cook', 'cafeteria', 'conveni'],
        mealsPerDay: 3,
        allergies: [],
        dislikes: [], // [{ word, scope: 'raw' | 'all' }]
        hideBuiltin: {}, // placeId -> true（その場所ではアプリの例を候補に出さない）
      },
      body: {
        enabled: false,
        age: null,
        sex: '',
        heightCm: null,
        weightKg: null,
        pal: '',
        palIncludesTraining: true,
        energyGoal: 'maintain',
      },
    },
    adjustments: {}, // exId -> { loadKg, setTargets, sets, adoptedOn, reason }
    swapsDefault: {}, // pattern -> exId（本人が普段から替えた種目）
    avoid: [], // 外した種目（振り返りの提案を採用したときなど）
    overrides: {}, // date -> { minutes, place, meal:{slot, place, budgetYen}, swaps:{pattern:exId} }
    workouts: {}, // date -> { status:'done'|'skipped', planSnapshot, actual:[...], fatigue, recordedAt }
    meals: {}, // date -> [mealRecord]
    selected: {}, // date -> { slot: templateId }（選択中の候補。実績ではない）
    weights: [], // [{date, kg}]
    proposals: {}, // weekStart -> { id, status:'adopted'|'dismissed' }
    customFoods: [], // 商品ラベルから登録したもの
    placesCustom: [], // 自分で足した場所 [{ id, name, kind }]
    menus: [], // 場所ごとに登録したメニュー（meals.js の menuToTemplate を参照）
    kitchen: defaultKitchen(), // 道具・調味料・在庫・作り置き・買い出し・料理の記録（kitchen.js）
    badgesSeen: [], // 見たバッジ（新しいバッジに印をつけるため）
  };
}

/** 保存データを読み込む。壊れていたら初期状態 */
export function loadState(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return mergeDefaults(defaultState(), JSON.parse(raw));
  } catch {
    return defaultState();
  }
}

export function saveState(state, storage = globalThis.localStorage) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

function mergeDefaults(def, val) {
  if (Array.isArray(def) || def === null || typeof def !== 'object') return val ?? def;
  const out = { ...def };
  for (const k of Object.keys(val ?? {})) {
    out[k] = k in def && def[k] && typeof def[k] === 'object' && !Array.isArray(def[k]) ? mergeDefaults(def[k], val[k]) : val[k];
  }
  return out;
}

// ---------------------------------------------------------------- 日付

export function ymd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function parseYmd(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s, n) {
  const d = parseYmd(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
}

export function dowKey(s) {
  return DOW_KEYS[(parseYmd(s).getDay() + 6) % 7];
}

/** 月曜はじまりの週の初日 */
export function weekStartOf(s) {
  const d = parseYmd(s);
  const diff = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diff);
  return ymd(d);
}

// ---------------------------------------------------------------- 筋トレ

/** その日の予定（普段の設定 + その日の変更）。休んだ日があっても量を倍にしない（日ごとに独立して作る） */
export function sessionForDate(state, date) {
  const training = state.profile.training;
  const week = buildWeekPlan(training);
  const day = week.find((d) => d.dow === dowKey(date));
  const ov = state.overrides[date] ?? {};
  if (day.rest && !ov.forceTraining) return { rest: true, dow: day.dow };
  const typeFallback = day.type ?? 'fullA';
  return buildSession({
    type: ov.type ?? typeFallback,
    minutes: ov.minutes ?? day.minutes ?? 30,
    place: ov.place ?? day.place ?? 'home',
    training,
    adjustments: state.adjustments,
    swaps: { ...state.swapsDefault, ...(ov.swaps ?? {}) },
    avoid: state.avoid ?? [],
  });
}

export function setOverride(state, date, patch) {
  const cur = state.overrides[date] ?? {};
  state.overrides[date] = { ...cur, ...patch };
  return state;
}

export function clearOverride(state, date) {
  delete state.overrides[date];
  return state;
}

/**
 * 実績を記録。entries: [{exId, sets:[{reps, kg}], rir, feel, formStable, pain}]
 * 予定（そのときのメニュー）はスナップショットで別に残す。
 */
export function recordWorkout(state, date, { entries, fatigue = 'normal', minutesUsed = null }) {
  const plan = sessionForDate(state, date);
  state.workouts[date] = {
    status: 'done',
    planSnapshot: plan.rest ? null : JSON.parse(JSON.stringify(plan)),
    plannedMinutes: plan.rest ? 0 : plan.minutes,
    usualMinutes: state.profile.training.days[dowKey(date)]?.minutes ?? null,
    actual: entries,
    fatigue,
    minutesUsed,
    recordedAt: new Date().toISOString(),
  };
  return state;
}

export function markSkipped(state, date) {
  const plan = sessionForDate(state, date);
  state.workouts[date] = {
    status: 'skipped',
    planSnapshot: plan.rest ? null : JSON.parse(JSON.stringify(plan)),
    plannedMinutes: plan.rest ? 0 : plan.minutes,
    usualMinutes: state.profile.training.days[dowKey(date)]?.minutes ?? null,
    actual: [],
    recordedAt: new Date().toISOString(),
  };
  return state;
}

/** 提案を採用したときだけ計画に反映 */
export function adoptSuggestion(state, exId, option, date) {
  if (!option?.apply) return state;
  if (option.apply.swapTo) {
    const pattern = EXERCISE_BY_ID[exId].pattern;
    state.swapsDefault[pattern] = option.apply.swapTo;
    delete state.adjustments[exId];
    return state;
  }
  state.adjustments[exId] = {
    loadKg: option.apply.loadKg ?? null,
    setTargets: option.apply.setTargets ?? null,
    sets: option.apply.sets ?? null,
    tempo: option.apply.tempo ?? null,
    adoptedOn: date,
    reason: option.detail,
  };
  return state;
}

// ---------------------------------------------------------------- 食事

export function mealsOn(state, date) {
  return state.meals[date] ?? [];
}

/** 候補を選ぶ（実績には入れない）。同じ枠を選び直すと置き換わる */
export function selectCandidate(state, date, slot, templateId) {
  state.selected[date] = { ...(state.selected[date] ?? {}), [slot]: templateId };
  return state;
}

export function clearCandidate(state, date, slot) {
  if (state.selected[date]) delete state.selected[date][slot];
  return state;
}

/** 「食べた」と確定：候補を実績に移す（edits で量・価格を直せる） */
export function confirmCandidate(state, date, slot, edits = {}) {
  const templateId = state.selected[date]?.[slot] ?? edits.templateId;
  const t = templateLookup(state)[templateId];
  if (!t) return state;
  let rec;
  if (t.prepared) {
    // 作り置きを食べた：在庫の残りを1食減らす
    rec = eatPrepared(state.kitchen, { pantryId: t.pantryId, slot });
  } else if (t.recipeId) {
    // レシピを作って食べた：材料を在庫から引き、余りは作り置きに
    rec = cookRecipe(state.kitchen, { date, recipeId: t.recipeId, eatNow: 1, slot }).record;
  }
  if (rec) rec = { ...rec, ...edits, id: rec.id };
  else rec = recordFromTemplate(t, slot, edits);
  state.meals[date] = [...mealsOn(state, date), rec];
  clearCandidate(state, date, slot);
  return state;
}

export function addMealRecord(state, date, record) {
  const rec = { id: `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`, ...record };
  state.meals[date] = [...mealsOn(state, date), rec];
  if (record.slot) clearCandidate(state, date, record.slot);
  return state;
}

export function updateMealRecord(state, date, id, patch) {
  state.meals[date] = mealsOn(state, date).map((m) => (m.id === id ? { ...m, ...patch } : m));
  return state;
}

export function deleteMealRecord(state, date, id) {
  state.meals[date] = mealsOn(state, date).filter((m) => m.id !== id);
  return state;
}

/** まだ記録のない枠（1日の食事回数ぶん。間食は数えない） */
export function remainingSlots(state, date) {
  const n = state.profile.food.mealsPerDay ?? 3;
  const main = n >= 3 ? ['breakfast', 'lunch', 'dinner'] : n === 2 ? ['lunch', 'dinner'] : ['dinner'];
  const done = new Set(mealsOn(state, date).map((m) => m.slot));
  return main.filter((s) => !done.has(s));
}

export function nextSlot(state, date, hour = new Date().getHours()) {
  const rem = remainingSlots(state, date);
  if (!rem.length) return 'snack';
  // 時間帯より前の枠はスキップしない（記録がなくても欠食とはみなさない）。時間帯に合う最初の枠を提案
  const byHour = hour < 10 ? 'breakfast' : hour < 15 ? 'lunch' : 'dinner';
  const idx = SLOT_ORDER.indexOf(byHour);
  return rem.find((s) => SLOT_ORDER.indexOf(s) >= idx) ?? rem.at(-1);
}

export function setWeight(state, date, kg) {
  state.weights = state.weights.filter((w) => w.date !== date);
  if (kg > 0) state.weights.push({ date, kg });
  state.weights.sort((a, b) => a.date.localeCompare(b.date));
  return state;
}

/** 計画から週あたりの筋トレ日数・分数 */
export function trainingVolume(state) {
  const days = Object.values(state.profile.training.days).filter((d) => d.on);
  return {
    trainingDaysPerWeek: days.length,
    trainingMinutesPerWeek: days.reduce((a, d) => a + (d.minutes ?? 0), 0),
  };
}

// ---------------------------------------------------------------- 場所とメニュー

const newId = (prefix) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

export function allPlaces(state) {
  return [...BUILTIN_PLACES, ...(state.placesCustom ?? [])];
}

export function placeById(state, id) {
  return allPlaces(state).find((p) => p.id === id) ?? null;
}

export function placeName(state, id) {
  return placeById(state, id)?.name ?? '';
}

/** 候補を id で探す表（アプリの例 + 登録メニュー） */
export function templateLookup(state) {
  const k = state.kitchen ?? defaultKitchen();
  const recipes = RECIPES.filter((r) => !r.prepOnly)
    .map((r) => recipeToTemplate(r, k) ?? recipeToTemplate(r, {}))
    .map((t) => [t.id, t]);
  return {
    ...TEMPLATE_BY_ID,
    ...Object.fromEntries(recipes),
    ...Object.fromEntries(preparedTemplates(k).map((t) => [t.id, t])),
    ...Object.fromEntries((state.menus ?? []).map((m) => [m.id, menuToTemplate(m)])),
  };
}

export function poolFor(state) {
  const k = state.kitchen ?? defaultKitchen();
  return candidatePool({
    menus: state.menus ?? [],
    hideBuiltin: state.profile.food.hideBuiltin ?? {},
    kitchen: k,
    extra: preparedTemplates(k),
  });
}

export function addPlace(state, { name, kind }) {
  const place = { id: newId('p'), name: String(name).trim(), kind: kind || 'other' };
  state.placesCustom = [...(state.placesCustom ?? []), place];
  state.profile.food.places = [...new Set([...state.profile.food.places, place.id])];
  return place;
}

/** 自分で足した場所を消す（その場所のメニューも消える） */
export function deletePlace(state, id) {
  state.placesCustom = (state.placesCustom ?? []).filter((p) => p.id !== id);
  state.menus = (state.menus ?? []).filter((m) => m.placeId !== id);
  state.profile.food.places = state.profile.food.places.filter((p) => p !== id);
  return state;
}

export function addMenu(state, menu) {
  const kind = placeById(state, menu.placeId)?.kind;
  const m = {
    id: newId('menu'),
    needsIngredientCheck: menu.needsIngredientCheck ?? KIND_NEEDS_CHECK.has(kind),
    allergens: [],
    slots: [],
    items: [{ basis: 'unknown' }],
    ...menu,
  };
  state.menus = [...(state.menus ?? []), m];
  return m;
}

export function deleteMenu(state, id) {
  state.menus = (state.menus ?? []).filter((m) => m.id !== id);
  return state;
}

/** 記録した食事を、その場所のメニューとして登録（次から1タップで選べる） */
export function menuFromRecord(state, date, recordId, { placeId, slots } = {}) {
  const r = mealsOn(state, date).find((m) => m.id === recordId);
  if (!r) return null;
  return addMenu(state, {
    placeId: placeId ?? r.place,
    name: r.name,
    priceYen: r.priceYen ?? null,
    slots: slots ?? (r.slot ? [r.slot] : []),
    items: (r.items ?? []).map((i) => ({ ...i })),
    allergens: r.allergens ?? [],
    needsIngredientCheck: r.needsIngredientCheck,
  });
}

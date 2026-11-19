// 栄養の計算。すべて純粋関数で、単位は名前か戻り値の unit に書く。
// 丸めはしない（表示するときに format.js で丸める）。
import { FOODS } from './foods-data.js';

export const FOOD_BY_ID = Object.fromEntries(FOODS.map((f) => [f.id, f]));

/** 栄養量の入れ物。単位：kcal は kcal、それ以外は g */
export function zeroNutrients() {
  return { kcal: 0, protein: 0, fat: 0, carb: 0 };
}

export function addNutrients(a, b) {
  return {
    kcal: a.kcal + b.kcal,
    protein: a.protein + b.protein,
    fat: a.fat + b.fat,
    carb: a.carb + b.carb,
  };
}

/**
 * 100gあたりの値 × 実際に食べた量(g)。
 * 例：たんぱく質 20 g/100g の食品を 150 g → 30 g
 */
export function nutrientsFromPer100g(per100g, eatenGrams) {
  const r = eatenGrams / 100;
  return {
    kcal: per100g.kcal * r,
    protein: per100g.protein * r,
    fat: per100g.fat * r,
    carb: per100g.carb * r,
  };
}

/** 1包装あたりの値（商品ラベル）× 食べた包装数（0.5 = 半分） */
export function nutrientsFromPerPackage(perPackage, packages) {
  return {
    kcal: perPackage.kcal * packages,
    protein: perPackage.protein * packages,
    fat: perPackage.fat * packages,
    carb: perPackage.carb * packages,
  };
}

/**
 * 食事の1品目。basis の種類：
 *  - 'food'       : 成分表の食品 foodId と、実際に食べた量 grams（食品の state に合わせた重さ）
 *  - 'label100g'  : 商品ラベルの「100gあたり」per100g と grams
 *  - 'labelPack'  : 商品ラベルの「1包装あたり」perPackage と packages
 *  - 'unknown'    : 量が分からない（栄養は計算しない）
 * 戻り値：栄養量 or null（計算できないとき）
 */
export function itemNutrients(item) {
  switch (item.basis) {
    case 'food': {
      const food = FOOD_BY_ID[item.foodId];
      if (!food || !(item.grams > 0)) return null;
      return nutrientsFromPer100g(food.per100g, item.grams);
    }
    case 'label100g':
      if (!item.per100g || !(item.grams > 0)) return null;
      return nutrientsFromPer100g(item.per100g, item.grams);
    case 'labelPack':
      if (!item.perPackage || !(item.packages > 0)) return null;
      return nutrientsFromPerPackage(item.perPackage, item.packages);
    default:
      return null;
  }
}

/** 1食の合計。量が不明な品目があれば known=false（合計は「分かった分」だけ） */
export function mealNutrients(meal) {
  let total = zeroNutrients();
  let unknownItems = 0;
  for (const item of meal.items ?? []) {
    const n = itemNutrients(item);
    if (n) total = addNutrients(total, n);
    else unknownItems += 1;
  }
  const items = meal.items?.length ?? 0;
  return { total, unknownItems, known: items > 0 && unknownItems === 0 };
}

/**
 * 1日の「記録できた分の合計」。食べたと確定した記録だけを数える（候補は含めない）。
 * 量不明の食事は件数だけ数え、合計には入れない。記録のない食事は欠食とみなさない。
 */
export function dayTotals(mealRecords = []) {
  let total = zeroNutrients();
  let knownMeals = 0;
  let partialMeals = 0;
  for (const m of mealRecords) {
    const r = mealNutrients(m);
    total = addNutrients(total, r.total);
    if (r.known) knownMeals += 1;
    else partialMeals += 1;
  }
  return { total, knownMeals, partialMeals, recordedMeals: mealRecords.length };
}

// ---------------------------------------------------------------- エネルギー推定

/** 表3 参照体重における基礎代謝量：基礎代謝基準値 (kcal/kg体重/日) */
export const BMR_STANDARD_KCAL_PER_KG = [
  { min: 18, max: 29, male: 23.7, female: 22.1 },
  { min: 30, max: 49, male: 22.5, female: 21.9 },
  { min: 50, max: 64, male: 21.8, female: 20.7 },
  { min: 65, max: 74, male: 21.6, female: 20.7 },
  { min: 75, max: 200, male: 21.5, female: 20.7 },
];

/** 表4 身体活動レベル（男女共通） */
export const PAL_TABLE = [
  { min: 18, max: 64, low: 1.5, mid: 1.75, high: 2.0 },
  { min: 65, max: 74, low: 1.5, mid: 1.7, high: 1.9 },
  { min: 75, max: 200, low: 1.4, mid: 1.7, high: null },
];

export const PAL_LABEL = {
  low: '低い（生活の大部分が座っている）',
  mid: 'ふつう（座り中心だが、通学・移動・立ち作業や軽い運動がある）',
  high: '高い（立ち仕事・移動が多い、または活発な運動習慣がある）',
};

/** 筋トレ（複数種目・8〜15回）のメッツ値。Compendium 2011 */
export const RESISTANCE_TRAINING_METS = 3.5;

/**
 * 体重維持のための推定エネルギー量 (kcal/日)。
 * input: { age(歳), sex('male'|'female'|''), weightKg(kg), pal('low'|'mid'|'high'),
 *          palIncludesTraining(bool), trainingMinutesPerWeek(分/週) }
 * 戻り値: { kcalPerDay|null, steps[], missing[] }
 */
export function estimateMaintenanceEnergy(input) {
  const missing = [];
  const { age, sex, weightKg, pal } = input;
  if (!(age >= 18)) missing.push(age > 0 ? '年齢（18歳以上のみ対応）' : '年齢');
  if (sex !== 'male' && sex !== 'female') missing.push('性別（基礎代謝基準値の表が男女別のため）');
  if (!(weightKg > 0)) missing.push('体重');
  if (!pal) missing.push('身体活動レベル');
  if (missing.length) return { kcalPerDay: null, steps: [], missing };

  const bmrRow = BMR_STANDARD_KCAL_PER_KG.find((r) => age >= r.min && age <= r.max);
  const palRow = PAL_TABLE.find((r) => age >= r.min && age <= r.max);
  const bmrStd = bmrRow[sex];
  const palValue = palRow[pal];
  if (palValue == null) {
    return { kcalPerDay: null, steps: [], missing: ['この年齢区分には「高い」の身体活動レベルがありません'] };
  }
  const bmr = bmrStd * weightKg;
  const base = bmr * palValue;
  const steps = [
    {
      label: '基礎代謝量',
      formula: `基礎代謝基準値 ${bmrStd} kcal/kg/日 × 体重 ${weightKg} kg`,
      value: bmr,
      unit: 'kcal/日',
      why: `${bmrRow.min}〜${bmrRow.max === 200 ? '' : bmrRow.max}歳・${sex === 'male' ? '男性' : '女性'}の値（表3）`,
      sourceId: 'dri2025_energy',
    },
    {
      label: '推定エネルギー必要量（体重維持）',
      formula: `基礎代謝量 × 身体活動レベル ${palValue}`,
      value: base,
      unit: 'kcal/日',
      why: `身体活動レベル「${PAL_LABEL[pal]}」（表4）。${
        input.palIncludesTraining
          ? '筋トレを含めて選んだので、運動分は足しません（二重加算しない）。'
          : '筋トレを含めずに選んだので、次の行で筋トレ分だけを足します。'
      }`,
      sourceId: 'dri2025_energy',
    },
  ];
  let total = base;
  const minutes = input.trainingMinutesPerWeek ?? 0;
  if (!input.palIncludesTraining && minutes > 0) {
    // 安静時（1メッツ）の分は基礎代謝・PALに入っているので、(メッツ − 1) だけ足す
    const extra = ((RESISTANCE_TRAINING_METS - 1) * weightKg * (minutes / 60)) / 7;
    total += extra;
    steps.push({
      label: '筋トレ分（1日あたり平均）',
      formula: `(${RESISTANCE_TRAINING_METS} メッツ − 1) × ${weightKg} kg × 週${minutes}分 ÷ 60 ÷ 7日`,
      value: extra,
      unit: 'kcal/日',
      why: '安静時の1メッツ分はすでに上の式に入っているので引いてから足す（二重加算を避ける）。メッツ×体重×時間 ≒ kcal は近似。',
      sourceId: 'ainsworth2011_mets',
    });
  }
  return { kcalPerDay: total, steps, missing: [] };
}

// ---------------------------------------------------------------- 1日の目安

/** 本人が明示的に選んだときだけ使う（目標から自動では選ばない） */
export const ENERGY_GOAL = {
  maintain: { factor: 1.0, label: '体重を維持する' },
  gain: { factor: 1.1, label: 'ゆっくり増やす（+10%）' },
  lose: { factor: 0.9, label: 'ゆっくり減らす（−10%）' },
};

const KCAL_PER_G = { protein: 4, fat: 9, carb: 4 };

/**
 * 1日の目安を計算する。足りない入力があれば、計算できる項目だけ返す。
 * body: { enabled, age, sex, heightCm, weightKg, pal, palIncludesTraining, energyGoal }
 * trainingDaysPerWeek, trainingMinutesPerWeek: 筋トレ計画から
 */
export function computeDailyTargets(body, { trainingDaysPerWeek = 0, trainingMinutesPerWeek = 0 } = {}) {
  const result = { energy: null, protein: null, fat: null, carb: null, missing: [], notes: [] };
  if (!body?.enabled) {
    result.notes.push('個別計算はオフです（設定でオンにできます）。');
    return result;
  }
  const weightKg = body.weightKg > 0 ? body.weightKg : null;
  const trains = trainingDaysPerWeek > 0;

  const est = estimateMaintenanceEnergy({
    age: body.age,
    sex: body.sex,
    weightKg: body.weightKg,
    pal: body.pal,
    palIncludesTraining: body.palIncludesTraining !== false,
    trainingMinutesPerWeek,
  });
  result.missing.push(...est.missing);

  if (est.kcalPerDay != null) {
    const goalKey = ENERGY_GOAL[body.energyGoal] ? body.energyGoal : 'maintain';
    const goal = ENERGY_GOAL[goalKey];
    const kcal = est.kcalPerDay * goal.factor;
    const steps = [...est.steps];
    if (goal.factor !== 1) {
      steps.push({
        label: '本人が選んだ調整',
        formula: `${est.kcalPerDay.toFixed(0)} kcal × ${goal.factor}`,
        value: kcal,
        unit: 'kcal/日',
        why: `設定で「${goal.label}」を選んだため。±10%はアプリ独自の控えめな値。`,
        sourceId: 'app',
      });
    }
    result.energy = { value: kcal, unit: 'kcal/日', steps };
  }

  // たんぱく質
  if (weightKg && trains) {
    const gPerKg = 1.6;
    result.protein = {
      value: gPerKg * weightKg,
      unit: 'g/日',
      range: [1.4 * weightKg, 2.0 * weightKg],
      steps: [
        {
          label: 'たんぱく質',
          formula: `${gPerKg} g/kg × 体重 ${weightKg} kg（幅 1.4〜2.0 g/kg）`,
          value: gPerKg * weightKg,
          unit: 'g/日',
          why: '筋トレをしている人向けの指針の幅（1.4〜2.0）のうち、筋肉の増え方が頭打ちになりやすい1.6 g/kgを中心値に採用。',
          sourceId: 'issn2017_protein',
          sourceIds: ['issn2017_protein', 'morton2018'],
        },
      ],
    };
  } else if (result.energy) {
    const e = result.energy.value;
    result.protein = {
      value: (e * 0.165) / KCAL_PER_G.protein,
      unit: 'g/日',
      range: [(e * 0.13) / 4, (e * 0.2) / 4],
      steps: [
        {
          label: 'たんぱく質',
          formula: `${e.toFixed(0)} kcal × 13〜20% ÷ 4 kcal/g（中央16.5%）`,
          value: (e * 0.165) / 4,
          unit: 'g/日',
          why: trains ? '体重が未入力のため、エネルギー比で計算。' : '筋トレの予定がないため、一般向けの目標量（エネルギー比）を使用。',
          sourceId: 'dri2025_protein',
        },
      ],
    };
  } else if (weightKg) {
    result.protein = {
      value: null,
      unit: 'g/日',
      range: null,
      steps: [],
    };
    result.notes.push('筋トレの曜日が未設定、かつエネルギーが計算できないため、たんぱく質の目安は出せません。');
  }

  if (result.energy) {
    const e = result.energy.value;
    const fatG = (e * 0.25) / KCAL_PER_G.fat;
    result.fat = {
      value: fatG,
      unit: 'g/日',
      range: [(e * 0.2) / 9, (e * 0.3) / 9],
      steps: [
        {
          label: '脂質',
          formula: `${e.toFixed(0)} kcal × 25% ÷ 9 kcal/g（目標量20〜30%の中央）`,
          value: fatG,
          unit: 'g/日',
          why: '目標量の幅の中央をとった（中央をとるのはアプリ独自）。',
          sourceId: 'dri2025_fat',
        },
      ],
    };
    if (result.protein?.value != null) {
      const proteinKcal = result.protein.value * KCAL_PER_G.protein;
      const carbKcal = e - proteinKcal - fatG * KCAL_PER_G.fat;
      const carbG = carbKcal / KCAL_PER_G.carb;
      const carbPct = carbKcal / e;
      const proteinPct = proteinKcal / e;
      result.carb = {
        value: carbG,
        unit: 'g/日',
        range: [(e * 0.5) / 4, (e * 0.65) / 4],
        steps: [
          {
            label: '炭水化物',
            formula: `(${e.toFixed(0)} − たんぱく質 ${proteinKcal.toFixed(0)} − 脂質 ${(fatG * 9).toFixed(0)}) kcal ÷ 4 kcal/g`,
            value: carbG,
            unit: 'g/日',
            why: `残りを炭水化物に。エネルギー比 ${(carbPct * 100).toFixed(0)}%（目標量 50〜65%）${
              weightKg ? `、体重あたり ${(carbG / weightKg).toFixed(1)} g/kg（軽い運動の人の目安 3〜5 g/kg）` : ''
            }。`,
            sourceId: 'dri2025_carb',
            sourceIds: ['dri2025_carb', 'acsm2016_nutrition'],
          },
        ],
      };
      if (proteinPct > 0.2) {
        result.notes.push(
          `たんぱく質がエネルギーの${(proteinPct * 100).toFixed(0)}%で、食事摂取基準の目標量（上限20%）を超えています。運動者向け指針を優先した結果です。`,
        );
      }
      if (carbPct < 0.5) {
        result.notes.push(`炭水化物がエネルギーの${(carbPct * 100).toFixed(0)}%で、目標量（50〜65%）を下回っています。`);
      }
    }
  }
  result.notes.push('換算係数 4・9・4 kcal/g は一般的な近似で、食品ごとのエネルギー（成分表）とは少しずれます。');
  return result;
}

/** 1食あたりのたんぱく質の目安 (g)。体重が分かるときだけ */
export function proteinPerMealTarget(weightKg) {
  if (!(weightKg > 0)) return null;
  return { value: 0.4 * weightKg, unit: 'g/食', sourceId: 'schoenfeld2018_meal' };
}

// ---------------------------------------------------------------- 体重の傾向

/**
 * 体重の数週間の傾向と、食事記録の充足度。摂取目標は絶対に自動変更しない（提案文だけ返す）。
 * weights: [{date:'YYYY-MM-DD', kg}], mealsByDate: {date:[records]}, mealsPerDay: 数
 */
export function analyzeWeightTrend(weights, mealsByDate, mealsPerDay, today) {
  const MIN_DAYS_SPAN = 21; // アプリ独自：3週間
  const MIN_POINTS = 8;
  const MIN_COMPLETENESS = 0.6;
  const sorted = [...weights].filter((w) => w.kg > 0).sort((a, b) => a.date.localeCompare(b.date));
  const t0 = sorted.length ? Date.parse(sorted[0].date) : null;
  const spanDays = sorted.length ? (Date.parse(sorted.at(-1).date) - t0) / 86400000 : 0;

  // 記録の充足度：体重を測り始めてから今日まで、1日の想定食事回数に対し「量が分かる記録」があった割合
  let expected = 0;
  let got = 0;
  if (sorted.length) {
    for (let t = t0; t <= Date.parse(today); t += 86400000) {
      const d = new Date(t).toISOString().slice(0, 10);
      expected += mealsPerDay;
      const recs = mealsByDate[d] ?? [];
      got += Math.min(mealsPerDay, recs.filter((m) => mealNutrients(m).known).length);
    }
  }
  const completeness = expected ? got / expected : 0;

  const base = { points: sorted.length, spanDays, completeness, slopeKgPerWeek: null, changeTargets: false };
  if (sorted.length < MIN_POINTS || spanDays < MIN_DAYS_SPAN) {
    return {
      ...base,
      status: 'insufficient',
      message: `判断にはまだ材料が足りません（3週間以上・8回以上の記録が目安。今は${sorted.length}回・${Math.floor(spanDays)}日分）。1日だけの増減では目標を変えません。`,
    };
  }
  // 最小二乗法の傾き (kg/日) → kg/週
  const xs = sorted.map((w) => (Date.parse(w.date) - t0) / 86400000);
  const ys = sorted.map((w) => w.kg);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let num = 0;
  let den = 0;
  xs.forEach((x, i) => {
    num += (x - mx) * (ys[i] - my);
    den += (x - mx) ** 2;
  });
  const slopeKgPerWeek = den ? (num / den) * 7 : 0;
  if (completeness < MIN_COMPLETENESS) {
    return {
      ...base,
      slopeKgPerWeek,
      status: 'low_records',
      message: `体重の傾向は週あたり ${slopeKgPerWeek.toFixed(2)} kg ですが、食事の記録が想定の${Math.round(
        completeness * 100,
      )}%しかないため、推定が合っているかは判断しません。`,
    };
  }
  return {
    ...base,
    slopeKgPerWeek,
    status: 'ok',
    message: `体重は週あたり ${slopeKgPerWeek.toFixed(2)} kg の傾向（記録の充足度 ${Math.round(
      completeness * 100,
    )}%）。目標と比べてずれていれば、設定から自分で目安を見直せます（自動では変えません）。`,
  };
}

// 達成感の仕組み。設計の考え方（プロの視点）：
//  1. ほめるのは「結果（体重など）」ではなく「行動（続けた・記録した・作った）」。結果は自分では決めきれないが、行動は決められる。
//  2. 1週休んでも記録は途切れない。習慣化の研究では、1回抜けても習慣の形成にはほとんど影響しなかった（Lally ほか 2010）。
//     「全部か無か」の連続記録は、1回途切れるとやめてしまう原因になるので使わない。
//  3. 自己ベストは「限界まで追い込んだ回数」ではなく、計画どおりの範囲でできた重さ・回数で数える。痛みのある記録は数えない。
import { EXERCISE_BY_ID } from './training.js';
import { RECIPE_BY_ID, SKILLS } from './recipes.js';
import { skillProgress, SKILL_MASTER_COUNT, cookingLevel, addDaysStr } from './kitchen.js';

/** 週の目標：筋トレは週2回（ACSM 2026の「週2回以上」）。計画が週1日なら1回 */
export function weekStatus(state, weekStart, today) {
  const dates = Array.from({ length: 7 }, (_, i) => addDaysStr(weekStart, i));
  const planned = Object.values(state.profile.training.days).filter((d) => d.on).length;
  const target = Math.min(2, planned);
  const done = dates.filter((d) => state.workouts[d]?.status === 'done').length;
  const mealDays = dates.filter((d) => (state.meals[d] ?? []).length > 0).length;
  const cooked = (state.kitchen?.cookLog ?? []).filter((c) => dates.includes(c.date)).length;
  const finished = addDaysStr(weekStart, 6) < today;
  const started = !state.profile.setupDate || addDaysStr(weekStart, 6) >= state.profile.setupDate;
  return {
    weekStart,
    target,
    done,
    mealDays,
    cooked,
    achieved: target > 0 && done >= target,
    finished,
    started,
  };
}

/**
 * 直近 n 週。連続記録は「1週だけの休みは途切れない、2週続けて未達成なら途切れる」。
 * 今週がまだ終わっていなくて未達成なら、数えずに保留する。
 */
export function weeklyHistory(state, today, n = 12) {
  const [y, m, d] = today.split('-').map(Number);
  const t = new Date(y, m - 1, d);
  const thisWeek = addDaysStr(today, -((t.getDay() + 6) % 7));
  const weeks = Array.from({ length: n }, (_, i) => weekStatus(state, addDaysStr(thisWeek, -7 * (n - 1 - i)), today));
  let streak = 0;
  let missRun = 0;
  for (let i = weeks.length - 1; i >= 0; i -= 1) {
    const w = weeks[i];
    if (!w.started) break;
    if (!w.finished && !w.achieved) continue; // 今週は保留
    if (w.achieved) {
      streak += 1;
      missRun = 0;
    } else {
      missRun += 1;
      if (missRun >= 2) break;
    }
  }
  const achievedTotal = weeks.filter((w) => w.achieved).length;
  return { weeks, streak, achievedTotal, current: weeks.at(-1) };
}

/** 自己ベストの一覧と、その日に更新したもの */
export function personalRecords(workouts) {
  const best = {};
  const events = [];
  for (const date of Object.keys(workouts).sort()) {
    const w = workouts[date];
    if (w?.status !== 'done') continue;
    for (const log of w.actual ?? []) {
      if (log.pain) continue; // 痛みのある記録は自己ベストに数えない
      const ex = EXERCISE_BY_ID[log.exId];
      if (!ex) continue;
      const plan = w.planSnapshot?.exercises?.find((e) => e.exId === log.exId);
      const minReps = plan?.repMin ?? 1;
      const b = (best[log.exId] ??= { maxKg: null, maxReps: null });
      for (const s of log.sets ?? []) {
        if (!(s.reps > 0)) continue;
        if (ex.increment && s.kg > 0 && s.reps >= minReps) {
          if (!b.maxKg || s.kg > b.maxKg.kg || (s.kg === b.maxKg.kg && s.reps > b.maxKg.reps)) {
            const first = !b.maxKg;
            b.maxKg = { kg: s.kg, reps: s.reps, date };
            if (!first) events.push({ date, exId: log.exId, text: `${ex.name} ${s.kg}kg×${s.reps}回` });
          }
        } else if (!ex.increment) {
          if (!b.maxReps || s.reps > b.maxReps.reps) {
            const first = !b.maxReps;
            b.maxReps = { reps: s.reps, date };
            if (!first) events.push({ date, exId: log.exId, text: `${ex.name} ${s.reps}${ex.unit === 'sec' ? '秒' : '回'}` });
          }
        }
      }
    }
  }
  // 同じ日に同じ種目で何度も更新したら最後の1つだけ
  const dedup = new Map(events.map((e) => [`${e.date}:${e.exId}`, e]));
  return { best, events: [...dedup.values()] };
}

export function totals(state) {
  const done = Object.values(state.workouts).filter((w) => w.status === 'done');
  return {
    workouts: done.length,
    sets: done.reduce((a, w) => a + (w.actual ?? []).reduce((b, l) => b + (l.sets?.length ?? 0), 0), 0),
    cooked: state.kitchen?.cookLog?.length ?? 0,
    mealsRecorded: Object.values(state.meals).reduce((a, l) => a + l.length, 0),
  };
}

/** バッジ。すべて「行動」に対して出す */
export function badges(state, today) {
  const t = totals(state);
  const hist = weeklyHistory(state, today, 52);
  const prs = personalRecords(state.workouts).events.length;
  const skills = skillProgress(state.kitchen?.cookLog ?? []);
  const mastered = Object.values(skills).filter((n) => n >= SKILL_MASTER_COUNT).length;
  const batches = (state.kitchen?.cookLog ?? []).filter((c) => (RECIPE_BY_ID[c.recipeId]?.servings ?? 1) > 1).length;
  const level = cookingLevel(state.kitchen?.cookLog ?? []);
  const list = [
    { id: 'first_workout', name: 'はじめの一歩', desc: '筋トレを初めて記録した', got: t.workouts >= 1 },
    { id: 'week2', name: '週2回クリア', desc: '1週間に2回筋トレした（ACSMの目安）', got: hist.achievedTotal >= 1 },
    { id: 'weeks4', name: '4週間の積み重ね', desc: '週の目標を合計4回達成（連続でなくてOK）', got: hist.achievedTotal >= 4 },
    { id: 'weeks12', name: '習慣の土台', desc: '週の目標を合計12回達成', got: hist.achievedTotal >= 12 },
    { id: 'pr1', name: '自己ベスト', desc: '自己ベストを初めて更新した', got: prs >= 1 },
    { id: 'pr10', name: '伸び続ける', desc: '自己ベストを10回更新した', got: prs >= 10 },
    { id: 'meals20', name: '記録の習慣', desc: '食事を20回記録した（量が分からない記録も数える）', got: t.mealsRecorded >= 20 },
    { id: 'cook1', name: '自炊デビュー', desc: 'アプリのレシピで初めて作った', got: t.cooked >= 1 },
    { id: 'cook10', name: '台所に立つ人', desc: '10回作った', got: t.cooked >= 10 },
    { id: 'batch3', name: '作り置き上手', desc: '作り置きを3回した', got: batches >= 3 },
    { id: 'skill1', name: '技を1つ習得', desc: `同じスキルを${SKILL_MASTER_COUNT}回くり返した`, got: mastered >= 1 },
    { id: 'skill5', name: '技を5つ習得', desc: '5つのスキルを身につけた', got: mastered >= 5 },
    { id: 'level3', name: '料理レベル3', desc: '段取りが必要なレシピに進んだ', got: level >= 3 },
    { id: 'shopping', name: '計画的な買い出し', desc: '買い出しリストで買い物を終えた', got: !!state.kitchen?.lastShoppingOn },
  ];
  const seen = new Set(state.badgesSeen ?? []);
  return list.map((b) => ({ ...b, isNew: b.got && !seen.has(b.id) }));
}

export function skillTree(cookLog) {
  const counts = skillProgress(cookLog);
  return Object.entries(SKILLS).map(([key, s]) => ({
    key,
    ...s,
    count: counts[key] ?? 0,
    mastered: (counts[key] ?? 0) >= SKILL_MASTER_COUNT,
  }));
}

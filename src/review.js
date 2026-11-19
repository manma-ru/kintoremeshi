// 週ごとの振り返りと、翌週に変えることの提案（1つだけ）。採用したときだけ計画に反映する。
import { addDays, dowKey, weekStartOf, sessionForDate } from './state.js';
import { dayTotals } from './nutrition.js';
import { EXERCISE_BY_ID, DOW_LABEL } from './training.js';

export function weekDates(weekStart) {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

function totalReps(log) {
  return (log.sets ?? []).reduce((a, s) => a + (s.reps ?? 0), 0);
}
function topKg(log) {
  const ks = (log.sets ?? []).map((s) => s.kg).filter((k) => k != null);
  return ks.length ? Math.max(...ks) : null;
}

export function weeklyReview(state, weekStart, today) {
  const dates = weekDates(weekStart);
  const usual = state.profile.training.days;

  // ---- 筋トレ：予定と実施
  const startDate = state.profile.setupDate ?? '0000-00-00';
  const days = dates.map((date) => {
    const w = state.workouts[date];
    if (date < startDate && !w) {
      return { date, dow: dowKey(date), planned: false, status: 'before_start', usualMin: null, plannedMin: null, shortened: false };
    }
    const planned = w?.planSnapshot ? true : !sessionForDate(state, date).rest;
    const ov = state.overrides[date];
    const usualMin = w?.usualMinutes ?? usual[dowKey(date)]?.minutes ?? null;
    const plannedMin = w?.plannedMinutes ?? ov?.minutes ?? usualMin;
    return {
      date,
      dow: dowKey(date),
      planned,
      status: w?.status ?? (date < today && planned ? 'not_done' : planned ? 'upcoming' : 'rest'),
      usualMin,
      plannedMin,
      shortened: planned && usualMin != null && plannedMin != null && plannedMin < usualMin,
    };
  });
  const plannedCount = days.filter((d) => d.planned).length;
  const elapsedPlanned = days.filter((d) => d.planned && d.date <= today).length;
  const doneCount = days.filter((d) => d.status === 'done').length;
  const notDone = days.filter((d) => d.status === 'not_done' || d.status === 'skipped');

  // ---- 重量・回数の変化（今週の最後の記録 vs 今週より前の最後の記録）
  const changes = [];
  const seen = new Set();
  for (const date of [...dates].reverse()) {
    const w = state.workouts[date];
    if (w?.status !== 'done') continue;
    for (const log of w.actual ?? []) {
      if (seen.has(log.exId)) continue;
      seen.add(log.exId);
      const prevDate = Object.keys(state.workouts)
        .filter((d) => d < weekStart && state.workouts[d]?.status === 'done' && state.workouts[d].actual?.some((a) => a.exId === log.exId))
        .sort()
        .at(-1);
      const prev = prevDate ? state.workouts[prevDate].actual.find((a) => a.exId === log.exId) : null;
      changes.push({
        exId: log.exId,
        name: EXERCISE_BY_ID[log.exId]?.name ?? log.exId,
        kgNow: topKg(log),
        kgPrev: prev ? topKg(prev) : null,
        repsNow: totalReps(log),
        repsPrev: prev ? totalReps(prev) : null,
        pain: !!log.pain,
        prevDate,
      });
    }
  }

  // ---- 食事記録（記録のない食事は欠食扱いにしない）
  let recordedMeals = 0;
  let unknownAmountMeals = 0;
  let daysWithRecords = 0;
  let proteinKnown = 0;
  for (const date of dates) {
    const recs = state.meals[date] ?? [];
    if (recs.length) daysWithRecords += 1;
    const t = dayTotals(recs);
    recordedMeals += t.recordedMeals;
    unknownAmountMeals += t.partialMeals;
    proteinKnown += t.total.protein;
  }

  const proposal = makeProposal(state, weekStart, days, changes, { plannedCount, elapsedPlanned, doneCount });

  return {
    weekStart,
    days,
    plannedCount,
    doneCount,
    notDone,
    changes,
    meals: {
      recordedMeals,
      unknownAmountMeals,
      daysWithRecords,
      proteinAvgOnRecordedDays: daysWithRecords ? proteinKnown / daysWithRecords : null,
    },
    proposal,
    proposalStatus: state.proposals[weekStart]?.status ?? null,
  };
}

/** 翌週に変えることを1つだけ、理由つきで */
export function makeProposal(state, weekStart, days, changes, { plannedCount, elapsedPlanned = plannedCount, doneCount }) {
  // 1) 時間を短くした日が2回以上 → 翌週は最初からその長さで組む
  const short = days.filter((d) => d.shortened);
  if (short.length >= 2) {
    const counts = {};
    for (const d of short) counts[d.plannedMin] = (counts[d.plannedMin] ?? 0) + 1;
    const minutes = Number(Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]);
    const dows = [...new Set(short.map((d) => d.dow))];
    return {
      id: `shorten:${dows.join(',')}:${minutes}`,
      kind: 'shorten',
      title: `翌週は${dows.map((k) => DOW_LABEL[k]).join('・')}曜を最初から${minutes}分で組む`,
      reason: `今週は予定（${short[0].usualMin}分）を${short.length}回、${minutes}分版などに短くしました。最初から短い計画にしておくと、毎回変更する手間がなくなり、「予定どおりできた」日が増えます。`,
      apply: { kind: 'set_minutes', dows, minutes },
      sourceIds: ['acsm2026_rt'],
    };
  }
  // 2) 実施が予定の半分以下 → 日数を1日減らす
  // まだ来ていない日・使い始める前の日は数えない
  if (elapsedPlanned >= 3 && doneCount <= elapsedPlanned / 2) {
    const missed = days.filter((d) => d.status === 'not_done' || d.status === 'skipped');
    const drop = missed.at(-1)?.dow ?? days.filter((d) => d.planned).at(-1).dow;
    return {
      id: `dropday:${drop}`,
      kind: 'drop_day',
      title: `翌週は${DOW_LABEL[drop]}曜を休養日にして、週${plannedCount - 1}日にする`,
      reason: `今週は（今日までの）予定${elapsedPlanned}日のうち${doneCount}日の実施でした。週2日以上あれば主要な筋肉を週2回刺激できるので、続けられる日数にそろえるほうが効果的です。`,
      apply: { kind: 'drop_day', dow: drop },
      sourceIds: ['acsm2026_rt'],
    };
  }
  // 3) 痛みを記録した種目 → 代替種目に替える
  const painful = changes.find((c) => c.pain);
  if (painful) {
    return {
      id: `swap:${painful.exId}`,
      kind: 'swap',
      title: `「${painful.name}」を外して、同じ部位の別の種目にする`,
      reason: `今週「${painful.name}」で痛みを記録しました。同じ部位を鍛えられる別の種目に替えて様子を見ます（痛みが続くなら専門家に相談を）。`,
      apply: { kind: 'swap', exId: painful.exId },
      sourceIds: ['app'],
    };
  }
  return {
    id: 'keep',
    kind: 'keep',
    title: '今の計画を続ける',
    reason:
      plannedCount === 0
        ? '筋トレの曜日がまだ設定されていません。設定から曜日を選ぶと計画が作られます。'
        : `今週は予定${plannedCount}日のうち${doneCount}日を実施。大きく変える理由が見つからないので、種目ごとの次回提案（記録画面）で少しずつ進めます。`,
    apply: null,
    sourceIds: [],
  };
}

/** 採用したときだけ呼ぶ */
export function applyProposal(state, weekStart, proposal) {
  const a = proposal.apply;
  if (a?.kind === 'set_minutes') {
    for (const k of a.dows) state.profile.training.days[k].minutes = a.minutes;
  } else if (a?.kind === 'drop_day') {
    state.profile.training.days[a.dow].on = false;
  } else if (a?.kind === 'swap') {
    state.avoid = [...new Set([...(state.avoid ?? []), a.exId])];
    // 普段から指定していた種目なら、その指定も外す
    const ex = EXERCISE_BY_ID[a.exId];
    if (state.swapsDefault[ex.pattern] === a.exId) delete state.swapsDefault[ex.pattern];
  }
  state.proposals[weekStart] = { id: proposal.id, status: 'adopted' };
  return state;
}

export function dismissProposal(state, weekStart, proposal) {
  state.proposals[weekStart] = { id: proposal.id, status: 'dismissed' };
  return state;
}

export { weekStartOf };

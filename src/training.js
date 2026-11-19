// 筋トレの計画と、次回の提案（ルールベース）。
// 回数・休憩・増量幅：ACSM 2009（acsm2009_rt）、頻度・量：ACSM 2026（acsm2026_rt）、強度の記録：RIR（zourdos2016_rir）

export const EQUIPMENT = {
  bodyweight: '自重（器具なし）',
  dumbbell: 'ダンベル',
  barbell: 'バーベル',
  rack: 'スクワットラック',
  bench: 'ベンチ',
  machine: 'マシン（ジム）',
  band: 'チューブ・バンド',
  pullupbar: '懸垂バー',
};

export const PATTERNS = {
  squat: 'しゃがむ（脚前側・お尻）',
  hinge: '股関節を曲げる（もも裏・お尻・背中）',
  hpush: '前に押す（胸・腕の後ろ）',
  hpull: '手前に引く（背中・腕の前）',
  vpush: '上に押す（肩）',
  vpull: '上から引く（背中の広い筋肉）',
  lunge: '片脚（脚・お尻・バランス）',
  core: '体幹（お腹まわり）',
};

const EXP_RANK = { none: 0, beginner: 1, intermediate: 2 };

// needs: すべて必要な器具。minExp: 推奨する最低経験。increment: 増量刻みの設定キー
export const EXERCISES = [
  // squat
  { id: 'bb_squat', name: 'バーベルスクワット', pattern: 'squat', needs: ['barbell', 'rack'], compound: true, minExp: 'intermediate', increment: 'barbell', muscles: '太もも前・お尻', cues: ['足は肩幅、つま先はやや外', 'ひざとつま先の向きをそろえる', '背中を丸めず、太ももが床と平行付近まで'] },
  { id: 'leg_press', name: 'レッグプレス', pattern: 'squat', needs: ['machine'], compound: true, minExp: 'none', increment: 'machine', muscles: '太もも前・お尻', cues: ['腰を背もたれから浮かせない', 'ひざを伸ばし切ってロックしない'] },
  { id: 'goblet_squat', name: 'ゴブレットスクワット', pattern: 'squat', needs: ['dumbbell'], compound: true, minExp: 'none', increment: 'dumbbell', muscles: '太もも前・お尻', cues: ['ダンベルを胸の前で縦に持つ', 'ひじがひざの内側を通るまでしゃがむ', 'かかとに体重'] },
  { id: 'bw_squat', name: '自重スクワット', pattern: 'squat', needs: ['bodyweight'], compound: true, minExp: 'none', increment: null, muscles: '太もも前・お尻', cues: ['椅子に座るようにお尻を後ろへ', 'かかとを浮かせない', '慣れたら下で1秒止める'] },
  // hinge
  { id: 'bb_rdl', name: 'バーベル・ルーマニアンデッドリフト', pattern: 'hinge', needs: ['barbell'], compound: true, minExp: 'beginner', increment: 'barbell', muscles: 'もも裏・お尻・背中', cues: ['ひざは軽く曲げたまま固定', 'お尻を後ろに引いてバーを太ももに沿わせる', '背中を丸めない'] },
  { id: 'db_rdl', name: 'ダンベル・ルーマニアンデッドリフト', pattern: 'hinge', needs: ['dumbbell'], compound: true, minExp: 'none', increment: 'dumbbell', muscles: 'もも裏・お尻・背中', cues: ['ひざは軽く曲げたまま', 'お尻を後ろに引く', 'もも裏が伸びたところで戻る'] },
  { id: 'hip_lift', name: 'ヒップリフト（自重）', pattern: 'hinge', needs: ['bodyweight'], compound: true, minExp: 'none', increment: null, muscles: 'お尻・もも裏', cues: ['あおむけでひざを立てる', 'お尻を上げ、肩〜ひざを一直線に', '上で1秒止める'] },
  // hpush
  { id: 'bench_press', name: 'ベンチプレス', pattern: 'hpush', needs: ['barbell', 'bench', 'rack'], compound: true, minExp: 'beginner', increment: 'barbell', muscles: '胸・腕の後ろ・肩前', cues: ['肩甲骨を寄せて下げる', 'バーはみぞおち付近に下ろす', '必ずセーフティを設定'] },
  { id: 'db_bench', name: 'ダンベルベンチプレス', pattern: 'hpush', needs: ['dumbbell', 'bench'], compound: true, minExp: 'none', increment: 'dumbbell', muscles: '胸・腕の後ろ・肩前', cues: ['肩甲骨を寄せる', 'ひじは体から45度くらい', '胸の横まで下ろす'] },
  { id: 'chest_press', name: 'チェストプレス（マシン）', pattern: 'hpush', needs: ['machine'], compound: true, minExp: 'none', increment: 'machine', muscles: '胸・腕の後ろ', cues: ['グリップが胸の高さになるよう座面を調整', '肩をすくめない'] },
  { id: 'db_floor_press', name: 'ダンベルフロアプレス', pattern: 'hpush', needs: ['dumbbell'], compound: true, minExp: 'none', increment: 'dumbbell', muscles: '胸・腕の後ろ', cues: ['床にあおむけ、ひじが床に軽く触れるまで下ろす', 'ひじは体から45度'] },
  { id: 'pushup', name: '腕立て伏せ', pattern: 'hpush', needs: ['bodyweight'], compound: true, minExp: 'beginner', increment: null, harder: null, muscles: '胸・腕の後ろ・体幹', cues: ['頭からかかとまで一直線', '胸が床に近づくまで下ろす', 'ひじを開きすぎない'] },
  { id: 'knee_pushup', name: '膝つき腕立て伏せ', pattern: 'hpush', needs: ['bodyweight'], compound: true, minExp: 'none', increment: null, harder: 'pushup', muscles: '胸・腕の後ろ', cues: ['頭からひざまで一直線', '胸を床に近づける'] },
  // hpull
  { id: 'cable_row', name: 'シーテッドロウ（マシン）', pattern: 'hpull', needs: ['machine'], compound: true, minExp: 'none', increment: 'machine', muscles: '背中・腕の前', cues: ['胸を張ったまま引く', '肩甲骨を寄せてから腕を引く'] },
  { id: 'bb_row', name: 'バーベルロウ', pattern: 'hpull', needs: ['barbell'], compound: true, minExp: 'intermediate', increment: 'barbell', muscles: '背中・腕の前', cues: ['上体は45度前傾で固定', 'へそに向かって引く'] },
  { id: 'db_row', name: 'ワンハンド・ダンベルロウ', pattern: 'hpull', needs: ['dumbbell'], compound: true, minExp: 'none', increment: 'dumbbell', muscles: '背中・腕の前', cues: ['片手と片ひざを台や椅子につく', 'ダンベルを腰のほうへ引く', '体をねじらない'] },
  { id: 'band_row', name: 'バンドロウ', pattern: 'hpull', needs: ['band'], compound: true, minExp: 'none', increment: null, muscles: '背中・腕の前', cues: ['足にバンドをかけて座る', '肩甲骨を寄せて引く'] },
  { id: 'prone_ytw', name: 'うつ伏せ Y・T・W（自重）', pattern: 'hpull', needs: ['bodyweight'], compound: false, minExp: 'none', increment: null, muscles: '背中上部・肩の後ろ', cues: ['うつ伏せで腕をY・T・Wの形に上げる', '首はすくめない', '上で1秒止める'] },
  // vpush
  { id: 'machine_shoulder', name: 'ショルダープレス（マシン）', pattern: 'vpush', needs: ['machine'], compound: true, minExp: 'none', increment: 'machine', muscles: '肩・腕の後ろ', cues: ['腰を反らせない', 'ひじを伸ばし切らない'] },
  { id: 'db_shoulder', name: 'ダンベルショルダープレス', pattern: 'vpush', needs: ['dumbbell'], compound: true, minExp: 'none', increment: 'dumbbell', muscles: '肩・腕の後ろ', cues: ['座って行うと腰が安定', '耳の横から真上に押す'] },
  { id: 'pike_pushup', name: 'パイクプッシュアップ', pattern: 'vpush', needs: ['bodyweight'], compound: true, minExp: 'beginner', increment: null, muscles: '肩・腕の後ろ', cues: ['お尻を高く上げた「へ」の字', '頭を手の間に下ろす'] },
  // vpull
  { id: 'lat_pulldown', name: 'ラットプルダウン', pattern: 'vpull', needs: ['machine'], compound: true, minExp: 'none', increment: 'machine', muscles: '背中の広い筋肉・腕の前', cues: ['胸を張ってバーを鎖骨へ', '反動を使わない'] },
  { id: 'pullup', name: '懸垂', pattern: 'vpull', needs: ['pullupbar'], compound: true, minExp: 'beginner', increment: null, muscles: '背中の広い筋肉・腕の前', cues: ['肩をすくめず、胸をバーに近づける', 'できない回数は台を使って下ろす動作だけでもよい'] },
  { id: 'band_pulldown', name: 'バンドプルダウン', pattern: 'vpull', needs: ['band'], compound: true, minExp: 'none', increment: null, muscles: '背中の広い筋肉', cues: ['高い位置にバンドを固定', 'ひじを脇腹へ引く'] },
  // lunge
  { id: 'db_split_squat', name: 'ダンベル・スプリットスクワット', pattern: 'lunge', needs: ['dumbbell'], compound: true, minExp: 'none', increment: 'dumbbell', muscles: '太もも・お尻', cues: ['前後に足を開く', '後ろのひざを床近くまで下ろす', '回数は片脚ずつ'] },
  { id: 'split_squat', name: 'スプリットスクワット（自重）', pattern: 'lunge', needs: ['bodyweight'], compound: true, minExp: 'none', increment: null, muscles: '太もも・お尻', cues: ['前後に足を開く', '上体はまっすぐ', '回数は片脚ずつ'] },
  // core
  { id: 'plank', name: 'プランク', pattern: 'core', needs: ['bodyweight'], compound: false, minExp: 'none', increment: null, unit: 'sec', muscles: '体幹', cues: ['ひじは肩の真下', '頭からかかとまで一直線', '腰が落ちたら終了'] },
  { id: 'dead_bug', name: 'デッドバグ', pattern: 'core', needs: ['bodyweight'], compound: false, minExp: 'none', increment: null, muscles: '体幹', cues: ['あおむけで腰を床に押しつけたまま', '反対の手足をゆっくり伸ばす', '回数は左右合計'] },
];

export const EXERCISE_BY_ID = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));

export const SESSION_TEMPLATES = {
  fullA: { name: '全身A', patterns: ['squat', 'hpush', 'hpull', 'hinge', 'vpush', 'core'] },
  fullB: { name: '全身B', patterns: ['hinge', 'hpush', 'vpull', 'lunge', 'hpull', 'core'] },
  upper: { name: '上半身', patterns: ['hpush', 'hpull', 'vpush', 'vpull', 'core'] },
  lower: { name: '下半身', patterns: ['squat', 'hinge', 'lunge', 'core'] },
};

export const DOW_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const DOW_LABEL = { mon: '月', tue: '火', wed: '水', thu: '木', fri: '金', sat: '土', sun: '日' };

/** 優先（筋肥大・筋力・習慣化）と経験から、回数・セット・休憩・余力を決める */
export function prescription(priority, experience, ex) {
  if (ex.unit === 'sec') {
    return { sets: 2, repMin: 20, repMax: 40, restSec: 45, rir: '余裕を残す', unit: 'sec', sourceIds: ['app'] };
  }
  const beginner = EXP_RANK[experience] <= 1;
  let p;
  if (priority === 'strength') {
    p = beginner
      ? { sets: 3, repMin: 6, repMax: 8, restSec: ex.compound ? 150 : 90, rir: '2〜3' }
      : { sets: 3, repMin: 4, repMax: 6, restSec: ex.compound ? 180 : 120, rir: '1〜3' };
  } else if (priority === 'hypertrophy') {
    p = { sets: beginner ? 2 : 3, repMin: 8, repMax: 12, restSec: ex.compound ? 120 : 90, rir: '1〜3' };
  } else {
    p = { sets: 2, repMin: 10, repMax: 15, restSec: 60, rir: '2〜4' };
  }
  // 自重種目は負荷を上げにくいので回数範囲を広げる（アプリ独自）
  if (!ex.increment && priority !== 'habit') p = { ...p, repMax: p.repMax + 3 };
  return { ...p, unit: 'rep', sourceIds: ['acsm2009_rt', 'acsm2026_rt', 'zourdos2016_rir'] };
}

/** 目標から優先を決める（本人が選んでいればそれを優先） */
export function resolvePriority(training) {
  if (training.priority) return training.priority;
  if (training.goal === 'muscle') return 'hypertrophy';
  if (training.goal === 'strength') return 'strength';
  return 'habit'; // 引き締め・習慣化・未設定はまず続けやすい形から
}

export function availableEquipment(training, place) {
  const list = new Set(['bodyweight', ...(training.equipment?.[place] ?? [])]);
  return list;
}

/** その場所・経験で使える種目（パターン別、好ましい順） */
export function optionsForPattern(pattern, equipmentSet, experience) {
  return EXERCISES.filter(
    (e) => e.pattern === pattern && e.needs.every((n) => equipmentSet.has(n)) && EXP_RANK[e.minExp] <= EXP_RANK[experience ?? 'none'],
  );
}

/** 週の計画：休養日を含む7日分 */
export function buildWeekPlan(training) {
  const days = DOW_KEYS.map((k) => ({ dow: k, ...(training.days?.[k] ?? { on: false }) }));
  const on = days.filter((d) => d.on);
  const types = on.length >= 4 ? ['upper', 'lower'] : ['fullA', 'fullB'];
  let i = 0;
  return days.map((d) => {
    if (!d.on) return { dow: d.dow, rest: true };
    const type = types[i % 2];
    i += 1;
    return { dow: d.dow, rest: false, type, minutes: d.minutes ?? 30, place: d.place ?? 'home' };
  });
}

const WORK_SEC_PER_SET = 45; // アプリ独自の仮定：1セットの動作時間

export function estimateExerciseMinutes(p) {
  return (p.sets * (WORK_SEC_PER_SET + p.restSec)) / 60 + 1; // +1分：準備・移動
}

/**
 * 1回分のメニュー。
 * opts: { type, minutes, place, training, adjustments, swaps:{pattern: exId} }
 */
export function buildSession({ type, minutes, place, training, adjustments = {}, swaps = {}, avoid = [] }) {
  const priority = resolvePriority(training);
  const experience = training.experience ?? 'none';
  const eq = availableEquipment(training, place);
  const short = minutes < 20;
  const warmup = minutes >= 20 ? 5 : 2;
  const notes = [];
  if (short) notes.push('短時間版：休憩を最大60秒にし、種目数をしぼっています。');
  let used = warmup;
  const exercises = [];
  for (const pattern of SESSION_TEMPLATES[type].patterns) {
    const all = optionsForPattern(pattern, eq, experience);
    // 外した種目（痛みなど）は、ほかに選べる種目があるときだけ除く
    const kept = all.filter((o) => !avoid.includes(o.id));
    const opts = kept.length ? kept : all;
    if (!opts.length) continue;
    const chosen = opts.find((o) => o.id === swaps[pattern]) ?? opts[0];
    let p = prescription(priority, experience, chosen);
    if (short) p = { ...p, restSec: Math.min(p.restSec, 60) };
    const adj = adjustments[chosen.id];
    if (adj?.sets) p = { ...p, sets: adj.sets };
    const need = estimateExerciseMinutes(p);
    if (used + need > minutes && exercises.length >= 2) break;
    if (used + need > minutes && exercises.length < 2) {
      // 最低2種目は入れる：セットを1つ減らして入れる
      p = { ...p, sets: Math.max(1, p.sets - 1) };
    }
    used += estimateExerciseMinutes(p);
    exercises.push({
      exId: chosen.id,
      pattern,
      sets: p.sets,
      repMin: p.repMin,
      repMax: p.repMax,
      unit: p.unit,
      restSec: p.restSec,
      rir: p.rir,
      loadKg: adj?.loadKg ?? null,
      setTargets: adj?.setTargets ?? null,
      alternatives: opts.filter((o) => o.id !== chosen.id).map((o) => o.id),
      sourceIds: p.sourceIds,
    });
  }
  return {
    type,
    name: SESSION_TEMPLATES[type].name,
    minutes,
    place,
    priority,
    warmupMin: warmup,
    estimatedMinutes: Math.round(used),
    exercises,
    notes,
  };
}

/** 重さの選び方の説明 */
export function loadGuide(ex, p) {
  if (ex.unit === 'sec' || p.unit === 'sec') return `${p.repMin}〜${p.repMax}秒、フォームが崩れる前に終える`;
  if (!ex.increment) return `${p.repMax}回やって、あと${p.rir}回できそうな難しさ。楽すぎたら回数を増やすか、ゆっくり動かす`;
  return `${p.repMax}回やったとき、あと${p.rir}回できそうな重さ（限界までやる必要はない）`;
}

/** 週あたり・パターンあたりのセット数（ACSM 2026：筋肥大は1部位週およそ10セットが目安） */
export function weeklySetsByPattern(sessions) {
  const sets = {};
  for (const s of sessions) for (const e of s.exercises) sets[e.pattern] = (sets[e.pattern] ?? 0) + e.sets;
  return sets;
}

// ---------------------------------------------------------------- 次回の提案

/** 器具の最小刻み (kg) */
export function incrementFor(ex, training) {
  if (!ex.increment) return null;
  const v = training.increments?.[ex.increment];
  const defaults = { dumbbell: 1, barbell: 2.5, machine: 2.5 }; // 一般的な値。設定で変更可
  return v > 0 ? v : defaults[ex.increment];
}

/** 直前の記録（beforeDate より前で、その種目を実施したもの） */
export function lastLogFor(exId, workouts, beforeDate) {
  const dates = Object.keys(workouts)
    .filter((d) => d < beforeDate && workouts[d]?.status === 'done')
    .sort()
    .reverse();
  for (const d of dates) {
    const log = workouts[d].actual?.find((a) => a.exId === exId);
    if (log && log.sets?.length) return { date: d, log, fatigue: workouts[d].fatigue ?? 'normal' };
  }
  return null;
}

const fmtDate = (d) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;

/**
 * 次回の提案。plan: { exId, sets, repMin, repMax }（今の計画）
 * last: lastLogFor の戻り値。戻り値の options は本人が「採用」したときだけ計画に反映する。
 * 痛みの記録がある種目には増量を出さない。
 */
export function nextSuggestion(plan, last, training) {
  const r = nextSuggestionInner(plan, last, training);
  // 疲労が強いと記録した場合は、セットを減らす案を第一候補にする
  if (last?.fatigue === 'high' && r.options.some((o) => o.id === 'reduce_sets') && r.recommendedId !== 'pain_hold') {
    return { ...r, recommendedId: 'reduce_sets', summary: `疲労が強い → セットを減らす（${r.summary}は次回以降）` };
  }
  return r;
}

function nextSuggestionInner(plan, last, training) {
  const ex = EXERCISE_BY_ID[plan.exId];
  if (!last) {
    return {
      summary: '初回：重さ（難しさ）を探す回',
      options: [
        {
          id: 'first',
          kind: 'first',
          label: '初回は重さ探し',
          detail: `${plan.repMax}回やってあと2〜3回できそうな重さを選び、記録してください。次回からこの記録をもとに提案します。`,
          apply: null,
        },
      ],
      recommendedId: 'first',
    };
  }
  const { log, date, fatigue } = last;
  const reps = log.sets.map((s) => s.reps ?? 0);
  const kg = log.sets.find((s) => s.kg != null)?.kg ?? null;
  const unit = ex.unit === 'sec' ? '秒' : '回';
  const rir = log.rir ?? null;
  const when = `前回（${fmtDate(date)}）`;
  const kgText = kg ? `${kg}kgで` : '';
  const repsText = reps.map((r) => `${r}`).join('・') + unit;
  const options = [];

  const hold = (detail) => ({
    id: 'hold',
    kind: 'hold',
    label: '同じ内容でもう一度',
    detail,
    apply: { loadKg: kg, setTargets: reps.map((r) => Math.max(r, plan.repMin)), sets: plan.sets },
  });

  if (log.pain) {
    options.push({
      id: 'pain_hold',
      kind: 'hold_pain',
      label: '増量しない（痛みの記録あり）',
      detail: `${when}この種目で痛みを記録しました。痛みのある種目は増量の候補から外しています。同じか軽い重さで、痛みが出ない範囲だけ行うか、代替種目に替えてください。痛みが続くときは中止して専門家に相談を。`,
      apply: { loadKg: kg, setTargets: null, sets: plan.sets },
    });
    if (ex.increment && kg) {
      const inc = incrementFor(ex, training);
      const lighter = Math.max(0, kg - inc);
      options.push({
        id: 'pain_lighter',
        kind: 'reduce_load',
        label: `1刻み軽くする（${lighter}kg）`,
        detail: `痛みの記録があるため、器具の刻み${inc}kgぶん軽くして様子を見る選択肢です。`,
        apply: { loadKg: lighter, setTargets: null, sets: plan.sets },
      });
    }
    return { summary: `${when}痛みを記録 → 増量しません`, options, recommendedId: 'pain_hold', reasonFrom: log };
  }

  const tired = fatigue === 'high' || log.feel === 'hard';
  if (tired && plan.sets > 1) {
    options.push({
      id: 'reduce_sets',
      kind: 'reduce_sets',
      label: `セットを1つ減らす（${plan.sets}→${plan.sets - 1}セット）`,
      detail: `${when}は${fatigue === 'high' ? '疲労が強い' : '「きつい」'}と記録しました。重さはそのまま、セット数を減らして回復を優先します。`,
      apply: { loadKg: kg, setTargets: null, sets: plan.sets - 1 },
    });
  }

  const doneAllSets = reps.length >= plan.sets;
  const allAtTop = doneAllSets && reps.slice(0, plan.sets).every((r) => r >= plan.repMax);
  const formOk = log.formStable !== false;
  const hasReserve = rir == null ? log.feel === 'easy' : rir >= 1;

  if (!formOk) {
    options.unshift(
      hold(`${when}はフォームが安定しなかったと記録しました。${kgText}同じ内容で、動きを安定させることを優先します（増量しません）。`),
    );
    return { summary: 'フォームの安定を優先', options, recommendedId: 'hold' };
  }

  if (allAtTop && hasReserve) {
    if (ex.increment && kg) {
      const inc = incrementFor(ex, training);
      const newKg = Math.round((kg + inc) * 100) / 100;
      const pct = inc / kg;
      options.unshift({
        id: 'increase',
        kind: 'increase_load',
        label: `${newKg}kgに増やす（+${inc}kg）`,
        detail: `${when}${kgText}${plan.sets}セットすべて上限${plan.repMax}${unit}に届き（${repsText}）、余力も${
          rir != null ? `あと${rir}回` : 'あり'
        }と記録。器具の最小刻み${inc}kgを足し、回数は下限${plan.repMin}${unit}から始めます。`,
        apply: { loadKg: newKg, setTargets: Array(plan.sets).fill(plan.repMin), sets: plan.sets },
      });
      if (pct > 0.1) {
        options.push({
          id: 'more_reps',
          kind: 'same_load_add_reps',
          label: '同じ重さで回数をさらに伸ばす',
          detail: `刻み${inc}kgは今の重さの${Math.round(pct * 100)}%で、目安の増量幅（2〜10%）より大きいので、先に回数を+1〜2回伸ばす選択肢もあります。`,
          apply: { loadKg: kg, setTargets: reps.map((r) => r + 1), sets: plan.sets },
        });
      }
      return { summary: `上限達成＋余力あり → +${inc}kg`, options, recommendedId: 'increase' };
    }
    // 自重・バンドなど
    const harder = EXERCISES.find((e) => e.id === ex.harder);
    if (harder) {
      options.unshift({
        id: 'harder',
        kind: 'harder_variant',
        label: `${harder.name}に進む`,
        detail: `${when}全セット上限${plan.repMax}${unit}に届き（${repsText}）、余力ありと記録。より難しい種目に進みます。`,
        apply: { swapTo: harder.id, setTargets: null, sets: plan.sets },
      });
      return { summary: '上限達成 → 難しい種目へ', options, recommendedId: 'harder' };
    }
    options.unshift({
      id: 'slower',
      kind: 'tempo',
      label: '下ろす動作を3秒にして同じ回数',
      detail: `${when}全セット上限${plan.repMax}${unit}に届き（${repsText}）、余力ありと記録。重りを足せない種目なので、ゆっくり動かして負荷を上げます。`,
      apply: { loadKg: null, setTargets: Array(plan.sets).fill(plan.repMin), sets: plan.sets, tempo: '3秒で下ろす' },
    });
    return { summary: '上限達成 → ゆっくり動かして負荷アップ', options, recommendedId: 'slower' };
  }

  // まだ上限に届いていない：同じ重さで「どのセットをあと1回」かを具体的に
  // 実施しなかったセットは下限回数を目標にする
  const targets = Array.from({ length: plan.sets }, (_, i) => reps[i] ?? plan.repMin);
  let idx = -1;
  let lowest = Infinity;
  for (let i = 0; i < Math.min(plan.sets, reps.length); i += 1) {
    const r = reps[i];
    if (r < plan.repMax && r <= lowest) {
      lowest = r;
      idx = i;
    }
  }
  let detail;
  if (idx === -1) {
    // 上限は届いたが余力なし
    options.unshift(
      hold(`${when}${kgText}上限${plan.repMax}${unit}には届きましたが、余力がほぼない（あと0回）と記録。同じ内容をもう一度、余力を残してできるか確かめてから増量します。`),
    );
    return { summary: '上限達成・余力なし → 同じ内容で安定させる', options, recommendedId: 'hold' };
  }
  targets[idx] = (reps[idx] ?? 0) + 1;
  const belowMin = reps.slice(0, plan.sets).filter((r) => r < plan.repMin).length;
  const nth = `${idx + 1}セット目`;
  if (belowMin === 1 && idx === plan.sets - 1) {
    detail = `${when}は最後のセットだけ${reps[idx]}${unit}で、目標の${plan.repMin}${unit}に届きませんでした（${repsText}）。今回は${kgText.replace('で', '')}同じ重さで、最後のセットをあと1${unit}（${targets[idx]}${unit}）。`;
  } else if (reps[idx] < plan.repMin) {
    detail = `${when}は${nth}が${reps[idx]}${unit}で目標の${plan.repMin}${unit}に届きませんでした（${repsText}）。同じ重さで${nth}をあと1${unit}（${targets[idx]}${unit}）。`;
  } else {
    detail = `${when}${kgText}${repsText}。全セット上限${plan.repMax}${unit}まであと少し。同じ重さで、一番少なかった${nth}をあと1${unit}（${targets[idx]}${unit}）。`;
  }
  if (!doneAllSets) {
    detail += `（前回は${reps.length}セットで終えています）`;
  }
  options.unshift({
    id: 'add_rep',
    kind: 'same_load_add_reps',
    label: `同じ重さで${nth}を+1${unit}`,
    detail,
    apply: { loadKg: kg, setTargets: targets, sets: plan.sets },
  });
  return { summary: `同じ重さで${nth}を+1${unit}`, options, recommendedId: 'add_rep' };
}

// 画面。状態は state.js、計算は nutrition / meals / training / review に任せ、ここは表示と入力だけ。
import { SOURCES } from './sources.js';
import { FOODS } from './foods-data.js';
import {
  FOOD_BY_ID,
  computeDailyTargets,
  dayTotals,
  mealNutrients,
  itemNutrients,
  analyzeWeightTrend,
  PAL_LABEL,
  ENERGY_GOAL,
  proteinPerMealTarget,
} from './nutrition.js';
import { SLOTS, SLOT_ORDER, TEMPLATE_BY_ID, MEAL_TEMPLATES, PLACE_KINDS, suggestMeals, projectedDay, mealAllergens, normalizeDislike, itemsFromTemplate } from './meals.js';
import {
  EQUIPMENT,
  EXERCISE_BY_ID,
  DOW_KEYS,
  DOW_LABEL,
  PATTERNS,
  buildWeekPlan,
  loadGuide,
  nextSuggestion,
  lastLogFor,
  resolvePriority,
  prescription,
} from './training.js';
import {
  loadState,
  saveState,
  defaultState,
  ymd,
  addDays,
  dowKey,
  weekStartOf,
  sessionForDate,
  setOverride,
  clearOverride,
  recordWorkout,
  markSkipped,
  adoptSuggestion,
  mealsOn,
  selectCandidate,
  clearCandidate,
  confirmCandidate,
  addMealRecord,
  updateMealRecord,
  deleteMealRecord,
  remainingSlots,
  nextSlot,
  setWeight,
  trainingVolume,
  STORAGE_KEY,
  allPlaces,
  placeById,
  placeName,
  templateLookup,
  poolFor,
  addPlace,
  deletePlace,
  addMenu,
  deleteMenu,
  menuFromRecord,
} from './state.js';
import { weeklyReview, applyProposal, dismissProposal } from './review.js';
import { esc, kcal, grams, yen, num1, mmdd, restText } from './format.js';

const root = document.getElementById('app');
let state = loadState();
const todayStr = () => ymd(new Date());
const ui = {
  tab: 'today',
  recordDate: todayStr(),
  reviewWeek: weekStartOf(todayStr()),
  showAllCandidates: false,
  editingMeal: null,
  addMealOpen: false,
  addMode: 'food',
  menuMode: 'similar',
  menuFromRec: null,
  flash: '',
};

function commit(msg) {
  const ok = saveState(state);
  ui.flash = ok ? msg ?? '' : '保存できませんでした（ブラウザの設定でストレージが使えない可能性）';
  render();
}

// ---------------------------------------------------------------- 共通部品

const PRIORITY_LABEL = { hypertrophy: '筋肥大（筋肉を大きく）', strength: '筋力向上（重いものを持てる）', habit: '習慣化（続けること）' };
const GOAL_LABEL = {
  muscle: '筋肉を増やす',
  tone: '体を引き締める',
  habit: '運動を習慣にする',
  strength: '筋力を上げる',
  undecided: 'まだ決めていない',
};
const EXP_LABEL = { none: 'ほぼ初めて', beginner: '少し経験あり（半年未満）', intermediate: '続けている（半年以上）' };
const PLACE_LABEL = { home: '家', gym: 'ジム' };
const ALLERGEN_CHOICES = ['卵', '乳', '小麦', 'えび', 'かに', 'くるみ', 'そば', '落花生', '大豆', 'さけ', 'さば', '鶏肉', '豚肉', '牛肉', 'ごま', 'いか', 'バナナ', 'りんご'];

function srcLinks(ids = []) {
  const uniq = [...new Set(ids.filter(Boolean))];
  if (!uniq.length) return '';
  return `<ul class="src">${uniq
    .map((id) => {
      const s = SOURCES[id];
      if (!s) return '';
      const link = s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>` : `<b>${esc(s.title)}</b>`;
      return `<li>${link}（${esc(s.org)}, ${s.year}）${s.url && !s.verified ? ' <span class="muted">※数値は要約から</span>' : ''}${
        s.note ? `<div class="muted small">${esc(s.note)}</div>` : ''
      }</li>`;
    })
    .join('')}</ul>`;
}

function stepsBreakdown(steps) {
  return steps
    .map(
      (s) => `<div class="step">
        <div><b>${esc(s.label)}</b>：${esc(s.formula)} = <b>${s.unit.startsWith('kcal') ? kcal(s.value) : grams(s.value)} ${esc(s.unit)}</b></div>
        <div class="muted small">${esc(s.why)}</div>
        ${srcLinks(s.sourceIds ?? [s.sourceId])}
      </div>`,
    )
    .join('');
}

function targetsNow() {
  return computeDailyTargets(state.profile.body, trainingVolume(state));
}

function itemLabel(it) {
  if (it.basis === 'food') return `${FOOD_BY_ID[it.foodId]?.name ?? ''} ${grams(it.grams)}g`;
  if (it.basis === 'labelPack') return `ラベルの値 ×${it.packages}`;
  if (it.basis === 'label100g') return `ラベル(100gあたり) ${grams(it.grams)}g`;
  return '量・栄養は不明';
}

function nutrientLine(n, { est = true } = {}) {
  return `${kcal(n.kcal)} kcal・たんぱく質 ${grams(n.protein)} g・脂質 ${grams(n.fat)} g・炭水化物 ${grams(n.carb)} g${
    est ? ' <span class="tag">目安</span>' : ''
  }`;
}

// ---------------------------------------------------------------- 初回設定 / 設定

function settingsForm(first) {
  const p = state.profile;
  const t = p.training;
  const f = p.food;
  const b = p.body;
  const radio = (name, value, cur, label) =>
    `<label class="chip"><input type="radio" name="${name}" value="${esc(value)}" ${String(cur) === String(value) ? 'checked' : ''}><span>${esc(label)}</span></label>`;
  const check = (name, value, on, label) =>
    `<label class="chip"><input type="checkbox" name="${name}" value="${esc(value)}" ${on ? 'checked' : ''}><span>${esc(label)}</span></label>`;
  const eqChecks = (place) =>
    Object.entries(EQUIPMENT)
      .filter(([k]) => k !== 'bodyweight')
      .map(([k, v]) => check(`eq_${place}`, k, t.equipment[place]?.includes(k), v))
      .join('');
  const minuteOpts = [10, 15, 20, 30, 45, 60, 90];
  const customAllergies = f.allergies.filter((a) => !ALLERGEN_CHOICES.includes(a));
  return `<form id="settings" class="stack">
    ${first ? `<div class="card intro"><h1>はじめに</h1><p>分かるところだけ入れれば始められます。あとから「設定」でいつでも変えられます。体重などは入れなくても使えます。</p></div>` : ''}
    <section class="card"><h2>目標</h2>
      <div class="chips">${Object.entries(GOAL_LABEL).map(([k, v]) => radio('goal', k, t.goal, v)).join('')}</div>
      <label class="field">いちばん優先すること
        <select name="priority">
          <option value="" ${!t.priority ? 'selected' : ''}>目標から自動で決める（いまは「${esc(PRIORITY_LABEL[resolvePriority({ ...t, priority: '' })])}」）</option>
          ${Object.entries(PRIORITY_LABEL).map(([k, v]) => `<option value="${k}" ${t.priority === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}
        </select></label>
      <p class="muted small">目標が決まっていなくても、まずは続けやすい「習慣化」で始めます。</p>
    </section>
    <section class="card"><h2>筋トレ経験</h2>
      <div class="chips">${Object.entries(EXP_LABEL).map(([k, v]) => radio('experience', k, t.experience, v)).join('')}</div>
    </section>
    <section class="card"><h2>使える器具</h2>
      <p class="muted small">自重（器具なし）はいつでも使えます。</p>
      <h3>家</h3><div class="chips">${eqChecks('home')}</div>
      <h3>ジム・大学のトレーニング室</h3><div class="chips">${eqChecks('gym')}</div>
      <details><summary>重さの最小刻み（増量の提案に使う）</summary>
        <div class="grid3">
          <label class="field">ダンベル (kg)<input name="inc_dumbbell" inputmode="decimal" value="${esc(t.increments.dumbbell)}"></label>
          <label class="field">バーベル (kg)<input name="inc_barbell" inputmode="decimal" value="${esc(t.increments.barbell)}"></label>
          <label class="field">マシン (kg)<input name="inc_machine" inputmode="decimal" value="${esc(t.increments.machine)}"></label>
        </div>
      </details>
    </section>
    <section class="card"><h2>運動できる曜日と時間</h2>
      <table class="days"><tbody>
      ${DOW_KEYS.map((k) => {
        const d = t.days[k];
        return `<tr><td><label class="chip"><input type="checkbox" name="day_${k}" ${d.on ? 'checked' : ''}><span>${DOW_LABEL[k]}</span></label></td>
          <td><select name="min_${k}" aria-label="${DOW_LABEL[k]}曜の時間">${minuteOpts.map((m) => `<option value="${m}" ${d.minutes === m ? 'selected' : ''}>${m}分</option>`).join('')}</select></td>
          <td><select name="place_${k}" aria-label="${DOW_LABEL[k]}曜の場所">${Object.entries(PLACE_LABEL).map(([pk, pv]) => `<option value="${pk}" ${d.place === pk ? 'selected' : ''}>${pv}</option>`).join('')}</select></td></tr>`;
      }).join('')}
      </tbody></table>
      <p class="muted small">選ばなかった曜日は休養日になります。主要な筋肉を週2回以上動かせると効果的です（ACSM 2026）。</p>
    </section>
    <section class="card"><h2>食事</h2>
      <label class="field">1日の食費の予算（円・空欄なら予算で絞らない）<input name="budget" inputmode="numeric" value="${esc(f.budgetPerDayYen ?? '')}"></label>
      <h3>よく使うところ</h3>
      <div class="chips">${allPlaces(state).map((pl) => check('places', pl.id, f.places.includes(pl.id), pl.name)).join('')}</div>
      <p class="muted small">場所を増やしたり、場所ごとのメニューを登録したりするのは、設定画面の「場所とメニュー」から。</p>
      <label class="field">1日の食事回数（間食を除く）
        <select name="mealsPerDay">${[2, 3].map((n) => `<option value="${n}" ${f.mealsPerDay === n ? 'selected' : ''}>${n}回</option>`).join('')}</select></label>
      <h3>アレルギー（候補から除外します）</h3>
      <div class="chips">${ALLERGEN_CHOICES.map((a) => check('allergy', a, f.allergies.includes(a), a)).join('')}</div>
      <label class="field">その他のアレルギー（読点区切り）<input name="allergyOther" value="${esc(customAllergies.join('、'))}"></label>
      <p class="muted small">学食・コンビニは原材料をアプリで確認できないので、候補に「原材料を要確認」と出します。</p>
      <h3>苦手な食材（候補から除外します）</h3>
      ${[...f.dislikes.map(normalizeDislike), { word: '', scope: 'all' }, { word: '', scope: 'all' }]
        .map(
          (d, i) => `<div class="row dislike">
            <input name="dis_w_${i}" value="${esc(d.word)}" placeholder="例：トマト" aria-label="苦手な食材${i + 1}">
            <select name="dis_s_${i}" aria-label="苦手な範囲${i + 1}">
              <option value="raw" ${d.scope === 'raw' ? 'selected' : ''}>生のときだけ苦手</option>
              <option value="all" ${d.scope !== 'raw' ? 'selected' : ''}>加熱・加工品もすべて苦手</option>
            </select></div>`,
        )
        .join('')}
      <p class="muted small">「生のときだけ」にすると、サラダなど生で食べる品目だけを避け、ソースや煮込みは候補に残します。消すときは名前を空にして保存。</p>
    </section>
    <section class="card"><h2>エネルギーと栄養の個別計算（任意）</h2>
      <label class="chip"><input type="checkbox" name="bodyEnabled" ${b.enabled ? 'checked' : ''}><span>個別計算を使う</span></label>
      <p class="muted small">厚生労働省「日本人の食事摂取基準（2025年版）」の式（基礎代謝基準値 × 体重 × 身体活動レベル）を使います。この式では身長は使いません。足りない項目があっても、計算できるものだけ出します。</p>
      <div class="grid3">
        <label class="field">年齢<input name="age" inputmode="numeric" value="${esc(b.age ?? '')}"></label>
        <label class="field">性別（表が男女別）<select name="sex">
          <option value="" ${!b.sex ? 'selected' : ''}>回答しない</option>
          <option value="male" ${b.sex === 'male' ? 'selected' : ''}>男性</option>
          <option value="female" ${b.sex === 'female' ? 'selected' : ''}>女性</option></select></label>
        <label class="field">体重 (kg)<input name="weightKg" inputmode="decimal" value="${esc(b.weightKg ?? '')}"></label>
      </div>
      <h3>ふだんの身体活動レベル</h3>
      <div class="stack-sm">${Object.entries(PAL_LABEL).map(([k, v]) => `<label class="opt"><input type="radio" name="pal" value="${k}" ${b.pal === k ? 'checked' : ''}> ${esc(v)}</label>`).join('')}</div>
      <label class="opt"><input type="checkbox" name="palIncludesTraining" ${b.palIncludesTraining !== false ? 'checked' : ''}> 上の活動レベルは筋トレも含めて選んだ（チェックを外すと筋トレ分を別に足します。二重には足しません）</label>
      <label class="field">エネルギーの方針（自分で選んだときだけ増減します）
        <select name="energyGoal">${Object.entries(ENERGY_GOAL).map(([k, v]) => `<option value="${k}" ${b.energyGoal === k ? 'selected' : ''}>${esc(v.label)}</option>`).join('')}</select></label>
    </section>
    <button class="primary big" type="submit">${first ? '保存して始める' : '設定を保存'}</button>
  </form>`;
}

function readSettings(form) {
  const fd = new FormData(form);
  const t = state.profile.training;
  const numOrNull = (v) => {
    const n = Number(String(v ?? '').replace(/[^\d.]/g, ''));
    return String(v ?? '').trim() === '' || !Number.isFinite(n) ? null : n;
  };
  t.goal = fd.get('goal') ?? 'undecided';
  t.priority = fd.get('priority') ?? '';
  t.experience = fd.get('experience') ?? 'none';
  t.equipment = { home: fd.getAll('eq_home'), gym: fd.getAll('eq_gym') };
  t.increments = {
    dumbbell: numOrNull(fd.get('inc_dumbbell')) ?? 1,
    barbell: numOrNull(fd.get('inc_barbell')) ?? 2.5,
    machine: numOrNull(fd.get('inc_machine')) ?? 2.5,
  };
  for (const k of DOW_KEYS) {
    t.days[k] = { on: fd.get(`day_${k}`) === 'on', minutes: Number(fd.get(`min_${k}`)), place: fd.get(`place_${k}`) };
  }
  const split = (s) =>
    String(s ?? '')
      .split(/[、,，\s]+/)
      .map((x) => x.trim())
      .filter(Boolean);
  const f = state.profile.food;
  f.budgetPerDayYen = numOrNull(fd.get('budget'));
  f.places = fd.getAll('places');
  f.mealsPerDay = Number(fd.get('mealsPerDay') ?? 3);
  f.allergies = [...new Set([...fd.getAll('allergy'), ...split(fd.get('allergyOther'))])];
  f.dislikes = [];
  for (let i = 0; fd.has(`dis_w_${i}`); i += 1) {
    const word = String(fd.get(`dis_w_${i}`) ?? '').trim();
    if (word) f.dislikes.push(normalizeDislike({ word, scope: fd.get(`dis_s_${i}`) }));
  }
  const b = state.profile.body;
  b.enabled = fd.get('bodyEnabled') === 'on';
  b.age = numOrNull(fd.get('age'));
  b.sex = fd.get('sex') ?? '';
  b.weightKg = numOrNull(fd.get('weightKg'));
  b.pal = fd.get('pal') ?? '';
  b.palIncludesTraining = fd.get('palIncludesTraining') === 'on';
  b.energyGoal = fd.get('energyGoal') ?? 'maintain';
  if (!state.profile.setupDone) state.profile.setupDate = todayStr();
  state.profile.setupDone = true;
}

// ---------------------------------------------------------------- 今日

function mealContext(date) {
  const f = state.profile.food;
  const eatenRecords = mealsOn(state, date);
  const ovRaw = state.overrides[date]?.meal ?? {};
  // 条件を指定した枠をもう記録したら、その条件（場所・予算）は使い終わり。次の枠はふだんの条件で
  const ovUsed = ovRaw.slot && ovRaw.slot !== 'snack' && eatenRecords.some((m) => m.slot === ovRaw.slot);
  const ov = ovUsed ? {} : ovRaw;
  const slot = ov.slot ?? nextSlot(state, date);
  const rem = remainingSlots(state, date);
  let budgetYen = ov.budgetYen ?? null;
  if (budgetYen == null && f.budgetPerDayYen) {
    const spent = eatenRecords.reduce((a, m) => a + (m.priceYen ?? 0), 0);
    budgetYen = Math.max(0, f.budgetPerDayYen - spent) / Math.max(1, rem.length);
  }
  const places = ov.place ? [ov.place] : f.places;
  const targets = targetsNow();
  return {
    slot,
    places,
    budgetYen: budgetYen != null ? Math.floor(budgetYen) : null,
    pool: poolFor(state),
    eatenRecords,
    remainingSlots: slot === 'snack' ? 1 : Math.max(1, rem.length),
    targets,
    perMealProtein: proteinPerMealTarget(state.profile.body.enabled ? state.profile.body.weightKg : null)?.value ?? null,
    allergies: f.allergies,
    dislikes: f.dislikes,
    ov,
  };
}

function trainingWhy(session) {
  const vol = trainingVolume(state);
  const pr = PRIORITY_LABEL[session.priority];
  const ex0 = session.exercises[0];
  const freq =
    vol.trainingDaysPerWeek >= 2
      ? `週${vol.trainingDaysPerWeek}日の計画で、各部位を週2回以上動かせる組み方です`
      : '週1日の計画です。週2回以上にできると効果が上がりやすいです';
  return `優先：${pr}。${ex0 ? `${ex0.unit === 'sec' ? '' : `${ex0.repMin}〜${ex0.repMax}回×${ex0.sets}セット、余力${ex0.rir}回を残す強さ。`}` : ''}${freq}（ACSM 2026）。`;
}

function todayView() {
  const date = todayStr();
  const session = sessionForDate(state, date);
  const ov = state.overrides[date] ?? {};
  const ctx = mealContext(date);
  const sug = suggestMeals(ctx);
  const selectedId = state.selected[date]?.[ctx.slot];
  const top = sug.candidates[0];
  const done = state.workouts[date];
  const targets = ctx.targets;
  const totals = dayTotals(ctx.eatenRecords);
  const proj = projectedDay(ctx.eatenRecords, state.selected[date] ?? {}, templateLookup(state));

  const summary = `<section class="card hero">
    <div class="muted">${mmdd(date)}</div>
    <h1>今日やること</h1>
    <div class="todo">
      <div class="todo-row"><span class="ico">💪</span><div>${
        session.rest
          ? '<b>休養日</b><div class="muted small">筋肉は休んでいる間に回復します。動きたければ下の「今日の条件」から追加できます。</div>'
          : `<b>${esc(session.name)}・${session.exercises.length}種目・約${session.estimatedMinutes}分</b>（${PLACE_LABEL[session.place]}）${
              done?.status === 'done' ? ' <span class="tag ok">記録済み</span>' : done?.status === 'skipped' ? ' <span class="tag">未実施</span>' : ''
            }<div class="muted small">なぜ：${esc(trainingWhy(session))}</div>`
      }</div></div>
      <div class="todo-row"><span class="ico">🍚</span><div>${
        top
          ? `<b>${SLOTS[ctx.slot]}ごはん：${esc((selectedId ? templateLookup(state)[selectedId] ?? top.template : top.template).name)}</b>
             <div class="muted small">なぜ：${esc(top.reasons[0] ?? '')}${ctx.budgetYen != null ? `・予算${yen(ctx.budgetYen)}円以内` : ''}</div>`
          : `<b>${SLOTS[ctx.slot]}ごはん：条件に合う候補がありません</b><div class="muted small">予算や場所を変えるか、記録画面で自由に入力できます。</div>`
      }</div></div>
    </div>
    <div class="btnrow">
      <button class="primary" data-action="goto" data-tab="record">夜の記録をつける</button>
      <a class="btn" href="#training">メニュー</a><a class="btn" href="#meals">食事候補</a>
    </div>
  </section>`;

  const minuteChoices = [10, 15, 20, 30, 45, 60];
  const usualMin = state.profile.training.days[dowKey(date)]?.minutes;
  const cond = `<section class="card"><details ${Object.keys(ov).length ? 'open' : ''}><summary><b>今日の条件を変える</b>${
    Object.keys(ov).length ? ' <span class="tag warn">今日だけ変更中</span>' : ''
  }</summary>
    <p class="muted small">ここでの変更は今日だけ。普段の設定は変わりません。</p>
    <h3>筋トレの時間</h3>
    <div class="chips">${minuteChoices
      .map(
        (m) =>
          `<button type="button" class="chip-btn ${(!session.rest && session.minutes === m) ? 'on' : ''}" data-action="ov-minutes" data-v="${m}">${m}分${
            m === usualMin ? '（普段）' : ''
          }</button>`,
      )
      .join('')}</div>
    <h3>場所</h3>
    <div class="chips">${Object.entries(PLACE_LABEL)
      .map(([k, v]) => `<button type="button" class="chip-btn ${!session.rest && session.place === k ? 'on' : ''}" data-action="ov-place" data-v="${k}">${v}でやる</button>`)
      .join('')}
      ${session.rest ? `<button type="button" class="chip-btn" data-action="ov-force">今日も筋トレする</button>` : ''}</div>
    <h3>次の食事</h3>
    <form id="mealcond" class="grid3">
      <label class="field">いつ<select name="slot">${SLOT_ORDER.map((s) => `<option value="${s}" ${ctx.slot === s ? 'selected' : ''}>${SLOTS[s]}</option>`).join('')}</select></label>
      <label class="field">どこで<select name="place"><option value="">いつもの所</option>${allPlaces(state)
        .map((pl) => `<option value="${pl.id}" ${ctx.ov.place === pl.id ? 'selected' : ''}>${esc(pl.name)}</option>`)
        .join('')}</select></label>
      <label class="field">予算（円以内）<input name="budget" inputmode="numeric" placeholder="例 600" value="${esc(ctx.ov.budgetYen ?? '')}"></label>
      <button class="primary" type="submit">この条件で再提案</button>
    </form>
    ${Object.keys(ov).length ? `<button class="link" data-action="ov-clear">今日の変更を元に戻す</button>` : ''}
  </details></section>`;

  return `${summary}${cond}${trainingCard(date, session)}${mealsCard(date, ctx, sug, selectedId, totals, proj, targets)}`;
}

function trainingCard(date, session) {
  if (session.rest) {
    const week = buildWeekPlan(state.profile.training);
    const any = week.some((d) => !d.rest);
    return `<section class="card" id="training"><h2>筋トレ</h2><p>${
      any ? '今日は休養日です。' : '運動する曜日がまだ設定されていません。「設定」から曜日を選ぶと週間メニューを作ります。'
    }</p>${weekStrip()}</section>`;
  }
  const t = state.profile.training;
  const items = session.exercises
    .map((e, i) => {
      const ex = EXERCISE_BY_ID[e.exId];
      const last = lastLogFor(e.exId, state.workouts, date);
      const sug = nextSuggestion(e, last, t);
      const rec = sug.options.find((o) => o.id === sug.recommendedId);
      const adj = state.adjustments[e.exId];
      const adoptedNow = adj && rec?.apply && adj.reason === rec.detail;
      const unit = e.unit === 'sec' ? '秒' : '回';
      const target = e.setTargets ? `目標 ${e.setTargets.join('・')}${unit}` : `${e.repMin}〜${e.repMax}${unit}`;
      return `<li class="ex">
        <div class="ex-head"><span class="num">${i + 1}</span><div><b>${esc(ex.name)}</b>
          <div class="muted small">${esc(ex.muscles)}</div></div></div>
        <div class="ex-main">${e.sets}セット × ${target}${e.loadKg != null ? `・<b>${num1(e.loadKg)} kg</b>` : ''}・休憩 ${restText(e.restSec)}${
          adj?.tempo ? `・${esc(adj.tempo)}` : ''
        }</div>
        <div class="small">重さの選び方：${esc(loadGuide(ex, e))}</div>
        ${
          rec && rec.kind !== 'first'
            ? `<div class="sug ${adoptedNow ? 'adopted' : ''}"><b>今回の提案：</b>${esc(rec.detail)}
              ${adoptedNow ? '<span class="tag ok">採用済み</span>' : `<div class="btnrow">${sug.options
                .map((o) => `<button class="${o.id === sug.recommendedId ? 'primary' : ''} sm" data-action="adopt" data-ex="${e.exId}" data-opt="${o.id}" data-date="${date}">採用：${esc(o.label)}</button>`)
                .join('')}</div>`}</div>`
            : rec
              ? `<div class="sug muted small">${esc(rec.detail)}</div>`
              : ''
        }
        <details><summary>動作の要点・代わりの種目・根拠</summary>
          <ul>${ex.cues.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
          ${
            e.alternatives.length
              ? `<label class="field">器具が使えないときは
                <select data-action="swap" data-pattern="${e.pattern}" data-date="${date}">
                  <option value="${e.exId}">${esc(ex.name)}（今の種目）</option>
                  ${e.alternatives.map((a) => `<option value="${a}">${esc(EXERCISE_BY_ID[a].name)}</option>`).join('')}
                </select></label>
                <p class="muted small">ここでの変更は今日だけ。いつも替えたいときは「設定」の器具を見直してください。</p>`
              : '<p class="muted small">今の器具で選べる代わりの種目はありません。</p>'
          }
          <div class="small">鍛える動き：${esc(PATTERNS[e.pattern])}</div>
          ${srcLinks(e.sourceIds)}
        </details>
      </li>`;
    })
    .join('');
  return `<section class="card" id="training"><h2>筋トレ：${esc(session.name)}（約${session.estimatedMinutes}分）</h2>
    <p class="small">最初に${session.warmupMin}分、軽く体を動かしてから。順番は上から（大きい筋肉・複数の関節を使う種目が先）。</p>
    ${session.notes.map((n) => `<p class="tag warn">${esc(n)}</p>`).join('')}
    <ol class="exlist">${items}</ol>
    ${weekStrip()}
  </section>`;
}

function weekStrip() {
  const week = buildWeekPlan(state.profile.training);
  const ws = weekStartOf(todayStr());
  return `<details><summary>今週のメニュー</summary><div class="week">${week
    .map((d, i) => {
      const date = addDays(ws, i);
      const w = state.workouts[date];
      const mark = w?.status === 'done' ? '✓' : w?.status === 'skipped' ? '休' : date < todayStr() && !d.rest ? '未' : '';
      return `<div class="wd ${d.rest ? 'rest' : ''} ${date === todayStr() ? 'today' : ''}"><div>${DOW_LABEL[d.dow]}</div><div class="small">${
        d.rest ? '休養' : `${{ fullA: '全身A', fullB: '全身B', upper: '上半身', lower: '下半身' }[d.type]}<br>${d.minutes}分`
      }</div><div class="mark">${mark}</div></div>`;
    })
    .join('')}</div><p class="muted small">休んだ日は「未」のまま残し、次の日の量は増やしません。</p></details>`;
}

function targetsBlock(targets, totals, proj) {
  const rows = [
    ['エネルギー', 'kcal', targets.energy, totals.total.kcal, proj.projected.kcal, kcal],
    ['たんぱく質', 'g', targets.protein, totals.total.protein, proj.projected.protein, grams],
    ['脂質', 'g', targets.fat, totals.total.fat, proj.projected.fat, grams],
    ['炭水化物', 'g', targets.carb, totals.total.carb, proj.projected.carb, grams],
  ];
  const anyTarget = rows.some((r) => r[2]?.value != null);
  const showProj = Math.abs(proj.projected.kcal - proj.actual.kcal) > 0.001;
  const table = `<table class="nut"><thead><tr><th></th><th>記録できた分</th>${showProj ? '<th>選択中を含む見込み</th>' : ''}${
    anyTarget ? '<th>1日の目安</th>' : ''
  }</tr></thead><tbody>${rows
    .map(
      ([label, unit, tg, now, pj, fmt]) =>
        `<tr><th>${label}</th><td>${fmt(now)} ${unit}</td>${showProj ? `<td>${fmt(pj)} ${unit}</td>` : ''}${
          anyTarget ? `<td>${tg?.value != null ? `${fmt(tg.value)} ${unit}` : '—'}</td>` : ''
        }</tr>`,
    )
    .join('')}</tbody></table>`;
  const steps = [targets.energy, targets.protein, targets.fat, targets.carb].filter(Boolean).flatMap((x) => x.steps ?? []);
  return `${table}
    <p class="muted small">「記録できた分」は食べたと確定した食事のうち、量が分かるものの合計です${
      totals.partialMeals ? `（量が分からない ${totals.partialMeals} 件は含まず）` : ''
    }。記録していない食事は欠食とはみなしません。数値はすべて目安です。</p>
    ${
      state.profile.body.enabled
        ? `<details><summary>計算の内訳（式・入力値・係数・出典）</summary>
            ${targets.missing.length ? `<p class="tag warn">足りない入力：${esc(targets.missing.join('、'))}（計算できる項目だけ表示）</p>` : ''}
            ${stepsBreakdown(steps)}
            ${targets.notes.map((n) => `<p class="muted small">${esc(n)}</p>`).join('')}
          </details>`
        : `<p class="muted small">1日の目安を出すには「設定」で個別計算をオンにします（任意）。</p>`
    }`;
}

function mealsCard(date, ctx, sug, selectedId, totals, proj, targets) {
  const list = ui.showAllCandidates ? sug.candidates : sug.candidates.slice(0, 3);
  const eatenSlots = ctx.eatenRecords.map((m) => SLOTS[m.slot]).join('・');
  const cards = list
    .map((c) => {
      const t = c.template;
      const sel = selectedId === t.id;
      return `<li class="cand ${sel ? 'sel' : ''}">
        <div class="cand-head"><b>${esc(t.name)}</b> <span class="tag">${esc(placeName(state, t.place))}</span>${t.user ? ' <span class="tag ok">登録メニュー</span>' : ''}${
          c.needsIngredientCheck ? ' <span class="tag warn">原材料を要確認</span>' : ''
        }</div>
        ${
          c.nutritionUnknown
            ? ''
            : `<ul class="items">${t.items
                .map((it) => {
                  const n = itemNutrients(it);
                  return `<li>${esc(it.display ?? itemLabel(it))}${n ? ` <span class="muted small">たんぱく質 ${grams(n.protein)} g</span>` : ''}</li>`;
                })
                .join('')}</ul>`
        }
        <div>${c.priceYen != null ? `${t.priceIsExact ? '' : '概算 '}<b>${yen(c.priceYen)} 円</b>${t.priceIsExact ? '' : ' <span class="tag">目安</span>'}・` : ''}${
          c.nutritionUnknown ? '栄養は未登録' : nutrientLine(c.nutrients)
        }</div>
        <div class="small">選んだ理由：${esc(c.reasons.join('／'))}</div>
        <div class="small">この${SLOTS[ctx.slot]}にすると1日合計：<b>${kcal(c.projectedDay.kcal)} kcal・たんぱく質 ${grams(c.projectedDay.protein)} g</b>${
          ctx.targets.energy ? `（目安 ${kcal(ctx.targets.energy.value)} kcal）` : ''
        }</div>
        ${mealAllergens(t).length ? `<div class="muted small">含まれうるアレルゲン：${esc(mealAllergens(t).join('、'))}</div>` : ''}
        <div class="btnrow">${
          sel
            ? `<button class="primary" data-action="confirm-meal" data-slot="${ctx.slot}" data-date="${date}">食べた（記録する）</button>
               <button data-action="edit-candidate" data-slot="${ctx.slot}" data-date="${date}">量や内容を直して記録</button>
               <button class="link" data-action="unselect" data-slot="${ctx.slot}" data-date="${date}">選択をやめる</button>`
            : `<button data-action="select-meal" data-id="${t.id}" data-slot="${ctx.slot}" data-date="${date}">これにする</button>
               <button class="link" data-action="quick-record" data-id="${t.id}" data-slot="${ctx.slot}" data-date="${date}">もう食べた→記録</button>`
        }</div>
      </li>`;
    })
    .join('');
  return `<section class="card" id="meals"><h2>食事：${SLOTS[ctx.slot]}の候補</h2>
    <p class="small">${eatenSlots ? `記録済み：${eatenSlots}。` : 'まだ記録はありません。'}${
      ctx.places.length ? `場所：${ctx.places.map((p) => esc(placeName(state, p))).join('・')}。` : ''
    }${ctx.budgetYen != null ? `予算：${yen(ctx.budgetYen)}円以内。` : ''}</p>
    ${targetsBlock(targets, totals, proj)}
    ${
      list.length
        ? `<ol class="cands">${cards}</ol>`
        : '<p>条件に合う候補がありません。予算や場所を変えるか、「記録」で自由に入力してください。</p>'
    }
    ${sug.candidates.length > 3 ? `<button class="link" data-action="toggle-all">${ui.showAllCandidates ? '上位3件だけ表示' : `ほかの候補も見る（全${sug.candidates.length}件）`}</button>` : ''}
    ${sug.excluded.length ? `<p class="muted small">アレルギー・苦手な食材で ${sug.excluded.length} 件を除外しました。</p>` : ''}
    <button class="link" data-action="goto-menus">よく行く場所のメニューを登録する</button>
    <details><summary>価格・栄養の出し方</summary>
      <p class="small">栄養は「文部科学省 日本食品標準成分表（八訂）増補2023年」の100gあたりの値 × 分量で計算しています。学食・コンビニの分量と価格はアプリの仮定値で、実際の商品とは違います。商品ラベルがあれば、記録画面で「ラベルの値」として入れるほうが正確です。</p>
      ${srcLinks(['mext2023_food', 'caa_allergen', 'schoenfeld2018_meal', 'app'])}
    </details>
  </section>`;
}

// ---------------------------------------------------------------- 記録

function recordView() {
  const date = ui.recordDate;
  const session = sessionForDate(state, date);
  const w = state.workouts[date];
  const header = `<section class="card"><div class="datebar">
      <button data-action="rec-date" data-d="-1" aria-label="前の日">◀</button>
      <b>${mmdd(date)}${date === todayStr() ? '（今日）' : ''}</b>
      <button data-action="rec-date" data-d="1" ${date >= todayStr() ? 'disabled' : ''} aria-label="次の日">▶</button>
    </div></section>`;
  return `${header}${workoutRecordCard(date, session, w)}${mealRecordCard(date)}${weightCard(date)}`;
}

function workoutRecordCard(date, session, w) {
  if (session.rest && !w) {
    return `<section class="card"><h2>筋トレの記録</h2><p>この日は休養日です。</p></section>`;
  }
  if (w) {
    const suggestions = (w.actual ?? [])
      .map((a) => {
        const planEx = w.planSnapshot?.exercises.find((e) => e.exId === a.exId) ?? { exId: a.exId, sets: a.sets.length, repMin: 8, repMax: 12 };
        const ex = EXERCISE_BY_ID[a.exId];
        const s = nextSuggestion(planEx, lastLogFor(a.exId, state.workouts, addDays(date, 1)), state.profile.training);
        const adj = state.adjustments[a.exId];
        return `<li><b>${esc(ex.name)}</b>：${a.sets.map((x) => `${x.reps}${ex.unit === 'sec' ? '秒' : '回'}${x.kg != null ? `@${num1(x.kg)}kg` : ''}`).join('・')}
          ${a.pain ? '<span class="tag warn">痛み</span>' : ''}${a.formStable === false ? '<span class="tag warn">フォーム不安定</span>' : ''}
          <div class="sug"><b>次回の提案：</b>${esc(s.options.find((o) => o.id === s.recommendedId)?.detail ?? '')}
          <div class="btnrow">${s.options
            .filter((o) => o.apply)
            .map(
              (o) =>
                `<button class="sm ${o.id === s.recommendedId ? 'primary' : ''}" data-action="adopt" data-ex="${a.exId}" data-opt="${o.id}" data-date="${addDays(date, 1)}">採用：${esc(o.label)}</button>`,
            )
            .join('')}</div>${adj ? `<div class="muted small">いま計画に入っている内容：${adj.loadKg != null ? `${num1(adj.loadKg)}kg・` : ''}${adj.setTargets ? `${adj.setTargets.join('・')}回` : ''}${adj.sets ? `・${adj.sets}セット` : ''}</div>` : ''}</div></li>`;
      })
      .join('');
    return `<section class="card"><h2>筋トレの記録</h2>
      <p>${w.status === 'done' ? '<span class="tag ok">記録済み</span>' : '<span class="tag">未実施として記録</span>'}
      ${w.planSnapshot ? `予定：${esc(w.planSnapshot.name)} ${w.planSnapshot.minutes}分（${PLACE_LABEL[w.planSnapshot.place]}）` : ''}</p>
      ${suggestions ? `<ul class="plain">${suggestions}</ul><p class="muted small">提案は「採用」を押したときだけ次回の計画に入ります。</p>` : ''}
      <button class="link" data-action="redo-workout" data-date="${date}">記録をやり直す</button>
    </section>`;
  }
  const rows = session.exercises
    .map((e, i) => {
      const ex = EXERCISE_BY_ID[e.exId];
      const last = lastLogFor(e.exId, state.workouts, date);
      const kg0 = e.loadKg ?? last?.log.sets.find((s) => s.kg != null)?.kg ?? '';
      const unit = e.unit === 'sec' ? '秒' : '回';
      const setRows = Array.from({ length: e.sets + 1 }, (_, j) => {
        const reps0 = e.setTargets?.[j] ?? e.repMin;
        const extra = j === e.sets;
        return `<div class="setrow ${extra ? 'extra' : ''}" data-extra="${extra ? 1 : 0}">
          <span class="small">${j + 1}セット${extra ? '（追加）' : ''}</span>
          <button type="button" class="step-btn" data-action="step" data-target="r_${i}_${j}" data-d="-1">−</button>
          <input name="r_${i}_${j}" inputmode="numeric" value="${extra ? '' : reps0}" class="reps" aria-label="${ex.name} ${j + 1}セット目の${unit}数" placeholder="—">
          <button type="button" class="step-btn" data-action="step" data-target="r_${i}_${j}" data-d="1">＋</button>
          <span class="small">${unit}</span>
          ${ex.increment ? `<input name="k_${i}_${j}" inputmode="decimal" value="${extra ? '' : esc(kg0)}" class="kg" aria-label="${ex.name} ${j + 1}セット目の重さ" placeholder="kg"><span class="small">kg</span>` : ''}
        </div>`;
      }).join('');
      return `<fieldset class="exrec" data-i="${i}">
        <legend><b>${esc(ex.name)}</b> <span class="muted small">予定 ${e.sets}×${e.setTargets ? e.setTargets.join('・') : `${e.repMin}〜${e.repMax}`}${unit}${e.loadKg != null ? ` @${num1(e.loadKg)}kg` : ''}</span></legend>
        <input type="hidden" name="ex_${i}" value="${e.exId}">
        <label class="opt"><input type="checkbox" name="skip_${i}"> この種目はやらなかった</label>
        ${setRows}
        <p class="muted small">空欄のセットは「やらなかった」として扱います。</p>
        <div class="chips">${[
          ['easy', '余裕あり'],
          ['ok', 'ちょうどいい'],
          ['hard', 'きつい'],
        ]
          .map(([k, v]) => `<label class="chip"><input type="radio" name="feel_${i}" value="${k}" ${k === 'ok' ? 'checked' : ''}><span>${v}</span></label>`)
          .join('')}</div>
        <div class="small">最後のセットのあと、あと何回できそうだった？</div>
        <div class="chips">${['0', '1', '2', '3', '4']
          .map((k) => `<label class="chip"><input type="radio" name="rir_${i}" value="${k}"><span>${k === '4' ? '4回以上' : `${k}回`}</span></label>`)
          .join('')}<span class="muted small">（未選択なら上の感覚から推定）</span></div>
        <div class="chips">
          <label class="chip"><input type="checkbox" name="form_${i}" checked><span>フォーム安定</span></label>
          <label class="chip"><input type="checkbox" name="pain_${i}"><span>痛みがあった</span></label>
        </div>
      </fieldset>`;
    })
    .join('');
  return `<section class="card"><h2>筋トレの記録：${esc(session.name)}</h2>
    <p class="small">予定の数値が入っています。違うところだけ直して「記録する」。</p>
    <form id="workout" data-date="${date}" class="stack">${rows}
      <div class="small">全体の疲れ</div>
      <div class="chips">${[
        ['normal', 'ふつう'],
        ['high', '疲労が強い'],
      ]
        .map(([k, v]) => `<label class="chip"><input type="radio" name="fatigue" value="${k}" ${k === 'normal' ? 'checked' : ''}><span>${v}</span></label>`)
        .join('')}</div>
      <button class="primary big" type="submit">記録する</button>
    </form>
    <button class="link" data-action="skip-workout" data-date="${date}">今日は休んだ（未実施として残す）</button>
  </section>`;
}

function readWorkoutForm(form) {
  const fd = new FormData(form);
  const entries = [];
  for (let i = 0; fd.has(`ex_${i}`); i += 1) {
    if (fd.get(`skip_${i}`) === 'on') continue;
    const sets = [];
    for (let j = 0; fd.has(`r_${i}_${j}`); j += 1) {
      const r = String(fd.get(`r_${i}_${j}`)).trim();
      if (r === '') continue;
      const kgRaw = fd.get(`k_${i}_${j}`);
      const kg = kgRaw == null || String(kgRaw).trim() === '' ? null : Number(kgRaw);
      sets.push({ reps: Number(r), kg: Number.isFinite(kg) ? kg : null });
    }
    if (!sets.length) continue;
    const feel = fd.get(`feel_${i}`) ?? 'ok';
    const rirRaw = fd.get(`rir_${i}`);
    const rir = rirRaw != null ? Number(rirRaw) : { easy: 3, ok: 2, hard: 0 }[feel];
    entries.push({
      exId: fd.get(`ex_${i}`),
      sets,
      feel,
      rir,
      rirEstimated: rirRaw == null,
      formStable: fd.get(`form_${i}`) === 'on',
      pain: fd.get(`pain_${i}`) === 'on',
    });
  }
  return { entries, fatigue: fd.get('fatigue') ?? 'normal' };
}

function mealRecordCard(date) {
  const recs = mealsOn(state, date);
  const totals = dayTotals(recs);
  const list = recs
    .slice()
    .sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot))
    .map((m) => {
      const r = mealNutrients(m);
      if (ui.editingMeal === m.id) return `<li>${mealEditForm(date, m)}</li>`;
      return `<li class="mealrec"><div><b>${SLOTS[m.slot] ?? ''}</b> ${esc(m.name)} ${m.place ? `<span class="tag">${esc(placeName(state, m.place))}</span>` : ''}${
        m.needsIngredientCheck ? ' <span class="tag warn">原材料を要確認</span>' : ''
      }</div>
        <div class="small">${r.known ? nutrientLine(r.total) : r.total.kcal > 0 ? `${nutrientLine(r.total)}（量不明の品目あり・分かった分だけ）` : '量が分からないため栄養は集計していません'}${
          m.priceYen != null ? `・${yen(m.priceYen)}円${m.priceIsEstimate ? '（概算）' : ''}` : ''
        }</div>
        ${
          ui.menuFromRec === m.id
            ? `<form class="row menufromrec" data-id="${m.id}" data-date="${date}">
                <select name="placeId" aria-label="登録する場所">${allPlaces(state)
                  .map((pl) => `<option value="${pl.id}" ${pl.id === m.place ? 'selected' : ''}>${esc(pl.name)}</option>`)
                  .join('')}</select>
                <button class="primary sm" type="submit">この場所のメニューに登録</button></form>`
            : ''
        }
        <div class="btnrow"><button class="sm" data-action="edit-meal" data-id="${m.id}">直す</button>
        ${m.templateId && (state.menus ?? []).some((x) => x.id === m.templateId) ? '' : `<button class="sm" data-action="menu-from-rec" data-id="${m.id}">メニューに登録</button>`}
        <button class="sm link" data-action="del-meal" data-id="${m.id}" data-date="${date}">削除</button></div></li>`;
    })
    .join('');
  return `<section class="card"><h2>食事の記録</h2>
    ${recs.length ? `<ul class="plain">${list}</ul>` : '<p class="muted">まだ記録がありません。記録しなかった食事は欠食とはみなしません。</p>'}
    <p class="small">記録できた分の合計：${nutrientLine(totals.total)}${totals.partialMeals ? `（量不明 ${totals.partialMeals} 件は含まず）` : ''}</p>
    ${ui.addMealOpen ? addMealForm(date) : `<button class="primary" data-action="open-add">食べたものを追加</button>`}
  </section>`;
}

function mealEditForm(date, m) {
  return `<form class="stack editmeal" data-id="${m.id}" data-date="${date}">
    <label class="field">名前<input name="name" value="${esc(m.name)}"></label>
    ${(m.items ?? [])
      .map((it, k) => {
        if (it.basis === 'food')
          return `<div class="grid3"><span class="small">${esc(FOOD_BY_ID[it.foodId]?.name)}</span>
            <label class="field">食べた量 (g)<input name="g_${k}" inputmode="decimal" value="${esc(it.grams)}"></label>
            <label class="opt"><input type="checkbox" name="rm_${k}"> 食べなかった</label></div>`;
        if (it.basis === 'labelPack')
          return `<div class="grid3"><span class="small">ラベル（1包装あたり）</span><label class="field">包装数<input name="p_${k}" inputmode="decimal" value="${esc(it.packages)}"></label><label class="opt"><input type="checkbox" name="rm_${k}"> 削除</label></div>`;
        if (it.basis === 'label100g')
          return `<div class="grid3"><span class="small">ラベル（100gあたり）</span><label class="field">食べた量 (g)<input name="g_${k}" inputmode="decimal" value="${esc(it.grams)}"></label><label class="opt"><input type="checkbox" name="rm_${k}"> 削除</label></div>`;
        return `<div class="small">量不明の品目 <label class="opt"><input type="checkbox" name="rm_${k}"> 削除</label></div>`;
      })
      .join('')}
    <label class="field">実際の値段（円）<input name="price" inputmode="numeric" value="${esc(m.priceYen ?? '')}"></label>
    <div class="btnrow"><button class="primary" type="submit">保存</button><button type="button" class="link" data-action="cancel-edit">やめる</button></div>
  </form>`;
}

function addMealForm(date) {
  const mode = ui.addMode;
  const foodOpts = FOODS.map((f) => `<option value="${f.id}">${esc(f.name)}${f.state === 'raw' ? '［調理前の重さ］' : f.state === 'cooked' ? '［調理後の重さ］' : ''}</option>`).join('');
  const ctxSlot = nextSlot(state, date);
  const modeBtn = (k, v) => `<button type="button" class="chip-btn ${mode === k ? 'on' : ''}" data-action="add-mode" data-v="${k}">${v}</button>`;
  let body = '';
  if (mode === 'food') {
    body = `<label class="field">食品（成分表）<select name="foodId">${foodOpts}</select></label>
      <label class="field">実際に食べた量 (g)<input name="grams" inputmode="decimal" required></label>
      <p class="muted small">米は「炊く前（生米）」と「炊いた後（ごはん）」で別の食品です。量った状態に合わせて選んでください。</p>`;
  } else if (mode === 'pack') {
    body = `<p class="small">商品ラベルの「1包装（1個・1食）あたり」の値</p>
      <div class="grid4"><label class="field">kcal<input name="kcal" inputmode="decimal" required></label><label class="field">たんぱく質 g<input name="protein" inputmode="decimal" required></label>
      <label class="field">脂質 g<input name="fat" inputmode="decimal"></label><label class="field">炭水化物 g<input name="carb" inputmode="decimal"></label></div>
      <label class="field">食べた包装数（半分なら 0.5）<input name="packages" inputmode="decimal" value="1"></label>`;
  } else if (mode === 'per100') {
    body = `<p class="small">商品ラベルの「100gあたり」の値</p>
      <div class="grid4"><label class="field">kcal<input name="kcal" inputmode="decimal" required></label><label class="field">たんぱく質 g<input name="protein" inputmode="decimal" required></label>
      <label class="field">脂質 g<input name="fat" inputmode="decimal"></label><label class="field">炭水化物 g<input name="carb" inputmode="decimal"></label></div>
      <label class="field">実際に食べた量 (g)<input name="grams" inputmode="decimal" required></label>`;
  } else if (mode === 'template') {
    body = `<label class="field">候補・登録メニューから選ぶ<select name="templateId">${allPlaces(state)
      .map((pl) => {
        const ts = poolFor(state).filter((t) => t.place === pl.id);
        return ts.length
          ? `<optgroup label="${esc(pl.name)}">${ts.map((t) => `<option value="${t.id}">${esc(t.name)}${t.user ? '（登録）' : ''}</option>`).join('')}</optgroup>`
          : '';
      })
      .join('')}</select></label><p class="muted small">記録したあと「直す」で量を変えられます。</p>`;
  } else {
    body = `<p class="small">量が分からなくても記録できます。栄養の合計には入れず、「記録した」ことだけ残します。</p>`;
  }
  return `<form id="addmeal" data-date="${date}" class="stack">
    <div class="chips">${modeBtn('template', '候補から')}${modeBtn('food', '食品＋量')}${modeBtn('pack', 'ラベル(1包装)')}${modeBtn('per100', 'ラベル(100g)')}${modeBtn('unknown', '量が不明')}</div>
    <div class="grid3">
      <label class="field">いつ<select name="slot">${SLOT_ORDER.map((s) => `<option value="${s}" ${s === ctxSlot ? 'selected' : ''}>${SLOTS[s]}</option>`).join('')}</select></label>
      <label class="field">どこで<select name="place"><option value="">—</option>${allPlaces(state).map((pl) => `<option value="${pl.id}">${esc(pl.name)}</option>`).join('')}</select></label>
      <label class="field">値段（円・任意）<input name="price" inputmode="numeric"></label>
    </div>
    ${mode === 'template' ? '' : `<label class="field">名前（例：学食のカツ丼）<input name="name" ${mode === 'unknown' ? 'required' : ''}></label>`}
    ${body}
    <div class="btnrow"><button class="primary" type="submit">記録する</button><button type="button" class="link" data-action="close-add">閉じる</button></div>
  </form>`;
}

function readAddMeal(form) {
  const fd = new FormData(form);
  const n = (k) => {
    const v = Number(fd.get(k));
    return Number.isFinite(v) ? v : 0;
  };
  const slot = fd.get('slot');
  const place = fd.get('place') || null;
  const price = String(fd.get('price') ?? '').trim() === '' ? null : n('price');
  const mode = ui.addMode;
  if (mode === 'template') {
    const t = templateLookup(state)[fd.get('templateId')];
    return { template: t, slot, price };
  }
  let item;
  let name = String(fd.get('name') ?? '').trim();
  if (mode === 'food') {
    item = { basis: 'food', foodId: fd.get('foodId'), grams: n('grams') };
    item.display = `${FOOD_BY_ID[item.foodId].name} ${item.grams}g`;
    name ||= FOOD_BY_ID[item.foodId].name;
  } else if (mode === 'pack') {
    item = { basis: 'labelPack', perPackage: { kcal: n('kcal'), protein: n('protein'), fat: n('fat'), carb: n('carb') }, packages: n('packages') || 1 };
  } else if (mode === 'per100') {
    item = { basis: 'label100g', per100g: { kcal: n('kcal'), protein: n('protein'), fat: n('fat'), carb: n('carb') }, grams: n('grams') };
  } else {
    item = { basis: 'unknown' };
  }
  return {
    record: {
      slot,
      place,
      source: 'custom',
      name: name || '（名前なし）',
      priceYen: price,
      priceIsEstimate: false,
      items: [item],
      needsIngredientCheck: ['cafeteria', 'conveni', 'eatout', 'super'].includes(placeById(state, place)?.kind),
    },
  };
}

function weightCard(date) {
  if (!state.profile.body.enabled) return '';
  const w = state.weights.find((x) => x.date === date);
  return `<section class="card"><h2>体重（任意）</h2>
    <form id="weight" data-date="${date}" class="row">
      <input name="kg" inputmode="decimal" value="${esc(w?.kg ?? '')}" placeholder="kg" aria-label="体重 kg">
      <button type="submit">保存</button></form>
    <p class="muted small">1日の増減では目安を変えません。数週間の傾向は「振り返り」で見られます。</p></section>`;
}

// ---------------------------------------------------------------- 振り返り

function reviewView() {
  const ws = ui.reviewWeek;
  const r = weeklyReview(state, ws, todayStr());
  const statusLabel = { done: '✓ 実施', skipped: '休（未実施）', not_done: '未実施', upcoming: '予定', rest: '休養日', before_start: '（使い始める前）' };
  const days = r.days
    .map(
      (d) =>
        `<tr><td>${mmdd(d.date)}</td><td>${statusLabel[d.status] ?? d.status}</td><td>${d.planned ? `${d.plannedMin}分${d.shortened ? `（普段${d.usualMin}分→短縮）` : ''}` : ''}</td></tr>`,
    )
    .join('');
  const changes = r.changes
    .map((c) => {
      const kg = c.kgPrev != null && c.kgNow != null ? `${num1(c.kgPrev)}→${num1(c.kgNow)}kg` : c.kgNow != null ? `${num1(c.kgNow)}kg` : '';
      const reps = c.repsPrev != null ? `合計${c.repsPrev}→${c.repsNow}回` : `合計${c.repsNow}回（比較できる前回の記録なし）`;
      return `<li><b>${esc(c.name)}</b>：${kg} ${reps}${c.pain ? ' <span class="tag warn">痛み</span>' : ''}</li>`;
    })
    .join('');
  const p = r.proposal;
  const status = r.proposalStatus;
  const weight =
    state.profile.body.enabled
      ? (() => {
          const a = analyzeWeightTrend(state.weights, state.meals, state.profile.food.mealsPerDay, todayStr());
          return `<section class="card"><h2>体重と推定の見直し</h2><p>${esc(a.message)}</p>
            <p class="muted small">基準：3週間以上・8回以上の体重記録、食事記録の充足度60%以上（アプリ独自の基準）。条件を満たしても、目安は自動では変えません。</p></section>`;
        })()
      : '';
  return `<section class="card"><div class="datebar">
      <button data-action="rev-week" data-d="-7" aria-label="前の週">◀</button>
      <b>${mmdd(ws)}〜${mmdd(addDays(ws, 6))}</b>
      <button data-action="rev-week" data-d="7" ${ws >= weekStartOf(todayStr()) ? 'disabled' : ''} aria-label="次の週">▶</button></div></section>
    <section class="card proposal"><h2>翌週に変えること（1つ）</h2>
      <p><b>${esc(p.title)}</b></p><p class="small">理由：${esc(p.reason)}</p>
      ${srcLinks(p.sourceIds)}
      ${
        p.apply
          ? status === 'adopted'
            ? '<span class="tag ok">採用済み（計画に反映しました）</span>'
            : status === 'dismissed'
              ? '<span class="tag">見送りました</span>'
              : `<div class="btnrow"><button class="primary" data-action="adopt-proposal">採用して計画に反映</button><button data-action="dismiss-proposal">今回は見送る</button></div>`
          : ''
      }
    </section>
    <section class="card"><h2>筋トレ</h2>
      <p>予定 <b>${r.plannedCount}</b> 日 ／ 実施 <b>${r.doneCount}</b> 日${r.notDone.length ? `／未実施 ${r.notDone.length} 日` : ''}</p>
      <table class="nut"><tbody>${days}</tbody></table>
      <h3>前回からの変化</h3>${changes ? `<ul class="plain">${changes}</ul>` : '<p class="muted">この週の記録はまだありません。</p>'}
    </section>
    <section class="card"><h2>食事の記録</h2>
      <p>記録した食事 <b>${r.meals.recordedMeals}</b> 回（${r.meals.daysWithRecords} 日分）${r.meals.unknownAmountMeals ? `・うち量不明 ${r.meals.unknownAmountMeals} 回` : ''}</p>
      ${r.meals.proteinAvgOnRecordedDays != null ? `<p class="small">記録した日の、記録できた分のたんぱく質：1日平均 ${grams(r.meals.proteinAvgOnRecordedDays)} g <span class="tag">目安</span></p>` : ''}
      <p class="muted small">記録していない食事は欠食として扱いません。</p>
    </section>${weight}`;
}

// ---------------------------------------------------------------- 設定・根拠

function placesMenusCard() {
  const f = state.profile.food;
  const kindOpts = Object.entries(PLACE_KINDS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('');
  const places = allPlaces(state)
    .map((pl) => {
      const menus = (state.menus ?? []).filter((m) => m.placeId === pl.id);
      const builtinCount = MEAL_TEMPLATES.filter((t) => t.place === pl.id).length;
      return `<li><div><b>${esc(pl.name)}</b> <span class="muted small">${esc(PLACE_KINDS[pl.kind] ?? '')}</span>
          ${pl.builtin ? '' : `<button class="sm link danger" data-action="del-place" data-id="${pl.id}">場所を削除</button>`}</div>
        ${
          builtinCount
            ? `<label class="opt small"><input type="checkbox" data-action="hide-builtin" data-id="${pl.id}" ${f.hideBuiltin?.[pl.id] ? '' : 'checked'}> アプリの例（${builtinCount}件）も候補に出す</label>`
            : ''
        }
        ${
          menus.length
            ? `<ul class="items">${menus
                .map((m) => {
                  const t = templateLookup(state)[m.id];
                  const n = mealNutrients(t);
                  return `<li>${esc(m.name)}${m.priceYen != null ? `・${yen(m.priceYen)}円` : ''}・<span class="small">${
                    t.nutritionUnknown ? '栄養は未登録' : `${kcal(n.total.kcal)} kcal・たんぱく質 ${grams(n.total.protein)} g`
                  }</span> <button class="sm link danger" data-action="del-menu" data-id="${m.id}">削除</button></li>`;
                })
                .join('')}</ul>`
            : '<p class="muted small">登録したメニューはまだありません。</p>'
        }</li>`;
    })
    .join('');
  const mode = ui.menuMode;
  const modeBtn = (k, v) => `<button type="button" class="chip-btn ${mode === k ? 'on' : ''}" data-action="menu-mode" data-v="${k}">${v}</button>`;
  const body =
    mode === 'similar'
      ? `<label class="field">似ている料理（栄養はこの料理の値を使う）<select name="templateId">${MEAL_TEMPLATES.map(
          (t) => `<option value="${t.id}">${esc(t.name)}</option>`,
        ).join('')}</select></label>
        <label class="field">量（自分で選ぶ倍率）<select name="scale">
          <option value="0.8">少なめ（×0.8）</option><option value="1" selected>ふつう（×1）</option><option value="1.3">大盛り（×1.3）</option></select></label>`
      : mode === 'label'
        ? `<p class="small">商品ラベルや掲示の「1食あたり」の値</p>
          <div class="grid4"><label class="field">kcal<input name="kcal" inputmode="decimal" required></label><label class="field">たんぱく質 g<input name="protein" inputmode="decimal" required></label>
          <label class="field">脂質 g<input name="fat" inputmode="decimal"></label><label class="field">炭水化物 g<input name="carb" inputmode="decimal"></label></div>`
        : '<p class="small">栄養が分からなくても登録できます。候補には出ますが、たんぱく質などでは比べません。</p>';
  return `<section class="card" id="menus"><h2>場所とメニュー</h2>
    <p class="small">よく行く場所と、そこで食べるメニューを一度登録しておくと、今日の候補に出て、1タップで記録できます。記録画面の「メニューに登録」からも登録できます。</p>
    <ul class="plain">${places}</ul>
    <h3>場所を追加</h3>
    <form id="addplace" class="grid3">
      <label class="field">名前<input name="name" required placeholder="例：駅前の牛丼チェーン"></label>
      <label class="field">種類<select name="kind">${kindOpts}</select></label>
      <button type="submit">追加</button>
    </form>
    <h3>メニューを登録</h3>
    <form id="addmenu" class="stack">
      <div class="grid3">
        <label class="field">場所<select name="placeId">${allPlaces(state).map((pl) => `<option value="${pl.id}">${esc(pl.name)}</option>`).join('')}</select></label>
        <label class="field">メニュー名<input name="name" required placeholder="例：日替わり定食"></label>
        <label class="field">値段（円・任意）<input name="price" inputmode="numeric"></label>
      </div>
      <div class="chips">${SLOT_ORDER.map((s) => `<label class="chip"><input type="checkbox" name="slots" value="${s}" ${s === 'lunch' ? 'checked' : ''}><span>${SLOTS[s]}</span></label>`).join('')}</div>
      <div class="chips">${modeBtn('similar', '似ている料理から')}${modeBtn('label', 'ラベルの値')}${modeBtn('unknown', '栄養は分からない')}</div>
      ${body}
      <div class="small">含まれるアレルゲン（掲示やラベルで確認できたもの）</div>
      <div class="chips">${ALLERGEN_CHOICES.map((a) => `<label class="chip"><input type="checkbox" name="allergen" value="${esc(a)}"><span>${esc(a)}</span></label>`).join('')}</div>
      <label class="opt"><input type="checkbox" name="needsCheck" checked> 原材料を全部は確認できていない（候補に「原材料を要確認」と出す）</label>
      <button class="primary" type="submit">登録する</button>
    </form>
  </section>`;
}

function settingsView() {
  const ids = Object.keys(SOURCES);
  return `${settingsForm(false)}${placesMenusCard()}
    ${
      state.avoid?.length
        ? `<section class="card"><h2>外している種目</h2><ul class="plain">${state.avoid
            .map((id) => `<li>${esc(EXERCISE_BY_ID[id]?.name ?? id)} <button class="sm" data-action="unavoid" data-ex="${id}">メニューに戻す</button></li>`)
            .join('')}</ul><p class="muted small">ほかに選べる種目がない場合は、外していても使います。</p></section>`
        : ''
    }
    <section class="card"><h2>根拠と出典</h2>
      <p class="small">各ルールの「根拠」から個別に開けます。※のついたものは、本文ではなく要約で数値を確認しています。</p>
      ${srcLinks(ids)}
    </section>
    <section class="card"><h2>データ</h2>
      <p class="small">データはこの端末のブラウザの中だけに保存されます（サーバーには送りません）。iPhoneのSafariは、しばらく開かないとデータを消すことがあるので、ホーム画面に追加するか、ときどき書き出してください。</p>
      <div class="btnrow"><button data-action="export">データを書き出す（JSON）</button>
      <label class="btn">読み込む<input type="file" accept="application/json" id="importFile" hidden></label></div>
      <button class="link danger" data-action="reset">すべてのデータを消す</button>
    </section>`;
}

// ---------------------------------------------------------------- 全体

function layout(inner) {
  const tabs = [
    ['today', '今日'],
    ['record', '記録'],
    ['review', '振り返り'],
    ['settings', '設定'],
  ];
  return `<header class="top"><b>きんトレごはん</b>${ui.flash ? `<span class="flash" role="status">${esc(ui.flash)}</span>` : ''}</header>
    <main>${inner}</main>
    <nav class="tabs">${tabs.map(([k, v]) => `<button class="${ui.tab === k ? 'on' : ''}" data-action="goto" data-tab="${k}">${v}</button>`).join('')}</nav>`;
}

function render() {
  const y = window.scrollY;
  if (!state.profile.setupDone) {
    root.innerHTML = `<header class="top"><b>きんトレごはん</b></header><main>${settingsForm(true)}</main>`;
  } else {
    const view = { today: todayView, record: recordView, review: reviewView, settings: settingsView }[ui.tab] ?? todayView;
    root.innerHTML = layout(view());
  }
  window.scrollTo(0, y);
  ui.flash = '';
}

// ---------------------------------------------------------------- 操作

root.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-action]');
  if (!el || el.tagName === 'SELECT') return;
  const a = el.dataset.action;
  const date = el.dataset.date ?? todayStr();
  switch (a) {
    case 'goto':
      ui.tab = el.dataset.tab;
      ui.editingMeal = null;
      render();
      window.scrollTo(0, 0);
      break;
    case 'ov-minutes':
      setOverride(state, todayStr(), { minutes: Number(el.dataset.v) });
      commit('今日だけ時間を変えて組み直しました');
      break;
    case 'ov-place':
      setOverride(state, todayStr(), { place: el.dataset.v });
      commit('今日だけ場所を変えて組み直しました');
      break;
    case 'ov-force':
      setOverride(state, todayStr(), { forceTraining: true, type: 'fullA' });
      commit('今日の筋トレを追加しました');
      break;
    case 'ov-clear':
      clearOverride(state, todayStr());
      commit('今日の変更を元に戻しました');
      break;
    case 'toggle-all':
      ui.showAllCandidates = !ui.showAllCandidates;
      render();
      break;
    case 'select-meal':
      selectCandidate(state, date, el.dataset.slot, el.dataset.id);
      commit('選択中（まだ記録には入っていません）');
      break;
    case 'unselect':
      clearCandidate(state, date, el.dataset.slot);
      commit();
      break;
    case 'confirm-meal':
      confirmCandidate(state, date, el.dataset.slot);
      commit('食べた食事として記録しました');
      break;
    case 'quick-record':
      selectCandidate(state, date, el.dataset.slot, el.dataset.id);
      confirmCandidate(state, date, el.dataset.slot);
      commit('記録しました');
      break;
    case 'edit-candidate': {
      confirmCandidate(state, date, el.dataset.slot);
      const recs = mealsOn(state, date);
      ui.editingMeal = recs.at(-1)?.id ?? null;
      ui.tab = 'record';
      ui.recordDate = date;
      commit('記録しました。量や値段を直してください');
      break;
    }
    case 'adopt': {
      const exId = el.dataset.ex;
      const planEx =
        sessionForDate(state, el.dataset.date).exercises?.find((e) => e.exId === exId) ??
        (() => {
          const ex = EXERCISE_BY_ID[exId];
          const p = prescription(resolvePriority(state.profile.training), state.profile.training.experience, ex);
          return { exId, ...p };
        })();
      const s = nextSuggestion(planEx, lastLogFor(exId, state.workouts, el.dataset.date), state.profile.training);
      const opt = s.options.find((o) => o.id === el.dataset.opt);
      adoptSuggestion(state, exId, opt, el.dataset.date);
      commit('採用しました。次回の計画に反映します');
      break;
    }
    case 'step': {
      const input = root.querySelector(`input[name="${el.dataset.target}"]`);
      const v = Number(input.value || 0) + Number(el.dataset.d);
      input.value = Math.max(0, v);
      break;
    }
    case 'skip-workout':
      markSkipped(state, date);
      commit('未実施として残しました（次の日の量は増やしません）');
      break;
    case 'redo-workout':
      if (confirm('この日の筋トレの記録を消して、記録し直しますか？')) {
        delete state.workouts[date];
        commit('記録を消しました');
      }
      break;
    case 'rec-date':
      ui.recordDate = addDays(ui.recordDate, Number(el.dataset.d));
      ui.editingMeal = null;
      render();
      break;
    case 'rev-week':
      ui.reviewWeek = addDays(ui.reviewWeek, Number(el.dataset.d));
      render();
      break;
    case 'open-add':
      ui.addMealOpen = true;
      render();
      break;
    case 'close-add':
      ui.addMealOpen = false;
      render();
      break;
    case 'add-mode':
      ui.addMode = el.dataset.v;
      render();
      break;
    case 'edit-meal':
      ui.editingMeal = el.dataset.id;
      render();
      break;
    case 'cancel-edit':
      ui.editingMeal = null;
      render();
      break;
    case 'del-meal':
      if (confirm('この食事の記録を削除しますか？')) {
        deleteMealRecord(state, date, el.dataset.id);
        commit('削除しました');
      }
      break;
    case 'adopt-proposal': {
      const r = weeklyReview(state, ui.reviewWeek, todayStr());
      applyProposal(state, ui.reviewWeek, r.proposal);
      commit('採用して計画に反映しました');
      break;
    }
    case 'dismiss-proposal': {
      const r = weeklyReview(state, ui.reviewWeek, todayStr());
      dismissProposal(state, ui.reviewWeek, r.proposal);
      commit('見送りました（計画は変わりません）');
      break;
    }
    case 'goto-menus':
      ui.tab = 'settings';
      render();
      document.getElementById('menus')?.scrollIntoView();
      break;
    case 'menu-mode':
      ui.menuMode = el.dataset.v;
      render();
      break;
    case 'menu-from-rec':
      ui.menuFromRec = el.dataset.id;
      render();
      break;
    case 'del-menu':
      if (confirm('このメニューを削除しますか？（これまでの記録は消えません）')) {
        deleteMenu(state, el.dataset.id);
        commit('メニューを削除しました');
      }
      break;
    case 'del-place':
      if (confirm('この場所と、その場所に登録したメニューを削除しますか？（これまでの記録は消えません）')) {
        deletePlace(state, el.dataset.id);
        commit('場所を削除しました');
      }
      break;
    case 'unavoid':
      state.avoid = (state.avoid ?? []).filter((x) => x !== el.dataset.ex);
      commit('メニューに戻しました');
      break;
    case 'export': {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const a2 = document.createElement('a');
      a2.href = URL.createObjectURL(blob);
      a2.download = `kintore-meshi-${todayStr()}.json`;
      a2.click();
      setTimeout(() => URL.revokeObjectURL(a2.href), 1000);
      break;
    }
    case 'reset':
      if (confirm('すべての設定と記録を消します。元に戻せません。よろしいですか？')) {
        state = defaultState();
        localStorage.removeItem(STORAGE_KEY);
        commit();
      }
      break;
    default:
  }
});

root.addEventListener('change', (ev) => {
  const el = ev.target;
  if (el.dataset?.action === 'hide-builtin') {
    state.profile.food.hideBuiltin = { ...(state.profile.food.hideBuiltin ?? {}), [el.dataset.id]: !el.checked };
    commit(el.checked ? 'アプリの例も候補に出します' : 'この場所は登録したメニューだけ候補に出します');
    return;
  }
  if (el.dataset?.action === 'swap') {
    const date = el.dataset.date;
    const swaps = { ...(state.overrides[date]?.swaps ?? {}), [el.dataset.pattern]: el.value };
    setOverride(state, date, { swaps });
    commit('今日だけ種目を替えました');
  }
  if (el.id === 'importFile' && el.files?.[0]) {
    el.files[0].text().then((txt) => {
      try {
        const data = JSON.parse(txt);
        if (!data?.profile) throw new Error('形式が違います');
        if (!confirm('今のデータを、読み込んだデータで置き換えます。よろしいですか？')) return;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        state = loadState();
        commit('読み込みました');
      } catch (e) {
        ui.flash = `読み込めませんでした：${e.message}`;
        render();
      }
    });
  }
});

root.addEventListener('submit', (ev) => {
  ev.preventDefault();
  const form = ev.target;
  if (form.id === 'settings') {
    const first = !state.profile.setupDone;
    readSettings(form);
    if (first) ui.tab = 'today';
    commit(first ? '設定しました。今日の提案です' : '設定を保存しました');
    if (first) window.scrollTo(0, 0);
  } else if (form.id === 'mealcond') {
    const fd = new FormData(form);
    const budget = String(fd.get('budget') ?? '').trim();
    setOverride(state, todayStr(), {
      meal: { slot: fd.get('slot'), place: fd.get('place') || null, budgetYen: budget === '' ? null : Number(budget) },
    });
    ui.showAllCandidates = false;
    commit('この条件で候補を出し直しました');
  } else if (form.id === 'workout') {
    const date = form.dataset.date;
    const { entries, fatigue } = readWorkoutForm(form);
    if (!entries.length) {
      ui.flash = '記録する種目がありません。休んだ場合は「今日は休んだ」を押してください';
      render();
      return;
    }
    recordWorkout(state, date, { entries, fatigue });
    commit('記録しました。次回の提案を確認できます');
  } else if (form.id === 'addmeal') {
    const date = form.dataset.date;
    const r = readAddMeal(form);
    if (r.template) {
      selectCandidate(state, date, r.slot, r.template.id);
      confirmCandidate(state, date, r.slot, r.price != null ? { priceYen: r.price, priceIsEstimate: false } : {});
    } else {
      addMealRecord(state, date, r.record);
    }
    ui.addMealOpen = false;
    commit('記録しました');
  } else if (form.classList.contains('editmeal')) {
    const date = form.dataset.date;
    const id = form.dataset.id;
    const m = mealsOn(state, date).find((x) => x.id === id);
    const fd = new FormData(form);
    const items = [];
    (m.items ?? []).forEach((it, k) => {
      if (fd.get(`rm_${k}`) === 'on') return;
      if (fd.has(`g_${k}`)) items.push({ ...it, grams: Number(fd.get(`g_${k}`)) });
      else if (fd.has(`p_${k}`)) items.push({ ...it, packages: Number(fd.get(`p_${k}`)) });
      else items.push(it);
    });
    const price = String(fd.get('price') ?? '').trim();
    updateMealRecord(state, date, id, {
      name: String(fd.get('name') ?? m.name),
      items,
      priceYen: price === '' ? null : Number(price),
      priceIsEstimate: price === '' ? m.priceIsEstimate : Number(price) !== m.priceYen ? false : m.priceIsEstimate,
      source: 'edited',
    });
    ui.editingMeal = null;
    commit('直しました');
  } else if (form.id === 'addplace') {
    const fd = new FormData(form);
    const place = addPlace(state, { name: fd.get('name'), kind: fd.get('kind') });
    commit(`「${place.name}」を追加しました`);
  } else if (form.id === 'addmenu') {
    const fd = new FormData(form);
    const n = (k) => {
      const v = Number(fd.get(k));
      return Number.isFinite(v) ? v : 0;
    };
    let items;
    if (ui.menuMode === 'similar') items = itemsFromTemplate(fd.get('templateId'), Number(fd.get('scale')) || 1);
    else if (ui.menuMode === 'label')
      items = [{ basis: 'labelPack', perPackage: { kcal: n('kcal'), protein: n('protein'), fat: n('fat'), carb: n('carb') }, packages: 1, display: 'ラベル・掲示の値（1食）' }];
    else items = [{ basis: 'unknown' }];
    const price = String(fd.get('price') ?? '').trim();
    const extra = ui.menuMode === 'similar' ? TEMPLATE_BY_ID[fd.get('templateId')]?.extraAllergens ?? [] : [];
    const m = addMenu(state, {
      placeId: fd.get('placeId'),
      name: String(fd.get('name')).trim(),
      priceYen: price === '' ? null : Number(price),
      slots: fd.getAll('slots'),
      items,
      allergens: [...new Set([...extra, ...fd.getAll('allergen')])],
      needsIngredientCheck: fd.get('needsCheck') === 'on',
    });
    commit(`「${m.name}」を登録しました`);
  } else if (form.classList.contains('menufromrec')) {
    const fd = new FormData(form);
    const m = menuFromRecord(state, form.dataset.date, form.dataset.id, { placeId: fd.get('placeId') });
    ui.menuFromRec = null;
    commit(m ? `「${m.name}」を${placeName(state, m.placeId)}のメニューに登録しました` : '登録できませんでした');
  } else if (form.id === 'weight') {
    const kg = Number(new FormData(form).get('kg'));
    setWeight(state, form.dataset.date, Number.isFinite(kg) ? kg : 0);
    commit('体重を保存しました');
  }
});

render();

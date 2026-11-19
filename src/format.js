// 表示用の丸め。計算関数では丸めず、ここでだけ丸める。

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/** kcal は整数 */
export const kcal = (v) => (v == null ? '—' : `${Math.round(v).toLocaleString('ja-JP')}`);
/** g は 10g 以上なら整数、未満なら小数1桁 */
export const grams = (v) => (v == null ? '—' : v >= 10 ? `${Math.round(v)}` : `${Math.round(v * 10) / 10}`);
/** 円は10円単位 */
export const yen = (v) => (v == null ? '—' : `${(Math.round(v / 10) * 10).toLocaleString('ja-JP')}`);
export const num1 = (v) => (v == null ? '—' : `${Math.round(v * 10) / 10}`);

export function mmdd(date) {
  const [, m, d] = date.split('-');
  const w = '日月火水木金土'[new Date(Number(date.slice(0, 4)), Number(m) - 1, Number(d)).getDay()];
  return `${Number(m)}/${Number(d)}（${w}）`;
}

export function restText(sec) {
  if (sec >= 60) return sec % 60 ? `${Math.floor(sec / 60)}分${sec % 60}秒` : `${sec / 60}分`;
  return `${sec}秒`;
}

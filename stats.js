// その日ごとの回答数・正解数をlocalStorageに記録する。
// サーバーを使わない静的サイトなので、この端末・このブラウザだけに保存される
// （他の端末とは同期しない。Safariのデータ消去等で消える）。
const STORAGE_KEY = 'sansu-stats-v1';

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAll(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // プライベートブラウズ等で保存できなくても、アプリ自体は止めない
  }
}

export function recordAnswer(unitKey, isCorrect) {
  const data = loadAll();
  const key = todayKey();
  if (!data[key]) data[key] = { total: 0, correct: 0, byUnit: {} };
  data[key].total += 1;
  if (isCorrect) data[key].correct += 1;
  if (!data[key].byUnit[unitKey]) data[key].byUnit[unitKey] = { total: 0, correct: 0 };
  data[key].byUnit[unitKey].total += 1;
  if (isCorrect) data[key].byUnit[unitKey].correct += 1;
  saveAll(data);
}

// 新しい日から順に並べて返す
export function getDailyStats() {
  const data = loadAll();
  return Object.keys(data)
    .sort((a, b) => (a < b ? 1 : -1))
    .map((date) => ({ date, ...data[date] }));
}

export function getTodayKey() {
  return todayKey();
}

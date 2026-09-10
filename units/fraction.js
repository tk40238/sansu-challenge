// 分数のたし算・ひき算（同分母、v1では答えが真分数になる範囲のみ）
import { normalizeDigits } from './utils.js';

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// レベルごとの分母の範囲。数字が大きくなるだけで、やり方（分母はそのまま、分子だけ計算）は同じ。
const LEVELS = {
  1: [3, 6],
  2: [4, 10],
  3: [8, 15],
  4: [10, 30],
};

export function generate(level = 2) {
  const range = LEVELS[level] || LEVELS[2];
  const denom = randInt(range[0], range[1]);
  const isAddition = Math.random() < 0.5;
  let n1, n2;

  if (isAddition) {
    n1 = randInt(1, denom - 2);
    n2 = randInt(1, denom - 1 - n1);
  } else {
    n1 = randInt(2, denom - 1);
    n2 = randInt(1, n1 - 1);
  }

  const op = isAddition ? '+' : '-';
  const resultNum = isAddition ? n1 + n2 : n1 - n2;

  const explanation = [
    '分母（下の数）はそのままで、分子（上の数）だけを計算します',
    `${n1} ${op} ${n2} = ${resultNum}`,
    `分母はそのままなので、答えは ${resultNum}/${denom}`,
  ];

  const hints = [
    '分母は変えずに、分子だけ計算してみよう',
    `${n1} ${op} ${n2} を計算してみよう`,
    `分子の答えがそのまま分子になって、分母は ${denom} のままだよ`,
  ];

  return {
    question: `${n1}/${denom} ${op} ${n2}/${denom} = ?`,
    answer: resultNum,
    denom,
    hints,
    explanation,
  };
}

export function checkAnswer(userInput, problem) {
  const raw = normalizeDigits(userInput);
  // 「5/7」のような入力と、分子だけの「5」のような入力の両方を許容する
  const slashMatch = raw.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (slashMatch) {
    const num = Number(slashMatch[1]);
    const den = Number(slashMatch[2]);
    return num === problem.answer && den === problem.denom;
  }
  const v = Number(raw);
  return !Number.isNaN(v) && v === problem.answer;
}

// 入力された「自分の間違った答え」から、よくある勘違いを推測して説明する。
// 検知できなければ null を返す（呼び出し側は一般的な解説にフォールバックする）。
export function diagnose(userInput, problem) {
  const raw = normalizeDigits(userInput);
  const slashMatch = raw.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (slashMatch) {
    const num = Number(slashMatch[1]);
    const den = Number(slashMatch[2]);
    if (num === problem.answer && den !== problem.denom) {
      return `分子（上の数）は合ってるよ！ でも分母（下の数）まで計算しちゃったのかも。分数のたし算・ひき算では、分母（${problem.denom}）はそのまま変えずに、分子だけ計算するのがルールだよ。`;
    }
  }
  return null;
}

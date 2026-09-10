// かけ算：2〜3桁 × 1〜2桁
import { normalizeDigits } from './utils.js';

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// レベルごとの範囲。数字が大きくなるだけで、やり方（位ごとに分けてかける）は同じ。
const LEVELS = {
  1: { aRange: [10, 99], bRange: [2, 9] },
  2: { aRange: [10, 999], bRange: [2, 12] },
  3: { aRange: [100, 999], bRange: [10, 99] },
  4: { aRange: [1000, 9999], bRange: [10, 99] },
};

export function generate(level = 2) {
  const cfg = LEVELS[level] || LEVELS[2];
  const a = randInt(cfg.aRange[0], cfg.aRange[1]);
  const b = randInt(cfg.bRange[0], cfg.bRange[1]);
  const answer = a * b;

  // aを位ごとに分解する
  const aStr = String(a);
  const digits = aStr.length;
  const parts = [];
  for (let i = 0; i < digits; i++) {
    const d = Number(aStr[i]);
    if (d === 0) continue;
    const place = Math.pow(10, digits - 1 - i);
    parts.push(d * place);
  }

  const explanation = [];
  if (parts.length > 1) {
    explanation.push(`${a} を位ごとに分けます： ${parts.join(' と ')}`);
  }
  const partials = [];
  for (const p of parts) {
    const result = p * b;
    explanation.push(`${p} × ${b} = ${result}`);
    partials.push(result);
  }
  if (partials.length > 1) {
    explanation.push(`${partials.join(' + ')} = ${answer}`);
  }

  const hints = [
    parts.length > 1
      ? `${a} を大きい位と小さい位に分けて考えてみよう`
      : `${a} を10のまとまりで考えてみよう`,
    `${parts[0]} × ${b} を先に計算してみよう`,
    parts.length > 1
      ? `${parts.join(' と ')} をそれぞれ ${b} 倍して、最後に全部たすと答えになるよ`
      : `${a} × ${b} をそのまま計算すると答えになるよ`,
  ];

  return {
    question: `${a} × ${b} = ?`,
    a,
    b,
    answer,
    partials,
    hints,
    explanation,
  };
}

export function checkAnswer(userInput, problem) {
  const v = Number(normalizeDigits(userInput));
  return !Number.isNaN(v) && v === problem.answer;
}

// 入力された「自分の間違った答え」から、よくある勘違いを推測して説明する。
// 検知できなければ null を返す（呼び出し側は一般的な解説にフォールバックする）。
export function diagnose(userInput, problem) {
  const v = Number(normalizeDigits(userInput));
  if (Number.isNaN(v)) return null;
  if (problem.partials && problem.partials.length > 1 && problem.partials.includes(v)) {
    return `それは計算の途中に出てくる数（一部分をかけた答え）だよ。位ごとに分けてかけた後、全部をたし合わせるのを忘れてないかな？`;
  }
  if (v === problem.a + problem.b) {
    return `それはたし算した答えだよ。今はかけ算（×）の問題だよ。`;
  }
  return null;
}

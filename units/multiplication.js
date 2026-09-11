// かけ算：2〜3桁 × 1〜2桁
// 実際の筆算どおり、一の位から順にかけて繰り上がりを処理する方式で計算・解説する。
import { normalizeDigits } from './utils.js';

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// aに1桁の数（digit）をかけて、繰り上がり込みの結果を求める（筆算の1行分）。
// stepsは一の位から順の計算過程（キャプションの文章作りに使う）。
function multiplyByDigit(aStr, digit) {
  const n = aStr.length;
  const resultDigits = [];
  const steps = [];
  let carry = 0;
  for (let i = n - 1; i >= 0; i--) {
    const d = Number(aStr[i]);
    const raw = d * digit + carry;
    const writeDigit = raw % 10;
    const carryOut = Math.floor(raw / 10);
    steps.push({ digit: d, carryIn: carry, raw, writeDigit, carryOut });
    resultDigits.unshift(writeDigit);
    carry = carryOut;
  }
  const finalCarry = carry; // 最後の位を計算し終えてもまだ残る繰り上がり（そのまま新しい先頭の桁になる）
  if (finalCarry > 0) resultDigits.unshift(finalCarry);
  return { value: Number(resultDigits.join('')), steps, finalCarry }; // stepsは一の位が先頭
}

// 「5×2=10、0を書いて1くり上げ」のような文章を、一の位から順に作る
function narrateMultiplyByDigit(digit, calcSteps, finalCarry) {
  const pieces = calcSteps.map((s) => {
    let piece = s.carryIn > 0 ? `${s.digit}×${digit}+${s.carryIn}=${s.raw}` : `${s.digit}×${digit}=${s.raw}`;
    if (s.carryOut > 0) piece += `（${s.writeDigit}を書いて${s.carryOut}くり上げ）`;
    return piece;
  });
  if (finalCarry > 0) {
    pieces.push(`さいごに残った繰り上がりの ${finalCarry} は、そのまま一番上の位として書く`);
  }
  return pieces.join('、');
}

// レベルごとの範囲。数字が大きくなるだけで、やり方（一の位から順にかけて繰り上がり）は同じ。
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
  const aStr = String(a);
  const bStr = String(b);

  // bの各桁（一の位から）ごとに部分積を作る。2桁目以降は10倍・100倍…した位置にずれる（shift）。
  const partials = [];
  for (let i = bStr.length - 1; i >= 0; i--) {
    const digit = Number(bStr[i]);
    const shift = bStr.length - 1 - i;
    const { value, steps, finalCarry } = multiplyByDigit(aStr, digit);
    partials.push({
      digit,
      shift,
      value,
      calcSteps: steps,
      finalCarry,
      narration: narrateMultiplyByDigit(digit, steps, finalCarry),
    });
  }

  const visual = { type: 'multiplication', a, b, aStr, bStr, partials, answer };

  const hints = bStr.length > 1
    ? [
      '一の位から順に、かける数の1つの位ずつ計算してみよう',
      `まず ${a} × ${bStr[bStr.length - 1]}（かける数の一の位）を計算してみよう`,
      'かける数が2桁のときは、十の位をかけた答えを1つ左にずらして書いて、最後に全部たし算すると答えになるよ',
    ]
    : [
      '一の位から順に計算して、繰り上がりを次の位にたすのを忘れないようにしよう',
      `${a} の一の位 × ${b} から始めてみよう`,
      '繰り上がりを書いておいて、次の位を計算するときに忘れずたそう',
    ];

  return {
    question: `${a} × ${b} = ?`,
    a,
    b,
    answer,
    partials,
    hints,
    visual,
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
  const partialValues = problem.partials.map((p) => p.value);
  if (problem.partials.length > 1 && partialValues.includes(v)) {
    return `それは計算の途中に出てくる数（部分積の1つ）だよ。かける数の各位でかけた答えを、全部たし合わせるのを忘れてないかな？`;
  }
  if (v === problem.a + problem.b) {
    return `それはたし算した答えだよ。今はかけ算（×）の問題だよ。`;
  }
  return null;
}

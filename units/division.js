// わり算：2〜3桁 ÷ 1桁。
// あまりが出る問題は「商 → あまり」の2段階（stages）で答える形にする。
// 段階が進むごとに式そのものが育っていく（「72÷5=?」→「72÷5=14 あまり ?」）ようにして、
// 別画面に切り替わるのではなく1つの式を解いている感覚を保つ。
// 解説は筆算（ひっ算）の形でアニメーション表示するため、桁の位置（colEnd）も持たせる。
import { normalizeDigits } from './utils.js';

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function longDivisionSteps(dividend, divisor) {
  const dividendStr = String(dividend);
  const steps = [];
  let current = 0;
  let currentStart = 0; // 今の数が視覚的に占める最初の列（0始まり）
  const quotientDigits = [];
  let started = false;

  for (let i = 0; i < dividendStr.length; i++) {
    const digit = Number(dividendStr[i]);
    current = current * 10 + digit;
    const q = Math.floor(current / divisor);
    if (q === 0 && !started) continue;
    started = true;
    quotientDigits.push(q);
    const used = q * divisor;
    const remainder = current - used;

    // 見た目の桁数は文字列長ではなく列の位置から出す。
    // あまりが0だった直後は、数値上は先頭の0が消えて桁数が減って見えるが、
    // 筆算では前のステップの「0」がまだその場に残っているため、その分も含めた幅にする。
    const currentLen = i - currentStart + 1;
    const remLen = String(remainder).length;
    const remStart = i - remLen + 1;

    steps.push({
      colEnd: i,
      current,
      currentStart,
      currentLen,
      quotientDigit: q,
      used,
      remainder,
      remStart,
      remLen,
    });

    current = remainder;
    currentStart = remStart; // 次のステップの「今の数」は、このあまりの開始列から続く
  }

  const quotient = quotientDigits.length ? Number(quotientDigits.join('')) : 0;
  return { quotient, remainder: current, steps, dividendDigits: dividendStr.length };
}

// レベルごとの範囲。数字が大きくなるだけで、やり方（たてる・かける・ひく・おろす）は同じ。
const LEVELS = {
  1: { divisorRange: [2, 9], quotientRange: [10, 99], allowRemainder: false },
  2: { divisorRange: [2, 9], quotientRange: [10, 99], allowRemainder: true },
  3: { divisorRange: [10, 99], quotientRange: [10, 99], allowRemainder: true },
  4: { divisorRange: [10, 99], quotientRange: [100, 999], allowRemainder: true },
};

export function generate(level = 2) {
  const cfg = LEVELS[level] || LEVELS[2];
  const divisor = randInt(cfg.divisorRange[0], cfg.divisorRange[1]);
  const withRemainder = cfg.allowRemainder && Math.random() < 0.5;
  const quotient = randInt(cfg.quotientRange[0], cfg.quotientRange[1]);
  const remainder = withRemainder ? randInt(1, divisor - 1) : 0;
  const dividend = divisor * quotient + remainder;

  const { steps, dividendDigits } = longDivisionSteps(dividend, divisor);

  const visual = {
    type: 'long-division',
    dividend,
    divisor,
    dividendDigits,
    steps,
    quotient,
    remainder,
  };

  if (!withRemainder) {
    const hints = [
      '大きい位から順番に、わる数がいくつ入るか考えてみよう',
      `いちばん左の位から、${divisor} が何回入るか数えてみよう`,
      '一の位まで、順番に「入る回数」を求めて、のこりを次の位にくっつけて考えるよ',
    ];
    return { question: `${dividend} ÷ ${divisor} = ?`, answer: quotient, hints, visual };
  }

  const quotientHints = [
    '大きい位から順番に、わる数がいくつ入るか考えてみよう',
    `いちばん左の位から、${divisor} が何回入るか数えてみよう`,
    '一の位まで、順番に「入る回数」を求めていくよ（あまりは次で考えよう）',
  ];
  const remainderHints = [
    '商をかけ算して、もとの数からひくと、のこりが出るよ',
    `${divisor} × ${quotient} を計算して、${dividend} からひいてみよう`,
    `${dividend} - ${divisor * quotient} を計算すると、あまりになるよ`,
  ];

  return {
    stages: [
      { question: `${dividend} ÷ ${divisor} = ?`, answer: quotient, hints: quotientHints },
      { question: `${dividend} ÷ ${divisor} = ${quotient} あまり ?`, answer: remainder, hints: remainderHints },
    ],
    visual,
  };
}

export function checkAnswer(userInput, problem, stageIndex) {
  const v = Number(normalizeDigits(userInput));
  if (Number.isNaN(v)) return false;
  if (problem.stages) {
    return v === problem.stages[stageIndex].answer;
  }
  return v === problem.answer;
}

// 入力された「自分の間違った答え」から、よくある勘違いを推測して説明する。
// 検知できなければ null を返す（呼び出し側は一般的な解説にフォールバックする）。
export function diagnose(userInput, problem, stageIndex) {
  const v = Number(normalizeDigits(userInput));
  if (Number.isNaN(v)) return null;
  if (problem.stages) {
    const [quotientAns, remainderAns] = [problem.stages[0].answer, problem.stages[1].answer];
    if (stageIndex === 0 && v === remainderAns) {
      return `それは「あまり」の数だよ。今きかれているのは先に「商」（わりきれる数）の方だよ。`;
    }
    if (stageIndex === 1 && v === quotientAns) {
      return `それは「商」の数だよ。もう商は答えたから、今きかれているのは「あまり」の方だよ。`;
    }
  }
  return null;
}

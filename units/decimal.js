// 小数のたし算・ひき算
// 浮動小数点の誤差を避けるため、内部では「一番小さい位がいくつ分」の整数で計算する
import { normalizeDigits } from './utils.js';

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// レベルごとの範囲。数字が大きくなる・桁が増えるだけで、やり方（そろえて整数として計算）は同じ。
// unitRange は「一番小さい位のいくつ分」を表す整数の範囲。decimalPlaces で小数点の位置を決める。
const LEVELS = {
  1: { unitRange: [10, 49], decimalPlaces: 1 },
  2: { unitRange: [10, 99], decimalPlaces: 1 },
  3: { unitRange: [100, 999], decimalPlaces: 2 },
  4: { unitRange: [1000, 9999], decimalPlaces: 2 },
};

export function generate(level = 2) {
  const cfg = LEVELS[level] || LEVELS[2];
  const places = cfg.decimalPlaces;
  const unit = Math.pow(10, -places); // 例: 1桁なら0.1、2桁なら0.01
  const unitLabel = unit.toFixed(places);

  const isAddition = Math.random() < 0.5;
  let a = randInt(cfg.unitRange[0], cfg.unitRange[1]);
  let b = randInt(cfg.unitRange[0], cfg.unitRange[1]);
  const op = isAddition ? '+' : '-';

  if (!isAddition) {
    if (b > a) [a, b] = [b, a];
    if (a === b) b = Math.max(cfg.unitRange[0], a - randInt(1, 5));
  }

  const resultUnits = isAddition ? a + b : a - b;
  const aVal = (a * unit).toFixed(places);
  const bVal = (b * unit).toFixed(places);
  const resultVal = (resultUnits * unit).toFixed(places);

  const explanation = [
    '小数点をそろえて考えます',
    `${aVal} は ${unitLabel} が ${a} こ、${bVal} は ${unitLabel} が ${b} こ`,
    `${a} ${op} ${b} = ${resultUnits}`,
    `${unitLabel} が ${resultUnits} こなので、答えは ${resultVal}`,
  ];

  const hints = [
    `${unitLabel} がいくつ分か、に置きかえて考えてみよう`,
    `${aVal} を ${unitLabel} が ${a} こ、と考えてみよう`,
    '整数だと思って計算してから、さいごに小数点をつけると答えになるよ',
  ];

  return {
    question: `${aVal} ${op} ${bVal} = ?`,
    answer: Number(resultVal),
    resultUnits,
    places,
    hints,
    explanation,
  };
}

export function checkAnswer(userInput, problem) {
  const v = Number(normalizeDigits(userInput));
  return !Number.isNaN(v) && Math.abs(v - problem.answer) < 0.0001;
}

// 入力された「自分の間違った答え」から、よくある勘違いを推測して説明する。
// 検知できなければ null を返す（呼び出し側は一般的な解説にフォールバックする）。
export function diagnose(userInput, problem) {
  const v = Number(normalizeDigits(userInput));
  if (Number.isNaN(v)) return null;
  if (v === problem.resultUnits) {
    return `小数点を忘れて、整数のまま答えちゃったのかも。計算した数字（${problem.resultUnits}）は合ってるから、あとは小数点を正しい位置に戻すだけだよ。答えは ${problem.answer} になるよ。`;
  }
  return null;
}

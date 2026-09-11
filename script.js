import * as multiplication from './units/multiplication.js';
import * as division from './units/division.js';
import * as decimal from './units/decimal.js';
import * as fraction from './units/fraction.js';
import { recordAnswer, getDailyStats, getTodayKey } from './stats.js';

const UNITS = {
  multiplication: { label: 'かけ算', module: multiplication },
  division: { label: 'わり算', module: division },
  decimal: { label: '小数', module: decimal },
  fraction: { label: '分数', module: fraction },
};
const MIX_KEYS = Object.keys(UNITS);

const screenSelect = document.getElementById('screen-select');
const screenLevel = document.getElementById('screen-level');
const screenProblem = document.getElementById('screen-problem');
const screenStats = document.getElementById('screen-stats');
const levelUnitBadge = document.getElementById('level-unit-badge');
const btnBackToSelect = document.getElementById('btn-back-to-select');
const btnStats = document.getElementById('btn-stats');
const btnBackFromStats = document.getElementById('btn-back-from-stats');
const statsTodayEl = document.getElementById('stats-today');
const statsListEl = document.getElementById('stats-list');
const unitNameBadge = document.getElementById('unit-name-badge');
const problemQuestion = document.getElementById('problem-question');
let answerInput = document.getElementById('answer-input');
const btnSubmit = document.getElementById('btn-submit');
const btnNext = document.getElementById('btn-next');
const btnBack = document.getElementById('btn-back');
const feedbackArea = document.getElementById('feedback-area');
const hintArea = document.getElementById('hint-area');
const explanationArea = document.getElementById('explanation-area');

let state = {
  unitKey: null,       // 選んだ単元。'mix' の場合は問題ごとにランダムで単元を選ぶ
  level: 2,            // 1〜4。数字が大きくなるだけで、やり方は同じ。
  activeModuleKey: null,
  activeModule: null,
  problem: null,
  stageIndex: 0,        // stages形式の問題（あまりありのわり算など）で使う
  attempts: 0,
  answered: false,
  explanationRunId: 0, // 解説アニメーションの世代番号。問題が切り替わったら古いタイマーを無効化するために使う
};

const MAX_ATTEMPTS_BEFORE_REVEAL = 3;

function bindAnswerInputEvents() {
  answerInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSubmit();
  });
}

// iOSのSafariは同じid/nameの入力欄だと前の値を自動補完で復元してくることがあるため、
// クローンではなく完全に新しい<input>を、毎回ランダムなname属性で作り直す。
function replaceAnswerInputElement() {
  const old = answerInput;
  const fresh = document.createElement('input');
  fresh.type = 'text';
  fresh.id = 'answer-input';
  fresh.name = `ans-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  fresh.autocomplete = 'off';
  fresh.setAttribute('autocorrect', 'off');
  fresh.setAttribute('autocapitalize', 'off');
  fresh.setAttribute('spellcheck', 'false');
  fresh.setAttribute('inputmode', old.getAttribute('inputmode') || 'decimal');
  fresh.placeholder = old.placeholder;
  fresh.className = old.className;
  old.replaceWith(fresh);
  answerInput = fresh;
  bindAnswerInputEvents();
  return answerInput;
}

function showScreen(el) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  el.classList.add('active');
}

function formatDateLabel(dateStr) {
  const [, m, d] = dateStr.split('-');
  return `${Number(m)}/${Number(d)}`;
}

function unitLabelFor(key) {
  return UNITS[key] ? UNITS[key].label : key;
}

function renderStatsScreen() {
  const days = getDailyStats();
  const today = days.find((d) => d.date === getTodayKey());

  statsTodayEl.innerHTML = '';
  if (today) {
    const rate = today.total > 0 ? Math.round((today.correct / today.total) * 100) : 0;
    const p1 = document.createElement('p');
    p1.className = 'stats-today-label';
    p1.textContent = 'きょう';
    const p2 = document.createElement('p');
    p2.className = 'stats-today-rate';
    p2.textContent = `${rate}%`;
    const p3 = document.createElement('p');
    p3.className = 'stats-today-count';
    p3.textContent = `${today.correct} / ${today.total} もん せいかい`;
    statsTodayEl.append(p1, p2, p3);
  } else {
    const p = document.createElement('p');
    p.className = 'stats-today-empty';
    p.textContent = 'きょうはまだ もんだいを といていないよ';
    statsTodayEl.appendChild(p);
  }

  statsListEl.innerHTML = '';
  if (days.length === 0) {
    const p = document.createElement('p');
    p.className = 'stats-empty';
    p.textContent = 'きろくがまだないよ。もんだいをといてみよう！';
    statsListEl.appendChild(p);
    return;
  }

  days.forEach((d) => {
    const rate = d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0;
    const row = document.createElement('div');
    row.className = 'stats-row';

    const main = document.createElement('div');
    main.className = 'stats-row-main';
    const dateEl = document.createElement('span');
    dateEl.className = 'stats-row-date';
    dateEl.textContent = formatDateLabel(d.date);
    const rateEl = document.createElement('span');
    rateEl.className = 'stats-row-rate';
    rateEl.textContent = `${rate}%`;
    const countEl = document.createElement('span');
    countEl.className = 'stats-row-count';
    countEl.textContent = `${d.correct} / ${d.total} もん`;
    main.append(dateEl, rateEl, countEl);

    const detail = document.createElement('div');
    detail.className = 'stats-row-detail';
    detail.textContent = Object.entries(d.byUnit)
      .map(([key, v]) => `${unitLabelFor(key)} ${v.correct}/${v.total}`)
      .join('　');

    row.append(main, detail);
    statsListEl.appendChild(row);
  });
}

function pickModuleForThisProblem() {
  if (state.unitKey === 'mix') {
    const key = MIX_KEYS[Math.floor(Math.random() * MIX_KEYS.length)];
    return { key, module: UNITS[key].module, label: UNITS[key].label };
  }
  const key = state.unitKey;
  return { key, module: UNITS[key].module, label: UNITS[key].label };
}

function startUnit(unitKey) {
  state.unitKey = unitKey;
  levelUnitBadge.textContent = unitKey === 'mix' ? 'ミックス' : UNITS[unitKey].label;
  showScreen(screenLevel);
}

function startLevel(level) {
  state.level = level;
  unitNameBadge.textContent = (state.unitKey === 'mix' ? 'ミックス' : UNITS[state.unitKey].label) + ` Lv.${level}`;
  showScreen(screenProblem);
  loadNextProblem();
}

function isMultiStage() {
  return Array.isArray(state.problem.stages);
}

function currentStage() {
  return state.problem.stages[state.stageIndex];
}

function currentQuestionText() {
  return isMultiStage() ? currentStage().question : state.problem.question;
}

function currentHints() {
  return isMultiStage() ? currentStage().hints : state.problem.hints;
}

function currentAnswerCorrect(value) {
  return state.activeModule.checkAnswer(value, state.problem, state.stageIndex);
}

function renderQuestion() {
  problemQuestion.classList.remove('question-pop');
  problemQuestion.textContent = currentQuestionText();
  // 式が育ったことが分かるよう、軽くポップさせる
  void problemQuestion.offsetWidth; // reflow でアニメーションを再トリガー
  problemQuestion.classList.add('question-pop');
}

function loadNextProblem() {
  const picked = pickModuleForThisProblem();
  state.activeModuleKey = picked.key;
  state.activeModule = picked.module;
  state.problem = picked.module.generate(state.level);
  state.stageIndex = 0;
  state.attempts = 0;
  state.answered = false;
  state.explanationRunId += 1;

  if (state.unitKey === 'mix') {
    unitNameBadge.textContent = `ミックス（${picked.label}） Lv.${state.level}`;
  }

  renderQuestion();

  replaceAnswerInputElement();
  answerInput.disabled = false;
  // 分数は「5/7」のような入力もあるためテキスト入力にする。それ以外は数字キーボード。
  if (picked.key === 'fraction') {
    answerInput.setAttribute('inputmode', 'text');
    answerInput.placeholder = 'こたえ（例: 5/7）';
  } else {
    answerInput.setAttribute('inputmode', 'decimal');
    answerInput.placeholder = 'こたえ';
  }

  feedbackArea.textContent = '';
  feedbackArea.className = 'feedback-area';
  hintArea.innerHTML = '';
  explanationArea.innerHTML = '';
  btnSubmit.style.display = '';
  btnNext.style.display = 'none';

  // replaceAnswerInputElement()でできた新しい<input>はこの時点で必ず空なので、
  // 遅延させて消す必要はない（遅延させると、すぐに入力した答えを後から消してしまう）。
  answerInput.focus();
}

// 数字は1桁ずつ個別のマスに分けて置く（1つのマスに複数桁をまとめて中央寄せすると、
// 隣のマスとの間にムラができて、他の行と揃って見えなくなるため）。筆算系の解説で共通に使う。
function renderDigitsInRow(row, value, startCol, extraClass) {
  const str = String(value);
  for (let k = 0; k < str.length; k++) {
    const span = document.createElement('span');
    span.className = `ld-cell ${extraClass}`;
    span.style.gridColumn = `${startCol + k} / span 1`;
    span.style.gridRow = '1';
    span.textContent = str[k];
    row.appendChild(span);
  }
}

// 筆算系の解説（わり算・かけ算・小数）で共通の「1ステップずつキャプション付きで、
// 自分のペースで進める」プレーヤー。beatsは { caption, run() } の配列。
function playBeats(box, caption, beats, onReplay) {
  const controls = document.createElement('div');
  controls.className = 'ld-controls';
  const nextBeatBtn = document.createElement('button');
  nextBeatBtn.type = 'button';
  nextBeatBtn.className = 'ld-next-btn';
  nextBeatBtn.textContent = 'つぎへ →';
  const replayBtn = document.createElement('button');
  replayBtn.type = 'button';
  replayBtn.className = 'ld-replay-btn';
  replayBtn.textContent = '↺ もう一回みる';
  replayBtn.style.display = 'none';
  controls.appendChild(nextBeatBtn);
  controls.appendChild(replayBtn);
  box.appendChild(controls);

  const runId = state.explanationRunId;
  let i = 0;
  function showBeat(index) {
    if (state.explanationRunId !== runId) return; // 別の問題に切り替わっていたら止める
    const beat = beats[index];
    caption.classList.remove('ld-pop');
    void caption.offsetWidth;
    caption.textContent = beat.caption;
    caption.classList.add('ld-pop');
    beat.run();
    if (index >= beats.length - 1) {
      nextBeatBtn.style.display = 'none';
      replayBtn.style.display = '';
    }
  }
  showBeat(0);

  nextBeatBtn.addEventListener('click', () => {
    if (i >= beats.length - 1) return;
    i += 1;
    showBeat(i);
  });

  replayBtn.addEventListener('click', onReplay);
}

function renderExplanation(steps, title) {
  const box = document.createElement('div');
  box.className = 'explain-box';
  const heading = document.createElement('p');
  heading.className = 'explain-title';
  heading.textContent = title;
  box.appendChild(heading);

  steps.forEach((stepText, idx) => {
    const p = document.createElement('p');
    p.className = 'explain-step';
    p.style.animationDelay = `${idx * 0.35}s`;
    const num = document.createElement('span');
    num.className = 'step-num';
    num.textContent = String(idx + 1);
    p.appendChild(num);
    p.appendChild(document.createTextNode(stepText));
    box.appendChild(p);
  });

  explanationArea.innerHTML = '';
  explanationArea.appendChild(box);
}

// わり算の筆算は「①たてる→②かける→③ひく→④おろす」の繰り返し、という小学校で習う基本の型に
// そのまま沿わせて、1アクションずつキャプション付きで、自分のペース（「つぎへ」ボタン）で見せる。

function renderLongDivisionExplanation(visual, title) {
  const { dividend, divisor, dividendDigits, steps, quotient, remainder } = visual;
  const dividendStr = String(dividend);
  const N = dividendDigits;

  const box = document.createElement('div');
  box.className = 'explain-box';
  const heading = document.createElement('p');
  heading.className = 'explain-title';
  heading.textContent = title;
  box.appendChild(heading);

  const caption = document.createElement('p');
  caption.className = 'ld-caption';
  box.appendChild(caption);

  // 筆算の枠（かっこ）は「わられる数」から下だけを囲む。商は枠の外・上に書く
  // （これが本来の書き方。枠の中に商まで入れてしまうと、囲みの上線が商の上に来て見た目がおかしくなる）。
  const wrap = document.createElement('div');
  wrap.className = 'ld-wrap';

  const quotientLine = document.createElement('div');
  quotientLine.className = 'ld-quotient-line';
  const divisorSpacer = document.createElement('div');
  divisorSpacer.className = 'ld-divisor-spacer';
  divisorSpacer.textContent = divisor; // わる数と同じ文字を入れて、同じ幅の余白にする（見えないだけ）
  quotientLine.appendChild(divisorSpacer);

  const qRow = document.createElement('div');
  qRow.className = 'ld-row ld-quotient-row';
  qRow.style.setProperty('--ld-cols', N);
  quotientLine.appendChild(qRow);
  wrap.appendChild(quotientLine);

  const divisorBodyRow = document.createElement('div');
  divisorBodyRow.className = 'ld-divisor-body-row';

  const divisorEl = document.createElement('div');
  divisorEl.className = 'ld-divisor';
  divisorEl.textContent = divisor;
  divisorBodyRow.appendChild(divisorEl);

  const body = document.createElement('div');
  body.className = 'ld-body';
  body.style.setProperty('--ld-cols', N);
  divisorBodyRow.appendChild(body);

  wrap.appendChild(divisorBodyRow);

  const dRow = document.createElement('div');
  dRow.className = 'ld-row ld-dividend-row';
  const dividendDigitEls = [];
  for (let i = 0; i < N; i++) {
    const span = document.createElement('span');
    span.className = 'ld-cell';
    span.style.gridColumn = `${i + 1} / span 1`;
    span.style.gridRow = '1';
    span.textContent = dividendStr[i];
    dRow.appendChild(span);
    dividendDigitEls.push(span);
  }
  body.appendChild(dRow);

  box.appendChild(wrap);

  const summary = document.createElement('p');
  summary.className = 'ld-summary';
  summary.style.display = 'none';
  box.appendChild(summary);

  explanationArea.innerHTML = '';
  explanationArea.appendChild(box);

  // 「おろす」で、わられる数の該当の桁が実際に下へ降りてくるように見せる演出。
  // 元の数字の位置から、のこりの行の隣（次の位）まで、絶対配置＋transitionで動かす。
  function animateBringDown(digitEl, targetRow, targetColEnd) {
    const bodyRect = body.getBoundingClientRect();
    const sourceRect = digitEl.getBoundingClientRect();

    const placeholder = document.createElement('span');
    placeholder.className = 'ld-cell';
    placeholder.style.gridColumn = `${targetColEnd + 1} / span 1`;
    placeholder.style.gridRow = '1';
    placeholder.style.visibility = 'hidden';
    targetRow.appendChild(placeholder);
    const targetRect = placeholder.getBoundingClientRect();
    placeholder.remove();

    const clone = document.createElement('span');
    clone.className = 'ld-cell ld-bringdown-clone';
    clone.textContent = digitEl.textContent;
    clone.style.width = `${sourceRect.width}px`;
    clone.style.left = `${sourceRect.left - bodyRect.left}px`;
    clone.style.top = `${sourceRect.top - bodyRect.top}px`;
    body.appendChild(clone);

    digitEl.classList.add('ld-digit-used');

    // 開始位置を確実にブラウザに描画させてから移動させる（rAFを2回挟んで確実にする）
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        clone.classList.add('ld-bringdown-moving');
        clone.style.left = `${targetRect.left - bodyRect.left}px`;
        clone.style.top = `${targetRect.top - bodyRect.top}px`;
      });
    });

    // 降りた後は消さずにその場に残す（のこりの数の続きとして見えるように）
    clone.addEventListener('transitionend', () => {
      clone.classList.add('ld-bringdown-landed');
    }, { once: true });
  }

  // --- ①たてる ②かける ③ひく ④おろす、の順にアクションを積み上げる ---
  const beats = [];
  const remRowByStepIdx = [];

  steps.forEach((s, idx) => {
    beats.push({
      caption: `①たてる：${s.current} の中に ${divisor} は何回入るか考えます → ${s.quotientDigit}`,
      run: () => {
        const span = document.createElement('span');
        span.className = 'ld-cell ld-quotient-digit';
        span.style.gridColumn = `${s.colEnd + 1} / span 1`;
        span.style.gridRow = '1';
        span.textContent = s.quotientDigit;
        qRow.appendChild(span);
      },
    });

    beats.push({
      caption: `②かける：${divisor} × ${s.quotientDigit} = ${s.used}`,
      run: () => {
        const usedLen = String(s.used).length;
        const usedStart = s.colEnd - usedLen + 2;
        const usedRow = document.createElement('div');
        usedRow.className = 'ld-row ld-used-row';
        renderDigitsInRow(usedRow, s.used, usedStart, 'ld-used-value');
        body.appendChild(usedRow);
      },
    });

    beats.push({
      caption: `③ひく：${s.current} − ${s.used} = ${s.remainder}`,
      run: () => {
        // 線は「使った数」ではなく「今の数（current）」の幅に合わせる。
        // あまりが0だった直後は数値上の桁数が減って見えるため、division.js側で列位置から
        // 計算し直した currentStart/currentLen をそのまま使う（文字列長からは出さない）。
        const lineRow = document.createElement('div');
        lineRow.className = 'ld-row ld-line-row';
        const line = document.createElement('span');
        line.className = 'ld-subtract-line';
        line.style.gridColumn = `${s.currentStart + 1} / span ${s.currentLen}`;
        lineRow.appendChild(line);
        body.appendChild(lineRow);

        const remStart = s.remStart + 1;
        const remRow = document.createElement('div');
        remRow.className = 'ld-row ld-remainder-row';
        renderDigitsInRow(remRow, s.remainder, remStart, 'ld-remainder-value');
        body.appendChild(remRow);
        remRowByStepIdx[idx] = remRow;
      },
    });

    if (idx < steps.length - 1) {
      const nextColEnd = steps[idx + 1].colEnd;
      const nextDigit = dividendStr[nextColEnd];
      beats.push({
        caption: `④おろす：のこりの ${s.remainder} に、次の位の ${nextDigit} をおろしてくっつけます → ${steps[idx + 1].current}`,
        run: () => {
          animateBringDown(dividendDigitEls[nextColEnd], remRowByStepIdx[idx], nextColEnd);
        },
      });
    }
  });

  beats.push({
    caption: remainder === 0
      ? `あまりがないので、答えは ${quotient} です`
      : `さいごに ${remainder} あまるので、答えは ${quotient} あまり ${remainder} です`,
    run: () => {
      summary.textContent = remainder === 0 ? `答え：${quotient}` : `答え：${quotient} あまり ${remainder}`;
      summary.style.display = '';
      summary.classList.add('ld-pop');
    },
  });

  playBeats(box, caption, beats, () => renderLongDivisionExplanation(visual, title));
}

// かけ算の筆算も、わり算と同じ「1アクションずつ・自分のペースで」の見せ方にする。
// 一の位から順に、九九の答えを1つずつ書いていく過程をそのまま見せる。
const PLACE_NAMES = ['一', '十', '百', '千', '万', '十万', '百万'];
function placeName(i) {
  return `${PLACE_NAMES[i] || `10^${i}の`}の位`;
}

function renderMultiplicationExplanation(visual, title) {
  const { a, b, aStr, bStr, partials, answer } = visual;
  const N = String(answer).length;
  const totalCols = N + 1; // ×や+の記号を書く列を1つ確保しておく（右端=totalColsをそろえる基準にする）

  const box = document.createElement('div');
  box.className = 'explain-box';
  const heading = document.createElement('p');
  heading.className = 'explain-title';
  heading.textContent = title;
  box.appendChild(heading);

  const caption = document.createElement('p');
  caption.className = 'ld-caption';
  box.appendChild(caption);

  const wrap = document.createElement('div');
  wrap.className = 'ld-wrap';
  box.appendChild(wrap);

  // 行ごとに独立したグリッド（同じtotalCols・同じ右端）を作る。行によって記号の有無や
  // 数字の桁数が違っても、右端をそろえておけば列がずれない（わり算のような幅合わせ用の
  // 見えないスペーサーは不要）。
  function makeRow() {
    const row = document.createElement('div');
    row.className = 'ld-row';
    row.style.setProperty('--ld-cols', totalCols);
    wrap.appendChild(row);
    return row;
  }

  function appendCell(row, col, text, cls) {
    const span = document.createElement('span');
    span.className = `ld-cell ${cls}`;
    span.style.gridColumn = `${col} / span 1`;
    span.style.gridRow = '1';
    span.textContent = text;
    row.appendChild(span);
    return span;
  }

  // 右端(totalCols)をそろえて右づめで数字を置く。戻り値はいちばん左の桁の列番号
  // （記号をその1つ左＝startCol-1に置けば、数字にぴったりくっついて見える）。
  function appendNumber(row, valueStr, cls) {
    const startCol = totalCols - valueStr.length + 1;
    for (let k = 0; k < valueStr.length; k++) {
      appendCell(row, startCol + k, valueStr[k], cls);
    }
    return startCol;
  }

  function appendFullLine(row) {
    const line = document.createElement('span');
    line.className = 'ld-subtract-line';
    line.style.gridColumn = `1 / span ${totalCols}`;
    row.appendChild(line);
  }

  const aRow = makeRow();
  appendNumber(aRow, aStr, '');

  const bRow = makeRow();
  const bStart = appendNumber(bRow, bStr, '');
  appendCell(bRow, bStart - 1, '×', 'ld-op-symbol');

  const summary = document.createElement('p');
  summary.className = 'ld-summary';
  summary.style.display = 'none';
  box.appendChild(summary);

  explanationArea.innerHTML = '';
  explanationArea.appendChild(box);

  const beats = [];
  const partialRows = [];
  const carryRows = [];

  beats.push({
    caption: `かける数の一の位「${bStr[bStr.length - 1]}」から、九九を使って順番に計算していきます`,
    run: () => {
      appendFullLine(makeRow());
    },
  });

  partials.forEach((p, pi) => {
    if (pi > 0) {
      beats.push({
        caption: `つぎに、かける数の${placeName(p.shift)}「${p.digit}」を ${aStr} にかけます`,
        run: () => {},
      });
    }

    const ownLen = p.calcSteps.length + (p.finalCarry > 0 ? 1 : 0);
    const rowRightCol = totalCols - p.shift;
    const rowStartCol = rowRightCol - ownLen + 1;
    let liveCarryMark = null; // まだ次の位で使われていない、小さく仮表示中のくり上がり

    p.calcSteps.forEach((s, k) => {
      const col = rowRightCol - k;
      const carryText = s.carryIn > 0 ? `+${s.carryIn}` : '';
      const writeText = s.carryOut > 0
        ? `→ ${s.writeDigit} を書いて ${s.carryOut} くり上げ（小さい数字）`
        : `→ ${s.writeDigit} を書く`;
      const isLastStep = k === p.calcSteps.length - 1;
      beats.push({
        caption: `${placeName(k)}：${s.digit}×${p.digit}${carryText}=${s.raw} ${writeText}`,
        run: () => {
          if (k === 0) {
            carryRows[pi] = makeRow();
            carryRows[pi].classList.add('ld-carry-row');
            partialRows[pi] = makeRow();
            if (pi > 0) appendCell(partialRows[pi], rowStartCol - 1, '+', 'ld-op-symbol');
          }
          // 前の位で出した小さいくり上がりは、この計算で使い終わったので消す
          if (liveCarryMark) {
            liveCarryMark.remove();
            liveCarryMark = null;
          }
          appendCell(partialRows[pi], col, String(s.writeDigit), 'ld-quotient-digit');
          // さいごの位のくり上がりは一番上の位の数字としてそのまま確定表示するので、
          // ここでは「まだ変わるかもしれない」小さい数字は出さない
          if (s.carryOut > 0 && !isLastStep) {
            liveCarryMark = appendCell(carryRows[pi], col - 1, String(s.carryOut), 'ld-carry-digit');
          }
        },
      });
    });

    if (p.finalCarry > 0) {
      const col = rowRightCol - p.calcSteps.length;
      beats.push({
        caption: `さいごに残った繰り上がりの ${p.finalCarry} は、そのまま一番上の位に書きます`,
        run: () => {
          appendCell(partialRows[pi], col, String(p.finalCarry), 'ld-quotient-digit');
        },
      });
    }
  });

  if (partials.length > 1) {
    beats.push({
      caption: '2つの答えを、位をそろえてたし算します',
      run: () => {
        appendFullLine(makeRow());
      },
    });
    beats.push({
      caption: `${partials.map((p) => p.value * 10 ** p.shift).join(' + ')} = ${answer}`,
      run: () => {
        const sumRow = makeRow();
        appendNumber(sumRow, String(answer), 'ld-remainder-value');
        summary.textContent = `答え：${answer}`;
        summary.style.display = '';
        summary.classList.add('ld-pop');
      },
    });
  } else {
    beats.push({
      caption: `${a} × ${b} = ${answer}`,
      run: () => {
        summary.textContent = `答え：${answer}`;
        summary.style.display = '';
        summary.classList.add('ld-pop');
      },
    });
  }

  playBeats(box, caption, beats, () => renderMultiplicationExplanation(visual, title));
}

function decimalPlaceName(k, places) {
  if (k < places) return k === 0 ? '小数第一位' : `小数第${k + 1}位`;
  return placeName(k - places);
}

// くり下がり（借りてくる）の説明文を、パターンごとに作る
function narrateSubStep(s, pname) {
  if (s.borrowIn === 0 && !s.borrowedFrom) {
    return `${pname}：${s.a}−${s.b}=${s.writeDigit}`;
  }
  if (s.borrowIn === 0 && s.borrowedFrom) {
    return `${pname}：${s.a}−${s.b} は引けないので、となりの位から1くり下げて ${s.a + 10}−${s.b}=${s.writeDigit}`;
  }
  const afterBorrow = s.a - 1;
  if (!s.borrowedFrom) {
    return `${pname}：となりに1くり下げたので ${s.a}−1=${afterBorrow}、${afterBorrow}−${s.b}=${s.writeDigit}`;
  }
  return `${pname}：となりに1くり下げたので ${s.a}−1=${afterBorrow}、${afterBorrow}−${s.b} は引けないので、さらにとなりの位から1くり下げて ${afterBorrow + 10}−${s.b}=${s.writeDigit}`;
}

// 小数のたし算・ひき算も、わり算・かけ算と同じ「1アクションずつ・自分のペースで」の見せ方にする。
// 小数点をそろえて、一の位より右（小数部分）から順に計算する筆算をそのまま見せる。
function renderDecimalExplanation(visual, title) {
  const { op, aStr, bStr, places, steps, finalCarry, displayValue } = visual;
  const N = Math.max(aStr.length, bStr.length, String(visual.answer).length);
  // 小数点の分（vcol）と、演算記号の分（+1）で、合計2列ぶん余分に確保しておく。
  // 演算記号は「その行いちばん左の桁のすぐ左」に置くので、行ごとに数字の桁数が
  // 違っても（くり上がりで答えの桁が増えても）、記号と数字がくっついて見える。
  const totalCols = N + 2;

  function vcol(logicalCol) {
    const shifted = logicalCol <= (N - places) ? logicalCol : logicalCol + 1;
    return shifted + 1;
  }
  const decimalCol = (N - places + 1) + 1;

  const box = document.createElement('div');
  box.className = 'explain-box';
  const heading = document.createElement('p');
  heading.className = 'explain-title';
  heading.textContent = title;
  box.appendChild(heading);

  const caption = document.createElement('p');
  caption.className = 'ld-caption';
  box.appendChild(caption);

  const wrap = document.createElement('div');
  wrap.className = 'ld-wrap';
  box.appendChild(wrap);

  function makeRow() {
    const row = document.createElement('div');
    row.className = 'ld-row';
    row.style.setProperty('--ld-cols', totalCols);
    wrap.appendChild(row);
    return row;
  }

  function appendCell(row, col, text, cls) {
    const span = document.createElement('span');
    span.className = `ld-cell ${cls}`;
    span.style.gridColumn = `${col} / span 1`;
    span.style.gridRow = '1';
    span.textContent = text;
    row.appendChild(span);
  }

  function appendNumberRow(row, valueStr, cls) {
    const startCol = N - valueStr.length + 1;
    for (let k = 0; k < valueStr.length; k++) {
      appendCell(row, vcol(startCol + k), valueStr[k], cls);
    }
    return vcol(startCol);
  }

  function appendDecimalPoint(row) {
    appendCell(row, decimalCol, '.', 'ld-decimal-point');
  }

  function appendFullLine(row) {
    const line = document.createElement('span');
    line.className = 'ld-subtract-line';
    line.style.gridColumn = `1 / span ${totalCols}`;
    row.appendChild(line);
  }

  const aRow = makeRow();
  appendNumberRow(aRow, aStr, '');
  appendDecimalPoint(aRow);

  const bRow = makeRow();
  const bStart = appendNumberRow(bRow, bStr, '');
  appendDecimalPoint(bRow);
  appendCell(bRow, bStart - 1, op, 'ld-op-symbol');

  const summary = document.createElement('p');
  summary.className = 'ld-summary';
  summary.style.display = 'none';
  box.appendChild(summary);

  explanationArea.innerHTML = '';
  explanationArea.appendChild(box);

  const beats = [];
  let resultRow;

  beats.push({
    caption: '小数点をそろえて、一の位より右（小数部分）から順に計算していきます',
    run: () => {
      appendFullLine(makeRow());
    },
  });

  steps.forEach((s, k) => {
    const col = vcol(N - k);
    const pname = decimalPlaceName(k, places);
    let cap;
    if (op === '+') {
      const carryText = s.carryIn > 0 ? `+${s.carryIn}` : '';
      cap = s.carryOut > 0
        ? `${pname}：${s.a}+${s.b}${carryText}=${s.raw} → ${s.writeDigit} を書いて ${s.carryOut} くり上げ`
        : `${pname}：${s.a}+${s.b}${carryText}=${s.raw} → ${s.writeDigit} を書く`;
    } else {
      cap = narrateSubStep(s, pname);
    }
    beats.push({
      caption: cap,
      run: () => {
        if (k === 0) resultRow = makeRow();
        appendCell(resultRow, col, String(s.writeDigit), 'ld-quotient-digit');
      },
    });
  });

  if (op === '+' && finalCarry > 0) {
    const col = vcol(N - steps.length);
    beats.push({
      caption: `さいごに残った繰り上がりの ${finalCarry} は、そのまま一番上の位に書きます`,
      run: () => {
        appendCell(resultRow, col, String(finalCarry), 'ld-quotient-digit');
      },
    });
  }

  beats.push({
    caption: `小数点を上とそろえて打つと、答えは ${displayValue} です`,
    run: () => {
      appendDecimalPoint(resultRow);
      summary.textContent = `答え：${displayValue}`;
      summary.style.display = '';
      summary.classList.add('ld-pop');
    },
  });

  playBeats(box, caption, beats, () => renderDecimalExplanation(visual, title));
}

function showHint(level) {
  const hints = currentHints();
  const hintText = hints[level];
  if (!hintText) return;
  const box = document.createElement('div');
  box.className = 'hint-box';
  const label = document.createElement('span');
  label.className = 'hint-label';
  label.textContent = `ヒント${level + 1}：`;
  box.appendChild(label);
  box.appendChild(document.createTextNode(hintText));
  hintArea.appendChild(box);
}

// 「じぶんのこたえの どこが ちがうか みる」ボタン。押すと、そのユニットのdiagnose()で
// 具体的な勘違いパターンを推測し、無ければ一般的なメッセージにフォールバックする。
function showWhyWrongButton(wrongValue) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'why-wrong-btn';
  btn.textContent = 'じぶんの こたえの どこが ちがうか みる';
  btn.addEventListener('click', () => {
    const diagnoseFn = state.activeModule.diagnose;
    const message = diagnoseFn ? diagnoseFn(wrongValue, state.problem, state.stageIndex) : null;
    const box = document.createElement('div');
    box.className = 'hint-box why-wrong-box';
    box.textContent = message || `「${wrongValue}」だと、どこで考え方が変わったのか、もう一度いっしょに見てみよう。上のヒントを参考にしてみてね。`;
    btn.replaceWith(box);
  }, { once: true });
  hintArea.appendChild(btn);
}

function finishProblem(finalFeedbackText, feedbackClass) {
  state.answered = true;
  recordAnswer(state.activeModuleKey, feedbackClass === 'correct');
  feedbackArea.textContent = finalFeedbackText;
  feedbackArea.className = `feedback-area ${feedbackClass}`;
  hintArea.innerHTML = ''; // 途中で間違えて出たヒントが、正解後も残らないようにする
  const title = feedbackClass === 'correct' ? 'どうしてそうなるか、見てみよう' : 'といかた';
  if (state.problem.visual && state.problem.visual.type === 'long-division') {
    renderLongDivisionExplanation(state.problem.visual, title);
  } else if (state.problem.visual && state.problem.visual.type === 'multiplication') {
    renderMultiplicationExplanation(state.problem.visual, title);
  } else if (state.problem.visual && state.problem.visual.type === 'decimal') {
    renderDecimalExplanation(state.problem.visual, title);
  } else {
    renderExplanation(state.problem.explanation, title);
  }
  answerInput.disabled = true;
  btnSubmit.style.display = 'none';
  btnNext.style.display = '';
}

function clearAnswerInput() {
  replaceAnswerInputElement();
  answerInput.value = ''; // 念のための二重の保険
  // DOMの入れ替え直後にすぐフォーカスすると、iOSでキーボードの状態が
  // 完全に切り替わる前に古い値が見えることがあるため、少し間を空ける。
  setTimeout(() => {
    answerInput.value = '';
    answerInput.focus();
  }, 30);
}

function advanceToNextStage() {
  state.stageIndex += 1;
  state.attempts = 0;
  hintArea.innerHTML = '';
  feedbackArea.textContent = '';
  feedbackArea.className = 'feedback-area';
  renderQuestion(); // 式が「14 あまり ?」のように育った状態を表示
  clearAnswerInput();
}

function handleSubmit() {
  if (state.answered) return;
  const value = answerInput.value.trim();
  if (value === '') {
    answerInput.focus();
    return;
  }

  const isCorrect = currentAnswerCorrect(value);

  if (isCorrect) {
    if (isMultiStage() && state.stageIndex < state.problem.stages.length - 1) {
      // まだ次の段階がある。式を育てて、そのまま続けて入力できるようにする。
      advanceToNextStage();
      return;
    }
    finishProblem('せいかい！ 🎉', 'correct');
    return;
  }

  state.attempts += 1;
  hintArea.innerHTML = '';

  if (state.attempts >= MAX_ATTEMPTS_BEFORE_REVEAL) {
    finishProblem('おしかった！ いっしょに答えを見てみよう', 'incorrect');
    return;
  }

  feedbackArea.textContent = 'おしい！ もういちど考えてみよう';
  feedbackArea.className = 'feedback-area incorrect';
  showHint(state.attempts - 1);
  showWhyWrongButton(value);
  clearAnswerInput();
}

// --- イベント登録 ---
document.querySelectorAll('.unit-btn').forEach((btn) => {
  btn.addEventListener('click', () => startUnit(btn.dataset.unit));
});

document.querySelectorAll('.level-btn').forEach((btn) => {
  btn.addEventListener('click', () => startLevel(Number(btn.dataset.level)));
});

btnBackToSelect.addEventListener('click', () => showScreen(screenSelect));

btnStats.addEventListener('click', () => {
  renderStatsScreen();
  showScreen(screenStats);
});
btnBackFromStats.addEventListener('click', () => showScreen(screenSelect));

btnSubmit.addEventListener('click', handleSubmit);
bindAnswerInputEvents();
btnNext.addEventListener('click', loadNextProblem);
btnBack.addEventListener('click', () => showScreen(screenLevel));

// 全角の数字・記号を半角に正規化する（iPadの日本語キーボードで全角入力されても正解にするため）
export function normalizeDigits(str) {
  return String(str).replace(/[０-９．／＋－]/g, (ch) => {
    if (ch >= '０' && ch <= '９') {
      return String.fromCharCode(ch.charCodeAt(0) - 0xfee0);
    }
    const map = { '．': '.', '／': '/', '＋': '+', '－': '-' };
    return map[ch] || ch;
  }).trim();
}

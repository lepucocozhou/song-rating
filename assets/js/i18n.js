// Whole-app translation for "中文": every German text on the page (also ones added later, alerts and
// the Excel export) is swapped for its Chinese version from i18n-zh.js. Other languages: nothing changes.

const LOCALE = LANG === 'zh' ? 'zh-CN' : 'de-DE';

// t('German text') → Chinese (or unchanged when there is no translation / not in Chinese mode)
function t(s) {
  if (LANG !== 'zh' || typeof s !== 'string' || !/[A-Za-zÄÖÜäöüß]/.test(s)) return s;
  const key = s.replace(/\s+/g, ' ').trim();
  if (!key) return s;
  let out = ZH_WORDS[key];
  if (out === undefined) {
    for (const [re, fn] of ZH_PATTERNS) {
      const m = key.match(re);
      if (m) { out = fn(...m); break; }
    }
  }
  // messages with several lines (alerts): line by line
  if (out === undefined && s.includes('\n')) return s.split('\n').map(t).join('\n');
  if (out === undefined) return s;
  // keep the spaces around the text (they separate it from numbers in <b> etc.)
  return (/^\s/.test(s) ? ' ' : '') + out + (/\s$/.test(s) ? ' ' : '');
}

if (LANG === 'zh') {
  document.documentElement.lang = 'zh-CN';
  const SKIP = 'script,style,textarea,svg,[translate=no]';
  const ATTRS = ['placeholder', 'title', 'aria-label'];

  const translateEl = el => {
    if (el.closest(SKIP)) return;
    ATTRS.forEach(a => {
      const v = el.getAttribute(a);
      if (v) { const n = t(v); if (n !== v) el.setAttribute(a, n); }
    });
  };
  const translateText = node => {
    if (!node.parentElement || node.parentElement.closest(SKIP)) return;
    const n = t(node.nodeValue);
    if (n !== node.nodeValue) node.nodeValue = n;
  };
  const translateTree = root => {
    if (root.nodeType === 3) return translateText(root);
    if (root.nodeType !== 1) return;
    translateEl(root);
    root.querySelectorAll('[placeholder],[title],[aria-label]').forEach(translateEl);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) translateText(walker.currentNode);
  };

  translateTree(document.documentElement);
  document.title = t(document.title);
  new MutationObserver(list => list.forEach(m => {
    if (m.type === 'childList') m.addedNodes.forEach(translateTree);
    else if (m.type === 'characterData') translateText(m.target);
    else translateEl(m.target);
  })).observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });

  const { alert: alert0, confirm: confirm0 } = window;
  window.alert = msg => alert0(t(String(msg)));
  window.confirm = msg => confirm0(t(String(msg)));
}

// Header button: switch between Deutsch and 中文 (English counts as German here)
function switchLanguage() {
  if (typeof dirty !== 'undefined' && dirty &&
      !confirm('Du hast ungespeicherte Änderungen an den Fragen. Trotzdem die Sprache wechseln?\nDie Änderungen gehen dabei verloren.')) return;
  store.set('lang', LANG === 'zh' ? (store.get('langBeforeZh', 'de')) : 'zh');
  if (LANG !== 'zh') store.set('langBeforeZh', LANG);
  if (typeof dirty !== 'undefined') dirty = false;
  location.reload();
}

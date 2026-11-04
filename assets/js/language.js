// Language of the questions and scales: 'en' (original) or 'de' (texts-de.js). Saved per device.
// The settings always store the English text; a text is only shown in German while it is still the
// unchanged original, so questions you rewrote yourself stay exactly as you wrote them.

const LANG = (() => { try { return JSON.parse(localStorage.getItem('lang')) || 'en'; } catch (e) { return 'en'; } })();
const L = (en, de) => LANG === 'de' ? de : en;

if (LANG === 'de') Object.assign(GENERIC_SCALE, GENERIC_SCALE_DE);

const ORIGINAL_TEXTS = {};
[...DEFAULT_CONFIG.songs, ...DEFAULT_CONFIG.albums].forEach(c => {
  ORIGINAL_TEXTS[c.id] = c;
  c.qs.forEach(q => { ORIGINAL_TEXTS[q.id] = q; });
});

// Swaps every text that matches `from` for the one in `to` (from/to: 'en' or 'de')
function translateItem(item, from, to) {
  const texts = { en: ORIGINAL_TEXTS[item.id], de: TEXTS_DE[item.id] };
  if (!texts.en || !texts.de) return;
  ['name', 'q', 'think'].forEach(f => {
    if (item[f] !== undefined && item[f] === texts[from][f] && texts[to][f]) item[f] = texts[to][f];
  });
  if (item.scale && texts.en.scale && texts.de.scale) {
    item.scale = { ...item.scale };
    Object.keys(item.scale).forEach(n => {
      if (item.scale[n] === texts[from].scale[n] && texts[to].scale[n]) item.scale[n] = texts[to].scale[n];
    });
  }
}

function translateConfig(cfg, from, to) {
  if (from === to) return cfg;
  ['songs', 'albums'].forEach(kind => (cfg[kind] || []).forEach(c => {
    translateItem(c, from, to);
    c.qs.forEach(q => translateItem(q, from, to));
  }));
  return cfg;
}

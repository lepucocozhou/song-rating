// Gemeinsam für alle Lernort-Seiten: Speicher, Gewichte, Notenberechnung, Kopfzeile + Tab-Leiste.
// Arbeitskopie im Browser (localStorage, Schlüssel beginnen mit „bib.“); bist du in Song Rating angemeldet,
// gleicht cloud.js sie mit deinem Konto ab.

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const now = () => new Date().toISOString();
// Zahlen deutsch: 7,90
const fmt = v => v === null || v === undefined ? '–' : v.toFixed(2).replace('.', ',');
const pct = v => v === null || v === undefined ? '–' : Math.round(v * 100) + ' %';

const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem('bib.' + k)) ?? d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('bib.' + k, JSON.stringify(v)); } catch (e) {} },
};

// Wird von cloud.js ersetzt: nach jeder Änderung kurz danach ins Song-Rating-Konto hochladen
let onBibChanged = () => { store.set('cloudPending', true); };

/* ---------- Kategorien + eigene Gewichte ---------- */
// weightsAt = wann zuletzt geändert (damit beim Abgleich zwischen Geräten die neuere Einstellung gewinnt)
const Weights = {
  get: () => store.get('weights', {}),
  save(w) { store.set('weights', w); store.set('weightsAt', now()); onBibChanged(); },
  reset() { Weights.save({}); },
};
const CATS = DEFAULT_CATS.map(c => {
  const w = Weights.get()[c.id];
  return { ...c, w: typeof w === 'number' && w >= 0 ? w : c.w };
});
const ALL_QS = CATS.flatMap(c => c.qs);

/* ---------- gespeicherte Lernorte ---------- */
// { id, name, where, note, answers: { f1: 0–4 | '-' }, createdAt, updatedAt }
// Gelöschte Orte bleiben als { id, deleted: true, updatedAt } stehen, damit das Löschen auch auf anderen Geräten ankommt.
const Places = {
  raw: () => store.get('places', []),
  all: () => Places.raw().filter(p => !p.deleted),
  get: id => Places.all().find(p => p.id === id),
  save(p) {
    const list = Places.raw(), i = list.findIndex(x => x.id === p.id);
    const rec = { ...p, updatedAt: now() };
    if (i >= 0) list[i] = rec; else list.push({ ...rec, id: rec.id || newId(), createdAt: now() });
    store.set('places', list);
    onBibChanged();
    return i >= 0 ? rec : list[list.length - 1];
  },
  remove(id) { Places.removeMany([id]); },
  removeMany(ids) {
    const gone = new Set(ids);
    store.set('places', Places.raw().map(p => gone.has(p.id) ? { id: p.id, deleted: true, updatedAt: now() } : p));
    onBibChanged();
  },
  setRaw(list, silent) { store.set('places', list); if (!silent) onBibChanged(); },
};

/* ---------- Berechnung wie in der Excel-Tabelle ---------- */
// K = Ø Punkte ÷ 4 (nur beantwortete Fragen) · G = Σ(Gewicht × K) ÷ verwendete Gewichte · Note = 1 + 9 × G
// K.-o.: „Lautstärke“ oder „Platz bekommen“ = 0 → Note höchstens 5,00
function score(answers = {}) {
  const cats = CATS.map(c => {
    const vals = c.qs.map(q => answers[q.id]).filter(v => typeof v === 'number');
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length / 4 : null;
  });
  let sum = 0, used = 0;
  cats.forEach((k, i) => { if (k !== null) { sum += CATS[i].w * k; used += CATS[i].w; } });
  const G = used > 0 ? sum / used : null;
  const ko = ALL_QS.some(q => q.ko && answers[q.id] === 0);
  const raw = G === null ? null : 1 + 9 * G;
  const note = raw === null ? null : Math.round((ko ? Math.min(raw, 5) : raw) * 100) / 100;
  const answered = ALL_QS.filter(q => answers[q.id] !== undefined && answers[q.id] !== null).length;
  return { cats, G, raw, ko, note, answered, total: ALL_QS.length };
}

const level = note => note === null ? null : LEVELS.find(l => note >= l.min);

// Alle Orte mit Note und Rang (gleiche Note = gleicher Rang, wie RANK in Excel)
function rankedPlaces() {
  const rows = Places.all().map(p => ({ p, ...score(p.answers) }));
  rows.sort((a, b) => (b.note ?? -1) - (a.note ?? -1) || a.p.name.localeCompare(b.p.name, 'de'));
  rows.forEach(r => { r.rank = r.note === null ? null : 1 + rows.filter(o => o.note !== null && o.note > r.note).length; });
  return rows;
}

// Kleines Bild für einen Ort: Anfangsbuchstabe auf der Farbe seiner stärksten Kategorie
function placeTile(row, cls = '') {
  let best = -1;
  row.cats.forEach((k, i) => { if (k !== null && (best < 0 || k > row.cats[best])) best = i; });
  const letter = (row.p.name || '?').trim().charAt(0).toUpperCase() || '?';
  return `<span class="tile-img ${cls}" style="--c:${best < 0 ? '#2a9461' : CATS[best].color}">${esc(letter)}</span>`;
}

function chip(note) {
  const l = level(note);
  return `<span class="chip ${l ? l.cls : 'none'}">${fmt(note)}</span>`;
}

/* ---------- Kopfzeile + Tab-Leiste (Handy) ---------- */
// <header id="top" data-active="start|orte|rate|anleitung|settings"></header>
const ICON = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICONS = {
  start: ICON('<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>'),
  orte: ICON('<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
  plus: ICON('<path d="M12 5v14M5 12h14"/>'),
  anleitung: ICON('<path d="M4 19.5V5a2 2 0 0 1 2-2h14v15H6.5A2.5 2.5 0 0 0 4 20.5 2.5 2.5 0 0 0 6.5 23H20"/><path d="M8 7h8M8 11h6"/>'),
  settings: ICON('<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>'),
};

(function renderHeader() {
  const h = $('top');
  if (!h) return;
  const active = h.dataset.active === 'rate' ? 'rate' : h.dataset.active;
  const tabs = [['start', 'index.html', 'Start'], ['orte', 'orte.html', 'Rangliste'], ['anleitung', 'anleitung.html', 'So geht’s'], ['settings', 'einstellungen.html', 'Einstellungen']];
  h.innerHTML = `<div class="head">
    <div class="head-left"><a class="logo" href="index.html">Lern<em>orte</em></a></div>
    <nav>${tabs.map(([k, href, label]) => `<a class="tab ${active === k ? 'active' : ''}" href="${href}">${label}${k === 'orte' ? `<span class="count">${Places.all().length}</span>` : ''}</a>`).join('')}</nav>
    <div class="head-right"><a class="plus-btn" href="bewerten.html">+ Lernort bewerten</a></div>
  </div>`;
  const item = (key, href, label) =>
    `<a class="${active === key ? 'active' : ''}" href="${href}" aria-label="${label}" title="${label}">${ICONS[key]}</a>`;
  document.body.insertAdjacentHTML('beforeend', `
    <nav class="tabbar">
      ${item('start', 'index.html', 'Start')}
      ${item('orte', 'orte.html', 'Rangliste')}
      <a class="plus ${active === 'rate' ? 'active' : ''}" href="bewerten.html" aria-label="Lernort bewerten">${ICONS.plus}</a>
      ${item('anleitung', 'anleitung.html', 'So geht’s')}
      ${item('settings', 'einstellungen.html', 'Einstellungen')}
    </nav>`);
})();

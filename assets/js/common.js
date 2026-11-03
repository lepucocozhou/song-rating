// Shared helpers for all pages: settings, storage, scoring, header navigation.

const $ = id => document.getElementById(id);
const fmt = v => (Math.round(v * 100) / 100).toFixed(2);
const esc = s => String(s ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const clone = o => JSON.parse(JSON.stringify(o));
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};

// Called after every change to saved data; cloud.js uses it to upload (no-op without cloud)
let onDataChanged = () => {};
const now = () => new Date().toISOString();

/* ---------- settings ---------- */
// Stored with _updatedAt so the newest settings win when syncing devices; _reset = use the defaults
const Config = {
  load() {
    const saved = store.get('songRatingConfig', null);
    return saved && !saved._reset ? { ...clone(DEFAULT_CONFIG), ...saved } : clone(DEFAULT_CONFIG);
  },
  save(cfg) { store.set('songRatingConfig', { ...cfg, _updatedAt: now() }); onDataChanged(); },
  reset() { store.set('songRatingConfig', { _reset: true, _updatedAt: now() }); onDataChanged(); },
};
const CONFIG = Config.load();
const SONG_CATS = CONFIG.songs;
const ALBUM_CATS = CONFIG.albums;

/* ---------- saved songs + albums ---------- */
// Answers are stored as { questionId: value }. The first versions stored an array in question order.
function normAnswers(a) {
  if (!Array.isArray(a)) return a || {};
  const out = {};
  a.forEach((v, i) => { if (v !== null && v !== undefined) out['q' + (i + 1)] = v; });
  return out;
}

// Every record carries updatedAt; a deleted record stays as { id, deleted: true, updatedAt }
// so that the deletion also reaches other devices when syncing.
function makeCollection(key) {
  const c = {
    raw: () => store.get(key, []),
    all: () => c.raw().filter(r => !r.deleted).map(r => ({ ...r, answers: normAnswers(r.answers) })),
    get: id => c.all().find(r => r.id === id),
    // Replace all records (keeps deletion markers of ids that are not in the list)
    saveAll(list) {
      const ids = new Set(list.map(r => r.id));
      c.setRaw([...list, ...c.raw().filter(r => r.deleted && !ids.has(r.id))]);
    },
    upsert(rec) { c.put({ ...rec, updatedAt: now() }); },
    remove(id) { c.put({ id, deleted: true, updatedAt: now() }); },
    put(rec) {
      const list = c.raw();
      const pos = list.findIndex(r => r.id === rec.id);
      if (pos >= 0) list[pos] = rec; else list.push(rec);
      c.setRaw(list);
    },
    setRaw(list, silent) { store.set(key, list); if (!silent) onDataChanged(); },
  };
  return c;
}
// Song: { id, song, artist, album, artwork, appleUrl, preview, year, trackId, answers, savedAt }
const Songs = makeCollection('songRatings');
// Album: { id, album, artist, artwork, appleUrl, year, collectionId, tracks[], excluded[], mode, answers, savedAt }
const Albums = makeCollection('albumRatings');

/* ---------- scoring ---------- */
// Values: undefined/null = open, number = rating, 'N/A' or 'skip' = left out.
// Mirrors the sheet: category = SUMPRODUCT(weights, numeric answers) / SUM(weights of numeric answers),
// final = weighted mean of categories (a fully skipped category drops out and its weight is redistributed).
function scores(answers, cats = SONG_CATS) {
  answers = answers || {};
  let total = 0, answered = 0;
  const catScores = cats.map(cat => {
    let s = 0, w = 0;
    cat.qs.forEach(q => {
      const v = answers[q.id];
      total++;
      if (v !== undefined && v !== null) answered++;
      if (typeof v === 'number') { s += v * q.w; w += q.w; }
    });
    return w ? s / w : null;
  });
  let fs = 0, fw = 0;
  catScores.forEach((c, i) => { if (c !== null) { fs += c * cats[i].w; fw += cats[i].w; } });
  const final = fw ? fs / fw : null;
  return { cats: catScores, final, answered, total, complete: answered === total && final !== null };
}

function rankedSongs() {
  const rows = Songs.all().map(s => ({ s, ...scores(s.answers) }));
  rank(rows);
  return rows;
}

function rank(rows) {
  [...rows].sort((a, b) => (b.final ?? -1) - (a.final ?? -1)).forEach((r, i) => r.rank = i + 1);
}

// Album tracks are matched to rated songs by iTunes track id, or else by title + artist
const norm = s => {
  const lower = (s || '').toLowerCase();
  return lower.replace(/\(.*?\)|\[.*?\]/g, '').replace(/\s(feat|ft)\..*$/, '').replace(/[^\p{L}\p{N}]+/gu, '') ||
    lower.replace(/[^\p{L}\p{N}]+/gu, '');
};
function trackMatches(track, song) {
  if (track.trackId && song.trackId && String(track.trackId) === String(song.trackId)) return true;
  const a = norm(track.artist), b = norm(song.artist);
  return norm(track.song) === norm(song.song) && (!a || !b || a.includes(b) || b.includes(a));
}

// Album score = song part (average final score of its songs) + album questions, weighted by the album rules
function albumScores(album, songRows = rankedSongs()) {
  const q = scores(album.answers, ALBUM_CATS);
  const excluded = new Set(album.excluded || []);
  const tracks = (album.tracks || []).map(t => ({
    t, row: songRows.find(r => trackMatches(t, r.s)) || null, counted: !excluded.has(t.trackId),
  }));
  const counted = tracks.filter(x => x.counted);
  const rated = counted.filter(x => x.row && x.row.final !== null);
  const songAvg = rated.length ? rated.reduce((s, x) => s + x.row.final, 0) / rated.length : null;
  const full = album.mode !== 'light';
  const w = full ? CONFIG.albumRules.songWeight : CONFIG.albumRules.songWeightLight;
  const final = q.final !== null && songAvg !== null ? w * songAvg + (1 - w) * q.final : (q.final ?? songAvg);

  const missing = [];
  if (q.answered < q.total) missing.push(`${q.total - q.answered} Album-Fragen offen`);
  if (full && !counted.length) missing.push('keine Trackliste – wähle das Album über die Suche oder nimm den Modus „Schnell“');
  else if (full && rated.length < counted.length) missing.push(`${counted.length - rated.length} Songs noch nicht bewertet`);
  return {
    ...q, questionScore: q.final, songAvg, songWeight: songAvg === null ? 0 : w, final, tracks,
    countedCount: counted.length, ratedCount: rated.length, missing, complete: !missing.length && final !== null,
  };
}

function rankedAlbums() {
  const songRows = rankedSongs();
  const rows = Albums.all().map(a => ({ a, ...albumScores(a, songRows) }));
  rank(rows);
  return rows;
}

/* ---------- display helpers ---------- */
function scoreColor(v) {
  if (v === null || v === undefined) return '#dfe7ee';
  if (v >= 8) return '#7dd3fc';
  if (v >= 7) return '#a5e3fd';
  if (v >= 6) return '#cdeffe';
  if (v >= 5) return '#fde68a';
  return '#fecaca';
}

function coverHtml(rec, cls) {
  if (rec.artwork) return `<img class="cover ${cls}" src="${esc(rec.artwork)}" alt="" loading="lazy">`;
  const letter = (rec.song || rec.album || '♪').trim()[0] || '♪';
  return `<div class="cover cover-ph ${cls}"><span>${esc(letter)}</span></div>`;
}

const medal = r => ['🥇', '🥈', '🥉'][r - 1] || '#' + r;

function describe(q, v) {
  const text = n => esc((q.scale && q.scale[n]) || GENERIC_SCALE[n]);
  const lo = Math.floor(v), hi = Math.ceil(v);
  if (lo === hi) return `<b>${v}</b> – ${text(v)}`;
  return `<b>${lo}</b> – ${text(lo)}<br><b>${hi}</b> – ${text(hi)}`;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

function download(name, data, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([data], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ---------- header ---------- */
// <header id="top" data-active="songs|rate|albums|rateAlbum|settings"></header>
(function renderHeader() {
  const h = $('top');
  if (!h) return;
  const tabs = [
    ['songs', 'index.html', 'Songs <span class="count" id="countSongs"></span>'],
    ['rate', 'bewerten.html', '+ Song'],
    ['albums', 'alben.html', 'Alben <span class="count" id="countAlbums"></span>'],
    ['rateAlbum', 'album.html', '+ Album'],
    ['settings', 'einstellungen.html', '⚙︎ Einstellungen'],
  ];
  h.innerHTML = `<div class="wrap head">
    <a class="logo" href="index.html">🎵 Song Rating</a>
    <a class="cloud" id="cloudChip" href="einstellungen.html#konto" hidden></a>
    <nav>${tabs.map(([k, href, label]) => `<a class="tab ${h.dataset.active === k ? 'active' : ''}" href="${href}">${label}</a>`).join('')}</nav>
  </div>`;
  renderTabbar(h.dataset.active);
  refreshCounts();
})();

// Phones: app-like tab bar at the bottom; "+" opens a choice between rating a song or an album
function renderTabbar(active) {
  const icon = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const ICONS = {
    songs: icon('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'),
    albums: icon('<circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="12" r="2.5"/>'),
    plus: icon('<path d="M12 5v14M5 12h14"/>'),
    cloud: icon('<path d="M17.5 19H8a5 5 0 1 1 .9-9.9A6 6 0 0 1 20 11a4 4 0 0 1-2.5 8z"/>'),
    settings: icon('<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>'),
  };
  const item = (key, href, label, isActive) =>
    `<a class="${isActive ? 'active' : ''}" href="${href}">${ICONS[key]}<span>${label}</span></a>`;
  const rating = active === 'rate' || active === 'rateAlbum';
  document.body.insertAdjacentHTML('beforeend', `
    <div class="plus-sheet" id="plusSheet" hidden>
      <a href="bewerten.html">🎵 <span>Song bewerten</span></a>
      <a href="album.html">💿 <span>Album bewerten</span></a>
    </div>
    <nav class="tabbar">
      ${item('songs', 'index.html', 'Songs', active === 'songs')}
      ${item('albums', 'alben.html', 'Alben', active === 'albums')}
      <button class="plus ${rating ? 'active' : ''}" id="plusBtn" aria-label="Bewerten">${ICONS.plus}</button>
      <a href="einstellungen.html#konto" id="tabCloud">${ICONS.cloud}<span>Konto</span></a>
      ${item('settings', 'einstellungen.html', 'Einstellungen', active === 'settings')}
    </nav>`);
  $('plusBtn').onclick = e => { e.stopPropagation(); $('plusSheet').hidden = !$('plusSheet').hidden; };
  document.addEventListener('click', e => { if (!e.target.closest('#plusSheet')) $('plusSheet').hidden = true; });
}

function refreshCounts() {
  if (!$('countSongs')) return;
  $('countSongs').textContent = Songs.all().length;
  $('countAlbums').textContent = Albums.all().length;
}

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
// Stored with _updatedAt so the newest settings win when syncing devices; _reset = use the defaults.
// Always stored in English; shown in the chosen language (language.js).
const Config = {
  load() {
    const saved = store.get('songRatingConfig', null);
    const cfg = saved && !saved._reset ? { ...clone(DEFAULT_CONFIG), ...saved } : clone(DEFAULT_CONFIG);
    return translateConfig(cfg, 'en', LANG);
  },
  save(cfg) { store.set('songRatingConfig', { ...translateConfig(clone(cfg), LANG, 'en'), _updatedAt: now() }); onDataChanged(); },
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
// Round rank badge on covers: gold / silver / bronze for the top 3, plain number otherwise ('A' = album)
const medalHtml = r => `<span class="medal ${r <= 3 ? 'm' + r : ''}">${r}</span>`;

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
// <header id="top" data-active="start|songs|rate|albums|rateAlbum|settings"></header>
(function renderHeader() {
  const h = $('top');
  if (!h) return;
  const tabs = [
    ['start', 'index.html', 'Start'],
    ['songs', 'songs.html', 'Songs<span class="count" id="countSongs"></span>'],
    ['albums', 'alben.html', 'Alben<span class="count" id="countAlbums"></span>'],
    ['settings', 'einstellungen.html', 'Einstellungen'],
  ];
  // Rating pages belong to their overview tab
  const active = { rate: 'songs', rateAlbum: 'albums' }[h.dataset.active] || h.dataset.active;
  h.innerHTML = `<div class="head">
    <div class="head-left">
      <a class="logo" href="index.html">Song<em>Rating</em></a>
      <a class="cloud" id="cloudChip" href="einstellungen.html#konto" hidden></a>
    </div>
    <nav>${tabs.map(([k, href, label]) => `<a class="tab ${active === k ? 'active' : ''}" href="${href}">${label}</a>`).join('')}</nav>
    <div class="head-right">
      <button class="plus-btn" id="plusMenuBtn" aria-haspopup="true">+ Bewerten</button>
      <div class="plus-menu" id="plusMenu" hidden>
        <a href="bewerten.html">Song bewerten<small>${SONG_CATS.reduce((n, c) => n + c.qs.length, 0)} Fragen in ${SONG_CATS.length} Kategorien</small></a>
        <a href="album.html">Album bewerten<small>Songs + Album-Fragen</small></a>
      </div>
    </div>
  </div>`;
  $('plusMenuBtn').onclick = e => { e.stopPropagation(); $('plusMenu').hidden = !$('plusMenu').hidden; };
  document.addEventListener('click', e => { if (!e.target.closest('#plusMenu')) $('plusMenu').hidden = true; });
  renderTabbar(h.dataset.active);
  refreshCounts();
})();

// Phones: app-like tab bar at the bottom; "+" opens a choice between rating a song or an album
function renderTabbar(active) {
  const plusIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
  const item = (key, href, label, isActive) =>
    `<a class="${isActive ? 'active' : ''}" href="${href}">${label}</a>`;
  const rating = active === 'rate' || active === 'rateAlbum';
  document.body.insertAdjacentHTML('beforeend', `
    <div class="plus-sheet" id="plusSheet" hidden>
      <a href="bewerten.html">Song bewerten</a>
      <a href="album.html">Album bewerten</a>
    </div>
    <nav class="tabbar">
      ${item('start', 'index.html', 'Start', active === 'start')}
      ${item('songs', 'songs.html', 'Songs', active === 'songs')}
      <button class="plus ${rating ? 'active' : ''}" id="plusBtn" aria-label="Bewerten">${plusIcon}</button>
      ${item('albums', 'alben.html', 'Alben', active === 'albums')}
      ${item('settings', 'einstellungen.html', 'Einst.', active === 'settings')}
    </nav>`);
  $('plusBtn').onclick = e => { e.stopPropagation(); $('plusSheet').hidden = !$('plusSheet').hidden; };
  document.addEventListener('click', e => { if (!e.target.closest('#plusSheet')) $('plusSheet').hidden = true; });
}

function refreshCounts() {
  if (!$('countSongs')) return;
  $('countSongs').textContent = Songs.all().length;
  $('countAlbums').textContent = Albums.all().length;
}

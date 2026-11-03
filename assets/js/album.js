// Album rating page: pick an album, choose how much its songs count, rate songs + album questions, save.
// URL: ?id=… edits a saved album · ?collectionId=… starts a new rating of that Apple album
//      (from the start page); otherwise the unsaved draft is continued.

const params = new URLSearchParams(location.search);
const albumIn = $('album'), artistIn = $('artist');
const META_KEYS = ['artwork', 'appleUrl', 'year', 'collectionId'];
const SONG_COLOR = '#0ea5e9';

let meta = {};        // artwork, appleUrl, year, collectionId from the album search
let tracks = [];      // tracklist from iTunes
let excluded = [];    // trackIds that should not count (e.g. interludes, bonus tracks)
let mode = 'full';    // 'full' = all songs must be rated · 'light' = songs count less, not all needed
let editingId = null;

const form = createQuestionnaire({
  cats: ALBUM_CATS,
  before: [{ name: 'Album', color: '#7dd3fc' }, { name: 'Songs', color: SONG_COLOR }],
  after: [{ name: 'Ergebnis', color: '#7dd3fc' }],
  onChange: update,
});

/* ---------- album search ---------- */
initSearchBox($('search'), $('suggest'), {
  search: term => Itunes.searchAlbums(term),
  trending: async () => (await Itunes.charts()).albums.slice(0, 8),
  title: r => r.album,
  sub: r => `${r.artist}${r.year ? ' · ' + r.year : ''}${r.trackCount ? ' · ' + r.trackCount + ' Songs' : ''}`,
  onPick: pickAlbum,
});

function pickAlbum(r) {
  albumIn.value = r.album; artistIn.value = r.artist;
  meta = Object.fromEntries(META_KEYS.map(k => [k, r[k]]));
  tracks = []; excluded = [];
  loadTracks();
}
['album', 'artist'].forEach(id => $(id).addEventListener('input', update));

async function loadTracks() {
  if (!meta.collectionId) return;
  $('tracks').innerHTML = '<p class="hint">Lade Trackliste …</p>';
  update();
  try {
    tracks = (await Itunes.tracks(meta.collectionId)).map(t =>
      ({ trackId: t.trackId, trackNumber: t.trackNumber, song: t.song, artist: t.artist, preview: t.preview, appleUrl: t.appleUrl }));
  } catch (e) {
    $('tracks').innerHTML = '<p class="hint">Trackliste konnte nicht geladen werden – bist du online?</p>';
  }
  update();
}

function renderPicked() {
  const rec = { album: albumIn.value, ...meta };
  $('barCover').innerHTML = albumIn.value || meta.artwork ? coverHtml(rec, 'bar-cover') : '';
  $('now').textContent = albumIn.value ? `${albumIn.value}${artistIn.value ? ' – ' + artistIn.value : ''}` : '';
  if (!albumIn.value && !meta.artwork) { $('picked').innerHTML = ''; return; }
  $('picked').innerHTML = `
    <div class="picked">
      ${coverHtml(rec, '')}
      <div>
        <h3>${esc(albumIn.value)}</h3>
        <div class="sub">${esc(artistIn.value)}${meta.year ? ' · ' + esc(meta.year) : ''}${tracks.length ? ' · ' + tracks.length + ' Songs' : ''}</div>
        <div class="links">
          ${meta.appleUrl ? `<a href="${esc(meta.appleUrl)}" target="_blank" rel="noopener">In Apple Music öffnen ↗</a>` : ''}
        </div>
        ${alreadyRated()}
      </div>
    </div>`;
}

// Hint when this album was already rated before
function alreadyRated() {
  if (editingId || !albumIn.value) return '';
  const a = Albums.all().find(x => (meta.collectionId && x.collectionId === meta.collectionId) ||
    (norm(x.album) === norm(albumIn.value) && norm(x.artist) === norm(artistIn.value)));
  return a ? `<div class="already">Schon bewertet – <a href="album.html?id=${encodeURIComponent(a.id)}">diese Bewertung öffnen →</a></div>` : '';
}

/* ---------- mode ---------- */
function renderModes() {
  const r = CONFIG.albumRules, pct = v => Math.round(v * 100) + '%';
  const opt = (value, title, text) => `
    <label class="mode ${mode === value ? 'on' : ''}">
      <input type="radio" name="mode" value="${value}" ${mode === value ? 'checked' : ''}>
      <b>${title}</b><span>${text}</span>
    </label>`;
  $('modes').innerHTML =
    opt('full', '🎯 Vollständig', `Alle Songs des Albums müssen bewertet sein, bevor das Album einen Score bekommt. Die Songs zählen <b>${pct(r.songWeight)}</b>, die Album-Fragen ${pct(1 - r.songWeight)}.`) +
    opt('light', '⚡ Schnell', `Die einzelnen Songs sind dir nicht so wichtig: Nur bereits bewertete Songs zählen, und zwar nur <b>${pct(r.songWeightLight)}</b>. Ohne bewertete Songs zählen nur die Album-Fragen.`);
}
$('modes').addEventListener('change', e => { mode = e.target.value; update(); });

/* ---------- tracklist ---------- */
function backLink() { return 'album.html' + (editingId ? '?id=' + encodeURIComponent(editingId) : ''); }

function renderTracks(as) {
  if (!tracks.length) {
    $('tracks').innerHTML = meta.collectionId
      ? '<p class="hint">Keine Trackliste geladen. <button class="linkbtn" id="reloadTracks">Erneut laden</button></p>'
      : '<p class="hint">Wähle das Album auf der ersten Seite über die Suche aus, dann erscheint hier die Trackliste. Ohne Trackliste geht nur der Modus „Schnell“.</p>';
    const btn = $('reloadTracks');
    if (btn) btn.onclick = loadTracks;
    return;
  }
  const next = as.tracks.find(x => x.counted && !x.row);
  $('tracks').innerHTML = `
    <div class="track-sum">
      <div><b>${as.ratedCount} von ${as.countedCount}</b> Songs bewertet${as.songAvg !== null ? ` · Ø <b>${fmt(as.songAvg)}</b>` : ''}</div>
      <div class="bar"><i style="--c:${SONG_COLOR};width:${as.countedCount ? as.ratedCount / as.countedCount * 100 : 0}%"></i></div>
      ${next ? `<a class="btn primary" href="${esc(rateHref(next.t))}">Nächsten Song bewerten: ${esc(next.t.song)} →</a>` : ''}
    </div>
    <p class="hint">Haken entfernen, wenn ein Track nicht mitzählen soll (z. B. Intros, Interludes, Bonus-Tracks).</p>
    <div class="tracks">${as.tracks.map(({ t, row, counted }) => `
      <div class="track ${counted ? '' : 'off'}">
        <input type="checkbox" data-t="${esc(t.trackId)}" ${counted ? 'checked' : ''} title="zählt mit">
        <span class="no">${esc(t.trackNumber)}</span>
        <span class="tt">${esc(t.song)}${norm(t.artist) !== norm(artistIn.value) ? `<small>${esc(t.artist)}</small>` : ''}</span>
        ${row
          ? `<span class="chip" style="background:${scoreColor(row.final)}">${row.final === null ? '–' : fmt(row.final)}</span>
             <a class="small" href="${esc('bewerten.html?' + new URLSearchParams({ id: row.s.id, back: backLink() }))}">ändern</a>`
          : `<a class="btn small" href="${esc(rateHref(t))}">Bewerten →</a>`}
      </div>`).join('')}
    </div>`;
}

function rateHref(t) {
  return 'bewerten.html?' + new URLSearchParams({
    prefill: 1, song: t.song, artist: t.artist, album: albumIn.value, artwork: meta.artwork || '',
    appleUrl: t.appleUrl || '', preview: t.preview || '', year: meta.year || '', trackId: t.trackId || '',
    back: backLink(),
  });
}

$('tracks').addEventListener('change', e => {
  const id = +e.target.dataset.t;
  excluded = e.target.checked ? excluded.filter(x => x !== id) : [...excluded, id];
  update();
});

/* ---------- live scores ---------- */
let pickedKey = '';
function update() {
  form.render();
  const rec = currentRecord();
  const as = albumScores(rec);
  const pct = v => Math.round(v * 100) + '%';

  form.stepNote(0, albumIn.value ? '✓' : '', !!albumIn.value);
  form.stepNote(1, as.countedCount ? `${as.ratedCount}/${as.countedCount}` : '', as.countedCount && as.ratedCount === as.countedCount);
  form.stepNote(form.lastStep, as.complete ? fmt(as.final) : '');

  $('songAvg').textContent = $('songsAvgTitle').textContent = as.songAvg === null ? '–' : fmt(as.songAvg);
  $('songAvgBar').style.width = as.songAvg === null ? '0' : as.songAvg * 10 + '%';
  $('songPartLabel').textContent = `Songs Ø · ${pct(as.songWeight)}`;
  $('answered').textContent = `${as.answered}/${as.total} Album-Fragen` + (as.countedCount ? ` · ${as.ratedCount}/${as.countedCount} Songs` : '');
  $('final').textContent = as.complete ? fmt(as.final) : '–';
  $('badge').style.setProperty('--p', as.complete ? as.final * 10 : 0);
  $('finalHint').textContent = as.complete ? (editingId ? 'gespeichertes Album' : 'fertig! 🎉') :
    as.final !== null ? `vorläufig ${fmt(as.final)} · ${as.missing[0]}` : as.missing[0] || '';

  const part = (label, v, extra, color) => `
    <div class="part" style="--c:${color}"><div class="s">${label}</div><div class="n">${v === null ? '–' : fmt(v)}</div>${extra ? `<div class="s">${extra}</div>` : ''}</div>`;
  $('formula').innerHTML = `<div class="formula">
    ${part(`Songs Ø · ${pct(as.songWeight)}`, as.songAvg, as.countedCount ? `${as.ratedCount}/${as.countedCount} Songs` : 'keine Songs', SONG_COLOR)}
    <div class="op">+</div>
    ${part(`Album-Fragen · ${pct(1 - as.songWeight)}`, as.questionScore, '', '#8b5cf6')}
    <div class="op">=</div>
    ${part('Album-Score', as.complete ? as.final : null, as.complete ? '' : 'noch nicht fertig', 'var(--accent-strong)')}
  </div>`;
  $('sum').innerHTML = ALBUM_CATS.map((cat, ci) => `
    <div class="sum-card" style="--c:${cat.color}"><div class="s">${esc(cat.name)} · ${Math.round(cat.w * 100)}% der Album-Fragen</div>
    <div class="n">${as.cats[ci] === null ? '–' : fmt(as.cats[ci])}</div></div>`).join('');
  $('missing').innerHTML = as.missing.map(m => `<div>⚠︎ ${esc(m)}</div>`).join('');
  $('save').disabled = !as.complete;
  $('save').textContent = editingId ? '💾 Änderungen speichern' : '💾 In Alben speichern';
  $('delete').hidden = !editingId;

  renderModes();
  renderTracks(as);
  const key = [albumIn.value, artistIn.value, meta.artwork, tracks.length].join('|');
  if (key !== pickedKey) { pickedKey = key; renderPicked(); }
  saveDraft();
}

/* ---------- load / save ---------- */
function setForm(rec) {
  editingId = rec.id || null;
  meta = Object.fromEntries(META_KEYS.map(k => [k, rec[k]]));
  albumIn.value = rec.album || ''; artistIn.value = rec.artist || '';
  tracks = rec.tracks || [];
  excluded = rec.excluded || [];
  mode = rec.mode || 'full';
  form.setAnswers(rec.answers);
  update();
}

function currentRecord() {
  return {
    id: editingId || newId(),
    album: albumIn.value.trim(), artist: artistIn.value.trim(), ...meta,
    tracks, excluded, mode, answers: form.answers,
    savedAt: new Date().toISOString(),
  };
}

function saveDraft() { store.set('albumRatingDraft', { ...currentRecord(), id: editingId }); }

$('save').onclick = () => {
  if (!albumIn.value.trim()) { form.goto(0); albumIn.focus(); return; }
  const rec = currentRecord();
  Albums.upsert(rec);
  editingId = rec.id;
  history.replaceState(null, '', '?id=' + encodeURIComponent(rec.id));
  refreshCounts();
  pickedKey = '';
  update();
  $('toast').innerHTML = `„${esc(rec.album)}“ gespeichert ✓ <a href="alben.html">Zu den Alben →</a>`;
};

$('newAlbum').onclick = () => {
  if (!editingId && (albumIn.value || scores(form.answers, ALBUM_CATS).answered) && !confirm('Aktuelle Album-Bewertung verwerfen und neu beginnen?')) return;
  store.set('albumRatingDraft', null);
  location.href = 'album.html';
};

$('delete').onclick = () => {
  if (!confirm(`„${albumIn.value}“ löschen? Die Song-Bewertungen bleiben erhalten.`)) return;
  Albums.remove(editingId);
  store.set('albumRatingDraft', null);
  location.href = 'alben.html';
};

// Coming back from rating a song (browser back button) → refresh song scores
window.addEventListener('pageshow', e => { if (e.persisted) update(); });

const draft = store.get('albumRatingDraft', null);
const editId = params.get('id');
if (editId && draft && draft.id === editId) setForm(draft);
else if (editId && Albums.get(editId)) setForm(Albums.get(editId));
else if (params.get('collectionId')) {
  setForm({});
  Itunes.lookupAlbum(params.get('collectionId')).then(r => { if (r) pickAlbum(r); });
}
else setForm(draft && !draft.id ? draft : {});
form.goto(editId ? form.lastStep : tracks.length ? 1 : 0);

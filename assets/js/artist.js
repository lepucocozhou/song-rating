// Artist rating page: pick an artist, answer the artist questions, save.
// The artist score then counts into the scores of their songs and albums (Settings → Artist-Fragen).
// URL: ?id=… edits a saved artist · ?name=… starts a new rating for this artist (e.g. from a song)

const params = new URLSearchParams(location.search);
const artistIn = $('artist');
const META_KEYS = ['artistId', 'genre', 'appleUrl', 'artwork'];
const pctText = v => Math.round(v * 100) + ' %';

let meta = {};
let editingId = null;

const form = createQuestionnaire({
  cats: ARTIST_CATS,
  before: [{ name: 'Artist', color: '#7dd3fc' }],
  after: [{ name: 'Ergebnis', color: '#7dd3fc' }],
  onChange: update,
});

/* ---------- artist search ---------- */
initSearchBox($('search'), $('suggest'), {
  search: term => Itunes.searchArtists(term),
  // empty box: artists from the current charts
  trending: async () => {
    const seen = new Set();
    return (await Itunes.charts()).songs
      .filter(s => { const k = norm(s.artist); return !seen.has(k) && seen.add(k); })
      .slice(0, 8).map(s => ({ artist: s.artist, artwork: s.artwork, genre: '' }));
  },
  title: r => r.artist,
  sub: r => r.genre || 'Artist',
  onPick(r) {
    const rated = savedArtist(r.artist);
    if (rated && rated.id !== editingId) { location.href = 'artist.html?id=' + encodeURIComponent(rated.id); return; }
    artistIn.value = r.artist;
    meta = Object.fromEntries(META_KEYS.map(k => [k, r[k]]));
    if (!meta.artwork && meta.artistId) Itunes.artistArtwork(meta.artistId).then(url => { if (url) { meta.artwork = url; pickedKey = ''; update(); } });
    update();
  },
});
artistIn.addEventListener('input', update);

const savedArtist = name => Artists.all().find(a => norm(a.artist) === norm(name)) || null;

function renderPicked() {
  const rec = { artist: artistIn.value, ...meta };
  $('barCover').innerHTML = coverHtml(rec, 'bar-cover');
  $('now').textContent = artistIn.value || 'Neuer Artist';
  $('nowSub').textContent = meta.genre || '';
  if (!artistIn.value) { $('picked').innerHTML = ''; $('mine').innerHTML = ''; return; }
  const other = !editingId && savedArtist(artistIn.value);
  $('picked').innerHTML = `
    <div class="picked">
      ${coverHtml(rec, 'artist-pic')}
      <div>
        <h3>${esc(artistIn.value)}</h3>
        <div class="sub">${esc(meta.genre || 'Artist')}</div>
        <div class="links">
          ${meta.appleUrl ? `<a href="${esc(meta.appleUrl)}" target="_blank" rel="noopener">In Apple Music öffnen ↗</a>` : ''}
        </div>
        ${other ? `<div class="already">Schon bewertet – <a href="artist.html?id=${encodeURIComponent(other.id)}">diese Bewertung öffnen →</a></div>` : ''}
      </div>
    </div>`;
  renderMine();
}

// Your songs and albums of this artist – helps with the discography questions
function renderMine() {
  const key = norm(artistIn.value);
  const songs = rankedSongs().filter(r => splitArtists(r.s.artist).includes(key)).sort((a, b) => (b.own ?? -1) - (a.own ?? -1));
  const albums = rankedAlbums().filter(r => splitArtists(r.a.artist).includes(key)).sort((a, b) => (b.core ?? -1) - (a.core ?? -1));
  if (!songs.length && !albums.length) {
    $('mine').innerHTML = '<p class="hint mine-empty">Du hast noch keine Songs oder Alben von diesem Artist bewertet.</p>';
    return;
  }
  const avg = (list, k) => { const v = list.map(r => r[k]).filter(x => x !== null); return v.length ? fmt(v.reduce((a, b) => a + b, 0) / v.length) : '–'; };
  const item = (href, title, v) => `<a class="mine-item" href="${esc(href)}"><span>${esc(title)}</span><span class="chip" style="background:${scoreColor(v)}">${v === null ? '–' : fmt(v)}</span></a>`;
  $('mine').innerHTML = `
    <div class="meta-title">Deine Bewertungen von diesem Artist (ohne Artist-Anteil) – als Hilfe für die Fragen zur Diskografie:</div>
    <div class="mine">
      ${albums.length ? `<div class="mine-col"><div class="mine-h">💿 ${albums.length} ${albums.length === 1 ? 'Album' : 'Alben'} · Ø ${avg(albums, 'core')}</div>
        ${albums.slice(0, 6).map(r => item('album.html?id=' + encodeURIComponent(r.a.id), r.a.album, r.core)).join('')}</div>` : ''}
      ${songs.length ? `<div class="mine-col"><div class="mine-h">🎵 ${songs.length} ${songs.length === 1 ? 'Song' : 'Songs'} · Ø ${avg(songs, 'own')}</div>
        ${songs.slice(0, 6).map(r => item('bewerten.html?id=' + encodeURIComponent(r.s.id), r.s.song, r.own)).join('')}</div>` : ''}
    </div>`;
}

/* ---------- live scores ---------- */
let pickedKey = '';
function update() {
  const sc = form.render();
  form.stepNote(0, artistIn.value ? '✓' : '', !!artistIn.value);
  form.stepNote(form.lastStep, sc.complete ? fmt(sc.final) : '');

  $('answered').textContent = `${sc.answered}/${sc.total} beantwortet`;
  $('final').textContent = sc.complete ? fmt(sc.final) : '–';
  $('badge').style.setProperty('--p', sc.complete ? sc.final * 10 : 0);
  $('finalHint').textContent = sc.complete ? (editingId ? 'gespeicherter Artist' : 'fertig! 🎉') :
    sc.final !== null ? `vorläufig ${fmt(sc.final)} · noch ${sc.total - sc.answered} offen` : 'erscheint, wenn alle Fragen beantwortet sind';

  const key = norm(artistIn.value);
  const nSongs = key ? Songs.all().filter(s => splitArtists(s.artist).includes(key)).length : 0;
  const nAlbums = key ? Albums.all().filter(a => splitArtists(a.artist).includes(key)).length : 0;
  $('influence').innerHTML = `Dieser Score zählt <b>${pctText(ARTIST_RULES.songWeight)}</b> in jeden Song und <b>${pctText(ARTIST_RULES.albumWeight)}</b> in jedes Album von ${esc(artistIn.value || 'diesem Artist')}` +
    ` – im Moment ${nSongs} ${nSongs === 1 ? 'Song' : 'Songs'} und ${nAlbums} ${nAlbums === 1 ? 'Album' : 'Alben'}. <a href="einstellungen.html#artists">Ändern</a>`;
  $('sum').innerHTML = ARTIST_CATS.map((cat, ci) => `
    <div class="sum-card" style="--c:${cat.color}"><div class="s">${esc(cat.name)} · ${Math.round(cat.w * 100)}%</div>
    <div class="n">${sc.cats[ci] === null ? '–' : fmt(sc.cats[ci])}</div></div>`).join('');
  $('save').disabled = !sc.complete;
  $('save').textContent = editingId ? 'Änderungen speichern' : 'In Artists speichern';
  $('delete').hidden = !editingId;
  if (!$('toast').dataset.keep) $('toast').textContent = sc.complete ? '' : `Noch ${sc.total - sc.answered} Fragen offen – beantworten oder „Weiß nicht“ wählen.`;

  const pk = [artistIn.value, meta.artwork, meta.genre].join('|');
  if (pk !== pickedKey) { pickedKey = pk; renderPicked(); }
  fillResultCard();
  saveDraft();
}

/* ---------- load / save ---------- */
function setForm(rec) {
  editingId = rec.id || null;
  meta = Object.fromEntries(META_KEYS.map(k => [k, rec[k]]));
  artistIn.value = rec.artist || '';
  form.setAnswers(rec.answers);
  update();
}

function currentRecord() {
  return { id: editingId || newId(), artist: artistIn.value.trim(), ...meta, answers: form.answers, savedAt: new Date().toISOString() };
}

function saveDraft() { store.set('artistRatingDraft', { ...currentRecord(), id: editingId }); }

$('save').onclick = () => {
  if (!artistIn.value.trim()) { form.goto(0); artistIn.focus(); return; }
  const other = savedArtist(artistIn.value);
  if (other && other.id !== editingId) {
    if (!confirm(`„${other.artist}“ ist schon bewertet. Die alte Bewertung durch diese ersetzen?`)) return;
    Artists.remove(other.id);
  }
  const rec = currentRecord();
  Artists.upsert(rec);
  editingId = rec.id;
  history.replaceState(null, '', '?id=' + encodeURIComponent(rec.id));
  refreshCounts();
  pickedKey = '';
  update();
  $('toast').dataset.keep = '1';
  $('toast').innerHTML = `„${esc(rec.artist)}“ gespeichert ✓ <a href="kuenstler.html">Zu den Artists →</a>`;
};

$('newArtist').onclick = () => {
  if (!editingId && scores(form.answers, ARTIST_CATS).answered && !confirm('Aktuelle Bewertung verwerfen und neuen Artist beginnen?')) return;
  store.set('artistRatingDraft', null);
  location.href = 'artist.html';
};

$('delete').onclick = () => {
  if (!confirm(`„${artistIn.value}“ löschen? Seine Songs und Alben zählen dann ohne Artist-Anteil.`)) return;
  Artists.remove(editingId);
  store.set('artistRatingDraft', null);
  location.href = 'kuenstler.html';
};

const draft = store.get('artistRatingDraft', null);
const editId = params.get('id');
const startName = params.get('name');
if (editId && draft && draft.id === editId) setForm(draft);
else if (editId && Artists.get(editId)) setForm(Artists.get(editId));
else if (startName && savedArtist(startName)) location.replace('artist.html?id=' + encodeURIComponent(savedArtist(startName).id));
else if (startName) setForm({ artist: startName });
else setForm(draft && !draft.id ? draft : {});
form.goto(editId ? form.lastStep : 0);

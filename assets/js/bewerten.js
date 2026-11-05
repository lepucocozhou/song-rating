// Song rating page: pick a song, answer the questions, save to the overview.
// URL: ?id=… edits a saved song · ?prefill=1&song=…&artist=… starts with these details (from an album)
//      &back=album.html… shows a link back to the album.

const params = new URLSearchParams(location.search);
$('finalLbl').textContent = L('Final Score', 'Endwertung', '最终得分');
const song = $('song'), artist = $('artist'), album = $('album');
const META_KEYS = ['artwork', 'appleUrl', 'preview', 'year', 'trackId'];

let meta = {};       // artwork, appleUrl, preview, year, trackId from the song search
let editingId = null;
let ownCover = false;  // keep this song's own cover instead of the album cover
let separate = false;  // this version of a song gets its own rating (instead of counting as the original)

const form = createQuestionnaire({
  cats: SONG_CATS,
  before: [{ name: 'Song', color: '#7dd3fc' }],
  after: [{ name: 'Ergebnis', color: '#7dd3fc' }],
  onChange: update,
});

const back = params.get('back');
if (back && back.startsWith('album.html')) {
  $('backToAlbum').href = back;
  $('backToAlbum').hidden = false;
}

/* ---------- song search + picked song ---------- */
initSearchBox($('search'), $('suggest'), {
  search: term => Itunes.search(term),
  trending: async () => (await Itunes.charts()).songs.slice(0, 8),
  title: r => r.song,
  sub: r => `${r.artist} · ${r.album}${r.year ? ' · ' + r.year : ''}`,
  onPick(r) {
    if (openIfRated(r)) return;
    song.value = r.song; artist.value = r.artist; album.value = r.album;
    meta = Object.fromEntries(META_KEYS.map(k => [k, r[k]]));
    update();
  },
});
['song', 'artist', 'album'].forEach(id => $(id).addEventListener('input', update));

function renderPicked() {
  const rec = { song: song.value, ...meta };
  if (!ownCover) rec.artwork = albumGroup({ album: album.value, artist: artist.value })?.cover || meta.artwork;
  $('barCover').innerHTML = coverHtml(rec, 'bar-cover');
  $('now').textContent = song.value || 'Neuer Song';
  $('nowSub').textContent = [artist.value, album.value].filter(Boolean).join(' · ');
  if (!song.value && !meta.artwork) { $('picked').innerHTML = ''; return; }
  $('picked').innerHTML = `
    <div class="picked">
      ${coverHtml(rec, '')}
      <div>
        <h3>${esc(song.value)}</h3>
        <div class="sub">${esc(artist.value)}${album.value ? ' · ' + esc(album.value) : ''}${meta.year ? ' · ' + esc(meta.year) : ''}</div>
        ${meta.preview ? `<audio controls preload="none" src="${esc(meta.preview)}"></audio>` : ''}
        <div class="links">
          ${meta.appleUrl ? `<a href="${esc(meta.appleUrl)}" target="_blank" rel="noopener">In Apple Music öffnen ↗</a>` : ''}
          ${meta.artwork ? '<button class="linkbtn" id="dropCover">Cover entfernen</button>' : ''}
        </div>
        ${alreadyRated()}
      </div>
    </div>
    ${coverPicker(rec.artwork)}`;
  const drop = $('dropCover');
  if (drop) drop.onclick = () => { meta = {}; update(); };
  document.querySelectorAll('[data-cover]').forEach(b => b.onclick = () => {
    setAlbumCover({ album: album.value, artist: artist.value }, b.dataset.cover);
    setOwnCover(false);
  });
  const own = $('ownCover');
  if (own) own.onchange = () => setOwnCover(own.checked);
}

// One cover for all songs of an album: choose between the covers its songs came with
function coverPicker(shown) {
  const g = albumGroup({ album: album.value, artist: artist.value });
  const choices = [...new Set([...(g ? g.choices : []), meta.artwork].filter(Boolean))];
  if (choices.length < 2) return '';
  return `
    <div class="cover-pick">
      <div class="cover-pick-t">Cover für alle Songs von „${esc(album.value.replace(/\s*[([].*?[)\]]|\s+-\s.*$/g, '').trim() || album.value)}“</div>
      <div class="cover-opts">${choices.map(url => `
        <button class="cover-opt ${!ownCover && url === g?.cover ? 'on' : ''}" data-cover="${esc(url)}" title="Dieses Cover für das ganze Album">
          <img src="${esc(Itunes.artwork(url, 200))}" alt=""></button>`).join('')}
      </div>
      ${meta.artwork ? `<label class="cover-own"><input type="checkbox" id="ownCover" ${ownCover ? 'checked' : ''}>
        Dieser Song behält sein eigenes Cover</label>` : ''}
    </div>`;
}
function setOwnCover(on) {
  ownCover = on;
  if (editingId && Songs.get(editingId)) Songs.upsert({ ...Songs.get(editingId), ownCover: on || undefined });
  pickedKey = '';
  update();
}

// Each song is rated only once: picking a song that is already saved opens its filled-in form instead.
// Another version of it (Remix, Taylor's Version …) opens the same rating, with a button to rate it separately.
function savedSong(track) {
  if (!track.song) return null;
  const others = Songs.all().filter(s => s.id !== editingId);
  return separate ? others.find(s => trackMatches(track, s, true)) || null : findSong(track, others);
}
function openIfRated(track) {
  const s = savedSong(track);
  if (!s) return false;
  if (!editingId) store.set('songRatingDraft', null);
  const exact = trackMatches(track, s, true);
  if (!exact) {
    const pick = Object.fromEntries(['song', 'artist', 'album', ...META_KEYS].map(k => [k, track[k]]));
    sessionStorage.setItem('songVersionPick', JSON.stringify({ ...pick, ...(back ? { back } : {}) }));
  }
  location.replace('bewerten.html?' + new URLSearchParams({ id: s.id, ...(back ? { back } : {}), already: exact ? 1 : 'version' }));
  return true;
}
function rateSeparately(track) {
  store.set('songRatingDraft', null);
  location.href = 'bewerten.html?' + new URLSearchParams(Object.entries({ prefill: 1, separate: 1, ...track }).filter(([, v]) => v));
}

// Hint when the typed-in details match a song that was already rated
function alreadyRated() {
  if (separate) return '<div class="already">Eigene Bewertung für diese Version</div>';
  if (editingId || !song.value) return '';
  const row = findSong({ song: song.value, artist: artist.value, trackId: meta.trackId }, rankedSongs(), r => r.s);
  return row ? `<div class="already">Schon bewertet (${row.final === null ? '–' : fmt(row.final)}) – <a href="bewerten.html?id=${encodeURIComponent(row.s.id)}">diese Bewertung öffnen →</a></div>` : '';
}

/* ---------- live scores ---------- */
let pickedKey = '';
function update() {
  const sc = form.render();
  form.stepNote(0, song.value ? '✓' : '', !!song.value);
  form.stepNote(form.lastStep, sc.complete ? fmt(sc.final) : '');

  $('answered').textContent = `${sc.answered}/${sc.total} beantwortet`;
  $('final').textContent = sc.complete ? fmt(sc.final) : '–';
  $('badge').style.setProperty('--p', sc.complete ? sc.final * 10 : 0);
  $('finalHint').textContent = sc.complete ? (editingId ? 'gespeicherter Song' : 'fertig! 🎉') :
    sc.final !== null ? `vorläufig ${fmt(sc.final)} · noch ${sc.total - sc.answered} offen` : 'erscheint, wenn alle Fragen beantwortet sind';

  $('sum').innerHTML = SONG_CATS.map((cat, ci) => `
    <div class="sum-card" style="--c:${cat.color}"><div class="s">${esc(cat.name)} · ${Math.round(cat.w * 100)}%</div>
    <div class="n">${sc.cats[ci] === null ? '–' : fmt(sc.cats[ci])}</div></div>`).join('');
  $('save').disabled = !sc.complete;
  $('save').textContent = editingId ? 'Änderungen speichern' : 'In Übersicht speichern';
  $('delete').hidden = !editingId;
  $('toast').textContent = sc.complete ? '' : `Noch ${sc.total - sc.answered} Fragen offen – beantworten oder „Weiß nicht“ wählen.`;

  const key = [song.value, artist.value, album.value, meta.artwork, ownCover, albumGroup({ album: album.value, artist: artist.value })?.cover].join('|');
  if (key !== pickedKey) { pickedKey = key; renderPicked(); }
  fillResultCard();
  saveDraft();
}

/* ---------- load / save ---------- */
function setForm(rec) {
  editingId = rec.id || null;
  separate = !!rec.separate && rec.separate !== '0';
  ownCover = !!rec.ownCover;
  meta = Object.fromEntries(META_KEYS.map(k => [k, rec[k]]));
  song.value = rec.song || ''; artist.value = rec.artist || ''; album.value = rec.album || '';
  form.setAnswers(normAnswers(rec.answers));
  update();
}

function currentRecord() {
  return {
    id: editingId || newId(),
    song: song.value.trim(), artist: artist.value.trim(), album: album.value.trim(), ...meta,
    ...(separate ? { separate: true } : {}),
    ...(ownCover ? { ownCover: true } : {}),
    ...pickKeys(editingId && Songs.get(editingId), ['albumCover', 'albumCoverAt']),
    answers: form.answers,
    savedAt: new Date().toISOString(),
  };
}

const pickKeys = (rec, keys) => Object.fromEntries(keys.filter(k => rec && rec[k]).map(k => [k, rec[k]]));

// Unsaved progress survives a reload (one draft at a time)
function saveDraft() { store.set('songRatingDraft', { ...currentRecord(), id: editingId }); }

$('save').onclick = () => {
  if (!song.value.trim()) { form.goto(0); song.focus(); return; }
  if (!editingId && openIfRated({ song: song.value, artist: artist.value, album: album.value, ...meta })) return;
  const rec = currentRecord();
  Songs.upsert(rec);
  editingId = rec.id;
  history.replaceState(null, '', '?' + new URLSearchParams({ id: rec.id, ...(back ? { back } : {}) }));
  refreshCounts();
  pickedKey = '';
  update();
  $('toast').innerHTML = `„${esc(rec.song)}“ gespeichert ✓ ` +
    (back ? `<a href="${esc(back)}">Zurück zum Album →</a>` : '<a href="songs.html">Zu deinen Songs →</a>');
};

$('newSong').onclick = () => {
  if (!editingId && scores(form.answers).answered && !confirm('Aktuelle Bewertung verwerfen und neuen Song beginnen?')) return;
  store.set('songRatingDraft', null);
  location.href = 'bewerten.html';
};

$('delete').onclick = () => {
  if (!confirm(`„${song.value}“ aus der Übersicht löschen?`)) return;
  Songs.remove(editingId);
  store.set('songRatingDraft', null);
  location.href = back || 'songs.html';
};

// ?id=… opens a saved song, ?prefill=1 starts a new one with given details, otherwise continue the draft
const draft = store.get('songRatingDraft', null);
const editId = params.get('id');
// A song from the charts / suggestions / an album that is already rated: open the saved rating
separate = !!params.get('separate');
if (!editId && params.get('prefill')) openIfRated(Object.fromEntries(params));
const samePrefill = draft && !draft.id && !!draft.separate === separate && draft.song === params.get('song') && draft.artist === params.get('artist');
if (editId && draft && draft.id === editId) setForm(draft);
else if (editId && Songs.get(editId)) setForm(Songs.get(editId));
else if (params.get('prefill') && samePrefill) setForm(draft);
else if (params.get('prefill')) setForm(Object.fromEntries([...params].filter(([k]) => !['prefill', 'back'].includes(k))));
else setForm(draft && !draft.id ? draft : {});
form.goto(editId ? form.lastStep : params.get('prefill') ? 1 : 0);
if (params.get('already') === 'version' && editingId) {
  const pick = JSON.parse(sessionStorage.getItem('songVersionPick') || 'null');
  $('toast').innerHTML = `<span>Das ist eine andere Version von „${esc(song.value)}“. Sie zählt als derselbe Song – hier ist deine Bewertung.</span>` +
    (pick ? '<br><button class="btn own-version" id="ownVersion">Diese Version einzeln bewerten</button>' : '');
  if (pick) $('ownVersion').onclick = () => rateSeparately(pick);
} else if (params.get('already') && editingId) {
  $('toast').textContent = 'Diesen Song hast du schon bewertet – hier ist deine Bewertung. Du kannst sie ändern.';
}
if (params.get('already')) {
  $('toast').scrollIntoView({ block: 'center' });
  history.replaceState(null, '', '?' + new URLSearchParams([...params].filter(([k]) => k !== 'already')));
}

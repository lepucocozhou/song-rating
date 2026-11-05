// Songs overview page.

const list = createListView({
  viewKey: 'songRatingView',
  titleLabel: 'Song',
  empty: 'Noch keine Songs bewertet.<br><a class="btn primary" href="bewerten.html">+ Ersten Song bewerten</a>',
  sorts: [
    { key: 'final', label: 'Rangliste (Final Score)', dir: -1 },
    ...SONG_CATS.map((c, i) => ({ key: 'c' + i, label: c.name, dir: -1 })),
    { key: 'title', label: 'Song A–Z', dir: 1 },
    { key: 'artist', label: 'Artist A–Z', dir: 1 },
    { key: 'savedAt', label: 'Zuletzt bewertet', dir: -1 },
  ],
  parts: SONG_CATS.map(c => ({ key: c.id, name: c.name, color: c.color })),
  filters: [{ key: 'artist', label: 'Artist', all: 'Alle Artists' }, { key: 'album', label: 'Album', all: 'Alle Alben' }],
  columns: [
    { key: 'album', label: 'Album', cell: r => esc(r.rec.album) },
    ...SONG_CATS.map((c, i) => ({ key: 'c' + i, label: c.name.split(' ')[0], title: c.name, color: c.color, part: c.id, num: true, cell: r => scoreCell(r.cats[i]) })),
  ],
  getRows: () => rankedSongs().map(r => ({
    id: r.s.id,
    href: 'bewerten.html?id=' + encodeURIComponent(r.s.id),
    rec: withCover(r.s),
    title: r.s.song,
    sub: [r.s.artist, r.s.album].filter(Boolean).join(' · '),
    final: r.final, rank: r.rank, cats: r.cats,
    bars: SONG_CATS.map((c, i) => ({ key: c.id, name: c.name, color: c.color, v: r.cats[i], w: c.w })),
    filter: { artist: r.s.artist, album: r.s.album },
    text: [r.s.song, r.s.artist, r.s.album].join(' '),
    sort: {
      final: r.final, title: (r.s.song || '').toLowerCase(), artist: (r.s.artist || '').toLowerCase(),
      album: (r.s.album || '').toLowerCase(), savedAt: r.s.savedAt || '',
      ...Object.fromEntries(r.cats.map((v, i) => ['c' + i, v])),
    },
  })),
  onDelete(id) {
    const s = Songs.get(id);
    if (confirm(`„${s.song}“ löschen?`)) Songs.remove(id);
  },
  afterRender: rows => { $('fetchCovers').hidden = !rows.some(r => !r.rec.artwork); },
});

// Look up covers for songs saved without one (e.g. from the first version of this page)
$('fetchCovers').onclick = async () => {
  const missing = Songs.all().filter(s => !s.artwork);
  let found = 0;
  for (const [n, s] of missing.entries()) {
    $('toast').textContent = `Suche Cover ${n + 1}/${missing.length} …`;
    try {
      const [hit] = await Itunes.search(`${s.song} ${s.artist}`, 1);
      if (hit) {
        const { artwork, appleUrl, preview, year, trackId } = hit;
        Songs.upsert({ ...Songs.get(s.id), artwork, appleUrl, preview, year, trackId });
        found++;
        list.render();
      }
    } catch (e) { /* offline or not found – skip */ }
  }
  $('toast').textContent = `${found} von ${missing.length} Covern gefunden.` +
    (found < missing.length ? ' Den Rest kannst du beim Bearbeiten über die Suche auswählen.' : '');
};

$('exportExcel').onclick = () => exportExcel($('toast'));

list.render();

$('shareTop').onclick = () => shareTop('songs');

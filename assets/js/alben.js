// Albums overview page.

const SONG_PART = { name: 'Songs Ø', color: '#0ea5e9' };

const list = createListView({
  viewKey: 'albumRatingView',
  titleLabel: 'Album',
  empty: 'Noch keine Alben bewertet.<br><a class="btn primary" href="album.html">+ Erstes Album bewerten</a>',
  sorts: [
    { key: 'final', label: 'Rangliste (Final Score)', dir: -1 },
    { key: 'songAvg', label: 'Songs Ø', dir: -1 },
    ...ALBUM_CATS.map((c, i) => ({ key: 'c' + i, label: c.name, dir: -1 })),
    { key: 'title', label: 'Album A–Z', dir: 1 },
    { key: 'artist', label: 'Artist A–Z', dir: 1 },
    { key: 'year', label: 'Erscheinungsjahr', dir: -1 },
    { key: 'savedAt', label: 'Zuletzt bewertet', dir: -1 },
  ],
  columns: [
    { key: 'year', label: 'Jahr', num: true, cell: r => esc(r.rec.year) },
    { key: 'songAvg', label: 'Songs Ø', color: SONG_PART.color, num: true, cell: r => scoreCell(r.songAvg) },
    { key: 'rated', label: 'Songs', num: true, cell: r => r.songsText },
    ...ALBUM_CATS.map((c, i) => ({ key: 'c' + i, label: c.name.split(' ')[0], title: c.name, color: c.color, num: true, cell: r => scoreCell(r.cats[i]) })),
  ],
  getRows: () => rankedAlbums().map(r => {
    const songsText = r.countedCount ? `${r.ratedCount}/${r.countedCount}` : '–';
    return {
      id: r.a.id,
      href: 'album.html?id=' + encodeURIComponent(r.a.id),
      rec: r.a,
      title: r.a.album,
      sub: [r.a.artist, r.a.year].filter(Boolean).join(' · '),
      note: `${songsText} Songs bewertet${r.a.mode === 'light' ? ' · <span class="badge">Schnell</span>' : ''}`,
      final: r.final, rank: r.rank, cats: r.cats, songAvg: r.songAvg, songsText,
      bars: [{ ...SONG_PART, v: r.songAvg }, ...ALBUM_CATS.map((c, i) => ({ name: c.name, color: c.color, v: r.cats[i] }))],
      text: [r.a.album, r.a.artist, r.a.year].join(' '),
      sort: {
        final: r.final, songAvg: r.songAvg, rated: r.ratedCount, year: r.a.year || '',
        title: (r.a.album || '').toLowerCase(), artist: (r.a.artist || '').toLowerCase(), savedAt: r.a.savedAt || '',
        ...Object.fromEntries(r.cats.map((v, i) => ['c' + i, v])),
      },
    };
  }),
  onDelete(id) {
    const a = Albums.get(id);
    if (confirm(`„${a.album}“ löschen? Die Song-Bewertungen bleiben erhalten.`)) Albums.remove(id);
  },
});

$('exportExcel').onclick = () => exportExcel($('toast'));

list.render();

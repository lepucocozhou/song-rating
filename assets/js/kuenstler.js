// Artists overview page. Each artist's score also counts into the scores of their songs and albums.

const songRows = rankedSongs(), albumRows = rankedAlbums();
const fmtOrDash = v => v === null ? '–' : fmt(v);

$('artistInfo').innerHTML = `Der Artist-Score zählt <b>${Math.round(ARTIST_RULES.songWeight * 100)} %</b> in die Songs und ` +
  `<b>${Math.round(ARTIST_RULES.albumWeight * 100)} %</b> in die Alben des Artists. <a href="einstellungen.html#artists">Fragen &amp; Einfluss ändern</a>`;

const list = createListView({
  viewKey: 'artistRatingView',
  titleLabel: 'Artist',
  empty: 'Noch keine Artists bewertet.<br><a class="btn primary" href="artist.html">+ Ersten Artist bewerten</a>',
  sorts: [
    { key: 'final', label: 'Rangliste (Artist-Score)', dir: -1 },
    ...ARTIST_CATS.map((c, i) => ({ key: 'c' + i, label: c.name, dir: -1 })),
    { key: 'songAvg', label: 'Ø deiner Songs', dir: -1 },
    { key: 'albumAvg', label: 'Ø deiner Alben', dir: -1 },
    { key: 'count', label: 'Meiste Bewertungen', dir: -1 },
    { key: 'title', label: 'Artist A–Z', dir: 1 },
    { key: 'savedAt', label: 'Zuletzt bewertet', dir: -1 },
  ],
  parts: ARTIST_CATS.map(c => ({ key: c.id, name: c.name, color: c.color })),
  filters: [{ key: 'genre', label: 'Genre', all: 'Alle Genres' }],
  columns: [
    { key: 'songAvg', label: 'Songs Ø', title: 'Durchschnitt deiner Songs (nur Song-Fragen)', color: '#0ea5e9', num: true, cell: r => fmtOrDash(r.songAvg) },
    { key: 'albumAvg', label: 'Alben Ø', title: 'Durchschnitt deiner Alben (ohne Artist-Anteil)', color: '#8b5cf6', num: true, cell: r => fmtOrDash(r.albumAvg) },
    ...ARTIST_CATS.map((c, i) => ({ key: 'c' + i, label: c.name.split(' ')[0], title: c.name, color: c.color, part: c.id, num: true, cell: r => scoreCell(r.cats[i]) })),
  ],
  getRows: () => rankedArtists(songRows, albumRows).map(r => {
    const counts = [r.songs.length && `${r.songs.length} ${r.songs.length === 1 ? 'Song' : 'Songs'}`,
      r.albums.length && `${r.albums.length} ${r.albums.length === 1 ? 'Album' : 'Alben'}`].filter(Boolean).join(' · ');
    return {
      id: r.a.id,
      href: 'artist.html?id=' + encodeURIComponent(r.a.id),
      rec: { artist: r.a.artist, artwork: artistArtwork(r.a, songRows, albumRows) },
      title: r.a.artist,
      sub: r.a.genre || 'Artist',
      note: counts ? `${counts} bewertet` : 'noch keine Songs oder Alben bewertet',
      final: r.final, rank: r.rank, cats: r.cats, songAvg: r.songAvg, albumAvg: r.albumAvg,
      bars: ARTIST_CATS.map((c, i) => ({ key: c.id, name: c.name, color: c.color, v: r.cats[i], w: c.w })),
      filter: { genre: r.a.genre },
      text: [r.a.artist, r.a.genre].join(' '),
      sort: {
        final: r.final, title: (r.a.artist || '').toLowerCase(), savedAt: r.a.savedAt || '',
        songAvg: r.songAvg, albumAvg: r.albumAvg, count: r.songs.length + r.albums.length,
        ...Object.fromEntries(r.cats.map((v, i) => ['c' + i, v])),
      },
    };
  }),
  onDelete(id) {
    const a = Artists.get(id);
    if (confirm(`„${a.artist}“ löschen? Seine Songs und Alben zählen dann ohne Artist-Anteil.`)) Artists.remove(id);
  },
});

$('exportExcel').onclick = () => exportExcel($('toast'));

list.render();

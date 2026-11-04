// Song and album data via the free Apple iTunes Search API and chart feeds (no account or key needed).
// Uses JSONP (a <script> tag) so it also works when the page is opened directly as a file.

const Itunes = {
  async request(path, params) {
    return (await Itunes.jsonp(`https://itunes.apple.com/${path}?` + new URLSearchParams({ ...params, country: 'DE' }))).results || [];
  },

  jsonp(url) {
    return new Promise((resolve, reject) => {
      const cb = 'itunesCb' + Date.now() + Math.floor(Math.random() * 1e6);
      const script = document.createElement('script');
      const timer = setTimeout(() => { cleanup(); reject(new Error('timeout')); }, 8000);
      function cleanup() { clearTimeout(timer); delete window[cb]; script.remove(); }
      window[cb] = data => { cleanup(); resolve(data); };
      script.onerror = () => { cleanup(); reject(new Error('network')); };
      script.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + cb;
      document.head.appendChild(script);
    });
  },

  // Searches return more results than shown and re-rank them so that originals by well-known artists
  // come first: artists you already rated, artists with several hits in the results, the earliest
  // release of a title (covers come later) and current chart artists get a bonus; karaoke and
  // cover versions go to the end.
  async search(term, limit = 8) {
    const found = (await Itunes.request('search', { term, entity: 'song', limit: Math.max(limit, 25) })).map(Itunes.toSong);
    return Itunes.rank(found, term).slice(0, limit);
  },

  async searchAlbums(term, limit = 8) {
    const found = (await Itunes.request('search', { term, entity: 'album', limit: Math.max(limit, 25) })).map(Itunes.toAlbum);
    return Itunes.rank(found, term).slice(0, limit);
  },

  async lookupAlbum(collectionId) {
    const [r] = await Itunes.request('lookup', { id: collectionId });
    return r ? Itunes.toAlbum(r) : null;
  },

  rank(items, term) {
    const trending = Itunes.trendingArtists();
    const rated = new Set([...Songs.all(), ...Albums.all()].flatMap(r => Itunes.artistNames(r.artist)));
    const words = term.toLowerCase();
    const knockoff = /karaoke|tribute|made famous|in the style of|originally performed|instrumental|lullaby|music box|8[- ]?bit|string quartet|piano (cover|version)|cover version|workout|kids/i;
    const hits = new Map();
    items.forEach(r => Itunes.artistNames(r.artist).forEach(n => hits.set(n, (hits.get(n) || 0) + 1)));
    const firstRelease = new Map();
    items.forEach(r => {
      const k = norm(r.song || r.album);
      if (r.released && (!firstRelease.has(k) || r.released < firstRelease.get(k))) firstRelease.set(k, r.released);
    });
    return items
      .map((r, i) => {
        const names = Itunes.artistNames(r.artist);
        let score = -i;                                            // Apple's own relevance order
        if (names.some(n => rated.has(n))) score += 8;             // you already rated this artist
        score += Math.min(8, 3 * (Math.max(0, ...names.map(n => hits.get(n) || 0)) - 1)); // several hits → well known
        if (r.released && r.released === firstRelease.get(norm(r.song || r.album))) score += 6; // probably the original
        if (names.some(n => trending.has(n))) score += 5;          // in the current charts
        const text = `${r.song || ''} ${r.album || ''} ${r.artist}`;
        if (knockoff.test(text) && !knockoff.test(words)) score -= 50;
        return { r, score };
      })
      .sort((a, b) => b.score - a.score)
      .map(x => x.r)
      // the same song/album often exists on several releases – keep the best-ranked one
      .filter((r, i, all) => all.findIndex(o => key(o) === key(r)) === i);
    function key(r) { return `${(r.song || r.album || '').toLowerCase()}|${r.artist.toLowerCase()}`; }
  },

  // "Taylor Swift & Ed Sheeran, Future" → ['taylorswift', 'edsheeran', 'future']
  artistNames: s => (s || '').split(/,|&| feat\.? | ft\.? | x | und /i).map(norm).filter(Boolean),

  /* ---------- charts (Apple iTunes top lists, cached for a few hours) ---------- */
  // Apple has no worldwide list, so "global" adds up the charts of several big markets:
  // a place in a country's top 100 gives 101 − rank points, the most points come first.
  GLOBAL_COUNTRIES: ['us', 'gb', 'de', 'fr', 'ca', 'au', 'br', 'mx', 'es', 'it'],

  chartRegion: () => store.get('chartRegion', 'de'),

  async charts(region = Itunes.chartRegion()) {
    const cached = store.get('chartsCache-' + region, null);
    if (cached && Date.now() - cached.at < 6 * 3600 * 1000) return cached;
    const countries = region === 'global' ? Itunes.GLOBAL_COUNTRIES : [region];
    const lists = await Promise.all(countries.map(async c => {
      const feed = async kind => (await Itunes.jsonp(`https://itunes.apple.com/${c}/rss/${kind}/limit=100/json`)).feed.entry || [];
      const [songs, albums] = await Promise.all([feed('topsongs'), feed('topalbums')]);
      return { songs: songs.map(Itunes.chartSong), albums: albums.map(Itunes.chartAlbum) };
    }));
    const combine = (key, id) => {
      const byId = new Map();
      lists.forEach(l => l[key].forEach((x, i) => {
        const cur = byId.get(x[id]) || { ...x, points: 0 };
        cur.points += 100 - i;
        byId.set(x[id], cur);
      }));
      return [...byId.values()].sort((a, b) => b.points - a.points).slice(0, 100)
        .map(({ points, ...x }, i) => ({ ...x, chartRank: i + 1 }));
    };
    const data = { at: Date.now(), songs: combine('songs', 'trackId'), albums: combine('albums', 'collectionId') };
    store.set('chartsCache-' + region, data);
    return data;
  },

  chartImage: e => Itunes.artwork(e['im:image'].at(-1).label, 600),

  chartSong: e => ({
    song: e['im:name'].label,
    artist: e['im:artist'].label,
    album: (e['im:collection']?.['im:name']?.label || '').replace(/ - (Single|EP)$/, ''),
    artwork: Itunes.chartImage(e),
    appleUrl: e.link?.[0]?.attributes?.href || '',
    preview: e.link?.find?.(l => l.attributes?.['im:assetType'] === 'preview')?.attributes.href || '',
    year: (e['im:releaseDate']?.label || '').slice(0, 4),
    released: (e['im:releaseDate']?.label || '').slice(0, 10),
    trackId: +e.id.attributes['im:id'],
  }),

  chartAlbum: e => ({
    album: e['im:name'].label.replace(/ - (Single|EP)$/, ''),
    artist: e['im:artist'].label,
    artwork: Itunes.chartImage(e),
    appleUrl: e.id?.label || '',
    year: (e['im:releaseDate']?.label || '').slice(0, 4),
    released: (e['im:releaseDate']?.label || '').slice(0, 10),
    collectionId: +e.id.attributes['im:id'],
  }),

  // Artist names from the cached charts (empty until the charts were loaded once)
  trendingArtists() {
    const c = store.get('chartsCache-' + Itunes.chartRegion(), null);
    return new Set(c ? [...c.songs, ...c.albums].flatMap(x => Itunes.artistNames(x.artist)) : []);
  },

  // Tracklist of an album, in disc/track order
  async tracks(collectionId) {
    return (await Itunes.request('lookup', { id: collectionId, entity: 'song' }))
      .filter(r => r.wrapperType === 'track')
      .sort((a, b) => (a.discNumber - b.discNumber) || (a.trackNumber - b.trackNumber))
      .map(Itunes.toSong);
  },

  artwork: (url, size) => (url || '').replace(/\d+x\d+bb/, `${size}x${size}bb`),

  toSong(r) {
    return {
      song: r.trackName,
      artist: r.artistName,
      album: (r.collectionName || '').replace(/ - (Single|EP)$/, ''),
      artwork: Itunes.artwork(r.artworkUrl100, 600),
      appleUrl: r.trackViewUrl || '',
      preview: r.previewUrl || '',
      year: (r.releaseDate || '').slice(0, 4),
      released: (r.releaseDate || '').slice(0, 10),
      trackId: r.trackId,
      trackNumber: r.trackNumber,
    };
  },

  toAlbum(r) {
    return {
      album: (r.collectionName || '').replace(/ - (Single|EP)$/, ''),
      artist: r.artistName,
      artwork: Itunes.artwork(r.artworkUrl100, 600),
      appleUrl: r.collectionViewUrl || '',
      year: (r.releaseDate || '').slice(0, 4),
      released: (r.releaseDate || '').slice(0, 10),
      collectionId: r.collectionId,
      trackCount: r.trackCount,
    };
  },
};

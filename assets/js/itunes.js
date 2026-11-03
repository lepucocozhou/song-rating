// Song and album data via the free Apple iTunes Search API (no account or key needed).
// Uses JSONP (a <script> tag) so it also works when the page is opened directly as a file.

const Itunes = {
  request(path, params) {
    return new Promise((resolve, reject) => {
      const cb = 'itunesCb' + Date.now() + Math.floor(Math.random() * 1e6);
      const script = document.createElement('script');
      const timer = setTimeout(() => { cleanup(); reject(new Error('timeout')); }, 8000);
      function cleanup() { clearTimeout(timer); delete window[cb]; script.remove(); }
      window[cb] = data => { cleanup(); resolve(data.results || []); };
      script.onerror = () => { cleanup(); reject(new Error('network')); };
      script.src = `https://itunes.apple.com/${path}?` + new URLSearchParams({ ...params, country: 'DE', callback: cb });
      document.head.appendChild(script);
    });
  },

  async search(term, limit = 8) {
    return (await Itunes.request('search', { term, entity: 'song', limit })).map(Itunes.toSong);
  },

  async searchAlbums(term, limit = 8) {
    return (await Itunes.request('search', { term, entity: 'album', limit })).map(Itunes.toAlbum);
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
      collectionId: r.collectionId,
      trackCount: r.trackCount,
    };
  },
};

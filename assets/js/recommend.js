// Daily song suggestions on the start page ("Für dich heute"):
// your best-rated artists → similar artists (free Deezer API, no account or key) → their popular songs
// that you have not rated yet. Computed once per day and kept on this device; "Neue Vorschläge" reshuffles.

const RECS_COUNT = 10;

const deezer = async (path, params = {}) =>
  (await Itunes.jsonp('https://api.deezer.com/' + path + '?' + new URLSearchParams({ ...params, output: 'jsonp' }))).data || [];

// Random numbers that are the same for the same day (so the suggestions don't change on every reload)
function seededRandom(seed) {
  let h = 1779033703;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 3432918353);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
const shuffle = (list, rnd) => list.map(x => [rnd(), x]).sort((a, b) => a[0] - b[0]).map(p => p[1]);
const mainArtist = name => (name || '').split(/\s+(?:feat\.?|ft\.?|&|x|with)\s+|,/i)[0].trim();
const recDay = () => new Date().toLocaleDateString('sv');   // YYYY-MM-DD in local time

// Artists sorted by how much you like them (average score; a few extra points for more ratings)
function favouriteArtists(songRows, albumRows) {
  const by = new Map();
  const add = (name, v) => {
    name = mainArtist(name);
    if (!name || v === null) return;
    const a = by.get(name.toLowerCase()) || { name, sum: 0, n: 0 };
    a.sum += v; a.n++;
    by.set(name.toLowerCase(), a);
  };
  songRows.forEach(r => add(r.s.artist, r.final));
  albumRows.forEach(r => add(r.a.artist, r.final));
  const score = a => a.avg + Math.min(a.n, 5) * 0.05;
  return [...by.values()].map(a => ({ ...a, avg: a.sum / a.n })).sort((a, b) => score(b) - score(a));
}

async function buildRecs(seed) {
  const rnd = seededRandom(seed);
  const songRows = rankedSongs().filter(r => r.final !== null);
  const albumRows = rankedAlbums().filter(r => r.final !== null);
  const favs = favouriteArtists(songRows, albumRows);
  const good = favs.filter(a => a.avg >= 6.5);
  const seeds = shuffle((good.length >= 3 ? good : favs).slice(0, 6), rnd).slice(0, 3);

  const groups = await Promise.all(seeds.map(async fav => {
    const [artist] = await deezer('search/artist', { q: fav.name, limit: 1 });
    if (!artist) return [];
    const related = shuffle(await deezer(`artist/${artist.id}/related`, { limit: 12 }), rnd).slice(0, 4);
    const lists = await Promise.all([
      deezer(`artist/${artist.id}/top`, { limit: 10 }).then(ts => ts.map(t => ({ t, reason: `Mehr von ${fav.name}` }))),
      ...related.map(a => deezer(`artist/${a.id}/top`, { limit: 5 }).then(ts => ts.map(t => ({ t, reason: `Ähnlich wie ${fav.name}` })))),
    ]);
    return lists.flat();
  }));

  const rated = (song, artist) => songRows.some(r => trackMatches({ song, artist }, r.s));
  const seen = new Set(), perArtist = {};
  const fresh = shuffle(groups.flat(), rnd)
    .map(({ t, reason }) => ({ song: t.title, artist: t.artist.name, album: t.album.title, artwork: t.album.cover_big, reason }))
    .filter(x => {
      const key = norm(x.song) + '|' + norm(x.artist);
      if (seen.has(key) || rated(x.song, x.artist) || (perArtist[x.artist] || 0) >= 2) return false;
      seen.add(key); perArtist[x.artist] = (perArtist[x.artist] || 0) + 1;
      return true;
    });
  // mostly similar artists (new discoveries), plus two more songs from your favourites
  const more = fresh.filter(x => x.reason.startsWith('Mehr')).slice(0, 2);
  const similar = fresh.filter(x => !x.reason.startsWith('Mehr')).slice(0, RECS_COUNT - more.length);
  return shuffle([...similar, ...more], rnd);
}

let recsLoading = false;   // a redraw (e.g. after cloud sync) while loading must not start a second search

async function renderRecs(fresh) {
  if (recsLoading) return;
  const block = $('recsBlock');
  const hasRatings = Songs.all().length + Albums.all().length > 0;
  block.hidden = !hasRatings;
  if (!hasRatings) return;

  let cache = store.get('songRecs', null);
  if (fresh || !cache || cache.day !== recDay() || !cache.items.length) {
    const round = fresh && cache && cache.day === recDay() ? (cache.round || 0) + 1 : 0;
    $('recs').innerHTML = '<div class="rail-msg">Suche passende Songs …</div>';
    recsLoading = true;
    try {
      cache = { day: recDay(), round, items: await buildRecs(recDay() + '#' + round) };
      store.set('songRecs', cache);
    } catch (e) {
      $('recs').innerHTML = '<div class="rail-msg">Gerade keine Vorschläge möglich – bist du online?</div>';
      return;
    } finally { recsLoading = false; }
  }

  // Songs you rated in the meantime drop out
  const songRows = rankedSongs();
  const items = cache.items.filter(x => !songRows.some(r => trackMatches(x, r.s)));
  $('recs').innerHTML = items.length ? items.map(x => {
    const href = 'bewerten.html?' + new URLSearchParams({ prefill: 1, song: x.song, artist: x.artist, album: x.album, artwork: x.artwork });
    return `
      <a class="rail-card" href="${esc(href)}">
        <div class="rail-cover">${coverHtml(x, '')}</div>
        <div class="rail-t">${esc(x.song)}</div>
        <div class="rail-sub">${esc(x.artist)}</div>
        <div class="rail-tag rec" title="${esc(x.reason)}">${esc(x.reason)}</div>
      </a>`;
  }).join('') : '<div class="rail-msg">Alle heutigen Vorschläge bewertet 🎉 – tipp auf „Neue Vorschläge“.</div>';
}

$('recsMore').onclick = () => renderRecs(true);

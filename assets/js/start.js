// Start page: greeting, a few statistics and charts about your ratings, and new releases to rate.

const NEW_DAYS = 60; // releases from the last two months count as "new"

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? 'Gute Nacht' : h < 11 ? 'Guten Morgen' : h < 17 ? 'Hallo' : h < 22 ? 'Guten Abend' : 'Gute Nacht';
}

function renderMine() {
  const songs = rankedSongs().filter(r => r.final !== null).sort((a, b) => a.rank - b.rank);
  const albums = rankedAlbums().filter(r => r.final !== null).sort((a, b) => a.rank - b.rank);
  $('greeting').innerHTML = greeting() + '<em>.</em>';

  if (!songs.length && !albums.length) {
    $('summary').textContent = 'Willkommen bei deinem persönlichen Song-Ranking!';
    $('mine').innerHTML = `
      <section class="intro">
        <div class="step-card"><b>1</b><div><h3>Song suchen</h3><p>Tipp auf „Song bewerten“ und such deinen Lieblingssong – Cover und Infos kommen automatisch.</p></div></div>
        <div class="step-card"><b>2</b><div><h3>Fragen beantworten</h3><p>Schieb die Regler für jede Frage. Nicht sicher? Einfach „Weiß nicht“.</p></div></div>
        <div class="step-card"><b>3</b><div><h3>Ranking ansehen</h3><p>Deine Songs landen in einer Rangliste mit Cover-Galerie – auch Alben kannst du ranken.</p></div></div>
      </section>`;
    return;
  }

  const avg = songs.length ? songs.reduce((s, r) => s + r.final, 0) / songs.length : null;
  $('summary').textContent = `Du hast ${songs.length} ${songs.length === 1 ? 'Song' : 'Songs'}` +
    (albums.length ? ` und ${albums.length} ${albums.length === 1 ? 'Album' : 'Alben'}` : '') + ' bewertet.';

  // Favourite artist: best average among artists with at least 2 songs (otherwise the best single one)
  const byArtist = new Map();
  songs.forEach(r => {
    const key = r.s.artist || '–';
    const a = byArtist.get(key) || { name: key, sum: 0, n: 0 };
    a.sum += r.final; a.n++;
    byArtist.set(key, a);
  });
  const artists = [...byArtist.values()].map(a => ({ ...a, avg: a.sum / a.n }));
  const multi = artists.filter(a => a.n >= 2);
  const topArtists = (multi.length >= 3 ? multi : artists).sort((a, b) => b.avg - a.avg || b.n - a.n).slice(0, 5);
  const fav = topArtists[0];

  const tile = (label, value, sub) => `<div class="tile"><div class="tile-label">${label}</div><div class="tile-value">${value}</div>${sub ? `<div class="tile-sub">${sub}</div>` : ''}</div>`;
  const pod = (href, rec, title, sub, final, badge, cls = '') => `
    <a class="pod ${cls}" href="${href}">
      <div class="pod-cover">${coverHtml(rec, '')}${badge}</div>
      <div class="pod-info">
        <div class="pod-text"><div class="pod-t">${esc(title)}</div><div class="pod-sub">${sub}</div></div>
        <span class="chip" style="background:${scoreColor(final)}">${fmt(final)}</span>
      </div>
    </a>`;
  const podium = songs.slice(0, 3).map(r =>
    pod(`bewerten.html?id=${encodeURIComponent(r.s.id)}`, r.s, r.s.song, esc(r.s.artist), r.final, medalHtml(r.rank))).join('');
  const topAlbum = albums[0];

  $('mine').innerHTML = `
    <section class="tiles">
      ${tile('Songs bewertet', songs.length)}
      ${tile('Alben bewertet', albums.length)}
      ${tile('Ø Song-Score', avg === null ? '–' : fmt(avg))}
      ${tile('Lieblings-Artist', fav ? esc(fav.name) : '–', fav ? `Ø ${fmt(fav.avg)} · ${fav.n} ${fav.n === 1 ? 'Song' : 'Songs'}` : '')}
    </section>

    <section class="block">
      <div class="block-head"><h2>Deine Top ${Math.min(3, songs.length)}</h2><a href="songs.html">Alle Songs →</a></div>
      <div class="podium">
        ${podium}
        ${topAlbum ? pod(`album.html?id=${encodeURIComponent(topAlbum.a.id)}`, topAlbum.a, topAlbum.a.album,
          `Dein Top-Album · ${esc(topAlbum.a.artist)}`, topAlbum.final, '<span class="medal ma">A</span>', 'pod-album') : ''}
      </div>
    </section>

    <section class="block charts">
      <div class="chart-card">
        <h3>So verteilen sich deine Scores</h3>
        <p class="chart-sub">Anzahl Songs je Final Score</p>
        <div id="chartDist"></div>
      </div>
      <div class="chart-card">
        <h3>Ø pro Kategorie</h3>
        <p class="chart-sub">Durchschnitt über alle Songs (1–10)</p>
        <div id="chartCats"></div>
      </div>
      <div class="chart-card">
        <h3>Deine Top-Artists</h3>
        <p class="chart-sub">Ø Final Score${multi.length >= 3 ? ' · mind. 2 Songs' : ''}</p>
        <div id="chartArtists"></div>
      </div>
    </section>`;

  // One-point steps over the whole scale (1–2 … 9–10; 10 belongs to the last step)
  const bins = Array.from({ length: 9 }, (_, i) => [`${i + 1}–${i + 2}`, i ? i + 1 : 0, i === 8 ? 10.01 : i + 2]);
  columnChart($('chartDist'), bins.map(([label, lo, hi]) => {
    const n = songs.filter(r => r.final >= lo && r.final < hi).length;
    return { label, value: n, tip: `Score ${label} · ${n === 1 ? 'Song' : 'Songs'}` };
  }), { caption: 'Anzahl Songs je Final Score' });

  barChart($('chartCats'), SONG_CATS.map((c, i) => {
    const vals = songs.map(r => r.cats[i]).filter(v => v !== null);
    return { label: c.name, value: vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0, color: c.color };
  }), { caption: 'Durchschnitt pro Kategorie' });

  barChart($('chartArtists'), topArtists.map(a => ({ label: a.name, sub: `${a.n} ${a.n === 1 ? 'Song' : 'Songs'}`, value: a.avg })),
    { caption: 'Top-Artists nach Durchschnitt' });
}

/* ---------- new releases from the charts ---------- */
function isNew(released) {
  return released && (Date.now() - new Date(released).getTime()) / 864e5 <= NEW_DAYS;
}

// New releases in chart order (most popular first); topped up with the chart leaders if there are only a few
function freshFirst(items) {
  const fresh = items.filter(x => isNew(x.released)).sort((a, b) => a.chartRank - b.chartRank);
  const rest = items.filter(x => !fresh.includes(x));
  return [...fresh, ...rest].slice(0, 15);
}

const releaseLabel = x => isNew(x.released)
  ? `Neu · ${new Date(x.released).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' })}`
  : `#${x.chartRank} in den Charts`;

async function renderReleases() {
  const region = Itunes.chartRegion();
  document.querySelectorAll('[data-region]').forEach(btn => {
    btn.classList.toggle('on', btn.dataset.region === region);
    btn.onclick = () => {
      if (btn.dataset.region === Itunes.chartRegion()) return;
      store.set('chartRegion', btn.dataset.region);
      $('newSongs').innerHTML = $('newAlbums').innerHTML = '<div class="rail-msg">Lade Charts …</div>';
      renderReleases();
    };
  });
  $('chartsSub').textContent = region === 'global'
    ? 'Neue Songs aus den Charts weltweit – antippen zum Bewerten'
    : 'Neue Songs aus den deutschen Charts – antippen zum Bewerten';
  let charts;
  try { charts = await Itunes.charts(region); }
  catch (e) {
    $('newSongs').innerHTML = $('newAlbums').innerHTML = '<div class="rail-msg">Die Charts sind gerade nicht erreichbar – bist du online?</div>';
    return;
  }
  if (region !== Itunes.chartRegion()) return;   // switched again while loading
  const songRows = rankedSongs(), albumList = Albums.all();

  $('newSongs').innerHTML = freshFirst(charts.songs).map(x => {
    const rated = findSong(x, songRows, r => r.s);
    // another version of a rated song goes through the rating page (it explains and offers to rate it separately)
    const href = rated && trackMatches(x, rated.s, true) ? 'bewerten.html?id=' + encodeURIComponent(rated.s.id) : 'bewerten.html?' + new URLSearchParams({
      prefill: 1, song: x.song, artist: x.artist, album: x.album, artwork: x.artwork,
      appleUrl: x.appleUrl, preview: x.preview, year: x.year, trackId: x.trackId,
    });
    return railCard(href, x, x.song, x.artist, rated ? rated.final : undefined);
  }).join('');

  $('newAlbums').innerHTML = freshFirst(charts.albums).map(x => {
    const rated = albumList.find(a => a.collectionId === x.collectionId ||
      (norm(a.album) === norm(x.album) && norm(a.artist) === norm(x.artist)));
    const href = rated ? 'album.html?id=' + encodeURIComponent(rated.id) : 'album.html?collectionId=' + x.collectionId;
    return railCard(href, x, x.album, x.artist, rated ? albumScores(rated, songRows).final : undefined);
  }).join('');
}

function railCard(href, x, title, artist, score) {
  return `
    <a class="rail-card" href="${esc(href)}">
      <div class="rail-cover">${coverHtml({ ...x, song: title }, '')}
        ${score !== undefined ? `<span class="chip" style="background:${scoreColor(score)}">${score === null ? '–' : fmt(score)}</span>` : ''}
      </div>
      <div class="rail-t">${esc(title)}</div>
      <div class="rail-sub">${esc(artist)}</div>
      <div class="rail-tag ${isNew(x.released) ? 'new' : ''}">${score !== undefined ? '✓ bewertet' : releaseLabel(x)}</div>
    </a>`;
}

// cloud.js calls list.render() when ratings arrive from another device
const list = { render() { renderMine(); renderRecs(); renderReleases(); } };
list.render();

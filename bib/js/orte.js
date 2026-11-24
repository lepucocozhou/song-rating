// Rangliste aller Lernorte: als Liste mit Kategorie-Balken, als Kacheln mit Fotos oder als Vergleichstabelle (wie Blatt „Übersicht“).

const all = rankedPlaces();
let view = store.get('view', 'list');
$('sort').value = store.get('sort', 'note');

$('sub').textContent = all.length === 1 ? '1 Lernort' : `${all.length} Lernorte`;
$('q').addEventListener('input', render);
$('sort').addEventListener('change', () => { store.set('sort', $('sort').value); render(); });
$('view').addEventListener('click', e => {
  const b = e.target.closest('[data-v]');
  if (!b) return;
  view = b.dataset.v; store.set('view', view); render();
});

function visibleRows() {
  const term = $('q').value.trim().toLowerCase();
  const rows = all.filter(r => !term || `${r.p.name} ${r.p.where || ''}`.toLowerCase().includes(term));
  const s = $('sort').value;
  if (s === 'name') rows.sort((a, b) => a.p.name.localeCompare(b.p.name, 'de'));
  if (s === 'new') rows.sort((a, b) => (b.p.updatedAt || '').localeCompare(a.p.updatedAt || ''));
  return rows;
}

function render() {
  document.querySelectorAll('#view button').forEach(b => b.classList.toggle('on', b.dataset.v === view));
  const rows = visibleRows();
  if (!all.length) {
    $('out').innerHTML = `<div class="empty"><h2>Noch keine Lernorte</h2><p>Bewerte deinen ersten Ort, dann erscheint er hier.</p>
      <a class="btn primary" href="bewerten.html">Lernort bewerten</a></div>`;
    return;
  }
  if (!rows.length) { $('out').innerHTML = '<p class="muted">Nichts gefunden.</p>'; return; }
  $('out').innerHTML = view === 'table' ? table(rows) : view === 'grid' ? grid(rows) : list(rows);
}
$('shareTop').onclick = shareTop;

// Kacheln: großes Foto (oder Anfangsbuchstabe), Rang, Note, Name und die Kategorie-Balken
function grid(rows) {
  return `<div class="cards">${rows.map(r => {
    const l = level(r.note), n = r.p.photos?.length || 0;
    return `<a class="card-pl" href="bewerten.html?id=${r.p.id}">
      <div class="cp-img">${placeTile(r, 'cp-photo')}
        ${r.rank ? `<span class="cp-rank${r.rank <= 3 ? ' m' + r.rank : ''}">${r.rank}</span>` : ''}
        ${n > 1 ? `<span class="cp-count">${n} Fotos</span>` : ''}
        <span class="cp-chip">${chip(r.note)}</span>
      </div>
      <div class="cp-body">
        <div class="t">${esc(r.p.name)}</div>
        <div class="sub">${[r.p.where, l?.name].filter(Boolean).map(esc).join(' · ') || '&nbsp;'}${r.ko ? ' <span class="ko-tag">K.-o.</span>' : ''}</div>
        <div class="cat-bars">${r.cats.map((k, i) => `<i style="--c:${CATS[i].color}" title="${esc(CATS[i].name)}: ${catNote(k)}"><b style="width:${(k ?? 0) * 100}%"></b></i>`).join('')}</div>
      </div>
    </a>`;
  }).join('')}</div>
  <div class="legend">${CATS.map(c => `<span><i style="background:${c.color}"></i>${esc(c.short)} ${Math.round(c.w * 100)} %</span>`).join('')}</div>`;
}

function list(rows) {
  return `<div class="rows">${rows.map(r => {
    const l = level(r.note);
    return `<a class="row" href="bewerten.html?id=${r.p.id}">
      <span class="row-rank">${r.rank ?? '–'}</span>
      ${placeTile(r, 'row-img')}
      <div class="row-text">
        <div class="t">${esc(r.p.name)}</div>
        <div class="sub">${[r.p.where, r.answered < r.total ? `${r.answered}/${r.total} Fragen` : ''].filter(Boolean).map(esc).join(' · ') || '&nbsp;'}</div>
        <div class="cat-bars">${r.cats.map((k, i) => `<i style="--c:${CATS[i].color}" title="${esc(CATS[i].name)}: ${catNote(k)}"><b style="width:${(k ?? 0) * 100}%"></b></i>`).join('')}</div>
      </div>
      <div class="row-right">
        ${chip(r.note)}
        <div class="tags">${l ? `<span class="level ${l.cls}">${l.name}</span>` : ''}${r.ko ? '<span class="ko-tag">K.-o.</span>' : ''}</div>
      </div>
    </a>`;
  }).join('')}</div>
  <div class="legend">${CATS.map(c => `<span><i style="background:${c.color}"></i>${esc(c.short)} ${Math.round(c.w * 100)} %</span>`).join('')}</div>`;
}

function table(rows) {
  return `<div class="table-wrap"><table>
    <thead><tr><th class="c-rank">Rang</th><th class="c-name">Lernort</th><th class="num c-note">Note</th><th class="c-lvl">Einstufung</th><th class="c-ko">K.-o.?</th>
      ${CATS.map(c => `<th class="num c-cat" title="${esc(c.name)}"><span class="dot" style="background:${c.color}"></span>${esc(c.short)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr onclick="location.href='bewerten.html?id=${r.p.id}'">
      <td>${r.rank ?? '–'}</td><td class="name">${esc(r.p.name)}</td><td class="num">${chip(r.note)}</td>
      <td>${level(r.note)?.name ?? '–'}</td><td>${r.note === null ? '–' : r.ko ? 'JA' : 'nein'}</td>
      ${r.cats.map(k => `<td class="num">${catNote(k)}</td>`).join('')}</tr>`).join('')}</tbody>
  </table></div>
  <p class="muted small">Kategorie-Spalten: wie gut der Ort in diesem Bereich abschneidet (Note 1–10: 10 = alles 4 Punkte, 1 = alles 0 Punkte).</p>`;
}

render();

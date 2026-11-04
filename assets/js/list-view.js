// Gallery / table overview with filter and sorting (used for songs and albums).
// The page provides #filter, #sort, .seg buttons (list / gallery / table) and #list.
// opts: {
//   getRows() → [{ id, href, rec, title, sub, note, final, rank, bars: [{ key, name, color, v, w }], filter: { key: value },
//                 text, sort: { key: value } }],
//   parts: [{ key, name, color }]   score parts that can be switched off for the ranking (bars use the same keys),
//   filters: [{ key, label, all }]  drop-downs that show only one value (e.g. one artist),
//   sorts: [{ key, label, dir }], columns: [{ key, label, title, color, num, part, cell(row) }],
//   viewKey, empty (html), onDelete(id), afterRender(rows)
// }

function createListView(opts) {
  let sortKey = opts.sorts[0].key, sortDir = opts.sorts[0].dir;
  let view = store.get(opts.viewKey, 'list');

  $('sort').innerHTML = opts.sorts.map(s => `<option value="${s.key}">${esc(s.label)}</option>`).join('');
  $('sort').onchange = () => { sortKey = $('sort').value; sortDir = opts.sorts.find(s => s.key === sortKey).dir; render(); };
  document.querySelectorAll('.seg button').forEach(b => b.onclick = () => { view = b.dataset.view; store.set(opts.viewKey, view); render(); });
  $('filter').addEventListener('input', render);

  // Filter panel: which parts count for the ranking + artist/album choice. Saved per page.
  const filterKey = opts.viewKey + 'Filter';
  let filt = { off: [], ...store.get(filterKey, {}) };
  filt.off = filt.off.filter(k => opts.parts.some(p => p.key === k));
  const activeCount = () => (filt.off.length ? 1 : 0) + opts.filters.filter(f => filt[f.key]).length;
  const setFilt = f => { filt = f; store.set(filterKey, filt); render(); };

  $('sort').insertAdjacentHTML('afterend', '<button type="button" class="filter-btn" id="filterBtn" aria-expanded="false">Filter</button>');
  document.querySelector('.tools').insertAdjacentHTML('afterend', '<div class="filter-panel" id="filterPanel" hidden></div>');
  $('list').insertAdjacentHTML('beforebegin', '<div class="filter-note" id="filterNote" hidden></div>');
  $('filterBtn').onclick = () => {
    $('filterPanel').hidden = !$('filterPanel').hidden;
    $('filterBtn').setAttribute('aria-expanded', !$('filterPanel').hidden);
  };
  $('filterPanel').addEventListener('click', e => {
    const chip = e.target.closest('[data-part]');
    if (chip) {
      const k = chip.dataset.part, off = filt.off.includes(k) ? filt.off.filter(x => x !== k) : [...filt.off, k];
      if (off.length < opts.parts.length) setFilt({ ...filt, off });   // at least one part must count
    }
    if (e.target.closest('[data-reset]')) setFilt({ off: [] });
  });
  $('filterPanel').addEventListener('change', e => { if (e.target.dataset.f) setFilt({ ...filt, [e.target.dataset.f]: e.target.value }); });
  $('filterNote').addEventListener('click', e => { if (e.target.closest('[data-reset]')) setFilt({ off: [] }); });

  function renderFilter(all) {
    const n = activeCount();
    $('filterBtn').textContent = n ? `Filter · ${n}` : 'Filter';
    $('filterBtn').classList.toggle('on', !!n);
    const values = key => [...new Set(all.map(r => r.filter[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    $('filterPanel').innerHTML = `
      <div class="fp-row">
        <div class="fp-label">Was zählt in die Rangliste?</div>
        <div class="fp-chips">${opts.parts.map(p => `
          <button type="button" class="fp-chip ${filt.off.includes(p.key) ? '' : 'on'}" data-part="${esc(p.key)}" style="--c:${p.color}">${esc(p.name)}</button>`).join('')}
        </div>
      </div>
      ${opts.filters.map(f => `
        <label class="fp-row"><span class="fp-label">${esc(f.label)}</span>
          <select data-f="${f.key}"><option value="">${esc(f.all)}</option>${values(f.key).map(v =>
            `<option ${filt[f.key] === v ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>`).join('')}
      ${n ? '<button type="button" class="linkbtn" data-reset>Alle Filter zurücksetzen</button>' : ''}`;
    const parts = [
      filt.off.length ? 'Rangliste ohne ' + opts.parts.filter(p => filt.off.includes(p.key)).map(p => p.name).join(', ') : '',
      ...opts.filters.filter(f => filt[f.key]).map(f => `${f.label}: ${filt[f.key]}`),
    ].filter(Boolean);
    $('filterNote').hidden = !n;
    $('filterNote').innerHTML = n ? `<span>${esc(parts.join(' · '))}</span><button type="button" class="linkbtn" data-reset>zurücksetzen</button>` : '';
  }

  // Score from the parts that still count (weights are scaled up to 100 %), ranks within the shown rows
  function applyFilter(all) {
    let rows = all.filter(r => opts.filters.every(f => !filt[f.key] || r.filter[f.key] === filt[f.key]));
    if (filt.off.length) rows = rows.map(r => {
      let s = 0, w = 0;
      r.bars.forEach(b => { if (!filt.off.includes(b.key) && b.v !== null && b.v !== undefined) { s += b.v * b.w; w += b.w; } });
      const final = w ? s / w : null;
      return { ...r, final, sort: { ...r.sort, final } };
    });
    if (activeCount()) rank(rows);
    return rows;
  }

  function sorted(rows) {
    const q = $('filter').value.toLowerCase();
    return rows
      .filter(r => !q || r.text.toLowerCase().includes(q))
      .sort((a, b) => {
        const x = a.sort[sortKey], y = b.sort[sortKey];
        return (typeof x === 'string' ? x.localeCompare(y || '') : (x ?? -1) - (y ?? -1)) * sortDir;
      });
  }

  function render() {
    const all = opts.getRows();
    $('sort').value = sortKey;
    document.querySelectorAll('.seg button').forEach(b => b.classList.toggle('on', b.dataset.view === view));
    renderFilter(all);
    const shown = applyFilter(all);
    if (!all.length) $('list').innerHTML = `<div class="empty">${opts.empty}</div>`;
    else if (!shown.length) $('list').innerHTML = '<div class="empty">Nichts passt zu diesem Filter.</div>';
    else $('list').innerHTML = ({ list, gallery, table }[view] || list)(sorted(shown));
    if (opts.afterRender) opts.afterRender(all);
  }

  const chip = v => `<span class="chip" style="background:${scoreColor(v)}">${v === null ? '–' : fmt(v)}</span>`;

  // Compact ranking: rank · cover · title · score
  function list(rows) {
    return `<div class="rows">${rows.map(r => `
      <a class="row" href="${esc(r.href)}">
        <span class="row-rank">${r.rank}</span>
        ${coverHtml(r.rec, '')}
        <div class="row-text"><div class="t">${esc(r.title || 'Ohne Titel')}</div><div class="sub">${esc(r.sub)}</div>
          ${r.note ? `<div class="note">${r.note}</div>` : ''}</div>
        ${chip(r.final)}
      </a>`).join('')}</div>`;
  }

  function gallery(rows) {
    return `<div class="gallery">${rows.map(r => `
      <a class="card ${r.rank <= 3 && r.final !== null ? 'top' + r.rank : ''}" href="${esc(r.href)}">
        <div class="cover-wrap">
          ${coverHtml(r.rec, '')}
          ${medalHtml(r.rank)}
          ${chip(r.final)}
        </div>
        <div class="card-body">
          <div class="t" title="${esc(r.title)}">${esc(r.title)}</div>
          <div class="sub">${esc(r.sub)}</div>
          ${r.note ? `<div class="note">${r.note}</div>` : ''}
          <div class="minibars" style="grid-template-columns:repeat(${r.bars.length},1fr)">${r.bars.map(b =>
            `<i class="${filt.off.includes(b.key) ? 'off' : ''}" style="--c:${b.color};height:${(b.v ?? 0) * 10}%" title="${esc(b.name)}: ${b.v === null ? '–' : fmt(b.v)}"></i>`).join('')}</div>
        </div>
      </a>`).join('')}</div>`;
  }

  function table(rows) {
    // cls sets the column width (liste.css): all category columns are equally wide
    const cols = [
      { key: 'final', label: '#', num: true, cls: 'c-rank', cell: r => `<span class="rank">${medal(r.rank)}</span>` },
      { label: '', cls: 'c-cover', cell: r => coverHtml(r.rec, '') },
      { key: 'title', label: opts.titleLabel || 'Titel', cls: 'c-title', cell: r => `<b>${esc(r.title)}</b><div class="sub">${esc(r.sub)}</div>` },
      { key: 'final', label: filt.off.length ? 'Score' : 'Final', title: filt.off.length ? 'Score ohne die abgewählten Bereiche' : '',
        num: true, cls: 'c-final', cell: r => chip(r.final) },
      ...opts.columns.map(c => ({ ...c, cls: (c.color ? 'c-cat' : c.num ? 'c-num' : 'c-text') + (filt.off.includes(c.part) ? ' off' : '') })),
      { label: '', cls: 'c-del', cell: r => `<button class="del" data-del="${esc(r.id)}" title="Löschen">✕</button>` },
    ];
    const head = cols.map(c => {
      const on = c.key && sortKey === c.key && c.label !== '#';
      return `<th class="${c.cls} ${c.num ? 'num' : ''} ${on ? 'sorted' : ''}" ${c.key ? `data-k="${c.key}"` : ''} title="${esc(c.title || '')}" style="--c:${c.color || ''}">` +
        `${c.color ? '<span class="dot"></span>' : ''}${esc(c.label)}${on ? (sortDir < 0 ? ' ↓' : ' ↑') : ''}</th>`;
    }).join('');
    const body = rows.map(r => `<tr data-href="${esc(r.href)}">${cols.map(c =>
      `<td class="${c.cls} ${c.num ? 'num' : ''}" ${c.color ? `style="color:${c.color};font-weight:600"` : ''}>${c.cell(r)}</td>`).join('')}</tr>`).join('');
    return `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
  }

  $('list').addEventListener('click', e => {
    const th = e.target.closest('th[data-k]');
    if (th) {
      const k = th.dataset.k;
      if (sortKey === k) sortDir *= -1;
      else { sortKey = k; sortDir = opts.sorts.find(s => s.key === k)?.dir ?? 1; }
      return render();
    }
    const del = e.target.closest('[data-del]');
    if (del) { opts.onDelete(del.dataset.del); return render(); }
    const tr = e.target.closest('tr[data-href]');
    if (tr) location.href = tr.dataset.href;
  });

  return { render };
}

// Column/sort helpers for score values
const scoreCell = v => v === null || v === undefined ? '–' : fmt(v);

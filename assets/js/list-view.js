// Gallery / table overview with filter and sorting (used for songs and albums).
// The page provides #filter, #sort, .seg buttons (list / gallery / table) and #list.
// opts: {
//   getRows() → [{ id, href, rec, title, sub, note, final, rank, bars: [{ name, color, v }], text, sort: { key: value } }],
//   sorts: [{ key, label, dir }], columns: [{ key, label, title, color, num, cell(row) }],
//   viewKey, empty (html), onDelete(id), afterRender(rows)
// }

function createListView(opts) {
  let sortKey = opts.sorts[0].key, sortDir = opts.sorts[0].dir;
  let view = store.get(opts.viewKey, 'list');

  $('sort').innerHTML = opts.sorts.map(s => `<option value="${s.key}">${esc(s.label)}</option>`).join('');
  $('sort').onchange = () => { sortKey = $('sort').value; sortDir = opts.sorts.find(s => s.key === sortKey).dir; render(); };
  document.querySelectorAll('.seg button').forEach(b => b.onclick = () => { view = b.dataset.view; store.set(opts.viewKey, view); render(); });
  $('filter').addEventListener('input', render);

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
    if (!all.length) $('list').innerHTML = `<div class="empty">${opts.empty}</div>`;
    else $('list').innerHTML = ({ list, gallery, table }[view] || list)(sorted(all));
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
            `<i style="--c:${b.color};height:${(b.v ?? 0) * 10}%" title="${esc(b.name)}: ${b.v === null ? '–' : fmt(b.v)}"></i>`).join('')}</div>
        </div>
      </a>`).join('')}</div>`;
  }

  function table(rows) {
    const cols = [
      { key: 'final', label: '#', num: true, cell: r => `<span class="rank">${medal(r.rank)}</span>` },
      { label: '', cell: r => coverHtml(r.rec, '') },
      { key: 'title', label: opts.titleLabel || 'Titel', cell: r => `<b>${esc(r.title)}</b><div class="sub">${esc(r.sub)}</div>` },
      { key: 'final', label: 'Final', num: true, cell: r => chip(r.final) },
      ...opts.columns,
      { label: '', cell: r => `<button class="del" data-del="${esc(r.id)}" title="Löschen">✕</button>` },
    ];
    const head = cols.map(c => {
      const on = c.key && sortKey === c.key && c.label !== '#';
      return `<th class="${c.num ? 'num' : ''} ${on ? 'sorted' : ''}" ${c.key ? `data-k="${c.key}"` : ''} title="${esc(c.title || '')}" style="--c:${c.color || ''}">` +
        `${c.color ? '<span class="dot"></span>' : ''}${esc(c.label)}${on ? (sortDir < 0 ? ' ↓' : ' ↑') : ''}</th>`;
    }).join('');
    const body = rows.map(r => `<tr data-href="${esc(r.href)}">${cols.map(c =>
      `<td class="${c.num ? 'num' : ''}" ${c.color ? `style="color:${c.color};font-weight:600"` : ''}>${c.cell(r)}</td>`).join('')}</tr>`).join('');
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

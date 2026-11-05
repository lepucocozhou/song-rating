// Settings page: edit categories, questions, weights, colors and album rules.
// Changes are made on a copy and only stored when "Einstellungen speichern" is clicked.

let cfg = clone(CONFIG);
let dirty = false;
const pct = w => Math.round(w * 1000) / 10;

function markDirty() { dirty = true; $('savebar').hidden = false; }

/* ---------- category + question editor ---------- */
const sumOf = arr => pct(arr.reduce((s, x) => s + (+x.w || 0), 0));
const sumText = s => `Summe ${s}\u00a0%${Math.abs(s - 100) < 0.05 ? ' ✓' : ' – wird auf 100 % umgerechnet'}`;
const shortText = s => Math.abs(s - 100) < 0.05 ? '✓' : `${s} %`;
const sumNote = (s, key) => `<span class="sum ${Math.abs(s - 100) < 0.05 ? 'ok' : ''}" data-sum="${key}">${key.endsWith(':short') ? shortText(s) : sumText(s)}</span>`;

// Refresh the "Summe …" labels while typing
function updateSums(kind) {
  document.querySelectorAll(`[data-sum^="${kind}"]`).forEach(el => {
    const [, ci, short] = el.dataset.sum.split(':');
    const s = sumOf(ci === undefined ? cfg[kind] : cfg[kind][+ci].qs);
    el.textContent = short ? shortText(s) : sumText(s);
    el.classList.toggle('ok', Math.abs(s - 100) < 0.05);
  });
}

// Which categories are expanded (by id); the rest show only their header
const openCats = new Set();

// Stacked bar: how much each category counts in the final score
function renderBar(kind) {
  const cats = cfg[kind];
  const total = cats.reduce((s, c) => s + (+c.w || 0), 0) || 1;
  $(kind === 'songs' ? 'songBar' : 'albumBar').innerHTML = `
    <div class="wb-track">${cats.map(c => `<i style="flex:${(+c.w || 0) / total};background:${esc(c.color)}" title="${esc(c.name)}"></i>`).join('')}</div>
    <div class="wb-legend">${cats.map(c => `<span><i style="background:${esc(c.color)}"></i>${esc(c.name)} <b>${Math.round((+c.w || 0) / total * 100)} %</b></span>`).join('')}</div>`;
}

function renderNavInfo() {
  const q = kind => cfg[kind].reduce((n, c) => n + c.qs.length, 0);
  $('navSongs').textContent = `${cfg.songs.length} Kategorien · ${q('songs')} Fragen`;
  $('navAlbums').textContent = `${cfg.albums.length} Kategorien · ${q('albums')} Fragen`;
  $('navData').textContent = `${Songs.all().length} Songs · ${Albums.all().length} Alben`;
}

function renderEditor(kind) {
  const cats = cfg[kind];
  renderBar(kind);
  renderNavInfo();
  $(kind === 'songs' ? 'songEditor' : 'albumEditor').innerHTML = cats.map((c, ci) => `
    <div class="cat-edit ${openCats.has(c.id) ? 'open' : ''}" style="--c:${esc(c.color)}" data-kind="${kind}" data-c="${ci}">
      <div class="cat-head">
        <input type="color" value="${esc(c.color)}" data-f="color" title="Farbe">
        <input class="name" value="${esc(c.name)}" data-f="name" placeholder="Name der Kategorie">
        <span class="pct"><input type="number" min="0" max="100" step="0.5" value="${pct(c.w)}" data-f="w"> %</span>
        <span class="icons">
          <button data-act="up" title="Nach oben" ${ci === 0 ? 'disabled' : ''}>↑</button>
          <button data-act="down" title="Nach unten" ${ci === cats.length - 1 ? 'disabled' : ''}>↓</button>
          <button data-act="delCat" title="Kategorie löschen">✕</button>
        </span>
        <button class="cat-toggle" data-act="toggle" aria-expanded="${openCats.has(c.id)}">
          ${c.qs.length} ${c.qs.length === 1 ? 'Frage' : 'Fragen'} ${sumNote(sumOf(c.qs), kind + ':' + ci + ':short')}<span class="chev">▾</span>
        </button>
      </div>
      <div class="cat-body">
      <div class="qs">${c.qs.map((q, qi) => `
        <div class="q-edit" data-q="${qi}">
          <div class="q-row">
            <span class="no">${qi + 1}</span>
            <input class="qtext" value="${esc(q.q)}" data-f="q" placeholder="Frage">
            <span class="pct"><input type="number" min="0" max="100" step="0.5" value="${pct(q.w)}" data-f="w"> %</span>
            <label class="na"><input type="checkbox" data-f="na" ${q.na ? 'checked' : ''}> ${L('N/A', 'k.A.', '不适用')}</label>
            <button class="icon" data-act="delQ" title="Frage löschen">✕</button>
          </div>
          <input class="think" value="${esc(q.think || '')}" data-f="think" placeholder="Hilfssatz, z. B. „${L('Think', 'Überlege')}: …“">
          <details>
            <summary>Skala 1–10 ${q.scale ? '' : '(Standard-Skala)'}</summary>
            <div class="scale">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `
              <label><b>${n}</b><input value="${esc(q.scale?.[n] || '')}" placeholder="${esc(GENERIC_SCALE[n])}" data-f="scale" data-n="${n}"></label>`).join('')}
            </div>
          </details>
        </div>`).join('')}
      </div>
      <div class="cat-foot">
        <button data-act="addQ">+ Frage</button>
        ${sumNote(sumOf(c.qs), kind + ':' + ci)} <span class="muted">innerhalb der Kategorie</span>
      </div>
      </div>
    </div>`).join('') + `
    <div class="editor-foot">
      <button data-act="addCat" data-kind="${kind}">+ Kategorie</button>
      ${sumNote(sumOf(cats), kind)} <span class="muted">über alle Kategorien</span>
    </div>`;
}

function target(el) {
  const catEl = el.closest('.cat-edit');
  if (!catEl) return {};
  const cat = cfg[catEl.dataset.kind][+catEl.dataset.c];
  const qEl = el.closest('.q-edit');
  return { kind: catEl.dataset.kind, ci: +catEl.dataset.c, cat, qi: qEl ? +qEl.dataset.q : null, q: qEl ? cat.qs[+qEl.dataset.q] : null };
}

// Text/number edits: update the copy without re-rendering (keeps the cursor in place)
document.addEventListener('input', e => {
  const f = e.target.dataset.f;
  if (!f) return;
  const { kind, cat, q } = target(e.target);
  const obj = q || cat;
  if (!obj) return;
  if (f === 'w') obj.w = (parseFloat(e.target.value) || 0) / 100;
  else if (f === 'na') obj.na = e.target.checked;
  else if (f === 'scale') {
    obj.scale = { ...(obj.scale || {}) };
    if (e.target.value.trim()) obj.scale[e.target.dataset.n] = e.target.value; else delete obj.scale[e.target.dataset.n];
    if (!Object.keys(obj.scale).length) delete obj.scale;
  } else obj[f] = e.target.value;
  if (f === 'color') e.target.closest('.cat-edit').style.setProperty('--c', e.target.value);
  if (f === 'w') updateSums(kind);
  if (f === 'w' || f === 'color' || f === 'name') renderBar(kind);
  markDirty();
});

// Structural edits: add / delete / move
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-act]');
  const act = btn && btn.dataset.act;
  if (!act) return;
  if (act === 'toggle') {
    const { kind, cat } = target(btn);
    openCats.has(cat.id) ? openCats.delete(cat.id) : openCats.add(cat.id);
    const el = btn.closest('.cat-edit');
    el.classList.toggle('open', openCats.has(cat.id));
    btn.setAttribute('aria-expanded', openCats.has(cat.id));
    return;
  }
  if (act === 'addCat') {
    const kind = btn.dataset.kind;
    const id = 'c' + newId();
    openCats.add(id);
    cfg[kind].push({ id, name: 'Neue Kategorie', w: 0.1, color: '#38bdf8',
      qs: [{ id: 'q' + newId(), q: 'Neue Frage', w: 1, na: false, think: '' }] });
    renderEditor(kind); markDirty();
    return;
  }
  const { kind, ci, cat, qi, q } = target(btn);
  if (act === 'addQ') cat.qs.push({ id: 'q' + newId(), q: 'Neue Frage', w: 0.1, na: false, think: '' });
  if (act === 'delQ') {
    if (cat.qs.length === 1) return alert('Eine Kategorie braucht mindestens eine Frage – lösche sonst die ganze Kategorie.');
    if (!confirm(`Frage „${q.q}“ löschen?\nBisherige Antworten darauf zählen dann nicht mehr.`)) return;
    cat.qs.splice(qi, 1);
  }
  if (act === 'delCat') {
    if (cfg[kind].length === 1) return alert('Es muss mindestens eine Kategorie geben.');
    if (!confirm(`Kategorie „${cat.name}“ mit ${cat.qs.length} Fragen löschen?`)) return;
    cfg[kind].splice(ci, 1);
  }
  if (act === 'up' || act === 'down') {
    const to = ci + (act === 'up' ? -1 : 1);
    [cfg[kind][ci], cfg[kind][to]] = [cfg[kind][to], cfg[kind][ci]];
  }
  renderEditor(kind); markDirty();
});

/* ---------- album rules ---------- */
const renderSplit = key => {
  const el = document.querySelector(`[data-split="${key}"]`);
  if (el) el.style.width = pct(cfg.albumRules[key]) + '%';
};
document.querySelectorAll('[data-rule]').forEach(inp => {
  inp.value = pct(cfg.albumRules[inp.dataset.rule]);
  renderSplit(inp.dataset.rule);
  inp.addEventListener('input', () => {
    cfg.albumRules[inp.dataset.rule] = Math.min(100, Math.max(0, parseFloat(inp.value) || 0)) / 100;
    renderSplit(inp.dataset.rule);
    markDirty();
  });
});

/* ---------- save / discard / reset ---------- */
$('saveCfg').onclick = () => {
  Config.save(cfg);
  dirty = false;
  $('savebar').hidden = true;
  $('toast').textContent = '';
  flash('Einstellungen gespeichert ✓');
};
$('discard').onclick = () => { dirty = false; location.reload(); };
$('resetCfg').onclick = () => {
  if (!confirm('Alle Kategorien, Fragen, Gewichte und Album-Regeln auf den Standard zurücksetzen?\nDeine Bewertungen bleiben erhalten.')) return;
  Config.reset();
  dirty = false;
  location.reload();
};
window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

function flash(msg) {
  const t = document.createElement('div');
  t.className = 'flash';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

/* ---------- data ---------- */
function renderStats() {
  $('stats').textContent = `${Songs.all().length} Songs und ${Albums.all().length} Alben`;
  renderNavInfo();
  const drafts = [store.get('songRatingDraft', null) && 'ein Song', store.get('albumRatingDraft', null) && 'ein Album'].filter(Boolean);
  $('draftInfo').textContent = drafts.length
    ? `Gerade angefangen: ${drafts.join(' und ')}. Verwerfen, um beim nächsten Mal leer zu starten.`
    : 'Keine angefangenen Bewertungen auf diesem Gerät.';
  $('clearDrafts').disabled = !drafts.length;
}
$('clearDrafts').onclick = () => {
  if (!confirm('Angefangene, noch nicht gespeicherte Bewertungen verwerfen?')) return;
  store.set('songRatingDraft', null);
  store.set('albumRatingDraft', null);
  renderStats();
  flash('Angefangene Bewertungen verworfen');
};
$('clearCache').onclick = () => {
  try {
    Object.keys(localStorage).filter(k => k.startsWith('chartsCache-') || k === 'songRecs')
      .forEach(k => localStorage.removeItem(k));
  } catch (e) {}
  flash('Zwischenspeicher geleert ✓');
};
$('exportExcel').onclick = () => exportExcel($('toast'));
initBackupButtons($('exportBackup'), $('importBackup'), $('importFile'), $('toast'), () => { renderStats(); });

// New data from another device: refresh counts; reload newer settings unless you are editing
window.addEventListener('cloud-updated', e => {
  renderStats();
  if (e.detail.configChanged && !dirty) location.reload();
});

renderEditor('songs');
renderEditor('albums');
renderStats();

/* ---------- sections: one at a time, chosen in the side menu (or via #hash) ---------- */
const SECTIONS = [...document.querySelectorAll('.set-main > section')].map(sec => sec.id);
function showSection() {
  const id = SECTIONS.includes(location.hash.slice(1)) ? location.hash.slice(1) : SECTIONS[0];
  document.querySelectorAll('.set-main > section').forEach(sec => sec.classList.toggle('active', sec.id === id));
  document.querySelectorAll('#setNav a').forEach(a => {
    a.classList.toggle('on', a.dataset.sec === id);
    // Phones: keep the active chip visible in the scrollable row (without scrolling the page)
    const nav = $('setNav');
    if (a.dataset.sec === id && nav.scrollWidth > nav.clientWidth)
      nav.scrollLeft = a.offsetLeft - (nav.clientWidth - a.offsetWidth) / 2;
  });
}
document.querySelectorAll('#setNav a').forEach(a => a.onclick = e => {
  e.preventDefault();
  history.replaceState(null, '', '#' + a.dataset.sec);
  showSection();
  window.scrollTo({ top: 0 });
});
window.addEventListener('hashchange', () => { showSection(); window.scrollTo({ top: 0 }); });
showSection();
// The browser jumps to the #section on load – start at the top instead
window.addEventListener('load', () => setTimeout(() => window.scrollTo({ top: 0 }), 0));

// Lernort bewerten: Schritt 1 = Ort, dann die 6 Kategorien (je Frage 0–4 Punkte oder „trifft nicht zu“), am Ende die Note.
// URL: ?id=… bearbeitet einen gespeicherten Ort · #ergebnis springt direkt zum Ergebnis.
// Alles wird automatisch gespeichert: mit Namen direkt in der Rangliste, vorher als Entwurf (bib.draft).

const params = new URLSearchParams(location.search);
let editing = params.get('id') ? Places.get(params.get('id')) : null;
const draft = params.get('id') ? null : store.get('draft', null);
const start = editing || draft || {};
let answers = { ...(start.answers || {}) };
let photos = [...(start.photos || [])];
let geo = start.geo || null;   // { lat, lon } vom Ortsvorschlag
let pros = [...(start.pros || [])], cons = [...(start.cons || [])];
let dirty = false, saveTimer = null;
let current = 0;

const steps = [{ name: 'Ort', short: 'Ort', color: 'var(--accent-strong)' }, ...CATS, { name: 'Ergebnis', short: 'Ergebnis', color: 'var(--accent-strong)' }];
const resultPage = $('pages').lastElementChild;

/* ---------- Seiten aufbauen ---------- */
steps.forEach((s, si) => {
  const b = document.createElement('button');
  b.className = 'step';
  b.style.setProperty('--c', s.color);
  b.innerHTML = `<span class="full">${esc(s.name)}</span><span class="short">${esc(s.short)}</span><small id="ss${si}"></small>`;
  b.onclick = () => goto(si);
  $('steps').appendChild(b);
});

let qNo = 0;
CATS.forEach((cat, ci) => {
  const page = document.createElement('div');
  page.className = 'page';
  page.style.setProperty('--c', cat.color);
  page.style.setProperty('--cs', cat.color + '24');
  page.innerHTML = `<div class="page-title">
      <div><div class="kicker">Schritt ${ci + 2} von ${steps.length} · Gewicht ${Math.round(cat.w * 100)} %</div><h2>${esc(cat.name)}</h2></div>
      <b id="cs${ci}">–</b></div>` + cat.qs.map(questionHtml).join('');
  $('pages').insertBefore(page, resultPage);
});

function questionHtml(q) {
  return `<div class="q" data-q="${q.id}">
    <div class="q-head">
      <div class="q-title">${++qNo}. ${esc(q.q)}${q.ko ? ' <span class="ko-tag" title="0 Punkte hier → Note höchstens 5,00">K.-o.-Frage</span>' : ''}</div>
      <div class="q-val">–</div>
    </div>
    <div class="pts">${q.opts.map((t, v) => `<button type="button" class="pt" data-v="${v}"><b>${v}</b><span>${esc(t)}</span></button>`).join('')}</div>
    <div class="q-foot"><button type="button" class="na">trifft nicht zu</button></div>
  </div>`;
}

const pages = [...$('pages').querySelectorAll('.page')];
pages.forEach((p, pi) => p.insertAdjacentHTML('beforeend', `
  <div class="nav">
    <button ${pi === 0 ? 'disabled' : ''} data-go="${pi - 1}">← Zurück</button>
    ${pi < steps.length - 1 ? `<button class="primary" data-go="${pi + 1}">Weiter<span class="nav-name">: ${esc(steps[pi + 1].name)}</span> →</button>` : ''}
  </div>`));

$('pages').addEventListener('click', e => {
  const go = e.target.closest('[data-go]');
  if (go) return goto(+go.dataset.go);
  const q = e.target.closest('.q');
  if (!q) return;
  const id = q.dataset.q, pt = e.target.closest('.pt');
  if (pt) setAnswer(id, answers[id] === +pt.dataset.v ? undefined : +pt.dataset.v);
  else if (e.target.closest('.na')) setAnswer(id, answers[id] === '-' ? undefined : '-');
});

function setAnswer(id, v) {
  if (v === undefined) delete answers[id]; else answers[id] = v;
  changed();
  update();
}

/* ---------- Ort-Felder ---------- */
$('name').value = start.name || '';
$('where').value = start.where || '';
$('note').value = start.note || '';
['name', 'where', 'note'].forEach(id => $(id).addEventListener('input', () => { changed(); update(); }));

/* ---------- Ortssuche: Vorschlag wählen → Name, Adresse und Position eintragen ---------- */
function showGeo() {
  $('geoRow').hidden = !geo;
  if (geo) $('mapLink').href = appleMapsUrl($('name').value.trim(), geo);
}
initPlaceSearch($('name'), $('nameSug'), r => {
  $('name').value = r.name;
  $('where').value = r.address;
  $('name').classList.remove('missing');
  geo = { lat: r.lat, lon: r.lon };
  showGeo(); changed(); update();
});
$('geoClear').onclick = () => { geo = null; showGeo(); changed(); };
showGeo();

/* ---------- Top-Vorteile / -Nachteile ---------- */
initPcPicker($('prosPick'), 'pros', () => pros, l => { pros = l; changed(); });
initPcPicker($('consPick'), 'cons', () => cons, l => { cons = l; changed(); });

/* ---------- Fotos ---------- */
function renderPhotos() {
  $('photos').innerHTML = photos.map((src, i) => `<div class="ph${i === 0 ? ' cover' : ''}" style="background-image:url('${src}')">
      ${i === 0 ? '<span class="ph-tag">Titelbild</span>' : `<button type="button" class="ph-main" data-main="${i}">Als Titelbild</button>`}
      <button type="button" class="ph-del" data-del="${i}" aria-label="Foto entfernen" title="Foto entfernen">×</button>
    </div>`).join('') + (photos.length < MAX_PHOTOS ? `<label class="ph add">
      <input type="file" accept="image/*" multiple hidden id="phInput"><span>＋</span><small>Foto hinzufügen</small></label>` : '');
  $('phInput')?.addEventListener('change', addPhotos);
}
async function addPhotos(e) {
  const files = [...e.target.files].slice(0, MAX_PHOTOS - photos.length);
  $('phMsg').textContent = files.length ? 'Fotos werden verkleinert …' : '';
  for (const f of files) {
    try { photos.push(await shrinkPhoto(f)); } catch (err) { $('phMsg').textContent = 'Ein Bild konnte nicht gelesen werden.'; }
  }
  if ($('phMsg').textContent.endsWith('…')) $('phMsg').textContent = '';
  changed();
  renderPhotos(); update();
}
$('photos').addEventListener('click', e => {
  const del = e.target.closest('[data-del]'), main = e.target.closest('[data-main]');
  if (del) photos.splice(+del.dataset.del, 1);
  else if (main) photos.unshift(...photos.splice(+main.dataset.main, 1));
  else return;
  changed();
  renderPhotos(); update();
});
renderPhotos();

/* ---------- Navigation ---------- */
function goto(s) {
  current = Math.max(0, Math.min(steps.length - 1, s));
  pages.forEach((p, i) => p.classList.toggle('active', i === current));
  const btns = [...document.querySelectorAll('.step')];
  btns.forEach((b, i) => b.classList.toggle('active', i === current));
  const b = btns[current], bar = $('steps');
  bar.scrollTo({ left: b.offsetLeft - bar.offsetLeft - (bar.clientWidth - b.offsetWidth) / 2, behavior: 'smooth' });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------- Anzeige aktualisieren ---------- */
function update() {
  const sc = score(answers);
  const name = $('name').value.trim();
  const row = { p: { name: name || '?', photos }, cats: sc.cats };

  document.querySelectorAll('.q').forEach(el => {
    const v = answers[el.dataset.q];
    el.classList.toggle('unset', v === undefined);
    el.classList.toggle('isna', v === '-');
    el.querySelectorAll('.pt').forEach(b => b.classList.toggle('on', +b.dataset.v === v));
    el.querySelector('.na').classList.toggle('on', v === '-');
    el.querySelector('.q-val').textContent = v === undefined ? '–' : v === '-' ? 'k. A.' : `${v} / 4`;
  });

  CATS.forEach((cat, ci) => {
    const open = cat.qs.filter(q => answers[q.id] === undefined).length;
    $('cs' + ci).textContent = pct(sc.cats[ci]);
    note(ci + 1, open ? `${cat.qs.length - open}/${cat.qs.length}` : `✓ ${pct(sc.cats[ci])}`, !open);
  });
  note(0, name ? '✓' : 'Name fehlt', !!name);
  note(steps.length - 1, sc.note === null ? '' : fmt(sc.note), sc.answered === sc.total);

  const l = level(sc.note);
  $('now').textContent = name || 'Neuer Lernort';
  $('sideImg').innerHTML = placeTile(row, 'side-img');
  $('answered').textContent = `${sc.answered} von ${sc.total} Fragen`;
  $('final').textContent = fmt(sc.note);
  $('badge').style.setProperty('--p', sc.note === null ? 0 : (sc.note - 1) / 9 * 100);
  $('finalHint').innerHTML = sc.note === null ? 'Noch keine Punkte' :
    `${l.name}${sc.ko ? ' · <span class="ko-tag">K.-o.</span>' : ''}<br>${sc.answered} von ${sc.total} Fragen beantwortet`;

  $('rcTitle').textContent = name || 'Neuer Lernort';
  $('rcHint').textContent = sc.note === null ? 'Vergib Punkte, dann steht hier die Note.' : `${l.name} · ${sc.answered} von ${sc.total} Fragen`;
  $('rcScore').textContent = fmt(sc.note);
  $('koBox').hidden = !sc.ko;
  $('koBox').innerHTML = sc.ko ? `<b>K.-o.-Regel:</b> „Lautstärke“ oder „Platz bekommen“ hat 0 Punkte, deshalb ist die Note höchstens 5,00 (ohne die Regel wären es ${fmt(Math.round(sc.raw * 100) / 100)}).` : '';
  $('sum').innerHTML = CATS.map((c, ci) => `<div class="sum-card" style="--c:${c.color}">
    <div class="s">${esc(c.name)}</div><div class="n">${pct(sc.cats[ci])}</div>
    <div class="sum-bar"><i style="width:${(sc.cats[ci] ?? 0) * 100}%"></i></div>
    <div class="w">Gewicht ${Math.round(c.w * 100)} %</div></div>`).join('');
}

function note(i, text, done) {
  $('ss' + i).textContent = text;
  $('ss' + i).parentElement.classList.toggle('done', done);
}

/* ---------- Automatisch speichern ---------- */
function changed() {
  dirty = true;
  showSaveState('…');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persist, 400);
}

// Mit Namen: als Lernort speichern (erscheint sofort in der Rangliste). Ohne Namen: als Entwurf merken.
function persist() {
  clearTimeout(saveTimer);
  if (!dirty) return true;
  const name = $('name').value.trim();
  const rec = { name, where: $('where').value.trim(), note: $('note').value.trim(), photos: [...photos], geo, pros: [...pros], cons: [...cons], answers: { ...answers } };
  if (!name) {
    if (!store.set('draft', rec)) return showSaveState('full'), false;
    dirty = false;
    showSaveState('draft');
    return true;
  }
  try { editing = Places.save({ ...(editing || {}), ...rec }); }
  catch (e) { showSaveState('full'); return false; }
  store.set('draft', null);
  dirty = false;
  if (!params.get('id')) { params.set('id', editing.id); history.replaceState(null, '', '?id=' + editing.id + location.hash); }
  $('delete').hidden = false;
  $('share').hidden = false;
  document.title = name + ' – Lernort';
  showSaveState('ok');
  return true;
}

function showSaveState(st) {
  const el = $('autoState');
  el.className = 'auto-state ' + st;
  el.textContent = { '…': 'Speichert …', ok: '✓ Automatisch gespeichert', draft: 'Entwurf gemerkt – gib noch einen Namen ein',
    full: '⚠︎ Nicht gespeichert: Der Speicher ist voll. Entferne ein paar Fotos.' }[st] || '';
}

// Seite wird verlassen oder die App in den Hintergrund geschickt: sofort speichern
addEventListener('pagehide', persist);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') persist(); });

/* ---------- Fertig / Löschen ---------- */
$('save').onclick = () => {
  const name = $('name').value.trim();
  if (!name) { goto(0); $('name').focus(); $('name').classList.add('missing'); return; }
  dirty = true;
  if (!persist()) return alert('Der Speicher in diesem Browser ist voll. Entferne ein paar Fotos (hier oder bei anderen Lernorten) und tippe dann noch einmal auf „Fertig“.');
  location.href = 'orte.html#' + editing.id;
};
$('name').addEventListener('input', () => $('name').classList.remove('missing'));

$('delete').onclick = () => {
  if (!editing || !confirm(`„${editing.name}“ wirklich löschen?`)) return;
  clearTimeout(saveTimer); dirty = false;
  Places.remove(editing.id);
  location.href = 'orte.html';
};
$('newPlace').onclick = () => {
  persist();
  store.set('draft', null);
  location.href = 'bewerten.html';
};

$('share').onclick = () => { persist(); sharePlace(editing.id); };

if (editing) { $('share').hidden = false; $('delete').hidden = false; document.title = editing.name + ' – Lernort'; showSaveState('ok'); }
else if (draft) showSaveState('draft');
update();
goto(location.hash === '#ergebnis' ? steps.length - 1 : 0);

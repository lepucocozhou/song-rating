// Lernort bewerten: Schritt 1 = Ort, dann die 6 Kategorien (je Frage 0–4 Punkte oder „trifft nicht zu“), am Ende die Note.
// URL: ?id=… bearbeitet einen gespeicherten Ort · #ergebnis springt direkt zum Ergebnis.

const params = new URLSearchParams(location.search);
let editing = params.get('id') ? Places.get(params.get('id')) : null;
let answers = editing ? { ...editing.answers } : {};
let dirty = false;
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
  dirty = true;
  update();
}

/* ---------- Ort-Felder ---------- */
$('name').value = editing?.name || '';
$('where').value = editing?.where || '';
$('note').value = editing?.note || '';
['name', 'where', 'note'].forEach(id => $(id).addEventListener('input', () => { dirty = true; update(); }));

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
  const row = { p: { name: name || '?' }, cats: sc.cats };

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

/* ---------- Speichern / Löschen ---------- */
$('save').onclick = () => {
  const name = $('name').value.trim();
  if (!name) { goto(0); $('name').focus(); $('name').classList.add('missing'); return; }
  editing = Places.save({ ...(editing || {}), name, where: $('where').value.trim(), note: $('note').value.trim(), answers: { ...answers } });
  dirty = false;
  history.replaceState(null, '', '?id=' + editing.id);
  $('delete').hidden = false;
  $('save').textContent = 'Änderungen speichern';
  const r = rankedPlaces().find(x => x.p.id === editing.id);
  $('toast').innerHTML = `Gespeichert ✓ ${r.rank ? `– Platz ${r.rank} · ` : ''}<a href="orte.html">zur Rangliste</a>`;
};
$('name').addEventListener('input', () => $('name').classList.remove('missing'));

$('delete').onclick = () => {
  if (!editing || !confirm(`„${editing.name}“ wirklich löschen?`)) return;
  Places.remove(editing.id);
  dirty = false;
  location.href = 'orte.html';
};
$('newPlace').onclick = () => {
  if (dirty && !confirm('Ungespeicherte Änderungen verwerfen?')) return;
  dirty = false;
  location.href = 'bewerten.html';
};
addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

if (editing) { $('delete').hidden = false; $('save').textContent = 'Änderungen speichern'; document.title = editing.name + ' – Lernort'; }
update();
goto(location.hash === '#ergebnis' ? steps.length - 1 : 0);

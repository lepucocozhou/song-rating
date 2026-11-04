// Step-by-step questionnaire with sliders, used for songs and albums.
// The page provides #steps, #pages, #catsMini and its own first/last pages (.page elements in #pages).
// opts: { cats, before: [{ name, color }], after: [{ name, color }], onChange() }

function createQuestionnaire({ cats, before = [], after = [], onChange }) {
  const steps = [...before, ...cats, ...after];
  const ownPages = [...$('pages').querySelectorAll('.page')]; // before pages, then after pages
  const anchor = ownPages[before.length] || null;
  let answers = {};
  let current = 0;
  let qNo = 0;

  steps.forEach((s, si) => {
    const b = document.createElement('button');
    b.className = 'step';
    b.style.setProperty('--c', s.color);
    b.innerHTML = `<span class="full">${esc(s.name)}</span><span class="short">${esc(s.name.split(' ')[0])}</span><small id="ss${si}"></small>`;
    b.onclick = () => goto(si);
    $('steps').appendChild(b);
  });

  cats.forEach((cat, ci) => {
    $('catsMini').insertAdjacentHTML('beforeend', `
      <div class="cat-mini" style="--c:${cat.color}">
        <div class="row"><span>${esc(cat.name)}</span><b id="cm${ci}">–</b></div>
        <div class="bar"><i id="cb${ci}"></i></div>
      </div>`);
    const page = document.createElement('div');
    page.className = 'page';
    page.style.setProperty('--c', cat.color);
    page.style.setProperty('--cs', cat.color + '22');
    page.innerHTML = `<div class="page-title">
      <div><div class="kicker">Schritt ${before.length + ci + 1} von ${steps.length} · Gewicht ${Math.round(cat.w * 100)} %</div><h2>${esc(cat.name)}</h2></div>
      <b id="cs${ci}">–</b></div>`;
    cat.qs.forEach(q => page.appendChild(questionEl(q)));
    $('pages').insertBefore(page, anchor);
  });

  function questionEl(q) {
    const el = document.createElement('div');
    el.className = 'q unset';
    el.dataset.q = q.id;
    el.innerHTML = `
      <div class="q-head">
        <div><div class="q-title">${L('Q', 'F')}${++qNo}. ${esc(q.q)}</div><div class="q-think">${esc(q.think || '')}</div></div>
        <div class="q-val">–</div>
      </div>
      <input type="range" min="1" max="10" step="0.5" value="5.5" aria-label="${L('Q', 'F')}${qNo}">
      <div class="ticks">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n =>
        `<span style="left:calc(13px + (100% - 26px) * ${(n - 1) / 9})">${n}</span>`).join('')}</div>
      <div class="desc"></div>
      <div class="q-opts">
        ${q.na ? `<button class="opt na">${L('N/A', 'k.A.')}</button>` : ''}
        <button class="opt skip" title="Frage auslassen – zählt nicht in den Score">Weiß nicht</button>
      </div>`;
    const range = el.querySelector('input[type=range]');
    const set = v => { answers[q.id] = v; onChange(); };
    // Tapping the track counts as an answer even if the value does not change
    range.addEventListener('change', () => { if (answers[q.id] === undefined) set(+range.value); });
    range.addEventListener('input', () => set(+range.value));
    el.querySelector('.skip').onclick = () => set(answers[q.id] === 'skip' ? +range.value : 'skip');
    if (q.na) el.querySelector('.na').onclick = () => set(answers[q.id] === 'N/A' ? +range.value : 'N/A');
    return el;
  }

  const pages = [...$('pages').querySelectorAll('.page')];
  pages.forEach((p, pi) => p.insertAdjacentHTML('beforeend', `
    <div class="nav">
      <button ${pi === 0 ? 'disabled' : ''} data-go="${pi - 1}">← Zurück</button>
      ${pi < steps.length - 1 ? `<button class="primary" data-go="${pi + 1}">Weiter<span class="nav-name">: ${esc(steps[pi + 1].name)}</span> →</button>` : ''}
    </div>`));
  $('pages').addEventListener('click', e => { const g = e.target.closest('[data-go]'); if (g) goto(+g.dataset.go); });

  function goto(s) {
    current = Math.max(0, Math.min(steps.length - 1, s));
    pages.forEach((p, i) => p.classList.toggle('active', i === current));
    const btns = document.querySelectorAll('.step');
    btns.forEach((b, i) => b.classList.toggle('active', i === current));
    // Keep the active step visible in the (scrollable) step bar
    const b = btns[current], bar = $('steps');
    bar.scrollTo({ left: b.offsetLeft - bar.offsetLeft - (bar.clientWidth - b.offsetWidth) / 2, behavior: 'smooth' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Updates questions, category scores and step labels; returns scores()
  function render() {
    const sc = scores(answers, cats);
    cats.forEach((cat, ci) => {
      let open = 0;
      cat.qs.forEach(q => {
        const v = answers[q.id], el = $('pages').querySelector(`.q[data-q="${q.id}"]`);
        if (v === undefined) open++;
        el.classList.toggle('unset', v === undefined);
        el.classList.toggle('isna', v === 'N/A');
        el.classList.toggle('isskip', v === 'skip');
        el.querySelector('.skip').classList.toggle('on', v === 'skip');
        if (q.na) el.querySelector('.na').classList.toggle('on', v === 'N/A');
        el.querySelector('.q-val').textContent = v === undefined ? '–' : v === 'skip' ? 'ausgelassen' : v === 'N/A' ? L('N/A', 'k.A.') : v;
        const range = el.querySelector('input[type=range]');
        range.style.setProperty('--fill', typeof v === 'number' ? (v - 1) / 9 * 100 + '%' : '0%');
        el.querySelector('.desc').innerHTML =
          v === undefined ? 'Noch nicht bewertet – Regler bewegen oder „Weiß nicht“ wählen.' :
          v === 'N/A' ? 'Nicht zutreffend – das Gewicht geht an die anderen Fragen dieser Kategorie.' :
          v === 'skip' ? 'Ausgelassen – zählt nicht mit, das Gewicht geht an die anderen Fragen dieser Kategorie.' :
          describe(q, v);
      });
      const c = sc.cats[ci], txt = c === null ? '–' : fmt(c);
      $('cm' + ci).textContent = $('cs' + ci).textContent = txt;
      $('cb' + ci).style.width = c === null ? '0' : (c * 10) + '%';
      stepNote(before.length + ci, open ? `${cat.qs.length - open}/${cat.qs.length}` : `✓ ${txt}`, !open);
    });
    return sc;
  }

  function stepNote(i, text, done) {
    $('ss' + i).textContent = text;
    $('ss' + i).parentElement.classList.toggle('done', !!done);
  }

  function setAnswers(a) {
    answers = { ...(a || {}) };
    $('pages').querySelectorAll('.q').forEach(el => {
      const v = answers[el.dataset.q];
      el.querySelector('input[type=range]').value = typeof v === 'number' ? v : 5.5;
    });
  }

  return {
    get answers() { return answers; },
    setAnswers, goto, render, stepNote,
    lastStep: steps.length - 1,
  };
}

// Dark score card on the result page: same title, score and hint as the sidebar
function fillResultCard() {
  $('rcTitle').textContent = $('now').textContent;
  $('rcHint').textContent = $('finalHint').textContent;
  $('rcScore').textContent = $('final').textContent;
}

// Search-as-you-type box with suggestions (used for songs and albums).
// opts: { search(term) → Promise<items>, title(item), sub(item), onPick(item) }

function initSearchBox(input, list, opts) {
  let results = [], hl = -1, timer = null, lastTerm = '';

  function show(html) { list.innerHTML = html; list.hidden = !html; }

  function renderResults() {
    if (!results.length) return show('<div class="sug-msg">Nichts gefunden – du kannst die Details unten auch selbst eintragen.</div>');
    show(results.map((r, i) => `
      <div class="sug ${i === hl ? 'hl' : ''}" data-i="${i}">
        <img src="${esc(Itunes.artwork(r.artwork, 100))}" alt="">
        <div><div class="t">${esc(opts.title(r))}</div><div class="sub">${esc(opts.sub(r))}</div></div>
      </div>`).join(''));
  }

  async function run(term) {
    lastTerm = term;
    show('<div class="sug-msg">Suche …</div>');
    try {
      const found = await opts.search(term);
      if (term !== lastTerm) return; // a newer search is already running
      results = found; hl = -1;
      renderResults();
    } catch (e) {
      if (term === lastTerm) show('<div class="sug-msg">Suche nicht erreichbar – bist du online?</div>');
    }
  }

  function pick(i) {
    if (!results[i]) return;
    opts.onPick(results[i]);
    input.value = '';
    show('');
    input.blur(); // closes the keyboard on phones
  }

  input.addEventListener('input', () => {
    clearTimeout(timer);
    const term = input.value.trim();
    if (term.length < 2) { lastTerm = ''; return show(''); }
    timer = setTimeout(() => run(term), 300);
  });
  input.addEventListener('keydown', e => {
    if (list.hidden || !results.length) return;
    if (e.key === 'ArrowDown') hl = Math.min(results.length - 1, hl + 1);
    else if (e.key === 'ArrowUp') hl = Math.max(0, hl - 1);
    else if (e.key === 'Enter') return pick(Math.max(hl, 0));
    else if (e.key === 'Escape') return show('');
    else return;
    e.preventDefault();
    renderResults();
  });
  list.addEventListener('click', e => {
    const s = e.target.closest('[data-i]');
    if (s) pick(+s.dataset.i);
  });
  // Keep the suggestions open when the phone keyboard closes; hide them only on a tap outside the search box
  document.addEventListener('pointerdown', e => { if (!input.parentElement.contains(e.target)) show(''); });
  input.addEventListener('focus', () => {
    if (input.value.trim().length >= 2 && results.length) renderResults();
    // On phones, move the search box up so the suggestions are not hidden behind the keyboard
    if (window.innerWidth < 700) setTimeout(() => input.scrollIntoView({ block: 'start', behavior: 'smooth' }), 300);
  });
}

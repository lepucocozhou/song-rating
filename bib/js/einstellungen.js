// Einstellungen: Hell/Dunkel, Gewichte der Kategorien, Sicherung (JSON), alles löschen.

/* Aussehen */
function showTheme() { document.querySelectorAll('#theme button').forEach(b => b.classList.toggle('on', b.dataset.t === bibGetTheme())); }
$('theme').addEventListener('click', e => {
  const b = e.target.closest('[data-t]');
  if (!b) return;
  try { localStorage.setItem('bib.theme', JSON.stringify(b.dataset.t)); } catch (err) {}
  bibApplyTheme(b.dataset.t);
  showTheme();
});
showTheme();

/* Gewichte */
$('weights').innerHTML = CATS.map(c => `<label class="w-row" style="--c:${c.color}">
  <span><b>${esc(c.name)}</b><small>${esc(c.desc)}</small></span>
  <span class="w-in"><input type="number" min="0" max="100" step="1" inputmode="numeric" data-id="${c.id}" value="${Math.round(c.w * 100)}"> %</span>
</label>`).join('');
const inputs = [...document.querySelectorAll('#weights input')];
function showSum() {
  const s = inputs.reduce((n, i) => n + (parseFloat(i.value) || 0), 0);
  $('wsum').textContent = `Summe ${s} %` + (s === 100 ? ' ✓' : ' – wird auf 100 % umgerechnet');
  $('wsum').classList.toggle('ok', s === 100);
}
inputs.forEach(i => i.addEventListener('input', showSum));
showSum();
$('saveW').onclick = () => {
  const w = {};
  inputs.forEach(i => { w[i.dataset.id] = Math.max(0, parseFloat(i.value) || 0) / 100; });
  if (!Object.values(w).some(v => v > 0)) return alert('Mindestens eine Kategorie braucht ein Gewicht über 0 %.');
  Weights.save(w);
  $('wToast').textContent = 'Gespeichert ✓';
};
$('resetW').onclick = () => {
  Weights.reset();
  inputs.forEach(i => { i.value = Math.round(DEFAULT_CATS.find(c => c.id === i.dataset.id).w * 100); });
  showSum();
  $('wToast').textContent = 'Standard wiederhergestellt ✓';
};

/* Sicherung */
$('export').onclick = () => {
  const data = { app: 'lernorte', version: 1, exportedAt: new Date().toISOString(), weights: Weights.get(), places: Places.all() };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  a.download = `lernorte-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
$('import').onchange = async e => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (data.app !== 'lernorte' || !Array.isArray(data.places)) throw new Error();
    // Zusammenführen: gleiche id → die neuere Bewertung gewinnt
    const map = new Map(Places.all().map(p => [p.id, p]));
    data.places.forEach(p => { const old = map.get(p.id); if (!old || (p.updatedAt || '') > (old.updatedAt || '')) map.set(p.id, p); });
    Places.setAll([...map.values()]);
    if (data.weights && Object.keys(data.weights).length) Weights.save(data.weights);
    $('bToast').textContent = `${data.places.length} Lernorte geladen ✓`;
    setTimeout(() => location.reload(), 900);
  } catch (err) {
    alert('Das ist keine gültige Lernorte-Sicherung.');
  }
  e.target.value = '';
};

/* Alles löschen */
$('wipe').onclick = () => {
  const n = Places.all().length;
  if (!n) return alert('Es sind keine Lernorte gespeichert.');
  if (!confirm(`Wirklich alle ${n} Lernorte löschen? Das kann nicht rückgängig gemacht werden.`)) return;
  Places.setAll([]);
  location.href = 'index.html';
};

// Startseite: Kennzahlen, Top 3 und Kategorien-Vergleich – oder eine kurze Einführung, solange noch nichts bewertet ist.

const rows = rankedPlaces().filter(r => r.note !== null);

if (!rows.length) renderIntro(); else renderMine();

function renderIntro() {
  $('mine').innerHTML = `
    <section class="block">
      <div class="block-head"><div><h2>So funktioniert’s</h2><span>Dauert etwa 3 Minuten pro Ort</span></div></div>
      <div class="how">
        <div class="how-step"><b>1</b><h3>Ort eintragen</h3><p>Name und, wenn du magst, wo er ist.</p></div>
        <div class="how-step"><b>2</b><h3>20 Fragen, 0–4 Punkte</h3><p>Zu jeder Punktzahl steht eine Beschreibung. Passt eine Frage nicht, wähl „trifft nicht zu“.</p></div>
        <div class="how-step"><b>3</b><h3>Note 1–10</h3><p>Wird automatisch berechnet, alle Orte landen in deiner Rangliste.</p></div>
      </div>
      <div class="intro-actions">
        <a class="btn primary" href="bewerten.html">Ersten Lernort bewerten</a>
        <button id="example">Beispiel ansehen (Stadtbibliothek)</button>
      </div>
    </section>`;
  $('example').onclick = () => {
    const p = Places.save({ ...EXAMPLE_PLACE, answers: { ...EXAMPLE_PLACE.answers } });
    location.href = 'bewerten.html?id=' + p.id + '#ergebnis';
  };
}

function renderMine() {
  const avg = rows.reduce((s, r) => s + r.note, 0) / rows.length;
  const tops = rows.filter(r => r.note >= 8.5).length;
  const best = rows[0];
  $('summary').textContent = rows.length === 1
    ? `Du hast einen Lernort bewertet: ${best.p.name}.`
    : `${rows.length} Lernorte bewertet. Dein Favorit: ${best.p.name}.`;

  $('mine').innerHTML = `
    <div class="tiles">
      ${tile('Bewertete Orte', rows.length, Places.all().length > rows.length ? 'plus unfertige' : '')}
      ${tile('Ø Note', fmt(avg), level(avg).name)}
      ${tile('Top-Lernorte', tops, 'Note ab 8,50')}
      ${tile('Dein Favorit', esc(best.p.name), fmt(best.note), 'name')}
    </div>

    <section class="block">
      <div class="block-head"><div><h2>Deine Top ${Math.min(3, rows.length)}</h2><span>Die besten Orte zum Lernen</span></div><a href="orte.html">Ganze Rangliste →</a></div>
      <div class="podium">${rows.slice(0, 3).map(podium).join('')}</div>
    </section>

    <section class="block">
      <div class="block-head"><div><h2>Stärken im Vergleich</h2><span>Wie gut jeder Ort pro Kategorie abschneidet (100 % = überall 4 Punkte)</span></div></div>
      <div class="compare">${CATS.map((c, ci) => compareCard(c, ci)).join('')}</div>
    </section>`;
}

function tile(label, value, sub, cls = '') {
  return `<div class="tile ${cls}"><div class="tile-label">${label}</div><div class="tile-value">${value}</div><div class="tile-sub">${sub}</div></div>`;
}

function podium(r) {
  const l = level(r.note);
  return `<a class="pod" href="bewerten.html?id=${r.p.id}">
    <div class="pod-top">${placeTile(r, 'pod-img')}<span class="medal m${r.rank}">${r.rank}</span></div>
    <div class="pod-info">
      <div class="pod-text"><div class="pod-t">${esc(r.p.name)}</div><div class="pod-sub">${esc(r.p.where || l.name)}</div></div>
      ${chip(r.note)}
    </div>
    <div class="minibars">${r.cats.map((k, i) => `<i style="--c:${CATS[i].color};height:${k === null ? 0 : Math.max(4, k * 100)}%" title="${esc(CATS[i].name)}: ${pct(k)}"></i>`).join('')}</div>
  </a>`;
}

// Pro Kategorie: die Orte als Balken, bester oben
function compareCard(c, ci) {
  const list = rows.filter(r => r.cats[ci] !== null).sort((a, b) => b.cats[ci] - a.cats[ci]).slice(0, 5);
  return `<div class="cmp-card" style="--c:${c.color}">
    <h3>${esc(c.name)}</h3><div class="cmp-sub">Gewicht ${Math.round(c.w * 100)} %</div>
    ${list.length ? list.map(r => `
      <div class="hbar"><div class="hbar-label"><span>${esc(r.p.name)}</span><b>${pct(r.cats[ci])}</b></div>
      <div class="hbar-track"><i style="width:${r.cats[ci] * 100}%"></i></div></div>`).join('') : '<p class="muted">Noch keine Antworten.</p>'}
  </div>`;
}

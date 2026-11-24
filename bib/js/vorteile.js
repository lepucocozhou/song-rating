// Top-Vorteile und Top-Nachteile eines Lernorts: je bis zu 3 zum Antippen (oder selbst schreiben).
// Gespeichert als place.pros / place.cons (Liste von Texten, wichtigster zuerst). Erscheinen auch im Teilen-Bild.

const MAX_PC = 3;
const PROS = ['Sehr ruhig', 'Immer ein Platz frei', 'Viele Steckdosen', 'Schnelles WLAN', 'Lange geöffnet', 'Bequeme Stühle',
  'Große Tische', 'Viel Tageslicht', 'Angenehme Temperatur', 'Schöne Atmosphäre', 'Motivierend', 'Kostenlos',
  'Gut erreichbar', 'Essen & Trinken erlaubt', 'Guter Kaffee', 'Gruppenräume', 'Saubere Toiletten', 'Ich schaffe viel'];
const CONS = ['Laut', 'Oft voll', 'Wenige Steckdosen', 'Schlechtes WLAN', 'Kurze Öffnungszeiten', 'Unbequeme Stühle',
  'Kleine Tische', 'Zu dunkel', 'Zu warm', 'Zu kalt', 'Schlechte Luft', 'Viel Ablenkung', 'Teuer', 'Weiter Weg',
  'Kein Essen erlaubt', 'Toiletten schlecht', 'Ausweis / Anmeldung nötig', 'Ich schaffe wenig'];

// box: Element · kind: 'pros' | 'cons' · get(): aktuelle Liste · set(list): neue Liste
function initPcPicker(box, kind, get, set) {
  const options = kind === 'pros' ? PROS : CONS;
  const own = kind === 'pros' ? 'Eigener Vorteil …' : 'Eigener Nachteil …';

  function render(msg = '') {
    const sel = get();
    const all = [...options, ...sel.filter(s => !options.includes(s))];   // selbst geschriebene hinten dran
    box.innerHTML = `<div class="pc-chips">${all.map(t => {
        const i = sel.indexOf(t);
        return `<button type="button" class="pc-chip ${kind}${i >= 0 ? ' on' : ''}${i < 0 && sel.length >= MAX_PC ? ' full' : ''}" data-t="${esc(t)}">
          ${i >= 0 ? `<b>${i + 1}</b>` : ''}${esc(t)}</button>`;
      }).join('')}</div>
      <form class="pc-own"><input maxlength="50" placeholder="${own}" enterkeyhint="done"><button type="submit">Hinzufügen</button></form>
      <div class="pc-msg">${esc(msg)}</div>`;
    box.querySelector('form').onsubmit = e => {
      e.preventDefault();
      const t = e.target.querySelector('input').value.trim().replace(/\s+/g, ' ');
      if (!t) return;
      toggle(t, true);
    };
  }

  function toggle(t, add) {
    const sel = get();
    if (sel.includes(t)) { if (!add) set(sel.filter(s => s !== t)); return render(); }
    if (sel.length >= MAX_PC) return render(`Höchstens ${MAX_PC} – tippe erst einen ausgewählten an, um ihn zu entfernen.`);
    set([...sel, t]);
    render();
  }

  box.addEventListener('click', e => { const c = e.target.closest('.pc-chip'); if (c) toggle(c.dataset.t, false); });
  render();
  return render;
}

// Ortssuche beim Tippen des Namens: Vorschläge mit Adresse von Photon (kostenlos, Daten von OpenStreetMap).
// Orte in deiner Nähe kommen zuerst – dafür fragt der Browser einmal nach deinem Standort (freiwillig).
// initPlaceSearch(input, list, onPick) · onPick({ name, address, lat, lon })

const PHOTON = 'https://photon.komoot.io/api/';
const PLACE_ICONS = { library: '📚', university: '🎓', college: '🎓', school: '🏫', cafe: '☕', restaurant: '🍽️', fast_food: '🍽️',
  coworking_space: '💻', community_centre: '🏛️', arts_centre: '🏛️', bookshop: '📖', books: '📖', park: '🌳', bakery: '🥐' };

/* ---------- eigener Standort (für „in der Nähe“) ---------- */
function biasLocation() {
  const loc = store.get('loc', null);
  if (loc) return loc;
  // sonst: der zuletzt verknüpfte Lernort
  const withGeo = Places.all().filter(p => p.geo).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  return withGeo[0] ? withGeo[0].geo : null;
}
function askLocation() {
  return new Promise(resolve => {
    const loc = store.get('loc', null);
    if (loc && Date.now() - loc.at < 3 * 864e5) return resolve(null);   // reicht noch (3 Tage)
    if (!navigator.geolocation || store.get('locDenied', false)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      pos => { const l = { lat: pos.coords.latitude, lon: pos.coords.longitude, at: Date.now() }; store.set('loc', l); resolve(l); },
      err => { if (err.code === 1) store.set('locDenied', true); resolve(null); },
      { maximumAge: 6e5, timeout: 8000 });
  });
}
function distanceKm(a, b) {
  const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}
const fmtKm = km => km < 1 ? Math.round(km * 1000 / 10) * 10 + ' m' : (km < 10 ? km.toFixed(1).replace('.', ',') : Math.round(km)) + ' km';

/* ---------- Suche ---------- */
async function searchPlaces(term) {
  const loc = biasLocation();
  const url = new URL(PHOTON);
  url.search = new URLSearchParams({ q: term, limit: 8, lang: 'de', ...(loc ? { lat: loc.lat, lon: loc.lon, zoom: 12, location_bias_scale: 0.3 } : {}) });
  const res = await fetch(url);
  if (!res.ok) throw new Error('Suche nicht erreichbar');
  const seen = new Set();
  return (await res.json()).features.map(f => {
    const p = f.properties, [lon, lat] = f.geometry.coordinates;
    const street = [p.street, p.housenumber].filter(Boolean).join(' ');
    const town = [p.postcode, p.city || p.town || p.village || p.county].filter(Boolean).join(' ');
    return {
      name: p.name || street || town, address: [street, town].filter(Boolean).join(', ') || p.country || '',
      kind: p.osm_value, lat, lon, km: loc ? distanceKm(loc, { lat, lon }) : null,
    };
  }).filter(r => { const k = r.name + '|' + r.address; if (!r.name || seen.has(k)) return false; seen.add(k); return true; });
}

/* ---------- Vorschlagsliste ---------- */
function initPlaceSearch(input, list, onPick) {
  let results = [], hl = -1, timer = null, lastTerm = '', locAsked = false;
  const show = html => { list.innerHTML = html; list.hidden = !html; };

  function render() {
    if (!results.length) return show('<div class="sug-msg">Nichts gefunden – du kannst den Namen einfach selbst eintragen.</div>');
    show(results.map((r, i) => `<div class="sug ${i === hl ? 'hl' : ''}" data-i="${i}">
        <span class="sug-ic">${PLACE_ICONS[r.kind] || '📍'}</span>
        <div class="sug-txt"><div class="t">${esc(r.name)}</div><div class="sub">${esc(r.address)}</div></div>
        ${r.km !== null ? `<span class="sug-km">${fmtKm(r.km)}</span>` : ''}
      </div>`).join('') + '<div class="sug-foot">Orte von OpenStreetMap · tippe auf einen Vorschlag, dann wird auch die Adresse eingetragen</div>');
  }

  async function run(term) {
    lastTerm = term;
    if (!results.length) show('<div class="sug-msg">Suche …</div>');
    try {
      const found = await searchPlaces(term);
      if (term !== lastTerm || document.activeElement !== input) return;
      results = found; hl = -1;
      render();
    } catch (e) {
      if (term === lastTerm) show('<div class="sug-msg">Ortssuche gerade nicht erreichbar – trag den Namen einfach selbst ein.</div>');
    }
  }

  function pick(i) {
    const r = results[i];
    if (!r) return;
    show('');
    results = [];
    onPick(r);
    input.blur();
  }

  input.addEventListener('input', () => {
    clearTimeout(timer);
    const term = input.value.trim();
    if (term.length < 3) { lastTerm = ''; results = []; return show(''); }
    // Beim ersten Suchen einmal nach dem Standort fragen; kommt er, wird neu gesucht (Orte in der Nähe zuerst)
    if (!locAsked) { locAsked = true; askLocation().then(l => { if (l && lastTerm) run(lastTerm); }); }
    timer = setTimeout(() => run(term), 350);
  });
  input.addEventListener('keydown', e => {
    if (list.hidden || !results.length) return;
    if (e.key === 'ArrowDown') hl = Math.min(results.length - 1, hl + 1);
    else if (e.key === 'ArrowUp') hl = Math.max(0, hl - 1);
    else if (e.key === 'Enter') { if (hl < 0) return show(''); return pick(hl); }
    else if (e.key === 'Escape') return show('');
    else return;
    e.preventDefault();
    render();
  });
  list.addEventListener('click', e => { const s = e.target.closest('[data-i]'); if (s) pick(+s.dataset.i); });
  document.addEventListener('pointerdown', e => { if (!input.parentElement.contains(e.target) && !list.contains(e.target)) show(''); });
  input.addEventListener('focus', () => {
    if (results.length && input.value.trim().length >= 3) render();
    // Handy: Feld nach oben schieben, damit die Vorschläge nicht hinter der Tastatur verschwinden
    if (window.innerWidth < 700) setTimeout(() => input.scrollIntoView({ block: 'start', behavior: 'smooth' }), 300);
  });
}

// Link, der den Ort in Apple Karten öffnet (auf dem iPhone die Karten-App, sonst die Karten-Website)
const appleMapsUrl = (name, geo) => `https://maps.apple.com/?q=${encodeURIComponent(name || 'Lernort')}&ll=${geo.lat},${geo.lon}`;

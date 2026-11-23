// Lernorte im Song-Rating-Konto speichern – kein eigenes Konto nötig.
// Die Anmeldung ist dieselbe wie in Song Rating (gleiche Website, deshalb teilen sich beide Seiten die Sitzung).
// Die Lernorte liegen in derselben Zeile wie die Songs, in der Spalte „albums“ mit kind: 'lernort'
// (die Gewichte als ein Eintrag mit kind: 'lernort-weights'); die Song-Seite reicht diese Einträge unverändert weiter.
// Der Browser-Speicher bleibt die Arbeitskopie; pro Ort gewinnt die neuere Änderung (updatedAt).

const BibCloud = (() => {
  if (!window.supabase || typeof CLOUD_URL === 'undefined') return null;
  const sb = supabase.createClient(CLOUD_URL, CLOUD_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, lock: (name, timeout, fn) => fn() },
  });
  const TIMEOUT = 20000;
  const withTimeout = p => Promise.race([p, new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Zeitüberschreitung – der Server hat nicht geantwortet')), TIMEOUT))]);
  const listeners = [];
  let user = null, status = 'idle', running = null, again = false, timer = null;

  const PLACE = 'lernort', WEIGHTS = 'lernort-weights', WEIGHTS_ID = 'lernort-weights';
  const isBib = r => typeof r.kind === 'string' && r.kind.startsWith('lernort');
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  function setStatus(s) { status = s; listeners.forEach(fn => fn()); }

  function mergePlaces(local, remote) {
    const byId = new Map();
    [...local, ...remote].forEach(r => {
      const cur = byId.get(r.id);
      if (!cur || (r.updatedAt || '') > (cur.updatedAt || '')) byId.set(r.id, r);
    });
    return [...byId.values()];
  }

  async function syncOnce() {
    setStatus('syncing');
    const { data: row, error } = await sb.from('user_data').select('albums').eq('user_id', user.id).maybeSingle();
    if (error) throw error;
    const remoteAll = row?.albums || [];
    const remoteBib = remoteAll.filter(isBib);
    const remotePlaces = remoteBib.filter(r => r.kind === PLACE).map(({ kind, ...r }) => r);
    const remoteW = remoteBib.find(r => r.kind === WEIGHTS);

    const localPlaces = Places.raw();
    const localW = { weights: Weights.get(), updatedAt: store.get('weightsAt', '') };
    const places = mergePlaces(localPlaces, remotePlaces);
    const w = remoteW && (remoteW.updatedAt || '') > (localW.updatedAt || '') ? { weights: remoteW.weights || {}, updatedAt: remoteW.updatedAt } : localW;

    const bibRecs = [...places.map(p => ({ ...p, kind: PLACE })),
      ...(w.updatedAt ? [{ id: WEIGHTS_ID, kind: WEIGHTS, weights: w.weights, updatedAt: w.updatedAt }] : [])];
    if (!same(bibRecs, remoteBib)) {
      const albums = [...remoteAll.filter(r => !isBib(r)), ...bibRecs];
      const { error: upErr } = row
        ? await sb.from('user_data').update({ albums, updated_at: now() }).eq('user_id', user.id)
        : await sb.from('user_data').insert({ user_id: user.id, songs: [], albums, updated_at: now() });
      if (upErr) throw upErr;
    }

    const placesChanged = !same(places, localPlaces);
    const weightsChanged = !same(w.weights, localW.weights);
    if (placesChanged) Places.setRaw(places, true);
    if (w.updatedAt !== localW.updatedAt) { store.set('weights', w.weights); store.set('weightsAt', w.updatedAt); }
    store.set('cloudPending', false);
    store.set('cloudLastSync', now());
    if (placesChanged || weightsChanged) window.dispatchEvent(new CustomEvent('bib-cloud-updated', { detail: { weightsChanged } }));
  }

  async function sync() {
    if (!user) return;
    if (running) { again = true; return running; }
    running = (async () => {
      do {
        again = false;
        try { await withTimeout(syncOnce()); store.set('cloudLastError', null); setStatus('ok'); }
        catch (e) {
          console.warn('Lernorte-Sync fehlgeschlagen', e);
          store.set('cloudLastError', e.message || String(e));
          setStatus(navigator.onLine ? 'error' : 'offline');
          break;
        }
      } while (again);
    })();
    await running;
    running = null;
  }

  onBibChanged = () => {
    store.set('cloudPending', true);
    if (!user) return;
    clearTimeout(timer);
    timer = setTimeout(sync, 600);
  };
  // Seite wird verlassen (z. B. nach „Speichern“): gleich hochladen statt zu warten
  addEventListener('pagehide', () => { if (user && store.get('cloudPending', false)) { clearTimeout(timer); sync(); } });
  addEventListener('online', () => { if (store.get('cloudPending', false)) sync(); });

  sb.auth.onAuthStateChange((event, session) => {
    user = session?.user || null;
    setStatus(user ? status : 'idle');
    if (user && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')) setTimeout(sync, 0);
  });

  return {
    get user() { return user; },
    get status() { return status; },
    onChange: fn => listeners.push(fn),
    sync,
    signIn: (email, password) => sb.auth.signInWithPassword({ email, password }),
    signOut: () => sb.auth.signOut(),
  };
})();

// Übersichtsseiten: Daten von einem anderen Gerät sofort anzeigen
addEventListener('bib-cloud-updated', () => {
  if (/\/bib\/(index\.html|orte\.html|einstellungen\.html)?$/.test(location.pathname)) location.reload();
});

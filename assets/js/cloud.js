// Cloud sync via Supabase: log in with an e-mail link or code, then all songs, albums and settings
// are kept in one row of the table user_data. The browser's storage stays the working copy, so the
// page also works offline; changes are uploaded shortly after they happen and merged per record
// (the newer updatedAt wins), so ratings made on different devices end up together.

const Cloud = (() => {
  if (!window.supabase || typeof CLOUD_URL === 'undefined') return null;
  const sb = supabase.createClient(CLOUD_URL, CLOUD_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' },
  });
  const listeners = [];
  let user = null;
  let status = 'idle';   // idle | syncing | ok | offline | error
  let running = null, again = false, timer = null;

  const stamp = r => r.updatedAt || r.savedAt || '';
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  function mergeRecords(local, remote) {
    const byId = new Map();
    [...local, ...remote].forEach(r => {
      const cur = byId.get(r.id);
      if (!cur || stamp(r) > stamp(cur)) byId.set(r.id, r);
    });
    return [...byId.values()];
  }

  function newerConfig(local, remote) {
    if (!local) return remote || null;
    if (!remote) return local;
    return (remote._updatedAt || '') > (local._updatedAt || '') ? remote : local;
  }

  function setStatus(s) { status = s; listeners.forEach(fn => fn()); renderChip(); }

  // Download, merge with this device, upload the result
  async function syncOnce() {
    setStatus('syncing');
    const { data: row, error } = await sb.from('user_data').select('songs, albums, config').eq('user_id', user.id).maybeSingle();
    if (error) throw error;
    const local = { songs: Songs.raw(), albums: Albums.raw(), config: store.get('songRatingConfig', null) };
    const merged = {
      songs: mergeRecords(local.songs, row?.songs || []),
      albums: mergeRecords(local.albums, row?.albums || []),
      config: newerConfig(local.config, row?.config),
    };
    if (!row || !same(merged.songs, row.songs) || !same(merged.albums, row.albums) || !same(merged.config, row.config)) {
      const { error: upErr } = await sb.from('user_data').upsert({ user_id: user.id, ...merged, updated_at: now() });
      if (upErr) throw upErr;
    }
    const configChanged = !same(merged.config, local.config);
    if (!same(merged.songs, local.songs) || !same(merged.albums, local.albums) || configChanged) {
      Songs.setRaw(merged.songs, true);
      Albums.setRaw(merged.albums, true);
      store.set('songRatingConfig', merged.config);
      refreshCounts();
      window.dispatchEvent(new CustomEvent('cloud-updated', { detail: { configChanged } }));
    }
    store.set('cloudPending', false);
    store.set('cloudLastSync', now());
  }

  async function sync() {
    if (!user) return;
    if (running) { again = true; return running; }
    running = (async () => {
      do {
        again = false;
        try { await syncOnce(); setStatus('ok'); }
        catch (e) { console.warn('Cloud sync failed', e); setStatus(navigator.onLine ? 'error' : 'offline'); break; }
      } while (again);
    })();
    await running;
    running = null;
  }

  // Local change → remember it and upload shortly after (several quick changes become one upload)
  onDataChanged = () => {
    store.set('cloudPending', true);
    if (!user) return;
    clearTimeout(timer);
    timer = setTimeout(sync, 800);
  };

  window.addEventListener('online', () => { if (store.get('cloudPending', false)) sync(); });

  sb.auth.onAuthStateChange((event, session) => {
    user = session?.user || null;
    setStatus(user ? status : 'idle');
    // Sync once per page load and right after logging in
    if (user && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')) setTimeout(sync, 0);
  });

  function renderChip() {
    const chip = $('cloudChip');
    if (!chip) return;
    chip.hidden = false;
    const text = !user ? '☁︎ Anmelden' : { syncing: '☁︎ speichert …', ok: '☁︎ ✓ gespeichert', offline: '☁︎ offline', error: '☁︎ ⚠︎ Sync-Fehler' }[status] || '☁︎ verbunden';
    chip.textContent = text;
    chip.title = user ? `Angemeldet als ${user.email}` : 'Anmelden, um deine Bewertungen auf allen Geräten zu sehen';
    chip.classList.toggle('warn', !!user && (status === 'error' || status === 'offline'));
    const tab = $('tabCloud');
    if (tab) {
      tab.dataset.state = !user ? 'out' : status;
      tab.querySelector('span').textContent = user ? (status === 'syncing' ? 'Speichert …' : status === 'ok' ? 'Gespeichert' : status === 'idle' ? 'Konto' : 'Offline') : 'Anmelden';
    }
  }
  renderChip();

  return {
    get user() { return user; },
    get status() { return status; },
    onChange: fn => listeners.push(fn),
    sync,
    // Sends an e-mail with a login link (and a code, if the e-mail template contains it)
    sendLogin: email => sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.href.split('#')[0] } }),
    verifyCode: (email, token) => sb.auth.verifyOtp({ email, token, type: 'email' }),
    async signOut(clearDevice) {
      if (store.get('cloudPending', false)) await sync();
      await sb.auth.signOut();
      if (clearDevice) {
        ['songRatings', 'albumRatings', 'songRatingConfig', 'songRatingDraft', 'albumRatingDraft', 'cloudPending', 'cloudLastSync']
          .forEach(k => { try { localStorage.removeItem(k); } catch (e) {} });
      }
    },
  };
})();

// Overview pages: show data that arrived from another device
window.addEventListener('cloud-updated', e => {
  if (e.detail.configChanged && /(index|songs|alben)\.html|\/$/.test(location.pathname)) location.reload();
  else if (typeof list !== 'undefined' && list.render) list.render();
});

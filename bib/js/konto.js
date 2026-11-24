// Einstellungen → Konto: mit dem Song-Rating-Konto anmelden (dieselbe E-Mail + dasselbe Passwort).

let kontoMsg = '', kontoOk = '';

function renderKonto() {
  const box = $('account');
  if (!BibCloud) {
    box.innerHTML = '<p class="muted">Die Cloud ist gerade nicht erreichbar – bist du online? Deine Lernorte bleiben so lange auf diesem Gerät gespeichert.</p>';
    return;
  }
  const u = BibCloud.user;
  if (u) {
    const last = store.get('cloudLastSync', null);
    const err = store.get('cloudLastError', null);
    const st = { syncing: 'speichert gerade …', ok: 'alles gespeichert ✓', offline: 'offline – wird hochgeladen, sobald du wieder online bist',
      error: 'Fehler beim Speichern' }[BibCloud.status] || 'verbunden';
    box.innerHTML = `
      <p>Angemeldet mit deinem <b>Song-Rating-Konto</b> (<b>${esc(u.email)}</b>). Deine Lernorte und Gewichte werden automatisch dort gespeichert und erscheinen auf jedem Gerät, auf dem du angemeldet bist.</p>
      <p class="muted">Status: ${esc(st)}${last ? ` · zuletzt ${new Date(last).toLocaleString('de-DE')}` : ''}</p>
      ${err && BibCloud.status === 'error' ? `<p class="k-err">Letzter Fehler: ${esc(err)}</p>` : ''}
      <div class="row-btns">
        <button id="kSync" ${BibCloud.status === 'syncing' ? 'disabled' : ''}>Jetzt synchronisieren</button>
        <button id="kOut">Abmelden</button>
        <span class="toast">${esc(kontoOk)}</span>
      </div>
      <p class="muted k-small">Abmelden gilt auch für Song Rating in diesem Browser.</p>`;
    $('kSync').onclick = async () => { kontoOk = ''; await BibCloud.sync(); kontoOk = BibCloud.status === 'ok' ? 'Synchronisiert ✓' : ''; renderKonto(); };
    $('kOut').onclick = async () => { await BibCloud.sync(); await BibCloud.signOut(); kontoOk = ''; renderKonto(); };
    return;
  }
  const typed = $('kEmail') ? { e: $('kEmail').value, p: $('kPw').value } : { e: '', p: '' };
  box.innerHTML = `
    <p>Melde dich mit deinem <b>Song-Rating-Konto</b> an – kein neues Konto nötig. Dann sind deine Lernorte auf allen Geräten.</p>
    <form id="kForm" class="k-form">
      <input type="email" id="kEmail" placeholder="E-Mail" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" required>
      <input type="password" id="kPw" placeholder="Passwort" autocomplete="current-password" required>
      <button type="submit" class="primary" id="kGo">Anmelden</button>
    </form>
    ${kontoMsg ? `<p class="k-err">${esc(kontoMsg)}</p>` : ''}
    <div class="k-or"><span>oder</span></div>
    <a class="btn k-song" href="../einstellungen.html?from=lernorte#konto">Über Song Rating anmelden</a>
    <p class="muted k-small">Melde dich dort an (auch mit Code per E-Mail oder „Passwort vergessen“). Danach bringt dich ein Knopf hierher zurück – und du bist auch in Lernorte angemeldet.</p>`;
  $('kEmail').value = typed.e;
  $('kPw').value = typed.p;
  $('kForm').onsubmit = async e => {
    e.preventDefault();
    kontoMsg = '';
    $('kGo').disabled = true;
    $('kGo').textContent = 'Melde an …';
    let error;
    try { ({ error } = await BibCloud.signIn($('kEmail').value.trim(), $('kPw').value)); } catch (err) { error = err; }
    if (error) {
      kontoMsg = /invalid/i.test(error.message || '') ? 'E-Mail oder Passwort stimmt nicht. Klappt es in Song Rating? Dann melde dich unten „Über Song Rating“ an.' : 'Anmelden hat nicht geklappt: ' + (error.message || error);
      $('kGo').disabled = false;
      renderKonto();
    }
  };
}

if (BibCloud) BibCloud.onChange(renderKonto);
renderKonto();

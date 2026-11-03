// Settings page: log in / out of the cloud account.

let loginEmail = store.get('cloudLoginEmail', '');
let codeSent = false;
let accountMsg = '';

function renderAccount() {
  const box = $('account');
  if (!Cloud) {
    box.innerHTML = '<div class="account"><p>Die Cloud ist gerade nicht erreichbar – bist du online? Deine Bewertungen werden so lange auf diesem Gerät gespeichert.</p></div>';
    return;
  }
  const u = Cloud.user;
  if (u) {
    const last = store.get('cloudLastSync', null);
    const status = { syncing: 'speichert gerade …', ok: 'alles gespeichert ✓', offline: 'offline – wird hochgeladen, sobald du wieder online bist',
      error: 'Fehler beim Speichern – versuch es mit „Jetzt synchronisieren“' }[Cloud.status] || 'verbunden';
    box.innerHTML = `
      <div class="account">
        <div class="signed">Angemeldet als <b>${esc(u.email)}</b></div>
        <p>Status: ${esc(status)}${last ? ` · zuletzt synchronisiert ${new Date(last).toLocaleString('de-DE')}` : ''}</p>
        <p>Deine Bewertungen werden automatisch in deinem Konto gespeichert. Auf jedem anderen Gerät einfach hier mit derselben E-Mail anmelden.</p>
        <div class="login-row">
          <button id="syncNow">🔄 Jetzt synchronisieren</button>
          <button id="logout">Abmelden</button>
          <button class="danger" id="logoutClear" title="Für fremde Geräte: nach dem Abmelden bleibt hier nichts zurück">Abmelden &amp; Daten von diesem Gerät entfernen</button>
        </div>
        ${accountMsg ? `<div class="err">${esc(accountMsg)}</div>` : ''}
      </div>`;
    $('syncNow').onclick = () => Cloud.sync();
    $('logout').onclick = async () => { await Cloud.signOut(false); accountMsg = ''; renderAccount(); };
    $('logoutClear').onclick = async () => {
      if (!confirm('Abmelden und alle Bewertungen von diesem Gerät entfernen?\nIn deinem Cloud-Konto bleiben sie erhalten.')) return;
      await Cloud.signOut(true);
      location.reload();
    };
    return;
  }

  box.innerHTML = `
    <div class="account">
      <p>Melde dich an, damit deine Bewertungen in deinem Konto gespeichert werden und du sie auf allen Geräten siehst.
         Kein Passwort nötig – du bekommst einen Login-Link per E-Mail. Beim ersten Anmelden werden die Bewertungen
         auf diesem Gerät automatisch übernommen.</p>
      <div class="login-row">
        <input type="email" id="loginEmail" placeholder="deine@email.de" autocomplete="email" value="${esc(loginEmail)}">
        <button class="primary" id="sendLink">${codeSent ? 'Neuen Link schicken' : 'Login-Link schicken'}</button>
      </div>
      ${codeSent ? `
        <div class="sent">
          <div>📬 Wir haben dir eine E-Mail an <b>${esc(loginEmail)}</b> geschickt. Klick auf den Link darin – oder gib den Code aus der E-Mail hier ein:</div>
          <div class="login-row">
            <input class="code" id="loginCode" inputmode="numeric" autocomplete="one-time-code" placeholder="123456" maxlength="10">
            <button class="primary" id="verifyCode">Anmelden</button>
          </div>
          <div class="muted">Keine E-Mail? Schau im Spam-Ordner nach.</div>
        </div>` : ''}
      ${accountMsg ? `<div class="err">${esc(accountMsg)}</div>` : ''}
    </div>`;

  $('sendLink').onclick = async () => {
    loginEmail = $('loginEmail').value.trim();
    if (!/^\S+@\S+\.\S+$/.test(loginEmail)) { accountMsg = 'Bitte gib eine gültige E-Mail-Adresse ein.'; return renderAccount(); }
    store.set('cloudLoginEmail', loginEmail);
    $('sendLink').disabled = true;
    const { error } = await Cloud.sendLogin(loginEmail);
    accountMsg = error ? loginError(error) : '';
    codeSent = !error;
    renderAccount();
  };
  const verify = $('verifyCode');
  if (verify) verify.onclick = async () => {
    const code = $('loginCode').value.replace(/\s/g, '');
    const { error } = await Cloud.verifyCode(loginEmail, code);
    accountMsg = error ? 'Der Code stimmt nicht oder ist abgelaufen – lass dir einen neuen Link schicken.' : '';
    if (!error) codeSent = false;
    renderAccount();
  };
}

function loginError(error) {
  if (error.status === 429 || /rate limit/i.test(error.message)) return 'Zu viele Login-E-Mails in kurzer Zeit – bitte warte ein paar Minuten und versuch es dann noch einmal.';
  return 'Das hat nicht geklappt: ' + error.message;
}

if (Cloud) Cloud.onChange(renderAccount);
renderAccount();

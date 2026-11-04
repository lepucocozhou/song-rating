// Settings page: log in / out of the cloud account.

let loginEmail = store.get('cloudLoginEmail', '');
let loginMode = 'login';   // login | register | code
let codeSent = false;
let accountMsg = '';
let accountOk = '';
let pwMsg = '', pwOk = '', pwNonceNeeded = false;

function renderAccount() {
  const box = $('account');
  if (!Cloud) {
    box.innerHTML = '<div class="account"><p>Die Cloud ist gerade nicht erreichbar – bist du online? Deine Bewertungen werden so lange auf diesem Gerät gespeichert.</p></div>';
    return;
  }
  const u = Cloud.user;
  // Re-rendering (e.g. when the sync status changes) must not wipe what is being typed
  const typedPw = $('newPw') ? $('newPw').value : '';
  const typedNonce = $('pwNonce') ? $('pwNonce').value : '';
  if (u) {
    const last = store.get('cloudLastSync', null);
    const counts = store.get('cloudCounts', null);
    const lastError = store.get('cloudLastError', null);
    const status = { syncing: 'speichert gerade …', ok: 'alles gespeichert ✓', offline: 'offline – wird hochgeladen, sobald du wieder online bist',
      error: 'Fehler beim Speichern – versuch es mit „Jetzt synchronisieren“' }[Cloud.status] || 'verbunden';
    box.innerHTML = `
      <div class="account">
        <div class="signed">Angemeldet als <b>${esc(u.email)}</b></div>
        <p>Status: ${esc(status)}${last ? ` · zuletzt synchronisiert ${new Date(last).toLocaleString('de-DE')}` : ''}</p>
        ${counts ? `<p>In deinem Konto: <b>${counts.songs}</b> Songs, <b>${counts.albums}</b> Alben · auf diesem Gerät: <b>${Songs.all().length}</b> Songs, <b>${Albums.all().length}</b> Alben</p>` : ''}
        ${lastError && Cloud.status !== 'ok' ? `<div class="err">Letzter Fehler: ${esc(lastError)}</div>` : ''}
        <p>Deine Bewertungen werden automatisch in deinem Konto gespeichert. Auf jedem anderen Gerät einfach hier mit derselben E-Mail anmelden.</p>
        <form class="pw-box" id="pwForm">
          <b>🔑 Passwort</b>
          <div class="muted">Leg ein Passwort fest, dann kannst du dich überall mit E-Mail und Passwort anmelden.</div>
          <input type="email" value="${esc(u.email)}" autocomplete="username" hidden>
          <div class="login-row">
            <input type="password" id="newPw" placeholder="Neues Passwort (mind. 6 Zeichen)" autocomplete="new-password">
            ${pwNonceNeeded ? '' : '<button type="submit" class="primary" id="pwSave">Passwort festlegen</button>'}
          </div>
          ${pwNonceNeeded ? `
            <div>📬 Zur Sicherheit haben wir dir einen Bestätigungscode an <b>${esc(u.email)}</b> geschickt. Gib ihn hier ein:</div>
            <div class="login-row">
              <input class="code" id="pwNonce" inputmode="numeric" autocomplete="one-time-code" placeholder="123456" maxlength="10">
              <button type="submit" class="primary" id="pwSave">Bestätigen</button>
            </div>` : ''}
          ${pwOk ? `<div class="ok">${esc(pwOk)}</div>` : ''}
          ${pwMsg ? `<div class="err">${esc(pwMsg)}</div>` : ''}
        </form>
        <div class="login-row">
          <button id="syncNow" ${Cloud.status === 'syncing' ? 'disabled' : ''}>${Cloud.status === 'syncing' ? '🔄 Synchronisiere …' : '🔄 Jetzt synchronisieren'}</button>
          <button id="logout">Abmelden</button>
          <button class="danger" id="logoutClear" title="Für fremde Geräte: nach dem Abmelden bleibt hier nichts zurück">Abmelden &amp; Daten von diesem Gerät entfernen</button>
        </div>
        ${accountOk ? `<div class="ok">${esc(accountOk)}</div>` : ''}
        ${accountMsg ? `<div class="err">${esc(accountMsg)}</div>` : ''}
      </div>`;
    $('syncNow').onclick = async () => {
      $('syncNow').disabled = true;
      $('syncNow').textContent = '🔄 Synchronisiere …';
      accountMsg = accountOk = '';
      await Cloud.sync();
      const c = store.get('cloudCounts', null);
      if (Cloud.status === 'ok') accountOk = `✓ Synchronisiert um ${new Date().toLocaleTimeString('de-DE')}` + (c ? ` – ${c.songs} Songs und ${c.albums} Alben in deinem Konto.` : '.');
      else accountMsg = 'Synchronisieren hat nicht geklappt: ' + (store.get('cloudLastError', null) || 'unbekannter Fehler');
      renderAccount();
    };
    if (typedPw) $('newPw').value = typedPw;
    if (typedNonce && $('pwNonce')) $('pwNonce').value = typedNonce;
    $('pwForm').onsubmit = async e => {
      e.preventDefault();
      const pw = $('newPw').value;
      const nonce = $('pwNonce') ? $('pwNonce').value.replace(/\s/g, '') : '';
      pwMsg = pwOk = '';
      if (pw.length < 6) { pwMsg = 'Das Passwort muss mindestens 6 Zeichen lang sein.'; return renderAccount(); }
      if (pwNonceNeeded && !nonce) { pwMsg = 'Bitte gib den Code aus der E-Mail ein.'; return renderAccount(); }
      $('pwSave').disabled = true;
      $('pwSave').textContent = 'Speichere …';
      let error;
      try { ({ error } = await Cloud.setPassword(pw, nonce)); } catch (err) { error = err; }
      if (error && !pwNonceNeeded && (error.code === 'reauthentication_needed' || /reauthenticat/i.test(error.message))) {
        const { error: sendErr } = await Cloud.reauthenticate();
        if (sendErr) pwMsg = loginError(sendErr);
        else pwNonceNeeded = true;
      } else if (error) pwMsg = passwordError(error);
      else {
        pwNonceNeeded = false;
        pwOk = '✓ Passwort gespeichert – ab jetzt kannst du dich mit E-Mail und Passwort anmelden.';
        $('newPw').value = '';
      }
      renderAccount();
    };
    $('logout').onclick = async () => { await Cloud.signOut(false); accountMsg = ''; renderAccount(); };
    $('logoutClear').onclick = async () => {
      if (!confirm('Abmelden und alle Bewertungen von diesem Gerät entfernen?\nIn deinem Cloud-Konto bleiben sie erhalten.')) return;
      await Cloud.signOut(true);
      location.reload();
    };
    return;
  }

  const tabs = `
    <div class="login-tabs">
      <button type="button" data-mode="login" class="${loginMode === 'login' ? 'on' : ''}">Anmelden</button>
      <button type="button" data-mode="register" class="${loginMode === 'register' ? 'on' : ''}">Registrieren</button>
    </div>`;
  let form;
  if (loginMode === 'code') {
    form = `
      <p>Passwort vergessen oder noch keins festgelegt? Lass dir einen Login-Link mit Code per E-Mail schicken.
         Danach kannst du hier ein (neues) Passwort festlegen.</p>
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
      <a href="#" class="login-link" data-mode="login">← Zurück zur Anmeldung mit Passwort</a>`;
  } else {
    const reg = loginMode === 'register';
    form = `
      <form class="login-form" id="pwLogin">
        <input type="email" id="loginEmail" placeholder="deine@email.de" autocomplete="email" value="${esc(loginEmail)}" required>
        <input type="password" id="loginPw" placeholder="${reg ? 'Passwort wählen (mind. 6 Zeichen)' : 'Passwort'}"
               autocomplete="${reg ? 'new-password' : 'current-password'}" required>
        ${reg ? '<input type="password" id="loginPw2" placeholder="Passwort wiederholen" autocomplete="new-password" required>' : ''}
        <button class="primary" type="submit">${reg ? 'Konto erstellen' : 'Anmelden'}</button>
      </form>
      ${reg ? '' : '<a href="#" class="login-link" data-mode="code">Passwort vergessen? Per E-Mail-Code anmelden</a>'}`;
  }

  box.innerHTML = `
    <div class="account">
      <p>Melde dich an, damit deine Bewertungen in deinem Konto gespeichert werden und du sie auf allen Geräten siehst.
         Beim ersten Anmelden werden die Bewertungen auf diesem Gerät automatisch übernommen.</p>
      ${loginMode === 'code' ? '' : tabs}
      ${form}
      ${accountOk ? `<div class="ok">${esc(accountOk)}</div>` : ''}
      ${accountMsg ? `<div class="err">${esc(accountMsg)}</div>` : ''}
    </div>`;

  box.querySelectorAll('[data-mode]').forEach(el => el.onclick = e => {
    e.preventDefault();
    loginEmail = ($('loginEmail') && $('loginEmail').value.trim()) || loginEmail;
    loginMode = el.dataset.mode;
    accountMsg = accountOk = '';
    renderAccount();
  });

  const pwLogin = $('pwLogin');
  if (pwLogin) pwLogin.onsubmit = async e => {
    e.preventDefault();
    loginEmail = $('loginEmail').value.trim();
    const pw = $('loginPw').value;
    accountMsg = accountOk = '';
    if (!/^\S+@\S+\.\S+$/.test(loginEmail)) { accountMsg = 'Bitte gib eine gültige E-Mail-Adresse ein.'; return renderAccount(); }
    if (loginMode === 'register') {
      if (pw.length < 6) { accountMsg = 'Das Passwort muss mindestens 6 Zeichen lang sein.'; return renderAccount(); }
      if (pw !== $('loginPw2').value) { accountMsg = 'Die beiden Passwörter sind nicht gleich.'; return renderAccount(); }
    }
    store.set('cloudLoginEmail', loginEmail);
    pwLogin.querySelector('button').disabled = true;
    if (loginMode === 'register') {
      const { data, error } = await Cloud.signUp(loginEmail, pw);
      if (error) accountMsg = /already/i.test(error.message)
        ? 'Mit dieser E-Mail gibt es schon ein Konto – melde dich unter „Anmelden“ an.' : loginError(error);
      else if (data.user && !data.user.identities?.length) accountMsg = 'Mit dieser E-Mail gibt es schon ein Konto – melde dich unter „Anmelden“ an.';
      else if (!data.session) accountOk = `📬 Fast geschafft: Bitte bestätige noch einmal deine E-Mail – wir haben dir einen Link an ${loginEmail} geschickt. Danach kannst du dich hier mit deinem Passwort anmelden.`;
    } else {
      const { error } = await Cloud.signIn(loginEmail, pw);
      if (error) accountMsg = /invalid/i.test(error.message)
        ? 'E-Mail oder Passwort stimmt nicht. Hast du dich früher per E-Mail-Link angemeldet und noch kein Passwort? Dann klick auf „Passwort vergessen“.'
        : /confirm/i.test(error.message) ? 'Bitte bestätige zuerst deine E-Mail über den Link, den wir dir geschickt haben.' : loginError(error);
    }
    renderAccount();
  };

  const sendLink = $('sendLink');
  if (sendLink) sendLink.onclick = async () => {
    loginEmail = $('loginEmail').value.trim();
    if (!/^\S+@\S+\.\S+$/.test(loginEmail)) { accountMsg = 'Bitte gib eine gültige E-Mail-Adresse ein.'; return renderAccount(); }
    store.set('cloudLoginEmail', loginEmail);
    sendLink.disabled = true;
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
    if (!error) { codeSent = false; loginMode = 'login'; }
    renderAccount();
  };
}

function passwordError(error) {
  const m = error.message || String(error);
  if (error.code === 'same_password' || /different from the old/i.test(m)) return 'Das ist schon dein aktuelles Passwort ✓';
  if (error.code === 'weak_password' || /weak|at least/i.test(m)) return 'Das Passwort ist zu schwach – nimm ein längeres mit Buchstaben und Zahlen.';
  if (/nonce|otp|expired|invalid/i.test(m)) return 'Der Code stimmt nicht oder ist abgelaufen.';
  return 'Passwort konnte nicht gespeichert werden: ' + m;
}

function loginError(error) {
  if (error.status === 429 || /rate limit/i.test(error.message)) return 'Zu viele Login-E-Mails in kurzer Zeit – bitte warte ein paar Minuten und versuch es dann noch einmal.';
  return 'Das hat nicht geklappt: ' + error.message;
}

if (Cloud) Cloud.onChange(renderAccount);
renderAccount();

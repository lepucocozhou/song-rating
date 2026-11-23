// „Meine Apps“: zwischen Song Rating und Lernorte wechseln (beide nutzen dasselbe Konto).
// Wird von beiden Apps geladen. Fügt neben dem Logo einen Umschalter ein und füllt – falls vorhanden –
// den Bereich <div id="moreApps"></div> in den Einstellungen. Neue App? Einfach unten in APPS eintragen.

(() => {
  const ROOT = new URL('../../', document.currentScript.src).href;   // assets/js/apps.js → Startordner der Website
  const APPS = [
    { id: 'song', name: 'Song Rating', desc: 'Songs, Alben und Artists bewerten und ranken', href: '', icon: 'assets/icons/icon-192.png' },
    { id: 'bib', name: 'Lernorte', desc: 'Lernorte bewerten und die besten finden', href: 'bib/', icon: 'bib/icons/icon-192.png' },
  ];
  const here = location.pathname.includes('/bib/') ? 'bib' : 'song';
  const appLink = (a, cls) => `<a class="${cls}${a.id === here ? ' here' : ''}" href="${a.id === here ? 'index.html' : ROOT + a.href}">
      <img src="${ROOT + a.icon}" alt="" width="40" height="40">
      <span><b translate="no">${a.name}</b><small>${a.desc}</small></span>
      ${a.id === here ? '<em>Du bist hier</em>' : '<i aria-hidden="true">›</i>'}
    </a>`;

  document.head.insertAdjacentHTML('beforeend', `<style>
    .app-sw{position:relative;display:inline-flex;margin-left:10px;vertical-align:middle}
    .app-sw-btn{display:grid;place-items:center;width:34px;height:34px;padding:0;border-radius:10px;border:1px solid var(--line);background:var(--card);color:var(--muted);cursor:pointer}
    .app-sw-btn:hover,.app-sw-btn[aria-expanded=true]{color:var(--text);border-color:var(--accent-strong)}
    .app-sw-btn svg{width:17px;height:17px}
    .app-sw-pop{position:absolute;top:calc(100% + 8px);left:0;z-index:60;width:min(320px,calc(100vw - 32px));background:var(--card);color:var(--text);border:1px solid var(--line);border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.14);padding:8px}
    .app-sw-pop h4{margin:4px 8px 6px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);font-weight:700}
    .app-sw-pop p{margin:6px 8px 4px;font-size:12px;color:var(--muted)}
    .app-item{display:flex;align-items:center;gap:12px;padding:8px;border-radius:12px;text-decoration:none;color:var(--text)}
    .app-item:hover{background:var(--bg)}
    .app-item img{width:40px;height:40px;border-radius:10px;flex:none}
    .app-item span{flex:1;min-width:0;display:grid;gap:1px;font-size:14.5px;line-height:1.3}
    .app-item small{font-size:12.5px;color:var(--muted);font-weight:400}
    .app-item em{font-style:normal;font-size:11.5px;font-weight:700;color:var(--accent-strong);white-space:nowrap}
    .app-item i{font-style:normal;font-size:22px;color:var(--muted)}
    .app-item.here{cursor:default}
    .more-apps{display:grid;gap:8px}
    .more-apps a.app-item{color:var(--text);font-weight:400}
    .more-apps .app-item{border:1px solid var(--line);background:var(--card);padding:10px 12px}
    .more-apps .app-item.here{background:var(--bg)}
    header[data-active=start] .app-sw-btn{background:rgba(255,255,255,.55);border-color:transparent}
    @media (max-width:700px){.app-sw-btn{width:32px;height:32px}.app-sw-pop{position:fixed;left:16px;right:16px;width:auto}}
  </style>`);

  // Umschalter neben dem Logo
  const logo = document.querySelector('header .logo');
  if (logo) {
    logo.insertAdjacentHTML('afterend', `<span class="app-sw">
      <button type="button" class="app-sw-btn" id="appSwBtn" aria-haspopup="true" aria-expanded="false" aria-label="Meine Apps" title="Meine Apps">
        <svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/></svg>
      </button>
      <div class="app-sw-pop" id="appSwPop" hidden>
        <h4>Meine Apps</h4>
        ${APPS.map(a => appLink(a, 'app-item')).join('')}
        <p>Ein Konto für alle Apps.</p>
      </div>
    </span>`);
    const btn = document.getElementById('appSwBtn'), pop = document.getElementById('appSwPop');
    const show = open => {
      pop.hidden = !open;
      btn.setAttribute('aria-expanded', open);
      // Handy: Menü über die ganze Breite, direkt unter dem Knopf
      pop.style.top = open && getComputedStyle(pop).position === 'fixed' ? btn.getBoundingClientRect().bottom + 8 + 'px' : '';
    };
    btn.onclick = e => { e.stopPropagation(); show(pop.hidden); };
    document.addEventListener('click', e => { if (!e.target.closest('.app-sw')) show(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') show(false); });
  }

  // Bereich „Mehr Apps“ in den Einstellungen
  const box = document.getElementById('moreApps');
  if (box) box.innerHTML = `<div class="more-apps">${APPS.map(a => appLink(a, 'app-item')).join('')}</div>`;
})();

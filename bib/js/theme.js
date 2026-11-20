// Hell / Dunkel: im <head> geladen, damit die Farben sofort stimmen.
// Pro Gerät gespeichert: 'auto' (wie Handy/Computer), 'light' oder 'dark'. Eigener Schlüssel, unabhängig von der Song-Seite.

function bibApplyTheme(choice) {
  const root = document.documentElement;
  if (choice === 'light' || choice === 'dark') root.dataset.theme = choice; else delete root.dataset.theme;
  const dark = choice === 'dark' || (choice !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  const meta = document.querySelector('meta[name=theme-color]');
  if (meta) meta.content = dark ? '#1f4d36' : '#cdeed7';
}

function bibGetTheme() {
  try { return JSON.parse(localStorage.getItem('bib.theme')) || 'auto'; } catch (e) { return 'auto'; }
}

bibApplyTheme(bibGetTheme());
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => bibApplyTheme(bibGetTheme()));
addEventListener('storage', e => { if (e.key === 'bib.theme') bibApplyTheme(bibGetTheme()); });

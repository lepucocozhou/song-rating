// Light / dark mode: loaded in <head> so the right colors are there before the page appears.
// Saved per device: 'auto' (follows the phone/computer setting), 'light' or 'dark'.

function applyTheme(choice) {
  const root = document.documentElement;
  if (choice === 'light' || choice === 'dark') root.dataset.theme = choice; else delete root.dataset.theme;
  const dark = choice === 'dark' || (choice !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  const meta = document.querySelector('meta[name=theme-color]');
  if (meta) meta.content = dark ? '#1d5f8a' : '#b5e6fd';
}

function getTheme() {
  try { return JSON.parse(localStorage.getItem('theme')) || 'auto'; } catch (e) { return 'auto'; }
}

applyTheme(getTheme());
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme(getTheme()));
// Switched in another open tab → follow along
addEventListener('storage', e => { if (e.key === 'theme') applyTheme(getTheme()); });

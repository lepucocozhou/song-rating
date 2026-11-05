// Settings page: switch between automatic, light and dark mode (see theme.js)
// and the language of the questions (see language.js).

function renderThemePick() {
  const current = getTheme();
  document.querySelectorAll('[data-theme-choice]').forEach(btn => {
    btn.classList.toggle('on', btn.dataset.themeChoice === current);
    btn.onclick = () => {
      store.set('theme', btn.dataset.themeChoice);
      applyTheme(btn.dataset.themeChoice);
      renderThemePick();
    };
  });
}

renderThemePick();

document.querySelectorAll('[data-lang-choice]').forEach(btn => {
  btn.classList.toggle('on', btn.dataset.langChoice === LANG);
  btn.onclick = () => {
    if (btn.dataset.langChoice === LANG) return;
    if (dirty && !confirm('Du hast ungespeicherte Änderungen an den Fragen. Trotzdem die Sprache wechseln?\nDie Änderungen gehen dabei verloren.')) return;
    store.set('lang', btn.dataset.langChoice);
    dirty = false;
    location.reload();
  };
});

// Small per-device preferences (rating sliders, hint sentences, chart region): saved immediately
document.querySelectorAll('[data-pref]').forEach(group => {
  const key = group.dataset.pref;
  const defaults = { sliderStep: 0.5, showThink: true, chartRegion: 'de' };
  const render = () => {
    const current = String(store.get(key, defaults[key]));
    group.querySelectorAll('button').forEach(btn => btn.classList.toggle('on', btn.dataset.val === current));
  };
  group.querySelectorAll('button').forEach(btn => btn.onclick = () => {
    const v = btn.dataset.val;
    store.set(key, v === 'true' ? true : v === 'false' ? false : isNaN(+v) ? v : +v);
    render();
  });
  render();
});

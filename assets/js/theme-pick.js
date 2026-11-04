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

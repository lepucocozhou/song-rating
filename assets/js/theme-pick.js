// Settings page: switch between automatic, light and dark mode (see theme.js).

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

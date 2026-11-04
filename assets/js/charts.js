// Small HTML bar charts for the start page (no library). Every bar shows its value on
// hover / keyboard focus / tap; values are also in a screen-reader table.

// Horizontal bars on a fixed 0–10 scale. rows: [{ label, sub?, value, color? }]
function barChart(el, rows, { color = '#38bdf8', caption }) {
  el.innerHTML = `
    <div class="hbars">${rows.map(r => `
      <div class="hbar-row">
        <div class="hbar-label"><span>${esc(r.label)}${r.sub ? ` <small>· ${esc(r.sub)}</small>` : ''}</span><b class="hbar-val">${fmt(r.value)}</b></div>
        <div class="hbar-track">
          <i class="mark" tabindex="0" style="width:${Math.max(0, r.value) * 10}%;background:${r.color || color}"
             data-tip-value="${fmt(r.value)}" data-tip-label="${esc(r.label)}${r.sub ? ' · ' + esc(r.sub) : ''}"></i>
        </div>
      </div>`).join('')}
    </div>
    ${srTable(caption, rows.map(r => [r.label + (r.sub ? ` (${r.sub})` : ''), fmt(r.value)]))}`;
}

// Vertical columns with a light grid. cols: [{ label, value, tip }]
function columnChart(el, cols, { color = '#38bdf8', caption, unit = '' }) {
  const max = Math.max(1, ...cols.map(c => c.value));
  const step = max <= 4 ? 1 : max <= 10 ? 2 : Math.ceil(max / 4 / 5) * 5;
  const top = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = 0; v <= top; v += step) ticks.push(v);
  el.innerHTML = `
    <div class="cols">
      <div class="cols-grid">${ticks.map(v =>
        `<div class="gridline" style="bottom:${v / top * 100}%"><span>${v}</span></div>`).join('')}</div>
      <div class="cols-bars">${cols.map(c => `
        <div class="col">
          <i class="mark" tabindex="0" style="height:${c.value / top * 100}%;background:${color}"
             data-tip-value="${c.value}${unit}" data-tip-label="${esc(c.tip || c.label)}"></i>
        </div>`).join('')}
      </div>
    </div>
    <div class="cols-labels">${cols.map(c => `<span>${esc(c.label)}</span>`).join('')}</div>
    ${srTable(caption, cols.map(c => [c.tip || c.label, c.value + unit]))}`;
}

function srTable(caption, rows) {
  return `<table class="sr-only"><caption>${esc(caption)}</caption>
    ${rows.map(([a, b]) => `<tr><th scope="row">${esc(a)}</th><td>${esc(b)}</td></tr>`).join('')}</table>`;
}

// One shared tooltip for all chart marks
(function chartTooltip() {
  const tip = document.createElement('div');
  tip.className = 'chart-tip';
  tip.hidden = true;
  tip.innerHTML = '<b></b><span></span>';
  document.body.appendChild(tip);
  function show(mark) {
    tip.querySelector('b').textContent = mark.dataset.tipValue;
    tip.querySelector('span').textContent = mark.dataset.tipLabel;
    tip.hidden = false;
    const r = mark.getBoundingClientRect(), t = tip.getBoundingClientRect();
    const left = Math.min(window.innerWidth - t.width - 8, Math.max(8, r.left + r.width / 2 - t.width / 2));
    const above = r.top - t.height - 8;
    tip.style.left = left + 'px';
    tip.style.top = (above > 8 ? above : r.bottom + 8) + window.scrollY + 'px';
  }
  const hide = () => { tip.hidden = true; };
  // Mouse: show while hovering · Touch: tap a bar to show, tap anywhere else to hide
  document.addEventListener('pointerover', e => { const m = e.target.closest('[data-tip-value]'); if (m) show(m); });
  document.addEventListener('pointerout', e => { if (e.pointerType === 'mouse' && e.target.closest('[data-tip-value]')) hide(); });
  document.addEventListener('pointerdown', e => { if (!e.target.closest('[data-tip-value]')) hide(); });
  document.addEventListener('focusin', e => { const m = e.target.closest('[data-tip-value]'); if (m) show(m); });
  document.addEventListener('focusout', hide);
  window.addEventListener('scroll', hide, { passive: true });
})();

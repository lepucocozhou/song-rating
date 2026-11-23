// Einen Lernort oder die Top 10 als Bild im Story-Format (1080×1920) teilen – wie in Song Rating, nur in Grün.
// Auf dem Handy öffnet sich das Teilen-Menü (WhatsApp, Instagram …), sonst wird das Bild gespeichert.

const SHARE_W = 1080, SHARE_H = 1920;
const SHARE_LINK = 'lepucocozhou.github.io/song-rating/bib';
const SHARE_SERIF = '"Fraunces", Georgia, serif';
const SHARE_SANS = '"Manrope", -apple-system, "Segoe UI", Roboto, sans-serif';
const INK = '#123824', INK_SOFT = '#35644a', ACCENT = '#2a9461';
const LEVEL_COLORS = { top: ['#2a9461', '#fff'], good: ['#7cc794', INK], ok: ['#f2c14e', '#4a3504'], bad: ['#ef8a6f', '#4a1606'] };

/* ---------- Zeichenhilfen ---------- */
function loadImg(src) {
  if (!src) return Promise.resolve(null);
  return new Promise(res => { const img = new Image(); img.onload = () => res(img); img.onerror = () => res(null); img.src = src; });
}

// Foto (zugeschnitten) oder Anfangsbuchstabe auf der Farbe der stärksten Kategorie
function drawPhoto(ctx, img, x, y, w, h, radius, row) {
  ctx.save();
  ctx.beginPath(); ctx.roundRect(x, y, w, h, radius); ctx.clip();
  if (img) {
    const s = Math.max(w / img.width, h / img.height), sw = w / s, sh = h / s;
    ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
  } else {
    let best = -1;
    row.cats.forEach((k, i) => { if (k !== null && (best < 0 || k > row.cats[best])) best = i; });
    const c = best < 0 ? ACCENT : CATS[best].color;
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, c); g.addColorStop(1, INK);
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#fff'; ctx.globalAlpha = .9;
    ctx.font = `600 ${Math.min(w, h) * .5}px ${SHARE_SERIF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText((row.p.name || '?').trim().charAt(0).toUpperCase(), x + w / 2, y + h / 2 + Math.min(w, h) * .03);
  }
  ctx.restore();
}

function ellipsis(ctx, text, max) {
  text = String(text || '');
  if (ctx.measureText(text).width <= max) return text;
  while (text && ctx.measureText(text + '…').width > max) text = text.slice(0, -1);
  return text.trimEnd() + '…';
}
function wrapLines(ctx, text, max, lines) {
  const words = String(text || '').split(/\s+/), out = [];
  let line = '';
  for (const w of words) {
    const next = line ? line + ' ' + w : w;
    if (ctx.measureText(next).width <= max || !line) line = next; else { out.push(line); line = w; }
  }
  if (line) out.push(line);
  if (out.length <= lines) return out;
  return [...out.slice(0, lines - 1), ellipsis(ctx, out.slice(lines - 1).join(' '), max)];
}
const spaced = (ctx, px) => { if ('letterSpacing' in ctx) ctx.letterSpacing = px; };

function shareBase() {
  const canvas = document.createElement('canvas');
  canvas.width = SHARE_W; canvas.height = SHARE_H;
  const ctx = canvas.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, SHARE_H);
  g.addColorStop(0, '#cdeed7'); g.addColorStop(.55, '#eaf6ec'); g.addColorStop(1, '#f5f8f2');
  ctx.fillStyle = g; ctx.fillRect(0, 0, SHARE_W, SHARE_H);
  [[900, 180, 260, .35], [120, 760, 220, .25], [980, 1500, 300, .3]].forEach(([x, y, r, a]) => {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fill();
  });
  // Logo „Lernorte“
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  ctx.font = `600 66px ${SHARE_SERIF}`; const w1 = ctx.measureText('Lern').width;
  ctx.font = `italic 600 66px ${SHARE_SERIF}`; const w2 = ctx.measureText('orte').width;
  const x0 = (SHARE_W - w1 - w2) / 2;
  ctx.fillStyle = INK; ctx.font = `600 66px ${SHARE_SERIF}`; ctx.fillText('Lern', x0, 150);
  ctx.fillStyle = ACCENT; ctx.font = `italic 600 66px ${SHARE_SERIF}`; ctx.fillText('orte', x0 + w1, 150);
  ctx.textAlign = 'center'; ctx.fillStyle = INK_SOFT; ctx.globalAlpha = .7;
  ctx.font = `600 28px ${SHARE_SANS}`; ctx.fillText(SHARE_LINK, SHARE_W / 2, SHARE_H - 60);
  ctx.globalAlpha = 1;
  return { canvas, ctx };
}

function kicker(ctx, text, y) {
  ctx.textAlign = 'center'; ctx.fillStyle = INK_SOFT; ctx.font = `800 28px ${SHARE_SANS}`;
  spaced(ctx, '6px'); ctx.fillText(text.toLocaleUpperCase('de'), SHARE_W / 2, y); spaced(ctx, '0px');
}

/* ---------- ein Lernort ---------- */
async function drawPlaceCard(row, n) {
  const { canvas, ctx } = shareBase();
  kicker(ctx, 'Mein Lernort', 215);
  const img = await loadImg(row.p.photos?.[0]);
  const pw = 900, ph = 600, px = (SHARE_W - pw) / 2, py = 265;
  ctx.save(); ctx.shadowColor = 'rgba(18,56,36,.28)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 24;
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 40); ctx.fill(); ctx.restore();
  drawPhoto(ctx, img, px, py, pw, ph, 40, row);

  let y = py + ph + 105;
  ctx.textAlign = 'center'; ctx.fillStyle = INK; ctx.font = `600 70px ${SHARE_SERIF}`;
  wrapLines(ctx, row.p.name, 900, 2).forEach(l => { ctx.fillText(l, SHARE_W / 2, y); y += 78; });
  if (row.p.where) { ctx.fillStyle = INK_SOFT; ctx.font = `600 34px ${SHARE_SANS}`; ctx.fillText(ellipsis(ctx, row.p.where, 900), SHARE_W / 2, y - 16); y += 34; }
  y += 10;

  // dunkle Karte mit der Note
  const cardH = 210, l = level(row.note);
  ctx.fillStyle = INK; ctx.beginPath(); ctx.roundRect(90, y, 900, cardH, 40); ctx.fill();
  ctx.textAlign = 'left'; ctx.fillStyle = '#cdeed7'; ctx.font = `800 28px ${SHARE_SANS}`;
  spaced(ctx, '4px'); ctx.fillText('ENDNOTE', 140, y + 88); spaced(ctx, '0px');
  ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.font = `600 32px ${SHARE_SANS}`;
  const rankText = n > 1 && row.rank ? `Platz ${row.rank} von ${n}` : '';
  ctx.fillText([l?.name, rankText].filter(Boolean).join(' · ') + (row.ko ? ' · K.-o.' : ''), 140, y + 142);
  ctx.textAlign = 'right'; ctx.fillStyle = '#cdeed7'; ctx.font = `600 150px ${SHARE_SERIF}`;
  ctx.fillText(fmt(row.note), 945, y + 160);
  y += cardH + 70;

  // ein Balken pro Kategorie
  const rowH = Math.min(74, (SHARE_H - 130 - y) / CATS.length);
  CATS.forEach((c, i) => {
    const k = row.cats[i];
    ctx.textAlign = 'left'; ctx.fillStyle = INK; ctx.font = `700 30px ${SHARE_SANS}`;
    ctx.fillText(ellipsis(ctx, c.name, 740), 90, y);
    ctx.textAlign = 'right'; ctx.font = `800 30px ${SHARE_SANS}`;
    ctx.fillText(pct(k), 990, y);
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.roundRect(90, y + 14, 900, 14, 7); ctx.fill();
    if (k) { ctx.fillStyle = c.color; ctx.beginPath(); ctx.roundRect(90, y + 14, Math.max(14, 900 * k), 14, 7); ctx.fill(); }
    y += rowH;
  });
  return canvas;
}

/* ---------- Top 10 ---------- */
async function drawTopCard(rows) {
  const { canvas, ctx } = shareBase();
  kicker(ctx, 'Meine Rangliste', 215);
  const imgs = await Promise.all(rows.map(r => loadImg(r.p.photos?.[0])));
  const rowH = Math.min(142, (SHARE_H - 520) / rows.length), h = rowH - 16;
  const top = Math.max(380, (380 + SHARE_H - 140 - rows.length * rowH) / 2);
  ctx.textAlign = 'center'; ctx.fillStyle = INK; ctx.font = `600 78px ${SHARE_SERIF}`;
  ctx.fillText(rows.length === 1 ? 'Mein Lieblings-Lernort' : `Meine Top ${rows.length} Lernorte`, SHARE_W / 2, top - 60);
  const medals = ['#f5c542', '#c7d2dc', '#e0a46e'];
  rows.forEach((r, i) => {
    const y = top + i * rowH;
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.roundRect(70, y, 940, h, 28); ctx.fill();
    const rx = 135, ry = y + h / 2;
    ctx.beginPath(); ctx.arc(rx, ry, 30, 0, Math.PI * 2); ctx.fillStyle = medals[r.rank - 1] || '#e0ece2'; ctx.fill();
    ctx.fillStyle = INK; ctx.font = `800 30px ${SHARE_SANS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(r.rank), rx, ry + 1);
    const ch = h - 24, cw = Math.round(ch * 4 / 3);
    drawPhoto(ctx, imgs[i], 185, y + 12, cw, ch, 16, r);
    const tx = 185 + cw + 26, tw = 820 - tx;
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = INK; ctx.font = `800 ${Math.round(h * .26)}px ${SHARE_SANS}`;
    ctx.fillText(ellipsis(ctx, r.p.name, tw), tx, y + h * .47);
    ctx.fillStyle = INK_SOFT; ctx.font = `600 ${Math.round(h * .2)}px ${SHARE_SANS}`;
    ctx.fillText(ellipsis(ctx, r.p.where || level(r.note)?.name || '', tw), tx, y + h * .8);
    const [bg, fg] = LEVEL_COLORS[level(r.note)?.cls] || LEVEL_COLORS.ok;
    ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(840, y + h / 2 - 34, 140, 68, 20); ctx.fill();
    ctx.fillStyle = fg; ctx.font = `800 34px ${SHARE_SANS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(fmt(r.note), 910, y + h / 2 + 1);
    ctx.textBaseline = 'alphabetic';
  });
  return canvas;
}

/* ---------- Teilen-Fenster ---------- */
async function openShare(build, fileName, text) {
  const dlg = document.createElement('div');
  dlg.className = 'share-dlg';
  dlg.innerHTML = `
    <div class="share-box" role="dialog" aria-modal="true">
      <div class="share-prev"><div class="share-wait">Bild wird erstellt …</div></div>
      <div class="share-btns">
        <button class="primary" id="shareGo" disabled>📤 Teilen</button>
        <button id="shareSave" disabled>⬇︎ Bild speichern</button>
        <button id="shareClose">Schließen</button>
      </div>
      <p class="share-hint" id="shareHint"></p>
    </div>`;
  document.body.append(dlg);
  document.body.classList.add('share-open');
  let url = '';
  const close = () => { dlg.remove(); document.body.classList.remove('share-open'); if (url) URL.revokeObjectURL(url); document.removeEventListener('keydown', onKey); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  dlg.onclick = e => { if (e.target === dlg) close(); };
  $('shareClose').onclick = close;

  try {
    await Promise.all(['600 70px Fraunces', 'italic 600 66px Fraunces', '600 30px Manrope', '800 30px Manrope']
      .map(f => document.fonts.load(f).catch(() => {})));
    const canvas = await build();
    const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
    if (!dlg.isConnected) return;
    url = URL.createObjectURL(blob);
    dlg.querySelector('.share-prev').innerHTML = `<img src="${url}" alt="">`;
    const file = new File([blob], fileName, { type: 'image/png' });
    const canShare = navigator.canShare && navigator.canShare({ files: [file] });
    const go = $('shareGo'), save = $('shareSave');
    save.disabled = false;
    save.onclick = () => { const a = document.createElement('a'); a.href = url; a.download = fileName; a.click(); };
    if (canShare) {
      go.disabled = false;
      go.onclick = () => navigator.share({ files: [file], text }).catch(() => {});
      $('shareHint').textContent = 'Im Teilen-Menü WhatsApp, Instagram … auswählen.';
    } else {
      go.hidden = true;
      save.classList.add('primary');
      $('shareHint').textContent = 'Speichere das Bild und lade es dann in WhatsApp oder Instagram hoch.';
    }
  } catch (e) {
    dlg.querySelector('.share-prev').innerHTML = '<div class="share-wait">Das Bild konnte nicht erstellt werden.</div>';
  }
}

const shareFileName = name => (name || 'lernorte').replace(/[\\/:*?"<>|]+/g, '').trim().slice(0, 60) + '.png';
const shareText = () => 'Bewertet mit Lernorte – https://' + SHARE_LINK + '/';

/* ---------- was man teilen kann ---------- */
function sharePlace(id) {
  const rows = rankedPlaces(), row = rows.find(r => r.p.id === id);
  if (!row) return;
  const n = rows.filter(r => r.note !== null).length;
  openShare(() => drawPlaceCard(row, n), shareFileName(row.p.name), `${row.p.name}: ${fmt(row.note)}/10 · ${shareText()}`);
}

function shareTop() {
  const rows = rankedPlaces().filter(r => r.note !== null).slice(0, 10);
  if (!rows.length) return alert('Bewerte zuerst einen Lernort.');
  openShare(() => drawTopCard(rows), shareFileName('Meine Top Lernorte'), `Meine Top ${rows.length} Lernorte · ${shareText()}`);
}

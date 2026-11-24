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

// Text umbrechen, nie abschneiden; sehr lange Wörter werden zur Not mitten im Wort getrennt
function wrapAll(ctx, text, max) {
  const out = [];
  let line = '';
  out.broke = false;
  for (const w of String(text || '').split(/\s+/).filter(Boolean)) {
    const next = line ? line + ' ' + w : w;
    if (ctx.measureText(next).width <= max) { line = next; continue; }
    if (line) out.push(line);
    line = w;
    while (ctx.measureText(line).width > max) {   // Wort allein zu lang
      out.broke = true;
      let cut = line.length - 1;
      while (cut > 1 && ctx.measureText(line.slice(0, cut) + '-').width > max) cut--;
      cut = Math.min(cut, line.length - 3);   // nie nur 1–2 Buchstaben allein in die nächste Zeile
      out.push(line.slice(0, cut) + '-');
      line = line.slice(cut);
    }
  }
  if (line) out.push(line);
  return out;
}
// Größte Schrift (zwischen size und min), bei der der Text in höchstens maxLines Zeilen passt
function fitText(ctx, text, max, font, size, min, maxLines) {
  // lieber kleinere Schrift als ein getrenntes Wort; erst ganz zum Schluss wird getrennt
  for (const allowBreak of [false, true]) {
    for (let s = size; s >= min; s -= 2) {
      ctx.font = font(s);
      const lines = wrapAll(ctx, text, max);
      if (lines.length <= maxLines && (allowBreak || !lines.broke)) return { lines, size: s };
    }
  }
  ctx.font = font(min);
  return { lines: wrapAll(ctx, text, max), size: min };
}
function drawLines(ctx, block, font, x, y, lh) {
  ctx.font = font(block.size);
  block.lines.forEach((l, i) => ctx.fillText(l, x, y + i * block.size * lh));
  return block.lines.length * block.size * lh;
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
// Vorteile/Nachteile als Pillen in Zeilen anordnen (Pillen zu lang für eine Zeile werden umgebrochen)
function layoutPills(ctx, items, max) {
  const font = `700 28px ${SHARE_SANS}`, padX = 22, lineH = 36, gap = 12;
  ctx.font = font;
  const pills = items.map(it => {
    const lines = wrapAll(ctx, it.text, max - 2 * padX);
    const w = Math.min(max, Math.max(...lines.map(l => ctx.measureText(l).width)) + 2 * padX);
    return { ...it, lines, w, h: lines.length * lineH + 20 };
  });
  const rows = [];
  let row = [], rw = 0;
  pills.forEach(p => {
    if (row.length && rw + gap + p.w > max) { rows.push(row); row = []; rw = 0; }
    rw += (row.length ? gap : 0) + p.w; row.push(p);
  });
  if (row.length) rows.push(row);
  const height = rows.reduce((h, r) => h + Math.max(...r.map(p => p.h)) + gap, 0) - (rows.length ? gap : 0);
  return { rows, height, font, padX, lineH, gap };
}

async function drawPlaceCard(row, n) {
  const { canvas, ctx } = shareBase();
  kicker(ctx, 'Mein Lernort', 215);
  const img = await loadImg(row.p.photos?.[0]);
  const W = 900, X = 90;
  const nameFont = s => `600 ${s}px ${SHARE_SERIF}`, whereFont = s => `600 ${s}px ${SHARE_SANS}`, catFont = s => `700 ${s}px ${SHARE_SANS}`;
  const name = fitText(ctx, row.p.name, W, nameFont, 70, 44, 3);
  const where = row.p.where ? fitText(ctx, row.p.where, W, whereFont, 34, 24, 2) : null;
  const pills = layoutPills(ctx, [...(row.p.pros || []).map(t => ({ text: '👍 ' + t, pro: true })), ...(row.p.cons || []).map(t => ({ text: '👎 ' + t, pro: false }))], W);

  // Höhen planen: das Foto bekommt, was übrig bleibt (260–600 px)
  const nameH = name.lines.length * name.size * 1.12, whereH = where ? where.lines.length * where.size * 1.3 + 6 : 0;
  const cardH = 210, pillsH = pills.height ? pills.height + 44 : 0;
  let barH = 66;
  const fixed = 40 + nameH + whereH + 34 + cardH + 44 + pillsH;
  const bottom = SHARE_H - 125, top = 265;
  let ph = bottom - top - fixed - CATS.length * barH;
  if (ph < 260) { barH = Math.max(52, barH - (260 - ph) / CATS.length); ph = Math.max(260, bottom - top - fixed - CATS.length * barH); }
  ph = Math.min(600, ph);

  ctx.save(); ctx.shadowColor = 'rgba(18,56,36,.28)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 24;
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(X, top, W, ph, 40); ctx.fill(); ctx.restore();
  drawPhoto(ctx, img, X, top, W, ph, 40, row);

  let y = top + ph + 40;
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = INK;
  y += drawLines(ctx, name, nameFont, SHARE_W / 2, y, 1.12);
  if (where) { ctx.fillStyle = INK_SOFT; y += 6 + drawLines(ctx, where, whereFont, SHARE_W / 2, y + 6, 1.3); }
  ctx.textBaseline = 'alphabetic';
  y += 34;

  // dunkle Karte mit der Note
  const l = level(row.note);
  ctx.fillStyle = INK; ctx.beginPath(); ctx.roundRect(X, y, W, cardH, 40); ctx.fill();
  ctx.textAlign = 'left'; ctx.fillStyle = '#cdeed7'; ctx.font = `800 28px ${SHARE_SANS}`;
  spaced(ctx, '4px'); ctx.fillText('ENDNOTE', 140, y + 88); spaced(ctx, '0px');
  ctx.fillStyle = 'rgba(255,255,255,.8)';
  const rankText = n > 1 && row.rank ? `Platz ${row.rank} von ${n}` : '';
  const info = fitText(ctx, [l?.name, rankText].filter(Boolean).join(' · ') + (row.ko ? ' · K.-o.' : ''), 460, s => `600 ${s}px ${SHARE_SANS}`, 32, 22, 2);
  ctx.textBaseline = 'top'; drawLines(ctx, info, s => `600 ${s}px ${SHARE_SANS}`, 140, y + 112, 1.2); ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'right'; ctx.fillStyle = '#cdeed7'; ctx.font = `600 150px ${SHARE_SERIF}`;
  ctx.fillText(fmt(row.note), 945, y + 160);
  y += cardH + 44;

  // Vorteile / Nachteile
  if (pills.height) {
    pills.rows.forEach(r => {
      let x = X;
      const rh = Math.max(...r.map(p => p.h));
      r.forEach(p => {
        ctx.fillStyle = p.pro ? '#d6f1df' : '#fde3da';
        ctx.beginPath(); ctx.roundRect(x, y, p.w, p.h, Math.min(28, p.h / 2)); ctx.fill();
        ctx.fillStyle = p.pro ? '#145233' : '#7a2810'; ctx.font = pills.font; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        p.lines.forEach((t, i) => ctx.fillText(t, x + pills.padX, y + 10 + pills.lineH / 2 + i * pills.lineH + 1));
        x += p.w + pills.gap;
      });
      y += rh + pills.gap;
    });
    ctx.textBaseline = 'alphabetic';
    y += 44 - pills.gap;
  }

  // ein Balken pro Kategorie
  y += 30;
  CATS.forEach((c, i) => {
    const k = row.cats[i];
    ctx.textAlign = 'right'; ctx.fillStyle = INK; ctx.font = `800 30px ${SHARE_SANS}`;
    ctx.fillText(pct(k), X + W, y);
    const label = fitText(ctx, c.name, W - 130, catFont, 30, 20, 1);
    ctx.textAlign = 'left'; ctx.font = catFont(label.size); ctx.fillText(label.lines.join(' '), X, y);
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.roundRect(X, y + 14, W, 14, 7); ctx.fill();
    if (k) { ctx.fillStyle = c.color; ctx.beginPath(); ctx.roundRect(X, y + 14, Math.max(14, W * k), 14, 7); ctx.fill(); }
    y += barH;
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
  const titleFont = s => `600 ${s}px ${SHARE_SERIF}`;
  const title = fitText(ctx, rows.length === 1 ? 'Mein Lieblings-Lernort' : `Meine Top ${rows.length} Lernorte`, 940, titleFont, 78, 50, 1);
  ctx.textAlign = 'center'; ctx.fillStyle = INK; ctx.font = titleFont(title.size); ctx.fillText(title.lines[0], SHARE_W / 2, top - 60);
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

    // Name + Adresse: so groß wie möglich, zur Not in zwei Zeilen und kleiner – nie abgeschnitten
    const tx = 185 + cw + 26, tw = 820 - tx;
    const nf = s => `800 ${s}px ${SHARE_SANS}`, sf = s => `600 ${s}px ${SHARE_SANS}`;
    const sub = r.p.where || level(r.note)?.name || '';
    let nb, sb, total;
    for (let k = 1; k >= 0.55; k -= 0.05) {
      nb = fitText(ctx, r.p.name, tw, nf, Math.round(h * .26 * k), Math.round(h * .26 * k), 9);
      sb = fitText(ctx, sub, tw, sf, Math.round(h * .2 * k), Math.round(h * .2 * k), 9);
      total = nb.lines.length * nb.size * 1.1 + (sub ? 6 + sb.lines.length * sb.size * 1.2 : 0);
      if (total <= h - 20) break;
    }
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    let ty = y + (h - total) / 2;
    ctx.fillStyle = INK; ty += drawLines(ctx, nb, nf, tx, ty, 1.1);
    if (sub) { ctx.fillStyle = INK_SOFT; drawLines(ctx, sb, sf, tx, ty + 6, 1.2); }

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

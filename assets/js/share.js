// Share a rating or your top 10 as a picture in Instagram-story size (1080×1920).
// Phones open the share menu (WhatsApp, Instagram …); otherwise the picture is saved.

const SHARE_W = 1080, SHARE_H = 1920;
const SHARE_LINK = 'lepucocozhou.github.io/song-rating';
const SHARE_SERIF = '"Newsreader", Georgia, "Songti SC", "Noto Serif SC", serif';
const SHARE_SANS = '"Instrument Sans", -apple-system, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif';
const INK = '#0f3554', INK_SOFT = '#2d5b7c', ACCENT = '#1d7fb0';

/* ---------- drawing helpers ---------- */
// Covers need CORS to be drawn; a cover that can't be loaded becomes a letter placeholder
function loadCover(src) {
  const big = (src || '').replace(/\d+x\d+bb/, '1000x1000bb');
  const load = url => new Promise(res => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => res(img); img.onerror = () => res(null);
    img.src = url;
  });
  if (!src) return Promise.resolve(null);
  return load(big).then(img => img || src.startsWith('data:') ? img : load(big + (big.includes('?') ? '&' : '?') + 'share'));
}

function drawCover(ctx, img, x, y, size, radius, letter) {
  ctx.save();
  ctx.beginPath(); ctx.roundRect(x, y, size, size, radius); ctx.clip();
  if (img) {
    const s = Math.min(img.width, img.height);
    ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, x, y, size, size);
  } else {
    const g = ctx.createLinearGradient(x, y, x + size, y + size);
    g.addColorStop(0, '#bae6fd'); g.addColorStop(1, '#e9d5ff');
    ctx.fillStyle = g; ctx.fillRect(x, y, size, size);
    ctx.fillStyle = INK; ctx.globalAlpha = .55;
    ctx.font = `600 ${size * .45}px ${SHARE_SANS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText((letter || '♪').trim()[0] || '♪', x + size / 2, y + size / 2);
  }
  ctx.restore();
}

function ellipsis(ctx, text, max) {
  text = String(text || '');
  if (ctx.measureText(text).width <= max) return text;
  while (text && ctx.measureText(text + '…').width > max) text = text.slice(0, -1);
  return text.trimEnd() + '…';
}
// Up to `lines` lines; the last one gets "…" when the text is longer
function wrapLines(ctx, text, max, lines) {
  const words = String(text || '').split(/(\s+)/), out = [];
  let line = '';
  for (const w of words) {
    if (ctx.measureText(line + w).width <= max || !line.trim()) line += w;
    else { out.push(line.trim()); line = w.trimStart(); }
  }
  if (line.trim()) out.push(line.trim());
  // very long single words (or Chinese without spaces): cut by characters
  const fixed = out.flatMap(l => {
    if (ctx.measureText(l).width <= max) return [l];
    const parts = []; let cur = '';
    for (const ch of l) { if (ctx.measureText(cur + ch).width > max) { parts.push(cur); cur = ch; } else cur += ch; }
    return [...parts, cur];
  });
  if (fixed.length <= lines) return fixed;
  return [...fixed.slice(0, lines - 1), ellipsis(ctx, fixed.slice(lines - 1).join(' '), max)];
}

function shareBase() {
  const canvas = document.createElement('canvas');
  canvas.width = SHARE_W; canvas.height = SHARE_H;
  const ctx = canvas.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, SHARE_H);
  g.addColorStop(0, '#b5e6fd'); g.addColorStop(.55, '#e0f5ff'); g.addColorStop(1, '#f4fbff');
  ctx.fillStyle = g; ctx.fillRect(0, 0, SHARE_W, SHARE_H);
  // soft light circles in the background
  [[900, 180, 260, .35], [120, 760, 220, .25], [980, 1500, 300, .3]].forEach(([x, y, r, a]) => {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fill();
  });
  // logo "Song Rating"
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  ctx.font = `600 64px ${SHARE_SERIF}`;
  const w1 = ctx.measureText('Song ').width;
  ctx.font = `italic 600 64px ${SHARE_SERIF}`;
  const w2 = ctx.measureText('Rating').width;
  const x0 = (SHARE_W - w1 - w2) / 2;
  ctx.fillStyle = INK; ctx.font = `600 64px ${SHARE_SERIF}`; ctx.fillText('Song ', x0, 150);
  ctx.fillStyle = ACCENT; ctx.font = `italic 600 64px ${SHARE_SERIF}`; ctx.fillText('Rating', x0 + w1, 150);
  // link at the bottom
  ctx.textAlign = 'center'; ctx.fillStyle = INK_SOFT; ctx.globalAlpha = .7;
  ctx.font = `500 28px ${SHARE_SANS}`; ctx.fillText(SHARE_LINK, SHARE_W / 2, SHARE_H - 60);
  ctx.globalAlpha = 1;
  return { canvas, ctx };
}

function kicker(ctx, text, y) {
  ctx.textAlign = 'center'; ctx.fillStyle = INK_SOFT;
  ctx.font = `700 28px ${SHARE_SANS}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '6px';
  ctx.fillText(text.toLocaleUpperCase(), SHARE_W / 2, y);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
}

/* ---------- one song / album ---------- */
// { kicker, title, sub, cover, final, rankText, parts: [{ name, color, v }] }
async function drawRatingCard(d) {
  const { canvas, ctx } = shareBase();
  kicker(ctx, d.kicker, 215);
  const img = await loadCover(d.cover);
  const size = 560, cx = (SHARE_W - size) / 2, cy = 265;
  ctx.save(); ctx.shadowColor = 'rgba(15,53,84,.28)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 24;
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(cx, cy, size, size, 36); ctx.fill(); ctx.restore();
  drawCover(ctx, img, cx, cy, size, 36, d.title);

  let y = cy + size + 100;
  ctx.textAlign = 'center'; ctx.fillStyle = INK; ctx.font = `600 72px ${SHARE_SERIF}`;
  wrapLines(ctx, d.title, 900, 2).forEach(l => { ctx.fillText(l, SHARE_W / 2, y); y += 80; });
  ctx.fillStyle = INK_SOFT; ctx.font = `500 34px ${SHARE_SANS}`;
  ctx.fillText(ellipsis(ctx, d.sub, 900), SHARE_W / 2, y - 18);
  y += 30;

  // dark score card
  const cardH = 210;
  ctx.fillStyle = INK; ctx.beginPath(); ctx.roundRect(90, y, 900, cardH, 40); ctx.fill();
  ctx.textAlign = 'left'; ctx.fillStyle = '#b5e6fd'; ctx.font = `700 28px ${SHARE_SANS}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '4px';
  ctx.fillText(L('Final score', 'Endwertung', '最终得分').toLocaleUpperCase(), 140, y + 92);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  if (d.rankText) { ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.font = `500 32px ${SHARE_SANS}`; ctx.fillText(d.rankText, 140, y + 145); }
  ctx.textAlign = 'right'; ctx.fillStyle = '#b5e6fd'; ctx.font = `600 160px ${SHARE_SERIF}`;
  ctx.fillText(d.final === null ? '–' : fmt(d.final), 945, y + 162);
  y += cardH + 70;

  // one bar per category
  const rowH = Math.min(74, (SHARE_H - 130 - y) / d.parts.length);
  d.parts.forEach(p => {
    ctx.textAlign = 'left'; ctx.fillStyle = INK; ctx.font = `600 30px ${SHARE_SANS}`;
    ctx.fillText(ellipsis(ctx, p.name, 740), 90, y);
    ctx.textAlign = 'right'; ctx.font = `700 30px ${SHARE_SANS}`;
    ctx.fillText(p.v === null ? '–' : fmt(p.v), 990, y);
    ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.roundRect(90, y + 14, 900, 14, 7); ctx.fill();
    if (p.v) { ctx.fillStyle = p.color; ctx.beginPath(); ctx.roundRect(90, y + 14, Math.max(14, 900 * p.v / 10), 14, 7); ctx.fill(); }
    y += rowH;
  });
  return canvas;
}

/* ---------- top 10 list ---------- */
// { kicker, title, rows: [{ title, sub, cover, final }] }
async function drawTopCard(d) {
  const { canvas, ctx } = shareBase();
  kicker(ctx, d.kicker, 215);
  const imgs = await Promise.all(d.rows.map(r => loadCover(r.cover)));
  // title + list; a short list sits in the middle of the picture
  const rowH = Math.min(142, (SHARE_H - 520) / d.rows.length), h = rowH - 16;
  const top = Math.max(380, (380 + SHARE_H - 140 - d.rows.length * rowH) / 2);
  ctx.textAlign = 'center'; ctx.fillStyle = INK; ctx.font = `600 80px ${SHARE_SERIF}`;
  ctx.fillText(ellipsis(ctx, d.title, 940), SHARE_W / 2, top - 60);
  const medals = ['#f5c542', '#c7d2dc', '#e0a46e'];
  d.rows.forEach((r, i) => {
    const y = top + i * rowH;
    ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.beginPath(); ctx.roundRect(70, y, 940, h, 28); ctx.fill();
    // rank
    const rx = 135, ry = y + h / 2;
    ctx.beginPath(); ctx.arc(rx, ry, 30, 0, Math.PI * 2); ctx.fillStyle = medals[i] || '#dcf0fb'; ctx.fill();
    ctx.fillStyle = INK; ctx.font = `700 30px ${SHARE_SANS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1), rx, ry + 1);
    // cover + text
    const cs = h - 24;
    drawCover(ctx, imgs[i], 185, y + 12, cs, 16, r.title);
    const tx = 185 + cs + 26, tw = 1010 - 170 - tx - 20;
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = INK; ctx.font = `700 ${Math.round(h * .27)}px ${SHARE_SANS}`;
    ctx.fillText(ellipsis(ctx, r.title, tw), tx, y + h * .47);
    ctx.fillStyle = INK_SOFT; ctx.font = `500 ${Math.round(h * .21)}px ${SHARE_SANS}`;
    ctx.fillText(ellipsis(ctx, r.sub, tw), tx, y + h * .8);
    // score chip
    ctx.fillStyle = scoreColor(r.final); ctx.beginPath(); ctx.roundRect(840, y + h / 2 - 34, 140, 68, 20); ctx.fill();
    ctx.fillStyle = INK; ctx.font = `700 34px ${SHARE_SANS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(fmt(r.final), 910, y + h / 2 + 1);
    ctx.textBaseline = 'alphabetic';
  });
  return canvas;
}

/* ---------- share window ---------- */
async function openShare(build, fileName, text) {
  const dlg = document.createElement('div');
  dlg.className = 'share-dlg';
  dlg.innerHTML = `
    <div class="share-box" role="dialog" aria-modal="true">
      <div class="share-prev"><div class="share-wait">${L('Creating picture …', 'Bild wird erstellt …', '正在生成图片…')}</div></div>
      <div class="share-btns">
        <button class="primary" id="shareGo" disabled>📤 ${L('Share', 'Teilen', '分享')}</button>
        <button id="shareSave" disabled>⬇︎ ${L('Save picture', 'Bild speichern', '保存图片')}</button>
        <button id="shareClose">${L('Close', 'Schließen', '关闭')}</button>
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
    await Promise.all([`600 72px Newsreader`, `italic 600 64px Newsreader`, `500 30px "Instrument Sans"`, `700 30px "Instrument Sans"`]
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
      $('shareHint').textContent = L('Pick WhatsApp, Instagram … in the share menu.', 'Im Teilen-Menü WhatsApp, Instagram … auswählen.', '在分享菜单中选择微信、WhatsApp、Instagram……');
    } else {
      go.hidden = true;
      save.classList.add('primary');
      $('shareHint').textContent = L('Save the picture, then post it in WhatsApp or Instagram.', 'Speichere das Bild und lade es dann in WhatsApp oder Instagram hoch.', '保存图片，然后在微信、WhatsApp 或 Instagram 中发布。');
    }
  } catch (e) {
    dlg.querySelector('.share-prev').innerHTML = `<div class="share-wait">${L('The picture could not be created.', 'Das Bild konnte nicht erstellt werden.', '无法生成图片。')}</div>`;
  }
}

const shareFileName = name => (name || 'song-rating').replace(/[\\/:*?"<>|]+/g, '').trim().slice(0, 60) + '.png';
const shareText = () => L('Rated with Song Rating', 'Bewertet mit Song Rating', '用 Song Rating 评分') + ' – https://' + SHARE_LINK + '/';

/* ---------- what can be shared ---------- */
function shareSong(id) {
  const rows = rankedSongs(), row = rows.find(r => r.s.id === id);
  if (!row) return;
  const s = withCover(row.s), n = rows.filter(r => r.final !== null).length;
  openShare(() => drawRatingCard({
    kicker: L('My rating', 'Meine Bewertung', '我的评价'),
    title: s.song, sub: [s.artist, s.album].filter(Boolean).join(' · '), cover: s.artwork, final: row.final,
    rankText: n > 1 ? L(`#${row.rank} of ${n} songs`, `Platz ${row.rank} von ${n} Songs`, `第 ${row.rank} 名 / 共 ${n} 首歌`) : '',
    parts: SONG_CATS.map((c, i) => ({ name: c.name, color: c.color, v: row.cats[i] })),
  }), shareFileName(s.song), `${s.song} – ${s.artist}: ${fmt(row.final)}/10 · ${shareText()}`);
}

function shareAlbum(id) {
  const rows = rankedAlbums(), row = rows.find(r => r.a.id === id);
  if (!row) return;
  const a = row.a, n = rows.filter(r => r.final !== null).length;
  openShare(() => drawRatingCard({
    kicker: L('My album rating', 'Meine Album-Bewertung', '我的专辑评价'),
    title: a.album, sub: [a.artist, a.year].filter(Boolean).join(' · '), cover: a.artwork, final: row.final,
    rankText: n > 1 ? L(`#${row.rank} of ${n} albums`, `Platz ${row.rank} von ${n} Alben`, `第 ${row.rank} 名 / 共 ${n} 张专辑`) : '',
    parts: [{ name: L('Songs avg.', 'Songs Ø', '歌曲平均'), color: '#0ea5e9', v: row.songAvg },
      ...ALBUM_CATS.map((c, i) => ({ name: c.name, color: c.color, v: row.cats[i] }))],
  }), shareFileName(a.album), `${a.album} – ${a.artist}: ${fmt(row.final)}/10 · ${shareText()}`);
}

function shareTop(kind) {
  const songs = kind === 'songs';
  const rows = (songs ? rankedSongs() : rankedAlbums()).filter(r => r.final !== null)
    .sort((a, b) => a.rank - b.rank).slice(0, 10)
    .map(r => songs ? { title: r.s.song, sub: r.s.artist, cover: songCover(r.s), final: r.final }
      : { title: r.a.album, sub: r.a.artist, cover: r.a.artwork, final: r.final });
  if (!rows.length) return alert(L('Rate something first.', 'Bewerte zuerst etwas.', '请先评价一些内容。'));
  const title = songs ? L(`My top ${rows.length} songs`, `Meine Top ${rows.length} Songs`, `我的前 ${rows.length} 首歌`)
    : L(`My top ${rows.length} albums`, `Meine Top ${rows.length} Alben`, `我的前 ${rows.length} 张专辑`);
  openShare(() => drawTopCard({ kicker: L('My ranking', 'Meine Rangliste', '我的排行榜'), title, rows }),
    shareFileName(title), `${title} · ${shareText()}`);
}

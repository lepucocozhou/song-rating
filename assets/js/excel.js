// Excel export (.xlsx) in the look of the page: colored headers, score colors, album covers.
// Uses ExcelJS (assets/vendor/exceljs.min.js), which is only loaded when exporting.

const XL = { title: 'FF0F3554', muted: 'FF5F7A90', line: 'FFD6EEFB', head: 'FFB5E6FD', zebra: 'FFF4FBFF', soft: 'FFE0F5FF' };
const argb = hex => 'FF' + hex.replace('#', '').toUpperCase();
// Mix a color with white (f = share of white), for soft header backgrounds
const tint = (hex, f) => {
  const n = parseInt(hex.replace('#', ''), 16);
  const ch = s => Math.round(((n >> s) & 255) * (1 - f) + 255 * f).toString(16).padStart(2, '0');
  return 'FF' + (ch(16) + ch(8) + ch(0)).toUpperCase();
};
const fill = color => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: color } });

async function exportExcel(toast) {
  const say = t => { if (toast) toast.textContent = t; };
  try {
    say('Excel wird erstellt …');
    if (!window.ExcelJS) await loadScript('assets/vendor/exceljs.min.js');
    const songs = rankedSongs().sort((a, b) => a.rank - b.rank);
    const albums = rankedAlbums().sort((a, b) => a.rank - b.rank);
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Song Rating';

    say('Lade Cover …');
    const covers = await loadCovers(wb, [...songs.map(r => r.s.artwork), ...albums.map(r => r.a.artwork)]);

    songsSheet(wb, songs, covers);
    if (albums.length) albumsSheet(wb, albums, covers);
    answersSheet(wb, 'Song-Antworten', 'Alle Antworten – Songs', songs.map(r => [r.s.song, r.s.artist, r.s.answers]), SONG_CATS);
    if (albums.length) answersSheet(wb, 'Album-Antworten', 'Alle Antworten – Alben', albums.map(r => [r.a.album, r.a.artist, r.a.answers]), ALBUM_CATS);
    weightsSheet(wb);

    const buf = await wb.xlsx.writeBuffer();
    download(`Song Ratings ${new Date().toISOString().slice(0, 10)}.xlsx`, buf,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    say('Excel-Datei erstellt ✓');
  } catch (e) {
    console.error(e);
    say('Export fehlgeschlagen: ' + e.message);
  }
}

// Download small versions of the covers; songs without a reachable cover just get none
async function loadCovers(wb, urls) {
  const map = new Map();
  await Promise.all([...new Set(urls.filter(Boolean))].map(async url => {
    try {
      const res = await fetch(url.replace(/\d+x\d+bb/, '120x120bb'));
      if (!res.ok) return;
      const blob = await res.blob();
      const base64 = await new Promise(resolve => { const fr = new FileReader(); fr.onload = () => resolve(fr.result); fr.readAsDataURL(blob); });
      map.set(url, wb.addImage({ base64, extension: 'jpeg' }));
    } catch (e) { /* offline – export without this cover */ }
  }));
  return map;
}

/* ---------- building blocks ---------- */
function titleRows(ws, title, subtitle, ncols) {
  ws.mergeCells(1, 1, 1, ncols);
  const t = ws.getCell(1, 1);
  t.value = title;
  t.font = { size: 18, bold: true, color: { argb: XL.title } };
  t.fill = fill(XL.head);
  t.alignment = { vertical: 'middle', indent: 1 };
  ws.getRow(1).height = 38;
  ws.mergeCells(2, 1, 2, ncols);
  const s = ws.getCell(2, 1);
  s.value = subtitle;
  s.font = { italic: true, size: 10, color: { argb: XL.muted } };
  s.fill = fill(XL.soft);
  s.alignment = { vertical: 'middle', indent: 1 };
  ws.getRow(2).height = 20;
  ws.getRow(3).height = 8;
}

// cols: [{ label, width, color? }]
function headerRow(ws, rowNo, cols) {
  const row = ws.getRow(rowNo);
  cols.forEach((c, i) => {
    ws.getColumn(i + 1).width = c.width;
    const cell = row.getCell(i + 1);
    cell.value = c.label;
    cell.font = { bold: true, size: 10, color: { argb: c.color ? argb(c.color) : XL.title } };
    cell.fill = fill(c.color ? tint(c.color, 0.8) : XL.head);
    cell.alignment = { vertical: 'middle', horizontal: i < 2 ? 'center' : c.num ? 'center' : 'left', wrapText: true };
    cell.border = { bottom: { style: 'medium', color: { argb: c.color ? argb(c.color) : 'FF38B6F0' } } };
  });
  row.height = 34;
}

function styleDataRow(row, index, ncols, height) {
  row.height = height;
  for (let i = 1; i <= ncols; i++) {
    const cell = row.getCell(i);
    if (index % 2 && !cell.fill) cell.fill = fill(XL.zebra);
    cell.border = { bottom: { style: 'thin', color: { argb: XL.line } } };
    cell.alignment = { vertical: 'middle', ...cell.alignment };
  }
}

function scoreCellStyle(cell, v) {
  cell.value = v === null ? '–' : v;
  cell.numFmt = '0.00';
  cell.font = { bold: true, size: 12, color: { argb: XL.title } };
  cell.fill = fill(argb(scoreColor(v)));
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
}

function catCell(cell, v, color) {
  cell.value = v === null ? '–' : v;
  cell.numFmt = '0.00';
  cell.font = { bold: true, color: { argb: argb(color) } };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
}

function linkCell(cell, text, url) {
  cell.value = url ? { text, hyperlink: url } : text;
  cell.font = { bold: true, size: 11, color: { argb: XL.title } };
}

function rankCell(cell, rank) {
  cell.value = rank <= 3 ? `${medal(rank)} ${rank}` : rank;
  cell.font = { bold: true, size: 12, color: { argb: 'FF38B6F0' } };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
}

function addCover(ws, covers, url, rowNo) {
  const id = covers.get(url);
  if (id !== undefined) ws.addImage(id, { tl: { col: 1.12, row: rowNo - 1 + 0.1 }, ext: { width: 46, height: 46 }, editAs: 'oneCell' });
}

const today = () => new Date().toLocaleDateString('de-DE');

/* ---------- sheets ---------- */
function songsSheet(wb, rows, covers) {
  const ws = wb.addWorksheet('Songs', { properties: { tabColor: { argb: 'FF7DD3FC' } } });
  const cols = [
    { label: 'Rang', width: 8 }, { label: 'Cover', width: 9 }, { label: 'Song', width: 32 }, { label: 'Artist', width: 22 },
    { label: 'Album', width: 26 }, { label: 'Final Score', width: 12, num: true },
    ...SONG_CATS.map(c => ({ label: c.name, width: 14, color: c.color, num: true })),
  ];
  titleRows(ws, '🎵 Song Rating – Songs', `Exportiert am ${today()} · ${rows.length} Songs · sortiert nach Final Score`, cols.length);
  headerRow(ws, 4, cols);
  rows.forEach((r, i) => {
    const rowNo = 5 + i, row = ws.getRow(rowNo);
    rankCell(row.getCell(1), r.rank);
    linkCell(row.getCell(3), r.s.song, r.s.appleUrl);
    row.getCell(4).value = r.s.artist;
    row.getCell(5).value = r.s.album;
    scoreCellStyle(row.getCell(6), r.final);
    SONG_CATS.forEach((c, ci) => catCell(row.getCell(7 + ci), r.cats[ci], c.color));
    styleDataRow(row, i, cols.length, 40);
    addCover(ws, covers, r.s.artwork, rowNo);
  });
  ws.views = [{ state: 'frozen', xSplit: 3, ySplit: 4 }];
  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: cols.length } };
}

function albumsSheet(wb, rows, covers) {
  const ws = wb.addWorksheet('Alben', { properties: { tabColor: { argb: 'FF8B5CF6' } } });
  const cols = [
    { label: 'Rang', width: 8 }, { label: 'Cover', width: 9 }, { label: 'Album', width: 32 }, { label: 'Artist', width: 22 },
    { label: 'Jahr', width: 8, num: true }, { label: 'Album-Score', width: 12, num: true },
    { label: 'Songs Ø', width: 11, color: '#0ea5e9', num: true }, { label: 'Songs bewertet', width: 11, num: true },
    { label: 'Modus', width: 12 },
    ...ALBUM_CATS.map(c => ({ label: c.name, width: 14, color: c.color, num: true })),
  ];
  titleRows(ws, '💿 Song Rating – Alben', `Exportiert am ${today()} · ${rows.length} Alben · sortiert nach Album-Score`, cols.length);
  headerRow(ws, 4, cols);
  rows.forEach((r, i) => {
    const rowNo = 5 + i, row = ws.getRow(rowNo);
    rankCell(row.getCell(1), r.rank);
    linkCell(row.getCell(3), r.a.album, r.a.appleUrl);
    row.getCell(4).value = r.a.artist;
    row.getCell(5).value = r.a.year ? +r.a.year : '';
    row.getCell(5).alignment = { horizontal: 'center' };
    scoreCellStyle(row.getCell(6), r.final);
    catCell(row.getCell(7), r.songAvg, '#0ea5e9');
    row.getCell(8).value = r.countedCount ? `${r.ratedCount}/${r.countedCount}` : '–';
    row.getCell(8).alignment = { horizontal: 'center' };
    row.getCell(9).value = r.a.mode === 'light' ? '⚡ Schnell' : '🎯 Vollständig';
    ALBUM_CATS.forEach((c, ci) => catCell(row.getCell(10 + ci), r.cats[ci], c.color));
    styleDataRow(row, i, cols.length, 40);
    addCover(ws, covers, r.a.artwork, rowNo);
  });
  ws.views = [{ state: 'frozen', xSplit: 3, ySplit: 4 }];
  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: cols.length } };
}

// items: [[title, artist, answers]] – one column per question, grouped under colored category headers
function answersSheet(wb, name, title, items, cats) {
  const ws = wb.addWorksheet(name, { properties: { tabColor: { argb: 'FFB5E6FD' } } });
  const qs = cats.flatMap(c => c.qs.map(q => ({ ...q, cat: c })));
  const ncols = 2 + qs.length;
  titleRows(ws, title, 'N/A = trifft nicht zu · Weiß nicht = ausgelassen (zählt nicht mit)', ncols);

  ['Titel', 'Artist'].forEach((label, i) => {
    ws.mergeCells(4, i + 1, 5, i + 1);
    const cell = ws.getCell(4, i + 1);
    cell.value = label;
    cell.font = { bold: true, color: { argb: XL.title } };
    cell.fill = fill(XL.head);
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getColumn(i + 1).width = i ? 20 : 30;
  });
  let col = 3;
  cats.forEach(c => {
    ws.mergeCells(4, col, 4, col + c.qs.length - 1);
    const g = ws.getCell(4, col);
    g.value = c.name;
    g.font = { bold: true, color: { argb: argb(c.color) } };
    g.fill = fill(tint(c.color, 0.75));
    g.alignment = { horizontal: 'center', vertical: 'middle' };
    c.qs.forEach(q => {
      const cell = ws.getCell(5, col);
      cell.value = q.q;
      cell.font = { size: 9, color: { argb: XL.title } };
      cell.fill = fill(tint(c.color, 0.9));
      cell.alignment = { wrapText: true, vertical: 'top' };
      cell.border = { bottom: { style: 'medium', color: { argb: argb(c.color) } } };
      ws.getColumn(col).width = 14;
      col++;
    });
  });
  ws.getRow(4).height = 22;
  ws.getRow(5).height = 96;

  items.forEach(([t, artist, answers], i) => {
    const row = ws.getRow(6 + i);
    row.getCell(1).value = t;
    row.getCell(1).font = { bold: true };
    row.getCell(2).value = artist;
    qs.forEach((q, qi) => {
      const v = answers[q.id], cell = row.getCell(3 + qi);
      cell.value = v === undefined || v === null ? '' : v === 'skip' ? 'Weiß nicht' : v;
      cell.alignment = { horizontal: 'center' };
      if (typeof v !== 'number') cell.font = { italic: true, size: 9, color: { argb: XL.muted } };
    });
    styleDataRow(row, i, ncols, 20);
  });
  if (items.length) {
    const last = ws.getColumn(ncols).letter;
    ws.addConditionalFormatting({ ref: `C6:${last}${5 + items.length}`, rules: [{
      type: 'colorScale',
      cfvo: [{ type: 'num', value: 1 }, { type: 'num', value: 5.5 }, { type: 'num', value: 10 }],
      color: [{ argb: 'FFFECACA' }, { argb: 'FFFDE68A' }, { argb: 'FF7DD3FC' }],
    }] });
  }
  ws.views = [{ state: 'frozen', xSplit: 2, ySplit: 5 }];
}

function weightsSheet(wb) {
  const ws = wb.addWorksheet('Gewichtung', { properties: { tabColor: { argb: 'FFF59E0B' } } });
  titleRows(ws, '⚖️ Gewichtung', 'Aktuelle Einstellungen – ändern im Tab „Einstellungen“ der Seite', 4);
  headerRow(ws, 4, [{ label: 'Kategorie / Frage', width: 70 }, { label: 'Gewicht', width: 12, num: true },
    { label: 'Anteil am Score', width: 15, num: true }, { label: 'N/A erlaubt', width: 12, num: true }]);
  let r = 5;
  const section = (label, cats) => {
    const head = ws.getRow(r++);
    head.getCell(1).value = label;
    head.getCell(1).font = { bold: true, size: 13, color: { argb: XL.title } };
    head.height = 26;
    const catSum = cats.reduce((s, c) => s + c.w, 0) || 1;
    cats.forEach(c => {
      const row = ws.getRow(r++);
      row.getCell(1).value = c.name;
      row.getCell(2).value = c.w / catSum;
      row.getCell(3).value = c.w / catSum;
      [1, 2, 3, 4].forEach(i => {
        const cell = row.getCell(i);
        cell.fill = fill(tint(c.color, 0.8));
        cell.font = { bold: true, color: { argb: argb(c.color) } };
        if (i > 1) { cell.numFmt = '0.0%'; cell.alignment = { horizontal: 'center' }; }
      });
      const qSum = c.qs.reduce((s, q) => s + q.w, 0) || 1;
      c.qs.forEach(q => {
        const qr = ws.getRow(r++);
        qr.getCell(1).value = q.q;
        qr.getCell(1).alignment = { indent: 2, wrapText: true };
        qr.getCell(2).value = q.w / qSum;
        qr.getCell(3).value = (q.w / qSum) * (c.w / catSum);
        qr.getCell(4).value = q.na ? '✓' : '';
        [2, 3, 4].forEach(i => { qr.getCell(i).alignment = { horizontal: 'center' }; });
        qr.getCell(2).numFmt = qr.getCell(3).numFmt = '0.0%';
        [1, 2, 3, 4].forEach(i => { qr.getCell(i).border = { bottom: { style: 'thin', color: { argb: XL.line } } }; });
      });
    });
    r++;
  };
  section('🎵 Songs', SONG_CATS);
  section('💿 Alben (Album-Fragen)', ALBUM_CATS);
  const rules = ws.getRow(r++);
  rules.getCell(1).value = 'Album-Score: Anteil der Songs';
  rules.getCell(1).font = { bold: true, size: 13, color: { argb: XL.title } };
  [['🎯 Modus „Vollständig“ (alle Songs bewertet)', CONFIG.albumRules.songWeight],
   ['⚡ Modus „Schnell“ (nur bewertete Songs)', CONFIG.albumRules.songWeightLight]].forEach(([label, v]) => {
    const row = ws.getRow(r++);
    row.getCell(1).value = label;
    row.getCell(1).alignment = { indent: 2 };
    row.getCell(3).value = v;
    row.getCell(3).numFmt = '0%';
    row.getCell(3).alignment = { horizontal: 'center' };
  });
}

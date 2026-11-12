// Builds the downloadable menu PDF in the style of the printed card.
// Always uses the current menu data, so new items and prices appear automatically.
import PDFDocument from 'pdfkit';
import * as FONTS from './fonts.mjs';

const RED = '#C0392B';
const INK = '#1C1B19';
const PAPER = '#F5F2EC';
const MUTED = '#5C564D';
const LEADER = '#8A847A';

const PAGE_W = 595.28; // A4 in points
const PAGE_H = 841.89;
const MARGIN_X = 44;
const MARGIN_TOP = 46;
const MARGIN_BOTTOM = 58;
const GAP = 30;
const COL_W = (PAGE_W - MARGIN_X * 2 - GAP) / 2;

const TEXT = {
  en: {
    note: 'Prices in euros. Prices and availability may change. Ask our staff about allergens.',
    special: 'Special',
    footer: 'Vienna Konditorei  ·  Plaats 30, 2513 AE Den Haag  ·  06 14728081',
    title: 'Menu',
  },
  nl: {
    note: "Prijzen in euro's. Prijzen en beschikbaarheid kunnen wijzigen. Vraag ons team naar allergenen.",
    special: 'Special',
    footer: 'Vienna Konditorei  ·  Plaats 30, 2513 AE Den Haag  ·  06 14728081',
    title: 'Menu',
  },
};

function formatPrice(value, lang) {
  if (value === null || value === undefined || value === '') return '';
  const n = Number(value).toFixed(2);
  return lang === 'nl' ? '€ ' + n.replace('.', ',') : '€' + n;
}

export function buildMenuPdf(menu, lang = 'en') {
  return new Promise((resolve, reject) => {
    const t = TEXT[lang] || TEXT.en;
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      font: null, // we only use our own embedded fonts
      autoFirstPage: false,
      info: { Title: 'Vienna Konditorei ' + t.title, Author: 'Vienna Konditorei' },
      lang: lang === 'nl' ? 'nl-NL' : 'en-GB',
    });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    for (const [name, b64] of Object.entries(FONTS)) {
      doc.registerFont(name, Buffer.from(b64, 'base64'));
    }

    let col = 0;
    let y = 0;
    let top = MARGIN_TOP;
    const bottom = PAGE_H - MARGIN_BOTTOM;
    const colX = () => MARGIN_X + col * (COL_W + GAP);

    function footer() {
      doc.font('body').fontSize(7).fillColor(MUTED);
      doc.text(t.footer, MARGIN_X, PAGE_H - 34, { width: PAGE_W - MARGIN_X * 2, align: 'center', lineBreak: false, characterSpacing: 0.4 });
    }

    function newPage(first) {
      doc.addPage();
      doc.rect(0, 0, PAGE_W, PAGE_H).fill(PAPER);
      if (first) {
        // Text logo, like the header of the website
        doc.font('displayBold').fontSize(36).fillColor(INK);
        const logo = 'VIENNA';
        const lw = doc.widthOfString(logo, { characterSpacing: 6 }) - 6;
        doc.text(logo, (PAGE_W - lw) / 2, 40, { characterSpacing: 6, lineBreak: false });
        doc.font('bodyMedium').fontSize(6.5);
        const sub = 'KONDITOREI';
        const sw = doc.widthOfString(sub, { characterSpacing: 4.2 }) - 4.2;
        doc.text(sub, (PAGE_W - sw) / 2, 80, { characterSpacing: 4.2, lineBreak: false });
        doc.moveTo(MARGIN_X, 104).lineTo(PAGE_W - MARGIN_X, 104).lineWidth(0.75).strokeColor(RED).stroke();
        top = 126;
      } else {
        top = MARGIN_TOP;
      }
      footer();
      col = 0;
      y = top;
    }

    function ensure(height) {
      if (y + height <= bottom) return;
      if (col === 0) { col = 1; y = top; } else { newPage(false); }
    }

    // ---- measuring ----
    function itemMetrics(item) {
      const price = formatPrice(item.price, lang);
      doc.font('display').fontSize(11);
      const priceW = price ? doc.widthOfString(price, { characterSpacing: 0.3 }) : 0;
      const pad = item.highlight ? 9 : 0;
      const innerW = COL_W - pad * 2;
      const nameMax = innerW - (price ? priceW + 14 : 0);
      const name = String(item.name || '').toUpperCase();
      const nameH = doc.heightOfString(name, { width: nameMax, characterSpacing: 0.5, lineGap: 0 });
      const nameW = Math.min(doc.widthOfString(name, { characterSpacing: 0.5 }), nameMax);
      const single = nameH < 18;
      let descH = 0;
      const desc = item.desc && item.desc[lang] ? String(item.desc[lang]) : '';
      if (desc) {
        doc.font('body').fontSize(7.6);
        descH = doc.heightOfString(desc, { width: innerW, lineGap: 1 }) + 1.5;
      }
      const labelH = item.highlight ? 11 : 0;
      const height = pad * 2 + labelH + nameH + descH;
      return { price, priceW, pad, innerW, nameMax, name, nameH, nameW, single, desc, descH, labelH, height };
    }

    function drawItem(item) {
      const m = itemMetrics(item);
      ensure(m.height + 5.2);
      const x0 = colX();
      let x = x0 + m.pad;
      let yy = y + m.pad;
      if (item.highlight) {
        doc.rect(x0 + 0.4, y + 0.4, COL_W - 0.8, m.height - 0.8).lineWidth(0.75).fillAndStroke('#FFFFFF', RED);
        doc.font('bodyMedium').fontSize(6).fillColor(RED);
        doc.text(t.special.toUpperCase(), x, yy, { characterSpacing: 1.6, lineBreak: false });
        yy += m.labelH;
      }
      doc.font('display').fontSize(11).fillColor(INK);
      doc.text(m.name, x, yy, { width: m.nameMax, characterSpacing: 0.5, lineGap: 0 });
      if (m.price) {
        const px = x + m.innerW - m.priceW;
        doc.text(m.price, px, yy, { characterSpacing: 0.3, lineBreak: false });
        if (m.single) {
          const ly = yy + 9.2;
          const lx1 = x + m.nameW + 5;
          const lx2 = px - 5;
          if (lx2 - lx1 > 8) {
            doc.save();
            doc.moveTo(lx1, ly).lineTo(lx2, ly).lineWidth(0.7).dash(0.7, { space: 2.1 }).strokeColor(LEADER).stroke();
            doc.restore();
          }
        }
      }
      yy += m.nameH;
      if (m.desc) {
        doc.font('body').fontSize(7.6).fillColor(MUTED);
        doc.text(m.desc, x, yy + 0.5, { width: m.innerW, lineGap: 1 });
      }
      y += m.height + 5.2;
    }

    function drawCategoryHead(cat, firstItemHeight) {
      const headH = 34;
      ensure(headH + firstItemHeight + 10);
      if (y > top) y += 14; // space above a category that does not start a column
      const x = colX();
      doc.font('display').fontSize(19).fillColor(RED);
      const title = String(cat.title[lang] || cat.title.en || '').toUpperCase();
      doc.text(title, x, y, { characterSpacing: 1.2, lineBreak: false });
      const tw = doc.widthOfString(title, { characterSpacing: 1.2 });
      if (cat.note && cat.note[lang]) {
        doc.font('accent').fontSize(10).fillColor(MUTED);
        const note = String(cat.note[lang]);
        const nw = doc.widthOfString(note);
        if (tw + nw + 10 < COL_W) doc.text(note, x + COL_W - nw, y + 9, { lineBreak: false });
      }
      doc.moveTo(x, y + 24).lineTo(x + COL_W, y + 24).lineWidth(0.75).strokeColor(RED).stroke();
      y += headH;
    }

    function drawGroupTitle(group, nextHeight) {
      ensure(18 + nextHeight);
      const x = colX();
      y += 4;
      doc.font('display').fontSize(9.5).fillColor(INK);
      const title = String(group.title[lang] || group.title.en || '').toUpperCase();
      doc.text(title, x, y, { characterSpacing: 1.8, lineBreak: false });
      if (group.note && group.note[lang]) {
        const tw = doc.widthOfString(title, { characterSpacing: 1.8 });
        doc.font('accent').fontSize(9.5).fillColor(MUTED);
        doc.text(String(group.note[lang]), x + tw + 6, y - 0.5, { lineBreak: false });
      }
      y += 16;
    }

    newPage(true);
    for (const cat of menu.categories || []) {
      const groups = (cat.groups || []).filter((g) => g.items && g.items.length);
      if (!groups.length) continue;
      const first = itemMetrics(groups[0].items[0]).height + (groups[0].title ? 22 : 0);
      drawCategoryHead(cat, first);
      for (const group of groups) {
        if (group.title && (group.title[lang] || group.title.en)) {
          drawGroupTitle(group, itemMetrics(group.items[0]).height);
        }
        for (const item of group.items) drawItem(item);
        y += 4;
      }
    }

    // Closing note under the last column
    doc.font('accent').fontSize(10);
    const noteH = doc.heightOfString(t.note, { width: COL_W }) + 22;
    ensure(noteH);
    const nx = colX();
    doc.moveTo(nx, y + 8).lineTo(nx + COL_W, y + 8).lineWidth(0.5).strokeColor(LEADER).stroke();
    doc.fillColor(MUTED).text(t.note, nx, y + 16, { width: COL_W });

    doc.end();
  });
}

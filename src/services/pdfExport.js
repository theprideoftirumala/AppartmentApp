/**
 * PDF Export Service
 * Generates comprehensive monthly financial reports as downloadable/shareable PDFs
 * 
 * Includes:
 * - Financial summary (opening, collected, spent, available)
 * - Payment received (flat-wise)
 * - Expenses (detailed + category)
 */

import jsPDF from 'jspdf';
import {
  ACTIVITY_REPORT_NOTE,
  FEATURES,
  REPORT_NOTE_LINES,
  REPORT_NOTE_TITLE,
  REPORT_WATER_QUOTE,
  REPORT_WATER_QUOTE_BY,
  SOCIETY_DISCLAIMER,
} from '../config/constants';
import { stillDueHighlights, ytdChartRows } from '../utils/expertReport';
import { openingCardLabel } from '../utils/ledgerMath';
import { previousMonthLabel } from '../utils/months';
import { shareReportText, stillDueResidentCopy, ytdRowsThroughMonth } from '../utils/reportViewModel';

/** Ivory paper, espresso ink, India-flag saffron accents, forest / terracotta figures. */
const TONE = {
  saffronTop: [255, 214, 168],
  saffron: [255, 176, 92],
  saffronDeep: [255, 153, 51],
  headerInk: [46, 32, 20],
  section: [138, 74, 38],
  ink: [46, 32, 20],
  muted: [96, 74, 56],
  collect: [31, 122, 76],
  collectBg: [232, 245, 236],
  spend: [184, 78, 64],
  spendBg: [252, 238, 234],
  opening: [61, 107, 153],
  openingBg: [236, 243, 248],
  noteBg: [255, 247, 234],
  noteInk: [102, 48, 16],
  discBg: [252, 248, 241],
  pending: [176, 112, 48],
  shadow: [214, 198, 178],
  paper: [251, 246, 238],
  stamp: [42, 74, 134],
  tableHead: [138, 74, 38],
};

function mixRgb(rgb, other, amount) {
  return rgb.map((c, i) => Math.round(c * (1 - amount) + other[i] * amount));
}

function drawRaisedCard(doc, x, y, w, h, fill) {
  doc.setFillColor(228, 216, 200);
  doc.roundedRect(x + 1.1, y + 1.5, w, h, 2.2, 2.2, 'F');
  doc.setFillColor(240, 230, 218);
  doc.roundedRect(x + 0.45, y + 0.65, w, h, 2.2, 2.2, 'F');
  doc.setFillColor(...fill);
  doc.roundedRect(x, y, w, h, 2.2, 2.2, 'F');
  doc.setFillColor(...mixRgb(fill, [255, 255, 255], 0.58));
  doc.roundedRect(x + 0.6, y + 0.35, w - 1.2, 1.5, 1.2, 1.2, 'F');
}

function draw3dBar(doc, x, baseY, w, h, rgb) {
  const dx = 3.6;
  const dy = 2;
  const top = baseY - h;
  const light = mixRgb(rgb, [255, 255, 255], 0.28);
  const dark = mixRgb(rgb, [28, 18, 12], 0.3);
  doc.setFillColor(226, 214, 198);
  doc.ellipse(x + w / 2 + 1.8, baseY + 1.8, w / 2 + 3, 1.35, 'F');
  doc.setFillColor(238, 228, 214);
  doc.ellipse(x + w / 2 + 0.6, baseY + 1.1, w / 2 + 1.1, 0.7, 'F');
  doc.setFillColor(...dark);
  doc.triangle(x + w, top, x + w + dx, top - dy, x + w + dx, baseY - dy, 'F');
  doc.triangle(x + w, top, x + w + dx, baseY - dy, x + w, baseY, 'F');
  doc.setFillColor(...mixRgb(light, [255, 248, 236], 0.22));
  doc.triangle(x, top, x + dx, top - dy, x + w + dx, top - dy, 'F');
  doc.triangle(x, top, x + w + dx, top - dy, x + w, top, 'F');
  const strips = 14;
  for (let i = 0; i < strips; i += 1) {
    const t = i / (strips - 1);
    doc.setFillColor(...mixRgb(light, rgb, 0.08 + t * 0.92));
    doc.rect(x, top + (h * i) / strips, w, h / strips + 0.2, 'F');
  }
  doc.setFillColor(...mixRgb(light, [255, 255, 255], 0.5));
  doc.rect(x, top, 0.9, h, 'F');
}

const PDF_FONT = 'NotoSans';
let cachedFontBase64 = null;
let rupeeFontReady = false;

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function loadRupeeFont(doc) {
  if (!cachedFontBase64) {
    const url = `${import.meta.env.BASE_URL}fonts/NotoSans-Regular.ttf`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Rupee font missing');
    cachedFontBase64 = arrayBufferToBase64(await res.arrayBuffer());
  }
  doc.addFileToVFS('NotoSans-Regular.ttf', cachedFontBase64);
  doc.addFont('NotoSans-Regular.ttf', PDF_FONT, 'normal');
  doc.addFont('NotoSans-Regular.ttf', PDF_FONT, 'bold');
  rupeeFontReady = true;
}

function pdfFont(doc, style = 'normal') {
  doc.setFont(rupeeFontReady ? PDF_FONT : 'helvetica', style);
}

/**
 * ₹ when the Unicode font loaded; otherwise ASCII fallback so the PDF still builds.
 */
function formatCurrency(amount) {
  const prefix = rupeeFontReady ? '₹' : 'Rs. ';
  return prefix + Number(amount || 0).toLocaleString('en-IN');
}

/**
 * Draw a section header
 */
function drawCompareBars(doc, collection, expenses, y, margin, contentWidth) {
  const max = Math.max(Number(collection) || 0, Number(expenses) || 0, 1);
  const barMax = 24;
  const collectH = Math.max(4, ((Number(collection) || 0) / max) * barMax);
  const spendH = Math.max(4, ((Number(expenses) || 0) / max) * barMax);
  const colW = (contentWidth - 16) / 2;
  const barW = Math.min(18, colW - 22);
  const base = y + 32;
  doc.setFontSize(8);
  pdfFont(doc, 'bold');
  doc.setTextColor(...TONE.ink);
  doc.text('Collected and spent this month', margin, y + 4);
  draw3dBar(doc, margin + 14, base, barW, collectH, TONE.collect);
  draw3dBar(doc, margin + colW + 14, base, barW, spendH, TONE.spend);
  pdfFont(doc, 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...TONE.collect);
  doc.text(`Collected  ${formatCurrency(collection)}`, margin + 8, base + 7);
  doc.setTextColor(...TONE.spend);
  doc.text(`Spent  ${formatCurrency(expenses)}`, margin + colW + 8, base + 7);
  return base + 12;
}

function drawFriendlyNote(doc, y, margin, contentWidth, title, lines, textInsetRight = 0) {
  const wrapped = lines.flatMap((line) => doc.splitTextToSize(line, contentWidth - 14 - textInsetRight));
  const height = 14 + wrapped.length * 4.2;
  y = checkPageBreak(doc, y, margin, height + 6);
  drawRaisedCard(doc, margin, y, contentWidth, height, TONE.noteBg);
  doc.setFillColor(...TONE.saffron);
  doc.roundedRect(margin, y, 2.4, height, 1, 1, 'F');
  doc.setFontSize(9);
  pdfFont(doc, 'bold');
  doc.setTextColor(...TONE.noteInk);
  doc.text(title, margin + 8, y + 7);
  doc.setFontSize(7.5);
  pdfFont(doc, 'normal');
  doc.setTextColor(...TONE.ink);
  doc.text(wrapped, margin + 8, y + 13);
  return y + height + 5;
}

function drawSectionHeader(doc, text, y, pageWidth, margin) {
  const w = pageWidth - 2 * margin;
  doc.setFillColor(...TONE.shadow);
  doc.rect(margin + 0.6, y + 0.7, w, 9, 'F');
  doc.setFillColor(...TONE.section);
  doc.rect(margin, y, w, 9, 'F');
  doc.setFillColor(...mixRgb(TONE.section, [255, 220, 170], 0.28));
  doc.rect(margin, y, w, 1.4, 'F');
  doc.setTextColor(255, 250, 242);
  doc.setFontSize(10);
  pdfFont(doc, 'bold');
  doc.text(text, margin + 4, y + 6.5);
  return y + 9;
}

/**
 * Draw a table header row
 */
function drawTableHeader(doc, headers, colWidths, y, margin, contentWidth) {
  doc.setFillColor(...TONE.tableHead);
  doc.rect(margin, y, contentWidth, 7.4, 'F');
  doc.setFillColor(...mixRgb(TONE.tableHead, [255, 220, 180], 0.22));
  doc.rect(margin, y, contentWidth, 1.2, 'F');
  doc.setTextColor(255, 250, 242);
  doc.setFontSize(7.6);
  pdfFont(doc, 'bold');

  let colX = margin + 2;
  headers.forEach((header, i) => {
    doc.text(header, colX, y + 5.2);
    colX += colWidths[i];
  });
  return y + 7.4;
}

/**
 * Check if we need a new page, add page break if needed
 */
function checkPageBreak(doc, y, margin, needed = 20) {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - 20) {
    doc.addPage();
    washPaper(doc);
    return margin;
  }
  return y;
}


async function createPdfDoc() {
  const doc = new jsPDF('p', 'mm', 'a4');
  try {
    await loadRupeeFont(doc);
  } catch {
    rupeeFontReady = false;
  }
  return doc;
}

function pageMetrics(doc) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  return { pageWidth, margin, contentWidth: pageWidth - 2 * margin };
}

function stampMonthLabel(month) {
  if (month && /[A-Za-z]{3}-\d{2}/.test(String(month))) return String(month);
  return new Date().toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }).replace(/\s+/g, '-');
}

function addFooter(doc, reportData, pageNum) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const footerY = pageHeight - 10;

  doc.setDrawColor(200, 200, 200);
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

  doc.setFontSize(6.5);
  doc.setTextColor(150, 150, 150);
  pdfFont(doc, 'normal');
  doc.text(
    reportData.footerLine
      || `${reportData.apartmentName} | Monthly Report ${reportData.month} | Treasurer: Flat ${reportData.config?.TREASURER_FLAT || '401'} | President: Flat ${reportData.config?.PRESIDENT_FLAT || '102'}`,
    margin,
    footerY,
  );
  doc.text(`Page ${pageNum}`, pageWidth - margin, footerY, { align: 'right' });
}

function stampFooters(doc, reportData) {
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i += 1) {
    doc.setPage(i);
    addFooter(doc, reportData, i);
  }
}

function drawArcText(doc, text, cx, cy, radius, startDeg, endDeg) {
  const chars = String(text).split('');
  chars.forEach((ch, i) => {
    const t = chars.length === 1 ? 0.5 : i / (chars.length - 1);
    const deg = startDeg + (endDeg - startDeg) * t;
    const rad = (deg * Math.PI) / 180;
    const x = cx + radius * Math.cos(rad);
    const y = cy + radius * Math.sin(rad);
    doc.text(ch, x, y, { align: 'center', baseline: 'middle', angle: -(deg + 90) });
  });
}

function drawVerifiedTick(doc, cx, cy, ink) {
  doc.setDrawColor(...ink);
  doc.setLineWidth(0.45);
  doc.circle(cx, cy, 2.35, 'S');
  doc.setLineWidth(0.62);
  doc.line(cx - 1.15, cy + 0.1, cx - 0.25, cy + 1.05);
  doc.line(cx - 0.25, cy + 1.05, cx + 1.35, cy - 1.05);
}

function drawMonthSeal(doc, monthLabel, cx, cy) {
  const ink = [42, 74, 134];
  const label = stampMonthLabel(monthLabel);

  doc.setFillColor(217, 207, 192);
  doc.ellipse(cx + 1.8, cy + 9.2, 15.8, 2.2, 'F');
  doc.setFillColor(215, 227, 244);
  doc.ellipse(cx + 0.8, cy + 0.4, 16.4, 15.6, 'F');
  doc.setFillColor(183, 203, 230);
  doc.ellipse(cx - 0.8, cy - 0.6, 15.2, 14.8, 'F');
  doc.setFillColor(142, 173, 216);
  doc.ellipse(cx + 0.5, cy + 0.7, 14.4, 13.8, 'F');
  doc.setFillColor(207, 224, 242);
  doc.ellipse(cx - 0.3, cy - 0.4, 13.2, 12.6, 'F');
  doc.setFillColor(232, 240, 250);
  doc.ellipse(cx - 3.4, cy - 4.2, 4.2, 2.6, 'F');
  doc.setFillColor(155, 184, 220);
  doc.ellipse(cx + 5.8, cy + 5.2, 3.4, 2.1, 'F');
  doc.setDrawColor(77, 115, 179);
  doc.setLineWidth(0.7);
  doc.ellipse(cx, cy, 12.4, 12, 'S');
  doc.setDrawColor(109, 143, 196);
  doc.setLineWidth(0.35);
  doc.ellipse(cx, cy, 10.8, 10.5, 'S');

  doc.setTextColor(...ink);
  pdfFont(doc, 'bold');
  doc.setFontSize(4.15);
  drawArcText(doc, 'The Pride of Tirumala', cx, cy, 8.7, 208, 332);
  drawVerifiedTick(doc, cx, cy - 0.4, ink);
  doc.setFontSize(10);
  doc.text(label, cx, cy + 5.6, { align: 'center' });
  doc.setFontSize(3.7);
  doc.text('DIGITALLY VERIFIED', cx, cy + 9.2, { align: 'center' });
}

function drawWaterQuote(doc, y, margin, contentWidth, textInsetRight = 0) {
  const quote = `“${REPORT_WATER_QUOTE}”`;
  const wrapped = doc.splitTextToSize(quote, contentWidth - 14 - textInsetRight);
  const height = 14 + wrapped.length * 4.2;
  y = checkPageBreak(doc, y, margin, height + 6);
  drawRaisedCard(doc, margin, y, contentWidth, height, TONE.openingBg);
  doc.setFillColor(...TONE.stamp);
  doc.roundedRect(margin, y, 2.4, height, 1, 1, 'F');
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(...TONE.stamp);
  doc.text(wrapped, margin + 8, y + 6.5);
  pdfFont(doc, 'normal');
  doc.setFontSize(6.6);
  doc.setTextColor(77, 115, 179);
  doc.text(`— ${REPORT_WATER_QUOTE_BY}`, margin + 8, y + height - 4);
  return y + height + 5;
}

function finishWithNotesAndSeal(doc, y, margin, contentWidth, noteLines, monthLabel, reportData, options = {}) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const stampReserve = 34;

  y = drawFriendlyNote(doc, y, margin, contentWidth, REPORT_NOTE_TITLE, noteLines, stampReserve);
  if (options.waterQuote) {
    y = drawWaterQuote(doc, y, margin, contentWidth, stampReserve);
  }
  y = drawDisclaimerBlock(doc, y, margin, contentWidth, stampReserve);

  const cx = pageWidth - 28;
  const cy = Math.max(22, Math.min(pageHeight - 28, y - 22));
  drawMonthSeal(doc, monthLabel, cx, cy);
  stampFooters(doc, reportData);
}

function drawHeaderBanner(doc, pageWidth, { title, subtitle, line3, meta }) {
  const height = 50;
  doc.setFillColor(...TONE.paper);
  doc.rect(0, 0, pageWidth, height + 3, 'F');
  doc.setFillColor(...TONE.saffronDeep);
  doc.rect(0, 0, pageWidth, 5.2, 'F');
  doc.setFillColor(...mixRgb(TONE.saffronDeep, [255, 255, 255], 0.35));
  doc.rect(0, 5.2, pageWidth, 0.7, 'F');
  doc.setFillColor(...TONE.saffronDeep);
  doc.rect(0, height, pageWidth, 2.8, 'F');

  doc.setTextColor(...TONE.headerInk);
  doc.setFontSize(20);
  pdfFont(doc, 'bold');
  doc.text(title, pageWidth / 2, 18, { align: 'center' });

  doc.setFontSize(10.5);
  pdfFont(doc, 'normal');
  doc.setTextColor(...TONE.muted);
  doc.text(subtitle, pageWidth / 2, 26.5, { align: 'center' });

  doc.setFontSize(15);
  pdfFont(doc, 'bold');
  doc.setTextColor(...TONE.section);
  doc.text(line3, pageWidth / 2, 37, { align: 'center' });

  doc.setFontSize(7.6);
  pdfFont(doc, 'normal');
  doc.setTextColor(...TONE.muted);
  doc.text(
    meta || `Prepared on ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}`,
    pageWidth / 2,
    45,
    { align: 'center' },
  );
}

function drawSummaryCards(doc, summaryCards, y, margin, contentWidth) {
  const cardWidth = contentWidth / summaryCards.length - 3;
  summaryCards.forEach((card, i) => {
    const x = margin + i * (cardWidth + 4);
    drawRaisedCard(doc, x, y, cardWidth, 22, card.bg);
    doc.setFontSize(6.8);
    pdfFont(doc, 'normal');
    doc.setTextColor(...TONE.muted);
    doc.text(card.label, x + 3, y + 7.2);
    doc.setFontSize(12);
    pdfFont(doc, 'bold');
    doc.setTextColor(...card.color);
    doc.text(card.value, x + 3, y + 17.2);
  });
  return y + 30;
}

function drawDisclaimerBlock(doc, y, margin, contentWidth, textInsetRight = 0) {
  y = checkPageBreak(doc, y, margin, 28);
  const disclaimerLines = doc.splitTextToSize(SOCIETY_DISCLAIMER, contentWidth - 10 - textInsetRight);
  const discH = 11 + disclaimerLines.length * 4;
  drawRaisedCard(doc, margin, y, contentWidth, discH, TONE.discBg);
  doc.setFontSize(7);
  pdfFont(doc, 'normal');
  doc.setTextColor(...TONE.muted);
  doc.text(disclaimerLines, margin + 4, y + 6.5);
  return y + discH + 4;
}

function washPaper(doc) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFillColor(...TONE.paper);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
}

function drawYearToDate(doc, ledger, throughMonth, y, pageWidth, margin, contentWidth) {
  const rows = ytdChartRows(ytdRowsThroughMonth(ledger, throughMonth));
  if (!rows.length) return y;

  y = checkPageBreak(doc, y, margin, 48 + rows.length * 7);
  y = drawSectionHeader(
    doc,
    FEATURES.MISC_FUNDS ? `4. Year to date through ${throughMonth}` : `3. Year to date through ${throughMonth}`,
    y,
    pageWidth,
    margin,
  );
  y += 6;
  doc.setFillColor(...TONE.collect);
  doc.rect(margin, y - 3, 3.2, 3.2, 'F');
  pdfFont(doc, 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...TONE.ink);
  doc.text('Collected', margin + 5, y);
  doc.setFillColor(...TONE.spend);
  doc.rect(margin + 32, y - 3, 3.2, 3.2, 'F');
  doc.text('Spent', margin + 37, y);
  y += 8;

  const max = Math.max(1, ...rows.flatMap((row) => [row.collection, row.expenses]));
  const barMax = 20;
  const slot = contentWidth / rows.length;
  const barW = Math.min(7, Math.max(4, slot / 3.6));
  const base = y + barMax + 2;
  rows.forEach((row, i) => {
    const x = margin + i * slot + slot / 2 - barW - 1.4;
    draw3dBar(doc, x, base, barW, Math.max(3, (row.collection / max) * barMax), TONE.collect);
    draw3dBar(doc, x + barW + 2.4, base, barW, Math.max(3, (row.expenses / max) * barMax), TONE.spend);
    pdfFont(doc, 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...TONE.muted);
    doc.text(row.month, margin + i * slot + slot / 2, base + 5, { align: 'center' });
  });
  y = base + 10;

  const cols = [32, 38, 38, 38, 34];
  y = drawTableHeader(doc, ['Month', 'Collected', 'Spent', 'Net', 'Available'], cols, y, margin, contentWidth);
  rows.forEach((row, index) => {
    y = checkPageBreak(doc, y, margin, 7);
    const bg = index % 2 === 0 ? [255, 255, 255] : [248, 246, 240];
    doc.setFillColor(...bg);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setFontSize(7.5);
    let colX = margin + 2;
    const vals = [
      row.month,
      formatCurrency(row.collection),
      formatCurrency(row.expenses),
      formatCurrency(row.net),
      formatCurrency(row.running),
    ];
    vals.forEach((val, i) => {
      pdfFont(doc, i === 0 ? 'bold' : 'normal');
      if (i === 1) doc.setTextColor(...TONE.collect);
      else if (i === 2) doc.setTextColor(...TONE.spend);
      else if (i === 3) doc.setTextColor(...(row.net >= 0 ? TONE.collect : TONE.spend));
      else doc.setTextColor(...TONE.ink);
      doc.text(String(val), colX, y + 5);
      colX += cols[i];
    });
    y += 7;
  });
  return y + 8;
}

function drawExpenseReport(doc, expenses, totalExpenses, y, pageWidth, margin, contentWidth, options = {}) {
  const title = options.title || '2. Expenses';
  const emptyText = options.emptyText || 'No expenses recorded for this month.';

  y = checkPageBreak(doc, y, margin, 40);
  y = drawSectionHeader(doc, title, y, pageWidth, margin);
  y += 2;

  if (!expenses || expenses.length === 0) {
    doc.setTextColor(120, 120, 120);
    doc.setFontSize(9);
    pdfFont(doc, 'normal');
    doc.text(emptyText, margin + 4, y + 6);
    return y + 14;
  }

  const expColWidths = [22, 58, 38, 28, 22, 12];
  y = drawTableHeader(doc, ['Date', 'Description', 'Category', 'Amount', 'Mode', 'Bill'], expColWidths, y, margin, contentWidth);

  expenses.forEach((exp, index) => {
    y = checkPageBreak(doc, y, margin, 7);
    const bg = index % 2 === 0 ? [255, 255, 255] : [248, 249, 252];
    doc.setFillColor(...bg);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(7.5);
    pdfFont(doc, 'normal');

    let colX = margin + 2;
    const rowData = [
      String(exp.date || '-').substring(0, 10),
      String(exp.description || '-').substring(0, 28),
      String(exp.category || '-').substring(0, 18),
      formatCurrency(exp.amount),
      exp.paymentMode || '-',
      exp.billReceipt === 'Y' ? 'Yes' : 'No',
    ];
    rowData.forEach((val, i) => {
      if (i === 3) {
        pdfFont(doc, 'bold');
        doc.setTextColor(...TONE.spend);
      }
      doc.text(String(val), colX, y + 5);
      if (i === 3) {
        pdfFont(doc, 'normal');
        doc.setTextColor(60, 60, 60);
      }
      colX += expColWidths[i];
    });
    y += 7;
  });

  doc.setFillColor(...TONE.spendBg);
  doc.rect(margin, y, contentWidth, 8, 'F');
  pdfFont(doc, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...TONE.spend);
  doc.text(`TOTAL EXPENSES: ${formatCurrency(totalExpenses)}`, margin + 4, y + 5.5);
  doc.text(`${expenses.length} transaction(s)`, margin + contentWidth - 50, y + 5.5);
  y += 12;

  y = checkPageBreak(doc, y, margin, 30);
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(9);
  pdfFont(doc, 'bold');
  doc.text('Category-wise Breakdown', margin, y);
  y += 6;

  const categoryTotals = {};
  expenses.forEach((exp) => {
    const cat = exp.category || 'Uncategorized';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(exp.amount || 0);
  });
  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const catColWidths = [90, 40, 50];
  y = drawTableHeader(doc, ['Category', 'Amount', '% of Total'], catColWidths, y, margin, contentWidth);

  sortedCategories.forEach(([category, total], index) => {
    y = checkPageBreak(doc, y, margin, 7);
    const bg = index % 2 === 0 ? [255, 255, 255] : [248, 249, 252];
    doc.setFillColor(...bg);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setFontSize(7.5);
    pdfFont(doc, 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(category, margin + 2, y + 5);
    pdfFont(doc, 'bold');
    doc.text(formatCurrency(total), margin + 92, y + 5);
    pdfFont(doc, 'normal');
    const pct = totalExpenses > 0 ? Math.round((total / totalExpenses) * 100) : 0;
    doc.text(`${pct}%`, margin + 132, y + 5);
    const barX = margin + 140;
    const barW = 35;
    doc.setFillColor(245, 232, 214);
    doc.roundedRect(barX, y + 1.6, barW, 3.2, 0.8, 0.8, 'F');
    if (pct > 0) {
      doc.setFillColor(...TONE.saffronDeep);
      doc.roundedRect(barX, y + 1.6, Math.max(1.2, barW * pct / 100), 3.2, 0.8, 0.8, 'F');
    }
    y += 7;
  });
  return y + 8;
}

export function mapActivityExpenses(expenses) {
  return (expenses || []).map((row) => ({
    date: row.date,
    description: row.description,
    category: row.paidBy ? `Paid by ${row.paidBy}` : 'Activity',
    amount: Number(row.amount) || 0,
    paymentMode: row.paymentMode || '-',
    billReceipt: 'N',
  }));
}

/**
 * Generate a comprehensive monthly report PDF
 * @param {object} reportData - All data for the report
 * @returns {jsPDF} PDF document
 */
export async function generateMonthlyReport(reportData) {
  const {
    month,
    apartmentName,
    config,
    maintenance,
    expenses,
    miscFunds,
    totalCollection,
    totalExpenses,
    totalMiscFunds,
    netBalance,
    cumulativeBalance,
    openingSurplus,
    monthStatus,
    availableStatus,
    flats,
    ledger,
  } = reportData;

  const doc = await createPdfDoc();
  washPaper(doc);
  const { pageWidth, margin, contentWidth } = pageMetrics(doc);
  let y = margin;

  drawHeaderBanner(doc, pageWidth, {
    title: apartmentName || 'The Pride of Tirumala',
    subtitle: 'Monthly apartment accounts',
    line3: month,
    meta: `Prepared on ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}  ·  Treasurer Flat ${config?.TREASURER_FLAT || '401'}  ·  President Flat ${config?.PRESIDENT_FLAT || '102'}`,
  });
  y = 58;

  const opening = Number.isFinite(Number(openingSurplus)) ? Number(openingSurplus) : 612;
  const available = Number.isFinite(Number(cumulativeBalance)) ? Number(cumulativeBalance) : opening + Number(netBalance || 0);
  const thisMonthStatus = monthStatus || (netBalance > 0 ? 'SURPLUS' : netBalance < 0 ? 'DEFICIT' : 'BALANCED');
  const runningStatus = availableStatus || (available > 0 ? 'SURPLUS' : available < 0 ? 'DEFICIT' : 'BALANCED');
  const openingFrom = reportData.openingFromMonth || previousMonthLabel(month) || 'Aug-26';
  const openingTone = opening >= 0 ? TONE.opening : TONE.spend;
  const openingBg = opening >= 0 ? TONE.openingBg : TONE.spendBg;

  const summaryCards = [
    { label: openingCardLabel(opening), value: formatCurrency(opening), color: openingTone, bg: openingBg },
    { label: 'Collected this month', value: formatCurrency(totalCollection), color: TONE.collect, bg: TONE.collectBg },
    { label: 'Spent this month', value: formatCurrency(totalExpenses), color: TONE.spend, bg: TONE.spendBg },
    { label: 'This month', value: formatCurrency(netBalance), color: Number(netBalance) < 0 ? TONE.spend : TONE.collect, bg: Number(netBalance) < 0 ? TONE.spendBg : TONE.collectBg },
    { label: 'Available balance', value: formatCurrency(available), color: available >= 0 ? TONE.collect : TONE.spend, bg: available >= 0 ? TONE.collectBg : TONE.spendBg },
  ];
  y = drawSummaryCards(doc, summaryCards, y, margin, contentWidth);

  const glance = `This month the building collected ${formatCurrency(totalCollection)}, spent ${formatCurrency(totalExpenses)}, and has ${formatCurrency(available)} available.`;
  doc.setFontSize(8.4);
  pdfFont(doc, 'bold');
  doc.setTextColor(...TONE.ink);
  const glanceLines = doc.splitTextToSize(glance, contentWidth - 4);
  doc.text(glanceLines, margin + 1, y);
  y += 4 + glanceLines.length * 4.1;

  // ─── Configuration Summary ─────────────────────────────
  doc.setFillColor(248, 249, 252);
  doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'F');
  doc.setFontSize(7.5);
  pdfFont(doc, 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`Monthly Maintenance: ${formatCurrency(config?.MONTHLY_MAINTENANCE || 3000)} per flat  |  Total Flats: 10  |  Expected: ${formatCurrency((config?.MONTHLY_MAINTENANCE || 3000) * 10)}  |  Brought forward after ${openingFrom}: ${formatCurrency(opening)}`, margin + 4, y + 6);

  const paidCount = (maintenance || []).filter(r => r.status === 'PAID').length;
  const pendingCount = (maintenance || []).filter(r => r.status === 'PENDING').length;
  const partialCount = (maintenance || []).filter(r => r.status === 'PARTIAL').length;
  doc.text(`Collection: ${paidCount} Paid  |  ${pendingCount} Pending  |  ${partialCount} Partial  |  ${Math.round(paidCount / Math.max((maintenance || []).length, 1) * 100)}% collected`, margin + 4, y + 11.5);

  y += 20;

  const due = stillDueHighlights(maintenance);
  if (due.total > 0) {
    y = checkPageBreak(doc, y, margin, 16);
    drawRaisedCard(doc, margin, y, contentWidth, 12, TONE.noteBg);
    pdfFont(doc, 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...TONE.pending);
    doc.text(
      stillDueResidentCopy(due) || `Still to collect  ${formatCurrency(due.total)}`,
      margin + 4,
      y + 7.5,
    );
    y += 16;
  }

  // ─── Remaining / Deficit Summary ──────────────────────
  const isDeficit = netBalance < 0;
  const bgColor = isDeficit ? TONE.spendBg : TONE.collectBg;
  const textColor = isDeficit ? TONE.spend : TONE.collect;
  doc.setFillColor(...bgColor);
  doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'F');
  doc.setFontSize(8.5);
  pdfFont(doc, 'bold');
  doc.setTextColor(...textColor);
  doc.text(`This month — ${thisMonthStatus}: ${formatCurrency(netBalance)}  (collected minus spent)`, margin + 4, y + 5.5);
  doc.setFontSize(8);
  pdfFont(doc, 'bold');
  doc.setTextColor(...(available < 0 ? TONE.spend : TONE.collect));
  doc.text(`Available — ${runningStatus}: ${formatCurrency(available)}`, margin + 4, y + 11);
  doc.setFontSize(7);
  pdfFont(doc, 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`Opening ${formatCurrency(opening)} + collected ${formatCurrency(totalCollection)} − spent ${formatCurrency(totalExpenses)} = ${formatCurrency(available)}`, margin + 4, y + 15.5);
  y += 22;
  y = checkPageBreak(doc, y, margin, 42);
  y = drawCompareBars(doc, totalCollection, totalExpenses, y, margin, contentWidth);
  y += 6;

  // ═══════════════════════════════════════════════════════
  // SECTION 1: Maintenance received
  // ═══════════════════════════════════════════════════════
  y = drawSectionHeader(doc, '1. Maintenance received', y, pageWidth, margin);
  y += 2;

  const payColWidths = [18, 42, 28, 28, 25, 20, 20];
  y = drawTableHeader(doc, ['Flat', 'Owner', 'Due', 'Paid', 'Date', 'Mode', 'Status'], payColWidths, y, margin, contentWidth);

  const sortedMaintenance = [...(maintenance || [])].sort((a, b) => a.flat.localeCompare(b.flat));

  sortedMaintenance.forEach((record, index) => {
    y = checkPageBreak(doc, y, margin, 7);

    const bg = index % 2 === 0 ? [255, 255, 255] : [248, 249, 252];
    doc.setFillColor(...bg);
    doc.rect(margin, y, contentWidth, 7, 'F');

    const flatInfo = flats?.find(f => f.flat === record.flat);
    const ownerName = flatInfo?.ownerName || ('Flat ' + record.flat);

    doc.setFontSize(7.5);
    let colX = margin + 2;
    const rowData = [
      record.flat,
      ownerName.substring(0, 18),
      formatCurrency(record.amountDue),
      formatCurrency(record.amountPaid),
      record.paymentDate || 'Not recorded',
      record.paymentMode || 'N/A',
      record.status || 'PENDING',
    ];

    rowData.forEach((val, i) => {
      if (i === 6) {
        const statusColors = { PAID: TONE.collect, PENDING: TONE.pending, PARTIAL: TONE.opening };
        doc.setTextColor(...(statusColors[val] || [60, 60, 60]));
        pdfFont(doc, 'bold');
      } else {
        doc.setTextColor(60, 60, 60);
        pdfFont(doc, 'normal');
      }
      doc.text(String(val), colX, y + 5);
      colX += payColWidths[i];
    });

    y += 7;
  });

  // Payment totals row
  doc.setFillColor(230, 235, 245);
  doc.rect(margin, y, contentWidth, 8, 'F');
  pdfFont(doc, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(40, 40, 60);
  doc.text('TOTAL', margin + 2, y + 5.5);
  doc.text(formatCurrency(maintenance?.reduce((s, r) => s + r.amountDue, 0) || 0), margin + 62, y + 5.5);
  doc.setTextColor(...TONE.collect);
  doc.text(formatCurrency(totalCollection), margin + 90, y + 5.5);
  y += 14;

  // ═══════════════════════════════════════════════════════
  // SECTION 2: MISC FUNDS
  // ═══════════════════════════════════════════════════════
  if (FEATURES.MISC_FUNDS && miscFunds && miscFunds.length > 0) {
    y = checkPageBreak(doc, y, margin, 30);
    y = drawSectionHeader(doc, '2. MISC FUNDS FROM FLAT OWNERS', y, pageWidth, margin);
    y += 2;

    const mfColWidths = [18, 30, 55, 25, 25, 27];
    y = drawTableHeader(doc, ['Flat', 'Amount', 'Description', 'Date', 'Mode', 'Collected By'], mfColWidths, y, margin, contentWidth);

    miscFunds.forEach((fund, index) => {
      y = checkPageBreak(doc, y, margin, 7);
      const bg = index % 2 === 0 ? [255, 255, 255] : [248, 249, 252];
      doc.setFillColor(...bg);
      doc.rect(margin, y, contentWidth, 7, 'F');

      doc.setFontSize(7.5);
      pdfFont(doc, 'normal');
      doc.setTextColor(60, 60, 60);

      let colX = margin + 2;
      const rowData = [
        fund.flat,
        formatCurrency(fund.amount),
        (fund.description || '-').substring(0, 28),
        fund.date || '-',
        fund.paymentMode || '-',
        (fund.collectedBy || '-').substring(0, 14),
      ];
      rowData.forEach((val, i) => {
        if (i === 1) { pdfFont(doc, 'bold'); doc.setTextColor(50, 80, 200); }
        doc.text(String(val), colX, y + 5);
        if (i === 1) { pdfFont(doc, 'normal'); doc.setTextColor(60, 60, 60); }
        colX += mfColWidths[i];
      });
      y += 7;
    });

    doc.setFillColor(230, 240, 255);
    doc.rect(margin, y, contentWidth, 8, 'F');
    pdfFont(doc, 'bold');
    doc.setFontSize(8);
    doc.setTextColor(50, 80, 200);
    doc.text(`TOTAL MISC FUNDS: ${formatCurrency(totalMiscFunds || 0)}  (${miscFunds.length} contribution(s))`, margin + 4, y + 5.5);
    y += 14;
  }

  y = drawExpenseReport(doc, expenses, totalExpenses, y, pageWidth, margin, contentWidth, {
    title: FEATURES.MISC_FUNDS ? '3. Expenses' : '2. Expenses',
  });

  y = drawYearToDate(doc, ledger, month, y, pageWidth, margin, contentWidth);

  finishWithNotesAndSeal(doc, y, margin, contentWidth, REPORT_NOTE_LINES, month, reportData, {
    waterQuote: true,
  });
  return doc;
}

/**
 * Download the generated PDF
 */
export async function generateActivityReport({ activity, detail }) {
  const collected = Number(detail.collected) || 0;
  const spent = Number(detail.spent) || 0;
  const balance = Number(detail.balance) || collected - spent;
  const expenses = mapActivityExpenses(detail.expenses);
  const members = detail.members || [];

  const doc = await createPdfDoc();
  washPaper(doc);
  const { pageWidth, margin, contentWidth } = pageMetrics(doc);

  drawHeaderBanner(doc, pageWidth, {
    title: activity.name || 'Activity Fund',
    subtitle: 'Activity Fund Report',
    line3: activity.status || 'Open',
  });
  let y = 58;

  y = drawSummaryCards(doc, [
    { label: 'Total Collection', value: formatCurrency(collected), color: TONE.collect, bg: TONE.collectBg },
    { label: 'Total Expenses', value: formatCurrency(spent), color: TONE.spend, bg: TONE.spendBg },
    { label: 'Net Balance', value: formatCurrency(balance), color: balance >= 0 ? TONE.collect : TONE.spend, bg: balance >= 0 ? TONE.collectBg : TONE.spendBg },
  ], y, margin, contentWidth);

  doc.setFillColor(248, 249, 252);
  doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'F');
  doc.setFontSize(7.5);
  pdfFont(doc, 'normal');
  doc.setTextColor(80, 80, 80);
  const joined = members.filter((row) => row.optedIn);
  doc.text(`Target per joining flat: ${formatCurrency(activity.target || 0)}  |  Joining flats: ${joined.length}  |  Expected: ${formatCurrency((Number(activity.target) || 0) * joined.length)}`, margin + 4, y + 6);
  const paidCount = joined.filter((row) => Number(row.amountPaid) >= Number(row.amountDue) && Number(row.amountDue) > 0).length;
  doc.text(`Joined collection: ${paidCount} fully paid  |  ${joined.length} opted in  |  Notes: ${(activity.notes || '—').toString().slice(0, 60)}`, margin + 4, y + 11.5);
  y += 20;

  const isDeficit = balance < 0;
  doc.setFillColor(...(isDeficit ? TONE.spendBg : TONE.collectBg));
  doc.roundedRect(margin, y, contentWidth, 12, 2, 2, 'F');
  doc.setFontSize(8.5);
  pdfFont(doc, 'bold');
  doc.setTextColor(...(isDeficit ? TONE.spend : TONE.collect));
  doc.text(`${isDeficit ? 'DEFICIT THIS ACTIVITY' : 'SURPLUS / REMAINING FUNDS'}: ${formatCurrency(Math.abs(balance))}`, margin + 4, y + 5);
  doc.setFontSize(7);
  pdfFont(doc, 'normal');
  doc.text(`Collection ${formatCurrency(collected)} - Expenses ${formatCurrency(spent)} = ${formatCurrency(balance)}`, margin + 4, y + 9.5);
  y += 16;

  y = drawSectionHeader(doc, '1. Contributions received', y, pageWidth, margin);
  y += 2;
  const payColWidths = [18, 42, 22, 28, 28, 25, 17];
  y = drawTableHeader(doc, ['Flat', 'Owner', 'Join', 'Due', 'Paid', 'Date', 'Mode'], payColWidths, y, margin, contentWidth);

  [...members].sort((a, b) => String(a.flat).localeCompare(String(b.flat))).forEach((row, index) => {
    y = checkPageBreak(doc, y, margin, 7);
    const bg = index % 2 === 0 ? [255, 255, 255] : [248, 249, 252];
    doc.setFillColor(...bg);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setFontSize(7.5);
    pdfFont(doc, 'normal');
    doc.setTextColor(60, 60, 60);
    let colX = margin + 2;
    const values = [
      row.flat,
      String(row.name || `Flat ${row.flat}`).substring(0, 18),
      row.optedIn ? 'Yes' : 'No',
      formatCurrency(row.amountDue),
      formatCurrency(row.amountPaid),
      row.paymentDate || 'Not recorded',
      row.paymentMode || 'N/A',
    ];
    values.forEach((val, i) => {
      if (i === 4) {
        pdfFont(doc, 'bold');
        doc.setTextColor(...TONE.collect);
      } else {
        pdfFont(doc, 'normal');
        doc.setTextColor(60, 60, 60);
      }
      doc.text(String(val), colX, y + 5);
      colX += payColWidths[i];
    });
    y += 7;
  });

  doc.setFillColor(230, 235, 245);
  doc.rect(margin, y, contentWidth, 8, 'F');
  pdfFont(doc, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(40, 40, 60);
  doc.text('TOTAL', margin + 2, y + 5.5);
  doc.text(formatCurrency(members.reduce((sum, row) => sum + (Number(row.amountDue) || 0), 0)), margin + 82, y + 5.5);
  doc.setTextColor(...TONE.collect);
  doc.text(formatCurrency(collected), margin + 110, y + 5.5);
  y += 14;

  y = drawExpenseReport(
    doc,
    expenses,
    spent,
    y,
    pageWidth,
    margin,
    contentWidth,
    { title: '2. Expenses', emptyText: 'No expenses recorded for this activity yet.' },
  );

  finishWithNotesAndSeal(doc, y, margin, contentWidth, [ACTIVITY_REPORT_NOTE], stampMonthLabel(), {
    footerLine: `${activity.name || 'Activity Fund'} | Activity report | Status: ${activity.status || 'Open'}`,
  });
  return doc;
}

export async function downloadActivityReport(payload) {
  const doc = await generateActivityReport(payload);
  const fileName = `TPT_Activity_${(payload.activity?.name || 'Fund').replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
  return fileName;
}

/**
 * Download the generated PDF
 */
export async function downloadReport(reportData) {
  const doc = await generateMonthlyReport(reportData);
  const fileName = `TPT_Report_${reportData.month || 'Monthly'}.pdf`;
  doc.save(fileName);
  return fileName;
}

/**
 * Generate PDF as Blob for sharing
 */
export async function generateReportBlob(reportData) {
  const doc = await generateMonthlyReport(reportData);
  return doc.output('blob');
}

/**
 * Share/Send the PDF report using Web Share API (mobile) or download
 */
export async function shareReport(reportData) {
  const fileName = `TPT_Report_${reportData.month || 'Monthly'}.pdf`;
  const blob = await generateReportBlob(reportData);
  const file = new File([blob], fileName, { type: 'application/pdf' });

  // Try Web Share API first (works on mobile)
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: `${reportData.apartmentName} — ${reportData.month} Report`,
        text: shareReportText(reportData),
        files: [file],
      });
      return { shared: true };
    } catch (err) {
      if (err.name === 'AbortError') {
        return { shared: false, cancelled: true };
      }
      // Fall through to download
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
  return { shared: false, downloaded: true };
}

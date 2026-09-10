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
  SOCIETY_DISCLAIMER,
} from '../config/constants';

/** Light saffron header, cream paper, sage / terracotta figures. */
const TONE = {
  saffronTop: [255, 248, 232],
  saffron: [244, 196, 120],
  saffronDeep: [214, 148, 72],
  headerInk: [92, 48, 22],
  section: [140, 92, 58],
  ink: [62, 48, 36],
  muted: [110, 88, 68],
  collect: [62, 130, 102],
  collectBg: [236, 246, 238],
  spend: [176, 98, 88],
  spendBg: [252, 240, 236],
  opening: [86, 118, 148],
  openingBg: [238, 244, 248],
  noteBg: [255, 248, 236],
  noteInk: [92, 56, 28],
  discBg: [250, 246, 238],
  pending: [176, 120, 72],
  shadow: [210, 196, 176],
  paper: [255, 252, 246],
};

function mixRgb(rgb, other, amount) {
  return rgb.map((c, i) => Math.round(c * (1 - amount) + other[i] * amount));
}

function clampRgb(rgb) {
  return rgb.map((c) => Math.max(0, Math.min(255, Math.round(c))));
}

function drawRaisedCard(doc, x, y, w, h, fill) {
  doc.setFillColor(...TONE.shadow);
  doc.roundedRect(x + 0.8, y + 1, w, h, 2, 2, 'F');
  doc.setFillColor(...fill);
  doc.roundedRect(x, y, w, h, 2, 2, 'F');
  doc.setFillColor(...mixRgb(fill, [255, 255, 255], 0.45));
  doc.roundedRect(x + 0.5, y + 0.35, w - 1, 1.3, 1, 1, 'F');
}

function draw3dBar(doc, x, baseY, w, h, rgb) {
  const depth = 2.4;
  const top = baseY - h;
  doc.setFillColor(...TONE.shadow);
  doc.rect(x + 0.8, baseY, w + depth, 1.3, 'F');
  doc.setFillColor(...mixRgb(rgb, [40, 28, 16], 0.32));
  doc.triangle(x + w, top, x + w + depth, top - depth, x + w + depth, baseY - depth, 'F');
  doc.triangle(x + w, top, x + w + depth, baseY - depth, x + w, baseY, 'F');
  doc.setFillColor(...mixRgb(rgb, [255, 255, 255], 0.38));
  doc.triangle(x, top, x + depth, top - depth, x + w + depth, top - depth, 'F');
  doc.triangle(x, top, x + w + depth, top - depth, x + w, top, 'F');
  doc.setFillColor(...rgb);
  doc.rect(x, top, w, h, 'F');
  doc.setFillColor(...mixRgb(rgb, [255, 255, 255], 0.5));
  doc.rect(x + 0.4, top + 0.4, 1.3, Math.max(h - 0.8, 0.6), 'F');
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
  const barW = Math.min(28, colW - 18);
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

function drawFriendlyNote(doc, y, margin, contentWidth, title, lines) {
  const wrapped = lines.flatMap((line) => doc.splitTextToSize(line, contentWidth - 14));
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
  doc.setFillColor(235, 238, 245);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setTextColor(60, 60, 80);
  doc.setFontSize(7.5);
  pdfFont(doc, 'bold');

  let colX = margin + 2;
  headers.forEach((header, i) => {
    doc.text(header, colX, y + 5);
    colX += colWidths[i];
  });
  return y + 7;
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

/**
 * Add footer to current page
 */
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
    footerY
  );
  doc.text(`Page ${pageNum}`, pageWidth - margin, footerY, { align: 'right' });
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

function drawHeaderBanner(doc, pageWidth, { title, subtitle, line3 }) {
  const height = 50;
  for (let i = 0; i < height; i += 1) {
    const t = i / (height - 1);
    doc.setFillColor(...clampRgb(mixRgb(TONE.saffronTop, TONE.saffron, t)));
    doc.rect(0, i, pageWidth, 1.1, 'F');
  }
  doc.setFillColor(...TONE.saffronDeep);
  doc.rect(0, height, pageWidth, 2.4, 'F');
  doc.setFillColor(...mixRgb(TONE.saffron, [255, 255, 255], 0.45));
  doc.rect(0, height, pageWidth, 0.7, 'F');

  doc.setTextColor(...TONE.headerInk);
  doc.setFontSize(21);
  pdfFont(doc, 'bold');
  doc.text(title, pageWidth / 2, 18, { align: 'center' });

  doc.setFontSize(11);
  pdfFont(doc, 'normal');
  doc.text(subtitle, pageWidth / 2, 28, { align: 'center' });

  doc.setFontSize(14);
  pdfFont(doc, 'bold');
  doc.text(line3, pageWidth / 2, 38, { align: 'center' });

  doc.setFontSize(8);
  pdfFont(doc, 'normal');
  doc.setTextColor(...TONE.muted);
  doc.text(`Prepared on ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}`, pageWidth / 2, 45, { align: 'center' });
}

function drawSummaryCards(doc, summaryCards, y, margin, contentWidth) {
  const cardWidth = contentWidth / summaryCards.length - 3;
  summaryCards.forEach((card, i) => {
    const x = margin + i * (cardWidth + 4);
    drawRaisedCard(doc, x, y, cardWidth, 22, card.bg);
    doc.setFontSize(7);
    pdfFont(doc, 'normal');
    doc.setTextColor(...TONE.muted);
    doc.text(card.label, x + 3, y + 7.5);
    doc.setFontSize(11);
    pdfFont(doc, 'bold');
    doc.setTextColor(...card.color);
    doc.text(card.value, x + 3, y + 17);
  });
  return y + 30;
}

function drawDisclaimerBlock(doc, y, margin, contentWidth) {
  y = checkPageBreak(doc, y, margin, 28);
  const disclaimerLines = doc.splitTextToSize(SOCIETY_DISCLAIMER, contentWidth - 10);
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

function stampFooters(doc, reportData) {
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, reportData, i);
  }
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
    doc.setFillColor(230, 230, 235);
    doc.rect(barX, y + 1.5, barW, 3, 'F');
    doc.setFillColor(79, 124, 255);
    doc.rect(barX, y + 1.5, barW * pct / 100, 3, 'F');
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
  } = reportData;

  const doc = await createPdfDoc();
  washPaper(doc);
  const { pageWidth, margin, contentWidth } = pageMetrics(doc);
  let y = margin;

  drawHeaderBanner(doc, pageWidth, {
    title: apartmentName || 'The Pride of Tirumala',
    subtitle: 'Monthly society accounts',
    line3: month,
  });
  y = 58;

  const opening = Number.isFinite(Number(openingSurplus)) ? Number(openingSurplus) : 612;
  const available = Number.isFinite(Number(cumulativeBalance)) ? Number(cumulativeBalance) : opening + Number(netBalance || 0);
  const thisMonthStatus = monthStatus || (netBalance > 0 ? 'SURPLUS' : netBalance < 0 ? 'DEFICIT' : 'BALANCED');
  const runningStatus = availableStatus || (available > 0 ? 'SURPLUS' : available < 0 ? 'DEFICIT' : 'BALANCED');

  const summaryCards = [
    { label: 'Opening surplus', value: formatCurrency(opening), color: TONE.opening, bg: TONE.openingBg },
    { label: 'Collected this month', value: formatCurrency(totalCollection), color: TONE.collect, bg: TONE.collectBg },
    { label: 'Spent this month', value: formatCurrency(totalExpenses), color: TONE.spend, bg: TONE.spendBg },
    { label: 'Available balance', value: formatCurrency(available), color: available >= 0 ? TONE.collect : TONE.spend, bg: available >= 0 ? TONE.collectBg : TONE.spendBg },
  ];
  y = drawSummaryCards(doc, summaryCards, y, margin, contentWidth);

  // ─── Configuration Summary ─────────────────────────────
  doc.setFillColor(248, 249, 252);
  doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'F');
  doc.setFontSize(7.5);
  pdfFont(doc, 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`Monthly Maintenance: ${formatCurrency(config?.MONTHLY_MAINTENANCE || 3000)} per flat  |  Total Flats: 10  |  Expected: ${formatCurrency((config?.MONTHLY_MAINTENANCE || 3000) * 10)}  |  Opening surplus: ${formatCurrency(opening)}`, margin + 4, y + 6);

  const paidCount = (maintenance || []).filter(r => r.status === 'PAID').length;
  const pendingCount = (maintenance || []).filter(r => r.status === 'PENDING').length;
  const partialCount = (maintenance || []).filter(r => r.status === 'PARTIAL').length;
  doc.text(`Collection: ${paidCount} Paid  |  ${pendingCount} Pending  |  ${partialCount} Partial  |  ${Math.round(paidCount / Math.max((maintenance || []).length, 1) * 100)}% collected`, margin + 4, y + 11.5);

  y += 20;

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

  y = drawFriendlyNote(doc, y, margin, contentWidth, REPORT_NOTE_TITLE, REPORT_NOTE_LINES);
  drawDisclaimerBlock(doc, y, margin, contentWidth);
  stampFooters(doc, reportData);
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

  y = drawFriendlyNote(doc, y, margin, contentWidth, REPORT_NOTE_TITLE, [ACTIVITY_REPORT_NOTE]);
  drawDisclaimerBlock(doc, y, margin, contentWidth);
  stampFooters(doc, {
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
        text: `Monthly financial report for ${reportData.month}. Collection: ${formatCurrency(reportData.totalCollection)}, Expenses: ${formatCurrency(reportData.totalExpenses)}, Balance: ${formatCurrency(reportData.netBalance)}`,
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

  // Fallback: download the file
  const doc = await generateMonthlyReport(reportData);
  doc.save(fileName);
  return { shared: false, downloaded: true };
}

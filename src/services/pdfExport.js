/**
 * PDF Export Service
 * Generates comprehensive monthly financial reports as downloadable/shareable PDFs
 * 
 * Includes:
 * - Financial Summary (collection, expenses, balance)
 * - Payment Received Summary (flat-wise)
 * - Expenses Report (detailed + category-wise)
 * - Activities Performed (from audit log)
 * - Watchman Details
 */

import jsPDF from 'jspdf';
import { maskEmail, maskEmailsInText } from '../config/accessPolicy';
import { FEATURES, SOCIETY_DISCLAIMER } from '../config/constants';
import { maskIdNumber, maskPhone } from '../utils/helpers';

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
function drawSectionHeader(doc, text, y, pageWidth, margin) {
  doc.setFillColor(50, 55, 80);
  doc.rect(margin, y, pageWidth - 2 * margin, 9, 'F');
  doc.setTextColor(255, 255, 255);
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
  doc.setFillColor(25, 28, 42);
  doc.rect(0, 0, pageWidth, 48, 'F');
  doc.setFillColor(79, 124, 255);
  doc.rect(0, 48, pageWidth, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  pdfFont(doc, 'bold');
  doc.text(title, pageWidth / 2, 18, { align: 'center' });

  doc.setFontSize(12);
  pdfFont(doc, 'normal');
  doc.text(subtitle, pageWidth / 2, 28, { align: 'center' });

  doc.setFontSize(14);
  pdfFont(doc, 'bold');
  doc.text(line3, pageWidth / 2, 38, { align: 'center' });

  doc.setFontSize(8);
  pdfFont(doc, 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}`, pageWidth / 2, 45, { align: 'center' });
}

function drawSummaryCards(doc, summaryCards, y, margin, contentWidth) {
  const cardWidth = contentWidth / summaryCards.length - 3;
  summaryCards.forEach((card, i) => {
    const x = margin + i * (cardWidth + 4);
    doc.setFillColor(...card.bg);
    doc.roundedRect(x, y, cardWidth, 20, 2, 2, 'F');
    doc.setFontSize(7);
    pdfFont(doc, 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(card.label, x + 3, y + 7);
    doc.setFontSize(11);
    pdfFont(doc, 'bold');
    doc.setTextColor(...card.color);
    doc.text(card.value, x + 3, y + 16);
  });
  return y + 28;
}

function drawDisclaimerBlock(doc, y, margin, contentWidth) {
  y = checkPageBreak(doc, y, margin, 28);
  const disclaimerLines = doc.splitTextToSize(SOCIETY_DISCLAIMER, contentWidth - 8);
  const discH = 10 + disclaimerLines.length * 4;
  doc.setFillColor(248, 248, 248);
  doc.roundedRect(margin, y, contentWidth, discH, 2, 2, 'F');
  doc.setFontSize(7);
  pdfFont(doc, 'normal');
  doc.setTextColor(90, 90, 90);
  doc.text(disclaimerLines, margin + 4, y + 6);
  return y + discH + 4;
}

function stampFooters(doc, reportData) {
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, reportData, i);
  }
}

function drawExpenseReport(doc, expenses, totalExpenses, y, pageWidth, margin, contentWidth, options = {}) {
  const title = options.title || '3. EXPENSES REPORT';
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
        doc.setTextColor(220, 53, 69);
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

  doc.setFillColor(255, 235, 238);
  doc.rect(margin, y, contentWidth, 8, 'F');
  pdfFont(doc, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(220, 53, 69);
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
    watchman,
    activities,
    remindersCompleted,
  } = reportData;

  const doc = await createPdfDoc();
  const { pageWidth, margin, contentWidth } = pageMetrics(doc);
  let y = margin;

  drawHeaderBanner(doc, pageWidth, {
    title: apartmentName || 'The Pride of Tirumala',
    subtitle: 'Monthly Financial Report',
    line3: month,
  });
  y = 58;

  const opening = Number.isFinite(Number(openingSurplus)) ? Number(openingSurplus) : 612;
  const available = Number.isFinite(Number(cumulativeBalance)) ? Number(cumulativeBalance) : opening + Number(netBalance || 0);
  const thisMonthStatus = monthStatus || (netBalance > 0 ? 'SURPLUS' : netBalance < 0 ? 'DEFICIT' : 'BALANCED');
  const runningStatus = availableStatus || (available > 0 ? 'SURPLUS' : available < 0 ? 'DEFICIT' : 'BALANCED');

  const summaryCards = [
    { label: 'Opening surplus', value: formatCurrency(opening), color: [50, 80, 200], bg: [230, 240, 255] },
    { label: 'Collected this month', value: formatCurrency(totalCollection), color: [40, 167, 69], bg: [235, 250, 240] },
    { label: 'Spent this month', value: formatCurrency(totalExpenses), color: [220, 53, 69], bg: [255, 235, 238] },
    { label: 'Available balance', value: formatCurrency(available), color: available >= 0 ? [40, 167, 69] : [220, 53, 69], bg: available >= 0 ? [235, 250, 240] : [255, 235, 238] },
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
  const bgColor = isDeficit ? [255, 240, 240] : [235, 250, 240];
  const textColor = isDeficit ? [180, 40, 40] : [30, 130, 60];
  doc.setFillColor(...bgColor);
  doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'F');
  doc.setFontSize(8.5);
  pdfFont(doc, 'bold');
  doc.setTextColor(...textColor);
  doc.text(`THIS MONTH ${thisMonthStatus}: ${formatCurrency(netBalance)}  (collected − spent)`, margin + 4, y + 5.5);
  doc.setFontSize(8);
  pdfFont(doc, 'bold');
  doc.setTextColor(...(available < 0 ? [180, 40, 40] : [30, 130, 60]));
  doc.text(`AVAILABLE BALANCE ${runningStatus}: ${formatCurrency(available)}`, margin + 4, y + 11);
  doc.setFontSize(7);
  pdfFont(doc, 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`Opening ${formatCurrency(opening)} + collected ${formatCurrency(totalCollection)} − spent ${formatCurrency(totalExpenses)} = ${formatCurrency(available)}`, margin + 4, y + 15.5);
  y += 22;

  // ═══════════════════════════════════════════════════════
  // SECTION 1: RECEIVED PAYMENT SUMMARY
  // ═══════════════════════════════════════════════════════
  y = drawSectionHeader(doc, '1. RECEIVED PAYMENT SUMMARY', y, pageWidth, margin);
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
        const statusColors = { PAID: [40, 167, 69], PENDING: [220, 53, 69], PARTIAL: [255, 153, 0] };
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
  doc.setTextColor(40, 167, 69);
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

  y = drawExpenseReport(doc, expenses, totalExpenses, y, pageWidth, margin, contentWidth);

  // ═══════════════════════════════════════════════════════
  // SECTION 3: WATCHMAN DETAILS
  // ═══════════════════════════════════════════════════════
  y = checkPageBreak(doc, y, margin, 35);
  y = drawSectionHeader(doc, '4. WATCHMAN DETAILS', y, pageWidth, margin);
  y += 2;

  const activeWatchmen = (watchman || []).filter(w => w.status === 'Active');
  if (activeWatchmen.length > 0) {
    activeWatchmen.forEach((w, i) => {
      y = checkPageBreak(doc, y, margin, 22);

      doc.setFillColor(248, 249, 252);
      doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'F');

      doc.setFontSize(9);
      pdfFont(doc, 'bold');
      doc.setTextColor(40, 40, 60);
      doc.text(`${w.name || 'Watchman ' + (i + 1)}`, margin + 4, y + 6);

      doc.setFontSize(7.5);
      pdfFont(doc, 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(`Phone: ${maskPhone(w.phone)}  |  Shift: ${w.shiftTiming || '-'}  |  Salary: ${formatCurrency(w.salary)}`, margin + 4, y + 11.5);
      doc.text(`Join Date: ${w.joinDate || '-'}  |  ID: ${w.idProofType || '-'} ${maskIdNumber(w.idProofNumber)}  |  Emergency: ${w.emergencyContact || '-'} (${maskPhone(w.emergencyPhone)})`, margin + 4, y + 16);

      y += 22;
    });
  } else {
    doc.setTextColor(120, 120, 120);
    doc.setFontSize(8);
    pdfFont(doc, 'normal');
    doc.text('No active watchman records.', margin + 4, y + 6);
    y += 12;
  }

  y += 4;

  // ═══════════════════════════════════════════════════════
  // SECTION 4: ACTIVITIES PERFORMED THIS MONTH
  // ═══════════════════════════════════════════════════════
  y = checkPageBreak(doc, y, margin, 30);
  y = drawSectionHeader(doc, '5. ACTIVITIES PERFORMED THIS MONTH', y, pageWidth, margin);
  y += 2;

  if (activities && activities.length > 0) {
    // Group activities by action type
    const activityGroups = {};
    activities.forEach(a => {
      const action = a.action || 'OTHER';
      if (!activityGroups[action]) activityGroups[action] = [];
      activityGroups[action].push(a);
    });

    const actLabels = {
      'PAYMENT': '[PAY] Payments Recorded',
      'ADD_EXPENSE': '[EXP] Expenses Added',
      'INIT_MONTH': '[INIT] Month Initialized',
      'ADD_REMINDER': '[REM] Reminders Added',
      'ADD_CONTACT': '[CONT] Contacts Added',
      'ADD_USER': '[USER] Users Added',
      'REMOVE_USER': '[DEL] Users Removed',
      'UPDATE_CONFIG': '[CFG] Config Updated',
      'UPDATE_FLAT': '[FLAT] Flat Details Updated',
      'BACKUP': '[BCK] Backups Created',
      'SETUP': '[SETUP] Initial Setup',
      'DELETE_EXPENSE': '[DEL] Expenses Deleted',
      'ADD_MISC_FUND': '[MISC] Misc Fund Recorded',
    };

    Object.entries(activityGroups).forEach(([action, items]) => {
      y = checkPageBreak(doc, y, margin, 10);

      doc.setFontSize(8);
      pdfFont(doc, 'bold');
      doc.setTextColor(60, 60, 80);
      doc.text(`${actLabels[action] || action} (${items.length})`, margin + 2, y + 5);
      y += 7;

      // Show first 5 items per category
      items.slice(0, 5).forEach(item => {
        y = checkPageBreak(doc, y, margin, 6);
        doc.setFontSize(7);
        pdfFont(doc, 'normal');
        doc.setTextColor(100, 100, 100);
        const detail = maskEmailsInText(item.details || '').substring(0, 80);
        const user = maskEmail(item.user);
        doc.text(`  - ${detail}  (by ${user})`, margin + 4, y + 4);
        y += 5;
      });

      if (items.length > 5) {
        doc.setFontSize(7);
        pdfFont(doc, 'normal');
        doc.text(`    ... and ${items.length - 5} more`, margin + 4, y + 4);
        y += 5;
      }
      y += 2;
    });

    // Activity summary
    y = checkPageBreak(doc, y, margin, 10);
    doc.setFillColor(230, 240, 255);
    doc.roundedRect(margin, y, contentWidth, 8, 2, 2, 'F');
    doc.setFontSize(7.5);
    pdfFont(doc, 'bold');
    doc.setTextColor(50, 80, 150);
    doc.text(`Total: ${activities.length} activities by ${new Set(activities.map(a => a.user)).size} user(s) this month`, margin + 4, y + 5.5);
    y += 12;
  } else {
    doc.setTextColor(120, 120, 120);
    doc.setFontSize(8);
    pdfFont(doc, 'normal');
    doc.text('No activities recorded for this month.', margin + 4, y + 6);
    y += 14;
  }

  // ═══════════════════════════════════════════════════════
  // SECTION 5: REMINDERS COMPLETED
  // ═══════════════════════════════════════════════════════
  if (remindersCompleted && remindersCompleted.length > 0) {
    y = checkPageBreak(doc, y, margin, 20);
    y = drawSectionHeader(doc, '6. REMINDERS / TASKS COMPLETED', y, pageWidth, margin);
    y += 2;

    remindersCompleted.forEach((r, i) => {
      y = checkPageBreak(doc, y, margin, 6);
      doc.setFontSize(7.5);
      pdfFont(doc, 'normal');
      doc.setTextColor(60, 60, 60);
      doc.text(`[OK] ${r.title}  (${r.lastCompleted || 'Completed'})`, margin + 2, y + 4);
      y += 6;
    });
    y += 6;
  }

  // ─── Important Note ─────────────────────────────────────
  y = checkPageBreak(doc, y, margin, 30);
  doc.setFillColor(255, 248, 220);
  doc.roundedRect(margin, y, contentWidth, 22, 2, 2, 'F');
  doc.setDrawColor(200, 160, 0);
  doc.roundedRect(margin, y, contentWidth, 22, 2, 2, 'S');

  doc.setFontSize(8.5);
  pdfFont(doc, 'bold');
  doc.setTextColor(120, 80, 0);
  doc.text('IMPORTANT NOTE:', margin + 4, y + 7);

  doc.setFontSize(7.5);
  pdfFont(doc, 'normal');
  doc.setTextColor(100, 70, 0);
  const noteText = 'The expenses shown in this report are not final. Any missed or pending expenses may be added to the sheet at a later date.';
  const noteText2 = 'This report is shared only for your information and reference. The Google Sheet is the final source of truth.';
  const noteLines1 = doc.splitTextToSize(noteText, contentWidth - 10);
  const noteLines2 = doc.splitTextToSize(noteText2, contentWidth - 10);
  doc.text(noteLines1, margin + 4, y + 12);
  doc.text(noteLines2, margin + 4, y + 12 + (noteLines1.length * 4));
  y += 28;

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
  const { pageWidth, margin, contentWidth } = pageMetrics(doc);

  drawHeaderBanner(doc, pageWidth, {
    title: activity.name || 'Activity Fund',
    subtitle: 'Activity Fund Report',
    line3: activity.status || 'Open',
  });
  let y = 58;

  y = drawSummaryCards(doc, [
    { label: 'Total Collection', value: formatCurrency(collected), color: [40, 167, 69], bg: [235, 250, 240] },
    { label: 'Total Expenses', value: formatCurrency(spent), color: [220, 53, 69], bg: [255, 235, 238] },
    { label: 'Net Balance', value: formatCurrency(balance), color: balance >= 0 ? [40, 167, 69] : [220, 53, 69], bg: balance >= 0 ? [235, 250, 240] : [255, 235, 238] },
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
  doc.setFillColor(...(isDeficit ? [255, 240, 240] : [235, 250, 240]));
  doc.roundedRect(margin, y, contentWidth, 12, 2, 2, 'F');
  doc.setFontSize(8.5);
  pdfFont(doc, 'bold');
  doc.setTextColor(...(isDeficit ? [180, 40, 40] : [30, 130, 60]));
  doc.text(`${isDeficit ? 'DEFICIT THIS ACTIVITY' : 'SURPLUS / REMAINING FUNDS'}: ${formatCurrency(Math.abs(balance))}`, margin + 4, y + 5);
  doc.setFontSize(7);
  pdfFont(doc, 'normal');
  doc.text(`Collection ${formatCurrency(collected)} - Expenses ${formatCurrency(spent)} = ${formatCurrency(balance)}`, margin + 4, y + 9.5);
  y += 16;

  y = drawSectionHeader(doc, '1. RECEIVED PAYMENT SUMMARY', y, pageWidth, margin);
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
        doc.setTextColor(40, 167, 69);
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
  doc.setTextColor(40, 167, 69);
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
    { title: '2. EXPENSES REPORT', emptyText: 'No expenses recorded for this activity.' },
  );

  y = checkPageBreak(doc, y, margin, 30);
  doc.setFillColor(255, 248, 220);
  doc.roundedRect(margin, y, contentWidth, 22, 2, 2, 'F');
  doc.setDrawColor(200, 160, 0);
  doc.roundedRect(margin, y, contentWidth, 22, 2, 2, 'S');
  doc.setFontSize(8.5);
  pdfFont(doc, 'bold');
  doc.setTextColor(120, 80, 0);
  doc.text('IMPORTANT NOTE:', margin + 4, y + 7);
  doc.setFontSize(7.5);
  pdfFont(doc, 'normal');
  doc.setTextColor(100, 70, 0);
  doc.text(doc.splitTextToSize('Expenses on this activity sheet are separate from monthly maintenance. Review every line before sharing.', contentWidth - 10), margin + 4, y + 12);
  y += 28;

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

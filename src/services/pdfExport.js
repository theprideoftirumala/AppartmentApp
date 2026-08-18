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

/**
 * Format currency (INR)
 */
function formatCurrency(amount) {
  return '₹' + Number(amount || 0).toLocaleString('en-IN');
}

/**
 * Draw a section header
 */
function drawSectionHeader(doc, text, y, pageWidth, margin) {
  doc.setFillColor(50, 55, 80);
  doc.rect(margin, y, pageWidth - 2 * margin, 9, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
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
  doc.setFont('helvetica', 'bold');

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
  doc.setFont('helvetica', 'normal');
  doc.text(
    `${reportData.apartmentName} | Monthly Report ${reportData.month} | Treasurer: Flat ${reportData.config?.TREASURER_FLAT || '401'} | President: Flat ${reportData.config?.PRESIDENT_FLAT || '102'}`,
    margin,
    footerY
  );
  doc.text(`Page ${pageNum}`, pageWidth - margin, footerY, { align: 'right' });
}

/**
 * Generate a comprehensive monthly report PDF
 * @param {object} reportData - All data for the report
 * @returns {jsPDF} PDF document
 */
export function generateMonthlyReport(reportData) {
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
    flats,
    watchman,
    activities,
    remindersCompleted,
  } = reportData;

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let y = margin;
  let pageNum = 1;

  // ═══════════════════════════════════════════════════════
  // PAGE 1: HEADER + FINANCIAL SUMMARY + PAYMENT STATUS
  // ═══════════════════════════════════════════════════════

  // ─── Header Banner ─────────────────────────────────────
  doc.setFillColor(25, 28, 42);
  doc.rect(0, 0, pageWidth, 48, 'F');

  // Accent line
  doc.setFillColor(79, 124, 255);
  doc.rect(0, 48, pageWidth, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(apartmentName || 'The Pride of Tirumala', pageWidth / 2, 18, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Monthly Financial Report`, pageWidth / 2, 28, { align: 'center' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(month, pageWidth / 2, 38, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}`, pageWidth / 2, 45, { align: 'center' });

  y = 58;

  // ─── Financial Summary Cards ───────────────────────────
  const cardWidth = contentWidth / 4 - 3;
  const summaryCards = [
    { label: 'Total Collection', value: formatCurrency(totalCollection), color: [40, 167, 69], bg: [235, 250, 240] },
    { label: 'Misc Funds', value: formatCurrency(totalMiscFunds || 0), color: [50, 80, 200], bg: [230, 240, 255] },
    { label: 'Total Expenses', value: formatCurrency(totalExpenses), color: [220, 53, 69], bg: [255, 235, 238] },
    { label: 'Net Balance', value: formatCurrency(netBalance), color: netBalance >= 0 ? [40, 167, 69] : [220, 53, 69], bg: netBalance >= 0 ? [235, 250, 240] : [255, 235, 238] },
  ];

  summaryCards.forEach((card, i) => {
    const x = margin + i * (cardWidth + 4);
    doc.setFillColor(...card.bg);
    doc.roundedRect(x, y, cardWidth, 20, 2, 2, 'F');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(card.label, x + 3, y + 7);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...card.color);
    doc.text(card.value, x + 3, y + 16);
  });

  y += 28;

  // ─── Configuration Summary ─────────────────────────────
  doc.setFillColor(248, 249, 252);
  doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`Monthly Maintenance: ${formatCurrency(config?.MONTHLY_MAINTENANCE || 3000)} per flat  |  Total Flats: 10  |  Expected: ${formatCurrency((config?.MONTHLY_MAINTENANCE || 3000) * 10)}  |  Deficit Carry Forward: ${formatCurrency(config?.DEFICIT_LAST_YEAR || 0)}`, margin + 4, y + 6);

  const paidCount = (maintenance || []).filter(r => r.status === 'PAID').length;
  const pendingCount = (maintenance || []).filter(r => r.status === 'PENDING').length;
  const partialCount = (maintenance || []).filter(r => r.status === 'PARTIAL').length;
  doc.text(`Collection: ${paidCount} Paid  |  ${pendingCount} Pending  |  ${partialCount} Partial  |  ${Math.round(paidCount / Math.max((maintenance || []).length, 1) * 100)}% collected`, margin + 4, y + 11.5);

  y += 20;

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
    const ownerName = flatInfo?.ownerName || 'Flat ' + record.flat;

    doc.setFontSize(7.5);
    let colX = margin + 2;
    const rowData = [
      record.flat,
      ownerName.substring(0, 18),
      formatCurrency(record.amountDue),
      formatCurrency(record.amountPaid),
      record.paymentDate || '-',
      record.paymentMode || '-',
      record.status,
    ];

    rowData.forEach((val, i) => {
      if (i === 6) {
        const statusColors = { PAID: [40, 167, 69], PENDING: [220, 53, 69], PARTIAL: [255, 153, 0] };
        doc.setTextColor(...(statusColors[val] || [60, 60, 60]));
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setTextColor(60, 60, 60);
        doc.setFont('helvetica', 'normal');
      }
      doc.text(String(val), colX, y + 5);
      colX += payColWidths[i];
    });

    y += 7;
  });

  // Payment totals row
  doc.setFillColor(230, 235, 245);
  doc.rect(margin, y, contentWidth, 8, 'F');
  doc.setFont('helvetica', 'bold');
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
  if (miscFunds && miscFunds.length > 0) {
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
      doc.setFont('helvetica', 'normal');
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
        if (i === 1) { doc.setFont('helvetica', 'bold'); doc.setTextColor(50, 80, 200); }
        doc.text(String(val), colX, y + 5);
        if (i === 1) { doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60); }
        colX += mfColWidths[i];
      });
      y += 7;
    });

    doc.setFillColor(230, 240, 255);
    doc.rect(margin, y, contentWidth, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(50, 80, 200);
    doc.text(`TOTAL MISC FUNDS: ${formatCurrency(totalMiscFunds || 0)}  (${miscFunds.length} contribution(s))`, margin + 4, y + 5.5);
    y += 14;
  }

  // ═══════════════════════════════════════════════════════
  // SECTION 3: EXPENSES REPORT
  // ═══════════════════════════════════════════════════════
  y = checkPageBreak(doc, y, margin, 40);
  y = drawSectionHeader(doc, '3. EXPENSES REPORT', y, pageWidth, margin);
  y += 2;

  if (expenses && expenses.length > 0) {
    // Detailed expenses table
    const expColWidths = [22, 58, 38, 28, 22, 12];
    y = drawTableHeader(doc, ['Date', 'Description', 'Category', 'Amount', 'Mode', 'Bill'], expColWidths, y, margin, contentWidth);

    expenses.forEach((exp, index) => {
      y = checkPageBreak(doc, y, margin, 7);

      const bg = index % 2 === 0 ? [255, 255, 255] : [248, 249, 252];
      doc.setFillColor(...bg);
      doc.rect(margin, y, contentWidth, 7, 'F');

      doc.setTextColor(60, 60, 60);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');

      let colX = margin + 2;
      const rowData = [
        (exp.date || '-').substring(0, 10),
        (exp.description || '-').substring(0, 28),
        (exp.category || '-').substring(0, 18),
        formatCurrency(exp.amount),
        exp.paymentMode || '-',
        exp.billReceipt === 'Y' ? 'Yes' : 'No',
      ];

      rowData.forEach((val, i) => {
        if (i === 3) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(220, 53, 69);
        }
        doc.text(String(val), colX, y + 5);
        if (i === 3) {
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(60, 60, 60);
        }
        colX += expColWidths[i];
      });

      y += 7;
    });

    // Expenses total
    doc.setFillColor(255, 235, 238);
    doc.rect(margin, y, contentWidth, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(220, 53, 69);
    doc.text(`TOTAL EXPENSES: ${formatCurrency(totalExpenses)}`, margin + 4, y + 5.5);
    doc.text(`${expenses.length} transaction(s)`, margin + contentWidth - 50, y + 5.5);
    y += 12;

    // ─── Category-wise Breakdown ──────────────────────────
    y = checkPageBreak(doc, y, margin, 30);
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Category-wise Breakdown', margin, y);
    y += 6;

    const categoryTotals = {};
    expenses.forEach(exp => {
      const cat = exp.category || 'Uncategorized';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + exp.amount;
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
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      doc.text(category, margin + 2, y + 5);
      doc.setFont('helvetica', 'bold');
      doc.text(formatCurrency(total), margin + 92, y + 5);
      doc.setFont('helvetica', 'normal');
      const pct = totalExpenses > 0 ? Math.round((total / totalExpenses) * 100) : 0;
      doc.text(`${pct}%`, margin + 132, y + 5);

      // Mini progress bar
      const barX = margin + 140;
      const barW = 35;
      doc.setFillColor(230, 230, 235);
      doc.rect(barX, y + 1.5, barW, 3, 'F');
      doc.setFillColor(79, 124, 255);
      doc.rect(barX, y + 1.5, barW * pct / 100, 3, 'F');

      y += 7;
    });
    y += 8;
  } else {
    doc.setTextColor(120, 120, 120);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text('No expenses recorded for this month.', margin + 4, y + 6);
    y += 14;
  }

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
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 40, 60);
      doc.text(`${w.name || 'Watchman ' + (i + 1)}`, margin + 4, y + 6);

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(`Phone: ${w.phone || '-'}  |  Shift: ${w.shiftTiming || '-'}  |  Salary: ${formatCurrency(w.salary)}`, margin + 4, y + 11.5);
      doc.text(`Join Date: ${w.joinDate || '-'}  |  ID: ${w.idProofType || '-'} ${w.idProofNumber || ''}  |  Emergency: ${w.emergencyContact || '-'} (${w.emergencyPhone || '-'})`, margin + 4, y + 16);

      y += 22;
    });
  } else {
    doc.setTextColor(120, 120, 120);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
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
      'PAYMENT': '💰 Payments Recorded',
      'ADD_EXPENSE': '📝 Expenses Added',
      'INIT_MONTH': '📅 Month Initialized',
      'ADD_REMINDER': '🔔 Reminders Added',
      'ADD_CONTACT': '📞 Contacts Added',
      'ADD_USER': '👤 Users Added',
      'REMOVE_USER': '❌ Users Removed',
      'UPDATE_CONFIG': '⚙️ Config Updated',
      'UPDATE_FLAT': '🏠 Flat Details Updated',
      'BACKUP': '💾 Backups Created',
      'SETUP': '🚀 Setup',
      'DELETE_EXPENSE': '🗑️ Expenses Deleted',
    };

    Object.entries(activityGroups).forEach(([action, items]) => {
      y = checkPageBreak(doc, y, margin, 10);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(60, 60, 80);
      doc.text(`${actLabels[action] || action} (${items.length})`, margin + 2, y + 5);
      y += 7;

      // Show first 5 items per category
      items.slice(0, 5).forEach(item => {
        y = checkPageBreak(doc, y, margin, 6);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        const detail = (item.details || '').substring(0, 60);
        const user = (item.user || '').split('@')[0];
        doc.text(`  • ${detail}  (by ${user})`, margin + 4, y + 4);
        y += 5;
      });

      if (items.length > 5) {
        doc.setFontSize(7);
        doc.setFont('helvetica', 'italic');
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
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 80, 150);
    doc.text(`Total: ${activities.length} activities by ${new Set(activities.map(a => a.user)).size} user(s) this month`, margin + 4, y + 5.5);
    y += 12;
  } else {
    doc.setTextColor(120, 120, 120);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
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
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      doc.text(`✅ ${r.title} — ${r.lastCompleted || 'Completed'}`, margin + 2, y + 4);
      y += 6;
    });
    y += 6;
  }

  // ─── Final Footer on all pages ─────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, reportData, i);
  }

  return doc;
}

/**
 * Download the generated PDF
 */
export function downloadReport(reportData) {
  const doc = generateMonthlyReport(reportData);
  const fileName = `TPT_Report_${reportData.month || 'Monthly'}.pdf`;
  doc.save(fileName);
  return fileName;
}

/**
 * Generate PDF as Blob for sharing
 */
export function generateReportBlob(reportData) {
  const doc = generateMonthlyReport(reportData);
  return doc.output('blob');
}

/**
 * Share/Send the PDF report using Web Share API (mobile) or download
 */
export async function shareReport(reportData) {
  const fileName = `TPT_Report_${reportData.month || 'Monthly'}.pdf`;
  const blob = generateReportBlob(reportData);
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
  const doc = generateMonthlyReport(reportData);
  doc.save(fileName);
  return { shared: false, downloaded: true };
}

/**
 * Download expenses from the read-only imported I&E sheet.
 * Does not read or write APP / LIVE.
 */

import jsPDF from 'jspdf';
import { importedExpenseCsv } from './importedIandE';

export function downloadImportedExpenseCsv(rows, month, fileName) {
  const csv = importedExpenseCsv(rows, month);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${(fileName || 'imported-sheet').replace(/[^\w.-]+/g, '-')}-${month || 'expenses'}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadImportedExpensePdf(rows, month, fileName) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 14;
  let y = 18;
  doc.setFontSize(14);
  doc.text('Imported I&E expenses (read-only)', margin, y);
  y += 7;
  doc.setFontSize(10);
  doc.text(`${fileName || 'Imported sheet'}  ·  ${month || ''}`, margin, y);
  y += 8;
  doc.setFontSize(9);
  doc.text('Date', margin, y);
  doc.text('Description', margin + 28, y);
  doc.text('Category', margin + 110, y);
  doc.text('Amount', 190, y, { align: 'right' });
  y += 5;
  (rows || []).forEach((row) => {
    if (y > 280) {
      doc.addPage();
      y = 18;
    }
    doc.text(String(row.date || '—').slice(0, 12), margin, y);
    doc.text(String(row.description || '').slice(0, 42), margin + 28, y);
    doc.text(String(row.category || '').slice(0, 22), margin + 110, y);
    doc.text(String(Number(row.amount) || 0), 190, y, { align: 'right' });
    y += 5;
  });
  const total = (rows || []).reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  y += 4;
  doc.setFont(undefined, 'bold');
  doc.text(`Total  ${total}`, 190, y, { align: 'right' });
  doc.save(`${(fileName || 'imported-sheet').replace(/[^\w.-]+/g, '-')}-${month || 'expenses'}.pdf`);
}

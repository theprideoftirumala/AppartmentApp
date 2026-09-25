/**
 * Optional monthly PDF layouts (versions 2–5).
 * Version 1 stays in pdfExport.js and is not built here.
 * Every edition uses the same ledger figures, resident wording, and stamp rules.
 */

import jsPDF from 'jspdf';
import {
  REPORT_NOTE_LINES,
  REPORT_NOTE_TITLE,
  REPORT_WATER_QUOTE,
  REPORT_WATER_QUOTE_BY,
  SOCIETY_DISCLAIMER,
} from '../config/constants';
import { collectionCounts, categoryChartRows } from '../utils/expertReport';
import { buildReportViewModel } from '../utils/reportViewModel';

export const PDF_EDITIONS = [
  {
    id: 'classic',
    version: 1,
    name: 'Classic',
    blurb: 'The monthly PDF already in use. This layout is unchanged.',
    fileTag: '',
  },
  {
    id: 'brief',
    version: 2,
    name: 'Phone brief',
    blurb: 'One page for WhatsApp. Large figures, no flat list.',
    fileTag: 'Brief',
  },
  {
    id: 'ledger',
    version: 3,
    name: 'Ledger',
    blurb: 'A statement: opening, movements, then what is left.',
    fileTag: 'Ledger',
  },
  {
    id: 'notice',
    version: 4,
    name: 'Notice',
    blurb: 'Large type for a lobby printout.',
    fileTag: 'Notice',
  },
  {
    id: 'owner',
    version: 5,
    name: 'Owner pack',
    blurb: 'Counts, categories, bills, and year to date.',
    fileTag: 'Owner',
  },
];

const PDF_FONT = 'NotoSans';
let cachedFontBase64 = null;
let fontReady = false;

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function prepareDoc() {
  const doc = new jsPDF('p', 'mm', 'a4');
  fontReady = false;
  try {
    if (!cachedFontBase64) {
      const url = `${import.meta.env.BASE_URL}fonts/NotoSans-Regular.ttf`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Rupee font missing');
      cachedFontBase64 = arrayBufferToBase64(await res.arrayBuffer());
    }
    doc.addFileToVFS('NotoSans-Regular.ttf', cachedFontBase64);
    doc.addFont('NotoSans-Regular.ttf', PDF_FONT, 'normal');
    doc.addFont('NotoSans-Regular.ttf', PDF_FONT, 'bold');
    fontReady = true;
  } catch {
    fontReady = false;
  }
  return doc;
}

function applyFont(doc, style = 'normal') {
  doc.setFont(fontReady ? PDF_FONT : 'helvetica', style);
}

function plain(text) {
  const value = String(text ?? '');
  if (fontReady) return value;
  const normalized = value
    .replace(/₹/g, 'Rs. ')
    .replace(/[“”]/g, '"')
    .replace(/[—–]/g, '-');
  let out = '';
  for (const ch of normalized) {
    const code = ch.charCodeAt(0);
    if (code === 9 || code === 10 || code === 13 || (code >= 32 && code <= 255)) out += ch;
  }
  return out;
}

function inr(amount) {
  const formatted = Number(amount || 0).toLocaleString('en-IN');
  return fontReady ? `₹${formatted}` : `Rs. ${formatted}`;
}

function metrics(doc) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  return { pageWidth, pageHeight, margin, width: pageWidth - margin * 2 };
}

function wash(doc, rgb) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFillColor(...rgb);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
}

function write(doc, text, x, y, width, size = 9, style = 'normal', color = [28, 28, 28]) {
  applyFont(doc, style);
  doc.setFontSize(size);
  doc.setTextColor(...color);
  const lines = doc.splitTextToSize(plain(text), Math.max(20, width));
  doc.text(lines, x, y);
  return y + lines.length * (size * 0.42) + 1.6;
}

function ensureRoom(doc, y, needed, paper) {
  const { pageHeight, margin } = metrics(doc);
  if (y + needed < pageHeight - 18) return y;
  doc.addPage();
  wash(doc, paper);
  return margin + 6;
}

function footerLine(story) {
  const treasurer = story.config.TREASURER_FLAT || '401';
  const president = story.config.PRESIDENT_FLAT || '102';
  return `${story.model.apartmentName} | Monthly Report ${story.model.month} | Treasurer: Flat ${treasurer} | President: Flat ${president}`;
}

function stampFooters(doc, story) {
  const total = doc.internal.getNumberOfPages();
  const { pageWidth, pageHeight, margin } = metrics(doc);
  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page);
    const footerY = pageHeight - 8;
    doc.setDrawColor(190, 184, 176);
    doc.setLineWidth(0.2);
    doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);
    applyFont(doc, 'normal');
    doc.setFontSize(7);
    doc.setTextColor(110, 104, 96);
    doc.text(plain(footerLine(story)), margin, footerY);
    doc.text(`Page ${page}`, pageWidth - margin, footerY, { align: 'right' });
  }
}

function drawArcText(doc, text, cx, cy, radius, startDeg, endDeg) {
  const chars = plain(text).split('');
  chars.forEach((ch, index) => {
    const t = chars.length === 1 ? 0.5 : index / (chars.length - 1);
    const deg = startDeg + (endDeg - startDeg) * t;
    const rad = (deg * Math.PI) / 180;
    doc.text(ch, cx + radius * Math.cos(rad), cy + radius * Math.sin(rad), {
      align: 'center',
      baseline: 'middle',
      angle: -(deg + 90),
    });
  });
}

function drawSeal(doc, apartmentName, month, cx, cy, ink) {
  doc.setFillColor(ink[0], ink[1], ink[2]);
  doc.circle(cx, cy, 16, 'F');
  doc.setFillColor(255, 255, 255);
  doc.circle(cx, cy, 13.2, 'F');
  doc.setDrawColor(...ink);
  doc.setLineWidth(0.6);
  doc.circle(cx, cy, 11.2, 'S');
  applyFont(doc, 'bold');
  doc.setTextColor(...ink);
  doc.setFontSize(3.6);
  const arc = String(apartmentName || 'The Pride of Tirumala').slice(0, 28);
  drawArcText(doc, arc, cx, cy, 8.4, 200, 340);
  doc.setFontSize(8);
  doc.text(plain(month), cx, cy + 1.5, { align: 'center' });
  doc.setFontSize(3.3);
  doc.text('DIGITALLY VERIFIED', cx, cy + 6.2, { align: 'center' });
}

function paintClose(doc, story, y, paper, ink) {
  const { margin, width, pageHeight, pageWidth } = metrics(doc);
  const textWidth = width - 36;
  y = ensureRoom(doc, y, 58, paper);
  y = write(doc, REPORT_NOTE_TITLE, margin, y, textWidth, 9, 'bold', ink);
  for (const line of REPORT_NOTE_LINES) {
    y = write(doc, line, margin, y, textWidth, 8, 'normal', [55, 48, 40]);
  }
  y += 1;
  y = write(doc, `"${REPORT_WATER_QUOTE}"`, margin, y, textWidth, 8.5, 'bold', ink);
  y = write(doc, `— ${REPORT_WATER_QUOTE_BY}`, margin, y, textWidth, 7.5, 'normal', [70, 78, 110]);
  y = write(doc, SOCIETY_DISCLAIMER, margin, y, textWidth, 7.5, 'normal', [70, 64, 56]);
  const cx = pageWidth - 26;
  const cy = Math.max(24, Math.min(pageHeight - 28, y - 8));
  drawSeal(doc, story.model.apartmentName, story.model.month, cx, cy, ink);
  stampFooters(doc, story);
}

function ytdBlock(doc, story, x, y, width, ink) {
  y = write(doc, `Year to date through ${story.model.month}`, x, y, width, 9, 'bold', ink);
  if (!story.model.ytdRows.length) {
    return write(doc, 'No months on the books yet.', x, y, width, 8);
  }
  for (const row of story.model.ytdRows) {
    y = write(
      doc,
      `${row.month}: collected ${inr(row.totalCollection)}, spent ${inr(row.totalExpenses)}, available ${inr(row.cumulativeBalance)}`,
      x,
      y,
      width,
      8,
    );
  }
  return y;
}

function stillDueLine(doc, story, x, y, width) {
  if (!story.model.stillDueResident) return y;
  return write(doc, story.model.stillDueResident, x, y, width, 8.5, 'bold', [140, 78, 20]);
}

export function editionFacts(reportData = {}) {
  const model = buildReportViewModel(reportData);
  return {
    model,
    counts: collectionCounts(reportData.maintenance),
    categories: categoryChartRows(reportData.expenses, model.spent),
    expenses: reportData.expenses || [],
    config: reportData.config || {},
  };
}

export function editionFileName(editionId, month) {
  const edition = PDF_EDITIONS.find((item) => item.id === editionId);
  const label = month || 'Monthly';
  if (!edition || edition.id === 'classic') return `TPT_Report_${label}.pdf`;
  return `TPT_Report_${label}_${edition.fileTag}.pdf`;
}

export function isClassicEdition(editionId) {
  return !editionId || editionId === 'classic';
}

function moneyLines(story) {
  const { model } = story;
  return [
    `${model.openingLabel}: ${inr(model.openingSurplus)} after ${model.openingFromMonth || 'the previous month'}`,
    `Collected this month: ${inr(model.collected)}`,
    `Spent this month: ${inr(model.spent)}`,
    `This month ${model.monthStatus}: ${inr(model.monthNet)}`,
    `Available ${model.availableStatus}: ${inr(model.available)}`,
  ];
}

async function renderBrief(story) {
  const doc = await prepareDoc();
  const paper = [247, 244, 239];
  const ink = [15, 90, 82];
  wash(doc, paper);
  const { margin, width, pageWidth } = metrics(doc);
  doc.setFillColor(...ink);
  doc.rect(0, 0, pageWidth, 8, 'F');
  let y = 18;
  y = write(doc, story.model.apartmentName, margin, y, width, 16, 'bold', [28, 32, 36]);
  y = write(doc, `${story.model.month}  ·  Phone brief`, margin, y, width, 11, 'normal', ink);
  y += 2;
  for (const line of moneyLines(story)) {
    y = write(doc, line, margin, y, width, 12, 'bold', [28, 32, 36]);
  }
  y += 2;
  y = stillDueLine(doc, story, margin, y, width);
  y = ytdBlock(doc, story, margin, y + 2, width - 8, ink);
  paintClose(doc, story, y + 3, paper, ink);
  return doc;
}

async function renderLedger(story) {
  const doc = await prepareDoc();
  const paper = [252, 252, 249];
  const ink = [32, 36, 48];
  wash(doc, paper);
  const { margin, width } = metrics(doc);
  let y = 18;
  y = write(doc, story.model.apartmentName, margin, y, width, 14, 'bold', ink);
  y = write(doc, `Ledger statement  ·  ${story.model.month}`, margin, y, width, 10, 'normal', [80, 86, 98]);
  y += 2;
  for (const line of moneyLines(story)) {
    doc.setDrawColor(220, 216, 208);
    doc.line(margin, y + 1.5, margin + width, y + 1.5);
    y = write(doc, line, margin, y + 5, width, 10, 'normal', ink);
  }
  y += 3;
  y = stillDueLine(doc, story, margin, y, width);
  y = write(doc, 'Bills this month', margin, y + 2, width, 10, 'bold', ink);
  const bills = story.expenses.length ? story.expenses : [];
  if (!bills.length) {
    y = write(doc, 'No expenses for this month.', margin, y, width, 9);
  }
  for (const row of bills) {
    y = ensureRoom(doc, y, 12, paper);
    y = write(
      doc,
      `${row.date || '—'}  ${row.category || 'Expense'}  ${row.description || ''}  ${inr(row.amount)}`,
      margin,
      y,
      width,
      8.5,
    );
  }
  y = ytdBlock(doc, story, margin, y + 2, width, ink);
  paintClose(doc, story, y + 2, paper, ink);
  return doc;
}

async function renderNotice(story) {
  const doc = await prepareDoc();
  const paper = [255, 247, 237];
  const ink = [146, 64, 14];
  wash(doc, paper);
  const { margin, width, pageWidth } = metrics(doc);
  doc.setFillColor(255, 153, 51);
  doc.rect(0, 0, pageWidth, 10, 'F');
  let y = 24;
  y = write(doc, story.model.apartmentName, margin, y, width, 13, 'bold', [40, 28, 16]);
  y = write(doc, story.model.month, margin, y, width, 12, 'normal', ink);
  y += 4;
  y = write(doc, `Available ${story.model.availableStatus}`, margin, y, width, 12, 'bold', ink);
  y = write(doc, inr(story.model.available), margin, y + 2, width, 28, 'bold', [24, 24, 24]);
  y += 2;
  y = write(doc, `This month ${story.model.monthStatus} ${inr(story.model.monthNet)}`, margin, y, width, 14, 'bold', ink);
  for (const line of moneyLines(story).slice(0, 3)) {
    y = write(doc, line, margin, y, width, 11, 'normal', [40, 28, 16]);
  }
  y = stillDueLine(doc, story, margin, y + 1, width);
  y = ytdBlock(doc, story, margin, y + 2, width - 6, ink);
  paintClose(doc, story, y + 2, paper, ink);
  return doc;
}

async function renderOwner(story) {
  const doc = await prepareDoc();
  const paper = [245, 247, 250];
  const ink = [30, 58, 138];
  wash(doc, paper);
  const { margin, width } = metrics(doc);
  let y = 18;
  y = write(doc, story.model.apartmentName, margin, y, width, 14, 'bold', [15, 23, 42]);
  y = write(doc, `Owner pack  ·  ${story.model.month}`, margin, y, width, 10, 'normal', ink);
  y += 1;
  for (const line of moneyLines(story)) {
    y = write(doc, line, margin, y, width, 10, 'bold', [15, 23, 42]);
  }
  const { paid, pending, partial, total, pct } = story.counts;
  y = write(
    doc,
    `Collection: ${paid} paid, ${pending} pending, ${partial} partial, ${pct}% of ${total || 0} flats.`,
    margin,
    y + 1,
    width,
    9,
  );
  y = stillDueLine(doc, story, margin, y, width);
  y = write(doc, 'Where the money went', margin, y + 2, width, 10, 'bold', ink);
  if (!story.categories.length) {
    y = write(doc, 'No expenses for this month.', margin, y, width, 9);
  }
  for (const row of story.categories) {
    y = ensureRoom(doc, y, 10, paper);
    y = write(doc, `${row.name}: ${inr(row.total)} (${row.pct}%)`, margin, y, width, 9);
  }
  y = ytdBlock(doc, story, margin, y + 2, width, ink);
  paintClose(doc, story, y + 2, paper, ink);
  return doc;
}

export async function renderEdition(editionId, reportData) {
  const story = editionFacts(reportData);
  switch (editionId) {
    case 'brief':
      return renderBrief(story);
    case 'ledger':
      return renderLedger(story);
    case 'notice':
      return renderNotice(story);
    case 'owner':
      return renderOwner(story);
    default:
      throw new Error('That PDF style is not one of the new editions. Classic stays on its own path.');
  }
}

export async function downloadEdition(editionId, reportData) {
  const doc = await renderEdition(editionId, reportData);
  const fileName = editionFileName(editionId, reportData?.month);
  doc.save(fileName);
  return fileName;
}

export async function shareEdition(editionId, reportData) {
  const fileName = editionFileName(editionId, reportData?.month);
  const doc = await renderEdition(editionId, reportData);
  const blob = doc.output('blob');
  const file = new File([blob], fileName, { type: 'application/pdf' });
  const story = editionFacts(reportData);
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: `${story.model.apartmentName} — ${story.model.month} Report`,
        text: story.model.shareText,
        files: [file],
      });
      return { shared: true };
    } catch (err) {
      if (err.name === 'AbortError') return { shared: false, cancelled: true };
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

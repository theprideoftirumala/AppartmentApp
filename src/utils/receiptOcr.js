/**
 * On-device receipt reading: Tesseract.js (no cloud, no paid API).
 * The user must review autofilled lines before save.
 */

import { EXPENSE_CATEGORIES } from '../config/constants';
import { parseOneExpense } from './voiceExpense';

function largestAmount(text) {
  const nums = [...String(text).matchAll(/(\d{1,3}(?:,\d{3})+|\d+(?:\.\d{2})?)/g)]
    .map((match) => Number(match[1].replace(/,/g, '')))
    .filter((n) => Number.isFinite(n) && n >= 10 && n < 10_000_000);
  if (!nums.length) return '';
  return String(Math.max(...nums));
}

function normalizeDate(raw) {
  const iso = String(raw).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return raw;
  const dmy = String(raw).match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})$/);
  if (!dmy) return '';
  const day = dmy[1].padStart(2, '0');
  const month = dmy[2].padStart(2, '0');
  let year = dmy[3];
  if (year.length === 2) year = `20${year}`;
  return `${year}-${month}-${day}`;
}

export function parseReceiptText(text, categories = EXPENSE_CATEGORIES) {
  const lines = String(text || '').split(/\n/).map((line) => line.trim()).filter(Boolean);
  const joined = lines.join(' ');
  const parsed = parseOneExpense(joined, categories);
  const biggest = largestAmount(joined);
  if (biggest && (!parsed.amount || Number(biggest) > Number(parsed.amount))) {
    parsed.amount = biggest;
  }
  const dateMatch = joined.match(/\b(\d{4}-\d{2}-\d{2}|\d{1,2}[/.]\d{1,2}[/.]\d{2,4})\b/);
  const firstLine = lines.find((line) => /[a-zA-Z]{3,}/.test(line)) || parsed.description;
  return {
    description: parsed.description || firstLine,
    category: parsed.category,
    amount: parsed.amount,
    paymentMode: parsed.paymentMode || 'UPI',
    remarks: 'Filled from receipt photo — please verify',
    date: dateMatch ? normalizeDate(dateMatch[1]) : '',
  };
}

export async function recognizeReceiptImage(file) {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng');
  try {
    const { data } = await worker.recognize(file);
    return data?.text || '';
  } finally {
    await worker.terminate();
  }
}

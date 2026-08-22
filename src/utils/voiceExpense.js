/**
 * Free voice capture: Web Speech API + local parsing (no paid AI).
 * The user must review and submit the filled form.
 */

const CATEGORY_ALIASES = {
  electricity: 'Common Electricity',
  bescom: 'Common Electricity',
  watchman: 'Watchman Salary',
  salary: 'Watchman Salary',
  diesel: 'Generator Fuel',
  fuel: 'Generator Fuel',
  generator: 'Generator Fuel',
  wifi: 'WiFi Bill',
  internet: 'WiFi Bill',
  tanker: 'Water Tankers',
  water: 'Water Tankers',
  plumber: 'Plumbing',
  plumbing: 'Plumbing',
  lift: 'Lift Maintenance',
  cleaning: 'Cleaning / Housekeeping',
  housekeeping: 'Cleaning / Housekeeping',
  pest: 'Pest Control',
  paint: 'Painting / Civil Work',
  festival: 'Festival / Events',
};

export function speechSupported() {
  return typeof window !== 'undefined'
    && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function createSpeechRecognizer() {
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = 'en-IN';
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  return rec;
}

function detectCategory(lower, categories) {
  const sorted = [...categories].sort((a, b) => b.length - a.length);
  for (const cat of sorted) {
    if (lower.includes(cat.toLowerCase())) return cat;
  }
  for (const [alias, cat] of Object.entries(CATEGORY_ALIASES)) {
    if (lower.includes(alias) && categories.includes(cat)) return cat;
  }
  return '';
}

function detectAmount(chunk) {
  const match = String(chunk).match(
    /(?:₹|rs\.?|inr)?\s*(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)(?:\s*(?:rs\.?|rupees?|inr))?/i,
  );
  if (!match) return '';
  const n = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? String(n) : '';
}

function detectMode(lower) {
  if (/\bcash\b/.test(lower)) return 'Cash';
  if (/\b(bank|neft|imps|transfer)\b/.test(lower)) return 'Bank Transfer';
  if (/\b(cheque|check)\b/.test(lower)) return 'Cheque';
  if (/\bonline\b/.test(lower)) return 'Online';
  return 'UPI';
}

export function parseOneExpense(chunk, categories = []) {
  const text = String(chunk || '').trim();
  const lower = text.toLowerCase();
  const amount = detectAmount(text);
  const category = detectCategory(lower, categories);
  const paymentMode = detectMode(lower);

  let description = text
    .replace(/(?:₹|rs\.?|inr)\s*/ig, ' ')
    .replace(/\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?/g, ' ')
    .replace(/\b(rupees?|rs|inr|cash|upi|paid|pay|for|of|the|a|an|by|via|online|neft|imps)\b/ig, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (category) {
    description = description.replace(new RegExp(category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig'), '').trim();
  }
  if (!description) description = category || text;

  return {
    description,
    category,
    amount,
    paymentMode,
    remarks: '',
  };
}

export function parseExpensesFromSpeech(transcript, categories = []) {
  const text = String(transcript || '').trim();
  if (!text) return [];
  const chunks = text
    .split(/\s+(?:and|then|also)\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);
  return chunks.map((chunk) => parseOneExpense(chunk, categories));
}

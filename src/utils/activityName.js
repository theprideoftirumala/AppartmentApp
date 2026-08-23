export function normalizeActivityName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ');
}

export function slugActivityName(name) {
  const slug = normalizeActivityName(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return slug || 'activity';
}

export function activityFileName(name) {
  return `TPT-Activity-${slugActivityName(name)}`;
}

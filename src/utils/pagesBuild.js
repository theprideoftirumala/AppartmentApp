/**
 * GitHub Pages must serve Vite's dist/index.html, not the repo source file.
 * Source HTML loads /src/main.jsx and shows a blank page at /AppartmentApp/.
 */

export function assertProductionIndexHtml(html, { basePath = '/AppartmentApp/' } = {}) {
  const text = String(html || '');
  if (/\/src\/main\.jsx/.test(text)) {
    throw new Error('Production index.html must not load /src/main.jsx. GitHub Pages is serving the unbuilt source file.');
  }
  const prefix = String(basePath || '/').replace(/\/?$/, '/');
  const assetHint = `${prefix}assets/`;
  if (!text.includes(assetHint) && !text.includes('assets/')) {
    throw new Error(`Production index.html must load bundled JS from ${assetHint}`);
  }
  return true;
}

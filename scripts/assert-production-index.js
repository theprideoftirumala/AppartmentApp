import { readFileSync } from 'node:fs';
import { assertProductionIndexHtml } from '../src/utils/pagesBuild.js';

const html = readFileSync('dist/index.html', 'utf8');
assertProductionIndexHtml(html, { basePath: process.env.VITE_BASE_PATH || '/AppartmentApp/' });
console.log('Production index.html points at bundled assets, not /src/main.jsx');

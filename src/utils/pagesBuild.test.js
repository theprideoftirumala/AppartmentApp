import { describe, expect, it } from 'vitest';
import { assertProductionIndexHtml } from './pagesBuild';

describe('assertProductionIndexHtml', () => {
  it('rejects the unbuilt GitHub Pages source file', () => {
    const source = '<script type="module" src="/src/main.jsx"></script>';
    expect(() => assertProductionIndexHtml(source)).toThrow(/src\/main\.jsx/);
  });

  it('accepts a Vite build with the AppartmentApp base path', () => {
    expect(assertProductionIndexHtml(
      '<script type="module" src="/AppartmentApp/assets/index-abc.js"></script>',
    )).toBe(true);
  });
});

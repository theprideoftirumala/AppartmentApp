import { describe, expect, it } from 'vitest';
import { pickCanonicalActivityFile, registryRowsToDrop } from './activityDedupe';

describe('pickCanonicalActivityFile', () => {
  const files = [
    { id: 'newer', createdTime: '2026-10-02T00:00:00.000Z' },
    { id: 'older', createdTime: '2026-09-01T00:00:00.000Z' },
  ];

  it('keeps the preferred registry file', () => {
    expect(pickCanonicalActivityFile(files, 'newer').id).toBe('newer');
  });

  it('keeps the oldest file when nothing is preferred', () => {
    expect(pickCanonicalActivityFile(files).id).toBe('older');
  });
});

describe('registryRowsToDrop', () => {
  it('drops a second row with the same activity name', () => {
    const rows = [
      { name: 'Ganesh Festival', spreadsheetId: 'a', status: 'Open' },
      { name: 'ganesh festival', spreadsheetId: 'b', status: 'Open' },
    ];
    expect(registryRowsToDrop(rows, new Set(['a']))).toEqual([1]);
  });

  it('keeps the Open row over a Closed duplicate', () => {
    const rows = [
      { name: 'Motor', spreadsheetId: 'old', status: 'Closed' },
      { name: 'Motor', spreadsheetId: 'live', status: 'Open' },
    ];
    expect(registryRowsToDrop(rows)).toEqual([0]);
  });
});

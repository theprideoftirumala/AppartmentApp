import { describe, expect, it } from 'vitest';
import { activityFileName, normalizeActivityName, slugActivityName } from './activityName';

describe('activity names', () => {
  it('normalizes spaces', () => {
    expect(normalizeActivityName('  Ganesh   Festival ')).toBe('Ganesh Festival');
  });

  it('builds a stable Drive file name', () => {
    expect(slugActivityName('New Motor Fund')).toBe('new-motor-fund');
    expect(activityFileName('Ganesh Festival')).toBe('TPT-Activity-ganesh-festival');
  });
});

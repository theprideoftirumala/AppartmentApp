import { describe, expect, it } from 'vitest';
import { isMissingSheetRangeError } from './sheetRangeError';

describe('isMissingSheetRangeError', () => {
  it('detects a missing Configuration tab', () => {
    expect(isMissingSheetRangeError({
      result: { error: { message: "Unable to parse range: 'Configuration'!A2:C100" } },
    })).toBe(true);
  });

  it('ignores other API errors', () => {
    expect(isMissingSheetRangeError({ result: { error: { message: 'The caller does not have permission' } } })).toBe(false);
    expect(isMissingSheetRangeError(new Error('offline'))).toBe(false);
  });
});

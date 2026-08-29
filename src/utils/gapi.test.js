import { describe, expect, it } from 'vitest';
import { gapiCall, gapiCallSafe } from './gapi';

describe('gapiCall', () => {
  it('turns a thenable without catch into a real Promise', async () => {
    const thenable = {
      then(resolve) {
        resolve({ result: { values: [['ok']] } });
      },
    };
    const result = await gapiCall(thenable).catch(() => null);
    expect(result.result.values[0][0]).toBe('ok');
  });

  it('gapiCallSafe returns the fallback when the thenable has no catch', async () => {
    const thenable = {
      then(_resolve, reject) {
        reject(new Error('missing tab'));
      },
    };
    const result = await gapiCallSafe(thenable, { result: { values: [] } });
    expect(result.result.values).toEqual([]);
  });
});

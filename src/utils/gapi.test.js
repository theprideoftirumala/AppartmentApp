import { describe, expect, it } from 'vitest';
import { gapiCall } from './gapi';

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
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEYS } from '../config/constants';
import { clearLocalDataCache } from './appCache';

describe('clearLocalDataCache', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('removes only dashboard cache keys', () => {
    const store = {
      [STORAGE_KEYS.CACHED_CONFIG]: '{}',
      [STORAGE_KEYS.CACHED_DASHBOARD]: '{}',
      [STORAGE_KEYS.LAST_SYNC]: 'now',
      [STORAGE_KEYS.THEME]: 'daylight',
    };
    vi.stubGlobal('localStorage', {
      removeItem: (key) => {
        delete store[key];
      },
    });

    clearLocalDataCache();

    expect(store[STORAGE_KEYS.CACHED_CONFIG]).toBeUndefined();
    expect(store[STORAGE_KEYS.CACHED_DASHBOARD]).toBeUndefined();
    expect(store[STORAGE_KEYS.LAST_SYNC]).toBeUndefined();
    expect(store[STORAGE_KEYS.THEME]).toBe('daylight');
  });
});

import { describe, it, expect } from 'vitest';
import { maskToken } from '../src/utils/discordToken';

describe('maskToken', () => {
  it('returns original for short tokens', () => {
    expect(maskToken('short')).toBe('short');
  });

  it('masks long tokens', () => {
    expect(maskToken('abcdefghijklmnopqrstuvwxyz')).toBe('abcdef...wxyz');
  });
});

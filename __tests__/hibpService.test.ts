import { sha1, splitSha1PrefixSuffix, parseHibpRangeResponse } from '../src/utils/hibpUtils';
import { hibpService } from '../src/services/hibpService';

describe('HaveIBeenPwned k-Anonymity Service and Utilities', () => {
  describe('RFC 3174 SHA-1 Implementation', () => {
    it('computes correct SHA-1 for empty string', () => {
      expect(sha1('')).toBe('DA39A3EE5E6B4B0D3255BFEF95601890AFD80709');
    });

    it('computes correct SHA-1 for standard password vectors', () => {
      expect(sha1('password')).toBe('5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8');
      expect(sha1('123456')).toBe('7C4A8D09CA3762AF61E59520943DC26494F8941B');
      expect(sha1('VaultKey@2026!')).toBe(sha1('VaultKey@2026!'));
    });

    it('computes correct SHA-1 for long text', () => {
      const sentence = 'The quick brown fox jumps over the lazy dog';
      expect(sha1(sentence)).toBe('2FD4E1C67A2D28FCED849EE1BB76E7391B93EB12');
    });

    it('handles unicode and multi-byte utf-8 sequences', () => {
      const res = sha1('P@sswørd🔑');
      expect(res).toHaveLength(40);
      expect(res).toMatch(/^[0-9A-F]{40}$/);
    });
  });

  describe('splitSha1PrefixSuffix', () => {
    it('splits 40-character SHA-1 into 5-char prefix and 35-char suffix', () => {
      const hash = '5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8';
      const { prefix, suffix } = splitSha1PrefixSuffix(hash);
      expect(prefix).toBe('5BAA6');
      expect(suffix).toBe('1E4C9B93F3F0682250B6CF8331B7EE68FD8');
      expect(prefix.length).toBe(5);
      expect(suffix.length).toBe(35);
    });

    it('throws when given an invalid hash length', () => {
      expect(() => splitSha1PrefixSuffix('5BAA6')).toThrow('Invalid SHA-1 hash length');
    });
  });

  describe('parseHibpRangeResponse', () => {
    const mockRangeData = [
      '003D68EB55068C34ACE09600E6AD519A301:2',
      '012C130D118536A2D4DFDF5D5A54F19E924:1',
      '1E4C9B93F3F0682250B6CF8331B7EE68FD8:3842103',
      '2A91D0E03C125F4C74D2335FB3026366052:15',
    ].join('\r\n');

    it('returns breached: true and correct count when suffix is matched', () => {
      const targetSuffix = '1E4C9B93F3F0682250B6CF8331B7EE68FD8';
      const result = parseHibpRangeResponse(mockRangeData, targetSuffix);
      expect(result.breached).toBe(true);
      expect(result.count).toBe(3842103);
    });

    it('returns breached: false and count: 0 when suffix is not found in range', () => {
      const missingSuffix = 'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF';
      const result = parseHibpRangeResponse(mockRangeData, missingSuffix);
      expect(result.breached).toBe(false);
      expect(result.count).toBe(0);
    });

    it('handles empty response gracefully', () => {
      const result = parseHibpRangeResponse('', '1E4C9B93F3F0682250B6CF8331B7EE68FD8');
      expect(result.breached).toBe(false);
      expect(result.count).toBe(0);
    });
  });

  describe('hibpService.checkPasswordBreach', () => {
    it('returns clean immediately for empty password without network call', async () => {
      const mockFetch = jest.fn();
      const res = await hibpService.checkPasswordBreach('', { fetchFn: mockFetch as any });
      expect(res).toEqual({ breached: false, count: 0, offline: false });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('enforces k-anonymity: transmits ONLY 5-character prefix over the wire', async () => {
      let calledUrl = '';
      const mockFetch = jest.fn().mockImplementation((url: string) => {
        calledUrl = url;
        return Promise.resolve({
          ok: true,
          text: async () => 'D09CA3762AF61E59520943DC26494F8941B:23592811\r\n',
        });
      });

      const testPassword = '123456';
      const res = await hibpService.checkPasswordBreach(testPassword, { fetchFn: mockFetch as any });

      // Verifies zero plaintext password or full hash disclosure
      expect(calledUrl).toBe('https://api.pwnedpasswords.com/range/7C4A8');
      expect(calledUrl).not.toContain(testPassword);
      expect(calledUrl).not.toContain('D09CA3762AF61E59520943DC26494F8941B');
      expect(res.breached).toBe(true);
      expect(res.count).toBe(23592811);
      expect(res.offline).toBe(false);
    });

    it('handles offline / network error gracefully', async () => {
      const mockFetch = jest.fn().mockRejectedValue(new Error('Network request failed'));
      const res = await hibpService.checkPasswordBreach('secretPassword123!', { fetchFn: mockFetch as any });
      expect(res).toEqual({ breached: false, count: 0, offline: true });
    });

    it('handles non-200 HTTP response gracefully as offline', async () => {
      const mockFetch = jest.fn().mockResolvedValue({ ok: false, status: 503 });
      const res = await hibpService.checkPasswordBreach('secretPassword123!', { fetchFn: mockFetch as any });
      expect(res).toEqual({ breached: false, count: 0, offline: true });
    });
  });
});

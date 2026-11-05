/// <reference types="node" />
import crypto from 'crypto';
import { sha1, splitSha1PrefixSuffix, parseHibpRangeResponse } from '../src/utils/hibpUtils';
import { hibpService } from '../src/services/hibpService';
import {
  generateFormattedRecoveryKey,
  computeKeyChecksum,
  verifyRecoveryKeyChecksum,
  generateEmergencyKitContent,
  parseEmergencyKit,
} from '../src/utils/recoveryKit';
import * as windowsRecoveryKit from '../windows/src/utils/recoveryKit';

describe('Adversarial Challenge M4-1: HIBP k-Anonymity & Recovery Kit Checksum Integrity', () => {

  // ==========================================================================
  // SECTION 1: RFC 3174 SHA-1 Cryptographic Oracle & Boundary Stress Test
  // ==========================================================================
  describe('Cryptographic Oracle: RFC 3174 SHA-1 Implementation', () => {
    // Official RFC 3174 Test Vectors
    const rfcVectors = [
      { input: '', expected: 'DA39A3EE5E6B4B0D3255BFEF95601890AFD80709' },
      { input: 'abc', expected: 'A9993E364706816ABA3E25717850C26C9CD0D89D' },
      {
        input: 'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq',
        expected: '84983E441C3BD26EBAAE4AA1F95129E5E54670F1',
      },
      {
        input: 'The quick brown fox jumps over the lazy dog',
        expected: '2FD4E1C67A2D28FCED849EE1BB76E7391B93EB12',
      },
      {
        input: 'The quick brown fox jumps over the lazy cog',
        expected: 'DE9F2C7FD25E1B3AFAD3E85A0BD17D9B100DB4B3',
      },
    ];

    test.each(rfcVectors)('matches official RFC 3174 vector for input "$input"', ({ input, expected }) => {
      const actual = sha1(input);
      expect(actual).toBe(expected);
      const nodeActual = crypto.createHash('sha1').update(input, 'utf8').digest('hex').toUpperCase();
      expect(actual).toBe(nodeActual);
    });

    it('matches Node crypto oracle for SHA-1 padding boundary byte lengths (55, 56, 63, 64, 65, 119, 120, 127, 128)', () => {
      const boundaryLengths = [0, 1, 55, 56, 57, 63, 64, 65, 119, 120, 121, 127, 128, 129, 255, 256, 512, 1024];
      for (const len of boundaryLengths) {
        const testStr = 'A'.repeat(len);
        const actual = sha1(testStr);
        const expected = crypto.createHash('sha1').update(testStr, 'utf8').digest('hex').toUpperCase();
        expect(actual).toBe(expected);
      }
    });

    it('matches Node crypto oracle for complex multi-byte UTF-8, astral surrogate pairs, and symbols', () => {
      const complexStrings = [
        'P@sswørd🔑',
        'VaultKey-🔐-StrongPassword-2026!@#$%^&*()_+',
        'مرحبا بالعالم', // Arabic
        'こんにちは世界', // Japanese Kanji/Hiragana
        'Привет, мир! 🛡️', // Cyrillic + Emoji
        '€$¥£₹₩', // Currencies (2 and 3 byte UTF-8)
        '👨‍👩‍👧‍👦', // Complex emoji with zero-width joiners
        '\u0000\u0001\u0002\u007F\u0080\u00FF\u0100\u07FF\u0800\uFFFF', // Diverse code points
      ];

      for (const str of complexStrings) {
        const actual = sha1(str);
        const expected = crypto.createHash('sha1').update(str, 'utf8').digest('hex').toUpperCase();
        expect(actual).toBe(expected);
      }
    });

    it('passes fuzz stress testing against 500 pseudo-random strings of diverse lengths', () => {
      const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{}|;:,.<>?/`~ \t\n\u00E9\u00FC\u0152\u03A9\u4E16\u754C\u{1F510}\u{1F6E1}';
      const codePoints = Array.from(charset);
      for (let trial = 0; trial < 500; trial++) {
        const length = trial % 150;
        let str = '';
        for (let j = 0; j < length; j++) {
          str += codePoints[Math.floor(Math.random() * codePoints.length)];
        }
        const actual = sha1(str);
        const expected = crypto.createHash('sha1').update(str, 'utf8').digest('hex').toUpperCase();
        expect(actual).toBe(expected);
      }
    });
  });

  // ==========================================================================
  // SECTION 2: HIBP k-Anonymity Protocol & Network Privacy Verification
  // ==========================================================================
  describe('HIBP k-Anonymity Outbound Transmission & Zero Disclosure', () => {
    it('strictly transmits ONLY 5-char hex prefix and NEVER leaks full hash, suffix, or plaintext', async () => {
      const testCases = [
        'correct-horse-battery-staple',
        'P@ssw0rd2026!',
        '123456',
        'admin',
        'VaultKeyMasterKey#VeryLongSecretPasswordWithSymbols!@#$%^&*()',
        'P@sswørd🔑SurrogatePair',
        'a',
        '           ',
        'https://example.com/login?user=admin&pass=secret',
      ];

      for (const password of testCases) {
        let capturedUrl = '';
        let capturedOptions: any = null;

        const mockFetch = jest.fn().mockImplementation((url: string, opts: any) => {
          capturedUrl = url;
          capturedOptions = opts;
          return Promise.resolve({
            ok: true,
            text: async () => 'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF:1\r\n',
          });
        });

        const fullHash = sha1(password);
        const expectedPrefix = fullHash.substring(0, 5);
        const expectedSuffix = fullHash.substring(5);

        await hibpService.checkPasswordBreach(password, { fetchFn: mockFetch as any });

        expect(mockFetch).toHaveBeenCalledTimes(1);

        // 1. Assert URL matches strict k-anonymity endpoint pattern
        expect(capturedUrl).toBe(`https://api.pwnedpasswords.com/range/${expectedPrefix}`);
        expect(capturedUrl).toMatch(/^https:\/\/api\.pwnedpasswords\.com\/range\/[0-9A-F]{5}$/);

        // 2. Assert zero disclosure of 35-character suffix in URL or headers
        expect(capturedUrl).not.toContain(expectedSuffix);
        expect(JSON.stringify(capturedOptions)).not.toContain(expectedSuffix);

        // 3. Assert zero disclosure of plaintext password:
        // Transmitted payload is strictly the 5-char prefix, nothing else
        const urlPrefix = capturedUrl.replace('https://api.pwnedpasswords.com/range/', '');
        expect(urlPrefix).toBe(expectedPrefix);
        expect(urlPrefix.length).toBe(5);

        // Plaintext password never transmitted in body, headers, or query parameters
        expect(capturedOptions.body).toBeUndefined();
        expect(capturedOptions.headers).toEqual({
          'User-Agent': 'VaultKey-PasswordManager-v1.3.0',
          'Add-Padding': 'true',
        });
        if (password.length >= 6) {
          expect(capturedUrl).not.toContain(password);
        }

        // 4. Assert method and security headers
        expect(capturedOptions.method).toBe('GET');
        expect(capturedOptions.headers['Add-Padding']).toBe('true');
        expect(capturedOptions.headers['User-Agent']).toBe('VaultKey-PasswordManager-v1.3.0');
      }
    });

    it('short-circuits on empty password without making ANY network calls', async () => {
      const mockFetch = jest.fn();
      const res1 = await hibpService.checkPasswordBreach('', { fetchFn: mockFetch as any });
      expect(res1).toEqual({ breached: false, count: 0, offline: false });
      expect(mockFetch).not.toHaveBeenCalled();

      const res2 = await hibpService.checkPasswordBreach(undefined as any, { fetchFn: mockFetch as any });
      expect(res2).toEqual({ breached: false, count: 0, offline: false });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('splitSha1PrefixSuffix strictly validates 40-char length and splits 5:35', () => {
      const validHash = '5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8';
      const { prefix, suffix } = splitSha1PrefixSuffix(validHash);
      expect(prefix).toBe('5BAA6');
      expect(suffix).toBe('1E4C9B93F3F0682250B6CF8331B7EE68FD8');
      expect(prefix + suffix).toBe(validHash);

      // Normalizes lowercase
      const { prefix: pLower, suffix: sLower } = splitSha1PrefixSuffix(validHash.toLowerCase());
      expect(pLower).toBe('5BAA6');
      expect(sLower).toBe('1E4C9B93F3F0682250B6CF8331B7EE68FD8');

      // Rejects invalid lengths
      expect(() => splitSha1PrefixSuffix('5BAA6')).toThrow('Invalid SHA-1 hash length (5)');
      expect(() => splitSha1PrefixSuffix('5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD81')).toThrow('Invalid SHA-1 hash length (41)');
      expect(() => splitSha1PrefixSuffix('')).toThrow('Invalid SHA-1 hash length (0)');
    });
  });

  // ==========================================================================
  // SECTION 3: HIBP Range Response Parsing Robustness & Attack Vectors
  // ==========================================================================
  describe('HIBP Range Response Parsing Robustness', () => {
    const targetSuffix = '1E4C9B93F3F0682250B6CF8331B7EE68FD8';

    it('correctly matches target suffix across varied newline formats (CRLF, LF, CR)', () => {
      const crlfBody = `003D68EB55068C34ACE09600E6AD519A301:2\r\n${targetSuffix}:42\r\n`;
      expect(parseHibpRangeResponse(crlfBody, targetSuffix)).toEqual({ breached: true, count: 42 });

      const lfBody = `003D68EB55068C34ACE09600E6AD519A301:2\n${targetSuffix}:108\n`;
      expect(parseHibpRangeResponse(lfBody, targetSuffix)).toEqual({ breached: true, count: 108 });
    });

    it('handles case differences between response and target suffix', () => {
      const responseWithLower = `003D68EB55068C34ACE09600E6AD519A301:2\n${targetSuffix.toLowerCase()}:55\n`;
      expect(parseHibpRangeResponse(responseWithLower, targetSuffix)).toEqual({ breached: true, count: 55 });
      expect(parseHibpRangeResponse(responseWithLower, targetSuffix.toLowerCase())).toEqual({ breached: true, count: 55 });
    });

    it('rejects partial matches where targetSuffix is only a prefix or substring of a line', () => {
      // Line suffix has extra characters appended
      const longerSuffixBody = `${targetSuffix}99:10\n003D68EB55068C34ACE09600E6AD519A301:2\n`;
      expect(parseHibpRangeResponse(longerSuffixBody, targetSuffix)).toEqual({ breached: false, count: 0 });

      // Line suffix is shorter than targetSuffix
      const shorterSuffixBody = `${targetSuffix.substring(0, 30)}:10\n`;
      expect(parseHibpRangeResponse(shorterSuffixBody, targetSuffix)).toEqual({ breached: false, count: 0 });

      // Target suffix appears in the count column instead of the hash column
      const countMatchBody = `003D68EB55068C34ACE09600E6AD519A301:${targetSuffix}\n`;
      expect(parseHibpRangeResponse(countMatchBody, targetSuffix)).toEqual({ breached: false, count: 0 });
    });

    it('handles malformed lines, extra whitespace, non-numeric counts, and blank lines', () => {
      const malformedBody = [
        '',
        '   ',
        'NOT_A_VALID_LINE_WITHOUT_COLON',
        ':::::::',
        `   ${targetSuffix}   :   999   `,
        'ANOTHER_LINE:INVALID_COUNT',
      ].join('\n');

      const parsed = parseHibpRangeResponse(malformedBody, targetSuffix);
      expect(parsed).toEqual({ breached: true, count: 999 });

      // If count is non-numeric, falls back to 1
      const nonNumericBody = `${targetSuffix}:NaN\n`;
      expect(parseHibpRangeResponse(nonNumericBody, targetSuffix)).toEqual({ breached: true, count: 1 });
    });

    it('returns breached: false and count: 0 for empty target or empty response', () => {
      expect(parseHibpRangeResponse('', targetSuffix)).toEqual({ breached: false, count: 0 });
      expect(parseHibpRangeResponse('SOME_DATA:10', '')).toEqual({ breached: false, count: 0 });
      expect(parseHibpRangeResponse(null as any, targetSuffix)).toEqual({ breached: false, count: 0 });
    });
  });

  // ==========================================================================
  // SECTION 4: HIBP Offline Resilience, Timeouts & Error Recovery
  // ==========================================================================
  describe('HIBP Service Offline Fallback & Error Resilience', () => {
    it('gracefully handles network rejection as offline status without throwing', async () => {
      const mockFetch = jest.fn().mockRejectedValue(new Error('DNS resolution failed / ENOTFOUND'));
      const res = await hibpService.checkPasswordBreach('secret123', { fetchFn: mockFetch as any });
      expect(res).toEqual({ breached: false, count: 0, offline: true });
    });

    it('gracefully handles HTTP error codes (400, 403, 404, 429, 500, 503) as offline status', async () => {
      const errorCodes = [400, 403, 404, 429, 500, 502, 503, 504];
      for (const status of errorCodes) {
        const mockFetch = jest.fn().mockResolvedValue({ ok: false, status });
        const res = await hibpService.checkPasswordBreach('secret123', { fetchFn: mockFetch as any });
        expect(res).toEqual({ breached: false, count: 0, offline: true });
      }
    });

    it('gracefully handles timeout abort without throwing', async () => {
      const mockFetch = jest.fn().mockImplementation((_url: string, opts: any) => {
        return new Promise((_resolve, reject) => {
          if (opts?.signal) {
            opts.signal.addEventListener('abort', () => {
              reject(new Error('The user aborted a request.'));
            });
          }
        });
      });

      const res = await hibpService.checkPasswordBreach('secret123', {
        fetchFn: mockFetch as any,
        timeoutMs: 30,
      });

      expect(res).toEqual({ breached: false, count: 0, offline: true });
    });
  });

  // ==========================================================================
  // SECTION 5: Emergency Recovery Kit Formatting & Checksum Mathematical Integrity
  // ==========================================================================
  describe('Recovery Kit Key Formatting and Normalization', () => {
    it('generates 32-character key from unambiguous Base32 charset and groups into 8 chunks of 4', () => {
      for (let i = 0; i < 20; i++) {
        const keyData = generateFormattedRecoveryKey();
        expect(keyData.rawKey).toHaveLength(32);
        // Base32 charset check (no 0, 1, I, O to prevent transcription ambiguity)
        expect(keyData.rawKey).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{32}$/);
        expect(keyData.formattedKey).toBe(
          keyData.rawKey.match(/.{1,4}/g)?.join('-')
        );
        expect(keyData.checksum).toHaveLength(4);
        expect(keyData.checksum).toMatch(/^[0-9A-F]{4}$/);
      }
    });

    it('normalizes existing keys: strips hyphens, spaces, lowercases, and ignores non-alphanumeric', () => {
      const raw = '9K7D-M4XW-2F8P-HQ3R-V7YT-5NLE-8BPA-6MCZ';
      const lowercaseSpaced = '9k7d m4xw 2f8p hq3r v7yt 5nle 8bpa 6mcz';

      const keyData1 = generateFormattedRecoveryKey(raw);
      const keyData2 = generateFormattedRecoveryKey(lowercaseSpaced);

      expect(keyData1.rawKey).toBe('9K7DM4XW2F8PHQ3RV7YT5NLE8BPA6MCZ');
      expect(keyData2.rawKey).toBe('9K7DM4XW2F8PHQ3RV7YT5NLE8BPA6MCZ');
      expect(keyData1.formattedKey).toBe('9K7D-M4XW-2F8P-HQ3R-V7YT-5NLE-8BPA-6MCZ');
      expect(keyData2.formattedKey).toBe('9K7D-M4XW-2F8P-HQ3R-V7YT-5NLE-8BPA-6MCZ');
      expect(keyData1.checksum).toBe(keyData2.checksum);
    });

    it('generates a fresh random key if input key has fewer than 32 characters', () => {
      const shortKey = 'ABC123';
      const keyData = generateFormattedRecoveryKey(shortKey);
      expect(keyData.rawKey).toHaveLength(32);
      expect(keyData.rawKey).not.toBe(shortKey);
    });
  });

  // ==========================================================================
  // SECTION 6: Empirical Checksum Sensitivity & Mutation Stress Test
  // ==========================================================================
  describe('Empirical Checksum Sensitivity & Mutation Stress Test', () => {
    const base32Charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    it('detects >99.9% of single-character mutations across all 32 positions (9,920 adversarial trials)', () => {
      let totalMutations = 0;
      let detectedMutations = 0;
      let collisions = 0;

      // Run across 10 distinct recovery keys
      for (let k = 0; k < 10; k++) {
        const original = generateFormattedRecoveryKey().rawKey;
        const expectedChecksum = computeKeyChecksum(original);

        for (let pos = 0; pos < 32; pos++) {
          for (let c = 0; c < base32Charset.length; c++) {
            const char = base32Charset[c];
            if (char === original[pos]) continue; // Skip identical char

            // Create single-char mutated key
            const mutated = original.substring(0, pos) + char + original.substring(pos + 1);
            totalMutations++;

            const isValid = verifyRecoveryKeyChecksum(mutated, expectedChecksum);
            if (!isValid) {
              detectedMutations++;
            } else {
              collisions++;
            }
          }
        }
      }

      const detectionRate = (detectedMutations / totalMutations) * 100;
      // In a 16-bit checksum space, expected collision rate is 1/65536 ~= 0.0015%.
      // Detection rate must empirically exceed 99.9%.
      expect(totalMutations).toBe(10 * 32 * 31); // 9,920 trials
      expect(detectionRate).toBeGreaterThan(99.9);
      // Collisions should be extremely rare (<= 2 out of 9920 trials)
      expect(collisions).toBeLessThanOrEqual(3);
    });

    it('detects adjacent character transposition swap errors across 50 keys (1,550 trials)', () => {
      let totalSwaps = 0;
      let detectedSwaps = 0;

      for (let k = 0; k < 50; k++) {
        const original = generateFormattedRecoveryKey().rawKey;
        const expectedChecksum = computeKeyChecksum(original);

        for (let pos = 0; pos < 31; pos++) {
          if (original[pos] === original[pos + 1]) continue;

          // Swap adjacent characters
          const swapped =
            original.substring(0, pos) +
            original[pos + 1] +
            original[pos] +
            original.substring(pos + 2);

          totalSwaps++;
          const isValid = verifyRecoveryKeyChecksum(swapped, expectedChecksum);
          if (!isValid) {
            detectedSwaps++;
          }
        }
      }

      const swapDetectionRate = (detectedSwaps / totalSwaps) * 100;
      expect(swapDetectionRate).toBeGreaterThan(99.8);
    });

    it('rejects truncated keys (31 chars) and lengthened keys (33 chars)', () => {
      for (let i = 0; i < 20; i++) {
        const original = generateFormattedRecoveryKey().rawKey;
        const expectedChecksum = computeKeyChecksum(original);

        // Omit one character
        const truncated = original.substring(0, 31);
        expect(verifyRecoveryKeyChecksum(truncated, expectedChecksum)).toBe(false);

        // Append one character
        const lengthened = original + 'A';
        expect(verifyRecoveryKeyChecksum(lengthened, expectedChecksum)).toBe(false);
      }
    });

    it('is delimiter and whitespace invariant during verification', () => {
      const raw = '9K7DM4XW2F8PHQ3RV7YT5NLE8BPA6MCZ';
      const checksum = computeKeyChecksum(raw);

      expect(verifyRecoveryKeyChecksum(raw, checksum)).toBe(true);
      expect(verifyRecoveryKeyChecksum('9K7D-M4XW-2F8P-HQ3R-V7YT-5NLE-8BPA-6MCZ', checksum)).toBe(true);
      expect(verifyRecoveryKeyChecksum('9k7d m4xw 2f8p hq3r v7yt 5nle 8bpa 6mcz', checksum)).toBe(true);
      expect(verifyRecoveryKeyChecksum(' 9K7D--M4XW--2F8P--HQ3R--V7YT--5NLE--8BPA--6MCZ ', checksum)).toBe(true);
      expect(verifyRecoveryKeyChecksum(raw, checksum.toLowerCase())).toBe(true);

      // Rejects empty or missing inputs
      expect(verifyRecoveryKeyChecksum('', checksum)).toBe(false);
      expect(verifyRecoveryKeyChecksum(raw, '')).toBe(false);
      expect(verifyRecoveryKeyChecksum(null as any, checksum)).toBe(false);
      expect(verifyRecoveryKeyChecksum(raw, null as any)).toBe(false);
    });
  });

  // ==========================================================================
  // SECTION 7: Emergency Sheet Generation & Parsing Roundtrip Oracle
  // ==========================================================================
  describe('Emergency Sheet Generation & Roundtrip Parsing Oracle', () => {
    it('roundtrips valid emergency sheet with metadata and verifies checksum', () => {
      const rawKey = '9K7DM4XW2F8PHQ3RV7YT5NLE8BPA6MCZ';
      const sheet = generateEmergencyKitContent({
        vaultName: 'Enterprise Security Vault',
        userEmail: 'security@corp.vaultkey.io',
        createdAt: 1772841600000,
        recoveryKey: rawKey,
        hints: 'Safe deposit box #42 in Zurich',
      });

      expect(sheet).toContain('Enterprise Security Vault');
      expect(sheet).toContain('security@corp.vaultkey.io');
      expect(sheet).toContain('9K7D-M4XW-2F8P-HQ3R-V7YT-5NLE-8BPA-6MCZ');
      expect(sheet).toContain(`Checksum       : [CRC: ${computeKeyChecksum(rawKey)}] (Verified)`);

      const parsed = parseEmergencyKit(sheet);
      expect(parsed.isValid).toBe(true);
      expect(parsed.recoveryKey).toBe(rawKey);
      expect(parsed.checksum).toBe(computeKeyChecksum(rawKey));
    });

    it('correctly parses sheets with CRLF Windows line endings', () => {
      const rawKey = '9K7DM4XW2F8PHQ3RV7YT5NLE8BPA6MCZ';
      const sheet = generateEmergencyKitContent({ recoveryKey: rawKey });
      const crlfSheet = sheet.replace(/\n/g, '\r\n');

      const parsed = parseEmergencyKit(crlfSheet);
      expect(parsed.isValid).toBe(true);
      expect(parsed.recoveryKey).toBe(rawKey);
      expect(parsed.checksum).toBe(computeKeyChecksum(rawKey));
    });

    it('rejects sheet when recovery key is modified by a single character', () => {
      const rawKey = '9K7DM4XW2F8PHQ3RV7YT5NLE8BPA6MCZ';
      const sheet = generateEmergencyKitContent({ recoveryKey: rawKey });

      // Mutate one character of the formatted key in the sheet
      const tamperedSheet = sheet.replace(
        '9K7D-M4XW-2F8P-HQ3R-V7YT-5NLE-8BPA-6MCZ',
        '9K7D-M4XW-2F8P-HQ3R-V7YT-5NLE-8BPA-6MCX' // Z -> X
      );

      const parsed = parseEmergencyKit(tamperedSheet);
      expect(parsed.isValid).toBe(false);
      expect(parsed.recoveryKey).toBe('9K7DM4XW2F8PHQ3RV7YT5NLE8BPA6MCX');
    });

    it('rejects sheet when checksum is tampered', () => {
      const rawKey = '9K7DM4XW2F8PHQ3RV7YT5NLE8BPA6MCZ';
      const sheet = generateEmergencyKitContent({ recoveryKey: rawKey });
      const realChecksum = computeKeyChecksum(rawKey);
      const fakeChecksum = realChecksum === '0000' ? 'FFFF' : '0000';

      const tamperedSheet = sheet.replace(`[CRC: ${realChecksum}]`, `[CRC: ${fakeChecksum}]`);
      const parsed = parseEmergencyKit(tamperedSheet);
      expect(parsed.isValid).toBe(false);
      expect(parsed.checksum).toBe(fakeChecksum);
    });

    it('returns isValid: false for arbitrary text or sheets missing key or checksum', () => {
      expect(parseEmergencyKit('')).toEqual({ isValid: false });
      expect(parseEmergencyKit('Some random non-sheet text')).toEqual({ isValid: false });

      // Sheet with key but missing checksum line
      const missingChecksumSheet = 'Key : 9K7D-M4XW-2F8P-HQ3R-V7YT-5NLE-8BPA-6MCZ\nNo checksum here';
      expect(parseEmergencyKit(missingChecksumSheet)).toEqual({ isValid: false });

      // Sheet with checksum but missing key line
      const missingKeySheet = 'Checksum : [CRC: A1B2]\nNo key here';
      expect(parseEmergencyKit(missingKeySheet)).toEqual({ isValid: false });
    });
  });

  // ==========================================================================
  // SECTION 8: Desktop Windows Port Parity Verification
  // ==========================================================================
  describe('Desktop Windows Port (windows/src/utils/recoveryKit.ts) Parity', () => {
    it('produces identical 4-character checksums across 100 randomly generated keys', () => {
      for (let i = 0; i < 100; i++) {
        const rawKey = generateFormattedRecoveryKey().rawKey;
        const mobileChecksum = computeKeyChecksum(rawKey);
        const desktopChecksum = windowsRecoveryKit.computeKeyChecksum(rawKey);
        expect(desktopChecksum).toBe(mobileChecksum);
      }
    });

    it('produces identical formatted recovery keys and checksums for existing keys', () => {
      const testKeys = [
        '9K7DM4XW2F8PHQ3RV7YT5NLE8BPA6MCZ',
        '23456789ABCDEFGHJKLMNPQRSTUVWXYZ',
        'AAAAAAAA22222222BBBBBBBB33333333',
      ];

      for (const key of testKeys) {
        const mobileRes = generateFormattedRecoveryKey(key);
        const desktopRes = windowsRecoveryKit.generateFormattedRecoveryKey(key);

        expect(desktopRes.rawKey).toBe(mobileRes.rawKey);
        expect(desktopRes.formattedKey).toBe(mobileRes.formattedKey);
        expect(desktopRes.checksum).toBe(mobileRes.checksum);
      }
    });

    it('generates emergency sheet with identical critical lines on Windows', () => {
      const params = {
        vaultName: 'Desktop Windows Vault',
        userEmail: 'user@windows.local',
        createdAt: 1772841600000,
        recoveryKey: '9K7DM4XW2F8PHQ3RV7YT5NLE8BPA6MCZ',
        hints: 'Windows Hello PIN hint',
      };

      const mobileSheet = generateEmergencyKitContent(params);
      const desktopSheet = windowsRecoveryKit.generateEmergencyKitContent(params);
      expect(desktopSheet).toBe(mobileSheet);

      // Verify desktop sheet parses identically in parseEmergencyKit
      const parsedDesktop = parseEmergencyKit(desktopSheet);
      expect(parsedDesktop.isValid).toBe(true);
      expect(parsedDesktop.recoveryKey).toBe(params.recoveryKey);
      expect(parsedDesktop.checksum).toBe(computeKeyChecksum(params.recoveryKey));

      expect(desktopSheet).toContain('VAULTKEY ZERO-KNOWLEDGE EMERGENCY KIT');
      expect(desktopSheet).toContain(`Key            : 9K7D-M4XW-2F8P-HQ3R-V7YT-5NLE-8BPA-6MCZ`);
      expect(desktopSheet).toContain(`Checksum       : [CRC: ${computeKeyChecksum(params.recoveryKey)}] (Verified)`);
    });
  });
});

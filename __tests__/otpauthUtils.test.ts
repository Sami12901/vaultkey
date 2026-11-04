import { parseOtpAuthUri, validateBase32Secret } from '../src/utils/otpauthUtils';

describe('OTP Auth Utils', () => {
  describe('validateBase32Secret', () => {
    it('accepts valid RFC 4648 Base32 strings', () => {
      expect(validateBase32Secret('JBSWY3DPEHPK3PXP')).toBe(true);
      expect(validateBase32Secret('jbswy3dpehpk3pxp')).toBe(true);
      expect(validateBase32Secret('JBSW Y3DP-EHPK 3PXP')).toBe(true);
      expect(validateBase32Secret('234567QA')).toBe(true);
    });

    it('rejects invalid Base32 strings', () => {
      expect(validateBase32Secret('')).toBe(false);
      expect(validateBase32Secret('1890')).toBe(false); // 0, 1, 8, 9 not in Base32
      expect(validateBase32Secret('HELLO!@#$')).toBe(false);
    });
  });

  describe('parseOtpAuthUri', () => {
    it('correctly parses standard otpauth URI', () => {
      const uri = 'otpauth://totp/Google:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Google&algorithm=SHA1&digits=6&period=30';
      const parsed = parseOtpAuthUri(uri);

      expect(parsed.issuer).toBe('Google');
      expect(parsed.accountName).toBe('user@example.com');
      expect(parsed.secret).toBe('JBSWY3DPEHPK3PXP');
      expect(parsed.algorithm).toBe('SHA1');
      expect(parsed.digits).toBe(6);
      expect(parsed.period).toBe(30);
    });

    it('extracts issuer and account when not in query params', () => {
      const uri = 'otpauth://totp/GitHub:octocat?secret=JBSWY3DPEHPK3PXP';
      const parsed = parseOtpAuthUri(uri);

      expect(parsed.issuer).toBe('GitHub');
      expect(parsed.accountName).toBe('octocat');
      expect(parsed.secret).toBe('JBSWY3DPEHPK3PXP');
      expect(parsed.digits).toBe(6);
      expect(parsed.period).toBe(30);
    });

    it('handles SHA256 and 8 digits', () => {
      const uri = 'otpauth://totp/Crypto:alice?secret=JBSWY3DPEHPK3PXP&algorithm=SHA256&digits=8';
      const parsed = parseOtpAuthUri(uri);

      expect(parsed.algorithm).toBe('SHA256');
      expect(parsed.digits).toBe(8);
    });

    it('throws on invalid scheme', () => {
      expect(() => parseOtpAuthUri('https://example.com')).toThrow();
    });

    it('throws on missing secret', () => {
      expect(() => parseOtpAuthUri('otpauth://totp/Test:user')).toThrow();
    });
  });
});

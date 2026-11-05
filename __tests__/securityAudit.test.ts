import {
  isInsecureHttpUrl,
  extractDomainFromUrl,
  matchHighRiskDomain,
  hasMatchingTotp,
  auditVaultCredentials,
} from '../src/utils/securityAudit';

describe('Advanced Password Health Suite & Insecure HTTP Audit', () => {
  describe('isInsecureHttpUrl', () => {
    it('detects unencrypted http:// urls as insecure', () => {
      expect(isInsecureHttpUrl('http://example.com')).toBe(true);
      expect(isInsecureHttpUrl('http://insecure-bank.org/login')).toBe(true);
      expect(isInsecureHttpUrl('HTTP://MYPORTAL.NET')).toBe(true);
    });

    it('considers https:// and non-http protocols as secure', () => {
      expect(isInsecureHttpUrl('https://secure.example.com')).toBe(false);
      expect(isInsecureHttpUrl('https://accounts.google.com')).toBe(false);
    });

    it('excludes local development loopback addresses', () => {
      expect(isInsecureHttpUrl('http://localhost:3000')).toBe(false);
      expect(isInsecureHttpUrl('http://127.0.0.1:8080')).toBe(false);
      expect(isInsecureHttpUrl('http://[::1]:8000')).toBe(false);
    });

    it('returns false for null or undefined input', () => {
      expect(isInsecureHttpUrl(null)).toBe(false);
      expect(isInsecureHttpUrl(undefined)).toBe(false);
      expect(isInsecureHttpUrl('')).toBe(false);
    });
  });

  describe('extractDomainFromUrl', () => {
    it('extracts clean domain without www or paths', () => {
      expect(extractDomainFromUrl('https://www.github.com/login')).toBe('github.com');
      expect(extractDomainFromUrl('http://aws.amazon.com/console')).toBe('aws.amazon.com');
      expect(extractDomainFromUrl('google.com')).toBe('google.com');
    });
  });

  describe('matchHighRiskDomain', () => {
    it('matches known high-risk domains and popular cloud/finance services', () => {
      expect(matchHighRiskDomain('https://github.com/login')).toBe('github.com');
      expect(matchHighRiskDomain('https://accounts.google.com')).toBe('google.com');
      expect(matchHighRiskDomain('https://binance.com')).toBe('binance.com');
      expect(matchHighRiskDomain('Google Account')).toBe('google.com');
      expect(matchHighRiskDomain('GitHub Work')).toBe('github.com');
    });

    it('returns null for unlisted low-risk services', () => {
      expect(matchHighRiskDomain('https://random-forum-xyz.org')).toBeNull();
    });
  });

  describe('hasMatchingTotp', () => {
    const totpList = [
      { id: '1', title: 'GitHub: developer', issuer: 'GitHub', accountName: 'dev@github.com' },
      { id: '2', title: 'Google 2FA', issuer: 'Google', accountName: 'saif@gmail.com' },
    ];

    it('identifies when an authenticator item exists for the service', () => {
      expect(hasMatchingTotp('github.com', totpList)).toBe(true);
      expect(hasMatchingTotp('google.com', totpList)).toBe(true);
    });

    it('returns false when no matching 2FA authenticator is registered in vault', () => {
      expect(hasMatchingTotp('binance.com', totpList)).toBe(false);
      expect(hasMatchingTotp('aws.amazon.com', totpList)).toBe(false);
    });
  });

  describe('auditVaultCredentials', () => {
    it('performs comprehensive security audit detecting weak, reused, old, insecure http, and missing 2FA', () => {
      const items = [
        {
          id: 'item-1',
          type: 'LOGIN',
          title: 'Weak Login',
          password: '123',
          website: 'https://example.com',
          lastChangedAt: Date.now(),
        },
        {
          id: 'item-2',
          type: 'LOGIN',
          title: 'Reused Login A',
          password: 'Password12345!',
          website: 'http://insecure-site.com/login', // Insecure HTTP!
          lastChangedAt: Date.now(),
        },
        {
          id: 'item-3',
          type: 'LOGIN',
          title: 'Reused Login B',
          password: 'Password12345!', // Reused with item-2
          website: 'https://safe.com',
          lastChangedAt: Date.now() - 100 * 24 * 60 * 60 * 1000, // Old (>90 days)!
        },
        {
          id: 'item-4',
          type: 'LOGIN',
          title: 'GitHub Personal', // High-risk domain!
          password: 'CorrectHorseBatteryStaple2026!#',
          website: 'https://github.com',
          lastChangedAt: Date.now(),
        },
      ];

      // With no TOTP items registered
      const result = auditVaultCredentials(items, []);

      expect(result.totalItems).toBe(4);
      expect(result.weakCount).toBe(1);
      expect(result.weakItemIds).toContain('item-1');

      expect(result.reusedCount).toBe(2);
      expect(result.reusedItemIds).toContain('item-2');
      expect(result.reusedItemIds).toContain('item-3');

      expect(result.oldCount).toBe(1);
      expect(result.oldItemIds).toContain('item-3');

      expect(result.insecureHttpCount).toBe(1);
      expect(result.insecureHttpItemIds).toContain('item-2');

      expect(result.missing2faCount).toBe(1);
      expect(result.missing2faItemIds).toContain('item-4');

      expect(result.score).toBeLessThan(80);
    });

    it('returns score 100 and clean counts when all credentials are secure and 2FA is present', () => {
      const items = [
        {
          id: 'item-clean',
          type: 'LOGIN',
          title: 'GitHub Clean',
          password: 'ExtremelyStrongPassword2026!@#$%^',
          website: 'https://github.com',
          lastChangedAt: Date.now(),
        },
      ];
      const totp = [
        { id: 'totp-1', title: 'GitHub', issuer: 'GitHub', accountName: 'dev' },
      ];

      const result = auditVaultCredentials(items, totp);

      expect(result.score).toBe(100);
      expect(result.weakCount).toBe(0);
      expect(result.reusedCount).toBe(0);
      expect(result.oldCount).toBe(0);
      expect(result.insecureHttpCount).toBe(0);
      expect(result.missing2faCount).toBe(0);
    });
  });
});

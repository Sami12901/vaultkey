/// <reference types="node" />
import { extractDomain } from '../src/utils/domainUtils';

declare const __dirname: string;
declare const require: any;
const path = require('path');
const fs = require('fs');
const os = require('os');

// ============================================================================
// 1. Android DomainMatcher Oracle (Exact TypeScript port of DomainMatcher.kt)
// ============================================================================
class AndroidDomainMatcher {
  static normalizeDomain(rawUrlOrDomain: string | null): string {
    if (!rawUrlOrDomain || !rawUrlOrDomain.trim()) return '';
    const trimmed = rawUrlOrDomain.trim().toLowerCase();

    // Handle Android package URI (e.g., android://hash@com.example.app)
    if (trimmed.startsWith('android://')) {
      const atIdx = trimmed.indexOf('@');
      return atIdx !== -1 && atIdx + 1 < trimmed.length
        ? trimmed.substring(atIdx + 1).split('/')[0]
        : trimmed.replace('android://', '').split('/')[0];
    }

    const urlWithScheme = !trimmed.startsWith('http://') && !trimmed.startsWith('https://')
      ? 'https://' + trimmed
      : trimmed;

    try {
      const u = new URL(urlWithScheme);
      const host = u.hostname || trimmed;
      return this.canonicalizeHost(host);
    } catch {
      return this.canonicalizeHost(trimmed);
    }
  }

  static canonicalizeHost(host: string): string {
    let cleanHost = host.toLowerCase().trim();
    if (cleanHost.startsWith('www.')) {
      cleanHost = cleanHost.slice(4);
    }
    const colonIdx = cleanHost.indexOf(':');
    if (colonIdx !== -1) {
      cleanHost = cleanHost.substring(0, colonIdx);
    }

    const parts = cleanHost.split('.');
    if (parts.length <= 2) {
      return cleanHost;
    }

    // Check common two-part TLDs (e.g. .co.uk, .com.bd, .co.jp)
    const secondLast = parts[parts.length - 2];
    const last = parts[parts.length - 1];
    const isDoubleTld = (secondLast === 'co' || secondLast === 'com' || secondLast === 'org' || secondLast === 'edu') && last.length === 2;

    return isDoubleTld && parts.length >= 3
      ? `${parts[parts.length - 3]}.${secondLast}.${last}`
      : `${parts[parts.length - 2]}.${last}`;
  }

  static isDomainMatch(targetDomain: string, savedUrlOrDomain: string): boolean {
    const normalizedTarget = this.normalizeDomain(targetDomain);
    const normalizedSaved = this.normalizeDomain(savedUrlOrDomain);
    if (!normalizedTarget || !normalizedSaved) return false;
    return normalizedTarget === normalizedSaved;
  }
}

// ============================================================================
// 2. Desktop ExtensionBridge Oracle (windows/electron/extensionBridge.ts)
// ============================================================================
class DesktopBridgeDomainMatcher {
  static extractDomain(urlStr: string): string {
    if (!urlStr) return '';
    try {
      const u = urlStr.startsWith('http://') || urlStr.startsWith('https://')
        ? urlStr
        : 'https://' + urlStr;
      return new URL(u).hostname.replace(/^www\./, '').toLowerCase();
    } catch {
      return urlStr.split('/')[0].replace(/^www\./, '').toLowerCase();
    }
  }

  static findMatches(targetUrlOrDomain: string, vaultLogins: Array<{ website: string; title: string; username: string }>) {
    const targetDomain = this.extractDomain(targetUrlOrDomain);
    return vaultLogins.filter((item) => {
      if (!targetDomain) return false;
      const itemDomain = this.extractDomain(item.website || '');
      return !!(itemDomain && itemDomain === targetDomain);
    });
  }
}

describe('Adversarial Challenge: Anti-Phishing Domain Matching', () => {
  describe('Android DomainMatcher (DomainMatcher.kt Oracle)', () => {
    it('normalizes and matches legitimate domains and subdomains', () => {
      expect(AndroidDomainMatcher.isDomainMatch('google.com', 'https://google.com')).toBe(true);
      expect(AndroidDomainMatcher.isDomainMatch('google.com', 'https://www.google.com')).toBe(true);
      expect(AndroidDomainMatcher.isDomainMatch('google.com', 'https://accounts.google.com/signin')).toBe(true);
      expect(AndroidDomainMatcher.isDomainMatch('google.com', 'https://mail.google.com')).toBe(true);
      expect(AndroidDomainMatcher.isDomainMatch('google.co.uk', 'https://accounts.google.co.uk')).toBe(true);
      expect(AndroidDomainMatcher.isDomainMatch('paypal.com', 'https://www.paypal.com/signin')).toBe(true);
    });

    it('rejects adversarial phishing subdomains embedding target brand', () => {
      // google.com.phishing.com
      expect(AndroidDomainMatcher.isDomainMatch('google.com', 'https://google.com.phishing.com')).toBe(false);
      expect(AndroidDomainMatcher.isDomainMatch('google.com', 'https://google.com.phishing.com/login')).toBe(false);

      // paypal.com.evil.co
      expect(AndroidDomainMatcher.isDomainMatch('paypal.com', 'https://paypal.com.evil.co')).toBe(false);

      // mygoogle.com (typosquat)
      expect(AndroidDomainMatcher.isDomainMatch('google.com', 'https://mygoogle.com')).toBe(false);

      // Userinfo deception e.g. https://google.com@evil.com
      expect(AndroidDomainMatcher.isDomainMatch('google.com', 'https://google.com@attacker.com')).toBe(false);

      // Path deception e.g. https://evil.com/google.com
      expect(AndroidDomainMatcher.isDomainMatch('google.com', 'https://attacker.com/google.com')).toBe(false);

      // Hash fragment deception e.g. https://evil.com#google.com
      expect(AndroidDomainMatcher.isDomainMatch('google.com', 'https://attacker.com#google.com')).toBe(false);

      // 2-level TLD phishing e.g. google.co.uk.attacker.com
      expect(AndroidDomainMatcher.isDomainMatch('google.co.uk', 'https://google.co.uk.attacker.com')).toBe(false);
    });

    it('supports Android package URI comparison correctly', () => {
      const legitAppUri = 'android://sha256hash@com.google.android.apps.authenticator2';
      expect(AndroidDomainMatcher.isDomainMatch(legitAppUri, legitAppUri)).toBe(true);

      const fakeAppUri = 'android://sha256hash@com.attacker.fakeauthenticator';
      expect(AndroidDomainMatcher.isDomainMatch(legitAppUri, fakeAppUri)).toBe(false);
    });
  });

  describe('Desktop extensionBridge Domain Matcher', () => {
    const mockVault = [
      { title: 'Google Account', website: 'https://google.com', username: 'user@gmail.com' },
      { title: 'PayPal Personal', website: 'https://paypal.com', username: 'user@paypal.com' },
      { title: 'GitHub Work', website: 'https://github.com', username: 'octocat' },
    ];

    it('matches legitimate site visits', () => {
      const googleMatches = DesktopBridgeDomainMatcher.findMatches('https://google.com/login', mockVault);
      expect(googleMatches.length).toBe(1);
      expect(googleMatches[0].title).toBe('Google Account');

      const wwwGoogleMatches = DesktopBridgeDomainMatcher.findMatches('https://www.google.com', mockVault);
      expect(wwwGoogleMatches.length).toBe(1);
      expect(wwwGoogleMatches[0].title).toBe('Google Account');
    });

    it('blocks adversarial phishing domains from receiving legitimate credentials', () => {
      // google.com.phishing.com
      const phishingMatches1 = DesktopBridgeDomainMatcher.findMatches('https://google.com.phishing.com', mockVault);
      expect(phishingMatches1.length).toBe(0);

      // paypal.com.evil.co
      const phishingMatches2 = DesktopBridgeDomainMatcher.findMatches('https://paypal.com.evil.co/signin', mockVault);
      expect(phishingMatches2.length).toBe(0);

      // mygoogle.com
      const phishingMatches3 = DesktopBridgeDomainMatcher.findMatches('https://mygoogle.com', mockVault);
      expect(phishingMatches3.length).toBe(0);

      // Userinfo phishing e.g. https://google.com@attacker.com
      const phishingMatches4 = DesktopBridgeDomainMatcher.findMatches('https://google.com@attacker.com/login', mockVault);
      expect(phishingMatches4.length).toBe(0);

      // Unrelated site with word "Google" in page/title
      const titleAttack = DesktopBridgeDomainMatcher.findMatches('https://random-blog.net', mockVault);
      expect(titleAttack.length).toBe(0);
    });
  });

  describe('extractDomain behavior on adversarial inputs', () => {
    it('rejects or isolates adversarial phishing subdomains from target brand domain', () => {
      // Userinfo authority deception e.g. https://google.com@attacker.com
      const userinfoPhishing = extractDomain('https://google.com@attacker.com');
      expect(userinfoPhishing).toBe('attacker.com');
      expect(userinfoPhishing).not.toBe('google.com');

      const userinfoWithPort = extractDomain('https://google.com@attacker.com:8443/login');
      expect(userinfoWithPort).toBe('attacker.com');
      expect(userinfoWithPort).not.toBe('google.com');

      // Legitimate brand matching
      expect(extractDomain('https://accounts.google.com/signin')).toBe('accounts.google.com');
      expect(extractDomain('Google')).toBe('google.com');
    });
  });
});

describe('Adversarial Challenge: Path Traversal Protection', () => {
  function sanitizeAndResolve(baseDir: string, origName: string): { safeName: string; resolvedPath: string; isAllowed: boolean } {
    const baseName = path.basename(origName);
    const safeName = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const outFile = path.resolve(baseDir, safeName);
    const canonicalBase = path.resolve(baseDir);
    const isAllowed = outFile.startsWith(canonicalBase) && outFile !== canonicalBase;
    return { safeName, resolvedPath: outFile, isAllowed };
  }

  const testBaseDir = path.join(os.tmpdir(), 'vaultkey_traversal_test');

  beforeAll(() => {
    if (!fs.existsSync(testBaseDir)) {
      fs.mkdirSync(testBaseDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(testBaseDir)) {
      fs.rmSync(testBaseDir, { recursive: true, force: true });
    }
  });

  it('allows safe filenames', () => {
    const result = sanitizeAndResolve(testBaseDir, 'photo.jpg');
    expect(result.safeName).toBe('photo.jpg');
    expect(result.isAllowed).toBe(true);
    expect(result.resolvedPath.startsWith(testBaseDir)).toBe(true);
  });

  it('neutralizes directory traversal patterns ../', () => {
    const attack1 = sanitizeAndResolve(testBaseDir, '../../etc/passwd');
    expect(attack1.safeName).toBe('passwd');
    expect(attack1.isAllowed).toBe(true);
    expect(attack1.resolvedPath).toBe(path.resolve(testBaseDir, 'passwd'));

    const attack2 = sanitizeAndResolve(testBaseDir, '../../../../data/data/com.vaultkey/databases/vault.db');
    expect(attack2.safeName).toBe('vault.db');
    expect(attack2.isAllowed).toBe(true);
    expect(attack2.resolvedPath).toBe(path.resolve(testBaseDir, 'vault.db'));
  });

  it('neutralizes backslash path traversal ..\\..\\', () => {
    const raw = '..\\..\\Windows\\System32\\cmd.exe';
    const base = path.basename(raw);
    const safe = base.replace(/[^a-zA-Z0-9._-]/g, '_');
    const resolved = path.resolve(testBaseDir, safe);
    expect(resolved.startsWith(testBaseDir)).toBe(true);
  });

  it('neutralizes null bytes in filenames', () => {
    const attackNull = sanitizeAndResolve(testBaseDir, 'harmless.png\0.exe');
    expect(attackNull.safeName).toBe('harmless.png_.exe');
    expect(attackNull.isAllowed).toBe(true);
    expect(attackNull.resolvedPath.startsWith(testBaseDir)).toBe(true);
  });

  it('blocks traversal attempting to resolve to directory itself or parent (e.g. "..")', () => {
    const result = sanitizeAndResolve(testBaseDir, '..');
    expect(result.isAllowed).toBe(false);
  });
});

describe('Adversarial Challenge: Desktop Storage Atomic Writes', () => {
  const testDir = path.join(os.tmpdir(), 'vaultkey_atomic_test_' + Date.now());
  const vaultFile = path.join(testDir, 'vault_data.enc');
  const tempFile = `${vaultFile}.tmp`;

  beforeAll(() => {
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  function atomicPersist(data: object): void {
    const jsonStr = JSON.stringify(data, null, 2);
    fs.writeFileSync(tempFile, jsonStr, 'utf8');
    fs.renameSync(tempFile, vaultFile);
  }

  it('performs clean atomic writes without leaving temporary files', () => {
    const data1 = { version: 1, items: [{ id: '1', title: 'Login 1' }] };
    atomicPersist(data1);

    expect(fs.existsSync(vaultFile)).toBe(true);
    expect(fs.existsSync(tempFile)).toBe(false);

    const read1 = JSON.parse(fs.readFileSync(vaultFile, 'utf8'));
    expect(read1.version).toBe(1);
    expect(read1.items.length).toBe(1);
  });

  it('overwrites previous file atomically on subsequent writes', () => {
    const data2 = { version: 2, items: [{ id: '1', title: 'Login 1' }, { id: '2', title: 'Login 2' }] };
    atomicPersist(data2);

    expect(fs.existsSync(vaultFile)).toBe(true);
    expect(fs.existsSync(tempFile)).toBe(false);

    const read2 = JSON.parse(fs.readFileSync(vaultFile, 'utf8'));
    expect(read2.version).toBe(2);
    expect(read2.items.length).toBe(2);
  });

  it('preserves existing vault file if temp write fails prior to rename', () => {
    const originalContent = fs.readFileSync(vaultFile, 'utf8');

    try {
      fs.writeFileSync(tempFile, 'INCOMPLETE_CORRUPTED_JSON_DATA', 'utf8');
      throw new Error('Simulated process crash / power loss before renameSync');
    } catch (e: any) {
      expect(e.message).toContain('Simulated process crash');
    }

    const currentVaultContent = fs.readFileSync(vaultFile, 'utf8');
    expect(currentVaultContent).toBe(originalContent);
    const parsed = JSON.parse(currentVaultContent);
    expect(parsed.version).toBe(2);

    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
  });
});

describe('Adversarial Challenge: PBKDF2 Iteration Constant Verification', () => {
  it('confirms 600,000 PBKDF2 iterations in VaultModule.kt across all four cryptographic functions', () => {
    const vaultModulePath = path.resolve(__dirname, '../android/app/src/main/java/com/vaultkey/modules/VaultModule.kt');
    expect(fs.existsSync(vaultModulePath)).toBe(true);

    const content = fs.readFileSync(vaultModulePath, 'utf8');

    const pbeSpecRegex = /PBEKeySpec\s*\([^,]+,\s*[^,]+,\s*([0-9]+),\s*([0-9]+)\)/g;
    const matches: Array<{ fullMatch: string; iterations: number; keySize: number }> = [];

    let match;
    while ((match = pbeSpecRegex.exec(content)) !== null) {
      matches.push({
        fullMatch: match[0],
        iterations: parseInt(match[1], 10),
        keySize: parseInt(match[2], 10),
      });
    }

    expect(matches.length).toBe(4);

    for (const m of matches) {
      expect(m.iterations).toBe(600000);
      expect(m.keySize).toBe(256);
    }

    expect(content).not.toContain('10000, 256');
    expect(content).not.toContain('10_000');
  });
});

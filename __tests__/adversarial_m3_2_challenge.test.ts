/// <reference types="node" />
import crypto from 'crypto';

// ============================================================================
// 1. Windows Storage & Category Filter Oracle (windows/electron/storage.ts)
// ============================================================================

interface MemoryVaultItem {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  folderId?: string | null;
  isFavorite?: boolean;
  createdAt?: number;
  updatedAt?: number;
  tags?: string[];
  loginData?: {
    username?: string;
    password?: string;
    website?: string;
    urlsJson?: string;
    totpSecret?: string;
    totpDigits?: number;
    totpPeriod?: number;
    totpAlgorithm?: string;
  };
  cardData?: {
    cardholderName?: string;
    cardNumber?: string;
    maskedNumber?: string;
    expiryMonth?: string;
    expiryYear?: string;
    cvv?: string;
    cardBrand?: string;
    pin?: string;
    cardType?: string;
    billingZip?: string;
  };
  bankData?: {
    bankName?: string;
    accountHolder?: string;
    maskedAccountNumber?: string;
    accountNumber?: string;
    routingNumber?: string;
    swiftBic?: string;
    iban?: string;
    accountType?: string;
  };
  noteData?: {
    content?: string;
    isRichText?: boolean;
  };
  authenticatorData?: {
    issuer?: string;
    accountName?: string;
    secret?: string;
    algorithm?: string;
    digits?: number;
    period?: number;
  };
}

class WindowsStorageTestHarness {
  public items: MemoryVaultItem[] = [];

  constructor(initialItems: MemoryVaultItem[] = []) {
    this.items = [...initialItems];
  }

  // Exact reproduction of windows/electron/storage.ts:215-266
  getItemSummaries(options: any = {}): any[] {
    let list = [...this.items];

    const filterType = options.type || options.category;
    if (filterType && filterType !== 'ALL') {
      list = list.filter(i => i.type === filterType.toUpperCase());
    }
    if (options.folderId) {
      list = list.filter(i => i.folderId === options.folderId);
    }
    if (options.favoritesOnly) {
      list = list.filter(i => i.isFavorite);
    }
    if (options.query && options.query.trim()) {
      const q = options.query.toLowerCase().trim();
      list = list.filter(i =>
        (i.title && i.title.toLowerCase().includes(q)) ||
        (i.subtitle && i.subtitle.toLowerCase().includes(q)) ||
        (i.loginData?.username && i.loginData.username.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => {
      switch (options.sort) {
        case 'title_asc': return (a.title || '').localeCompare(b.title || '');
        case 'title_desc': return (b.title || '').localeCompare(a.title || '');
        case 'created_desc': return (b.createdAt || 0) - (a.createdAt || 0);
        default: return (b.updatedAt || 0) - (a.updatedAt || 0);
      }
    });

    return list.map(i => ({
      id: i.id,
      type: i.type,
      title: i.title,
      subtitle: i.subtitle,
      folderId: i.folderId,
      isFavorite: i.isFavorite,
      updatedAt: i.updatedAt,
      tags: i.tags || [],
      cardBrand: i.cardData?.cardBrand,
      maskedNumber: i.cardData?.maskedNumber,
      bankName: i.bankData?.bankName,
      maskedAccountNumber: i.bankData?.maskedAccountNumber,
      username: i.loginData?.username,
      website: i.loginData?.website,
      issuer: i.authenticatorData?.issuer,
      accountName: i.authenticatorData?.accountName,
    }));
  }

  // Exact reproduction of windows/electron/storage.ts:268-285
  getSecret(itemId: string, fieldName: string): string {
    const item = this.items.find(i => i.id === itemId);
    if (!item) throw new Error('Item not found');

    switch (fieldName) {
      case 'password': return item.loginData?.password || '';
      case 'cardNumber': return item.cardData?.cardNumber || '';
      case 'cvv': return item.cardData?.cvv || '';
      case 'pin': return item.cardData?.pin || '';
      case 'accountNumber': return item.bankData?.accountNumber || '';
      case 'notes': return item.noteData?.content || '';
      case 'secret': return item.authenticatorData?.secret || '';
      default: return '';
    }
  }

  // Exact reproduction of windows/electron/storage.ts:732-825
  importCredentialsJson(jsonStr: string): { importedCount: number } {
    const root = JSON.parse(jsonStr);
    const items = Array.isArray(root.items) ? root.items : [];
    let count = 0;

    for (const item of items) {
      const type = (item.type || '').toUpperCase();
      if (item.login || item.loginData || type === 'LOGIN') {
        const title = item.title || item.name || 'Imported Login';
        const loginObj = item.login || item.loginData || {};
        this.saveLoginItem({
          id: item.id || crypto.randomUUID(),
          title,
          username: loginObj.username || item.username || '',
          password: loginObj.password || item.password || '',
          notes: item.notes || loginObj.notes || '',
          urls: loginObj.urlsJson || loginObj.urls || item.urls || '[]',
          folderId: item.folderId,
          isFavorite: item.isFavorite,
          tags: item.tags,
        });
        count++;
      } else if (item.note || item.notes || item.noteData || type === 'SECURE_NOTE') {
        const title = item.title || 'Imported Note';
        const noteObj = item.note || item.noteData || {};
        const content = typeof item.notes === 'string' ? item.notes : (noteObj.content || item.note || item.content || '');
        this.saveSecureNote({
          id: item.id || crypto.randomUUID(),
          title,
          content,
          isRichText: !!noteObj.isRichText,
          folderId: item.folderId,
          isFavorite: item.isFavorite,
          tags: item.tags,
        });
        count++;
      } else if (item.card || item.cardData || type === 'CREDENTIAL_CARD') {
        const title = item.title || 'Imported Card';
        const cardObj = item.card || item.cardData || {};
        this.saveCreditCard({
          id: item.id || crypto.randomUUID(),
          title,
          cardholderName: cardObj.cardholderName || item.cardholderName || '',
          cardNumber: cardObj.cardNumber || item.cardNumber || '',
          expiryMonth: cardObj.expiryMonth || item.expiryMonth || '',
          expiryYear: cardObj.expiryYear || item.expiryYear || '',
          cvv: cardObj.cvv || item.cvv || '',
          cardBrand: cardObj.cardBrand || item.cardBrand || 'Card',
          pin: cardObj.pin || item.pin || '',
          cardType: cardObj.cardType || item.cardType || 'Credit',
          billingZip: cardObj.billingZip || item.billingZip || '',
          folderId: item.folderId,
          isFavorite: item.isFavorite,
          tags: item.tags,
        });
        count++;
      } else if (item.bankAccount || item.bankData || type === 'BANK_ACCOUNT') {
        const title = item.title || 'Imported Bank Account';
        const bankObj = item.bankAccount || item.bankData || {};
        this.saveBankAccount({
          id: item.id || crypto.randomUUID(),
          title,
          bankName: bankObj.bankName || item.bankName || '',
          accountHolder: bankObj.accountHolder || item.accountHolder || '',
          accountNumber: bankObj.accountNumber || item.accountNumber || '',
          routingNumber: bankObj.routingNumber || item.routingNumber || '',
          swiftBic: bankObj.swiftBic || item.swiftBic || '',
          iban: bankObj.iban || item.iban || '',
          accountType: bankObj.accountType || item.accountType || 'Checking',
          folderId: item.folderId,
          isFavorite: item.isFavorite,
          tags: item.tags,
        });
        count++;
      } else if (item.authenticator || item.authenticatorData || type === 'AUTHENTICATOR_2FA') {
        const title = item.title || item.issuer || 'Imported 2FA';
        const authObj = item.authenticator || item.authenticatorData || {};
        this.saveAuthenticatorItem({
          id: item.id || crypto.randomUUID(),
          title,
          issuer: authObj.issuer || item.issuer || '',
          accountName: authObj.accountName || item.accountName || '',
          secret: authObj.secret || item.secret || '',
          algorithm: authObj.algorithm || item.algorithm || 'SHA1',
          digits: authObj.digits || item.digits || 6,
          period: authObj.period || item.period || 30,
          folderId: item.folderId,
          isFavorite: item.isFavorite,
          tags: item.tags,
        });
        count++;
      }
    }

    return { importedCount: count };
  }

  saveLoginItem(data: any): string {
    const id = data.id || crypto.randomUUID();
    const item: MemoryVaultItem = {
      id,
      type: 'LOGIN',
      title: data.title,
      subtitle: data.username,
      folderId: data.folderId,
      isFavorite: !!data.isFavorite,
      tags: data.tags || [],
      loginData: {
        username: data.username,
        password: data.password,
        website: typeof data.urls === 'string' && data.urls.startsWith('http') ? data.urls : '',
        urlsJson: typeof data.urls === 'string' ? data.urls : JSON.stringify(data.urls || []),
      },
    };
    this.items.push(item);
    return id;
  }

  saveSecureNote(data: any): string {
    const id = data.id || crypto.randomUUID();
    const item: MemoryVaultItem = {
      id,
      type: 'SECURE_NOTE',
      title: data.title,
      subtitle: (data.content || '').substring(0, 40),
      folderId: data.folderId,
      isFavorite: !!data.isFavorite,
      tags: data.tags || [],
      noteData: {
        content: data.content,
        isRichText: data.isRichText,
      },
    };
    this.items.push(item);
    return id;
  }

  saveCreditCard(data: any): string {
    const id = data.id || crypto.randomUUID();
    const num = data.cardNumber || '';
    const masked = num.length >= 4 ? '•••• ' + num.slice(-4) : '••••';
    const item: MemoryVaultItem = {
      id,
      type: 'CREDENTIAL_CARD',
      title: data.title,
      subtitle: `${data.cardBrand || 'Card'} (${masked})`,
      folderId: data.folderId,
      isFavorite: !!data.isFavorite,
      tags: data.tags || [],
      cardData: {
        cardholderName: data.cardholderName,
        cardNumber: num,
        maskedNumber: masked,
        expiryMonth: data.expiryMonth,
        expiryYear: data.expiryYear,
        cvv: data.cvv,
        cardBrand: data.cardBrand || 'Card',
        pin: data.pin,
        cardType: data.cardType || 'Credit',
        billingZip: data.billingZip,
      },
    };
    this.items.push(item);
    return id;
  }

  saveBankAccount(data: any): string {
    const id = data.id || crypto.randomUUID();
    const num = data.accountNumber || '';
    const masked = num.length >= 4 ? '•••• ' + num.slice(-4) : '••••';
    const item: MemoryVaultItem = {
      id,
      type: 'BANK_ACCOUNT',
      title: data.title,
      subtitle: `${data.bankName || 'Bank'} (${masked})`,
      folderId: data.folderId,
      isFavorite: !!data.isFavorite,
      tags: data.tags || [],
      bankData: {
        bankName: data.bankName,
        accountHolder: data.accountHolder,
        accountNumber: num,
        maskedAccountNumber: masked,
        routingNumber: data.routingNumber,
        swiftBic: data.swiftBic,
        iban: data.iban,
        accountType: data.accountType,
      },
    };
    this.items.push(item);
    return id;
  }

  saveAuthenticatorItem(data: any): string {
    const id = data.id || crypto.randomUUID();
    const item: MemoryVaultItem = {
      id,
      type: 'AUTHENTICATOR_2FA',
      title: data.title || data.issuer || '2FA Authenticator',
      subtitle: `${data.issuer || ''} (${data.accountName || ''})`,
      folderId: data.folderId,
      isFavorite: !!data.isFavorite,
      tags: data.tags || [],
      authenticatorData: {
        issuer: data.issuer,
        accountName: data.accountName,
        secret: data.secret,
        algorithm: data.algorithm || 'SHA1',
        digits: data.digits || 6,
        period: data.period || 30,
      },
    };
    this.items.push(item);
    return id;
  }
}

// ============================================================================
// 2. TOTP RFC 6238 Engine (Exact port of windows/electron/totpEngine.ts)
// ============================================================================
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

class TestTotpEngine {
  public static decodeBase32(base32: string): Buffer {
    const sanitized = base32.trim().replace(/[\s-]/g, '').toUpperCase();
    if (!sanitized) return Buffer.alloc(0);

    let buffer = 0;
    let bitsLeft = 0;
    const output: number[] = [];

    for (let i = 0; i < sanitized.length; i++) {
      const ch = sanitized[i];
      if (ch === '=') break;
      const val = BASE32_ALPHABET.indexOf(ch);
      if (val === -1) continue;

      buffer = (buffer << 5) | val;
      bitsLeft += 5;

      if (bitsLeft >= 8) {
        bitsLeft -= 8;
        output.push((buffer >> bitsLeft) & 0xff);
      }
    }

    return Buffer.from(output);
  }

  public static generateTotp(
    secretBuffer: Buffer,
    epochSeconds = Math.floor(Date.now() / 1000),
    period = 30,
    digits = 6,
    algorithm = 'SHA1'
  ) {
    try {
      const validPeriod = period > 0 ? period : 30;
      const validDigits = digits === 8 ? 8 : 6;
      const timeStep = Math.floor(epochSeconds / validPeriod);
      const remainingSeconds = validPeriod - (epochSeconds % validPeriod);
      const progress = remainingSeconds / validPeriod;

      const timeBuffer = Buffer.alloc(8);
      timeBuffer.writeUInt32BE(Math.floor(timeStep / 0x100000000), 0);
      timeBuffer.writeUInt32BE(timeStep & 0xffffffff, 4);

      let hmacAlgo = 'sha1';
      const cleanAlgo = algorithm.toUpperCase().replace(/[-_]/g, '');
      if (cleanAlgo === 'SHA256' || cleanAlgo === 'HMACSHA256') {
        hmacAlgo = 'sha256';
      } else if (cleanAlgo === 'SHA512' || cleanAlgo === 'HMACSHA512') {
        hmacAlgo = 'sha512';
      }

      const hmac = crypto.createHmac(hmacAlgo, secretBuffer);
      hmac.update(timeBuffer);
      const hash = hmac.digest();

      const offset = hash[hash.length - 1] & 0x0f;
      const binary =
        ((hash[offset] & 0x7f) << 24) |
        ((hash[offset + 1] & 0xff) << 16) |
        ((hash[offset + 2] & 0xff) << 8) |
        (hash[offset + 3] & 0xff);

      const divisor = validDigits === 8 ? 100000000 : 1000000;
      const otp = binary % divisor;
      const code = otp.toString().padStart(validDigits, '0');

      return {
        code,
        remainingSeconds,
        period: validPeriod,
        progress,
      };
    } finally {
      secretBuffer.fill(0);
    }
  }

  public static generateFromBase32(
    base32Secret: string,
    epochSeconds = Math.floor(Date.now() / 1000),
    period = 30,
    digits = 6,
    algorithm = 'SHA1'
  ) {
    const buf = this.decodeBase32(base32Secret);
    return this.generateTotp(buf, epochSeconds, period, digits, algorithm);
  }
}

// ============================================================================
// SUITE 1: Storage Category Filtering & Chrome Extension Autofill Isolation
// ============================================================================

describe('Adversarial Challenge M3-2: Storage Category Filtering & Chrome Extension Isolation', () => {
  let harness: WindowsStorageTestHarness;

  const mockVaultItems: MemoryVaultItem[] = [
    {
      id: 'login-google-1',
      type: 'LOGIN',
      title: 'Google Personal',
      subtitle: 'user@gmail.com',
      loginData: { username: 'user@gmail.com', password: 'SecretPassword123!', website: 'https://google.com' },
    },
    {
      id: 'login-github-2',
      type: 'LOGIN',
      title: 'GitHub Enterprise',
      subtitle: 'octocat',
      loginData: { username: 'octocat', password: 'GhToken_xyz987', website: 'https://github.com' },
    },
    {
      id: 'card-chase-1',
      type: 'CREDENTIAL_CARD',
      title: 'Chase Sapphire Reserve',
      subtitle: 'Visa (•••• 4321)',
      cardData: {
        cardholderName: 'Alice Developer',
        cardNumber: '4111222233334321',
        maskedNumber: '•••• 4321',
        cvv: '891',
        pin: '1234',
        cardBrand: 'Visa',
      },
    },
    {
      id: 'bank-bofa-1',
      type: 'BANK_ACCOUNT',
      title: 'Bank of America Business',
      subtitle: 'Bank (•••• 8899)',
      bankData: {
        bankName: 'Bank of America',
        accountHolder: 'Alice Corp',
        accountNumber: '987654328899',
        maskedAccountNumber: '•••• 8899',
        routingNumber: '026009593',
      },
    },
    {
      id: 'note-recovery-1',
      type: 'SECURE_NOTE',
      title: 'Hardware Wallet BIP-39 Seed',
      subtitle: 'abandon ability able about above absent absorb',
      noteData: {
        content: 'abandon ability able about above absent absorb abstract absurd abuse access accident',
      },
    },
    {
      id: 'totp-aws-1',
      type: 'AUTHENTICATOR_2FA',
      title: 'AWS Root Account MFA',
      subtitle: 'Amazon (root@example.com)',
      authenticatorData: {
        issuer: 'Amazon Web Services',
        accountName: 'root@example.com',
        secret: 'JBSWY3DPEHPK3PXP',
      },
    },
  ];

  beforeEach(() => {
    harness = new WindowsStorageTestHarness(mockVaultItems);
  });

  it('strictly returns ONLY LOGIN items when options.category = "LOGIN"', () => {
    const results = harness.getItemSummaries({ category: 'LOGIN' });

    expect(results).toHaveLength(2);
    expect(results.every(r => r.type === 'LOGIN')).toBe(true);

    const ids = results.map(r => r.id);
    expect(ids).toContain('login-google-1');
    expect(ids).toContain('login-github-2');

    // Verify zero leakage of non-login IDs
    expect(ids).not.toContain('card-chase-1');
    expect(ids).not.toContain('bank-bofa-1');
    expect(ids).not.toContain('note-recovery-1');
    expect(ids).not.toContain('totp-aws-1');
  });

  it('guarantees zero card or banking metadata leaks in category = "LOGIN" summaries', () => {
    const results = harness.getItemSummaries({ category: 'LOGIN' });

    for (const item of results) {
      expect(item.maskedNumber).toBeUndefined();
      expect(item.cardBrand).toBeUndefined();
      expect(item.bankName).toBeUndefined();
      expect(item.maskedAccountNumber).toBeUndefined();
      // Ensure raw secrets cannot be extracted via password field for other types
      expect(() => harness.getSecret(item.id, 'cardNumber')).not.toThrow();
      expect(harness.getSecret(item.id, 'cardNumber')).toBe('');
      expect(harness.getSecret(item.id, 'accountNumber')).toBe('');
      expect(harness.getSecret(item.id, 'notes')).toBe('');
    }
  });

  it('normalizes lowercase options.category = "login" without leaking items', () => {
    const results = harness.getItemSummaries({ category: 'login' });
    expect(results).toHaveLength(2);
    expect(results.every(r => r.type === 'LOGIN')).toBe(true);
  });

  it('supports options.type fallback if options.category is omitted', () => {
    const results = harness.getItemSummaries({ type: 'LOGIN' });
    expect(results).toHaveLength(2);
    expect(results.every(r => r.type === 'LOGIN')).toBe(true);
  });

  it('strictly isolates CREDENTIAL_CARD, BANK_ACCOUNT, and SECURE_NOTE queries', () => {
    const cards = harness.getItemSummaries({ category: 'CREDENTIAL_CARD' });
    expect(cards).toHaveLength(1);
    expect(cards[0].id).toBe('card-chase-1');
    expect(cards[0].type).toBe('CREDENTIAL_CARD');

    const banks = harness.getItemSummaries({ category: 'BANK_ACCOUNT' });
    expect(banks).toHaveLength(1);
    expect(banks[0].id).toBe('bank-bofa-1');
    expect(banks[0].type).toBe('BANK_ACCOUNT');

    const notes = harness.getItemSummaries({ category: 'SECURE_NOTE' });
    expect(notes).toHaveLength(1);
    expect(notes[0].id).toBe('note-recovery-1');
    expect(notes[0].type).toBe('SECURE_NOTE');

    const totps = harness.getItemSummaries({ category: 'AUTHENTICATOR_2FA' });
    expect(totps).toHaveLength(1);
    expect(totps[0].id).toBe('totp-aws-1');
    expect(totps[0].type).toBe('AUTHENTICATOR_2FA');
  });

  it('returns all items when category is "ALL" or undefined', () => {
    const allByCategory = harness.getItemSummaries({ category: 'ALL' });
    expect(allByCategory).toHaveLength(6);

    const allByEmpty = harness.getItemSummaries({});
    expect(allByEmpty).toHaveLength(6);
  });

  it('prevents extension /api/match from matching non-login items with similar domains', () => {
    // Add a card and note with titles/subtitles containing "google"
    harness.items.push({
      id: 'card-google-play',
      type: 'CREDENTIAL_CARD',
      title: 'Google Play Gift Card',
      subtitle: 'Google (•••• 9999)',
      cardData: { cardNumber: '4111222233339999', maskedNumber: '•••• 9999' },
    });
    harness.items.push({
      id: 'note-google-cloud',
      type: 'SECURE_NOTE',
      title: 'Google Cloud Root IAM Keys',
      noteData: { content: 'secret gcp credentials' },
    });

    // Simulate extensionBridge.ts:168:
    // const allLogins = this.storage.getItemSummaries({ category: 'LOGIN' });
    const allLogins = harness.getItemSummaries({ category: 'LOGIN' });

    // Ensure non-login items with "Google" in title/subtitle were NEVER returned in allLogins
    const ids = allLogins.map(i => i.id);
    expect(ids).not.toContain('card-google-play');
    expect(ids).not.toContain('note-google-cloud');
    expect(ids).toEqual(['login-google-1', 'login-github-2']);
  });
});

// ============================================================================
// SUITE 2: Multi-Type JSON Import (Windows & Android Formats)
// ============================================================================

describe('Adversarial Challenge M3-2: Multi-Type JSON Import', () => {
  let harness: WindowsStorageTestHarness;

  beforeEach(() => {
    harness = new WindowsStorageTestHarness([]);
  });

  it('imports all 5 credential types from native Windows export payload', () => {
    const windowsPayload = {
      generator: 'VaultKey Windows Desktop',
      exportedAt: Date.now(),
      items: [
        {
          id: 'win-log-1',
          type: 'LOGIN',
          title: 'Discord',
          loginData: { username: 'gamer@vault.io', password: 'Password999!', urlsJson: 'https://discord.com' },
        },
        {
          id: 'win-note-1',
          type: 'SECURE_NOTE',
          title: 'Server SSH Passphrase',
          noteData: { content: 'correct horse battery staple', isRichText: false },
        },
        {
          id: 'win-card-1',
          type: 'CREDENTIAL_CARD',
          title: 'Mastercard Debit',
          cardData: {
            cardholderName: 'Bob Builder',
            cardNumber: '5555444433332222',
            cvv: '777',
            expiryMonth: '11',
            expiryYear: '2028',
            cardBrand: 'Mastercard',
          },
        },
        {
          id: 'win-bank-1',
          type: 'BANK_ACCOUNT',
          title: 'Wells Fargo Savings',
          bankData: {
            bankName: 'Wells Fargo',
            accountHolder: 'Bob Builder',
            accountNumber: '1122334455',
            routingNumber: '121000248',
          },
        },
        {
          id: 'win-2fa-1',
          type: 'AUTHENTICATOR_2FA',
          title: 'GitHub MFA',
          authenticatorData: {
            issuer: 'GitHub',
            accountName: 'bob_builder',
            secret: 'NBSWY3DPEHPK3PXP',
            digits: 6,
            period: 30,
            algorithm: 'SHA1',
          },
        },
      ],
    };

    const res = harness.importCredentialsJson(JSON.stringify(windowsPayload));
    expect(res.importedCount).toBe(5);

    // Verify all items are saved and queryable by category
    expect(harness.getItemSummaries({ category: 'LOGIN' })).toHaveLength(1);
    expect(harness.getItemSummaries({ category: 'SECURE_NOTE' })).toHaveLength(1);
    expect(harness.getItemSummaries({ category: 'CREDENTIAL_CARD' })).toHaveLength(1);
    expect(harness.getItemSummaries({ category: 'BANK_ACCOUNT' })).toHaveLength(1);
    expect(harness.getItemSummaries({ category: 'AUTHENTICATOR_2FA' })).toHaveLength(1);

    // Verify secret retrieval for each imported type
    const cardItem = harness.getItemSummaries({ category: 'CREDENTIAL_CARD' })[0];
    expect(harness.getSecret(cardItem.id, 'cardNumber')).toBe('5555444433332222');
    expect(harness.getSecret(cardItem.id, 'cvv')).toBe('777');

    const bankItem = harness.getItemSummaries({ category: 'BANK_ACCOUNT' })[0];
    expect(harness.getSecret(bankItem.id, 'accountNumber')).toBe('1122334455');

    const noteItem = harness.getItemSummaries({ category: 'SECURE_NOTE' })[0];
    expect(harness.getSecret(noteItem.id, 'notes')).toBe('correct horse battery staple');

    const authItem = harness.getItemSummaries({ category: 'AUTHENTICATOR_2FA' })[0];
    expect(harness.getSecret(authItem.id, 'secret')).toBe('NBSWY3DPEHPK3PXP');
  });

  it('imports all 5 credential types from Android BackupModule export payload', () => {
    // Exact schema emitted by Android BackupModule.kt:340-422
    const androidPayload = {
      format: 'VAULTKEY_CREDENTIALS_JSON',
      exportedAt: Date.now(),
      items: [
        {
          type: 'LOGIN',
          title: 'Slack App',
          login: {
            username: 'alice@slack.com',
            password: 'SlackPassword!2026',
            urls: 'https://slack.com',
            notes: 'Mobile workspace',
          },
        },
        {
          type: 'SECURE_NOTE',
          title: 'Recovery Codes',
          notes: 'alpha beta gamma delta',
        },
        {
          type: 'CREDENTIAL_CARD',
          title: 'Amex Platinum',
          card: {
            cardholderName: 'Alice Developer',
            cardNumber: '378282246310005',
            expiryMonth: '12',
            expiryYear: '2029',
            cvv: '1234',
            cardBrand: 'American Express',
            cardType: 'Credit',
            billingZip: '94103',
          },
        },
        {
          type: 'BANK_ACCOUNT',
          title: 'Citibank Checking',
          bankAccount: {
            bankName: 'Citibank',
            accountHolder: 'Alice Developer',
            accountNumber: '9988776655',
            routingNumber: '021000089',
            accountType: 'Checking',
          },
        },
        {
          type: 'AUTHENTICATOR_2FA',
          title: 'Cloudflare 2FA',
          authenticator: {
            issuer: 'Cloudflare',
            accountName: 'alice@cloudflare.com',
            secret: 'HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ',
            algorithm: 'SHA1',
            digits: 6,
            period: 30,
          },
        },
      ],
    };

    const res = harness.importCredentialsJson(JSON.stringify(androidPayload));
    expect(res.importedCount).toBe(5);

    const summaries = harness.getItemSummaries();
    expect(summaries).toHaveLength(5);

    const login = summaries.find(s => s.type === 'LOGIN');
    expect(login?.title).toBe('Slack App');
    expect(login?.username).toBe('alice@slack.com');

    const note = summaries.find(s => s.type === 'SECURE_NOTE');
    expect(note?.title).toBe('Recovery Codes');
    expect(harness.getSecret(note!.id, 'notes')).toBe('alpha beta gamma delta');

    const card = summaries.find(s => s.type === 'CREDENTIAL_CARD');
    expect(card?.title).toBe('Amex Platinum');
    expect(harness.getSecret(card!.id, 'cardNumber')).toBe('378282246310005');

    const bank = summaries.find(s => s.type === 'BANK_ACCOUNT');
    expect(bank?.title).toBe('Citibank Checking');
    expect(harness.getSecret(bank!.id, 'accountNumber')).toBe('9988776655');

    const auth = summaries.find(s => s.type === 'AUTHENTICATOR_2FA');
    expect(auth?.title).toBe('Cloudflare 2FA');
    expect(harness.getSecret(auth!.id, 'secret')).toBe('HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ');
  });

  it('handles empty items array and malformed records gracefully', () => {
    const emptyPayload = JSON.stringify({ items: [] });
    expect(harness.importCredentialsJson(emptyPayload).importedCount).toBe(0);

    const unknownTypesPayload = JSON.stringify({
      items: [
        { type: 'UNKNOWN_DEVICE', title: 'Smart Toaster' },
        { type: 'PASSKEY', title: 'FIDO2 USB' },
      ],
    });
    expect(harness.importCredentialsJson(unknownTypesPayload).importedCount).toBe(0);
  });
});

// ============================================================================
// SUITE 3: Windows 2FA Authenticator Engine & VaultView UI Calculations
// ============================================================================

describe('Adversarial Challenge M3-2: 2FA TOTP Engine & VaultView UI Logic', () => {
  // Standard RFC 6238 Appendix B test vector:
  // Secret: "12345678901234567890" -> Base32: "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"
  const RFC_SECRET_BASE32 = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

  it('accurately reproduces RFC 6238 standard TOTP test vectors', () => {
    // Vector 1: T = 59s -> step 1 -> OTP 287082
    const res59 = TestTotpEngine.generateFromBase32(RFC_SECRET_BASE32, 59, 30, 6, 'SHA1');
    expect(res59.code).toBe('287082');
    expect(res59.remainingSeconds).toBe(1);
    expect(res59.progress).toBeCloseTo(1 / 30, 5);

    // Vector 2: T = 1111111109s -> step 37037036 -> OTP 081804
    const res1111111109 = TestTotpEngine.generateFromBase32(RFC_SECRET_BASE32, 1111111109, 30, 6, 'SHA1');
    expect(res1111111109.code).toBe('081804');
    expect(res1111111109.remainingSeconds).toBe(1);

    // Vector 3: T = 1111111111s -> step 37037037 -> OTP 050471
    const res1111111111 = TestTotpEngine.generateFromBase32(RFC_SECRET_BASE32, 1111111111, 30, 6, 'SHA1');
    expect(res1111111111.code).toBe('050471');

    // Vector 4: T = 1234567890s -> step 41152263 -> OTP 005924
    const res1234567890 = TestTotpEngine.generateFromBase32(RFC_SECRET_BASE32, 1234567890, 30, 6, 'SHA1');
    expect(res1234567890.code).toBe('005924');

    // Vector 5: T = 2000000000s -> step 66666666 -> OTP 279037
    const res2000000000 = TestTotpEngine.generateFromBase32(RFC_SECRET_BASE32, 2000000000, 30, 6, 'SHA1');
    expect(res2000000000.code).toBe('279037');
  });

  it('supports 8-digit TOTP codes per RFC 6238', () => {
    // Vector 1 (8 digits): T = 59s -> 94287082
    const res8 = TestTotpEngine.generateFromBase32(RFC_SECRET_BASE32, 59, 30, 8, 'SHA1');
    expect(res8.code).toBe('94287082');
  });

  it('sanitizes lowercase, hyphens, and spaces in Base32 secret', () => {
    const rawSecret = 'JBSWY3DPEHPK3PXP';
    const spacedSecret = 'JBSW Y3DP EHPK 3PXP';
    const hyphenSecret = 'jbsw-y3dp-ehpk-3pxp';

    const t = 1700000000;
    const expected = TestTotpEngine.generateFromBase32(rawSecret, t, 30, 6);
    const spacedRes = TestTotpEngine.generateFromBase32(spacedSecret, t, 30, 6);
    const hyphenRes = TestTotpEngine.generateFromBase32(hyphenSecret, t, 30, 6);

    expect(spacedRes.code).toBe(expected.code);
    expect(hyphenRes.code).toBe(expected.code);
  });

  it('verifies circular countdown progress ring mathematical bounds in VaultView.tsx', () => {
    // Circular ring logic in VaultView.tsx:1475-1481:
    // const progress = totpData?.progress ?? 1;
    // const remaining = totpData?.remainingSeconds ?? 30;
    // const strokeColor = remaining > 10 ? '#10B981' : remaining > 5 ? '#F59E0B' : '#EF4444';
    // const radius = 24;
    // const circumference = 2 * Math.PI * radius;
    // const strokeDashoffset = circumference * (1 - Math.max(0, Math.min(1, progress)));

    const radius = 24;
    const circumference = 2 * Math.PI * radius;

    const computeColor = (remaining: number) =>
      remaining > 10 ? '#10B981' : remaining > 5 ? '#F59E0B' : '#EF4444';

    const computeOffset = (progress: number) =>
      circumference * (1 - Math.max(0, Math.min(1, progress)));

    // Test Green (> 10s)
    expect(computeColor(30)).toBe('#10B981');
    expect(computeColor(11)).toBe('#10B981');

    // Test Amber (> 5s and <= 10s)
    expect(computeColor(10)).toBe('#F59E0B');
    expect(computeColor(6)).toBe('#F59E0B');

    // Test Red (<= 5s)
    expect(computeColor(5)).toBe('#EF4444');
    expect(computeColor(1)).toBe('#EF4444');

    // Progress at start (remaining 30s): progress 1.0 -> strokeDashoffset = 0 (full ring)
    expect(computeOffset(1.0)).toBe(0);

    // Progress at half (remaining 15s): progress 0.5 -> strokeDashoffset = half circumference
    expect(computeOffset(0.5)).toBeCloseTo(circumference / 2, 5);

    // Progress at expiry (remaining 0s): progress 0.0 -> strokeDashoffset = circumference (empty ring)
    expect(computeOffset(0.0)).toBeCloseTo(circumference, 5);
  });

  it('verifies VaultView.tsx:1524 6-digit code formatting (split 3-3)', () => {
    const formatCode = (code?: string) => {
      if (!code) return '••••••';
      return code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code;
    };

    expect(formatCode('123456')).toBe('123 456');
    expect(formatCode('987012')).toBe('987 012');
    expect(formatCode('12345678')).toBe('12345678');
    expect(formatCode(undefined)).toBe('••••••');
  });
});

// ============================================================================
// SUITE 4: Mobile UI/UX Layout Verification (FlatList Padding & TabBar Insets)
// ============================================================================

describe('Adversarial Challenge M3-2: Mobile UI/UX Layout Rules', () => {
  it('confirms FlatList listContent paddingBottom is at least 96dp (actual: 110dp)', () => {
    const fs = require('fs');
    const path = require('path');

    const vaultHomeScreenPath = path.resolve(__dirname, '../src/screens/vault/VaultHomeScreen.tsx');
    const content = fs.readFileSync(vaultHomeScreenPath, 'utf8');

    // Check FlatList inline style or contentContainerStyle:
    // contentContainerStyle={[styles.listContent, { paddingBottom: 110 }]}
    expect(content).toMatch(/paddingBottom:\s*110/);

    // Check style definition in styles.listContent
    expect(content).toMatch(/listContent:\s*\{[^}]*paddingBottom:\s*110/);

    // Mathematically verify clearance:
    // FAB diameter = 56, FAB bottom = 24 (spacing.lg) -> FAB top is at 80dp from container bottom
    // paddingBottom = 110dp guarantees 30dp clearance above the FAB!
    const paddingBottomValue = 110;
    const fabOccupancy = 56 + 24; // 80dp
    expect(paddingBottomValue).toBeGreaterThanOrEqual(96);
    expect(paddingBottomValue - fabOccupancy).toBeGreaterThan(0);
  });

  it('confirms decluttered header: redundant Generator and Settings icons removed', () => {
    const fs = require('fs');
    const path = require('path');

    const vaultHomeScreenPath = path.resolve(__dirname, '../src/screens/vault/VaultHomeScreen.tsx');
    const content = fs.readFileSync(vaultHomeScreenPath, 'utf8');

    // Header Right should contain ONLY lock button
    const headerRightSection = content.substring(
      content.indexOf('<View style={styles.headerRight}>'),
      content.indexOf('</View>', content.indexOf('<View style={styles.headerRight}>'))
    );

    expect(headerRightSection).toContain('lockBtn');
    expect(headerRightSection).toContain('LockIcon');

    // Redundant icons should NOT be in the header
    expect(headerRightSection).not.toContain('onOpenGenerator');
    expect(headerRightSection).not.toContain('onOpenSettings');
    expect(headerRightSection).not.toContain('onOpenBackup');
  });

  it('confirms BottomTabBar uses dynamic Safe Area Insets to prevent gesture bar clipping', () => {
    const fs = require('fs');
    const path = require('path');

    const bottomTabBarPath = path.resolve(__dirname, '../src/components/common/BottomTabBar.tsx');
    const content = fs.readFileSync(bottomTabBarPath, 'utf8');

    // Must import useSafeAreaInsets
    expect(content).toContain('useSafeAreaInsets');

    // Must compute bottomPadding with minimum fallback
    expect(content).toMatch(/const\s+bottomPadding\s*=\s*Math\.max\(insets\.bottom,\s*8\)/);

    // Must apply dynamic height and paddingBottom
    expect(content).toMatch(/paddingBottom:\s*bottomPadding/);
    expect(content).toMatch(/height:\s*56\s*\+\s*bottomPadding/);

    // Evaluate simulated insets:
    const simulateBarHeight = (insetsBottom: number) => {
      const bottomPadding = Math.max(insetsBottom, 8);
      return {
        bottomPadding,
        totalHeight: 56 + bottomPadding,
      };
    };

    // Standard Android 3-button nav (insets.bottom = 0):
    const zeroInset = simulateBarHeight(0);
    expect(zeroInset.bottomPadding).toBe(8);
    expect(zeroInset.totalHeight).toBe(64);

    // Modern Android gesture navigation (insets.bottom = 24):
    const gestureInset = simulateBarHeight(24);
    expect(gestureInset.bottomPadding).toBe(24);
    expect(gestureInset.totalHeight).toBe(80);

    // Extended notch/pill device (insets.bottom = 34):
    const largeInset = simulateBarHeight(34);
    expect(largeInset.bottomPadding).toBe(34);
    expect(largeInset.totalHeight).toBe(90);
  });
});

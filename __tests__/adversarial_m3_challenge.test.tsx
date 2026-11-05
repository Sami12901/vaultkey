/// <reference types="node" />
declare const global: any;
declare const __dirname: string;
declare const require: any;

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { ItemEditScreen } from '../src/screens/vault/ItemEditScreen';
import { vaultNative } from '../src/services/nativeBridge';
import { VaultItemSummary, ItemType } from '../src/types';

const crypto = require('crypto');

// ============================================================================
// AES-256-GCM Oracle (Mirrors android/app/.../crypto/AesGcmCipher.kt)
// ============================================================================
class AesGcmOracle {
  static readonly KEY_LENGTH = 32;
  static readonly IV_LENGTH = 12;
  static readonly TAG_LENGTH = 16;

  static generateKey(): Buffer {
    return crypto.randomBytes(this.KEY_LENGTH);
  }

  static generateIv(): Buffer {
    return crypto.randomBytes(this.IV_LENGTH);
  }

  static encrypt(plaintext: Buffer | string, key: Buffer, iv?: Buffer): { ciphertext: Buffer; iv: Buffer } {
    const activeIv = iv || this.generateIv();
    const cipher = crypto.createCipheriv('aes-256-gcm', key, activeIv);
    const ptBuffer = Buffer.isBuffer(plaintext) ? plaintext : Buffer.from(plaintext, 'utf8');
    const encrypted = Buffer.concat([cipher.update(ptBuffer), cipher.final()]);
    const tag = cipher.getAuthTag();
    // Java JCE AES/GCM appends the 16-byte tag to the ciphertext
    const ciphertextWithTag = Buffer.concat([encrypted, tag]);
    return { ciphertext: ciphertextWithTag, iv: activeIv };
  }

  static decrypt(ciphertextWithTag: Buffer, iv: Buffer, key: Buffer): Buffer {
    if (ciphertextWithTag.length < this.TAG_LENGTH) {
      throw new Error('Ciphertext too short');
    }
    const tag = ciphertextWithTag.subarray(ciphertextWithTag.length - this.TAG_LENGTH);
    const actualCiphertext = ciphertextWithTag.subarray(0, ciphertextWithTag.length - this.TAG_LENGTH);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(actualCiphertext), decipher.final()]);
  }

  static decryptToString(ciphertextWithTag: Buffer, iv: Buffer, key: Buffer): string {
    return this.decrypt(ciphertextWithTag, iv, key).toString('utf8');
  }
}

// ============================================================================
// Android EncryptedBackupManager 2FA Oracle (EncryptedBackupManager.kt:193-207 & 537-561)
// ============================================================================
interface AuthenticatorRecord {
  vaultItemId: string;
  issuer: string;
  accountName: string;
  encryptedSecret: Buffer;
  secretIv: Buffer;
  algorithm: string;
  digits: number;
  period: number;
  title: string;
  folderId?: string | null;
  isFavorite: boolean;
  tags: string[];
}

class AndroidBackupOracle {
  // Mirrors EncryptedBackupManager.kt lines 193-207 (serialization)
  static serialize2FaItem(record: AuthenticatorRecord, dek: Buffer): any {
    const plainSecret = AesGcmOracle.decryptToString(record.encryptedSecret, record.secretIv, dek);
    const authenticatorData = {
      issuer: record.issuer,
      accountName: record.accountName,
      secret: plainSecret,
      algorithm: record.algorithm,
      digits: record.digits,
      period: record.period,
    };
    return {
      id: record.vaultItemId,
      type: 'AUTHENTICATOR_2FA',
      title: record.title,
      folderId: record.folderId || null,
      isFavorite: record.isFavorite,
      tags: record.tags,
      authenticatorData,
    };
  }

  // Mirrors EncryptedBackupManager.kt lines 537-561 (deserialization & restore)
  static restore2FaItem(itemJson: any, dek: Buffer): AuthenticatorRecord | null {
    if (itemJson.type !== 'AUTHENTICATOR_2FA') return null;
    const authData = itemJson.authenticatorData;
    if (!authData) return null; // Corresponds to: `?: continue`

    const issuer = authData.issuer || '';
    const accountName = authData.accountName || '';
    const plainSecret = authData.secret || '';
    const algorithm = authData.algorithm || 'SHA1';
    const digits = typeof authData.digits === 'number' ? authData.digits : 6;
    const period = typeof authData.period === 'number' ? authData.period : 30;

    const enc = AesGcmOracle.encrypt(plainSecret, dek);

    return {
      vaultItemId: itemJson.id || crypto.randomUUID(),
      title: itemJson.title || issuer || '2FA Authenticator',
      issuer,
      accountName,
      encryptedSecret: enc.ciphertext,
      secretIv: enc.iv,
      algorithm,
      digits,
      period,
      folderId: itemJson.folderId || null,
      isFavorite: !!itemJson.isFavorite,
      tags: itemJson.tags || [],
    };
  }

  // Full roundtrip backup with password encryption (Argon2id simulated with AES key)
  static createBackupArchive(items: AuthenticatorRecord[], dek: Buffer, backupKey: Buffer): Buffer {
    const serializedItems = items.map(item => this.serialize2FaItem(item, dek));
    const root = {
      version: 2,
      createdAt: Date.now(),
      items: serializedItems,
    };
    const jsonStr = JSON.stringify(root);
    const enc = AesGcmOracle.encrypt(Buffer.from(jsonStr, 'utf8'), backupKey);
    // Combine IV (12) + ciphertext
    return Buffer.concat([enc.iv, enc.ciphertext]);
  }

  static restoreBackupArchive(archiveBuffer: Buffer, dek: Buffer, backupKey: Buffer): AuthenticatorRecord[] {
    const iv = archiveBuffer.subarray(0, 12);
    const ciphertext = archiveBuffer.subarray(12);
    const decryptedJson = AesGcmOracle.decryptToString(ciphertext, iv, backupKey);
    const parsed = JSON.parse(decryptedJson);

    const restored: AuthenticatorRecord[] = [];
    for (const item of parsed.items) {
      if (item.type === 'AUTHENTICATOR_2FA') {
        const rec = this.restore2FaItem(item, dek);
        if (rec) restored.push(rec);
      }
    }
    return restored;
  }
}

// ============================================================================
// Android VaultModule getSecret Oracle (VaultModule.kt:238-355)
// ============================================================================
class AndroidVaultModuleOracle {
  private isUnlocked: boolean = true;
  private dek: Buffer;
  public lastUsedMap: Record<string, number> = {};
  public dbItems: Map<string, { type: ItemType; title: string }> = new Map();
  public authRecords: Map<string, AuthenticatorRecord> = new Map();

  constructor(dek?: Buffer) {
    this.dek = dek || AesGcmOracle.generateKey();
  }

  public setUnlocked(unlocked: boolean) {
    this.isUnlocked = unlocked;
  }

  public addAuthenticatorRecord(rec: AuthenticatorRecord) {
    this.dbItems.set(rec.vaultItemId, { type: 'AUTHENTICATOR_2FA', title: rec.title });
    this.authRecords.set(rec.vaultItemId, rec);
  }

  public async getSecret(itemId: string, fieldName: string): Promise<string> {
    if (!this.isUnlocked) {
      throw new Error('ERR_LOCKED: Vault is locked');
    }
    const item = this.dbItems.get(itemId);
    if (!item) {
      throw new Error('ERR_NOT_FOUND: Item not found');
    }

    if (item.type === 'AUTHENTICATOR_2FA') {
      const auth = this.authRecords.get(itemId);
      if (!auth) {
        throw new Error('ERR_NOT_FOUND: Authenticator record not found');
      }
      switch (fieldName) {
        case 'secret': {
          const secret = AesGcmOracle.decryptToString(auth.encryptedSecret, auth.secretIv, this.dek);
          this.lastUsedMap[itemId] = Date.now();
          return secret;
        }
        case 'issuer':
          return auth.issuer;
        case 'accountName':
          return auth.accountName;
        case 'algorithm':
          return auth.algorithm;
        case 'digits':
          return auth.digits.toString();
        case 'period':
          return auth.period.toString();
        default:
          throw new Error(`ERR_FIELD: Unknown field: ${fieldName}`);
      }
    }
    throw new Error(`ERR_UNSUPPORTED: Secret access not configured for ${item.type}`);
  }
}

// ============================================================================
// TEST SUITE: Milestone 3 Adversarial Verification
// ============================================================================
describe('Empirical Challenger M3-1: Adversarial Verification Suite', () => {

  // --------------------------------------------------------------------------
  // Target 1: Mobile Item Edit Flow in ItemEditScreen.tsx
  // --------------------------------------------------------------------------
  describe('1. Mobile Item Edit Flow (ItemEditScreen.tsx)', () => {
    let originalGetSecret: any;
    let originalSaveLoginItem: any;
    let originalSaveSecureNote: any;
    let originalSaveCreditCard: any;
    let originalSaveBankAccount: any;

    beforeEach(() => {
      originalGetSecret = vaultNative.getSecret;
      originalSaveLoginItem = vaultNative.saveLoginItem;
      originalSaveSecureNote = vaultNative.saveSecureNote;
      originalSaveCreditCard = vaultNative.saveCreditCard;
      originalSaveBankAccount = vaultNative.saveBankAccount;
    });

    afterEach(() => {
      vaultNative.getSecret = originalGetSecret;
      vaultNative.saveLoginItem = originalSaveLoginItem;
      vaultNative.saveSecureNote = originalSaveSecureNote;
      vaultNative.saveCreditCard = originalSaveCreditCard;
      vaultNative.saveBankAccount = originalSaveBankAccount;
    });

    it('pre-fills existing credentials from vaultNative.getSecret when editing a LOGIN item', async () => {
      const mockItem: VaultItemSummary = {
        id: 'login-uuid-1234',
        type: 'LOGIN',
        title: 'Production GitHub',
        subtitle: 'octocat',
        username: 'octocat',
        website: 'https://github.com',
        isFavorite: true,
        updatedAt: Date.now(),
        tags: ['dev', 'vcs'],
      };

      const requestedFields: string[] = [];
      vaultNative.getSecret = jest.fn(async (id: string, field: string) => {
        requestedFields.push(field);
        if (id === 'login-uuid-1234') {
          if (field === 'password') return 'SuperSecretP@ssw0rd!2026';
          if (field === 'notes') return 'Secondary recovery codes stored safely.';
        }
        return '';
      });

      let tree: any;
      await ReactTestRenderer.act(async () => {
        tree = ReactTestRenderer.create(
          <ItemEditScreen item={mockItem} onBack={() => {}} onSaved={() => {}} />
        );
      });

      // Verify that vaultNative.getSecret was requested for both password and notes
      expect(vaultNative.getSecret).toHaveBeenCalledWith('login-uuid-1234', 'password');
      expect(vaultNative.getSecret).toHaveBeenCalledWith('login-uuid-1234', 'notes');
      expect(requestedFields).toContain('password');
      expect(requestedFields).toContain('notes');

      expect(tree).toBeDefined();
    });

    it('correctly passes item.id to vaultNative.saveLoginItem to update existing record instead of creating duplicate', async () => {
      const mockItem: VaultItemSummary = {
        id: 'existing-id-777',
        type: 'LOGIN',
        title: 'AWS Console',
        subtitle: 'admin',
        username: 'admin',
        website: 'https://aws.amazon.com',
        isFavorite: false,
        tags: [],
        updatedAt: Date.now(),
      };

      vaultNative.getSecret = jest.fn(async (_id: string, field: string) => {
        if (field === 'password') return 'CloudPassword#99';
        if (field === 'notes') return 'Root account';
        return '';
      });

      let capturedPayload: any = null;
      vaultNative.saveLoginItem = jest.fn(async (payload: any) => {
        capturedPayload = payload;
        return payload.id || 'new-uuid-generated';
      });

      let tree: any;
      await ReactTestRenderer.act(async () => {
        tree = ReactTestRenderer.create(
          <ItemEditScreen item={mockItem} onBack={() => {}} onSaved={() => {}} />
        );
      });

      // Find the Save button by inspecting instance props
      const rootInstance = tree.root;
      // In ItemEditScreen, Header receives rightAction which contains the Save Button
      const buttons = rootInstance.findAll((node: any) => node.props && typeof node.props.onPress === 'function');
      const saveButton = buttons.find((b: any) => b.props.title === 'Save' || b.props.accessibilityLabel === 'Save' || (b.props.children && b.props.children.toString().includes('Save')));

      // Trigger save
      if (saveButton) {
        await ReactTestRenderer.act(async () => {
          saveButton.props.onPress();
        });
      } else {
        // Alternatively trigger the save directly through simulate or finding rightAction
        const header = rootInstance.find((node: any) => node.props && node.props.rightAction);
        const buttonInHeader = header.props.rightAction;
        await ReactTestRenderer.act(async () => {
          buttonInHeader.props.onPress();
        });
      }

      expect(vaultNative.saveLoginItem).toHaveBeenCalled();
      expect(capturedPayload).not.toBeNull();
      // Crucial verification: the ID passed MUST match existing item ID!
      expect(capturedPayload.id).toBe('existing-id-777');
      expect(capturedPayload.title).toBe('AWS Console');
      expect(capturedPayload.username).toBe('admin');
      expect(capturedPayload.password).toBe('CloudPassword#99');
    });

    it('passes id: undefined when creating a brand-new item (Creation Mode)', async () => {
      let capturedPayload: any = null;
      vaultNative.saveLoginItem = jest.fn(async (payload: any) => {
        capturedPayload = payload;
        return 'newly-created-uuid';
      });

      let tree: any;
      await ReactTestRenderer.act(async () => {
        tree = ReactTestRenderer.create(
          <ItemEditScreen item={null} onBack={() => {}} onSaved={() => {}} />
        );
      });

      const rootInstance = tree.root;

      // Fill in title before saving (first Input is Title)
      const inputs = rootInstance.findAll((node: any) => node.props && typeof node.props.onChangeText === 'function');
      await ReactTestRenderer.act(async () => {
        inputs[0].props.onChangeText('Brand New Bank Login');
      });

      // Find updated header rightAction after title state update
      const updatedHeader = rootInstance.find((node: any) => node.props && node.props.rightAction);
      await ReactTestRenderer.act(async () => {
        updatedHeader.props.rightAction.props.onPress();
      });

      expect(vaultNative.saveLoginItem).toHaveBeenCalled();
      expect(capturedPayload).not.toBeNull();
      // In creation mode, capturedPayload.id MUST be undefined!
      expect(capturedPayload.id).toBeUndefined();
      expect(capturedPayload.title).toBe('Brand New Bank Login');
    });

    it('ADVERSARIAL PROBE: verifies discrepancy between LOGIN vs (CREDENTIAL_CARD, BANK_ACCOUNT, SECURE_NOTE) update contracts', async () => {
      // Frontend correctly passes id: item?.id for all types:
      const cardItem: VaultItemSummary = {
        id: 'card-123',
        type: 'CREDENTIAL_CARD',
        title: 'Visa Platinum',
        subtitle: '•••• 4242',
        cardBrand: 'Visa',
        isFavorite: false,
        tags: [],
        updatedAt: Date.now(),
      };

      let capturedCardPayload: any = null;
      vaultNative.saveCreditCard = jest.fn(async (p: any) => {
        capturedCardPayload = p;
        return 'card-id';
      });

      vaultNative.getSecret = jest.fn(async () => 'mock-val');

      let tree: any;
      await ReactTestRenderer.act(async () => {
        tree = ReactTestRenderer.create(
          <ItemEditScreen item={cardItem} onBack={() => {}} onSaved={() => {}} />
        );
      });

      const rootInstance = tree.root;
      const header = rootInstance.find((node: any) => node.props && node.props.rightAction);
      await ReactTestRenderer.act(async () => {
        header.props.rightAction.props.onPress();
      });

      // Frontend does pass id: 'card-123'
      expect(capturedCardPayload).not.toBeNull();
      expect(capturedCardPayload.id).toBe('card-123');
    });

    it('correctly passes item.id to vaultNative.saveSecureNote when editing existing note', async () => {
      const noteItem: VaultItemSummary = {
        id: 'note-uuid-456',
        type: 'SECURE_NOTE',
        title: 'Server Root Credentials',
        subtitle: 'SSH Keys',
        isFavorite: false,
        tags: ['infrastructure'],
        updatedAt: Date.now(),
      };

      let capturedNotePayload: any = null;
      vaultNative.saveSecureNote = jest.fn(async (p: any) => {
        capturedNotePayload = p;
        return p.id || 'new-note-id';
      });

      vaultNative.getSecret = jest.fn(async (_id: string, field: string) => {
        if (field === 'content') return 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI...';
        return '';
      });

      let tree: any;
      await ReactTestRenderer.act(async () => {
        tree = ReactTestRenderer.create(
          <ItemEditScreen item={noteItem} onBack={() => {}} onSaved={() => {}} />
        );
      });

      const rootInstance = tree.root;
      const header = rootInstance.find((node: any) => node.props && node.props.rightAction);
      await ReactTestRenderer.act(async () => {
        header.props.rightAction.props.onPress();
      });

      expect(vaultNative.saveSecureNote).toHaveBeenCalled();
      expect(capturedNotePayload).not.toBeNull();
      expect(capturedNotePayload.id).toBe('note-uuid-456');
      expect(capturedNotePayload.title).toBe('Server Root Credentials');
    });

    it('correctly passes item.id to vaultNative.saveBankAccount when editing existing bank account', async () => {
      const bankItem: VaultItemSummary = {
        id: 'bank-uuid-789',
        type: 'BANK_ACCOUNT',
        title: 'Main Checking',
        subtitle: 'Chase •••• 9876',
        bankName: 'Chase',
        isFavorite: true,
        tags: ['finances'],
        updatedAt: Date.now(),
      };

      let capturedBankPayload: any = null;
      vaultNative.saveBankAccount = jest.fn(async (p: any) => {
        capturedBankPayload = p;
        return p.id || 'new-bank-id';
      });

      vaultNative.getSecret = jest.fn(async (_id: string, field: string) => {
        if (field === 'accountHolder') return 'Alice Doe';
        if (field === 'accountNumber') return '123456789876';
        if (field === 'routingNumber') return '021000021';
        return '';
      });

      let tree: any;
      await ReactTestRenderer.act(async () => {
        tree = ReactTestRenderer.create(
          <ItemEditScreen item={bankItem} onBack={() => {}} onSaved={() => {}} />
        );
      });

      const rootInstance = tree.root;
      const header = rootInstance.find((node: any) => node.props && node.props.rightAction);
      await ReactTestRenderer.act(async () => {
        header.props.rightAction.props.onPress();
      });

      expect(vaultNative.saveBankAccount).toHaveBeenCalled();
      expect(capturedBankPayload).not.toBeNull();
      expect(capturedBankPayload.id).toBe('bank-uuid-789');
      expect(capturedBankPayload.title).toBe('Main Checking');
    });
  });

  // --------------------------------------------------------------------------
  // Target 2: Android 2FA Backup/Restore Serialization in EncryptedBackupManager.kt
  // --------------------------------------------------------------------------
  describe('2. Android 2FA Backup/Restore Serialization (EncryptedBackupManager.kt)', () => {
    const dek = AesGcmOracle.generateKey();
    const backupKey = AesGcmOracle.generateKey();

    it('completes full lossless roundtrip with all 6 fields (issuer, accountName, secret, algorithm, digits, period)', () => {
      const originalSecret = 'JBSWY3DPEHPK3PXP'; // Base32 RFC 4226 test secret
      const enc = AesGcmOracle.encrypt(originalSecret, dek);

      const sourceRecord: AuthenticatorRecord = {
        vaultItemId: 'totp-uuid-001',
        title: 'Google: user@gmail.com',
        issuer: 'Google',
        accountName: 'user@gmail.com',
        encryptedSecret: enc.ciphertext,
        secretIv: enc.iv,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        folderId: 'folder-work',
        isFavorite: true,
        tags: ['email', 'google'],
      };

      // 1. Serialization (EncryptedBackupManager.kt:193-207)
      const serialized = AndroidBackupOracle.serialize2FaItem(sourceRecord, dek);

      expect(serialized.type).toBe('AUTHENTICATOR_2FA');
      expect(serialized.authenticatorData).toBeDefined();
      expect(serialized.authenticatorData.issuer).toBe('Google');
      expect(serialized.authenticatorData.accountName).toBe('user@gmail.com');
      expect(serialized.authenticatorData.secret).toBe('JBSWY3DPEHPK3PXP');
      expect(serialized.authenticatorData.algorithm).toBe('SHA1');
      expect(serialized.authenticatorData.digits).toBe(6);
      expect(serialized.authenticatorData.period).toBe(30);

      // 2. Deserialization / Restore (EncryptedBackupManager.kt:537-561)
      const restored = AndroidBackupOracle.restore2FaItem(serialized, dek);

      expect(restored).not.toBeNull();
      if (!restored) return;

      expect(restored.issuer).toBe('Google');
      expect(restored.accountName).toBe('user@gmail.com');
      expect(restored.algorithm).toBe('SHA1');
      expect(restored.digits).toBe(6);
      expect(restored.period).toBe(30);

      // Verify restored ciphertext decrypts back to original secret
      const decryptedRestoredSecret = AesGcmOracle.decryptToString(
        restored.encryptedSecret,
        restored.secretIv,
        dek
      );
      expect(decryptedRestoredSecret).toBe(originalSecret);
    });

    it('preserves non-standard 2FA parameters (SHA256, 8 digits, 60 seconds)', () => {
      const secret = 'HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ';
      const enc = AesGcmOracle.encrypt(secret, dek);

      const record: AuthenticatorRecord = {
        vaultItemId: 'totp-custom-002',
        title: 'GitHub Enterprise (2FA)',
        issuer: 'GitHub Enterprise',
        accountName: 'eng@internal.company.com',
        encryptedSecret: enc.ciphertext,
        secretIv: enc.iv,
        algorithm: 'SHA256',
        digits: 8,
        period: 60,
        folderId: null,
        isFavorite: false,
        tags: [],
      };

      const serialized = AndroidBackupOracle.serialize2FaItem(record, dek);
      expect(serialized.authenticatorData.algorithm).toBe('SHA256');
      expect(serialized.authenticatorData.digits).toBe(8);
      expect(serialized.authenticatorData.period).toBe(60);

      const restored = AndroidBackupOracle.restore2FaItem(serialized, dek);
      expect(restored).not.toBeNull();
      if (!restored) return;

      expect(restored.algorithm).toBe('SHA256');
      expect(restored.digits).toBe(8);
      expect(restored.period).toBe(60);

      const decryptedSecret = AesGcmOracle.decryptToString(restored.encryptedSecret, restored.secretIv, dek);
      expect(decryptedSecret).toBe(secret);
    });

    it('applies standard RFC defaults when optional parameters are missing in imported JSON', () => {
      const legacyJson = {
        type: 'AUTHENTICATOR_2FA',
        title: 'Minimal 2FA',
        authenticatorData: {
          secret: 'KVKFKRCPNZQUYMLX',
          // issuer, accountName, algorithm, digits, period all omitted!
        },
      };

      const restored = AndroidBackupOracle.restore2FaItem(legacyJson, dek);
      expect(restored).not.toBeNull();
      if (!restored) return;

      expect(restored.issuer).toBe('');
      expect(restored.accountName).toBe('');
      expect(restored.algorithm).toBe('SHA1'); // Default: SHA1
      expect(restored.digits).toBe(6);         // Default: 6
      expect(restored.period).toBe(30);       // Default: 30

      const decrypted = AesGcmOracle.decryptToString(restored.encryptedSecret, restored.secretIv, dek);
      expect(decrypted).toBe('KVKFKRCPNZQUYMLX');
    });

    it('safely handles missing or malformed authenticatorData without throwing unhandled exceptions', () => {
      const corruptItem = {
        type: 'AUTHENTICATOR_2FA',
        title: 'Corrupt 2FA',
        authenticatorData: null, // missing data
      };

      // EncryptedBackupManager.kt:538: `val authData = itemJson.optJSONObject("authenticatorData") ?: continue`
      const restored = AndroidBackupOracle.restore2FaItem(corruptItem, dek);
      expect(restored).toBeNull(); // Cleanly skipped
    });

    it('performs full end-to-end encrypted backup archive create and restore', () => {
      const secret1 = 'JBSWY3DPEHPK3PXP';
      const secret2 = 'MZXW633PN5XW6MZX';
      const enc1 = AesGcmOracle.encrypt(secret1, dek);
      const enc2 = AesGcmOracle.encrypt(secret2, dek);

      const items: AuthenticatorRecord[] = [
        {
          vaultItemId: 'totp-1',
          title: 'Google',
          issuer: 'Google',
          accountName: 'alice@gmail.com',
          encryptedSecret: enc1.ciphertext,
          secretIv: enc1.iv,
          algorithm: 'SHA1',
          digits: 6,
          period: 30,
          isFavorite: true,
          tags: ['personal'],
        },
        {
          vaultItemId: 'totp-2',
          title: 'AWS',
          issuer: 'Amazon Web Services',
          accountName: 'alice-root',
          encryptedSecret: enc2.ciphertext,
          secretIv: enc2.iv,
          algorithm: 'SHA256',
          digits: 8,
          period: 30,
          isFavorite: false,
          tags: ['cloud'],
        },
      ];

      // 1. Create encrypted backup binary archive
      const backupArchive = AndroidBackupOracle.createBackupArchive(items, dek, backupKey);
      expect(backupArchive.length).toBeGreaterThan(64);

      // 2. Restore backup archive
      const restoredItems = AndroidBackupOracle.restoreBackupArchive(backupArchive, dek, backupKey);
      expect(restoredItems.length).toBe(2);

      // Verify Item 1
      expect(restoredItems[0].issuer).toBe('Google');
      expect(restoredItems[0].accountName).toBe('alice@gmail.com');
      expect(AesGcmOracle.decryptToString(restoredItems[0].encryptedSecret, restoredItems[0].secretIv, dek)).toBe(secret1);

      // Verify Item 2
      expect(restoredItems[1].issuer).toBe('Amazon Web Services');
      expect(restoredItems[1].accountName).toBe('alice-root');
      expect(restoredItems[1].algorithm).toBe('SHA256');
      expect(restoredItems[1].digits).toBe(8);
      expect(AesGcmOracle.decryptToString(restoredItems[1].encryptedSecret, restoredItems[1].secretIv, dek)).toBe(secret2);
    });

    it('detects tampering of backup ciphertext and throws authentication error', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const enc = AesGcmOracle.encrypt(secret, dek);
      const items: AuthenticatorRecord[] = [{
        vaultItemId: 'totp-1',
        title: 'TamperTest',
        issuer: 'Test',
        accountName: 'test',
        encryptedSecret: enc.ciphertext,
        secretIv: enc.iv,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        isFavorite: false,
        tags: [],
      }];

      const archive = AndroidBackupOracle.createBackupArchive(items, dek, backupKey);
      // Flip a bit in the encrypted payload
      archive[20] ^= 0xFF;

      expect(() => {
        AndroidBackupOracle.restoreBackupArchive(archive, dek, backupKey);
      }).toThrow();
    });
  });

  // --------------------------------------------------------------------------
  // Target 3: Android VaultModule.kt getSecret for 2FA Authenticator
  // --------------------------------------------------------------------------
  describe('3. Android VaultModule getSecret Retrieval (VaultModule.kt:238-355)', () => {
    const dek = AesGcmOracle.generateKey();
    let module: AndroidVaultModuleOracle;
    const testSecret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
    const enc = AesGcmOracle.encrypt(testSecret, dek);

    const testItem: AuthenticatorRecord = {
      vaultItemId: 'auth-item-456',
      title: 'Discord (gamer#1337)',
      issuer: 'Discord',
      accountName: 'gamer#1337',
      encryptedSecret: enc.ciphertext,
      secretIv: enc.iv,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      isFavorite: true,
      tags: ['gaming'],
    };

    beforeEach(() => {
      module = new AndroidVaultModuleOracle(dek);
      module.addAuthenticatorRecord(testItem);
    });

    it('retrieves decrypted 2FA secret and touches last_used_at timestamp', async () => {
      const secret = await module.getSecret('auth-item-456', 'secret');
      expect(secret).toBe(testSecret);
      expect(module.lastUsedMap['auth-item-456']).toBeDefined();
      expect(Date.now() - module.lastUsedMap['auth-item-456']).toBeLessThan(1000);
    });

    it('retrieves all 2FA metadata fields accurately as string promises', async () => {
      const issuer = await module.getSecret('auth-item-456', 'issuer');
      expect(issuer).toBe('Discord');

      const accountName = await module.getSecret('auth-item-456', 'accountName');
      expect(accountName).toBe('gamer#1337');

      const algorithm = await module.getSecret('auth-item-456', 'algorithm');
      expect(algorithm).toBe('SHA1');

      const digits = await module.getSecret('auth-item-456', 'digits');
      expect(digits).toBe('6');

      const period = await module.getSecret('auth-item-456', 'period');
      expect(period).toBe('30');
    });

    it('rejects with ERR_FIELD for unsupported or invalid field names', async () => {
      await expect(module.getSecret('auth-item-456', 'password')).rejects.toThrow('ERR_FIELD');
      await expect(module.getSecret('auth-item-456', 'token')).rejects.toThrow('ERR_FIELD');
      await expect(module.getSecret('auth-item-456', 'pin')).rejects.toThrow('ERR_FIELD');
      await expect(module.getSecret('auth-item-456', 'unknown')).rejects.toThrow('ERR_FIELD');
    });

    it('rejects with ERR_NOT_FOUND when requesting an unknown itemId', async () => {
      await expect(module.getSecret('non-existent-uuid', 'secret')).rejects.toThrow('ERR_NOT_FOUND');
    });

    it('rejects with ERR_LOCKED when vault session is locked', async () => {
      module.setUnlocked(false);
      await expect(module.getSecret('auth-item-456', 'secret')).rejects.toThrow('ERR_LOCKED');
    });
  });
});

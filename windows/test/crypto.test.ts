import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { VaultCrypto } from '../electron/crypto.ts';

describe('Windows Desktop VaultCrypto Engine', () => {
  it('generates cryptographically secure 32-byte salts', () => {
    const salt1 = VaultCrypto.generateSalt();
    const salt2 = VaultCrypto.generateSalt();

    assert.ok(Buffer.isBuffer(salt1));
    assert.equal(salt1.length, 32);
    assert.equal(salt2.length, 32);
    assert.equal(salt1.equals(salt2), false);
  });

  it('derives deterministic keys using PBKDF2-HMAC-SHA256', () => {
    const password = 'CorrectHorseBatteryStaple2026!';
    const salt = Buffer.from('fixed-32-byte-salt-value-abcdef0', 'utf8');

    const key1 = VaultCrypto.deriveKey(password, salt, 5000);
    const key2 = VaultCrypto.deriveKey(password, salt, 5000);

    assert.equal(key1.length, 32);
    assert.ok(key1.equals(key2));

    const keyDifferentPassword = VaultCrypto.deriveKey('DifferentPassword', salt, 5000);
    assert.equal(key1.equals(keyDifferentPassword), false);

    const keyDifferentSalt = VaultCrypto.deriveKey(password, Buffer.from('different-salt-value-123456789012', 'utf8'), 5000);
    assert.equal(key1.equals(keyDifferentSalt), false);
  });

  it('encrypts and decrypts string payloads with AES-256-GCM', () => {
    const key = crypto.randomBytes(32);
    const payload = 'VaultKey Enterprise Credentials 🛡️ — User: admin@vault.local | Password: $uper$ecret!';

    const encrypted = VaultCrypto.encrypt(payload, key);

    assert.ok(encrypted.ciphertext);
    assert.ok(encrypted.iv);
    assert.ok(encrypted.tag);

    // Verify IV length is 12 bytes
    assert.equal(Buffer.from(encrypted.iv, 'base64').length, 12);
    // Verify auth tag length is 16 bytes
    assert.equal(Buffer.from(encrypted.tag, 'base64').length, 16);

    const decrypted = VaultCrypto.decrypt(encrypted, key);
    assert.equal(decrypted, payload);
  });

  it('fails decryption when ciphertext is tampered', () => {
    const key = crypto.randomBytes(32);
    const payload = 'Sensitive financial transaction';
    const encrypted = VaultCrypto.encrypt(payload, key);

    const rawCiphertext = Buffer.from(encrypted.ciphertext, 'base64');
    rawCiphertext[0] = rawCiphertext[0] ^ 0x01; // flip one bit
    const tampered = {
      ...encrypted,
      ciphertext: rawCiphertext.toString('base64'),
    };

    assert.throws(() => VaultCrypto.decrypt(tampered, key));
  });

  it('fails decryption when authentication tag is tampered', () => {
    const key = crypto.randomBytes(32);
    const encrypted = VaultCrypto.encrypt('Integrity test', key);

    const rawTag = Buffer.from(encrypted.tag, 'base64');
    rawTag[0] = rawTag[0] ^ 0xff; // flip bits in tag
    const tampered = {
      ...encrypted,
      tag: rawTag.toString('base64'),
    };

    assert.throws(() => VaultCrypto.decrypt(tampered, key));
  });

  it('fails decryption when wrong key is provided', () => {
    const keyA = crypto.randomBytes(32);
    const keyB = crypto.randomBytes(32);
    const encrypted = VaultCrypto.encrypt('Secret under key A', keyA);

    assert.throws(() => VaultCrypto.decrypt(encrypted, keyB));
  });

  it('supports raw buffer encryption and decryption', () => {
    const key = crypto.randomBytes(32);
    const originalBuffer = Buffer.from([0x00, 0xff, 0x42, 0x13, 0x37, 0xde, 0xad, 0xbe, 0xef]);

    const { ciphertext, iv, tag } = VaultCrypto.encryptRaw(originalBuffer, key);
    assert.equal(iv.length, 12);
    assert.equal(tag.length, 16);

    const decryptedBuffer = VaultCrypto.decryptRaw(ciphertext, iv, tag, key);
    assert.ok(decryptedBuffer.equals(originalBuffer));
  });

  it('securely wipes sensitive buffers in memory with zeros', () => {
    const sensitive = Buffer.from('temporary-plaintext-passphrase');
    assert.ok(sensitive.some(b => b !== 0));

    VaultCrypto.wipe(sensitive);

    assert.ok(sensitive.every(b => b === 0));
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeKeyChecksum,
  generateFormattedRecoveryKey,
  generateEmergencyKitContent,
} from '../src/utils/recoveryKit.ts';

describe('Windows Desktop RecoveryKit Utility', () => {
  it('computes deterministic 4-character uppercase checksums', () => {
    const rawKey = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const checksum1 = computeKeyChecksum(rawKey);
    const checksum2 = computeKeyChecksum(rawKey);

    assert.equal(checksum1.length, 4);
    assert.equal(checksum1, checksum1.toUpperCase());
    assert.equal(checksum1, checksum2);
  });

  it('normalizes lowercase characters and punctuation in checksum computation', () => {
    const rawKey = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const formattedWithHyphens = 'ABCD-EFGH-JKLM-NPQR-STUV-WXYZ-2345-6789';
    const lowercaseWithSpaces = 'abcd efgh jklm npqr stuv wxyz 2345 6789';

    const sum1 = computeKeyChecksum(rawKey);
    const sum2 = computeKeyChecksum(formattedWithHyphens);
    const sum3 = computeKeyChecksum(lowercaseWithSpaces);

    assert.equal(sum1, sum2);
    assert.equal(sum1, sum3);
  });

  it('detects single-character alterations in recovery key', () => {
    const keyA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const keyB = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456788'; // mutated last char

    assert.notEqual(computeKeyChecksum(keyA), computeKeyChecksum(keyB));
  });

  it('generates formatted recovery key with unambiguous character set and correct formatting', () => {
    const keyData = generateFormattedRecoveryKey();

    assert.equal(keyData.rawKey.length, 32);
    // Unambiguous base32 excludes 0, O, 1, I
    assert.match(keyData.rawKey, /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{32}$/);

    // Formatted key has 8 chunks of 4 characters joined by 7 hyphens = 39 characters
    assert.equal(keyData.formattedKey.length, 39);
    const chunks = keyData.formattedKey.split('-');
    assert.equal(chunks.length, 8);
    for (const chunk of chunks) {
      assert.equal(chunk.length, 4);
    }

    // Checksum matches computeKeyChecksum
    assert.equal(keyData.checksum, computeKeyChecksum(keyData.rawKey));
  });

  it('formats existing key input properly', () => {
    const inputKey = '3K9N7P2M4W8X5Y6Z1A2B3C4D5E6F7G8H';
    const keyData = generateFormattedRecoveryKey(inputKey);

    assert.equal(keyData.rawKey, inputKey.substring(0, 32).toUpperCase());
    assert.equal(
      keyData.formattedKey,
      `${keyData.rawKey.slice(0, 4)}-${keyData.rawKey.slice(4, 8)}-${keyData.rawKey.slice(8, 12)}-${keyData.rawKey.slice(12, 16)}-${keyData.rawKey.slice(16, 20)}-${keyData.rawKey.slice(20, 24)}-${keyData.rawKey.slice(24, 28)}-${keyData.rawKey.slice(28, 32)}`
    );
  });

  it('generates complete emergency recovery kit document', () => {
    const content = generateEmergencyKitContent({
      vaultName: 'Engineering Secure Vault',
      userEmail: 'alice@corp.security',
      createdAt: 1730000000000,
      hints: 'Name of the first server racked in datacenter',
    });

    assert.ok(content.includes('VAULTKEY ZERO-KNOWLEDGE EMERGENCY KIT'));
    assert.ok(content.includes('Engineering Secure Vault'));
    assert.ok(content.includes('alice@corp.security'));
    assert.ok(content.includes('Name of the first server racked in datacenter'));
    assert.ok(content.includes('SQLCipher 4.6 + Argon2id (m=64MB, t=3, p=4) + AES-256-GCM'));
    assert.ok(content.includes('[EMERGENCY RECOVERY KEY]'));
    assert.ok(content.includes('[EMERGENCY RECOVERY INSTRUCTIONS]'));
    assert.ok(content.includes('1. Download or launch the official VaultKey app'));
  });
});

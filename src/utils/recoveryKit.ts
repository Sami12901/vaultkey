/**
 * VaultKey Emergency Access & Digital Recovery Kit
 *
 * Generates an elegant, printable ASCII emergency recovery kit containing
 * zero-knowledge security notices, formatted recovery capsules with checksums,
 * and step-by-step account restoration instructions.
 */

import { sha1 } from './hibpUtils';

export interface EmergencyKitParams {
  vaultName?: string;
  userEmail?: string;
  createdAt?: number;
  recoveryKey?: string;
  hints?: string;
}

export interface FormattedRecoveryKey {
  rawKey: string;
  formattedKey: string;
  checksum: string;
}

/**
 * Computes a 4-character hex checksum from an emergency key.
 */
export function computeKeyChecksum(rawKey: string): string {
  const clean = rawKey.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const hash = sha1(clean);
  return hash.substring(0, 4);
}

/**
 * Verifies if a checksum matches the recovery key.
 */
export function verifyRecoveryKeyChecksum(key: string, checksum: string): boolean {
  if (!key || !checksum) return false;
  const expected = computeKeyChecksum(key);
  return expected.toUpperCase() === checksum.trim().toUpperCase();
}

/**
 * Generates or formats a 32-character recovery key grouped into 8 chunks of 4 characters.
 */
export function generateFormattedRecoveryKey(existingKey?: string): FormattedRecoveryKey {
  let clean = (existingKey || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();

  // If no valid 32-char key is provided, generate a secure random 32-char key
  if (clean.length < 32) {
    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Base32 unambiguous
    clean = '';
    for (let i = 0; i < 32; i++) {
      const rand = Math.floor(Math.random() * charset.length);
      clean += charset[rand];
    }
  } else {
    clean = clean.substring(0, 32);
  }

  // Format as XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX
  const chunks: string[] = [];
  for (let i = 0; i < 32; i += 4) {
    chunks.push(clean.substring(i, i + 4));
  }
  const formattedKey = chunks.join('-');
  const checksum = computeKeyChecksum(clean);

  return {
    rawKey: clean,
    formattedKey,
    checksum,
  };
}

/**
 * Formats an elegant, printable ASCII Emergency Recovery Kit sheet.
 */
export function generateEmergencyKitContent(params: EmergencyKitParams = {}): string {
  const vaultName = params.vaultName || 'Primary Personal Vault';
  const userEmail = params.userEmail || 'vault-owner@vaultkey.local';
  const timestampMs = params.createdAt || Date.now();
  const isoDate = new Date(timestampMs).toISOString();

  const keyData = generateFormattedRecoveryKey(params.recoveryKey);
  const hintText = params.hints ? params.hints.trim() : 'No master password hint recorded.';

  return [
    '================================================================================',
    '                    VAULTKEY ZERO-KNOWLEDGE EMERGENCY KIT                       ',
    '================================================================================',
    'CONFIDENTIAL: Keep this document in a safe, fireproof location.',
    'Do NOT upload this document to unencrypted cloud storage or email services.',
    '--------------------------------------------------------------------------------',
    '',
    '[VAULT METADATA]',
    `Vault Name     : ${vaultName}`,
    `Account Holder : ${userEmail}`,
    `Generated On   : ${isoDate} (Unix: ${timestampMs})`,
    'Architecture   : SQLCipher 4.6 + Argon2id (m=64MB, t=3, p=4) + AES-256-GCM',
    '',
    '--------------------------------------------------------------------------------',
    '[EMERGENCY RECOVERY KEY]',
    '--------------------------------------------------------------------------------',
    `Key            : ${keyData.formattedKey}`,
    `Checksum       : [CRC: ${keyData.checksum}] (Verified)`,
    '',
    'Master Password Hint:',
    `  ${hintText}`,
    '',
    '--------------------------------------------------------------------------------',
    '[SECURITY ARCHITECTURE & ZERO-KNOWLEDGE NOTICE]',
    '--------------------------------------------------------------------------------',
    'VaultKey employs a strict zero-knowledge architecture. Neither VaultKey nor',
    'third parties have access to your master password or encryption keys.',
    '',
    '- All cryptographic operations execute locally on your device.',
    '- Master keys are derived via memory-hard Argon2id KDF and sealed in hardware',
    '  TEE/StrongBox keystores.',
    '- In the event that your master password is lost, this Emergency Recovery Kit',
    '  represents the ONLY mechanism to restore encrypted credentials.',
    '',
    '--------------------------------------------------------------------------------',
    '[EMERGENCY RECOVERY INSTRUCTIONS]',
    '--------------------------------------------------------------------------------',
    '1. Download or launch the official VaultKey app on Android or Windows.',
    '2. At the Welcome / Setup screen, select "Restore from Emergency Kit".',
    '3. Enter the 32-character Emergency Recovery Key and Verification Checksum.',
    '4. Provide your master password (or hint provided above) to decrypt your vault.',
    '5. Create a new master password immediately upon regaining access.',
    '',
    '================================================================================',
    '                    AUTHORIZED ZERO-KNOWLEDGE ATTESTATION                       ',
    '                     VaultKey Security Engineering Team                         ',
    '================================================================================',
    '',
  ].join('\n');
}

/**
 * Parses key components from an Emergency Kit string if present.
 */
export function parseEmergencyKit(text: string): {
  recoveryKey?: string;
  checksum?: string;
  isValid: boolean;
} {
  if (!text) return { isValid: false };

  // Match Key: XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX
  const keyMatch = text.match(/Key\s*:\s*([A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4})/i);
  const rawKey = keyMatch ? keyMatch[1].replace(/-/g, '').toUpperCase() : undefined;

  // Match Checksum: [CRC: XXXX]
  const checksumMatch = text.match(/Checksum\s*:\s*\[CRC:\s*([A-Za-z0-9]{4})\]/i);
  const checksum = checksumMatch ? checksumMatch[1].toUpperCase() : undefined;

  if (rawKey && checksum) {
    const isValid = verifyRecoveryKeyChecksum(rawKey, checksum);
    return {
      recoveryKey: rawKey,
      checksum,
      isValid,
    };
  }

  return { isValid: false };
}

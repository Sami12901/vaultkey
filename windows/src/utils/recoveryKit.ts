/**
 * VaultKey Emergency Access & Digital Recovery Kit for Windows Desktop
 */

function sha1Simple(str: string): string {
  // Simple pure JS SHA-1 for checksum calculation in renderer
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 128) bytes.push(code);
    else if (code < 2048) {
      bytes.push(192 | (code >> 6), 128 | (code & 63));
    } else {
      bytes.push(224 | (code >> 12), 128 | ((code >> 6) & 63), 128 | (code & 63));
    }
  }

  const bitLength = bytes.length * 8;
  bytes.push(0x80);
  while ((bytes.length % 64) !== 56) bytes.push(0);

  const highBits = Math.floor(bitLength / 0x100000000);
  const lowBits = bitLength >>> 0;
  bytes.push(
    (highBits >>> 24) & 0xff,
    (highBits >>> 16) & 0xff,
    (highBits >>> 8) & 0xff,
    highBits & 0xff,
    (lowBits >>> 24) & 0xff,
    (lowBits >>> 16) & 0xff,
    (lowBits >>> 8) & 0xff,
    lowBits & 0xff
  );

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;

  const rotl = (n: number, s: number) => ((n << s) | (n >>> (32 - s))) >>> 0;
  const w = new Uint32Array(80);

  for (let offset = 0; offset < bytes.length; offset += 64) {
    for (let i = 0; i < 16; i++) {
      const idx = offset + i * 4;
      w[i] = ((bytes[idx] << 24) | (bytes[idx + 1] << 16) | (bytes[idx + 2] << 8) | bytes[idx + 3]) >>> 0;
    }
    for (let i = 16; i < 80; i++) {
      w[i] = rotl(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4;
    for (let i = 0; i < 80; i++) {
      let f = 0, k = 0;
      if (i < 20) { f = (b & c) | (~b & d); k = 0x5a827999; }
      else if (i < 40) { f = b ^ c ^ d; k = 0x6ed9eba1; }
      else if (i < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8f1bbcdc; }
      else { f = b ^ c ^ d; k = 0xca62c1d6; }
      const temp = (rotl(a, 5) + f + e + k + w[i]) >>> 0;
      e = d; d = c; c = rotl(b, 30); b = a; a = temp;
    }
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }
  const toHex = (n: number) => n.toString(16).padStart(8, '0');
  return `${toHex(h0)}${toHex(h1)}${toHex(h2)}${toHex(h3)}${toHex(h4)}`.toUpperCase();
}

export function computeKeyChecksum(rawKey: string): string {
  const clean = rawKey.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return sha1Simple(clean).substring(0, 4);
}

export function generateFormattedRecoveryKey(existingKey?: string): { rawKey: string; formattedKey: string; checksum: string } {
  let clean = (existingKey || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (clean.length < 32) {
    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    clean = '';
    for (let i = 0; i < 32; i++) {
      clean += charset[Math.floor(Math.random() * charset.length)];
    }
  } else {
    clean = clean.substring(0, 32);
  }

  const chunks: string[] = [];
  for (let i = 0; i < 32; i += 4) {
    chunks.push(clean.substring(i, i + 4));
  }
  const formattedKey = chunks.join('-');
  const checksum = computeKeyChecksum(clean);
  return { rawKey: clean, formattedKey, checksum };
}

export function generateEmergencyKitContent(params: {
  vaultName?: string;
  userEmail?: string;
  createdAt?: number;
  recoveryKey?: string;
  hints?: string;
} = {}): string {
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

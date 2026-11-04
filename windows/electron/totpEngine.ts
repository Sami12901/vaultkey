import crypto from 'crypto';

export interface TotpResult {
  code: string;
  remainingSeconds: number;
  period: number;
  progress: number;
}

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export class TotpEngine {
  /**
   * Decodes a RFC 4648 Base32 string into a Buffer.
   */
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

  /**
   * Generates a TOTP code according to RFC 6238 / RFC 4226.
   */
  public static generateTotp(
    secretBuffer: Buffer,
    epochSeconds = Math.floor(Date.now() / 1000),
    period = 30,
    digits = 6,
    algorithm = 'SHA1'
  ): TotpResult {
    try {
      const validPeriod = period > 0 ? period : 30;
      const validDigits = digits === 8 ? 8 : 6;
      const timeStep = Math.floor(epochSeconds / validPeriod);
      const remainingSeconds = validPeriod - (epochSeconds % validPeriod);
      const progress = remainingSeconds / validPeriod;

      const timeBuffer = Buffer.alloc(8);
      // High 32 bits and low 32 bits for 64-bit integer
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

      // Dynamic Truncation
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
      // Memory wipe
      secretBuffer.fill(0);
    }
  }

  public static generateFromBase32(
    base32Secret: string,
    epochSeconds = Math.floor(Date.now() / 1000),
    period = 30,
    digits = 6,
    algorithm = 'SHA1'
  ): TotpResult {
    const buf = this.decodeBase32(base32Secret);
    return this.generateTotp(buf, epochSeconds, period, digits, algorithm);
  }
}


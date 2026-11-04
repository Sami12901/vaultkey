import crypto from 'crypto';

export interface EncryptedData {
  ciphertext: string; // base64
  iv: string;         // base64
  tag: string;        // base64
}

export class VaultCrypto {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 12;
  private static readonly TAG_LENGTH = 16;
  private static readonly SALT_LENGTH = 32;
  private static readonly PBKDF2_ITERATIONS = 600000;

  static generateSalt(): Buffer {
    return crypto.randomBytes(this.SALT_LENGTH);
  }

  static deriveKey(password: string, salt: Buffer, iterations: number = this.PBKDF2_ITERATIONS): Buffer {
    return crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256');
  }

  static encrypt(plaintext: string | Buffer, key: Buffer): EncryptedData {
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
    
    const inputBuf = typeof plaintext === 'string' ? Buffer.from(plaintext, 'utf8') : plaintext;
    const encrypted = Buffer.concat([cipher.update(inputBuf), cipher.final()]);
    const tag = cipher.getAuthTag();

    return {
      ciphertext: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
    };
  }

  static decrypt(encrypted: EncryptedData, key: Buffer): string {
    const iv = Buffer.from(encrypted.iv, 'base64');
    const tag = Buffer.from(encrypted.tag, 'base64');
    const ciphertext = Buffer.from(encrypted.ciphertext, 'base64');

    const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
  }

  static encryptRaw(buffer: Buffer, key: Buffer): { ciphertext: Buffer; iv: Buffer; tag: Buffer } {
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
    const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const tag = cipher.getAuthTag();
    return { ciphertext, iv, tag };
  }

  static decryptRaw(ciphertext: Buffer, iv: Buffer, tag: Buffer, key: Buffer): Buffer {
    const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }

  static wipe(buffer: Buffer): void {
    buffer.fill(0);
  }
}

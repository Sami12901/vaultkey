import { VaultCrypto } from './crypto';
import { argon2id } from 'hash-wasm';

export interface DesktopBackupPreview {
  formatVersion: number;
  timestamp: number;
  loginCount: number;
  noteCount: number;
  cardCount: number;
  bankCount: number;
  mediaCount: number;
  folderCount: number;
  tagCount: number;
  totalItems: number;
}

export class DesktopBackupManager {
  private static readonly MAGIC_HEADER = Buffer.from('VAULTKEY', 'ascii'); // 8 bytes
  private static readonly CURRENT_FORMAT_VERSION = 2;
  private static readonly KDF_ARGON2ID = 1;
  private static readonly KDF_PBKDF2 = 2;

  private static async deriveBackupKey(
    password: string,
    salt: Buffer,
    kdfId: number,
    memKiB: number,
    iterations: number,
    parallelism: number
  ): Promise<Buffer> {
    if (kdfId === this.KDF_ARGON2ID) {
      try {
        const binaryHash = await argon2id({
          password,
          salt: new Uint8Array(salt),
          parallelism: parallelism || 2,
          iterations: iterations || 3,
          memorySize: memKiB || 65536,
          hashLength: 32,
          outputType: 'binary',
        });
        return Buffer.from(binaryHash);
      } catch (err) {
        console.warn('Argon2id derivation failed, falling back to PBKDF2:', err);
        return VaultCrypto.deriveKey(password, salt, 100000);
      }
    } else {
      return VaultCrypto.deriveKey(password, salt, iterations || 100000);
    }
  }

  static async createBackup(vaultData: any, password: string): Promise<Buffer> {
    const salt = VaultCrypto.generateSalt();
    const memKiB = 65536; // 64 MB
    const iterations = 3;
    const parallelism = 2;

    const backupKey = await this.deriveBackupKey(
      password,
      salt,
      this.KDF_ARGON2ID,
      memKiB,
      iterations,
      parallelism
    );

    const jsonBytes = Buffer.from(JSON.stringify(vaultData), 'utf8');
    const { ciphertext, iv, tag } = VaultCrypto.encryptRaw(jsonBytes, backupKey);
    // In Android / Java AES-GCM, the 16-byte auth tag is appended to the ciphertext
    const combinedCiphertext = Buffer.concat([ciphertext, tag]);

    const header = Buffer.alloc(2 + 1 + 32 + 4 + 4 + 4 + 12 + 4);
    let offset = 0;
    header.writeInt16BE(this.CURRENT_FORMAT_VERSION, offset); offset += 2;
    header.writeInt8(this.KDF_ARGON2ID, offset); offset += 1;
    salt.copy(header, offset); offset += 32;
    header.writeInt32BE(memKiB, offset); offset += 4;
    header.writeInt32BE(iterations, offset); offset += 4;
    header.writeInt32BE(parallelism, offset); offset += 4;
    iv.copy(header, offset); offset += 12;
    header.writeInt32BE(combinedCiphertext.length, offset); offset += 4;

    VaultCrypto.wipe(backupKey);
    VaultCrypto.wipe(jsonBytes);

    return Buffer.concat([this.MAGIC_HEADER, header, combinedCiphertext]);
  }

  static async inspectBackup(
    backupBuffer: Buffer,
    password: string
  ): Promise<{ preview: DesktopBackupPreview; data: any }> {
    if (backupBuffer.length < 8 + 2 + 1 + 32 + 4 + 4 + 4 + 12 + 4 + 16) {
      throw new Error('Invalid backup file: file too small');
    }

    const magic = backupBuffer.subarray(0, 8);
    if (!magic.equals(this.MAGIC_HEADER)) {
      throw new Error('Invalid backup format: magic header mismatch');
    }

    let offset = 8;
    const version = backupBuffer.readInt16BE(offset); offset += 2;
    const kdfId = backupBuffer.readInt8(offset); offset += 1;
    const salt = backupBuffer.subarray(offset, offset + 32); offset += 32;
    const memKiB = backupBuffer.readInt32BE(offset); offset += 4;
    const iterations = backupBuffer.readInt32BE(offset); offset += 4;
    const parallelism = backupBuffer.readInt32BE(offset); offset += 4;
    const iv = backupBuffer.subarray(offset, offset + 12); offset += 12;
    const payloadLen = backupBuffer.readInt32BE(offset); offset += 4;

    const payload = backupBuffer.subarray(offset, offset + payloadLen);
    if (payload.length < 16) {
      throw new Error('Corrupted backup payload: missing authentication tag');
    }

    const ciphertext = payload.subarray(0, payload.length - 16);
    const tag = payload.subarray(payload.length - 16);

    const backupKey = await this.deriveBackupKey(
      password,
      salt,
      kdfId,
      memKiB,
      iterations,
      parallelism
    );

    let decrypted: Buffer;
    try {
      decrypted = VaultCrypto.decryptRaw(ciphertext, iv, tag, backupKey);
    } catch (e: any) {
      throw new Error('Incorrect backup password or corrupted backup file');
    } finally {
      VaultCrypto.wipe(backupKey);
    }

    const jsonStr = decrypted.toString('utf8');
    VaultCrypto.wipe(decrypted);

    const data = JSON.parse(jsonStr);
    const items = Array.isArray(data.items) ? data.items : [];
    const folders = Array.isArray(data.folders) ? data.folders : [];
    const tags = Array.isArray(data.tags) ? data.tags : [];

    let loginCount = 0;
    let noteCount = 0;
    let cardCount = 0;
    let bankCount = 0;
    let mediaCount = 0;

    for (const item of items) {
      switch (item.type) {
        case 'LOGIN': loginCount++; break;
        case 'SECURE_NOTE': noteCount++; break;
        case 'CREDENTIAL_CARD': cardCount++; break;
        case 'BANK_ACCOUNT': bankCount++; break;
        case 'SECURE_MEDIA': mediaCount++; break;
      }
    }

    const preview: DesktopBackupPreview = {
      formatVersion: version,
      timestamp: data.timestamp || Date.now(),
      loginCount,
      noteCount,
      cardCount,
      bankCount,
      mediaCount,
      folderCount: folders.length,
      tagCount: tags.length,
      totalItems: items.length,
    };

    return { preview, data };
  }
}

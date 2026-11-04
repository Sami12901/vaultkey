import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { VaultCrypto, EncryptedData } from './crypto';
import { DesktopBackupManager } from './backup';
import { TotpEngine } from './totpEngine';

export interface VaultConfig {
  salt: string; // base64
  verifier: EncryptedData;
  createdAt: number;
}

export interface AppSettings {
  autoLockSeconds: number;
  biometricEnabled: boolean;
  screenSecurity: boolean;
  clipboardClearSeconds: number;
  language: string;
  theme: string;
  showWebsiteIcons: boolean;
  runInBackground: boolean;
  startAtLogin: boolean;
}

export interface StoredVaultData {
  folders: Array<{ id: string; name: string; color: string; icon: string; createdAt: number }>;
  tags: Array<{ id: string; name: string; color: string }>;
  items: Array<any>;
  settings: AppSettings;
  auditEvents: Array<{ id: string; timestamp: number; eventType: string; details: string; isSuccess: boolean }>;
}

export class VaultStorage {
  private baseDir: string;
  private configFile: string;
  private vaultFile: string;

  private activeDek: Buffer | null = null;
  private memoryVault: StoredVaultData | null = null;

  constructor() {
    const appData = process.env.APPDATA || (process.platform === 'darwin' ? path.join(os.homedir(), 'Library', 'Application Support') : path.join(os.homedir(), '.config'));
    this.baseDir = path.join(appData, 'VaultKey');
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
    this.configFile = path.join(this.baseDir, 'config.json');
    this.vaultFile = path.join(this.baseDir, 'vault_data.enc');
  }

  isInitialized(): boolean {
    return fs.existsSync(this.configFile) && fs.existsSync(this.vaultFile);
  }

  isUnlocked(): boolean {
    return this.activeDek !== null && this.memoryVault !== null;
  }

  resetVault(): boolean {
    this.lock();
    try {
      if (fs.existsSync(this.configFile)) {
        fs.unlinkSync(this.configFile);
      }
      if (fs.existsSync(this.vaultFile)) {
        fs.unlinkSync(this.vaultFile);
      }
      return true;
    } catch (e) {
      console.error('Failed to reset vault:', e);
      return false;
    }
  }

  initializeVault(masterPassword: string): boolean {
    const salt = VaultCrypto.generateSalt();
    const dek = VaultCrypto.deriveKey(masterPassword, salt);
    
    // Verifier is an encryption of a known constant
    const verifier = VaultCrypto.encrypt('VAULTKEY_VERIFIED', dek);
    const config: VaultConfig = {
      salt: salt.toString('base64'),
      verifier,
      createdAt: Date.now(),
    };
    fs.writeFileSync(this.configFile, JSON.stringify(config, null, 2), 'utf8');

    const defaultFolders = [
      { id: crypto.randomUUID(), name: 'Personal', color: '#10B981', icon: 'user', createdAt: Date.now() },
      { id: crypto.randomUUID(), name: 'Work', color: '#3B82F6', icon: 'briefcase', createdAt: Date.now() },
      { id: crypto.randomUUID(), name: 'Finance', color: '#F59E0B', icon: 'card', createdAt: Date.now() },
      { id: crypto.randomUUID(), name: 'Social', color: '#8B5CF6', icon: 'message-circle', createdAt: Date.now() },
      { id: crypto.randomUUID(), name: 'Other', color: '#64748B', icon: 'folder', createdAt: Date.now() },
    ];

    const initialData: StoredVaultData = {
      folders: defaultFolders,
      tags: [],
      items: [],
      settings: {
        autoLockSeconds: 300,
        biometricEnabled: false,
        screenSecurity: true,
        clipboardClearSeconds: 30,
        language: 'en',
        theme: 'dark',
        showWebsiteIcons: true,
        runInBackground: true,
        startAtLogin: false,
      },
      auditEvents: [
        {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          eventType: 'VAULT_INITIALIZED',
          details: 'Zero-knowledge vault initialized on Windows Desktop',
          isSuccess: true,
        }
      ],
    };

    this.activeDek = dek;
    this.memoryVault = initialData;
    this.persistVault();
    return true;
  }

  unlock(masterPassword: string): boolean {
    if (!this.isInitialized()) throw new Error('Vault is not initialized');
    const config: VaultConfig = JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
    const salt = Buffer.from(config.salt, 'base64');
    const dek = VaultCrypto.deriveKey(masterPassword, salt);

    try {
      const check = VaultCrypto.decrypt(config.verifier, dek);
      if (check !== 'VAULTKEY_VERIFIED') {
        VaultCrypto.wipe(dek);
        return false;
      }
    } catch {
      VaultCrypto.wipe(dek);
      return false;
    }

    // Decrypt vault data
    const encData: EncryptedData = JSON.parse(fs.readFileSync(this.vaultFile, 'utf8'));
    const decryptedJson = VaultCrypto.decrypt(encData, dek);
    this.memoryVault = JSON.parse(decryptedJson);
    this.activeDek = dek;

    this.logAuditEvent('VAULT_UNLOCKED', 'Vault successfully unlocked with master password', true);
    return true;
  }

  lock(): boolean {
    if (this.activeDek) {
      VaultCrypto.wipe(this.activeDek);
      this.activeDek = null;
    }
    this.memoryVault = null;
    return true;
  }

  changeMasterPassword(currentPass: string, newPass: string): boolean {
    if (!this.unlock(currentPass)) throw new Error('Incorrect current password');
    const newSalt = VaultCrypto.generateSalt();
    const newDek = VaultCrypto.deriveKey(newPass, newSalt);
    const verifier = VaultCrypto.encrypt('VAULTKEY_VERIFIED', newDek);

    const config: VaultConfig = {
      salt: newSalt.toString('base64'),
      verifier,
      createdAt: Date.now(),
    };
    fs.writeFileSync(this.configFile, JSON.stringify(config, null, 2), 'utf8');

    if (this.activeDek) VaultCrypto.wipe(this.activeDek);
    this.activeDek = newDek;
    this.persistVault();
    this.logAuditEvent('PASSWORD_CHANGED', 'Master password changed', true);
    return true;
  }

  private persistVault(): void {
    if (!this.activeDek || !this.memoryVault) return;
    const jsonStr = JSON.stringify(this.memoryVault);
    const encData = VaultCrypto.encrypt(jsonStr, this.activeDek);
    fs.writeFileSync(this.vaultFile, JSON.stringify(encData, null, 2), 'utf8');
  }

  private logAuditEvent(eventType: string, details: string, isSuccess: boolean = true): void {
    if (!this.memoryVault) return;
    this.memoryVault.auditEvents.unshift({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      eventType,
      details,
      isSuccess,
    });
    if (this.memoryVault.auditEvents.length > 200) {
      this.memoryVault.auditEvents = this.memoryVault.auditEvents.slice(0, 200);
    }
    this.persistVault();
  }

  // ---------------------------------------------------------
  // Item Operations
  // ---------------------------------------------------------

  getItemSummaries(options: any = {}): any[] {
    if (!this.memoryVault) return [];
    let list = [...this.memoryVault.items];

    if (options.type && options.type !== 'ALL') {
      list = list.filter(i => i.type === options.type.toUpperCase());
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

    // Sort
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
    }));
  }

  getSecret(itemId: string, fieldName: string): string {
    if (!this.memoryVault) throw new Error('Vault is locked');
    const item = this.memoryVault.items.find(i => i.id === itemId);
    if (!item) throw new Error('Item not found');

    switch (fieldName) {
      case 'password': return item.loginData?.password || '';
      case 'cardNumber': return item.cardData?.cardNumber || '';
      case 'cvv': return item.cardData?.cvv || '';
      case 'pin': return item.cardData?.pin || '';
      case 'accountNumber': return item.bankData?.accountNumber || '';
      case 'notes': return item.noteData?.content || '';
      default: return '';
    }
  }

  saveLoginItem(data: any): string {
    if (!this.memoryVault) throw new Error('Vault is locked');
    const id = data.id || crypto.randomUUID();
    const now = Date.now();

    const existingIndex = this.memoryVault.items.findIndex(i => i.id === id);
    const item = {
      id,
      type: 'LOGIN',
      title: data.title || 'Untitled',
      subtitle: data.username || '',
      folderId: data.folderId || null,
      isFavorite: !!data.isFavorite,
      createdAt: existingIndex >= 0 ? this.memoryVault.items[existingIndex].createdAt : now,
      updatedAt: now,
      tags: data.tags || [],
      loginData: {
        username: data.username || '',
        password: data.password || '',
        urlsJson: data.urls || '[]',
        notes: data.notes || '',
        website: data.website || '',
        lastChangedAt: now,
      },
    };

    if (existingIndex >= 0) {
      this.memoryVault.items[existingIndex] = item;
    } else {
      this.memoryVault.items.push(item);
    }
    this.logAuditEvent('ITEM_SAVED', `Login item saved: ${item.title}`, true);
    this.persistVault();
    return id;
  }

  saveSecureNote(data: any): string {
    if (!this.memoryVault) throw new Error('Vault is locked');
    const id = data.id || crypto.randomUUID();
    const now = Date.now();

    const existingIndex = this.memoryVault.items.findIndex(i => i.id === id);
    const item = {
      id,
      type: 'SECURE_NOTE',
      title: data.title || 'Untitled Note',
      subtitle: 'Secure Note',
      folderId: data.folderId || null,
      isFavorite: !!data.isFavorite,
      createdAt: existingIndex >= 0 ? this.memoryVault.items[existingIndex].createdAt : now,
      updatedAt: now,
      tags: data.tags || [],
      noteData: {
        content: data.content || '',
        isRichText: !!data.isRichText,
      },
    };

    if (existingIndex >= 0) {
      this.memoryVault.items[existingIndex] = item;
    } else {
      this.memoryVault.items.push(item);
    }
    this.logAuditEvent('ITEM_SAVED', `Secure note saved: ${item.title}`, true);
    this.persistVault();
    return id;
  }

  saveCreditCard(data: any): string {
    if (!this.memoryVault) throw new Error('Vault is locked');
    const id = data.id || crypto.randomUUID();
    const now = Date.now();
    const num = data.cardNumber || '';
    const masked = num.length >= 4 ? '•••• •••• •••• ' + num.slice(-4) : '••••';

    const existingIndex = this.memoryVault.items.findIndex(i => i.id === id);
    const item = {
      id,
      type: 'CREDENTIAL_CARD',
      title: data.title || 'Card',
      subtitle: `${data.cardBrand || 'Card'} ${masked}`,
      folderId: data.folderId || null,
      isFavorite: !!data.isFavorite,
      createdAt: existingIndex >= 0 ? this.memoryVault.items[existingIndex].createdAt : now,
      updatedAt: now,
      tags: data.tags || [],
      cardData: {
        cardholderName: data.cardholderName || '',
        maskedNumber: masked,
        cardNumber: num,
        expiryMonth: data.expiryMonth || '',
        expiryYear: data.expiryYear || '',
        cvv: data.cvv || '',
        cardBrand: data.cardBrand || 'Card',
        pin: data.pin || '',
        cardType: data.cardType || 'Credit',
        billingZip: data.billingZip || '',
      },
    };

    if (existingIndex >= 0) {
      this.memoryVault.items[existingIndex] = item;
    } else {
      this.memoryVault.items.push(item);
    }
    this.logAuditEvent('ITEM_SAVED', `Credit card saved: ${item.title}`, true);
    this.persistVault();
    return id;
  }

  saveBankAccount(data: any): string {
    if (!this.memoryVault) throw new Error('Vault is locked');
    const id = data.id || crypto.randomUUID();
    const now = Date.now();
    const num = data.accountNumber || '';
    const masked = num.length >= 4 ? '•••• ' + num.slice(-4) : '••••';

    const existingIndex = this.memoryVault.items.findIndex(i => i.id === id);
    const item = {
      id,
      type: 'BANK_ACCOUNT',
      title: data.title || 'Bank Account',
      subtitle: `${data.bankName || 'Bank'} (${masked})`,
      folderId: data.folderId || null,
      isFavorite: !!data.isFavorite,
      createdAt: existingIndex >= 0 ? this.memoryVault.items[existingIndex].createdAt : now,
      updatedAt: now,
      tags: data.tags || [],
      bankData: {
        bankName: data.bankName || '',
        accountHolder: data.accountHolder || '',
        maskedAccountNumber: masked,
        accountNumber: num,
        routingNumber: data.routingNumber || '',
        swiftBic: data.swiftBic || '',
        iban: data.iban || '',
        accountType: data.accountType || 'Checking',
      },
    };

    if (existingIndex >= 0) {
      this.memoryVault.items[existingIndex] = item;
    } else {
      this.memoryVault.items.push(item);
    }
    this.logAuditEvent('ITEM_SAVED', `Bank account saved: ${item.title}`, true);
    this.persistVault();
    return id;
  }

  saveAuthenticatorItem(data: any): string {
    if (!this.memoryVault) throw new Error('Vault is locked');
    const id = data.id || crypto.randomUUID();
    const now = Date.now();

    const existingIndex = this.memoryVault.items.findIndex(i => i.id === id);
    const item = {
      id,
      type: 'AUTHENTICATOR_2FA',
      title: data.title || data.issuer || '2FA Authenticator',
      subtitle: `${data.issuer || ''} (${data.accountName || ''})`,
      folderId: data.folderId || null,
      isFavorite: !!data.isFavorite,
      createdAt: existingIndex >= 0 ? this.memoryVault.items[existingIndex].createdAt : now,
      updatedAt: now,
      tags: data.tags || [],
      authenticatorData: {
        issuer: data.issuer || '',
        accountName: data.accountName || '',
        secret: data.secret || '',
        algorithm: data.algorithm || 'SHA1',
        digits: data.digits || 6,
        period: data.period || 30,
      },
    };

    if (existingIndex >= 0) {
      this.memoryVault.items[existingIndex] = item;
    } else {
      this.memoryVault.items.push(item);
    }
    this.logAuditEvent('ITEM_SAVED', `2FA Authenticator saved: ${item.title}`, true);
    this.persistVault();
    return id;
  }

  getTotpCode(itemId: string): any {
    if (!this.memoryVault) throw new Error('Vault is locked');
    const item = this.memoryVault.items.find(i => i.id === itemId);
    if (!item) throw new Error('Item not found');

    const auth = item.authenticatorData || (item.loginData?.totpSecret ? {
      secret: item.loginData.totpSecret,
      digits: item.loginData.totpDigits || 6,
      period: item.loginData.totpPeriod || 30,
      algorithm: item.loginData.totpAlgorithm || 'SHA1'
    } : null);

    if (!auth || !auth.secret) {
      throw new Error('No 2FA secret found for this item');
    }

    return TotpEngine.generateFromBase32(
      auth.secret,
      Math.floor(Date.now() / 1000),
      auth.period || 30,
      auth.digits || 6,
      auth.algorithm || 'SHA1'
    );
  }

  toggleFavorite(itemId: string): boolean {
    if (!this.memoryVault) return false;
    const item = this.memoryVault.items.find(i => i.id === itemId);
    if (!item) return false;
    item.isFavorite = !item.isFavorite;
    item.updatedAt = Date.now();
    this.persistVault();
    return item.isFavorite;
  }

  deleteItem(itemId: string): boolean {
    if (!this.memoryVault) return false;
    this.memoryVault.items = this.memoryVault.items.filter(i => i.id !== itemId);
    this.logAuditEvent('ITEM_DELETED', `Item deleted: ${itemId}`, true);
    this.persistVault();
    return true;
  }

  // ---------------------------------------------------------
  // Folders & Tags
  // ---------------------------------------------------------

  getFolders(): any[] {
    return this.memoryVault ? this.memoryVault.folders : [];
  }

  createFolder(name: string, color: string = '#10B981', icon: string = 'folder'): any {
    if (!this.memoryVault) throw new Error('Vault is locked');
    const folder = { id: crypto.randomUUID(), name, color, icon, createdAt: Date.now() };
    this.memoryVault.folders.push(folder);
    this.persistVault();
    return folder;
  }

  deleteFolder(folderId: string): boolean {
    if (!this.memoryVault) return false;
    this.memoryVault.folders = this.memoryVault.folders.filter(f => f.id !== folderId);
    this.memoryVault.items.forEach(i => {
      if (i.folderId === folderId) i.folderId = null;
    });
    this.persistVault();
    return true;
  }

  getTags(): any[] {
    return this.memoryVault ? this.memoryVault.tags : [];
  }

  // ---------------------------------------------------------
  // Settings & Audit
  // ---------------------------------------------------------

  getSettings(): AppSettings {
    const defaults: AppSettings = {
      autoLockSeconds: 300,
      biometricEnabled: false,
      screenSecurity: true,
      clipboardClearSeconds: 30,
      language: 'en',
      theme: 'dark',
      showWebsiteIcons: true,
      runInBackground: true,
      startAtLogin: false,
    };
    if (this.memoryVault) {
      return { ...defaults, ...this.memoryVault.settings };
    }
    return defaults;
  }

  updateSettings(settings: Partial<AppSettings>): boolean {
    if (!this.memoryVault) return false;
    this.memoryVault.settings = { ...this.memoryVault.settings, ...settings };
    this.persistVault();
    return true;
  }

  getAuditEvents(limit: number = 100): any[] {
    return this.memoryVault ? this.memoryVault.auditEvents.slice(0, limit) : [];
  }

  // ---------------------------------------------------------
  // Security Analysis
  // ---------------------------------------------------------

  getSecurityAnalysis(): any {
    if (!this.memoryVault) return null;
    const logins = this.memoryVault.items.filter(i => i.type === 'LOGIN');
    let weakCount = 0;
    let oldCount = 0;
    const hashes = new Map<string, string[]>();
    const weakItemIds: string[] = [];
    const reusedItemIds: string[] = [];
    const oldItemIds: string[] = [];

    const now = Date.now();
    const ninetyDays = 90 * 24 * 60 * 60 * 1000;

    for (const item of logins) {
      const pass = item.loginData?.password || '';
      if (pass.length < 10 || /^[a-zA-Z]+$/.test(pass) || /^[0-9]+$/.test(pass)) {
        weakCount++;
        weakItemIds.push(item.id);
      }
      if (now - (item.loginData?.lastChangedAt || item.createdAt || 0) > ninetyDays) {
        oldCount++;
        oldItemIds.push(item.id);
      }
      const hash = crypto.createHash('sha256').update(pass).digest('hex');
      const list = hashes.get(hash) || [];
      list.push(item.id);
      hashes.set(hash, list);
    }

    let reusedCount = 0;
    for (const [_, ids] of hashes.entries()) {
      if (ids.length > 1) {
        reusedCount += ids.length;
        reusedItemIds.push(...ids);
      }
    }

    const total = logins.length;
    const score = total === 0 ? 100 : Math.max(0, Math.round(100 - (weakCount * 15 + reusedCount * 10 + oldCount * 5) / total));

    return {
      score,
      totalItems: total,
      weakCount,
      reusedCount,
      oldCount,
      weakItemIds,
      reusedItemIds,
      oldItemIds,
    };
  }

  // ---------------------------------------------------------
  // Cross-Platform .vkb Backup & Restore
  // ---------------------------------------------------------

  async createEncryptedBackup(password: string): Promise<{ filePath: string; fileName: string; fileSizeBytes: number }> {
    if (!this.memoryVault) throw new Error('Vault is locked');
    const backupBytes = await DesktopBackupManager.createBackup(this.memoryVault, password);
    const fileName = `vaultkey_backup_${Date.now()}.vkb`;
    const backupsDir = path.join(this.baseDir, 'Backups');
    if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });
    const filePath = path.join(backupsDir, fileName);
    fs.writeFileSync(filePath, backupBytes);

    this.logAuditEvent('BACKUP_CREATED', `Created backup: ${fileName}`, true);
    return { filePath, fileName, fileSizeBytes: backupBytes.length };
  }

  async inspectBackup(filePath: string, password: string): Promise<any> {
    const bytes = fs.readFileSync(filePath);
    const { preview } = await DesktopBackupManager.inspectBackup(bytes, password);
    return preview;
  }

  async restoreBackup(filePath: string, password: string, mode: 'MERGE' | 'REPLACE'): Promise<{ restoredCount: number }> {
    if (!this.memoryVault) throw new Error('Vault is locked');
    const bytes = fs.readFileSync(filePath);
    const { data } = await DesktopBackupManager.inspectBackup(bytes, password);

    if (mode === 'REPLACE') {
      this.memoryVault.items = [];
    }

    let importedCount = 0;
    const existingFolderNames = new Set(this.memoryVault.folders.map(f => f.name.toLowerCase()));
    const folderIdMap = new Map<string, string>();

    // Restore folders
    for (const f of data.folders || []) {
      const match = this.memoryVault.folders.find(ef => ef.name.toLowerCase() === f.name.toLowerCase());
      if (match && mode === 'MERGE') {
        folderIdMap.set(f.id, match.id);
      } else {
        const newFolder = {
          id: f.id || crypto.randomUUID(),
          name: f.name,
          color: f.color || '#10B981',
          icon: f.icon || 'folder',
          createdAt: f.createdAt || Date.now(),
        };
        this.memoryVault.folders.push(newFolder);
        folderIdMap.set(f.id, newFolder.id);
      }
    }

    // Restore items
    for (const item of data.items || []) {
      const mappedFolderId = item.folderId ? folderIdMap.get(item.folderId) || item.folderId : null;
      const restoredItem = {
        ...item,
        id: crypto.randomUUID(),
        folderId: mappedFolderId,
        updatedAt: Date.now(),
      };
      this.memoryVault.items.push(restoredItem);
      importedCount++;
    }

    this.logAuditEvent('BACKUP_RESTORED', `Restored ${importedCount} items (${mode} mode)`, true);
    this.persistVault();
    return { restoredCount: importedCount };
  }

  listBackupFiles(): any[] {
    const backupsDir = path.join(this.baseDir, 'Backups');
    if (!fs.existsSync(backupsDir)) return [];
    const files = fs.readdirSync(backupsDir).filter(f => f.endsWith('.vkb'));
    return files.map(f => {
      const fullPath = path.join(backupsDir, f);
      const stat = fs.statSync(fullPath);
      return {
        fileName: f,
        filePath: fullPath,
        fileSizeBytes: stat.size,
        lastModified: stat.mtimeMs,
      };
    }).sort((a, b) => b.lastModified - a.lastModified);
  }

  exportCredentialsJson(): string {
    if (!this.memoryVault) throw new Error('Vault is locked');
    return JSON.stringify({
      generator: 'VaultKey Windows Desktop',
      exportedAt: Date.now(),
      items: this.memoryVault.items,
    }, null, 2);
  }

  importCredentialsJson(jsonStr: string): { importedCount: number } {
    if (!this.memoryVault) throw new Error('Vault is locked');
    const root = JSON.parse(jsonStr);
    const items = Array.isArray(root.items) ? root.items : [];
    let count = 0;

    for (const item of items) {
      if (item.login || item.loginData) {
        const title = item.title || item.name || 'Imported Login';
        const loginObj = item.login || item.loginData || {};
        this.saveLoginItem({
          title,
          username: loginObj.username || item.username || '',
          password: loginObj.password || item.password || '',
          notes: item.notes || loginObj.notes || '',
        });
        count++;
      }
    }

    this.logAuditEvent('JSON_IMPORTED', `Imported ${count} credentials from JSON`, true);
    this.persistVault();
    return { importedCount: count };
  }

  getBridgeToken(): string {
    const bridgeFile = path.join(this.baseDir, 'bridge_auth.json');
    if (fs.existsSync(bridgeFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(bridgeFile, 'utf8'));
        if (data && typeof data.token === 'string' && data.token.length >= 32) {
          return data.token;
        }
      } catch (err) {
        console.warn('Failed to parse bridge_auth.json, generating new token:', err);
      }
    }
    return this.regenerateBridgeToken();
  }

  regenerateBridgeToken(): string {
    const bridgeFile = path.join(this.baseDir, 'bridge_auth.json');
    const token = crypto.randomBytes(32).toString('hex');
    try {
      fs.writeFileSync(bridgeFile, JSON.stringify({ token, createdAt: Date.now() }, null, 2), {
        encoding: 'utf8',
        mode: 0o600,
      });
    } catch (err) {
      console.error('Failed to save bridge_auth.json:', err);
    }
    return token;
  }
}

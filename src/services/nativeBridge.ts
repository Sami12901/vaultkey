import { NativeModules } from 'react-native';
import {
  VaultItemSummary,
  Folder,
  Tag,
  SecurityAnalysis,
  AppSettings,
  AuditEvent,
  PasswordGeneratorOptions,
  PassphraseOptions,
  GeneratedPasswordResult,
  BackupPreview,
  PickedBackupResult,
  BankAccountInput,
  CreditCardInput,
  EncryptedFileResult,
  DecryptedFileResult,
  PickedMediaResult,
  VaultMediaInput,
  DecryptedVaultMediaResult,
} from '../types';

const {
  VaultModule,
  BiometricModule,
  ClipboardModule,
  AutofillModule,
  SecurityModule,
  BackupModule,
} = NativeModules;

export const vaultNative = {
  // Vault lifecycle & auth
  isInitialized: async (): Promise<boolean> => {
    return VaultModule.isInitialized();
  },

  getVaultState: async (): Promise<'UNINITIALIZED' | 'LOCKED' | 'UNLOCKED'> => {
    return VaultModule.getVaultState();
  },

  initializeVault: async (masterPassword: string): Promise<boolean> => {
    return VaultModule.initializeVault(masterPassword);
  },

  unlock: async (masterPassword: string): Promise<boolean> => {
    return VaultModule.unlock(masterPassword);
  },

  lock: async (): Promise<boolean> => {
    return VaultModule.lock();
  },

  changeMasterPassword: async (currentPass: string, newPass: string): Promise<boolean> => {
    return VaultModule.changeMasterPassword(currentPass, newPass);
  },

  cryptoErase: async (): Promise<boolean> => {
    return VaultModule.cryptoErase();
  },

  // Item summaries (non-sensitive metadata)
  getItemSummaries: async (options?: {
    type?: string;
    folderId?: string;
    tag?: string;
    favoritesOnly?: boolean;
    query?: string;
    sort?: string;
    limit?: number;
    offset?: number;
  }): Promise<VaultItemSummary[]> => {
    return VaultModule.getItemSummaries(options || {});
  },

  // On-demand secret fetch (single field decrypted)
  getSecret: async (itemId: string, fieldName: string): Promise<string> => {
    return VaultModule.getSecret(itemId, fieldName);
  },

  // Save items
  saveLoginItem: async (data: {
    title: string;
    username: string;
    password: string;
    folderId?: string | null;
    isFavorite?: boolean;
    urls?: string;
    notes?: string;
    tags?: string[];
  }): Promise<string> => {
    return VaultModule.saveLoginItem(data);
  },

  saveSecureNote: async (data: {
    title: string;
    content: string;
    folderId?: string | null;
    isFavorite?: boolean;
    tags?: string[];
    isRichText?: boolean;
  }): Promise<string> => {
    return VaultModule.saveSecureNote(data);
  },

  saveCreditCard: async (data: CreditCardInput): Promise<string> => {
    return VaultModule.saveCreditCard(data);
  },

  saveBankAccount: async (data: BankAccountInput): Promise<string> => {
    return VaultModule.saveBankAccount(data);
  },

  toggleFavorite: async (itemId: string): Promise<boolean> => {
    return VaultModule.toggleFavorite(itemId);
  },

  deleteItem: async (itemId: string, permanently: boolean = false): Promise<boolean> => {
    return VaultModule.deleteItem(itemId, permanently);
  },

  // Folders & tags
  getFolders: async (): Promise<Folder[]> => {
    return VaultModule.getFolders();
  },

  createFolder: async (name: string, color: string = '#10B981', icon: string = 'folder'): Promise<Folder> => {
    return VaultModule.createFolder(name, color, icon);
  },

  deleteFolder: async (folderId: string): Promise<boolean> => {
    return VaultModule.deleteFolder(folderId);
  },

  getTags: async (): Promise<Tag[]> => {
    return VaultModule.getTags();
  },

  // Security dashboard
  getSecurityAnalysis: async (): Promise<SecurityAnalysis> => {
    return VaultModule.getSecurityAnalysis();
  },

  // Password generator
  generatePassword: async (options?: Partial<PasswordGeneratorOptions>): Promise<GeneratedPasswordResult> => {
    return VaultModule.generatePassword(options || {});
  },

  generatePassphrase: async (options?: Partial<PassphraseOptions>): Promise<GeneratedPasswordResult> => {
    return VaultModule.generatePassphrase(options || {});
  },

  // Settings & Audit
  getSettings: async (): Promise<AppSettings> => {
    return VaultModule.getSettings();
  },

  updateSettings: async (settings: Partial<AppSettings>): Promise<boolean> => {
    return VaultModule.updateSettings(settings);
  },

  getAuditEvents: async (limit: number = 100): Promise<AuditEvent[]> => {
    return VaultModule.getAuditEvents(limit);
  },

  // Sensitive Share Capsule (Text)
  encryptSharePayload: async (plainText: string, passphrase: string): Promise<string> => {
    return VaultModule.encryptSharePayload(plainText, passphrase);
  },

  decryptSharePayload: async (capsule: string, passphrase: string): Promise<string> => {
    return VaultModule.decryptSharePayload(capsule, passphrase);
  },

  // Zero-Knowledge Encrypted Media & File Sharing (.vkfile)
  encryptFile: async (inputUriOrPath: string, passphrase: string, hint: string = ''): Promise<EncryptedFileResult> => {
    return VaultModule.encryptFile(inputUriOrPath, passphrase, hint);
  },

  decryptFile: async (encryptedFilePath: string, passphrase: string): Promise<DecryptedFileResult> => {
    return VaultModule.decryptFile(encryptedFilePath, passphrase);
  },

  shareEncryptedFile: async (filePath: string, title: string = 'Share Encrypted File'): Promise<boolean> => {
    return VaultModule.shareEncryptedFile(filePath, title);
  },

  pickFile: async (mimeType: string = '*/*'): Promise<{ uri: string; fileName: string; mimeType: string; sizeBytes: number }> => {
    return VaultModule.pickFile(mimeType);
  },

  // Private Media Vault (Camera & Encrypted Storage)
  captureMedia: async (mode: 'PHOTO' | 'VIDEO' = 'PHOTO'): Promise<PickedMediaResult> => {
    return VaultModule.captureMedia(mode);
  },

  pickMediaFromGallery: async (mediaType: string = 'image/*'): Promise<PickedMediaResult> => {
    return VaultModule.pickMediaFromGallery(mediaType);
  },

  saveVaultMedia: async (data: VaultMediaInput): Promise<string> => {
    return VaultModule.saveVaultMedia(data);
  },

  getDecryptedMedia: async (itemId: string): Promise<DecryptedVaultMediaResult> => {
    return VaultModule.getDecryptedMedia(itemId);
  },

  exportVaultMediaToGallery: async (itemId: string): Promise<boolean> => {
    return VaultModule.exportVaultMediaToGallery(itemId);
  },
};

export const biometricNative = {
  canAuthenticate: async (): Promise<{ isSupported: boolean; status: string; isStrongBoxSupported: boolean }> => {
    return BiometricModule.canAuthenticate();
  },

  isBiometricUnlockAvailable: async (): Promise<boolean> => {
    return BiometricModule.isBiometricUnlockAvailable();
  },

  enableBiometricsWithPassword: async (password: string): Promise<boolean> => {
    return BiometricModule.enableBiometricsWithPassword(password);
  },

  disableBiometrics: async (): Promise<boolean> => {
    return BiometricModule.disableBiometrics();
  },

  authenticate: async (): Promise<boolean> => {
    return BiometricModule.authenticate();
  },
};

export const clipboardNative = {
  copySecure: async (text: string, label: string = 'VaultKey', timeoutSeconds: number = 30): Promise<{ message: string }> => {
    return ClipboardModule.copySecure(text, label, timeoutSeconds);
  },

  clearClipboard: async (): Promise<boolean> => {
    return ClipboardModule.clearClipboard();
  },
};

export const autofillNative = {
  isAutofillSupported: async (): Promise<boolean> => {
    return AutofillModule.isAutofillSupported();
  },

  isAutofillEnabled: async (): Promise<boolean> => {
    return AutofillModule.isAutofillEnabled();
  },

  openAutofillSettings: async (): Promise<boolean> => {
    return AutofillModule.openAutofillSettings();
  },
};

export const securityNative = {
  setScreenSecurity: async (enabled: boolean): Promise<boolean> => {
    return SecurityModule.setScreenSecurity(enabled);
  },

  checkDeviceSecurity: async (): Promise<{
    isRootDetected: boolean;
    isTestKeysBuild: boolean;
    isStrongBoxSupported: boolean;
    securityLevel: string;
  }> => {
    return SecurityModule.checkDeviceSecurity();
  },
};

export const backupNative = {
  createEncryptedBackup: async (password: string): Promise<{ filePath: string; fileName: string; fileSizeBytes: number }> => {
    return BackupModule.createEncryptedBackup(password);
  },

  inspectBackup: async (filePath: string, password: string): Promise<BackupPreview> => {
    return BackupModule.inspectBackup(filePath, password);
  },

  restoreBackup: async (filePath: string, password: string, mode: 'MERGE' | 'REPLACE'): Promise<{ restoredCount: number }> => {
    return BackupModule.restoreBackup(filePath, password, mode);
  },

  importCredentialsJson: async (jsonString: string, deleteSourceFile?: string): Promise<{ importedCount: number }> => {
    return BackupModule.importCredentialsJson(jsonString, deleteSourceFile);
  },

  listBackupFiles: async (): Promise<Array<{ fileName: string; filePath: string; fileSizeBytes: number; lastModified: number }>> => {
    return BackupModule.listBackupFiles();
  },

  shareBackupFile: async (filePath: string): Promise<boolean> => {
    return BackupModule.shareBackupFile(filePath);
  },

  exportBackupToDownloads: async (filePath: string): Promise<{ exportedPath: string; fileName: string; success: boolean }> => {
    return BackupModule.exportBackupToDownloads(filePath);
  },

  pickBackupFile: async (): Promise<PickedBackupResult> => {
    return BackupModule.pickBackupFile();
  },

  exportCredentialsJson: async (): Promise<string> => {
    return BackupModule.exportCredentialsJson();
  },

  deleteBackupFile: async (filePath: string): Promise<boolean> => {
    return BackupModule.deleteBackupFile(filePath);
  },
};
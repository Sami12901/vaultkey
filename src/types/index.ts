export type ItemType =
  | 'LOGIN'
  | 'SECURE_NOTE'
  | 'CREDENTIAL_CARD'
  | 'CREDENTIAL_IDENTITY'
  | 'BANK_ACCOUNT'
  | 'API_CREDENTIAL'
  | 'WIFI_CREDENTIAL'
  | 'SOFTWARE_LICENSE'
  | 'PASSKEY'
  | 'SECURE_MEDIA'
  | 'AUTHENTICATOR_2FA';

export interface VaultItemSummary {
  id: string;
  type: ItemType;
  title: string;
  subtitle?: string | null;
  folderId?: string | null;
  folderName?: string | null;
  isFavorite: boolean;
  updatedAt: number;
  lastUsedAt?: number | null;
  tags: string[];
  cardBrand?: string;
  maskedNumber?: string;
  bankName?: string;
  maskedAccountNumber?: string;
  username?: string;
  website?: string;
  mediaType?: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  fileName?: string;
  sizeBytes?: number;
}

export interface PickedMediaResult {
  uri: string;
  filePath?: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  mediaType: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
}

export interface VaultMediaInput {
  title: string;
  inputUri: string;
  fileName?: string;
  mimeType?: string;
  mediaType?: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  notes?: string;
  folderId?: string | null;
  isFavorite?: boolean;
  tags?: string[];
}

export interface DecryptedVaultMediaResult {
  fileUri: string;
  filePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  mediaType: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  notes?: string;
}

export interface BankAccountInput {
  title: string;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  routingNumber?: string;
  swiftBic?: string;
  iban?: string;
  accountType?: string;
  folderId?: string | null;
  isFavorite?: boolean;
  tags?: string[];
}

export interface CreditCardInput {
  title: string;
  cardholderName: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  cardBrand: string;
  pin?: string;
  cardType?: string;
  billingZip?: string;
  folderId?: string | null;
  isFavorite?: boolean;
  tags?: string[];
}

export interface EncryptedFileResult {
  outputFilePath: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  hint: string;
}

export interface DecryptedFileResult {
  outputFilePath: string;
  fileUri: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface AuthenticatorInput {
  title: string;
  issuer: string;
  accountName: string;
  secret: string; // Base32
  algorithm?: 'SHA1' | 'SHA256' | 'SHA512';
  digits?: number;
  period?: number;
  folderId?: string | null;
  isFavorite?: boolean;
  tags?: string[];
}

export interface TotpCodeResult {
  code: string;
  remainingSeconds: number;
  period: number;
  progress: number;
}

export interface Folder {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface SecurityAnalysis {
  score: number;
  totalItems: number;
  weakCount: number;
  reusedCount: number;
  oldCount: number;
  weakItemIds: string[];
  reusedItemIds: string[];
  oldItemIds: string[];
}

export type AppTheme = 'dark' | 'oled' | 'slate' | 'amethyst' | 'light';

export type Language =
  | 'en'
  | 'bn'
  | 'es'
  | 'fr'
  | 'de'
  | 'ar'
  | 'hi'
  | 'pt'
  | 'ru'
  | 'zh'
  | 'ja'
  | 'tr'
  | 'it'
  | 'ur'
  | 'id';

export interface AppSettings {
  autoLockSeconds: number;
  biometricEnabled: boolean;
  screenSecurity: boolean;
  clipboardClearSeconds: number;
  language: Language;
  theme: AppTheme;
  showWebsiteIcons?: boolean;
}

export interface AuditEvent {
  id: string;
  timestamp: number;
  eventType: string;
  details: string;
  isSuccess: boolean;
}

export interface PasswordGeneratorOptions {
  length: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
  excludeAmbiguous: boolean;
  avoidRepeat: boolean;
}

export interface PassphraseOptions {
  wordCount: number;
  separator: string;
  capitalize: boolean;
  includeNumber: boolean;
}

export interface GeneratedPasswordResult {
  password?: string;
  passphrase?: string;
  score: number;
  entropy: number;
  isWeak?: boolean;
}

export interface BackupPreview {
  formatVersion: number;
  timestamp: number;
  loginCount: number;
  noteCount: number;
  cardCount: number;
  bankCount?: number;
  mediaCount?: number;
  folderCount: number;
  tagCount: number;
  totalItems: number;
}

export interface PickedBackupResult {
  uri: string;
  fileName: string;
  fileSizeBytes: number;
}
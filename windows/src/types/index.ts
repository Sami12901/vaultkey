export type ItemType = 'LOGIN' | 'SECURE_NOTE' | 'CREDENTIAL_CARD' | 'BANK_ACCOUNT' | 'AUTHENTICATOR_2FA';

export interface VaultItemSummary {
  id: string;
  type: ItemType;
  title: string;
  subtitle?: string;
  folderId?: string | null;
  isFavorite: boolean;
  updatedAt: number;
  tags: string[];
  cardBrand?: string;
  maskedNumber?: string;
  bankName?: string;
  maskedAccountNumber?: string;
  username?: string;
  website?: string;
}

export interface Folder {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface AppSettings {
  autoLockSeconds: number;
  biometricEnabled: boolean;
  screenSecurity: boolean;
  clipboardClearSeconds: number;
  language: string;
  theme: string;
  showWebsiteIcons: boolean;
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
  insecureHttpCount?: number;
  insecureHttpItemIds?: string[];
  missing2faCount?: number;
  missing2faItemIds?: string[];
}

export interface BackupPreview {
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

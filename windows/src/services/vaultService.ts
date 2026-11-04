// Typed wrapper around window.vaultKeyApi provided by Electron preload script

const api = (window as any).vaultKeyApi;

export const vaultDesktop = {
  isInitialized: async (): Promise<boolean> => {
    return api ? api.isInitialized() : false;
  },

  getVaultState: async (): Promise<'UNINITIALIZED' | 'LOCKED' | 'UNLOCKED'> => {
    return api ? api.getVaultState() : 'UNINITIALIZED';
  },

  initializeVault: async (masterPassword: string): Promise<boolean> => {
    return api ? api.initializeVault(masterPassword) : false;
  },

  unlock: async (masterPassword: string): Promise<boolean> => {
    return api ? api.unlock(masterPassword) : false;
  },

  lock: async (): Promise<boolean> => {
    return api ? api.lock() : false;
  },

  resetVault: async (): Promise<boolean> => {
    return api ? api.resetVault() : false;
  },

  changeMasterPassword: async (currentPass: string, newPass: string): Promise<boolean> => {
    return api ? api.changeMasterPassword(currentPass, newPass) : false;
  },

  getItemSummaries: async (options?: any): Promise<any[]> => {
    return api ? api.getItemSummaries(options) : [];
  },

  getSecret: async (itemId: string, fieldName: string): Promise<string> => {
    return api ? api.getSecret(itemId, fieldName) : '';
  },

  saveLoginItem: async (data: any): Promise<string> => {
    return api ? api.saveLoginItem(data) : '';
  },

  saveSecureNote: async (data: any): Promise<string> => {
    return api ? api.saveSecureNote(data) : '';
  },

  saveCreditCard: async (data: any): Promise<string> => {
    return api ? api.saveCreditCard(data) : '';
  },

  saveBankAccount: async (data: any): Promise<string> => {
    return api ? api.saveBankAccount(data) : '';
  },

  saveAuthenticatorItem: async (data: any): Promise<string> => {
    return api ? api.saveAuthenticatorItem(data) : '';
  },

  getTotpCode: async (itemId: string): Promise<{ code: string; remainingSeconds: number; period: number; progress: number } | null> => {
    return api ? api.getTotpCode(itemId) : null;
  },

  toggleFavorite: async (itemId: string): Promise<boolean> => {
    return api ? api.toggleFavorite(itemId) : false;
  },

  deleteItem: async (itemId: string): Promise<boolean> => {
    return api ? api.deleteItem(itemId) : false;
  },

  getFolders: async (): Promise<any[]> => {
    return api ? api.getFolders() : [];
  },

  createFolder: async (name: string, color?: string, icon?: string): Promise<any> => {
    return api ? api.createFolder(name, color, icon) : null;
  },

  deleteFolder: async (folderId: string): Promise<boolean> => {
    return api ? api.deleteFolder(folderId) : false;
  },

  getTags: async (): Promise<any[]> => {
    return api ? api.getTags() : [];
  },

  getSettings: async (): Promise<any> => {
    return api ? api.getSettings() : null;
  },

  updateSettings: async (settings: any): Promise<boolean> => {
    return api ? api.updateSettings(settings) : false;
  },

  getSecurityAnalysis: async (): Promise<any> => {
    return api ? api.getSecurityAnalysis() : null;
  },

  getAuditEvents: async (): Promise<any[]> => {
    return api ? api.getAuditEvents() : [];
  },

  createEncryptedBackup: async (password: string): Promise<any> => {
    return api ? api.createEncryptedBackup(password) : null;
  },

  inspectBackup: async (filePath: string, password: string): Promise<any> => {
    return api ? api.inspectBackup(filePath, password) : null;
  },

  restoreBackup: async (filePath: string, password: string, mode: string): Promise<any> => {
    return api ? api.restoreBackup(filePath, password, mode) : null;
  },

  listBackupFiles: async (): Promise<any[]> => {
    return api ? api.listBackupFiles() : [];
  },

  pickBackupFile: async (): Promise<{ uri: string; fileName: string; fileSizeBytes: number } | null> => {
    return api ? api.pickBackupFile() : null;
  },

  saveBackupFileTo: async (srcPath: string): Promise<{ success: boolean; exportedPath?: string }> => {
    return api ? api.saveBackupFileTo(srcPath) : { success: false };
  },

  deleteBackupFile: async (filePath: string): Promise<boolean> => {
    return api ? api.deleteBackupFile(filePath) : false;
  },

  exportCredentialsJson: async (): Promise<string> => {
    return api ? api.exportCredentialsJson() : '';
  },

  importCredentialsJson: async (jsonStr: string): Promise<any> => {
    return api ? api.importCredentialsJson(jsonStr) : { importedCount: 0 };
  },

  copySecure: async (text: string, label?: string, timeoutSeconds?: number): Promise<{ message: string }> => {
    if (api && api.copySecure) {
      return api.copySecure(text, label, timeoutSeconds);
    }
    navigator.clipboard.writeText(text);
    return { message: 'Copied to clipboard' };
  },

  clearClipboard: async (): Promise<boolean> => {
    return api ? api.clearClipboard() : false;
  },

  getStartupSettings: async (): Promise<{ openAtLogin: boolean; openAsHidden: boolean }> => {
    return api && api.getStartupSettings ? api.getStartupSettings() : { openAtLogin: false, openAsHidden: false };
  },

  setStartupSettings: async (openAtLogin: boolean): Promise<boolean> => {
    return api && api.setStartupSettings ? api.setStartupSettings(openAtLogin) : false;
  },

  getBridgeToken: async (): Promise<string> => {
    return api && api.getBridgeToken ? api.getBridgeToken() : '';
  },

  regenerateBridgeToken: async (): Promise<string> => {
    return api && api.regenerateBridgeToken ? api.regenerateBridgeToken() : '';
  },

  hideWindow: async (): Promise<void> => {
    if (api && api.hideWindow) api.hideWindow();
  },

  showWindow: async (): Promise<void> => {
    if (api && api.showWindow) api.showWindow();
  },

  closeWindow: async (): Promise<void> => {
    if (api && api.closeWindow) api.closeWindow();
  },

  onVaultUpdated: (callback: () => void): (() => void) => {
    if (api && api.onVaultUpdated) {
      return api.onVaultUpdated(callback);
    }
    return () => {};
  },
};

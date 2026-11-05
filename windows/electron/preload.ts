import { contextBridge, ipcRenderer } from 'electron';

const vaultKeyApi = {
  // Vault lifecycle
  isInitialized: () => ipcRenderer.invoke('vault:isInitialized'),
  getVaultState: () => ipcRenderer.invoke('vault:getVaultState'),
  initializeVault: (masterPassword: string) => ipcRenderer.invoke('vault:initialize', masterPassword),
  unlock: (masterPassword: string) => ipcRenderer.invoke('vault:unlock', masterPassword),
  lock: () => ipcRenderer.invoke('vault:lock'),
  resetVault: () => ipcRenderer.invoke('vault:resetVault'),
  changeMasterPassword: (currentPass: string, newPass: string) => ipcRenderer.invoke('vault:changePassword', currentPass, newPass),

  // Items
  getItemSummaries: (options?: any) => ipcRenderer.invoke('vault:getItemSummaries', options),
  getSecret: (itemId: string, fieldName: string) => ipcRenderer.invoke('vault:getSecret', itemId, fieldName),
  saveLoginItem: (data: any) => ipcRenderer.invoke('vault:saveLoginItem', data),
  saveSecureNote: (data: any) => ipcRenderer.invoke('vault:saveSecureNote', data),
  saveCreditCard: (data: any) => ipcRenderer.invoke('vault:saveCreditCard', data),
  saveBankAccount: (data: any) => ipcRenderer.invoke('vault:saveBankAccount', data),
  saveAuthenticatorItem: (data: any) => ipcRenderer.invoke('vault:saveAuthenticatorItem', data),
  getTotpCode: (itemId: string) => ipcRenderer.invoke('vault:getTotpCode', itemId),
  toggleFavorite: (itemId: string) => ipcRenderer.invoke('vault:toggleFavorite', itemId),
  deleteItem: (itemId: string) => ipcRenderer.invoke('vault:deleteItem', itemId),

  // Folders & Tags
  getFolders: () => ipcRenderer.invoke('vault:getFolders'),
  createFolder: (name: string, color?: string, icon?: string) => ipcRenderer.invoke('vault:createFolder', name, color, icon),
  deleteFolder: (folderId: string) => ipcRenderer.invoke('vault:deleteFolder', folderId),
  getTags: () => ipcRenderer.invoke('vault:getTags'),

  // Settings & Security
  getSettings: () => ipcRenderer.invoke('vault:getSettings'),
  updateSettings: (settings: any) => ipcRenderer.invoke('vault:updateSettings', settings),
  getSecurityAnalysis: () => ipcRenderer.invoke('vault:getSecurityAnalysis'),
  getAuditEvents: () => ipcRenderer.invoke('vault:getAuditEvents'),

  // Backups (.vkb & JSON)
  createEncryptedBackup: (password: string) => ipcRenderer.invoke('backup:create', password),
  inspectBackup: (filePath: string, password: string) => ipcRenderer.invoke('backup:inspect', filePath, password),
  restoreBackup: (filePath: string, password: string, mode: string) => ipcRenderer.invoke('backup:restore', filePath, password, mode),
  listBackupFiles: () => ipcRenderer.invoke('backup:list'),
  pickBackupFile: () => ipcRenderer.invoke('backup:pickFile'),
  saveBackupFileTo: (srcPath: string) => ipcRenderer.invoke('backup:saveTo', srcPath),
  deleteBackupFile: (filePath: string) => ipcRenderer.invoke('backup:delete', filePath),
  exportCredentialsJson: () => ipcRenderer.invoke('backup:exportJson'),
  importCredentialsJson: (jsonStr: string) => ipcRenderer.invoke('backup:importJson', jsonStr),
  importCsv: (csvStr: string) => ipcRenderer.invoke('backup:importCsv', csvStr),

  // Clipboard
  copySecure: (text: string, label?: string, timeoutSeconds?: number) => ipcRenderer.invoke('clipboard:copy', text, label, timeoutSeconds),
  clearClipboard: () => ipcRenderer.invoke('clipboard:clear'),

  // Window Controls & Background
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  hideWindow: () => ipcRenderer.invoke('window:hide'),
  showWindow: () => ipcRenderer.invoke('window:show'),
  getStartupSettings: () => ipcRenderer.invoke('app:getStartupSettings'),
  setStartupSettings: (openAtLogin: boolean) => ipcRenderer.invoke('app:setStartupSettings', openAtLogin),

  // Browser Bridge Authentication
  getBridgeToken: () => ipcRenderer.invoke('bridge:getToken'),
  regenerateBridgeToken: () => ipcRenderer.invoke('bridge:regenerateToken'),

  onVaultUpdated: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('vault:updated', handler);
    return () => {
      ipcRenderer.removeListener('vault:updated', handler);
    };
  },
  onVaultLocked: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('vault:locked', handler);
    return () => {
      ipcRenderer.removeListener('vault:locked', handler);
    };
  },
};

contextBridge.exposeInMainWorld('vaultKeyApi', vaultKeyApi);

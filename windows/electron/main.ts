import { app, BrowserWindow, ipcMain, dialog, clipboard, Tray, Menu, nativeImage, NativeImage, powerMonitor } from 'electron';
import path from 'path';
import fs from 'fs';
import { VaultStorage } from './storage';
import { ExtensionBridge } from './extensionBridge';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let clipboardTimeoutId: NodeJS.Timeout | null = null;
let extensionBridge: ExtensionBridge | null = null;
let isQuitting = false;
let hasShownTrayBalloon = false;

const storage = new VaultStorage();

// Enforce single instance lock so multiple copies aren't opened
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (!mainWindow.isVisible()) {
        mainWindow.show();
      }
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });
}

function createWindow() {
  const iconPath = path.join(__dirname, '../assets/icon.png');
  const hasIcon = fs.existsSync(iconPath);

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'VaultKey - Zero-Knowledge Password Manager',
    backgroundColor: '#0F172A',
    icon: hasIcon ? iconPath : undefined,
    frame: true,
    show: false, // will show when ready or stay hidden if started with --hidden
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      backgroundThrottling: false, // keep timers and background bridge responsive
    },
  });

  // Enable OS-level screen capture & screen share protection (renders solid black screen on capture)
  const initialSettings = storage.getSettings();
  try {
    mainWindow.setContentProtection(initialSettings.screenSecurity !== false);
  } catch (err) {
    console.warn('Failed to set initial content protection:', err);
  }

  // Load renderer
  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    try {
      const currentSettings = storage.getSettings();
      mainWindow?.setContentProtection(currentSettings.screenSecurity !== false);
    } catch (err) {}

    const isHiddenStart = process.argv.includes('--hidden') || app.getLoginItemSettings().wasOpenedAsHidden;
    if (!isHiddenStart) {
      mainWindow?.show();
    }
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      const settings = storage.getSettings();
      // By default, run in background in tray
      if (settings.runInBackground !== false) {
        event.preventDefault();
        mainWindow?.hide();

        if (tray && !hasShownTrayBalloon) {
          hasShownTrayBalloon = true;
          try {
            tray.displayBalloon({
              title: 'VaultKey Protection Active',
              content: 'VaultKey is still running in the background. Passwords will continue to be auto-filled and saved in your browser.',
            });
          } catch (e) {}
        }
        return false;
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  try {
    const iconPath = path.join(__dirname, '../assets/icon.png');
    let icon: NativeImage;
    if (fs.existsSync(iconPath)) {
      icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
    } else {
      const canvas = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAZElEQVQ4T2NkoBAwUqifYdQAgpOB/j8DAwMTAwODAwPDf3wKGP6DGBiQxRmoaQAGBgaG/6RjFPUAww8GBob/5GMUNQAY0eF/fIZTDICpB+lGkGM41TAhR3/iDYBhjA6o5gBqAgDcfy/7J36YAAAAAElFTkSuQmCC',
        'base64'
      );
      icon = nativeImage.createFromBuffer(canvas);
    }

    tray = new Tray(icon);
    tray.setToolTip('VaultKey - Secure Password Manager (Active in Background)');

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open VaultKey',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          } else {
            createWindow();
          }
        },
      },
      {
        label: 'Lock Vault',
        click: () => {
          storage.lock();
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('vault:locked');
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Exit VaultKey',
        click: () => {
          isQuitting = true;
          storage.lock();
          if (extensionBridge) {
            extensionBridge.stop();
          }
          app.quit();
        },
      },
    ]);

    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      } else {
        createWindow();
      }
    });

    tray.on('double-click', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      } else {
        createWindow();
      }
    });
  } catch (e) {
    console.error('Failed to create tray:', e);
  }
}

app.whenReady().then(() => {
  createWindow();
  createTray();

  // Start local bridge for Chrome Extension
  try {
    extensionBridge = new ExtensionBridge(storage, () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('vault:updated');
      }
    });
    extensionBridge.start();
  } catch (err) {
    console.error('Failed to start ExtensionBridge:', err);
  }

  // System-wide idle detector for secure auto-locking in background
  setInterval(() => {
    try {
      const idleSecs = powerMonitor.getSystemIdleTime();
      const settings = storage.getSettings();
      const autoLockLimit = settings?.autoLockSeconds ?? 300;
      if (autoLockLimit > 0 && idleSecs >= autoLockLimit && storage.isUnlocked()) {
        storage.lock();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('vault:locked');
        }
      }
    } catch {}
  }, 10000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (isQuitting || process.platform === 'darwin') {
    if (extensionBridge) {
      extensionBridge.stop();
    }
    storage.lock();
    app.quit();
  }
});

// ---------------------------------------------------------
// IPC Handlers
// ---------------------------------------------------------

// Lifecycle
ipcMain.handle('vault:isInitialized', async () => storage.isInitialized());
ipcMain.handle('vault:getVaultState', async () => {
  if (!storage.isInitialized()) return 'UNINITIALIZED';
  return storage.isUnlocked() ? 'UNLOCKED' : 'LOCKED';
});
ipcMain.handle('vault:initialize', async (_, password) => storage.initializeVault(password));
ipcMain.handle('vault:unlock', async (_, password) => storage.unlock(password));
ipcMain.handle('vault:lock', async () => storage.lock());
ipcMain.handle('vault:resetVault', async () => storage.resetVault());
ipcMain.handle('vault:changePassword', async (_, currentPass, newPass) => storage.changeMasterPassword(currentPass, newPass));

// Item operations
ipcMain.handle('vault:getItemSummaries', async (_, options) => storage.getItemSummaries(options));
ipcMain.handle('vault:getSecret', async (_, itemId, fieldName) => storage.getSecret(itemId, fieldName));
ipcMain.handle('vault:saveLoginItem', async (_, data) => storage.saveLoginItem(data));
ipcMain.handle('vault:saveSecureNote', async (_, data) => storage.saveSecureNote(data));
ipcMain.handle('vault:saveCreditCard', async (_, data) => storage.saveCreditCard(data));
ipcMain.handle('vault:saveBankAccount', async (_, data) => storage.saveBankAccount(data));
ipcMain.handle('vault:toggleFavorite', async (_, itemId) => storage.toggleFavorite(itemId));
ipcMain.handle('vault:deleteItem', async (_, itemId) => storage.deleteItem(itemId));

// Folders & Tags
ipcMain.handle('vault:getFolders', async () => storage.getFolders());
ipcMain.handle('vault:createFolder', async (_, name, color, icon) => storage.createFolder(name, color, icon));
ipcMain.handle('vault:deleteFolder', async (_, folderId) => storage.deleteFolder(folderId));
ipcMain.handle('vault:getTags', async () => storage.getTags());

// Settings & Security
ipcMain.handle('vault:getSettings', async () => storage.getSettings());
ipcMain.handle('vault:updateSettings', async (_, settings) => {
  const ok = storage.updateSettings(settings);
  if (settings.screenSecurity !== undefined && mainWindow && !mainWindow.isDestroyed()) {
    try {
      mainWindow.setContentProtection(!!settings.screenSecurity);
    } catch (e) {
      console.warn('Failed to update content protection:', e);
    }
  }
  return ok;
});
ipcMain.handle('vault:getSecurityAnalysis', async () => storage.getSecurityAnalysis());
ipcMain.handle('vault:getAuditEvents', async () => storage.getAuditEvents());

// Backup & Restore
ipcMain.handle('backup:create', async (_, password) => storage.createEncryptedBackup(password));
ipcMain.handle('backup:inspect', async (_, filePath, password) => storage.inspectBackup(filePath, password));
ipcMain.handle('backup:restore', async (_, filePath, password, mode) => storage.restoreBackup(filePath, password, mode));
ipcMain.handle('backup:list', async () => storage.listBackupFiles());
ipcMain.handle('backup:delete', async (_, filePath) => {
  if (fs.existsSync(filePath)) {
    try {
      const zeros = Buffer.alloc(Math.min(fs.statSync(filePath).size, 1024 * 1024));
      fs.writeFileSync(filePath, zeros);
    } catch {}
    fs.unlinkSync(filePath);
  }
  return true;
});
ipcMain.handle('backup:exportJson', async () => storage.exportCredentialsJson());
ipcMain.handle('backup:importJson', async (_, jsonStr) => storage.importCredentialsJson(jsonStr));

// Native Windows File Dialogs
ipcMain.handle('backup:pickFile', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select VaultKey Backup File',
    filters: [
      { name: 'VaultKey Backup (*.vkb)', extensions: ['vkb'] },
      { name: 'JSON Backup (*.json)', extensions: ['json'] },
      { name: 'All Files (*.*)', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    const stat = fs.statSync(filePath);
    return {
      uri: filePath,
      fileName: path.basename(filePath),
      fileSizeBytes: stat.size,
    };
  }
  return null;
});

ipcMain.handle('backup:saveTo', async (_, srcPath) => {
  if (!mainWindow) return false;
  const defaultName = path.basename(srcPath);
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save VaultKey Backup Archive',
    defaultPath: path.join(app.getPath('downloads'), defaultName),
    filters: [
      { name: 'VaultKey Backup (*.vkb)', extensions: ['vkb'] },
      { name: 'All Files (*.*)', extensions: ['*'] },
    ],
  });

  if (!result.canceled && result.filePath) {
    fs.copyFileSync(srcPath, result.filePath);
    return { success: true, exportedPath: result.filePath };
  }
  return { success: false };
});

// Clipboard with auto-clear
ipcMain.handle('clipboard:copy', async (_, text, label = 'VaultKey', timeoutSeconds = 30) => {
  clipboard.writeText(text);

  if (clipboardTimeoutId) {
    clearTimeout(clipboardTimeoutId);
    clipboardTimeoutId = null;
  }

  const timeoutMs = (timeoutSeconds > 0 ? timeoutSeconds : 30) * 1000;
  clipboardTimeoutId = setTimeout(() => {
    try {
      if (clipboard.readText() === text) {
        clipboard.clear();
      }
    } catch {}
    clipboardTimeoutId = null;
  }, timeoutMs);

  return { message: `Copied to clipboard. Will be auto-cleared in ${timeoutSeconds}s.` };
});

ipcMain.handle('clipboard:clear', async () => {
  if (clipboardTimeoutId) {
    clearTimeout(clipboardTimeoutId);
    clipboardTimeoutId = null;
  }
  clipboard.clear();
  return true;
});

// Window controls & background running
ipcMain.handle('window:minimize', () => mainWindow?.minimize());
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.handle('window:close', () => {
  const settings = storage.getSettings();
  if (settings.runInBackground !== false) {
    mainWindow?.hide();
  } else {
    isQuitting = true;
    mainWindow?.close();
  }
});
ipcMain.handle('window:hide', () => mainWindow?.hide());
ipcMain.handle('window:show', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  } else {
    createWindow();
  }
});

// Windows Startup / Login Settings
ipcMain.handle('app:getStartupSettings', async () => {
  const settings = app.getLoginItemSettings();
  return {
    openAtLogin: settings.openAtLogin,
    openAsHidden: settings.openAsHidden,
  };
});

ipcMain.handle('app:setStartupSettings', async (_, openAtLogin: boolean) => {
  app.setLoginItemSettings({
    openAtLogin,
    openAsHidden: true,
    args: ['--hidden'],
  });
  storage.updateSettings({ startAtLogin: openAtLogin });
  return true;
});

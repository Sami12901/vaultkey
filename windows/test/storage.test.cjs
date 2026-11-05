const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Mock electron safeStorage before importing storage
const electronPath = require.resolve('electron');
require.cache[electronPath] = {
  id: electronPath,
  filename: electronPath,
  loaded: true,
  exports: {
    safeStorage: {
      isEncryptionAvailable: () => false,
      encryptString: (str) => Buffer.from(str, 'utf8'),
      decryptString: (buf) => buf.toString('utf8'),
    },
  },
};

const { VaultStorage } = require('../dist-electron/storage.js');

describe('Windows Desktop VaultStorage Engine', () => {
  let tempDir;
  let originalAppData;

  beforeEach(() => {
    originalAppData = process.env.APPDATA;
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vaultkey-storage-test-'));
    process.env.APPDATA = tempDir;
  });

  afterEach(() => {
    process.env.APPDATA = originalAppData;
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch {
      // Ignore cleanup error
    }
  });

  it('reports uninitialized state for empty storage directory', () => {
    const storage = new VaultStorage();
    assert.equal(storage.isInitialized(), false);
    assert.equal(storage.isUnlocked(), false);
  });

  it('initializes vault with master password and writes encrypted files', () => {
    const storage = new VaultStorage();
    const initSuccess = storage.initializeVault('CorrectMasterPassword2026!');
    assert.equal(initSuccess, true);
    assert.equal(storage.isInitialized(), true);

    const configFile = path.join(tempDir, 'VaultKey', 'config.json');
    const vaultFile = path.join(tempDir, 'VaultKey', 'vault_data.enc');

    assert.ok(fs.existsSync(configFile));
    assert.ok(fs.existsSync(vaultFile));

    const configData = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    assert.ok(configData.salt);
    assert.ok(configData.verifier);
  });

  it('unlocks with correct password and rejects incorrect password', () => {
    const storage = new VaultStorage();
    storage.initializeVault('SecretPassword123!');
    storage.lock();

    assert.equal(storage.isUnlocked(), false);

    // Rejection on wrong password
    const unlockWrong = storage.unlock('WrongPassword');
    assert.equal(unlockWrong, false);
    assert.equal(storage.isUnlocked(), false);

    // Success on correct password
    const unlockCorrect = storage.unlock('SecretPassword123!');
    assert.equal(unlockCorrect, true);
    assert.equal(storage.isUnlocked(), true);
  });

  it('performs CRUD operations and persists items encrypted at rest', () => {
    const storage = new VaultStorage();
    storage.initializeVault('MasterPass123!');
    assert.equal(storage.unlock('MasterPass123!'), true);

    // Create item
    const newItem = {
      title: 'GitHub Work Account',
      username: 'dev_octocat',
      password: 'token_secret_123',
      website: 'https://github.com',
      notes: 'Work engineering credentials',
      isFavorite: true,
    };

    const savedId = storage.saveLoginItem(newItem);
    assert.ok(savedId);

    // Retrieve item secret
    const pass = storage.getSecret(savedId, 'password');
    assert.equal(pass, 'token_secret_123');

    // Query items with category/type filter
    const loginItems = storage.getItemSummaries({ type: 'LOGIN' });
    assert.ok(loginItems.some(i => i.id === savedId && i.title === 'GitHub Work Account'));

    const noteItems = storage.getItemSummaries({ type: 'SECURE_NOTE' });
    assert.equal(noteItems.some(i => i.id === savedId), false);

    // Update item
    storage.saveLoginItem({
      id: savedId,
      title: 'GitHub Enterprise Account',
      username: 'dev_octocat',
      password: 'token_secret_123_updated',
    });
    const updatedSummaries = storage.getItemSummaries({ type: 'LOGIN' });
    const updatedItem = updatedSummaries.find(i => i.id === savedId);
    assert.ok(updatedItem);
    assert.equal(updatedItem.title, 'GitHub Enterprise Account');
    assert.equal(storage.getSecret(savedId, 'password'), 'token_secret_123_updated');

    // Delete item
    const deleteSuccess = storage.deleteItem(savedId);
    assert.equal(deleteSuccess, true);
    const postDeleteSummaries = storage.getItemSummaries({ type: 'LOGIN' });
    assert.equal(postDeleteSummaries.some(i => i.id === savedId), false);
  });

  it('atomically resets vault by removing encrypted files', () => {
    const storage = new VaultStorage();
    storage.initializeVault('MasterPass123!');
    assert.equal(storage.isInitialized(), true);

    const resetSuccess = storage.resetVault();
    assert.equal(resetSuccess, true);
    assert.equal(storage.isInitialized(), false);
    assert.equal(storage.isUnlocked(), false);
  });
});

import React, { useState, useEffect } from 'react';
import { useTheme } from '../theme';
import { useTranslation } from '../i18n';
import { FolderIcon, ShieldIcon, CheckIcon, CopyIcon, RefreshIcon } from './Icons';
import { vaultDesktop } from '../services/vaultService';
import { BackupPreview } from '../types';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshVault: () => void;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  isOpen,
  onClose,
  onRefreshVault,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<'BACKUP' | 'RESTORE' | 'JSON'>('BACKUP');

  // Backup state
  const [backupPassword, setBackupPassword] = useState<string>('');
  const [lastBackup, setLastBackup] = useState<{ path: string; name: string; size: number } | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Restore state
  const [selectedFile, setSelectedFile] = useState<{ uri: string; fileName: string; size: number } | null>(null);
  const [restorePassword, setRestorePassword] = useState<string>('');
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [isInspecting, setIsInspecting] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);

  // JSON state
  const [jsonInput, setJsonInput] = useState<string>('');
  const [jsonMessage, setJsonMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreateBackup = async () => {
    if (!backupPassword || backupPassword.length < 8) {
      alert('Please enter a password with at least 8 characters');
      return;
    }

    setIsExporting(true);
    try {
      const res = await vaultDesktop.createEncryptedBackup(backupPassword);
      setLastBackup({ path: res.filePath, name: res.fileName, size: res.fileSizeBytes });
      setBackupPassword('');
    } catch (e: any) {
      alert(e?.message || 'Failed to create backup');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveBackupTo = async () => {
    if (!lastBackup) return;
    try {
      const res = await vaultDesktop.saveBackupFileTo(lastBackup.path);
      if (res.success) {
        alert(`Saved successfully to:\n${res.exportedPath}`);
      }
    } catch (e: any) {
      alert(e?.message || 'Failed to save backup file');
    }
  };

  const handlePickFile = async () => {
    try {
      const res = await vaultDesktop.pickBackupFile();
      if (res && res.uri) {
        setSelectedFile({ uri: res.uri, fileName: res.fileName, size: res.fileSizeBytes });
        setPreview(null);
        setRestoreMessage(null);
      }
    } catch (e: any) {
      alert(e?.message || 'Failed to select file');
    }
  };

  const handleInspect = async () => {
    if (!selectedFile) {
      alert('Please pick a backup file first');
      return;
    }
    if (!restorePassword) {
      alert('Please enter the backup decryption password');
      return;
    }

    setIsInspecting(true);
    setRestoreMessage(null);
    try {
      const prev = await vaultDesktop.inspectBackup(selectedFile.uri, restorePassword);
      setPreview(prev);
    } catch (e: any) {
      alert(e?.message || 'Inspection failed. Incorrect password or invalid archive.');
    } finally {
      setIsInspecting(false);
    }
  };

  const handleRestore = async (mode: 'MERGE' | 'REPLACE') => {
    if (!selectedFile || !restorePassword) return;

    if (mode === 'REPLACE') {
      if (!window.confirm('REPLACE mode will delete all current credentials in this vault and replace them with the backup. Continue?')) {
        return;
      }
    }

    setIsRestoring(true);
    try {
      const res = await vaultDesktop.restoreBackup(selectedFile.uri, restorePassword, mode);
      setRestoreMessage(`Successfully restored ${res.restoredCount} credentials (${mode} mode)`);
      onRefreshVault();
      setPreview(null);
      setRestorePassword('');
    } catch (e: any) {
      alert(e?.message || 'Restore failed');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleExportJson = async () => {
    try {
      const jsonStr = await vaultDesktop.exportCredentialsJson();
      await vaultDesktop.copySecure(jsonStr, 'VaultKey_JSON', 60);
      alert('Unencrypted credentials JSON has been copied to your clipboard (auto-cleared in 60s).');
    } catch (e: any) {
      alert(e?.message || 'Failed to export JSON');
    }
  };

  const handleImportJson = async () => {
    if (!jsonInput.trim()) {
      alert('Please paste valid JSON');
      return;
    }
    try {
      const res = await vaultDesktop.importCredentialsJson(jsonInput.trim());
      setJsonMessage(`Successfully imported ${res.importedCount} credentials!`);
      setJsonInput('');
      onRefreshVault();
    } catch (e: any) {
      alert(e?.message || 'Failed to import JSON');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: '16px',
          width: '640px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          color: colors.text,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: `1px solid ${colors.border}` }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>{t('backup')}</h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: colors.textMuted,
              fontSize: '20px',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab Buttons */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${colors.border}`, background: colors.cardSecondary }}>
          <button
            onClick={() => setActiveTab('BACKUP')}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              background: 'transparent',
              color: activeTab === 'BACKUP' ? colors.primary : colors.textSecondary,
              fontWeight: activeTab === 'BACKUP' ? 600 : 400,
              borderBottom: `2px solid ${activeTab === 'BACKUP' ? colors.primary : 'transparent'}`,
              cursor: 'pointer',
            }}
          >
            Create Backup (.vkb)
          </button>
          <button
            onClick={() => setActiveTab('RESTORE')}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              background: 'transparent',
              color: activeTab === 'RESTORE' ? colors.primary : colors.textSecondary,
              fontWeight: activeTab === 'RESTORE' ? 600 : 400,
              borderBottom: `2px solid ${activeTab === 'RESTORE' ? colors.primary : 'transparent'}`,
              cursor: 'pointer',
            }}
          >
            Restore Archive
          </button>
          <button
            onClick={() => setActiveTab('JSON')}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              background: 'transparent',
              color: activeTab === 'JSON' ? colors.primary : colors.textSecondary,
              fontWeight: activeTab === 'JSON' ? 600 : 400,
              borderBottom: `2px solid ${activeTab === 'JSON' ? colors.primary : 'transparent'}`,
              cursor: 'pointer',
            }}
          >
            JSON Tools
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {activeTab === 'BACKUP' ? (
            <div>
              <p style={{ fontSize: '13px', color: colors.textSecondary, marginBottom: '16px', lineHeight: '20px' }}>
                Create a cross-platform Argon2id + AES-256-GCM zero-knowledge encrypted binary archive (.vkb). This file can be restored on Windows or transferred to Android VaultKey.
              </p>

              <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', fontWeight: 600 }}>
                Archive Decryption Password (min 8 characters)
              </label>
              <input
                type="password"
                value={backupPassword}
                onChange={(e) => setBackupPassword(e.target.value)}
                placeholder="Enter strong backup password..."
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.background,
                  color: colors.text,
                  marginBottom: '16px',
                  outline: 'none',
                }}
              />

              <button
                onClick={handleCreateBackup}
                disabled={isExporting}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: colors.primary,
                  color: '#FFFFFF',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {isExporting ? 'Creating Encrypted Container...' : 'Create Backup Archive (.vkb)'}
              </button>

              {lastBackup && (
                <div
                  style={{
                    marginTop: '20px',
                    padding: '16px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.primary}`,
                    backgroundColor: colors.cardSecondary,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: colors.primary, fontWeight: 'bold', marginBottom: '4px' }}>
                    <CheckIcon size={18} /> Backup Created Successfully
                  </div>
                  <div style={{ fontSize: '13px', fontFamily: 'monospace', margin: '4px 0' }}>{lastBackup.name}</div>
                  <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '12px' }}>
                    {(lastBackup.size / 1024).toFixed(1)} KB • AES-256-GCM
                  </div>

                  <button
                    onClick={handleSaveBackupTo}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: `1px solid ${colors.border}`,
                      background: colors.cardElevated,
                      color: colors.text,
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    Save File As / Export to Folder...
                  </button>
                </div>
              )}
            </div>
          ) : activeTab === 'RESTORE' ? (
            <div>
              <p style={{ fontSize: '13px', color: colors.textSecondary, marginBottom: '16px', lineHeight: '20px' }}>
                Select a VaultKey `.vkb` backup file created on Windows or Android to restore credentials.
              </p>

              {/* Native File Pick Button */}
              <button
                onClick={handlePickFile}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '8px',
                  border: `1px dashed ${colors.primary}`,
                  background: colors.primaryMuted,
                  color: colors.primary,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginBottom: '16px',
                }}
              >
                <FolderIcon size={20} color={colors.primary} />
                {selectedFile ? `Selected: ${selectedFile.fileName}` : 'Browse & Pick Backup File (.vkb)'}
              </button>

              {selectedFile && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', fontWeight: 600 }}>
                    Archive Password
                  </label>
                  <input
                    type="password"
                    value={restorePassword}
                    onChange={(e) => setRestorePassword(e.target.value)}
                    placeholder="Enter password used when creating backup..."
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`,
                      backgroundColor: colors.background,
                      color: colors.text,
                      marginBottom: '12px',
                      outline: 'none',
                    }}
                  />

                  <button
                    onClick={handleInspect}
                    disabled={isInspecting}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`,
                      background: colors.cardElevated,
                      color: colors.text,
                      cursor: 'pointer',
                      fontWeight: 600,
                      marginBottom: '16px',
                    }}
                  >
                    {isInspecting ? 'Decrypting & Inspecting...' : 'Inspect Archive Contents'}
                  </button>
                </div>
              )}

              {preview && (
                <div
                  style={{
                    padding: '16px',
                    borderRadius: '10px',
                    border: `1px solid ${colors.border}`,
                    backgroundColor: colors.cardSecondary,
                    marginBottom: '16px',
                  }}
                >
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: colors.primary, marginBottom: '12px' }}>
                    Archive Validated (v{preview.formatVersion})
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', textAlign: 'center', marginBottom: '16px' }}>
                    <div style={{ background: colors.background, padding: '8px', borderRadius: '6px' }}>
                      <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{preview.loginCount}</div>
                      <div style={{ fontSize: '11px', color: colors.textMuted }}>Logins</div>
                    </div>
                    <div style={{ background: colors.background, padding: '8px', borderRadius: '6px' }}>
                      <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{preview.cardCount}</div>
                      <div style={{ fontSize: '11px', color: colors.textMuted }}>Cards</div>
                    </div>
                    <div style={{ background: colors.background, padding: '8px', borderRadius: '6px' }}>
                      <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{preview.bankCount}</div>
                      <div style={{ fontSize: '11px', color: colors.textMuted }}>Bank</div>
                    </div>
                    <div style={{ background: colors.background, padding: '8px', borderRadius: '6px' }}>
                      <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{preview.noteCount}</div>
                      <div style={{ fontSize: '11px', color: colors.textMuted }}>Notes</div>
                    </div>
                    <div style={{ background: colors.background, padding: '8px', borderRadius: '6px' }}>
                      <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{preview.totalItems}</div>
                      <div style={{ fontSize: '11px', color: colors.textMuted }}>Total</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={() => handleRestore('MERGE')}
                      disabled={isRestoring}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '8px',
                        border: 'none',
                        background: colors.primary,
                        color: '#FFFFFF',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Merge into Vault
                    </button>
                    <button
                      onClick={() => handleRestore('REPLACE')}
                      disabled={isRestoring}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '8px',
                        border: 'none',
                        background: colors.danger,
                        color: '#FFFFFF',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Replace All
                    </button>
                  </div>
                </div>
              )}

              {restoreMessage && (
                <div style={{ padding: '12px', background: colors.primaryMuted, color: colors.primary, borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}>
                  {restoreMessage}
                </div>
              )}
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '13px', color: colors.textSecondary, marginBottom: '16px', lineHeight: '20px' }}>
                Export your unencrypted credentials as standard JSON or import from Bitwarden / 1Password / VaultKey exports.
              </p>

              <button
                onClick={handleExportJson}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  background: colors.cardSecondary,
                  color: colors.text,
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginBottom: '20px',
                }}
              >
                Export Vault JSON (Copies to Clipboard)
              </button>

              <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', fontWeight: 600 }}>
                Import Credentials JSON
              </label>
              <textarea
                rows={5}
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder='{"items": [{"title": "...", "login": {...}}]}'
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.background,
                  color: colors.text,
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  marginBottom: '12px',
                  outline: 'none',
                }}
              />

              <button
                onClick={handleImportJson}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: colors.primary,
                  color: '#FFFFFF',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Import JSON
              </button>

              {jsonMessage && (
                <div style={{ marginTop: '12px', color: colors.primary, fontSize: '13px', fontWeight: 600 }}>
                  {jsonMessage}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

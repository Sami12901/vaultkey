import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ToastAndroid,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { radius, typography, spacing, useTheme } from '../../theme';
import { Header } from '../../components/common/Header';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import {
  BackupIcon,
  ShieldIcon,
  ShareIcon,
  DeleteIcon,
  RefreshIcon,
  CheckIcon,
  FolderIcon,
  NotesIcon,
  LockIcon,
} from '../../components/icons';
import { backupNative, vaultNative } from '../../services/nativeBridge';
import { useVaultStore } from '../../stores/vaultStore';
import { useTranslation } from '../../i18n';
import { BackupPreview } from '../../types';
import { detectAndParseCsv } from '../../utils/csvImporter';

interface BackupRestoreScreenProps {
  onBack: () => void;
}

interface BackupFileItem {
  fileName: string;
  filePath: string;
  fileSizeBytes: number;
  lastModified: number;
}

export const BackupRestoreScreen: React.FC<BackupRestoreScreenProps> = ({
  onBack,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { refreshVaultData } = useVaultStore();

  const [activeTab, setActiveTab] = useState<'BACKUP' | 'RESTORE' | 'JSON_SYNC' | 'CSV_IMPORT'>('BACKUP');

  // Backup creation state
  const [backupPassword, setBackupPassword] = useState('');
  const [lastBackup, setLastBackup] = useState<{ path: string; name: string; size: number } | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Restore state
  const [backupsList, setBackupsList] = useState<BackupFileItem[]>([]);
  const [selectedBackup, setSelectedBackup] = useState<BackupFileItem | null>(null);
  const [customPath, setCustomPath] = useState('');
  const [restorePassword, setRestorePassword] = useState('');
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isPickingFile, setIsPickingFile] = useState(false);

  // JSON Export / Import state
  const [jsonInput, setJsonInput] = useState('');
  const [isExportingJson, setIsExportingJson] = useState(false);
  const [isImportingJson, setIsImportingJson] = useState(false);

  // CSV Import state
  const [csvInput, setCsvInput] = useState('');
  const [isImportingCsv, setIsImportingCsv] = useState(false);

  const loadBackups = async () => {
    try {
      const list = await backupNative.listBackupFiles();
      setBackupsList(list);
      if (list.length > 0 && !selectedBackup && !customPath) {
        setSelectedBackup(list[0]);
      }
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    loadBackups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateBackup = async () => {
    if (!backupPassword || backupPassword.length < 8) {
      Alert.alert(t('error'), 'Please provide a backup password of at least 8 characters');
      return;
    }

    setIsExporting(true);
    try {
      const res = await backupNative.createEncryptedBackup(backupPassword);
      setLastBackup({ path: res.filePath, name: res.fileName, size: res.fileSizeBytes });
      ToastAndroid.show('Encrypted backup created successfully', ToastAndroid.LONG);
      setBackupPassword('');
      await loadBackups();
    } catch (e: any) {
      Alert.alert(t('error'), e?.message || 'Failed to create backup');
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareFile = async (filePath: string) => {
    try {
      await backupNative.shareBackupFile(filePath);
    } catch (e: any) {
      Alert.alert('Share Error', e?.message || 'Failed to share backup file');
    }
  };

  const handleExportToDownloads = async (filePath: string) => {
    try {
      const res = await backupNative.exportBackupToDownloads(filePath);
      ToastAndroid.show(`Saved to Downloads/VaultKey/${res.fileName}`, ToastAndroid.LONG);
      Alert.alert('Saved to Downloads', `Archive saved to Downloads/VaultKey/${res.fileName}`);
    } catch (e: any) {
      Alert.alert('Export Error', e?.message || 'Failed to export to Downloads');
    }
  };

  const handleDeleteBackup = (file: BackupFileItem) => {
    Alert.alert(
      'Delete Backup Archive',
      `Are you sure you want to securely shred and delete ${file.fileName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await backupNative.deleteBackupFile(file.filePath);
              if (selectedBackup?.filePath === file.filePath) {
                setSelectedBackup(null);
                setPreview(null);
              }
              await loadBackups();
              ToastAndroid.show('Backup archive deleted', ToastAndroid.SHORT);
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Delete failed');
            }
          },
        },
      ]
    );
  };

  const handlePickExternalBackup = async () => {
    setIsPickingFile(true);
    try {
      const res = await backupNative.pickBackupFile();
      if (res && res.uri) {
        const item: BackupFileItem = {
          fileName: res.fileName,
          filePath: res.uri,
          fileSizeBytes: res.fileSizeBytes,
          lastModified: Date.now(),
        };
        setSelectedBackup(item);
        setCustomPath(res.uri);
        setPreview(null);
        ToastAndroid.show(`Selected: ${res.fileName}`, ToastAndroid.SHORT);
      }
    } catch (e: any) {
      if (e?.code !== 'ERR_CANCELLED') {
        Alert.alert('File Selection', e?.message || 'Failed to pick backup file');
      }
    } finally {
      setIsPickingFile(false);
    }
  };

  const activeRestorePath = selectedBackup ? selectedBackup.filePath : customPath.trim();

  const handleInspect = async () => {
    if (!activeRestorePath) {
      Alert.alert(t('error'), 'Please pick or select a backup file first');
      return;
    }
    if (!restorePassword) {
      Alert.alert(t('error'), 'Please enter the archive decryption password');
      return;
    }

    setIsInspecting(true);
    try {
      const prev = await backupNative.inspectBackup(activeRestorePath, restorePassword);
      setPreview(prev);
    } catch (e: any) {
      Alert.alert(t('error'), e?.message || 'Inspection failed. Incorrect password or invalid archive.');
    } finally {
      setIsInspecting(false);
    }
  };

  const handleRestore = async (mode: 'MERGE' | 'REPLACE') => {
    const isReplace = mode === 'REPLACE';
    const confirmMessage = isReplace
      ? 'REPLACE mode will remove all current credentials in the vault and replace them with the backup archive. Are you sure?'
      : `MERGE mode will add all credentials from this archive to your vault. Continue?`;

    Alert.alert(
      isReplace ? 'Confirm Vault Replace' : 'Confirm Vault Merge',
      confirmMessage,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isReplace ? 'Replace All' : 'Merge',
          style: isReplace ? 'destructive' : 'default',
          onPress: async () => {
            setIsRestoring(true);
            try {
              const res = await backupNative.restoreBackup(activeRestorePath, restorePassword, mode);
              ToastAndroid.show(t('restoreSuccess'), ToastAndroid.SHORT);
              Alert.alert(
                t('success'),
                `Successfully restored ${res.restoredCount} credentials (${mode} mode)`
              );
              await refreshVaultData();
              setPreview(null);
              setRestorePassword('');
            } catch (e: any) {
              Alert.alert(t('error'), e?.message || 'Restore failed');
            } finally {
              setIsRestoring(false);
            }
          },
        },
      ]
    );
  };

  const handleExportJson = async () => {
    setIsExportingJson(true);
    try {
      const exportPassword = backupPassword && backupPassword.length >= 8
        ? backupPassword
        : 'VaultKey-SecureExport-' + Math.floor(100000 + Math.random() * 900000);
      const res = await backupNative.createEncryptedBackup(exportPassword);
      await backupNative.shareBackupFile(res.filePath);
      ToastAndroid.show('Encrypted backup created and shared securely', ToastAndroid.LONG);
      Alert.alert(
        'Encrypted Backup Shared',
        `Your vault has been exported as a zero-knowledge encrypted archive (${res.fileName}) and shared securely without clipboard exposure.\n\nDecryption password: ${exportPassword}`
      );
    } catch (e: any) {
      Alert.alert('Export Error', e?.message || 'Failed to create and share encrypted backup');
    } finally {
      setIsExportingJson(false);
    }
  };

  const handleImportJson = async () => {
    if (!jsonInput.trim()) {
      Alert.alert('Import Error', 'Please paste valid credentials JSON');
      return;
    }

    setIsImportingJson(true);
    try {
      const res = await backupNative.importCredentialsJson(jsonInput.trim());
      ToastAndroid.show(`Imported ${res.importedCount} items`, ToastAndroid.SHORT);
      Alert.alert(t('success'), `Successfully imported ${res.importedCount} credentials into the vault`);
      setJsonInput('');
      await refreshVaultData();
    } catch (e: any) {
      Alert.alert('Import Error', e?.message || 'Failed to parse and import JSON');
    } finally {
      setIsImportingJson(false);
    }
  };

  const handleImportCsv = async () => {
    if (!csvInput.trim()) {
      Alert.alert('Import Error', 'Please paste CSV export content to import');
      return;
    }
    setIsImportingCsv(true);
    try {
      const res = detectAndParseCsv(csvInput.trim());
      if (res.items.length === 0) {
        Alert.alert('CSV Parse Error', res.errors.join('\n') || 'No valid credentials found in CSV');
        return;
      }

      let count = 0;
      for (const item of res.items) {
        const urlsJson = item.url ? JSON.stringify([item.url]) : '[]';
        await vaultNative.saveLoginItem({
          title: item.title,
          username: item.username,
          password: item.password,
          urls: urlsJson,
          notes: item.notes,
          isFavorite: item.isFavorite,
        });
        count++;

        if (item.totpSecret) {
          try {
            await vaultNative.saveAuthenticatorItem({
              title: `${item.title} 2FA`,
              issuer: item.title,
              accountName: item.username,
              secret: item.totpSecret,
            });
          } catch {
            // Ignored if invalid
          }
        }
      }

      ToastAndroid.show(`Imported ${count} items from ${res.format} CSV`, ToastAndroid.SHORT);
      Alert.alert(
        t('success'),
        `Successfully imported ${count} credentials from ${res.format} CSV format into your vault!`
      );
      setCsvInput('');
      await refreshVaultData();
    } catch (e: any) {
      Alert.alert('CSV Import Error', e?.message || 'Failed to import CSV');
    } finally {
      setIsImportingCsv(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title={t('backupTitle')} onBack={onBack} />

      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: colors.cardSecondary, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'BACKUP' && { borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab('BACKUP')}
        >
          <Text style={[styles.tabText, { color: colors.textSecondary }, activeTab === 'BACKUP' && { color: colors.primary, fontWeight: '700' }]}>
            Create Backup
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'RESTORE' && { borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab('RESTORE')}
        >
          <Text style={[styles.tabText, { color: colors.textSecondary }, activeTab === 'RESTORE' && { color: colors.primary, fontWeight: '700' }]}>
            Restore ({backupsList.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'JSON_SYNC' && { borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab('JSON_SYNC')}
        >
          <Text style={[styles.tabText, { color: colors.textSecondary }, activeTab === 'JSON_SYNC' && { color: colors.primary, fontWeight: '700' }]}>
            JSON Tools
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'CSV_IMPORT' && { borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab('CSV_IMPORT')}
        >
          <Text style={[styles.tabText, { color: colors.textSecondary }, activeTab === 'CSV_IMPORT' && { color: colors.primary, fontWeight: '700' }]}>
            CSV Import
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={[styles.content, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {activeTab === 'BACKUP' ? (
          <>
            {/* Create Backup Card */}
            <Card style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.sectionHeader}>
                <BackupIcon size={24} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('createBackupBtn')}</Text>
              </View>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                Create an Argon2id + AES-256-GCM zero-knowledge encrypted archive (.vkb) containing all your logins, bank accounts, cards, notes, media metadata, and folders.
              </Text>

              <Input
                label={t('backupPasswordPrompt')}
                value={backupPassword}
                onChangeText={setBackupPassword}
                placeholder="Enter at least 8 characters"
                isPassword
              />

              <Button
                title="Create Encrypted Archive (.vkb)"
                onPress={handleCreateBackup}
                loading={isExporting}
                icon={<ShieldIcon size={18} color={colors.white} />}
                style={styles.actionBtn}
              />

              {/* Just Created Banner */}
              {lastBackup ? (
                <View style={[styles.createdBox, { backgroundColor: colors.cardSecondary, borderColor: colors.primary }]}>
                  <View style={styles.createdHeader}>
                    <CheckIcon size={20} color={colors.primary} />
                    <Text style={[styles.createdTitle, { color: colors.primary }]}>Backup Archive Created</Text>
                  </View>
                  <Text style={[styles.createdName, { color: colors.text }]}>{lastBackup.name}</Text>
                  <Text style={[styles.createdSize, { color: colors.textMuted }]}>
                    {(lastBackup.size / 1024).toFixed(1)} KB • Encrypted with Argon2id + AES-256-GCM
                  </Text>

                  <View style={styles.createdActionRow}>
                    <Button
                      title="Share / Send..."
                      variant="secondary"
                      onPress={() => handleShareFile(lastBackup.path)}
                      style={styles.halfBtn}
                      icon={<ShareIcon size={16} color={colors.primary} />}
                    />
                    <Button
                      title="Save to Downloads"
                      variant="secondary"
                      onPress={() => handleExportToDownloads(lastBackup.path)}
                      style={styles.halfBtn}
                    />
                  </View>
                </View>
              ) : null}
            </Card>

            {/* Security Guarantee */}
            <Card style={[styles.cardSecondary, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
              <Text style={[styles.guaranteeTitle, { color: colors.primary }]}>Zero-Knowledge Container Spec (v2)</Text>
              <Text style={[styles.guaranteeDesc, { color: colors.textSecondary }]}>
                VaultKey .vkb binary containers protect all items with memory-hard Argon2id key derivation and AES-256-GCM authenticated encryption. Your data is completely safe to store on cloud drives, USB flash drives, or external memory cards.
              </Text>
            </Card>
          </>
        ) : activeTab === 'RESTORE' ? (
          <>
            {/* Pick File from Storage Card */}
            <Card style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.sectionHeader}>
                <FolderIcon size={22} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>External Archive Picker</Text>
              </View>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                Browse and select a .vkb backup file from your phone's Downloads, Google Drive, SD Card, or any folder.
              </Text>

              <Button
                title="Browse & Pick Backup File (.vkb)"
                variant="outline"
                onPress={handlePickExternalBackup}
                loading={isPickingFile}
                icon={<FolderIcon size={18} color={colors.primary} />}
                style={styles.actionBtn}
              />

              {/* Selected File Banner */}
              {selectedBackup ? (
                <View style={[styles.selectedFileBox, { backgroundColor: colors.cardSecondary, borderColor: colors.primary }]}>
                  <View style={styles.selectedFileHeader}>
                    <View style={styles.selectedFileTitleRow}>
                      <BackupIcon size={18} color={colors.primary} />
                      <Text style={[styles.selectedFileName, { color: colors.text }]} numberOfLines={1}>
                        {selectedBackup.fileName}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => {
                      setSelectedBackup(null);
                      setCustomPath('');
                      setPreview(null);
                    }}>
                      <Text style={[styles.clearBtnText, { color: colors.danger }]}>Clear</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.selectedFileMeta, { color: colors.textMuted }]}>
                    {(selectedBackup.fileSizeBytes / 1024).toFixed(1)} KB
                  </Text>
                </View>
              ) : null}
            </Card>

            {/* Saved Device Backups Card */}
            <Card style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.listHeaderRow}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Archives on Device ({backupsList.length})</Text>
                <TouchableOpacity onPress={loadBackups}>
                  <RefreshIcon size={18} color={colors.primary} />
                </TouchableOpacity>
              </View>

              {backupsList.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  No archives in internal app documents. Use the picker above to select an external file.
                </Text>
              ) : (
                backupsList.map(item => {
                  const isSelected = selectedBackup?.filePath === item.filePath;
                  const dateStr = new Date(item.lastModified).toLocaleString();
                  return (
                    <TouchableOpacity
                      key={item.filePath}
                      style={[
                        styles.archiveItem,
                        { backgroundColor: colors.cardSecondary, borderColor: colors.border },
                        isSelected && { borderColor: colors.primary, backgroundColor: 'rgba(16, 185, 129, 0.12)' },
                      ]}
                      onPress={() => {
                        setSelectedBackup(item);
                        setCustomPath(item.filePath);
                        setPreview(null);
                      }}
                    >
                      <View style={styles.archiveInfo}>
                        <Text style={[styles.archiveName, { color: colors.text }, isSelected && { color: colors.primary, fontWeight: '700' }]} numberOfLines={1}>
                          {item.fileName}
                        </Text>
                        <Text style={[styles.archiveMeta, { color: colors.textMuted }]}>
                          {dateStr} • {(item.fileSizeBytes / 1024).toFixed(1)} KB
                        </Text>
                      </View>

                      <View style={styles.archiveActions}>
                        <TouchableOpacity
                          style={styles.archiveIconBtn}
                          onPress={() => handleShareFile(item.filePath)}
                        >
                          <ShareIcon size={16} color={colors.textSecondary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.archiveIconBtn}
                          onPress={() => handleDeleteBackup(item)}
                        >
                          <DeleteIcon size={16} color={colors.danger} />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </Card>

            {/* Decrypt & Restore Card */}
            <Card style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.sectionHeader}>
                <LockIcon size={20} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Decrypt & Restore Archive</Text>
              </View>

              {!selectedBackup && (
                <Input
                  label="Custom File Path / Content URI"
                  value={customPath}
                  onChangeText={setCustomPath}
                  placeholder="content://... or /storage/.../archive.vkb"
                />
              )}

              <Input
                label="Archive Decryption Password"
                value={restorePassword}
                onChangeText={setRestorePassword}
                placeholder="Enter password used during backup creation"
                isPassword
              />

              <Button
                title="Inspect & Validate Archive"
                onPress={handleInspect}
                loading={isInspecting}
                icon={<ShieldIcon size={18} color={colors.white} />}
                style={styles.actionBtn}
              />

              {preview ? (
                <View style={[styles.previewBox, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
                  <View style={styles.previewHeaderRow}>
                    <CheckIcon size={18} color={colors.primary} />
                    <Text style={[styles.previewTitle, { color: colors.primary }]}>Archive Verified (v{preview.formatVersion})</Text>
                  </View>

                  <View style={styles.previewGrid}>
                    <View style={styles.previewStat}>
                      <Text style={[styles.previewNum, { color: colors.text }]}>{preview.loginCount}</Text>
                      <Text style={[styles.previewStatLabel, { color: colors.textMuted }]}>{t('typeLogin')}</Text>
                    </View>
                    <View style={styles.previewStat}>
                      <Text style={[styles.previewNum, { color: colors.text }]}>{preview.cardCount}</Text>
                      <Text style={[styles.previewStatLabel, { color: colors.textMuted }]}>{t('typeCard')}</Text>
                    </View>
                    <View style={styles.previewStat}>
                      <Text style={[styles.previewNum, { color: colors.text }]}>{preview.bankCount ?? 0}</Text>
                      <Text style={[styles.previewStatLabel, { color: colors.textMuted }]}>Bank</Text>
                    </View>
                    <View style={styles.previewStat}>
                      <Text style={[styles.previewNum, { color: colors.text }]}>{preview.noteCount}</Text>
                      <Text style={[styles.previewStatLabel, { color: colors.textMuted }]}>{t('typeNote')}</Text>
                    </View>
                    <View style={styles.previewStat}>
                      <Text style={[styles.previewNum, { color: colors.text }]}>{preview.totalItems}</Text>
                      <Text style={[styles.previewStatLabel, { color: colors.textMuted }]}>Total</Text>
                    </View>
                  </View>

                  <View style={styles.restoreActionsRow}>
                    <Button
                      title={t('restoreMerge')}
                      onPress={() => handleRestore('MERGE')}
                      loading={isRestoring}
                      style={styles.halfBtn}
                    />
                    <Button
                      title={t('restoreReplace')}
                      variant="danger"
                      onPress={() => handleRestore('REPLACE')}
                      loading={isRestoring}
                      style={styles.halfBtn}
                    />
                  </View>
                </View>
              ) : null}
            </Card>
          </>
        ) : activeTab === 'JSON_SYNC' ? (
          <>
            {/* JSON Tools Tab */}
            <Card style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.sectionHeader}>
                <NotesIcon size={22} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Export Encrypted Archive</Text>
              </View>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                Export all logins, cards, notes, and bank accounts as an encrypted archive (.vkb) and share it securely without exposing plaintext credentials to the clipboard.
              </Text>

              <Button
                title="Export & Share Encrypted Vault"
                variant="secondary"
                onPress={handleExportJson}
                loading={isExportingJson}
                icon={<ShareIcon size={18} color={colors.primary} />}
                style={styles.actionBtn}
              />
            </Card>

            <Card style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.sectionHeader}>
                <FolderIcon size={22} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Import JSON Credentials</Text>
              </View>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                Paste standard Bitwarden / 1Password / VaultKey JSON credentials to import directly into your encrypted vault.
              </Text>

              <Input
                label="JSON Data"
                value={jsonInput}
                onChangeText={setJsonInput}
                placeholder='{"items": [{"name": "...", "login": {...}}]}'
                multiline
                numberOfLines={5}
              />

              <Button
                title="Import JSON to Vault"
                onPress={handleImportJson}
                loading={isImportingJson}
                style={styles.actionBtn}
              />
            </Card>
          </>
        ) : (
          <Card style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <FolderIcon size={22} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Universal CSV Importer</Text>
            </View>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              RFC 4180 compliant parser. Automatically detects exports from Bitwarden, Google Chrome, 1Password, LastPass, or generic CSV.
            </Text>

            <Input
              label="CSV Content"
              value={csvInput}
              onChangeText={setCsvInput}
              placeholder="name,url,username,password&#10;Google,https://accounts.google.com,user@gmail.com,secret123"
              multiline
              numberOfLines={8}
            />

            <Button
              title="Import CSV to Vault"
              onPress={handleImportCsv}
              loading={isImportingCsv}
              style={styles.actionBtn}
            />
          </Card>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: 110,
  },
  card: {
    padding: spacing.base,
    marginBottom: spacing.base,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  cardSecondary: {
    padding: spacing.base,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
  },
  sectionSubtitle: {
    fontSize: typography.fontSizes.xs,
    marginBottom: spacing.base,
    lineHeight: 18,
  },
  actionBtn: {
    marginTop: spacing.sm,
  },
  createdBox: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.md,
  },
  createdHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  createdTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
  },
  createdName: {
    fontSize: typography.fontSizes.xs,
    fontFamily: 'monospace',
  },
  createdSize: {
    fontSize: 11,
    marginTop: 2,
  },
  createdActionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  halfBtn: {
    flex: 1,
  },
  guaranteeTitle: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  guaranteeDesc: {
    fontSize: typography.fontSizes.xs,
    lineHeight: 18,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: typography.fontSizes.xs,
    paddingVertical: spacing.md,
    textAlign: 'center',
  },
  archiveItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
  },
  archiveInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  archiveName: {
    fontSize: typography.fontSizes.xs,
    fontFamily: 'monospace',
  },
  archiveMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  archiveActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  archiveIconBtn: {
    padding: spacing.xs,
  },
  selectedFileBox: {
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.sm,
  },
  selectedFileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedFileTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  selectedFileName: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    fontFamily: 'monospace',
  },
  clearBtnText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
  },
  selectedFileMeta: {
    fontSize: 11,
    marginTop: 2,
    marginLeft: 24,
  },
  previewBox: {
    padding: spacing.base,
    borderRadius: radius.md,
    marginTop: spacing.md,
    borderWidth: 1,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  previewTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
  },
  previewGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  previewStat: {
    alignItems: 'center',
  },
  previewNum: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
  },
  previewStatLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  restoreActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
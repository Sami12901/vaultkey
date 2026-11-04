import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import {
  CloseIcon,
  ImageIcon,
  VideoIcon,
  FileIcon,
  LockIcon,
  UnlockIcon,
  ShareIcon,
  ShieldCheckIcon,
  VisibilityIcon,
  VisibilityOffIcon,
  CheckIcon,
  RefreshIcon,
} from '../icons';
import { vaultNative } from '../../services/nativeBridge';
import { useTheme } from '../../theme';
import { EncryptedFileResult, DecryptedFileResult } from '../../types';

interface SecureMediaShareModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SecureMediaShareModal: React.FC<SecureMediaShareModalProps> = ({
  visible,
  onClose,
}) => {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<'ENCRYPT' | 'DECRYPT'>('ENCRYPT');

  // Encrypt State
  const [selectedFile, setSelectedFile] = useState<{
    uri: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  } | null>(null);
  const [passphrase, setPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [hint, setHint] = useState('');
  const [encrypting, setEncrypting] = useState(false);
  const [encryptResult, setEncryptResult] = useState<EncryptedFileResult | null>(null);

  // Decrypt State
  const [decryptTargetFile, setDecryptTargetFile] = useState<{
    uri: string;
    fileName: string;
  } | null>(null);
  const [decryptPassphrase, setDecryptPassphrase] = useState('');
  const [showDecryptPassphrase, setShowDecryptPassphrase] = useState(false);
  const [decrypting, setDecrypting] = useState(false);
  const [decryptResult, setDecryptResult] = useState<DecryptedFileResult | null>(null);

  const resetState = () => {
    setSelectedFile(null);
    setPassphrase('');
    setHint('');
    setEncryptResult(null);
    setDecryptTargetFile(null);
    setDecryptPassphrase('');
    setDecryptResult(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handlePickFileToEncrypt = async (mimeType: string = '*/*') => {
    try {
      const file = await vaultNative.pickFile(mimeType);
      setSelectedFile(file);
      setEncryptResult(null);
    } catch {
      // User cancelled
    }
  };

  const handleGeneratePassword = async () => {
    try {
      const res = await vaultNative.generatePassphrase({ wordCount: 4, separator: '-' });
      if (res.passphrase) {
        setPassphrase(res.passphrase);
      }
    } catch {
      // Fallback
    }
  };

  const handleEncryptAndShare = async () => {
    if (!selectedFile) {
      Alert.alert('Selection Required', 'Please select a photo, video, or file to encrypt.');
      return;
    }
    if (!passphrase.trim()) {
      Alert.alert('Passphrase Required', 'Please enter a secure passphrase to protect this file.');
      return;
    }

    setEncrypting(true);
    try {
      const res = await vaultNative.encryptFile(selectedFile.uri, passphrase, hint);
      setEncryptResult(res);
      // Auto trigger native Android share sheet
      await vaultNative.shareEncryptedFile(res.outputFilePath, `VaultKey Secure File: ${res.originalName}`);
    } catch (err: any) {
      Alert.alert('Encryption Failed', err?.message || 'Unable to encrypt file.');
    } finally {
      setEncrypting(false);
    }
  };

  const handlePickFileToDecrypt = async () => {
    try {
      const file = await vaultNative.pickFile('*/*');
      setDecryptTargetFile({ uri: file.uri, fileName: file.fileName });
      setDecryptResult(null);
    } catch {
      // User cancelled
    }
  };

  const handleDecrypt = async () => {
    if (!decryptTargetFile) {
      Alert.alert('Selection Required', 'Please select a .vkfile to decrypt.');
      return;
    }
    if (!decryptPassphrase.trim()) {
      Alert.alert('Passphrase Required', 'Please enter the passphrase.');
      return;
    }

    setDecrypting(true);
    try {
      const res = await vaultNative.decryptFile(decryptTargetFile.uri, decryptPassphrase);
      setDecryptResult(res);
    } catch (err: any) {
      Alert.alert('Decryption Failed', err?.message || 'Incorrect passphrase or corrupted file.');
    } finally {
      setDecrypting(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Modal Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View style={styles.modalTitleRow}>
              <View style={[styles.badgeIcon, { backgroundColor: `${colors.primary}20` }]}>
                <ShieldCheckIcon size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Secure Media & Files</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  Zero-knowledge AES-256-GCM encrypted transfer
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn} activeOpacity={0.7}>
              <CloseIcon size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Mode Switcher Tabs */}
          <View style={[styles.tabsContainer, { backgroundColor: colors.surfaceVariant }]}>
            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === 'ENCRYPT' && [styles.activeTabBtn, { backgroundColor: colors.primary }],
              ]}
              onPress={() => setActiveTab('ENCRYPT')}
              activeOpacity={0.8}
            >
              <LockIcon size={16} color={activeTab === 'ENCRYPT' ? '#FFFFFF' : colors.textSecondary} />
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === 'ENCRYPT' ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                Encrypt & Share
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === 'DECRYPT' && [styles.activeTabBtn, { backgroundColor: colors.primary }],
              ]}
              onPress={() => setActiveTab('DECRYPT')}
              activeOpacity={0.8}
            >
              <UnlockIcon size={16} color={activeTab === 'DECRYPT' ? '#FFFFFF' : colors.textSecondary} />
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === 'DECRYPT' ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                Decrypt File
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
            {activeTab === 'ENCRYPT' ? (
              <View style={styles.section}>
                {/* File picker triggers */}
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                  1. SELECT MEDIA OR FILE TO ENCRYPT
                </Text>

                <View style={styles.pickerButtonGroup}>
                  <TouchableOpacity
                    style={[styles.pickerBtn, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
                    onPress={() => handlePickFileToEncrypt('image/*')}
                    activeOpacity={0.7}
                  >
                    <ImageIcon size={20} color={colors.primary} />
                    <Text style={[styles.pickerBtnText, { color: colors.text }]}>Photo</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.pickerBtn, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
                    onPress={() => handlePickFileToEncrypt('video/*')}
                    activeOpacity={0.7}
                  >
                    <VideoIcon size={20} color="#F59E0B" />
                    <Text style={[styles.pickerBtnText, { color: colors.text }]}>Video</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.pickerBtn, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
                    onPress={() => handlePickFileToEncrypt('*/*')}
                    activeOpacity={0.7}
                  >
                    <FileIcon size={20} color="#10B981" />
                    <Text style={[styles.pickerBtnText, { color: colors.text }]}>Any File</Text>
                  </TouchableOpacity>
                </View>

                {/* Selected File Display */}
                {selectedFile && (
                  <View style={[styles.selectedFileBox, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}40` }]}>
                    <View style={styles.selectedFileInfo}>
                      <Text style={[styles.selectedFileName, { color: colors.text }]} numberOfLines={1}>
                        {selectedFile.fileName}
                      </Text>
                      <Text style={[styles.selectedFileMeta, { color: colors.textSecondary }]}>
                        {formatBytes(selectedFile.sizeBytes)} • {selectedFile.mimeType}
                      </Text>
                    </View>
                    <CheckIcon size={18} color="#10B981" />
                  </View>
                )}

                {/* Passphrase Input */}
                <View style={styles.inputGroup}>
                  <View style={styles.labelRow}>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                      2. ENCRYPTION PASSPHRASE
                    </Text>
                    <TouchableOpacity onPress={handleGeneratePassword} style={styles.genBtn} activeOpacity={0.7}>
                      <RefreshIcon size={12} color={colors.primary} />
                      <Text style={[styles.genBtnText, { color: colors.primary }]}>Generate</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={[styles.inputWrapper, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
                    <TextInput
                      style={[styles.textInput, { color: colors.text }]}
                      placeholder="Passphrase to protect this file"
                      placeholderTextColor={colors.textSecondary}
                      secureTextEntry={!showPassphrase}
                      value={passphrase}
                      onChangeText={setPassphrase}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassphrase(!showPassphrase)}
                      style={styles.eyeBtn}
                      activeOpacity={0.7}
                    >
                      {showPassphrase ? (
                        <VisibilityOffIcon size={18} color={colors.textSecondary} />
                      ) : (
                        <VisibilityIcon size={18} color={colors.textSecondary} />
                      )}
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                    Only people with this passphrase will be able to unlock the file.
                  </Text>
                </View>

                {/* Password Hint */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                    3. PASSWORD HINT (OPTIONAL)
                  </Text>
                  <View style={[styles.inputWrapper, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
                    <TextInput
                      style={[styles.textInput, { color: colors.text }]}
                      placeholder="E.g., Name of our university"
                      placeholderTextColor={colors.textSecondary}
                      value={hint}
                      onChangeText={setHint}
                    />
                  </View>
                </View>

                {/* Action Button */}
                <TouchableOpacity
                  style={[
                    styles.primaryActionBtn,
                    { backgroundColor: colors.primary },
                    (!selectedFile || !passphrase || encrypting) && styles.disabledBtn,
                  ]}
                  onPress={handleEncryptAndShare}
                  disabled={!selectedFile || !passphrase || encrypting}
                  activeOpacity={0.8}
                >
                  {encrypting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <ShareIcon size={18} color="#FFFFFF" />
                      <Text style={styles.primaryActionBtnText}>Encrypt & Share via Sheet</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Encryption Success Card */}
                {encryptResult && (
                  <View style={[styles.successCard, { backgroundColor: `${colors.surfaceVariant}`, borderColor: '#10B981' }]}>
                    <View style={styles.successHeader}>
                      <CheckIcon size={18} color="#10B981" />
                      <Text style={[styles.successTitle, { color: '#10B981' }]}>File Encrypted Successfully!</Text>
                    </View>
                    <Text style={[styles.successDetails, { color: colors.textSecondary }]}>
                      Protected with PBKDF2 (10,000 iterations) + AES-256-GCM authenticated cipher.{'\n'}
                      File: {encryptResult.originalName}.vkfile
                    </Text>
                    <TouchableOpacity
                      style={[styles.reShareBtn, { borderColor: colors.primary }]}
                      onPress={() => vaultNative.shareEncryptedFile(encryptResult.outputFilePath)}
                      activeOpacity={0.7}
                    >
                      <ShareIcon size={14} color={colors.primary} />
                      <Text style={[styles.reShareText, { color: colors.primary }]}>Share Again</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.section}>
                {/* Decrypt flow */}
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                  1. SELECT ENCRYPTED FILE (.VKFILE)
                </Text>

                <TouchableOpacity
                  style={[styles.pickerBtnLarge, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
                  onPress={handlePickFileToDecrypt}
                  activeOpacity={0.7}
                >
                  <FileIcon size={24} color={colors.primary} />
                  <Text style={[styles.pickerBtnLargeText, { color: colors.text }]}>
                    {decryptTargetFile ? decryptTargetFile.fileName : 'Choose .vkfile from Storage'}
                  </Text>
                </TouchableOpacity>

                {/* Decrypt Passphrase */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                    2. ENTER PASSPHRASE
                  </Text>
                  <View style={[styles.inputWrapper, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
                    <TextInput
                      style={[styles.textInput, { color: colors.text }]}
                      placeholder="Passphrase used during encryption"
                      placeholderTextColor={colors.textSecondary}
                      secureTextEntry={!showDecryptPassphrase}
                      value={decryptPassphrase}
                      onChangeText={setDecryptPassphrase}
                    />
                    <TouchableOpacity
                      onPress={() => setShowDecryptPassphrase(!showDecryptPassphrase)}
                      style={styles.eyeBtn}
                      activeOpacity={0.7}
                    >
                      {showDecryptPassphrase ? (
                        <VisibilityOffIcon size={18} color={colors.textSecondary} />
                      ) : (
                        <VisibilityIcon size={18} color={colors.textSecondary} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Decrypt Action */}
                <TouchableOpacity
                  style={[
                    styles.primaryActionBtn,
                    { backgroundColor: colors.primary },
                    (!decryptTargetFile || !decryptPassphrase || decrypting) && styles.disabledBtn,
                  ]}
                  onPress={handleDecrypt}
                  disabled={!decryptTargetFile || !decryptPassphrase || decrypting}
                  activeOpacity={0.8}
                >
                  {decrypting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <UnlockIcon size={18} color="#FFFFFF" />
                      <Text style={styles.primaryActionBtnText}>Decrypt & Preview</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Decryption Result */}
                {decryptResult && (
                  <View style={[styles.decryptResultCard, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
                    <View style={styles.decryptHeader}>
                      <ShieldCheckIcon size={18} color="#10B981" />
                      <Text style={[styles.decryptTitle, { color: colors.text }]}>
                        Decrypted: {decryptResult.originalName}
                      </Text>
                    </View>
                    <Text style={[styles.decryptMeta, { color: colors.textSecondary }]}>
                      {formatBytes(decryptResult.sizeBytes)} • {decryptResult.mimeType}
                    </Text>

                    {/* Image Preview if it's an image */}
                    {decryptResult.mimeType.startsWith('image/') && (
                      <View style={styles.previewContainer}>
                        <Image
                          source={{ uri: decryptResult.fileUri }}
                          style={styles.imagePreview}
                          resizeMode="contain"
                        />
                      </View>
                    )}

                    {/* Action buttons */}
                    <TouchableOpacity
                      style={[styles.shareDecryptedBtn, { backgroundColor: colors.primary }]}
                      onPress={() => vaultNative.shareEncryptedFile(decryptResult.outputFilePath, `VaultKey Media: ${decryptResult.originalName}`)}
                      activeOpacity={0.8}
                    >
                      <ShareIcon size={16} color="#FFFFFF" />
                      <Text style={styles.shareDecryptedText}>Share / Export Decrypted Media</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    maxHeight: '92%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  badgeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 12,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  activeTabBtn: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  bodyScroll: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  section: {
    paddingBottom: 20,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  pickerButtonGroup: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  pickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  pickerBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  pickerBtnLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 10,
    marginBottom: 14,
  },
  pickerBtnLargeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectedFileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  selectedFileInfo: {
    flex: 1,
    marginRight: 10,
  },
  selectedFileName: {
    fontSize: 14,
    fontWeight: '700',
  },
  selectedFileMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  inputGroup: {
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  genBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  genBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 10,
  },
  eyeBtn: {
    padding: 6,
  },
  helperText: {
    fontSize: 11,
    marginTop: 4,
    lineHeight: 15,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
    marginTop: 8,
    elevation: 3,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  primaryActionBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  successCard: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  successHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  successTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  successDetails: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  reShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  reShareText: {
    fontSize: 12,
    fontWeight: '700',
  },
  decryptResultCard: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  decryptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  decryptTitle: {
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  decryptMeta: {
    fontSize: 12,
    marginTop: 4,
    marginBottom: 10,
  },
  previewContainer: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.3)',
    marginVertical: 10,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  shareDecryptedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    marginTop: 6,
  },
  shareDecryptedText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

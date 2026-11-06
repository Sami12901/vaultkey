import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme';
import {
  AddIcon,
  SearchIcon,
  CopyIcon,
  CheckIcon,
  KeyIcon,
  QrCodeIcon,
  CloseIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
} from '../../components/icons';
import { TotpCountdownRing } from '../../components/common/TotpCountdownRing';
import { vaultNative, clipboardNative, qrNative } from '../../services/nativeBridge';
import { parseOtpAuthUri, validateBase32Secret } from '../../utils/otpauthUtils';

interface ActiveTotpItem {
  id: string;
  issuer: string;
  accountName: string;
  code: string;
  remainingSeconds: number;
  period: number;
  progress: number;
}

export const AuthenticatorScreen: React.FC = () => {
  const { colors } = useTheme();

  const [totpList, setTotpList] = useState<ActiveTotpItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Add Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);

  // Manual Form State
  const [manualTitle, setManualTitle] = useState('');
  const [manualIssuer, setManualIssuer] = useState('');
  const [manualAccount, setManualAccount] = useState('');
  const [manualSecret, setManualSecret] = useState('');
  const manualDigits = 6;
  const manualPeriod = 30;
  const [saving, setSaving] = useState(false);

  const loadTotpCodes = useCallback(async () => {
    try {
      const list = await vaultNative.getAllActiveTotpCodes();
      if (list) {
        setTotpList(list as ActiveTotpItem[]);
      }
    } catch {
      // Vault may be locked or empty
    }
  }, []);

  // Update codes on mount and every 1000ms
  useEffect(() => {
    loadTotpCodes();
    const interval = setInterval(() => {
      loadTotpCodes();
    }, 1000);
    return () => clearInterval(interval);
  }, [loadTotpCodes]);

  const handleCopyCode = async (id: string, code: string) => {
    await clipboardNative.copySecure(code, '2FA Code', 30);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const handleImportQrFromImage = async () => {
    setShowAddModal(false);
    try {
      const picked = await vaultNative.pickMediaFromGallery('image/*');
      if (!picked || !picked.filePath) return;

      const decoded = await qrNative.decodeQrFromFile(picked.filePath);
      if (!decoded || !decoded.text) {
        Alert.alert('No QR Code Found', 'Could not detect a valid QR code in the selected image.');
        return;
      }

      const parsed = parseOtpAuthUri(decoded.text);
      await vaultNative.saveAuthenticatorItem(parsed);
      Alert.alert('Success', `2FA Authenticator for "${parsed.issuer || parsed.title}" saved successfully!`);
      loadTotpCodes();
    } catch (err: any) {
      Alert.alert('Import Failed', err?.message || 'Failed to parse QR code image.');
    }
  };

  const handleSaveManual = async () => {
    const cleanSecret = manualSecret.trim().replace(/[\s-]/g, '').toUpperCase();
    if (!cleanSecret) {
      Alert.alert('Required', 'Please enter a Base32 Secret Key');
      return;
    }

    if (!validateBase32Secret(cleanSecret)) {
      Alert.alert(
        'Invalid Secret',
        'Base32 Secret must contain only letters A-Z and digits 2-7.'
      );
      return;
    }

    const title = manualTitle.trim() || manualIssuer.trim() || manualAccount.trim() || '2FA Authenticator';
    setSaving(true);
    try {
      await vaultNative.saveAuthenticatorItem({
        title,
        issuer: manualIssuer.trim() || 'Authenticator',
        accountName: manualAccount.trim(),
        secret: cleanSecret,
        algorithm: 'SHA1',
        digits: manualDigits,
        period: manualPeriod,
      });

      setSaving(false);
      setShowManualModal(false);
      setManualTitle('');
      setManualIssuer('');
      setManualAccount('');
      setManualSecret('');
      loadTotpCodes();
    } catch (err: any) {
      setSaving(false);
      Alert.alert('Error', err?.message || 'Failed to save authenticator');
    }
  };

  const filteredList = totpList.filter(item => {
    const q = searchQuery.toLowerCase();
    return (
      item.issuer.toLowerCase().includes(q) ||
      item.accountName.toLowerCase().includes(q)
    );
  });

  const formatCode = (code: string) => {
    if (code.length === 6) {
      return `${code.slice(0, 3)} ${code.slice(3)}`;
    }
    if (code.length === 8) {
      return `${code.slice(0, 4)} ${code.slice(4)}`;
    }
    return code;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerTitleRow}>
          <View style={styles.headerIconCircle}>
            <KeyIcon size={20} color="#10B981" />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>2FA Authenticator</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              Offline RFC 6238 • Zero Plaintext in Memory
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => setShowAddModal(true)}
        >
          <AddIcon size={18} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Add 2FA</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchSection}>
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SearchIcon size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search accounts or issuers..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.clearSearchBtn}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <CloseIcon size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* List */}
      {filteredList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconCircle, { borderColor: colors.border }]}>
            <QrCodeIcon size={40} color="#10B981" />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Authenticator Accounts</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Scan a QR code or enter a secret key to generate 6-digit Google Authenticator codes completely offline.
          </Text>
          <TouchableOpacity
            style={[styles.emptyAddBtn, { backgroundColor: colors.primary }]}
            onPress={() => setShowAddModal(true)}
          >
            <AddIcon size={18} color="#FFFFFF" />
            <Text style={styles.emptyAddBtnText}>Add First 2FA Code</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredList}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          updateCellsBatchingPeriod={50}
          renderItem={({ item }) => {
            const isCopied = copiedId === item.id;
            return (
              <TouchableOpacity
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.card,
                    borderColor: isCopied ? '#10B981' : colors.border,
                  },
                ]}
                activeOpacity={0.7}
                onPress={() => handleCopyCode(item.id, item.code)}
              >
                <View style={styles.cardInfo}>
                  <View style={styles.issuerRow}>
                    <Text style={[styles.issuerText, { color: colors.text }]}>
                      {item.issuer || '2FA Code'}
                    </Text>
                  </View>
                  {item.accountName ? (
                    <Text style={[styles.accountText, { color: colors.textSecondary }]} numberOfLines={1}>
                      {item.accountName}
                    </Text>
                  ) : null}

                  <View style={styles.codeRow}>
                    <Text
                      style={[
                        styles.codeText,
                        {
                          color:
                            item.remainingSeconds <= 3
                              ? '#EF4444'
                              : item.remainingSeconds <= 7
                              ? '#F59E0B'
                              : '#10B981',
                        },
                      ]}
                    >
                      {formatCode(item.code)}
                    </Text>
                    <View style={styles.copyBadge}>
                      {isCopied ? (
                        <View style={styles.copiedBadgeRow}>
                          <CheckIcon size={14} color="#10B981" />
                          <Text style={styles.copiedText}>Copied</Text>
                        </View>
                      ) : (
                        <CopyIcon size={14} color={colors.textSecondary} />
                      )}
                    </View>
                  </View>
                </View>

                {/* Countdown Dial */}
                <View style={styles.ringArea}>
                  <TotpCountdownRing
                    remainingSeconds={item.remainingSeconds}
                    period={item.period}
                    size={42}
                    strokeWidth={3.5}
                  />
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Add Mode Picker Modal */}
      <Modal visible={showAddModal} transparent animationType="fade" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.pickerDialog, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>Add Authenticator Account</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <CloseIcon size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={[styles.pickerOption, { borderColor: colors.border }]} onPress={handleImportQrFromImage}>
              <View style={[styles.pickerOptionIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <QrCodeIcon size={22} color="#10B981" />
              </View>
              <View style={styles.pickerOptionText}>
                <Text style={[styles.pickerOptionLabel, { color: colors.text }]}>Import QR from Screenshot</Text>
                <Text style={[styles.pickerOptionDesc, { color: colors.textSecondary }]}>
                  Pick a QR code image or screenshot from your gallery
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pickerOption, { borderColor: colors.border }]}
              onPress={() => {
                setShowAddModal(false);
                setShowManualModal(true);
              }}
            >
              <View style={[styles.pickerOptionIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                <KeyIcon size={22} color="#3B82F6" />
              </View>
              <View style={styles.pickerOptionText}>
                <Text style={[styles.pickerOptionLabel, { color: colors.text }]}>Enter Key Manually</Text>
                <Text style={[styles.pickerOptionDesc, { color: colors.textSecondary }]}>
                  Type or paste the Base32 secret code from the website
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Manual Input Modal */}
      <Modal visible={showManualModal} transparent animationType="slide" onRequestClose={() => setShowManualModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.manualDialog, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>Manual 2FA Key Entry</Text>
              <TouchableOpacity onPress={() => setShowManualModal(false)}>
                <CloseIcon size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Account / Username</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. saiful@gmail.com"
              placeholderTextColor={colors.textSecondary}
              value={manualAccount}
              onChangeText={setManualAccount}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Service / Issuer</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. Google, GitHub, Binance"
              placeholderTextColor={colors.textSecondary}
              value={manualIssuer}
              onChangeText={setManualIssuer}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Base32 Secret Key</Text>
            <TextInput
              style={[
                styles.textInput,
                styles.secretInput,
                {
                  backgroundColor: colors.card,
                  borderColor: manualSecret && !validateBase32Secret(manualSecret) ? '#EF4444' : colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="e.g. JBSWY3DPEHPK3PXP"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="characters"
              autoCorrect={false}
              value={manualSecret}
              onChangeText={setManualSecret}
            />

            {manualSecret ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                {validateBase32Secret(manualSecret) ? (
                  <>
                    <CheckCircleIcon size={14} color="#10B981" />
                    <Text style={{ fontSize: 11, color: '#10B981' }}>Valid Base32 Secret Key</Text>
                  </>
                ) : (
                  <>
                    <AlertTriangleIcon size={14} color="#EF4444" />
                    <Text style={{ fontSize: 11, color: '#EF4444' }}>Invalid key: Only A-Z and 2-7 characters allowed</Text>
                  </>
                )}
              </View>
            ) : null}

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.border }]}
                onPress={() => setShowManualModal(false)}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  {
                    backgroundColor: colors.primary,
                    opacity: saving || !validateBase32Secret(manualSecret) ? 0.6 : 1,
                  },
                ]}
                disabled={saving || !validateBase32Secret(manualSecret)}
                onPress={handleSaveManual}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Authenticator</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  clearSearchBtn: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  cardInfo: {
    flex: 1,
    paddingRight: 12,
  },
  issuerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  issuerText: {
    fontSize: 14,
    fontWeight: '700',
  },
  accountText: {
    fontSize: 12,
    marginBottom: 8,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  codeText: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 2,
    fontFamily: 'Courier',
  },
  copyBadge: {
    padding: 4,
  },
  copiedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  copiedText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '700',
  },
  ringArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyAddBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerDialog: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  pickerOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerOptionText: {
    flex: 1,
  },
  pickerOptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  pickerOptionDesc: {
    fontSize: 12,
  },
  manualDialog: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  textInput: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    marginBottom: 12,
  },
  secretInput: {
    fontFamily: 'Courier',
    letterSpacing: 1.5,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  ToastAndroid,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { colors, setTheme } from '../../theme/colors';
import { radius, typography, spacing, useTheme } from '../../theme';

import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import {
  ShieldIcon,
  AutofillIcon,
  DeleteIcon,
  ChevronRightIcon,
  FingerprintIcon,
  ShieldCheckIcon,
  LockIcon,
  CheckIcon,
  GlobeIcon,
  CloseIcon,
  SearchIcon,
  CloudDownloadIcon,
  BackupIcon,
  UploadIcon,
} from '../../components/icons';
import {
  vaultNative,
  autofillNative,
  securityNative,
  updateNative,
  clipboardNative,
  UpdateInfo,
} from '../../services/nativeBridge';
import { generateEmergencyKitContent } from '../../utils/recoveryKit';
import { UpdateModal } from '../../components/common/UpdateModal';
import { SetupOnboardingModal } from '../../components/common/SetupOnboardingModal';
import { CloudSyncGuideModal } from '../../components/common/CloudSyncGuideModal';
import { calculatePasswordEntropy } from '../../utils/entropyUtils';
import { useVaultStore } from '../../stores/vaultStore';
import { useTranslation, Language, SUPPORTED_LANGUAGES } from '../../i18n';
import { AppTheme } from '../../types';

const THEME_OPTIONS: Array<{
  key: AppTheme;
  title: string;
  subtitle: string;
  bg: string;
  card: string;
  accent: string;
}> = [
  {
    key: 'dark',
    title: 'Obsidian',
    subtitle: 'Emerald Cyber',
    bg: '#0B0F17',
    card: '#131B2A',
    accent: '#10B981',
  },
  {
    key: 'oled',
    title: 'Midnight OLED',
    subtitle: 'True Black & Cyan',
    bg: '#000000',
    card: '#0D0E12',
    accent: '#00F0FF',
  },
  {
    key: 'slate',
    title: 'Nordic Slate',
    subtitle: 'Ice Blue & Silver',
    bg: '#0F172A',
    card: '#1E293B',
    accent: '#38BDF8',
  },
  {
    key: 'amethyst',
    title: 'Royal Amethyst',
    subtitle: 'Deep Velvet & Pink',
    bg: '#0D0714',
    card: '#1C102B',
    accent: '#A855F7',
  },
  {
    key: 'light',
    title: 'Executive Light',
    subtitle: 'Daylight Porcelain',
    bg: '#F8FAFC',
    card: '#FFFFFF',
    accent: '#059669',
  },
];

interface SettingsScreenProps {
  onBack: () => void;
  onOpenAuditLog: () => void;
  onOpenBackup: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onBack,
  onOpenAuditLog,
  onOpenBackup,
}) => {
  const { t, language, setLanguage } = useTranslation();
  const { colors } = useTheme();
  const {
    settings,
    isBiometricSupported,
    enableBiometrics,
    disableBiometrics,
    refreshVaultData,
    checkInitialStatus,
  } = useVaultStore();

  const [screenSecurity, setScreenSecurity] = useState(settings.screenSecurity);
  const [biometricEnabled, setBiometricEnabled] = useState(settings.biometricEnabled);
  const [showWebsiteIcons, setShowWebsiteIcons] = useState(settings.showWebsiteIcons !== false);

  // Biometric Enrollment Modal State
  const [showBioModal, setShowBioModal] = useState(false);
  const [bioPassword, setBioPassword] = useState('');
  const [bioError, setBioError] = useState<string | null>(null);
  const [enrollingBio, setEnrollingBio] = useState(false);

  // Change password modal state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmNewPass, setConfirmNewPass] = useState('');
  const [changingPass, setChangingPass] = useState(false);

  // Global Language Modal State
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [languageSearch, setLanguageSearch] = useState('');

  // GitHub In-App Auto-Update State
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [manualUpdateInfo, setManualUpdateInfo] = useState<UpdateInfo | null>(null);
  const [showManualUpdateModal, setShowManualUpdateModal] = useState(false);

  // Setup & Sync Guide Modals
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showSyncGuideModal, setShowSyncGuideModal] = useState(false);

  // Emergency Recovery Kit State
  const [showEmergencyKitModal, setShowEmergencyKitModal] = useState(false);
  const [emergencyKitText, setEmergencyKitText] = useState('');

  const handleOpenEmergencyKit = () => {
    const text = generateEmergencyKitContent({
      vaultName: 'VaultKey Mobile Vault',
      userEmail: 'mobile-owner@vaultkey.local',
    });
    setEmergencyKitText(text);
    setShowEmergencyKitModal(true);
  };

  const handleCopyEmergencyKit = async () => {
    try {
      await clipboardNative.copySecure(emergencyKitText, 'Emergency Recovery Kit', 120);
      ToastAndroid.show('Recovery Kit copied securely to clipboard', ToastAndroid.LONG);
    } catch {
      ToastAndroid.show('Failed to copy to clipboard', ToastAndroid.SHORT);
    }
  };

  const handleManualCheckUpdate = async () => {
    setCheckingUpdate(true);
    try {
      const info = await updateNative.checkForUpdate();
      if (info && info.hasUpdate) {
        setManualUpdateInfo(info);
        setShowManualUpdateModal(true);
      } else {
        ToastAndroid.show(`You are already on the latest version (${info?.currentVersion || 'v1.0.0'})`, ToastAndroid.LONG);
      }
    } catch (err: any) {
      Alert.alert('Update Check Failed', err?.message || 'Unable to connect to GitHub. Please check your internet connection.');
    } finally {
      setCheckingUpdate(false);
    }
  };

  const filteredLanguages = SUPPORTED_LANGUAGES.filter(
    l =>
      l.name.toLowerCase().includes(languageSearch.toLowerCase()) ||
      l.nativeName.toLowerCase().includes(languageSearch.toLowerCase()) ||
      l.code.toLowerCase().includes(languageSearch.toLowerCase())
  );

  const handleToggleScreenSecurity = async (value: boolean) => {
    setScreenSecurity(value);
    await securityNative.setScreenSecurity(value);
    await vaultNative.updateSettings({ screenSecurity: value });
    await refreshVaultData();
  };

  const handleToggleWebsiteIcons = async (value: boolean) => {
    setShowWebsiteIcons(value);
    await vaultNative.updateSettings({ showWebsiteIcons: value });
    await refreshVaultData();
    ToastAndroid.show(
      value ? 'Website icons enabled' : 'Website icons disabled',
      ToastAndroid.SHORT
    );
  };

  const handleThemeChange = async (themeKey: AppTheme) => {
    setTheme(themeKey);
    await vaultNative.updateSettings({ theme: themeKey });
    await refreshVaultData();
    ToastAndroid.show(`${themeKey.toUpperCase()} theme applied`, ToastAndroid.SHORT);
  };


  const handleToggleBiometrics = async (value: boolean) => {
    if (value) {
      setBioPassword('');
      setBioError(null);
      setShowBioModal(true);
    } else {
      try {
        await disableBiometrics();
        setBiometricEnabled(false);
        ToastAndroid.show('Biometrics disabled', ToastAndroid.SHORT);
        await refreshVaultData();
      } catch (e: any) {
        Alert.alert(t('error'), e?.message || 'Failed to disable biometrics');
      }
    }
  };

  const handleConfirmEnableBio = async () => {
    if (!bioPassword) {
      setBioError('Master password is required');
      return;
    }
    setEnrollingBio(true);
    setBioError(null);
    try {
      await enableBiometrics(bioPassword);
      setBiometricEnabled(true);
      setShowBioModal(false);
      setBioPassword('');
      ToastAndroid.show('Biometrics enabled successfully', ToastAndroid.SHORT);
      await refreshVaultData();
    } catch (e: any) {
      setBioError(e?.message || 'Biometric authentication failed or cancelled');
    } finally {
      setEnrollingBio(false);
    }
  };

  const handleAutoLockChange = async (seconds: number) => {
    await vaultNative.updateSettings({ autoLockSeconds: seconds });
    await refreshVaultData();
    ToastAndroid.show('Auto-lock timeout updated', ToastAndroid.SHORT);
  };

  const handleClipboardTimeoutChange = async (seconds: number) => {
    await vaultNative.updateSettings({ clipboardClearSeconds: seconds });
    await refreshVaultData();
    ToastAndroid.show('Clipboard clear timeout updated', ToastAndroid.SHORT);
  };

  const handleLanguageChange = async (lang: Language) => {
    setLanguage(lang);
    await vaultNative.updateSettings({ language: lang });
    await refreshVaultData();
    setShowLanguageModal(false);
    ToastAndroid.show('Language updated successfully', ToastAndroid.SHORT);
  };

  const handleOpenAutofillSettings = async () => {
    try {
      await autofillNative.openAutofillSettings();
    } catch (e: any) {
      Alert.alert(t('error'), e?.message || 'Failed to open settings');
    }
  };

  const handleChangePassword = async () => {
    const entropyRes = calculatePasswordEntropy(newPass);
    if (!entropyRes.isLengthValid) {
      Alert.alert(t('error'), t('passwordTooShort'));
      return;
    }
    if (!entropyRes.isEntropySafe || !entropyRes.isValidMasterPassword) {
      Alert.alert(
        t('error'),
        'New Master Password is too weak. Minimum 60 bits entropy and 3 character classes (uppercase, numbers, symbols) are required.'
      );
      return;
    }
    if (newPass !== confirmNewPass) {
      Alert.alert(t('error'), t('passwordMismatch'));
      return;
    }

    setChangingPass(true);
    try {
      await vaultNative.changeMasterPassword(currentPass, newPass);
      ToastAndroid.show('Master password changed successfully', ToastAndroid.LONG);
      setShowPasswordChange(false);
      setCurrentPass('');
      setNewPass('');
      setConfirmNewPass('');
    } catch (e: any) {
      Alert.alert(t('error'), e?.message || 'Failed to change master password');
    } finally {
      setChangingPass(false);
    }
  };

  const handleCryptoErase = () => {
    Alert.alert(
      t('cryptoEraseTitle'),
      t('cryptoEraseConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: 'PERMANENTLY DESTROY',
          style: 'destructive',
          onPress: async () => {
            try {
              await vaultNative.cryptoErase();
              ToastAndroid.show('Vault destroyed permanently', ToastAndroid.LONG);
              await checkInitialStatus();
            } catch (e: any) {
              Alert.alert(t('error'), e?.message || 'Crypto-erase failed');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title={t('settingsTitle')} onBack={onBack} />

      <ScrollView
        style={[styles.content, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >

        {/* Security Preferences */}
        <Card style={styles.card}>
          <Text style={styles.cardSectionTitle}>Security & Biometrics</Text>

          {/* Biometrics Toggle */}
          {isBiometricSupported ? (
            <View style={styles.settingRow}>
              <View style={styles.settingIconCol}>
                <FingerprintIcon size={24} color={biometricEnabled ? colors.primary : colors.textSecondary} />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>{t('biometricToggle')}</Text>
                <Text style={styles.settingDesc}>{t('biometricDesc')}</Text>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={handleToggleBiometrics}
                trackColor={{ false: colors.border, true: colors.primaryMuted }}
                thumbColor={biometricEnabled ? colors.primary : colors.textMuted}
              />
            </View>
          ) : null}

          {/* Screen Security */}
          <View style={styles.settingRow}>
            <View style={styles.settingIconCol}>
              <ShieldCheckIcon size={24} color={screenSecurity ? colors.primary : colors.textSecondary} />
            </View>
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>{t('screenSecurityToggle')}</Text>
              <Text style={styles.settingDesc}>{t('screenSecurityDesc')}</Text>
            </View>
            <Switch
              value={screenSecurity}
              onValueChange={handleToggleScreenSecurity}
              trackColor={{ false: colors.border, true: colors.primaryMuted }}
              thumbColor={screenSecurity ? colors.primary : colors.textMuted}
            />
          </View>

          {/* Auto Lock Options */}
          <View style={styles.optionSection}>
            <Text style={styles.settingLabel}>{t('autoLockLabel')}</Text>
            <View style={styles.chipsRow}>
              {[
                { sec: 0, label: t('autoLockImmediate') },
                { sec: 60, label: t('autoLock1m') },
                { sec: 300, label: '5m' },
                { sec: 900, label: '15m' },
                { sec: -1, label: t('autoLockNever') },
              ].map(opt => (
                <TouchableOpacity
                  key={opt.sec}
                  style={[styles.chip, settings.autoLockSeconds === opt.sec && styles.chipActive]}
                  onPress={() => handleAutoLockChange(opt.sec)}
                >
                  <Text style={[styles.chipText, settings.autoLockSeconds === opt.sec && styles.chipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Clipboard Clear Timeout */}
          <View style={styles.optionSection}>
            <Text style={styles.settingLabel}>{t('clipboardClearLabel')}</Text>
            <View style={styles.chipsRow}>
              {[
                { sec: 15, label: '15s' },
                { sec: 30, label: '30s (Default)' },
                { sec: 60, label: '60s' },
                { sec: 120, label: '2m' },
              ].map(opt => (
                <TouchableOpacity
                  key={opt.sec}
                  style={[styles.chip, settings.clipboardClearSeconds === opt.sec && styles.chipActive]}
                  onPress={() => handleClipboardTimeoutChange(opt.sec)}
                >
                  <Text style={[styles.chipText, settings.clipboardClearSeconds === opt.sec && styles.chipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Card>

        {/* System & Localization */}
        <Card style={styles.card}>
          <Text style={styles.cardSectionTitle}>Display & Preferences</Text>

          {/* Show Website Icons Toggle */}
          <View style={styles.settingRow}>
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>{t('websiteIconsToggle')}</Text>
              <Text style={styles.settingDesc}>{t('websiteIconsDesc')}</Text>
            </View>
            <Switch
              value={showWebsiteIcons}
              onValueChange={handleToggleWebsiteIcons}
              trackColor={{ false: colors.border, true: colors.primaryMuted }}
              thumbColor={showWebsiteIcons ? colors.primary : colors.textMuted}
            />
          </View>

          {/* Theme Selector */}
          <View style={styles.optionSection}>
            <Text style={styles.settingLabel}>Theme & Visual Style</Text>
            <Text style={styles.settingDesc}>Select your preferred appearance and contrast palette</Text>
            <View style={styles.themeGrid}>
              {THEME_OPTIONS.map(themeOpt => {
                const isSelected = (settings.theme || 'dark') === themeOpt.key;
                return (
                  <TouchableOpacity
                    key={themeOpt.key}
                    style={[
                      styles.themeCard,
                      { backgroundColor: themeOpt.card, borderColor: isSelected ? themeOpt.accent : colors.border },
                      isSelected && styles.themeCardSelected,
                    ]}
                    onPress={() => handleThemeChange(themeOpt.key)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.themePreviewHeader}>
                      <View style={styles.swatchRow}>
                        <View style={[styles.swatchDot, { backgroundColor: themeOpt.bg, borderColor: colors.border }]} />
                        <View style={[styles.swatchDot, { backgroundColor: themeOpt.card }]} />
                        <View style={[styles.swatchDot, { backgroundColor: themeOpt.accent }]} />
                      </View>
                      {isSelected ? (
                        <View style={[styles.themeCheckBadge, { backgroundColor: themeOpt.accent }]}>
                          <CheckIcon size={12} color="#FFFFFF" />
                        </View>
                      ) : null}
                    </View>
                    <Text style={[styles.themeTitle, { color: themeOpt.key === 'light' ? '#0F172A' : '#F8FAFC' }]}>
                      {themeOpt.title}
                    </Text>
                    <Text style={styles.themeSubtitle}>{themeOpt.subtitle}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Global Language Switcher Row */}
          <TouchableOpacity
            style={styles.navRow}
            onPress={() => {
              setLanguageSearch('');
              setShowLanguageModal(true);
            }}
          >
            <View style={styles.navRowLeft}>
              <GlobeIcon size={22} color={colors.primary} />
              <View style={styles.navText}>
                <Text style={styles.settingLabel}>{t('languageLabel')}</Text>
                <Text style={styles.settingDesc}>
                  {SUPPORTED_LANGUAGES.find(l => l.code === language)?.flag}{' '}
                  {SUPPORTED_LANGUAGES.find(l => l.code === language)?.nativeName} (
                  {SUPPORTED_LANGUAGES.find(l => l.code === language)?.name})
                </Text>
              </View>
            </View>
            <View style={styles.langSelectPill}>
              <Text style={styles.langSelectPillText}>{t('selectLanguage')}</Text>
              <ChevronRightIcon size={18} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>

          {/* Autofill Setup */}
          <TouchableOpacity style={styles.navRow} onPress={handleOpenAutofillSettings}>
            <View style={styles.navRowLeft}>
              <AutofillIcon size={22} color={colors.accentLight} />
              <View style={styles.navText}>
                <Text style={styles.settingLabel}>{t('autofillSetup')}</Text>
                <Text style={styles.settingDesc}>{t('autofillDesc')}</Text>
              </View>
            </View>
            <ChevronRightIcon size={20} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Audit Log */}
          <TouchableOpacity style={styles.navRow} onPress={onOpenAuditLog}>
            <View style={styles.navRowLeft}>
              <ShieldIcon size={22} color={colors.primary} />
              <View style={styles.navText}>
                <Text style={styles.settingLabel}>{t('auditLog')}</Text>
                <Text style={styles.settingDesc}>View local security events and access history</Text>
              </View>
            </View>
            <ChevronRightIcon size={20} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Setup & Permissions Checklist */}
          <TouchableOpacity style={styles.navRow} onPress={() => setShowSetupModal(true)}>
            <View style={styles.navRowLeft}>
              <ShieldCheckIcon size={22} color={colors.primary} />
              <View style={styles.navText}>
                <Text style={styles.settingLabel}>Setup & Permissions Checklist</Text>
                <Text style={styles.settingDesc}>Autofill, biometrics, camera and battery setup</Text>
              </View>
            </View>
            <ChevronRightIcon size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </Card>

        {/* Data Management, Backup & Migration */}
        <Card style={styles.card}>
          <Text style={styles.cardSectionTitle}>Data Management & Vault Backups</Text>

          {/* Local Encrypted Backup & Restore */}
          <TouchableOpacity style={styles.navRow} onPress={onOpenBackup} activeOpacity={0.7}>
            <View style={styles.navRowLeft}>
              <BackupIcon size={22} color={colors.primary} />
              <View style={styles.navText}>
                <Text style={styles.settingLabel}>Local Encrypted Backup (.vaultkey)</Text>
                <Text style={styles.settingDesc}>Export AES-256-GCM encrypted backup or restore previous vault</Text>
              </View>
            </View>
            <ChevronRightIcon size={20} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Universal CSV / JSON Importer */}
          <TouchableOpacity style={styles.navRow} onPress={onOpenBackup} activeOpacity={0.7}>
            <View style={styles.navRowLeft}>
              <UploadIcon size={22} color={colors.primary} />
              <View style={styles.navText}>
                <Text style={styles.settingLabel}>Import Passwords (CSV / JSON)</Text>
                <Text style={styles.settingDesc}>Import from Bitwarden, Google Chrome, 1Password, LastPass</Text>
              </View>
            </View>
            <ChevronRightIcon size={20} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Emergency Access & Recovery Kit */}
          <TouchableOpacity style={styles.navRow} onPress={handleOpenEmergencyKit} activeOpacity={0.7}>
            <View style={styles.navRowLeft}>
              <ShieldCheckIcon size={22} color={colors.primary} />
              <View style={styles.navText}>
                <Text style={styles.settingLabel}>Emergency Access & Recovery Kit</Text>
                <Text style={styles.settingDesc}>Printable recovery sheet with 4-char checksum</Text>
              </View>
            </View>
            <ChevronRightIcon size={20} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Zero-Knowledge Sync Guide */}
          <TouchableOpacity style={styles.navRow} onPress={() => setShowSyncGuideModal(true)} activeOpacity={0.7}>
            <View style={styles.navRowLeft}>
              <GlobeIcon size={22} color={colors.primary} />
              <View style={styles.navText}>
                <Text style={styles.settingLabel}>Zero-Knowledge Sync Guide</Text>
                <Text style={styles.settingDesc}>Animated E2EE Cloud & Wi-Fi LAN setup architecture</Text>
              </View>
            </View>
            <ChevronRightIcon size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </Card>

        {/* Master Password & Vault Administration */}
        <Card style={styles.card}>
          <Text style={styles.cardSectionTitle}>Master Password & Vault</Text>

          {!showPasswordChange ? (
            <Button
              title={t('changeMasterPassword')}
              variant="secondary"
              onPress={() => setShowPasswordChange(true)}
              style={styles.changePassBtn}
            />
          ) : (
            <View style={styles.passwordChangeBox}>
              <Input
                label="Current Master Password"
                value={currentPass}
                onChangeText={setCurrentPass}
                isPassword
              />
              <Input
                label="New Master Password"
                value={newPass}
                onChangeText={setNewPass}
                isPassword
              />
              <Input
                label="Confirm New Master Password"
                value={confirmNewPass}
                onChangeText={setConfirmNewPass}
                isPassword
              />
              <View style={styles.passChangeActionRow}>
                <Button
                  title={t('cancel')}
                  variant="ghost"
                  onPress={() => setShowPasswordChange(false)}
                />
                <Button
                  title={t('save')}
                  onPress={handleChangePassword}
                  loading={changingPass}
                />
              </View>
            </View>
          )}

          {/* Crypto-Erase Danger Button */}
          <Button
            title={t('cryptoEraseTitle')}
            variant="danger"
            onPress={handleCryptoErase}
            style={styles.eraseBtn}
            icon={<DeleteIcon size={18} color={colors.white} />}
          />
        </Card>

        {/* Brand Information & Architecture Badge */}
        <Card style={styles.aboutCard}>
          <View style={styles.aboutHeader}>
            <Image
              source={require('../../assets/vaultkey_brand_icon.jpg')}
              style={styles.aboutLogo}
              resizeMode="cover"
            />
            <View style={styles.aboutTextWrap}>
              <Text style={styles.aboutTitle}>VaultKey</Text>
              <Text style={styles.aboutVersion}>Version 1.3.2 (Production)</Text>
              <Text style={styles.aboutSubtitle}>Hardware-Backed Zero-Knowledge Security</Text>
            </View>
          </View>
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Key Derivation</Text>
            <Text style={styles.specValue}>Argon2id (64MB, t=3, p=4)</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Database Engine</Text>
            <Text style={styles.specValue}>SQLCipher 4.6.1 AES-256</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Biometric Binding</Text>
            <Text style={styles.specValue}>Android Keystore StrongBox</Text>
          </View>

          {/* GitHub In-App Auto-Update Button */}
          <TouchableOpacity
            style={styles.updateCheckBtn}
            onPress={handleManualCheckUpdate}
            disabled={checkingUpdate}
            activeOpacity={0.8}
          >
            {checkingUpdate ? (
              <ActivityIndicator size="small" color="#10B981" />
            ) : (
              <CloudDownloadIcon size={18} color="#10B981" />
            )}
            <Text style={styles.updateCheckBtnText}>
              {checkingUpdate ? 'Checking GitHub Releases...' : 'Check for GitHub Updates'}
            </Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>

      {/* Biometric Verification Modal */}
      <Modal
        visible={showBioModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBioModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.bioModalCard}>
            <View style={styles.bioModalHeader}>
              <View style={styles.bioModalIconRing}>
                <FingerprintIcon size={32} color={colors.primary} />
              </View>
              <Text style={styles.bioModalTitle}>Enable Biometrics</Text>
              <Text style={styles.bioModalSubtitle}>
                Enter your master password to authorize and enroll your fingerprint in Android Keystore.
              </Text>
            </View>

            <Input
              label="Master Password"
              value={bioPassword}
              onChangeText={text => {
                setBioPassword(text);
                setBioError(null);
              }}
              placeholder="Enter master password"
              isPassword
              error={bioError}
            />

            <View style={styles.bioModalActions}>
              <Button
                title={t('cancel')}
                variant="ghost"
                onPress={() => setShowBioModal(false)}
                style={styles.bioModalBtn}
              />
              <Button
                title="Verify & Enroll"
                onPress={handleConfirmEnableBio}
                loading={enrollingBio}
                style={styles.bioModalBtn}
                icon={<LockIcon size={18} color={colors.white} />}
              />
            </View>
          </Card>
        </View>
      </Modal>

      {/* Global Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.langModalCard}>
            <View style={styles.langModalHeader}>
              <View style={styles.langModalTitleRow}>
                <GlobeIcon size={24} color={colors.primary} />
                <View style={styles.langModalTextCol}>
                  <Text style={styles.langModalTitle}>{t('languagesTitle')}</Text>
                  <Text style={styles.langModalSubtitle}>{t('selectLanguage')}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.langCloseBtn}
                onPress={() => setShowLanguageModal(false)}
              >
                <CloseIcon size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Language Search */}
            <View style={styles.langSearchBox}>
              <SearchIcon size={18} color={colors.textMuted} />
              <TextInput
                style={styles.langSearchInput}
                placeholder={t('searchLanguage')}
                placeholderTextColor={colors.textMuted}
                value={languageSearch}
                onChangeText={setLanguageSearch}
              />
            </View>

            {/* Language List */}
            <ScrollView style={styles.langListScroll} showsVerticalScrollIndicator={false}>
              {filteredLanguages.map(item => {
                const isSelected = language === item.code;
                return (
                  <TouchableOpacity
                    key={item.code}
                    style={[styles.langItemRow, isSelected && styles.langItemRowActive]}
                    onPress={() => handleLanguageChange(item.code)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.langItemLeft}>
                      <Text style={styles.langItemFlag}>{item.flag}</Text>
                      <View style={styles.langItemTextCol}>
                        <Text style={[styles.langItemNative, isSelected && styles.langItemNativeActive]}>
                          {item.nativeName}
                        </Text>
                        <Text style={styles.langItemEnglish}>
                          {item.name} ({item.code.toUpperCase()})
                        </Text>
                      </View>
                    </View>
                    {isSelected ? (
                      <View style={styles.langCheckBadge}>
                        <CheckIcon size={14} color={colors.white} />
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Card>
        </View>
      </Modal>

      {/* GitHub In-App Update Modal */}
      <UpdateModal
        visible={showManualUpdateModal}
        updateInfo={manualUpdateInfo}
        onClose={() => setShowManualUpdateModal(false)}
      />

      {/* Setup & Permissions Checklist Modal */}
      <SetupOnboardingModal
        visible={showSetupModal}
        onClose={() => setShowSetupModal(false)}
      />

      {/* Zero-Knowledge Cloud & LAN Sync Guide Modal */}
      <CloudSyncGuideModal
        visible={showSyncGuideModal}
        onClose={() => setShowSyncGuideModal(false)}
      />

      {/* Emergency Access & Digital Recovery Kit Modal */}
      <Modal
        visible={showEmergencyKitModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEmergencyKitModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={[styles.langModalCard, { maxHeight: '85%' }]}>
            <View style={styles.langModalHeader}>
              <View style={styles.langModalTitleRow}>
                <ShieldIcon size={22} color={colors.primary} />
                <View style={styles.langModalTextCol}>
                  <Text style={[styles.langModalTitle, { color: colors.text }]}>
                    Emergency Recovery Kit
                  </Text>
                  <Text style={styles.langModalSubtitle}>
                    Standardized zero-knowledge recovery capsule
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.langCloseBtn}
                onPress={() => setShowEmergencyKitModal(false)}
              >
                <CloseIcon size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 360, marginVertical: spacing.md, backgroundColor: colors.background, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontFamily: 'monospace', fontSize: 11, color: colors.text }}>
                {emergencyKitText}
              </Text>
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button
                title="Copy Recovery Kit"
                onPress={handleCopyEmergencyKit}
                style={{ flex: 1 }}
              />
              <Button
                title="Close"
                variant="secondary"
                onPress={() => setShowEmergencyKitModal(false)}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  },
  cardSectionTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.primaryLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.base,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingIconCol: {
    width: 36,
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  settingText: {
    flex: 1,
    paddingRight: spacing.base,
  },
  settingLabel: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  settingDesc: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  optionSection: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.cardSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.primaryLight,
    fontWeight: typography.fontWeights.semibold,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  navRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  navText: {
    flex: 1,
  },
  changePassBtn: {
    marginTop: spacing.xs,
  },
  passwordChangeBox: {
    backgroundColor: colors.cardSecondary,
    padding: spacing.base,
    borderRadius: radius.md,
    marginTop: spacing.xs,
  },
  passChangeActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  eraseBtn: {
    marginTop: spacing.lg,
  },
  aboutCard: {
    padding: spacing.lg,
    backgroundColor: colors.cardSecondary,
    borderColor: colors.borderLight,
    borderWidth: 1,
  },
  aboutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  aboutLogo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  aboutTextWrap: {
    flex: 1,
  },
  aboutTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  aboutVersion: {
    fontSize: typography.fontSizes.xs,
    color: colors.primaryLight,
    fontWeight: typography.fontWeights.medium,
  },
  aboutSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  specLabel: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
  },
  specValue: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  updateCheckBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  updateCheckBtnText: {
    color: '#10B981',
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  bioModalCard: {
    padding: spacing.xl,
    backgroundColor: colors.card,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    borderWidth: 1.5,
  },
  bioModalHeader: {
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  bioModalIconRing: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  bioModalTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  bioModalSubtitle: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  bioModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  bioModalBtn: {
    flex: 1,
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  themeCard: {
    width: '48%',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1.5,
  },
  themeCardSelected: {
    borderWidth: 2,
  },
  themePreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  swatchRow: {
    flexDirection: 'row',
    gap: 4,
  },
  swatchDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  themeCheckBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
  },
  themeSubtitle: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  langSelectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.cardSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  langSelectPillText: {
    fontSize: typography.fontSizes.xs,
    color: colors.primaryLight,
    fontWeight: typography.fontWeights.medium,
  },
  langModalCard: {
    maxHeight: '80%',
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderColor: colors.borderLight,
    borderWidth: 1,
  },
  langModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  langModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  langModalTextCol: {
    gap: 2,
  },
  langModalTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  langModalSubtitle: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
  },
  langCloseBtn: {
    padding: spacing.xs,
  },
  langSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.cardSecondary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  langSearchInput: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    color: colors.text,
    paddingVertical: 6,
  },
  langListScroll: {
    maxHeight: 340,
  },
  langItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  langItemRowActive: {
    backgroundColor: colors.primaryMuted,
    borderBottomColor: 'transparent',
  },
  langItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  langItemFlag: {
    fontSize: 24,
  },
  langItemTextCol: {
    flex: 1,
  },
  langItemNative: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  langItemNativeActive: {
    color: colors.primaryLight,
  },
  langItemEnglish: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  langCheckBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
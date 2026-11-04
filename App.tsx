import React, { useState, useEffect } from 'react';
import {
  StatusBar,
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  BackHandler,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { colors } from './src/theme/colors';
import { typography, spacing, useTheme } from './src/theme';

import { useVaultStore } from './src/stores/vaultStore';
import { VaultItemSummary } from './src/types';
import { MasterPasswordSetupScreen } from './src/screens/auth/MasterPasswordSetupScreen';
import { UnlockScreen } from './src/screens/auth/UnlockScreen';
import { VaultHomeScreen } from './src/screens/vault/VaultHomeScreen';
import { ItemDetailScreen } from './src/screens/vault/ItemDetailScreen';
import { ItemEditScreen } from './src/screens/vault/ItemEditScreen';
import { PasswordGeneratorScreen } from './src/screens/generator/PasswordGeneratorScreen';
import { SecurityDashboardScreen } from './src/screens/security/SecurityDashboardScreen';
import { BackupRestoreScreen } from './src/screens/backup/BackupRestoreScreen';
import { SettingsScreen } from './src/screens/settings/SettingsScreen';
import { AuditLogScreen } from './src/screens/settings/AuditLogScreen';
import { AuthenticatorScreen } from './src/screens/vault/AuthenticatorScreen';
import {
  LockIcon,
  KeyIcon,
  ShieldCheckIcon,
  SettingsIcon,
  FolderIcon,
  QrCodeIcon,
} from './src/components/icons';
import { SecurityWarningModal } from './src/components/common/SecurityWarningModal';
import { UpdateModal } from './src/components/common/UpdateModal';
import { SetupOnboardingModal } from './src/components/common/SetupOnboardingModal';
import { securityNative, updateNative, UpdateInfo, permissionsNative } from './src/services/nativeBridge';

type ActiveScreen =
  | 'HOME'
  | 'AUTHENTICATOR'
  | 'DETAIL'
  | 'EDIT'
  | 'GENERATOR'
  | 'SECURITY'
  | 'BACKUP'
  | 'SETTINGS'
  | 'AUDIT_LOG';

function AppContent(): React.JSX.Element {
  const { lockState, checkInitialStatus } = useVaultStore();
  const { colors } = useTheme();

  const [currentScreen, setCurrentScreen] = useState<ActiveScreen>('HOME');
  const [selectedItem, setSelectedItem] = useState<VaultItemSummary | null>(null);
  const [securityThreats, setSecurityThreats] = useState<string[]>([]);
  const [showSecurityWarning, setShowSecurityWarning] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);

  useEffect(() => {
    checkInitialStatus();

    // Check device security (Root, Frida, Debugger)
    securityNative.checkDeviceSecurity().then(status => {
      if (status && status.isCompromised) {
        setSecurityThreats(status.threats || []);
        setShowSecurityWarning(true);
      }
    }).catch(() => {});

    // Check for app updates from GitHub Releases
    updateNative.checkForUpdate().then(info => {
      if (info && info.hasUpdate) {
        setUpdateInfo(info);
        setShowUpdateModal(true);
      }
    }).catch(() => {});

    // Check post-install setup & permissions
    permissionsNative.checkSetupStatus().then(status => {
      if (status && (!status.autofillEnabled || !status.ignoringBatteryOptimizations)) {
        setShowSetupModal(true);
      }
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hardware back button handler
  useEffect(() => {
    const onBackPress = () => {
      if (currentScreen !== 'HOME') {
        setCurrentScreen('HOME');
        setSelectedItem(null);
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [currentScreen]);

  // Loading / Checking state
  if (lockState === 'CHECKING') {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.logoCircle, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
          <LockIcon size={40} color={colors.primary} />
        </View>
        <Text style={[styles.logoTitle, { color: colors.text }]}>VaultKey</Text>
        <Text style={[styles.logoSubtitle, { color: colors.textSecondary }]}>Zero-Knowledge Credential Vault</Text>
        <ActivityIndicator color={colors.primary} size="large" style={styles.spinner} />
      </View>
    );
  }


  // First-run setup state
  if (lockState === 'UNINITIALIZED') {
    return <MasterPasswordSetupScreen />;
  }

  // Locked state
  if (lockState === 'LOCKED') {
    return <UnlockScreen />;
  }

  // Render current screen
  const renderScreen = () => {
    switch (currentScreen) {
      case 'DETAIL':
        return selectedItem ? (
          <ItemDetailScreen
            item={selectedItem}
            onBack={() => {
              setCurrentScreen('HOME');
              setSelectedItem(null);
            }}
            onEdit={() => setCurrentScreen('EDIT')}
          />
        ) : (
          <VaultHomeScreen
            onSelectItem={item => {
              setSelectedItem(item);
              setCurrentScreen('DETAIL');
            }}
            onAddNew={() => setCurrentScreen('EDIT')}
            onOpenSettings={() => setCurrentScreen('SETTINGS')}
            onOpenSecurity={() => setCurrentScreen('SECURITY')}
            onOpenGenerator={() => setCurrentScreen('GENERATOR')}
            onOpenBackup={() => setCurrentScreen('BACKUP')}
          />
        );
      case 'EDIT':
        return (
          <ItemEditScreen
            onBack={() => setCurrentScreen(selectedItem ? 'DETAIL' : 'HOME')}
            onSaved={() => {
              setCurrentScreen('HOME');
              setSelectedItem(null);
            }}
          />
        );
      case 'GENERATOR':
        return <PasswordGeneratorScreen onBack={() => setCurrentScreen('HOME')} />;
      case 'SECURITY':
        return (
          <SecurityDashboardScreen
            onBack={() => setCurrentScreen('HOME')}
            onSelectItem={item => {
              setSelectedItem(item);
              setCurrentScreen('DETAIL');
            }}
          />
        );
      case 'BACKUP':
        return <BackupRestoreScreen onBack={() => setCurrentScreen('HOME')} />;
      case 'SETTINGS':
        return (
          <SettingsScreen
            onBack={() => setCurrentScreen('HOME')}
            onOpenAuditLog={() => setCurrentScreen('AUDIT_LOG')}
          />
        );
      case 'AUDIT_LOG':
        return <AuditLogScreen onBack={() => setCurrentScreen('SETTINGS')} />;
      case 'AUTHENTICATOR':
        return <AuthenticatorScreen />;
      case 'HOME':
      default:
        return (
          <VaultHomeScreen
            onSelectItem={item => {
              setSelectedItem(item);
              setCurrentScreen('DETAIL');
            }}
            onAddNew={() => {
              setSelectedItem(null);
              setCurrentScreen('EDIT');
            }}
            onOpenSettings={() => setCurrentScreen('SETTINGS')}
            onOpenSecurity={() => setCurrentScreen('SECURITY')}
            onOpenGenerator={() => setCurrentScreen('GENERATOR')}
            onOpenBackup={() => setCurrentScreen('BACKUP')}
          />
        );
    }
  };

  // Show bottom tab bar only on top-level tabs
  const showBottomNav =
    currentScreen === 'HOME' ||
    currentScreen === 'AUTHENTICATOR' ||
    currentScreen === 'GENERATOR' ||
    currentScreen === 'SECURITY' ||
    currentScreen === 'SETTINGS';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.mainArea}>{renderScreen()}</View>

      {showBottomNav ? (
        <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setCurrentScreen('HOME')}
            accessibilityRole="button"
            accessibilityLabel="Vault"
          >
            <FolderIcon
              size={22}
              color={currentScreen === 'HOME' ? colors.primaryLight : colors.textMuted}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: currentScreen === 'HOME' ? colors.primaryLight : colors.textMuted },
                currentScreen === 'HOME' && styles.tabLabelActive,
              ]}
            >
              Vault
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setCurrentScreen('AUTHENTICATOR')}
            accessibilityRole="button"
            accessibilityLabel="2FA"
          >
            <QrCodeIcon
              size={22}
              color={currentScreen === 'AUTHENTICATOR' ? colors.primaryLight : colors.textMuted}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: currentScreen === 'AUTHENTICATOR' ? colors.primaryLight : colors.textMuted },
                currentScreen === 'AUTHENTICATOR' && styles.tabLabelActive,
              ]}
            >
              2FA Codes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setCurrentScreen('GENERATOR')}
            accessibilityRole="button"
            accessibilityLabel="Generator"
          >
            <KeyIcon
              size={22}
              color={currentScreen === 'GENERATOR' ? colors.primaryLight : colors.textMuted}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: currentScreen === 'GENERATOR' ? colors.primaryLight : colors.textMuted },
                currentScreen === 'GENERATOR' && styles.tabLabelActive,
              ]}
            >
              Generator
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setCurrentScreen('SECURITY')}
            accessibilityRole="button"
            accessibilityLabel="Security"
          >
            <ShieldCheckIcon
              size={22}
              color={currentScreen === 'SECURITY' ? colors.primaryLight : colors.textMuted}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: currentScreen === 'SECURITY' ? colors.primaryLight : colors.textMuted },
                currentScreen === 'SECURITY' && styles.tabLabelActive,
              ]}
            >
              Security
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setCurrentScreen('SETTINGS')}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <SettingsIcon
              size={22}
              color={currentScreen === 'SETTINGS' ? colors.primaryLight : colors.textMuted}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: currentScreen === 'SETTINGS' ? colors.primaryLight : colors.textMuted },
                currentScreen === 'SETTINGS' && styles.tabLabelActive,
              ]}
            >
              Settings
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Security Warning Modal for Root / Frida / Debugger */}
      <SecurityWarningModal
        visible={showSecurityWarning}
        threats={securityThreats}
        onAcknowledge={() => setShowSecurityWarning(false)}
      />

      {/* In-App GitHub Releases Update Modal */}
      <UpdateModal
        visible={showUpdateModal}
        updateInfo={updateInfo}
        onClose={() => setShowUpdateModal(false)}
      />

      {/* Permissions & Setup Checklist Modal */}
      <SetupOnboardingModal
        visible={showSetupModal}
        onClose={() => setShowSetupModal(false)}
      />
    </View>
  );
}

function MainContainer(): React.JSX.Element {
  const { colors, isDark } = useTheme();

  useEffect(() => {
    (StatusBar as any)?.setBackgroundColor?.(colors.background, true);
  }, [colors.background]);


  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <AppContent />
    </SafeAreaView>
  );
}


export default function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <MainContainer />
    </SafeAreaProvider>
  );
}


const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mainArea: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.cardSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.base,
  },
  logoTitle: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  logoSubtitle: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    letterSpacing: 1,
  },
  spinner: {
    marginTop: spacing.xxl,
  },
  bottomBar: {
    height: 60,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.sm,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: spacing.xs,
  },
  tabLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 3,
    fontWeight: typography.fontWeights.medium,
  },
  tabLabelActive: {
    color: colors.primaryLight,
    fontWeight: typography.fontWeights.bold,
  },
});
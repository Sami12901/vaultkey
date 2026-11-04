import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from './theme';
import { useTranslation } from './i18n';
import { vaultDesktop } from './services/vaultService';
import { MasterPasswordSetupScreen } from './screens/MasterPasswordSetupScreen';
import { UnlockScreen } from './screens/UnlockScreen';
import { VaultView } from './screens/VaultView';
import { PasswordGeneratorModal } from './components/PasswordGeneratorModal';
import { SecurityDashboardModal } from './components/SecurityDashboardModal';
import { BackupRestoreModal } from './components/BackupRestoreModal';
import { SettingsModal } from './components/SettingsModal';
import { ShieldIcon } from './components/Icons';

type AppVaultState = 'CHECKING' | 'UNINITIALIZED' | 'LOCKED' | 'UNLOCKED';

export const App: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const [vaultState, setVaultState] = useState<AppVaultState>('CHECKING');
  const [showGenerator, setShowGenerator] = useState<boolean>(false);
  const [showSecurity, setShowSecurity] = useState<boolean>(false);
  const [showBackup, setShowBackup] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [vaultRefreshKey, setVaultRefreshKey] = useState<number>(0);

  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const IDLE_LIMIT_MS = 15 * 60 * 1000;

  const checkStatus = useCallback(async () => {
    try {
      const state = await vaultDesktop.getVaultState();
      setVaultState(state);
    } catch (err) {
      console.error('Failed to get vault state:', err);
      setVaultState('LOCKED');
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const handleLock = useCallback(async () => {
    try {
      await vaultDesktop.lock();
    } catch (err) {
      console.error('Failed to lock vault:', err);
    } finally {
      setVaultState('LOCKED');
      setShowGenerator(false);
      setShowSecurity(false);
      setShowBackup(false);
      setShowSettings(false);
    }
  }, []);

  useEffect(() => {
    if (vaultState !== 'UNLOCKED') {
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
      return;
    }

    const resetTimer = () => {
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
      idleTimeoutRef.current = setTimeout(() => {
        handleLock();
      }, IDLE_LIMIT_MS);
    };

    resetTimer();

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(evt => window.addEventListener(evt, resetTimer, { passive: true }));

    return () => {
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
      events.forEach(evt => window.removeEventListener(evt, resetTimer));
    };
  }, [vaultState, handleLock]);

  const handleRefreshVault = () => {
    setVaultRefreshKey(prev => prev + 1);
  };

  useEffect(() => {
    const unsub = vaultDesktop.onVaultUpdated(() => {
      handleRefreshVault();
    });
    return () => unsub();
  }, []);

  if (vaultState === 'CHECKING') {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          backgroundColor: colors.background,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: colors.text,
          fontFamily: 'Inter, system-ui, sans-serif',
          gap: 16,
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            background: 'linear-gradient(135deg, ' + colors.primary + ', #065F46)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 30px ' + colors.primary + '33',
          }}
        >
          <ShieldIcon size={36} color="#FFFFFF" />
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.5 }}>
          {t('appTitle') || 'VaultKey'}
        </div>
        <div style={{ fontSize: 13, color: colors.textSecondary }}>
          {t('appSubtitle') || 'Zero-Knowledge Security Manager'}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: colors.background,
        color: colors.text,
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      {vaultState === 'UNINITIALIZED' && (
        <MasterPasswordSetupScreen
          onInitialized={() => {
            setVaultState('UNLOCKED');
          }}
        />
      )}

      {vaultState === 'LOCKED' && (
        <UnlockScreen
          onUnlocked={() => {
            setVaultState('UNLOCKED');
          }}
          onResetVault={() => {
            setVaultState('UNINITIALIZED');
          }}
        />
      )}

      {vaultState === 'UNLOCKED' && (
        <VaultView
          key={vaultRefreshKey}
          onOpenGenerator={() => setShowGenerator(true)}
          onOpenSecurity={() => setShowSecurity(true)}
          onOpenBackup={() => setShowBackup(true)}
          onOpenSettings={() => setShowSettings(true)}
          onLock={handleLock}
        />
      )}

      <PasswordGeneratorModal
        isOpen={showGenerator}
        onClose={() => setShowGenerator(false)}
      />

      <SecurityDashboardModal
        isOpen={showSecurity}
        onClose={() => setShowSecurity(false)}
      />

      <BackupRestoreModal
        isOpen={showBackup}
        onClose={() => setShowBackup(false)}
        onRefreshVault={handleRefreshVault}
      />

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onLock={handleLock}
      />
    </div>
  );
};

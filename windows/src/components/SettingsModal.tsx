import React, { useState, useEffect } from 'react';
import { useTheme } from '../theme';
import { useTranslation, SUPPORTED_LANGUAGES } from '../i18n';
import { SettingsIcon, LockIcon } from './Icons';
import { vaultDesktop } from '../services/vaultService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLock: () => void;
}

const THEME_OPTIONS = [
  { id: 'dark', name: 'Obsidian Emerald', primary: '#10B981', bg: '#0B0F19' },
  { id: 'oled', name: 'Midnight OLED', primary: '#06B6D4', bg: '#000000' },
  { id: 'slate', name: 'Nordic Slate', primary: '#38BDF8', bg: '#0F172A' },
  { id: 'amethyst', name: 'Royal Amethyst', primary: '#A855F7', bg: '#0F0B1A' },
  { id: 'light', name: 'Executive Light', primary: '#0D9488', bg: '#F8FAFC' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onLock,
}) => {
  const { theme, setTheme, colors } = useTheme();
  const { language, setLanguage, t } = useTranslation();

  const [currentPass, setCurrentPass] = useState<string>('');
  const [newPass, setNewPass] = useState<string>('');
  const [confirmPass, setConfirmPass] = useState<string>('');
  const [passMessage, setPassMessage] = useState<string | null>(null);

  const [runInBackground, setRunInBackground] = useState<boolean>(true);
  const [startAtLogin, setStartAtLogin] = useState<boolean>(false);
  const [autoLockSeconds, setAutoLockSeconds] = useState<number>(300);
  const [screenSecurity, setScreenSecurity] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen) {
      vaultDesktop.getSettings().then((s: any) => {
        if (s) {
          if (s.runInBackground !== undefined) setRunInBackground(s.runInBackground);
          if (s.autoLockSeconds !== undefined) setAutoLockSeconds(s.autoLockSeconds);
          if (s.screenSecurity !== undefined) setScreenSecurity(s.screenSecurity);
        }
      });
      vaultDesktop.getStartupSettings().then((res: any) => {
        if (res && res.openAtLogin !== undefined) {
          setStartAtLogin(res.openAtLogin);
        }
      });
    }
  }, [isOpen]);

  const handleToggleRunInBackground = async (val: boolean) => {
    setRunInBackground(val);
    await vaultDesktop.updateSettings({ runInBackground: val });
  };

  const handleToggleStartAtLogin = async (val: boolean) => {
    setStartAtLogin(val);
    await vaultDesktop.setStartupSettings(val);
  };

  const handleToggleScreenSecurity = async (val: boolean) => {
    setScreenSecurity(val);
    await vaultDesktop.updateSettings({ screenSecurity: val });
  };

  const handleChangeAutoLock = async (secs: number) => {
    setAutoLockSeconds(secs);
    await vaultDesktop.updateSettings({ autoLockSeconds: secs });
  };

  if (!isOpen) return null;

  const handleChangePassword = async () => {
    if (!currentPass || !newPass) {
      alert('Please fill in both current and new password');
      return;
    }
    if (newPass.length < 8) {
      alert('New password must be at least 8 characters');
      return;
    }
    if (newPass !== confirmPass) {
      alert('New passwords do not match');
      return;
    }

    try {
      await vaultDesktop.changeMasterPassword(currentPass, newPass);
      setPassMessage('Master password changed successfully!');
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
    } catch (e: any) {
      alert(e?.message || 'Failed to change master password');
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
          width: '600px',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SettingsIcon size={22} color={colors.primary} />
            <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>{t('settings')}</h2>
          </div>
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

        {/* Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {/* Themes */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>{t('theme')}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '10px' }}>
              {THEME_OPTIONS.map((item) => {
                const isSelected = theme === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setTheme(item.id);
                      vaultDesktop.updateSettings({ theme: item.id });
                    }}
                    style={{
                      border: `2px solid ${isSelected ? colors.primary : colors.border}`,
                      borderRadius: '10px',
                      padding: '10px',
                      background: item.bg,
                      color: item.id === 'light' ? '#0F172A' : '#FFFFFF',
                      textAlign: 'center',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: item.primary,
                        border: '2px solid rgba(255,255,255,0.2)',
                      }}
                    />
                    <span style={{ fontSize: '11px', fontWeight: 600 }}>{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Languages */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>{t('language')} (15 Languages)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isSelected = language === lang.code;
                return (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code);
                      vaultDesktop.updateSettings({ language: lang.code });
                    }}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${isSelected ? colors.primary : colors.border}`,
                      background: isSelected ? colors.primaryMuted : colors.cardSecondary,
                      color: colors.text,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '12px',
                      textAlign: 'left',
                    }}
                  >
                    <span>{lang.flag}</span>
                    <span style={{ fontWeight: isSelected ? 600 : 400 }}>{lang.nativeName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Background & System Startup */}
          <div
            style={{
              padding: '18px',
              borderRadius: '12px',
              backgroundColor: colors.cardSecondary,
              border: `1px solid ${colors.border}`,
              marginBottom: '24px',
            }}
          >
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '14px', color: colors.text }}>
              {t('backgroundAndStartup') || 'Background & Startup'}
            </h3>

            {/* Toggle Run in Background */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '14px',
                borderBottom: `1px solid ${colors.border}`,
                marginBottom: '14px',
              }}
            >
              <div style={{ paddingRight: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: colors.text, marginBottom: '2px' }}>
                  {t('runInBackground') || 'Keep Running in Background'}
                </div>
                <div style={{ fontSize: '12px', color: colors.textSecondary, lineHeight: '1.4' }}>
                  {t('runInBackgroundDesc') || 'When you close the window, VaultKey stays active in the system tray so Chrome/Edge can auto-save and autofill passwords.'}
                </div>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', flexShrink: 0 }}>
                <input
                  type="checkbox"
                  checked={runInBackground}
                  onChange={(e) => handleToggleRunInBackground(e.target.checked)}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span
                  style={{
                    position: 'absolute',
                    cursor: 'pointer',
                    inset: 0,
                    backgroundColor: runInBackground ? colors.primary : '#475569',
                    borderRadius: '24px',
                    transition: '0.2s',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      content: '""',
                      height: '18px',
                      width: '18px',
                      left: runInBackground ? '22px' : '3px',
                      bottom: '3px',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      transition: '0.2s',
                    }}
                  />
                </span>
              </label>
            </div>

            {/* Toggle Launch on Windows Startup */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '14px',
                borderBottom: `1px solid ${colors.border}`,
                marginBottom: '14px',
              }}
            >
              <div style={{ paddingRight: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: colors.text, marginBottom: '2px' }}>
                  {t('startAtLogin') || 'Launch on Windows Startup'}
                </div>
                <div style={{ fontSize: '12px', color: colors.textSecondary, lineHeight: '1.4' }}>
                  {t('startAtLoginDesc') || 'Automatically start VaultKey in the background when your computer turns on.'}
                </div>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', flexShrink: 0 }}>
                <input
                  type="checkbox"
                  checked={startAtLogin}
                  onChange={(e) => handleToggleStartAtLogin(e.target.checked)}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span
                  style={{
                    position: 'absolute',
                    cursor: 'pointer',
                    inset: 0,
                    backgroundColor: startAtLogin ? colors.primary : '#475569',
                    borderRadius: '24px',
                    transition: '0.2s',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      content: '""',
                      height: '18px',
                      width: '18px',
                      left: startAtLogin ? '22px' : '3px',
                      bottom: '3px',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      transition: '0.2s',
                    }}
                  />
                </span>
              </label>
            </div>

            {/* Toggle Screen Capture Protection */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '14px',
                borderBottom: `1px solid ${colors.border}`,
                marginBottom: '14px',
              }}
            >
              <div style={{ paddingRight: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: colors.text, marginBottom: '2px' }}>
                  {t('screenSecurity') || 'Screen Capture & Share Protection'}
                </div>
                <div style={{ fontSize: '12px', color: colors.textSecondary, lineHeight: '1.4' }}>
                  {t('screenSecurityDesc') || 'Blocks screenshots, screen recording, and screen sharing (OBS, Zoom, Discord, Snipping Tool) — the app renders as a black screen to protect your passwords.'}
                </div>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', flexShrink: 0 }}>
                <input
                  type="checkbox"
                  checked={screenSecurity}
                  onChange={(e) => handleToggleScreenSecurity(e.target.checked)}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span
                  style={{
                    position: 'absolute',
                    cursor: 'pointer',
                    inset: 0,
                    backgroundColor: screenSecurity ? colors.primary : '#475569',
                    borderRadius: '24px',
                    transition: '0.2s',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      content: '""',
                      height: '18px',
                      width: '18px',
                      left: screenSecurity ? '22px' : '3px',
                      bottom: '3px',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      transition: '0.2s',
                    }}
                  />
                </span>
              </label>
            </div>

            {/* Auto-Lock Inactivity Timer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: colors.text, marginBottom: '2px' }}>
                  {t('autoLockTimer') || 'Auto-Lock Inactivity Timer'}
                </div>
                <div style={{ fontSize: '12px', color: colors.textSecondary }}>
                  {t('autoLockDesc') || 'Automatically lock the vault after being away from your computer.'}
                </div>
              </div>
              <select
                value={autoLockSeconds}
                onChange={(e) => handleChangeAutoLock(Number(e.target.value))}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.background,
                  color: colors.text,
                  fontSize: '13px',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value={60}>{t('minutes1') || '1 Minute'}</option>
                <option value={300}>{t('minutes5') || '5 Minutes'}</option>
                <option value={900}>{t('minutes15') || '15 Minutes'}</option>
                <option value={1800}>{t('minutes30') || '30 Minutes'}</option>
                <option value={3600}>{t('hours1') || '1 Hour'}</option>
                <option value={0}>{t('never') || 'Never'}</option>
              </select>
            </div>
          </div>

          {/* Change Master Password */}
          <div
            style={{
              padding: '16px',
              borderRadius: '10px',
              backgroundColor: colors.cardSecondary,
              border: `1px solid ${colors.border}`,
              marginBottom: '20px',
            }}
          >
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Change Master Password</h3>
            <input
              type="password"
              placeholder="Current Master Password"
              value={currentPass}
              onChange={(e) => setCurrentPass(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: `1px solid ${colors.border}`,
                background: colors.background,
                color: colors.text,
                marginBottom: '8px',
                outline: 'none',
              }}
            />
            <input
              type="password"
              placeholder="New Master Password (min 8 chars)"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: `1px solid ${colors.border}`,
                background: colors.background,
                color: colors.text,
                marginBottom: '8px',
                outline: 'none',
              }}
            />
            <input
              type="password"
              placeholder="Confirm New Master Password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: `1px solid ${colors.border}`,
                background: colors.background,
                color: colors.text,
                marginBottom: '12px',
                outline: 'none',
              }}
            />

            <button
              onClick={handleChangePassword}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                background: colors.primary,
                color: '#FFFFFF',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Update Password
            </button>

            {passMessage && (
              <div style={{ marginTop: '10px', color: colors.primary, fontSize: '12px', fontWeight: 600 }}>
                {passMessage}
              </div>
            )}
          </div>

          {/* Quick Lock Action */}
          <button
            onClick={() => {
              onClose();
              onLock();
            }}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: `1px solid ${colors.danger}`,
              background: colors.dangerLight,
              color: colors.danger,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <LockIcon size={18} color={colors.danger} /> Lock Vault Immediately
          </button>
        </div>
      </div>
    </div>
  );
};

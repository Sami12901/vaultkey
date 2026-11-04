import React, { useState } from 'react';
import { useTheme } from '../theme';
import { useTranslation } from '../i18n';
import { LockIcon, ShieldIcon } from '../components/Icons';
import { vaultDesktop } from '../services/vaultService';

interface MasterPasswordSetupScreenProps {
  onInitialized: () => void;
}

export const MasterPasswordSetupScreen: React.FC<MasterPasswordSetupScreenProps> = ({
  onInitialized,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await vaultDesktop.initializeVault(password);
      onInitialized();
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize vault');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background,
        color: colors.text,
      }}
    >
      <div
        style={{
          width: '460px',
          padding: '36px',
          backgroundColor: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: colors.primaryMuted,
              border: `2px solid ${colors.primary}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <ShieldIcon size={32} color={colors.primary} />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '6px' }}>{t('setupVault')}</h1>
          <p style={{ fontSize: '13px', color: colors.textSecondary, lineHeight: '20px' }}>
            {t('setupSubtitle')}
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '12px',
              backgroundColor: colors.dangerLight,
              color: colors.danger,
              borderRadius: '8px',
              fontSize: '13px',
              marginBottom: '16px',
              border: `1px solid ${colors.danger}`,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSetup}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              {t('enterMasterPass')}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters..."
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '8px',
                border: `1px solid ${colors.border}`,
                backgroundColor: colors.cardSecondary,
                color: colors.text,
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              {t('confirmMasterPass')}
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter master password..."
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '8px',
                border: `1px solid ${colors.border}`,
                backgroundColor: colors.cardSecondary,
                color: colors.text,
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: colors.primary,
              color: '#FFFFFF',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <LockIcon size={18} />
            {loading ? 'Initializing Zero-Knowledge Vault...' : 'Initialize Vault'}
          </button>
        </form>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useTheme } from '../theme';
import { useTranslation } from '../i18n';
import { LockIcon, UnlockIcon } from '../components/Icons';
import { vaultDesktop } from '../services/vaultService';

interface UnlockScreenProps {
  onUnlocked: () => void;
  onResetVault?: () => void;
}

export const UnlockScreen: React.FC<UnlockScreenProps> = ({ onUnlocked, onResetVault }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setLoading(true);
    setError(null);
    try {
      const success = await vaultDesktop.unlock(password);
      if (success) {
        onUnlocked();
      } else {
        setError('Incorrect master password');
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication error');
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
          width: '420px',
          padding: '36px',
          backgroundColor: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          textAlign: 'center',
        }}
      >
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
          <LockIcon size={30} color={colors.primary} />
        </div>

        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '6px' }}>VaultKey</h1>
        <p style={{ fontSize: '13px', color: colors.textSecondary, marginBottom: '24px' }}>
          Zero-Knowledge Password Manager
        </p>

        {error && (
          <div
            style={{
              padding: '10px',
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

        <form onSubmit={handleUnlock}>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('enterMasterPass')}
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
              marginBottom: '16px',
              textAlign: 'center',
            }}
          />

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
            <UnlockIcon size={18} color="#FFFFFF" />
            {loading ? 'Unlocking Vault...' : t('unlock')}
          </button>
        </form>

        <div style={{ marginTop: '20px', borderTop: `1px solid ${colors.border}`, paddingTop: '16px' }}>
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            style={{
              background: 'none',
              border: 'none',
              color: colors.textSecondary,
              fontSize: '13px',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: '4px 8px',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
            onMouseLeave={(e) => (e.currentTarget.style.color = colors.textSecondary)}
          >
            {t('forgotPassword') || 'Forgot Master Password? Reset Vault'}
          </button>
        </div>

        {showResetConfirm && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              backdropFilter: 'blur(4px)',
            }}
          >
            <div
              style={{
                width: '420px',
                padding: '28px',
                backgroundColor: colors.card,
                borderRadius: '16px',
                border: `1px solid ${colors.border}`,
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#EF4444',
                    fontSize: '20px',
                    fontWeight: 'bold',
                  }}
                >
                  !
                </div>
                <h3 style={{ margin: 0, fontSize: '18px', color: colors.text }}>
                  Reset Master Password?
                </h3>
              </div>
              <p style={{ fontSize: '13px', color: colors.textSecondary, lineHeight: '1.6', marginBottom: '20px' }}>
                VaultKey uses <strong>zero-knowledge encryption</strong>. If you forgot your master password, it cannot be recovered without a reset.
                <br /><br />
                Resetting will clear the lock on this computer and allow you to <strong>create a brand new master password</strong>. If you have a <code>.vkb</code> backup file from mobile or PC, you can easily restore all your items after resetting.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  disabled={resetting}
                  onClick={() => setShowResetConfirm(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.border}`,
                    backgroundColor: colors.cardSecondary,
                    color: colors.text,
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={resetting}
                  onClick={async () => {
                    setResetting(true);
                    try {
                      await vaultDesktop.resetVault();
                      setShowResetConfirm(false);
                      if (onResetVault) {
                        onResetVault();
                      }
                    } catch (err) {
                      console.error('Failed to reset vault:', err);
                    } finally {
                      setResetting(false);
                    }
                  }}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#EF4444',
                    color: '#FFFFFF',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  {resetting ? 'Resetting...' : 'Yes, Reset Vault'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

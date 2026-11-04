import React, { useEffect, useState } from 'react';
import { useTheme } from '../theme';
import { useTranslation } from '../i18n';
import { ShieldIcon } from './Icons';
import { vaultDesktop } from '../services/vaultService';
import { SecurityAnalysis } from '../types';

interface SecurityDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectItem?: (id: string) => void;
}

export const SecurityDashboardModal: React.FC<SecurityDashboardModalProps> = ({
  isOpen,
  onClose,
  onSelectItem,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const [analysis, setAnalysis] = useState<SecurityAnalysis | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen) {
      loadAnalysis();
    }
  }, [isOpen]);

  const loadAnalysis = async () => {
    setLoading(true);
    try {
      const res = await vaultDesktop.getSecurityAnalysis();
      setAnalysis(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const score = analysis?.score ?? 100;
  const getScoreColor = () => {
    if (score >= 80) return colors.primary;
    if (score >= 50) return colors.warning;
    return colors.danger;
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
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          color: colors.text,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: `1px solid ${colors.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldIcon size={22} color={colors.primary} />
            <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>{t('security')}</h2>
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
          {/* Score Card */}
          <div
            style={{
              backgroundColor: colors.cardSecondary,
              borderRadius: '12px',
              padding: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
              border: `1px solid ${colors.border}`,
            }}
          >
            <div>
              <div style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '4px' }}>Vault Security Rating</div>
              <div style={{ fontSize: '36px', fontWeight: 'bold', color: getScoreColor() }}>
                {score} <span style={{ fontSize: '20px', color: colors.textMuted }}>/ 100</span>
              </div>
              <div style={{ fontSize: '12px', color: colors.textMuted, marginTop: '4px' }}>
                Audited {analysis?.totalItems ?? 0} credentials in vault
              </div>
            </div>

            {/* Circular Gauge */}
            <div
              style={{
                width: '84px',
                height: '84px',
                borderRadius: '50%',
                border: `6px solid ${getScoreColor()}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                fontWeight: 'bold',
                color: getScoreColor(),
              }}
            >
              {score}%
            </div>
          </div>

          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
            <div
              style={{
                backgroundColor: colors.cardSecondary,
                padding: '16px',
                borderRadius: '10px',
                border: `1px solid ${colors.border}`,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: (analysis?.weakCount ?? 0) > 0 ? colors.danger : colors.primary }}>
                {analysis?.weakCount ?? 0}
              </div>
              <div style={{ fontSize: '12px', color: colors.textMuted, marginTop: '4px' }}>Weak Passwords</div>
            </div>

            <div
              style={{
                backgroundColor: colors.cardSecondary,
                padding: '16px',
                borderRadius: '10px',
                border: `1px solid ${colors.border}`,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: (analysis?.reusedCount ?? 0) > 0 ? colors.warning : colors.primary }}>
                {analysis?.reusedCount ?? 0}
              </div>
              <div style={{ fontSize: '12px', color: colors.textMuted, marginTop: '4px' }}>Reused Passwords</div>
            </div>

            <div
              style={{
                backgroundColor: colors.cardSecondary,
                padding: '16px',
                borderRadius: '10px',
                border: `1px solid ${colors.border}`,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: colors.textSecondary }}>
                {analysis?.oldCount ?? 0}
              </div>
              <div style={{ fontSize: '12px', color: colors.textMuted, marginTop: '4px' }}>Old Passwords</div>
            </div>
          </div>

          <div style={{ fontSize: '13px', color: colors.textSecondary, lineHeight: '20px' }}>
            A strong password has at least 14 characters and combines uppercase letters, lowercase letters, numbers, and symbols. Never reuse the same password across multiple websites.
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
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
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

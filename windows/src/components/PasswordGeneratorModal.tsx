import React, { useState } from 'react';
import { useTheme } from '../theme';
import { useTranslation } from '../i18n';
import { CopyIcon, CheckIcon, RefreshIcon } from './Icons';
import { vaultDesktop } from '../services/vaultService';

interface PasswordGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPassword?: (password: string) => void;
}

const WORDS = [
  'apple', 'river', 'sky', 'silver', 'mountain', 'tiger', 'amber', 'ocean', 'flame',
  'galaxy', 'shadow', 'falcon', 'crystal', 'forest', 'breeze', 'thunder', 'emerald',
  'velocity', 'horizon', 'zenith', 'nebula', 'solitude', 'vanguard', 'summit', 'echo'
];

export const PasswordGeneratorModal: React.FC<PasswordGeneratorModalProps> = ({
  isOpen,
  onClose,
  onSelectPassword,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const [mode, setMode] = useState<'PASSWORD' | 'PASSPHRASE'>('PASSWORD');
  const [length, setLength] = useState<number>(20);
  const [uppercase, setUppercase] = useState<boolean>(true);
  const [lowercase, setLowercase] = useState<boolean>(true);
  const [numbers, setNumbers] = useState<boolean>(true);
  const [symbols, setSymbols] = useState<boolean>(true);

  // Passphrase
  const [wordCount, setWordCount] = useState<number>(4);
  const [separator, setSeparator] = useState<string>('-');

  const [copied, setCopied] = useState<boolean>(false);

  const generatePassword = (): string => {
    if (mode === 'PASSPHRASE') {
      const chosen: string[] = [];
      for (let i = 0; i < wordCount; i++) {
        const rand = WORDS[Math.floor(Math.random() * WORDS.length)];
        chosen.push(rand.charAt(0).toUpperCase() + rand.slice(1));
      }
      return chosen.join(separator) + Math.floor(Math.random() * 90 + 10);
    }

    let charset = '';
    if (lowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (uppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (numbers) charset += '0123456789';
    if (symbols) charset += '!@#$%^&*()-_=+[]{}|;:,.<>?';
    if (!charset) charset = 'abcdefghijklmnopqrstuvwxyz';

    let res = '';
    const array = new Uint32Array(length);
    window.crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
      res += charset[array[i] % charset.length];
    }
    return res;
  };

  const [generatedPassword, setGeneratedPassword] = useState<string>(generatePassword());

  const handleRegenerate = () => {
    setGeneratedPassword(generatePassword());
    setCopied(false);
  };

  const handleCopy = () => {
    vaultDesktop.copySecure(generatedPassword, 'Password', 60);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

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
          width: '520px',
          padding: '24px',
          color: colors.text,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>{t('generator')}</h2>
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

        {/* Output Box */}
        <div
          style={{
            backgroundColor: colors.cardSecondary,
            border: `1px solid ${colors.border}`,
            borderRadius: '10px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              fontFamily: 'monospace',
              fontSize: '16px',
              fontWeight: 600,
              color: colors.primary,
              letterSpacing: '1px',
              wordBreak: 'break-all',
              userSelect: 'all',
              marginRight: '12px',
            }}
          >
            {generatedPassword}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleRegenerate}
              title="Regenerate"
              style={{
                background: colors.cardElevated,
                border: `1px solid ${colors.border}`,
                color: colors.text,
                borderRadius: '8px',
                padding: '8px',
                cursor: 'pointer',
              }}
            >
              <RefreshIcon size={18} />
            </button>
            <button
              onClick={handleCopy}
              title="Copy"
              style={{
                background: colors.primary,
                border: 'none',
                color: '#FFFFFF',
                borderRadius: '8px',
                padding: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {copied ? <CheckIcon size={18} /> : <CopyIcon size={18} />}
            </button>
          </div>
        </div>

        {/* Mode Tabs */}
        <div
          style={{
            display: 'flex',
            backgroundColor: colors.cardSecondary,
            borderRadius: '8px',
            padding: '4px',
            marginBottom: '20px',
          }}
        >
          <button
            onClick={() => { setMode('PASSWORD'); handleRegenerate(); }}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              background: mode === 'PASSWORD' ? colors.primary : 'transparent',
              color: mode === 'PASSWORD' ? '#FFFFFF' : colors.textSecondary,
            }}
          >
            Password
          </button>
          <button
            onClick={() => { setMode('PASSPHRASE'); handleRegenerate(); }}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              background: mode === 'PASSPHRASE' ? colors.primary : 'transparent',
              color: mode === 'PASSPHRASE' ? '#FFFFFF' : colors.textSecondary,
            }}
          >
            Passphrase
          </button>
        </div>

        {/* Options */}
        {mode === 'PASSWORD' ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
              <span>Length: {length} characters</span>
            </div>
            <input
              type="range"
              min="8"
              max="64"
              value={length}
              onChange={(e) => { setLength(Number(e.target.value)); handleRegenerate(); }}
              style={{ width: '100%', marginBottom: '16px', accentColor: colors.primary }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={uppercase} onChange={(e) => { setUppercase(e.target.checked); handleRegenerate(); }} />
                Uppercase (A-Z)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={lowercase} onChange={(e) => { setLowercase(e.target.checked); handleRegenerate(); }} />
                Lowercase (a-z)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={numbers} onChange={(e) => { setNumbers(e.target.checked); handleRegenerate(); }} />
                Numbers (0-9)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={symbols} onChange={(e) => { setSymbols(e.target.checked); handleRegenerate(); }} />
                Symbols (!@#$%)
              </label>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
              <span>Word Count: {wordCount} words</span>
            </div>
            <input
              type="range"
              min="3"
              max="8"
              value={wordCount}
              onChange={(e) => { setWordCount(Number(e.target.value)); handleRegenerate(); }}
              style={{ width: '100%', marginBottom: '16px', accentColor: colors.primary }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px' }}>
              <span>Separator:</span>
              {['-', '_', '.', ' '].map((sep) => (
                <button
                  key={sep}
                  onClick={() => { setSeparator(sep); handleRegenerate(); }}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${separator === sep ? colors.primary : colors.border}`,
                    background: separator === sep ? colors.primaryMuted : colors.cardSecondary,
                    color: colors.text,
                    cursor: 'pointer',
                  }}
                >
                  {sep === ' ' ? 'Space' : sep}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`,
              background: 'transparent',
              color: colors.text,
              cursor: 'pointer',
            }}
          >
            {t('cancel')}
          </button>
          {onSelectPassword && (
            <button
              onClick={() => { onSelectPassword(generatedPassword); onClose(); }}
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
              Use This Password
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

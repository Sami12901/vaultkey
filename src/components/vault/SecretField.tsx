import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ToastAndroid } from 'react-native';
import { colors } from '../../theme/colors';
import { radius, typography, spacing } from '../../theme';
import { VisibilityIcon, VisibilityOffIcon, CopyIcon, CheckIcon } from '../icons';
import { clipboardNative } from '../../services/nativeBridge';
import { useTranslation } from '../../i18n';

interface SecretFieldProps {
  label: string;
  value: string;
  onFetchSecret?: () => Promise<string>;
  maskLength?: number;
  clipboardTimeoutSeconds?: number;
}

export const SecretField: React.FC<SecretFieldProps> = ({
  label,
  value,
  onFetchSecret,
  maskLength = 16,
  clipboardTimeoutSeconds = 30,
}) => {
  const { t } = useTranslation();
  const [revealed, setRevealed] = useState(false);
  const [actualSecret, setActualSecret] = useState(value);
  const [copied, setCopied] = useState(false);
  const [remainingRevealSec, setRemainingRevealSec] = useState<number | null>(null);

  // Synchronize initial prop
  useEffect(() => {
    if (value) setActualSecret(value);
  }, [value]);

  // Auto-hide countdown timer when revealed
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (revealed) {
      setRemainingRevealSec(15);
      timer = setInterval(() => {
        setRemainingRevealSec(prev => {
          if (prev === null || prev <= 1) {
            setRevealed(false);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setRemainingRevealSec(null);
    }
    return () => clearInterval(timer);
  }, [revealed]);

  const handleToggleReveal = async () => {
    if (!revealed) {
      if (!actualSecret && onFetchSecret) {
        try {
          const fetched = await onFetchSecret();
          setActualSecret(fetched);
          setRevealed(true);
        } catch (e: any) {
          ToastAndroid.show(e?.message || 'Failed to reveal secret', ToastAndroid.SHORT);
        }
      } else {
        setRevealed(true);
      }
    } else {
      setRevealed(false);
    }
  };

  const handleCopy = async () => {
    let textToCopy = actualSecret;
    if (!textToCopy && onFetchSecret) {
      try {
        textToCopy = await onFetchSecret();
        setActualSecret(textToCopy);
      } catch (e: any) {
        ToastAndroid.show(e?.message || 'Failed to fetch secret for copy', ToastAndroid.SHORT);
        return;
      }
    }

    if (!textToCopy) return;

    try {
      const res = await clipboardNative.copySecure(textToCopy, label, clipboardTimeoutSeconds);
      setCopied(true);
      ToastAndroid.show(res.message || t('copied'), ToastAndroid.SHORT);
      setTimeout(() => setCopied(false), 2000);
    } catch (e: any) {
      ToastAndroid.show(e?.message || 'Copy failed', ToastAndroid.SHORT);
    }
  };

  const maskedText = '•'.repeat(maskLength);

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {remainingRevealSec !== null ? (
          <Text style={styles.timerText}>Auto-hiding in {remainingRevealSec}s</Text>
        ) : null}
      </View>

      <View style={styles.box}>
        <Text
          style={[styles.valueText, !revealed && styles.maskedText]}
          accessible={true}
          accessibilityLabel={revealed ? `${label} revealed` : 'Password hidden'}
          numberOfLines={revealed ? undefined : 1}
        >
          {revealed ? actualSecret : maskedText}
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleToggleReveal}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide secret' : 'Reveal secret'}
          >
            {revealed ? (
              <VisibilityOffIcon size={20} color={colors.primaryLight} />
            ) : (
              <VisibilityIcon size={20} color={colors.textSecondary} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleCopy}
            accessibilityRole="button"
            accessibilityLabel="Copy secret"
          >
            {copied ? (
              <CheckIcon size={20} color={colors.primary} />
            ) : (
              <CopyIcon size={20} color={colors.textSecondary} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.base,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
  },
  timerText: {
    fontSize: typography.fontSizes.xs,
    color: colors.warningLight,
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.base,
    minHeight: 48,
    paddingVertical: spacing.sm,
  },
  valueText: {
    flex: 1,
    color: colors.text,
    fontSize: typography.fontSizes.base,
    fontFamily: 'monospace',
  },
  maskedText: {
    fontSize: typography.fontSizes.lg,
    letterSpacing: 3,
    color: colors.textMuted,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginLeft: spacing.sm,
  },
  actionBtn: {
    padding: spacing.xs,
  },
});
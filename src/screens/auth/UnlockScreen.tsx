import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ToastAndroid,
  Image,
} from 'react-native';
import { colors } from '../../theme/colors';
import { radius, typography, spacing, useTheme } from '../../theme';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { FingerprintIcon, KeyIcon, ShieldCheckIcon, ShieldAlertIcon } from '../../components/icons';
import { useVaultStore } from '../../stores/vaultStore';
import { vaultNative } from '../../services/nativeBridge';
import { useTranslation } from '../../i18n';

export const UnlockScreen: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const {
    unlock,
    unlockWithBiometrics,
    isBiometricSupported,
    isBiometricAvailable,
    isLoading,
    errorMessage,
  } = useVaultStore();

  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);
  const [failedAttempts, setFailedAttempts] = useState<number>(0);

  const checkLockout = async () => {
    try {
      const status = await vaultNative.getLockoutStatus();
      setFailedAttempts(status.failedAttempts || 0);
      if (status.isLockedOut && status.remainingSeconds > 0) {
        setLockoutRemaining(status.remainingSeconds);
      } else {
        setLockoutRemaining(0);
      }
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    checkLockout();
  }, []);

  useEffect(() => {
    if (lockoutRemaining <= 0) return;
    const interval = setInterval(() => {
      setLockoutRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutRemaining]);

  useEffect(() => {
    // Automatically attempt biometric unlock if available on screen mount (and not locked out)
    if (isBiometricAvailable && lockoutRemaining <= 0) {
      handleBiometricUnlock();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBiometricAvailable, lockoutRemaining]);

  const handlePasswordUnlock = async () => {
    if (lockoutRemaining > 0) return;
    if (!password) {
      setError(t('invalidPassword'));
      return;
    }
    setError(null);
    try {
      const success = await unlock(password);
      if (success) {
        setPassword('');
        setLockoutRemaining(0);
        setFailedAttempts(0);
        ToastAndroid.show('Vault Unlocked', ToastAndroid.SHORT);
      } else {
        setError(t('invalidPassword'));
        await checkLockout();
      }
    } catch (e: any) {
      setError(e?.message || t('invalidPassword'));
      await checkLockout();
    }
  };

  const handleBiometricUnlock = async () => {
    if (lockoutRemaining > 0) return;
    try {
      const success = await unlockWithBiometrics();
      if (success) {
        setLockoutRemaining(0);
        setFailedAttempts(0);
        ToastAndroid.show('Vault Unlocked via Biometrics', ToastAndroid.SHORT);
      }
    } catch {
      // User cancelled or fallback to password
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Brand Identity Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/vaultkey_brand_icon.jpg')}
            style={styles.logoImage}
            resizeMode="cover"
          />
          <View style={styles.logoGlow} />
        </View>
        <Text style={[styles.brandTitle, { color: colors.text }]}>VaultKey</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('unlockSubtitle')}</Text>
      </View>

      {/* Lockout Active Banner */}
      {lockoutRemaining > 0 ? (
        <Card style={styles.lockoutBanner}>
          <View style={styles.lockoutIconRing}>
            <ShieldAlertIcon size={28} color="#EF4444" />
          </View>
          <View style={styles.lockoutTextWrap}>
            <Text style={styles.lockoutTitle}>Vault Locked for Security</Text>
            <Text style={styles.lockoutCountdown}>
              Try again in {lockoutRemaining}s
            </Text>
            <Text style={styles.lockoutDesc}>
              Multiple incorrect master passwords detected ({failedAttempts} attempts).
            </Text>
          </View>
        </Card>
      ) : null}

      {/* Prominent Biometric Quick-Unlock Button if available */}
      {isBiometricSupported && isBiometricAvailable ? (
        <Card
          style={[styles.biometricCard, lockoutRemaining > 0 && styles.disabledCard]}
          onPress={lockoutRemaining > 0 ? undefined : handleBiometricUnlock}
        >
          <View style={[styles.bioIconRing, lockoutRemaining > 0 && styles.disabledIconRing]}>
            <FingerprintIcon size={44} color={lockoutRemaining > 0 ? colors.textMuted : colors.primary} />
          </View>
          <View style={styles.bioTextWrap}>
            <Text style={[styles.bioTitle, { color: lockoutRemaining > 0 ? colors.textMuted : colors.text }]}>{t('biometricUnlockBtn')}</Text>
            <Text style={[styles.bioSubtitle, { color: colors.textSecondary }]}>
              {lockoutRemaining > 0 ? 'Disabled while vault is locked' : 'Touch sensor for instant hardware unlock'}
            </Text>
          </View>
        </Card>
      ) : null}


      {isBiometricSupported && isBiometricAvailable ? (
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR ENTER MASTER PASSWORD</Text>
          <View style={styles.dividerLine} />
        </View>
      ) : null}

      {/* Password Unlock Card */}
      <Card style={[styles.card, lockoutRemaining > 0 && styles.disabledCard]}>
        <Input
          label={t('passwordLabel')}
          value={password}
          onChangeText={text => {
            setPassword(text);
            setError(null);
          }}
          placeholder={lockoutRemaining > 0 ? `Locked (${lockoutRemaining}s remaining)` : "Enter master password"}
          isPassword
          editable={lockoutRemaining === 0}
          error={error || errorMessage}
        />

        <Button
          title={lockoutRemaining > 0 ? `Locked (${lockoutRemaining}s)` : t('unlockBtn')}
          onPress={handlePasswordUnlock}
          loading={isLoading}
          disabled={lockoutRemaining > 0 || !password}
          style={styles.submitBtn}
          icon={<KeyIcon size={20} color={colors.white} />}
        />
      </Card>

      {/* Hardware Security Footer Badge */}
      <View style={styles.footer}>
        <ShieldCheckIcon size={16} color={colors.primary} />
        <Text style={styles.footerText}>
          Argon2id + SQLCipher AES-256 • Hardware Keystore
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoContainer: {
    position: 'relative',
    marginBottom: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 88,
    height: 88,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.borderLight,
  },
  logoGlow: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 26,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    zIndex: -1,
  },
  brandTitle: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: typography.lineHeights.base,
    maxWidth: '85%',
  },
  lockoutBanner: {
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: '#EF4444',
    borderWidth: 1.5,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
  },
  lockoutIconRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  lockoutTextWrap: {
    flex: 1,
  },
  lockoutTitle: {
    color: '#EF4444',
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
  },
  lockoutCountdown: {
    color: '#F87171',
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    marginVertical: 2,
  },
  lockoutDesc: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    lineHeight: 16,
  },
  disabledCard: {
    opacity: 0.5,
  },
  disabledIconRing: {
    borderColor: colors.border,
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
  },
  biometricCard: {
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardSecondary,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    borderWidth: 1.5,
    marginBottom: spacing.lg,
  },
  bioIconRing: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    marginRight: spacing.base,
  },
  bioTextWrap: {
    flex: 1,
  },
  bioTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  bioSubtitle: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textMuted,
    paddingHorizontal: spacing.md,
    letterSpacing: 0.8,
  },
  card: {
    padding: spacing.xl,
    backgroundColor: colors.card,
    borderColor: colors.border,
  },
  submitBtn: {
    marginTop: spacing.base,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xxl,
    gap: spacing.xs,
  },
  footerText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.medium,
  },
});
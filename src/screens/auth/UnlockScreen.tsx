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
import { FingerprintIcon, KeyIcon, ShieldCheckIcon } from '../../components/icons';
import { useVaultStore } from '../../stores/vaultStore';
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

  useEffect(() => {
    // Automatically attempt biometric unlock if available on screen mount
    if (isBiometricAvailable) {
      handleBiometricUnlock();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBiometricAvailable]);

  const handlePasswordUnlock = async () => {
    if (!password) {
      setError(t('invalidPassword'));
      return;
    }
    setError(null);
    try {
      const success = await unlock(password);
      if (success) {
        setPassword('');
        ToastAndroid.show('Vault Unlocked', ToastAndroid.SHORT);
      } else {
        setError(t('invalidPassword'));
      }
    } catch (e: any) {
      setError(e?.message || t('invalidPassword'));
    }
  };

  const handleBiometricUnlock = async () => {
    try {
      const success = await unlockWithBiometrics();
      if (success) {
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

      {/* Prominent Biometric Quick-Unlock Button if available */}
      {isBiometricSupported && isBiometricAvailable ? (
        <Card style={styles.biometricCard} onPress={handleBiometricUnlock}>
          <View style={styles.bioIconRing}>
            <FingerprintIcon size={44} color={colors.primary} />
          </View>
          <View style={styles.bioTextWrap}>
            <Text style={[styles.bioTitle, { color: colors.text }]}>{t('biometricUnlockBtn')}</Text>
            <Text style={[styles.bioSubtitle, { color: colors.textSecondary }]}>Touch sensor for instant hardware unlock</Text>
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
      <Card style={styles.card}>
        <Input
          label={t('passwordLabel')}
          value={password}
          onChangeText={text => {
            setPassword(text);
            setError(null);
          }}
          placeholder="Enter master password"
          isPassword
          error={error || errorMessage}
        />

        <Button
          title={t('unlockBtn')}
          onPress={handlePasswordUnlock}
          loading={isLoading}
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
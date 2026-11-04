import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ToastAndroid,
  Alert,
  Image,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { colors } from '../../theme/colors';
import { radius, typography, spacing, useTheme } from '../../theme';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { StrengthMeter } from '../../components/vault/StrengthMeter';
import { ShieldIcon, KeyIcon, FingerprintIcon, ShieldCheckIcon, CheckIcon, CloseIcon } from '../../components/icons';
import { useVaultStore } from '../../stores/vaultStore';
import { useTranslation } from '../../i18n';
import { calculatePasswordEntropy, EntropyResult } from '../../utils/entropyUtils';

export const MasterPasswordSetupScreen: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { initializeVault, enableBiometrics, isBiometricSupported, isLoading } = useVaultStore();


  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [entropyRes, setEntropyRes] = useState<EntropyResult>(() => calculatePasswordEntropy(''));
  const [error, setError] = useState<string | null>(null);
  const [enableBio, setEnableBio] = useState(true);

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    setError(null);
    const res = calculatePasswordEntropy(text);
    setEntropyRes(res);
  };

  const handleCreateVault = async () => {
    if (!entropyRes.isLengthValid) {
      setError(t('passwordTooShort'));
      return;
    }
    if (!entropyRes.isEntropySafe || !entropyRes.isValidMasterPassword) {
      setError('Password too weak. Minimum 60 bits entropy and 3 character classes required.');
      return;
    }
    if (password !== confirmPassword) {
      setError(t('passwordMismatch'));
      return;
    }

    try {
      await initializeVault(password);
      if (enableBio && isBiometricSupported) {
        try {
          await enableBiometrics(password);
        } catch {
          // Can be enabled later in Settings
        }
      }
      ToastAndroid.show('Vault created successfully', ToastAndroid.SHORT);
    } catch (e: any) {
      Alert.alert(t('error'), e?.message || 'Failed to initialize vault');
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Brand Logo & Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/vaultkey_brand_icon.jpg')}
            style={styles.logoImage}
            resizeMode="cover"
          />
          <View style={styles.logoGlow} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>{t('setupTitle')}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('setupSubtitle')}</Text>
      </View>


      <Card style={styles.card}>
        <Input
          label={t('passwordLabel')}
          value={password}
          onChangeText={handlePasswordChange}
          placeholder="Enter at least 12 characters"
          isPassword
        />

        {password.length > 0 ? (
          <View style={styles.entropyContainer}>
            <StrengthMeter
              score={entropyRes.score}
              entropy={entropyRes.entropy}
              feedback={entropyRes.feedback}
            />

            {/* Mandatory Entropy Criteria Checklist */}
            <View style={styles.checklist}>
              <View style={styles.checkItem}>
                {entropyRes.isLengthValid ? (
                  <CheckIcon size={14} color="#10B981" />
                ) : (
                  <CloseIcon size={14} color="#64748B" />
                )}
                <Text style={[styles.checkText, { color: entropyRes.isLengthValid ? '#10B981' : colors.textSecondary }]}>
                  At least 12 characters ({password.length}/12)
                </Text>
              </View>

              <View style={styles.checkItem}>
                {entropyRes.hasUppercase && entropyRes.hasLowercase ? (
                  <CheckIcon size={14} color="#10B981" />
                ) : (
                  <CloseIcon size={14} color="#64748B" />
                )}
                <Text style={[styles.checkText, { color: entropyRes.hasUppercase && entropyRes.hasLowercase ? '#10B981' : colors.textSecondary }]}>
                  Uppercase and lowercase letters
                </Text>
              </View>

              <View style={styles.checkItem}>
                {entropyRes.hasNumber || entropyRes.hasSymbol ? (
                  <CheckIcon size={14} color="#10B981" />
                ) : (
                  <CloseIcon size={14} color="#64748B" />
                )}
                <Text style={[styles.checkText, { color: entropyRes.hasNumber || entropyRes.hasSymbol ? '#10B981' : colors.textSecondary }]}>
                  Numbers and/or symbols
                </Text>
              </View>

              <View style={styles.checkItem}>
                {entropyRes.isEntropySafe ? (
                  <CheckIcon size={14} color="#10B981" />
                ) : (
                  <CloseIcon size={14} color="#64748B" />
                )}
                <Text style={[styles.checkText, { color: entropyRes.isEntropySafe ? '#10B981' : colors.textSecondary }]}>
                  Safe cryptographic entropy ({entropyRes.entropy} / 60 bits minimum)
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        <Input
          label={t('confirmPasswordLabel')}
          value={confirmPassword}
          onChangeText={text => {
            setConfirmPassword(text);
            setError(null);
          }}
          placeholder="Re-enter master password"
          isPassword
          error={error}
        />

        {/* Biometric Toggle Card */}
        {isBiometricSupported ? (
          <TouchableOpacity
            style={styles.bioCard}
            onPress={() => setEnableBio(!enableBio)}
            activeOpacity={0.8}
          >
            <View style={styles.bioLeft}>
              <View style={[styles.bioIconWrap, enableBio && styles.bioIconWrapActive]}>
                <FingerprintIcon size={22} color={enableBio ? colors.primary : colors.textSecondary} />
              </View>
              <View style={styles.bioText}>
                <Text style={styles.bioTitle}>Enable Fingerprint Unlock</Text>
                <Text style={styles.bioSub}>Use hardware biometric sensor for quick access</Text>
              </View>
            </View>
            <Switch
              value={enableBio}
              onValueChange={setEnableBio}
              thumbColor={enableBio ? colors.primary : colors.textMuted}
              trackColor={{ false: colors.border, true: colors.primaryMuted }}
            />
          </TouchableOpacity>
        ) : null}

        <View style={styles.warningBox}>
          <ShieldIcon size={20} color={colors.warning} />
          <Text style={styles.warningText}>
            Your Master Password is the key to your zero-knowledge vault. It is never stored or transmitted anywhere. If forgotten, your vault cannot be recovered.
          </Text>
        </View>

        <Button
          title={t('createVaultBtn')}
          onPress={handleCreateVault}
          loading={isLoading}
          disabled={!entropyRes.isValidMasterPassword || password !== confirmPassword}
          style={styles.submitBtn}
          icon={<KeyIcon size={20} color={colors.white} />}
        />
      </Card>

      <View style={styles.footer}>
        <ShieldCheckIcon size={16} color={colors.primary} />
        <Text style={styles.footerText}>
          Envelope Encryption: Argon2id (64MB) + SQLCipher AES-256
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
    width: 80,
    height: 80,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.borderLight,
  },
  logoGlow: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    zIndex: -1,
  },
  title: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: typography.lineHeights.base,
    maxWidth: '90%',
  },
  card: {
    padding: spacing.xl,
    backgroundColor: colors.card,
    borderColor: colors.border,
  },
  bioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.cardSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: spacing.md,
  },
  bioLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  bioIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  bioIconWrapActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderWidth: 1,
  },
  bioText: {
    flex: 1,
  },
  bioTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  bioSub: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  entropyContainer: {
    marginBottom: spacing.sm,
  },
  checklist: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: spacing.xs,
    gap: 4,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkText: {
    fontSize: typography.fontSizes.xs,
    lineHeight: 16,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.25)',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginVertical: spacing.md,
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  warningText: {
    flex: 1,
    fontSize: typography.fontSizes.xs,
    color: colors.warningLight,
    lineHeight: 18,
  },
  submitBtn: {
    marginTop: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    gap: spacing.xs,
  },
  footerText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.medium,
  },
});
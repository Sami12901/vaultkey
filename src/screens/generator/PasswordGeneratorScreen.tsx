import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ToastAndroid,
} from 'react-native';
import { colors } from '../../theme/colors';
import { radius, typography, spacing, useTheme } from '../../theme';
import { Header } from '../../components/common/Header';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { StrengthMeter } from '../../components/vault/StrengthMeter';
import { RefreshIcon, CopyIcon } from '../../components/icons';
import { vaultNative, clipboardNative } from '../../services/nativeBridge';
import { useVaultStore } from '../../stores/vaultStore';
import { useTranslation } from '../../i18n';

interface PasswordGeneratorScreenProps {
  onBack?: () => void;
}

export const PasswordGeneratorScreen: React.FC<PasswordGeneratorScreenProps> = ({
  onBack,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { settings } = useVaultStore();


  const [mode, setMode] = useState<'PASSWORD' | 'PASSPHRASE'>('PASSWORD');
  const [length, setLength] = useState(20);
  const [includeUpper, setIncludeUpper] = useState(true);
  const [includeLower, setIncludeLower] = useState(true);
  const [includeNums, setIncludeNums] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(true);

  // Passphrase options
  const [wordCount, setWordCount] = useState(4);
  const separator = '-';
  const [capitalize, setCapitalize] = useState(true);

  const [result, setResult] = useState('');
  const [strength, setStrength] = useState({ score: 4, entropy: 95 });

  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, length, includeUpper, includeLower, includeNums, includeSymbols, excludeAmbiguous, wordCount, separator, capitalize]);

  const generate = async () => {
    try {
      if (mode === 'PASSWORD') {
        const res = await vaultNative.generatePassword({
          length,
          includeUppercase: includeUpper,
          includeLowercase: includeLower,
          includeNumbers: includeNums,
          includeSymbols: includeSymbols,
          excludeAmbiguous,
        });
        if (res.password) {
          setResult(res.password);
          setStrength({ score: res.score, entropy: res.entropy });
        }
      } else {
        const res = await vaultNative.generatePassphrase({
          wordCount,
          separator,
          capitalize,
          includeNumber: true,
        });
        if (res.passphrase) {
          setResult(res.passphrase);
          setStrength({ score: res.score, entropy: res.entropy });
        }
      }
    } catch {
      // Ignored
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    await clipboardNative.copySecure(result, 'Generated Password', settings.clipboardClearSeconds);
    ToastAndroid.show('Copied securely. Clipboard will clear shortly.', ToastAndroid.SHORT);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title={t('generatorTitle')} onBack={onBack} />

      <ScrollView style={[styles.content, { backgroundColor: colors.background }]} contentContainerStyle={styles.scrollContent}>
        {/* Mode Selector */}
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeTab, mode === 'PASSWORD' && styles.modeTabActive]}
            onPress={() => setMode('PASSWORD')}
          >
            <Text style={[styles.modeTabText, mode === 'PASSWORD' && styles.modeTabTextActive]}>
              {t('passwordMode')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeTab, mode === 'PASSPHRASE' && styles.modeTabActive]}
            onPress={() => setMode('PASSPHRASE')}
          >
            <Text style={[styles.modeTabText, mode === 'PASSPHRASE' && styles.modeTabTextActive]}>
              {t('passphraseMode')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Display Card */}
        <Card style={styles.displayCard}>
          <Text style={[styles.passwordText, { color: colors.text }]} selectable>
            {result}
          </Text>


          <StrengthMeter score={strength.score} entropy={strength.entropy} />

          <View style={styles.btnRow}>
            <Button
              title="Regenerate"
              variant="secondary"
              onPress={generate}
              style={styles.actionBtn}
              icon={<RefreshIcon size={18} color={colors.text} />}
            />
            <Button
              title={t('copy')}
              onPress={handleCopy}
              style={styles.actionBtn}
              icon={<CopyIcon size={18} color={colors.white} />}
            />
          </View>
        </Card>

        {/* Options */}
        {mode === 'PASSWORD' ? (
          <Card style={styles.optionsCard}>
            {/* Length Controls */}
            <View style={styles.optionRow}>
              <Text style={styles.optionLabel}>{t('lengthLabel')}: {length}</Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setLength(Math.max(8, length - 2))}
                >
                  <Text style={styles.stepperText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{length}</Text>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setLength(Math.min(64, length + 2))}
                >
                  <Text style={styles.stepperText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.optionLabel}>{t('uppercaseOption')}</Text>
              <Switch
                value={includeUpper}
                onValueChange={setIncludeUpper}
                trackColor={{ false: colors.border, true: colors.primaryDark }}
                thumbColor={includeUpper ? colors.primary : colors.textMuted}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.optionLabel}>{t('lowercaseOption')}</Text>
              <Switch
                value={includeLower}
                onValueChange={setIncludeLower}
                trackColor={{ false: colors.border, true: colors.primaryDark }}
                thumbColor={includeLower ? colors.primary : colors.textMuted}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.optionLabel}>{t('numbersOption')}</Text>
              <Switch
                value={includeNums}
                onValueChange={setIncludeNums}
                trackColor={{ false: colors.border, true: colors.primaryDark }}
                thumbColor={includeNums ? colors.primary : colors.textMuted}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.optionLabel}>{t('symbolsOption')}</Text>
              <Switch
                value={includeSymbols}
                onValueChange={setIncludeSymbols}
                trackColor={{ false: colors.border, true: colors.primaryDark }}
                thumbColor={includeSymbols ? colors.primary : colors.textMuted}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.optionLabel}>{t('avoidAmbiguousOption')}</Text>
              <Switch
                value={excludeAmbiguous}
                onValueChange={setExcludeAmbiguous}
                trackColor={{ false: colors.border, true: colors.primaryDark }}
                thumbColor={excludeAmbiguous ? colors.primary : colors.textMuted}
              />
            </View>
          </Card>
        ) : (
          <Card style={styles.optionsCard}>
            <View style={styles.optionRow}>
              <Text style={styles.optionLabel}>{t('wordCountLabel')}: {wordCount}</Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setWordCount(Math.max(3, wordCount - 1))}
                >
                  <Text style={styles.stepperText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{wordCount}</Text>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setWordCount(Math.min(8, wordCount + 1))}
                >
                  <Text style={styles.stepperText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.optionLabel}>Capitalize Words</Text>
              <Switch
                value={capitalize}
                onValueChange={setCapitalize}
                trackColor={{ false: colors.border, true: colors.primaryDark }}
                thumbColor={capitalize ? colors.primary : colors.textMuted}
              />
            </View>
          </Card>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: 48,
  },
  modeRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 4,
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  modeTabActive: {
    backgroundColor: colors.primaryMuted,
  },
  modeTabText: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  modeTabTextActive: {
    color: colors.primaryLight,
    fontWeight: typography.fontWeights.semibold,
  },
  displayCard: {
    padding: spacing.base,
    marginBottom: spacing.base,
  },
  passwordText: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.primaryLight,
    fontFamily: 'monospace',
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  btnRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  actionBtn: {
    flex: 1,
  },
  optionsCard: {
    padding: spacing.base,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  optionLabel: {
    fontSize: typography.fontSizes.base,
    color: colors.text,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.cardSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperText: {
    fontSize: typography.fontSizes.lg,
    color: colors.text,
    fontWeight: typography.fontWeights.bold,
  },
  stepperValue: {
    fontSize: typography.fontSizes.base,
    color: colors.text,
    minWidth: 24,
    textAlign: 'center',
    fontWeight: typography.fontWeights.semibold,
  },
});
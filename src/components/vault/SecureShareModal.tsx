import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Share,
  ToastAndroid,
  ScrollView,
  Alert,
} from 'react-native';
import { colors } from '../../theme/colors';
import { radius, typography, spacing } from '../../theme';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import {
  ShareIcon,
  LockIcon,
  KeyIcon,
  CopyIcon,
  ShieldCheckIcon,
  SendIcon,
} from '../icons';
import { vaultNative, clipboardNative } from '../../services/nativeBridge';
import { VaultItemSummary } from '../../types';

interface SecureShareModalProps {
  visible: boolean;
  onClose: () => void;
  item: VaultItemSummary;
}

export const SecureShareModal: React.FC<SecureShareModalProps> = ({
  visible,
  onClose,
  item,
}) => {
  const [shareMode, setShareMode] = useState<'ENCRYPTED' | 'PLAIN'>('ENCRYPTED');
  const [pin, setPin] = useState(
    () => Math.floor(100000 + Math.random() * 900000).toString()
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedCapsule, setGeneratedCapsule] = useState<string | null>(null);

  const generateNewPin = () => {
    const newPin = Math.floor(100000 + Math.random() * 900000).toString();
    setPin(newPin);
    setGeneratedCapsule(null);
  };

  const handleCreateAndShareCapsule = async () => {
    if (!pin.trim() || pin.length < 4) {
      Alert.alert('PIN Required', 'Please provide a transfer PIN of at least 4 digits');
      return;
    }

    setIsProcessing(true);
    try {
      // Fetch the secret on-demand
      let secretContent = '';
      if (item.type === 'LOGIN') {
        const password = await vaultNative.getSecret(item.id, 'password');
        secretContent = JSON.stringify({
          title: item.title,
          username: item.username,
          password,
          sharedAt: new Date().toISOString(),
        });
      } else if (item.type === 'SECURE_NOTE') {
        const content = await vaultNative.getSecret(item.id, 'content');
        secretContent = JSON.stringify({
          title: item.title,
          note: content,
          sharedAt: new Date().toISOString(),
        });
      } else if (item.type === 'CREDENTIAL_CARD') {
        const num = await vaultNative.getSecret(item.id, 'cardNumber');
        const cvv = await vaultNative.getSecret(item.id, 'cvv');
        secretContent = JSON.stringify({
          title: item.title,
          cardNumber: num,
          cvv,
          sharedAt: new Date().toISOString(),
        });
      }

      const capsule = await vaultNative.encryptSharePayload(secretContent, pin.trim());
      setGeneratedCapsule(capsule);

      const shareMessage =
        `🔐 VaultKey Encrypted Secret Capsule\n\n` +
        `Title: ${item.title}\n` +
        `Payload:\n${capsule}\n\n` +
        `Protected by AES-256-GCM authenticated encryption.\n` +
        `Decrypt using VaultKey with the secret PIN sent separately.`;

      await Share.share({
        title: `VaultKey Encrypted Secret: ${item.title}`,
        message: shareMessage,
      });

      ToastAndroid.show('Capsule ready to send', ToastAndroid.SHORT);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create encrypted share');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDirectPlainShare = async () => {
    Alert.alert(
      'Security Confirmation',
      'Warning: Sharing in plaintext sends credentials without encryption. Anyone who intercepts this message can read them. Proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Share Plaintext',
          style: 'destructive',
          onPress: async () => {
            try {
              let text = `VaultKey Credential: ${item.title}\n`;
              if (item.username) text += `Username: ${item.username}\n`;
              if (item.type === 'LOGIN') {
                const pass = await vaultNative.getSecret(item.id, 'password');
                text += `Password: ${pass}\n`;
              }
              await Share.share({
                title: `Credential: ${item.title}`,
                message: text,
              });
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Share failed');
            }
          },
        },
      ]
    );
  };

  const handleCopyPin = async () => {
    await clipboardNative.copySecure(pin, 'Transfer PIN', 30);
    ToastAndroid.show('Transfer PIN copied (auto-clears in 30s)', ToastAndroid.SHORT);
  };

  const handleCopyCapsule = async () => {
    if (generatedCapsule) {
      await clipboardNative.copySecure(generatedCapsule, 'Capsule', 60);
      ToastAndroid.show('Encrypted capsule copied to clipboard', ToastAndroid.SHORT);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Card style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconRing}>
              <ShareIcon size={24} color={colors.primary} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>Secure Share / Send</Text>
              <Text style={styles.subtitle}>Send sensitive secret with AES-256-GCM encryption</Text>
            </View>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Target Item Preview */}
            <View style={styles.targetPreview}>
              <Text style={styles.targetLabel}>Target Credential</Text>
              <Text style={styles.targetTitle}>{item.title}</Text>
              {item.username ? (
                <Text style={styles.targetUser}>User: {item.username}</Text>
              ) : null}
            </View>

            {/* Mode Selector */}
            <View style={styles.modeTabs}>
              <TouchableOpacity
                style={[styles.modeTab, shareMode === 'ENCRYPTED' && styles.modeTabActive]}
                onPress={() => setShareMode('ENCRYPTED')}
              >
                <LockIcon size={16} color={shareMode === 'ENCRYPTED' ? colors.primaryLight : colors.textSecondary} />
                <Text style={[styles.modeTabText, shareMode === 'ENCRYPTED' && styles.modeTabTextActive]}>
                  Encrypted Capsule
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modeTab, shareMode === 'PLAIN' && styles.modeTabActive]}
                onPress={() => setShareMode('PLAIN')}
              >
                <ShareIcon size={16} color={shareMode === 'PLAIN' ? colors.warningLight : colors.textSecondary} />
                <Text style={[styles.modeTabText, shareMode === 'PLAIN' && styles.modeTabTextActive]}>
                  Plain Share
                </Text>
              </TouchableOpacity>
            </View>

            {shareMode === 'ENCRYPTED' ? (
              <View style={styles.encryptedSection}>
                <View style={styles.infoBox}>
                  <ShieldCheckIcon size={18} color={colors.primary} />
                  <Text style={styles.infoText}>
                    The recipient needs this Transfer PIN to decrypt the secret in their VaultKey app. Send the PIN over a separate channel for maximum security!
                  </Text>
                </View>

                {/* PIN Input / Generator */}
                <View style={styles.pinRow}>
                  <View style={styles.pinInputWrap}>
                    <Input
                      label="Transfer PIN / Passphrase"
                      value={pin}
                      onChangeText={setPin}
                      placeholder="Enter 4-6 digit PIN"
                    />
                  </View>
                  <TouchableOpacity style={styles.regenBtn} onPress={generateNewPin}>
                    <KeyIcon size={18} color={colors.primary} />
                    <Text style={styles.regenBtnText}>New PIN</Text>
                  </TouchableOpacity>
                </View>

                {/* Quick copy PIN button */}
                <TouchableOpacity style={styles.copyPinBtn} onPress={handleCopyPin}>
                  <CopyIcon size={16} color={colors.textSecondary} />
                  <Text style={styles.copyPinText}>Copy PIN: {pin}</Text>
                </TouchableOpacity>

                {/* Generated Capsule Preview if ready */}
                {generatedCapsule ? (
                  <View style={styles.capsuleBox}>
                    <Text style={styles.capsuleLabel}>Encrypted Capsule Ready</Text>
                    <Text style={styles.capsuleCode} numberOfLines={2} ellipsizeMode="middle">
                      {generatedCapsule}
                    </Text>
                    <TouchableOpacity style={styles.copyCapsuleBtn} onPress={handleCopyCapsule}>
                      <CopyIcon size={16} color={colors.primaryLight} />
                      <Text style={styles.copyCapsuleText}>Copy Capsule Code</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                <Button
                  title="Share Encrypted Capsule..."
                  onPress={handleCreateAndShareCapsule}
                  loading={isProcessing}
                  style={styles.actionBtn}
                  icon={<SendIcon size={18} color={colors.white} />}
                />
              </View>
            ) : (
              <View style={styles.plainSection}>
                <View style={styles.warningBox}>
                  <Text style={styles.warningTitle}>Zero-Knowledge Warning</Text>
                  <Text style={styles.warningDesc}>
                    Plaintext sharing will send unencrypted login credentials over the chosen communication app.
                  </Text>
                </View>

                <Button
                  title="Share Plaintext Credentials"
                  variant="danger"
                  onPress={handleDirectPlainShare}
                  style={styles.actionBtn}
                  icon={<ShareIcon size={18} color={colors.white} />}
                />
              </View>
            )}
          </ScrollView>

          <Button title="Close" variant="ghost" onPress={onClose} style={styles.closeBtn} />
        </Card>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  iconRing: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  body: {
    marginBottom: spacing.md,
  },
  targetPreview: {
    backgroundColor: colors.cardSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
  },
  targetLabel: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  targetTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginTop: 2,
  },
  targetUser: {
    fontSize: typography.fontSizes.xs,
    color: colors.primaryLight,
    marginTop: 2,
  },
  modeTabs: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    backgroundColor: colors.cardSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeTabActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: colors.primary,
  },
  modeTabText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  modeTabTextActive: {
    color: colors.primaryLight,
    fontWeight: typography.fontWeights.bold,
  },
  encryptedSection: {
    gap: spacing.sm,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: typography.fontSizes.xs,
    color: colors.primaryLight,
    lineHeight: 18,
  },
  pinRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  pinInputWrap: {
    flex: 1,
  },
  regenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    backgroundColor: colors.cardSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.base,
  },
  regenBtnText: {
    fontSize: typography.fontSizes.xs,
    color: colors.primary,
    fontWeight: typography.fontWeights.semibold,
  },
  copyPinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
  copyPinText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
  },
  capsuleBox: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xs,
  },
  capsuleLabel: {
    fontSize: 11,
    color: colors.primaryLight,
    fontWeight: typography.fontWeights.semibold,
  },
  capsuleCode: {
    fontSize: 11,
    color: colors.textMuted,
    fontFamily: 'monospace',
    marginTop: 4,
  },
  copyCapsuleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  copyCapsuleText: {
    fontSize: typography.fontSizes.xs,
    color: colors.primary,
    fontWeight: typography.fontWeights.medium,
  },
  plainSection: {
    gap: spacing.base,
  },
  warningBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  warningTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.dangerLight,
  },
  warningDesc: {
    fontSize: typography.fontSizes.xs,
    color: colors.dangerLight,
    marginTop: 4,
    lineHeight: 18,
  },
  actionBtn: {
    marginTop: spacing.md,
  },
  closeBtn: {
    marginTop: spacing.xs,
  },
});

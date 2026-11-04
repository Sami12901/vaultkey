import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ToastAndroid,
  Linking,
  Image,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography, spacing, radius, useTheme } from '../../theme';

import { VaultItemSummary, DecryptedVaultMediaResult } from '../../types';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { WebsiteIcon } from '../../components/common/WebsiteIcon';
import { SecretField } from '../../components/vault/SecretField';
import {
  CopyIcon,
  EditIcon,
  DeleteIcon,
  StarIcon,
  ShareIcon,
  VideoIcon,
  DownloadIcon,
  LockIcon,
} from '../../components/icons';
import { SecureShareModal } from '../../components/vault/SecureShareModal';
import { SecureMediaShareModal } from '../../components/vault/SecureMediaShareModal';
import { VirtualBankCard } from '../../components/vault/VirtualBankCard';
import { VirtualBankAccountCard } from '../../components/vault/VirtualBankAccountCard';
import { vaultNative, clipboardNative } from '../../services/nativeBridge';
import { useVaultStore } from '../../stores/vaultStore';
import { useTranslation } from '../../i18n';

interface ItemDetailScreenProps {
  item: VaultItemSummary;
  onBack: () => void;
  onEdit: (item: VaultItemSummary) => void;
}

export const ItemDetailScreen: React.FC<ItemDetailScreenProps> = ({
  item,
  onBack,
  onEdit,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { deleteItem, toggleFavorite, settings } = useVaultStore();


  const [notes, setNotes] = useState<string>('');
  const [urls, setUrls] = useState<string>('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);

  // Card fields
  const [cardholder, setCardholder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cvv, setCvv] = useState('');
  const [brand, setBrand] = useState(item.cardBrand || 'Visa');
  const [pin, setPin] = useState('');
  const [cardType, setCardType] = useState('Credit');
  const [billingZip, setBillingZip] = useState('');

  // Bank fields
  const [bankName, setBankName] = useState(item.bankName || '');
  const [accountHolder, setAccountHolder] = useState(item.subtitle || '');
  const [accountNumber, setAccountNumber] = useState(item.maskedAccountNumber || '');
  const [routingNumber, setRoutingNumber] = useState('');
  const [swiftBic, setSwiftBic] = useState('');
  const [iban, setIban] = useState('');
  const [accountType, setAccountType] = useState('Checking');

  // Media fields
  const [decryptedMedia, setDecryptedMedia] = useState<DecryptedVaultMediaResult | null>(null);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [exportingMedia, setExportingMedia] = useState(false);

  useEffect(() => {
    if (item.type === 'LOGIN') {
      vaultNative.getSecret(item.id, 'notes').then(setNotes).catch(() => {});
      vaultNative.getSecret(item.id, 'urls').then(setUrls).catch(() => {});
    } else if (item.type === 'CREDENTIAL_CARD') {
      vaultNative.getSecret(item.id, 'cardNumber').then(setCardNumber).catch(() => {});
      vaultNative.getSecret(item.id, 'cardholderName').then(setCardholder).catch(() => {});
      vaultNative.getSecret(item.id, 'expiryMonth').then(setExpiryMonth).catch(() => {});
      vaultNative.getSecret(item.id, 'expiryYear').then(setExpiryYear).catch(() => {});
      vaultNative.getSecret(item.id, 'cvv').then(setCvv).catch(() => {});
      vaultNative.getSecret(item.id, 'cardBrand').then(setBrand).catch(() => {});
      vaultNative.getSecret(item.id, 'pin').then(setPin).catch(() => {});
      vaultNative.getSecret(item.id, 'cardType').then(setCardType).catch(() => {});
      vaultNative.getSecret(item.id, 'billingZip').then(setBillingZip).catch(() => {});
    } else if (item.type === 'BANK_ACCOUNT') {
      vaultNative.getSecret(item.id, 'accountNumber').then(setAccountNumber).catch(() => {});
      vaultNative.getSecret(item.id, 'bankName').then(setBankName).catch(() => {});
      vaultNative.getSecret(item.id, 'accountHolder').then(setAccountHolder).catch(() => {});
      vaultNative.getSecret(item.id, 'routingNumber').then(setRoutingNumber).catch(() => {});
      vaultNative.getSecret(item.id, 'swiftBic').then(setSwiftBic).catch(() => {});
      vaultNative.getSecret(item.id, 'iban').then(setIban).catch(() => {});
      vaultNative.getSecret(item.id, 'accountType').then(setAccountType).catch(() => {});
    } else if (item.type === 'SECURE_MEDIA') {
      setLoadingMedia(true);
      vaultNative
        .getDecryptedMedia(item.id)
        .then(res => {
          setDecryptedMedia(res);
          if (res.notes) setNotes(res.notes);
        })
        .catch(err => {
          Alert.alert(t('error'), err?.message || 'Failed to decrypt media');
        })
        .finally(() => setLoadingMedia(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id, item.type]);

  const handleExportToGallery = async () => {
    setExportingMedia(true);
    try {
      await vaultNative.exportVaultMediaToGallery(item.id);
      ToastAndroid.show(t('exportSuccess'), ToastAndroid.LONG);
    } catch (e: any) {
      Alert.alert(t('error'), e?.message || 'Failed to export media to gallery');
    } finally {
      setExportingMedia(false);
    }
  };

  const handleCopyUsername = async () => {
    if (item.username) {
      await clipboardNative.copySecure(item.username, 'Username', settings.clipboardClearSeconds);
      ToastAndroid.show('Username copied securely', ToastAndroid.SHORT);
    }
  };

  const handleOpenUrl = () => {
    try {
      let target = '';
      if (urls && urls.startsWith('[')) {
        const parsed = JSON.parse(urls);
        if (parsed.length > 0) target = parsed[0];
      }
      if (target) {
        if (!target.startsWith('http://') && !target.startsWith('https://')) {
          target = `https://${target}`;
        }
        Linking.openURL(target);
      }
    } catch {
      // Ignored
    }
  };

  const handleDelete = () => {
    Alert.alert(
      t('delete'),
      `Are you sure you want to delete "${item.title}"?`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            await deleteItem(item.id);
            ToastAndroid.show('Item deleted', ToastAndroid.SHORT);
            onBack();
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title={item.title}
        subtitle={item.type}
        onBack={onBack}
        rightAction={
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => setShowShareModal(true)}
              accessibilityRole="button"
              accessibilityLabel="Share"
            >
              <ShareIcon size={19} color={colors.primaryLight} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => toggleFavorite(item.id)}
              accessibilityRole="button"
              accessibilityLabel="Favorite"
            >
              <StarIcon size={20} filled={item.isFavorite} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => onEdit(item)}
              accessibilityRole="button"
              accessibilityLabel="Edit"
            >
              <EditIcon size={20} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconBtn, styles.deleteBtn]}
              onPress={handleDelete}
              accessibilityRole="button"
              accessibilityLabel="Delete"
            >
              <DeleteIcon size={20} color={colors.danger} />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView style={[styles.content, { backgroundColor: colors.background }]} contentContainerStyle={styles.scrollContent}>
        {/* Brand & Website Hero Card */}
        <Card style={styles.heroCard}>
          <View style={styles.heroRow}>
            <WebsiteIcon
              url={urls || item.website}
              title={item.title}
              type={item.type}
              size={54}
              style={styles.heroIconMargin}
            />
            <View style={styles.heroInfo}>
              <Text style={[styles.heroTitle, { color: colors.text }]} numberOfLines={1}>
                {item.title}
              </Text>
              {item.subtitle ? (
                <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                  {item.subtitle}
                </Text>
              ) : null}
            </View>
          </View>

        </Card>

        {/* Meta / Tags */}
        <View style={styles.metaContainer}>
          {item.folderName ? <Badge label={`Folder: ${item.folderName}`} variant="muted" /> : null}
          {item.tags.map(tag => (
            <Badge key={tag} label={tag} variant="accent" />
          ))}
        </View>

        {/* LOGIN CREDENTIAL FIELDS */}
        {item.type === 'LOGIN' ? (
          <Card style={styles.card}>
            {item.username ? (
              <View style={styles.fieldRow}>
                <View style={styles.fieldText}>
                  <Text style={styles.label}>{t('usernameLabel')}</Text>
                  <Text style={styles.value}>{item.username}</Text>
                </View>
                <TouchableOpacity
                  style={styles.copyBtn}
                  onPress={handleCopyUsername}
                  accessibilityRole="button"
                  accessibilityLabel="Copy username"
                >
                  <CopyIcon size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            ) : null}

            <SecretField
              label={t('passwordLabel')}
              value=""
              onFetchSecret={() => vaultNative.getSecret(item.id, 'password')}
              clipboardTimeoutSeconds={settings.clipboardClearSeconds}
            />

            {urls && urls !== '[]' ? (
              <TouchableOpacity style={styles.urlRow} onPress={handleOpenUrl}>
                <Text style={styles.urlText}>Open Website</Text>
              </TouchableOpacity>
            ) : null}
          </Card>
        ) : null}

        {/* CREDIT CARD FIELDS */}
        {item.type === 'CREDENTIAL_CARD' ? (
          <>
            <VirtualBankCard
              title={item.title}
              cardholderName={cardholder || item.subtitle || 'CARDHOLDER'}
              cardNumber={cardNumber || item.maskedNumber || '•••• •••• •••• ••••'}
              expiryMonth={expiryMonth}
              expiryYear={expiryYear}
              cardBrand={brand}
              cardType={cardType}
              cvv={cvv}
              pin={pin}
            />

            <Card style={styles.card}>
              {cardholder || item.subtitle ? (
                <View style={styles.fieldRow}>
                  <View style={styles.fieldText}>
                    <Text style={styles.label}>{t('cardholderLabel')}</Text>
                    <Text style={styles.value}>{cardholder || item.subtitle}</Text>
                  </View>
                </View>
              ) : null}

              <SecretField
                label={t('cardNumberLabel')}
                value={cardNumber}
                onFetchSecret={() => vaultNative.getSecret(item.id, 'cardNumber')}
                clipboardTimeoutSeconds={settings.clipboardClearSeconds}
              />

              <SecretField
                label={t('cvvLabel')}
                value={cvv}
                maskLength={4}
                onFetchSecret={() => vaultNative.getSecret(item.id, 'cvv')}
                clipboardTimeoutSeconds={settings.clipboardClearSeconds}
              />

              {pin ? (
                <SecretField
                  label={t('pinLabel')}
                  value={pin}
                  maskLength={4}
                  onFetchSecret={() => vaultNative.getSecret(item.id, 'pin')}
                  clipboardTimeoutSeconds={settings.clipboardClearSeconds}
                />
              ) : null}

              {billingZip ? (
                <View style={styles.fieldRow}>
                  <View style={styles.fieldText}>
                    <Text style={styles.label}>{t('billingZipLabel')}</Text>
                    <Text style={styles.value}>{billingZip}</Text>
                  </View>
                </View>
              ) : null}
            </Card>
          </>
        ) : null}

        {/* BANK ACCOUNT FIELDS */}
        {item.type === 'BANK_ACCOUNT' ? (
          <>
            <VirtualBankAccountCard
              title={item.title}
              bankName={bankName || item.bankName || 'Bank Account'}
              accountHolder={accountHolder || item.subtitle || ''}
              accountNumber={accountNumber || item.maskedAccountNumber || ''}
              routingNumber={routingNumber}
              swiftBic={swiftBic}
              iban={iban}
              accountType={accountType}
            />

            <Card style={styles.card}>
              <View style={styles.fieldRow}>
                <View style={styles.fieldText}>
                  <Text style={styles.label}>{t('bankNameLabel')}</Text>
                  <Text style={styles.value}>{bankName || item.bankName || '—'}</Text>
                </View>
              </View>

              <View style={styles.fieldRow}>
                <View style={styles.fieldText}>
                  <Text style={styles.label}>{t('accountHolderLabel')}</Text>
                  <Text style={styles.value}>{accountHolder || item.subtitle || '—'}</Text>
                </View>
              </View>

              <SecretField
                label={t('accountNumberLabel')}
                value={accountNumber}
                onFetchSecret={() => vaultNative.getSecret(item.id, 'accountNumber')}
                clipboardTimeoutSeconds={settings.clipboardClearSeconds}
              />

              {routingNumber ? (
                <SecretField
                  label={t('routingNumberLabel')}
                  value={routingNumber}
                  onFetchSecret={() => vaultNative.getSecret(item.id, 'routingNumber')}
                  clipboardTimeoutSeconds={settings.clipboardClearSeconds}
                />
              ) : null}

              {swiftBic ? (
                <View style={styles.fieldRow}>
                  <View style={styles.fieldText}>
                    <Text style={styles.label}>{t('swiftBicLabel')}</Text>
                    <Text style={styles.value}>{swiftBic}</Text>
                  </View>
                </View>
              ) : null}

              {iban ? (
                <View style={styles.fieldRow}>
                  <View style={styles.fieldText}>
                    <Text style={styles.label}>{t('ibanLabel')}</Text>
                    <Text style={styles.value}>{iban}</Text>
                  </View>
                </View>
              ) : null}
            </Card>
          </>
        ) : null}

        {/* SECURE NOTE FIELDS */}
        {item.type === 'SECURE_NOTE' ? (
          <Card style={styles.card}>
            <SecretField
              label={t('notesLabel')}
              value=""
              onFetchSecret={() => vaultNative.getSecret(item.id, 'content')}
              clipboardTimeoutSeconds={settings.clipboardClearSeconds}
            />
          </Card>
        ) : null}

        {/* SECURE MEDIA HERO & ACTIONS */}
        {item.type === 'SECURE_MEDIA' ? (
          <Card style={styles.card}>
            <View style={styles.mediaHeroContainer}>
              {loadingMedia ? (
                <View style={styles.mediaLoadingBox}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.mediaLoadingText}>{t('loading')}</Text>
                </View>
              ) : decryptedMedia ? (
                <>
                  {decryptedMedia.mediaType === 'IMAGE' ? (
                    <Image
                      source={{ uri: decryptedMedia.fileUri }}
                      style={styles.decryptedImageFull}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.decryptedVideoContainer}>
                      <VideoIcon size={48} color={colors.primary} />
                      <Text style={styles.videoNoticeTitle}>{decryptedMedia.fileName}</Text>
                      <Text style={styles.videoNoticeSubtitle}>
                        {(decryptedMedia.sizeBytes / (1024 * 1024)).toFixed(2)} MB • {decryptedMedia.mimeType}
                      </Text>
                    </View>
                  )}

                  <View style={styles.mediaInfoBar}>
                    <View style={styles.mediaInfoLeft}>
                      <Text style={styles.mediaMetaTitle} numberOfLines={1}>
                        {decryptedMedia.fileName}
                      </Text>
                      <Text style={styles.mediaMetaSub}>
                        {(decryptedMedia.sizeBytes / (1024 * 1024)).toFixed(2)} MB • {decryptedMedia.mimeType}
                      </Text>
                    </View>
                    <View style={styles.secureBadgePill}>
                      <LockIcon size={12} color={colors.primary} />
                      <Text style={styles.secureBadgePillText}>AES-256</Text>
                    </View>
                  </View>

                  {/* Action Buttons: Export to Gallery & Share Encrypted */}
                  <View style={styles.mediaDetailActionsRow}>
                    <TouchableOpacity
                      style={styles.mediaDetailBtn}
                      onPress={handleExportToGallery}
                      disabled={exportingMedia}
                    >
                      {exportingMedia ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <DownloadIcon size={18} color={colors.primary} />
                      )}
                      <Text style={styles.mediaDetailBtnText}>{t('exportToGallery')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.mediaDetailBtnSecondary}
                      onPress={() => setShowMediaModal(true)}
                    >
                      <ShareIcon size={18} color={colors.accentLight} />
                      <Text style={styles.mediaDetailBtnSecondaryText}>{t('shareEncryptedFile')}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : null}
            </View>
          </Card>
        ) : null}

        {/* Extra Notes */}
        {notes ? (
          <Card style={styles.card}>
            <Text style={styles.label}>{t('notesLabel')}</Text>
            <Text style={styles.notesBody}>{notes}</Text>
          </Card>
        ) : null}
      </ScrollView>

      <SecureShareModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        item={item}
      />

      <SecureMediaShareModal
        visible={showMediaModal}
        onClose={() => setShowMediaModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBtn: {
    padding: spacing.xs,
  },
  deleteBtn: {
    marginLeft: spacing.xs,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.base,
  },
  heroCard: {
    padding: spacing.base,
    marginBottom: spacing.base,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroIconMargin: {
    marginRight: spacing.md,
  },
  heroInfo: {
    flex: 1,
  },
  heroTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  heroSubtitle: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  metaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.base,
  },
  card: {
    padding: spacing.base,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.base,
  },
  fieldText: {
    flex: 1,
  },
  label: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  value: {
    fontSize: typography.fontSizes.base,
    color: colors.text,
    fontWeight: typography.fontWeights.medium,
  },
  copyBtn: {
    padding: spacing.xs,
  },
  urlRow: {
    paddingVertical: spacing.sm,
  },
  urlText: {
    fontSize: typography.fontSizes.sm,
    color: colors.primaryLight,
    fontWeight: typography.fontWeights.semibold,
  },
  notesBody: {
    fontSize: typography.fontSizes.sm,
    color: colors.text,
    lineHeight: typography.lineHeights.base,
    marginTop: spacing.xs,
  },
  mediaHeroContainer: {
    gap: spacing.md,
  },
  mediaLoadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  mediaLoadingText: {
    fontSize: typography.fontSizes.sm,
    color: colors.primaryLight,
  },
  decryptedImageFull: {
    width: '100%',
    height: 280,
    borderRadius: radius.md,
    backgroundColor: '#000000',
  },
  decryptedVideoContainer: {
    width: '100%',
    height: 200,
    borderRadius: radius.md,
    backgroundColor: colors.cardSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.base,
    gap: spacing.xs,
  },
  videoNoticeTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
    marginTop: spacing.xs,
  },
  videoNoticeSubtitle: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
  },
  mediaInfoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  mediaInfoLeft: {
    flex: 1,
  },
  mediaMetaTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  mediaMetaSub: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
  },
  secureBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  secureBadgePillText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: colors.primaryLight,
  },
  mediaDetailActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  mediaDetailBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  mediaDetailBtnText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.primaryLight,
  },
  mediaDetailBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.cardSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  mediaDetailBtnSecondaryText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
  },
});
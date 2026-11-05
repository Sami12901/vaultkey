import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ToastAndroid,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../../theme/colors';
import { radius, typography, spacing, useTheme } from '../../theme';
import { Header } from '../../components/common/Header';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { WebsiteIcon } from '../../components/common/WebsiteIcon';
import { VirtualBankCard } from '../../components/vault/VirtualBankCard';
import { VirtualBankAccountCard } from '../../components/vault/VirtualBankAccountCard';
import {
  RefreshIcon,
  CameraIcon,
  ImageIcon,
  VideoIcon,
  LockIcon,
  ShieldIcon,
  ShieldCheckIcon,
} from '../../components/icons';
import { vaultNative } from '../../services/nativeBridge';
import { hibpService } from '../../services/hibpService';
import { useVaultStore } from '../../stores/vaultStore';
import { useTranslation } from '../../i18n';
import { ItemType, PickedMediaResult, VaultItemSummary } from '../../types';

interface ItemEditScreenProps {
  item?: VaultItemSummary | null;
  onBack: () => void;
  onSaved: () => void;
}

export const ItemEditScreen: React.FC<ItemEditScreenProps> = ({
  item,
  onBack,
  onSaved,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { folders, refreshVaultData } = useVaultStore();

  const [itemType, setItemType] = useState<ItemType>('LOGIN');
  const [title, setTitle] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [checkingBreach, setCheckingBreach] = useState(false);
  const [breachResult, setBreachResult] = useState<{ checked: boolean; breached: boolean; count: number; offline?: boolean } | null>(null);
  const [website, setWebsite] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [tagsInput, setTagsInput] = useState('');

  // Card fields
  const [cardholder, setCardholder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cvv, setCvv] = useState('');
  const [brand, setBrand] = useState('Visa');
  const [pin, setPin] = useState('');
  const [cardType, setCardType] = useState('Credit');
  const [billingZip, setBillingZip] = useState('');

  // Bank Account fields
  const [bankName, setBankName] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [swiftBic, setSwiftBic] = useState('');
  const [iban, setIban] = useState('');
  const [accountType, setAccountType] = useState('Checking');

  // Media fields
  const [selectedMedia, setSelectedMedia] = useState<PickedMediaResult | null>(null);
  const [capturing, setCapturing] = useState(false);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!item) return;

    setItemType(item.type);
    setTitle(item.title || '');
    setSelectedFolderId(item.folderId || null);
    setTagsInput(item.tags ? item.tags.join(', ') : '');

    const populateSecrets = async () => {
      try {
        if (item.type === 'LOGIN') {
          setUsername(item.username || '');
          setWebsite(item.website || '');
          const [pwd, nts] = await Promise.all([
            vaultNative.getSecret(item.id, 'password').catch(() => ''),
            vaultNative.getSecret(item.id, 'notes').catch(() => ''),
          ]);
          if (pwd) setPassword(pwd);
          if (nts) setNotes(nts);
        } else if (item.type === 'SECURE_NOTE') {
          const content = await vaultNative.getSecret(item.id, 'content').catch(() => '');
          if (content) setNotes(content);
        } else if (item.type === 'CREDENTIAL_CARD') {
          setBrand(item.cardBrand || 'Visa');
          const [holder, num, expM, expY, cv, p, cType, bZip] = await Promise.all([
            vaultNative.getSecret(item.id, 'cardholderName').catch(() => ''),
            vaultNative.getSecret(item.id, 'cardNumber').catch(() => ''),
            vaultNative.getSecret(item.id, 'expiryMonth').catch(() => ''),
            vaultNative.getSecret(item.id, 'expiryYear').catch(() => ''),
            vaultNative.getSecret(item.id, 'cvv').catch(() => ''),
            vaultNative.getSecret(item.id, 'pin').catch(() => ''),
            vaultNative.getSecret(item.id, 'cardType').catch(() => 'Credit'),
            vaultNative.getSecret(item.id, 'billingZip').catch(() => ''),
          ]);
          if (holder) setCardholder(holder);
          if (num) setCardNumber(num);
          if (expM) setExpiryMonth(expM);
          if (expY) setExpiryYear(expY);
          if (cv) setCvv(cv);
          if (p) setPin(p);
          if (cType) setCardType(cType);
          if (bZip) setBillingZip(bZip);
        } else if (item.type === 'BANK_ACCOUNT') {
          setBankName(item.bankName || '');
          const [holder, num, routing, swift, ib, aType] = await Promise.all([
            vaultNative.getSecret(item.id, 'accountHolder').catch(() => ''),
            vaultNative.getSecret(item.id, 'accountNumber').catch(() => ''),
            vaultNative.getSecret(item.id, 'routingNumber').catch(() => ''),
            vaultNative.getSecret(item.id, 'swiftBic').catch(() => ''),
            vaultNative.getSecret(item.id, 'iban').catch(() => ''),
            vaultNative.getSecret(item.id, 'accountType').catch(() => 'Checking'),
          ]);
          if (holder) setAccountHolder(holder);
          if (num) setAccountNumber(num);
          if (routing) setRoutingNumber(routing);
          if (swift) setSwiftBic(swift);
          if (ib) setIban(ib);
          if (aType) setAccountType(aType);
        }
      } catch (e) {
        console.warn('Failed to load item secrets for editing:', e);
      }
    };

    populateSecrets();
  }, [item]);

  const handleCameraCapture = async (mode: 'PHOTO' | 'VIDEO' = 'PHOTO') => {
    setCapturing(true);
    try {
      const res = await vaultNative.captureMedia(mode);
      setSelectedMedia(res);
      if (!title.trim()) {
        const cleanName = res.fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
        setTitle(cleanName);
      }
    } catch {
      // User cancelled
    } finally {
      setCapturing(false);
    }
  };

  const handleGalleryPick = async (mediaType: string = 'image/*,video/*') => {
    setCapturing(true);
    try {
      const res = await vaultNative.pickMediaFromGallery(mediaType);
      setSelectedMedia(res);
      if (!title.trim()) {
        const cleanName = res.fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
        setTitle(cleanName);
      }
    } catch {
      // User cancelled
    } finally {
      setCapturing(false);
    }
  };

  const handleGeneratePassword = async () => {
    try {
      const res = await vaultNative.generatePassword({ length: 20 });
      if (res.password) {
        setPassword(res.password);
        setBreachResult(null);
        ToastAndroid.show('Generated 20-character password', ToastAndroid.SHORT);
      }
    } catch {
      // Ignored
    }
  };

  const handleCheckBreach = async () => {
    if (!password) {
      ToastAndroid.show('Please enter a password first', ToastAndroid.SHORT);
      return;
    }
    setCheckingBreach(true);
    try {
      const res = await hibpService.checkPasswordBreach(password);
      setBreachResult({ checked: true, breached: res.breached, count: res.count, offline: res.offline });
      if (res.breached) {
        ToastAndroid.show(`Compromised! Found in ${res.count.toLocaleString()} data breaches`, ToastAndroid.LONG);
      } else if (res.offline) {
        ToastAndroid.show('HIBP service offline / unreachable', ToastAndroid.SHORT);
      } else {
        ToastAndroid.show('Clean! No breaches found (k-anonymity verified)', ToastAndroid.SHORT);
      }
    } catch {
      ToastAndroid.show('Failed to verify breach status', ToastAndroid.SHORT);
    } finally {
      setCheckingBreach(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert(t('error'), 'Title is required');
      return;
    }

    setSaving(true);
    try {
      const tags = tagsInput
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      if (itemType === 'LOGIN') {
        const urlsJson = website.trim() ? JSON.stringify([website.trim()]) : '[]';
        await vaultNative.saveLoginItem({
          id: item?.id,
          title: title.trim(),
          username: username.trim(),
          password,
          folderId: selectedFolderId,
          urls: urlsJson,
          notes: notes.trim(),
          tags,
        });
      } else if (itemType === 'SECURE_NOTE') {
        await vaultNative.saveSecureNote({
          id: item?.id,
          title: title.trim(),
          content: notes.trim(),
          folderId: selectedFolderId,
          tags,
        });
      } else if (itemType === 'CREDENTIAL_CARD') {
        await vaultNative.saveCreditCard({
          id: item?.id,
          title: title.trim(),
          cardholderName: cardholder.trim(),
          cardNumber: cardNumber.trim(),
          expiryMonth: expiryMonth.trim(),
          expiryYear: expiryYear.trim(),
          cvv: cvv.trim(),
          cardBrand: brand.trim(),
          pin: pin.trim(),
          cardType: cardType.trim(),
          billingZip: billingZip.trim(),
          folderId: selectedFolderId,
          tags,
        });
      } else if (itemType === 'BANK_ACCOUNT') {
        await vaultNative.saveBankAccount({
          id: item?.id,
          title: title.trim(),
          bankName: bankName.trim(),
          accountHolder: accountHolder.trim(),
          accountNumber: accountNumber.trim(),
          routingNumber: routingNumber.trim(),
          swiftBic: swiftBic.trim(),
          iban: iban.trim(),
          accountType: accountType.trim(),
          folderId: selectedFolderId,
          tags,
        });
      } else if (itemType === 'SECURE_MEDIA') {
        if (!selectedMedia) {
          Alert.alert(t('error'), 'Please take a photo or select a video/image from gallery.');
          setSaving(false);
          return;
        }
        await vaultNative.saveVaultMedia({
          title: title.trim(),
          inputUri: selectedMedia.uri,
          fileName: selectedMedia.fileName,
          mimeType: selectedMedia.mimeType,
          mediaType: selectedMedia.mediaType,
          notes: notes.trim(),
          folderId: selectedFolderId,
          tags,
        });
      }

      ToastAndroid.show('Saved successfully', ToastAndroid.SHORT);
      await refreshVaultData();
      onSaved();
    } catch (e: any) {
      Alert.alert(t('error'), e?.message || 'Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title={item ? (t('edit') || 'Edit Item') : t('addNewItem')}
        onBack={onBack}
        rightAction={
          <Button
            title={t('save')}
            onPress={handleSave}
            loading={saving}
            style={styles.saveBtn}
          />
        }
      />

      <ScrollView style={[styles.content, { backgroundColor: colors.background }]} contentContainerStyle={styles.scrollContent}>

        {/* Type Selector Tabs */}
        <View style={styles.typeRow}>
          <TouchableOpacity
            style={[styles.typeTab, itemType === 'LOGIN' && styles.typeTabActive]}
            onPress={() => setItemType('LOGIN')}
          >
            <Text style={[styles.typeTabText, itemType === 'LOGIN' && styles.typeTabTextActive]}>
              {t('allLogins')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.typeTab, itemType === 'SECURE_NOTE' && styles.typeTabActive]}
            onPress={() => setItemType('SECURE_NOTE')}
          >
            <Text style={[styles.typeTabText, itemType === 'SECURE_NOTE' && styles.typeTabTextActive]}>
              {t('allNotes')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.typeTab, itemType === 'CREDENTIAL_CARD' && styles.typeTabActive]}
            onPress={() => setItemType('CREDENTIAL_CARD')}
          >
            <Text style={[styles.typeTabText, itemType === 'CREDENTIAL_CARD' && styles.typeTabTextActive]}>
              {t('allCards')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.typeTab, itemType === 'BANK_ACCOUNT' && styles.typeTabActive]}
            onPress={() => setItemType('BANK_ACCOUNT')}
          >
            <Text style={[styles.typeTabText, itemType === 'BANK_ACCOUNT' && styles.typeTabTextActive]}>
              {t('allBankAccounts')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.typeTab, itemType === 'SECURE_MEDIA' && styles.typeTabActive]}
            onPress={() => setItemType('SECURE_MEDIA')}
          >
            <Text style={[styles.typeTabText, itemType === 'SECURE_MEDIA' && styles.typeTabTextActive]}>
              {t('allMedia')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Live Website / Brand Icon Preview */}
        {itemType === 'LOGIN' ? (
          <View style={styles.previewContainer}>
            <WebsiteIcon
              url={website}
              title={title}
              type={itemType}
              size={44}
              style={styles.previewIcon}
            />
            <View style={styles.previewTextCol}>
              <Text style={styles.previewBrandLabel}>
                {website || title ? 'Detected Website / Brand' : 'Website Icon Preview'}
              </Text>
              <Text style={styles.previewBrandValue} numberOfLines={1}>
                {website.trim() || title.trim() || 'Enter title or website URL below'}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Common Title */}
        <Input
          label={t('titleLabel')}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. GitHub, Chase Checking, Personal Visa"
        />

        {/* LOGIN FORM */}
        {itemType === 'LOGIN' ? (
          <>
            <Input
              label={t('usernameLabel')}
              value={username}
              onChangeText={setUsername}
              placeholder="username@example.com"
            />

            <View style={styles.passwordRow}>
              <View style={styles.passwordInputWrap}>
                <Input
                  label={t('passwordLabel')}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setBreachResult(null);
                  }}
                  placeholder="Enter or generate password"
                  isPassword
                />
              </View>
              <TouchableOpacity
                style={styles.generateBtn}
                onPress={handleGeneratePassword}
                accessibilityRole="button"
                accessibilityLabel="Generate password"
              >
                <RefreshIcon size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {/* HIBP Breach Checker Chip */}
            <View style={styles.breachRow}>
              <TouchableOpacity
                style={[
                  styles.breachBtn,
                  breachResult?.breached
                    ? styles.breachBtnDanger
                    : breachResult?.checked && !breachResult?.offline
                    ? styles.breachBtnSafe
                    : styles.breachBtnNeutral,
                ]}
                onPress={handleCheckBreach}
                disabled={checkingBreach}
              >
                {checkingBreach ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : breachResult?.breached ? (
                  <>
                    <ShieldIcon size={14} color="#EF4444" />
                    <Text style={styles.breachDangerText}>
                      Compromised: in {breachResult.count.toLocaleString()} breaches!
                    </Text>
                  </>
                ) : breachResult?.checked && !breachResult.offline ? (
                  <>
                    <ShieldCheckIcon size={14} color="#10B981" />
                    <Text style={styles.breachSafeText}>
                      Clean: 0 breaches detected (k-Anonymity)
                    </Text>
                  </>
                ) : (
                  <>
                    <ShieldIcon size={14} color={colors.textSecondary} />
                    <Text style={[styles.breachNeutralText, { color: colors.textSecondary }]}>
                      {breachResult?.offline ? 'Breach API Offline - Retry' : 'Check HaveIBeenPwned Breach Status'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <Input
              label={t('websiteLabel')}
              value={website}
              onChangeText={setWebsite}
              placeholder="https://example.com/login"
            />

            <Input
              label={t('notesLabel')}
              value={notes}
              onChangeText={setNotes}
              placeholder="Additional secure notes..."
              multiline
              numberOfLines={4}
              style={styles.multilineInput}
            />
          </>
        ) : null}

        {/* SECURE NOTE FORM */}
        {itemType === 'SECURE_NOTE' ? (
          <Input
            label={t('notesLabel')}
            value={notes}
            onChangeText={setNotes}
            placeholder="Write your sensitive note here..."
            multiline
            numberOfLines={8}
            style={styles.multilineInput}
          />
        ) : null}

        {/* CREDIT CARD FORM */}
        {itemType === 'CREDENTIAL_CARD' ? (
          <>
            <VirtualBankCard
              title={title}
              cardholderName={cardholder}
              cardNumber={cardNumber}
              expiryMonth={expiryMonth}
              expiryYear={expiryYear}
              cardBrand={brand}
              cardType={cardType}
              cvv={cvv}
              pin={pin}
              showSensitiveInitially
            />

            <Input
              label={t('cardholderLabel')}
              value={cardholder}
              onChangeText={setCardholder}
              placeholder="Name on card"
            />
            <Input
              label={t('cardNumberLabel')}
              value={cardNumber}
              onChangeText={setCardNumber}
              placeholder="16-digit card number"
              keyboardType="numeric"
            />
            <View style={styles.inlineRow}>
              <View style={styles.inlineField}>
                <Input
                  label={t('expiryLabel')}
                  value={expiryMonth}
                  onChangeText={setExpiryMonth}
                  placeholder="MM"
                  maxLength={2}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.inlineField}>
                <Input
                  label="Year"
                  value={expiryYear}
                  onChangeText={setExpiryYear}
                  placeholder="YY"
                  maxLength={2}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.inlineField}>
                <Input
                  label={t('cvvLabel')}
                  value={cvv}
                  onChangeText={setCvv}
                  placeholder="CVV"
                  maxLength={4}
                  isPassword
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.inlineRow}>
              <View style={styles.inlineField}>
                <Input
                  label={t('pinLabel')}
                  value={pin}
                  onChangeText={setPin}
                  placeholder="PIN"
                  maxLength={6}
                  isPassword
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.inlineField}>
                <Input
                  label={t('cardTypeLabel')}
                  value={cardType}
                  onChangeText={setCardType}
                  placeholder="Credit / Debit"
                />
              </View>
            </View>

            <Input
              label={t('brandLabel')}
              value={brand}
              onChangeText={setBrand}
              placeholder="Visa, Mastercard, Amex, Discover"
            />

            <Input
              label={t('billingZipLabel')}
              value={billingZip}
              onChangeText={setBillingZip}
              placeholder="Postal / ZIP Code"
            />
          </>
        ) : null}

        {/* BANK ACCOUNT FORM */}
        {itemType === 'BANK_ACCOUNT' ? (
          <>
            <VirtualBankAccountCard
              title={title}
              bankName={bankName}
              accountHolder={accountHolder}
              accountNumber={accountNumber}
              routingNumber={routingNumber}
              swiftBic={swiftBic}
              iban={iban}
              accountType={accountType}
              showSensitiveInitially
            />

            <Input
              label={t('bankNameLabel')}
              value={bankName}
              onChangeText={setBankName}
              placeholder="e.g. JPMorgan Chase, HSBC, City Bank"
            />

            <Input
              label={t('accountHolderLabel')}
              value={accountHolder}
              onChangeText={setAccountHolder}
              placeholder="Account holder full legal name"
            />

            <Input
              label={t('accountNumberLabel')}
              value={accountNumber}
              onChangeText={setAccountNumber}
              placeholder="Account number"
              keyboardType="numeric"
            />

            <View style={styles.inlineRow}>
              <View style={styles.inlineField}>
                <Input
                  label={t('routingNumberLabel')}
                  value={routingNumber}
                  onChangeText={setRoutingNumber}
                  placeholder="Routing / ABA"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.inlineField}>
                <Input
                  label={t('accountTypeLabel')}
                  value={accountType}
                  onChangeText={setAccountType}
                  placeholder="Checking / Savings"
                />
              </View>
            </View>

            <View style={styles.inlineRow}>
              <View style={styles.inlineField}>
                <Input
                  label={t('swiftBicLabel')}
                  value={swiftBic}
                  onChangeText={setSwiftBic}
                  placeholder="SWIFT / BIC Code"
                  autoCapitalize="characters"
                />
              </View>
              <View style={styles.inlineField}>
                <Input
                  label={t('ibanLabel')}
                  value={iban}
                  onChangeText={setIban}
                  placeholder="IBAN Code"
                  autoCapitalize="characters"
                />
              </View>
            </View>
          </>
        ) : null}

        {/* SECURE_MEDIA Form */}
        {itemType === 'SECURE_MEDIA' ? (
          <View style={styles.mediaFormContainer}>
            {/* Camera / Gallery Action Buttons */}
            <View style={styles.mediaActionsGrid}>
              <TouchableOpacity
                style={styles.mediaActionBtn}
                onPress={() => handleCameraCapture('PHOTO')}
                disabled={capturing}
              >
                <CameraIcon size={22} color={colors.primary} />
                <Text style={styles.mediaActionBtnText}>{t('takePhoto')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.mediaActionBtn}
                onPress={() => handleCameraCapture('VIDEO')}
                disabled={capturing}
              >
                <VideoIcon size={22} color={colors.accentLight} />
                <Text style={styles.mediaActionBtnText}>{t('takeVideo')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.mediaActionBtn}
                onPress={() => handleGalleryPick('image/*,video/*')}
                disabled={capturing}
              >
                <ImageIcon size={22} color={colors.warning} />
                <Text style={styles.mediaActionBtnText}>{t('chooseFromGallery')}</Text>
              </TouchableOpacity>
            </View>

            {capturing ? (
              <View style={styles.capturingBox}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.capturingText}>{t('loading')}</Text>
              </View>
            ) : null}

            {/* Selected Media Preview Card */}
            {selectedMedia ? (
              <View style={styles.selectedMediaCard}>
                <View style={styles.previewRow}>
                  {selectedMedia.mediaType === 'IMAGE' ? (
                    <Image
                      source={{ uri: selectedMedia.uri }}
                      style={styles.thumbnailPreview}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.videoBadgePreview}>
                      <VideoIcon size={32} color={colors.primary} />
                    </View>
                  )}
                  <View style={styles.mediaMetaCol}>
                    <Text style={styles.mediaFileName} numberOfLines={1}>
                      {selectedMedia.fileName}
                    </Text>
                    <Text style={styles.mediaDetailsText}>
                      {(selectedMedia.sizeBytes / (1024 * 1024)).toFixed(2)} MB • {selectedMedia.mimeType}
                    </Text>
                    <View style={styles.secureBadgeRow}>
                      <LockIcon size={12} color={colors.primary} />
                      <Text style={styles.secureNoticeText}>AES-256-GCM Hardware Encrypted</Text>
                    </View>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.emptyMediaPrompt}>
                <ImageIcon size={36} color={colors.textMuted} />
                <Text style={styles.emptyMediaTitle}>{t('mediaPreview')}</Text>
                <Text style={styles.emptyMediaDesc}>{t('encryptedMediaNotice')}</Text>
              </View>
            )}

            {/* Caption / Notes */}
            <Input
              label={t('notesLabel')}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add private note, location, or tag..."
              multiline
              numberOfLines={3}
              style={styles.multilineInput}
            />
          </View>
        ) : null}

        {/* Folder Picker */}
        {folders.length > 0 ? (
          <View style={styles.folderSection}>
            <Text style={styles.sectionLabel}>{t('folderLabel')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.folderScroll}>
              <TouchableOpacity
                style={[styles.folderChip, selectedFolderId === null && styles.folderChipActive]}
                onPress={() => setSelectedFolderId(null)}
              >
                <Text style={[styles.folderChipText, selectedFolderId === null && styles.folderChipTextActive]}>
                  None
                </Text>
              </TouchableOpacity>
              {folders.map(f => (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.folderChip, selectedFolderId === f.id && styles.folderChipActive]}
                  onPress={() => setSelectedFolderId(f.id)}
                >
                  <Text style={[styles.folderChipText, selectedFolderId === f.id && styles.folderChipTextActive]}>
                    {f.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Tags */}
        <Input
          label={t('tagsLabel')}
          value={tagsInput}
          onChangeText={setTagsInput}
          placeholder="work, personal, finance"
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  saveBtn: {
    height: 38,
    paddingHorizontal: spacing.base,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: 48,
  },
  typeRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 4,
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewIcon: {
    marginRight: spacing.md,
  },
  previewTextCol: {
    flex: 1,
  },
  previewBrandLabel: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewBrandValue: {
    fontSize: typography.fontSizes.sm,
    color: colors.primaryLight,
    fontWeight: typography.fontWeights.semibold,
    marginTop: 2,
  },
  typeTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  typeTabActive: {
    backgroundColor: colors.primaryMuted,
  },
  typeTabText: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  typeTabTextActive: {
    color: colors.primaryLight,
    fontWeight: typography.fontWeights.semibold,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  passwordInputWrap: {
    flex: 1,
  },
  generateBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.cardSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
    marginTop: 24,
  },
  inlineRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  inlineField: {
    flex: 1,
  },
  multilineInput: {
    height: 120,
    textAlignVertical: 'top',
    paddingTop: spacing.sm,
  },
  folderSection: {
    marginBottom: spacing.base,
  },
  sectionLabel: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  folderScroll: {
    flexDirection: 'row',
  },
  folderChip: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  folderChipActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  folderChipText: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
  },
  folderChipTextActive: {
    color: colors.primaryLight,
    fontWeight: typography.fontWeights.semibold,
  },
  mediaFormContainer: {
    marginBottom: spacing.base,
  },
  mediaActionsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  mediaActionBtn: {
    flex: 1,
    backgroundColor: colors.cardSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  mediaActionBtnText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  capturingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  capturingText: {
    fontSize: typography.fontSizes.sm,
    color: colors.primaryLight,
  },
  selectedMediaCard: {
    backgroundColor: colors.cardSecondary,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.base,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  thumbnailPreview: {
    width: 64,
    height: 64,
    borderRadius: radius.sm,
    backgroundColor: colors.card,
  },
  videoBadgePreview: {
    width: 64,
    height: 64,
    borderRadius: radius.sm,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  mediaMetaCol: {
    flex: 1,
    gap: 2,
  },
  mediaFileName: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  mediaDetailsText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
  },
  secureBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  secureNoticeText: {
    fontSize: 10,
    color: colors.primaryLight,
    fontWeight: typography.fontWeights.medium,
  },
  emptyMediaPrompt: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardSecondary,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.base,
  },
  emptyMediaTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
    marginTop: spacing.xs,
  },
  emptyMediaDesc: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  breachRow: {
    marginBottom: spacing.md,
    marginTop: -spacing.xs,
  },
  breachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  breachBtnNeutral: {
    backgroundColor: colors.cardSecondary,
    borderColor: colors.border,
  },
  breachBtnDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#EF4444',
  },
  breachBtnSafe: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10B981',
  },
  breachNeutralText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
  },
  breachDangerText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: '#EF4444',
  },
  breachSafeText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: '#10B981',
  },
});
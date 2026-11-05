import React, { useState, useEffect } from 'react';
import { useTheme } from '../theme';
import { useTranslation } from '../i18n';
import {
  LockIcon,
  SearchIcon,
  PlusIcon,
  CardIcon,
  BankIcon,
  NotesIcon,
  FolderIcon,
  ShieldIcon,
  KeyIcon,
  SettingsIcon,
  StarIcon,
  CopyIcon,
  CheckIcon,
  EyeIcon,
  EyeOffIcon,
  TrashIcon,
} from '../components/Icons';
import { VirtualCard } from '../components/VirtualCard';
import { VirtualBankAccount } from '../components/VirtualBankAccount';
import { vaultDesktop } from '../services/vaultService';
import { VaultItemSummary, ItemType, Folder } from '../types';

const ClockIcon: React.FC<{ size?: number; color?: string }> = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

interface VaultViewProps {
  onOpenGenerator: () => void;
  onOpenSecurity: () => void;
  onOpenBackup: () => void;
  onOpenSettings: () => void;
  onLock: () => void;
}

export const VaultView: React.FC<VaultViewProps> = ({
  onOpenGenerator,
  onOpenSecurity,
  onOpenBackup,
  onOpenSettings,
  onLock,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const [items, setItems] = useState<VaultItemSummary[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<VaultItemSummary | null>(null);

  // Edit / Add state
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editType, setEditType] = useState<ItemType>('LOGIN');
  const [editTitle, setEditTitle] = useState<string>('');
  const [editFolderId, setEditFolderId] = useState<string | null>(null);
  const [editFavorite, setEditFavorite] = useState<boolean>(false);

  // Login fields
  const [editUsername, setEditUsername] = useState<string>('');
  const [editPassword, setEditPassword] = useState<string>('');
  const [editWebsite, setEditWebsite] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');

  // Card fields
  const [editCardholder, setEditCardholder] = useState<string>('');
  const [editCardNumber, setEditCardNumber] = useState<string>('');
  const [editExpiryMonth, setEditExpiryMonth] = useState<string>('');
  const [editExpiryYear, setEditExpiryYear] = useState<string>('');
  const [editCvv, setEditCvv] = useState<string>('');
  const [editCardBrand, setEditCardBrand] = useState<string>('Visa');
  const [editPin, setEditPin] = useState<string>('');
  const [editCardType, setEditCardType] = useState<string>('Credit');
  const [editBillingZip, setEditBillingZip] = useState<string>('');

  // Bank fields
  const [editBankName, setEditBankName] = useState<string>('');
  const [editAccountHolder, setEditAccountHolder] = useState<string>('');
  const [editAccountNumber, setEditAccountNumber] = useState<string>('');
  const [editRoutingNumber, setEditRoutingNumber] = useState<string>('');
  const [editSwiftBic, setEditSwiftBic] = useState<string>('');
  const [editIban, setEditIban] = useState<string>('');
  const [editAccountType, setEditAccountType] = useState<string>('Checking');

  // 2FA Authenticator fields
  const [editIssuer, setEditIssuer] = useState<string>('');
  const [editAccountName, setEditAccountName] = useState<string>('');
  const [editSecret, setEditSecret] = useState<string>('');
  const [editAlgorithm, setEditAlgorithm] = useState<string>('SHA1');
  const [editDigits, setEditDigits] = useState<number>(6);
  const [editPeriod, setEditPeriod] = useState<number>(30);

  // Live TOTP token state
  const [totpData, setTotpData] = useState<{ code: string; remainingSeconds: number; period: number; progress: number } | null>(null);
  const [totpCopied, setTotpCopied] = useState<boolean>(false);

  // Secret display state
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});
  const [secretCache, setSecretCache] = useState<Record<string, string>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedCategory, selectedFolderId, favoritesOnly, searchQuery]);

  // Live countdown and code generation for selected 2FA items
  useEffect(() => {
    let timer: any = null;
    if (selectedItem && selectedItem.type === 'AUTHENTICATOR_2FA') {
      const updateTotp = async () => {
        try {
          const res = await vaultDesktop.getTotpCode(selectedItem.id);
          if (res) {
            setTotpData(res);
          }
        } catch (e) {
          console.warn('Failed to fetch TOTP token:', e);
        }
      };

      updateTotp();
      timer = setInterval(updateTotp, 1000);
    } else {
      setTotpData(null);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [selectedItem?.id, selectedItem?.type]);

  const loadData = async () => {
    try {
      const [fetchedItems, fetchedFolders] = await Promise.all([
        vaultDesktop.getItemSummaries({
          type: selectedCategory === 'ALL' ? undefined : selectedCategory,
          folderId: selectedFolderId || undefined,
          favoritesOnly,
          query: searchQuery || undefined,
        }),
        vaultDesktop.getFolders(),
      ]);
      setItems(fetchedItems);
      setFolders(fetchedFolders);
      if (selectedItem) {
        const updated = fetchedItems.find((i: VaultItemSummary) => i.id === selectedItem.id);
        setSelectedItem(updated || null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectItem = (item: VaultItemSummary) => {
    setSelectedItem(item);
    setIsEditing(false);
    setRevealedSecrets({});
    setSecretCache({});
  };

  const handleToggleReveal = async (fieldName: string) => {
    if (!selectedItem) return;
    const isRev = !revealedSecrets[fieldName];
    setRevealedSecrets((prev) => ({ ...prev, [fieldName]: isRev }));

    if (isRev && !secretCache[fieldName]) {
      const secret = await vaultDesktop.getSecret(selectedItem.id, fieldName);
      setSecretCache((prev) => ({ ...prev, [fieldName]: secret }));
    }
  };

  const handleCopySecret = async (fieldName: string, label: string) => {
    if (!selectedItem) return;
    let secret = secretCache[fieldName];
    if (!secret) {
      secret = await vaultDesktop.getSecret(selectedItem.id, fieldName);
      setSecretCache((prev) => ({ ...prev, [fieldName]: secret }));
    }
    await vaultDesktop.copySecure(secret, label, 30);
    setCopiedKey(fieldName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleToggleFavorite = async () => {
    if (!selectedItem) return;
    const newFav = await vaultDesktop.toggleFavorite(selectedItem.id);
    setSelectedItem((prev) => (prev ? { ...prev, isFavorite: newFav } : null));
    loadData();
  };

  const handleDeleteItem = async () => {
    if (!selectedItem) return;
    if (window.confirm(`Are you sure you want to delete "${selectedItem.title}"?`)) {
      await vaultDesktop.deleteItem(selectedItem.id);
      setSelectedItem(null);
      setIsEditing(false);
      loadData();
    }
  };

  const handleStartAddNew = (type: ItemType) => {
    setSelectedItem(null);
    setIsEditing(true);
    setEditType(type);
    setEditTitle('');
    setEditFolderId(selectedFolderId);
    setEditFavorite(false);

    setEditUsername('');
    setEditPassword('');
    setEditWebsite('');
    setEditNotes('');

    setEditCardholder('');
    setEditCardNumber('');
    setEditExpiryMonth('');
    setEditExpiryYear('');
    setEditCvv('');
    setEditCardBrand('Visa');
    setEditPin('');
    setEditCardType('Credit');
    setEditBillingZip('');

    setEditBankName('');
    setEditAccountHolder('');
    setEditAccountNumber('');
    setEditRoutingNumber('');
    setEditSwiftBic('');
    setEditIban('');
    setEditAccountType('Checking');

    setEditIssuer('');
    setEditAccountName('');
    setEditSecret('');
    setEditAlgorithm('SHA1');
    setEditDigits(6);
    setEditPeriod(30);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle) {
      alert('Title is required');
      return;
    }

    try {
      if (editType === 'LOGIN') {
        await vaultDesktop.saveLoginItem({
          id: selectedItem?.id,
          title: editTitle,
          username: editUsername,
          password: editPassword,
          website: editWebsite,
          notes: editNotes,
          folderId: editFolderId,
          isFavorite: editFavorite,
        });
      } else if (editType === 'AUTHENTICATOR_2FA') {
        await vaultDesktop.saveAuthenticatorItem({
          id: selectedItem?.id,
          title: editTitle || editIssuer || '2FA Authenticator',
          issuer: editIssuer,
          accountName: editAccountName,
          secret: editSecret,
          algorithm: editAlgorithm,
          digits: Number(editDigits) || 6,
          period: Number(editPeriod) || 30,
          folderId: editFolderId,
          isFavorite: editFavorite,
        });
      } else if (editType === 'CREDENTIAL_CARD') {
        await vaultDesktop.saveCreditCard({
          id: selectedItem?.id,
          title: editTitle,
          cardholderName: editCardholder,
          cardNumber: editCardNumber,
          expiryMonth: editExpiryMonth,
          expiryYear: editExpiryYear,
          cvv: editCvv,
          cardBrand: editCardBrand,
          pin: editPin,
          cardType: editCardType,
          billingZip: editBillingZip,
          folderId: editFolderId,
          isFavorite: editFavorite,
        });
      } else if (editType === 'BANK_ACCOUNT') {
        await vaultDesktop.saveBankAccount({
          id: selectedItem?.id,
          title: editTitle,
          bankName: editBankName,
          accountHolder: editAccountHolder,
          accountNumber: editAccountNumber,
          routingNumber: editRoutingNumber,
          swiftBic: editSwiftBic,
          iban: editIban,
          accountType: editAccountType,
          folderId: editFolderId,
          isFavorite: editFavorite,
        });
      } else if (editType === 'SECURE_NOTE') {
        await vaultDesktop.saveSecureNote({
          id: selectedItem?.id,
          title: editTitle,
          content: editNotes,
          folderId: editFolderId,
          isFavorite: editFavorite,
        });
      }

      setIsEditing(false);
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to save item');
    }
  };

  const getItemIcon = (type: ItemType, _item?: VaultItemSummary) => {
    switch (type) {
      case 'LOGIN': return <KeyIcon size={18} color={colors.primary} />;
      case 'AUTHENTICATOR_2FA': return <ClockIcon size={18} color="#8B5CF6" />;
      case 'CREDENTIAL_CARD': return <CardIcon size={18} color="#F59E0B" />;
      case 'BANK_ACCOUNT': return <BankIcon size={18} color="#10B981" />;
      case 'SECURE_NOTE': return <NotesIcon size={18} color="#38BDF8" />;
      default: return <KeyIcon size={18} color={colors.primary} />;
    }
  };

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', backgroundColor: colors.background, color: colors.text }}>
      {/* 1. LEFT NAVIGATION RAIL */}
      <div
        style={{
          width: '240px',
          backgroundColor: colors.backgroundSecondary,
          borderRight: `1px solid ${colors.border}`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          {/* Brand Header */}
          <div style={{ padding: '20px 18px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: colors.primaryMuted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldIcon size={20} color={colors.primary} />
            </div>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '15px' }}>VaultKey</div>
              <div style={{ fontSize: '11px', color: colors.textMuted }}>Zero-Knowledge</div>
            </div>
          </div>

          {/* Categories Navigation */}
          <div style={{ padding: '12px 10px' }}>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: colors.textMuted, fontWeight: 700, padding: '4px 10px', marginBottom: '4px' }}>
              Categories
            </div>
            {[
              { id: 'ALL', name: t('allItems'), icon: <ShieldIcon size={16} /> },
              { id: 'LOGIN', name: t('logins'), icon: <KeyIcon size={16} /> },
              { id: 'AUTHENTICATOR_2FA', name: '2FA Authenticator', icon: <ClockIcon size={16} /> },
              { id: 'CREDENTIAL_CARD', name: t('cards'), icon: <CardIcon size={16} /> },
              { id: 'BANK_ACCOUNT', name: t('bankAccounts'), icon: <BankIcon size={16} /> },
              { id: 'SECURE_NOTE', name: t('secureNotes'), icon: <NotesIcon size={16} /> },
            ].map((cat) => {
              const active = selectedCategory === cat.id && !favoritesOnly && !selectedFolderId;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setSelectedFolderId(null);
                    setFavoritesOnly(false);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: active ? colors.primaryMuted : 'transparent',
                    color: active ? colors.primary : colors.textSecondary,
                    fontWeight: active ? 600 : 400,
                    cursor: 'pointer',
                    fontSize: '13px',
                    textAlign: 'left',
                    marginBottom: '2px',
                  }}
                >
                  {cat.icon}
                  <span>{cat.name}</span>
                </button>
              );
            })}

            {/* Favorites Filter */}
            <button
              onClick={() => {
                setFavoritesOnly(true);
                setSelectedFolderId(null);
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 12px',
                borderRadius: '8px',
                border: 'none',
                background: favoritesOnly ? colors.primaryMuted : 'transparent',
                color: favoritesOnly ? colors.primary : colors.textSecondary,
                fontWeight: favoritesOnly ? 600 : 400,
                cursor: 'pointer',
                fontSize: '13px',
                textAlign: 'left',
                marginTop: '4px',
              }}
            >
              <StarIcon size={16} filled={favoritesOnly} />
              <span>{t('favorites')}</span>
            </button>

            {/* Folders */}
            {folders.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: colors.textMuted, fontWeight: 700, padding: '4px 10px', marginBottom: '4px' }}>
                  {t('folders')}
                </div>
                {folders.map((f) => {
                  const active = selectedFolderId === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => {
                        setSelectedFolderId(f.id);
                        setFavoritesOnly(false);
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: 'none',
                        background: active ? colors.primaryMuted : 'transparent',
                        color: active ? colors.primary : colors.textSecondary,
                        fontWeight: active ? 600 : 400,
                        cursor: 'pointer',
                        fontSize: '12px',
                        textAlign: 'left',
                      }}
                    >
                      <FolderIcon size={14} color={f.color || colors.textMuted} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Tools & Lock */}
        <div style={{ padding: '12px 10px', borderTop: `1px solid ${colors.border}` }}>
          {[
            { name: t('generator'), icon: <KeyIcon size={16} />, action: onOpenGenerator },
            { name: t('security'), icon: <ShieldIcon size={16} />, action: onOpenSecurity },
            { name: t('backup'), icon: <FolderIcon size={16} />, action: onOpenBackup },
            { name: t('settings'), icon: <SettingsIcon size={16} />, action: onOpenSettings },
          ].map((tool, idx) => (
            <button
              key={idx}
              onClick={tool.action}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '7px 12px',
                borderRadius: '8px',
                border: 'none',
                background: 'transparent',
                color: colors.textSecondary,
                cursor: 'pointer',
                fontSize: '12px',
                textAlign: 'left',
                marginBottom: '2px',
              }}
            >
              {tool.icon}
              <span>{tool.name}</span>
            </button>
          ))}

          <button
            onClick={onLock}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 12px',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`,
              background: colors.card,
              color: colors.danger,
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              marginTop: '8px',
            }}
          >
            <LockIcon size={15} color={colors.danger} />
            <span>{t('lock')}</span>
          </button>
        </div>
      </div>

      {/* 2. CENTER COLUMN: ITEMS LIST */}
      <div
        style={{
          width: '340px',
          borderRight: `1px solid ${colors.border}`,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: colors.cardSecondary,
        }}
      >
        {/* Search and New Item Header */}
        <div style={{ padding: '16px', borderBottom: `1px solid ${colors.border}` }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                padding: '8px 12px',
              }}
            >
              <SearchIcon size={16} color={colors.textMuted} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchPlaceholder')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: colors.text,
                  fontSize: '13px',
                  width: '100%',
                }}
              />
            </div>

            {/* Quick Add Button */}
            <button
              onClick={() => handleStartAddNew('LOGIN')}
              title="Add New Item"
              style={{
                padding: '8px 12px',
                backgroundColor: colors.primary,
                border: 'none',
                borderRadius: '8px',
                color: '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: 600,
                fontSize: '13px',
              }}
            >
              <PlusIcon size={16} /> New
            </button>
          </div>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {(['LOGIN', 'AUTHENTICATOR_2FA', 'CREDENTIAL_CARD', 'BANK_ACCOUNT', 'SECURE_NOTE'] as ItemType[]).map((tType) => (
              <button
                key={tType}
                onClick={() => handleStartAddNew(tType)}
                style={{
                  fontSize: '11px',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: `1px solid ${colors.border}`,
                  background: colors.card,
                  color: colors.textSecondary,
                  cursor: 'pointer',
                }}
              >
                + {tType === 'AUTHENTICATOR_2FA' ? '2FA' : tType === 'CREDENTIAL_CARD' ? 'Card' : tType === 'BANK_ACCOUNT' ? 'Bank' : tType === 'SECURE_NOTE' ? 'Note' : 'Login'}
              </button>
            ))}
          </div>
        </div>

        {/* Item Cards List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: colors.textMuted, fontSize: '13px' }}>
              No items found. Click "+ New" to add credentials.
            </div>
          ) : (
            items.map((item) => {
              const isSelected = selectedItem?.id === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectItem(item)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    borderRadius: '10px',
                    backgroundColor: isSelected ? colors.primaryMuted : colors.card,
                    border: `1px solid ${isSelected ? colors.primary : colors.border}`,
                    cursor: 'pointer',
                    marginBottom: '8px',
                  }}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      backgroundColor: colors.cardSecondary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {getItemIcon(item.type, item)}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: '13px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: isSelected ? colors.primary : colors.text,
                        }}
                      >
                        {item.title}
                      </div>
                      {item.isFavorite && <StarIcon size={14} color="#F59E0B" filled />}
                    </div>

                    <div
                      style={{
                        fontSize: '12px',
                        color: colors.textMuted,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginTop: '2px',
                      }}
                    >
                      {item.subtitle || item.type}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 3. RIGHT COLUMN: DETAIL / EDIT PANEL */}
      <div style={{ flex: 1, backgroundColor: colors.card, display: 'flex', flexDirection: 'column' }}>
        {isEditing ? (
          /* EDIT / ADD FORM */
          <form onSubmit={handleSave} style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>
                {selectedItem ? `Edit ${selectedItem.title}` : `Add New ${editType}`}
              </h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.border}`,
                    background: 'transparent',
                    color: colors.text,
                    cursor: 'pointer',
                  }}
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: colors.primary,
                    color: '#FFFFFF',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {t('save')}
                </button>
              </div>
            </div>

            {/* Form Fields */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, maxWidth: '680px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>{t('title')}</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="e.g. GitHub, Netflix, Chase Bank..."
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.border}`,
                    backgroundColor: colors.background,
                    color: colors.text,
                    outline: 'none',
                  }}
                />
              </div>

              {/* Type specific fields */}
              {editType === 'LOGIN' && (
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>{t('username')}</label>
                    <input
                      type="text"
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      placeholder="user@example.com"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: `1px solid ${colors.border}`,
                        backgroundColor: colors.background,
                        color: colors.text,
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>{t('password')}</label>
                    <input
                      type="password"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="Password"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: `1px solid ${colors.border}`,
                        backgroundColor: colors.background,
                        color: colors.text,
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>{t('website')}</label>
                    <input
                      type="text"
                      value={editWebsite}
                      onChange={(e) => setEditWebsite(e.target.value)}
                      placeholder="https://example.com"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: `1px solid ${colors.border}`,
                        backgroundColor: colors.background,
                        color: colors.text,
                        outline: 'none',
                      }}
                    />
                  </div>
                </>
              )}

              {editType === 'CREDENTIAL_CARD' && (
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>{t('cardholderName')}</label>
                    <input
                      type="text"
                      value={editCardholder}
                      onChange={(e) => setEditCardholder(e.target.value)}
                      placeholder="JOHN DOE"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: `1px solid ${colors.border}`,
                        backgroundColor: colors.background,
                        color: colors.text,
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>{t('cardNumber')}</label>
                    <input
                      type="text"
                      value={editCardNumber}
                      onChange={(e) => setEditCardNumber(e.target.value)}
                      placeholder="4111 2222 3333 4444"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: `1px solid ${colors.border}`,
                        backgroundColor: colors.background,
                        color: colors.text,
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Expiry Month</label>
                      <input
                        type="text"
                        placeholder="MM"
                        value={editExpiryMonth}
                        onChange={(e) => setEditExpiryMonth(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '8px',
                          border: `1px solid ${colors.border}`,
                          backgroundColor: colors.background,
                          color: colors.text,
                          outline: 'none',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Expiry Year</label>
                      <input
                        type="text"
                        placeholder="YY"
                        value={editExpiryYear}
                        onChange={(e) => setEditExpiryYear(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '8px',
                          border: `1px solid ${colors.border}`,
                          backgroundColor: colors.background,
                          color: colors.text,
                          outline: 'none',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>CVV</label>
                      <input
                        type="password"
                        placeholder="123"
                        value={editCvv}
                        onChange={(e) => setEditCvv(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '8px',
                          border: `1px solid ${colors.border}`,
                          backgroundColor: colors.background,
                          color: colors.text,
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>
                </>
              )}

              {editType === 'BANK_ACCOUNT' && (
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>{t('bankName')}</label>
                    <input
                      type="text"
                      value={editBankName}
                      onChange={(e) => setEditBankName(e.target.value)}
                      placeholder="JPMorgan Chase, HSBC, etc."
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: `1px solid ${colors.border}`,
                        backgroundColor: colors.background,
                        color: colors.text,
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>{t('accountHolder')}</label>
                    <input
                      type="text"
                      value={editAccountHolder}
                      onChange={(e) => setEditAccountHolder(e.target.value)}
                      placeholder="Account Owner Name"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: `1px solid ${colors.border}`,
                        backgroundColor: colors.background,
                        color: colors.text,
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>{t('accountNumber')}</label>
                    <input
                      type="text"
                      value={editAccountNumber}
                      onChange={(e) => setEditAccountNumber(e.target.value)}
                      placeholder="Account Number"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: `1px solid ${colors.border}`,
                        backgroundColor: colors.background,
                        color: colors.text,
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>{t('routingNumber')}</label>
                      <input
                        type="text"
                        value={editRoutingNumber}
                        onChange={(e) => setEditRoutingNumber(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '8px',
                          border: `1px solid ${colors.border}`,
                          backgroundColor: colors.background,
                          color: colors.text,
                          outline: 'none',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>{t('swiftBic')}</label>
                      <input
                        type="text"
                        value={editSwiftBic}
                        onChange={(e) => setEditSwiftBic(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '8px',
                          border: `1px solid ${colors.border}`,
                          backgroundColor: colors.background,
                          color: colors.text,
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>
                </>
              )}

              {editType === 'AUTHENTICATOR_2FA' && (
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Service / Issuer</label>
                    <input
                      type="text"
                      value={editIssuer}
                      onChange={(e) => setEditIssuer(e.target.value)}
                      placeholder="e.g. Google, GitHub, AWS"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: `1px solid ${colors.border}`,
                        backgroundColor: colors.background,
                        color: colors.text,
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Account Name / Email</label>
                    <input
                      type="text"
                      value={editAccountName}
                      onChange={(e) => setEditAccountName(e.target.value)}
                      placeholder="e.g. user@example.com"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: `1px solid ${colors.border}`,
                        backgroundColor: colors.background,
                        color: colors.text,
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Secret Key (Base32)</label>
                    <input
                      type="password"
                      value={editSecret}
                      onChange={(e) => setEditSecret(e.target.value)}
                      placeholder="e.g. JBSWY3DPEHPK3PXP"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: `1px solid ${colors.border}`,
                        backgroundColor: colors.background,
                        color: colors.text,
                        outline: 'none',
                        fontFamily: 'monospace',
                      }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Algorithm</label>
                      <select
                        value={editAlgorithm}
                        onChange={(e) => setEditAlgorithm(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '8px',
                          border: `1px solid ${colors.border}`,
                          backgroundColor: colors.background,
                          color: colors.text,
                          outline: 'none',
                        }}
                      >
                        <option value="SHA1">SHA1</option>
                        <option value="SHA256">SHA256</option>
                        <option value="SHA512">SHA512</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Digits</label>
                      <select
                        value={editDigits}
                        onChange={(e) => setEditDigits(Number(e.target.value))}
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '8px',
                          border: `1px solid ${colors.border}`,
                          backgroundColor: colors.background,
                          color: colors.text,
                          outline: 'none',
                        }}
                      >
                        <option value={6}>6</option>
                        <option value={8}>8</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Period (s)</label>
                      <select
                        value={editPeriod}
                        onChange={(e) => setEditPeriod(Number(e.target.value))}
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '8px',
                          border: `1px solid ${colors.border}`,
                          backgroundColor: colors.background,
                          color: colors.text,
                          outline: 'none',
                        }}
                      >
                        <option value={30}>30s</option>
                        <option value={60}>60s</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Notes */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>{t('notes')}</label>
                <textarea
                  rows={4}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Additional secure notes..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.border}`,
                    backgroundColor: colors.background,
                    color: colors.text,
                    outline: 'none',
                  }}
                />
              </div>

              {/* Folder Selector */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>{t('folders')}</label>
                <select
                  value={editFolderId || ''}
                  onChange={(e) => setEditFolderId(e.target.value || null)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.border}`,
                    backgroundColor: colors.background,
                    color: colors.text,
                    outline: 'none',
                  }}
                >
                  <option value="">No Folder</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              {/* Favorite Toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={editFavorite}
                  onChange={(e) => setEditFavorite(e.target.checked)}
                />
                Mark as Favorite
              </label>
            </div>
          </form>
        ) : selectedItem ? (
          /* DETAIL VIEW */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: colors.primaryMuted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {getItemIcon(selectedItem.type)}
                </div>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>{selectedItem.title}</h2>
                  <div style={{ fontSize: '12px', color: colors.textMuted }}>{selectedItem.type}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={handleToggleFavorite}
                  title="Favorite"
                  style={{
                    background: 'transparent',
                    border: `1px solid ${colors.border}`,
                    color: selectedItem.isFavorite ? '#F59E0B' : colors.textMuted,
                    borderRadius: '8px',
                    padding: '8px',
                    cursor: 'pointer',
                  }}
                >
                  <StarIcon size={18} filled={selectedItem.isFavorite} />
                </button>
                <button
                  onClick={async () => {
                    setIsEditing(true);
                    setEditType(selectedItem.type);
                    setEditTitle(selectedItem.title);
                    setEditFolderId(selectedItem.folderId || null);
                    setEditFavorite(selectedItem.isFavorite);
                    if (selectedItem.type === 'AUTHENTICATOR_2FA') {
                      setEditIssuer((selectedItem as any).issuer || selectedItem.title || '');
                      setEditAccountName((selectedItem as any).accountName || selectedItem.subtitle || '');
                      try {
                        const sec = await vaultDesktop.getSecret(selectedItem.id, 'secret');
                        setEditSecret(sec);
                      } catch {}
                    }
                  }}
                  style={{
                    background: colors.cardSecondary,
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                    borderRadius: '8px',
                    padding: '8px 16px',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  {t('edit')}
                </button>
                <button
                  onClick={handleDeleteItem}
                  title="Delete"
                  style={{
                    background: colors.dangerLight,
                    border: `1px solid ${colors.danger}`,
                    color: colors.danger,
                    borderRadius: '8px',
                    padding: '8px',
                    cursor: 'pointer',
                  }}
                >
                  <TrashIcon size={18} />
                </button>
              </div>
            </div>

            {/* Item Details */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, maxWidth: '680px' }}>
              {/* Login Details */}
              {selectedItem.type === 'LOGIN' && (
                <div>
                  <div style={{ backgroundColor: colors.cardSecondary, padding: '16px', borderRadius: '12px', border: `1px solid ${colors.border}`, marginBottom: '16px' }}>
                    <div style={{ fontSize: '11px', color: colors.textMuted, textTransform: 'uppercase', marginBottom: '4px' }}>Username / Email</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '15px', fontWeight: 600, fontFamily: 'monospace' }}>
                        {selectedItem.username || selectedItem.subtitle || '—'}
                      </div>
                      <button
                        onClick={() => vaultDesktop.copySecure(selectedItem.username || selectedItem.subtitle || '', 'Username', 30)}
                        style={{ background: 'transparent', border: 'none', color: colors.primary, cursor: 'pointer' }}
                      >
                        <CopyIcon size={18} />
                      </button>
                    </div>
                  </div>

                  <div style={{ backgroundColor: colors.cardSecondary, padding: '16px', borderRadius: '12px', border: `1px solid ${colors.border}`, marginBottom: '16px' }}>
                    <div style={{ fontSize: '11px', color: colors.textMuted, textTransform: 'uppercase', marginBottom: '4px' }}>Password</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '15px', fontWeight: 600, fontFamily: 'monospace', letterSpacing: '1px' }}>
                        {revealedSecrets['password'] ? secretCache['password'] : '••••••••••••'}
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleToggleReveal('password')}
                          style={{ background: 'transparent', border: 'none', color: colors.textSecondary, cursor: 'pointer' }}
                        >
                          {revealedSecrets['password'] ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                        </button>
                        <button
                          onClick={() => handleCopySecret('password', 'Password')}
                          style={{ background: 'transparent', border: 'none', color: colors.primary, cursor: 'pointer' }}
                        >
                          {copiedKey === 'password' ? <CheckIcon size={18} /> : <CopyIcon size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {selectedItem.website && (
                    <div style={{ backgroundColor: colors.cardSecondary, padding: '16px', borderRadius: '12px', border: `1px solid ${colors.border}`, marginBottom: '16px' }}>
                      <div style={{ fontSize: '11px', color: colors.textMuted, textTransform: 'uppercase', marginBottom: '4px' }}>Website</div>
                      <div style={{ fontSize: '14px', color: colors.primary }}>
                        <a href={selectedItem.website} target="_blank" rel="noreferrer" style={{ color: colors.primary, textDecoration: 'none' }}>
                          {selectedItem.website} ↗
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Credit Card Details */}
              {selectedItem.type === 'CREDENTIAL_CARD' && (
                <div>
                  <div style={{ marginBottom: '24px' }}>
                    <VirtualCard
                      cardholderName={selectedItem.subtitle?.split(' ')[0] || 'CARDHOLDER'}
                      maskedNumber={selectedItem.maskedNumber || '•••• •••• •••• ••••'}
                      cardNumber={secretCache['cardNumber']}
                      expiryMonth="12"
                      expiryYear="28"
                      cvv={secretCache['cvv']}
                      cardBrand={selectedItem.cardBrand || 'Card'}
                      revealed={revealedSecrets['cardNumber']}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                    <button
                      onClick={() => handleToggleReveal('cardNumber')}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '8px',
                        border: `1px solid ${colors.border}`,
                        background: colors.cardSecondary,
                        color: colors.text,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontWeight: 600,
                      }}
                    >
                      {revealedSecrets['cardNumber'] ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                      {revealedSecrets['cardNumber'] ? 'Hide Number' : 'Reveal Number'}
                    </button>
                    <button
                      onClick={() => handleCopySecret('cardNumber', 'Card Number')}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '8px',
                        border: `1px solid ${colors.border}`,
                        background: colors.cardSecondary,
                        color: colors.text,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontWeight: 600,
                      }}
                    >
                      <CopyIcon size={16} /> Copy Number
                    </button>
                  </div>
                </div>
              )}

              {/* Bank Account Details */}
              {selectedItem.type === 'BANK_ACCOUNT' && (
                <div>
                  <div style={{ marginBottom: '24px' }}>
                    <VirtualBankAccount
                      bankName={selectedItem.bankName || selectedItem.title}
                      accountHolder={selectedItem.subtitle?.split(' ')[0] || 'ACCOUNT OWNER'}
                      maskedAccountNumber={selectedItem.maskedAccountNumber || '•••• ••••'}
                      accountNumber={secretCache['accountNumber']}
                      revealed={revealedSecrets['accountNumber']}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                    <button
                      onClick={() => handleToggleReveal('accountNumber')}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '8px',
                        border: `1px solid ${colors.border}`,
                        background: colors.cardSecondary,
                        color: colors.text,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontWeight: 600,
                      }}
                    >
                      {revealedSecrets['accountNumber'] ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                      {revealedSecrets['accountNumber'] ? 'Hide Account Number' : 'Reveal Account Number'}
                    </button>
                    <button
                      onClick={() => handleCopySecret('accountNumber', 'Account Number')}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '8px',
                        border: `1px solid ${colors.border}`,
                        background: colors.cardSecondary,
                        color: colors.text,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontWeight: 600,
                      }}
                    >
                      <CopyIcon size={16} /> Copy Account Number
                    </button>
                  </div>
                </div>
              )}

              {/* Secure Note Details */}
              {selectedItem.type === 'SECURE_NOTE' && (
                <div style={{ backgroundColor: colors.cardSecondary, padding: '20px', borderRadius: '12px', border: `1px solid ${colors.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ fontSize: '12px', color: colors.textMuted, textTransform: 'uppercase' }}>Encrypted Content</div>
                    <button
                      onClick={() => handleCopySecret('notes', 'Note')}
                      style={{ background: 'transparent', border: 'none', color: colors.primary, cursor: 'pointer' }}
                    >
                      <CopyIcon size={18} />
                    </button>
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: '22px', fontSize: '14px', fontFamily: 'monospace' }}>
                    {secretCache['notes'] || selectedItem.subtitle || 'Loading note...'}
                  </div>
                </div>
              )}

              {/* 2FA Authenticator Details */}
              {selectedItem.type === 'AUTHENTICATOR_2FA' && (
                <div>
                  {/* Big Hero TOTP Display */}
                  <div
                    style={{
                      backgroundColor: colors.cardSecondary,
                      padding: '24px',
                      borderRadius: '16px',
                      border: `1px solid ${colors.border}`,
                      marginBottom: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <ClockIcon size={18} color={colors.primary} />
                      <span style={{ fontSize: '13px', fontWeight: 600, color: colors.textSecondary }}>
                        {(selectedItem as any).issuer || selectedItem.title} {(selectedItem as any).accountName ? `(${(selectedItem as any).accountName})` : ''}
                      </span>
                    </div>

                    {/* Token & Ring Section */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px', margin: '12px 0' }}>
                      {/* Live Circular Countdown Progress Ring */}
                      {(() => {
                        const progress = totpData?.progress ?? 1;
                        const remaining = totpData?.remainingSeconds ?? 30;
                        const strokeColor = remaining > 10 ? '#10B981' : remaining > 5 ? '#F59E0B' : '#EF4444';
                        const radius = 24;
                        const circumference = 2 * Math.PI * radius;
                        const strokeDashoffset = circumference * (1 - Math.max(0, Math.min(1, progress)));

                        return (
                          <div style={{ position: 'relative', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="56" height="56" style={{ transform: 'rotate(-90deg)' }}>
                              <circle
                                cx="28"
                                cy="28"
                                r={radius}
                                stroke={colors.border}
                                strokeWidth="4"
                                fill="transparent"
                              />
                              <circle
                                cx="28"
                                cy="28"
                                r={radius}
                                stroke={strokeColor}
                                strokeWidth="4"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                                fill="transparent"
                                style={{ transition: 'stroke-dashoffset 0.8s linear, stroke 0.3s ease' }}
                              />
                            </svg>
                            <span style={{ position: 'absolute', fontSize: '12px', fontWeight: 700, color: strokeColor }}>
                              {remaining}s
                            </span>
                          </div>
                        );
                      })()}

                      {/* Large Formatted TOTP Code */}
                      <div
                        style={{
                          fontSize: '34px',
                          fontWeight: 800,
                          letterSpacing: '3px',
                          fontFamily: 'monospace',
                          color: (totpData?.remainingSeconds ?? 30) <= 5 ? '#EF4444' : colors.primary,
                        }}
                      >
                        {totpData?.code
                          ? (totpData.code.length === 6
                              ? `${totpData.code.slice(0, 3)} ${totpData.code.slice(3)}`
                              : totpData.code)
                          : '••••••'}
                      </div>
                    </div>

                    {/* 1-Click Copy Token Button */}
                    <button
                      onClick={async () => {
                        if (totpData?.code) {
                          await vaultDesktop.copySecure(totpData.code, '2FA Code', 30);
                          setTotpCopied(true);
                          setTimeout(() => setTotpCopied(false), 2000);
                        }
                      }}
                      style={{
                        marginTop: '12px',
                        padding: '10px 24px',
                        borderRadius: '10px',
                        backgroundColor: totpCopied ? '#10B981' : colors.primary,
                        border: 'none',
                        color: '#FFFFFF',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontWeight: 600,
                        fontSize: '14px',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {totpCopied ? <CheckIcon size={18} /> : <CopyIcon size={18} />}
                      {totpCopied ? 'Copied 2FA Code!' : '1-Click Copy Token'}
                    </button>
                  </div>

                  {/* Account Metadata Card */}
                  <div style={{ backgroundColor: colors.cardSecondary, padding: '16px', borderRadius: '12px', border: `1px solid ${colors.border}`, marginBottom: '16px' }}>
                    <div style={{ fontSize: '11px', color: colors.textMuted, textTransform: 'uppercase', marginBottom: '4px' }}>Issuer / Account</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: colors.text }}>
                      {(selectedItem as any).issuer || selectedItem.title || '—'} {(selectedItem as any).accountName ? `• ${(selectedItem as any).accountName}` : ''}
                    </div>
                  </div>

                  {/* Secret Key Card with Toggle */}
                  <div style={{ backgroundColor: colors.cardSecondary, padding: '16px', borderRadius: '12px', border: `1px solid ${colors.border}`, marginBottom: '16px' }}>
                    <div style={{ fontSize: '11px', color: colors.textMuted, textTransform: 'uppercase', marginBottom: '4px' }}>Secret Key (Base32)</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'monospace', letterSpacing: '1px' }}>
                        {revealedSecrets['secret'] ? (secretCache['secret'] || '••••••••') : '•••• •••• •••• ••••'}
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleToggleReveal('secret')}
                          style={{ background: 'transparent', border: 'none', color: colors.textSecondary, cursor: 'pointer' }}
                        >
                          {revealedSecrets['secret'] ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                        </button>
                        <button
                          onClick={() => handleCopySecret('secret', 'Secret Key')}
                          style={{ background: 'transparent', border: 'none', color: colors.primary, cursor: 'pointer' }}
                        >
                          {copiedKey === 'secret' ? <CheckIcon size={18} /> : <CopyIcon size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* EMPTY STATE */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: colors.textMuted }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: colors.cardSecondary, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <ShieldIcon size={32} color={colors.primary} />
            </div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: colors.text, marginBottom: '6px' }}>Select an Item</div>
            <div style={{ fontSize: '13px' }}>Choose a credential from the list or click "+ New" to add one.</div>
          </div>
        )}
      </div>
    </div>
  );
};

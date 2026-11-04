import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BankIcon, CopyIcon, CheckIcon, VisibilityIcon, VisibilityOffIcon } from '../icons';
import { clipboardNative } from '../../services/nativeBridge';

interface VirtualBankAccountCardProps {
  title?: string;
  bankName?: string;
  accountHolder?: string;
  accountNumber?: string;
  routingNumber?: string;
  swiftBic?: string;
  iban?: string;
  accountType?: string;
  showSensitiveInitially?: boolean;
}

export const VirtualBankAccountCard: React.FC<VirtualBankAccountCardProps> = ({
  title,
  bankName = 'Bank Account',
  accountHolder = 'ACCOUNT HOLDER',
  accountNumber = '•••• ••••',
  routingNumber,
  swiftBic,
  iban,
  accountType = 'Checking',
  showSensitiveInitially = false,
}) => {
  const [revealed, setRevealed] = useState(showSensitiveInitially);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = async (value: string, label: string) => {
    if (!value || value.includes('•')) return;
    try {
      await clipboardNative.copySecure(value, label, 30);
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback
    }
  };

  const displayAccountNumber = revealed ? accountNumber : (
    accountNumber.includes('••••') ? accountNumber : `•••• ${accountNumber.slice(-4) || '••••'}`
  );

  return (
    <View style={[styles.cardContainer, { backgroundColor: '#0F172A', borderColor: '#1E293B' }]}>
      {/* Header: Bank Icon, Bank Name & Account Type */}
      <View style={styles.headerRow}>
        <View style={styles.bankIdentity}>
          <View style={styles.bankIconWrap}>
            <BankIcon size={22} color="#38BDF8" />
          </View>
          <View style={styles.bankTextWrap}>
            <Text style={styles.bankName} numberOfLines={1}>{bankName}</Text>
            <Text style={styles.accountTitle} numberOfLines={1}>{title || 'Vault Account'}</Text>
          </View>
        </View>
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>{accountType.toUpperCase()}</Text>
        </View>
      </View>

      {/* Account Number Box */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => handleCopy(accountNumber, 'Account Number')}
        style={styles.accountNumberSection}
      >
        <View>
          <Text style={styles.fieldLabel}>ACCOUNT NUMBER</Text>
          <Text style={styles.accountNumberText}>{displayAccountNumber}</Text>
        </View>
        <View style={styles.copyPill}>
          {copiedField === 'Account Number' ? (
            <CheckIcon size={16} color="#10B981" />
          ) : (
            <CopyIcon size={16} color="#64748B" />
          )}
        </View>
      </TouchableOpacity>

      {/* Account Holder */}
      <View style={styles.holderSection}>
        <Text style={styles.fieldLabel}>ACCOUNT HOLDER</Text>
        <Text style={styles.accountHolderText} numberOfLines={1}>{accountHolder.toUpperCase()}</Text>
      </View>

      {/* Routing, SWIFT, IBAN Grid */}
      <View style={styles.gridSection}>
        {routingNumber ? (
          <TouchableOpacity
            style={styles.gridItem}
            activeOpacity={0.7}
            onPress={() => handleCopy(routingNumber, 'Routing Number')}
          >
            <Text style={styles.fieldLabel}>ROUTING / ABA</Text>
            <View style={styles.rowInline}>
              <Text style={styles.gridValue}>{routingNumber}</Text>
              {copiedField === 'Routing Number' ? (
                <CheckIcon size={12} color="#10B981" />
              ) : (
                <CopyIcon size={12} color="#64748B" />
              )}
            </View>
          </TouchableOpacity>
        ) : null}

        {swiftBic ? (
          <TouchableOpacity
            style={styles.gridItem}
            activeOpacity={0.7}
            onPress={() => handleCopy(swiftBic, 'SWIFT / BIC')}
          >
            <Text style={styles.fieldLabel}>SWIFT / BIC</Text>
            <View style={styles.rowInline}>
              <Text style={styles.gridValue}>{swiftBic}</Text>
              {copiedField === 'SWIFT / BIC' ? (
                <CheckIcon size={12} color="#10B981" />
              ) : (
                <CopyIcon size={12} color="#64748B" />
              )}
            </View>
          </TouchableOpacity>
        ) : null}
      </View>

      {iban ? (
        <TouchableOpacity
          style={styles.ibanSection}
          activeOpacity={0.7}
          onPress={() => handleCopy(iban, 'IBAN')}
        >
          <Text style={styles.fieldLabel}>IBAN</Text>
          <View style={styles.rowInline}>
            <Text style={styles.ibanValue} numberOfLines={1}>{iban}</Text>
            {copiedField === 'IBAN' ? (
              <CheckIcon size={14} color="#10B981" />
            ) : (
              <CopyIcon size={14} color="#64748B" />
            )}
          </View>
        </TouchableOpacity>
      ) : null}

      {/* Reveal Toggle */}
      <TouchableOpacity
        style={styles.revealButton}
        onPress={() => setRevealed(!revealed)}
        activeOpacity={0.7}
      >
        {revealed ? (
          <VisibilityOffIcon size={14} color="#94A3B8" />
        ) : (
          <VisibilityIcon size={14} color="#94A3B8" />
        )}
        <Text style={styles.revealText}>
          {revealed ? 'Hide Sensitive' : 'Show Sensitive'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 18,
    marginVertical: 12,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  bankIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bankIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  bankTextWrap: {
    flex: 1,
  },
  bankName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 0.4,
  },
  accountTitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 1,
  },
  typeBadge: {
    backgroundColor: '#38BDF820',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#38BDF840',
  },
  typeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 0.8,
  },
  accountNumberSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B50',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#33415550',
    marginBottom: 12,
  },
  accountNumberText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F8FAFC',
    letterSpacing: 1.8,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  copyPill: {
    padding: 6,
  },
  holderSection: {
    marginBottom: 12,
  },
  accountHolderText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F1F5F9',
    marginTop: 2,
  },
  gridSection: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 12,
  },
  gridItem: {
    flex: 1,
    backgroundColor: '#1E293B40',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#33415540',
  },
  rowInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  gridValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
    fontVariant: ['tabular-nums'],
  },
  ibanSection: {
    backgroundColor: '#1E293B40',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#33415540',
    marginBottom: 8,
  },
  ibanValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
    letterSpacing: 0.8,
    flex: 1,
    marginRight: 6,
  },
  fieldLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  revealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  revealText: {
    fontSize: 11,
    color: '#94A3B8',
    marginLeft: 5,
    fontWeight: '500',
  },
});

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChipIcon, ContactlessIcon, VisibilityIcon, VisibilityOffIcon, CopyIcon, CheckIcon } from '../icons';
import { clipboardNative } from '../../services/nativeBridge';

interface VirtualBankCardProps {
  cardholderName?: string;
  cardNumber?: string;
  expiryMonth?: string;
  expiryYear?: string;
  cardBrand?: string;
  cardType?: string;
  cvv?: string;
  pin?: string;
  title?: string;
  showSensitiveInitially?: boolean;
}

export const VirtualBankCard: React.FC<VirtualBankCardProps> = ({
  cardholderName = 'CARDHOLDER NAME',
  cardNumber = '•••• •••• •••• ••••',
  expiryMonth = 'MM',
  expiryYear = 'YY',
  cardBrand = 'Credit Card',
  cardType = 'Credit',
  cvv,
  pin,
  title,
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

  // Determine brand colors & gradient styling
  const brandLower = (cardBrand || '').toLowerCase();
  let cardBg = '#1E293B';
  let cardBorder = '#334155';
  let accentColor = '#38BDF8';
  let brandBadge = (cardBrand || 'CARD').toUpperCase();

  if (brandLower.includes('visa')) {
    cardBg = '#0F172A';
    cardBorder = '#1E3A8A';
    accentColor = '#60A5FA';
    brandBadge = 'VISA';
  } else if (brandLower.includes('mastercard') || brandLower.includes('master')) {
    cardBg = '#18181B';
    cardBorder = '#7F1D1D';
    accentColor = '#F97316';
    brandBadge = 'MASTERCARD';
  } else if (brandLower.includes('amex') || brandLower.includes('american')) {
    cardBg = '#064E3B';
    cardBorder = '#047857';
    accentColor = '#34D399';
    brandBadge = 'AMEX';
  } else if (brandLower.includes('discover')) {
    cardBg = '#431407';
    cardBorder = '#9A3412';
    accentColor = '#FB923C';
    brandBadge = 'DISCOVER';
  }

  // Format card number with spaces every 4 digits
  const formatCardNumber = (num: string) => {
    if (!num) return '•••• •••• •••• ••••';
    const clean = num.replace(/\s+/g, '');
    return clean.replace(/(\d{4})/g, '$1 ').trim();
  };

  const displayCardNumber = revealed ? formatCardNumber(cardNumber) : (
    cardNumber.includes('••••') ? cardNumber : `•••• •••• •••• ${cardNumber.slice(-4) || '••••'}`
  );

  return (
    <View style={[styles.cardContainer, { backgroundColor: cardBg, borderColor: cardBorder }]}>
      {/* Top Row: Title, Type badge & Contactless */}
      <View style={styles.topRow}>
        <View style={styles.topLeft}>
          <Text style={styles.cardTitle} numberOfLines={1}>{title || 'VaultKey Card'}</Text>
          <View style={[styles.typeBadge, { backgroundColor: `${accentColor}25` }]}>
            <Text style={[styles.typeText, { color: accentColor }]}>{cardType.toUpperCase()}</Text>
          </View>
        </View>
        <View style={styles.topRight}>
          <ContactlessIcon size={22} color="#CBD5E1" />
        </View>
      </View>

      {/* Chip & Brand badge */}
      <View style={styles.chipRow}>
        <ChipIcon width={38} height={28} />
        <Text style={[styles.brandText, { color: accentColor }]}>{brandBadge}</Text>
      </View>

      {/* Card Number */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => handleCopy(cardNumber, 'Card Number')}
        style={styles.numberRow}
      >
        <Text style={styles.cardNumberText} numberOfLines={1}>
          {displayCardNumber}
        </Text>
        {copiedField === 'Card Number' ? (
          <CheckIcon size={16} color="#10B981" />
        ) : (
          <CopyIcon size={16} color="#64748B" />
        )}
      </TouchableOpacity>

      {/* Bottom Row: Cardholder, Expiry, CVV, PIN */}
      <View style={styles.bottomRow}>
        <View style={styles.holderColumn}>
          <Text style={styles.fieldLabel}>CARDHOLDER</Text>
          <Text style={styles.fieldValue} numberOfLines={1}>
            {cardholderName.toUpperCase()}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.expiryColumn}>
            <Text style={styles.fieldLabel}>EXPIRES</Text>
            <Text style={styles.fieldValue}>
              {expiryMonth || 'MM'}/{expiryYear ? expiryYear.slice(-2) : 'YY'}
            </Text>
          </View>

          {cvv ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleCopy(cvv, 'CVV')}
              style={styles.securityColumn}
            >
              <Text style={styles.fieldLabel}>CVV</Text>
              <Text style={styles.fieldValueSensitive}>
                {revealed ? cvv : '•••'}
              </Text>
            </TouchableOpacity>
          ) : null}

          {pin ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleCopy(pin, 'PIN')}
              style={styles.securityColumn}
            >
              <Text style={styles.fieldLabel}>PIN</Text>
              <Text style={styles.fieldValueSensitive}>
                {revealed ? pin : '••••'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Reveal sensitive toggle */}
      {(cvv || pin || cardNumber) && (
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
            {revealed ? 'Hide Details' : 'Show Details'}
          </Text>
        </TouchableOpacity>
      )}
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
    minHeight: 205,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  topRight: {
    opacity: 0.85,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
    marginRight: 8,
    letterSpacing: 0.5,
  },
  typeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  chipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  brandText: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.5,
    fontStyle: 'italic',
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 12,
    paddingVertical: 4,
  },
  cardNumberText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    letterSpacing: 2.2,
    fontVariant: ['tabular-nums'],
    flex: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 4,
  },
  holderColumn: {
    flex: 1,
    marginRight: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  expiryColumn: {
    alignItems: 'center',
    marginRight: 14,
  },
  securityColumn: {
    alignItems: 'center',
    marginLeft: 10,
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  fieldLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
    letterSpacing: 0.5,
  },
  fieldValueSensitive: {
    fontSize: 13,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 1.2,
  },
  revealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  revealText: {
    fontSize: 11,
    color: '#94A3B8',
    marginLeft: 5,
    fontWeight: '500',
  },
});

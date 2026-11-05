import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { radius, typography, spacing, useTheme } from '../../theme';
import { useTranslation } from '../../i18n';
import { StarIcon } from '../icons';

interface CategoryFilterChipsProps {
  selectedType: string;
  onSelectType: (type: string) => void;
  favoritesOnly: boolean;
  onToggleFavoritesOnly: () => void;
  counts?: Record<string, number>;
}

export const CategoryFilterChips: React.FC<CategoryFilterChipsProps> = ({
  selectedType,
  onSelectType,
  favoritesOnly,
  onToggleFavoritesOnly,
  counts = {},
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const categories = [
    { key: 'ALL', label: 'All' },
    { key: 'LOGIN', label: t('allLogins') },
    { key: 'SECURE_NOTE', label: t('allNotes') },
    { key: 'CREDENTIAL_CARD', label: t('allCards') },
    { key: 'BANK_ACCOUNT', label: t('allBankAccounts') },
    { key: 'AUTHENTICATOR_2FA', label: '2FA' },
    { key: 'SECURE_MEDIA', label: t('allMedia') },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {categories.map(cat => {
        const isSelected = selectedType === cat.key && !favoritesOnly;
        const count = counts[cat.key];
        return (
          <TouchableOpacity
            key={cat.key}
            style={[
              styles.chip,
              {
                backgroundColor: isSelected ? colors.primaryMuted : colors.card,
                borderColor: isSelected ? colors.primary : colors.border,
              },
            ]}
            onPress={() => {
              if (favoritesOnly) onToggleFavoritesOnly();
              onSelectType(cat.key);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Filter ${cat.label}`}
          >
            <Text
              style={[
                styles.chipText,
                { color: isSelected ? colors.primaryLight : colors.textSecondary },
                isSelected && styles.chipTextSelected,
              ]}
            >
              {cat.label}
            </Text>
            {count !== undefined && count !== null ? (
              <View
                style={[
                  styles.countBadge,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.cardSecondary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.countText,
                    {
                      color: isSelected ? colors.white : colors.textMuted,
                    },
                  ]}
                >
                  {count}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity
        style={[
          styles.chip,
          {
            backgroundColor: favoritesOnly ? colors.primaryMuted : colors.card,
            borderColor: favoritesOnly ? colors.primary : colors.border,
          },
        ]}
        onPress={onToggleFavoritesOnly}
        accessibilityRole="button"
        accessibilityLabel="Filter Favorites"
      >
        <StarIcon
          size={14}
          color={favoritesOnly ? colors.primaryLight : '#F59E0B'}
          filled={favoritesOnly}
        />
        <Text
          style={[
            styles.chipText,
            { color: favoritesOnly ? colors.primaryLight : colors.textSecondary },
            favoritesOnly && styles.chipTextSelected,
          ]}
        >
          {t('favorites')}
        </Text>
        {counts.FAVORITES !== undefined ? (
          <View
            style={[
              styles.countBadge,
              {
                backgroundColor: favoritesOnly ? colors.primary : colors.cardSecondary,
              },
            ]}
          >
            <Text
              style={[
                styles.countText,
                {
                  color: favoritesOnly ? colors.white : colors.textMuted,
                },
              ]}
            >
              {counts.FAVORITES}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 36,
    borderRadius: radius.full,
    borderWidth: 1,
    gap: 6,
  },
  chipText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
  },
  chipTextSelected: {
    fontWeight: typography.fontWeights.bold,
  },
  countBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  countText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
  },
});
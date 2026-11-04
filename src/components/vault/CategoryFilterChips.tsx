import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { radius, typography, spacing, useTheme } from '../../theme';
import { useTranslation } from '../../i18n';

interface CategoryFilterChipsProps {
  selectedType: string;
  onSelectType: (type: string) => void;
  favoritesOnly: boolean;
  onToggleFavoritesOnly: () => void;
}

export const CategoryFilterChips: React.FC<CategoryFilterChipsProps> = ({
  selectedType,
  onSelectType,
  favoritesOnly,
  onToggleFavoritesOnly,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const categories = [
    { key: 'ALL', label: 'All' },
    { key: 'LOGIN', label: t('allLogins') },
    { key: 'SECURE_NOTE', label: t('allNotes') },
    { key: 'CREDENTIAL_CARD', label: t('allCards') },
    { key: 'BANK_ACCOUNT', label: t('allBankAccounts') },
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
        <Text
          style={[
            styles.chipText,
            { color: favoritesOnly ? colors.primaryLight : colors.textSecondary },
            favoritesOnly && styles.chipTextSelected,
          ]}
        >
          {t('favorites')}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};


const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.base,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.primaryLight,
    fontWeight: typography.fontWeights.semibold,
  },
});
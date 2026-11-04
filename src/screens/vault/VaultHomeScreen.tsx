import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { colors } from '../../theme/colors';
import { radius, typography, spacing, useTheme } from '../../theme';
import { useVaultStore } from '../../stores/vaultStore';
import { VaultItemSummary } from '../../types';
import { VaultItemCard } from '../../components/vault/VaultItemCard';
import { CategoryFilterChips } from '../../components/vault/CategoryFilterChips';
import { EmptyState } from '../../components/common/EmptyState';
import { Card } from '../../components/common/Card';
import {
  LockIcon,
  KeyIcon,
  SettingsIcon,
  SearchIcon,
  ShieldCheckIcon,
  AlertTriangleIcon,
  AddIcon,
  BackupIcon,
} from '../../components/icons';
import { useTranslation } from '../../i18n';

interface VaultHomeScreenProps {
  onSelectItem: (item: VaultItemSummary) => void;
  onAddNew: () => void;
  onOpenSettings: () => void;
  onOpenSecurity: () => void;
  onOpenGenerator: () => void;
  onOpenBackup: () => void;
}

export const VaultHomeScreen: React.FC<VaultHomeScreenProps> = ({
  onSelectItem,
  onAddNew,
  onOpenSettings,
  onOpenSecurity,
  onOpenGenerator,
  onOpenBackup,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const {
    summaries,
    securityAnalysis,
    activeFilterType,
    favoritesOnly,
    searchQuery,
    setFilterType,
    setFavoritesOnly,
    setSearchQuery,
    toggleFavorite,
    refreshVaultData,
    lock,
  } = useVaultStore();

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    refreshVaultData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshVaultData();
    setRefreshing(false);
  };

  const score = securityAnalysis?.score ?? 100;
  const hasSecurityIssues = (securityAnalysis?.weakCount || 0) + (securityAnalysis?.reusedCount || 0) > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <View style={styles.headerLeft}>
          <Image
            source={require('../../assets/vaultkey_brand_icon.jpg')}
            style={styles.headerLogo}
            resizeMode="cover"
          />
          <View style={styles.headerTitleWrap}>
            <Text style={[styles.appName, { color: colors.text }]}>{t('appName')}</Text>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>{t('statusUnlocked')}</Text>
            </View>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={onOpenGenerator}
            accessibilityRole="button"
            accessibilityLabel="Generator"
          >
            <KeyIcon size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={onOpenBackup}
            accessibilityRole="button"
            accessibilityLabel="Backup"
          >
            <BackupIcon size={22} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={onOpenSettings}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <SettingsIcon size={22} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconBtn, styles.lockBtn]}
            onPress={lock}
            accessibilityRole="button"
            accessibilityLabel={t('lock')}
          >
            <LockIcon size={20} color={colors.dangerLight} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Security Health Mini-Card */}
      <Card style={styles.securityCard} onPress={onOpenSecurity}>
        <View style={styles.securityRow}>
          <View style={styles.securityIconWrap}>
            {hasSecurityIssues ? (
              <AlertTriangleIcon size={24} color={colors.warning} />
            ) : (
              <ShieldCheckIcon size={24} color={colors.primary} />
            )}
          </View>

          <View style={styles.securityTextWrap}>
            <Text style={[styles.securityTitle, { color: colors.text }]}>{t('securityScore')}: {score}/100</Text>
            <Text style={[styles.securitySubtitle, { color: colors.textSecondary }]}>
              {hasSecurityIssues
                ? `${securityAnalysis?.weakCount || 0} weak, ${securityAnalysis?.reusedCount || 0} reused passwords`
                : t('noSecurityIssues')}
            </Text>
          </View>

          <View style={[styles.scoreBadge, { backgroundColor: hasSecurityIssues ? colors.warningMuted : colors.primaryMuted }]}>
            <Text style={[styles.scoreNumber, { color: hasSecurityIssues ? colors.warningLight : colors.primaryLight }]}>
              {score}%
            </Text>
          </View>
        </View>
      </Card>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBox, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
          <SearchIcon size={20} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={t('searchPlaceholder')}
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Filter Chips */}
      <CategoryFilterChips
        selectedType={activeFilterType}
        onSelectType={setFilterType}
        favoritesOnly={favoritesOnly}
        onToggleFavoritesOnly={() => setFavoritesOnly(!favoritesOnly)}
      />

      {/* Item List */}
      <FlatList
        data={summaries}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        renderItem={({ item }) => (
          <VaultItemCard
            item={item}
            onPress={() => onSelectItem(item)}
            onToggleFavorite={() => toggleFavorite(item.id)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            title={searchQuery ? t('searchPlaceholder') : 'No vault items yet.'}
            description={searchQuery ? 'Try another search query' : 'Store your first password or note securely.'}
            actionTitle={searchQuery ? undefined : t('addNewItem')}
            onAction={searchQuery ? undefined : onAddNew}
          />
        }
      />

      {/* Floating Action Add Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
        onPress={onAddNew}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={t('addNewItem')}
      >
        <AddIcon size={26} color={colors.white} />
      </TouchableOpacity>
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginRight: spacing.sm,
  },
  headerTitleWrap: {
    justifyContent: 'center',
  },
  appName: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginRight: 6,
  },
  statusText: {
    fontSize: typography.fontSizes.xs,
    color: colors.primaryLight,
    fontWeight: typography.fontWeights.medium,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockBtn: {
    borderColor: colors.dangerMuted,
    backgroundColor: colors.dangerMuted,
  },
  securityCard: {
    marginHorizontal: spacing.base,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  securityIconWrap: {
    marginRight: spacing.md,
  },
  securityTextWrap: {
    flex: 1,
  },
  securityTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  securitySubtitle: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  scoreBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  scoreNumber: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
  },
  searchContainer: {
    paddingHorizontal: spacing.base,
    marginBottom: spacing.xs,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    color: colors.text,
    fontSize: typography.fontSizes.base,
  },
  listContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: 80,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
});
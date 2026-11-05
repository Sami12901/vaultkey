import React, { useState, useEffect, useMemo } from 'react';
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
import {
  LockIcon,
  SearchIcon,
  ShieldCheckIcon,
  AlertTriangleIcon,
  AddIcon,
} from '../../components/icons';
import { useTranslation } from '../../i18n';

interface VaultHomeScreenProps {
  onSelectItem: (item: VaultItemSummary) => void;
  onAddNew: () => void;
  onOpenSettings?: () => void;
  onOpenSecurity: () => void;
  onOpenGenerator?: () => void;
  onOpenBackup?: () => void;
}

export const VaultHomeScreen: React.FC<VaultHomeScreenProps> = ({
  onSelectItem,
  onAddNew,
  onOpenSecurity,
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
  const hasSecurityIssues =
    (securityAnalysis?.weakCount || 0) +
      (securityAnalysis?.reusedCount || 0) +
      (securityAnalysis?.insecureHttpCount || 0) +
      (securityAnalysis?.missing2faCount || 0) >
    0;

  const counts = useMemo(() => {
    const res: Record<string, number> = {
      ALL: summaries.length,
      LOGIN: 0,
      SECURE_NOTE: 0,
      CREDENTIAL_CARD: 0,
      BANK_ACCOUNT: 0,
      AUTHENTICATOR_2FA: 0,
      SECURE_MEDIA: 0,
    };
    for (const item of summaries) {
      if (res[item.type] !== undefined) {
        res[item.type]++;
      } else {
        res[item.type] = 1;
      }
    }
    return res;
  }, [summaries]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header - Decluttered: Only App branding, Status indicator, and Lock button */}
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
            style={[styles.iconBtn, styles.lockBtn]}
            onPress={lock}
            accessibilityRole="button"
            accessibilityLabel={t('lock')}
          >
            <LockIcon size={20} color={colors.dangerLight} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Sleek Glassmorphic Security Banner */}
      <TouchableOpacity
        style={[
          styles.glassmorphicBanner,
          {
            backgroundColor: colors.card,
            borderColor: hasSecurityIssues ? 'rgba(245, 158, 11, 0.35)' : 'rgba(16, 185, 129, 0.3)',
          },
        ]}
        onPress={onOpenSecurity}
        activeOpacity={0.85}
      >
        <View style={styles.bannerTopRow}>
          <View style={styles.bannerTitleRow}>
            <View
              style={[
                styles.bannerShieldWrap,
                {
                  backgroundColor: hasSecurityIssues
                    ? 'rgba(245, 158, 11, 0.15)'
                    : 'rgba(16, 185, 129, 0.15)',
                },
              ]}
            >
              {hasSecurityIssues ? (
                <AlertTriangleIcon size={18} color={colors.warning} />
              ) : (
                <ShieldCheckIcon size={18} color={colors.primary} />
              )}
            </View>
            <View>
              <Text style={[styles.bannerTitle, { color: colors.text }]}>{t('securityScore')}</Text>
              <Text style={[styles.bannerScoreSubtitle, { color: hasSecurityIssues ? colors.warningLight : colors.primaryLight }]}>
                {score}/100 • {score >= 80 ? 'Strong' : score >= 50 ? 'Moderate' : 'At Risk'}
              </Text>
            </View>
          </View>

          <View style={styles.bannerAuditAction}>
            <Text style={[styles.bannerAuditText, { color: colors.primaryLight }]}>Audit ↗</Text>
          </View>
        </View>

        {/* Smooth Gradient Progress Bar */}
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${Math.min(100, Math.max(0, score))}%`,
                backgroundColor: score >= 80 ? colors.primary : score >= 50 ? colors.warning : colors.danger,
              },
            ]}
          />
        </View>

        {/* Compact Threat Breakdown Chips */}
        <View style={styles.threatChipsRow}>
          {hasSecurityIssues ? (
            <>
              {Boolean(securityAnalysis?.weakCount) && (
                <View style={[styles.threatChip, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
                  <Text style={[styles.threatChipText, { color: colors.dangerLight }]}>
                    ⚠️ {securityAnalysis?.weakCount} weak
                  </Text>
                </View>
              )}
              {Boolean(securityAnalysis?.reusedCount) && (
                <View style={[styles.threatChip, { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.3)' }]}>
                  <Text style={[styles.threatChipText, { color: colors.warningLight }]}>
                    🔄 {securityAnalysis?.reusedCount} reused
                  </Text>
                </View>
              )}
              {Boolean(securityAnalysis?.oldCount) && (
                <View style={[styles.threatChip, { backgroundColor: 'rgba(148, 163, 184, 0.15)', borderColor: 'rgba(148, 163, 184, 0.3)' }]}>
                  <Text style={[styles.threatChipText, { color: colors.textSecondary }]}>
                    ⏳ {securityAnalysis?.oldCount} old
                  </Text>
                </View>
              )}
              {Boolean(securityAnalysis?.insecureHttpCount) && (
                <View style={[styles.threatChip, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
                  <Text style={[styles.threatChipText, { color: colors.dangerLight }]}>
                    🌐 {securityAnalysis?.insecureHttpCount} http
                  </Text>
                </View>
              )}
              {Boolean(securityAnalysis?.missing2faCount) && (
                <View style={[styles.threatChip, { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.3)' }]}>
                  <Text style={[styles.threatChipText, { color: colors.warningLight }]}>
                    🛡️ {securityAnalysis?.missing2faCount} no 2fa
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={[styles.threatChip, { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.25)' }]}>
              <Text style={[styles.threatChipText, { color: colors.primaryLight }]}>
                ✓ Zero vulnerabilities found
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

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
        counts={counts}
      />

      {/* Item List */}
      <FlatList
        data={summaries}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: 110 }]}
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
  glassmorphicBanner: {
    marginHorizontal: spacing.base,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  bannerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bannerShieldWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
  },
  bannerScoreSubtitle: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
    marginTop: 1,
  },
  bannerAuditAction: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  bannerAuditText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
  },
  threatChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  threatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  threatChipText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
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
    paddingBottom: 110,
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

export const HomeScreen = VaultHomeScreen;
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { colors } from '../../theme/colors';
import { radius, typography, spacing, useTheme } from '../../theme';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { VaultItemCard } from '../../components/vault/VaultItemCard';
import {
  ShieldCheckIcon,
  RefreshIcon,
} from '../../components/icons';
import { useVaultStore } from '../../stores/vaultStore';
import { useTranslation } from '../../i18n';
import { VaultItemSummary } from '../../types';
import { auditVaultCredentials } from '../../utils/securityAudit';

interface SecurityDashboardScreenProps {
  onBack: () => void;
  onSelectItem: (item: VaultItemSummary) => void;
}

export const SecurityDashboardScreen: React.FC<SecurityDashboardScreenProps> = ({
  onBack,
  onSelectItem,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { securityAnalysis, summaries, refreshVaultData } = useVaultStore();


  const [activeTab, setActiveTab] = useState<'ALL' | 'WEAK' | 'REUSED' | 'OLD' | 'HTTP' | '2FA'>('ALL');

  useEffect(() => {
    refreshVaultData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clientAudit = auditVaultCredentials(
    summaries.map(s => ({ id: s.id, type: s.type, title: s.title, website: s.website || undefined })),
    summaries.filter(s => s.type === 'AUTHENTICATOR_2FA').map(s => ({ id: s.id, title: s.title, issuer: s.title }))
  );

  const score = securityAnalysis?.score ?? clientAudit.score;
  const weakCount = securityAnalysis?.weakCount ?? clientAudit.weakCount;
  const reusedCount = securityAnalysis?.reusedCount ?? clientAudit.reusedCount;
  const oldCount = securityAnalysis?.oldCount ?? clientAudit.oldCount;
  const insecureHttpCount = securityAnalysis?.insecureHttpCount ?? clientAudit.insecureHttpCount ?? 0;
  const missing2faCount = securityAnalysis?.missing2faCount ?? clientAudit.missing2faCount ?? 0;

  const weakIds = new Set(securityAnalysis?.weakItemIds ?? clientAudit.weakItemIds);
  const reusedIds = new Set(securityAnalysis?.reusedItemIds ?? clientAudit.reusedItemIds);
  const oldIds = new Set(securityAnalysis?.oldItemIds ?? clientAudit.oldItemIds);
  const httpIds = new Set(securityAnalysis?.insecureHttpItemIds ?? clientAudit.insecureHttpItemIds ?? []);
  const twoFaIds = new Set(securityAnalysis?.missing2faItemIds ?? clientAudit.missing2faItemIds ?? []);

  const getFilteredItems = (): VaultItemSummary[] => {
    switch (activeTab) {
      case 'WEAK':
        return summaries.filter(s => weakIds.has(s.id));
      case 'REUSED':
        return summaries.filter(s => reusedIds.has(s.id));
      case 'OLD':
        return summaries.filter(s => oldIds.has(s.id));
      case 'HTTP':
        return summaries.filter(s => httpIds.has(s.id));
      case '2FA':
        return summaries.filter(s => twoFaIds.has(s.id));
      case 'ALL':
      default:
        return summaries.filter(
          s => weakIds.has(s.id) || reusedIds.has(s.id) || oldIds.has(s.id) || httpIds.has(s.id) || twoFaIds.has(s.id)
        );
    }
  };

  const filteredItems = getFilteredItems();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title={t('securityDashboard')}
        onBack={onBack}
        rightAction={
          <TouchableOpacity onPress={refreshVaultData} style={styles.refreshBtn}>
            <RefreshIcon size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        }
      />

      <ScrollView style={[styles.content, { backgroundColor: colors.background }]} contentContainerStyle={styles.scrollContent}>
        {/* Large Score Card */}
        <Card style={styles.scoreCard}>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreNumber}>{score}</Text>
            <Text style={styles.scoreScale}>/100</Text>
          </View>
          <Text style={[styles.scoreLabel, { color: colors.text }]}>{t('securityScore')}</Text>
          <Text style={[styles.scoreDesc, { color: colors.textSecondary }]}>
            {score >= 80
              ? 'Excellent vault security health'
              : score >= 50
              ? 'Security improvements recommended'
              : 'Critical security risks detected'}
          </Text>
        </Card>

        {/* Issue Cards Grid */}
        <View style={styles.metricsGrid}>
          <TouchableOpacity
            style={[styles.metricCard, activeTab === 'WEAK' && styles.metricCardActive]}
            onPress={() => setActiveTab(activeTab === 'WEAK' ? 'ALL' : 'WEAK')}
          >
            <Text style={[styles.metricCount, weakCount > 0 && styles.dangerText]}>
              {weakCount}
            </Text>
            <Text style={styles.metricTitle}>{t('weakPasswords')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.metricCard, activeTab === 'REUSED' && styles.metricCardActive]}
            onPress={() => setActiveTab(activeTab === 'REUSED' ? 'ALL' : 'REUSED')}
          >
            <Text style={[styles.metricCount, reusedCount > 0 && styles.warningText]}>
              {reusedCount}
            </Text>
            <Text style={styles.metricTitle}>{t('reusedPasswords')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.metricCard, activeTab === 'OLD' && styles.metricCardActive]}
            onPress={() => setActiveTab(activeTab === 'OLD' ? 'ALL' : 'OLD')}
          >
            <Text style={[styles.metricCount, oldCount > 0 && styles.warningText]}>
              {oldCount}
            </Text>
            <Text style={styles.metricTitle}>{t('oldPasswords')}</Text>
          </TouchableOpacity>
        </View>

        {/* Second Row: Insecure HTTP & Missing 2FA */}
        <View style={styles.metricsGrid}>
          <TouchableOpacity
            style={[styles.metricCard, activeTab === 'HTTP' && styles.metricCardActive]}
            onPress={() => setActiveTab(activeTab === 'HTTP' ? 'ALL' : 'HTTP')}
          >
            <Text style={[styles.metricCount, insecureHttpCount > 0 && styles.dangerText]}>
              {insecureHttpCount}
            </Text>
            <Text style={styles.metricTitle}>Insecure HTTP</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.metricCard, activeTab === '2FA' && styles.metricCardActive]}
            onPress={() => setActiveTab(activeTab === '2FA' ? 'ALL' : '2FA')}
          >
            <Text style={[styles.metricCount, missing2faCount > 0 && styles.warningText]}>
              {missing2faCount}
            </Text>
            <Text style={styles.metricTitle}>Missing 2FA</Text>
          </TouchableOpacity>
        </View>

        {/* Actionable items list */}
        <View style={styles.listHeaderRow}>
          <Text style={styles.listHeaderTitle}>
            {activeTab === 'ALL'
              ? 'Credentials Requiring Attention'
              : activeTab === 'WEAK'
              ? t('weakPasswords')
              : activeTab === 'REUSED'
              ? t('reusedPasswords')
              : activeTab === 'OLD'
              ? t('oldPasswords')
              : activeTab === 'HTTP'
              ? 'Insecure HTTP Credentials'
              : 'High-Risk Accounts Lacking 2FA'}
          </Text>
          <Badge label={`${filteredItems.length} items`} variant="muted" />
        </View>

        {filteredItems.length === 0 ? (
          <Card style={styles.cleanCard}>
            <ShieldCheckIcon size={36} color={colors.primary} />
            <Text style={styles.cleanTitle}>{t('noSecurityIssues')}</Text>
          </Card>
        ) : (
          filteredItems.map(item => (
            <VaultItemCard
              key={item.id}
              item={item}
              onPress={() => onSelectItem(item)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  refreshBtn: {
    padding: spacing.xs,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: 48,
  },
  scoreCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginBottom: spacing.base,
  },
  scoreCircle: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.xs,
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  scoreScale: {
    fontSize: typography.fontSizes.lg,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  scoreLabel: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  scoreDesc: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
  },
  metricCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  metricCount: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginBottom: 4,
  },
  dangerText: {
    color: colors.danger,
  },
  warningText: {
    color: colors.warning,
  },
  metricTitle: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  listHeaderTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  cleanCard: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  cleanTitle: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
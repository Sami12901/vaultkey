import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography, spacing, useTheme } from '../../theme';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { ShieldCheckIcon, AlertTriangleIcon } from '../../components/icons';
import { vaultNative } from '../../services/nativeBridge';
import { AuditEvent } from '../../types';
import { useTranslation } from '../../i18n';

interface AuditLogScreenProps {
  onBack: () => void;
}

export const AuditLogScreen: React.FC<AuditLogScreenProps> = ({ onBack }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const list = await vaultNative.getAuditEvents(100);
      setEvents(list);
    } catch {
      // Ignored
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  };

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title={t('auditLog')} onBack={onBack} />


      <FlatList
        data={events}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.row}>
              <View style={styles.iconWrap}>
                {item.isSuccess ? (
                  <ShieldCheckIcon size={20} color={colors.primary} />
                ) : (
                  <AlertTriangleIcon size={20} color={colors.danger} />
                )}
              </View>
              <View style={styles.contentWrap}>
                <View style={styles.topRow}>
                  <Text style={styles.eventType}>{item.eventType}</Text>
                  <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
                </View>
                <Text style={styles.details}>{item.details}</Text>
              </View>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No audit events recorded yet.</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.base,
  },
  card: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    marginRight: spacing.md,
  },
  contentWrap: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  eventType: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  timestamp: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
  },
  details: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
  },
  emptyWrap: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.fontSizes.sm,
    color: colors.textMuted,
  },
});
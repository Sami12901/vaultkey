import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { VaultItemSummary } from '../../types';
import { typography, spacing, radius, useTheme } from '../../theme';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { WebsiteIcon } from '../common/WebsiteIcon';
import {
  StarIcon,
  ChevronRightIcon,
} from '../icons';

interface VaultItemCardProps {
  item: VaultItemSummary;
  onPress: () => void;
  onToggleFavorite?: () => void;
}

export const VaultItemCard = React.memo<VaultItemCardProps>(
  ({ item, onPress, onToggleFavorite }) => {
    const { colors } = useTheme();

    return (
      <Card style={styles.card} onPress={onPress}>
        <View style={styles.row}>
          <WebsiteIcon
            url={item.website}
            title={item.title}
            type={item.type}
            size={42}
            style={styles.iconMargin}
          />

          <View style={styles.content}>
            <Text
              style={[styles.title, { color: colors.text }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.title}
            </Text>
            {item.subtitle ? (
              <Text
                style={[styles.subtitle, { color: colors.textMuted }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.subtitle}
              </Text>
            ) : null}

            <View style={styles.metaRow}>
              {item.folderName ? (
                <Badge label={item.folderName} variant="muted" style={styles.badge} />
              ) : null}
              {item.tags?.slice(0, 2).map(tag => (
                <Badge key={tag} label={tag} variant="accent" style={styles.badge} />
              ))}
            </View>
          </View>

          <View style={styles.actions}>
            {onToggleFavorite ? (
              <TouchableOpacity
                onPress={onToggleFavorite}
                style={styles.favBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel={item.isFavorite ? 'Remove favorite' : 'Mark favorite'}
              >
                <StarIcon size={20} color={item.isFavorite ? '#F59E0B' : colors.textMuted} filled={item.isFavorite} />
              </TouchableOpacity>
            ) : null}
            <ChevronRightIcon size={18} color={colors.textMuted} />
          </View>
        </View>
      </Card>
    );
  },
  (prev, next) =>
    prev.item.id === next.item.id &&
    prev.item.title === next.item.title &&
    prev.item.subtitle === next.item.subtitle &&
    prev.item.website === next.item.website &&
    prev.item.type === next.item.type &&
    prev.item.isFavorite === next.item.isFavorite &&
    prev.item.folderName === next.item.folderName &&
    prev.onPress === next.onPress &&
    prev.onToggleFavorite === next.onToggleFavorite
);

const styles = StyleSheet.create({
  card: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconMargin: {
    marginRight: spacing.md,
    flexShrink: 0,
  },
  content: {
    flex: 1,
    minHeight: 44,
    marginRight: spacing.sm,
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.semibold,
    flexShrink: 1,
  },
  subtitle: {
    fontSize: typography.fontSizes.sm,
    marginTop: 2,
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  badge: {
    marginRight: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 0,
  },
  favBtn: {
    padding: spacing.xs,
  },
});
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

export const VaultItemCard: React.FC<VaultItemCardProps> = ({
  item,
  onPress,
  onToggleFavorite,
}) => {
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
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
};

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
    marginRight: spacing.sm,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  title: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.semibold,
    lineHeight: 22,
  },
  subtitle: {
    fontSize: typography.fontSizes.sm,
    marginTop: 2,
    lineHeight: 18,
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
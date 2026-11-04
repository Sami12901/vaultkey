import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { VaultItemSummary } from '../../types';
import { colors } from '../../theme/colors';
import { typography, spacing, useTheme } from '../../theme';
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
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          {item.subtitle ? (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.subtitle}
            </Text>
          ) : null}

          <View style={styles.metaRow}>
            {item.folderName ? (
              <Badge label={item.folderName} variant="muted" style={styles.badge} />
            ) : null}
            {item.tags.slice(0, 2).map(tag => (
              <Badge key={tag} label={tag} variant="accent" style={styles.badge} />
            ))}
          </View>
        </View>

        <View style={styles.actions}>
          {onToggleFavorite ? (
            <TouchableOpacity
              onPress={onToggleFavorite}
              style={styles.favBtn}
              accessibilityRole="button"
              accessibilityLabel={item.isFavorite ? 'Remove favorite' : 'Mark favorite'}
            >
              <StarIcon size={20} filled={item.isFavorite} />
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
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconMargin: {
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
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
    marginLeft: spacing.sm,
  },
  favBtn: {
    padding: spacing.xs,
  },
});
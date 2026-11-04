import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { radius, typography, spacing } from '../../theme';

interface BadgeProps {
  label: string;
  variant?: 'primary' | 'accent' | 'warning' | 'danger' | 'muted';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'muted',
  style,
}) => {
  const getBadgeStyle = () => {
    switch (variant) {
      case 'primary':
        return { bg: colors.primaryMuted, text: colors.primaryLight, border: colors.primary };
      case 'accent':
        return { bg: colors.accentMuted, text: colors.accentLight, border: colors.accent };
      case 'warning':
        return { bg: colors.warningMuted, text: colors.warningLight, border: colors.warning };
      case 'danger':
        return { bg: colors.dangerMuted, text: colors.dangerLight, border: colors.danger };
      case 'muted':
      default:
        return { bg: colors.cardSecondary, text: colors.textSecondary, border: colors.border };
    }
  };

  const styleConfig = getBadgeStyle();

  return (
    <View style={[styles.badge, { backgroundColor: styleConfig.bg, borderColor: styleConfig.border }, style]}>
      <Text style={[styles.text, { color: styleConfig.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
  },
});
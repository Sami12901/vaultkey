import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, TouchableOpacity } from 'react-native';
import { colors } from '../../theme/colors';
import { radius, spacing, useTheme } from '../../theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  variant?: 'elevated' | 'flat' | 'outline';
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  variant = 'flat',
}) => {
  const { colors } = useTheme();

  const getVariantStyle = () => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: colors.cardSecondary,
          borderWidth: 1,
          borderColor: colors.borderLight,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: colors.border,
        };
      case 'flat':
      default:
        return {
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
        };
    }
  };


  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.baseCard, getVariantStyle(), style]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[styles.baseCard, getVariantStyle(), style]}>{children}</View>;
};

const styles = StyleSheet.create({
  baseCard: {
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  cardFlat: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardElevated: {
    backgroundColor: colors.cardSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cardOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
});
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { radius, typography, spacing } from '../../theme';

interface StrengthMeterProps {
  score: number; // 0 to 4
  entropy?: number;
  feedback?: string[];
}

export const StrengthMeter: React.FC<StrengthMeterProps> = ({
  score,
  entropy,
  feedback = [],
}) => {
  const getScoreColor = () => {
    switch (score) {
      case 0:
        return colors.danger;
      case 1:
        return colors.dangerLight;
      case 2:
        return colors.warning;
      case 3:
        return colors.primaryLight;
      case 4:
      default:
        return colors.primary;
    }
  };

  const getScoreLabel = () => {
    switch (score) {
      case 0:
        return 'Very Weak';
      case 1:
        return 'Weak';
      case 2:
        return 'Fair';
      case 3:
        return 'Good';
      case 4:
      default:
        return 'Strong';
    }
  };

  const activeColor = getScoreColor();

  return (
    <View style={styles.container}>
      <View style={styles.barRow}>
        {[0, 1, 2, 3].map(step => (
          <View
            key={step}
            style={[
              styles.segment,
              step <= score - 1 ? { backgroundColor: activeColor } : styles.segmentInactive,
            ]}
          />
        ))}
      </View>

      <View style={styles.infoRow}>
        <Text style={[styles.scoreText, { color: activeColor }]}>
          {getScoreLabel()}
        </Text>
        {entropy !== undefined && entropy > 0 ? (
          <Text style={styles.entropyText}>{entropy} bits of entropy</Text>
        ) : null}
      </View>

      {feedback.length > 0 ? (
        <View style={styles.feedbackContainer}>
          {feedback.map((msg, i) => (
            <Text key={i} style={styles.feedbackText}>
              • {msg}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
  },
  barRow: {
    flexDirection: 'row',
    gap: 6,
    height: 6,
    marginBottom: spacing.xs,
  },
  segment: {
    flex: 1,
    borderRadius: radius.full,
  },
  segmentInactive: {
    backgroundColor: colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
  },
  entropyText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
  },
  feedbackContainer: {
    marginTop: spacing.xs,
  },
  feedbackText: {
    fontSize: typography.fontSizes.xs,
    color: colors.warningLight,
    marginTop: 2,
  },
});
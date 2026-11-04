import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface TotpCountdownRingProps {
  remainingSeconds: number;
  period?: number;
  size?: number;
  strokeWidth?: number;
  showSecondsText?: boolean;
}

export const TotpCountdownRing: React.FC<TotpCountdownRingProps> = ({
  remainingSeconds,
  period = 30,
  size = 36,
  strokeWidth = 3,
  showSecondsText = true,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Clamped ratio
  const ratio = Math.max(0, Math.min(1, remainingSeconds / period));
  const strokeDashoffset = circumference * (1 - ratio);

  // Dynamic warning color
  const color =
    remainingSeconds <= 3
      ? '#EF4444' // Red warning
      : remainingSeconds <= 7
      ? '#F59E0B' // Amber warning
      : '#10B981'; // Emerald primary

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Animated Progress Ring */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {showSecondsText && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={styles.textWrapper}>
            <Text style={[styles.secondsText, { color }]}>
              {remainingSeconds}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondsText: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'Courier',
    textAlign: 'center',
  },
});

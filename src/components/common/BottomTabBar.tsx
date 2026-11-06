import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, typography, spacing, radius } from '../../theme';
import {
  FolderIcon,
  QrCodeIcon,
  KeyIcon,
  ShieldCheckIcon,
  SettingsIcon,
} from '../icons';

export type BottomTabScreen =
  | 'HOME'
  | 'AUTHENTICATOR'
  | 'GENERATOR'
  | 'SECURITY'
  | 'SETTINGS';

interface BottomTabBarProps {
  currentScreen: BottomTabScreen;
  onSelectTab: (screen: BottomTabScreen) => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  currentScreen,
  onSelectTab,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);

  const tabs: Array<{
    key: BottomTabScreen;
    label: string;
    icon: (active: boolean) => React.ReactNode;
  }> = [
    {
      key: 'HOME',
      label: 'Vault',
      icon: (active: boolean) => (
        <FolderIcon
          size={22}
          color={active ? colors.primaryLight : colors.textMuted}
        />
      ),
    },
    {
      key: 'AUTHENTICATOR',
      label: '2FA Codes',
      icon: (active: boolean) => (
        <QrCodeIcon
          size={22}
          color={active ? colors.primaryLight : colors.textMuted}
        />
      ),
    },
    {
      key: 'GENERATOR',
      label: 'Generator',
      icon: (active: boolean) => (
        <KeyIcon
          size={22}
          color={active ? colors.primaryLight : colors.textMuted}
        />
      ),
    },
    {
      key: 'SECURITY',
      label: 'Security',
      icon: (active: boolean) => (
        <ShieldCheckIcon
          size={22}
          color={active ? colors.primaryLight : colors.textMuted}
        />
      ),
    },
    {
      key: 'SETTINGS',
      label: 'Settings',
      icon: (active: boolean) => (
        <SettingsIcon
          size={22}
          color={active ? colors.primaryLight : colors.textMuted}
        />
      ),
    },
  ];

  return (
    <View
      style={[
        styles.bottomBar,
        {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          paddingBottom: bottomPadding,
          height: 56 + bottomPadding,
        },
      ]}
    >
      {tabs.map((tab) => {
        const isActive = currentScreen === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabItem, isActive && styles.tabItemActive]}
            onPress={() => onSelectTab(tab.key)}
            accessibilityRole="button"
            accessibilityLabel={tab.label}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.iconWrap,
                isActive && {
                  backgroundColor: colors.primaryMuted,
                  borderRadius: radius.md,
                },
              ]}
            >
              {tab.icon(isActive)}
            </View>
            <Text
              style={[
                styles.tabLabel,
                { color: isActive ? colors.primaryLight : colors.textMuted },
                isActive && styles.tabLabelActive,
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  bottomBar: {
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.sm,
    paddingTop: 6,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 2,
  },
  tabItemActive: {},
  iconWrap: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: typography.fontWeights.medium,
  },
  tabLabelActive: {
    fontWeight: typography.fontWeights.bold,
  },
});

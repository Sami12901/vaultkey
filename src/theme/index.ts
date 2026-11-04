export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

export const typography = {
  fontSizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    xxl: 30,
    hero: 36,
  },
  fontWeights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeights: {
    xs: 16,
    sm: 18,
    base: 22,
    md: 24,
    lg: 28,
    xl: 32,
    xxl: 38,
    hero: 44,
  },
} as const;

export * from './colors';

import { useVaultStore } from '../stores/vaultStore';
import { getThemeColors, setTheme, currentTheme, ThemeColors } from './colors';
import { AppTheme } from '../types';

export function useTheme(): { colors: ThemeColors; theme: AppTheme; isDark: boolean } {
  const { settings } = useVaultStore();
  const theme: AppTheme = (settings?.theme as AppTheme) || currentTheme || 'dark';

  if (currentTheme !== theme) {
    setTheme(theme);
  }

  const themeColors = getThemeColors(theme);
  const isDark = theme !== 'light';

  return { theme, colors: themeColors, isDark };
}
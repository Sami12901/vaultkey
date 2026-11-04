import { AppTheme } from '../types';

export interface ThemeColors {
  background: string;
  backgroundElevated: string;
  card: string;
  cardSecondary: string;
  surface: string;
  surfaceVariant: string;
  border: string;
  borderLight: string;

  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryMuted: string;

  accent: string;
  accentLight: string;
  accentDark: string;
  accentMuted: string;

  warning: string;
  warningLight: string;
  warningMuted: string;

  danger: string;
  dangerLight: string;
  dangerMuted: string;

  text: string;
  textSecondary: string;
  textMuted: string;
  textDisabled: string;

  white: string;
  black: string;
  transparent: string;
}

export const themes: Record<AppTheme, ThemeColors> = {
  // 1. Obsidian Emerald (Flagship Cyber Dark)
  dark: {
    background: '#0B0F17',
    backgroundElevated: '#101725',
    card: '#131B2A',
    cardSecondary: '#1A2436',
    surface: '#131B2A',
    surfaceVariant: '#1A2436',
    border: '#223147',
    borderLight: '#2D405D',

    primary: '#10B981',
    primaryLight: '#34D399',
    primaryDark: '#059669',
    primaryMuted: 'rgba(16, 185, 129, 0.15)',

    accent: '#3B82F6',
    accentLight: '#60A5FA',
    accentDark: '#2563EB',
    accentMuted: 'rgba(59, 130, 246, 0.15)',

    warning: '#F59E0B',
    warningLight: '#FBBF24',
    warningMuted: 'rgba(245, 158, 11, 0.15)',

    danger: '#EF4444',
    dangerLight: '#F87171',
    dangerMuted: 'rgba(239, 68, 68, 0.15)',

    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    textDisabled: '#475569',

    white: '#FFFFFF',
    black: '#000000',
    transparent: 'transparent',
  },

  // 2. Midnight OLED (Pitch Black & Cyber Cyan)
  oled: {
    background: '#000000',
    backgroundElevated: '#08080A',
    card: '#0D0E12',
    cardSecondary: '#15171E',
    surface: '#0D0E12',
    surfaceVariant: '#15171E',
    border: '#232631',
    borderLight: '#353949',

    primary: '#00F0FF',
    primaryLight: '#38BDF8',
    primaryDark: '#0284C7',
    primaryMuted: 'rgba(0, 240, 255, 0.15)',

    accent: '#10B981',
    accentLight: '#34D399',
    accentDark: '#059669',
    accentMuted: 'rgba(16, 185, 129, 0.15)',

    warning: '#FBBF24',
    warningLight: '#FCD34D',
    warningMuted: 'rgba(251, 191, 36, 0.15)',

    danger: '#F43F5E',
    dangerLight: '#FB7185',
    dangerMuted: 'rgba(244, 63, 94, 0.15)',

    text: '#FFFFFF',
    textSecondary: '#A1A1AA',
    textMuted: '#71717A',
    textDisabled: '#52525B',

    white: '#FFFFFF',
    black: '#000000',
    transparent: 'transparent',
  },

  // 3. Nordic Slate (Sophisticated Slate & Ice Blue)
  slate: {
    background: '#0F172A',
    backgroundElevated: '#1E293B',
    card: '#1E293B',
    cardSecondary: '#293548',
    surface: '#1E293B',
    surfaceVariant: '#293548',
    border: '#334155',
    borderLight: '#475569',

    primary: '#38BDF8',
    primaryLight: '#7DD3FC',
    primaryDark: '#0284C7',
    primaryMuted: 'rgba(56, 189, 248, 0.15)',

    accent: '#818CF8',
    accentLight: '#A5B4FC',
    accentDark: '#6366F1',
    accentMuted: 'rgba(129, 140, 248, 0.15)',

    warning: '#F59E0B',
    warningLight: '#FBBF24',
    warningMuted: 'rgba(245, 158, 11, 0.15)',

    danger: '#EF4444',
    dangerLight: '#F87171',
    dangerMuted: 'rgba(239, 68, 68, 0.15)',

    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    textDisabled: '#475569',

    white: '#FFFFFF',
    black: '#000000',
    transparent: 'transparent',
  },

  // 4. Royal Amethyst (Deep Cyber Velvet & Magenta)
  amethyst: {
    background: '#0D0714',
    backgroundElevated: '#150D20',
    card: '#1C102B',
    cardSecondary: '#28173E',
    surface: '#1C102B',
    surfaceVariant: '#28173E',
    border: '#3D245B',
    borderLight: '#593584',

    primary: '#A855F7',
    primaryLight: '#C084FC',
    primaryDark: '#7E22CE',
    primaryMuted: 'rgba(168, 85, 247, 0.18)',

    accent: '#EC4899',
    accentLight: '#F472B6',
    accentDark: '#DB2777',
    accentMuted: 'rgba(236, 72, 153, 0.18)',

    warning: '#F59E0B',
    warningLight: '#FBBF24',
    warningMuted: 'rgba(245, 158, 11, 0.15)',

    danger: '#F43F5E',
    dangerLight: '#FB7185',
    dangerMuted: 'rgba(244, 63, 94, 0.15)',

    text: '#FAF5FF',
    textSecondary: '#E9D5FF',
    textMuted: '#A855F7',
    textDisabled: '#6B21A8',

    white: '#FFFFFF',
    black: '#000000',
    transparent: 'transparent',
  },

  // 5. Executive Light (Daylight Corporate Aesthetic)
  light: {
    background: '#F8FAFC',
    backgroundElevated: '#F1F5F9',
    card: '#FFFFFF',
    cardSecondary: '#F1F5F9',
    surface: '#FFFFFF',
    surfaceVariant: '#F1F5F9',
    border: '#E2E8F0',
    borderLight: '#CBD5E1',

    primary: '#059669',
    primaryLight: '#10B981',
    primaryDark: '#047857',
    primaryMuted: 'rgba(5, 150, 105, 0.12)',

    accent: '#2563EB',
    accentLight: '#3B82F6',
    accentDark: '#1D4ED8',
    accentMuted: 'rgba(37, 99, 235, 0.12)',

    warning: '#D97706',
    warningLight: '#F59E0B',
    warningMuted: 'rgba(217, 119, 6, 0.12)',

    danger: '#DC2626',
    dangerLight: '#EF4444',
    dangerMuted: 'rgba(220, 38, 38, 0.12)',

    text: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#64748B',
    textDisabled: '#94A3B8',

    white: '#FFFFFF',
    black: '#000000',
    transparent: 'transparent',
  },
};

/**
 * Active theme key (defaults to Obsidian Emerald 'dark')
 */
export let currentTheme: AppTheme = 'dark';

/**
 * Global colors object (mutated in-place so static and dynamic references stay updated)
 */
export const colors: ThemeColors = { ...themes.dark };

export type Colors = ThemeColors;

type ThemeChangeListener = (theme: AppTheme, colors: ThemeColors) => void;
const themeListeners = new Set<ThemeChangeListener>();

/**
 * Returns the theme colors object for a given theme key.
 */
export function getThemeColors(theme?: AppTheme | string): ThemeColors {
  if (theme && themes[theme as AppTheme]) {
    return themes[theme as AppTheme];
  }
  return themes.dark;
}

/**
 * Sets the active theme, mutating `colors` in-place and notifying all listeners.
 */
export function setTheme(newTheme: AppTheme | string): ThemeColors {
  const resolvedTheme: AppTheme = (newTheme && themes[newTheme as AppTheme]) ? (newTheme as AppTheme) : 'dark';
  currentTheme = resolvedTheme;
  const targetColors = themes[resolvedTheme];
  Object.assign(colors, targetColors);
  themeListeners.forEach(listener => {
    try {
      listener(resolvedTheme, colors);
    } catch {
      // Ignore listener error
    }
  });
  return colors;
}

/**
 * Registers a listener for theme changes.
 */
export function addThemeListener(listener: ThemeChangeListener): () => void {
  themeListeners.add(listener);
  return () => {
    themeListeners.delete(listener);
  };
}
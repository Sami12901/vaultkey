export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryMuted: string;
  accent: string;
  background: string;
  backgroundSecondary: string;
  card: string;
  cardSecondary: string;
  cardElevated: string;
  border: string;
  borderLight: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  danger: string;
  dangerLight: string;
  warning: string;
  warningLight: string;
  info: string;
  white: string;
}

export const themes: Record<string, ThemeColors> = {
  dark: {
    // Obsidian Emerald (Default)
    primary: '#10B981',
    primaryLight: '#34D399',
    primaryDark: '#059669',
    primaryMuted: 'rgba(16, 185, 129, 0.15)',
    accent: '#06B6D4',
    background: '#0B0F19',
    backgroundSecondary: '#111827',
    card: '#1F2937',
    cardSecondary: '#1A2234',
    cardElevated: '#243044',
    border: '#374151',
    borderLight: '#4B5563',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    danger: '#EF4444',
    dangerLight: 'rgba(239, 68, 68, 0.15)',
    warning: '#F59E0B',
    warningLight: 'rgba(245, 158, 11, 0.15)',
    info: '#3B82F6',
    white: '#FFFFFF',
  },
  oled: {
    // Midnight OLED (Pure Black)
    primary: '#06B6D4',
    primaryLight: '#22D3EE',
    primaryDark: '#0891B2',
    primaryMuted: 'rgba(6, 182, 212, 0.15)',
    accent: '#10B981',
    background: '#000000',
    backgroundSecondary: '#080808',
    card: '#101010',
    cardSecondary: '#151515',
    cardElevated: '#1F1F1F',
    border: '#242424',
    borderLight: '#333333',
    text: '#FFFFFF',
    textSecondary: '#A1A1AA',
    textMuted: '#71717A',
    danger: '#F43F5E',
    dangerLight: 'rgba(244, 63, 94, 0.15)',
    warning: '#EAB308',
    warningLight: 'rgba(234, 179, 8, 0.15)',
    info: '#38BDF8',
    white: '#FFFFFF',
  },
  slate: {
    // Nordic Slate
    primary: '#38BDF8',
    primaryLight: '#7DD3FC',
    primaryDark: '#0284C7',
    primaryMuted: 'rgba(56, 189, 248, 0.15)',
    accent: '#818CF8',
    background: '#0F172A',
    backgroundSecondary: '#1E293B',
    card: '#1E293B',
    cardSecondary: '#273549',
    cardElevated: '#334155',
    border: '#334155',
    borderLight: '#475569',
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    danger: '#F87171',
    dangerLight: 'rgba(248, 113, 113, 0.15)',
    warning: '#FBBF24',
    warningLight: 'rgba(251, 191, 36, 0.15)',
    info: '#60A5FA',
    white: '#FFFFFF',
  },
  amethyst: {
    // Royal Amethyst
    primary: '#A855F7',
    primaryLight: '#C084FC',
    primaryDark: '#9333EA',
    primaryMuted: 'rgba(168, 85, 247, 0.15)',
    accent: '#EC4899',
    background: '#0F0B1A',
    backgroundSecondary: '#18122B',
    card: '#241B3E',
    cardSecondary: '#1E1635',
    cardElevated: '#2E224E',
    border: '#3E3064',
    borderLight: '#554285',
    text: '#FAF5FF',
    textSecondary: '#C084FC',
    textMuted: '#7E6B9E',
    danger: '#F43F5E',
    dangerLight: 'rgba(244, 63, 94, 0.15)',
    warning: '#F59E0B',
    warningLight: 'rgba(245, 158, 11, 0.15)',
    info: '#818CF8',
    white: '#FFFFFF',
  },
  light: {
    // Executive Light
    primary: '#0D9488',
    primaryLight: '#14B8A6',
    primaryDark: '#0F766E',
    primaryMuted: 'rgba(13, 148, 136, 0.12)',
    accent: '#4F46E5',
    background: '#F8FAFC',
    backgroundSecondary: '#F1F5F9',
    card: '#FFFFFF',
    cardSecondary: '#F8FAFC',
    cardElevated: '#FFFFFF',
    border: '#E2E8F0',
    borderLight: '#CBD5E1',
    text: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#64748B',
    danger: '#DC2626',
    dangerLight: 'rgba(220, 38, 38, 0.12)',
    warning: '#D97706',
    warningLight: 'rgba(217, 119, 6, 0.12)',
    info: '#2563EB',
    white: '#FFFFFF',
  },
};

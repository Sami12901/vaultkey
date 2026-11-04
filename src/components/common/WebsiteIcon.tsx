import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { ItemType } from '../../types';
import { getThemeColors } from '../../theme/colors';
import { KeyIcon, NotesIcon, CardIcon, BankIcon, ImageIcon } from '../icons';
import { getMatchedBrandIcon } from '../icons/BrandIcons';
import {
  extractDomain,
  getDomainInitial,
  getDomainColor,
  getFaviconUrl,
} from '../../utils/domainUtils';
import { useVaultStore } from '../../stores/vaultStore';

export interface WebsiteIconProps {
  url?: string | null;
  title?: string;
  type?: ItemType;
  size?: number;
  style?: StyleProp<ViewStyle>;
  rounded?: boolean;
}

export const WebsiteIcon: React.FC<WebsiteIconProps> = ({
  url,
  title,
  type = 'LOGIN',
  size = 40,
  style,
  rounded = true,
}) => {
  const { settings } = useVaultStore();
  const [imageError, setImageError] = useState(false);

  const themeColors = getThemeColors(settings.theme);
  const borderRadius = rounded ? Math.round(size * 0.28) : 6;

  // Fallback category icon helper
  const renderCategoryIcon = (iconSize: number) => {
    switch (type) {
      case 'SECURE_NOTE':
        return <NotesIcon size={iconSize} color={themeColors.accentLight} />;
      case 'CREDENTIAL_CARD':
        return <CardIcon size={iconSize} color={themeColors.warningLight} />;
      case 'BANK_ACCOUNT':
        return <BankIcon size={iconSize} color="#38BDF8" />;
      case 'SECURE_MEDIA':
        return <ImageIcon size={iconSize} color="#F59E0B" />;
      case 'LOGIN':
      default:
        return <KeyIcon size={iconSize} color={themeColors.primaryLight} />;
    }
  };

  // 1. If user disabled website icons in settings, or this is not a LOGIN item
  if (settings.showWebsiteIcons === false || (type && type !== 'LOGIN')) {
    return (
      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius,
            backgroundColor: themeColors.cardSecondary,
            borderColor: themeColors.border,
            borderWidth: 1.2,
          },
          style,
        ]}
      >
        {renderCategoryIcon(Math.round(size * 0.5))}
      </View>
    );
  }

  const domain = extractDomain(url || title);

  // 2. If no domain could be resolved, show themed KeyIcon
  if (!domain) {
    return (
      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius,
            backgroundColor: themeColors.cardSecondary,
            borderColor: themeColors.border,
            borderWidth: 1.2,
          },
          style,
        ]}
      >
        <KeyIcon size={Math.round(size * 0.5)} color={themeColors.primaryLight} />
      </View>
    );
  }

  // 3. Check for crisp built-in offline SVG brand icon
  const brandIcon = getMatchedBrandIcon(domain, Math.round(size * 0.56));
  if (brandIcon) {
    return (
      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius,
            backgroundColor: themeColors.cardSecondary,
            borderColor: themeColors.border,
            borderWidth: 1.2,
          },
          style,
        ]}
      >
        {brandIcon}
      </View>
    );
  }

  // 4. Remote Favicon or beautiful monogram fallback
  const brandColor = getDomainColor(domain);
  const initial = getDomainInitial(domain || title);

  if (imageError) {
    // Ultra-stylish monogram badge
    return (
      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius,
            backgroundColor: brandColor,
            borderColor: 'rgba(255, 255, 255, 0.25)',
            borderWidth: 1.2,
          },
          style,
        ]}
      >
        <Text
          style={[
            styles.monogramText,
            {
              fontSize: Math.round(size * 0.44),
            },
          ]}
        >
          {initial}
        </Text>
      </View>
    );
  }

  const faviconUrl = getFaviconUrl(domain);
  const imgSize = Math.round(size * 0.6);

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor: themeColors.cardSecondary,
          borderColor: themeColors.border,
          borderWidth: 1.2,
        },
        style,
      ]}
    >
      <Image
        source={{ uri: faviconUrl }}
        style={{ width: imgSize, height: imgSize, borderRadius: 4 }}
        resizeMode="contain"
        onError={() => setImageError(true)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  monogramText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontFamily: 'monospace',
    textAlign: 'center',
    includeFontPadding: false,
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

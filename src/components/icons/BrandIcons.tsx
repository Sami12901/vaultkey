import React from 'react';
import Svg, { Path, Rect, Circle, Polygon, Line } from 'react-native-svg';

export interface BrandIconProps {
  size?: number;
}

export const GoogleBrandIcon: React.FC<BrandIconProps> = ({ size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <Path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <Path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill="#FBBC05"
    />
    <Path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      fill="#EA4335"
    />
  </Svg>
);

export const GithubBrandIcon: React.FC<BrandIconProps> = ({ size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="#F8FAFC">
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </Svg>
);

export const AppleBrandIcon: React.FC<BrandIconProps> = ({ size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="#F8FAFC">
    <Path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.75 1.04-1.8 0.93-2.85-.9.04-1.99.6-2.61 1.34-.55.63-1.03 1.66-.9 2.69 1.01.08 2.03-.53 2.58-1.18z" />
  </Svg>
);

export const MicrosoftBrandIcon: React.FC<BrandIconProps> = ({ size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect x="2" y="2" width="9.5" height="9.5" fill="#F25022" />
    <Rect x="12.5" y="2" width="9.5" height="9.5" fill="#7FBA00" />
    <Rect x="2" y="12.5" width="9.5" height="9.5" fill="#00A4EF" />
    <Rect x="12.5" y="12.5" width="9.5" height="9.5" fill="#FFB900" />
  </Svg>
);

export const TwitterBrandIcon: React.FC<BrandIconProps> = ({ size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="#F8FAFC">
    <Path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </Svg>
);

export const DiscordBrandIcon: React.FC<BrandIconProps> = ({ size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="#5865F2">
    <Path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.894.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </Svg>
);

export const SpotifyBrandIcon: React.FC<BrandIconProps> = ({ size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="#1DB954">
    <Circle cx="12" cy="12" r="11" />
    <Path
      d="M16.71 16.43a.69.69 0 0 1-.95.23c-2.6-1.59-5.88-1.95-9.74-1.07a.69.69 0 1 1-.3-1.35c4.22-.96 7.84-.55 10.76 1.24.32.2.42.62.23.95zm1.34-2.98a.86.86 0 0 1-1.19.28c-2.98-1.83-7.53-2.36-11.06-1.29a.86.86 0 0 1-.51-1.64c4.03-1.22 9.04-.63 12.48 1.46.39.24.52.76.28 1.19zm.12-3.1c-3.57-2.12-9.47-2.32-12.89-1.28a1.03 1.03 0 0 1-.6-2c3.93-1.19 10.45-.96 14.56 1.48a1.03 1.03 0 0 1-1.07 1.8z"
      fill="#121212"
    />
  </Svg>
);

export const NetflixBrandIcon: React.FC<BrandIconProps> = ({ size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect width="24" height="24" rx="4" fill="#141414" />
    <Path d="M6 3h3.5v18H6z" fill="#B81D24" />
    <Path d="M14.5 3H18v18h-3.5z" fill="#B81D24" />
    <Path d="M6 3h3.6l5 18H11L6 3z" fill="#E50914" />
  </Svg>
);

export const RedditBrandIcon: React.FC<BrandIconProps> = ({ size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="#FF4500">
    <Circle cx="12" cy="12" r="11" />
    <Circle cx="8.5" cy="12" r="1.5" fill="#FFFFFF" />
    <Circle cx="15.5" cy="12" r="1.5" fill="#FFFFFF" />
    <Path
      d="M9 15.5c1 1 5 1 6 0"
      stroke="#FFFFFF"
      strokeWidth={1.5}
      strokeLinecap="round"
      fill="none"
    />
  </Svg>
);

export const AmazonBrandIcon: React.FC<BrandIconProps> = ({ size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M13.9 11.2c-.1-1.3-.8-2.2-2.3-2.2-1.4 0-2.3.9-2.5 2.2h4.8zm-4.9 2.2c0 1.6 1 2.5 2.6 2.5 1.1 0 1.9-.4 2.5-1.1l1.5 1.1c-1 1.2-2.3 1.8-4 1.8-2.8 0-4.6-1.8-4.6-4.5s1.8-4.5 4.5-4.5c2.9 0 4.4 2 4.4 4.7v.5H9z"
      fill="#F8FAFC"
    />
    <Path
      d="M3 18.5c4.5 2.5 10.5 2.5 15.5-.5.4-.2.8.2.5.6-4.5 3.5-11.5 3.5-16.5.5-.3-.2 0-.7.5-.6z"
      fill="#FF9900"
    />
  </Svg>
);

export const LinkedInBrandIcon: React.FC<BrandIconProps> = ({ size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="#0A66C2">
    <Rect width="24" height="24" rx="4" />
    <Path
      d="M7.3 9H4.7v8.5h2.6V9zM6 7.8c.8 0 1.5-.7 1.5-1.5S6.8 4.8 6 4.8 4.5 5.5 4.5 6.3s.7 1.5 1.5 1.5zm13.3 5.4c0-2.5-1.3-3.7-3.2-3.7-1.5 0-2.2.8-2.6 1.4V9h-2.6c.03.7 0 8.5 0 8.5h2.6v-4.7c0-.2 0-.5.1-.7.2-.5.7-1 1.5-1 1.1 0 1.5.8 1.5 2v4.4h2.6v-4.7z"
      fill="#FFFFFF"
    />
  </Svg>
);

export const PayPalBrandIcon: React.FC<BrandIconProps> = ({ size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M7 4h6c2.2 0 4 1.8 4 4 0 2.2-1.8 4-4 4H9.5l-1 6H5.5L7 4z"
      fill="#003087"
    />
    <Path
      d="M9 7h6c2.2 0 4 1.8 4 4 0 2.2-1.8 4-4 4h-3.5l-1 6H7.5L9 7z"
      fill="#0079C1"
    />
  </Svg>
);

export const YouTubeBrandIcon: React.FC<BrandIconProps> = ({ size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect width="24" height="24" rx="6" fill="#FF0000" />
    <Path d="M10 8.5l6 3.5-6 3.5V8.5z" fill="#FFFFFF" />
  </Svg>
);

export const DropboxBrandIcon: React.FC<BrandIconProps> = ({ size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="#0061FF">
    <Path d="M6 3l6 4-6 4-6-4 6-4zm12 0l6 4-6 4-6-4 6-4zM0 11l6 4 6-4-6-4-6 4zm18-4l-6 4 6 4 6-4-6-4zm-6 9.5l-6-4-3.5 2.3L12 22l9.5-3.2-3.5-2.3-6 4z" />
  </Svg>
);

export const SlackBrandIcon: React.FC<BrandIconProps> = ({ size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M5.04 10.02a2.52 2.52 0 1 1-2.52-2.52h2.52v2.52zm1.26 0a2.52 2.52 0 0 1 5.04 0v6.3a2.52 2.52 0 1 1-5.04 0v-6.3z" fill="#E01E5A" />
    <Path d="M10.02 18.96a2.52 2.52 0 1 1-2.52 2.52v-2.52h2.52zm0-1.26a2.52 2.52 0 0 1 0-5.04h6.3a2.52 2.52 0 1 1 0 5.04h-6.3z" fill="#36C5F0" />
    <Path d="M18.96 13.98a2.52 2.52 0 1 1 2.52 2.52h-2.52v-2.52zm-1.26 0a2.52 2.52 0 0 1-5.04 0v-6.3a2.52 2.52 0 1 1 5.04 0v6.3z" fill="#2EB67D" />
    <Path d="M13.98 5.04a2.52 2.52 0 1 1 2.52-2.52v2.52h-2.52zm0 1.26a2.52 2.52 0 0 1 0 5.04h-6.3a2.52 2.52 0 1 1 0-5.04h6.3z" fill="#ECB22E" />
  </Svg>
);

export const FacebookBrandIcon: React.FC<BrandIconProps> = ({ size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="#1877F2">
    <Circle cx="12" cy="12" r="11" />
    <Path
      d="M13.5 19.5v-6.8h2.3l.3-2.7h-2.6v-1.7c0-.8.2-1.3 1.4-1.3h1.5V4.6c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.1H8.2v2.7h2.3v6.8h3z"
      fill="#FFFFFF"
    />
  </Svg>
);

export const InstagramBrandIcon: React.FC<BrandIconProps> = ({ size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect width="24" height="24" rx="6" fill="#E1306C" />
    <Rect x="5" y="5" width="14" height="14" rx="4" stroke="#FFFFFF" strokeWidth={1.8} fill="none" />
    <Circle cx="12" cy="12" r="3.2" stroke="#FFFFFF" strokeWidth={1.8} fill="none" />
    <Circle cx="16" cy="8" r="0.9" fill="#FFFFFF" />
  </Svg>
);

export const TelegramBrandIcon: React.FC<BrandIconProps> = ({ size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="#229ED9">
    <Circle cx="12" cy="12" r="11" />
    <Path
      d="M17.5 7.5L5.8 12.1c-.8.3-.8.8-.1 1l3 1 7-4.4c.3-.2.6-.1.4.1l-5.6 5.1-.2 3c.3 0 .4-.1.6-.3l1.5-1.4 3.1 2.3c.6.3 1 .2 1.2-.5l2-9.6c.2-.9-.3-1.3-1.2-.9z"
      fill="#FFFFFF"
    />
  </Svg>
);

export const WhatsAppBrandIcon: React.FC<BrandIconProps> = ({ size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="#25D366">
    <Circle cx="12" cy="12" r="11" />
    <Path
      d="M17.2 14.8c-.3-.2-1.6-.8-1.8-.9-.3-.1-.4-.2-.6.1-.2.3-.7.9-.8 1.1-.2.2-.3.2-.6.1s-1.2-.4-2.3-1.4c-.8-.7-1.4-1.6-1.6-1.9-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.3 0-.5s-.5-1.3-.7-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.2-.3-.3-.6-.4z"
      fill="#FFFFFF"
    />
  </Svg>
);

export const OpenAIBrandIcon: React.FC<BrandIconProps> = ({ size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="#10A37F">
    <Circle cx="12" cy="12" r="11" />
    <Path
      d="M12 6.5a4 4 0 0 1 3.4 1.9l.8-.5a5 5 0 0 0-8.4 1.8v1a4 4 0 0 1 2.3-1.7 4 4 0 0 1 1.9-.5zm4.8 3.5a5 5 0 0 0-3.6-2.5v1a4 4 0 0 1 3 2.1 4 4 0 0 1 .4 2.8l.9.5a5 5 0 0 0-.7-3.9zm-2 5a4 4 0 0 1-3.4 1.9 4 4 0 0 1-2.7-1.1l-.8.5a5 5 0 0 0 8.4-1.8v-1a4 4 0 0 1-1.5 1.5zm-5.6-2.1a4 4 0 0 1-.4-2.8l-.9-.5a5 5 0 0 0 .7 3.9 5 5 0 0 0 3.6 2.5v-1a4 4 0 0 1-3-2.1z"
      fill="#FFFFFF"
    />
  </Svg>
);

export const GitLabBrandIcon: React.FC<BrandIconProps> = ({ size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Polygon points="12,22 17.5,7 6.5,7" fill="#E24329" />
    <Polygon points="12,22 6.5,7 2,7" fill="#FC6D26" />
    <Polygon points="2,7 1,10.5 12,22" fill="#FCA326" />
    <Polygon points="12,22 17.5,7 22,7" fill="#FC6D26" />
    <Polygon points="22,7 23,10.5 12,22" fill="#FCA326" />
  </Svg>
);

export const FigmaBrandIcon: React.FC<BrandIconProps> = ({ size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M8 2h4v5H8a2.5 2.5 0 0 1 0-5z" fill="#F24E1E" />
    <Path d="M12 2h4a2.5 2.5 0 0 1 0 5h-4V2z" fill="#FF7262" />
    <Path d="M12 7h4a2.5 2.5 0 0 1 0 5h-4V7z" fill="#1ABCFE" />
    <Path d="M8 7h4v5H8a2.5 2.5 0 0 1 0-5z" fill="#A259FF" />
    <Path d="M8 12h4v5a2.5 2.5 0 0 1-4 0v-5z" fill="#0ACF83" />
  </Svg>
);

export const NotionBrandIcon: React.FC<BrandIconProps> = ({ size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="#F8FAFC">
    <Rect width="24" height="24" rx="4" fill="#000000" />
    <Path
      d="M6 5.5l9.5-1.5c.8-.1 1.5.4 1.5 1.2v12.6c0 .8-.6 1.4-1.4 1.4L6 18c-.8 0-1.4-.6-1.4-1.4V6.9c0-.8.6-1.4 1.4-1.4zm2 2.5v8.5h2.5l3.5-5.5v5.5H16V7.5h-2.5L10 13V8H8z"
      fill="#FFFFFF"
    />
  </Svg>
);

export const TwitchBrandIcon: React.FC<BrandIconProps> = ({ size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="#9146FF">
    <Rect width="24" height="24" rx="5" />
    <Path
      d="M5 4h14v10.5l-4 4h-3.5L9.5 21H7v-2.5H5V4zm11 8.5V7h-2v5.5h2zm-5 0V7H9v5.5h2z"
      fill="#FFFFFF"
    />
  </Svg>
);

export const ZoomBrandIcon: React.FC<BrandIconProps> = ({ size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="#2D8CFF">
    <Rect width="24" height="24" rx="6" />
    <Path
      d="M5 8.5C5 7.7 5.7 7 6.5 7h7c.8 0 1.5.7 1.5 1.5v7c0 .8-.7 1.5-1.5 1.5h-7c-.8 0-1.5-.7-1.5-1.5v-7zm11 1.8l3-2.1v7.6l-3-2.1v-3.4z"
      fill="#FFFFFF"
    />
  </Svg>
);

export const SteamBrandIcon: React.FC<BrandIconProps> = ({ size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="#171A21">
    <Circle cx="12" cy="12" r="11" fill="#1B2838" />
    <Circle cx="16.5" cy="8.5" r="3.2" stroke="#66C0F4" strokeWidth={1.5} fill="none" />
    <Circle cx="16.5" cy="8.5" r="1.5" fill="#66C0F4" />
    <Circle cx="8" cy="15.5" r="2.2" stroke="#66C0F4" strokeWidth={1.5} fill="none" />
    <Line x1="14" y1="10.5" x2="9.8" y2="14" stroke="#66C0F4" strokeWidth={1.5} />
  </Svg>
);

export const StripeBrandIcon: React.FC<BrandIconProps> = ({ size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="#635BFF">
    <Rect width="24" height="24" rx="5" />
    <Path
      d="M10.8 10.3c0-.7.6-1 1.5-1 1.4 0 3.1.5 4.5 1.3V7.2c-1.5-.6-3-.9-4.5-.9-3.7 0-6.1 1.9-6.1 5.2 0 5 6.9 4.2 6.9 6.4 0 .9-.8 1.2-1.9 1.2-1.6 0-3.7-.7-5.3-1.6v3.5c1.8.8 3.6 1.1 5.3 1.1 3.9 0 6.6-1.9 6.6-5.3 0-5.3-7-4.4-7-6.5z"
      fill="#FFFFFF"
    />
  </Svg>
);

export const CloudflareBrandIcon: React.FC<BrandIconProps> = ({ size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M19.4 11.2c-.3-2.6-2.5-4.6-5.2-4.6-2.1 0-4 1.2-4.8 3-.4-.2-.9-.3-1.4-.3-1.9 0-3.5 1.6-3.5 3.5 0 .2 0 .5.1.7C2.9 13.9 1.5 15.4 1.5 17.3c0 2 1.7 3.7 3.7 3.7h14.1c2.6 0 4.7-2.1 4.7-4.7 0-2.3-1.7-4.3-4-4.6l-.6-.5z"
      fill="#F38020"
    />
    <Path d="M19.3 17.3h-8.5c-.3 0-.5-.2-.5-.5s.2-.5.5-.5h8.5c.3 0 .5.2.5.5s-.2.5-.5.5z" fill="#FAAD3F" />
  </Svg>
);

export const AirbnbBrandIcon: React.FC<BrandIconProps> = ({ size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="#FF5A5F">
    <Circle cx="12" cy="12" r="11" />
    <Path
      d="M12 4.5c-2.3 0-4.1 3.2-4.1 6.5 0 2.8 1.8 5.2 4.1 7.2 2.3-2 4.1-4.4 4.1-7.2 0-3.3-1.8-6.5-4.1-6.5zm0 8.5c-1 0-1.8-.8-1.8-1.8s.8-1.8 1.8-1.8 1.8.8 1.8 1.8-.8 1.8-1.8 1.8z"
      fill="#FFFFFF"
    />
  </Svg>
);

export const TikTokBrandIcon: React.FC<BrandIconProps> = ({ size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect width="24" height="24" rx="5" fill="#010101" />
    <Path
      d="M16.5 7.5c-1-.7-1.6-1.7-1.7-2.9h-2.5v11.3c0 1.2-1 2.1-2.2 2.1s-2.2-1-2.2-2.1 1-2.1 2.2-2.1c.3 0 .5.1.8.2v-2.6c-.3 0-.5-.1-.8-.1-2.6 0-4.7 2.1-4.7 4.7s2.1 4.7 4.7 4.7 4.7-2.1 4.7-4.7V10c1 .8 2.3 1.2 3.7 1.2V8.7c-.8 0-1.5-.4-2-.9z"
      fill="#25F4EE"
    />
    <Path
      d="M16.3 7.3c-1-.7-1.6-1.7-1.7-2.9h-2.5v11.3c0 1.2-1 2.1-2.2 2.1s-2.2-1-2.2-2.1 1-2.1 2.2-2.1c.3 0 .5.1.8.2v-2.6c-.3 0-.5-.1-.8-.1-2.6 0-4.7 2.1-4.7 4.7s2.1 4.7 4.7 4.7 4.7-2.1 4.7-4.7V10c1 .8 2.3 1.2 3.7 1.2V8.7c-.8 0-1.5-.4-2-.9z"
      fill="#FE2C55"
    />
  </Svg>
);

/**
 * Returns a matched built-in brand icon component for known domains.
 */
export function getMatchedBrandIcon(domain: string | null, size: number = 24): React.ReactNode | null {
  if (!domain) return null;
  const d = domain.toLowerCase();

  if (d === 'google.com' || d === 'gmail.com') return <GoogleBrandIcon size={size} />;
  if (d === 'github.com') return <GithubBrandIcon size={size} />;
  if (d === 'apple.com' || d === 'icloud.com') return <AppleBrandIcon size={size} />;
  if (d === 'microsoft.com' || d === 'live.com' || d === 'outlook.com' || d === 'office.com') return <MicrosoftBrandIcon size={size} />;
  if (d === 'twitter.com' || d === 'x.com') return <TwitterBrandIcon size={size} />;
  if (d === 'discord.com') return <DiscordBrandIcon size={size} />;
  if (d === 'spotify.com') return <SpotifyBrandIcon size={size} />;
  if (d === 'netflix.com') return <NetflixBrandIcon size={size} />;
  if (d === 'reddit.com') return <RedditBrandIcon size={size} />;
  if (d === 'amazon.com') return <AmazonBrandIcon size={size} />;
  if (d === 'linkedin.com') return <LinkedInBrandIcon size={size} />;
  if (d === 'paypal.com') return <PayPalBrandIcon size={size} />;
  if (d === 'youtube.com') return <YouTubeBrandIcon size={size} />;
  if (d === 'dropbox.com') return <DropboxBrandIcon size={size} />;
  if (d === 'slack.com') return <SlackBrandIcon size={size} />;
  if (d === 'facebook.com' || d === 'fb.com') return <FacebookBrandIcon size={size} />;
  if (d === 'instagram.com') return <InstagramBrandIcon size={size} />;
  if (d === 'telegram.org' || d === 't.me') return <TelegramBrandIcon size={size} />;
  if (d === 'whatsapp.com') return <WhatsAppBrandIcon size={size} />;
  if (d === 'openai.com') return <OpenAIBrandIcon size={size} />;
  if (d === 'gitlab.com') return <GitLabBrandIcon size={size} />;
  if (d === 'notion.so') return <NotionBrandIcon size={size} />;
  if (d === 'figma.com') return <FigmaBrandIcon size={size} />;
  if (d === 'twitch.tv') return <TwitchBrandIcon size={size} />;
  if (d === 'zoom.us') return <ZoomBrandIcon size={size} />;
  if (d === 'steampowered.com') return <SteamBrandIcon size={size} />;
  if (d === 'stripe.com') return <StripeBrandIcon size={size} />;
  if (d === 'cloudflare.com') return <CloudflareBrandIcon size={size} />;
  if (d === 'airbnb.com') return <AirbnbBrandIcon size={size} />;
  if (d === 'tiktok.com') return <TikTokBrandIcon size={size} />;

  return null;
}

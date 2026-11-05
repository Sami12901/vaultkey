/**
 * VaultKey Domain & Brand Recognition Utility
 * Privacy-preserving, local-first domain parser and brand color mapper.
 */

const KNOWN_SERVICES: Record<string, string> = {
  google: 'google.com',
  gmail: 'google.com',
  github: 'github.com',
  microsoft: 'microsoft.com',
  outlook: 'microsoft.com',
  office: 'microsoft.com',
  apple: 'apple.com',
  icloud: 'apple.com',
  amazon: 'amazon.com',
  aws: 'amazon.com',
  netflix: 'netflix.com',
  spotify: 'spotify.com',
  discord: 'discord.com',
  reddit: 'reddit.com',
  twitter: 'twitter.com',
  x: 'twitter.com',
  facebook: 'facebook.com',
  meta: 'facebook.com',
  instagram: 'instagram.com',
  youtube: 'youtube.com',
  linkedin: 'linkedin.com',
  paypal: 'paypal.com',
  slack: 'slack.com',
  dropbox: 'dropbox.com',
  notion: 'notion.so',
  figma: 'figma.com',
  gitlab: 'gitlab.com',
  twitch: 'twitch.tv',
  adobe: 'adobe.com',
  yahoo: 'yahoo.com',
  pinterest: 'pinterest.com',
  tiktok: 'tiktok.com',
  openai: 'openai.com',
  chatgpt: 'openai.com',
  zoom: 'zoom.us',
  whatsapp: 'whatsapp.com',
  telegram: 'telegram.org',
  steam: 'steampowered.com',
  epic: 'epicgames.com',
  uber: 'uber.com',
  airbnb: 'airbnb.com',
  stripe: 'stripe.com',
  cloudflare: 'cloudflare.com',
  digitalocean: 'digitalocean.com',
  bitbucket: 'bitbucket.org',
};

const BRAND_COLORS: Record<string, string> = {
  'google.com': '#4285F4',
  'github.com': '#333333',
  'apple.com': '#8E8E93',
  'microsoft.com': '#00A4EF',
  'amazon.com': '#FF9900',
  'netflix.com': '#E50914',
  'spotify.com': '#1DB954',
  'discord.com': '#5865F2',
  'reddit.com': '#FF4500',
  'twitter.com': '#1DA1F2',
  'facebook.com': '#1877F2',
  'instagram.com': '#E1306C',
  'youtube.com': '#FF0000',
  'linkedin.com': '#0A66C2',
  'paypal.com': '#003087',
  'slack.com': '#4A154B',
  'dropbox.com': '#0061FF',
  'notion.so': '#2E3440',
  'figma.com': '#F24E1E',
  'gitlab.com': '#FC6D26',
  'twitch.tv': '#9146FF',
  'whatsapp.com': '#25D366',
  'telegram.org': '#229ED9',
  'openai.com': '#10A37F',
  'zoom.us': '#2D8CFF',
  'uber.com': '#000000',
  'airbnb.com': '#FF5A5F',
  'stripe.com': '#635BFF',
  'cloudflare.com': '#F38020',
};

const VIBRANT_PALETTE = [
  '#2563EB', // Blue
  '#7C3AED', // Violet
  '#DB2777', // Pink
  '#DC2626', // Red
  '#D97706', // Amber
  '#059669', // Emerald
  '#0D9488', // Teal
  '#0284C7', // Sky
  '#4F46E5', // Indigo
  '#9333EA', // Purple
  '#EA580C', // Orange
  '#16A34A', // Green
];

/**
 * Extracts a clean domain hostname from a URL, domain, or common service title.
 */
export function extractDomain(urlOrTitle?: string | null): string | null {
  if (!urlOrTitle) return null;
  let raw = urlOrTitle.trim().toLowerCase();

  // If input is a JSON array string e.g. ["https://github.com"]
  if (raw.startsWith('[') && raw.endsWith(']')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
        raw = parsed[0].trim().toLowerCase();
      }
    } catch {
      // ignore
    }
  }

  // Remove protocol
  if (raw.includes('://')) {
    raw = raw.split('://')[1];
  }

  // Remove path, query, fragment
  raw = raw.split('/')[0].split('?')[0].split('#')[0];

  // Strip userinfo authority (e.g. google.com@attacker.com -> attacker.com)
  if (raw.includes('@')) {
    raw = raw.split('@').pop() || '';
  }

  // Remove port if present
  raw = raw.split(':')[0];

  // Remove common leading prefixes
  if (raw.startsWith('www.')) {
    raw = raw.slice(4);
  } else if (raw.startsWith('m.')) {
    raw = raw.slice(2);
  }

  // If it has a dot and valid chars, it's a domain
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(raw)) {
    return raw;
  }

  // Check known services by keyword match
  const words = raw.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/);
  for (const word of words) {
    if (KNOWN_SERVICES[word]) {
      return KNOWN_SERVICES[word];
    }
  }

  // If the whole stripped text matches a known service
  const cleaned = raw.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (KNOWN_SERVICES[cleaned]) {
    return KNOWN_SERVICES[cleaned];
  }

  return null;
}

/**
 * Returns the single character monogram for the domain or title.
 */
export function getDomainInitial(domainOrTitle?: string | null): string {
  const domain = extractDomain(domainOrTitle);
  if (domain) {
    return domain.charAt(0).toUpperCase();
  }
  if (domainOrTitle && domainOrTitle.trim().length > 0) {
    return domainOrTitle.trim().charAt(0).toUpperCase();
  }
  return 'V';
}

/**
 * Returns the brand or deterministic color for the domain or title.
 */
export function getDomainColor(domainOrTitle?: string | null): string {
  const domain = extractDomain(domainOrTitle);
  if (domain && BRAND_COLORS[domain]) {
    return BRAND_COLORS[domain];
  }

  // Hash-based deterministic color selection
  const key = domain || domainOrTitle || 'vaultkey';
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % VIBRANT_PALETTE.length;
  return VIBRANT_PALETTE[index];
}

/**
 * Returns a high-resolution favicon URL for a given domain.
 * @deprecated Remote Google Favicon requests have been eliminated from UI components (WebsiteIcon)
 * to prevent domain metadata leakage and uphold zero-knowledge privacy. Retained for URL helper compatibility.
 */
export function getFaviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
}


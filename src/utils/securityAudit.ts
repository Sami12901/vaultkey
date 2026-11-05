/**
 * VaultKey Advanced Password Health Suite & Insecure HTTP Audit
 *
 * Audits credential items for:
 * 1. Weak passwords (short length, lack of character sets, low entropy)
 * 2. Reused passwords (identical hashes across multiple accounts)
 * 3. Stale/old passwords (>90 days without update)
 * 4. Insecure HTTP unencrypted protocols (http:// vs https://)
 * 5. High-risk accounts lacking two-factor authentication (missing 2FA against catalog)
 */

import { SecurityAnalysis } from '../types';
import { sha1 } from './hibpUtils';

export const HIGH_RISK_2FA_DOMAINS: readonly string[] = [
  'google.com',
  'gmail.com',
  'github.com',
  'aws.amazon.com',
  'amazon.com',
  'microsoft.com',
  'live.com',
  'outlook.com',
  'twitter.com',
  'x.com',
  'discord.com',
  'apple.com',
  'icloud.com',
  'binance.com',
  'coinbase.com',
  'paypal.com',
  'facebook.com',
  'instagram.com',
  'linkedin.com',
  'reddit.com',
  'dropbox.com',
  'gitlab.com',
  'proton.me',
  'protonmail.com',
];

export interface AuditItemInput {
  id: string;
  type?: string;
  title: string;
  password?: string;
  website?: string;
  urls?: string[] | string;
  createdAt?: number;
  lastChangedAt?: number;
}

export interface AuditTotpInput {
  id?: string;
  title?: string;
  issuer?: string;
  accountName?: string;
}

/**
 * Checks if a given URL is unencrypted HTTP (excluding localhost/loopback).
 */
export function isInsecureHttpUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim().toLowerCase();
  if (!trimmed.startsWith('http://')) return false;

  // Exclude local development loopbacks
  if (
    trimmed.startsWith('http://localhost') ||
    trimmed.startsWith('http://127.0.0.1') ||
    trimmed.startsWith('http://[::1]')
  ) {
    return false;
  }

  return true;
}

/**
 * Extracts normalized hostname or domain from URL or domain string.
 */
export function extractDomainFromUrl(urlOrDomain: string): string {
  if (!urlOrDomain) return '';
  const trimmed = urlOrDomain.trim().toLowerCase();
  try {
    const withProtocol = trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : `https://${trimmed}`;
    const parsed = new URL(withProtocol);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    // If URL parsing fails, extract characters up to slash/colon
    const stripped = trimmed.replace(/^https?:\/\//, '').replace(/^www\./, '');
    return stripped.split('/')[0].split(':')[0];
  }
}

/**
 * Determines whether a given URL, domain, or title corresponds to a known high-risk domain.
 */
export function matchHighRiskDomain(urlOrTitle?: string | null): string | null {
  if (!urlOrTitle) return null;
  const domain = extractDomainFromUrl(urlOrTitle);

  for (const riskDomain of HIGH_RISK_2FA_DOMAINS) {
    if (domain === riskDomain || domain.endsWith(`.${riskDomain}`)) {
      return riskDomain;
    }
  }

  // Also check if title or text directly includes distinctive brand name
  const lower = urlOrTitle.toLowerCase();
  const distinctiveBrands = [
    'google', 'github', 'amazon', 'aws', 'microsoft', 'twitter',
    'discord', 'apple', 'binance', 'coinbase', 'paypal', 'facebook',
    'dropbox', 'gitlab', 'reddit', 'linkedin',
  ];
  for (const brand of distinctiveBrands) {
    if (lower.includes(brand)) {
      const match = HIGH_RISK_2FA_DOMAINS.find(d => d.includes(brand));
      if (match) return match;
    }
  }

  return null;
}

/**
 * Checks whether any 2FA token matches the target domain or title.
 */
export function hasMatchingTotp(
  target: string,
  totpItems: AuditTotpInput[]
): boolean {
  if (!target || !totpItems || totpItems.length === 0) return false;
  const targetLower = target.toLowerCase();
  const targetDomain = extractDomainFromUrl(target);
  const targetBrand = targetDomain.split('.')[0];

  return totpItems.some(totp => {
    const issuer = (totp.issuer || '').toLowerCase();
    const title = (totp.title || '').toLowerCase();
    const account = (totp.accountName || '').toLowerCase();

    if (issuer && (issuer.includes(targetBrand) || targetLower.includes(issuer))) return true;
    if (title && (title.includes(targetBrand) || targetLower.includes(title))) return true;
    if (account && (account.includes(targetBrand) || targetLower.includes(account))) return true;
    return false;
  });
}

/**
 * Performs a comprehensive security audit across vault credentials.
 */
export function auditVaultCredentials(
  items: AuditItemInput[],
  totpItems: AuditTotpInput[] = []
): SecurityAnalysis {
  const logins = items.filter(i => !i.type || i.type === 'LOGIN');
  const now = Date.now();
  const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;

  let weakCount = 0;
  let oldCount = 0;
  let insecureHttpCount = 0;
  let missing2faCount = 0;

  const weakItemIds: string[] = [];
  const oldItemIds: string[] = [];
  const insecureHttpItemIds: string[] = [];
  const missing2faItemIds: string[] = [];

  const passwordMap = new Map<string, string[]>();

  for (const item of logins) {
    const pass = item.password || '';

    // 1. Weak password check
    if (
      pass.length < 10 ||
      /^[a-zA-Z]+$/.test(pass) ||
      /^[0-9]+$/.test(pass) ||
      pass === 'password' ||
      pass === '123456'
    ) {
      weakCount++;
      weakItemIds.push(item.id);
    }

    // 2. Old password check
    const timestamp = item.lastChangedAt || item.createdAt || 0;
    if (timestamp > 0 && now - timestamp > ninetyDaysMs) {
      oldCount++;
      oldItemIds.push(item.id);
    }

    // 3. Insecure HTTP check
    const urls: string[] = [];
    if (typeof item.urls === 'string') {
      try {
        const parsed = JSON.parse(item.urls);
        if (Array.isArray(parsed)) urls.push(...parsed);
        else urls.push(item.urls);
      } catch {
        urls.push(item.urls);
      }
    } else if (Array.isArray(item.urls)) {
      urls.push(...item.urls);
    }
    if (item.website) {
      urls.push(item.website);
    }

    const hasInsecure = urls.some(u => isInsecureHttpUrl(u));
    if (hasInsecure) {
      insecureHttpCount++;
      insecureHttpItemIds.push(item.id);
    }

    // 4. Missing 2FA for high-risk accounts
    const testString = urls.length > 0 ? urls[0] : item.title;
    const riskDomain = matchHighRiskDomain(testString) || matchHighRiskDomain(item.title);
    if (riskDomain) {
      const isProtected = hasMatchingTotp(riskDomain, totpItems) || hasMatchingTotp(item.title, totpItems);
      if (!isProtected) {
        missing2faCount++;
        missing2faItemIds.push(item.id);
      }
    }

    // 5. Password reuse
    if (pass.length > 0) {
      const hash = sha1(pass);
      const list = passwordMap.get(hash) || [];
      list.push(item.id);
      passwordMap.set(hash, list);
    }
  }

  const reusedItemIds: string[] = [];
  let reusedCount = 0;
  for (const [_, ids] of passwordMap.entries()) {
    if (ids.length > 1) {
      reusedCount += ids.length;
      reusedItemIds.push(...ids);
    }
  }

  const total = logins.length;
  let score = 100;
  if (total > 0) {
    const weakPenalty = (weakCount / total) * 35;
    const reusedPenalty = (reusedCount / total) * 25;
    const oldPenalty = (oldCount / total) * 15;
    const httpPenalty = (insecureHttpCount / total) * 15;
    const twoFaPenalty = (missing2faCount / total) * 10;

    score = Math.max(0, Math.round(100 - weakPenalty - reusedPenalty - oldPenalty - httpPenalty - twoFaPenalty));
  }

  return {
    score,
    totalItems: total,
    weakCount,
    reusedCount,
    oldCount,
    weakItemIds,
    reusedItemIds,
    oldItemIds,
    insecureHttpCount,
    insecureHttpItemIds,
    missing2faCount,
    missing2faItemIds,
  };
}

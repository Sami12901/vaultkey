/**
 * HaveIBeenPwned k-Anonymity Password Breach Checker Service
 *
 * Implements Cloudflare-backed k-Anonymity API (https://api.pwnedpasswords.com/range/{prefix}).
 * Guarantees zero password or full-hash disclosure: only the first 5 characters of the SHA-1 hash
 * are sent to the external API.
 */

import { sha1, splitSha1PrefixSuffix, parseHibpRangeResponse } from '../utils/hibpUtils';

export interface HibpBreachResult {
  breached: boolean;
  count: number;
  offline?: boolean;
}

export interface HibpCheckOptions {
  timeoutMs?: number;
  fetchFn?: typeof fetch;
}

export const hibpService = {
  /**
   * Checks whether a password appears in HaveIBeenPwned breach databases using k-anonymity.
   *
   * @param password Plaintext password to evaluate
   * @param options Configuration options (timeout, mock fetch for testing)
   */
  async checkPasswordBreach(
    password: string,
    options?: HibpCheckOptions
  ): Promise<HibpBreachResult> {
    if (!password || password.length === 0) {
      return { breached: false, count: 0, offline: false };
    }

    const timeoutMs = options?.timeoutMs ?? 5000;
    const activeFetch = options?.fetchFn ?? fetch;

    try {
      const fullHash = sha1(password);
      const { prefix, suffix } = splitSha1PrefixSuffix(fullHash);

      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeoutId = controller
        ? setTimeout(() => controller.abort(), timeoutMs)
        : null;

      try {
        const response = await activeFetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
          method: 'GET',
          headers: {
            'User-Agent': 'VaultKey-PasswordManager-v1.3.0',
            'Add-Padding': 'true', // Cloudflare padding against packet size analysis
          },
          signal: controller ? (controller.signal as any) : undefined,
        });

        if (!response.ok) {
          // If HIBP returns rate limit 429 or 5xx, gracefully return offline status
          return { breached: false, count: 0, offline: true };
        }

        const text = await response.text();
        const { breached, count } = parseHibpRangeResponse(text, suffix);
        return { breached, count, offline: false };
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    } catch {
      // Network failure, timeout, or abort
      return { breached: false, count: 0, offline: true };
    }
  },
};

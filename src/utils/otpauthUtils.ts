import { AuthenticatorInput } from '../types';

/**
 * Parses a standard otpauth:// URI.
 * Format: otpauth://totp/[Issuer:]Account?secret=SECRET&issuer=Issuer&algorithm=SHA1&digits=6&period=30
 */
export function parseOtpAuthUri(uriString: string): AuthenticatorInput {
  const trimmed = uriString.trim();
  if (!trimmed.toLowerCase().startsWith('otpauth://totp/')) {
    throw new Error('Unsupported URI format. Must start with otpauth://totp/');
  }

  // Parse path and query
  const questionMarkIndex = trimmed.indexOf('?');
  const pathPart = questionMarkIndex >= 0 ? trimmed.substring(15, questionMarkIndex) : trimmed.substring(15);
  const queryPart = questionMarkIndex >= 0 ? trimmed.substring(questionMarkIndex + 1) : '';

  const decodedPath = decodeURIComponent(pathPart);
  let pathIssuer = '';
  let pathAccount = decodedPath;

  if (decodedPath.includes(':')) {
    const parts = decodedPath.split(':');
    pathIssuer = parts[0].trim();
    pathAccount = parts.slice(1).join(':').trim();
  }

  // Parse query params
  const params: Record<string, string> = {};
  if (queryPart) {
    const pairs = queryPart.split('&');
    for (const pair of pairs) {
      const [key, val] = pair.split('=');
      if (key && val) {
        params[decodeURIComponent(key).toLowerCase()] = decodeURIComponent(val);
      }
    }
  }

  const rawSecret = (params.secret || '').trim().replace(/[\s-]/g, '').toUpperCase();
  if (!rawSecret) {
    throw new Error('Missing secret parameter in otpauth URI');
  }

  if (!validateBase32Secret(rawSecret)) {
    throw new Error('Secret is not a valid Base32 string (must contain only A-Z and 2-7)');
  }

  const issuer = params.issuer || pathIssuer || 'Authenticator';
  const accountName = pathAccount || params.account || '';
  const title = issuer && accountName ? `${issuer} (${accountName})` : issuer || accountName || '2FA Code';

  let algorithm: 'SHA1' | 'SHA256' | 'SHA512' = 'SHA1';
  const rawAlgo = (params.algorithm || 'SHA1').toUpperCase();
  if (rawAlgo === 'SHA256' || rawAlgo === 'HMACSHA256') algorithm = 'SHA256';
  else if (rawAlgo === 'SHA512' || rawAlgo === 'HMACSHA512') algorithm = 'SHA512';

  const digits = params.digits === '8' ? 8 : 6;
  const period = parseInt(params.period || '30', 10) || 30;

  return {
    title,
    issuer,
    accountName,
    secret: rawSecret,
    algorithm,
    digits,
    period,
  };
}

/**
 * Validates whether a given string is a valid RFC 4648 Base32 string.
 */
export function validateBase32Secret(secret: string): boolean {
  const sanitized = secret.trim().replace(/[\s-]/g, '').toUpperCase();
  if (sanitized.length < 8) return false;
  // Base32 RFC 4648 allows A-Z and 2-7, with optional trailing '=' padding
  return /^[A-Z2-7]+=*$/.test(sanitized);
}

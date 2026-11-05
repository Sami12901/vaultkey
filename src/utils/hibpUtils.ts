/**
 * HaveIBeenPwned k-Anonymity Utilities & SHA-1 Implementation
 *
 * Provides pure TypeScript SHA-1 computation and response parser for HIBP k-Anonymity.
 * Adheres strictly to zero-knowledge: only 5-character SHA-1 prefixes are ever transmitted.
 */

/**
 * Pure TypeScript RFC 3174 compliant SHA-1 hash function.
 * Operates cross-platform on React Native Hermes, Node.js, Electron, and browser DOM.
 */
export function sha1(input: string): string {
  // Convert string to UTF-8 bytes
  const bytes: number[] = [];
  for (let i = 0; i < input.length; i++) {
    let charCode = input.charCodeAt(i);
    if (charCode < 0x80) {
      bytes.push(charCode);
    } else if (charCode < 0x800) {
      bytes.push(0xc0 | (charCode >> 6));
      bytes.push(0x80 | (charCode & 0x3f));
    } else if (charCode < 0xd800 || charCode >= 0xe000) {
      bytes.push(0xe0 | (charCode >> 12));
      bytes.push(0x80 | ((charCode >> 6) & 0x3f));
      bytes.push(0x80 | (charCode & 0x3f));
    } else {
      // Surrogate pair
      i++;
      charCode = 0x10000 + (((charCode & 0x3ff) << 10) | (input.charCodeAt(i) & 0x3ff));
      bytes.push(0xf0 | (charCode >> 18));
      bytes.push(0x80 | ((charCode >> 12) & 0x3f));
      bytes.push(0x80 | ((charCode >> 6) & 0x3f));
      bytes.push(0x80 | (charCode & 0x3f));
    }
  }

  const bitLength = bytes.length * 8;

  // Append bit '1' (0x80)
  bytes.push(0x80);

  // Pad with 0s until length % 64 === 56
  while ((bytes.length % 64) !== 56) {
    bytes.push(0x00);
  }

  // Append original 64-bit length in big-endian
  const highBits = Math.floor(bitLength / 0x100000000);
  const lowBits = bitLength >>> 0;

  bytes.push((highBits >>> 24) & 0xff);
  bytes.push((highBits >>> 16) & 0xff);
  bytes.push((highBits >>> 8) & 0xff);
  bytes.push(highBits & 0xff);

  bytes.push((lowBits >>> 24) & 0xff);
  bytes.push((lowBits >>> 16) & 0xff);
  bytes.push((lowBits >>> 8) & 0xff);
  bytes.push(lowBits & 0xff);

  // Initial hash values
  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;

  const rotl = (n: number, s: number): number => {
    return ((n << s) | (n >>> (32 - s))) >>> 0;
  };

  const w = new Uint32Array(80);

  // Process 64-byte chunks
  for (let offset = 0; offset < bytes.length; offset += 64) {
    for (let i = 0; i < 16; i++) {
      const idx = offset + i * 4;
      w[i] =
        ((bytes[idx] << 24) |
          (bytes[idx + 1] << 16) |
          (bytes[idx + 2] << 8) |
          bytes[idx + 3]) >>>
        0;
    }

    for (let i = 16; i < 80; i++) {
      w[i] = rotl(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;

    for (let i = 0; i < 80; i++) {
      let f = 0;
      let k = 0;

      if (i < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (i < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (i < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }

      const temp = (rotl(a, 5) + f + e + k + w[i]) >>> 0;
      e = d;
      d = c;
      c = rotl(b, 30);
      b = a;
      a = temp;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }

  const toHex = (n: number): string => {
    return n.toString(16).padStart(8, '0');
  };

  return `${toHex(h0)}${toHex(h1)}${toHex(h2)}${toHex(h3)}${toHex(h4)}`.toUpperCase();
}

/**
 * Splits a 40-character SHA-1 hash into a 5-character prefix and 35-character suffix.
 */
export function splitSha1PrefixSuffix(hash: string): { prefix: string; suffix: string } {
  const upper = hash.trim().toUpperCase();
  if (upper.length !== 40) {
    throw new Error(`Invalid SHA-1 hash length (${upper.length}). Expected 40 hex characters.`);
  }
  return {
    prefix: upper.substring(0, 5),
    suffix: upper.substring(5),
  };
}

/**
 * Parses response text from the HIBP range API.
 * Response consists of lines formatted as: <SUFFIX>:<COUNT>
 */
export function parseHibpRangeResponse(
  responseText: string,
  targetSuffix: string
): { breached: boolean; count: number } {
  if (!responseText || !targetSuffix) {
    return { breached: false, count: 0 };
  }

  const cleanTarget = targetSuffix.trim().toUpperCase();
  const lines = responseText.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const lineSuffix = line.substring(0, colonIndex).trim().toUpperCase();
    if (lineSuffix === cleanTarget) {
      const countStr = line.substring(colonIndex + 1).trim();
      const count = parseInt(countStr, 10);
      return {
        breached: true,
        count: isNaN(count) ? 1 : count,
      };
    }
  }

  return { breached: false, count: 0 };
}

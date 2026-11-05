/**
 * VaultKey Universal 3rd-Party CSV Importer for Electron
 *
 * Implements an RFC 4180 compliant CSV parser with support for:
 * - Multiline fields enclosed in quotes
 * - Escaped commas and quotes ("")
 * - UTF-8 Byte Order Mark (BOM) stripping
 * - Automatic schema detection for Bitwarden, Google Chrome, 1Password, LastPass, and Generic CSV
 * - Mapping to VaultKey credential schemas
 */

export type CsvFormat = 'BITWARDEN' | 'CHROME' | 'ONEPASSWORD' | 'LASTPASS' | 'GENERIC';

export interface ParsedCredentialItem {
  title: string;
  username: string;
  password: string;
  url: string;
  notes: string;
  folder?: string;
  isFavorite?: boolean;
  totpSecret?: string;
}

export interface CsvParseResult {
  format: CsvFormat;
  items: ParsedCredentialItem[];
  errors: string[];
}

export function parseRfc4180Csv(csvContent: string): string[][] {
  if (!csvContent) return [];

  let input = csvContent;
  if (input.charCodeAt(0) === 0xfeff) {
    input = input.substring(1);
  }

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;
  const len = input.length;

  while (i < len) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < len && input[i + 1] === '"') {
          currentField += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
        i++;
        continue;
      } else if (char === '\r') {
        if (i + 1 < len && input[i + 1] === '\n') {
          i++;
        }
        currentRow.push(currentField);
        currentField = '';
        rows.push(currentRow);
        currentRow = [];
        i++;
        continue;
      } else if (char === '\n') {
        currentRow.push(currentField);
        currentField = '';
        rows.push(currentRow);
        currentRow = [];
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows.filter(row => row.some(cell => cell.trim().length > 0));
}

export function detectAndParseCsv(csvContent: string): CsvParseResult {
  const errors: string[] = [];
  const rows = parseRfc4180Csv(csvContent);

  if (rows.length < 2) {
    return {
      format: 'GENERIC',
      items: [],
      errors: ['CSV content must have at least a header row and one data row'],
    };
  }

  const headerRow = rows[0].map(h => h.trim().toLowerCase());
  const headerMap = new Map<string, number>();
  headerRow.forEach((col, idx) => headerMap.set(col, idx));

  let format: CsvFormat = 'GENERIC';

  if (
    headerMap.has('login_username') ||
    headerMap.has('login_password') ||
    headerMap.has('login_uri') ||
    (headerMap.has('folder') && headerMap.has('favorite') && headerMap.has('reprompt'))
  ) {
    format = 'BITWARDEN';
  } else if (
    headerMap.has('name') &&
    headerMap.has('url') &&
    headerMap.has('username') &&
    headerMap.has('password') &&
    headerRow.length <= 6
  ) {
    format = 'CHROME';
  } else if (
    (headerMap.has('title') || headerMap.has('name')) &&
    headerMap.has('url') &&
    headerMap.has('username') &&
    headerMap.has('password') &&
    (headerMap.has('notes') || headerMap.has('notesplain'))
  ) {
    format = 'ONEPASSWORD';
  } else if (
    headerMap.has('url') &&
    headerMap.has('username') &&
    headerMap.has('password') &&
    (headerMap.has('extra') || headerMap.has('grouping') || headerMap.has('fav'))
  ) {
    format = 'LASTPASS';
  }

  const items: ParsedCredentialItem[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const getVal = (colName: string): string => {
      const idx = headerMap.get(colName.toLowerCase());
      return idx !== undefined && idx < row.length ? row[idx].trim() : '';
    };

    let title = '';
    let username = '';
    let password = '';
    let url = '';
    let notes = '';
    let folder = '';
    let isFavorite = false;
    let totpSecret = '';

    try {
      if (format === 'BITWARDEN') {
        folder = getVal('folder');
        isFavorite = getVal('favorite') === '1' || getVal('favorite').toLowerCase() === 'true';
        title = getVal('name');
        notes = getVal('notes');
        url = getVal('login_uri');
        username = getVal('login_username');
        password = getVal('login_password');
        totpSecret = getVal('login_totp');
      } else if (format === 'CHROME') {
        title = getVal('name');
        url = getVal('url');
        username = getVal('username');
        password = getVal('password');
      } else if (format === 'ONEPASSWORD') {
        title = getVal('title') || getVal('name');
        url = getVal('url') || getVal('website');
        username = getVal('username') || getVal('login');
        password = getVal('password');
        notes = getVal('notes') || getVal('notesplain');
        totpSecret = getVal('one-time password') || getVal('otp') || getVal('totp');
      } else if (format === 'LASTPASS') {
        url = getVal('url');
        username = getVal('username');
        password = getVal('password');
        notes = getVal('extra');
        title = getVal('name');
        folder = getVal('grouping');
        isFavorite = getVal('fav') === '1';
        totpSecret = getVal('totp');
      } else {
        for (let c = 0; c < headerRow.length && c < row.length; c++) {
          const col = headerRow[c];
          const val = row[c].trim();
          if (!val) continue;

          if (col.includes('user') || col.includes('email') || col.includes('login') || col.includes('account')) {
            if (!username) username = val;
          } else if (col.includes('pass') || col.includes('secret') || col.includes('pwd')) {
            if (!password) password = val;
          } else if (col.includes('url') || col.includes('web') || col.includes('site') || col.includes('link') || col.includes('domain')) {
            if (!url) url = val;
          } else if (col.includes('title') || col.includes('name') || col.includes('label') || col.includes('service') || col.includes('app') || col.includes('item')) {
            if (!title) title = val;
          } else if (col.includes('note') || col.includes('comment') || col.includes('desc')) {
            if (!notes) notes = val;
          } else if (col.includes('folder') || col.includes('group') || col.includes('category')) {
            if (!folder) folder = val;
          } else if (col.includes('fav') || col.includes('star')) {
            isFavorite = val === '1' || val.toLowerCase() === 'true' || val.toLowerCase() === 'yes';
          } else if (col.includes('totp') || col.includes('otp') || col.includes('2fa')) {
            if (!totpSecret) totpSecret = val;
          }
        }
      }

      if (!title) {
        if (url) {
          try {
            const cleanUrl = url.startsWith('http') ? url : `https://${url}`;
            const parsed = new URL(cleanUrl);
            title = parsed.hostname.replace(/^www\./, '');
          } catch {
            title = url;
          }
        } else if (username) {
          title = username;
        } else {
          title = `Imported Credential ${r}`;
        }
      }

      if (title || username || password) {
        items.push({
          title,
          username,
          password,
          url,
          notes,
          folder: folder || undefined,
          isFavorite: isFavorite || undefined,
          totpSecret: totpSecret || undefined,
        });
      }
    } catch (e: any) {
      errors.push(`Row ${r + 1}: ${e?.message || 'Failed to parse row'}`);
    }
  }

  return {
    format,
    items,
    errors,
  };
}

import { parseRfc4180Csv, detectAndParseCsv } from '../src/utils/csvImporter';

describe('Universal 3rd-Party CSV Importer', () => {
  describe('RFC 4180 Compliant Parser', () => {
    it('parses standard comma-separated lines', () => {
      const csv = 'title,username,password\nGoogle,user@gmail.com,pass123\nGitHub,dev,secret456';
      const rows = parseRfc4180Csv(csv);
      expect(rows).toEqual([
        ['title', 'username', 'password'],
        ['Google', 'user@gmail.com', 'pass123'],
        ['GitHub', 'dev', 'secret456'],
      ]);
    });

    it('handles quoted fields with commas and escaped quotes ("")', () => {
      const csv = 'name,notes\n"Smith, John","He said ""Hello, World!"""';
      const rows = parseRfc4180Csv(csv);
      expect(rows).toEqual([
        ['name', 'notes'],
        ['Smith, John', 'He said "Hello, World!"'],
      ]);
    });

    it('handles multiline fields enclosed in quotes', () => {
      const csv = 'name,notes\nSecureNote,"Line 1\nLine 2\nLine 3"';
      const rows = parseRfc4180Csv(csv);
      expect(rows).toHaveLength(2);
      expect(rows[1][0]).toBe('SecureNote');
      expect(rows[1][1]).toBe('Line 1\nLine 2\nLine 3');
    });

    it('strips UTF-8 Byte Order Mark (BOM)', () => {
      const csv = '\uFEFFname,password\nTest,pass';
      const rows = parseRfc4180Csv(csv);
      expect(rows[0][0]).toBe('name');
    });
  });

  describe('detectAndParseCsv Schema Detection and Vault Mapping', () => {
    it('auto-detects and maps Bitwarden CSV export format', () => {
      const bitwardenCsv = [
        'folder,favorite,type,name,notes,fields,reprompt,login_uri,login_username,login_password,login_totp',
        'Work,1,login,Slack,Team workspace,,0,https://slack.com,saif@work.com,WorkPass2026!,JBSWY3DPEHPK3PXP',
      ].join('\n');

      const result = detectAndParseCsv(bitwardenCsv);
      expect(result.format).toBe('BITWARDEN');
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual({
        title: 'Slack',
        username: 'saif@work.com',
        password: 'WorkPass2026!',
        url: 'https://slack.com',
        notes: 'Team workspace',
        folder: 'Work',
        isFavorite: true,
        totpSecret: 'JBSWY3DPEHPK3PXP',
      });
    });

    it('auto-detects and maps Google Chrome CSV export format', () => {
      const chromeCsv = [
        'name,url,username,password',
        'Google,https://accounts.google.com,saif@gmail.com,GooglePass99#',
        'Amazon,https://amazon.com,saif@amazon.com,AmazonPrime77$',
      ].join('\n');

      const result = detectAndParseCsv(chromeCsv);
      expect(result.format).toBe('CHROME');
      expect(result.items).toHaveLength(2);
      expect(result.items[0].title).toBe('Google');
      expect(result.items[0].username).toBe('saif@gmail.com');
      expect(result.items[0].password).toBe('GooglePass99#');
      expect(result.items[0].url).toBe('https://accounts.google.com');
    });

    it('auto-detects and maps 1Password CSV export format', () => {
      const onePasswordCsv = [
        'Title,URL,Username,Password,Notes',
        'Netflix,https://netflix.com,family@netflix.com,StreamAllDay!,4K Family Plan',
      ].join('\n');

      const result = detectAndParseCsv(onePasswordCsv);
      expect(result.format).toBe('ONEPASSWORD');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('Netflix');
      expect(result.items[0].username).toBe('family@netflix.com');
      expect(result.items[0].password).toBe('StreamAllDay!');
      expect(result.items[0].notes).toBe('4K Family Plan');
    });

    it('auto-detects and maps LastPass CSV export format', () => {
      const lastPassCsv = [
        'url,username,password,extra,name,grouping,fav',
        'https://dropbox.com,dropbox@user.com,DropPass!,Secure cloud,Dropbox,Personal,1',
      ].join('\n');

      const result = detectAndParseCsv(lastPassCsv);
      expect(result.format).toBe('LASTPASS');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('Dropbox');
      expect(result.items[0].username).toBe('dropbox@user.com');
      expect(result.items[0].password).toBe('DropPass!');
      expect(result.items[0].notes).toBe('Secure cloud');
      expect(result.items[0].folder).toBe('Personal');
      expect(result.items[0].isFavorite).toBe(true);
    });

    it('gracefully handles generic CSV formats with fuzzy column names', () => {
      const genericCsv = [
        'Service,Web Address,Email,Passcode,Comments',
        'Twitter,https://x.com,saif_dev,TweetPass2026!,Personal handle',
      ].join('\n');

      const result = detectAndParseCsv(genericCsv);
      expect(result.format).toBe('GENERIC');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('Twitter');
      expect(result.items[0].url).toBe('https://x.com');
      expect(result.items[0].username).toBe('saif_dev');
      expect(result.items[0].password).toBe('TweetPass2026!');
      expect(result.items[0].notes).toBe('Personal handle');
    });

    it('infers missing title from hostname in URL', () => {
      const csv = [
        'username,password,url',
        'saif,mypass,https://app.slack.com/client',
      ].join('\n');

      const result = detectAndParseCsv(csv);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('app.slack.com');
    });
  });
});

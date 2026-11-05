import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseRfc4180Csv, detectAndParseCsv } from '../electron/csvImporter.ts';

describe('Windows Desktop Universal CSV Importer', () => {
  describe('RFC 4180 Low-Level Parser', () => {
    it('parses standard comma-separated lines', () => {
      const csv = 'Name,Username,Password\nGitHub,octocat,ghp_secret123\nGoogle,alice@gmail.com,p@ssword';
      const rows = parseRfc4180Csv(csv);

      assert.equal(rows.length, 3);
      assert.deepEqual(rows[0], ['Name', 'Username', 'Password']);
      assert.deepEqual(rows[1], ['GitHub', 'octocat', 'ghp_secret123']);
      assert.deepEqual(rows[2], ['Google', 'alice@gmail.com', 'p@ssword']);
    });

    it('handles quoted fields with embedded commas', () => {
      const csv = 'Title,Notes\n"Finance, Inc.","Notes with, embedded, commas"';
      const rows = parseRfc4180Csv(csv);

      assert.equal(rows.length, 2);
      assert.equal(rows[1][0], 'Finance, Inc.');
      assert.equal(rows[1][1], 'Notes with, embedded, commas');
    });

    it('handles escaped quotes represented as double double-quotes ("")', () => {
      const csv = 'Title,Comment\nItem1,"This is a ""special"" note"';
      const rows = parseRfc4180Csv(csv);

      assert.equal(rows.length, 2);
      assert.equal(rows[1][1], 'This is a "special" note');
    });

    it('handles multiline cells enclosed in quotes', () => {
      const csv = 'Name,Certificate\nServer,"-----BEGIN CERT-----\nMIIDXTCCAkk...\n-----END CERT-----"';
      const rows = parseRfc4180Csv(csv);

      assert.equal(rows.length, 2);
      assert.equal(rows[1][0], 'Server');
      assert.ok(rows[1][1].includes('-----BEGIN CERT-----\nMIIDXTCCAkk...\n-----END CERT-----'));
    });

    it('strips UTF-8 Byte Order Mark (BOM)', () => {
      const csvWithBom = '\uFEFFName,Username\nVaultItem,user1';
      const rows = parseRfc4180Csv(csvWithBom);

      assert.equal(rows[0][0], 'Name');
    });

    it('handles Windows CRLF line terminators', () => {
      const csv = 'Col1,Col2\r\nVal1,Val2\r\nVal3,Val4';
      const rows = parseRfc4180Csv(csv);

      assert.equal(rows.length, 3);
      assert.deepEqual(rows[1], ['Val1', 'Val2']);
      assert.deepEqual(rows[2], ['Val3', 'Val4']);
    });
  });

  describe('detectAndParseCsv Schema Auto-Detection', () => {
    it('detects and parses Bitwarden export CSV', () => {
      const bitwardenCsv = [
        'folder,favorite,type,name,notes,fields,reprompt,login_uri,login_username,login_password,login_totp',
        'Personal,1,login,GitHub,My GitHub dev account,,0,https://github.com,octocat,ghp_token123,JBSWY3DPEHPK3PXP',
        'Work,0,login,AWS Console,,,0,https://aws.amazon.com,alice_dev,SuperSecretAWS!,',
      ].join('\n');

      const result = detectAndParseCsv(bitwardenCsv);

      assert.equal(result.format, 'BITWARDEN');
      assert.equal(result.items.length, 2);
      assert.equal(result.errors.length, 0);

      const item1 = result.items[0];
      assert.equal(item1.title, 'GitHub');
      assert.equal(item1.username, 'octocat');
      assert.equal(item1.password, 'ghp_token123');
      assert.equal(item1.url, 'https://github.com');
      assert.equal(item1.notes, 'My GitHub dev account');
      assert.equal(item1.folder, 'Personal');
      assert.equal(item1.isFavorite, true);
      assert.equal(item1.totpSecret, 'JBSWY3DPEHPK3PXP');

      const item2 = result.items[1];
      assert.equal(item2.title, 'AWS Console');
      assert.ok(!item2.isFavorite);
      assert.equal(item2.folder, 'Work');
      assert.equal(item2.totpSecret, undefined);
    });

    it('detects and parses Google Chrome export CSV', () => {
      const chromeCsv = [
        'name,url,username,password',
        'Google,https://accounts.google.com,alice@gmail.com,p@ss1234',
        'Reddit,https://www.reddit.com,reddit_user,superSecureRedditPwd',
      ].join('\n');

      const result = detectAndParseCsv(chromeCsv);

      assert.equal(result.format, 'CHROME');
      assert.equal(result.items.length, 2);
      assert.equal(result.items[0].title, 'Google');
      assert.equal(result.items[0].url, 'https://accounts.google.com');
      assert.equal(result.items[0].username, 'alice@gmail.com');
      assert.equal(result.items[0].password, 'p@ss1234');
    });

    it('detects and parses 1Password export CSV', () => {
      const onePasswordCsv = [
        'title,url,username,password,notes,one-time password',
        'Dropbox,https://www.dropbox.com,dropbox_user,SecretDropbox123,Sync notes,HXDMVJECJJWSRB3H',
      ].join('\n');

      const result = detectAndParseCsv(onePasswordCsv);

      assert.equal(result.format, 'ONEPASSWORD');
      assert.equal(result.items.length, 1);
      assert.equal(result.items[0].title, 'Dropbox');
      assert.equal(result.items[0].url, 'https://www.dropbox.com');
      assert.equal(result.items[0].username, 'dropbox_user');
      assert.equal(result.items[0].notes, 'Sync notes');
      assert.equal(result.items[0].totpSecret, 'HXDMVJECJJWSRB3H');
    });

    it('detects and parses LastPass export CSV', () => {
      const lastPassCsv = [
        'url,username,password,extra,name,grouping,fav,totp',
        'https://slack.com,slack_user,SlackPass789,Slack workspaces,Slack,Chat,1,MZXW6YTBOI======',
      ].join('\n');

      const result = detectAndParseCsv(lastPassCsv);

      assert.equal(result.format, 'LASTPASS');
      assert.equal(result.items.length, 1);
      assert.equal(result.items[0].title, 'Slack');
      assert.equal(result.items[0].username, 'slack_user');
      assert.equal(result.items[0].notes, 'Slack workspaces');
      assert.equal(result.items[0].folder, 'Chat');
      assert.equal(result.items[0].isFavorite, true);
      assert.equal(result.items[0].totpSecret, 'MZXW6YTBOI======');
    });

    it('handles Generic CSV fallback with intelligent column fuzzy-matching', () => {
      const genericCsv = [
        'Service Name,Login ID,Secret Key,Website Link,Star',
        'Custom Service,custom_admin,verySecretKey999,https://custom.service.internal,yes',
      ].join('\n');

      const result = detectAndParseCsv(genericCsv);

      assert.equal(result.format, 'GENERIC');
      assert.equal(result.items.length, 1);
      assert.equal(result.items[0].title, 'Custom Service');
      assert.equal(result.items[0].username, 'custom_admin');
      assert.equal(result.items[0].password, 'verySecretKey999');
      assert.equal(result.items[0].url, 'https://custom.service.internal');
      assert.equal(result.items[0].isFavorite, true);
    });

    it('rejects invalid or empty CSV content with clear error', () => {
      const emptyResult = detectAndParseCsv('');
      assert.equal(emptyResult.items.length, 0);
      assert.ok(emptyResult.errors.length > 0);

      const headerOnly = detectAndParseCsv('Col1,Col2,Col3\n');
      assert.equal(headerOnly.items.length, 0);
      assert.ok(headerOnly.errors.length > 0);
    });
  });
});

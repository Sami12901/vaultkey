import http from 'http';
import crypto from 'crypto';
import { VaultStorage } from './storage';

export class ExtensionBridge {
  private server: http.Server | null = null;
  private port: number = 49152;
  private host: string = '127.0.0.1';
  private storage: VaultStorage;
  private onSavedCallback?: () => void;

  constructor(storage: VaultStorage, onSavedCallback?: () => void) {
    this.storage = storage;
    this.onSavedCallback = onSavedCallback;
  }

  public start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          console.warn('[ExtensionBridge] Port ' + this.port + ' is already in use.');
        } else {
          console.error('[ExtensionBridge] Server error:', err);
        }
      });

      this.server.listen(this.port, this.host, () => {
        console.log('[ExtensionBridge] Local bridge listening on http://' + this.host + ':' + this.port);
        resolve();
      });
    });
  }

  public stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }

  private isAllowedOrigin(origin?: string): boolean {
    if (!origin) return true; // Direct non-browser callers or background service workers
    // Allow Chromium & Firefox extension schemes
    return /^((chrome|edge)-extension:\/\/[a-z0-9]+|moz-extension:\/\/[a-f0-9-]+)$/i.test(origin);
  }

  private isTokenValid(req: http.IncomingMessage): boolean {
    const authHeader = req.headers['authorization'];
    const tokenHeader = req.headers['x-vaultkey-token'];
    let provided = '';
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      provided = authHeader.substring(7).trim();
    } else if (typeof tokenHeader === 'string') {
      provided = tokenHeader.trim();
    }

    if (!provided) return false;
    const expected = this.storage.getBridgeToken();
    if (!expected || provided.length !== expected.length) return false;
    try {
      return crypto.timingSafeEqual(Buffer.from(provided, 'utf8'), Buffer.from(expected, 'utf8'));
    } catch {
      return false;
    }
  }

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const rawOrigin = req.headers.origin;

    // Reject untrusted web origins claiming to be extensions
    if (rawOrigin && !this.isAllowedOrigin(rawOrigin)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Forbidden: Untrusted Origin' }));
      return;
    }

    const allowOrigin = rawOrigin || '*';
    res.setHeader('Access-Control-Allow-Origin', allowOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-VaultKey-Client, X-VaultKey-Token');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const parsedUrl = new URL(req.url || '/', 'http://' + this.host + ':' + this.port);
    const pathname = parsedUrl.pathname;

    if (req.method === 'GET' && pathname === '/api/status') {
      const state = !this.storage.isInitialized()
        ? 'UNINITIALIZED'
        : this.storage.isUnlocked()
        ? 'UNLOCKED'
        : 'LOCKED';

      res.writeHead(200);
      res.end(
        JSON.stringify({
          success: true,
          state,
          paired: this.isTokenValid(req),
          app: 'VaultKey Desktop',
          version: '1.3.0',
        })
      );
      return;
    }

    if (req.method === 'POST') {
      // Mutual authentication: enforce shared pairing secret token
      if (!this.isTokenValid(req)) {
        res.writeHead(401);
        res.end(
          JSON.stringify({
            success: false,
            error: 'Unauthorized: Invalid or missing bridge pairing token',
            paired: false,
          })
        );
        return;
      }

      let bodyStr = '';
      req.on('data', (chunk) => {
        bodyStr += chunk;
      });

      req.on('end', () => {
        let body: any = {};
        try {
          if (bodyStr) body = JSON.parse(bodyStr);
        } catch {
          res.writeHead(400);
          res.end(JSON.stringify({ success: false, error: 'Invalid JSON body' }));
          return;
        }

        try {
          this.handlePost(pathname, body, res);
        } catch (err: any) {
          res.writeHead(500);
          res.end(JSON.stringify({ success: false, error: err?.message || 'Server error' }));
        }
      });
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ success: false, error: 'Endpoint not found' }));
  }

  private handlePost(pathname: string, body: any, res: http.ServerResponse): void {
    if (pathname === '/api/match') {
      if (!this.storage.isUnlocked()) {
        res.writeHead(200);
        res.end(JSON.stringify({ success: false, state: 'LOCKED', matches: [] }));
        return;
      }

      const targetDomain = this.extractDomain(body.domain || body.url || '');
      const allLogins = this.storage.getItemSummaries({ category: 'LOGIN' });

      const matches = allLogins.filter((item) => {
        if (!targetDomain) return false;
        const itemDomain = this.extractDomain(item.website || '');
        return !!(itemDomain && itemDomain === targetDomain);
      });

      res.writeHead(200);
      res.end(
        JSON.stringify({
          success: true,
          state: 'UNLOCKED',
          domain: targetDomain,
          matches: matches.map((m) => ({
            id: m.id,
            title: m.title,
            username: m.username || m.subtitle || '',
            website: m.website || '',
          })),
        })
      );
      return;
    }

    if (pathname === '/api/get-credentials') {
      if (!this.storage.isUnlocked()) {
        res.writeHead(403);
        res.end(JSON.stringify({ success: false, state: 'LOCKED', error: 'Vault is locked' }));
        return;
      }

      const itemId = body.itemId;
      if (!itemId) {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, error: 'itemId required' }));
        return;
      }

      const items = this.storage.getItemSummaries();
      const item = items.find((i) => i.id === itemId);
      const password = this.storage.getSecret(itemId, 'password');

      res.writeHead(200);
      res.end(
        JSON.stringify({
          success: true,
          username: item?.username || item?.subtitle || '',
          password,
        })
      );
      return;
    }

    if (pathname === '/api/save-credentials') {
      if (!this.storage.isUnlocked()) {
        res.writeHead(403);
        res.end(
          JSON.stringify({
            success: false,
            state: 'LOCKED',
            error: 'Please unlock VaultKey Desktop first',
          })
        );
        return;
      }

      const { title, username, password, url, domain } = body;
      if (!password) {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, error: 'Password required' }));
        return;
      }

      const cleanDomain = this.extractDomain(domain || url || '');
      const itemTitle =
        title ||
        (cleanDomain
          ? cleanDomain.charAt(0).toUpperCase() + cleanDomain.slice(1)
          : 'Saved Login');

      const savedId = this.storage.saveLoginItem({
        title: itemTitle,
        username: username || '',
        password,
        website: url || (cleanDomain ? 'https://' + cleanDomain : ''),
        notes: 'Auto-saved from browser extension on ' + new Date().toLocaleDateString(),
        isFavorite: false,
      });

      if (this.onSavedCallback) {
        try {
          this.onSavedCallback();
        } catch {}
      }

      res.writeHead(200);
      res.end(
        JSON.stringify({
          success: true,
          id: savedId,
          title: itemTitle,
          message: 'Saved to VaultKey',
        })
      );
      return;
    }

    if (pathname === '/api/search') {
      if (!this.storage.isUnlocked()) {
        res.writeHead(200);
        res.end(JSON.stringify({ success: false, state: 'LOCKED', results: [] }));
        return;
      }

      const q = body.query || '';
      const items = this.storage.getItemSummaries({ query: q, category: 'LOGIN' });

      res.writeHead(200);
      res.end(
        JSON.stringify({
          success: true,
          results: items.slice(0, 20).map((i) => ({
            id: i.id,
            title: i.title,
            username: i.username || i.subtitle || '',
            website: i.website || '',
          })),
        })
      );
      return;
    }

    if (pathname === '/api/lock') {
      this.storage.lock();
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, state: 'LOCKED' }));
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ success: false, error: 'Endpoint not found' }));
  }

  private extractDomain(urlStr: string): string {
    if (!urlStr) return '';
    try {
      const u = urlStr.startsWith('http://') || urlStr.startsWith('https://')
        ? urlStr
        : 'https://' + urlStr;
      return new URL(u).hostname.replace(/^www\./, '').toLowerCase();
    } catch {
      return urlStr.split('/')[0].replace(/^www\./, '').toLowerCase();
    }
  }
}

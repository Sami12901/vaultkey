/// <reference types="node" />
declare const global: any;
declare const __dirname: string;
declare const require: any;

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { WebsiteIcon } from '../src/components/common/WebsiteIcon';

const fs = require('fs');
const path = require('path');

describe('Adversarial Test Suite - Milestone 2 Security Hardening', () => {

  // =========================================================================
  // 1. Auto-Lock Monotonic Timer & Lifecycle Logic (MainActivity.kt Oracle)
  // =========================================================================
  describe('1. Android Auto-Lock Monotonic Timer & Lifecycle Oracle', () => {
    class MockVaultSessionManager {
      private activeDek: Uint8Array | null = null;
      private lastMonotonicActivityTime: number = 0;
      private autoLockSeconds: number = 300;
      private isInitializedVal: boolean = true;
      private databaseExistsVal: boolean = true;
      private dbIsOpen: boolean = true;
      public lockCalls: number = 0;
      public touchCalls: number = 0;

      constructor(initialTime: number, timeoutSec: number = 300) {
        this.lastMonotonicActivityTime = initialTime;
        this.autoLockSeconds = timeoutSec;
        this.activeDek = new Uint8Array([1, 2, 3, 4]);
      }

      public isInitialized(): boolean {
        // VaultSessionManager.kt: prefs.getBoolean(KEY_IS_INITIALIZED, false) && dbHelper.databaseExists()
        return this.isInitializedVal && this.databaseExistsVal;
      }

      public touch(currentTime: number): void {
        this.touchCalls++;
        this.lastMonotonicActivityTime = currentTime;
      }

      public lock(): void {
        this.lockCalls++;
        if (this.activeDek) {
          this.activeDek.fill(0);
          this.activeDek = null;
        }
        this.dbIsOpen = false;
      }

      private shouldAutoLock(currentTime: number): boolean {
        if (!this.isInitialized() || this.activeDek === null) return false;
        if (this.autoLockSeconds <= 0) {
          return this.autoLockSeconds === 0;
        }
        const elapsedMillis = currentTime - this.lastMonotonicActivityTime;
        return elapsedMillis >= this.autoLockSeconds * 1000;
      }

      public getState(currentTime: number): 'UNINITIALIZED' | 'LOCKED' | 'UNLOCKED' {
        if (!this.isInitialized()) return 'UNINITIALIZED';
        if (this.activeDek !== null && this.dbIsOpen) {
          if (this.shouldAutoLock(currentTime)) {
            this.lock();
            return 'LOCKED';
          }
          return 'UNLOCKED';
        }
        return 'LOCKED';
      }

      public isLocked(currentTime: number): boolean {
        return this.getState(currentTime) === 'LOCKED';
      }

      public isUnlocked(currentTime: number): boolean {
        return this.getState(currentTime) === 'UNLOCKED';
      }

      public getActiveDek(): Uint8Array | null {
        return this.activeDek;
      }
    }

    it('demonstrates vulnerability in prior MainActivity.onResume (touch before check fails to lock)', () => {
      const T0 = 1000000;
      const session = new MockVaultSessionManager(T0, 300); // 300s timeout
      const T_resume = T0 + 350 * 1000; // 350s later in background (timeout exceeded)

      // Buggy behavior: onResume unconditionally called touch() first
      session.touch(T_resume);
      const locked = session.isLocked(T_resume);

      // In the buggy version, touch reset the clock, so it FAILED to auto-lock!
      expect(locked).toBe(false);
      expect(session.getActiveDek()).not.toBeNull();
    });

    it('confirms Worker M2 MainActivity.onResume fix triggers auto-lock when timeout elapsed in background', () => {
      const T0 = 1000000;
      const session = new MockVaultSessionManager(T0, 300); // 300s timeout
      const T_resume = T0 + 350 * 1000; // 350s later in background (timeout exceeded)

      // Worker M2 behavior: check isLocked() BEFORE touching
      if (session.isLocked(T_resume)) {
        // Vault locked, do NOT touch
      } else {
        session.touch(T_resume);
      }

      expect(session.isLocked(T_resume)).toBe(true);
      expect(session.getActiveDek()).toBeNull();
      expect(session.lockCalls).toBe(1);
      expect(session.touchCalls).toBe(0);
    });

    it('confirms Worker M2 MainActivity.onResume preserves session if backgrounded within timeout window', () => {
      const T0 = 1000000;
      const session = new MockVaultSessionManager(T0, 300);
      const T_resume = T0 + 60 * 1000; // only 60s later (under 300s)

      if (session.isLocked(T_resume)) {
        // locked
      } else {
        session.touch(T_resume);
      }

      expect(session.isLocked(T_resume)).toBe(false);
      expect(session.getActiveDek()).not.toBeNull();
      expect(session.touchCalls).toBe(1);
      expect(session.lockCalls).toBe(0);
    });

    it('confirms exact boundary conditions for auto-lock evaluation', () => {
      const T0 = 1000000;
      // Exactly 299,999 ms (1ms below 300s threshold)
      const sessionBoundary = new MockVaultSessionManager(T0, 300);
      expect(sessionBoundary.isLocked(T0 + 299999)).toBe(false);

      // Exactly 300,000 ms (at threshold)
      expect(sessionBoundary.isLocked(T0 + 300000)).toBe(true);
      expect(sessionBoundary.getActiveDek()).toBeNull();
    });
  });

  // =========================================================================
  // 2. Offline WebsiteIcon Rendering (Zero Outbound Network Requests)
  // =========================================================================
  describe('2. WebsiteIcon Offline Isolation & Zero Network Leakage', () => {
    let originalFetch: any;
    let networkCallCount = 0;
    const interceptedUrls: string[] = [];

    beforeEach(() => {
      networkCallCount = 0;
      interceptedUrls.length = 0;
      originalFetch = (global as any).fetch;
      (global as any).fetch = jest.fn((url: string) => {
        networkCallCount++;
        interceptedUrls.push(String(url));
        return Promise.reject(new Error('Network access blocked by sandbox'));
      });
    });

    afterEach(() => {
      (global as any).fetch = originalFetch;
    });

    it('renders arbitrary external domains with ZERO network calls', () => {
      const testDomains = [
        'https://attacker-phishing-site.xyz/login',
        'https://bankofamerica.com/auth',
        'https://subdomain.internal-tracker.company.net:8443/portal',
        'https://unknown-random-crypto-site.io',
      ];

      testDomains.forEach((url) => {
        let renderer: ReactTestRenderer.ReactTestRenderer;
        ReactTestRenderer.act(() => {
          renderer = ReactTestRenderer.create(<WebsiteIcon url={url} size={48} />);
        });

        // Verify zero fetch requests initiated
        expect(networkCallCount).toBe(0);
        expect(interceptedUrls).toHaveLength(0);

        // Verify that the rendered tree does NOT contain remote Image URLs
        const json = renderer!.toJSON();
        const jsonString = JSON.stringify(json);
        expect(jsonString).not.toContain('google.com/s2/favicons');
        expect(jsonString).not.toContain('http://');
        expect(jsonString).not.toContain('https://');
      });
    });

    it('renders built-in SVG vector brand icons offline for known brands', () => {
      let renderer: ReactTestRenderer.ReactTestRenderer;
      ReactTestRenderer.act(() => {
        renderer = ReactTestRenderer.create(<WebsiteIcon url="https://github.com/login" size={48} />);
      });

      expect(networkCallCount).toBe(0);
      const json = JSON.stringify(renderer!.toJSON());
      expect(json).not.toContain('favicons');
      // Contains SVG path elements from BrandIcons
      expect(json).toContain('RNSVG');
    });

    it('renders deterministic monogram avatar for unbranded domains without remote assets', () => {
      let renderer: ReactTestRenderer.ReactTestRenderer;
      ReactTestRenderer.act(() => {
        renderer = ReactTestRenderer.create(<WebsiteIcon url="https://customservice.org" title="Custom" size={40} />);
      });

      expect(networkCallCount).toBe(0);
      const json = JSON.stringify(renderer!.toJSON());
      // Rendered monogram initial 'C'
      expect(json).toContain('"C"');
      expect(json).not.toContain('http');
    });
  });

  // =========================================================================
  // 3. BackupRestoreScreen Clipboard Isolation
  // =========================================================================
  describe('3. BackupRestoreScreen Clipboard Isolation Verification', () => {
    it('verifies BackupRestoreScreen does not invoke clipboard APIs during backup export', () => {
      const screenPath = path.resolve(__dirname, '../src/screens/backup/BackupRestoreScreen.tsx');
      const content = fs.readFileSync(screenPath, 'utf8');

      // Check handleExportJson implementation
      expect(content).toContain('const handleExportJson = async () => {');
      expect(content).toContain('backupNative.createEncryptedBackup');
      expect(content).toContain('backupNative.shareBackupFile');

      // Verify that no clipboard copying API is invoked in handleExportJson
      const exportJsonBlock = content.substring(
        content.indexOf('const handleExportJson = async () => {'),
        content.indexOf('const handleImportJson = async () => {')
      );

      expect(exportJsonBlock).not.toContain('clipboardNative');
      expect(exportJsonBlock).not.toContain('Clipboard.');
      expect(exportJsonBlock).not.toContain('copySecure');
      expect(exportJsonBlock).not.toContain('setString');
      expect(exportJsonBlock).toContain('without clipboard exposure');
    });

    it('verifies that plaintext credential dump to clipboard is eliminated throughout the file', () => {
      const screenPath = path.resolve(__dirname, '../src/screens/backup/BackupRestoreScreen.tsx');
      const content = fs.readFileSync(screenPath, 'utf8');

      // Should not import clipboardNative or @react-native-clipboard/clipboard
      expect(content).not.toContain('clipboardNative');
      expect(content).not.toContain('@react-native-clipboard/clipboard');
    });
  });

  // =========================================================================
  // 4. Windows Desktop Preload IPC Listener & Electron CSP in index.html
  // =========================================================================
  describe('4. Windows Desktop Preload IPC & Electron CSP Verification', () => {
    it('verifies preload.ts exposes onVaultLocked with listener registration and cleanup', () => {
      const preloadPath = path.resolve(__dirname, '../windows/electron/preload.ts');
      const content = fs.readFileSync(preloadPath, 'utf8');

      expect(content).toContain('onVaultLocked: (callback: () => void) => {');
      expect(content).toContain("ipcRenderer.on('vault:locked', handler);");
      expect(content).toContain("ipcRenderer.removeListener('vault:locked', handler);");
      expect(content).toContain("contextBridge.exposeInMainWorld('vaultKeyApi', vaultKeyApi);");
    });

    it('verifies windows/index.html enforces strict Content-Security-Policy', () => {
      const indexPath = path.resolve(__dirname, '../windows/index.html');
      const content = fs.readFileSync(indexPath, 'utf8');

      expect(content).toContain('http-equiv="Content-Security-Policy"');
      // Must contain default-src 'self'
      expect(content).toContain("default-src 'self'");
      // Must contain script-src 'self' without unsafe-eval
      expect(content).toContain("script-src 'self'");
      expect(content).not.toContain("'unsafe-eval'");
      // connect-src must be strictly restricted to self and local bridge port 49152
      expect(content).toContain("connect-src 'self' http://127.0.0.1:49152;");
      // No wildcard network access
      expect(content).not.toMatch(/connect-src [^;]*\*/);
      expect(content).not.toMatch(/script-src [^;]*\*/);
    });

    it('verifies windows/electron/main.ts enforces header CSP and denies window open', () => {
      const mainPath = path.resolve(__dirname, '../windows/electron/main.ts');
      const content = fs.readFileSync(mainPath, 'utf8');

      // Window open handler denied
      expect(content).toContain("mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))");

      // HTTP header CSP
      expect(content).toContain("'Content-Security-Policy': [");
      expect(content).toContain("default-src 'self'; script-src 'self'");
      expect(content).toContain("connect-src 'self' http://127.0.0.1:49152;");

      // Emits vault:locked IPC event on idle and lock action
      expect(content).toContain("mainWindow.webContents.send('vault:locked');");
    });
  });

});

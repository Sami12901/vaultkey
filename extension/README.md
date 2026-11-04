# VaultKey Chrome / Edge / Brave Extension

Official Browser Extension for the VaultKey Zero-Knowledge Password Manager.

## Features:
- ⚡ **Auto-Save Sign-Up Credentials**: Detects when you sign up or log in on websites, automatically asking to save your username/email, password, and website URL directly to your encrypted desktop vault.
- 🎯 **1-Click In-Field Autofill**: Discreet in-field emerald shield icon and dropdown to fill usernames and passwords instantly.
- 🎲 **In-Browser Password Generator**: Create ultra-strong passwords without leaving your webpage.
- 🔒 **Zero-Knowledge Security**: Connects directly with the local VaultKey desktop app via a secure local loopback bridge (`127.0.0.1:49152`). No plaintext credentials are ever sent to external cloud servers.

## How to Install in Google Chrome, Microsoft Edge, or Brave:
1. Open your browser and navigate to the Extensions page:
   - **Chrome**: `chrome://extensions`
   - **Edge**: `edge://extensions`
   - **Brave**: `brave://extensions`
2. Toggle on **Developer mode** (usually in the top right corner).
3. Click the **"Load unpacked"** button.
4. Select the `extension/` directory from this repository:
   ```bash
   path/to/vaultkey/extension
   ```
5. The VaultKey extension icon will now appear in your browser's toolbar! Pin it for quick access.

## How it works with the Desktop App:
- Keep the VaultKey Desktop App (`VaultKey.exe`) running and unlocked on your PC.
- When you visit any website, the extension will show the number of matching logins on its badge.
- When you register or sign up on a website, a floating prompt will appear at the top-right: **"Save password to VaultKey?"**
- Clicking **"Save to Vault"** instantly encrypts and stores the account in your desktop app!

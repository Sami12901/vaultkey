## VaultKey v1.1.0 - Enhanced Security & Bridge Hardening Release

VaultKey v1.1.0 delivers major enterprise-grade security features across Android, Windows Desktop, and the Chromium Browser Extension.

### 🛡️ What's New in v1.1.0

1. **In-App Auto-Update Cryptographic Verification (Android)**
   - **X.509 Package Signature Validation**: Before launching the package installer, the running app verifies the downloaded APK's signing certificate against its own certificate to block Man-in-the-Middle (MITM) attacks and malicious binaries.
   - **SHA-256 Digest Matching**: Verifies the exact SHA-256 checksum of the downloaded file. Tampered or invalid packages are immediately deleted.
   - **Clean In-App UI**: Shows real-time verification progress with green security shield indicators.

2. **Desktop & Browser Extension Bridge Mutual Authentication (Windows & Extension)**
   - **Shared Pairing Secret Token**: Windows Electron and Browser Extension now communicate using a persistent 256-bit pairing secret verified in constant time (`crypto.timingSafeEqual`).
   - **Strict Extension Origin Check**: Rejects any non-extension browser origin (`chrome-extension://`, `edge-extension://`, `moz-extension://` only).
   - **Pairing Management**: Easily view, copy, or regenerate pairing keys from Desktop Settings, and pair via the new Extension Pairing tab.

3. **Native Root, Frida & Debugger Defense (Android)**
   - Kotlin-level environment checks scanning for `su` binaries, test-keys ROMs, Busybox mounts, active Frida server instances, and open Frida ports (`27042`, `27043`).

4. **Mandatory Master Password Entropy Enforcement**
   - Real-time Shannon bit-entropy meter requiring $\ge 60$ bits and $\ge 12$ characters with character set diversity before setting or changing passwords.

5. **Brute-Force Lockout with Exponential Backoff**
   - Multi-tiered progressive lockout (5 failed attempts $\rightarrow$ 30s, 7 attempts $\rightarrow$ 2min, 10+ attempts $\rightarrow$ 15min) with persistent countdown timer.

---

### 📦 Checksums & Assets

| File | Platform | SHA-256 Checksum |
| :--- | :--- | :--- |
| **`VaultKey-v1.1.0-debug.apk`** | Android Mobile | `e0343abee1bcaa6c89b4fcbcca139f3e4a4a142ad74eda27921dfe0dd313bcd8` |
| **`VaultKey-v1.1.0-Portable.exe`** | Windows 64-bit | `7fc2e83f68c704ca367e6118acde47a080bbd299907498f86be5e781d13b7566` |
| **`VaultKey-v1.1.0-Setup.exe`** | Windows 64-bit | `28c0787ecb81f7917def4cd3253c29e27a40e9206e84b6825074018f815bebf0` |

SHA256: e0343abee1bcaa6c89b4fcbcca139f3e4a4a142ad74eda27921dfe0dd313bcd8


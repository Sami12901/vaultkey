# VaultKey v1.3.0 — UI Redesign, HIBP Breach Checker, Emergency Recovery Kit & Universal CSV Importer

We are proud to announce **VaultKey v1.3.0**, a major release bringing a comprehensive mobile UI/UX redesign, critical usability enhancements, industry-leading privacy protections, and seamless multi-platform migration tools across Android and Windows Desktop!

---

### 🎨 1. Mobile UI/UX Redesign & Organization
- **FAB Obstruction Resolved**: Extended list scroll clearance (`paddingBottom: 110`) and adjusted Floating Action Button (`+`) layout so bottom vault items, favorite star buttons, and navigation chevrons are completely accessible and unobstructed.
- **Decluttered Header**: Streamlined top navigation by removing redundant icons (Generator & Settings, permanently available in bottom tabs) and featuring a prominent, high-contrast Quick Lock button with live unlock status badge.
- **Glassmorphic Security Banner**: Re-engineered with dynamic color progress tracking (Strong / Moderate / At Risk), real-time threat breakdown chips (`⚠️ X weak`, `🔄 X reused`, `⏳ X old`, `🌐 X http`, `🛡️ X no 2fa`), and 1-tap quick audit shortcut.
- **Modern Pill Category Chips**: Integrated live item count badges into category chips (`All`, `Logins`, `Notes`, `Cards`, `Bank Accounts`, `2FA`, `Favorites`) for instant vault overview.
- **Android Gesture Bar Safe Area**: Full-bleed bottom tab bar extending to the screen edge with dynamic safe area insets to avoid button clipping on modern gesture navigation devices.
- **Truncation & Touch Targets**: Item title and username texts now feature robust single-line tail truncation and expanded `hitSlop` hit areas for the favorite star button.

---

### 🛡️ 2. Core Security & Usability Fixes
- **Universal In-Place Item Updates**: Resolved duplicate entry bug when saving edits to Secure Notes, Payment Cards, or Bank Accounts in SQLite/SQLCipher.
- **Lossless 2FA Secret Storage**: Base32 secrets are encrypted and decrypted directly without byte corruption across Android, Desktop, and backup/restore archives.
- **Strict eTLD+1 Domain Matching**: Hardened autofill service against subdomain spoofing and credential harvesting.
- **Windows Desktop TOTP Parity**: Full RFC 6238 TOTP authenticator engine in Electron with live SVG countdown progress circle and 1-click token copy.

---

### 🚀 3. New Flagship Features
1. **HaveIBeenPwned (HIBP) k-Anonymity Breach Checker**: Instant, zero-knowledge password breach lookup using 5-character SHA-1 prefix queries. Zero plain-text passwords or full hashes ever leave your device.
2. **Emergency Recovery Kit**: Cryptographically generated printable emergency recovery sheet with an unambiguous 32-character key and deterministic 4-character checksum for foolproof offline account recovery.
3. **Advanced Security Health Audit**: Automated vulnerability scans detecting insecure plain HTTP URLs and identifying accounts missing 2FA protection.
4. **Universal RFC 4180 CSV Importer**: Auto-detects and imports vaults seamlessly from **Bitwarden**, **Google Chrome**, **1Password**, and **LastPass** with resilient multiline and escaped-quote handling.

---

### 📦 Pre-Built Downloads & Cryptographic Checksums

| Platform | Binary Asset | SHA-256 Checksum |
| :--- | :--- | :--- |
| **Android** | `VaultKey-v1.3.0.apk` | `9DEE5FA647DD93445A9009A2F0074BE7C4F22B4642E091A2EB76E53272BE9BCA` |
| **Windows Portable** | `VaultKey-v1.3.0-Portable.exe` | `C8EA4A109709689F980377A6558ED19A56B0B2427D6DC65E057CEF1E250CBABB` |
| **Windows Setup** | `VaultKey-v1.3.0-Setup.exe` | `8CF4FDF2FAEB2143E977D55ADDDA767D9D5FE0DD512BB28DC9C887AC599D43E6` |

---

### ✅ Automated Verification Gate
- **Root Jest Suites**: 15 passed, 15 total (179 tests, 100% pass)
- **Android JVM Unit Tests**: 27 passed, 27 total (100% pass)
- **Windows Desktop Unit Tests**: 26 passed, 26 total (100% pass)
- **TypeScript**: 0 compiler or type diagnostics errors


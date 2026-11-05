# VaultKey v1.3.1 — Professional Vector Icons, Surfacing Local Backup & Restore, and Settings Parity

We are pleased to release **VaultKey v1.3.1**, addressing user feedback regarding visual polish, eliminating all raw emojis in favor of crisp SVG vector icons, and surfacing Local Backup & Restore directly across both the Home screen and Settings!

---

### 🎨 1. 100% Professional Vector SVG Icons
- **Security Score Banner**: Replaced all raw Unicode emojis in threat breakdown chips with crisp, responsive vector SVG icons:
  * `AlertTriangleIcon` for weak password alerts.
  * `RepeatIcon` for reused password warnings.
  * `ClockIcon` for aged/old passwords.
  * `GlobeIcon` for insecure plain HTTP websites.
  * `ShieldAlertIcon` for missing 2FA protection.
  * `CheckCircleIcon` for zero vulnerabilities verified.
- **Category Filter Chips**: Replaced text character `★` with a crisp `<StarIcon size={14} />` vector icon that dynamically fills and highlights when filtered.
- **Authenticator & Modals**: Replaced validation emoji badges and animated guide symbols in `AuthenticatorScreen` and `CloudSyncGuideModal` with `<SmartphoneIcon>`, `<LaptopIcon>`, `<CloudUploadIcon>`, and `<CheckCircleIcon>`.

---

### 🗄️ 2. Surfaced Local Backup, Restore & Migration in UI
- **Home Screen 1-Tap Header Button**: Added a dedicated `<BackupIcon>` button directly in the Home screen header beside the `<LockIcon>`, allowing users to immediately open the Backup & Restore screen with a single tap.
- **Dedicated Settings Section ("Data Management & Vault Backups")**:
  * **Local Encrypted Backup (.vaultkey)**: Full offline AES-256-GCM encrypted backup and restore.
  * **Universal CSV / JSON Importer**: Import credentials from **Bitwarden**, **Google Chrome**, **1Password**, and **LastPass**.
  * **Emergency Access & Recovery Kit**: Printable ASCII backup capsule with 4-character deterministic checksum.
  * **Zero-Knowledge Cloud Sync Guide**: Illustrated E2EE cloud and Wi-Fi LAN sync architectures.
- **Windows Desktop Parity**: Added an "Encrypted Backup & Migration" quick-launch card directly inside the Windows Desktop Settings modal.

---

### 📦 Pre-Built Downloads & Cryptographic Checksums

| Platform | Binary Asset | SHA-256 Checksum |
| :--- | :--- | :--- |
| **Android** | `VaultKey-v1.3.1.apk` | `3302E20B86D3FD3524945E44DCF8C0DB19ED8CFA55DBF456CCDC053F38164055` |
| **Windows Portable** | `VaultKey-v1.3.1-Portable.exe` | `B5E05205F8A1C3590A739FFC52DF7E1E420B5BF28C2B5771AF8208BF86A89A86` |
| **Windows Setup** | `VaultKey-v1.3.1-Setup.exe` | `803D6F0DE3AAB0FC82648D7FBFFB8F219E33AA2DADACA79A26EEF6DD212AAC0F` |

---

### ✅ Verification Gate
- **Root Jest Suites**: 15 passed, 15 total (179 tests, 100% pass)
- **Android JVM Unit Tests**: 27 passed, 27 total (100% pass)
- **Windows Desktop Tests**: 26 passed, 26 total (100% pass)
- **ESLint**: 0 errors
- **TypeScript**: 0 type errors

# VaultKey - Professional Zero-Knowledge Password & Security Manager

<p align="center">
  <img src="src/assets/vaultkey_brand_icon.jpg" width="140" height="140" alt="VaultKey Logo" style="border-radius: 28px;" />
</p>

<p align="center">
  <b>Local-First • Zero-Knowledge • Hardware-Backed Security • Multi-Platform</b>
</p>

<p align="center">
  <a href="https://github.com/Sami12901/vaultkey/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License: MIT" /></a>
  <a href="https://reactnative.dev"><img src="https://img.shields.io/badge/React%20Native-0.87-61DAFB.svg?logo=react" alt="React Native 0.87" /></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-Strict%205+-3178C6.svg?logo=typescript" alt="TypeScript Strict" /></a>
  <a href="https://www.android.com"><img src="https://img.shields.io/badge/Platform-Android-3DDC84.svg?logo=android" alt="Platform Android" /></a>
  <a href="https://www.microsoft.com/windows"><img src="https://img.shields.io/badge/Platform-Windows-0078D6.svg?logo=windows" alt="Platform Windows" /></a>
  <a href="https://developer.chrome.com/docs/extensions"><img src="https://img.shields.io/badge/Extension-Manifest%20V3-4285F4.svg?logo=googlechrome" alt="Browser Extension" /></a>
  <a href="SECURITY.md"><img src="https://img.shields.io/badge/Security-Argon2id%20%2B%20AES--256--GCM-emerald.svg" alt="Security Specs" /></a>
</p>

---

## Overview

**VaultKey** is an offline-first, zero-knowledge password and credentials management suite designed to protect your sensitive digital life without relying on third-party cloud servers.

Built with a unified cryptographic core, VaultKey provides seamless access across:
1. **Android Mobile App** (`android/` + `src/`): Native Kotlin security core, Android Keystore & StrongBox biometrics, SQLCipher database, and OS Autofill service.
2. **Windows Desktop App** (`windows/`): Electron + React + Vite application featuring local encrypted storage, master password setup, and browser bridge server.
3. **Chromium Browser Extension** (`extension/`): Manifest V3 extension for Google Chrome, Microsoft Edge, and Brave providing 1-click in-field autofill and auto-save.

---

## Security & Architecture Highlights

- **Zero-Knowledge Envelope Encryption**: Master Password derives a 256-bit Key Encryption Key (KEK) using **RFC 9106 Argon2id** (64MB memory, 3 iterations, 4 parallelism threads).
- **SQLCipher AES-256 Storage**: Complete database encryption at rest with per-page HMAC-SHA512 authentication.
- **Hardware-Backed Biometrics**: Android Keystore with StrongBox Keymaster / TEE hardware integration.
- **Zero Plaintext In-Memory**: Sensitive fields in Kotlin are strictly handled in character/byte arrays and zeroized immediately with `MemorySecurity.wipe()`. Plaintext secrets never touch persistent JavaScript memory.
- **Native Android Autofill Service**: 100% Kotlin `AutofillService` operating without booting JavaScript engines for sub-100ms response and anti-phishing eTLD+1 domain validation.
- **Screen & Clipboard Protection**: Active `FLAG_SECURE` blocks screenshots and task-switcher previews; automated 30-second clipboard clearing.
- **Authenticated Backup Container**: Standalone `.vaultkey` binary export format protected by PBKDF2/Argon2id + AES-256-GCM.
- **Bilingual Support**: Native English and Bengali (বাংলা) interface.
- **Design System**: Dark obsidian palette (`#0B0F17`) with emerald security accents (`#10B981`) and 100% vector SVG icons.

---

## Repository Structure

```
vaultkey/
├── android/                   # Android native app project (Gradle, Kotlin, C++)
│   └── app/src/main/java/com/vaultkey/
│       ├── autofill/          # Android AutofillService & anti-phishing matcher
│       ├── backup/            # EncryptedBackupManager (.vaultkey container)
│       ├── crypto/            # Argon2id, AES-256-GCM, Keystore, MemorySecurity
│       ├── database/          # SQLCipher helper, DAOs, and data models
│       ├── modules/           # React Native bridge native modules
│       └── session/           # Envelope encryption state machine
├── extension/                 # Chrome / Edge / Brave Manifest V3 browser extension
│   ├── background.js          # Service worker & desktop communication bridge
│   ├── content.js             # In-page autofill overlay & auto-save prompts
│   └── manifest.json          # Manifest V3 extension configuration
├── src/                       # React Native cross-platform application code
│   ├── assets/                # Logos and vector resources
│   ├── components/            # Reusable UI components & custom SVG icons
│   ├── i18n/                  # Bilingual localization (English & Bengali)
│   ├── screens/               # Vault, Auth, Generator, Security, Backup, Settings
│   ├── services/              # Strongly-typed native bridge bindings
│   ├── stores/                # Non-sensitive presentation state management
│   ├── theme/                 # Dark obsidian palette & theme engine
│   └── types/                 # Strict TypeScript definitions
├── windows/                   # Windows Desktop application (Electron + React + Vite)
│   ├── electron/              # Electron main process, crypto engine, and local bridge
│   └── src/                   # Desktop React renderer application
├── __tests__/                 # Jest unit and integration tests
├── .github/                   # GitHub Actions CI workflows & issue templates
├── ARCHITECTURE.md            # In-depth system architecture documentation
├── SECURITY.md                # Cryptographic specification & disclosure policy
├── THREAT_MODEL.md            # STRIDE threat model & risk analysis
├── PRIVACY.md                 # Zero-knowledge privacy declaration
├── CONTRIBUTING.md            # Contribution guidelines & code standards
└── LICENSE                    # MIT License
```

---

## Quick Start & Setup

### Prerequisites
- **Node.js**: `>= 22.11.0`
- **JDK**: Java 17+ (for Android builds)
- **Android SDK**: Build tools 35.0.0, NDK, Platform SDK 35

### 1. Root Application (React Native)

Clone the repository and install root dependencies:
```bash
git clone https://github.com/Sami12901/vaultkey.git
cd vaultkey
npm install
```

Verify tests, types, and code quality:
```bash
# Run unit tests
npm test

# Verify strict TypeScript types
npx tsc --noEmit

# Run linter
npm run lint
```

Run on an Android device or emulator:
```bash
# Start Metro bundler
npm start

# Run Android debug build
npm run android
```

### 2. Windows Desktop App (Electron)

Navigate to the `windows/` directory:
```bash
cd windows
npm install

# Start development mode
npm run dev

# Build production desktop bundle
npm run build

# Package portable & installer binaries (into windows/release/)
npm run package
```

### 3. Chromium Browser Extension

1. Open your Chromium browser (Google Chrome, Microsoft Edge, or Brave).
2. Go to extensions management:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Brave: `brave://extensions`
3. Turn on **Developer mode** (toggle in upper right).
4. Click **Load unpacked** and select the `extension/` folder in this repository.
5. With the VaultKey Desktop App running, the extension automatically connects to autofill and save credentials!

---

## Pre-Built Downloads (Releases)

Ready-to-use binaries are published under the [GitHub Releases](https://github.com/Sami12901/vaultkey/releases) tab:
- **Android APK**: `VaultKey-v1.0.0.apk`
- **Windows Portable**: `VaultKey-v1.0.0-Portable.exe`
- **Windows Installer**: `VaultKey-v1.0.0-Setup.exe`

---

## Security Documentation

- **[SECURITY.md](SECURITY.md)**: Cryptographic specification, Argon2id parameters, AES-256-GCM envelope encryption, SQLCipher internals, memory zeroization, and responsible vulnerability reporting.
- **[ARCHITECTURE.md](ARCHITECTURE.md)**: Presentation vs. native engine separation, state machines, and autofill architecture.
- **[THREAT_MODEL.md](THREAT_MODEL.md)**: STRIDE threat modeling, attack surface evaluation, and hardware tamper mitigations.
- **[PRIVACY.md](PRIVACY.md)**: Zero-telemetry, zero-cloud, and local-first data privacy guarantees.

---

## Contributing

Contributions from the community are welcome! Please check out [CONTRIBUTING.md](CONTRIBUTING.md) for code quality standards, branching workflows, and PR requirements.

---

## License

This project is licensed under the [MIT License](LICENSE) - see the [LICENSE](LICENSE) file for details.
